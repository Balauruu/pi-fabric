import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { redactText, redactValue } from "../../src/web/redaction.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

test("redaction removes secrets, sensitive fields, raw Unix/Windows paths, and file URIs", () => {
  const redacted = redactValue({ token: "secret", nested: { output: "Bearer abcdef /home/alice/project and C:\\Users\\alice\\x plus file:///tmp/a" }, credentialAliases: ["cred_prod"] });
  const text = JSON.stringify(redacted);
  for (const forbidden of ["secret", "abcdef", "/home/alice", "C:\\\\Users", "file:///tmp", "cred_prod"]) assert.equal(text.includes(forbidden), false);
  assert.equal(redactText("sk-abcdefghijk"), "[REDACTED_SECRET]");
});

test("stale Web intent is durably visible as rejected", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const runId = "run_stale_intent";
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "start_stale_intent1" }, contract: createFixtureContract() }, { fence: 0, now: fixture.clock.now() });
    const receipt = await fixture.application.submitIntent({ version: 1, kind: "pause", expectedRevision: 0 }, { version: 1, sessionId: "session_fixture", runId, idempotencyKey: "web_stale_intent_01", csrfValidated: true, originValidated: true });
    assert.equal(receipt.state, "REJECTED_STALE");
    const run = await fixture.store.load(runId);
    assert.equal(run?.intents[0]?.state, "REJECTED_STALE");
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("pending intents cannot be processed while the driver is between yields", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const runId = "run_intent_boundary";
    let revision = 0;
    let serial = 0;
    const context = () => ({ driverId: "driver_fixture", fence: revision < 2 ? 0 : 1, now: fixture.clock.now() });
    const execute = async (body: Record<string, unknown>) => {
      serial += 1;
      const command = { ...body, metadata: { runId, expectedRevision: revision, idempotencyKey: `intent_boundary_${serial.toString().padStart(3, "0")}` } } as never;
      const receipt = await fixture.application.execute(command, context());
      revision = receipt.revision;
      return receipt;
    };
    await execute({ version: 1, kind: "start", contract: createFixtureContract() });
    await execute({ version: 1, kind: "claimDriver", driverId: "driver_fixture", leaseMs: 10_000 });
    await execute({ version: 1, kind: "advance" });
    const oid = createFixtureContract().repository.initialOid;
    await execute({ version: 1, kind: "evaluate", role: "developmentBaseline", oid });
    await execute({ version: 1, kind: "advance" });
    await execute({ version: 1, kind: "evaluate", role: "heldOutBaseline", oid });
    await execute({ version: 1, kind: "advance" });
    await execute({ version: 1, kind: "proposeHypothesis", hypothesis: { version: 1, hypothesisId: "hypothesis_boundary", rationale: "Exercise the intent boundary.", plan: ["Prepare fixture."] } });
    await execute({ version: 1, kind: "advance" });
    await execute({ version: 1, kind: "selectHypothesis", hypothesisId: "hypothesis_boundary" });
    const reserve = await execute({ version: 1, kind: "reserveAgentDispatch", hypothesisId: "hypothesis_boundary" });
    const reserveDirective = reserve.directive;
    if (reserveDirective?.kind !== "materializeWorkspace") throw new Error("Expected workspace directive");
    const attemptId = reserveDirective.attemptId;
    const materialized = await execute({ version: 1, kind: "materializeWorkspace", attemptId });
    const dispatchDirective = materialized.directive;
    if (dispatchDirective?.kind !== "dispatchAgent") throw new Error("Expected dispatch directive");
    const dispatchKey = dispatchDirective.dispatch.dispatchKey;
    await execute({ version: 1, kind: "attachAgentChild", attemptId, childHandle: "fixture_child_boundary_0000000000000000", dispatchKey });
    const submitted = await fixture.application.submitIntent({ version: 1, kind: "pause", expectedRevision: revision }, { version: 1, sessionId: "session_fixture", runId, idempotencyKey: "intent_between_yields", csrfValidated: true, originValidated: true });
    revision = submitted.revision;
    await assert.rejects(execute({ version: 1, kind: "processIntent", intentId: submitted.intentId }), errorCode("INTENT_NOT_AT_YIELD"));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("Web intent submission never executes an effect and CSRF fails closed", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const runId = "run_web_no_effect";
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "start_web_effect_01" }, contract: createFixtureContract() }, { fence: 0, now: fixture.clock.now() });
    const before = { workspace: fixture.workspace.materializations.length, agent: fixture.agent.calls.length, evaluator: fixture.evaluator.calls.length };
    const receipt = await fixture.application.submitIntent({ version: 1, kind: "pause", expectedRevision: 1 }, { version: 1, sessionId: "session_fixture", runId, idempotencyKey: "web_pause_effect_001", csrfValidated: true, originValidated: true });
    assert.equal(receipt.state, "PENDING");
    const duplicate = await fixture.application.submitIntent({ version: 1, kind: "pause", expectedRevision: 1 }, { version: 1, sessionId: "session_fixture", runId, idempotencyKey: "web_pause_effect_001", csrfValidated: true, originValidated: true });
    assert.equal(duplicate.intentId, receipt.intentId);
    assert.equal(duplicate.revision, receipt.revision);
    assert.equal((await fixture.store.load(runId))?.intents.length, 1);
    assert.deepEqual({ workspace: fixture.workspace.materializations.length, agent: fixture.agent.calls.length, evaluator: fixture.evaluator.calls.length }, before);
    await assert.rejects(fixture.application.submitIntent({ version: 1, kind: "pause", expectedRevision: 2 }, { version: 1, sessionId: "session_fixture", runId, idempotencyKey: "web_bad_csrf_00001", csrfValidated: false, originValidated: true }), errorCode("VALIDATION_FAILED"));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
