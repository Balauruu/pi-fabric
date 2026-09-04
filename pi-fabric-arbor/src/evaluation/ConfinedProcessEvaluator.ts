import type { EvaluationRequestV1, Evaluator } from "../adapters/interfaces.js";
import { aggregateTrials } from "../domain/decimal.js";
import { ArborError } from "../domain/errors.js";
import type { EvaluationCertificateV1, EvaluationPolicyBindingV1 } from "../domain/types.js";
import { assertSafeRelativePath } from "../git/git-process.js";
import { assertPackagePrivateRepository } from "../git/PackageWorkspaceManager.js";
import { readCommittedTreeManifest, validateExactCommittedWorkspace, type ExactWorkspaceManifestV1 } from "../git/trusted-tree.js";
import { digestCanonical, sha256 } from "../util/canonical.js";
import { parseStrictEvaluatorRecord, type EvaluatorRecordV1 } from "./protocol.js";
import { LinuxBubblewrapContainmentAdapter, verifyContainmentCertificate, type ContainmentCertificateV1, type ContainedProcessResultV1 } from "../containment/BubblewrapContainmentAdapter.js";
import type { HeldOutIsolationAdapter } from "./HeldOutIsolationAdapter.js";

export interface ProcessEvaluatorTrialSpecV1 {
  version: 1;
  evaluatorId: string;
  evaluatorVersion: string;
  parserVersion: string;
  executableDigest: string;
  configurationDigest: string;
  environmentDigest: string;
  timeoutMs: number;
  maxOutputBytes: number;
  argv(trial: { request: EvaluationRequestV1; split: "development" | "heldOut"; seed: number; ordinal: number; workspace: string; heldOutMount?: "/held-out" }): readonly string[];
}

export interface ConfinedProcessEvaluatorOptionsV1 {
  containment: LinuxBubblewrapContainmentAdapter;
  containmentCertificate: ContainmentCertificateV1;
  workspaceForOid(oid: string): string;
  privateGitDirForOid(oid: string): string;
  gitStateRoot: string;
  development: ProcessEvaluatorTrialSpecV1;
  heldOut?: ProcessEvaluatorTrialSpecV1;
  heldOutIsolation?: HeldOutIsolationAdapter;
  heldOutOpaqueToken?: string;
  seeds?: readonly number[];
  signalForEvaluation?(evaluationId: string): AbortSignal | undefined;
  artifactEvidenceVerifier?: ArtifactEvidenceVerifierV1;
}

export interface ArtifactEvidenceVerifierV1 {
  verifyArtifact(input: { version: 1; artifactId: string; expectedDigest: string; principalId: string; runId: string; effectId: string }): Promise<void>;
}

export interface ProcessEvaluationCertificateV1 extends EvaluationCertificateV1 {
  evaluatorVersion: string;
  configurationDigest: string;
  environmentDigest: string;
  split: "development" | "heldOut";
  seeds: number[];
  trialOrder: number[];
  startAt: string;
  endAt: string;
  exitStatuses: Array<{ exitCode: number; timedOut: boolean; cancelled: boolean; oversized: boolean }>;
  logs: Array<{ stdoutDigest: string; stderrDigest: string; stdoutBytes: number; stderrBytes: number }>;
  artifacts: Array<{ artifactId: string; digest: string }>;
  requiredOutputs: Array<{ path: string; digest: string; type: string; mode: number }>;
  protectedManifest: Array<{ path: string; oid: string; mode: string; type: string }>;
  protectedManifestDigest: string;
  containmentCertificateDigest: string;
  containmentIdentities: string[];
  exactBindingsDigest: string;
  descendantTerminationObserved: boolean;
  limitations: string[];
}

function globRegex(glob: string): RegExp {
  assertSafeRelativePath(glob.replace(/[?*]/gu, "x"));
  let source = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index]!;
    if (character === "*") {
      if (glob[index + 1] === "*") { index += 1; source += glob[index + 1] === "/" ? "(?:.*/)?" : ".*"; if (glob[index + 1] === "/") index += 1; }
      else source += "[^/]*";
    } else if (character === "?") source += "[^/]";
    else source += character.replace(/[\\^$.[\]{}()+|]/gu, "\\$&");
  }
  return new RegExp(`${source}$`, "u");
}

