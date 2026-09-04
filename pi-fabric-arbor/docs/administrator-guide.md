# Administrator operations guide

This guide covers durable local operation. It does not widen the certified platform or authorize remote Web access, autonomous execution, or publication to user refs.

## Runtime layout and permissions

Use separate absolute roots owned by the service user. Suggested layout:

```text
/var/lib/pi-fabric-arbor/authority.sqlite3
/var/lib/pi-fabric-arbor/artifacts/
/var/lib/pi-fabric-arbor/reports/
/var/lib/pi-fabric-arbor/private-git/
/var/lib/pi-fabric-arbor/held-out/       # evaluator only
/var/lib/pi-fabric-arbor/operator-keys/  # mode 0700, key files 0600
/etc/pi-fabric-arbor/trusted-principals.json  # mode 0600
/var/backups/pi-fabric-arbor/
```

Do not place key, principal, held-out, or private Git roots below a Web/static/report root. Keep parent directories owner-only. The Web bind is exactly `127.0.0.1` or `::1`; remote access is unsupported.

## Supervised component configuration

In a trusted project `.pi/fabric.json`, configure detached Web with absolute production paths:

```json
{
  "configVersion": 1,
  "components": [
    {
      "id": "arbor-web-local",
      "component": "arbor-web",
      "config": {
        "version": 1,
        "enabled": true,
        "database": "/var/lib/pi-fabric-arbor/authority.sqlite3",
        "artifactRoot": "/var/lib/pi-fabric-arbor/artifacts",
        "host": "127.0.0.1",
        "port": 0,
        "gitOidLength": 40
      }
    },
    {
      "id": "arbor-runtime-local",
      "component": "arbor-runtime",
      "config": { "version": 1, "enabled": true }
    }
  ]
}
```

Omit `bootstrapToken` so the server generates one. If direct CLI use is necessary, `PI_FABRIC_ARBOR_DATABASE` is the only alternative for the Web database. Authorization additionally requires:

```text
PI_FABRIC_ARBOR_DATABASE
PI_FABRIC_ARBOR_STATE_ROOT
PI_FABRIC_ARBOR_PRIVATE_GIT_DIR
PI_FABRIC_ARBOR_TRUSTED_PRINCIPALS
PI_FABRIC_ARBOR_KEY_ROOT
PI_FABRIC_ARBOR_HELD_OUT_CERTIFICATE_DIGEST
PI_FABRIC_ARBOR_GIT_OID_LENGTH=40|64
```

Production composition also binds the package root, exact local and host `pi-fabric` roots, repository/workspace/report/artifact/held-out roots, evaluator executable, dispatch policy, package-issued fingerprint wrappers, and B9 Fabric-policy authority. A caller boolean cannot select production.

## Admission and certified 0.77 behavior

Before starting work, run the package's current verification sequence and inspect every blocker. Production requires exact valid B0-B12, Phase 4-7, release, platform, package inventory, executing entrypoint, source/tool, configuration, adapter, and host bindings.

The retained compatibility scope is the exact finite set `pi-fabric@0.76.2 || pi-fabric@0.77.0`. The sibling host currently reports the separately certified `0.77.0`; with the current complete artifact chain, an opaque production admission is issued and both `productionCertified` and `realAgentsEnabled` are true. Any other version, payload drift, or dependent-certificate mismatch remains fail-closed and exposes only the verifier's blockers. Do not substitute host roots, edit lockfiles, copy another release's artifacts, or regenerate only one dependent certificate to force admission.

## Migration, backup, and restore

`SqliteRunStore.open()` reads `PRAGMA user_version`, validates every recorded migration checksum, and applies missing migrations one transaction at a time. Before migrating a nonempty older database, it performs a full WAL checkpoint and creates `<database>.v<old-version>.backup` unless a trusted embedding supplies another backup path. A newer schema opens read-only and rejects mutations.

Upgrade procedure:

1. Stop `arbor-runtime`, `arbor-web`, authorization commands, and every process that can open the authority.
2. Record package/tarball digest, current schema version, database owner/mode, and the relevant certificate set.
3. Create an independent SQLite backup. Prefer SQLite's online `.backup` facility while the database is quiescent. Do not copy only the main file while `-wal` or `-shm` files are active.
4. Back up report, artifact, private Git, certificate, trusted-principal, and encrypted/offline key roots separately. Record SHA-256 inventories and modes.
5. Install the reviewed package and open the database once. Preserve any automatic `.vN.backup`.
6. Run integrity, replay/projection, report-manifest, artifact-digest, and certificate checks before enabling drivers.

Restore procedure:

1. Stop all Arbor processes and quarantine the failed database plus its WAL/SHM files without modifying them.
2. Restore to a new owner-only path, never over the only backup. Restore associated reports/artifacts/private repository and verify their recorded inventories.
3. Open with the same package version that created the backup. Confirm schema/migration checks, then upgrade deliberately if needed.
4. Reconcile every intended/observing external effect and every winner-ref journal before allowing a driver. Never infer absence from a restart.
5. Start detached Web first for inspection, then enable runtime only after admission and consistency checks pass.

