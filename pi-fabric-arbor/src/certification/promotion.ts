import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { arch, platform, release, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createFixtureContract } from "../fixtures/driver.js";
import { PackageWorkspaceManager } from "../git/PackageWorkspaceManager.js";
import { PrivateRepositoryPromotionGitIntegrator } from "../git/PromotionGitIntegrator.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { verifyLocalAuthorizationCertification } from "./authorization.js";
import { verifyLocalHeldOutIsolationCertification } from "./held-out.js";

export interface PromotionCrashEvidenceV1 { boundary: "before-promotion-cas" | "after-promotion-cas" | "before-rollback-cas" | "after-rollback-cas"; iteration: number; expectedOid: string; targetOid: string; observedOid: string; detectableOutcome: "ABSENT" | "COMPLETED"; observationDigest: string }
export interface Phase5PromotionCertificateV1 {
  version: 1;
  certificateId: string;
  createdAt: string;
  platform: { os: string; architecture: string; release: string; node: string; git: string };
  sourceDigests: Array<{ path: string; digest: string }>;
  packageLockDigest: string;
  authorizationCertificateId: string;
  authorizationCertificateDigest: string;
  heldOutIsolationCertificateId: string;
  heldOutIsolationCertificateDigest: string;
  mergeAlgorithmDigest: string;
  baselineMergeOid: string;
  candidateMergeOid: string;
  candidateManifestDigest: string;
  requiredOutputsDigest: string;
  protectedManifestDigest: string;
  sourceRefsBeforeDigest: string;
  sourceRefsAfterDigest: string;
  crashEvidence: PromotionCrashEvidenceV1[];
  directChecks: Array<{ name: string; passed: boolean; observationDigest: string }>;
  passed: boolean;
  limitations: string[];
  certificateDigest: string;
}

