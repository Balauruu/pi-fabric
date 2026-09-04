import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { verifyFabricCompatibilityCertificate, type FabricCompatibilityCertificateV1 } from "../../src/compatibility/certification.js";
import { loadProductionCertificationStatus } from "../../src/certification/startup.js";
import {
  collectCompatibilityRuntimeEvidence,
  loadApprovalRuntimeEvidence,
  loadHostAgentRuntimeEvidence,
  loadHostIntegrationRuntimeEvidence,
  type ApprovalRuntimeEvidenceV1,
  type HostAgentRuntimeEvidenceV1,
  type HostIntegrationRuntimeEvidenceV1,
} from "../../src/certification/runtime-evidence.js";
import { digestCanonical } from "../../src/util/canonical.js";

const projectRoot = process.cwd();
const packageRoot = join(projectRoot, "node_modules", "pi-fabric");
const hostPackageRoot = packageRoot;
const currentPackageRoot = join(projectRoot, "..", "npm", "node_modules", "pi-fabric");
const hostAgentArtifact = join(projectRoot, "certification", "upstream", "pi-fabric", "0.76.2", "artifacts", "host-runtime-evidence.v1.json");
const approvalArtifact = join(projectRoot, "certification", "upstream", "pi-fabric", "0.76.2", "artifacts", "approval-runtime-evidence.v1.json");
const hostIntegrationArtifact = join(projectRoot, "certification", "upstream", "pi-fabric", "0.76.2", "artifacts", "host-integration-runtime.v1.json");
const compatibilityArtifact = join(projectRoot, "certification", "upstream", "pi-fabric", "0.76.2", "compatibility-results.v1.json");
const upstreamArtifact = join(projectRoot, "certification", "upstream", "pi-fabric", "0.76.2", "manifest.v1.json");

function writeJson(path: string, value: unknown): void { writeFileSync(path, `${JSON.stringify(value)}\n`); }
function locations(overrides: Partial<{ hostAgentArtifact: string; approvalArtifact: string; hostIntegrationArtifact: string }> = {}) {
  return { projectRoot, packageRoot, hostPackageRoot, hostAgentArtifact, approvalArtifact, hostIntegrationArtifact, ...overrides };
}

test("closed runtime validators accept both exact retained release matrices", () => {
  assert.equal(loadHostAgentRuntimeEvidence(hostAgentArtifact).evidence.passed, true);
  assert.equal(loadApprovalRuntimeEvidence(approvalArtifact).evidence.observations.length, 5);
  assert.equal(loadHostIntegrationRuntimeEvidence(hostIntegrationArtifact).evidence.passed, true);
  const collected = collectCompatibilityRuntimeEvidence(locations());
  assert.equal(collected.bindings.activePackageRuntimeDigest, collected.bindings.hostPackageRuntimeDigest);
  assert.deepEqual(collected.bindings.toolSourceDigests, collected.bindings.hostToolSourceDigests);
  assert.equal(collected.bindings.integrationTestDigest, collected.hostIntegration.testDigest);
  assert.equal(collected.bindings.approvalArtifactDigest, collected.hostIntegration.approvalArtifactDigest);
  const currentRoot = join(projectRoot, "certification", "upstream", "pi-fabric", "0.77.0");
  const current = collectCompatibilityRuntimeEvidence({ projectRoot, packageRoot: currentPackageRoot, hostPackageRoot: currentPackageRoot, hostAgentArtifact: join(currentRoot, "artifacts/host-runtime-evidence.v1.json"), approvalArtifact: join(currentRoot, "artifacts/approval-runtime-evidence.v1.json"), hostIntegrationArtifact: join(currentRoot, "artifacts/host-integration-runtime.v1.json") });
  assert.equal(current.hostAgent.piFabricVersion, "0.77.0"); assert.equal(current.hostIntegration.piFabricVersion, "0.77.0"); assert.equal(current.approval.piFabricVersion, "0.77.0");
  assert.equal(current.bindings.activePackageRuntimeDigest, current.bindings.hostPackageRuntimeDigest);
});

