import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { ResearchStore, type ResearchRun } from "../../src/research/ResearchStore.js";
import { resolveSpec } from "../../src/research/spec.js";
import { ACTOR_PROPOSAL_SCHEMA, ACTION_MANIFEST, RESEARCH_ACTIONS, canonical, digest, validate } from "../../src/research/contracts.js";
import { ARBOR_ACTIONS, SUBSTRATE_ACTIONS } from "../../src/managed/contracts.js";
import { commandProgram, researchCommand } from "../../src/research/commands.js";
const exec = promisify(execFile);
const owner = { id: "root", rootId: "root", ownerHostId: "host", ownerIdentityId: "owner", sessionId: "session" };
async function fixture(t: test.TestContext, overrides: Record<string, unknown> = {}) {
  const base = resolve(".runtime/pr3-unit"); await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, "store-"));
  const store = new ResearchStore(join(root, "state/research.sqlite3")); t.after(() => store.close());
  const spec = await resolveSpec(root, {}, {}, { execution: "deferred", ...overrides }, "fake/coordinator");
  const run: ResearchRun = { id: "run", spec, requestHash: "request", owner, componentId: "arbor.owner", generation: "g1", epoch: "epoch-1", revision: 0, state: "ready", attemptsUsed: 0, active: 0, createdAt: 1, activeMs: 0, activeSince: null, steering: [], pendingDecisionId: null, execution: "not-started", error: null };
  store.create(run);
  const binding = (id: string) => store.binding(store.get(run.id)!, id);
  const node = (id: string) => store.research("propose", binding(`propose-${id}`), { nodeId: id, type: "hypothesis", parentId: null, title: id, rationale: "Inspect material", sourceRefs: [] }, "g1");
  return { root, store, run, binding, node };
}

test("fresh lazy SQLite schema, reopen and exact frozen spec with per-field model origins", async t => {
  const f = await fixture(t, { roles: { subject: "fake/subject" } });
  const spec = await resolveSpec(f.root, { objective: { direction: "minimize", unit: "ms" }, roles: { coordinator: "fake/profile" } }, { objective: { unit: "seconds" }, roles: { executor: "fake/project" } }, { objective: { minimumGain: "0.0000000000000000001" }, roles: { coordinator: "fake/explicit" }, execution: "deferred" }, "fake/active");
  assert.equal(spec.config.objective.direction, "minimize"); assert.equal(spec.origins["objective.direction"], "profile"); assert.equal(spec.origins["objective.unit"], "project"); assert.equal(spec.origins["objective.minimumGain"], "explicit");
  assert.equal(spec.roles.coordinator.model, "fake/explicit"); assert.equal(spec.roles.executor.model, "fake/project"); assert.equal(spec.roles.subject.model, null);
  assert.equal(f.run.spec.roles.coordinator.origin, "active-Pi-model"); assert.equal(f.run.spec.roles.subject.origin, "explicit");
  f.store.close(); const reopened = new ResearchStore(f.store.path); t.after(() => reopened.close()); assert.deepEqual(reopened.get("run")!.spec, f.run.spec);
  const detached = reopened.get("run")!; detached.spec.config.objective.unit = "forged"; assert.notEqual(reopened.get("run")!.spec.config.objective.unit, "forged");
  const absent = new ResearchStore(join(f.root, "absent/research.sqlite3")); assert.equal(absent.projection("missing"), null); assert.equal(existsSync(absent.path), false); absent.close();
  const tables = await exec(process.execPath, ["--input-type=module", "-e", `import {DatabaseSync} from 'node:sqlite';const d=new DatabaseSync(${JSON.stringify(f.store.path)},{readOnly:true});console.log(JSON.stringify(d.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x=>x.name)));d.close()`]);
  assert.deepEqual(JSON.parse(tables.stdout), ["artifact_refs", "attempts", "controls", "decisions", "evaluations", "events", "lessons", "nodes", "operations", "runs"]);
});

test("duplicate controls replay receipts; conflicting/stale commands and generations roll back", async t => {
  const f = await fixture(t); const c = f.binding("pause"); const first = f.store.control(c, "g1", "pause");
  assert.deepEqual(f.store.control(c, "g1", "pause"), first);
  const before = canonical(f.store.projection("run"));
  assert.throws(() => f.store.control(c, "g1", "steer", "conflict"), /duplicate/);
  assert.throws(() => f.store.control({ ...c, commandId: "stale" }, "g1", "pause"), /Stale/);
  assert.throws(() => f.store.control(f.binding("old"), "old-generation", "pause"), /generation/);
  assert.equal(canonical(f.store.projection("run")), before);
  assert.equal((f.store.projection("run")!.controls as unknown[]).length, 1);
  assert.throws(() => f.store.authorize("run", { ...owner, rootId: "other" }, "g1"), /Different native/);
});