const SOURCES = ["src/git/PromotionGitIntegrator.ts", "src/application/ArborApplication.ts", "src/domain/types.ts", "src/domain/state-machines.ts", "src/persistence/migrations.ts", "src/persistence/SqliteRunStore.ts", "src/public/descriptors.ts", "src/public/provider.ts", "src/reports/FileReportPublisher.ts", "src/schemas/catalog.ts"] as const;
const FILE = "promotion-certificate.v1.json";
function git(cwd: string, ...args: string[]): string { return execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8" }).trim(); }
function refs(cwd: string): string { return digestCanonical(git(cwd, "for-each-ref", "--format=%(refname)%00%(objectname)").split("\n").filter(Boolean).sort()); }

export async function generatePhase5PromotionCertification(input: { projectRoot: string; outputRoot: string; createdAt: string; iterations?: number }): Promise<Phase5PromotionCertificateV1> {
  const projectRoot = resolve(input.projectRoot); const outputRoot = resolve(input.outputRoot); const fixture = mkdtempSync(join(tmpdir(), "arbor-phase5-"));
  try {
    const source = join(fixture, "source"); mkdirSync(join(source, "src"), { recursive: true }); mkdirSync(join(source, "protected"));
    git(source, "init", "-q"); git(source, "config", "user.name", "Arbor Certifier"); git(source, "config", "user.email", "certifier@invalid");
    writeFileSync(join(source, "src", "solution.ts"), "export const score = 1;\n"); writeFileSync(join(source, "protected", "guard.txt"), "guard\n"); writeFileSync(join(source, "result.txt"), "baseline\n");
    git(source, "add", "."); git(source, "commit", "-qm", "baseline"); const baseOid = git(source, "rev-parse", "HEAD");
    git(source, "branch", "user-ref"); writeFileSync(join(source, "dirty.txt"), "source dirty state\n"); const sourceRefsBeforeDigest = refs(source);
    const stateRoot = join(fixture, "state"); mkdirSync(stateRoot);
    const manager = new PackageWorkspaceManager({ stateRoot, repositoryId: "repo_phase5", sourceCheckout: source, expectedSourceOid: baseOid });
    await manager.materialize({ version: 1, runId: "run_phase5", attemptId: "attempt_phase5", workspaceId: "workspace_phase5", baseOid, idempotencyKey: "phase5_materialize_0001" });
    const workspace = manager.workspacePath("run_phase5", "workspace_phase5");
    writeFileSync(join(workspace, "src", "solution.ts"), "export const score = 2;\n"); writeFileSync(join(workspace, "result.txt"), "candidate\n");
    const contract = { ...createFixtureContract(), repository: { repositoryId: "repo_phase5", initialOid: baseOid, dirtyPolicy: "committedOnly" as const }, paths: { editable: ["src/**", "result.txt"], protected: ["protected/**"], requiredOutputs: ["result.txt"] } };
    const candidate = await manager.finalize({ version: 1, runId: "run_phase5", attemptId: "attempt_phase5", hypothesisId: "hypothesis_phase5", candidateId: "candidate_phase5", baseOid, changedPaths: ["result.txt", "src/solution.ts"], contract });
    const integrator = new PrivateRepositoryPromotionGitIntegrator({ privateGitDir: manager.privateGitDir, stateRoot: manager.stateRoot, gitOidLength: 40 });
    const baseline = await integrator.buildDetached({ version: 1, runId: "run_phase5", role: "heldOutBaseline", expectedResearchTrunkOid: baseOid, candidateOid: baseOid, contract });
    const merge = await integrator.buildDetached({ version: 1, runId: "run_phase5", role: "heldOutCandidate", expectedResearchTrunkOid: baseOid, candidateOid: candidate.candidateOid, candidateId: candidate.candidateId, contract });
    const zero = "0".repeat(40); const iterations = input.iterations ?? 20; const crashEvidence: PromotionCrashEvidenceV1[] = [];
    for (let iteration = 1; iteration <= iterations; iteration += 1) {
      let observed = await integrator.observeWinnerRef("run_phase5");
      crashEvidence.push({ boundary: "before-promotion-cas", iteration, expectedOid: zero, targetOid: merge.mergeCandidateOid, observedOid: observed.actualOid!, detectableOutcome: "ABSENT", observationDigest: observed.observationDigest });
      await integrator.applyWinnerRef({ version: 1, operationId: `operation_promote_${iteration}`, runId: "run_phase5", expectedOid: zero, targetOid: merge.mergeCandidateOid });
      observed = await integrator.observeWinnerRef("run_phase5");
      crashEvidence.push({ boundary: "after-promotion-cas", iteration, expectedOid: zero, targetOid: merge.mergeCandidateOid, observedOid: observed.actualOid!, detectableOutcome: "COMPLETED", observationDigest: observed.observationDigest });
      crashEvidence.push({ boundary: "before-rollback-cas", iteration, expectedOid: merge.mergeCandidateOid, targetOid: zero, observedOid: observed.actualOid!, detectableOutcome: "ABSENT", observationDigest: observed.observationDigest });
      await integrator.applyWinnerRef({ version: 1, operationId: `operation_rollback_${iteration}`, runId: "run_phase5", expectedOid: merge.mergeCandidateOid, targetOid: zero });
      observed = await integrator.observeWinnerRef("run_phase5");
      crashEvidence.push({ boundary: "after-rollback-cas", iteration, expectedOid: merge.mergeCandidateOid, targetOid: zero, observedOid: observed.actualOid!, detectableOutcome: "COMPLETED", observationDigest: observed.observationDigest });
    }
    let staleDenied = false; try { await integrator.applyWinnerRef({ version: 1, operationId: "operation_stale", runId: "run_phase5", expectedOid: "f".repeat(40), targetOid: merge.mergeCandidateOid }); } catch { staleDenied = true; }
    let malformedDenied = false; try { await integrator.applyWinnerRef({ version: 1, operationId: "operation_malformed", runId: "run_phase5", expectedOid: "bad", targetOid: merge.mergeCandidateOid }); } catch { malformedDenied = true; }
    const sourceRefsAfterDigest = refs(source);
    const b7 = verifyLocalAuthorizationCertification({ projectRoot, artifactRoot: join(projectRoot, "certification/authorization/local-ed25519") });
    const b8 = verifyLocalHeldOutIsolationCertification({ projectRoot, artifactRoot: join(projectRoot, "certification/held-out/linux-x86_64-bwrap-0.12.0") });
    if (!b7.valid || !b8.valid) throw new Error("B7/B8 retained certifications must verify before Phase 5 certification");
    const directChecks = [
      { name: "same-detached-algorithm", passed: baseline.algorithmDigest === merge.algorithmDigest, observationDigest: digestCanonical({ baseline: baseline.algorithmDigest, candidate: merge.algorithmDigest }) },
      { name: "actual-merge-oid", passed: git(manager.privateGitDir, "cat-file", "-t", merge.mergeCandidateOid) === "commit", observationDigest: digestCanonical({ mergeOid: merge.mergeCandidateOid, treeOid: merge.treeOid }) },
      { name: "complete-path-policy", passed: merge.changedPaths.join(",") === "result.txt,src/solution.ts" && merge.beforeRefsDigest === merge.afterRefsDigest, observationDigest: merge.manifestDigest },
      { name: "stale-denied-no-ref", passed: staleDenied && (await integrator.observeWinnerRef("run_phase5")).actualOid === zero, observationDigest: digestCanonical({ staleDenied }) },
      { name: "malformed-denied-no-ref", passed: malformedDenied && (await integrator.observeWinnerRef("run_phase5")).actualOid === zero, observationDigest: digestCanonical({ malformedDenied }) },
      { name: "source-and-user-refs-unchanged", passed: sourceRefsBeforeDigest === sourceRefsAfterDigest, observationDigest: digestCanonical({ sourceRefsBeforeDigest, sourceRefsAfterDigest }) },
      { name: "pre-post-cas-detectable", passed: crashEvidence.length === iterations * 4 && crashEvidence.every((entry) => entry.observedOid === (entry.boundary === "before-promotion-cas" || entry.boundary === "after-rollback-cas" ? zero : merge.mergeCandidateOid)), observationDigest: digestCanonical(crashEvidence) },
      { name: "b7-b8-bound", passed: b7.valid && b8.valid, observationDigest: digestCanonical({ b7: b7.certificate.certificateDigest, b8: b8.certificate.certificateDigest }) },
    ];
    const payload: Omit<Phase5PromotionCertificateV1, "certificateDigest"> = {
      version: 1, certificateId: `promotion_phase5_4x${iterations}`, createdAt: input.createdAt,
      platform: { os: platform(), architecture: arch(), release: release(), node: process.version, git: git(source, "--version") },
      sourceDigests: SOURCES.map((path) => ({ path, digest: sha256(readFileSync(join(projectRoot, path))) })), packageLockDigest: sha256(readFileSync(join(projectRoot, "package-lock.json")),),
      authorizationCertificateId: b7.certificate.certificateId, authorizationCertificateDigest: b7.certificate.certificateDigest,
      heldOutIsolationCertificateId: b8.certificate.certificateId, heldOutIsolationCertificateDigest: b8.certificate.certificateDigest,
      mergeAlgorithmDigest: merge.algorithmDigest, baselineMergeOid: baseline.mergeCandidateOid, candidateMergeOid: merge.mergeCandidateOid,
      candidateManifestDigest: merge.manifestDigest, requiredOutputsDigest: merge.requiredOutputsDigest, protectedManifestDigest: merge.protectedManifestDigest,
      sourceRefsBeforeDigest, sourceRefsAfterDigest, crashEvidence, directChecks, passed: directChecks.every((entry) => entry.passed),
      limitations: ["Current-host Phase 5 certificate binds exact Git, package, B7, and B8 inputs. B1 remains unsupported because no real model-backed Fabric child matrix was executed."],
    };
    const certificate: Phase5PromotionCertificateV1 = { ...payload, certificateDigest: digestCanonical(payload) };
    mkdirSync(outputRoot, { recursive: true, mode: 0o700 }); const raw = `${canonicalJson(certificate)}\n`; const temporary = join(outputRoot, `${FILE}.tmp`);
    writeFileSync(temporary, raw, { mode: 0o600 }); renameSync(temporary, join(outputRoot, FILE)); writeFileSync(join(outputRoot, `${FILE}.sha256`), `${sha256(raw)}  ${FILE}\n`, { mode: 0o600 });
    return certificate;
  } finally { rmSync(fixture, { recursive: true, force: true }); }
}

export function verifyPhase5PromotionCertification(input: { projectRoot: string; artifactRoot: string }): { valid: boolean; certificate: Phase5PromotionCertificateV1; errors: string[] } {
  const projectRoot = resolve(input.projectRoot); const artifactRoot = resolve(input.artifactRoot); const errors: string[] = [];
  const raw = readFileSync(join(artifactRoot, FILE), "utf8"); const certificate = JSON.parse(raw) as Phase5PromotionCertificateV1; const { certificateDigest, ...payload } = certificate;
  if (certificateDigest !== digestCanonical(payload)) errors.push("certificate digest mismatch");
  if (readFileSync(join(artifactRoot, `${FILE}.sha256`), "utf8").trim().split(/\s+/u)[0] !== sha256(raw)) errors.push("artifact checksum mismatch");
  if (certificate.sourceDigests.length !== SOURCES.length || certificate.sourceDigests.some((entry) => !SOURCES.includes(entry.path as typeof SOURCES[number]) || entry.digest !== sha256(readFileSync(join(projectRoot, entry.path))))) errors.push("active Phase 5 source digest mismatch");
  if (certificate.packageLockDigest !== sha256(readFileSync(join(projectRoot, "package-lock.json")))) errors.push("package lock digest mismatch");
  const b7 = verifyLocalAuthorizationCertification({ projectRoot, artifactRoot: join(projectRoot, "certification/authorization/local-ed25519") }); const b8 = verifyLocalHeldOutIsolationCertification({ projectRoot, artifactRoot: join(projectRoot, "certification/held-out/linux-x86_64-bwrap-0.12.0") });
  if (!b7.valid || certificate.authorizationCertificateDigest !== b7.certificate.certificateDigest) errors.push("B7 binding mismatch");
  if (!b8.valid || certificate.heldOutIsolationCertificateDigest !== b8.certificate.certificateDigest) errors.push("B8 binding mismatch");
  if (!certificate.passed || certificate.directChecks.some((entry) => !entry.passed) || certificate.crashEvidence.length < 80) errors.push("direct Phase 5 evidence is incomplete");
  if (certificate.platform.os !== platform() || certificate.platform.architecture !== arch() || certificate.platform.release !== release() || certificate.platform.node !== process.version) errors.push("active platform mismatch");
  return { valid: errors.length === 0, certificate, errors };
}
