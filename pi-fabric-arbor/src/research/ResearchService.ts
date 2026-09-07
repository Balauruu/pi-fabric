import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { OwnerExecution } from "../managed/OwnerExecution.js";
import { RoleBundle } from "../managed/RoleBundle.js";
import { object, type NativeOwner } from "../managed/contracts.js";
import { RESEARCH_ACTIONS, canonical, digest, validate, type BoundCommand, type ResearchAction, type Schema } from "./contracts.js";
import { configFile, resolveSpec } from "./spec.js";
import { ResearchStore, type Receipt } from "./ResearchStore.js";
import { promotionGate } from "../material/acceptance.js";
import { verifyMaterial } from "../evaluators/material.js";
import { ownedArtifactBytes, nativeAdmission, evaluationCapacity, researchFacts } from './policy.js';
import { MaterialJourney } from "../material/MaterialJourney.js";
import { SourceApply } from "../material/SourceApply.js";
import type { MaterialState } from "../material/contracts.js";
import type { EvaluationEngine } from "../evaluators/EvaluationEngine.js";

async function canonicalDestination(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; const parent = dirname(path); if (parent === path) throw error; return join(await canonicalDestination(parent), basename(path)); }
}

export class ResearchService {
  #researchRuns = new Set<string>();
  #starts = new Map<string, { hash: string; pending: Promise<unknown> }>();
  #reviews = new Map<string, { hash: string; pending: Promise<unknown> }>();
  #sources = new Map<string, { hash: string; pending: Promise<Receipt> }>();
  #draining = false;
  #disposed: Promise<void> | undefined;
  #pending = new Set<Promise<unknown>>();
  readonly material: MaterialJourney;
  constructor(readonly owner: OwnerExecution, readonly store: ResearchStore, readonly stateDirectory: string, readonly profileDirectory = getAgentDir(), readonly evaluator?: EvaluationEngine) { this.material = new MaterialJourney(owner, store, stateDirectory, evaluator); }
  async invoke(name: string, args: Record<string, unknown>, context: FabricInvocationContext): Promise<unknown> {
    const descriptor = RESEARCH_ACTIONS.find(action => action.name === name); if (!descriptor) throw new Error(`Unknown Arbor action ${name}`);
    validate(descriptor.inputSchema as Schema, args);
    if (name === "inspect") return this.store.projection(String(args.runId));
    if (this.#draining) throw new Error("Arbor research generation is draining");
    const pending = this.#invoke(name, args, context); this.#pending.add(pending);
    try { const result = await pending; validate(descriptor.outputSchema as Schema, result); return result; } finally { this.#pending.delete(pending); }
  }
  async #invoke(name: string, args: Record<string, any>, context: FabricInvocationContext): Promise<unknown> {
    const identity = await this.owner.identity(context);
    if (this.#draining) throw new Error("Arbor research generation is draining");
    context.signal?.throwIfAborted();
    if (name === 'start') return this.#start(args, context, identity);
    if (name === 'runResearch') return this.#runResearch(args,context,identity);
    if(name==='control' && args.action==='resume' && this.store.get(args.runId)?.spec.config.execution==='research')throw new Error('Autonomous resume requires execute-policy arbor.runResearch; no unchecked command evaluation');
    if (((name === "control" && args.action === "resume") || (name === "evaluate" && args.payload?.resume === true)) && ["evaluate", "material"].includes(this.store.get(args.runId)?.spec.config.execution ?? "")) {
      if (!this.evaluator) throw new Error("Packaged evaluator unavailable");
      const command: BoundCommand = { runId: args.runId, materialId: args.materialId, epoch: args.epoch, revision: args.revision, commandId: args.commandId };
      const bound = this.store.get(args.runId)!; if (canonical(bound.owner) !== canonical(identity)) throw new Error("Different native owning Pi root/host/identity");
      if (name === "control" && bound.spec.evaluation?.kind === "command") return this.store.unavailable(command, this.owner.generation, "control", { action: "resume", instruction: null }, "Command evaluation resume requires the execute-policy arbor.evaluate route; /arbor resume selects it through normal policy");
      if (name === "evaluate" && (args.payload.attemptId !== "exact-material" || !this.store.evaluation(args.runId, args.payload.evaluationId))) throw new Error("Unknown exact evaluation resume binding");
      if(name==='control'&&bound.material?.pending)throw new Error('Pending integration requires execute-policy arbor.evaluate reconciliation; agent-risk control cannot apply an owned ref');
      const action = name === "evaluate" ? "evaluate" as const : "control" as const;
      const payload = name === "evaluate" ? args.payload : { action: "resume", instruction: null };
      const duplicate = this.store.receipt(command, action, payload); if (duplicate) return duplicate;
      this.store.check(bound,command);
      await this.owner.verifyRoles(bound.id, true);
      if(bound.material&&bound.pendingDecisionId)return await this.#reconcilePendingReview(command,context,identity,{action,payload});
      let resumeCommand=command;
      if(bound.material && (bound.active||bound.material.pending||['interrupted','cleanup_pending'].includes(bound.state))){resumeCommand=await this.material.reconcile(command,context);}
      await this.evaluator.resume(resumeCommand, identity, context.signal);
      const reconciled = this.store.get(args.runId)!;
      if (reconciled.material && !reconciled.material.baselineEvaluation) {
        const baseline = this.store.evaluations(args.runId).find(e => e.state === "completed" && e.validity === "valid" && e.snapshots.baseline.oid === reconciled.material!.capture.baseline && e.snapshots.candidate.oid === reconciled.material!.capture.baseline);
        if (baseline) this.store.materialBaseline(args.runId, this.owner.generation, baseline.id);
      }
      const current = this.store.get(args.runId)!;
      return this.store.evaluationReceipt(command, this.owner.generation, action, payload, ["INTERRUPTED", "blocked"].includes(current.execution) ? "blocked" : "applied", current.error);
    }
    const command: BoundCommand = { runId: args.runId, materialId: args.materialId, epoch: args.epoch, revision: args.revision, commandId: args.commandId };
    if (name === 'apply' || name === 'undoApply') {
      this.store.authorizeSource(args.runId, identity, this.owner.componentId, this.owner.generation);
      return this.#source(name, command, args.decisionId, context);
    }
    const run = this.store.authorize(args.runId, identity, this.owner.generation);
    if(name==='reviseRoles'){
      const duplicate=this.store.receipt(command,name,{});if(duplicate)return duplicate;
      this.store.check(run,command);
      if(this.#researchRuns.has(run.id)||this.owner.busyResearch(run.id)||run.state!=='paused'||run.active||run.pendingDecisionId||run.material?.pending)throw new Error('Role revision requires quiescent paused owner');
      await this.owner.verifyRoles(run.id,true);
      const bundles=new RoleBundle(join(this.stateDirectory,'runs',run.id,'roles'));
      const bundle=await bundles.freeze(run.spec.config.limits.artifactBytes,run.spec.source.root);
      if(await ownedArtifactBytes(this.store,run.id)>=run.spec.config.limits.artifactBytes)throw new Error('Role revision cumulative artifact budget exhausted; prior binding preserved');
      const coordinatorId=(await bundles.load(bundle,'coordinator',[])).instructionsId, executorId=(await bundles.load(bundle,'executor',[])).instructionsId;
      context.signal?.throwIfAborted();if(this.#draining)throw new Error('Role revision generation retired');
      return this.store.reviseRoles(command,this.owner.generation,{revision:run.revision+1,commandId:command.commandId,bundle,coordinatorId,executorId});
    }
    if(name==='evaluate'&&args.payload?.validation==='final'&&(this.#researchRuns.has(run.id)||this.owner.busyResearch(run.id)))throw new Error("Final selection requires quiescent owning-Pi boundary");
    if (run.material && ['dispatch', 'collect', 'evaluate', 'decide', 'resumeAttempt'].includes(name)) return this.material.invoke(name, command, name==='resumeAttempt'?{attemptId:args.attemptId,newAttemptId:args.newAttemptId,mode:args.mode,summary:args.summary}:args.payload, context);
    if (name === "control") {
      const receipt = this.store.control(command, this.owner.generation, args.action, args.instruction);
      if (run.material && args.action === "cancel") {
        const settled = await this.material.cancel(run.id);
        this.store.settle(run.id, this.owner.generation, settled ? "cancelled" : "cleanup_pending", "material-cancelled", settled ? null : "Ambiguous native writer retained", `cancel-material-${command.commandId}`); return receipt;
      }
      if (run.spec.config.execution === "evaluate" && args.action === "cancel") {
        await this.evaluator?.cancel(run.id);
        const unresolved = this.store.evaluations(run.id).some(e => e.invocations.some(i => ["launching", "attached"].includes(i.state) && !i.native));
        this.store.settle(run.id, this.owner.generation, unresolved ? "cleanup_pending" : "cancelled", unresolved ? "evaluation-cleanup-pending" : "evaluation-cancelled", unresolved ? "Unobservable evaluator handle retained" : null, `cancel-eval-${command.commandId}`);
        return receipt;
      }
      if (args.action === "cancel" && receipt.status === "queued") {
        const binding = this.owner.inspect(run.id);
        if (binding) await this.owner.cancel(run.id, context);
        if (this.store.get(run.id)!.state === "interrupted") {
          const uncertain = binding?.state === "cleanup_pending" || binding?.state === "interrupted";
          this.store.settle(run.id, this.owner.generation, uncertain ? "cleanup_pending" : "cancelled", binding ? "native-work-already-settled" : "no-native-work", uncertain ? "Native cleanup remains unresolved" : null, `cancel-${digest(command.commandId).slice(0, 32)}`);
        }
      }
      // Reopening/config inspection is frozen and never reloads changed defaults.
      // Material/research recovery uses the exact native/artifact reconciliation path above.
      return receipt;
    }
    if (name === "evaluate" && run.spec.config.execution === "evaluate") {
      const duplicate = this.store.receipt(command, "evaluate", args.payload); if (duplicate) return duplicate;
      this.store.check(run, command);
      if (!this.evaluator || args.payload.attemptId !== "exact-material") throw new Error("PR4 evaluates only the frozen exact-material pair; candidate workspace freezing is PR5");
      const e = await this.evaluator.evaluate(run.id, args.payload.evaluationId, context.signal, args.payload.purpose ?? "candidate");
      return this.store.evaluationReceipt(command, this.owner.generation, "evaluate", args.payload, e.state === "completed" ? "applied" : "blocked", e.error);
    }
    if (name === "dispatch") return this.owner.dispatchResearch(command, args.payload);
    if (["propose", "collect", "evaluate", "distill", "decide"].includes(name)) return this.store.research(name as ResearchAction, command, args.payload, this.owner.generation);
    if (name === "review") {
      const duplicate = this.store.receipt(command, "review", { decisionId: args.decisionId }); if (duplicate) return duplicate;
      this.store.check(run, command);
      if (run.pendingDecisionId !== args.decisionId) throw new Error("No matching pending review");
      if (!context.extensionContext.hasUI) throw new Error("Actual owning-Pi user dialog unavailable; no automatic or supplied approval");
      const key = `${run.id}/${command.commandId}`, hash = digest(args), existing = this.#reviews.get(key);
      if (existing) { if (existing.hash !== hash) throw new Error("Conflicting duplicate review"); return existing.pending; }
      const pending = (async () => {
        const response = await context.extensionContext.ui.select(`Arbor research choice ${args.decisionId} on ${run.spec.source.materialId}, epoch ${run.epoch}, revision ${run.revision}. ${run.material ? "This reviews only the listed exact candidate evaluation; a later keep still checks current-incumbent eligibility." : "This is NOT a measured keep."} This is not source apply or Fabric permission.`, ["Approve research choice", "Reject research choice"], { timeout: 60000, ...(context.signal ? { signal: context.signal } : {}) });
        context.signal?.throwIfAborted();
        if (this.#draining) throw new Error("Review generation retired before response");
        if (response !== "Approve research choice" && response !== "Reject research choice") throw new Error("Review dismissed/timed out; approval remains pending");
        const respondingOwner = await this.owner.identity(context);
        return this.store.review(command, this.owner.generation, args.decisionId, response, respondingOwner);
      })();
      this.#reviews.set(key, { hash, pending });
      try { return await pending; } finally { this.#reviews.delete(key); }
    }
    if (name === "export") return this.#export(command);
    throw new Error(`Unimplemented routing error ${name}`);
  }
  async #reconcilePendingReview(command:BoundCommand,context:FabricInvocationContext,identity:NativeOwner,operation?:{action:'control'|'evaluate';payload:unknown}):Promise<Receipt|undefined> {
    const run=this.store.get(command.runId)!;this.store.check(run,command);
    // Renew only the pending binding, never enter evaluator/actor dispatch.
    if(!run.material||run.active||run.material.pending||this.owner.busyResearch(run.id)||this.store.evaluations(run.id).some(e=>e.state!=='completed'))throw new Error('Pending review recovery requires settled native/material/evaluation boundaries');
    await this.material.workspace(run.id).verify(run.material.capture);
    const observed=await this.owner.observeRecovery(run.id,context);
    context.signal?.throwIfAborted();if(this.#draining)throw new Error('Review recovery generation retired');
    if(observed.length)throw new Error('Pending review recovery cannot reconcile unsettled attempts');
    return this.store.rebindPendingReview(command,identity,this.owner.componentId,this.owner.generation,operation);
  }
  async #source(name:'apply'|'undoApply',command:BoundCommand,decisionId:string,context:FabricInvocationContext):Promise<Receipt> {
    const key=command.runId+'/'+command.commandId,hash=digest({name,command,decisionId}),existing=this.#sources.get(key);
    if(existing){if(existing.hash!==hash)throw new Error('Conflicting duplicate source operation');return existing.pending;}
    const pending=this.#sourceOnce(name,command,decisionId,context);this.#sources.set(key,{hash,pending});
    try{return await pending;}finally{this.#sources.delete(key);}
  }
  async #sourceOnce(name: 'apply'|'undoApply', command: BoundCommand, decisionId: string, context: FabricInvocationContext): Promise<Receipt> {
    const duplicate=this.store.receipt(command,name,{decisionId});if(duplicate)return duplicate;
    const run=this.store.get(command.runId)!;this.store.check(run,command);
    if(!run.material)return this.store.unavailable(command,this.owner.generation,name,{decisionId},'Source apply requires owned measured material; no source write attempted');
    if(run.active||run.material.pending||run.pendingDecisionId||this.owner.busyResearch(run.id)||this.#researchRuns.has(run.id)||['running','cleanup_pending','interrupted'].includes(run.state))throw new Error('Source apply requires a quiescent exact owner with settled review/integration/writers');
    const source=new SourceApply(this.material.workspace(run.id));
    const decision=(this.store.projection(run.id)!.decisions as Array<Record<string,any>>).find(d=>d.decisionId===decisionId);
    const applied=source.read(decisionId);
    const recovery=name==='apply'&&applied?.intent.kind==='apply'?applied:undefined;
    const terminal=['cancelled','completed','failed'].includes(run.state);
    if(terminal&&applied?.intent.kind!=='apply')throw new Error('Terminal source reconciliation requires an original apply intent; no new source apply');
    const keep=recovery?(this.store.projection(run.id)!.decisions as Array<Record<string,any>>).find(d=>d.decisionId===recovery.intent.binding.decisionId):decision;
    if(name==='apply' && (keep?.status!=='measured-keep'||keep.materialId!==command.materialId||keep.epoch!==command.epoch||this.store.evaluation(run.id,keep.evidenceIds[0])?.snapshots.candidate.oid!==(recovery?.intent.target??run.material.incumbent)))throw new Error('Apply requires exact current measured-keep decision, not a review flag');
    if(name==='apply'&&!recovery){
      const e=this.store.evaluation(run.id,keep!.evidenceIds[0])!,records=this.store.evaluations(run.id);
      const reason=promotionGate({...run,material:{...run.material,incumbent:e.snapshots.baseline.oid}},e,run.material.incumbent,records);
      if(reason!=='eligible')throw new Error('Source apply validation veto: '+reason);
      for(const record of [e,...records.filter(r=>r.developmentId===e.id)]){await verifyMaterial(record.snapshots.baseline);await verifyMaterial(record.snapshots.candidate);}
      this.store.check(this.store.get(run.id)!,command);
    }
    if((name==='undoApply'||recovery) && (!applied||applied.intent.captureId!==command.materialId||canonical(applied.intent.binding.owner)!==canonical(run.owner)||applied.intent.binding.specId!==run.spec.identity||applied.intent.binding.epoch!==run.epoch||applied.intent.binding.runId!==run.id||applied.intent.binding.response!=='Apply exact source delta'))throw new Error('Source recovery/undo requires exact owning-Pi source operation provenance');
    if(terminal){
      // Source-only reconciliation observes saved boundaries, never rebinds research or launches native work.
      await this.owner.verifyRoles(run.id,true);
      await source.workspace.verify(run.material.capture);
      if((await this.owner.observeRecovery(run.id,context)).length)throw new Error('Terminal source reconciliation cannot settle unfinished native attempts');
      this.store.check(this.store.authorizeSource(run.id,await this.owner.identity(context),this.owner.componentId,this.owner.generation),command);
      if(this.#draining)throw new Error('Source generation retired');
    }
    if(!context.extensionContext.hasUI)throw new Error('Actual owning-Pi source dialog unavailable; no supplied approval');
    const choice=name==='apply'?'Apply exact source delta':'Undo exact source delta';
    const selected=(recovery??(name==='undoApply'?applied:undefined))?.intent.target??run.material.incumbent;
    const response=await context.extensionContext.ui.select(`Arbor ${recovery?'reconcile original apply (postimage adoption only)':name}: ${run.material.capture.root}, material ${command.materialId}, epoch ${command.epoch}, revision ${command.revision}, selected ${selected}, decision ${decisionId}. Preserve unrelated edits; any affected-path conflict blocks. Research review is not Fabric permission.`,[choice,'Cancel source change'],{timeout:60000,...(context.signal?{signal:context.signal}:{})});
    if(response!==choice)throw new Error('Source dialog dismissed/timed out; no approval or source write');
    const owner=await this.owner.identity(context);this.store.check(this.store.authorizeSource(run.id,owner,this.owner.componentId,this.owner.generation),command);
    if(this.#draining)throw new Error('Source generation retired');
    const binding={...command,specId:run.spec.identity,owner,generation:this.owner.generation,decisionId,response};
    if(recovery){await source.workspace.verify(run.material.capture);await source.workspace.checkScope(run.material.capture,recovery.intent.target);}
    const journal=recovery??(name==='apply'?await source.prepare(run.material.capture,run.material.incumbent,command.commandId,binding):await source.prepareUndo(run.material.capture,decisionId,command.commandId,binding));
    context.signal?.throwIfAborted();if(this.#draining)throw new Error('Source generation retired before writes');this.store.check(this.store.authorizeSource(run.id,owner,this.owner.componentId,this.owner.generation),command);
    const result=recovery?source.adopt(run.material.capture,journal,binding):source.execute(run.material.capture,journal);
    return this.store.sourceReceipt(command,this.owner.generation,name,decisionId,source.path(journal.intent.operationId),digest(result),result.state==='applied'?null:result.error??'Source conflict; patch retained',owner,this.owner.componentId);
  }
  async #start(args: Record<string, any>, context: FabricInvocationContext, identity: NativeOwner): Promise<unknown> {
    const hash = digest({ cwd: context.cwd, args });
    const existing = this.#starts.get(args.runId);
    if (existing) { if (existing.hash !== hash) throw new Error("Conflicting duplicate start"); const saved = this.store.get(args.runId); if (saved) this.store.authorize(args.runId, identity, this.owner.generation); return existing.pending; }
    const saved = this.store.get(args.runId);
    if (saved) { this.store.authorize(args.runId, identity, this.owner.generation); if (saved.requestHash !== hash) throw new Error("Duplicate start binding changed"); return this.store.projection(args.runId); }
    const pending = (async () => {
      const [profile, project] = await Promise.all([configFile(join(this.profileDirectory, "arbor.defaults.json")), configFile(join(context.cwd, "arbor.config.json"))]);
      const model = context.extensionContext.model;
      const spec = await resolveSpec(context.cwd, profile, project, object(args.overrides ?? {}), model ? `${model.provider}/${model.id}` : undefined);
      if (["evaluate", "material", "research"].includes(spec.config.execution)) {
        if (!this.evaluator) throw new Error("Packaged evaluator unavailable");
        for (const key of [spec.evaluation!,spec.validation?.heldOut,spec.validation?.final].flatMap(d=>d?.kind === "agent-suite" ? [d.subject.model,d.judge?.model].filter(Boolean) : [])) if (!context.extensionContext.modelRegistry.getAvailable().some(m => `${m.provider}/${m.id}` === key)) throw new Error(`Unavailable exact evaluation model ${key}`);
        if (object(await this.owner.call("schema.status", {})).mode === "enforce") throw new Error("Native evaluation unavailable in Schema enforce; policy unchanged");
      }
      if (['inspect','research'].includes(spec.config.execution)) for (const role of ["coordinator", "executor"] as const) if (!context.extensionContext.modelRegistry.getAvailable().some(model => `${model.provider}/${model.id}` === spec.roles[role].model)) throw new Error(`Unavailable exact ${role} model`);
      const fromMaterial = relative(spec.source.root, await canonicalDestination(resolve(this.stateDirectory)));
      if (!fromMaterial || (fromMaterial !== ".." && !fromMaterial.startsWith(`..${sep}`) && !isAbsolute(fromMaterial))) throw new Error("Arbor state must live outside mutable material");
      context.signal?.throwIfAborted(); if (this.#draining) throw new Error("Generation retired during spec resolution");
      if (["inspect", "material", "research"].includes(spec.config.execution)) {
        const bundles = new RoleBundle(join(this.stateDirectory, "runs", args.runId, "roles"));
        spec.roleBundle = await bundles.freeze(spec.config.limits.artifactBytes, spec.source.root);
        for (const role of ["coordinator", "executor"] as const) spec.roles[role].instructionsId = (await bundles.load(spec.roleBundle, role, [])).instructionsId;
        const { identity: _identity, ...body } = spec; spec.identity = digest(body);
      }
      let material: MaterialState | undefined;
      if (['material','research'].includes(spec.config.execution)) {
        if (!spec.roles.executor.model || !context.extensionContext.modelRegistry.getAvailable().some(m => `${m.provider}/${m.id}` === spec.roles.executor.model)) throw new Error("Select available exact material worker model");
        const workspace = this.material.workspace(args.runId), capture = await workspace.capture(spec.config.material);
        context.signal?.throwIfAborted(); if (this.#draining) throw new Error("Capture interrupted; owned artifacts retained");
        spec.source = { root: capture.root, oid: capture.originalOid, materialId: capture.id, capture: "owned-snapshot" };
        spec.evaluation!.baseline = workspace.reference(capture, capture.baseline); spec.evaluation!.candidate = workspace.reference(capture, capture.baseline);
        for (const d of [spec.validation?.heldOut, spec.validation?.final]) if (d) { d.baseline = workspace.reference(capture,capture.baseline); d.candidate = workspace.reference(capture,capture.baseline); }
        spec.config.evaluator.identity = digest(spec.evaluation);
        const { identity: _identity, ...body } = spec; spec.identity = digest(body);
        material = { capture, incumbent: capture.baseline, baselineEvaluation: null, candidates: [], pending: null };
      }
      this.store.create({ ...(material ? { material } : {}), id: args.runId, spec, requestHash: hash, owner: identity, componentId: this.owner.componentId, generation: this.owner.generation, epoch: "epoch-1", revision: 0, state: "ready", attemptsUsed: 0, active: 0, createdAt: Date.now(), activeMs: 0, activeSince: spec.config.execution === "inspect" || (spec.config.execution === "evaluate" && spec.evaluation!.kind !== "command") ? Date.now() : null, steering: [], pendingDecisionId: null, execution: "not-started", error: null });
      // Direct command effects require the execute-risk evaluate action. The Pi
      // start command composes start -> evaluate through normal Fabric policy.
      if (spec.config.execution === "evaluate" && spec.evaluation!.kind !== "command") await this.evaluator!.evaluate(args.runId, "evaluation-initial", context.signal);
      if (material && spec.config.execution !== 'research' && spec.evaluation!.kind !== "command") await this.material.invoke("evaluate", this.store.binding(this.store.get(args.runId)!, "initial-material-evaluation"), { attemptId: "baseline", evaluationId: "evaluation-initial" }, context);
      if (spec.config.execution === "inspect") {
        if (!spec.source.oid) { this.store.settle(args.runId, this.owner.generation, "paused", "blocked", "Non-Git native capture unavailable until PR5; resolved specification retained"); }
        else {
          try { await this.owner.start({ runId: args.runId, materialId: spec.source.materialId, cwd: spec.source.root, oid: spec.source.oid, policyId: spec.identity, objective: spec.config.objective.description, model: spec.roles.coordinator.model, maxWaves: 2, concurrency: spec.config.search.concurrency }, context, true); }
          catch (error) {
            const current = this.store.get(args.runId)!;
            if (["ready", "running"].includes(current.state)) this.store.settle(args.runId, this.owner.generation, "failed", "native-admission-blocked", String(error));
            throw error;
          }
        }
      }
      return this.store.projection(args.runId);
    })();
    this.#starts.set(args.runId, { hash, pending });
    try { return await pending; } catch (error) { this.#starts.delete(args.runId); throw error; }
  }
  async #runResearch(args: Record<string,any>, context: FabricInvocationContext, identity: NativeOwner): Promise<unknown> {
    const run=this.store.get(args.runId);if(!run?.material || run.spec.config.execution!=='research')throw new Error('Select explicit research execution');
    if(canonical(run.owner)!==canonical(identity))throw new Error('Different native owning Pi root/host/identity');
    if(this.#researchRuns.has(run.id))throw new Error('Research boundary occupied');
    this.store.check(run,args as BoundCommand);
    if(!this.evaluator)throw new Error('Evaluator unavailable');
    this.#researchRuns.add(run.id);
    try{
      await this.owner.verifyRoles(run.id,true);
      if(args.resume){
        if(this.owner.busyResearch(run.id))throw new Error('Research resume requires quiescent owner');
        if(run.pendingDecisionId){
          await this.#reconcilePendingReview(args as BoundCommand,context,identity);
          return this.store.projection(run.id);
        }
        let resumeCommand=args as BoundCommand;
        if(run.active||run.material.pending||['interrupted','cleanup_pending','running'].includes(run.state)){resumeCommand=await this.material.reconcile(args as BoundCommand,context);}
        else if(run.state!=='paused')throw new Error('Research resume requires quiescent paused owner; terminal work is retained');
        await this.evaluator.resume(resumeCommand,identity,context.signal);
      }else{this.store.authorize(run.id,identity,this.owner.generation);if(run.execution!=='not-started'||!['ready','running'].includes(run.state))throw new Error('Research requires explicit resume, not replay');}
      const current=this.store.get(run.id)!;
      const projection=this.store.projection(run.id)!;
      const {reason}=await nativeAdmission(this.store,run.id);
      const admission=reason ?? (!current.material!.baselineEvaluation && researchFacts(projection).evaluatorCalls+evaluationCapacity(projection)>current.spec.config.limits.evaluatorCalls?'evaluator-budget':null);
      if(admission){this.store.settle(run.id,this.owner.generation,'paused',`research-stop:${admission}`,null,`admission-${current.revision}`);return this.store.projection(run.id);}
      if(!current.material!.baselineEvaluation)await this.material.invoke('evaluate',this.store.binding(current,'research-baseline'),{attemptId:'baseline',evaluationId:'evaluation-initial'},context);
      const measured=this.store.get(run.id)!;
      if(['interrupted','cleanup_pending'].includes(measured.state))return this.store.projection(run.id);
      if(!measured.material!.baselineEvaluation){this.store.settle(run.id,this.owner.generation,'paused','research-stop:invalid-baseline',null,`baseline-block-${measured.revision}`);return this.store.projection(run.id);}
      if(!['ready','running'].includes(measured.state))return this.store.projection(run.id);
      await this.owner.runResearch(run.id,this.material,context);
      return this.store.projection(run.id);
    }finally{this.#researchRuns.delete(run.id);}
  }
  async #export(command: BoundCommand): Promise<Receipt> {
    const duplicate = this.store.receipt(command, "export", { format: "json" }); if (duplicate) return duplicate;
    const run = this.store.get(command.runId)!; this.store.check(run, command);
    const projection = this.store.projection(command.runId)!;
    const text = canonical(run.material ? { ...projection, materialDelta: await this.material.export(run.id) } : projection) + "\n";
    if (Buffer.byteLength(text) > run.spec.config.limits.artifactBytes) throw new Error("Export artifact budget exceeded");
    const path = join(this.stateDirectory, "runs", run.id, "exports", `${command.commandId}.json`);
    await mkdir(dirname(path), { recursive: true });
    try { await writeFile(path, text, { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(path, "utf8") !== text) throw error; }
    if (this.#draining) throw new Error("Export interrupted during retirement; artifact retained, no stale commit");
    return this.store.exported(command, this.owner.generation, path, digest(text));
  }
  dispose(): Promise<void> {
    this.#draining = true; this.material.draining = true;
    this.#disposed ??= (async () => {
      let failure: unknown;
      try { await this.evaluator?.dispose(); await this.owner.dispose(); } catch (error) { failure = error; }
      // Even failed native/storage settlement cannot close supporting resources
      // while a retained facade/review/export invocation can still use them.
      while (this.#pending.size) await Promise.allSettled([...this.#pending]);
      if (failure) throw failure;
    })();
    return this.#disposed;
  }
  async close(): Promise<void> { try { await this.dispose(); } finally { try { await this.owner.close(); } finally { this.store.close(); } } }
}
