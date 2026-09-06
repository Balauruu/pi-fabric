import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { ResearchStore } from "../../src/research/ResearchStore.js";
import { ResearchService } from "../../src/research/ResearchService.js";
import { BindingStore } from "../../src/managed/BindingStore.js";
import { OwnerExecution } from "../../src/managed/OwnerExecution.js";
import { EvaluationEngine } from "../../src/evaluators/EvaluationEngine.js";
import { EvaluatorCatalog } from "../../src/evaluators/catalog.js";
import { acceptance } from "../../src/material/acceptance.js";
import { gitText } from "../../src/material/Workspace.js";
const identity = { id: "root", rootId: "root", ownerHostId: "host", ownerIdentityId: "identity", sessionId: "session" };
async function fixture(t: test.TestContext, options: { failedMetric?: boolean; review?: boolean; command?: boolean; links?: boolean; loss?: boolean; repeats?: number; tasks?: number; threshold?: string } = {}) {
  const base = resolve(".runtime/pr5-journey"); await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, "case-")), cwd = join(root, "source"), state = join(root, "state"), profile = join(root, "profile"); await mkdir(cwd); await mkdir(profile);
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-b", "main"); git("config", "user.name", "PR5"); git("config", "user.email", "pr5@example.invalid");
  await writeFile(join(cwd, "prompt"), "source committed"); await writeFile(join(cwd, "check"), "fixed"); await writeFile(join(cwd, "other"), "base"); git("add", "."); git("commit", "-m", "source"); await writeFile(join(cwd, "prompt"), "user staged"); git("add", "prompt"); await writeFile(join(cwd, "prompt"), "BASELINE_SNAPSHOT_BAD");
  if (options.links) { await symlink(".", join(cwd, "a")); await symlink("a/../outside", join(cwd, "escape")); git("add", "a", "escape"); }
  const definition = { version: 1, kind: options.command ? "command" : "agent-suite", baseline: { root: cwd, oid: "capture", files: ["prompt", "check"] }, candidate: { root: cwd, oid: "capture", files: ["prompt", "check"] }, tasks: Array.from({ length: options.tasks ?? 1 }, (_, n) => ({ id: `t${n + 1}`, prompt: `fixed task ${n + 1}`, expected: "GOOD" })), repeats: options.repeats ?? 1, retries: 0, deadlineMs: 15000, analysis: "paired-descriptive", order: "task-baseline-candidate", subject: { model: "fake/subject", tools: [], promptFiles: ["prompt"] }, judge: null, command: options.command ? { argv: [process.execPath, "-e", `const fs=require('fs');const good=fs.readFileSync('prompt','utf8').includes('GOOD');console.log('ARBOR_METRIC '+(1+(good?1:0)+(fs.readFileSync('other','utf8')==='GOOD'?1:0))+' points');${options.failedMetric ? "if(good)process.exit(3);" : ""}`], checks: [], unit: "points" } : null, providerAction: null };
  await writeFile(join(root, "definition.json"), JSON.stringify(definition));
  const store = new ResearchStore(join(state, "research.sqlite3")), bindings = new BindingStore(join(state, "bindings.sqlite3")), native = new Map<string, any>(); let count = 0;
  const call = async (ref: string, args: any = {}) => {
    if (ref === "agents.self") return { ...identity, kind: "root", local: true, stale: false };
    if (ref === "schema.status") return { mode: "off" };
    if (ref === "agents.spawn") {
      const id = `native-${++count}`;
      if (args.task.includes("bounded material worker")) {
        if (args.task.includes("WRITE OTHER")) await writeFile(join(args.cwd, "other"), "GOOD");
        else await writeFile(join(args.cwd, "prompt"), args.task.includes("WRITE BAD") ? "BASELINE_SNAPSHOT_BAD" : "CANDIDATE_SNAPSHOT_GOOD");
        execFileSync("git", ["add", "."], { cwd: args.cwd }); execFileSync("git", ["-c", "user.name=worker", "-c", "user.email=worker@example.invalid", "commit", "--allow-empty", "-m", "worker"], { cwd: args.cwd, stdio: "ignore" });
      }
      const text = args.task.includes("CANDIDATE_SNAPSHOT_GOOD") || (options.tasks && args.task.includes("fixed task 1")) || (options.repeats && [...native.values()].filter(n => n.cwd === args.cwd).length % (2 * options.repeats) === 0) ? "GOOD" : "BAD";
      const n = { id, cwd: args.cwd, model: args.model, runner: "pi", transport: "process", status: "completed", text }; native.set(id, n); if (options.loss && !args.task.includes("bounded material worker")) throw new Error("accepted evaluator spawn reply lost"); return n;
    }
    if (ref === "agents.wait" || ref === "agents.status" || ref === "agents.stop") return native.get(args.id);
    if (ref === "agents.members") return [...native.values()].map(n => ({ ...n, ...identity, id: n.id, kind: "agent", local: true, stale: false }));
    throw new Error(`Unexpected public ref ${ref}`);
  };
  const owner = new OwnerExecution(call, bindings, "arbor.owner", "g1", store), catalog = new EvaluatorCatalog([], { id: "view", digest: "view", semanticDigest: "view", bindings: {} }, async () => { throw new Error("No provider"); });
  const evaluator = new EvaluationEngine(owner, store, state, catalog), service = new ResearchService(owner, store, state, profile, evaluator);
  const context = { cwd, extensionContext: { sessionManager: { getSessionId: () => "session" }, isProjectTrusted: () => true, model: { provider: "fake", id: "worker" }, modelRegistry: { getAvailable: () => [{ provider: "fake", id: "worker" }, { provider: "fake", id: "subject" }] }, hasUI: true, ui: { select: async () => "Approve research choice" } } } as unknown as FabricInvocationContext;
  const invoke = async (name: string, payload: any, commandId = `${name}-${count}-${store.get("run")?.revision}`) => service.invoke(name, { ...store.binding(store.get("run")!, commandId), ...(name === "review" ? { decisionId: payload } : name === "export" ? { format: "json" } : name === "control" ? { action: payload } : { payload }) }, context) as Promise<any>;
  t.after(() => service.close());
  const before = await readFile(join(cwd, ".git/index")), refs = git("show-ref");
  await service.invoke("start", { runId: "run", overrides: { execution: "material", material: { mutablePaths: ["prompt", "other"], evaluationInputs: ["check"] }, objective: { unit: "points", ...(options.threshold ? { minimumGain: options.threshold, gainKind: "absolute" } : {}) }, evaluator: { kind: definition.kind, definition: join(root, "definition.json") }, roleTools: { executor: ["read", "write", "bash"] }, search: { mode: options.review ? "review" : "auto" } } }, context);
  if (options.command) await invoke("evaluate", { attemptId: "baseline", evaluationId: "initial" });
  const candidate = async (id: string, task = "WRITE GOOD") => { await invoke("propose", { nodeId: id, type: "hypothesis", parentId: null, title: id, rationale: task, sourceRefs: [] }); await invoke("dispatch", { nodeId: id, attemptId: id }); await invoke("evaluate", { attemptId: id, evaluationId: `eval-${id}` }); };
  const keep = (id: string) => invoke("decide", { decisionId: `keep-${id}`, nodeId: id, decision: "keep", evidenceIds: [`eval-${id}`] });
  return { native, root, cwd, state, store, service, owner, evaluator, invoke, candidate, keep, before, refs, git, context };
}
test("PR5 product refuses transitive escaping baseline before evaluator dispatch", async t => {
  await assert.rejects(fixture(t, { links: true }), /symlink.*escapes/);
});
test("PR5 product exact task and repeat means do not round a below-threshold gain into eligibility", async t => {
  for (const repeat of [false, true]) for (const threshold of ["0.666666666", "0.666666667"]) {
    const f = await fixture(t, { ...(repeat ? { repeats: 3 } : { tasks: 3 }), threshold }); await f.candidate("one");
    const e = f.store.evaluation("run", "eval-one")!;
    assert.deepEqual(e.invocations.filter(i => i.condition === "baseline").map(i => i.score), ["1", "0", "0"]);
    assert.deepEqual(e.invocations.filter(i => i.condition === "candidate").map(i => i.score), ["1", "1", "1"]);
    assert.equal((await f.keep("one")).status, threshold.endsWith("7") ? "blocked" : "applied");
  }
});
test("PR5 unrounded acceptance preserves exact equality, relative thresholds, sub-nanounit repeats and mixed task directions", async t => {
  const f = await fixture(t); await f.candidate("one");
  const { digest } = await import("../../src/research/contracts.js");
  const check = (baseline: string[][], candidate: string[][], threshold: string, kind = "absolute", direction = "maximize") => {
    const run = structuredClone(f.store.get("run")!), e = structuredClone(f.store.evaluation("run", "eval-one")!);
    Object.assign(run.spec.config.objective, { minimumGain: threshold, gainKind: kind, direction });
    e.definition.tasks = baseline.map((_, n) => ({ id: `t${n}`, prompt: "exact arithmetic", expected: "GOOD" })); e.definition.repeats = baseline[0]!.length;
    run.spec.evaluation!.tasks = e.definition.tasks; run.spec.evaluation!.repeats = e.definition.repeats;
    const prior = e.invocations;
    e.invocations = baseline.flatMap((values, task) => values.flatMap((_, repeat) => (["baseline", "candidate"] as const).map(condition => ({ ...structuredClone(prior.find(i => i.condition === condition)!), id: `${condition}-${task}-${repeat}`, taskId: `t${task}`, repeat, score: (condition === "baseline" ? baseline : candidate)[task]![repeat]! }))));
    e.definitionId = digest(e.definition); const { identity: _id, ...body } = run.spec; run.spec.identity = digest(body); e.specId = run.spec.identity;
    return acceptance(run, e, e.snapshots.candidate.oid);
  };
  for (const threshold of ["0.499999999", "0.5", "0.500000001"]) assert.equal(check([["1"], ["0"]], [["1"], ["1"]], threshold), threshold === "0.500000001" ? "below-practical-threshold" : "eligible");
  for (const threshold of ["1.999999999", "2", "2.000000001"]) assert.equal(check([["1", "0", "0"]], [["1", "1", "1"]], threshold, "relative"), threshold === "2.000000001" ? "below-practical-threshold" : "eligible");
  assert.equal(check([["0.000000001", "0", "0"]], [["0.000000001", "0.000000001", "0.000000001"]], "0.000000001"), "below-practical-threshold");
  assert.equal(check([["0.000000001", "0.000000001", "0"], ["0", "0", "0"]], [["0.000000001", "0", "0"], ["1", "1", "1"]], "0"), "inconclusive-mixed-paired-tasks");
  assert.equal(check([["-1", "0", "0"]], [["-1", "-1", "-1"]], "2", "relative", "minimize"), "eligible");
});

