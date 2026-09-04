import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import * as api from "../../src/index.js";
import { ACTION_DESCRIPTOR_POLICY_V1, createActionDescriptors } from "../../src/public/descriptors.js";
import { FIXTURE_SCHEMAS_V1 } from "../../src/schemas/catalog.js";
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from "../../src/persistence/migrations.js";

test("Phase 5 exports, promotion schemas, exact descriptors, migration, binaries, and scripts are synchronized", () => {
  for (const name of ["PrivateRepositoryPromotionGitIntegrator", "HeldOutIsolationAdapter", "TrustedPrincipalRegistry", "LocalTtyAuthorizationCoordinator", "verifyPhase5PromotionCertification"]) assert.equal(typeof api[name as keyof typeof api], "function", name);
  const descriptors = createActionDescriptors(FIXTURE_SCHEMAS_V1); const byName = new Map(descriptors.map((entry) => [entry.name, entry]));
  for (const name of ["arbor.buildPromotionCandidate", "arbor.applyWinnerRef", "arbor.applyRollbackRef"]) { assert.equal(byName.get(name)?.effect?.kind, "emission"); }
  for (const name of ["arbor.planPromotionCommit", "arbor.observeWinnerRef", "arbor.planRollback", "arbor.observeRollbackRef"]) { assert.equal(byName.get(name)?.risk, "write"); assert.equal(byName.get(name)?.effect?.kind, "transactional"); }
  assert.deepEqual(descriptors.map((entry) => entry.name).sort(), Object.keys(ACTION_DESCRIPTOR_POLICY_V1).sort());
  assert.ok(LATEST_SCHEMA_VERSION >= 3); assert.equal(MIGRATIONS.find((entry) => entry.version === 3)?.name, "phase5_promotion_authorization_held_out");
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { exports: Record<string, unknown>; bin: Record<string, string>; scripts: Record<string, string> };
  for (const path of ["./authorization", "./certification", "./evaluation", "./git"]) assert.ok(manifest.exports[path]);
  for (const binary of ["pi-fabric-arbor-authorization-certify", "pi-fabric-arbor-held-out-certify", "pi-fabric-arbor-promotion-certify"]) assert.equal(existsSync(join(process.cwd(), `bin/${binary}.ts`)), true);
  for (const script of ["test:phase5", "certify:authorization", "certify:held-out", "certify:promotion", "verify:phase5"]) assert.ok(manifest.scripts[script]);
});
