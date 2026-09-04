# Retention and deletion policy

The release policy is encoded in `src/retention/policy.ts`, exposed by `arbor inspect --view resources`, included in complete reports, and certified by `certification/phase6/retention-b12.v1.json`. The policy digest must match across all four surfaces.

## Classes

| Class | Successful terminal outcomes | Failure and cancellation | Uncertain or quarantined | Pending |
|---|---:|---:|---:|---:|
| `retain_fixture` | 0 days | 0 days | indefinite | indefinite |
| `retain_ephemeral_v1` | 7 days | 14 days | indefinite | indefinite |
| `retain_standard_v1` | 90 days | 180 days | indefinite | indefinite |
| `retain_regulated_v1` | 2,555 days | 2,555 days | indefinite | indefinite |

Successful terminal outcomes are `NO_PROMOTION`, `PROMOTED`, and `ROLLED_BACK`. The implementation has an explicit rule for all seven terminal outcomes plus `PENDING`; no default or substring classification exists.

## Preconditions for deletion

A duration becoming eligible is necessary but not sufficient. Deletion remains prohibited unless:

1. no legal hold applies;
2. the outcome has a finite rule and the exact minimum duration has elapsed from `updatedAt`;
3. cleanup uses an owner-only, digest-bound `CleanupManifestV1` below the configured package root;
4. reporting is complete and the report manifest is verified;
5. the target is not an authority database, event/outbox journal, report generation, promotion/rollback/authorization record, held-out evidence, fingerprint/compatibility certificate, private Git directory, key root, or cleanup manifest;
6. symlink, root identity, mount/device, overlap, type, size, and digest checks all pass immediately before deletion.

A legal hold always returns `legal-hold`; it has no time-based escape. `INDETERMINATE`, `QUARANTINED`, and `PENDING` are indefinite under every release class. Unknown classes fail closed.

## Minimum retained evidence

Finite deletion rules retain the contract, event/outbox journal, complete report manifest and generation, cleanup audit, evaluation and compatibility certificates, and any applicable promotion, rollback, authorization, held-out, recovery, or fingerprint evidence. Cleanup deletes only resources explicitly named in a manifest. It never deletes these retained evidence classes.

Regenerate B12 after any policy/source change:

```sh
npm run certify:retention
npm run verify:retention
```
