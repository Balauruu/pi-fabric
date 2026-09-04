import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CERTIFIED_PI_FABRIC_VERSIONS_V1, PI_FABRIC_PEER_RANGE_V1, assertCertifiedPiFabricVersionV1, findPiFabricPackageLockV1, piFabricVersionIdV1 } from "../../src/certification/pi-fabric-support.js";
import { loadGraduatedProductionStatusV1 } from "../../src/phase7/index.js";

test("Fabric support is a finite set backed by exact release identities", () => {
  assert.deepEqual(CERTIFIED_PI_FABRIC_VERSIONS_V1, ["0.76.2", "0.77.0"]);
  assert.equal(PI_FABRIC_PEER_RANGE_V1, "0.76.2 || 0.77.0");
  assert.equal(piFabricVersionIdV1(assertCertifiedPiFabricVersionV1("0.77.0")), "0_77_0");
  assert.throws(() => assertCertifiedPiFabricVersionV1("0.77.1"), /no complete B0\/B1 matrix/u);
  assert.throws(() => assertCertifiedPiFabricVersionV1("1.0.0"), /no complete B0\/B1 matrix/u);
});

test("graduated production admission reports an untested future release as blocked", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-fabric-future-"));
  try {
    const packageRoot = join(root, "pi-fabric"); mkdirSync(packageRoot); writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ name: "pi-fabric", version: "0.77.1" }));
    const status = await loadGraduatedProductionStatusV1({ projectRoot: process.cwd(), piFabricPackageRoot: packageRoot, hostPiFabricRoot: packageRoot });
    assert.equal(status.productionCertified, false); assert.equal(status.realAgentsEnabled, false); assert.ok(status.blockers.some((entry) => entry.includes("no complete B0/B1 matrix")));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("owning lock discovery rejects a package without exact lock provenance", () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-fabric-support-"));
  try {
    const packageRoot = join(root, "node_modules/pi-fabric"); mkdirSync(packageRoot, { recursive: true });
    writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ name: "pi-fabric", version: "0.77.0" }));
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ packages: { "node_modules/pi-fabric": { version: "0.77.0" } } }));
    assert.equal(findPiFabricPackageLockV1(packageRoot), join(root, "package-lock.json"));
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ packages: { "node_modules/pi-fabric": { version: "0.77.1" } } }));
    assert.throws(() => findPiFabricPackageLockV1(packageRoot), /No owning package-lock/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
