import { ArborApplication } from "../application/ArborApplication.js";
import type { RunStore } from "../persistence/RunStore.js";
import type { ArborCommandV1, ArborContractV1, CommandContextV1, RunAggregateV1, WebIntentV1 } from "../domain/types.js";
import type { Clock } from "../util/clock.js";

export function createFixtureContract(direction: "maximize" | "minimize" = "maximize"): ArborContractV1 {
  return {
    version: 1,
    objective: "Improve the deterministic fixture metric without changing protected content.",
    repository: { repositoryId: "repo_fixture", initialOid: "1".repeat(40), dirtyPolicy: "committedOnly" },
    metric: {
      name: "fixture.score", direction, unit: "points", quantum: "0.1", minimumImprovement: "0.1",
      trialCount: 1, aggregation: "single", nondeterminismTolerance: "0",
    },
    evaluation: { development: "eval_development", heldOut: "eval_heldout", parserVersion: "parser_fixture", invalidTrialPolicy: "failEvaluation" },
    paths: { editable: ["src/**"], protected: ["protected/**"], requiredOutputs: ["src/solution.ts"] },
    permissions: { tools: ["tool_fixture"], network: false, packageInstallation: false, processExecution: false, credentialAliases: [] },
    budgets: {
      maxHypotheses: 3, maxAttempts: 3, maxConcurrentAttempts: 1, maxRetriesPerHypothesis: 1,
      maxCycles: 3, wallTimeMs: 60_000, maxAgentCalls: 3, evaluatorRuns: 4,
      finalizationReserve: { attempts: 1, agentCalls: 1, evaluatorRuns: 1, wallTimeMs: 10_000 },
    },
    gates: { beforeDispatch: "policy", beforePromotion: "always", timeout: "pause" },
    promotion: { mode: "packageWinnerRef" },
    retentionClass: "retain_fixture",
  };
}

type CommandWithoutMetadata = ArborCommandV1 extends infer Command
  ? Command extends { metadata: unknown }
    ? Omit<Command, "metadata">
    : never
  : never;

export interface FixtureDriverResultV1 {
  version: 1;
  run: RunAggregateV1;
  commands: number;
}

export class FixtureDriver {
  #revision = 0;
  #fence = 0;
  #serial = 0;
  readonly driverId = "driver_fixture";

  constructor(private readonly application: ArborApplication, private readonly store: RunStore, private readonly clock: Clock) {}

