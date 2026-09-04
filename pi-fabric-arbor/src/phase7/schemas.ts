import type { JsonSchema } from "../schemas/catalog.js";
import { PHASE7_ACCEPTANCE_EVIDENCE_SCHEMA_V1, PHASE7_ACCEPTANCE_STEP_SCHEMA_V1 } from "./acceptance-evidence.js";

const sha = { type: "string", pattern: "^[0-9a-f]{64}$", minLength: 64, maxLength: 64 } as const;
const id = { type: "string", pattern: "^[a-z][a-z0-9_]{2,63}$", minLength: 3, maxLength: 64 } as const;
const timestamp = { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$", minLength: 24, maxLength: 24 } as const;
const integer = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const object = (properties: Record<string, JsonSchema>, required = Object.keys(properties)): JsonSchema => ({ type: "object", properties, required, additionalProperties: false });
const array = (items: JsonSchema, minItems: number, maxItems: number): JsonSchema => ({ type: "array", items, minItems, maxItems });

const thresholdPolicy = object({
  version: { const: 1 }, policyId: { const: "arbor_phase7_graduation_v1" },
  benchmark: object({ minimumNormalizedDelta: { type: "string", pattern: "^(?:0|[1-9][0-9]{0,26})(?:\\.[0-9]{1,9})?$", maxLength: 37 }, requiredDirections: { type: "array", prefixItems: [{ const: "maximize" }, { const: "minimize" }], minItems: 2, maxItems: 2 } }),
  recovery: object({ minimumSuccessBasisPoints: integer, maximumDuplicateEffects: { const: 0 } }), soak: object({ minimumCycles: integer, minimumDurationMs: integer }), latency: object({ maximumP95Ms: integer, maximumP99Ms: integer }),
  resources: object({ evaluatorWallTimeMs: integer, evaluatorOutputBytes: integer, maximumProcesses: integer, maximumConcurrentAttempts: integer, maximumRssBytes: integer, maximumTokensPerAgent: integer, maximumTotalTokens: integer, maximumCostPerAgentUsd: { type: "string", minLength: 1, maxLength: 37 }, maximumTotalCostUsd: { type: "string", minLength: 1, maxLength: 37 }, maximumEvaluatorRuns: integer }),
  accessibility: object({ requiredChecks: integer, requiredViewports: integer, maximumCriticalFindings: { const: 0 }, maximumSeriousFindings: { const: 0 } }), usability: object({ requiredJourneys: integer, minimumTaskSuccessBasisPoints: integer, maximumCriticalFindings: { const: 0 }, maximumMedianJourneyMs: integer }), security: object({ requiredDirectChecks: integer, maximumCriticalFindings: { const: 0 }, maximumHighFindings: { const: 0 } }), licensing: object({ maximumUnresolvedObligations: { const: 0 }, requireInventoryClosure: { const: true } }),
});

export const GRADUATION_THRESHOLD_SEAL_SCHEMA_V1: JsonSchema = object({ version: { const: 1 }, sealId: id, sealedAt: timestamp, notAfter: timestamp, executionNonceDigest: sha, thresholds: thresholdPolicy, thresholdsDigest: sha, schemaDigest: sha, sourceDigest: sha, signerId: id, signingAlgorithm: { const: "Ed25519" }, signingPublicKey: { type: "string", minLength: 32, maxLength: 1024 }, payloadDigest: sha, signature: { type: "string", minLength: 32, maxLength: 1024 }, sealDigest: sha });
export const PHASE7_ACCEPTANCE_SUMMARY_SCHEMA_V1: JsonSchema = object({ version: { const: 1 }, certificateId: id, direction: { enum: ["maximize", "minimize"] }, runId: id, startedAt: timestamp, completedAt: timestamp, durationMs: integer, thresholdSealDigest: sha, contractDigest: sha, steps: array(PHASE7_ACCEPTANCE_STEP_SCHEMA_V1, 35, 35), passed: { type: "boolean" }, certificateDigest: sha });
export const PHASE7_GRADUATION_SUMMARY_SCHEMA_V1: JsonSchema = object({ version: { const: 1 }, certificationId: { const: "phase7_graduation_v1" }, createdAt: timestamp, thresholdSealId: id, thresholdSealDigest: sha, platformCertificateDigest: sha, maximizeAcceptanceDigest: sha, minimizeAcceptanceDigest: sha, benchmarkResultDigest: sha, soakResultDigest: sha, browserEvidenceDigest: sha, unresolvedPredicates: array({ type: "string", minLength: 1, maxLength: 512 }, 0, 128), passed: { type: "boolean" }, payloadDigest: sha, signature: { type: "string", minLength: 32, maxLength: 1024 }, certificateDigest: sha });
export { PHASE7_ACCEPTANCE_EVIDENCE_SCHEMA_V1, PHASE7_ACCEPTANCE_STEP_SCHEMA_V1 };
export const PHASE7_SCHEMAS_V1 = Object.freeze({ thresholdSeal: GRADUATION_THRESHOLD_SEAL_SCHEMA_V1, acceptanceEvidence: PHASE7_ACCEPTANCE_EVIDENCE_SCHEMA_V1, acceptanceStep: PHASE7_ACCEPTANCE_STEP_SCHEMA_V1, acceptanceSummary: PHASE7_ACCEPTANCE_SUMMARY_SCHEMA_V1, graduationSummary: PHASE7_GRADUATION_SUMMARY_SCHEMA_V1 });
