#!/usr/bin/env node
import { resolve } from "node:path";
import { generatePhase5PromotionCertification, verifyPhase5PromotionCertification } from "../src/certification/promotion.js";
const [command, ...args] = process.argv.slice(2); const values = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) { const key = args[index]; const value = args[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error("Options require --name value pairs"); values.set(key.slice(2), value); }
const projectRoot = resolve(values.get("project-root") ?? "."); const artifactRoot = resolve(values.get("artifact-root") ?? "certification/promotion/phase5");
if (command === "generate") { const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required"); const certificate = await generatePhase5PromotionCertification({ projectRoot, outputRoot: artifactRoot, createdAt, iterations: Number(values.get("iterations") ?? 20) }); process.stdout.write(`${JSON.stringify({ certificateId: certificate.certificateId, certificateDigest: certificate.certificateDigest, injections: certificate.crashEvidence.length, passed: certificate.passed })}\n`); }
else if (command === "verify") { const result = verifyPhase5PromotionCertification({ projectRoot, artifactRoot }); process.stdout.write(`${JSON.stringify({ certificateId: result.certificate.certificateId, certificateDigest: result.certificate.certificateDigest, valid: result.valid, errors: result.errors })}\n`); if (!result.valid) process.exitCode = 1; }
else { process.stderr.write("Usage: pi-fabric-arbor-promotion-certify generate|verify [--created-at ISO] [--iterations 20]\n"); process.exitCode = 2; }
