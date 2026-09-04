import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PackageWorkspaceManager } from "../../src/git/PackageWorkspaceManager.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { errorCode } from "../helpers.js";

function command(cwd: string, ...args: string[]): string { return execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8" }).trim(); }
function repository(root: string): { source: string; oid: string } {
  const source = join(root, "source"); mkdirSync(join(source, "src"), { recursive: true }); mkdirSync(join(source, "protected"));
  command(source, "init", "-q"); command(source, "config", "user.email", "test@example.invalid"); command(source, "config", "user.name", "Arbor Test");
  writeFileSync(join(source, "src", "a.txt"), "base\n"); writeFileSync(join(source, "protected", "guard.txt"), "guard\n"); writeFileSync(join(source, "result.txt"), "base-result\n");
  command(source, "add", "."); command(source, "commit", "-qm", "base");
  return { source, oid: command(source, "rev-parse", "HEAD") };
}

function contract(oid: string) {
  const value = createFixtureContract();
  return { ...value, repository: { ...value.repository, repositoryId: "repo_private", initialOid: oid }, paths: { editable: ["src/**", "result.txt", "link"], protected: ["protected/**"], requiredOutputs: ["result.txt"] } };
}

test("private repository imports one exact OID without alternates, shared common dir, hardlinks, remotes, or user refs", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-private-git-"));
  try {
    const { source, oid } = repository(root); const state = join(root, "state"); mkdirSync(state);
    const hookSentinel = join(root, "hook-ran"); const hooks = join(root, "host-hooks"); mkdirSync(hooks);
    writeFileSync(join(hooks, "post-checkout"), `#!/bin/sh\ntouch '${hookSentinel}'\n`); chmodSync(join(hooks, "post-checkout"), 0o755);
    command(source, "config", "core.hooksPath", hooks); command(source, "config", "credential.helper", "!false");
    const manager = new PackageWorkspaceManager({ stateRoot: state, repositoryId: "repo_private", sourceCheckout: source, expectedSourceOid: oid });
    const imported = await manager.importExactSource();
    assert.equal(imported.importedOid, oid); assert.equal(imported.privateGitDir.startsWith(state), true);
    assert.equal(existsSync(join(imported.privateGitDir, "objects", "info", "alternates")), false);
    assert.equal(command(imported.privateGitDir, "remote"), "");
    assert.deepEqual(command(imported.privateGitDir, "for-each-ref", "--format=%(refname)").split("\n").filter(Boolean), [`refs/pi-fabric-arbor/imports/${oid}`]);
    const observation = await manager.materialize({ version: 1, runId: "run_private", attemptId: "attempt_one", workspaceId: "workspace_one", baseOid: oid, idempotencyKey: "materialize_key_001" });
    assert.equal(observation.trust, "certified"); assert.equal(existsSync(hookSentinel), false);
    const workspace = manager.workspacePath("run_private", "workspace_one");
    assert.equal(existsSync(join(workspace, ".git")), false, "worker receives content export without Git control metadata");
    assert.notEqual(lstatSync(join(source, "src", "a.txt"), { bigint: true }).ino, lstatSync(join(workspace, "src", "a.txt"), { bigint: true }).ino);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("three parallel workspaces are isolated and finalization validates renames, modes, symlinks, claims, protected paths, and required outputs", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-parallel-git-"));
  try {
    const { source, oid } = repository(root); const state = join(root, "state"); mkdirSync(state);
    const manager = new PackageWorkspaceManager({ stateRoot: state, repositoryId: "repo_private", sourceCheckout: source, expectedSourceOid: oid });
    const requests = [1, 2, 3].map((ordinal) => ({ version: 1 as const, runId: "run_parallel", attemptId: `attempt_${ordinal}`, workspaceId: `workspace_${ordinal}`, baseOid: oid, idempotencyKey: `materialize_parallel_${ordinal}` }));
    await Promise.all(requests.map((request) => manager.materialize(request)));
    const workspaces = requests.map((request) => manager.workspacePath(request.runId, request.workspaceId));
    await Promise.all(workspaces.map(async (workspace, index) => { writeFileSync(join(workspace, "result.txt"), `result-${index}\n`); writeFileSync(join(workspace, "src", `only-${index}.txt`), `${index}\n`); }));
    for (let index = 0; index < workspaces.length; index += 1) {
      assert.equal(readFileSync(join(workspaces[index]!, "result.txt"), "utf8"), `result-${index}\n`);
      for (let other = 0; other < workspaces.length; other += 1) assert.equal(existsSync(join(workspaces[index]!, "src", `only-${other}.txt`)), index === other);
    }
    const first = workspaces[0]!;
    renameSync(join(first, "src", "a.txt"), join(first, "src", "b.txt")); chmodSync(join(first, "src", "b.txt"), 0o755); symlinkSync("src/b.txt", join(first, "link"));
    const candidate = await manager.finalize({ version: 1, runId: "run_parallel", attemptId: "attempt_1", hypothesisId: "hypothesis_one", candidateId: "candidate_one", baseOid: oid, changedPaths: ["link", "result.txt", "src/a.txt", "src/b.txt", "src/only-0.txt"], contract: contract(oid) });
    assert.match(candidate.candidateOid, /^[0-9a-f]{40}$/); assert.deepEqual(candidate.changedPaths, ["link", "result.txt", "src/a.txt", "src/b.txt", "src/only-0.txt"]);
    assert.equal(existsSync(join(first, ".git")), false); assert.equal(command(manager.privateGitDir, "show", `${candidate.candidateOid}:result.txt`), "result-0");
    assert.match(command(manager.privateGitDir, "for-each-ref", "--format=%(refname)"), /^refs\/pi-fabric-arbor\//m);

    const second = workspaces[1]!; writeFileSync(join(second, "protected", "guard.txt"), "tampered\n");
    await assert.rejects(manager.finalize({ version: 1, runId: "run_parallel", attemptId: "attempt_2", hypothesisId: "hypothesis_two", candidateId: "candidate_two", baseOid: oid, changedPaths: ["protected/guard.txt", "result.txt", "src/only-1.txt"], contract: contract(oid) }), errorCode("EVIDENCE_INVALID"));
    const third = workspaces[2]!; rmSync(join(third, "result.txt"));
    await assert.rejects(manager.finalize({ version: 1, runId: "run_parallel", attemptId: "attempt_3", hypothesisId: "hypothesis_three", candidateId: "candidate_three", baseOid: oid, changedPaths: ["result.txt", "src/only-2.txt"], contract: contract(oid) }), errorCode("EVIDENCE_INVALID"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
