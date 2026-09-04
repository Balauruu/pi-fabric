import assert from "node:assert/strict";
import { chmodSync, copyFileSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  DISTRIBUTION_SELF_PATHS_V1,
  generateDistributionCertificate,
  inspectDistribution,
  verifyDistributionCertificate,
  writeDistributionCertificate,
} from "../../src/certification/distribution.js";
import { canonicalJson, sha256 } from "../../src/util/canonical.js";

function copyRegularFile(sourceRoot: string, targetRoot: string, path: string): void {
  const source = join(sourceRoot, path); const target = join(targetRoot, path); const stat = lstatSync(source);
  assert.equal(stat.isFile(), true, path); assert.equal(stat.isSymbolicLink(), false, path);
  mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target); chmodSync(target, stat.mode & 0o777);
}

test("npm distribution content-addresses every non-self file and independently unpacks exact paths, bytes, modes, digests, and public surfaces", () => {
  const inspected = inspectDistribution(process.cwd());
  assert.ok(inspected.files.length > 0); assert.deepEqual(inspected.unpackedFiles, inspected.files);
  assert.ok(inspected.files.every((entry) => /^[0-9a-f]{64}$/u.test(entry.digest) && Number.isSafeInteger(entry.size) && Number.isSafeInteger(entry.mode)));
  assert.ok(inspected.sourceDigests.length > 100); assert.deepEqual(inspected.toolDigests.map((entry) => entry.name), ["@types/node", "node", "npm", "pi-fabric", "tar", "typescript"]);
  assert.ok(inspected.observations.every((entry) => entry.passed), inspected.observations.filter((entry) => !entry.passed).map((entry) => entry.name).join(", "));
  assert.ok(inspected.surfaceInventories.bins.length >= 15); assert.ok(inspected.surfaceInventories.exports.length >= 2); assert.ok(inspected.surfaceInventories.assets.length >= 4);
  assert.deepEqual(inspected.surfaceInventories.licenses.map((entry) => entry.path), ["LICENSE"]);
  assert.deepEqual(inspected.surfaceInventories.notices.map((entry) => entry.path), ["NOTICE", "THIRD_PARTY_NOTICES.md"]);
  assert.ok(inspected.files.every((entry) => !DISTRIBUTION_SELF_PATHS_V1.includes(entry.path)));
});

test("distribution verification rejects missing and unknown fields as typed invalid evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-distribution-shape-"));
  try {
    const certificate = generateDistributionCertificate({ projectRoot: process.cwd(), createdAt: "2026-09-04T06:00:00.000Z", signerId: "distribution_test" });
    const artifact = join(root, "distribution.json");
    for (const malformed of [
      Object.fromEntries(Object.entries(certificate).filter(([key]) => key !== "toolDigests")),
      { ...certificate, unexpectedEvidence: true },
    ]) {
      const raw = `${JSON.stringify(malformed)}\n`;
      writeFileSync(artifact, raw); writeFileSync(`${artifact}.sha256`, `${sha256(raw)}  distribution.json\n`);
      const result = verifyDistributionCertificate({ projectRoot: process.cwd(), artifact });
      assert.equal(result.valid, false);
      assert.match(result.errors.join("; "), /closed schema/u);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("same-size tampering of any packed file fails certificate verification", async () => {
  const sourceRoot = process.cwd(); const inspected = inspectDistribution(sourceRoot); const root = await mkdtemp(join(tmpdir(), "arbor-distribution-tamper-"));
  try {
    const paths = new Set([...inspected.files.map((entry) => entry.path), ...inspected.sourceDigests.map((entry) => entry.path), ...DISTRIBUTION_SELF_PATHS_V1]);
    for (const path of paths) copyRegularFile(sourceRoot, root, path);
    symlinkSync(join(sourceRoot, "node_modules"), join(root, "node_modules"), "dir");
    const artifact = join(root, DISTRIBUTION_SELF_PATHS_V1[0]!);
    const certificate = generateDistributionCertificate({ projectRoot: root, createdAt: "2026-09-04T06:00:00.000Z", signerId: "distribution_test" });
    assert.equal(certificate.passed, true); assert.equal(certificate.files.length, inspected.files.length);
    assert.equal(canonicalJson(certificate.excludedSelfPaths), canonicalJson(DISTRIBUTION_SELF_PATHS_V1));
    writeDistributionCertificate(artifact, certificate);
    assert.deepEqual(verifyDistributionCertificate({ projectRoot: root, artifact }).errors, []);

    const target = join(root, "README.md"); const before = readFileSync(target); const changed = Buffer.from(before); const mutationIndex = Math.min(32, changed.length - 1); changed[mutationIndex] = changed[mutationIndex]! ^ 1; writeFileSync(target, changed); chmodSync(target, lstatSync(join(sourceRoot, "README.md")).mode & 0o777);
    assert.equal(readFileSync(target).byteLength, before.byteLength);
    const tampered = verifyDistributionCertificate({ projectRoot: root, artifact });
    assert.equal(tampered.valid, false); assert.ok(tampered.errors.some((entry) => /inventory|tarball|observation/u.test(entry)), tampered.errors.join("; "));
  } finally { await rm(root, { recursive: true, force: true }); }
});
