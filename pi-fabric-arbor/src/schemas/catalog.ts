import { CERTIFIED_PI_FABRIC_VERSIONS_V1 } from "../certification/pi-fabric-support.js";

export type JsonSchema = Readonly<Record<string, unknown>>;

const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const id = { type: "string", pattern: "^[a-z][a-z0-9_]{2,63}$", minLength: 3, maxLength: 64 } as const;
const sha256 = { type: "string", pattern: "^[0-9a-f]{64}$", minLength: 64, maxLength: 64 } as const;
const timestamp = {
  type: "string",
  pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
  minLength: 24,
  maxLength: 24,
} as const;
const revision = { type: "integer", minimum: 0, maximum: MAX_SAFE } as const;
const shortText = { type: "string", minLength: 1, maxLength: 256 } as const;
const reason = { type: "string", minLength: 1, maxLength: 4000 } as const;
const objective = { type: "string", minLength: 1, maxLength: 2000 } as const;
const decimal = {
  type: "string",
  pattern: "^(?:0|-?(?:(?:[1-9][0-9]{0,26})(?:\\.[0-9]{0,8}[1-9])?|0\\.[0-9]{0,8}[1-9]))$",
  minLength: 1,
  maxLength: 38,
} as const;
const quantum = {
  enum: ["1", "0.1", "0.01", "0.001", "0.0001", "0.00001", "0.000001", "0.0000001", "0.00000001", "0.000000001"],
} as const;
const relativePath = {
  type: "string",
  minLength: 1,
  maxLength: 512,
  pattern: "^(?!/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?!.*(?:^|/)\\.{1,2}(?:/|$))(?!.*//)(?!.*\\\\)(?!.*\\u0000)[^/]+(?:/[^/]+)*$",
} as const;
const relativeGlob = {
  type: "string",
  minLength: 1,
  maxLength: 512,
  pattern: "^(?!/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?!.*(?:^|/)\\.{1,2}(?:/|$))(?!.*//)(?!.*[{}!\\\\])[^/]+(?:/[^/]+)*$",
} as const;
const opaqueToken = { type: "string", pattern: "^[A-Za-z0-9_-]{32,256}$", minLength: 32, maxLength: 256 } as const;
const idempotencyKey = { type: "string", pattern: "^[A-Za-z0-9._~-]{16,128}$", minLength: 16, maxLength: 128 } as const;
const hostCorrelation = { type: "string", pattern: "^[A-Za-z0-9._:~-]{3,160}$", minLength: 3, maxLength: 160 } as const;
const metricText = { type: "string", pattern: "^[A-Za-z][A-Za-z0-9_.%/-]{0,63}$", minLength: 1, maxLength: 64 } as const;

function object(properties: Record<string, JsonSchema>, required: readonly string[] = Object.keys(properties)): JsonSchema {
  return { type: "object", properties, required, additionalProperties: false };
}
function array(items: JsonSchema, maxItems: number, minItems = 0, uniqueItems = false): JsonSchema {
  return { type: "array", items, minItems, maxItems, ...(uniqueItems ? { uniqueItems: true } : {}) };
}
function ref(name: string): JsonSchema {
  return { $ref: `#/$defs/${name}` };
}
function tagged(kind: string, properties: Record<string, JsonSchema> = {}, optional: readonly string[] = []): JsonSchema {
  const all = { version: { const: 1 }, kind: { const: kind }, ...properties };
  return object(all, Object.keys(all).filter((key) => !optional.includes(key)));
}

export interface ArborSchemaCatalogV1 {
  version: 1;
  gitOidLength: 40 | 64;
  schemas: Readonly<Record<string, JsonSchema>>;
  actionInputs: Readonly<Record<string, JsonSchema>>;
  actionOutputs: Readonly<Record<string, JsonSchema>>;
}

