import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ArborApplication } from "../../src/application/ArborApplication.js";
import { issueProductionAdmissionV1, productionAdapterIdentityDigestV1, productionConfigurationDigestV1, type ProductionApplicationBindingsV1 } from "../../src/application/ProductionAdmission.js";
import { FABRIC_PROVIDER_POLICY_TRAVERSAL_CAPABILITY_V1 } from "../../src/application/provider-capability.js";
import type { FabricPolicyTraversalAuthority } from "../../src/authorization/FabricPolicyTraversal.js";
import { LocalTtyAuthorizationCoordinator, OwnerOnlyEd25519KeyStore, TrustedPrincipalRegistry, createOwnerOnlyPrincipalFiles } from "../../src/authorization/TrustedPrincipal.js";
import type { EvaluationRequestV1, Evaluator } from "../../src/adapters/interfaces.js";
import type { ArborCommandV1, AuthorizationRecordV1, EvaluationCertificateV1, EvaluationPolicyBindingV1, MergeConstructionV1, RefObservationV1 } from "../../src/domain/types.js";
import { FixtureCleanupAdapter, FixtureEvaluator, FixtureWorkspaceManager, ScriptedFixtureAgent } from "../../src/fixtures/adapters.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import type { DetachedMergeRequestV1, PromotionGitIntegrator, WinnerRefMutationV1 } from "../../src/git/PromotionGitIntegrator.js";
import { InMemoryRunStore } from "../../src/persistence/InMemoryRunStore.js";
import { FileReportPublisher, renderReportFiles } from "../../src/reports/FileReportPublisher.js";
import { DeterministicIdFactory, ManualClock } from "../../src/util/clock.js";
import { digestCanonical, sha256 } from "../../src/util/canonical.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

const B8 = "8".repeat(64); const ZERO = "0".repeat(40);
type CommandWithoutMetadata = ArborCommandV1 extends infer Command ? Command extends { metadata: unknown } ? Omit<Command, "metadata"> : never : never;

class Phase5Git implements PromotionGitIntegrator {
  winner = ZERO; observable = true; mutations: WinnerRefMutationV1[] = [];
  winnerRef(runId: string): string { return `refs/pi-fabric-arbor/${runId}/winner`; }
  async buildDetached(request: DetachedMergeRequestV1): Promise<MergeConstructionV1> {
    const mergeCandidateOid = request.role === "heldOutBaseline" ? "1".repeat(40) : "2".repeat(40);
    const changedPaths = request.role === "heldOutBaseline" ? [] : ["src/solution.ts"];
    const requiredOutputs = [{ path: "src/solution.ts", digest: sha256(request.role), mode: "100644", type: "file" as const }];
    const protectedManifest: MergeConstructionV1["protectedManifest"] = [];
    const payload = { request, mergeCandidateOid, changedPaths, requiredOutputs, protectedManifest };
    return { version: 1, constructionId: `merge_${sha256(digestCanonical(payload)).slice(0, 32)}`, role: request.role, ...(request.candidateId ? { candidateId: request.candidateId } : {}), expectedResearchTrunkOid: request.expectedResearchTrunkOid, candidateOid: request.candidateOid, mergeCandidateOid, treeOid: "3".repeat(40), algorithmDigest: "4".repeat(64), diffEntries: [], changedPaths, requiredOutputs, requiredOutputsDigest: digestCanonical(requiredOutputs), protectedManifest, protectedManifestDigest: digestCanonical(protectedManifest), fullTreeManifestDigest: "5".repeat(64), beforeRefsDigest: "6".repeat(64), afterRefsDigest: "6".repeat(64), manifestDigest: digestCanonical(payload) };
  }
  async observeWinnerRef(runId: string): Promise<RefObservationV1> { const ref = this.winnerRef(runId); return this.observable ? { version: 1, observable: true, ref, actualOid: this.winner, observationDigest: digestCanonical({ ref, actualOid: this.winner }) } : { version: 1, observable: false, ref, observationDigest: digestCanonical({ ref, unobservable: true }) }; }
  async applyWinnerRef(request: WinnerRefMutationV1): Promise<void> { if (this.winner !== request.expectedOid) throw new Error("stale"); this.mutations.push(structuredClone(request)); this.winner = request.targetOid; }
}

