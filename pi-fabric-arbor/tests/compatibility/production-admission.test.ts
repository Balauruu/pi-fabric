import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { ArborApplication, type ArborApplicationDependenciesV1 } from "../../src/application/ArborApplication.js";
import { issueProductionAdmissionV1, productionAdapterIdentityDigestV1, productionConfigurationDigestV1, type ProductionApplicationBindingsV1 } from "../../src/application/ProductionAdmission.js";
import * as fabricPolicyBoundary from "../../src/authorization/FabricPolicyTraversal.js";
import * as publicApi from "../../src/index.js";
import type { FabricPolicyTraversalAuthority } from "../../src/authorization/FabricPolicyTraversal.js";
import { FixtureCleanupAdapter, FixtureEvaluator, FixtureWorkspaceManager, ScriptedFixtureAgent } from "../../src/fixtures/adapters.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { InMemoryRunStore } from "../../src/persistence/InMemoryRunStore.js";
import { FileReportPublisher, renderReportFiles } from "../../src/reports/FileReportPublisher.js";
import { DeterministicIdFactory, ManualClock } from "../../src/util/clock.js";
import { digestCanonical, sha256 } from "../../src/util/canonical.js";

async function dependencies(root: string): Promise<ArborApplicationDependenciesV1> {
  const ids = new DeterministicIdFactory();
  return { store: new InMemoryRunStore(), workspace: new FixtureWorkspaceManager(), agent: new ScriptedFixtureAgent(), evaluator: new FixtureEvaluator(ids), reportPublisher: await FileReportPublisher.open(join(root, "reports")), cleanup: new FixtureCleanupAdapter(), clock: new ManualClock(), ids, gitOidLength: 40, executionMode: "fixture" };
}

