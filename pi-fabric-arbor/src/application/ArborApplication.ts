import { ArborError } from "../domain/errors.js";
import { compareAggregates } from "../domain/decimal.js";
import {
  ATTEMPT_TRANSITIONS,
  AUTHORIZATION_TRANSITIONS,
  CLEANUP_TRANSITIONS,
  EFFECT_TRANSITIONS,
  EXPLORATION_TRANSITIONS,
  GATE_TRANSITIONS,
  HYPOTHESIS_TRANSITIONS,
  PROMOTION_TRANSITIONS,
  REPORT_TRANSITIONS,
  RUN_TRANSITIONS,
  assertTransition,
} from "../domain/state-machines.js";
import type {
  ArborCommandV1,
  ArborDirectiveV1,
  AuthorizationPayloadV1,
  AuthorizationRecordV1,
  FabricPolicyTraversalProofV1,
  RuntimeAdmissionEvidenceV1,
  ArborQueryV1,
  ArborViewV1,
  AttemptState,
  AttemptV1,
  CommandContextV1,
  CommandReceiptV1,
  EffectBoundaryKind,
  EffectIdentityV1,
  EffectObservationV1,
  EffectV1,
  EventPageV1,
  HypothesisV1,
  IntentReceiptV1,
  MergeConstructionV1,
  PromotionV1,
  QueryContextV1,
  RunAggregateV1,
  WebIntentV1,
  WebSessionV1,
} from "../domain/types.js";
import type { CleanupAdapter, Evaluator, FabricAgentAdapter, ReportPublisher, WorkspaceManager } from "../adapters/interfaces.js";
import type { MutationDecisionV1, RunStore, StoredMutationV1 } from "../persistence/RunStore.js";
import { buildReportManifest, renderReportFiles } from "../reports/FileReportPublisher.js";
import { createArborSchemaCatalogV1, type ArborSchemaCatalogV1 } from "../schemas/catalog.js";
import { assertContractSemantics, assertGateAnswer, assertJsonSchema, type AdministratorAdmissions } from "../schemas/validate.js";
import { canonicalJson, digestCanonical, immutableClone, sha256 } from "../util/canonical.js";
import type { Clock, IdFactory } from "../util/clock.js";
import { redactText, redactValue } from "../web/redaction.js";
import type { PromotionGitIntegrator } from "../git/PromotionGitIntegrator.js";
import type { TrustedPrincipalRegistry } from "../authorization/TrustedPrincipal.js";
import { retentionDecision } from "../retention/policy.js";
import type { FabricPolicyTraversalAuthority, FabricPolicyTraversalRequestV1 } from "../authorization/FabricPolicyTraversal.js";
import { assertProductionAdmissionV1, type ProductionAdmissionV1 } from "./ProductionAdmission.js";
import { assertFabricProviderPolicyTraversalCapabilityV1 } from "./provider-capability.js";

export interface ArborApplicationV1 {
  execute(command: ArborCommandV1, context: CommandContextV1): Promise<CommandReceiptV1>;
  query(query: ArborQueryV1, context: QueryContextV1): Promise<ArborViewV1>;
  submitIntent(intent: WebIntentV1, session: WebSessionV1): Promise<IntentReceiptV1>;
  readEvents(runId: string, afterSequence: number, limit: number): Promise<EventPageV1>;
}

export interface ArborApplicationDependenciesV1 {
  store: RunStore;
  workspace: WorkspaceManager;
  agent: FabricAgentAdapter;
  evaluator: Evaluator;
  reportPublisher: ReportPublisher;
  cleanup: CleanupAdapter;
  clock: Clock;
  ids: IdFactory;
  gitOidLength: 40 | 64;
  /** Fixture is explicit and test-only. Omitting mode is fail-closed. */
  executionMode?: "fixture" | "productionBlocked";
  /** The only production path: an identity-bound token from the graduated loader. */
  productionAdmission?: ProductionAdmissionV1;
  phase5?: {
    git: PromotionGitIntegrator;
    authorization: TrustedPrincipalRegistry;
    heldOutIsolationCertificateDigest: string;
    challengeTtlMs?: number;
  };
  productionDispatch?: {
    containmentId: string;
    agentProfileId: string;
    requestSchemaDigest: string;
    resultSchemaDigest: string;
    toolPolicyId: string;
  };
  admissions?: AdministratorAdmissions;
  legalHoldRunIds?: ReadonlySet<string>;
}

interface FabricPolicyInvocationV1 { parentToolCallId: string; nestedToolCallId: string }

function addMilliseconds(timestamp: string, milliseconds: number): string {
  return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}
function findAttempt(run: RunAggregateV1, attemptId: string): AttemptV1 {
  const attempt = run.attempts.find((entry) => entry.attemptId === attemptId);
  if (!attempt) throw new ArborError("UNKNOWN_ENTITY", "Unknown attempt", { attemptId });
  return attempt;
}
function findEffect(run: RunAggregateV1, predicate: (effect: EffectV1) => boolean): EffectV1 {
  const effect = run.effects.find(predicate);
  if (!effect) throw new ArborError("UNKNOWN_ENTITY", "Required effect intent does not exist");
  return effect;
}
function isActive(state: RunAggregateV1["state"]): boolean {
  return ["ADMITTED", "BASELINING", "EXPLORING", "VERIFYING_FINAL", "AWAITING_PROMOTION", "PROMOTING"].includes(state);
}
function terminalStateForOutcome(run: RunAggregateV1): RunAggregateV1["state"] {
  if (run.outcome === "NO_PROMOTION" || run.outcome === "PROMOTED") return "COMPLETED";
  if (run.outcome === "ROLLED_BACK") return "ROLLED_BACK";
  if (run.outcome === "CANCELLED") return "CANCELLED";
  if (run.outcome === "INDETERMINATE") return "INDETERMINATE";
  if (run.outcome === "QUARANTINED") return "QUARANTINED";
  return "FAILED";
}

