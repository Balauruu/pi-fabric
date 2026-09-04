import { compareAggregates, exactUnits, formatQuantumUnits } from "../domain/decimal.js";
import { ArborError } from "../domain/errors.js";
import type { HeldOutEvaluationServiceReceiptV1 } from "../evaluation/SealedHeldOutEvaluatorService.js";
import { canonicalJson, digestCanonical } from "../util/canonical.js";
import type { GraduationThresholdSealV1 } from "./thresholds.js";
import { verifyGraduationThresholdSealV1 } from "./thresholds.js";

export interface BenchmarkWorkflowV1 {
  version: 1;
  workflowId: "baseline_single_isolated_attempt_v1" | "candidate_arbor_parallel_recovery_v1";
  description: string;
  attempts: number;
  recovery: "none" | "journaled-four-way";
  evaluatorAuthority: "sealed-held-out-service";
  workflowDigest: string;
}
export interface DirectionBenchmarkResultV1 {
  version: 1;
  direction: "maximize" | "minimize";
  baseline: HeldOutEvaluationServiceReceiptV1;
  candidate: HeldOutEvaluationServiceReceiptV1;
  baselineUnits: string;
  candidateUnits: string;
  normalizedDeltaUnits: string;
  normalizedDelta: string;
  threshold: string;
  samePolicy: boolean;
  passed: boolean;
  resultDigest: string;
}
export interface Phase7BenchmarkResultV1 {
  version: 1;
  benchmarkId: string;
  startedAt: string;
  completedAt: string;
  thresholdSealDigest: string;
  baselineWorkflow: BenchmarkWorkflowV1;
  candidateWorkflow: BenchmarkWorkflowV1;
  directions: DirectionBenchmarkResultV1[];
  passed: boolean;
  resultDigest: string;
}

function workflow(input: Omit<BenchmarkWorkflowV1, "version" | "workflowDigest">): BenchmarkWorkflowV1 {
  const payload = { version: 1 as const, ...input }; return Object.freeze({ ...payload, workflowDigest: digestCanonical(payload) });
}
export const BASELINE_WORKFLOW_V1 = workflow({ workflowId: "baseline_single_isolated_attempt_v1", description: "One isolated attempt, no retry recovery, canonical sealed evaluator.", attempts: 1, recovery: "none", evaluatorAuthority: "sealed-held-out-service" });
export const CANDIDATE_WORKFLOW_V1 = workflow({ workflowId: "candidate_arbor_parallel_recovery_v1", description: "Three isolated attempts with journaled completion-before-commit recovery and new-ID retry, canonical sealed evaluator.", attempts: 3, recovery: "journaled-four-way", evaluatorAuthority: "sealed-held-out-service" });

function compare(direction: "maximize" | "minimize", baseline: HeldOutEvaluationServiceReceiptV1, candidate: HeldOutEvaluationServiceReceiptV1, threshold: string): DirectionBenchmarkResultV1 {
  const samePolicy = baseline.evaluatorPolicyDigest === candidate.evaluatorPolicyDigest && baseline.evaluatorId === candidate.evaluatorId && baseline.heldOutInputDigest === candidate.heldOutInputDigest && baseline.containmentCertificateDigest === candidate.containmentCertificateDigest;
  const baselineUnits = exactUnits(baseline.value, "1"); const candidateUnits = exactUnits(candidate.value, "1"); const comparison = compareAggregates(candidateUnits, baselineUnits, direction, threshold, "1");
  const payload = { version: 1 as const, direction, baseline, candidate, baselineUnits: baselineUnits.toString(), candidateUnits: candidateUnits.toString(), normalizedDeltaUnits: comparison.normalizedImprovement.toString(), normalizedDelta: formatQuantumUnits(comparison.normalizedImprovement, "1"), threshold, samePolicy, passed: samePolicy && comparison.passes };
  return Object.freeze({ ...payload, resultDigest: digestCanonical(payload) });
}

export function buildPhase7BenchmarkResultV1(input: { benchmarkId: string; startedAt: string; completedAt: string; seal: GraduationThresholdSealV1; maximize: { baseline: HeldOutEvaluationServiceReceiptV1; candidate: HeldOutEvaluationServiceReceiptV1 }; minimize: { baseline: HeldOutEvaluationServiceReceiptV1; candidate: HeldOutEvaluationServiceReceiptV1 } }): Phase7BenchmarkResultV1 {
  const verified = verifyGraduationThresholdSealV1(input.seal, { executionStartedAt: input.startedAt }); if (!verified.valid) throw new ArborError("EVIDENCE_INVALID", "Benchmark threshold seal is invalid or stale", { errors: verified.errors });
  const directions = [compare("maximize", input.maximize.baseline, input.maximize.candidate, input.seal.thresholds.benchmark.minimumNormalizedDelta), compare("minimize", input.minimize.baseline, input.minimize.candidate, input.seal.thresholds.benchmark.minimumNormalizedDelta)];
  if (canonicalJson(directions.map((entry) => entry.direction)) !== canonicalJson(input.seal.thresholds.benchmark.requiredDirections)) throw new ArborError("EVIDENCE_INVALID", "Benchmark directions do not match the pre-sealed protocol");
  const payload = { version: 1 as const, benchmarkId: input.benchmarkId, startedAt: input.startedAt, completedAt: input.completedAt, thresholdSealDigest: input.seal.sealDigest, baselineWorkflow: BASELINE_WORKFLOW_V1, candidateWorkflow: CANDIDATE_WORKFLOW_V1, directions, passed: directions.every((entry) => entry.passed) };
  return Object.freeze({ ...payload, resultDigest: digestCanonical(payload) });
}

export function verifyPhase7BenchmarkResultV1(result: Phase7BenchmarkResultV1, seal: GraduationThresholdSealV1): { valid: boolean; errors: string[] } {
  const errors: string[] = []; const { resultDigest, ...payload } = result;
  if (resultDigest !== digestCanonical(payload)) errors.push("benchmark result digest mismatch");
  if (result.thresholdSealDigest !== seal.sealDigest || !verifyGraduationThresholdSealV1(seal, { executionStartedAt: result.startedAt }).valid) errors.push("benchmark threshold binding is stale");
  if (canonicalJson(result.baselineWorkflow) !== canonicalJson(BASELINE_WORKFLOW_V1) || canonicalJson(result.candidateWorkflow) !== canonicalJson(CANDIDATE_WORKFLOW_V1)) errors.push("benchmark workflow differs from the sealed explicit baseline/candidate protocol");
  if (result.directions.length !== 2 || result.directions.some((entry) => entry.resultDigest !== digestCanonical(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "resultDigest"))) || !entry.samePolicy || !entry.passed)) errors.push("benchmark direction result is incomplete or failed");
  if (!result.passed) errors.push("benchmark did not meet the sealed delta");
  return { valid: errors.length === 0, errors };
}
