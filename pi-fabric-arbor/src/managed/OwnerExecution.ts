import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { promisify } from "node:util";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { BindingStore, type Binding } from "./BindingStore.js";
import { ResearchStore, type Receipt } from "../research/ResearchStore.js";
import { ACTOR_PROPOSAL_SCHEMA, type BoundCommand } from "../research/contracts.js";
import { COORDINATOR_INSTRUCTIONS, EXECUTOR_INSTRUCTIONS } from "../research/spec.js";
import { executionSpec, nativeOwner, object, proposal, localStop, text, TERMINAL, type ExecutionSpec, type NativeOwner, type OwnerCall, type OwnerRef, type Target, type Terminal } from "./contracts.js";

import { bindRequest, immutableCopy, EvaluationBindingError } from "../evaluators/trust.js";
import type { EvaluationRecord, Invocation, NativeEvidence } from "../evaluators/contracts.js";
const exec = promisify(execFile);
interface Run {
  binding: Binding; research: boolean; draining: boolean; ambiguous: boolean; reason?: string;
  pending: Set<Promise<unknown>>; targets: Map<string, Target>; stops: Map<string, Promise<void>>;
  operation?: Promise<Binding>; drain?: Promise<void>;
}
/** Host-bound execution adapter, not a reasoning engine or participant registry.
 * Fabric remains authoritative. Sets retain only this generation's calls/handles.
 */
export class OwnerExecution {
  #runs = new Map<string, Run>();
  #admission: Promise<unknown> = Promise.resolve();
  #evaluations = new Map<Promise<unknown>, AbortController>();
  #draining = false;
  #disposed: Promise<void> | undefined;
  constructor(readonly call: OwnerCall, readonly store: BindingStore, readonly componentId: string, readonly generation: string, readonly research?: ResearchStore) {}

