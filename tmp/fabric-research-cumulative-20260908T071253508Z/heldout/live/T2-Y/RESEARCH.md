# Fixed-model coding-agent run design: decision guide

**Scope and research date.** This guide addresses run-design changes, not model or reasoning-effort changes: context selection, tool feedback, validation/repair, whole-run retries, and decomposition. It is based on the retained primary evaluations inspected for this report and the supplied [local R1 notes](streams/s1.md) and [local R2 notes](streams/s2.md). Evidence cutoff: **2026-09-07**. Most direct evidence is Python issue repair on SWE-bench-family or Defects4J tasks with test-based resolution.

## Executive decision

**Adopt no run-design change globally from the literature alone.** The evidence supports evaluating bounded context and structured edit/test feedback first, then validation and retry policies as separate economic choices. In one fixed GPT-4-Turbo SWE-agent harness, concise context and a purpose-built interface outperformed larger/raw alternatives. In a fixed GPT-4o Agentless pipeline, executable reproduction-test selection improved resolution, but only when a generated test was usable and at additional cost. Independent retries improve the chance that *any* run succeeds, but create a different latency/cost product policy rather than improving a single attempt.

A production change should advance only after a locked, paired, fixed-model evaluation reproduces a verified benefit on both a static holdout and newer local holdout, with evaluator integrity and resource limits intact. A benchmark pass-rate increase alone is insufficient. There is no retained evidence for a universal context size, optimal retry count, causal benefit of decomposition alone, or a security effect.

## R1. Primary evaluations of run-design choices

### 1. Context selection and tool feedback

