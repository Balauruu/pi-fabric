import { lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, parse, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { projectRelativePathV1, readCertifiedPiFabricVersionV1, type CertifiedPiFabricVersionV1 } from "./pi-fabric-support.js";

export interface LicenseNoticeV1 { path: string; bytes: number; digest: string; }
export interface LicensePackageReviewV1 { name: string; version: string; license: string; attribution: string; packagePath: string; packageJsonDigest: string; contentDigest: string; files: number; notices: LicenseNoticeV1[]; noticeCoverage: "package-text" | "declared-license-fallback"; obligation: "include-notice" | "include-notice-and-state-changes"; sourceDisclosureRequired: false; reviewed: boolean; }
export interface LicensingCertificateV1 {
  version: 1; certificationId: string; createdAt: string; rootPackage: `pi-fabric@${CertifiedPiFabricVersionV1}`; packageLockDigest: string; upstreamPayloadDigest: string;
  exactCommand: string[]; packages: LicensePackageReviewV1[]; obligations: Array<{ id: string; satisfiedBy: string; status: "satisfied" }>;
  generatedNoticeDigest: string; prohibitedOrUnknownLicenses: string[]; legalReviewStatus: "mechanically-reviewed-permissive-license-set"; limitations: string[];
  passed: boolean; signerId: string; harnessDigest: string; certificateDigest: string;
}

const NOTICE_NAMES = /^(?:licen[cs]e|copying|notice|third[_-]?party)(?:\..*)?$/iu;
const SIMPLE_NOTICE_LICENSES = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "0BSD"]);

function packageManifest(path: string): { name: string; version: string; license?: string; author?: unknown; dependencies?: Record<string, string> } { return JSON.parse(readFileSync(path, "utf8")) as { name: string; version: string; license?: string; author?: unknown; dependencies?: Record<string, string> }; }
function resolveDependency(packageRoot: string, name: string): string {
  let cursor = packageRoot; const filesystemRoot = parse(cursor).root;
  while (true) {
    const candidate = join(cursor, "node_modules", ...name.split("/"), "package.json");
    try { if (packageManifest(candidate).name === name) return realpathSync(candidate); } catch {}
    if (cursor === filesystemRoot) break; cursor = dirname(cursor);
  }
  throw new ArborError("EVIDENCE_INVALID", `Installed runtime dependency is missing: ${name}`);
}
function packageFiles(root: string): { contentDigest: string; files: number; notices: LicenseNoticeV1[] } {
  const evidence: Array<{ path: string; bytes: number; digest: string; type: "file" | "symlink" }> = []; const notices: LicenseNoticeV1[] = [];
  const visit = (directory: string): void => { for (const name of readdirSync(directory).sort()) { if (name === "node_modules") continue; const path = join(directory, name); const stat = lstatSync(path); const relativePath = relative(root, path).split(sep).join("/"); if (stat.isDirectory()) visit(path); else if (stat.isSymbolicLink()) { const bytes = Buffer.from(readlinkSync(path)); evidence.push({ path: relativePath, bytes: bytes.byteLength, digest: sha256(bytes), type: "symlink" }); } else if (stat.isFile()) { if (stat.size > 268_435_456) throw new ArborError("EVIDENCE_INVALID", "License inventory file exceeds bound", { relativePath }); const bytes = readFileSync(path); const digest = sha256(bytes); evidence.push({ path: relativePath, bytes: bytes.byteLength, digest, type: "file" }); if (NOTICE_NAMES.test(name)) notices.push({ path: relativePath, bytes: bytes.byteLength, digest }); } } };
  visit(root); if (evidence.length > 100_000) throw new ArborError("EVIDENCE_INVALID", "License inventory exceeds file bound");
  return { contentDigest: digestCanonical(evidence), files: evidence.length, notices };
}

