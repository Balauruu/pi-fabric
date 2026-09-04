export type ArborId = string;
export type Sha256 = string;
export type GitOid = string;
export type CanonicalDecimal = string;
export type CanonicalQuantum =
  | "1"
  | "0.1"
  | "0.01"
  | "0.001"
  | "0.0001"
  | "0.00001"
  | "0.000001"
  | "0.0000001"
  | "0.00000001"
  | "0.000000001";
export type CanonicalTimestamp = string;

export interface ArborContractV1 {
  version: 1;
  objective: string;
  repository: {
    repositoryId: ArborId;
    initialOid: GitOid;
    dirtyPolicy: "reject" | "committedOnly";
  };
  metric: {
    name: string;
    direction: "maximize" | "minimize";
    unit: string;
    quantum: CanonicalQuantum;
    minimumImprovement: CanonicalDecimal;
    trialCount: number;
    aggregation: "single" | "median";
    nondeterminismTolerance: CanonicalDecimal;
  };
  evaluation: {
    development: ArborId;
    heldOut: ArborId;
    parserVersion: ArborId;
    invalidTrialPolicy: "failEvaluation";
  };
  paths: {
    editable: string[];
    protected: string[];
    requiredOutputs: string[];
  };
  permissions: {
    tools: ArborId[];
    network: boolean;
    packageInstallation: boolean;
    processExecution: boolean;
    credentialAliases: ArborId[];
  };
  budgets: {
    maxHypotheses: number;
    maxAttempts: number;
    maxConcurrentAttempts: number;
    maxRetriesPerHypothesis: number;
    maxCycles: number;
    wallTimeMs: number;
    maxAgentCalls: number;
    tokenLimit?: number;
    costLimit?: CanonicalDecimal;
    evaluatorRuns: number;
    finalizationReserve: {
      attempts: number;
      agentCalls: number;
      evaluatorRuns: number;
      wallTimeMs: number;
      tokens?: number;
      cost?: CanonicalDecimal;
    };
  };
  gates: {
    beforeDispatch: "always" | "policy";
    beforePromotion: "always";
    timeout: "pause" | "reject";
  };
  promotion: {
    mode: "packageWinnerRef";
  };
  retentionClass: ArborId;
}

export type RunState =
  | "STAGED"
  | "ADMITTED"
  | "BASELINING"
  | "EXPLORING"
  | "VERIFYING_FINAL"
  | "AWAITING_PROMOTION"
  | "PROMOTING"
  | "COMPLETED"
  | "WAITING_INPUT"
  | "PAUSED"
  | "CANCELLING"
  | "CANCELLED"
  | "FAILED"
  | "INDETERMINATE"
  | "QUARANTINED"
  | "REPORT_PENDING"
  | "CLEANUP_PENDING"
  | "ROLLBACK_REQUESTED"
  | "ROLLING_BACK"
  | "ROLLED_BACK";

export type ExplorationPhase =
  | "OBSERVE"
  | "IDEATE"
  | "SELECT"
  | "PREPARE"
  | "DISPATCH"
  | "COLLECT"
  | "FINALIZE"
  | "EVALUATE_DEV"
  | "BACKPROPAGATE"
  | "DECIDE"
  | "VERIFY_CANDIDATE"
  | "FINALIZE_RUN"
  | "RECONCILING"
  | "WAITING_INPUT"
  | "PAUSED"
  | "CANCELLING"
  | "INDETERMINATE"
  | "QUARANTINED";

export type HypothesisState =
  | "PROPOSED"
  | "PENDING"
  | "SELECTED"
  | "RUNNING"
  | "CANDIDATE"
  | "RETRYABLE"
  | "FAILED"
  | "INTERRUPTED"
  | "RECONCILING"
  | "INDETERMINATE"
  | "VERIFYING_HELD_OUT"
  | "VERIFIED"
  | "REJECTED"
  | "QUARANTINED"
  | "PROMOTABLE"
  | "PROMOTED"
  | "STALE_BASE"
  | "ROLLED_BACK"
  | "PRUNED"
  | "CANCELLED";

