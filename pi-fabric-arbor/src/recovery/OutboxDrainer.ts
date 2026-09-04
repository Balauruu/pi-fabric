import { ArborError } from "../domain/errors.js";
import type { CommandContextV1, OutboxObservationV1, OutboxRecordV1 } from "../domain/types.js";
import type { ActivityProjector, ActivityProjectionObservationV1 } from "../adapters/interfaces.js";
import type { RunStore } from "../persistence/RunStore.js";

/** Admitted runtime helper. Detached monitoring never receives this object. */
export class OutboxDrainer {
  constructor(readonly store: RunStore, readonly projector: ActivityProjector) {}

  async drainOne(context: CommandContextV1, runId?: string): Promise<OutboxRecordV1 | undefined> {
    const record = (await this.store.readOutbox(runId, 1))[0];
    if (!record) return undefined;
    let observation: ActivityProjectionObservationV1;
    try { observation = await this.projector.observe(record); }
    catch { observation = { version: 1, classification: "UNCERTAIN", observerDigest: record.eventDigest }; }

    if (observation.classification === "ABSENT") {
      try { observation = await this.projector.publish(record); }
      catch { observation = { version: 1, classification: "UNCERTAIN", observerDigest: record.eventDigest }; }
    }
    if (observation.classification === "ABSENT") throw new ArborError("EVIDENCE_INVALID", "Projector returned ABSENT after publication without an accepted outcome");
    const durable: OutboxObservationV1 = {
      version: 1, runId: record.runId, sequence: record.sequence, expectedRevision: record.revision,
      dispatchKey: record.dispatchKey, classification: observation.classification,
      observerDigest: observation.observerDigest,
      ...(observation.outcomeDigest ? { outcomeDigest: observation.outcomeDigest } : {}),
    };
    return this.store.commitOutboxObservation(durable, context);
  }

  async drain(context: CommandContextV1, options: { runId?: string; limit?: number } = {}): Promise<OutboxRecordV1[]> {
    const limit = options.limit ?? 200;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new ArborError("VALIDATION_FAILED", "Outbox drain limit must be 1-200");
    const records: OutboxRecordV1[] = [];
    for (let index = 0; index < limit; index += 1) {
      const record = await this.drainOne(context, options.runId);
      if (!record) break;
      records.push(record);
      if (record.state === "OBSERVING" || record.state === "INDETERMINATE") break;
    }
    return records;
  }
}
