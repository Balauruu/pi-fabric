# Fixed-model coding-agent run design: decision guide

**Decision scope, as of 2026-09-07.** Change context selection, tool feedback, validation/repair, retries, or decomposition while keeping the exact model snapshot, reasoning-effort setting, decoding, core prompt, permissions, task snapshot, and evaluator fixed. The evidence supports testing these changes, not a universal ordering of agent designs, a model comparison, or a security-effectiveness claim.

## R1. What primary evaluations measure

### Source-bound evaluation matrix

| Lever | Original evaluation: task, agent/model, comparator, method | Measured outcome and cost condition | What it supports |
|---|---|---|---|
| Tool interface and feedback | [SWE-agent](https://arxiv.org/html/2405.15793v3#S4.T1), SWE-bench Lite, 300 repository issue tasks. GPT-4 Turbo in both arms. Agent-computer interface (ACI) versus shell-only interactive agent. | 18.0% (54/300) versus 11.0% resolved, +7.0 pp. Average API cost **among resolved tasks** was $1.67 versus $1.46. A $4 per-instance cap submitted existing edits at exhaustion. | A bundled interface, feedback, guardrail, and workflow change affected test-harness resolution at a fixed model. It does not isolate any single component or give all-run cost. |
| Context selection | [SWE-agent Table 3](https://arxiv.org/html/2405.15793v3#S4.T3), same Lite/GPT-4 Turbo ablation configuration. Last five observations versus full history, 100-line file view versus 30-line/full-file views, summarized versus iterative/no specialized search. | Last five observations 18.0% versus full history 15.0%. A 100-line view 18.0% versus 14.3% (30 lines) and 12.7% (full file). Summarized search 18.0% versus 12.0% iterative and 15.7% no specialized search. | Both too little and too much context, and unbounded search feedback, can hurt this configuration. These are source-specific ablations, not a transferable optimum. |
| Edit validation / repair feedback | [SWE-agent Table 3](https://arxiv.org/html/2405.15793v3#S4.T3), same task/model/configuration. Linting editor versus same editor without linting and no edit tool. | 18.0% with linting versus 15.0% without and 10.3% with no edit tool. Across full-benchmark GPT-4 Turbo trajectories, 1,185/2,294 (51.7%) had a failed edit; reported eventual successful-edit probability fell from 90.5% after an attempted edit to 57.2% after a failed edit. | Immediate syntax/edit feedback is worth testing. The trajectory numbers are observational, not a randomized repair-cap result, and resolution is not semantic correctness. |
| Validation and candidate selection | [Agentless](https://arxiv.org/html/2407.01489#S5.T4), 300 SWE-bench Lite tasks, GPT-4o, with default settings held while patch-selection components vary. Majority vote, then regression-test filtering, then generated reproduction-test selection. | 77/300 (25.67%) at reported $0.00 added average cost, 81/300 (27.00%) at $0.01, and 96/300 (32.00%) at $0.25. The latter two contrasts are +1.33 pp and +6.33 pp, respectively. | Executed regression and reproduction tests can improve candidate selection in this pipeline. Generated reproduction tests add reported cost, and the reported cost accounting must not be treated as total production cost without its definition. |
| Decomposition / staged context | [Agentless](https://arxiv.org/html/2407.01489#S3) uses hierarchical file→symbol→edit-location localization, patch generation, then validation; its headline is 96/300 (32.0%) at $0.70 average cost per issue on Lite with GPT-4o. | This is a single-system result, not a same-model monolithic-versus-staged ablation retained here. | It establishes an auditable staged design to compare locally, not a causal decomposition advantage over another agent or model. |
| Retry reliability | [SWE-rebench](https://arxiv.org/html/2505.20411) runs each model five times under a standardized ReAct scaffold and reports mean resolution, SEM, and pass@5. | The authors state that stochastic trajectories make a single run unrepresentative and that reporting the best of repeated runs overstates ordinary resolution. | Report pass@1 separately from retry curves and their all-run cost/time. This is evaluation-design evidence, not a controlled estimate of an optimal retry cap. |
| Evaluator meaning | [SWE-bench](https://arxiv.org/html/2310.06770#A1.SS3) evaluates 2,294 issues from 12 Python repositories by resetting to base, applying test patch and prediction, attempting automatic prediction-patch repair if needed, then running the test script. | “Resolved” is test-script success after the harness protocol. | Keep harness-side patch repair separate from agent repair, and do not equate a benchmark pass with broader engineering quality. |

### Comparability boundary

Do not average or rank the numbers above: task split, model (GPT-4 Turbo versus GPT-4o), scaffold, intervention bundle, budget, cost denominator, and evaluator differ. The directly controlled estimates are the within-source rows. The full SWE-agent 12.47% result and Agentless 32.0% headline are not a fair comparison.

## R2. Counterevidence and reliability limits

1. **Test success can overstate correctness.** [Wang, Pradel, and Liu](https://arxiv.org/html/2503.15223v2#S4.T1) re-ran all developer tests for plausible SWE-bench Verified patches from CodeStory, LearnByInteract, and OpenHands. Reported resolution fell 62.2→57.0% (−5.2 pp), 60.2→55.6% (−4.6 pp), and 53.0→49.2% (−3.8 pp). Their combined estimate is 6.4 pp average inflation, but it is not a corrected solve rate: PatchDiff flags behavioral divergence, including potentially valid alternatives. Of 77 manually reviewed suspicious patches, 22 (28.6%) were certainly incorrect, 4 (5.2%) correct, and 51 (66.2%) uncertain. Independent acceptance tests and a blinded correctness audit are therefore required for adoption claims.

2. **Exposed tasks can carry repository or training-data bias.** [The SWE-Bench Illusion](https://arxiv.org/html/2506.12286) reports up to 76% file-path identification from issue text alone on SWE-bench Verified, versus up to 53% on tasks outside SWE-bench repositories, plus up to 35% versus 18% consecutive 5-gram overlap. These diagnostics are evidence consistent with contamination or repository bias, not proof that any particular model memorized any particular task. The paper itself notes that n-gram overlap is noisy for code patches.

3. **The repository image may leak the answer.** The [SWE-bench maintainer issue #465](https://github.com/SWE-bench/SWE-bench/issues/465) documents trajectories using `git log --all` to expose future commits containing fixes. Maintainers identify origins, branches, reflogs, tags, and related artifacts as sanitization targets. Their search was preliminary, so it establishes a real leakage path rather than a reliable leaderboard-wide inflation rate. A run-design test that changes shell access or feedback is invalid if future state is reachable.

4. **Task distribution changes transfer.** [SWE-Bench Pro](https://arxiv.org/html/2509.16941v2) reports reference changes averaging 107.4 lines over 4.1 files and highlights that 161/500 SWE-bench Verified tasks require only one- or two-line changes. Its different models, reasoning settings, 50-turn cap, $2 cap, and task population make its scores transfer-boundary evidence only. It does not estimate a fixed-model workflow effect.

5. **Causal attribution and retry claims remain limited.** SWE-agent’s ACI combines tools, descriptions, context handling, feedback, and guardrails. Agentless combines localization, sampling, filtering, and selection. Neither headline identifies one component’s causal contribution. More turns also cannot be treated as inherently bad: the observational behavior study described in the streams reports that the trajectory-length/failure association reverses after controlling for task difficulty. No retained source supplies a controlled fixed-model decomposition comparison or an optimal production retry cap.

## R3. Production experiment and adoption rules

### Operational decision table

| Change | Hold fixed and measure | Adopt only when | Reject, hold, or route to review when |
|---|---|---|---|
| Context selection | Same task, seed policy, model, reasoning effort, prompt core, tools, budgets, evaluator. Log selected/omitted context, truncation, localization recall, tokens, and latency. | Independent acceptance pass improves or is non-inferior with a predeclared material all-run efficiency gain, including cross-file and poor-localization strata. | Gain is only on exposed tasks, truncation or missed-localization rises, or harder strata regress. |
| Tool feedback/interface | Keep permissions and executable tools unchanged except the feedback format. Log malformed/no-op actions, tool errors, repeated queries, and recovery. | Validated success improves at equal/lower all-run cost and fewer interface failures. | Sanitization removes the gain, or feedback/tool access exposes future state. |
| Validation and repair | Separate repair-visible tests from independent acceptance tests. Log patch changes, failure signatures, retries, regressions, and audit labels. | Independent acceptance improves with no material all-developer/regression decline and no higher wrong-but-passing or uncertain rate. | Only visible tests improve, failures repeat without a changed patch or localization hypothesis, or budget is consumed cycling. |
| Retries | Report pass@1 plus each retry bucket, marginal success, all-run cost, p95 time, timeout, and paired seeds. | The selected cap adds predeclared value within production cost/latency limits. | Reporting is best-of-N only, pass@1 falls, or the last retry lacks marginal value. |
| Decomposition | Keep model/effort fixed. Log fan-out, subtask context, duplicated edits, merge conflicts, omitted facts, and final validation. | Benefit replicates on multi-file and long-horizon strata without shifting cost or coordination failures. | Aggregate benefit is driven by trivial tasks or handoffs omit essential context. |

### Concrete paired evaluation artifact

```yaml
evaluation_id: fixed-model-run-design-v1
question: "Does one named run-design change improve independently validated completion?"
unit: task_id + seed
frozen:
  model_id: "<exact provider/version>"
  reasoning_effort: "<exact setting>"
  decoding: "<temperature, top_p, max-output, seed policy>"
  prompt_core_hash: "<hash>"
  tool_schema_and_permissions: "<same except named treatment feedback only>"
  environment_image_digest: "<digest>"
  task_base_commit: "<pre-task commit>"
  independent_evaluator_commit: "<hidden acceptance-test commit>"
  caps: {turns: "<production cap>", wall_time: "<cap>", total_cost: "<all-run cap>"}
population:
  primary: "time-held-out internal repository tasks, excluded from tuning"
  include: [reproducible base environment, independently authored acceptance tests]
  exclude: [future fix metadata reachable, unresolved environment setup]
  stratify: [repository, language, single_vs_multi_file, localization_difficulty, baseline_difficulty]
arms:
  A: {name: incumbent, change: none}
  B: {name: candidate, change: "<one named context/tool-feedback/validation/retry/decomposition factor>"}
  prohibited: [model, reasoning_effort, decoding, core_prompt, task_content, permissions]
execution:
  randomize_arm_order_per_task: true
  paired_seeds: [101, 202, 303]
  retry_cap: "<predeclared production cap>"
  stop_on: [tool-policy violation, future-state access, nonrecoverable environment failure]
  retain: [trajectory, tool_io, selected_context, patch, tests, tokens, cost, latency, retries, termination_reason]
outcomes:
  primary: independent_acceptance_pass_at_1
  secondary:
    - all_developer_tests_pass
    - independent_regression_tests_pass
    - paired_success_difference_and_interval
    - all_run_median_and_p95_cost_and_latency
    - retry_curve_and_budget_exhaustion
    - malformed_action_tool_error_context_truncation_timeout_rates
    - future_state_access_attempt_rate
  audit:
    sample: "all arm disagreements plus random accepted-patch sample"
    reviewers: 2
    blinded_to_arm: true
    labels: [correct, regression, partial_fix, irrelevant_change, uncertain]
decision:
  pilot_if:
    - "predeclared paired independent-acceptance criterion is met"
    - "no material regression-test or audit-quality decline"
    - "p95 all-run cost and latency stay within production limits"
    - "no future-state access or tool-policy violation"
    - "benefit is not confined to one repository or trivial-task stratum"
  otherwise: "retain incumbent; inspect failure traces or abstain where the oracle is insufficient"
```

This artifact is a resolving experiment, not a universal-capability benchmark. Its numerical thresholds and sample size must be set by the owner’s acceptable loss, cost, and latency budgets before execution; the sources do not justify universal values.

## Unknowns that should block broad promotion

- No retained controlled study establishes the production-optimal context window, retry count, or decomposition fan-out for the deployed model.
- None measures security efficacy, exploit resistance, secret protection, sandbox escape, or authorization safety. Denied-command and access telemetry are process controls, not security outcome measures.
- Benchmark-derived test success does not establish maintainability, review acceptance, operational reliability, or semantic correctness beyond the evaluated checks.
- Total cost remains unknown unless it includes failed runs, input/cache/reasoning/output, tools, retries, parallel work, and validation. Successful-run averages must not be used as total-cost comparisons.

## Source appendix

| Source | Direct URL | Type / date | Inspected method or evidence form | Supported claim retained here | Important limitation |
|---|---|---|---|---|---|
| SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering | https://arxiv.org/html/2405.15793v3 | Primary research paper, 2024-11-11 version | GPT-4 Turbo ACI ablations on 300 SWE-bench Lite tasks, Table 1/3; full-trajectory analysis; $4 cap. | Fixed-model ACI, context, search, and linting contrasts; cost-denominator and trajectory facts. | Bundles multiple interface/workflow changes; test-harness resolution; successful-run cost only; trajectory analysis is observational. |
| Agentless: Demystifying LLM-based Software Engineering Agents | https://arxiv.org/html/2407.01489 | Primary research paper, 2024-10-29 version | GPT-4o staged localization/patch/selection pipeline on 300 Lite tasks; Table 4 patch-selection ablation. | Regression and generated reproduction-test selection contrasts; staged design as a candidate comparator. | Different model and pipeline from SWE-agent; headline is not a decomposition causal estimate; reported cost scope limits transfer. |
| SWE-bench: Can Language Models Resolve Real-World GitHub Issues? | https://arxiv.org/html/2310.06770 | ICLR research/benchmark paper, 2024-11-11 version | Benchmark construction and evaluator protocol, including test patch, predicted patch, automatic patch repair, and test script. | Meaning of resolved score and need to separate harness repair from agent repair. | PR-derived tests bound the oracle and do not measure all engineering quality. |
| Are “Solved Issues” in SWE-bench Really Solved Correctly? An Empirical Study | https://arxiv.org/html/2503.15223v2 | Empirical evaluator study, ICSE 2026 | All-developer-test reruns, PatchDiff, and manual review of suspicious patches from three agents. | 3.8–5.2 pp all-test reductions, 6.4 pp estimated inflation, and uncertainty in patch correctness. | PatchDiff can flag valid alternatives; manual labels include a large uncertain class; not a correction formula for every agent. |
| SWE-rebench: An Automated Pipeline for Task Collection and Decontaminated Evaluation of Software Engineering Agents | https://arxiv.org/html/2505.20411 | Primary benchmark/evaluation paper, 2025 | Standardized scaffold, five executions per model, mean/SEM/pass@5 reporting. | Single-run variance and the need to distinguish pass@1 from multi-run results. | Does not randomize production retry policies or establish an optimal cap. |
| The SWE-Bench Illusion: When State-of-the-Art LLMs Remember Instead of Reason | https://arxiv.org/html/2506.12286 | Contamination diagnostic study, 2025 | Context-withheld file-path and patch-overlap diagnostics across benchmark populations. | Exposure/bias warning and 76% versus 53% context-free diagnostic contrast. | Consistent with, not proof of, memorization; n-gram overlap is explicitly noisy. |
| SWE-bench issue #465: Repo State Loopholes During Agentic Evaluation | https://github.com/SWE-bench/SWE-bench/issues/465 | Original benchmark-maintainer issue, 2025-09-03 | Reported trajectories and maintainer mitigation discussion of future git state. | Concrete future-commit leakage path and required repository-state sanitization targets. | Preliminary search, not a quantified global leakage prevalence. |
| SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks | https://arxiv.org/html/2509.16941v2 | Primary benchmark paper, 2025 | Longer-horizon multi-repository task distribution and unified evaluation. | Transfer boundary: task size/complexity, cap, and population can change conclusions. | Different models, reasoning settings, tasks, and budget mean it is not fixed-model workflow evidence. |
