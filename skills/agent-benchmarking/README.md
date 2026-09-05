# Agent benchmarking

This skill designs, executes, resumes, grades, measures, analyzes, and reports controlled agent comparisons. It has one fixed Fabric guest, one file-backed Python lifecycle, and one read-only report operation. Statistical sophistication stays behind that small interface.

## Setup

Use the skill-local environment only:

```sh
cd /home/balauru/.pi-profiles/fabric/skills/agent-benchmarking
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
# Required only when a selected Bayesian method needs PyMC/ArviZ:
.venv/bin/python -m pip install -r requirements-models.txt
.venv/bin/python -m pip check
```

Never install these packages into system Python. The core requirements are NumPy, SciPy, and statsmodels. Model imports are lazy, so saved-report inspection does not require any numerical backend.

## Public operations

### Run or resume

Create a strict resolved experiment spec matching [`schemas/spec.schema.json`](schemas/spec.schema.json). Paths inside the spec are safe relative paths resolved from the source spec directory. Use a new absolute output directory.

Execute the exact bytes of [`workflows/benchmark.ts`](workflows/benchmark.ts) as a fresh, dedicated `fabric_exec` program with `agentBudget: 1` and one named payload:

```json
{
  "agentBudget": 1,
  "payloads": {
    "request": "{\"specPath\":\"/absolute/experiment/spec.json\",\"outputDirectory\":\"/absolute/runs/run-001\"}"
  }
}
```

The request has exactly `specPath` and `outputDirectory`. The guest validates selected request behavior, obtains internally admitted work from `scripts/run.py`, calls public `agents.run`, and publishes complete native returns through the same lifecycle. The caller does not choose phase, wave, call plan, grader batch, lock, or repair action.

If the result is `checkpoint`, execute the identical guest bytes with the identical request in a fresh dedicated invocation. A completed request returns its saved result with zero model calls. A changed spec is a new experiment and requires a new output directory.

For local tests, `scripts.run.run(request, dispatch=fake)` exposes the same lifecycle with an injected dispatch callable. It is not a second production execution path.

### Report

The dictionary interface is:

```python
report({"outputDirectory": "/absolute/runs/run-001", "format": "json"})
```

The command-line view is:

```sh
.venv/bin/python -B scripts/run.py report \
  --run-dir /absolute/runs/run-001 \
  --format markdown
```

Reporting performs no dispatch, capability/backend check, deterministic repair, lock removal, or run-directory write. It can inspect a partial run and returns an explicit blocked state for an ambiguous assigned attempt or grade job.

Both operations use the compact strict result in [`schemas/result.schema.json`](schemas/result.schema.json). Execution status (`complete`, `checkpoint`, `blocked`, `unsupported`, `failed`) and scientific decision (`adopt`, `retain-control`, `inconclusive`, `descriptive-only`, or null) are separate.

## Resolved specification

The spec records all behavior that can change the comparison:

1. question role, finite-task or task-population scope, sampling frame, and target;
2. task IDs/prompts/weights/families/strata/input paths/outcome definitions;
3. condition runner/model/instructions/instruction paths/tools/settings/intervention;
4. repetitions, condition order, assignment law, seed, and concurrency;
5. deterministic or calibrated blinded grading, score mapping, and optional disagreement adjudication;
6. metrics, contrasts, randomization, bootstrap, decision margins, multiplicity, finite looks, retries, reliability, missingness, grader uncertainty, sensitivity, models, and precision/power;
7. task/repetition/direct-call/retry/wall-time and observational token/cost budgets.

Ordinary defaults are explicit in the spec. No protected-root declaration, environment inventory, software identity, runtime version, component, database, or dummy browser/account field is required. The lifecycle validates cross-references and method compatibility before output mutation, copies task-facing inputs under `inputs/`, rewrites those paths in saved `spec.json`, and detects source changes on resume.

## Architecture and records

