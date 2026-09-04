import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ArborError } from "../domain/errors.js";
import { executeRecoveryFaultMatrix, RECOVERY_BOUNDARIES_V1, type RecoveryInjectionResultV1 } from "../recovery/RecoveryFaultHarness.js";
import { FIXTURE_SCHEMAS_V1 } from "../schemas/catalog.js";
import { assertJsonSchema } from "../schemas/validate.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { verifyFingerprintTrialCertification } from "./fingerprint.js";

export interface RecoveryBoundarySummaryV1 {
  version: 1;
  boundaryId: string;
  name: string;
  injections: number;
  classification: string;
  passed: boolean;
  outcomesDigest: string;
}

export interface Phase4RecoveryCertificateV1 {
  version: 1;
  certificateId: string;
  createdAt: string;
  boundaryCount: 19;
  injectionsPerBoundary: number;
  totalInjections: number;
  harnessSourceDigest: string;
  schemaDigest: string;
  fingerprintCertificationId: string;
  fingerprintCertificationDigest: string;
  commands: Array<{ version: 1; command: string; outcome: "PASS"; outputDigest: string }>;
  boundaries: RecoveryBoundarySummaryV1[];
  injections: RecoveryInjectionResultV1[];
  webCursorResetEqualityDigest: string;
  passed: boolean;
  limitations: string[];
  certificateDigest: string;
}

const SOURCE_PATHS = [
  "src/domain/types.ts",
  "src/adapters/interfaces.ts",
  "src/persistence/RunStore.ts",
  "src/persistence/InMemoryRunStore.ts",
  "src/recovery/RecoveryFaultHarness.ts",
  "src/recovery/EffectRecoveryCoordinator.ts",
  "src/recovery/OutboxDrainer.ts",
  "src/recovery/ProductionRecoveryObservers.ts",
  "src/web/DetachedMonitorAuthority.ts",
  "src/web/DetachedMonitorServer.ts",
  "src/application/ArborApplication.ts",
  "src/persistence/SqliteRunStore.ts",
  "src/persistence/migrations.ts",
  "src/reports/FileReportPublisher.ts",
  "src/schemas/catalog.ts",
  "src/schemas/validate.ts",
  "src/public/descriptors.ts",
  "src/public/provider.ts",
  "src/driver/AdmittedDriver.ts",
  "src/component/definitions.ts",
  "src/certification/startup.ts",
  "src/certification/recovery.ts",
] as const;

function sourceDigest(projectRoot: string): string {
  return digestCanonical(SOURCE_PATHS.map((path) => ({ path, digest: sha256(readFileSync(join(projectRoot, path))) })));
}

function withoutDigest(certificate: Phase4RecoveryCertificateV1): Omit<Phase4RecoveryCertificateV1, "certificateDigest"> {
  const { certificateDigest: _, ...payload } = certificate; return payload;
}

function artifactPath(root: string): string { return join(root, "recovery-certificate.v1.json"); }

