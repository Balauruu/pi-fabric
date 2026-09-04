import type { JsonSchema } from "../schemas/catalog.js";
import { validateJsonSchema, type ValidationIssue } from "../schemas/validate.js";

export const ACCEPTANCE_STEP_NAMES_V1 = Object.freeze([
  "dirty active checkout with stash, sibling, and user refs",
  "complete initial source fingerprint and independent oracle",
  "content-address committedOnly contract admission",
  "exact base OID private Git import",
  "worker/evaluator source and sibling write denial",
  "descendant/escape/path/Git/hook/credential/device/network/install containment",
  "canonical development and sealed held-out baselines",
  "three hypotheses and three reserved isolated attempts",
  "three concurrent isolated valid/protected/interrupted attempts",
  "successful child completion before result commit crash gap",
  "disconnected Web intent retained without execution",
  "SSE durable cursor reconnect and authoritative catch-up",
  "new fence acquisition and stale callback rejection",
  "completed child recovered without rerun",
  "interrupted attempt classified and retried with new identities",
  "canonical exact candidate OID evaluation",
  "direction, exact boundary, spread boundary, and scientific tie",
  "actual detached merge candidate construction",
  "same-policy held-out baseline and exact merge-candidate evaluation",
  "correct certified trust labels",
  "Web promotion request is intent only",
  "candidate-bound trusted-principal issuance adapter",
  "separately recorded Fabric write-risk policy approval",
  "exact package winner-ref CAS only",
  "post-CAS crash observation without duplicate movement",
  "separate rollback authorization and exact predecessor restore",
  "fresh re-promotion authorization and CAS",
  "report plan frozen at one committed revision",
  "report crash after state commit and recovery",
  "complete outputs and report manifest verification",
  "interrupted/idempotent cleanup and retained debt",
  "Web and headless projection parity",
  "fingerprint certificate at every consequential boundary",
  "mechanical certificate/oracle/effect/fence/containment/report bindings",
  "immediate mismatch quarantine policy",
] as const);

export const ACCEPTANCE_EVIDENCE_KINDS_V1 = Object.freeze([
  "initialSourceState", "initialFingerprint", "contractAdmission", "privateRepositoryImport", "sourceWriteDenial",
  "containmentMatrix", "baselineEvaluation", "attemptReservations", "concurrentAttempts", "childCompletionCrashGap",
  "disconnectedWebIntent", "sseCatchUp", "staleFenceRejection", "completedChildRecovery", "retryIdentity",
  "candidateFinalization", "numericBoundaries", "detachedMerge", "heldOutEvaluation", "trustLabels",
  "promotionWebIntent", "promotionAuthorization", "fabricPolicyApproval", "promotionCas", "postCasRecovery",
  "rollbackCas", "repromotionCas", "reportPlan", "reportRecovery", "completeReport",
  "cleanup", "projectionParity", "fingerprintCoverage", "bindingAudit", "quarantineProbe",
] as const);

export type AcceptanceEvidenceKindV1 = typeof ACCEPTANCE_EVIDENCE_KINDS_V1[number];
export type AcceptanceStepNumberV1 = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35;

export interface AcceptanceBoundaryReceiptV1 {
  version: 1;
  certificateId: string;
  certificateDigest: string;
  effectId: string;
  commandId: string;
  correlationIds: string[];
  fence: number;
  expectedRevision: number;
  containmentId: string;
  previousCertificateDigest: string;
  beforeRepositoryDigest: string;
  afterRepositoryDigest: string;
  reportGenerationId: string;
}

export interface AcceptanceCommandReceiptV1 {
  version: 1;
  commandId: string;
  executable: string;
  argv: string[];
  hostContextRedacted: boolean;
  commandDigest: string;
  exitCode: number;
  stdoutDigest: string;
  stderrDigest: string;
  logDigest: string;
  complete: boolean;
}

