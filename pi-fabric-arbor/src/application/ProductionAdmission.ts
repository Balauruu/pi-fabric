import type { CleanupAdapter, Evaluator, FabricAgentAdapter, ReportPublisher, WorkspaceManager } from "../adapters/interfaces.js";
import type { FabricPolicyTraversalAuthority } from "../authorization/FabricPolicyTraversal.js";
import { ArborError } from "../domain/errors.js";
import type { RuntimeAdmissionEvidenceV1 } from "../domain/types.js";
import type { PromotionGitIntegrator } from "../git/PromotionGitIntegrator.js";
import type { RunStore } from "../persistence/RunStore.js";
import type { TrustedPrincipalRegistry } from "../authorization/TrustedPrincipal.js";
import { digestCanonical } from "../util/canonical.js";

/** Compile-time brand. The runtime authority is the private WeakMap below. */
declare const productionAdmissionBrand: unique symbol;
export interface ProductionAdmissionV1 {
  readonly version: 1;
  readonly admissionDigest: string;
  readonly [productionAdmissionBrand]: true;
}

export interface ProductionDispatchPolicyV1 {
  containmentId: string;
  agentProfileId: string;
  requestSchemaDigest: string;
  resultSchemaDigest: string;
  toolPolicyId: string;
}

export interface ProductionConfigurationV1 {
  version: 1;
  arborProjectRoot: string;
  piFabricPackageRoot: string;
  hostPiFabricRoot: string;
  repositoryRoot: string;
  workspaceRoot: string;
  reportRoot: string;
  artifactRoot: string;
  heldOutRoot: string;
  evaluatorExecutable: string;
  gitOidLength: 40 | 64;
}

export interface ProductionApplicationBindingsV1 {
  store: RunStore;
  workspace: WorkspaceManager;
  agent: FabricAgentAdapter;
  evaluator: Evaluator;
  reportPublisher: ReportPublisher;
  cleanup: CleanupAdapter;
  git: PromotionGitIntegrator;
  authorization: TrustedPrincipalRegistry;
  heldOutIsolationCertificateDigest: string;
  productionDispatch: ProductionDispatchPolicyV1;
  configuration: ProductionConfigurationV1;
}

export interface ProductionAdmissionAuthorityV1 {
  bindings: ProductionApplicationBindingsV1;
  evidence: RuntimeAdmissionEvidenceV1;
  fabricPolicyTraversal: FabricPolicyTraversalAuthority;
}

const issuedAdmissions = new WeakMap<object, ProductionAdmissionAuthorityV1>();

export function productionAdapterIdentityDigestV1(bindings: ProductionApplicationBindingsV1): string {
  const adapters = (["store", "workspace", "agent", "evaluator", "reportPublisher", "cleanup", "git", "authorization"] as const).map((key) => ({ key, constructor: bindings[key].constructor.name }));
  return digestCanonical({ adapters, productionDispatch: bindings.productionDispatch });
}

export function productionConfigurationDigestV1(bindings: ProductionApplicationBindingsV1): string {
  return digestCanonical({ configuration: bindings.configuration, productionDispatch: bindings.productionDispatch, heldOutIsolationCertificateDigest: bindings.heldOutIsolationCertificateDigest, adapterIdentityDigest: productionAdapterIdentityDigestV1(bindings) });
}

/** Private package seam. Only the graduated verifier imports this function. */
export function issueProductionAdmissionV1(bindings: ProductionApplicationBindingsV1, evidence: RuntimeAdmissionEvidenceV1, fabricPolicyTraversal: FabricPolicyTraversalAuthority): ProductionAdmissionV1 {
  const requiredGates = ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"] as const;
  const completeGateEvidence = Object.keys(evidence.gateEvidenceDigests).length === requiredGates.length && Object.keys(evidence.gateResults).length === requiredGates.length && requiredGates.every((gate) => evidence.gateResults[gate] === "PASS" && /^[a-f0-9]{64}$/u.test(evidence.gateEvidenceDigests[gate] ?? ""));
  if (evidence.mode !== "production-certified" || evidence.blockers.length !== 0 || evidence.admissionDigest.length !== 64 || evidence.configurationDigest !== productionConfigurationDigestV1(bindings) || !completeGateEvidence || evidence.productionCertificateId !== "phase7_graduation_v1" || !evidence.productionCertificateDigest || evidence.productionCertificatePath !== "phase7/graduation-certificate.v1.json" || evidence.distributionCertificateId !== "distribution_phase6_v1" || !evidence.distributionCertificateDigest || evidence.distributionCertificatePath !== "phase6/distribution-phase6.v1.json" || !evidence.adapterIdentityDigest || !evidence.fabricApprovalRuntimeCertificateDigest || evidence.fabricApprovalRuntimeCertificatePath !== "phase6/approval-runtime-b9.v1.json" || fabricPolicyTraversal.boundary !== "certified-production-host" || fabricPolicyTraversal.b9CertificationDigest !== evidence.fabricApprovalRuntimeCertificateDigest) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Production admission evidence is not a successful exact B0-B12 binding");
  Object.freeze(bindings.configuration); Object.freeze(bindings.productionDispatch);
  for (const key of ["workspace", "agent", "evaluator", "reportPublisher", "cleanup", "git"] as const) Object.freeze(bindings[key]);
  Object.freeze(fabricPolicyTraversal);
  const token = Object.freeze({ version: 1 as const, admissionDigest: evidence.admissionDigest }) as ProductionAdmissionV1;
  const bindingsSnapshot = Object.freeze({ ...bindings });
  issuedAdmissions.set(token as object, { bindings: bindingsSnapshot, evidence: Object.freeze(structuredClone(evidence)), fabricPolicyTraversal });
  return token;
}

export function assertProductionAdmissionV1(admission: ProductionAdmissionV1, actual: Omit<ProductionApplicationBindingsV1, "configuration">): ProductionAdmissionAuthorityV1 {
  const authority = issuedAdmissions.get(admission as object);
  if (!authority || admission.version !== 1 || admission.admissionDigest !== authority.evidence.admissionDigest) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Production admission is absent, forged, copied, or no longer bound");
  const expected = authority.bindings;
  if (productionConfigurationDigestV1(expected) !== authority.evidence.configurationDigest || productionAdapterIdentityDigestV1(expected) !== authority.evidence.adapterIdentityDigest) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Production admission configuration, adapter, or policy binding changed after verification");
  for (const key of ["store", "workspace", "agent", "evaluator", "reportPublisher", "cleanup", "git", "authorization", "productionDispatch"] as const) {
    if (actual[key] !== expected[key]) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", `Production admission adapter binding changed: ${key}`);
  }
  if (actual.heldOutIsolationCertificateDigest !== expected.heldOutIsolationCertificateDigest) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Production admission held-out certificate binding changed");
  return authority;
}
