import type { FabricActionDescriptor, FabricInvocationContext, FabricProvider, FabricProviderListRequest } from "pi-fabric";
import { ArborApplication } from "../application/ArborApplication.js";
import { ArborError } from "../domain/errors.js";
import type { ArborCommandV1, ArborQueryV1 } from "../domain/types.js";
import { assertJsonSchema } from "../schemas/validate.js";
import { createActionDescriptors } from "./descriptors.js";
import { FABRIC_PROVIDER_POLICY_TRAVERSAL_CAPABILITY_V1 } from "../application/provider-capability.js";

const COMMAND_KIND: Readonly<Record<string, ArborCommandV1["kind"]>> = Object.freeze({
  "arbor.start": "start",
  "arbor.claimDriver": "claimDriver",
  "arbor.heartbeat": "heartbeat",
  "arbor.signal": "signal",
  "arbor.cancel": "cancel",
  "arbor.advance": "advance",
  "arbor.reserveAgentDispatch": "reserveAgentDispatch",
  "arbor.attachAgentChild": "attachAgentChild",
  "arbor.submitAgentObservation": "submitAgentObservation",
  "arbor.interruptEffect": "interruptEffect",
  "arbor.reconcileEffect": "reconcileEffect",
  "arbor.resumeEffect": "resumeEffect",
  "arbor.observeEffectCancellation": "observeEffectCancellation",
  "arbor.materializeWorkspace": "materializeWorkspace",
  "arbor.finalizeCandidate": "finalizeCandidate",
  "arbor.evaluate": "evaluate",
  "arbor.buildPromotionCandidate": "buildPromotionCandidate",
  "arbor.planPromotionCommit": "planPromotionCommit",
  "arbor.applyWinnerRef": "applyWinnerRef",
  "arbor.observeWinnerRef": "observeWinnerRef",
  "arbor.planRollback": "planRollback",
  "arbor.applyRollbackRef": "applyRollbackRef",
  "arbor.observeRollbackRef": "observeRollbackRef",
  "arbor.planReport": "planReport",
  "arbor.publishReport": "publishReport",
  "arbor.observeReport": "observeReport",
  "arbor.planCleanup": "planCleanup",
  "arbor.executeCleanup": "executeCleanup",
  "arbor.observeCleanup": "observeCleanup",
});

export function createArborProvider(application: ArborApplication): FabricProvider {
  const descriptors = createActionDescriptors(application.schemas).map((descriptor) => ({ ...descriptor, name: descriptor.name.replace(/^arbor\./u, "") }));
  const byName = new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]));
  const admittedContexts = new Map<string, { parentToolCallId: string; driverId: string; fence: number }>();
  return {
    name: "arbor",
    description: "Deterministic, journaled Arbor research orchestration. External work remains certificate-gated.",
    async list(request: FabricProviderListRequest): Promise<FabricActionDescriptor[]> {
      const query = request.query?.toLowerCase();
      return descriptors.filter((descriptor) => (!request.namespace || request.namespace === "arbor") && (!query || `${descriptor.name} ${descriptor.description}`.toLowerCase().includes(query))).slice(0, request.limit ?? 200);
    },
    async describe(actionName: string): Promise<FabricActionDescriptor | undefined> {
      return byName.get(actionName);
    },
    async invoke(actionName: string, args: Record<string, unknown>, invocation: FabricInvocationContext): Promise<unknown> {
      const qualifiedActionName = `arbor.${actionName}`;
      const schema = application.schemas.actionInputs[qualifiedActionName];
      if (!schema || !byName.has(actionName)) throw new ArborError("VALIDATION_FAILED", "Unknown Arbor action", { actionName: qualifiedActionName });
      assertJsonSchema(schema, args, qualifiedActionName);
      if (actionName === "inspect") {
        const input = args as { version: 1; runId: string; view: ArborQueryV1["kind"]; limit?: number };
        return application.query({ version: 1, kind: input.view, runId: input.runId, ...(input.limit ? { limit: input.limit } : {}) }, {});
      }
      const kind = COMMAND_KIND[qualifiedActionName];
      if (!kind) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Action is not admitted by this foundation build");
      const input = args as { metadata: { runId: string }; driverId?: string };
      const command = { ...args, kind } as ArborCommandV1;
      if (actionName === "start") return application.execute(command, { fence: 0, now: new Date().toISOString() });
      if (actionName === "claimDriver") {
        const current = await application.privateDriverContext(input.metadata.runId);
        const receipt = await application.execute(command, { ...current, now: new Date().toISOString() });
        const admitted = await application.privateDriverContext(input.metadata.runId);
        if (!input.driverId || admitted.driverId !== input.driverId) throw new ArborError("LEASE_CONFLICT", "Driver admission did not bind the workflow");
        admittedContexts.set(input.metadata.runId, { parentToolCallId: invocation.parentToolCallId, driverId: input.driverId, fence: admitted.fence });
        return receipt;
      }
      const admitted = admittedContexts.get(input.metadata.runId);
      if (!admitted || admitted.parentToolCallId !== invocation.parentToolCallId) throw new ArborError("STALE_FENCE", "Invocation is not the workflow admitted for this fence");
      const commandContext = { driverId: admitted.driverId, fence: admitted.fence, now: new Date().toISOString() };
      if (actionName === "applyWinnerRef" || actionName === "applyRollbackRef") return application.executeWithFabricPolicyTraversal(command, commandContext, { parentToolCallId: invocation.parentToolCallId, nestedToolCallId: invocation.nestedToolCallId }, FABRIC_PROVIDER_POLICY_TRAVERSAL_CAPABILITY_V1);
      return application.execute(command, commandContext);
    },
    async close(): Promise<void> {},
  };
}

export function createCertificationBlockedProvider(catalog: { descriptors: readonly FabricActionDescriptor[]; reason?: string } = { descriptors: [] }): FabricProvider {
  const descriptors = catalog.descriptors.map((descriptor) => ({ ...descriptor, name: descriptor.name.replace(/^arbor\./u, "") }));
  const reason = "reason" in catalog ? catalog.reason : "B0/B1 certification is required before host invocation";
  return {
    name: "arbor",
    description: "Arbor provider blocked pending upstream and compatibility certification.",
    async list(): Promise<FabricActionDescriptor[]> { return [...descriptors]; },
    async describe(actionName: string): Promise<FabricActionDescriptor | undefined> { return descriptors.find((entry) => entry.name === actionName); },
    async invoke(): Promise<never> { throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", reason); },
    async close(): Promise<void> {},
  };
}
