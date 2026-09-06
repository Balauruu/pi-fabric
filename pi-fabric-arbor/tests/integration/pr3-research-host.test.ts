import assert from "node:assert/strict";
import { execFile, execFileSync, spawn, type ExecFileException } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import test from "node:test";
import { workerModel } from "../fixtures/pr2-worker-model.js";
import { ARBOR_ACTIONS } from "../../src/managed/contracts.js";
import { ACTOR_PROPOSAL_SCHEMA, digest } from "../../src/research/contracts.js";
const exec = promisify(execFile), APP = resolve(process.cwd()), MODULES = join(APP, "node_modules"), PI = join(MODULES, ".bin/pi");
const fabricManifest = JSON.parse(await readFile(join(MODULES, "pi-fabric/package.json"), "utf8"));
const FABRIC = resolve(MODULES, "pi-fabric", fabricManifest.exports["."].import);
const flags = ["--approve", "--offline", "--no-session", "--no-skills", "--no-prompt-templates", "--no-themes", "--provider", "arbor-pr2-fake", "--model", "deterministic", "--thinking", "off", "-e", FABRIC];
async function setup(scenario: string, program: string, options: { hold?: string; invalid?: string; choice?: string; write?: string; execute?: string; agent?: string; schema?: string; expectedOuterFailure?: boolean } = {}) {
  const base = join(APP, ".runtime/pr3-host"); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, `${scenario}-`)), cwd = join(root, "material"), profile = join(root, "profile"), trace = join(root, "trace.jsonl");
  await mkdir(join(cwd, ".pi"), { recursive: true }); await mkdir(join(profile, "extensions"), { recursive: true });
  await symlink(MODULES, join(profile, "node_modules"), "dir"); await symlink(join(APP, "tests/fixtures/pr2-fake-provider.ts"), join(profile, "extensions/fake.ts"));
  await writeFile(join(profile, "settings.json"), JSON.stringify({ packages: [APP], defaultProjectTrust: "yes" }));
  await writeFile(join(profile, "arbor.defaults.json"), JSON.stringify({ objective: { direction: "minimize", unit: "profile-unit" }, roles: { coordinator: "arbor-pr2-fake/deterministic" } }));
  await writeFile(join(cwd, "arbor.config.json"), JSON.stringify({ objective: { unit: "project-unit" }, roles: { executor: "arbor-pr2-fake/deterministic" } }));
  const worker = await workerModel(trace);
  await writeFile(join(profile, "models.json"), JSON.stringify({ providers: { "arbor-pr2-fake": { baseUrl: worker.baseUrl, api: "openai-completions", apiKey: "local-fake", models: [{ id: "deterministic", reasoning: false, contextWindow: 128000, maxTokens: 2048 }] } } }));
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.email", "pr3@example.invalid"); git("config", "user.name", "PR3"); await writeFile(join(cwd, "material.txt"), "Fixed PR3 instructions\n"); git("add", "material.txt"); git("commit", "-m", "fixture");
  await writeFile(join(cwd, ".pi/fabric.json"), JSON.stringify({ configVersion: 4, fullCodeMode: true, executor: { timeoutMs: 120000, maxTimeoutMs: 180000 }, approvals: { read: "allow", write: options.write ?? "allow", execute: options.execute ?? "deny", network: "deny", agent: options.agent ?? "allow" }, agents: { enabled: true, model: "arbor-pr2-fake/deterministic", runner: "pi", thinking: "off", transport: "process", timeoutMs: 30000, extensions: true, defaultTools: [], maxConcurrent: 2, maxPerExecution: 16, maxDepth: 1, retainRuns: true, notifyOnComplete: true, sessionExport: false }, components: [{ id: "arbor", component: "arbor", config: { stateDirectory: join(root, "state") } }], mesh: { enabled: true, actorScope: "project", root: join(root, "mesh") }, ui: { enabled: false }, schema: { mode: options.schema ?? "off" } }));
  const env = { ...process.env }; for (const key of Object.keys(env)) if (key.startsWith("PI_") || key.startsWith("ARBOR_")) delete env[key];
  Object.assign(env, { HOME: join(root, "home"), PI_CODING_AGENT_DIR: profile, PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1", ARBOR_PR2_TRACE: trace, ARBOR_PR2_PROGRAM: program, ARBOR_PR2_HOLD: options.hold ?? "", ARBOR_PR3_INVALID: options.invalid ?? "", ARBOR_PR3_CHOICE: options.choice ?? "" });
  return { root, cwd, profile, trace, env, worker };
}
async function events(path: string): Promise<any[]> { return (await readFile(path, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line)); }
async function printHost(scenario: string, program: string, options: Parameters<typeof setup>[2] = {}) {
  const h = await setup(scenario, program, options);
  const pending = exec(PI, [...flags, "--mode", "json", "-p", "Execute deterministic PR3 host gate"], { cwd: h.cwd, env: h.env, timeout: 150000, maxBuffer: 8 * 1024 * 1024 }); pending.child.stdin?.end();
  let failure: ExecFileException | undefined;
  const result = await pending.catch(error => { failure = error; return { stdout: error.stdout ?? "", stderr: error.stderr ?? String(error) }; }).finally(() => h.worker.close());
  const exit = { code: pending.child.exitCode, signal: pending.child.signalCode, killed: pending.child.killed, error: failure ? String(failure) : null };
  await writeFile(join(h.root, "host-output.txt"), String(result.stdout) + "\n" + String(result.stderr)); await writeFile(join(h.root, "host-output.txt.exit.json"), JSON.stringify(exit));
  assert.deepEqual(exit, { code: 0, signal: null, killed: false, error: null }, h.root); assert.match(String(result.stdout), /ARBOR_PR2_HOST_COMPLETE/, h.root);
  const trace = await events(h.trace); const last = trace.filter(e => e.event === "main.result").at(-1);
  let value: any; try { value = options.expectedOuterFailure ? { outerFailure: String(last.data) } : JSON.parse(last.data); } catch { assert.fail(`${h.root}: ${String(last?.data).slice(0, 1500)}`); }
  return { ...h, events: trace, value };
}
const start = 'await tools.call({ref:"arbor.start",args:{runId:"research",overrides:{objective:{minimumGain:"0.000000000000000001"}}}})';
const deferredStart = 'await tools.call({ref:"arbor.start",args:{runId:"research",overrides:{execution:"deferred"}}})';
const bindingFunction = 'const bind=(p,id)=>({runId:p.run.id,materialId:p.run.spec.source.materialId,epoch:p.run.epoch,revision:p.run.revision,commandId:id});';

test("PR3 real native owner: exact effective schemas, actor proposals, owned waits, origins and no scored claims", { timeout: 180000 }, async () => {
  const expected = ARBOR_ACTIONS.map(a => ({ name: a.name, inputSchema: a.inputSchema, risk: a.risk, effect: a.effect }));
  const h = await printHost("native", `
    const before=await agents.members({scope:"local",kinds:["actor","agent"]});
    const expected=${JSON.stringify(expected)}; const expectedOutputs=${JSON.stringify({ receipt: ARBOR_ACTIONS.find(a=>a.name==="control")!.outputSchema, projection: ARBOR_ACTIONS.find(a=>a.name==="inspect")!.outputSchema })}; const schemaChecks=[];
    for(const e of expected){const a=await tools.describe({ref:"arbor."+e.name});schemaChecks.push({name:e.name,input:JSON.stringify(a.inputSchema)===JSON.stringify(e.inputSchema),output:e.name.startsWith("substrate") || JSON.stringify(a.outputSchema)===JSON.stringify(e.name==="start"||e.name==="inspect"?expectedOutputs.projection:expectedOutputs.receipt),risk:a.risk===e.risk,effect:JSON.stringify(a.effect)===JSON.stringify(e.effect)});}
    const p=${start}; const duplicate=${start}; const members=await agents.members({scope:"local",kinds:["actor","agent"]});
    return JSON.stringify({before,schemaChecks,p,duplicate,members});`);
  const { p, duplicate, members } = h.value;
  assert.deepEqual(h.value.before, []); assert.ok(h.value.schemaChecks.every((s: any) => s.input && s.output && s.risk && s.effect), JSON.stringify(h.value.schemaChecks));
  assert.deepEqual(p, duplicate); assert.equal(p.run.attemptsUsed, 1); assert.equal(p.run.active, 0); assert.equal(p.attempts[0].state, "completed"); assert.equal(p.evaluations.length, 0); assert.match(p.validation, /unscored/);
  assert.equal(p.run.spec.origins["objective.direction"], "profile"); assert.equal(p.run.spec.origins["objective.unit"], "project"); assert.equal(p.run.spec.origins["objective.minimumGain"], "explicit");
  assert.equal(p.run.spec.roles.coordinator.origin, "profile"); assert.equal(p.run.spec.roles.executor.origin, "project"); assert.equal(p.run.spec.roles.subject.model, null);
  assert.ok(members.every((m: any) => ["completed", "failed", "stopped", "timed_out"].includes(m.status)));
  const asks = h.events.filter(e => e.event === "actor.observed"), workers = h.events.filter(e => e.event === "worker.observed");
  assert.deepEqual(asks.map(e => e.data.data.attempts.length), [0, 0, 1]); assert.equal(workers.length, 1); assert.equal(digest(asks[0].data.data.contract), digest(ACTOR_PROPOSAL_SCHEMA));
  assert.ok(h.events.filter(e => /restrictions/.test(e.event)).every(e => !/UNEXPECTED_SUCCESS/.test(e.data)));
  const native = h.events.filter(e => e.event === "native.result");
  assert.ok(native.find(e => e.data.ref === "agents.ask").at <= workers[0].at);
  assert.ok(native.find(e => e.data.ref === "agents.wait").at <= asks[2].at);
  assert.equal(h.events.filter(e => e.event === "main.inference").length, 2);
  assert.equal(await readFile(join(h.cwd, "material.txt"), "utf8"), "Fixed PR3 instructions\n");
});

for (const invalid of ["self-approval", "stale"]) test(`real actor ${invalid} proposal cannot commit or dispatch`, { timeout: 180000 }, async () => {
  const h = await printHost(invalid, `return JSON.stringify(${start});`, { invalid });
  assert.equal(h.value.run.state, "failed", h.root); assert.equal(h.value.nodes.length, 0); assert.equal(h.value.attempts.length, 0); assert.equal(h.events.filter(e => e.event === "worker.observed").length, 0);
});

test("real concurrent duplicate/stale controls and frozen resume preserve one transaction", { timeout: 180000 }, async () => {
  const h = await printHost("controls", `${bindingFunction} const p=${deferredStart}; const args={...bind(p,"pause"),action:"pause"};
    const results=await Promise.all([tools.call({ref:"arbor.control",args}),tools.call({ref:"arbor.control",args})]);
    let stale="",forged="";try{await tools.call({ref:"arbor.control",args:{...args,commandId:"stale"}})}catch(e){stale=String(e)}
    try{await tools.call({ref:"arbor.review",args:{...bind(p,"forged"),decisionId:"x",approved:true}})}catch(e){forged=String(e)}
    await pi.write({path:"arbor.config.json",text:JSON.stringify({objective:{unit:"changed-default"}})});
    const frozen=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const resume=await tools.call({ref:"arbor.control",args:{...bind(frozen,"resume"),action:"resume"}});
    const after=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});return JSON.stringify({p,results,stale,forged,resume,after});`);
  assert.deepEqual(h.value.results[0], h.value.results[1]); assert.match(h.value.stale, /Stale/); assert.match(h.value.forged, /additional|unknown|approved/i); assert.equal(h.value.after.controls.length, 2); assert.deepEqual(h.value.after.run.spec, h.value.p.run.spec); assert.equal(h.value.after.run.spec.config.objective.unit, "project-unit");
});

test("real concurrent duplicate dispatch during held actor ask reserves and spawns exactly once", { timeout: 180000 }, async () => {
  const h = await printHost("duplicate-dispatch", `${bindingFunction}
    const active=tools.call({ref:"arbor.start",args:{runId:"research"}});await tools.call({ref:"pr2fixture.ready",args:{}});
    let p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    await tools.call({ref:"arbor.propose",args:{...bind(p,"manual-propose"),payload:{nodeId:"manual",type:"hypothesis",parentId:null,title:"Inspect",rationale:"Inspect material.txt",sourceRefs:[]}}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});const args={...bind(p,"reserve"),payload:{nodeId:"manual",attemptId:"manual-attempt"}};
    const results=await Promise.all([tools.call({ref:"arbor.dispatch",args}),tools.call({ref:"arbor.dispatch",args})]);
    await tools.call({ref:"pr2fixture.release",args:{}});await active;
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});return JSON.stringify({results,p});`, { hold: "agents.ask" });
  assert.deepEqual(h.value.results[0], h.value.results[1]); assert.equal(h.value.p.run.attemptsUsed, 1); assert.equal(h.value.p.run.active, 0); assert.equal(h.value.p.attempts.length, 1); assert.equal(h.events.filter(e => e.event === "worker.observed").length, 1); assert.match(h.value.p.run.error, /Stale/);
});

for (const policy of ["deny", "ask"]) test(`Fabric ${policy} write policy blocks owner mutation before domain effects in print host`, { timeout: 180000 }, async () => {
  const h = await printHost(`policy-${policy}`, `${bindingFunction} const p=${deferredStart};let denied="";try{await tools.call({ref:"arbor.propose",args:{...bind(p,"write"),payload:{nodeId:"n",type:"hypothesis",parentId:null,title:"x",rationale:"x",sourceRefs:[]}}})}catch(e){denied=String(e)}return JSON.stringify({denied,p:await tools.call({ref:"arbor.inspect",args:{runId:"research"}})});`, { write: policy });
  assert.match(h.value.denied, /denied|approval|permission|interactive/i); assert.equal(h.value.p.nodes.length, 0); assert.equal(h.value.p.run.revision, 0);
});

test("Schema enforce is unavailable: retain installed host initialization failure and block real command before inference", { timeout: 180000 }, async () => {
  // This is NOT a passing exact-reference Schema guard probe. The installed
  // host fails earlier. Preserve and name that limitation rather than hiding it.
  const h = await printHost("schema-enforce-unavailable", `let denied="";try{${deferredStart}}catch(e){denied=String(e)}return JSON.stringify({denied});`, { schema: "enforce", expectedOuterFailure: true });
  assert.match(h.value.outerFailure, /^Fabric provider component manifest mismatch\. Missing: extensions\. Unexpected: none\.$/);
  assert.equal(h.events.filter(e => e.event === "native.result" && e.data.ref.startsWith("arbor.")).length, 0);
  assert.equal(existsSync(join(h.root, "state/research.sqlite3")), false);
  const command = await rpc("schema-command", "throw new Error('must not infer')", '/arbor start {"runId":"blocked"}', () => undefined, "allow", "enforce", false);
  assert.equal(command.events.length, 0); assert.equal(existsSync(join(command.root, "state/research.sqlite3")), false);
  const notices = command.records.filter(r => r.type === "extension_ui_request" && r.method === "notify").map(r => r.message).join("\n");
  assert.match(notices, /research unavailable; no action submitted/); assert.match(notices, /Schema enforce/);
});

async function rpc(scenario: string, program: string, prompt: string, respond: (record: any) => string | undefined, write = "allow", schema = "off", expectTurn = true, options: Parameters<typeof setup>[2] = {}) {
  const h = await setup(scenario, program, { ...options, write, schema });
  const child = spawn(PI, [...flags, "--mode", "rpc"], { cwd: h.cwd, env: h.env, stdio: ["pipe", "pipe", "pipe"] });
  const records: any[] = []; let buffer = "", stderr = "";
  try {
    await new Promise<void>((done, reject) => {
      const timer = setTimeout(() => reject(new Error(`RPC timeout ${h.root}: ${stderr.slice(-2000)}`)), 120000);
      child.on("error", error => { clearTimeout(timer); reject(error); });
      child.stderr.on("data", data => { stderr += String(data); });
      child.stdout.on("data", data => {
        buffer += String(data);
        for (;;) {
          const newline = buffer.indexOf("\n"); if (newline < 0) break;
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); if (!line) continue;
          let record: any; try { record = JSON.parse(line); } catch (error) { clearTimeout(timer); reject(error); return; }
          records.push(record);
          if (record.type === "extension_ui_request" && record.method === "select") { const value = respond(record); child.stdin.write(JSON.stringify({ type: "extension_ui_response", id: record.id, ...(value ? { value } : { cancelled: true }) }) + "\n"); }
          if (record.type === "agent_end" || (!expectTurn && record.type === "response" && record.id === "pr3")) { clearTimeout(timer); done(); }
        }
      });
      child.stdin.write(JSON.stringify({ type: "prompt", id: "pr3", message: prompt }) + "\n");
    });
    child.stdin.end();
    const exit = await new Promise<{ code: number | null; signal: string | null }>(done => child.once("exit", (code, signal) => done({ code, signal })));
    await writeFile(join(h.root, "rpc-exit.json"), JSON.stringify(exit)); assert.deepEqual(exit, { code: 0, signal: null }, h.root);
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    await writeFile(join(h.root, "rpc-output.json"), JSON.stringify({ records, stderr }, null, 2)); await h.worker.close();
  }
  return { ...h, records, events: existsSync(h.trace) ? await events(h.trace) : [] };
}

