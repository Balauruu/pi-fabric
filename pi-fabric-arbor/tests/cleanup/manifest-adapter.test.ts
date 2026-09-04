import assert from "node:assert/strict";
import { access, lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import type { CleanupExecutionRequestV1 } from "../../src/adapters/interfaces.js";
import { ManifestCleanupAdapter } from "../../src/cleanup/ManifestCleanupAdapter.js";

function request(overrides: Partial<CleanupExecutionRequestV1> = {}): CleanupExecutionRequestV1 {
  return { version: 1, cleanupId: "cleanup_phase6", resourceId: "resource_cleanup", resourceKind: "scratch", runId: "run_cleanup", effectId: "effect_cleanup", ...overrides };
}

async function planFile(adapter: ManifestCleanupAdapter, root: string, body = "bounded package scratch\n") {
  const relativePath = "runs/run_cleanup/scratch/result.txt"; const path = join(root, relativePath); await mkdir(dirname(path), { recursive: true, mode: 0o700 }); await writeFile(path, body);
  const manifest = await adapter.plan({ version: 1, cleanupId: "cleanup_phase6", resourceId: "resource_cleanup", resourceKind: "scratch", runId: "run_cleanup", effectId: "effect_cleanup", resourceRoot: "runs/run_cleanup/scratch", relativePaths: [relativePath] });
  return { relativePath, path, manifest };
}

test("package-authored cleanup manifests are signed, run/effect/root-bound, chained, exact, and idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-cleanup-phase6-"));
  try {
    const adapter = await ManifestCleanupAdapter.open(root); const { path, manifest } = await planFile(adapter, root);
    assert.match(manifest.signature, /^[A-Za-z0-9+/]+=*$/u); assert.equal(manifest.predecessorManifestDigest, "0".repeat(64)); assert.equal(manifest.chainSequence, 1);
    assert.deepEqual(await adapter.execute(request()), { version: 1, cleanupId: "cleanup_phase6", outcome: "completed" }); await assert.rejects(access(path));
    assert.equal((await adapter.execute(request())).outcome, "completed"); await access(join(root, "cleanup-manifests", "resource_cleanup.v1.json"));
    await assert.rejects(adapter.execute(request({ runId: "run_other" })), /does not match/u); await assert.rejects(adapter.execute(request({ effectId: "effect_other" })), /does not match/u);
    assert.equal((await adapter.execute(request({ cleanupId: "cleanup_unknown", resourceId: "resource_unknown", runId: "run_unknown", effectId: "effect_unknown" }))).outcome, "pending");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("cleanup fails closed on changed bytes, symlink substitution, overlap, and protected paths while atomically quarantining directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-cleanup-negative-"));
  try {
    const adapter = await ManifestCleanupAdapter.open(root); const planned = await planFile(adapter, root, "original"); await writeFile(planned.path, "different");
    assert.equal((await adapter.execute(request())).outcome, "indeterminate"); assert.equal(await readFile(planned.path, "utf8"), "different");

    const symlinkRoot = await mkdtemp(join(tmpdir(), "arbor-cleanup-symlink-"));
    try { const symlinkAdapter = await ManifestCleanupAdapter.open(symlinkRoot); const value = await planFile(symlinkAdapter, symlinkRoot, "original"); await rm(value.path); await symlink("target.txt", value.path); assert.equal((await symlinkAdapter.execute(request())).outcome, "indeterminate"); assert.equal((await lstat(value.path)).isSymbolicLink(), true); }
    finally { await rm(symlinkRoot, { recursive: true, force: true }); }

    const directory = join(root, "runs", "run_cleanup", "directory"); await mkdir(directory, { recursive: true }); await writeFile(join(directory, "x"), "x");
    const directoryManifest = await adapter.plan({ version: 1, cleanupId: "cleanup_directory", resourceId: "resource_directory", resourceKind: "scratch", runId: "run_cleanup", effectId: "effect_directory", resourceRoot: "runs/run_cleanup/directory", relativePaths: ["runs/run_cleanup/directory"] });
    assert.equal(directoryManifest.chainSequence, 2); assert.equal(directoryManifest.predecessorManifestDigest, planned.manifest.manifestDigest);
    assert.equal((await adapter.execute(request({ cleanupId: "cleanup_directory", resourceId: "resource_directory", effectId: "effect_directory" }))).outcome, "completed"); await assert.rejects(access(directory));
    await assert.rejects(adapter.plan({ version: 1, cleanupId: "cleanup_protected", resourceId: "resource_protected", resourceKind: "scratch", runId: "run_cleanup", effectId: "effect_protected", resourceRoot: "runs/run_cleanup", relativePaths: ["cleanup-manifests/resource_cleanup.v1.json"] }), /outside its planned resource root|invalid/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("fd-relative quarantine prevents symlink-swap and parent-rename races from deleting replacement resources", async () => {
  for (const race of ["swap", "rename"] as const) {
    const root = await mkdtemp(join(tmpdir(), `arbor-cleanup-race-${race}-`)); let fired = false;
    try {
      const adapter = await ManifestCleanupAdapter.open(root, { beforeAtomicDelete: async () => {
        if (fired) return; fired = true; const resourceRoot = join(root, "runs", "run_cleanup", "scratch"); const target = join(resourceRoot, "result.txt");
        if (race === "swap") { await rename(target, `${target}.original`); await writeFile(target, "replacement"); }
        else { await rename(resourceRoot, `${resourceRoot}.original`); await mkdir(resourceRoot, { recursive: true }); await writeFile(target, "replacement"); }
      } });
      const { path } = await planFile(adapter, root, "original"); const outcome = await adapter.execute(request()); assert.equal(outcome.outcome, "indeterminate"); assert.equal(await readFile(path, "utf8"), "replacement");
      if (race === "swap") assert.equal(await readFile(`${path}.original`, "utf8"), "original"); else assert.equal(await readFile(join(root, "runs", "run_cleanup", "scratch.original", "result.txt"), "utf8"), "original");
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
