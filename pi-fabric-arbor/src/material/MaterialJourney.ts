import { join } from "node:path";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import type { OwnerExecution } from "../managed/OwnerExecution.js";
import type { EvaluationEngine } from "../evaluators/EvaluationEngine.js";
import { verifyMaterial } from "../evaluators/material.js";
import { digest, type BoundCommand } from "../research/contracts.js";
import type { Receipt, ResearchStore } from "../research/ResearchStore.js";
import { requireNativeAdmission } from '../research/policy.js';
import { Workspace, gitText } from "./Workspace.js";
/** Owner-local bounded material operations. Research policy/role loop remains PR6. */
export class MaterialJourney {
  #busy = new Set<string>();
  draining = false;
  constructor(readonly owner: OwnerExecution, readonly store: ResearchStore, readonly stateDirectory: string, readonly evaluator?: EvaluationEngine) {}
  workspace(runId: string): Workspace { return new Workspace(join(this.stateDirectory, "runs", runId, "workspace")); }
  async invoke(name: string, command: BoundCommand, payload: Record<string, any>, context: FabricInvocationContext): Promise<Receipt> {
    if (this.draining) throw new Error("Material generation draining");
    const duplicate = this.store.receipt(command, name, payload);
    if (duplicate && !(name === "decide" && duplicate.status === "queued" && this.store.get(command.runId)?.material?.pending?.commandId === command.commandId)) return duplicate;
    if (this.#busy.has(command.runId)) throw new Error("Material boundary occupied; await owned operation settlement");
    this.#busy.add(command.runId);
    try { return await this.#invoke(name, command, payload, context); } finally { this.#busy.delete(command.runId); }
  }
  async #invoke(name: string, command: BoundCommand, payload: Record<string, any>, context: FabricInvocationContext): Promise<Receipt> {
    const startedAt=Date.now();
    const run = this.store.get(command.runId)!, m = run.material!, workspace = this.workspace(run.id), generation = this.owner.generation;
    if (!m.pending) this.store.check(run, command);
    await workspace.verify(m.capture); context.signal?.throwIfAborted();
    if (this.draining) throw new Error("Material generation retired");
    if(run.spec.config.execution==='research' && ['dispatch','evaluate'].includes(name)) await requireNativeAdmission(this.store,run.id);
    if (name === "dispatch") {
      await this.owner.verifyRoles(run.id);
      context.signal?.throwIfAborted(); if (this.draining) throw new Error("Material generation retired before role admission");
      // All awaits precede the final replay check and atomic whole-wave reservation.
      const replay=this.store.receipt(command,'dispatch',payload);if(replay)return replay;
      const receipt=this.store.research('dispatch',command,payload,generation);
      const items: Array<{attemptId:string}>=payload.candidates??[payload],candidates=[];
      try {
        for(const item of items){
          const candidate=await workspace.materialize(m.capture,item.attemptId,m.incumbent);
          this.store.materialCandidate(this.store.binding(this.store.get(run.id)!,`workspace-${item.attemptId}`),generation,candidate);
          candidates.push(candidate);
        }
      } catch(error) {
        // Preparation precedes every native launch. Keep partial workspaces and
        // consumed attempt identities, but release all proven unused credits/slots.
        const failures:unknown[]=[error];
        for(const item of items){try{this.store.refuseUnlaunched(run.id,item.attemptId,generation);}catch(e){failures.push(e);}}
        this.store.failMaterialDispatch(command,payload,generation,failures.map(String));
        throw new AggregateError(failures,failures.map(String).join('; '));
      }
      const preparedAt=Date.now();
      // One finite owned wave. No continuation callback, idle polling or scheduler.
      const outcomes:PromiseSettledResult<void>[]=[];
      if(run.spec.config.search.concurrency===1){for(const candidate of candidates)outcomes.push((await Promise.allSettled([this.owner.dispatchMaterial(run.id,candidate.id,context)]))[0]!);}
      else outcomes.push(...await Promise.allSettled(candidates.map(candidate=>this.owner.dispatchMaterial(run.id,candidate.id,context))));
      const settledAt=Date.now();const failures:unknown[]=[];
      // Collect only after every owned native operation settles. Shared Git and
      // subsequent measurements/integration remain serial and revision-bound.
      for(let i=0;i<candidates.length;i++){
        const candidate=candidates[i]!,outcome=outcomes[i]!,attempt=this.store.attempt(run.id,candidate.id)!;
        if(outcome.status==='rejected' && (!payload.candidates || !(attempt.nativeDigest&&['failed','stopped','timed_out'].includes(attempt.state))))failures.push(outcome.reason);
        if(attempt.nativeDigest && this.store.get(run.id)!.state!=='cleanup_pending'){
          try{const frozen=await workspace.freeze(m.capture,candidate);if(!this.draining)this.store.materialCandidate(this.store.binding(this.store.get(run.id)!,`freeze-${candidate.id}`),generation,frozen);}catch(e){failures.push(e);}
          // A scope/freeze refusal cannot skip cleanup of this proven settled
          // writer. Restore retains worker/dirty refs and independently verifies ownership.
          try{await workspace.restore(m.capture,candidate);}catch(e){failures.push(e);}
        }
      }
      if(!this.draining)this.store.recordWave(run.id,generation,{waveId:payload.waveId??command.commandId,parentIncumbent:m.incumbent,attemptIds:items.map(i=>i.attemptId),startedAt,preparedAt,settledAt,collectedAt:Date.now()});
      if(failures.length){this.store.failMaterialDispatch(command,payload,generation,failures.map(String));throw new AggregateError(failures,failures.map(String).join('; '));}
      return receipt;
    }
    if (name === "collect") {
      const candidate = m.candidates.find(c => c.id === payload.attemptId);
      if (!candidate?.oid) return this.store.unavailable(command, generation, name, payload, "No settled frozen candidate; unresolved work retained");
      return this.store.research("collect", command, payload, generation);
    }
    if (name === "evaluate") {
      if (!this.evaluator) throw new Error("Packaged evaluator unavailable");
      if (m.pending) throw new Error("Pending integration must reconcile first");
      let target = m.capture.baseline;
      const attempt = this.store.attempt(run.id, payload.attemptId);
      if (attempt || !["baseline", "exact-material"].includes(payload.attemptId)) {
        if (!m.baselineEvaluation) throw new Error("Valid captured baseline required first");
        const candidate = m.candidates.find(c => c.id === payload.attemptId);
        if (attempt?.state !== "completed" || !attempt.nativeDigest || !candidate?.oid) throw new Error("Completed settled frozen candidate required");
        const combined = await workspace.combine(m.capture, candidate, m.incumbent);
        if (combined.oid !== candidate.oid) this.store.materialCandidate(this.store.binding(this.store.get(run.id)!, `combine-${payload.evaluationId}`), generation, combined);
        target = combined.oid!;
      } else if (m.incumbent !== m.capture.baseline) throw new Error("Initial baseline identity cannot replace current incumbent");
      await workspace.checkScope(m.capture, target);
      const e = await this.evaluator.evaluate(run.id, payload.evaluationId, context.signal, payload.purpose ?? "candidate", { baseline: workspace.reference(m.capture, m.incumbent), candidate: workspace.reference(m.capture, target) }, attempt?.id ?? null);
      if (target === m.capture.baseline && e.state === "completed" && e.validity === "valid" && !this.store.get(run.id)!.material!.baselineEvaluation) this.store.materialBaseline(run.id, generation, e.id);
      return this.store.evaluationReceipt(command, generation, "evaluate", payload, e.state === "completed" ? "applied" : "blocked", e.error);
    }
    if (name === "decide" && payload.decision === "keep") {
      const e = payload.evidenceIds.length === 1 ? this.store.evaluation(run.id, payload.evidenceIds[0]) : undefined;
      if (e) { await verifyMaterial(e.snapshots.baseline); await verifyMaterial(e.snapshots.candidate); await workspace.checkScope(m.capture, e.snapshots.candidate.oid); }
      const receipt = m.pending ? this.store.receipt(command, "decide", payload)! : this.store.prepareIntegration(command, generation, payload);
      const current = this.store.get(run.id)!, intent = current.material!.pending;
      if (!intent) return receipt;
      if (intent.commandId !== command.commandId) throw new Error("Different integration intent; explicit reconciliation required");
      context.signal?.throwIfAborted(); if (this.draining) throw new Error("Integration interrupted before Git CAS; intent retained");
      await workspace.integrate(m.capture, intent.expected, intent.target);
      context.signal?.throwIfAborted(); if (this.draining) throw new Error("Integration interrupted after Git CAS; intent retained");
      return this.store.completeIntegration(run.id, generation, gitText(m.capture.repository, ["rev-parse", "refs/arbor/incumbent"]).trim());
    }
    if (name === "decide" && payload.decision === "discard") {
      const attempt = (this.store.projection(run.id)!.attempts as Array<{ id: string; nodeId: string }>).find(a => a.nodeId === payload.nodeId);
      if (attempt) { const a = this.store.attempt(run.id, attempt.id)!; if (!a.nativeDigest) throw new Error("Discard cannot reset a live or ambiguous writer"); const candidate = m.candidates.find(c => c.id === a.id); if (candidate) await workspace.restore(m.capture, candidate); }
    }
    return this.store.research(name as "decide", command, payload, generation);
  }
  async export(runId: string): Promise<{ baseline: string; selected: string; patch: string; patchDigest: string }> {
    const m = this.store.get(runId)!.material!; const patch = await this.workspace(runId).export(m.capture, m.incumbent);
    return { baseline: m.capture.baseline, selected: m.incumbent, patch, patchDigest: digest(patch) };
  }
  async cancel(runId: string): Promise<boolean> {
    await this.evaluator?.cancel(runId);
    const writersSettled = await this.owner.cancelMaterial(runId);
    // An accepted spawn can lose its reply. No worker handle is not proof that
    // evaluator writers settled; retain their exact input/artifacts for recovery.
    const unresolved = this.store.evaluations(runId).some(e => e.invocations.some(i => ["launching", "attached"].includes(i.state) && !i.native));
    return writersSettled && !unresolved;
  }
}