| Owner | Responsibility |
| --- | --- |
| `workflows/benchmark.ts` | Small fixed guest: one-call invocation and public `agents.run` mapping |
| `scripts/run.py`, `lifecycle_store.py` | Strict operations, local lock, admission, records, conservative resume, finalization |
| `generate_schedule.py` | Saved schedule and assignment contract |
| `grade.py` | Objective grades, blinded jobs, strict label parsing, disagreement planning |
| `aggregate_telemetry.py` | Native identity/settings/usage/time/cost projections and ownership |
| `analyze_paired.py`, `analysis_engine.py`, `statistical_core.py` | Dataset checks, estimands, randomization/bootstrap/decision/sensitivity methods |
| `analysis_models.py` | statsmodels and lazy PyMC/ArviZ model methods |

Files are authoritative; no database is used. The essential publication order is:

```text
spec.json + schedule.json
  -> attempts/<id>/assignment.json
  -> attempts/<id>/result.json (+ optional native.log)
  -> grading/jobs/<job-id>/{assignment,result}.json and grading/grade-*.json when selected
  -> attempts/<id>/terminal.json
  -> telemetry.json + analysis.json
  -> report.md
  -> report.json
```

Assignments, results, terminals, frozen grading plans, grade-job records, individual grades, analysis, telemetry, and final reports are create-only. `checkpoint.json` is a replaceable cache. Counts are reconstructed from the schedule and records.

An assignment without a complete result is ambiguous and never automatically replayed. A complete result without a terminal or grade projection is recoverable using deterministic local work and no new model call. Retries receive linked new IDs and preserve the failed parent. Finalization requires exact planned attempt and grade-job IDs and rejects extras, contradictions, and partial records.

Measured, retry, judge, and adjudicator calls share the global direct-call budget. The fixed guest configures itself for at most **one** native call in each fresh dedicated `fabric_exec` invocation; use `agentBudget: 1`. It does not discover or invent the host maximum or a shared remaining allowance. Never embed it after other agent calls. Python also applies its conservative 100-call upper bound, but larger fake-dispatch windows are not evidence of native capacity. Native Fabric results are authoritative. Available absolute native logs are streamed beside their record; unknown identity, tokens, timing, cost, or log state remains unknown rather than zero.

## Grading

Deterministic grading is the default and produces zero judge/adjudicator calls. The reusable objective fixture matrix includes known-good, known-bad, isolated-defect, boundary, and malformed cases and rejects constant evaluators.

Model grading requires frozen calibration inputs, a blind rubric, labels and score map, grader repetitions, and uncertainty retention. Job projection omits condition/model/provider/price/timing/order/prior scores. Every expected criterion must appear exactly once in strict JSON. Individual valid, abstained, malformed, missing, and failed observations remain visible. Declared disagreements alone produce a finite frozen adjudication plan. These jobs use the same fixed guest and budget as measured calls.

Human grading is represented in the schema but the current runner has no human-label input channel. Selecting it returns `unsupported` before scored dispatch. This is a truthful limitation, not claimed method coverage.

## Selected task state

Declared input files are copied into separate attempt workspaces, never linked to the frozen `inputs/` snapshot. Optional `taskState` runs its concrete Bash `setupCommand`, `resetCommand` and `verifyCommand` for every attempt, including retries. Readiness evidence and command logs are saved beside that attempt. State-dependent attempts follow saved schedule order serially; ordinary text comparisons acquire no universal reset gate. A failed readiness command produces a terminal infrastructure failure and invalidates the run without replay. See [execution lifecycle](references/execution-lifecycle.md).

## Statistical method coverage

The table maps scientific capabilities to implementation and focused tests. It is not a blanket correctness or completion claim; the acceptance ledger below distinguishes observed evidence from outstanding checks. Each experiment runs only its selected methods.