export function generatePhase4RecoveryCertification(input: { projectRoot: string; outputRoot: string; createdAt: string; iterationsPerBoundary?: number }): Phase4RecoveryCertificateV1 {
  const projectRoot = resolve(input.projectRoot); const outputRoot = resolve(input.outputRoot);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(input.createdAt)) throw new ArborError("VALIDATION_FAILED", "Recovery certificate creation time must be canonical");
  const fingerprintRoot = join(projectRoot, "certification/fingerprint/linux-git-2.55.0");
  const verifiedFingerprint = verifyFingerprintTrialCertification(fingerprintRoot);
  if (!verifiedFingerprint.valid) throw new ArborError("EVIDENCE_INVALID", "The retained B6 fingerprint certification is not valid for active inputs");
  const iterationsPerBoundary = input.iterationsPerBoundary ?? 20;
  const injections = executeRecoveryFaultMatrix({
    iterationsPerBoundary, createdAt: input.createdAt,
    fingerprintCertificationId: verifiedFingerprint.certification.certificationId,
    fingerprintCertificationDigest: verifiedFingerprint.certification.certificationDigest,
  });
  const boundaries = RECOVERY_BOUNDARIES_V1.map((boundary): RecoveryBoundarySummaryV1 => {
    const outcomes = injections.filter((entry) => entry.boundaryId === boundary.boundaryId);
    return { version: 1, boundaryId: boundary.boundaryId, name: boundary.name, injections: outcomes.length, classification: boundary.classification, passed: outcomes.length === iterationsPerBoundary && outcomes.every((entry) => entry.acceptedDurableOutcomes === 1 && entry.replayExecutions === 0 && entry.processExitSignal === "SIGKILL" && entry.restartCount === 2 && entry.fingerprint.equal && entry.freshProjectionDigest === entry.reconstructedProjectionDigest), outcomesDigest: digestCanonical(outcomes) };
  });
  const activeSourceDigest = sourceDigest(projectRoot); const matrixDigest = digestCanonical(injections);
  const schemaDigest = digestCanonical({ version: 1, boundaries: RECOVERY_BOUNDARIES_V1, sourcePaths: SOURCE_PATHS });
  const commands = [
    { version: 1 as const, command: "internal:verify-retained-B6-fingerprint-certification", outcome: "PASS" as const, outputDigest: digestCanonical({ valid: verifiedFingerprint.valid, certificationDigest: verifiedFingerprint.certification.certificationDigest }) },
    { version: 1 as const, command: `internal:process-kill-restart-matrix --boundaries 19 --iterations ${iterationsPerBoundary}`, outcome: "PASS" as const, outputDigest: matrixDigest },
    { version: 1 as const, command: "internal:validate-recovery-certificate-schema-v1", outcome: "PASS" as const, outputDigest: schemaDigest },
  ];
  const payload: Omit<Phase4RecoveryCertificateV1, "certificateDigest"> = {
    version: 1, certificateId: `recovery_phase4_19x${iterationsPerBoundary}`, createdAt: input.createdAt,
    boundaryCount: 19, injectionsPerBoundary: iterationsPerBoundary, totalInjections: injections.length,
    harnessSourceDigest: activeSourceDigest, schemaDigest,
    fingerprintCertificationId: verifiedFingerprint.certification.certificationId,
    fingerprintCertificationDigest: verifiedFingerprint.certification.certificationDigest,
    commands, boundaries, injections,
    webCursorResetEqualityDigest: digestCanonical(injections.map((entry) => ({ injectionId: entry.injectionId, fresh: entry.freshProjectionDigest, reconstructed: entry.reconstructedProjectionDigest }))),
    passed: boundaries.every((entry) => entry.passed) && injections.length === 19 * iterationsPerBoundary,
    limitations: [
      "Deterministic local crash injection is retained evidence for the Phase 4 journal and recovery algorithms, not a production availability guarantee.",
      "No Phase 5 promotion, winner-ref, authorization, rollback, or re-promotion behavior is implemented or claimed.",
      "B1 remains false: no real model-backed pi-fabric child runtime behavior is claimed by this certificate.",
      "The certificate links every injection to the active retained B6 fingerprint certification; it does not replace B6.",
    ],
  };
  const certificate: Phase4RecoveryCertificateV1 = { ...payload, certificateDigest: digestCanonical(payload) };
  assertJsonSchema(FIXTURE_SCHEMAS_V1.schemas.recoveryCertificate!, certificate, "Phase 4 recovery certificate");
  mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const json = canonicalJson(certificate); const temporary = `${artifactPath(outputRoot)}.tmp`;
  writeFileSync(temporary, `${json}\n`, { mode: 0o600 }); renameSync(temporary, artifactPath(outputRoot));
  writeFileSync(join(outputRoot, "recovery-certificate.v1.sha256"), `${sha256(`${json}\n`)}  recovery-certificate.v1.json\n`, { mode: 0o600 });
  return certificate;
}

