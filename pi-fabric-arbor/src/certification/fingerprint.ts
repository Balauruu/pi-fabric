import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, platform, arch, release } from "node:os";
import { join, resolve } from "node:path";
import { Ed25519FingerprintSigner, FingerprintBoundaryGuard, REPOSITORY_FINGERPRINT_ORACLE_DIGEST_V1, REPOSITORY_FINGERPRINT_SCHEMA_DIGEST_V1, REPOSITORY_FINGERPRINT_TOOL_DIGEST_V1, publicRepositoryFingerprintCertificate, verifyRepositoryFingerprintCertificate, type RepositoryFingerprintCertificateV1 } from "../git/fingerprint.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

export interface FingerprintTrialCertificationV1 {
  version: 1;
  certificationId: string;
  createdAt: string;
  platform: { os: string; architecture: string; release: string; node: string; git: string };
  trialCount: 100;
  dirtyFixture: { tracked: true; untracked: true; stash: true; siblingWorktree: true; userRef: true };
  fingerprintSchemaDigest: string;
  fingerprintToolDigest: string;
  oracleToolDigest: string;
  certificatesDigest: string;
  firstCertificateId: string;
  finalCertificateId: string;
  finalCertificateDigest: string;
  quarantines: number;
  passed: boolean;
  signerId: string;
  certificationDigest: string;
}

function git(cwd: string, ...args: string[]): string { return execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8", env: { PATH: "/usr/bin:/bin", HOME: join(cwd, ".cert-home"), GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0", LANG: "C" } }).trim(); }
function atomic(path: string, content: string): void { const temporary = `${path}.tmp-${process.pid}`; writeFileSync(temporary, content, { mode: 0o600 }); renameSync(temporary, path); }

export async function generateFingerprintTrialCertification(input: { outputRoot: string; createdAt: string; signerId: string }): Promise<FingerprintTrialCertificationV1> {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "arbor-fingerprint-cert-"));
  try {
    const source = join(fixtureRoot, "source"); const sibling = join(fixtureRoot, "sibling"); const state = join(fixtureRoot, "state");
    mkdirSync(source); mkdirSync(state); git(source, "init", "-q"); git(source, "config", "user.email", "cert@example.invalid"); git(source, "config", "user.name", "Certificate");
    writeFileSync(join(source, "tracked.txt"), "base\n"); git(source, "add", "."); git(source, "commit", "-qm", "base"); git(source, "branch", "sibling"); git(source, "worktree", "add", "-q", sibling, "sibling");
    writeFileSync(join(source, "stash.txt"), "stash\n"); git(source, "add", "stash.txt"); git(source, "stash", "push", "-qm", "certificate-stash");
    writeFileSync(join(source, "tracked.txt"), "dirty\n"); writeFileSync(join(source, "untracked.txt"), "untracked\n"); writeFileSync(join(sibling, "sibling-untracked.txt"), "sibling\n"); git(source, "update-ref", "refs/users/certificate", git(source, "rev-parse", "HEAD"));
    const signer = new Ed25519FingerprintSigner(input.signerId); let quarantines = 0; let predecessor: string | undefined;
    const guard = new FingerprintBoundaryGuard({ checkout: source, stateRoot: state }, signer, () => { quarantines += 1; });
    const certificates: RepositoryFingerprintCertificateV1[] = [];
    for (let ordinal = 1; ordinal <= 100; ordinal += 1) {
      const certificate = (await guard.run({ certificateId: `fingerprint_trial_${ordinal}`, runId: "run_fingerprint_cert", boundaryId: `boundary_trial_${ordinal}`, boundaryKind: "certificationNoop", effectId: `effect_trial_${ordinal}`, commandId: `command_trial_${ordinal}`, correlationIds: [`correlation_trial_${ordinal}`], fence: 1, expectedRevision: ordinal, containmentId: "containment_certified", packageRepositoryIdentityDigest: sha256("package-repository-fixture"), reportGenerationId: "report_fingerprint_cert", ...(predecessor ? { previousCertificateDigest: predecessor } : {}) }, async () => undefined)).certificate;
      certificates.push(publicRepositoryFingerprintCertificate(certificate)); predecessor = certificate.certificateDigest;
    }
    const certificatesDigest = digestCanonical(certificates);
    const base = {
      version: 1 as const, certificationId: "fingerprint_trials_linux_100", createdAt: input.createdAt,
      platform: { os: platform(), architecture: arch(), release: release(), node: process.version, git: git(source, "--version") }, trialCount: 100 as const,
      dirtyFixture: { tracked: true as const, untracked: true as const, stash: true as const, siblingWorktree: true as const, userRef: true as const },
      fingerprintSchemaDigest: REPOSITORY_FINGERPRINT_SCHEMA_DIGEST_V1, fingerprintToolDigest: REPOSITORY_FINGERPRINT_TOOL_DIGEST_V1, oracleToolDigest: REPOSITORY_FINGERPRINT_ORACLE_DIGEST_V1,
      certificatesDigest, firstCertificateId: certificates[0]!.certificateId, finalCertificateId: certificates.at(-1)!.certificateId, finalCertificateDigest: certificates.at(-1)!.certificateDigest,
      quarantines, passed: quarantines === 0 && certificates.length === 100 && certificates.every((certificate) => certificate.equal && verifyRepositoryFingerprintCertificate(certificate)), signerId: input.signerId,
    };
    const certification: FingerprintTrialCertificationV1 = { ...base, certificationDigest: digestCanonical(base) };
    const outputRoot = resolve(input.outputRoot); mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
    atomic(join(outputRoot, "fingerprint-certificates.v1.json"), `${canonicalJson(certificates)}\n`);
    atomic(join(outputRoot, "trial-certification.v1.json"), `${canonicalJson(certification)}\n`);
    atomic(join(outputRoot, "trial-certification.v1.sha256"), `${sha256(Buffer.from(`${canonicalJson(certification)}\n`))}  trial-certification.v1.json\n`);
    return certification;
  } finally { rmSync(fixtureRoot, { recursive: true, force: true }); }
}

export function verifyFingerprintTrialCertification(artifactRoot: string): { valid: boolean; certification: FingerprintTrialCertificationV1 } {
  const certification = JSON.parse(readFileSync(join(artifactRoot, "trial-certification.v1.json"), "utf8")) as FingerprintTrialCertificationV1;
  const certificates = JSON.parse(readFileSync(join(artifactRoot, "fingerprint-certificates.v1.json"), "utf8")) as RepositoryFingerprintCertificateV1[];
  const { certificationDigest, ...base } = certification;
  let predecessor = sha256("pi-fabric-arbor-fingerprint-certificate-chain-root-v1");
  const validChain = certificates.every((certificate) => { const valid = certificate.previousCertificateDigest === predecessor && verifyRepositoryFingerprintCertificate(certificate) && certificate.equal; predecessor = certificate.certificateDigest; return valid; });
  return { valid: certificationDigest === digestCanonical(base) && certification.passed && certification.trialCount === certificates.length && certification.certificatesDigest === digestCanonical(certificates) && validChain && certification.finalCertificateDigest === predecessor, certification };
}
