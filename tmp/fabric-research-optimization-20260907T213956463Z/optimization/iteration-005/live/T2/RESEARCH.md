# Fixed-model coding-agent run design: decision guide

**Decision scope, as of 2026-09-07.** Change context selection, tool feedback, validation/repair, retries, or decomposition while holding the exact model snapshot, reasoning-effort setting, decoding, core prompt, permissions, task snapshot, and evaluator fixed. The evidence supports controlled local testing, not a universal ordering of agent designs, a model comparison, or a security-effectiveness claim.

## R1. What primary evaluations measure

| Lever | Original evaluation: task, agent/model, comparator, method | Measured outcome and cost condition | Decision-grade reading |
|---|---|---|---|
| Tool interface and feedback | [SWE-agent](https://arxiv.org/html/2405.15793v3#S4.T1), 300 SWE-bench Lite tasks, GPT-4 Turbo in both arms. ACI versus a shell-only interactive agent. | 18.0% (54/300) versus 11.0% resolved, +7.0 pp. Average API cost **among resolved tasks** was $1.67 versus $1.46. A $4 per-instance cap submitted existing edits at exhaustion. | A bundled interface, feedback, guardrail, and workflow change altered harness resolution with the model fixed. It neither isolates one component nor supplies all-run cost. |
| Context selection | [SWE-agent Table 3](https://arxiv.org/html/2405.15793v3#S4.T3), same Lite/GPT-4 Turbo ablation configuration. Last five observations versus full history, 100-line file view versus 30-line/full-file views, summarized versus iterative/no specialized search. | Last five observations: 18.0% versus 15.0%. A 100-line view: 18.0% versus 14.3% (30 lines) and 12.7% (full file). Summarized search: 18.0% versus 12.0% iterative and 15.7% no specialized search. | Both insufficient and excessive context, and poorly bounded search feedback, can hurt this configuration. These are not transferable optima. |
| Edit validation and recovery feedback | [SWE-agent Table 3](https://arxiv.org/html/2405.15793v3#S4.T3), same task/model/configuration. Linting editor versus the same editor without linting and no edit tool. | 18.0% with linting versus 15.0% without and 10.3% with no edit tool. On 2,294 full-benchmark GPT-4 Turbo trajectories, 1,185 (51.7%) had a failed edit. Eventual successful-edit probability was 90.5% after an attempted edit and 57.2% after one failed edit. | Immediate syntax/edit feedback is worth testing. The recovery figures are observational, not a randomized repair-cap result, and resolved does not establish semantic correctness. |
| Validation and candidate selection | [Agentless Table 4](https://arxiv.org/html/2407.01489#S5.T4), 300 SWE-bench Lite tasks, GPT-4o, default settings held while patch-selection components vary. Majority vote, then regression-test filtering, then generated reproduction-test selection. | 77/300 (25.67%) at reported $0.00 added average cost, 81/300 (27.00%) at $0.01, and 96/300 (32.00%) at $0.25. The latter changes are +1.33 pp and +6.33 pp. | Executed regression and reproduction tests improved candidate selection in this pipeline. Generated tests add reported cost, whose scope must not be treated as total production cost without its definition. |
| Decomposition and staged context | [Agentless](https://arxiv.org/html/2407.01489#S3) uses file→symbol→edit-location localization, patch generation, then validation. Its GPT-4o Lite headline is 96/300 (32.0%) at $0.70 average cost per issue. | This is a single-system result, not a same-model monolithic-versus-staged ablation. | It is an auditable local comparator, not causal evidence that decomposition beats another agent or model. |
| Retry reliability | [SWE-rebench](https://arxiv.org/html/2505.20411#S3), standardized ReAct scaffold, five executions per model, with mean, SEM, and pass@5. | The authors state that stochastic trajectories make a single run unrepresentative and that reporting only the best repeated run overstates resolution. | Report pass@1 separately from retry curves and all-run cost/time. This does not estimate an optimal production retry cap. |
| Evaluator meaning | [SWE-bench](https://arxiv.org/html/2310.06770#A1.SS3), 2,294 issues from 12 Python repositories. The harness resets to base, applies test patch and prediction, may automatically repair a non-applying prediction patch, then runs the test script. | “Resolved” is test-script success after the harness protocol. | Keep harness-side patch repair separate from agent repair. A benchmark pass is not broader engineering quality. |

### Comparability boundary

Do not average or rank these numbers: task split, model, scaffold, intervention bundle, budget, cost denominator, and evaluator differ. The controlled estimates are only the within-source rows. SWE-agent’s 12.47% full-benchmark result and Agentless’s 32.0% headline are not a fair comparison. A prompt-demonstration contrast is not used because the stream notes report incompatible configurations and direct inspection did not establish a stable source-bound comparison.

## R2. Counterevidence and reliability limits

1. **Test success can overstate correctness.** [Wang, Pradel, and Liu](https://arxiv.org/html/2503.15223v2#S4.T1) re-ran all developer tests for plausible SWE-bench Verified patches from CodeStory, LearnByInteract, and OpenHands. Reported resolution fell 62.2→57.0% (−5.2 pp), 60.2→55.6% (−4.6 pp), and 53.0→49.2% (−3.8 pp). Their 6.4 pp average-inflation estimate is not a corrected solve rate because PatchDiff flags behavioral divergence, including valid alternatives. Of 77 manually reviewed suspicious patches, 22 (28.6%) were certainly incorrect, 4 (5.2%) correct, and 51 (66.2%) uncertain. Adoption therefore needs independent acceptance tests and a blinded correctness audit.

2. **Public tasks can contain answer-bearing descriptions or exposure bias.** [Agentless](https://arxiv.org/html/2407.01489#S6) manually classified SWE-bench Lite issues: 4.3% contained the exact ground-truth patch, 10.0% lacked critical information, and 5.0% contained misleading solution steps. [The SWE-Bench Illusion](https://arxiv.org/html/2506.12286) further reports up to 76% file-path identification from issue text alone on SWE-bench Verified versus up to 53% on tasks outside SWE-bench repositories, plus up to 35% versus 18% consecutive 5-gram overlap. These are diagnostics consistent with contamination or repository bias, not proof that a particular model memorized a particular task. The latter paper explicitly calls n-gram overlap noisy for code patches.

3. **The repository image itself can leak the answer.** [SWE-bench maintainer issue #465](https://github.com/SWE-bench/SWE-bench/issues/465) documents trajectories using `git log --all` to expose future commits containing fixes. Maintainers identify origins, branches, reflogs, tags, and related artifacts as sanitization targets. Its search was preliminary, so this establishes a leakage path, not a leaderboard-wide inflation rate. A run-design test that changes shell access or feedback is invalid if future state is reachable.

4. **Task distribution changes transfer.** [SWE-Bench Pro](https://arxiv.org/html/2509.16941v2) reports reference changes averaging 107.4 lines over 4.1 files and notes that 161/500 SWE-bench Verified tasks require only one- or two-line changes. Its different models, reasoning settings, 50-turn cap, $2 cap, and task population make its scores transfer-boundary evidence only, not a fixed-model workflow estimate.

5. **Trajectory length is not a stopping rule.** [Beyond Resolution Rates](https://arxiv.org/html/2604.02547#S4.SS2) analyzes 9,374 trajectories from 19 agents, 8 frameworks, and 14 LLMs on 500 SWE-bench Verified tasks. It compares outcomes within each of 416 contested tasks to control task difficulty: resolved trajectories averaged 44.0 steps versus 39.6 for failed trajectories, a 10.0% reversal from the pooled within-agent association. This is observational, has residual framework/tool/prompt/time confounding, and uses one run per agent-task pair. Do not infer that shorter runs are inherently better. Instrument repeated failure signatures and marginal validated value instead.

6. **Causal attribution remains limited.** SWE-agent’s ACI bundles tools, descriptions, context handling, feedback, and guardrails. Agentless bundles localization, sampling, filtering, and selection. Neither headline identifies one component’s causal contribution. No retained source supplies a controlled fixed-model decomposition comparison or an optimal production retry cap.

## R3. Production experiment and adoption rules

| Change | Hold fixed and measure | Adopt only when | Reject, hold, or route to review when |
|---|---|---|---|
| Context selection | Same task, seed policy, model, reasoning effort, prompt core, tools, budgets, evaluator. Log selected/omitted context, truncation, localization recall, tokens, and latency. | Independent acceptance improves or is non-inferior with a predeclared all-run efficiency gain, including cross-file and poor-localization strata. | Gain is only on exposed tasks, truncation or missed-localization rises, or harder strata regress. |
| Tool feedback/interface | Keep permissions and executable tools unchanged except the feedback format. Log malformed/no-op actions, tool errors, repeated queries, and recovery. | Validated success improves at equal/lower all-run cost and fewer interface failures. | Sanitization removes the gain, or feedback/tool access exposes future state. |
| Validation and repair | Separate repair-visible tests from independent acceptance tests. Log patch changes, failure signatures, retries, regressions, and audit labels. | Independent acceptance improves with no material all-developer/regression decline and no higher wrong-but-passing or uncertain rate. | Only visible tests improve, failures repeat without a changed patch or localization hypothesis, or budget is consumed cycling. |
| Retries | Report pass@1 plus each retry bucket, marginal success, all-run cost, p95 time, timeout, and paired seeds. | The selected cap adds predeclared value within production cost/latency limits. | Reporting is best-of-N only, pass@1 falls, or the last retry lacks marginal value. |
| Decomposition | Keep model/effort fixed. Log fan-out, subtask context, duplicated edits, merge conflicts, omitted facts, and final validation. | Benefit replicates on multi-file and long-horizon strata without shifting cost or coordination failures. | Aggregate benefit is driven by trivial tasks or handoffs omit essential context. |

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
  secondary: [all_developer_tests_pass, independent_regression_tests_pass, paired_success_difference_and_interval, all_run_median_and_p95_cost_and_latency, retry_curve_and_budget_exhaustion, malformed_action_tool_error_context_truncation_timeout_rates, future_state_access_attempt_rate]
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

This is a resolving experiment, not a universal-capability benchmark. The owner must set numerical thresholds and sample size from acceptable loss, cost, and latency budgets before execution. The sources do not justify universal values.

## Unknowns that should block broad promotion

- No retained controlled study establishes the production-optimal context window, retry count, or decomposition fan-out for the deployed model.
- None measures security efficacy, exploit resistance, secret protection, sandbox escape, or authorization safety. Denied-command and access telemetry are process controls, not security outcome measures.
- Benchmark-derived test success does not establish maintainability, review acceptance, operational reliability, or semantic correctness beyond the evaluated checks.
- Total cost remains unknown unless it includes failed runs, input/cache/reasoning/output, tools, retries, parallel work, and validation. Successful-run averages are not total-cost comparisons.

## Source appendix

| Source | Direct URL | Type / date | Inspected method or evidence form | Supported claim retained here | Important limitation |
|---|---|---|---|---|---|
| SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering | https://arxiv.org/html/2405.15793v3 | Primary research paper, 2024-11-11 version | GPT-4 Turbo ACI ablations on 300 SWE-bench Lite tasks, Tables 1/3, full-trajectory analysis, $4 cap. | Fixed-model ACI, context, search, linting, cost-denominator, and edit-recovery facts. | Bundles workflow changes, measures test-harness resolution, reports successful-run cost only, and has observational trajectory analysis. |
| Agentless: Demystifying LLM-based Software Engineering Agents | https://arxiv.org/html/2407.01489 | Primary research paper, 2024-10-29 version | GPT-4o staged localization/patch/selection pipeline on 300 Lite tasks, Table 4, and manual Lite-task review. | Validation-selection contrasts, staged design, and answer-bearing/missing/misleading task-description rates. | Different model/pipeline; headline is not a decomposition causal estimate; manual task categorization and reported cost scope limit transfer. |
| SWE-bench: Can Language Models Resolve Real-World GitHub Issues? | https://arxiv.org/html/2310.06770 | ICLR benchmark paper, 2024-11-11 version | Benchmark construction and evaluator protocol, including test patch, predicted patch, automatic prediction-patch repair, and test script. | Meaning of resolved score and need to separate harness repair from agent repair. | PR-derived tests bound the oracle and do not measure all engineering quality. |
| Are “Solved Issues” in SWE-bench Really Solved Correctly? An Empirical Study | https://arxiv.org/html/2503.15223v2 | Empirical evaluator study, ICSE 2026 | All-developer-test reruns, PatchDiff, and manual review of suspicious patches from three agents. | 3.8–5.2 pp all-test reductions, 6.4 pp estimated inflation, and patch-correctness uncertainty. | PatchDiff can flag valid alternatives; manual labels contain a large uncertain class; not a correction formula for every agent. |
| SWE-rebench: An Automated Pipeline for Task Collection and Decontaminated Evaluation of Software Engineering Agents | https://arxiv.org/html/2505.20411 | Primary benchmark/evaluation paper, 2025 | Standardized scaffold, five executions per model, mean/SEM/pass@5 reporting. | Single-run variance and the need to distinguish pass@1 from multi-run results. | Does not randomize production retry policies or establish an optimal cap. |
| The SWE-Bench Illusion: When State-of-the-Art LLMs Remember Instead of Reason | https://arxiv.org/html/2506.12286 | Contamination diagnostic study, 2025 | Context-withheld file-path and patch-overlap diagnostics across benchmark populations. | Exposure/bias warning and 76% versus 53% context-free diagnostic contrast. | Consistent with, not proof of, memorization; n-gram overlap is explicitly noisy. |
| SWE-bench issue #465: Repo State Loopholes During Agentic Evaluation | https://github.com/SWE-bench/SWE-bench/issues/465 | Original benchmark-maintainer issue, 2025-09-03 | Reported trajectories and maintainer mitigation discussion of future git state. | Concrete future-commit leakage path and repository-state sanitization targets. | Preliminary search, not a quantified global leakage prevalence. |
| SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks | https://arxiv.org/html/2509.16941v2 | Primary benchmark paper, 2025 | Longer-horizon multi-repository task distribution and unified evaluation. | Transfer boundary: task size/complexity, cap, and population can change conclusions. | Different models, reasoning settings, tasks, and budget mean it is not fixed-model workflow evidence. |
| Beyond Resolution Rates: Behavioral Drivers of Coding Agent Success and Failure | https://arxiv.org/html/2604.02547 | Primary observational trajectory study, 2026 preprint | 9,374 trajectories from 19 agents across 8 frameworks and 14 LLMs on 500 Verified tasks; within-task paired outcome analysis over 416 contested tasks. | Trajectory-length/failure association reverses when task difficulty is controlled. | Observational, cross-framework/model, single-run-per-pair analysis with residual confounding; not a retry-policy experiment. |
