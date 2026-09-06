import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { executeRecoveryFaultMatrix, RECOVERY_BOUNDARIES_V1 } from "../../src/recovery/RecoveryFaultHarness.js";

const fingerprint = JSON.parse(readFileSync(join(process.cwd(), "certification/fingerprint/linux-git-2.55.0/trial-certification.v1.json"), "utf8")) as { certificationId: string; certificationDigest: string };

test("all 19 crash boundaries pass 20 consecutive deterministic injections with fingerprint and Web equality bindings", () => {
  const results = executeRecoveryFaultMatrix({ iterationsPerBoundary: 20, createdAt: "2026-09-01T00:00:00.000Z", fingerprintCertificationId: fingerprint.certificationId, fingerprintCertificationDigest: fingerprint.certificationDigest });
  assert.equal(results.length, 380); assert.equal(RECOVERY_BOUNDARIES_V1.length, 19);
  for (const boundary of RECOVERY_BOUNDARIES_V1) {
    const injections = results.filter((entry) => entry.boundaryId === boundary.boundaryId); assert.equal(injections.length, 20, boundary.boundaryId);
    for (const injection of injections) {
      assert.equal(injection.acceptedDurableOutcomes, 1); assert.equal(injection.replayExecutions, 0);
      assert.equal(injection.duplicateDispatches + injection.duplicateCertificates + injection.duplicateReports + injection.duplicateCleanupDeletions, 0);
      assert.equal(injection.fingerprint.equal, true); assert.equal(injection.fingerprint.effectId, injection.effectId); assert.equal(injection.fingerprint.fence, injection.fence);
      assert.equal(injection.processExitSignal, "SIGKILL"); assert.equal(injection.restartCount, 2); assert.match(injection.journalDigest, /^[0-9a-f]{64}$/);
      assert.equal(injection.freshProjectionDigest, injection.reconstructedProjectionDigest);
    }
  }
});
