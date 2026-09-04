import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, lstatSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { JsonSchema } from "../schemas/catalog.js";
import { validateJsonSchema } from "../schemas/validate.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

export interface DistributionFileV1 { path: string; size: number; mode: number; digest: string }
export interface DistributionDigestEntryV1 extends DistributionFileV1 {}
export interface DistributionToolDigestV1 { name: string; version: string; fileCount: number; bytes: number; digest: string }
export interface DistributionSurfaceInventoriesV1 {
  bins: DistributionFileV1[];
  exports: DistributionFileV1[];
  assets: DistributionFileV1[];
  licenses: DistributionFileV1[];
  notices: DistributionFileV1[];
}
export interface DistributionObservationV1 { version: 1; name: string; passed: boolean; evidenceDigest: string }
export interface DistributionCertificateV1 {
  version: 1;
  certificationId: "distribution_phase6_v1";
  createdAt: string;
  packageName: string;
  packageVersion: string;
  packageJsonDigest: string;
  packageLockDigest: string;
  sourceDigests: DistributionDigestEntryV1[];
  toolDigests: DistributionToolDigestV1[];
  files: DistributionFileV1[];
  surfaceInventories: DistributionSurfaceInventoriesV1;
  tarballDigest: string;
  unpackedInventoryDigest: string;
  inventoryDigest: string;
  fileCountExcludingSelf: number;
  unpackedBytesExcludingSelf: number;
  observations: DistributionObservationV1[];
  excludedSelfPaths: string[];
  passed: boolean;
  signerId: string;
  limitations: string[];
  certificateDigest: string;
}

interface PackageManifestV1 { name: string; version: string; bin: Record<string, string>; exports: Record<string, { types: string; import: string }>; files: string[] }
interface PackFileV1 { path: string; size: number; mode: number }
interface PackResultV1 { name: string; version: string; filename: string; files: PackFileV1[] }
export interface DistributionInspectionV1 {
  manifest: PackageManifestV1;
  files: DistributionFileV1[];
  unpackedFiles: DistributionFileV1[];
  sourceDigests: DistributionDigestEntryV1[];
  toolDigests: DistributionToolDigestV1[];
  surfaceInventories: DistributionSurfaceInventoriesV1;
  tarballDigest: string;
  observations: DistributionObservationV1[];
}

const FILE = "distribution-phase6.v1.json";
export const DISTRIBUTION_SELF_PATHS_V1 = Object.freeze([`certification/phase6/${FILE}`, `certification/phase6/${FILE}.sha256`].sort());
const BUILD_SOURCE_DIRECTORIES = ["src", "bin", "web"] as const;
const BUILD_SOURCE_FILES = ["package.json", "package-lock.json", "tsconfig.build.json", "scripts/build-web.mjs"] as const;
const MAX_PACKED_FILES = 5_000;
const MAX_FILE_BYTES = 268_435_456;
const MAX_TOOL_FILES = 20_000;

