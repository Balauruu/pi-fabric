import type { ActivityProjector, ActivityProjectionObservationV1, AgentObservationV1, AgentSpawnRequestV1, CandidateFinalizationRequestV1, CleanupAdapter, CleanupExecutionRequestV1, EvaluationRequestV1, Evaluator, FabricAgentAdapter, ReportPublicationObservationV1, ReportPublisher, WorkspaceManager, WorkspaceMaterializationRequestV1, WorkspaceObservationV1 } from "../adapters/interfaces.js";
import type { CandidateV1, EvaluationCertificateV1, OutboxRecordV1 } from "../domain/types.js";
import type { DetachedMergeRequestV1, PromotionGitIntegrator, WinnerRefMutationV1 } from "./PromotionGitIntegrator.js";
import { digestCanonical } from "../util/canonical.js";
import { FingerprintBoundaryGuard, type FingerprintBoundaryMetadataV1, type RepositoryFingerprintCertificateV1 } from "./fingerprint.js";

export interface FingerprintBoundaryBindingV1<T> {
  metadata(kind: "materializeWorkspace" | "finalizeCandidate" | "spawnAgent" | "evaluate" | "publishReport" | "observeReport" | "cleanup" | "buildDetached" | "observeWinnerRef" | "applyWinnerRef" | "publishOutbox" | "observeOutbox", request: T): FingerprintBoundaryMetadataV1;
  retain(certificate: RepositoryFingerprintCertificateV1): void | Promise<void>;
}

/** Production workspace decorator requiring a signed source fingerprint around every external Git boundary. */
const productionFingerprintWrappers = new WeakSet<object>();

export class FingerprintProtectedWorkspaceManager implements WorkspaceManager {
  constructor(
    readonly inner: WorkspaceManager,
    readonly guard: FingerprintBoundaryGuard,
    readonly binding: FingerprintBoundaryBindingV1<WorkspaceMaterializationRequestV1 | CandidateFinalizationRequestV1>,
  ) { productionFingerprintWrappers.add(this); }

  async materialize(request: WorkspaceMaterializationRequestV1): Promise<WorkspaceObservationV1> {
    const guarded = await this.guard.run(this.binding.metadata("materializeWorkspace", request), () => this.inner.materialize(request), (certificate) => this.binding.retain(certificate));
    return guarded.result;
  }

  async finalize(request: CandidateFinalizationRequestV1): Promise<CandidateV1> {
    const guarded = await this.guard.run(this.binding.metadata("finalizeCandidate", request), () => this.inner.finalize(request), (certificate) => this.binding.retain(certificate));
    return guarded.result;
  }
}

/** Production evaluator decorator requiring a signed source fingerprint around every process boundary. */
export class FingerprintProtectedEvaluator implements Evaluator {
  constructor(
    readonly inner: Evaluator,
    readonly guard: FingerprintBoundaryGuard,
    readonly binding: FingerprintBoundaryBindingV1<EvaluationRequestV1>,
  ) { productionFingerprintWrappers.add(this); }

  async evaluate(request: EvaluationRequestV1): Promise<EvaluationCertificateV1> {
    const guarded = await this.guard.run(this.binding.metadata("evaluate", request), () => this.inner.evaluate(request), (certificate) => this.binding.retain(certificate));
    return guarded.result;
  }
}

/** Production Fabric child decorator requiring source equality around dispatch and collection. */
export class FingerprintProtectedAgentAdapter implements FabricAgentAdapter {
  constructor(readonly inner: FabricAgentAdapter, readonly guard: FingerprintBoundaryGuard, readonly binding: FingerprintBoundaryBindingV1<AgentSpawnRequestV1>) { productionFingerprintWrappers.add(this); }
  async spawn(request: AgentSpawnRequestV1): Promise<AgentObservationV1> {
    return (await this.guard.run(this.binding.metadata("spawnAgent", request), () => this.inner.spawn(request), (certificate) => this.binding.retain(certificate))).result;
  }
}

export type ReportBoundaryRequestV1 = { version: 1; generationId: string; filesDigest?: string; expectedManifestDigest?: string };

