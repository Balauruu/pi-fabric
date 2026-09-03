# SQLite migration fixture

The production migration path is described in `src/migration.js`. Migrations must remain restartable and preserve rollback boundaries while rows are backfilled in bounded batches.
