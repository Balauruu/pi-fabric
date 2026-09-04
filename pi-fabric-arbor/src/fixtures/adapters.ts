import { aggregateTrials } from "../domain/decimal.js";
import { ArborError } from "../domain/errors.js";
import type { CanonicalDecimal, EvaluationCertificateV1 } from "../domain/types.js";
import { matchesRelativeGlob } from "../schemas/validate.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import type { IdFactory } from "../util/clock.js";
import type {
  AgentObservationV1,
  AgentSpawnRequestV1,
  CandidateFinalizationRequestV1,
  EvaluationRequestV1,
  CleanupAdapter,
  CleanupExecutionRequestV1,
  Evaluator,
  FabricAgentAdapter,
  WorkspaceManager,
  WorkspaceMaterializationRequestV1,
  WorkspaceObservationV1,
} from "../adapters/interfaces.js";

export class FixtureWorkspaceManager implements WorkspaceManager {
  readonly materializations: WorkspaceMaterializationRequestV1[] = [];
  readonly finalizations: CandidateFinalizationRequestV1[] = [];

  async materialize(request: WorkspaceMaterializationRequestV1): Promise<WorkspaceObservationV1> {
    this.materializations.push(structuredClone(request));
    return {
      version: 1,
      workspaceId: request.workspaceId,
      baseOid: request.baseOid,
      identityDigest: digestCanonical(request),
      trust: "fixture",
    };
  }

  async finalize(request: CandidateFinalizationRequestV1) {
    this.finalizations.push(structuredClone(request));
    const protectedChanged = request.changedPaths.some((path) => request.contract.paths.protected.some((glob) => matchesRelativeGlob(path, glob)));
    if (protectedChanged) throw new ArborError("EVIDENCE_INVALID", "Fixture candidate changed a protected path");
    const outsideEditable = request.changedPaths.some((path) => !request.contract.paths.editable.some((glob) => matchesRelativeGlob(path, glob)));
    if (outsideEditable) throw new ArborError("EVIDENCE_INVALID", "Fixture candidate changed a path outside the editable set");
    const missingOutput = request.contract.paths.requiredOutputs.find((path) => !request.changedPaths.includes(path));
    if (missingOutput) throw new ArborError("EVIDENCE_INVALID", "Fixture candidate omitted a required output", { path: missingOutput });
    const candidateOid = sha256(canonicalJson(request)).slice(0, request.baseOid.length);
    return {
      version: 1 as const,
      candidateId: request.candidateId,
      hypothesisId: request.hypothesisId,
      attemptId: request.attemptId,
      baseOid: request.baseOid,
      candidateOid,
      changedPaths: [...request.changedPaths],
      manifestDigest: digestCanonical({ candidateOid, changedPaths: request.changedPaths }),
    };
  }
}

export class ScriptedFixtureAgent implements FabricAgentAdapter {
  readonly calls: AgentSpawnRequestV1[] = [];
  constructor(private readonly changedPaths: string[] = ["src/solution.ts"], private readonly claimedMetric: CanonicalDecimal = "999") {}

  async spawn(request: AgentSpawnRequestV1): Promise<AgentObservationV1> {
    this.calls.push(structuredClone(request));
    return {
      version: 1,
      childHandle: `fixture_child_${sha256(canonicalJson(request)).slice(0, 32)}`,
      dispatchKey: request.dispatch.dispatchKey,
      changedPaths: [...this.changedPaths],
      claimedMetric: this.claimedMetric,
      rawResultDigest: digestCanonical({ request, changedPaths: this.changedPaths }),
      terminalStatus: "completed",
      boundedOutput: "fixture worker completed",
    };
  }
}

export class FixtureCleanupAdapter implements CleanupAdapter {
  readonly calls: CleanupExecutionRequestV1[] = [];
  async execute(request: CleanupExecutionRequestV1) {
    this.calls.push(structuredClone(request));
    return { version: 1 as const, cleanupId: request.cleanupId, outcome: "completed" as const };
  }
}

export type FixtureTrialPlan = Partial<Record<EvaluationCertificateV1["role"], CanonicalDecimal[]>>;

export class FixtureEvaluator implements Evaluator {
  readonly calls: EvaluationRequestV1[] = [];
  constructor(private readonly ids: IdFactory, private readonly plan: FixtureTrialPlan = {}) {}

  async evaluate(request: EvaluationRequestV1): Promise<EvaluationCertificateV1> {
    this.calls.push(structuredClone(request));
    const split = request.role.startsWith("development") ? "development" : "heldOut";
    const evaluatorId = split === "development" ? request.contract.evaluation.development : request.contract.evaluation.heldOut;
    const defaultValue = request.role.endsWith("Baseline") ? "1" : "1.2";
    const rawTrials = this.plan[request.role] ?? Array.from({ length: request.contract.metric.trialCount }, () => defaultValue);
    const aggregated = aggregateTrials(rawTrials, request.contract.metric.quantum, request.contract.metric.aggregation, request.contract.metric.nondeterminismTolerance);
    const valid = !aggregated.nondeterministic;
    const record = {
      request: { ...request, contract: undefined },
      rawTrials,
      quantizedUnits: aggregated.quantized.map(String),
      aggregateUnits: String(aggregated.aggregate),
      spreadUnits: String(aggregated.spread),
    };
    return {
      version: 1,
      certificateId: request.certificateId || this.ids.next("certificate"),
      evaluationId: request.evaluationId,
      runId: request.runId,
      epochDigest: request.epochDigest,
      contractDigest: request.contractDigest,
      role: request.role,
      oid: request.oid,
      evaluatorId,
      parserVersion: request.contract.evaluation.parserVersion,
      metric: request.contract.metric.name,
      unit: request.contract.metric.unit,
      quantum: request.contract.metric.quantum,
      rawTrials: [...rawTrials],
      quantizedUnits: aggregated.quantized.map(String),
      aggregateUnits: String(aggregated.aggregate),
      spreadUnits: String(aggregated.spread),
      valid,
      ...(valid ? {} : { rejectionReason: "NONDETERMINISTIC" }),
      outputDigest: digestCanonical(record),
      trust: "fixture",
    };
  }
}
