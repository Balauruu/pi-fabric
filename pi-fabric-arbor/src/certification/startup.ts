import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { FabricCompatibilityCertificateV1 } from "../compatibility/certification.js";
import { verifyFabricCompatibilityCertificate } from "../compatibility/certification.js";
import { verifyLocalContainmentCertification } from "./containment.js";
import { verifyFingerprintTrialCertification } from "./fingerprint.js";
import { verifyUpstreamCertification } from "./upstream.js";
import { verifyPhase4RecoveryCertification } from "./recovery.js";
import { verifyLocalAuthorizationCertification } from "./authorization.js";
import { verifyLocalHeldOutIsolationCertification } from "./held-out.js";
import { verifyPhase5PromotionCertification } from "./promotion.js";
import { findPiFabricPackageLockV1, piFabricCertificationRootV1, readCertifiedPiFabricVersionV1, type CertifiedPiFabricVersionV1 } from "./pi-fabric-support.js";

export interface ProductionCertificationStatusV1 {
  version: 1;
  certifications: { upstreamCertified: boolean; compatibilityCertified: boolean; containmentCertified: boolean };
  localEvidence: { fingerprintCertified: boolean; trustedEvaluatorCertified: boolean; recoveryCertified: boolean; authorizationCertified: boolean; heldOutCertified: boolean; promotionCertified: boolean };
  productionCertified: boolean;
  realAgentsEnabled: boolean;
  piFabricVersion?: CertifiedPiFabricVersionV1;
  upstreamCertificateId?: string;
  compatibilityCertificateId?: string;
  containmentCertificateId?: string;
  fingerprintCertificationId?: string;
  recoveryCertificationId?: string;
  authorizationCertificationId?: string;
  heldOutCertificationId?: string;
  promotionCertificationId?: string;
  blockers: string[];
}

