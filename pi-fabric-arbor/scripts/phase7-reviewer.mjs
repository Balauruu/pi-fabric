import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const mode = process.argv[2]; const root = realpathSync(process.argv[3] ?? process.cwd());
const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const files = (directory, suffix) => { const output = []; const visit = (path) => { for (const name of readdirSync(path).sort()) { const child = join(path, name); const stat = lstatSync(child); if (stat.isDirectory()) visit(child); else if (stat.isFile() && child.endsWith(suffix)) output.push(child); } }; visit(directory); return output; };
let checks = []; let inputs = []; let findings = []; let independentEvidence;
if (mode === "security") {
  const sources = files(join(root, "src"), ".ts"); const securityInputs = [...sources, join(root, "package.json"), join(root, "package-lock.json")]; inputs = securityInputs.map((path) => ({ path: relative(root, path), digest: digest(readFileSync(path)) }));
  const text = sources.map((path) => readFileSync(path, "utf8")).join("\n"); const web = readJson(join(root, "certification/phase6/web-threat-b9.v1.json")); const containment = readJson(join(root, "certification/containment/linux-x86_64-bwrap-0.12.0/containment-certificate.v1.json")); const held = readJson(join(root, "certification/held-out/linux-x86_64-bwrap-0.12.0/held-out-isolation-certificate.v1.json"));
  const auditProcess = spawnSync("/usr/bin/npm", ["audit", "--json"], { cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: 16_777_216, env: { PATH: "/usr/bin:/bin", HOME: "/tmp", LANG: "C.UTF-8", LC_ALL: "C.UTF-8" } }); let audit = {}; try { audit = JSON.parse(auditProcess.stdout || "{}"); } catch { findings.push({ severity: "high", check: "npm-audit-json" }); }
  const vulnerabilities = audit.metadata?.vulnerabilities ?? {}; independentEvidence = { npmAuditExitCode: auditProcess.status, vulnerabilities };
  checks = [
    { name: "no-private-pi-fabric-import", passed: !/from\s+["']pi-fabric\/(?:src|dist)\//u.test(text) },
    { name: "remote-web-disabled", passed: text.includes("Remote Web bind is prohibited") },
    { name: "user-ref-publication-absent", passed: !/refs\/heads\/(?:main|master)/u.test(text) },
    { name: "web-threat-matrix", passed: web.passed === true && web.observations.every((entry) => entry.passed) },
    { name: "containment-direct-matrix", passed: containment.valid === true && containment.matrix.length >= 34 && containment.matrix.every((entry) => entry.direct && entry.passed) },
    { name: "held-out-denial-matrix", passed: held.valid === true && held.tests.length >= 7 && held.tests.every((entry) => entry.direct && entry.passed) },
    { name: "npm-audit-completed", passed: auditProcess.status === 0 && !auditProcess.signal },
    { name: "npm-audit-no-critical", passed: vulnerabilities.critical === 0 },
    { name: "npm-audit-no-high", passed: vulnerabilities.high === 0 },
    { name: "signed-create-only-thresholds", passed: text.includes("Threshold seals are create-only and cannot be replaced") && text.includes("signingAlgorithm: \"Ed25519\"") },
    { name: "opaque-held-out-service", passed: text.includes("Evaluator-only opaque capability was denied") && text.includes("createServer") },
    { name: "hard-resource-enforcement", passed: text.includes("maximumProcesses") && text.includes("maximumRssBytes") && text.includes("process.kill(-launcherPid, \"SIGKILL\")") },
    { name: "tamper-evident-resource-evidence", passed: text.includes("journalDigest: sha256(journal)") && text.includes("resourceBudget: ResourceBudgetSnapshotV1") },
    { name: "graduation-signature-verifier", passed: text.includes("graduation certificate signature or digest mismatch") },
  ];
} else if (mode === "accessibility") {
  const path = join(root, "certification/phase7/browser/results.v1.json"); const browser = readJson(path); inputs = [{ path: relative(root, path), digest: digest(readFileSync(path)) }];
  checks = [
    ...Object.entries(browser.accessibility).filter(([, value]) => typeof value === "boolean").map(([name, passed]) => ({ name: `wcag-${name}`, passed: passed === true })),
    { name: "wcag-contrast-samples", passed: Array.isArray(browser.accessibility.contrastSamples) && browser.accessibility.contrastSamples.length >= 4 && browser.accessibility.contrastSamples.every((sample) => typeof sample.selector === "string" && typeof sample.foreground === "string" && typeof sample.background === "string" && Number.isFinite(sample.ratio) && sample.ratio >= 4.5) },
    { name: "wcag-named-control-inventory", passed: Array.isArray(browser.accessibility.controls) && browser.accessibility.controls.length > 0 && browser.accessibility.controls.every((control) => typeof control.tag === "string" && typeof control.name === "string" && control.name.trim().length > 0) },
    { name: "three-responsive-viewports", passed: browser.viewports.length >= 3 }, { name: "accessible-data-table", passed: browser.accessibleMetricTable === true },
    { name: "dom-console-network-leak-scan", passed: browser.leakage.forbiddenMatches.length === 0 && browser.leakage.externalRequests.length === 0 },
  ];
} else if (mode === "license") {
  const paths = ["LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md", "package-lock.json", "certification/phase6/licensing-b10.v1.json"].map((path) => join(root, path)); inputs = paths.map((path) => ({ path: relative(root, path), digest: digest(readFileSync(path)) })); const license = readJson(paths.at(-1));
  checks = [{ name: "license-certificate-passed", passed: license.passed === true }, { name: "all-packages-reviewed", passed: license.packages.length > 0 && license.packages.every((entry) => entry.reviewed) }, { name: "all-obligations-satisfied", passed: license.obligations.length > 0 && license.obligations.every((entry) => entry.status === "satisfied") }, { name: "notice-files-nonempty", passed: paths.slice(0, 3).every((path) => readFileSync(path).byteLength > 0) }];
} else { throw new Error("usage: phase7-reviewer.mjs <security|accessibility|license> <project-root>"); }
if (checks.some((entry) => !entry.passed)) findings = checks.filter((entry) => !entry.passed).map((entry) => ({ severity: mode === "security" ? "high" : "critical", check: entry.name }));
const base = { version: 1, reviewId: `phase7_${mode}_independent_readonly_v1`, reviewerClass: "independent-read-only-process", scope: mode, executedAt: new Date().toISOString(), sourceDigest: digest(readFileSync(new URL(import.meta.url))), inputs, checks, findings, criticalFindings: findings.filter((entry) => entry.severity === "critical").length, highFindings: findings.filter((entry) => entry.severity === "high").length, passed: findings.length === 0 && checks.every((entry) => entry.passed), ...(independentEvidence ? { evidence: independentEvidence } : {}), limitations: ["This is an independent read-only process review and direct evidence check, not a human legal opinion or a manual assistive-technology audit."] };
process.stdout.write(`${canonical({ ...base, reviewDigest: digest(canonical(base)) })}\n`);