test("real owning-Pi RPC review captures actual user receipt after distinct Fabric ask permission", { timeout: 180000 }, async () => {
  const program = `${bindingFunction} let p=${deferredStart};
    await tools.call({ref:"arbor.decide",args:{...bind(p,"request-review"),payload:{decisionId:"review-choice",nodeId:null,decision:"request_review",evidenceIds:[]}}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});const args={...bind(p,"user-review"),decisionId:"review-choice"};
    const receipt=await tools.call({ref:"arbor.review",args});const duplicate=await tools.call({ref:"arbor.review",args});
    let stale="",forged="";try{await tools.call({ref:"arbor.review",args:{...args,commandId:"stale-review"}})}catch(e){stale=String(e)}
    try{await tools.call({ref:"arbor.review",args:{...args,commandId:"forged-review",approved:true}})}catch(e){forged=String(e)}
    return JSON.stringify({receipt,duplicate,stale,forged,p:await tools.call({ref:"arbor.inspect",args:{runId:"research"}})});`;
  const h = await rpc("review", program, "Execute the PR3 review gate", record => record.options.includes("Approve research choice") ? "Approve research choice" : record.options.find((o: string) => /Allow once/i.test(o)), "ask");
  const result = JSON.parse(h.events.filter(e => e.event === "main.result").at(-1)!.data);
  assert.match(result.stale, /Stale/); assert.match(result.forged, /additional|approved|unknown/i);
  assert.deepEqual(result.receipt, result.duplicate); assert.equal(result.receipt.value.response, "Approve research choice"); assert.equal(result.receipt.value.owner.sessionId, result.p.run.owner.sessionId); assert.equal(result.receipt.value.materialId, result.p.run.spec.source.materialId);
  const choices = h.records.filter(r => r.type === "extension_ui_request" && r.method === "select");
  assert.equal(choices.filter(r => r.options.includes("Approve research choice")).length, 1); assert.ok(choices.filter(r => r.options.some((o: string) => /Allow once/i.test(o))).length >= 3);
  assert.equal(result.p.evaluations.length, 0); assert.equal(result.p.decisions[0].status, "approved-choice-only");
});