test("PR5 material cancellation retains unresolved evaluator launch and snapshots", async t => {
  const f = await fixture(t, { loss: true }); await f.invoke("control", "cancel");
  const e = f.store.evaluations("run")[0]!; assert.equal(e.invocations[0]!.state, "launching"); assert.equal(e.invocations[0]!.nativeId, null); assert.equal(f.native.size, 1);
  assert.equal(f.store.get("run")!.state, "cleanup_pending"); assert.equal(await readFile(join(e.snapshots.baseline.directory, "prompt"), "utf8"), "BASELINE_SNAPSHOT_BAD");
  const retained = f.store.projection("run"); await assert.rejects(f.invoke("control", "pause"), /Unresolved material/); assert.deepEqual(f.store.projection("run"), retained);
  await assert.rejects(f.invoke("control", "resume"), /[Uu]nknown|[Uu]nobservable/); assert.equal(f.native.size, 1);
});
test("PR5 completed baseline pause/resume becomes dispatchable without evaluator recharge", async t => {
  const f = await fixture(t); const calls = f.store.evaluations("run")[0]!.invocations.length;
  await f.invoke("control", "pause"); assert.equal((await f.invoke("control", "resume")).status, "applied"); assert.equal(f.store.get("run")!.state, "ready");
  assert.equal(f.store.evaluations("run")[0]!.invocations.length, calls); await f.candidate("one");
});
test("PR5 quiescent material resume does not bypass pending review or command execute policy", async t => {
  const f = await fixture(t, { review: true }); await f.invoke("propose", { nodeId: "one", type: "hypothesis", parentId: null, title: "one", rationale: "WRITE GOOD", sourceRefs: [] });
  await f.invoke("decide", { decisionId: "review-one", nodeId: "one", decision: "request_review", evidenceIds: [] });
  await assert.rejects(f.invoke("control", "resume"), /review/); assert.equal(f.store.get("run")!.state, "awaiting_review");
  const c = await fixture(t, { command: true }); await c.invoke("control", "pause"); assert.equal((await c.invoke("control", "resume")).status, "blocked"); assert.equal(c.store.get("run")!.state, "paused");
  const { commandProgram, researchCommand } = await import("../../src/research/commands.js");
  const request = researchCommand("resume", "run"); const program = commandProgram(request);
  const result = await new Function("tools", `return (async()=>{${program}})()` )({ call: ({ ref, args }: any) => c.service.invoke(ref.slice(6), args, c.context) });
  assert.equal(result.status, "applied"); assert.equal(c.store.get("run")!.state, "ready"); await c.candidate("one");
});
test("PR5 terminal material cancellation cannot report resumed or reopen through pause", async t => {
  for (const command of [false, true]) {
    const f = await fixture(t, { command }); await f.invoke("control", "cancel");
    const before = f.store.projection("run"), count = f.native.size;
    const resume = () => command ? f.invoke("evaluate", { attemptId: "exact-material", evaluationId: "initial", resume: true }) : f.invoke("control", "resume");
    await assert.rejects(resume(), /[Tt]erminal material/);
    await assert.rejects(f.invoke("control", "pause"), /[Tt]erminal material/);
    assert.deepEqual(f.store.projection("run"), before); assert.equal(f.native.size, count);
  }
});
test("PR5 adjacent immutable resume and pending CAS controls fail without rebasing or new execution", async t => {
  const f = await fixture(t); await f.candidate("one"); await f.invoke("control", "pause");
  const paused = f.store.get("run")!, count = f.native.size;
  for (const patch of [{ revision: paused.revision - 1 }, { epoch: "stale" }, { materialId: "stale" }]) {
    await assert.rejects(f.service.invoke("control", { ...f.store.binding(paused, "stale-resume"), ...patch, action: "resume" }, f.context), /Stale/);
  }
  assert.deepEqual(f.store.get("run"), paused); assert.equal(f.native.size, count);
  await f.invoke("control", "resume");
  const r = f.store.get("run")!, payload = { decisionId: "pending", nodeId: "one", decision: "keep", evidenceIds: ["eval-one"] };
  f.store.prepareIntegration(f.store.binding(r, "pending-keep"), f.owner.generation, payload);
  const pending = f.store.get("run")!;
  await assert.rejects(f.invoke("control", "resume"), /integration/);
  await assert.rejects(f.invoke("control", "pause"), /integration/);
  assert.deepEqual(f.store.get("run"), pending); assert.equal(f.native.size, count);
});
test("PR5 legal baseline and exact-material attempt IDs evaluate their actual frozen candidates", async t => {
  for (const id of ["baseline", "exact-material"]) {
    const f = await fixture(t); await f.candidate(id); const e = f.store.evaluation("run", `eval-${id}`)!;
    assert.equal(e.snapshots.candidate.oid, f.store.get("run")!.material!.candidates.find(c => c.id === id)!.oid);
    assert.deepEqual(e.invocations.map(i => i.score), ["0", "1"]); assert.equal((await f.keep(id)).status, "applied");
  }
});