test("host agent evidence rejects unknown, unsupported, stale, and contradictory fields", () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-host-evidence-negative-"));
  try {
    const original = JSON.parse(readFileSync(hostAgentArtifact, "utf8")) as HostAgentRuntimeEvidenceV1;
    const unknown = structuredClone(original) as HostAgentRuntimeEvidenceV1 & { unknown?: boolean }; unknown.unknown = true; const unknownPath = join(root, "unknown.json"); writeJson(unknownPath, unknown);
    assert.throws(() => loadHostAgentRuntimeEvidence(unknownPath), /closed schema/u);
    const unsupported = structuredClone(original) as unknown as { piFabricVersion: string }; unsupported.piFabricVersion = "0.76.3"; const unsupportedPath = join(root, "unsupported.json"); writeJson(unsupportedPath, unsupported);
    assert.throws(() => loadHostAgentRuntimeEvidence(unsupportedPath), /closed schema/u);
    const contradictory = structuredClone(original); contradictory.actions.status.observation.id = "0".repeat(32); const contradictoryPath = join(root, "contradictory.json"); writeJson(contradictoryPath, contradictory);
    assert.throws(() => loadHostAgentRuntimeEvidence(contradictoryPath), /correlation is contradictory/u);
    const stale = structuredClone(original); stale.createdAt = "2026-09-03T10:08:00.122Z"; const stalePath = join(root, "stale.json"); writeJson(stalePath, stale);
    assert.throws(() => loadHostAgentRuntimeEvidence(stalePath), /timestamp is stale/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("approval and integration evidence reject semantic tampering even after self-digests are recomputed", () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-runtime-evidence-tamper-"));
  try {
    const approval = JSON.parse(readFileSync(approvalArtifact, "utf8")) as ApprovalRuntimeEvidenceV1;
    approval.observations[2]!.approvalsRequested = 1;
    approval.certificateDigest = digestCanonical((({ certificateDigest: _digest, ...unsigned }) => unsigned)(approval));
    const approvalPath = join(root, "approval.json"); writeJson(approvalPath, approval);
    assert.throws(() => loadApprovalRuntimeEvidence(approvalPath), /scenario is contradictory/u);

    const integration = JSON.parse(readFileSync(hostIntegrationArtifact, "utf8")) as HostIntegrationRuntimeEvidenceV1;
    integration.testDigest = "0".repeat(64);
    integration.certificateDigest = digestCanonical((({ certificateDigest: _digest, ...unsigned }) => unsigned)(integration));
    const integrationPath = join(root, "integration.json"); writeJson(integrationPath, integration);
    assert.equal(loadHostIntegrationRuntimeEvidence(integrationPath).evidence.passed, true);
    assert.throws(() => collectCompatibilityRuntimeEvidence(locations({ hostIntegrationArtifact: integrationPath })), /test digest is stale/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("startup disables real agents when any retained B1 artifact drifts", () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-startup-evidence-drift-"));
  try {
    const copied = join(root, "certification"); cpSync(join(projectRoot, "certification"), copied, { recursive: true });
    const driftedPath = join(copied, "upstream", "pi-fabric", "0.76.2", "artifacts", "host-runtime-evidence.v1.json");
    const drifted = JSON.parse(readFileSync(driftedPath, "utf8")) as HostAgentRuntimeEvidenceV1; drifted.outputValidation.waitSentinel = false; writeJson(driftedPath, drifted);
    const status = loadProductionCertificationStatus({ projectRoot, piFabricPackageRoot: packageRoot, artifactRoot: copied });
    assert.equal(status.certifications.compatibilityCertified, false); assert.equal(status.productionCertified, false); assert.equal(status.realAgentsEnabled, false);
    assert.ok(status.blockers.some((entry) => entry.startsWith("upstream:") || entry.startsWith("compatibility:")));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("compatibility verification rejects unsupported versions and any retained runtime artifact drift", () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-compat-evidence-tamper-"));
  try {
    const certificate = JSON.parse(readFileSync(compatibilityArtifact, "utf8")) as FabricCompatibilityCertificateV1;
    const upstream = JSON.parse(readFileSync(upstreamArtifact, "utf8")) as { packageDigest: string };
    const verifyInput = { piFabricRoot: packageRoot, arborSourceRoot: join(projectRoot, "src"), projectRoot, runtimeEvidence: locations(), expectedPackageDigest: upstream.packageDigest };
    assert.equal(verifyFabricCompatibilityCertificate(certificate, verifyInput), true);
    const unsupported = structuredClone(certificate) as unknown as Record<string, unknown>; unsupported.piFabricVersion = "0.76.3"; unsupported.certificateDigest = digestCanonical((({ certificateDigest: _digest, ...unsigned }) => unsigned)(unsupported));
    assert.equal(verifyFabricCompatibilityCertificate(unsupported as unknown as FabricCompatibilityCertificateV1, verifyInput), false);
    const host = JSON.parse(readFileSync(hostAgentArtifact, "utf8")) as HostAgentRuntimeEvidenceV1; host.outputValidation.runSentinel = false; const driftedHost = join(root, "host.json"); writeJson(driftedHost, host);
    assert.equal(verifyFabricCompatibilityCertificate(certificate, { ...verifyInput, runtimeEvidence: locations({ hostAgentArtifact: driftedHost }) }), false);
    assert.throws(() => collectCompatibilityRuntimeEvidence(locations({ hostIntegrationArtifact: join(root, "missing.json") })));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