test("cross-process simultaneous reservations are transactional; terminal duplicates release capacity once", async t => {
  const f = await fixture(t); f.node("one"); f.node("two");
  const c = f.binding("reserve");
  const programs = ["one", "two"].map((nodeId, i) => `import {ResearchStore} from ${JSON.stringify(resolve("src/research/ResearchStore.ts"))};const s=new ResearchStore(${JSON.stringify(f.store.path)});try{console.log(JSON.stringify(s.research('dispatch',${JSON.stringify({ ...c, commandId: `reserve-${i}` })},{nodeId:${JSON.stringify(nodeId)},attemptId:'attempt-${i}'},'g1')))}catch(e){console.log(JSON.stringify({error:String(e)}))}finally{s.close()}`);
  const results = await Promise.all(programs.map(program => exec(process.execPath, ["--import", "tsx", "--input-type=module", "-e", program])));
  const parsed = results.map(r => JSON.parse(r.stdout)); assert.equal(parsed.filter(r => r.status === "applied").length, 1); assert.equal(parsed.filter(r => /Stale|capacity/.test(r.error)).length, 1);
  assert.equal(f.store.get("run")!.active, 1); assert.equal(f.store.get("run")!.attemptsUsed, 1);
  const attemptId = parsed.find(r => r.status === "applied").value.id;
  const unused = attemptId === "attempt-0" ? "two" : "one";
  assert.throws(() => f.store.research("dispatch", f.binding("capacity"), { nodeId: unused, attemptId: "another" }, "g1"), /capacity/);
  const terminal = { id: "native-worker", cwd: f.root, status: "completed" as const };
  f.store.native("run", attemptId, "g1", { id: terminal.id, cwd: f.root });
  const first = f.store.native("run", attemptId, "g1", terminal);
  assert.deepEqual(f.store.native("run", attemptId, "g1", terminal), first); assert.equal(f.store.get("run")!.active, 0);
  assert.throws(() => f.store.native("run", attemptId, "g1", { ...terminal, status: "failed" }), /Conflicting duplicate/);
  f.store.close(); const reopened = new ResearchStore(f.store.path); t.after(() => reopened.close()); assert.deepEqual(reopened.native("run", attemptId, "g1", terminal), first);
});

test("closed actor proposal validation rejects forged approvals, stale bindings and invented evidence without mutation", async t => {
  const f = await fixture(t);
  const proposal = { ...f.binding("actor"), version: 2, kind: "propose", expectedEvidence: [], estimatedBudget: { attempts: 0, evaluatorCalls: 0 }, rationale: "Inspect", payload: { nodeId: "one", type: "hypothesis", parentId: null, title: "One", rationale: "Inspect", sourceRefs: [] } };
  validate(ACTOR_PROPOSAL_SCHEMA, proposal); assert.deepEqual(f.store.validateProposal(proposal, "run"), proposal);
  const before = canonical(f.store.projection("run"));
  for (const invalid of [{ ...proposal, approved: true }, { ...proposal, userReceipt: { confirmed: true } }, { ...proposal, payload: { ...proposal.payload, approved: true } }, { ...proposal, revision: 99 }, { ...proposal, materialId: "wrong" }, { ...proposal, epoch: "other" }, { ...proposal, expectedEvidence: ["invented"] }, { ...proposal, estimatedBudget: { attempts: 1, evaluatorCalls: 0 } }]) assert.throws(() => f.store.validateProposal(invalid, "run"));
  assert.equal(canonical(f.store.projection("run")), before);
});

test("review binds actual choice to pending material/epoch/revision and cannot make a measured win", async t => {
  const f = await fixture(t); f.node("one");
  f.store.research("decide", f.binding("review-request"), { decisionId: "decision", nodeId: "one", decision: "request_review", evidenceIds: [] }, "g1");
  const stale = f.binding("stale-review"); f.store.control(f.binding("steer"), "g1", "steer", "Changed request");
  assert.throws(() => f.store.review(stale, "g1", "decision", "Approve research choice", owner), /Stale/);
  assert.throws(() => f.store.review(f.binding("forged"), "g1", "decision", "Approve research choice", { ...owner, sessionId: "actor" }), /Stale/);
  const keep = f.store.research("decide", f.binding("keep"), { decisionId: "keep", nodeId: "one", decision: "keep", evidenceIds: [] }, "g1"); assert.equal(keep.status, "blocked");
  const evaluated = f.store.research("evaluate", f.binding("evaluate"), { attemptId: "one", evaluationId: "eval" }, "g1"); assert.equal(evaluated.status, "blocked"); assert.equal((f.store.projection("run")!.evaluations as unknown[]).length, 0);
});

