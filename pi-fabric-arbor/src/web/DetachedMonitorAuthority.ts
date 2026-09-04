import { ArborError } from "../domain/errors.js";
import type { ArborQueryV1, ArborViewV1, EventPageV1, IntentReceiptV1, WebIntentV1, WebSessionV1 } from "../domain/types.js";
import type { ArborApplicationV1 } from "../application/ArborApplication.js";
import type { ArtifactPageV1, ArtifactReadCapabilityV1, ArtifactReadGrantRequestV1, ArtifactReadRequestV1, ArtifactReceiptV1 } from "../persistence/ArtifactStore.js";
import type { RunStore } from "../persistence/RunStore.js";
import { redactValue } from "./redaction.js";

const ID = /^[a-z][a-z0-9_]{2,63}$/u;

export interface DetachedRunSummaryV1 {
  version: 1;
  runId: string;
  revision: number;
  cursor: number;
  state: string;
  phase: string;
  outcome: string;
  nextAction: string;
  trust: "fixture-or-uncertified" | "certificate-bound";
  driverStatus: "No active Fabric driver" | "Active Fabric driver";
}

export interface DetachedAttemptDetailV1 {
  version: 1;
  kind: "attemptDetail";
  runId: string;
  attemptId: string;
  revision: number;
  cursor: number;
  data: Readonly<Record<string, unknown>>;
}

export type DetachedStreamBatchV1 =
  | { version: 1; kind: "reset"; runId: string; floor: number; cursor: number; reason: "compacted" | "gap" | "cursorAhead"; projection: ArborViewV1 }
  | { version: 1; kind: "events"; runId: string; floor: number; cursor: number; page: EventPageV1; projection: ArborViewV1 };

export interface DetachedArtifactReaderV1 {
  describe(artifactId: string): Promise<ArtifactReceiptV1>;
  issueReadCapability(request: ArtifactReadGrantRequestV1): Promise<ArtifactReadCapabilityV1>;
  readPage(request: ArtifactReadRequestV1): Promise<ArtifactPageV1>;
}

/** Deliberately omits execute, lease, adapter, cleanup, outbox-drain, authorization, evaluator, shell, and Git capabilities. */
export interface DetachedMonitorAuthorityV1 {
  listRuns(limit: number): Promise<DetachedRunSummaryV1[]>;
  query(query: ArborQueryV1): Promise<ArborViewV1>;
  queryAttempt(runId: string, attemptId: string): Promise<DetachedAttemptDetailV1>;
  readStreamBatch(runId: string, cursor: number, limit: number): Promise<DetachedStreamBatchV1>;
  readArtifact(artifactId: string, offset: number, limit: number, binding: { principalId: string; runId: string; effectId: string }): Promise<ArtifactPageV1>;
  submitIntent(intent: WebIntentV1, session: WebSessionV1): Promise<IntentReceiptV1>;
}

