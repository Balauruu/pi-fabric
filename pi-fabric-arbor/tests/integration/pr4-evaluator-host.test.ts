import assert from "node:assert/strict";
import { execFile, execFileSync, type ExecFileException } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, copyFile, realpath, chmod, appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { externalFixtureSource } from "../fixtures/pr4-external.js";
import { subjectModel } from "../fixtures/pr4-subject-model.js";
import { ARBOR_ACTIONS, ARBOR_OWNER_REFS } from "../../src/managed/contracts.js";
import { commandProgram, researchCommand } from "../../src/research/commands.js";
import { ResearchStore } from "../../src/research/ResearchStore.js";
const exec = promisify(execFile), APP = resolve(process.cwd());
const bind = 'const bind=(p,id)=>({runId:p.run.id,materialId:p.run.spec.source.materialId,epoch:p.run.epoch,revision:p.run.revision,commandId:id});';
async function host(program: string, options: { installed?: boolean; presetNull?: boolean; script?: boolean; nativePoison?: string; collision?: boolean; checkFail?: boolean; execute?: string; hang?: boolean; deadlineMs?: number; hold?: string; tamper?: boolean | "judge"; external?: boolean; catalog?: boolean; kind?: string; judge?: boolean; limit?: number } = {}) {
  const base = join(APP, ".runtime/pr4-host"); await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, "native-"));
  let app = APP, modules = join(APP, "node_modules");
  if (options.installed) {
    const packed = JSON.parse((await exec("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root], { cwd: APP, timeout: 60000 })).stdout);
    const p = Array.isArray(packed) ? packed[0] : Object.values(packed)[0] as any;
    await writeFile(join(root, "package.json"), JSON.stringify({ private: true, type: "module", dependencies: { "pi-fabric": "0.83.0", "pi-fabric-arbor": `file:${join(root, p.filename)}` } }));
    const installation = await exec("npm", ["install", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"], { cwd: root, timeout: 120000 });
    await writeFile(join(root, "install.log"), installation.stdout + installation.stderr); modules = join(root, "node_modules"); app = join(modules, "pi-fabric-arbor");
    assert.equal(await realpath(app), app); assert.equal(await realpath(join(modules, "pi-fabric")), join(modules, "pi-fabric"));
  }
  const cwd = join(root, "material"), profile = join(root, "profile"), trace = join(root, "trace.jsonl");
  await mkdir(join(cwd, ".pi"), { recursive: true }); await mkdir(join(profile, "extensions"), { recursive: true });
  // A copied test extension resolves declared dependencies from this app/install.
  // No module link to the original checkout or another Pi profile exists.
  let fake = (await readFile(join(APP, "tests/fixtures/pr2-fake-provider.ts"), "utf8")).replace('models: [{ id: "deterministic",', 'models: ["deterministic", "subject", "judge"].map(id => ({ id,').replace('maxTokens: 2048 }],', 'maxTokens: 2048 })),');
  fake = fake.replace('import { appendFileSync }', 'import { appendFileSync, writeFileSync }').replace('let held = false,', 'let tampered = false; let held = false,').replace('if (!proxy) return;', 'if (!proxy) return; if(process.env.ARBOR_PR4_TAMPER && !tampered && proxy.ref === "agents.wait" && (process.env.ARBOR_PR4_TAMPER!=="judge" || String((proxy.result as any).model).endsWith("/judge"))){tampered=true;const r=proxy.result as any;writeFileSync(r.cwd+"/coordinator.md","INJECTED_READ_FAULT");}');
  const fakePath = join(profile, "extensions/pr4-main-fixture.ts"); await writeFile(fakePath, fake);
  const externalPath = join(profile, "extensions/pr4-external-fixture.ts");
  if (options.external) await writeFile(externalPath, externalFixtureSource(app, profile, root, options.nativePoison));
  const worker = await subjectModel(trace, options.hang);
  await writeFile(join(profile, "settings.json"), JSON.stringify({ packages: [app], defaultProjectTrust: "always" }));
  if (options.presetNull) await writeFile(join(profile, "arbor.defaults.json"), JSON.stringify({ preset: join(root, "must-not-read-preset.json") }));
  await writeFile(join(profile, "models.json"), JSON.stringify({ providers: { "arbor-pr2-fake": { baseUrl: worker.baseUrl, api: "openai-completions", apiKey: "local-fake", models: [{ id: "deterministic", reasoning: false, contextWindow: 128000, maxTokens: 2048 }, { id: "subject", reasoning: false, contextWindow: 128000, maxTokens: 2048 }, { id: "judge", reasoning: false, contextWindow: 128000, maxTokens: 2048 }] } } }));
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  let baseline: string, candidate: string;
  git("init", "-b", "main"); git("config", "user.email", "pr4@example.invalid"); git("config", "user.name", "PR4");
  await writeFile(join(cwd, "coordinator.md"), options.installed ? await readFile(join(app, "examples/pr4-agent-improvement/baseline.md"), "utf8") : "BASELINE_SNAPSHOT_BAD"); git("add", "."); git("commit", "-m", "baseline"); baseline = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "coordinator.md"), options.installed ? await readFile(join(app, "examples/pr4-agent-improvement/candidate.md"), "utf8") : "CANDIDATE_SNAPSHOT_GOOD"); git("commit", "-am", "candidate"); candidate = git("rev-parse", "HEAD");
  const promptPath = options.collision ? "skills/fabric-arbor/roles/coordinator.md" : "coordinator.md";
  if (options.collision) {
    git("checkout", "--detach", baseline); await mkdir(join(cwd, "skills/fabric-arbor/roles"), { recursive: true }); await writeFile(join(cwd, promptPath), "BASELINE_SNAPSHOT_BAD"); git("add", "skills"); git("commit", "-m", "Same-path baseline skill"); baseline = git("rev-parse", "HEAD");
    await writeFile(join(cwd, promptPath), "CANDIDATE_SNAPSHOT_GOOD"); git("commit", "-am", "Same-path candidate skill"); candidate = git("rev-parse", "HEAD");
  }
  if (options.script) {
    git("checkout", "--detach", baseline); await writeFile(join(cwd, "evaluate.sh"), "#!/bin/sh\nprintf 'ARBOR_METRIC 1 points\\n'\n"); await chmod(join(cwd, "evaluate.sh"), 0o755); git("add", "."); git("commit", "-m", "executable baseline"); baseline = git("rev-parse", "HEAD");
    await writeFile(join(cwd, "coordinator.md"), "CANDIDATE_SNAPSHOT_GOOD"); await writeFile(join(cwd, "evaluate.sh"), "#!/bin/sh\nprintf 'ARBOR_METRIC 2 points\\n'\n"); git("commit", "-am", "executable candidate"); candidate = git("rev-parse", "HEAD");
  }
  const definition = { version: 1, kind: options.kind ?? "agent-suite", baseline: { root: cwd, oid: baseline, files: options.script ? [promptPath, "evaluate.sh"] : [promptPath] }, candidate: { root: cwd, oid: candidate, files: options.script ? [promptPath, "evaluate.sh"] : [promptPath] }, tasks: options.installed ? JSON.parse(await readFile(join(app, "examples/pr4-agent-improvement/tasks.json"), "utf8")) : [{ id: "task-1", prompt: "Return the instructed answer", expected: "GOOD" }], repeats: 1, retries: 0, deadlineMs: options.deadlineMs ?? 15000, analysis: "paired-descriptive", order: "task-baseline-candidate", subject: { model: "arbor-pr2-fake/subject", tools: [], promptFiles: [promptPath] }, judge: options.judge ? { model: "arbor-pr2-fake/judge", instructions: "Check exact answer" } : null, command: options.kind === "command" ? { argv: options.script ? ["./evaluate.sh"] : [process.execPath, "-e", "const fs=require('fs');console.log('ARBOR_METRIC '+(fs.readFileSync('coordinator.md','utf8').includes('GOOD')?'2':'1')+' points')"], checks: [[process.execPath, "-e", options.checkFail ? "process.exit(1)" : "process.exit(0)"]], unit: "points" } : null, providerAction: options.kind === "provider" ? "pr4external.evaluate" : null };
  await writeFile(join(root, "definition.json"), JSON.stringify(definition));
  await writeFile(join(root, "suite.json"), JSON.stringify({ ...definition, kind: "agent-suite", command: null, providerAction: null }));
  await writeFile(join(cwd, "arbor.config.json"), JSON.stringify({ execution: "evaluate", evaluator: { kind: definition.kind, definition: join(root, "definition.json") }, limits: { evaluatorCalls: options.limit ?? 20 } }));
  if (options.catalog) await writeFile(join(profile, "arbor.evaluators.json"), JSON.stringify([{ ref: "pr4external.evaluate", descriptorHash: "a".repeat(64) }]));
  await writeFile(join(cwd, ".pi/fabric.json"), JSON.stringify({ configVersion: 4, fullCodeMode: true, executor: { timeoutMs: 120000, maxTimeoutMs: 180000 }, approvals: { read: "allow", write: "allow", execute: options.execute ?? "allow", network: "deny", agent: "allow" }, agents: { enabled: true, model: "arbor-pr2-fake/deterministic", runner: "pi", thinking: "off", transport: "process", timeoutMs: 30000, extensions: true, defaultTools: [], maxConcurrent: 2, maxPerExecution: 32, maxDepth: 1, retainRuns: true, notifyOnComplete: true, sessionExport: false }, components: [{ id: "arbor", component: "arbor", config: { stateDirectory: join(root, "state") } }], mesh: { enabled: true, actorScope: "project", root: join(root, "mesh") }, ui: { enabled: false }, schema: { mode: "off" } }));
  const env = { ...process.env }; for (const key of Object.keys(env)) if (key.startsWith("PI_") || key.startsWith("ARBOR_")) delete env[key];
  Object.assign(env, { HOME: join(root, "home"), PI_CODING_AGENT_DIR: profile, PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1", ARBOR_PR2_TRACE: trace, ARBOR_PR2_PROGRAM: program, ARBOR_PR2_HOLD: options.hold ?? "", ARBOR_PR4_TAMPER: options.tamper === "judge" ? "judge" : options.tamper ? "1" : "" });
  const fabricManifest = JSON.parse(await readFile(join(modules, "pi-fabric/package.json"), "utf8"));
  const pending = exec(join(modules, ".bin/pi"), ["--approve", "--offline", "--no-session", "--no-skills", "--no-prompt-templates", "--no-themes", "--provider", "arbor-pr2-fake", "--model", "deterministic", "--thinking", "off", "-e", resolve(modules, "pi-fabric", fabricManifest.exports["."].import), "-e", fakePath, ...(options.external ? ["-e", externalPath] : []), "--mode", "json", "-p", "Execute deterministic PR4 product gate"], { cwd, env, timeout: 150000, maxBuffer: 8 * 1024 * 1024 }); pending.child.stdin?.end();
  let failure: ExecFileException | undefined;
  const result = await pending.catch(error => { failure = error; return { stdout: error.stdout ?? "", stderr: error.stderr ?? String(error) }; }).finally(() => worker.close());
  const exit = { code: pending.child.exitCode, signal: pending.child.signalCode, killed: pending.child.killed, error: failure ? String(failure) : null };
  await writeFile(join(root, "host-output.txt"), result.stdout + result.stderr); await writeFile(join(root, "host-exit.json"), JSON.stringify(exit));
  assert.deepEqual(exit, { code: 0, signal: null, killed: false, error: null }, root); assert.match(result.stdout, /ARBOR_PR2_HOST_COMPLETE/, root);
  if (process.env.ARBOR_PR4_GATE_MANIFEST) await appendFile(process.env.ARBOR_PR4_GATE_MANIFEST, JSON.stringify({ root, exitPath: join(root, "host-exit.json") }) + "\n");
  const events = (await readFile(trace, "utf8")).trim().split("\n").map(line => JSON.parse(line)); const raw = events.filter(e => e.event === "main.result").at(-1)?.data;
  let value: any; try { value = JSON.parse(raw); } catch { assert.fail(`${root}: ${String(raw).slice(0, 1500)}`); }
  const store = new ResearchStore(join(root, "state/research.sqlite3"));
  return { root, cwd, profile, app, value, events, store, git };
}
test("PR4 clean installed product executes independent prompt baseline/candidate and judges without profile skills", { timeout: 240000 }, async t => {
  const h = await host('return JSON.stringify(await tools.call({ref:"arbor.start",args:{runId:"evaluation",overrides:{preset:null}}}));', { installed: true, judge: true, presetNull: true }); t.after(() => h.store.close());
  assert.equal(h.value.run.spec.config.preset, null); assert.equal(h.value.run.spec.origins.preset, "explicit");
  assert.equal(h.value.run.state, "completed", h.root); assert.equal(h.value.evaluations[0].state, "completed");
  const e = h.store.evaluation("evaluation", "evaluation-initial")!; assert.equal(e.validity, "valid"); assert.equal(e.analysis!.wins, 1); assert.equal(e.invocations.length, 4);
  assert.deepEqual(e.invocations.filter(i => i.purpose !== "judge").map(i => i.score), ["0", "1"]);
  const observed = h.events.filter(e => e.event === "subject.observed"); assert.equal(observed.length, 4); assert.ok(observed.every(e => e.data.tools.length === 0));
  assert.match(observed[0].data.text, /BASELINE_SNAPSHOT_BAD/); assert.match(observed[2].data.text, /CANDIDATE_SNAPSHOT_GOOD/);
  assert.equal(e.invocations.filter(i => i.purpose === "judge").length, 2); assert.equal(e.incumbentDecision, "not-evaluated-PR5");
  assert.equal(await readFile(join(h.cwd, "coordinator.md"), "utf8"), "CANDIDATE_SNAPSHOT_GOOD");
  assert.equal(h.events.filter(e => e.event === "main.inference").length, 2);
});
test("PR4 persisted native completion precedes failed ingestion, reload and immutable resume", { timeout: 180000 }, async t => {
  const h = await host(`${bind} const p=await tools.call({ref:'arbor.start',args:{runId:'recover-fact'}});const members=await agents.members({scope:'local',kinds:['agent']});const m=members.find(m=>m.name.startsWith('arbor-subject-'));await pi.write({path:m.cwd+'/coordinator.md',text:'BASELINE_SNAPSHOT_BAD'});await components.reload({id:'arbor'});const before=await tools.call({ref:'arbor.inspect',args:{runId:'recover-fact'}});const resumed=await tools.call({ref:'arbor.control',args:{...bind(before,'resume-fact'),action:'resume'}});const after=await tools.call({ref:'arbor.inspect',args:{runId:'recover-fact'}});return JSON.stringify({p,resumed,after});`, { tamper: true }); t.after(() => h.store.close());
  assert.equal(h.value.p.evaluations[0].state, "INTERRUPTED", h.root); assert.equal(h.value.resumed.status, "applied", h.root);
  const e = h.store.evaluation("recover-fact", "evaluation-initial")!; assert.equal(e.validity, "valid"); assert.equal(e.invocations.length, 2); assert.equal(e.analysis!.wins, 1);
  assert.equal(h.events.filter(e => e.event === "subject.observed").length, 2);
});
test("PR4 actual managed command evaluation works with missing optional provider", { timeout: 180000 }, async t => {
  const h = await host(`const c=await components.status({id:"arbor.owner"});const p=await (async()=>{${commandProgram(researchCommand("start", '{"runId":"command"}'))}})();return JSON.stringify({c,p});`, { kind: "command", catalog: true, installed: true }); t.after(() => h.store.close());
  assert.ok(h.value.c.optionalMissing.includes("pr4external.evaluate")); const e = h.store.evaluation("command", "evaluation-initial")!;
  assert.equal(e.validity, "valid"); assert.deepEqual(e.invocations.map(i => i.score), ["1", "2"]); assert.ok(e.invocations.every(i => i.native!.exitCode === 0 && i.native!.checks[0]));
});
const catalogBind = `const catalog=await tools.catalog({provider:'pr4external'});const hash=catalog.providers[0].actions.find(a=>a.ref==='pr4external.evaluate').descriptorHash;await tools.call({ref:'pr4fixture.bind',args:{hash}});await components.reload({id:'arbor'});`;
test("PR4 actual managed command preserves a successful process but rejects failed correctness checks", { timeout: 180000 }, async t => {
  const h = await host(`return JSON.stringify(await (async()=>{${commandProgram(researchCommand("start", '{"runId":"bad-check"}'))}})());`, { kind: "command", checkFail: true }); t.after(() => h.store.close());
  const e = h.store.evaluation("bad-check", "evaluation-initial")!; assert.equal(e.validity, "invalid", h.root); assert.ok(e.invocations.every(i => i.native?.status === "completed" && i.native.exitCode === 0 && i.native.checkResults?.[0]?.exitCode === 1 && i.score === null));
});
test("PR4 actual external provider definition-time binding, effective schema and result rejection matrix", { timeout: 180000 }, async t => {
  const h = await host(`${catalogBind} const outputs=[];for(const mode of ['valid','invalid','failed','check']){await tools.call({ref:'pr4fixture.replace',args:{mode}});await components.reload({id:'arbor'});const p=await tools.call({ref:'arbor.start',args:{runId:'external-'+mode}});outputs.push({mode,e:p.evaluations[0]});}await tools.call({ref:'pr4fixture.replace',args:{mode:'schema'}});await components.reload({id:'arbor'});let mismatch;try{await tools.call({ref:'arbor.start',args:{runId:'schema-mismatch'}})}catch(e){mismatch=String(e)}return JSON.stringify({outputs,mismatch});`, { external: true, catalog: true, kind: "provider" }); t.after(() => h.store.close());
  assert.equal(h.value.outputs[0].e.validity, "valid", h.root);
  for (const output of h.value.outputs.slice(1)) assert.notEqual(output.e.validity, "valid", output.mode);
  assert.match(h.value.mismatch, /descriptor mismatch/, h.root);
  const calls = (await readFile(join(h.root, "external.jsonl"), "utf8")).trim().split("\n"); assert.equal(calls.length, 7);
});
test("PR4 two-run optional provider replacement interrupts the shared owner; built-ins reactivate, unknown external completion blocks", { timeout: 180000 }, async t => {
  const h = await host(`${bind} ${catalogBind} const paths=await tools.call({ref:'pr4fixture.paths',args:{}});await tools.call({ref:'pr4fixture.gate',args:{}});const external=tools.call({ref:'arbor.start',args:{runId:'external-active'}});const builtin=tools.call({ref:'arbor.start',args:{runId:'builtin-active',overrides:{evaluator:{kind:'agent-suite',definition:paths.suite}}}});await Promise.all([tools.call({ref:'pr4fixture.ready',args:{}}),tools.call({ref:'pr2fixture.ready',args:{}})]);await tools.call({ref:'pr4fixture.replace',args:{mode:'valid'}});const reload=components.reload({id:'arbor'});await tools.call({ref:'pr2fixture.release',args:{}});await tools.call({ref:'pr4fixture.release',args:{}});const [a,b]=await Promise.all([external,builtin]);await reload;const fresh=await tools.call({ref:'arbor.start',args:{runId:'builtin-after',overrides:{evaluator:{kind:'agent-suite',definition:paths.suite}}}});const p=await tools.call({ref:'arbor.inspect',args:{runId:'external-active'}});let blocked;try{await tools.call({ref:'arbor.control',args:{...bind(p,'resume-external'),action:'resume'}})}catch(e){blocked=String(e)}return JSON.stringify({a,b,fresh,blocked});`, { external: true, catalog: true, kind: "provider", hold: "agents.wait" }); t.after(() => h.store.close());
  assert.equal(h.value.a.evaluations[0].state, "INTERRUPTED", h.root); assert.equal(h.value.b.evaluations[0].state, "INTERRUPTED", h.root);
  assert.equal(h.value.fresh.evaluations[0].validity, "valid", h.root); assert.match(h.value.blocked, /Unknown command\/provider completion handle/, h.root);
});
test("PR4 native pause stops new evaluation dispatch; explicit resume and feedback receipts are idempotent", { timeout: 180000 }, async t => {
  const h = await host(`${bind} const active=tools.call({ref:'arbor.start',args:{runId:'paused'}});await Promise.race([tools.call({ref:'pr2fixture.ready',args:{}}),active.then(p=>{throw new Error('Start settled before wait barrier')})]);const p=await tools.call({ref:'arbor.inspect',args:{runId:'paused'}});await tools.call({ref:'arbor.control',args:{...bind(p,'pause'),action:'pause'}});await tools.call({ref:'pr2fixture.release',args:{}});const paused=await active;const resumeArgs={...bind(paused,'resume'),action:'resume'};const resumed=await tools.call({ref:'arbor.control',args:resumeArgs});const duplicateResume=await tools.call({ref:'arbor.control',args:resumeArgs});const current=await tools.call({ref:'arbor.inspect',args:{runId:'paused'}});const feedbackArgs={...bind(current,'feedback'),payload:{attemptId:'exact-material',evaluationId:'feedback',purpose:'feedback'}};const feedback=await tools.call({ref:'arbor.evaluate',args:feedbackArgs});const duplicateFeedback=await tools.call({ref:'arbor.evaluate',args:feedbackArgs});return JSON.stringify({paused,resumed,duplicateResume,feedback,duplicateFeedback});`, { hold: "agents.wait" }); t.after(() => h.store.close());
  assert.equal(h.value.paused.run.state, "paused"); assert.equal(h.value.paused.evaluations[0].invocationCount, 1); assert.deepEqual(h.value.resumed, h.value.duplicateResume); assert.deepEqual(h.value.feedback, h.value.duplicateFeedback);
  assert.equal(h.events.filter(e => e.event === "subject.observed").length, 4); assert.ok(h.store.evaluation("paused", "feedback")!.invocations.every(i => i.purpose === "feedback"));
});
test("PR4 command start cannot bypass execute deny through an agent-risk facade", { timeout: 180000 }, async t => {
  const program = commandProgram(researchCommand("start", '{"runId":"denied-command"}'));
  const h = await host(`let denial;try{await (async()=>{${program}})()}catch(e){denial=String(e)}const p=await tools.call({ref:'arbor.inspect',args:{runId:'denied-command'}});return JSON.stringify({denial,p});`, { kind: "command", execute: "deny" }); t.after(() => h.store.close());
  assert.match(h.value.denial, /denied|not allowed/i); assert.equal(h.value.p.evaluations.length, 0); assert.equal(h.value.p.run.activeSince, null); assert.equal(h.events.filter(e => e.event === "subject.observed").length, 0);
});
test("PR4 real native short deadline stops Pi subjects below Fabric timeout floor and never scores", { timeout: 180000 }, async t => {
  const h = await host('return JSON.stringify(await tools.call({ref:"arbor.start",args:{runId:"deadline"}}));', { hang: true, deadlineMs: 600 }); t.after(() => h.store.close());
  const e = h.store.evaluation("deadline", "evaluation-initial")!; assert.equal(e.validity, "invalid", h.root); assert.equal(e.invocations.length, 2); assert.ok(e.invocations.every(i => i.native?.deadline && i.score === null && !i.valid));
  const terminal = h.events.filter(e => e.event === "native.result" && e.data.ref === "agents.wait" && e.data.result).map(e => e.data.result);
  assert.deepEqual(e.invocations.map(i => i.native!.status), terminal.map(r => r.status)); assert.ok(terminal.every(r => ["stopped", "timed_out", "failed"].includes(r.status)));
});
test("PR4 real native late-spawn cancellation settles without further evaluation launches", { timeout: 180000 }, async t => {
  const h = await host(`${bind}const active=tools.call({ref:'arbor.start',args:{runId:'cancelled'}});await Promise.race([tools.call({ref:'pr2fixture.ready',args:{}}),active.then(()=>{throw new Error('Start settled before spawn barrier')})]);const p=await tools.call({ref:'arbor.inspect',args:{runId:'cancelled'}});const cancel=tools.call({ref:'arbor.control',args:{...bind(p,'cancel'),action:'cancel'}});await tools.call({ref:'pr2fixture.release',args:{}});await Promise.all([active,cancel]);const after=await tools.call({ref:'arbor.inspect',args:{runId:'cancelled'}});const members=await agents.members({scope:'local',kinds:['agent']});return JSON.stringify({after,members});`, { hold: "agents.spawn", hang: true }); t.after(() => h.store.close());
  assert.equal(h.value.after.run.state, "cancelled", h.root); assert.equal(h.value.after.evaluations[0].invocationCount, 1); assert.ok(h.value.members.every((m: any) => ["stopped", "completed", "failed", "timed_out"].includes(m.status)));
  assert.equal(h.store.evaluation("cancelled", "evaluation-initial")!.invocations[0]!.score, null);
});
test("PR4 real unknown public native handle blocks immutable resume without journal change or duplicate launch", { timeout: 180000 }, async t => {
  const h = await host(`${bind}const p=await tools.call({ref:'arbor.start',args:{runId:'unknown'}});const members=await agents.members({scope:'local',kinds:['agent']});await pi.write({path:members[0].cwd+'/coordinator.md',text:'BASELINE_SNAPSHOT_BAD'});await tools.call({ref:'pr4fixture.corrupt',args:{runId:'unknown'}});await components.reload({id:'arbor'});const before=await tools.call({ref:'pr4fixture.journal',args:{runId:'unknown'}});const projection=await tools.call({ref:'arbor.inspect',args:{runId:'unknown'}});let blocked;try{await tools.call({ref:'arbor.control',args:{...bind(projection,'resume-unknown'),action:'resume'}})}catch(e){blocked=String(e)}const after=await tools.call({ref:'pr4fixture.journal',args:{runId:'unknown'}});return JSON.stringify({p,before,after,blocked});`, { tamper: true, external: true }); t.after(() => h.store.close());
  assert.equal(h.value.p.evaluations[0].state, "INTERRUPTED"); assert.match(h.value.blocked, /unknown|not found/i); assert.deepEqual(h.value.before, h.value.after); assert.equal(h.events.filter(e => e.event === "subject.observed").length, 1);
});
test("PR4 actual coordinator/executor tools and instructions cannot be replaced by a same-named subject snapshot", { timeout: 180000 }, async t => {
  const h = await host(`const e=await tools.call({ref:'arbor.start',args:{runId:'subject'}});const p=await tools.call({ref:'arbor.start',args:{runId:'operational',overrides:{execution:'inspect',roleTools:{executor:['read']}}}});return JSON.stringify({e,p});`, { collision: true }); t.after(() => h.store.close());
  assert.equal(h.value.e.evaluations[0].validity, "valid", h.root); // The existing PR3 stop proposal deliberately pauses research after native settlement.
  assert.equal(h.value.p.run.state, "paused", h.root); assert.equal(h.value.p.run.execution, "native-observation-settled; unscored"); assert.equal(h.value.p.run.error, null); assert.equal(h.value.p.attempts.length, 1); assert.equal(h.value.p.attempts[0].state, "completed");
  const actors = h.events.filter(e => e.event === "actor.observed"); assert.equal(actors.length, 3); assert.ok(actors.every(e => e.data.tools.includes("fabric_exec")));
  const bootstrap = h.events.filter(e => e.event === "actor.bootstrap"); assert.equal(bootstrap.length, 3);
  assert.ok(bootstrap.every(e => e.data.coordinator && e.data.sentinel && e.data.strategy)); assert.equal(bootstrap.at(-1)!.data.evidence, true);
  assert.ok(h.value.p.run.spec.roleBundle.directory.startsWith(h.root));
  const workers = h.events.filter(e => e.event === "subject.observed" && e.data.text.includes("Arbor bounded executor")); assert.equal(workers.length, 1); assert.deepEqual(workers[0].data.tools, ["read"]); assert.doesNotMatch(workers[0].data.text, /CANDIDATE_SNAPSHOT_GOOD|BASELINE_SNAPSHOT_BAD/);
  const subjects = h.events.filter(e => e.event === "subject.observed" && e.data.text.includes("Arbor evaluation subject")); assert.equal(subjects.length, 2); assert.ok(subjects.every(e => e.data.text.includes("skills/fabric-arbor/roles/coordinator.md"))); assert.ok(subjects.every(e => e.data.model === "subject" && e.data.tools.length === 0));
  assert.ok(h.events.filter(e => e.event === "actor.restrictions").every(e => !e.data.includes("UNEXPECTED_SUCCESS")));
});
test("PR4 exact effective public schemas, owner requirements and normal policy path", { timeout: 180000 }, async t => {
  const outputTexts = [...new Set(ARBOR_ACTIONS.map(a => JSON.stringify(a.outputSchema ?? null)))];
  const expected = ARBOR_ACTIONS.map(a => ({ name: a.name, inputSchema: a.inputSchema, outputIndex: outputTexts.indexOf(JSON.stringify(a.outputSchema ?? null)), risk: a.risk, effect: a.effect }));
  const h = await host(`const outputs=${JSON.stringify(outputTexts.map(s => JSON.parse(s)))};const checks=[];for(const e of ${JSON.stringify(expected)}){const a=await tools.describe({ref:'arbor.'+e.name});checks.push(JSON.stringify(a.inputSchema)===JSON.stringify(e.inputSchema)&&JSON.stringify(a.outputSchema??null)===JSON.stringify(outputs[e.outputIndex])&&a.risk===e.risk&&JSON.stringify(a.effect)===JSON.stringify(e.effect));}const native=[];for(const ref of ${JSON.stringify(ARBOR_OWNER_REFS)}){const a=await tools.describe({ref});native.push({ref,closed:a.inputSchema.additionalProperties===false});}return JSON.stringify({checks,native});`); t.after(() => h.store.close());
  assert.ok(h.value.checks.every(Boolean), h.root); assert.ok(h.value.native.every((e: any) => e.closed)); assert.equal(h.events.filter(e => e.event === "subject.observed").length, 0);
});
test("PR4 native completion survives interrupted ingestion and same-owner component reconstruction without redispatch", { timeout: 180000 }, async t => {
  const h = await host(`${bind} const active=tools.call({ref:'arbor.start',args:{runId:'recover'}});await Promise.race([tools.call({ref:'pr2fixture.ready',args:{}}),active.then(p=>{throw new Error('Start settled before wait barrier: '+JSON.stringify(p));})]);const reload=components.reload({id:'arbor'});await tools.call({ref:'pr2fixture.release',args:{}});const interrupted=await active;await reload;const before=await tools.call({ref:'arbor.inspect',args:{runId:'recover'}});const resumed=await tools.call({ref:'arbor.control',args:{...bind(before,'resume'),action:'resume'}});const after=await tools.call({ref:'arbor.inspect',args:{runId:'recover'}});return JSON.stringify({interrupted,before,resumed,after});`, { hold: "agents.wait" }); t.after(() => h.store.close());
  assert.equal(h.value.interrupted.evaluations[0].state, "INTERRUPTED", h.root); assert.equal(h.value.resumed.status, "applied", h.root); assert.equal(h.value.after.evaluations[0].state, "completed");
  assert.equal(h.events.filter(e => e.event === "subject.observed").length, 2); const e = h.store.evaluation("recover", "evaluation-initial")!; assert.equal(e.invocations.length, 2); assert.ok(e.invocations.every(i => i.state === "ingested"));
});

test("PR4 review real judge native-before-ingest fault reloads and resumes every invocation without redispatch", { timeout: 180000 }, async t => {
  const h = await host(`${bind}const p=await tools.call({ref:'arbor.start',args:{runId:'judge-recover'}});const saved=await tools.call({ref:'pr4fixture.record',args:{runId:'judge-recover'}});const members=await agents.members({scope:'local',kinds:['agent']});const judge=members.find(m=>m.name.startsWith('arbor-judge-'));await pi.write({path:judge.cwd+'/coordinator.md',text:'BASELINE_SNAPSHOT_BAD'});await components.reload({id:'arbor'});const before=await tools.call({ref:'arbor.inspect',args:{runId:'judge-recover'}});const resumed=await tools.call({ref:'arbor.control',args:{...bind(before,'resume-judge'),action:'resume'}});return JSON.stringify({p,saved,resumed});`, { judge: true, tamper: "judge", external: true }); t.after(() => h.store.close());
  assert.equal(h.value.p.evaluations[0].state, "INTERRUPTED", h.root); assert.equal(h.value.saved.state, "INTERRUPTED");
  assert.deepEqual(h.value.saved.invocations.map((i: any) => [i.purpose, i.state]), [["baseline", "native-complete"], ["judge", "native-complete"]]);
  assert.equal(h.value.resumed.status, "applied"); const e = h.store.evaluation("judge-recover", "evaluation-initial")!;
  assert.equal(e.state, "completed"); assert.equal(e.validity, "valid"); assert.equal(e.analysis!.wins, 1); assert.equal(e.invocations.length, 4); assert.ok(e.invocations.every(i => i.state === "ingested"));
  assert.deepEqual(e.invocations.slice(0, 2).map(i => i.nativeId), h.value.saved.invocations.map((i: any) => i.nativeId));
  assert.equal(h.events.filter(e => e.event === "subject.observed").length, 4);
  const statuses = h.events.filter(e => e.event === "native.result" && e.data.ref === "agents.status").map(e => e.data.result.id);
  for (const i of h.value.saved.invocations) assert.ok(statuses.includes(i.nativeId));
});
for (const nativePoison of ["spawn-model", "wait-model", "wait-tools", "wait-task"]) test(`PR4 review actual native ${nativePoison} poisoning is rejected with settled handles`, { timeout: 180000 }, async t => {
  const h = await host(`${catalogBind}const p=await tools.call({ref:'arbor.start',args:{runId:'poison-native'}});const members=await agents.members({scope:'local',kinds:['agent']});return JSON.stringify({p,members});`, { nativePoison, external: true, catalog: true }); t.after(() => h.store.close());
  const e = h.store.evaluation("poison-native", "evaluation-initial")!; assert.equal(e.state, "INTERRUPTED", h.root); assert.match(e.error!, /mutat|mismatch/i); assert.equal(e.invocations.length, 1); assert.equal(e.invocations[0]!.score, null);
  assert.equal(e.invocations[0]!.model, "arbor-pr2-fake/subject"); assert.deepEqual(e.invocations[0]!.tools, []); assert.equal(e.definition.subject.model, "arbor-pr2-fake/subject"); assert.deepEqual(e.definition.subject.tools, []);
  assert.equal(h.events.filter(e => e.event === "review.poison").length, 1);
  assert.equal(h.events.filter(e => e.event === "native.result" && e.data.ref === "agents.spawn").length, 1);
  // Spawn rejection may stop Pi before inference begins. Wait-stage faults must
  // prove the real inference, not conflate a launch with a completed model call.
  if (!nativePoison.startsWith("spawn")) assert.equal(h.events.filter(e => e.event === "subject.observed").length, 1);
  assert.ok(h.events.some(e => e.event === "native.result" && e.data.ref === "agents.wait")); assert.ok(h.events.some(e => e.event === "native.result" && e.data.ref === "agents.stop"));
  assert.equal(h.value.members.length, 1); assert.ok(h.value.members.every((m: any) => ["completed", "failed", "stopped", "timed_out"].includes(m.status)));
});
test("PR4 review actual external provider request poisoning rejects all frozen bindings", { timeout: 180000 }, async t => {
  const fields = ["evaluationId", "invocationId", "snapshot", "specification", "outputDirectory"];
  const h = await host(`${catalogBind}const outputs=[];for(const field of ${JSON.stringify(fields)}){await tools.call({ref:'pr4fixture.replace',args:{mode:'poison-'+field}});await components.reload({id:'arbor'});const p=await tools.call({ref:'arbor.start',args:{runId:'poison-'+field}});outputs.push({field,e:p.evaluations[0]})}return JSON.stringify(outputs);`, { external: true, catalog: true, kind: "provider" }); t.after(() => h.store.close());
  assert.equal(h.value.length, fields.length);
  for (const { field, e } of h.value) { assert.equal(e.state, "INTERRUPTED", `${h.root}:${field}`); assert.match(e.error, /mutat|provenance/i); const saved = h.store.evaluation("poison-" + field, "evaluation-initial")!; assert.equal(saved.invocations.length, 1); assert.equal(saved.invocations[0]!.native, null); assert.equal(saved.invocations[0]!.score, null); }
  assert.equal((await readFile(join(h.root, "external.jsonl"), "utf8")).trim().split("\n").length, 5);
});
test("PR4 review installed direct committed executable command scores through execute-risk product action", { timeout: 240000 }, async t => {
  const h = await host(`return JSON.stringify(await (async()=>{${commandProgram(researchCommand("start", '{"runId":"direct-script"}'))}})());`, { kind: "command", script: true, installed: true }); t.after(() => h.store.close());
  const e = h.store.evaluation("direct-script", "evaluation-initial")!; assert.deepEqual(e.definition.command!.argv, ["./evaluate.sh"]); assert.equal(e.state, "completed"); assert.equal(e.validity, "valid", h.root);
  assert.deepEqual(e.invocations.map(i => [i.native!.status, i.native!.exitCode, i.score]), [["completed", 0, "1"], ["completed", 0, "2"]]); assert.equal(e.analysis!.wins, 1);
});
