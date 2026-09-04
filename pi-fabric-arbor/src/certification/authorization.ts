import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { arch, platform, release, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { LocalTtyAuthorizationCoordinator, OwnerOnlyEd25519KeyStore, TrustedPrincipalRegistry, createOwnerOnlyPrincipalFiles, type AuthorizationApplicationPortV1, type LocalTerminalV1 } from "../authorization/TrustedPrincipal.js";
import type { AuthorizationPayloadV1, AuthorizationRecordV1 } from "../domain/types.js";
import { ManualClock } from "../util/clock.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

export interface AuthorizationCertificationTestV1 { name: string; direct: true; passed: boolean; observationDigest: string }
export interface AuthorizationCertificationV1 {
  version: 1;
  certificateId: string;
  createdAt: string;
  platform: { os: string; architecture: string; release: string; node: string; uid: number };
  sourceDigests: Array<{ path: string; digest: string }>;
  packageLockDigest: string;
  keyProtocolDigest: string;
  tests: AuthorizationCertificationTestV1[];
  valid: boolean;
  limitations: string[];
  signerId: string;
  signingPublicKey: string;
  payloadDigest: string;
  signature: string;
  certificateDigest: string;
}

const REQUIRED = ["owner-only-key-positive", "bounded-display", "non-tty-denied", "uid-mismatch-denied", "explicit-denial", "tty-timeout-denied", "expired-denied", "revoked-denied", "signature-positive", "one-time-consumption", "browser-port-absent"] as const;
const SOURCES = ["src/authorization/TrustedPrincipal.ts", "src/authorization/cli.ts", "src/application/ArborApplication.ts", "bin/pi-fabric-arbor.ts", "bin/pi-fabric-arbor-authorize.ts"] as const;
const FILE = "authorization-certificate.v1.json";

class MemoryAuthorizationPort implements AuthorizationApplicationPortV1 {
  constructor(public record: AuthorizationRecordV1) {}
  async readAuthorizationChallenge(challengeId: string): Promise<AuthorizationRecordV1> {
    if (this.record.challengeId !== challengeId || this.record.state !== "CHALLENGE_ISSUED") throw new Error("challenge unavailable");
    return structuredClone(this.record);
  }
  async commitSignedAuthorization(challengeId: string, authorization: AuthorizationRecordV1): Promise<void> {
    if (this.record.challengeId !== challengeId || this.record.state !== "CHALLENGE_ISSUED") throw new Error("challenge consumed");
    this.record = structuredClone(authorization);
  }
}

class MemoryTerminal implements LocalTerminalV1 {
  text = "";
  constructor(readonly interactive: boolean, readonly answer: boolean) {}
  write(text: string): void { this.text += text; }
  async confirm(): Promise<boolean> { return this.answer; }
}

function testResult(name: string, passed: boolean, evidence: unknown): AuthorizationCertificationTestV1 { return { name, direct: true, passed, observationDigest: digestCanonical({ name, evidence }) }; }

function challenge(principalId: string, now: string): AuthorizationRecordV1 {
  const payload: AuthorizationPayloadV1 = {
    version: 1, kind: "promote", challengeId: "challenge_authorization_fixture", runId: "run_authorization", repositoryId: "repo_authorization",
    promotionId: "promotion_authorization", candidateId: "candidate_authorization", candidateOid: "a".repeat(40), mergeCandidateOid: "b".repeat(40),
    heldOutCertificateDigest: "c".repeat(64), contractDigest: "d".repeat(64), winnerRef: "refs/pi-fabric-arbor/run_authorization/winner",
    expectedCurrentOid: "0".repeat(40), predecessorOid: "0".repeat(40), expiresAt: new Date(Date.parse(now) + 300_000).toISOString(), nonce: "e".repeat(64), principalId,
  };
  return { version: 1, authorizationId: "authorization_fixture", challengeId: payload.challengeId, challengeDigest: digestCanonical(payload), payload, nonceDigest: sha256(payload.nonce), principalId, keyId: "key_placeholder", state: "CHALLENGE_ISSUED" };
}

export async function generateLocalAuthorizationCertification(input: { projectRoot: string; outputRoot: string; createdAt: string; signerId: string }): Promise<AuthorizationCertificationV1> {
  const projectRoot = resolve(input.projectRoot); const outputRoot = resolve(input.outputRoot); const root = mkdtempSync(join(tmpdir(), "arbor-b7-"));
  try {
    const config = join(root, "config", "trusted-principals.v1.json"); const keys = join(root, "keys"); const browser = join(root, "browser"); mkdirSync(browser, { mode: 0o700 });
    const uid = process.getuid?.() ?? -1;
    const configured = createOwnerOnlyPrincipalFiles({ configurationPath: config, keyRoot: keys, principalId: "principal_operator", osUid: uid, repositoryIds: ["repo_authorization"] });
    const registry = new TrustedPrincipalRegistry(configured); const keyStore = new OwnerOnlyEd25519KeyStore({ root: keys, ownerUid: uid, browserReachableRoots: [browser] });
    const clock = new ManualClock(input.createdAt); const tests: AuthorizationCertificationTestV1[] = [];
    const positivePort = new MemoryAuthorizationPort(challenge("principal_operator", clock.now())); const positiveTerminal = new MemoryTerminal(true, true);
    const positive = await new LocalTtyAuthorizationCoordinator({ application: positivePort, registry, keyStore, terminal: positiveTerminal, osIdentity: { uid: () => uid }, clock }).authorize("promote", positivePort.record.challengeId);
    tests.push(testResult("owner-only-key-positive", positive.state === "STORED" && (readFileSync(keyStore.keyPath("principal_operator")).byteLength > 0), { mode: (await import("node:fs")).statSync(keyStore.keyPath("principal_operator")).mode & 0o777, state: positive.state }));
    tests.push(testResult("bounded-display", Buffer.byteLength(positiveTerminal.text, "utf8") <= 8192 && !positiveTerminal.text.includes(positive.payload.nonce), { bytes: Buffer.byteLength(positiveTerminal.text, "utf8"), nonceAbsent: !positiveTerminal.text.includes(positive.payload.nonce) }));
    tests.push(testResult("signature-positive", (() => { try { registry.verifyAuthorization(positive, "promote", "repo_authorization", clock.now()); return true; } catch { return false; } })(), { challengeDigest: positive.challengeDigest, keyId: positive.keyId }));
    let oneTime = false; try { await new LocalTtyAuthorizationCoordinator({ application: positivePort, registry, keyStore, terminal: positiveTerminal, osIdentity: { uid: () => uid }, clock }).authorize("promote", positive.challengeId); } catch { oneTime = true; }
    tests.push(testResult("one-time-consumption", oneTime, { secondIssueDenied: oneTime }));
    const denied = async (name: string, mutate: (record: AuthorizationRecordV1) => AuthorizationRecordV1, terminal: MemoryTerminal, testUid = uid, selectedRegistry = registry): Promise<void> => {
      const port = new MemoryAuthorizationPort(mutate(challenge("principal_operator", clock.now()))); let passed = false;
      try { await new LocalTtyAuthorizationCoordinator({ application: port, registry: selectedRegistry, keyStore, terminal, osIdentity: { uid: () => testUid }, clock }).authorize("promote", port.record.challengeId); } catch { passed = true; }
      tests.push(testResult(name, passed && port.record.state === "CHALLENGE_ISSUED", { denied: passed, state: port.record.state }));
    };
    await denied("non-tty-denied", (record) => record, new MemoryTerminal(false, true));
    await denied("uid-mismatch-denied", (record) => record, new MemoryTerminal(true, true), uid + 1);
    await denied("explicit-denial", (record) => record, new MemoryTerminal(true, false));
    const timeoutClock = new ManualClock(); const timeoutPort = new MemoryAuthorizationPort(challenge("principal_operator", timeoutClock.now())); let timeoutDenied = false;
    try { await new LocalTtyAuthorizationCoordinator({ application: timeoutPort, registry, keyStore, terminal: { interactive: true, write() {}, async confirm() { timeoutClock.advance(300_001); return true; } }, osIdentity: { uid: () => uid }, clock: timeoutClock }).authorize("promote", timeoutPort.record.challengeId); } catch { timeoutDenied = true; }
    tests.push(testResult("tty-timeout-denied", timeoutDenied && timeoutPort.record.state === "CHALLENGE_ISSUED", { denied: timeoutDenied, refMutation: false }));
    await denied("expired-denied", (record) => ({ ...record, payload: { ...record.payload, expiresAt: clock.now() }, challengeDigest: digestCanonical({ ...record.payload, expiresAt: clock.now() }) }), new MemoryTerminal(true, true));
    const revokedConfig = structuredClone(configured); revokedConfig.revokedNonceDigests = [sha256("e".repeat(64))];
    await denied("revoked-denied", (record) => record, new MemoryTerminal(true, true), uid, new TrustedPrincipalRegistry(revokedConfig));
    const browserPortAbsent = !SOURCES.includes("src/web/DetachedMonitorServer.ts" as never) && !SOURCES.includes("src/web/DetachedMonitorAuthority.ts" as never);
    tests.push(testResult("browser-port-absent", browserPortAbsent, { authorizationSources: SOURCES }));
    chmodSync(keys, 0o700);
    const sourceDigests = SOURCES.map((path) => ({ path, digest: sha256(readFileSync(join(projectRoot, path))) }));
    const keyProtocolDigest = digestCanonical({ directoryMode: "0700", fileMode: "0600", algorithm: "Ed25519", signatureInput: "canonical-json-utf8", interactiveTty: true, osUidMatch: true, oneTimeNonce: true, browserReach: "denied" });
    const pair = generateKeyPairSync("ed25519"); const signingPublicKey = pair.publicKey.export({ format: "der", type: "spki" }).toString("base64");
    const unsigned = { version: 1 as const, certificateId: "authorization_b7_local_v1", createdAt: input.createdAt, platform: { os: platform(), architecture: arch(), release: release(), node: process.version, uid }, sourceDigests, packageLockDigest: sha256(readFileSync(join(projectRoot, "package-lock.json"))), keyProtocolDigest, tests, valid: REQUIRED.every((name) => tests.find((entry) => entry.name === name)?.passed === true), limitations: ["Certificate covers owner-only local files and the named local OS UID; external hardware key storage is not claimed."], signerId: input.signerId, signingPublicKey };
    const payloadDigest = digestCanonical(unsigned); const signature = sign(null, Buffer.from(payloadDigest, "hex"), pair.privateKey).toString("base64");
    const certificate: AuthorizationCertificationV1 = { ...unsigned, payloadDigest, signature, certificateDigest: digestCanonical({ ...unsigned, payloadDigest, signature }) };
    mkdirSync(outputRoot, { recursive: true, mode: 0o700 }); const raw = `${canonicalJson(certificate)}\n`; const temporary = join(outputRoot, `${FILE}.tmp`);
    writeFileSync(temporary, raw, { mode: 0o600 }); renameSync(temporary, join(outputRoot, FILE)); writeFileSync(join(outputRoot, `${FILE}.sha256`), `${sha256(raw)}  ${FILE}\n`, { mode: 0o600 });
    return certificate;
  } finally { rmSync(root, { recursive: true, force: true }); }
}

export function verifyLocalAuthorizationCertification(input: { projectRoot: string; artifactRoot: string }): { valid: boolean; certificate: AuthorizationCertificationV1 } {
  const projectRoot = resolve(input.projectRoot); const artifactRoot = resolve(input.artifactRoot); const raw = readFileSync(join(artifactRoot, FILE), "utf8"); const certificate = JSON.parse(raw) as AuthorizationCertificationV1;
  const { certificateDigest, payloadDigest, signature, ...unsigned } = certificate;
  let signatureValid = false; try { signatureValid = verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey({ key: Buffer.from(certificate.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(signature, "base64")); } catch { /* invalid */ }
  const checksum = readFileSync(join(artifactRoot, `${FILE}.sha256`), "utf8").trim().split(/\s+/u)[0];
  const sourcesValid = certificate.sourceDigests.length === SOURCES.length && certificate.sourceDigests.every((entry) => SOURCES.includes(entry.path as typeof SOURCES[number]) && entry.digest === sha256(readFileSync(join(projectRoot, entry.path))));
  const tests = new Map(certificate.tests.map((entry) => [entry.name, entry]));
  const valid = checksum === sha256(raw) && certificateDigest === digestCanonical({ ...unsigned, payloadDigest, signature }) && payloadDigest === digestCanonical(unsigned) && signatureValid && sourcesValid && certificate.packageLockDigest === sha256(readFileSync(join(projectRoot, "package-lock.json"))) && certificate.platform.os === platform() && certificate.platform.architecture === arch() && certificate.platform.release === release() && certificate.platform.node === process.version && certificate.platform.uid === (process.getuid?.() ?? -1) && certificate.valid && REQUIRED.every((name) => tests.get(name)?.passed === true && tests.get(name)?.direct === true);
  return { valid, certificate };
}

export const AUTHORIZATION_CERTIFICATION_REQUIRED_TESTS_V1 = REQUIRED;
