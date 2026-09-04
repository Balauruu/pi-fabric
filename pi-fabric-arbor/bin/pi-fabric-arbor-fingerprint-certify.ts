#!/usr/bin/env node
import { resolve } from "node:path";
import { generateFingerprintTrialCertification, verifyFingerprintTrialCertification } from "../src/certification/fingerprint.js";

const [command, ...args] = process.argv.slice(2); const values = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) { const key = args[index]; const value = args[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error("Options require --name value pairs"); values.set(key.slice(2), value); }
const artifactRoot = resolve(values.get("artifact-root") ?? "certification/fingerprint/linux-git-2.55.0");
if (command === "generate") {
  const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required");
  const certification = await generateFingerprintTrialCertification({ outputRoot: artifactRoot, createdAt, signerId: values.get("signer-id") ?? "local_ci" });
  process.stdout.write(`${JSON.stringify({ certificationId: certification.certificationId, certificationDigest: certification.certificationDigest, finalCertificateId: certification.finalCertificateId, finalCertificateDigest: certification.finalCertificateDigest, valid: certification.passed })}\n`);
} else if (command === "verify") {
  const result = verifyFingerprintTrialCertification(artifactRoot); process.stdout.write(`${JSON.stringify({ certificationId: result.certification.certificationId, certificationDigest: result.certification.certificationDigest, finalCertificateId: result.certification.finalCertificateId, finalCertificateDigest: result.certification.finalCertificateDigest, valid: result.valid })}\n`); if (!result.valid) process.exitCode = 1;
} else { process.stderr.write("Usage: pi-fabric-arbor-fingerprint-certify generate|verify --created-at ISO\n"); process.exitCode = 2; }
