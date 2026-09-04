import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { RunAggregateV1 } from "../domain/types.js";
import { RETENTION_CLASSES_V1, RETENTION_POLICY_DIGEST_V1, retentionDecision, validateRetentionClasses, type RetentionOutcomeV1 } from "../retention/policy.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

export interface RetentionCertificationObservationV1 {
  version: 1;
  retentionClassId: string;
  outcome: RetentionOutcomeV1;
  minimumDays: number | "indefinite";
  beforeEligible: boolean;
  atBoundaryEligible: boolean;
  legalHoldDenied: boolean;
  deletionRuleDigest: string;
  passed: boolean;
}

export interface RetentionCertificationV1 {
  version: 1;
  certificationId: "retention_b12_v1";
  createdAt: string;
  policyDigest: string;
  sourceDigests: Array<{ path: string; digest: string }>;
  observations: RetentionCertificationObservationV1[];
  validationErrors: string[];
  explicitLegalHoldRule: string;
  passed: boolean;
  signerId: string;
  limitations: string[];
  certificateDigest: string;
}

const FILE = "retention-b12.v1.json";
const SOURCES = [
  "src/retention/policy.ts",
  "src/cleanup/ManifestCleanupAdapter.ts",
  "scripts/atomic-cleanup.py",
  "src/application/ArborApplication.ts",
  "src/reports/FileReportPublisher.ts",
  "docs/adr/0003-storage-reports-retention-cleanup.md",
  "src/certification/retention.ts",
] as const;

function sourceDigests(projectRoot: string): Array<{ path: string; digest: string }> {
  return SOURCES.map((path) => ({ path, digest: sha256(readFileSync(join(projectRoot, path))) }));
}

function runFor(retentionClassId: string, outcome: RetentionOutcomeV1, updatedAt: string): Pick<RunAggregateV1, "contract" | "outcome" | "updatedAt"> {
  return {
    contract: { retentionClass: retentionClassId } as RunAggregateV1["contract"],
    ...(outcome === "PENDING" ? {} : { outcome }),
    updatedAt,
  };
}

export function executeRetentionCertificationMatrix(): RetentionCertificationObservationV1[] {
  const updatedAt = "2026-01-01T00:00:00.000Z";
  const observations: RetentionCertificationObservationV1[] = [];
  for (const policy of RETENTION_CLASSES_V1) {
    for (const rule of policy.rules) {
      const run = runFor(policy.retentionClassId, rule.outcome, updatedAt);
      const legalHoldDenied = !retentionDecision(run, "2126-01-01T00:00:00.000Z", true).eligible;
      let beforeEligible = false;
      let atBoundaryEligible = false;
      if (rule.minimumDays === "indefinite") {
        beforeEligible = retentionDecision(run, "2126-01-01T00:00:00.000Z").eligible;
        atBoundaryEligible = beforeEligible;
      } else {
        const boundary = Date.parse(updatedAt) + rule.minimumDays * 86_400_000;
        beforeEligible = retentionDecision(run, new Date(Math.max(Date.parse(updatedAt), boundary - 1)).toISOString()).eligible;
        atBoundaryEligible = retentionDecision(run, new Date(boundary).toISOString()).eligible;
      }
      const passed = legalHoldDenied && (rule.minimumDays === "indefinite" ? !beforeEligible && !atBoundaryEligible : !beforeEligible || rule.minimumDays === 0) && (rule.minimumDays === "indefinite" ? !atBoundaryEligible : atBoundaryEligible) && rule.retainedEvidence.length > 0 && rule.deletionRule.length > 0;
      observations.push({
        version: 1,
        retentionClassId: policy.retentionClassId,
        outcome: rule.outcome,
        minimumDays: rule.minimumDays,
        beforeEligible,
        atBoundaryEligible,
        legalHoldDenied,
        deletionRuleDigest: digestCanonical({ deletionRule: rule.deletionRule, retainedEvidence: rule.retainedEvidence }),
        passed,
      });
    }
  }
  return observations;
}

export function generateRetentionCertification(input: { projectRoot?: string; createdAt: string; signerId: string }): RetentionCertificationV1 {
  const projectRoot = resolve(input.projectRoot ?? process.cwd());
  const observations = executeRetentionCertificationMatrix();
  const validationErrors = validateRetentionClasses();
  const base = {
    version: 1 as const,
    certificationId: "retention_b12_v1" as const,
    createdAt: input.createdAt,
    policyDigest: RETENTION_POLICY_DIGEST_V1,
    sourceDigests: sourceDigests(projectRoot),
    observations,
    validationErrors,
    explicitLegalHoldRule: "A legal hold always overrides elapsed duration and prohibits deletion until an authorized release is recorded.",
    passed: validationErrors.length === 0 && observations.length === RETENTION_CLASSES_V1.length * 8 && observations.every((entry) => entry.passed),
    signerId: input.signerId,
    limitations: ["The certificate proves the package policy table and decision boundaries. Organization-specific statutory or contractual schedules remain an administrator responsibility."],
  };
  return { ...base, certificateDigest: digestCanonical(base) };
}

export function writeRetentionCertification(path: string, certificate: RetentionCertificationV1): void {
  const target = resolve(path); mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const raw = `${canonicalJson(certificate)}\n`; const temporary = `${target}.tmp`;
  writeFileSync(temporary, raw, { mode: 0o600 }); renameSync(temporary, target);
  writeFileSync(`${target}.sha256`, `${sha256(raw)}  ${FILE}\n`, { mode: 0o600 });
}

export function verifyRetentionCertification(input: { projectRoot?: string; artifact: string }): { valid: boolean; certificate?: RetentionCertificationV1; errors: string[] } {
  let certificate: RetentionCertificationV1; let raw: string;
  try { raw = readFileSync(resolve(input.artifact), "utf8"); certificate = JSON.parse(raw) as RetentionCertificationV1; }
  catch { return { valid: false, errors: ["retention certificate is missing or invalid JSON"] }; }
  const errors: string[] = []; const projectRoot = resolve(input.projectRoot ?? process.cwd());
  const { certificateDigest, ...unsigned } = certificate;
  if (certificateDigest !== digestCanonical(unsigned)) errors.push("certificate digest mismatch");
  if (canonicalJson(certificate.sourceDigests) !== canonicalJson(sourceDigests(projectRoot))) errors.push("active retention source digest mismatch");
  if (certificate.policyDigest !== RETENTION_POLICY_DIGEST_V1) errors.push("active retention policy digest mismatch");
  const observations = executeRetentionCertificationMatrix();
  if (canonicalJson(observations) !== canonicalJson(certificate.observations)) errors.push("retention decision matrix is not reproducible");
  if (certificate.validationErrors.length > 0 || validateRetentionClasses().length > 0) errors.push("retention policy table is incomplete");
  if (!certificate.passed || !observations.every((entry) => entry.passed)) errors.push("retention matrix did not pass");
  try { const checksum = readFileSync(`${resolve(input.artifact)}.sha256`, "utf8").trim().split(/\s+/u)[0]; if (checksum !== sha256(raw)) errors.push("artifact checksum mismatch"); }
  catch { errors.push("retention certificate checksum is missing"); }
  return { valid: errors.length === 0, certificate, errors };
}