class Phase5Evaluator implements Evaluator {
  readonly development: FixtureEvaluator;
  candidateValue = "1.2";
  disagree = false;
  constructor(ids: DeterministicIdFactory) { this.development = new FixtureEvaluator(ids); }
  async evaluate(request: EvaluationRequestV1): Promise<EvaluationCertificateV1> {
    if (!request.role.startsWith("heldOut")) return this.development.evaluate(request);
    const construction = request.mergeConstruction!; const trialOrder = [1];
    const policyPayload = { version: 1 as const, evaluatorVersion: "held-out-v1", split: "heldOut" as const, parserVersion: request.contract.evaluation.parserVersion, configurationDigest: this.disagree && request.role === "heldOutCandidate" ? "9".repeat(64) : "a".repeat(64), environmentDigest: "b".repeat(64), executableDigest: "c".repeat(64), quantum: request.contract.metric.quantum, trialCount: 1, seeds: [0], trialOrder, aggregation: "single" as const, nondeterminismTolerance: request.contract.metric.nondeterminismTolerance, containmentPolicyDigest: "d".repeat(64), containmentCertificateDigest: "e".repeat(64), heldOutIsolationCertificateDigest: B8, strictProtocol: true as const };
    const policy: EvaluationPolicyBindingV1 = { ...policyPayload, policyDigest: digestCanonical(policyPayload) }; const value = request.role === "heldOutBaseline" ? "1" : this.candidateValue; const aggregate = value === "1.2" ? "12" : value === "1.1" ? "11" : "10";
    const certificate = { version: 1 as const, certificateId: request.certificateId, evaluationId: request.evaluationId, runId: request.runId, epochDigest: request.epochDigest, contractDigest: request.contractDigest, role: request.role, oid: request.oid, evaluatorId: request.contract.evaluation.heldOut, parserVersion: request.contract.evaluation.parserVersion, metric: request.contract.metric.name, unit: request.contract.metric.unit, quantum: request.contract.metric.quantum, rawTrials: [value], quantizedUnits: [aggregate], aggregateUnits: aggregate, spreadUnits: "0", valid: true, outputDigest: digestCanonical({ request: request.evaluationId, value, policy }), trust: "certified" as const, policy, baseOid: construction.expectedResearchTrunkOid, candidateOid: construction.candidateOid, mergeCandidateOid: construction.mergeCandidateOid, requiredOutputsDigest: construction.requiredOutputsDigest, protectedManifestDigest: construction.protectedManifestDigest, containmentCertificateDigest: policy.containmentCertificateDigest, heldOutIsolationCertificateDigest: B8, strictProtocol: true as const };
    return certificate;
  }
}

