# ADR 0003: Authority, migrations, reports, retention, and cleanup

Status: Accepted for the Phase 0-2 foundation

## Authority

One SQLite authority is intended per administrator-admitted repository identity. SQLite runs in WAL mode with foreign keys, full synchronous commits, bounded immediate transactions, numbered checksummed migrations, commands, events, projections, outbox rows, and reducer-versioned snapshots. A matching idempotency key returns the original receipt; different input is rejected. Unknown newer schemas open query-only. Older authority is backed up before migration. Failed migrations roll back.

Each committed event contains a deterministic aggregate image. This is deliberately storage-heavy in the foundation and makes replay checks simple and auditable. Snapshot digests are verified; invalid snapshots rebuild from checksummed events. Integrity, foreign-key, event identity, replay, and read-model digests fail closed.

CAS objects are bounded, redacted before hashing, owner-only, immutable by digest, and referenced by opaque IDs. Reads reject symlinks and verify content digests.

## Report publication

Planning freezes a revision and all known contract, epoch, certificate, and candidate-manifest dependencies before I/O. Publication writes only admitted generation file names to a recorded temporary generation, fsyncs files and directories, atomically renames the generation, then atomically updates `current`. Observation verifies every byte count and digest before `PUBLISHED`. Complete identical generations are reused; partial temporary generations are reconciled; conflict or uncertain identity fails closed.

## Retention and cleanup

The safe default is indefinite retention. B12 remains unresolved until administrators define durations, legal holds, and deletion rules for every outcome. Cleanup is manifest-driven and disabled for real resources without containment. Planning rejects deletion unless one complete published report covers every dependency. Unknown resources, unresolved effects, journals, reports, and authorization history are retained.
