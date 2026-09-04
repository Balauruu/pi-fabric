#!/usr/bin/env node
import { join, resolve } from "node:path";
import { generateUpstreamCertification, verifyUpstreamCertification } from "../src/certification/upstream.js";
import { findPiFabricPackageLockV1, piFabricCertificationRootV1, readCertifiedPiFabricVersionV1 } from "../src/certification/pi-fabric-support.js";

function options(argv: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name value, got ${key ?? "<end>"}`);
    parsed.set(key.slice(2), value);
  }
  return parsed;
}

const [command, ...rest] = process.argv.slice(2);
const values = options(rest);
const projectRoot = process.cwd(); const packageRoot = resolve(values.get("package-root") ?? "node_modules/pi-fabric"); const piFabricVersion = readCertifiedPiFabricVersionV1(packageRoot);
const packageLockPath = resolve(values.get("package-lock") ?? findPiFabricPackageLockV1(packageRoot));
const artifactRoot = resolve(values.get("artifact-root") ?? piFabricCertificationRootV1(join(projectRoot, "certification"), piFabricVersion));
const hostPiFabricRoot = resolve(values.get("host-package-root") ?? packageRoot);

if (command === "upstream") {
  const createdAt = values.get("created-at");
  if (!createdAt) throw new Error("--created-at is required for reproducible certification");
  const result = await generateUpstreamCertification({
    packageRoot,
    packageLockPath,
    arborSourceRoot: resolve(values.get("source-root") ?? "src"),
    outputRoot: artifactRoot,
    createdAt,
    signerId: values.get("signer-id") ?? "local_ci",
    hostPiFabricRoot,
  });
  process.stdout.write(`${JSON.stringify({ certificationId: result.certificate.certificationId, certificateDigest: result.certificate.certificateDigest, valid: result.certificate.valid, compatibilityCertificateId: result.compatibility.certificationId, compatibilityDigest: result.compatibility.certificateDigest, compatibilitySupported: result.compatibility.supported })}\n`);
} else if (command === "verify") {
  const result = verifyUpstreamCertification({ projectRoot, packageRoot, packageLockPath, artifactRoot, hostPiFabricRoot });
  process.stdout.write(`${JSON.stringify({ valid: result.valid, certificationId: result.certificate?.certificationId, certificateDigest: result.certificate?.certificateDigest, errors: result.errors })}\n`);
  if (!result.valid) process.exitCode = 1;
} else {
  process.stderr.write("Usage: pi-fabric-arbor-certify upstream|verify [--package-root PATH --host-package-root PATH --package-lock PATH --artifact-root PATH --created-at ISO --signer-id ID]\n");
  process.exitCode = 2;
}
