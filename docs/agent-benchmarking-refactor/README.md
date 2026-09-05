# Agent Benchmarking Refactor Plan

## 1. Decision and scope

**Status: implementation plan, not an implementation or a claim that its checks already pass.** This document completely replaces the previous platform-oriented refactor plan.

Build a **personal-use skill plus a local runner with a small interface and a full statistical-method framework**. Keep Fabric as the agent execution runtime. Do not make a Pi extension, Fabric component, provider catalog, environment manager, or distribution package a prerequisite.

The skill handles experimental reasoning. The runner handles scheduling, execution records, grading, analysis, and reporting. Statistical sophistication belongs behind the small interface; it is not a reason to enlarge the operational interface.

### User-established requirements

- Personal use in the active Fabric profile. No publishing project, `dist/` directory, mandatory emitted-JavaScript build, release automation, or mandatory CI.
- No benchmark-imposed Pi or Fabric version minimums or pins. Use the installed runtime and check only the capabilities needed by the requested operation.
- Retain the **full statistical-method framework**, not just descriptive summaries or a simplified paired-average calculator.
- Remove the benchmark-specific **protection of secrets and unrelated files** feature: protected-root declarations, baseline/delta scans, protection receipts, secret scanning, and corresponding launch gates are not part of the new runner.
- Remove **software-identity safeguards**: no runner source-closure hashes, dependency-lock hashes, loader fingerprints, runtime-install fingerprints, or exact-software-match resume gates.
- Simplify coordination, state handling, grading setup, runtime integration, and migration rather than renaming the old machinery.
- Preserve useful results and existing uncommitted work during implementation. This is normal development practice, not a new benchmark subsystem.

### What remains fixed, and why

“Software identity” in the previous plan meant proving exactly which implementation and runtime bytes produced a run. That machinery and the benchmark's runtime-version admission checks are removed. Runtime version strings may appear in ordinary diagnostics, but their presence, format, or value is not an execution or resume gate. This does not override the underlying packages' own installation requirements.

The **experiment inputs** are different: task prompts, condition instructions, selected models and tools, grader rules, task weights, schedule, thresholds, and analysis choices define the comparison itself. Save their resolved values before scoring so the comparison does not change after results appear. This needs a configuration snapshot and local copies of task-facing inputs, not a chain of cryptographic seals.

Statistical method names and parameters also remain necessary. “Independent repetition-block randomization” and “task-vector sign flip” describe different mathematics, not fingerprints of the runner installation.

Removing benchmark-specific protection does not change Pi/Fabric's existing runtime behavior. This project neither reimplements nor disables that behavior.

### Explicit non-goals

- Generic credential, browser-account, database, service, tool-server, or network-policy management.
- A benchmark sandbox, filesystem security auditor, protected-state monitor, or secret manager.
- Multiple cooperating coordinators, distributed leases, fencing, automatic takeover, or crash recovery that guesses whether an agent call ran.
- Fabric component supervision, rolling provider generations, reload migration, quarantine orchestration, or a benchmark control plane.
- Multiple seal kinds, preflight authorization seals, chained revisions, source attestation, or a universal packet migration framework.
- A mandatory model-judge/adjudicator stage for objectively graded tasks.
- Actor/delegation instrumentation for benchmarks that do not study those mechanisms.
- A second model launcher or private imports into Fabric internals.
- A separate CLI, slash command, and provider catalog implementing the same orchestration rules.

## 2. Outcome and acceptance ledger

The primary use case is:

> Run the same task sample under two or more conditions, retain every attempt and its outcome, grade with the declared method, and produce a statistically defensible comparison under the declared design.

A completed execution is not necessarily a conclusive experiment. A report can correctly conclude `inconclusive` or `descriptive-only` after every scheduled attempt has finished.

| ID | Acceptance check | Decisive evidence |
| --- | --- | --- |
| A01 | The model follows a short skill and invokes one fixed runner, without inventing orchestration | Fresh-context design, run/resume, and report scenarios |
| A02 | Execution uses the required supported capabilities of the installed runtime, without version-based admission | Missing-capability tests, working capability fixtures with absent/malformed/different version labels, and a bounded live execution probe |
| A03 | One run/resume operation handles batching and checkpoints internally | End-to-end fake dispatch crossing the invocation call ceiling |
| A04 | Attempts are not overwritten, silently dropped, or automatically replayed after an ambiguous interruption | Production-path interruption and duplicate-invocation tests |
| A05 | Ordinary benchmarks need no protection manifest, environment inventory, software fingerprint, or component | Minimal text-task fixture runs with those inputs absent |
| A06 | Deterministic grading is the normal path; model grading and adjudication are conditional | Objective-only and optional blinded-judge fixtures |
| A07 | The full statistical framework is retained and its supported methods are implemented and tested | The method coverage matrix in section 10 |
| A08 | Randomization inference matches the actual assignment mechanism | Independent exhaustive small-schedule oracles, including the existing balanced generator |
| A09 | Missingness, failures, repeated tasks, multiplicity, optional stopping, and grader uncertainty are handled explicitly | Adversarial analysis fixtures and calibrated simulations |
| A10 | Reporting is read-only and requires no live model backend or runtime doctor | Run with execution unavailable; assert zero dispatch and no run-directory changes |
| A11 | Local source use needs no extension build, package publication, or component registration | Documented local invocation and no-build smoke |
| A12 | Old runs stay unchanged and the old/new execution paths are not both advertised as current | Cutover inspection, current skill pointers, and discovery checks |
| A13 | NumPy/SciPy/statsmodels supply the statistical core; PyMC/ArviZ are loaded only for selected model methods | Local dependency resolution, numerical reference fixtures, model diagnostics, and saved-report reading without optional backends |
| A14 | Files remain authoritative; no database is required for execution, resume, or analysis | End-to-end file-only fixture; optional SQL, if adopted, agrees with the validated Python dataset |

These are implementation acceptance checks. Do not run the whole validation suite as a prerequisite to each personal benchmark.

## 3. Architecture and source layout

Keep the existing skill directory as the local source home unless an actual loading constraint requires a move. A large code relocation is not part of the value proposition.

```text
skills/agent-benchmarking/
  SKILL.md                          # short decision and invocation guide
  README.md                         # setup, operation, implementation overview
  requirements.txt                  # NumPy, SciPy, statsmodels
  requirements-models.txt           # core plus PyMC/ArviZ, selected model methods
  references/
    protocol-design.md              # sample, estimand, decision, stopping
    conditions-and-mechanisms.md    # condition setup; conditional mechanisms
    grading.md                      # objective grading and optional judgment
    statistical-analysis.md         # full statistical-method contract
    operations.md                   # start, resume, inspect, common failures
    evidence/                       # retained research and historical failures
  workflows/
    benchmark.ts                    # small fixed Fabric guest entry
  scripts/
    run.py                          # local lifecycle and internal command bridge
    benchmark_lib.py                # shared parsing and record publication
    generate_schedule.py            # scheduling and randomization contracts
    grade.py                        # grader inputs, results, optional disputes
    analyze_paired.py               # paired estimands and statistical analysis
    analysis_models.py              # optional hierarchical/crossed-model methods
    aggregate_telemetry.py           # native usage projections and totals
  schemas/
    spec.schema.json                # caller's run specification
    result.schema.json              # public run/report result contract
  tests/
    ...                             # focused unit, integration, and fixture tests
```

This is a target responsibility map, not a requirement to create empty files or immediately rename every helper. Keep a proven helper where it is until its replacement is covered. Split a file when responsibilities actually diverge, not to satisfy a prescribed module count.

### Module ownership

| Module | Owns | Must not own |
| --- | --- | --- |
| Skill | Clarifying the decision, designing conditions and analysis, interpreting results | Model-authored schedules, record repair, duplicate statistical formulas |
| Runner | Frozen specification, pending work, bounded batches, interruption, completion | Statistical method selection based on favorable results |
| Record store | Configuration, assignments, native results, terminal publication, checkpoints | Protected-root scans, source closure, general migration machinery |
| Grading | Declared graders, blinded evidence where relevant, score construction, optional adjudication | A mandatory judge service or universal certification transaction |
| Analysis | Randomizer/estimator compatibility, inference, sensitivity, decision rules | Model calls, environment mutation, silently regrading outputs |
| Fabric dispatch | Mapping prepared requests to supported `agents.run` and retaining native returns | Experimental policy, a private model launcher, component lifecycle |

### Language policy

- Reuse the existing Python scheduling, analysis, and record mechanics where correct. Do not rewrite them in TypeScript merely for language uniformity.
- Keep the TypeScript guest entry focused on Fabric dispatch and the bounded execution loop. Move deterministic business rules out of the giant guest body.
- The local Python entry may expose internal commands used by the fixed guest. Those commands are implementation details, not extra workflow stages the model must orchestrate.
- Validate caller inputs at one authoritative seam. Do not generate multiple independently maintained versions of every schema across languages.
- Use the standard library for mechanics where practical. Statistical libraries are allowed where they avoid reimplementing mature numerical methods.
- Declare any statistical dependencies in a project-local environment. Never install into system Python. An optional model-based analysis backend is required only when that method is selected; ordinary paired methods should not need it. Load numerical backends lazily: basic inspection and reading an already-saved report must still work when an optional backend is unavailable.
- No `dist/` output. If the supported guest path still needs an assembled file temporarily, keep one reproducible guest artifact and its freshness check only until the small entry replaces it. That is not a compiled extension or a distribution pipeline.

