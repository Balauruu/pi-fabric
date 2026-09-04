import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compareCanonicalDecimals, parseCanonicalDecimal } from "../domain/decimal.js";
import { ArborError } from "../domain/errors.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

export interface GraduationThresholdsV1 {
  version: 1;
  policyId: "arbor_phase7_graduation_v1";
  benchmark: { minimumNormalizedDelta: string; requiredDirections: readonly ["maximize", "minimize"] };
  recovery: { minimumSuccessBasisPoints: number; maximumDuplicateEffects: 0 };
  soak: { minimumCycles: number; minimumDurationMs: number };
  latency: { maximumP95Ms: number; maximumP99Ms: number };
  resources: {
    evaluatorWallTimeMs: number;
    evaluatorOutputBytes: number;
    maximumProcesses: number;
    maximumConcurrentAttempts: number;
    maximumRssBytes: number;
    maximumTokensPerAgent: number;
    maximumTotalTokens: number;
    maximumCostPerAgentUsd: string;
    maximumTotalCostUsd: string;
    maximumEvaluatorRuns: number;
  };
  accessibility: { requiredChecks: number; requiredViewports: number; maximumCriticalFindings: 0; maximumSeriousFindings: 0 };
  usability: { requiredJourneys: number; minimumTaskSuccessBasisPoints: number; maximumCriticalFindings: 0; maximumMedianJourneyMs: number };
  security: { requiredDirectChecks: number; maximumCriticalFindings: 0; maximumHighFindings: 0 };
  licensing: { maximumUnresolvedObligations: 0; requireInventoryClosure: true };
}

export interface GraduationThresholdSealV1 {
  version: 1;
  sealId: string;
  sealedAt: string;
  notAfter: string;
  executionNonceDigest: string;
  thresholds: GraduationThresholdsV1;
  thresholdsDigest: string;
  schemaDigest: string;
  sourceDigest: string;
  signerId: string;
  signingAlgorithm: "Ed25519";
  signingPublicKey: string;
  payloadDigest: string;
  signature: string;
  sealDigest: string;
}

const TIMESTAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u;
const ID = /^[a-z][a-z0-9_]{2,63}$/u;
export const GRADUATION_THRESHOLD_SCHEMA_DIGEST_V1 = sha256("pi-fabric-arbor.graduation-threshold-seal.v1.closed");

export const DEFAULT_GRADUATION_THRESHOLDS_V1: GraduationThresholdsV1 = Object.freeze({
  version: 1,
  policyId: "arbor_phase7_graduation_v1",
  benchmark: { minimumNormalizedDelta: "5", requiredDirections: ["maximize", "minimize"] as const },
  recovery: { minimumSuccessBasisPoints: 10_000, maximumDuplicateEffects: 0 as const },
  soak: { minimumCycles: 10_000, minimumDurationMs: 30_000 },
  latency: { maximumP95Ms: 750, maximumP99Ms: 5_000 },
  resources: {
    evaluatorWallTimeMs: 10_000,
    evaluatorOutputBytes: 65_536,
    maximumProcesses: 16,
    maximumConcurrentAttempts: 3,
    maximumRssBytes: 536_870_912,
    maximumTokensPerAgent: 4_096,
    maximumTotalTokens: 12_288,
    maximumCostPerAgentUsd: "1",
    maximumTotalCostUsd: "3",
    maximumEvaluatorRuns: 32,
  },
  accessibility: { requiredChecks: 8, requiredViewports: 3, maximumCriticalFindings: 0 as const, maximumSeriousFindings: 0 as const },
  usability: { requiredJourneys: 2, minimumTaskSuccessBasisPoints: 10_000, maximumCriticalFindings: 0 as const, maximumMedianJourneyMs: 120_000 },
  security: { requiredDirectChecks: 50, maximumCriticalFindings: 0 as const, maximumHighFindings: 0 as const },
  licensing: { maximumUnresolvedObligations: 0 as const, requireInventoryClosure: true as const },
});

function integer(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new ArborError("VALIDATION_FAILED", `${label} is outside its sealed bound`);
}