test("repair: real RPC renewed direction review rejects without retaining an old approval", { timeout: 180000 }, async () => {
  const program = `${bindingFunction}
    let p=await tools.call({ref:"arbor.start",args:{runId:"research",overrides:{execution:"deferred",search:{mode:"direction"}}}});
    const refresh=async()=>p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    await tools.call({ref:"arbor.propose",args:{...bind(p,"direction"),payload:{nodeId:"direction",type:"direction",parentId:null,title:"Direction",rationale:"Inspect",sourceRefs:[]}}});
    const receipts=[];let firstArgs;
    for(const id of ["first","renewed"]){
      await refresh();await tools.call({ref:"arbor.decide",args:{...bind(p,"request-"+id),payload:{decisionId:id,nodeId:"direction",decision:"request_review",evidenceIds:[]}}});
      await refresh();const args={...bind(p,"review-"+id),decisionId:id};if(id==="first")firstArgs=args;
      receipts.push(await tools.call({ref:"arbor.review",args}));
    }
    const replay=await tools.call({ref:"arbor.review",args:firstArgs});
    await refresh();await tools.call({ref:"arbor.control",args:{...bind(p,"resume"),action:"resume"}});
    await refresh();let denied="";
    try{await tools.call({ref:"arbor.propose",args:{...bind(p,"bypass"),payload:{nodeId:"child",type:"hypothesis",parentId:"direction",title:"Child",rationale:"Inspect",sourceRefs:[]}}})}catch(e){denied=String(e)}
    return JSON.stringify({receipts,replay,denied,p:await refresh()});`;
  let choices = 0;
  const h = await rpc("renewed-review", program, "Execute renewed direction review", record => record.options.includes("Approve research choice") ? (++choices === 1 ? "Approve research choice" : "Reject research choice") : record.options.find((o: string) => /Allow once/i.test(o)), "ask");
  const result = JSON.parse(h.events.filter(e => e.event === "main.result").at(-1)!.data);
  assert.equal(choices, 2); assert.deepEqual(result.replay, result.receipts[0]);
  assert.deepEqual(result.receipts.map((r: any) => r.value.response), ["Approve research choice", "Reject research choice"]);
  assert.deepEqual(result.receipts[1].value.owner, result.p.run.owner);
  assert.equal(result.p.nodes[0].reviewed, false); assert.match(result.denied, /review/);
  assert.equal(result.p.nodes.length, 1); assert.equal(result.p.run.attemptsUsed, 0);
  assert.equal(h.events.filter(e => e.event === "native.result" && e.data.ref === "agents.spawn").length, 0);
  assert.equal(await readFile(join(h.cwd, "material.txt"), "utf8"), "Fixed PR3 instructions\n");
});

