import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { verifyPhase7GraduationCertification } from "../../src/certification/phase7.js";
import type { Phase7AcceptanceCertificateV1 } from "../../src/phase7/acceptance.js";
import { ACCEPTANCE_EVIDENCE_KINDS_V1, PHASE7_ACCEPTANCE_STEP_SCHEMA_V1 } from "../../src/phase7/acceptance-evidence.js";
import { verifyGraduationThresholdSealV1, type GraduationThresholdSealV1 } from "../../src/phase7/thresholds.js";
import { PHASE7_SCHEMAS_V1 } from "../../src/phase7/schemas.js";
import { validateJsonSchema } from "../../src/schemas/validate.js";
import { digestCanonical } from "../../src/util/canonical.js";

const projectRoot = process.cwd(); const hostPiFabricRoot = join(projectRoot, "../npm/node_modules/pi-fabric"); const phase7Root = join(projectRoot, "certification/phase7");
const { verifyPhase7AcceptanceCertificateV1 } = await import(pathToFileURL(join(projectRoot, "dist/src/phase7/acceptance.js")).href) as typeof import("../../src/phase7/acceptance.js");
function retainedAcceptance(): { seal: GraduationThresholdSealV1; certificate: Phase7AcceptanceCertificateV1 } { return { seal: JSON.parse(readFileSync(join(phase7Root, "graduation-thresholds.v1.json"), "utf8")) as GraduationThresholdSealV1, certificate: JSON.parse(readFileSync(join(phase7Root, "acceptance-maximize.v1.json"), "utf8")) as Phase7AcceptanceCertificateV1 }; }
function reseal(certificate: any, stepIndex?: number): Phase7AcceptanceCertificateV1 { if (stepIndex !== undefined) certificate.steps[stepIndex].evidenceDigest = digestCanonical(certificate.steps[stepIndex].evidence); const { certificateDigest: _old, ...payload } = certificate; certificate.certificateDigest = digestCanonical(payload); return certificate as Phase7AcceptanceCertificateV1; }

test("retained Phase 7 graduation has complete independently verifiable evidence", () => { const processResult = spawnSync(process.execPath, [join(projectRoot, "dist/bin/pi-fabric-arbor-phase7-certify.js"), "verify", "--project-root", projectRoot, "--host-package-root", hostPiFabricRoot], { cwd: projectRoot, encoding: "utf8", timeout: 120_000 }); assert.equal(processResult.status, 0, processResult.stderr || processResult.stdout); const result = JSON.parse(processResult.stdout.trim()) as { valid: boolean; errors: string[]; certificateDigest: string }; assert.deepEqual(result.errors, []); assert.equal(result.valid, true); assert.match(result.certificateDigest, /^[0-9a-f]{64}$/u); });

test("independent accessibility review validates structured contrast and control evidence", () => { const result = spawnSync(process.execPath, [join(projectRoot, "scripts/phase7-reviewer.mjs"), "accessibility", projectRoot], { cwd: projectRoot, encoding: "utf8", timeout: 30_000 }); assert.equal(result.status, 0, result.stderr || result.stdout); const review = JSON.parse(result.stdout) as { passed: boolean; findings: unknown[]; checks: Array<{ name: string; passed: boolean }> }; assert.equal(review.passed, true); assert.deepEqual(review.findings, []); assert.equal(review.checks.find((entry) => entry.name === "wcag-contrast-samples")?.passed, true); assert.equal(review.checks.find((entry) => entry.name === "wcag-named-control-inventory")?.passed, true); });

test("stale threshold and certificate tampering are rejected", async () => { const root = mkdtempSync(join(tmpdir(), "arbor-p7-tamper-")); try { const source = join(projectRoot, "certification/phase7"); for (const relative of ["graduation-thresholds.v1.json", "graduation-certificate.v1.json"]) writeFileSync(join(root, relative), readFileSync(join(source, relative)));
  const thresholdPath = join(root, "graduation-thresholds.v1.json"); const threshold = JSON.parse(readFileSync(thresholdPath, "utf8")) as GraduationThresholdSealV1; threshold.thresholds.latency.maximumP95Ms += 1; writeFileSync(thresholdPath, `${JSON.stringify(threshold)}\n`); assert.equal(verifyGraduationThresholdSealV1(threshold).valid, false);
  const result = await verifyPhase7GraduationCertification({ projectRoot, outputRoot: root, hostPiFabricRoot }); assert.equal(result.valid, false); assert.ok(result.errors.length > 0);
} finally { rmSync(root, { recursive: true, force: true }); } });

