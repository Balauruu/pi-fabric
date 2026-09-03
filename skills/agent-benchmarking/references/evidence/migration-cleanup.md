# Migration and cleanup receipt

Date: 2026-09-02

## Preserved archive

Generated historical receipts and oversized runtime captures were moved, not deleted, from:

`skills/agent-benchmarking/validation/receipts`

to:

`skill-evaluations/agent-benchmarking/legacy-2026-09-02/validation/receipts`

Observed after the move:

- regular files: 58;
- archived directory bytes from `du -sb`: 2,819,367;
- source receipt path absent;
- destination created without replacing an existing path;
- sorted `sha256sum` stream digest at the destination: `a843475c46bc89ef301f1ad181c01687a5157b2ce28611ef45a7688d3400ed81`.

The archive includes prior deterministic/static receipts, runtime-canary receipts and evidence, raw Fabric captures, final-tree snapshots, integrity snapshots, and cleanup receipts. Test fixtures, including protected baselines and malformed binary fixtures, remain under `validation/fixtures`.

## Future policy

All newly generated receipts go to a new revisioned directory under `skill-evaluations/agent-benchmarking/`. Validation commands must refuse an existing destination. The distributable skill contains source, contracts, deterministic helpers, tests, and cataloged fixtures only.

## Historical migration

Earlier Pi/Herdr compatibility artifacts were removed only after their recorded validation and incoming-reference scan. No compatibility alias is reintroduced. The fixed stage runner is the sole supported execution entry; an unsupported capability blocks rather than triggering session-specific workflow creation.
