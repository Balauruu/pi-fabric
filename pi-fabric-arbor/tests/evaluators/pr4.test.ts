import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile, readFile, chmod, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { ResearchStore } from "../../src/research/ResearchStore.js";
import { BindingStore } from "../../src/managed/BindingStore.js";
import { OwnerExecution } from "../../src/managed/OwnerExecution.js";
import { EvaluationEngine } from "../../src/evaluators/EvaluationEngine.js";
import { EvaluatorCatalog, providerOutputSchema, providerInputSchema } from "../../src/evaluators/catalog.js";
import { analyze, commandRun, parseMetric } from "../../src/evaluators/measurement.js";
import { validateDefinition, nativeSuccess, type EvaluationDefinition } from "../../src/evaluators/contracts.js";
import { resolveSpec } from "../../src/research/spec.js";
import { canonical, digest, validate, PROJECTION_SCHEMA } from "../../src/research/contracts.js";
import { freezeMaterial, subjectBootstrap, verifyMaterial } from "../../src/evaluators/material.js";
const identity = { id: "root", rootId: "root", ownerHostId: "host", ownerIdentityId: "owner", sessionId: "session" };
export async function materialFixture() {
  const base = resolve(".runtime/pr4-unit"); await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, "case-")), source = join(root, "source"); await mkdir(source);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: source, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.name", "fixture"); git("config", "user.email", "fixture@example.invalid");
  await writeFile(join(source, "coordinator.md"), "BASELINE_SNAPSHOT_BAD"); git("add", "."); git("commit", "-m", "baseline"); const baseline = git("rev-parse", "HEAD");
  await writeFile(join(source, "coordinator.md"), "CANDIDATE_SNAPSHOT_GOOD"); git("commit", "-am", "candidate"); const candidate = git("rev-parse", "HEAD");
  const definition: EvaluationDefinition = { version: 1, kind: "agent-suite", baseline: { root: source, oid: baseline, files: ["coordinator.md"] }, candidate: { root: source, oid: candidate, files: ["coordinator.md"] }, tasks: [{ id: "t1", prompt: "Fixed task one", expected: "GOOD" }, { id: "t2", prompt: "Fixed task two", expected: "GOOD" }], repeats: 1, retries: 0, deadlineMs: 30000, analysis: "paired-descriptive", order: "task-baseline-candidate", subject: { model: "fake/subject", tools: [], promptFiles: ["coordinator.md"] }, judge: null, command: null, providerAction: null };
  return { root, source, git, definition };
}
async function engineFixture(t: test.TestContext, options: { limit?: number; fail?: string; judge?: boolean; interrupt?: boolean; retries?: number; veto?: boolean; repeats?: number; poison?: (ref: string, args: any, native: Map<string, any>, requests: any[]) => void } = {}) {
  const f = await materialFixture(); f.definition.retries = options.retries ?? 0; f.definition.repeats = options.repeats ?? 1; if (options.judge) f.definition.judge = { model: "fake/judge", instructions: "Judge exact correctness" };
  await writeFile(join(f.root, "definition.json"), JSON.stringify(f.definition));
  const spec = await resolveSpec(f.source, {}, {}, { execution: "evaluate", evaluator: { kind: "agent-suite", definition: join(f.root, "definition.json") }, limits: { evaluatorCalls: options.limit ?? 20 }, ...(options.veto ? { objective: { qualityVetoes: ["all-tasks-correct"] } } : {}) }, "fake/coordinator");
  const store = new ResearchStore(join(f.root, "state/research.sqlite3")), bindings = new BindingStore(join(f.root, "state/bindings.sqlite3"));
  store.create({ id: "run", spec, requestHash: "request", owner: identity, componentId: "arbor.owner", generation: "g1", epoch: "epoch-1", revision: 0, state: "ready", attemptsUsed: 0, active: 0, createdAt: 1, activeMs: 0, activeSince: null, steering: [], pendingDecisionId: null, execution: "not-started", error: null });
  let launches = 0; const requests: any[] = [], calls: string[] = [], native = new Map<string, any>(); const abort = new AbortController();
  const call = async (ref: string, args: any = {}) => {
    calls.push(ref);
    if (ref === "agents.spawn") { launches++; requests.push(args); const id = `native-${launches}`; const text = args.task.includes("evaluation judge") ? "PASS" : args.task.includes("CANDIDATE_SNAPSHOT_GOOD") ? "GOOD" : "BAD";
      native.set(id, { id, cwd: args.cwd, model: args.model, runner: "pi", transport: "process", status: options.fail ?? "completed", text, ...(options.fail === "error" ? { status: "completed", error: "model failed" } : {}), ...(options.fail === "exit" ? { status: "completed", exitCode: 2 } : {}) }); options.poison?.(ref, args, native, requests); return native.get(id); }
    if (ref === "agents.wait" || ref === "agents.status") { const r = native.get(args.id); if (!r) throw new Error("Unknown native handle"); if (options.interrupt && ref === "agents.wait") abort.abort(); options.poison?.(ref, args, native, requests); return r; }
    if (ref === "agents.members") return [...native.values()].map(r => ({ ...r, ...identity, id: r.id, kind: "agent", local: true, stale: false }));
    if (ref === "agents.stop") return native.get(args.id);
    throw new Error(`Unexpected ${ref}`);
  };
  const owner = new OwnerExecution(call, bindings, "arbor.owner", "g1", store);
  const catalog = new EvaluatorCatalog([], { id: "view", digest: "view", semanticDigest: "view", bindings: {} }, async () => { throw new Error("No provider expected"); });
  const engine = new EvaluationEngine(owner, store, join(f.root, "state"), catalog);
  t.after(async () => { await engine.dispose(); store.close(); bindings.close(); });
  return { ...f, engine, store, owner, requests, calls, native, call, catalog, abort, launches: () => launches };
}
test("PR4 exact Git seam preserves dirty source/index and explicitly loads candidate bytes", async () => {
  const f = await materialFixture(); await writeFile(join(f.source, "coordinator.md"), "USER DIRTY"); const index = f.git("diff", "--cached");
  const b = await freezeMaterial(f.definition.baseline, join(f.root, "snapshots")), c = await freezeMaterial(f.definition.candidate, join(f.root, "snapshots"));
  assert.notEqual(b.id, c.id); assert.match(subjectBootstrap(c, ["coordinator.md"], "task"), /CANDIDATE_SNAPSHOT_GOOD/); assert.doesNotMatch(subjectBootstrap(b, ["coordinator.md"], "task"), /USER DIRTY/);
  assert.equal(await readFile(join(f.source, "coordinator.md"), "utf8"), "USER DIRTY"); assert.equal(f.git("diff", "--cached"), index);
  await writeFile(join(c.directory, "coordinator.md"), "tampered"); await assert.rejects(verifyMaterial(c), /changed/);
});
test("PR4 independent native tasks, exact pairing/oracle, distinct subject role and duplicate evaluation", async t => {
  const f = await engineFixture(t); const e = await f.engine.evaluate("run", "initial");
  assert.equal(e.state, "completed"); assert.equal(e.validity, "valid"); assert.equal(e.incumbentDecision, "not-evaluated-PR5");
  assert.deepEqual(e.invocations.map(i => [i.taskId, i.condition, i.score]), [["t1", "baseline", "0"], ["t1", "candidate", "1"], ["t2", "baseline", "0"], ["t2", "candidate", "1"]]);
  assert.deepEqual(e.analysis!.tasks, [{ taskId: "t1", baseline: "0", candidate: "1", delta: "1", failures: 0 }, { taskId: "t2", baseline: "0", candidate: "1", delta: "1", failures: 0 }]);
  assert.deepEqual(e.analysis!.range, ["1", "1"]); assert.equal(e.analysis!.wins, 2); assert.match(e.analysis!.interpretation, /not a confidence/);
  assert.ok(f.requests.every(r => r.model === "fake/subject" && r.extensions === false && r.recursive === false && r.tools.length === 0));
  assert.equal((await f.engine.evaluate("run", "initial")).invocations.length, 4); await assert.rejects(f.engine.evaluate("run", "initial", undefined, "feedback"), /Conflicting.*purpose/); assert.equal(f.launches(), 4);
  validate(PROJECTION_SCHEMA, f.store.projection("run"));
  assert.equal(analyze(e, "minimize")!.losses, 2);
});
for (const fail of ["failed", "stopped", "timed_out", "error", "exit"]) test(`PR4 native ${fail} cannot score; failures remain paired`, async t => {
  const f = await engineFixture(t, { fail }); const e = await f.engine.evaluate("run", "initial");
  assert.equal(e.validity, "invalid"); assert.ok(e.invocations.every(i => i.score === null && !i.valid)); assert.equal(e.analysis!.failures, 4); assert.equal(e.analysis!.tasks.length, 2);
});
test("PR4 charged judges, feedback, rechecks and capacity reservations", async t => {
  const f = await engineFixture(t, { judge: true, limit: 10 }); const e = await f.engine.evaluate("run", "initial");
  assert.equal(e.invocations.length, 8); assert.equal(e.invocations.filter(i => i.purpose === "judge").length, 4); assert.ok(e.invocations.filter(i => i.purpose === "judge").every(i => i.parentId));
  const feedback = await f.engine.evaluate("run", "feedback", undefined, "feedback"); assert.equal(feedback.state, "blocked"); assert.equal(f.launches(), 10); assert.equal(f.store.evaluations("run").reduce((n, r) => n + r.invocations.length, 0), 10);
});
test("PR4 durable native-before-ingest interruption, owner reconstruction and no duplicate launches", async t => {
  const f = await engineFixture(t, { interrupt: true }); const e = await f.engine.evaluate("run", "initial", f.abort.signal);
  assert.equal(e.state, "INTERRUPTED"); assert.equal(e.invocations[0]!.state, "native-complete"); assert.equal(f.launches(), 1);
  await f.engine.dispose(); await writeFile(join(f.root, "definition.json"), JSON.stringify({ ...f.definition, tasks: [{ id: "changed", prompt: "changed", expected: "changed" }] })); const owner = new OwnerExecution(f.call, new BindingStore(join(f.root, "state/reopen.sqlite3")), "arbor.owner", "g2", f.store);
  const engine = new EvaluationEngine(owner, f.store, join(f.root, "state"), f.catalog); t.after(() => engine.dispose());
  await engine.resume(f.store.binding(f.store.get("run")!, "resume"), identity);
  const resumed = f.store.evaluation("run", "initial")!; assert.equal(resumed.state, "completed"); assert.equal(resumed.analysis!.wins, 2); assert.deepEqual(resumed.bindings.map(b => b.generation), ["g1", "g2"]); assert.equal(f.launches(), 4); assert.equal(resumed.invocations[0]!.nativeId, e.invocations[0]!.nativeId);
});
test("PR4 unknown handle and changed owner block recovery with no journal changes", async t => {
  const f = await engineFixture(t, { interrupt: true }); await f.engine.evaluate("run", "initial", f.abort.signal); const before = canonical(f.store.projection("run")); f.native.clear();
  await assert.rejects(f.engine.resume(f.store.binding(f.store.get("run")!, "resume"), identity), /Unknown native/);
  await assert.rejects(f.engine.resume(f.store.binding(f.store.get("run")!, "other"), { ...identity, rootId: "other" }), /Different native/);
  assert.equal(canonical(f.store.projection("run")), before); assert.equal(f.launches(), 1);
});
test("PR4 retry IDs, rechecks and feedback remain independently charged and attributed", async t => {
  const failed = await engineFixture(t, { fail: "failed", retries: 1 }); const e = await failed.engine.evaluate("run", "retries");
  assert.equal(e.invocations.length, 8); assert.equal(new Set(e.invocations.map(i => i.id)).size, 8); assert.equal(e.invocations.filter(i => i.purpose === "retry" && i.parentId).length, 4); assert.ok(e.invocations.every(i => i.score === null));
  const f = await engineFixture(t); await f.engine.evaluate("run", "initial"); const recheck = await f.engine.evaluate("run", "recheck", undefined, "recheck"); const feedback = await f.engine.evaluate("run", "feedback", undefined, "feedback");
  assert.ok(recheck.invocations.every(i => i.purpose === "recheck")); assert.ok(feedback.invocations.every(i => i.purpose === "feedback")); assert.equal(f.launches(), 12);
});
test("PR4 frozen quality veto can invalidate otherwise successful graded native tasks", async t => {
  const f = await engineFixture(t, { veto: true }); const e = await f.engine.evaluate("run", "quality");
  assert.ok(e.invocations.every(i => i.native!.status === "completed" && i.valid)); assert.equal(e.quality.passed, false); assert.equal(e.validity, "invalid"); assert.equal(e.analysis!.wins, 2); assert.equal(e.incumbentDecision, "not-evaluated-PR5");
});
test("PR4 selected contradictory aggregation, repeats, identity and veto block spec resolution", async () => {
  const f = await materialFixture(), path = join(f.root, "definition.json"); await writeFile(path, JSON.stringify(f.definition));
  for (const extra of [{ evaluator: { aggregation: "mean" } }, { evaluator: { repeats: 3 } }, { evaluator: { identity: "invented" } }, { objective: { qualityVetoes: ["invented"] } }]) {
    const evaluator = { kind: "agent-suite", definition: path, ...(extra.evaluator ?? {}) };
    await assert.rejects(resolveSpec(f.source, {}, {}, { execution: "evaluate", ...extra, evaluator }, "fake/coordinator"));
  }
});
test("PR4 attachment persistence fault still owns the native wait and returned stop handle", async t => {
  const f = await engineFixture(t); const save = f.store.saveEvaluation.bind(f.store); let fault = true;
  f.store.saveEvaluation = e => { if (fault && e.invocations.at(-1)?.state === "attached") { fault = false; throw new Error("Injected attachment persistence failure"); } save(e); };
  const e = await f.engine.evaluate("run", "attachment-fault");
  assert.equal(e.state, "INTERRUPTED"); assert.equal(f.launches(), 1); assert.ok(f.calls.includes("agents.wait")); assert.ok(f.calls.includes("agents.stop")); assert.equal(e.invocations[0]!.score, null);
});
test("PR4 repeated trajectories remain within-task samples rather than independent task wins", async t => {
  const f = await engineFixture(t, { repeats: 3 }); const e = await f.engine.evaluate("run", "repeats");
  assert.equal(e.invocations.length, 12); assert.equal(e.analysis!.tasks.length, 2); assert.equal(e.analysis!.wins, 2); assert.deepEqual(e.analysis!.range, ["1", "1"]);
});
test('PR6 Main provider descriptor await cannot bypass final native admission', async t => {
 const f = await materialFixture(); f.definition.kind='provider'; f.definition.providerAction='fake.evaluate';
 await writeFile(join(f.root,'definition.json'),JSON.stringify(f.definition));
 const spec=await resolveSpec(f.source,{},{},{execution:'evaluate',evaluator:{kind:'provider',definition:join(f.root,'definition.json')}},'fake/coordinator');
 const store=new ResearchStore(join(f.root,'state/research.sqlite3')), bindings=new BindingStore(join(f.root,'state/bindings.sqlite3'));
 store.create({id:'run',spec,requestHash:'request',owner:identity,componentId:'arbor.owner',generation:'g1',epoch:'epoch-1',revision:0,state:'ready',attemptsUsed:0,active:0,createdAt:1,activeMs:0,activeSince:null,steering:[],pendingDecisionId:null,execution:'not-started',error:null});
 const entry={ref:'fake.evaluate',descriptorHash:'a'.repeat(64)}, view={id:'v',digest:'v',semanticDigest:'v',bindings:{[entry.ref]:{ref:entry.ref,provider:'fake',providerBindingId:'one',generation:1,descriptorHash:entry.descriptorHash}}};
 let calls=0; const now=Date.now();
 const catalog=new EvaluatorCatalog([entry],view,async()=>{calls++;throw new Error('must not invoke after descriptor exhausts budget');},async()=>{
  t.mock.method(Date,'now',()=>now+spec.config.limits.activeMs+1000);
  return {name:'evaluate',description:'fixture',inputSchema:providerInputSchema(),outputSchema:providerOutputSchema(),risk:'execute',effect:{kind:'emission',ordering:'ordered'}};
 });
 const owner=new OwnerExecution(async()=>{throw new Error('No agent expected');},bindings,'arbor.owner','g1',store), engine=new EvaluationEngine(owner,store,join(f.root,'state'),catalog);
 t.after(async()=>{await engine.dispose();store.close();bindings.close();});
 const e=await engine.evaluate('run','late-provider');
 assert.equal(calls,0);assert.match(e.error!,/active-time-budget/);assert.equal(e.invocations[0]!.state,'reserved');
});
test("PR4 strict metric parser and owned commands cover exit/check/timeout/unit/ambiguity", async () => {
  assert.equal(parseMetric("ARBOR_METRIC -2.50 ms\n", "ms"), "-2.5");
  for (const text of ["", "ARBOR_METRIC 2 ms\nARBOR_METRIC 3 ms", "ARBOR_METRIC 2 seconds", "ARBOR_METRIC NaN ms"]) assert.throws(() => parseMetric(text, "ms"));
  const signal = new AbortController().signal;
  const failed = await commandRun([process.execPath, "-e", "console.log('ARBOR_METRIC 99 ms');process.exit(2)"], process.cwd(), 5000, signal); assert.equal(nativeSuccess(failed), false); assert.equal(failed.exitCode, 2);
  const timeout = await commandRun([process.execPath, "-e", "setInterval(()=>{},1000)"], process.cwd(), 30, signal); assert.equal(timeout.status, "timed_out"); assert.equal(nativeSuccess(timeout), false);
});
test("PR4 completed command cannot validate a missing required check or failed check result", async () => {
  const n = await commandRun([process.execPath, "-e", "console.log('ARBOR_METRIC 1 ms')"], process.cwd(), 5000, new AbortController().signal);
  assert.equal(nativeSuccess(n, 0), true); assert.equal(nativeSuccess(n, 1), false);
  n.checks = [false]; n.checkResults = [{ ...n, checks: [] }]; assert.equal(nativeSuccess(n, 1), false);
});
test("PR4 matching catalog hash does not excuse incompatible effective schemas, risk or effect", async () => {
  const ref = "fake.evaluate", descriptorHash = "a".repeat(64); let invoked = 0;
  const valid = { name: "evaluate", description: "fixture", inputSchema: providerInputSchema(), outputSchema: providerOutputSchema(), risk: "execute" as const, effect: { kind: "emission" as const, ordering: "ordered" as const } };
  const view = { id: "v", digest: "v", semanticDigest: "v", bindings: { [ref]: { ref, provider: "fake", providerBindingId: "one", generation: 1, descriptorHash } } };
  for (const descriptor of [{ ...valid, inputSchema: {} }, { ...valid, outputSchema: {} }, { ...valid, risk: "read" as const }, { ...valid, effect: { kind: "none" as const, ordering: "commutative" as const } }]) {
    const c = new EvaluatorCatalog([{ ref, descriptorHash }], view, async () => { invoked++; return {}; }, async () => descriptor);
    await assert.rejects(c.evaluate(ref, { snapshot: { id: "s", directory: "/tmp/s", oid: "a".repeat(40) }, specification: "{}", outputDirectory: "/tmp/out", evaluationId: "e", invocationId: "i" }), /descriptor incompatible/);
  }
  assert.equal(invoked, 0);
});
test("PR4 unsupported analysis, duplicate tasks and malformed definitions block before execution", async () => {
  const f = await materialFixture(); assert.throws(() => validateDefinition({ ...f.definition, analysis: "bootstrap" })); assert.throws(() => validateDefinition({ ...f.definition, tasks: [f.definition.tasks[0], f.definition.tasks[0]] })); assert.throws(() => validateDefinition({ ...f.definition, seed: 123 }));
});
test("PR4 finite optional committed catalog missing/mismatch and invalid result matrix", async () => {
  const view = { id: "v", digest: "v", semanticDigest: "v", bindings: {} as any };
  const entry = { ref: "fake.evaluate", descriptorHash: "a".repeat(64) }; let result: any;
  const catalog = () => new EvaluatorCatalog([entry], view, async () => result, async () => ({ name: "evaluate", description: "fixture", inputSchema: providerInputSchema(), outputSchema: providerOutputSchema(), risk: "execute", effect: { kind: "emission", ordering: "ordered" } }));
  let c = catalog();
  assert.throws(() => c.binding(entry.ref), /missing/); assert.throws(() => c.binding("other.evaluate"), /definition-time/);
  view.bindings[entry.ref] = { ref: entry.ref, provider: "fake", providerBindingId: "one", generation: 1, descriptorHash: "b".repeat(64) }; assert.throws(() => c.binding(entry.ref), /missing/, "Late discovery cannot widen the old committed view"); c = catalog(); assert.throws(() => c.binding(entry.ref), /mismatch/);
  view.bindings[entry.ref].descriptorHash = entry.descriptorHash; assert.throws(() => c.binding(entry.ref), /mismatch/, "Descriptor changes do not silently rebind an existing view"); c = catalog();
  const args = { snapshot: { id: "snapshot", directory: "/tmp/snapshot", oid: "a".repeat(40) }, specification: "{}", outputDirectory: "/tmp/out", evaluationId: "e", invocationId: "i" };
  const good = { evaluationId: "e", invocationId: "i", snapshotId: "snapshot", status: "completed", measurement: "1", checks: [true], artifacts: [], native: { id: "native", cwd: "/tmp/snapshot", text: "done", error: null, exitCode: 0, deadline: false } };
  validate(providerInputSchema(), args); validate(providerOutputSchema(), good);
  for (const bad of [null, { ...good, score: "99" }, { ...good, evaluationId: "wrong" }, { ...good, invocationId: "wrong" }, { ...good, snapshotId: "wrong" }, { ...good, status: "unknown" }, { ...good, native: { ...good.native, cwd: "/wrong" } }]) { result = bad; await assert.rejects(c.evaluate(entry.ref, args)); }
  result = good; assert.equal((await c.evaluate(entry.ref, args)).measurement, "1");
});
test("PR4 preset defaults precede profile/project/explicit and remain frozen data", async () => {
  const f = await materialFixture(), path = join(f.root, "preset.json");
  await writeFile(path, JSON.stringify({ id: "tiny", materialKind: "instructions", objectiveDefaults: { unit: "preset", direction: "minimize" }, evaluator: { kind: "agent-suite" }, searchDefaults: { concurrency: 1 } }));
  const s = await resolveSpec(f.source, { preset: path, objective: { unit: "profile" } }, { objective: { unit: "project" } }, { execution: "deferred", objective: { unit: "explicit" } });
  assert.equal(s.config.objective.unit, "explicit"); assert.equal(s.config.objective.direction, "minimize"); assert.equal(s.origins["objective.direction"], "preset:tiny");
  await writeFile(path, "{}"); assert.equal(s.config.objective.direction, "minimize"); await assert.rejects(resolveSpec(f.source, { preset: path }, {}, { execution: "deferred" }));
});