export type AttemptState =
  | "RESERVED"
  | "PREPARING"
  | "READY"
  | "DISPATCHING"
  | "RUNNING"
  | "COLLECTING"
  | "FINALIZING"
  | "CANDIDATE"
  | "REJECTED"
  | "INTERRUPTED"
  | "RECONCILING"
  | "PARTIAL"
  | "RETRYABLE"
  | "CANCELLED"
  | "INDETERMINATE"
  | "RETRIED";

export type EffectState =
  | "INTENDED"
  | "DISPATCHING"
  | "STARTED"
  | "OBSERVING"
  | "OBSERVED"
  | "COMMITTED"
  | "FAILED_ABSENT"
  | "FAILED"
  | "INDETERMINATE"
  | "CANCEL_REQUESTED"
  | "CANCELLED_CONFIRMED";

export type RecoveryClassification = "COMPLETED" | "ACTIVE" | "ABSENT" | "UNCERTAIN";
export type EffectBoundaryKind = "workspace" | "child" | "evaluator" | "git" | "report" | "cleanup" | "outbox";

export interface DescendantUnitIdentityV1 {
  version: 1;
  kind: "cgroup" | "container" | "processGroup";
  identityDigest: Sha256;
  startIdentity: string;
  containmentId: ArborId;
  descendantOwned: true;
}

export interface FingerprintObservationBindingV1 {
  version: 1;
  certificateId: ArborId;
  beforeDigest: Sha256;
  afterDigest: Sha256;
  equal: boolean;
  effectId: ArborId;
  fence: number;
  containmentId: ArborId;
  reportGenerationId: ArborId;
}

export interface EffectIdentityV1 {
  version: 1;
  boundary: EffectBoundaryKind;
  action: "materializeWorkspace" | "finalizeCandidate" | "spawnChild" | "evaluate" | "git" | "buildPromotionCandidate" | "applyWinnerRef" | "applyRollbackRef" | "publishReport" | "cleanup" | "outbox";
  fence: number;
  expectedRevision: number;
  intentDigest: Sha256;
  workspaceId?: ArborId;
  dispatchKey?: ArborId;
  containmentId?: ArborId;
  evaluationId?: ArborId;
  certificateId?: ArborId;
  evaluationRole?: EvaluationCertificateV1["role"];
  oid?: GitOid;
  candidateId?: ArborId;
  generationId?: ArborId;
  cleanupId?: ArborId;
  resourceId?: ArborId;
  outboxSequence?: number;
}

export interface EffectObservationV1 {
  version: 1;
  observationId: ArborId;
  effectId: ArborId;
  classification: RecoveryClassification;
  targetFence: number;
  observedFence: number;
  expectedRevision: number;
  identityDigest: Sha256;
  observedAt: CanonicalTimestamp;
  observerDigest: Sha256;
  outcomeDigest?: Sha256;
  terminalStatus?: "completed" | "failed" | "cancelled";
  changedPaths?: string[];
  rawResultDigest?: Sha256;
  boundedOutput?: string;
  partial?: boolean;
  candidate?: CandidateV1;
  certificate?: EvaluationCertificateV1;
  processUnit?: DescendantUnitIdentityV1;
  fingerprint?: FingerprintObservationBindingV1;
  reasons: string[];
}

export type PromotionState =
  | "REQUESTED"
  | "PREPARING"
  | "CANDIDATE_BUILT"
  | "VERIFYING"
  | "PREPARED"
  | "AWAITING_AUTHORIZATION"
  | "AWAITING_FABRIC_POLICY"
  | "COMMIT_PLANNED"
  | "REF_APPLYING"
  | "REF_OBSERVED"
  | "COMMITTED"
  | "REPORT_PENDING"
  | "REPORTED"
  | "REJECTED"
  | "STALE_BASE"
  | "INDETERMINATE"
  | "ROLLBACK_REQUESTED"
  | "AWAITING_ROLLBACK_AUTHORIZATION"
  | "ROLLBACK_PLANNED"
  | "ROLLBACK_APPLYING"
  | "ROLLBACK_OBSERVED"
  | "ROLLED_BACK";

export type AuthorizationState = "CHALLENGE_ISSUED" | "SIGNED" | "STORED" | "CONSUMED" | "EXPIRED" | "REVOKED";