function nextLegalAction(run: RunAggregateV1): string {
  if (run.state === "PAUSED") return "request resume";
  if (run.state === "WAITING_INPUT") return "answer open gate";
  if (run.state === "AWAITING_PROMOTION") return "inspect canonical evidence, then request promotion";
  if (run.state === "ROLLBACK_REQUESTED") return "obtain fresh local rollback authorization and Fabric policy approval";
  if (run.state === "REPORT_PENDING") return "publish and observe the planned report generation";
  if (run.state === "CLEANUP_PENDING") return "reconcile manifest-driven cleanup debt";
  if (["COMPLETED", "ROLLED_BACK", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED"].includes(run.state)) return "inspect report, rollback eligibility, and cleanup debt";
  if (!run.driver) return "start an admitted Fabric driver when certification permits";
  return `advance ${run.phase}`;
}

function querySummary(run: RunAggregateV1, executionMode: "fixture" | "productionBlocked" | "productionCertified"): Record<string, unknown> {
  return {
    state: run.state,
    phase: run.phase,
    outcome: run.outcome ?? "pending",
    nextAction: nextLegalAction(run),
    revision: run.revision,
    epochDigest: run.epochDigest,
    trust: run.certificates.length > 0 && run.certificates.every((entry) => entry.valid && entry.trust === "certified") ? "certificate-bound" : "fixture-or-uncertified",
    executionGate: executionMode === "productionCertified" ? "production-certified" : executionMode === "fixture" ? "fixture-only" : "B1 real Fabric execution blocked",
  };
}

function candidateComparisons(run: RunAggregateV1): Array<Record<string, unknown>> {
  const baseline = run.certificates.find((entry) => entry.role === "developmentBaseline" && entry.valid);
  return run.candidates.map((candidate) => {
    const certificate = run.certificates.find((entry) => entry.role === "developmentCandidate" && entry.valid && (entry.candidateOid === candidate.candidateOid || entry.oid === candidate.candidateOid));
    let normalizedDeltaUnits: string | undefined;
    if (baseline && certificate) {
      const delta = run.contract.metric.direction === "maximize" ? BigInt(certificate.aggregateUnits) - BigInt(baseline.aggregateUnits) : BigInt(baseline.aggregateUnits) - BigInt(certificate.aggregateUnits);
      normalizedDeltaUnits = delta.toString();
    }
    return { version: 1, candidateId: candidate.candidateId, candidateOid: candidate.candidateOid, baseOid: candidate.baseOid, attemptId: candidate.attemptId, changedPaths: candidate.changedPaths, manifestDigest: candidate.manifestDigest, certificateId: certificate?.certificateId ?? "missing", canonicalAggregateUnits: certificate?.aggregateUnits ?? "missing", normalizedDeltaUnits: normalizedDeltaUnits ?? "unavailable", trust: certificate?.trust ?? "unavailable", valid: certificate?.valid ?? false, isBest: candidate.candidateId === run.bestCandidateId };
  });
}

const terminalEffectStates = new Set<EffectV1["state"]>(["COMMITTED", "FAILED_ABSENT", "FAILED", "INDETERMINATE", "CANCELLED_CONFIRMED"]);

export class ArborApplication implements ArborApplicationV1 {
  readonly schemas: ArborSchemaCatalogV1;
  readonly agent: FabricAgentAdapter;
  #store: RunStore;
  #workspace: WorkspaceManager;
  #evaluator: Evaluator;
  #reportPublisher: ReportPublisher;
  #cleanup: CleanupAdapter;
  #clock: Clock;
  #ids: IdFactory;
  #admissions: AdministratorAdmissions;
  #executionMode: "fixture" | "productionBlocked" | "productionCertified";
  #runtimeAdmission: RuntimeAdmissionEvidenceV1;
  #fabricPolicyTraversal: FabricPolicyTraversalAuthority | undefined;
  #productionDispatch: NonNullable<ArborApplicationDependenciesV1["productionDispatch"]> | undefined;
  #phase5: NonNullable<ArborApplicationDependenciesV1["phase5"]> | undefined;
  #legalHoldRunIds: ReadonlySet<string>;
  #tail: Promise<void> = Promise.resolve();

  constructor(dependencies: ArborApplicationDependenciesV1) {
    this.#store = dependencies.store;
    this.#workspace = dependencies.workspace;
    this.agent = dependencies.agent;
    this.#evaluator = dependencies.evaluator;
    this.#reportPublisher = dependencies.reportPublisher;
    this.#cleanup = dependencies.cleanup;
    this.#clock = dependencies.clock;
    this.#ids = dependencies.ids;
    this.#admissions = dependencies.admissions ?? {};
    this.#productionDispatch = dependencies.productionDispatch;
    this.#phase5 = dependencies.phase5;
    this.#legalHoldRunIds = dependencies.legalHoldRunIds ?? new Set<string>();
    if (dependencies.productionAdmission) {
      if (dependencies.executionMode !== undefined || !this.#productionDispatch || !this.#phase5) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Production construction requires only the graduated admission path and complete Phase 5 bindings");
      const authority = assertProductionAdmissionV1(dependencies.productionAdmission, {
        store: dependencies.store, workspace: dependencies.workspace, agent: dependencies.agent, evaluator: dependencies.evaluator,
        reportPublisher: dependencies.reportPublisher, cleanup: dependencies.cleanup, git: this.#phase5.git,
        authorization: this.#phase5.authorization, heldOutIsolationCertificateDigest: this.#phase5.heldOutIsolationCertificateDigest, productionDispatch: this.#productionDispatch,
      });
      this.#executionMode = "productionCertified";
      this.#fabricPolicyTraversal = authority.fabricPolicyTraversal;
      this.#runtimeAdmission = authority.evidence;
    } else {
      if (dependencies.executionMode !== undefined && dependencies.executionMode !== "fixture" && dependencies.executionMode !== "productionBlocked") throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Caller-asserted production execution mode is prohibited; use a graduated admission token");
      this.#executionMode = dependencies.executionMode ?? "productionBlocked";
      this.#fabricPolicyTraversal = undefined;
      const mode = this.#executionMode === "fixture" ? "fixture" as const : "production-blocked" as const;
      const label = this.#executionMode === "fixture" ? "explicit-test-fixture-v1" : "production-admission-absent";
      this.#runtimeAdmission = { version: 1, mode, admissionDigest: sha256(label), configurationDigest: sha256(label), packageInventoryDigest: sha256(label), packagedDistDigest: sha256(label), arborSourceDigest: sha256(label), piFabricPackageDigest: sha256(label), hostPiFabricPackageDigest: sha256(label), certificationArtifactDigest: sha256(label), piFabricVersion: "unavailable", certificateIds: [], certificateDigests: [], gateResults: {}, gateEvidenceDigests: {}, blockers: this.#executionMode === "fixture" ? ["test fixture - no production claim"] : ["graduated production admission is absent"] };
    }
    this.schemas = createArborSchemaCatalogV1(dependencies.gitOidLength);
  }

  async #locked<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#tail;
    let release!: () => void;
    this.#tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  }

  async execute(command: ArborCommandV1, suppliedContext: CommandContextV1): Promise<CommandReceiptV1> {
    return this.#locked(() => this.#executeLocked(command, suppliedContext));
  }

  /** Host-only path for write emission. The package provider supplies the active Fabric call identity. */
  /** @internal This method also requires an unexported package capability. */
  async executeWithFabricPolicyTraversal(command: ArborCommandV1, suppliedContext: CommandContextV1, invocation: FabricPolicyInvocationV1, capability: unknown): Promise<CommandReceiptV1> {
    assertFabricProviderPolicyTraversalCapabilityV1(capability);
    return this.#locked(() => this.#executeLocked(command, suppliedContext, invocation));
  }

  async #executeLocked(command: ArborCommandV1, suppliedContext: CommandContextV1, invocation?: FabricPolicyInvocationV1): Promise<CommandReceiptV1> {
    this.#validateCommandEnvelope(command);
    const context: CommandContextV1 = { ...(suppliedContext.driverId ? { driverId: suppliedContext.driverId } : {}), fence: suppliedContext.fence, now: this.#clock.now() };
    const duplicate = await this.#store.lookupReceipt(this.#mutation(command.kind, command.metadata, command), context);
    if (duplicate) return duplicate;
    if (command.kind === "materializeWorkspace") return this.#materialize(command, context);
    if (command.kind === "finalizeCandidate") return this.#finalizeCandidate(command, context);
    if (command.kind === "evaluate") return this.#evaluate(command, context);
    if (command.kind === "buildPromotionCandidate") return this.#buildPromotionCandidate(command, context);
    if (command.kind === "applyWinnerRef") return this.#applyPromotionRef(command, context, false, invocation);
    if (command.kind === "observeWinnerRef") return this.#observePromotionRef(command, context, false);
    if (command.kind === "applyRollbackRef") return this.#applyPromotionRef(command, context, true, invocation);
    if (command.kind === "observeRollbackRef") return this.#observePromotionRef(command, context, true);
    if (command.kind === "publishReport") return this.#publishReport(command, context);
    if (command.kind === "observeReport") return this.#observeReport(command, context);
    if (command.kind === "executeCleanup") return this.#executeCleanup(command, context);
    return this.#commit(command.kind, command.metadata, command, context, (current) => this.#reduce(command, current, context));
  }

  async query(query: ArborQueryV1, _context: QueryContextV1): Promise<ArborViewV1> {
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(query.runId)) throw new ArborError("VALIDATION_FAILED", "Invalid run ID");
    if (query.limit !== undefined && (!Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 200)) throw new ArborError("VALIDATION_FAILED", "Query limit must be 1-200");
    const run = await this.#requiredRun(query.runId);
    const limit = query.limit ?? 100;
    let data: Record<string, unknown>;
    const summary = querySummary(run, this.#executionMode);
    const comparisons = candidateComparisons(run);
    const retention = retentionDecision(run, this.#clock.now(), this.#legalHoldRunIds.has(run.runId));
    switch (query.kind) {
      case "overview": {
        const used = { hypotheses: run.hypotheses.length, attempts: run.attempts.length, concurrentAttempts: run.attempts.filter((entry) => ["PREPARING", "READY", "DISPATCHING", "RUNNING", "COLLECTING", "FINALIZING", "RECONCILING"].includes(entry.state)).length, agentCalls: run.dispatchIntents.length, evaluatorRuns: run.certificates.length };
        data = { summary, baselines: { developmentCertificateId: run.developmentBaselineCertificateId ?? "missing", heldOutCertificateId: run.heldOutBaselineCertificateId ?? "missing", heldOutConstructionId: run.heldOutBaselineConstructionId ?? "missing" }, bestCandidate: comparisons.find((entry) => entry.isBest === true) ?? "none", budgets: { totals: run.contract.budgets, used, finalizationReserve: run.contract.budgets.finalizationReserve }, epochs: [{ epochDigest: run.epochDigest, current: true, crossEpochRanking: "prohibited" }], gates: run.gates.slice(0, limit).map((entry) => ({ version: 1, gateId: entry.gateId, answerKind: entry.answerKind, state: entry.state, expiresAt: entry.expiresAt })), reportStatus: run.reports.at(-1)?.state ?? "not-planned", cleanupDebt: run.cleanup.filter((entry) => entry.state !== "COMPLETED").length, retention, yielded: run.yielded };
        break;
      }
      case "tree": data = { summary, hypotheses: run.hypotheses.slice(0, limit).map((hypothesis) => ({ ...hypothesis, lineageDepth: (() => { let depth = 0; let parent = hypothesis.parentHypothesisId; const seen = new Set<string>(); while (parent && !seen.has(parent)) { seen.add(parent); depth += 1; parent = run.hypotheses.find((entry) => entry.hypothesisId === parent)?.parentHypothesisId; } return depth; })(), pinned: run.pinnedHypothesisIds.includes(hypothesis.hypothesisId), retries: run.attempts.filter((entry) => entry.hypothesisId === hypothesis.hypothesisId && entry.retryOfAttemptId).length, interruptions: run.attempts.filter((entry) => entry.hypothesisId === hypothesis.hypothesisId && ["INTERRUPTED", "RECONCILING", "PARTIAL", "INDETERMINATE"].includes(entry.state)).length })), lineagePolicy: "Retries create new attempts; pruning and lessons remain durable; rollback and re-promotion retain prior lineage." }; break;
      case "attempts": data = { summary, attempts: run.attempts.slice(0, limit).map((attempt) => ({ ...attempt, childStatus: run.agentChildren.find((entry) => entry.attemptId === attempt.attemptId)?.state ?? "not-attached", workerClaim: run.workerClaims.find((entry) => entry.attemptId === attempt.attemptId) ?? "none", canonicalEvidence: run.certificates.filter((entry) => run.candidates.some((candidate) => candidate.attemptId === attempt.attemptId && (entry.oid === candidate.candidateOid || entry.candidateOid === candidate.candidateOid))).map((entry) => ({ certificateId: entry.certificateId, valid: entry.valid, aggregateUnits: entry.aggregateUnits, trust: entry.trust })) })), workerClaimsPolicy: "Informational only; canonical evaluator certificates determine ranking." }; break;
      case "compare": data = { summary, baseline: run.certificates.filter((entry) => entry.role.endsWith("Baseline")).slice(0, limit), comparisons: comparisons.slice(0, limit), mergeConstructions: run.mergeConstructions.slice(0, limit), comparisonPolicy: { direction: run.contract.metric.direction, minimumImprovement: run.contract.metric.minimumImprovement, quantum: run.contract.metric.quantum, crossEpochRanking: "prohibited" } }; break;
      case "metrics": data = { summary, metric: run.contract.metric, epochs: [{ epochDigest: run.epochDigest, certificateCount: run.certificates.length, crossEpochRanking: "prohibited" }], certificates: run.certificates.slice(0, limit).map((entry) => ({ certificateId: entry.certificateId, role: entry.role, oid: entry.oid, rawTrials: entry.rawTrials, quantizedUnits: entry.quantizedUnits, aggregateUnits: entry.aggregateUnits, spreadUnits: entry.spreadUnits, valid: entry.valid, rejectionReason: entry.rejectionReason ?? "none", trust: entry.trust, outputDigest: entry.outputDigest })) }; break;
      case "resources": data = {
        summary,
        workspaces: run.attempts.slice(0, limit).map((entry) => ({ workspaceId: entry.workspaceId, attemptId: entry.attemptId, state: entry.state })),
        refs: run.promotions.slice(0, limit).map((entry) => ({ winnerRef: entry.winnerRef, expectedOid: entry.expectedCurrentOid ?? "unobserved", observedOid: entry.observedOid ?? "unobserved", rollbackObservedOid: entry.rollbackObservedOid ?? "unobserved" })),
        effects: run.effects.slice(0, limit).map((effect) => ({ version: 1, effectId: effect.effectId, kind: effect.kind, boundary: effect.identity.boundary, state: effect.state, ...(effect.attemptId ? { attemptId: effect.attemptId } : {}), acceptedOutcome: effect.acceptedOutcomeDigest ? "present" : "absent" })),
        reconciliation: run.effectObservations.slice(0, limit).map((observation) => ({ version: 1, observationId: observation.observationId, effectId: observation.effectId, classification: observation.classification, observedAt: observation.observedAt, reasons: observation.reasons, fingerprintCertificateId: observation.fingerprint?.certificateId ?? "missing", fingerprintEqual: observation.fingerprint?.equal ?? "unavailable" })),
        children: run.agentChildren.slice(0, limit).map((child) => ({ version: 1, childId: child.childId, attemptId: child.attemptId, effectId: child.effectId, containmentId: child.containmentId, state: child.state, processUnit: child.processUnit?.kind ?? "not-observed", ...(child.resultDigest ? { resultDigest: child.resultDigest } : {}) })),
        evaluatorProcesses: run.effects.filter((entry) => entry.kind === "evaluation").slice(0, limit).map((entry) => ({ effectId: entry.effectId, state: entry.state, containmentId: entry.identity.containmentId ?? "not-observed", evaluationId: entry.identity.evaluationId ?? "not-observed" })),
        budgetReservations: run.budgetReservations.slice(0, limit), gates: run.gates.slice(0, limit).map((entry) => ({ gateId: entry.gateId, answerKind: entry.answerKind, optionIds: entry.optionIds, state: entry.state, expiresAt: entry.expiresAt })),
        approvals: { FabricPolicy: run.promotions.map((entry) => entry.fabricPolicyTraversal ? { boundary: entry.fabricPolicyTraversal.boundary, parentToolCallId: entry.fabricPolicyTraversal.parentToolCallId, nestedToolCallId: entry.fabricPolicyTraversal.nestedToolCallId, operationId: entry.fabricPolicyTraversal.operationId, b9CertificationId: entry.fabricPolicyTraversal.b9CertificationId ?? "fixture-only" } : "not-traversed"), packageAuthorization: run.authorizations.map((entry) => ({ authorizationId: entry.authorizationId, kind: entry.payload.kind, state: entry.state, expiresAt: entry.payload.expiresAt })) },
        cleanupDebt: run.cleanup.slice(0, limit), driverLeaseStatus: { status: run.driver && Date.parse(run.driver.expiresAt) > Date.parse(this.#clock.now()) ? "Active Fabric driver" : "No active Fabric driver", identityExposed: false },
        confinement: { status: this.#executionMode === "productionCertified" ? "certificate-required" : "not-admitted-for-real-work", containedEffects: run.effects.filter((entry) => entry.identity.containmentId).length }, heldOutIsolation: this.#phase5 ? "certificate-bound" : "unavailable", fingerprintStatus: run.effectObservations.some((entry) => entry.fingerprint?.equal === false) ? "mismatch-quarantine-required" : run.effectObservations.some((entry) => entry.fingerprint?.equal) ? "matching-certificates-observed" : "not-observed",
      }; break;
      case "promotion": data = {
        summary, heldOutIsolation: this.#phase5 ? "certificate-bound" : "unavailable", heldOutBaselineConstructionId: run.heldOutBaselineConstructionId ?? "missing",
        promotions: run.promotions.slice(0, limit).map((promotion) => ({ version: 1, promotionId: promotion.promotionId, state: promotion.state, candidateId: promotion.candidateId, candidateOid: promotion.candidateOid, mergeCandidateOid: promotion.mergeCandidateOid ?? "not-built", winnerRef: promotion.winnerRef, expectedCurrentOid: promotion.expectedCurrentOid ?? "not-observed", predecessorOid: promotion.predecessorOid ?? "not-observed", heldOutCertificateId: promotion.heldOutCertificateId ?? "missing", authorizationState: run.authorizations.find((entry) => entry.authorizationId === promotion.authorizationId)?.state ?? "not-issued", FabricPolicy: promotion.fabricPolicyTraversal ? { boundary: promotion.fabricPolicyTraversal.boundary, operationId: promotion.fabricPolicyTraversal.operationId, parentToolCallId: promotion.fabricPolicyTraversal.parentToolCallId, nestedToolCallId: promotion.fabricPolicyTraversal.nestedToolCallId, b9CertificationId: promotion.fabricPolicyTraversal.b9CertificationId ?? "fixture-only" } : "not-traversed", observedOid: promotion.observedOid ?? "not-observed", rollbackAuthorizationState: run.authorizations.find((entry) => entry.authorizationId === promotion.rollbackAuthorizationId)?.state ?? "not-issued", rollbackObservedOid: promotion.rollbackObservedOid ?? "not-observed", rePromotionRequiresFreshEvidence: promotion.state === "ROLLED_BACK" })),
        challenges: run.authorizations.filter((entry) => entry.state === "CHALLENGE_ISSUED").slice(0, limit).map((entry) => ({ version: 1, challengeId: entry.challengeId, kind: entry.payload.kind, promotionId: entry.payload.promotionId, expiresAt: entry.payload.expiresAt, principalId: entry.principalId })), authorizationBoundary: "Browser requests never sign, authorize, traverse Fabric policy, or move refs.", rollbackAndRePromotion: "Rollback and every re-promotion require fresh one-time authorization, policy traversal, observation, and reporting." };
        break;
      case "report": data = { summary, reports: run.reports.slice(0, limit), requiredForOutcome: run.outcome ?? "pending", obligationStatus: run.reports.some((entry) => entry.state === "PUBLISHED") ? "published" : run.reports.length > 0 ? "pending" : "not-planned", dependencies: [...new Set(run.reports.flatMap((entry) => entry.dependencyDigests))].slice(0, limit), retention, cleanup: run.cleanup.slice(0, limit) }; break;
      case "contract": data = { summary, contract: run.contract, contractDigest: run.contractDigest, epochDigest: run.epochDigest, immutability: "Content-addressed; policy may restrict but not widen it.", confinement: "Real work requires active matching certificates.", heldOut: "Worker requests contain no held-out path, credential, or capability." }; break;
    }
    return immutableClone({ version: 1, kind: query.kind, runId: query.runId, revision: run.revision, cursor: run.sequence, data: redactValue(data) as Readonly<Record<string, unknown>> });
  }

  async submitIntent(intent: WebIntentV1, session: WebSessionV1): Promise<IntentReceiptV1> {
    return this.#locked(async () => {
      if (!session.csrfValidated || !session.originValidated) throw new ArborError("VALIDATION_FAILED", "Web session failed CSRF or Origin validation");
      if (session.version !== 1 || session.runId.length === 0) throw new ArborError("VALIDATION_FAILED", "Invalid Web session");
      assertJsonSchema(this.schemas.schemas.webIntent!, intent, "Web intent");
      const run = await this.#requiredRun(session.runId);
      const intentId = `intent_${sha256(`${session.runId}:${session.idempotencyKey}`).slice(0, 32)}`;
      const stale = intent.expectedRevision !== run.revision;
      const metadata = { runId: session.runId, expectedRevision: run.revision, idempotencyKey: session.idempotencyKey };
      const context: CommandContextV1 = { fence: run.driver?.fence ?? 0, now: this.#clock.now() };
      const receipt = await this.#commit("submitIntent", metadata, { intent, sessionId: session.sessionId }, context, (current) => {
        if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
        const next = structuredClone(current);
        next.intents.push({
          version: 1,
          intentId,
          runId: session.runId,
          intent: immutableClone(intent),
          state: stale ? "REJECTED_STALE" : "PENDING",
          submittedAt: context.now,
          ...(stale ? { rejectionReason: "Expected revision was stale at submission" } : {}),
        });
        return { aggregate: next, eventTypes: [stale ? "WEB_INTENT_REJECTED_STALE" : "WEB_INTENT_SUBMITTED"] };
      });
      const stored = (await this.#requiredRun(session.runId)).intents.find((entry) => entry.intentId === intentId);
      return { version: 1, intentId: stored?.intentId ?? intentId, runId: session.runId, state: stored?.state ?? (receipt.duplicate ? "PENDING" : "REJECTED"), revision: receipt.revision };
    });
  }

  async readEvents(runId: string, afterSequence: number, limit: number): Promise<EventPageV1> {
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new ArborError("VALIDATION_FAILED", "Invalid event pagination");
    const page = await this.#store.readEvents(runId, afterSequence, limit);
    return immutableClone({ ...page, events: page.events.map(({ version, runId: eventRunId, sequence, revision, type, at }) => ({ version, runId: eventRunId, sequence, revision, type, at })) });
  }

  /** Trusted host adapter seam. Never expose this value through Web projections. */
  async privateDriverContext(runId: string): Promise<{ driverId?: string; fence: number }> {
    const run = await this.#requiredRun(runId);
    return run.driver ? { driverId: run.driver.driverId, fence: run.driver.fence } : { fence: 0 };
  }

  /** Dedicated local authorization seam. It is intentionally absent from providers and Web authorities. */
  async readAuthorizationChallenge(challengeId: string): Promise<AuthorizationRecordV1> {
    const runs = await this.#store.list(200);
    const matches = runs.flatMap((run) => run.authorizations ?? []).filter((entry) => entry.challengeId === challengeId);
    if (matches.length !== 1) throw new ArborError("UNKNOWN_ENTITY", "Opaque authorization challenge was not found uniquely");
    return immutableClone(matches[0]!);
  }

  /** Commits a locally signed challenge through ArborApplication, never through the browser. */
  async commitSignedAuthorization(challengeId: string, authorization: AuthorizationRecordV1, now: string): Promise<void> {
    await this.#locked(async () => {
      if (!this.#phase5) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Authorization storage is disabled without Phase 5 certification");
      const runs = await this.#store.list(200);
      const run = runs.find((entry) => (entry.authorizations ?? []).some((candidate) => candidate.challengeId === challengeId));
      if (!run) throw new ArborError("UNKNOWN_ENTITY", "Authorization challenge does not exist");
      const existing = run.authorizations.find((entry) => entry.challengeId === challengeId)!;
      if (existing.state !== "CHALLENGE_ISSUED") throw new ArborError("DUPLICATE_ENTITY", "Authorization challenge is no longer issuable");
      if (authorization.challengeId !== challengeId || authorization.authorizationId !== existing.authorizationId || authorization.challengeDigest !== existing.challengeDigest || digestCanonical(authorization.payload) !== existing.challengeDigest || authorization.nonceDigest !== existing.nonceDigest || authorization.principalId !== existing.principalId) throw new ArborError("EVIDENCE_INVALID", "Signed authorization altered frozen challenge fields");
      this.#phase5.authorization.verifyAuthorization(authorization, authorization.payload.kind, run.contract.repository.repositoryId, now);
      const metadata = { runId: run.runId, expectedRevision: run.revision, idempotencyKey: `local_auth_${challengeId}`.slice(0, 128).padEnd(16, "_") };
      const context: CommandContextV1 = { ...(run.driver ? { driverId: run.driver.driverId } : {}), fence: run.driver?.fence ?? 0, now };
      await this.#commit("storeSignedAuthorization", metadata, { challengeId, authorization }, context, (current) => {
        if (!current) throw new ArborError("RUN_NOT_FOUND", "Authorization run disappeared");
        const next = structuredClone(current);
        const target = next.authorizations.find((entry) => entry.challengeId === challengeId);
        if (!target || target.state !== "CHALLENGE_ISSUED") throw new ArborError("DUPLICATE_ENTITY", "Authorization challenge was concurrently consumed");
        assertTransition(AUTHORIZATION_TRANSITIONS, target.state, "SIGNED", "authorization"); target.state = "SIGNED";
        assertTransition(AUTHORIZATION_TRANSITIONS, target.state, "STORED", "authorization");
        Object.assign(target, immutableClone(authorization), { state: "STORED" as const });
        return { aggregate: next, eventTypes: ["AUTHORIZATION_SIGNED", "AUTHORIZATION_STORED"] };
      });
    });
  }

  async #preflight(command: ArborCommandV1, context: CommandContextV1): Promise<RunAggregateV1> {
    const run = await this.#requiredRun(command.metadata.runId);
    if (!run.runtimeAdmission || run.runtimeAdmission.admissionDigest !== this.#runtimeAdmission.admissionDigest || run.runtimeAdmission.configurationDigest !== this.#runtimeAdmission.configurationDigest || run.runtimeAdmission.mode !== this.#runtimeAdmission.mode) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Run admission does not match this application composition");
    if (run.revision !== command.metadata.expectedRevision) throw new ArborError("STALE_REVISION", "Expected revision does not match");
    this.#requireDriver(run, context);
    return run;
  }

  async #materialize(command: Extract<ArborCommandV1, { kind: "materializeWorkspace" }>, context: CommandContextV1): Promise<CommandReceiptV1> {
    const run = await this.#preflight(command, context);
    const attempt = findAttempt(run, command.attemptId);
    if (attempt.state !== "PREPARING" && attempt.state !== "RESERVED") throw new ArborError("ILLEGAL_TRANSITION", "Attempt is not preparing its workspace");
    const effect = findEffect(run, (entry) => entry.kind === "workspace" && entry.attemptId === attempt.attemptId && entry.state === "INTENDED");
    const observation = await this.#workspace.materialize({ version: 1, runId: run.runId, attemptId: attempt.attemptId, workspaceId: attempt.workspaceId, baseOid: run.contract.repository.initialOid, idempotencyKey: effect.idempotencyKey });
    const expectedTrust = this.#executionMode === "productionCertified" ? "certified" : "fixture";
    if (observation.workspaceId !== attempt.workspaceId || observation.baseOid !== run.contract.repository.initialOid || observation.trust !== expectedTrust) {
      throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Workspace observation trust does not match the admitted execution mode");
    }
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current);
      const target = findAttempt(next, command.attemptId);
      if (target.state === "RESERVED") { assertTransition(ATTEMPT_TRANSITIONS, target.state, "PREPARING", "attempt"); target.state = "PREPARING"; }
      assertTransition(ATTEMPT_TRANSITIONS, target.state, "READY", "attempt"); target.state = "READY";
      const targetEffect = findEffect(next, (entry) => entry.effectId === effect.effectId);
      assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "OBSERVED", "effect"); targetEffect.state = "OBSERVED";
      this.#recordCompletedObservation(next, targetEffect, context, observation.identityDigest);
      assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "COMMITTED", "effect"); targetEffect.state = "COMMITTED"; targetEffect.acceptedOutcomeDigest = observation.identityDigest;
      assertTransition(EXPLORATION_TRANSITIONS, next.phase, "DISPATCH", "exploration"); next.phase = "DISPATCH";
      next.yielded = true;
      const dispatch = next.dispatchIntents.find((entry) => entry.attemptId === target.attemptId);
      if (!dispatch) throw new ArborError("UNKNOWN_ENTITY", "Package-issued dispatch intent is missing");
      return { aggregate: next, eventTypes: ["WORKSPACE_OBSERVED", "WORKSPACE_COMMITTED"], directive: { version: 1, kind: "dispatchAgent", dispatch } };
    });
  }

  async #finalizeCandidate(command: Extract<ArborCommandV1, { kind: "finalizeCandidate" }>, context: CommandContextV1): Promise<CommandReceiptV1> {
    const run = await this.#preflight(command, context);
    const attempt = findAttempt(run, command.attemptId);
    if (attempt.state !== "COLLECTING") throw new ArborError("ILLEGAL_TRANSITION", "Attempt is not collecting");
    const hypothesis = run.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
    const claim = run.workerClaims.find((entry) => entry.attemptId === attempt.attemptId);
    const effect = findEffect(run, (entry) => entry.kind === "workspace" && entry.attemptId === attempt.attemptId && entry.state === "INTENDED" && entry.identity.action === "finalizeCandidate");
    const candidateId = effect.identity.candidateId;
    if (!candidateId) throw new ArborError("EVIDENCE_INVALID", "Finalization effect has no stable candidate identity");
    const candidate = await this.#workspace.finalize({
      version: 1, runId: run.runId, attemptId: attempt.attemptId, hypothesisId: attempt.hypothesisId,
      candidateId, baseOid: run.contract.repository.initialOid, changedPaths: claim?.changedPaths ?? [], contract: run.contract,
    });
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current);
      const target = findAttempt(next, command.attemptId);
      assertTransition(ATTEMPT_TRANSITIONS, target.state, "FINALIZING", "attempt"); target.state = "FINALIZING";
      assertTransition(ATTEMPT_TRANSITIONS, target.state, "CANDIDATE", "attempt"); target.state = "CANDIDATE"; target.candidateId = candidate.candidateId;
      const targetHypothesis = next.hypotheses.find((entry) => entry.hypothesisId === hypothesis.hypothesisId)!;
      assertTransition(HYPOTHESIS_TRANSITIONS, targetHypothesis.state, "CANDIDATE", "hypothesis"); targetHypothesis.state = "CANDIDATE";
      next.candidates.push(candidate);
      const finalizationEffect = findEffect(next, (entry) => entry.effectId === effect.effectId);
      assertTransition(EFFECT_TRANSITIONS, finalizationEffect.state, "OBSERVED", "effect"); finalizationEffect.state = "OBSERVED";
      this.#recordCompletedObservation(next, finalizationEffect, context, candidate.manifestDigest, { candidate });
      assertTransition(EFFECT_TRANSITIONS, finalizationEffect.state, "COMMITTED", "effect"); finalizationEffect.state = "COMMITTED"; finalizationEffect.acceptedOutcomeDigest = candidate.manifestDigest;
      next.effects.push(this.#createEffect("evaluation", "evaluator", "evaluate", `evaluate_${candidate.candidateId}`.padEnd(16, "_"), current.revision, context, { evaluationRole: "developmentCandidate", oid: candidate.candidateOid, candidateId: candidate.candidateId }, target.attemptId));
      assertTransition(EXPLORATION_TRANSITIONS, next.phase, "EVALUATE_DEV", "exploration"); next.phase = "EVALUATE_DEV";
      next.yielded = true;
      return { aggregate: next, eventTypes: ["CANDIDATE_FINALIZED"], directive: { version: 1, kind: "evaluateCandidate", candidateId: candidate.candidateId, oid: candidate.candidateOid } };
    });
  }

  async #evaluate(command: Extract<ArborCommandV1, { kind: "evaluate" }>, context: CommandContextV1): Promise<CommandReceiptV1> {
    const run = await this.#preflight(command, context);
    if (run.certificates.length >= run.contract.budgets.evaluatorRuns) throw new ArborError("BUDGET_EXHAUSTED", "Evaluator run budget exhausted");
    if (command.role !== "heldOutCandidate" && run.certificates.some((entry) => entry.role === command.role && entry.oid === command.oid)) throw new ArborError("DUPLICATE_ENTITY", "Evaluation already exists for role and OID");
    const effect = findEffect(run, (entry) => entry.kind === "evaluation" && entry.state === "INTENDED" && entry.identity.evaluationRole === command.role && entry.identity.oid === command.oid);
    const evaluationId = effect.identity.evaluationId;
    const certificateId = effect.identity.certificateId;
    if (!evaluationId || !certificateId) throw new ArborError("EVIDENCE_INVALID", "Evaluation effect has no stable evaluation identity");
    const mergeConstruction = command.role.startsWith("heldOut") && this.#phase5 ? run.mergeConstructions.find((entry) => entry.mergeCandidateOid === command.oid && entry.role === command.role && (!command.candidateId || entry.candidateId === command.candidateId)) : undefined;
    if (command.role.startsWith("heldOut") && this.#phase5 && !mergeConstruction) throw new ArborError("EVIDENCE_INVALID", "Held-out evaluation is not bound to a retained detached merge construction");
    const certificate = await this.#evaluator.evaluate({
      version: 1, evaluationId, effectId: effect.effectId, certificateId, runId: run.runId, epochDigest: run.epochDigest,
      contractDigest: run.contractDigest, role: command.role, oid: command.oid, contract: run.contract,
      ...(mergeConstruction ? { mergeConstruction } : {}),
    });
    const expectedEvaluator = command.role.startsWith("development") ? run.contract.evaluation.development : run.contract.evaluation.heldOut;
    const expectedTrust = this.#phase5 && command.role.startsWith("heldOut") ? "certified" : this.#executionMode === "productionCertified" ? "certified" : "fixture";
    if (certificate.trust !== expectedTrust) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Evaluator trust does not match the admitted execution mode");
    if (certificate.certificateId !== certificateId || certificate.evaluationId !== evaluationId || certificate.runId !== run.runId || certificate.epochDigest !== run.epochDigest || certificate.contractDigest !== run.contractDigest || certificate.role !== command.role || certificate.oid !== command.oid || certificate.evaluatorId !== expectedEvaluator || certificate.parserVersion !== run.contract.evaluation.parserVersion || certificate.metric !== run.contract.metric.name || certificate.unit !== run.contract.metric.unit || certificate.quantum !== run.contract.metric.quantum) {
      throw new ArborError("EVIDENCE_INVALID", "Evaluator certificate identity mismatch");
    }
    if (command.role.startsWith("heldOut") && this.#phase5) this.#assertStrictHeldOutCertificate(run, certificate, mergeConstruction!);
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current);
      next.certificates.push(certificate);
      const targetEffect = findEffect(next, (entry) => entry.effectId === effect.effectId);
      assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "OBSERVED", "effect"); targetEffect.state = "OBSERVED";
      this.#recordCompletedObservation(next, targetEffect, context, certificate.outputDigest, { certificate });
      assertTransition(EFFECT_TRANSITIONS, targetEffect.state, certificate.valid ? "COMMITTED" : "FAILED", "effect"); targetEffect.state = certificate.valid ? "COMMITTED" : "FAILED"; targetEffect.acceptedOutcomeDigest = certificate.outputDigest;
      let directive: ArborDirectiveV1 | undefined;
      const eventTypes = [certificate.valid ? "EVALUATION_CERTIFIED" : "EVALUATION_REJECTED"];
      if (certificate.valid && command.role === "developmentBaseline") next.developmentBaselineCertificateId = certificate.certificateId;
      if (certificate.valid && command.role === "heldOutBaseline") next.heldOutBaselineCertificateId = certificate.certificateId;
      if (command.role === "developmentCandidate") {
        if (!command.candidateId || !next.candidates.some((entry) => entry.candidateId === command.candidateId)) throw new ArborError("UNKNOWN_ENTITY", "Candidate identity is required for candidate evaluation");
        const baseline = next.certificates.find((entry) => entry.certificateId === next.developmentBaselineCertificateId);
        if (!baseline?.valid || baseline.epochDigest !== certificate.epochDigest) throw new ArborError("EVIDENCE_INVALID", "Compatible development baseline is missing");
        if (certificate.valid) {
          const comparison = compareAggregates(BigInt(certificate.aggregateUnits), BigInt(baseline.aggregateUnits), next.contract.metric.direction, next.contract.metric.minimumImprovement, next.contract.metric.quantum);
          if (comparison.passes) next.bestCandidateId = command.candidateId;
        }
        assertTransition(EXPLORATION_TRANSITIONS, next.phase, "BACKPROPAGATE", "exploration"); next.phase = "BACKPROPAGATE";
        directive = { version: 1, kind: "finalizeRun" };
      } else if (command.role === "developmentBaseline" && this.#phase5) {
        const oid = next.contract.repository.initialOid;
        next.effects.push(this.#createEffect("git", "git", "buildPromotionCandidate", `merge_baseline_${next.runId}`.slice(0, 128).padEnd(16, "_"), current.revision, context, { evaluationRole: "heldOutBaseline", oid }));
        directive = { version: 1, kind: "buildPromotionCandidate", role: "heldOutBaseline", expectedResearchTrunkOid: oid };
        eventTypes.push("HELD_OUT_BASELINE_CONSTRUCTION_INTENDED");
      } else if (command.role === "developmentBaseline" && this.#executionMode === "productionCertified") {
        directive = { version: 1, kind: "done" };
      } else if (command.role === "heldOutCandidate") {
        if (!command.candidateId) throw new ArborError("UNKNOWN_ENTITY", "Held-out candidate evaluation requires a candidate ID");
        const promotion = next.promotions.find((entry) => entry.candidateId === command.candidateId && entry.mergeCandidateOid === command.oid && entry.state === "VERIFYING");
        if (!promotion) throw new ArborError("EVIDENCE_INVALID", "Held-out candidate certificate has no matching promotion journal");
        const baseline = next.certificates.find((entry) => entry.certificateId === next.heldOutBaselineCertificateId);
        if (!baseline?.valid || !certificate.valid) {
          assertTransition(PROMOTION_TRANSITIONS, promotion.state, "REJECTED", "promotion"); promotion.state = "REJECTED";
          eventTypes.push("PROMOTION_REJECTED");
        } else {
          this.#assertSameHeldOutPolicy(baseline, certificate);
          const comparison = compareAggregates(BigInt(certificate.aggregateUnits), BigInt(baseline.aggregateUnits), next.contract.metric.direction, next.contract.metric.minimumImprovement, next.contract.metric.quantum);
          if (!comparison.passes) {
            assertTransition(PROMOTION_TRANSITIONS, promotion.state, "REJECTED", "promotion"); promotion.state = "REJECTED";
            eventTypes.push("PROMOTION_REJECTED");
          } else {
            promotion.heldOutCertificateId = certificate.certificateId; promotion.heldOutCertificateDigest = digestCanonical(certificate);
            assertTransition(PROMOTION_TRANSITIONS, promotion.state, "PREPARED", "promotion"); promotion.state = "PREPARED";
            assertTransition(PROMOTION_TRANSITIONS, promotion.state, "AWAITING_AUTHORIZATION", "promotion"); promotion.state = "AWAITING_AUTHORIZATION";
            const candidate = next.candidates.find((entry) => entry.candidateId === promotion.candidateId)!;
            const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === candidate.hypothesisId);
            if (hypothesis?.state === "CANDIDATE") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "VERIFYING_HELD_OUT", "hypothesis"); hypothesis.state = "VERIFYING_HELD_OUT"; }
            if (hypothesis?.state === "VERIFYING_HELD_OUT") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "VERIFIED", "hypothesis"); hypothesis.state = "VERIFIED"; }
            if (hypothesis?.state === "VERIFIED") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "PROMOTABLE", "hypothesis"); hypothesis.state = "PROMOTABLE"; }
            this.#issueChallenge(next, promotion, "promote", context.now);
            eventTypes.push("PROMOTION_PREPARED", "PROMOTION_CHALLENGE_ISSUED");
          }
        }
      } else if (command.role === "heldOutBaseline") {
        directive = { version: 1, kind: "coordinateHypothesis" };
      } else {
        directive = { version: 1, kind: "evaluateBaseline", role: "developmentBaseline", oid: next.contract.repository.initialOid };
      }
      next.yielded = true;
      return { aggregate: next, eventTypes, ...(directive ? { directive } : {}) };
    });
  }

  async #buildPromotionCandidate(command: Extract<ArborCommandV1, { kind: "buildPromotionCandidate" }>, context: CommandContextV1): Promise<CommandReceiptV1> {
    const phase5 = this.#requirePhase5();
    const run = await this.#preflight(command, context);
    if (command.expectedResearchTrunkOid !== run.contract.repository.initialOid) throw new ArborError("STALE_REVISION", "Expected research trunk OID is stale");
    const candidate = command.role === "heldOutBaseline" ? undefined : run.candidates.find((entry) => entry.candidateId === command.candidateId);
    if (command.role === "heldOutCandidate" && !candidate) throw new ArborError("UNKNOWN_ENTITY", "Promotion candidate does not exist");
    const candidateOid = candidate?.candidateOid ?? command.expectedResearchTrunkOid;
    const effect = findEffect(run, (entry) => entry.identity.action === "buildPromotionCandidate" && entry.state === "INTENDED" && entry.identity.evaluationRole === command.role && entry.identity.oid === candidateOid && entry.identity.candidateId === command.candidateId);
    const construction = await phase5.git.buildDetached({ version: 1, runId: run.runId, role: command.role, expectedResearchTrunkOid: command.expectedResearchTrunkOid, candidateOid, ...(command.candidateId ? { candidateId: command.candidateId } : {}), contract: run.contract });
    const winnerObservation = command.role === "heldOutCandidate" ? await phase5.git.observeWinnerRef(run.runId) : undefined;
    if (construction.expectedResearchTrunkOid !== command.expectedResearchTrunkOid || construction.candidateOid !== candidateOid || construction.beforeRefsDigest !== construction.afterRefsDigest || (winnerObservation && (!winnerObservation.observable || !winnerObservation.actualOid))) throw new ArborError("QUARANTINED", "Detached merge construction returned contradictory identity, ref, or winner observation evidence");
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current);
      if (!next.mergeConstructions.some((entry) => entry.constructionId === construction.constructionId)) next.mergeConstructions.push(immutableClone(construction));
      const targetEffect = findEffect(next, (entry) => entry.effectId === effect.effectId);
      assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "OBSERVED", "effect"); targetEffect.state = "OBSERVED";
      this.#recordCompletedObservation(next, targetEffect, context, construction.manifestDigest);
      assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "COMMITTED", "effect"); targetEffect.state = "COMMITTED"; targetEffect.acceptedOutcomeDigest = construction.manifestDigest;
      const evaluationEffect = this.#createEffect("evaluation", "evaluator", "evaluate", `evaluate_${construction.constructionId}`.slice(0, 128).padEnd(16, "_"), current.revision, context, { evaluationRole: command.role, oid: construction.mergeCandidateOid, ...(command.candidateId ? { candidateId: command.candidateId } : {}) });
      next.effects.push(evaluationEffect);
      if (command.role === "heldOutBaseline") {
        next.heldOutBaselineConstructionId = construction.constructionId;
        return { aggregate: next, eventTypes: ["HELD_OUT_BASELINE_MERGE_BUILT", "HELD_OUT_EVALUATION_INTENDED"], directive: { version: 1, kind: "evaluateBaseline", role: "heldOutBaseline", oid: construction.mergeCandidateOid } };
      }
      const promotion = next.promotions.find((entry) => entry.promotionId === command.promotionId);
      if (!promotion || promotion.state !== "PREPARING" || promotion.candidateId !== command.candidateId) throw new ArborError("EVIDENCE_INVALID", "Promotion journal does not match detached construction");
      assertTransition(PROMOTION_TRANSITIONS, promotion.state, "CANDIDATE_BUILT", "promotion"); promotion.state = "CANDIDATE_BUILT";
      promotion.mergeCandidateOid = construction.mergeCandidateOid; promotion.mergeConstructionId = construction.constructionId;
      promotion.expectedCurrentOid = winnerObservation!.actualOid!; promotion.predecessorOid = winnerObservation!.actualOid!;
      assertTransition(PROMOTION_TRANSITIONS, promotion.state, "VERIFYING", "promotion"); promotion.state = "VERIFYING";
      return { aggregate: next, eventTypes: ["PROMOTION_CANDIDATE_BUILT", "HELD_OUT_EVALUATION_INTENDED"], directive: { version: 1, kind: "evaluateHeldOutCandidate", promotionId: promotion.promotionId, candidateId: promotion.candidateId, oid: construction.mergeCandidateOid } };
    });
  }

  async #applyPromotionRef(command: Extract<ArborCommandV1, { kind: "applyWinnerRef" | "applyRollbackRef" }>, context: CommandContextV1, rollback: boolean, invocation?: FabricPolicyInvocationV1): Promise<CommandReceiptV1> {
    const phase5 = this.#requirePhase5();
    const run = await this.#preflight(command, context);
    const promotion = this.#promotion(run, command.promotionId);
    const plannedState = rollback ? "ROLLBACK_PLANNED" : "COMMIT_PLANNED";
    const applyingState = rollback ? "ROLLBACK_APPLYING" : "REF_APPLYING";
    if (promotion.state !== plannedState && promotion.state !== applyingState) throw new ArborError("ILLEGAL_TRANSITION", `Promotion is not ${rollback ? "rollback" : "commit"} planned`);
    this.#assertFrozenAuthorization(run, promotion, rollback, context.now);
    const request = this.#fabricPolicyTraversalRequest(run, promotion, rollback);
    let traversal = rollback ? promotion.rollbackFabricPolicyTraversal : promotion.fabricPolicyTraversal;
    if (this.#executionMode === "productionCertified") {
      if (!invocation || !this.#fabricPolicyTraversal) throw new ArborError("EVIDENCE_INVALID", "Every production apply, including recovery, must traverse Fabric policy");
      traversal = await this.#fabricPolicyTraversal.authorize({ ...request, ...invocation }); context.now = this.#clock.now();
    } else if (this.#executionMode === "fixture" && promotion.state === plannedState) traversal = this.#fixtureFabricPolicyTraversal({ ...request, parentToolCallId: "fixture_parent", nestedToolCallId: "fixture_nested" }, context.now);
    else if (this.#executionMode !== "fixture") throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Production-blocked mode cannot apply a ref mutation");
    if (!traversal) throw new ArborError("EVIDENCE_INVALID", "Fabric policy traversal proof is absent");
    this.#assertFabricPolicyTraversal(traversal, request);
    const receipt = await this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current); const target = this.#promotion(next, command.promotionId);
      if (rollback) { target.rollbackFabricPolicyTraversal = immutableClone(traversal!); target.rollbackFabricPolicyTraversalDigest = traversal!.traversalDigest; }
      else { target.fabricPolicyTraversal = immutableClone(traversal!); target.fabricPolicyTraversalDigest = traversal!.traversalDigest; }
      if (target.state === plannedState) { assertTransition(PROMOTION_TRANSITIONS, target.state, applyingState, "promotion"); target.state = applyingState; }
      const effect = findEffect(next, (entry) => entry.effectId === (rollback ? target.rollbackEffectId : target.effectId));
      if (effect.state === "INTENDED") { assertTransition(EFFECT_TRANSITIONS, effect.state, "STARTED", "effect"); effect.state = "STARTED"; }
      return { aggregate: next, eventTypes: ["FABRIC_WRITE_POLICY_TRAVERSED", rollback ? "ROLLBACK_REF_APPLYING" : "WINNER_REF_APPLYING"] };
    });
    const refreshed = await this.#requiredRun(run.runId); const frozen = this.#promotion(refreshed, command.promotionId);
    this.#assertFrozenAuthorization(refreshed, frozen, rollback, this.#clock.now());
    this.#assertFrozenFabricPolicyTraversal(refreshed, frozen, rollback);
    const expectedOid = rollback ? frozen.mergeCandidateOid! : frozen.expectedCurrentOid!;
    const targetOid = rollback ? frozen.predecessorOid! : frozen.mergeCandidateOid!;
    const before = await phase5.git.observeWinnerRef(run.runId);
    if (!before.observable || before.actualOid !== expectedOid) return receipt;
    await phase5.git.applyWinnerRef({ version: 1, operationId: rollback ? frozen.rollbackEffectId! : frozen.effectId!, runId: run.runId, expectedOid, targetOid });
    return receipt;
  }

  async #observePromotionRef(command: Extract<ArborCommandV1, { kind: "observeWinnerRef" | "observeRollbackRef" }>, context: CommandContextV1, rollback: boolean): Promise<CommandReceiptV1> {
    const phase5 = this.#requirePhase5();
    const run = await this.#preflight(command, context); const promotion = this.#promotion(run, command.promotionId);
    const applying = rollback ? "ROLLBACK_APPLYING" : "REF_APPLYING";
    if (promotion.state !== applying) throw new ArborError("ILLEGAL_TRANSITION", "Ref operation is not awaiting observation");
    const observation = await phase5.git.observeWinnerRef(run.runId);
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current); const target = this.#promotion(next, command.promotionId);
      const effect = findEffect(next, (entry) => entry.effectId === (rollback ? target.rollbackEffectId : target.effectId));
      const expectedOid = rollback ? target.mergeCandidateOid! : target.expectedCurrentOid!;
      const targetOid = rollback ? target.predecessorOid! : target.mergeCandidateOid!;
      if (!observation.observable || !observation.actualOid) {
        assertTransition(PROMOTION_TRANSITIONS, target.state, "INDETERMINATE", "promotion"); target.state = "INDETERMINATE";
        if (!terminalEffectStates.has(effect.state)) { assertTransition(EFFECT_TRANSITIONS, effect.state, "INDETERMINATE", "effect"); effect.state = "INDETERMINATE"; }
        this.#settleUnsafe(next, "QUARANTINED");
        return { aggregate: next, eventTypes: ["WINNER_REF_UNOBSERVABLE", "RUN_QUARANTINED"] };
      }
      if (observation.actualOid === expectedOid) {
        target.observationDigest = observation.observationDigest;
        return { aggregate: next, eventTypes: [rollback ? "ROLLBACK_REF_ABSENCE_CONFIRMED" : "WINNER_REF_ABSENCE_CONFIRMED"] };
      }
      if (observation.actualOid !== targetOid) {
        assertTransition(PROMOTION_TRANSITIONS, target.state, "INDETERMINATE", "promotion"); target.state = "INDETERMINATE";
        assertTransition(EFFECT_TRANSITIONS, effect.state, "INDETERMINATE", "effect"); effect.state = "INDETERMINATE";
        this.#settleUnsafe(next, "QUARANTINED");
        return { aggregate: next, eventTypes: ["WINNER_REF_CONTRADICTION", "RUN_QUARANTINED"] };
      }
      const observedState = rollback ? "ROLLBACK_OBSERVED" : "REF_OBSERVED";
      assertTransition(PROMOTION_TRANSITIONS, target.state, observedState, "promotion"); target.state = observedState;
      if (effect.state === "STARTED") { assertTransition(EFFECT_TRANSITIONS, effect.state, "OBSERVED", "effect"); effect.state = "OBSERVED"; }
      this.#recordCompletedObservation(next, effect, context, observation.observationDigest);
      assertTransition(EFFECT_TRANSITIONS, effect.state, "COMMITTED", "effect"); effect.state = "COMMITTED"; effect.acceptedOutcomeDigest = observation.observationDigest;
      if (rollback) {
        target.rollbackObservedOid = observation.actualOid; target.rolledBackAt = context.now;
        assertTransition(PROMOTION_TRANSITIONS, target.state, "ROLLED_BACK", "promotion"); target.state = "ROLLED_BACK";
        if (next.state === "ROLLING_BACK") { assertTransition(RUN_TRANSITIONS, next.state, "ROLLED_BACK", "run"); next.state = "ROLLED_BACK"; }
        next.outcome = "ROLLED_BACK";
        const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === next.candidates.find((entry) => entry.candidateId === target.candidateId)?.hypothesisId);
        if (hypothesis?.state === "PROMOTED") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "ROLLED_BACK", "hypothesis"); hypothesis.state = "ROLLED_BACK"; }
      } else {
        target.observedOid = observation.actualOid; target.committedAt = context.now;
        assertTransition(PROMOTION_TRANSITIONS, target.state, "COMMITTED", "promotion"); target.state = "COMMITTED";
        if (next.state === "PROMOTING") { assertTransition(RUN_TRANSITIONS, next.state, "COMPLETED", "run"); next.state = "COMPLETED"; }
        next.outcome = "PROMOTED";
        const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === next.candidates.find((entry) => entry.candidateId === target.candidateId)?.hypothesisId);
        if (hypothesis?.state === "PROMOTABLE") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "PROMOTED", "hypothesis"); hypothesis.state = "PROMOTED"; }
      }
      next.yielded = true;
      return { aggregate: next, eventTypes: [rollback ? "ROLLBACK_REF_OBSERVED" : "WINNER_REF_OBSERVED", rollback ? "PROMOTION_ROLLED_BACK" : "PROMOTION_COMMITTED"] };
    });
  }

  async #publishReport(command: Extract<ArborCommandV1, { kind: "publishReport" }>, context: CommandContextV1): Promise<CommandReceiptV1> {
    const run = await this.#preflight(command, context);
    const report = run.reports.find((entry) => entry.generationId === command.generationId);
    if (!report || report.state !== "PLANNED") throw new ArborError("ILLEGAL_TRANSITION", "Report generation is not planned");
    const files = renderReportFiles(run, { generationId: report.generationId, publicationState: "PUBLISHED" });
    const built = buildReportManifest(report.generationId, files);
    let observation;
    try {
      observation = await this.#reportPublisher.publish(report.generationId, files, report.expectedManifestDigest ?? built.digest);
    } catch {
      observation = { version: 1 as const, generationId: report.generationId, classification: "uncertain" as const };
    }
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current);
      const target = next.reports.find((entry) => entry.generationId === command.generationId)!;
      const targetEffect = findEffect(next, (entry) => entry.kind === "report" && entry.idempotencyKey.includes(command.generationId));
      target.expectedManifestDigest = built.digest;
      if (observation.classification === "complete") {
        assertTransition(REPORT_TRANSITIONS, target.state, "WRITING", "report"); target.state = "WRITING";
        assertTransition(REPORT_TRANSITIONS, target.state, "FILES_OBSERVED", "report"); target.state = "FILES_OBSERVED";
        target.observedManifestDigest = observation.manifestDigest ?? built.digest;
        assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "OBSERVED", "effect"); targetEffect.state = "OBSERVED";
        this.#recordCompletedObservation(next, targetEffect, context, observation.manifestDigest ?? built.digest);
      } else if (observation.classification === "absent" || observation.classification === "partial") {
        assertTransition(REPORT_TRANSITIONS, target.state, "PUBLICATION_FAILED", "report"); target.state = "PUBLICATION_FAILED";
        assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "FAILED", "effect"); targetEffect.state = "FAILED";
      } else {
        assertTransition(REPORT_TRANSITIONS, target.state, "INDETERMINATE", "report"); target.state = "INDETERMINATE";
        assertTransition(EFFECT_TRANSITIONS, targetEffect.state, "INDETERMINATE", "effect"); targetEffect.state = "INDETERMINATE";
      }
      next.yielded = true;
      return { aggregate: next, eventTypes: [observation.classification === "complete" ? "REPORT_FILES_OBSERVED" : "REPORT_PUBLICATION_UNSETTLED"] };
    });
  }

  async #observeReport(command: Extract<ArborCommandV1, { kind: "observeReport" }>, context: CommandContextV1): Promise<CommandReceiptV1> {
    const run = await this.#preflight(command, context);
    const report = run.reports.find((entry) => entry.generationId === command.generationId);
    if (!report || report.state !== "FILES_OBSERVED" || !report.expectedManifestDigest) throw new ArborError("ILLEGAL_TRANSITION", "Report files are not ready for observation");
    const observation = await this.#reportPublisher.observe(report.generationId, report.expectedManifestDigest);
    if (observation.classification !== "complete" || observation.manifestDigest !== report.expectedManifestDigest) throw new ArborError("REPORT_CONFLICT", "Report generation could not be verified", { classification: observation.classification });
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current);
      const target = next.reports.find((entry) => entry.generationId === command.generationId)!;
      assertTransition(REPORT_TRANSITIONS, target.state, "PUBLISHED", "report"); target.state = "PUBLISHED";
      const effect = findEffect(next, (entry) => entry.kind === "report" && entry.idempotencyKey.includes(command.generationId));
      assertTransition(EFFECT_TRANSITIONS, effect.state, "COMMITTED", "effect"); effect.state = "COMMITTED"; effect.acceptedOutcomeDigest = target.expectedManifestDigest!;
      if (next.state === "REPORT_PENDING") { const restored = terminalStateForOutcome(next); assertTransition(RUN_TRANSITIONS, next.state, restored, "run"); next.state = restored; }
      next.yielded = true;
      return { aggregate: next, eventTypes: ["REPORT_PUBLISHED"], directive: { version: 1, kind: "done" } };
    });
  }

  async #executeCleanup(command: Extract<ArborCommandV1, { kind: "executeCleanup" }>, context: CommandContextV1): Promise<CommandReceiptV1> {
    const run = await this.#preflight(command, context);
    const cleanup = run.cleanup.find((entry) => entry.cleanupId === command.cleanupId);
    if (!cleanup || cleanup.state !== "PLANNED") throw new ArborError("ILLEGAL_TRANSITION", "Cleanup is not planned");
    const requiredDependencies = this.#reportDependencies(run);
    if (!run.reports.some((entry) => entry.state === "PUBLISHED" && requiredDependencies.every((digest) => entry.dependencyDigests.includes(digest)))) throw new ArborError("REPORT_DEPENDENCY_RETAINED", "Cleanup execution requires a complete published report covering every current dependency and the cleanup intent");
    const cleanupEffect = findEffect(run, (entry) => entry.kind === "cleanup" && entry.identity.cleanupId === cleanup.cleanupId && entry.identity.resourceId === cleanup.resourceId);
    await this.#cleanup.execute({ version: 1, cleanupId: cleanup.cleanupId, resourceId: cleanup.resourceId, resourceKind: cleanup.resourceKind, runId: run.runId, effectId: cleanupEffect.effectId });
    return this.#commit(command.kind, command.metadata, command, context, (current) => {
      if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      this.#requireDriver(current, context);
      const next = structuredClone(current);
      const target = next.cleanup.find((entry) => entry.cleanupId === command.cleanupId)!;
      assertTransition(CLEANUP_TRANSITIONS, target.state, "EXECUTING", "cleanup"); target.state = "EXECUTING";
      assertTransition(CLEANUP_TRANSITIONS, target.state, "OBSERVING", "cleanup"); target.state = "OBSERVING";
      next.yielded = true;
      return { aggregate: next, eventTypes: ["CLEANUP_EXECUTED", "CLEANUP_OBSERVING"] };
    });
  }

  #reduce(command: Exclude<ArborCommandV1, { kind: "materializeWorkspace" | "finalizeCandidate" | "evaluate" | "buildPromotionCandidate" | "applyWinnerRef" | "observeWinnerRef" | "applyRollbackRef" | "observeRollbackRef" | "publishReport" | "observeReport" | "executeCleanup" }>, current: RunAggregateV1 | undefined, context: CommandContextV1): MutationDecisionV1 {
    if (command.kind === "start") {
      if (current) throw new ArborError("RUN_ALREADY_EXISTS", "Run already exists");
      assertJsonSchema(this.schemas.schemas.contract!, command.contract, "Arbor contract");
      assertContractSemantics(command.contract, this.#admissions);
      const digest = digestCanonical(command.contract);
      const aggregate: RunAggregateV1 = {
        version: 1, runId: command.metadata.runId, revision: 0, sequence: 0,
        contract: immutableClone(command.contract), contractDigest: digest, epochDigest: digest, runtimeAdmission: immutableClone(this.#runtimeAdmission),
        state: "ADMITTED", phase: "OBSERVE", hypotheses: [], attempts: [], effects: [], effectObservations: [], agentChildren: [], budgetReservations: [], dispatchIntents: [], gates: [], candidates: [], certificates: [], mergeConstructions: [], promotions: [], authorizations: [], intents: [], reports: [], cleanup: [], workerClaims: [], pinnedHypothesisIds: [],
        yielded: false, createdAt: context.now, updatedAt: context.now,
      };
      return { aggregate, eventTypes: ["RUN_ADMITTED"] };
    }
    if (!current) throw new ArborError("RUN_NOT_FOUND", "Run not found");
    const next = structuredClone(current);
    next.effectObservations ??= []; next.agentChildren ??= []; next.budgetReservations ??= [];
    next.mergeConstructions ??= []; next.promotions ??= []; next.authorizations ??= [];
    if (command.kind !== "claimDriver") this.#requireDriver(current, context);

    switch (command.kind) {
      case "claimDriver": {
        if (current.driver && Date.parse(current.driver.expiresAt) > Date.parse(context.now) && current.driver.driverId !== command.driverId) throw new ArborError("LEASE_CONFLICT", "Another driver owns the live lease");
        const fence = (current.driver?.fence ?? 0) + 1;
        next.driver = { version: 1, driverId: command.driverId, fence, acquiredAt: context.now, expiresAt: addMilliseconds(context.now, command.leaseMs) };
        next.yielded = true;
        return { aggregate: next, eventTypes: ["DRIVER_CLAIMED"] };
      }
      case "heartbeat":
        next.driver!.expiresAt = addMilliseconds(context.now, command.leaseMs);
        return { aggregate: next, eventTypes: ["DRIVER_HEARTBEAT"] };
      case "advance": return this.#advance(next, context);
      case "signal": {
        if (command.signal === "pause") {
          if (!isActive(next.state)) throw new ArborError("ILLEGAL_TRANSITION", "Only active runs can pause");
          next.suspension = { version: 1, kind: "pause", priorState: next.state, priorPhase: next.phase };
          assertTransition(RUN_TRANSITIONS, next.state, "PAUSED", "run"); next.state = "PAUSED";
          assertTransition(EXPLORATION_TRANSITIONS, next.phase, "PAUSED", "exploration"); next.phase = "PAUSED";
        } else if (command.signal === "resume") {
          if (next.state !== "PAUSED" || next.phase !== "PAUSED" || !next.suspension || next.suspension.kind !== "pause") throw new ArborError("ILLEGAL_TRANSITION", "Run is not explicitly paused");
          const restored = next.suspension;
          assertTransition(RUN_TRANSITIONS, next.state, restored.priorState, "run"); next.state = restored.priorState;
          assertTransition(EXPLORATION_TRANSITIONS, next.phase, restored.priorPhase, "exploration"); next.phase = restored.priorPhase;
          delete next.suspension;
        } else if (command.signal === "gateAnswer") {
          if (!command.answer) throw new ArborError("VALIDATION_FAILED", "Gate answer is required");
          const gate = next.gates.find((entry) => entry.gateId === command.answer!.gateId);
          if (!gate) throw new ArborError("UNKNOWN_ENTITY", "Unknown gate");
          assertGateAnswer(gate, command.answer, context.now); gate.answer = command.answer;
          assertTransition(GATE_TRANSITIONS, gate.state, "ANSWERED", "gate"); gate.state = "ANSWERED";
        } else if (command.signal === "pin") {
          if (!command.entityId || !next.hypotheses.some((entry) => entry.hypothesisId === command.entityId)) throw new ArborError("UNKNOWN_ENTITY", "Unknown hypothesis");
          if (!next.pinnedHypothesisIds.includes(command.entityId)) next.pinnedHypothesisIds.push(command.entityId);
        } else if (command.signal === "prune") {
          const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === command.entityId);
          if (!hypothesis) throw new ArborError("UNKNOWN_ENTITY", "Unknown hypothesis");
          assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "PRUNED", "hypothesis"); hypothesis.state = "PRUNED";
          if (command.reason) hypothesis.lessons.push(command.reason);
        } else {
          const attempt = command.entityId ? findAttempt(next, command.entityId) : undefined;
          if (!attempt || attempt.state !== "RETRYABLE") throw new ArborError("ILLEGAL_TRANSITION", "Retry signal requires a retryable attempt");
          const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
          if (hypothesis.state !== "RETRYABLE") throw new ArborError("ILLEGAL_TRANSITION", "Retry hypothesis is not retryable");
          assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "SELECTED", "hypothesis"); hypothesis.state = "SELECTED";
          if (next.phase === "RECONCILING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "PREPARE", "exploration"); next.phase = "PREPARE"; }
        }
        next.yielded = true;
        return { aggregate: next, eventTypes: [`SIGNAL_${command.signal.toUpperCase()}`] };
      }
      case "cancel": {
        if (!isActive(next.state) && next.state !== "PAUSED" && next.state !== "WAITING_INPUT") throw new ArborError("ILLEGAL_TRANSITION", "Run cannot be cancelled from this state");
        assertTransition(RUN_TRANSITIONS, next.state, "CANCELLING", "run"); next.state = "CANCELLING";
        if (next.phase !== "CANCELLING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "CANCELLING", "exploration"); next.phase = "CANCELLING"; }
        const unsettled = next.effects.filter((effect) => !terminalEffectStates.has(effect.state));
        for (const effect of unsettled) { assertTransition(EFFECT_TRANSITIONS, effect.state, "CANCEL_REQUESTED", "effect"); effect.state = "CANCEL_REQUESTED"; }
        if (unsettled.length === 0) { assertTransition(RUN_TRANSITIONS, next.state, "CANCELLED", "run"); next.state = "CANCELLED"; next.outcome = "CANCELLED"; }
        next.yielded = true;
        return { aggregate: next, eventTypes: unsettled.length === 0 ? ["CANCELLATION_REQUESTED", "RUN_CANCELLED"] : ["CANCELLATION_REQUESTED", "EFFECT_CANCELLATION_INTENDED"] };
      }
      case "proposeHypothesis": {
        if (next.state !== "EXPLORING" || next.phase !== "IDEATE") throw new ArborError("ILLEGAL_TRANSITION", "Hypotheses can be proposed only during IDEATE");
        if (next.hypotheses.length >= next.contract.budgets.maxHypotheses) throw new ArborError("BUDGET_EXHAUSTED", "Hypothesis budget exhausted");
        if (next.hypotheses.some((entry) => entry.hypothesisId === command.hypothesis.hypothesisId)) throw new ArborError("DUPLICATE_ENTITY", "Duplicate hypothesis ID");
        if (command.hypothesis.parentHypothesisId && !next.hypotheses.some((entry) => entry.hypothesisId === command.hypothesis.parentHypothesisId)) throw new ArborError("UNKNOWN_ENTITY", "Unknown parent hypothesis");
        const hypothesis: HypothesisV1 = { ...immutableClone(command.hypothesis), state: "PROPOSED", lessons: [], attemptIds: [] };
        assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "PENDING", "hypothesis"); hypothesis.state = "PENDING";
        next.hypotheses.push(hypothesis);
        assertTransition(EXPLORATION_TRANSITIONS, next.phase, "SELECT", "exploration"); next.phase = "SELECT"; next.yielded = true;
        return { aggregate: next, eventTypes: ["HYPOTHESIS_PROPOSED", "HYPOTHESIS_PENDING"] };
      }
      case "selectHypothesis": {
        if (next.phase !== "SELECT") throw new ArborError("ILLEGAL_TRANSITION", "Selection is not the current phase");
        const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === command.hypothesisId);
        if (!hypothesis) throw new ArborError("UNKNOWN_ENTITY", "Unknown hypothesis");
        assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "SELECTED", "hypothesis"); hypothesis.state = "SELECTED";
        assertTransition(EXPLORATION_TRANSITIONS, next.phase, "PREPARE", "exploration"); next.phase = "PREPARE"; next.yielded = true;
        return { aggregate: next, eventTypes: ["HYPOTHESIS_SELECTED"], directive: { version: 1, kind: "reserveAgentDispatch", hypothesisId: hypothesis.hypothesisId } };
      }
      case "reserveAgentDispatch": {
        if (this.#executionMode === "productionBlocked") throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Real dispatch reservation requires B0/B1/B5 certification");
        if (next.attempts.length >= next.contract.budgets.maxAttempts) throw new ArborError("BUDGET_EXHAUSTED", "Attempt budget exhausted");
        const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === command.hypothesisId);
        if (!hypothesis) throw new ArborError("UNKNOWN_ENTITY", "Unknown hypothesis");
        if (hypothesis.state !== "SELECTED") throw new ArborError("ILLEGAL_TRANSITION", "Hypothesis is not selected");
        if (command.retryOfAttemptId) {
          const prior = findAttempt(next, command.retryOfAttemptId);
          if (prior.hypothesisId !== hypothesis.hypothesisId || prior.state !== "RETRYABLE") throw new ArborError("ILLEGAL_TRANSITION", "Retry source is not retryable for this hypothesis");
          assertTransition(ATTEMPT_TRANSITIONS, prior.state, "RETRIED", "attempt"); prior.state = "RETRIED";
        }
        const ordinal = hypothesis.attemptIds.length + 1;
        if (ordinal > next.contract.budgets.maxRetriesPerHypothesis + 1) throw new ArborError("BUDGET_EXHAUSTED", "Hypothesis retry budget exhausted");
        const attemptId = this.#ids.next("attempt");
        const dispatchKey = this.#ids.next("dispatch");
        const agentEffectId = this.#ids.next("effect");
        const budgetReservationId = this.#ids.next("budget");
        const dispatchPolicy = this.#executionMode === "productionCertified" ? this.#productionDispatch! : {
          containmentId: "containment_fixture", agentProfileId: "agent_fixture",
          requestSchemaDigest: sha256("fixture-agent-request-v1"), resultSchemaDigest: sha256("fixture-agent-result-v1"),
          toolPolicyId: next.contract.permissions.tools[0] ?? "policy_no_tools",
        };
        const attempt: AttemptV1 = { version: 1, attemptId, hypothesisId: hypothesis.hypothesisId, ordinal, state: "RESERVED", dispatchKey, effectId: agentEffectId, workspaceId: this.#ids.next("workspace"), budgetReservationId, ...(command.retryOfAttemptId ? { retryOfAttemptId: command.retryOfAttemptId } : {}) };
        next.attempts.push(attempt); hypothesis.attemptIds.push(attemptId);
        assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "PREPARING", "attempt"); attempt.state = "PREPARING";
        assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "RUNNING", "hypothesis"); hypothesis.state = "RUNNING";
        next.effects.push(
          this.#createEffect("workspace", "workspace", "materializeWorkspace", `workspace_${attemptId}`.padEnd(16, "_"), current.revision, context, { workspaceId: attempt.workspaceId }, attemptId),
          this.#createEffect("agent", "child", "spawnChild", `dispatch_${dispatchKey}`.padEnd(16, "_"), current.revision, context, { workspaceId: attempt.workspaceId, dispatchKey, containmentId: dispatchPolicy.containmentId }, attemptId, agentEffectId),
        );
        next.budgetReservations.push({ version: 1, budgetReservationId, attemptId, dispatchKey, effectId: agentEffectId, ordinal, state: "RESERVED" });
        next.dispatchIntents.push({
          version: 1, effectId: agentEffectId, dispatchKey, runId: next.runId, hypothesisId: hypothesis.hypothesisId,
          attemptId, fence: context.fence, workspaceId: attempt.workspaceId, containmentId: dispatchPolicy.containmentId,
          cwdToken: `cwd_${sha256(`${next.runId}:${attemptId}:${dispatchKey}`)}`,
          agentProfileId: dispatchPolicy.agentProfileId, requestSchemaDigest: dispatchPolicy.requestSchemaDigest,
          resultSchemaDigest: dispatchPolicy.resultSchemaDigest,
          toolPolicyId: dispatchPolicy.toolPolicyId,
          budgetReservationId, expiresAt: next.driver!.expiresAt,
        });
        next.yielded = true;
        return { aggregate: next, eventTypes: ["ATTEMPT_RESERVED", "AGENT_DISPATCH_INTENDED"], directive: { version: 1, kind: "materializeWorkspace", attemptId } };
      }
      case "attachAgentChild": {
        const attempt = findAttempt(next, command.attemptId);
        if (attempt.dispatchKey !== command.dispatchKey) throw new ArborError("EVIDENCE_INVALID", "Dispatch key mismatch");
        const effect = findEffect(next, (entry) => entry.effectId === attempt.effectId);
        if (effect.identity.fence !== context.fence) throw new ArborError("STALE_FENCE", "A child from an older fence must be reconciled, not directly attached");
        if (this.#executionMode === "productionCertified" && (!command.workflowCorrelationDigest || !command.requestDigest || !command.processUnit)) throw new ArborError("EVIDENCE_INVALID", "Production child attachment requires complete correlation and descendant identity");
        if (attempt.state === "READY") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "DISPATCHING", "attempt"); attempt.state = "DISPATCHING"; }
        assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "RUNNING", "attempt"); attempt.state = "RUNNING";
        attempt.childHandleDigest = sha256(command.childHandle);
        assertTransition(EFFECT_TRANSITIONS, effect.state, "STARTED", "effect"); effect.state = "STARTED"; effect.correlationDigest = attempt.childHandleDigest;
        if (command.processUnit) effect.processUnit = immutableClone(command.processUnit);
        const dispatch = next.dispatchIntents.find((entry) => entry.attemptId === attempt.attemptId)!;
        next.agentChildren.push({
          version: 1, childId: `child_${attempt.childHandleDigest.slice(0, 32)}`, attemptId: attempt.attemptId, effectId: effect.effectId,
          dispatchKey: attempt.dispatchKey, fence: context.fence, childHandleDigest: attempt.childHandleDigest,
          workflowCorrelationDigest: command.workflowCorrelationDigest ?? sha256(`fixture-workflow:${attempt.dispatchKey}`),
          requestDigest: command.requestDigest ?? dispatch.requestSchemaDigest, containmentId: dispatch.containmentId,
          state: "STARTED", ...(command.processUnit ? { processUnit: immutableClone(command.processUnit) } : {}),
        });
        const budget = next.budgetReservations.find((entry) => entry.budgetReservationId === attempt.budgetReservationId); if (budget) budget.state = "CONSUMED";
        assertTransition(EXPLORATION_TRANSITIONS, next.phase, "COLLECT", "exploration"); next.phase = "COLLECT"; next.yielded = false;
        return { aggregate: next, eventTypes: ["AGENT_CHILD_ATTACHED", "ATTEMPT_RUNNING"] };
      }
      case "submitAgentObservation": {
        const attempt = findAttempt(next, command.attemptId);
        if (attempt.dispatchKey !== command.dispatchKey) throw new ArborError("EVIDENCE_INVALID", "Dispatch key mismatch");
        const effect = findEffect(next, (entry) => entry.effectId === attempt.effectId);
        assertTransition(EFFECT_TRANSITIONS, effect.state, "OBSERVED", "effect"); effect.state = "OBSERVED";
        next.workerClaims.push({
          version: 1, attemptId: attempt.attemptId, changedPaths: [...command.changedPaths], informational: true,
          ...(command.claimedMetric ? { claimedMetric: command.claimedMetric } : {}),
          ...(command.rawResultDigest ? { rawResultDigest: command.rawResultDigest } : {}),
          ...(command.terminalStatus ? { terminalStatus: command.terminalStatus } : {}),
          ...(command.boundedOutput ? { boundedPreview: redactText(command.boundedOutput) } : {}),
        });
        const child = next.agentChildren.find((entry) => entry.effectId === effect.effectId);
        if (child) { child.state = command.terminalStatus === "completed" ? "COMPLETED" : command.terminalStatus === "cancelled" ? "CANCELLED_CONFIRMED" : "FAILED"; if (command.rawResultDigest) child.resultDigest = command.rawResultDigest; }
        if (command.terminalStatus && command.terminalStatus !== "completed") {
          assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "INTERRUPTED", "attempt"); attempt.state = "INTERRUPTED";
          const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
          assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "INTERRUPTED", "hypothesis"); hypothesis.state = "INTERRUPTED";
          assertTransition(EFFECT_TRANSITIONS, effect.state, "FAILED", "effect"); effect.state = "FAILED";
          assertTransition(EXPLORATION_TRANSITIONS, next.phase, "RECONCILING", "exploration"); next.phase = "RECONCILING"; next.yielded = true;
          return { aggregate: next, eventTypes: ["AGENT_OBSERVATION_INTERRUPTED"] };
        }
        assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "COLLECTING", "attempt"); attempt.state = "COLLECTING";
        const outcomeDigest = command.rawResultDigest ?? digestCanonical({ attemptId: attempt.attemptId, terminalStatus: command.terminalStatus ?? "completed", changedPaths: command.changedPaths });
        this.#recordCompletedObservation(next, effect, context, outcomeDigest, { terminalStatus: command.terminalStatus ?? "completed", changedPaths: command.changedPaths, ...(command.rawResultDigest ? { rawResultDigest: command.rawResultDigest } : {}) });
        assertTransition(EFFECT_TRANSITIONS, effect.state, "COMMITTED", "effect"); effect.state = "COMMITTED"; effect.acceptedOutcomeDigest = outcomeDigest;
        next.effects.push(this.#createEffect("workspace", "workspace", "finalizeCandidate", `finalize_${attempt.attemptId}`.padEnd(16, "_"), current.revision, context, { workspaceId: attempt.workspaceId, candidateId: this.#ids.next("candidate") }, attempt.attemptId));
        assertTransition(EXPLORATION_TRANSITIONS, next.phase, "FINALIZE", "exploration"); next.phase = "FINALIZE"; next.yielded = true;
        return { aggregate: next, eventTypes: ["AGENT_OBSERVATION_ACCEPTED"], directive: { version: 1, kind: "finalizeCandidate", attemptId: attempt.attemptId } };
      }
      case "interruptEffect": return this.#interruptEffect(next, command.effectId, command.reason);
      case "reconcileEffect": return this.#reconcileEffect(next, command.observation, context);
      case "resumeEffect": return this.#resumeEffect(next, command.effectId, context);
      case "observeEffectCancellation": return this.#observeEffectCancellation(next, command.effectId, command.outcome, command.observerDigest, command.fingerprint);
      case "planPromotionCommit": {
        this.#requirePhase5();
        const promotion = this.#promotion(next, command.promotionId);
        if (promotion.state !== "AWAITING_AUTHORIZATION") throw new ArborError("ILLEGAL_TRANSITION", "Promotion is not awaiting authorization");
        const authorization = next.authorizations.find((entry) => entry.authorizationId === command.authorizationId);
        if (!authorization) throw new ArborError("UNKNOWN_ENTITY", "Promotion authorization does not exist");
        this.#assertAuthorizationMatches(next, promotion, authorization, false, context.now, ["STORED"]);
        assertTransition(PROMOTION_TRANSITIONS, promotion.state, "AWAITING_FABRIC_POLICY", "promotion"); promotion.state = "AWAITING_FABRIC_POLICY";
        assertTransition(AUTHORIZATION_TRANSITIONS, authorization.state, "CONSUMED", "authorization"); authorization.state = "CONSUMED"; authorization.consumedById = promotion.promotionId;
        promotion.authorizationId = authorization.authorizationId; promotion.authorizationDigest = digestCanonical(authorization);
        const traversalRequest = this.#fabricPolicyTraversalRequest(next, promotion, false);
        const effect = this.#createEffect("promotion", "git", "applyWinnerRef", `promote_${promotion.promotionId}`.slice(0, 128).padEnd(16, "_"), current.revision, context, { oid: promotion.mergeCandidateOid!, candidateId: promotion.candidateId }, undefined, traversalRequest.operationId);
        promotion.effectId = effect.effectId; next.effects.push(effect);
        assertTransition(PROMOTION_TRANSITIONS, promotion.state, "COMMIT_PLANNED", "promotion"); promotion.state = "COMMIT_PLANNED";
        return { aggregate: next, eventTypes: ["PROMOTION_AUTHORIZATION_CONSUMED", "PROMOTION_COMMIT_PLANNED"] };
      }
      case "planRollback": {
        this.#requirePhase5();
        const promotion = this.#promotion(next, command.promotionId);
        if (promotion.state !== "AWAITING_ROLLBACK_AUTHORIZATION") throw new ArborError("ILLEGAL_TRANSITION", "Promotion is not awaiting rollback authorization");
        const authorization = next.authorizations.find((entry) => entry.authorizationId === command.authorizationId);
        if (!authorization) throw new ArborError("UNKNOWN_ENTITY", "Rollback authorization does not exist");
        this.#assertAuthorizationMatches(next, promotion, authorization, true, context.now, ["STORED"]);
        assertTransition(AUTHORIZATION_TRANSITIONS, authorization.state, "CONSUMED", "authorization"); authorization.state = "CONSUMED"; authorization.consumedById = promotion.promotionId;
        promotion.rollbackAuthorizationId = authorization.authorizationId; promotion.rollbackAuthorizationDigest = digestCanonical(authorization);
        const traversalRequest = this.#fabricPolicyTraversalRequest(next, promotion, true);
        const effect = this.#createEffect("rollback", "git", "applyRollbackRef", `rollback_${promotion.promotionId}`.slice(0, 128).padEnd(16, "_"), current.revision, context, { oid: promotion.predecessorOid!, candidateId: promotion.candidateId }, undefined, traversalRequest.operationId);
        promotion.rollbackEffectId = effect.effectId; next.effects.push(effect);
        assertTransition(PROMOTION_TRANSITIONS, promotion.state, "ROLLBACK_PLANNED", "promotion"); promotion.state = "ROLLBACK_PLANNED";
        if (next.state === "ROLLBACK_REQUESTED") { assertTransition(RUN_TRANSITIONS, next.state, "ROLLING_BACK", "run"); next.state = "ROLLING_BACK"; }
        return { aggregate: next, eventTypes: ["ROLLBACK_AUTHORIZATION_CONSUMED", "ROLLBACK_PLANNED"] };
      }
      case "finalizeRun":
        if (next.phase !== "BACKPROPAGATE" && next.phase !== "DECIDE" && next.phase !== "FINALIZE_RUN") throw new ArborError("ILLEGAL_TRANSITION", "Run is not ready to finalize");
        if (next.phase === "BACKPROPAGATE") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "DECIDE", "exploration"); next.phase = "DECIDE"; }
        if (next.phase === "DECIDE") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "FINALIZE_RUN", "exploration"); next.phase = "FINALIZE_RUN"; }
        if (command.outcome === "FAILED") {
          assertTransition(RUN_TRANSITIONS, next.state, "FAILED", "run"); next.state = "FAILED"; next.outcome = "FAILED"; next.yielded = true;
          return { aggregate: next, eventTypes: ["RUN_FAILED"] };
        }
        if (this.#phase5 && next.bestCandidateId) {
          assertTransition(RUN_TRANSITIONS, next.state, "VERIFYING_FINAL", "run"); next.state = "VERIFYING_FINAL";
          assertTransition(RUN_TRANSITIONS, next.state, "AWAITING_PROMOTION", "run"); next.state = "AWAITING_PROMOTION";
          delete next.outcome; next.yielded = true;
          return { aggregate: next, eventTypes: ["RUN_FINALIZED", "RUN_AWAITING_PROMOTION"], directive: { version: 1, kind: "done" } };
        }
        assertTransition(RUN_TRANSITIONS, next.state, "COMPLETED", "run"); next.state = "COMPLETED"; next.outcome = command.outcome; next.yielded = true;
        return { aggregate: next, eventTypes: ["RUN_FINALIZED"] };
      case "processIntent": return this.#processIntent(next, command.intentId, context);
      case "planReport": {
        const reportFinalState = next.state === "REPORT_PENDING" ? terminalStateForOutcome(next) : next.state;
        if (["COMPLETED", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED", "ROLLED_BACK"].includes(next.state)) { assertTransition(RUN_TRANSITIONS, next.state, "REPORT_PENDING", "run"); next.state = "REPORT_PENDING"; }
        else if (next.state !== "REPORT_PENDING") throw new ArborError("ILLEGAL_TRANSITION", "Run cannot plan a report from this state");
        const existing = next.reports.find((entry) => entry.state === "PLANNED");
        if (existing) { next.yielded = true; return { aggregate: next, eventTypes: ["REPORT_ALREADY_PLANNED"], directive: { version: 1, kind: "publishReport", generationId: existing.generationId } }; }
        const failed = next.reports.find((entry) => entry.state === "PUBLICATION_FAILED");
        if (failed) {
          assertTransition(REPORT_TRANSITIONS, failed.state, "PLANNED", "report"); failed.state = "PLANNED";
          next.effects.push(this.#createEffect("report", "report", "publishReport", `report_${failed.generationId}_${this.#ids.next("retry")}`.slice(0, 128).padEnd(16, "_"), current.revision, context, { generationId: failed.generationId }));
          next.yielded = true;
          return { aggregate: next, eventTypes: ["REPORT_REPLANNED"], directive: { version: 1, kind: "publishReport", generationId: failed.generationId } };
        }
        const generationId = this.#ids.next("report");
        const dependencies = this.#reportDependencies(next, reportFinalState);
        const report: RunAggregateV1["reports"][number] = { version: 1, generationId, revision: current.revision + 1, state: "PLANNED", dependencyDigests: dependencies };
        next.reports.push(report);
        next.effects.push(this.#createEffect("report", "report", "publishReport", `report_${generationId}`.padEnd(16, "_"), current.revision, context, { generationId }));
        report.expectedManifestDigest = buildReportManifest(generationId, renderReportFiles(next, { generationId, publicationState: "PUBLISHED" })).digest;
        next.yielded = true;
        return { aggregate: next, eventTypes: ["REPORT_PLANNED"], directive: { version: 1, kind: "publishReport", generationId } };
      }
      case "planCleanup": {
        const retention = retentionDecision(next, context.now, this.#legalHoldRunIds.has(next.runId));
        if (!retention.eligible) throw new ArborError("REPORT_DEPENDENCY_RETAINED", retention.reason);
        const priorDependencies = this.#reportDependencies(next);
        const covered = next.reports.some((entry) => entry.state === "PUBLISHED" && priorDependencies.every((digest) => entry.dependencyDigests.includes(digest)));
        if (!covered) throw new ArborError("REPORT_DEPENDENCY_RETAINED", "Cleanup cannot remove unpublished report dependencies");
        if (["COMPLETED", "CANCELLED", "FAILED", "ROLLED_BACK"].includes(next.state)) { assertTransition(RUN_TRANSITIONS, next.state, "CLEANUP_PENDING", "run"); next.state = "CLEANUP_PENDING"; }
        else if (next.state !== "CLEANUP_PENDING") throw new ArborError("ILLEGAL_TRANSITION", "Run cannot plan cleanup from this state");
        const cleanupId = this.#ids.next("cleanup");
        next.cleanup.push({ version: 1, cleanupId, resourceId: command.resourceId, resourceKind: command.resourceKind, state: "PLANNED", reportDependencyDigests: priorDependencies });
        next.effects.push(this.#createEffect("cleanup", "cleanup", "cleanup", `cleanup_${cleanupId}`.padEnd(16, "_"), current.revision, context, { cleanupId, resourceId: command.resourceId }));
        const reportDependencies = this.#reportDependencies(next); const generationId = this.#ids.next("report");
        const report: RunAggregateV1["reports"][number] = { version: 1, generationId, revision: current.revision + 1, state: "PLANNED", dependencyDigests: reportDependencies };
        next.reports.push(report); next.effects.push(this.#createEffect("report", "report", "publishReport", `report_${generationId}`.padEnd(16, "_"), current.revision, context, { generationId }));
        report.expectedManifestDigest = buildReportManifest(generationId, renderReportFiles(next, { generationId, publicationState: "PUBLISHED", finalRunState: "CLEANUP_PENDING" })).digest;
        next.yielded = true;
        return { aggregate: next, eventTypes: ["CLEANUP_PLANNED", "REPORT_PLANNED"], directive: { version: 1, kind: "publishReport", generationId } };
      }
      case "observeCleanup": {
        const cleanup = next.cleanup.find((entry) => entry.cleanupId === command.cleanupId);
        if (!cleanup) throw new ArborError("UNKNOWN_ENTITY", "Unknown cleanup obligation");
        const state = command.outcome === "completed" ? "COMPLETED" : command.outcome === "pending" ? "CLEANUP_PENDING" : "INDETERMINATE";
        assertTransition(CLEANUP_TRANSITIONS, cleanup.state, state, "cleanup"); cleanup.state = state;
        const effect = findEffect(next, (entry) => entry.kind === "cleanup" && entry.idempotencyKey.includes(command.cleanupId));
        const effectState = command.outcome === "completed" ? "COMMITTED" : command.outcome === "pending" ? "FAILED" : "INDETERMINATE";
        if (effect.state === "INTENDED") { assertTransition(EFFECT_TRANSITIONS, effect.state, "OBSERVED", "effect"); effect.state = "OBSERVED"; }
        const outcomeDigest = digestCanonical({ cleanupId: command.cleanupId, outcome: command.outcome });
        if (command.outcome === "completed") this.#recordCompletedObservation(next, effect, context, outcomeDigest);
        else {
          const observation: EffectObservationV1 = { version: 1, observationId: this.#ids.next("observation"), effectId: effect.effectId, classification: command.outcome === "pending" ? "ABSENT" : "UNCERTAIN", targetFence: effect.identity.fence, observedFence: context.fence, expectedRevision: next.revision, identityDigest: digestCanonical(effect.identity), observedAt: context.now, observerDigest: outcomeDigest, reasons: [`cleanup adapter reported ${command.outcome}`] };
          next.effectObservations.push(observation); effect.latestObservationId = observation.observationId;
        }
        assertTransition(EFFECT_TRANSITIONS, effect.state, effectState, "effect"); effect.state = effectState; if (command.outcome === "completed") effect.acceptedOutcomeDigest = outcomeDigest;
        if (state === "COMPLETED" && next.state === "CLEANUP_PENDING") { const restored = terminalStateForOutcome(next); assertTransition(RUN_TRANSITIONS, next.state, restored, "run"); next.state = restored; }
        next.yielded = true;
        return { aggregate: next, eventTypes: [state === "COMPLETED" ? "CLEANUP_COMPLETED" : "CLEANUP_UNSETTLED"] };
      }
    }
  }

  #interruptEffect(next: RunAggregateV1, effectId: string, _reason: string): MutationDecisionV1 {
    const effect = findEffect(next, (entry) => entry.effectId === effectId);
    if (terminalEffectStates.has(effect.state) || effect.state === "CANCEL_REQUESTED") throw new ArborError("ILLEGAL_TRANSITION", "Terminal or cancelling effect cannot be interrupted");
    if (!effect.interruptedFromPhase) effect.interruptedFromPhase = next.phase;
    const attempt = effect.attemptId ? findAttempt(next, effect.attemptId) : undefined;
    if (attempt && !effect.interruptedFromAttemptState) effect.interruptedFromAttemptState = attempt.state;
    if (effect.state !== "OBSERVING") { assertTransition(EFFECT_TRANSITIONS, effect.state, "OBSERVING", "effect"); effect.state = "OBSERVING"; }
    if (attempt && !["RECONCILING", "CANDIDATE", "REJECTED", "PARTIAL", "RETRYABLE", "CANCELLED", "INDETERMINATE", "RETRIED"].includes(attempt.state)) {
      if (attempt.state === "RESERVED") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "PREPARING", "attempt"); attempt.state = "PREPARING"; }
      if (attempt.state === "READY") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "DISPATCHING", "attempt"); attempt.state = "DISPATCHING"; }
      assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "INTERRUPTED", "attempt"); attempt.state = "INTERRUPTED";
      assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "RECONCILING", "attempt"); attempt.state = "RECONCILING";
      const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
      if (hypothesis.state === "RUNNING") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "INTERRUPTED", "hypothesis"); hypothesis.state = "INTERRUPTED"; }
      if (hypothesis.state === "INTERRUPTED") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "RECONCILING", "hypothesis"); hypothesis.state = "RECONCILING"; }
    }
    if (next.phase !== "RECONCILING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "RECONCILING", "exploration"); next.phase = "RECONCILING"; }
    next.yielded = true;
    return { aggregate: next, eventTypes: ["EFFECT_INTERRUPTED", "RECOVERY_REQUIRED"] };
  }

  #reconcileEffect(next: RunAggregateV1, observation: EffectObservationV1, context: CommandContextV1): MutationDecisionV1 {
    const effect = findEffect(next, (entry) => entry.effectId === observation.effectId);
    if (terminalEffectStates.has(effect.state) || effect.acceptedOutcomeDigest) throw new ArborError("DUPLICATE_ENTITY", "Effect already has an accepted durable outcome");
    if (observation.expectedRevision !== next.revision || observation.observedFence !== context.fence) throw new ArborError("STALE_REVISION", "Recovery observation revision or fence is stale");
    if (observation.targetFence !== effect.identity.fence || observation.identityDigest !== digestCanonical(effect.identity)) throw new ArborError("EVIDENCE_INVALID", "Recovery observation identity does not match the intended effect");
    if (observation.processUnit && observation.processUnit.containmentId !== effect.identity.containmentId) throw new ArborError("EVIDENCE_INVALID", "Observed process containment does not match effect identity");
    if (this.#executionMode === "productionCertified" && !observation.fingerprint) throw new ArborError("EVIDENCE_INVALID", "Production recovery requires a fingerprint certificate binding");
    if (observation.fingerprint && (observation.fingerprint.effectId !== effect.effectId || observation.fingerprint.fence !== observation.targetFence || observation.fingerprint.beforeDigest !== observation.fingerprint.afterDigest || !observation.fingerprint.equal)) {
      next.effectObservations.push(immutableClone(observation)); effect.latestObservationId = observation.observationId;
      if (!terminalEffectStates.has(effect.state)) { assertTransition(EFFECT_TRANSITIONS, effect.state, "INDETERMINATE", "effect"); effect.state = "INDETERMINATE"; }
      this.#settleUnsafe(next, "QUARANTINED");
      return { aggregate: next, eventTypes: ["FINGERPRINT_MISMATCH", "RUN_QUARANTINED"] };
    }
    if (observation.classification === "COMPLETED" && !observation.outcomeDigest) throw new ArborError("EVIDENCE_INVALID", "Completed recovery requires an outcome digest");
    next.effectObservations.push(immutableClone(observation)); effect.latestObservationId = observation.observationId;
    if (observation.processUnit) effect.processUnit = immutableClone(observation.processUnit);

    if (observation.classification === "ACTIVE") {
      if (effect.state !== "OBSERVING") { assertTransition(EFFECT_TRANSITIONS, effect.state, "OBSERVING", "effect"); effect.state = "OBSERVING"; }
      const child = next.agentChildren.find((entry) => entry.effectId === effect.effectId); if (child) child.state = "ACTIVE";
      next.yielded = true;
      return { aggregate: next, eventTypes: ["EFFECT_CLASSIFIED_ACTIVE"] };
    }
    if (observation.classification === "UNCERTAIN") {
      assertTransition(EFFECT_TRANSITIONS, effect.state, "INDETERMINATE", "effect"); effect.state = "INDETERMINATE";
      this.#settleUnsafe(next, "INDETERMINATE");
      return { aggregate: next, eventTypes: ["EFFECT_CLASSIFIED_UNCERTAIN", "RUN_INDETERMINATE"] };
    }
    if (observation.classification === "ABSENT") {
      assertTransition(EFFECT_TRANSITIONS, effect.state, "FAILED_ABSENT", "effect"); effect.state = "FAILED_ABSENT";
      this.#applyAbsentOutcome(next, effect);
      next.yielded = true;
      return { aggregate: next, eventTypes: ["EFFECT_CLASSIFIED_ABSENT", "RETRY_REQUIRES_NEW_EFFECT"] };
    }

    if (effect.state === "DISPATCHING") { assertTransition(EFFECT_TRANSITIONS, effect.state, "OBSERVING", "effect"); effect.state = "OBSERVING"; }
    assertTransition(EFFECT_TRANSITIONS, effect.state, "OBSERVED", "effect"); effect.state = "OBSERVED";
    const directive = this.#applyCompletedOutcome(next, effect, observation, context);
    effect.acceptedOutcomeDigest = observation.outcomeDigest!;
    assertTransition(EFFECT_TRANSITIONS, effect.state, "COMMITTED", "effect"); effect.state = "COMMITTED";
    next.yielded = true;
    return { aggregate: next, eventTypes: ["EFFECT_CLASSIFIED_COMPLETED", "EFFECT_OUTCOME_COMMITTED"], ...(directive ? { directive } : {}) };
  }

  #resumeEffect(next: RunAggregateV1, effectId: string, context: CommandContextV1): MutationDecisionV1 {
    const effect = findEffect(next, (entry) => entry.effectId === effectId);
    const latest = next.effectObservations.find((entry) => entry.observationId === effect.latestObservationId);
    if (effect.state !== "OBSERVING" || latest?.classification !== "ACTIVE") throw new ArborError("ILLEGAL_TRANSITION", "Only an observed active effect can resume monitoring");
    effect.monitoringResumedAt = context.now;
    const attempt = effect.attemptId ? findAttempt(next, effect.attemptId) : undefined;
    if (attempt?.state === "RECONCILING" && effect.identity.boundary === "child") {
      assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "RUNNING", "attempt"); attempt.state = "RUNNING";
      const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
      if (hypothesis.state === "RECONCILING") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "RUNNING", "hypothesis"); hypothesis.state = "RUNNING"; }
      if (next.phase === "RECONCILING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "COLLECT", "exploration"); next.phase = "COLLECT"; }
    }
    next.yielded = true;
    return { aggregate: next, eventTypes: ["EFFECT_MONITORING_RESUMED"] };
  }

  #observeEffectCancellation(next: RunAggregateV1, effectId: string, outcome: "confirmed" | "uncertain", observerDigest: string, fingerprint?: EffectObservationV1["fingerprint"]): MutationDecisionV1 {
    const effect = findEffect(next, (entry) => entry.effectId === effectId);
    if (effect.state !== "CANCEL_REQUESTED") throw new ArborError("ILLEGAL_TRANSITION", "Effect has no cancellation intent");
    if (fingerprint && (fingerprint.effectId !== effect.effectId || fingerprint.fence !== effect.identity.fence || !fingerprint.equal || fingerprint.beforeDigest !== fingerprint.afterDigest)) {
      assertTransition(EFFECT_TRANSITIONS, effect.state, "INDETERMINATE", "effect"); effect.state = "INDETERMINATE"; this.#settleUnsafe(next, "QUARANTINED");
      return { aggregate: next, eventTypes: ["FINGERPRINT_MISMATCH", "RUN_QUARANTINED"] };
    }
    if (this.#executionMode === "productionCertified" && !fingerprint) throw new ArborError("EVIDENCE_INVALID", "Production cancellation requires a fingerprint certificate binding");
    effect.acceptedOutcomeDigest = observerDigest;
    if (outcome === "uncertain") {
      assertTransition(EFFECT_TRANSITIONS, effect.state, "INDETERMINATE", "effect"); effect.state = "INDETERMINATE"; this.#settleUnsafe(next, "INDETERMINATE");
      return { aggregate: next, eventTypes: ["CANCELLATION_UNCERTAIN", "RUN_INDETERMINATE"] };
    }
    assertTransition(EFFECT_TRANSITIONS, effect.state, "CANCELLED_CONFIRMED", "effect"); effect.state = "CANCELLED_CONFIRMED";
    const attempt = effect.attemptId ? findAttempt(next, effect.attemptId) : undefined;
    if (attempt && !["CANDIDATE", "REJECTED", "PARTIAL", "CANCELLED", "INDETERMINATE", "RETRIED"].includes(attempt.state)) {
      if (attempt.state === "RESERVED" || attempt.state === "READY") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "CANCELLED", "attempt"); attempt.state = "CANCELLED"; }
      else {
        if (!["INTERRUPTED", "RECONCILING"].includes(attempt.state)) { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "INTERRUPTED", "attempt"); attempt.state = "INTERRUPTED"; }
        if (attempt.state === "INTERRUPTED") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "RECONCILING", "attempt"); attempt.state = "RECONCILING"; }
        assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "CANCELLED", "attempt"); attempt.state = "CANCELLED";
      }
      const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
      if (HYPOTHESIS_TRANSITIONS[hypothesis.state].has("CANCELLED")) hypothesis.state = "CANCELLED";
      const budget = next.budgetReservations.find((entry) => entry.attemptId === attempt.attemptId); if (budget) budget.state = "RETAINED";
    }
    const child = next.agentChildren.find((entry) => entry.effectId === effect.effectId); if (child) child.state = "CANCELLED_CONFIRMED";
    if (next.effects.every((entry) => terminalEffectStates.has(entry.state))) {
      if (next.state !== "CANCELLING") throw new ArborError("ILLEGAL_TRANSITION", "Cancellation completion requires CANCELLING run state");
      assertTransition(RUN_TRANSITIONS, next.state, "CANCELLED", "run"); next.state = "CANCELLED"; next.outcome = "CANCELLED";
    }
    next.yielded = true;
    return { aggregate: next, eventTypes: ["DESCENDANT_CANCELLATION_CONFIRMED", ...(next.state === "CANCELLED" ? ["RUN_CANCELLED"] : [])] };
  }

  #applyAbsentOutcome(next: RunAggregateV1, effect: EffectV1): void {
    const attempt = effect.attemptId ? findAttempt(next, effect.attemptId) : undefined;
    if (attempt?.state === "RECONCILING") {
      assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "RETRYABLE", "attempt"); attempt.state = "RETRYABLE";
      const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
      if (hypothesis.state === "RECONCILING") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "RETRYABLE", "hypothesis"); hypothesis.state = "RETRYABLE"; }
      const budget = next.budgetReservations.find((entry) => entry.attemptId === attempt.attemptId); if (budget) budget.state = "RETAINED";
    }
    if (effect.identity.boundary === "report" && effect.identity.generationId) {
      const report = next.reports.find((entry) => entry.generationId === effect.identity.generationId);
      if (report && report.state === "PLANNED") { assertTransition(REPORT_TRANSITIONS, report.state, "PUBLICATION_FAILED", "report"); report.state = "PUBLICATION_FAILED"; }
    }
    if (effect.identity.boundary === "cleanup" && effect.identity.cleanupId) {
      const cleanup = next.cleanup.find((entry) => entry.cleanupId === effect.identity.cleanupId);
      if (cleanup && ["PLANNED", "EXECUTING", "OBSERVING"].includes(cleanup.state)) { assertTransition(CLEANUP_TRANSITIONS, cleanup.state, "CLEANUP_PENDING", "cleanup"); cleanup.state = "CLEANUP_PENDING"; }
    }
  }

  #applyCompletedOutcome(next: RunAggregateV1, effect: EffectV1, observation: EffectObservationV1, context: CommandContextV1): ArborDirectiveV1 | undefined {
    const action = effect.identity.action;
    if (action === "materializeWorkspace") {
      const attempt = findAttempt(next, effect.attemptId!);
      if (attempt.state === "RECONCILING") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "READY", "attempt"); attempt.state = "READY"; }
      else if (attempt.state === "PREPARING") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "READY", "attempt"); attempt.state = "READY"; }
      const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
      if (hypothesis.state === "RECONCILING") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "RUNNING", "hypothesis"); hypothesis.state = "RUNNING"; }
      if (next.phase === "RECONCILING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "DISPATCH", "exploration"); next.phase = "DISPATCH"; }
      const dispatch = next.dispatchIntents.find((entry) => entry.attemptId === attempt.attemptId)!;
      return { version: 1, kind: "dispatchAgent", dispatch };
    }
    if (action === "spawnChild") {
      const attempt = findAttempt(next, effect.attemptId!);
      const terminal = observation.terminalStatus ?? "completed";
      const dispatch = next.dispatchIntents.find((entry) => entry.attemptId === attempt.attemptId)!;
      let child = next.agentChildren.find((entry) => entry.effectId === effect.effectId);
      if (!child) {
        const handleDigest = effect.correlationDigest ?? observation.observerDigest;
        child = { version: 1, childId: `child_${handleDigest.slice(0, 32)}`, attemptId: attempt.attemptId, effectId: effect.effectId, dispatchKey: attempt.dispatchKey, fence: effect.identity.fence, childHandleDigest: handleDigest, workflowCorrelationDigest: observation.observerDigest, requestDigest: dispatch.requestSchemaDigest, containmentId: dispatch.containmentId, state: "ACTIVE", ...(observation.processUnit ? { processUnit: observation.processUnit } : {}) };
        next.agentChildren.push(child);
      }
      child.state = terminal === "completed" ? "COMPLETED" : terminal === "cancelled" ? "CANCELLED_CONFIRMED" : "FAILED";
      if (observation.rawResultDigest) child.resultDigest = observation.rawResultDigest;
      if (terminal === "completed") {
        if (attempt.state === "RECONCILING") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "COLLECTING", "attempt"); attempt.state = "COLLECTING"; }
        else if (attempt.state === "RUNNING") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "COLLECTING", "attempt"); attempt.state = "COLLECTING"; }
        const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
        if (hypothesis.state === "RECONCILING") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "RUNNING", "hypothesis"); hypothesis.state = "RUNNING"; }
        if (!next.workerClaims.some((entry) => entry.attemptId === attempt.attemptId)) next.workerClaims.push({ version: 1, attemptId: attempt.attemptId, changedPaths: [...(observation.changedPaths ?? [])], informational: true, terminalStatus: terminal, ...(observation.rawResultDigest ? { rawResultDigest: observation.rawResultDigest } : {}), ...(observation.boundedOutput ? { boundedPreview: redactText(observation.boundedOutput) } : {}) });
        next.effects.push(this.#createEffect("workspace", "workspace", "finalizeCandidate", `finalize_${attempt.attemptId}`.padEnd(16, "_"), next.revision, context, { workspaceId: attempt.workspaceId, candidateId: this.#ids.next("candidate") }, attempt.attemptId));
        if (next.phase === "RECONCILING" || next.phase === "COLLECT") { if (next.phase === "RECONCILING") assertTransition(EXPLORATION_TRANSITIONS, next.phase, "FINALIZE", "exploration"); else assertTransition(EXPLORATION_TRANSITIONS, next.phase, "FINALIZE", "exploration"); next.phase = "FINALIZE"; }
        return { version: 1, kind: "finalizeCandidate", attemptId: attempt.attemptId };
      }
      if (attempt.state === "RECONCILING") { const target: AttemptState = observation.partial ? "PARTIAL" : "RETRYABLE"; assertTransition(ATTEMPT_TRANSITIONS, attempt.state, target, "attempt"); attempt.state = target; }
      const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
      if (hypothesis.state === "RECONCILING") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "RETRYABLE", "hypothesis"); hypothesis.state = "RETRYABLE"; }
      return undefined;
    }
    if (action === "finalizeCandidate") {
      const candidate = observation.candidate;
      if (!candidate || candidate.candidateId !== effect.identity.candidateId || candidate.attemptId !== effect.attemptId) throw new ArborError("EVIDENCE_INVALID", "Recovered candidate identity mismatch");
      if (next.candidates.some((entry) => entry.candidateId === candidate.candidateId)) throw new ArborError("DUPLICATE_ENTITY", "Candidate already accepted");
      const attempt = findAttempt(next, effect.attemptId!);
      if (attempt.state === "RECONCILING") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "FINALIZING", "attempt"); attempt.state = "FINALIZING"; }
      else if (attempt.state === "COLLECTING") { assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "FINALIZING", "attempt"); attempt.state = "FINALIZING"; }
      assertTransition(ATTEMPT_TRANSITIONS, attempt.state, "CANDIDATE", "attempt"); attempt.state = "CANDIDATE"; attempt.candidateId = candidate.candidateId;
      const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
      if (hypothesis.state === "RECONCILING" || hypothesis.state === "RUNNING") { assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "CANDIDATE", "hypothesis"); hypothesis.state = "CANDIDATE"; }
      next.candidates.push(immutableClone(candidate));
      next.effects.push(this.#createEffect("evaluation", "evaluator", "evaluate", `evaluate_${candidate.candidateId}`.padEnd(16, "_"), next.revision, context, { evaluationRole: "developmentCandidate", oid: candidate.candidateOid, candidateId: candidate.candidateId }, attempt.attemptId));
      if (next.phase === "RECONCILING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "EVALUATE_DEV", "exploration"); next.phase = "EVALUATE_DEV"; }
      return { version: 1, kind: "evaluateCandidate", candidateId: candidate.candidateId, oid: candidate.candidateOid };
    }
    if (action === "evaluate") {
      const certificate = observation.certificate;
      if (!certificate || certificate.certificateId !== effect.identity.certificateId || certificate.evaluationId !== effect.identity.evaluationId || certificate.role !== effect.identity.evaluationRole || certificate.oid !== effect.identity.oid) throw new ArborError("EVIDENCE_INVALID", "Recovered evaluator certificate identity mismatch");
      if (next.certificates.some((entry) => entry.certificateId === certificate.certificateId || entry.evaluationId === certificate.evaluationId)) throw new ArborError("DUPLICATE_ENTITY", "Evaluator outcome already accepted");
      const expectedEvaluator = certificate.role.startsWith("development") ? next.contract.evaluation.development : next.contract.evaluation.heldOut;
      if (certificate.runId !== next.runId || certificate.epochDigest !== next.epochDigest || certificate.contractDigest !== next.contractDigest || certificate.evaluatorId !== expectedEvaluator || certificate.parserVersion !== next.contract.evaluation.parserVersion || certificate.metric !== next.contract.metric.name || certificate.unit !== next.contract.metric.unit || certificate.quantum !== next.contract.metric.quantum) throw new ArborError("EVIDENCE_INVALID", "Recovered evaluator certificate binding mismatch");
      next.certificates.push(immutableClone(certificate));
      if (certificate.valid && certificate.role === "developmentBaseline") next.developmentBaselineCertificateId = certificate.certificateId;
      if (certificate.valid && certificate.role === "heldOutBaseline") next.heldOutBaselineCertificateId = certificate.certificateId;
      if (certificate.role === "developmentCandidate") {
        const baseline = next.certificates.find((entry) => entry.certificateId === next.developmentBaselineCertificateId);
        if (!baseline?.valid || baseline.epochDigest !== certificate.epochDigest) throw new ArborError("EVIDENCE_INVALID", "Compatible development baseline is missing");
        const candidateId = effect.identity.candidateId!;
        if (certificate.valid && compareAggregates(BigInt(certificate.aggregateUnits), BigInt(baseline.aggregateUnits), next.contract.metric.direction, next.contract.metric.minimumImprovement, next.contract.metric.quantum).passes) next.bestCandidateId = candidateId;
        if (next.phase === "RECONCILING" || next.phase === "EVALUATE_DEV") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "BACKPROPAGATE", "exploration"); next.phase = "BACKPROPAGATE"; }
        return { version: 1, kind: "finalizeRun" };
      }
      return undefined;
    }
    if (action === "publishReport") {
      const report = next.reports.find((entry) => entry.generationId === effect.identity.generationId);
      if (!report || !report.expectedManifestDigest || observation.outcomeDigest !== report.expectedManifestDigest) throw new ArborError("REPORT_CONFLICT", "Recovered report manifest does not match the planned generation");
      if (report.state === "PLANNED") { assertTransition(REPORT_TRANSITIONS, report.state, "WRITING", "report"); report.state = "WRITING"; }
      if (report.state === "WRITING") { assertTransition(REPORT_TRANSITIONS, report.state, "FILES_OBSERVED", "report"); report.state = "FILES_OBSERVED"; }
      if (report.state === "FILES_OBSERVED") { assertTransition(REPORT_TRANSITIONS, report.state, "PUBLISHED", "report"); report.state = "PUBLISHED"; report.observedManifestDigest = observation.outcomeDigest; }
      if (next.state === "REPORT_PENDING") { const restored = terminalStateForOutcome(next); assertTransition(RUN_TRANSITIONS, next.state, restored, "run"); next.state = restored; }
      if (next.phase === "RECONCILING" && effect.interruptedFromPhase) { assertTransition(EXPLORATION_TRANSITIONS, next.phase, effect.interruptedFromPhase, "exploration"); next.phase = effect.interruptedFromPhase; }
      return { version: 1, kind: "done" };
    }
    if (action === "cleanup") {
      const cleanup = next.cleanup.find((entry) => entry.cleanupId === effect.identity.cleanupId);
      if (!cleanup) throw new ArborError("UNKNOWN_ENTITY", "Recovered cleanup obligation is missing");
      if (cleanup.state === "PLANNED") { assertTransition(CLEANUP_TRANSITIONS, cleanup.state, "EXECUTING", "cleanup"); cleanup.state = "EXECUTING"; }
      if (cleanup.state === "EXECUTING") { assertTransition(CLEANUP_TRANSITIONS, cleanup.state, "OBSERVING", "cleanup"); cleanup.state = "OBSERVING"; }
      if (cleanup.state === "OBSERVING") { assertTransition(CLEANUP_TRANSITIONS, cleanup.state, "COMPLETED", "cleanup"); cleanup.state = "COMPLETED"; }
      if (next.state === "CLEANUP_PENDING") { const restored = terminalStateForOutcome(next); assertTransition(RUN_TRANSITIONS, next.state, restored, "run"); next.state = restored; }
      if (next.phase === "RECONCILING" && effect.interruptedFromPhase) { assertTransition(EXPLORATION_TRANSITIONS, next.phase, effect.interruptedFromPhase, "exploration"); next.phase = effect.interruptedFromPhase; }
    }
    return undefined;
  }

  #settleUnsafe(next: RunAggregateV1, outcome: "INDETERMINATE" | "QUARANTINED"): void {
    if (next.state !== outcome) { assertTransition(RUN_TRANSITIONS, next.state, outcome, "run"); next.state = outcome; }
    if (next.phase !== outcome) { assertTransition(EXPLORATION_TRANSITIONS, next.phase, outcome, "exploration"); next.phase = outcome; }
    next.outcome = outcome; next.yielded = true;
    for (const child of next.agentChildren.filter((entry) => !["COMPLETED", "FAILED", "CANCELLED_CONFIRMED"].includes(entry.state))) child.state = "INDETERMINATE";
  }

  #recordCompletedObservation(next: RunAggregateV1, effect: EffectV1, context: CommandContextV1, outcomeDigest: string, extras: Partial<Pick<EffectObservationV1, "terminalStatus" | "changedPaths" | "rawResultDigest" | "candidate" | "certificate">> = {}): void {
    const observation: EffectObservationV1 = {
      version: 1, observationId: this.#ids.next("observation"), effectId: effect.effectId, classification: "COMPLETED",
      targetFence: effect.identity.fence, observedFence: context.fence, expectedRevision: next.revision,
      identityDigest: digestCanonical(effect.identity), observedAt: context.now,
      observerDigest: digestCanonical({ effectId: effect.effectId, outcomeDigest, source: "direct-adapter" }), outcomeDigest,
      ...extras, reasons: ["direct adapter returned a complete identity-bound observation"],
    };
    next.effectObservations.push(observation); effect.latestObservationId = observation.observationId;
  }

  #createEffect(
    kind: EffectV1["kind"], boundary: EffectBoundaryKind, action: EffectIdentityV1["action"], idempotencyKey: string,
    currentRevision: number, context: CommandContextV1, bindings: Partial<Omit<EffectIdentityV1, "version" | "boundary" | "action" | "fence" | "expectedRevision" | "intentDigest">> = {},
    attemptId?: string, suppliedEffectId?: string,
  ): EffectV1 {
    const effectId = suppliedEffectId ?? this.#ids.next("effect");
    const evaluationBindings = action === "evaluate" ? { evaluationId: bindings.evaluationId ?? this.#ids.next("evaluation"), certificateId: bindings.certificateId ?? this.#ids.next("certificate") } : {};
    const containmentBinding = bindings.containmentId ? {} : { containmentId: boundary === "report" || boundary === "cleanup" || boundary === "outbox" ? "containment_filesystem" : this.#productionDispatch?.containmentId ?? "containment_fixture" };
    const payload = { version: 1 as const, boundary, action, fence: context.fence, expectedRevision: currentRevision + 1, ...containmentBinding, ...bindings, ...evaluationBindings };
    const identity: EffectIdentityV1 = { ...payload, intentDigest: digestCanonical({ effectId, idempotencyKey, ...payload }) };
    return { version: 1, effectId, kind, state: "INTENDED", idempotencyKey, identity, ...(attemptId ? { attemptId } : {}) };
  }

  #advance(next: RunAggregateV1, context: CommandContextV1): MutationDecisionV1 {
    const pendingIntent = next.intents.find((entry) => entry.state === "PENDING");
    if (pendingIntent) { next.yielded = true; return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "processIntent" as const, intentId: pendingIntent.intentId } }; }
    if (next.state === "ADMITTED") {
      assertTransition(RUN_TRANSITIONS, next.state, "BASELINING", "run"); next.state = "BASELINING";
      next.effects.push(this.#createEffect("evaluation", "evaluator", "evaluate", `evaluate_development_${next.runId}`.slice(0, 128), next.revision, context, { evaluationRole: "developmentBaseline", oid: next.contract.repository.initialOid }));
      next.yielded = true;
      return { aggregate: next, eventTypes: ["BASELINING_STARTED", "EVALUATION_INTENDED"], directive: { version: 1 as const, kind: "evaluateBaseline" as const, role: "developmentBaseline" as const, oid: next.contract.repository.initialOid } };
    }
    if (next.state === "BASELINING") {
      if (!next.developmentBaselineCertificateId) {
        if (!next.effects.some((entry) => entry.kind === "evaluation" && entry.state === "INTENDED")) next.effects.push(this.#createEffect("evaluation", "evaluator", "evaluate", `evaluate_development_${next.runId}`.slice(0, 128), next.revision, context, { evaluationRole: "developmentBaseline", oid: next.contract.repository.initialOid }));
        next.yielded = true;
        return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "evaluateBaseline" as const, role: "developmentBaseline" as const, oid: next.contract.repository.initialOid } };
      }
      if (this.#phase5 && !next.heldOutBaselineCertificateId) {
        const oid = next.contract.repository.initialOid;
        if (!next.effects.some((entry) => entry.identity.action === "buildPromotionCandidate" && entry.identity.evaluationRole === "heldOutBaseline" && !terminalEffectStates.has(entry.state))) next.effects.push(this.#createEffect("git", "git", "buildPromotionCandidate", `merge_baseline_${next.runId}`.slice(0, 128).padEnd(16, "_"), next.revision, context, { evaluationRole: "heldOutBaseline", oid }));
        next.yielded = true;
        return { aggregate: next, eventTypes: ["HELD_OUT_BASELINE_CONSTRUCTION_REQUIRED"], directive: { version: 1 as const, kind: "buildPromotionCandidate" as const, role: "heldOutBaseline" as const, expectedResearchTrunkOid: oid } };
      }
      if (this.#executionMode !== "productionCertified" && !next.heldOutBaselineCertificateId) {
        if (!next.effects.some((entry) => entry.kind === "evaluation" && entry.state === "INTENDED")) next.effects.push(this.#createEffect("evaluation", "evaluator", "evaluate", `evaluate_heldout_${next.runId}`.slice(0, 128), next.revision, context, { evaluationRole: "heldOutBaseline", oid: next.contract.repository.initialOid }));
        next.yielded = true;
        return { aggregate: next, eventTypes: ["HELD_OUT_BASELINE_INTENDED"], directive: { version: 1 as const, kind: "evaluateBaseline" as const, role: "heldOutBaseline" as const, oid: next.contract.repository.initialOid } };
      }
      assertTransition(RUN_TRANSITIONS, next.state, "EXPLORING", "run"); next.state = "EXPLORING";
      assertTransition(EXPLORATION_TRANSITIONS, next.phase, "IDEATE", "exploration"); next.phase = "IDEATE"; next.yielded = true;
      return { aggregate: next, eventTypes: ["EXPLORATION_STARTED"], directive: { version: 1 as const, kind: "coordinateHypothesis" as const } };
    }
    if (next.state !== "EXPLORING") { next.yielded = true; return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "done" as const } }; }
    if (next.phase === "IDEATE") { next.yielded = true; return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "coordinateHypothesis" as const } }; }
    if (next.phase === "SELECT") {
      const hypothesis = next.hypotheses.find((entry) => entry.state === "PENDING");
      if (!hypothesis) throw new ArborError("UNKNOWN_ENTITY", "No pending hypothesis to select");
      next.yielded = true; return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "selectHypothesis" as const, hypothesisId: hypothesis.hypothesisId } };
    }
    if (next.phase === "PREPARE") {
      const hypothesis = next.hypotheses.find((entry) => entry.state === "SELECTED");
      if (!hypothesis) throw new ArborError("UNKNOWN_ENTITY", "No selected hypothesis to reserve");
      next.yielded = true; return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "reserveAgentDispatch" as const, hypothesisId: hypothesis.hypothesisId } };
    }
    if (next.phase === "BACKPROPAGATE" || next.phase === "DECIDE") { next.yielded = true; return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "finalizeRun" as const } }; }
    next.yielded = true;
    return { aggregate: next, eventTypes: ["DRIVER_YIELDED"], directive: { version: 1 as const, kind: "done" as const } };
  }

  #processIntent(next: RunAggregateV1, intentId: string, context: CommandContextV1): MutationDecisionV1 {
    if (!next.yielded) throw new ArborError("INTENT_NOT_AT_YIELD", "Web intents are processed only at driver yields");
    const stored = next.intents.find((entry) => entry.intentId === intentId);
    if (!stored) throw new ArborError("UNKNOWN_ENTITY", "Unknown Web intent");
    if (stored.state !== "PENDING") throw new ArborError("ILLEGAL_TRANSITION", "Web intent is not pending");
    stored.state = "CLAIMED"; stored.claimedByDriverId = context.driverId!;
    const intent = stored.intent;
    let directive: ArborDirectiveV1 | undefined;
    try {
      switch (intent.kind) {
        case "pause": {
          if (!isActive(next.state)) throw new ArborError("ILLEGAL_TRANSITION", "Run cannot pause");
          next.suspension = { version: 1, kind: "pause", priorState: next.state, priorPhase: next.phase };
          assertTransition(RUN_TRANSITIONS, next.state, "PAUSED", "run"); next.state = "PAUSED";
          assertTransition(EXPLORATION_TRANSITIONS, next.phase, "PAUSED", "exploration"); next.phase = "PAUSED"; break;
        }
        case "resume": {
          if (next.state !== "PAUSED" || next.phase !== "PAUSED" || !next.suspension) throw new ArborError("ILLEGAL_TRANSITION", "Run is not paused");
          const restored = next.suspension; assertTransition(RUN_TRANSITIONS, next.state, restored.priorState, "run"); next.state = restored.priorState;
          assertTransition(EXPLORATION_TRANSITIONS, next.phase, restored.priorPhase, "exploration"); next.phase = restored.priorPhase; delete next.suspension; break;
        }
        case "cancel": {
          if (!isActive(next.state) && next.state !== "PAUSED" && next.state !== "WAITING_INPUT") throw new ArborError("ILLEGAL_TRANSITION", "Run cannot cancel");
          assertTransition(RUN_TRANSITIONS, next.state, "CANCELLING", "run"); next.state = "CANCELLING";
          if (next.phase !== "CANCELLING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "CANCELLING", "exploration"); next.phase = "CANCELLING"; }
          const unsettled = next.effects.filter((effect) => !terminalEffectStates.has(effect.state));
          for (const effect of unsettled) { assertTransition(EFFECT_TRANSITIONS, effect.state, "CANCEL_REQUESTED", "effect"); effect.state = "CANCEL_REQUESTED"; }
          if (unsettled.length === 0) { assertTransition(RUN_TRANSITIONS, next.state, "CANCELLED", "run"); next.state = "CANCELLED"; next.outcome = "CANCELLED"; }
          break;
        }
        case "pinHypothesis": if (!next.hypotheses.some((entry) => entry.hypothesisId === intent.hypothesisId)) throw new ArborError("UNKNOWN_ENTITY", "Unknown hypothesis"); if (!next.pinnedHypothesisIds.includes(intent.hypothesisId)) next.pinnedHypothesisIds.push(intent.hypothesisId); break;
        case "pruneHypothesis": { const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === intent.hypothesisId); if (!hypothesis) throw new ArborError("UNKNOWN_ENTITY", "Unknown hypothesis"); assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "PRUNED", "hypothesis"); hypothesis.state = "PRUNED"; hypothesis.lessons.push(intent.reason); break; }
        case "retryAttempt": {
          const attempt = findAttempt(next, intent.attemptId); if (attempt.state !== "RETRYABLE") throw new ArborError("ILLEGAL_TRANSITION", "Attempt is not retryable");
          const hypothesis = next.hypotheses.find((entry) => entry.hypothesisId === attempt.hypothesisId)!;
          if (hypothesis.state !== "RETRYABLE") throw new ArborError("ILLEGAL_TRANSITION", "Hypothesis is not retryable");
          assertTransition(HYPOTHESIS_TRANSITIONS, hypothesis.state, "SELECTED", "hypothesis"); hypothesis.state = "SELECTED";
          if (next.phase === "RECONCILING") { assertTransition(EXPLORATION_TRANSITIONS, next.phase, "PREPARE", "exploration"); next.phase = "PREPARE"; }
          break;
        }
        case "answerGate": {
          const gate = next.gates.find((entry) => entry.gateId === intent.answer.gateId);
          if (!gate) throw new ArborError("UNKNOWN_ENTITY", "No matching open gate");
          assertGateAnswer(gate, intent.answer, context.now);
          gate.answer = intent.answer;
          assertTransition(GATE_TRANSITIONS, gate.state, "ANSWERED", "gate"); gate.state = "ANSWERED";
          break;
        }
        case "requestPromotion": {
          const phase5 = this.#requirePhase5();
          const candidate = next.candidates.find((entry) => entry.candidateId === intent.candidateId);
          if (!candidate || next.bestCandidateId !== candidate.candidateId) throw new ArborError("UNKNOWN_ENTITY", "Candidate is not the current development-certified winner");
          const baseline = next.certificates.find((entry) => entry.certificateId === next.heldOutBaselineCertificateId);
          const baselineConstruction = next.mergeConstructions.find((entry) => entry.constructionId === next.heldOutBaselineConstructionId);
          if (!baseline?.valid || !baselineConstruction || baseline.oid !== baselineConstruction.mergeCandidateOid) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Exact detached held-out baseline is missing");
          this.#assertStrictHeldOutCertificate(next, baseline, baselineConstruction);
          if (next.state === "ROLLED_BACK") { assertTransition(RUN_TRANSITIONS, next.state, "AWAITING_PROMOTION", "run"); next.state = "AWAITING_PROMOTION"; }
          if (next.state !== "AWAITING_PROMOTION") throw new ArborError("ILLEGAL_TRANSITION", "Run is not awaiting promotion");
          const promotionId = this.#ids.next("promotion");
          const promotion: PromotionV1 = { version: 1, promotionId, state: "REQUESTED", candidateId: candidate.candidateId, candidateOid: candidate.candidateOid, expectedResearchTrunkOid: next.contract.repository.initialOid, winnerRef: phase5.git.winnerRef(next.runId) };
          assertTransition(PROMOTION_TRANSITIONS, promotion.state, "PREPARING", "promotion"); promotion.state = "PREPARING";
          next.promotions.push(promotion);
          const effect = this.#createEffect("git", "git", "buildPromotionCandidate", `merge_${promotionId}`.slice(0, 128).padEnd(16, "_"), next.revision, context, { evaluationRole: "heldOutCandidate", oid: candidate.candidateOid, candidateId: candidate.candidateId });
          next.effects.push(effect);
          assertTransition(RUN_TRANSITIONS, next.state, "PROMOTING", "run"); next.state = "PROMOTING";
          directive = { version: 1, kind: "buildPromotionCandidate", role: "heldOutCandidate", expectedResearchTrunkOid: next.contract.repository.initialOid, candidateId: candidate.candidateId, promotionId };
          break;
        }
        case "requestRollback": {
          this.#requirePhase5();
          const promotion = this.#promotion(next, intent.promotionId);
          if (promotion.state !== "COMMITTED" || next.state !== "COMPLETED" || next.outcome !== "PROMOTED") throw new ArborError("ILLEGAL_TRANSITION", "Only the committed current winner can request rollback");
          assertTransition(PROMOTION_TRANSITIONS, promotion.state, "ROLLBACK_REQUESTED", "promotion"); promotion.state = "ROLLBACK_REQUESTED";
          assertTransition(PROMOTION_TRANSITIONS, promotion.state, "AWAITING_ROLLBACK_AUTHORIZATION", "promotion"); promotion.state = "AWAITING_ROLLBACK_AUTHORIZATION";
          assertTransition(RUN_TRANSITIONS, next.state, "ROLLBACK_REQUESTED", "run"); next.state = "ROLLBACK_REQUESTED";
          this.#issueChallenge(next, promotion, "rollback", context.now);
          break;
        }
        case "requestReport": {
          if (!["COMPLETED", "ROLLED_BACK", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED"].includes(next.state)) throw new ArborError("ILLEGAL_TRANSITION", "Report request requires a settled run");
          directive = { version: 1, kind: "planReport" };
          break;
        }
        case "requestCleanup": if (!["COMPLETED", "ROLLED_BACK", "CANCELLED", "FAILED"].includes(next.state)) throw new ArborError("ILLEGAL_TRANSITION", "Cleanup request requires a settled cleanup-eligible run"); break;
      }
      stored.state = "APPLIED";
      return { aggregate: next, eventTypes: ["WEB_INTENT_CLAIMED", "WEB_INTENT_APPLIED", ...(intent.kind === "requestPromotion" ? ["PROMOTION_REQUESTED"] : intent.kind === "requestRollback" ? ["ROLLBACK_CHALLENGE_ISSUED"] : [])], ...(directive ? { directive } : {}) };
    } catch (error) {
      stored.state = "REJECTED"; stored.rejectionReason = error instanceof Error ? error.message : "Rejected";
      return { aggregate: next, eventTypes: ["WEB_INTENT_CLAIMED", "WEB_INTENT_REJECTED"] };
    }
  }

  #requirePhase5(): NonNullable<ArborApplicationDependenciesV1["phase5"]> {
    if (!this.#phase5) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Promotion is disabled because retained B7/B8/Phase 5 certification is absent");
    return this.#phase5;
  }

  #promotion(run: RunAggregateV1, promotionId: string): PromotionV1 {
    const promotion = run.promotions.find((entry) => entry.promotionId === promotionId);
    if (!promotion) throw new ArborError("UNKNOWN_ENTITY", "Promotion journal does not exist");
    return promotion;
  }

  #issueChallenge(next: RunAggregateV1, promotion: PromotionV1, kind: "promote" | "rollback", now: string): AuthorizationRecordV1 {
    const phase5 = this.#requirePhase5();
    if (!promotion.mergeCandidateOid || !promotion.heldOutCertificateDigest || !promotion.expectedCurrentOid || !promotion.predecessorOid) throw new ArborError("EVIDENCE_INVALID", "Promotion is not fully frozen for authorization");
    const principal = phase5.authorization.select(kind, next.contract.repository.repositoryId, now);
    const entropy = this.#ids.next("nonce");
    const nonce = sha256(`${entropy}:${next.runId}:${promotion.promotionId}:${kind}`);
    const challengeId = `challenge_${sha256(`${nonce}:${kind}`).slice(0, 32)}`;
    const payload: AuthorizationPayloadV1 = {
      version: 1, kind, challengeId, runId: next.runId, repositoryId: next.contract.repository.repositoryId,
      promotionId: promotion.promotionId, candidateId: promotion.candidateId, candidateOid: promotion.candidateOid,
      mergeCandidateOid: promotion.mergeCandidateOid, heldOutCertificateDigest: promotion.heldOutCertificateDigest,
      contractDigest: next.contractDigest, winnerRef: promotion.winnerRef,
      expectedCurrentOid: kind === "rollback" ? promotion.mergeCandidateOid : promotion.expectedCurrentOid,
      predecessorOid: promotion.predecessorOid, expiresAt: addMilliseconds(now, phase5.challengeTtlMs ?? 300_000), nonce, principalId: principal.principalId,
    };
    const record: AuthorizationRecordV1 = {
      version: 1, authorizationId: `authorization_${sha256(challengeId).slice(0, 32)}`, challengeId,
      challengeDigest: digestCanonical(payload), payload, nonceDigest: sha256(nonce), principalId: principal.principalId,
      keyId: `key_${sha256(principal.publicKey).slice(0, 32)}`, state: "CHALLENGE_ISSUED",
    };
    next.authorizations.push(record);
    if (kind === "promote") promotion.authorizationId = record.authorizationId;
    else promotion.rollbackAuthorizationId = record.authorizationId;
    return record;
  }

  #fabricPolicyTraversalRequest(run: RunAggregateV1, promotion: PromotionV1, rollback: boolean): Omit<FabricPolicyTraversalRequestV1, "parentToolCallId" | "nestedToolCallId"> {
    const authorizationId = rollback ? promotion.rollbackAuthorizationId : promotion.authorizationId;
    if (!authorizationId || !promotion.mergeCandidateOid || !promotion.expectedCurrentOid || !promotion.predecessorOid) throw new ArborError("EVIDENCE_INVALID", "Fabric traversal request does not match a complete journaled authorization and CAS identity");
    const action = rollback ? "arbor.applyRollbackRef" as const : "arbor.applyWinnerRef" as const;
    const expectedOid = rollback ? promotion.mergeCandidateOid : promotion.expectedCurrentOid;
    const targetOid = rollback ? promotion.predecessorOid : promotion.mergeCandidateOid;
    const operationId = `operation_${sha256(`${action}:${run.runId}:${promotion.promotionId}:${authorizationId}:${expectedOid}:${targetOid}`).slice(0, 32)}`;
    const bindings = { version: 1 as const, action, runId: run.runId, operationId, promotionId: promotion.promotionId, candidateId: promotion.candidateId, authorizationId, expectedOid, targetOid };
    return { version: 1, action, argsDigest: digestCanonical(bindings), runId: run.runId, operationId, promotionId: promotion.promotionId, candidateId: promotion.candidateId, authorizationId };
  }

  #fixtureFabricPolicyTraversal(request: FabricPolicyTraversalRequestV1, now: string): FabricPolicyTraversalProofV1 {
    const base = { ...request, boundary: "explicit-test-fixture" as const, traversedAt: now };
    return Object.freeze({ ...base, traversalDigest: digestCanonical(base) });
  }

  #assertFabricPolicyTraversal(proof: FabricPolicyTraversalProofV1, request: Omit<FabricPolicyTraversalRequestV1, "parentToolCallId" | "nestedToolCallId">): void {
    for (const key of ["version", "action", "argsDigest", "runId", "operationId", "promotionId", "candidateId", "authorizationId"] as const) if (proof[key] !== request[key]) throw new ArborError("EVIDENCE_INVALID", `Fabric policy traversal ${key} binding mismatches`);
    if (!proof.parentToolCallId || !proof.nestedToolCallId || !Number.isFinite(Date.parse(proof.traversedAt))) throw new ArborError("EVIDENCE_INVALID", "Fabric policy traversal has invalid host correlation");
    const { traversalDigest, ...payload } = proof;
    if (traversalDigest !== digestCanonical(payload)) throw new ArborError("EVIDENCE_INVALID", "Fabric policy traversal digest mismatch");
    if (this.#executionMode === "productionCertified") {
      if (proof.boundary !== "certified-production-host" || proof.b9CertificationId !== "approval_runtime_b9_v1" || proof.b9CertificationDigest !== this.#fabricPolicyTraversal?.b9CertificationDigest) throw new ArborError("EVIDENCE_INVALID", "Production traversal is not bound to the active B9-certified Fabric policy boundary");
    } else if (proof.boundary !== "explicit-test-fixture" || proof.b9CertificationId || proof.b9CertificationDigest) throw new ArborError("EVIDENCE_INVALID", "Fixture traversal must not claim production Fabric policy certification");
  }

  #assertFrozenFabricPolicyTraversal(run: RunAggregateV1, promotion: PromotionV1, rollback: boolean): void {
    const proof = rollback ? promotion.rollbackFabricPolicyTraversal : promotion.fabricPolicyTraversal;
    const digest = rollback ? promotion.rollbackFabricPolicyTraversalDigest : promotion.fabricPolicyTraversalDigest;
    if (!proof || !digest || digest !== proof.traversalDigest) throw new ArborError("EVIDENCE_INVALID", "Frozen Fabric policy traversal proof is missing or altered");
    const request = this.#fabricPolicyTraversalRequest(run, promotion, rollback);
    if (proof.operationId !== (rollback ? promotion.rollbackEffectId : promotion.effectId)) throw new ArborError("EVIDENCE_INVALID", "Fabric policy traversal operation does not equal the journaled ref effect");
    this.#assertFabricPolicyTraversal(proof, request);
  }

  #assertAuthorizationMatches(run: RunAggregateV1, promotion: PromotionV1, authorization: AuthorizationRecordV1, rollback: boolean, now: string, acceptedStates: readonly AuthorizationRecordV1["state"][]): void {
    const phase5 = this.#requirePhase5(); const kind = rollback ? "rollback" : "promote";
    phase5.authorization.verifyAuthorization(authorization, kind, run.contract.repository.repositoryId, now, acceptedStates);
    const expected = {
      runId: run.runId, repositoryId: run.contract.repository.repositoryId, promotionId: promotion.promotionId,
      candidateId: promotion.candidateId, candidateOid: promotion.candidateOid, mergeCandidateOid: promotion.mergeCandidateOid,
      heldOutCertificateDigest: promotion.heldOutCertificateDigest, contractDigest: run.contractDigest, winnerRef: promotion.winnerRef,
      expectedCurrentOid: rollback ? promotion.mergeCandidateOid : promotion.expectedCurrentOid, predecessorOid: promotion.predecessorOid,
    };
    for (const [key, value] of Object.entries(expected)) if (authorization.payload[key as keyof AuthorizationPayloadV1] !== value) throw new ArborError("EVIDENCE_INVALID", `Authorization frozen ${key} binding mismatches`);
    if (authorization.authorizationId !== (rollback ? promotion.rollbackAuthorizationId : promotion.authorizationId)) throw new ArborError("EVIDENCE_INVALID", "Authorization ID is not the journaled challenge");
  }

  #assertFrozenAuthorization(run: RunAggregateV1, promotion: PromotionV1, rollback: boolean, now: string): void {
    const authorizationId = rollback ? promotion.rollbackAuthorizationId : promotion.authorizationId;
    const expectedDigest = rollback ? promotion.rollbackAuthorizationDigest : promotion.authorizationDigest;
    const authorization = run.authorizations.find((entry) => entry.authorizationId === authorizationId);
    if (!authorization || !expectedDigest || digestCanonical(authorization) !== expectedDigest || authorization.consumedById !== promotion.promotionId) throw new ArborError("EVIDENCE_INVALID", "Consumed authorization journal is missing or altered");
    this.#assertAuthorizationMatches(run, promotion, authorization, rollback, now, ["CONSUMED"]);
  }

  #assertStrictHeldOutCertificate(run: RunAggregateV1, certificate: RunAggregateV1["certificates"][number], construction: MergeConstructionV1): void {
    const phase5 = this.#requirePhase5(); const policy = certificate.policy;
    if (!certificate.valid || certificate.trust !== "certified" || certificate.strictProtocol !== true || !policy || policy.strictProtocol !== true) throw new ArborError("EVIDENCE_INVALID", "Held-out promotion requires a valid strict certified evaluator certificate");
    const { policyDigest, ...policyPayload } = policy;
    if (policyDigest !== digestCanonical(policyPayload) || policy.split !== "heldOut" || policy.parserVersion !== run.contract.evaluation.parserVersion || policy.quantum !== run.contract.metric.quantum || policy.trialCount !== run.contract.metric.trialCount || policy.seeds.length !== policy.trialCount || new Set(policy.seeds).size !== policy.seeds.length || policy.aggregation !== run.contract.metric.aggregation || policy.nondeterminismTolerance !== run.contract.metric.nondeterminismTolerance || policy.trialOrder.length !== policy.trialCount || policy.trialOrder.some((ordinal, index) => ordinal !== index + 1)) throw new ArborError("EVIDENCE_INVALID", "Held-out evaluator policy is noncanonical or differs from the contract");
    if (certificate.rawTrials.length !== policy.trialCount || certificate.quantizedUnits.length !== policy.trialCount || certificate.containmentCertificateDigest !== policy.containmentCertificateDigest || policy.heldOutIsolationCertificateDigest !== phase5.heldOutIsolationCertificateDigest || certificate.heldOutIsolationCertificateDigest !== phase5.heldOutIsolationCertificateDigest) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Held-out certificate does not bind the active B8 certificate");
    if (certificate.oid !== construction.mergeCandidateOid || certificate.mergeCandidateOid !== construction.mergeCandidateOid || certificate.baseOid !== construction.expectedResearchTrunkOid || certificate.candidateOid !== construction.candidateOid || certificate.requiredOutputsDigest !== construction.requiredOutputsDigest || certificate.protectedManifestDigest !== construction.protectedManifestDigest) throw new ArborError("EVIDENCE_INVALID", "Held-out certificate does not bind the actual detached merge and complete manifests");
  }

  #assertSameHeldOutPolicy(baseline: RunAggregateV1["certificates"][number], candidate: RunAggregateV1["certificates"][number]): void {
    if (!baseline.policy || !candidate.policy || baseline.policy.policyDigest !== candidate.policy.policyDigest || baseline.evaluatorId !== candidate.evaluatorId || baseline.parserVersion !== candidate.parserVersion || baseline.epochDigest !== candidate.epochDigest || baseline.contractDigest !== candidate.contractDigest || baseline.metric !== candidate.metric || baseline.unit !== candidate.unit || baseline.quantum !== candidate.quantum || baseline.trust !== candidate.trust || baseline.containmentCertificateDigest !== candidate.containmentCertificateDigest || baseline.heldOutIsolationCertificateDigest !== candidate.heldOutIsolationCertificateDigest || baseline.protectedManifestDigest !== candidate.protectedManifestDigest) throw new ArborError("EVIDENCE_INVALID", "Held-out baseline and candidate do not use the exact same evaluator, split, epoch, parser, configuration, environment, numeric, aggregation, containment, and trust policy");
  }

  #requireDriver(run: RunAggregateV1, context: CommandContextV1): void {
    if (!run.driver || run.driver.driverId !== context.driverId) throw new ArborError("LEASE_CONFLICT", "Command requires the admitted driver");
    if (run.driver.fence !== context.fence) throw new ArborError("STALE_FENCE", "Command fence is stale");
    if (Date.parse(run.driver.expiresAt) <= Date.parse(context.now)) throw new ArborError("LEASE_EXPIRED", "Driver lease expired");
  }

  #validateCommandEnvelope(command: ArborCommandV1): void {
    const metadata = command.metadata;
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(metadata.runId)) throw new ArborError("VALIDATION_FAILED", "Invalid run ID");
    if (!Number.isSafeInteger(metadata.expectedRevision) || metadata.expectedRevision < 0) throw new ArborError("VALIDATION_FAILED", "Invalid expected revision");
    if (!/^[A-Za-z0-9._~-]{16,128}$/.test(metadata.idempotencyKey)) throw new ArborError("VALIDATION_FAILED", "Invalid idempotency key");
    if (command.kind === "claimDriver" || command.kind === "heartbeat") {
      if (!Number.isSafeInteger(command.leaseMs) || command.leaseMs < 1000 || command.leaseMs > 300_000) throw new ArborError("VALIDATION_FAILED", "Lease duration must be 1000-300000 ms");
    }
    if (command.kind === "submitAgentObservation") {
      this.#validateChangedPaths(command.changedPaths);
      if (command.claimedMetric !== undefined) assertJsonSchema(this.schemas.schemas.decimal!, command.claimedMetric, "claimed metric");
      if (command.rawResultDigest !== undefined && !/^[0-9a-f]{64}$/.test(command.rawResultDigest)) throw new ArborError("VALIDATION_FAILED", "Invalid raw result digest");
      if (command.boundedOutput !== undefined && Buffer.byteLength(command.boundedOutput, "utf8") > 16_384) throw new ArborError("VALIDATION_FAILED", "Worker output preview exceeds 16 KiB");
    }
    if (command.kind === "attachAgentChild") {
      for (const digest of [command.workflowCorrelationDigest, command.requestDigest].filter((entry): entry is string => Boolean(entry))) if (!/^[0-9a-f]{64}$/.test(digest)) throw new ArborError("VALIDATION_FAILED", "Child correlation digest is invalid");
    }
    if (command.kind === "buildPromotionCandidate") {
      const oid = new RegExp(`^[0-9a-f]{${this.schemas.gitOidLength}}$`, "u");
      if (!oid.test(command.expectedResearchTrunkOid) || (command.role === "heldOutCandidate" && (!command.candidateId || !command.promotionId)) || (command.role === "heldOutBaseline" && (command.candidateId || command.promotionId))) throw new ArborError("VALIDATION_FAILED", "Detached merge command bindings are malformed");
    }
    if (command.kind === "reconcileEffect") {
      const observation = command.observation;
      if (!Number.isSafeInteger(observation.targetFence) || !Number.isSafeInteger(observation.observedFence) || !Number.isSafeInteger(observation.expectedRevision)) throw new ArborError("VALIDATION_FAILED", "Recovery counters must be safe integers");
      for (const digest of [observation.identityDigest, observation.observerDigest, observation.outcomeDigest, observation.rawResultDigest].filter((entry): entry is string => Boolean(entry))) if (!/^[0-9a-f]{64}$/.test(digest)) throw new ArborError("VALIDATION_FAILED", "Recovery digest is invalid");
      if (observation.changedPaths) this.#validateChangedPaths(observation.changedPaths);
      if (observation.reasons.length > 32 || observation.reasons.some((reason) => reason.length < 1 || reason.length > 4000)) throw new ArborError("VALIDATION_FAILED", "Recovery reasons exceed bounds");
      if (observation.boundedOutput && Buffer.byteLength(observation.boundedOutput, "utf8") > 16_384) throw new ArborError("VALIDATION_FAILED", "Recovered output preview exceeds 16 KiB");
    }
  }

  #validateChangedPaths(paths: readonly string[]): void {
    if (paths.length > 4096) throw new ArborError("VALIDATION_FAILED", "Too many changed paths");
    for (const path of paths) {
      if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === "" || part === "." || part === "..")) throw new ArborError("VALIDATION_FAILED", "Changed path is not a safe relative path");
    }
  }

  #mutation(kind: string, metadata: ArborCommandV1["metadata"], input: unknown): StoredMutationV1 {
    return { version: 1, kind, metadata, input: JSON.parse(canonicalJson(input)) };
  }

  #reportDependencies(run: RunAggregateV1, lifecycleState: RunAggregateV1["state"] = run.state): string[] {
    const evaluatorArtifacts = run.certificates.flatMap((certificate) => {
      const artifacts = (certificate as unknown as { artifacts?: Array<{ digest: string }> }).artifacts ?? [];
      return artifacts.map((entry) => entry.digest);
    });
    return [...new Set([
      run.contractDigest, run.epochDigest, digestCanonical({ runId: run.runId, state: lifecycleState, phase: run.phase, outcome: run.outcome ?? null }), ...(run.runtimeAdmission ? [run.runtimeAdmission.admissionDigest] : []),
      ...run.certificates.flatMap((entry) => [entry.outputDigest, digestCanonical(entry)]), ...evaluatorArtifacts,
      ...run.candidates.map((entry) => entry.manifestDigest), ...run.mergeConstructions.map((entry) => entry.manifestDigest),
      ...run.promotions.map((entry) => digestCanonical(entry)), ...run.authorizations.map((entry) => digestCanonical(entry)),
      ...run.effects.filter((entry) => entry.kind !== "report").map((entry) => digestCanonical(entry)),
      ...run.effectObservations.filter((entry) => run.effects.find((effect) => effect.effectId === entry.effectId)?.kind !== "report").map((entry) => digestCanonical(entry)),
      ...run.effectObservations.flatMap((entry) => entry.fingerprint ? [digestCanonical(entry.fingerprint)] : []),
      ...run.cleanup.map((entry) => digestCanonical(entry)),
    ])].sort();
  }

  #ensureTerminalReportDebt(decision: MutationDecisionV1, currentRevision: number, context: CommandContextV1): MutationDecisionV1 {
    const run = decision.aggregate;
    if (!["COMPLETED", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED", "ROLLED_BACK"].includes(run.state)) return decision;
    const dependencies = this.#reportDependencies(run);
    const covered = run.reports.some((entry) => ["PLANNED", "WRITING", "FILES_OBSERVED", "PUBLISHED"].includes(entry.state) && dependencies.every((digest) => entry.dependencyDigests.includes(digest)));
    if (covered) return decision;
    const terminal = run.state;
    assertTransition(RUN_TRANSITIONS, terminal, "REPORT_PENDING", "run"); run.state = "REPORT_PENDING";
    const generationId = this.#ids.next("report");
    const report: RunAggregateV1["reports"][number] = { version: 1, generationId, revision: currentRevision + 1, state: "PLANNED", dependencyDigests: dependencies };
    run.reports.push(report);
    run.effects.push(this.#createEffect("report", "report", "publishReport", `report_${generationId}`.padEnd(16, "_"), currentRevision, context, { generationId }));
    report.expectedManifestDigest = buildReportManifest(generationId, renderReportFiles(run, { generationId, publicationState: "PUBLISHED", finalRunState: terminal })).digest;
    run.yielded = true;
    return { ...decision, eventTypes: [...decision.eventTypes, "REPORT_PLANNED"], directive: { version: 1, kind: "publishReport", generationId } };
  }

  async #commit(kind: string, metadata: ArborCommandV1["metadata"], input: unknown, context: CommandContextV1, decide: Parameters<RunStore["commit"]>[3]): Promise<CommandReceiptV1> {
    return this.#store.commit(this.#mutation(kind, metadata, input), context, this.#ids.next("command"), (current) => {
      const decision = decide(current);
      return this.#ensureTerminalReportDebt(decision, current?.revision ?? -1, context);
    });
  }

  async #requiredRun(runId: string): Promise<RunAggregateV1> {
    const run = await this.#store.load(runId);
    if (!run) throw new ArborError("RUN_NOT_FOUND", "Run not found", { runId });
    return { ...run, effectObservations: run.effectObservations ?? [], agentChildren: run.agentChildren ?? [], budgetReservations: run.budgetReservations ?? [], mergeConstructions: run.mergeConstructions ?? [], promotions: run.promotions ?? [], authorizations: run.authorizations ?? [] };
  }
}
