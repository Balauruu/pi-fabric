# Evaluation research - SQLite online backup while writers continue

## Question, scope and status

**Evaluation research.**

**Question.** What safe online-backup approaches does official SQLite documentation describe while writes continue, and what mechanisms, snapshot/consistency, concurrency/locking, incremental-operation, and alternative/caution constraints apply?

**Scope.** Official SQLite documentation only. Primary source: <https://www.sqlite.org/backup.html>, retrieved in this research run. A narrow official API-reference link from that page remains under inspection because the primary page expressly says its examples are no substitute for API documentation. Excludes benchmarks, throughput/performance rankings, and deployment recommendations.

**Status.** Both the supplied official page and its material official API-reference qualification are inspected. Retrieval invocation counter: **2/5**. Errors: none. Stop condition met: the supplied page and its material qualifications have been inspected. No parent-level recommendation is made here.

## Findings and analysis

### Documented facts from the supplied page

1. **Online Backup API is the documented live-backup mechanism.** It copies one database into another database file, replacing the target's original contents. Its copy may be incremental: the source need be locked only during brief actual reads, not throughout the copy. SQLite says this lets other database users continue without *excessive delays* while an online database is backed up. This is a concurrency qualification, not a promise that writes can never wait or fail to contend.

2. **Completed backup consistency/snapshot claim.** SQLite says the completed destination is a bit-wise identical copy of the source *as it was when copying commenced* and calls it a snapshot. For the running-database example, it separately says that, whether writes cause a restart or not, a completed backup contains a “consistent and up-to-date snapshot of the original.” These are official documented outcomes contingent on completion.

3. **Incremental practical pattern.** The running-database example uses `sqlite3_backup_init()`, repeatedly calls `sqlite3_backup_step(..., 5)`, waits 250 ms after `SQLITE_OK`, `SQLITE_BUSY`, or `SQLITE_LOCKED`, then calls `sqlite3_backup_finish()`. During the wait no source read lock or source-handle mutex is held, allowing other threads to use that connection and other connections to write. The five-page/250-ms values are example settings, not documentation of a required or optimal configuration.

4. **Writes during an incremental backup can restart it.** A source write while the example is sleeping normally makes SQLite restart on the next `sqlite3_backup_step()`. Narrow exception: with a non-memory source, a same-process write through the *same* source handle (`pDb`), SQLite automatically updates the destination too, so the backup can continue. Writes to an in-memory source, or to a file source through another process/thread and another connection, are documented as significantly more expensive because the entire backup restarts. Frequent restarts can prevent completion indefinitely.

5. **Lock contention/error handling remains part of correctness.** A backup step can fail immediately with `SQLITE_BUSY` if it cannot obtain a required file lock. SQLite's documented mitigation is to register a busy handler or timeout on the disk-file connection when it is opened; `sqlite3_backup_step()` then uses it as `sqlite3_step()`/`sqlite3_exec()` do. The example loop also explicitly treats `SQLITE_BUSY` and `SQLITE_LOCKED` as retryable states before calling `finish`; success must not be assumed from an unexamined call sequence.

6. **Avoid the one-step full copy for a writer-continuation goal.** The page contrasts `sqlite3_backup_step(..., -1)`, which holds a source read lock for the whole operation and prevents others from writing, with the background incremental approach. It also says the former holds the relevant connection mutex throughout, preventing other threads from using that connection.

7. **Officially named alternatives.** The page calls Online Backup API the original method for backups of live SQLite databases and names `VACUUM INTO` (vacuumed copy of a live database to a separate file) and `sqlite3_rsync` (copy live database to/from remote system using SSH). It also contrasts a historical shared-lock-plus-external-file-copy procedure: writers wait while the lock is held, it cannot copy to/from memory databases, and system/power failure while copying may leave the backup corrupted after recovery. The page supports this distinction; it does **not** characterize an unconstrained raw file copy during live writes as a safe equivalent.

### Additional documented API-level constraints (S2)

8. **Destination isolation and locking are explicit constraints.** SQLite holds a write transaction open on the destination file for the entire backup. The first `sqlite3_backup_step()` acquires an exclusive destination lock, released only by `sqlite3_backup_finish()` or completion with `SQLITE_DONE`. A live source can be read/written by other connections because each source shared lock lasts only for a `step` call, but the destination must be provisioned as unavailable for application use during the backup.

9. **Completion must be tracked by `SQLITE_DONE`, not `finish()`'s `SQLITE_OK` alone.** If `finish()` occurs before any `step()` returns `SQLITE_DONE`, SQLite rolls back the destination's active write transaction. Yet `sqlite3_backup_finish()` may return `SQLITE_OK` if no `step()` error occurred regardless of whether copying completed. Therefore the documented success condition for a usable completed backup includes observing `SQLITE_DONE`, then finishing cleanup. This is an API-semantics conclusion, not a recovery-test result.