export interface TrustedPrincipalV1 {
  principalId: ArborId;
  osUid: number;
  publicKey: string;
  allowedActions: ("promote" | "rollback")[];
  repositoryIds: ArborId[];
  expiresAt?: CanonicalTimestamp;
}

export interface EvaluationPolicyBindingV1 {
  version: 1;
  evaluatorVersion: string;
  split: "development" | "heldOut";
  parserVersion: ArborId;
  configurationDigest: Sha256;
  environmentDigest: Sha256;
  executableDigest: Sha256;
  quantum: CanonicalQuantum;
  trialCount: number;
  seeds: number[];
  trialOrder: number[];
  aggregation: "single" | "median";
  nondeterminismTolerance: CanonicalDecimal;
  containmentPolicyDigest: Sha256;
  containmentCertificateDigest: Sha256;
  heldOutIsolationCertificateDigest?: Sha256;
  strictProtocol: true;
  policyDigest: Sha256;
}

export interface MergeDiffEntryV1 {
  status: string;
  oldMode: string;
  newMode: string;
  oldOid: GitOid;
  newOid: GitOid;
  paths: string[];
  type: "file" | "symlink" | "deleted";
  symlinkTarget?: string;
}

export interface MergeConstructionV1 {
  version: 1;
  constructionId: ArborId;
  role: "heldOutBaseline" | "heldOutCandidate";
  candidateId?: ArborId;
  expectedResearchTrunkOid: GitOid;
  candidateOid: GitOid;
  mergeCandidateOid: GitOid;
  treeOid: GitOid;
  algorithmDigest: Sha256;
  diffEntries: MergeDiffEntryV1[];
  changedPaths: string[];
  requiredOutputs: Array<{ path: string; digest: Sha256; mode: string; type: "file" | "symlink" }>;
  requiredOutputsDigest: Sha256;
  protectedManifest: Array<{ path: string; mode: string; type: string; oid: GitOid }>;
  protectedManifestDigest: Sha256;
  fullTreeManifestDigest: Sha256;
  beforeRefsDigest: Sha256;
  afterRefsDigest: Sha256;
  manifestDigest: Sha256;
}

export interface AuthorizationPayloadV1 {
  version: 1;
  kind: "promote" | "rollback";
  challengeId: ArborId;
  runId: ArborId;
  repositoryId: ArborId;
  promotionId: ArborId;
  candidateId: ArborId;
  candidateOid: GitOid;
  mergeCandidateOid: GitOid;
  heldOutCertificateDigest: Sha256;
  contractDigest: Sha256;
  winnerRef: string;
  expectedCurrentOid: GitOid;
  predecessorOid: GitOid;
  expiresAt: CanonicalTimestamp;
  nonce: string;
  principalId: ArborId;
}

export interface AuthorizationRecordV1 {
  version: 1;
  authorizationId: ArborId;
  challengeId: ArborId;
  challengeDigest: Sha256;
  payload: AuthorizationPayloadV1;
  nonceDigest: Sha256;
  principalId: ArborId;
  keyId: ArborId;
  signature?: string;
  issuedAt?: CanonicalTimestamp;
  state: AuthorizationState;
  consumedById?: ArborId;
}

export interface RefObservationV1 {
  version: 1;
  observable: boolean;
  ref: string;
  actualOid?: GitOid;
  observationDigest: Sha256;
}

export interface FabricPolicyTraversalProofV1 {
  version: 1;
  boundary: "certified-production-host" | "explicit-test-fixture";
  action: "arbor.applyWinnerRef" | "arbor.applyRollbackRef";
  argsDigest: Sha256;
  runId: ArborId;
  operationId: ArborId;
  promotionId: ArborId;
  candidateId: ArborId;
  authorizationId: ArborId;
  parentToolCallId: string;
  nestedToolCallId: string;
  traversedAt: CanonicalTimestamp;
  b9CertificationId?: "approval_runtime_b9_v1";
  b9CertificationDigest?: Sha256;
  traversalDigest: Sha256;
}

