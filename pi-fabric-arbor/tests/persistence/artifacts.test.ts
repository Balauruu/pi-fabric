import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ArtifactStore, type ArtifactReadCapabilityV1 } from "../../src/persistence/ArtifactStore.js";
import { errorCode } from "../helpers.js";

async function grant(store: ArtifactStore, artifactId: string, digest: string, overrides: Partial<{ principalId: string; runId: string; effectId: string; expiresAt: string; maxReads: number }> = {}) {
  return store.issueReadCapability({ version: 1, artifactId, expectedDigest: digest, principalId: "principal_monitor", runId: "run_artifact", effectId: "effect_artifact", expiresAt: "2030-01-01T00:01:00.000Z", maxReads: 2, ...overrides });
}

test("CAS redacts before hashing, deduplicates, and requires scoped expiring limited-use capabilities for every content read", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-cas-")); let now = "2030-01-01T00:00:00.000Z";
  try {
    const store = await ArtifactStore.open(root, { now: () => now }); const first = await store.putText("token Bearer abcdef at /home/alice/private"); const duplicate = await store.putText("token Bearer abcdef at /home/alice/private"); assert.deepEqual(duplicate, first);
    const capability = await grant(store, first.artifactId, first.digest); const body = Buffer.from(await store.read(capability)).toString("utf8"); assert.equal(body.includes("abcdef"), false); assert.equal(body.includes("/home/alice"), false); assert.equal((await store.read(capability, 4)).byteLength, 4);
    await assert.rejects(store.read(capability), errorCode("ARTIFACT_INVALID"));
    const second = await store.putText("second artifact"); const secondCapability = await grant(store, second.artifactId, second.digest, { maxReads: 1 });
    await assert.rejects(store.read({ ...secondCapability, artifactId: first.artifactId }), errorCode("ARTIFACT_INVALID"));
    await assert.rejects(store.read({ ...secondCapability, principalId: "principal_other" }), errorCode("ARTIFACT_INVALID"));
    await assert.rejects(store.read({ ...secondCapability, runId: "run_other" }), errorCode("ARTIFACT_INVALID"));
    await assert.rejects(store.read({ ...secondCapability, effectId: "effect_other" }), errorCode("ARTIFACT_INVALID"));
    await assert.rejects(store.read({ ...secondCapability, token: "x".repeat(43) }), errorCode("ARTIFACT_INVALID"));
    now = "2030-01-01T00:02:00.000Z"; await assert.rejects(store.read(secondCapability), errorCode("ARTIFACT_INVALID"));
    const audit = store.auditRecords(); assert.equal(audit.some((entry) => entry.action === "issued" && entry.principalId === "principal_monitor" && entry.runId === "run_artifact" && entry.effectId === "effect_artifact"), true); assert.equal(JSON.stringify(audit).includes("second artifact"), false);
    await assert.rejects(store.put(Buffer.from("raw"), { redacted: false }), errorCode("ARTIFACT_INVALID")); await assert.rejects(store.put(Buffer.from("safe"), { redacted: true, expectedDigest: "0".repeat(64) }), errorCode("ARTIFACT_INVALID")); await assert.rejects(store.put(Buffer.alloc(5), { redacted: true, maxBytes: 4 }), errorCode("ARTIFACT_INVALID"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("CAS rejects symlink substitution before capability issuance or use", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-cas-link-"));
  try {
    const store = await ArtifactStore.open(root, { now: () => "2030-01-01T00:00:00.000Z" }); const receipt = await store.putText("safe"); const capability = await grant(store, receipt.artifactId, receipt.digest);
    const ref = join(root, "refs", `${receipt.artifactId}.json`); const metadata = await readFile(ref); await unlink(ref); const target = join(root, "outside.json"); await (await import("node:fs/promises")).writeFile(target, metadata); await symlink(target, ref);
    await assert.rejects(store.read(capability as ArtifactReadCapabilityV1), errorCode("ARTIFACT_INVALID"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