export interface AcceptanceResourceUsageV1 { peakProcesses: number; peakRssBytes: number; breach: "none" | "processes" | "rss" }
export interface AcceptanceEvaluatorReceiptBindingV1 {
  requestId: string; serviceId: string; evaluatorId: string; candidateId: string; oid: string; value: string;
  heldOutInputDigest: string; candidateResultDigest: string; containmentId: string; containmentCertificateDigest: string;
  outputDigest: string; stdoutDigest: string; stderrDigest: string; serviceSealDigest: string; evaluatorPolicyDigest: string; receiptDigest: string;
}
export interface AcceptanceAuthorizationBindingV1 {
  authorizationId: string; challengeId: string; challengeDigest: string; kind: "promote" | "rollback"; promotionId: string;
  candidateId: string; candidateOid: string; mergeCandidateOid: string; heldOutReceiptDigest: string; contractDigest: string;
  winnerRef: string; expectedCurrentOid: string; predecessorOid: string; principalId: string; keyId: string; nonceDigest: string; state: string;
}
export interface FabricWritePolicyReceiptV1 {
  version: 1; approvalId: string; operationId: string; authorizationId: string; action: "arbor.applyWinnerRef" | "arbor.applyRollbackRef";
  scenario: "once"; approvalsRequested: number; classifierCalls: number; outcome: "allowed"; packageDigest: string; observationDigest: string;
}
export interface WinnerRefCasReceiptV1 {
  version: 1; operationId: string; kind: "promote" | "rollback" | "repromote"; authorizationId: string; approvalId: string;
  winnerRef: string; expectedOid: string; targetOid: string; observedOid: string; observationDigest: string;
}
export interface ReportArtifactReceiptV1 { artifactId: string; name: string; digest: string; bytes: number }