## Recovery and quarantine

- `COMPLETED`: accept only an identity/fence/revision-bound terminal observation with a matching outcome digest.
- `ACTIVE`: resume monitoring of the same owned containment identity. Do not spawn another child.
- `ABSENT`: the old effect becomes `FAILED_ABSENT`; retry requires a newly journaled effect and, for workers, a new attempt.
- `UNCERTAIN`: retain evidence and stop replay. Resolve externally before any new work.
- Fingerprint mismatch, unobservable ref state, schema corruption, containment loss, or contradictory evidence enters `INDETERMINATE` or `QUARANTINED`.

In quarantine, stop drivers and cleanup, preserve database/WAL/SHM, reports, artifacts, fingerprints, process/cgroup identity, Git refs/reflogs, certificates, host/tool versions, and bounded logs. Do not signal an unverified PID, rewrite a winner ref, delete a workspace, or mark an effect absent. Recovery must produce new evidence and a new report; it must not edit history.

## Authorization, rollback, and re-promotion

1. Configure trusted owner-UID principals and Ed25519 keys outside browser/report roots.
2. Let Web append only a promotion or rollback request.
3. On the owner TTY, inspect the bounded frozen challenge and run:

```sh
pi-fabric-arbor authorize promotion --challenge <opaque-id>
# or
pi-fabric-arbor authorize rollback --challenge <opaque-id>
```

4. Type `yes` only after checking run, repository, candidate, merge OID, winner ref, predecessor, certificate, and expiry.
5. Require a separate Fabric write-policy traversal immediately before exact-OID CAS.
6. Observe the actual ref after CAS. A crash after CAS is reconciled from the ref and journal, never guessed.

Rollback changes only the package winner ref from the exact promoted OID to its journaled predecessor. Re-promotion requires a newly constructed candidate comparison, fresh held-out evidence, a fresh one-time local authorization, a fresh Fabric policy traversal, CAS observation, and report publication. Expired, denied, consumed, revoked, UID-mismatched, or invalid signatures cause no ref movement.

## Reports, export, retention, and cleanup

Every settled, partial, failed, cancelled, rolled-back, quarantined, or indeterminate outcome has report debt. Export only an immutable published generation whose `manifest.v1.json` verifies every file digest. Export the complete generation, its evaluator/fingerprint/authorization/promotion indexes, and the relevant public certificates. A SQLite `.backup` is an authority backup, not a public report export.

Retention is outcome-specific and legal hold always wins. Standard minimums are 365 days for no-promotion/failure, 2555 days for promoted/rolled-back, 90 days for cancelled, and indefinite for pending/indeterminate/quarantined. See [retention-policy.md](retention-policy.md).

Cleanup is manifest-only. Require owner/root identity, digest, mount, containment, symlink and overlap checks; settled effects; a published complete report covering every dependency; and retention eligibility. Delete only listed package-owned resources. Preserve authority journals, published report manifests, certificate digests, fingerprint evidence, authorization history, unresolved effects, and rollback/re-promotion dependencies. Cleanup failure remains durable cleanup debt and itself creates new report debt.

## Troubleshooting

| Symptom | Required response |
|---|---|
| `Unknown command` | Use `pi-fabric-arbor --help`; unknown commands exit 2 and print exact usage. |
| `UNAUTHENTICATED` | Reopen a fresh one-time loopback bootstrap URL. Do not move its token into a query string or log. |
| `BOOTSTRAP_ALREADY_USED` | Restart Web to rotate the one-time token. |
| `HOST_REJECTED` / `ORIGIN_REJECTED` / `CSRF_REJECTED` | Use the exact emitted loopback origin. Do not proxy or weaken checks. |
| Web says data may be stale | Use **Retry connection and refresh data**. Keep intent submission disabled until authoritative catch-up. |
| SSE `reset` | Replace local projection with the reset snapshot and cursor. Do not merge stale browser state. |
| `READ_ONLY_NEWER_SCHEMA` | Use a package supporting that schema or restore a compatible copy. Never downgrade in place. |
| `MIGRATION_FAILED` / checksum mismatch | Stop, preserve files, restore the pre-migration backup, and investigate package/version drift. |
| production blocked on pi-fabric | Inspect the exact blocker. Only matching retained `0.76.2` or `0.77.0` payloads are supported; recertify the complete dependent chain after any drift. |
| `INDETERMINATE` / `QUARANTINED` | Stop replay and cleanup; preserve and reconcile evidence. |
| report publication failed | Preserve the incomplete generation, reconcile the frozen manifest, republish immutably, then observe it. |
| cleanup denied | Resolve report coverage, retention, legal hold, identity, mount, symlink, or unsettled-effect reason. Never force-delete. |