for (const response of ["Approve research choice", "Reject research choice"]) test(`repair: native actor request_review settles before actual RPC ${response}`, { timeout: 180000 }, async () => {
  const program = `${bindingFunction} const settled=${start};
    const args={...bind(settled,"native-user-review"),decisionId:"native-review"};
    const receipt=await tools.call({ref:"arbor.review",args});
    const duplicate=await tools.call({ref:"arbor.review",args});
    let stale="";try{await tools.call({ref:"arbor.review",args:{...args,commandId:"stale-dialog",revision:args.revision-1}})}catch(e){stale=String(e)}
    return JSON.stringify({settled,receipt,duplicate,stale,p:await tools.call({ref:"arbor.inspect",args:{runId:"research"}})});`;
  const h = await rpc("native-review", program, "Execute native PR3 review gate", record => record.options.includes(response) ? response : record.options.find((o: string) => /Allow once/i.test(o)), "ask", "off", true, { choice: "request-review" });
  const raw = h.events.filter(e => e.event === "main.result").at(-1)!.data;
  assert.doesNotMatch(raw, /Stale pending review revision/, h.root);
  const result = JSON.parse(raw);
  assert.equal(result.settled.run.state, "awaiting_review");
  assert.match(result.settled.run.execution, /native-observation-settled/);
  assert.equal(result.settled.decisions[0].revision, result.settled.run.revision);
  assert.equal(result.settled.events.at(-1).type, "settlement");
  assert.equal(result.settled.run.active, 0); assert.equal(result.settled.attempts[0].state, "completed");
  assert.equal(result.receipt.value.revision, result.settled.run.revision);
  assert.equal(result.receipt.value.epoch, result.settled.run.epoch);
  assert.deepEqual(result.receipt.value.owner, result.settled.run.owner);
  assert.equal(result.receipt.value.materialId, result.settled.run.spec.source.materialId);
  assert.equal(result.receipt.value.response, response); assert.deepEqual(result.receipt, result.duplicate);
  assert.match(result.stale, /Stale/); assert.equal(result.p.run.pendingDecisionId, null);
  assert.equal(result.p.decisions[0].status, response.startsWith("Approve") ? "approved-choice-only" : "rejected");
  const choices = h.records.filter(r => r.type === "extension_ui_request" && r.method === "select");
  assert.equal(choices.filter(r => r.options.includes(response)).length, 1);
  assert.ok(choices.some(r => r.options.some((o: string) => /Allow once/i.test(o))));
  assert.equal(h.events.filter(e => e.event === "actor.observed").length, 3);
  assert.equal(h.events.filter(e => e.event === "worker.observed").length, 1);
  const asks = h.events.filter(e => e.event === "native.result" && e.data.ref === "agents.ask");
  assert.equal(asks.at(-1).data.result.data.payload.decision, "request_review");
  assert.equal(h.events.filter(e => e.event === "main.inference").length, 2);
});