test("PR4 explicit null preset disables lower-precedence preset without reading it", async () => {
  const f = await materialFixture(), missing = join(f.root, "must-not-read.json");
  for (const [profile, project, explicit] of [
    [{ preset: missing }, {}, { preset: null }],
    [{ preset: missing }, { preset: null }, {}],
  ]) {
    const s = await resolveSpec(f.source, profile!, project!, { ...explicit, execution: "deferred" });
    assert.equal(s.config.preset, null); assert.equal(s.config.objective.unit, "unspecified");
    assert.equal(s.origins.preset, Object.hasOwn(explicit!, "preset") ? "explicit" : "project");
    assert.ok(Object.values(s.origins).every(origin => !origin.startsWith("preset:")));
  }
});

// Independent review regressions: real product owner/evaluator, not a grading driver.
test("PR4 review prototype-named committed files retain exact bytes and verification", async () => {
  const f = await materialFixture();
  const files = ["__proto__", "constructor", "toString"];
  for (const path of files) await writeFile(join(f.source, path), `EXACT_${path}`);
  f.git("add", "--", ...files); f.git("commit", "-m", "prototype-named material");
  const s = await freezeMaterial({ root: f.source, oid: f.git("rev-parse", "HEAD"), files }, join(f.root, "snapshots"));
  assert.deepEqual(Object.keys(s.contents).sort(), [...files].sort());
  for (const path of files) {
    assert.equal(s.contents[path], `EXACT_${path}`); assert.equal(s.executable[path], false);
    assert.equal(await readFile(join(s.directory, path), "utf8"), `EXACT_${path}`);
    assert.ok(subjectBootstrap(s, [path], "task").includes(`EXACT_${path}`));
  }
  const persisted = JSON.parse(canonical(s)); await verifyMaterial(persisted);
  const incomplete = JSON.parse(canonical(s)); delete incomplete.contents.__proto__; delete incomplete.executable.__proto__;
  incomplete.id = `snapshot-${digest({ root: incomplete.root, oid: incomplete.oid, contents: incomplete.contents, executable: incomplete.executable })}`;
  await assert.rejects(verifyMaterial(incomplete), /selected-file coverage/);
  assert.throws(() => subjectBootstrap(incomplete, ["__proto__"], "task"), /Missing explicit/);
  await writeFile(join(s.directory, "__proto__"), "TAMPERED"); await assert.rejects(verifyMaterial(persisted), /changed/);
});
test("PR4 review committed root/subdirectory collision selects the checked blob", async () => {
  const f = await materialFixture(); await mkdir(join(f.source, "nested"));
  await writeFile(join(f.source, "nested/coordinator.md"), "NESTED_EXACT_BYTES"); f.git("add", "."); f.git("commit", "-m", "nested collision");
  const oid = f.git("rev-parse", "HEAD");
  const root = await freezeMaterial({ root: f.source, oid, files: ["coordinator.md"] }, join(f.root, "snapshots"));
  const sub = await freezeMaterial({ root: join(f.source, "nested"), oid, files: ["coordinator.md"] }, join(f.root, "snapshots"));
  assert.equal(root.contents["coordinator.md"], "CANDIDATE_SNAPSHOT_GOOD"); assert.equal(sub.contents["coordinator.md"], "NESTED_EXACT_BYTES");
  assert.equal(await readFile(join(sub.directory, "coordinator.md"), "utf8"), "NESTED_EXACT_BYTES");
});
test("PR4 review committed executable runs directly and mode drift blocks verification", async () => {
  const f = await materialFixture(); await writeFile(join(f.source, "evaluate.sh"), "#!/bin/sh\nprintf 'ARBOR_METRIC 7 points\\n'\n"); await chmod(join(f.source, "evaluate.sh"), 0o755);
  f.git("add", "."); f.git("commit", "-m", "executable");
  const ref = { root: f.source, oid: f.git("rev-parse", "HEAD"), files: ["evaluate.sh", "coordinator.md"] };
  const s = await freezeMaterial(ref, join(f.root, "snapshots"));
  const n = await commandRun(["./evaluate.sh"], s.directory, 5000, new AbortController().signal);
  assert.equal(n.status, "completed"); assert.equal(n.exitCode, 0); assert.equal(parseMetric(n.text, "points"), "7");
  assert.equal((await stat(join(s.directory, "evaluate.sh"))).mode & 0o100, 0o100);
  await chmod(join(s.directory, "evaluate.sh"), 0o600); await assert.rejects(verifyMaterial(s), /changed/);
  await chmod(join(s.directory, "evaluate.sh"), 0o700); await chmod(join(s.directory, "coordinator.md"), 0o700); await assert.rejects(verifyMaterial(s), /changed/);
});
test("PR4 review opposite-sign decimal extremes retain derived BigInts for both directions", async t => {
  const f = await engineFixture(t); const e = await f.engine.evaluate("run", "extremes");
  const max = "999999999999999999999999999.999999999", delta = "1999999999999999999999999999.999999998";
  for (const i of e.invocations) i.score = (i.taskId === "t1" ? i.condition === "baseline" : i.condition === "candidate") ? "-" + max : max;
  for (const direction of ["maximize", "minimize"] as const) {
    const a = analyze(e, direction)!; const sign = direction === "maximize" ? "" : "-";
    assert.deepEqual(a.tasks.map(t => t.delta), [sign + delta, direction === "maximize" ? "-" + delta : delta]);
    assert.deepEqual(a.range, ["-" + delta, delta]); assert.deepEqual([a.wins, a.losses, a.ties, a.failures], [1, 1, 0, 0]);
  }
});
for (const stage of ["native-complete", "ingested"] as const) test(`PR4 review judge ${stage} persistence fault interrupts and resumes without redispatch`, async t => {
  const f = await engineFixture(t, { judge: true }); const save = f.store.saveEvaluation.bind(f.store); let fault = true;
  f.store.saveEvaluation = e => { if (fault && e.invocations.at(-1)?.purpose === "judge" && e.invocations.at(-1)?.state === stage) { fault = false; throw new Error("Injected judge persistence failure"); } save(e); };
  const e = await f.engine.evaluate("run", "judge-fault"); assert.equal(fault, false); assert.equal(e.state, "INTERRUPTED"); assert.equal(f.launches(), 2);
  assert.equal(e.invocations[0]!.state, "native-complete"); assert.equal(e.invocations[1]!.state, "native-complete"); assert.match(e.error!, /Injected judge persistence failure/);
  const ids = e.invocations.map(i => i.nativeId); await f.engine.dispose();
  const bindings = new BindingStore(join(f.root, "state/judge-reopen.sqlite3"));
  const reopened = new ResearchStore(join(f.root, "state/research.sqlite3")); const owner = new OwnerExecution(f.call, bindings, "arbor.owner", "g2", reopened);
  const engine = new EvaluationEngine(owner, reopened, join(f.root, "state"), f.catalog); t.after(async () => { await engine.dispose(); reopened.close(); bindings.close(); });
  await engine.resume(reopened.binding(reopened.get("run")!, "resume-judge"), identity);
  const after = reopened.evaluation("run", "judge-fault")!; assert.equal(after.state, "completed"); assert.equal(after.validity, "valid"); assert.equal(after.analysis!.wins, 2);
  assert.ok(after.invocations.every(i => i.state === "ingested")); assert.deepEqual(after.invocations.slice(0, 2).map(i => i.nativeId), ids); assert.equal(f.launches(), 8);
});
for (const stage of ["agents.spawn", "agents.wait"] as const) for (const field of ["model", "tools", "task"] as const) test(`PR4 review native ${stage} ${field} request poisoning cannot score`, async t => {
  const f = await engineFixture(t, { poison(ref, args, native, requests) {
    if (ref !== stage) return; const request = requests[0];
    if (field === "tools") request.tools.push("bash"); else request[field] = field === "model" ? "fake/forged" : "forged task";
    if (field === "model") for (const r of native.values()) r.model = request.model;
  } });
  const e = await f.engine.evaluate("run", "poison"); assert.equal(e.state, "INTERRUPTED"); assert.equal(f.launches(), 1); assert.equal(e.invocations[0]!.score, null);
  assert.equal(e.invocations[0]!.model, "fake/subject"); assert.deepEqual(e.invocations[0]!.tools, []); assert.equal(e.definition.subject.model, "fake/subject"); assert.deepEqual(e.definition.subject.tools, []);
  assert.match(e.error!, /mutat|mismatch/i); assert.ok(f.calls.includes("agents.wait")); assert.ok(f.calls.includes("agents.stop"));
  const before = canonical(f.store.projection("run"));
  await assert.rejects(f.engine.resume(f.store.binding(f.store.get("run")!, "resume-poison"), identity), /binding rejected/);
  assert.equal(canonical(f.store.projection("run")), before); assert.equal(f.launches(), 1);
});
for (const field of ["evaluationId", "invocationId", "snapshot", "specification", "outputDirectory"]) test(`PR4 review provider ${field} request poisoning is rejected`, async () => {
  const ref = "fake.evaluate", descriptorHash = "a".repeat(64);
  const args = { snapshot: { id: "s", directory: "/tmp/s", oid: "a".repeat(40) }, specification: "{}", outputDirectory: "/tmp/out", evaluationId: "e", invocationId: "i" };
  const before = canonical(args);
  const c = new EvaluatorCatalog([{ ref, descriptorHash }], { id: "v", digest: "v", semanticDigest: "v", bindings: { [ref]: { ref, provider: "fake", providerBindingId: "one", generation: 1, descriptorHash } } }, async (_ref, a: any) => {
    if (field === "snapshot") { a.snapshot.id = "forged"; a.snapshot.directory = "/forged"; a.snapshot.oid = "b".repeat(40); } else a[field] = "forged";
    return { evaluationId: a.evaluationId, invocationId: a.invocationId, snapshotId: a.snapshot.id, status: "completed", measurement: "1", checks: [true], artifacts: [], native: { id: "n", cwd: a.snapshot.directory, text: "forged", error: null, exitCode: 0, deadline: false } };
  }, async () => ({ name: "evaluate", description: "fixture", inputSchema: providerInputSchema(), outputSchema: providerOutputSchema(), risk: "execute", effect: { kind: "emission", ordering: "ordered" } }));
  await assert.rejects(c.evaluate(ref, args), /mutat|provenance/i); assert.equal(canonical(args), before);
});