test("repair: native settlement finalizes only a fresh pending review, preserving stale checks", async t => {
  const f = await fixture(t); f.node("one");
  f.store.research("decide", f.binding("request"), { decisionId: "choice", nodeId: "one", decision: "request_review", evidenceIds: [] }, "g1");
  const beforeSettlement = f.binding("old-dialog");
  f.store.settle("run", "g1", "completed", "native-observation-settled; unscored", null);
  assert.throws(() => f.store.review(beforeSettlement, "g1", "choice", "Approve research choice", owner), /Stale/);
  const fresh = f.binding("fresh-dialog");
  const receipt = f.store.review(fresh, "g1", "choice", "Approve research choice", owner);
  assert.equal((receipt.value as any).revision, fresh.revision);
  assert.equal(f.store.get("run")!.pendingDecisionId, null);
  assert.equal((f.store.projection("run")!.nodes as any[])[0].reviewed, true);
  f.store.research("decide", f.binding("request-2"), { decisionId: "choice-2", nodeId: "one", decision: "request_review", evidenceIds: [] }, "g1");
  f.store.control(f.binding("steer"), "g1", "steer", "Changed context");
  f.store.settle("run", "g1", "completed", "settled", null, "settle-2");
  assert.throws(() => f.store.review(f.binding("still-stale"), "g1", "choice-2", "Approve research choice", owner), /Stale pending/);
});

for (const mode of ["direction", "collaborative"]) test(`repair: ${mode} dispatch requires approved direction, including root hypotheses`, async t => {
  const f = await fixture(t, { search: { mode } }); f.node("root");
  const before = canonical(f.store.projection("run"));
  assert.throws(() => f.store.research("dispatch", f.binding("bypass"), { nodeId: "root", attemptId: "bypass" }, "g1"), /approved direction/i);
  assert.equal(canonical(f.store.projection("run")), before);
  f.store.research("propose", f.binding("direction"), { nodeId: "direction", type: "direction", parentId: null, title: "Direction", rationale: "Inspect", sourceRefs: [] }, "g1");
  const child = { nodeId: "child", type: "hypothesis", parentId: "direction", title: "Child", rationale: "Inspect", sourceRefs: [] };
  assert.throws(() => f.store.research("propose", f.binding("unreviewed"), child, "g1"), /review/);
  f.store.research("decide", f.binding("request"), { decisionId: "choice", nodeId: "direction", decision: "request_review", evidenceIds: [] }, "g1");
  f.store.review(f.binding("approve"), "g1", "choice", "Approve research choice", owner);
  f.store.control(f.binding("resume"), "g1", "resume");
  f.store.research("propose", f.binding("child"), child, "g1");
  assert.equal(f.store.research("dispatch", f.binding("allowed"), { nodeId: "child", attemptId: "allowed" }, "g1").status, "applied");
});

for (const mode of ["direction", "collaborative"]) test(`repair: ${mode} renewed review revokes prior direction approval through rejection and reopen`, async t => {
  const f = await fixture(t, { search: { mode } });
  f.store.research("propose", f.binding("direction"), { nodeId: "direction", type: "direction", parentId: null, title: "Direction", rationale: "Inspect", sourceRefs: [] }, "g1");
  const request = (id: string) => f.store.research("decide", f.binding(`request-${id}`), { decisionId: id, nodeId: "direction", decision: "request_review", evidenceIds: [] }, "g1");
  const child = { nodeId: "child", type: "hypothesis", parentId: "direction", title: "Child", rationale: "Inspect", sourceRefs: [] };
  request("first"); f.store.review(f.binding("approve-first"), "g1", "first", "Approve research choice", owner);
  f.store.control(f.binding("resume-first"), "g1", "resume");
  f.store.research("propose", f.binding("child"), child, "g1");
  request("renewed");
  const pending = canonical(f.store.projection("run"));
  assert.throws(() => f.store.research("propose", f.binding("pending-child"), { ...child, nodeId: "pending-child" }, "g1"), /review/);
  assert.equal(canonical(f.store.projection("run")), pending);
  const rejected = f.store.review(f.binding("reject-renewed"), "g1", "renewed", "Reject research choice", owner);
  assert.equal((rejected.value as any).response, "Reject research choice");
  f.store.control(f.binding("resume-rejected"), "g1", "resume");
  f.store.close(); const reopened = new ResearchStore(f.store.path); t.after(() => reopened.close());
  const before = canonical(reopened.projection("run"));
  assert.throws(() => reopened.research("dispatch", reopened.binding(reopened.get("run")!, "rejected-dispatch"), { nodeId: "child", attemptId: "bypass" }, "g1"), /approved direction/);
  assert.equal(canonical(reopened.projection("run")), before);
  assert.equal(reopened.get("run")!.attemptsUsed, 0);
});