export interface PromotionV1 {
  version: 1;
  promotionId: ArborId;
  state: PromotionState;
  candidateId: ArborId;
  candidateOid: GitOid;
  expectedResearchTrunkOid: GitOid;
  mergeCandidateOid?: GitOid;
  mergeConstructionId?: ArborId;
  heldOutCertificateId?: ArborId;
  heldOutCertificateDigest?: Sha256;
  winnerRef: string;
  expectedCurrentOid?: GitOid;
  predecessorOid?: GitOid;
  authorizationId?: ArborId;
  authorizationDigest?: Sha256;
  fabricPolicyTraversal?: FabricPolicyTraversalProofV1;
  fabricPolicyTraversalDigest?: Sha256;
  effectId?: ArborId;
  observedOid?: GitOid;
  observationDigest?: Sha256;
  committedAt?: CanonicalTimestamp;
  rollbackAuthorizationId?: ArborId;
  rollbackAuthorizationDigest?: Sha256;
  rollbackFabricPolicyTraversal?: FabricPolicyTraversalProofV1;
  rollbackFabricPolicyTraversalDigest?: Sha256;
  rollbackEffectId?: ArborId;
  rollbackObservedOid?: GitOid;
  rolledBackAt?: CanonicalTimestamp;
}

export type ReportState = "PLANNED" | "WRITING" | "FILES_OBSERVED" | "PUBLISHED" | "PUBLICATION_FAILED" | "INDETERMINATE";
export type CleanupState = "REQUESTED" | "PLANNED" | "EXECUTING" | "OBSERVING" | "COMPLETED" | "CLEANUP_PENDING" | "INDETERMINATE";

export interface HypothesisV1 {
  version: 1;
  hypothesisId: ArborId;
  parentHypothesisId?: ArborId;
  state: HypothesisState;
  rationale: string;
  plan: string[];
  lessons: string[];
  attemptIds: ArborId[];
}

export interface AttemptV1 {
  version: 1;
  attemptId: ArborId;
  hypothesisId: ArborId;
  ordinal: number;
  state: AttemptState;
  dispatchKey: ArborId;
  effectId: ArborId;
  workspaceId: ArborId;
  budgetReservationId: ArborId;
  childHandleDigest?: Sha256;
  candidateId?: ArborId;
  retryOfAttemptId?: ArborId;
}

export interface EffectV1 {
  version: 1;
  effectId: ArborId;
  kind: "workspace" | "agent" | "evaluation" | "git" | "report" | "cleanup" | "outbox" | "promotion" | "rollback";
  state: EffectState;
  idempotencyKey: string;
  identity: EffectIdentityV1;
  attemptId?: ArborId;
  correlationDigest?: Sha256;
  processUnit?: DescendantUnitIdentityV1;
  latestObservationId?: ArborId;
  acceptedOutcomeDigest?: Sha256;
  interruptedFromAttemptState?: AttemptState;
  interruptedFromPhase?: ExplorationPhase;
  monitoringResumedAt?: CanonicalTimestamp;
}

export interface AgentChildProjectionV1 {
  version: 1;
  childId: ArborId;
  attemptId: ArborId;
  effectId: ArborId;
  dispatchKey: ArborId;
  fence: number;
  childHandleDigest: Sha256;
  workflowCorrelationDigest: Sha256;
  requestDigest: Sha256;
  containmentId: ArborId;
  state: "STARTED" | "ACTIVE" | "COMPLETED" | "FAILED" | "CANCEL_REQUESTED" | "CANCELLED_CONFIRMED" | "INDETERMINATE";
  processUnit?: DescendantUnitIdentityV1;
  resultDigest?: Sha256;
}

export interface BudgetReservationV1 {
  version: 1;
  budgetReservationId: ArborId;
  attemptId: ArborId;
  dispatchKey: ArborId;
  effectId: ArborId;
  ordinal: number;
  state: "RESERVED" | "CONSUMED" | "RETAINED";
}

export interface RunSuspensionV1 {
  version: 1;
  kind: "pause" | "recovery";
  priorState: RunState;
  priorPhase: ExplorationPhase;
  effectId?: ArborId;
}

export interface CandidateV1 {
  version: 1;
  candidateId: ArborId;
  hypothesisId: ArborId;
  attemptId: ArborId;
  baseOid: GitOid;
  candidateOid: GitOid;
  changedPaths: string[];
  manifestDigest: Sha256;
}

