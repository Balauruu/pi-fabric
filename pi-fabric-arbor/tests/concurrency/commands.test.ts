import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

const start = (runId: string, key = "idempotency_start_0001") => ({ version: 1 as const, kind: "start" as const, metadata: { runId, expectedRevision: 0, idempotencyKey: key }, contract: createFixtureContract() });

test("matching duplicate returns prior receipt and mismatched reuse is rejected", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const command = start("run_idempotent");
    const first = await fixture.application.execute(command, { fence: 0, now: fixture.clock.now() });
    const duplicate = await fixture.application.execute(command, { fence: 0, now: fixture.clock.now() });
    assert.equal(duplicate.commandId, first.commandId);
    assert.equal(duplicate.revision, 1);
    assert.equal(duplicate.duplicate, true);
    const changed = { ...command, contract: { ...command.contract, objective: "Different immutable input" } };
    await assert.rejects(fixture.application.execute(changed, { fence: 0, now: fixture.clock.now() }), errorCode("IDEMPOTENCY_KEY_REUSED"));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("matching duplicate emission does not call the evaluator twice", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const runId = "run_emission_duplicate";
    await fixture.application.execute(start(runId), { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId, expectedRevision: 1, idempotencyKey: "claim_emission_0001" }, driverId: "driver_primary", leaseMs: 10_000 }, { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "advance", metadata: { runId, expectedRevision: 2, idempotencyKey: "advance_emission_001" } }, { driverId: "driver_primary", fence: 1, now: fixture.clock.now() });
    const evaluation = { version: 1 as const, kind: "evaluate" as const, metadata: { runId, expectedRevision: 3, idempotencyKey: "evaluate_emission_01" }, role: "developmentBaseline" as const, oid: createFixtureContract().repository.initialOid };
    const first = await fixture.application.execute(evaluation, { driverId: "driver_primary", fence: 1, now: fixture.clock.now() });
    const duplicate = await fixture.application.execute(evaluation, { driverId: "driver_primary", fence: 1, now: fixture.clock.now() });
    assert.equal(duplicate.commandId, first.commandId);
    assert.equal(duplicate.duplicate, true);
    assert.equal(fixture.evaluator.calls.length, 1);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("concurrent same-revision mutations accept one durable outcome", async () => {
  const fixture = await makeFixtureApplication();
  try {
    await fixture.application.execute(start("run_concurrent"), { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId: "run_concurrent", expectedRevision: 1, idempotencyKey: "claim_driver_key_001" }, driverId: "driver_primary", leaseMs: 10_000 }, { fence: 0, now: fixture.clock.now() });
    const context = { driverId: "driver_primary", fence: 1, now: fixture.clock.now() };
    const commands = ["advance_concurrent_1", "advance_concurrent_2"].map((idempotencyKey) => fixture.application.execute({ version: 1, kind: "advance", metadata: { runId: "run_concurrent", expectedRevision: 2, idempotencyKey } }, context));
    const settled = await Promise.allSettled(commands);
    assert.equal(settled.filter((entry) => entry.status === "fulfilled").length, 1);
    const rejected = settled.find((entry): entry is PromiseRejectedResult => entry.status === "rejected")!;
    assert.equal(errorCode("STALE_REVISION")(rejected.reason), true);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("expired lease creates a new fence and stale callbacks fail", async () => {
  const fixture = await makeFixtureApplication();
  try {
    await fixture.application.execute(start("run_fence"), { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId: "run_fence", expectedRevision: 1, idempotencyKey: "claim_driver_old_001" }, driverId: "driver_old", leaseMs: 1000 }, { fence: 0, now: fixture.clock.now() });
    fixture.clock.advance(1000);
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId: "run_fence", expectedRevision: 2, idempotencyKey: "claim_driver_new_001" }, driverId: "driver_new", leaseMs: 1000 }, { driverId: "driver_old", fence: 1, now: fixture.clock.now() });
    await assert.rejects(fixture.application.execute({ version: 1, kind: "advance", metadata: { runId: "run_fence", expectedRevision: 3, idempotencyKey: "stale_callback_0001" } }, { driverId: "driver_old", fence: 1, now: fixture.clock.now() }), errorCode("STALE_FENCE"));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