| Capability | Implementation | Behavioral evidence |
| --- | --- | --- |
| Task-paired means, summaries, weights, directions | NumPy/SciPy plus custom units and failure mapping | `test_analysis_core.py` hand calculations, unequal/missing cells, multi-condition summaries |
| Design-time precision/power | Supported production-policy NumPy simulation with SciPy/statsmodels references | `test_analysis_simulation.py` known regimes, MC uncertainty, tasks versus repetitions |
| Independent-block and task-vector randomization | Explicit allocation law and statistic | `test_randomization.py` exhaustive supports, observed allocation, tails/ties |
| Balanced-cyclic randomization | Joint custom support with generator path multiplicities | Four-versus-six-versus-sixteen oracle, weighted/remainder cases in `test_randomization.py` |
| Multi-condition exact/Monte Carlo inference | Design-law adapter, seeded sampling, explicit MC uncertainty | Exact and sampled fixtures in `test_randomization.py` |
| Task/family/stratified cluster bootstrap | Whole-cluster percentile/BCa and cluster deletion | Cluster, strata, family, and degenerate BCa cases in `test_analysis_core.py` |
| Practical superiority and non-inferiority | Saved direction/margin and one-sided decision policy | Boundary/crossing cases in `test_analysis_core.py` |
| Multiplicity | statsmodels Bonferroni/Holm/BH/BY over complete family | Hand references and family refusal in `test_analysis_core.py` |
| Sequential designs | Finite-look allocated-alpha controller over valid per-look tests | Full-policy null calibration and illegal-look cases in `test_analysis_simulation.py` |
| Missingness and sensitivity | Complete status mappings, bounds, retry and concentration drivers | Adversarial status/sensitivity fixtures in `test_analysis_core.py` |
| Reliability | First-attempt, production-retry, pass-at-k and all-k estimands | Combinatorial boundaries and heterogeneous tasks in `test_analysis_core.py` |
| Grader uncertainty | Individual labels, bounds, disagreement/adjudication and crossed designs | `test_grading.py`, `test_run.py`, and crossed-label model fixtures |
| Hierarchical/Bayesian/crossed models | statsmodels Gaussian; PyMC/ArviZ Gaussian and Bernoulli | Independent weighted-prediction/diagnostic oracles; strict Bernoulli recovery remains red |
| Reporting and decisions | Standard-library reader and explicit limitations/decisions | `test_run.py` complete/partial byte snapshots and backend-independent tests |

A general frequentist binary GLMM is not silently approximated and returns method-specific `unsupported`; supported Bayesian Bernoulli and Gaussian model rows execute their declared methods. Missing selected model packages similarly produce one actionable non-success result while retaining the paired analysis.

## Acceptance evidence

**Full acceptance is blocked, not complete.** The exact fixed guest now completed a valid four-call native process fixture and a zero-call completed resume. Statistical failures and required unsupported methods remain open; fresh-context skill scenarios still need valid replacement evidence. [Repair evidence](../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/repair-evidence.json) retains earlier phases; [the live audit](../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/live-audit.json) records the newer native checks.

| ID | Observed evidence | Remaining limitation or check |
| --- | --- | --- |
| A01 | Short skill, exact-source fake guest, explicit profile-local Pi discovery | Valid fresh-context design/run/resume/report scenarios |
| A02 | Effective schema checks, observed authorized process profile, one-call guest at host budget 1 | Shared-window or higher-throughput native allowance is not claimed |
| A03 | 205-job fake checks; native checkpoints at 1/2/3 attempts and completion at 4 | Larger native windows are not validated |
| A04 | Interruption, duplicate, stale-lock, immutable publication and failed-fit count regressions | Real interrupted native run remains untested |
| A05 | File-only fake fixtures and four native isolated coding attempts with retained final-state checks | This smoke is not evidence for every task mechanism |
| A06 | Objective/blinded grading, calibration transport, adjudication precedence and individual-label integration | Human label input is not implemented |
| A07 | Repaired estimands, resampling, policy and executable sensitivity scenarios | Full selected-design simulation and executable transforms remain incomplete |
| A08 | Independent cyclic/path-weight/Williams oracles; impossible schedules refused in exact and MC modes | Evidence is for the declared conditional laws, not historical reinterpretation |
| A09 | Sequential allocation, missingness precedence, sensitivity and simulation regressions | Some selected simulation processes are explicitly unsupported |
| A10 | Read-only complete/partial reports, no-backend inspection and real model artifact integration | Fresh-context report invocation remains unverified |
| A11 | Authoritative-schema fake guest, exact-source typecheck and five native guest invocations | Native evidence uses explicit process transport and a fresh one-call contract |
| A12 | One profile-local skill; old runner retired; all 33 legacy fixture assets mapped, 30 restored and only 3 protection-only cases retired | Fifteen restored assets remain historical input data; misrouted fresh-context sessions remain invalid |
| A13 | Actual fits, complete diagnostics, independent prediction/target oracles and 800 frozen Gaussian calibration replicates | Bernoulli recovery and crossed-Gaussian coverage fail; population/quantile/transformed targets remain unsupported |
| A14 | Four-call live run completed; completed resume and report preserve every run byte/entry/mtime | Full acceptance still depends on the open method and fresh-context checks above |

