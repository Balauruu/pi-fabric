import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";
import { ArborError } from "../domain/errors.js";
import type { CommandContextV1, CommandReceiptV1, DomainEventV1, EventPageV1, OutboxObservationV1, OutboxRecordV1, RunAggregateV1 } from "../domain/types.js";
import { canonicalJson, digestCanonical, immutableClone, sha256 } from "../util/canonical.js";
import type { MutationDecider, RunStore, StoredMutationV1 } from "./RunStore.js";
import { LATEST_SCHEMA_VERSION, MIGRATIONS, REDUCER_VERSION, type MigrationV1 } from "./migrations.js";

interface SqliteRunStoreOptions {
  migrations?: readonly MigrationV1[];
  backupPath?: string;
}

function asNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  throw new ArborError("STORE_CORRUPT", "Expected SQLite integer");
}
function asString(value: unknown): string {
  if (typeof value !== "string") throw new ArborError("STORE_CORRUPT", "Expected SQLite text");
  return value;
}

export class SqliteRunStore implements RunStore {
  readonly readOnly: boolean;
  readonly schemaVersion: number;
  #db: DatabaseSync;

  private constructor(db: DatabaseSync, readOnly: boolean, schemaVersion: number) {
    this.#db = db;
    this.readOnly = readOnly;
    this.schemaVersion = schemaVersion;
  }