export function assertGraduationThresholdsV1(value: GraduationThresholdsV1): void {
  if (value.version !== 1 || value.policyId !== "arbor_phase7_graduation_v1") throw new ArborError("VALIDATION_FAILED", "Unsupported graduation threshold policy");
  if (canonicalJson(value.benchmark.requiredDirections) !== canonicalJson(["maximize", "minimize"])) throw new ArborError("VALIDATION_FAILED", "Both benchmark directions are mandatory");
  parseCanonicalDecimal(value.benchmark.minimumNormalizedDelta);
  if (compareCanonicalDecimals(value.benchmark.minimumNormalizedDelta, "0") < 0) throw new ArborError("VALIDATION_FAILED", "Benchmark delta must be nonnegative");
  integer(value.recovery.minimumSuccessBasisPoints, 1, 10_000, "Recovery success");
  if (value.recovery.maximumDuplicateEffects !== 0) throw new ArborError("VALIDATION_FAILED", "Duplicate-effect tolerance must be zero");
  integer(value.soak.minimumCycles, 1_000, 10_000_000, "Soak cycles");
  integer(value.soak.minimumDurationMs, 10_000, 604_800_000, "Soak duration");
  integer(value.latency.maximumP95Ms, 1, 60_000, "p95 latency");
  integer(value.latency.maximumP99Ms, value.latency.maximumP95Ms, 120_000, "p99 latency");
  integer(value.resources.evaluatorWallTimeMs, 1, 3_600_000, "Evaluator wall time");
  integer(value.resources.evaluatorOutputBytes, 1, 16_777_216, "Evaluator output");
  integer(value.resources.maximumProcesses, 1, 1_024, "Process limit");
  integer(value.resources.maximumConcurrentAttempts, 1, 64, "Concurrency limit");
  integer(value.resources.maximumRssBytes, 16_777_216, 68_719_476_736, "RSS limit");
  integer(value.resources.maximumTokensPerAgent, 1, 10_000_000, "Per-agent token limit");
  integer(value.resources.maximumTotalTokens, value.resources.maximumTokensPerAgent, 100_000_000, "Total token limit");
  parseCanonicalDecimal(value.resources.maximumCostPerAgentUsd); parseCanonicalDecimal(value.resources.maximumTotalCostUsd);
  if (compareCanonicalDecimals(value.resources.maximumCostPerAgentUsd, "0") <= 0 || compareCanonicalDecimals(value.resources.maximumTotalCostUsd, value.resources.maximumCostPerAgentUsd) < 0) throw new ArborError("VALIDATION_FAILED", "Cost limits are invalid");
  integer(value.resources.maximumEvaluatorRuns, 1, 100_000, "Evaluator run limit");
  integer(value.accessibility.requiredChecks, 1, 1_000, "Accessibility checks");
  integer(value.accessibility.requiredViewports, 2, 32, "Accessibility viewports");
  if (value.accessibility.maximumCriticalFindings !== 0 || value.accessibility.maximumSeriousFindings !== 0) throw new ArborError("VALIDATION_FAILED", "Accessibility critical and serious tolerances must be zero");
  integer(value.usability.requiredJourneys, 2, 1_000, "Usability journeys");
  integer(value.usability.minimumTaskSuccessBasisPoints, 1, 10_000, "Usability success");
  integer(value.usability.maximumMedianJourneyMs, 1, 3_600_000, "Usability duration");
  if (value.usability.maximumCriticalFindings !== 0 || value.security.maximumCriticalFindings !== 0 || value.security.maximumHighFindings !== 0) throw new ArborError("VALIDATION_FAILED", "Critical/high finding tolerances must be zero");
  integer(value.security.requiredDirectChecks, 1, 10_000, "Security checks");
  if (value.licensing.maximumUnresolvedObligations !== 0 || value.licensing.requireInventoryClosure !== true) throw new ArborError("VALIDATION_FAILED", "License inventory must close with no unresolved obligations");
}

function withoutSealDigest(seal: GraduationThresholdSealV1): Omit<GraduationThresholdSealV1, "sealDigest"> {
  const { sealDigest: _, ...value } = seal; return value;
}

export function createGraduationThresholdSealV1(input: { sealId: string; sealedAt: string; notAfter: string; executionNonce: string; signerId: string; thresholds?: GraduationThresholdsV1 }): GraduationThresholdSealV1 {
  const thresholds = structuredClone(input.thresholds ?? DEFAULT_GRADUATION_THRESHOLDS_V1);
  assertGraduationThresholdsV1(thresholds);
  if (!ID.test(input.sealId) || !ID.test(input.signerId) || !TIMESTAMP.test(input.sealedAt) || !TIMESTAMP.test(input.notAfter) || Date.parse(input.notAfter) <= Date.parse(input.sealedAt)) throw new ArborError("VALIDATION_FAILED", "Threshold seal identity or time window is invalid");
  if (input.executionNonce.length < 32 || input.executionNonce.length > 256) throw new ArborError("VALIDATION_FAILED", "Threshold execution nonce is outside 32-256 bytes");
  const pair = generateKeyPairSync("ed25519");
  const unsigned = {
    version: 1 as const, sealId: input.sealId, sealedAt: input.sealedAt, notAfter: input.notAfter,
    executionNonceDigest: sha256(input.executionNonce), thresholds, thresholdsDigest: digestCanonical(thresholds),
    schemaDigest: GRADUATION_THRESHOLD_SCHEMA_DIGEST_V1, sourceDigest: sha256(readFileSync(new URL(import.meta.url))),
    signerId: input.signerId, signingAlgorithm: "Ed25519" as const,
    signingPublicKey: pair.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
  };
  const payloadDigest = digestCanonical(unsigned);
  const signature = sign(null, Buffer.from(payloadDigest, "hex"), pair.privateKey).toString("base64");
  const withSignature = { ...unsigned, payloadDigest, signature };
  return Object.freeze({ ...withSignature, sealDigest: digestCanonical(withSignature) });
}