test("PR4 review completion persistence requires all invocations ingested", async t => {
  const f = await engineFixture(t, { interrupt: true }); const e = await f.engine.evaluate("run", "incomplete", f.abort.signal);
  const before = canonical(f.store.evaluation("run", "incomplete")); e.state = "completed";
  assert.throws(() => f.store.saveEvaluation(e), /every invocation ingested/); assert.equal(canonical(f.store.evaluation("run", "incomplete")), before);
});
test("PR4 review descriptor await cannot rebind the caller request before provider dispatch", async () => {
  const ref = "fake.evaluate", descriptorHash = "a".repeat(64); let calls = 0;
  const args = { snapshot: { id: "s", directory: "/tmp/s", oid: "a".repeat(40) }, specification: "{}", outputDirectory: "/tmp/out", evaluationId: "e", invocationId: "i" };
  const c = new EvaluatorCatalog([{ ref, descriptorHash }], { id: "v", digest: "v", semanticDigest: "v", bindings: { [ref]: { ref, provider: "fake", providerBindingId: "one", generation: 1, descriptorHash } } }, async () => { calls++; throw new Error("must not dispatch"); }, async () => {
    args.snapshot.id = "forged-at-describe";
    return { name: "evaluate", description: "fixture", inputSchema: providerInputSchema(), outputSchema: providerOutputSchema(), risk: "execute", effect: { kind: "emission", ordering: "ordered" } };
  });
  await assert.rejects(c.evaluate(ref, args), /mutat/); assert.equal(calls, 0);
});
for (const mutation of ["request", "reply"]) test(`PR4 review provider delayed ${mutation} poisoning during artifact IO cannot rewrite accepted facts`, async () => {
  const f = await materialFixture(), artifact = join(f.root, "artifact.txt"); await writeFile(artifact, "evidence");
  const { createHash } = await import("node:crypto"); const ref = "fake.evaluate", descriptorHash = "a".repeat(64);
  const args = { snapshot: { id: "s", directory: f.source, oid: "a".repeat(40) }, specification: "{}", outputDirectory: f.root, evaluationId: "e", invocationId: "i" };
  let mutated = false; const c = new EvaluatorCatalog([{ ref, descriptorHash }], { id: "v", digest: "v", semanticDigest: "v", bindings: { [ref]: { ref, provider: "fake", providerBindingId: "one", generation: 1, descriptorHash } } }, async (_ref, outbound: any) => {
    const r = { evaluationId: "e", invocationId: "i", snapshotId: "s", status: "completed", measurement: "1", checks: [true], artifacts: [{ path: artifact, digest: createHash("sha256").update("evidence").digest("hex") }], native: { id: "n", cwd: f.source, text: "evidence", error: null, exitCode: 0, deadline: false } };
    // The check-phase callback runs while real artifact filesystem IO is pending.
    setImmediate(() => { mutated = true; if (mutation === "request") outbound.snapshot.oid = "b".repeat(40); else { r.native.cwd = "/forged"; r.checks[0] = false; r.measurement = "999"; } });
    return r;
  }, async () => ({ name: "evaluate", description: "fixture", inputSchema: providerInputSchema(), outputSchema: providerOutputSchema(), risk: "execute", effect: { kind: "emission", ordering: "ordered" } }));
  if (mutation === "request") await assert.rejects(c.evaluate(ref, args), /mutat/);
  else { const r = await c.evaluate(ref, args); assert.equal(r.native.cwd, f.source); assert.deepEqual(r.native.checks, [true]); assert.equal(r.measurement, "1"); }
  assert.equal(mutated, true); assert.equal(args.snapshot.oid, "a".repeat(40));
});
test("PR4 review native status request poisoning cannot rebind recovery", async t => {
  const f = await engineFixture(t, { interrupt: true, poison(ref, args, native) { if (ref === "agents.status") { const r = native.get(args.id); args.id = "forged-id"; r.id = args.id; } } });
  await f.engine.evaluate("run", "status-poison", f.abort.signal); const before = canonical(f.store.projection("run"));
  await assert.rejects(f.engine.resume(f.store.binding(f.store.get("run")!, "resume"), identity), /mutat|ambiguous/);
  assert.equal(canonical(f.store.projection("run")), before); assert.equal(f.launches(), 1);
});
