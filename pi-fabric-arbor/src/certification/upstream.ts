import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { arch, platform, release } from "node:os";
import { ArborError } from "../domain/errors.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { runProcess } from "../system/process.js";
import { generateFabricCompatibilityCertificate, verifyFabricCompatibilityCertificate, type FabricCompatibilityCertificateV1 } from "../compatibility/certification.js";
import { piFabricCertificationRootV1, piFabricVersionIdV1, readCertifiedPiFabricVersionV1, type CertifiedPiFabricVersionV1 } from "./pi-fabric-support.js";

export interface UpstreamEvidenceFileV1 {
  path: string;
  type: "file" | "symlink";
  bytes: number;
  mode: number;
  digest: string;
  supportsClaims: string[];
}

export interface UpstreamCommandEvidenceV1 {
  name: string;
  argv: string[];
  commandDigest: string;
  exitCode: number;
  stdoutDigest: string;
  stderrDigest: string;
  logPath: string;
  logDigest: string;
  complete: boolean;
}

export interface UpstreamCertificationV1 {
  version: 1;
  certificationId: string;
  createdAt: string;
  project: "pi-fabric";
  installedVersion: CertifiedPiFabricVersionV1;
  repositoryUrl: string;
  revision: string;
  platform: { os: string; architecture: string; release: string; runtime: string };
  toolVersions: Array<{ toolId: string; version: string }>;
  certificationToolDigests: Array<{ path: string; bytes: number; digest: string }>;
  packageLockProvenance: { lockfileVersion: number; packagePath: "node_modules/pi-fabric"; resolved: string; integrity: string; entryDigest: string; lockfileDigest: string };
  payloadBounds: { maximumFiles: number; maximumFileBytes: number; maximumTotalBytes: number; observedFiles: number; observedBytes: number };
  files: UpstreamEvidenceFileV1[];
  payloadManifestDigest: string;
  packageDigest: string;
  packageManifestDigest: string;
  exportMapDigest: string;
  publicExportDigests: Array<{ export: string; condition: string; path: string; bytes: number; digest: string }>;
  licenseNoticeDigests: Array<{ kind: "license" | "notice"; path: string; bytes: number; digest: string }>;
  interfaceDigests: {
    protocols: string;
    actionSchemas: string;
    componentInterfaces: string;
    approvalRepresentation: string;
    cancellationRepresentation: string;
    documentation: string;
  };
  claimToFiles: Array<{ claim: string; files: string[] }>;
  commands: UpstreamCommandEvidenceV1[];
  compatibilityCertificateId: string;
  compatibilityCertificateDigest: string;
  supportedVersions: string[];
  rejectedVersions: string[];
  provenance: { method: "installedPackage"; methodDigest: string; limitations: string[] };
  limitations: string[];
  signerId: string;
  predecessorDigest: string;
  valid: boolean;
  certificateDigest: string;
}

export interface GenerateUpstreamCertificationOptionsV1 {
  packageRoot: string;
  packageLockPath: string;
  arborSourceRoot: string;
  outputRoot: string;
  createdAt: string;
  signerId: string;
  predecessorDigest?: string;
  maximumFiles?: number;
  maximumFileBytes?: number;
  maximumTotalBytes?: number;
  hostPiFabricRoot?: string;
  hostAgentEvidencePath?: string;
  approvalRuntimeEvidencePath?: string;
  hostIntegrationEvidencePath?: string;
}

const CLAIMS: Readonly<Record<string, (path: string) => boolean>> = Object.freeze({
  "installed-payload": () => true,
  "package-manifest": (path) => path === "package.json",
  "public-export-map": (path) => path === "package.json" || ["dist/index.js", "dist/index.d.ts", "dist/protocol.js", "dist/protocol.d.ts"].includes(path),
  "public-provider-protocol": (path) => path === "dist/protocol.d.ts" || path === "dist/protocol.js",
  "agent-action-representation": (path) => path.includes("agents-actions") || path.includes("agents-provider") || path === "dist/agents/types.d.ts" || path.includes("fabric-runtime-state"),
  "component-interface": (path) => path === "dist/components/types.d.ts" || path === "dist/protocol.d.ts",
  "approval-representation": (path) => path === "dist/config.d.ts" || path.includes("approval-controller") || path.includes("direct-tool-approval") || path.includes("auto-approval"),
  "cancellation-representation": (path) => path === "dist/protocol.d.ts" || path === "dist/agents/types.d.ts" || path === "dist/agents/manager.d.ts",
  "schema-enforce-representation": (path) => path === "docs/schema-enforcement.md" || path.startsWith("dist/schema/") || path === "dist/config.d.ts",
  documentation: (path) => path === "README.md" || path.startsWith("docs/") || path.startsWith("skills/"),
  license: (path) => path === "LICENSE" || path === "package.json",
  notice: (path) => path === "THIRD_PARTY_NOTICES.md",
});

