import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import test from "node:test";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { BindingStore } from "../../src/managed/BindingStore.js";
import { OwnerExecution } from "../../src/managed/OwnerExecution.js";
import { ResearchStore } from "../../src/research/ResearchStore.js";
import { ResearchService } from "../../src/research/ResearchService.js";
import { RESEARCH_ACTIONS, canonical, validate, type Schema } from "../../src/research/contracts.js";
const native = { id: "root", rootId: "root", kind: "root", ownerHostId: "host", ownerIdentityId: "owner", sessionId: "session", local: true, stale: false };
async function fixture(t: test.TestContext) {
  const base = resolve(".runtime/pr3-unit"); await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, "service-"));
  const cwd = join(root, "material"), profile = join(root, "profile"); await mkdir(cwd); await mkdir(profile);
  const store = new ResearchStore(join(root, "state/research.sqlite3")); const binding = new BindingStore(join(root, "state/execution.sqlite3"));
  const calls: string[] = [];
  const owner = new OwnerExecution(async ref => { calls.push(ref); if (ref === "agents.self") return native; throw new Error(`Unexpected native call ${ref}`); }, binding, "arbor.owner", "g1", store);
  const service = new ResearchService(owner, store, join(root, "state"), profile);
  let dialogs = 0; let response: () => Promise<string | undefined> = async () => "Approve research choice";
  const context = { cwd, signal: undefined, extensionContext: { sessionManager: { getSessionId: () => "session" }, isProjectTrusted: () => true, model: { provider: "fake", id: "local" }, modelRegistry: { getAvailable: () => [{ provider: "fake", id: "local" }] }, hasUI: true, ui: { select: async () => { dialogs++; return response(); } } } } as unknown as FabricInvocationContext;
  t.after(() => service.close());
  const invoke = (name: string, args: Record<string, unknown>, ctx = context) => service.invoke(name, args, ctx);
  const start = { runId: "research", overrides: { execution: "deferred", material: { kind: "instructions" } } };
  const command = (id: string) => store.binding(store.get("research")!, id);
  const requestReview = async (id = "decision") => invoke("decide", { ...command(`request-${id}`), payload: { decisionId: id, nodeId: null, decision: "request_review", evidenceIds: [] } });
  return { root, cwd, profile, store, owner, binding, service, calls, context, invoke, start, command, requestReview, dialogs: () => dialogs, response: (next: typeof response) => { response = next; } };
}

test("service start duplicates/frozen reopen/resume never resolve changed defaults or launch deferred work", async t => {
  const f = await fixture(t);
  await writeFile(join(f.profile, "arbor.defaults.json"), JSON.stringify({ objective: { unit: "profile" } }));
  const [a, b] = await Promise.all([f.invoke("start", f.start), f.invoke("start", f.start)]); assert.deepEqual(a, b);
  await writeFile(join(f.cwd, "arbor.config.json"), JSON.stringify({ objective: { unit: "changed" }, roles: { coordinator: "other/model" } }));
  assert.deepEqual(await f.invoke("start", f.start), a);
  const before = f.store.get("research")!.spec;
  await f.invoke("control", { ...f.command("pause"), action: "pause" }); await f.invoke("control", { ...f.command("resume"), action: "resume" });
  assert.deepEqual(f.store.get("research")!.spec, before); assert.ok(f.calls.every(ref => ref === "agents.self"));
  await assert.rejects(f.invoke("start", { ...f.start, overrides: { execution: "deferred" } }), /duplicate|binding changed/i);
});

test("every mutation requires intrinsic owning session and closed input; no supplied receipt or scalar", async t => {
  const f = await fixture(t); await f.invoke("start", f.start);
  const wrong = { ...f.context, extensionContext: { ...f.context.extensionContext, sessionManager: { getSessionId: () => "actor" } } } as FabricInvocationContext;
  const before = canonical(f.store.projection("research"));
  for (const name of ["review", "apply", "undoApply"]) {
    const args = { ...f.command(name), decisionId: "decision" };
    await assert.rejects(f.invoke(name, args, wrong), /Only the native owning Pi/);
    await assert.rejects(f.invoke(name, { ...args, approved: true }), /unknown field/);
    await assert.rejects(f.invoke(name, { ...args, userReceipt: { confirmed: true } }), /unknown field/);
  }
  await assert.rejects(f.invoke("evaluate", { ...f.command("score"), payload: { attemptId: "attempt", evaluationId: "evaluation", score: "100" } }), /unknown field/);
  assert.equal(canonical(f.store.projection("research")), before); assert.equal(f.dialogs(), 0);
});

