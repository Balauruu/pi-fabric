import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import type { ActivityProjector, ActivityProjectionObservationV1 } from "../../src/adapters/interfaces.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { OutboxDrainer } from "../../src/recovery/OutboxDrainer.js";
import type { OutboxRecordV1 } from "../../src/domain/types.js";
import { sha256 } from "../../src/util/canonical.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

class ObservableProjector implements ActivityProjector {
  readonly published = new Map<string, string>();
  publishCalls = 0;
  uncertain = false;
  async observe(record: OutboxRecordV1): Promise<ActivityProjectionObservationV1> {
    if (this.uncertain) return { version: 1, classification: "UNCERTAIN", observerDigest: sha256(`uncertain:${record.dispatchKey}`) };
    const outcome = this.published.get(record.dispatchKey);
    return outcome ? { version: 1, classification: "COMPLETED", observerDigest: sha256(`observed:${record.dispatchKey}`), outcomeDigest: outcome } : { version: 1, classification: "ABSENT", observerDigest: sha256(`absent:${record.dispatchKey}`) };
  }
  async publish(record: OutboxRecordV1): Promise<ActivityProjectionObservationV1> {
    this.publishCalls += 1;
    const outcomeDigest = sha256(`published:${record.dispatchKey}:${record.eventDigest}`); this.published.set(record.dispatchKey, outcomeDigest);
    return { version: 1, classification: "COMPLETED", observerDigest: sha256(`publisher:${record.dispatchKey}`), outcomeDigest };
  }
}

test("outbox observes after publish-before-commit crash and never dispatches the same event twice", async () => {
  const fixture = await makeFixtureApplication(); const runId = "run_outbox";
  try {
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "outbox_start_key_01" }, contract: createFixtureContract() }, { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId, expectedRevision: 1, idempotencyKey: "outbox_claim_key_01" }, driverId: "driver_outbox", leaseMs: 1000 }, { fence: 0, now: fixture.clock.now() });
    const context = { driverId: "driver_outbox", fence: 1, now: fixture.clock.now() };
    const projector = new ObservableProjector(); const drainer = new OutboxDrainer(fixture.store, projector);
    const first = (await fixture.store.readOutbox(runId, 1))[0]!;
    await projector.publish(first); // injected crash occurs before the store accepts publication
    const recovered = await drainer.drainOne(context, runId);
    assert.equal(recovered?.state, "PUBLISHED"); assert.equal(projector.publishCalls, 1, "recovery observes instead of republishing");
    const second = await drainer.drainOne(context, runId);
    assert.equal(second?.state, "PUBLISHED"); assert.equal(projector.publishCalls, 2);
    assert.equal(new Set(projector.published.keys()).size, 2);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("uncertain outbox publication is durable and stale-fence acknowledgement is rejected", async () => {
  const fixture = await makeFixtureApplication(); const runId = "run_outbox_fence";
  try {
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "outbox_fence_start" }, contract: createFixtureContract() }, { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId, expectedRevision: 1, idempotencyKey: "outbox_fence_claim" }, driverId: "driver_old", leaseMs: 1000 }, { fence: 0, now: fixture.clock.now() });
    const record = (await fixture.store.readOutbox(runId, 1))[0]!;
    fixture.clock.advance(1000);
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId, expectedRevision: 2, idempotencyKey: "outbox_fence_reclaim" }, driverId: "driver_new", leaseMs: 1000 }, { driverId: "driver_old", fence: 1, now: fixture.clock.now() });
    await assert.rejects(fixture.store.commitOutboxObservation({ version: 1, runId, sequence: record.sequence, expectedRevision: record.revision, dispatchKey: record.dispatchKey, classification: "COMPLETED", observerDigest: sha256("old observer"), outcomeDigest: sha256("old outcome") }, { driverId: "driver_old", fence: 1, now: fixture.clock.now() }), errorCode("STALE_FENCE"));
    const projector = new ObservableProjector(); projector.uncertain = true;
    const unsettled = await new OutboxDrainer(fixture.store, projector).drainOne({ driverId: "driver_new", fence: 2, now: fixture.clock.now() }, runId);
    assert.equal(unsettled?.state, "INDETERMINATE"); assert.equal(projector.publishCalls, 0, "uncertainty prohibits replay");
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
