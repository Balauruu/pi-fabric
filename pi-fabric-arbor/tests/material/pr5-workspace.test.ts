import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile, readFile, chmod, symlink, readlink, lstat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { Workspace } from "../../src/material/Workspace.js";
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });
async function fixture(nonGit = false) {
  const base = resolve(".runtime/pr5-filesystem"); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, "case-")), source = join(root, "source"), owned = join(root, "owned"); await mkdir(source);
  await writeFile(join(source, "prompt"), "baseline"); await writeFile(join(source, "gone"), "delete"); await writeFile(join(source, "check"), "fixed");
  if (!nonGit) { git(source, "init", "-b", "main"); git(source, "config", "user.name", "PR5"); git(source, "config", "user.email", "pr5@example.invalid"); git(source, "add", "."); git(source, "commit", "-m", "initial"); }
  return { root, source, owned, workspace: new Workspace(owned) };
}
test("PR5 dirty staged/unstaged, selected untracked, modes, symlinks, deletion and NUL paths preserve source index/refs", async () => {
  const f = await fixture();
  await writeFile(join(f.source, "prompt"), "staged"); git(f.source, "add", "prompt"); await writeFile(join(f.source, "prompt"), "dirty");
  git(f.source, "rm", "gone"); await writeFile(join(f.source, ".gitignore"), "ignored\n"); await writeFile(join(f.source, "ignored"), "secret"); await writeFile(join(f.source, "excluded"), "not selected");
  const odd = "odd\n\t-name"; await writeFile(join(f.source, odd), "odd"); await chmod(join(f.source, "prompt"), 0o755); await symlink("prompt", join(f.source, "link"));
  const before = await readFile(join(f.source, ".git/index")), refs = git(f.source, "show-ref"), status = git(f.source, "status", "--porcelain=v1", "-z");
  const capture = await f.workspace.capture({ root: f.source, mutablePaths: ["prompt", "link", odd], evaluationInputs: ["check"], selectedUntracked: [odd, "link", ".gitignore"] });
  const candidate = await f.workspace.materialize(capture, "one", capture.baseline);
  assert.equal(await readFile(join(candidate.directory, "prompt"), "utf8"), "dirty"); assert.equal(await readlink(join(candidate.directory, "link")), "prompt"); assert.ok((await lstat(join(candidate.directory, "prompt"))).mode & 0o111);
  for (const name of ["gone", "ignored", "excluded"]) await assert.rejects(readFile(join(candidate.directory, name)));
  git(candidate.directory, "switch", "-c", "worker-branch"); await writeFile(join(candidate.directory, "prompt"), "improved"); git(candidate.directory, "add", "."); git(candidate.directory, "-c", "user.name=worker", "-c", "user.email=w@example.invalid", "commit", "-m", "worker commit");
  await writeFile(join(candidate.directory, odd), "worker staged"); git(candidate.directory, "add", "--", odd);
  const frozen = await f.workspace.freeze(capture, candidate);
  const patch = await f.workspace.export(capture, frozen.oid); assert.match(patch, /dirty/); assert.doesNotMatch(patch, /^[-+]staged$|baseline/m);
  await f.workspace.restore(capture, candidate);
  assert.equal(await readFile(join(candidate.directory, "prompt"), "utf8"), "dirty"); assert.equal(git(candidate.directory, "status", "--porcelain"), "");
  assert.equal(git(candidate.directory, "rev-parse", "HEAD").trim(), capture.baseline); assert.throws(() => git(candidate.directory, "symbolic-ref", "--quiet", "HEAD"));
  assert.equal(git(capture.repository, "cat-file", "-t", frozen.oid).trim(), "commit");
  assert.deepEqual(await readFile(join(f.source, ".git/index")), before); assert.equal(git(f.source, "show-ref"), refs); assert.equal(git(f.source, "status", "--porcelain=v1", "-z"), status);
});
test("PR5 non-Git capture owns repository, rejects eval-input/scope drift and retains artifacts", async () => {
  const f = await fixture(true); const capture = await f.workspace.capture({ root: f.source, mutablePaths: ["prompt"], evaluationInputs: ["check"], selectedUntracked: [] });
  await assert.rejects(lstat(join(f.source, ".git")));
  const candidate = await f.workspace.materialize(capture, "one", capture.baseline);
  await writeFile(join(candidate.directory, "check"), "cheat"); await assert.rejects(f.workspace.freeze(capture, candidate), /evaluation input|mutable scope/);
  await f.workspace.restore(capture, candidate); assert.equal(await readFile(join(candidate.directory, "check"), "utf8"), "fixed");
});
test("PR5 detects concurrent capture changes and rejects selected ignored, unresolved and sparse states", async () => {
  const f = await fixture();
  await assert.rejects(f.workspace.capture({ root: f.source, mutablePaths: ["prompt"], evaluationInputs: [], selectedUntracked: [] }, async () => { await writeFile(join(f.source, "prompt"), "concurrent"); }), /Source changed during capture/);
  await writeFile(join(f.source, ".gitignore"), "ignored\n"); await writeFile(join(f.source, "ignored"), "secret");
  await assert.rejects(f.workspace.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: ["ignored"] }), /ignored/);
  git(f.source, "config", "core.sparseCheckout", "true"); await assert.rejects(f.workspace.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: [] }), /sparse/);
});