function claimsFor(path: string): string[] {
  return Object.entries(CLAIMS).filter(([, predicate]) => predicate(path)).map(([claim]) => claim).sort();
}

function walkPayload(root: string, maximumFiles: number, maximumFileBytes: number, maximumTotalBytes: number): { files: UpstreamEvidenceFileV1[]; totalBytes: number } {
  const files: UpstreamEvidenceFileV1[] = [];
  let totalBytes = 0;
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      if (name === "node_modules" || name === ".git") continue;
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isDirectory()) { visit(path); continue; }
      if (!stat.isFile() && !stat.isSymbolicLink()) throw new ArborError("EVIDENCE_INVALID", "Installed package payload contains an unsupported filesystem type", { path });
      const relativePath = relative(root, path).split(sep).join("/");
      const bytes = stat.isSymbolicLink() ? Buffer.from(readlinkSync(path, "utf8")) : readFileSync(path);
      if (bytes.byteLength > maximumFileBytes) throw new ArborError("EVIDENCE_INVALID", "Installed package payload file exceeds certification bound", { path: relativePath });
      totalBytes += bytes.byteLength;
      if (files.length >= maximumFiles || totalBytes > maximumTotalBytes) throw new ArborError("EVIDENCE_INVALID", "Installed package payload exceeds certification bounds");
      files.push({ path: relativePath, type: stat.isSymbolicLink() ? "symlink" : "file", bytes: bytes.byteLength, mode: stat.mode & 0o7777, digest: sha256(bytes), supportsClaims: claimsFor(relativePath) });
    }
  };
  visit(root);
  return { files, totalBytes };
}

function lockProvenance(path: string, expectedVersion: CertifiedPiFabricVersionV1): UpstreamCertificationV1["packageLockProvenance"] {
  const bytes = readFileSync(path);
  const lock = JSON.parse(bytes.toString("utf8")) as { lockfileVersion?: number; packages?: Record<string, Record<string, unknown>> };
  const entry = lock.packages?.["node_modules/pi-fabric"];
  if (!entry || entry.version !== expectedVersion || typeof entry.resolved !== "string" || typeof entry.integrity !== "string") throw new ArborError("EVIDENCE_INVALID", `package-lock does not pin pi-fabric ${expectedVersion} with resolved integrity`);
  return { lockfileVersion: lock.lockfileVersion ?? 0, packagePath: "node_modules/pi-fabric", resolved: entry.resolved, integrity: entry.integrity, entryDigest: digestCanonical(entry), lockfileDigest: sha256(bytes) };
}

function publicExports(root: string, manifest: Record<string, unknown>): UpstreamCertificationV1["publicExportDigests"] {
  const map = manifest.exports as Record<string, Record<string, string>>;
  const output: UpstreamCertificationV1["publicExportDigests"] = [];
  for (const exportName of Object.keys(map).sort()) {
    const conditions = map[exportName]!;
    for (const condition of Object.keys(conditions).sort()) {
      const relativePath = conditions[condition]!.replace(/^\.\//u, "");
      const bytes = readFileSync(join(root, relativePath));
      output.push({ export: exportName, condition, path: relativePath, bytes: bytes.byteLength, digest: sha256(bytes) });
    }
  }
  return output;
}

function aggregateDigest(files: readonly UpstreamEvidenceFileV1[], predicate: (path: string) => boolean): string {
  return digestCanonical(files.filter((file) => predicate(file.path)).map(({ path, bytes, digest }) => ({ path, bytes, digest })));
}

function certificationToolDigests(arborSourceRoot: string): Array<{ path: string; bytes: number; digest: string }> {
  const projectRoot = dirname(realpathSync(arborSourceRoot));
  return ["bin/pi-fabric-arbor-certify.ts", "bin/pi-fabric-arbor-host-integration-certify.ts", "src/certification/host-integration-runtime.ts", "src/certification/pi-fabric-support.ts", "src/certification/runtime-evidence.ts", "src/certification/upstream.ts", "src/compatibility/certification.ts", "src/system/process.ts", "src/util/canonical.ts"].map((path) => { const bytes = readFileSync(join(projectRoot, path)); return { path, bytes: bytes.byteLength, digest: sha256(bytes) }; });
}

function atomicWrite(path: string, value: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, { mode: 0o600 });
  renameSync(temporary, path);
}

