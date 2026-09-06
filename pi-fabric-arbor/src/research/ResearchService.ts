import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { OwnerExecution } from "../managed/OwnerExecution.js";
import { object, type NativeOwner } from "../managed/contracts.js";
import { RESEARCH_ACTIONS, canonical, digest, validate, type BoundCommand, type ResearchAction, type Schema } from "./contracts.js";
import { configFile, resolveSpec } from "./spec.js";
import { ResearchStore, type Receipt } from "./ResearchStore.js";

async function canonicalDestination(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; const parent = dirname(path); if (parent === path) throw error; return join(await canonicalDestination(parent), basename(path)); }
}

export class ResearchService {
  #starts = new Map<string, { hash: string; pending: Promise<unknown> }>();
  #reviews = new Map<string, { hash: string; pending: Promise<unknown> }>();
  #draining = false;
  #disposed: Promise<void> | undefined;
  #pending = new Set<Promise<unknown>>();
  constructor(readonly owner: OwnerExecution, readonly store: ResearchStore, readonly stateDirectory: string, readonly profileDirectory = getAgentDir()) {}
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
    if (name === "start") return this.#start(args, context, identity);
    const run = this.store.authorize(args.runId, identity, this.owner.generation);
    const command: BoundCommand = { runId: args.runId, materialId: args.materialId, epoch: args.epoch, revision: args.revision, commandId: args.commandId };
    if (name === "control") {
      const receipt = this.store.control(command, this.owner.generation, args.action, args.instruction);
      if (args.action === "cancel" && receipt.status === "queued") {
        const binding = this.owner.inspect(run.id);
        if (binding) await this.owner.cancel(run.id, context);
        if (this.store.get(run.id)!.state === "interrupted") {
          const uncertain = binding?.state === "cleanup_pending" || binding?.state === "interrupted";
          this.store.settle(run.id, this.owner.generation, uncertain ? "cleanup_pending" : "cancelled", binding ? "native-work-already-settled" : "no-native-work", uncertain ? "Native cleanup remains unresolved" : null, `cancel-${digest(command.commandId).slice(0, 32)}`);
        }
      }
      // Reopening/config inspection is frozen and never reloads changed defaults.
      // Native stopped-actor/partial-material resume remains explicitly PR8.
      return receipt;
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
        const response = await context.extensionContext.ui.select(`Arbor research choice ${args.decisionId} on ${run.spec.source.materialId}, epoch ${run.epoch}, revision ${run.revision}. This is NOT a measured keep, source apply or Fabric permission.`, ["Approve research choice", "Reject research choice"], { timeout: 60000, ...(context.signal ? { signal: context.signal } : {}) });
        context.signal?.throwIfAborted();
        if (this.#draining) throw new Error("Review generation retired before response");
        if (response !== "Approve research choice" && response !== "Reject research choice") throw new Error("Review dismissed/timed out; approval remains pending");
        const respondingOwner = await this.owner.identity(context);
        return this.store.review(command, this.owner.generation, args.decisionId, response, respondingOwner);
      })();
      this.#reviews.set(key, { hash, pending });
      try { return await pending; } finally { this.#reviews.delete(key); }
    }
    if (name === "apply" || name === "undoApply") return this.store.unavailable(command, this.owner.generation, name, { decisionId: args.decisionId }, "Source-preimage/workspace/apply reconciliation unavailable until PR5/PR8; no source write attempted");
    if (name === "export") return this.#export(command);
    throw new Error(`Unimplemented routing error ${name}`);
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
      if (spec.config.execution === "inspect") for (const role of ["coordinator", "executor"] as const) if (!context.extensionContext.modelRegistry.getAvailable().some(model => `${model.provider}/${model.id}` === spec.roles[role].model)) throw new Error(`Unavailable exact ${role} model`);
      const fromMaterial = relative(spec.source.root, await canonicalDestination(resolve(this.stateDirectory)));
      if (!fromMaterial || (fromMaterial !== ".." && !fromMaterial.startsWith(`..${sep}`) && !isAbsolute(fromMaterial))) throw new Error("Arbor state must live outside mutable material");
      context.signal?.throwIfAborted(); if (this.#draining) throw new Error("Generation retired during spec resolution");
      this.store.create({ id: args.runId, spec, requestHash: hash, owner: identity, componentId: this.owner.componentId, generation: this.owner.generation, epoch: "epoch-1", revision: 0, state: "ready", attemptsUsed: 0, active: 0, createdAt: Date.now(), activeMs: 0, activeSince: spec.config.execution === "inspect" ? Date.now() : null, steering: [], pendingDecisionId: null, execution: "not-started", error: null });
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
  async #export(command: BoundCommand): Promise<Receipt> {
    const duplicate = this.store.receipt(command, "export", { format: "json" }); if (duplicate) return duplicate;
    const run = this.store.get(command.runId)!; this.store.check(run, command);
    const text = canonical(this.store.projection(command.runId)) + "\n";
    if (Buffer.byteLength(text) > run.spec.config.limits.artifactBytes) throw new Error("Export artifact budget exceeded");
    const path = join(this.stateDirectory, "runs", run.id, "exports", `${command.commandId}.json`);
    await mkdir(dirname(path), { recursive: true });
    try { await writeFile(path, text, { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(path, "utf8") !== text) throw error; }
    if (this.#draining) throw new Error("Export interrupted during retirement; artifact retained, no stale commit");
    return this.store.exported(command, this.owner.generation, path, digest(text));
  }
  dispose(): Promise<void> {
    this.#draining = true;
    this.#disposed ??= (async () => {
      let failure: unknown;
      try { await this.owner.dispose(); } catch (error) { failure = error; }
      // Even failed native/storage settlement cannot close supporting resources
      // while a retained facade/review/export invocation can still use them.
      while (this.#pending.size) await Promise.allSettled([...this.#pending]);
      if (failure) throw failure;
    })();
    return this.#disposed;
  }
  async close(): Promise<void> { try { await this.dispose(); } finally { try { await this.owner.close(); } finally { this.store.close(); } } }
}
