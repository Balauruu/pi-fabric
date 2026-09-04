import { ArborError } from "../domain/errors.js";
import type { CommandContextV1, EffectObservationV1 } from "../domain/types.js";
import type { DescendantCancellationAdapter, EffectRecoveryObserver } from "../adapters/interfaces.js";
import type { ArborApplicationV1 } from "../application/ArborApplication.js";
import type { RunStore } from "../persistence/RunStore.js";
import { digestCanonical } from "../util/canonical.js";
import type { Clock, IdFactory } from "../util/clock.js";

export interface ReconcileEffectRequestV1 {
  version: 1;
  runId: string;
  effectId: string;
  expectedRevision: number;
  idempotencyPrefix: string;
  context: CommandContextV1;
  interruptReason?: string;
}

function key(prefix: string, suffix: string): string {
  return `${prefix}_${suffix}`.slice(0, 128).padEnd(16, "_");
}

/**
 * Recovery inspects a previously journaled identity and submits typed observations.
 * It has no operation adapter and therefore cannot replay an effect.
 */
export class EffectRecoveryCoordinator {
  readonly #observers: ReadonlyMap<string, EffectRecoveryObserver>;

  constructor(
    readonly application: Pick<ArborApplicationV1, "execute">,
    readonly store: RunStore,
    observers: readonly EffectRecoveryObserver[],
    readonly cancellation: DescendantCancellationAdapter,
    readonly clock: Clock,
    readonly ids: IdFactory,
  ) {
    const byBoundary = new Map(observers.map((observer) => [observer.boundary, observer]));
    if (byBoundary.size !== observers.length) throw new ArborError("DUPLICATE_ENTITY", "Only one recovery observer may own a boundary");
    this.#observers = byBoundary;
  }

  async reconcile(request: ReconcileEffectRequestV1): Promise<{ revision: number; observation: EffectObservationV1 }> {
    let run = await this.store.load(request.runId);
    if (!run) throw new ArborError("RUN_NOT_FOUND", "Run not found");
    if (run.revision !== request.expectedRevision) throw new ArborError("STALE_REVISION", "Recovery expected revision is stale");
    let revision = request.expectedRevision;
    let effect = run.effects.find((entry) => entry.effectId === request.effectId);
    if (!effect) throw new ArborError("UNKNOWN_ENTITY", "Unknown effect");

    if (request.interruptReason) {
      const interrupted = await this.application.execute({
        version: 1, kind: "interruptEffect",
        metadata: { runId: request.runId, expectedRevision: revision, idempotencyKey: key(request.idempotencyPrefix, "interrupt") },
        effectId: request.effectId, reason: request.interruptReason,
      }, request.context);
      revision = interrupted.revision;
      run = (await this.store.load(request.runId))!;
      effect = run.effects.find((entry) => entry.effectId === request.effectId)!;
    }

    const observer = this.#observers.get(effect.identity.boundary);
    if (!observer) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", `No admitted ${effect.identity.boundary} recovery observer`);
    const observationId = this.ids.next("observation");
    const observedAt = this.clock.now();
    const raw = await observer.observe({
      version: 1, run, effect, observedFence: request.context.fence,
      expectedRevision: revision, observationId, observedAt,
    });
    const observation: EffectObservationV1 = {
      version: 1, observationId, effectId: effect.effectId,
      targetFence: effect.identity.fence, observedFence: request.context.fence,
      expectedRevision: revision, identityDigest: digestCanonical(effect.identity), observedAt,
      ...raw,
    };
    const receipt = await this.application.execute({
      version: 1, kind: "reconcileEffect",
      metadata: { runId: request.runId, expectedRevision: revision, idempotencyKey: key(request.idempotencyPrefix, "observe") },
      observation,
    }, request.context);
    return { revision: receipt.revision, observation };
  }

  async cancelDescendants(input: { version: 1; runId: string; effectId: string; expectedRevision: number; idempotencyKey: string; context: CommandContextV1; signal?: AbortSignal }): Promise<number> {
    const run = await this.store.load(input.runId);
    if (!run) throw new ArborError("RUN_NOT_FOUND", "Run not found");
    if (run.revision !== input.expectedRevision) throw new ArborError("STALE_REVISION", "Cancellation expected revision is stale");
    const effect = run.effects.find((entry) => entry.effectId === input.effectId);
    if (!effect || effect.state !== "CANCEL_REQUESTED") throw new ArborError("ILLEGAL_TRANSITION", "Effect is not awaiting cancellation");
    if (!effect.processUnit?.descendantOwned || !["cgroup", "container", "processGroup"].includes(effect.processUnit.kind)) {
      const receipt = await this.application.execute({
        version: 1, kind: "observeEffectCancellation",
        metadata: { runId: input.runId, expectedRevision: input.expectedRevision, idempotencyKey: input.idempotencyKey },
        effectId: input.effectId, outcome: "uncertain", observerDigest: digestCanonical({ reason: "no verified descendant-owning unit", effectId: effect.effectId }),
      }, input.context);
      return receipt.revision;
    }
    let cancellationResult: Awaited<ReturnType<DescendantCancellationAdapter["cancel"]>>;
    try { cancellationResult = await this.cancellation.cancel(effect.processUnit, input.signal); }
    catch (error) { cancellationResult = { version: 1, classification: "UNCERTAIN", observerDigest: digestCanonical({ effectId: effect.effectId, error: error instanceof Error ? error.name : "unknown" }) }; }
    let confirmation: Awaited<ReturnType<DescendantCancellationAdapter["observe"]>> = cancellationResult;
    if (cancellationResult.classification === "COMPLETED") {
      try { confirmation = await this.cancellation.observe(effect.processUnit); }
      catch (error) { confirmation = { version: 1, classification: "UNCERTAIN", observerDigest: digestCanonical({ effectId: effect.effectId, stage: "post-cancel observation", error: error instanceof Error ? error.name : "unknown" }) }; }
    }
    const confirmed = cancellationResult.classification === "COMPLETED" && ["COMPLETED", "ABSENT"].includes(confirmation.classification);
    const receipt = await this.application.execute({
      version: 1, kind: "observeEffectCancellation",
      metadata: { runId: input.runId, expectedRevision: input.expectedRevision, idempotencyKey: input.idempotencyKey },
      effectId: input.effectId, outcome: confirmed ? "confirmed" : "uncertain", observerDigest: digestCanonical({ cancellation: cancellationResult.observerDigest, confirmation: confirmation.observerDigest }),
      ...(confirmation.fingerprint ?? cancellationResult.fingerprint ? { fingerprint: confirmation.fingerprint ?? cancellationResult.fingerprint } : {}),
    }, input.context);
    return receipt.revision;
  }
}