export function createArborSchemaCatalogV1(gitOidLength: 40 | 64): ArborSchemaCatalogV1 {
  const gitOid = {
    type: "string",
    pattern: `^[0-9a-f]{${gitOidLength}}$`,
    minLength: gitOidLength,
    maxLength: gitOidLength,
  } as const;

  const finalizationReserve = object(
    {
      attempts: { type: "integer", minimum: 0, maximum: 10_000 },
      agentCalls: { type: "integer", minimum: 0, maximum: 100_000 },
      evaluatorRuns: { type: "integer", minimum: 0, maximum: 100_000 },
      wallTimeMs: { type: "integer", minimum: 0, maximum: 604_800_000 },
      tokens: { type: "integer", minimum: 0, maximum: MAX_SAFE },
      cost: decimal,
    },
    ["attempts", "agentCalls", "evaluatorRuns", "wallTimeMs"],
  );

  const contract = object({
    version: { const: 1 },
    objective,
    repository: object({
      repositoryId: id,
      initialOid: gitOid,
      dirtyPolicy: { enum: ["reject", "committedOnly"] },
    }),
    metric: object({
      name: metricText,
      direction: { enum: ["maximize", "minimize"] },
      unit: metricText,
      quantum,
      minimumImprovement: decimal,
      trialCount: { type: "integer", minimum: 1, maximum: 99 },
      aggregation: { enum: ["single", "median"] },
      nondeterminismTolerance: decimal,
    }),
    evaluation: object({
      development: id,
      heldOut: id,
      parserVersion: id,
      invalidTrialPolicy: { const: "failEvaluation" },
    }),
    paths: object({
      editable: array(relativeGlob, 128),
      protected: array(relativeGlob, 128),
      requiredOutputs: array(relativePath, 128),
    }),
    permissions: object({
      tools: array(id, 64, 0, true),
      network: { type: "boolean" },
      packageInstallation: { type: "boolean" },
      processExecution: { type: "boolean" },
      credentialAliases: array(id, 16, 0, true),
    }),
    budgets: object(
      {
        maxHypotheses: { type: "integer", minimum: 1, maximum: 10_000 },
        maxAttempts: { type: "integer", minimum: 1, maximum: 10_000 },
        maxConcurrentAttempts: { type: "integer", minimum: 1, maximum: 64 },
        maxRetriesPerHypothesis: { type: "integer", minimum: 0, maximum: 32 },
        maxCycles: { type: "integer", minimum: 1, maximum: 10_000 },
        wallTimeMs: { type: "integer", minimum: 1_000, maximum: 604_800_000 },
        maxAgentCalls: { type: "integer", minimum: 1, maximum: 100_000 },
        tokenLimit: { type: "integer", minimum: 1, maximum: MAX_SAFE },
        costLimit: decimal,
        evaluatorRuns: { type: "integer", minimum: 1, maximum: 100_000 },
        finalizationReserve,
      },
      ["maxHypotheses", "maxAttempts", "maxConcurrentAttempts", "maxRetriesPerHypothesis", "maxCycles", "wallTimeMs", "maxAgentCalls", "evaluatorRuns", "finalizationReserve"],
    ),
    gates: object({
      beforeDispatch: { enum: ["always", "policy"] },
      beforePromotion: { const: "always" },
      timeout: { enum: ["pause", "reject"] },
    }),
    promotion: object({ mode: { const: "packageWinnerRef" } }),
    retentionClass: id,
  });

  const gateAnswer = {
    oneOf: [
      tagged("confirm", { gateId: id, value: { type: "boolean" } }),
      tagged("singleChoice", { gateId: id, optionId: id }),
      tagged("multiChoice", { gateId: id, optionIds: array(id, 32, 1, true) }),
      tagged("boundedText", { gateId: id, value: { type: "string", minLength: 1, maxLength: 2000 } }),
    ],
  } as const;

  const webIntent = {
    oneOf: [
      tagged("pause", { expectedRevision: revision, reason }, ["reason"]),
      tagged("resume", { expectedRevision: revision }),
      tagged("answerGate", { expectedRevision: revision, answer: gateAnswer }),
      tagged("pinHypothesis", { expectedRevision: revision, hypothesisId: id }),
      tagged("pruneHypothesis", { expectedRevision: revision, hypothesisId: id, reason }),
      tagged("retryAttempt", { expectedRevision: revision, attemptId: id }),
      tagged("cancel", { expectedRevision: revision, reason }, ["reason"]),
      tagged("requestPromotion", { expectedRevision: revision, candidateId: id }),
      tagged("requestRollback", { expectedRevision: revision, promotionId: id }),
      tagged("requestReport", { expectedRevision: revision }),
      tagged("requestCleanup", { expectedRevision: revision }),
    ],
  } as const;

  const evaluatorRecord = object({
    version: { const: 1 },
    runId: id,
    evaluationId: id,
    contractDigest: sha256,
    epochDigest: sha256,
    oid: gitOid,
    evaluatorId: id,
    parserVersion: id,
    split: { enum: ["development", "heldOut"] },
    metric: metricText,
    unit: metricText,
    value: decimal,
    seed: { type: "integer", minimum: 0, maximum: MAX_SAFE },
    trialOrdinal: { type: "integer", minimum: 1, maximum: 100_000 },
    outputDigest: sha256,
    artifacts: array(object({ artifactId: id, digest: sha256 }), 512),
    requiredOutputs: array(object({ path: relativePath, digest: sha256 }), 128),
    containmentId: id,
    environmentDigest: sha256,
  });

  const evaluationPolicy = object(
    {
      version: { const: 1 }, evaluatorVersion: shortText, split: { enum: ["development", "heldOut"] }, parserVersion: id,
      configurationDigest: sha256, environmentDigest: sha256, executableDigest: sha256, quantum,
      trialCount: { type: "integer", minimum: 1, maximum: 99 }, seeds: array({ type: "integer", minimum: 0, maximum: MAX_SAFE }, 99, 1, true), trialOrder: array({ type: "integer", minimum: 1, maximum: 99 }, 99, 1, true),
      aggregation: { enum: ["single", "median"] }, nondeterminismTolerance: decimal,
      containmentPolicyDigest: sha256, containmentCertificateDigest: sha256, heldOutIsolationCertificateDigest: sha256,
      strictProtocol: { const: true }, policyDigest: sha256,
    },
    ["version", "evaluatorVersion", "split", "parserVersion", "configurationDigest", "environmentDigest", "executableDigest", "quantum", "trialCount", "seeds", "trialOrder", "aggregation", "nondeterminismTolerance", "containmentPolicyDigest", "containmentCertificateDigest", "strictProtocol", "policyDigest"],
  );

  const evaluationCertificate = object(
    {
      version: { const: 1 },
      certificateId: id,
      evaluationId: id,
      runId: id,
      epochDigest: sha256,
      contractDigest: sha256,
      role: { enum: ["developmentBaseline", "heldOutBaseline", "developmentCandidate", "heldOutCandidate"] },
      oid: gitOid,
      evaluatorId: id,
      parserVersion: id,
      metric: metricText,
      unit: metricText,
      quantum,
      rawTrials: array(decimal, 99, 1),
      quantizedUnits: array({ type: "string", pattern: "^-?(?:0|[1-9][0-9]{0,38})$", maxLength: 40 }, 99, 1),
      aggregateUnits: { type: "string", pattern: "^-?(?:0|[1-9][0-9]{0,38})$", maxLength: 40 },
      spreadUnits: { type: "string", pattern: "^(?:0|[1-9][0-9]{0,38})$", maxLength: 39 },
      valid: { type: "boolean" },
      rejectionReason: reason,
      outputDigest: sha256,
      trust: { enum: ["fixture", "certified"] }, policy: evaluationPolicy,
      baseOid: gitOid, candidateOid: gitOid, mergeCandidateOid: gitOid, requiredOutputsDigest: sha256,
      protectedManifestDigest: sha256, containmentCertificateDigest: sha256, heldOutIsolationCertificateDigest: sha256,
      strictProtocol: { const: true }, evaluatorVersion: shortText, configurationDigest: sha256, environmentDigest: sha256,
      split: { enum: ["development", "heldOut"] }, seeds: array({ type: "integer", minimum: 0, maximum: MAX_SAFE }, 99, 0),
      trialOrder: array({ type: "integer", minimum: 1, maximum: 99 }, 99, 0), startAt: timestamp, endAt: timestamp,
      exitStatuses: array(object({ exitCode: { type: "integer", minimum: 0, maximum: 255 }, timedOut: { type: "boolean" }, cancelled: { type: "boolean" }, oversized: { type: "boolean" } }), 99),
      logs: array(object({ stdoutDigest: sha256, stderrDigest: sha256, stdoutBytes: { type: "integer", minimum: 0, maximum: 1_048_576 }, stderrBytes: { type: "integer", minimum: 0, maximum: 1_048_576 } }), 99),
      artifacts: array(object({ artifactId: id, digest: sha256 }), 512),
      requiredOutputs: array(object({ path: relativePath, digest: sha256, type: { enum: ["file", "symlink"] }, mode: { type: "integer", minimum: 0, maximum: 4095 } }), 128),
      protectedManifest: array(object({ path: relativePath, oid: gitOid, mode: { type: "string", pattern: "^[0-7]{6}$" }, type: shortText }), 100_000),
      containmentIdentities: array(id, 99), exactBindingsDigest: sha256, descendantTerminationObserved: { type: "boolean" }, limitations: array(reason, 128),
    },
    ["version", "certificateId", "evaluationId", "runId", "epochDigest", "contractDigest", "role", "oid", "evaluatorId", "parserVersion", "metric", "unit", "quantum", "rawTrials", "quantizedUnits", "aggregateUnits", "spreadUnits", "valid", "outputDigest", "trust"],
  );

  const hypothesis = object(
    {
      version: { const: 1 }, hypothesisId: id, parentHypothesisId: id,
      state: { enum: ["PROPOSED", "PENDING", "SELECTED", "RUNNING", "CANDIDATE", "RETRYABLE", "FAILED", "INTERRUPTED", "RECONCILING", "INDETERMINATE", "VERIFYING_HELD_OUT", "VERIFIED", "REJECTED", "QUARANTINED", "PROMOTABLE", "PROMOTED", "STALE_BASE", "ROLLED_BACK", "PRUNED", "CANCELLED"] },
      rationale: reason,
      plan: array({ type: "string", minLength: 1, maxLength: 1000 }, 32, 1),
      lessons: array(reason, 32),
      attemptIds: array(id, 10_000, 0, true),
    },
    ["version", "hypothesisId", "state", "rationale", "plan", "lessons", "attemptIds"],
  );

  const attempt = object(
    {
      version: { const: 1 }, attemptId: id, hypothesisId: id,
      ordinal: { type: "integer", minimum: 1, maximum: 10_000 },
      state: { enum: ["RESERVED", "PREPARING", "READY", "DISPATCHING", "RUNNING", "COLLECTING", "FINALIZING", "CANDIDATE", "REJECTED", "INTERRUPTED", "RECONCILING", "PARTIAL", "RETRYABLE", "CANCELLED", "INDETERMINATE", "RETRIED"] },
      dispatchKey: id, effectId: id, workspaceId: id, budgetReservationId: id, childHandleDigest: sha256, candidateId: id, retryOfAttemptId: id,
    },
    ["version", "attemptId", "hypothesisId", "ordinal", "state", "dispatchKey", "effectId", "workspaceId", "budgetReservationId"],
  );

  const processUnit = object({
    version: { const: 1 }, kind: { enum: ["cgroup", "container", "processGroup"] }, identityDigest: sha256,
    startIdentity: { type: "string", minLength: 1, maxLength: 256 }, containmentId: id, descendantOwned: { const: true },
  });
  const fingerprintObservation = object({
    version: { const: 1 }, certificateId: id, beforeDigest: sha256, afterDigest: sha256, equal: { type: "boolean" },
    effectId: id, fence: revision, containmentId: id, reportGenerationId: id,
  });
  const effectIdentity = object(
    {
      version: { const: 1 }, boundary: { enum: ["workspace", "child", "evaluator", "git", "report", "cleanup", "outbox"] },
      action: { enum: ["materializeWorkspace", "finalizeCandidate", "spawnChild", "evaluate", "git", "buildPromotionCandidate", "applyWinnerRef", "applyRollbackRef", "publishReport", "cleanup", "outbox"] },
      fence: revision, expectedRevision: revision, intentDigest: sha256, workspaceId: id, dispatchKey: id, containmentId: id,
      evaluationId: id, certificateId: id, evaluationRole: { enum: ["developmentBaseline", "heldOutBaseline", "developmentCandidate", "heldOutCandidate"] },
      oid: gitOid, candidateId: id, generationId: id, cleanupId: id, resourceId: id, outboxSequence: revision,
    },
    ["version", "boundary", "action", "fence", "expectedRevision", "intentDigest"],
  );
  const effectObservation = object(
    {
      version: { const: 1 }, observationId: id, effectId: id, classification: { enum: ["COMPLETED", "ACTIVE", "ABSENT", "UNCERTAIN"] },
      targetFence: revision, observedFence: revision, expectedRevision: revision, identityDigest: sha256, observedAt: timestamp,
      observerDigest: sha256, outcomeDigest: sha256, terminalStatus: { enum: ["completed", "failed", "cancelled"] },
      changedPaths: array(relativePath, 4096), rawResultDigest: sha256, boundedOutput: { type: "string", maxLength: 16_384 }, partial: { type: "boolean" },
      candidate: ref("candidate"), certificate: ref("evaluationCertificate"), processUnit, fingerprint: fingerprintObservation,
      reasons: array(reason, 32),
    },
    ["version", "observationId", "effectId", "classification", "targetFence", "observedFence", "expectedRevision", "identityDigest", "observedAt", "observerDigest", "reasons"],
  );
  const effect = object(
    {
      version: { const: 1 }, effectId: id,
      kind: { enum: ["workspace", "agent", "evaluation", "git", "report", "cleanup", "outbox", "promotion", "rollback"] },
      state: { enum: ["INTENDED", "DISPATCHING", "STARTED", "OBSERVING", "OBSERVED", "COMMITTED", "FAILED_ABSENT", "FAILED", "INDETERMINATE", "CANCEL_REQUESTED", "CANCELLED_CONFIRMED"] },
      idempotencyKey, identity: effectIdentity, attemptId: id, correlationDigest: sha256, processUnit,
      latestObservationId: id, acceptedOutcomeDigest: sha256,
      interruptedFromAttemptState: { enum: ["RESERVED", "PREPARING", "READY", "DISPATCHING", "RUNNING", "COLLECTING", "FINALIZING", "CANDIDATE", "REJECTED", "INTERRUPTED", "RECONCILING", "PARTIAL", "RETRYABLE", "CANCELLED", "INDETERMINATE", "RETRIED"] },
      interruptedFromPhase: { enum: ["OBSERVE", "IDEATE", "SELECT", "PREPARE", "DISPATCH", "COLLECT", "FINALIZE", "EVALUATE_DEV", "BACKPROPAGATE", "DECIDE", "VERIFY_CANDIDATE", "FINALIZE_RUN", "RECONCILING", "WAITING_INPUT", "PAUSED", "CANCELLING", "INDETERMINATE", "QUARANTINED"] },
      monitoringResumedAt: timestamp,
    },
    ["version", "effectId", "kind", "state", "idempotencyKey", "identity"],
  );

  const agentChild = object(
    {
      version: { const: 1 }, childId: id, attemptId: id, effectId: id, dispatchKey: id, fence: revision,
      childHandleDigest: sha256, workflowCorrelationDigest: sha256, requestDigest: sha256, containmentId: id,
      state: { enum: ["STARTED", "ACTIVE", "COMPLETED", "FAILED", "CANCEL_REQUESTED", "CANCELLED_CONFIRMED", "INDETERMINATE"] },
      processUnit, resultDigest: sha256,
    },
    ["version", "childId", "attemptId", "effectId", "dispatchKey", "fence", "childHandleDigest", "workflowCorrelationDigest", "requestDigest", "containmentId", "state"],
  );
  const budgetReservation = object({
    version: { const: 1 }, budgetReservationId: id, attemptId: id, dispatchKey: id, effectId: id,
    ordinal: { type: "integer", minimum: 1, maximum: 10_000 }, state: { enum: ["RESERVED", "CONSUMED", "RETAINED"] },
  });
  const runSuspension = object({ version: { const: 1 }, kind: { enum: ["pause", "recovery"] }, priorState: shortText, priorPhase: shortText, effectId: id }, ["version", "kind", "priorState", "priorPhase"]);

  const candidate = object({
    version: { const: 1 }, candidateId: id, hypothesisId: id, attemptId: id,
    baseOid: gitOid, candidateOid: gitOid, changedPaths: array(relativePath, 4096, 0, true), manifestDigest: sha256,
  });

  const workerClaim = object(
    {
      version: { const: 1 }, attemptId: id, claimedMetric: decimal, changedPaths: array(relativePath, 4096, 0, true),
      rawResultDigest: sha256, terminalStatus: { enum: ["completed", "failed", "cancelled"] },
      boundedPreview: { type: "string", maxLength: 16_384 }, informational: { const: true },
    },
    ["version", "attemptId", "changedPaths", "informational"],
  );

  const mergeDiffEntry = object(
    { status: shortText, oldMode: { type: "string", pattern: "^[0-7]{6}$" }, newMode: { type: "string", pattern: "^[0-7]{6}$" }, oldOid: gitOid, newOid: gitOid, paths: array(relativePath, 2, 1, true), type: { enum: ["file", "symlink", "deleted"] }, symlinkTarget: { type: "string", minLength: 1, maxLength: 512 } },
    ["status", "oldMode", "newMode", "oldOid", "newOid", "paths", "type"],
  );
  const mergeConstruction = object(
    {
      version: { const: 1 }, constructionId: id, role: { enum: ["heldOutBaseline", "heldOutCandidate"] }, candidateId: id,
      expectedResearchTrunkOid: gitOid, candidateOid: gitOid, mergeCandidateOid: gitOid, treeOid: gitOid, algorithmDigest: sha256,
      diffEntries: array(mergeDiffEntry, 4096), changedPaths: array(relativePath, 4096, 0, true),
      requiredOutputs: array(object({ path: relativePath, digest: sha256, mode: { type: "string", pattern: "^[0-7]{6}$" }, type: { enum: ["file", "symlink"] } }), 128),
      requiredOutputsDigest: sha256,
      protectedManifest: array(object({ path: relativePath, mode: { type: "string", pattern: "^[0-7]{6}$" }, type: shortText, oid: gitOid }), 100_000),
      protectedManifestDigest: sha256, fullTreeManifestDigest: sha256, beforeRefsDigest: sha256, afterRefsDigest: sha256, manifestDigest: sha256,
    },
    ["version", "constructionId", "role", "expectedResearchTrunkOid", "candidateOid", "mergeCandidateOid", "treeOid", "algorithmDigest", "diffEntries", "changedPaths", "requiredOutputs", "requiredOutputsDigest", "protectedManifest", "protectedManifestDigest", "fullTreeManifestDigest", "beforeRefsDigest", "afterRefsDigest", "manifestDigest"],
  );
  const authorizationPayload = object({
    version: { const: 1 }, kind: { enum: ["promote", "rollback"] }, challengeId: id, runId: id, repositoryId: id, promotionId: id,
    candidateId: id, candidateOid: gitOid, mergeCandidateOid: gitOid, heldOutCertificateDigest: sha256, contractDigest: sha256,
    winnerRef: { type: "string", pattern: "^refs/pi-fabric-arbor/[a-z][a-z0-9_]{2,63}/winner$", maxLength: 96 },
    expectedCurrentOid: gitOid, predecessorOid: gitOid, expiresAt: timestamp, nonce: opaqueToken, principalId: id,
  });
  const authorizationRecord = object(
    {
      version: { const: 1 }, authorizationId: id, challengeId: id, challengeDigest: sha256, payload: authorizationPayload,
      nonceDigest: sha256, principalId: id, keyId: id, signature: opaqueToken, issuedAt: timestamp,
      state: { enum: ["CHALLENGE_ISSUED", "SIGNED", "STORED", "CONSUMED", "EXPIRED", "REVOKED"] }, consumedById: id,
    },
    ["version", "authorizationId", "challengeId", "challengeDigest", "payload", "nonceDigest", "principalId", "keyId", "state"],
  );
  const fabricPolicyTraversal = object({
    version: { const: 1 }, boundary: { enum: ["certified-production-host", "explicit-test-fixture"] }, action: { enum: ["arbor.applyWinnerRef", "arbor.applyRollbackRef"] }, argsDigest: sha256,
    runId: id, operationId: id, promotionId: id, candidateId: id, authorizationId: id,
    parentToolCallId: hostCorrelation, nestedToolCallId: hostCorrelation, traversedAt: timestamp,
    b9CertificationId: { const: "approval_runtime_b9_v1" }, b9CertificationDigest: sha256, traversalDigest: sha256,
  }, ["version", "boundary", "action", "argsDigest", "runId", "operationId", "promotionId", "candidateId", "authorizationId", "parentToolCallId", "nestedToolCallId", "traversedAt", "traversalDigest"]);
  const promotion = object(
    {
      version: { const: 1 }, promotionId: id,
      state: { enum: ["REQUESTED", "PREPARING", "CANDIDATE_BUILT", "VERIFYING", "PREPARED", "AWAITING_AUTHORIZATION", "AWAITING_FABRIC_POLICY", "COMMIT_PLANNED", "REF_APPLYING", "REF_OBSERVED", "COMMITTED", "REPORT_PENDING", "REPORTED", "REJECTED", "STALE_BASE", "INDETERMINATE", "ROLLBACK_REQUESTED", "AWAITING_ROLLBACK_AUTHORIZATION", "ROLLBACK_PLANNED", "ROLLBACK_APPLYING", "ROLLBACK_OBSERVED", "ROLLED_BACK"] },
      candidateId: id, candidateOid: gitOid, expectedResearchTrunkOid: gitOid, mergeCandidateOid: gitOid, mergeConstructionId: id,
      heldOutCertificateId: id, heldOutCertificateDigest: sha256,
      winnerRef: { type: "string", pattern: "^refs/pi-fabric-arbor/[a-z][a-z0-9_]{2,63}/winner$", maxLength: 96 },
      expectedCurrentOid: gitOid, predecessorOid: gitOid, authorizationId: id, authorizationDigest: sha256,
      fabricPolicyTraversal, fabricPolicyTraversalDigest: sha256, effectId: id, observedOid: gitOid, observationDigest: sha256, committedAt: timestamp,
      rollbackAuthorizationId: id, rollbackAuthorizationDigest: sha256, rollbackFabricPolicyTraversal: fabricPolicyTraversal, rollbackFabricPolicyTraversalDigest: sha256, rollbackEffectId: id, rollbackObservedOid: gitOid, rolledBackAt: timestamp,
    },
    ["version", "promotionId", "state", "candidateId", "candidateOid", "expectedResearchTrunkOid", "winnerRef"],
  );

  const report = object(
    {
      version: { const: 1 }, generationId: id, revision,
      state: { enum: ["PLANNED", "WRITING", "FILES_OBSERVED", "PUBLISHED", "PUBLICATION_FAILED", "INDETERMINATE"] },
      dependencyDigests: array(sha256, 10_000, 1, true), expectedManifestDigest: sha256, observedManifestDigest: sha256,
    },
    ["version", "generationId", "revision", "state", "dependencyDigests"],
  );

  const cleanup = object({
    version: { const: 1 }, cleanupId: id, resourceId: id,
    resourceKind: { enum: ["workspace", "scratch", "agentChild", "evaluatorProcess", "temporaryReport"] },
    state: { enum: ["REQUESTED", "PLANNED", "EXECUTING", "OBSERVING", "COMPLETED", "CLEANUP_PENDING", "INDETERMINATE"] },
    reportDependencyDigests: array(sha256, 10_000, 0, true),
  });

  const gate = object(
    {
      version: { const: 1 }, gateId: id,
      answerKind: { enum: ["confirm", "singleChoice", "multiChoice", "boundedText"] },
      optionIds: array(id, 32, 0, true),
      state: { enum: ["OPEN", "ANSWERED", "EXPIRED", "REJECTED"] },
      expiresAt: timestamp,
      answer: gateAnswer,
    },
    ["version", "gateId", "answerKind", "optionIds", "state", "expiresAt"],
  );

  const driverLease = object({ version: { const: 1 }, driverId: id, fence: revision, acquiredAt: timestamp, expiresAt: timestamp });
  const storedIntent = object(
    {
      version: { const: 1 }, intentId: id, runId: id, intent: webIntent,
      state: { enum: ["PENDING", "CLAIMED", "APPLIED", "REJECTED_STALE", "REJECTED"] },
      submittedAt: timestamp, claimedByDriverId: id, rejectionReason: reason,
    },
    ["version", "intentId", "runId", "intent", "state", "submittedAt"],
  );
  const workerClaims = array(workerClaim, 10_000);
  const productionGateNames = ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"];
  const gateResults = object(Object.fromEntries(productionGateNames.map((gate) => [gate, { const: "PASS" }])), []);
  const gateEvidenceDigests = object(Object.fromEntries(productionGateNames.map((gate) => [gate, sha256])), []);
  const runtimeAdmissionProperties = { version: { const: 1 }, mode: { enum: ["fixture", "production-blocked", "production-certified"] }, admissionDigest: sha256, configurationDigest: sha256, packageInventoryDigest: sha256, packagedDistDigest: sha256, arborSourceDigest: sha256, piFabricPackageDigest: sha256, hostPiFabricPackageDigest: sha256, certificationArtifactDigest: sha256, piFabricVersion: { enum: [...CERTIFIED_PI_FABRIC_VERSIONS_V1, "unavailable"] }, certificateIds: array(id, 64, 0, true), certificateDigests: array(sha256, 64, 0, true), productionCertificateId: id, productionCertificateDigest: sha256, productionCertificatePath: relativePath, distributionCertificateId: id, distributionCertificateDigest: sha256, distributionCertificatePath: relativePath, adapterIdentityDigest: sha256, fabricApprovalRuntimeCertificateDigest: sha256, fabricApprovalRuntimeCertificatePath: relativePath, gateResults, gateEvidenceDigests, blockers: array(reason, 128) };
  const runtimeAdmission = object(runtimeAdmissionProperties, Object.keys(runtimeAdmissionProperties).filter((key) => !["productionCertificateId", "productionCertificateDigest", "productionCertificatePath", "distributionCertificateId", "distributionCertificateDigest", "distributionCertificatePath", "adapterIdentityDigest", "fabricApprovalRuntimeCertificateDigest", "fabricApprovalRuntimeCertificatePath"].includes(key)));
  const runAggregate = object(
    {
      version: { const: 1 }, runId: id, revision, sequence: revision, contract,
      contractDigest: sha256, epochDigest: sha256, runtimeAdmission,
      state: { enum: ["STAGED", "ADMITTED", "BASELINING", "EXPLORING", "VERIFYING_FINAL", "AWAITING_PROMOTION", "PROMOTING", "COMPLETED", "WAITING_INPUT", "PAUSED", "CANCELLING", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED", "REPORT_PENDING", "CLEANUP_PENDING", "ROLLBACK_REQUESTED", "ROLLING_BACK", "ROLLED_BACK"] },
      phase: { enum: ["OBSERVE", "IDEATE", "SELECT", "PREPARE", "DISPATCH", "COLLECT", "FINALIZE", "EVALUATE_DEV", "BACKPROPAGATE", "DECIDE", "VERIFY_CANDIDATE", "FINALIZE_RUN", "RECONCILING", "WAITING_INPUT", "PAUSED", "CANCELLING", "INDETERMINATE", "QUARANTINED"] },
      outcome: { enum: ["NO_PROMOTION", "PROMOTED", "ROLLED_BACK", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED"] },
      driver: driverLease, suspension: runSuspension,
      hypotheses: array(hypothesis, 10_000), attempts: array(attempt, 10_000), effects: array(effect, 100_000),
      effectObservations: array(effectObservation, 100_000), agentChildren: array(agentChild, 10_000), budgetReservations: array(budgetReservation, 10_000),
      dispatchIntents: array(ref("agentDispatchIntent"), 10_000), gates: array(gate, 10_000),
      candidates: array(candidate, 10_000), certificates: array(evaluationCertificate, 100_000),
      mergeConstructions: array(mergeConstruction, 10_000), promotions: array(promotion, 10_000), authorizations: array(authorizationRecord, 20_000),
      intents: array(storedIntent, 100_000), reports: array(report, 10_000), cleanup: array(cleanup, 100_000),
      workerClaims, pinnedHypothesisIds: array(id, 10_000, 0, true),
      developmentBaselineCertificateId: id, heldOutBaselineCertificateId: id, heldOutBaselineConstructionId: id, bestCandidateId: id,
      yielded: { type: "boolean" }, createdAt: timestamp, updatedAt: timestamp,
    },
    ["version", "runId", "revision", "sequence", "contract", "contractDigest", "epochDigest", "state", "phase", "hypotheses", "attempts", "effects", "effectObservations", "agentChildren", "budgetReservations", "dispatchIntents", "gates", "candidates", "certificates", "mergeConstructions", "promotions", "authorizations", "intents", "reports", "cleanup", "workerClaims", "pinnedHypothesisIds", "yielded", "createdAt", "updatedAt"],
  );

  const directive = {
    oneOf: [
      tagged("evaluateBaseline", { role: { enum: ["developmentBaseline", "heldOutBaseline"] }, oid: gitOid }),
      tagged("coordinateHypothesis"), tagged("selectHypothesis", { hypothesisId: id }),
      tagged("reserveAgentDispatch", { hypothesisId: id }), tagged("materializeWorkspace", { attemptId: id }),
      tagged("dispatchAgent", { dispatch: ref("agentDispatchIntent") }), tagged("finalizeCandidate", { attemptId: id }),
      tagged("evaluateCandidate", { candidateId: id, oid: gitOid }),
      tagged("buildPromotionCandidate", { role: { enum: ["heldOutBaseline", "heldOutCandidate"] }, expectedResearchTrunkOid: gitOid, candidateId: id, promotionId: id }, ["candidateId", "promotionId"]),
      tagged("evaluateHeldOutCandidate", { promotionId: id, candidateId: id, oid: gitOid }), tagged("finalizeRun"),
      tagged("processIntent", { intentId: id }), tagged("planReport"), tagged("publishReport", { generationId: id }), tagged("done"),
    ],
  } as const;
  const commandReceipt = object(
    { version: { const: 1 }, commandId: id, runId: id, revision, sequence: revision, duplicate: { type: "boolean" }, eventTypes: array(shortText, 64, 1), directive },
    ["version", "commandId", "runId", "revision", "sequence", "duplicate", "eventTypes"],
  );
  const intentReceipt = object({ version: { const: 1 }, intentId: id, runId: id, state: { enum: ["PENDING", "CLAIMED", "APPLIED", "REJECTED_STALE", "REJECTED"] }, revision });
  const publicEvent = object({ version: { const: 1 }, runId: id, sequence: revision, revision, type: shortText, at: timestamp });
  const eventPage = object({
    version: { const: 1 }, runId: id, afterSequence: revision, events: array(publicEvent, 200),
    nextSequence: revision, hasMore: { type: "boolean" },
  });
  const agentDispatchIntent = object({
    version: { const: 1 }, effectId: id, dispatchKey: id, runId: id, hypothesisId: id, attemptId: id,
    fence: revision, workspaceId: id, containmentId: id, cwdToken: opaqueToken, agentProfileId: id,
    requestSchemaDigest: sha256, resultSchemaDigest: sha256, toolPolicyId: id, budgetReservationId: id, expiresAt: timestamp,
  });
  const authorization = authorizationRecord;
  const trustedPrincipal = object({ principalId: id, osUid: revision, publicKey: { type: "string", minLength: 1, maxLength: 1024 }, allowedActions: array({ enum: ["promote", "rollback"] }, 2, 1, true), repositoryIds: array(id, 1024, 1, true), expiresAt: timestamp }, ["principalId", "osUid", "publicKey", "allowedActions", "repositoryIds"]);
  const trustedPrincipalConfiguration = object({ version: { const: 1 }, principals: array(trustedPrincipal, 64, 1), revokedAuthorizationIds: array(id, 10_000, 0, true), revokedNonceDigests: array(sha256, 10_000, 0, true) });

  const commandMetadata = object({ runId: id, expectedRevision: revision, idempotencyKey });
  const webSession = object({
    version: { const: 1 }, sessionId: id, runId: id, idempotencyKey,
    csrfValidated: { const: true }, originValidated: { const: true },
  });
  const pagination = object({ afterSequence: revision, limit: { type: "integer", minimum: 1, maximum: 200 } });
  const artifactReadCapability = object({ version: { const: 1 }, grantId: id, token: opaqueToken, artifactId: id, expectedDigest: sha256, principalId: id, runId: id, effectId: id, expiresAt: timestamp, maxReads: { type: "integer", minimum: 1, maximum: 100 } });
  const artifactCapabilityRead = object({ version: { const: 1 }, capability: artifactReadCapability, offset: { type: "integer", minimum: 0, maximum: MAX_SAFE }, limit: { type: "integer", minimum: 1, maximum: 1_048_576 } });
  const cleanupExecutionRequest = object({ version: { const: 1 }, cleanupId: id, resourceId: id, resourceKind: { enum: ["workspace", "scratch", "agentChild", "evaluatorProcess", "temporaryReport"] }, runId: id, effectId: id });
  const artifactRead = object({ artifactId: id, offset: { type: "integer", minimum: 0, maximum: MAX_SAFE }, limit: { type: "integer", minimum: 1, maximum: 65_536 } });
  const view = (kind: string, data: JsonSchema): JsonSchema => object({
    version: { const: 1 }, kind: { const: kind }, runId: id, revision, cursor: revision, data,
  });
  const contractProperties = contract.properties as Record<string, JsonSchema>;
  const summaryProjection = object({ state: shortText, phase: shortText, outcome: shortText, nextAction: shortText, revision, epochDigest: sha256, trust: shortText, executionGate: shortText });
  const projection = (properties: Record<string, JsonSchema>): JsonSchema => object({ summary: summaryProjection, ...properties });
  const webView = {
    oneOf: [
      view("overview", projection({ baselines: {}, bestCandidate: {}, budgets: {}, epochs: {}, gates: {}, reportStatus: shortText, cleanupDebt: revision, retention: {}, yielded: { type: "boolean" } })),
      view("tree", projection({ hypotheses: {}, lineagePolicy: reason })),
      view("attempts", projection({ attempts: {}, workerClaimsPolicy: reason })),
      view("compare", projection({ baseline: {}, comparisons: {}, mergeConstructions: {}, comparisonPolicy: {} })),
      view("metrics", projection({ metric: contractProperties.metric!, epochs: {}, certificates: {} })),
      view("resources", projection({ workspaces: {}, refs: {}, effects: {}, reconciliation: {}, children: {}, evaluatorProcesses: {}, budgetReservations: {}, gates: {}, approvals: {}, cleanupDebt: {}, driverLeaseStatus: {}, confinement: {}, heldOutIsolation: shortText, fingerprintStatus: shortText })),
      view("promotion", projection({ heldOutIsolation: shortText, heldOutBaselineConstructionId: shortText, promotions: {}, challenges: {}, authorizationBoundary: reason, rollbackAndRePromotion: reason })),
      view("report", projection({ reports: {}, requiredForOutcome: shortText, obligationStatus: shortText, dependencies: {}, retention: {}, cleanup: {} })),
      view("contract", projection({ contract, contractDigest: sha256, epochDigest: sha256, immutability: reason, confinement: reason, heldOut: reason })),
    ],
  } as const;

  const evidenceFile = object({
    path: relativePath, type: { enum: ["file", "symlink"] }, bytes: { type: "integer", minimum: 0, maximum: MAX_SAFE },
    mode: { type: "integer", minimum: 0, maximum: 4095 }, digest: sha256, supportsClaims: array(shortText, 128, 1, true),
  });
  const commandEvidence = object({
    name: shortText, argv: array({ type: "string", minLength: 1, maxLength: 4096 }, 128, 1), commandDigest: sha256,
    exitCode: { type: "integer", minimum: 0, maximum: 255 }, stdoutDigest: sha256, stderrDigest: sha256,
    logPath: relativePath, logDigest: sha256, complete: { type: "boolean" },
  });
  const upstreamCertification = object({
    version: { const: 1 }, certificationId: id, createdAt: timestamp, project: { const: "pi-fabric" }, installedVersion: { enum: [...CERTIFIED_PI_FABRIC_VERSIONS_V1] },
    repositoryUrl: { type: "string", minLength: 1, maxLength: 2048, pattern: "^https://[^\\s]+$" }, revision: { type: "string", minLength: 1, maxLength: 512 },
    platform: object({ os: shortText, architecture: shortText, release: shortText, runtime: shortText }), toolVersions: array(object({ toolId: id, version: shortText }), 128, 1),
    certificationToolDigests: array(object({ path: relativePath, bytes: revision, digest: sha256 }), 32, 1),
    packageLockProvenance: object({ lockfileVersion: revision, packagePath: { const: "node_modules/pi-fabric" }, resolved: { type: "string", minLength: 1, maxLength: 2048 }, integrity: { type: "string", minLength: 1, maxLength: 1024 }, entryDigest: sha256, lockfileDigest: sha256 }),
    payloadBounds: object({ maximumFiles: revision, maximumFileBytes: revision, maximumTotalBytes: revision, observedFiles: revision, observedBytes: revision }),
    files: array(evidenceFile, 10_000, 1), payloadManifestDigest: sha256, packageDigest: sha256, packageManifestDigest: sha256, exportMapDigest: sha256,
    publicExportDigests: array(object({ export: shortText, condition: shortText, path: relativePath, bytes: revision, digest: sha256 }), 128, 1),
    licenseNoticeDigests: array(object({ kind: { enum: ["license", "notice"] }, path: relativePath, bytes: revision, digest: sha256 }), 128, 1),
    interfaceDigests: object({ protocols: sha256, actionSchemas: sha256, componentInterfaces: sha256, approvalRepresentation: sha256, cancellationRepresentation: sha256, documentation: sha256 }),
    claimToFiles: array(object({ claim: shortText, files: array(relativePath, 10_000, 1, true) }), 128, 1), commands: array(commandEvidence, 128, 1),
    compatibilityCertificateId: id, compatibilityCertificateDigest: sha256, supportedVersions: array(shortText, 256, 0, true), rejectedVersions: array(shortText, 256, 0, true),
    provenance: object({ method: { const: "installedPackage" }, methodDigest: sha256, limitations: array(reason, 128) }), limitations: array(reason, 128),
    signerId: id, predecessorDigest: sha256, valid: { type: "boolean" }, certificateDigest: sha256,
  });
  const compatibilityCheck = object({ name: shortText, requirement: reason, passed: { type: "boolean" }, evidenceMode: { enum: ["direct-runtime", "direct-representation", "contract-harness", "not-tested"] }, observationDigest: sha256, details: reason });
  const digestEntry = object({ path: relativePath, bytes: revision, digest: sha256 });
  const compatibilityRuntimeEvidence = object({
    hostAgentArtifactDigest: sha256, hostAgentCertificationId: id, hostAgentCreatedAt: timestamp,
    approvalArtifactDigest: sha256, approvalCertificateDigest: sha256, approvalHarnessDigest: sha256,
    hostIntegrationArtifactDigest: sha256, hostIntegrationCertificateDigest: sha256, integrationTestDigest: sha256, integrationLogDigest: sha256,
    activePackageRuntimeDigest: sha256, hostPackageRuntimeDigest: sha256,
    toolSourceDigests: array(digestEntry, 32, 1), hostToolSourceDigests: array(digestEntry, 32, 1), arborSourceDigests: array(digestEntry, 32, 1),
  });
  const fabricCompatibilityCertificate = object({
    version: { const: 1 }, certificationId: id, createdAt: timestamp, piFabricVersion: { enum: [...CERTIFIED_PI_FABRIC_VERSIONS_V1] }, packageDigest: sha256, exportMapDigest: sha256,
    publicSchemaDigest: sha256, descriptorDigest: sha256, childCorrelationContractDigest: sha256, runtimeEvidence: compatibilityRuntimeEvidence, checks: array(compatibilityCheck, 256, 1),
    agentActions: array(object({ action: { enum: ["agents.run", "agents.spawn", "agents.wait", "agents.status", "agents.stop", "agents.cleanup"] }, runtimeTested: { type: "boolean" }, passed: { type: "boolean" }, observationDigest: sha256 }), 6, 6, true),
    supported: { type: "boolean" }, limitations: array(reason, 128), signerId: id, predecessorDigest: sha256, certificateDigest: sha256,
  }, ["version", "certificationId", "createdAt", "piFabricVersion", "packageDigest", "exportMapDigest", "publicSchemaDigest", "descriptorDigest", "childCorrelationContractDigest", "runtimeEvidence", "checks", "agentActions", "supported", "limitations", "signerId", "certificateDigest"]);

  const fingerprintCertificate = object({
    version: { const: 1 }, certificateId: id, runId: id, boundaryId: id, boundaryKind: shortText, effectId: id, commandId: id,
    correlationIds: array(id, 128, 1, true), fence: revision, expectedRevision: revision, containmentId: id,
    sourceRepositoryIdentityDigest: sha256, packageRepositoryIdentityDigest: sha256, beforeAt: timestamp, afterAt: timestamp,
    fingerprintSchemaDigest: sha256, fingerprintToolDigest: sha256, oracleToolDigest: sha256,
    beforeManifestDigest: sha256, afterManifestDigest: sha256, comparisonDigest: sha256, expectedPredicate: { const: "exactEquality" },
    equal: { type: "boolean" }, mismatches: array({ type: "string", minLength: 1, maxLength: 1024 }, 4096), reportGenerationId: id,
    previousCertificateDigest: sha256, signerId: id, signingPublicKey: { type: "string", minLength: 1, maxLength: 1024 },
    payloadDigest: sha256, signature: { type: "string", minLength: 1, maxLength: 256 }, certificateDigest: sha256,
  });
  const containmentCertificate = object({
    version: { const: 1 }, certificateId: id, createdAt: timestamp, adapter: { const: "linux-bubblewrap" },
    platform: object({ os: shortText, architecture: shortText, release: shortText, node: shortText }), bwrapVersion: shortText, bwrapDigest: sha256,
    adapterDigest: sha256, mountPolicyDigest: sha256, environmentPolicyDigest: sha256,
    cgroupVersion: { const: "v2" }, cgroupRunnerDigest: sha256, resourceLimitEnforcement: { const: "kernel-cgroup-v2" },
    requiredNamespaces: array(shortText, 16, 1, true),
    minimalDevices: array({ type: "string", minLength: 1, maxLength: 128 }, 16, 0, true),
    matrix: array(object({ name: shortText, passed: { type: "boolean" }, direct: { type: "boolean" }, observationDigest: sha256, limitation: reason }, ["name", "passed", "direct", "observationDigest"]), 256, 1),
    limitations: array(reason, 128), predecessorDigest: sha256, signerId: id, signingAlgorithm: { const: "Ed25519" }, signingPublicKey: { type: "string", minLength: 1, maxLength: 1024 }, valid: { type: "boolean" }, payloadDigest: sha256, signature: { type: "string", minLength: 1, maxLength: 256 }, certificateDigest: sha256,
  }, ["version", "certificateId", "createdAt", "adapter", "platform", "bwrapVersion", "bwrapDigest", "adapterDigest", "mountPolicyDigest", "environmentPolicyDigest", "cgroupVersion", "cgroupRunnerDigest", "resourceLimitEnforcement", "requiredNamespaces", "minimalDevices", "matrix", "limitations", "signerId", "signingAlgorithm", "signingPublicKey", "valid", "payloadDigest", "signature", "certificateDigest"]);

  const recoveryInjection = object({
    version: { const: 1 }, injectionId: id, boundaryId: id, iteration: { type: "integer", minimum: 1, maximum: 100 }, effectId: id,
    fence: revision, expectedRevision: revision, classification: { enum: ["COMPLETED", "ACTIVE", "ABSENT", "UNCERTAIN"] },
    finalState: { enum: ["COMMITTED", "FAILED_ABSENT", "INDETERMINATE"] }, acceptedDurableOutcomes: { const: 1 },
    externalExecutions: revision, replayExecutions: { const: 0 }, duplicateDispatches: { const: 0 }, duplicateCertificates: { const: 0 }, duplicateReports: { const: 0 }, duplicateCleanupDeletions: { const: 0 },
    processExitSignal: { const: "SIGKILL" }, restartCount: { const: 2 }, journalDigest: sha256,
    fingerprint: fingerprintObservation, fingerprintBindingDigest: sha256, freshProjectionDigest: sha256, reconstructedProjectionDigest: sha256,
  });
  const recoveryBoundary = object({
    version: { const: 1 }, boundaryId: id, name: shortText, injections: { type: "integer", minimum: 20, maximum: 100 }, classification: { enum: ["COMPLETED", "ACTIVE", "ABSENT", "UNCERTAIN"] },
    passed: { type: "boolean" }, outcomesDigest: sha256,
  });
  const recoveryCertificate = object({
    version: { const: 1 }, certificateId: id, createdAt: timestamp, boundaryCount: { const: 19 }, injectionsPerBoundary: { type: "integer", minimum: 20, maximum: 100 }, totalInjections: { type: "integer", minimum: 380, maximum: 1900 },
    harnessSourceDigest: sha256, schemaDigest: sha256, fingerprintCertificationId: id, fingerprintCertificationDigest: sha256,
    commands: array(object({ version: { const: 1 }, command: { type: "string", minLength: 1, maxLength: 4096 }, outcome: { const: "PASS" }, outputDigest: sha256 }), 32, 1),
    boundaries: array(recoveryBoundary, 19, 19, true), injections: array(recoveryInjection, 1900, 380), webCursorResetEqualityDigest: sha256,
    passed: { type: "boolean" }, limitations: array(reason, 128), certificateDigest: sha256,
  });

  const definitions: Record<string, JsonSchema> = {
    id, sha256, timestamp, revision, shortText, reason, objective, decimal, quantum, relativePath, relativeGlob,
    opaqueToken, idempotencyKey, hostCorrelation, gitOid, contract, gateAnswer, gate, webIntent, webSession, evaluatorRecord,
    evaluationPolicy, evaluationCertificate, hypothesis, attempt, processUnit, fingerprintObservation, effectIdentity, effectObservation, effect, agentChild, budgetReservation, runSuspension, candidate, workerClaim, mergeDiffEntry, mergeConstruction, authorizationPayload, authorizationRecord, fabricPolicyTraversal, promotion, report, cleanup, runtimeAdmission,
    driverLease, storedIntent, runAggregate, directive, commandReceipt, intentReceipt, publicEvent, eventPage,
    agentDispatchIntent, authorization, trustedPrincipal, trustedPrincipalConfiguration, commandMetadata, pagination, artifactReadCapability, artifactCapabilityRead, cleanupExecutionRequest, artifactRead, webView,
    evidenceFile, commandEvidence, upstreamCertification, compatibilityCheck, digestEntry, compatibilityRuntimeEvidence, fabricCompatibilityCertificate, fingerprintCertificate, containmentCertificate, recoveryInjection, recoveryBoundary, recoveryCertificate,
  };
  const root = (schema: JsonSchema): JsonSchema => ({ $schema: "https://json-schema.org/draft/2020-12/schema", $defs: definitions, ...schema });

  const metadata = ref("commandMetadata");
  const action = (properties: Record<string, JsonSchema> = {}, optional: readonly string[] = []): JsonSchema => {
    const all = { version: { const: 1 }, metadata, ...properties };
    return root(object(all, Object.keys(all).filter((key) => !optional.includes(key))));
  };
  const actionInputs: Record<string, JsonSchema> = {
    "arbor.start": action({ contract: ref("contract") }),
    "arbor.inspect": root(object({ version: { const: 1 }, runId: id, view: { enum: ["overview", "tree", "attempts", "compare", "metrics", "resources", "promotion", "report", "contract"] }, limit: { type: "integer", minimum: 1, maximum: 200 } }, ["version", "runId", "view"])),
    "arbor.claimDriver": action({ driverId: id, leaseMs: { type: "integer", minimum: 1000, maximum: 300_000 } }),
    "arbor.heartbeat": action({ leaseMs: { type: "integer", minimum: 1000, maximum: 300_000 } }),
    "arbor.signal": action({ signal: { enum: ["pause", "resume", "gateAnswer", "pin", "prune", "retry"] }, reason, entityId: id, answer: ref("gateAnswer") }, ["reason", "entityId", "answer"]),
    "arbor.cancel": action({ reason }, ["reason"]),
    "arbor.advance": action(),
    "arbor.reserveAgentDispatch": action({ hypothesisId: id, retryOfAttemptId: id }, ["retryOfAttemptId"]),
    "arbor.attachAgentChild": action({ attemptId: id, childHandle: opaqueToken, dispatchKey: id, workflowCorrelationDigest: sha256, requestDigest: sha256, processUnit }, ["workflowCorrelationDigest", "requestDigest", "processUnit"]),
    "arbor.submitAgentObservation": action({
      attemptId: id, dispatchKey: id, rawResultDigest: sha256,
      terminalStatus: { enum: ["completed", "failed", "cancelled"] },
      changedPaths: array(relativePath, 4096), claimedMetric: decimal,
      boundedOutput: { type: "string", maxLength: 16_384 },
    }, ["claimedMetric", "boundedOutput"]),
    "arbor.interruptEffect": action({ effectId: id, reason }),
    "arbor.reconcileEffect": action({ observation: effectObservation }),
    "arbor.resumeEffect": action({ effectId: id }),
    "arbor.observeEffectCancellation": action({ effectId: id, outcome: { enum: ["confirmed", "uncertain"] }, observerDigest: sha256, fingerprint: fingerprintObservation }, ["fingerprint"]),
    "arbor.materializeWorkspace": action({ attemptId: id }),
    "arbor.finalizeCandidate": action({ attemptId: id }),
    "arbor.evaluate": action({ role: { enum: ["developmentBaseline", "heldOutBaseline", "developmentCandidate", "heldOutCandidate"] }, oid: gitOid, candidateId: id }, ["candidateId"]),
    "arbor.buildPromotionCandidate": action({ role: { enum: ["heldOutBaseline", "heldOutCandidate"] }, expectedResearchTrunkOid: gitOid, candidateId: id, promotionId: id }, ["candidateId", "promotionId"]),
    "arbor.planPromotionCommit": action({ promotionId: id, authorizationId: id }),
    "arbor.applyWinnerRef": action({ promotionId: id }),
    "arbor.observeWinnerRef": action({ promotionId: id }),
    "arbor.planRollback": action({ promotionId: id, authorizationId: id }),
    "arbor.applyRollbackRef": action({ promotionId: id }),
    "arbor.observeRollbackRef": action({ promotionId: id }),
    "arbor.planReport": action(),
    "arbor.publishReport": action({ generationId: id }),
    "arbor.observeReport": action({ generationId: id }),
    "arbor.planCleanup": action({ resourceId: id, resourceKind: { enum: ["workspace", "scratch", "agentChild", "evaluatorProcess", "temporaryReport"] } }),
    "arbor.executeCleanup": action({ cleanupId: id }),
    "arbor.observeCleanup": action({ cleanupId: id, outcome: { enum: ["completed", "pending", "indeterminate"] } }),
  };

  const actionOutputs = Object.fromEntries(Object.keys(actionInputs).map((name) => [name, root(name === "arbor.inspect" ? webView : commandReceipt)]));
  const schemas = Object.fromEntries(Object.entries(definitions).map(([name, schema]) => [name, root(schema)]));
  return Object.freeze({
    version: 1,
    gitOidLength,
    schemas: Object.freeze(schemas),
    actionInputs: Object.freeze(actionInputs),
    actionOutputs: Object.freeze(actionOutputs),
  });
}

/** Fixture default only. Production must generate schemas using its certified repository hash length. */
export const FIXTURE_SCHEMAS_V1 = createArborSchemaCatalogV1(40);
