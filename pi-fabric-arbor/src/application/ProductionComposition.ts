import type { AdministratorAdmissions } from "../schemas/validate.js";
import type { FabricProvider } from "pi-fabric";
import type { Clock, IdFactory } from "../util/clock.js";
import { ArborApplication } from "./ArborApplication.js";
import { issueProductionAdmissionV1, type ProductionApplicationBindingsV1 } from "./ProductionAdmission.js";
import type { FabricPolicyTraversalAuthority, FabricPolicyTraversalRequestV1 } from "../authorization/FabricPolicyTraversal.js";
import { ArborError } from "../domain/errors.js";
import { digestCanonical } from "../util/canonical.js";
import { createArborProvider } from "../public/provider.js";
import { loadGraduatedProductionStatusV1, type GraduatedProductionStatusV1 } from "../phase7/index.js";

export interface GraduatedProductionCompositionInputV1 {
  projectRoot: string;
  piFabricPackageRoot: string;
  hostPiFabricRoot: string;
  artifactRoot?: string;
  bindings: ProductionApplicationBindingsV1;
  clock: Clock;
  ids: IdFactory;
  admissions?: AdministratorAdmissions;
  challengeTtlMs?: number;
  legalHoldRunIds?: ReadonlySet<string>;
}

let extensionProvider: FabricProvider | undefined;
let extensionBlockers: readonly string[] = ["graduated production composition has not been prepared"];

/**
 * Verifies the executed npm distribution and every retained gate, then constructs
 * the sole production application/provider graph from the exact admitted objects.
 */
export async function prepareGraduatedProductionProviderV1(input: GraduatedProductionCompositionInputV1): Promise<GraduatedProductionStatusV1> {
  extensionProvider = undefined; extensionBlockers = Object.freeze(["graduated production verification is in progress"]);
  const status = await loadGraduatedProductionStatusV1({ projectRoot: input.projectRoot, piFabricPackageRoot: input.piFabricPackageRoot, hostPiFabricRoot: input.hostPiFabricRoot, ...(input.artifactRoot ? { artifactRoot: input.artifactRoot } : {}), bindings: input.bindings });
  if (!status.admissionEvidence) { extensionProvider = undefined; extensionBlockers = Object.freeze([...status.blockers]); return status; }
  const approvalIndex = status.release.certificateIds.indexOf("approval_runtime_b9_v1");
  const b9CertificationDigest = approvalIndex < 0 ? undefined : status.release.certificateDigests[approvalIndex];
  if (!b9CertificationDigest) { extensionProvider = undefined; extensionBlockers = Object.freeze(["exact B9 Fabric approval runtime certificate is absent"]); return { ...status, productionCertified: false, realAgentsEnabled: false, blockers: [...status.blockers, ...extensionBlockers] }; }
  const fabricPolicyTraversal: FabricPolicyTraversalAuthority = {
    boundary: "certified-production-host",
    b9CertificationDigest,
    async authorize(request: FabricPolicyTraversalRequestV1) {
      if (!request.parentToolCallId || !request.nestedToolCallId || !request.operationId || !request.authorizationId) throw new ArborError("EVIDENCE_INVALID", "The apply operation did not arrive through an active Fabric policy traversal");
      const payload = { ...request, boundary: "certified-production-host" as const, traversedAt: input.clock.now(), b9CertificationId: "approval_runtime_b9_v1" as const, b9CertificationDigest };
      return Object.freeze({ ...payload, traversalDigest: digestCanonical(payload) });
    },
  };
  const productionAdmission = issueProductionAdmissionV1(input.bindings, status.admissionEvidence, fabricPolicyTraversal);
  status.realAgentsEnabled = true;
  const config = input.bindings.configuration;
  const application = new ArborApplication({
    store: input.bindings.store, workspace: input.bindings.workspace, agent: input.bindings.agent, evaluator: input.bindings.evaluator,
    reportPublisher: input.bindings.reportPublisher, cleanup: input.bindings.cleanup, clock: input.clock, ids: input.ids,
    gitOidLength: config.gitOidLength, productionAdmission,
    productionDispatch: input.bindings.productionDispatch,
    phase5: { git: input.bindings.git, authorization: input.bindings.authorization, heldOutIsolationCertificateDigest: input.bindings.heldOutIsolationCertificateDigest, challengeTtlMs: input.challengeTtlMs ?? 300_000 },
    ...(input.admissions ? { admissions: input.admissions } : {}), ...(input.legalHoldRunIds ? { legalHoldRunIds: input.legalHoldRunIds } : {}),
  });
  extensionProvider = createArborProvider(application); extensionBlockers = [];
  return status;
}

/** Package-private extension seam. A real provider can only enter through the verifier above. */
export function resolvePreparedProductionProviderV1(): { provider?: FabricProvider; blockers: readonly string[] } {
  return { ...(extensionProvider ? { provider: extensionProvider } : {}), blockers: extensionBlockers };
}
