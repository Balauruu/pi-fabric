#!/usr/bin/env node
import { join, resolve } from "node:path";
import { piFabricCertificationRootV1, readCertifiedPiFabricVersionV1 } from "../src/certification/pi-fabric-support.js";
import { generateHostIntegrationRuntimeEvidence, writeHostIntegrationRuntimeEvidence } from "../src/certification/host-integration-runtime.js";
import { collectCompatibilityRuntimeEvidence, loadHostIntegrationRuntimeEvidence } from "../src/certification/runtime-evidence.js";

function options(argv: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name value, got ${key ?? "<end>"}`);
    parsed.set(key.slice(2), value);
  }
  return parsed;
}

const [command, ...rest] = process.argv.slice(2); const values = options(rest);
const projectRoot = resolve(values.get("project-root") ?? ".");
const packageRoot = resolve(projectRoot, values.get("package-root") ?? "node_modules/pi-fabric");
const piFabricVersion = readCertifiedPiFabricVersionV1(packageRoot); const versionRoot = piFabricCertificationRootV1(join(projectRoot, "certification"), piFabricVersion);
const hostPackageRoot = resolve(projectRoot, values.get("host-package-root") ?? packageRoot);
const hostAgentArtifact = resolve(projectRoot, values.get("host-agent-artifact") ?? join(versionRoot, "artifacts/host-runtime-evidence.v1.json"));
const approvalArtifact = resolve(projectRoot, values.get("approval-artifact") ?? join(versionRoot, "artifacts/approval-runtime-evidence.v1.json"));
const artifact = resolve(projectRoot, values.get("artifact") ?? join(versionRoot, "artifacts/host-integration-runtime.v1.json"));

if (command === "generate") {
  const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required");
  const evidence = await generateHostIntegrationRuntimeEvidence({ projectRoot, packageRoot, hostAgentArtifact, approvalArtifact, createdAt });
  writeHostIntegrationRuntimeEvidence(artifact, evidence);
  process.stdout.write(`${JSON.stringify({ certificationId: evidence.certificationId, certificateDigest: evidence.certificateDigest, logDigest: evidence.logDigest, exitCode: evidence.exitCode, complete: evidence.complete, passed: evidence.passed })}\n`);
  if (!evidence.passed) process.exitCode = 1;
} else if (command === "verify") {
  let valid = false; let certificationId: string | undefined; let certificateDigest: string | undefined; let error: string | undefined;
  try {
    const evidence = loadHostIntegrationRuntimeEvidence(artifact); certificationId = evidence.evidence.certificationId; certificateDigest = evidence.evidence.certificateDigest;
    collectCompatibilityRuntimeEvidence({ projectRoot, packageRoot, hostPackageRoot, hostAgentArtifact, approvalArtifact, hostIntegrationArtifact: artifact });
    valid = true;
  } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
  process.stdout.write(`${JSON.stringify({ valid, certificationId, certificateDigest, ...(error ? { errors: [error] } : { errors: [] }) })}\n`);
  if (!valid) process.exitCode = 1;
} else {
  process.stderr.write("Usage: pi-fabric-arbor-host-integration-certify generate|verify [--created-at ISO --project-root PATH --package-root PATH --host-package-root PATH --host-agent-artifact PATH --approval-artifact PATH --artifact PATH]\n");
  process.exitCode = 2;
}
