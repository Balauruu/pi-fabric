import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Phase4RecoveryCertificateV1 } from "../../src/certification/recovery.js";
import { executeRecoveryFaultMatrix, RECOVERY_BOUNDARIES_V1 } from "../../src/recovery/RecoveryFaultHarness.js";
import { FIXTURE_SCHEMAS_V1 } from "../../src/schemas/catalog.js";
import { assertJsonSchema } from "../../src/schemas/validate.js";

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

test("retained Phase 4 recovery certificate is canonical, schema-valid, and reproducible against active source and B6", () => {
  const output = execFileSync(process.execPath, ["dist/bin/pi-fabric-arbor-recovery-certify.js", "verify"], { cwd: process.cwd(), encoding: "utf8" });
  const result = JSON.parse(output) as { valid: boolean; errors: string[]; injections: number };
  assert.deepEqual(result.errors, []); assert.equal(result.valid, true); assert.equal(result.injections, 380);
  const retained = JSON.parse(readFileSync(join(process.cwd(), "certification/recovery/phase4/recovery-certificate.v1.json"), "utf8")) as Phase4RecoveryCertificateV1;
  assertJsonSchema(FIXTURE_SCHEMAS_V1.schemas.recoveryCertificate!, retained, "Phase 4 recovery certificate");
});
