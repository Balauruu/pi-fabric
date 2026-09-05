# Execution lifecycle

## States

1. Validate the exact `{specPath, outputDirectory}` request and strict resolved spec before output mutation.
2. Copy declared task, instruction, calibration, and analysis inputs; save the resolved spec and deterministic schedule.
3. Check only capabilities selected by the run. Human grading without a configured label channel and unenforceable recursive hard caps are `unsupported` before scored dispatch.
4. Acquire one exclusive local invocation lock with a bounded admitted-call counter.
5. Reconstruct state from schedule and create-only records. Treat `checkpoint.json` only as a cache.
6. Publish `assignment.json`, dispatch once, then publish `result.json` and deterministic terminal or frozen grading work.
7. Close the one-call invocation window. On checkpoint, repeat the identical fixed guest in a fresh invocation until complete or a wall-time/global budget boundary is reached.
8. Reconcile exact attempt and grade IDs, run analysis, publish `report.md`, then authoritative `report.json`.

## Resume rules

- An unassigned planned ID is pending and may be admitted.
- Assignment plus no complete result is ambiguous. Return `blocked`; never guess that the external call did not run.
- Complete result plus no terminal/grade projection is recoverable with deterministic local work and no new model call.
- Complete terminal is immutable and is not dispatched again.
- Retries use linked new IDs and preserve the failed parent. Retry and first-attempt estimands stay distinct.
- A stale lock may be removed only through explicit stale-lock handling. Removing it never changes an assigned ID into pending work.
- Repeating a completed request verifies and returns the saved result with zero dispatch.

## Budgets

Execute the exact fixed guest in a fresh, dedicated `fabric_exec` invocation with `agentBudget: 1`. Its own configured allowance and source control flow admit at most one native call. This is not discovery of the host maximum or permission to reuse an unknown shared remainder. Do not embed it after other calls. A checkpoint requires a new identical invocation.

The local lifecycle additionally takes the minimum requested, configured, usable, and 100-call conservative ceiling; larger injected-test windows do not establish native availability. Measured, retry, judge, and adjudicator calls share the global direct-call limit. Admission is charged before launch. Recursive descendants remain separate observed usage unless the runtime provides the selected hard tree cap. Cost and token totals are observational unless the backend proves pre-consumption enforcement.

## Task-specific setup, reset and readiness

Declared task inputs are copied, not linked, into `attempts/<id>/workspace/` for every attempt. With optional `taskState`, the lifecycle executes non-null `setupCommand`, `resetCommand` and required `verifyCommand` as Bash commands in that workspace, in that order. Retries receive new workspaces and repeat the same declared preparation. This verifies readiness, not final task success; ordinary grading still judges the outcome.

Commands receive `BENCHMARK_TASK_ID`, `BENCHMARK_CONDITION_ID`, `BENCHMARK_ATTEMPT_ID`, `BENCHMARK_WORKSPACE` and JSON `BENCHMARK_INPUT_PATHS`. Evidence is retained in `task-state.json` and `task-state-{setup,reset,verify}.{stdout,stderr}` beside the assignment. Each command is bounded by the saved `maxWallTimeSeconds`; that does not turn the overall agent/analysis duration into a hard limit.

State-dependent attempts run serially in saved schedule order because their commands may reset shared task resources. A contradictory caller `cwd`/worktree override is refused. Failed input preparation or readiness emits a terminal infrastructure failure and an explicit invalidation; it is never replayed as an unstarted success. Text-only comparisons have no mandatory setup/reset gate.

`mechanismObservation` currently has no executable observer and is unsupported before assignment. A schema entry or native log alone does not establish mechanism exposure.

## Failure retention

Timeout, cancellation, agent failure, infrastructure failure, evaluator failure, and unresolved assignment are distinct. Preserve the complete JSON-compatible native Fabric return. Archive an available absolute native log beside its work record by streaming it locally; otherwise record why it is unavailable. Missing data and malformed grades never become zeros or successful completions.
