import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { ReportPublicationObservationV1, ReportPublisher } from "../adapters/interfaces.js";
import { ArborError } from "../domain/errors.js";
import type { FabricPolicyTraversalProofV1, RunAggregateV1, Sha256 } from "../domain/types.js";
import { RETENTION_CLASSES_V1, RETENTION_POLICY_DIGEST_V1 } from "../retention/policy.js";
import { canonicalJson, sha256 } from "../util/canonical.js";
import { assertNoRawPathOrSecret } from "../web/redaction.js";

const FILE_NAME = /^(?:REPORT\.md|manifest\.v1\.json|contract\.v1\.json|run-summary\.v1\.json|artifact-index\.v1\.json|promotion-journals\.v1\.json|authorization-records\.v1\.json|cleanup-manifest\.v1\.json|retention-policy\.v1\.json|evaluation-certificates\/index\.v1\.json|fingerprint-certificates\/index\.v1\.json|arbor-compatibility\/status\.v1\.json)$/u;
const MAX_FILES = 32;
const MAX_FILE_BYTES = 1024 * 1024;

export interface ReportManifestV1 {
  version: 1;
  generationId: string;
  files: Array<{ name: string; digest: Sha256; bytes: number }>;
}

function validateFileName(name: string): void {
  if (!FILE_NAME.test(name) || name.includes("..") || name.startsWith("/")) throw new ArborError("VALIDATION_FAILED", "Report file name is not admitted", { name });
}

export function buildReportManifest(generationId: string, files: Readonly<Record<string, string>>): { manifest: ReportManifestV1; json: string; digest: Sha256 } {
  if (!/^[a-z][a-z0-9_]{2,63}$/u.test(generationId)) throw new ArborError("VALIDATION_FAILED", "Invalid report generation ID");
  const entries = Object.entries(files);
  if (entries.length < 1 || entries.length > MAX_FILES) throw new ArborError("VALIDATION_FAILED", "Report file count is outside the release bound");
  const manifest: ReportManifestV1 = {
    version: 1,
    generationId,
    files: entries.sort(([left], [right]) => left.localeCompare(right)).map(([name, body]) => {
      validateFileName(name); const bytes = Buffer.byteLength(body, "utf8");
      if (bytes > MAX_FILE_BYTES) throw new ArborError("VALIDATION_FAILED", "Report file exceeds 1 MiB", { name });
      return { name, digest: sha256(body), bytes };
    }),
  };
  const json = canonicalJson(manifest);
  return { manifest, json, digest: sha256(json) };
}

export interface ReportRenderOptionsV1 {
  generationId?: string;
  publicationState?: RunAggregateV1["reports"][number]["state"];
  finalRunState?: RunAggregateV1["state"];
}

function projectedTerminalState(run: RunAggregateV1): RunAggregateV1["state"] {
  if (run.state !== "REPORT_PENDING") return run.state;
  if (run.outcome === "ROLLED_BACK") return "ROLLED_BACK";
  if (run.outcome === "CANCELLED") return "CANCELLED";
  if (run.outcome === "FAILED") return "FAILED";
  if (run.outcome === "INDETERMINATE") return "INDETERMINATE";
  if (run.outcome === "QUARANTINED") return "QUARANTINED";
  return "COMPLETED";
}

