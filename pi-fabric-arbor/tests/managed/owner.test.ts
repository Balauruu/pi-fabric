import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { getEventListeners } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import test from "node:test";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { FabricInvocationContext, FabricComponentContext, FabricProvider } from "pi-fabric/protocol";
import { BindingStore } from "../../src/managed/BindingStore.js";
import { OwnerExecution } from "../../src/managed/OwnerExecution.js";
import { ARBOR_OWNER_REFS, localStop, proposal, type OwnerRef } from "../../src/managed/contracts.js";
import { createArborComponent, createArborOwnerComponent } from "../../src/managed/definitions.js";
import { mergeArborEntry, setupArbor, doctorArbor } from "../../src/managed/setup.js";

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const tick = () => new Promise<void>(r => setImmediate(r));
const identity = { id: "root", rootId: "root", kind: "root", ownerHostId: "host", ownerIdentityId: "identity", sessionId: "session", local: true, stale: false };
const context = (id = "session", signal?: AbortSignal) => ({ signal, extensionContext: { sessionManager: { getSessionId: () => id }, isProjectTrusted: () => true, model: { provider: "fake", id: "local" }, modelRegistry: { getAvailable: () => [{ provider: "fake", id: "local" }] } } }) as FabricInvocationContext;
async function fixture(t: test.TestContext, options: { hold?: OwnerRef; status?: string; badStop?: unknown; invalidProposal?: string; expectedCloseFailure?: boolean } = {}) {
  const base = resolve(".runtime/pr2-unit"); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, "case-")); const cwd = join(root, "material"); await mkdir(cwd);
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.email", "fake@example.invalid"); git("config", "user.name", "fake");
  await writeFile(join(cwd, "material.txt"), "material\n"); git("add", "."); git("commit", "-m", "fixture");
  const spec = { runId: "run", materialId: "material", cwd, oid: git("rev-parse", "HEAD"), policyId: "inspect-only-v1", objective: "Inspect fixed material", model: "fake/local", maxWaves: 2, concurrency: 2 };
  const calls: Array<{ ref: OwnerRef; args: Record<string, any> }> = [], members = new Map<string, Record<string, any>>();
  const ready = deferred<void>(), release = deferred<void>(); let count = 0, held = false;
  const call = async (ref: OwnerRef, args: Record<string, any> = {}): Promise<unknown> => {
    calls.push({ ref, args }); assert.ok(ARBOR_OWNER_REFS.includes(ref));
    let result: unknown;
    switch (ref) {
      case "agents.self": return { ...identity };
      case "schema.status": result = { mode: "off" }; break;
      case "agents.create": {
        const id = `actor-${++count}`; result = { id, scope: "project", status: "idle", runner: "pi", residency: "session", requirements: [{ ref: "agents.self" }] };
        members.set(id, { ...identity, ...result as object, kind: "actor" }); break;
      }
      case "agents.ask": {
        const d = args.data; const p: Record<string, unknown> = { version: 1, kind: d.remainingWaves ? "wave" : "stop", runId: d.runId, materialId: d.materialId, policyId: d.policyId, revision: d.revision, tasks: d.remainingWaves ? ["inspect one", "inspect two"] : [] };
        if (options.invalidProposal === "stale") p.revision = -1;
        if (options.invalidProposal === "self-approval") p.approved = true;
        if (options.invalidProposal === "over-budget") p.tasks = ["a", "b", "c"];
        result = { actorId: args.id, runId: "ask-native", action: "silent", direction: "out", data: p }; break;
      }
      case "agents.spawn": {
        const id = `worker-${++count}`; result = { id, cwd, status: "running", runner: "pi", transport: "process", residency: "session" };
        members.set(id, { ...identity, ...result as object, kind: "agent" }); break;
      }
      case "agents.wait": {
        const member = members.get(args.id)!; member.status = options.status ?? "completed";
        result = { id: args.id, cwd, status: member.status }; break;
      }
      case "agents.members": return [...members.values()];
      case "agents.status": return members.get(args.id);
      case "agents.stop": {
        const member = members.get(args.id)!; member.status = "stopped";
        return options.badStop !== undefined ? options.badStop : { id: args.id, status: "stopped", ...(member.kind === "actor" ? { scope: "project" } : { cwd }) };
      }
      case "agents.remove": members.delete(args.id); return { removed: true };
    }
    if (!held && ref === options.hold) { held = true; ready.resolve(); await release.promise; }
    return result;
  };
  const store = new BindingStore(join(root, "state", "bindings.sqlite3"));
  const owner = new OwnerExecution(call, store, "arbor.owner", "generation-one");
  t.after(async () => { release.resolve(); if (options.expectedCloseFailure) { await assert.rejects(owner.close(), /owned settlement\/storage failed/); assert.equal(store.closed, true); } else await owner.close(); await rm(root, { recursive: true, force: true }); });
  return { root, spec, calls, members, store, owner, call, ready, release };
}

