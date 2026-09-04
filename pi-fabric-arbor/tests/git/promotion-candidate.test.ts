import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { PackageWorkspaceManager } from "../../src/git/PackageWorkspaceManager.js";
import { PrivateRepositoryPromotionGitIntegrator } from "../../src/git/PromotionGitIntegrator.js";
import { errorCode } from "../helpers.js";

function git(cwd: string, ...args: string[]): string { return execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8" }).trim(); }

async function setup() {
  const root = mkdtempSync(join(tmpdir(), "arbor-promotion-git-")); const source = join(root, "source");
  mkdirSync(join(source, "src"), { recursive: true }); mkdirSync(join(source, "protected"));
  git(source, "init", "-q"); git(source, "config", "user.name", "test"); git(source, "config", "user.email", "test@invalid");
  writeFileSync(join(source, "src", "old.ts"), "old\n"); writeFileSync(join(source, "result.txt"), "base\n"); writeFileSync(join(source, "protected", "guard"), "guard\n");
  git(source, "add", "."); git(source, "commit", "-qm", "base"); const oid = git(source, "rev-parse", "HEAD"); git(source, "branch", "user-branch");
  const state = join(root, "state"); mkdirSync(state); const manager = new PackageWorkspaceManager({ stateRoot: state, repositoryId: "repo_promotion", sourceCheckout: source, expectedSourceOid: oid });
  await manager.materialize({ version: 1, runId: "run_promotion", attemptId: "attempt_promotion", workspaceId: "workspace_promotion", baseOid: oid, idempotencyKey: "promotion_workspace_01" });
  const workspace = manager.workspacePath("run_promotion", "workspace_promotion"); renameSync(join(workspace, "src", "old.ts"), join(workspace, "src", "new.ts")); chmodSync(join(workspace, "src", "new.ts"), 0o755); symlinkSync("src/new.ts", join(workspace, "link")); writeFileSync(join(workspace, "result.txt"), "candidate\n");
  const base = createFixtureContract(); const contract = { ...base, repository: { repositoryId: "repo_promotion", initialOid: oid, dirtyPolicy: "committedOnly" as const }, paths: { editable: ["src/**", "link", "result.txt"], protected: ["protected/**"], requiredOutputs: ["result.txt"] } };
  const candidate = await manager.finalize({ version: 1, runId: "run_promotion", attemptId: "attempt_promotion", hypothesisId: "hypothesis_promotion", candidateId: "candidate_promotion", baseOid: oid, changedPaths: ["link", "result.txt", "src/new.ts", "src/old.ts"], contract });
  const integrator = new PrivateRepositoryPromotionGitIntegrator({ privateGitDir: manager.privateGitDir, stateRoot: manager.stateRoot, gitOidLength: 40 });
  return { root, source, oid, manager, contract, candidate, integrator };
}

test("held-out baseline and candidate use the same deterministic detached merge algorithm and preserve all refs", async () => {
  const fixture = await setup();
  try {
    const sourceRefs = git(fixture.source, "for-each-ref", "--format=%(refname)%00%(objectname)");
    const baseline = await fixture.integrator.buildDetached({ version: 1, runId: "run_promotion", role: "heldOutBaseline", expectedResearchTrunkOid: fixture.oid, candidateOid: fixture.oid, contract: fixture.contract });
    const candidate = await fixture.integrator.buildDetached({ version: 1, runId: "run_promotion", role: "heldOutCandidate", expectedResearchTrunkOid: fixture.oid, candidateOid: fixture.candidate.candidateOid, candidateId: fixture.candidate.candidateId, contract: fixture.contract });
    assert.equal(baseline.algorithmDigest, candidate.algorithmDigest); assert.deepEqual(baseline.changedPaths, []);
    assert.deepEqual(candidate.changedPaths, ["link", "result.txt", "src/new.ts", "src/old.ts"]);
    assert.ok(candidate.diffEntries.some((entry) => entry.status.startsWith("R") && entry.newMode === "100755"));
    assert.ok(candidate.diffEntries.some((entry) => entry.type === "symlink" && entry.symlinkTarget === "src/new.ts"));
    assert.equal(candidate.beforeRefsDigest, candidate.afterRefsDigest); assert.equal(git(fixture.source, "for-each-ref", "--format=%(refname)%00%(objectname)"), sourceRefs);
    assert.equal(readFileSync(join(fixture.source, "result.txt"), "utf8"), "base\n");
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("winner and rollback use exact OID CAS only on the package winner ref", async () => {
  const fixture = await setup();
  try {
    const construction = await fixture.integrator.buildDetached({ version: 1, runId: "run_promotion", role: "heldOutCandidate", expectedResearchTrunkOid: fixture.oid, candidateOid: fixture.candidate.candidateOid, candidateId: fixture.candidate.candidateId, contract: fixture.contract });
    const refsBefore = git(fixture.manager.privateGitDir, "for-each-ref", "--format=%(refname)%00%(objectname)"); const zero = "0".repeat(40);
    await assert.rejects(fixture.integrator.applyWinnerRef({ version: 1, operationId: "operation_stale", runId: "run_promotion", expectedOid: "f".repeat(40), targetOid: construction.mergeCandidateOid }), errorCode("INDETERMINATE"));
    assert.equal((await fixture.integrator.observeWinnerRef("run_promotion")).actualOid, zero);
    await fixture.integrator.applyWinnerRef({ version: 1, operationId: "operation_promote", runId: "run_promotion", expectedOid: zero, targetOid: construction.mergeCandidateOid });
    assert.equal((await fixture.integrator.observeWinnerRef("run_promotion")).actualOid, construction.mergeCandidateOid);
    await fixture.integrator.applyWinnerRef({ version: 1, operationId: "operation_rollback", runId: "run_promotion", expectedOid: construction.mergeCandidateOid, targetOid: zero });
    assert.equal((await fixture.integrator.observeWinnerRef("run_promotion")).actualOid, zero);
    const refsAfter = git(fixture.manager.privateGitDir, "for-each-ref", "--format=%(refname)%00%(objectname)");
    assert.equal(refsAfter, refsBefore, "candidate/import refs remain unchanged after winner create/delete");
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});
