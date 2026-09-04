import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { FixtureDriver } from "../../src/fixtures/driver.js";
import { assertJsonSchema } from "../../src/schemas/validate.js";
import { makeFixtureApplication } from "../helpers.js";
import { digestCanonical } from "../../src/util/canonical.js";

test("Phase 1 fixture driver completes start through report publication", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const result = await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run();
    assert.equal(result.run.state, "COMPLETED");
    assert.equal(result.run.outcome, "NO_PROMOTION");
    assert.equal(result.run.hypotheses.length, 1);
    assert.equal(result.run.attempts.length, 1);
    assert.equal(result.run.candidates.length, 1);
    assert.equal(result.run.certificates.length, 3);
    assert.ok(result.run.developmentBaselineCertificateId);
    assert.ok(result.run.heldOutBaselineCertificateId);
    assert.ok(result.run.bestCandidateId);
    assert.equal(result.run.workerClaims[0]?.claimedMetric, "999");
    assert.equal(result.run.reports.length, 1); assert.equal(result.run.reports[0]?.state, "PUBLISHED");
    assert.ok(result.run.reports[0]?.dependencyDigests.includes(digestCanonical({ runId: result.run.runId, state: "COMPLETED", phase: result.run.phase, outcome: "NO_PROMOTION" })));
    assert.equal(fixture.workspace.materializations.length, 1);
    assert.equal(fixture.workspace.finalizations.length, 1);
    assert.equal(fixture.agent.calls.length, 1);
    assert.equal(fixture.evaluator.calls.length, 3);
    assert.doesNotThrow(() => assertJsonSchema(fixture.application.schemas.schemas.runAggregate!, result.run));
    await fixture.store.verify();
    const all = await fixture.application.readEvents(result.run.runId, 0, 200);
    const first = await fixture.application.readEvents(result.run.runId, 0, 5);
    const second = await fixture.application.readEvents(result.run.runId, first.nextSequence, 200);
    assert.deepEqual([...first.events, ...second.events], all.events, "durable cursor reconnect loses no event");
    assert.doesNotThrow(() => assertJsonSchema(fixture.application.schemas.schemas.eventPage!, all));
    assert.equal("aggregate" in (all.events[0] ?? {}), false, "public event pages do not expose fences or aggregate internals");
    const web = await fixture.application.query({ version: 1, kind: "overview", runId: result.run.runId }, {});
    const headless = await fixture.application.query({ version: 1, kind: "overview", runId: result.run.runId }, { principalId: "operator_fixture" });
    assert.deepEqual(web, headless);
    assert.doesNotThrow(() => assertJsonSchema(fixture.application.schemas.schemas.webView!, web));
    for (const kind of ["tree", "attempts", "compare", "metrics", "resources", "report", "contract"] as const) {
      const view = await fixture.application.query({ version: 1, kind, runId: result.run.runId }, {});
      assert.doesNotThrow(() => assertJsonSchema(fixture.application.schemas.schemas.webView!, view), kind);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("arbor.start is persistence-only", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const contract = (await import("../../src/fixtures/driver.js")).createFixtureContract();
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId: "run_start_only", expectedRevision: 0, idempotencyKey: "start_only_key_0001" }, contract }, { fence: 0, now: fixture.clock.now() });
    assert.equal(fixture.workspace.materializations.length, 0);
    assert.equal(fixture.workspace.finalizations.length, 0);
    assert.equal(fixture.agent.calls.length, 0);
    assert.equal(fixture.evaluator.calls.length, 0);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