test("PR5 unresolved stages and submodules are refused without source/index mutation", async () => {
  const f = await fixture(), oid = git(f.source, "rev-parse", "HEAD").trim();
  git(f.source, "update-index", "--add", "--cacheinfo", "160000", oid, "module");
  let before = await readFile(join(f.source, ".git/index"));
  await assert.rejects(f.workspace.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: [] }), /submodule/); assert.deepEqual(await readFile(join(f.source, ".git/index")), before);
  git(f.source, "update-index", "--force-remove", "module");
  const blob = git(f.source, "rev-parse", "HEAD:prompt").trim();
  execFileSync("git", ["update-index", "--index-info"], { cwd: f.source, input: `0 ${"0".repeat(40)}\tprompt\n100644 ${blob} 1\tprompt\n100644 ${blob} 2\tprompt\n` });
  before = await readFile(join(f.source, ".git/index")); await assert.rejects(f.workspace.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: [] }), /Unresolved merge/); assert.deepEqual(await readFile(join(f.source, ".git/index")), before);
});
test("PR5 index race, nested owned destination and escaping evaluation symlink are explicit refusals", async () => {
  const f = await fixture(); await writeFile(join(f.source, "prompt"), "dirty");
  await assert.rejects(f.workspace.capture({ root: f.source, mutablePaths: ["prompt"], evaluationInputs: [], selectedUntracked: [] }, async () => { git(f.source, "add", "prompt"); }), /Source changed during capture/);
  const nested = new Workspace(join(f.source, "must-not-create")); await assert.rejects(nested.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: [] }), /outside source/); await assert.rejects(lstat(join(f.source, "must-not-create")));
  await symlink("../outside", join(f.source, "escape"));
  const capture = await f.workspace.capture({ root: f.source, mutablePaths: ["prompt"], evaluationInputs: [], selectedUntracked: ["escape"] });
  const { freezeMaterial } = await import("../../src/evaluators/material.js");
  await assert.rejects(freezeMaterial(f.workspace.reference(capture, capture.baseline), join(f.root, "evaluation")), /symlink escapes/);
});
test("PR5 full evaluator tree preserves binary bytes, executable mode, symlink identity and detects added files", async () => {
  const f = await fixture(); await writeFile(join(f.source, "binary"), Buffer.from([0, 255, 1])); await symlink("prompt", join(f.source, "link")); await chmod(join(f.source, "prompt"), 0o755);
  const capture = await f.workspace.capture({ root: f.source, mutablePaths: ["prompt"], evaluationInputs: ["check"], selectedUntracked: ["binary", "link"] });
  const { freezeMaterial, verifyMaterial } = await import("../../src/evaluators/material.js"); const s = await freezeMaterial(f.workspace.reference(capture, capture.baseline), join(f.root, "evaluation"));
  assert.deepEqual(await readFile(join(s.directory, "binary")), Buffer.from([0, 255, 1])); assert.equal(await readlink(join(s.directory, "link")), "prompt"); assert.ok((await lstat(join(s.directory, "prompt"))).mode & 0o100);
  await writeFile(join(s.directory, "unexpected"), "generated"); await assert.rejects(verifyMaterial(s), /coverage changed/);
  const rawTarget = Buffer.from([120, 255]); await symlink(rawTarget, join(f.source, "raw-link")); const rawWorkspace = new Workspace(join(f.root, "raw-owned"));
  const raw = await rawWorkspace.capture({ root: f.source, mutablePaths: ["prompt"], evaluationInputs: [], selectedUntracked: ["raw-link"] }); const candidate = await rawWorkspace.materialize(raw, "raw", raw.baseline);
  assert.deepEqual(await readlink(join(candidate.directory, "raw-link"), { encoding: "buffer" }), rawTarget);
  await assert.rejects(freezeMaterial(rawWorkspace.reference(raw, raw.baseline), join(f.root, "raw-evaluation")), /non-UTF-8 symlink/);
});

