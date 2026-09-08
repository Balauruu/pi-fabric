import { existsSync, mkdirSync, readFileSync, realpathSync, openSync, readSync, closeSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { TERMINAL, type NativeOwner, type Terminal } from "../managed/contracts.js";
import { ACTION_SCHEMAS, ACTOR_PROPOSAL_SCHEMA, lessonProvenanceSchema, canonical, digest, validate, type BoundCommand, type Proposal, type ResearchAction } from "./contracts.js";
import type { ResolvedSpec } from "./spec.js";
import { evaluationCalls, evaluationSummary, type EvaluationRecord } from "../evaluators/contracts.js";
import type { MaterialState } from "../material/contracts.js";
import type { Candidate } from "../material/Workspace.js";
import { evaluationCapacity, reservedEvaluationCalls, researchFacts } from './policy.js';
import { ancestry, validateNode, validateSelection, type Selection } from './tree.js';
import { promotionGate } from "../material/acceptance.js";
import { lessonReference, selectLessons, proposalTrajectory, type LessonReference, type ProposalTrajectory } from './Experience.js';
import { splitOf, validationUses, validationProjection } from "../evaluators/validation.js";
import {groundingStateSchema,sourceAccessSchema,sourceInspectionSchema,literatureResultSchema,type GroundingState,type SourceAccess,type SourceInspection} from './GroundingContracts.js';
import type {Binding} from '../managed/BindingStore.js';
export interface WaveEvidence { waveId:string; parentIncumbent:string; attemptIds:string[]; startedAt:number; preparedAt:number; settledAt:number; collectedAt:number }
export interface ResearchRun {
  grounding?: GroundingState;
  waves?: WaveEvidence[];
  generationHistory?: string[];
  roleRevisions?: Array<{ revision: number; commandId: string; bundle: import("../managed/RoleBundle.js").RoleBundleRef; coordinatorId: string; executorId: string; literatureId?: string }>;
  material?: MaterialState;
  id: string; spec: ResolvedSpec; requestHash: string; owner: NativeOwner; componentId: string; generation: string;
  epoch: string; revision: number; state: "ready" | "running" | "paused" | "awaiting_review" | "completed" | "cancelled" | "interrupted" | "cleanup_pending" | "failed";
  attemptsUsed: number; active: number; createdAt: number; activeMs: number; activeSince: number | null; steering: string[]; pendingDecisionId: string | null;
  execution: string; error: string | null;
}
export interface Receipt { commandId: string; runId: string; revision: number; status: "applied" | "queued" | "blocked"; action: string; reason: string | null; value: unknown }
export interface Attempt { continuation?: { mode:"continue-partial"|"restart-parent"; previousAttemptId:string; rootAttemptId:string; sourceOid:string; summary:string }; slotReserved?: boolean; selection?: Selection; waveId?: string; parentIncumbent?: string; evaluationReservation?: number; id: string; nodeId: string; task: string; state: "reserved" | "running" | "completed" | "failed" | "stopped" | "timed_out"; nativeId: string | null; nativeDigest: string | null; evidenceId: string | null; model: string | null; materialId: string; epoch: string; generation: string }
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
  prepareOwner():void { if(existsSync(this.path))this.#open(); }
  #open(): DatabaseSync {
    if (this.#closed) throw new Error("Research storage is closed");
    if (!this.#db) {
      mkdirSync(dirname(this.path), { recursive: true });
      const db = new DatabaseSync(this.path);
      try {
        db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;");
        const version = Number(db.prepare("PRAGMA user_version").get()!.user_version);
        if ((version !== 0 && version !== 2) || (version === 0 && db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().length > 0)) throw new Error("Unsupported research schema; no legacy import");
        // Only the owning write-open configures journaling, after schema validation.
        // SQLite's checkpoint and mode transition require quiescent WAL users.
        // Never delete sidecars, discard uncheckpointed data or convert on a read.
        if(String(db.prepare('PRAGMA journal_mode').get()!.journal_mode)==='wal'){
          const checkpoint=db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get()!;
          if(Number(checkpoint.busy)!==0)throw new Error('Research WAL is busy; close existing readers/writers before owner journal setup');
        }
        if(String(db.prepare('PRAGMA journal_mode=DELETE').get()!.journal_mode)!=='delete')throw new Error('Research rollback journal requires quiescent existing users');
        db.exec("BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, generation TEXT NOT NULL, value TEXT NOT NULL);");
        for (const table of TABLES) db.exec(`CREATE TABLE IF NOT EXISTS ${table} (run_id TEXT NOT NULL REFERENCES runs(id), id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(run_id,id));`);
        // Re-stamping an already current version dirties the database header
        // even when every CREATE above was a no-op. Reopening a current owner
        // must not mutate bytes before an admitted domain operation.
        if (version === 0) db.exec("PRAGMA user_version=2");
        db.exec("COMMIT"); this.#db = db;
      } catch (error) { db.close(); throw error; }
    }
    return this.#db;
  }
  #read<T>(read: (db: DatabaseSync) => T, absent: T): T {
    if (this.#closed) throw new Error("Research storage is closed");
    if (!this.#db && !existsSync(this.path)) return absent;
    if(!this.#db){
      // Refuse WAL before opening a SQLite reader, which can create sidecars even
      // in read-only mode. Header inspection grants no unlocked projection.
      // Only owner setup performs a locked checkpoint/mode transition.
      const fd=openSync(this.path,'r'),header=Buffer.alloc(20);
      try{readSync(fd,header,0,20,0);}finally{closeSync(fd);}
      if(header[18]===2||header[19]===2)throw new Error('Read-only WAL projection unavailable. Reload the owning Pi with quiescent WAL users for owner journal setup.');
    }
    const cold = this.#db === undefined;
    const db = this.#db ?? new DatabaseSync(this.path, { readOnly: true });
    try {
      // Header inspection is only an early refusal. A concurrent DELETE -> WAL
      // switch must also fail closed at SQLite admission, without creating SHM.
      // EXCLUSIVE before first access avoids SQLite's shared-memory WAL index.
      // This connection is read-only and disposable; never change the owner's
      // locking policy, convert journaling, or retain a hidden reader connection.
      if (cold) db.exec("PRAGMA locking_mode=EXCLUSIVE");
      db.exec("PRAGMA busy_timeout=5000; BEGIN");
      if (Number(db.prepare("PRAGMA user_version").get()!.user_version) !== 2) throw new Error("Unsupported research schema; no legacy reader");
      const result = read(db);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      // Admission may fail before BEGIN or SQLite may already have rolled back.
      // Preserve that primary failure rather than replacing it with ROLLBACK's.
      try { db.exec("ROLLBACK"); } catch { /* The original read failure wins. */ }
      if (cold && error instanceof Error && "errcode" in error && error.errcode === 3850) {
        // SQLITE_IOERR_LOCK: a read-only descriptor cannot take the WAL lock.
        // Keep the exact SQLite error as cause; do not claim recovery or retry.
        throw new Error(`Research read-only projection unavailable: ${error.message}`, { cause: error });
      }
      throw error;
    } finally {
      if (cold) db.close();
    }
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
  #operation(db:DatabaseSync,run:ResearchRun,id:string,value:Record<string,any>):void {
    // Capture the operation's own transition atomically, before a later control
    // can change the run or a crash can delay trajectory finalization.
    this.#put(db,'operations',run.id,id,{...value,...(value.trajectory&&value.receipt?{trajectoryState:{revision:value.receipt.revision,incumbent:run.material?.incumbent??null}}:{})});
  }
  #actorEvidence(db:DatabaseSync,run:ResearchRun,proposal:Proposal):void {
    const ids=[...proposal.expectedEvidence,...(proposal.payload.evidenceIds??[]),...(proposal.payload.evaluationId?[proposal.payload.evaluationId]:[])];
    if(ids.some(id=>{const e=this.#row<EvaluationRecord>(db,'evaluations',run.id,id);return e&&splitOf(e)!=='development';}))throw new Error('Ordinary actor proposals require development evidence, never held-out/final links');
  }
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
      if (run.material) { const e = this.#row<EvaluationRecord>(db, "evaluations", run.id, id); if (e) return e.state === "completed" && e.epoch === run.epoch && e.specId === run.spec.identity; }
      if (ref?.kind !== "native-evidence" || typeof ref.attemptId !== "string") return false;
      const attempt = this.#row<Attempt>(db, "attempts", run.id, ref.attemptId);
      return !!attempt && TERMINAL.includes(attempt.state as Terminal) && !!attempt.nativeDigest
        && ref.id === id && attempt.evidenceId === id && id === `evidence-${digest(attempt.id).slice(0, 32)}`
        && ref.nativeId === attempt.nativeId && ref.digest === attempt.nativeDigest && ref.status === attempt.state
        && ref.materialId === attempt.materialId && attempt.materialId === run.spec.source.materialId
        && ref.epoch === attempt.epoch && attempt.epoch === run.epoch
        && ref.generation === attempt.generation && (attempt.generation === run.generation || !!run.generationHistory?.includes(attempt.generation));
    });
  }
  #save(db: DatabaseSync, run: ResearchRun): void { const result = db.prepare("UPDATE runs SET revision=?,value=? WHERE id=? AND generation=? AND revision=?").run(run.revision, canonical(run), run.id, run.generation, run.revision - 1); if (result.changes !== 1) throw new Error("Stale generation/revision cannot write research facts"); }
  get(id: string): ResearchRun | undefined { return this.#read(db => this.#run(db, id), undefined); }
  #projection(db: DatabaseSync, runId: string): Record<string, unknown> | null {
      const run = this.#run(db, runId); if (!run) return null;
      const projection: Record<string, unknown> = { run, validation: run.material ? "owned-material; exact-incumbent-comparison; descriptive-noise-policy" : run.spec.config.execution === "evaluate" ? "exact-material-evaluation; no-incumbent-adoption-PR5" : "unscored-read-only-observations" };
      for (const table of TABLES.filter(table => table !== "operations")) projection[table] = table === "evaluations" ? this.#rows<EvaluationRecord>(db, table, runId).map(evaluationSummary) : this.#rows(db, table, runId).slice(table === "events" ? -64 : 0);
      if (run.material) projection.validation = validationProjection(run, this.#rows<EvaluationRecord>(db, "evaluations", runId), projection.decisions as any[]);
      return projection;
  }
  projection(runId: string): Record<string, unknown> | null { return this.#read(db => this.#projection(db, runId), null); }
  ownedRunSelection(sessionId:string):{total:number;runs:ResearchRun[]} {
    return this.#read(db=>{
      const owned="json_extract(value,'$.owner.sessionId')=?",live="json_extract(value,'$.state') NOT IN ('completed','cancelled','failed')";
      const active=Number(db.prepare(`SELECT count(*) AS n FROM runs WHERE ${owned} AND ${live}`).get(sessionId)!.n);
      const where=owned+(active?` AND ${live}`:'');
      const total=active||Number(db.prepare(`SELECT count(*) AS n FROM runs WHERE ${owned}`).get(sessionId)!.n);
      return {total,runs:db.prepare(`SELECT value FROM runs WHERE ${where} ORDER BY rowid DESC LIMIT 128`).all(sessionId).map(r=>JSON.parse(String(r.value)))};
    },{total:0,runs:[]});
  }
  runs(): ResearchRun[] { return this.#read(db => db.prepare('SELECT value FROM runs ORDER BY rowid DESC LIMIT 128').all().map(r => JSON.parse(String(r.value))), []); }
  replay(runId: string): { revision: number; events: unknown[] } | null {
    return this.#read(db => { const run=this.#run(db,runId); return run ? {revision:run.revision,events:this.#rows(db,'events',runId)} : null; },null);
  }
  exportProjection(runId: string): Record<string, unknown> | null {
    return this.#read(db => { const p=this.#projection(db,runId); return p ? {...p,trajectories:this.#rows<any>(db,'operations',runId).filter(o=>o.trajectory).map(o=>o.trajectory)} : null; },null);
  }
  beginEvaluation(runId: string, generation: string, finalSelection = false): void {
    this.#transaction(db => {
      const run = this.#run(db, runId); if (!run || run.generation !== generation || !["evaluate", "material", "research"].includes(run.spec.config.execution)) throw new Error("Evaluation generation unavailable");
      if (run.material && (run.active !== 0 || run.material.pending || run.pendingDecisionId)) throw new Error("Writers/integration/review must settle before evaluation");
      if (["cancelled", "cleanup_pending", "interrupted"].includes(run.state) || (run.material && ["failed", "completed"].includes(run.state)) || (run.state === "paused" && !finalSelection)) throw new Error("Evaluation requires explicit resume");
      if (finalSelection && run.state === "paused") { run.state="ready"; run.revision++; this.#save(db,run); }
      if (run.activeSince === null) { run.activeSince = Date.now(); run.revision++; this.#save(db, run); }
    });
  }
  evaluation(runId: string, id: string): EvaluationRecord | undefined { return this.#read(db => this.#row<EvaluationRecord>(db, "evaluations", runId, id), undefined); }
  evaluations(runId: string): EvaluationRecord[] { return this.#read(db => this.#rows<EvaluationRecord>(db, "evaluations", runId), []); }
  saveEvaluation(e: EvaluationRecord): void {
    if (e.state === "completed" && e.invocations.some(i => i.state !== "ingested")) throw new Error("Evaluation completion requires every invocation ingested");
    this.#transaction(db => {
      const run = this.#run(db, e.runId); if (!run || run.generation !== e.generation || run.spec.identity !== e.specId || run.epoch !== e.epoch || digest(run.owner) !== e.ownerBinding) throw new Error("Stale evaluation owner/spec/epoch binding");
      const previous = this.#row<EvaluationRecord>(db, "evaluations", run.id, e.id);
      if (!previous) {
        const records=this.#rows<EvaluationRecord>(db,'evaluations',run.id), split=splitOf(e), v=run.spec.validation;
        if(records.some(r=>splitOf(r)==='final'))throw new Error('Untouched final split already consumed; exact selection is terminal');
        if(split!=='development') {
          const dev=records.find(r=>r.id===e.developmentId);
          if(!v||!dev||splitOf(dev)!=='development'||dev.state!=='completed'||dev.attemptId!==e.attemptId||dev.epoch!==e.epoch||dev.specId!==e.specId||canonical(dev.definition.baseline)!==canonical(e.definition.baseline)||canonical(dev.definition.candidate)!==canonical(e.definition.candidate))throw new Error('Validation requires exact separate development pair');
          if(split==='held-out'&&(v.policy!=='selected'||(e.attemptId&&validationUses(records,'held-out')>=v.maxUses)))throw new Error('Adaptive held-out use limit reached');
          if(split==='final'&&(!e.attemptId||(v.policy!=='final'&&!v.final)))throw new Error('No final candidate/split selected');
        }
      }
      if (e.attemptId) {
        const attempt=this.#row<Attempt>(db,'attempts',run.id,e.attemptId);
        if(!run.material || !attempt?.nativeDigest || attempt.state!=='completed' || attempt.materialId!==run.spec.source.materialId || attempt.epoch!==run.epoch)throw new Error('Evaluation requires exact settled attempt binding');
      }
      if(previous?.state==='completed' && canonical({state:previous.state,validity:previous.validity,quality:previous.quality,analysis:previous.analysis})!==canonical({state:e.state,validity:e.validity,quality:e.quality,analysis:e.analysis}))throw new Error('Completed evaluation outcome is immutable');
      if (previous && ((previous.attemptId ?? null) !== (e.attemptId ?? null) || splitOf(previous) !== splitOf(e) || (previous.developmentId ?? null) !== (e.developmentId ?? null) || previous.purpose !== e.purpose || previous.definitionId !== e.definitionId || canonical(previous.snapshots) !== canonical(e.snapshots) || previous.invocations.length > e.invocations.length || previous.bindings.some((binding, i) => canonical(binding) !== canonical(e.bindings[i])))) throw new Error("Immutable evaluation identity changed");
      for (const prior of previous?.invocations ?? []) {
        const next = e.invocations.find(i => i.id === prior.id);
        if (!next || next.requestId !== prior.requestId || (prior.nativeId && prior.nativeId !== next.nativeId) || (prior.native && (!next.native || canonical({...prior.native,checks:[],checkResults:[]}) !== canonical({...next.native,checks:[],checkResults:[]}) || prior.native.checks.some((c,k)=>c!==next.native!.checks[k]) || (prior.native.checkResults??[]).some((c,k)=>canonical(c)!==canonical(next.native!.checkResults?.[k])))) || (prior.state === "ingested" && canonical(prior) !== canonical(next))) throw new Error("Conflicting native invocation or terminal replay");
      }
      for(const prior of previous?.invocations??[]) {
        const next=e.invocations.find(i=>i.id===prior.id)!;
        for(const c of prior.commandChecks??[]){const n=next.commandChecks?.find(x=>x.id===c.id);if(!n||n.requestId!==c.requestId||(c.nativeId&&c.nativeId!==n.nativeId)||(c.state==='native-complete'&&canonical(c)!==canonical(n)))throw new Error('Immutable command check binding changed');}
      }
      const count = this.#rows<EvaluationRecord>(db, "evaluations", run.id).filter(r => r.id !== e.id).reduce((n, r) => n + evaluationCalls(r), evaluationCalls(e));
      if (count + reservedEvaluationCalls(this.#rows<Attempt>(db, "attempts", run.id), [...this.#rows<EvaluationRecord>(db, "evaluations", run.id).filter(r => r.id !== e.id), e]) > run.spec.config.limits.evaluatorCalls) throw new Error("Evaluator invocation capacity exhausted (including retries/rechecks/feedback/judges)");
      this.#put(db, "evaluations", run.id, e.id, e); run.revision++;
      this.#put(db, "events", run.id, String(run.revision), { revision: run.revision, type: `evaluation:${e.state}:${e.invocations.at(-1)?.state ?? "frozen"}`, commandId: e.id, status: e.state === "running" ? "queued" : e.state === "completed" ? "applied" : "blocked", reason: e.error });
      this.#save(db, run);
    });
  }
  evaluationReceipt(command: BoundCommand, generation: string, action: "control" | "evaluate", payload: unknown, status: Receipt["status"], reason: string | null): Receipt {
    return this.#transaction(db => {
      const run = this.#run(db, command.runId); if (!run || run.generation !== generation || !["evaluate", "material", "research"].includes(run.spec.config.execution) || run.epoch !== command.epoch || run.spec.source.materialId !== command.materialId) throw new Error("Stale evaluation receipt binding");
      const hash = digest({ command, action, payload }), old = this.#row<{ hash: string; receipt: Receipt }>(db, "operations", run.id, command.commandId);
      if (old && old.hash !== hash) throw new Error("Conflicting duplicate evaluation control");
      if (old?.receipt) return old.receipt;
      run.revision++;
      if (run.material?.pending) run.material.pending.revision = run.revision;
      const value = { state: run.state, specId: run.spec.identity };
      const receipt: Receipt = { commandId: command.commandId, runId: run.id, revision: run.revision, status, action, reason, value };
      this.#operation(db, run, command.commandId, { ...old, hash, receipt });
      this.#put(db, "events", run.id, String(run.revision), { revision: run.revision, type: action, commandId: command.commandId, status, reason });
      if (action === "control" && status !== "blocked") this.#put(db, "controls", run.id, command.commandId, { ...command, action: "resume", instruction: null, status, value });
      this.#save(db, run); return receipt;
    });
  }
  rebindPendingReview(command:BoundCommand,owner:NativeOwner,componentId:string,generation:string,operation?:{action:'control'|'evaluate';payload:unknown}):Receipt|undefined {
    return this.#transaction(db=>{
      const run=this.#run(db,command.runId);if(!run)throw new Error('Unknown pending review run');this.check(run,command);
      const {identity,...body}=run.spec;
      if(!run.material||!['material','research'].includes(run.spec.config.execution)||identity!==digest(body)||canonical(run.owner)!==canonical(owner)||run.componentId!==componentId||run.active||run.material.pending||!run.pendingDecisionId||['cancelled','completed','failed'].includes(run.state)||this.#rows<EvaluationRecord>(db,'evaluations',run.id).some(e=>e.state!=='completed'))throw new Error('Immutable pending review recovery boundary mismatch');
      const decision=this.#row<Record<string,any>>(db,'decisions',run.id,run.pendingDecisionId);
      if(decision?.status!=='pending'||decision.userReceipt||decision.materialId!==command.materialId||decision.epoch!==command.epoch)throw new Error('Pending choice identity mismatch');
      const old=run.generation;
      if(old!==generation){const history=[...new Set([...(run.generationHistory??[]),old])];if(history.length>128)throw new Error('Generation history exhausted');run.generationHistory=history;}
      run.generation=generation;run.revision++;run.state='awaiting_review';if(run.spec.config.execution==='research')run.execution='research-stop:awaiting_review';
      if(run.activeSince!==null){run.activeMs+=Date.now()-run.activeSince;run.activeSince=null;}
      decision.revision=run.revision;this.#put(db,'decisions',run.id,run.pendingDecisionId,decision);
      if(db.prepare('UPDATE runs SET revision=?,generation=?,value=? WHERE id=? AND generation=? AND revision=?').run(run.revision,generation,canonical(run),run.id,old,command.revision).changes!==1)throw new Error('Stale review recovery generation');
      const reason='Choice retained without approval or dispatch';
      this.#put(db,'events',run.id,String(run.revision),{revision:run.revision,type:'pending-review-rebind',commandId:command.commandId,status:'queued',reason});
      if(operation){
        const hash=digest({command,action:operation.action,payload:operation.payload});
        if(this.#row(db,'operations',run.id,command.commandId))throw new Error('Conflicting pending review recovery command');
        const value={state:run.state,specId:run.spec.identity},receipt:Receipt={commandId:command.commandId,runId:run.id,revision:run.revision,status:'applied',action:operation.action,reason,value};
        this.#put(db,'operations',run.id,command.commandId,{hash,receipt});
        if(operation.action==='control')this.#put(db,'controls',run.id,command.commandId,{...command,action:'resume',instruction:null,status:'applied',value});
        return receipt;
      }

    });
  }
  rebindRecovery(command:BoundCommand,owner:NativeOwner,componentId:string,generation:string):void {
    this.#transaction(db=>{
      const run=this.#run(db,command.runId);if(!run)throw new Error('Unknown recovery run');this.check(run,command);
      const {identity,...body}=run.spec;
      if(!run.material||identity!==digest(body)||canonical(run.owner)!==canonical(owner)||run.componentId!==componentId||run.pendingDecisionId||['cancelled','completed','failed'].includes(run.state))throw new Error('Immutable recovery owner/spec or terminal/review boundary mismatch');
      const old=run.generation;if(old!==generation){const history=[...new Set([...(run.generationHistory??[]),old])];if(history.length>128)throw new Error('Generation history exhausted');run.generationHistory=history;}
      run.generation=generation;run.revision++;if(run.state!=='cleanup_pending')run.state='interrupted';
      if(run.activeSince!==null){run.activeMs+=Date.now()-run.activeSince;run.activeSince=null;}
      if(run.material.pending)run.material.pending.revision=run.revision;
      if(db.prepare('UPDATE runs SET revision=?,generation=?,value=? WHERE id=? AND generation=? AND revision=?').run(run.revision,generation,canonical(run),run.id,old,command.revision).changes!==1)throw new Error('Stale recovery generation');
      this.#put(db,'events',run.id,String(run.revision),{revision:run.revision,type:'native-recovery-rebind',commandId:command.commandId,status:'queued',reason:null});
    });
  }
  rebindEvaluationRun(command: BoundCommand, owner: NativeOwner, componentId: string, generation: string): void {
    this.#transaction(db => {
      const run = this.#run(db, command.runId); if (!run) throw new Error("Unknown evaluation run"); this.check(run, command);
      if (canonical(run.owner) !== canonical(owner) || run.componentId !== componentId || !["evaluate", "material", "research"].includes(run.spec.config.execution) || run.active !== 0) throw new Error("Immutable native owner/component/evaluation binding mismatch");
      if (run.material && ["cancelled", "completed", "failed"].includes(run.state)) throw new Error("Terminal material run cannot resume; start a new run");
      if (run.material && (run.pendingDecisionId || run.material.pending)) throw new Error("Pending integration/research review must settle before resume");
      const oldGeneration = run.generation;
      if (generation !== oldGeneration) {
        const history = [...new Set([...(run.generationHistory ?? []), oldGeneration])];
        if (history.length > 128) throw new Error('Run generation-history capacity exhausted');
        run.generationHistory = history;
      }
      run.generation = generation; run.revision++;
      if (run.material?.pending) run.material.pending.revision = run.revision;
      if ((run.material && run.state === "paused") || this.#rows<EvaluationRecord>(db, "evaluations", run.id).some(e => e.state !== "completed")) { run.state = "ready"; run.activeSince ??= Date.now(); }
      if (db.prepare("UPDATE runs SET revision=?,generation=?,value=? WHERE id=? AND generation=? AND revision=?").run(run.revision, generation, canonical(run), run.id, oldGeneration, command.revision).changes !== 1) throw new Error("Stale reconciliation");
      // Completed records retain their original provenance. Incomplete records
      // append an explicit evaluator binding when reconciled by EvaluationEngine.
    });
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
  /** Source-only authority: retain the terminal research generation and all domain state.
   * A fresh owning-Pi write command may reconcile its original source intent, not resume research. */
  authorizeSource(runId:string,owner:NativeOwner,componentId:string,generation:string):ResearchRun {
    const run=this.get(runId);if(!run)throw new Error('Unknown research run');
    if(canonical(run.owner)!==canonical(owner))throw new Error('Different native owning Pi root/host/identity; no source attachment');
    if(run.componentId!==componentId)throw new Error('Source component identity mismatch');
    if(!['cancelled','completed','failed'].includes(run.state))return this.authorize(runId,owner,generation);
    const {identity,...body}=run.spec;
    if(identity!==digest(body)||!run.material||run.active||run.activeSince!==null||run.pendingDecisionId||run.material.pending||this.evaluations(runId).some(e=>e.state!=='completed'))throw new Error('Terminal source reconciliation requires immutable quiescent material/evaluation boundaries');
    return run;
  }
  binding(run: ResearchRun, commandId: string): BoundCommand { return { runId: run.id, materialId: run.spec.source.materialId, epoch: run.epoch, revision: run.revision, commandId }; }
  check(run: ResearchRun, command: BoundCommand): void {
    if (command.runId !== run.id || command.materialId !== run.spec.source.materialId || command.epoch !== run.epoch || command.revision !== run.revision) throw new Error("Stale run/material/epoch/revision binding");
  }
  /** Fresh-v2 project index. Reads never create DB/files or generate exports. */
  lessons(query:{runId:string;query:string;limit:number}) {
    if(typeof query.query!=='string'||query.query.length>512||!Number.isInteger(query.limit)||query.limit<1||query.limit>8)throw new Error('Bounded lesson query required');
    return this.#read(db=>{
      const target=this.#run(db,query.runId);if(!target)return [];
      const terms=[...new Set(query.query.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])].slice(0,16);
      const matches=terms.length?' AND ('+terms.map(()=>"instr(lower(l.value),?)>0").join(' OR ')+')':'';
      const rows=db.prepare("SELECT l.value FROM lessons l JOIN runs r ON r.id=l.run_id WHERE json_extract(r.value,'$.spec.source.root')=? AND json_extract(l.value,'$.provenance.runId')=l.run_id"+matches+' ORDER BY l.rowid DESC LIMIT 128').all(target.spec.source.root,...terms).map(r=>JSON.parse(String(r.value)));
      const eligible=rows.filter(l=>{try{this.#checkLesson(db,target,lessonReference(l));return true;}catch{return false;}});
      return selectLessons(eligible,query.query,query.limit);
    },[]);
  }
  #checkLesson(db:DatabaseSync,run:ResearchRun,ref:LessonReference):void {
    const source=this.#run(db,ref.runId),lesson=this.#row<any>(db,'lessons',ref.runId,ref.lessonId);
    if(!source||source.spec.source.root!==run.spec.source.root||!lesson?.provenance||canonical(ref)!==canonical(lessonReference(lesson))||!this.#evidence(db,source,lesson.evidenceIds)||lesson.evidenceIds.some((id:string)=>{const e=this.#row<EvaluationRecord>(db,'evaluations',source.id,id);return e&&splitOf(e)!=='development';}))throw new Error('Stale or forged project lesson reference');
    validate(lessonProvenanceSchema,lesson.provenance);
    if(lesson.provenance.runId!==source.id||lesson.provenance.specId!==source.spec.identity||lesson.provenance.epoch!==source.epoch||lesson.provenance.materialId!==source.spec.source.materialId||canonical(lesson.provenance.sourceIds)!==canonical([...new Set(lesson.provenance.sourceRefs.map((r:any)=>r.sourceId))]))throw new Error('Stale lesson source provenance');
    for(const ref of lesson.provenance.sourceRefs)this.#checkSource(db,source,ref);
  }
  recordProposal(proposal:Proposal,generation:string,native:{actorId:string;nativeId:string;requestId:string;context:Record<string,any>}):void {
    const p=structuredClone(proposal),n=structuredClone(native);
    this.#transaction(db=>{
      const run=this.#run(db,p.runId);if(!run||run.generation!==generation)throw new Error('Stale trajectory generation');
      validate(ACTOR_PROPOSAL_SCHEMA,p);
      if(!n.actorId||!n.nativeId||!/^[a-f0-9]{64}$/.test(n.requestId))throw new Error('Native proposal attribution required');
      const command={runId:p.runId,materialId:p.materialId,epoch:p.epoch,revision:p.revision,commandId:p.commandId};
      const hash=digest({command,action:p.kind,payload:p.payload}),trajectory=proposalTrajectory(p,run,n);
      const old=this.#row<any>(db,'operations',run.id,p.commandId);
      if(old){if(old.hash!==hash||canonical({...old.trajectory,outcome:null})!==canonical(trajectory))throw new Error('Conflicting actual proposal trajectory');return;}
      this.check(run,p);this.#actorEvidence(db,run,p);this.#put(db,'operations',run.id,p.commandId,{hash,trajectory});
    });
  }
  finishProposal(runId:string,commandId:string,generation:string,receipt:Receipt|null,error:string|null):void {
    this.#transaction(db=>{
      const run=this.#run(db,runId),old=this.#row<any>(db,'operations',runId,commandId);
      if(!run||run.generation!==generation||!old?.trajectory)throw new Error('Missing exact proposal trajectory');
      if(old.trajectory.outcome){if(canonical(old.trajectory.outcome.receipt)!==canonical(receipt)||old.trajectory.outcome.error!==(error?.slice(0,4096)??null))throw new Error('Immutable proposal outcome');return;}
      if(canonical(receipt)!==canonical(old.receipt??null)||(receipt&&(receipt.commandId!==commandId||receipt.runId!==runId)))throw new Error('Trajectory outcome requires actual operation receipt');
      if(receipt&&(!old.trajectoryState||old.trajectoryState.revision!==receipt.revision))throw new Error('Missing atomic trajectory transition; cannot infer delayed outcome');
      const payload=old.trajectory.proposal.payload;
      const linked=this.#rows<EvaluationRecord>(db,'evaluations',runId).filter(e=>splitOf(e)==='development'&&(e.id===payload.evaluationId||(payload.evidenceIds??[]).includes(e.id)));
      const attempts=this.#rows<Attempt>(db,'attempts',runId).filter(a=>a.id===payload.attemptId||payload.candidates?.some((c:any)=>c.attemptId===a.id)||linked.some(e=>e.attemptId===a.id)||(payload.evidenceIds??[]).includes(a.evidenceId));
      const outcome={receipt:structuredClone(receipt),error:error?.slice(0,4096)??null,revision:receipt?.revision??old.trajectory.proposal.revision,incumbent:receipt?old.trajectoryState.incumbent:old.trajectory.context.incumbent,attemptIds:attempts.map(a=>a.id),evaluationIds:linked.map(e=>e.id),materialIds:[...new Set(linked.flatMap(e=>[e.snapshots.baseline.oid,e.snapshots.candidate.oid]))],insightIds:payload.lessonId&&this.#row(db,'lessons',runId,payload.lessonId)?[payload.lessonId]:[]};
      old.trajectory.outcome=outcome;this.#put(db,'operations',runId,commandId,old);
    });
  }
  trajectories(runId:string):ProposalTrajectory[] {return this.#read(db=>this.#rows<any>(db,'operations',runId).filter(o=>o.trajectory).map(o=>o.trajectory),[]);}
  #groundingChange(command:BoundCommand,generation:string,change:(db:DatabaseSync,run:ResearchRun)=>void):void {
    this.#transaction(db=>{const run=this.#run(db,command.runId);if(!run||run.generation!==generation)throw new Error('Stale grounding generation');this.check(run,command);if(!['ready','running'].includes(run.state)||run.active||run.pendingDecisionId||run.material?.pending)throw new Error('Grounding requires quiescent active owner');change(db,run);validate(groundingStateSchema(),run.grounding);run.revision++;this.#save(db,run);});
  }
  reserveGrounding(command:BoundCommand,generation:string,catalogId:string|null):void {
    this.#groundingChange(command,generation,(_db,run)=>{if(run.grounding)throw new Error('Grounding batch already reserved; no duplicate search');run.grounding={batchId:'grounding-'+digest({runId:run.id,epoch:run.epoch,specId:run.spec.identity}).slice(0,32),status:'reserved',catalogId,accessIds:[],sourceIds:[],calls:0,error:null};if(run.activeSince===null)run.activeSince=Date.now();});
  }
  groundingCall(command:BoundCommand,generation:string):void {
    this.#groundingChange(command,generation,(_db,run)=>{const g=run.grounding;if(!g||!['reserved','accessed'].includes(g.status)||g.calls>=1+(run.spec.config.grounding?.maxSources??4))throw new Error('Grounding call budget/state exhausted');g.calls++;});
  }
  groundingFailure(command:BoundCommand,generation:string,status:'unavailable'|'blocked'|'interrupted',error:string):void {
    this.#groundingChange(command,generation,(_db,run)=>{if(!run.grounding||!['reserved','accessed'].includes(run.grounding.status))throw new Error('Grounding result is immutable');run.grounding.status=status;run.grounding.error=error.slice(0,4096);});
  }
  #sourceText(access:SourceAccess|SourceInspection):string {
    if(realpathSync(access.artifact.path)!==access.artifact.path)throw new Error('Source artifact path identity mismatch');const text=readFileSync(access.artifact.path,'utf8');if(Buffer.byteLength(text)>65536||digest(text)!==access.artifact.digest)throw new Error('Source artifact identity mismatch');return text;
  }
  recordSourceAccess(command:BoundCommand,generation:string,access:SourceAccess):void {
    validate(sourceAccessSchema(),access);
    this.#groundingChange(command,generation,(db,run)=>{const g=run.grounding;if(!g||!['reserved','accessed'].includes(g.status)||g.accessIds.length>=(run.spec.config.grounding?.maxSources??4)||g.accessIds.includes(access.id))throw new Error('Source access bound/state mismatch');if(access.runId!==run.id||access.materialId!==run.spec.source.materialId||access.epoch!==run.epoch||access.specId!==run.spec.identity||access.generation!==generation||access.revision!==run.revision||access.catalogId!==g.catalogId)throw new Error('Source access provenance mismatch');if(this.#sourceText(access).length!==access.characters)throw new Error('Source access length mismatch');this.#artifact(db,run.id,access.id,access);g.accessIds.push(access.id);g.status='accessed';});
  }
  completeGrounding(command:BoundCommand,generation:string,native:NonNullable<Binding['literatureResult']>):void {
    validate(literatureResultSchema(),native.value);
    this.#groundingChange(command,generation,(db,run)=>{const g=run.grounding;if(!g||!['accessed','blocked','interrupted'].includes(g.status)||native.value.batchId!==g.batchId||native.value.blocked||!native.value.sources.length||new Set(native.value.sources.map(s=>s.accessId)).size!==native.value.sources.length)throw new Error('Inspected source completion unavailable or conflicting');
      for(const source of native.value.sources){if(!source.passage.trim()||!source.claim.trim()||!source.limitations.trim())throw new Error('Meaningful source passage, claim and limitations required');const access=this.#row<SourceAccess>(db,'artifact_refs',run.id,source.accessId);if(!g.accessIds.includes(source.accessId)||!access||access.kind!=='source-access'||!this.#sourceText(access).includes(source.passage))throw new Error('Unvisited source or unsupported passage; snippets are not inspection evidence');
        const {search:_search,fetch:_fetch,characters:_characters,...provenance}=access;
        const body={...provenance,...source,id:'source-'+digest({batchId:g.batchId,accessId:access.id}).slice(0,32),kind:'source-inspection' as const,revision:run.revision+1,nativeId:native.nativeId,requestId:native.requestId,roleBundleId:native.roleBundleId,model:native.model,validation:'source-linked-hypothesis-not-grade' as const};const inspection={...body,digest:digest(body)};validate(sourceInspectionSchema(),inspection);this.#artifact(db,run.id,inspection.id,inspection);g.sourceIds.push(inspection.id);
      }g.status='complete';g.error=null;
    });
  }
  #checkSource(db:DatabaseSync,run:ResearchRun,ref:{sourceId:string;runId:string;revision:number;digest:string}):void {
    const source=this.#row<SourceInspection>(db,'artifact_refs',run.id,ref.sourceId);if(!source||source.kind!=='source-inspection'||run.grounding?.status!=='complete'||!run.grounding.sourceIds.includes(source.id)||ref.runId!==run.id||source.runId!==run.id||ref.revision!==source.revision||ref.digest!==source.digest||source.epoch!==run.epoch||source.specId!==run.spec.identity||source.materialId!==run.spec.source.materialId)throw new Error('Unknown, stale or forged inspected source reference');const {digest:hash,...body}=source;if(digest(body)!==hash||!this.#sourceText(source).includes(source.passage))throw new Error('Source inspection identity mismatch');
  }

  resumeIntent(command:BoundCommand,owner:NativeOwner,componentId:string,generation:string):Receipt {
    return this.#transaction(db=>{
      const run=this.#run(db,command.runId);if(!run||run.spec.config.execution!=='research'||!run.material||canonical(run.owner)!==canonical(owner)||run.componentId!==componentId)throw new Error('Research resume intent owner unavailable');
      const action='control',payload={action:'resume',instruction:null},hash=digest({command,action,payload});
      const old=this.#row<{hash:string;receipt:Receipt}>(db,'operations',run.id,command.commandId);
      if(old){if(old.hash!==hash)throw new Error('Conflicting duplicate command ID');return old.receipt;}
      this.check(run,command);if(['completed','cancelled','failed'].includes(run.state))throw new Error('Research resume requires nonterminal saved work');
      const {identity,...body}=run.spec;if(identity!==digest(body))throw new Error('Frozen resolved spec identity changed');
      run.revision++;if(run.material.pending)run.material.pending.revision=run.revision;
      const value={state:run.state,specId:run.spec.identity},receipt:Receipt={commandId:command.commandId,runId:run.id,revision:run.revision,action,status:'applied',reason:'Resume intent recorded. Execution has not started and still requires ordinary execute admission.',value};
      this.#put(db,'operations',run.id,command.commandId,{hash,receipt,resumeIntent:{owner,componentId,generation,materialId:command.materialId,epoch:command.epoch,specId:run.spec.identity,revision:run.revision,claimed:false}});
      this.#put(db,'controls',run.id,command.commandId,{...command,action:'resume',instruction:null,status:'applied',value});
      this.#put(db,'events',run.id,String(run.revision),{revision:run.revision,type:'resume-intent',commandId:command.commandId,status:'applied',reason:receipt.reason});this.#save(db,run);return receipt;
    });
  }
  claimResearch(command:BoundCommand,owner:NativeOwner,componentId:string,generation:string,resume:boolean):BoundCommand {
    return this.#transaction(db=>{
      const run=this.#run(db,command.runId);if(!run||run.spec.config.execution!=='research'||!run.material||canonical(run.owner)!==canonical(owner)||run.componentId!==componentId)throw new Error('Research admission owner unavailable');
      this.check(run,command);if(['completed','cancelled','failed'].includes(run.state))throw new Error('Research requires nonterminal saved work');
      if(resume){
        const operation=this.#row<any>(db,'operations',run.id,command.commandId),intent=operation?.resumeIntent;
        if(!intent||intent.claimed||intent.revision!==run.revision||operation.receipt?.revision!==run.revision||canonical(intent.owner)!==canonical(owner)||intent.componentId!==componentId||intent.generation!==generation||intent.materialId!==command.materialId||intent.epoch!==command.epoch||intent.specId!==run.spec.identity)throw new Error('Fresh agent-risk arbor.control resume intent required before execute admission');
        intent.claimed=true;this.#put(db,'operations',run.id,command.commandId,operation);
      }else if(run.generation!==generation||run.revision!==0||run.execution!=='not-started'||run.state!=='ready'||run.active||run.pendingDecisionId||run.material.pending)throw new Error('Fresh current-generation start required; use explicit resume intent, never replay');
      // Claim exactly once before background return or any awaited/native effect.
      // This is domain operation admission, not a Fabric permission token/queue.
      run.execution='research-admitted';run.revision++;if(run.material.pending)run.material.pending.revision=run.revision;
      this.#put(db,'events',run.id,String(run.revision),{revision:run.revision,type:'research-admission',commandId:command.commandId,status:'applied',reason:'Bounded research operation claimed; native work is not settled'});this.#save(db,run);return this.binding(run,command.commandId);
    });
  }
  receipt(command: BoundCommand, action: string, payload: unknown): Receipt | undefined {
    return this.#read(db => {
      const old = this.#row<{ hash: string; receipt: Receipt }>(db, "operations", command.runId, command.commandId);
      if (old && old.hash !== digest({ command, action, payload })) throw new Error("Conflicting duplicate command ID");
      return old?.receipt;
    }, undefined);
  }
  #commit(command: BoundCommand, generation: string, action: string, payload: unknown, change: (db: DatabaseSync, run: ResearchRun) => { status?: Receipt["status"]; reason?: string; value?: unknown }, retainPending = false): Receipt {
    return this.#transaction(db => {
      const run = this.#run(db, command.runId); if (!run || run.generation !== generation) throw new Error("Unknown or stale generation");
      const hash = digest({ command, action, payload });
      const old = this.#row<{ hash: string; receipt?: Receipt; trajectory?: ProposalTrajectory }>(db, "operations", run.id, command.commandId);
      if (old && old.hash !== hash) throw new Error("Conflicting duplicate command ID");
      if (old?.receipt) return old.receipt;
      this.check(run, command);
      if (run.material?.pending && !retainPending) throw new Error("Pending integration intent must reconcile before other mutations");
      const result = change(db, run); run.revision++;
      if(retainPending && run.material?.pending)run.material.pending.revision=run.revision;
      const receipt: Receipt = { commandId: command.commandId, runId: run.id, revision: run.revision, action, status: result.status ?? "applied", reason: result.reason ?? null, value: result.value ?? null };
      this.#operation(db, run, command.commandId, { ...old, hash, receipt });
      this.#put(db, "events", run.id, String(run.revision), { revision: run.revision, type: action, commandId: command.commandId, status: receipt.status, reason: receipt.reason });
      this.#save(db, run); return receipt;
    });
  }
  research(action: ResearchAction, command: BoundCommand, payload: Record<string, any>, generation: string): Receipt {
    validate(ACTION_SCHEMAS[action], { ...command, payload });
    return this.#commit(command, generation, action, payload, (db, run) => {
      const node = (id: string) => this.#row<Record<string, any>>(db, "nodes", run.id, id);
      const evidence = (ids: string[]) => this.#evidence(db, run, ids);
      const projection = () => ({run, nodes:this.#rows<any>(db,'nodes',run.id), attempts:this.#rows<Attempt>(db,'attempts',run.id), evaluations:this.#rows<EvaluationRecord>(db,'evaluations',run.id), decisions:this.#rows<any>(db,'decisions',run.id)});
      if (action === "propose") {
        if (run.pendingDecisionId) throw new Error("Pending research review blocks expansion");
        for(const ref of payload.lessonRefs??[])this.#checkLesson(db,run,ref);
        if(payload.type==='hypothesis'&&run.spec.config.grounding?.mode==='required'&&!(payload.groundingRefs?.length))throw new Error('Required grounded hypothesis needs an inspected source reference');
        for(const ref of payload.groundingRefs??[])this.#checkSource(db,run,ref);
        const depth=validateNode(projection(),payload as any);
        this.#put(db, "nodes", run.id, payload.nodeId, { ...payload, depth, pruned: false, reviewed: false, insightIds:[], insightRevision:0 }); return { value: { nodeId: payload.nodeId } };
      }
      if (action === "dispatch") {
        if(this.#rows<EvaluationRecord>(db,'evaluations',run.id).some(e=>splitOf(e)==='final'))throw new Error('Final selection is terminal');
        if (run.material && (!run.material.baselineEvaluation || this.#row<EvaluationRecord>(db, "evaluations", run.id, run.material.baselineEvaluation)?.validity !== "valid")) throw new Error("Invalid or missing captured baseline blocks candidate dispatch");
        const items=payload.candidates ?? [payload], reserved:Attempt[]=[];
        if(items.length>2)throw new Error('Wave exceeds bounded capacity');
        if(run.material && projection().attempts.some(a=>a.waveId===(payload.waveId??command.commandId)))throw new Error('Wave identity already reserved; no duplicate native effects');
        if(run.material && projection().attempts.some(a=>['reserved','running'].includes(a.state)))throw new Error('Prior wave must settle before another reservation');
        if(payload.candidates && !run.material)throw new Error('Candidate waves require owned material');
        for(const item of items){
          const p=projection(),selected=node(item.nodeId);
          if (!selected || selected.type !== "hypothesis" || ancestry(p.nodes,item.nodeId).some(n=>n.pruned) || p.nodes.some(n=>n.parentId===item.nodeId)) throw new Error("Dispatch requires an eligible hypothesis leaf");
          if (["direction", "collaborative"].includes(run.spec.config.search.mode)) {
            const directions=ancestry(p.nodes,item.nodeId).filter(n=>n.type==='direction');
            if(!directions.length||directions.some(n=>!n.reviewed))throw new Error("Dispatch requires an approved direction; root hypotheses cannot bypass owning-Pi review");
          }
          if (!["ready", "running"].includes(run.state)) throw new Error("Run is not dispatchable");
          if (p.attempts.some(a => a.id === item.attemptId || a.nodeId === item.nodeId)) throw new Error("Attempt/hypothesis already reserved; no duplicate execution");
          const usedMs = run.activeMs + (run.activeSince === null ? 0 : Date.now() - run.activeSince);
          if (run.attemptsUsed >= run.spec.config.limits.attempts || (reserved.length < run.spec.config.search.concurrency && run.active >= run.spec.config.search.concurrency) || usedMs >= run.spec.config.limits.activeMs) throw new Error("Attempt/capacity/active-time budget exhausted");
          const selection=run.spec.config.execution==='research'?validateSelection(p,item.nodeId,item.selection):undefined;
          const evaluationReservation=run.material?evaluationCapacity(p):0;
          const used=p.evaluations.reduce((n,e)=>n+evaluationCalls(e),0)+reservedEvaluationCalls(p.attempts,p.evaluations);
          if(used+evaluationReservation>run.spec.config.limits.evaluatorCalls)throw new Error('Evaluator invocation capacity exhausted at wave reservation');
          if(run.material && researchFacts(p).noGain>=run.spec.config.search.stopAfterNoGain)throw new Error('Search convergence stops selection');
          const attempt: Attempt = { id: item.attemptId, nodeId: item.nodeId, task: selected.rationale, state: "reserved", nativeId: null, nativeDigest: null, evidenceId: null, model: run.spec.roles.executor.model, materialId: run.spec.source.materialId, epoch: run.epoch, generation,
            ...(selection?{selection}:{}),...(run.material?{slotReserved:reserved.length<run.spec.config.search.concurrency,evaluationReservation,parentIncumbent:run.material.incumbent,waveId:payload.waveId??command.commandId}:{}) };
          run.attemptsUsed++; if(attempt.slotReserved!==false)run.active++; run.activeSince ??= Date.now(); run.state = "running";
          this.#put(db, "attempts", run.id, attempt.id, attempt);reserved.push(attempt);
        }
        return {value:payload.candidates?{waveId:payload.waveId,attemptIds:reserved.map(a=>a.id)}:reserved[0]};
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
        const nodes=this.#rows<any>(db,'nodes',run.id);
        for(const evidenceId of payload.evidenceIds){
          const e=this.#row<EvaluationRecord>(db,'evaluations',run.id,evidenceId),ref=this.#row<any>(db,'artifact_refs',run.id,evidenceId);
          const a=this.#row<Attempt>(db,'attempts',run.id,e?.attemptId??ref?.attemptId??'');
          if(!a||!ancestry(nodes,a.nodeId).some(n=>n.nodeId===payload.nodeId))throw new Error('Insight evidence must belong to this node or a descendant');
        }
        // Append evidence-linked interpretations to the current ancestor revisions;
        // never replace a stale actor-supplied aggregate and lose sibling insights.
        const ancestors=ancestry(nodes,payload.nodeId).map(ancestor=>node(ancestor.nodeId)!);
        if(ancestors.some(current=>(current.insightIds?.length??0)>=100))throw new Error('Ancestor insight capacity exhausted; no lesson or revision written');
        // Direction/project recall must retain the exact evidence-bearing leaf's
        // grounding, not only the aggregation target's own ancestors. Unrelated
        // sibling sources are not supporting provenance.
        const sourceNodes=[...ancestors,...payload.evidenceIds.flatMap((evidenceId:string)=>{const e=this.#row<EvaluationRecord>(db,'evaluations',run.id,evidenceId),ref=this.#row<any>(db,'artifact_refs',run.id,evidenceId),attempt=this.#row<Attempt>(db,'attempts',run.id,e?.attemptId??ref?.attemptId??'');return attempt?ancestry(nodes,attempt.nodeId).map(n=>node(n.nodeId)!):[];})];
        const sourceRefs=[...new Map(sourceNodes.flatMap(n=>n.groundingRefs??[]).map(ref=>[canonical(ref),ref])).values()] as Array<{runId:string;sourceId:string;revision:number;digest:string}>;
        for(const ref of sourceRefs)this.#checkSource(db,run,ref);
        const linked=payload.evidenceIds.map((id:string)=>this.#row<EvaluationRecord>(db,'evaluations',run.id,id)).filter(Boolean) as EvaluationRecord[];
        const decisions=this.#rows<any>(db,'decisions',run.id).filter(d=>d.evidenceIds.some((id:string)=>payload.evidenceIds.includes(id))&&!d.evidenceIds.some((id:string)=>{const e=this.#row<EvaluationRecord>(db,'evaluations',run.id,id);return e&&splitOf(e)!=='development';}));
        const provenance={runId:run.id,revision:run.revision+1,materialId:run.spec.source.materialId,epoch:run.epoch,specId:run.spec.identity,sourceIds:[...new Set(sourceRefs.map(ref=>ref.sourceId))],sourceRefs,uninspectedSourceRefs:[...new Set(sourceNodes.flatMap(n=>n.sourceRefs))] as string[],materials:[...new Set(linked.flatMap(e=>[e.snapshots.baseline.oid,e.snapshots.candidate.oid]))],applicability:payload.applicability??`${run.spec.config.material.kind}: ${run.spec.config.objective.description}`,outcome:decisions.some(d=>d.status==='measured-keep')?'measured-keep':linked.some(e=>e.validity!=='valid')?'invalid-evaluation':decisions.some(d=>d.decision==='discard')?'discarded':'unscored-observation'};
        validate(lessonProvenanceSchema,provenance);
        for(const current of ancestors){
          current.insightIds=[...(current.insightIds??[]),payload.lessonId];current.insightRevision=run.revision+1;
          this.#put(db,'nodes',run.id,current.nodeId,current);
        }

        this.#put(db, "lessons", run.id, payload.lessonId, { ...payload, provenance, validation: "unscored-observation" }); return { value: { lessonId: payload.lessonId } };
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
    if (proposal.estimatedBudget.attempts !== (proposal.kind === "dispatch" ? proposal.payload.candidates?.length ?? 1 : 0) || proposal.estimatedBudget.evaluatorCalls !== (proposal.kind === 'evaluate' ? run.spec.config.execution==='research' ? evaluationCapacity(this.projection(runId)!) : 1 : 0)) throw new Error("Proposal budget estimate does not match action");
    this.#read(db=>this.#actorEvidence(db,run,proposal),undefined);
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
      if (!attempt || result.cwd !== (current.material?.candidates.find(c => c.id === attemptId)?.directory ?? current.spec.source.root) || (attempt.nativeId && attempt.nativeId !== result.id)) throw new Error("Native attempt identity mismatch");
      if (!terminal && (attempt.nativeDigest || TERMINAL.includes(attempt.state as Terminal))) throw new Error("Late attach cannot regress a terminal attempt");
      if (attempt.materialId !== current.spec.source.materialId || attempt.epoch !== current.epoch || (attempt.generation !== generation && !current.generationHistory?.includes(attempt.generation))) throw new Error("Native attempt provenance mismatch");
      attempt.nativeId = result.id;
      if (terminal) {
        attempt.state = result.status!; attempt.nativeDigest = nativeDigest; attempt.evidenceId = `evidence-${digest(attemptId).slice(0, 32)}`;
        this.#artifact(db, runId, attempt.evidenceId, { id: attempt.evidenceId, kind: "native-evidence", attemptId, generation: attempt.generation, nativeId: result.id, materialId: attempt.materialId, epoch: attempt.epoch, status: result.status, digest: nativeDigest, summary: (result.summary ?? "").slice(0, 1024), validation: "unscored-native-observation" });
        if(attempt.slotReserved!==false)current.active--; if(attempt.slotReserved!==undefined)attempt.slotReserved=false; if (current.active < 0) throw new Error("Capacity underflow");
      } else { attempt.state = "running"; }
      this.#put(db, "attempts", runId, attemptId, attempt); return { value: attempt };
    });
  }
  control(command: BoundCommand, generation: string, action: string, instruction?: string): Receipt {
    return this.#commit(command, generation, "control", { action, instruction: instruction ?? null }, (db, run) => {
      if (run.material && ["cancelled", "completed", "failed"].includes(run.state) && ["pause", "resume"].includes(action)) throw new Error("Terminal material run cannot pause/resume; start a new run");
      if (run.material && ["cleanup_pending", "interrupted"].includes(run.state) && action === "pause") throw new Error("Unresolved material cleanup requires explicit reconciliation, not pause");
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
  sourceReceipt(command:BoundCommand,generation:string,action:'apply'|'undoApply',decisionId:string,path:string,contentDigest:string,error:string|null,owner:NativeOwner,componentId:string):Receipt {
    const authorized=this.authorizeSource(command.runId,owner,componentId,generation);
    // Current service retirement/UI checks precede this synchronous CAS. Do not renew
    // the research generation or loosen any control/evaluator/dispatch generation guard.
    return this.#commit(command,authorized.generation,action,{decisionId},(db,run)=>{
      this.#artifact(db,run.id,`source-${digest(command.commandId)}`,{id:`source-${digest(command.commandId)}`,commandId:command.commandId,path,digest:contentDigest,kind:'source-operation'});
      return {status:error?'blocked':'applied',...(error?{reason:error}:{}),value:{path,digest:contentDigest}};
    });
  }
  exportReference(command:BoundCommand,path:string,contentDigest:string,format:string){return {id:`export-${digest(command.commandId)}`,commandId:command.commandId,path,digest:contentDigest,kind:format==='json'?'unscored-json-export':'research-markdown-export'};}
  exported(command: BoundCommand, generation: string, path: string, contentDigest: string, format = "json"): Receipt {
    return this.#commit(command, generation, "export", { format }, (db, run) => {
      const ref=this.exportReference(command,path,contentDigest,format);
      this.#artifact(db, run.id, ref.id, ref);
      return { value: { path, digest: contentDigest } };
    });
  }
  backgroundRefusal(admitted:ResearchRun,command:BoundCommand,generation:string,error:string):void {
    this.#transaction(db=>{
      const current=this.#run(db,admitted.id);
      if(!current||canonical(current.owner)!==canonical(admitted.owner)||current.componentId!==admitted.componentId||current.spec.identity!==admitted.spec.identity)throw new Error('Background refusal ownership changed');
      // One bounded diagnostic slot, not a command receipt or a domain transition.
      // Attribute the failing generation even before resume could rebind it. Never
      // borrow the current generation to overwrite terminal/domain state.
      db.prepare("DELETE FROM events WHERE run_id=? AND id='background-refusal'").run(admitted.id);
      this.#put(db,'events',admitted.id,'background-refusal',{revision:current.revision,type:'background-refusal',commandId:command.commandId,status:'blocked',reason:`Generation ${generation}, admitted revision ${command.revision}: ${error}`.slice(0,4096)});
    });
  }
  settle(runId: string, generation: string, state: ResearchRun["state"], execution: string, error: string | null, settlementId = `settle-${generation}`): void {
    const run = this.get(runId)!;
    this.#commit(this.binding(run, settlementId), generation, "settlement", { state, execution, error }, (db, current) => {
      // Finalize only the unchanged choice at successful native quiescence. An
      // intervening control/result/dialog remains stale; never rebase it here.
      if (current.state === "awaiting_review" && current.pendingDecisionId && (state === "completed" || (state === "paused" && current.spec.config.execution === "research")) && error === null && current.active === 0) {
        const decision = this.#row<Record<string, any>>(db, "decisions", runId, current.pendingDecisionId);
        if (decision?.status === "pending" && decision.revision === current.revision && decision.materialId === current.spec.source.materialId && decision.epoch === current.epoch) {
          decision.revision = current.revision + 1;
          this.#put(db, "decisions", runId, current.pendingDecisionId, decision);
        }
      }
      if (!["paused", "awaiting_review"].includes(current.state) || ["cancelled", "cleanup_pending", "interrupted", "failed"].includes(state)) current.state = state;
      if (current.activeSince !== null && !(current.spec.config.execution === "research" && execution === "native-evaluation-completed; incumbent-not-decided" && !["paused", "awaiting_review"].includes(current.state))) { current.activeMs += Date.now() - current.activeSince; current.activeSince = null; }
      current.execution = execution; current.error = error; return {};
    }, ["interrupted", "cleanup_pending"].includes(state)); // lifecycle fact, never permission to decide/control through an intent
  }
  reviseRoles(command: BoundCommand, generation: string, revision: NonNullable<ResearchRun["roleRevisions"]>[number]): Receipt {
    return this.#commit(command, generation, "reviseRoles", {}, (_db, run) => {
      if (run.state !== "paused" || run.active || run.pendingDecisionId || run.material?.pending || (run.roleRevisions?.length ?? 0) >= 16) throw new Error("Role revision requires quiescent paused owner with no pending review/integration");
      run.roleRevisions = [...(run.roleRevisions ?? []), { ...revision, revision: run.revision + 1, commandId: command.commandId }]; return {};
    });
  }
  reserveContinuation(command:BoundCommand,generation:string,payload:Record<string,any>):Receipt {
    return this.#commit(command,generation,'resumeAttempt',payload,(db,run)=>{
      const m=run.material,prior=this.#row<Attempt>(db,'attempts',run.id,payload.attemptId),attempts=this.#rows<Attempt>(db,'attempts',run.id);
      if(!m||!prior||!['failed','stopped','timed_out'].includes(prior.state)||run.active||run.pendingDecisionId||!['paused','ready'].includes(run.state))throw new Error('Continuation requires quiescent settled partial attempt, not ambiguous/live work');
      if(attempts.some(a=>a.id===payload.newAttemptId||a.continuation?.previousAttemptId===prior.id))throw new Error('Continuation identity already reserved; no duplicate execution');
      const nodes=this.#rows<any>(db,'nodes',run.id),path=ancestry(nodes,prior.nodeId);
      if(path.some(n=>n.pruned)||nodes.some(n=>n.parentId===prior.nodeId)||(['direction','collaborative'].includes(run.spec.config.search.mode)&&path.some(n=>n.type==='direction'&&!n.reviewed)))throw new Error('Continuation hypothesis is no longer eligible/reviewed');
      const partial=m.candidates.find(c=>c.id===prior.id);
      const sourceOid=payload.mode==='continue-partial'?partial?.oid:partial?.parent??prior.parentIncumbent;
      if(!sourceOid||(payload.mode==='continue-partial'&&!prior.nativeDigest))throw new Error('Exact settled partial artifact required; restart-parent is a distinct action');
      const p={run,attempts,evaluations:this.#rows<EvaluationRecord>(db,'evaluations',run.id)},credits=evaluationCapacity(p);
      if(run.attemptsUsed>=run.spec.config.limits.attempts||run.activeMs+(run.activeSince===null?0:Date.now()-run.activeSince)>=run.spec.config.limits.activeMs||p.evaluations.reduce((n,e)=>n+evaluationCalls(e),0)+reservedEvaluationCalls(attempts,p.evaluations)+credits>run.spec.config.limits.evaluatorCalls)throw new Error('Continuation invocation budget exhausted');
      const attempt:Attempt={id:payload.newAttemptId,nodeId:prior.nodeId,task:prior.task,state:'reserved',nativeId:null,nativeDigest:null,evidenceId:null,model:run.spec.roles.executor.model,materialId:prior.materialId,epoch:prior.epoch,generation,slotReserved:true,parentIncumbent:m.incumbent,evaluationReservation:credits,waveId:command.commandId,continuation:{mode:payload.mode,previousAttemptId:prior.id,rootAttemptId:prior.continuation?.rootAttemptId??prior.id,sourceOid,summary:payload.summary}};
      run.attemptsUsed++;run.active++;run.state='running';run.activeSince??=Date.now();this.#put(db,'attempts',run.id,attempt.id,attempt);return {value:attempt};
    });
  }
  recordWave(runId:string,generation:string,wave:WaveEvidence):void {
    this.#commit(this.binding(this.get(runId)!,`wave-${digest(wave.waveId).slice(0,32)}`),generation,'wave-settled',wave,(_db,run)=>{run.waves=[...(run.waves??[]),wave];return {};});
  }
  claimWaveSlot(runId:string,attemptId:string,generation:string):void {
    this.#commit(this.binding(this.get(runId)!,`slot-${digest(attemptId).slice(0,32)}`),generation,'wave-slot',{attemptId},(db,run)=>{
      const a=this.#row<Attempt>(db,'attempts',runId,attemptId);
      if(!a||a.state!=='reserved'||a.nativeId||a.slotReserved!==false||!['ready','running'].includes(run.state)||run.active>=run.spec.config.search.concurrency)throw new Error('Reserved wave slot not admissible');
      a.slotReserved=true;run.active++;this.#put(db,'attempts',runId,attemptId,a);return {};
    });
  }
  refuseUnlaunched(runId:string,attemptId:string,generation:string):void {
    this.#commit(this.binding(this.get(runId)!,`unlaunched-${digest(attemptId).slice(0,32)}`),generation,'dispatch-refused',{attemptId},(db,run)=>{
      const a=this.#row<Attempt>(db,'attempts',runId,attemptId);if(!a||a.state!=='reserved'||a.nativeId)throw new Error('Only proven unlaunched reservation can release capacity');
      a.state='stopped';if(a.slotReserved!==false)run.active--;if(a.slotReserved!==undefined)a.slotReserved=false;this.#put(db,'attempts',runId,attemptId,a);return {};
    });
  }
  /** Finalize a failed admitted command without ever replaying its effects. */
  failMaterialDispatch(command: BoundCommand, payload: unknown, generation: string, errors: string[], action: 'dispatch'|'resumeAttempt' = 'dispatch'): Receipt {
    const reason=errors.join('; ');
    return this.#commit(this.binding(this.get(command.runId)!,`dispatch-failure-${digest(command.commandId).slice(0,32)}`),generation,'material-dispatch-failed',{commandId:command.commandId,errors},(db,run)=>{
      const saved=this.#row<{hash:string;receipt:Receipt}>(db,'operations',run.id,command.commandId);
      if(!saved||saved.hash!==digest({command,action,payload}))throw new Error('Exact admitted dispatch receipt required');
      saved.receipt={...saved.receipt,revision:run.revision+1,status:'blocked',reason};
      this.#operation(db,run,command.commandId,saved);run.error=reason;
      return {status:'blocked',reason,value:{commandId:command.commandId,errors}};
    });
  }
  materialCandidate(command: BoundCommand, generation: string, candidate: Candidate): void {
    this.#commit(command, generation, "material-candidate", candidate, (db, run) => {
      const m = run.material; if (!m) throw new Error("Owned material unavailable");
      const a = this.#row<Attempt>(db, "attempts", run.id, candidate.id); if (!a) throw new Error("Unreserved candidate");
      const previous = m.candidates.find(c => c.id === candidate.id);
      if (previous && (previous.directory !== candidate.directory || previous.parent !== candidate.parent)) throw new Error("Candidate immutable parent/directory changed");
      if (candidate.oid && (!a.nativeDigest || !TERMINAL.includes(a.state as Terminal))) throw new Error("Freeze requires settled owner-held native writer");
      m.candidates = [...m.candidates.filter(c => c.id !== candidate.id), structuredClone(candidate)]; return {};
    });
  }
  materialBaseline(runId: string, generation: string, evaluationId: string): void {
    const run = this.get(runId)!;
    this.#commit(this.binding(run, `baseline-${evaluationId}`), generation, "material-baseline", { evaluationId }, (db, current) => {
      const e = this.#row<EvaluationRecord>(db, "evaluations", runId, evaluationId), m = current.material!;
      if (!e || e.state !== "completed" || e.validity !== "valid" || !e.quality.passed || e.snapshots.baseline.oid !== m.capture.baseline || e.snapshots.candidate.oid !== m.capture.baseline || e.specId !== current.spec.identity || e.epoch !== current.epoch) throw new Error("Invalid exact captured baseline");
      m.baselineEvaluation ??= evaluationId; return {};
    });
  }
  prepareIntegration(command: BoundCommand, generation: string, payload: Record<string, any>): Receipt {
    return this.#commit(command, generation, "decide", payload, (db, run) => {
      const m = run.material!;
      const linked = payload.evidenceIds.length === 1 ? this.#row<EvaluationRecord>(db,"evaluations",run.id,payload.evidenceIds[0]) : undefined;
      const attempt = this.#rows<Attempt>(db, "attempts", run.id).find(a => a.nodeId === payload.nodeId && (!linked?.attemptId || a.id === linked.attemptId));
      const candidate = m?.candidates.find(c => c.id === attempt?.id);
      const e = payload.evidenceIds.length === 1 ? this.#row<EvaluationRecord>(db, "evaluations", run.id, payload.evidenceIds[0]) : undefined;
      if (!m || !attempt || attempt.state !== "completed" || !attempt.nativeDigest || !candidate?.oid || !e || run.active || !m.baselineEvaluation || ["cancelled", "cleanup_pending", "interrupted", "failed"].includes(run.state)) return { status: "blocked", reason: "Settled candidate and exact evaluation required" };
      const selected = this.#row<Record<string, any>>(db, "nodes", run.id, payload.nodeId);
      if (!selected || selected.pruned) return { status: "blocked", reason: "Discarded/pruned candidate cannot win" };
      if(e.attemptId!==attempt.id)return {status:'blocked',reason:'Evaluation must belong to this exact attempt; unlinked historical evidence cannot authorize keep'};
      const reason = promotionGate(run, e, candidate.oid, this.#rows<EvaluationRecord>(db, "evaluations", run.id)); if (reason !== "eligible") return { status: "blocked", reason };
      if (run.pendingDecisionId) return { status: "blocked", reason: "Pending review is not approval" };
      if (run.spec.config.search.mode === "review") {
        const review = this.#rows<Record<string, any>>(db, "decisions", run.id).filter(d => d.nodeId === payload.nodeId).at(-1);
        if (!selected.reviewed || review?.status !== "approved-choice-only" || review.userReceipt?.response !== "Approve research choice" || canonical(review.userReceipt.owner) !== canonical(run.owner) || canonical(review.evidenceIds) !== canonical([e.id]) || review.epoch !== run.epoch) return { status: "blocked", reason: "Exact evaluated candidate requires actual owning-Pi review receipt" };
      }
      if (this.#row(db, "decisions", run.id, payload.decisionId)) throw new Error("Decision ID already exists");
      m.pending = { commandId: command.commandId, decisionId: payload.decisionId, evaluationId: e.id, expected: m.incumbent, target: candidate.oid, revision: run.revision + 1 };
      this.#put(db, "decisions", run.id, payload.decisionId, { ...payload, status: "integration-pending", materialId: command.materialId, epoch: command.epoch, revision: run.revision + 1 });
      return { status: "queued", value: { decisionId: payload.decisionId } };
    });
  }
  completeIntegration(runId: string, generation: string, observed: string): Receipt {
    return this.#transaction(db => {
      const run = this.#run(db, runId); if (!run || run.generation !== generation || !run.material?.pending) throw new Error("No owned integration intent");
      const m = run.material, intent = m.pending!;
      const e = this.#row<EvaluationRecord>(db, "evaluations", runId, intent.evaluationId)!;
      if (run.revision !== intent.revision || m.incumbent !== intent.expected || observed !== intent.target || promotionGate(run, e, intent.target, this.#rows<EvaluationRecord>(db, "evaluations", run.id)) !== "eligible") throw new Error("Integration intent changed; explicit reconciliation required");
      const saved = this.#row<{ hash: string; receipt: Receipt }>(db, "operations", runId, intent.commandId)!;
      m.incumbent = intent.target; m.pending = null; run.revision++; run.state = "ready";
      saved.receipt = { ...saved.receipt, revision: run.revision, status: "applied" };
      const decision = this.#row<Record<string, any>>(db, "decisions", runId, intent.decisionId)!; decision.status = "measured-keep";
      this.#put(db, "decisions", runId, intent.decisionId, decision); this.#operation(db, run, intent.commandId, saved);
      this.#put(db, "events", runId, String(run.revision), { revision: run.revision, type: "incumbent-kept", commandId: intent.commandId, status: "applied", reason: null });
      this.#save(db, run); return saved.receipt;
    });
  }
  close(): void { if (this.#closed) return; this.#db?.close(); this.#db = undefined; this.#closed = true; }
}
