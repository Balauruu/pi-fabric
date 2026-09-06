import { join } from "node:path";
import { execFile } from "node:child_process";
import { mkdir, realpath, writeFile, rename } from "node:fs/promises";
import { promisify } from "node:util";
import type { OwnerExecution } from "../managed/OwnerExecution.js";
import type { NativeOwner } from "../managed/contracts.js";
import type { ResearchStore } from "../research/ResearchStore.js";
import { canonical, digest, type BoundCommand } from "../research/contracts.js";
import { invocationId, nativeSuccess, type EvaluationRecord, type Invocation, type MaterialRef } from "./contracts.js";
import { freezeMaterial, subjectBootstrap, verifyMaterial } from "./material.js";
import { analyze, commandRun, parseMetric, units } from "./measurement.js";
import type { EvaluatorCatalog } from "./catalog.js";
import { requireNativeAdmission, NativeAdmissionError } from "../research/policy.js";
import { Workspace } from "../material/Workspace.js";
const exec = promisify(execFile);
/** Finite admitted evaluation, not a research loop or alternative child runtime. */
export class EvaluationEngine {
  #active = new Map<string, { id: string; purpose: string; promise: Promise<EvaluationRecord>; abort: AbortController }>();
  #draining = false;
  constructor(readonly owner: OwnerExecution, readonly store: ResearchStore, readonly stateDirectory: string, readonly catalog: EvaluatorCatalog) {}
  async evaluate(runId: string, id: string, signal?: AbortSignal, purpose: "candidate" | "feedback" | "recheck" = "candidate", pair?: { baseline: MaterialRef; candidate: MaterialRef }, attemptId: string | null = null): Promise<EvaluationRecord> {
    if (this.#draining) throw new Error("Evaluator generation draining");
    const active = this.#active.get(runId); if (active) { if (active.id !== id || active.purpose !== purpose) throw new Error("Run evaluator capacity occupied"); return active.promise; }
    if (this.#active.size >= 128) throw new Error("Evaluator active-run capacity exhausted");
    const frozen = this.store.get(runId)!; const { identity, ...body } = frozen.spec;
    if (identity !== digest(body)) throw new Error("Frozen resolved spec identity changed");
    const existing = this.store.evaluation(runId, id);
    if (existing && (existing.attemptId ?? null) !== attemptId) throw new Error("Evaluation ID bound to different exact attempt");
    if (pair && existing && (canonical(pair.baseline) !== canonical(existing.definition.baseline) || canonical(pair.candidate) !== canonical(existing.definition.candidate))) throw new Error("Evaluation ID bound to different exact material pair");
    if (existing && existing.purpose !== purpose) throw new Error("Conflicting evaluation invocation purpose for stable ID");
    if (existing?.state === "completed") return existing;
    if (existing && existing.state !== "running") throw new Error("Evaluation requires explicit immutable-bound resume");
    this.store.beginEvaluation(runId, this.owner.generation);
    const abort = new AbortController(), onAbort = () => abort.abort();
    signal?.addEventListener("abort", onAbort, { once: true }); if (signal?.aborted) abort.abort();
    const promise = this.#execute(runId, id, abort.signal, purpose, existing, pair, attemptId);
    this.#active.set(runId, { id, purpose, promise, abort });
    try { return await promise; } finally { signal?.removeEventListener("abort", onAbort); this.#active.delete(runId); }
  }
  async #execute(runId: string, id: string, signal: AbortSignal, purpose: "candidate" | "feedback" | "recheck", saved?: EvaluationRecord, pair?: { baseline: MaterialRef; candidate: MaterialRef }, attemptId: string | null = null): Promise<EvaluationRecord> {
    const run = this.store.get(runId)!;
    const definition = saved?.definition ?? (run.spec.evaluation ? { ...structuredClone(run.spec.evaluation), ...structuredClone(pair ?? {}) } : null);
    if (!definition) throw new Error("Frozen evaluator definition unavailable; no caller score accepted");
    let e = saved;
    try {
      if (!e) {
        signal.throwIfAborted();
        const output = join(this.stateDirectory, "runs", runId, "material", ...(run.material ? [id] : []));
        const baseline = await freezeMaterial(definition.baseline, output), candidate = await freezeMaterial(definition.candidate, output);
        e = { id, runId, attemptId, purpose, epoch: run.epoch, specId: run.spec.identity, generation: this.owner.generation, ownerBinding: digest(run.owner), definition, definitionId: digest(definition), snapshots: { baseline, candidate }, catalogId: this.catalog.id,
          providerBinding: definition.providerAction ? this.catalog.binding(definition.providerAction) : null, bindings: [{ generation: this.owner.generation, componentId: this.owner.componentId, catalogId: this.catalog.id, providerBinding: definition.providerAction ? this.catalog.binding(definition.providerAction) : null }], state: "running", invocations: [], analysis: null, quality: { required: run.spec.config.objective.qualityVetoes, passed: false, limitedValidation: definition.kind === "command" && definition.command!.checks.length === 0 }, validity: "pending", incumbentDecision: run.material ? "separate-owned-decision" : "not-evaluated-PR5", error: null };
        this.store.saveEvaluation(e);
      }
      for (const task of definition.tasks) for (let repeat = 0; repeat < definition.repeats; repeat++) for (const condition of ["baseline", "candidate"] as const) {
        let parent: string | null = null;
        for (let retry = 0; retry <= definition.retries; retry++) {
          signal.throwIfAborted();
          const current = this.store.get(runId)!;
          if (current.state === "paused") throw new Error("Paused at evaluation dispatch boundary");
          const kind = retry ? "retry" : purpose === "candidate" ? condition : purpose;
          const invocation = await this.#invocation(e, condition, task.id, repeat, kind, parent, task.prompt, signal);
          if (!invocation.valid && retry < definition.retries) { parent = invocation.id; continue; }
          break;
        }
      }
      signal.throwIfAborted();
      if (e.invocations.some(i => i.state !== "ingested")) throw new Error("Evaluation completion requires every invocation ingested");
      e.analysis = analyze(e, run.spec.config.objective.direction);
      e.quality.passed = e.quality.required.every(v => v === 'no-native-failures' ? e!.invocations.every(i => i.valid) : v === 'preserve-baseline-correct' ? e!.invocations.filter(i => i.condition === 'baseline' && i.role !== 'judge' && i.valid && i.score === '1').every(i => e!.invocations.some(c => c.condition === 'candidate' && c.role !== 'judge' && c.taskId === i.taskId && c.repeat === i.repeat && c.valid && c.score === '1')) : e!.invocations.every(i => i.valid && i.score === '1'));
      e.validity = e.invocations.every(i => i.valid) && e.quality.passed ? "valid" : "invalid";
      e.state = "completed"; this.store.saveEvaluation(e);
      await this.#artifact(e).catch(error => { e!.error = `Derived artifact unavailable: ${String(error)}`.slice(0, 4096); this.store.saveEvaluation(e!); });
      this.store.settle(runId, this.owner.generation, run.material ? "ready" : "completed", "native-evaluation-completed; incumbent-not-decided", null, `eval-${id}`);
      return e;
    } catch (error) {
      if (!e) throw error;
      e.state = signal.aborted || this.store.get(runId)!.state === "paused" || e.invocations.some(i => i.state !== "ingested") ? "INTERRUPTED" : "blocked";
      e.error = String(error).slice(0, 4096); this.store.saveEvaluation(e);
      await this.#artifact(e).catch(() => undefined);
      this.store.settle(runId, this.owner.generation, this.store.get(runId)!.state === "paused" ? "paused" : "interrupted", error instanceof NativeAdmissionError ? `research-stop:${error.reason}` : e.state, e.error, `interrupted-${id}-${run.revision}`);
      return e;
    }
  }
  async #artifact(e: EvaluationRecord): Promise<void> {
    const text = canonical(e) + "\n";
    if (Buffer.byteLength(text) > this.store.get(e.runId)!.spec.config.limits.artifactBytes) throw new Error("Evaluation artifact exceeds saved artifact allowance; native SQLite facts retained");
    const directory = join(this.stateDirectory, "runs", e.runId, "evaluations"); await mkdir(directory, { recursive: true });
    const path = join(directory, `${e.id}.json`), temporary = `${path}.${this.owner.generation}.tmp`;
    await writeFile(temporary, text, { mode: 0o600 }); await rename(temporary, path);
  }
  async #invocation(e: EvaluationRecord, condition: "baseline" | "candidate", taskId: string, repeat: number, purpose: Invocation["purpose"], parentId: string | null, taskPrompt: string, signal: AbortSignal): Promise<Invocation> {
    const id = invocationId(`${e.runId}/${e.id}`, condition, taskId, repeat, purpose, parentId), snapshot = e.snapshots[condition];
    let i = e.invocations.find(i => i.id === id);
    const judge = purpose === "judge";
    const request: Record<string, unknown> = e.definition.kind === "command" ? { command: e.definition.command, cwd: snapshot.directory, deadlineMs: e.definition.deadlineMs } : e.definition.kind === "provider" ? { providerAction: e.definition.providerAction, snapshotId: snapshot.id, cwd: snapshot.directory } : { name: `arbor-${judge ? "judge" : "subject"}-${id}`, task: judge ? `Arbor bounded evaluation judge. ${e.definition.judge!.instructions}\n${taskPrompt}\nReturn exactly PASS or FAIL.` : subjectBootstrap(snapshot, e.definition.subject.promptFiles, taskPrompt),
      model: judge ? e.definition.judge!.model : e.definition.subject.model, tools: judge ? [] : e.definition.subject.tools, runner: "pi", transport: "process", thinking: "off", extensions: false, recursive: false, residency: "session", cwd: snapshot.directory };
    if (i && i.requestId !== digest({ definitionId: e.definitionId, request, purpose, parentId })) throw new Error("Immutable subject/judge request binding changed");
    if (i?.state === "ingested") return i;
    if (!i?.native) await requireNativeAdmission(this.store, e.runId, e);
    if (!i) {
      i = { id, condition, taskId, repeat, purpose, parentId, snapshotId: snapshot.id, requestId: digest({ definitionId: e.definitionId, request, purpose, parentId }), role: judge ? "judge" : e.definition.kind === "agent-suite" ? "subject" : e.definition.kind, model: typeof request.model === "string" ? request.model : null, tools: Array.isArray(request.tools) ? structuredClone(request.tools) as string[] : [], bootstrapId: digest(request.task ?? request), nativeId: null, state: "reserved", native: null, valid: false, score: null, reason: null };
      e.invocations.push(i);
      try { this.store.saveEvaluation(e); } catch (error) { e.invocations.pop(); throw error; }
    }
    await verifyMaterial(snapshot);
    if (!i.native) {
      if (i.state !== "reserved") throw new Error("Unobservable launch/attachment gap; no duplicate dispatch");
      await requireNativeAdmission(this.store, e.runId, e); signal.throwIfAborted();
      if (e.definition.kind === "agent-suite" || judge) await this.owner.evaluationSubject(e, i, request, signal);
      else {
        if (e.definition.kind === "command") {
          i.state = "launching"; this.store.saveEvaluation(e);
          const command = e.definition.command!;
          i.native = await commandRun(command.argv, snapshot.directory, e.definition.deadlineMs, signal);
          i.nativeId = i.native.id;
          i.native.checkResults = [];
          for (const check of command.checks) {
            if (!nativeSuccess(i.native)) break;
            await requireNativeAdmission(this.store, e.runId, e); signal.throwIfAborted();
            const result = await commandRun(check, snapshot.directory, e.definition.deadlineMs, signal);
            i.native.checks.push(nativeSuccess(result)); i.native.checkResults.push(result);
          }
        } else {
          await mkdir(join(this.stateDirectory, "runs", e.runId, "evaluations", e.id), { recursive: true });
          const result = await this.catalog.evaluate(e.definition.providerAction!, { snapshot: { id: snapshot.id, directory: snapshot.directory, oid: snapshot.oid }, specification: canonical(e.definition), outputDirectory: join(this.stateDirectory, "runs", e.runId, "evaluations", e.id), evaluationId: e.id, invocationId: i.id }, async () => {
            await requireNativeAdmission(this.store, e.runId, e); signal.throwIfAborted();
            if (this.#draining) throw new Error("Evaluator retired before provider dispatch");
            i!.state = "launching"; this.store.saveEvaluation(e);
          });
          i.native = result.native; i.score = result.measurement;
        }
        i.nativeId = i.native.id; i.state = "native-complete"; this.store.saveEvaluation(e);
      }
    }
    // Aborted ingestion returns INTERRUPTED. The independently durable native fact
    // is never inferred from a model claim and is reusable only after observation.
    signal.throwIfAborted(); if (this.#draining) throw new Error("Evaluator retired before ingestion");
    await verifyMaterial(snapshot);
    const priorGrade = { valid: i.valid, score: i.score, reason: i.reason, state: i.state };
    i.valid = nativeSuccess(i.native!, e.definition.kind === "command" ? e.definition.command!.checks.length : undefined);
    if (i.valid) {
      try {
        if (judge) { if (!["PASS", "FAIL"].includes(i.native!.text.trim())) throw new Error("Ambiguous judge grade"); i.score = i.native!.text.trim() === "PASS" ? "1" : "0"; }
        else if (e.definition.kind === "command") i.score = parseMetric(i.native!.text, e.definition.command!.unit);
        else if (e.definition.kind === "provider") { if (i.score === null) throw new Error("Missing provider metric"); units(i.score); }
        else {
          const expected = e.definition.tasks.find(t => t.id === taskId)!.expected;
          i.score = i.native!.text.trim() === expected ? "1" : "0";
        }
      } catch (error) { if (signal.aborted || this.#draining) throw error; i.valid = false; i.reason = String(error); }
    }
    // Only deterministic parsing above can invalidate a grade. Dispatch,
    // material verification and persistence faults must interrupt reconciliation.
    if (i.valid && !judge && e.definition.judge) {
      const expected = e.definition.tasks.find(t => t.id === taskId)!.expected;
      let grade: Invocation;
      try { grade = await this.#invocation(e, condition, taskId, repeat, "judge", i.id, `Task: ${taskPrompt}\nExpected: ${expected}\nSubject answer: ${i.native!.text}`, signal); }
      catch (error) { Object.assign(i, priorGrade); throw error; }
      if (!grade.valid) { i.valid = false; i.reason = "Judge execution/grade invalid"; }
      else if (grade.score !== "1") i.score = "0";
    }
    if (!i.valid) { i.score = null; i.reason ??= "Native execution/error/deadline/check gate failed"; }
    i.state = "ingested";
    try { this.store.saveEvaluation(e); } catch (error) { Object.assign(i, priorGrade); throw error; }
    return i;
  }
  async resume(command: BoundCommand, owner: NativeOwner, signal?: AbortSignal): Promise<void> {
    if (this.#active.has(command.runId) || this.#draining) throw new Error("Resume requires quiescent evaluation boundary");
    const run = this.store.get(command.runId)!; this.store.check(run, command);
    if (canonical(owner) !== canonical(run.owner)) throw new Error("Different native owning Pi root/host/identity");
    if (run.material) await new Workspace(join(this.stateDirectory, "runs", run.id, "workspace")).verify(run.material.capture);
    else if (await realpath(run.spec.source.root) !== run.spec.source.root || (await exec("git", ["rev-parse", "HEAD"], { cwd: run.spec.source.root })).stdout.trim() !== run.spec.source.oid) throw new Error("Immutable source cwd/OID changed");
    const { identity: specId, ...specBody } = run.spec;
    if (specId !== digest(specBody)) throw new Error("Frozen resolved spec identity changed");
    const records = this.store.evaluations(run.id);
    for (const e of records) {
      if (e.definitionId !== digest(e.definition) || e.specId !== run.spec.identity || canonical({ ...e.definition, ...(run.material ? { baseline: run.spec.evaluation!.baseline, candidate: run.spec.evaluation!.candidate } : {}) }) !== canonical(run.spec.evaluation) || e.catalogId !== this.catalog.id) throw new Error("Immutable evaluator/catalog identity changed; explicit new measurement required");
      if (e.definition.providerAction) this.catalog.binding(e.definition.providerAction);
      await verifyMaterial(e.snapshots.baseline); await verifyMaterial(e.snapshots.candidate);
      for (const i of e.invocations) if (i.state !== "ingested") {
        if (e.definition.kind === "agent-suite") await this.owner.observeEvaluation(e, i);
        else if (!i.native) throw new Error("Unknown command/provider completion handle; never relaunch ambiguous work");
      }
    }
    signal?.throwIfAborted();
    this.store.rebindEvaluationRun(command, owner, this.owner.componentId, this.owner.generation);
    for (const old of records) if (old.state !== "completed") {
      const e = old; e.generation = this.owner.generation; e.state = "running"; e.error = null;
      e.providerBinding = e.definition.providerAction ? this.catalog.binding(e.definition.providerAction) : null;
      if (e.bindings.at(-1)?.generation !== this.owner.generation) { if (e.bindings.length >= 128) throw new Error("Evaluation binding-history limit reached; new measurement required"); e.bindings.push({ generation: this.owner.generation, componentId: this.owner.componentId, catalogId: this.catalog.id, providerBinding: e.providerBinding }); }
      this.store.saveEvaluation(e); await this.evaluate(run.id, e.id, signal, e.purpose, undefined, e.attemptId ?? null);
    }
  }
  async cancel(runId: string): Promise<void> { const active = this.#active.get(runId); active?.abort.abort(); await active?.promise; }
  async dispose(): Promise<void> { this.#draining = true; for (const active of this.#active.values()) active.abort.abort(); await Promise.allSettled([...this.#active.values()].map(a => a.promise)); }
}
