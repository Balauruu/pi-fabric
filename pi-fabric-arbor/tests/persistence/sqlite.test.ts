import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { SqliteRunStore } from "../../src/persistence/SqliteRunStore.js";
import { MIGRATIONS } from "../../src/persistence/migrations.js";
import { sha256 } from "../../src/util/canonical.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import type { RunAggregateV1 } from "../../src/domain/types.js";
import { errorCode } from "../helpers.js";

async function tempDatabase() {
  const root = await mkdtemp(join(tmpdir(), "arbor-sqlite-"));
  return { root, path: join(root, "authority.sqlite3") };
}

const aggregate = (runId: string, now: string): RunAggregateV1 => ({
  version: 1 as const, runId, revision: 0, sequence: 0, contract: createFixtureContract(),
  contractDigest: "a".repeat(64), epochDigest: "a".repeat(64), state: "ADMITTED" as const, phase: "OBSERVE" as const,
  hypotheses: [], attempts: [], effects: [], effectObservations: [], agentChildren: [], budgetReservations: [], dispatchIntents: [], gates: [], candidates: [], certificates: [], mergeConstructions: [], promotions: [], authorizations: [], intents: [], reports: [], cleanup: [], workerClaims: [], pinnedHypothesisIds: [], yielded: false, createdAt: now, updatedAt: now,
});

test("SQLite store enables WAL and survives deterministic replay after reopen", async () => {
  const temp = await tempDatabase();
  const now = "2026-01-01T00:00:00.000Z";
  try {
    let store = await SqliteRunStore.open(temp.path);
    await store.commit({ version: 1, kind: "test", metadata: { runId: "run_sqlite", expectedRevision: 0, idempotencyKey: "sqlite_commit_key01" }, input: { value: 1 } }, { fence: 0, now }, "command_sqlite", () => ({ aggregate: aggregate("run_sqlite", now), eventTypes: ["RUN_ADMITTED"] }));
    const db = new DatabaseSync(temp.path, { readOnly: true });
    assert.equal(Object.values(db.prepare("PRAGMA journal_mode").get()!)[0], "wal");
    db.close();
    await store.close();
    store = await SqliteRunStore.open(temp.path);
    await store.verify();
    assert.equal((await store.load("run_sqlite"))?.revision, 1);
    const events = await store.readEvents("run_sqlite", 0, 200);
    assert.equal(events.events.length, 1);
    await store.close();
  } finally { await rm(temp.root, { recursive: true, force: true }); }
});

test("corrupt snapshot is discarded and rebuilt from checksummed events", async () => {
  const temp = await tempDatabase();
  const now = "2026-01-01T00:00:00.000Z";
  try {
    let store = await SqliteRunStore.open(temp.path);
    await store.commit({ version: 1, kind: "test", metadata: { runId: "run_snapshot", expectedRevision: 0, idempotencyKey: "snapshot_commit_001" }, input: {} }, { fence: 0, now }, "command_snapshot", () => ({ aggregate: aggregate("run_snapshot", now), eventTypes: ["RUN_ADMITTED"] }));
    await store.close();
    const db = new DatabaseSync(temp.path);
    db.prepare("UPDATE snapshots SET aggregate_json=? WHERE run_id=?").run("{broken", "run_snapshot");
    db.close();
    store = await SqliteRunStore.open(temp.path);
    assert.equal((await store.load("run_snapshot"))?.revision, 1);
    await store.close();
    const verify = new DatabaseSync(temp.path, { readOnly: true });
    const row = verify.prepare("SELECT aggregate_json,aggregate_digest FROM snapshots WHERE run_id=?").get("run_snapshot")!;
    assert.equal(sha256(String(row.aggregate_json)), row.aggregate_digest);
    verify.close();
  } finally { await rm(temp.root, { recursive: true, force: true }); }
});

