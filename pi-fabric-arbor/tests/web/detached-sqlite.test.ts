import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { ArborApplication } from "../../src/application/ArborApplication.js";
import { FixtureCleanupAdapter, FixtureEvaluator, FixtureWorkspaceManager, ScriptedFixtureAgent } from "../../src/fixtures/adapters.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { SqliteRunStore } from "../../src/persistence/SqliteRunStore.js";
import { FileReportPublisher } from "../../src/reports/FileReportPublisher.js";
import { DeterministicIdFactory, ManualClock } from "../../src/util/clock.js";
import { DetachedMonitorAuthority } from "../../src/web/DetachedMonitorAuthority.js";
import { DetachedMonitorServer } from "../../src/web/DetachedMonitorServer.js";

test("detached inbox intent survives SQLite close and reopen without executing an effect", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-detached-sqlite-")); const database = join(root, "authority.sqlite3"); const runId = "run_detached_sqlite";
  let server: DetachedMonitorServer | undefined; let store: SqliteRunStore | undefined;
  try {
    store = await SqliteRunStore.open(database); const clock = new ManualClock(); const ids = new DeterministicIdFactory();
    const workspace = new FixtureWorkspaceManager(); const agent = new ScriptedFixtureAgent(); const evaluator = new FixtureEvaluator(ids); const cleanup = new FixtureCleanupAdapter();
    const application = new ArborApplication({ store, workspace, agent, evaluator, cleanup, reportPublisher: await FileReportPublisher.open(join(root, "reports")), clock, ids, gitOidLength: 40, executionMode: "fixture" });
    await application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "detached_sqlite_start" }, contract: createFixtureContract() }, { fence: 0, now: clock.now() });
    server = new DetachedMonitorServer({ authority: new DetachedMonitorAuthority(application, store, () => 0, () => clock.now()), bootstrapToken: "s".repeat(32), pollIntervalMs: 10 });
    const address = await server.start(); const bootstrap = await fetch(`${address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: address.url, "content-type": "application/json" }, body: JSON.stringify({ version: 1, token: "s".repeat(32) }) });
    const cookie = bootstrap.headers.get("set-cookie")!.split(";", 1)[0]!; const session = await bootstrap.json() as { csrfToken: string };
    const response = await fetch(`${address.url}/api/v1/runs/${runId}/intents`, { method: "POST", headers: { cookie, origin: address.url, "x-arbor-csrf": session.csrfToken, "content-type": "application/json", "idempotency-key": "detached_sqlite_pause" }, body: JSON.stringify({ version: 1, kind: "pause", expectedRevision: 1, reason: "persist across detached restart" }) });
    assert.equal(response.status, 202); assert.equal(workspace.materializations.length + agent.calls.length + evaluator.calls.length + cleanup.calls.length, 0);
    await server.close(); server = undefined; await store.close(); store = undefined;
    store = await SqliteRunStore.open(database); const run = (await store.load(runId))!; assert.equal(run.intents.length, 1); assert.equal(run.intents[0]?.state, "PENDING");
    const db = new DatabaseSync(database, { readOnly: true }); assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM command_intents WHERE run_id=?").get(runId)!.count), 1); db.close();
  } finally { if (server) await server.close(); if (store) await store.close(); await rm(root, { recursive: true, force: true }); }
});