test("caller booleans, asserted production mode, and copied admission-shaped objects cannot construct production", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-production-admission-"));
  try {
    const base = await dependencies(root);
    assert.throws(() => new ArborApplication({ ...base, executionMode: "productionCertified", certifications: { upstreamCertified: true, compatibilityCertified: true, containmentCertified: true, fingerprintCertified: true, recoveryCertified: true, heldOutCertified: true, authorizationCertified: true, promotionCertified: true } } as unknown as ArborApplicationDependenciesV1), /Caller-asserted production execution mode is prohibited/u);
    const forged = Object.freeze({ version: 1, admissionDigest: "a".repeat(64) });
    const git = { async buildDetached() { throw new Error("unused"); }, async observeWinnerRef() { throw new Error("unused"); }, async applyWinnerRef() { throw new Error("unused"); }, winnerRef(runId: string) { return `refs/pi-fabric-arbor/${runId}/winner`; } };
    const productionShape = { ...base, executionMode: undefined, productionAdmission: forged, productionDispatch: { containmentId: "containment_test", agentProfileId: "profile_test", requestSchemaDigest: "c".repeat(64), resultSchemaDigest: "d".repeat(64), toolPolicyId: "policy_test" }, phase5: { git, authorization: {}, heldOutIsolationCertificateDigest: "e".repeat(64), challengeTtlMs: 60_000 } };
    assert.throws(() => new ArborApplication(productionShape as unknown as ArborApplicationDependenciesV1), /absent, forged, copied/u);
    const fixture = new ArborApplication(base);
    await assert.rejects(fixture.executeWithFabricPolicyTraversal({ version: 1, kind: "applyWinnerRef", metadata: { runId: "run_approval", expectedRevision: 0, idempotencyKey: "untrusted_approval_call" }, promotionId: "promotion_approval" }, { fence: 0, now: "2026-01-01T00:00:00.000Z" }, { parentToolCallId: "parent.call", nestedToolCallId: "nested.call" }, {}), /Only the package Fabric provider/u);
    const sourceRoot = join(process.cwd(), "src"); const sources: string[] = [];
    const walk = (directory: string): void => { for (const entry of readdirSync(directory, { withFileTypes: true })) entry.isDirectory() ? walk(join(directory, entry.name)) : entry.name.endsWith(".ts") && sources.push(join(directory, entry.name)); }; walk(sourceRoot);
    const issuers = sources.filter((path) => readFileSync(path, "utf8").includes("issueProductionAdmissionV1("));
    assert.deepEqual(issuers.map((path) => path.slice(sourceRoot.length + 1)).sort(), ["application/ProductionAdmission.ts", "application/ProductionComposition.ts"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("graduated loader binds the actually executing packaged entrypoint and never issues admission without exact bindings", async () => {
  const raw = execFileSync(process.execPath, ["--input-type=module", "-e", "import {loadGraduatedProductionStatusV1} from './dist/src/phase7/index.js';import {inspectDistribution} from './dist/src/certification/distribution.js';import {readFileSync} from 'node:fs';import {join} from 'node:path';import {sha256} from './dist/src/util/canonical.js';const s=await loadGraduatedProductionStatusV1({projectRoot:process.cwd(),piFabricPackageRoot:'node_modules/pi-fabric',hostPiFabricRoot:'../npm/node_modules/pi-fabric'});const inventory=inspectDistribution(process.cwd()).files;console.log(JSON.stringify({admission:Boolean(s.admissionEvidence),release:s.release,inventoryExact:inventory.every(f=>f.digest===sha256(readFileSync(join(process.cwd(),f.path))))}));"], { cwd: process.cwd(), encoding: "utf8" });
  const status = JSON.parse(raw) as { admission: boolean; inventoryExact: boolean; release: { executedEntrypointDigest: string; packagedDistDigest: string } };
  assert.equal(status.admission, false); assert.equal(status.inventoryExact, true);
  assert.equal(status.release.executedEntrypointDigest, sha256(readFileSync(join(process.cwd(), "dist/src/phase7/index.js"))));
  assert.match(status.release.packagedDistDigest, /^[0-9a-f]{64}$/u);
});

test("production start records the exact Phase 7, distribution, adapter, and B0-B12 gate evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-production-evidence-"));
  try {
    const base = await dependencies(root); const { executionMode: _fixtureMode, ...adapters } = base;
    const git = { async buildDetached() { throw new Error("unused"); }, async observeWinnerRef() { throw new Error("unused"); }, async applyWinnerRef() { throw new Error("unused"); }, winnerRef(runId: string) { return `refs/pi-fabric-arbor/${runId}/winner`; } };
    const productionDispatch = { containmentId: "containment_certified", agentProfileId: "profile_certified", requestSchemaDigest: "c".repeat(64), resultSchemaDigest: "d".repeat(64), toolPolicyId: "policy_certified" };
    const configuration = { version: 1 as const, arborProjectRoot: root, piFabricPackageRoot: join(root, "pi-fabric"), hostPiFabricRoot: join(root, "host-pi-fabric"), repositoryRoot: join(root, "repository"), workspaceRoot: join(root, "workspaces"), reportRoot: join(root, "reports"), artifactRoot: join(root, "certification"), heldOutRoot: join(root, "held-out"), evaluatorExecutable: join(root, "evaluator"), gitOidLength: 40 as const };
    const bindings: ProductionApplicationBindingsV1 = { store: adapters.store, workspace: adapters.workspace, agent: adapters.agent, evaluator: adapters.evaluator, reportPublisher: adapters.reportPublisher, cleanup: adapters.cleanup, git, authorization: {} as ProductionApplicationBindingsV1["authorization"], heldOutIsolationCertificateDigest: "e".repeat(64), productionDispatch, configuration };
    const b9 = "9".repeat(64); const authority: FabricPolicyTraversalAuthority = { boundary: "certified-production-host", b9CertificationDigest: b9, async authorize(request) { const payload = { ...request, boundary: "certified-production-host" as const, traversedAt: "2026-01-01T00:00:00.000Z", b9CertificationId: "approval_runtime_b9_v1" as const, b9CertificationDigest: b9 }; return { ...payload, traversalDigest: digestCanonical(payload) }; } };
    const gateEvidenceDigests = Object.fromEntries(["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"].map((gate) => [gate, sha256(`gate:${gate}`)]));
    const evidence = { version: 1 as const, mode: "production-certified" as const, admissionDigest: sha256("exact-production-admission"), configurationDigest: productionConfigurationDigestV1(bindings), packageInventoryDigest: sha256("inventory"), packagedDistDigest: sha256("dist"), arborSourceDigest: sha256("arbor"), piFabricPackageDigest: sha256("package"), hostPiFabricPackageDigest: sha256("host"), certificationArtifactDigest: sha256("artifacts"), piFabricVersion: "0.76.2" as const, certificateIds: ["phase7_graduation_v1", "distribution_phase6_v1", "approval_runtime_b9_v1"], certificateDigests: [sha256("phase7"), sha256("distribution"), b9], productionCertificateId: "phase7_graduation_v1", productionCertificateDigest: sha256("phase7"), productionCertificatePath: "phase7/graduation-certificate.v1.json", distributionCertificateId: "distribution_phase6_v1", distributionCertificateDigest: sha256("distribution"), distributionCertificatePath: "phase6/distribution-phase6.v1.json", adapterIdentityDigest: productionAdapterIdentityDigestV1(bindings), fabricApprovalRuntimeCertificateDigest: b9, fabricApprovalRuntimeCertificatePath: "phase6/approval-runtime-b9.v1.json", gateResults: Object.fromEntries(Object.keys(gateEvidenceDigests).map((gate) => [gate, "PASS" as const])), gateEvidenceDigests, blockers: [] };
    const { B8: _missingB8, ...incompleteGateEvidence } = gateEvidenceDigests;
    assert.throws(() => issueProductionAdmissionV1(bindings, { ...evidence, gateEvidenceDigests: incompleteGateEvidence }, authority), /B0-B12/u);
    assert.throws(() => issueProductionAdmissionV1(bindings, evidence, { ...authority, b9CertificationDigest: "a".repeat(64) }), /B0-B12/u);
    const admission = issueProductionAdmissionV1(bindings, evidence, authority);
    const application = new ArborApplication({ ...adapters, productionAdmission: admission, productionDispatch, phase5: { git, authorization: bindings.authorization, heldOutIsolationCertificateDigest: bindings.heldOutIsolationCertificateDigest } });
    await application.execute({ version: 1, kind: "start", metadata: { runId: "run_production_evidence", expectedRevision: 0, idempotencyKey: "production_evidence_start" }, contract: createFixtureContract() }, { fence: 0, now: "2026-01-01T00:00:00.000Z" });
    const run = await bindings.store.load("run_production_evidence"); assert.ok(run?.runtimeAdmission); assert.equal(run.runtimeAdmission.productionCertificateDigest, evidence.productionCertificateDigest); assert.equal(run.runtimeAdmission.distributionCertificateDigest, evidence.distributionCertificateDigest); assert.equal(run.runtimeAdmission.adapterIdentityDigest, evidence.adapterIdentityDigest); assert.deepEqual(Object.values(run.runtimeAdmission.gateResults), Array(13).fill("PASS")); assert.deepEqual(Object.keys(run.runtimeAdmission.gateEvidenceDigests).sort(), Object.keys(gateEvidenceDigests).sort());
    const summary = JSON.parse(renderReportFiles(run)["run-summary.v1.json"]!) as { admission: { productionCertificateDigest: string; distributionCertificateDigest: string; adapterIdentityDigest: string; gateResults: Record<string, string> } };
    assert.equal(summary.admission.productionCertificateDigest, evidence.productionCertificateDigest); assert.equal(summary.admission.distributionCertificateDigest, evidence.distributionCertificateDigest); assert.equal(summary.admission.adapterIdentityDigest, evidence.adapterIdentityDigest); assert.deepEqual(Object.values(summary.admission.gateResults), Array(13).fill("PASS"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("Fabric policy boundary exposes no runtime minting or injectable approval callback", () => {
  assert.deepEqual(Object.keys(fabricPolicyBoundary), []);
  assert.equal("issueProductionAdmissionV1" in publicApi, false); assert.equal("resolvePreparedProductionProviderV1" in publicApi, false); assert.equal("FabricWriteApprovalAuthority" in publicApi, false);
  const source = readFileSync(join(process.cwd(), "src/authorization/FabricPolicyTraversal.ts"), "utf8");
  assert.equal(/class\s+FabricWriteApprovalAuthority|fromCertifiedHostInvocation|callback\s*:/u.test(source), false);
});