### Repair checks and scientific findings

- Main observed **30** stable grading/measurement/baseline/legacy checks, then **50** targeted lifecycle/integration/model-audit checks. After further fixes, **36** lifecycle/target/state checks and **28** target/core/integration checks passed. These overlap and must not be summed as a unique full-suite count. The exact fixed guest and explicit profile-local SDK loader also passed their separate checks.
- Independent audit regressions now cover sequential decisions using allocated look thresholds, stratified BCa, observed allocation membership in Monte Carlo, executable alternative scenarios, full-policy simulation within its supported scope, global missingness precedence, weighted finite-task Gaussian predictions, and nonfinite Bayesian diagnostics.
- Finite-look null calibration used the predeclared seed **713021**, **1,200** simulations, looks at **6/8** tasks and alpha **.025** each. It rejected **34/1200** (2.8333%; MCSE 0.4790%; exact 95% interval 1.9700–3.9369%) with **21** interim stops. The predeclared ceiling was 6.8875%. This is evidence for that policy, not the entire framework.
- Four strict scientific model fits used **4 chains**, **1,500 tuning** and **2,000 retained draws per chain**, once. All had R-hat <1.002, bulk ESS >1,670, tail ESS >2,187, relative MCSE <.025 and zero divergences. Gaussian effect/null and Bernoulli null checks passed. **Bernoulli effect recovery failed:** truth .20583, estimate .14369, 95% interval [.09384, .19053]. No seed/tolerance was changed and no unchanged stochastic fit was rerun to obtain a favorable result. Good diagnostics do not erase this red test or establish coverage.
- Gaussian finite-task predictions use task slopes and joint fixed/random prediction covariance, with fitted variance components treated as known. Frozen calibration used seed **202609051**, **400 replicates per design**, nominal coverage .95, a minimum **.917308** (three Monte Carlo standard errors), and maximum failed-fit fraction .025; failures count as noncoverage. Correlated-task effects passed at **376/400 (.94), zero failures**. Crossed independent components failed at **366/400 (.915), nine failures**. The known-variance oracle on the same crossed datasets covered **388/400 (.97)**. These findings do not establish calibrated plug-in uncertainty. Lifecycle target selections remain explicit; unsupported substitutions are refused before dispatch.
- For the failed Bernoulli dataset, an independent binomial-convolution diagnostic found raw weighted rate difference **.153095** and sampling tail **.0492249**. Independent Beta(1,1) cell posteriors also excluded truth from their 95% interval. This motivates reviewing the per-dataset recovery criterion, not changing its seed/tolerance or marking it passed. The [independent adjudication](../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/scientific-adjudication.md) reproduced all nine Gaussian failures with unchanged settings and found no evidence that stale warnings caused them. It recommends retaining both failed gates, not switching estimators or relaxing rejection to cross the observed cutoff.
- The original five fresh scenario sessions used a misrouted child setup; all three positive scenarios actually read an out-of-scope skill. They remain explicitly invalid in [the scenario evidence directory](../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/INVOCATION-INVALID.txt), not evidence for this skill. No measured benchmark calls had been spent at that earlier stage.
- A subsequent explicit `transport: "process"` probe observed both child profile environment variables pointing to the authorized profile. The live fixture froze that transport and completed exactly **four measured calls** through unchanged guest bytes/request across four dedicated invocations, each with host `agentBudget: 1`. Every attempt retained successful setup/reset/verify stages, its own workspace, corrected executable task code, and an archived native log. A fifth completed invocation made **zero** model calls; its run entries, bytes and mtimes, and those after read-only reporting, were unchanged. The scientific decision was **inconclusive**, not adoption. See [live audit](../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/live-audit.json).

