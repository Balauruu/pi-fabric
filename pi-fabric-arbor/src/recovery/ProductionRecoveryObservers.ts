import { ArborError } from "../domain/errors.js";
import type { DescendantUnitIdentityV1, EffectBoundaryKind, EffectObservationV1 } from "../domain/types.js";
import type { EffectRecoveryObserver, EffectRecoveryRequestV1 } from "../adapters/interfaces.js";
import { classifyDispatchCrashGap, type CertifiedPublicAgentsInvokerV1, type FabricChildRecordV1 } from "../driver/AdmittedDriver.js";
import { digestCanonical } from "../util/canonical.js";

export type RecoveryObservationMaterialV1 = Omit<EffectObservationV1, "version" | "observationId" | "effectId" | "targetFence" | "observedFence" | "expectedRevision" | "identityDigest" | "observedAt">;

/** Read-only production seam for workspace, evaluator, Git, report, and cleanup observers. */
export class ReadOnlyEffectRecoveryObserver implements EffectRecoveryObserver {
  constructor(readonly boundary: EffectBoundaryKind, readonly inspect: (request: EffectRecoveryRequestV1) => Promise<RecoveryObservationMaterialV1>) {}
  async observe(request: EffectRecoveryRequestV1): Promise<RecoveryObservationMaterialV1> {
    if (request.effect.identity.boundary !== this.boundary) throw new ArborError("EVIDENCE_INVALID", "Recovery observer boundary mismatch");
    return this.inspect(request);
  }
}

export interface FabricChildRecoveryResolverV1 {
  resolve(request: EffectRecoveryRequestV1): Promise<{
    requestDigest: string;
    workflowCorrelationId: string;
    workspace: string;
    containedUnitActive: boolean | "unknown";
    graceEndsAt: string;
    processUnit?: DescendantUnitIdentityV1;
  }>;
  terminal(record: FabricChildRecordV1): Promise<{
    resultDigest: string;
    changedPaths: string[];
    boundedOutput?: string;
    partial?: boolean;
  }>;
}

/** Bridges certified Fabric correlation lookup into the application's four-way durable observation. */
export class FabricChildEffectRecoveryObserver implements EffectRecoveryObserver {
  readonly boundary = "child" as const;
  constructor(readonly invoker: CertifiedPublicAgentsInvokerV1, readonly resolver: FabricChildRecoveryResolverV1) {}

  async observe(request: EffectRecoveryRequestV1): Promise<RecoveryObservationMaterialV1> {
    const dispatch = request.run.dispatchIntents.find((entry) => entry.effectId === request.effect.effectId);
    if (!dispatch) throw new ArborError("UNKNOWN_ENTITY", "Child recovery has no package-issued dispatch identity");
    const resolved = await this.resolver.resolve(request);
    const classified = await classifyDispatchCrashGap({
      dispatch, requestDigest: resolved.requestDigest, workflowCorrelationId: resolved.workflowCorrelationId,
      workspace: resolved.workspace, invoker: this.invoker, containedUnitActive: resolved.containedUnitActive,
      now: request.observedAt, graceEndsAt: resolved.graceEndsAt,
    });
    const observationIdentity = { classified, requestDigest: resolved.requestDigest, workflowCorrelationId: resolved.workflowCorrelationId };
    if (classified.classification !== "COMPLETED") return { classification: classified.classification, observerDigest: digestCanonical(observationIdentity), ...(resolved.processUnit ? { processUnit: resolved.processUnit } : {}), reasons: classified.reasons };
    if (!classified.record) throw new ArborError("EVIDENCE_INVALID", "Completed child classification has no terminal record");
    const terminal = await this.resolver.terminal(classified.record);
    if (classified.record.resultDigest && classified.record.resultDigest !== terminal.resultDigest) throw new ArborError("EVIDENCE_INVALID", "Terminal child outcome digest does not match the correlated Fabric record");
    const observerDigest = digestCanonical({ ...observationIdentity, terminal });
    const terminalStatus = classified.record.status === "completed" ? "completed" : classified.record.status === "stopped" || classified.record.status === "timed_out" ? "cancelled" : "failed";
    return {
      classification: "COMPLETED", observerDigest, outcomeDigest: terminal.resultDigest, terminalStatus,
      changedPaths: terminal.changedPaths, rawResultDigest: terminal.resultDigest, ...(resolved.processUnit ? { processUnit: resolved.processUnit } : {}),
      ...(terminal.boundedOutput ? { boundedOutput: terminal.boundedOutput } : {}), ...(terminal.partial ? { partial: true } : {}),
      reasons: classified.reasons,
    };
  }
}