  #key(label: string): string {
    this.#serial += 1;
    return `fixture_${label}_${this.#serial.toString().padStart(8, "0")}`.slice(0, 128).padEnd(16, "_");
  }

  #context(): CommandContextV1 {
    return { driverId: this.driverId, fence: this.#fence, now: this.clock.now() };
  }

  async #execute(command: CommandWithoutMetadata, runId: string) {
    const complete = { ...command, metadata: { runId, expectedRevision: this.#revision, idempotencyKey: this.#key(command.kind) } } as ArborCommandV1;
    const receipt = await this.application.execute(complete, this.#context());
    this.#revision = receipt.revision;
    return receipt;
  }

  async run(runId = "run_fixture", contract = createFixtureContract(), finalOutcome: "NO_PROMOTION" | "FAILED" = "NO_PROMOTION"): Promise<FixtureDriverResultV1> {
    await this.#execute({ version: 1, kind: "start", contract }, runId);
    await this.#execute({ version: 1, kind: "claimDriver", driverId: this.driverId, leaseMs: 300_000 }, runId);
    this.#fence = 1;

    await this.#execute({ version: 1, kind: "advance" }, runId);
    await this.#roundTripIntent(runId, { version: 1, kind: "pause", expectedRevision: this.#revision, reason: "fixture yield pause" });
    await this.#roundTripIntent(runId, { version: 1, kind: "resume", expectedRevision: this.#revision });

    await this.#execute({ version: 1, kind: "evaluate", role: "developmentBaseline", oid: contract.repository.initialOid }, runId);
    await this.#execute({ version: 1, kind: "advance" }, runId);
    await this.#execute({ version: 1, kind: "evaluate", role: "heldOutBaseline", oid: contract.repository.initialOid }, runId);
    await this.#execute({ version: 1, kind: "advance" }, runId);
    await this.#execute({
      version: 1,
      kind: "proposeHypothesis",
      hypothesis: { version: 1, hypothesisId: "hypothesis_fixture", rationale: "A bounded fixture change should improve the canonical score.", plan: ["Write the admitted fixture output." ] },
    }, runId);
    const selectDirective = await this.#execute({ version: 1, kind: "advance" }, runId);
    if (selectDirective.directive?.kind !== "selectHypothesis") throw new Error("Fixture driver expected selection directive");
    await this.#execute({ version: 1, kind: "selectHypothesis", hypothesisId: selectDirective.directive.hypothesisId }, runId);
    const reserve = await this.#execute({ version: 1, kind: "reserveAgentDispatch", hypothesisId: "hypothesis_fixture" }, runId);
    if (reserve.directive?.kind !== "materializeWorkspace") throw new Error("Fixture driver expected workspace directive");
    const materialized = await this.#execute({ version: 1, kind: "materializeWorkspace", attemptId: reserve.directive.attemptId }, runId);
    if (materialized.directive?.kind !== "dispatchAgent") throw new Error("Fixture driver expected agent directive");
    const dispatch = materialized.directive.dispatch;
    const observation = await this.application.agent.spawn({ version: 1, dispatch });
    await this.#execute({
      version: 1, kind: "attachAgentChild", attemptId: dispatch.attemptId,
      childHandle: observation.childHandle, dispatchKey: observation.dispatchKey,
    }, runId);
    await this.#execute({
      version: 1, kind: "submitAgentObservation", attemptId: dispatch.attemptId,
      dispatchKey: observation.dispatchKey, changedPaths: observation.changedPaths,
      rawResultDigest: observation.rawResultDigest, terminalStatus: observation.terminalStatus,
      boundedOutput: observation.boundedOutput,
      ...(observation.claimedMetric ? { claimedMetric: observation.claimedMetric } : {}),
    }, runId);
    const finalized = await this.#execute({ version: 1, kind: "finalizeCandidate", attemptId: dispatch.attemptId }, runId);
    if (finalized.directive?.kind !== "evaluateCandidate") throw new Error("Fixture driver expected candidate evaluation directive");
    await this.#execute({ version: 1, kind: "evaluate", role: "developmentCandidate", oid: finalized.directive.oid, candidateId: finalized.directive.candidateId }, runId);
    const finalizedRun = await this.#execute({ version: 1, kind: "finalizeRun", outcome: finalOutcome }, runId);
    if (finalizedRun.directive?.kind !== "publishReport") throw new Error("Fixture driver expected terminal report publication directive");
    const generationId = finalizedRun.directive.generationId;
    const generation = (await this.#requiredRun(runId)).reports.find((entry) => entry.generationId === generationId)!;
    await this.#execute({ version: 1, kind: "publishReport", generationId: generation.generationId }, runId);
    await this.#execute({ version: 1, kind: "observeReport", generationId: generation.generationId }, runId);
    const run = await this.#requiredRun(runId);
    return { version: 1, run, commands: this.#serial };
  }

  async #roundTripIntent(runId: string, intent: WebIntentV1): Promise<void> {
    const receipt = await this.application.submitIntent(intent, {
      version: 1, sessionId: "session_fixture", runId, idempotencyKey: this.#key(`web_${intent.kind}`), csrfValidated: true, originValidated: true,
    });
    this.#revision = receipt.revision;
    if (receipt.state !== "PENDING") throw new Error(`Fixture intent ${intent.kind} was not admitted`);
    await this.#execute({ version: 1, kind: "processIntent", intentId: receipt.intentId }, runId);
  }

  async #requiredRun(runId: string): Promise<RunAggregateV1> {
    const run = await this.store.load(runId);
    if (!run) throw new Error(`Missing fixture run ${runId}`);
    return run;
  }
}