async function setup() {
  const root = mkdtempSync(join(tmpdir(), "arbor-phase5-app-")); const store = new InMemoryRunStore(); const clock = new ManualClock(); const ids = new DeterministicIdFactory(); const git = new Phase5Git();
  const uid = process.getuid!(); const configuration = createOwnerOnlyPrincipalFiles({ configurationPath: join(root, "operator", "principals.json"), keyRoot: join(root, "operator-keys"), principalId: "principal_operator", osUid: uid, repositoryIds: ["repo_fixture"] });
  const registry = new TrustedPrincipalRegistry(configuration); mkdirSync(join(root, "reports"), { recursive: true, mode: 0o700 }); const keyStore = new OwnerOnlyEd25519KeyStore({ root: join(root, "operator-keys"), ownerUid: uid, browserReachableRoots: [join(root, "reports")] });
  const evaluator = new Phase5Evaluator(ids); const workspace = new FixtureWorkspaceManager(); const agent = new ScriptedFixtureAgent(["src/solution.ts"]); const reportPublisher = await FileReportPublisher.open(join(root, "reports", "run_phase5")); const cleanup = new FixtureCleanupAdapter();
  const application = new ArborApplication({ store, workspace, agent, evaluator, reportPublisher, cleanup, clock, ids, gitOidLength: 40, executionMode: "fixture", phase5: { git, authorization: registry, heldOutIsolationCertificateDigest: B8, challengeTtlMs: 60_000 } });
  let revision = 0; let serial = 0; const runId = "run_phase5"; const driverId = "driver_phase5"; let fence = 0;
  const execute = async (input: CommandWithoutMetadata) => { serial += 1; const command = { ...input, metadata: { runId, expectedRevision: revision, idempotencyKey: `phase5_command_${serial.toString().padStart(4, "0")}` } } as ArborCommandV1; const receipt = await application.execute(command, { ...(fence ? { driverId } : {}), fence, now: clock.now() }); revision = receipt.revision; return receipt; };
  const intent = async (value: Parameters<ArborApplication["submitIntent"]>[0]) => { serial += 1; const receipt = await application.submitIntent(value, { version: 1, sessionId: "session_phase5", runId, idempotencyKey: `phase5_intent_${serial.toString().padStart(4, "0")}`, csrfValidated: true, originValidated: true }); revision = receipt.revision; const processed = await execute({ version: 1, kind: "processIntent", intentId: receipt.intentId }); return processed; };
  const signLatest = async (kind: "promote" | "rollback") => { const run = (await store.load(runId))!; const challenge = run.authorizations.filter((entry) => entry.state === "CHALLENGE_ISSUED").at(-1)!; const terminal = { interactive: true, write() {}, async confirm() { return true; } }; const signed = await new LocalTtyAuthorizationCoordinator({ application, registry, keyStore, terminal, osIdentity: { uid: () => uid }, clock }).authorize(kind, challenge.challengeId); revision = (await store.load(runId))!.revision; return signed; };
  const claim = async () => { await execute({ version: 1, kind: "claimDriver", driverId, leaseMs: 300_000 }); fence = (await store.load(runId))!.driver!.fence; };
  const publishPendingReport = async () => { const report = (await store.load(runId))!.reports.find((entry) => entry.state === "PLANNED"); if (!report) throw new Error("missing automatic report debt"); await execute({ version: 1, kind: "publishReport", generationId: report.generationId }); await execute({ version: 1, kind: "observeReport", generationId: report.generationId }); };
  return { root, store, clock, ids, git, evaluator, registry, workspace, agent, reportPublisher, cleanup, application, execute, intent, signLatest, claim, publishPendingReport, runId, get revision() { return revision; } };
}

async function reachAwaitingPromotion(fixture: Awaited<ReturnType<typeof setup>>) {
  const baseContract = createFixtureContract();
  const contract = { ...baseContract, budgets: { ...baseContract.budgets, evaluatorRuns: 10, finalizationReserve: { ...baseContract.budgets.finalizationReserve, evaluatorRuns: 2 } } };
  await fixture.execute({ version: 1, kind: "start", contract }); await fixture.claim();
  await fixture.execute({ version: 1, kind: "advance" }); await fixture.execute({ version: 1, kind: "evaluate", role: "developmentBaseline", oid: contract.repository.initialOid });
  const built = await fixture.execute({ version: 1, kind: "buildPromotionCandidate", role: "heldOutBaseline", expectedResearchTrunkOid: contract.repository.initialOid });
  assert.equal(built.directive?.kind, "evaluateBaseline"); await fixture.execute({ version: 1, kind: "evaluate", role: "heldOutBaseline", oid: "1".repeat(40) }); await fixture.execute({ version: 1, kind: "advance" });
  await fixture.execute({ version: 1, kind: "proposeHypothesis", hypothesis: { version: 1, hypothesisId: "hypothesis_phase5", rationale: "improve", plan: ["edit"] } });
  await fixture.execute({ version: 1, kind: "selectHypothesis", hypothesisId: "hypothesis_phase5" });
  const reserved = await fixture.execute({ version: 1, kind: "reserveAgentDispatch", hypothesisId: "hypothesis_phase5" });
  if (reserved.directive?.kind !== "materializeWorkspace") throw new Error("missing workspace directive"); const attemptId = reserved.directive.attemptId;
  const materialized = await fixture.execute({ version: 1, kind: "materializeWorkspace", attemptId });
  if (materialized.directive?.kind !== "dispatchAgent") throw new Error("missing dispatch directive"); const dispatch = materialized.directive.dispatch;
  await fixture.execute({ version: 1, kind: "attachAgentChild", attemptId, childHandle: "A".repeat(32), dispatchKey: dispatch.dispatchKey });
  await fixture.execute({ version: 1, kind: "submitAgentObservation", attemptId, dispatchKey: dispatch.dispatchKey, changedPaths: ["src/solution.ts"], terminalStatus: "completed", rawResultDigest: "f".repeat(64) });
  const finalized = await fixture.execute({ version: 1, kind: "finalizeCandidate", attemptId });
  if (finalized.directive?.kind !== "evaluateCandidate") throw new Error("missing evaluation directive"); const candidateId = finalized.directive.candidateId; const candidateOid = finalized.directive.oid;
  await fixture.execute({ version: 1, kind: "evaluate", role: "developmentCandidate", oid: candidateOid, candidateId }); await fixture.execute({ version: 1, kind: "finalizeRun", outcome: "NO_PROMOTION" });
  return { contract, candidateId };
}