test("abort during held schema validation rejects admission without persistence or native create", async t => {
  const f = await fixture(t, { hold: "schema.status" });
  const controller = new AbortController(), reason = new Error("cancelled before admission");
  const active = f.owner.start(f.spec, context("session", controller.signal));
  const rejected = assert.rejects(active, error => error === reason);
  await f.ready.promise;
  controller.abort(reason); f.release.resolve();
  await rejected;
  assert.equal(f.owner.inspect("run"), undefined);
  assert.equal(f.store.get("run"), undefined);
  assert.equal(existsSync(f.store.path), false);
  assert.equal(f.calls.some(c => c.ref === "agents.create"), false);
  assert.deepEqual(f.calls.map(c => c.ref), ["agents.self", "schema.status"]);
});

test("abort listener precedes cycle persistence and is removed after owned cancellation", async t => {
  const f = await fixture(t, { hold: "agents.create" });
  const controller = new AbortController();
  const save = f.store.save.bind(f.store);
  let observed: number | undefined;
  f.store.save = binding => {
    observed ??= getEventListeners(controller.signal, "abort").length;
    save(binding);
  };
  const active = f.owner.start(f.spec, context("session", controller.signal));
  await f.ready.promise;
  controller.abort(); f.release.resolve();
  const result = await active;
  assert.equal(observed, 1, "listener must exist before the first cycle save");
  assert.equal(result.state, "cancelled"); assert.equal(result.revision, 0);
  assert.equal(f.calls.some(c => c.ref === "agents.ask" || c.ref === "agents.spawn"), false);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  assert.equal(f.members.size, 0);
});

test("production bounded loop reuses one passive actor, owns waits, fresh asks and duplicate start", async t => {
  const f = await fixture(t);
  assert.equal(f.owner.inspect("run"), undefined); assert.equal(existsSync(f.store.path), false);
  const [a, b] = await Promise.all([f.owner.start(f.spec, context()), f.owner.start(f.spec, context())]);
  assert.deepEqual(a, b); assert.equal(a.state, "completed"); assert.equal(a.workers.length, 4); assert.equal(a.revision, 2);
  assert.equal(f.calls.filter(c => c.ref === "agents.create").length, 1);
  const create = f.calls.find(c => c.ref === "agents.create")!.args;
  assert.deepEqual(create.requires, ["agents.self"]); assert.deepEqual(create.tools, ["fabric_exec"]); assert.equal(create.extensions, true); assert.equal(create.delivery, "mailbox"); assert.equal(create.triggerTurn, false);
  assert.deepEqual(f.calls.filter(c => c.ref === "agents.ask").map(c => c.args.data.results.length), [0, 2, 4]);
  assert.equal(f.calls.filter(c => c.ref === "agents.wait").length, 4);
  assert.ok(f.calls.filter(c => c.ref === "agents.spawn").every(c => c.args.extensions === false && c.args.recursive === false));
  assert.deepEqual(a.owner, { id: "root", rootId: "root", ownerHostId: "host", ownerIdentityId: "identity", sessionId: "session" });
  assert.equal((await f.owner.start(f.spec, context())).state, "completed");
  assert.equal(f.calls.filter(c => c.ref === "agents.create").length, 1);
  await assert.rejects(f.owner.start({ ...f.spec, materialId: "other" }, context()), /Immutable/);
  await assert.rejects(f.owner.start({ ...f.spec, oid: "0".repeat(40) }, context()), /OID/);
});