export interface EvaluationCertificateV1 {
  version: 1;
  certificateId: ArborId;
  evaluationId: ArborId;
  runId: ArborId;
  epochDigest: Sha256;
  contractDigest: Sha256;
  role: "developmentBaseline" | "heldOutBaseline" | "developmentCandidate" | "heldOutCandidate";
  oid: GitOid;
  evaluatorId: ArborId;
  parserVersion: ArborId;
  metric: string;
  unit: string;
  quantum: CanonicalQuantum;
  rawTrials: CanonicalDecimal[];
  quantizedUnits: string[];
  aggregateUnits: string;
  spreadUnits: string;
  valid: boolean;
  rejectionReason?: string;
  outputDigest: Sha256;
  trust: "fixture" | "certified";
  policy?: EvaluationPolicyBindingV1;
  baseOid?: GitOid;
  candidateOid?: GitOid;
  mergeCandidateOid?: GitOid;
  requiredOutputsDigest?: Sha256;
  protectedManifestDigest?: Sha256;
  containmentCertificateDigest?: Sha256;
  heldOutIsolationCertificateDigest?: Sha256;
  strictProtocol?: true;
}

export interface AgentDispatchIntentV1 {
  version: 1;
  effectId: ArborId;
  dispatchKey: ArborId;
  runId: ArborId;
  hypothesisId: ArborId;
  attemptId: ArborId;
  fence: number;
  workspaceId: ArborId;
  containmentId: ArborId;
  cwdToken: string;
  agentProfileId: ArborId;
  requestSchemaDigest: Sha256;
  resultSchemaDigest: Sha256;
  toolPolicyId: ArborId;
  budgetReservationId: ArborId;
  expiresAt: CanonicalTimestamp;
}

export type GateAnswerV1 =
  | { version: 1; kind: "confirm"; gateId: ArborId; value: boolean }
  | { version: 1; kind: "singleChoice"; gateId: ArborId; optionId: ArborId }
  | { version: 1; kind: "multiChoice"; gateId: ArborId; optionIds: ArborId[] }
  | { version: 1; kind: "boundedText"; gateId: ArborId; value: string };

export type GateState = "OPEN" | "ANSWERED" | "EXPIRED" | "REJECTED";

export interface GateV1 {
  version: 1;
  gateId: ArborId;
  answerKind: GateAnswerV1["kind"];
  optionIds: ArborId[];
  state: GateState;
  expiresAt: CanonicalTimestamp;
  answer?: GateAnswerV1;
}

export type WebIntentV1 =
  | { version: 1; kind: "pause"; expectedRevision: number; reason?: string }
  | { version: 1; kind: "resume"; expectedRevision: number }
  | { version: 1; kind: "answerGate"; expectedRevision: number; answer: GateAnswerV1 }
  | { version: 1; kind: "pinHypothesis"; expectedRevision: number; hypothesisId: ArborId }
  | { version: 1; kind: "pruneHypothesis"; expectedRevision: number; hypothesisId: ArborId; reason: string }
  | { version: 1; kind: "retryAttempt"; expectedRevision: number; attemptId: ArborId }
  | { version: 1; kind: "cancel"; expectedRevision: number; reason?: string }
  | { version: 1; kind: "requestPromotion"; expectedRevision: number; candidateId: ArborId }
  | { version: 1; kind: "requestRollback"; expectedRevision: number; promotionId: ArborId }
  | { version: 1; kind: "requestReport"; expectedRevision: number }
  | { version: 1; kind: "requestCleanup"; expectedRevision: number };

export interface StoredIntentV1 {
  version: 1;
  intentId: ArborId;
  runId: ArborId;
  intent: WebIntentV1;
  state: "PENDING" | "CLAIMED" | "APPLIED" | "REJECTED_STALE" | "REJECTED";
  submittedAt: CanonicalTimestamp;
  claimedByDriverId?: ArborId;
  rejectionReason?: string;
}

export interface ReportGenerationV1 {
  version: 1;
  generationId: ArborId;
  revision: number;
  state: ReportState;
  dependencyDigests: Sha256[];
  expectedManifestDigest?: Sha256;
  observedManifestDigest?: Sha256;
}

export interface CleanupObligationV1 {
  version: 1;
  cleanupId: ArborId;
  resourceId: ArborId;
  resourceKind: "workspace" | "scratch" | "agentChild" | "evaluatorProcess" | "temporaryReport";
  state: CleanupState;
  reportDependencyDigests: Sha256[];
}