function matches(path: string, globs: readonly string[]): boolean { return globs.some((glob) => globRegex(glob).test(path)); }

function requiredOutputs(manifest: ExactWorkspaceManifestV1, paths: readonly string[]): Array<{ path: string; digest: string; type: string; mode: number }> {
  const entries = new Map(manifest.entries.map((entry) => [entry.path, entry]));
  return paths.map((path) => {
    assertSafeRelativePath(path); const entry = entries.get(path);
    if (!entry) throw new ArborError("EVIDENCE_INVALID", "Required evaluator output is missing from the exact committed manifest", { path });
    return { path, digest: entry.contentDigest, type: entry.type, mode: entry.mode === "100755" ? 0o755 : entry.mode === "100644" ? 0o644 : 0o777 };
  });
}

async function validateRecordEvidence(record: EvaluatorRecordV1, outputs: ReturnType<typeof requiredOutputs>, containmentId: string, environmentDigest: string, binding: { verifier: ArtifactEvidenceVerifierV1 | undefined; principalId: string; runId: string; effectId: string }): Promise<void> {
  const { outputDigest, ...recordPayload } = record;
  if (outputDigest !== digestCanonical(recordPayload)) throw new ArborError("EVIDENCE_INVALID", "Evaluator record output digest mismatch");
  if (record.containmentId !== containmentId) throw new ArborError("EVIDENCE_INVALID", "Evaluator containment binding mismatch");
  if (record.environmentDigest !== environmentDigest) throw new ArborError("EVIDENCE_INVALID", "Evaluator environment binding mismatch");
  const expected = outputs.map(({ path, digest }) => ({ path, digest }));
  const actual = [...record.requiredOutputs].sort((left, right) => left.path.localeCompare(right.path));
  if (digestCanonical(expected) !== digestCanonical(actual)) throw new ArborError("EVIDENCE_INVALID", "Evaluator required-output manifest mismatch");
  const artifactIds = new Set<string>();
  for (const artifact of record.artifacts) {
    if (artifactIds.has(artifact.artifactId)) throw new ArborError("EVIDENCE_INVALID", "Duplicate evaluator artifact ID");
    artifactIds.add(artifact.artifactId);
    if (!binding.verifier) throw new ArborError("EVIDENCE_INVALID", "Evaluator artifact capability verifier is unavailable", { artifactId: artifact.artifactId });
    await binding.verifier.verifyArtifact({ version: 1, artifactId: artifact.artifactId, expectedDigest: artifact.digest, principalId: binding.principalId, runId: binding.runId, effectId: binding.effectId });
  }
}