[SWE-agent](https://arxiv.org/html/2405.15793) provides the clearest same-model interface ablation. It used `gpt-4-1106-preview` (GPT-4 Turbo) on all **300 SWE-bench Lite** tasks, under a **$4 per-instance** cap. Resolution is the share whose patch passes the benchmark tests. Its reported dollar figure is API inference cost averaged over *successfully resolved* instances, so it is not comparable to per-task costs below.

| Exact contrast in this evaluation | Outcome | What it establishes and does not establish |
|---|---:|---|
| Full ACI versus shell-only agent, same GPT-4 Turbo and Lite task set | **18.0% (54/300)** versus **11.0%**, +7.0 pp | The tested tool/interface package matters. This is not a one-factor test of any individual tool feature. |
| Summarized search versus iterative search versus no search | **18.0%** versus **12.0%** versus **15.7%** | More interaction/retrieval was harmful in this budgeted harness. The paper attributes iterative search failures to inspecting too many matches and exhausting context or budget. |
| 100-line viewer versus 30 lines versus full file | **18.0%** versus **14.3%** versus **12.7%** | A bounded viewer beat both smaller and full-file alternatives here. It does not establish 100 lines as a portable optimum. |
| Last five observations versus full history | **18.0%** versus **15.0%**, +3.0 pp | Recency-bounded context can outperform full trajectory retention in this configuration. |
| Editor with linting versus editor without linting versus no edit interface | **18.0%** versus **15.0%** versus **10.3%** | Syntax/edit feedback and a compact editor were useful in this interface. This measures functional resolution, not security. |

The full ACI's reported average cost was **$1.67 per resolved Lite instance**. Because the cap auto-submitted existing edits after an over-budget run, performance and resource policy are coupled. Treat these results as a directionally strong reason to test bounded, deduplicated tool observations and structured immediate feedback, not as a drop-in configuration.

### 2. Validation and repair

[Agentless](https://arxiv.org/html/2407.01489) isolates a candidate-selection change within its fixed GPT-4o (`gpt-4o-2024-05-13`) SWE-bench Lite pipeline. It generates 40 patch candidates and changes the selector. These are matched for its pipeline and task set, but they are not a comparison to a one-candidate interactive repair loop.

| Selector, same pipeline/model/300 Lite tasks | Resolved | Incremental reported inference cost per task | Interpretation |
|---|---:|---:|---|
| Majority vote | **77/300, 25.67%** | **$0.00** | Baseline selection rule. |
| Regression-test filtering | **81/300, 27.00%** | **$0.01** | +4 tasks, +1.33 pp over majority vote. |
| Regression plus generated reproduction tests | **96/300, 32.00%** | **$0.25** | +19 tasks, +6.33 pp over majority vote, and +15 tasks, +5.00 pp over regression only. |

The test signal is conditional. Only **213/300** generated reproduction tests emitted the expected reproduction message on the original repository. A test that reproduces the issue can still be an incorrect specification, which is why the authors additionally checked against the ground-truth patch. Thus validation is an evidence-producing mechanism only where the failure signal is relevant and reproducible. The paper reports **$0.70 average inference cost** for its complete 32% pipeline, but that packages localization, retrieval, candidate sampling, test generation, ranking, and execution. It is not the cost of decomposition or validation alone.

[AutoCodeRover](https://arxiv.org/html/2404.05427) supplies a related but confounded package test. On 300 Lite tasks with `gpt-4-0125-preview`, base ACR resolved **57/300 (19.0%)** at **195 s, 37k tokens, $0.43 per task**. ACR-SBFL resolved **66/300 (22.0%)** at **250 s, 40k tokens, $0.47 per task**. It combines spectrum-based suspicious-method hints, complete developer-test validation, and up to three repair attempts. The +9 tasks/+3.0 pp result cannot be attributed separately to static-analysis feedback, test feedback, or retries. It applies where developer tests are available.

### 3. Retries

AutoCodeRover also measures independent complete runs, not serial test-directed repair. With the same model and task set, its Lite `@1` result was **57/300 (19.0%)** versus **78/300 (26.0%)** for `@3`: +21 tasks/+7.0 pp. Resources changed with the policy: **195 s, 37k tokens, $0.43 per task** at @1 versus **520 s, 112k tokens, $1.30 per task** at @3. On full SWE-bench, it reports **285/2,294 (12.42%)** at @1 versus **422/2,294 (17.96%)** at @3, with $0.45 versus $1.39 per task.

This is evidence that extra independent candidate opportunities can buy success at roughly tripled model-token spend. It is not evidence that the third candidate was correctly selected in deployment, that three repair turns have the same effect, or that @3 has the same latency/cost operating point as @1. A deployed retry policy must be measured and reported as such.

### 4. Decomposition and localization

Agentless is important counterevidence to a claim that unrestricted autonomous interaction is necessary. Its staged localization → sampled diff repair → generated-test validation → ranking package reaches **96/300 (32.0%)** on Lite at the reported **$0.70 average inference cost**. But it simultaneously changes retrieval, edit representation, candidate count, validation, ranking, and evaluation setup. It is package-level evidence only, not a causal estimate for “decomposition.”

[RepairAgent](https://arxiv.org/html/2403.17134) offers a smaller context/localization ablation: GPT-3.5-0125 on a random **100-bug Defects4J** sample. Its default fixed **21** bugs, while a realistic GZoltar localization condition fixed **16**, a 25% reduction, and cost **$29**, reported as 81% above default. The study also reports that removing search tools fixed about half as many bugs and doubled cost. Much of the default setup uses oracle-like bug information. Therefore this source is a warning: localization and context gains measured with privileged bug signals may not survive noisy production localization, especially under an unchanged cycle budget.

## R2. Counterevidence, reliability, leakage, and evaluator limits

### Evaluator pass is not full correctness

[Wang, Pradel, and Liu (ICSE 2026)](https://arxiv.org/html/2503.15223v2) audited initially passing patches from CodeStory, LearnByInteract, and OpenHands on the 500-task SWE-bench Verified set. The standard evaluator runs PR-modified test files. Re-running all available developer tests caused **7.8%** of plausible patches to fail additional tests and reduced the three agents' mean resolved rate by **4.5 pp**: CodeStory **62.2% → 57.0%** (-5.2 pp), LearnByInteract **60.2% → 55.6%** (-4.6 pp), and OpenHands **53.0% → 49.2%** (-3.8 pp). Convention-only failures were excluded.

Their PatchDiff method found behavioral divergence from the oracle patch in **260/877 (29.6%)** plausible patches. This is not an incorrect-patch rate. Of 77 manually assessed suspicious patches, 51 remained uncertain due to underspecified requirements. The paper extrapolates **11.0%** incorrect plausible patches and **6.4 pp** mean resolved-rate inflation, but that estimate depends on the sample representing all suspicious patches and on PatchDiff detection coverage. PatchDiff cost **$0.105 per patch ($91.716 total)** with two repair iterations and **$0.039 per patch ($33.962 total)** with no repair iterations, under its GPT-4o-mini test-generation configuration and historical prices. It also needs an oracle patch and test patch, so it is an offline audit technique, not a normal production acceptance oracle.

### Run variance changes what a credible gain is

[On Randomness in Agentic Evals](https://arxiv.org/html/2602.07150) ran ten independent evaluations for each configuration on SWE-bench Verified, covering three models, two scaffolds, six configurations, 60,000 trajectories, 25.58B tokens, and 1.88M tool calls. Nominally identical configurations had **2.2–6.0 pp** single-run pass@1 ranges, with standard deviations above **1.5 pp**, including at temperature 0. Examples at temperature 0 are DeepSWE-preview/nano-agent **20.4 ± 1.0%** (18.2–21.4%) and Qwen3-32B/R2E-Gym **22.3 ± 1.8%** (19.8–25.2%). The study observed early trajectory divergence even at temperature 0.

Its median-variance power calculation says a 1 pp difference needs approximately **36 runs per agent** for 80% power, while a 2 pp difference needs about 9. Those are study-specific, not a mandated production sample size. Its up-to-**24.9 pp** gap between optimistic `pass@5` and pessimistic `pass^5` demonstrates that retries define different product policies. Do not call the best of several tries pass@1.

### Static and fresh benchmarks do not identify a common capability level

The original [SWE-bench](https://arxiv.org/html/2310.06770) metric requires a patch to apply and pass task-specific fail-to-pass and pass-to-pass tests. It used repository-disjoint training data to reduce contamination in its own training setup and proposed later tasks for temporal robustness. Those precautions support leakage concern, but do not establish whether any closed model saw a particular task.

[SWE-bench-Live](https://arxiv.org/html/2505.23419) built **1,319** Python issue-resolution tasks from **93** repositories, dated January 2024 through April 2025. It repeats test execution and retains only tasks with consistent transitions, reducing task flakiness. Under its stated settings, OpenHands + Claude 3.7 Sonnet scored **43.20%** on SWE-bench Verified but the highest score on SWE-bench-Live was **19.25%**. The 23.95 pp difference is a transfer warning, not a leakage measurement or model-independent ranking: repositories, tasks, dates, environments, and difficulty differ. Freshness reduces exposure risk but cannot prove the absence of public issue/PR exposure or model contamination.

### Consequences for interpretation

- Test success measures the supplied test oracle, not all intended behavior, maintainability, or security.
- Benchmark costs use different denominators and historical prices. Keep tokens, tool calls, test executions, wall time, and per-task cost separate. Do not normalize the paper dollars into a common ranking.
- Most direct intervention evidence uses public Python repair tasks. Transfer to other languages, proprietary repositories, feature work, and interactive tasks is unmeasured.
- Published interventions often bundle multiple changes. Do not infer a one-factor mechanism from a multi-change result.
- No retained study measures production security effects. Do not infer them from test success or linting.

## R3. Fixed-model experiment and adoption rules

### One-change paired evaluation

Tune on a development set, lock the candidate, then evaluate the following artifact on a static locked holdout and a newer local holdout. The same artifact can test a context rule, tool-feedback change, validation/repair rule, retry policy, or staged workflow, but **only one** such mechanism changes per experiment.

```yaml
experiment_id: run-design-<mechanism>-v1
status: pre-registered
population:
  unit: repository-task pair
  splits: [locked_static_holdout, locked_fresh_local_holdout]
  strata:
    runnable_failure_signal: [yes, no]
    change_scope: [single_file, multi_file]
    repository_size: [small, medium, large]
fixed:
  model_id: <exact production ID and provider revision if exposed>
  reasoning_effort: <fixed>
  system_prompt_sha256: <hash>
  tool_schema_sha256: <hash>
  tool_permissions: <identical allowlist>
  base_commit: <per task>
  container_image_digest: <digest>
  evaluator_commit_and_hidden_tests: <pinned, outside workspace>
  network_policy: <fixed>
  decoding_seed_schedule: <paired schedule>
  per_run_wall_clock_s: 1800
  per_run_token_cap: 120000
arms:
  A:
    run_design: current production behavior
  B:
    run_design: <one named intervention only>
    # Example context intervention: bounded retrieved snippets,
    # deduplicated tool output, rolling recent-observation summary.
pairing:
  replicates: <from local baseline variance pilot>
  rule: run A and B for every task-replicate; randomize A/B order
  retry_policy: identical unless retries are the intervention
  validation_policy: identical unless validation is the intervention
record_per_arm:
  patch_sha256: <value>
  task_tests: pass|fail|infrastructure_error
  full_suite: pass|fail|not_run
  independent_task_review: pass|fail|inconclusive
  evaluator_integrity: verified|inconclusive
  input_tokens: <n>
  output_tokens: <n>
  tool_calls: <n>
  test_executions: <n>
  validation_runtime_s: <n>
  wall_clock_s: <n>
  cost_per_task: <currency value>
  context_bytes_presented: <n>
  truncation_events: <n>
  stop_reason: resolved|budget|error
  immutable_trajectory_uri: <uri>
analysis:
  primary: paired independently verified task-success difference with confidence interval
  secondary: [task-test pass, full-suite pass, patch-apply rate, median/p90 latency, tokens, cost, tool calls]
  diagnostics: [win-loss-tie, McNemar test, strata, evaluator-pass-but-review-fail cases]
```

Run identical baseline replicates first to estimate local variance and size the paired study. Do not borrow “36 runs” as a universal rule. Randomized within-pair order limits time-of-day/provider effects. Pin what can be pinned and record what cannot. Keep the evaluator and hidden tests out of the writable workspace. Audit all candidate wins against the full available suite where feasible, and manually review discordant and high-impact patches.

### Operational decision table

| Observed result under the artifact | Decision | Rationale and required control |
|---|---|---|
| Candidate has a positive paired primary effect on both locked splits, no material full-suite/evaluator-integrity regression, and stays within the declared resource envelope | **Advance to limited production trial** | Evidence supports only that mechanism, task distribution, and budget. Deploy the same model and retry/resource policy measured. |
| Candidate improves task-test pass but loses broader tests, has confirmed behavioral regressions, or evaluator integrity is inconclusive | **Do not adopt** | A narrow evaluator gain is not adequate evidence of improved software outcomes. Diagnose the evaluator/patch-quality failure. |
| Confidence interval crosses zero, gain is below locally powered sensitivity, or evidence is a single run | **Inconclusive** | Do not treat it as a gain or a reliable null. Add replication only if the decision value justifies it. |
| Candidate improves best-of-k/pass@k but not one-attempt pass@1, or materially increases p95 latency/cost | **Evaluate as retry-policy option, not a general capability gain** | Report marginal verified success and all resource axes per added run. Adopt only if the product's explicit latency and cost envelope permits it. |
| Candidate wins static tasks but not newer/local tasks | **Keep experimental or restrict to demonstrated population** | Static-to-fresh transfer is not automatic and does not diagnose leakage by itself. |
| Context/tool policy loses in no-failure-signal, large-repository, or other predeclared strata | **Restrict scope or redesign and retest** | Do not pool strata into a universal validation/context conclusion. |
| Staged workflow wins only as a package | **Treat as package adoption candidate** | It may be operationally useful, but do not attribute success to decomposition alone. |

The thresholds for “material,” resource envelope, review rate, and detectable effect are local policy choices because no production task distribution, cost envelope, evaluator architecture, or model/provider determinism guarantee was supplied.

## Material limitations and stopping point

The retained primary evidence converges on bounded conclusions, so this investigation ended after reconciliation and inspection of the decision-relevant originals. It does not establish production-specific thresholds, an optimal configuration, model-independent effects, security impact, or causal decomposition effects. Test availability and quality are essential moderators. Dollar amounts should not be forecast into a current deployment because they use different denominators, configurations, and historical prices.

## Retained-source appendix

| Source | Type/date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [Yang et al., *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering*](https://arxiv.org/html/2405.15793) | Primary paper, 2024 | Fixed GPT-4-Turbo Lite ACI/context/edit-feedback ablations and $4 cap. Supports bounded context and purpose-built feedback as local harness effects. | Interface features are bundled in some contrasts. Test-based Lite result, selected configuration, and successful-instance cost metric limit transfer/comparability. |
| [Zhang et al., *AutoCodeRover: Autonomous Program Improvement*](https://arxiv.org/html/2404.05427) | Primary paper, 2024 | Fixed-model @1/@3 retry results and ACR-SBFL package comparison. | ACR-SBFL confounds localization, validation, and retries. @3 is any-run success, not serial repair or selection quality. |
| [Xia et al., *Agentless: Demystifying LLM-based Software Engineering Agents*](https://arxiv.org/html/2407.01489) | Primary paper, 2024 | Fixed GPT-4o selector ablation with regression and reproduction tests. | Requires usable generated tests and a 40-candidate pipeline. Full staged workflow does not isolate decomposition. |
| [Bouzenia, Devanbu, and Pradel, *RepairAgent: An Autonomous, LLM-Based Agent for Program Repair*](https://arxiv.org/html/2403.17134) | Primary paper, 2024 | GPT-3.5 Defects4J context/state/localization ablations. | Random n=100 sample and oracle-like bug information in default conditions reduce production transfer. |
| [Jimenez et al., *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*](https://arxiv.org/html/2310.06770) | Primary benchmark paper, 2024 | Defines patch-apply plus fail-to-pass/pass-to-pass test evaluator and documents contamination/retrieval precautions. | Test oracle is incomplete and its precautions do not reveal a closed model's training data. |
| [Wang, Pradel, and Liu, *Are “Solved Issues” in SWE-bench Really Solved Correctly?*](https://arxiv.org/html/2503.15223v2) | Primary audit, ICSE 2026 | Full-suite reruns, PatchDiff, and manual assessment quantify evaluator limits. | Three agents, Python Verified, oracle-patch dependence, and sampled/ambiguous classifications constrain the inflation estimate. |
| [Bjarnason, Silva, and Monperrus, *On Randomness in Agentic Evals*](https://arxiv.org/html/2602.07150) | Primary evaluation study, 2026 | Repeated-run variance, temperature-0 divergence, and study-specific power analysis. | Three models/two scaffolds on SWE-bench Verified, not a universal replication prescription. |
| [Zhang et al., *SWE-bench Goes Live!*](https://arxiv.org/html/2505.23419) | Primary benchmark/evaluation paper, 2025 | Fresh-task construction, repeated validation, and same-pair static/live score contrast. | Benchmark distributions and conditions differ, so the score gap does not identify leakage or a single causal factor. |