for (const invalidProposal of ["stale", "self-approval", "over-budget"]) test(`production rejects ${invalidProposal} proposal before workers`, async t => {
  const f = await fixture(t, { invalidProposal }); const result = await f.owner.start(f.spec, context());
  assert.equal(result.state, "failed"); assert.equal(result.revision, 0); assert.equal(result.workers.length, 0);
  assert.equal(f.calls.filter(c => c.ref === "agents.spawn").length, 0);
});
for (const status of ["failed", "timed_out", "stopped"]) test(`native ${status} is not successful execution`, async t => {
  const f = await fixture(t, { status }); const result = await f.owner.start(f.spec, context());
  assert.equal(result.state, "failed"); assert.equal(result.revision, 0);
});
for (const hold of ["agents.create", "agents.ask", "agents.spawn", "agents.wait"] as const) test(`cancel settles late ${hold}, rejects second root before drain`, async t => {
  const f = await fixture(t, { hold }); const active = f.owner.start(f.spec, context()); await f.ready.promise;
  await tick(); // Let the independent sibling settle before the denial snapshot.
  const before = f.owner.inspect("run");
  await assert.rejects(f.owner.cancel("run", context("second-root")), /Only the native/);
  assert.deepEqual(f.owner.inspect("run"), before);
  const cancelling = f.owner.cancel("run", context()); await tick();
  let settled = false; void cancelling.then(() => { settled = true; });
  assert.equal(settled, false); assert.equal(f.store.closed, false);
  f.release.resolve(); const result = await cancelling; await active;
  assert.equal(result.state, "cancelled"); assert.equal(result.revision, 0);
  if (hold === "agents.create") assert.equal(f.calls.some(c => c.ref === "agents.ask"), false);
  if (hold === "agents.ask") assert.equal(f.calls.some(c => c.ref === "agents.spawn"), false);
  assert.ok([...f.members.values()].every(m => ["stopped", "completed"].includes(m.status)));
});

test("provider retirement retains storage until close, blocks new generation reuse and preserves ambiguity", async t => {
  const f = await fixture(t, { hold: "agents.spawn", badStop: { routed: "mesh", queued: true, acknowledged: true } });
  const active = f.owner.start(f.spec, context()); await f.ready.promise;
  const disposal = f.owner.dispose(); await tick();
  assert.equal(f.store.closed, false); f.release.resolve(); await disposal;
  assert.equal((await active).state, "cleanup_pending");
  assert.equal(f.owner.inspect("run")!.generation, "generation-one");
  assert.equal(f.store.closed, false); await f.owner.close(); await f.owner.close(); assert.equal(f.store.closed, true);
  const replacement = new OwnerExecution(f.call, new BindingStore(f.store.path), "arbor.owner", "generation-two");
  assert.equal(replacement.inspect("run")!.state, "cleanup_pending");
  const before = await readFile(f.store.path);
  await assert.rejects(replacement.start(f.spec, context()), /explicit reconciliation/);
  assert.deepEqual(await readFile(f.store.path), before);
  await replacement.close();
});

test("stop ambiguity matrix accepts only exact local terminal proof", () => {
  for (const target of [{ id: "a", kind: "actor" as const }, { id: "w", kind: "agent" as const, cwd: "/work" }]) {
    const valid = { id: target.id, status: "stopped", ...(target.kind === "actor" ? { scope: "project" } : { cwd: "/work" }) };
    localStop(valid, target); localStop({ ...valid, routed: "local", local: true }, target);
    for (const patch of [{ id: "other" }, { status: "running" }, { queued: false }, { acknowledged: false }, { messageId: "x" }, ...["mesh", "remote", null, false, "unknown"].map(routed => ({ routed })), ...[false, "true", null].map(local => ({ local }))]) assert.throws(() => localStop({ ...valid, ...patch }, target));
    for (const value of [false, null, true, "stopped", {}]) assert.throws(() => localStop(value, target));
  }
});

test("production definition is passive and declares exact requirements; provider close owns storage", async () => {
  const def = createArborOwnerComponent(); assert.equal(def.guarantee, "managed"); assert.deepEqual(def.requires, ARBOR_OWNER_REFS); assert.deepEqual(def.provides, ["arbor"]);
  let provider!: FabricProvider; const disposers: Array<() => unknown> = []; let calls = 0;
  await def.activate({ id: "arbor.owner", signal: new AbortController().signal, call() { calls++; throw new Error("activation call"); }, provide(p: FabricProvider) { provider = p; }, defer(d: () => unknown) { disposers.push(d); } } as unknown as FabricComponentContext, { stateDirectory: resolve(".runtime/pr2-unused") });
  assert.equal(calls, 0); assert.equal(existsSync(resolve(".runtime/pr2-unused")), false);
  assert.deepEqual((await provider.list({}, context())).map(d => d.name), ["start", "inspect", "control", "export", "propose", "dispatch", "collect", "evaluate", "distill", "decide", "review", "apply", "undoApply", "substrateStart", "substrateInspect", "substrateCancel"]);
  for (const dispose of disposers.reverse()) await dispose();
  assert.equal(await provider.invoke("inspect", { runId: "absent" }, context()), null);
  await provider.close!(); await provider.close!();
});

