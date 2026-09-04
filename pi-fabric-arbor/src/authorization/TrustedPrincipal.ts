import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import type { AuthorizationPayloadV1, AuthorizationRecordV1, CanonicalTimestamp, TrustedPrincipalV1 } from "../domain/types.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import type { Clock } from "../util/clock.js";

export interface TrustedPrincipalConfigurationV1 {
  version: 1;
  principals: TrustedPrincipalV1[];
  revokedAuthorizationIds: string[];
  revokedNonceDigests: string[];
}

export interface AuthorizationApplicationPortV1 {
  readAuthorizationChallenge(challengeId: string): Promise<AuthorizationRecordV1>;
  commitSignedAuthorization(challengeId: string, authorization: AuthorizationRecordV1, now: CanonicalTimestamp): Promise<void>;
}

export interface LocalTerminalV1 {
  readonly interactive: boolean;
  write(text: string): void;
  confirm(prompt: string): Promise<boolean>;
}

export interface OsIdentityV1 { uid(): number }

function assertOwnerOnly(path: string, expectedUid: number, kind: "file" | "directory"): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || (kind === "file" ? !stat.isFile() : !stat.isDirectory())) throw new ArborError("EVIDENCE_INVALID", `Trusted-principal ${kind} has the wrong type`);
  if (stat.uid !== expectedUid) throw new ArborError("EVIDENCE_INVALID", `Trusted-principal ${kind} owner does not match the operator UID`);
  if ((stat.mode & 0o077) !== 0) throw new ArborError("EVIDENCE_INVALID", `Trusted-principal ${kind} is accessible by group or other users`);
}

function pathsOverlap(left: string, right: string): boolean {
  const a = resolve(left); const b = resolve(right);
  const ab = relative(a, b); const ba = relative(b, a);
  return ab === "" || (!ab.startsWith("..") && !isAbsolute(ab)) || (!ba.startsWith("..") && !isAbsolute(ba));
}

function keyId(publicKey: string): string { return `key_${sha256(publicKey).slice(0, 32)}`; }

function hasExactKeys(value: object, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value).sort(); const admitted = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => admitted.has(key));
}

function canonicalTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;
}

export class TrustedPrincipalRegistry {
  readonly configuration: TrustedPrincipalConfigurationV1;
  readonly configurationDigest: string;
  readonly #byId: Map<string, TrustedPrincipalV1>;

  constructor(configuration: TrustedPrincipalConfigurationV1) {
    if (!configuration || typeof configuration !== "object" || !hasExactKeys(configuration, ["version", "principals", "revokedAuthorizationIds", "revokedNonceDigests"]) || configuration.version !== 1 || !Array.isArray(configuration.principals) || configuration.principals.length < 1 || configuration.principals.length > 64 || !Array.isArray(configuration.revokedAuthorizationIds) || configuration.revokedAuthorizationIds.length > 10_000 || !Array.isArray(configuration.revokedNonceDigests) || configuration.revokedNonceDigests.length > 10_000) throw new ArborError("VALIDATION_FAILED", "Trusted-principal configuration is malformed, empty, or oversized");
    if (new Set(configuration.revokedAuthorizationIds).size !== configuration.revokedAuthorizationIds.length || configuration.revokedAuthorizationIds.some((id) => !/^[a-z][a-z0-9_]{2,63}$/u.test(id)) || new Set(configuration.revokedNonceDigests).size !== configuration.revokedNonceDigests.length || configuration.revokedNonceDigests.some((digest) => !/^[0-9a-f]{64}$/u.test(digest))) throw new ArborError("VALIDATION_FAILED", "Trusted-principal revocation lists are malformed or duplicated");
    const byId = new Map<string, TrustedPrincipalV1>();
    for (const principal of configuration.principals) {
      if (!principal || typeof principal !== "object" || !hasExactKeys(principal, ["principalId", "osUid", "publicKey", "allowedActions", "repositoryIds"], ["expiresAt"]) || !/^[a-z][a-z0-9_]{2,63}$/u.test(principal.principalId) || !Number.isSafeInteger(principal.osUid) || principal.osUid < 0 || typeof principal.publicKey !== "string" || principal.publicKey.length > 1024 || !Array.isArray(principal.allowedActions) || principal.allowedActions.length < 1 || principal.allowedActions.length > 2 || principal.allowedActions.some((action) => action !== "promote" && action !== "rollback") || !Array.isArray(principal.repositoryIds) || principal.repositoryIds.length < 1 || principal.repositoryIds.length > 1024 || principal.repositoryIds.some((id) => !/^[a-z][a-z0-9_]{2,63}$/u.test(id)) || (principal.expiresAt !== undefined && !canonicalTimestamp(principal.expiresAt))) throw new ArborError("VALIDATION_FAILED", "Trusted principal identity or scope is malformed");
      if (byId.has(principal.principalId) || new Set(principal.allowedActions).size !== principal.allowedActions.length || new Set(principal.repositoryIds).size !== principal.repositoryIds.length) throw new ArborError("VALIDATION_FAILED", "Trusted principal has duplicate identity or scope");
      try { const publicKey = createPublicKey({ key: Buffer.from(principal.publicKey, "base64"), format: "der", type: "spki" }); if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("not Ed25519"); } catch { throw new ArborError("VALIDATION_FAILED", "Trusted principal public key is not Ed25519 SPKI"); }
      byId.set(principal.principalId, Object.freeze(structuredClone(principal)));
    }
    this.configuration = Object.freeze(structuredClone(configuration));
    this.configurationDigest = digestCanonical(configuration);
    this.#byId = byId;
  }