export interface DriverLeaseV1 {
  version: 1;
  driverId: ArborId;
  fence: number;
  acquiredAt: CanonicalTimestamp;
  expiresAt: CanonicalTimestamp;
}

export interface WorkerClaimV1 {
  version: 1;
  attemptId: ArborId;
  claimedMetric?: CanonicalDecimal;
  changedPaths: string[];
  rawResultDigest?: Sha256;
  terminalStatus?: "completed" | "failed" | "cancelled";
  boundedPreview?: string;
  informational: true;
}

export type ProductionGateV1 = "B0" | "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8" | "B9" | "B10" | "B11" | "B12";

export interface RuntimeAdmissionEvidenceV1 {
  version: 1;
  mode: "fixture" | "production-blocked" | "production-certified";
  admissionDigest: Sha256;
  configurationDigest: Sha256;
  packageInventoryDigest: Sha256;
  packagedDistDigest: Sha256;
  arborSourceDigest: Sha256;
  piFabricPackageDigest: Sha256;
  hostPiFabricPackageDigest: Sha256;
  certificationArtifactDigest: Sha256;
  piFabricVersion: "0.76.2" | "0.77.0" | "unavailable";
  certificateIds: ArborId[];
  certificateDigests: Sha256[];
  productionCertificateId?: ArborId;
  productionCertificateDigest?: Sha256;
  productionCertificatePath?: string;
  distributionCertificateId?: ArborId;
  distributionCertificateDigest?: Sha256;
  distributionCertificatePath?: string;
  adapterIdentityDigest?: Sha256;
  fabricApprovalRuntimeCertificateDigest?: Sha256;
  fabricApprovalRuntimeCertificatePath?: string;
  gateResults: Partial<Record<ProductionGateV1, "PASS">>;
  gateEvidenceDigests: Partial<Record<ProductionGateV1, Sha256>>;
  blockers: string[];
}

export interface RunAggregateV1 {
  version: 1;
  runId: ArborId;
  revision: number;
  sequence: number;
  contract: ArborContractV1;
  contractDigest: Sha256;
  epochDigest: Sha256;
  runtimeAdmission?: RuntimeAdmissionEvidenceV1;
  state: RunState;
  phase: ExplorationPhase;
  outcome?: "NO_PROMOTION" | "PROMOTED" | "ROLLED_BACK" | "CANCELLED" | "FAILED" | "INDETERMINATE" | "QUARANTINED";
  driver?: DriverLeaseV1;
  suspension?: RunSuspensionV1;
  hypotheses: HypothesisV1[];
  attempts: AttemptV1[];
  effects: EffectV1[];
  effectObservations: EffectObservationV1[];
  agentChildren: AgentChildProjectionV1[];
  budgetReservations: BudgetReservationV1[];
  dispatchIntents: AgentDispatchIntentV1[];
  gates: GateV1[];
  candidates: CandidateV1[];
  certificates: EvaluationCertificateV1[];
  mergeConstructions: MergeConstructionV1[];
  promotions: PromotionV1[];
  authorizations: AuthorizationRecordV1[];
  intents: StoredIntentV1[];
  reports: ReportGenerationV1[];
  cleanup: CleanupObligationV1[];
  workerClaims: WorkerClaimV1[];
  pinnedHypothesisIds: ArborId[];
  developmentBaselineCertificateId?: ArborId;
  heldOutBaselineCertificateId?: ArborId;
  heldOutBaselineConstructionId?: ArborId;
  bestCandidateId?: ArborId;
  yielded: boolean;
  createdAt: CanonicalTimestamp;
  updatedAt: CanonicalTimestamp;
}

export interface CommandMetadataV1 {
  runId: ArborId;
  expectedRevision: number;
  idempotencyKey: string;
}