function nextAction(state: string, phase: string): string {
  if (state === "PAUSED") return "Request resume";
  if (state === "WAITING_INPUT") return "Answer the open gate";
  if (state === "AWAITING_PROMOTION") return "Inspect evidence and request promotion";
  if (state === "ROLLBACK_REQUESTED") return "Complete independent rollback authorization";
  if (["COMPLETED", "ROLLED_BACK", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED"].includes(state)) return "Publish or inspect report and cleanup debt";
  return `Admitted driver advances ${phase}`;
}

export class DetachedMonitorAuthority implements DetachedMonitorAuthorityV1 {
  constructor(
    readonly application: Pick<ArborApplicationV1, "query" | "readEvents" | "submitIntent">,
    readonly store: Pick<RunStore, "list" | "load">,
    readonly eventFloor: (runId: string) => number | Promise<number> = () => 0,
    readonly now: () => string = () => new Date().toISOString(),
    readonly artifacts?: DetachedArtifactReaderV1,
  ) {}

  async listRuns(limit: number): Promise<DetachedRunSummaryV1[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new ArborError("VALIDATION_FAILED", "Run limit must be 1-200");
    const runs = await this.store.list(limit);
    const now = Date.parse(this.now());
    return runs.map((run) => ({
      version: 1, runId: run.runId, revision: run.revision, cursor: run.sequence, state: run.state, phase: run.phase,
      outcome: run.outcome ?? "pending", nextAction: nextAction(run.state, run.phase),
      trust: run.certificates.length > 0 && run.certificates.every((entry) => entry.valid && entry.trust === "certified") ? "certificate-bound" : "fixture-or-uncertified",
      driverStatus: run.driver && Date.parse(run.driver.expiresAt) > now ? "Active Fabric driver" : "No active Fabric driver",
    }));
  }

  query(query: ArborQueryV1): Promise<ArborViewV1> {
    return this.application.query(query, {});
  }

  async queryAttempt(runId: string, attemptId: string): Promise<DetachedAttemptDetailV1> {
    if (!ID.test(runId) || !ID.test(attemptId)) throw new ArborError("VALIDATION_FAILED", "Invalid attempt detail identifier");
    const run = await this.store.load(runId);
    if (!run) throw new ArborError("RUN_NOT_FOUND", "Run not found");
    const attempt = run.attempts.find((entry) => entry.attemptId === attemptId);
    if (!attempt) throw new ArborError("UNKNOWN_ENTITY", "Attempt not found");
    const candidate = run.candidates.find((entry) => entry.attemptId === attemptId);
    const data = redactValue({
      attempt,
      hypothesis: run.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId),
      workerClaim: run.workerClaims.find((entry) => entry.attemptId === attemptId),
      candidate,
      certificates: candidate ? run.certificates.filter((entry) => entry.candidateOid === candidate.candidateOid || entry.oid === candidate.candidateOid) : [],
      effects: run.effects.filter((entry) => entry.attemptId === attemptId).map((entry) => ({ version: 1, effectId: entry.effectId, kind: entry.kind, state: entry.state, boundary: entry.identity.boundary, acceptedOutcome: entry.acceptedOutcomeDigest ? "present" : "absent" })),
      observations: run.effectObservations.filter((entry) => run.effects.some((effect) => effect.attemptId === attemptId && effect.effectId === entry.effectId)).map((entry) => ({ version: 1, observationId: entry.observationId, effectId: entry.effectId, classification: entry.classification, observedAt: entry.observedAt, reasons: entry.reasons })),
      retryLineage: { retryOfAttemptId: attempt.retryOfAttemptId ?? "none", retriedByAttemptIds: run.attempts.filter((entry) => entry.retryOfAttemptId === attemptId).map((entry) => entry.attemptId) },
    }) as Readonly<Record<string, unknown>>;
    return { version: 1, kind: "attemptDetail", runId, attemptId, revision: run.revision, cursor: run.sequence, data };
  }

  async readStreamBatch(runId: string, cursor: number, limit: number): Promise<DetachedStreamBatchV1> {
    if (!ID.test(runId) || !Number.isSafeInteger(cursor) || cursor < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new ArborError("VALIDATION_FAILED", "Invalid stream cursor or limit");
    const floor = await this.eventFloor(runId);
    if (!Number.isSafeInteger(floor) || floor < 0) throw new ArborError("STORE_CORRUPT", "Invalid event compaction floor");
    const projection = await this.query({ version: 1, kind: "overview", runId });
    if (cursor < floor) return { version: 1, kind: "reset", runId, floor, cursor: projection.cursor, reason: "compacted", projection };
    if (cursor > projection.cursor) return { version: 1, kind: "reset", runId, floor, cursor: projection.cursor, reason: "cursorAhead", projection };
    const page = await this.application.readEvents(runId, cursor, limit);
    let expected = cursor + 1;
    for (const event of page.events) {
      if (event.sequence !== expected) return { version: 1, kind: "reset", runId, floor, cursor: projection.cursor, reason: "gap", projection };
      expected += 1;
    }
    return { version: 1, kind: "events", runId, floor, cursor: page.nextSequence, page, projection };
  }

  async readArtifact(artifactId: string, offset: number, limit: number, binding: { principalId: string; runId: string; effectId: string }): Promise<ArtifactPageV1> {
    if (!this.artifacts) throw new ArborError("UNKNOWN_ENTITY", "Artifact reader is not configured");
    if (!ID.test(binding.principalId) || !ID.test(binding.runId) || !ID.test(binding.effectId)) throw new ArborError("VALIDATION_FAILED", "Artifact read binding is invalid");
    const run = await this.store.load(binding.runId); if (!run || !run.effects.some((effect) => effect.effectId === binding.effectId)) throw new ArborError("UNKNOWN_ENTITY", "Artifact run/effect binding is not known");
    const metadata = await this.artifacts.describe(artifactId); const capability = await this.artifacts.issueReadCapability({ version: 1, artifactId, expectedDigest: metadata.digest, principalId: binding.principalId, runId: binding.runId, effectId: binding.effectId, expiresAt: new Date(Date.parse(this.now()) + 60_000).toISOString(), maxReads: 1 });
    return this.artifacts.readPage({ version: 1, capability, offset, limit });
  }

  submitIntent(intent: WebIntentV1, session: WebSessionV1): Promise<IntentReceiptV1> {
    return this.application.submitIntent(intent, session);
  }
}
