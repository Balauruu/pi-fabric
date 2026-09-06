import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";

const execFile = promisify(execFileCallback);
const APP = resolve(process.cwd());
const PROFILE = resolve(APP, "..");
const RUNTIME_ROOT = join(APP, ".runtime", "pr0-e2e");
const FIXTURE_TEMPLATE = join(APP, "tests", "fixtures", "pr0-owner-local-extension.ts");
const DEFINITIONS = join(APP, "src", "component", "definitions.ts");
const OWNER_PROBE = join(APP, "src", "pr0", "OwnerLocalFabricProbe.ts");
const ROLE_SOURCE = join(APP, "tests", "fixtures", "pr0-roles");
const FABRIC_PACKAGE = join(PROFILE, "npm", "node_modules", "pi-fabric");
const fabricManifest = JSON.parse(await readFile(join(FABRIC_PACKAGE, "package.json"), "utf8")) as { exports: { ".": { import: string } } };
const FABRIC_ENTRY = resolve(FABRIC_PACKAGE, fabricManifest.exports["."].import);
const CURRENT_NODE_MODULES = dirname(FABRIC_PACKAGE);

interface TraceEntry {
  event: string;
  at: number;
  pid: number;
  sessionId: string;
  parentRun: string;
  actorId: string;
  ownerHostId: string;
  data: Record<string, any>;
}

interface Harness {
  root: string;
  project: string;
  agentDir: string;
  trace: string;
  env: NodeJS.ProcessEnv;
  cleanup(): Promise<void>;
}

interface PiRun {
  child: ReturnType<typeof spawn>;
  result: Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>;
}

async function git(cwd: string, ...args: string[]): Promise<string> {
  const result = await execFile("git", args, { cwd, encoding: "utf8" });
  return result.stdout.trim();
}

async function createGitSnapshots(root: string): Promise<{ worker: string; workerOid: string; baseline: string; baselineOid: string; candidate: string; candidateOid: string; alternate: string; alternateOid: string }> {
  const repository = join(root, "material");
  const snapshots = join(root, "snapshots");
  await mkdir(repository, { recursive: true });
  await mkdir(snapshots, { recursive: true });
  await git(repository, "init", "-b", "main");
  await git(repository, "config", "user.email", "pr0@example.invalid");
  await git(repository, "config", "user.name", "Arbor PR0");
  await writeFile(join(repository, "subject.txt"), "BAD\n");
  await git(repository, "add", "subject.txt");
  await git(repository, "commit", "-m", "baseline");
  const baselineOid = await git(repository, "rev-parse", "HEAD");
  await writeFile(join(repository, "subject.txt"), "GOOD\n");
  await git(repository, "commit", "-am", "candidate");
  const candidateOid = await git(repository, "rev-parse", "HEAD");
  await writeFile(join(repository, "subject.txt"), "ALTERNATE\n");
  await git(repository, "commit", "-am", "alternate valid material");
  const alternateOid = await git(repository, "rev-parse", "HEAD");
  const baseline = join(snapshots, "baseline");
  const candidate = join(snapshots, "candidate");
  const alternate = join(snapshots, "alternate");
  await git(repository, "worktree", "add", "--detach", baseline, baselineOid);
  await git(repository, "worktree", "add", "--detach", candidate, candidateOid);
  await git(repository, "worktree", "add", "--detach", alternate, alternateOid);
  return { worker: candidate, workerOid: candidateOid, baseline, baselineOid, candidate, candidateOid, alternate, alternateOid };
}

async function createRoleWorktree(root: string): Promise<{ coordinator: string; executor: string; reference: string }> {
  const repository = join(root, "roles-repository");
  const worktree = join(root, "roles-worktree");
  await mkdir(repository, { recursive: true });
  await git(repository, "init", "-b", "main");
  await git(repository, "config", "user.email", "pr0@example.invalid");
  await git(repository, "config", "user.name", "Arbor PR0");
  await copyFile(join(ROLE_SOURCE, "coordinator.md"), join(repository, "coordinator.md"));
  await copyFile(join(ROLE_SOURCE, "executor.md"), join(repository, "executor.md"));
  await copyFile(join(ROLE_SOURCE, "evidence.md"), join(repository, "evidence.md"));
  await git(repository, "add", ".");
  await git(repository, "commit", "-m", "frozen role bundle");
  await git(repository, "worktree", "add", "--detach", worktree, "HEAD");
  return { coordinator: join(worktree, "coordinator.md"), executor: join(worktree, "executor.md"), reference: join(worktree, "evidence.md") };
}