export type ArborCommandV1 =
  | { version: 1; kind: "start"; metadata: CommandMetadataV1; contract: ArborContractV1 }
  | { version: 1; kind: "claimDriver"; metadata: CommandMetadataV1; driverId: ArborId; leaseMs: number }
  | { version: 1; kind: "heartbeat"; metadata: CommandMetadataV1; leaseMs: number }
  | { version: 1; kind: "advance"; metadata: CommandMetadataV1 }
  | { version: 1; kind: "signal"; metadata: CommandMetadataV1; signal: "pause" | "resume" | "gateAnswer" | "pin" | "prune" | "retry"; reason?: string; entityId?: ArborId; answer?: GateAnswerV1 }
  | { version: 1; kind: "cancel"; metadata: CommandMetadataV1; reason?: string }
  | { version: 1; kind: "proposeHypothesis"; metadata: CommandMetadataV1; hypothesis: Omit<HypothesisV1, "state" | "attemptIds" | "lessons"> }
  | { version: 1; kind: "selectHypothesis"; metadata: CommandMetadataV1; hypothesisId: ArborId }
  | { version: 1; kind: "reserveAgentDispatch"; metadata: CommandMetadataV1; hypothesisId: ArborId; retryOfAttemptId?: ArborId }
  | { version: 1; kind: "materializeWorkspace"; metadata: CommandMetadataV1; attemptId: ArborId }
  | { version: 1; kind: "attachAgentChild"; metadata: CommandMetadataV1; attemptId: ArborId; childHandle: string; dispatchKey: ArborId; workflowCorrelationDigest?: Sha256; requestDigest?: Sha256; processUnit?: DescendantUnitIdentityV1 }
  | { version: 1; kind: "submitAgentObservation"; metadata: CommandMetadataV1; attemptId: ArborId; dispatchKey: ArborId; changedPaths: string[]; claimedMetric?: CanonicalDecimal; rawResultDigest?: Sha256; terminalStatus?: "completed" | "failed" | "cancelled"; boundedOutput?: string }
  | { version: 1; kind: "interruptEffect"; metadata: CommandMetadataV1; effectId: ArborId; reason: string }
  | { version: 1; kind: "reconcileEffect"; metadata: CommandMetadataV1; observation: EffectObservationV1 }
  | { version: 1; kind: "resumeEffect"; metadata: CommandMetadataV1; effectId: ArborId }
  | { version: 1; kind: "observeEffectCancellation"; metadata: CommandMetadataV1; effectId: ArborId; outcome: "confirmed" | "uncertain"; observerDigest: Sha256; fingerprint?: FingerprintObservationBindingV1 }
  | { version: 1; kind: "finalizeCandidate"; metadata: CommandMetadataV1; attemptId: ArborId }
  | { version: 1; kind: "evaluate"; metadata: CommandMetadataV1; role: EvaluationCertificateV1["role"]; oid: GitOid; candidateId?: ArborId }
  | { version: 1; kind: "buildPromotionCandidate"; metadata: CommandMetadataV1; role: "heldOutBaseline" | "heldOutCandidate"; expectedResearchTrunkOid: GitOid; candidateId?: ArborId; promotionId?: ArborId }
  | { version: 1; kind: "planPromotionCommit"; metadata: CommandMetadataV1; promotionId: ArborId; authorizationId: ArborId }
  | { version: 1; kind: "applyWinnerRef"; metadata: CommandMetadataV1; promotionId: ArborId }
  | { version: 1; kind: "observeWinnerRef"; metadata: CommandMetadataV1; promotionId: ArborId }
  | { version: 1; kind: "planRollback"; metadata: CommandMetadataV1; promotionId: ArborId; authorizationId: ArborId }
  | { version: 1; kind: "applyRollbackRef"; metadata: CommandMetadataV1; promotionId: ArborId }
  | { version: 1; kind: "observeRollbackRef"; metadata: CommandMetadataV1; promotionId: ArborId }
  | { version: 1; kind: "finalizeRun"; metadata: CommandMetadataV1; outcome: "NO_PROMOTION" | "FAILED" }
  | { version: 1; kind: "processIntent"; metadata: CommandMetadataV1; intentId: ArborId }
  | { version: 1; kind: "planReport"; metadata: CommandMetadataV1 }
  | { version: 1; kind: "publishReport"; metadata: CommandMetadataV1; generationId: ArborId }
  | { version: 1; kind: "observeReport"; metadata: CommandMetadataV1; generationId: ArborId }
  | { version: 1; kind: "planCleanup"; metadata: CommandMetadataV1; resourceId: ArborId; resourceKind: CleanupObligationV1["resourceKind"] }
  | { version: 1; kind: "executeCleanup"; metadata: CommandMetadataV1; cleanupId: ArborId }
  | { version: 1; kind: "observeCleanup"; metadata: CommandMetadataV1; cleanupId: ArborId; outcome: "completed" | "pending" | "indeterminate" };

