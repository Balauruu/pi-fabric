import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

function verify(binary: string): Record<string, unknown> {
  return JSON.parse(execFileSync(process.execPath, [`dist/bin/${binary}`, "verify"], { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })) as Record<string, unknown>;
}

test("retained B7, B8, and Phase 5 certificates bind active sources and complete required matrices", () => {
  const authorization = verify("pi-fabric-arbor-authorization-certify.js");
  assert.equal(authorization.valid, true);
  const heldOut = verify("pi-fabric-arbor-held-out-certify.js");
  assert.equal(heldOut.valid, true);
  const promotion = verify("pi-fabric-arbor-promotion-certify.js");
  assert.equal(promotion.valid, true);
  assert.deepEqual(authorization, { certificateId: "authorization_b7_local_v1", certificateDigest: authorization.certificateDigest, valid: true });
  assert.deepEqual(heldOut, { certificateId: "held_out_linux_bwrap_v1", certificateDigest: heldOut.certificateDigest, valid: true });
  assert.deepEqual(promotion, { certificateId: "promotion_phase5_4x20", certificateDigest: promotion.certificateDigest, valid: true, errors: [] });
  const status = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", "import {loadProductionCertificationStatus} from './dist/src/certification/startup.js';console.log(JSON.stringify(loadProductionCertificationStatus({projectRoot:process.cwd(),piFabricPackageRoot:'node_modules/pi-fabric'})))"], { cwd: process.cwd(), encoding: "utf8" })) as { certifications: { compatibilityCertified: boolean }; localEvidence: Record<string, boolean>; productionCertified: boolean; realAgentsEnabled: boolean; blockers: string[] };
  assert.equal(status.certifications.compatibilityCertified, true, "fresh B1 evidence must be admitted");
  for (const gate of ["fingerprintCertified", "recoveryCertified", "authorizationCertified", "heldOutCertified", "promotionCertified"]) assert.equal(status.localEvidence[gate], true, gate);
  assert.equal(status.productionCertified, true); assert.equal(status.realAgentsEnabled, true); assert.deepEqual(status.blockers, []);
});
