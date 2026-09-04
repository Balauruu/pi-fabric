export * from "./thresholds.js";
export * from "./resources.js";
export * from "./benchmark.js";
export * from "./soak.js";
export * from "./platform.js";
export * from "./acceptance.js";
export * from "./acceptance-evidence.js";
export * from "./schemas.js";

import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve, sep } from "node:path";
import { loadProductionCertificationStatus, type ProductionCertificationStatusV1 } from "../certification/startup.js";
import { verifyPhase7GraduationCertification, type Phase7GraduationCertificateV1 } from "../certification/phase7.js";
import { verifyApprovalRuntimeCertificate } from "../certification/approval-runtime.js";
import { verifyDistributionCertificate, inspectDistribution } from "../certification/distribution.js";
import { verifyLicensingCertificate } from "../certification/licensing.js";
import { verifyRetentionCertification } from "../certification/retention.js";
import { verifyWebThreatCertificate } from "../certification/web.js";
import { digestCanonical, sha256 } from "../util/canonical.js";
import { productionFingerprintWrappersPresent } from "../git/guarded-adapters.js";
import { productionAdapterIdentityDigestV1, productionConfigurationDigestV1, type ProductionApplicationBindingsV1 } from "../application/ProductionAdmission.js";
import type { RuntimeAdmissionEvidenceV1 } from "../domain/types.js";
import { findPiFabricPackageLockV1, piFabricCertificationRootV1, readCertifiedPiFabricVersionV1 } from "../certification/pi-fabric-support.js";

export type { ProductionAdmissionV1, ProductionApplicationBindingsV1, ProductionConfigurationV1, ProductionDispatchPolicyV1 } from "../application/ProductionAdmission.js";

export interface GraduatedProductionStatusV1 {
  version: 1;
  prior: ProductionCertificationStatusV1;
  graduationCertified: boolean;
  releaseCertified: boolean;
  productionCertified: boolean;
  realAgentsEnabled: boolean;
  graduationCertificateId?: string;
  release: {
    webCertified: boolean;
    approvalRuntimeCertified: boolean;
    licensingCertified: boolean;
    retentionCertified: boolean;
    distributionCertified: boolean;
    packagedDistDigest: string;
    executedEntrypointDigest: string;
    certificateIds: string[];
    certificateDigests: string[];
  };
  admissionEvidence?: RuntimeAdmissionEvidenceV1;
  blockers: string[];
}

function exactExecutedEntrypoint(projectRoot: string, files: Array<{ path: string; size: number; mode: number; digest: string }>): { digest: string; packagedDistDigest: string; error?: string } {
  const executed = realpathSync(fileURLToPath(import.meta.url));
  const expected = realpathSync(join(projectRoot, "dist/src/phase7/index.js"));
  const distFiles = files.filter((entry) => entry.path.startsWith("dist/")).map((entry) => ({ path: entry.path, size: entry.size, mode: entry.mode, digest: entry.digest, activeDigest: sha256(readFileSync(join(projectRoot, entry.path))) }));
  const packagedDistDigest = digestCanonical(distFiles.map(({ activeDigest: _activeDigest, ...entry }) => entry));
  if (distFiles.some((entry) => entry.digest !== entry.activeDigest)) return { digest: sha256(readFileSync(executed)), packagedDistDigest, error: "active dist bytes differ from the certified npm package inventory" };
  const rel = relative(projectRoot, executed);
  if (executed !== expected || rel === ".." || rel.startsWith(`..${sep}`)) return { digest: sha256(readFileSync(executed)), packagedDistDigest, error: "admission verifier is not executing the packaged dist/src/phase7/index.js bytes" };
  const inventory = distFiles.find((entry) => entry.path === "dist/src/phase7/index.js");
  const digest = sha256(readFileSync(executed));
  if (!inventory || inventory.digest !== digest) return { digest, packagedDistDigest, error: "executed admission verifier is absent from or differs from the npm distribution inventory" };
  return { digest, packagedDistDigest };
}