export interface CommandContextV1 {
  driverId?: ArborId;
  fence: number;
  now: CanonicalTimestamp;
}

export interface CommandReceiptV1 {
  version: 1;
  commandId: ArborId;
  runId: ArborId;
  revision: number;
  sequence: number;
  duplicate: boolean;
  eventTypes: string[];
  directive?: ArborDirectiveV1;
}

export type ArborDirectiveV1 =
  | { version: 1; kind: "evaluateBaseline"; role: "developmentBaseline" | "heldOutBaseline"; oid: GitOid }
  | { version: 1; kind: "coordinateHypothesis" }
  | { version: 1; kind: "selectHypothesis"; hypothesisId: ArborId }
  | { version: 1; kind: "reserveAgentDispatch"; hypothesisId: ArborId }
  | { version: 1; kind: "materializeWorkspace"; attemptId: ArborId }
  | { version: 1; kind: "dispatchAgent"; dispatch: AgentDispatchIntentV1 }
  | { version: 1; kind: "finalizeCandidate"; attemptId: ArborId }
  | { version: 1; kind: "evaluateCandidate"; candidateId: ArborId; oid: GitOid }
  | { version: 1; kind: "buildPromotionCandidate"; role: "heldOutBaseline" | "heldOutCandidate"; expectedResearchTrunkOid: GitOid; candidateId?: ArborId; promotionId?: ArborId }
  | { version: 1; kind: "evaluateHeldOutCandidate"; promotionId: ArborId; candidateId: ArborId; oid: GitOid }
  | { version: 1; kind: "finalizeRun" }
  | { version: 1; kind: "processIntent"; intentId: ArborId }
  | { version: 1; kind: "planReport" }
  | { version: 1; kind: "publishReport"; generationId: ArborId }
  | { version: 1; kind: "done" };

export interface ArborQueryV1 {
  version: 1;
  kind: "overview" | "tree" | "attempts" | "compare" | "metrics" | "resources" | "promotion" | "report" | "contract";
  runId: ArborId;
  limit?: number;
}

export interface QueryContextV1 {
  principalId?: ArborId;
}

export interface ArborViewV1 {
  version: 1;
  kind: ArborQueryV1["kind"];
  runId: ArborId;
  revision: number;
  cursor: number;
  data: Readonly<Record<string, unknown>>;
}

export interface WebSessionV1 {
  version: 1;
  sessionId: ArborId;
  runId: ArborId;
  idempotencyKey: string;
  csrfValidated: boolean;
  originValidated: boolean;
}

export interface IntentReceiptV1 {
  version: 1;
  intentId: ArborId;
  runId: ArborId;
  state: StoredIntentV1["state"];
  revision: number;
}

export interface DomainEventV1 {
  version: 1;
  runId: ArborId;
  sequence: number;
  revision: number;
  type: string;
  at: CanonicalTimestamp;
  aggregate: RunAggregateV1;
}

export type PublicDomainEventV1 = Omit<DomainEventV1, "aggregate">;

export interface EventPageV1 {
  version: 1;
  runId: ArborId;
  afterSequence: number;
  events: PublicDomainEventV1[];
  nextSequence: number;
  hasMore: boolean;
}

export interface OutboxRecordV1 {
  version: 1;
  runId: ArborId;
  sequence: number;
  revision: number;
  eventDigest: Sha256;
  dispatchKey: ArborId;
  state: "PENDING" | "OBSERVING" | "PUBLISHED" | "INDETERMINATE";
  body: DomainEventV1;
  attemptCount: number;
  acceptedOutcomeDigest?: Sha256;
  observerDigest?: Sha256;
}

export interface OutboxObservationV1 {
  version: 1;
  runId: ArborId;
  sequence: number;
  expectedRevision: number;
  dispatchKey: ArborId;
  classification: RecoveryClassification;
  observerDigest: Sha256;
  outcomeDigest?: Sha256;
}
