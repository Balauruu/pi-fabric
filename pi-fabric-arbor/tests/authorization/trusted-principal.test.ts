import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LocalTtyAuthorizationCoordinator, OwnerOnlyEd25519KeyStore, TrustedPrincipalRegistry, createOwnerOnlyPrincipalFiles } from "../../src/authorization/TrustedPrincipal.js";
import type { AuthorizationRecordV1 } from "../../src/domain/types.js";
import { ManualClock } from "../../src/util/clock.js";
import { digestCanonical, sha256 } from "../../src/util/canonical.js";
import { errorCode } from "../helpers.js";

function record(now: string): AuthorizationRecordV1 {
  const payload = { version: 1 as const, kind: "promote" as const, challengeId: "challenge_unit_authorization", runId: "run_authorization", repositoryId: "repo_authorization", promotionId: "promotion_authorization", candidateId: "candidate_authorization", candidateOid: "a".repeat(40), mergeCandidateOid: "b".repeat(40), heldOutCertificateDigest: "c".repeat(64), contractDigest: "d".repeat(64), winnerRef: "refs/pi-fabric-arbor/run_authorization/winner", expectedCurrentOid: "0".repeat(40), predecessorOid: "0".repeat(40), expiresAt: new Date(Date.parse(now) + 60_000).toISOString(), nonce: "e".repeat(64), principalId: "principal_operator" };
  return { version: 1, authorizationId: "authorization_unit", challengeId: payload.challengeId, challengeDigest: digestCanonical(payload), payload, nonceDigest: sha256(payload.nonce), principalId: payload.principalId, keyId: "key_placeholder", state: "CHALLENGE_ISSUED" };
}

test("local TTY authorization verifies UID, explicit confirmation, canonical signature, and one-time storage", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-auth-test-")); const uid = process.getuid!(); const clock = new ManualClock();
  try {
    const configurationPath = join(root, "config", "principals.json"); const keyRoot = join(root, "keys"); const browser = join(root, "browser"); mkdirSync(browser, { mode: 0o700 });
    const configuration = createOwnerOnlyPrincipalFiles({ configurationPath, keyRoot, principalId: "principal_operator", osUid: uid, repositoryIds: ["repo_authorization"] });
    const registry = new TrustedPrincipalRegistry(configuration); const keyStore = new OwnerOnlyEd25519KeyStore({ root: keyRoot, ownerUid: uid, browserReachableRoots: [browser] });
    let stored = record(clock.now()); const port = { async readAuthorizationChallenge() { if (stored.state !== "CHALLENGE_ISSUED") throw new Error("consumed"); return structuredClone(stored); }, async commitSignedAuthorization(_id: string, value: AuthorizationRecordV1) { stored = structuredClone(value); } };
    const terminal = { interactive: true, text: "", write(value: string) { this.text += value; }, async confirm() { return true; } };
    const signed = await new LocalTtyAuthorizationCoordinator({ application: port, registry, keyStore, terminal, osIdentity: { uid: () => uid }, clock }).authorize("promote", stored.challengeId);
    assert.equal(signed.state, "STORED"); assert.match(terminal.text, /Merge OID:/u); assert.doesNotMatch(terminal.text, /eeeeeeee/u);
    assert.doesNotThrow(() => registry.verifyAuthorization(signed, "promote", "repo_authorization", clock.now()));
    await assert.rejects(new LocalTtyAuthorizationCoordinator({ application: port, registry, keyStore, terminal, osIdentity: { uid: () => uid }, clock }).authorize("promote", signed.challengeId));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("non-TTY, denied confirmation, wrong UID, expiry, revocation, loose modes, and browser-overlap fail closed", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-auth-negative-")); const uid = process.getuid!(); const clock = new ManualClock();
  try {
    const configuration = createOwnerOnlyPrincipalFiles({ configurationPath: join(root, "config", "principals.json"), keyRoot: join(root, "keys"), principalId: "principal_operator", osUid: uid, repositoryIds: ["repo_authorization"] });
    assert.throws(() => new TrustedPrincipalRegistry({ ...configuration, unexpected: true } as never), errorCode("VALIDATION_FAILED"));
    assert.throws(() => new TrustedPrincipalRegistry({ ...configuration, revokedNonceDigests: ["bad"] }), errorCode("VALIDATION_FAILED"));
    const registry = new TrustedPrincipalRegistry(configuration); const keyStore = new OwnerOnlyEd25519KeyStore({ root: join(root, "keys"), ownerUid: uid });
    const make = (interactive: boolean, answer: boolean, osUid = uid, value = record(clock.now()), selected = registry) => new LocalTtyAuthorizationCoordinator({ application: { async readAuthorizationChallenge() { return value; }, async commitSignedAuthorization() { throw new Error("must not commit"); } }, registry: selected, keyStore, terminal: { interactive, write() {}, async confirm() { return answer; } }, osIdentity: { uid: () => osUid }, clock });
    await assert.rejects(make(false, true).authorize("promote", "challenge_unit_authorization"), errorCode("EVIDENCE_INVALID"));
    await assert.rejects(make(true, false).authorize("promote", "challenge_unit_authorization"), errorCode("EVIDENCE_INVALID"));
    const timeout = new LocalTtyAuthorizationCoordinator({ application: { async readAuthorizationChallenge() { return record(clock.now()); }, async commitSignedAuthorization() { throw new Error("must not commit"); } }, registry, keyStore, terminal: { interactive: true, write() {}, async confirm() { clock.advance(60_001); return true; } }, osIdentity: { uid: () => uid }, clock });
    await assert.rejects(timeout.authorize("promote", "challenge_unit_authorization"), errorCode("EVIDENCE_INVALID"));
    await assert.rejects(make(true, true, uid + 1).authorize("promote", "challenge_unit_authorization"), errorCode("EVIDENCE_INVALID"));
    const expired = record(clock.now()); expired.payload.expiresAt = clock.now(); expired.challengeDigest = digestCanonical(expired.payload);
    await assert.rejects(make(true, true, uid, expired).authorize("promote", expired.challengeId), errorCode("EVIDENCE_INVALID"));
    const revoked = structuredClone(configuration); revoked.revokedNonceDigests = [record(clock.now()).nonceDigest];
    await assert.rejects(make(true, true, uid, record(clock.now()), new TrustedPrincipalRegistry(revoked)).authorize("promote", "challenge_unit_authorization"), errorCode("EVIDENCE_INVALID"));
    chmodSync(keyStore.keyPath("principal_operator"), 0o644);
    await assert.rejects(make(true, true).authorize("promote", "challenge_unit_authorization"), errorCode("EVIDENCE_INVALID"));
    await assert.rejects(async () => new OwnerOnlyEd25519KeyStore({ root: join(root, "keys"), ownerUid: uid, browserReachableRoots: [root] }), errorCode("WRITE_CONFINEMENT_UNAVAILABLE"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
