import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Phase4RecoveryCertificateV1 } from "../../src/certification/recovery.js";
import { FIXTURE_SCHEMAS_V1 } from "../../src/schemas/catalog.js";
import { assertJsonSchema } from "../../src/schemas/validate.js";

test("retained Phase 4 recovery certificate is canonical, schema-valid, and reproducible against active source and B6", () => {
  const output = execFileSync(process.execPath, ["--import", import.meta.resolve("tsx"), join(process.cwd(), "bin/pi-fabric-arbor-recovery-certify.ts"), "verify"], { cwd: process.cwd(), encoding: "utf8" });
  const result = JSON.parse(output) as { valid: boolean; errors: string[]; injections: number };
  assert.deepEqual(result.errors, []); assert.equal(result.valid, true); assert.equal(result.injections, 380);
  const retained = JSON.parse(readFileSync(join(process.cwd(), "certification/recovery/phase4/recovery-certificate.v1.json"), "utf8")) as Phase4RecoveryCertificateV1;
  assertJsonSchema(FIXTURE_SCHEMAS_V1.schemas.recoveryCertificate!, retained, "Phase 4 recovery certificate");
});