for (const mode of ["direction", "collaborative"]) test(`repair: real native ${mode} root dispatch cannot bypass direction approval`, { timeout: 180000 }, async () => {
  const h = await printHost(`direction-${mode}`, `return JSON.stringify(await tools.call({ref:"arbor.start",args:{runId:"research",overrides:{search:{mode:${JSON.stringify(mode)}}}}}));`);
  assert.equal(h.value.run.spec.config.search.mode, mode);
  assert.equal(h.value.run.state, "failed"); assert.match(h.value.run.error, /approved direction/i);
  assert.equal(h.value.nodes[0].type, "hypothesis"); assert.equal(h.value.nodes[0].parentId, null);
  assert.equal(h.value.run.attemptsUsed, 0); assert.equal(h.value.run.active, 0); assert.equal(h.value.attempts.length, 0);
  assert.equal(h.events.filter(e => e.event === "worker.observed").length, 0);
  assert.equal(h.events.filter(e => e.event === "native.result" && e.data.ref === "agents.spawn").length, 0);
});

test("real /arbor command uses native model/Fabric path and returns actual provider result", { timeout: 180000 }, async () => {
  const h = await rpc("command", "throw new Error('command must not use fixture program')", '/arbor start {"runId":"command-run","overrides":{"execution":"deferred","material":{"kind":"instructions"}}}', () => undefined);
  const starts = h.events.filter(e => e.event === "native.result" && e.data.ref === "arbor.start"); assert.equal(starts.length, 1, h.root); assert.equal(starts[0].data.result.run.id, "command-run"); assert.equal(starts[0].data.result.run.spec.config.material.kind, "instructions");
  assert.ok(h.records.some(r => r.type === "extension_ui_request" && /not yet a control receipt/.test(r.message ?? "")));
});