### Adopted statistical stack

Adopt the researched small stack rather than leaving numerical backend selection open:

| Layer | Adopted dependency | Responsibility |
| --- | --- | --- |
| Records, scheduling, saved-report inspection | Python standard library | File publication, lifecycle, strict input parsing, ordinary report reading |
| Numerical core | `numpy` | Arrays, weighted reductions, explicit random streams, simulation |
| Statistical primitives | `scipy` | Distributions, paired tests, bootstrap interval machinery, standard permutation/Monte Carlo primitives |
| Classical methods | `statsmodels` | Family-level multiplicity, analytic power references, Gaussian mixed models |
| Selected Bayesian/hierarchical methods | `pymc` and compatible `arviz` | Outcome-appropriate models, posterior inference, diagnostics and labeled sample data |
| Optional cross-run SQL | `duckdb`, only after a concrete query need | Analytical views over saved files, never the attempt authority |

The three core numerical packages are required for the planned statistical implementation, not for basic record inspection. The model dependencies are optional installation/load-time dependencies, not optional delivery of the required Bayesian/model capabilities. Full-framework validation includes those methods. Missing a selected backend is a specific actionable error, not permission to silently select a different method.

Keep statistical policy in the benchmark helpers: experimental units, assignment probabilities, weights, missingness, failure mapping, estimands, margins, and stopping rules are not supplied automatically by a library. The library/custom-code split is specified in section 10.14.

### Local dependency setup

Use a project-local virtual environment in the existing skill source directory. Add two ordinary dependency files, not a publishable Python package or another build system:

```text
# requirements.txt
numpy
scipy
statsmodels

# requirements-models.txt
-r requirements.txt
pymc
arviz
```

Select an interpreter supported by the chosen released dependency set, create the environment, and install through its Python executable. Document and verify the exact local commands in README. Use published package metadata and wheel availability when resolving compatibility; do not copy development-branch dependency constraints blindly. Add ordinary compatibility constraints when evidence requires them, without per-run installation fingerprints or host-version gates.

Account for transitive dependencies: statsmodels includes pandas and formula tooling; PyMC adds PyTensor and the ArviZ/data ecosystem. Do not describe this as only five installed packages or assert an unmeasured footprint. Measure cold import time, memory, thread use, and fit cost during backend validation.

Load optional numerical/model backends lazily. Read a saved report without them. Keep the chosen ArviZ data/diagnostic interface behind one small adapter; verify chain/draw dimensions and output conversion against the chosen release rather than assuming older `InferenceData` examples still apply. Explicitly set interval probability/construction and the PyMC sampler. Do not let library defaults or the presence of an acceleration extra choose the analysis. Keep posterior arrays in separate local artifacts with coordinate metadata; add an I/O backend only when a chosen format actually needs one.

### Alternatives not adopted by default

- **Bambi:** useful if interactive formula authoring becomes frequent. Direct PyMC templates avoid an extra modeling layer for the fixed model families; formula syntax alone does not establish covariance semantics.
- **NumPyro or Stan:** strong alternative Bayesian backends for an existing JAX/Stan workflow or a measured performance need. Do not install duplicate model runtimes preemptively.
- **`confseq`:** only for a selected, assumption-compatible always-valid method. The initial finite-look controller needs no specialist sequential dependency.
- **Pingouin or extra resampling wrappers:** convenience does not remove the required cluster/design adapter. Do not add them solely for overlapping functions.

## 4. Small public interface

The logical interface is:

```ts
run({ specPath, outputDirectory })
report({ outputDirectory, format: "json" | "markdown" })
```

These are proposed operations, not claims that `benchmark.run` or `benchmark.report` are already registered Fabric tools. The initial transport is the fixed guest entry plus the local report helper. Do not document invented provider refs.

### `run`

- First invocation: read and validate the specification, resolve inputs, prepare the schedule, check the selected execution capabilities, and start bounded work.
- Subsequent invocation with the same specification and directory: continue the same run from durable records.
- Each Fabric invocation admits only a bounded batch. It returns `checkpoint` when additional invocations are needed. The caller repeats the same operation; it does not calculate judge batch numbers or manufacture call plans.
- Work can include measured attempts and, when selected, model grading or adjudication. The runner chooses the next phase and accounts for its budget.
- Completed runs return the existing result with zero model calls.
- A changed experiment specification is not a resume. Start a new output directory.
- The runner does not silently substitute a different model, grader, analysis method, retry policy, or schedule when a requested option is unsupported.

### `report`

- Read saved configuration and records, reconcile them, and return the report or partial diagnostics.
- No model calls, grader calls, capability canaries, state reset, record repair, or implicit publication.
- No current Fabric backend, runtime-version check, or optional model dependency is needed to read an already supported record format or a saved report.
- During a run, report a partial snapshot and unfinished IDs. Do not infer finality from a favorable subset or from the number of files alone.
- Final report files are published by `run` when it completes. `report` can recompute a view in memory but does not overwrite saved reports. A caller may explicitly save returned text to a separate destination.
- Analysis uses the saved plan. A post-hoc analysis is a separate labeled result, not an overwrite of the primary report.

A local reporting command can be a direct helper invocation, for example:

```sh
python -B scripts/run.py report --run-dir "$RUN_DIR" --format markdown
```

This is a target command to implement and document, not an assertion that it exists today. The execution command shown in the rewritten skill must be verified against the actual Fabric entry before cutover.

### Compact result

Return a small result containing:

- `status`: `complete`, `checkpoint`, `blocked`, `unsupported`, or `failed`;
- `runDirectory` and current phase;
- planned, assigned, terminal, failed, unresolved, and pending counts;
- next action, if any;
- structured errors and limitations;
- report paths when available;
- a separate scientific decision such as `adopt`, `retain-control`, `inconclusive`, or `descriptive-only`.

Do not embed raw logs or all task results in the model-facing return. Use ordinary diagnostics rather than an expanding receipt taxonomy.

## 5. Specification and saved records

### Specification

The specification is an experiment description, not an infrastructure manifest. Its sections are:

1. **Question and scope:** decision or estimation question, target task set/population, sampling frame, selection method, and task role.
2. **Tasks:** stable IDs, prompts, fixture inputs if any, strata/families if relevant, and outcome definitions.
3. **Conditions:** stable IDs, selected model/runner, prompt or skill instructions, relevant tools/settings, and the intervention or named bundle.
4. **Design:** repetitions, task weights, assignment mechanism, seed, condition order, and concurrency policy.
5. **Grading:** deterministic grader or selected judgment procedure, rubric, score mapping, and optional disagreement rule.
6. **Analysis:** estimands, primary and secondary contrasts, metrics/directions, uncertainty and testing methods, multiplicity family, practical thresholds or non-inferiority margin, and sensitivity plan.
7. **Stopping and budgets:** maximum tasks/repetitions, direct calls, allowed retries, concurrency, time, and any declared sequential looks. Cost/token estimates or guards are labeled according to actual enforcement.
8. **Task state, only when applicable:** fixture setup/reset command or other concrete preparation and its verification. Omit this section for tasks that do not need it.
9. **Mechanism observation, only when applicable:** the behavior being tested and the evidence needed to distinguish assignment from exposure.

Use explicit defaults and save their resolved values. Do not require dummy browser, credential, database, protected-root, software-identity, or component fields.

A finite, curated task set is a valid declared scope. A population claim requires more sampling justification. If no practical threshold is supplied, the tool may estimate effects and uncertainty but must not invent an adoption rule.

### Storage decision: files first, no authoritative database

Keep JSON/run directories as the authority for attempts, resume, and final results. The full statistical framework does not require a database, and no measured file-query or reconciliation bottleneck currently justifies replacing the existing publication mechanics. Consolidate those mechanics first.

| Choice | Concrete benefit | Cost and adopted decision |
| --- | --- | --- |
| JSON/files | Existing publication logic, directly inspectable records, natural storage for native logs | Keep as the default; the runner owns publication order and reconciliation |
| SQLite through Python `sqlite3` | Transactions, unique IDs/constraints, indexed pending-work queries, atomic related metadata updates | Strongest replacement if it materially simplifies lifecycle bookkeeping; not required now |
| DuckDB over files | Cross-run joins and analytical aggregation directly over JSON/Parquet | Optional query tool using a private in-memory connection, not another authority |

A database does not make external model execution atomic: assignment commits before the model call, and result publication follows it. A crash between the call and result publication remains ambiguous. External log files also remain outside the transaction. Do not maintain authoritative SQL rows alongside authoritative JSON records.

Reconsider storage only for a concrete need:

1. Frequent cross-run SQL questions justify trying DuckDB over an explicit set of validated saved records.
2. Atomic coupled metadata updates justify a small SQLite prototype if it replaces appreciable custom bookkeeping, even at modest data volume.
3. Slow directory scans justify measurement against an actual local latency target before replacement.