test("unknown newer schema opens read-only and refuses downgrade mutation", async () => {
  const temp = await tempDatabase();
  try {
    const db = new DatabaseSync(temp.path);
    db.exec("PRAGMA user_version=999");
    db.close();
    const store = await SqliteRunStore.open(temp.path);
    assert.equal(store.readOnly, true);
    await assert.rejects(store.commit({ version: 1, kind: "x", metadata: { runId: "run_newer", expectedRevision: 0, idempotencyKey: "newer_schema_key01" }, input: {} }, { fence: 0, now: "2026-01-01T00:00:00.000Z" }, "command_newer", () => ({ aggregate: aggregate("run_newer", "2026-01-01T00:00:00.000Z"), eventTypes: ["X"] })), errorCode("READ_ONLY_NEWER_SCHEMA"));
    await store.close();
  } finally { await rm(temp.root, { recursive: true, force: true }); }
});

test("failed numbered migration rolls back and retains a backup of prior authority", async () => {
  const temp = await tempDatabase();
  try {
    const initial = await SqliteRunStore.open(temp.path);
    await initial.close();
    const badSql = "CREATE TABLE should_rollback(id INTEGER); THIS IS NOT SQL;";
    const currentVersion = MIGRATIONS.at(-1)!.version;
    const bad = { version: currentVersion + 1, name: "failing_migration", sql: badSql, checksum: sha256(badSql) };
    await assert.rejects(SqliteRunStore.open(temp.path, { migrations: [...MIGRATIONS, bad] }), errorCode("MIGRATION_FAILED"));
    assert.equal(existsSync(`${temp.path}.v${currentVersion}.backup`), true);
    const db = new DatabaseSync(temp.path, { readOnly: true });
    assert.equal(Object.values(db.prepare("PRAGMA user_version").get()!)[0], currentVersion);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='should_rollback'").get(), undefined);
    db.close();
    const reopened = await SqliteRunStore.open(temp.path);
    await reopened.close();
  } finally { await rm(temp.root, { recursive: true, force: true }); }
});

test("Phase 4 migrations persist recovery, child, budget, process, inbox, and outbox projections", async () => {
  const temp = await tempDatabase(); const now = "2026-01-01T00:00:00.000Z";
  try {
    const store = await SqliteRunStore.open(temp.path); const value = aggregate("run_projections", now);
    const identity = { version: 1 as const, boundary: "child" as const, action: "spawnChild" as const, fence: 0, expectedRevision: 1, intentDigest: "b".repeat(64), dispatchKey: "dispatch_projection", containmentId: "containment_fixture" };
    const unit = { version: 1 as const, kind: "processGroup" as const, identityDigest: "c".repeat(64), startIdentity: "pgid:1:start:1", containmentId: "containment_fixture", descendantOwned: true as const };
    value.effects.push({ version: 1, effectId: "effect_projection", kind: "agent", state: "COMMITTED", idempotencyKey: "projection_effect", identity, processUnit: unit, acceptedOutcomeDigest: "d".repeat(64) });
    value.effectObservations.push({ version: 1, observationId: "observation_projection", effectId: "effect_projection", classification: "COMPLETED", targetFence: 0, observedFence: 0, expectedRevision: 0, identityDigest: "e".repeat(64), observedAt: now, observerDigest: "f".repeat(64), outcomeDigest: "d".repeat(64), reasons: ["projection fixture"] });
    value.agentChildren.push({ version: 1, childId: "child_projection", attemptId: "attempt_projection", effectId: "effect_projection", dispatchKey: "dispatch_projection", fence: 0, childHandleDigest: "1".repeat(64), workflowCorrelationDigest: "2".repeat(64), requestDigest: "3".repeat(64), containmentId: "containment_fixture", state: "COMPLETED", processUnit: unit });
    value.budgetReservations.push({ version: 1, budgetReservationId: "budget_projection", attemptId: "attempt_projection", dispatchKey: "dispatch_projection", effectId: "effect_projection", ordinal: 1, state: "CONSUMED" });
    await store.commit({ version: 1, kind: "projection", metadata: { runId: value.runId, expectedRevision: 0, idempotencyKey: "projection_commit_key" }, input: {} }, { fence: 0, now }, "command_projection", () => ({ aggregate: value, eventTypes: ["PROJECTION_COMMITTED"] }));
    await store.close(); const db = new DatabaseSync(temp.path, { readOnly: true });
    for (const table of ["effects", "effect_observations", "agent_children", "budget_reservations", "process_units", "outbox", "command_intents"]) assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table), table);
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM effect_observations").get()!.count), 1);
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM process_units").get()!.count), 1, "shared child/effect process identity is deduplicated");
    const columns = new Set((db.prepare("PRAGMA table_info(outbox)").all() as Array<{ name: string }>).map((row) => row.name));
    for (const column of ["event_revision", "event_digest", "dispatch_key", "state", "attempt_count", "accepted_outcome_digest", "observer_digest"]) assert.ok(columns.has(column), column);
    db.close();
  } finally { await rm(temp.root, { recursive: true, force: true }); }
});