export function verifyGraduationThresholdSealV1(seal: GraduationThresholdSealV1, options: { expectedNonce?: string; executionStartedAt?: string; requireActiveSource?: boolean } = {}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  try { assertGraduationThresholdsV1(seal.thresholds); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  try {
    const { sealDigest: _, payloadDigest, signature, ...unsigned } = seal;
    if (seal.payloadDigest !== digestCanonical(unsigned)) errors.push("threshold payload digest mismatch");
    if (seal.sealDigest !== digestCanonical({ ...unsigned, payloadDigest, signature })) errors.push("threshold seal digest mismatch");
    if (!verify(null, Buffer.from(seal.payloadDigest, "hex"), createPublicKey({ key: Buffer.from(seal.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(seal.signature, "base64"))) errors.push("threshold signature mismatch");
  } catch { errors.push("threshold signature is malformed"); }
  if (seal.version !== 1 || seal.schemaDigest !== GRADUATION_THRESHOLD_SCHEMA_DIGEST_V1 || seal.thresholdsDigest !== digestCanonical(seal.thresholds)) errors.push("threshold closed-schema binding mismatch");
  if (!TIMESTAMP.test(seal.sealedAt) || !TIMESTAMP.test(seal.notAfter) || Date.parse(seal.notAfter) <= Date.parse(seal.sealedAt)) errors.push("threshold seal time window is invalid");
  if (options.executionStartedAt && (!TIMESTAMP.test(options.executionStartedAt) || Date.parse(options.executionStartedAt) < Date.parse(seal.sealedAt) || Date.parse(options.executionStartedAt) > Date.parse(seal.notAfter))) errors.push("execution did not start inside the pre-sealed window");
  if (options.expectedNonce && seal.executionNonceDigest !== sha256(options.expectedNonce)) errors.push("threshold execution nonce mismatch");
  if (options.requireActiveSource !== false && seal.sourceDigest !== sha256(readFileSync(new URL(import.meta.url)))) errors.push("threshold source is stale");
  return { valid: errors.length === 0, errors };
}

export function writeGraduationThresholdSealV1(path: string, seal: GraduationThresholdSealV1): void {
  const target = resolve(path);
  if (existsSync(target)) throw new ArborError("DUPLICATE_ENTITY", "Threshold seals are create-only and cannot be replaced");
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.tmp-${process.pid}`; const raw = `${canonicalJson(seal)}\n`;
  writeFileSync(temporary, raw, { mode: 0o400, flag: "wx" }); renameSync(temporary, target); chmodSync(target, 0o400);
  writeFileSync(`${target}.sha256`, `${sha256(raw)}  ${target.split("/").at(-1)}\n`, { mode: 0o400, flag: "wx" });
}

export function readAndVerifyGraduationThresholdSealV1(path: string, options: { executionStartedAt?: string; requireActiveSource?: boolean } = {}): { seal: GraduationThresholdSealV1; valid: boolean; errors: string[] } {
  const target = resolve(path); const stat = lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 262_144 || (stat.mode & 0o222) !== 0) throw new ArborError("EVIDENCE_INVALID", "Threshold seal must be a bounded read-only regular file");
  const raw = readFileSync(target, "utf8"); const seal = JSON.parse(raw) as GraduationThresholdSealV1;
  const result = verifyGraduationThresholdSealV1(seal, options); const checksumPath = `${target}.sha256`;
  if (!existsSync(checksumPath) || readFileSync(checksumPath, "utf8").trim().split(/\s+/u)[0] !== sha256(raw)) result.errors.push("threshold artifact checksum mismatch");
  return { seal, valid: result.errors.length === 0, errors: result.errors };
}

export function graduationThresholdPayloadWithoutSealDigestV1(seal: GraduationThresholdSealV1): Omit<GraduationThresholdSealV1, "sealDigest"> { return withoutSealDigest(seal); }