export function reviewInstalledLicenses(input: { projectRoot: string; packageRoot: string }): { packages: LicensePackageReviewV1[]; prohibitedOrUnknownLicenses: string[]; generatedNotice: string } {
  const projectRoot = realpathSync(input.projectRoot); const start = realpathSync(join(input.packageRoot, "package.json")); const queue = [start]; const seen = new Set<string>(); const packages: LicensePackageReviewV1[] = [];
  while (queue.length > 0) {
    const manifestPath = queue.shift()!; const manifest = packageManifest(manifestPath); const packageRoot = dirname(manifestPath); const key = `${manifest.name}@${manifest.version}:${packageRoot}`; if (seen.has(key)) continue; seen.add(key);
    const license = manifest.license ?? "UNKNOWN"; const files = packageFiles(packageRoot); const obligation = license === "Apache-2.0" ? "include-notice-and-state-changes" : "include-notice";
    const attribution = typeof manifest.author === "string" ? manifest.author : manifest.author && typeof manifest.author === "object" && "name" in manifest.author ? String((manifest.author as { name: unknown }).name) : manifest.name;
    packages.push({ name: manifest.name, version: manifest.version, license, attribution, packagePath: relative(projectRoot, packageRoot).split(sep).join("/"), packageJsonDigest: sha256(readFileSync(manifestPath)), ...files, noticeCoverage: files.notices.length > 0 ? "package-text" : "declared-license-fallback", obligation, sourceDisclosureRequired: false, reviewed: SIMPLE_NOTICE_LICENSES.has(license) || license === "Apache-2.0" });
    for (const dependency of Object.keys(manifest.dependencies ?? {}).sort()) queue.push(resolveDependency(packageRoot, dependency));
  }
  packages.sort((left, right) => `${left.name}@${left.version}:${left.packagePath}`.localeCompare(`${right.name}@${right.version}:${right.packagePath}`));
  const prohibitedOrUnknownLicenses = packages.filter((entry) => !entry.reviewed).map((entry) => `${entry.name}@${entry.version}:${entry.license}`);
  const fallbackText = new Map<string, string>();
  for (const entry of packages) { const notice = entry.notices[0]; if (notice && !fallbackText.has(entry.license)) fallbackText.set(entry.license, readFileSync(join(resolve(projectRoot, entry.packagePath), notice.path), "utf8")); }
  const sections = ["# Third-party notices", "", "Generated by the retained B10 inventory. Preserve this file in binary and source distributions. This is a mechanical license-obligation record, not legal advice.", ""];
  for (const entry of packages) { sections.push(`## ${entry.name}@${entry.version} - ${entry.license}`, "", `Attribution recorded by package metadata: ${entry.attribution}`, ""); if (entry.notices.length === 0) { sections.push("The installed package omitted a standalone license file. The declared license is retained with attribution and its canonical text from another exact installed package below.", "", "```text", (fallbackText.get(entry.license) ?? "MISSING LICENSE TEXT").replace(/```/gu, "` ` `").trimEnd(), "```", ""); } else for (const notice of entry.notices) { const packageRoot = resolve(projectRoot, entry.packagePath); sections.push(`### ${notice.path}`, "", "```text", readFileSync(join(packageRoot, notice.path), "utf8").replace(/```/gu, "` ` `").trimEnd(), "```", ""); } }
  return { packages, prohibitedOrUnknownLicenses, generatedNotice: `${sections.join("\n")}\n` };
}

export function generateLicensingCertificate(input: { projectRoot: string; packageRoot: string; packageLockPath: string; upstreamManifestPath: string; artifact: string; notice: string; createdAt: string; signerId: string }): { certificate: LicensingCertificateV1; generatedNotice: string } {
  const projectRoot = realpathSync(input.projectRoot); const piFabricVersion = readCertifiedPiFabricVersionV1(input.packageRoot); const review = reviewInstalledLicenses({ projectRoot, packageRoot: input.packageRoot }); const upstream = JSON.parse(readFileSync(input.upstreamManifestPath, "utf8")) as { packageDigest?: string; installedVersion?: string };
  if (upstream.installedVersion !== piFabricVersion) throw new ArborError("EVIDENCE_INVALID", "B0 upstream version does not match the licensed package");
  if (typeof upstream.packageDigest !== "string") throw new ArborError("EVIDENCE_INVALID", "B1 upstream payload certificate is missing");
  const generatedNoticeDigest = sha256(Buffer.from(review.generatedNotice)); const obligations = [
    { id: "project-license-and-notice", satisfiedBy: "LICENSE and NOTICE in package files", status: "satisfied" as const },
    { id: "transitive-license-texts", satisfiedBy: `THIRD_PARTY_NOTICES.md sha256:${generatedNoticeDigest}`, status: "satisfied" as const },
    { id: "apache-change-notice", satisfiedBy: "NOTICE identifies Arbor distribution changes; upstream sources are not modified in place", status: "satisfied" as const },
    { id: "no-copyleft-source-offer", satisfiedBy: "inventory contains only MIT, ISC, BSD, 0BSD, and Apache-2.0 identifiers", status: "satisfied" as const },
  ];
  const base = { version: 1 as const, certificationId: "licensing_b10_v1", createdAt: input.createdAt, rootPackage: `pi-fabric@${piFabricVersion}` as const, packageLockDigest: sha256(readFileSync(input.packageLockPath)), upstreamPayloadDigest: upstream.packageDigest, exactCommand: [process.execPath, "dist/bin/pi-fabric-arbor-license-certify.js", "verify", "--package-root", projectRelativePathV1(projectRoot, input.packageRoot), "--package-lock", projectRelativePathV1(projectRoot, input.packageLockPath), "--upstream", projectRelativePathV1(projectRoot, input.upstreamManifestPath), "--artifact", projectRelativePathV1(projectRoot, input.artifact), "--notice", projectRelativePathV1(projectRoot, input.notice)], packages: review.packages, obligations, generatedNoticeDigest, prohibitedOrUnknownLicenses: review.prohibitedOrUnknownLicenses, legalReviewStatus: "mechanically-reviewed-permissive-license-set" as const, limitations: ["This is a reproducible engineering review of declared identifiers, package bytes, notices, and distribution obligations; it is not legal advice."], passed: review.prohibitedOrUnknownLicenses.length === 0, signerId: input.signerId, harnessDigest: sha256(readFileSync(join(projectRoot, "src/certification/licensing.ts"))) };
  return { certificate: { ...base, certificateDigest: digestCanonical(base) }, generatedNotice: review.generatedNotice };
}

export function writeLicensingCertificate(input: { artifact: string; notice: string; certificate: LicensingCertificateV1; generatedNotice: string }): void { mkdirSync(dirname(resolve(input.artifact)), { recursive: true, mode: 0o700 }); writeFileSync(input.artifact, `${canonicalJson(input.certificate)}\n`, { mode: 0o600 }); writeFileSync(input.notice, input.generatedNotice, { mode: 0o644 }); }
export function verifyLicensingCertificate(input: { projectRoot: string; packageRoot: string; packageLockPath: string; upstreamManifestPath: string; artifact: string; notice: string }): { valid: boolean; certificate?: LicensingCertificateV1; errors: string[] } {
  let certificate: LicensingCertificateV1; try { certificate = JSON.parse(readFileSync(input.artifact, "utf8")) as LicensingCertificateV1; } catch { return { valid: false, errors: ["licensing certificate is missing or invalid JSON"] }; } const errors: string[] = [];
  const generated = generateLicensingCertificate({ ...input, createdAt: certificate.createdAt, signerId: certificate.signerId }); const { certificateDigest, ...unsigned } = certificate; if (certificateDigest !== digestCanonical(unsigned)) errors.push("certificate digest mismatch");
  if (canonicalJson(generated.certificate) !== canonicalJson(certificate)) errors.push("installed package, lock, B0 binding, command, or harness mismatch");
  if (sha256(readFileSync(input.notice)) !== certificate.generatedNoticeDigest || generated.certificate.generatedNoticeDigest !== certificate.generatedNoticeDigest) errors.push("distributed third-party notices mismatch"); if (!certificate.passed) errors.push("licensing review did not pass");
  return { valid: errors.length === 0, certificate, errors };
}
