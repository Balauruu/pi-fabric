import type { JsonSchema } from "../schemas/catalog.js";
import { validateJsonSchema } from "../schemas/validate.js";
import { canonicalJson } from "../util/canonical.js";
import { redactValue } from "./redaction.js";

export interface WebRouteContractV1 {
  version: 1;
  method: "GET" | "POST" | "DELETE";
  path: string;
  query: readonly string[];
  requestBody: "none" | "bootstrap.v1" | "webIntent.v1";
  response: string;
  mutationAuthority: "none" | "session-only" | "inbox-only";
  maxResponseBytes: number;
}

export const WEB_READ_ROUTES_V1: readonly WebRouteContractV1[] = Object.freeze([
  { version: 1, method: "GET", path: "/api/v1/session", query: [], requestBody: "none", response: "session.v1", mutationAuthority: "none", maxResponseBytes: 65_536 },
  { version: 1, method: "GET", path: "/api/v1/runs", query: ["limit"], requestBody: "none", response: "runList.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId", query: ["limit"], requestBody: "none", response: "overview.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/tree", query: ["limit"], requestBody: "none", response: "tree.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/attempts", query: ["limit"], requestBody: "none", response: "attempts.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/attempts/:attemptId", query: [], requestBody: "none", response: "attemptDetail.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/comparisons", query: ["limit"], requestBody: "none", response: "comparisons.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/metrics", query: ["limit"], requestBody: "none", response: "metrics.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/events", query: ["after", "limit"], requestBody: "none", response: "eventBatch.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/resources", query: ["limit"], requestBody: "none", response: "resources.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/promotions", query: ["limit"], requestBody: "none", response: "promotions.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/report", query: ["limit"], requestBody: "none", response: "report.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/runs/:runId/contract", query: ["limit"], requestBody: "none", response: "contract.v1", mutationAuthority: "none", maxResponseBytes: 1_048_576 },
  { version: 1, method: "GET", path: "/api/v1/artifacts/:artifactId", query: ["offset", "limit", "runId", "effectId"], requestBody: "none", response: "artifactPage.v1", mutationAuthority: "none", maxResponseBytes: 65_536 + 4096 },
  { version: 1, method: "GET", path: "/api/v1/diffs/:artifactId", query: ["offset", "limit", "runId", "effectId"], requestBody: "none", response: "diffPage.v1", mutationAuthority: "none", maxResponseBytes: 65_536 + 4096 },
  { version: 1, method: "GET", path: "/api/v1/stream", query: ["runId", "cursor"], requestBody: "none", response: "sseStream.v1", mutationAuthority: "none", maxResponseBytes: 1_179_648 },
]);

export const WEB_MUTATION_ROUTES_V1: readonly WebRouteContractV1[] = Object.freeze([
  { version: 1, method: "POST", path: "/api/v1/session/bootstrap", query: [], requestBody: "bootstrap.v1", response: "session.v1", mutationAuthority: "session-only", maxResponseBytes: 65_536 },
  { version: 1, method: "DELETE", path: "/api/v1/session", query: [], requestBody: "none", response: "sessionRevocation.v1", mutationAuthority: "session-only", maxResponseBytes: 65_536 },
  { version: 1, method: "POST", path: "/api/v1/runs/:runId/intents", query: [], requestBody: "webIntent.v1", response: "intentReceipt.v1", mutationAuthority: "inbox-only", maxResponseBytes: 65_536 },
]);

export const WEB_ROUTES_V1: readonly WebRouteContractV1[] = Object.freeze([...WEB_READ_ROUTES_V1, ...WEB_MUTATION_ROUTES_V1]);