async function harness(optionalEvaluator: "present" | "absent" | "catalog" = "absent", agentTimeoutMs = 120_000): Promise<Harness> {
  await mkdir(RUNTIME_ROOT, { recursive: true });
  const root = await mkdtemp(join(RUNTIME_ROOT, "run-"));
  const project = join(root, "project");
  const agentDir = join(root, "agent");
  const extensionDir = join(agentDir, "extensions");
  const nodeModules = join(agentDir, "node_modules");
  const trace = join(root, "trace.jsonl");
  await Promise.all([mkdir(join(project, ".pi"), { recursive: true }), mkdir(extensionDir, { recursive: true }), mkdir(nodeModules, { recursive: true })]);
  await symlink(FABRIC_PACKAGE, join(nodeModules, "pi-fabric"), "dir");
  await symlink(join(CURRENT_NODE_MODULES, "@earendil-works"), join(nodeModules, "@earendil-works"), "dir");
  const source = (await readFile(FIXTURE_TEMPLATE, "utf8"))
    .replace("../../src/component/definitions.js", pathToFileURL(DEFINITIONS).href)
    .replace("../../src/pr0/OwnerLocalFabricProbe.js", pathToFileURL(OWNER_PROBE).href);
  await writeFile(join(extensionDir, "pr0-owner-local.ts"), source);
  await writeFile(join(project, ".pi", "fabric.json"), `${JSON.stringify({
    configVersion: 4,
    fullCodeMode: true,
    executor: { timeoutMs: 120_000, maxTimeoutMs: 180_000 },
    approvals: { read: "allow", write: "allow", execute: "allow", network: "deny", agent: "allow" },
    agents: { enabled: true, runner: "pi", transport: "process", model: "arbor-pr0-fake/deterministic", thinking: "off", maxConcurrent: 4, maxPerExecution: 32, maxDepth: 1, timeoutMs: agentTimeoutMs, extensions: true, defaultTools: [], retainRuns: true, notifyOnComplete: false, budgetUsd: 0, maxTokensPerChild: 0, sessionExport: false },
    components: [
      ...(optionalEvaluator !== "absent" ? [{ id: "pr0-evaluator", component: "pr0-evaluator-component", config: {} }] : []),
      { id: "arbor-pr0", component: "arbor-runtime", config: { version: 1, enabled: true } },
    ],
    mesh: { enabled: true, actorScope: "project", root: join(root, "mesh") },
    schema: { mode: "off" },
    ui: { enabled: false },
  }, null, 2)}\n`);
  const snapshots = await createGitSnapshots(root);
  const roles = await createRoleWorktree(root);
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("PI_FABRIC_") || key === "PI_SESSION_ID" || key === "PI_SESSION_FILE" || key === "PI_PROVIDER" || key === "PI_MODEL" || key === "PI_REASONING_LEVEL") delete env[key];
  Object.assign(env, {
    HOME: join(root, "home"),
    PI_CODING_AGENT_DIR: agentDir,
    PI_OFFLINE: "1",
    PI_SKIP_VERSION_CHECK: "1",
    ARBOR_PR0_TRACE: trace,
    ARBOR_PR0_JOURNAL: join(root, "state", "pr0-owner-journal.json"),
    ARBOR_PR0_OPTIONAL_EVALUATOR: optionalEvaluator,
    ARBOR_PR0_COORDINATOR: roles.coordinator,
    ARBOR_PR0_EXECUTOR: roles.executor,
    ARBOR_PR0_REFERENCE: roles.reference,
    ARBOR_PR0_RUN_ID: "run-owner-local-pr0",
    ARBOR_PR0_WORKER_CWD: snapshots.worker,
    ARBOR_PR0_WORKER_OID: snapshots.workerOid,
    ARBOR_PR0_BASELINE_CWD: snapshots.baseline,
    ARBOR_PR0_BASELINE_OID: snapshots.baselineOid,
    ARBOR_PR0_CANDIDATE_CWD: snapshots.candidate,
    ARBOR_PR0_CANDIDATE_OID: snapshots.candidateOid,
    ARBOR_PR0_ALTERNATE_CWD: snapshots.alternate,
    ARBOR_PR0_ALTERNATE_OID: snapshots.alternateOid,
  });
  return { root, project, agentDir, trace, env, cleanup: () => rm(root, { recursive: true, force: true }) };
}

function runPi(value: Harness, scenario: string): PiRun {
  const child = spawn("pi", [
    "--approve",
    "--offline",
    "--no-session",
    "--no-skills",
    "--no-prompt-templates",
    "--no-themes",
    "--mode", "json",
    "--provider", "arbor-pr0-fake",
    "--model", "deterministic",
    "--thinking", "off",
    "-e", FABRIC_ENTRY,
    "-p", `ARBOR_PR0_SCENARIO:${scenario}`,
  ], { cwd: value.project, env: value.env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
  const result = new Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolveResult({ code, signal, stdout, stderr }));
  });
  return { child, result };
}

