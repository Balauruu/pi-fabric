#!/usr/bin/env node
import { resolve } from "node:path";
import { generatePhase4RecoveryCertification, verifyPhase4RecoveryCertification } from "../src/certification/recovery.js";

const [command, ...args] = process.argv.slice(2);
const values = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) {
  const key = args[index]; const value = args[index + 1];
  if (!key?.startsWith("--") || value === undefined) throw new Error("Options require --name value pairs");
  values.set(key.slice(2), value);
}
const projectRoot = resolve(values.get("project-root") ?? ".");
const artifactRoot = resolve(values.get("artifact-root") ?? "certification/recovery/phase4");
if (command === "generate") {
  const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required");
  const certificate = generatePhase4RecoveryCertification({ projectRoot, outputRoot: artifactRoot, createdAt, iterationsPerBoundary: Number(values.get("iterations") ?? 20) });
  process.stdout.write(`${JSON.stringify({ certificateId: certificate.certificateId, certificateDigest: certificate.certificateDigest, boundaries: certificate.boundaryCount, injections: certificate.totalInjections, passed: certificate.passed })}\n`);
} else if (command === "verify") {
  const result = verifyPhase4RecoveryCertification({ projectRoot, artifactRoot });
  process.stdout.write(`${JSON.stringify({ certificateId: result.certificate.certificateId, certificateDigest: result.certificate.certificateDigest, boundaries: result.certificate.boundaryCount, injections: result.certificate.totalInjections, valid: result.valid, errors: result.errors })}\n`);
  if (!result.valid) process.exitCode = 1;
} else {
  process.stderr.write("Usage: pi-fabric-arbor-recovery-certify generate|verify [--created-at ISO] [--iterations 20]\n"); process.exitCode = 2;
}
