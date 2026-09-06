import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { TERMINAL, type NativeOwner, type Terminal } from "../managed/contracts.js";
import { ACTION_SCHEMAS, ACTOR_PROPOSAL_SCHEMA, canonical, digest, validate, type BoundCommand, type Proposal, type ResearchAction } from "./contracts.js";
import type { ResolvedSpec } from "./spec.js";
export interface ResearchRun {
  id: string; spec: ResolvedSpec; requestHash: string; owner: NativeOwner; componentId: string; generation: string;
  epoch: string; revision: number; state: "ready" | "running" | "paused" | "awaiting_review" | "completed" | "cancelled" | "interrupted" | "cleanup_pending" | "failed";
  attemptsUsed: number; active: number; createdAt: number; activeMs: number; activeSince: number | null; steering: string[]; pendingDecisionId: string | null;
  execution: string; error: string | null;
}
export interface Receipt { commandId: string; runId: string; revision: number; status: "applied" | "queued" | "blocked"; action: string; reason: string | null; value: unknown }
export interface Attempt { id: string; nodeId: string; task: string; state: "reserved" | "running" | "completed" | "failed" | "stopped" | "timed_out"; nativeId: string | null; nativeDigest: string | null; evidenceId: string | null; model: string | null; materialId: string; epoch: string; generation: string }
const TABLES = ["nodes", "attempts", "evaluations", "decisions", "operations", "controls", "events", "artifact_refs", "lessons"] as const;
type Table = typeof TABLES[number];
/** One fresh domain authority. No v1 reader, participant registry or transcripts.
 * All read/modify/write sequences and capacity claims use BEGIN IMMEDIATE.
 */