test("repair: export command identities cannot replace native evidence", async t => {
  const f = await fixture(t); f.node("one");
  f.store.research("dispatch", f.binding("reserve"), { nodeId: "one", attemptId: "attempt" }, "g1");
  f.store.native("run", "attempt", "g1", { id: "worker", cwd: f.root, status: "completed" });
  const attempt = f.store.attempt("run", "attempt")!;
  const evidence = (f.store.projection("run")!.artifact_refs as any[])[0];
  const command = f.binding(attempt.evidenceId!);
  const exported = f.store.exported(command, "g1", "/derived.json", "export-digest");
  assert.deepEqual(f.store.exported(command, "g1", "/derived.json", "export-digest"), exported);
  const refs = f.store.projection("run")!.artifact_refs as any[];
  assert.deepEqual(refs.find(ref => ref.id === attempt.evidenceId), evidence);
  assert.equal(refs.length, 2);
  const exportRef = refs.find(ref => ref.kind === "unscored-json-export");
  const payload = { lessonId: "lesson", nodeId: "one", insight: "Inspection", limitations: "Unscored", evidenceIds: [exportRef.id] };
  assert.throws(() => f.store.research("distill", f.binding("forged"), payload, "g1"), /evidence/);
  const proposal = { ...f.binding("actor"), version: 2, kind: "distill", expectedEvidence: [exportRef.id], estimatedBudget: { attempts: 0, evaluatorCalls: 0 }, rationale: "Inspect", payload };
  assert.throws(() => f.store.validateProposal(proposal, "run"), /evidence/);
  assert.equal(f.store.research("distill", f.binding("genuine"), { ...payload, evidenceIds: [attempt.evidenceId] }, "g1").status, "applied");
});

test("repair: forged evidence kind and attempt/material/epoch/native provenance fail all evidence consumers", async t => {
  const f = await fixture(t); f.node("one");
  f.store.research("dispatch", f.binding("reserve"), { nodeId: "one", attemptId: "attempt" }, "g1");
  f.store.native("run", "attempt", "g1", { id: "worker", cwd: f.root, status: "completed" });
  const ref = (f.store.projection("run")!.artifact_refs as any[])[0];
  const db = new DatabaseSync(f.store.path); t.after(() => db.close());
  const payload = { lessonId: "lesson", nodeId: "one", insight: "Inspect", limitations: "Unscored", evidenceIds: [ref.id] };
  for (const patch of [{ kind: "unscored-json-export" }, { attemptId: "invented" }, { materialId: "other" }, { epoch: "other" }, { generation: "other" }, { nativeId: "other" }, { digest: "other" }, { status: "failed" }, { id: "other" }]) {
    db.prepare("UPDATE artifact_refs SET value=? WHERE run_id=? AND id=?").run(canonical({ ...ref, ...patch }), "run", ref.id);
    const before = canonical(f.store.projection("run"));
    assert.throws(() => f.store.research("distill", f.binding("forged-distill"), payload, "g1"), /evidence/);
    assert.throws(() => f.store.research("decide", f.binding("forged-decision"), { decisionId: "choice", nodeId: "one", decision: "request_review", evidenceIds: [ref.id] }, "g1"), /evidence/);
    assert.throws(() => f.store.validateProposal({ ...f.binding("actor"), version: 2, kind: "distill", expectedEvidence: [ref.id], estimatedBudget: { attempts: 0, evaluatorCalls: 0 }, rationale: "Inspect", payload }, "run"), /evidence/);
    assert.equal(canonical(f.store.projection("run")), before);
  }
  db.prepare("UPDATE artifact_refs SET value=? WHERE run_id=? AND id=?").run(canonical(ref), "run", ref.id);
  assert.equal(f.store.research("distill", f.binding("genuine"), payload, "g1").status, "applied");
});

