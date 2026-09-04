import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { FixtureDriver } from "../../src/fixtures/driver.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

test("cleanup retains dependencies before report and completes idempotent fixture cleanup after publication", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const runId = "run_fixture";
    const result = await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run(runId);
    const context = { driverId: "driver_fixture", fence: 1, now: fixture.clock.now() };
    let revision = result.run.revision;
    const planned = await fixture.application.execute({ version: 1, kind: "planCleanup", metadata: { runId, expectedRevision: revision, idempotencyKey: "cleanup_plan_key_001" }, resourceId: "resource_fixture", resourceKind: "workspace" }, context);
    revision = planned.revision;
    let aggregate = (await fixture.store.load(runId))!; const intentReport = aggregate.reports.at(-1)!;
    const published = await fixture.application.execute({ version: 1, kind: "publishReport", metadata: { runId, expectedRevision: revision, idempotencyKey: "cleanup_intent_publish" }, generationId: intentReport.generationId }, context); revision = published.revision;
    const observed = await fixture.application.execute({ version: 1, kind: "observeReport", metadata: { runId, expectedRevision: revision, idempotencyKey: "cleanup_intent_observe" }, generationId: intentReport.generationId }, context); revision = observed.revision;
    aggregate = (await fixture.store.load(runId))!; const cleanupId = aggregate.cleanup[0]!.cleanupId;
    const executed = await fixture.application.execute({ version: 1, kind: "executeCleanup", metadata: { runId, expectedRevision: revision, idempotencyKey: "cleanup_execute_001" }, cleanupId }, context);
    revision = executed.revision;
    await fixture.application.execute({ version: 1, kind: "observeCleanup", metadata: { runId, expectedRevision: revision, idempotencyKey: "cleanup_observe_001" }, cleanupId, outcome: "completed" }, context);
    assert.equal((await fixture.store.load(runId))?.cleanup[0]?.state, "COMPLETED");
    assert.equal(fixture.cleanup.calls.length, 1);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("cleanup planning before any published report fails closed", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const runId = "run_no_report";
    const contract = (await import("../../src/fixtures/driver.js")).createFixtureContract();
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "start_no_report_001" }, contract }, { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId, expectedRevision: 1, idempotencyKey: "claim_no_report_001" }, driverId: "driver_fixture", leaseMs: 10_000 }, { fence: 0, now: fixture.clock.now() });
    await assert.rejects(fixture.application.execute({ version: 1, kind: "planCleanup", metadata: { runId, expectedRevision: 2, idempotencyKey: "cleanup_no_report_01" }, resourceId: "resource_fixture", resourceKind: "workspace" }, { driverId: "driver_fixture", fence: 1, now: fixture.clock.now() }), errorCode("REPORT_DEPENDENCY_RETAINED"));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