test("diagnostic parent lifecycle seam remains passive while exact-dependency child is waiting", async () => {
  let diagnostic: (() => any) | undefined; const disposers: Array<() => void> = [];
  const parent = createArborComponent(read => { diagnostic = read; });
  assert.deepEqual(parent.requires, []);
  await parent.activate({ use(child: any, options: any) {
    assert.deepEqual(child.requires, ARBOR_OWNER_REFS); assert.equal(options.id, "owner");
    return { status: () => ({ state: "waiting", missing: ["agents.create"] }) };
  }, defer(fn: () => void) { disposers.push(fn); }, call() { throw new Error("No activation calls"); } } as unknown as FabricComponentContext, { stateDirectory: resolve(".runtime/pr2-unused") });
  assert.deepEqual(diagnostic!().missing, ["agents.create"]);
  for (const dispose of disposers) dispose(); assert.equal(diagnostic!(), undefined);
});

test("setup merges one enabled binding, preserves policy, is idempotent; doctor works missing capabilities", async t => {
  const f = await fixture(t);
  const prior = { agents: { enabled: false }, schema: { mode: "enforce" }, components: [{ id: "other", component: "other", config: { value: 7 } }] };
  const next = mergeArborEntry(prior, join(f.root, "state"));
  assert.deepEqual(mergeArborEntry(next, "ignored"), next); assert.deepEqual(next.agents, prior.agents); assert.deepEqual((next.components as any[])[0], prior.components[0]);
  assert.throws(() => mergeArborEntry({ components: [{ id: "arbor", component: "other" }] }, "/state"), /conflicting/);
  assert.throws(() => mergeArborEntry({ components: [{ id: "a", component: "arbor" }, { id: "b", component: "arbor" }] }, "/state"), /Duplicate/);
  const command = { cwd: f.root, isProjectTrusted: () => true } as ExtensionCommandContext;
  await mkdir(join(f.root, ".pi")); await writeFile(join(f.root, ".pi/fabric.json"), JSON.stringify(prior));
  await setupArbor(command, join(f.root, "agent")); const first = await readFile(join(f.root, ".pi/fabric.json")); await setupArbor(command, join(f.root, "agent")); assert.deepEqual(await readFile(join(f.root, ".pi/fabric.json")), first);
  const doctor = await doctorArbor(command, false, { state: "waiting", missing: ["agents.create"], cleanupErrors: [] } as any, undefined, join(f.root, "agent"));
  assert.equal(doctor.installed, false); assert.match(JSON.stringify(doctor.blockers), /agents.create/); assert.match(JSON.stringify(doctor.blockers), /enforce/);
  await assert.rejects(setupArbor({ ...command, isProjectTrusted: () => false } as ExtensionCommandContext), /Trust/);
  await mkdir(join(f.root, "agent")); await writeFile(join(f.root, "agent/fabric.json"), JSON.stringify(prior));
  await writeFile(join(f.root, ".pi/fabric.json"), JSON.stringify({ ui: { enabled: false } }));
  await setupArbor(command, join(f.root, "agent"));
  const inherited = JSON.parse(await readFile(join(f.root, ".pi/fabric.json"), "utf8"));
  assert.deepEqual(inherited.components[0], prior.components[0]); assert.equal(inherited.components.length, 2); assert.equal(inherited.agents, undefined);
});

test("unavailable model is rejected before binding or native create", async t => {
  const f = await fixture(t);
  await assert.rejects(f.owner.start({ ...f.spec, model: "unavailable/alias" }, context()), /exact available provider\/model/);
  assert.equal(f.owner.inspect("run"), undefined); assert.equal(f.calls.some(c => c.ref === "agents.create"), false);
});

test("storage settlement failure is explicit and provider close still releases storage", async t => {
  const f = await fixture(t, { expectedCloseFailure: true });
  f.store.save = () => { throw new Error("injected storage failure"); };
  await assert.rejects(f.owner.start(f.spec, context()), /injected storage failure/);
  assert.equal(f.calls.some(c => c.ref === "agents.create"), false);
  await assert.rejects(f.owner.dispose(), /owned settlement\/storage failed/);
  assert.equal(f.store.closed, false);
});