const digestSchema = { type: "string", pattern: "^[0-9a-f]{64}$", minLength: 64, maxLength: 64 } as const;
const safeIntegerSchema = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const textSchema = { type: "string", minLength: 1, maxLength: 4_096 } as const;
const closed = (properties: Record<string, JsonSchema>, required: readonly string[] = Object.keys(properties)): JsonSchema => ({ type: "object", properties, required, additionalProperties: false });
const boundedArray = (items: JsonSchema, maxItems: number, minItems = 0): JsonSchema => ({ type: "array", items, minItems, maxItems });
const distributionFileSchema = closed({ path: { type: "string", minLength: 1, maxLength: 1_024 }, size: safeIntegerSchema, mode: { type: "integer", minimum: 0, maximum: 0o777 }, digest: digestSchema });
const distributionToolSchema = closed({ name: { type: "string", minLength: 1, maxLength: 214 }, version: { type: "string", minLength: 1, maxLength: 128 }, fileCount: safeIntegerSchema, bytes: safeIntegerSchema, digest: digestSchema });
const distributionObservationSchema = closed({ version: { const: 1 }, name: { type: "string", minLength: 1, maxLength: 256 }, passed: { type: "boolean" }, evidenceDigest: digestSchema });
export const DISTRIBUTION_CERTIFICATE_SCHEMA_V1: JsonSchema = closed({
  version: { const: 1 }, certificationId: { const: "distribution_phase6_v1" }, createdAt: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$", minLength: 24, maxLength: 24 },
  packageName: { type: "string", minLength: 1, maxLength: 214 }, packageVersion: { type: "string", minLength: 1, maxLength: 128 }, packageJsonDigest: digestSchema, packageLockDigest: digestSchema,
  sourceDigests: boundedArray(distributionFileSchema, MAX_PACKED_FILES, 1), toolDigests: boundedArray(distributionToolSchema, 16, 1), files: boundedArray(distributionFileSchema, MAX_PACKED_FILES, 1),
  surfaceInventories: closed({ bins: boundedArray(distributionFileSchema, MAX_PACKED_FILES), exports: boundedArray(distributionFileSchema, MAX_PACKED_FILES), assets: boundedArray(distributionFileSchema, MAX_PACKED_FILES), licenses: boundedArray(distributionFileSchema, MAX_PACKED_FILES), notices: boundedArray(distributionFileSchema, MAX_PACKED_FILES) }),
  tarballDigest: digestSchema, unpackedInventoryDigest: digestSchema, inventoryDigest: digestSchema, fileCountExcludingSelf: safeIntegerSchema, unpackedBytesExcludingSelf: safeIntegerSchema,
  observations: boundedArray(distributionObservationSchema, 64, 1), excludedSelfPaths: { type: "array", items: { type: "string", minLength: 1, maxLength: 1_024 }, minItems: 2, maxItems: 2, uniqueItems: true }, passed: { type: "boolean" },
  signerId: { type: "string", pattern: "^[a-z][a-z0-9_]{2,63}$", minLength: 3, maxLength: 64 }, limitations: boundedArray(textSchema, 32, 1), certificateDigest: digestSchema,
});

function observed(name: string, passed: boolean, evidence: unknown): DistributionObservationV1 {
  return { version: 1, name, passed, evidenceDigest: digestCanonical({ name, evidence }) };
}

function parsePackResult(stdout: string): PackResultV1 {
  const parsed = JSON.parse(stdout) as PackResultV1[] | Record<string, PackResultV1>;
  const record = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
  if (!record || !Array.isArray(record.files) || !record.filename) throw new Error("npm pack returned no bounded file inventory");
  if (record.files.length < 1 || record.files.length > MAX_PACKED_FILES) throw new Error("npm pack file inventory is outside the release bound");
  return record;
}

function runPack(projectRoot: string, destination?: string): PackResultV1 {
  const args = ["pack", ...(destination ? [] : ["--dry-run"]), "--ignore-scripts", "--json", ...(destination ? ["--pack-destination", destination] : [])];
  const result = spawnSync("npm", args, { cwd: projectRoot, encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`npm ${args.join(" ")} failed: ${(result.stderr || result.stdout).slice(0, 4096)}`);
  return parsePackResult(result.stdout);
}

function safeRelative(root: string, path: string): string {
  const value = relative(root, path).split(sep).join("/");
  if (!value || value === ".." || value.startsWith("../") || value.startsWith("/") || value.includes("\\")) throw new Error("distribution inventory escaped its root");
  return value;
}

function walkFiles(root: string, maximum: number): DistributionFileV1[] {
  const base = resolve(root); const files: DistributionFileV1[] = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name); const stat = lstatSync(path); const relativePath = safeRelative(base, path);
      if (stat.isSymbolicLink()) throw new Error(`distribution inventory contains a symlink: ${relativePath}`);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) files.push({ path: relativePath, size: stat.size, mode: stat.mode & 0o777, digest: sha256(readFileSync(path)) });
      else throw new Error(`distribution inventory contains a non-file entry: ${relativePath}`);
      if (files.length > maximum) throw new Error(`distribution inventory exceeds ${maximum} files`);
    }
  };
  visit(base);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function activePackFiles(projectRoot: string, packed: PackResultV1): DistributionFileV1[] {
  return packed.files.map((entry) => {
    if (!entry.path || entry.path.startsWith("/") || entry.path.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error("npm pack emitted an unsafe path");
    if (!Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > MAX_FILE_BYTES || !Number.isSafeInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o777) throw new Error(`npm pack emitted invalid metadata for ${entry.path}`);
    const path = join(projectRoot, entry.path); const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`packed source is not a regular file: ${entry.path}`);
    return { path: entry.path, size: entry.size, mode: entry.mode, digest: sha256(readFileSync(path)) };
  }).sort((left, right) => left.path.localeCompare(right.path));
}