If SQLite is selected later, make it the sole metadata authority, use short explicit transactions, and retain logs externally where useful. Its one-writer semantics fit a single coordinator. Do not enable WAL reflexively; reader/writer contention, sidecars, checkpointing, and read-only opening need targeted checks. Database recovery must not turn ambiguous model calls into replayable IDs.

If DuckDB is selected, read files directly using a private in-memory connection and explicit types. Keep Parquet exports optional and derived. Verify offline operation, lazy extension behavior, temporary spill behavior, join cardinality, missing values, and agreement with hand-checked Python results. Reporting does not silently create an index or export. Persistent DuckDB, server/catalog arrangements, ORMs, and a TypeScript database binding are not part of the plan.

### Run directory

Use a plain local format with a small number of record kinds:

```text
run-directory/
  spec.json                         # resolved, fixed experiment inputs
  inputs/                           # copied task/condition/rubric inputs as needed
  schedule.json                     # complete assignments and randomizer parameters
  attempts/<attempt-id>/
    assignment.json                 # written before dispatch
    result.json                     # native return or captured failure
    terminal.json                   # published after required result files
    ...                             # native logs and task outputs as applicable
  grading/                          # absent for tasks needing no separate records
  checkpoint.json                   # replaceable progress cache, not primary evidence
  report.json                       # published on final completion
  report.md
```

Use one simple exclusive local lock while an invocation owns the run; no leases, renewal protocol, or fencing tokens. An abnormal exit may leave a stale lock marker, handled by the conservative manual recovery procedure below.

Record format identifiers exist to parse data, not to certify software identity. Internal record kinds do not each need a separate public schema and migration protocol.

### Publication rules

- Save resolved experiment inputs before scored dispatch. Resume compares the supplied specification with that saved configuration, not with runner source hashes.
- Create assignments, native results, and terminals without replacing conflicting existing records. Identical already-published records may be recognized as already present.
- Publish the terminal after its required result files. Publish final reports only after exact ID reconciliation. Write the Markdown report first and `report.json` last as the authoritative completion record. An interruption between them is unfinished finalization, recoverable without model calls.
- Create needed parent directories before publication. Test partial writes and ordinary filesystem errors so they cannot create a false completed result.
- Keep large native logs on disk and return small summaries. Preserve unavailable or truncated evidence as such; do not claim a full archive from a clipped return.
- `checkpoint.json` may be atomically replaced because it is a cache of immutable records. Reconstruct progress from those records when it is absent or stale.
- Do not add chained seals, ownership-closure manifests, cryptographic blind-map commitments, source fingerprints, or machine-wide scans.

The implementation promises conservative interruption handling, not exactly-once external effects or certified power-loss durability.

## 6. Run lifecycle and interruption

### Normal path

1. Validate the requested experiment and its statistical compatibility.
2. Check only the runtime capabilities required by this run; do not use version labels for admission.
3. Acquire the run's exclusive lock and load or initialize its saved configuration.
4. Resolve inputs and make the schedule before scored execution.
5. Run deterministic grader fixtures and, for a materially new launch path, a separately budgeted non-scoring smoke. Reuse a validated unchanged grader's fixture results; do not build a certification stage graph.
6. Prepare task inputs/state where needed.
7. Write an assignment, dispatch the agent, preserve the native return or error, derive the outcome, and publish its terminal.
8. Stop admitting work before the invocation's remaining call/time budget is exhausted. Save a checkpoint and return if more work remains.
9. After measured outputs are fixed, run any selected model grading and adjudication in bounded batches.
10. Reconcile all planned work, run the saved analysis, and publish final reports. Analysis/final publication makes zero model calls.
11. Release the lock. Run task-specific cleanup only where the task setup requires it; there is no generic environment cleanup manager.

For ordinary text tasks with deterministic scoring, the optional state, model-grading, adjudication, and mechanism branches are absent.

### Attempt states

```text
pending -> assigned -> terminal
                    -> unresolved after interruption
```

Terminals distinguish successful output, agent failure, timeout, cancellation, infrastructure failure, and evaluator failure. Outcome scoring follows the saved rule; a terminal failure is not silently removed from the experiment.

Keep assignment and outcome concepts separate. Runtime `startedAt` returned at completion is retrospective evidence, not proof that the coordinator recorded startup live.

### Resume rules

| Saved state | Action |
| --- | --- |
| Valid terminal | Skip with zero new model calls |
| Pending planned row | Eligible for dispatch within the remaining budget |
| Assignment without terminal | Pause automatic continuation; inspect available runtime output |
| Complete contemporaneous result but missing derived terminal | Deterministically finish the record without relaunching or changing the score rule |
| Missing or contradictory result | Keep it unresolved; report the limitation or start a new experiment |
| A permitted retry | Allocate its own ID and link it to the first attempt; retain both |
| Existing final report with reconciled inputs | Return the completed result without re-execution |

Do not automatically replay an assigned ID even if a lock is stale. Removing a stale lock does not establish whether an agent call finished. Recovery is a small documented manual procedure, not a takeover service.

Two simultaneous invocations for one directory must not both dispatch. Parallel conditions within one invocation are supported; parallel coordinators for that directory are not.

### Budgets

- Use the lower applicable requested, configured, and usable invocation call ceiling. Retain the current conservative ceiling of 100 calls per invocation initially.
- Count non-scoring smokes, measured calls, selected judges, adjudicators, and retries. Reserve sufficient capacity before each batch; no separate public reservation ledger is needed.
- A fresh dedicated invocation avoids inheriting an unknown already-consumed call budget. If that cannot be established, use the remaining budget actually exposed by the runtime or decline the batch.
- Keep direct call limits and recursive descendant usage distinct. A per-process counter is not a recursion-tree limit.
- If a recursive condition requires a hard descendant ceiling that the runtime cannot enforce, report that option unsupported. Do not invent enforcement from post-hoc accounting.
- Cost/token guards are observational unless the selected backend actually stops consumption before the limit. Show unknowns and overshoot. Never market an estimate as a hard spending cap.
- Fixed sample size is the default statistical stopping rule. A cost stop or interrupted run does not become a valid sequential analysis merely because a checkpoint exists.

## 7. Task state and condition checks

State handling exists to make the comparison meaningful, not to protect the machine or to inventory all possible infrastructure.

- **Text/structured-output tasks:** use the saved prompt and a fresh agent session. No browser/database/account setup.
- **Coding tasks:** give each attempt the declared initial files or fixture checkout. Verify the task fixture is ready using a task-specific check.
- **Browser/application tasks:** reset only the state needed by that task, such as a test cart or seeded records. Implement the first real reset directly; do not design adapters for every possible service.
- **Stateful tools:** use a known fresh fixture/session or declare the shared state and carryover limitations.
- **Intentionally shared/live resources:** record the condition-relevant facts, interleave/randomize appropriately, and limit claims. Do not pretend every external environment can be frozen.

A worktree or fresh conversation is sufficient only for the state that it actually resets. This is an experimental assumption to check for the selected task, not a universal isolation gate.

Always verify the intended condition was requested and that its instructions were supplied through the actual launch path. Preserve selected model information and conflicting/unknown runtime observations. Do not require independent software attestation.

Detailed actor/delegation exposure checks are conditional. If the question is whether an agent uses delegation, observe dispatch, child return, and relevant parent consumption/handoff. If the question is only which assigned prompt produces better outputs, do not require actor lifecycle artifacts from every control attempt.

There is no protection baseline, forbidden-file scan, secret scan, protected-state delta, or coordinator-only authorization subsystem in this section or elsewhere in the new runner.

## 8. Fabric integration and local operation

### Runtime capabilities, not version admission

- The benchmark imposes no Pi or Fabric version minimum, exact pin, or version-comparison admission policy.
- Remove the existing minimum-version refusal branches, runtime-version parsing prerequisites, and tests that require them. Missing, malformed, older, or newer version labels do not block an otherwise supported operation.
- Check only required public launch/result behavior: selected request fields, native result access, applicable call limits, cancellation, and any actually requested recursion behavior. An unavailable required capability remains a specific `unsupported` result.
- Run bounded integration checks on the installed runtime. Report tested behavior and untested branches; do not maintain a historical/mixed-version certification matrix or claim all historical/future runtimes work.
- Runtime version strings may be ordinary diagnostics if already available. Do not require host-identity discovery, complete descriptor equality, private source strings, or source fingerprints.
- The underlying packages retain their own installation/runtime requirements. This plan removes additional benchmark-imposed version gates, not those packages' behavior.
- Report-only operation requires neither current runtime capabilities nor a runtime-version check.

### Dispatch seam

Continue using the supported guest `agents.run` path for measured attempts and model graders because it exposes the full runtime result needed for status and usage. Do not substitute a text-only convenience helper and lose failure or telemetry fields.

For recursive measured parents, preserve the known adaptation: omit custom `cwd` and supply absolute task/workspace/instruction paths through the supported request. Test that path only when recursive conditions are enabled.

The dispatch implementation must demonstrate:

