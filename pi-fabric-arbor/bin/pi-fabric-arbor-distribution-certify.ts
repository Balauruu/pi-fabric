#!/usr/bin/env node
import { resolve } from "node:path";
import { generateDistributionCertificate, verifyDistributionCertificate, writeDistributionCertificate } from "../src/certification/distribution.js";

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
const artifact = resolve(values.get("artifact") ?? "certification/phase6/distribution-phase6.v1.json");
if (command === "generate") {
  const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required");
  const certificate = generateDistributionCertificate({ projectRoot, createdAt, signerId: values.get("signer-id") ?? "local_ci" });
  writeDistributionCertificate(artifact, certificate);
  process.stdout.write(`${JSON.stringify({ certificationId: certificate.certificationId, certificateDigest: certificate.certificateDigest, files: certificate.fileCountExcludingSelf, passed: certificate.passed })}\n`);
} else if (command === "verify") {
  const result = verifyDistributionCertificate({ projectRoot, artifact });
  process.stdout.write(`${JSON.stringify({ certificationId: result.certificate?.certificationId, certificateDigest: result.certificate?.certificateDigest, valid: result.valid, errors: result.errors })}\n`);
  if (!result.valid) process.exitCode = 1;
} else {
  process.stderr.write("Usage: pi-fabric-arbor-distribution-certify generate|verify [--created-at ISO --artifact PATH --signer-id ID]\n"); process.exitCode = 2;
}
