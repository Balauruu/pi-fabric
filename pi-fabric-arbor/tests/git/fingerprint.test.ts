import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Ed25519FingerprintSigner, FingerprintBoundaryGuard, IndependentRepositoryFingerprintOracle, RepositoryFingerprinter, publicRepositoryFingerprintCertificate, verifyRepositoryFingerprintCertificate } from "../../src/git/fingerprint.js";
import { errorCode } from "../helpers.js";

function git(cwd: string, ...args: string[]): string { return execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8" }).trim(); }

function fixture(root: string) {
  const source = join(root, "source"); const sibling = join(root, "sibling"); const state = join(root, "state");
  mkdirSync(source); mkdirSync(state); git(source, "init", "-q"); git(source, "config", "user.email", "fp@example.invalid"); git(source, "config", "user.name", "Fingerprint");
  writeFileSync(join(source, "tracked.txt"), "base\n"); git(source, "add", "."); git(source, "commit", "-qm", "base");
  git(source, "branch", "other"); git(source, "worktree", "add", "-q", sibling, "other");
  writeFileSync(join(source, "stash.txt"), "stash\n"); git(source, "add", "stash.txt"); git(source, "stash", "push", "-qm", "retained-stash");
  writeFileSync(join(source, "tracked.txt"), "dirty\n"); writeFileSync(join(source, "untracked.txt"), "untracked\n");
  writeFileSync(join(sibling, "sibling-untracked.txt"), "sibling\n"); git(source, "update-ref", "refs/users/example", git(source, "rev-parse", "HEAD"));
  return { source, sibling, state };
}

function metadata(ordinal: number, previousCertificateDigest?: string) {
  return {
    certificateId: `fingerprint_${ordinal}`,
    runId: "run_fingerprint",
    boundaryId: `boundary_${ordinal}`,
    boundaryKind: "containedAgent",
    effectId: `effect_${ordinal}`,
    commandId: `command_${ordinal}`,
    correlationIds: [`correlation_${ordinal}`],
    fence: 1,
    expectedRevision: ordinal,
    containmentId: "containment_linux",
    packageRepositoryIdentityDigest: "a".repeat(64),
    reportGenerationId: "report_fingerprint",
    ...(previousCertificateDigest ? { previousCertificateDigest } : {}),
  };
}

test("100 dirty-checkout trials produce oracle-matched, chained, signed equal fingerprint certificates", { timeout: 120_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-fingerprint-"));
  try {
    const paths = fixture(root); const signer = new Ed25519FingerprintSigner("local_test_signer"); let quarantined = 0;
    const guard = new FingerprintBoundaryGuard({ checkout: paths.source, stateRoot: paths.state }, signer, () => { quarantined += 1; });
    let predecessor: string | undefined;
    for (let ordinal = 1; ordinal <= 100; ordinal += 1) {
      const { certificate } = await guard.run(metadata(ordinal, predecessor), async () => ordinal);
      assert.equal(certificate.equal, true); assert.equal(verifyRepositoryFingerprintCertificate(certificate), true);
      assert.equal(certificate.previousCertificateDigest, predecessor ?? "205c1ea141856df62ea1e2c776a3da816efc7d525590aaa83aaab638619e90a0"); assert.equal(JSON.stringify(publicRepositoryFingerprintCertificate(certificate)).includes(paths.source), false);
      predecessor = certificate.certificateDigest;
    }
    assert.equal(quarantined, 0); assert.match(predecessor!, /^[0-9a-f]{64}$/);
    const primary = await new RepositoryFingerprinter().capture({ checkout: paths.source, stateRoot: paths.state });
    assert.equal(primary.source.head.state, "branch"); assert.equal(primary.source.untracked.some((entry) => entry.path === "untracked.txt"), true);
    assert.equal(primary.siblings.length, 1); assert.notEqual(primary.stash.ref.bytes, 0);
    await new IndependentRepositoryFingerprintOracle().requireMatch({ checkout: paths.source, stateRoot: paths.state }, primary);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("fingerprint boundary quarantines immediately on source mutation", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-fingerprint-mismatch-"));
  try {
    const paths = fixture(root); let quarantined = false;
    const guard = new FingerprintBoundaryGuard({ checkout: paths.source, stateRoot: paths.state }, new Ed25519FingerprintSigner("local_test_signer"), () => { quarantined = true; });
    await assert.rejects(guard.run(metadata(1), async () => { writeFileSync(join(paths.source, "untracked.txt"), "mutated\n"); }), errorCode("QUARANTINED"));
    assert.equal(quarantined, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
