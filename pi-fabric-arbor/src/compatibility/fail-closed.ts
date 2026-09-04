import { ArborError } from "../domain/errors.js";
import type {
  AgentSpawnRequestV1,
  CandidateFinalizationRequestV1,
  EvaluationRequestV1,
  WorkspaceMaterializationRequestV1,
} from "../adapters/interfaces.js";
import type { CleanupAdapter, Evaluator, FabricAgentAdapter, ReportPublisher, WorkspaceManager } from "../adapters/interfaces.js";

export interface CertificationStatusV1 {
  version: 1;
  upstreamCertified: boolean;
  compatibilityCertified: boolean;
  containmentCertified: boolean;
  heldOutIsolationCertified: boolean;
}

export function requireRealWork(status: CertificationStatusV1, kind: "agent" | "workspace" | "evaluation" | "promotion"): void {
  if (!status.upstreamCertified && kind === "agent") throw new ArborError("UPSTREAM_CERTIFICATION_REQUIRED", "Real Fabric child dispatch requires B0 upstream certification");
  if (!status.compatibilityCertified && kind === "agent") throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Real Fabric child dispatch requires B1 compatibility certification");
  if (!status.containmentCertified) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", `Real ${kind} work requires B5 containment certification`);
  if (kind === "promotion" && !status.heldOutIsolationCertified) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Promotion requires B8 held-out isolation certification");
}

export class UnavailableFabricAgentAdapter implements FabricAgentAdapter {
  constructor(private readonly status: CertificationStatusV1) {}
  async spawn(_request: AgentSpawnRequestV1): Promise<never> {
    requireRealWork(this.status, "agent");
    throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "No certified Fabric agent adapter is installed");
  }
}

export class UnavailableWorkspaceManager implements WorkspaceManager {
  constructor(private readonly status: CertificationStatusV1) {}
  async materialize(_request: WorkspaceMaterializationRequestV1): Promise<never> {
    requireRealWork(this.status, "workspace");
    throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "No certified workspace adapter is installed");
  }
  async finalize(_request: CandidateFinalizationRequestV1): Promise<never> {
    requireRealWork(this.status, "workspace");
    throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "No certified workspace adapter is installed");
  }
}

export class UnavailableEvaluator implements Evaluator {
  constructor(private readonly status: CertificationStatusV1) {}
  async evaluate(_request: EvaluationRequestV1): Promise<never> {
    requireRealWork(this.status, "evaluation");
    throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "No certified evaluator adapter is installed");
  }
}

export class UnavailableReportPublisher implements ReportPublisher {
  async publish(): Promise<never> { throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Detached monitoring cannot publish reports"); }
  async observe(): Promise<never> { throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Detached monitoring cannot observe report effects"); }
}

export class UnavailableCleanupAdapter implements CleanupAdapter {
  constructor(private readonly status: CertificationStatusV1) {}
  async execute(): Promise<never> {
    requireRealWork(this.status, "workspace");
    throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "No certified cleanup adapter is installed");
  }
}

export const NO_CERTIFICATIONS_V1: CertificationStatusV1 = Object.freeze({
  version: 1,
  upstreamCertified: false,
  compatibilityCertified: false,
  containmentCertified: false,
  heldOutIsolationCertified: false,
});
