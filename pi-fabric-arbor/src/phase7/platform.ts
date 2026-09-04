import { execFileSync } from "node:child_process";
import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { arch, platform, release } from "node:os";
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyLocalContainmentCertification } from "../certification/containment.js";
import { collectCompatibilityRuntimeEvidence, computeRuntimePackageDigest } from "../certification/runtime-evidence.js";
import { findPiFabricPackageLockV1, piFabricCertificationRootV1, readCertifiedPiFabricVersionV1, type CertifiedPiFabricVersionV1 } from "../certification/pi-fabric-support.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

export interface SupportedPlatformCertificateV1 {
  version: 1;
  certificationId: string;
  createdAt: string;
  supportClass: "linux-x86_64-current-host";
  platform: { os: string; architecture: string; kernel: string; node: string; git: string; bwrap: string };
  binaries: { node: string; git: string; bwrap: string };
  piFabric: { version: CertifiedPiFabricVersionV1; projectPackageDigest: string; hostPackageDigest: string; packageLockDigest: string; runtimeEvidenceDigest: string; approvalEvidenceDigest: string; integrationEvidenceDigest: string };
  packageJsonDigest: string;
  packageLockDigest: string;
  containmentCertificateId: string;
  containmentCertificateDigest: string;
  sourceDigest: string;
  supported: boolean;
  limitations: string[];
  signerId: string;
  signingPublicKey: string;
  payloadDigest: string;
  signature: string;
  certificateDigest: string;
}

function version(executable: string, args: string[]): string { return execFileSync(executable, args, { encoding: "utf8", timeout: 10_000, maxBuffer: 65_536 }).trim(); }
function unsigned(certificate: SupportedPlatformCertificateV1): Omit<SupportedPlatformCertificateV1, "payloadDigest" | "signature" | "certificateDigest"> { const { payloadDigest: _, signature: _s, certificateDigest: _d, ...value } = certificate; return value; }

function generateActivePlatformProjection(projectRoot: string, hostPiFabricRoot: string) {
  const nodePath = realpathSync(process.execPath); const gitPath = realpathSync("/usr/bin/git"); const bwrapPath = realpathSync("/usr/bin/bwrap"); const packageRoot = realpathSync(resolve(hostPiFabricRoot));
  const piFabricVersion = readCertifiedPiFabricVersionV1(packageRoot); const packageSnapshot = computeRuntimePackageDigest(packageRoot); const artifactRoot = piFabricCertificationRootV1(join(projectRoot, "certification"), piFabricVersion);
  const runtime = collectCompatibilityRuntimeEvidence({ projectRoot, packageRoot, hostPackageRoot: packageRoot, hostAgentArtifact: join(artifactRoot, "artifacts/host-runtime-evidence.v1.json"), approvalArtifact: join(artifactRoot, "artifacts/approval-runtime-evidence.v1.json"), hostIntegrationArtifact: join(artifactRoot, "artifacts/host-integration-runtime.v1.json") });
  return {
    platform: { os: platform(), architecture: arch(), kernel: release(), node: process.version, git: version(gitPath, ["--version"]), bwrap: version(bwrapPath, ["--version"]) },
    binaries: { node: sha256(readFileSync(nodePath)), git: sha256(readFileSync(gitPath)), bwrap: sha256(readFileSync(bwrapPath)) },
    piFabric: { version: piFabricVersion, projectPackageDigest: packageSnapshot.digest, hostPackageDigest: packageSnapshot.digest, packageLockDigest: sha256(readFileSync(findPiFabricPackageLockV1(packageRoot))), runtimeEvidenceDigest: runtime.bindings.hostAgentArtifactDigest, approvalEvidenceDigest: runtime.bindings.approvalArtifactDigest, integrationEvidenceDigest: runtime.bindings.hostIntegrationArtifactDigest },
  };
}

