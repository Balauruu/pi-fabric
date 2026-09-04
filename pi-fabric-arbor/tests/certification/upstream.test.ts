import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FABRIC_COMPATIBILITY_REQUIRED_CHECKS_V1, verifyFabricCompatibilityCertificate } from "../../src/compatibility/certification.js";
import { PI_FABRIC_PEER_RANGE_V1 } from "../../src/certification/pi-fabric-support.js";
import { generateUpstreamCertification, verifyUpstreamCertification } from "../../src/certification/upstream.js";

const project = process.cwd();

test("installed pi-fabric 0.76.2 certification is reproducible and validates every payload byte and lock fact", { timeout: 30_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-upstream-cert-"));
  try {
    const options = { packageRoot: join(project, "node_modules/pi-fabric"), hostPiFabricRoot: join(project, "node_modules/pi-fabric"), packageLockPath: join(project, "package-lock.json"), arborSourceRoot: join(project, "src"), outputRoot: root, createdAt: "2026-09-01T00:00:00.000Z", signerId: "local_ci" };
    const first = await generateUpstreamCertification(options); const firstBytes = readFileSync(join(root, "manifest.v1.json")); const second = await generateUpstreamCertification(options);
    assert.deepEqual(readFileSync(join(root, "manifest.v1.json")), firstBytes); assert.equal(second.certificate.certificationId, first.certificate.certificationId);
    assert.equal(second.certificate.files.length > 100, true); assert.equal(second.certificate.files.every((file) => file.supportsClaims.length > 0), true);
    assert.match(second.certificate.packageLockProvenance.integrity, /^sha512-/); assert.equal(second.certificate.publicExportDigests.length, 4);
    assert.deepEqual(verifyUpstreamCertification({ projectRoot: project, packageRoot: options.packageRoot, hostPiFabricRoot: options.packageRoot, packageLockPath: options.packageLockPath, artifactRoot: root }), { valid: true, errors: [], certificate: second.certificate });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("compatibility artifact admits an exact matrix release only after every required evidence tier verifies", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-compat-cert-"));
  try {
    const packageRoot = join(project, "node_modules/pi-fabric"); const generated = await generateUpstreamCertification({ packageRoot, hostPiFabricRoot: packageRoot, packageLockPath: join(project, "package-lock.json"), arborSourceRoot: join(project, "src"), outputRoot: root, createdAt: "2026-09-01T00:00:00.000Z", signerId: "local_ci" });
    const runtimeEvidence = { projectRoot: project, packageRoot, hostPackageRoot: packageRoot, hostAgentArtifact: join(root, "artifacts/host-runtime-evidence.v1.json"), approvalArtifact: join(root, "artifacts/approval-runtime-evidence.v1.json"), hostIntegrationArtifact: join(root, "artifacts/host-integration-runtime.v1.json") };
    assert.equal(verifyFabricCompatibilityCertificate(generated.compatibility, { piFabricRoot: packageRoot, arborSourceRoot: join(project, "src"), projectRoot: project, runtimeEvidence, expectedPackageDigest: generated.certificate.packageDigest }), true);
    const names = new Set(generated.compatibility.checks.map((entry) => entry.name)); for (const name of FABRIC_COMPATIBILITY_REQUIRED_CHECKS_V1) assert.equal(names.has(name), true, name);
    assert.equal(generated.compatibility.supported, true); assert.equal(generated.compatibility.agentActions.every((entry) => entry.runtimeTested && entry.passed), true);
    assert.deepEqual(generated.certificate.supportedVersions, ["0.76.2"]); assert.deepEqual(generated.certificate.rejectedVersions, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("retained B0/B1 evidence and peer metadata cover exactly 0.76.2 and 0.77.0", () => {
  const manifest = JSON.parse(readFileSync(join(project, "package.json"), "utf8")) as { peerDependencies: Record<string, string> };
  assert.equal(manifest.peerDependencies["pi-fabric"], PI_FABRIC_PEER_RANGE_V1);
  for (const [version, packageRoot, packageLockPath] of [
    ["0.76.2", join(project, "node_modules/pi-fabric"), join(project, "package-lock.json")],
    ["0.77.0", join(project, "../npm/node_modules/pi-fabric"), join(project, "../npm/package-lock.json")],
  ] as const) {
    const result = verifyUpstreamCertification({ projectRoot: project, packageRoot, hostPiFabricRoot: packageRoot, packageLockPath, artifactRoot: join(project, "certification/upstream/pi-fabric", version) });
    assert.equal(result.valid, true, `${version}: ${result.errors.join("; ")}`); assert.deepEqual(result.certificate?.supportedVersions, [version]);
  }
});