async function requestAndVerify(fixture: Awaited<ReturnType<typeof setup>>, candidateId: string) {
  const requested = await fixture.intent({ version: 1, kind: "requestPromotion", expectedRevision: fixture.revision, candidateId }); assert.equal(requested.directive?.kind, "buildPromotionCandidate");
  const promotionId = requested.directive!.kind === "buildPromotionCandidate" ? requested.directive.promotionId! : "";
  const trunkOid = (await fixture.store.load(fixture.runId))!.contract.repository.initialOid;
  await fixture.execute({ version: 1, kind: "buildPromotionCandidate", role: "heldOutCandidate", expectedResearchTrunkOid: trunkOid, candidateId, promotionId });
  await fixture.execute({ version: 1, kind: "evaluate", role: "heldOutCandidate", oid: "2".repeat(40), candidateId });
  return promotionId;
}

async function recomposeForRejectedProductionTraversal(fixture: Awaited<ReturnType<typeof setup>>): Promise<{ application: ArborApplication; revision: number; fence: number; driverId: string }> {
  const productionDispatch = { containmentId: "containment_certified", agentProfileId: "profile_certified", requestSchemaDigest: "a".repeat(64), resultSchemaDigest: "b".repeat(64), toolPolicyId: "policy_certified" };
  const configuration = { version: 1 as const, arborProjectRoot: fixture.root, piFabricPackageRoot: join(fixture.root, "pi-fabric"), hostPiFabricRoot: join(fixture.root, "host-pi-fabric"), repositoryRoot: join(fixture.root, "repository"), workspaceRoot: join(fixture.root, "workspaces"), reportRoot: join(fixture.root, "reports"), artifactRoot: join(fixture.root, "certification"), heldOutRoot: join(fixture.root, "held-out"), evaluatorExecutable: join(fixture.root, "evaluator"), gitOidLength: 40 as const };
  const bindings: ProductionApplicationBindingsV1 = { store: fixture.store, workspace: fixture.workspace, agent: fixture.agent, evaluator: fixture.evaluator, reportPublisher: fixture.reportPublisher, cleanup: fixture.cleanup, git: fixture.git, authorization: fixture.registry, heldOutIsolationCertificateDigest: B8, productionDispatch, configuration };
  const b9 = "9".repeat(64); const traversal: FabricPolicyTraversalAuthority = { boundary: "certified-production-host", b9CertificationDigest: b9, async authorize() { throw new Error("Fabric policy rejected the write"); } };
  const gateEvidenceDigests = Object.fromEntries(["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"].map((gate) => [gate, sha256(`production:${gate}`)]));
  const evidence = { version: 1 as const, mode: "production-certified" as const, admissionDigest: sha256("production-rejection-test"), configurationDigest: productionConfigurationDigestV1(bindings), packageInventoryDigest: sha256("inventory"), packagedDistDigest: sha256("dist"), arborSourceDigest: sha256("source"), piFabricPackageDigest: sha256("package"), hostPiFabricPackageDigest: sha256("host"), certificationArtifactDigest: sha256("artifacts"), piFabricVersion: "0.76.2" as const, certificateIds: ["phase7_graduation_v1", "distribution_phase6_v1", "approval_runtime_b9_v1"], certificateDigests: [sha256("phase7"), sha256("distribution"), b9], productionCertificateId: "phase7_graduation_v1", productionCertificateDigest: sha256("phase7"), productionCertificatePath: "phase7/graduation-certificate.v1.json", distributionCertificateId: "distribution_phase6_v1", distributionCertificateDigest: sha256("distribution"), distributionCertificatePath: "phase6/distribution-phase6.v1.json", adapterIdentityDigest: productionAdapterIdentityDigestV1(bindings), fabricApprovalRuntimeCertificateDigest: b9, fabricApprovalRuntimeCertificatePath: "phase6/approval-runtime-b9.v1.json", gateResults: Object.fromEntries(Object.keys(gateEvidenceDigests).map((gate) => [gate, "PASS" as const])), gateEvidenceDigests, blockers: [] };
  const admission = issueProductionAdmissionV1(bindings, evidence, traversal);
  const current = (await fixture.store.load(fixture.runId))!; const driverId = current.driver!.driverId; const fence = current.driver!.fence;
  const migrated = await fixture.store.commit({ version: 1, kind: "testAdmissionMigration", metadata: { runId: fixture.runId, expectedRevision: current.revision, idempotencyKey: "test_admission_migration" }, input: { admissionDigest: evidence.admissionDigest } }, { driverId, fence, now: fixture.clock.now() }, "command_test_admission_migration", (aggregate) => ({ aggregate: { ...aggregate!, runtimeAdmission: evidence }, eventTypes: ["TEST_ADMISSION_MIGRATED"] }));
  const application = new ArborApplication({ store: fixture.store, workspace: fixture.workspace, agent: fixture.agent, evaluator: fixture.evaluator, reportPublisher: fixture.reportPublisher, cleanup: fixture.cleanup, clock: fixture.clock, ids: fixture.ids, gitOidLength: 40, productionAdmission: admission, productionDispatch, phase5: { git: fixture.git, authorization: fixture.registry, heldOutIsolationCertificateDigest: B8, challengeTtlMs: 60_000 } });
  return { application, revision: migrated.revision, fence, driverId };
}

