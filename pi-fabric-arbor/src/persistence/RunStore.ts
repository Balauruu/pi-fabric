import type {
  ArborDirectiveV1,
  CommandContextV1,
  CommandMetadataV1,
  CommandReceiptV1,
  DomainEventV1,
  EventPageV1,
  OutboxObservationV1,
  OutboxRecordV1,
  RunAggregateV1,
} from "../domain/types.js";

export interface StoredMutationV1 {
  version: 1;
  kind: string;
  metadata: CommandMetadataV1;
  input: unknown;
}

export interface MutationDecisionV1 {
  aggregate: RunAggregateV1;
  eventTypes: string[];
  directive?: ArborDirectiveV1;
}

export type MutationDecider = (current: RunAggregateV1 | undefined) => MutationDecisionV1;

export interface RunStore {
  readonly readOnly: boolean;
  lookupReceipt(mutation: StoredMutationV1, context: CommandContextV1): Promise<CommandReceiptV1 | undefined>;
  commit(mutation: StoredMutationV1, context: CommandContextV1, commandId: string, decide: MutationDecider): Promise<CommandReceiptV1>;
  load(runId: string): Promise<RunAggregateV1 | undefined>;
  list(limit: number): Promise<RunAggregateV1[]>;
  readEvents(runId: string, afterSequence: number, limit: number): Promise<EventPageV1>;
  readEventCompactionFloor(runId: string): Promise<number>;
  readOutbox(runId: string | undefined, limit: number): Promise<OutboxRecordV1[]>;
  commitOutboxObservation(observation: OutboxObservationV1, context: CommandContextV1): Promise<OutboxRecordV1>;
  verify(): Promise<void>;
  close(): Promise<void>;
}

export interface CommandRecordV1 {
  version: 1;
  commandId: string;
  runId: string;
  idempotencyKey: string;
  inputDigest: string;
  inputJson: string;
  receipt: CommandReceiptV1;
}

export function replayEvents(events: readonly DomainEventV1[]): RunAggregateV1 | undefined {
  let aggregate: RunAggregateV1 | undefined;
  let expectedSequence = 1;
  let expectedRevision = 1;
  for (const event of events) {
    if (event.sequence !== expectedSequence) throw new Error(`Event sequence gap at ${expectedSequence}`);
    if (event.revision < expectedRevision || event.revision > expectedRevision) throw new Error(`Unexpected revision ${event.revision}`);
    aggregate = structuredClone(event.aggregate);
    expectedSequence += 1;
    const next = events[expectedSequence - 1];
    if (!next || next.revision !== event.revision) expectedRevision += 1;
  }
  return aggregate;
}
