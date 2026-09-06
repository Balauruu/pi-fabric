import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { dirname, join } from "node:path";
import { RoleBundle, type RoleAssembly, type RoleInvocation, type RolePhase, type OperationalRole } from "./RoleBundle.js";
import { promisify } from "node:util";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { BindingStore, type Binding } from "./BindingStore.js";
import { ResearchStore, type Receipt } from "../research/ResearchStore.js";
import { ACTOR_PROPOSAL_SCHEMA, WORKER_RESULT_SCHEMA, validate, digest, type BoundCommand } from "../research/contracts.js";
import { EXECUTOR_INSTRUCTIONS } from "../research/spec.js";
import { executionSpec, nativeOwner, object, proposal, localStop, text, TERMINAL, type ExecutionSpec, type NativeOwner, type OwnerCall, type OwnerRef, type Target, type Terminal } from "./contracts.js";

import { bindRequest, immutableCopy, EvaluationBindingError } from "../evaluators/trust.js";
import type { EvaluationRecord, Invocation, NativeEvidence } from "../evaluators/contracts.js";
import type { MaterialJourney } from '../material/MaterialJourney.js';
import { ownedArtifactBytes, nativeAdmission, requireNativeAdmission, researchFacts, researchObservation, stopReason, evaluationCapacity } from '../research/policy.js';
const exec = promisify(execFile);
interface Run {
  journey?: { runId: string; material: MaterialJourney; context: FabricInvocationContext; stop?: string };
  material?: { runId: string; attemptId: string; cwd: string; oid: string };
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