export function generateSupportedPlatformCertificateV1(input: { projectRoot: string; hostPiFabricRoot: string; createdAt: string; signerId: string }): SupportedPlatformCertificateV1 {
  const projectRoot = realpathSync(input.projectRoot); const containment = verifyLocalContainmentCertification(join(projectRoot, "certification/containment/linux-x86_64-bwrap-0.12.0")); const active = generateActivePlatformProjection(projectRoot, input.hostPiFabricRoot);
  const pair = generateKeyPairSync("ed25519"); const base = {
    version: 1 as const, certificationId: "platform_linux_x86_64_phase7_v1", createdAt: input.createdAt, supportClass: "linux-x86_64-current-host" as const,
    ...active,
    packageJsonDigest: sha256(readFileSync(join(projectRoot, "package.json"))), packageLockDigest: sha256(readFileSync(join(projectRoot, "package-lock.json"))), containmentCertificateId: containment.certificate.certificateId, containmentCertificateDigest: containment.certificate.certificateDigest,
    sourceDigest: sha256(readFileSync(new URL(import.meta.url))), supported: containment.valid && active.platform.os === "linux" && active.platform.architecture === "x64",
    limitations: ["Certified only for the exact retained host package, package lock, OS/kernel, runtime binaries, containment certificate, and version-specific B1 artifacts."], signerId: input.signerId, signingPublicKey: pair.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
  };
  const payloadDigest = digestCanonical(base); const signature = sign(null, Buffer.from(payloadDigest, "hex"), pair.privateKey).toString("base64");
  return Object.freeze({ ...base, payloadDigest, signature, certificateDigest: digestCanonical({ ...base, payloadDigest, signature }) });
}

export function verifySupportedPlatformCertificateV1(input: { certificate: SupportedPlatformCertificateV1; projectRoot: string; hostPiFabricRoot: string }): { valid: boolean; errors: string[] } {
  const errors: string[] = []; const certificate = input.certificate; const base = unsigned(certificate); const payloadDigest = digestCanonical(base);
  try { if (certificate.payloadDigest !== payloadDigest || certificate.certificateDigest !== digestCanonical({ ...base, payloadDigest, signature: certificate.signature }) || !verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey({ key: Buffer.from(certificate.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(certificate.signature, "base64"))) errors.push("platform certificate signature or digest mismatch"); } catch { errors.push("platform certificate signature is malformed"); }
  try {
    const projectRoot = realpathSync(input.projectRoot); const expected = generateActivePlatformProjection(projectRoot, input.hostPiFabricRoot);
    if (canonicalJson(certificate.platform) !== canonicalJson(expected.platform) || canonicalJson(certificate.binaries) !== canonicalJson(expected.binaries)) errors.push("active OS/kernel/runtime binary identity mismatch");
    if (canonicalJson(certificate.piFabric) !== canonicalJson(expected.piFabric) || certificate.piFabric.projectPackageDigest !== certificate.piFabric.hostPackageDigest) errors.push("active pi-fabric version, payload, lock, or B1 evidence mismatch");
    if (certificate.packageJsonDigest !== sha256(readFileSync(join(projectRoot, "package.json"))) || certificate.packageLockDigest !== sha256(readFileSync(join(projectRoot, "package-lock.json")))) errors.push("active package manifest or lock mismatch");
    const containment = verifyLocalContainmentCertification(join(projectRoot, "certification/containment/linux-x86_64-bwrap-0.12.0")); if (!containment.valid || certificate.containmentCertificateId !== containment.certificate.certificateId || certificate.containmentCertificateDigest !== containment.certificate.certificateDigest) errors.push("active containment certificate mismatch");
    if (certificate.sourceDigest !== sha256(readFileSync(new URL(import.meta.url)))) errors.push("platform certifier source mismatch");
  } catch (error) { errors.push(`active platform projection failed: ${error instanceof Error ? error.message : String(error)}`); }
  if (!certificate.supported || certificate.supportClass !== "linux-x86_64-current-host") errors.push("platform is not marked supported");
  return { valid: errors.length === 0, errors };
}
