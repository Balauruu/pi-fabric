import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createGuidedFixtureBootstrapV1 } from "../browser-tests/bootstrap-contract.mjs";
import { ArborApplication, DeterministicIdFactory, DetachedMonitorAuthority, DetachedMonitorServer, FileReportPublisher, FixtureCleanupAdapter, FixtureDriver, FixtureEvaluator, FixtureWorkspaceManager, ManualClock, ScriptedFixtureAgent, SqliteRunStore } from "../dist/src/index.js";

const root = await mkdtemp(join(tmpdir(), "arbor-guided-fixture-")); const database = join(root, "authority.sqlite3"); const store = await SqliteRunStore.open(database); const clock = new ManualClock(); const ids = new DeterministicIdFactory();
const application = new ArborApplication({ store, workspace: new FixtureWorkspaceManager(), agent: new ScriptedFixtureAgent(), evaluator: new FixtureEvaluator(ids), cleanup: new FixtureCleanupAdapter(), reportPublisher: await FileReportPublisher.open(join(root, "reports", "run_fixture")), clock, ids, gitOidLength: 40, executionMode: "fixture" });
await new FixtureDriver(application, store, clock).run("run_fixture");
const completed = await store.load("run_fixture");
const token = process.env.ARBOR_FIXTURE_BOOTSTRAP_TOKEN ?? randomBytes(24).toString("base64url");
if (!/^[A-Za-z0-9_-]{32,128}$/u.test(token)) throw new Error("ARBOR_FIXTURE_BOOTSTRAP_TOKEN is invalid");
const configuredPort = process.env.ARBOR_FIXTURE_PORT === undefined ? 0 : Number(process.env.ARBOR_FIXTURE_PORT);
if (!Number.isInteger(configuredPort) || configuredPort < 0 || configuredPort > 65_535) throw new Error("ARBOR_FIXTURE_PORT is invalid");
const authority = new DetachedMonitorAuthority(application, store, (runId) => process.env.ARBOR_FIXTURE_COMPACTION_FLOOR === "current" && runId === "run_fixture" ? (completed?.sequence ?? 0) : store.readEventCompactionFloor(runId)); const server = new DetachedMonitorServer({ authority, bootstrapToken: token, port: configuredPort, maxStreamMs: 20_000 }); const address = await server.start();
process.stdout.write(`${JSON.stringify(createGuidedFixtureBootstrapV1({ address, bootstrapToken: token, runId: "run_fixture" }))}\n`);
let stopping = false; const stop = async () => { if (stopping) return; stopping = true; await server.close(); await store.close(); await rm(root, { recursive: true, force: true }); process.exit(0); }; process.on("SIGINT", stop); process.on("SIGTERM", stop);
await new Promise(() => undefined);