  async verifyRoles(runId: string, resume = false): Promise<void> {
    const saved = this.research!.get(runId)!;
    if (!["inspect", "material", "research"].includes(saved.spec.config.execution)) return;
    await this.#role(runId, "coordinator", resume ? ["strategy", "evidence"] : []);
    await this.#role(runId, "executor", []);
  }
  async #role(runId: string, role: OperationalRole, phases: RolePhase[]): Promise<RoleAssembly> {
    const saved = this.research!.get(runId)!, spec = saved.spec, revision = saved.roleRevisions?.at(-1);
    const bundle = revision?.bundle ?? spec.roleBundle;
    if (!bundle) throw new Error("Operational role bundle missing; no generic bootstrap fallback");
    const bundles = new RoleBundle(join(dirname(this.research!.path), "runs", runId, "roles"));
    const base = await bundles.load(bundle, role, []);
    if (base.instructionsId !== (revision ? revision[role === 'coordinator' ? 'coordinatorId' : 'executorId'] : spec.roles[role].instructionsId)) throw new Error("Operational role binding identity mismatch");
    return phases.length ? bundles.load(bundle, role, phases) : base;
  }
  #recordRole(run: Run, assembly: RoleAssembly, ref: RoleInvocation["ref"], request: Record<string, unknown>): RoleInvocation {
    const runId = run.journey?.runId ?? run.material?.runId ?? run.binding.spec.runId, role = this.research!.get(runId)!.spec.roles[assembly.role];
    const invocation: RoleInvocation = { id: `role-${run.binding.roleInvocations?.length ?? 0}`, ref, bundleId: assembly.bundleId, role: assembly.role, phases: assembly.phases, instructionsId: assembly.instructionsId, requestId: digest(request), roleBindingId: digest({ bundleId: assembly.bundleId, role, revision: this.research!.get(runId)!.roleRevisions?.at(-1)?.revision ?? 0 }), sources: structuredClone(assembly.sources), model: String(request.model), tools: [...role.tools], requires: [...role.requires], resultContract: role.resultContract, extensions: assembly.role === "coordinator", runner: "pi", thinking: "off" };
    (run.binding.roleInvocations ??= []).push(invocation); this.store.save(run.binding); return invocation;
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
  async runResearch(runId: string, material: MaterialJourney, context: FabricInvocationContext): Promise<Binding> {
    this.#admit(); const saved = this.research!.get(runId)!;
    const owner = await this.identity(context); this.research!.authorize(runId, owner, this.generation);
    await this.verifyRoles(runId, true); await material.workspace(runId).verify(saved.material!.capture);
    this.#admit(); context.signal?.throwIfAborted();
    if (this.busyResearch(runId)) throw new Error('Research actor already active');
    const spec = executionSpec({runId: `research-${digest({runId, revision:saved.revision,generation:this.generation}).slice(0,40)}`,materialId:saved.spec.source.materialId,cwd:saved.material!.capture.repository,oid:saved.material!.capture.baseline,policyId:saved.spec.identity,objective:saved.spec.config.objective.description,model:saved.spec.roles.coordinator.model,maxWaves:1,concurrency:1});
    const binding = this.store.bind({version:1,spec,owner,componentId:this.componentId,generation:this.generation,revision:0,state:'running',dispatches:[],actors:[],workers:[]});
    if(binding.actors.length || binding.state!=='running')throw new Error('Prior actor episode cannot be replayed');
    const run:Run={binding,research:true,journey:{runId,material,context},draining:false,ambiguous:false,pending:new Set(),targets:new Map(),stops:new Map()};
    this.#runs.set(spec.runId,run);
    const abort=()=>{void this.#drain(run,'cancelled').catch(()=>undefined);};context.signal?.addEventListener('abort',abort,{once:true});
    run.operation=this.#cycle(run);
    try{return await run.operation;}finally{context.signal?.removeEventListener('abort',abort);}
  }
  busyResearch(runId:string):boolean{return [...this.#runs.values()].some(r=>(r.journey?.runId===runId || r.material?.runId===runId) && r.binding.state==='running');}
  async #cycle(run: Run): Promise<Binding> {
    const b = run.binding, spec = b.spec, logicalId=run.journey?.runId ?? spec.runId;
    try {
      this.#admit(run);
      const role = run.research ? await this.#role(logicalId, "coordinator", []) : undefined;
      this.#admit(run);
      if (await this.#journeyStop(run)) return b;
      this.#admit(run);
      const dispatch: Binding["dispatches"][number] = { kind: "actor", name: run.journey ? `arbor-research-${digest({run:spec.runId,generation:this.generation}).slice(0,40)}` : `arbor-${spec.runId.slice(0, 48)}-${this.generation}` };
      b.dispatches.push(dispatch); this.store.save(b);
      const request = bindRequest({
        name: dispatch.name,
        instructions: role ? role.instructions : "You are Arbor's proposal-only coordinator. Choose a bounded wave from owner observations or stop. Never approve, mutate Arbor, or dispatch. Return a silent directive with data matching the supplied closed contract. No scores are authoritative.",
        scope: "project", runner: "pi", transport: "process", residency: "session", model: spec.model,
        thinking: "off", delivery: "mailbox", responseMode: "directive", triggerTurn: false, tools: run.research ? this.research!.get(logicalId)!.spec.roles.coordinator.tools : ["fabric_exec"], extensions: true, requires: ["agents.self"],
      });
      const invocation = role ? this.#recordRole(run, role, "agents.create", request.args) : undefined;
      const raw = object(immutableCopy(await this.#call(run, "agents.create", request.args)));
      const actorId = text(raw.id, "native actor ID");
      run.targets.set(actorId, { id: actorId, kind: "actor" });
      dispatch.nativeId = actorId; b.actors.push(actorId); if (invocation) invocation.nativeId = actorId; this.store.save(b);
      request.check();
      if (role && raw.model !== request.expected.model) throw new Error("Exact operational actor model mismatch");
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
      if (run.research) this.research!.settle(logicalId, this.generation, run.journey ? this.#journeySettlement(run) : b.state, run.journey ? `research-stop:${run.journey.stop ?? (b.state === "completed" ? this.research!.get(logicalId)!.state : b.state)}` : 'native-observation-settled; unscored', b.error ?? null, `settle-${spec.runId}-${this.generation}`);
    }
    return b;
  }
  #journeySettlement(run: Run): import('../research/ResearchStore.js').ResearchRun['state'] {
    const current=this.research!.get(run.journey!.runId)!;
    if(current.state==='cleanup_pending' || run.binding.state==='cleanup_pending')return 'cleanup_pending';
    if(current.state==='interrupted')return 'interrupted';
    if(current.active || this.research!.evaluations(current.id).some(e=>e.state!=='completed'))return 'interrupted';
    if(['failed','cancelled'].includes(current.state))return current.state;
    return run.binding.state==='completed'?'paused':run.binding.state;
  }
  async #journeyStop(run: Run): Promise<boolean> {
    if(!run.journey)return false;
    const store=this.research!, id=run.journey.runId, {bytes,reason}=await nativeAdmission(store,id);
    const p=store.projection(id)!;
    const stop=reason ?? stopReason(p,researchFacts(p),bytes);
    if(stop)run.journey.stop=stop;
    return !!stop;
  }
  async #researchCycle(run: Run, actorId: string): Promise<void> {
    const store = this.research!, runId = run.journey?.runId ?? run.binding.spec.runId;
    const maxTurns = store.get(runId)!.spec.config.search.maxActorTurns;
    for (let turn = 0; turn < maxTurns; turn++) {
      this.#admit(run);
      const current = store.get(runId)!;
      if (!["ready", "running"].includes(current.state)) break;
      const projection = store.projection(runId)!;
      const bytes=run.journey ? await ownedArtifactBytes(store,runId) : 0;
      const reason=run.journey ? stopReason(projection,researchFacts(projection),bytes) : null;
      if(reason){run.journey!.stop=reason;break;}
      const observation=run.journey ? researchObservation(projection,bytes) : {};
      const role = await this.#role(runId, "coordinator", run.journey || (projection.artifact_refs as unknown[]).length ? ["strategy", "evidence"] : ["strategy"]);
      this.#admit(run);
      if(await this.#journeyStop(run))break;
      this.#admit(run);
      const request = bindRequest({
        id: actorId, message: `${role.instructions}\nReturn one silent directive with a closed v2 proposal. ${run.journey ? 'Autonomous material research. Select the next operation/hypothesis from current incumbent and evidence. Propose, dispatch, collect, evaluate, decide and distill are owner operations. Distill each decided leaf with exact evidence and limitations. Failed checks are not valid no-gain. Budget estimates for evaluate must equal budgets.evaluationCapacity. No worker scored feedback is available.' : 'Only read-only observation work is available.'} No self-approval, scoring or Arbor calls.`, model: current.spec.roles.coordinator.model, thinking: "off",
        data: { version: 2, ...store.binding(current, run.journey ? `actor-${digest(run.binding.spec.runId).slice(0,24)}-${turn}` : `actor-${turn}`), objective: current.spec.config.objective, remainingAttempts: current.spec.config.limits.attempts - current.attemptsUsed,
          nodes: projection.nodes, attempts: projection.attempts, evidence: projection.artifact_refs, steering: current.steering, ...observation, contract: ACTOR_PROPOSAL_SCHEMA },
      });
      const invocation = this.#recordRole(run, role, "agents.ask", request.args);
      const response = object(await request.accept(this.#call(run, "agents.ask", request.args)));
      invocation.nativeId = text(response.runId, "native actor activation ID"); this.store.save(run.binding);
      this.#admit(run);
      if (response.actorId !== actorId || response.direction !== "out" || response.action !== "silent" || typeof response.runId !== "string") throw new Error("Mismatched native actor response");
      if (!["ready", "running"].includes(store.get(runId)!.state)) break; // pause/cancel boundary wins over the late ask
      if(run.journey){const latest=store.get(runId)!;if(latest.activeMs+(latest.activeSince===null?0:Date.now()-latest.activeSince)>=latest.spec.config.limits.activeMs){run.journey.stop='active-time-budget';break;}}
      const proposal = store.validateProposal(response.data, runId);
      const command: BoundCommand = { runId: proposal.runId, materialId: proposal.materialId, epoch: proposal.epoch, revision: proposal.revision, commandId: proposal.commandId };
      if (run.journey && ['dispatch','collect','evaluate','decide'].includes(proposal.kind)) {
        const fresh=store.projection(runId)!;
        if(['dispatch','evaluate'].includes(proposal.kind) && researchFacts(fresh).evaluatorCalls+evaluationCapacity(fresh)>current.spec.config.limits.evaluatorCalls){run.journey.stop='evaluator-budget';break;}
        let receipt:Receipt;
        try{receipt=await run.journey.material.invoke(proposal.kind,command,proposal.payload,run.journey.context);}
        catch(error){const failed=proposal.kind==='dispatch'?store.attempt(runId,proposal.payload.attemptId):undefined;if(failed?.nativeDigest && ['failed','stopped','timed_out'].includes(failed.state) && !['cleanup_pending','interrupted'].includes(store.get(runId)!.state))continue;throw error;}
        if(receipt.status==='blocked'){run.journey.stop=`blocked:${receipt.reason}`;break;}
      } else if (proposal.kind === 'dispatch') await this.dispatchResearch(command, proposal.payload);
      else store.research(proposal.kind, command, proposal.payload, this.generation);
      if (proposal.kind === 'decide' && proposal.payload.decision === 'stop') {if(run.journey)run.journey.stop='actor-stop';break;}
      if(run.journey && turn===maxTurns-1)run.journey.stop='actor-turn-budget';
    }
  }
  /** PR5 single admitted material invocation. No actor strategy or PR6 autonomous loop. */
  async dispatchMaterial(runId: string, attemptId: string, context: FabricInvocationContext): Promise<void> {
    this.#admit(); const research = this.research!, saved = research.get(runId)!, candidate = saved.material!.candidates.find(c => c.id === attemptId)!;
    const attempt = research.attempt(runId, attemptId)!; if (!candidate || attempt.state !== "reserved") throw new Error("Reserved owned candidate required; ambiguous work never redispatched");
    const owner = await this.#owner(context);
    const nativeRunId = `material-${runId}-${attemptId}`;
    if (this.#runs.has(nativeRunId) || this.store.get(nativeRunId)) throw new Error("Existing material invocation requires reconciliation, not redispatch");
    const spec = executionSpec({ runId: nativeRunId, materialId: saved.spec.source.materialId, cwd: candidate.directory, oid: candidate.parent, policyId: saved.spec.identity, objective: saved.spec.config.objective.description, model: saved.spec.roles.executor.model, maxWaves: 1, concurrency: 1 });
    await this.#verifySnapshot(spec); this.#admit(); context.signal?.throwIfAborted();
    if (object(await this.call("schema.status", {})).mode === "enforce") throw new Error("Native material delegation unavailable in Schema enforce; policy unchanged");
    this.#admit(); context.signal?.throwIfAborted();
    const current = research.authorize(runId, owner, this.generation);
    if (!["ready", "running"].includes(current.state)) throw new Error("Control superseded material dispatch");
    const binding = this.store.bind({ version: 1, spec, owner, componentId: this.componentId, generation: this.generation, revision: 0, state: "running", dispatches: [], actors: [], workers: [] });
    const run: Run = { binding, research: true, material: { runId, attemptId, cwd: candidate.directory, oid: candidate.parent }, draining: false, ambiguous: false, pending: new Set(), targets: new Map(), stops: new Map() };
    this.#runs.set(nativeRunId, run);
    const abort = () => { void this.#drain(run, "cancelled").catch(() => undefined); }; context.signal?.addEventListener("abort", abort, { once: true });
    run.operation = (async () => {
      try { await this.#track(run, () => this.#launch(run, `${attempt.task}\nObjective: ${saved.spec.config.objective.description}\nMutable paths: ${JSON.stringify(saved.spec.config.material.mutablePaths)}\nDevelopment evaluation: ${JSON.stringify({kind:saved.spec.evaluation!.kind,definitionId:saved.spec.config.evaluator.identity,feedback:'unavailable; diagnostics non-authoritative',qualityVetoes:saved.spec.config.objective.qualityVetoes})}\nRelevant lessons: ${JSON.stringify((research.projection(runId)!.lessons as Array<{nodeId:string}>).slice(-8))}`, attemptId)); }
      catch (e) {
        binding.error = String(e); binding.state = "failed";
        // A persisted terminal worker failure is an operation outcome, not a
        // failed retirement/storage promise. Unknown settlement still rejects.
        const settled = research.attempt(runId, attemptId);
        if (!settled?.nativeDigest || !TERMINAL.includes(settled.state as Terminal)) throw e;
      }
      finally { await this.#drain(run, "completed"); binding.state = run.ambiguous ? "cleanup_pending" : run.reason === "cancelled" ? "cancelled" : binding.error ? "failed" : "completed"; this.store.save(binding); }
      return binding;
    })();
    try { await run.operation; if (binding.state === "cleanup_pending") throw new Error("Material native cleanup remains ambiguous; workspace retained"); if (binding.error) throw new Error(binding.error); } finally {
      if (binding.state === "cleanup_pending") research.settle(runId, this.generation, "cleanup_pending", "material-cleanup-pending", binding.error ?? "Ambiguous native settlement", `material-cleanup-${attemptId}`);
      context.signal?.removeEventListener("abort", abort);
    }
  }
  async cancelMaterial(runId: string): Promise<boolean> {
    const runs = [...this.#runs.values()].filter(r => r.material?.runId === runId || r.journey?.runId === runId);
    await Promise.all(runs.map(r => this.#drain(r, "cancelled"))); await Promise.allSettled(runs.map(r => r.operation));
    return runs.every(r => !r.ambiguous);
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
    await this.verifyRoles(command.runId); this.#admit(run);
    // All awaited admission work precedes this receipt check. Keep the final
    // duplicate check and transactional reservation contiguous with no await.
    const racedDuplicate = this.research.receipt(command, "dispatch", payload);
    if (racedDuplicate) return racedDuplicate;
    const receipt = this.research.research("dispatch", command, payload, this.generation);
    const attempt = this.research.attempt(command.runId, payload.attemptId)!;
    await this.#track(run, () => this.#launch(run, attempt.task, attempt.id));
    return receipt;
  }
  async #launch(run: Run, task: string, attemptId?: string): Promise<void> {
    this.#admit(run);
    const b = run.binding, spec = run.material ? { ...b.spec, runId: run.material.runId, cwd: run.material.cwd, oid: run.material.oid } : b.spec;
    const role = run.research ? await this.#role(spec.runId, "executor", []) : undefined;
    if(run.material) await requireNativeAdmission(this.research!,spec.runId);
    this.#admit(run);
    const dispatch: Binding["dispatches"][number] = { kind: "agent", name: `arbor-worker-${this.generation}-${b.dispatches.length}` };
    b.dispatches.push(dispatch); this.store.save(b);
    const structured=run.material && this.research!.get(spec.runId)!.spec.config.execution==='research';
    const request = bindRequest({ ...(structured ? {schema:WORKER_RESULT_SCHEMA} : {}), name: dispatch.name, task: `${role?.instructions ?? EXECUTOR_INSTRUCTIONS}\nAssignment mode: ${run.material ? "Arbor bounded material worker" : "read-only observation"}\nAssignment: ${task}\nRun: ${spec.runId}\nAttempt: ${attemptId ?? "bounded-observation"}\nExpected canonical cwd: ${spec.cwd}\nMaterial: ${spec.materialId}\nExact OID: ${spec.oid}\nResult contract: ${run.research ? this.research!.get(spec.runId)!.spec.roles.executor.resultContract : "native-terminal-unscored-text"}\nDiagnostics: no scored feedback capability; no informal diagnostic invocations admitted. Identity check is allowed.`, runner: "pi", transport: "process", model: run.research ? this.research!.get(spec.runId)!.spec.roles.executor.model : spec.model, thinking: "off", tools: run.research ? this.research!.get(spec.runId)!.spec.roles.executor.tools : ["read", "grep", "find", "ls"], extensions: false, recursive: false, cwd: spec.cwd, residency: "session" });
    const invocation = role ? this.#recordRole(run, role, "agents.spawn", request.args) : undefined;
    const raw = object(immutableCopy(await this.#call(run, "agents.spawn", request.args)));
    const id = text(raw.id, "native worker ID");
    const target: Target = { id, kind: "agent", cwd: spec.cwd };
    run.targets.set(id, target);
    // Own wait immediately, before persistence or another async boundary. This
    // suppresses detached Main notification even when the spawn result is late.
    const wait = bindRequest({ id });
    const waiting = wait.accept(this.#call(run, "agents.wait", wait.args));
    void waiting.catch(() => undefined);
    const worker: Binding["workers"][number] = { id, cwd: spec.cwd, oid: spec.oid, task };
    dispatch.nativeId = id; b.workers.push(worker); if (invocation) invocation.nativeId = id; this.store.save(b);
    request.check();
    if (run.material && raw.model !== request.expected.model) throw new Error("Exact material worker model mismatch");
    if (raw.cwd !== spec.cwd || raw.runner !== "pi" || raw.transport !== "process" || (raw.residency !== undefined && raw.residency !== "session")) throw new Error("Native worker identity/cwd mismatch");
    if (attemptId) this.research!.native(spec.runId, attemptId, this.generation, { id, cwd: spec.cwd });
    if (run.draining || this.#draining) await this.#stop(run, target);
    const result = object(await waiting); request.check(); wait.check();
    if (run.material && result.model !== request.expected.model) throw new Error("Exact material worker result model mismatch");
    if (result.id !== id || result.cwd !== spec.cwd || !TERMINAL.includes(result.status as Terminal)) throw new Error("Ambiguous native wait result");
    let reportError: string | undefined;
    if(structured && result.status==='completed'){try{validate(WORKER_RESULT_SCHEMA,result.value);if(object(result.value).attemptId!==attemptId)throw new Error('Worker result attempt mismatch');}catch(e){reportError=String(e);}}
    // Persist settlement facts while draining, never proposal/domain transitions.
    worker.status = run.material && (reportError || result.error || (result.exitCode !== undefined && result.exitCode !== null && result.exitCode !== 0)) ? "failed" : result.status as Terminal; this.store.save(b);
    if (attemptId) this.research!.native(spec.runId, attemptId, this.generation, { id, cwd: spec.cwd, status: worker.status, ...(structured ? {summary:reportError ?? (typeof result.error === "string" ? result.error : JSON.stringify(result.value) ?? "No valid structured worker report")} : {}) });
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
