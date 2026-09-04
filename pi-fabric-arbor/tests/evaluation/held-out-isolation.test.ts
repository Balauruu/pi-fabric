import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateLocalHeldOutIsolationCertification, verifyLocalHeldOutIsolationCertification } from "../../src/certification/held-out.js";
import { CanonicalEvaluatorReadOnlyMountGrant, canonicalFilesystemEntries, computeCanonicalFilesystemDigest } from "../../src/containment/BubblewrapContainmentAdapter.js";

test("current Linux Bubblewrap policy directly denies held-out worker access and grants only the canonical read-only evaluator mount", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-held-out-cert-test-"));
  try {
    const certificate = await generateLocalHeldOutIsolationCertification({ projectRoot: process.cwd(), outputRoot: root, createdAt: "2026-09-03T05:00:00.000Z", signerId: "test_certifier" });
    assert.equal(certificate.valid, true); assert.equal(certificate.tests.length, 7); assert.ok(certificate.tests.every((entry) => entry.direct && entry.passed));
    assert.deepEqual(certificate.workerPolicy, { heldOutData: "absent", credentials: "absent", hostPath: "absent", invocationCapability: "absent", opaqueTokenResolution: "absent" });
    assert.equal(verifyLocalHeldOutIsolationCertification({ projectRoot: process.cwd(), artifactRoot: root }).valid, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("held-out directory digests use canonical arrays and distinguish path, content, and empty-directory vectors", () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-held-out-digest-"));
  try {
    const one = join(root, "one"); const two = join(root, "two"); const three = join(root, "three");
    for (const path of [one, two, three]) mkdirSync(path); writeFileSync(join(one, "a"), "same"); writeFileSync(join(two, "b"), "same"); mkdirSync(join(three, "empty"));
    const entries = canonicalFilesystemEntries(one); assert.equal(Array.isArray(entries), true); assert.notDeepEqual(entries, {}); assert.equal(new Set([computeCanonicalFilesystemDigest(one), computeCanonicalFilesystemDigest(two), computeCanonicalFilesystemDigest(three)]).size, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("held-out grants rehash inputs immediately before resolution", () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-held-out-rehash-"));
  try { const path = join(root, "input"); writeFileSync(path, "sealed"); const grant = new CanonicalEvaluatorReadOnlyMountGrant(path, "opaque"); writeFileSync(path, "mutated"); assert.throws(() => grant.resolve("opaque"), /changed after its grant was sealed/u); }
  finally { rmSync(root, { recursive: true, force: true }); }
});