test("actual UI response is required and replayed once; stale response during concurrent control cannot approve", async t => {
  const f = await fixture(t); await f.invoke("start", f.start); await f.requestReview();
  let resolve!: (value: string) => void, ready!: () => void;
  const shown = new Promise<void>(r => { ready = r; }); f.response(() => { ready(); return new Promise(r => { resolve = r; }); });
  const args = { ...f.command("review"), decisionId: "decision" };
  const pending = f.invoke("review", args); const duplicate = f.invoke("review", args);
  await shown; await f.invoke("control", { ...f.command("steer"), action: "steer", instruction: "Changed pending decision context" });
  resolve("Approve research choice");
  const results = await Promise.allSettled([pending, duplicate]); assert.ok(results.every(r => r.status === "rejected" && /Stale/.test(String(r.reason)))); assert.equal(f.dialogs(), 1);
  const decision = (f.store.projection("research")!.decisions as any[])[0]; assert.equal(decision.status, "pending"); assert.equal(decision.userReceipt, undefined);
});

test("headless, dismissed and retired review never auto-approve; retained storage stays readable until close", async t => {
  const f = await fixture(t); await f.invoke("start", f.start); await f.requestReview();
  const args = { ...f.command("review"), decisionId: "decision" };
  await assert.rejects(f.invoke("review", args, { ...f.context, extensionContext: { ...f.context.extensionContext, hasUI: false } }), /dialog unavailable/);
  f.response(async () => undefined); await assert.rejects(f.invoke("review", args), /dismissed\/timed out/);
  let release!: (value: string) => void, ready!: () => void; const shown = new Promise<void>(r => { ready = r; }); f.response(() => { ready(); return new Promise(r => { release = r; }); });
  const review = f.invoke("review", args); await shown;
  let disposed = false; const disposing = f.service.dispose().then(() => { disposed = true; }); await new Promise(r => setImmediate(r));
  assert.equal(disposed, false); assert.equal(f.store.closed, false); assert.ok(await f.invoke("inspect", { runId: "research" }));
  release("Approve research choice"); await assert.rejects(review, /retired/); await disposing; assert.equal(f.store.closed, false);
  await f.service.close(); assert.equal(f.store.closed, true); assert.equal(f.binding.closed, true);
});

test("all facade outputs match authoritative closed schemas and generated export never changes source", async t => {
  const f = await fixture(t); const p = await f.invoke("start", f.start);
  validate(RESEARCH_ACTIONS.find(a => a.name === "start")!.outputSchema as Schema, p);
  await f.requestReview(); const review = { ...f.command("review"), decisionId: "decision" }; const first = await f.invoke("review", review); assert.deepEqual(await f.invoke("review", review), first); assert.equal(f.dialogs(), 1);
  await writeFile(join(f.cwd, "material.txt"), "user content\n");
  const args = { ...f.command("export"), format: "json" }; const [a, b] = await Promise.all([f.invoke("export", args), f.invoke("export", args)]); assert.deepEqual(a, b);
  const path = (a as any).value.path; assert.equal(JSON.parse(await readFile(path, "utf8")).run.spec.source.capture, "source-reference-not-candidate-snapshot"); assert.equal(await readFile(join(f.cwd, "material.txt"), "utf8"), "user content\n");
  const applied = await f.invoke("apply", { ...f.command("apply"), decisionId: "decision" }); assert.equal((applied as any).status, "blocked");
  validate(RESEARCH_ACTIONS.find(a => a.name === "inspect")!.outputSchema as Schema, await f.invoke("inspect", { runId: "research" }));
});

test("native resume is explicitly blocked; repeated cancellation of already-settled work stays cancelled", async t => {
  const f = await fixture(t); await f.invoke("start", f.start);
  f.store.settle("research", "g1", "completed", "native-observation-settled; unscored", null);
  const before = f.store.get("research")!.spec;
  const resume = await f.invoke("control", { ...f.command("resume"), action: "resume" }); assert.equal((resume as any).status, "blocked"); assert.match((resume as any).reason, /PR8/); assert.deepEqual(f.store.get("research")!.spec, before);
  const args = { ...f.command("cancel"), action: "cancel" }; const first = await f.invoke("control", args); assert.deepEqual(await f.invoke("control", args), first);
  assert.equal(f.store.get("research")!.state, "cancelled"); await f.invoke("control", { ...f.command("cancel-again"), action: "cancel" }); assert.equal(f.store.get("research")!.state, "cancelled");
});

test("state separation rejects contained dot-prefix and symlinked destinations before persistence", async t => {
  const f = await fixture(t); await symlink(f.cwd, join(f.root, "state-link"), "dir");
  for (const directory of [join(f.cwd, "..hidden"), join(f.root, "state-link/inner")]) {
    const store = new ResearchStore(join(directory, "research.sqlite3"));
    const owner = new OwnerExecution(f.owner.call, new BindingStore(join(directory, "execution.sqlite3")), "arbor.owner", "g1", store);
    const service = new ResearchService(owner, store, directory, f.profile); t.after(() => service.close());
    await assert.rejects(service.invoke("start", f.start, f.context), /outside mutable material/);
    assert.equal(existsSync(store.path), false);
  }
});
