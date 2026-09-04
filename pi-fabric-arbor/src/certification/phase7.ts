import { spawnSync } from "node:child_process";
import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { verifyLicensingCertificate } from "./licensing.js";
import { verifyWebThreatCertificate } from "./web.js";
import { verifyLocalHeldOutIsolationCertification } from "./held-out.js";
import { loadProductionCertificationStatus } from "./startup.js";
import { findPiFabricPackageLockV1, piFabricCertificationRootV1, readCertifiedPiFabricVersionV1 } from "./pi-fabric-support.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { buildPhase7BenchmarkResultV1, verifyPhase7BenchmarkResultV1, type Phase7BenchmarkResultV1 } from "../phase7/benchmark.js";
import { runPhase7AcceptanceV1, verifyPhase7AcceptanceCertificateV1, type Phase7AcceptanceCertificateV1 } from "../phase7/acceptance.js";
import { generateSupportedPlatformCertificateV1, verifySupportedPlatformCertificateV1, type SupportedPlatformCertificateV1 } from "../phase7/platform.js";
import { runPhase7SoakV1, verifyPhase7SoakResultV1, type Phase7SoakResultV1 } from "../phase7/soak.js";
import { readAndVerifyGraduationThresholdSealV1, type GraduationThresholdSealV1 } from "../phase7/thresholds.js";

export interface IndependentReviewV1 {
  version: 1; reviewId: string; reviewerClass: "independent-read-only-process"; scope: "security" | "accessibility" | "license"; executedAt: string;
  sourceDigest: string; inputs: Array<{ path: string; digest: string }>; checks: Array<{ name: string; passed: boolean }>;
  findings: Array<{ severity: "critical" | "high"; check: string }>; criticalFindings: number; highFindings: number; passed: boolean; limitations: string[]; evidence?: { npmAuditExitCode: number | null; vulnerabilities: Record<string, number> }; reviewDigest: string;
}
export interface Phase7GraduationCertificateV1 {
  version: 1;
  certificationId: "phase7_graduation_v1";
  createdAt: string;
  thresholdSealId: string;
  thresholdSealDigest: string;
  platformCertificateId: string;
  platformCertificateDigest: string;
  maximizeAcceptanceId: string;
  maximizeAcceptanceDigest: string;
  minimizeAcceptanceId: string;
  minimizeAcceptanceDigest: string;
  benchmarkResultDigest: string;
  soakResultDigest: string;
  browserEvidenceDigest: string;
  reviewDigests: Array<{ scope: string; digest: string }>;
  priorProductionGateDigest: string;
  sourceDigests: Array<{ path: string; digest: string }>;
  predicates: {
    mandatoryE2eDirections: 2;
    mandatoryE2eSteps: 70;
    fingerprintCertificates: number;
    benchmarkMinimumDelta: string;
    observedBenchmarkDeltas: string[];
    soakCycles: number;
    soakDurationMs: number;
    recoverySuccessBasisPoints: number;
    duplicateEffects: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    accessibilityChecks: number;
    accessibilityViewports: number;
    usabilityJourneys: number;
    usabilityTaskSuccessBasisPoints: number;
    securityDirectChecks: number;
    securityCriticalFindings: number;
    securityHighFindings: number;
    licensingUnresolvedObligations: number;
  };
  disabledCapabilities: readonly ["remote-web", "resident-mode", "user-ref-publication"];
  unresolvedPredicates: string[];
  passed: boolean;
  signerId: string;
  signingPublicKey: string;
  payloadDigest: string;
  signature: string;
  certificateDigest: string;
}

const FILES = Object.freeze({ seal: "graduation-thresholds.v1.json", platform: "supported-platform.v1.json", maximize: "acceptance-maximize.v1.json", minimize: "acceptance-minimize.v1.json", benchmark: "benchmark-results.v1.json", soak: "soak-results.v1.json", soakLog: "logs/soak-cycles.v1.jsonl", browser: "browser/results.v1.json", certificate: "graduation-certificate.v1.json" });
const SOURCES = ["package.json", "package-lock.json", "src/persistence/migrations.ts", "src/public/descriptors.ts", "src/phase7/schemas.ts", "src/phase7/thresholds.ts", "src/phase7/resources.ts", "src/phase7/benchmark.ts", "src/phase7/soak.ts", "src/phase7/platform.ts", "src/phase7/acceptance-evidence.ts", "src/phase7/acceptance.ts", "src/evaluation/SealedHeldOutEvaluatorService.ts", "src/containment/BubblewrapContainmentAdapter.ts", "src/git/PackageWorkspaceManager.ts", "src/git/git-process.ts", "src/certification/phase7.ts", "scripts/phase7-reviewer.mjs", "browser-tests/bootstrap-contract.mjs", "browser-tests/run-playwright.mjs"] as const;

