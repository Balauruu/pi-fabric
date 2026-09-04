import type { FabricPolicyTraversalProofV1 } from "../domain/types.js";

export interface FabricPolicyTraversalRequestV1 {
  version: 1;
  action: "arbor.applyWinnerRef" | "arbor.applyRollbackRef";
  argsDigest: string;
  runId: string;
  operationId: string;
  promotionId: string;
  candidateId: string;
  authorizationId: string;
  parentToolCallId: string;
  nestedToolCallId: string;
}

/** Internal capability supplied only by the exact B9-certified production composition. */
export interface FabricPolicyTraversalAuthority {
  readonly boundary: "certified-production-host" | "explicit-test-fixture";
  readonly b9CertificationDigest?: string;
  authorize(request: FabricPolicyTraversalRequestV1): Promise<FabricPolicyTraversalProofV1>;
}