- intended request and model/settings reach the child;
- complete supported result fields are retained;
- call limits, cancellation, and timeout behavior are understood;
- native log access works without sending multi-megabyte logs through the model-facing return;
- failures and interruptions produce the expected local records.

Do not scan all installed Fabric chunks as a normal runtime doctor. Public declarations and focused behavioral checks replace private bundle-name and source-string dependencies wherever possible.

### Smaller entry first; extension only if useful

The immediate refactor is to extract deterministic mechanics and shrink the fixed guest entry. Calling that exact entry with a JSON request remains a supported initial transport. There is no requirement to make all source transport disappear before the useful refactor can ship.

Investigate file-backed or registered fixed-program invocation as one bounded integration task. If a supported public facility exists, use it and verify its execution behavior. If none exists, document the remaining invocation cost and retain the fixed entry. A small generic Fabric enhancement may be proposed separately.

A thin local Pi extension can be added later if it demonstrably removes invocation friction. If added:

- load its TypeScript source directly from the active profile's local resource configuration;
- keep it a wrapper around the same runner;
- add no component or duplicate Fabric runtime;
- verify argument validation, cancellation, call accounting, and result handling on the actual launch path;
- do not assume component/provider `context.call()` is equivalent to an enclosing guest `agents.run` call;
- do not import private execution classes or secretly launch a second Pi/model process to emulate Fabric.

This optional convenience is not part of the required component architecture, because there is no required component architecture.

## 9. Grading and measurement

### Deterministic grading

Prefer the task's actual outcome: behavioral tests, final structured data, semantic predicates, or a task-specific final-state extractor. A successful tool invocation or a model's claim of success is not the outcome by itself.

Save the grader choice, rubric/predicates, score mapping, timeout/malformed handling, and any partial-credit rules before scoring. Do not tune the grader on scored outputs and quietly keep the original experiment label.

Validate each decisive criterion with applicable known-good, known-bad, isolated-defect, boundary, and malformed examples. Keep these as reusable grader tests. There is no mandatory per-run certification manifest, cryptographic receipt, or model-based certification traffic for a deterministic grader.

Test the forms the model is actually allowed to return. Keep original outputs and grader results separate. An always-pass or always-fail grader must fail its own tests.

### Model or human grading

Use judgment only where deterministic evidence cannot answer the criterion.

- Provide anchored rubrics and calibration examples before scored grading.
- Present criterion-relevant evidence without condition names, model/provider names, prices, timing, or previous scores unless that information is genuinely part of the criterion.
- Randomize presentation order and left/right position for pairwise judgments.
- Use ordinary input projection and, where appropriate, a no-tools grader. Blinding does not require an access-control system or cryptographic reverse-map commitment. Report material residual unblinding.
- Retain each grader's label and uncertainty/abstention rather than only a consensus score.
- State when only one grader was used; one grader does not identify inter-grader variance.
- Separate grader and measured-agent traffic by default so evaluator load does not contaminate the measured latency comparison.
- Add adjudication only when the saved rule says disagreements require it. Freeze the trigger, resolver, precedence, and maximum extra calls. Generate deterministic IDs for eligible work; keep ineligible work out of the call queue.
- A missing or malformed judge response is not agreement, adjudication, or successful completion.
- Repeated labels for the same task output are measurement replication, not additional independent tasks.

### Telemetry

Preserve native usage fields, units, statuses, model observations, and logs when supplied by the runtime. Normalized summaries must distinguish unavailable from zero and direct from inclusive usage.

Report measured attempts, judges, adjudicators, retries, smokes, and local processing separately. For recursion, sum only uniquely attributable direct usage or clearly label an available inclusive total; do not double count both.

Keep quality, failure rate, latency, tokens, cache, tool counts, and cost as distinct metrics. Record the timing interval being measured. Do not mix coordinator queue/setup time with agent runtime without saying so.

No runner-code fingerprint, transformer source digest, or complete provider implementation identity is required to produce these measurements. Document field meaning and statistical limitations instead.

## 10. Full statistical-method framework

This section is **retained scope**, not an optional simplification target. Methods are selected by the experiment; every experiment does not run every method. Optional model families remain planned capabilities, not compulsory dependencies for ordinary comparisons.

The statistical interface takes resolved design, complete schedule, outcomes, and the saved analysis plan. It returns a structured analysis and diagnostics. It performs no model calls and does not alter attempt records.

### 10.1 Question, population, and estimand

- Distinguish a finite-task comparison from inference to a task population. Record sampling frame, selection procedure, strata/families, and any prespecified population weights.
- Keep development, calibration/smoke, exploratory screening, and confirmation roles distinct. Explain task reuse and contamination limitations without calling a locally hidden set automatically clean.
- Define assignment-based primary estimands, outcome direction/unit, aggregation, failure mapping, and the decision or estimation question.
- Treat the task as the usual inferential unit, with repetitions nested within task. If tasks share a stronger dependence unit, declare that family/repository cluster and handle it in uncertainty calculations.
- Treatment-load and mechanism-exposure subsets are diagnostics unless assignment/exposure was randomized or forced in a way that supports the causal claim.
- Do not invent a target population or decision margin from observed output.

### 10.2 Sample size, precision, and stopping design

Provide design-time precision/power exploration using plausible effect/variance scenarios, task heterogeneity, failure rates, grading noise, and the actual randomizer/estimator where feasible.

Use NumPy to simulate complete experiments through the production assignment, analysis, multiplicity, and stopping rules. SciPy `stats.power` and statsmodels `TTestPower` provide numerical/reference cases, not automatic design-faithful simulations. For paired analytic checks, standardize task differences and count independent tasks, not trajectories. Separate random streams for outcomes, assignment, grading, and inner resampling; report Monte Carlo error as well as scenario sensitivity.

- Prefer simulation through the selected design over a trajectory-level independent-sample formula.
- Use pilot/development assumptions, not the final observed effect as retrospective “power.”
- Explore adding tasks versus adding repetitions; repetitions do not create new task diversity.
- Show sensitivity to assumptions, expected interval width or decision probability, cost, and the exact test's attainable resolution.
- Save the maximum sample and stopping rule before scored output. Do not prescribe a universal credible run count.
- Describe underpowered screening as screening. A small budget does not justify an overstated conclusion.

### 10.3 Task-paired estimates

For each task and condition, apply the saved failure/partial-outcome rule, summarize repetitions, and then compute the oriented paired contrast:

```text
y_bar[t,c] = saved summary of outcomes across repetitions for task t, condition c
d[t]       = oriented(y_bar[t,candidate] - y_bar[t,control])
effect     = sum(w[t] * d[t]) / sum(w[t])
```

Default task weights are equal. Weighting cannot depend on which tasks succeeded, how many retries were attempted, or which condition looked best.

Show the raw task-condition-repetition table, task summaries, paired contrasts, task-effect distribution, meaningful wins/ties/losses, and the largest regressions. Support multiple conditions through a saved set of contrasts, not automatic promotion of the observed winner.

Different metrics can need different summaries, such as a mean, quantile, binary rate, or a prespecified transformation. Save these choices and their interpretation; do not use one saturated ordinal “efficiency” score.

### 10.4 Randomization contracts and the known mismatch

The current schedule generator globally balances positions through cyclic shifts. The current paired helper implements task-vector sign flips. These are not automatically a matching randomization/inference pair.

**Fix this explicitly; preserving the full framework includes fixing it.** Until the matching implementation passes its oracle tests, old balanced schedules cannot receive confirmatory exact-randomization claims from the task-vector calculation.

Implement named contracts for:

1. **Independent repetition-block assignment:** each `(task, repetition)` block contains all conditions and receives its declared random label permutation.
2. **Task-vector assignment:** one condition-label transformation applies across all repetitions of a task; inference may use matching task-vector swaps.
3. **Existing balanced cyclic assignment:** preserve its actual block-order, position restrictions, and assignment probabilities. Do not substitute a uniformly sampled set of arbitrary balanced schedules.
4. **Selected counterbalanced/shared-state designs:** retain their period/carryover assumptions and use analysis appropriate to them. Counterbalancing alone does not prove independence or eliminate interference.

Save the observed schedule, seed, algorithm name/parameters, assignment blocks, fixed positions, and any conditioning choices. A new simpler generator has a different declared contract; it cannot reinterpret a historical schedule.

Retain the researched counterexample as a regression fixture: with two conditions and four blocks, conditioning on block order, the existing cyclic construction permits four order patterns, arbitrary global balance permits six, and independent block swaps permit sixteen. Check generating-path multiplicities independently. This small support example is not a proof of all finite-seed probabilities or of every conditional analysis.

### 10.5 Exact tests and Monte Carlo randomization

For each supported randomizer:

- Define the sharp null, assignment support, probabilities, statistic, conditioning, and one- or two-sided tail convention.
- Distinguish sampling/weighting unit, assignment block, and permutation unit.
- Recompute task summaries and the saved task-weighted statistic for every allocation. Swapping repetition blocks does not make repetitions independent population samples.
- For two-condition independent repetition blocks, enumerate the `2^B` legal block swaps when feasible. For task-vector assignment, use the corresponding `2^T` support. Multi-condition blocks use their allowed permutations.
- For the balanced cyclic generator, derive support and weights from its actual generating choices, including repeated generation paths that produce the same allocation. Verify conditioning on observed features rather than assuming it is innocuous.
- Include the observed allocation with the correct probability and report the discrete minimum attainable p-value and tie convention.
- Use exhaustive exact enumeration only within a declared computational limit. Beyond it, use a seeded Monte Carlo procedure that samples from the correct law, with an appropriate finite-sampling p-value construction, draw count, and Monte Carlo uncertainty.
- Never label sampled allocations “exact.” Do not silently switch from exact to Monte Carlo if the analysis plan forbids approximation; return a method-specific limitation instead.
- Keep sharp-null randomization claims distinct from population-average, mechanism, practical-significance, and equivalence claims.

Use SciPy's standard permutation procedures only for their matching assignment/exchangeability schemes. The balanced generator needs a custom joint allocation-law adapter; `monte_carlo_test` can wrap that adapter, but cannot supply its law. Prefer a small explicit sampler/tail accumulator if packing schedules into a generic array interface obscures the design.

For a fixed number `M` of simulated allocations, a construction such as `(1 + extreme_count) / (M + 1)` requires the observed and simulated statistics to be exchangeable under the correct null law. Sampling nonuniform allocations with the wrong probabilities is not repaired by this correction. Prespecify extremeness and ties: SciPy's default twice-smaller-tail convention is not universally identical to the existing absolute-statistic rule.

Implement small independent exhaustive oracles before optimizing the production enumerator/sampler. Nonuniform allocation probabilities and multi-condition schedules need explicit fixtures.

### 10.6 Cluster bootstrap and interval construction

Retain task-cluster bootstrap uncertainty for the paired estimand. Every sampled cluster carries its complete conditions, repetitions, failures, and applicable weights. Recompute the statistic on every draw.

Use SciPy for interval machinery, not to infer the resampling unit. `paired=True` shares row indices across arrays; it does not automatically preserve task/family clusters. Resample cluster IDs or whole-cluster vectors, and implement cluster-level deletion for BCa jackknifing. Detect degenerate distributions and NaN bounds rather than silently switching interval methods.

- If a higher-level family/repository is the declared dependence unit, resample that unit rather than splitting dependent tasks.
- Use stratified resampling where the sampling/weighting design requires it. Treat complex sampling weights according to a justified design, not as arbitrary bootstrap weights.
- Record seed, draw count, interval construction, confidence level, cluster count, and degeneracy diagnostics.
- Prespecify percentile or other supported interval constructions. An alternative construction needs its own calibration and assumptions, not a cosmetic option name.
- Produce deterministic outputs for repeated pure-method calls on identical inputs/settings in the same environment. Validate numerical backends to documented tolerances rather than promising bitwise equality across all software and hardware.
- Explain that resampling a small curated sample measures instability of those observed clusters, not automatic population coverage.

### 10.7 Superiority, practical effects, and non-inferiority

Keep point effects, uncertainty, statistical evidence, and practical decisions separate.

- Save metric direction, threshold, decision margin, confidence level, and any outcome-quality vetoes.
- A small p-value with a trivial effect does not imply adoption. A favorable point estimate whose uncertainty crosses the decision boundary is ordinarily inconclusive under that rule.
- For non-inferiority, save a defensible margin and its practical rationale before scoring. With positive values meaning improvement, compare the appropriate one-sided bound against `-margin`.
- Report the operational benefit sought while retaining quality, worst task regressions, failures/intercurrent events, and conservative sensitivity results.
- Do not turn failure to reject a superiority null into equivalence or non-inferiority.
- Do not import clinical placebo/constancy/regulatory assumptions into an agent benchmark.
- Outcome-quality vetoes refer to declared task requirements, not the removed machine-protection subsystem.

### 10.8 Multiplicity and multi-condition comparisons

Support a saved family of conditions, metrics, and contrasts with explicit primary/secondary/exploratory roles.

- Implement Holm and Bonferroni family-wise control for applicable tests.
- Support Benjamini-Hochberg false-discovery control where its dependence assumptions are justified; use Benjamini-Yekutieli when its general-dependence guarantee is the selected conservative alternative.
- Report raw and adjusted p-values, family membership, error-rate target, and decision thresholds.
- Do not treat p-value adjustment as an automatic adjustment of reported confidence intervals. Use compatible simultaneous intervals where available or label intervals as marginal.
- Include multiple conditions and pairwise contrasts in the declared family; do not choose the best candidate first and pretend its comparison was the only planned test.
- Reject an unknown adjustment method or an incoherent family instead of silently using “none.”

Use `statsmodels.stats.multitest.multipletests` with an explicit method. Refactor the existing single-p-value `_multiplicity` helper: it currently handles none/Bonferroni, whereas Holm/BH/BY require the complete declared family. Collect its p-values, adjust once, and map results back to the saved contrast IDs. Never run a family procedure separately on each individual p-value.

### 10.9 Adaptivity and sequential decisions

Retain both fixed-sample and justified prespecified sequential designs.

- Fixed sample remains the default. Unplanned peeking, task additions, prompt/grader changes, and early stopping are exploratory.
- A sequential specification includes the maximum sample, look times on complete relevant clusters/blocks, statistic, stopping criteria, and error control across looks and contrasts.
- Start with a custom finite-look controller using valid per-look procedures and saved error allocations `alpha[look,hypothesis]` whose sum is at most the overall alpha. This union-bound control does not require independent looks, but it does require valid constituent p-values. Holm within each look with a total across-look allocation is another supported construction. Do not call this efficient group-sequential spending; more efficient spending or always-valid methods need their own supported implementation and calibration.
- Ensure each look's randomization law respects the actual schedule, including globally coupled restrictions. Ordinary fixed-horizon p-values and nominal bootstrap intervals are not automatically anytime-valid.
- Record each look and the reason for stopping. Separate a valid planned stop from interruption, cost exhaustion, or service failure.
- Disclose adaptive development and retain an untouched final task set where the decision requires confirmation. Repeatedly analyzing a reused set does not make it confirmatory.

### 10.10 Missingness, failures, retries, and sensitivity

Retain every scheduled row and distinguish agent failure, timeout, cancellation, infrastructure invalidation, grader failure, treatment-unverified output, and unresolved execution.

- Apply prespecified scoring to failures where defined. Unknown evidence is not fabricated as a successful or zero-cost observation.
- Never drop condition-dependent failures to form a flattering complete-case sample.
- Reconcile unequal cells and explain departures. An incomplete run may receive descriptive diagnostics and bounds; it does not receive an unconditional complete-confirmation label.
- Keep first attempts, permitted retries, and repaired outputs separately identifiable. Preserve failed parents and link new attempts.
- Implement the selected sensitivity analyses: conservative missing-outcome bounds; infrastructure inclusion/exclusion; first attempt versus production retry policy; repaired versus original outputs; treatment/exposure uncertainty; alternative justified summaries/weights; leave-one-task/family-out concentration; grader disagreement/error bounds; and relevant concurrency/service strata.
- Label unplanned sensitivities as exploratory. Never substitute a favorable sensitivity for the primary analysis.

### 10.11 Reliability and efficiency

Keep these operational questions distinct:

- `pass@1`: first-attempt acceptance under the declared single-attempt policy;
- retry-policy acceptance: acceptance under the exact production retry and budget rules;
- `pass@k`: at least one eligible success under an applicable `k`-attempt policy, with assumptions stated;
- `pass^k` / all-attempt consistency: all required attempts succeed when that is the operational requirement.

Do not conflate repeated benchmark samples with a production retry policy. Where a combinatorial `pass@k` estimator is used, check the eligibility, sample-size, and exchangeability assumptions and its boundary cases.

Analyze latency, tokens, tools, and cost on their declared failure-inclusive populations. Specify timeout/censoring and unavailable-attribution handling; analyzing only successful, cheap runs can reverse the conclusion. Report quality-efficiency tradeoffs directly rather than hiding them in a composite score.

### 10.12 Hierarchical, Bayesian, and crossed-effects analyses

Retain these as supported, prespecified choices for questions that need them. They do not run by default and must not displace the raw task-paired result.