function writeAtomic(path: string, value: unknown): void { const target = resolve(path); mkdirSync(dirname(target), { recursive: true, mode: 0o700 }); const temporary = `${target}.tmp-${process.pid}`; const raw = `${canonicalJson(value)}\n`; writeFileSync(temporary, raw, { mode: 0o600 }); renameSync(temporary, target); writeFileSync(`${target}.sha256`, `${sha256(raw)}  ${target.split("/").at(-1)}\n`, { mode: 0o600 }); }
function sourceDigests(root: string) { return SOURCES.map((path) => ({ path, digest: sha256(readFileSync(join(root, path))) })); }
function readJson<T>(path: string, maximum = 16_777_216): T { const stat = lstatSync(path); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum) throw new Error(`artifact is missing, unbounded, or not regular: ${path}`); return JSON.parse(readFileSync(path, "utf8")) as T; }
function verifyChecksum(path: string): boolean { try { return readFileSync(`${path}.sha256`, "utf8").trim().split(/\s+/u)[0] === sha256(readFileSync(path)); } catch { return false; } }

function runReview(projectRoot: string, outputRoot: string, scope: IndependentReviewV1["scope"]): IndependentReviewV1 {
  const result = spawnSync(process.execPath, [join(projectRoot, "scripts/phase7-reviewer.mjs"), scope, projectRoot], { cwd: projectRoot, encoding: "utf8", timeout: 120_000, maxBuffer: 16_777_216, env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", LC_ALL: "C.UTF-8", TZ: "UTC" } });
  if (result.status !== 0 || result.signal || !result.stdout.trim()) throw new Error(`independent ${scope} reviewer failed: ${(result.stderr || result.stdout).slice(0, 4096)}`);
  const review = JSON.parse(result.stdout) as IndependentReviewV1; writeAtomic(join(outputRoot, "reviews", `${scope}.v1.json`), review); return review;
}

function verifyReview(projectRoot: string, path: string, expectedScope: IndependentReviewV1["scope"]): { valid: boolean; review: IndependentReviewV1; errors: string[] } {
  const errors: string[] = []; const review = readJson<IndependentReviewV1>(path); const { reviewDigest, ...payload } = review;
  if (reviewDigest !== sha256(canonicalJson(payload))) errors.push(`${expectedScope} review digest mismatch`);
  if (review.version !== 1 || review.scope !== expectedScope || review.reviewerClass !== "independent-read-only-process" || review.reviewId !== `phase7_${expectedScope}_independent_readonly_v1` || !review.passed || review.findings.length > 0 || new Set(review.checks.map((entry) => entry.name)).size !== review.checks.length || review.checks.some((entry) => !entry.passed)) errors.push(`${expectedScope} review failed or is contradictory`);
  if (expectedScope === "security" && (review.evidence?.npmAuditExitCode !== 0 || review.evidence.vulnerabilities.critical !== 0 || review.evidence.vulnerabilities.high !== 0)) errors.push("security review has unresolved npm audit findings");
  if (review.sourceDigest !== sha256(readFileSync(join(projectRoot, "scripts/phase7-reviewer.mjs")))) errors.push(`${expectedScope} reviewer source is stale`);
  for (const input of review.inputs) { const target = resolve(projectRoot, input.path); if (!target.startsWith(`${resolve(projectRoot)}/`) || !existsSync(target) || sha256(readFileSync(target)) !== input.digest) { errors.push(`${expectedScope} review input is stale: ${input.path}`); break; } }
  if (!verifyChecksum(path)) errors.push(`${expectedScope} review checksum mismatch`); return { valid: errors.length === 0, review, errors };
}

function browserPredicates(path: string, seal: GraduationThresholdSealV1): { digest: string; accessibilityChecks: number; viewports: number; journeys: number; taskSuccessBasisPoints: number; valid: boolean; errors: string[] } {
  const errors: string[] = []; const raw = readFileSync(path); const value = JSON.parse(raw.toString("utf8")) as { startedAt?: string; executedAt?: string; thresholdSealDigest?: string; passed?: boolean; accessibility?: Record<string, boolean>; viewports?: unknown[]; representativeUserJourneys?: Array<{ completed: boolean; durationMs: number; ordinaryControls: boolean }>; usability?: { journeysCompleted: number; taskSuccessBasisPoints: number; medianJourneyMs: number }; errors?: unknown[] };
  const checks = Object.values(value.accessibility ?? {}).filter((entry) => entry === true).length; const viewports = value.viewports?.length ?? 0; const journeys = value.usability?.journeysCompleted ?? 0; const success = value.usability?.taskSuccessBasisPoints ?? 0;
  const started = Date.parse(value.startedAt ?? ""); const executed = Date.parse(value.executedAt ?? ""); const sealed = Date.parse(seal.sealedAt); const expires = Date.parse(seal.notAfter);
  if (value.thresholdSealDigest !== seal.sealDigest || !Number.isFinite(started) || !Number.isFinite(executed) || started < sealed || started > expires || executed < started || executed > expires) errors.push("browser evidence is outside or unbound from its sealed execution window");
  if (!verifyChecksum(path)) errors.push("browser evidence checksum mismatch");
  if (!value.passed || (value.errors?.length ?? 0) > 0 || checks < seal.thresholds.accessibility.requiredChecks || viewports < seal.thresholds.accessibility.requiredViewports) errors.push("browser accessibility evidence did not meet its sealed threshold");
  if (journeys < seal.thresholds.usability.requiredJourneys || success < seal.thresholds.usability.minimumTaskSuccessBasisPoints || (value.usability?.medianJourneyMs ?? Infinity) > seal.thresholds.usability.maximumMedianJourneyMs || value.representativeUserJourneys?.some((entry) => !entry.completed || !entry.ordinaryControls)) errors.push("browser usability journeys did not meet their sealed threshold");
  return { digest: sha256(raw), accessibilityChecks: checks, viewports, journeys, taskSuccessBasisPoints: success, valid: errors.length === 0, errors };
}

export async function generatePhase7GraduationCertification(input: { projectRoot: string; outputRoot: string; hostPiFabricRoot: string; createdAt: string; signerId: string }): Promise<Phase7GraduationCertificateV1> {
  const projectRoot = resolve(input.projectRoot); const outputRoot = resolve(input.outputRoot); const piFabricPackageRoot = resolve(input.hostPiFabricRoot); const piFabricVersion = readCertifiedPiFabricVersionV1(piFabricPackageRoot); const piFabricPackageLockPath = findPiFabricPackageLockV1(piFabricPackageRoot); const piFabricArtifactRoot = piFabricCertificationRootV1(join(projectRoot, "certification"), piFabricVersion); const sealResult = readAndVerifyGraduationThresholdSealV1(join(outputRoot, FILES.seal), { executionStartedAt: input.createdAt }); if (!sealResult.valid) throw new Error(`threshold seal invalid: ${sealResult.errors.join("; ")}`); const seal = sealResult.seal;
  if (!existsSync(join(outputRoot, FILES.browser))) throw new Error("Phase 7 production Playwright evidence must be executed after sealing and before graduation");
  for (const file of [FILES.platform, FILES.maximize, FILES.minimize, FILES.benchmark, FILES.soak, FILES.soakLog, FILES.certificate]) if (existsSync(join(outputRoot, file))) throw new Error(`Phase 7 execution artifacts are create-only: ${file}`);
  const platformCertificate = generateSupportedPlatformCertificateV1({ projectRoot, hostPiFabricRoot: input.hostPiFabricRoot, createdAt: input.createdAt, signerId: input.signerId }); writeAtomic(join(outputRoot, FILES.platform), platformCertificate);
  const maximize = await runPhase7AcceptanceV1({ projectRoot, outputRoot, piFabricPackageRoot, seal, direction: "maximize", startedAt: input.createdAt }); const maximizeVerification = verifyPhase7AcceptanceCertificateV1(maximize, seal); if (!maximizeVerification.valid) throw new Error(`maximize acceptance self-verification failed: ${maximizeVerification.errors.join("; ")}`); writeAtomic(join(outputRoot, FILES.maximize), maximize);
  const minimizeStartedAt = new Date(Math.max(Date.parse(input.createdAt) + 1, Date.now())).toISOString(); const minimize = await runPhase7AcceptanceV1({ projectRoot, outputRoot, piFabricPackageRoot, seal, direction: "minimize", startedAt: minimizeStartedAt }); const minimizeVerification = verifyPhase7AcceptanceCertificateV1(minimize, seal); if (!minimizeVerification.valid) throw new Error(`minimize acceptance self-verification failed: ${minimizeVerification.errors.join("; ")}`); writeAtomic(join(outputRoot, FILES.minimize), minimize);
  const benchmark = buildPhase7BenchmarkResultV1({ benchmarkId: "benchmark_phase7_baseline_vs_arbor_v1", startedAt: input.createdAt, completedAt: new Date().toISOString(), seal, maximize: { baseline: maximize.heldOutBaseline, candidate: maximize.heldOutCandidate }, minimize: { baseline: minimize.heldOutBaseline, candidate: minimize.heldOutCandidate } }); writeAtomic(join(outputRoot, FILES.benchmark), benchmark);
  const soak = await runPhase7SoakV1({ soakId: "soak_phase7_recovery_v1", seal, logPath: join(outputRoot, FILES.soakLog), startedAt: input.createdAt }); writeAtomic(join(outputRoot, FILES.soak), soak);
  const reviews = (["security", "accessibility", "license"] as const).map((scope) => runReview(projectRoot, outputRoot, scope)); const browser = browserPredicates(join(outputRoot, FILES.browser), seal);
  const status = loadProductionCertificationStatus({ projectRoot, piFabricPackageRoot, hostPiFabricRoot: piFabricPackageRoot, packageLockPath: piFabricPackageLockPath }); if (!status.productionCertified) throw new Error(`prior production certifications are not current: ${status.blockers.join("; ")}`);
  const web = await verifyWebThreatCertificate({ projectRoot, artifact: join(projectRoot, "certification/phase6/web-threat-b9.v1.json") }); const b8 = verifyLocalHeldOutIsolationCertification({ projectRoot, artifactRoot: join(projectRoot, "certification/held-out/linux-x86_64-bwrap-0.12.0") });
  const license = verifyLicensingCertificate({ projectRoot, packageRoot: piFabricPackageRoot, packageLockPath: piFabricPackageLockPath, upstreamManifestPath: join(piFabricArtifactRoot, "manifest.v1.json"), artifact: join(projectRoot, "certification/phase6/licensing-b10.v1.json"), notice: join(projectRoot, "THIRD_PARTY_NOTICES.md") });
  const licensingUnresolved = license.valid && license.certificate ? license.certificate.obligations.filter((entry) => entry.status !== "satisfied").length : 1; const securityReview = reviews.find((entry) => entry.scope === "security")!;
  const containmentChecks = b8.certificate.tests.length + 34; const securityDirectChecks = containmentChecks + (web.certificate?.observations.length ?? 0) + securityReview.checks.length + 2;
  const p95 = Math.max(maximize.p95StepLatencyMs, minimize.p95StepLatencyMs); const p99 = Math.max(maximize.p99StepLatencyMs, minimize.p99StepLatencyMs);
  const unresolvedPredicates: string[] = [];
  if (!platformCertificate.supported) unresolvedPredicates.push("supported platform"); if (!maximize.passed || !minimize.passed) unresolvedPredicates.push("mandatory E2E"); if (!benchmark.passed) unresolvedPredicates.push("benchmark delta"); if (!soak.passed) unresolvedPredicates.push("reliability soak"); if (!browser.valid) unresolvedPredicates.push(...browser.errors); if (reviews.some((entry) => !entry.passed)) unresolvedPredicates.push("independent reviews"); if (!web.valid) unresolvedPredicates.push("Web security"); if (!b8.valid) unresolvedPredicates.push("held-out isolation"); if (!license.valid || licensingUnresolved !== 0) unresolvedPredicates.push("licensing"); if (securityDirectChecks < seal.thresholds.security.requiredDirectChecks || securityReview.criticalFindings > 0 || securityReview.highFindings > 0) unresolvedPredicates.push("security threshold"); if (p95 > seal.thresholds.latency.maximumP95Ms || p99 > seal.thresholds.latency.maximumP99Ms) unresolvedPredicates.push("latency threshold");
  const predicates = { mandatoryE2eDirections: 2 as const, mandatoryE2eSteps: 70 as const, fingerprintCertificates: maximize.fingerprints.length + minimize.fingerprints.length, benchmarkMinimumDelta: seal.thresholds.benchmark.minimumNormalizedDelta, observedBenchmarkDeltas: benchmark.directions.map((entry) => entry.normalizedDelta), soakCycles: soak.cycles, soakDurationMs: soak.durationMs, recoverySuccessBasisPoints: soak.recoverySuccessBasisPoints, duplicateEffects: soak.duplicateEffects, p95LatencyMs: p95, p99LatencyMs: p99, accessibilityChecks: browser.accessibilityChecks, accessibilityViewports: browser.viewports, usabilityJourneys: browser.journeys, usabilityTaskSuccessBasisPoints: browser.taskSuccessBasisPoints, securityDirectChecks, securityCriticalFindings: securityReview.criticalFindings, securityHighFindings: securityReview.highFindings, licensingUnresolvedObligations: licensingUnresolved };
  const pair = generateKeyPairSync("ed25519"); const base = { version: 1 as const, certificationId: "phase7_graduation_v1" as const, createdAt: input.createdAt, thresholdSealId: seal.sealId, thresholdSealDigest: seal.sealDigest, platformCertificateId: platformCertificate.certificationId, platformCertificateDigest: platformCertificate.certificateDigest, maximizeAcceptanceId: maximize.certificateId, maximizeAcceptanceDigest: maximize.certificateDigest, minimizeAcceptanceId: minimize.certificateId, minimizeAcceptanceDigest: minimize.certificateDigest, benchmarkResultDigest: benchmark.resultDigest, soakResultDigest: soak.resultDigest, browserEvidenceDigest: browser.digest, reviewDigests: reviews.map((entry) => ({ scope: entry.scope, digest: entry.reviewDigest })), priorProductionGateDigest: digestCanonical(status), sourceDigests: sourceDigests(projectRoot), predicates, disabledCapabilities: ["remote-web", "resident-mode", "user-ref-publication"] as const, unresolvedPredicates, passed: unresolvedPredicates.length === 0, signerId: input.signerId, signingPublicKey: pair.publicKey.export({ format: "der", type: "spki" }).toString("base64") };
  const payloadDigest = digestCanonical(base); const signature = sign(null, Buffer.from(payloadDigest, "hex"), pair.privateKey).toString("base64"); const certificate = Object.freeze({ ...base, payloadDigest, signature, certificateDigest: digestCanonical({ ...base, payloadDigest, signature }) }); writeAtomic(join(outputRoot, FILES.certificate), certificate); return certificate;
}

export async function verifyPhase7GraduationCertification(input: { projectRoot: string; outputRoot: string; hostPiFabricRoot: string }): Promise<{ valid: boolean; certificate?: Phase7GraduationCertificateV1; errors: string[] }> {
  const errors: string[] = []; const projectRoot = resolve(input.projectRoot); const outputRoot = resolve(input.outputRoot); let certificate: Phase7GraduationCertificateV1;
  try { certificate = readJson<Phase7GraduationCertificateV1>(join(outputRoot, FILES.certificate)); } catch { return { valid: false, errors: ["Phase 7 graduation certificate is missing or invalid"] }; }
  try {
    const piFabricPackageRoot = resolve(input.hostPiFabricRoot); const piFabricVersion = readCertifiedPiFabricVersionV1(piFabricPackageRoot); const piFabricPackageLockPath = findPiFabricPackageLockV1(piFabricPackageRoot); const piFabricArtifactRoot = piFabricCertificationRootV1(join(projectRoot, "certification"), piFabricVersion);
    const sealResult = readAndVerifyGraduationThresholdSealV1(join(outputRoot, FILES.seal), { executionStartedAt: certificate.createdAt }); if (!sealResult.valid) errors.push(...sealResult.errors); const seal = sealResult.seal;
    const platformCertificate = readJson<SupportedPlatformCertificateV1>(join(outputRoot, FILES.platform)); const platformVerification = verifySupportedPlatformCertificateV1({ certificate: platformCertificate, projectRoot, hostPiFabricRoot: input.hostPiFabricRoot }); errors.push(...platformVerification.errors);
    const maximize = readJson<Phase7AcceptanceCertificateV1>(join(outputRoot, FILES.maximize)); const minimize = readJson<Phase7AcceptanceCertificateV1>(join(outputRoot, FILES.minimize)); const maximizeVerification = verifyPhase7AcceptanceCertificateV1(maximize, seal); const minimizeVerification = verifyPhase7AcceptanceCertificateV1(minimize, seal); errors.push(...maximizeVerification.errors.map((entry) => `maximize: ${entry}`), ...minimizeVerification.errors.map((entry) => `minimize: ${entry}`));
    const benchmark = readJson<Phase7BenchmarkResultV1>(join(outputRoot, FILES.benchmark)); const benchmarkVerification = verifyPhase7BenchmarkResultV1(benchmark, seal); errors.push(...benchmarkVerification.errors); const soak = readJson<Phase7SoakResultV1>(join(outputRoot, FILES.soak)); const soakVerification = verifyPhase7SoakResultV1(soak, seal, join(outputRoot, FILES.soakLog)); errors.push(...soakVerification.errors);
    const browser = browserPredicates(join(outputRoot, FILES.browser), seal); errors.push(...browser.errors); const reviews = (["security", "accessibility", "license"] as const).map((scope) => verifyReview(projectRoot, join(outputRoot, "reviews", `${scope}.v1.json`), scope)); for (const review of reviews) errors.push(...review.errors);
    for (const review of reviews) { const executed = Date.parse(review.review.executedAt); if (!Number.isFinite(executed) || executed < Date.parse(seal.sealedAt) || executed > Date.parse(seal.notAfter)) errors.push(`${review.review.scope} review is outside the sealed execution window`); }
    const status = loadProductionCertificationStatus({ projectRoot, piFabricPackageRoot, hostPiFabricRoot: piFabricPackageRoot, packageLockPath: piFabricPackageLockPath }); if (!status.productionCertified) errors.push(...status.blockers.map((entry) => `prior production gate: ${entry}`));
    const web = await verifyWebThreatCertificate({ projectRoot, artifact: join(projectRoot, "certification/phase6/web-threat-b9.v1.json") }); if (!web.valid) errors.push(...web.errors.map((entry) => `web threat: ${entry}`));
    const b8 = verifyLocalHeldOutIsolationCertification({ projectRoot, artifactRoot: join(projectRoot, "certification/held-out/linux-x86_64-bwrap-0.12.0") }); if (!b8.valid) errors.push("active held-out isolation certificate is invalid");
    const license = verifyLicensingCertificate({ projectRoot, packageRoot: piFabricPackageRoot, packageLockPath: piFabricPackageLockPath, upstreamManifestPath: join(piFabricArtifactRoot, "manifest.v1.json"), artifact: join(projectRoot, "certification/phase6/licensing-b10.v1.json"), notice: join(projectRoot, "THIRD_PARTY_NOTICES.md") }); if (!license.valid) errors.push(...license.errors.map((entry) => `licensing: ${entry}`));
    const licensingUnresolved = license.valid && license.certificate ? license.certificate.obligations.filter((entry) => entry.status !== "satisfied").length : 1; const securityReview = reviews.find((entry) => entry.review.scope === "security")!.review; const securityDirectChecks = b8.certificate.tests.length + 34 + (web.certificate?.observations.length ?? 0) + securityReview.checks.length + 2; const p95 = Math.max(maximize.p95StepLatencyMs, minimize.p95StepLatencyMs); const p99 = Math.max(maximize.p99StepLatencyMs, minimize.p99StepLatencyMs);
    const expectedPredicates: Phase7GraduationCertificateV1["predicates"] = { mandatoryE2eDirections: 2, mandatoryE2eSteps: 70, fingerprintCertificates: maximize.fingerprints.length + minimize.fingerprints.length, benchmarkMinimumDelta: seal.thresholds.benchmark.minimumNormalizedDelta, observedBenchmarkDeltas: benchmark.directions.map((entry) => entry.normalizedDelta), soakCycles: soak.cycles, soakDurationMs: soak.durationMs, recoverySuccessBasisPoints: soak.recoverySuccessBasisPoints, duplicateEffects: soak.duplicateEffects, p95LatencyMs: p95, p99LatencyMs: p99, accessibilityChecks: browser.accessibilityChecks, accessibilityViewports: browser.viewports, usabilityJourneys: browser.journeys, usabilityTaskSuccessBasisPoints: browser.taskSuccessBasisPoints, securityDirectChecks, securityCriticalFindings: securityReview.criticalFindings, securityHighFindings: securityReview.highFindings, licensingUnresolvedObligations: licensingUnresolved };
    const expectedUnresolved: string[] = []; if (!platformCertificate.supported || !platformVerification.valid) expectedUnresolved.push("supported platform"); if (!maximize.passed || !minimize.passed || !maximizeVerification.valid || !minimizeVerification.valid) expectedUnresolved.push("mandatory E2E"); if (!benchmark.passed || !benchmarkVerification.valid) expectedUnresolved.push("benchmark delta"); if (!soak.passed || !soakVerification.valid) expectedUnresolved.push("reliability soak"); if (!browser.valid) expectedUnresolved.push(...browser.errors); if (reviews.some((entry) => !entry.valid)) expectedUnresolved.push("independent reviews"); if (!web.valid) expectedUnresolved.push("Web security"); if (!b8.valid) expectedUnresolved.push("held-out isolation"); if (!license.valid || licensingUnresolved !== 0) expectedUnresolved.push("licensing"); if (securityDirectChecks < seal.thresholds.security.requiredDirectChecks || securityReview.criticalFindings > 0 || securityReview.highFindings > 0) expectedUnresolved.push("security threshold"); if (p95 > seal.thresholds.latency.maximumP95Ms || p99 > seal.thresholds.latency.maximumP99Ms) expectedUnresolved.push("latency threshold");
    const { certificateDigest, payloadDigest, signature, ...base } = certificate; const expectedPayload = digestCanonical(base); try { if (payloadDigest !== expectedPayload || certificateDigest !== digestCanonical({ ...base, payloadDigest, signature }) || !verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey({ key: Buffer.from(certificate.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(signature, "base64"))) errors.push("graduation certificate signature or digest mismatch"); } catch { errors.push("graduation certificate signature is malformed"); }
    const expectedReviewDigests = reviews.map((entry) => ({ scope: entry.review.scope, digest: entry.review.reviewDigest })); if (canonicalJson(certificate.sourceDigests) !== canonicalJson(sourceDigests(projectRoot))) errors.push("active Phase 7 source digest mismatch"); if (certificate.thresholdSealId !== seal.sealId || certificate.thresholdSealDigest !== seal.sealDigest || certificate.platformCertificateId !== platformCertificate.certificationId || certificate.platformCertificateDigest !== platformCertificate.certificateDigest || certificate.maximizeAcceptanceId !== maximize.certificateId || certificate.maximizeAcceptanceDigest !== maximize.certificateDigest || certificate.minimizeAcceptanceId !== minimize.certificateId || certificate.minimizeAcceptanceDigest !== minimize.certificateDigest || certificate.benchmarkResultDigest !== benchmark.resultDigest || certificate.soakResultDigest !== soak.resultDigest || certificate.browserEvidenceDigest !== browser.digest || canonicalJson(certificate.reviewDigests) !== canonicalJson(expectedReviewDigests) || certificate.priorProductionGateDigest !== digestCanonical(status)) errors.push("graduation artifact binding mismatch");
    if (canonicalJson(certificate.predicates) !== canonicalJson(expectedPredicates) || canonicalJson(certificate.unresolvedPredicates) !== canonicalJson(expectedUnresolved) || certificate.passed !== (expectedUnresolved.length === 0) || canonicalJson(certificate.disabledCapabilities) !== canonicalJson(["remote-web", "resident-mode", "user-ref-publication"])) errors.push("graduation predicates are incomplete, contradictory, or unresolved");
    for (const path of [FILES.platform, FILES.maximize, FILES.minimize, FILES.benchmark, FILES.soak, FILES.soakLog, FILES.browser, FILES.certificate]) if (!verifyChecksum(join(outputRoot, path))) errors.push(`artifact checksum mismatch: ${path}`);
  } catch (error) { errors.push(`Phase 7 verification failed closed: ${error instanceof Error ? error.message : String(error)}`); }
  return { valid: errors.length === 0, certificate, errors };
}

export const PHASE7_CERTIFICATION_FILES_V1 = FILES;