  principal(principalId: string): TrustedPrincipalV1 {
    const principal = this.#byId.get(principalId);
    if (!principal) throw new ArborError("EVIDENCE_INVALID", "Authorization principal is not configured");
    return principal;
  }

  select(action: "promote" | "rollback", repositoryId: string, now: string): TrustedPrincipalV1 {
    const matches = [...this.#byId.values()].filter((principal) => principal.allowedActions.includes(action) && principal.repositoryIds.includes(repositoryId) && (!principal.expiresAt || Date.parse(principal.expiresAt) > Date.parse(now)));
    if (matches.length !== 1) throw new ArborError("EVIDENCE_INVALID", "Authorization scope must resolve to exactly one current trusted principal");
    return matches[0]!;
  }

  verifyAuthorization(record: AuthorizationRecordV1, action: "promote" | "rollback", repositoryId: string, now: string, acceptedStates: readonly AuthorizationRecordV1["state"][] = ["STORED"]): void {
    if (!acceptedStates.includes(record.state) || !record.signature || !record.issuedAt) throw new ArborError("EVIDENCE_INVALID", "Authorization is not in an accepted signed state");
    if (record.payload.kind !== action || record.payload.repositoryId !== repositoryId || record.payload.principalId !== record.principalId) throw new ArborError("EVIDENCE_INVALID", "Authorization action, repository, or principal binding mismatches");
    if (record.challengeDigest !== digestCanonical(record.payload) || record.nonceDigest !== sha256(record.payload.nonce)) throw new ArborError("EVIDENCE_INVALID", "Authorization challenge or nonce digest mismatches");
    if (Date.parse(record.payload.expiresAt) <= Date.parse(now)) throw new ArborError("EVIDENCE_INVALID", "Authorization has expired");
    if (this.configuration.revokedAuthorizationIds.includes(record.authorizationId) || this.configuration.revokedNonceDigests.includes(record.nonceDigest)) throw new ArborError("EVIDENCE_INVALID", "Authorization has been revoked");
    const principal = this.principal(record.principalId);
    if (principal.expiresAt && Date.parse(principal.expiresAt) <= Date.parse(now)) throw new ArborError("EVIDENCE_INVALID", "Trusted principal has expired");
    if (!principal.allowedActions.includes(action) || !principal.repositoryIds.includes(repositoryId)) throw new ArborError("EVIDENCE_INVALID", "Trusted principal scope denies this authorization");
    if (record.keyId !== keyId(principal.publicKey)) throw new ArborError("EVIDENCE_INVALID", "Authorization key identity mismatches the trusted principal");
    const publicKey = createPublicKey({ key: Buffer.from(principal.publicKey, "base64"), format: "der", type: "spki" });
    if (!verify(null, Buffer.from(canonicalJson(record.payload)), publicKey, Buffer.from(record.signature, "base64url"))) throw new ArborError("EVIDENCE_INVALID", "Authorization signature is invalid");
  }
}

export class OwnerOnlyEd25519KeyStore {
  readonly root: string;
  readonly ownerUid: number;