- Choose a likelihood appropriate to the outcome, such as binary acceptance versus continuous quality or latency.
- Model task effects and relevant condition-by-task variation; include repeated trajectories and crossed grader effects where the data support them.
- State estimand, link/scale, fixed/random effects, priors where applicable, and treatment of failures/missingness.
- Use statsmodels `MixedLM` for its supported frequentist Gaussian mixed/crossed models, and direct PyMC plus ArviZ for the selected Bayesian likelihoods and diagnostics. Do not write a sampler or mixed-model optimizer from scratch.
- For crossed task/grader effects in statsmodels, verify the single-group/variance-component construction and its covariance restrictions. It supports some crossed models, not every correlated crossed random-slope specification.
- Do not fit binary acceptance with Gaussian `MixedLM` merely for convenience. statsmodels' binomial/Poisson mixed-model approximations are Bayesian, not frequentist GLMM estimation. General frequentist binary crossed GLMMs are not supported by the adopted Python stack; report that combination unsupported rather than silently substituting a Bayesian model. The initial model scope is Gaussian frequentist plus outcome-appropriate Bayesian models, not every likelihood/framework combination.
- Transform fitted/posterior predictions into the saved task-weighted outcome contrast. A conditional log-odds coefficient is not a marginal acceptance-rate difference. Preserve output IDs when multiple graders label the same trajectory; grader severity effects do not automatically identify grader accuracy.
- Validate Bayesian prior/posterior predictive behavior, convergence, effective sample size, divergences, and sensitivity to consequential priors.
- Validate frequentist fit convergence, singularity/identifiability, interval construction, residual/model adequacy, and small-cluster limitations.
- Do not claim one grader estimates a grader population, or a few tasks identify a rich interaction structure.
- Include simulation recovery and deliberately weakly identified fixtures. Surface a fit failure or unsupported data design instead of returning plausible-looking estimates.
- Keep posterior probabilities/credible intervals distinct from frequentist p-values/confidence intervals. Apply the saved decision rule to the selected inferential framework.

These methods can be delivered after the basic paired engine, but the full-framework milestone remains open until the declared method implementations and diagnostics are covered. An `unsupported` placeholder alone is not delivery of a planned method.

### 10.13 Analysis output

The structured analysis and human report contain:

1. question, scope, sampling/assignment units, estimand, and saved decision rule;
2. all task-condition-repetition outcomes and their status mapping;
3. task summaries, contrasts, aggregate effects, heterogeneity, and material regressions;
4. uncertainty construction, statistical tests, assumptions, and diagnostic results;
5. actual randomizer/inference match, allocation or Monte Carlo details, and exact resolution;
6. multiplicity family and adjustments, plus sequential looks if selected;
7. failures, unresolved records, retries, grading disagreement, and denominator reconciliation;
8. sensitivities, concentration, and limits on transfer to new tasks;
9. separate quality, reliability, latency, usage, and cost findings;
10. adoption/retention/inconclusive/descriptive-only decisions with the rule that produced them;
11. unsupported requested analyses or failed model fits, without concealing available descriptive evidence.

No analysis artifact requires runner source identity, a software attestation, or a cryptographic seal chain.

### 10.14 Method coverage matrix

| Capability | Library contribution versus custom code | Required implementation evidence |
| --- | --- | --- |
| Task-paired means, summaries, weights, and directions | NumPy reductions/SciPy primitives; custom aggregation, units, and failure mapping | Hand calculations, unequal cells, multiple conditions |
| Design-time precision/power simulation | NumPy outer simulation; SciPy/statsmodels reference tests; custom full experiment generator | Known regimes, Monte Carlo uncertainty, tasks versus repetitions |
| Independent block and task-vector randomization | SciPy standard schemes where matched; custom allocation contract and statistic | Exhaustive allocation oracle, observed-allocation/tie checks |
| Existing balanced cyclic randomization | Custom support/probability enumeration and joint sampler; no automatic library solution | Four-versus-six-versus-sixteen counterexample, path weights, conditional and remainder cases |
| Multi-condition exact/Monte Carlo inference | SciPy numerical support; custom design-law adapter, tails, approximation accounting | Small enumerations, weighted sampling, explicit Monte Carlo uncertainty |
| Task/family/stratified cluster bootstrap | SciPy intervals; custom whole-cluster resampling, stratification, weights and BCa jackknife | Cluster-preserving samples, coverage, degenerate bounds |
| Practical superiority and non-inferiority | SciPy one-sided primitives under applicable assumptions; custom margin/estimand/decision policy | Direction/margin edges, dependence, crossing bounds |
| Multiplicity | statsmodels Holm/Bonferroni/BH/BY; custom full-family assembly and interval policy | Numerical references, family completeness, dependence assumptions |
| Sequential designs | Custom finite-look allocation/controller built on valid per-look tests | Full-policy null calibration, complete-look accounting, illegal-peeking refusal |
| Missingness and sensitivity | Custom outcome/status mapping and sensitivity driver | Asymmetric failures, bounds, retry/repair contrasts, concentration |
| Reliability metrics | NumPy/SciPy numerical support; custom production-policy estimands | `k` boundaries, first-attempt/retry separation, heterogeneous tasks |
| Grader uncertainty | Model primitives where applicable; custom calibration and labeling-dependence assumptions | Conflicting labels, single-grader limits, crossed-label fixtures |
| Hierarchical/Bayesian/crossed models | statsmodels Gaussian models; PyMC/ArviZ Bayesian models; custom model/estimand/diagnostic adapter | Recovery, singular/failed fits, posterior diagnostics, weak identification |
| Reporting and decision construction | Standard-library serialization; custom decision and limitation construction | Golden JSON/Markdown, no survivor filtering, backend-independent saved-report reading |

Use independent oracles or trusted numerical references, not a second call to the production function as its own expected answer. Predeclare tolerances and simulation acceptance criteria; no repeated rerunning until a stochastic check happens to pass.

## 11. Skill rewrite

Keep `/skill:agent-benchmarking` and make the entry a short reasoning and invocation guide. Its body should explain:

1. Frame the comparison and whether the aim is screening, estimation, or a confirmatory decision.
2. Read the relevant design, grading, and statistics owners.
3. Produce the specification, making unknowns and consequential choices explicit.
4. Invoke the fixed runner; repeat the same operation on `checkpoint`.
5. Use read-only reporting for completed or interrupted runs.
6. Interpret the statistical decision and limitations rather than equating execution success with adoption.

The full statistical reference remains substantial and authoritative. Progressive disclosure is the simplification, not deleting methodology.

Remove from `SKILL.md`:

- protected-state and software-identity gates;
- source fingerprinting, seal/revision procedures, and immutable-stage receipt inventories;
- mandatory actor, supervisor, or scheduler certification for every task;
- manual prepare/judge/adjudicate/finalize orchestration;
- source-code adaptation recipes and the giant implementation asset catalog.

Link directly to operation-specific references and the actual executable entry. Put implementation/testing inventories in README documentation, not in the skill's normal instruction path. Ensure all retained support assets are reachable through the appropriate documentation.

Keep the skill's description focused on designing, running/resuming, auditing/reporting, and statistically analyzing agent/prompt/skill/model/tool/workflow comparisons. State verified compatibility accurately. Test positive triggers and near-misses rather than assuming a concise description remains discoverable.

## 12. Existing asset disposition

All current paths in this table are relative to `skills/agent-benchmarking/`. Implementation begins with the actual current inventory; do not use a stale file count as a migration contract.

| Existing assets | Disposition |
| --- | --- |
| `SKILL.md` | Rewrite after the new fixed invocation works; retain the skill name/path |
| `references/protocol-design.md`, `statistical-analysis.md` | Preserve the full scientific contract; replace seal/protection/source-identity dependencies with saved inputs and reconciled records; fix inference mismatch |
| `references/conditions-and-mechanisms.md` | Keep condition fidelity and task-specific state; make mechanisms conditional; remove universal infrastructure/protection obligations |
| `references/grading.md` | Keep applicable grader tests, calibration, blinding, and judgment uncertainty; remove mandatory certification transactions and blind-map commitments |
| `references/execution-lifecycle.md`, `audit-and-reporting.md`, `telemetry.md` | Consolidate caller guidance into operations; keep detailed measurement/analysis rules with their actual owner |
| `references/architecture.md`, `validation.md` | Move current implementation/test guidance into README and focused test documentation; remove obsolete component/seal/protection requirements |
| `references/evidence/*` | Retain useful research and historical failure explanations; clearly distinguish historical policy from the new design |
| `workflows/benchmark.source.ts`, `benchmark.ts` | Extract mechanics and converge to one small fixed guest entry; retire the template/duplicate generated workflow when no longer needed |
| `workflows/artifact_store.ts` | Reuse correct publication/log behavior behind record storage; remove broad protection and closure machinery rather than copying it wholesale |
| `scripts/deep_stage.py`, `reconcile_lifecycle.py`, `final_integrity.py` | Consolidate pending-work, reconciliation, and completion behavior into runner/store; remove seal, protected-state, and distributed coordination obligations |
| `scripts/benchmark_lib.py`, `write_once.py`, `validate_contracts.py` | Retain useful parsing, publication, and caller validation; remove duplicate implementations and abandoned contracts |
| `scripts/generate_schedule.py`, `analyze_paired.py` | Retain and extend as statistical owners, with explicit compatible randomizers/estimators |
| `scripts/aggregate_telemetry.py` | Keep native-to-summary accounting, unknowns, and recursion attribution without source-attestation dependencies |
| `scripts/generate_blind_map.py` | Simplify into grading input projection and label mapping; no cryptographic commit receipt |
| `scripts/verify_seal.py`, seal/delta schemas and tests | Not part of new-run execution. Retain an old read-only utility only for an actual historical inspection need; otherwise retire active code |
| `schemas/protected-state.schema.json`, protection fixtures/baselines/scans | Remove from the new runner and its acceptance gates; historical run artifacts remain unchanged |
| Runtime-capability, mechanism, budget-ledger, call-plan, workflow-request schemas | Replace with selected capability checks, optional evidence, internal scheduling, and the small operation contract; remove version-admission fields and tests along with dummy compatibility fields |
| Task, condition, grader, attempt, result, schedule, telemetry, adjudication schemas | Reuse valid field semantics within the resolved spec/result and private record validation; retain separate public schemas only for a real consumer |
| `workflows/runtime_canaries.ts`, canary scripts/receipt generators | Turn relevant cases into focused integration tests; remove per-run certification orchestration |
| Bundle builder, guest typecheck, workflow validation scripts | Keep transitional checks only while needed; retire private-layout checks once replaced; no new extension build |
| Historical replay/probe scripts and actor/adjudication fixtures | Keep cheap regression scenarios for supported branches; do not make them the architecture for every benchmark |
| `tests/test_helpers.py`, deep-runtime/adjudication tests, fake adapters | Port behavior to current interfaces; replace brittle source-string assertions with outcome checks |
| Malformed, boundary, known-good/bad, isolated-defect fixtures | Keep cases relevant to parsing, scoring, statistics, logs, and interruption; delete cases that only enforce removed subsystems |

