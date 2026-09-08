# Evaluation research - SQLite WAL deployment and online backup

## Answer and scope

For a small service, SQLite's official WAL documentation is explicit: **do not deploy a WAL database over a network filesystem.** The page says all database processes must be on the same host and that “WAL does not work over a network filesystem,” because WAL's wal-index requires shared memory ([WAL documentation, §§1 and 2.2](https://www.sqlite.org/wal.html); fuller note: [RESEARCH.md §M1](RESEARCH.md#m1---write-ahead-logging-official-sqlite-documentation)). This is a deployment constraint, not a measured-performance claim.

For a live database, the official mechanism designed for online backup is the **Online Backup API**, normally driven incrementally. It permits source writes to continue subject to short source-lock intervals, lock handling, possible restart, and no guarantee of completion under sufficiently frequent writes. A completed operation produces a documented consistent snapshot. The backup destination, however, is reserved for the operation ([Backup API](https://www.sqlite.org/backup.html), §1 and §3.1; [Online Backup API reference](https://www.sqlite.org/c3ref/backup_finish.html)).

## Deployment constraint: WAL and a network filesystem

- WAL relies on a shared-memory wal-index. SQLite explains that readers in separate processes use it to locate WAL content and says that this shared-memory requirement is why WAL will not work on a network filesystem.
- Therefore, putting the active WAL database on NFS, SMB, or another network filesystem is outside the documented WAL deployment model. The supporting statement is categorical; this report does not infer safety from a particular filesystem's behavior or from an untested single-service topology.
- A WAL database is not only its main database file while it is active: the `-wal` file is persistent state and must be retained with the database if copied or moved. Separating it can lose committed transactions or corrupt the database. That fact does **not** turn an unconstrained raw copy during live writes into a documented safe online-backup method.

## Safe online-backup approaches and constraints while writes continue

### 1. Online Backup API: the documented live-source mechanism

Use the `sqlite3_backup_init()` → one-or-more `sqlite3_backup_step()` → `sqlite3_backup_finish()` sequence. For the writer-continuation objective, the documented running-database pattern copies a bounded number of pages per step and releases the source lock between steps rather than calling `step(..., -1)` for the whole copy.

What the documentation establishes:

- **Source behavior:** An incremental copy holds the source read lock only while a step reads. SQLite says this lets other users continue without excessive delays; it does not say writes are lock-free or guaranteed never to contend. A single all-pages step holds the source read lock for the duration and prevents other users from writing.
- **Consistency:** When the backup operation is completed, the destination is a bit-wise identical snapshot of the source as copying commenced. The running-database discussion further says that a completed backup remains a consistent, up-to-date snapshot even if writes caused restarts.
- **Writes and restart:** A source change through another connection/process normally restarts on the next step. A file-source write using the same source handle in the same process is the stated exception: SQLite updates the destination too and can continue. Writes from other connections/processes, or to an in-memory source, require a full restart. Frequent restarts can mean the backup never completes.
- **Lock errors and completion:** `SQLITE_BUSY` and `SQLITE_LOCKED` are retryable later; configure/handle locking accordingly. Completion means a step returns `SQLITE_DONE`, followed by `finish()` for cleanup. If `finish()` occurs before `SQLITE_DONE`, SQLite rolls back the destination transaction; `finish()==SQLITE_OK` alone is not proof that the copy completed.
- **Destination behavior:** The backup holds a destination write transaction for its duration; the first step takes an exclusive destination lock until `finish()` or `SQLITE_DONE`. The destination connection must not be used between init and finish. In shared-cache mode, no in-process connection may access that destination file while the backup runs.

These are API semantics and documented concurrency conditions, not a throughput ranking. See the full owned evidence and alternatives in [streams/online-backup.md](streams/online-backup.md).

### 2. Other documented live-backup techniques

The official Backup API page lists two other ways to create a live-database copy:

- `VACUUM INTO`, which makes a vacuumed copy into a separate file.
- `sqlite3_rsync`, which copies a live database to or from a remote system over SSH.

The inspected pages establish their availability as alternatives, but this research did not retrieve their detailed locking, operational, or WAL-specific constraints. They should not be treated here as interchangeable with the Online Backup API.

### 3. Approaches not meeting the stated writer-continuation goal

The historical procedure of taking a shared lock and externally copying the file makes writers wait until the lock is released. SQLite also warns that a power or operating-system failure while that copy is in progress can leave the backup corrupted after recovery. The WAL page's `-wal`-file requirement adds a separate reason not to reduce an active WAL backup to copying only the main database file.

## Conclusions

1. **Deployment:** Use WAL only with the active database on storage local to its host, not on a network filesystem. This is SQLite's explicit documented constraint.
2. **Online backup under writes:** Use the incremental Online Backup API if the service needs writes to be able to continue. Design the loop for short source-lock intervals, retryable `BUSY`/`LOCKED`, restarts, and the possibility that sustained writes prevent a completed backup.
3. **Backup acceptance:** Treat a backup as complete only after `sqlite3_backup_step()` returns `SQLITE_DONE` and cleanup runs; reserve the destination for the operation. Do not infer success from `finish()==SQLITE_OK` alone.
4. **Alternatives:** `VACUUM INTO` and `sqlite3_rsync` are officially named alternatives, but their details were intentionally not ranked or generalized here.

## Limitations and coverage

This is an official-documentation synthesis, not a performance test or a deployment validation. It does not establish behavior of a particular NFS/SMB implementation, VFS, SQLite version, destination filesystem, restore process, retention plan, or recovery test. It also does not supply detailed operational constraints for the named alternatives. One worker investigated the online-backup uncertainty; Main independently verified all decisive backup claims against the supplied Backup API page and the linked official API reference.

**Coverage and stop reason:** Main inspected `wal.html`, `backup.html`, and the linked official API reference. The single worker inspected `backup.html` and that reference, with its full notes retained at [streams/online-backup.md](streams/online-backup.md). Main used 3/5 retrievals and the worker used 2/5, with no failures. The supplied primary documentation directly covered the required questions, so research stopped without extra retrievals.

**Sources:** [WAL documentation](https://www.sqlite.org/wal.html) · [SQLite Backup API](https://www.sqlite.org/backup.html) · [Online Backup API reference](https://www.sqlite.org/c3ref/backup_finish.html) · [research record](RESEARCH.md)