test("PR5 production owner native worker -> frozen candidate -> actual evaluator -> transactional keep/export never mutates original", async t => {
  const f = await fixture(t); const baseline = f.store.get("run")!.material!.incumbent;
  await f.candidate("one"); assert.equal((await f.keep("one")).status, "applied");
  const m = f.store.get("run")!.material!; assert.notEqual(m.incumbent, baseline); assert.equal(gitText(m.capture.repository, ["rev-parse", "refs/arbor/incumbent"]).trim(), m.incumbent);
  const exported = await f.invoke("export", {}); const body = JSON.parse(await readFile(exported.value.path, "utf8")); assert.match(body.materialDelta.patch, /BASELINE_SNAPSHOT_BAD/); assert.doesNotMatch(body.materialDelta.patch, /user staged|source committed/);
  await f.candidate("tie"); const tie = await f.keep("tie"); assert.equal(tie.status, "blocked"); assert.equal(tie.reason, "no-gain");
  await f.invoke("decide", { decisionId: "discard-tie", nodeId: "tie", decision: "discard", evidenceIds: [] }); await f.invoke("control", "cancel");
  assert.deepEqual(await readFile(join(f.cwd, ".git/index")), f.before); assert.equal(f.git("show-ref"), f.refs); assert.equal(await readFile(join(f.cwd, "prompt"), "utf8"), "BASELINE_SNAPSHOT_BAD");
});
test("PR5 direct parsed metric before failed native exit never wins even with forged validity/analysis flags", async t => {
  const f = await fixture(t, { command: true, failedMetric: true }); await f.candidate("bad"); const e = f.store.evaluation("run", "eval-bad")!;
  assert.equal(e.validity, "invalid"); assert.equal(e.invocations.at(-1)!.native!.exitCode, 3); assert.equal((await f.keep("bad")).status, "blocked");
  e.validity = "valid"; e.quality.passed = true; e.invocations.at(-1)!.valid = true; e.invocations.at(-1)!.score = "2";
  assert.equal(acceptance(f.store.get("run")!, e, e.snapshots.candidate.oid), "invalid-native-execution");
});
test("PR5 exact owning-Pi review required for measured promotion; boolean or unrelated choice cannot approve", async t => {
  const f = await fixture(t, { review: true }); await f.candidate("one"); assert.equal((await f.keep("one")).status, "blocked");
  await f.invoke("decide", { decisionId: "review-one", nodeId: "one", decision: "request_review", evidenceIds: ["eval-one"] }); await f.invoke("review", "review-one");
  assert.equal((await f.keep("one")).status, "applied");
});

