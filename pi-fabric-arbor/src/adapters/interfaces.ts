import type {
  ArborContractV1,
  AgentDispatchIntentV1,
  ArborId,
  CandidateV1,
  CanonicalDecimal,
  DescendantUnitIdentityV1,
  EffectBoundaryKind,
  EffectObservationV1,
  EffectV1,
  EvaluationCertificateV1,
  FingerprintObservationBindingV1,
  GitOid,
  MergeConstructionV1,
  OutboxRecordV1,
  RecoveryClassification,
  RunAggregateV1,
  Sha256,
} from "../domain/types.js";

export interface WorkspaceMaterializationRequestV1 {
  version: 1;
  runId: ArborId;
  attemptId: ArborId;
  workspaceId: ArborId;
  baseOid: GitOid;
  idempotencyKey: string;
}

export interface WorkspaceObservationV1 {
  version: 1;
  workspaceId: ArborId;
  baseOid: GitOid;
  identityDigest: Sha256;
  trust: "fixture" | "certified";
}

export interface CandidateFinalizationRequestV1 {
  version: 1;
  runId: ArborId;
  attemptId: ArborId;
  hypothesisId: ArborId;
  candidateId: ArborId;
  baseOid: GitOid;
  changedPaths: string[];
  contract: ArborContractV1;
}

export interface WorkspaceManager {
  materialize(request: WorkspaceMaterializationRequestV1): Promise<WorkspaceObservationV1>;
  finalize(request: CandidateFinalizationRequestV1): Promise<CandidateV1>;
}

export interface AgentSpawnRequestV1 {
  version: 1;
  dispatch: AgentDispatchIntentV1;
}

export interface AgentObservationV1 {
  version: 1;
  childHandle: string;
  dispatchKey: ArborId;
  changedPaths: string[];
  claimedMetric?: CanonicalDecimal;
  rawResultDigest: Sha256;
  terminalStatus: "completed" | "failed" | "cancelled";
  boundedOutput: string;
}

export interface FabricAgentAdapter {
  spawn(request: AgentSpawnRequestV1): Promise<AgentObservationV1>;
}

export interface EvaluationRequestV1 {
  version: 1;
  evaluationId: ArborId;
  effectId: ArborId;
  certificateId: ArborId;
  runId: ArborId;
  epochDigest: Sha256;
  contractDigest: Sha256;
  role: EvaluationCertificateV1["role"];
  oid: GitOid;
  contract: ArborContractV1;
  mergeConstruction?: MergeConstructionV1;
}

export interface Evaluator {
  evaluate(request: EvaluationRequestV1): Promise<EvaluationCertificateV1>;
}

export interface ReportPublicationObservationV1 {
  version: 1;
  generationId: ArborId;
  classification: "complete" | "absent" | "partial" | "conflict" | "uncertain";
  manifestDigest?: Sha256;
}

export interface ReportPublisher {
  publish(generationId: ArborId, files: Readonly<Record<string, string>>, expectedManifestDigest?: Sha256): Promise<ReportPublicationObservationV1>;
  observe(generationId: ArborId, expectedManifestDigest?: Sha256): Promise<ReportPublicationObservationV1>;
}

export interface CleanupExecutionRequestV1 {
  version: 1;
  cleanupId: ArborId;
  resourceId: ArborId;
  resourceKind: "workspace" | "scratch" | "agentChild" | "evaluatorProcess" | "temporaryReport";
  runId: ArborId;
  effectId: ArborId;
}

export interface CleanupAdapter {
  execute(request: CleanupExecutionRequestV1): Promise<{ version: 1; cleanupId: ArborId; outcome: "completed" | "pending" | "indeterminate" }>;
}

export interface EffectRecoveryRequestV1 {
  version: 1;
  run: RunAggregateV1;
  effect: EffectV1;
  observedFence: number;
  expectedRevision: number;
  observationId: ArborId;
  observedAt: string;
}

/** Production observers inspect an existing identity. They never execute or replay it. */
export interface EffectRecoveryObserver {
  readonly boundary: EffectBoundaryKind;
  observe(request: EffectRecoveryRequestV1): Promise<Omit<EffectObservationV1, "version" | "observationId" | "effectId" | "targetFence" | "observedFence" | "expectedRevision" | "identityDigest" | "observedAt">>;
}

export interface DescendantCancellationAdapter {
  cancel(unit: DescendantUnitIdentityV1, signal?: AbortSignal): Promise<{ version: 1; classification: "COMPLETED" | "UNCERTAIN"; observerDigest: Sha256; fingerprint?: FingerprintObservationBindingV1 }>;
  observe(unit: DescendantUnitIdentityV1): Promise<{ version: 1; classification: RecoveryClassification; observerDigest: Sha256; fingerprint?: FingerprintObservationBindingV1 }>;
}

export interface ActivityProjectionObservationV1 {
  version: 1;
  classification: RecoveryClassification;
  observerDigest: Sha256;
  outcomeDigest?: Sha256;
}

/** The stable dispatch key makes an outbox projection observable before any retry. */
export interface ActivityProjector {
  observe(record: OutboxRecordV1): Promise<ActivityProjectionObservationV1>;
  /** Must atomically deduplicate by record.dispatchKey; concurrent drainers may race after an ABSENT observation. */
  publish(record: OutboxRecordV1): Promise<ActivityProjectionObservationV1>;
}