const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const closed = (properties: Record<string, JsonSchema>, required: readonly string[] = Object.keys(properties)): JsonSchema => ({ type: "object", additionalProperties: false, required, properties });
const array = (items: JsonSchema, maxItems: number, minItems = 0): JsonSchema => ({ type: "array", items, minItems, maxItems });
const optional = (properties: Record<string, JsonSchema>, optionalKeys: readonly string[]): JsonSchema => closed(properties, Object.keys(properties).filter((key) => !optionalKeys.includes(key)));
const oneOf = (...schemas: JsonSchema[]): JsonSchema => ({ oneOf: schemas });
const id = { type: "string", pattern: "^[a-z][a-z0-9_]{2,63}$", minLength: 3, maxLength: 64 } as const;
const digest = { type: "string", pattern: "^[0-9a-f]{64}$", minLength: 64, maxLength: 64 } as const;
const integer = { type: "integer", minimum: 0, maximum: MAX_SAFE } as const;
const positiveInteger = { type: "integer", minimum: 1, maximum: MAX_SAFE } as const;
const text = { type: "string", maxLength: 4000 } as const;
const nonemptyText = { type: "string", minLength: 1, maxLength: 4000 } as const;
const shortText = { type: "string", minLength: 1, maxLength: 256 } as const;
const timestamp = { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$", minLength: 24, maxLength: 24 } as const;
const decimal = { type: "string", minLength: 1, maxLength: 40, pattern: "^-?(?:0|[1-9][0-9]{0,38})(?:\\.[0-9]{1,9})?$" } as const;
const quantum: JsonSchema = { enum: ["1", "0.1", "0.01", "0.001", "0.0001", "0.00001", "0.000001", "0.0000001", "0.00000001", "0.000000001"] };
const units = { type: "string", minLength: 1, maxLength: 40, pattern: "^-?(?:0|[1-9][0-9]{0,38})$" } as const;
const oid = { type: "string", pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$", minLength: 40, maxLength: 64 } as const;
const relativePath = { type: "string", minLength: 1, maxLength: 512 } as const;
const idOrMarker = { type: "string", minLength: 1, maxLength: 256 } as const;
const oidOrMarker = { type: "string", minLength: 1, maxLength: 96 } as const;
const booleanOrMarker = oneOf({ type: "boolean" }, idOrMarker);

const summary = closed({
  state: shortText,
  phase: shortText,
  outcome: shortText,
  nextAction: shortText,
  revision: integer,
  epochDigest: digest,
  trust: { enum: ["fixture-or-uncertified", "certificate-bound"] },
  executionGate: { enum: ["production-certified", "fixture-only", "B1 real Fabric execution blocked"] },
});

const runSummary = closed({
  version: { const: 1 }, runId: id, revision: integer, cursor: integer, state: shortText, phase: shortText,
  outcome: shortText, nextAction: shortText, trust: { enum: ["fixture-or-uncertified", "certificate-bound"] },
  driverStatus: { enum: ["No active Fabric driver", "Active Fabric driver"] },
});

const finalizationReserve = optional({ attempts: integer, agentCalls: integer, evaluatorRuns: integer, wallTimeMs: integer, tokens: integer, cost: decimal }, ["tokens", "cost"]);
const budgets = optional({
  maxHypotheses: positiveInteger, maxAttempts: positiveInteger, maxConcurrentAttempts: positiveInteger, maxRetriesPerHypothesis: integer,
  maxCycles: positiveInteger, wallTimeMs: positiveInteger, maxAgentCalls: positiveInteger, tokenLimit: positiveInteger, costLimit: decimal,
  evaluatorRuns: positiveInteger, finalizationReserve,
}, ["tokenLimit", "costLimit"]);
const metric = closed({
  name: shortText, direction: { enum: ["maximize", "minimize"] }, unit: shortText,
  quantum,
  minimumImprovement: decimal, trialCount: positiveInteger, aggregation: { enum: ["single", "median"] }, nondeterminismTolerance: decimal,
});
const contract = closed({
  version: { const: 1 }, objective: nonemptyText,
  repository: closed({ repositoryId: id, initialOid: oid, dirtyPolicy: { enum: ["reject", "committedOnly"] } }),
  metric,
  evaluation: closed({ development: id, heldOut: id, parserVersion: id, invalidTrialPolicy: { const: "failEvaluation" } }),
  paths: closed({ editable: array(relativePath, 128), protected: array(relativePath, 128), requiredOutputs: array(relativePath, 128) }),
  permissions: closed({ tools: array(id, 64), network: { type: "boolean" }, packageInstallation: { type: "boolean" }, processExecution: { type: "boolean" }, credentialAliases: array(id, 16) }),
  budgets,
  gates: closed({ beforeDispatch: { enum: ["always", "policy"] }, beforePromotion: { const: "always" }, timeout: { enum: ["pause", "reject"] } }),
  promotion: closed({ mode: { const: "packageWinnerRef" } }), retentionClass: id,
});

const hypothesis = optional({
  version: { const: 1 }, hypothesisId: id, parentHypothesisId: id, state: shortText, rationale: nonemptyText,
  plan: array(nonemptyText, 32), lessons: array(nonemptyText, 32), attemptIds: array(id, 10_000),
}, ["parentHypothesisId"]);
const treeHypothesis = optional({
  version: { const: 1 }, hypothesisId: id, parentHypothesisId: id, state: shortText, rationale: nonemptyText,
  plan: array(nonemptyText, 32), lessons: array(nonemptyText, 32), attemptIds: array(id, 10_000),
  lineageDepth: integer, pinned: { type: "boolean" }, retries: integer, interruptions: integer,
}, ["parentHypothesisId"]);
const attempt = optional({
  version: { const: 1 }, attemptId: id, hypothesisId: id, ordinal: positiveInteger, state: shortText, dispatchKey: id,
  effectId: id, workspaceId: id, budgetReservationId: id, childHandleDigest: digest, candidateId: id, retryOfAttemptId: id,
}, ["childHandleDigest", "candidateId", "retryOfAttemptId"]);
const workerClaim = optional({
  version: { const: 1 }, attemptId: id, claimedMetric: decimal, changedPaths: array(relativePath, 4096), rawResultDigest: digest,
  terminalStatus: { enum: ["completed", "failed", "cancelled"] }, boundedPreview: { type: "string", maxLength: 16_384 }, informational: { const: true },
}, ["claimedMetric", "rawResultDigest", "terminalStatus", "boundedPreview"]);
const canonicalEvidence = closed({ certificateId: id, valid: { type: "boolean" }, aggregateUnits: units, trust: { enum: ["fixture", "certified"] } });
const attemptProjection = optional({
  version: { const: 1 }, attemptId: id, hypothesisId: id, ordinal: positiveInteger, state: shortText, dispatchKey: id,
  effectId: id, workspaceId: id, budgetReservationId: id, childHandleDigest: digest, candidateId: id, retryOfAttemptId: id,
  childStatus: shortText, workerClaim: oneOf(workerClaim, { const: "none" }), canonicalEvidence: array(canonicalEvidence, 200),
}, ["childHandleDigest", "candidateId", "retryOfAttemptId"]);

const evaluationPolicy = optional({
  version: { const: 1 }, evaluatorVersion: shortText, split: { enum: ["development", "heldOut"] }, parserVersion: id,
  configurationDigest: digest, environmentDigest: digest, executableDigest: digest,
  quantum,
  trialCount: positiveInteger, seeds: array(integer, 99), trialOrder: array(positiveInteger, 99), aggregation: { enum: ["single", "median"] },
  nondeterminismTolerance: decimal, containmentPolicyDigest: digest, containmentCertificateDigest: digest,
  heldOutIsolationCertificateDigest: digest, strictProtocol: { const: true }, policyDigest: digest,
}, ["heldOutIsolationCertificateDigest"]);
const requiredOutput = closed({ path: relativePath, digest, type: { enum: ["file", "symlink"] }, mode: integer });
const protectedEntry = closed({ path: relativePath, oid, mode: shortText, type: shortText });
const evaluationCertificate = optional({
  version: { const: 1 }, certificateId: id, evaluationId: id, runId: id, epochDigest: digest, contractDigest: digest,
  role: { enum: ["developmentBaseline", "heldOutBaseline", "developmentCandidate", "heldOutCandidate"] }, oid,
  evaluatorId: id, parserVersion: id, metric: shortText, unit: shortText,
  quantum,
  rawTrials: array(decimal, 99), quantizedUnits: array(units, 99), aggregateUnits: units, spreadUnits: units,
  valid: { type: "boolean" }, rejectionReason: nonemptyText, outputDigest: digest, trust: { enum: ["fixture", "certified"] },
  policy: evaluationPolicy, baseOid: oid, candidateOid: oid, mergeCandidateOid: oid, requiredOutputsDigest: digest,
  protectedManifestDigest: digest, containmentCertificateDigest: digest, heldOutIsolationCertificateDigest: digest, strictProtocol: { const: true },
  evaluatorVersion: shortText, configurationDigest: digest, environmentDigest: digest, split: { enum: ["development", "heldOut"] },
  seeds: array(integer, 99), trialOrder: array(positiveInteger, 99), startAt: timestamp, endAt: timestamp,
  exitStatuses: array(closed({ exitCode: integer, timedOut: { type: "boolean" }, cancelled: { type: "boolean" }, oversized: { type: "boolean" } }), 99),
  logs: array(closed({ stdoutDigest: digest, stderrDigest: digest, stdoutBytes: integer, stderrBytes: integer }), 99),
  artifacts: array(closed({ artifactId: id, digest }), 512), requiredOutputs: array(requiredOutput, 128), protectedManifest: array(protectedEntry, 100_000),
  containmentIdentities: array(id, 99), exactBindingsDigest: digest, descendantTerminationObserved: { type: "boolean" }, limitations: array(nonemptyText, 128),
}, ["rejectionReason", "policy", "baseOid", "candidateOid", "mergeCandidateOid", "requiredOutputsDigest", "protectedManifestDigest", "containmentCertificateDigest", "heldOutIsolationCertificateDigest", "strictProtocol", "evaluatorVersion", "configurationDigest", "environmentDigest", "split", "seeds", "trialOrder", "startAt", "endAt", "exitStatuses", "logs", "artifacts", "requiredOutputs", "protectedManifest", "containmentIdentities", "exactBindingsDigest", "descendantTerminationObserved", "limitations"]);

const comparison = closed({
  version: { const: 1 }, candidateId: id, candidateOid: oid, baseOid: oid, attemptId: id, changedPaths: array(relativePath, 4096),
  manifestDigest: digest, certificateId: idOrMarker, canonicalAggregateUnits: oneOf(units, { const: "missing" }),
  normalizedDeltaUnits: oneOf(units, { const: "unavailable" }), trust: { enum: ["fixture", "certified", "unavailable"] },
  valid: { type: "boolean" }, isBest: { type: "boolean" },
});
const mergeDiff = optional({ status: shortText, oldMode: shortText, newMode: shortText, oldOid: oid, newOid: oid, paths: array(relativePath, 2), type: { enum: ["file", "symlink", "deleted"] }, symlinkTarget: relativePath }, ["symlinkTarget"]);
const mergeConstruction = optional({
  version: { const: 1 }, constructionId: id, role: { enum: ["heldOutBaseline", "heldOutCandidate"] }, candidateId: id,
  expectedResearchTrunkOid: oid, candidateOid: oid, mergeCandidateOid: oid, treeOid: oid, algorithmDigest: digest,
  diffEntries: array(mergeDiff, 4096), changedPaths: array(relativePath, 4096),
  requiredOutputs: array(closed({ path: relativePath, digest, mode: shortText, type: { enum: ["file", "symlink"] } }), 128),
  requiredOutputsDigest: digest, protectedManifest: array(protectedEntry, 100_000), protectedManifestDigest: digest,
  fullTreeManifestDigest: digest, beforeRefsDigest: digest, afterRefsDigest: digest, manifestDigest: digest,
}, ["candidateId"]);

const retention = optional({
  version: { const: 1 }, retentionClassId: id, outcome: shortText, legalHold: { type: "boolean" }, eligible: { type: "boolean" },
  eligibleAt: timestamp, reason: nonemptyText, ruleDigest: digest,
}, ["eligibleAt"]);
const reportGeneration = optional({ version: { const: 1 }, generationId: id, revision: integer, state: shortText, dependencyDigests: array(digest, 10_000), expectedManifestDigest: digest, observedManifestDigest: digest }, ["expectedManifestDigest", "observedManifestDigest"]);
const cleanup = closed({ version: { const: 1 }, cleanupId: id, resourceId: id, resourceKind: shortText, state: shortText, reportDependencyDigests: array(digest, 10_000) });
const budgetReservation = closed({ version: { const: 1 }, budgetReservationId: id, attemptId: id, dispatchKey: id, effectId: id, ordinal: positiveInteger, state: { enum: ["RESERVED", "CONSUMED", "RETAINED"] } });
const projectedGate = optional({ version: { const: 1 }, gateId: id, answerKind: shortText, optionIds: array(id, 32), state: shortText, expiresAt: timestamp }, ["optionIds"]);
const projectedEffect = optional({ version: { const: 1 }, effectId: id, kind: shortText, boundary: shortText, state: shortText, attemptId: id, acceptedOutcome: { enum: ["present", "absent"] } }, ["attemptId"]);
const projectedObservation = optional({ version: { const: 1 }, observationId: id, effectId: id, classification: shortText, observedAt: timestamp, reasons: array(nonemptyText, 32), fingerprintCertificateId: idOrMarker, fingerprintEqual: booleanOrMarker }, ["fingerprintCertificateId", "fingerprintEqual"]);

const view = (kind: string, data: JsonSchema): JsonSchema => closed({ version: { const: 1 }, kind: { const: kind }, runId: id, revision: integer, cursor: integer, data });
const overviewData = closed({
  summary,
  baselines: closed({ developmentCertificateId: idOrMarker, heldOutCertificateId: idOrMarker, heldOutConstructionId: idOrMarker }),
  bestCandidate: oneOf(comparison, { const: "none" }),
  budgets: closed({ totals: budgets, used: closed({ hypotheses: integer, attempts: integer, concurrentAttempts: integer, agentCalls: integer, evaluatorRuns: integer }), finalizationReserve }),
  epochs: array(closed({ epochDigest: digest, current: { const: true }, crossEpochRanking: { const: "prohibited" } }), 1, 1),
  gates: array(projectedGate, 200), reportStatus: shortText, cleanupDebt: integer, retention, yielded: { type: "boolean" },
});
const overviewView = view("overview", overviewData);

const event = closed({ version: { const: 1 }, runId: id, sequence: integer, revision: integer, type: shortText, at: timestamp });
const eventPage = closed({ version: { const: 1 }, runId: id, afterSequence: integer, events: array(event, 200), nextSequence: integer, hasMore: { type: "boolean" } });
const resetBatch = closed({ version: { const: 1 }, kind: { const: "reset" }, runId: id, floor: integer, cursor: integer, reason: { enum: ["compacted", "gap", "cursorAhead"] }, projection: overviewView });
const eventsBatch = closed({ version: { const: 1 }, kind: { const: "events" }, runId: id, floor: integer, cursor: integer, page: eventPage, projection: overviewView });

const schemas: Record<string, JsonSchema> = {
  "session.v1": closed({ version: { const: 1 }, authenticated: { const: true }, csrfToken: { type: "string", pattern: "^[A-Za-z0-9_-]{32,256}$", minLength: 32, maxLength: 256 }, driverStatus: { const: "No active Fabric driver" }, expiresAt: timestamp }),
  "sessionRevocation.v1": closed({ version: { const: 1 }, revoked: { const: true } }),
  "runList.v1": closed({ version: { const: 1 }, runs: array(runSummary, 200) }),
  "overview.v1": overviewView,
  "tree.v1": view("tree", closed({ summary, hypotheses: array(treeHypothesis, 200), lineagePolicy: nonemptyText })),
  "attempts.v1": view("attempts", closed({ summary, attempts: array(attemptProjection, 200), workerClaimsPolicy: nonemptyText })),
  "attemptDetail.v1": closed({ version: { const: 1 }, kind: { const: "attemptDetail" }, runId: id, attemptId: id, revision: integer, cursor: integer, data: closed({
    attempt, hypothesis, workerClaim, candidate: optional({ version: { const: 1 }, candidateId: id, hypothesisId: id, attemptId: id, baseOid: oid, candidateOid: oid, changedPaths: array(relativePath, 4096), manifestDigest: digest }, []),
    certificates: array(evaluationCertificate, 200), effects: array(projectedEffect, 200), observations: array(projectedObservation, 200),
    retryLineage: closed({ retryOfAttemptId: idOrMarker, retriedByAttemptIds: array(id, 200) }),
  }, ["hypothesis", "workerClaim", "candidate"]) }),
  "comparisons.v1": view("compare", closed({
    summary, baseline: array(evaluationCertificate, 200), comparisons: array(comparison, 200), mergeConstructions: array(mergeConstruction, 200),
    comparisonPolicy: closed({ direction: { enum: ["maximize", "minimize"] }, minimumImprovement: decimal, quantum, crossEpochRanking: { const: "prohibited" } }),
  })),
  "metrics.v1": view("metrics", closed({
    summary, metric, epochs: array(closed({ epochDigest: digest, certificateCount: integer, crossEpochRanking: { const: "prohibited" } }), 200),
    certificates: array(closed({ certificateId: id, role: shortText, oid, rawTrials: array(decimal, 99), quantizedUnits: array(units, 99), aggregateUnits: units, spreadUnits: units, valid: { type: "boolean" }, rejectionReason: text, trust: { enum: ["fixture", "certified"] }, outputDigest: digest }), 200),
  })),
  "eventBatch.v1": oneOf(resetBatch, eventsBatch),
  "resources.v1": view("resources", closed({
    summary,
    workspaces: array(closed({ workspaceId: id, attemptId: id, state: shortText }), 200),
    refs: array(closed({ winnerRef: shortText, expectedOid: oidOrMarker, observedOid: oidOrMarker, rollbackObservedOid: oidOrMarker }), 200),
    effects: array(projectedEffect, 200), reconciliation: array(projectedObservation, 200),
    children: array(optional({ version: { const: 1 }, childId: id, attemptId: id, effectId: id, containmentId: id, state: shortText, processUnit: shortText, resultDigest: digest }, ["resultDigest"]), 200),
    evaluatorProcesses: array(closed({ effectId: id, state: shortText, containmentId: idOrMarker, evaluationId: idOrMarker }), 200),
    budgetReservations: array(budgetReservation, 200), gates: array(projectedGate, 200),
    approvals: closed({
      FabricPolicy: array(oneOf(closed({ boundary: shortText, parentToolCallId: shortText, nestedToolCallId: shortText, operationId: id, b9CertificationId: idOrMarker }), { const: "not-traversed" }), 200),
      packageAuthorization: array(closed({ authorizationId: id, kind: { enum: ["promote", "rollback"] }, state: shortText, expiresAt: timestamp }), 200),
    }),
    cleanupDebt: array(cleanup, 200), driverLeaseStatus: closed({ status: { enum: ["No active Fabric driver", "Active Fabric driver"] }, identityExposed: { const: false } }),
    confinement: closed({ status: { enum: ["certificate-required", "not-admitted-for-real-work"] }, containedEffects: integer }),
    heldOutIsolation: { enum: ["certificate-bound", "unavailable"] }, fingerprintStatus: { enum: ["mismatch-quarantine-required", "matching-certificates-observed", "not-observed"] },
  })),
  "promotions.v1": view("promotion", closed({
    summary, heldOutIsolation: { enum: ["certificate-bound", "unavailable"] }, heldOutBaselineConstructionId: idOrMarker,
    promotions: array(closed({
      version: { const: 1 }, promotionId: id, state: shortText, candidateId: id, candidateOid: oid, mergeCandidateOid: oidOrMarker,
      winnerRef: shortText, expectedCurrentOid: oidOrMarker, predecessorOid: oidOrMarker, heldOutCertificateId: idOrMarker,
      authorizationState: shortText,
      FabricPolicy: oneOf(closed({ boundary: shortText, operationId: id, parentToolCallId: shortText, nestedToolCallId: shortText, b9CertificationId: idOrMarker }), { const: "not-traversed" }),
      observedOid: oidOrMarker, rollbackAuthorizationState: shortText, rollbackObservedOid: oidOrMarker, rePromotionRequiresFreshEvidence: { type: "boolean" },
    }), 200),
    challenges: array(closed({ version: { const: 1 }, challengeId: id, kind: { enum: ["promote", "rollback"] }, promotionId: id, expiresAt: timestamp, principalId: id }), 200),
    authorizationBoundary: nonemptyText, rollbackAndRePromotion: nonemptyText,
  })),
  "report.v1": view("report", closed({ summary, reports: array(reportGeneration, 200), requiredForOutcome: shortText, obligationStatus: { enum: ["published", "pending", "not-planned"] }, dependencies: array(digest, 200), retention, cleanup: array(cleanup, 200) })),
  "contract.v1": view("contract", closed({ summary, contract, contractDigest: digest, epochDigest: digest, immutability: nonemptyText, confinement: nonemptyText, heldOut: nonemptyText })),
  "artifactPage.v1": closed({ version: { const: 1 }, kind: { const: "artifact" }, artifactId: { type: "string", pattern: "^art_[0-9a-f]{60}$", minLength: 64, maxLength: 64 }, digest, bytes: integer, offset: integer, length: { type: "integer", minimum: 0, maximum: 65_536 }, nextOffset: integer, hasMore: { type: "boolean" }, text: { type: "string", maxLength: 65_536 } }),
  "diffPage.v1": closed({ version: { const: 1 }, kind: { const: "diff" }, artifactId: { type: "string", pattern: "^art_[0-9a-f]{60}$", minLength: 64, maxLength: 64 }, digest, bytes: integer, offset: integer, length: { type: "integer", minimum: 0, maximum: 65_536 }, nextOffset: integer, hasMore: { type: "boolean" }, text: { type: "string", maxLength: 65_536 } }),
  "intentReceipt.v1": closed({ version: { const: 1 }, intentId: id, runId: id, state: { enum: ["PENDING", "CLAIMED", "APPLIED", "REJECTED_STALE", "REJECTED"] }, revision: integer }),
  "sseStream.v1": closed({ version: { const: 1 }, contentType: { const: "text/event-stream" }, events: array({ enum: ["arbor-event", "reset", "caught-up", "stream-limit", "arbor-error"] }, 5, 5) }),
  "error.v1": closed({ version: { const: 1 }, error: { type: "string", pattern: "^[A-Z][A-Z0-9_]{2,63}$", minLength: 3, maxLength: 64 }, message: { type: "string", minLength: 1, maxLength: 512 } }),
};

export const WEB_API_ENVELOPE_SCHEMAS_V1: Readonly<Record<string, JsonSchema>> = Object.freeze(schemas);

export const WEB_SSE_EVENT_SCHEMAS_V1: Readonly<Record<string, JsonSchema>> = Object.freeze({
  "arbor-event": closed({ version: { const: 1 }, event, projection: overviewView }),
  reset: resetBatch,
  "caught-up": closed({ version: { const: 1 }, runId: id, cursor: integer, projection: overviewView }),
  "stream-limit": closed({ version: { const: 1 }, runId: id, cursor: integer, reconnect: { const: true } }),
  "arbor-error": closed({ version: { const: 1 }, runId: id, cursor: integer, error: { type: "string", pattern: "^[A-Z][A-Z0-9_]{2,63}$", maxLength: 64 }, message: { type: "string", minLength: 1, maxLength: 512 }, reconnect: { const: false } }),
});

export class WebResponseSchemaError extends Error {
  constructor(readonly code: "RESPONSE_SCHEMA_MISMATCH" | "RESPONSE_SCHEMA_INVALID" | "RESPONSE_LIMIT", message: string) {
    super(message);
    this.name = "WebResponseSchemaError";
  }
}

function serialize(schema: JsonSchema | undefined, value: unknown, maximumBytes: number, label: string): string {
  if (!schema) throw new WebResponseSchemaError("RESPONSE_SCHEMA_MISMATCH", `${label} has no declared response schema`);
  const redacted = redactValue(value);
  const body = canonicalJson(redacted);
  if (Buffer.byteLength(body, "utf8") > maximumBytes) throw new WebResponseSchemaError("RESPONSE_LIMIT", `${label} exceeds its declared response size`);
  const issues = validateJsonSchema(schema, redacted);
  if (issues.length > 0) throw new WebResponseSchemaError("RESPONSE_SCHEMA_INVALID", `${label} failed its closed response schema`);
  return body;
}

export function serializeWebRouteResponseV1(route: WebRouteContractV1, schemaName: string, value: unknown): string {
  if (!WEB_ROUTES_V1.includes(route) || route.response !== schemaName) throw new WebResponseSchemaError("RESPONSE_SCHEMA_MISMATCH", "Response schema does not match the declared route");
  return serialize(WEB_API_ENVELOPE_SCHEMAS_V1[schemaName], value, route.maxResponseBytes, schemaName);
}

export function serializeWebErrorResponseV1(value: unknown, maximumBytes = 65_536): string {
  return serialize(WEB_API_ENVELOPE_SCHEMAS_V1["error.v1"], value, maximumBytes, "error.v1");
}

export function serializeWebSseEventV1(eventName: string, value: unknown, maximumBytes: number): string {
  return serialize(WEB_SSE_EVENT_SCHEMAS_V1[eventName], value, maximumBytes, `SSE ${eventName}`);
}