test("repair: conflicting artifact inserts roll back terminal ingestion and export receipts", async t => {
  const f = await fixture(t); f.node("one");
  f.store.research("dispatch", f.binding("reserve"), { nodeId: "one", attemptId: "attempt" }, "g1");
  const db = new DatabaseSync(f.store.path); t.after(() => db.close());
  // Simulate retained conflicting storage, not an exposed evidence-writing API.
  const evidenceId = `evidence-${digest("attempt").slice(0, 32)}`;
  const conflict = { id: evidenceId, kind: "unscored-json-export", digest: "old-export" };
  db.prepare("INSERT INTO artifact_refs VALUES (?,?,?)").run("run", evidenceId, canonical(conflict));
  const before = canonical(f.store.projection("run"));
  assert.throws(() => f.store.native("run", "attempt", "g1", { id: "worker", cwd: f.root, status: "completed" }), /Conflicting artifact/);
  assert.equal(canonical(f.store.projection("run")), before); assert.equal(f.store.get("run")!.active, 1);
  const command = f.binding("export-collision"), exportId = `export-${digest(command.commandId)}`;
  db.prepare("INSERT INTO artifact_refs VALUES (?,?,?)").run("run", exportId, canonical({ ...conflict, id: exportId }));
  const beforeExport = canonical(f.store.projection("run"));
  assert.throws(() => f.store.exported(command, "g1", "/new.json", "new-export"), /Conflicting artifact/);
  assert.equal(canonical(f.store.projection("run")), beforeExport);
  assert.equal(f.store.receipt(command, "export", { format: "json" }), undefined);
});

for (const status of ["completed", "failed", "stopped", "timed_out"] as const) test(`repair: ${status} before attach never regresses state or reacquires capacity, including reopen`, async t => {
  const f = await fixture(t); f.node("one");
  f.store.research("dispatch", f.binding("reserve"), { nodeId: "one", attemptId: "attempt" }, "g1");
  const result = { id: "worker", cwd: f.root, status };
  const terminal = f.store.native("run", "attempt", "g1", result);
  const before = canonical(f.store.projection("run"));
  assert.throws(() => f.store.native("run", "attempt", "g1", { id: "worker", cwd: f.root }), /terminal/i);
  assert.equal(canonical(f.store.projection("run")), before);
  f.store.close(); const reopened = new ResearchStore(f.store.path); t.after(() => reopened.close());
  assert.throws(() => reopened.native("run", "attempt", "g1", { id: "worker", cwd: f.root }), /terminal/i);
  assert.deepEqual(reopened.native("run", "attempt", "g1", result), terminal);
  assert.equal(reopened.get("run")!.active, 0);
  assert.equal(reopened.attempt("run", "attempt")!.state, status);
});

test("public manifest exactly matches registrations; every nested schema is closed; commands never call service", async () => {
  function check(schema: any): void {
    if (schema.type === "object") { assert.equal(schema.additionalProperties, false); assert.ok(Array.isArray(schema.required)); Object.values(schema.properties).forEach(check); }
    if (schema.items) check(schema.items); if (schema.oneOf) schema.oneOf.forEach(check);
  }
  ARBOR_ACTIONS.forEach(a => { check(a.inputSchema); if (a.outputSchema) check(a.outputSchema); }); check(ACTOR_PROPOSAL_SCHEMA);
  assert.equal(RESEARCH_ACTIONS.length, 13); assert.equal(ARBOR_ACTIONS.length, 16);
  assert.deepEqual(ACTION_MANIFEST.map(a => a.name), RESEARCH_ACTIONS.map(a => a.name));
  const manifest = JSON.parse(await readFile("docs/pr3-action-manifest.json", "utf8"));
  assert.deepEqual(manifest.actions.map((a: any) => a.ref), ARBOR_ACTIONS.map(a => `arbor.${a.name}`));
  for (const action of ARBOR_ACTIONS) { const saved = manifest.actions.find((a: any) => a.name === action.name); assert.deepEqual(saved.inputSchema, action.inputSchema); assert.deepEqual(saved.outputSchema, action.outputSchema); assert.deepEqual(saved.effect, action.effect); assert.equal(saved.risk, action.risk); assert.equal(saved.actorCommitment, false); }
  for (const action of ["apply", "undoApply", "review", "export"]) assert.equal(RESEARCH_ACTIONS.find(a => a.name === action)!.risk, "write");
  const req = researchCommand("pause", "run"); assert.equal(req.ref, "arbor.control"); const code = commandProgram(req); assert.match(code, /arbor.inspect/); assert.match(code, /arbor.control/); assert.doesNotMatch(code, /owner\.|service\.|context.call/);
  assert.throws(() => researchCommand("forward", "agents.spawn")); assert.throws(() => researchCommand("start", '{"runId":"x","approved":true}'));
  assert.equal(SUBSTRATE_ACTIONS.length, 3); assert.equal(digest({ a: 1, b: 2 }), digest({ b: 2, a: 1 }));
});