export function loadProductionCertificationStatus(input: { projectRoot: string; piFabricPackageRoot: string; hostPiFabricRoot?: string; packageLockPath?: string; artifactRoot?: string }): ProductionCertificationStatusV1 {
  const projectRoot = resolve(input.projectRoot); const root = resolve(input.artifactRoot ?? join(projectRoot, "certification")); const packageRoot = resolve(input.piFabricPackageRoot); const hostPackageRoot = resolve(input.hostPiFabricRoot ?? packageRoot); const blockers: string[] = [];
  let piFabricVersion: CertifiedPiFabricVersionV1 | undefined;
  let upstream = false; let compatibility = false; let containment = false; let fingerprint = false; let recovery = false; let authorization = false; let heldOut = false; let promotion = false;
  let upstreamCertificateId: string | undefined; let compatibilityCertificateId: string | undefined; let containmentCertificateId: string | undefined; let fingerprintCertificationId: string | undefined; let recoveryCertificationId: string | undefined; let authorizationCertificationId: string | undefined; let heldOutCertificationId: string | undefined; let promotionCertificationId: string | undefined;
  try {
    piFabricVersion = readCertifiedPiFabricVersionV1(packageRoot); const artifactRoot = piFabricCertificationRootV1(root, piFabricVersion); const packageLockPath = resolve(input.packageLockPath ?? findPiFabricPackageLockV1(packageRoot));
    const result = verifyUpstreamCertification({ projectRoot, packageRoot, hostPiFabricRoot: hostPackageRoot, packageLockPath, artifactRoot });
    upstream = result.valid; upstreamCertificateId = result.certificate?.certificationId;
    const certificate = JSON.parse(readFileSync(join(artifactRoot, "compatibility-results.v1.json"), "utf8")) as FabricCompatibilityCertificateV1;
    const runtimeEvidence = {
      projectRoot, packageRoot, hostPackageRoot,
      hostAgentArtifact: join(artifactRoot, "artifacts/host-runtime-evidence.v1.json"), approvalArtifact: join(artifactRoot, "artifacts/approval-runtime-evidence.v1.json"),
      hostIntegrationArtifact: join(artifactRoot, "artifacts/host-integration-runtime.v1.json"),
    };
    compatibility = result.certificate !== undefined && verifyFabricCompatibilityCertificate(certificate, { piFabricRoot: packageRoot, arborSourceRoot: join(projectRoot, "src"), projectRoot, runtimeEvidence, expectedPackageDigest: result.certificate.packageDigest }) && certificate.supported; compatibilityCertificateId = certificate.certificationId;
    if (!upstream) blockers.push(...result.errors.map((error) => `upstream: ${error}`)); if (!compatibility) blockers.push("compatibility: installed pi-fabric runtime behavior is not fully certified");
  } catch (error) { blockers.push(`upstream: ${error instanceof Error ? error.message : String(error)}`); }
  try { const result = verifyLocalContainmentCertification(join(root, "containment/linux-x86_64-bwrap-0.12.0")); containment = result.valid; containmentCertificateId = result.certificate.certificateId; if (!containment) blockers.push("containment: certificate does not match active platform/tools"); } catch (error) { blockers.push(`containment: ${error instanceof Error ? error.message : String(error)}`); }
  try { const result = verifyFingerprintTrialCertification(join(root, "fingerprint/linux-git-2.55.0")); fingerprint = result.valid; fingerprintCertificationId = result.certification.certificationId; if (!fingerprint) blockers.push("fingerprint: trial certification does not match active tools"); } catch (error) { blockers.push(`fingerprint: ${error instanceof Error ? error.message : String(error)}`); }
  try { const result = verifyPhase4RecoveryCertification({ projectRoot, artifactRoot: join(root, "recovery/phase4") }); recovery = result.valid; recoveryCertificationId = result.certificate.certificateId; if (!recovery) blockers.push(...result.errors.map((error) => `recovery: ${error}`)); } catch (error) { blockers.push(`recovery: ${error instanceof Error ? error.message : String(error)}`); }
  try { const result = verifyLocalAuthorizationCertification({ projectRoot, artifactRoot: join(root, "authorization/local-ed25519") }); authorization = result.valid; authorizationCertificationId = result.certificate.certificateId; if (!authorization) blockers.push("B7 authorization: retained certificate does not match active inputs"); } catch (error) { blockers.push(`B7 authorization: ${error instanceof Error ? error.message : String(error)}`); }
  try { const result = verifyLocalHeldOutIsolationCertification({ projectRoot, artifactRoot: join(root, "held-out/linux-x86_64-bwrap-0.12.0") }); heldOut = result.valid; heldOutCertificationId = result.certificate.certificateId; if (!heldOut) blockers.push("B8 held-out: retained certificate does not match active host policy"); } catch (error) { blockers.push(`B8 held-out: ${error instanceof Error ? error.message : String(error)}`); }
  try { const result = verifyPhase5PromotionCertification({ projectRoot, artifactRoot: join(root, "promotion/phase5") }); promotion = result.valid; promotionCertificationId = result.certificate.certificateId; if (!promotion) blockers.push(...result.errors.map((error) => `Phase 5: ${error}`)); } catch (error) { blockers.push(`Phase 5: ${error instanceof Error ? error.message : String(error)}`); }
  const certifications = { upstreamCertified: upstream, compatibilityCertified: compatibility, containmentCertified: containment };
  const localEvidence = { fingerprintCertified: fingerprint, trustedEvaluatorCertified: containment, recoveryCertified: recovery, authorizationCertified: authorization, heldOutCertified: heldOut, promotionCertified: promotion };
  const productionCertified = upstream && compatibility && containment && fingerprint && recovery && authorization && heldOut && promotion;
  const realAgentsEnabled = productionCertified;
  return { version: 1, certifications, localEvidence, productionCertified, realAgentsEnabled, ...(piFabricVersion ? { piFabricVersion } : {}), ...(upstreamCertificateId ? { upstreamCertificateId } : {}), ...(compatibilityCertificateId ? { compatibilityCertificateId } : {}), ...(containmentCertificateId ? { containmentCertificateId } : {}), ...(fingerprintCertificationId ? { fingerprintCertificationId } : {}), ...(recoveryCertificationId ? { recoveryCertificationId } : {}), ...(authorizationCertificationId ? { authorizationCertificationId } : {}), ...(heldOutCertificationId ? { heldOutCertificationId } : {}), ...(promotionCertificationId ? { promotionCertificationId } : {}), blockers };
}