  constructor(input: { root: string; ownerUid: number; browserReachableRoots?: readonly string[] }) {
    this.root = realpathSync(input.root);
    this.ownerUid = input.ownerUid;
    assertOwnerOnly(this.root, input.ownerUid, "directory");
    for (const browserRoot of input.browserReachableRoots ?? []) if (pathsOverlap(this.root, realpathSync(browserRoot))) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Signing-key storage overlaps browser-reachable storage");
  }

  keyPath(principalId: string): string {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(principalId)) throw new ArborError("VALIDATION_FAILED", "Invalid key principal ID");
    const path = join(this.root, `${principalId}.ed25519.pk8`);
    const rel = relative(this.root, path);
    if (rel.startsWith(`..${sep}`) || rel === "..") throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Signing-key path escaped its owner-only root");
    return path;
  }

  load(principal: TrustedPrincipalV1): KeyObject {
    const path = this.keyPath(principal.principalId);
    assertOwnerOnly(path, this.ownerUid, "file");
    const bytes = readFileSync(path);
    const privateKey = createPrivateKey({ key: bytes, format: "der", type: "pkcs8" });
    const actual = privateKey.export({ format: "jwk" });
    const expected = createPublicKey({ key: Buffer.from(principal.publicKey, "base64"), format: "der", type: "spki" }).export({ format: "jwk" });
    if (actual.kty !== expected.kty || actual.crv !== expected.crv || actual.x !== expected.x) throw new ArborError("EVIDENCE_INVALID", "Owner-only signing key does not match trusted-principal configuration");
    return privateKey;
  }
}

export function createOwnerOnlyPrincipalFiles(input: { configurationPath: string; keyRoot: string; principalId: string; osUid: number; repositoryIds: string[]; allowedActions?: ("promote" | "rollback")[] }): TrustedPrincipalConfigurationV1 {
  mkdirSync(dirname(input.configurationPath), { recursive: true, mode: 0o700 });
  mkdirSync(input.keyRoot, { recursive: true, mode: 0o700 });
  chmodSync(dirname(input.configurationPath), 0o700); chmodSync(input.keyRoot, 0o700);
  const pair = generateKeyPairSync("ed25519");
  const publicKey = pair.publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const configuration: TrustedPrincipalConfigurationV1 = { version: 1, principals: [{ principalId: input.principalId, osUid: input.osUid, publicKey, allowedActions: input.allowedActions ?? ["promote", "rollback"], repositoryIds: input.repositoryIds }], revokedAuthorizationIds: [], revokedNonceDigests: [] };
  writeFileSync(input.configurationPath, `${canonicalJson(configuration)}\n`, { mode: 0o600 });
  writeFileSync(join(input.keyRoot, `${input.principalId}.ed25519.pk8`), pair.privateKey.export({ format: "der", type: "pkcs8" }), { mode: 0o600 });
  return configuration;
}

export function loadOwnerOnlyPrincipalConfiguration(path: string, uid: number): TrustedPrincipalConfigurationV1 {
  assertOwnerOnly(path, uid, "file");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as TrustedPrincipalConfigurationV1;
  return new TrustedPrincipalRegistry(parsed).configuration;
}