  async evaluationSubject(record: EvaluationRecord, invocation: Invocation, request: Record<string, unknown>, signal: AbortSignal): Promise<NativeEvidence> {
    this.#admit(); signal.throwIfAborted();
    const controller = new AbortController(); const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const operation = this.#subject(record, invocation, request, controller.signal);
    this.#evaluations.set(operation, controller);
    try { return await operation; } finally { signal.removeEventListener("abort", abort); this.#evaluations.delete(operation); }
  }
  async observeEvaluation(record: EvaluationRecord, invocation: Invocation): Promise<void> {
    if (invocation.reason?.startsWith("Evaluation binding rejected:")) throw new Error("Evaluation binding rejected; new measurement required, not recovery of poisoned execution");
    if (!invocation.nativeId) throw new Error("Unknown native handle; no guessed launch or PID recovery");
    const binding = bindRequest({ invocation, snapshot: record.snapshots[invocation.condition] });
    const status = bindRequest({ id: invocation.nativeId });
    const raw = object(await binding.accept(status.accept(this.call("agents.status", status.args))));
    const snapshot = binding.expected.snapshot;
    if (raw.id !== invocation.nativeId || raw.cwd !== snapshot.directory || raw.model !== invocation.model || raw.runner !== "pi" || raw.transport !== "process" || !TERMINAL.includes(raw.status as Terminal)) throw new Error("Native evaluation handle is absent, live or ambiguous; explicit recovery blocked");
    if (invocation.native) {
      if (raw.status !== invocation.native.status || raw.text !== invocation.native.text || (raw.error ?? null) !== invocation.native.error) throw new Error("Persisted native completion differs from public terminal observation");
    } else {
      // A known attached handle can lose its return during retirement. Public
      // terminal observation supplies the missing fact, never a replacement run.
      // Without a saved deadline receipt the execution is conservatively invalid.
      if (typeof raw.text !== "string" || raw.runner !== "pi" || raw.transport !== "process") throw new Error("Incomplete native recovery result");
      invocation.native = { id: invocation.nativeId, cwd: snapshot.directory, status: raw.status as Terminal, text: raw.text.slice(0, 65536), error: raw.error === undefined ? null : String(raw.error).slice(0, 4096), exitCode: typeof raw.exitCode === "number" ? raw.exitCode : null, deadline: true, checks: [], usage: null };
      invocation.state = "native-complete";
    }
  }
  async #subject(record: EvaluationRecord, invocation: Invocation, request: Record<string, unknown>, signal: AbortSignal): Promise<NativeEvidence> {
    let id: string | undefined, stopping: Promise<void> | undefined, waiting: Promise<unknown> | undefined, deadline = false, terminal = false;
    const bound = bindRequest(request), expected = bound.expected;
    const cwd = String(expected.cwd), owner = immutableCopy(this.research!.get(record.runId)!.owner);
    const stop = () => {
      if (!id || stopping) return;
      stopping = (async () => {
        const query = bindRequest({ scope: "project", kinds: ["agent"], includeStale: false });
        const members = await query.accept(this.call("agents.members", query.args));
        const member = Array.isArray(members) ? members.map(object).find(m => m.id === id) : undefined;
        if (!member || member.local !== true || member.stale !== false || member.rootId !== owner.rootId || member.ownerHostId !== owner.ownerHostId || member.ownerIdentityId !== owner.ownerIdentityId) throw new Error("Evaluation stop ownership unknown; cleanup pending");
        const target = bindRequest({ id: id! });
        localStop(await target.accept(this.call("agents.stop", target.args)), { id: target.expected.id, kind: "agent", cwd });
      })(); void stopping.catch(() => undefined);
    };
    const abort = () => stop(); signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { deadline = true; stop(); }, record.definition.deadlineMs);
    try {
      invocation.state = "launching"; this.research!.saveEvaluation(record);
      const raw = object(immutableCopy(await this.call("agents.spawn", bound.args))); id = text(raw.id, "evaluation native ID");
      // Immediately own the wait, before attachment/persistence/another launch.
      const wait = bindRequest({ id });
      waiting = wait.accept(this.call("agents.wait", wait.args)); void waiting.catch(() => undefined);
      invocation.nativeId = id; invocation.state = "attached"; this.research!.saveEvaluation(record);
      bound.check();
      if (raw.cwd !== cwd || raw.runner !== "pi" || raw.transport !== "process" || raw.model !== expected.model) { stop(); await waiting; throw new EvaluationBindingError("Native subject handle mismatch"); }
      if (signal.aborted || deadline || this.#draining) stop();
      const result = object(await waiting); bound.check(); wait.check();
      if (result.id !== id || result.cwd !== cwd || result.model !== expected.model || result.runner !== "pi" || result.transport !== "process" || !TERMINAL.includes(result.status as Terminal) || typeof result.text !== "string") throw new EvaluationBindingError("Ambiguous native subject terminal result");
      terminal = true;
      const usage = result.usage ? object(result.usage) : null;
      const native: NativeEvidence = { id, cwd, status: result.status as Terminal, text: result.text.slice(0, 65536), error: result.error === undefined ? null : String(result.error).slice(0, 4096), exitCode: typeof result.exitCode === "number" && Number.isInteger(result.exitCode) ? result.exitCode : null, deadline, checks: [], elapsedMs: typeof result.startedAt === "number" && typeof result.finishedAt === "number" && Number.isSafeInteger(result.finishedAt - result.startedAt) && result.finishedAt >= result.startedAt ? result.finishedAt - result.startedAt : null, usage: usage && [usage.input, usage.output, usage.cost].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0) ? { input: usage.input as number, output: usage.output as number, cost: usage.cost as number, ...(typeof usage.cacheRead === "number" ? { cacheRead: usage.cacheRead } : {}), ...(typeof usage.cacheWrite === "number" ? { cacheWrite: usage.cacheWrite } : {}) } : null };
      if (result.text.length > 65536) native.error = "Native output exceeded evidence bound";
      invocation.native = native; invocation.state = "native-complete";
      // Consequential native completion commits BEFORE caller ingestion or abort.
      this.research!.saveEvaluation(record);
      // A stop can be denied during retirement after wait already proved exact
      // terminal completion. Persist that independent proof before awaiting stop.
      if (stopping) await stopping.catch(() => undefined);
      bound.check(); wait.check();
      return native;
    } catch (error) {
      if (error instanceof EvaluationBindingError) invocation.reason = `Evaluation binding rejected: ${error.message}`;
      throw error;
    } finally {
      // Attachment/persistence/validation can fail after spawn. Those failures
      // never detach the already-owned wait or lose the returned cleanup handle.
      if (waiting && !terminal) stop();
      if (waiting) await waiting.catch(() => undefined);
      if (stopping) await stopping.catch(() => undefined);
      clearTimeout(timer); signal.removeEventListener("abort", abort);
    }
  }

  async identity(context: FabricInvocationContext): Promise<NativeOwner> { const owner = await this.#owner(context); context.signal?.throwIfAborted(); this.#admit(); return owner; }

  async #owner(context: FabricInvocationContext): Promise<NativeOwner> {
    const owner = nativeOwner(await this.call("agents.self", {}));
    // Native identity is never accepted from action arguments. The public Pi context
    // ties the invocation to that intrinsic session, not a name, PID or guessed root.
    if (context.extensionContext.sessionManager.getSessionId() !== owner.sessionId) throw new Error("Only the native owning Pi session may mutate Arbor");
    if (!context.extensionContext.isProjectTrusted()) throw new Error("Arbor requires a trusted owning Pi project");
    return owner;
  }
  #admit(run?: Run): void {
    if (this.#draining || this.store.closed || run?.draining) throw new Error("Arbor generation is draining; no new dispatch");
  }
  #track<T>(run: Run, factory: () => Promise<T>): Promise<T> {
    // Track BEFORE invoking the host, including synchronously throwing providers.
    const pending = Promise.resolve().then(factory);
    run.pending.add(pending);
    void pending.then(() => run.pending.delete(pending), () => run.pending.delete(pending));
    return pending;
  }
  #call(run: Run, ref: OwnerRef, args: Record<string, unknown>): Promise<unknown> {
    return this.#track(run, async () => {
      try { return await this.call(ref, args); }
      catch (error) { if (ref === "agents.create" || ref === "agents.spawn") run.ambiguous = true; throw error; }
    });
  }
  async #verifySnapshot(spec: ExecutionSpec): Promise<void> {
    const path = await realpath(spec.cwd);
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], { cwd: path, timeout: 10_000, maxBuffer: 8192 });
    if (path !== spec.cwd || stdout.trim() !== spec.oid) throw new Error("Material canonical cwd/Git OID binding changed");
  }
  async start(args: Record<string, unknown>, context: FabricInvocationContext, research = false): Promise<Binding> {
    const model = context.extensionContext.model;
    const spec = executionSpec(args, model ? `${model.provider}/${model.id}` : undefined);
    const owner = await this.#owner(context);
    if (!context.extensionContext.modelRegistry.getAvailable().some(model => `${model.provider}/${model.id}` === spec.model)) throw new Error("Select an exact available provider/model from the owning Pi registry");
    context.signal?.throwIfAborted();
    this.#admit();
    const mode = object(await this.call("schema.status", {})).mode;
    if (!["off", "audit", "enforce"].includes(String(mode))) throw new Error("Unknown Schema mode; run doctor");
    if (mode === "enforce") throw new Error("Arbor native delegation is unavailable in Schema enforce mode; host policy is unchanged");
    spec.cwd = await realpath(spec.cwd);
    await this.#verifySnapshot(spec);
    // Serialize only admission. Never serialize cancellation behind running work.
    let abort: (() => void) | undefined;
    const admitted = this.#admission.then(() => {
      // Validation and queued admission can both outlive the invocation signal.
      // This check must precede binding persistence and all run-owned effects.
      context.signal?.throwIfAborted();
      this.#admit();
      if (research && !["ready", "running"].includes(this.research!.get(spec.runId)!.state)) throw new Error("Research control superseded native admission; no dispatch");
      const existing = this.#runs.get(spec.runId);
      if (!existing && this.#runs.size >= 128) throw new Error("Arbor generation binding limit reached; settle and reload before new bindings");
      const binding = existing?.binding ?? this.store.bind({ version: 1, spec, owner, componentId: this.componentId, generation: this.generation, revision: 0, state: "running", dispatches: [], actors: [], workers: [] });
      if (JSON.stringify(binding.owner) !== JSON.stringify(owner)) throw new Error("Different native owning Pi root/host/identity; no attachment or adoption");
      if (JSON.stringify(binding.spec) !== JSON.stringify(spec)) throw new Error("Immutable run material/cwd/OID/policy/model/budget binding changed");
      if (binding.componentId !== this.componentId || binding.generation !== this.generation) throw new Error("Replacement generation requires explicit reconciliation; PR2 does not redispatch retained bindings");
      const run: Run = existing ?? { binding, research, draining: false, ambiguous: false, pending: new Set(), targets: new Map(), stops: new Map() };
      abort = () => { void this.#drain(run, "cancelled").catch(() => undefined); };
      context.signal?.addEventListener("abort", abort, { once: true });
      if (context.signal?.aborted) abort();
      if (!existing) {
        this.#runs.set(spec.runId, run);
        // Subscribe before #cycle performs its first synchronous persistence.
        run.operation = this.#cycle(run);
        // Observe rejection immediately even if cancellation wins before caller awaits.
        void run.operation.catch(() => undefined);
      }
      return run;
    });
    this.#admission = admitted.catch(() => undefined);
    try {
      const run = await admitted;
      return structuredClone(await run.operation!);
    } finally { if (abort) context.signal?.removeEventListener("abort", abort); }
  }
  inspect(runId: string): Binding | undefined {
    return structuredClone(this.#runs.get(runId)?.binding ?? this.store.get(runId));
  }
  async cancel(runId: string, context: FabricInvocationContext): Promise<Binding> {
    const owner = await this.#owner(context);
    const run = this.#runs.get(runId);
    if (!run) throw new Error("No live owner binding; explicit reconciliation is required");
    if (JSON.stringify(owner) !== JSON.stringify(run.binding.owner)) throw new Error("Different native owning Pi root/host/identity");
    if (run.binding.state === "running") await this.#drain(run, "cancelled");
    await run.operation;
    return structuredClone(run.binding);
  }
  async #cycle(run: Run): Promise<Binding> {
    const b = run.binding, spec = b.spec;
    try {
      this.#admit(run);
      const dispatch: Binding["dispatches"][number] = { kind: "actor", name: `arbor-${spec.runId.slice(0, 48)}-${this.generation}` };
      b.dispatches.push(dispatch); this.store.save(b);
      const raw = object(await this.#call(run, "agents.create", {
        name: dispatch.name,
        instructions: run.research ? COORDINATOR_INSTRUCTIONS : "You are Arbor's proposal-only coordinator. Choose a bounded wave from owner observations or stop. Never approve, mutate Arbor, or dispatch. Return a silent directive with data matching the supplied closed contract. No scores are authoritative.",
        scope: "project", runner: "pi", transport: "process", residency: "session", model: spec.model,
        thinking: "off", delivery: "mailbox", responseMode: "directive", triggerTurn: false, tools: run.research ? this.research!.get(spec.runId)!.spec.roles.coordinator.tools : ["fabric_exec"], extensions: true, requires: ["agents.self"],
      }));
      const actorId = text(raw.id, "native actor ID");
      run.targets.set(actorId, { id: actorId, kind: "actor" });
      dispatch.nativeId = actorId; b.actors.push(actorId); this.store.save(b);
      if (raw.scope !== "project" || raw.runner !== "pi" || raw.residency !== "session" || !Array.isArray(raw.requirements) || raw.requirements.length !== 1 || object(raw.requirements[0]).ref !== "agents.self") throw new Error("Native coordinator capability/ownership contract mismatch");
      if (run.draining || this.#draining) { await this.#stop(run, run.targets.get(actorId)!); throw new Error("Late create settled during drain"); }
      if (run.research) await this.#researchCycle(run, actorId);
      else for (let wave = 0; wave <= spec.maxWaves; wave++) {
        this.#admit(run);
        const message = object(await this.#call(run, "agents.ask", {
          id: actorId, message: "Return one silent directive with the closed proposal in data. Observations are authoritative; propose only.", model: spec.model, thinking: "off",
          data: { version: 1, runId: spec.runId, materialId: spec.materialId, policyId: spec.policyId, revision: b.revision,
            objective: spec.objective, remainingWaves: spec.maxWaves - wave, concurrency: spec.concurrency,
            results: b.workers.map(w => ({ id: w.id, status: w.status ?? "unknown" })),
            contract: { version: 1, kind: "wave|stop", runId: spec.runId, materialId: spec.materialId, policyId: spec.policyId, revision: b.revision, tasks: ["bounded instruction; stop requires []"] } },
        }));
        this.#admit(run); // late ask can never spawn or collect
        if (message.actorId !== actorId || message.direction !== "out" || message.action !== "silent" || typeof message.runId !== "string") throw new Error("Mismatched native actor response");
        const choice = proposal(message.data, spec, b.revision, spec.maxWaves - wave);
        if (choice.kind === "stop") break;
        await this.#verifySnapshot(spec);
        this.#admit(run);
        const outcomes = await Promise.allSettled(choice.tasks.map(task => this.#launch(run, task)));
        const failed = outcomes.find(value => value.status === "rejected");
        if (failed?.status === "rejected") throw failed.reason;
        this.#admit(run);
        b.revision++; this.store.save(b);
      }
    } catch (error) {
      b.error = error instanceof Error ? error.message : String(error);
      if (!run.reason) run.reason = "failed";
    } finally {
      if (b.dispatches.some(dispatch => !dispatch.nativeId)) run.ambiguous = true;
      await this.#drain(run, run.reason ?? "completed");
      b.state = run.ambiguous ? "cleanup_pending" : run.reason === "cancelled" ? "cancelled" : run.reason === "completed" ? "completed" : run.reason === "failed" ? "failed" : "interrupted";
      this.store.save(b);
      if (run.research) this.research!.settle(spec.runId, this.generation, b.state, "native-observation-settled; unscored", b.error ?? null);
    }
    return b;
  }
  async #researchCycle(run: Run, actorId: string): Promise<void> {
    const store = this.research!, runId = run.binding.spec.runId;
    const maxTurns = store.get(runId)!.spec.config.search.maxActorTurns;
    for (let turn = 0; turn < maxTurns; turn++) {
      this.#admit(run);
      const current = store.get(runId)!;
      if (!["ready", "running"].includes(current.state)) break;
      const projection = store.projection(runId)!;
      const response = object(await this.#call(run, "agents.ask", {
        id: actorId, message: "Return one silent directive with a closed v2 proposal. Only read-only observation work is available. No self-approval, scoring or Arbor calls.", model: current.spec.roles.coordinator.model, thinking: "off",
        data: { version: 2, ...store.binding(current, `actor-${turn}`), objective: current.spec.config.objective, remainingAttempts: current.spec.config.limits.attempts - current.attemptsUsed,
          nodes: projection.nodes, attempts: projection.attempts, evidence: projection.artifact_refs, steering: current.steering, contract: ACTOR_PROPOSAL_SCHEMA },
      }));
      this.#admit(run);
      if (response.actorId !== actorId || response.direction !== "out" || response.action !== "silent" || typeof response.runId !== "string") throw new Error("Mismatched native actor response");
      if (!["ready", "running"].includes(store.get(runId)!.state)) break; // pause/cancel boundary wins over the late ask
      const proposal = store.validateProposal(response.data, runId);
      const command: BoundCommand = { runId: proposal.runId, materialId: proposal.materialId, epoch: proposal.epoch, revision: proposal.revision, commandId: proposal.commandId };
      if (proposal.kind === "dispatch") await this.dispatchResearch(command, proposal.payload);
      else store.research(proposal.kind, command, proposal.payload, this.generation);
      if (proposal.kind === "decide" && proposal.payload.decision === "stop") break;
    }
  }
  async dispatchResearch(command: BoundCommand, payload: Record<string, any>): Promise<Receipt> {
    this.#admit();
    const run = this.#runs.get(command.runId);
    if (!run?.research || !this.research) throw new Error("No live research execution binding; explicit resume/reconciliation required");
    const duplicate = this.research.receipt(command, "dispatch", payload);
    if (duplicate) return duplicate;
    this.#admit(run);
    await this.#verifySnapshot(run.binding.spec);
    this.#admit(run);
    const racedDuplicate = this.research.receipt(command, "dispatch", payload);
    if (racedDuplicate) return racedDuplicate;
    const receipt = this.research.research("dispatch", command, payload, this.generation);
    const attempt = this.research.attempt(command.runId, payload.attemptId)!;
    await this.#track(run, () => this.#launch(run, attempt.task, attempt.id));
    return receipt;
  }
  async #launch(run: Run, task: string, attemptId?: string): Promise<void> {
    this.#admit(run);
    const b = run.binding, spec = b.spec;
    const dispatch: Binding["dispatches"][number] = { kind: "agent", name: `arbor-worker-${this.generation}-${b.dispatches.length}` };
    b.dispatches.push(dispatch); this.store.save(b);
    const raw = object(await this.#call(run, "agents.spawn", { name: dispatch.name, task: `${EXECUTOR_INSTRUCTIONS}\nAssignment: ${task}\nMaterial: ${spec.materialId}\nExact OID: ${spec.oid}`, runner: "pi", transport: "process", model: run.research ? this.research!.get(spec.runId)!.spec.roles.executor.model : spec.model, thinking: "off", tools: run.research ? this.research!.get(spec.runId)!.spec.roles.executor.tools : ["read", "grep", "find", "ls"], extensions: false, recursive: false, cwd: spec.cwd, residency: "session" }));
    const id = text(raw.id, "native worker ID");
    const target: Target = { id, kind: "agent", cwd: spec.cwd };
    run.targets.set(id, target);
    // Own wait immediately, before persistence or another async boundary. This
    // suppresses detached Main notification even when the spawn result is late.
    const waiting = this.#call(run, "agents.wait", { id });
    void waiting.catch(() => undefined);
    const worker: Binding["workers"][number] = { id, cwd: spec.cwd, oid: spec.oid, task };
    dispatch.nativeId = id; b.workers.push(worker); this.store.save(b);
    if (raw.cwd !== spec.cwd || raw.runner !== "pi" || raw.transport !== "process" || (raw.residency !== undefined && raw.residency !== "session")) throw new Error("Native worker identity/cwd mismatch");
    if (attemptId) this.research!.native(spec.runId, attemptId, this.generation, { id, cwd: spec.cwd });
    if (run.draining || this.#draining) await this.#stop(run, target);
    const result = object(await waiting);
    if (result.id !== id || result.cwd !== spec.cwd || !TERMINAL.includes(result.status as Terminal)) throw new Error("Ambiguous native wait result");
    // Persist settlement facts while draining, never proposal/domain transitions.
    worker.status = result.status as Terminal; this.store.save(b);
    if (attemptId) this.research!.native(spec.runId, attemptId, this.generation, { id, cwd: spec.cwd, status: worker.status });
    if (worker.status !== "completed" && !run.draining) throw new Error(`Worker ${id} ended ${worker.status}`);
  }
  async #members(run: Run): Promise<Record<string, unknown>[]> {
    const value = await this.#call(run, "agents.members", { scope: "project", kinds: ["actor", "agent"], includeStale: false });
    if (!Array.isArray(value)) throw new Error("Invalid public participant observation");
    return value.map(object);
  }
  #stop(run: Run, target: Target): Promise<void> {
    if (target.kind === "agent" && run.binding.workers.some(w => w.id === target.id && w.status !== undefined)) return Promise.resolve();
    const existing = run.stops.get(target.id);
    if (existing) return existing;
    const stopping = this.#track(run, async () => {
      try {
        const member = (await this.#members(run)).find(p => p.id === target.id);
        const owner = run.binding.owner;
        if (!member || member.kind !== target.kind || member.local !== true || member.stale !== false || member.rootId !== owner.rootId || member.ownerHostId !== owner.ownerHostId || member.ownerIdentityId !== owner.ownerIdentityId) throw new Error("Native target locality/ownership cannot be proved; no remote stop sent");
        localStop(await this.#call(run, "agents.stop", { id: target.id }), target);
        if (target.kind === "actor") {
          localStop(await this.#call(run, "agents.status", { id: target.id }), target);
          const removed = object(await this.#call(run, "agents.remove", { id: target.id, scope: "project" }));
          if (removed.removed !== true || Object.keys(removed).some(key => key !== "removed")) throw new Error("Actor removal ambiguous");
        }
      } catch (error) {
        run.ambiguous = true;
        run.binding.error = error instanceof Error ? error.message : String(error);
      }
    });
    run.stops.set(target.id, stopping);
    return stopping;
  }
  #drain(run: Run, reason: string): Promise<void> {
    run.draining = true;
    run.reason ??= reason;
    run.drain ??= (async () => {
      // Late creates/spawns add targets and their own stops. Settle to a fixed
      // point of owned promises, not one stale Promise.all snapshot.
      for (;;) {
        for (const target of run.targets.values()) void this.#stop(run, target);
        const pending = [...run.pending];
        if (!pending.length) break;
        await Promise.allSettled(pending);
      }
      try {
        const live = (await this.#members(run)).filter(p => run.targets.has(String(p.id)) && ![...TERMINAL, "stopped"].includes(p.status as Terminal));
        if (live.length) throw new Error("Run-owned native participants remain live");
      } catch (error) { run.ambiguous = true; run.binding.error = String(error); }
    })();
    return run.drain;
  }
  dispose(): Promise<void> {
    this.#draining = true;
    this.#disposed ??= (async () => {
      for (const controller of this.#evaluations.values()) controller.abort();
      await Promise.allSettled([...this.#evaluations.keys()]);
      await this.#admission;
      await Promise.all([...this.#runs.values()].map(run => this.#drain(run, "interrupted")));
      const settled = await Promise.allSettled([...this.#runs.values()].map(run => run.operation));
      const failures = settled.filter(result => result.status === "rejected");
      if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Arbor owned settlement/storage failed; evidence retained");
    })();
    return this.#disposed;
  }
  async close(): Promise<void> { try { await this.dispose(); } finally { this.store.close(); } }
}