test("PR5 current-incumbent change blocks old score; combined material travels through actual command reevaluation", async t => {
  const f = await fixture(t, { command: true }); await f.candidate("one"); await f.candidate("two", "WRITE OTHER");
  const old = f.store.evaluation("run", "eval-two")!; assert.equal((await f.keep("one")).status, "applied");
  assert.match((await f.keep("two")).reason, /stale-incumbent/);
  await f.invoke("evaluate", { attemptId: "two", evaluationId: "combined-two" });
  const combined = f.store.evaluation("run", "combined-two")!; assert.notEqual(combined.snapshots.candidate.oid, old.snapshots.candidate.oid);
  assert.deepEqual(combined.invocations.map(i => i.score), ["2", "3"]);
  const kept = await f.invoke("decide", { decisionId: "keep-combined", nodeId: "two", decision: "keep", evidenceIds: ["combined-two"] }); assert.equal(kept.status, "applied");
});
test("PR5 Git CAS before database completion retains durable intent and exact replay completes once", async t => {
  const f = await fixture(t); await f.candidate("one"); const run = f.store.get("run")!;
  const args = { ...f.store.binding(run, "crash-keep"), payload: { decisionId: "crash-decision", nodeId: "one", decision: "keep", evidenceIds: ["eval-one"] } };
  const complete = f.store.completeIntegration.bind(f.store); f.store.completeIntegration = () => { throw new Error("injected after Git CAS"); };
  await assert.rejects(f.service.invoke("decide", args, f.context), /injected after Git CAS/);
  const reopened = new ResearchStore(join(f.state, "research.sqlite3")); const pending = reopened.get("run")!.material!; reopened.close();
  assert.equal(pending.incumbent, pending.pending!.expected); assert.equal(gitText(pending.capture.repository, ["rev-parse", "refs/arbor/incumbent"]).trim(), pending.pending!.target);
  f.store.completeIntegration = complete;
  const result = await f.service.invoke("decide", args, f.context); assert.equal((result as any).status, "applied"); assert.deepEqual(await f.service.invoke("decide", args, f.context), result);
  assert.equal(f.store.get("run")!.material!.pending, null);
});
test("PR5 exact candidate, epoch, spec and protected input drift cannot become a keep", async t => {
  const f = await fixture(t); await f.candidate("one"); const run = f.store.get("run")!, e = f.store.evaluation("run", "eval-one")!;
  assert.notEqual(acceptance({ ...run, epoch: "wrong" }, e, e.snapshots.candidate.oid), "eligible");
  assert.notEqual(acceptance(run, { ...e, specId: "wrong" }, e.snapshots.candidate.oid), "eligible");
  assert.notEqual(acceptance(run, e, run.material!.capture.baseline), "eligible");
  await writeFile(join(e.snapshots.candidate.directory, "check"), "poison"); await assert.rejects(f.keep("one"), /Exact evaluation material changed/);
});
test("PR5 descriptive command noise oracle is inconclusive and cannot be overridden by larger scalar claims", async t => {
  const f = await fixture(t, { command: true }); await f.candidate("one"); const run = f.store.get("run")!, e = f.store.evaluation("run", "eval-one")!;
  // Fixed repeats are part of the specification, not a caller analysis override.
  e.definition.repeats = 3; run.spec.evaluation!.repeats = 3;
  const { digest } = await import("../../src/research/contracts.js"); e.definitionId = digest(e.definition); const { identity: _identity, ...body } = run.spec; run.spec.identity = digest(body); e.specId = run.spec.identity;
  e.invocations = e.invocations.flatMap(i => [i, { ...structuredClone(i), id: i.id + "-2", repeat: 1 }, { ...structuredClone(i), id: i.id + "-3", repeat: 2 }]);
  const last = e.invocations.at(-1)!; last.score = "4"; last.native!.text = "ARBOR_METRIC 4 points\n";
  assert.equal(acceptance(run, e, e.snapshots.candidate.oid), "inconclusive-noise-recheck-required");
});