/** Report decorator covering both external publication and recovery observation boundaries. */
export class FingerprintProtectedReportPublisher implements ReportPublisher {
  constructor(readonly inner: ReportPublisher, readonly guard: FingerprintBoundaryGuard, readonly binding: FingerprintBoundaryBindingV1<ReportBoundaryRequestV1>) { productionFingerprintWrappers.add(this); }
  async publish(generationId: string, files: Readonly<Record<string, string>>, expectedManifestDigest?: string): Promise<ReportPublicationObservationV1> {
    const request: ReportBoundaryRequestV1 = { version: 1, generationId, filesDigest: this.digestFiles(files), ...(expectedManifestDigest ? { expectedManifestDigest } : {}) };
    return (await this.guard.run(this.binding.metadata("publishReport", request), () => this.inner.publish(generationId, files, expectedManifestDigest), (certificate) => this.binding.retain(certificate))).result;
  }
  async observe(generationId: string, expectedManifestDigest?: string): Promise<ReportPublicationObservationV1> {
    const request: ReportBoundaryRequestV1 = { version: 1, generationId, ...(expectedManifestDigest ? { expectedManifestDigest } : {}) };
    return (await this.guard.run(this.binding.metadata("observeReport", request), () => this.inner.observe(generationId, expectedManifestDigest), (certificate) => this.binding.retain(certificate))).result;
  }
  private digestFiles(files: Readonly<Record<string, string>>): string { return digestCanonical(Object.keys(files).sort().map((path) => ({ path, content: files[path] }))); }
}

export type CleanupBoundaryRequestV1 = CleanupExecutionRequestV1;

/** Cleanup decorator requiring source equality around destructive external cleanup. */
export class FingerprintProtectedCleanupAdapter implements CleanupAdapter {
  constructor(readonly inner: CleanupAdapter, readonly guard: FingerprintBoundaryGuard, readonly binding: FingerprintBoundaryBindingV1<CleanupBoundaryRequestV1>) { productionFingerprintWrappers.add(this); }
  async execute(request: CleanupExecutionRequestV1): Promise<{ version: 1; cleanupId: string; outcome: "completed" | "pending" | "indeterminate" }> {
    return (await this.guard.run(this.binding.metadata("cleanup", request), () => this.inner.execute(request), (certificate) => this.binding.retain(certificate))).result;
  }
}

export type PromotionGitBoundaryRequestV1 = DetachedMergeRequestV1 | WinnerRefMutationV1 | { version: 1; runId: string; operation: "observeWinnerRef" };

/** Every detached merge, winner-ref observation, and CAS mutation is fingerprint guarded. */
export class FingerprintProtectedPromotionGitIntegrator implements PromotionGitIntegrator {
  constructor(readonly inner: PromotionGitIntegrator, readonly guard: FingerprintBoundaryGuard, readonly binding: FingerprintBoundaryBindingV1<PromotionGitBoundaryRequestV1>) { productionFingerprintWrappers.add(this); }
  async buildDetached(request: DetachedMergeRequestV1) { return (await this.guard.run(this.binding.metadata("buildDetached", request), () => this.inner.buildDetached(request), (certificate) => this.binding.retain(certificate))).result; }
  async observeWinnerRef(runId: string) { const request = { version: 1 as const, runId, operation: "observeWinnerRef" as const }; return (await this.guard.run(this.binding.metadata("observeWinnerRef", request), () => this.inner.observeWinnerRef(runId), (certificate) => this.binding.retain(certificate))).result; }
  async applyWinnerRef(request: WinnerRefMutationV1): Promise<void> { await this.guard.run(this.binding.metadata("applyWinnerRef", request), () => this.inner.applyWinnerRef(request), (certificate) => this.binding.retain(certificate)); }
  winnerRef(runId: string): string { return this.inner.winnerRef(runId); }
}

export function productionFingerprintWrappersPresent(input: { workspace: WorkspaceManager; agent: FabricAgentAdapter; evaluator: Evaluator; reportPublisher: ReportPublisher; cleanup: CleanupAdapter; git: PromotionGitIntegrator }): boolean {
  return [input.workspace, input.agent, input.evaluator, input.reportPublisher, input.cleanup, input.git].every((adapter) => productionFingerprintWrappers.has(adapter));
}

/** Activity publication is also external and is observed by stable dispatch key before replay. */
export class FingerprintProtectedActivityProjector implements ActivityProjector {
  constructor(readonly inner: ActivityProjector, readonly guard: FingerprintBoundaryGuard, readonly binding: FingerprintBoundaryBindingV1<OutboxRecordV1>) {}
  async observe(record: OutboxRecordV1): Promise<ActivityProjectionObservationV1> {
    return (await this.guard.run(this.binding.metadata("observeOutbox", record), () => this.inner.observe(record), (certificate) => this.binding.retain(certificate))).result;
  }
  async publish(record: OutboxRecordV1): Promise<ActivityProjectionObservationV1> {
    return (await this.guard.run(this.binding.metadata("publishOutbox", record), () => this.inner.publish(record), (certificate) => this.binding.retain(certificate))).result;
  }
}
