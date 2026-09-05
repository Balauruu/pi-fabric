# Architecture

The public surface is intentionally small:

- `workflows/benchmark.ts` is the only Fabric guest and accepts one JSON string in `π.request`.
- `scripts/run.py run` exposes the injectable local runner for tests; its internal subcommands are used only by the fixed guest.
- `scripts/run.py report` is a zero-dispatch, read-only inspector.
- `schemas/spec.schema.json` and `schemas/result.schema.json` are the public machine contracts.

`lifecycle_store.py` owns strict request/spec checks, frozen input copies, schedule publication, the exclusive local lock, bounded admission, create-only attempt/grade records, conservative reconciliation, dataset assembly, and final report publication. It delegates scientific work through dictionary interfaces to `generate_schedule.py`, `grade.py`, `aggregate_telemetry.py`, and `analyze_paired.py`. `analysis_engine.py`, `statistical_core.py`, and `analysis_models.py` own the numerical implementation.

The guest has no scientific policy. Each fresh, dedicated `fabric_exec` invocation is configured with `agentBudget: 1` and asks Python for at most one admitted call. It maps that request to public `agents.run`, publishes the complete native result, then closes the exhausted window through the same lifecycle. A checkpoint resumes only in a new identical invocation, never a guest loop that assumes an unknown shared remainder. Measured, retry, judge, and adjudicator calls share this path and the global direct-call budget.

## File authority

A run directory contains resolved `spec.json`, `schedule.json`, task-facing `inputs/`, create-only `attempts/`, optional create-only `grading/jobs/`, individual grade records, `analysis.json`, `telemetry.json`, `report.md`, and authoritative `report.json`. `checkpoint.json` and the lock are replaceable operational state. No database, seal chain, software identity, protected-state scan, component registration, or generated bundle is part of this architecture.

Assignment is published before dispatch. Result is published before terminal. A surviving assignment without a complete result is ambiguous and is never automatically replayed. A complete result without a terminal is recoverable by deterministic local work. Finalization requires exact planned IDs and refuses extras, contradictions, partial records, and missing required grade jobs.

## Dependencies

Core reporting and saved-record inspection use the standard library. Numerical libraries are imported only by analysis. PyMC/ArviZ are imported only when a selected Bayesian method needs them. All dependencies live in the skill-local `.venv`; no runtime version label controls admission. Selected behavior and request fields control capability checks.