Old run directories are data, not things to migrate automatically. New execution uses the new format. If an old format is not supported by the new report helper, return a clear message and point to the retained historical inspection path. Do not build a universal codec layer or resume old paid work under the new runner.

## 13. Implementation work packages

### WP0 - Establish the implementation baseline

- Read the current task-specific guidance and working-tree changes before editing.
- Capture the current public invocation and run the existing targeted helper tests once.
- Record actual failures separately from tests intentionally tied to removed requirements.
- Inventory callers/assets that need to remain reachable, especially the current fixed guest, statistical helpers, and historical report utilities.
- Build three initial fixtures: a minimal deterministic two-condition comparison, an interrupted comparison, and a balanced-schedule analysis mismatch.

**Exit:** a concrete regression baseline and a current asset/caller list. No provenance manifest or software-identity registry.

### WP1 - Define the small contract and records

- Define `run`/`report` inputs, compact result states, resolved specification, and internal record kinds.
- Implement configuration resolution, task-facing input copies, schedule storage, and record publication.
- Implement read-only report inspection before adding new live dispatch.
- Add one local lock, conservative resume, and checkpoint reconstruction.
- Ensure the minimal fixture needs no protected-state, software-identity, runtime-version, environment, component, or database configuration.
- Keep the file store authoritative. Establish the project-local dependency files and lazy-import seam; basic saved-report inspection works without numerical/model packages.

**Exit:** a fake run can be initialized, advanced, interrupted, resumed conservatively, and inspected through the intended interface.

### WP2 - Extract execution mechanics and shrink the guest

- Move deterministic stage planning, outcome mapping, and reconciliation from the giant guest into local helpers.
- Keep one fixed guest entry that dispatches prepared requests and records returns through the same helpers tested locally.
- Select the next bounded work internally; remove manual public stage/call-plan construction.
- Preserve native results, large-log handling, statuses, and the recursive no-custom-cwd adaptation where selected.
- Remove existing benchmark-imposed Pi/Fabric minimum-version refusals and version-discovery prerequisites. Retain only the public capability checks this dispatch path consumes; replace version-refusal tests with capability-focused behavior tests.
- Run the bounded source/file-invocation investigation. Document whether convenience source transport can be removed now or remains a later improvement.

**Exit:** the production-shaped fake path crosses a batch ceiling without source edits, duplicate calls, or model-authored orchestration. The fixed entry is materially smaller because mechanics left it, not because they moved into caller prose.

### WP3 - Grading and measurement

- Wire deterministic graders and reusable criterion fixtures.
- Add optional blinded model grading, individual label retention, and bounded conditional adjudication.
- Reconcile grader failures/missing results explicitly.
- Consolidate native telemetry projection with direct/inclusive/unknown accounting.
- Keep actor exposure and task reset checks conditional on the actual experiment.

**Exit:** objective-only and model-graded fake comparisons complete through the same run operation, with separate usage and honest failures.

### WP4 - Full statistical core and assignment correction

- Install and validate the released NumPy/SciPy/statsmodels core in the project-local environment. Keep record handling independent of those imports.
- Formalize the shared analysis dataset, units, failure mapping, primary/secondary contrasts, and result shape; reject non-finite numerical outputs or preserve a typed unavailable result.
- Replace overlapping handwritten numerical primitives with covered library calls where semantics match. Refactor multiplicity to process complete families through statsmodels.
- Implement compatible independent-block, task-vector, and existing balanced-cyclic randomization/inference contracts.
- Add exact/Monte Carlo inference with independent support/probability oracles and explicit computational limits.
- Preserve/extend task/family/stratified bootstrap, effect thresholds, non-inferiority, multiplicity, missingness, retry/reliability metrics, and sensitivity analysis.
- Add multi-condition fixtures and design-time precision/power exploration.
- Verify the old schedule/sign-flip mismatch is either corrected for that schedule or explicitly refused, never relabeled as exact.

**Exit:** all core rows in the method coverage matrix pass independently checked fixtures and the declared simulation checks.

### WP5 - Sequential and model-based statistical methods

- Implement finite prespecified sequential looks with valid per-look inference and declared error allocation.
- Integrate direct PyMC and compatible ArviZ through the lazy-loaded `analysis_models.py` seam, alongside statsmodels' supported Gaussian models. Validate the chosen data/diagnostic interface, dimensions, explicit sampler, and interval settings.
- Add a Python statistical backend only for an explicitly selected method outside that scope; do not introduce Bambi, JAX, or confseq merely for overlapping coverage.
- Add task/grader measurement models, fit diagnostics, identifiability checks, and sensitivity reporting.
- Test synthetic recovery, null behavior, small/degenerate samples, and failed fits.
- Keep the task-paired raw result visible in every model-based report.

**Exit:** the full-framework coverage matrix is complete for its declared supported methods. Intermediate core-only milestones are not called full statistical completion.

### WP6 - Live runtime checks and report integration

- Verify the requested launch capabilities on the installed runtime with a bounded, explicit non-scoring model budget; no version-based admission.
- Probe condition loading, returned identity/settings, native results/logs, cancellation/timeout, and a short checkpoint/resume sequence.
- Probe recursive execution only if that condition type is retained as supported in this cutover.
- Validate complete versus inconclusive/descriptive-only reporting and unsupported-method diagnostics.
- Prove report-only behavior with the model backend unavailable.
- Do not replay the expensive historical workload against live models merely to validate a refactor.

**Exit:** the actual launch and report paths work locally; tested runtime combinations and untested branches are stated accurately.

### WP7 - Rewrite the skill and cut over

- Rewrite `SKILL.md`, operations, scientific references, and README to the new interface and ownership rules.
- Preserve the full statistical reference; remove protection/source-identity/seal and Pi/Fabric version-floor requirements from active guidance, including skill compatibility metadata.
- Document the adopted dependency files, conditional model setup, file-only storage, and the selected library/custom-code responsibilities.
- Run static skill validation, Pi loading/discovery checks, invocation cases, and fresh-context design/run/report scenarios.
- Update current callers and remove obsolete entry aliases only after replacements work.
- Retire active code/tests belonging solely to removed subsystems.
- Leave historical result directories and unrelated concurrent edits alone.

**Exit:** one discoverable skill points to one current fixed runner, local commands are verified, and the active docs do not contradict this plan.

### Dependency order

```text
WP0 -> WP1 -> WP2 -> WP3 -> WP6 -> WP7
          \-> WP4 -> WP5 ---------^
```

Statistical work can proceed alongside dispatch extraction once the resolved input/result contract is agreed. Full cutover requires both the operational and full-statistical acceptance checks. Optional extension work is outside this dependency chain.

### Library and storage adoption order

1. **WP1:** establish the local environment/dependency declarations, shared dataset contract, file authority, and lazy import behavior.
2. **WP4:** adopt NumPy/SciPy/statsmodels primitives and family-level multiplicity with independent reference fixtures.
3. **WP4 then WP5:** validate the balanced assignment-law adapter before confirmatory use; build cluster intervals, non-inferiority, full-design power simulation, and finite-look decisions on the matching contracts.
4. **WP5:** add PyMC/ArviZ templates and diagnostics, including crossed labels, outcome-scale contrasts, and recovery/identifiability tests. Full-framework completion includes this work.
5. **Only if needed later:** add DuckDB for concrete cross-run questions, or evaluate SQLite against measured query/bookkeeping needs. Neither storage experiment blocks core cutover.

Keep expensive numerical fitting and MCMC separate from measured execution so analysis thread/CPU load does not contaminate latency comparisons.

## 14. Test and evaluation strategy

Use small checks that exercise the relevant behavior. A build/typecheck alone is not completion; neither is a large suite full of old source-string assertions.

### Mechanics and dispatch