10. **Retry and fatal paths differ.** `SQLITE_BUSY` (after a busy-handler cannot obtain a file lock) and `SQLITE_LOCKED` (source handle is being used to write) may be retried later. `SQLITE_IOERR_XXX`, `SQLITE_NOMEM`, and `SQLITE_READONLY` are fatal: the API says do not retry and pass the handle to `finish()` to release resources. The reference also identifies a WAL-specific *destination* caveat: `step()` might return `SQLITE_READONLY` if the destination is using WAL and destination/source page sizes differ. This is not a rule about a WAL **source** backup.

11. **Handle-use constraints.** Source connection use is allowed during backup; concurrent source-handle use from other threads is conditional on SQLite being compiled/configured for threadsafe connections. In contrast, the destination connection must not be passed to any API after `init()` and before `finish()`; SQLite says misuse may malfunction or deadlock without reporting an error. Under shared-cache mode, no connection in the process may access the destination's shared cache/disk file while backup runs. Progress APIs are not strictly threadsafe when called concurrently with `step()`.

### Bounded inference for the parent

For the narrow “writers continue” condition, the documented API pattern is an incremental `sqlite3_backup_step()` loop that releases its read lock and connection mutex between batches, with busy/locked handling and a completion condition. This is a direct synthesis of the supplied documentation, not a throughput claim. “Can continue” is bounded by brief read-lock intervals, lock contention, possible restarts, and the possibility that frequent writes prevent a completed backup.

The provided page does not state any WAL-specific rule in the retrieved material. Do not infer that WAL changes, removes, or supersedes these Online Backup API constraints without separate official support.

## Evidence and source notes

### S1 - SQLite Backup API (official documentation; primary source)

- **Original URL:** <https://www.sqlite.org/backup.html>
- **Title/type:** *SQLite Backup API* - official SQLite documentation (HTML)
- **Retrieved:** current research run; HTTP 200; page footer says last updated 2025-11-13 07:12:58Z.
- **Retrieval log:** invocation 1/5, `fetch_content` raw mode; no error.

**Decisive passages and locators, with qualifications:**

- **§1, `#using_the_sqlite_online_backup_api`:** “The copy operation may be done incrementally, in which case the source database does not need to be locked for the duration of the copy, only for the brief periods of time when it is actually being read from. This allows other database users to continue without excessive delays while a backup of an online database is made.” The immediately following paragraph says: “The effect of completing the backup call sequence is to make the destination a bit-wise identical copy of the source database as it was when the copying commenced. (The destination becomes a ‘snapshot.’)” Qualification: this describes a **completed** sequence and “without excessive delays,” not lock-free operation.

- **§1.1, `#other_backup_techniques`:** “The Online Backup API is the original method for making backups of a live SQLite databases.” It then names “The `VACUUM INTO` command [which] will make a vacuumed copy of a live SQLite database into a separate file” and “The `sqlite3_rsync` program [which] makes a copy of a live SQLite database to or from a remote system using an SSH connection.”

- **§1 historical technique, preceding the API description:** historical shared-lock plus external copy means “Any database clients wishing to write to the database file while a backup is being created must wait until the shared lock is relinquished”; also, power/OS failure during copying can leave the backup corrupted following recovery. This establishes the page's documented distinction from the Online Backup API.

- **§2.2, `#possible_enhancements`:** “when the call to `sqlite3_backup_step()` attempts to read from or write data to [the disk database], it may fail to obtain the required file lock. If this happens, this implementation will fail, returning `SQLITE_BUSY` immediately.” The documented solution is a busy-handler callback or timeout on `pFile`; `sqlite3_backup_step()` uses it if it cannot immediately obtain the required lock.

- **§3, `#example_2_online_backup_of_a_running_database`:** Example comment: “This function copies 5 database pages … then unlocks pDb and sleeps for 250 ms, then repeats … until the entire database is backed up.” It also says another thread may use `pDb`, or another process may access the underlying database via a separate connection. The loop calls `sqlite3_backup_step(pBackup, 5)` and sleeps/retries for `SQLITE_OK`, `SQLITE_BUSY`, or `SQLITE_LOCKED`.

- **§3 introductory text:** A single `sqlite3_backup_step(..., -1)` “requires holding a read-lock on the source database file for the duration of the operation, preventing any other database user from writing”; it also holds the connection mutex throughout. The running-database function is explicitly designed for a background thread/process to avoid those problems.

- **§3.1, `#file_and_database_connection_locking`:** “During the 250 ms sleep … no read-lock is held … and the mutex associated with pDb is not held. This allows other threads to use database connection pDb and other connections to write to the underlying database file.” If a writer changes the source while sleeping, “SQLite detects this and usually restarts the backup process” at the next step. Exception: non-memory source, same process, same `pDb`; destination is automatically updated and backup may continue. Qualification: writes through another connection/process or to memory source require whole-operation restart and are “significantly more expensive”; frequent restarts may mean it never completes/returns.

- **§3.1 completed-result qualifier:** “Whether or not the backup process is restarted as a result of writes to the source database mid-backup, the user can be sure that when the backup operation is completed the backup database contains a consistent and up-to-date snapshot of the original.”