async function commandEvidence(outputRoot: string, name: string, argv: readonly string[]): Promise<{ evidence: UpstreamCommandEvidenceV1; version: string }> {
  const result = await runProcess(argv, { env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" }, timeoutMs: 30_000, maxOutputBytes: 1_048_576 });
  const log = Buffer.from(canonicalJson({ argv, exitCode: result.exitCode, signal: result.signal, timedOut: result.timedOut, oversized: result.oversized, stdout: result.stdout.toString("base64"), stderr: result.stderr.toString("base64") }) + "\n");
  const logPath = `logs/${name}.log`;
  atomicWrite(join(outputRoot, logPath), log);
  return {
    evidence: { name, argv: [...argv], commandDigest: digestCanonical(argv), exitCode: result.exitCode, stdoutDigest: sha256(result.stdout), stderrDigest: sha256(result.stderr), logPath, logDigest: sha256(log), complete: !result.oversized && !result.timedOut },
    version: result.stdout.toString("utf8").trim() || result.stderr.toString("utf8").trim(),
  };
}

export function computeInstalledPackageDigest(packageRoot: string, bounds = { maximumFiles: 10_000, maximumFileBytes: 268_435_456, maximumTotalBytes: 2_147_483_648 }): { files: UpstreamEvidenceFileV1[]; totalBytes: number; digest: string } {
  const root = realpathSync(packageRoot);
  const walked = walkPayload(root, bounds.maximumFiles, bounds.maximumFileBytes, bounds.maximumTotalBytes);
  return { ...walked, digest: digestCanonical(walked.files) };
}

export async function generateUpstreamCertification(options: GenerateUpstreamCertificationOptionsV1): Promise<{ certificate: UpstreamCertificationV1; compatibility: FabricCompatibilityCertificateV1 }> {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(options.createdAt)) throw new ArborError("VALIDATION_FAILED", "Certification creation time must be canonical RFC 3339 milliseconds");
  const packageRoot = realpathSync(options.packageRoot); const piFabricVersion = readCertifiedPiFabricVersionV1(packageRoot);
  const outputRoot = resolve(options.outputRoot);
  const projectRoot = dirname(realpathSync(options.arborSourceRoot));
  const canonicalArtifactRoot = piFabricCertificationRootV1(join(projectRoot, "certification"), piFabricVersion);
  const hostAgentEvidencePath = resolve(options.hostAgentEvidencePath ?? (existsSync(join(outputRoot, "artifacts/host-runtime-evidence.v1.json")) ? join(outputRoot, "artifacts/host-runtime-evidence.v1.json") : join(canonicalArtifactRoot, "artifacts/host-runtime-evidence.v1.json")));
  const hostIntegrationEvidencePath = resolve(options.hostIntegrationEvidencePath ?? (existsSync(join(outputRoot, "artifacts/host-integration-runtime.v1.json")) ? join(outputRoot, "artifacts/host-integration-runtime.v1.json") : join(canonicalArtifactRoot, "artifacts/host-integration-runtime.v1.json")));
  const approvalRuntimeEvidencePath = resolve(options.approvalRuntimeEvidencePath ?? (existsSync(join(outputRoot, "artifacts/approval-runtime-evidence.v1.json")) ? join(outputRoot, "artifacts/approval-runtime-evidence.v1.json") : join(canonicalArtifactRoot, "artifacts/approval-runtime-evidence.v1.json")));
  const hostAgentEvidenceBytes = readFileSync(hostAgentEvidencePath); const approvalRuntimeEvidenceBytes = readFileSync(approvalRuntimeEvidencePath); const hostIntegrationEvidenceBytes = readFileSync(hostIntegrationEvidencePath);
  const maximumFiles = options.maximumFiles ?? 10_000;
  const maximumFileBytes = options.maximumFileBytes ?? 268_435_456;
  const maximumTotalBytes = options.maximumTotalBytes ?? 2_147_483_648;
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  chmodSync(outputRoot, 0o700);
  atomicWrite(join(outputRoot, "artifacts/host-runtime-evidence.v1.json"), hostAgentEvidenceBytes);
  atomicWrite(join(outputRoot, "artifacts/approval-runtime-evidence.v1.json"), approvalRuntimeEvidenceBytes);
  atomicWrite(join(outputRoot, "artifacts/host-integration-runtime.v1.json"), hostIntegrationEvidenceBytes);
  const payload = computeInstalledPackageDigest(packageRoot, { maximumFiles, maximumFileBytes, maximumTotalBytes });
  const manifestBytes = readFileSync(join(packageRoot, "package.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<string, unknown>;
  if (manifest.version !== piFabricVersion || manifest.name !== "pi-fabric") throw new ArborError("EVIDENCE_INVALID", `Installed package identity is not pi-fabric ${piFabricVersion}`);
  const lock = lockProvenance(options.packageLockPath, piFabricVersion);
  const exports = publicExports(packageRoot, manifest);
  const claimToFiles = Object.keys(CLAIMS).sort().map((claim) => ({ claim, files: payload.files.filter((file) => file.supportsClaims.includes(claim)).map((file) => file.path) }));
  if (claimToFiles.some((mapping) => mapping.files.length === 0)) throw new ArborError("EVIDENCE_INVALID", "At least one certification claim has no supporting file");

  const node = await commandEvidence(outputRoot, "node-version", [process.execPath, "--version"]);
  const npm = await commandEvidence(outputRoot, "npm-version", ["/usr/bin/npm", "--version"]);
  const gitVersion = await commandEvidence(outputRoot, "git-version", ["/usr/bin/git", "--version"]);
  const commands = [node.evidence, npm.evidence, gitVersion.evidence];
  const runtimeEvidence = {
    projectRoot, packageRoot, hostPackageRoot: resolve(options.hostPiFabricRoot ?? packageRoot),
    hostAgentArtifact: join(outputRoot, "artifacts/host-runtime-evidence.v1.json"), approvalArtifact: join(outputRoot, "artifacts/approval-runtime-evidence.v1.json"),
    hostIntegrationArtifact: join(outputRoot, "artifacts/host-integration-runtime.v1.json"),
  };
  const compatibility = await generateFabricCompatibilityCertificate({
    certificationId: `compatibility_pi_fabric_${piFabricVersionIdV1(piFabricVersion)}`, createdAt: options.createdAt, piFabricRoot: packageRoot,
    arborSourceRoot: options.arborSourceRoot, projectRoot, runtimeEvidence, packageDigest: payload.digest, signerId: options.signerId,
  });
  atomicWrite(join(outputRoot, "compatibility-results.v1.json"), `${canonicalJson(compatibility)}\n`);
  atomicWrite(join(outputRoot, "artifacts", "claim-to-file.v1.json"), `${canonicalJson(claimToFiles)}\n`);
  atomicWrite(join(outputRoot, "artifacts", "package-lock-provenance.v1.json"), `${canonicalJson(lock)}\n`);
  atomicWrite(join(outputRoot, "artifacts", "public-exports.v1.json"), `${canonicalJson(exports)}\n`);
  atomicWrite(join(outputRoot, "files.sha256"), payload.files.map((file) => `${file.digest}  ${file.path}\n`).join(""));

  const licenseNoticeDigests: UpstreamCertificationV1["licenseNoticeDigests"] = [
    { kind: "license", path: "LICENSE", bytes: readFileSync(join(packageRoot, "LICENSE")).byteLength, digest: sha256(readFileSync(join(packageRoot, "LICENSE"))) },
    { kind: "notice", path: "THIRD_PARTY_NOTICES.md", bytes: readFileSync(join(packageRoot, "THIRD_PARTY_NOTICES.md")).byteLength, digest: sha256(readFileSync(join(packageRoot, "THIRD_PARTY_NOTICES.md"))) },
  ];
  const predecessorDigest = options.predecessorDigest ?? sha256("pi-fabric-arbor-upstream-certificate-chain-root-v1");
  const base = {
    version: 1 as const,
    createdAt: options.createdAt,
    project: "pi-fabric" as const,
    installedVersion: piFabricVersion,
    repositoryUrl: String((manifest.repository as Record<string, unknown>).url).replace(/^git\+/u, ""),
    revision: `npm:pi-fabric@${piFabricVersion}#${lock.integrity}`,
    platform: { os: platform(), architecture: arch(), release: release(), runtime: process.version },
    toolVersions: [{ toolId: "node", version: node.version }, { toolId: "npm", version: npm.version }, { toolId: "git", version: gitVersion.version }],
    certificationToolDigests: certificationToolDigests(options.arborSourceRoot),
    packageLockProvenance: lock,
    payloadBounds: { maximumFiles, maximumFileBytes, maximumTotalBytes, observedFiles: payload.files.length, observedBytes: payload.totalBytes },
    files: payload.files,
    payloadManifestDigest: payload.digest,
    packageDigest: payload.digest,
    packageManifestDigest: sha256(manifestBytes),
    exportMapDigest: digestCanonical(manifest.exports),
    publicExportDigests: exports,
    licenseNoticeDigests,
    interfaceDigests: {
      protocols: aggregateDigest(payload.files, (path) => path === "dist/protocol.d.ts" || path === "dist/protocol.js"),
      actionSchemas: aggregateDigest(payload.files, (path) => path.includes("agents-actions") || path.includes("agents-provider") || path.includes("fabric-runtime-state")),
      componentInterfaces: aggregateDigest(payload.files, (path) => path === "dist/components/types.d.ts" || path === "dist/protocol.d.ts"),
      approvalRepresentation: aggregateDigest(payload.files, (path) => path === "dist/config.d.ts" || path.includes("approval-controller") || path.includes("auto-approval")),
      cancellationRepresentation: aggregateDigest(payload.files, (path) => path === "dist/protocol.d.ts" || path === "dist/agents/types.d.ts" || path === "dist/agents/manager.d.ts"),
      documentation: aggregateDigest(payload.files, (path) => path === "README.md" || path.startsWith("docs/") || path.startsWith("skills/")),
    },
    claimToFiles,
    commands,
    compatibilityCertificateId: compatibility.certificationId,
    compatibilityCertificateDigest: compatibility.certificateDigest,
    supportedVersions: compatibility.supported ? [piFabricVersion] : [],
    rejectedVersions: compatibility.supported ? [] : [`${piFabricVersion}-runtime-unverified`],
    provenance: { method: "installedPackage" as const, methodDigest: digestCanonical({ lock, payloadDigest: payload.digest }), limitations: ["The npm tarball does not carry a certified upstream Git commit OID; identity is the package-lock resolved URL, SRI, version, and complete installed payload digest."] },
    limitations: ["Compatibility is current-host evidence bound to exact retained runtime artifacts and source digests.", "License and notice bytes are verified as installed-package facts; legal conclusions remain external."],
    signerId: options.signerId,
    predecessorDigest,
    valid: commands.every((entry) => entry.exitCode === 0 && entry.complete) && payload.files.length > 0 && verifyFabricCompatibilityCertificate(compatibility, { piFabricRoot: packageRoot, arborSourceRoot: options.arborSourceRoot, projectRoot, runtimeEvidence, expectedPackageDigest: payload.digest }),
  };
  const certificationId = `upstream_${digestCanonical(base).slice(0, 32)}`;
  const unsigned = { ...base, certificationId };
  const certificate: UpstreamCertificationV1 = { ...unsigned, certificateDigest: digestCanonical(unsigned) };
  atomicWrite(join(outputRoot, "manifest.v1.json"), `${canonicalJson(certificate)}\n`);
  atomicWrite(join(outputRoot, "manifest.v1.sha256"), `${sha256(Buffer.from(`${canonicalJson(certificate)}\n`))}  manifest.v1.json\n`);
  return { certificate, compatibility };
}

export function verifyUpstreamCertification(options: { packageRoot: string; packageLockPath: string; artifactRoot: string; projectRoot?: string; hostPiFabricRoot?: string }): { valid: boolean; errors: string[]; certificate?: UpstreamCertificationV1 } {
  const errors: string[] = [];
  let certificate: UpstreamCertificationV1;
  try { certificate = JSON.parse(readFileSync(join(options.artifactRoot, "manifest.v1.json"), "utf8")) as UpstreamCertificationV1; }
  catch { return { valid: false, errors: ["manifest.v1.json is missing or invalid JSON"] }; }
  try {
    const piFabricVersion = readCertifiedPiFabricVersionV1(options.packageRoot);
    if (certificate.installedVersion !== piFabricVersion) errors.push("installed package version does not match the certificate");
    const payload = computeInstalledPackageDigest(options.packageRoot, certificate.payloadBounds);
    if (payload.digest !== certificate.payloadManifestDigest || payload.digest !== certificate.packageDigest) errors.push("installed payload digest mismatch");
    if (canonicalJson(payload.files) !== canonicalJson(certificate.files)) errors.push("full installed payload manifest mismatch");
    const lock = lockProvenance(options.packageLockPath, piFabricVersion);
    if (canonicalJson(lock) !== canonicalJson(certificate.packageLockProvenance)) errors.push("package-lock provenance mismatch");
    const manifestPath = join(options.packageRoot, "package.json");
    const manifestBytes = readFileSync(manifestPath);
    const manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<string, unknown>;
    if (certificate.packageManifestDigest !== sha256(manifestBytes)) errors.push("package manifest digest mismatch");
    if (canonicalJson(certificate.certificationToolDigests) !== canonicalJson(certificationToolDigests(join(options.projectRoot ?? dirname(options.packageLockPath), "src")))) errors.push("certification tool digest mismatch");
    if (certificate.exportMapDigest !== digestCanonical(manifest.exports)) errors.push("export map digest mismatch");
    const expectedExports = publicExports(options.packageRoot, manifest);
    if (canonicalJson(expectedExports) !== canonicalJson(certificate.publicExportDigests)) errors.push("public export manifest mismatch");
    const expectedLicenses: UpstreamCertificationV1["licenseNoticeDigests"] = [
      { kind: "license", path: "LICENSE", bytes: readFileSync(join(options.packageRoot, "LICENSE")).byteLength, digest: sha256(readFileSync(join(options.packageRoot, "LICENSE"))) },
      { kind: "notice", path: "THIRD_PARTY_NOTICES.md", bytes: readFileSync(join(options.packageRoot, "THIRD_PARTY_NOTICES.md")).byteLength, digest: sha256(readFileSync(join(options.packageRoot, "THIRD_PARTY_NOTICES.md"))) },
    ];
    if (canonicalJson(expectedLicenses) !== canonicalJson(certificate.licenseNoticeDigests)) errors.push("license/notice manifest mismatch");
    const expectedClaims = Object.keys(CLAIMS).sort().map((claim) => ({ claim, files: payload.files.filter((file) => file.supportsClaims.includes(claim)).map((file) => file.path) }));
    if (canonicalJson(expectedClaims) !== canonicalJson(certificate.claimToFiles)) errors.push("claim-to-file mapping mismatch");
    const expectedInterfaces = {
      protocols: aggregateDigest(payload.files, (path) => path === "dist/protocol.d.ts" || path === "dist/protocol.js"),
      actionSchemas: aggregateDigest(payload.files, (path) => path.includes("agents-actions") || path.includes("agents-provider") || path.includes("fabric-runtime-state")),
      componentInterfaces: aggregateDigest(payload.files, (path) => path === "dist/components/types.d.ts" || path === "dist/protocol.d.ts"),
      approvalRepresentation: aggregateDigest(payload.files, (path) => path === "dist/config.d.ts" || path.includes("approval-controller") || path.includes("auto-approval")),
      cancellationRepresentation: aggregateDigest(payload.files, (path) => path === "dist/protocol.d.ts" || path === "dist/agents/types.d.ts" || path === "dist/agents/manager.d.ts"),
      documentation: aggregateDigest(payload.files, (path) => path === "README.md" || path.startsWith("docs/") || path.startsWith("skills/")),
    };
    if (canonicalJson(expectedInterfaces) !== canonicalJson(certificate.interfaceDigests)) errors.push("interface digest mapping mismatch");
    const artifactRoot = realpathSync(options.artifactRoot);
    for (const command of certificate.commands) {
      if (command.logPath.startsWith("/") || command.logPath.split("/").some((part) => part === ".." || part === "")) { errors.push(`unsafe command log path: ${command.name}`); continue; }
      const logPath = resolve(artifactRoot, command.logPath);
      if (!logPath.startsWith(`${artifactRoot}${sep}`)) { errors.push(`escaped command log path: ${command.name}`); continue; }
      const log = readFileSync(logPath);
      if (sha256(log) !== command.logDigest || command.commandDigest !== digestCanonical(command.argv)) errors.push(`command log mismatch: ${command.name}`);
      const record = JSON.parse(log.toString("utf8")) as Record<string, unknown>;
      if (record.exitCode !== command.exitCode || digestCanonical(record.argv) !== command.commandDigest || sha256(Buffer.from(String(record.stdout), "base64")) !== command.stdoutDigest || sha256(Buffer.from(String(record.stderr), "base64")) !== command.stderrDigest) errors.push(`command log contents mismatch: ${command.name}`);
    }
    const compatibility = JSON.parse(readFileSync(join(artifactRoot, "compatibility-results.v1.json"), "utf8")) as FabricCompatibilityCertificateV1;
    const projectRoot = resolve(options.projectRoot ?? dirname(options.packageLockPath));
    const runtimeEvidence = {
      projectRoot, packageRoot: resolve(options.packageRoot), hostPackageRoot: resolve(options.hostPiFabricRoot ?? options.packageRoot),
      hostAgentArtifact: join(artifactRoot, "artifacts/host-runtime-evidence.v1.json"), approvalArtifact: join(artifactRoot, "artifacts/approval-runtime-evidence.v1.json"),
      hostIntegrationArtifact: join(artifactRoot, "artifacts/host-integration-runtime.v1.json"),
    };
    if (!verifyFabricCompatibilityCertificate(compatibility, { piFabricRoot: options.packageRoot, arborSourceRoot: join(projectRoot, "src"), projectRoot, runtimeEvidence, expectedPackageDigest: payload.digest }) || compatibility.certificateDigest !== certificate.compatibilityCertificateDigest || compatibility.packageDigest !== certificate.packageDigest) errors.push("compatibility artifact mismatch");
    if (canonicalJson(certificate.supportedVersions) !== canonicalJson(compatibility.supported ? [piFabricVersion] : []) || canonicalJson(certificate.rejectedVersions) !== canonicalJson(compatibility.supported ? [] : [`${piFabricVersion}-runtime-unverified`])) errors.push("supported/rejected version result mismatch");
    const expectedValidity = certificate.commands.every((entry) => entry.exitCode === 0 && entry.complete) && payload.files.length > 0 && verifyFabricCompatibilityCertificate(compatibility, { piFabricRoot: options.packageRoot, arborSourceRoot: join(projectRoot, "src"), projectRoot, runtimeEvidence, expectedPackageDigest: payload.digest });
    if (certificate.valid !== expectedValidity) errors.push("certificate validity predicate mismatch");
    const expectedFiles = `${certificate.files.map((file) => `${file.digest}  ${file.path}\n`).join("")}`;
    if (readFileSync(join(options.artifactRoot, "files.sha256"), "utf8") !== expectedFiles) errors.push("files.sha256 mismatch");
    const { certificateDigest, certificationId: _id, ...base } = certificate;
    const expectedId = `upstream_${digestCanonical(base).slice(0, 32)}`;
    if (certificate.certificationId !== expectedId) errors.push("certification ID mismatch");
    const { certificateDigest: _removed, ...unsigned } = certificate;
    if (certificateDigest !== digestCanonical(unsigned)) errors.push("certificate digest mismatch");
  } catch (error) { errors.push(error instanceof Error ? error.message : "verification failed"); }
  return { valid: errors.length === 0 && certificate.valid, errors, certificate };
}

