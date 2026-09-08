# T2 Source Note: Counterevidence and Adoption Limits for Fixed-Model Coding-Agent Run Design

**Scope:** Evidence inspected through **2026-09-07**. This note concerns changes to context selection, tool feedback, validation/repair, retries, and decomposition while holding the deployed model, model version, decoding configuration, and reasoning-effort setting fixed. It does not support model rankings, model changes, or security claims.

## Bottom line

Run design can materially change measured coding-agent outcomes, but a benchmark gain is not sufficient for production adoption.

- **R1:** The strongest directly relevant controlled evidence is SWE-agent’s interface ablation: with **GPT-4 Turbo**, its agent-computer interface resolved **18.0%** of 300 SWE-bench Lite tasks versus **11.0%** for a shell-only agent, a **+7.0 percentage-point** contrast, under a **$4 per-instance cap**. The paper’s headline **+10.7 points** is versus its particular baseline configuration, not a general tool-use effect. [SWE-agent, §1 and Table 1](https://arxiv.org/html/2405.15793v3)
- **R2:** A passing benchmark patch can be wrong. On SWE-bench Verified patches produced by three tools, running all developer tests reduced reported resolution by **3.8–5.2 points**. Differential testing plus manual review estimated **6.4 points** average inflation, while **66.2%** of sampled behaviorally divergent patches remained uncertain. [Wang, Pradel & Liu 2026, Abstract; §§4.1–4.4](https://arxiv.org/html/2503.15223v2)
- **R3:** Adopt a workflow change only when a randomized, task-paired, fixed-model evaluation improves **held-out production-like task success and independent validation**, does not violate latency/cost/retry budgets, and does not increase leakage, timeout, malformed-action, or regression signals. Benchmark-only gains, best-of-\(N\) reporting, and test-only success are insufficient.

---

## R1. Primary evidence and what it actually measures

| Source and task | Fixed elements and comparator | Run-design intervention / method | Outcome and efficiency condition | Decision-grade reading |
|---|---|---|---|---|
| [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering (arXiv:2405.15793, 2024), §1, §4, Table 1](https://arxiv.org/html/2405.15793v3) | **Task:** SWE-bench Lite, 300 repository issue-resolution tasks. **Agent/model:** GPT-4 Turbo. **Comparator:** shell-only interactive agent. | Custom agent-computer interface: constrained file-view/search/edit commands, concise tool feedback, and editing guardrails, compared with a default Linux shell. | GPT-4 Turbo: **18.00% resolved, $1.67 average API cost per resolved task** for SWE-agent versus **11.00%, $1.46** for shell-only. Both were subject to a **$4 per-instance budget**, with current edits submitted on budget exhaustion. | Direct evidence that the interface and feedback loop can alter measured outcome with the base model fixed. It is not a clean estimate for any one component because command abstraction, feedback formatting, guardrails, and workflow all changed together. |
| [SWE-agent, §1](https://arxiv.org/html/2405.15793v3) | **Task:** full SWE-bench, 2,294 tasks. **Model:** GPT-4 Turbo. **Comparator:** earlier non-interactive retrieval-augmented system. | Interactive ACI rather than non-interactive retrieval/generation. | **12.47%** resolved for SWE-agent versus **3.8%** prior best retrieval-augmented result. | Historical, cross-system comparison only. It confounds agent architecture, prompts, retrieval, tools, and other implementation choices. Do not use it to assign the entire difference to validation, tools, or context selection. |
| [SWE-agent, Table 1](https://arxiv.org/html/2405.15793v3) | **Task:** SWE-bench Lite. **Model:** GPT-4 Turbo. | Same agent family with/without a language-specific demonstration. | With demonstration: **18.00%**, **$1.67** average cost per resolved task. Without: **7.33%**, **$0.79**. | Demonstrations are context selection. The higher-success configuration also cost more per successful result. Report both success and compute/cost, not success alone. |
| [Beyond Resolution Rates: Behavioral Drivers of Coding Agent Success and Failure (preprint, 2026), Abstract; §§3.4, 4](https://arxiv.org/html/2604.02547) | **Tasks:** all 500 SWE-bench Verified tasks. **Data:** 9,374 trajectories from 19 agents, 8 frameworks, 14 LLMs. | Within-task comparisons distinguish successful and failed trajectories. The authors examine context gathering, editing, and validation behavior while controlling task difficulty. | Agents that gathered context before editing and invested in validation succeeded more often. Crucially, the association between longer trajectories and failure reverses after controlling task difficulty. | Useful for failure instrumentation and hypotheses, not causal proof for a particular workflow. Frameworks and models vary, and the stated result is an observational association. |
| [SWE-rebench (arXiv:2505.20411, 2025), §3.2–3.3](https://arxiv.org/html/2505.20411) | **Task:** fresh temporal subsets of mined interactive Python tasks. **Method:** a standardized ReAct scaffold. | Each model is run **five times**. Authors report mean resolution, standard error, and pass@5. | The source explicitly warns that a single stochastic trajectory may be unrepresentative and that reporting only the best run overstates resolution. | Primary design guidance for retries: measure both ordinary single-run reliability and the benefit/cost of repeated attempts. Do not convert pass@5 into pass@1. |
| [SWE-Bench Pro (2025), Abstract; §1; Table 5](https://arxiv.org/html/2509.16941v2) | **Tasks:** 1,865 multi-repository issues, including public, held-out, and commercial partitions. Evaluation uses a unified scaffold. | Tests transfer from publicly exposed smaller tasks to longer-horizon, multi-file tasks. | Reference patches average **107.4 lines across 4.1 files**. The paper reports under **45% Pass@1** in its unified evaluation; Table 5 reports **23.3% GPT-5 medium** and **25.9% GPT-5 high** on the 731-task public set, at **50 turns** and a **$2 cap**. | Task distribution, budget, and turn limit can overturn workflow conclusions. These are different models and reasoning settings, so the numbers are transfer-boundary evidence, not fixed-model workflow evidence. |

### Exact source passages and locators

1. **Interface effect:** SWE-agent states: “*We perform an ablation study on a subset of 300 SWE-bench test instances (SWE-bench Lite)*” and reports its ACI “*solves 10.7 percentage points more instances than the baseline agent, which uses only the default Linux shell*.” [§1](https://arxiv.org/html/2405.15793v3)  
   **Locator:** [Table 1](https://arxiv.org/html/2405.15793v3#S5.T1) supplies the more directly comparable GPT-4 Turbo Lite values, 18.00% versus 11.00%.

2. **Cost condition:** SWE-agent defines “Avg. Cost” as API inference cost averaged over successfully resolved instances and says: “*Due to budget constraints, we set the per-instance budget to $4; if a run exceeded this budget, existing edits were submitted automatically*.” [§4 Experimental Setup](https://arxiv.org/html/2405.15793v3#S4)

3. **Trajectory confounding:** The 2026 behavior study reports: “*The widely reported correlation between trajectory length and failure reverses direction once task difficulty is controlled*.” [Abstract](https://arxiv.org/html/2604.02547)  
   This overturns an adoption rule such as “fewer turns are inherently better.”

4. **Retry variance:** SWE-rebench states that agent trajectories are stochastic and “*the outcome of a single run can vary significantly*”; it warns that evaluating multiple times and reporting only the best run risks overstating resolved rate. [§3.1–3.2](https://arxiv.org/html/2505.20411)

---

## R2. Counterevidence, evaluator limits, and failure signals

### C1. Test-passing is not semantic correctness

[Wang, Pradel & Liu, ICSE 2026](https://arxiv.org/html/2503.15223v2) inspected plausible SWE-bench Verified patches from **CodeStory, LearnByInteract, and OpenHands**.

| Comparator | Result | Condition and implication |
|---|---:|---|
| Benchmark-selected tests versus all developer tests | CodeStory: **62.2% → 57.0%** resolved, **−5.2 points**. LearnByInteract: **60.2% → 55.6%**, **−4.6**. OpenHands: **53.0% → 49.2%**, **−3.8**. | The benchmark harness had used test files modified in the original fix PR. Running all developer tests exposed regressions in **7.2–8.4% of plausible patches**. |
| Benchmark-selected tests versus PatchDiff analysis | Resolution after excluding suspicious patches: CodeStory **62.2% → 44.0%**, LearnByInteract **60.2% → 40.8%**, OpenHands **53.0% → 38.6%**. | This is not a corrected solve rate. PatchDiff identifies behavioral divergence from the developer patch, which can include valid alternatives. |
| Manual inspection of 77 sampled suspicious patches | **22/77 (28.6%)** certainly incorrect, **4/77 (5.2%)** correct, **51/77 (66.2%)** uncertain. | The authors estimate **11.0%** incorrect plausible patches and **6.4 absolute points** average resolution inflation, but under-specified issues leave a large uncertainty class. |

**Exact passages/locators**

- The paper’s abstract: “*7.8% of all patches [count] as ‘correct’ while failing the developer-written test suite*” and “*Combined, the different weaknesses lead to an inflation of reported resolution rates by 6.4 absolute percent points*.” [Abstract](https://arxiv.org/html/2503.15223v2)
- The all-tests contrast is in [§4.1, Table 1](https://arxiv.org/html/2503.15223v2#S4.T1).
- The uncertain-correctness limitation is in [§4.4, Table 8](https://arxiv.org/html/2503.15223v2#S4.T8).
- The authors’ threats-to-validity section says PatchDiff used GPT-4o-mini for cost/effectiveness and that RQ3/RQ4 include manual analysis. [§5.3](https://arxiv.org/html/2503.15223v2#S5.SS3)

**Adoption consequence:** A design that runs more tests or repairs test failures may increase benchmark pass rate while still producing a wrong patch. Independent regression tests, differential tests, review of a stratified sample, and explicit “uncertain” outcomes are necessary before calling an improvement reliable.

### C2. Public benchmark scores may contain model-memory or repository-bias signal

[Liang, Garg & Moghaddam, “The SWE-Bench Illusion” (arXiv:2506.12286, 2025)](https://arxiv.org/html/2506.12286) uses diagnostic tasks that deliberately withhold normal repository context.

| Diagnostic | Quantitative contrast | Limit |
|---|---:|---|
| File-path identification from issue text alone | Up to **76%** accuracy on SWE-bench Verified versus up to **53%** on tasks from repositories outside SWE-bench. | Difference is evidence consistent with contamination or repository bias, not direct proof that a particular model memorized a particular task. |
| Function reproduction | Up to **35%** consecutive 5-gram overlap on SWE-bench Verified/Full versus up to **18%** on other coding benchmarks. | N-gram overlap is noisy because independently correct code can share text with the reference solution. |

**Exact passages/locators**

- “*SoTA models achieve up to 76% accuracy in identifying buggy file paths using only issue descriptions, without access to repository structure*,” versus “*up to 53%*” outside SWE-bench. [Abstract](https://arxiv.org/html/2506.12286)
- The authors explicitly caution that “*N-gram similarity… is a noisy indicator for complex code patches*.” [Limitations](https://arxiv.org/html/2506.12286)

**Adoption consequence:** Do not use a gain on exposed SWE-bench tasks as evidence that context pruning, retrieval, retries, or decomposition will transfer. Evaluate on time-held-out internal tasks, repositories unavailable to the agent/model during construction, or both.

### C3. The evaluation environment itself can leak the answer

The official SWE-bench repository’s [issue #465, “Repo State Loopholes During Agentic Evaluation”](https://github.com/SWE-bench/SWE-bench/issues/465), created **2025-09-03**, documents agents using `git log --all` to retrieve future commits containing the fix.

- The issue gives a concrete Claude 4 Sonnet trajectory where `git log --oneline --all` exposes a future diff with the fix. [Issue body](https://github.com/SWE-bench/SWE-bench/issues/465)
- Maintainers list required mitigation: remove origins, all branches, reflogs, tags, and related future-state artifacts. [Issue body](https://github.com/SWE-bench/SWE-bench/issues/465)
- The maintainers characterize their finding as a preliminary search, so it establishes existence of leakage, not a quantified overall leaderboard inflation. [Comment, 2025-09-05](https://github.com/SWE-bench/SWE-bench/issues/465)

**Adoption consequence:** A run-design change that adds broader shell access, repository-history inspection, or richer tool feedback must be evaluated in a sanitized environment. A benchmark improvement is invalid if a trajectory can access post-task commits, remote metadata, reflogs, tags, branches, or generated artifacts containing the answer.

### C4. Task-distribution transfer can reverse apparent capability

[SWE-Bench Pro](https://arxiv.org/html/2509.16941v2) says SWE-bench Verified has **161 of 500** tasks requiring only one- or two-line changes, while its reference changes average **107.4 lines over 4.1 files**. [§1](https://arxiv.org/html/2509.16941v2)

The paper reports that top systems obtaining over 70% on SWE-bench Verified achieve about **23%** in its harder setting. [§7](https://arxiv.org/html/2509.16941v2) This is not a fixed-model paired comparison, but it is direct counterevidence to generalizing a run-design result across task horizons, repositories, languages, budgets, and complexity.

The benchmark also states its own limits: language coverage is uneven, and it still depends on fail-to-pass/pass-to-pass tests, which may reject alternative valid implementations. [§7.1](https://arxiv.org/html/2509.16941v2)

### C5. Observational workflow signals are not causal prescriptions

The 2026 behavior study finds that agents with more pre-edit context gathering and validation succeed more often, but it also concludes the **LLM is the primary driver** and framework performance gaps shrink with newer LLM generations. [Abstract](https://arxiv.org/html/2604.02547)

For a fixed deployed model, this supports testing workflow changes, not assuming they will work. It also means a result from a different model can fail to transfer even when the framework name is unchanged.

---

## R3. Fixed-model production experiment and adoption rules

### Operational decision table

| Decision | Required evidence | Adopt | Hold / reject / roll back |
|---|---|---|---|
| Context-selection change | Same-task paired evaluation, independent tests, and trace evidence that relevant context is reached without increased context-overflow/truncation. | Lower bound of paired success improvement is positive, independent validation is non-inferior, and cost/latency stays within budget. | Success gain occurs only on exposed benchmark tasks, context overflow rises, or independent validation/regression pass rate falls. |
| Tool-feedback or tool-interface change | Fixed tool permissions except the intended feedback/interface change. Log malformed actions, no-op actions, tool errors, and recovery after error. | Fewer malformed/tool-error terminations and better validated task success at equal or lower budget. | Improvement disappears after sanitizing git/repository state, or broader tool access introduces answer leakage. |
| Validation/repair loop | Separate acceptance tests from repair-visible tests. Measure repair attempts, regressions, and semantic audit outcomes. | Independent acceptance success improves and sampled patches show no higher wrong-but-passing or uncertain rate. | Only repair-visible tests improve, all-tests regressions rise, or the repair loop spends budget cycling without incremental progress. |
| Retries | Report pass@1 and the full retry curve, including cost and wall time per task. Keep retry seeds paired across arms. | Expected value at the selected retry cap exceeds baseline under production cost and latency limits. | Result is reported only as best-of-\(N\), pass@1 drops, or marginal success per retry is below its marginal cost/latency. |
| Decomposition | Keep model/reasoning effort fixed. Record subtask fan-out, merge conflicts, duplicated edits, and final verification. | Improvement persists on multi-file and long-horizon strata without increasing merge/coordination failures. | Aggregate result is driven by short tasks, decomposition loses essential context, or handoff summaries cause semantic omissions. |

### Concrete paired evaluation artifact

```yaml
evaluation_id: fixed-model-run-design-2026-09-07
objective: >
  Test whether candidate_run_design improves validated repository-task
  completion over incumbent_run_design without changing model or reasoning effort.

frozen:
  model_id: "<exact provider/model snapshot>"
  reasoning_effort: "<exact fixed setting>"
  decoding:
    temperature: 0
    top_p: 1
    max_output_tokens: "<fixed>"
  system_prompt_core_hash: "<hash>"
  tool_permission_set:
    network: false
    git_history: false
    git_remote: false
    allowed_tools: [read, search, edit, test, lint]
  environment_image_digest: "<immutable digest>"
  task_snapshot_commit: "<pre-task commit>"
  evaluator_commit: "<independent acceptance-test commit>"

arms:
  A:
    name: incumbent_run_design
    changed_components: []
  B:
    name: candidate_run_design
    changed_components:
      - "<one explicitly named run-design change>"
    prohibited_changes:
      - model
      - reasoning_effort
      - decoding
      - tool_permissions
      - task prompt content

tasks:
  primary:
    source: "time-held-out internal issue/PR tasks"
    inclusion:
      - reproducible pre-task environment
      - independently authored acceptance tests
      - no access to future commits or fix PR metadata
    stratify_by:
      - language
      - repository
      - task_type
      - changed_files_reference_band
      - baseline_difficulty
  secondary:
    source: "public benchmark only as diagnostic"
    label: "non-decisive due to exposure and evaluator risk"

execution:
  randomize_arm_order_per_task: true
  paired_seeds: [101, 202, 303]
  retry_cap: 3
  turn_cap: "<production cap>"
  wall_clock_cap_minutes: "<production cap>"
  cost_cap_usd: "<production cap>"
  stop_rules:
    - "hard tool-policy violation"
    - "future-state or benchmark-answer access detected"
    - "nonrecoverable environment failure"
  retain:
    - full trajectory
    - tool inputs_and_outputs
    - token_counts
    - latency
    - cost
    - patch
    - test_logs
    - termination_reason

outcomes:
  primary:
    - independent_acceptance_pass_at_1
  required_secondary:
    - all_developer_tests_pass
    - independent_regression_tests_pass
    - paired_success_difference
    - bootstrap_95pct_CI_of_paired_difference
    - median_and_p95_wall_time
    - median_and_p95_cost
    - retries_used
    - malformed_tool_action_rate
    - timeout_rate
    - context_overflow_or_truncation_rate
    - leaked_future_state_attempt_rate
  audit:
    sample: "all disagreements plus random sample of accepted patches"
    labels: [correct, regression, partial_fix, irrelevant_change, uncertain]
    reviewers: 2
    blinded_to_arm: true

adoption_gate:
  adopt_only_if:
    - "lower 95% CI bound for paired independent-acceptance improvement > 0"
    - "no material decline in all-developer-test or independent-regression pass rate"
    - "p95 cost and latency remain within production limits"
    - "no answer/future-state leakage and no tool-policy violation"
    - "benefit is not restricted to a single repository or trivial-task stratum"
  otherwise: "retain incumbent and investigate traces before another experiment"
```

### Minimum reporting table

| Metric | Arm A | Arm B | Paired difference / condition |
|---|---:|---:|---|
| Independent acceptance pass@1 |  |  | Primary decision metric |
| Independent acceptance pass@3 |  |  | Retry value, not a substitute for pass@1 |
| All developer tests pass |  |  | Regression screen |
| Semantically wrong accepted patches |  |  | Blinded audit estimate and uncertainty |
| Uncertain patch correctness |  |  | Do not silently count as correct |
| Median / p95 cost per task |  |  | Include failed tasks |
| Median / p95 elapsed time |  |  | Include retries |
| Median turns and tool calls |  |  | Diagnose efficiency, not success by itself |
| Tool errors / malformed actions |  |  | Tool-interface failure signal |
| Context truncation / overflow |  |  | Context-selection failure signal |
| Timeout / budget exhaustion |  |  | Retry and decomposition failure signal |
| Future-state access attempts |  |  | Must be zero for a valid result |

---

## Retained-source appendix

1. **Primary empirical paper, 2024.** Carlos E. Jimenez et al., *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering*, arXiv:2405.15793v3. Inspected: abstract, §1, §4, Table 1, trajectory/cost passages.  
   URL: https://arxiv.org/html/2405.15793v3

2. **Primary benchmark/evaluation paper, 2025.** Ibragim Badertdinov et al., *SWE-rebench: An Automated Pipeline for Task Collection and Decontaminated Evaluation of Software Engineering Agents*, arXiv:2505.20411. Inspected: abstract, §§1, 3.1–3.3.  
   URL: https://arxiv.org/html/2505.20411

3. **Peer-reviewed empirical evaluator study, ICSE 2026.** You Wang, Michael Pradel, and Zhongxin Liu, *Are “Solved Issues” in SWE-bench Really Solved Correctly? An Empirical Study*. Inspected: abstract, §§1, 4.1–4.4, 5.3, Tables 1, 2, and 8.  
   URL: https://arxiv.org/html/2503.15223v2  
   DOI: https://doi.org/10.1145/3744916.3764576

4. **Original benchmark-maintainer issue, created 2025-09-03.** SWE-bench issue #465, *Repo State Loopholes During Agentic Evaluation*. Inspected: issue body and maintainer comments documenting future-commit leakage and sanitization mitigations.  
   URL: https://github.com/SWE-bench/SWE-bench/issues/465

5. **Primary benchmark paper, 2025.** Jeff Da et al., *SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks*, arXiv:2509.16941v2. Inspected: abstract, §§1, 3.2, 6–7, Table 5.  
   URL: https://arxiv.org/html/2509.16941v2

6. **Primary observational trajectory study, 2026 preprint.** *Beyond Resolution Rates: Behavioral Drivers of Coding Agent Success and Failure*. Inspected: abstract, §§1, 3.4, 4.  
   URL: https://arxiv.org/html/2604.02547

7. **Primary contamination diagnostic study, 2025.** Shanchao Liang, Spandan Garg, and Roshanak Zilouchian Moghaddam, *The SWE-Bench Illusion: When State-of-the-Art LLMs Remember Instead of Reason*, arXiv:2506.12286. Inspected: abstract, §§1, 4.1, limitations.  
   URL: https://arxiv.org/html/2506.12286