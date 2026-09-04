#!/usr/bin/env node
import { resolve } from "node:path";
import { generateLocalAuthorizationCertification, verifyLocalAuthorizationCertification } from "../src/certification/authorization.js";
const [command, ...args] = process.argv.slice(2); const values = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) { const key = args[index]; const value = args[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error("Options require --name value pairs"); values.set(key.slice(2), value); }
const projectRoot = resolve(values.get("project-root") ?? "."); const artifactRoot = resolve(values.get("artifact-root") ?? "certification/authorization/local-ed25519");
if (command === "generate") { const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required"); const certificate = await generateLocalAuthorizationCertification({ projectRoot, outputRoot: artifactRoot, createdAt, signerId: "local_authorization_certifier" }); process.stdout.write(`${JSON.stringify({ certificateId: certificate.certificateId, certificateDigest: certificate.certificateDigest, tests: certificate.tests.length, valid: certificate.valid })}\n`); }
else if (command === "verify") { const result = verifyLocalAuthorizationCertification({ projectRoot, artifactRoot }); process.stdout.write(`${JSON.stringify({ certificateId: result.certificate.certificateId, certificateDigest: result.certificate.certificateDigest, valid: result.valid })}\n`); if (!result.valid) process.exitCode = 1; }
else { process.stderr.write("Usage: pi-fabric-arbor-authorization-certify generate|verify [--created-at ISO]\n"); process.exitCode = 2; }