for (const action of ["pause", "cancel"]) test(`real ${action} wins a held actor boundary without late dispatch`, { timeout: 180000 }, async () => {
  const h = await printHost(`boundary-${action}`, `${bindingFunction}
    const active=tools.call({ref:"arbor.start",args:{runId:"research"}});await tools.call({ref:"pr2fixture.ready",args:{}});
    const p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const control=tools.call({ref:"arbor.control",args:{...bind(p,"control"),action:${JSON.stringify(action)}}});
    await tools.call({ref:"pr2fixture.release",args:{}});const [result,receipt]=await Promise.all([active,control]);
    return JSON.stringify({result,receipt,members:await agents.members({scope:"local",kinds:["actor","agent"]})});`, { hold: "agents.ask" });
  assert.equal(h.value.result.run.state, action === "pause" ? "paused" : "cancelled"); assert.equal(h.value.result.run.attemptsUsed, 0);
  assert.equal(h.value.receipt.status, action === "cancel" ? "queued" : "applied"); assert.equal(h.events.filter(e => e.event === "worker.observed").length, 0);
  assert.ok(h.value.members.every((m: any) => ["completed", "failed", "stopped", "timed_out"].includes(m.status)));
});

test("real six owner operations collect/distill evidence and reject scored/apply claims; CLI reads generated export without writes", { timeout: 180000 }, async () => {
  const h = await printHost("operations", `${bindingFunction} let p=${start};
    const collectArgs={...bind(p,"collect"),payload:{attemptId:"native-attempt"}};
    const collected=await Promise.all([tools.call({ref:"arbor.collect",args:collectArgs}),tools.call({ref:"arbor.collect",args:collectArgs})]);
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const distilled=await tools.call({ref:"arbor.distill",args:{...bind(p,"distill"),payload:{lessonId:"lesson",nodeId:"native-hypothesis",insight:"Native inspection settled",limitations:"Unscored observation",evidenceIds:[p.attempts[0].evidenceId]}}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const evaluated=await tools.call({ref:"arbor.evaluate",args:{...bind(p,"evaluate"),payload:{attemptId:"native-attempt",evaluationId:"evaluation"}}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const kept=await tools.call({ref:"arbor.decide",args:{...bind(p,"keep"),payload:{decisionId:"keep",nodeId:"native-hypothesis",decision:"keep",evidenceIds:[p.attempts[0].evidenceId]}}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const applied=await tools.call({ref:"arbor.apply",args:{...bind(p,"apply"),decisionId:"keep"}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const exported=await tools.call({ref:"arbor.export",args:{...bind(p,"export"),format:"json"}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const evidenceBefore=p.artifact_refs.find(r=>r.id===p.attempts[0].evidenceId);
    const collision=await tools.call({ref:"arbor.export",args:{...bind(p,p.attempts[0].evidenceId),format:"json"}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const exportRef=p.artifact_refs.find(r=>r.path===collision.value.path);
    let forged="";try{await tools.call({ref:"arbor.distill",args:{...bind(p,"forged-export-evidence"),payload:{lessonId:"forged",nodeId:"native-hypothesis",insight:"Forged export",limitations:"Unscored",evidenceIds:[exportRef.id]}}})}catch(e){forged=String(e)}
    return JSON.stringify({collected,distilled,evaluated,kept,applied,exported,collision,evidenceBefore,forged,p:await tools.call({ref:"arbor.inspect",args:{runId:"research"}})});`, { execute: "allow" });
  assert.deepEqual(h.value.collected[0], h.value.collected[1]); assert.equal(h.value.distilled.status, "applied");
  for (const result of [h.value.evaluated, h.value.kept, h.value.applied]) assert.equal(result.status, "blocked");
  assert.equal(h.value.p.evaluations.length, 0); assert.equal(h.value.p.lessons.length, 1);
  assert.equal(h.value.p.artifact_refs.length, 3); assert.equal(h.value.collision.status, "applied"); assert.match(h.value.forged, /evidence/);
  const evidence = h.value.p.artifact_refs.find((r: any) => r.id === h.value.p.attempts[0].evidenceId);
  assert.deepEqual(evidence, h.value.evidenceBefore); assert.equal(evidence.kind, "native-evidence");
  assert.equal(evidence.attemptId, h.value.p.attempts[0].id); assert.equal(evidence.generation, h.value.p.run.generation);
  const db = join(h.root, "state/research.sqlite3"), before = await readFile(db);
  const cli = await exec(process.execPath, [join(APP, "bin/pi-fabric-arbor.mjs"), "inspect", "--file", h.value.exported.value.path], { cwd: APP });
  assert.equal(JSON.parse(cli.stdout).run.id, "research"); assert.deepEqual(await readFile(db), before);
  assert.equal(await readFile(join(h.cwd, "material.txt"), "utf8"), "Fixed PR3 instructions\n");
});

