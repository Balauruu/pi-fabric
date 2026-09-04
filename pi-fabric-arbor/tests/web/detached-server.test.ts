import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { DetachedMonitorAuthority } from "../../src/web/DetachedMonitorAuthority.js";
import { DetachedMonitorServer } from "../../src/web/DetachedMonitorServer.js";
import { makeFixtureApplication } from "../helpers.js";

async function authenticatedServer() {
  const fixture = await makeFixtureApplication(); const runId = "run_detached";
  await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "detached_start_key" }, contract: createFixtureContract() }, { fence: 0, now: fixture.clock.now() });
  let floor = 0;
  const authority = new DetachedMonitorAuthority(fixture.application, fixture.store, () => floor, () => fixture.clock.now());
  const server = new DetachedMonitorServer({ authority, bootstrapToken: "a".repeat(32), pollIntervalMs: 10 });
  const address = await server.start();
  const bootstrap = await fetch(`${address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: address.url, "content-type": "application/json" }, body: JSON.stringify({ version: 1, token: "a".repeat(32) }) });
  assert.equal(bootstrap.status, 201); const session = await bootstrap.json() as { csrfToken: string };
  const cookie = bootstrap.headers.get("set-cookie")!.split(";", 1)[0]!;
  return { fixture, runId, authority, server, address, session, cookie, setFloor(value: number) { floor = value; } };
}

test("detached loopback server visibly reports no driver, reads projections, and appends durable typed intents only", async () => {
  const lane = await authenticatedServer();
  try {
    assert.equal("execute" in lane.authority, false, "detached authority has no command execution seam");
    const root = await fetch(`${lane.address.url}/`); const html = await root.text();
    assert.match(html, /No active Fabric driver/u); assert.match(html, /inbox intents only/u);
    assert.match(root.headers.get("content-security-policy") ?? "", /default-src 'none'.*script-src 'self'.*frame-ancestors 'none'/u);
    const overviewDeepLink = await fetch(`${lane.address.url}/runs/${lane.runId}`);
    assert.equal(overviewDeepLink.status, 200); assert.match(overviewDeepLink.headers.get("content-type") ?? "", /^text\/html/u); assert.match(await overviewDeepLink.text(), /<main id="main"/u);
    const runs = await fetch(`${lane.address.url}/api/v1/runs`, { headers: { cookie: lane.cookie } });
    assert.equal(runs.status, 200); assert.match(await runs.text(), /No active Fabric driver/u);
    const before = (await lane.fixture.store.load(lane.runId))!;
    const submitted = await fetch(`${lane.address.url}/api/v1/runs/${lane.runId}/intents`, {
      method: "POST", headers: { cookie: lane.cookie, origin: lane.address.url, "x-arbor-csrf": lane.session.csrfToken, "content-type": "application/json", "idempotency-key": "detached_pause_key" },
      body: JSON.stringify({ version: 1, kind: "pause", expectedRevision: before.revision, reason: "disconnect-safe inbox request" }),
    });
    assert.equal(submitted.status, 202);
    const after = (await lane.fixture.store.load(lane.runId))!;
    assert.equal(after.intents.at(-1)?.state, "PENDING"); assert.equal(after.state, "ADMITTED", "server did not execute the pause intent");
    assert.equal(lane.fixture.workspace.materializations.length + lane.fixture.agent.calls.length + lane.fixture.evaluator.calls.length + lane.fixture.cleanup.calls.length, 0);
    const denied = await fetch(`${lane.address.url}/api/v1/runs/${lane.runId}/intents`, { method: "POST", headers: { cookie: lane.cookie, origin: "http://evil.invalid", "x-arbor-csrf": lane.session.csrfToken, "content-type": "application/json" }, body: JSON.stringify({ version: 1, kind: "resume", expectedRevision: after.revision }) });
    assert.equal(denied.status, 403);
  } finally { await lane.server.close(); await rm(lane.fixture.root, { recursive: true, force: true }); }
});

test("SSE reconnect catch-up and compaction reset carry a projection equal to a fresh authoritative query", async () => {
  const lane = await authenticatedServer();
  try {
    const controller = new AbortController();
    const stream = await fetch(`${lane.address.url}/api/v1/stream?runId=${lane.runId}&cursor=0`, { headers: { cookie: lane.cookie }, signal: controller.signal });
    assert.equal(stream.status, 200); const reader = stream.body!.getReader(); const chunk = await reader.read(); controller.abort();
    const text = new TextDecoder().decode(chunk.value); assert.match(text, /event: arbor-event/u); assert.match(text, /"projection"/u);

    const run = (await lane.fixture.store.load(lane.runId))!; const fresh = await lane.authority.query({ version: 1, kind: "overview", runId: lane.runId });
    const caughtUp = await lane.authority.readStreamBatch(lane.runId, 0, 200);
    assert.equal(caughtUp.kind, "events"); assert.deepEqual(caughtUp.projection, fresh);
    lane.setFloor(run.sequence);
    const reset = await lane.authority.readStreamBatch(lane.runId, 0, 200);
    assert.equal(reset.kind, "reset"); assert.deepEqual(reset.projection, fresh); assert.equal(reset.cursor, fresh.cursor);
    const httpReset = await fetch(`${lane.address.url}/api/v1/runs/${lane.runId}/events?after=0`, { headers: { cookie: lane.cookie } });
    assert.equal((await httpReset.json() as { kind: string }).kind, "reset");
  } finally { await lane.server.close(); await rm(lane.fixture.root, { recursive: true, force: true }); }
});