test("PR5 transitive evaluation symlinks reject escape and cycles but allow internal directory aliases", async () => {
  const { freezeMaterial, verifyMaterial } = await import("../../src/evaluators/material.js");
  for (const target of ["a/../outside", "escape"]) {
    const f = await fixture(); await symlink(".", join(f.source, "a")); await symlink(target, join(f.source, "escape"));
    const c = await f.workspace.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: ["a", "escape"] });
    await assert.rejects(freezeMaterial(f.workspace.reference(c, c.baseline), join(f.root, "evaluation")), /symlink.*(escapes|cycle)/);
  }
  const f = await fixture(); await mkdir(join(f.source, "dir")); await writeFile(join(f.source, "dir/file"), "internal"); await symlink("dir", join(f.source, "a")); await symlink("a/../prompt", join(f.source, "link"));
  const c = await f.workspace.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: ["dir/file", "a", "link"] });
  const s = await freezeMaterial(f.workspace.reference(c, c.baseline), join(f.root, "evaluation")); await verifyMaterial(s); assert.equal(await readFile(join(s.directory, "link"), "utf8"), "baseline");
});
test("PR5 skip-worktree uppercase and assume-unchanged lowercase flags refuse before omitting missing indexed bytes", async () => {
  for (const assume of [false, true]) {
    const f = await fixture(); git(f.source, "update-index", "--skip-worktree", "prompt"); if (assume) git(f.source, "update-index", "--assume-unchanged", "prompt"); await unlink(join(f.source, "prompt"));
    assert.match(git(f.source, "ls-files", "-v"), assume ? /^s prompt$/m : /^S prompt$/m);
    const index = await readFile(join(f.source, ".git/index")), refs = git(f.source, "show-ref");
    await assert.rejects(f.workspace.capture({ root: f.source, mutablePaths: [], evaluationInputs: [], selectedUntracked: [] }), /skip-worktree/);
    assert.deepEqual(await readFile(join(f.source, ".git/index")), index); assert.equal(git(f.source, "show-ref"), refs);
  }
});

test("PR5 staged deletion left on disk is untracked and excluded unless explicitly selected", async () => {
  const f = await fixture(); git(f.source, "rm", "--cached", "gone"); const index = await readFile(join(f.source, ".git/index"));
  const capture = await f.workspace.capture({ root: f.source, mutablePaths: ["prompt"], evaluationInputs: [], selectedUntracked: [] });
  assert.equal(capture.files.includes("gone"), false); assert.equal(await readFile(join(f.source, "gone"), "utf8"), "delete"); assert.deepEqual(await readFile(join(f.source, ".git/index")), index);
  const sub = join(f.source, "sub"); await mkdir(sub); await writeFile(join(sub, "deleted"), "left on disk"); git(f.source, "add", "sub"); git(f.source, "commit", "-m", "tracked subdir"); git(f.source, "rm", "--cached", "sub/deleted");
  await assert.rejects(new Workspace(join(f.root, "sub-owned")).capture({ root: sub, mutablePaths: [], evaluationInputs: [], selectedUntracked: [] }), /Empty material capture/);
});