test("a second real native root cannot mutate or resume frozen research facts", { timeout: 180000 }, async () => {
  const h = await printHost("second-root", `return JSON.stringify(${deferredStart});`);
  const db = join(h.root, "state/research.sqlite3"), before = await readFile(db);
  const program = `let denied="";try{${deferredStart}}catch(e){denied=String(e)}return JSON.stringify({denied,native:await agents.self()});`;
  const pending = exec(PI, [...flags, "--mode", "json", "-p", "Attempt denied adoption"], { cwd: h.cwd, env: { ...h.env, ARBOR_PR2_PROGRAM: program }, timeout: 60000, maxBuffer: 4*1024*1024 }); pending.child.stdin?.end();
  let failure: unknown; const result = await pending.catch(error => { failure=error; return { stdout:error.stdout ?? "",stderr:error.stderr ?? String(error) }; });
  await writeFile(join(h.root,"second-host-output.txt"), result.stdout+"\n"+result.stderr);
  const exit = { code:pending.child.exitCode,signal:pending.child.signalCode,killed:pending.child.killed,error:failure?String(failure):null }; await writeFile(join(h.root,"second-host-exit.json"),JSON.stringify(exit));
  assert.deepEqual(exit,{code:0,signal:null,killed:false,error:null});
  const final = JSON.parse((await events(h.trace)).filter(e=>e.event==="main.result").at(-1).data);
  assert.match(final.denied,/Different native owning Pi/); assert.notEqual(final.native.id,h.value.run.owner.id); assert.deepEqual(await readFile(db),before);
});