### Supplementary Bernoulli calibration

The [predeclared fixed-seed plan](../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/bernoulli-calibration-plan.md) freezes 400 effect and 400 null datasets, original strict sampler settings, failure-inclusive coverage/recovery and null-error gates. Five deterministic harness tests pass, including a red-capable 366-versus-367 coverage boundary and no-retry continuation.

The first bounded batch ran exactly **two** new production fits once, about **42/41 seconds**. Both had usable diagnostics. The effect case missed recovery (truth **.205877**, estimate **.107771**, interval **[.059413, .154732]**); its independent raw difference was **.106786**. The null case passed its individual coverage/recovery checks. The [saved summary](../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/bernoulli-calibration-v1-summary.json) is **incomplete: 2/800**, not a calibration success. The subsequent instruction authorized completing all remaining 798 cases. One retained local worker now runs that continuation with a 16-hour safety bound and no retry loop; completion is recorded in `bernoulli-calibration-v1-completion.json` beside the study. The first-batch summary remains historical until the automatic final audit updates it. No original seed, estimator or acceptance criterion was changed, and A07/A13 remain open.

### WP7 fixture preservation

[Every legacy fixture disposition](../../docs/agent-benchmarking-refactor/fixture-disposition.md) is recorded explicitly. Thirty relevant assets were restored byte-for-byte; fifteen are consumed by new current-interface tests. Only three protection/seal-only assets remain deleted. The restored unknown-option fixture caught silent policy-field acceptance; standalone paired analysis now enforces the authoritative resolved-spec schema before inference. Old stage-request fixtures are retained data, not an advertised execution alias.

### WP0 preservation and regression baseline

Before refactoring, the helper suite ran **71 tests with 7 failures in 6.217s**. The observed failures came from the old private `guest-types` chunk-discovery path, including resume/finalize and runtime-canary checks. This is a baseline implementation failure, not evidence that those behaviors can be discarded. Protection, version-admission, seal and certification-only policy assertions are intentionally retired separately; reusable interruption, grading, native-return and statistical behaviors belong in the replacement tests.

The bootstrap's claimed `.tmp-agent-benchmarking-wp0` backup was not present during recovery. The original six changed skill/runner/test/doc files were recovered losslessly from the pre-edit session result, and the two existing evidence-file changes were retained and added to [the eight-file user-work patch](../../docs/agent-benchmarking-refactor/pre-refactor-user-changes.patch). `git apply --numstat` validates that patch without applying it. Do not apply it to the active refactor or describe the absent temporary path as preservation evidence.

The initial fixtures live in [tests/fixtures/refactor](tests/fixtures/refactor): minimal deterministic comparison, interrupted assignment without result, and an independent balanced-law mismatch oracle. [test_refactor_baseline.py](tests/test_refactor_baseline.py) exercised all four baseline assertions. The source/caller inventory below distinguishes retained owners from the old generated stage runner; historical evaluation directories are data and are not migration targets.

### Earlier integration-recovery checks

These precede the repair evidence above and are not final acceptance totals.

- Python discovery: **92 tests, 90 passed, 2 failed**, 25.515s. The two failures were an equivalent generating-formula string and an obsolete unsupported-counterbalance message. Both were corrected to the actual numeric law/required-conditioning contract; the two targeted checks and two historical-reader checks then passed.
- Exact fixed guest fake harness: **4 checks passed**. Independent source inspection nevertheless found unsupported Fabric request fields, so this alone does not verify live dispatch.
- Public profile-local Pi SDK: one `agent-benchmarking` discovery, zero target diagnostics, and all traversed local Markdown links exist, with **zero model calls**. This uses the supported package export. The separately installed global SDK export failed to import an optional `pi-server` dependency; no runtime installation was changed to conceal that failure.
- Real model tests reported cold imports **0.868s**, max RSS **385,584 KiB**, **31 threads**, two OpenBLAS pools of 16 threads, Gaussian fit **1.672s**, Bernoulli fit **0.439s**, and separate posterior files of **183,440 / 292,998 bytes**. These are local measurements, not footprint guarantees.

