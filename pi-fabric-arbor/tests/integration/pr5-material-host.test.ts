import assert from "node:assert/strict";
import { execFile, execFileSync, type ExecFileException } from "node:child_process";
import { mkdir, mkdtemp, writeFile, readFile, realpath, appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { lossFixture } from "../fixtures/pr5-loss.js";
import { commandProgram, researchCommand } from "../../src/research/commands.js";
import { materialModel } from "../fixtures/pr5-model.js";
import { ResearchStore } from "../../src/research/ResearchStore.js";
const exec = promisify(execFile), APP = resolve(process.cwd());
const helpers = `const get=()=>tools.call({ref:'arbor.inspect',args:{runId:'material'}});const act=async(name,payload,id)=>{const p=await get();return tools.call({ref:'arbor.'+name,args:{runId:p.run.id,materialId:p.run.spec.source.materialId,epoch:p.run.epoch,revision:p.run.revision,commandId:id,...(name==='export'?{format:'json'}:name==='control'?{action:payload}:{payload})}});};`;
async function host(program: string, options: { installed?: boolean; nonGit?: boolean; command?: boolean; failedMetric?: boolean; hold?: string; loss?: boolean; threshold?: string } = {}) {
  const base = join(APP, ".runtime/pr5-host"); await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, "native-")); let app = APP, modules = join(APP, "node_modules");
  if (options.installed) {
    const packed = JSON.parse((await exec("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root], { cwd: APP, timeout: 60000 })).stdout); const p = Array.isArray(packed) ? packed[0] : Object.values(packed)[0] as any;
    await writeFile(join(root, "package.json"), JSON.stringify({ private: true, type: "module", dependencies: { "pi-fabric": "0.83.0", "pi-fabric-arbor": `file:${join(root, p.filename)}` } }));
    const install = await exec("npm", ["install", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"], { cwd: root, timeout: 120000 }); await writeFile(join(root, "install.log"), install.stdout + install.stderr);
    modules = join(root, "node_modules"); app = join(modules, "pi-fabric-arbor"); assert.equal(await realpath(app), app);
  }
  const cwd = join(root, "source"), profile = join(root, "profile"), trace = join(root, "trace.jsonl"); await mkdir(join(cwd, ".pi"), { recursive: true }); await mkdir(join(profile, "extensions"), { recursive: true });
  const fakePath = join(profile, "extensions/main.ts"); await writeFile(fakePath, (await readFile(join(APP, "tests/fixtures/pr2-fake-provider.ts"), "utf8")).replace('models: [{ id: "deterministic",', 'models: ["deterministic", "subject"].map(id => ({ id,').replace('maxTokens: 2048 }],', 'maxTokens: 2048 })),'));
  if (options.loss) await writeFile(join(profile, "extensions/loss.ts"), lossFixture(app, trace));
  const model = await materialModel(trace);
  await writeFile(join(profile, "settings.json"), JSON.stringify({ packages: [app], defaultProjectTrust: "always" }));
  await writeFile(join(profile, "models.json"), JSON.stringify({ providers: { "arbor-pr2-fake": { baseUrl: model.baseUrl, api: "openai-completions", apiKey: "local-fake", models: ["deterministic", "subject"].map(id => ({ id, reasoning: false, contextWindow: 128000, maxTokens: 2048 })) } } }));
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  await writeFile(join(cwd, "prompt"), "source committed"); await writeFile(join(cwd, "check"), "fixed"); await writeFile(join(cwd, ".gitignore"), ".pi/\narbor.config.json\nignored\n");
  if (!options.nonGit) { git("init", "-b", "main"); git("config", "user.name", "PR5"); git("config", "user.email", "pr5@example.invalid"); git("add", "."); git("commit", "-m", "original"); await writeFile(join(cwd, "prompt"), "USER STAGED"); git("add", "prompt"); }
  await writeFile(join(cwd, "prompt"), "BASELINE_SNAPSHOT_BAD"); await writeFile(join(cwd, "selected"), "user selected"); await writeFile(join(cwd, "ignored"), "untouched ignored");
  const before = options.nonGit ? null : await readFile(join(cwd, ".git/index")), refs = options.nonGit ? null : git("show-ref");
  const definition = { version: 1, kind: options.command ? "command" : "agent-suite", baseline: { root: cwd, oid: "capture", files: ["prompt"] }, candidate: { root: cwd, oid: "capture", files: ["prompt"] }, tasks: options.threshold ? [1, 2, 3].map(n => ({ id: `t${n}`, prompt: `Return the instructed answer${n === 1 ? " BASELINE_ALWAYS_GOOD" : ""}`, expected: "GOOD" })) : [{ id: "t1", prompt: "Return the instructed answer", expected: "GOOD" }], repeats: 1, retries: 0, deadlineMs: 20000, analysis: "paired-descriptive", order: "task-baseline-candidate", subject: { model: "arbor-pr2-fake/subject", tools: [], promptFiles: ["prompt"] }, judge: null, command: options.command ? { argv: [process.execPath, "-e", `const fs=require('fs');const good=fs.readFileSync('prompt','utf8').includes('GOOD');console.log('ARBOR_METRIC '+(good?'2':'1')+' points');${options.failedMetric ? "if(good)process.exit(4);" : ""}`], checks: [], unit: "points" } : null, providerAction: null };
  await writeFile(join(root, "definition.json"), JSON.stringify(definition));
  await writeFile(join(cwd, "arbor.config.json"), JSON.stringify({ execution: "material", material: { mutablePaths: ["prompt"], evaluationInputs: ["check"], selectedUntracked: ["selected"] }, evaluator: { kind: definition.kind, definition: join(root, "definition.json") }, objective: { unit: "points", ...(options.threshold ? { minimumGain: options.threshold, gainKind: "absolute" } : {}) }, roleTools: { executor: ["read", "bash"] }, limits: { evaluatorCalls: 20, activeMs: 300000 } }));
  await writeFile(join(cwd, ".pi/fabric.json"), JSON.stringify({ configVersion: 4, fullCodeMode: true, executor: { timeoutMs: 180000, maxTimeoutMs: 240000 }, approvals: { read: "allow", write: "allow", execute: "allow", network: "deny", agent: "allow" }, agents: { enabled: true, model: "arbor-pr2-fake/deterministic", runner: "pi", thinking: "off", transport: "process", timeoutMs: 30000, extensions: true, defaultTools: [], maxConcurrent: 2, maxPerExecution: 32, maxDepth: 1, retainRuns: true, notifyOnComplete: true, sessionExport: false }, components: [{ id: "arbor", component: "arbor", config: { stateDirectory: join(root, "state") } }], mesh: { enabled: true, actorScope: "project", root: join(root, "mesh") }, ui: { enabled: false }, schema: { mode: "off" } }));
  const env = { ...process.env }; for (const key of Object.keys(env)) if (key.startsWith("PI_") || key.startsWith("ARBOR_")) delete env[key];
  Object.assign(env, { HOME: join(root, "home"), PI_CODING_AGENT_DIR: profile, PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1", ARBOR_PR2_TRACE: trace, ARBOR_PR2_PROGRAM: `const installedPackageRoot=${JSON.stringify(app)};` + helpers + program, ARBOR_PR2_HOLD: options.hold ?? "" });
  const manifest = JSON.parse(await readFile(join(modules, "pi-fabric/package.json"), "utf8"));
  const pending = exec(join(modules, ".bin/pi"), ["--approve", "--offline", "--no-session", "--no-skills", "--no-prompt-templates", "--no-themes", "--provider", "arbor-pr2-fake", "--model", "deterministic", "--thinking", "off", "-e", resolve(modules, "pi-fabric", manifest.exports["."].import), "-e", fakePath, "--mode", "json", "-p", "Execute deterministic PR5 material gate"], { cwd, env, timeout: 210000, maxBuffer: 8 * 1048576 }); pending.child.stdin?.end();
  let failure: ExecFileException | undefined;
  const result = await pending.catch(e => { failure = e; return { stdout: e.stdout ?? "", stderr: e.stderr ?? String(e) }; }).finally(() => model.close());
  const exit = { code: pending.child.exitCode, signal: pending.child.signalCode, killed: pending.child.killed, error: failure ? String(failure) : null };
  await writeFile(join(root, "host-output.txt"), result.stdout + result.stderr); await writeFile(join(root, "host-exit.json"), JSON.stringify(exit));
  assert.deepEqual(exit, { code: 0, signal: null, killed: false, error: null }, root); assert.match(result.stdout, /ARBOR_PR2_HOST_COMPLETE/, root);
  await appendFile(join(APP, ".runtime/pr5-gates/native-exits.jsonl"), JSON.stringify({ root, exit }) + "\n");
  const events = (await readFile(trace, "utf8")).trim().split("\n").map(s => JSON.parse(s)), raw = events.filter(e => e.event === "main.result").at(-1)?.data;
  let value: any; try { value = JSON.parse(raw); } catch { assert.fail(`${root}: ${String(raw).slice(0, 1500)}`); }
  if (before) { assert.deepEqual(await readFile(join(cwd, ".git/index")), before); assert.equal(git("show-ref"), refs); }
  assert.equal(await readFile(join(cwd, "prompt"), "utf8"), "BASELINE_SNAPSHOT_BAD"); assert.equal(await readFile(join(cwd, "ignored"), "utf8"), "untouched ignored");
  return { root, cwd, value, events, store: new ResearchStore(join(root, "state/research.sqlite3")) };
}
test("PR5 native exact 2/3 task gain stays below 0.666666667", { timeout: 240000 }, async t => {
  const h = await host(`${start}${candidate}${keep}return JSON.stringify({kept,p:await get()});`, { threshold: "0.666666667" }); t.after(() => h.store.close());
  const e = h.store.evaluation("material", "candidate")!;
  assert.deepEqual(e.invocations.filter(i => i.condition === "baseline").map(i => i.score), ["1", "0", "0"]);
  assert.deepEqual(e.invocations.filter(i => i.condition === "candidate").map(i => i.score), ["1", "1", "1"]);
  assert.equal(h.value.kept.status, "blocked", h.root); assert.equal(h.value.kept.reason, "below-practical-threshold"); assert.equal(h.value.p.run.material.incumbent, h.value.p.run.material.capture.baseline);
});
test("PR5 native accepted evaluator reply loss keeps cancellation cleanup_pending with retained identity and no redispatch", { timeout: 240000 }, async t => {
  const h = await host(`await tools.call({ref:'pr5fixture.arm',args:{}});await components.reload({id:'arbor'});${start}const cancelled=await act('control','cancel','cancel');const retained=JSON.stringify(await get());let pauseError;try{await act('control','pause','pause-uncertain')}catch(e){pauseError=String(e)}const preserved=JSON.stringify(await get())===retained;let resumeError;try{await act('control','resume','resume')}catch(e){resumeError=String(e)}const members=await agents.members({scope:'local',kinds:['agent']});await Promise.all(members.map(m=>agents.wait({id:m.id})));return JSON.stringify({cancelled,resumeError,pauseError,preserved,p:await get()});`, { loss: true }); t.after(() => h.store.close());
  const lost = h.events.filter(e => e.event === "material.spawn-reply-lost"); assert.equal(lost.length, 1, h.root); assert.ok(lost[0].data.id);
  const e = h.store.evaluations("material")[0]!; assert.equal(e.invocations.length, 1); assert.equal(e.invocations[0]!.state, "launching"); assert.equal(e.invocations[0]!.nativeId, null);
  assert.equal(h.value.p.run.state, "cleanup_pending", h.root); assert.match(h.value.pauseError, /Unresolved material/); assert.equal(h.value.preserved, true); assert.match(h.value.resumeError, /Unknown native handle/); assert.equal(h.value.p.run.material.incumbent, h.value.p.run.material.capture.baseline);
  assert.equal(await readFile(join(e.snapshots.baseline.directory, "prompt"), "utf8"), "BASELINE_SNAPSHOT_BAD"); assert.ok(await readFile(join(h.root, "state/runs/material/evaluations/evaluation-initial.json")));
});
for (const command of [false, true]) test(`PR5 native completed ${command ? "command" : "agent"} baseline pause/resume dispatches through actual policy route`, { timeout: 240000 }, async t => {
  const resume = commandProgram(researchCommand("resume", "material")), terminalResume = commandProgram(researchCommand("resume", "material"));
  const h = await host(`${start}${command ? "await act('evaluate',{attemptId:'exact-material',evaluationId:'evaluation-initial'},'initial');" : ""}await act('control','pause','pause');${command ? "const denied=await act('control','resume','denied');if(denied.status!=='blocked')throw new Error('execute policy bypass');" : ""}const resumed=await(async()=>{${resume}})();const ready=await get();${candidate}const p=await get();await act('control','cancel','terminal-cancel');const cancelled=await get();let resumeError,pauseError;try{await(async()=>{${terminalResume}})()}catch(e){resumeError=String(e)}try{await act('control','pause','terminal-pause')}catch(e){pauseError=String(e)}return JSON.stringify({resumed,ready,p,cancelledState:cancelled.run.state,resumeError,pauseError,unchanged:JSON.stringify(await get())===JSON.stringify(cancelled)});`, { command }); t.after(() => h.store.close());
  assert.equal(h.value.resumed.status, "applied", h.root); assert.equal(h.value.ready.run.state, "ready"); assert.equal(h.value.ready.evaluations.length, 1); assert.equal(h.value.p.run.attemptsUsed, 1); assert.equal(h.value.p.evaluations.length, 2);
  assert.match(h.value.resumeError ?? "", /Terminal material/); assert.match(h.value.pauseError ?? "", /Terminal material/);
  assert.equal(h.value.cancelledState, "cancelled"); assert.equal(h.value.unchanged, true);
});

const start = `await tools.call({ref:'arbor.start',args:{runId:'material'}});`;
const candidate = `await act('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'native candidate',rationale:'WRITE GOOD',sourceRefs:[]},'propose');await act('dispatch',{nodeId:'one',attemptId:'one'},'dispatch');await act('evaluate',{attemptId:'one',evaluationId:'candidate'},'evaluate');`;
const keep = `const kept=await act('decide',{decisionId:'keep-one',nodeId:'one',decision:'keep',evidenceIds:['candidate']},'keep');`;
test("PR5 installed native owner writes/commits/stages only candidate, evaluator loads exact frozen material, keep/export preserves dirty source", { timeout: 270000 }, async t => {
  const h = await host(`${start}${candidate}${keep}const exported=await act('export',{},'export');const p=await get();return JSON.stringify({kept,exported,p});`, { installed: true }); t.after(() => h.store.close());
  assert.equal(h.value.kept.status, "applied", h.root); const e = h.store.evaluation("material", "candidate")!; assert.deepEqual(e.invocations.map(i => i.score), ["0", "1"]);
  assert.ok(h.events.some(e => e.event === "material.worker" && e.data.didTool)); assert.ok(h.events.filter(e => e.event === "material.subject").every(e => e.data.tools.length === 0));
  const workers = h.events.filter(e => e.event === "material.worker");
  assert.ok(workers.every(e => e.data.text.includes("ARBOR_OPERATIONAL_BOOTSTRAP_V1") && e.data.text.includes("ARBOR_EXECUTOR_V1")));
  assert.ok(workers.every(e => e.data.tools.includes("bash") && !e.data.tools.includes("fabric_exec")));
  assert.ok(h.value.p.run.spec.roleBundle.directory.startsWith(join(h.root, "state")));
  const exported = JSON.parse(await readFile(h.value.exported.value.path, "utf8")); assert.match(exported.materialDelta.patch, /worker staged/); assert.doesNotMatch(exported.materialDelta.patch, /USER STAGED|source committed/);
  assert.equal(h.value.p.run.material.pending, null); assert.equal(h.events.filter(e => e.event === "main.inference").length, 2);
});
test("PR6 installed package role change then real reload/resume preserves worker bootstrap; new incompatible start blocks", { timeout: 270000 }, async t => {
  const h = await host(`${start}const original=(await get()).run.spec.roleBundle;await pi.write({path:installedPackageRoot+'/skills/fabric-arbor/roles/executor.md',text:'INCOMPATIBLE_PACKAGE_UPDATE'});await act('control','pause','pause-role');await components.reload({id:'arbor'});await act('control','resume','resume-role');${candidate}${keep}let blocked;try{await tools.call({ref:'arbor.start',args:{runId:'incompatible-new-run'}})}catch(e){blocked=String(e)}return JSON.stringify({kept,original,blocked,missing:await tools.call({ref:'arbor.inspect',args:{runId:'incompatible-new-run'}}),p:await get()});`, { installed: true }); t.after(() => h.store.close());
  assert.equal(h.value.kept.status, "applied", h.root); assert.deepEqual(h.value.p.run.spec.roleBundle, h.value.original);
  assert.match(h.value.blocked, /incompatible bootstrap.*executor/); assert.equal(h.value.missing, null);
  const workers = h.events.filter(e => e.event === "material.worker"); assert.ok(workers.length > 0);
  assert.ok(workers.every(e => e.data.text.includes("ARBOR_EXECUTOR_V1") && !e.data.text.includes("INCOMPATIBLE_PACKAGE_UPDATE")));
  assert.equal(h.value.p.attempts.length, 1); assert.deepEqual(h.store.evaluation("material", "candidate")!.invocations.map(i => i.score), ["0", "1"]);
  assert.equal(h.events.filter(e => e.event === "main.inference").length, 2);
});
test("PR5 native non-Git input uses owned repo and command metric before failure cannot win", { timeout: 240000 }, async t => {
  const h = await host(`${start}await act('evaluate',{attemptId:'baseline',evaluationId:'initial'},'initial-eval');${candidate}${keep}return JSON.stringify({kept,p:await get()});`, { nonGit: true, command: true, failedMetric: true }); t.after(() => h.store.close());
  assert.equal(h.value.kept.status, "blocked", h.root); const e = h.store.evaluation("material", "candidate")!; assert.equal(e.validity, "invalid"); assert.equal(e.invocations.at(-1)!.native!.exitCode, 4); await assert.rejects(readFile(join(h.cwd, ".git")));
});

test("PR5 native late worker cancellation awaits owned settlement and retains source/index/refs and candidate artifacts", { timeout: 240000 }, async t => {
  const h = await host(`${start}await act('evaluate',{attemptId:'baseline',evaluationId:'initial'},'initial-eval');await act('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'cancel candidate',rationale:'WRITE GOOD',sourceRefs:[]},'propose');const active=act('dispatch',{nodeId:'one',attemptId:'one'},'dispatch');await Promise.race([tools.call({ref:'pr2fixture.ready',args:{}}),active.then(()=>{throw new Error('Missing native barrier')})]);const cancelling=act('control','cancel','cancel');await tools.call({ref:'pr2fixture.release',args:{}});const results=await Promise.allSettled([active,cancelling]);const p=await get();const members=await agents.members({scope:'local',kinds:['agent']});return JSON.stringify({results,p,live:members.filter(m=>!['completed','failed','stopped','timed_out'].includes(m.status))});`, { command: true, hold: "agents.spawn" }); t.after(() => h.store.close());
  assert.equal(h.value.p.run.state, "cancelled", h.root); assert.deepEqual(h.value.live, []); assert.equal(h.value.p.run.active, 0); assert.equal(h.value.p.run.material.incumbent, h.value.p.run.material.capture.baseline);
});

test("PR5 native dirty baseline interruption reloads owner, re-observes completion without duplicate dispatch; uncertain deadline requires a charged fresh baseline", { timeout: 240000 }, async t => {
  const h = await host(`const starting=tools.call({ref:'arbor.start',args:{runId:'material'}});await Promise.race([tools.call({ref:'pr2fixture.ready',args:{}}),starting.then(()=>{throw new Error('Missing evaluation wait barrier')})]);const reload=components.reload({id:'arbor'});await tools.call({ref:'pr2fixture.release',args:{}});const interrupted=await starting;await reload;const before=await get();const r=before.run;const resumed=await tools.call({ref:'arbor.control',args:{runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:'resume',action:'resume'}});const recovered=await get();if(!recovered.run.material.baselineEvaluation)await act('evaluate',{attemptId:'baseline',evaluationId:'fresh-baseline',purpose:'recheck'},'fresh-baseline');${candidate}${keep}return JSON.stringify({interrupted,resumed,kept,p:await get()});`, { hold: "agents.wait" }); t.after(() => h.store.close());
  assert.equal(h.value.interrupted.evaluations[0].state, "INTERRUPTED", h.root); assert.equal(h.value.resumed.status, "applied", h.root); assert.equal(h.value.kept.status, "applied", h.root);
  const initial = h.store.evaluation("material", "evaluation-initial")!; assert.equal(initial.invocations.length, 2); assert.equal(initial.bindings.length, 2); assert.equal(initial.validity, "invalid"); assert.equal(h.value.p.run.material.baselineEvaluation, "fresh-baseline"); assert.equal(h.events.filter(e => e.event === "material.subject").length, 6);
});
