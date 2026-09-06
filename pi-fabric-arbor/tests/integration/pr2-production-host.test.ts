import assert from "node:assert/strict";
import { execFile, execFileSync, spawn, type ExecFileException } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { workerModel } from "../fixtures/pr2-worker-model.js";
import { ARBOR_OWNER_REFS } from "../../src/managed/contracts.js";
const exec = promisify(execFile), APP = resolve(process.cwd()), MODULES = join(APP, "node_modules");
const PI = join(MODULES, ".bin/pi");
const manifest = JSON.parse(await readFile(join(MODULES, "pi-fabric/package.json"), "utf8"));
const FABRIC = resolve(MODULES, "pi-fabric", manifest.exports["."].import);
async function successfulHostExit(pending: ReturnType<typeof exec>, outputPath: string) {
  let failure: ExecFileException | undefined;
  const result = await pending.catch(error => {
    failure = error;
    return { stdout: error.stdout ?? "", stderr: error.stderr ?? String(error) };
  });
  const output = { stdout: String(result.stdout), stderr: String(result.stderr) };
  const exit = { code: pending.child.exitCode, signal: pending.child.signalCode, killed: pending.child.killed,
    error: failure ? { message: failure.message, code: failure.code, signal: failure.signal, killed: failure.killed } : null };
  // Retain diagnostics before any assertion: a marker cannot excuse a crash,
  // timeout, signal, buffer overflow, or other rejected exec after completion.
  await writeFile(outputPath, `${output.stdout}\n${output.stderr}`);
  await writeFile(`${outputPath}.exit.json`, JSON.stringify(exit, null, 2) + "\n");
  assert.deepEqual(exit, { code: 0, signal: null, killed: false, error: null }, `Host must exit successfully; see ${outputPath}`);
  return output;
}

