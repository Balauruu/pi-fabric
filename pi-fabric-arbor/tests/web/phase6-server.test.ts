import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import test from "node:test";
import type { WebIntentV1 } from "../../src/domain/types.js";
import { FixtureDriver } from "../../src/fixtures/driver.js";
import { ArtifactStore } from "../../src/persistence/ArtifactStore.js";
import { DetachedMonitorAuthority } from "../../src/web/DetachedMonitorAuthority.js";
import { DetachedMonitorServer } from "../../src/web/DetachedMonitorServer.js";
import { WEB_MUTATION_ROUTES_V1, WEB_READ_ROUTES_V1 } from "../../src/web/api-schemas.js";
import { makeFixtureApplication } from "../helpers.js";

async function lane() {
  const fixture = await makeFixtureApplication(); const runId = "run_phase6_web";
  await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run(runId);
  const artifacts = await ArtifactStore.open(`${fixture.root}/artifacts`, { now: () => fixture.clock.now() }); const artifact = await artifacts.putText("diff --git a/file.ts b/file.ts\n" + "x".repeat(70_000), { maxBytes: 80_000 });
  const server = new DetachedMonitorServer({ authority: new DetachedMonitorAuthority(fixture.application, fixture.store, (id) => fixture.store.readEventCompactionFloor(id), () => fixture.clock.now(), artifacts), bootstrapToken: "p".repeat(32), pollIntervalMs: 10 });
  const address = await server.start();
  const bootstrap = await fetch(`${address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: address.url, "content-type": "application/json" }, body: JSON.stringify({ version: 1, token: "p".repeat(32) }) });
  const session = await bootstrap.json() as { csrfToken: string }; const cookie = bootstrap.headers.get("set-cookie")!.split(";", 1)[0]!;
  return { fixture, runId, artifact, server, address, session, cookie };
}

async function cleanup(value: Awaited<ReturnType<typeof lane>>): Promise<void> { await value.server.close(); await rm(value.fixture.root, { recursive: true, force: true }); }
async function rawHostStatus(address: string, cookie: string): Promise<number> { return new Promise((resolveStatus, reject) => { const target = new URL("/api/v1/session", address); const request = httpRequest({ hostname: target.hostname, port: target.port, path: target.pathname, method: "GET", headers: { cookie, host: "evil.invalid" } }, (response) => { response.resume(); resolveStatus(response.statusCode ?? 0); }); request.once("error", reject); request.end(); }); }

test("Phase 6 serves every required UI and read API route from the release-built application", async () => {
  const value = await lane();
  try {
    const ui = ["overview", "tree", "attempts", "compare", "metrics", "timeline", "resources", "promotion", "report", "contract"];
    for (const route of ui) {
      const response = await fetch(`${value.address.url}/runs/${value.runId}/${route}`); assert.equal(response.status, 200, route); assert.match(response.headers.get("content-type") ?? "", /text\/html/u);
    }
    const run = (await value.fixture.store.load(value.runId))!; const attemptId = run.attempts[0]!.attemptId; const artifactBinding = `runId=${value.runId}&effectId=${run.effects[0]!.effectId}`;
    const reads = [
      "/api/v1/session", "/api/v1/runs?limit=10", `/api/v1/runs/${value.runId}`, `/api/v1/runs/${value.runId}/tree`, `/api/v1/runs/${value.runId}/attempts`, `/api/v1/runs/${value.runId}/attempts/${attemptId}`, `/api/v1/runs/${value.runId}/comparisons`, `/api/v1/runs/${value.runId}/metrics`, `/api/v1/runs/${value.runId}/events?after=0&limit=20`, `/api/v1/runs/${value.runId}/resources`, `/api/v1/runs/${value.runId}/promotions`, `/api/v1/runs/${value.runId}/report`, `/api/v1/runs/${value.runId}/contract`, `/api/v1/artifacts/${value.artifact.artifactId}?${artifactBinding}`, `/api/v1/diffs/${value.artifact.artifactId}?${artifactBinding}`,
    ];
    for (const path of reads) { const response = await fetch(`${value.address.url}${path}`, { headers: { cookie: value.cookie } }); assert.equal(response.status, 200, path); assert.ok(Buffer.byteLength(await response.text(), "utf8") <= 1024 * 1024 + 128 * 1024); }
    assert.equal(WEB_READ_ROUTES_V1.length, 16); assert.equal(WEB_MUTATION_ROUTES_V1.length, 3);
  } finally { await cleanup(value); }
});

test("all Web controls append closed inbox intents without executing an external capability", async () => {
  const value = await lane();
  try {
    const run = (await value.fixture.store.load(value.runId))!; const hypothesisId = run.hypotheses[0]!.hypothesisId; const attemptId = run.attempts[0]!.attemptId; const candidateId = run.candidates[0]!.candidateId;
    const intents: WebIntentV1[] = [
      { version: 1, kind: "pause", expectedRevision: 0, reason: "operator pause" }, { version: 1, kind: "resume", expectedRevision: 0 },
      { version: 1, kind: "answerGate", expectedRevision: 0, answer: { version: 1, kind: "confirm", gateId: "gate_phase6", value: true } },
      { version: 1, kind: "pinHypothesis", expectedRevision: 0, hypothesisId }, { version: 1, kind: "pruneHypothesis", expectedRevision: 0, hypothesisId, reason: "bounded reason" },
      { version: 1, kind: "retryAttempt", expectedRevision: 0, attemptId }, { version: 1, kind: "cancel", expectedRevision: 0, reason: "operator cancel" },
      { version: 1, kind: "requestPromotion", expectedRevision: 0, candidateId }, { version: 1, kind: "requestRollback", expectedRevision: 0, promotionId: "promotion_phase6" },
      { version: 1, kind: "requestReport", expectedRevision: 0 }, { version: 1, kind: "requestCleanup", expectedRevision: 0 },
    ];
    const initialIntentCount = run.intents.length; const before = { workspace: value.fixture.workspace.materializations.length, agents: value.fixture.agent.calls.length, evaluator: value.fixture.evaluator.calls.length, cleanup: value.fixture.cleanup.calls.length };
    let revision = run.revision;
    for (const [index, intent] of intents.entries()) {
      const response = await fetch(`${value.address.url}/api/v1/runs/${value.runId}/intents`, { method: "POST", headers: { cookie: value.cookie, origin: value.address.url, "x-arbor-csrf": value.session.csrfToken, "content-type": "application/json", "idempotency-key": `phase6_web_intent_${index.toString().padStart(2, "0")}` }, body: JSON.stringify({ ...intent, expectedRevision: revision }) });
      assert.equal(response.status, 202, intent.kind); revision = (await response.json() as { revision: number }).revision;
    }
    const after = (await value.fixture.store.load(value.runId))!; assert.equal(after.intents.length, initialIntentCount + 11); assert.ok(after.intents.slice(initialIntentCount).every((entry) => entry.state === "PENDING"));
    assert.deepEqual({ workspace: value.fixture.workspace.materializations.length, agents: value.fixture.agent.calls.length, evaluator: value.fixture.evaluator.calls.length, cleanup: value.fixture.cleanup.calls.length }, before);
    assert.equal("execute" in new DetachedMonitorAuthority(value.fixture.application, value.fixture.store), false);
  } finally { await cleanup(value); }
});

test("Phase 6 security controls reject wrong Host, Origin, CSRF, media, body, query, artifact, and method bounds", async () => {
  const value = await lane();
  try {
    const root = await fetch(`${value.address.url}/`); assert.match(root.headers.get("content-security-policy") ?? "", /default-src 'none'/u); assert.equal(root.headers.get("x-content-type-options"), "nosniff"); assert.equal(root.headers.get("cross-origin-embedder-policy"), "require-corp");
    assert.match(value.cookie, /^arbor_session=/u); const setCookie = (await fetch(`${value.address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: value.address.url, "content-type": "application/json" }, body: JSON.stringify({ version: 1, token: "p".repeat(32) }) })).status; assert.equal(setCookie, 409);
    assert.equal(await rawHostStatus(value.address.url, value.cookie), 400);
    const wrongOrigin = await fetch(`${value.address.url}/api/v1/session`, { headers: { cookie: value.cookie, origin: "http://evil.invalid" } }); assert.equal(wrongOrigin.status, 403);
    const noCsrf = await fetch(`${value.address.url}/api/v1/runs/${value.runId}/intents`, { method: "POST", headers: { cookie: value.cookie, origin: value.address.url, "content-type": "application/json", "idempotency-key": "phase6_missing_csrf" }, body: JSON.stringify({ version: 1, kind: "pause", expectedRevision: 1 }) }); assert.equal(noCsrf.status, 403);
    const wrongMedia = await fetch(`${value.address.url}/api/v1/runs/${value.runId}/intents`, { method: "POST", headers: { cookie: value.cookie, origin: value.address.url, "x-arbor-csrf": value.session.csrfToken, "content-type": "text/plain", "idempotency-key": "phase6_wrong_media_" }, body: "{}" }); assert.equal(wrongMedia.status, 415);
    const oversized = await fetch(`${value.address.url}/api/v1/runs/${value.runId}/intents`, { method: "POST", headers: { cookie: value.cookie, origin: value.address.url, "x-arbor-csrf": value.session.csrfToken, "content-type": "application/json", "idempotency-key": "phase6_body_limit_" }, body: JSON.stringify({ version: 1, kind: "pause", expectedRevision: 1, reason: "x".repeat(256 * 1024) }) }); assert.equal(oversized.status, 413);
    assert.equal((await fetch(`${value.address.url}/api/v1/runs?limit=201`, { headers: { cookie: value.cookie } })).status, 400);
    assert.equal((await fetch(`${value.address.url}/api/v1/runs?limit=1&limit=2`, { headers: { cookie: value.cookie } })).status, 400);
    assert.equal((await fetch(`${value.address.url}/api/v1/artifacts/${value.artifact.artifactId}?limit=65537`, { headers: { cookie: value.cookie } })).status, 400);
    assert.equal((await fetch(`${value.address.url}/api/v1/runs/${value.runId}`, { method: "PATCH", headers: { cookie: value.cookie, origin: value.address.url } })).status, 405);
  } finally { await cleanup(value); }
});