[Validation commands](references/validation.md) separate small checks from the fuller model/simulation suite. Do not run the entire acceptance suite before each personal benchmark.

## Current limitations

- The verified native route uses explicit Pi `settings.transport: "process"` and a fresh one-call guest invocation with `agentBudget: 1`. Profile inheritance for other transports, shared-invocation remaining allowance, and higher-throughput native windows are not established. No second launcher, runtime patch or inferred host maximum was added.
- `mechanismObservation` has no executable observer and is explicitly unsupported before dispatch. Schema presence is not implementation.
- Model predictions currently target conditional saved finite-task means/rates, not a new-task population, median or quantile. Fitted Gaussian variance components use plug-in uncertainty, not fully calibrated variance-component uncertainty.
- No executable metric transformation is defined. Selecting a transformed metric/estimand is refused; `transformed-mean` no longer silently aliases a raw mean. This required capability remains a delivery gap.
- Production-policy simulation does not yet generate selected model, retry or grader processes, saved alternative-outcome scenarios, or additional task units outside the supplied population. These branches are explicitly unsupported rather than silently disabled.
- Human grading has no input channel and is unsupported before scored dispatch.
- A selected recursive hard descendant cap is unsupported when the installed runtime cannot enforce it. Post-hoc usage is not enforcement.
- Cost/token limits are observational unless the selected backend proves pre-consumption enforcement; unknown and overshoot are reported.
- Old-format paid runs are not migrated or resumed by this lifecycle. Their directories remain data and must stay unchanged.

## Local source and test index

The human implementation index belongs here, not in the normal skill prompt:

- Execution: [fixed guest](workflows/benchmark.ts), [run/report bridge](scripts/run.py), [record lifecycle](scripts/lifecycle_store.py), [strict stdlib primitives](scripts/benchmark_lib.py).
- Scientific owners: [schedule and laws](scripts/generate_schedule.py), [analysis entry](scripts/analyze_paired.py), [dataset and policy](scripts/analysis_engine.py), [numerical adapters](scripts/statistical_core.py), [model adapter](scripts/analysis_models.py).
- Grading and measurement: [graders and judgment plans](scripts/grade.py), [native telemetry](scripts/aggregate_telemetry.py).
- Contracts/setup: [spec](schemas/spec.schema.json), [public result](schemas/result.schema.json), [historical schedule-row format](schemas/schedule-row.schema.json), [core requirements](requirements.txt), [selected model requirements](requirements-models.txt).
- Checks: [task state](tests/test_task_state.py), [model targets and failure counts](tests/test_model_target.py), [production-helper integration](tests/test_integration.py), [lifecycle](tests/test_run.py), [fixed guest](tests/test_fixed_guest.mjs), [assignment oracles](tests/test_randomization.py), [paired core](tests/test_analysis_core.py), [calibrated simulation](tests/test_analysis_simulation.py), [model fits](tests/test_analysis_models.py), [grading](tests/test_grading.py), [measurement](tests/test_measurement.py), [public skill loader](tests/test_skill_loading.mjs), [historical reader](tests/test_legacy_report.py), [grading fixtures](tests/fixtures/grading/README.md).
- Historical access: [read-only saved-report helper](scripts/inspect_legacy_report.py), [historical failure ledger](references/evidence/session-failure-to-fix.md), [historical decisions](references/evidence/decision-ledger.md), [historical research](references/evidence/external-research.md), [historical cleanup context](references/evidence/migration-cleanup.md). No old paid execution is resumed.

The old generated/template guest, manual prepare/judge/adjudicate/finalize entry, private runtime doctor, protection/seal/identity helpers, and their policy-only fixtures are retired from the active path. Their historical outputs and preserved user patch are not a second current runner.