test("Phase 5 migrations durably project detached merges, promotions, and one-time authorizations", async () => {
  const temp = await tempDatabase(); const now = "2026-01-01T00:00:00.000Z"; const oid = "a".repeat(40); const digest = "b".repeat(64);
  try {
    const store = await SqliteRunStore.open(temp.path); const value = aggregate("run_phase5_projections", now);
    value.mergeConstructions.push({ version: 1, constructionId: "merge_projection", role: "heldOutCandidate", candidateId: "candidate_projection", expectedResearchTrunkOid: oid, candidateOid: oid, mergeCandidateOid: oid, treeOid: oid, algorithmDigest: digest, diffEntries: [], changedPaths: [], requiredOutputs: [], requiredOutputsDigest: digest, protectedManifest: [], protectedManifestDigest: digest, fullTreeManifestDigest: digest, beforeRefsDigest: digest, afterRefsDigest: digest, manifestDigest: digest });
    const payload = { version: 1 as const, kind: "promote" as const, challengeId: "challenge_projection", runId: value.runId, repositoryId: value.contract.repository.repositoryId, promotionId: "promotion_projection", candidateId: "candidate_projection", candidateOid: oid, mergeCandidateOid: oid, heldOutCertificateDigest: digest, contractDigest: value.contractDigest, winnerRef: `refs/pi-fabric-arbor/${value.runId}/winner`, expectedCurrentOid: "0".repeat(40), predecessorOid: "0".repeat(40), expiresAt: "2026-01-01T00:01:00.000Z", nonce: "c".repeat(64), principalId: "principal_projection" };
    value.authorizations.push({ version: 1, authorizationId: "authorization_projection", challengeId: payload.challengeId, challengeDigest: digest, payload, nonceDigest: digest, principalId: payload.principalId, keyId: "key_projection", signature: "signature", issuedAt: now, state: "CONSUMED", consumedById: payload.promotionId });
    value.promotions.push({ version: 1, promotionId: payload.promotionId, state: "COMMITTED", candidateId: payload.candidateId, candidateOid: oid, expectedResearchTrunkOid: oid, mergeCandidateOid: oid, mergeConstructionId: "merge_projection", heldOutCertificateId: "certificate_projection", heldOutCertificateDigest: digest, winnerRef: payload.winnerRef, expectedCurrentOid: payload.expectedCurrentOid, predecessorOid: payload.predecessorOid, authorizationId: "authorization_projection", authorizationDigest: digest, effectId: "effect_projection", observedOid: oid, observationDigest: digest, committedAt: now });
    await store.commit({ version: 1, kind: "phase5Projection", metadata: { runId: value.runId, expectedRevision: 0, idempotencyKey: "phase5_projection_key" }, input: {} }, { fence: 0, now }, "command_phase5_projection", () => ({ aggregate: value, eventTypes: ["PHASE5_PROJECTED"] }));
    await store.close(); const db = new DatabaseSync(temp.path, { readOnly: true });
    for (const table of ["merge_constructions", "promotions", "promotion_authorizations"]) assert.equal(Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count), 1, table);
    assert.equal((db.prepare("SELECT json_extract(body_json, '$.state') AS state FROM promotions").get() as { state: string }).state, "COMMITTED"); assert.equal((db.prepare("SELECT json_extract(body_json, '$.state') AS state FROM promotion_authorizations").get() as { state: string }).state, "CONSUMED"); db.close();
  } finally { await rm(temp.root, { recursive: true, force: true }); }
});

test("corrupt SQLite authority fails closed", async () => {
  const temp = await tempDatabase();
  try {
    await writeFile(temp.path, "not a sqlite database");
    await assert.rejects(SqliteRunStore.open(temp.path), errorCode("STORE_CORRUPT"));
  } finally { await rm(temp.root, { recursive: true, force: true }); }
});
