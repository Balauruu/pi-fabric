import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { promisify } from "node:util";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { BindingStore, type Binding } from "./BindingStore.js";
import { executionSpec, nativeOwner, object, proposal, localStop, text, TERMINAL, type ExecutionSpec, type NativeOwner, type OwnerCall, type OwnerRef, type Target, type Terminal } from "./contracts.js";

const exec = promisify(execFile);
interface Run {
  binding: Binding; draining: boolean; ambiguous: boolean; reason?: string;
  pending: Set<Promise<unknown>>; targets: Map<string, Target>; stops: Map<string, Promise<void>>;
  operation?: Promise<Binding>; drain?: Promise<void>;
}
/** Host-bound execution adapter, not a reasoning engine or participant registry.
 * Fabric remains authoritative. Sets retain only this generation's calls/handles.
 */
export class OwnerExecution {
  #runs = new Map<string, Run>();
  #admission: Promise<unknown> = Promise.resolve();
  #draining = false;
  #disposed: Promise<void> | undefined;
  constructor(readonly call: OwnerCall, readonly store: BindingStore, readonly componentId: string, readonly generation: string) {}

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
  async start(args: Record<string, unknown>, context: FabricInvocationContext): Promise<Binding> {
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
      const existing = this.#runs.get(spec.runId);
      if (!existing && this.#runs.size >= 128) throw new Error("Arbor generation binding limit reached; settle and reload before new bindings");
      const binding = existing?.binding ?? this.store.bind({ version: 1, spec, owner, componentId: this.componentId, generation: this.generation, revision: 0, state: "running", dispatches: [], actors: [], workers: [] });
      if (JSON.stringify(binding.owner) !== JSON.stringify(owner)) throw new Error("Different native owning Pi root/host/identity; no attachment or adoption");
      if (JSON.stringify(binding.spec) !== JSON.stringify(spec)) throw new Error("Immutable run material/cwd/OID/policy/model/budget binding changed");
      if (binding.componentId !== this.componentId || binding.generation !== this.generation) throw new Error("Replacement generation requires explicit reconciliation; PR2 does not redispatch retained bindings");
      const run: Run = existing ?? { binding, draining: false, ambiguous: false, pending: new Set(), targets: new Map(), stops: new Map() };
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
        instructions: "You are Arbor's proposal-only coordinator. Choose a bounded wave from owner observations or stop. Never approve, mutate Arbor, or dispatch. Return a silent directive with data matching the supplied closed contract. No scores are authoritative.",
        scope: "project", runner: "pi", transport: "process", residency: "session", model: spec.model,
        thinking: "off", delivery: "mailbox", responseMode: "directive", triggerTurn: false, tools: ["fabric_exec"], extensions: true, requires: ["agents.self"],
      }));
      const actorId = text(raw.id, "native actor ID");
      run.targets.set(actorId, { id: actorId, kind: "actor" });
      dispatch.nativeId = actorId; b.actors.push(actorId); this.store.save(b);
      if (raw.scope !== "project" || raw.runner !== "pi" || raw.residency !== "session" || !Array.isArray(raw.requirements) || raw.requirements.length !== 1 || object(raw.requirements[0]).ref !== "agents.self") throw new Error("Native coordinator capability/ownership contract mismatch");
      if (run.draining || this.#draining) { await this.#stop(run, run.targets.get(actorId)!); throw new Error("Late create settled during drain"); }
      for (let wave = 0; wave <= spec.maxWaves; wave++) {
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
    }
    return b;
  }
  async #launch(run: Run, task: string): Promise<void> {
    this.#admit(run);
    const b = run.binding, spec = b.spec;
    const dispatch: Binding["dispatches"][number] = { kind: "agent", name: `arbor-worker-${this.generation}-${b.dispatches.length}` };
    b.dispatches.push(dispatch); this.store.save(b);
    const raw = object(await this.#call(run, "agents.spawn", { name: dispatch.name, task: `Arbor bounded executor. Do not spawn or mutate shared Arbor state. No self-grading. Inspect only.\nAssignment: ${task}\nMaterial: ${spec.materialId}\nExact OID: ${spec.oid}`, runner: "pi", transport: "process", model: spec.model, thinking: "off", tools: ["read", "grep", "find", "ls"], extensions: false, recursive: false, cwd: spec.cwd, residency: "session" }));
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
    if (run.draining || this.#draining) await this.#stop(run, target);
    const result = object(await waiting);
    if (result.id !== id || result.cwd !== spec.cwd || !TERMINAL.includes(result.status as Terminal)) throw new Error("Ambiguous native wait result");
    // Persist settlement facts while draining, never proposal/domain transitions.
    worker.status = result.status as Terminal; this.store.save(b);
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