/** Strict, allowlisted report projection. Mutable secrets and host paths are never copied. */
export function renderReportFiles(run: RunAggregateV1, options: ReportRenderOptionsV1 = {}): Readonly<Record<string, string>> {
  const generation = options.generationId ? run.reports.find((entry) => entry.generationId === options.generationId) : run.reports.at(-1);
  const publicationState = options.publicationState ?? (generation?.state === "PLANNED" ? "PUBLISHED" : generation?.state) ?? "PLANNED";
  const finalRunState = options.finalRunState ?? projectedTerminalState(run);
  const admission = run.runtimeAdmission ?? { version: 1 as const, mode: "production-blocked" as const, admissionDigest: sha256("legacy-production-admission-absent"), configurationDigest: sha256("legacy-production-admission-absent"), packageInventoryDigest: sha256("legacy-production-admission-absent"), packagedDistDigest: sha256("legacy-production-admission-absent"), arborSourceDigest: sha256("legacy-production-admission-absent"), piFabricPackageDigest: sha256("legacy-production-admission-absent"), hostPiFabricPackageDigest: sha256("legacy-production-admission-absent"), certificationArtifactDigest: sha256("legacy-production-admission-absent"), piFabricVersion: "unavailable" as const, certificateIds: [], certificateDigests: [], gateResults: {}, gateEvidenceDigests: {}, blockers: ["legacy aggregate has no runtime admission evidence"] };
  const certificates = run.certificates.map((certificate) => ({
    certificateId: certificate.certificateId, evaluationId: certificate.evaluationId, outputDigest: certificate.outputDigest,
    role: certificate.role, oid: certificate.oid, baseOid: certificate.baseOid ?? null, candidateOid: certificate.candidateOid ?? null,
    mergeCandidateOid: certificate.mergeCandidateOid ?? null, metric: certificate.metric, unit: certificate.unit, quantum: certificate.quantum,
    rawTrials: certificate.rawTrials, quantizedUnits: certificate.quantizedUnits, aggregateUnits: certificate.aggregateUnits, spreadUnits: certificate.spreadUnits,
    valid: certificate.valid, rejectionReason: certificate.rejectionReason ?? null, trust: certificate.trust,
    policyDigest: certificate.policy?.policyDigest ?? null, containmentCertificateDigest: certificate.containmentCertificateDigest ?? null,
    heldOutIsolationCertificateDigest: certificate.heldOutIsolationCertificateDigest ?? null, requiredOutputsDigest: certificate.requiredOutputsDigest ?? null,
    protectedManifestDigest: certificate.protectedManifestDigest ?? null,
    artifacts: (certificate as unknown as { artifacts?: Array<{ artifactId: string; digest: string }> }).artifacts ?? [],
    logs: (certificate as unknown as { logs?: Array<{ stdoutDigest: string; stderrDigest: string; stdoutBytes: number; stderrBytes: number }> }).logs ?? [],
  }));
  const fingerprints = run.effectObservations.flatMap((observation) => observation.fingerprint ? [{ observationId: observation.observationId, classification: observation.classification, version: observation.fingerprint.version, certificateId: observation.fingerprint.certificateId, beforeDigest: observation.fingerprint.beforeDigest, afterDigest: observation.fingerprint.afterDigest, equal: observation.fingerprint.equal, effectId: observation.fingerprint.effectId, fence: observation.fingerprint.fence, containmentId: observation.fingerprint.containmentId, reportGenerationId: observation.fingerprint.reportGenerationId, certificateDigest: digestForReport(observation.fingerprint) }] : []);
  const policyTraversals = run.promotions.flatMap((promotion) => [
    ...(promotion.fabricPolicyTraversal ? [projectPolicyTraversal("promote", promotion.fabricPolicyTraversal)] : []),
    ...(promotion.rollbackFabricPolicyTraversal ? [projectPolicyTraversal("rollback", promotion.rollbackFabricPolicyTraversal)] : []),
  ]);
  const effects = run.effects.filter((effect) => effect.kind !== "report").map((effect) => ({ effectId: effect.effectId, kind: effect.kind, state: effect.state, boundary: effect.identity.boundary, action: effect.identity.action, intentDigest: effect.identity.intentDigest, acceptedOutcomeDigest: effect.acceptedOutcomeDigest ?? null, latestObservationId: effect.latestObservationId ?? null, containmentId: effect.identity.containmentId ?? null }));
  const evidenceArtifacts: Array<Record<string, unknown>> = [
    ...[...new Set(generation?.dependencyDigests ?? [])].map((digest) => ({ artifactId: `evidence_dependency_${digest.slice(0, 24)}`, kind: "frozen-report-dependency", sourceId: generation?.generationId ?? run.runId, digest })),
    { artifactId: `evidence_contract_${run.contractDigest.slice(0, 24)}`, kind: "contract", sourceId: run.runId, digest: run.contractDigest },
    { artifactId: `evidence_epoch_${run.epochDigest.slice(0, 24)}`, kind: "epoch", sourceId: run.runId, digest: run.epochDigest },
    ...certificates.map((entry) => ({ artifactId: `evidence_score_${entry.outputDigest.slice(0, 24)}`, kind: "evaluation-certificate", sourceId: entry.certificateId, digest: entry.outputDigest, traceIds: [entry.evaluationId] })),
    ...certificates.flatMap((entry) => entry.artifacts.map((artifact) => ({ artifactId: artifact.artifactId, kind: "evaluator-artifact", sourceId: entry.certificateId, digest: artifact.digest, traceIds: [entry.evaluationId] }))),
    ...certificates.flatMap((entry) => entry.logs.flatMap((log, index) => [{ artifactId: `evidence_stdout_${sha256(`${entry.certificateId}:${index}`).slice(0, 24)}`, kind: "evaluator-stdout-digest", sourceId: entry.certificateId, digest: log.stdoutDigest, bytes: log.stdoutBytes }, { artifactId: `evidence_stderr_${sha256(`${entry.certificateId}:${index}`).slice(0, 24)}`, kind: "evaluator-stderr-digest", sourceId: entry.certificateId, digest: log.stderrDigest, bytes: log.stderrBytes }])),
    ...run.candidates.map((entry) => ({ artifactId: `evidence_candidate_${entry.manifestDigest.slice(0, 24)}`, kind: "candidate-manifest", sourceId: entry.candidateId, digest: entry.manifestDigest, traceIds: [entry.attemptId, entry.hypothesisId], oid: entry.candidateOid })),
    ...run.mergeConstructions.map((entry) => ({ artifactId: `evidence_merge_${entry.manifestDigest.slice(0, 24)}`, kind: "merge-manifest", sourceId: entry.constructionId, digest: entry.manifestDigest, oid: entry.mergeCandidateOid })),
    ...run.authorizations.map((entry) => ({ artifactId: `evidence_authorization_${digestForReport(entry).slice(0, 24)}`, kind: "package-authorization", sourceId: entry.authorizationId, digest: digestForReport(entry), traceIds: [entry.payload.promotionId, entry.payload.candidateId] })),
    ...policyTraversals.map((entry) => ({ artifactId: `evidence_policy_${entry.traversalDigest.slice(0, 24)}`, kind: "fabric-policy-traversal", sourceId: entry.operationId, digest: entry.traversalDigest, traceIds: [entry.parentToolCallId, entry.nestedToolCallId, entry.authorizationId, entry.promotionId, entry.candidateId] })),
    ...effects.map((entry) => ({ artifactId: `evidence_effect_${entry.intentDigest.slice(0, 24)}`, kind: "effect", sourceId: entry.effectId, digest: entry.acceptedOutcomeDigest ?? entry.intentDigest, traceIds: [entry.latestObservationId].filter(Boolean) })),
    ...run.cleanup.map((entry) => ({ artifactId: `evidence_cleanup_${digestForReport(entry).slice(0, 24)}`, kind: "cleanup-obligation", sourceId: entry.cleanupId, digest: digestForReport(entry), traceIds: [entry.resourceId] })),
  ];
  const promotionJournals = run.promotions.map((entry) => ({
    version: entry.version, promotionId: entry.promotionId, state: entry.state, candidateId: entry.candidateId, candidateOid: entry.candidateOid,
    expectedResearchTrunkOid: entry.expectedResearchTrunkOid, mergeCandidateOid: entry.mergeCandidateOid ?? null, mergeConstructionId: entry.mergeConstructionId ?? null,
    heldOutCertificateId: entry.heldOutCertificateId ?? null, heldOutCertificateDigest: entry.heldOutCertificateDigest ?? null,
    winnerRef: entry.winnerRef, expectedCurrentOid: entry.expectedCurrentOid ?? null, predecessorOid: entry.predecessorOid ?? null,
    authorizationId: entry.authorizationId ?? null, authorizationDigest: entry.authorizationDigest ?? null, fabricPolicyTraversalDigest: entry.fabricPolicyTraversalDigest ?? null,
    effectId: entry.effectId ?? null, observedOid: entry.observedOid ?? null, observationDigest: entry.observationDigest ?? null, committedAt: entry.committedAt ?? null,
    rollbackAuthorizationId: entry.rollbackAuthorizationId ?? null, rollbackAuthorizationDigest: entry.rollbackAuthorizationDigest ?? null, rollbackFabricPolicyTraversalDigest: entry.rollbackFabricPolicyTraversalDigest ?? null,
    rollbackEffectId: entry.rollbackEffectId ?? null, rollbackObservedOid: entry.rollbackObservedOid ?? null, rolledBackAt: entry.rolledBackAt ?? null,
  }));
  const mergeJournals = run.mergeConstructions.map((entry) => ({ version: entry.version, constructionId: entry.constructionId, role: entry.role, candidateId: entry.candidateId ?? null, expectedResearchTrunkOid: entry.expectedResearchTrunkOid, candidateOid: entry.candidateOid, mergeCandidateOid: entry.mergeCandidateOid, treeOid: entry.treeOid, algorithmDigest: entry.algorithmDigest, diffEntries: entry.diffEntries, changedPaths: entry.changedPaths, requiredOutputs: entry.requiredOutputs, requiredOutputsDigest: entry.requiredOutputsDigest, protectedManifestDigest: entry.protectedManifestDigest, fullTreeManifestDigest: entry.fullTreeManifestDigest, beforeRefsDigest: entry.beforeRefsDigest, afterRefsDigest: entry.afterRefsDigest, manifestDigest: entry.manifestDigest }));
  const cleanupObligations = run.cleanup.map((entry) => ({ version: entry.version, cleanupId: entry.cleanupId, resourceId: entry.resourceId, resourceKind: entry.resourceKind, state: entry.state, reportDependencyDigests: entry.reportDependencyDigests }));
  const packageAuthorizations = run.authorizations.map((authorization) => ({ version: 1, authorizationId: authorization.authorizationId, challengeId: authorization.challengeId, kind: authorization.payload.kind, runId: authorization.payload.runId, repositoryId: authorization.payload.repositoryId, promotionId: authorization.payload.promotionId, candidateId: authorization.payload.candidateId, candidateOid: authorization.payload.candidateOid, mergeCandidateOid: authorization.payload.mergeCandidateOid, heldOutCertificateDigest: authorization.payload.heldOutCertificateDigest, contractDigest: authorization.payload.contractDigest, winnerRef: authorization.payload.winnerRef, expectedCurrentOid: authorization.payload.expectedCurrentOid, predecessorOid: authorization.payload.predecessorOid, expiresAt: authorization.payload.expiresAt, challengeDigest: authorization.challengeDigest, nonceDigest: authorization.nonceDigest, principalId: authorization.principalId, keyId: authorization.keyId, state: authorization.state, consumedById: authorization.consumedById ?? null, issuedAt: authorization.issuedAt ?? null }));
  const trust = admission.mode === "production-certified" && certificates.every((certificate) => certificate.valid && certificate.trust === "certified") ? "production-certificate-bound" : admission.mode === "fixture" ? "explicit-test-fixture" : "production-blocked";
  const summary = { version: 1, runId: run.runId, state: finalRunState, phase: run.phase, outcome: run.outcome ?? "pending", contractDigest: run.contractDigest, epochDigest: run.epochDigest, trust, publication: { generationId: generation?.generationId ?? "not-planned", frozenRevision: generation?.revision ?? run.revision, state: publicationState, observation: publicationState === "PUBLISHED" ? "complete generation manifest must be observed before this projection is authoritative" : "not-published" }, admission: { mode: admission.mode, admissionDigest: admission.admissionDigest, configurationDigest: admission.configurationDigest, packageInventoryDigest: admission.packageInventoryDigest, packagedDistDigest: admission.packagedDistDigest, arborSourceDigest: admission.arborSourceDigest, piFabricPackageDigest: admission.piFabricPackageDigest, hostPiFabricPackageDigest: admission.hostPiFabricPackageDigest, certificationArtifactDigest: admission.certificationArtifactDigest, piFabricVersion: admission.piFabricVersion, certificateIds: admission.certificateIds, certificateDigests: admission.certificateDigests, productionCertificateId: admission.productionCertificateId ?? null, productionCertificateDigest: admission.productionCertificateDigest ?? null, productionCertificatePath: admission.productionCertificatePath ?? null, distributionCertificateId: admission.distributionCertificateId ?? null, distributionCertificateDigest: admission.distributionCertificateDigest ?? null, distributionCertificatePath: admission.distributionCertificatePath ?? null, adapterIdentityDigest: admission.adapterIdentityDigest ?? null, fabricApprovalRuntimeCertificateDigest: admission.fabricApprovalRuntimeCertificateDigest ?? null, fabricApprovalRuntimeCertificatePath: admission.fabricApprovalRuntimeCertificatePath ?? null, gateResults: admission.gateResults, gateEvidenceDigests: admission.gateEvidenceDigests, blockers: admission.blockers }, baselines: { developmentCertificateId: run.developmentBaselineCertificateId ?? null, heldOutCertificateId: run.heldOutBaselineCertificateId ?? null, heldOutConstructionId: run.heldOutBaselineConstructionId ?? null }, bestCandidateId: run.bestCandidateId ?? null, cleanupDebt: run.cleanup.filter((entry) => entry.state !== "COMPLETED").length };
  const markdown = [
    `# Arbor run ${run.runId}`, "", `- State: ${finalRunState}`, `- Phase: ${run.phase}`, `- Outcome: ${run.outcome ?? "pending"}`,
    `- Frozen revision: ${generation?.revision ?? run.revision}`, `- Report publication: ${publicationState}`, `- Contract digest: ${run.contractDigest}`, `- Epoch digest: ${run.epochDigest}`, `- Trust: ${trust}`, `- Runtime admission: ${admission.mode} (${admission.admissionDigest})`, "",
    "## Baselines, candidates, and canonical metrics", `- Development baseline: ${run.developmentBaselineCertificateId ?? "missing"}`, `- Held-out baseline: ${run.heldOutBaselineCertificateId ?? "missing"}`, `- Best candidate: ${run.bestCandidateId ?? "none"}`,
    ...certificates.map((entry) => `- ${entry.certificateId} (${entry.outputDigest}): ${entry.aggregateUnits} ${entry.quantum}-quantum units, spread ${entry.spreadUnits}, ${entry.valid ? "valid" : "invalid"}, ${entry.trust}`), "", "Worker claims are informational and are never canonical scores.",
    ...run.workerClaims.map((entry) => `- ${entry.attemptId}: claim ${entry.claimedMetric ?? "none"}; canonical certificate ${run.candidates.find((candidate) => candidate.attemptId === entry.attemptId)?.candidateId ?? "absent"}`), "",
    "## Lineage, retries, interruptions, pruning, and lessons", ...run.hypotheses.map((entry) => `- ${entry.hypothesisId} (${entry.state}), parent ${entry.parentHypothesisId ?? "root"}, attempts ${entry.attemptIds.join(", ") || "none"}, lessons ${entry.lessons.join(" | ") || "none"}`), ...run.attempts.map((entry) => `- ${entry.attemptId} (${entry.state}), retry ${entry.retryOfAttemptId ?? "none"}, candidate ${entry.candidateId ?? "none"}`), "",
    "## Promotion, rollback, and re-promotion", ...run.promotions.map((entry) => `- ${entry.promotionId} (${entry.state}): candidate ${entry.candidateId}/${entry.candidateOid}; merge ${entry.mergeCandidateOid ?? "missing"}; winner ${entry.observedOid ?? "unobserved"}; predecessor ${entry.predecessorOid ?? "unobserved"}; rollback ${entry.rollbackObservedOid ?? "unobserved"}; authorization ${entry.authorizationId ?? "missing"}; policy traversal ${entry.fabricPolicyTraversalDigest ?? "missing"}`), "- Every rollback and re-promotion requires fresh package authorization and separately retained Fabric policy evidence.", "",
    "## Budgets and reserve", `- Attempts: ${run.attempts.length}/${run.contract.budgets.maxAttempts}`, `- Agent calls: ${run.dispatchIntents.length}/${run.contract.budgets.maxAgentCalls}`, `- Evaluations: ${run.certificates.length}/${run.contract.budgets.evaluatorRuns}`, `- Finalization reserve digest: ${digestForReport(run.contract.budgets.finalizationReserve)}`, "",
    "## Effects, gates, report, and cleanup", `- Effects traced: ${effects.length}`, `- Gates: ${run.gates.length}`, `- Fingerprint certificates: ${fingerprints.length}`, `- Evidence artifacts: ${evidenceArtifacts.length}`, `- Cleanup obligations: ${run.cleanup.length}; debt ${summary.cleanupDebt}`, "",
    "Authorization nonces and signatures, signing keys, raw host paths, environments, internal handles, leases, fences, prompts, and secrets are intentionally absent.",
  ].join("\n");
  const contract = {
    version: run.contract.version, objective: run.contract.objective,
    repository: { repositoryId: run.contract.repository.repositoryId, initialOid: run.contract.repository.initialOid, dirtyPolicy: run.contract.repository.dirtyPolicy },
    metric: { name: run.contract.metric.name, direction: run.contract.metric.direction, unit: run.contract.metric.unit, quantum: run.contract.metric.quantum, minimumImprovement: run.contract.metric.minimumImprovement, trialCount: run.contract.metric.trialCount, aggregation: run.contract.metric.aggregation, nondeterminismTolerance: run.contract.metric.nondeterminismTolerance },
    evaluation: { development: run.contract.evaluation.development, heldOut: run.contract.evaluation.heldOut, parserVersion: run.contract.evaluation.parserVersion, invalidTrialPolicy: run.contract.evaluation.invalidTrialPolicy }, paths: { editable: [...run.contract.paths.editable], protected: [...run.contract.paths.protected], requiredOutputs: [...run.contract.paths.requiredOutputs] },
    permissions: { tools: [...run.contract.permissions.tools], network: run.contract.permissions.network, packageInstallation: run.contract.permissions.packageInstallation, processExecution: run.contract.permissions.processExecution },
    budgets: { maxHypotheses: run.contract.budgets.maxHypotheses, maxAttempts: run.contract.budgets.maxAttempts, maxConcurrentAttempts: run.contract.budgets.maxConcurrentAttempts, maxRetriesPerHypothesis: run.contract.budgets.maxRetriesPerHypothesis, maxCycles: run.contract.budgets.maxCycles, wallTimeMs: run.contract.budgets.wallTimeMs, maxAgentCalls: run.contract.budgets.maxAgentCalls, ...(run.contract.budgets.tokenLimit === undefined ? {} : { tokenLimit: run.contract.budgets.tokenLimit }), ...(run.contract.budgets.costLimit === undefined ? {} : { costLimit: run.contract.budgets.costLimit }), evaluatorRuns: run.contract.budgets.evaluatorRuns, finalizationReserve: { attempts: run.contract.budgets.finalizationReserve.attempts, agentCalls: run.contract.budgets.finalizationReserve.agentCalls, evaluatorRuns: run.contract.budgets.finalizationReserve.evaluatorRuns, wallTimeMs: run.contract.budgets.finalizationReserve.wallTimeMs, ...(run.contract.budgets.finalizationReserve.tokens === undefined ? {} : { tokens: run.contract.budgets.finalizationReserve.tokens }), ...(run.contract.budgets.finalizationReserve.cost === undefined ? {} : { cost: run.contract.budgets.finalizationReserve.cost }) } },
    gates: { beforeDispatch: run.contract.gates.beforeDispatch, beforePromotion: run.contract.gates.beforePromotion, timeout: run.contract.gates.timeout }, promotion: { mode: run.contract.promotion.mode }, retentionClass: run.contract.retentionClass,
  };
  const files: Record<string, string> = {
    "REPORT.md": markdown,
    "contract.v1.json": canonicalJson(contract),
    "run-summary.v1.json": canonicalJson(summary),
    "evaluation-certificates/index.v1.json": canonicalJson({ version: 1, certificates }),
    "fingerprint-certificates/index.v1.json": canonicalJson({ version: 1, certificateBindings: fingerprints, status: fingerprints.length ? "boundary-bindings-recorded" : "no-boundary-binding-recorded" }),
    "promotion-journals.v1.json": canonicalJson({ version: 1, mergeConstructions: mergeJournals, promotions: promotionJournals, fabricPolicyTraversals: policyTraversals }),
    "authorization-records.v1.json": canonicalJson({ version: 1, packageAuthorizations, fabricPolicyTraversals: policyTraversals }),
    "artifact-index.v1.json": canonicalJson({ version: 1, artifacts: evidenceArtifacts, count: evidenceArtifacts.length }),
    "cleanup-manifest.v1.json": canonicalJson({ version: 1, obligations: cleanupObligations, unsettledEffectIds: effects.filter((entry) => !["COMMITTED", "FAILED_ABSENT", "FAILED", "CANCELLED_CONFIRMED"].includes(entry.state)).map((entry) => entry.effectId), deletionMode: "manifest-driven-idempotent-only" }),
    "retention-policy.v1.json": canonicalJson({ version: 1, selectedClass: run.contract.retentionClass, policyDigest: RETENTION_POLICY_DIGEST_V1, policy: RETENTION_CLASSES_V1.find((entry) => entry.retentionClassId === run.contract.retentionClass) ?? null, legalHoldRule: "Any legal hold overrides deletion eligibility." }),
    "arbor-compatibility/status.v1.json": canonicalJson({ version: 1, supported: admission.mode === "production-certified", admission: summary.admission }),
  };
  for (const [name, body] of Object.entries(files)) { validateFileName(name); assertNoRawPathOrSecret(body); if (Buffer.byteLength(body, "utf8") > MAX_FILE_BYTES) throw new ArborError("VALIDATION_FAILED", "Report file exceeds 1 MiB", { name }); }
  return Object.freeze(files);
}

