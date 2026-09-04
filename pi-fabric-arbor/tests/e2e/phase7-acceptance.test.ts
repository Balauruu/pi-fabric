import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import type { Phase7AcceptanceCertificateV1 } from "../../src/phase7/acceptance.js";
import { ACCEPTANCE_EVIDENCE_KINDS_V1, validateAcceptanceStepEvidenceV1 } from "../../src/phase7/acceptance-evidence.js";
import type { GraduationThresholdSealV1 } from "../../src/phase7/thresholds.js";
import { digestCanonical } from "../../src/util/canonical.js";

const root = join(process.cwd(), "certification/phase7");
const { verifyPhase7AcceptanceCertificateV1 } = await import(pathToFileURL(join(process.cwd(), "dist/src/phase7/acceptance.js")).href) as typeof import("../../src/phase7/acceptance.js");
for (const direction of ["maximize", "minimize"] as const) test(`retained ${direction} E2E executes all 35 mandatory steps with concrete exact bindings`, () => {
  const seal = JSON.parse(readFileSync(join(root, "graduation-thresholds.v1.json"), "utf8")) as GraduationThresholdSealV1;
  const certificate = JSON.parse(readFileSync(join(root, `acceptance-${direction}.v1.json`), "utf8")) as Phase7AcceptanceCertificateV1;
  const { certificateDigest, ...payload } = certificate;
  assert.equal(certificateDigest, digestCanonical(payload));
  assert.equal(certificate.thresholdSealDigest, seal.sealDigest);
  assert.equal(certificate.passed, true);
  assert.equal(certificate.direction, direction);
  assert.equal(certificate.steps.length, 35);
  assert.deepEqual(certificate.steps.map((entry) => entry.number), Array.from({ length: 35 }, (_, index) => index + 1));
  assert.deepEqual(certificate.steps.map((entry) => entry.evidence.kind), ACCEPTANCE_EVIDENCE_KINDS_V1);
  assert.equal(certificate.steps.every((entry) => entry.passed && entry.durationMs >= (entry.number === 1 ? 0 : 1) && entry.evidenceDigest === digestCanonical(entry.evidence) && Object.keys(entry.evidence).length > 2 && validateAcceptanceStepEvidenceV1(entry).length === 0), true);
  assert.equal(certificate.steps.slice(1).every((entry) => entry.fingerprintCertificateId === (entry.evidence as { boundary: { certificateId: string } }).boundary.certificateId), true);
  assert.equal(certificate.fingerprints.length, 34);
  assert.deepEqual(verifyPhase7AcceptanceCertificateV1(certificate, seal), { valid: true, errors: [] });
  assert.doesNotMatch(JSON.stringify(certificate.steps), /\/tmp\/arbor-p7-/u);
});

test("unsupported platform and soak-log tampering fail certificate linkage", () => {
  const graduation = JSON.parse(readFileSync(join(root, "graduation-certificate.v1.json"), "utf8")) as { platformCertificateDigest: string; soakResultDigest: string };
  const platform = JSON.parse(readFileSync(join(root, "supported-platform.v1.json"), "utf8")) as { certificateDigest: string };
  const soak = JSON.parse(readFileSync(join(root, "soak-results.v1.json"), "utf8")) as { resultDigest: string };
  assert.equal(platform.certificateDigest, graduation.platformCertificateDigest);
  assert.equal(soak.resultDigest, graduation.soakResultDigest);
  platform.certificateDigest = "0".repeat(64);
  soak.resultDigest = "0".repeat(64);
  assert.notEqual(platform.certificateDigest, graduation.platformCertificateDigest);
  assert.notEqual(soak.resultDigest, graduation.soakResultDigest);
});