function retainedCertificateDigest(path: string): string {
  const value = JSON.parse(readFileSync(path, "utf8")) as { certificateDigest?: string; certificationDigest?: string; resultDigest?: string; sealDigest?: string };
  const digest = value.certificateDigest ?? value.certificationDigest ?? value.resultDigest ?? value.sealDigest;
  if (!digest || !/^[a-f0-9]{64}$/u.test(digest)) throw new Error(`retained artifact has no certificate digest: ${path}`);
  return digest;
}

function canonicalTreeDigest(root: string): string {
  const files: Array<{ path: string; mode: number; digest: string }> = [];
  const walk = (directory: string, prefix = ""): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name); const relativePath = prefix ? `${prefix}/${name}` : name; const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`production digest tree contains a symlink: ${relativePath}`);
      if (stat.isDirectory()) walk(path, relativePath);
      else if (stat.isFile()) files.push({ path: relativePath, mode: stat.mode & 0o777, digest: sha256(readFileSync(path)) });
      if (files.length > 100_000) throw new Error("production digest tree exceeds 100000 files");
    }
  };
  walk(resolve(root)); return digestCanonical(files);
}

/** Phase 7 production admission. Earlier startup status remains available for certificate generation only. */
export async function loadGraduatedProductionStatusV1(input: { projectRoot: string; piFabricPackageRoot: string; hostPiFabricRoot: string; artifactRoot?: string; bindings?: ProductionApplicationBindingsV1 }): Promise<GraduatedProductionStatusV1> {
  const projectRoot = resolve(input.projectRoot); const artifactRoot = resolve(input.artifactRoot ?? join(projectRoot, "certification"));
  const packageRoot = resolve(input.piFabricPackageRoot); const hostPackageRoot = resolve(input.hostPiFabricRoot); const prior = loadProductionCertificationStatus({ projectRoot, piFabricPackageRoot: packageRoot, hostPiFabricRoot: hostPackageRoot, artifactRoot });
  let piFabricVersion: ReturnType<typeof readCertifiedPiFabricVersionV1>; let packageLockPath: string; let piFabricArtifactRoot: string;
  try { piFabricVersion = readCertifiedPiFabricVersionV1(packageRoot); packageLockPath = findPiFabricPackageLockV1(packageRoot); piFabricArtifactRoot = piFabricCertificationRootV1(artifactRoot, piFabricVersion); }
  catch (error) { const blocker = `compatibility selection: ${error instanceof Error ? error.message : String(error)}`; return { version: 1, prior, graduationCertified: false, releaseCertified: false, productionCertified: false, realAgentsEnabled: false, release: { webCertified: false, approvalRuntimeCertified: false, licensingCertified: false, retentionCertified: false, distributionCertified: false, packagedDistDigest: "0".repeat(64), executedEntrypointDigest: "0".repeat(64), certificateIds: [], certificateDigests: [] }, blockers: [...prior.blockers, blocker] }; }
  const graduation = await verifyPhase7GraduationCertification({ projectRoot, outputRoot: join(artifactRoot, "phase7"), hostPiFabricRoot: input.hostPiFabricRoot });
  const [web, approval] = await Promise.all([
    verifyWebThreatCertificate({ projectRoot, artifact: join(artifactRoot, "phase6/web-threat-b9.v1.json") }),
    verifyApprovalRuntimeCertificate({ projectRoot, packageRoot, artifact: join(artifactRoot, "phase6/approval-runtime-b9.v1.json") }),
  ]);
  const licensing = verifyLicensingCertificate({ projectRoot, packageRoot, packageLockPath, upstreamManifestPath: join(piFabricArtifactRoot, "manifest.v1.json"), artifact: join(artifactRoot, "phase6/licensing-b10.v1.json"), notice: join(projectRoot, "THIRD_PARTY_NOTICES.md") });
  const retention = verifyRetentionCertification({ projectRoot, artifact: join(artifactRoot, "phase6/retention-b12.v1.json") });
  const distribution = verifyDistributionCertificate({ projectRoot, artifact: join(artifactRoot, "phase6/distribution-phase6.v1.json") });
  let executed: { digest: string; packagedDistDigest: string; error?: string } = { digest: "0".repeat(64), packagedDistDigest: "0".repeat(64), error: "npm distribution inventory was not observable" };
  try {
    const executionInventory = inspectDistribution(projectRoot).files;
    executed = exactExecutedEntrypoint(projectRoot, executionInventory);
    if (!distribution.certificate || distribution.certificate.inventoryDigest !== digestCanonical(executionInventory)) executed.error = "executed dist inventory differs from the retained distribution certificate";
  } catch (error) { executed.error = error instanceof Error ? error.message : String(error); }
  const graduationCertified = graduation.valid; const releaseCertified = web.valid && approval.valid && licensing.valid && retention.valid && distribution.valid && !executed.error;
  const blockers = [
    ...prior.blockers,
    ...graduation.errors.map((entry) => `Phase 7: ${entry}`),
    ...web.errors.map((entry) => `B9 Web: ${entry}`),
    ...approval.errors.map((entry) => `B9 approval: ${entry}`),
    ...licensing.errors.map((entry) => `B10 licensing: ${entry}`),
    ...retention.errors.map((entry) => `B12 retention: ${entry}`),
    ...distribution.errors.map((entry) => `distribution: ${entry}`),
    ...(executed.error ? [`distribution execution: ${executed.error}`] : []),
  ];
  let boundDigests: { configurationDigest: string; packageInventoryDigest: string; packagedDistDigest: string; arborSourceDigest: string; piFabricPackageDigest: string; hostPiFabricPackageDigest: string; certificationArtifactDigest: string; adapterIdentityDigest: string } | undefined;
  if (input.bindings) {
    if (resolve(input.bindings.configuration.arborProjectRoot) !== projectRoot || resolve(input.bindings.configuration.piFabricPackageRoot) !== packageRoot || resolve(input.bindings.configuration.hostPiFabricRoot) !== hostPackageRoot || resolve(input.bindings.configuration.artifactRoot) !== artifactRoot) blockers.push("production configuration roots do not match the verified package and artifact roots");
    if (!productionFingerprintWrappersPresent(input.bindings)) blockers.push("production adapters are not all package-issued fingerprint boundary decorators");
    if (blockers.length === 0) {
      try { boundDigests = { configurationDigest: productionConfigurationDigestV1(input.bindings), packageInventoryDigest: distribution.certificate!.inventoryDigest, packagedDistDigest: executed.packagedDistDigest, arborSourceDigest: canonicalTreeDigest(join(projectRoot, "src")), piFabricPackageDigest: canonicalTreeDigest(packageRoot), hostPiFabricPackageDigest: canonicalTreeDigest(hostPackageRoot), certificationArtifactDigest: canonicalTreeDigest(artifactRoot), adapterIdentityDigest: productionAdapterIdentityDigestV1(input.bindings) }; }
      catch (error) { blockers.push(`production exact binding: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
  const productionCertified = prior.productionCertified && graduationCertified && releaseCertified && blockers.length === 0;
  const certificate = graduation.certificate as Phase7GraduationCertificateV1 | undefined;
  const certificatePairs = [
    certificate && [certificate.certificationId, certificate.certificateDigest],
    web.certificate && [web.certificate.certificationId, web.certificate.certificateDigest],
    approval.certificate && [approval.certificate.certificationId, approval.certificate.certificateDigest],
    licensing.certificate && [licensing.certificate.certificationId, licensing.certificate.certificateDigest],
    retention.certificate && [retention.certificate.certificationId, retention.certificate.certificateDigest],
    distribution.certificate && [distribution.certificate.certificationId, distribution.certificate.certificateDigest],
  ].filter((entry): entry is [string, string] => Boolean(entry));
  const release = {
    webCertified: web.valid, approvalRuntimeCertified: approval.valid, licensingCertified: licensing.valid, retentionCertified: retention.valid, distributionCertified: distribution.valid,
    packagedDistDigest: executed.packagedDistDigest, executedEntrypointDigest: executed.digest,
    certificateIds: certificatePairs.map(([id]) => id), certificateDigests: certificatePairs.map(([, digest]) => digest),
  };
  const status: GraduatedProductionStatusV1 = { version: 1, prior, graduationCertified, releaseCertified, productionCertified, realAgentsEnabled: false, ...(certificate ? { graduationCertificateId: certificate.certificationId } : {}), release, blockers };
  if (input.bindings) {
    if (!productionCertified) return status;
    const exactBindings = boundDigests!;
    const paths = {
      b0: join(piFabricArtifactRoot, "manifest.v1.json"), b1: join(piFabricArtifactRoot, "compatibility-results.v1.json"),
      b4: join(artifactRoot, "recovery/phase4/recovery-certificate.v1.json"), b5: join(artifactRoot, "containment/linux-x86_64-bwrap-0.12.0/containment-certificate.v1.json"),
      b6: join(artifactRoot, "fingerprint/linux-git-2.55.0/trial-certification.v1.json"), b7: join(artifactRoot, "authorization/local-ed25519/authorization-certificate.v1.json"),
      b8: join(artifactRoot, "held-out/linux-x86_64-bwrap-0.12.0/held-out-isolation-certificate.v1.json"), b9Approval: join(artifactRoot, "phase6/approval-runtime-b9.v1.json"),
      b10: join(artifactRoot, "phase6/licensing-b10.v1.json"), b11Seal: join(artifactRoot, "phase7/graduation-thresholds.v1.json"), b12: join(artifactRoot, "phase6/retention-b12.v1.json"), production: join(artifactRoot, "phase7/graduation-certificate.v1.json"), distribution: join(artifactRoot, "phase6/distribution-phase6.v1.json"),
    };
    const gateResults = Object.fromEntries(["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"].map((gate) => [gate, "PASS" as const]));
    const gateEvidenceDigests = {
      B0: retainedCertificateDigest(paths.b0), B1: retainedCertificateDigest(paths.b1),
      B2: digestCanonical({ arborSourceDigest: exactBindings.arborSourceDigest, packagedDistDigest: exactBindings.packagedDistDigest }), B3: exactBindings.adapterIdentityDigest,
      B4: retainedCertificateDigest(paths.b4), B5: retainedCertificateDigest(paths.b5), B6: retainedCertificateDigest(paths.b6), B7: retainedCertificateDigest(paths.b7),
      B8: retainedCertificateDigest(paths.b8), B9: digestCanonical({ approval: approval.certificate!.certificateDigest, web: web.certificate!.certificateDigest }),
      B10: retainedCertificateDigest(paths.b10), B11: digestCanonical({ thresholdSeal: retainedCertificateDigest(paths.b11Seal), distribution: distribution.certificate!.certificateDigest }), B12: retainedCertificateDigest(paths.b12),
    };
    const evidenceBase = {
      ...exactBindings, piFabricVersion,
      certificateIds: [...new Set([...(prior.upstreamCertificateId ? [prior.upstreamCertificateId] : []), ...(prior.compatibilityCertificateId ? [prior.compatibilityCertificateId] : []), ...(prior.containmentCertificateId ? [prior.containmentCertificateId] : []), ...release.certificateIds])],
      certificateDigests: release.certificateDigests,
      productionCertificateId: certificate!.certificationId, productionCertificateDigest: certificate!.certificateDigest, productionCertificatePath: "phase7/graduation-certificate.v1.json",
      distributionCertificateId: distribution.certificate!.certificationId, distributionCertificateDigest: distribution.certificate!.certificateDigest, distributionCertificatePath: "phase6/distribution-phase6.v1.json",
      fabricApprovalRuntimeCertificateDigest: approval.certificate!.certificateDigest, fabricApprovalRuntimeCertificatePath: "phase6/approval-runtime-b9.v1.json", gateResults, gateEvidenceDigests, blockers: [],
    };
    status.admissionEvidence = { version: 1, mode: "production-certified", admissionDigest: digestCanonical({ prior: digestCanonical(prior), graduation: certificate!.certificateDigest, release, ...evidenceBase }), ...evidenceBase };
  }
  return status;
}