test("real concurrent capacity requests cannot overbook a held native spawn reservation", { timeout: 180000 }, async () => {
  const h = await printHost("capacity", `${bindingFunction}
    const active=tools.call({ref:"arbor.start",args:{runId:"research"}});await tools.call({ref:"pr2fixture.ready",args:{}});
    let p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    await tools.call({ref:"arbor.propose",args:{...bind(p,"second-node"),payload:{nodeId:"second",type:"hypothesis",parentId:null,title:"Second",rationale:"Inspect independently",sourceRefs:[]}}});
    p=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    const denied=await Promise.all(["one","two"].map(async id=>{try{await tools.call({ref:"arbor.dispatch",args:{...bind(p,"reserve-"+id),payload:{nodeId:"second",attemptId:"second-"+id}}});return "UNEXPECTED_SUCCESS"}catch(e){return String(e)}}));
    const held=await tools.call({ref:"arbor.inspect",args:{runId:"research"}});
    await tools.call({ref:"pr2fixture.release",args:{}});const result=await active;
    return JSON.stringify({denied,held,result});`, { hold: "agents.spawn" });
  assert.ok(h.value.denied.every((error: string) => /capacity/.test(error))); assert.equal(h.value.held.run.attemptsUsed,1); assert.equal(h.value.held.run.active,1); assert.equal(h.value.result.run.active,0); assert.equal(h.events.filter(e=>e.event==="worker.observed").length,1);
});