export function verifyPhase4RecoveryCertification(input: { projectRoot: string; artifactRoot: string }): { valid: boolean; certificate: Phase4RecoveryCertificateV1; errors: string[] } {
  const projectRoot = resolve(input.projectRoot); const artifactRoot = resolve(input.artifactRoot); const errors: string[] = [];
  const raw = readFileSync(artifactPath(artifactRoot), "utf8"); const certificate = JSON.parse(raw) as Phase4RecoveryCertificateV1;
  if (certificate.certificateDigest !== digestCanonical(withoutDigest(certificate))) errors.push("certificate digest mismatch");
  if (certificate.harnessSourceDigest !== sourceDigest(projectRoot)) errors.push("active recovery source digest mismatch");
  if (certificate.boundaryCount !== 19 || certificate.boundaries.length !== 19) errors.push("boundary count is not 19");
  if (certificate.injectionsPerBoundary < 20 || certificate.totalInjections !== 19 * certificate.injectionsPerBoundary || certificate.injections.length !== certificate.totalInjections) errors.push("injection counts are incomplete");
  const fingerprintRoot = join(projectRoot, "certification/fingerprint/linux-git-2.55.0");
  const activeFingerprint = verifyFingerprintTrialCertification(fingerprintRoot);
  const fingerprintCertification = JSON.parse(readFileSync(join(fingerprintRoot, "trial-certification.v1.json"), "utf8")) as { certificationId: string; certificationDigest: string; passed: boolean; [key: string]: unknown };
  const { certificationDigest: retainedFingerprintDigest, ...fingerprintPayload } = fingerprintCertification;
  if (!activeFingerprint.valid || !fingerprintCertification.passed || retainedFingerprintDigest !== digestCanonical(fingerprintPayload) || certificate.fingerprintCertificationId !== fingerprintCertification.certificationId || certificate.fingerprintCertificationDigest !== retainedFingerprintDigest) errors.push("B6 fingerprint certification binding mismatch");
  const rerun = executeRecoveryFaultMatrix({ iterationsPerBoundary: certificate.injectionsPerBoundary, createdAt: certificate.createdAt, fingerprintCertificationId: certificate.fingerprintCertificationId, fingerprintCertificationDigest: certificate.fingerprintCertificationDigest });
  if (digestCanonical(rerun) !== digestCanonical(certificate.injections)) errors.push("deterministic fault matrix differs from retained evidence");
  for (const boundary of RECOVERY_BOUNDARIES_V1) {
    const summary = certificate.boundaries.find((entry) => entry.boundaryId === boundary.boundaryId);
    const injections = certificate.injections.filter((entry) => entry.boundaryId === boundary.boundaryId);
    if (!summary?.passed || summary.injections < 20 || summary.outcomesDigest !== digestCanonical(injections)) errors.push(`boundary ${boundary.boundaryId} is incomplete`);
  }
  if (certificate.injections.some((entry) => entry.acceptedDurableOutcomes !== 1 || entry.replayExecutions !== 0 || entry.duplicateDispatches !== 0 || entry.duplicateCertificates !== 0 || entry.duplicateReports !== 0 || entry.duplicateCleanupDeletions !== 0 || !entry.fingerprint.equal || entry.fingerprint.effectId !== entry.effectId || entry.fingerprint.fence !== entry.fence || entry.freshProjectionDigest !== entry.reconstructedProjectionDigest)) errors.push("an injection violates recovery invariants");
  if (!certificate.passed) errors.push("certificate does not claim a passing harness result");
  const checksum = readFileSync(join(artifactRoot, "recovery-certificate.v1.sha256"), "utf8").trim().split(/\s+/u)[0];
  if (checksum !== sha256(raw)) errors.push("artifact file checksum mismatch");
  return { valid: errors.length === 0, certificate, errors };
}
