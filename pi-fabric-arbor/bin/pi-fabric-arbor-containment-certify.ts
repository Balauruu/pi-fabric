#!/usr/bin/env node
import { resolve } from "node:path";
import { generateLocalContainmentCertification, verifyLocalContainmentCertification } from "../src/certification/containment.js";

const [command, ...args] = process.argv.slice(2);
const values = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) {
  const key = args[index]; const value = args[index + 1];
  if (!key?.startsWith("--") || value === undefined) throw new Error("Options require --name value pairs");
  values.set(key.slice(2), value);
}
const artifactRoot = resolve(values.get("artifact-root") ?? "certification/containment/linux-x86_64-bwrap-0.12.0");
if (command === "generate") {
  const createdAt = values.get("created-at");
  if (!createdAt) throw new Error("--created-at is required");
  const certificate = await generateLocalContainmentCertification({ outputRoot: artifactRoot, scratchRoot: resolve(values.get("scratch-root") ?? ".runtime/certification"), createdAt, signerId: values.get("signer-id") ?? "local_ci" });
  process.stdout.write(`${JSON.stringify({ certificateId: certificate.certificateId, certificateDigest: certificate.certificateDigest, valid: certificate.valid, checks: certificate.matrix.length })}\n`);
} else if (command === "verify") {
  const result = verifyLocalContainmentCertification(artifactRoot);
  process.stdout.write(`${JSON.stringify({ certificateId: result.certificate.certificateId, certificateDigest: result.certificate.certificateDigest, valid: result.valid })}\n`);
  if (!result.valid) process.exitCode = 1;
} else {
  process.stderr.write("Usage: pi-fabric-arbor-containment-certify generate|verify [--created-at ISO]\n");
  process.exitCode = 2;
}
