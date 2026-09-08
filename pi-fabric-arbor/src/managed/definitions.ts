import { randomUUID } from "node:crypto";
import { isAbsolute, join } from "node:path";
import type { FabricActionDescriptor, FabricInvocationContext, FabricComponentDefinition, FabricComponentInfo, FabricComponentHandle } from "pi-fabric/protocol";
import { BindingStore } from "./BindingStore.js";
import { ARBOR_ACTIONS, ARBOR_OWNER_REFS, closed, text, type OwnerRef } from "./contracts.js";
import { OwnerExecution } from "./OwnerExecution.js";
import { OwnerLifetime, createOwnerDrainComponent, OWNER_LIFETIME_PROVIDER } from "./OwnerLifetime.js";
import { ResearchStore } from "../research/ResearchStore.js";
import { ResearchService } from "../research/ResearchService.js";
import { EvaluationEngine } from "../evaluators/EvaluationEngine.js";
import { EvaluatorCatalog, type CatalogEntry } from "../evaluators/catalog.js";

import {SourceCatalog,type SourceCatalogEntry} from "../research/SourceCatalog.js";

export interface ArborComponentConfig { stateDirectory: string }
export type EvaluatorDescriptorReader = (ref: string, invocation: FabricInvocationContext) => Promise<FabricActionDescriptor | undefined>;
export type DiagnosticReader = () => FabricComponentInfo | undefined;
/** A read-only lifecycle handle is not an operational prepared-provider pointer.
 * The parent stays active when exact owner requirements leave its child waiting.
 */
export function createArborComponent(observe: (read: DiagnosticReader, stateDirectory?:string) => void = () => {}, catalog: readonly CatalogEntry[] = [], describe?: EvaluatorDescriptorReader, sources: readonly SourceCatalogEntry[] = []): FabricComponentDefinition {
  return {
    name: "arbor", description: "Passive Arbor configuration and owner diagnostics", guarantee: "managed", requires: [], provides: [],
    activate(context, rawConfig) {
      const config = closed(rawConfig, ["stateDirectory"]);
      const stateDirectory = text(config.stateDirectory, "stateDirectory", 4096);
      if (!isAbsolute(stateDirectory)) throw new Error("Arbor stateDirectory must be absolute; use /arbor setup");
      let drain: FabricComponentHandle | undefined;
      const child = context.use(createArborOwnerComponent(catalog, describe, sources, () => drain?.status().state === 'active'), { id: "owner", config: { stateDirectory } });
      drain = context.use(createOwnerDrainComponent(), { id: "drain" });
      observe(() => child.status(),stateDirectory);
      context.defer(() => observe(() => undefined), "clear owner diagnostics");
    },
  };
}
export function createArborOwnerComponent(catalog: readonly CatalogEntry[] = [], describe?: EvaluatorDescriptorReader, sources: readonly SourceCatalogEntry[] = [], drainReady: () => boolean = () => false): FabricComponentDefinition<ArborComponentConfig> {
  return {
    name: "arbor.owner", description: "Managed native owner execution adapter", guarantee: "managed",
    requires: [...ARBOR_OWNER_REFS, ...[...new Set([...catalog.map(entry=>entry.ref),...sources.flatMap(entry=>[entry.search.ref,entry.fetch.ref])])].map(ref=>({ref,optional:true}))], provides: ["arbor", OWNER_LIFETIME_PROVIDER],
    activate(context, config) {
      const generation = randomUUID();
      const store = new BindingStore(join(config.stateDirectory, "execution-bindings.sqlite3"));
      const research = new ResearchStore(join(config.stateDirectory, "research.sqlite3"));
      const owner = new OwnerExecution((ref, args) => {
        if (!ARBOR_OWNER_REFS.includes(ref as OwnerRef)) throw new Error(`Undeclared Arbor ref: ${ref}`);
        return context.call(ref, args);
      }, store, context.id, generation, research);
      const evaluators = new EvaluatorCatalog(catalog, context.view, (ref, args) => {
        if (!catalog.some(entry => entry.ref === ref)) throw new Error("Evaluator ref outside finite configured catalog");
        return context.call(ref, args);
      }, describe ? ref => describe(ref, context.invocation) : undefined);
      const engine = new EvaluationEngine(owner, research, config.stateDirectory, evaluators);
      const sourceCatalog=new SourceCatalog(sources,context.view,(ref,args)=>{if(!sources.some(e=>e.search.ref===ref||e.fetch.ref===ref))throw new Error("Source ref outside finite configured catalog");return context.call(ref,args);},describe?ref=>describe(ref,context.invocation):undefined);
      const service = new ResearchService(owner, research, config.stateDirectory, undefined, engine, sourceCatalog);
      const lifetime = new OwnerLifetime(() => service.dispose(), drainReady);
      let storageProvided = false;
      const onAbort = () => { void lifetime.dispose().catch(() => undefined); };
      // Register ownership before writer setup or either staged provision can
      // fail. Once mounted, only arbor.close may close retained-view storage.
      context.defer(async () => {
        try { await lifetime.dispose(); }
        finally { if (!storageProvided) { context.signal.removeEventListener("abort", onAbort); await service.close(); } }
      }, "settle generation-owned execution");
      context.signal.addEventListener("abort", onAbort, { once: true });
      research.prepareOwner(); // Owner-only journal setup, never a presentation read.
      // The sibling lease drains first on application reload. Native call and
      // signal semantics stay untouched; abort is still an idempotent fallback.
      context.provide({
        name: "arbor", description: "Transactional owning-Pi research facts, bounded native research, exact evaluation, validation-gated owned incumbent and separately approved source apply/undo",
        async list() { return structuredClone(ARBOR_ACTIONS); },
        async describe(name) { return structuredClone(ARBOR_ACTIONS.find(action => action.name === name)); },
        async invoke(name, args, invocation) {
          if (ARBOR_ACTIONS.find(action => action.name === name)?.risk !== "read") lifetime.assertReady();
          // Explicit PR2 diagnostic lane preserves the verified lifecycle gate,
          // never a legacy v1 reader or a product research fallback.
          if (name === "substrateStart") {
            if (research.get(String(args.runId))) throw new Error("Research run cannot be rebound as a substrate diagnostic");
            return owner.start(args, invocation);
          }
          if (name === "substrateInspect" || name === "substrateCancel") {
            const query = closed(args, ["runId"]), runId = text(query.runId, "runId");
            if (research.get(runId)) throw new Error("Use the checked research control route for research runs");
            return name === "substrateInspect" ? owner.inspect(runId) ?? null : owner.cancel(runId, invocation);
          }
          return service.invoke(name, args, invocation);
        },
        async close() {
          context.signal.removeEventListener("abort", onAbort);
          await service.close();
        },
      });
      storageProvided = true;
      context.provide(lifetime);
      // Supporting storage belongs to provider.close, not this inverse. Retained
      // views may continue inspection after retirement and before provider close.
    },
  };
}
