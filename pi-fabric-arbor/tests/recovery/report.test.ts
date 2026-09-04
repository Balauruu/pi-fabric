import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileReportPublisher, buildReportManifest } from "../../src/reports/FileReportPublisher.js";

test("report publication recovers a recorded partial generation and is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-report-"));
  try {
    const publisher = await FileReportPublisher.open(root);
    const generationId = "report_fixture";
    const files = { "REPORT.md": "safe report", "contract.v1.json": "{}" };
    const expected = buildReportManifest(generationId, files).digest;
    await mkdir(join(root, "generations", `.tmp_${generationId}`));
    await writeFile(join(root, "generations", `.tmp_${generationId}`, "REPORT.md"), "partial");
    assert.equal((await publisher.observe(generationId, expected)).classification, "partial");
    const first = await publisher.publish(generationId, files, expected);
    assert.equal(first.classification, "complete");
    const duplicate = await publisher.publish(generationId, files, expected);
    assert.deepEqual(duplicate, first);
    assert.equal((await readFile(join(root, "current"), "utf8")).trim(), generationId);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("report publisher rejects sensitive values and unexpected files instead of redacting or publishing them", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-report-strict-"));
  try {
    const publisher = await FileReportPublisher.open(root);
    await assert.rejects(publisher.publish("report_sensitive", { "REPORT.md": "Bearer secret-value" }), /Unredacted secret/u);
    await assert.rejects(publisher.publish("report_unknown", { "unexpected.json": "{}" }), /not admitted/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("report observation detects post-publication conflict", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-report-conflict-"));
  try {
    const publisher = await FileReportPublisher.open(root);
    const generationId = "report_conflict";
    const files = { "REPORT.md": "safe report" };
    const expected = buildReportManifest(generationId, files).digest;
    assert.equal((await publisher.publish(generationId, files, expected)).classification, "complete");
    await writeFile(join(root, "generations", generationId, "REPORT.md"), "tampered");
    assert.equal((await publisher.observe(generationId, expected)).classification, "conflict");
  } finally { await rm(root, { recursive: true, force: true }); }
});
