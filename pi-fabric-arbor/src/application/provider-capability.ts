import { ArborError } from "../domain/errors.js";

/** Internal module capability. This path is not a package export. */
export const FABRIC_PROVIDER_POLICY_TRAVERSAL_CAPABILITY_V1: object = Object.freeze({ version: 1, purpose: "fabric-provider-policy-traversal" });

export function assertFabricProviderPolicyTraversalCapabilityV1(value: unknown): void {
  if (value !== FABRIC_PROVIDER_POLICY_TRAVERSAL_CAPABILITY_V1) throw new ArborError("EVIDENCE_INVALID", "Only the package Fabric provider may enter the policy-traversed write-emission path");
}
