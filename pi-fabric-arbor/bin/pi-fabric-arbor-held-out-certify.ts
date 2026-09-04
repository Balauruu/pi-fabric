#!/usr/bin/env node
import { resolve } from "node:path";
import { generateLocalHeldOutIsolationCertification, verifyLocalHeldOutIsolationCertification } from "../src/certification/held-out.js";
const [command, ...args] = process.argv.slice(2); const values = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) { const key = args[index]; const value = args[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error("Options require --name value pairs"); values.set(key.slice(2), value); }
const projectRoot = resolve(values.get("project-root") ?? "."); const artifactRoot = resolve(values.get("artifact-root") ?? "certification/held-out/linux-x86_64-bwrap-0.12.0");
if (command === "generate") { const createdAt = values.get("created-at"); if (!createdAt) throw new Error("--created-at is required"); const certificate = await generateLocalHeldOutIsolationCertification({ projectRoot, outputRoot: artifactRoot, createdAt, signerId: "local_held_out_certifier" }); process.stdout.write(`${JSON.stringify({ certificateId: certificate.certificateId, certificateDigest: certificate.certificateDigest, tests: certificate.tests.length, valid: certificate.valid })}\n`); }
else if (command === "verify") { const result = verifyLocalHeldOutIsolationCertification({ projectRoot, artifactRoot }); process.stdout.write(`${JSON.stringify({ certificateId: result.certificate.certificateId, certificateDigest: result.certificate.certificateDigest, valid: result.valid })}\n`); if (!result.valid) process.exitCode = 1; }
else { process.stderr.write("Usage: pi-fabric-arbor-held-out-certify generate|verify [--created-at ISO]\n"); process.exitCode = 2; }