interface InitialSourceStateEvidenceV1 {
  version: 1; kind: "initialSourceState"; sourceHeadOid: string; sourceStateDigest: string; porcelainDigest: string;
  dirtyTracked: { path: "README.md"; contentDigest: string }; dirtyUntracked: { path: "untracked.txt"; contentDigest: string };
  stash: { ref: "refs/stash"; oid: string; listDigest: string };
  sibling: { registered: true; headOid: string; statusDigest: string; dirtyPath: "sibling-untracked.txt" };
  userRefs: Array<{ name: string; oid: string }>;
  commands: AcceptanceCommandReceiptV1[];
}
type BoundaryEvidence<K extends AcceptanceEvidenceKindV1, F extends object> = { version: 1; kind: K; boundary: AcceptanceBoundaryReceiptV1 } & F;
export type AcceptanceEvidenceV1 =
  | InitialSourceStateEvidenceV1
  | BoundaryEvidence<"initialFingerprint", { primaryManifestDigest: string; oracleManifestDigest: string; oracleMatched: true; fingerprintSchemaDigest: string; fingerprintToolDigest: string; oracleToolDigest: string }>
  | BoundaryEvidence<"contractAdmission", { contractDigest: string; repositoryId: string; initialOid: string; dirtyPolicy: "committedOnly"; direction: "maximize" | "minimize"; quantum: string; minimumImprovement: string; nondeterminismTolerance: string; trialCount: number; aggregation: "single"; editablePaths: string[]; protectedPaths: string[]; requiredOutputs: string[]; budgetDigest: string }>
  | BoundaryEvidence<"privateRepositoryImport", { repositoryId: string; importedOid: string; objectFormat: "sha1" | "sha256"; packageRef: string; sourceIdentityDigest: string; dissociationDigest: string; privateRepositoryDigest: string; verificationCommand: AcceptanceCommandReceiptV1 }>
  | BoundaryEvidence<"sourceWriteDenial", { containmentCertificateId: string; containmentCertificateDigest: string; sourceDenied: true; siblingDenied: true; probes: Array<{ scope: "source" | "sibling"; containmentId: string; exitCode: number; stdoutDigest: string; stderrDigest: string; mountPolicyDigest: string; resourceUsage: AcceptanceResourceUsageV1; command: AcceptanceCommandReceiptV1 }> }>
  | BoundaryEvidence<"containmentMatrix", { containmentCertificateId: string; containmentCertificateDigest: string; requiredChecks: number; observedChecks: number; checks: Array<{ name: string; passed: true; direct: true; observationDigest: string }>; matrixDigest: string }>
  | BoundaryEvidence<"baselineEvaluation", { baseOid: string; development: { candidateId: string; oid: string; value: string; containmentId: string; outputDigest: string; stdoutDigest: string; stderrDigest: string; command: AcceptanceCommandReceiptV1 }; heldOut: AcceptanceEvaluatorReceiptBindingV1; serviceDeniedWithoutCapability: true }>
  | BoundaryEvidence<"attemptReservations", { baseOid: string; attempts: Array<{ kind: "valid" | "protected" | "interrupted"; hypothesisId: string; attemptId: string; workspaceId: string; ordinal: number; materializationIdentityDigest: string }> }>
  | BoundaryEvidence<"concurrentAttempts", { interruptionReadinessDigest: string; attempts: Array<{ kind: "valid" | "protected" | "interrupted"; hypothesisId: string; attemptId: string; workspaceId: string; classification: "VALID_COMPLETED" | "PROTECTED_COMPLETED" | "INTERRUPTED"; exitCode: number; cancelled: boolean; descendantsTerminated: boolean; containmentId: string; outputDigest: string; stdoutDigest: string; stderrDigest: string; resourceUsage: AcceptanceResourceUsageV1; command: AcceptanceCommandReceiptV1 }> }>
  | BoundaryEvidence<"childCompletionCrashGap", { recordId: string; recordRevision: number; state: "CHILD_COMPLETED_UNCOMMITTED"; attemptId: string; outputDigest: string; journalRecordDigest: string; committed: false; childTerminal: true }>
  | BoundaryEvidence<"disconnectedWebIntent", { intentId: string; runId: string; state: string; revision: number; disconnectedCursor: number; effectsBefore: number; effectsAfter: number; authorizationCount: number }>
  | BoundaryEvidence<"sseCatchUp", { runId: string; requestedAfterSequence: number; cursor: number; eventCount: number; eventSequenceDigest: string; projectionDigest: string; caughtUpThroughRevision: number }>
  | BoundaryEvidence<"staleFenceRejection", { priorFence: number; acquiredFence: number; claimRevision: number; staleCallbackFence: number; rejectionCode: "STALE_FENCE"; staleRejected: true }>
  | BoundaryEvidence<"completedChildRecovery", { recordId: string; attemptId: string; beforeJournalDigest: string; afterJournalDigest: string; recoveryCount: 1; replayExecutions: 0; acceptedDurableOutcomes: 1; finalState: "RECOVERED_COMMITTED" }>
  | BoundaryEvidence<"retryIdentity", { hypothesisId: string; retryOfAttemptId: string; priorWorkspaceId: string; priorDispatchKey: string; priorEffectId: string; attemptId: string; workspaceId: string; dispatchKey: string; effectId: string; containmentId: string; exitCode: number; stdoutDigest: string; stderrDigest: string; classification: "RETRY_COMPLETED"; command: AcceptanceCommandReceiptV1 }>
  | BoundaryEvidence<"candidateFinalization", { candidateId: string; candidateOid: string; baseOid: string; attemptId: string; hypothesisId: string; changedPaths: string[]; manifestDigest: string; resultValueDigest: string; protectedAttemptId: string; protectedRejectionCode: "EVIDENCE_INVALID"; protectedRejected: true; verificationCommand: AcceptanceCommandReceiptV1 }>
  | BoundaryEvidence<"numericBoundaries", { direction: "maximize" | "minimize"; baseUnits: string; candidateUnits: string; normalizedImprovement: string; minimumImprovement: string; directionPasses: true; equalityCandidateUnits: string; equalityPasses: true; spreadInputUnits: string[]; spreadUnits: string; spreadToleranceUnits: string; nondeterministic: false; tie: true; arithmetic: "integer-decimal"; modelOutputUsedAsCanonicalScore: false }>
  | BoundaryEvidence<"detachedMerge", { algorithmDigest: string; baseline: { constructionId: string; expectedResearchTrunkOid: string; candidateOid: string; mergeCandidateOid: string; treeOid: string; manifestDigest: string; beforeRefsDigest: string; afterRefsDigest: string; changedPaths: string[]; requiredOutputsDigest: string; protectedManifestDigest: string }; candidate: { constructionId: string; candidateId: string; expectedResearchTrunkOid: string; candidateOid: string; mergeCandidateOid: string; treeOid: string; manifestDigest: string; beforeRefsDigest: string; afterRefsDigest: string; changedPaths: string[]; requiredOutputsDigest: string; protectedManifestDigest: string } }>
  | BoundaryEvidence<"heldOutEvaluation", { baseline: AcceptanceEvaluatorReceiptBindingV1; candidate: AcceptanceEvaluatorReceiptBindingV1; samePolicy: true; modelOutputUsedAsCanonicalScore: false }>
  | BoundaryEvidence<"trustLabels", { baselineReceiptDigest: string; candidateReceiptDigest: string; baselineTrust: "certified"; candidateTrust: "certified"; heldOutIsolation: "evaluator-only-service"; evaluatorPolicyDigest: string; samePolicy: true }>
  | BoundaryEvidence<"promotionWebIntent", { intentId: string; candidateId: string; state: string; revision: number; effectsBefore: number; effectsAfter: number; authorizationsBefore: number; authorizationsAfter: number; intentOnly: true }>
  | BoundaryEvidence<"promotionAuthorization", { authorization: AcceptanceAuthorizationBindingV1 }>
  | BoundaryEvidence<"fabricPolicyApproval", { authorizationId: string; approval: FabricWritePolicyReceiptV1; liveFabric: { certificationId: string; artifactDigest: string; integrationCertificationId: string; integrationArtifactDigest: string; approvalCertificationId: string; approvalArtifactDigest: string; correlations: string[]; modelOutputUsedAsCanonicalScore: false } }>
  | BoundaryEvidence<"promotionCas", { cas: WinnerRefCasReceiptV1; command: AcceptanceCommandReceiptV1 }>
  | BoundaryEvidence<"postCasRecovery", { originalOperationId: string; duplicateOperationId: string; winnerRef: string; observedOid: string; observationDigest: string; duplicateExpectedOid: string; duplicateTargetOid: string; duplicateRejected: true; movementCount: 1 }>
  | BoundaryEvidence<"rollbackCas", { authorization: AcceptanceAuthorizationBindingV1; approval: FabricWritePolicyReceiptV1; cas: WinnerRefCasReceiptV1; command: AcceptanceCommandReceiptV1 }>
  | BoundaryEvidence<"repromotionCas", { authorization: AcceptanceAuthorizationBindingV1; approval: FabricWritePolicyReceiptV1; cas: WinnerRefCasReceiptV1; priorAuthorizationIds: string[]; command: AcceptanceCommandReceiptV1 }>
  | BoundaryEvidence<"reportPlan", { generationId: string; frozenRevision: number; dependencyDigest: string; expectedManifestDigest: string; artifacts: ReportArtifactReceiptV1[] }>
  | BoundaryEvidence<"reportRecovery", { generationId: string; expectedManifestDigest: string; postStateClassification: "absent"; injectedClassification: "partial"; recoveredClassification: "complete"; partialArtifactId: string; partialArtifactDigest: string; recoveryReusedGenerationId: true; atomicRenameObserved: true }>
  | BoundaryEvidence<"completeReport", { generationId: string; classification: "complete"; manifestDigest: string; fileCount: number; artifacts: ReportArtifactReceiptV1[]; requiredArtifactIds: string[]; allRequiredPresent: true }>
  | BoundaryEvidence<"cleanup", { resourceId: string; resourceKind: "scratch"; rootDevice: string; rootInode: string; manifestDigest: string; entryPath: string; entryDigest: string; debtCleanupId: string; debtOutcome: "pending"; firstCleanupId: string; firstOutcome: "completed"; secondCleanupId: string; secondOutcome: "completed"; targetAbsent: true; retainedDebt: true; manifestOnly: true }>
  | BoundaryEvidence<"projectionParity", { runId: string; revision: number; cursor: number; headlessProjectionDigest: string; webProjectionDigest: string; equal: true }>
  | BoundaryEvidence<"fingerprintCoverage", { expectedBeforeStep: number; actualBeforeStep: number; expectedAfterStep: number; coveredStepNumbers: number[]; certificateIds: string[]; certificateDigests: string[]; complete: true }>
  | BoundaryEvidence<"bindingAudit", { verifiedBeforeStep: number; certificateIds: string[]; certificateDigests: string[]; effectIds: string[]; commandIds: string[]; containmentIds: string[]; correlationIdsDigest: string; beforeRepositoryDigests: string[]; afterRepositoryDigests: string[]; previousDigestChainTip: string; reportGenerationId: string; allEqual: true; allSignaturesValid: true; allBindingsValid: true }>
  | BoundaryEvidence<"quarantineProbe", { probeCertificateId: string; probeCertificateDigest: string; probeBeforeRepositoryDigest: string; probeAfterRepositoryDigest: string; mismatchCount: number; probeEqual: false; quarantineTriggered: true; rejectionCode: "QUARANTINED"; failImmediately: true; acceptanceRepositoryMismatchCount: 0; acceptanceQuarantineTriggered: false; resourceBudgetDigest: string; resourceBreachCount: 0 }>;

