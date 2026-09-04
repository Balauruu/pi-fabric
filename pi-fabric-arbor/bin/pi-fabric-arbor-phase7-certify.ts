#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { generatePhase7GraduationCertification, verifyPhase7GraduationCertification } from "../src/certification/phase7.js";
import { createGraduationThresholdSealV1, readAndVerifyGraduationThresholdSealV1, writeGraduationThresholdSealV1 } from "../src/phase7/thresholds.js";

function option(name: string, fallback?: string): string | undefined { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : fallback; }
const command = process.argv[2]; const projectRoot = resolve(option("--project-root", process.cwd())!); const outputRoot = resolve(option("--output-root", join(projectRoot, "certification/phase7"))!); const sealPath = join(outputRoot, "graduation-thresholds.v1.json"); const hostPiFabricRoot = resolve(option("--host-package-root", join(projectRoot, "../npm/node_modules/pi-fabric"))!);
if (command === "seal") {
  const sealedAt = option("--sealed-at", new Date().toISOString())!; const notAfter = option("--not-after", new Date(Date.parse(sealedAt) + 4 * 60 * 60_000).toISOString())!;
  const seal = createGraduationThresholdSealV1({ sealId: "seal_phase7_graduation_v1", sealedAt, notAfter, executionNonce: randomBytes(32).toString("base64url"), signerId: option("--signer", "signer_phase7_product_owner")! }); writeGraduationThresholdSealV1(sealPath, seal);
  process.stdout.write(`${JSON.stringify({ sealId: seal.sealId, sealDigest: seal.sealDigest, sealedAt: seal.sealedAt, notAfter: seal.notAfter, thresholds: seal.thresholds })}\n`);
} else if (command === "run") {
  const createdAt = option("--created-at", new Date().toISOString())!; const certificate = await generatePhase7GraduationCertification({ projectRoot, outputRoot, hostPiFabricRoot, createdAt, signerId: option("--signer", "signer_phase7_release")! }); process.stdout.write(`${JSON.stringify({ certificationId: certificate.certificationId, certificateDigest: certificate.certificateDigest, passed: certificate.passed, predicates: certificate.predicates, unresolvedPredicates: certificate.unresolvedPredicates })}\n`); if (!certificate.passed) process.exitCode = 1;
} else if (command === "verify") {
  const result = await verifyPhase7GraduationCertification({ projectRoot, outputRoot, hostPiFabricRoot }); process.stdout.write(`${JSON.stringify({ valid: result.valid, certificationId: result.certificate?.certificationId, certificateDigest: result.certificate?.certificateDigest, errors: result.errors })}\n`); if (!result.valid) process.exitCode = 1;
} else if (command === "verify-seal") {
  const result = readAndVerifyGraduationThresholdSealV1(sealPath); process.stdout.write(`${JSON.stringify({ valid: result.valid, sealId: result.seal.sealId, sealDigest: result.seal.sealDigest, errors: result.errors })}\n`); if (!result.valid) process.exitCode = 1;
} else throw new Error("usage: pi-fabric-arbor-phase7-certify <seal|run|verify|verify-seal> [options]");
