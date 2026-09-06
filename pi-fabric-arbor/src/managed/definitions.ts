import { randomUUID } from "node:crypto";
import { isAbsolute, join } from "node:path";
import type { FabricComponentDefinition, FabricComponentInfo } from "pi-fabric/protocol";
import { BindingStore } from "./BindingStore.js";
import { ARBOR_ACTIONS, ARBOR_OWNER_REFS, closed, text, type OwnerRef } from "./contracts.js";
import { OwnerExecution } from "./OwnerExecution.js";
import { ResearchStore } from "../research/ResearchStore.js";
import { ResearchService } from "../research/ResearchService.js";

export interface ArborComponentConfig { stateDirectory: string }
export type DiagnosticReader = () => FabricComponentInfo | undefined;
/** A read-only lifecycle handle is not an operational prepared-provider pointer.
 * The parent stays active when exact owner requirements leave its child waiting.
 */
export function createArborComponent(observe: (read: DiagnosticReader) => void = () => {}): FabricComponentDefinition {
  return {
    name: "arbor", description: "Passive Arbor configuration and owner diagnostics", guarantee: "managed", requires: [], provides: [],
    activate(context, rawConfig) {
      const config = closed(rawConfig, ["stateDirectory"]);
      const stateDirectory = text(config.stateDirectory, "stateDirectory", 4096);
      if (!isAbsolute(stateDirectory)) throw new Error("Arbor stateDirectory must be absolute; use /arbor setup");
      const child = context.use(createArborOwnerComponent(), { id: "owner", config: { stateDirectory } });
      observe(() => child.status());
      context.defer(() => observe(() => undefined), "clear owner diagnostics");
    },
  };
}
export function createArborOwnerComponent(): FabricComponentDefinition<ArborComponentConfig> {
  return {
    name: "arbor.owner", description: "Managed native owner execution adapter", guarantee: "managed",
    requires: ARBOR_OWNER_REFS, provides: ["arbor"],
    activate(context, config) {
      const generation = randomUUID();
      const store = new BindingStore(join(config.stateDirectory, "execution-bindings.sqlite3"));
      const research = new ResearchStore(join(config.stateDirectory, "research.sqlite3"));
      const owner = new OwnerExecution((ref, args) => {
        if (!ARBOR_OWNER_REFS.includes(ref as OwnerRef)) throw new Error(`Undeclared Arbor ref: ${ref}`);
        return context.call(ref, args);
      }, store, context.id, generation, research);
      const service = new ResearchService(owner, research, config.stateDirectory);
      // Abort marks draining synchronously; the disposer awaits all owned calls.
      // No lifecycle call, actor readiness wait, Fabric operation or research is
      // performed in activation. The provider is callable only after commit.
      const onAbort = () => { void service.dispose().catch(() => undefined); };
      context.signal.addEventListener("abort", onAbort, { once: true });
      context.provide({
        name: "arbor", description: "Transactional owning-Pi research facts and native read-only observations; evaluators unavailable until PR4",
        async list() { return structuredClone(ARBOR_ACTIONS); },
        async describe(name) { return structuredClone(ARBOR_ACTIONS.find(action => action.name === name)); },
        async invoke(name, args, invocation) {
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
      context.defer(() => service.dispose(), "settle generation-owned execution");
      // Supporting storage belongs to provider.close, not this inverse. Retained
      // views may continue inspection after retirement and before provider close.
    },
  };
}