function buildSourceDigests(projectRoot: string): DistributionDigestEntryV1[] {
  const files: DistributionDigestEntryV1[] = BUILD_SOURCE_FILES.map((path) => {
    const stat = lstatSync(join(projectRoot, path));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`distribution build input is not a regular file: ${path}`);
    return { path, size: stat.size, mode: stat.mode & 0o777, digest: sha256(readFileSync(join(projectRoot, path))) };
  });
  for (const directory of BUILD_SOURCE_DIRECTORIES) {
    for (const entry of walkFiles(join(projectRoot, directory), MAX_TOOL_FILES)) files.push({ ...entry, path: `${directory}/${entry.path}` });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function commandVersion(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw new Error(`unable to identify distribution tool ${command}`);
  return (result.stdout || result.stderr).trim().split("\n", 1)[0]!.slice(0, 256);
}

function toolTree(name: string, version: string, root: string): DistributionToolDigestV1 {
  const files = walkFiles(root, MAX_TOOL_FILES); return { name, version, fileCount: files.length, bytes: files.reduce((sum, entry) => sum + entry.size, 0), digest: digestCanonical(files) };
}

function toolDigests(projectRoot: string): DistributionToolDigestV1[] {
  const nodePath = realpathSync(process.execPath); const nodeStat = lstatSync(nodePath);
  const npmCli = realpathSync(process.env.npm_execpath ?? "/usr/lib/node_modules/npm/bin/npm-cli.js"); const npmRoot = resolve(dirname(npmCli), "..");
  const tarPath = realpathSync("/usr/bin/tar"); const tarStat = lstatSync(tarPath);
  const packageTool = (name: string): DistributionToolDigestV1 => {
    const packageRoot = join(projectRoot, "node_modules", ...name.split("/"));
    const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as { version: string };
    return toolTree(name, packageJson.version, packageRoot);
  };
  return [
    { name: "node", version: process.version, fileCount: 1, bytes: nodeStat.size, digest: sha256(readFileSync(nodePath)) },
    toolTree("npm", commandVersion("npm", ["--version"]), npmRoot),
    { name: "tar", version: commandVersion("tar", ["--version"]), fileCount: 1, bytes: tarStat.size, digest: sha256(readFileSync(tarPath)) },
    packageTool("typescript"), packageTool("@types/node"), packageTool("pi-fabric"),
  ].sort((left, right) => left.name.localeCompare(right.name));
}

function pick(files: DistributionFileV1[], paths: readonly string[]): DistributionFileV1[] {
  const byPath = new Map(files.map((entry) => [entry.path, entry]));
  return [...new Set(paths)].sort().flatMap((path) => byPath.has(path) ? [byPath.get(path)!] : []);
}

function surfaceInventories(projectRoot: string, manifest: PackageManifestV1, files: DistributionFileV1[]): DistributionSurfaceInventoriesV1 {
  const bins = Object.values(manifest.bin).map((path) => path.replace(/^\.\//u, ""));
  const exports = Object.values(manifest.exports).flatMap((entry) => [entry.types, entry.import]).map((path) => path.replace(/^\.\//u, ""));
  const assetManifestPath = "dist/web-assets/asset-manifest.v1.json";
  const assetManifest = JSON.parse(readFileSync(join(projectRoot, assetManifestPath), "utf8")) as { files: Array<{ fileName: string }> };
  const assets = [assetManifestPath, ...assetManifest.files.map((entry) => `dist/web-assets/${entry.fileName}`)];
  return { bins: pick(files, bins), exports: pick(files, exports), assets: pick(files, assets), licenses: pick(files, ["LICENSE"]), notices: pick(files, ["NOTICE", "THIRD_PARTY_NOTICES.md"]) };
}

function leakedPaths(files: DistributionFileV1[]): string[] {
  const forbidden = /^(?:node_modules|\.test-dist|\.runtime|runtime|tests|browser-tests|coverage|src|web|bin)(?:\/|$)|(?:^|\/)(?:\.env(?:\.|$)|npm-debug\.log|[^/]+\.tgz|[^/]+\.(?:pem|key|pk8|sqlite3(?:-wal|-shm)?))$/u;
  return files.map((entry) => entry.path).filter((path) => forbidden.test(path) || /(?:^|\/)__pycache__(?:\/|$)|\.tsbuildinfo$/u.test(path));
}

function leakedContent(projectRoot: string, files: DistributionFileV1[]): string[] {
  const textFile = /\.(?:css|d\.ts|html|js|json|jsonl|map|md|mjs|py|txt)$/u;
  const privatePath = /(?:\/home\/(?!arbor\/)[A-Za-z0-9._-]+\/|\/Users\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\|file:\/\/\/)/u;
  const secret = /(?:-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN)=[^\s"']+|\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,})/u;
  const leaks: string[] = [];
  for (const entry of files) {
    if (!textFile.test(entry.path) || entry.size > 4 * 1024 * 1024) continue;
    const value = readFileSync(join(projectRoot, entry.path), "utf8");
    if (privatePath.test(value) || secret.test(value)) leaks.push(entry.path);
  }
  return leaks;
}

export function inspectDistribution(projectRoot: string): DistributionInspectionV1 {
  const root = resolve(projectRoot); const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageManifestV1;
  const dryRun = runPack(root); const temporary = mkdtempSync(join(tmpdir(), "arbor-npm-pack-"));
  try {
    const packed = runPack(root, temporary); const tarball = join(temporary, packed.filename);
    const unpackRoot = join(temporary, "unpacked"); mkdirSync(unpackRoot, { recursive: true, mode: 0o700 });
    const extraction = spawnSync("tar", ["--extract", "--gzip", "--file", tarball, "--directory", unpackRoot, "--no-same-owner"], { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    if (extraction.status !== 0) throw new Error(`independent npm tarball extraction failed: ${(extraction.stderr || extraction.stdout).slice(0, 4096)}`);
    const activeFull = activePackFiles(root, packed); const unpackedFull = walkFiles(join(unpackRoot, "package"), MAX_PACKED_FILES);
    const dryMetadata = dryRun.files.filter((entry) => !DISTRIBUTION_SELF_PATHS_V1.includes(entry.path)).map(({ path, size, mode }) => ({ path, size, mode })).sort((left, right) => left.path.localeCompare(right.path));
    const packedMetadata = packed.files.filter((entry) => !DISTRIBUTION_SELF_PATHS_V1.includes(entry.path)).map(({ path, size, mode }) => ({ path, size, mode })).sort((left, right) => left.path.localeCompare(right.path));
    const files = activeFull.filter((entry) => !DISTRIBUTION_SELF_PATHS_V1.includes(entry.path));
    const unpackedFiles = unpackedFull.filter((entry) => !DISTRIBUTION_SELF_PATHS_V1.includes(entry.path));
    const paths = new Set(files.map((entry) => entry.path)); const surfaceInventoriesValue = surfaceInventories(root, manifest, files);
    const binTargets = Object.values(manifest.bin).map((entry) => entry.replace(/^\.\//u, ""));
    const exportTargets = Object.values(manifest.exports).flatMap((entry) => [entry.types, entry.import]).map((entry) => entry.replace(/^\.\//u, ""));
    const required = [
      "LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md", "README.md", "acceptance-ledger.md", "docs/compatibility-matrix.md", "docs/schema-reference.md", "docs/administrator-guide.md", "docs/consumer-installation.md", "skills/fabric-arbor/SKILL.md",
      "certification/upstream/pi-fabric/0.76.2/manifest.v1.json", "certification/upstream/pi-fabric/0.76.2/compatibility-results.v1.json",
      "certification/upstream/pi-fabric/0.76.2/artifacts/host-runtime-evidence.v1.json", "certification/upstream/pi-fabric/0.76.2/artifacts/approval-runtime-evidence.v1.json", "certification/upstream/pi-fabric/0.76.2/artifacts/host-integration-runtime.v1.json",
      "certification/upstream/pi-fabric/0.77.0/manifest.v1.json", "certification/upstream/pi-fabric/0.77.0/compatibility-results.v1.json",
      "certification/upstream/pi-fabric/0.77.0/artifacts/host-runtime-evidence.v1.json", "certification/upstream/pi-fabric/0.77.0/artifacts/approval-runtime-evidence.v1.json", "certification/upstream/pi-fabric/0.77.0/artifacts/host-integration-runtime.v1.json",
      "certification/phase6/web-threat-b9.v1.json", "certification/phase6/approval-runtime-b9.v1.json", "certification/phase6/licensing-b10.v1.json", "certification/phase6/retention-b12.v1.json",
      "certification/phase7/graduation-thresholds.v1.json", "certification/phase7/supported-platform.v1.json", "certification/phase7/acceptance-maximize.v1.json", "certification/phase7/acceptance-minimize.v1.json", "certification/phase7/benchmark-results.v1.json", "certification/phase7/soak-results.v1.json", "certification/phase7/logs/soak-cycles.v1.jsonl", "certification/phase7/browser/results.v1.json", "certification/phase7/reviews/security.v1.json", "certification/phase7/reviews/accessibility.v1.json", "certification/phase7/reviews/license.v1.json", "certification/phase7/graduation-certificate.v1.json", "scripts/phase7-reviewer.mjs",
      ...binTargets, ...exportTargets, ...surfaceInventoriesValue.assets.map((entry) => entry.path),
    ];
    const pathLeaks = leakedPaths(activeFull); const contentLeaks = leakedContent(root, activeFull);
    const expectedSurfaceCounts = { bins: new Set(binTargets).size, exports: new Set(exportTargets).size, assets: surfaceInventoriesValue.assets.length, licenses: 1, notices: 2 };
    const actualSurfaceCounts = Object.fromEntries(Object.entries(surfaceInventoriesValue).map(([name, entries]) => [name, entries.length]));
    const observations = [
      observed("package-identity", packed.name === manifest.name && packed.version === manifest.version && dryRun.name === manifest.name && dryRun.version === manifest.version, { packed: `${packed.name}@${packed.version}`, dryRun: `${dryRun.name}@${dryRun.version}`, manifest: `${manifest.name}@${manifest.version}` }),
      observed("dry-run-and-packed-metadata-exact", canonicalJson(dryMetadata) === canonicalJson(packedMetadata), { dryMetadata, packedMetadata }),
      observed("independent-unpack-path-bytes-mode-digest-exact", canonicalJson(files) === canonicalJson(unpackedFiles), { activeDigest: digestCanonical(files), unpackedDigest: digestCanonical(unpackedFiles), activeFiles: files.length, unpackedFiles: unpackedFiles.length }),
      observed("self-path-exclusion-explicit", canonicalJson(DISTRIBUTION_SELF_PATHS_V1) === canonicalJson([...DISTRIBUTION_SELF_PATHS_V1].sort()) && DISTRIBUTION_SELF_PATHS_V1.every((path) => activeFull.some((entry) => entry.path === path)) && files.every((entry) => !DISTRIBUTION_SELF_PATHS_V1.includes(entry.path)), { excluded: DISTRIBUTION_SELF_PATHS_V1 }),
      observed("all-bin-targets-built", binTargets.length >= 15 && binTargets.every((path) => paths.has(path)), { binTargets }),
      observed("all-export-targets-built", exportTargets.every((path) => paths.has(path)), { exportTargets }),
      observed("release-web-assets-built", surfaceInventoriesValue.assets.length >= 4 && surfaceInventoriesValue.assets.every((entry) => paths.has(entry.path)), { assets: surfaceInventoriesValue.assets }),
      observed("license-notice-surface-exact", surfaceInventoriesValue.licenses.length === 1 && surfaceInventoriesValue.notices.length === 2, { licenses: surfaceInventoriesValue.licenses, notices: surfaceInventoriesValue.notices }),
      observed("surface-inventories-exact", canonicalJson(expectedSurfaceCounts) === canonicalJson(actualSurfaceCounts), { expectedSurfaceCounts, actualSurfaceCounts }),
      observed("required-evidence-notices-and-docs-shipped", required.every((path) => paths.has(path)), { missing: required.filter((path) => !paths.has(path)) }),
      observed("generated-runtime-test-secret-and-path-leaks-rejected", pathLeaks.length === 0 && contentLeaks.length === 0, { pathLeaks, contentLeaks }),
      observed("bounded-content-addressed-package-inventory", files.length > 0 && files.length <= MAX_PACKED_FILES && files.every((entry) => Number.isSafeInteger(entry.size) && entry.size >= 0 && entry.size <= MAX_FILE_BYTES && /^[0-9a-f]{64}$/u.test(entry.digest)), { files: files.length, bytes: files.reduce((sum, entry) => sum + entry.size, 0), inventoryDigest: digestCanonical(files) }),
    ];
    // A certificate cannot hash a tarball containing itself. This digest covers the independently unpacked, content-addressed tar payload after the two explicit self paths are removed.
    const tarballDigest = digestCanonical(unpackedFiles);
    return { manifest, files, unpackedFiles, sourceDigests: buildSourceDigests(root), toolDigests: toolDigests(root), surfaceInventories: surfaceInventoriesValue, tarballDigest, observations };
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

export function generateDistributionCertificate(input: { projectRoot?: string; createdAt: string; signerId: string }): DistributionCertificateV1 {
  const projectRoot = resolve(input.projectRoot ?? process.cwd()); const inspected = inspectDistribution(projectRoot);
  const base = {
    version: 1 as const, certificationId: "distribution_phase6_v1" as const, createdAt: input.createdAt,
    packageName: inspected.manifest.name, packageVersion: inspected.manifest.version,
    packageJsonDigest: sha256(readFileSync(join(projectRoot, "package.json"))), packageLockDigest: sha256(readFileSync(join(projectRoot, "package-lock.json"))),
    sourceDigests: inspected.sourceDigests, toolDigests: inspected.toolDigests, files: inspected.files, surfaceInventories: inspected.surfaceInventories,
    tarballDigest: inspected.tarballDigest, unpackedInventoryDigest: digestCanonical(inspected.unpackedFiles), inventoryDigest: digestCanonical(inspected.files),
    fileCountExcludingSelf: inspected.files.length, unpackedBytesExcludingSelf: inspected.files.reduce((sum, entry) => sum + entry.size, 0),
    observations: inspected.observations, excludedSelfPaths: [...DISTRIBUTION_SELF_PATHS_V1], passed: inspected.observations.every((entry) => entry.passed), signerId: input.signerId,
    limitations: ["The certificate validates an independently unpacked npm tarball and package-local evidence. Registry publication and installation on platforms without retained certificates are not claimed."],
  };
  return { ...base, certificateDigest: digestCanonical(base) };
}

export function writeDistributionCertificate(path: string, certificate: DistributionCertificateV1): void {
  const target = resolve(path); mkdirSync(dirname(target), { recursive: true, mode: 0o700 }); const raw = `${canonicalJson(certificate)}\n`; const temporary = `${target}.tmp`;
  writeFileSync(temporary, raw, { mode: 0o600 }); renameSync(temporary, target); writeFileSync(`${target}.sha256`, `${sha256(raw)}  ${FILE}\n`, { mode: 0o600 });
}

export function verifyDistributionCertificate(input: { projectRoot?: string; artifact: string }): { valid: boolean; certificate?: DistributionCertificateV1; errors: string[] } {
  let parsed: unknown; let raw: string;
  try { raw = readFileSync(resolve(input.artifact), "utf8"); parsed = JSON.parse(raw) as unknown; } catch { return { valid: false, errors: ["distribution certificate is missing or invalid JSON"] }; }
  const issues = validateJsonSchema(DISTRIBUTION_CERTIFICATE_SCHEMA_V1, parsed);
  if (issues.length > 0) return { valid: false, errors: [`distribution certificate does not match its closed schema: ${issues.slice(0, 8).map((issue) => `${issue.path} ${issue.message}`).join("; ")}`] };
  const certificate = parsed as DistributionCertificateV1;
  const errors: string[] = []; const projectRoot = resolve(input.projectRoot ?? process.cwd()); const { certificateDigest, ...unsigned } = certificate;
  if (certificateDigest !== digestCanonical(unsigned)) errors.push("certificate digest mismatch");
  let inspected: DistributionInspectionV1 | undefined;
  try { inspected = inspectDistribution(projectRoot); } catch (error) { errors.push(`npm package inspection failed: ${error instanceof Error ? error.message : String(error)}`); }
  if (inspected) {
    if (certificate.packageJsonDigest !== sha256(readFileSync(join(projectRoot, "package.json"))) || certificate.packageLockDigest !== sha256(readFileSync(join(projectRoot, "package-lock.json")))) errors.push("package manifest or lock digest mismatch");
    if (canonicalJson(certificate.sourceDigests) !== canonicalJson(inspected.sourceDigests)) errors.push("active distribution source digest mismatch");
    if (canonicalJson(certificate.toolDigests) !== canonicalJson(inspected.toolDigests)) errors.push("active distribution tool digest mismatch");
    if (canonicalJson(certificate.files) !== canonicalJson(inspected.files) || certificate.inventoryDigest !== digestCanonical(inspected.files) || certificate.fileCountExcludingSelf !== inspected.files.length || certificate.unpackedBytesExcludingSelf !== inspected.files.reduce((sum, entry) => sum + entry.size, 0)) errors.push("content-addressed npm package inventory mismatch");
    if (certificate.unpackedInventoryDigest !== digestCanonical(inspected.unpackedFiles) || certificate.tarballDigest !== inspected.tarballDigest) errors.push("independently unpacked npm tarball mismatch");
    if (canonicalJson(certificate.surfaceInventories) !== canonicalJson(inspected.surfaceInventories)) errors.push("bin/export/asset/license/notice inventory mismatch");
    if (canonicalJson(certificate.observations) !== canonicalJson(inspected.observations)) errors.push("distribution observations are not reproducible");
    if (!certificate.passed || !inspected.observations.every((entry) => entry.passed)) errors.push("distribution matrix did not pass");
  }
  if (canonicalJson(certificate.excludedSelfPaths) !== canonicalJson(DISTRIBUTION_SELF_PATHS_V1)) errors.push("distribution certificate self-path exclusion is not exact and deterministic");
  try { const checksum = readFileSync(`${resolve(input.artifact)}.sha256`, "utf8").trim().split(/\s+/u)[0]; if (checksum !== sha256(raw)) errors.push("artifact checksum mismatch"); } catch { errors.push("distribution certificate checksum is missing"); }
  return { valid: errors.length === 0, certificate, errors };
}
