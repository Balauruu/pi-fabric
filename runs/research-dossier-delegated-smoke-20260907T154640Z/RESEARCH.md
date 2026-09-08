# Evaluation research - SQLite WAL deployment and online backup

## Brief
- **Decision:** A small service is considering SQLite WAL. Establish only official-documentation constraints for network-filesystem deployment and safe online backups while writes continue.
- **Intended use / consequence of error:** Deployment and backup design. An unsupported assurance could cause corruption, unavailable recovery, or false backup confidence.
- **Scope:** SQLite official documentation at the supplied original sources and their material official API reference, retrieved 2026-09-07. No throughput ranking, benchmark, or measured-performance claim.
- **Required questions:**
  1. What do official WAL docs establish about network filesystems?
  2. What safe online-backup approaches are documented while writers continue, and what constraints apply?
- **Stop:** Direct inspection resolved both questions. No further retrieval would alter the bounded official-documentation answer.

## Assignment index and execution accounting

| Assignment | Owned question | Path | Reservation | Native ID | Status | Retrieval allowance / actual |
|---|---|---|---:|---|---|---:|
| A1 | Official online-backup mechanisms and writer-continuation constraints | [streams/online-backup.md](streams/online-backup.md) | 1 of exactly 1 worker | 93f568bc07f04b4dbd86466d6924797d | completed | 5 / 2 successful, 0 failed |

- Exactly **one** research worker was launched and completed. No repair or verification worker was launched.
- Main retrieval allowance: 5. Actual: **3/5 successful, 0 failed**: M1 WAL page, M2 supplied Backup API page, M3 official Online Backup API reference.
- Worker A1 retrieval allowance: 5. Actual: **2/5 successful, 0 failed**, recorded in its owned stream.

## Direct-research notes

### M1 - Write-Ahead Logging (official SQLite documentation)
- **URL/title:** https://www.sqlite.org/wal.html - *Write-Ahead Logging*.
- **Inspected support:** §1 states: “All processes using a database must be on the same host computer; WAL does not work over a network filesystem.” It attributes this to the required shared memory. §2.2 explains that the wal-index is shared memory and says that this is why WAL does not work on a network filesystem. The same section says there is only one WAL file, so only one writer at a time. This latter fact is a documented concurrency constraint, not used here as a performance comparison.
- **Copy qualification:** §4 says the WAL file is persistent state that must stay with the database if it is copied or moved; separation can lose committed transactions or corrupt the database. This does not document an unrestricted live raw-file-copy backup procedure.
- **Bounded interpretation:** The explicit network-filesystem prohibition governs this deployment decision. The page's separate single-process/EXCLUSIVE-locking discussion for VFSes lacking shared memory is not presented as a network-filesystem deployment exemption.

### M2 - SQLite Backup API (official SQLite documentation)
- **URL/title:** https://www.sqlite.org/backup.html - *SQLite Backup API*.
- **Inspected support:** §1 says an incremental Online Backup API copy locks the source only for brief periods actually reading it, allowing users to continue “without excessive delays”; a **completed** call sequence makes the destination a bit-wise identical snapshot of the source at copying commencement. §3.1 says writer activity during waits can restart the copy and frequent restarts can prevent it completing. §1.1 names `VACUUM INTO` and `sqlite3_rsync` as other live-backup techniques.
- **Alternative qualification:** The historical shared-lock plus external-copy procedure blocks writers until the lock is released and can leave a backup corrupted after power/OS failure during copying. It is not the right documented pattern for the specified writer-continuation objective.

### M3 - Online Backup API (official SQLite C API reference)
- **URL/title:** https://www.sqlite.org/c3ref/backup_finish.html - *Online Backup API.*
- **Inspected support:** The reference says a backup keeps a write transaction open on the destination for the operation, while the source is read-locked only while read. Its first `sqlite3_backup_step()` takes an exclusive destination lock, retained until `sqlite3_backup_finish()` or `SQLITE_DONE`; each step has a source shared lock only for the call. `SQLITE_BUSY` and `SQLITE_LOCKED` may be retried; `IOERR_XXX`, `NOMEM`, and `READONLY` are fatal. A completed copy is signalled by `SQLITE_DONE`; if `finish()` happens first, the destination transaction is rolled back, and `finish()==SQLITE_OK` alone does not prove completion.
- **Handle/destination qualification:** source and destination handles must differ; destination must not be used between init and finish, and shared-cache use of the destination file must be excluded in-process. If the destination itself uses WAL and source/destination page sizes differ, `step()` can return `SQLITE_READONLY`. This is a destination caveat, not a WAL-source rule.

## Cross-stream verification decisions

- Read all of [A1's stream](streams/online-backup.md), including evidence, alternatives, and gaps. Its two official sources were the supplied Backup API page and M3.
- Retained: incremental source locking, restart/starvation, writer-continuation qualification, destination reservation, `SQLITE_DONE` completion, retry/fatal distinction, and named alternatives. Main independently retrieved M2 and M3 and confirmed each material claim against the original text.
- Qualified: “writers continue” means brief source locks and retry/restart behavior, not nonblocking or guaranteed completion. The sources do not provide a WAL-source-specific online-backup rule beyond the WAL-file-copy qualification in M1; do not manufacture one.

## Unresolved disagreements, limitations, and stop reason

- No material contradiction was found between the supplied pages and the API reference.
- This is documentation evidence, not a test of the service, its SQLite version/VFS, network filesystem, backup destination, restores, durability settings, or operational recovery procedure.
- Detailed constraints of `VACUUM INTO` and `sqlite3_rsync` were not retrieved because the supplied page only needed to establish their availability as documented alternatives and this answer does not recommend one over another.
- Research stopped after direct primary-source support covered every required question; both Main and worker stayed within their independent five-retrieval caps.