function digestForReport(value: unknown): string { return sha256(canonicalJson(value)); }
function projectPolicyTraversal(kind: "promote" | "rollback", proof: FabricPolicyTraversalProofV1): FabricPolicyTraversalProofV1 & { kind: "promote" | "rollback" } {
  return { kind, ...proof };
}

export class FileReportPublisher implements ReportPublisher {
  #root: string;
  #generations: string;
  #current: string;

  private constructor(root: string) { this.#root = root; this.#generations = join(root, "generations"); this.#current = join(root, "current"); }

  static async open(root: string): Promise<FileReportPublisher> {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const canonicalRoot = await realpath(root); const stat = await lstat(canonicalRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ArborError("VALIDATION_FAILED", "Report root is invalid");
    const publisher = new FileReportPublisher(canonicalRoot);
    await mkdir(publisher.#generations, { recursive: true, mode: 0o700 });
    await publisher.#assertDirectory(publisher.#generations);
    return publisher;
  }

  async publish(generationId: string, inputFiles: Readonly<Record<string, string>>, expectedManifestDigest?: Sha256): Promise<ReportPublicationObservationV1> {
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(generationId)) throw new ArborError("VALIDATION_FAILED", "Invalid report generation ID");
    const files = Object.fromEntries(Object.entries(inputFiles).map(([name, body]) => { validateFileName(name); assertNoRawPathOrSecret(body); return [name, body]; }));
    const built = buildReportManifest(generationId, files);
    if (expectedManifestDigest !== undefined && expectedManifestDigest !== built.digest) return { version: 1, generationId, classification: "conflict", manifestDigest: built.digest };
    const final = join(this.#generations, generationId); const existing = await this.observe(generationId, expectedManifestDigest ?? built.digest);
    if (["complete", "conflict", "uncertain"].includes(existing.classification)) return existing;
    const temporary = join(this.#generations, `.tmp_${generationId}`); this.#assertContained(temporary);
    if (existing.classification === "partial") await rm(temporary, { recursive: true, force: true });
    await mkdir(temporary, { mode: 0o700 });
    for (const [name, body] of Object.entries(files)) { const path = join(temporary, name); this.#assertContained(path); await mkdir(dirname(path), { recursive: true, mode: 0o700 }); await this.#writeSynced(path, body); }
    await this.#writeSynced(join(temporary, "manifest.v1.json"), built.json);
    const temporaryHandle = await open(temporary, constants.O_RDONLY | constants.O_DIRECTORY);
    try { await temporaryHandle.sync(); } finally { await temporaryHandle.close(); }
    try { await rename(temporary, final); }
    catch { const raced = await this.observe(generationId, built.digest); if (raced.classification !== "complete") return raced; }
    const pointerTemporary = `${this.#current}.tmp_${generationId}`; await rm(pointerTemporary, { force: true }); await this.#writeSynced(pointerTemporary, `${generationId}\n`); await rename(pointerTemporary, this.#current);
    const generationHandle = await open(this.#generations, constants.O_RDONLY | constants.O_DIRECTORY);
    try { await generationHandle.sync(); } finally { await generationHandle.close(); }
    return { version: 1, generationId, classification: "complete", manifestDigest: built.digest };
  }

  async observe(generationId: string, expectedManifestDigest?: Sha256): Promise<ReportPublicationObservationV1> {
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(generationId)) throw new ArborError("VALIDATION_FAILED", "Invalid report generation ID");
    const final = join(this.#generations, generationId); const temporary = join(this.#generations, `.tmp_${generationId}`); this.#assertContained(final);
    try {
      await this.#assertDirectory(final);
      const manifestPath = join(final, "manifest.v1.json"); const manifestJson = await this.#readRegular(manifestPath, MAX_FILE_BYTES); const digest = sha256(manifestJson);
      const manifest = JSON.parse(manifestJson.toString("utf8")) as ReportManifestV1;
      if (Object.keys(manifest as unknown as Record<string, unknown>).sort().join("\0") !== ["files", "generationId", "version"].sort().join("\0") || manifest.version !== 1 || manifest.generationId !== generationId || !Array.isArray(manifest.files) || manifest.files.length < 1 || manifest.files.length > MAX_FILES) return { version: 1, generationId, classification: "conflict", manifestDigest: digest };
      if (expectedManifestDigest !== undefined && digest !== expectedManifestDigest) return { version: 1, generationId, classification: "conflict", manifestDigest: digest };
      const names = new Set<string>();
      for (const file of manifest.files) {
        validateFileName(file.name); if (names.has(file.name) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > MAX_FILE_BYTES || !/^[0-9a-f]{64}$/u.test(file.digest)) return { version: 1, generationId, classification: "conflict", manifestDigest: digest }; names.add(file.name);
        const body = await this.#readRegular(join(final, file.name), MAX_FILE_BYTES);
        if (body.byteLength !== file.bytes || sha256(body) !== file.digest) return { version: 1, generationId, classification: "conflict", manifestDigest: digest };
      }
      return { version: 1, generationId, classification: "complete", manifestDigest: digest };
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return { version: 1, generationId, classification: "uncertain" }; }
    try { await this.#assertDirectory(temporary); return { version: 1, generationId, classification: "partial" }; }
    catch (error) { return (error as NodeJS.ErrnoException).code === "ENOENT" ? { version: 1, generationId, classification: "absent" } : { version: 1, generationId, classification: "uncertain" }; }
  }

  async #writeSynced(path: string, body: string): Promise<void> {
    this.#assertContained(path); const handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try { await handle.writeFile(body, "utf8"); await handle.sync(); } finally { await handle.close(); }
  }

  async #readRegular(path: string, maxBytes: number): Promise<Buffer> {
    this.#assertContained(path); const canonical = await realpath(path); if (canonical !== resolve(path)) throw new ArborError("VALIDATION_FAILED", "Report symlink is prohibited");
    const stat = await lstat(path); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) throw new ArborError("VALIDATION_FAILED", "Report file is invalid");
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); try { return await handle.readFile(); } finally { await handle.close(); }
  }

  async #assertDirectory(path: string): Promise<void> {
    this.#assertContained(path); const canonical = await realpath(path); if (canonical !== resolve(path)) throw new ArborError("VALIDATION_FAILED", "Report directory symlink is prohibited");
    const stat = await lstat(path); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ArborError("VALIDATION_FAILED", "Report directory is invalid");
  }

  #assertContained(path: string): void {
    const normalized = resolve(path); if (normalized !== this.#root && !normalized.startsWith(`${this.#root}${sep}`)) throw new ArborError("VALIDATION_FAILED", "Report path escaped its root");
  }
}