export class ResearchStore {
  #db: DatabaseSync | undefined;
  #closed = false;
  constructor(readonly path: string) {}
  get closed(): boolean { return this.#closed; }
  #open(): DatabaseSync {
    if (this.#closed) throw new Error("Research storage is closed");
    if (!this.#db) {
      mkdirSync(dirname(this.path), { recursive: true });
      const db = new DatabaseSync(this.path);
      try {
        db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
        const version = Number(db.prepare("PRAGMA user_version").get()!.user_version);
        if ((version !== 0 && version !== 2) || (version === 0 && db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().length > 0)) throw new Error("Unsupported research schema; no legacy import");
        db.exec("BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, generation TEXT NOT NULL, value TEXT NOT NULL);");
        for (const table of TABLES) db.exec(`CREATE TABLE IF NOT EXISTS ${table} (run_id TEXT NOT NULL REFERENCES runs(id), id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(run_id,id));`);
        db.exec("PRAGMA user_version=2; COMMIT;"); this.#db = db;
      } catch (error) { db.close(); throw error; }
    }
    return this.#db;
  }
  #read<T>(read: (db: DatabaseSync) => T, absent: T): T {
    if (this.#closed) throw new Error("Research storage is closed");
    if (!this.#db && !existsSync(this.path)) return absent;
    const db = this.#db ?? new DatabaseSync(this.path, { readOnly: true });
    try { db.exec("BEGIN"); if (Number(db.prepare("PRAGMA user_version").get()!.user_version) !== 2) throw new Error("Unsupported research schema; no legacy reader"); const result = read(db); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
    finally { if (db !== this.#db) db.close(); }
  }
  #transaction<T>(body: (db: DatabaseSync) => T): T {
    const db = this.#open(); db.exec("BEGIN IMMEDIATE");
    try { const result = body(db); db.exec("COMMIT"); return structuredClone(result); }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  #run(db: DatabaseSync, id: string): ResearchRun | undefined { const row = db.prepare("SELECT value FROM runs WHERE id=?").get(id); return row ? JSON.parse(String(row.value)) : undefined; }
  #row<T>(db: DatabaseSync, table: Table, runId: string, id: string): T | undefined { const row = db.prepare(`SELECT value FROM ${table} WHERE run_id=? AND id=?`).get(runId, id); return row ? JSON.parse(String(row.value)) : undefined; }
  #rows<T>(db: DatabaseSync, table: Table, runId: string): T[] { return db.prepare(`SELECT value FROM ${table} WHERE run_id=? ORDER BY rowid`).all(runId).map(row => JSON.parse(String(row.value)) as T); }
  #put(db: DatabaseSync, table: Table, runId: string, id: string, value: unknown): void { db.prepare(`INSERT INTO ${table} VALUES (?,?,?) ON CONFLICT(run_id,id) DO UPDATE SET value=excluded.value`).run(runId, id, canonical(value)); }
  #artifact(db: DatabaseSync, runId: string, id: string, value: unknown): void {
    const existing = this.#row(db, "artifact_refs", runId, id);
    if (existing) {
      if (canonical(existing) !== canonical(value)) throw new Error("Conflicting artifact identity");
      return;
    }
    db.prepare("INSERT INTO artifact_refs VALUES (?,?,?)").run(runId, id, canonical(value));
  }
  #evidence(db: DatabaseSync, run: ResearchRun, ids: string[]): boolean {
    return ids.every(id => {
      const ref = this.#row<Record<string, any>>(db, "artifact_refs", run.id, id);
      if (ref?.kind !== "native-evidence" || typeof ref.attemptId !== "string") return false;
      const attempt = this.#row<Attempt>(db, "attempts", run.id, ref.attemptId);
      return !!attempt && TERMINAL.includes(attempt.state as Terminal) && !!attempt.nativeDigest
        && ref.id === id && attempt.evidenceId === id && id === `evidence-${digest(attempt.id).slice(0, 32)}`
        && ref.nativeId === attempt.nativeId && ref.digest === attempt.nativeDigest && ref.status === attempt.state
        && ref.materialId === attempt.materialId && attempt.materialId === run.spec.source.materialId
        && ref.epoch === attempt.epoch && attempt.epoch === run.epoch
        && ref.generation === attempt.generation && attempt.generation === run.generation;
    });
  }
  #save(db: DatabaseSync, run: ResearchRun): void { const result = db.prepare("UPDATE runs SET revision=?,value=? WHERE id=? AND generation=? AND revision=?").run(run.revision, canonical(run), run.id, run.generation, run.revision - 1); if (result.changes !== 1) throw new Error("Stale generation/revision cannot write research facts"); }
  get(id: string): ResearchRun | undefined { return this.#read(db => this.#run(db, id), undefined); }
  projection(runId: string): Record<string, unknown> | null {
    return this.#read(db => {
      const run = this.#run(db, runId); if (!run) return null;
      const projection: Record<string, unknown> = { run, validation: "unscored-read-only-observations; evaluators/candidate-snapshots unavailable-PR4+" };
      for (const table of TABLES.filter(table => table !== "operations")) projection[table] = this.#rows(db, table, runId).slice(table === "events" ? -64 : 0);
      return projection;
    }, null);
  }
  create(run: ResearchRun): ResearchRun {
    return this.#transaction(db => {
      const old = this.#run(db, run.id);
      if (old) { if (old.requestHash !== run.requestHash || canonical(old.owner) !== canonical(run.owner)) throw new Error("Duplicate start binding changed"); return old; }
      db.prepare("INSERT INTO runs VALUES (?,?,?,?)").run(run.id, run.revision, run.generation, canonical(run));
      this.#put(db, "events", run.id, "0", { revision: 0, type: "started", specId: run.spec.identity, scored: false });
      return run;
    });
  }
  authorize(runId: string, owner: NativeOwner, generation: string): ResearchRun {
    const run = this.get(runId); if (!run) throw new Error("Unknown research run");
    if (canonical(run.owner) !== canonical(owner)) throw new Error("Different native owning Pi root/host/identity; no attachment");
    if (run.generation !== generation) throw new Error("Replacement generation requires explicit reconciliation; no stale write or redispatch");
    return run;
  }
  binding(run: ResearchRun, commandId: string): BoundCommand { return { runId: run.id, materialId: run.spec.source.materialId, epoch: run.epoch, revision: run.revision, commandId }; }
  check(run: ResearchRun, command: BoundCommand): void {
    if (command.runId !== run.id || command.materialId !== run.spec.source.materialId || command.epoch !== run.epoch || command.revision !== run.revision) throw new Error("Stale run/material/epoch/revision binding");
  }
  receipt(command: BoundCommand, action: string, payload: unknown): Receipt | undefined {
    return this.#read(db => {
      const old = this.#row<{ hash: string; receipt: Receipt }>(db, "operations", command.runId, command.commandId);
      if (old && old.hash !== digest({ command, action, payload })) throw new Error("Conflicting duplicate command ID");
      return old?.receipt;
    }, undefined);
  }
  #commit(command: BoundCommand, generation: string, action: string, payload: unknown, change: (db: DatabaseSync, run: ResearchRun) => { status?: Receipt["status"]; reason?: string; value?: unknown }): Receipt {
    return this.#transaction(db => {
      const run = this.#run(db, command.runId); if (!run || run.generation !== generation) throw new Error("Unknown or stale generation");
      const hash = digest({ command, action, payload });
      const old = this.#row<{ hash: string; receipt: Receipt }>(db, "operations", run.id, command.commandId);
      if (old) { if (old.hash !== hash) throw new Error("Conflicting duplicate command ID"); return old.receipt; }
      this.check(run, command);
      const result = change(db, run); run.revision++;
      const receipt: Receipt = { commandId: command.commandId, runId: run.id, revision: run.revision, action, status: result.status ?? "applied", reason: result.reason ?? null, value: result.value ?? null };
      this.#put(db, "operations", run.id, command.commandId, { hash, receipt });
      this.#put(db, "events", run.id, String(run.revision), { revision: run.revision, type: action, commandId: command.commandId, status: receipt.status, reason: receipt.reason });
      this.#save(db, run); return receipt;
    });
  }
  research(action: ResearchAction, command: BoundCommand, payload: Record<string, any>, generation: string): Receipt {
    validate(ACTION_SCHEMAS[action], { ...command, payload });
    return this.#commit(command, generation, action, payload, (db, run) => {
      const node = (id: string) => this.#row<Record<string, any>>(db, "nodes", run.id, id);
      const evidence = (ids: string[]) => this.#evidence(db, run, ids);
      if (action === "propose") {
        if (node(payload.nodeId)) throw new Error("Node ID already exists");
        const parent = payload.parentId ? node(payload.parentId) : undefined;
        if (payload.parentId && (!parent || parent.type !== "direction" || parent.pruned)) throw new Error("Parent must be an eligible direction");
        const depth = parent ? parent.depth + 1 : 0;
        if (depth > run.spec.config.search.maxDepth || this.#rows<Record<string, any>>(db, "nodes", run.id).filter(n => n.parentId === payload.parentId).length >= run.spec.config.search.maxChildren) throw new Error("Topology depth/child bound exceeded");
        if (["direction", "collaborative"].includes(run.spec.config.search.mode) && payload.parentId && parent?.reviewed !== true) throw new Error("Direction expansion requires actual owning-Pi research review");
        this.#put(db, "nodes", run.id, payload.nodeId, { ...payload, depth, pruned: false, reviewed: false }); return { value: { nodeId: payload.nodeId } };
      }
      if (action === "dispatch") {
        const selected = node(payload.nodeId);
        if (!selected || selected.type !== "hypothesis" || selected.pruned) throw new Error("Dispatch requires an eligible hypothesis leaf");
        if (["direction", "collaborative"].includes(run.spec.config.search.mode)) {
          const direction = selected.parentId ? node(selected.parentId) : undefined;
          if (!direction || direction.type !== "direction" || direction.pruned || direction.reviewed !== true) throw new Error("Dispatch requires an approved direction; root hypotheses cannot bypass owning-Pi review");
        }
        if (!["ready", "running"].includes(run.state)) throw new Error("Run is not dispatchable");
        if (this.#rows<Attempt>(db, "attempts", run.id).some(a => a.id === payload.attemptId || a.nodeId === payload.nodeId)) throw new Error("Attempt/hypothesis already reserved; no duplicate execution");
        const usedMs = run.activeMs + (run.activeSince === null ? 0 : Date.now() - run.activeSince);
        if (run.attemptsUsed >= run.spec.config.limits.attempts || run.active >= run.spec.config.search.concurrency || usedMs >= run.spec.config.limits.activeMs) throw new Error("Attempt/capacity/active-time budget exhausted");
        const attempt: Attempt = { id: payload.attemptId, nodeId: payload.nodeId, task: selected.rationale, state: "reserved", nativeId: null, nativeDigest: null, evidenceId: null, model: run.spec.roles.executor.model, materialId: run.spec.source.materialId, epoch: run.epoch, generation };
        run.attemptsUsed++; run.active++; run.activeSince ??= Date.now(); run.state = "running";
        this.#put(db, "attempts", run.id, attempt.id, attempt); return { value: attempt };
      }
      if (action === "collect") {
        const attempt = this.#row<Attempt>(db, "attempts", run.id, payload.attemptId);
        if (!attempt?.nativeDigest) return { status: "blocked", reason: "No settled owner-held native wait; supplied results are not accepted" };
        return { value: attempt };
      }
      if (action === "evaluate") return { status: "blocked", reason: "Evaluator adapters and exact candidate snapshots unavailable until PR4/PR5; no scalar accepted or evaluation charged" };
      if (action === "distill") {
        if (!node(payload.nodeId) || !evidence(payload.evidenceIds)) throw new Error("Insight needs existing node and owner-ingested evidence");
        if (this.#row(db, "lessons", run.id, payload.lessonId)) throw new Error("Lesson ID already exists");
        this.#put(db, "lessons", run.id, payload.lessonId, { ...payload, validation: "unscored-observation" }); return { value: { lessonId: payload.lessonId } };
      }
      if (!evidence(payload.evidenceIds) || (payload.nodeId && !node(payload.nodeId))) throw new Error("Decision references missing node/evidence");
      if (this.#row(db, "decisions", run.id, payload.decisionId)) throw new Error("Decision ID already exists");
      if (payload.decision === "keep") return { status: "blocked", reason: "Measured keep unavailable without exact evaluator/incumbent evidence (PR4+)" };
      if (["prune", "discard"].includes(payload.decision)) { const selected = node(payload.nodeId); if (!selected) throw new Error("Selection required"); selected.pruned = true; this.#put(db, "nodes", run.id, payload.nodeId, selected); }
      if (payload.decision === "request_review") {
        if (run.pendingDecisionId) throw new Error("A review is already pending");
        // A renewed choice supersedes prior admission, even while the dialog is
        // pending or later dismissed. Historical receipts remain immutable.
        if (payload.nodeId) { const selected = node(payload.nodeId)!; selected.reviewed = false; this.#put(db, "nodes", run.id, payload.nodeId, selected); }
        run.pendingDecisionId = payload.decisionId; run.state = "awaiting_review";
      }
      if (payload.decision === "stop") { run.state = "paused"; }
      this.#put(db, "decisions", run.id, payload.decisionId, { ...payload, status: payload.decision === "request_review" ? "pending" : "applied", materialId: command.materialId, epoch: command.epoch, revision: run.revision + 1 });
      return { value: { decisionId: payload.decisionId } };
    });
  }
  validateProposal(value: unknown, runId: string): Proposal {
    validate(ACTOR_PROPOSAL_SCHEMA, value); const proposal = value as Proposal, run = this.get(runId)!;
    this.check(run, proposal);
    if (proposal.estimatedBudget.attempts !== (proposal.kind === "dispatch" ? 1 : 0) || proposal.estimatedBudget.evaluatorCalls !== (proposal.kind === "evaluate" ? 1 : 0)) throw new Error("Proposal budget estimate does not match action");
    if (!this.#read(db => this.#evidence(db, run, proposal.expectedEvidence), false)) throw new Error("Proposal expects invalid or unknown native evidence");
    return structuredClone(proposal);
  }
  attempt(runId: string, id: string): Attempt | undefined { return this.#read(db => this.#row<Attempt>(db, "attempts", runId, id), undefined); }
  native(runId: string, attemptId: string, generation: string, result: { id: string; status?: Terminal; cwd: string; summary?: string }): Receipt {
    const run = this.get(runId)!;
    const terminal = result.status !== undefined;
    const command = this.binding(run, `${terminal ? "terminal" : "attach"}-${digest(attemptId).slice(0, 32)}`);
    // Internal terminal observation uses stable operation identity independent of
    // intervening actor/control revisions. It never trusts caller-supplied facts.
    const previous = this.#read(db => this.#row<{ receipt: Receipt }>(db, "operations", runId, command.commandId), undefined);
    const nativeDigest = digest(result);
    if (previous) {
      const attempt = this.attempt(runId, attemptId)!;
      if (attempt.nativeId !== result.id || (terminal && attempt.nativeDigest !== nativeDigest)) throw new Error("Conflicting duplicate native result");
      if (run.generation !== generation) throw new Error("Stale native generation");
      return previous.receipt;
    }
    return this.#commit(command, generation, terminal ? "native-terminal" : "native-attach", result, (db, current) => {
      const attempt = this.#row<Attempt>(db, "attempts", runId, attemptId);
      if (!attempt || result.cwd !== current.spec.source.root || (attempt.nativeId && attempt.nativeId !== result.id)) throw new Error("Native attempt identity mismatch");
      if (!terminal && (attempt.nativeDigest || TERMINAL.includes(attempt.state as Terminal))) throw new Error("Late attach cannot regress a terminal attempt");
      if (attempt.materialId !== current.spec.source.materialId || attempt.epoch !== current.epoch || attempt.generation !== generation) throw new Error("Native attempt provenance mismatch");
      attempt.nativeId = result.id;
      if (terminal) {
        attempt.state = result.status!; attempt.nativeDigest = nativeDigest; attempt.evidenceId = `evidence-${digest(attemptId).slice(0, 32)}`;
        this.#artifact(db, runId, attempt.evidenceId, { id: attempt.evidenceId, kind: "native-evidence", attemptId, generation, nativeId: result.id, materialId: attempt.materialId, epoch: attempt.epoch, status: result.status, digest: nativeDigest, summary: (result.summary ?? "").slice(0, 1024), validation: "unscored-native-observation" });
        current.active--; if (current.active < 0) throw new Error("Capacity underflow");
      } else { attempt.state = "running"; }
      this.#put(db, "attempts", runId, attemptId, attempt); return { value: attempt };
    });
  }
  control(command: BoundCommand, generation: string, action: string, instruction?: string): Receipt {
    return this.#commit(command, generation, "control", { action, instruction: instruction ?? null }, (db, run) => {
      if (action === "steer") { if (!instruction) throw new Error("Steer requires instruction"); run.steering = [...run.steering.slice(-15), instruction]; }
      else if (instruction !== undefined) throw new Error("Only steer accepts instruction");
      if (action === "pause") { run.state = "paused"; if (run.activeSince !== null) { run.activeMs += Date.now() - run.activeSince; run.activeSince = null; } }
      if (action === "cancel") run.state = "interrupted";
      if (action === "resume") {
        if (run.execution !== "not-started") return { status: "blocked", reason: "Native actor replacement/partial execution resume unavailable until PR8; frozen spec retained without redispatch" };
        if (run.active || ["cleanup_pending", "interrupted"].includes(run.state)) return { status: "blocked", reason: "Explicit native reconciliation/partial execution resume unavailable until PR8; frozen spec retained" };
        if (run.pendingDecisionId) return { status: "blocked", reason: "Pending research review is not approval" };
        run.state = "ready";
      }
      const receipt = { status: action === "cancel" ? "queued" as const : "applied" as const, value: { state: run.state, specId: run.spec.identity } };
      this.#put(db, "controls", run.id, command.commandId, { ...command, action, instruction: instruction ?? null, ...receipt }); return receipt;
    });
  }
  review(command: BoundCommand, generation: string, decisionId: string, response: "Approve research choice" | "Reject research choice", owner: NativeOwner): Receipt {
    return this.#commit(command, generation, "review", { decisionId }, (db, run) => {
      if (canonical(owner) !== canonical(run.owner) || run.pendingDecisionId !== decisionId) throw new Error("Stale owning-Pi review response");
      const decision = this.#row<Record<string, any>>(db, "decisions", run.id, decisionId);
      if (!decision || decision.status !== "pending" || decision.revision !== run.revision || decision.materialId !== command.materialId || decision.epoch !== command.epoch) throw new Error("Stale pending review revision");
      const approved = response === "Approve research choice";
      decision.status = approved ? "approved-choice-only" : "rejected";
      decision.userReceipt = { response, owner, materialId: command.materialId, epoch: command.epoch, revision: command.revision, commandId: command.commandId };
      this.#put(db, "decisions", run.id, decisionId, decision);
      if (decision.nodeId) { const node = this.#row<Record<string, any>>(db, "nodes", run.id, decision.nodeId)!; node.reviewed = approved; this.#put(db, "nodes", run.id, decision.nodeId, node); }
      run.pendingDecisionId = null; run.state = "paused"; return { value: decision.userReceipt };
    });
  }
  unavailable(command: BoundCommand, generation: string, action: string, payload: unknown, reason: string): Receipt { return this.#commit(command, generation, action, payload, () => ({ status: "blocked", reason })); }
  exported(command: BoundCommand, generation: string, path: string, contentDigest: string): Receipt {
    return this.#commit(command, generation, "export", { format: "json" }, (db, run) => {
      const id = `export-${digest(command.commandId)}`;
      this.#artifact(db, run.id, id, { id, commandId: command.commandId, path, digest: contentDigest, kind: "unscored-json-export" });
      return { value: { path, digest: contentDigest } };
    });
  }
  settle(runId: string, generation: string, state: ResearchRun["state"], execution: string, error: string | null, settlementId = `settle-${generation}`): void {
    const run = this.get(runId)!;
    this.#commit(this.binding(run, settlementId), generation, "settlement", { state, execution, error }, (db, current) => {
      // Finalize only the unchanged choice at successful native quiescence. An
      // intervening control/result/dialog remains stale; never rebase it here.
      if (current.state === "awaiting_review" && current.pendingDecisionId && state === "completed" && error === null && current.active === 0) {
        const decision = this.#row<Record<string, any>>(db, "decisions", runId, current.pendingDecisionId);
        if (decision?.status === "pending" && decision.revision === current.revision && decision.materialId === current.spec.source.materialId && decision.epoch === current.epoch) {
          decision.revision = current.revision + 1;
          this.#put(db, "decisions", runId, current.pendingDecisionId, decision);
        }
      }
      if (!["paused", "awaiting_review"].includes(current.state) || ["cancelled", "cleanup_pending", "interrupted", "failed"].includes(state)) current.state = state;
      if (current.activeSince !== null) { current.activeMs += Date.now() - current.activeSince; current.activeSince = null; }
      current.execution = execution; current.error = error; return {};
    });
  }
  close(): void { if (this.#closed) return; this.#db?.close(); this.#db = undefined; this.#closed = true; }
}