- Minimal fixed-text comparison with deterministic grading and no optional subsystems.
- Multiple conditions and nested repetitions; complete ID reconciliation.
- Repeated invocation after completion produces zero calls and leaves results unchanged.
- Interruption before dispatch, after assignment, after result save, and before terminal/checkpoint publication.
- Lock contention and stale-lock recovery without replaying assigned IDs.
- Ordinary filesystem failures, missing parents, partial records, malformed native returns, and explicit unresolved state.
- Exact below/at/above call-ceiling cases, timeout/cancellation, and zero-call final analysis.
- Large native logs kept outside bounded model returns, including the historical multi-megabyte shape.
- Optional recursive parent, actor/non-actor, judge, and conditional-adjudication cases where supported.
- Read-only report on complete and incomplete runs without Fabric/model availability.

Keep the useful historical synthetic shape: six measured terminals, 96 judge calls and 18 adjudication calls in separate bounded invocations, plus large-log and interrupted-finalization cases. The 114 grading/adjudication calls are fake dispatches. This is an advanced regression, not required per-run procedure or permission to spend on live replay.

### Scientific validation

Use the method coverage matrix in section 10 as the statistical acceptance ledger. Include hand calculations, independent exhaustive enumeration, numerical reference cases, calibrated simulations, and pathological inputs.

Pay particular attention to:

- globally balanced assignment versus independent/task-vector permutations;
- weights and assignment probabilities;
- repeated trajectories incorrectly counted as independent tasks;
- asymmetrical failure/survivor filtering;
- non-inferiority sign and one-sided interval mistakes;
- multiplicity across both candidates and metrics;
- sequential peeking and budget-driven stopping;
- unstable bootstrap intervals and weakly identified models;
- missing grader labels incorrectly treated as agreement;
- task/grader replication inflating apparent sample size;
- approximation outputs incorrectly labeled exact.

### Adoption-specific validation

- Resolve/import the chosen released core and model dependencies in the local environment; confirm saved-report inspection works with optional backends absent. No runtime-version admission tests are added.
- Verify the balanced support counterexample, generating-path weights, remainder cycles, and conditional look laws with independent oracles. The earlier tiny scheduler probe is not full inferential validation.
- Check metric rescaling, floating-point ties, strict JSON/non-finite handling, unequal clusters, cluster-level BCa deletion, and degenerate intervals.
- Test complete-family multiplicity, one-sided non-inferiority boundaries, marginal versus simultaneous intervals, and the false-rejection rate of the full stopping policy.
- Report Monte Carlo uncertainty in null/coverage/power simulations with predeclared acceptance tolerances.
- Test Gaussian and binary model recovery, repeated graders on one output, disconnected grading designs, separation/singular fits, chain/draw preservation, predictive checks, prior sensitivity, rank-normalized split-chain convergence diagnostics, bulk/tail ESS, Monte Carlo error, and divergences. A diagnostic threshold is not proof of model correctness.
- Measure cold imports, fitting memory, numerical thread pools, posterior-artifact size, and reporting behavior on the actual local setup rather than claiming unmeasured footprint/performance.
- If DuckDB is introduced, test explicit types, nulls, duplicate joins, offline startup/spill behavior, and agreement with the validated Python dataset. If SQLite is proposed, compare actual bookkeeping/latency benefits and test transactional recovery without external-call replay. These checks remain conditional on adoption.

### Skill and local operation

- Positive prompts: compare prompts, benchmark a skill, run/resume a study, analyze paired results, inspect an interrupted run.
- Near-misses: one-off demonstrations, ordinary code review, broad research without a comparison, and requests that do not need agent benchmarking.
- Exercise each major branch in a fresh context. Verify the model invokes the fixed entry rather than inventing workflow source or grading policy.
- Check local source loading/invocation, relative links, compatibility wording, and exactly one skill discovery.
- Measure caller-facing friction: source/context volume, number of required manual artifacts, and number of orchestration decisions. Do not use file-count reduction alone as evidence of a better interface.

### Commands to establish during implementation

Document and verify exact commands in the local README for:

1. Python helper and record tests;
2. focused statistical tests and the fuller simulation/model suite;
3. fixed guest typechecking without extension emission;
4. fake dispatch end-to-end tests;
5. bounded live dispatch probes with an explicit output directory and model-call budget;
6. read-only report generation;
7. static skill validation and Pi invocation/discovery checks.

Do not add a package manager, build script, `check:ready` receipt framework, or CI system merely to aggregate these commands. Use an existing local test environment or a small project-local one where dependencies require it.

## 15. Cutover, rollback, and completion

### Cutover

1. Get the new mechanics and statistical paths passing against their fixtures before changing the active skill instructions.
2. Complete bounded checks of the requested capabilities on the installed runtime, with no benchmark-imposed version admission.
3. Update the existing skill's invocation and direct reference links. No resource registration change is needed if its path stays the same.
4. Confirm exactly one current runner is advertised and obsolete generated/template entries are no longer called.
5. Remove active protection/seal/source-identity code and outdated tests according to the disposition table, not indiscriminately by filename pattern.
6. Verify historical results remain readable through their retained inspection path where needed; do not automatically migrate or resume them.
7. Record the actual local commands, supported methods, selected statistical backend setup, and remaining limitations in README documentation.

### Rollback

Rollback changes the current source selection or skill pointer for future operations. It does not undo model spend or task effects and does not delete recorded attempts.

Stop active admission first, preserve unresolved work, and switch back only the refactor's own entry/configuration changes. Do not restore a whole working tree or overwrite unrelated work. Start a new run if changing the experiment rather than pretending it is a continuation.

### Definition of done

The refactor is complete when:

- the skill is a concise experimental guide backed by a working local runner;
- the model uses one fixed run/resume operation and read-only reporting;
- the selected live launch capabilities work on the installed runtime, and benchmark-imposed Pi/Fabric version admission has been removed;
- bounded execution, failure retention, conservative resume, objective grading, optional judgment, and native measurement work through the real interface;
- the full statistical framework is implemented and tested using the adopted NumPy/SciPy/statsmodels core and conditional PyMC/ArviZ backend, including the balanced-randomizer correction and declared model methods;
- files remain authoritative, basic saved-report inspection is backend-independent, and any optional database/query integration has an explicit demonstrated benefit rather than being a delivery prerequisite;
- experiment inputs remain fixed without a seal chain or software-identity subsystem;
- no protected-state/secrets/unrelated-files subsystem, mandatory infrastructure inventory, component, distributed coordinator, or extension build has been recreated under another name;
- the active documentation, fixtures, callers, and skill discovery agree with the new interface;
- remaining unsupported runtime options or statistical assumptions are stated rather than hidden behind a success label.

**Design rule:** keep the statistical depth; remove operational machinery that has no concrete job in this personal runner.

## Source context

The local sources describe the current implementation and methodological baseline:

- [Current skill](../../skills/agent-benchmarking/SKILL.md)
- [Protocol design](../../skills/agent-benchmarking/references/protocol-design.md)
- [Statistical analysis, including the known randomizer mismatch](../../skills/agent-benchmarking/references/statistical-analysis.md)
- [Grading](../../skills/agent-benchmarking/references/grading.md)
- [Historical failure-to-fix ledger](../../skills/agent-benchmarking/references/evidence/session-failure-to-fix.md)
- [Current Fabric mapping and its historical compatibility scope](../../skills/agent-benchmarking/references/architecture.md)
- [Fabric external provider documentation](../../npm/node_modules/pi-fabric/docs/providers.md)

Primary sources supporting the adopted library and storage choices:

- [Released SciPy resampling implementation and method documentation](https://github.com/scipy/scipy/blob/v1.17.1/scipy/stats/_resampling.py): standard permutation schemes, shared-index paired bootstrap, interval behavior, Monte Carlo and power primitives. The tag is a research citation, not a required runtime pin.
- [statsmodels multiplicity](https://www.statsmodels.org/stable/generated/statsmodels.stats.multitest.multipletests.html), [paired power](https://www.statsmodels.org/stable/generated/statsmodels.stats.power.TTestPower.html), [MixedLM](https://www.statsmodels.org/stable/mixed_linear.html), and [GLMM limits](https://www.statsmodels.org/stable/mixed_glm.html).
- [PyMC installation and sampler selection](https://www.pymc.io/projects/docs/en/stable/installation.html) and [ArviZ migration/interface guidance](https://python.arviz.org/en/stable/user_guide/migration_guide.html).
- [Howard et al., confidence sequences](https://arxiv.org/abs/1810.08240) and [confseq](https://github.com/gostevehoward/confseq): specialist sequential capabilities and assumptions, not substitutes for the benchmark assignment law.
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html), [Python sqlite3](https://docs.python.org/3/library/sqlite3.html), and [WAL behavior](https://www.sqlite.org/wal.html).
- [DuckDB JSON queries](https://duckdb.org/docs/current/data/json/overview), [private in-memory Python connections](https://duckdb.org/docs/current/clients/python/overview), and [embedded concurrency](https://duckdb.org/docs/current/connect/concurrency).

Documented library capabilities are not proof that the new integration or numerical calibration already passes. The work packages own those behavioral checks.

The existing skill still describes the old implementation until the work packages update it. This plan defines its replacement; links to old guidance do not reintroduce removed requirements, including obsolete runtime version floors.
