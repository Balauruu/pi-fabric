import { sha256 } from "../util/canonical.js";

export interface MigrationV1 {
  version: number;
  name: string;
  sql: string;
  checksum: string;
}

const SQL_001 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  aggregate_json TEXT NOT NULL,
  aggregate_digest TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS commands (
  command_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  idempotency_key TEXT NOT NULL,
  input_digest TEXT NOT NULL,
  input_json TEXT NOT NULL,
  receipt_json TEXT NOT NULL,
  UNIQUE(run_id, idempotency_key)
) STRICT;
CREATE TABLE IF NOT EXISTS events (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  sequence INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  event_json TEXT NOT NULL,
  event_digest TEXT NOT NULL,
  PRIMARY KEY(run_id, sequence)
) STRICT;
CREATE TABLE IF NOT EXISTS snapshots (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  revision INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  reducer_version INTEGER NOT NULL,
  aggregate_json TEXT NOT NULL,
  aggregate_digest TEXT NOT NULL,
  PRIMARY KEY(run_id, revision)
) STRICT;
CREATE TABLE IF NOT EXISTS hypotheses (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS attempts (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS trials (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS evaluations (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS certificates (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS effects (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS agent_children (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS leases (run_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS gates (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS promotion_authorizations (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS rollback_authorizations (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS promotions (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS report_generations (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS report_publications (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS artifacts (artifact_id TEXT PRIMARY KEY, digest TEXT NOT NULL UNIQUE, bytes INTEGER NOT NULL, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS cleanup_obligations (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS command_intents (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS outbox (run_id TEXT NOT NULL, sequence INTEGER NOT NULL, body_json TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(run_id, sequence)) STRICT;
CREATE TABLE IF NOT EXISTS repository_fingerprints (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS budget_reservations (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS upstream_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS compatibility_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS containment_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE INDEX IF NOT EXISTS events_revision_idx ON events(run_id, revision);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox(published, run_id, sequence);
`;

const SQL_002 = `
ALTER TABLE outbox ADD COLUMN event_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE outbox ADD COLUMN event_digest TEXT NOT NULL DEFAULT '';
ALTER TABLE outbox ADD COLUMN dispatch_key TEXT NOT NULL DEFAULT '';
ALTER TABLE outbox ADD COLUMN state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','OBSERVING','PUBLISHED','INDETERMINATE'));
ALTER TABLE outbox ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE outbox ADD COLUMN accepted_outcome_digest TEXT;
ALTER TABLE outbox ADD COLUMN observer_digest TEXT;
UPDATE outbox SET
  event_revision = COALESCE((SELECT revision FROM events WHERE events.run_id=outbox.run_id AND events.sequence=outbox.sequence), 0),
  event_digest = COALESCE((SELECT event_digest FROM events WHERE events.run_id=outbox.run_id AND events.sequence=outbox.sequence), ''),
  dispatch_key = 'outbox_' || run_id || '_' || sequence,
  state = CASE published WHEN 1 THEN 'PUBLISHED' ELSE 'PENDING' END;
CREATE UNIQUE INDEX IF NOT EXISTS outbox_dispatch_key_idx ON outbox(dispatch_key);
CREATE INDEX IF NOT EXISTS outbox_state_idx ON outbox(state, run_id, sequence);
CREATE TABLE IF NOT EXISTS effect_observations (
  run_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  effect_id TEXT NOT NULL,
  classification TEXT NOT NULL CHECK(classification IN ('COMPLETED','ACTIVE','ABSENT','UNCERTAIN')),
  outcome_digest TEXT,
  body_json TEXT NOT NULL,
  PRIMARY KEY(run_id, entity_id),
  FOREIGN KEY(run_id, effect_id) REFERENCES effects(run_id, entity_id)
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS effect_accepted_outcome_idx ON effect_observations(run_id,effect_id,outcome_digest) WHERE outcome_digest IS NOT NULL;
CREATE TABLE IF NOT EXISTS process_units (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS recovery_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
`;

const SQL_003 = `
CREATE TABLE IF NOT EXISTS merge_constructions (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS promotion_ref_observations (run_id TEXT NOT NULL, entity_id TEXT NOT NULL, body_json TEXT NOT NULL, PRIMARY KEY(run_id, entity_id)) STRICT;
CREATE TABLE IF NOT EXISTS held_out_isolation_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS authorization_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS promotion_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE INDEX IF NOT EXISTS promotion_authorization_state_idx ON promotion_authorizations(run_id, entity_id);
CREATE INDEX IF NOT EXISTS rollback_authorization_state_idx ON rollback_authorizations(run_id, entity_id);
`;

const SQL_004 = `
CREATE TABLE IF NOT EXISTS event_compaction (
  run_id TEXT PRIMARY KEY REFERENCES runs(run_id),
  floor_sequence INTEGER NOT NULL DEFAULT 0 CHECK(floor_sequence >= 0),
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS retention_holds (
  run_id TEXT PRIMARY KEY REFERENCES runs(run_id),
  held INTEGER NOT NULL CHECK(held IN (0,1)),
  reason_digest TEXT NOT NULL,
  placed_at TEXT NOT NULL,
  released_at TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS cleanup_manifests (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  resource_id TEXT NOT NULL,
  manifest_digest TEXT NOT NULL,
  body_json TEXT NOT NULL,
  PRIMARY KEY(run_id, resource_id)
) STRICT;
CREATE TABLE IF NOT EXISTS web_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS distribution_certifications (entity_id TEXT PRIMARY KEY, body_json TEXT NOT NULL) STRICT;
CREATE INDEX IF NOT EXISTS retention_holds_active_idx ON retention_holds(held, run_id);
`;

const SQL_005 = `
CREATE TABLE IF NOT EXISTS graduation_threshold_seals (entity_id TEXT PRIMARY KEY, seal_digest TEXT NOT NULL UNIQUE, sealed_at TEXT NOT NULL, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS held_out_service_seals (entity_id TEXT PRIMARY KEY, seal_digest TEXT NOT NULL UNIQUE, threshold_seal_digest TEXT NOT NULL, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS resource_budget_journal (run_id TEXT NOT NULL REFERENCES runs(run_id), reservation_id TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('ACTIVE','SETTLED','BREACHED')), body_json TEXT NOT NULL, PRIMARY KEY(run_id,reservation_id)) STRICT;
CREATE TABLE IF NOT EXISTS supported_platform_certifications (entity_id TEXT PRIMARY KEY, certificate_digest TEXT NOT NULL UNIQUE, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS phase7_acceptance_certifications (entity_id TEXT PRIMARY KEY, direction TEXT NOT NULL CHECK(direction IN ('maximize','minimize')), certificate_digest TEXT NOT NULL UNIQUE, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS phase7_soak_certifications (entity_id TEXT PRIMARY KEY, certificate_digest TEXT NOT NULL UNIQUE, body_json TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS graduation_certifications (entity_id TEXT PRIMARY KEY, certificate_digest TEXT NOT NULL UNIQUE, body_json TEXT NOT NULL) STRICT;
CREATE INDEX IF NOT EXISTS resource_budget_state_idx ON resource_budget_journal(state,run_id);
`;

export const MIGRATIONS: readonly MigrationV1[] = Object.freeze([
  Object.freeze({ version: 1, name: "authority_foundation", sql: SQL_001, checksum: sha256(SQL_001) }),
  Object.freeze({ version: 2, name: "phase4_recovery_and_outbox", sql: SQL_002, checksum: sha256(SQL_002) }),
  Object.freeze({ version: 3, name: "phase5_promotion_authorization_held_out", sql: SQL_003, checksum: sha256(SQL_003) }),
  Object.freeze({ version: 4, name: "phase6_web_retention_cleanup_distribution", sql: SQL_004, checksum: sha256(SQL_004) }),
  Object.freeze({ version: 5, name: "phase7_graduation_budgets_services", sql: SQL_005, checksum: sha256(SQL_005) }),
]);
export const LATEST_SCHEMA_VERSION = MIGRATIONS.at(-1)?.version ?? 0;
export const REDUCER_VERSION = 2;