const sha = { type: "string", pattern: "^[0-9a-f]{64}$", minLength: 64, maxLength: 64 } as const;
const oid = { type: "string", pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$", minLength: 40, maxLength: 64 } as const;
const id = { type: "string", pattern: "^[a-z][a-z0-9_]{2,95}$", minLength: 3, maxLength: 96 } as const;
const text = { type: "string", minLength: 1, maxLength: 512 } as const;
const decimal = { type: "string", pattern: "^-?(?:0|[1-9][0-9]{0,38})$", minLength: 1, maxLength: 40 } as const;
const integer = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const object = (properties: Record<string, JsonSchema>, required: readonly string[] = Object.keys(properties)): JsonSchema => ({ type: "object", properties, required, additionalProperties: false });
const array = (items: JsonSchema, minItems: number, maxItems: number, uniqueItems = false): JsonSchema => ({ type: "array", items, minItems, maxItems, ...(uniqueItems ? { uniqueItems: true } : {}) });
const resourceUsage = object({ peakProcesses: integer, peakRssBytes: integer, breach: { enum: ["none", "processes", "rss"] } });
const command = object({ version: { const: 1 }, commandId: id, executable: text, argv: array(text, 1, 128), hostContextRedacted: { type: "boolean" }, commandDigest: sha, exitCode: integer, stdoutDigest: sha, stderrDigest: sha, logDigest: sha, complete: { type: "boolean" } });
const boundary = object({ version: { const: 1 }, certificateId: id, certificateDigest: sha, effectId: id, commandId: id, correlationIds: array(id, 1, 16, true), fence: integer, expectedRevision: integer, containmentId: id, previousCertificateDigest: sha, beforeRepositoryDigest: sha, afterRepositoryDigest: sha, reportGenerationId: id });
const evaluator = object({ requestId: id, serviceId: id, evaluatorId: id, candidateId: id, oid, value: decimal, heldOutInputDigest: sha, candidateResultDigest: sha, containmentId: id, containmentCertificateDigest: sha, outputDigest: sha, stdoutDigest: sha, stderrDigest: sha, serviceSealDigest: sha, evaluatorPolicyDigest: sha, receiptDigest: sha });
const authorization = object({ authorizationId: id, challengeId: id, challengeDigest: sha, kind: { enum: ["promote", "rollback"] }, promotionId: id, candidateId: id, candidateOid: oid, mergeCandidateOid: oid, heldOutReceiptDigest: sha, contractDigest: sha, winnerRef: { type: "string", pattern: "^refs/pi-fabric-arbor/[a-z][a-z0-9_]{2,63}/winner$", minLength: 32, maxLength: 96 }, expectedCurrentOid: oid, predecessorOid: oid, principalId: id, keyId: id, nonceDigest: sha, state: { enum: ["SIGNED", "STORED", "CONSUMED"] } });
const approval = object({ version: { const: 1 }, approvalId: id, operationId: id, authorizationId: id, action: { enum: ["arbor.applyWinnerRef", "arbor.applyRollbackRef"] }, scenario: { const: "once" }, approvalsRequested: integer, classifierCalls: integer, outcome: { const: "allowed" }, packageDigest: sha, observationDigest: sha });
const cas = object({ version: { const: 1 }, operationId: id, kind: { enum: ["promote", "rollback", "repromote"] }, authorizationId: id, approvalId: id, winnerRef: { type: "string", pattern: "^refs/pi-fabric-arbor/[a-z][a-z0-9_]{2,63}/winner$", minLength: 32, maxLength: 96 }, expectedOid: oid, targetOid: oid, observedOid: oid, observationDigest: sha });
const artifact = object({ artifactId: id, name: { type: "string", pattern: "^(?:REPORT\\.md|contract\\.v1\\.json|run-summary\\.v1\\.json|artifact-index\\.v1\\.json|promotion-journals\\.v1\\.json|authorization-records\\.v1\\.json|cleanup-manifest\\.v1\\.json|retention-policy\\.v1\\.json|evaluation-certificates/index\\.v1\\.json|fingerprint-certificates/index\\.v1\\.json|arbor-compatibility/status\\.v1\\.json)$", minLength: 9, maxLength: 64 }, digest: sha, bytes: integer });
const liveCorrelation = { type: "string", pattern: "^[a-z0-9][a-z0-9_]{2,95}$", minLength: 3, maxLength: 96 } as const;
const liveFabric = object({ certificationId: id, artifactDigest: sha, integrationCertificationId: id, integrationArtifactDigest: sha, approvalCertificationId: id, approvalArtifactDigest: sha, correlations: array(liveCorrelation, 3, 16, true), modelOutputUsedAsCanonicalScore: { const: false } });

const variant = (kind: AcceptanceEvidenceKindV1, properties: Record<string, JsonSchema>, withBoundary = true): JsonSchema => object({ version: { const: 1 }, kind: { const: kind }, ...(withBoundary ? { boundary } : {}), ...properties });
const merge = (candidate: boolean): JsonSchema => object({ constructionId: id, ...(candidate ? { candidateId: id } : {}), expectedResearchTrunkOid: oid, candidateOid: oid, mergeCandidateOid: oid, treeOid: oid, manifestDigest: sha, beforeRefsDigest: sha, afterRefsDigest: sha, changedPaths: array(text, candidate ? 1 : 0, 4096, true), requiredOutputsDigest: sha, protectedManifestDigest: sha });
const attemptReservation = object({ kind: { enum: ["valid", "protected", "interrupted"] }, hypothesisId: id, attemptId: id, workspaceId: id, ordinal: { type: "integer", minimum: 1, maximum: 3 }, materializationIdentityDigest: sha });
const attemptOutcome = object({ kind: { enum: ["valid", "protected", "interrupted"] }, hypothesisId: id, attemptId: id, workspaceId: id, classification: { enum: ["VALID_COMPLETED", "PROTECTED_COMPLETED", "INTERRUPTED"] }, exitCode: integer, cancelled: { type: "boolean" }, descendantsTerminated: { type: "boolean" }, containmentId: id, outputDigest: sha, stdoutDigest: sha, stderrDigest: sha, resourceUsage, command });
const probe = object({ scope: { enum: ["source", "sibling"] }, containmentId: id, exitCode: integer, stdoutDigest: sha, stderrDigest: sha, mountPolicyDigest: sha, resourceUsage, command });
const fpCheck = object({ name: text, passed: { const: true }, direct: { const: true }, observationDigest: sha });

export const ACCEPTANCE_EVIDENCE_SCHEMAS_V1: readonly JsonSchema[] = Object.freeze([
  variant("initialSourceState", { sourceHeadOid: oid, sourceStateDigest: sha, porcelainDigest: sha, dirtyTracked: object({ path: { const: "README.md" }, contentDigest: sha }), dirtyUntracked: object({ path: { const: "untracked.txt" }, contentDigest: sha }), stash: object({ ref: { const: "refs/stash" }, oid, listDigest: sha }), sibling: object({ registered: { const: true }, headOid: oid, statusDigest: sha, dirtyPath: { const: "sibling-untracked.txt" } }), userRefs: array(object({ name: { type: "string", pattern: "^refs/(?:heads/user/retained|user/arbor-retained)$", minLength: 19, maxLength: 31 }, oid }), 2, 2, true), commands: array(command, 5, 16) }, false),
  variant("initialFingerprint", { primaryManifestDigest: sha, oracleManifestDigest: sha, oracleMatched: { const: true }, fingerprintSchemaDigest: sha, fingerprintToolDigest: sha, oracleToolDigest: sha }),
  variant("contractAdmission", { contractDigest: sha, repositoryId: id, initialOid: oid, dirtyPolicy: { const: "committedOnly" }, direction: { enum: ["maximize", "minimize"] }, quantum: text, minimumImprovement: text, nondeterminismTolerance: text, trialCount: integer, aggregation: { const: "single" }, editablePaths: array(text, 1, 128, true), protectedPaths: array(text, 1, 128, true), requiredOutputs: array(text, 1, 128, true), budgetDigest: sha }),
  variant("privateRepositoryImport", { repositoryId: id, importedOid: oid, objectFormat: { enum: ["sha1", "sha256"] }, packageRef: { type: "string", pattern: "^refs/pi-fabric-arbor/imports/[0-9a-f]{40,64}$", minLength: 69, maxLength: 93 }, sourceIdentityDigest: sha, dissociationDigest: sha, privateRepositoryDigest: sha, verificationCommand: command }),
  variant("sourceWriteDenial", { containmentCertificateId: id, containmentCertificateDigest: sha, sourceDenied: { const: true }, siblingDenied: { const: true }, probes: array(probe, 2, 2) }),
  variant("containmentMatrix", { containmentCertificateId: id, containmentCertificateDigest: sha, requiredChecks: { type: "integer", minimum: 34, maximum: 256 }, observedChecks: { type: "integer", minimum: 34, maximum: 256 }, checks: array(fpCheck, 34, 256, true), matrixDigest: sha }),
  variant("baselineEvaluation", { baseOid: oid, development: object({ candidateId: id, oid, value: decimal, containmentId: id, outputDigest: sha, stdoutDigest: sha, stderrDigest: sha, command }), heldOut: evaluator, serviceDeniedWithoutCapability: { const: true } }),
  variant("attemptReservations", { baseOid: oid, attempts: array(attemptReservation, 3, 3) }),
  variant("concurrentAttempts", { attempts: array(attemptOutcome, 3, 3), interruptionReadinessDigest: sha }),
  variant("childCompletionCrashGap", { recordId: id, recordRevision: integer, state: { const: "CHILD_COMPLETED_UNCOMMITTED" }, attemptId: id, outputDigest: sha, journalRecordDigest: sha, committed: { const: false }, childTerminal: { const: true } }),
  variant("disconnectedWebIntent", { intentId: id, runId: id, state: text, revision: integer, disconnectedCursor: integer, effectsBefore: integer, effectsAfter: integer, authorizationCount: integer }),
  variant("sseCatchUp", { runId: id, requestedAfterSequence: integer, cursor: integer, eventCount: integer, eventSequenceDigest: sha, projectionDigest: sha, caughtUpThroughRevision: integer }),
  variant("staleFenceRejection", { priorFence: integer, acquiredFence: integer, claimRevision: integer, staleCallbackFence: integer, rejectionCode: { const: "STALE_FENCE" }, staleRejected: { const: true } }),
  variant("completedChildRecovery", { recordId: id, attemptId: id, beforeJournalDigest: sha, afterJournalDigest: sha, recoveryCount: { const: 1 }, replayExecutions: { const: 0 }, acceptedDurableOutcomes: { const: 1 }, finalState: { const: "RECOVERED_COMMITTED" } }),
  variant("retryIdentity", { hypothesisId: id, retryOfAttemptId: id, priorWorkspaceId: id, priorDispatchKey: id, priorEffectId: id, attemptId: id, workspaceId: id, dispatchKey: id, effectId: id, containmentId: id, exitCode: integer, stdoutDigest: sha, stderrDigest: sha, classification: { const: "RETRY_COMPLETED" }, command }),
  variant("candidateFinalization", { candidateId: id, candidateOid: oid, baseOid: oid, attemptId: id, hypothesisId: id, changedPaths: array(text, 1, 4096, true), manifestDigest: sha, resultValueDigest: sha, protectedAttemptId: id, protectedRejectionCode: { const: "EVIDENCE_INVALID" }, protectedRejected: { const: true }, verificationCommand: command }),
  variant("numericBoundaries", { direction: { enum: ["maximize", "minimize"] }, baseUnits: decimal, candidateUnits: decimal, normalizedImprovement: decimal, minimumImprovement: decimal, directionPasses: { const: true }, equalityCandidateUnits: decimal, equalityPasses: { const: true }, spreadInputUnits: array(decimal, 3, 3, true), spreadUnits: decimal, spreadToleranceUnits: decimal, nondeterministic: { const: false }, tie: { const: true }, arithmetic: { const: "integer-decimal" }, modelOutputUsedAsCanonicalScore: { const: false } }),
  variant("detachedMerge", { algorithmDigest: sha, baseline: merge(false), candidate: merge(true) }),
  variant("heldOutEvaluation", { baseline: evaluator, candidate: evaluator, samePolicy: { const: true }, modelOutputUsedAsCanonicalScore: { const: false } }),
  variant("trustLabels", { baselineReceiptDigest: sha, candidateReceiptDigest: sha, baselineTrust: { const: "certified" }, candidateTrust: { const: "certified" }, heldOutIsolation: { const: "evaluator-only-service" }, evaluatorPolicyDigest: sha, samePolicy: { const: true } }),
  variant("promotionWebIntent", { intentId: id, candidateId: id, state: text, revision: integer, effectsBefore: integer, effectsAfter: integer, authorizationsBefore: integer, authorizationsAfter: integer, intentOnly: { const: true } }),
  variant("promotionAuthorization", { authorization }),
  variant("fabricPolicyApproval", { authorizationId: id, approval, liveFabric }),
  variant("promotionCas", { cas, command }),
  variant("postCasRecovery", { originalOperationId: id, duplicateOperationId: id, winnerRef: { type: "string", minLength: 32, maxLength: 96 }, observedOid: oid, observationDigest: sha, duplicateExpectedOid: oid, duplicateTargetOid: oid, duplicateRejected: { const: true }, movementCount: { const: 1 } }),
  variant("rollbackCas", { authorization, approval, cas, command }),
  variant("repromotionCas", { authorization, approval, cas, priorAuthorizationIds: array(id, 2, 2, true), command }),
  variant("reportPlan", { generationId: id, frozenRevision: integer, dependencyDigest: sha, expectedManifestDigest: sha, artifacts: array(artifact, 11, 32, true) }),
  variant("reportRecovery", { generationId: id, expectedManifestDigest: sha, postStateClassification: { const: "absent" }, injectedClassification: { const: "partial" }, recoveredClassification: { const: "complete" }, partialArtifactId: id, partialArtifactDigest: sha, recoveryReusedGenerationId: { const: true }, atomicRenameObserved: { const: true } }),
  variant("completeReport", { generationId: id, classification: { const: "complete" }, manifestDigest: sha, fileCount: { type: "integer", minimum: 11, maximum: 32 }, artifacts: array(artifact, 11, 32, true), requiredArtifactIds: array(id, 11, 32, true), allRequiredPresent: { const: true } }),
  variant("cleanup", { resourceId: id, resourceKind: { const: "scratch" }, rootDevice: decimal, rootInode: decimal, manifestDigest: sha, entryPath: text, entryDigest: sha, debtCleanupId: id, debtOutcome: { const: "pending" }, firstCleanupId: id, firstOutcome: { const: "completed" }, secondCleanupId: id, secondOutcome: { const: "completed" }, targetAbsent: { const: true }, retainedDebt: { const: true }, manifestOnly: { const: true } }),
  variant("projectionParity", { runId: id, revision: integer, cursor: integer, headlessProjectionDigest: sha, webProjectionDigest: sha, equal: { const: true } }),
  variant("fingerprintCoverage", { expectedBeforeStep: integer, actualBeforeStep: integer, expectedAfterStep: integer, coveredStepNumbers: array(integer, 31, 34, true), certificateIds: array(id, 31, 34, true), certificateDigests: array(sha, 31, 34, true), complete: { const: true } }),
  variant("bindingAudit", { verifiedBeforeStep: integer, certificateIds: array(id, 32, 34, true), certificateDigests: array(sha, 32, 34, true), effectIds: array(id, 32, 34, true), commandIds: array(id, 32, 34, true), containmentIds: array(id, 32, 34, true), correlationIdsDigest: sha, beforeRepositoryDigests: array(sha, 32, 34), afterRepositoryDigests: array(sha, 32, 34), previousDigestChainTip: sha, reportGenerationId: id, allEqual: { const: true }, allSignaturesValid: { const: true }, allBindingsValid: { const: true } }),
  variant("quarantineProbe", { probeCertificateId: id, probeCertificateDigest: sha, probeBeforeRepositoryDigest: sha, probeAfterRepositoryDigest: sha, mismatchCount: { type: "integer", minimum: 1, maximum: 4096 }, probeEqual: { const: false }, quarantineTriggered: { const: true }, rejectionCode: { const: "QUARANTINED" }, failImmediately: { const: true }, acceptanceRepositoryMismatchCount: { const: 0 }, acceptanceQuarantineTriggered: { const: false }, resourceBudgetDigest: sha, resourceBreachCount: { const: 0 } }),
]);

export const PHASE7_ACCEPTANCE_EVIDENCE_SCHEMA_V1: JsonSchema = { oneOf: ACCEPTANCE_EVIDENCE_SCHEMAS_V1 };
const stepBase = { version: { const: 1 }, name: { type: "string", minLength: 1, maxLength: 256 }, passed: { const: true }, durationMs: integer, evidenceDigest: sha } as const;
export const PHASE7_ACCEPTANCE_STEP_SCHEMA_V1: JsonSchema = {
  oneOf: ACCEPTANCE_EVIDENCE_SCHEMAS_V1.map((evidence, index) => object({ ...stepBase, number: { const: index + 1 }, evidence, ...(index === 0 ? {} : { fingerprintCertificateId: id }) })),
};

export function validateAcceptanceStepEvidenceV1(step: { number: number; name: string; evidence: unknown }): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isSafeInteger(step.number) || step.number < 1 || step.number > 35) return [{ path: "$.number", message: "Step number is outside 1-35" }];
  if (step.name !== ACCEPTANCE_STEP_NAMES_V1[step.number - 1]) issues.push({ path: "$.name", message: "Step name does not match the authoritative numbered procedure" });
  const expectedKind = ACCEPTANCE_EVIDENCE_KINDS_V1[step.number - 1];
  if (!step.evidence || typeof step.evidence !== "object" || Array.isArray(step.evidence) || (step.evidence as { kind?: unknown }).kind !== expectedKind) issues.push({ path: "$.evidence.kind", message: `Expected evidence variant ${expectedKind}` });
  issues.push(...validateJsonSchema(ACCEPTANCE_EVIDENCE_SCHEMAS_V1[step.number - 1]!, step.evidence).map((issue) => ({ ...issue, path: issue.path.replace(/^\$/u, "$.evidence") })));
  return issues;
}