  static async openRepository(stateRoot: string, repositoryId: string, options: SqliteRunStoreOptions = {}): Promise<SqliteRunStore> {
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(repositoryId)) throw new ArborError("VALIDATION_FAILED", "Invalid repository ID");
    return this.open(join(stateRoot, "repositories", repositoryId, "authority.sqlite3"), options);
  }

  static async open(path: string, options: SqliteRunStoreOptions = {}): Promise<SqliteRunStore> {
    const migrations = options.migrations ?? MIGRATIONS;
    const latest = migrations.at(-1)?.version ?? LATEST_SCHEMA_VERSION;
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const existed = existsSync(path);
    let db: DatabaseSync;
    try {
      db = new DatabaseSync(path);
    } catch (error) {
      throw new ArborError("STORE_CORRUPT", "SQLite authority could not be opened", { cause: String(error) });
    }
    let version: number;
    try {
      db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
      version = asNumber(db.prepare("PRAGMA user_version").get()!.user_version);
    } catch (error) {
      db.close();
      throw new ArborError("STORE_CORRUPT", "SQLite authority header or schema is invalid", { cause: String(error) });
    }
    if (version > latest) {
      db.close();
      const readOnlyDb = new DatabaseSync(path, { readOnly: true });
      readOnlyDb.exec("PRAGMA foreign_keys=ON; PRAGMA query_only=ON;");
      const integrity = readOnlyDb.prepare("PRAGMA integrity_check").all() as Array<Record<string, unknown>>;
      if (integrity.length !== 1 || Object.values(integrity[0] ?? {})[0] !== "ok") {
        readOnlyDb.close();
        throw new ArborError("STORE_CORRUPT", "Newer SQLite authority failed integrity check");
      }
      return new SqliteRunStore(readOnlyDb, true, version);
    }
    if (version < latest) {
      if (existed && version > 0) {
        db.exec("PRAGMA wal_checkpoint(FULL)");
        await backup(db, options.backupPath ?? `${path}.v${version}.backup`);
      }
      try {
        for (const migration of migrations.filter((entry) => entry.version > version)) {
          db.exec("BEGIN IMMEDIATE");
          try {
            db.exec(migration.sql);
            db.prepare("INSERT INTO schema_migrations(version,name,checksum,applied_at) VALUES(?,?,?,?)").run(
              migration.version, migration.name, migration.checksum, new Date().toISOString(),
            );
            db.exec(`PRAGMA user_version=${migration.version}`);
            db.exec("COMMIT");
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
        }
      } catch (error) {
        db.close();
        throw new ArborError("MIGRATION_FAILED", "SQLite migration failed; the transaction was rolled back", { cause: String(error) });
      }
    }
    db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    const rows = db.prepare("SELECT version,checksum FROM schema_migrations ORDER BY version").all() as Array<Record<string, unknown>>;
    for (const row of rows) {
      const migration = migrations.find((entry) => entry.version === asNumber(row.version));
      if (!migration || migration.checksum !== asString(row.checksum)) {
        db.close();
        throw new ArborError("MIGRATION_FAILED", "Migration checksum mismatch", { version: asNumber(row.version) });
      }
    }
    const store = new SqliteRunStore(db, false, latest);
    await store.verify();
    return store;
  }

  async lookupReceipt(mutation: StoredMutationV1, _context: CommandContextV1): Promise<CommandReceiptV1 | undefined> {
    let duplicate: Record<string, unknown> | undefined;
    try {
      duplicate = this.#db.prepare("SELECT input_digest,input_json,receipt_json FROM commands WHERE run_id=? AND idempotency_key=?").get(
        mutation.metadata.runId, mutation.metadata.idempotencyKey,
      ) as Record<string, unknown> | undefined;
    } catch (error) {
      if (this.readOnly) return undefined;
      throw error;
    }
    if (!duplicate) return undefined;
    const inputJson = canonicalJson({ kind: mutation.kind, runId: mutation.metadata.runId, input: mutation.input });
    const inputDigest = sha256(inputJson);
    if (asString(duplicate.input_digest) !== inputDigest || asString(duplicate.input_json) !== inputJson) throw new ArborError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with different input");
    return immutableClone({ ...(JSON.parse(asString(duplicate.receipt_json)) as CommandReceiptV1), duplicate: true });
  }

  async commit(mutation: StoredMutationV1, context: CommandContextV1, commandId: string, decide: MutationDecider): Promise<CommandReceiptV1> {
    if (this.readOnly) throw new ArborError("READ_ONLY_NEWER_SCHEMA", "Authority schema is newer; mutations are disabled");
    const inputJson = canonicalJson({ kind: mutation.kind, runId: mutation.metadata.runId, input: mutation.input });
    const inputDigest = sha256(inputJson);
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const duplicate = this.#db.prepare("SELECT input_digest,input_json,receipt_json FROM commands WHERE run_id=? AND idempotency_key=?").get(
        mutation.metadata.runId, mutation.metadata.idempotencyKey,
      ) as Record<string, unknown> | undefined;
      if (duplicate) {
        if (asString(duplicate.input_digest) !== inputDigest || asString(duplicate.input_json) !== inputJson) throw new ArborError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with different input");
        this.#db.exec("COMMIT");
        return immutableClone({ ...(JSON.parse(asString(duplicate.receipt_json)) as CommandReceiptV1), duplicate: true });
      }
      const row = this.#db.prepare("SELECT aggregate_json FROM runs WHERE run_id=?").get(mutation.metadata.runId) as Record<string, unknown> | undefined;
      const current = row ? JSON.parse(asString(row.aggregate_json)) as RunAggregateV1 : undefined;
      if ((current?.revision ?? 0) !== mutation.metadata.expectedRevision) throw new ArborError("STALE_REVISION", "Expected revision does not match", { expected: mutation.metadata.expectedRevision, actual: current?.revision ?? 0 });
      const currentFence = current?.driver?.fence ?? 0;
      if (context.fence !== currentFence) throw new ArborError("STALE_FENCE", "Controller fence does not match", { expected: currentFence, actual: context.fence });
      const decision = decide(current === undefined ? undefined : immutableClone(current));
      if (decision.eventTypes.length < 1) throw new ArborError("VALIDATION_FAILED", "A mutation must append at least one event");
      const revision = (current?.revision ?? 0) + 1;
      const startSequence = current?.sequence ?? 0;
      const aggregate = immutableClone({ ...decision.aggregate, revision, sequence: startSequence + decision.eventTypes.length, updatedAt: context.now });
      const aggregateJson = canonicalJson(aggregate);
      const aggregateDigest = sha256(aggregateJson);
      if (current) {
        this.#db.prepare("UPDATE runs SET revision=?,sequence=?,aggregate_json=?,aggregate_digest=?,updated_at=? WHERE run_id=?").run(
          revision, aggregate.sequence, aggregateJson, aggregateDigest, context.now, mutation.metadata.runId,
        );
      } else {
        this.#db.prepare("INSERT INTO runs(run_id,revision,sequence,aggregate_json,aggregate_digest,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(
          mutation.metadata.runId, revision, aggregate.sequence, aggregateJson, aggregateDigest, aggregate.createdAt, context.now,
        );
      }
      for (const [index, type] of decision.eventTypes.entries()) {
        const event: DomainEventV1 = { version: 1, runId: mutation.metadata.runId, sequence: startSequence + index + 1, revision, type, at: context.now, aggregate };
        const eventJson = canonicalJson(event);
        this.#db.prepare("INSERT INTO events(run_id,sequence,revision,type,at,event_json,event_digest) VALUES(?,?,?,?,?,?,?)").run(
          event.runId, event.sequence, event.revision, event.type, event.at, eventJson, sha256(eventJson),
        );
        this.#db.prepare("INSERT INTO outbox(run_id,sequence,body_json,published,event_revision,event_digest,dispatch_key,state,attempt_count) VALUES(?,?,?,0,?,?,?,'PENDING',0)").run(
          event.runId, event.sequence, eventJson, event.revision, sha256(eventJson), `outbox_${sha256(`${event.runId}:${event.sequence}`).slice(0, 32)}`,
        );
      }
      const receipt: CommandReceiptV1 = immutableClone({
        version: 1, commandId, runId: mutation.metadata.runId, revision, sequence: aggregate.sequence,
        duplicate: false, eventTypes: [...decision.eventTypes], ...(decision.directive ? { directive: decision.directive } : {}),
      });
      this.#db.prepare("INSERT INTO commands(command_id,run_id,idempotency_key,input_digest,input_json,receipt_json) VALUES(?,?,?,?,?,?)").run(
        commandId, mutation.metadata.runId, mutation.metadata.idempotencyKey, inputDigest, inputJson, canonicalJson(receipt),
      );
      this.#db.prepare("INSERT INTO snapshots(run_id,revision,sequence,reducer_version,aggregate_json,aggregate_digest) VALUES(?,?,?,?,?,?)").run(
        mutation.metadata.runId, revision, aggregate.sequence, REDUCER_VERSION, aggregateJson, aggregateDigest,
      );
      this.#syncProjections(aggregate);
      this.#db.exec("COMMIT");
      return receipt;
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
  }

  async load(runId: string): Promise<RunAggregateV1 | undefined> {
    const row = this.#db.prepare("SELECT aggregate_json,aggregate_digest,revision,sequence FROM runs WHERE run_id=?").get(runId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const storedJson = asString(row.aggregate_json);
    if (sha256(storedJson) !== asString(row.aggregate_digest)) throw new ArborError("STORE_CORRUPT", "Stored read model digest mismatch");

    const snapshot = this.#db.prepare("SELECT revision,sequence,reducer_version,aggregate_json,aggregate_digest FROM snapshots WHERE run_id=? ORDER BY revision DESC LIMIT 1").get(runId) as Record<string, unknown> | undefined;
    let replayed: RunAggregateV1 | undefined;
    let afterSequence = 0;
    let corruptSnapshot = false;
    if (snapshot && asNumber(snapshot.reducer_version) === REDUCER_VERSION && sha256(asString(snapshot.aggregate_json)) === asString(snapshot.aggregate_digest)) {
      replayed = JSON.parse(asString(snapshot.aggregate_json)) as RunAggregateV1;
      afterSequence = asNumber(snapshot.sequence);
    } else if (snapshot) {
      corruptSnapshot = true;
    }
    const events = this.#db.prepare("SELECT event_json,event_digest FROM events WHERE run_id=? AND sequence>? ORDER BY sequence").all(runId, afterSequence) as Array<Record<string, unknown>>;
    let expectedSequence = afterSequence + 1;
    for (const eventRow of events) {
      const eventJson = asString(eventRow.event_json);
      if (sha256(eventJson) !== asString(eventRow.event_digest)) throw new ArborError("STORE_CORRUPT", "Event digest mismatch");
      const event = JSON.parse(eventJson) as DomainEventV1;
      if (event.runId !== runId || event.sequence !== expectedSequence) throw new ArborError("STORE_CORRUPT", "Event identity or sequence mismatch");
      expectedSequence += 1;
      replayed = event.aggregate;
    }
    if (!replayed || digestCanonical(replayed) !== digestCanonical(JSON.parse(storedJson))) throw new ArborError("STORE_CORRUPT", "Reducer replay differs from stored aggregate");
    if (corruptSnapshot && !this.readOnly) {
      this.#db.prepare("DELETE FROM snapshots WHERE run_id=?").run(runId);
      this.#db.prepare("INSERT INTO snapshots(run_id,revision,sequence,reducer_version,aggregate_json,aggregate_digest) VALUES(?,?,?,?,?,?)").run(
        runId, replayed.revision, replayed.sequence, REDUCER_VERSION, storedJson, sha256(storedJson),
      );
    }
    return immutableClone(replayed);
  }

  async list(limit: number): Promise<RunAggregateV1[]> {
    const rows = this.#db.prepare("SELECT run_id FROM runs ORDER BY run_id LIMIT ?").all(limit) as Array<Record<string, unknown>>;
    const output: RunAggregateV1[] = [];
    for (const row of rows) {
      const run = await this.load(asString(row.run_id));
      if (run) output.push(run);
    }
    return output;
  }

  async readEvents(runId: string, afterSequence: number, limit: number): Promise<EventPageV1> {
    const rows = this.#db.prepare("SELECT event_json,event_digest FROM events WHERE run_id=? AND sequence>? ORDER BY sequence LIMIT ?").all(runId, afterSequence, limit + 1) as Array<Record<string, unknown>>;
    const hasMore = rows.length > limit;
    const events = rows.slice(0, limit).map((row) => {
      const json = asString(row.event_json);
      if (sha256(json) !== asString(row.event_digest)) throw new ArborError("STORE_CORRUPT", "Event page digest mismatch");
      return JSON.parse(json) as DomainEventV1;
    });
    return immutableClone({ version: 1, runId, afterSequence, events, nextSequence: events.at(-1)?.sequence ?? afterSequence, hasMore });
  }

  async readEventCompactionFloor(runId: string): Promise<number> {
    const row = this.#db.prepare("SELECT floor_sequence FROM event_compaction WHERE run_id=?").get(runId) as Record<string, unknown> | undefined;
    const floor = row ? asNumber(row.floor_sequence) : 0;
    if (!Number.isSafeInteger(floor) || floor < 0) throw new ArborError("STORE_CORRUPT", "Invalid durable event compaction floor");
    return floor;
  }

  async readOutbox(runId: string | undefined, limit: number): Promise<OutboxRecordV1[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new ArborError("VALIDATION_FAILED", "Outbox limit must be 1-200");
    const where = runId ? "run_id=? AND " : "";
    const args: Array<string | number> = runId ? [runId, limit] : [limit];
    const rows = this.#db.prepare(`SELECT run_id,sequence,event_revision,event_digest,dispatch_key,state,body_json,attempt_count,accepted_outcome_digest,observer_digest FROM outbox WHERE ${where}state IN ('PENDING','OBSERVING') ORDER BY run_id,sequence LIMIT ?`).all(...args) as Array<Record<string, unknown>>;
    return rows.map((row) => immutableClone({
      version: 1, runId: asString(row.run_id), sequence: asNumber(row.sequence), revision: asNumber(row.event_revision),
      eventDigest: asString(row.event_digest), dispatchKey: asString(row.dispatch_key), state: asString(row.state) as OutboxRecordV1["state"],
      body: JSON.parse(asString(row.body_json)) as DomainEventV1, attemptCount: asNumber(row.attempt_count),
      ...(typeof row.accepted_outcome_digest === "string" ? { acceptedOutcomeDigest: row.accepted_outcome_digest } : {}),
      ...(typeof row.observer_digest === "string" ? { observerDigest: row.observer_digest } : {}),
    }));
  }

  async commitOutboxObservation(observation: OutboxObservationV1, context: CommandContextV1): Promise<OutboxRecordV1> {
    if (this.readOnly) throw new ArborError("READ_ONLY_NEWER_SCHEMA", "Authority schema is newer; mutations are disabled");
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const runRow = this.#db.prepare("SELECT aggregate_json FROM runs WHERE run_id=?").get(observation.runId) as Record<string, unknown> | undefined;
      if (!runRow) throw new ArborError("RUN_NOT_FOUND", "Run not found");
      const run = JSON.parse(asString(runRow.aggregate_json)) as RunAggregateV1;
      if (!run.driver || run.driver.driverId !== context.driverId || run.driver.fence !== context.fence) throw new ArborError("STALE_FENCE", "Outbox callback fence is stale");
      if (Date.parse(run.driver.expiresAt) <= Date.parse(context.now)) throw new ArborError("LEASE_EXPIRED", "Driver lease expired");
      const row = this.#db.prepare("SELECT event_revision,event_digest,dispatch_key,state,body_json,attempt_count,accepted_outcome_digest,observer_digest FROM outbox WHERE run_id=? AND sequence=?").get(observation.runId, observation.sequence) as Record<string, unknown> | undefined;
      if (!row) throw new ArborError("UNKNOWN_ENTITY", "Unknown outbox record");
      if (asNumber(row.event_revision) !== observation.expectedRevision) throw new ArborError("STALE_REVISION", "Outbox event revision mismatch");
      if (asString(row.dispatch_key) !== observation.dispatchKey) throw new ArborError("EVIDENCE_INVALID", "Outbox dispatch identity mismatch");
      if (asString(row.state) === "PUBLISHED") {
        if (row.accepted_outcome_digest !== observation.outcomeDigest) throw new ArborError("DUPLICATE_ENTITY", "Outbox already has a different accepted outcome");
      } else {
        const state = observation.classification === "COMPLETED" ? "PUBLISHED" : observation.classification === "UNCERTAIN" ? "INDETERMINATE" : observation.classification === "ACTIVE" ? "OBSERVING" : "PENDING";
        if (state === "PUBLISHED" && !observation.outcomeDigest) throw new ArborError("EVIDENCE_INVALID", "Completed outbox observation requires an outcome digest");
        this.#db.prepare("UPDATE outbox SET state=?,published=?,attempt_count=attempt_count+1,accepted_outcome_digest=?,observer_digest=? WHERE run_id=? AND sequence=?").run(
          state, state === "PUBLISHED" ? 1 : 0, observation.outcomeDigest ?? null, observation.observerDigest, observation.runId, observation.sequence,
        );
      }
      const updated = this.#db.prepare("SELECT run_id,sequence,event_revision,event_digest,dispatch_key,state,body_json,attempt_count,accepted_outcome_digest,observer_digest FROM outbox WHERE run_id=? AND sequence=?").get(observation.runId, observation.sequence) as Record<string, unknown>;
      this.#db.exec("COMMIT");
      return immutableClone({
        version: 1, runId: asString(updated.run_id), sequence: asNumber(updated.sequence), revision: asNumber(updated.event_revision),
        eventDigest: asString(updated.event_digest), dispatchKey: asString(updated.dispatch_key), state: asString(updated.state) as OutboxRecordV1["state"],
        body: JSON.parse(asString(updated.body_json)) as DomainEventV1, attemptCount: asNumber(updated.attempt_count),
        ...(typeof updated.accepted_outcome_digest === "string" ? { acceptedOutcomeDigest: updated.accepted_outcome_digest } : {}),
        ...(typeof updated.observer_digest === "string" ? { observerDigest: updated.observer_digest } : {}),
      });
    } catch (error) { this.#db.exec("ROLLBACK"); throw error; }
  }

  #syncProjections(run: RunAggregateV1): void {
    const replace = (table: string, entries: readonly unknown[], idOf: (entry: any) => string): void => {
      this.#db.prepare(`DELETE FROM ${table} WHERE run_id=?`).run(run.runId);
      const insert = this.#db.prepare(`INSERT INTO ${table}(run_id,entity_id,body_json) VALUES(?,?,?)`);
      for (const entry of entries) insert.run(run.runId, idOf(entry), canonicalJson(entry));
    };
    // Projection tables are rebuilt from the authoritative aggregate in the same transaction.
    this.#db.prepare("DELETE FROM effect_observations WHERE run_id=?").run(run.runId);
    replace("hypotheses", run.hypotheses, (entry) => entry.hypothesisId);
    replace("attempts", run.attempts, (entry) => entry.attemptId);
    replace("effects", run.effects, (entry) => entry.effectId);
    replace("agent_children", run.agentChildren ?? [], (entry) => entry.childId);
    replace("gates", run.gates, (entry) => entry.gateId);
    replace("certificates", run.certificates, (entry) => entry.certificateId);
    replace("evaluations", run.certificates, (entry) => entry.evaluationId);
    replace("merge_constructions", run.mergeConstructions ?? [], (entry) => entry.constructionId);
    replace("promotions", run.promotions ?? [], (entry) => entry.promotionId);
    replace("promotion_authorizations", (run.authorizations ?? []).filter((entry) => entry.payload.kind === "promote"), (entry) => entry.authorizationId);
    replace("rollback_authorizations", (run.authorizations ?? []).filter((entry) => entry.payload.kind === "rollback"), (entry) => entry.authorizationId);
    replace("report_generations", run.reports, (entry) => entry.generationId);
    replace("cleanup_obligations", run.cleanup, (entry) => entry.cleanupId);
    replace("command_intents", run.intents, (entry) => entry.intentId);
    replace("budget_reservations", run.budgetReservations ?? [], (entry) => entry.budgetReservationId);
    const observationInsert = this.#db.prepare("INSERT INTO effect_observations(run_id,entity_id,effect_id,classification,outcome_digest,body_json) VALUES(?,?,?,?,?,?)");
    for (const observation of run.effectObservations ?? []) observationInsert.run(run.runId, observation.observationId, observation.effectId, observation.classification, observation.outcomeDigest ?? null, canonicalJson(observation));
    const processUnits = new Map<string, NonNullable<RunAggregateV1["effects"][number]["processUnit"]>>();
    for (const unit of [...(run.effects ?? []).flatMap((entry) => entry.processUnit ? [entry.processUnit] : []), ...(run.agentChildren ?? []).flatMap((entry) => entry.processUnit ? [entry.processUnit] : [])]) processUnits.set(unit.identityDigest, unit);
    replace("process_units", [...processUnits.values()], (entry) => entry.identityDigest);
    this.#db.prepare("DELETE FROM leases WHERE run_id=?").run(run.runId);
    if (run.driver) this.#db.prepare("INSERT INTO leases(run_id,body_json) VALUES(?,?)").run(run.runId, canonicalJson(run.driver));
    this.#db.prepare("DELETE FROM report_publications WHERE run_id=?").run(run.runId);
    const publication = this.#db.prepare("INSERT INTO report_publications(run_id,entity_id,body_json) VALUES(?,?,?)");
    for (const report of run.reports.filter((entry) => entry.state === "PUBLISHED")) publication.run(run.runId, report.generationId, canonicalJson(report));
    this.#db.prepare("DELETE FROM repository_fingerprints WHERE run_id=?").run(run.runId);
    const fingerprint = this.#db.prepare("INSERT INTO repository_fingerprints(run_id,entity_id,body_json) VALUES(?,?,?)");
    for (const observation of (run.effectObservations ?? []).filter((entry) => entry.fingerprint)) fingerprint.run(run.runId, observation.fingerprint!.certificateId, canonicalJson(observation.fingerprint));
    this.#db.prepare("DELETE FROM promotion_ref_observations WHERE run_id=?").run(run.runId);
    const refObservation = this.#db.prepare("INSERT INTO promotion_ref_observations(run_id,entity_id,body_json) VALUES(?,?,?)");
    for (const promotion of (run.promotions ?? []).filter((entry) => entry.observationDigest || entry.rollbackObservedOid)) refObservation.run(run.runId, promotion.promotionId, canonicalJson(promotion));
  }

  async verify(): Promise<void> {
    const integrity = this.#db.prepare("PRAGMA integrity_check").all() as Array<Record<string, unknown>>;
    if (integrity.length !== 1 || Object.values(integrity[0] ?? {})[0] !== "ok") throw new ArborError("STORE_CORRUPT", "SQLite integrity check failed");
    const foreignKeys = this.#db.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeys.length > 0) throw new ArborError("STORE_CORRUPT", "SQLite foreign-key check failed");
    const runs = this.#db.prepare("SELECT run_id FROM runs ORDER BY run_id").all() as Array<Record<string, unknown>>;
    for (const row of runs) await this.load(asString(row.run_id));
  }

  async close(): Promise<void> {
    this.#db.close();
  }
}
