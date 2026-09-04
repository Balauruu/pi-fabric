#!/usr/bin/env node
import { resolve } from "node:path";
import { generateRetentionCertification, verifyRetentionCertification, writeRetentionCertification } from "../src/certification/retention.js";

function options(argv: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || values.has(key.slice(2))) throw new Error(`Expected unique --name value pairs, got ${key ?? "<end>"}`);
    values.set(key.slice(2), value);
  }
  return values;
}

const [command, ...rest] = process.argv.slice(2); const values = options(rest);
const projectRoot = resolve(values.get("project-root") ?? ".");
const artifact = resolve(values.get("artifact") ?? "certification/phase6/retention-b12.v1.json");
if (command === "generate") {
  const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required");
  const certificate = generateRetentionCertification({ projectRoot, createdAt, signerId: values.get("signer-id") ?? "local_ci" });
  writeRetentionCertification(artifact, certificate);
  process.stdout.write(`${JSON.stringify({ certificationId: certificate.certificationId, certificateDigest: certificate.certificateDigest, observations: certificate.observations.length, passed: certificate.passed })}\n`);
} else if (command === "verify") {
  const result = verifyRetentionCertification({ projectRoot, artifact });
  process.stdout.write(`${JSON.stringify({ certificationId: result.certificate?.certificationId, certificateDigest: result.certificate?.certificateDigest, valid: result.valid, errors: result.errors })}\n`);
  if (!result.valid) process.exitCode = 1;
} else {
  process.stderr.write("Usage: pi-fabric-arbor-retention-certify generate|verify [--created-at ISO --artifact PATH --signer-id ID]\n"); process.exitCode = 2;
}