async function entries(path: string): Promise<TraceEntry[]> {
  try {
    return (await readFile(path, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as TraceEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function waitFor(path: string, predicate: (entry: TraceEntry) => boolean, timeoutMs = 30_000): Promise<TraceEntry> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = (await entries(path)).find(predicate);
    if (match) return match;
    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  throw new Error(`timed out waiting for PR0 trace event in ${path}`);
}

function assertSucceeded(result: Awaited<PiRun["result"]>): void {
  assert.equal(result.code, 0, `Pi exited ${result.code} (${result.signal ?? "no signal"})\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  assert.match(result.stdout, /ARBOR_PR0_MAIN_COMPLETE/u, `missing completion sentinel\n${result.stdout}\n${result.stderr}`);
}

const byEvent = (all: TraceEntry[], event: string): TraceEntry[] => all.filter((entry) => entry.event === event);


test("PR0 uses the real Pi/Fabric actor and worker process boundaries for proposal, owned waits, collection, and independent agent-suite grading", { timeout: 180_000 }, async () => {
  const value = await harness();
  try {
    const result = await runPi(value, "FULL").result;
    assertSucceeded(result);
    const all = await entries(value.trace);
    const captured = byEvent(all, "activation.context-captured")[0];
    const returned = byEvent(all, "activation.returned")[0];
    const firstCall = all.find((entry) => entry.event.startsWith("agents."));
    assert.ok(captured && returned && firstCall, `${result.stdout}\n${result.stderr}\n${JSON.stringify(all, null, 2)}`);
    assert.ok(returned.at <= firstCall.at, "Fabric call began before activation returned");
    assert.deepEqual(captured.data.refs, ["agents.self", "agents.members", "agents.status", "agents.create", "agents.ask", "agents.spawn", "agents.wait", "agents.stop", "agents.remove"]);

    assert.deepEqual(byEvent(all, "proposal.rejected").map((entry) => entry.data.variant), ["schema-invalid", "stale", "self-approved", "over-budget", "expected-override", "cwd-override", "oid-override"]);
    const askSettled = byEvent(all, "agents.ask.settled").find((entry) => entry.data.phase === "choose-wave");
    const workerStarts = byEvent(all, "model.worker.started").filter((entry) => String(entry.data.taskId).startsWith("wave:"));
    const waitsOwned = byEvent(all, "agents.wait.owned").filter((entry) => String(entry.data.taskId).startsWith("wave:"));
    assert.ok(askSettled);
    assert.equal(workerStarts.length, 2, `${result.stdout}\n${result.stderr}\n${JSON.stringify(all, null, 2)}`);
    assert.equal(waitsOwned.length, 2);
    assert.ok(workerStarts.every((entry) => entry.at >= askSettled.at), "worker started before proposal activation settled");
    assert.ok(waitsOwned.every((owned) => byEvent(all, "model.worker.finished").find((finished) => finished.data.taskId === owned.data.taskId)!.at >= owned.at), "wait was not owned before worker completion");
    assert.ok(byEvent(all, "actor.fresh-proposal-settled").length === 1, "fresh observations did not reach a later ask");

    const actorRuns = byEvent(all, "model.actor.activation");
    assert.ok(actorRuns.length >= 10);
    assert.ok(actorRuns.every((entry) => entry.data.systemSentinel === true && entry.data.toolNames?.includes("fabric_exec") && !entry.data.toolNames.some((name: unknown) => String(name).startsWith("arbor"))), "actor role or restricted effective tool surface was not observed");
    assert.equal(byEvent(all, "agents.create.settled")[0]?.data.scope, "project");
    const actorNativeId = byEvent(all, "agents.create.settled")[0]?.data.actorId;
    assert.ok(typeof actorNativeId === "string" && actorNativeId.length > 8 && byEvent(all, "agents.ask.settled").every((entry) => entry.data.actorId === actorNativeId), "public actor identity was not correlated across asks");
    assert.deepEqual(byEvent(all, "model.actor.forbidden-attempt").map((entry) => entry.data.kind), ["mutation", "dispatch"]);
    const actorRejections = byEvent(all, "model.actor.forbidden-rejected");
    assert.equal(actorRejections.length, 2, "actor forbidden calls did not reach real tool rejection");
    assert.match(String(actorRejections.find((entry) => entry.data.phase === "actor-mutation")?.data.toolResult), /not available|not found|unknown/iu, "unpublished child Arbor ref unexpectedly resolved");
    assert.match(String(actorRejections.find((entry) => entry.data.phase === "actor-dispatch")?.data.toolResult), /Fabric agent depth limit reached \(1\)/u, "actual agents.spawn denial was not the observed Fabric depth restriction");

    const workerRuns = byEvent(all, "model.worker.started");
    assert.ok(workerRuns.every((entry) => entry.parentRun && entry.pid !== captured.pid && entry.data.schemaSentinel === true && entry.data.toolNames?.includes("fabric_exec") && !entry.data.toolNames.some((name: unknown) => String(name).startsWith("arbor"))), "worker process/schema identity or restricted effective tool surface missing");
    assert.ok(new Set(workerRuns.map((entry) => entry.pid)).size >= 2, "workers did not cross child-process boundaries");
    assert.deepEqual(byEvent(all, "model.worker.forbidden-attempt").map((entry) => entry.data.kind).sort(), ["dispatch", "mutation"]);
    const workerRejections = byEvent(all, "model.worker.forbidden-rejected");
    assert.equal(workerRejections.length, 2, "worker forbidden calls did not reach real tool rejection");
    assert.ok(workerRejections.every((entry) => /not available|not found|not allowed|denied|unknown|depth limit/iu.test(String(entry.data.toolResult))), `worker rejection was not produced by the real restricted interface: ${JSON.stringify(workerRejections, null, 2)}`);
    const nativeSpawns = byEvent(all, "agents.spawn.settled");
    assert.ok(nativeSpawns.every((entry) => typeof entry.data.nativeId === "string" && entry.data.nativeId.length > 8 && byEvent(all, "agents.wait.settled").some((waited) => waited.data.nativeId === entry.data.nativeId && waited.data.cwd === entry.data.cwd)), "public worker handle/result identities were not correlated");
    const journal = JSON.parse(await readFile(String(value.env.ARBOR_PR0_JOURNAL), "utf8")) as Record<string, any>;
    const durableBinding = journal.runs[value.env.ARBOR_PR0_RUN_ID!];
    assert.deepEqual(durableBinding.owner, {
      id: byEvent(all, "owner.native-bound")[0]?.data.id,
      rootId: byEvent(all, "owner.native-bound")[0]?.data.rootId,
      ownerHostId: byEvent(all, "owner.native-bound")[0]?.data.ownerHostId,
      ownerIdentityId: byEvent(all, "owner.native-bound")[0]?.data.ownerIdentityId,
    });
    assert.deepEqual(durableBinding.participantProvenance.actors, [{ nativeId: actorNativeId, role: "coordinator", materialId: "material-pr0" }]);
    const durableWorkers = durableBinding.participantProvenance.workers;
    assert.deepEqual(new Set(durableWorkers.map((entry: Record<string, unknown>) => entry.nativeId)), new Set(nativeSpawns.map((entry) => entry.data.nativeId)), "journal did not contain the actual returned native worker IDs");
    assert.ok(durableWorkers.every((entry: Record<string, any>) => nativeSpawns.some((spawned) => spawned.data.nativeId === entry.nativeId && spawned.data.requestName !== entry.nativeId) && entry.snapshot?.cwd && entry.snapshot?.oid), "participant provenance used a constructed label or omitted snapshot identity");
    assert.deepEqual(durableWorkers.filter((entry: Record<string, unknown>) => entry.role === "subject").map((entry: Record<string, unknown>) => entry.evaluationId).sort(), ["baseline:t1", "baseline:t2", "candidate:t1", "candidate:t2"]);

    const suiteStarts = workerRuns.filter((entry) => /^(baseline|candidate):/u.test(entry.data.taskId));
    const counts = new Map<string, number>();
    for (const entry of suiteStarts) counts.set(entry.data.taskId, (counts.get(entry.data.taskId) ?? 0) + 1);
    assert.deepEqual(Object.fromEntries([...counts].sort()), { "baseline:t1": 1, "baseline:t2": 1, "candidate:t1": 1, "candidate:t2": 1 });
    assert.equal(byEvent(all, "evaluation.ingestion-interrupted").length, 0, "normal completion injected a fake in-object interruption");
    const graded = byEvent(all, "evaluation.graded")[0];
    assert.deepEqual({ baseline: graded?.data.baseline, candidate: graded?.data.candidate, adoption: graded?.data.adoption, baselineOid: graded?.data.baselineOid, candidateOid: graded?.data.candidateOid }, { baseline: 0, candidate: 2, adoption: "eligible-not-adopted", baselineOid: value.env.ARBOR_PR0_BASELINE_OID, candidateOid: value.env.ARBOR_PR0_CANDIDATE_OID });
    assert.ok(byEvent(all, "snapshot.verified").every((entry) => entry.data.actualOid === entry.data.expectedOid), "owner OID verification observed a mismatch");
    assert.equal(await git(String(value.env.ARBOR_PR0_BASELINE_CWD), "status", "--porcelain"), "");
    assert.equal(await git(String(value.env.ARBOR_PR0_CANDIDATE_CWD), "status", "--porcelain"), "");
    assert.equal(await git(String(value.env.ARBOR_PR0_BASELINE_CWD), "rev-parse", "HEAD"), value.env.ARBOR_PR0_BASELINE_OID);
    assert.equal(await git(String(value.env.ARBOR_PR0_CANDIDATE_CWD), "rev-parse", "HEAD"), value.env.ARBOR_PR0_CANDIDATE_OID);
    const ownerIdentity = byEvent(all, "owner.native-bound")[0];
    const correlated = byEvent(all, "participants.correlated")[0];
    assert.ok(ownerIdentity && correlated && correlated.data.participants.length === nativeSpawns.length + 1);
    assert.ok(correlated.data.participants.every((entry: Record<string, unknown>) => entry.rootId === ownerIdentity.data.rootId && entry.ownerHostId === ownerIdentity.data.ownerHostId && entry.ownerIdentityId === ownerIdentity.data.ownerIdentityId), "native actor/worker identities did not correlate to agents.self through public members");
    const cleanup = byEvent(all, "run.terminal-cleanup")[0];
    assert.deepEqual({ liveRunOwned: cleanup?.data.liveRunOwned, hostLive: cleanup?.data.hostLive }, { liveRunOwned: 0, hostLive: true }, "runComplete did not clean its actor while the owning Pi host stayed live");
    assert.equal(byEvent(all, "agents.remove.settled")[0]?.data.removed, true);
    assert.equal(byEvent(all, "model.main.dispatch").length, 1, "actor outbox or worker completion triggered Main inference");
    assert.equal(byEvent(all, "model.main.final").length, 1);
  } finally {
    await value.cleanup();
  }
});


test("PR0 reconstructs the owner and explicitly resumes a durable pre-ingestion native result without redispatch or rebinding", { timeout: 120_000 }, async () => {
  const value = await harness();
  try {
    const result = await runPi(value, "INTERRUPT").result;
    assertSucceeded(result);
    const all = await entries(value.trace);
    const interrupted = byEvent(all, "evaluation.ingestion-interrupted")[0];
    const resumed = byEvent(all, "evaluation.ingestion-resumed")[0];
    const reobserved = byEvent(all, "evaluation.native-reobserved")[0];
    assert.ok(interrupted && resumed && reobserved);
    assert.equal(interrupted.data.status, "INTERRUPTED");
    assert.equal(interrupted.data.nativeId, resumed.data.nativeId);
    assert.equal(resumed.data.nativeId, reobserved.data.nativeId);
    assert.equal(resumed.data.duplicateDispatch, false);
    assert.equal(resumed.data.reconstructedOwner, true);
    assert.equal(byEvent(all, "model.worker.started").filter((entry) => entry.data.taskId === "candidate:interrupted").length, 1, "resume dispatched a duplicate native task");
    assert.equal(byEvent(all, "agents.create.called").length, 0, "ingestion resume spawned a replacement coordinator");
    assert.ok(byEvent(all, "evaluation.terminal-duplicate").length >= 1 && byEvent(all, "evaluation.terminal-duplicate").every((entry) => entry.data.idempotent === true), "duplicate terminal observation was not idempotent");
    const rejections = byEvent(all, "evaluation.resume-rejected");
    assert.equal(rejections.length, 3, `different valid material/cwd/OID bindings were not all rejected: ${JSON.stringify({ rejections, stdout: result.stdout }, null, 2)}`);
    assert.ok(rejections.some((entry) => entry.data.materialId === "different-material"));
    assert.ok(rejections.some((entry) => entry.data.candidateCwd === value.env.ARBOR_PR0_ALTERNATE_CWD));
    assert.ok(rejections.some((entry) => entry.data.candidateOid === value.env.ARBOR_PR0_ALTERNATE_OID));
    assert.equal(byEvent(all, "owner.generation-reconciled").length, 1, "component generation changed without explicit resume reconciliation");
    const owners = byEvent(all, "owner.native-bound");
    assert.ok(owners.length >= 2 && owners.every((entry) => entry.data.id === owners[0]?.data.id && entry.data.rootId === owners[0]?.data.rootId && entry.data.ownerHostId === owners[0]?.data.ownerHostId), "reconstructed owner identity drifted");
    const journal = JSON.parse(await readFile(String(value.env.ARBOR_PR0_JOURNAL), "utf8")) as Record<string, any>;
    const binding = journal.runs[value.env.ARBOR_PR0_RUN_ID!];
    assert.deepEqual(binding.gradePolicy, { id: "exact-good-v1", expected: "GOOD" });
    assert.equal(binding.materialId, "material-pr0");
    assert.equal(binding.snapshots.candidateOid, value.env.ARBOR_PR0_CANDIDATE_OID);
    assert.equal(binding.interrupted.nativeId, interrupted.data.nativeId);
    assert.equal(binding.interrupted.ingested.nativeId, interrupted.data.nativeId);
  } finally {
    await value.cleanup();
  }
});


test("PR0 blocks recovery after genuine disposable-owner loss and preserves the native journal without redispatch", { timeout: 120_000 }, async () => {
  const value = await harness();
  try {
    const original = await runPi(value, "OWNERLOSS").result;
    assertSucceeded(original);
    const beforeEntries = await entries(value.trace);
    const originalDispatch = byEvent(beforeEntries, "model.main.dispatch").find((entry) => entry.data.scenario === "OWNERLOSS");
    const interrupted = byEvent(beforeEntries, "evaluation.ingestion-interrupted").find((entry) => entry.pid === originalDispatch?.pid);
    const originalClose = byEvent(beforeEntries, "provider.close.settled").find((entry) => entry.pid === originalDispatch?.pid);
    assert.ok(originalDispatch && interrupted && originalClose, `original disposable owner did not persist real work and exit\n${original.stdout}\n${original.stderr}`);
    const journalBefore = await readFile(String(value.env.ARBOR_PR0_JOURNAL), "utf8");
    const immutableBefore = JSON.parse(journalBefore) as Record<string, any>;
    const recordedNativeId = immutableBefore.runs[value.env.ARBOR_PR0_RUN_ID!].interrupted.nativeId;
    assert.equal(recordedNativeId, interrupted.data.nativeId, "owner-loss setup did not use the actual returned native ID");

    const recovery = await runPi(value, "OWNERLOSSAFTER").result;
    assertSucceeded(recovery);
    const all = await entries(value.trace);
    const recoveryDispatch = byEvent(all, "model.main.dispatch").find((entry) => entry.data.scenario === "OWNERLOSSAFTER");
    assert.ok(recoveryDispatch && recoveryDispatch.pid !== originalDispatch.pid && recoveryDispatch.at >= originalClose.at, "the original Pi host was not lost before recovery used a second root");
    const blocked = byEvent(all, "evaluation.owner-loss-blocked").find((entry) => entry.pid === recoveryDispatch.pid);
    assert.equal(blocked?.data.reason, `run ${value.env.ARBOR_PR0_RUN_ID} belongs to a different native owning Pi root/host identity`);
    assert.equal(blocked?.data.dispatches, 0);
    const publicEvidence = byEvent(all, "owner-loss.public-status").find((entry) => entry.pid === recoveryDispatch.pid);
    assert.equal(publicEvidence?.data.nativeId, recordedNativeId);
    assert.equal(publicEvidence?.data.memberPresent, false, "the lost owner's participant appeared in the second root's non-stale public lineage");
    assert.equal(publicEvidence?.data.publicStatus.observable, false, "the second root unexpectedly resolved the lost owner's public native handle");
    assert.match(String(publicEvidence?.data.publicStatus.error), /not found|unknown|no agent run/iu);
    assert.equal(byEvent(all, "agents.spawn.called").filter((entry) => entry.pid === recoveryDispatch.pid).length, 0, "owner-loss recovery redispatched native work");
    assert.equal(byEvent(all, "agents.create.called").filter((entry) => entry.pid === recoveryDispatch.pid).length, 0, "owner-loss recovery created a coordinator");
    assert.equal(await readFile(String(value.env.ARBOR_PR0_JOURNAL), "utf8"), journalBefore, "blocked owner-loss recovery changed the immutable durable binding/evidence");
  } finally {
    await value.cleanup();
  }
});


test("PR0 cancellation, replacement, retained generation lifetime, and passive host teardown settle only owner-local work", { timeout: 240_000 }, async () => {
  const cancellation = await harness();
  try {
    assertSucceeded(await runPi(cancellation, "CANCEL").result);
    const cancelled = await entries(cancellation.trace);
    assert.ok(byEvent(cancelled, "agents.stop.called").some((entry) => String(entry.data.id).length > 0));
    const cancelBarrier = byEvent(cancelled, "drain.barrier-entered")[0];
    assert.equal(cancelBarrier?.data.launches, 1, "cancel did not track the launch before dispatch");
    assert.equal(cancelBarrier?.data.owned, 0, "cancel barrier began only after the handle was owned");
    assert.equal(byEvent(cancelled, "fixture.spawn-result-held").length, 1, "real public spawn result was not deterministically held across cancellation");
    assert.equal(byEvent(cancelled, "agents.spawn.late-draining").length, 1, "late returned handle was not immediately stopped while draining");
    assert.equal(byEvent(cancelled, "collection.committed").length, 0, "cancelled work committed a collection");
    assert.equal(byEvent(cancelled, "cancellation.settled").at(-1)?.data.ambiguous, false, JSON.stringify({ stops: byEvent(cancelled, "agents.stop.ambiguous"), drain: byEvent(cancelled, "cleanup.stop-drain") }, null, 2));
    assert.ok(byEvent(cancelled, "agents.wait.settled").some((entry) => entry.data.status === "stopped"));
  } finally {
    await cancellation.cleanup();
  }

  const forged = await harness();
  try {
    assertSucceeded(await runPi(forged, "FORGED").result);
    const forgedEvents = await entries(forged.trace);
    assert.equal(byEvent(forgedEvents, "fixture.stop-result-forged").length, 1);
    assert.equal(byEvent(forgedEvents, "agents.stop.ambiguous").length, 1, "false late-launch stop response was accepted");
    assert.equal(byEvent(forgedEvents, "cancellation.settled").at(-1)?.data.ambiguous, true, "false late-launch stop response escaped the drain verdict");
    const forgedDrain = byEvent(forgedEvents, "cleanup.stop-drain")[0];
    assert.ok(forgedDrain);
    assert.ok(forgedDrain.data.stopResults.includes(false));
    assert.equal(forgedDrain.data.stopPromises, byEvent(forgedEvents, "agents.stop.called").length, "not every dynamically created stop promise was accounted for");
  } finally {
    await forged.cleanup();
  }

  const mesh = await harness();
  try {
    assertSucceeded(await runPi(mesh, "MESH").result);
    const meshEvents = await entries(mesh.trace);
    assert.equal(byEvent(meshEvents, "fixture.stop-result-mesh").length, 1);
    assert.equal(byEvent(meshEvents, "agents.stop.ambiguous").length, 1, "mesh acknowledgement was treated as owner-local terminal proof");
    assert.equal(byEvent(meshEvents, "cancellation.settled").at(-1)?.data.ambiguous, true);
  } finally {
    await mesh.cleanup();
  }

  for (const scenario of ["CREATECANCEL", "ASKCANCEL"] as const) {
    const held = await harness();
    try {
      assertSucceeded(await runPi(held, scenario).result);
      const events = await entries(held.trace);
      const cancellationEvent = byEvent(events, "drain.barrier-entered")[0];
      if (scenario === "CREATECANCEL") {
        assert.equal(cancellationEvent?.data.creates, 1, "create was not owned before dispatch");
        assert.equal(byEvent(events, "fixture.create-result-held").length, 1);
        assert.equal(byEvent(events, "agents.create.late-draining").length, 1);
        assert.equal(byEvent(events, "agents.ask.called").length, 0, "late actor was asked after drain began");
      } else {
        assert.equal(cancellationEvent?.data.asks, 1, "ask was not retained during drain");
        assert.equal(byEvent(events, "fixture.ask-result-held").length, 1);
        assert.equal(byEvent(events, "agents.spawn.called").length, 0, "held ask admitted a spawn after drain began");
      }
      assert.equal(byEvent(events, "cancellation.settled").at(-1)?.data.ambiguous, false);
      assert.equal(byEvent(events, "cleanup.stop-drain").at(-1)?.data.creates, 0);
      assert.equal(byEvent(events, "cleanup.stop-drain").at(-1)?.data.asks, 0);
    } finally {
      await held.cleanup();
    }
  }

  const replacement = await harness();
  try {
    assertSucceeded(await runPi(replacement, "CREATERELOAD").result);
    const replaced = await entries(replacement.trace);
    const generations = new Set(byEvent(replaced, "activation.provider-staged").map((entry) => entry.data.generation));
    assert.ok(generations.size >= 2, "component replacement did not create a new provider generation");
    const disposal = byEvent(replaced, "disposal.requested").find((entry) => entry.data.reason === "component-abort");
    assert.equal(disposal?.data.creates, 1, "reload did not observe the tracked outstanding actor creation");
    assert.equal(disposal?.data.launches, 0, "actor-create barrier unexpectedly reached spawn");
    assert.equal(disposal?.data.owned, 0);
    assert.ok(byEvent(replaced, "fixture.create-result-held").length >= 1, "reload did not cross an outstanding real actor creation");
    assert.ok(byEvent(replaced, "agents.create.late-draining").length >= 1);
    assert.equal(byEvent(replaced, "owner.generation-reconciled").length, 1, "replacement generation was rebound without explicit reconciliation");
    assert.ok(byEvent(replaced, "disposal.owned-settled").some((entry) => entry.data.ambiguous === false), "replacement did not settle real stop acknowledgements");
    const oldSettled = byEvent(replaced, "disposal.owned-settled")[0];
    const newInvocation = byEvent(replaced, "provider.invoked").at(-1);
    assert.ok(oldSettled && newInvocation && newInvocation.at >= oldSettled.at, "new generation became observable before old launch/wait/stop settlement");
    const actorIds = byEvent(replaced, "agents.create.settled").map((entry) => entry.data.actorId);
    assert.equal(actorIds.length, 2, "reload did not create a re-grounded replacement for the stopped actor");
    assert.notEqual(actorIds[0], actorIds[1]);
    assert.equal(byEvent(replaced, "collection.committed").length, 0, "stale generation committed after replacement");
  } finally {
    await replacement.cleanup();
  }

  const retained = await harness();
  try {
    assertSucceeded(await runPi(retained, "RETAIN").result);
    const retainedEvents = await entries(retained.trace);
    const settled = byEvent(retainedEvents, "retained.settled")[0];
    const closed = byEvent(retainedEvents, "storage.closed")[0];
    assert.ok(settled && closed && closed.at >= settled.at, "old-generation storage closed before retained call settlement");
    assert.equal(settled.data.storageOpen, true);
  } finally {
    await retained.cleanup();
  }

  const passive = await harness();
  try {
    const owner = runPi(passive, "FULL");
    const running = await waitFor(passive.trace, (entry) => entry.event === "model.worker.started" && String(entry.data.taskId).startsWith("wave:"));
    const observer = await runPi(passive, "PASSIVE").result;
    assertSucceeded(observer);
    const observed = await entries(passive.trace);
    const observerDispatch = observed.find((entry) => entry.event === "model.main.dispatch" && entry.data.scenario === "PASSIVE");
    const observerCancel = observed.find((entry) => entry.event === "provider.invoked" && entry.pid === observerDispatch?.pid && entry.data.name === "cancel");
    const observerRejected = observed.find((entry) => entry.event === "cancellation.rejected" && entry.pid === observerDispatch?.pid);
    assert.ok(observerCancel && observerRejected, "second root mutation attempt was not rejected at the owner binding");
    assert.equal(observerRejected.data.error, `run ${passive.env.ARBOR_PR0_RUN_ID} belongs to a different native owning Pi root/host identity`);
    for (const field of ["paused", "draining", "storageClosed", "actorId", "creates", "launches", "owned", "operations"] as const) {
      assert.deepEqual(observerRejected.data.after[field], observerRejected.data.before[field], `rejected second-root cancel changed ${field}`);
    }
    assert.equal(observerRejected.data.after.draining, false);
    assert.equal(observed.filter((entry) => entry.pid === observerDispatch?.pid && ["drain.barrier-entered", "cancellation.requested", "cancellation.settled"].includes(entry.event)).length, 0, "rejected second-root cancel emitted drain/cancellation state events");
    const passiveClose = observed.find((entry) => entry.event === "provider.close.settled" && entry.pid === observerDispatch?.pid);
    const ownerResult = await owner.result;
    assertSucceeded(ownerResult);
    const all = await entries(passive.trace);
    const ownerFinish = all.find((entry) => entry.event === "model.worker.finished" && entry.parentRun === running.parentRun && entry.data.taskId === running.data.taskId);
    assert.ok(passiveClose && ownerFinish && ownerFinish.at >= passiveClose.at, `passive host teardown stopped owner work: ${JSON.stringify({ running, observerDispatch, passiveClose, ownerFinish }, null, 2)}`);
    assert.equal(await git(String(passive.env.ARBOR_PR0_CANDIDATE_CWD), "status", "--porcelain"), "", "second-root mutation attempt changed candidate material");
  } finally {
    await passive.cleanup();
  }
});


test("PR0 pause finishes admitted work without stop and resumes the same project actor", { timeout: 120_000 }, async () => {
  const value = await harness();
  try {
    assertSucceeded(await runPi(value, "PAUSE").result);
    const all = await entries(value.trace);
    assert.equal(byEvent(all, "pause.requested").length, 1);
    assert.equal(byEvent(all, "pause.settled").at(-1)?.data.ambiguous, false);
    assert.equal(byEvent(all, "agents.stop.called").filter((entry) => entry.data.reason === "pause").length, 0, "ordinary pause stopped actor or worker");
    assert.ok(byEvent(all, "agents.wait.settled").some((entry) => entry.data.status === "completed"), "pause did not naturally finish admitted work");
    assert.equal(byEvent(all, "evaluation.builtin").length, 0, "paused generation admitted new evaluation work");

    const created = byEvent(all, "agents.create.settled").map((entry) => entry.data.actorId);
    assert.equal(created.length, 1, `ordinary resume replaced its actor: ${JSON.stringify(created)}`);
    const resumed = byEvent(all, "resume.regrounded")[0];
    assert.deepEqual(
      { actorId: resumed?.data.actorId, materialId: resumed?.data.materialId, revision: resumed?.data.revision },
      { actorId: created[0], materialId: "material-pr0", revision: 0 },
    );
    assert.equal(byEvent(all, "model.main.dispatch").length, 1, "pause/resume notifications triggered Main inference");
  } finally {
    await value.cleanup();
  }
});


test("PR0 observes real failed and configured-timeout workers through agents.wait", { timeout: 60_000 }, async () => {
  const value = await harness("absent", 1500);
  try {
    const result = await runPi(value, "TERMINALS").result;
    assertSucceeded(result);
    const all = await entries(value.trace);
    const terminal = byEvent(all, "workers.terminal-cases")[0];
    assert.deepEqual(terminal?.data.statuses, { "terminal:failed": "failed", "terminal:timed-out": "timed_out" });
    assert.equal(terminal?.data.allInvalid, true);
    const waits = byEvent(all, "agents.wait.settled").filter((entry) => String(entry.data.taskId).startsWith("terminal:"));
    assert.deepEqual(waits.map((entry) => entry.data.status).sort(), ["failed", "timed_out"]);
    assert.ok(byEvent(all, "model.worker.aborted").some((entry) => entry.data.taskId === "terminal:timed-out"), "configured timeout did not abort the real fake-provider worker");
  } finally {
    await value.cleanup();
  }
});


test("PR0 blocks missing roles before spawn and keeps optional evaluator binding independent from the built-in path", { timeout: 120_000 }, async () => {
  const missing = await harness();
  try {
    const result = await runPi(missing, "MISSING").result;
    assertSucceeded(result);
    const all = await entries(missing.trace);
    assert.equal(byEvent(all, "agents.spawn.called").length, 0);
    const blockedRoles = byEvent(all, "phase.role-file-blocked");
    assert.deepEqual(blockedRoles.map((entry) => entry.data.kind), ["coordinator", "executor", "reference"]);
    assert.ok(blockedRoles.every((entry) => entry.data.phase === "built-in-evaluation" && /ENOENT/iu.test(String(entry.data.error))), "a missing mandatory bootstrap/phase file did not block before spawn");
    assert.match(result.stdout, /blocked/u, "missing mandatory role files did not return blocked results");
  } finally {
    await missing.cleanup();
  }

  const oidMismatch = await harness();
  try {
    const result = await runPi(oidMismatch, "OIDMISMATCH").result;
    assertSucceeded(result);
    const all = await entries(oidMismatch.trace);
    assert.equal(byEvent(all, "agents.spawn.called").length, 0, "OID mismatch reached dispatch");
    assert.equal(byEvent(all, "snapshot.verified").some((entry) => entry.data.actualOid !== entry.data.expectedOid), false, "mismatched OID was recorded as verified");
    assert.match(result.stdout, /OID mismatch/u);
  } finally {
    await oidMismatch.cleanup();
  }

  for (const mode of ["absent", "present"] as const) {
    const value = await harness(mode);
    try {
      const result = await runPi(value, "OPTIONAL").result;
      assertSucceeded(result);
      const all = await entries(value.trace);
      assert.equal(byEvent(all, "evaluation.builtin").length, 1, `built-in evaluator failed with optional provider ${mode}`);
      assert.equal(byEvent(all, "agents.spawn.settled").filter((entry) => String(entry.data.taskId).startsWith("builtin:")).length, 1, "built-in evaluator bypassed the public Fabric execution path");
      assert.equal(byEvent(all, "evaluation.optional.invoked").length, mode === "present" ? 1 : 0, `${mode} optional evaluator mismatch\n${result.stdout}\n${result.stderr}\n${JSON.stringify(all, null, 2)}`);
      const staged = byEvent(all, "activation.provider-staged")[0];
      assert.ok(staged, `component did not activate with optional provider ${mode}`);
    } finally {
      await value.cleanup();
    }
  }
});


test("PR0 rebinds the definition-time optional catalog while two built-in Fabric evaluations overlap", { timeout: 120_000 }, async () => {
  const value = await harness("catalog");
  try {
    const result = await runPi(value, "CATALOG").result;
    assertSucceeded(result);
    const all = await entries(value.trace);
    const overlappingIds = new Set(["builtin:catalog-run-a", "builtin:catalog-run-b"]);
    const starts = byEvent(all, "model.worker.started").filter((entry) => overlappingIds.has(String(entry.data.taskId)));
    const terminals = [...byEvent(all, "model.worker.finished"), ...byEvent(all, "model.worker.aborted")].filter((entry) => overlappingIds.has(String(entry.data.taskId)));
    assert.equal(starts.length, 2, `two built-in runs did not use real Fabric workers\n${result.stdout}\n${result.stderr}\n${JSON.stringify(all, null, 2)}`);
    assert.ok(starts.every((start) => terminals.some((terminal) => terminal.data.taskId === start.data.taskId && terminal.at >= start.at)));
    assert.ok(Math.max(...starts.map((entry) => entry.at)) < Math.min(...terminals.map((entry) => entry.at)), "built-in evaluation runs did not overlap");
    const replacement = byEvent(all, "catalog.definition-replaced")[0];
    assert.ok(replacement && replacement.data.beforeRequires === 9 && replacement.data.afterRequires === 10, "catalog definition was not replaced with the optional binding");
    assert.ok(new Set(byEvent(all, "activation.provider-staged").map((entry) => entry.data.generation)).size >= 2, "catalog replacement did not rebind the managed component");
    assert.equal(byEvent(all, "evaluation.optional.invoked").length, 1, "rebound optional provider was not called");
    assert.equal(byEvent(all, "evaluation.builtin").filter((entry) => entry.data.runId === "catalog-run-after").length, 1, "built-in path did not reactivate after catalog maintenance");
    assert.equal(byEvent(all, "model.main.catalog-followup").length, 1, "catalog was not observed through a fresh post-rebind Fabric invocation");
    assert.equal(byEvent(all, "model.main.dispatch").length, 1);
  } finally {
    await value.cleanup();
  }
});
