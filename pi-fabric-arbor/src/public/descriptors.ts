import type { FabricActionDescriptor, FabricEffectKind, FabricRisk } from "pi-fabric";
import type { ArborSchemaCatalogV1 } from "../schemas/catalog.js";

interface DescriptorPolicy {
  risk: FabricRisk;
  effect: FabricEffectKind;
  description: string;
}

const POLICIES: Readonly<Record<string, DescriptorPolicy>> = Object.freeze({
  "arbor.start": { risk: "write", effect: "transactional", description: "Validate and persist an immutable research contract only." },
  "arbor.inspect": { risk: "read", effect: "none", description: "Read a bounded redacted Arbor projection." },
  "arbor.claimDriver": { risk: "write", effect: "transactional", description: "Acquire a bounded driver lease and monotonic fence." },
  "arbor.heartbeat": { risk: "write", effect: "transactional", description: "Extend the admitted driver lease." },
  "arbor.signal": { risk: "write", effect: "transactional", description: "Persist a bounded pause, resume, gate, pin, prune, or retry signal." },
  "arbor.cancel": { risk: "write", effect: "transactional", description: "Persist cancellation intent without executing cancellation." },
  "arbor.advance": { risk: "write", effect: "transactional", description: "Perform one deterministic reducer step and issue a typed directive." },
  "arbor.reserveAgentDispatch": { risk: "write", effect: "transactional", description: "Atomically reserve an attempt, resource class, token/cost budget, cleanup debt, and dispatch intent." },
  "arbor.attachAgentChild": { risk: "write", effect: "transactional", description: "Attach a verified Fabric child correlation." },
  "arbor.submitAgentObservation": { risk: "write", effect: "transactional", description: "Validate and store a bounded child observation." },
  "arbor.interruptEffect": { risk: "write", effect: "transactional", description: "Legally interrupt an unsettled effect and enter reconciliation." },
  "arbor.reconcileEffect": { risk: "write", effect: "transactional", description: "Commit one typed four-way observation without replaying an effect." },
  "arbor.resumeEffect": { risk: "write", effect: "transactional", description: "Explicitly resume monitoring of a verified active effect." },
  "arbor.observeEffectCancellation": { risk: "write", effect: "transactional", description: "Commit descendant-aware cancellation confirmation or uncertainty." },
  "arbor.materializeWorkspace": { risk: "execute", effect: "emission", description: "Materialize an intended package-owned workspace through an admitted adapter." },
  "arbor.finalizeCandidate": { risk: "execute", effect: "emission", description: "Validate and finalize an immutable candidate." },
  "arbor.evaluate": { risk: "execute", effect: "emission", description: "Run the resource-bounded canonical evaluator against one exact OID through the sealed evaluator boundary." },
  "arbor.buildPromotionCandidate": { risk: "execute", effect: "emission", description: "Build a detached promotion candidate without checkout mutation." },
  "arbor.planPromotionCommit": { risk: "write", effect: "transactional", description: "Freeze promotion and authorization bindings." },
  "arbor.applyWinnerRef": { risk: "write", effect: "emission", description: "Apply a package winner-ref CAS after authorization and policy." },
  "arbor.observeWinnerRef": { risk: "write", effect: "transactional", description: "Reconcile an intended winner-ref operation." },
  "arbor.planRollback": { risk: "write", effect: "transactional", description: "Freeze journaled predecessor and rollback authorization." },
  "arbor.applyRollbackRef": { risk: "write", effect: "emission", description: "Apply a package winner-ref rollback CAS." },
  "arbor.observeRollbackRef": { risk: "write", effect: "transactional", description: "Reconcile an intended rollback." },
  "arbor.planReport": { risk: "write", effect: "transactional", description: "Freeze a report generation and complete dependency list." },
  "arbor.publishReport": { risk: "write", effect: "emission", description: "Atomically publish one intended report generation." },
  "arbor.observeReport": { risk: "write", effect: "transactional", description: "Verify and commit an observable report generation." },
  "arbor.planCleanup": { risk: "write", effect: "transactional", description: "Select eligible package-owned resources for cleanup." },
  "arbor.executeCleanup": { risk: "write", effect: "emission", description: "Execute manifest-driven package-owned cleanup." },
  "arbor.observeCleanup": { risk: "write", effect: "transactional", description: "Reconcile cleanup observations and debt." },
});

export function createActionDescriptors(catalog: ArborSchemaCatalogV1): readonly FabricActionDescriptor[] {
  return Object.freeze(Object.entries(POLICIES).map(([name, policy]) => Object.freeze({
    name,
    namespace: "arbor",
    description: policy.description,
    inputSchema: catalog.actionInputs[name] as Record<string, unknown>,
    outputSchema: catalog.actionOutputs[name] as Record<string, unknown>,
    risk: policy.risk,
    effect: {
      kind: policy.effect,
      ...(policy.effect === "emission" ? { ordering: "ordered" as const, resources: [`arbor:${name.slice("arbor.".length)}`] } : {}),
    },
    annotations: {
      readOnlyHint: policy.risk === "read",
      idempotentHint: true,
      destructiveHint: name.includes("Cleanup") || name.includes("Rollback") || name === "arbor.applyWinnerRef",
      openWorldHint: policy.effect === "emission",
    },
  })));
}

export const ACTION_DESCRIPTOR_POLICY_V1 = POLICIES;
