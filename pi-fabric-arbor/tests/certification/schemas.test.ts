import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { APPROVAL_RUNTIME_EVIDENCE_SCHEMA_V1, HOST_AGENT_RUNTIME_EVIDENCE_SCHEMA_V1, HOST_INTEGRATION_RUNTIME_EVIDENCE_SCHEMA_V1 } from "../../src/certification/runtime-evidence.js";
import { FIXTURE_SCHEMAS_V1, type JsonSchema } from "../../src/schemas/catalog.js";
import { validateJsonSchema } from "../../src/schemas/validate.js";

const artifacts = [
  ["upstreamCertification", "certification/upstream/pi-fabric/0.76.2/manifest.v1.json"],
  ["fabricCompatibilityCertificate", "certification/upstream/pi-fabric/0.76.2/compatibility-results.v1.json"],
  ["upstreamCertification", "certification/upstream/pi-fabric/0.77.0/manifest.v1.json"],
  ["fabricCompatibilityCertificate", "certification/upstream/pi-fabric/0.77.0/compatibility-results.v1.json"],
  ["fingerprintCertificate", "certification/fingerprint/linux-git-2.55.0/fingerprint-certificates.v1.json"],
  ["containmentCertificate", "certification/containment/linux-x86_64-bwrap-0.12.0/containment-certificate.v1.json"],
  ["recoveryCertificate", "certification/recovery/phase4/recovery-certificate.v1.json"],
] as const;

test("retained Phase 3 and Phase 4 certificates validate against bounded closed canonical schemas", () => {
  for (const [schemaName, path] of artifacts) {
    let value = JSON.parse(readFileSync(join(process.cwd(), path), "utf8")); if (Array.isArray(value)) value = value[0];
    assert.deepEqual(validateJsonSchema(FIXTURE_SCHEMAS_V1.schemas[schemaName]!, value), [], schemaName);
  }
});

test("canonical containment schema requires exact cgroup-v2 enforcement bindings", () => {
  const schema = FIXTURE_SCHEMAS_V1.schemas.containmentCertificate!;
  const certificate = JSON.parse(readFileSync(join(process.cwd(), "certification/containment/linux-x86_64-bwrap-0.12.0/containment-certificate.v1.json"), "utf8")) as Record<string, unknown>;
  assert.deepEqual(validateJsonSchema(schema, certificate), []);
  for (const mutation of [
    { ...certificate, cgroupVersion: "v1" },
    { ...certificate, resourceLimitEnforcement: "telemetry-only" },
    { ...certificate, cgroupRunnerDigest: "0".repeat(63) },
    Object.fromEntries(Object.entries(certificate).filter(([key]) => key !== "cgroupVersion")),
  ]) assert.notDeepEqual(validateJsonSchema(schema, mutation), []);
});

test("both retained B1 release matrices validate against their closed schemas", () => {
  const runtimeArtifacts: Array<readonly [JsonSchema, string]> = [[APPROVAL_RUNTIME_EVIDENCE_SCHEMA_V1, "certification/phase6/approval-runtime-b9.v1.json"]];
  for (const version of ["0.76.2", "0.77.0"]) runtimeArtifacts.push(
    [HOST_AGENT_RUNTIME_EVIDENCE_SCHEMA_V1, `certification/upstream/pi-fabric/${version}/artifacts/host-runtime-evidence.v1.json`],
    [APPROVAL_RUNTIME_EVIDENCE_SCHEMA_V1, `certification/upstream/pi-fabric/${version}/artifacts/approval-runtime-evidence.v1.json`],
    [HOST_INTEGRATION_RUNTIME_EVIDENCE_SCHEMA_V1, `certification/upstream/pi-fabric/${version}/artifacts/host-integration-runtime.v1.json`],
  );
  for (const [schema, path] of runtimeArtifacts) assert.deepEqual(validateJsonSchema(schema, JSON.parse(readFileSync(join(process.cwd(), path), "utf8"))), []);
});