export class ConfinedProcessEvaluator implements Evaluator {
  readonly #options: ConfinedProcessEvaluatorOptionsV1;
  constructor(options: ConfinedProcessEvaluatorOptionsV1) {
    if (!verifyContainmentCertificate(options.containmentCertificate) || !options.containmentCertificate.valid) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "A valid mechanical containment certificate is required");
    const actualPolicy = options.containment.policyDigests();
    if (options.containmentCertificate.bwrapDigest !== options.containment.bwrapDigest || options.containmentCertificate.mountPolicyDigest !== actualPolicy.mountPolicyDigest || options.containmentCertificate.environmentPolicyDigest !== actualPolicy.environmentPolicyDigest) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Containment certificate does not bind the active adapter policy");
    this.#options = options;
  }

  async evaluate(request: EvaluationRequestV1): Promise<ProcessEvaluationCertificateV1> {
    const split = request.role.startsWith("heldOut") ? "heldOut" as const : "development" as const;
    const spec = split === "heldOut" ? this.#options.heldOut : this.#options.development;
    if (!spec || (split === "heldOut" && (!this.#options.heldOutIsolation || !this.#options.heldOutOpaqueToken))) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Held-out evaluator requires an active B8-certified isolation adapter and opaque token");
    const expectedEvaluator = split === "development" ? request.contract.evaluation.development : request.contract.evaluation.heldOut;
    if (expectedEvaluator !== spec.evaluatorId || request.contract.evaluation.parserVersion !== spec.parserVersion) throw new ArborError("EVIDENCE_INVALID", "Evaluator specification does not match the contract");
    if (split === "heldOut" && (!request.mergeConstruction || request.mergeConstruction.mergeCandidateOid !== request.oid || request.mergeConstruction.role !== request.role)) throw new ArborError("EVIDENCE_INVALID", "Held-out evaluation requires the exact detached merge construction");
    const workspace = this.#options.workspaceForOid(request.oid);
    const privateGitDir = this.#options.privateGitDirForOid(request.oid);
    assertPackagePrivateRepository({ privateGitDir, stateRoot: this.#options.gitStateRoot });
    const exactBefore = await validateExactCommittedWorkspace({ workspace, privateGitDir, oid: request.oid, stateRoot: this.#options.gitStateRoot });
    const committedManifest = await readCommittedTreeManifest(privateGitDir, request.oid, this.#options.gitStateRoot);
    const beforeProtected = committedManifest.filter((entry) => matches(entry.path, request.contract.paths.protected)).map((entry) => ({ path: entry.path, oid: entry.oid, mode: entry.mode, type: "blob" })).sort((left, right) => left.path.localeCompare(right.path));
    const outputs = requiredOutputs(exactBefore, request.contract.paths.requiredOutputs);
    const startAt = new Date().toISOString();
    const records: EvaluatorRecordV1[] = [];
    const processResults: ContainedProcessResultV1[] = [];
    let rejectionReason: string | undefined;
    const trialCount = request.contract.metric.trialCount;
    if ((request.contract.metric.aggregation === "single" && trialCount !== 1) || (request.contract.metric.aggregation === "median" && (trialCount < 3 || trialCount > 99 || trialCount % 2 !== 1))) throw new ArborError("VALIDATION_FAILED", "Evaluator trial count does not match the canonical aggregation policy");
    if (spec.maxOutputBytes > 1_048_576) throw new ArborError("VALIDATION_FAILED", "Evaluator structured output bound exceeds 1 MiB");
    const seeds = this.#options.seeds ?? Array.from({ length: trialCount }, (_, index) => index);
    if (seeds.length < trialCount) throw new ArborError("VALIDATION_FAILED", "Evaluator seed schedule is shorter than trial count");

    for (let index = 0; index < trialCount; index += 1) {
      const ordinal = index + 1;
      const containmentId = `containment_${sha256(`${request.evaluationId}:${ordinal}`).slice(0, 32)}`;
      const evaluationSignal = this.#options.signalForEvaluation?.(request.evaluationId);
      const processRequest = {
        version: 1 as const,
        containmentId,
        workspace,
        argv: spec.argv({ request, split, seed: seeds[index]!, ordinal, workspace, ...(split === "heldOut" ? { heldOutMount: "/held-out" as const } : {}) }),
        permissions: { network: false as const, packageInstallation: false as const, processExecution: true as const },
        workspaceWritable: false,
        timeoutMs: spec.timeoutMs,
        maxOutputBytes: spec.maxOutputBytes,
        ...(evaluationSignal ? { signal: evaluationSignal } : {}),
      };
      const immediatelyBefore = await validateExactCommittedWorkspace({ workspace, privateGitDir, oid: request.oid, stateRoot: this.#options.gitStateRoot });
      if (immediatelyBefore.manifestDigest !== exactBefore.manifestDigest) throw new ArborError("EVIDENCE_INVALID", "Candidate manifest changed immediately before evaluator execution");
      const result = split === "heldOut"
        ? await this.#options.heldOutIsolation!.runCanonicalEvaluator(processRequest, this.#options.heldOutOpaqueToken!)
        : await this.#options.containment.run(processRequest);
      const immediatelyAfter = await validateExactCommittedWorkspace({ workspace, privateGitDir, oid: request.oid, stateRoot: this.#options.gitStateRoot });
      if (immediatelyAfter.manifestDigest !== exactBefore.manifestDigest) throw new ArborError("EVIDENCE_INVALID", "Candidate manifest changed before evaluator receipt validation");
      processResults.push(result);
      if (result.identity.environmentDigest !== spec.environmentDigest) {
        rejectionReason = "CONTAINMENT_ENVIRONMENT_MISMATCH";
        break;
      }
      if (result.exitCode !== 0 || result.timedOut || result.cancelled || result.oversized) {
        rejectionReason = result.timedOut ? "TIMEOUT" : result.cancelled ? "CANCELLED" : result.oversized ? "OUTPUT_OVERSIZE" : "NONZERO_EXIT";
        break;
      }
      try {
        const record = parseStrictEvaluatorRecord(result.stdout, {
          runId: request.runId, evaluationId: request.evaluationId, contractDigest: request.contractDigest, epochDigest: request.epochDigest,
          oid: request.oid, evaluatorId: spec.evaluatorId, parserVersion: spec.parserVersion, split, contract: request.contract,
        }, request.oid.length as 40 | 64);
        if (record.seed !== seeds[index] || record.trialOrdinal !== ordinal) throw new ArborError("EVIDENCE_INVALID", "Evaluator seed or trial order mismatch");
        await validateRecordEvidence(record, outputs, containmentId, spec.environmentDigest, { verifier: this.#options.artifactEvidenceVerifier, principalId: spec.evaluatorId, runId: request.runId, effectId: request.effectId });
        records.push(record);
      } catch (error) {
        rejectionReason = error instanceof Error ? error.message : "MALFORMED_OUTPUT";
        break;
      }
    }
    const exactAtReceipt = await validateExactCommittedWorkspace({ workspace, privateGitDir, oid: request.oid, stateRoot: this.#options.gitStateRoot });
    if (exactAtReceipt.manifestDigest !== exactBefore.manifestDigest) rejectionReason = "CANDIDATE_MANIFEST_CHANGED";
    const endAt = new Date().toISOString();
    let aggregateUnits = "0";
    let spreadUnits = "0";
    let quantizedUnits: string[] = [];
    if (!rejectionReason && records.length === trialCount) {
      const aggregate = aggregateTrials(records.map((record) => record.value), request.contract.metric.quantum, request.contract.metric.aggregation, request.contract.metric.nondeterminismTolerance);
      quantizedUnits = aggregate.quantized.map(String);
      aggregateUnits = aggregate.aggregate.toString();
      spreadUnits = aggregate.spread.toString();
      if (aggregate.nondeterministic) rejectionReason = "NONDETERMINISTIC";
    } else if (!rejectionReason) rejectionReason = "TRIAL_COUNT_MISMATCH";
    const artifactsById = new Map<string, { artifactId: string; digest: string }>();
    for (const artifact of records.flatMap((record) => record.artifacts)) {
      const prior = artifactsById.get(artifact.artifactId);
      if (prior && prior.digest !== artifact.digest) rejectionReason = "ARTIFACT_ID_DIGEST_CONFLICT";
      artifactsById.set(artifact.artifactId, artifact);
    }
    const artifacts = [...artifactsById.values()].sort((left, right) => left.artifactId.localeCompare(right.artifactId));
    if (artifacts.length > 512) rejectionReason = "ARTIFACT_COUNT_OVERSIZE";
    const containmentPolicyDigests = [...new Set(processResults.map((result) => result.identity.mountPolicyDigest))];
    if (containmentPolicyDigests.length !== 1) rejectionReason = "CONTAINMENT_POLICY_MISMATCH";
    const containmentPolicyDigest = containmentPolicyDigests[0] ?? this.#options.containment.policyDigests().mountPolicyDigest;
    const policyWithoutDigest = {
      version: 1 as const, evaluatorVersion: spec.evaluatorVersion, split, parserVersion: spec.parserVersion,
      configurationDigest: spec.configurationDigest, environmentDigest: spec.environmentDigest, executableDigest: spec.executableDigest,
      quantum: request.contract.metric.quantum, trialCount, seeds: seeds.slice(0, trialCount), trialOrder: Array.from({ length: trialCount }, (_, index) => index + 1),
      aggregation: request.contract.metric.aggregation, nondeterminismTolerance: request.contract.metric.nondeterminismTolerance,
      containmentPolicyDigest, containmentCertificateDigest: this.#options.containmentCertificate.certificateDigest,
      ...(split === "heldOut" ? { heldOutIsolationCertificateDigest: this.#options.heldOutIsolation!.certificateDigest } : {}), strictProtocol: true as const,
    };
    const policy: EvaluationPolicyBindingV1 = { ...policyWithoutDigest, policyDigest: digestCanonical(policyWithoutDigest) };
    const exactBindingsDigest = digestCanonical({
      oid: request.oid, effectId: request.effectId, split, evaluatorId: spec.evaluatorId, evaluatorVersion: spec.evaluatorVersion, executableDigest: spec.executableDigest,
      parserVersion: spec.parserVersion, metric: request.contract.metric.name, unit: request.contract.metric.unit, environmentDigest: spec.environmentDigest,
      requiredOutputs: outputs, protectedManifest: beforeProtected, candidateManifestDigest: exactBefore.manifestDigest, containmentCertificateDigest: this.#options.containmentCertificate.certificateDigest,
      mergeConstruction: request.mergeConstruction, policy,
    });
    // Contained stdout/stderr are transient parser inputs only. Certificates retain
    // bounded byte counts and digests, never arbitrary process-controlled text.
    const logs = processResults.map((result) => ({ stdoutDigest: result.stdoutDigest, stderrDigest: result.stderrDigest, stdoutBytes: Buffer.byteLength(result.stdout, "utf8"), stderrBytes: Buffer.byteLength(result.stderr, "utf8") }));
    const outputDigest = digestCanonical({ records, logs: logs.map(({ stdoutDigest, stderrDigest }) => ({ stdoutDigest, stderrDigest })), exactBindingsDigest, policy });
    return Object.freeze({
      version: 1, certificateId: request.certificateId, evaluationId: request.evaluationId, runId: request.runId, epochDigest: request.epochDigest,
      contractDigest: request.contractDigest, role: request.role, oid: request.oid, evaluatorId: spec.evaluatorId, evaluatorVersion: spec.evaluatorVersion,
      parserVersion: spec.parserVersion, metric: request.contract.metric.name, unit: request.contract.metric.unit, quantum: request.contract.metric.quantum,
      rawTrials: records.map((record) => record.value), quantizedUnits, aggregateUnits, spreadUnits, valid: rejectionReason === undefined,
      ...(rejectionReason ? { rejectionReason } : {}), outputDigest, trust: "certified", configurationDigest: spec.configurationDigest,
      environmentDigest: spec.environmentDigest, split, seeds: seeds.slice(0, records.length), trialOrder: records.map((record) => record.trialOrdinal),
      startAt, endAt, exitStatuses: processResults.map((result) => ({ exitCode: result.exitCode, timedOut: result.timedOut, cancelled: result.cancelled, oversized: result.oversized })),
      logs, artifacts, requiredOutputs: outputs, protectedManifest: beforeProtected,
      containmentCertificateDigest: this.#options.containmentCertificate.certificateDigest, containmentIdentities: processResults.map((result) => result.identity.containmentId),
      exactBindingsDigest, descendantTerminationObserved: processResults.every((result) => result.descendantsTerminated),
      policy, ...(request.mergeConstruction ? { baseOid: request.mergeConstruction.expectedResearchTrunkOid, candidateOid: request.mergeConstruction.candidateOid, mergeCandidateOid: request.mergeConstruction.mergeCandidateOid } : {}),
      requiredOutputsDigest: digestCanonical(outputs), protectedManifestDigest: digestCanonical(beforeProtected),
      ...(split === "heldOut" ? { heldOutIsolationCertificateDigest: this.#options.heldOutIsolation!.certificateDigest } : {}), strictProtocol: true,
      limitations: split === "heldOut" ? [] : ["Development evaluation receives no held-out mount, token, credential, path, or resolution capability."],
    });
  }
}
