import assert from "node:assert/strict";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { FixtureDriver } from "../../src/fixtures/driver.js";
import { buildReportManifest, renderReportFiles, type ReportManifestV1 } from "../../src/reports/FileReportPublisher.js";
import { sha256 } from "../../src/util/canonical.js";
import { assertNoRawPathOrSecret } from "../../src/web/redaction.js";
import { makeFixtureApplication } from "../helpers.js";

const REQUIRED = [
  "REPORT.md", "manifest.v1.json", "contract.v1.json", "run-summary.v1.json", "artifact-index.v1.json", "promotion-journals.v1.json", "authorization-records.v1.json", "cleanup-manifest.v1.json", "retention-policy.v1.json", "evaluation-certificates/index.v1.json", "fingerprint-certificates/index.v1.json", "arbor-compatibility/status.v1.json",
];

test("Phase 6 report generation publishes every required bounded manifest and evidence index", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const { run } = await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run("run_report_phase6"); const report = run.reports.at(-1)!;
    assert.equal(report.state, "PUBLISHED"); const generation = join(fixture.root, "reports", "run_fixture", "generations", report.generationId);
    const names: string[] = [];
    async function walk(directory: string, prefix = ""): Promise<void> { for (const entry of await readdir(directory, { withFileTypes: true })) { const name = prefix ? `${prefix}/${entry.name}` : entry.name; if (entry.isDirectory()) await walk(join(directory, entry.name), name); else names.push(name); } }
    await walk(generation); assert.deepEqual(names.sort(), [...REQUIRED].sort());
    const manifestRaw = await readFile(join(generation, "manifest.v1.json"), "utf8"); const manifest = JSON.parse(manifestRaw) as ReportManifestV1;
    assert.equal(sha256(manifestRaw), report.observedManifestDigest); assert.equal(manifest.files.length, REQUIRED.length - 1);
    for (const file of manifest.files) { const body = await readFile(join(generation, file.name)); assert.equal(body.byteLength, file.bytes); assert.equal(sha256(body), file.digest); assert.doesNotThrow(() => assertNoRawPathOrSecret(body.toString("utf8"))); }
    const markdown = await readFile(join(generation, "REPORT.md"), "utf8");
    for (const heading of ["Baselines, candidates, and canonical metrics", "Lineage, retries, interruptions, pruning, and lessons", "Promotion, rollback, and re-promotion", "Budgets and reserve", "Effects, gates, report, and cleanup"]) assert.match(markdown, new RegExp(heading, "u"));
    assert.match(markdown, /Worker claims are informational/u); assert.match(markdown, /Runtime admission: fixture/u);
    const artifacts = JSON.parse(await readFile(join(generation, "artifact-index.v1.json"), "utf8")) as { artifacts: Array<{ artifactId: string; digest: string }> };
    assert.ok(artifacts.artifacts.length > 0); assert.ok(artifacts.artifacts.every((entry) => entry.artifactId.length > 0 && /^[0-9a-f]{64}$/u.test(entry.digest)));
    const status = JSON.parse(await readFile(join(generation, "arbor-compatibility/status.v1.json"), "utf8")) as { supported: boolean; admission: { mode: string; admissionDigest: string } };
    assert.deepEqual(status, { version: 1, supported: false, admission: { ...status.admission } }); assert.equal(status.admission.mode, "fixture");
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("failed run automatically publishes one complete terminal report before exposing FAILED", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const { run } = await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run("run_report_failed", undefined, "FAILED");
    assert.equal(run.state, "FAILED"); assert.equal(run.outcome, "FAILED"); assert.equal(run.reports.length, 1); assert.equal(run.reports[0]?.state, "PUBLISHED");
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("complete report renderer covers every terminal outcome without paths, secrets, or mutable authorization material", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const { run: settled } = await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run("run_report_outcomes");
    const outcomes = ["NO_PROMOTION", "PROMOTED", "ROLLED_BACK", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED"] as const;
    for (const outcome of outcomes) {
      const run = structuredClone(settled); run.outcome = outcome; run.state = outcome === "ROLLED_BACK" ? "ROLLED_BACK" : outcome === "CANCELLED" ? "CANCELLED" : outcome === "FAILED" ? "FAILED" : outcome === "INDETERMINATE" ? "INDETERMINATE" : outcome === "QUARANTINED" ? "QUARANTINED" : "COMPLETED";
      const files = renderReportFiles(run); assert.equal(Object.keys(files).length, 11); assert.doesNotThrow(() => Object.values(files).forEach(assertNoRawPathOrSecret));
      assert.match(files["REPORT.md"]!, new RegExp(`Outcome: ${outcome}`, "u"));
      const built = buildReportManifest("report_outcome", files); assert.equal(built.manifest.files.length, 11); assert.match(built.digest, /^[0-9a-f]{64}$/u);
      const authorization = files["authorization-records.v1.json"]!; assert.doesNotMatch(authorization, /"nonce"\s*:|"signature"\s*:|privateKey/iu);
    }
    const partial = structuredClone(settled); partial.state = "FAILED"; partial.outcome = "FAILED"; partial.attempts[0]!.state = "PARTIAL";
    assert.match(renderReportFiles(partial)["REPORT.md"]!, new RegExp(`${partial.attempts[0]!.attemptId} \\(PARTIAL\\)`, "u"));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