test("Fabric traversal is absent after planning and absence or rejection cannot mutate the winner ref", async () => {
  const fixture = await setup();
  try {
    const { candidateId } = await reachAwaitingPromotion(fixture); const promotionId = await requestAndVerify(fixture, candidateId); const authorization = await fixture.signLatest("promote");
    await fixture.execute({ version: 1, kind: "planPromotionCommit", promotionId, authorizationId: authorization.authorizationId });
    let run = (await fixture.store.load(fixture.runId))!; assert.equal(run.promotions.at(-1)!.fabricPolicyTraversal, undefined); assert.equal(fixture.git.mutations.length, 0);
    const production = await recomposeForRejectedProductionTraversal(fixture);
    const command = { version: 1 as const, kind: "applyWinnerRef" as const, metadata: { runId: fixture.runId, expectedRevision: production.revision, idempotencyKey: "production_apply_absent" }, promotionId };
    await assert.rejects(production.application.execute(command, { driverId: production.driverId, fence: production.fence, now: fixture.clock.now() }), /must traverse Fabric policy/u);
    assert.equal(fixture.git.mutations.length, 0);
    await assert.rejects(production.application.executeWithFabricPolicyTraversal({ ...command, metadata: { ...command.metadata, idempotencyKey: "production_apply_rejected" } }, { driverId: production.driverId, fence: production.fence, now: fixture.clock.now() }, { parentToolCallId: "parent.policy", nestedToolCallId: "nested.policy" }, FABRIC_PROVIDER_POLICY_TRAVERSAL_CAPABILITY_V1), /policy rejected/u);
    run = (await fixture.store.load(fixture.runId))!; assert.equal(run.promotions.at(-1)!.fabricPolicyTraversal, undefined); assert.equal(run.promotions.at(-1)!.state, "COMMIT_PLANNED"); assert.equal(fixture.git.mutations.length, 0);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("promotion, rollback, and re-promotion consume separate local authorizations and exact winner-ref CAS journals", async () => {
  const fixture = await setup();
  try {
    const { candidateId } = await reachAwaitingPromotion(fixture); const promotionId = await requestAndVerify(fixture, candidateId); const promotionAuth = await fixture.signLatest("promote");
    await fixture.execute({ version: 1, kind: "planPromotionCommit", promotionId, authorizationId: promotionAuth.authorizationId }); await fixture.execute({ version: 1, kind: "applyWinnerRef", promotionId }); await fixture.execute({ version: 1, kind: "observeWinnerRef", promotionId });
    let run = (await fixture.store.load(fixture.runId))!; assert.equal(run.state, "REPORT_PENDING"); assert.equal(run.outcome, "PROMOTED"); assert.equal(fixture.git.winner, "2".repeat(40));
    assert.equal(run.promotions.at(-1)!.fabricPolicyTraversal?.operationId, run.promotions.at(-1)!.effectId); assert.equal(run.promotions.at(-1)!.fabricPolicyTraversal?.boundary, "explicit-test-fixture");
    await fixture.publishPendingReport(); run = (await fixture.store.load(fixture.runId))!; assert.equal(run.state, "COMPLETED");
    const authorizationReport = JSON.parse(renderReportFiles(run)["authorization-records.v1.json"]!) as { packageAuthorizations: unknown[]; fabricPolicyTraversals: Array<{ operationId: string; boundary: string }> };
    assert.equal(authorizationReport.packageAuthorizations.length, 1); assert.deepEqual(authorizationReport.fabricPolicyTraversals.map((entry) => [entry.operationId, entry.boundary]), [[run.promotions[0]!.effectId, "explicit-test-fixture"]]);
    await fixture.intent({ version: 1, kind: "requestRollback", expectedRevision: fixture.revision, promotionId }); const rollbackAuth = await fixture.signLatest("rollback"); assert.notEqual(rollbackAuth.authorizationId, promotionAuth.authorizationId);
    await fixture.execute({ version: 1, kind: "planRollback", promotionId, authorizationId: rollbackAuth.authorizationId }); await fixture.execute({ version: 1, kind: "applyRollbackRef", promotionId }); await fixture.execute({ version: 1, kind: "observeRollbackRef", promotionId });
    run = (await fixture.store.load(fixture.runId))!; assert.equal(run.state, "REPORT_PENDING"); assert.equal(run.outcome, "ROLLED_BACK"); assert.equal(fixture.git.winner, ZERO);
    assert.equal(run.promotions.at(-1)!.rollbackFabricPolicyTraversal?.operationId, run.promotions.at(-1)!.rollbackEffectId);
    await fixture.publishPendingReport(); run = (await fixture.store.load(fixture.runId))!; assert.equal(run.state, "ROLLED_BACK");
    const rePromotionId = await requestAndVerify(fixture, candidateId); const rePromotionAuth = await fixture.signLatest("promote"); assert.notEqual(rePromotionAuth.authorizationId, promotionAuth.authorizationId); assert.notEqual(rePromotionId, promotionId);
    await assert.rejects(fixture.execute({ version: 1, kind: "planPromotionCommit", promotionId: rePromotionId, authorizationId: promotionAuth.authorizationId }), errorCode("EVIDENCE_INVALID"));
    await fixture.execute({ version: 1, kind: "planPromotionCommit", promotionId: rePromotionId, authorizationId: rePromotionAuth.authorizationId }); await fixture.execute({ version: 1, kind: "applyWinnerRef", promotionId: rePromotionId }); await fixture.execute({ version: 1, kind: "observeWinnerRef", promotionId: rePromotionId });
    run = (await fixture.store.load(fixture.runId))!; assert.equal(run.state, "REPORT_PENDING"); assert.equal(run.outcome, "PROMOTED"); assert.equal(fixture.git.mutations.length, 3); assert.equal(new Set(run.authorizations.map((entry) => entry.authorizationId)).size, 3);
    const policyTraversals = run.promotions.flatMap((entry) => [entry.fabricPolicyTraversal, entry.rollbackFabricPolicyTraversal].filter((value) => value !== undefined));
    assert.equal(policyTraversals.length, 3); assert.equal(new Set(policyTraversals.map((entry) => entry!.traversalDigest)).size, 3);
    const view = await fixture.application.query({ version: 1, kind: "promotion", runId: fixture.runId }, {}); assert.equal((view.data.promotions as unknown[]).length, 2); assert.equal(JSON.stringify(view).includes("nonce"), false);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("minimum-improvement equality promotes while tie and policy disagreement fail before ref mutation", async () => {
  const equality = await setup();
  try {
    const { candidateId } = await reachAwaitingPromotion(equality); equality.evaluator.candidateValue = "1.1"; const promotionId = await requestAndVerify(equality, candidateId); const authorization = await equality.signLatest("promote");
    await equality.execute({ version: 1, kind: "planPromotionCommit", promotionId, authorizationId: authorization.authorizationId }); await equality.execute({ version: 1, kind: "applyWinnerRef", promotionId }); await equality.execute({ version: 1, kind: "observeWinnerRef", promotionId });
    assert.equal((await equality.store.load(equality.runId))!.promotions.at(-1)!.state, "COMMITTED");
  } finally { rmSync(equality.root, { recursive: true, force: true }); }
  for (const scenario of ["tie", "disagreement"] as const) {
    const fixture = await setup();
    try {
      const { candidateId } = await reachAwaitingPromotion(fixture); if (scenario === "tie") fixture.evaluator.candidateValue = "1"; else fixture.evaluator.disagree = true;
      if (scenario === "tie") { await requestAndVerify(fixture, candidateId); assert.equal((await fixture.store.load(fixture.runId))!.promotions.at(-1)!.state, "REJECTED"); }
      else await assert.rejects(requestAndVerify(fixture, candidateId), errorCode("EVIDENCE_INVALID"));
      assert.equal(fixture.git.winner, ZERO); assert.equal(fixture.git.mutations.length, 0);
    } finally { rmSync(fixture.root, { recursive: true, force: true }); }
  }
});

test("held-out certification absence disables every promotion construction before any Git mutation", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const contract = createFixtureContract();
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId: "run_no_b8", expectedRevision: 0, idempotencyKey: "no_b8_start_0001" }, contract }, { fence: 0, now: fixture.clock.now() });
    await assert.rejects(fixture.application.execute({ version: 1, kind: "buildPromotionCandidate", metadata: { runId: "run_no_b8", expectedRevision: 1, idempotencyKey: "no_b8_build_0001" }, role: "heldOutBaseline", expectedResearchTrunkOid: contract.repository.initialOid }, { fence: 0, now: fixture.clock.now() }), errorCode("HELD_OUT_ISOLATION_REQUIRED"));
    assert.deepEqual((await fixture.store.load("run_no_b8"))!.promotions, []);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("expired authorization and unobservable post-CAS state never produce an unverified promotion", async () => {
  const expired = await setup();
  try {
    const { candidateId } = await reachAwaitingPromotion(expired); await requestAndVerify(expired, candidateId); const challenge = (await expired.store.load(expired.runId))!.authorizations.at(-1)!;
    expired.clock.advance(60_000); await assert.rejects(expired.signLatest("promote"), errorCode("EVIDENCE_INVALID")); assert.equal(expired.git.winner, ZERO); assert.equal(challenge.state, "CHALLENGE_ISSUED");
  } finally { rmSync(expired.root, { recursive: true, force: true }); }
  const uncertain = await setup();
  try {
    const { candidateId } = await reachAwaitingPromotion(uncertain); const promotionId = await requestAndVerify(uncertain, candidateId); const authorization = await uncertain.signLatest("promote");
    await uncertain.execute({ version: 1, kind: "planPromotionCommit", promotionId, authorizationId: authorization.authorizationId }); uncertain.git.observable = false; await uncertain.execute({ version: 1, kind: "applyWinnerRef", promotionId }); await uncertain.execute({ version: 1, kind: "observeWinnerRef", promotionId });
    const run = (await uncertain.store.load(uncertain.runId))!; assert.equal(run.state, "REPORT_PENDING"); assert.equal(run.outcome, "QUARANTINED"); assert.equal(run.reports.at(-1)?.state, "PLANNED"); assert.equal(uncertain.git.winner, ZERO);
  } finally { rmSync(uncertain.root, { recursive: true, force: true }); }
});