async function host(scenario: string, program: (spec: Record<string, unknown>) => string, hold = "", agents = true) {
  const base = join(APP, ".runtime/pr2-host"); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, `${scenario}-`)), cwd = join(root, "project"), agent = join(root, "agent"), trace = join(root, "trace.jsonl");
  await mkdir(join(cwd, ".pi"), { recursive: true }); await mkdir(join(agent, "extensions"), { recursive: true });
  await symlink(MODULES, join(agent, "node_modules"), "dir");
  await symlink(join(APP, "tests/fixtures/pr2-fake-provider.ts"), join(agent, "extensions/fake.ts"));
  await writeFile(join(agent, "settings.json"), JSON.stringify({ packages: [APP], defaultProjectTrust: "yes" }));
  const worker = await workerModel(trace);
  await writeFile(join(agent, "models.json"), JSON.stringify({ providers: { "arbor-pr2-fake": { baseUrl: worker.baseUrl, api: "openai-completions", apiKey: "local-fake", models: [{ id: "deterministic", reasoning: false, contextWindow: 128000, maxTokens: 2048 }] } } }));
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.email", "pr2@example.invalid"); git("config", "user.name", "PR2");
  await writeFile(join(cwd, "material.txt"), "Fixed PR2 material\n"); git("add", "material.txt"); git("commit", "-m", "fixture");
  const spec = { runId: "native-run", materialId: "fixed-material", cwd, oid: git("rev-parse", "HEAD"), policyId: "inspect-only-v1", objective: "Inspect fixed material, no scoring", maxWaves: 2, concurrency: 1 };
  await writeFile(join(cwd, ".pi/fabric.json"), JSON.stringify({ configVersion: 4, fullCodeMode: true,
    executor: { timeoutMs: 120000, maxTimeoutMs: 180000 }, approvals: { read: "allow", write: "allow", execute: "allow", network: "deny", agent: "allow" },
    agents: { enabled: agents, model: "arbor-pr2-fake/deterministic", runner: "pi", thinking: "off", transport: "process", timeoutMs: 30000, extensions: true, defaultTools: [], maxConcurrent: 2, maxPerExecution: 16, maxDepth: 1, retainRuns: true, notifyOnComplete: true, sessionExport: false },
    components: [{ id: "arbor", component: "arbor", config: { stateDirectory: join(root, "state") } }],
    mesh: { enabled: true, actorScope: "project", root: join(root, "mesh") }, ui: { enabled: false }, schema: { mode: "off" } }));
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("PI_") || key.startsWith("ARBOR_")) delete env[key];
  Object.assign(env, { HOME: join(root, "home"), PI_CODING_AGENT_DIR: agent, PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1", ARBOR_PR2_TRACE: trace, ARBOR_PR2_PROGRAM: program(spec), ARBOR_PR2_HOLD: hold });
  const pending = exec(PI, ["--approve", "--offline", "--no-session", "--no-skills", "--no-prompt-templates", "--no-themes", "--mode", "json", "--provider", "arbor-pr2-fake", "--model", "deterministic", "--thinking", "off", "-e", FABRIC, "-p", "Execute the deterministic PR2 host gate"], { cwd, env, timeout: 150000, maxBuffer: 4 * 1024 * 1024 });
  pending.child.stdin?.end(); // Print mode reads redirected stdin before inference.
  const result = await successfulHostExit(pending, join(root, "host-output.txt")).finally(() => worker.close());
  const events: Array<{ event: string; data: any; pid: number; at: number }> = (await readFile(trace, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  assert.match(result.stdout, /ARBOR_PR2_HOST_COMPLETE/, `Missing completion marker; see ${join(root, "host-output.txt")}`);
  const last = events.filter(e => e.event === "main.result").at(-1)!;
  return { root, cwd, env, spec, events, text: String(last.data), stdout: result.stdout };
}

test("host exit guard retains logs and rejects a completion marker followed by crash, signal or timeout", async () => {
  const base = join(APP, ".runtime/pr2-host"); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, "exit-guard-"));
  const scripts = {
    success: "process.exit(0)",
    crash: "process.exit(23)",
    signal: 'process.kill(process.pid, "SIGTERM")',
    timeout: "setInterval(() => {}, 1000)",
  };
  for (const [kind, script] of Object.entries(scripts)) {
    const path = join(root, `${kind}.txt`);
    const pending = exec(process.execPath, ["-e", `process.stdout.write("ARBOR_PR2_HOST_COMPLETE\\n", () => { ${script}; });`], { timeout: kind === "timeout" ? 2000 : 5000 });
    pending.child.stdin?.end();
    if (kind === "success") await successfulHostExit(pending, path);
    else await assert.rejects(successfulHostExit(pending, path), /Host must exit successfully/);
    assert.match(await readFile(path, "utf8"), /ARBOR_PR2_HOST_COMPLETE/);
    const exit = JSON.parse(await readFile(`${path}.exit.json`, "utf8"));
    if (kind === "success") assert.deepEqual(exit, { code: 0, signal: null, killed: false, error: null });
    else if (kind === "crash") { assert.equal(exit.code, 23); assert.equal(exit.error.code, 23); }
    else { assert.equal(exit.signal, "SIGTERM"); assert.equal(exit.error.signal, "SIGTERM"); }
    if (kind === "timeout") { assert.equal(exit.killed, true); assert.equal(exit.error.killed, true); }
  }
});

test("production extension in real Pi/Fabric host: exact schemas, passive registration, native actor/waits, reload", { timeout: 180000 }, async () => {
  const h = await host("complete", spec => `
    const component = await components.status({id:"arbor.owner"});
    const before = await agents.members({scope:"local",kinds:["actor","agent"]});
    const schemas = await Promise.all(${JSON.stringify(ARBOR_OWNER_REFS)}.map(ref => tools.describe({ref})));
    const first = await tools.call({ref:"arbor.start",args:${JSON.stringify(spec)}});
    const duplicate = await tools.call({ref:"arbor.start",args:${JSON.stringify(spec)}});
    const native = await agents.self();
    const remaining = await agents.members({scope:"local",kinds:["actor","agent"]});
    await components.reload({id:"arbor"});
    const retained = await tools.call({ref:"arbor.inspect",args:{runId:"native-run"}});
    let rejected = ""; try { await tools.call({ref:"arbor.start",args:${JSON.stringify(spec)}}); } catch(e) { rejected = String(e); }
    return JSON.stringify({component,before,schemas,first,duplicate,native,remaining,retained,rejected});`);
  let result: any; try { result = JSON.parse(h.text); } catch { assert.fail(`${h.root}: ${h.text}`); }
  assert.equal(result.component.state, "active"); assert.deepEqual(result.component.requirements, [...ARBOR_OWNER_REFS].sort());
  assert.deepEqual(result.before, []);
  assert.equal(result.first.state, "completed", `${h.root}: ${JSON.stringify(result.first)}`);
  assert.equal(result.first.workers.length, 2); assert.equal(result.first.revision, 2);
  assert.deepEqual(result.first, result.duplicate); assert.deepEqual(result.retained, result.first); assert.match(result.rejected, /explicit reconciliation/);
  assert.equal(result.first.owner.id, result.native.id); assert.equal(result.first.owner.ownerHostId, result.native.ownerHostId); assert.equal(result.first.owner.ownerIdentityId, result.native.ownerIdentityId);
  const descriptors = Object.fromEntries(result.schemas.map((s: any) => [s.ref, s.inputSchema]));
  for (const ref of ["agents.self", "agents.status", "agents.ask", "agents.spawn", "agents.wait", "agents.stop", "agents.remove"]) assert.equal(descriptors[ref].additionalProperties, false, ref);
  assert.deepEqual(descriptors["agents.ask"].required, ["id", "message"]); assert.equal(descriptors["agents.create"].properties.schema, undefined); assert.equal(descriptors["agents.spawn"].properties.role, undefined);
  const actors = h.events.filter(e => e.event === "actor.observed"), workers = h.events.filter(e => e.event === "worker.observed");
  assert.deepEqual(actors.map(e => e.data.data.results.length), [0, 1, 2]); assert.equal(workers.length, 2);
  assert.ok(actors.every(e => e.data.tools.includes("fabric_exec"))); assert.ok(workers.every(e => !e.data.tools.some((name: string) => /arbor|fabric_exec/.test(name))));
  const restrictions = h.events.filter(e => e.event === "actor.restrictions" || e.event === "worker.restrictions");
  assert.equal(restrictions.length, 5);
  for (const denied of restrictions) { assert.doesNotMatch(denied.data, /UNEXPECTED_SUCCESS/); assert.match(denied.data, /not.*(?:available|committed|allow)|denied|depth limit|unknown|outside|not found/i); }
  assert.equal(h.events.filter(e => e.event === "main.inference").length, 2, "unexpected Main research continuation");
  const native = h.events.filter(e => e.event === "native.result");
  const asks = native.filter(e => e.data.ref === "agents.ask"); const waits = native.filter(e => e.data.ref === "agents.wait");
  assert.ok(asks[0]!.at <= workers[0]!.at); assert.ok(waits[0]!.at <= actors[1]!.at);
  assert.ok(result.remaining.every((p: any) => ["completed", "failed", "stopped", "timed_out"].includes(p.status)), "live run-owned work remained");
});

for (const hold of ["agents.create", "agents.ask", "agents.spawn"] as const) test(`real production cancellation settles held ${hold} without late dispatch`, { timeout: 180000 }, async () => {
  const h = await host(`cancel-${hold.split(".")[1]}`, spec => `
    const active = tools.call({ref:"arbor.start",args:${JSON.stringify(spec)}});
    await tools.call({ref:"pr2fixture.ready",args:{}});
    const cancel = tools.call({ref:"arbor.cancel",args:{runId:"native-run"}});
    await tools.call({ref:"pr2fixture.release",args:{}});
    const [result,cancelled] = await Promise.all([active,cancel]);
    const members = await agents.members({scope:"local",kinds:["actor","agent"]});
    return JSON.stringify({result,cancelled,members});`, hold);
  const value = JSON.parse(h.text);
  assert.equal(value.result.state, "cancelled", `${h.root}: ${h.text}`); assert.deepEqual(value.result, value.cancelled);
  assert.equal(value.result.revision, 0);
  assert.equal(h.events.filter(e => e.event === "barrier.held").length, 1);
  if (hold === "agents.create") assert.equal(h.events.filter(e => e.event === "actor.observed").length, 0);
  if (hold === "agents.ask") assert.equal(h.events.filter(e => e.event === "worker.observed").length, 0);
  assert.ok(value.members.every((p: any) => ["completed", "failed", "stopped", "timed_out"].includes(p.status)));
});

test("real retirement during an unreturned native create records ambiguity, retains binding and never restarts", { timeout: 180000 }, async () => {
  const h = await host("reload-create", spec => `
    const active = tools.call({ref:"arbor.start",args:${JSON.stringify(spec)}});
    await tools.call({ref:"pr2fixture.ready",args:{}});
    const reload = components.reload({id:"arbor"});
    await tools.call({ref:"pr2fixture.release",args:{}});
    const [result,loaded] = await Promise.all([active,reload]);
    const retained = await tools.call({ref:"arbor.inspect",args:{runId:"native-run"}});
    const members = await agents.members({scope:"local",kinds:["actor","agent"]});
    return JSON.stringify({result,retained,loaded,members});`, "agents.create");
  const value = JSON.parse(h.text);
  assert.equal(value.result.state, "cleanup_pending", `${h.root}: ${h.text}`); assert.deepEqual(value.result, value.retained);
  assert.match(value.result.error, /unloading/);
  assert.equal(value.result.actors.length, 0, "revoked native result must not invent a returned handle");
  assert.equal(h.events.filter(e => e.event === "actor.observed").length, 0);
  assert.equal(h.events.filter(e => e.event === "native.result" && e.data.ref === "agents.create").length, 1);
  assert.equal(value.members.length, 1, "unobservable-to-owner actor remains retained, not falsely cleaned");
  assert.equal(value.members[0].status, "idle");
});

test("real production doctor/setup remain usable with disabled native capabilities and registration stays passive", { timeout: 180000 }, async () => {
  const h = await host("disabled", () => 'return JSON.stringify(await components.list());', "", false);
  const before = h.events.length;
  const child = spawn(PI, ["--approve", "--offline", "--no-session", "--no-skills", "--no-prompt-templates", "--no-themes", "--mode", "rpc", "-e", FABRIC], { cwd: h.cwd, env: h.env, stdio: ["pipe", "pipe", "pipe"] });
  let buffer = "", stderr = ""; const records: any[] = []; const listeners = new Set<() => void>();
  child.stdout.on("data", data => { buffer += String(data); for (;;) { const n = buffer.indexOf("\n"); if (n < 0) break; const line = buffer.slice(0, n); buffer = buffer.slice(n + 1); if (line) records.push(JSON.parse(line)); } for (const wake of listeners) wake(); });
  child.stderr.on("data", data => { stderr += String(data); });
  try {
    for (const command of ["/arbor doctor", "/arbor setup", "/arbor setup", "/arbor doctor"]) {
      const start = records.length, id = `cmd-${start}`;
      await new Promise<void>((done, reject) => {
        const timeout = setTimeout(() => { listeners.delete(wake); reject(new Error(`RPC command timeout ${stderr}`)); }, 30000);
        const wake = () => { if (records.slice(start).some(r => r.type === "response" && r.id === id)) { clearTimeout(timeout); listeners.delete(wake); done(); } };
        listeners.add(wake); child.stdin.write(JSON.stringify({ type: "prompt", message: command, id }) + "\n");
      });
      const notices = records.slice(start).filter(r => r.type === "extension_ui_request" && r.method === "notify").map(r => r.message).join("\n");
      if (command.includes("doctor")) assert.match(notices, /agents.enabled is false/, JSON.stringify(records.slice(start)));
      else assert.match(notices, /Configured one managed Arbor instance/);
    }
  } finally { child.stdin.end(); child.kill("SIGTERM"); await new Promise<void>(r => child.once("exit", () => r())); }
  const after = (await readFile(join(h.root, "trace.jsonl"), "utf8")).trim().split("\n"); assert.equal(after.length, before, "commands caused inference or native effects");
  assert.equal(h.events.some(e => e.event === "actor.observed" || e.event === "worker.observed"), false);
});

test("second real native root cannot adopt retained binding or mutate its journal", { timeout: 180000 }, async () => {
  const h = await host("second-root", spec => `return JSON.stringify(await tools.call({ref:"arbor.start",args:${JSON.stringify({ ...spec, maxWaves: 1 })}}));`);
  const binding = JSON.parse(h.text); assert.equal(binding.state, "completed");
  const path = join(h.root, "state/execution-bindings.sqlite3"), before = await readFile(path);
  const program = `const native = await agents.self(); let denied = ""; try { await tools.call({ref:"arbor.start",args:${JSON.stringify({ ...h.spec, maxWaves: 1 })}}); } catch(e) { denied = String(e); } return JSON.stringify({native,denied});`;
  const pending = exec(PI, ["--approve", "--offline", "--no-session", "--no-skills", "--no-prompt-templates", "--no-themes", "--mode", "json", "--provider", "arbor-pr2-fake", "--model", "deterministic", "--thinking", "off", "-e", FABRIC, "-p", "Run second-root denial"], { cwd: h.cwd, env: { ...h.env, ARBOR_PR2_PROGRAM: program }, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  pending.child.stdin?.end();
  const output = await successfulHostExit(pending, join(h.root, "second-host-output.txt"));
  assert.match(output.stdout, /ARBOR_PR2_HOST_COMPLETE/);
  const events = (await readFile(join(h.root, "trace.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const result = JSON.parse(events.filter(e => e.event === "main.result").at(-1).data);
  assert.notEqual(result.native.id, binding.owner.id); assert.match(result.denied, /Different native owning Pi/);
  assert.deepEqual(await readFile(path), before);
  assert.equal(events.filter(e => e.event === "actor.observed" || e.event === "worker.observed").length, h.events.filter(e => e.event === "actor.observed" || e.event === "worker.observed").length);
});