- **§3.2, `#backup_remaining_and_backup_pagecount_`:** progress values are from the *previous* `sqlite3_backup_step()` and do not inspect the source. A write after the step but before use can make them “technically incorrect”; SQLite says this is not usually a problem. Treat these APIs as progress reporting, not a transactional validation signal.

### S2 - Online Backup API (official C API reference; material linked qualification)

- **Original URL:** <https://www.sqlite.org/c3ref/backup_finish.html>
- **Title/type:** *Online Backup API.* - official SQLite C API reference (HTML)
- **Retrieved:** current research run; HTTP 200.
- **Retrieval log:** invocation 2/5, `fetch_content` raw mode; no error.

**Decisive passages and locators, with qualifications:**

- **Opening overview, before `sqlite3_backup_init()`:** “SQLite holds a write transaction open on the destination database file for the duration of the backup operation. The source database is read-locked only while it is being read; it is not locked continuously for the entire backup operation. Thus, the backup may be performed on a live source database without preventing other database connections from reading or writing to the source database while the backup is underway.” Qualification: this concurrently constrains the **destination**, despite source writer continuation.

- **Procedure overview:** exactly one `sqlite3_backup_finish()` should follow each successful `sqlite3_backup_init()`.

- **`sqlite3_backup_init()` section:** source and destination connections must differ; `init()` returns NULL if the destination already has a read or read-write transaction.

- **`sqlite3_backup_step()` section:** negative N copies all remaining pages; `SQLITE_DONE` means all pages copied, while `SQLITE_OK` means N pages copied but work remains. `BUSY` and `LOCKED` can be retried later; `IOERR_XXX`, `NOMEM`, and `READONLY` are fatal and require `finish()` for release. A documented `READONLY` case is a WAL **destination** with different source/destination page sizes.

- **`sqlite3_backup_step()` locking paragraph:** first `step()` takes an exclusive destination lock until `finish()` or `SQLITE_DONE`; every `step()` takes a source shared lock only for the call. External/other-connection source changes automatically restart next `step()`; same-source-connection changes automatically update the destination.

- **`sqlite3_backup_finish()` section:** if no prior `step()` returned `SQLITE_DONE`, active destination write work is rolled back. It returns `SQLITE_OK` if no `step()` error occurred “regardless of whether or not sqlite3_backup_step() completed.” Therefore the return from `finish()` alone is not a completion signal.

- **Concurrent Usage of Database Handles:** source connection can be used for other purposes; concurrent other-thread source use is conditional on threadsafe connection support. Destination connection must not be passed to any API between `init()` and `finish()`; SQLite does not check misuse, operations may malfunction, and a mutex deadlock is possible. In shared-cache mode, no in-process connection may access the destination file's shared cache while backup runs.

- **Alternatives To Using the Backup API:** this reference calls `VACUUM INTO` and `sqlite3_rsync` “Other techniques for safely creating a consistent backup.” Detailed alternative constraints were not fetched because the stop condition was met.

## Counterevidence and alternatives

- The page's “other database users … continue” language is qualified: incremental copying takes brief source read locks. It is not evidence that writer latency, availability, or completion is guaranteed.
- The page explicitly says repeated source writes can restart the backup often enough that it never returns. Any statement that online backup always completes under continuous writes would conflict with S1.
- The S1 `-1` example is a valid API use but conflicts with the specific objective of allowing writers to continue, because the page says it holds the source read lock for the entire operation.
- `VACUUM INTO` and `sqlite3_rsync` are documented live-backup alternatives, but S1 alone does not supply their detailed locking, durability, destination, or WAL-specific constraints. They cannot be treated as mechanically interchangeable here.
- No WAL-specific semantics were found in the supplied page. S2 adds only a narrow WAL **destination** page-size mismatch condition that can yield `SQLITE_READONLY`; it is not evidence about WAL source behavior. This dossier stream must not turn general Online Backup API documentation into a WAL implementation claim.
- Source-writer continuation does not imply destination availability: S2 requires the destination connection to be unused for the entire operation and holds its write transaction/exclusive lock until completion or cleanup.
- `sqlite3_backup_finish() == SQLITE_OK` alone is counterevidence to an overly simple success test, because S2 states it can be OK without completed `step()` copying; unfinished work is rolled back.

## Gaps, coverage and next checks

- **Coverage achieved:** S1 and the material S2 reference were retrieved and inspected. Together they document source/destination locking, writer continuation, snapshot/completion semantics, restarts/starvation, retry/fatal paths, destination isolation, progress limitations, and named alternatives.
- **Stop condition:** met. No additional official page was retrieved because the supplied page and its material API-reference qualifications resolve the owned uncertainty.
- **Remaining documented limits/unknowns:** source-version page/last-updated information was not exposed on S2; this does not affect its HTTP-200 official-source status. Neither source supplies WAL-source-specific rules, benchmarked behavior, a throughput ranking, restore validation procedure, retention policy, or deployment recommendation. Alternative-detail pages were intentionally not fetched.
- **Retrieval budget:** 2/5 used; errors: none.