test("all 35 evidence variants are closed, required, nonempty, and keyed by step number", () => { const { seal, certificate } = retainedAcceptance(); assert.deepEqual(certificate.steps.map((entry) => entry.evidence.kind), ACCEPTANCE_EVIDENCE_KINDS_V1);
  certificate.steps.forEach((step, index) => {
    assert.deepEqual(validateJsonSchema(PHASE7_ACCEPTANCE_STEP_SCHEMA_V1, step), []);
    const missing = structuredClone(certificate) as any; const evidence = missing.steps[index].evidence as Record<string, unknown>; const key = Object.keys(evidence).find((candidate) => !["version", "kind", "boundary"].includes(candidate)); assert.ok(key); delete evidence[key!]; assert.equal(verifyPhase7AcceptanceCertificateV1(reseal(missing, index), seal).valid, false, `step ${index + 1} accepted missing ${key}`);
    const unknown = structuredClone(certificate) as any; unknown.steps[index].evidence.unexpectedReceiptField = "tampered"; assert.equal(verifyPhase7AcceptanceCertificateV1(reseal(unknown, index), seal).valid, false, `step ${index + 1} accepted an unknown field`);
  });
});

test("interrupted-attempt readiness is digest-bound", () => { const { seal, certificate } = retainedAcceptance(); const mutated = structuredClone(certificate) as any; mutated.steps[8].evidence.interruptionReadinessDigest = "0".repeat(64); assert.equal(verifyPhase7AcceptanceCertificateV1(reseal(mutated, 8), seal).valid, false); });

test("every consequential step rejects a tampered retained fingerprint cross-binding", () => { const { seal, certificate } = retainedAcceptance(); for (let index = 1; index < 35; index += 1) { const mutated = structuredClone(certificate) as any; mutated.steps[index].evidence.boundary.effectId = `${mutated.steps[index].evidence.boundary.effectId}_tampered`; const result = verifyPhase7AcceptanceCertificateV1(reseal(mutated, index), seal); assert.equal(result.valid, false, `step ${index + 1} accepted a mismatched effect binding`); } });

test("representative top-level contract, evaluator, authorization, CAS, report, cleanup, parity, and resource mutations fail after digest recomputation", () => { const { seal, certificate } = retainedAcceptance(); const cases: Array<[string, (value: any) => void]> = [
  ["contract", (value) => { value.contractDigest = "0".repeat(64); }],
  ["private repository", (value) => { value.privateRepositoryDigest = "0".repeat(64); }],
  ["attempts", (value) => { value.attemptsDigest = "0".repeat(64); }],
  ["development", (value) => { value.developmentEvidenceDigest = "0".repeat(64); }],
  ["held-out policy", (value) => { value.heldOutCandidate.evaluatorPolicyDigest = "0".repeat(64); const { receiptDigest: _digest, ...payload } = value.heldOutCandidate; value.heldOutCandidate.receiptDigest = digestCanonical(payload); }],
  ["live Fabric", (value) => { value.liveFabric.artifactDigest = "0".repeat(64); }],
  ["authorization", (value) => { value.authorizationIds[0] = "authorization_tampered"; }],
  ["write policy", (value) => { value.fabricWritePolicyEvidence[0].approvalId = "approval_tampered"; value.fabricWritePolicyEvidenceDigest = digestCanonical(value.fabricWritePolicyEvidence); }],
  ["winner predecessor", (value) => { value.predecessorOid = "1".repeat(40); }],
  ["winner CAS", (value) => { value.winnerRefCas[1].targetOid = "1".repeat(40); }],
  ["report manifest", (value) => { value.reportManifestDigest = "0".repeat(64); }],
  ["report file", (value) => { value.reportArtifacts[0].digest = "0".repeat(64); }],
  ["cleanup", (value) => { value.cleanupDigest = "0".repeat(64); }],
  ["projection", (value) => { value.projectionParityDigest = "0".repeat(64); }],
  ["resource", (value) => { value.resourceBudget.breachCount = 1; }],
]; for (const [name, mutate] of cases) { const value = structuredClone(certificate) as any; mutate(value); const result = verifyPhase7AcceptanceCertificateV1(reseal(value), seal); assert.equal(result.valid, false, `${name} mutation was accepted`); } });

test("Phase 7 public schemas are recursively closed", () => { const visit = (value: unknown): void => { if (!value || typeof value !== "object") return; if (Array.isArray(value)) { value.forEach(visit); return; } const record = value as Record<string, unknown>; if (record.type === "object") assert.equal(record.additionalProperties, false); if (record.type === "array") { assert.equal(typeof record.maxItems, "number"); assert.ok(Number(record.maxItems) >= Number(record.minItems ?? 0)); } for (const child of Object.values(record)) visit(child); }; visit(PHASE7_SCHEMAS_V1); });
