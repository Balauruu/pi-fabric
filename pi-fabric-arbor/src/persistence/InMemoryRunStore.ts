import { ArborError } from "../domain/errors.js";
import type { CommandContextV1, CommandReceiptV1, DomainEventV1, EventPageV1, OutboxObservationV1, OutboxRecordV1, RunAggregateV1 } from "../domain/types.js";
import { canonicalJson, digestCanonical, immutableClone, sha256 } from "../util/canonical.js";
import type { CommandRecordV1, MutationDecider, RunStore, StoredMutationV1 } from "./RunStore.js";
import { replayEvents } from "./RunStore.js";

interface MemoryRun {
  aggregate: RunAggregateV1;
  commands: Map<string, CommandRecordV1>;
  events: DomainEventV1[];
  outbox: OutboxRecordV1[];
}

export class InMemoryRunStore implements RunStore {
  readonly readOnly = false;
  #runs = new Map<string, MemoryRun>();
  #eventFloors = new Map<string, number>();
  #tail: Promise<void> = Promise.resolve();

  async #locked<T>(operation: () => T | Promise<T>): Promise<T> {
    const previous = this.#tail;
    let release!: () => void;
    this.#tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async lookupReceipt(mutation: StoredMutationV1, _context: CommandContextV1): Promise<CommandReceiptV1 | undefined> {
    return this.#locked(() => {
      const duplicate = this.#runs.get(mutation.metadata.runId)?.commands.get(mutation.metadata.idempotencyKey);
      if (!duplicate) return undefined;
      const identity = { kind: mutation.kind, runId: mutation.metadata.runId, input: mutation.input };
      const inputJson = canonicalJson(identity);
      const inputDigest = digestCanonical(identity);
      if (duplicate.inputDigest !== inputDigest || duplicate.inputJson !== inputJson) throw new ArborError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with different input");
      return immutableClone({ ...duplicate.receipt, duplicate: true });
    });
  }

  async commit(mutation: StoredMutationV1, context: CommandContextV1, commandId: string, decide: MutationDecider): Promise<CommandReceiptV1> {
    return this.#locked(() => {
      const run = this.#runs.get(mutation.metadata.runId);
      const identity = { kind: mutation.kind, runId: mutation.metadata.runId, input: mutation.input };
      const inputJson = canonicalJson(identity);
      const inputDigest = digestCanonical(identity);
      const duplicate = run?.commands.get(mutation.metadata.idempotencyKey);
      if (duplicate) {
        if (duplicate.inputDigest !== inputDigest || duplicate.inputJson !== inputJson) throw new ArborError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with different input");
        return immutableClone({ ...duplicate.receipt, duplicate: true });
      }
      const current = run?.aggregate;
      if ((current?.revision ?? 0) !== mutation.metadata.expectedRevision) throw new ArborError("STALE_REVISION", "Expected revision does not match", { expected: mutation.metadata.expectedRevision, actual: current?.revision ?? 0 });
      const currentFence = current?.driver?.fence ?? 0;
      if (context.fence !== currentFence) throw new ArborError("STALE_FENCE", "Controller fence does not match", { expected: currentFence, actual: context.fence });

      const decision = decide(current === undefined ? undefined : immutableClone(current));
      if (decision.eventTypes.length < 1) throw new ArborError("VALIDATION_FAILED", "A mutation must append at least one event");
      const revision = (current?.revision ?? 0) + 1;
      const startSequence = current?.sequence ?? 0;
      const aggregate = immutableClone({
        ...decision.aggregate,
        revision,
        sequence: startSequence + decision.eventTypes.length,
        updatedAt: context.now,
      });
      const events = decision.eventTypes.map((type, index): DomainEventV1 => immutableClone({
        version: 1,
        runId: mutation.metadata.runId,
        sequence: startSequence + index + 1,
        revision,
        type,
        at: context.now,
        aggregate,
      }));
      const receipt: CommandReceiptV1 = immutableClone({
        version: 1,
        commandId,
        runId: mutation.metadata.runId,
        revision,
        sequence: aggregate.sequence,
        duplicate: false,
        eventTypes: [...decision.eventTypes],
        ...(decision.directive ? { directive: decision.directive } : {}),
      });
      const record: CommandRecordV1 = immutableClone({
        version: 1,
        commandId,
        runId: mutation.metadata.runId,
        idempotencyKey: mutation.metadata.idempotencyKey,
        inputDigest,
        inputJson,
        receipt,
      });
      const outbox = events.map((event): OutboxRecordV1 => immutableClone({
        version: 1, runId: event.runId, sequence: event.sequence, revision: event.revision,
        eventDigest: digestCanonical(event), dispatchKey: `outbox_${sha256(`${event.runId}:${event.sequence}`).slice(0, 32)}`,
        state: "PENDING", body: event, attemptCount: 0,
      }));
      if (run) {
        run.aggregate = aggregate;
        run.events.push(...events);
        run.outbox.push(...outbox);
        run.commands.set(mutation.metadata.idempotencyKey, record);
      } else {
        this.#runs.set(mutation.metadata.runId, { aggregate, events: [...events], outbox, commands: new Map([[mutation.metadata.idempotencyKey, record]]) });
      }
      return receipt;
    });
  }

  async load(runId: string): Promise<RunAggregateV1 | undefined> {
    return this.#locked(() => {
      const run = this.#runs.get(runId);
      return run ? immutableClone(run.aggregate) : undefined;
    });
  }

  async list(limit: number): Promise<RunAggregateV1[]> {
    return this.#locked(() => [...this.#runs.values()].sort((left, right) => left.aggregate.runId.localeCompare(right.aggregate.runId)).slice(0, limit).map((run) => immutableClone(run.aggregate)));
  }

  async readEvents(runId: string, afterSequence: number, limit: number): Promise<EventPageV1> {
    return this.#locked(() => {
      const events = this.#runs.get(runId)?.events.filter((event) => event.sequence > afterSequence) ?? [];
      const page = events.slice(0, limit).map(immutableClone);
      return immutableClone({
        version: 1,
        runId,
        afterSequence,
        events: page,
        nextSequence: page.at(-1)?.sequence ?? afterSequence,
        hasMore: events.length > page.length,
      });
    });
  }

  async readEventCompactionFloor(runId: string): Promise<number> { return this.#eventFloors.get(runId) ?? 0; }

  setEventCompactionFloor(runId: string, floor: number): void {
    if (!Number.isSafeInteger(floor) || floor < 0) throw new ArborError("VALIDATION_FAILED", "Invalid event compaction floor");
    this.#eventFloors.set(runId, floor);
  }

  async readOutbox(runId: string | undefined, limit: number): Promise<OutboxRecordV1[]> {
    return this.#locked(() => [...this.#runs.values()]
      .flatMap((run) => run.outbox)
      .filter((record) => (!runId || record.runId === runId) && record.state !== "PUBLISHED" && record.state !== "INDETERMINATE")
      .sort((left, right) => left.runId.localeCompare(right.runId) || left.sequence - right.sequence)
      .slice(0, limit)
      .map(immutableClone));
  }

  async commitOutboxObservation(observation: OutboxObservationV1, context: CommandContextV1): Promise<OutboxRecordV1> {
    return this.#locked(() => {
      const run = this.#runs.get(observation.runId);
      const record = run?.outbox.find((entry) => entry.sequence === observation.sequence);
      if (!run || !record) throw new ArborError("UNKNOWN_ENTITY", "Unknown outbox record");
      if (run.aggregate.revision < observation.expectedRevision || record.revision !== observation.expectedRevision) throw new ArborError("STALE_REVISION", "Outbox event revision mismatch");
      if (!run.aggregate.driver || run.aggregate.driver.driverId !== context.driverId || run.aggregate.driver.fence !== context.fence) throw new ArborError("STALE_FENCE", "Outbox callback fence is stale");
      if (record.dispatchKey !== observation.dispatchKey) throw new ArborError("EVIDENCE_INVALID", "Outbox dispatch identity mismatch");
      if (record.state === "PUBLISHED") {
        if (record.acceptedOutcomeDigest !== observation.outcomeDigest) throw new ArborError("DUPLICATE_ENTITY", "Outbox already has a different accepted outcome");
        return immutableClone(record);
      }
      if (observation.classification === "COMPLETED" && !observation.outcomeDigest) throw new ArborError("EVIDENCE_INVALID", "Completed outbox observation requires an outcome digest");
      const updated: OutboxRecordV1 = immutableClone({
        ...record, attemptCount: record.attemptCount + 1, observerDigest: observation.observerDigest,
        state: observation.classification === "COMPLETED" ? "PUBLISHED" : observation.classification === "UNCERTAIN" ? "INDETERMINATE" : observation.classification === "ACTIVE" ? "OBSERVING" : "PENDING",
        ...(observation.outcomeDigest ? { acceptedOutcomeDigest: observation.outcomeDigest } : {}),
      });
      run.outbox[run.outbox.indexOf(record)] = updated;
      return immutableClone(updated);
    });
  }

  async verify(): Promise<void> {
    await this.#locked(() => {
      for (const run of this.#runs.values()) {
        const replayed = replayEvents(run.events);
        if (!replayed || digestCanonical(replayed) !== digestCanonical(run.aggregate)) throw new ArborError("STORE_CORRUPT", "In-memory reducer replay differs from aggregate");
      }
    });
  }

  async close(): Promise<void> {}
}
