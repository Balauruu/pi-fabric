import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DetachedMonitorAuthority,
  DetachedMonitorServer,
  EffectRecoveryCoordinator,
  OutboxDrainer,
  RECOVERY_BOUNDARIES_V1,
  executeRecoveryFaultMatrix,
  verifyPhase4RecoveryCertification,
} from "../../src/index.js";
import { ACTION_DESCRIPTOR_POLICY_V1, createActionDescriptors } from "../../src/public/descriptors.js";
import { FIXTURE_SCHEMAS_V1 } from "../../src/schemas/catalog.js";
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from "../../src/persistence/migrations.js";

const surfaces = [DetachedMonitorAuthority, DetachedMonitorServer, EffectRecoveryCoordinator, OutboxDrainer, executeRecoveryFaultMatrix, verifyPhase4RecoveryCertification];

test("Phase 4 public exports, schemas, descriptors, migrations, binaries, and commands are mechanically synchronized", () => {
  assert.equal(surfaces.every((entry) => typeof entry === "function"), true);
  assert.equal(RECOVERY_BOUNDARIES_V1.length, 19);
  const descriptors = createActionDescriptors(FIXTURE_SCHEMAS_V1); const names = descriptors.map((entry) => entry.name).sort();
  assert.deepEqual(names, Object.keys(FIXTURE_SCHEMAS_V1.actionInputs).sort());
  assert.deepEqual(names, Object.keys(FIXTURE_SCHEMAS_V1.actionOutputs).sort());
  assert.deepEqual(names, Object.keys(ACTION_DESCRIPTOR_POLICY_V1).sort());
  for (const name of ["arbor.interruptEffect", "arbor.reconcileEffect", "arbor.resumeEffect", "arbor.observeEffectCancellation"]) {
    const descriptor = descriptors.find((entry) => entry.name === name)!; assert.equal(descriptor.risk, "write"); assert.equal(descriptor.effect?.kind, "transactional");
  }
  assert.ok(LATEST_SCHEMA_VERSION >= 2); assert.ok(MIGRATIONS.length >= 2); assert.equal(MIGRATIONS[1]?.name, "phase4_recovery_and_outbox");
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { exports: Record<string, unknown>; bin: Record<string, string>; scripts: Record<string, string> };
  for (const path of [".", "./extension", "./schemas", "./recovery", "./web"]) assert.ok(manifest.exports[path], path);
  assert.equal(manifest.bin["pi-fabric-arbor-recovery-certify"], "./dist/bin/pi-fabric-arbor-recovery-certify.js");
  for (const script of ["test:phase4", "certify:recovery", "verify:recovery", "verify:certificates"]) assert.ok(manifest.scripts[script], script);
  assert.equal(existsSync(join(process.cwd(), "bin/pi-fabric-arbor-recovery-certify.ts")), true);
});