function boundedDisplay(payload: AuthorizationPayloadV1): string {
  const fields: Array<[string, string]> = [
    ["Action", payload.kind], ["Run", payload.runId], ["Repository", payload.repositoryId], ["Principal", payload.principalId], ["Candidate", payload.candidateId], ["Candidate OID", payload.candidateOid],
    ["Merge OID", payload.mergeCandidateOid], ["Held-out certificate", payload.heldOutCertificateDigest], ["Contract", payload.contractDigest], ["Winner ref", payload.winnerRef],
    ["Expected current OID", payload.expectedCurrentOid], ["Predecessor OID", payload.predecessorOid], ["Expiry", payload.expiresAt],
  ];
  const output = fields.map(([name, value]) => `${name}: ${value.slice(0, 512)}`).join("\n");
  if (Buffer.byteLength(output, "utf8") > 8192) throw new ArborError("VALIDATION_FAILED", "Authorization display exceeds its bound");
  return `${output}\n`;
}

export class LocalTtyAuthorizationCoordinator {
  constructor(readonly dependencies: {
    application: AuthorizationApplicationPortV1;
    registry: TrustedPrincipalRegistry;
    keyStore: OwnerOnlyEd25519KeyStore;
    terminal: LocalTerminalV1;
    osIdentity: OsIdentityV1;
    clock: Clock;
  }) {}

  async authorize(kind: "promote" | "rollback", challengeId: string): Promise<AuthorizationRecordV1> {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(challengeId)) throw new ArborError("VALIDATION_FAILED", "Challenge ID is not a bounded opaque ID");
    if (!this.dependencies.terminal.interactive) throw new ArborError("EVIDENCE_INVALID", "Authorization requires an interactive local TTY");
    const challenge = await this.dependencies.application.readAuthorizationChallenge(challengeId);
    if (challenge.state !== "CHALLENGE_ISSUED" || challenge.payload.kind !== kind) throw new ArborError("EVIDENCE_INVALID", "Challenge kind or state is not authorizable");
    const now = this.dependencies.clock.now();
    if (Date.parse(challenge.payload.expiresAt) <= Date.parse(now)) throw new ArborError("EVIDENCE_INVALID", "Authorization challenge has expired");
    const principal = this.dependencies.registry.principal(challenge.principalId);
    if (this.dependencies.osIdentity.uid() !== principal.osUid || this.dependencies.keyStore.ownerUid !== principal.osUid) throw new ArborError("EVIDENCE_INVALID", "Local OS UID does not match the trusted principal");
    this.dependencies.registry.select(kind, challenge.payload.repositoryId, now);
    this.dependencies.terminal.write(boundedDisplay(challenge.payload));
    if (!await this.dependencies.terminal.confirm(`Authorize ${kind}? Type yes to confirm: `)) throw new ArborError("EVIDENCE_INVALID", "Operator denied authorization");
    const issuedAt = this.dependencies.clock.now();
    if (Date.parse(challenge.payload.expiresAt) <= Date.parse(issuedAt)) throw new ArborError("EVIDENCE_INVALID", "Authorization challenge expired before confirmation completed");
    this.dependencies.registry.select(kind, challenge.payload.repositoryId, issuedAt);
    const privateKey = this.dependencies.keyStore.load(principal);
    const authorization: AuthorizationRecordV1 = {
      ...structuredClone(challenge),
      state: "STORED",
      signature: sign(null, Buffer.from(canonicalJson(challenge.payload)), privateKey).toString("base64url"),
      issuedAt,
      keyId: keyId(principal.publicKey),
    };
    this.dependencies.registry.verifyAuthorization(authorization, kind, challenge.payload.repositoryId, issuedAt);
    await this.dependencies.application.commitSignedAuthorization(challengeId, authorization, issuedAt);
    return Object.freeze(authorization);
  }
}

export class NodeLocalTerminal implements LocalTerminalV1 {
  readonly interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  write(text: string): void { process.stdout.write(text); }
  async confirm(prompt: string): Promise<boolean> {
    if (!this.interactive) return false;
    process.stdout.write(prompt);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    const answer = await new Promise<string>((resolveAnswer) => process.stdin.once("data", (value) => resolveAnswer(String(value))));
    process.stdin.pause();
    return /^(?:y|yes)$/iu.test(answer.trim());
  }
}

export const CURRENT_OS_IDENTITY_V1: OsIdentityV1 = Object.freeze({ uid: () => process.getuid?.() ?? -1 });
export const trustedPrincipalKeyId = keyId;
