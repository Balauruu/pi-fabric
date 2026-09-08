# Source Note: Fixed-Model Run-Design Evaluations

**Scope and cutoff:** research note for the requested 2026-09-07 decision. This note retains three primary sources inspected directly. It is evidence about repository bug-fix evaluation, not a universal ranking or evidence of security properties.

## R1 — Primary evaluations and quantitative contrasts

### E1. SWE-agent: interface, context, feedback, and repair guardrails

**Source:** Yang et al., “[SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/html/2405.15793)” (primary research paper, arXiv v3 dated 2024-11-11; first submitted 2024-05-06).

**Task and environment.** SWE-bench has 2,294 real GitHub issue/PR tasks from 12 Python repositories. The controlled ablations use **SWE-bench Lite, 300 self-contained functional bug-fix instances**. The primary score is `% Resolved`/pass@1: the fraction whose tests pass after applying the generated patch. [§4, Metrics](https://arxiv.org/html/2405.15793#S4)

**Fixed model and budget.** The ablations are for **GPT-4 Turbo (`gpt-4-1106-preview`)**. Per-instance API budget was **$4**. On budget exhaustion, the current edits were submitted. Reported average API cost is over *successfully resolved* instances, so it is not an all-run cost estimate. [§4, Models and Metrics](https://arxiv.org/html/2405.15793#S4)

> “Due to budget constraints, we set the per-instance budget to $4; if a run exceeded this budget, existing edits were submitted automatically.” — [§4](https://arxiv.org/html/2405.15793#S4)

| Run-design factor | Same-model comparator and method | Outcome, unit, and condition | Interpretation bounded to this evaluation |
|---|---|---|---|
| **Agent-computer interface / tool feedback** | SWE-agent ACI versus shell-only agent, both GPT-4 Turbo, on 300 Lite tasks | **18.00% (54/300)** versus **11.00%**, a **+7.0 percentage-point** difference. Average successful-run API cost: **$1.67** versus **$1.46**. [Table 1](https://arxiv.org/html/2405.15793#S4.T1) | In this environment, specialized search/view/edit tools with concise feedback outperformed a Linux-shell-only interface at modestly higher reported successful-run cost. This is a multi-component comparison, not an isolated tool-feedback effect. |
| **Context history selection** | Last five observations versus full history, other ACI settings held at the SWE-agent configuration | **18.0%** versus **15.0%**, **−3.0 pp** for full history. [Table 3](https://arxiv.org/html/2405.15793#S4.T3) | More retained trajectory context was worse here. It supports testing bounded observation history, not a universal “shorter is better” rule. |
| **Task demonstration in context** | ACI with demonstration versus without demonstration | **18.0%** versus **16.3%**, **−1.7 pp** without it. [Table 3](https://arxiv.org/html/2405.15793#S4.T3) | A worked tool-use example improved this specific prompt/interface configuration. |
| **Code-context window size** | File viewer set to 100 lines versus 30 lines or full file | **18.0%** at 100 lines, **14.3%** at 30 lines (**−3.7 pp**), and **12.7%** for full file (**−5.3 pp**). [Table 3](https://arxiv.org/html/2405.15793#S4.T3) | Both insufficient and excessive source context harmed resolution. The study does not establish 100 lines as an optimum for another model, repository mix, or retrieval design. |
| **Search/decomposition workflow** | Summarized search versus iterative search versus no specialized search | **18.0%** summarized, **12.0%** iterative (**−6.0 pp**), **15.7%** no search (**−2.3 pp**). [Table 3](https://arxiv.org/html/2405.15793#S4.T3) | The paper attributes the iterative result to agents exhaustively paging through matches, consuming budget/context. Thus adding a tool can regress performance if feedback and stopping behavior are poor. |
| **Edit feedback / validation-repair guardrail** | Editor with linting versus same editor without linting | **18.0%** with linting versus **15.0%** without, **−3.0 pp** without linting. Restrictive “no edit” mode was **10.3%**, **−7.7 pp**. [Table 3](https://arxiv.org/html/2405.15793#S4.T3) | Immediate edit validation improved the fixed-model ACI. This measures lint/syntax guardrails, not semantic correctness or production safety. |

The paper’s original result table also reports the corresponding full-benchmark result: SWE-agent with GPT-4 Turbo resolved **12.47%** at **$1.59** average successful-run API cost, whereas the Lite result was **18.00%** at **$1.67**. Do not compare those percentages as if they were the same task distribution. [Table 1](https://arxiv.org/html/2405.15793#S4.T1)

**Exact result passages.**

> “An LM-friendly ACI’s value is confirmed by SWE-agent’s 64% relative increase compared to Shell-only, both with GPT-4 Turbo.” — [§5](https://arxiv.org/html/2405.15793#S5)

> “This inefficient behavior can exhaust an agent’s cost budget or context window, leading to even worse performance than … No search … 15.7% … with Iterative search.” — [§5.1](https://arxiv.org/html/2405.15793#S5.SS1)

**Retry evidence and limit.** In trajectories on the full benchmark, **1,185/2,294 (51.7%)** had at least one failed edit. The paper reports an eventual successful-edit probability of **90.5%** after any attempted edit, falling to **57.2%** after accumulated failed edits. [§5.2](https://arxiv.org/html/2405.15793#S5.SS2) This is observational trajectory analysis, not a randomized retry-policy ablation. It supports measuring retry depth and failure accumulation, not assuming that more retries improve task resolution.

**Efficiency counterevidence.** Among runs that did not exhaust budget, solved instances had **median $1.21 and 12 steps**; unsuccessful instances had **mean $2.52 and 21 steps**. The authors therefore suspect merely increasing the maximum budget/token limit would not materially improve performance. [Appendix B.3](https://arxiv.org/html/2405.15793#A2.SS3) The statistics use different summaries, median for resolved and mean for unresolved, so they are directional evidence only.

---

### E2. Agentless: fixed decomposition plus patch validation

**Source:** Xia et al., “[Agentless: Demystifying LLM-based Software Engineering Agents](https://arxiv.org/html/2407.01489)” (primary research paper, arXiv v2 dated 2024-10-29; first submitted 2024-07-01).

**Task and configuration.** On the 300-instance SWE-bench Lite bug-fix set, Agentless uses a fixed three-stage run design: hierarchical localization, patch generation, and patch validation. The paper reports **GPT-4o** for Agentless and a final result of **96/300 = 32.00%** at **$0.70 average cost**. [Abstract](https://arxiv.org/html/2407.01489), [§5](https://arxiv.org/html/2407.01489#S5) The following ablation is internally controlled: the authors state that they vary one component while using default settings for the rest. [§5.2](https://arxiv.org/html/2407.01489#S5.SS2)

| Run-design factor | Comparator and method | Outcome, unit, and condition | Bounded conclusion |
|---|---|---|---|
| **Validation/repair selection** | Majority vote over candidate patches, then add existing regression-test filtering, then add generated reproduction-test selection | **77/300 (25.67%)**, **81/300 (27.00%)**, and **96/300 (32.00%)**, respectively. Table-reported average added cost: **$0.00**, **$0.01**, **$0.25**. [Table 4, §5.2.3](https://arxiv.org/html/2407.01489#S5.T4) | Relative to majority voting, regression testing gained **4 fixes / 1.33 pp** for $0.01; adding reproduction-test selection gained **19 fixes / 6.33 pp** relative to regression-only for $0.24 additional reported average cost. This is the strongest directly measured evidence here for validation design under a fixed agent/model configuration. |
| **Candidate generation / test-time sampling** | Evaluate the set of generated patch samples rather than only the selected patch | The paper says **126/300 (42.0%)** issues had at least one solvable candidate patch across all samples. [§5.2.2](https://arxiv.org/html/2407.01489#S5.SS2.SSS2) | This is an oracle-style upper bound on reranking/selection within that candidate pool, not an achievable pass@1 score and not evidence that more sampling is cost-effective. |
| **Hierarchical localization/context compression** | Localization stages progressively narrow candidate files, symbols, and edit regions before repair | The paper reports this as a component ablation but the inspected decisive passage establishes the design and its intent, not a clean retained numeric contrast suitable for a decision threshold. [§5.2.1](https://arxiv.org/html/2407.01489#S5.SS2.SSS1) | Treat as a candidate to test locally. Do not promote it on a numeric claim from this note. |

**Exact result passage.**

> “Table 4: Performance of different patch selection. Method Performance Avg. $ Majority voting 77 (25.67%) $0.00; +Regression test 81 (27.00%) $0.01; +Reproduction test 96 (32.00%) $0.25.” — [Table 4](https://arxiv.org/html/2407.01489#S5.T4)

**Counterevidence within the same source.** Reproduction tests cost more because they must be generated rather than inherited from the repository. [§5.2.3](https://arxiv.org/html/2407.01489#S5.SS2.SSS3) The method also changes several run-design elements together relative to agentic comparators, so its headline comparison to other agents does **not** identify the causal effect of decomposition, tools, or retries individually.

---

## R2 — Reliability, leakage, and evaluator limits

| Limit | Primary evidence | Decision implication |
|---|---|---|
| **Benchmark task quality can alter rankings and apparent gains.** | Agentless’s manual classification found Lite instances with an exact ground-truth patch in the description (**4.3%**), missing critical information (**10.0%**), and misleading solutions (**5.0%**). It constructed Lite-SS with **249** retained problems. [§6.1–6.2](https://arxiv.org/html/2407.01489#S6) | Report results on the original and a reviewed holdout. Investigate wins concentrated in issue descriptions containing solution-like text. |
| **Original SWE-bench leakage controls are limited to task construction.** | SWE-bench forms the problem statement from issue title, description, and comments before the PR’s initial commit “to avoid leakage of solution details.” [Appendix A.1](https://arxiv.org/html/2310.06770#A1.SS1) | This prevents post-PR issue-comment leakage in the benchmark input. It does not establish that a deployed or contemporary model never saw repository code, issue text, or PRs in pretraining. |
| **Temporal freshness is a design option, not a property of historical SWE-bench scores.** | SWE-bench says its collection process can produce issues created after a model’s training date, which “ensures that the solution was not included in their training corpus.” [§2](https://arxiv.org/html/2310.06770#S2) | For a fixed production model, create a timestamped holdout after the model’s stated training cutoff when possible. Document the cutoff and task timestamps. |
| **The evaluator measures test success, not all engineering quality.** | SWE-bench applies the benchmark test patch, applies the predicted patch, then runs the PR-derived testing script. It may automatically repair a non-applying predicted patch before execution. [Appendix A.3](https://arxiv.org/html/2310.06770#A1.SS3) | Record patch-application repair separately. A resolved score means the harness tests passed after its protocol. It does not measure maintainability, review acceptance, operational reliability, or security. |
| **Run-design effects may be coupled.** | SWE-agent’s ACI changes actions, documentation, context management, error feedback, editor behavior, and guardrails together; Agentless changes localization, sampling, filtering, and selection. [SWE-agent §3–5](https://arxiv.org/html/2405.15793#S3), [Agentless §5.2](https://arxiv.org/html/2407.01489#S5.SS2) | Use single-factor paired experiments before adopting a component. Do not attribute a package-level result to one feature. |
| **Variance and censoring matter.** | SWE-agent uses a $4 per-instance cutoff and reports average cost only for successful runs. [§4](https://arxiv.org/html/2405.15793#S4) | Store all-run token, latency, tool-call, and cost distributions, plus timeout/budget-exhaustion rates. Do not compare successful-run averages as total cost. |

## R3 — Fixed-model production experiment and adoption rules

### Operational decision table

| Candidate run-design change | Paired treatment | Required primary outcomes | Guardrail outcomes | Adopt only if |
|---|---|---|---|---|
| Context window/history | Baseline context policy versus bounded recent-observation policy | Task resolution, paired difference, test pass rate | Input/output tokens, truncation rate, latency | Resolution is non-inferior and median all-run cost or latency improves by the predeclared threshold. |
| Search/tool feedback | Existing tool output versus concise, structured result summaries with explicit stop condition | Resolution and localization correctness | Tool calls, repeated-query rate, context tokens, budget exhaustion | Resolution improves, or is non-inferior with a material efficiency gain. Reject if repetitive-search/budget-exhaustion rate rises. |
| Edit validation | Baseline edits versus syntax/lint/apply guardrail with feedback | Resolution and patch-application success | Failed-edit count, retry depth, false blocking rate, time | Resolution improves without an unacceptable false-block rate or latency/cost increase. This is not a security approval. |
| Validation/repair | Baseline test selection versus regression-test filter, then generated repro-test selector | Resolution, false-positive test pass rate from independent review/sample | Test-generation cost, total all-run cost, wall time | Each added validation stage earns its incremental cost through a predeclared resolution or false-positive improvement. |
| Retries | Current retry ceiling versus bounded recovery policy | Resolution by retry bucket | Cost, latency, repeated-failure rate, budget exhaustion | Adopt only if the last permitted retry has positive incremental resolution under fixed budget. Otherwise cap earlier. |
| Decomposition | Monolithic trajectory versus fixed localize → repair → validate stages | Resolution and stage-level failure attribution | Per-stage tokens/cost, candidate count, selection error | Adopt only if the same fixed model/effort gains on the paired holdout and no stage merely shifts cost beyond budget. |

### Concrete paired evaluation artifact

```yaml
evaluation_id: run-design-paired-v1
purpose: Compare one run-design change while holding model and reasoning effort fixed.
unit: issue_instance
population:
  holdout:
    source: timestamped production-like repository issues
    inclusion:
      - reproducible base commit and deterministic test command
      - issue text predates its solution PR
      - task timestamp and repository recorded
    exclusion:
      - solution patch or near-verbatim solution in issue text
      - unresolved environment setup
  stratify_by:
    - repository
    - task_size: [single_file, multi_file]
    - test_runtime_bucket
    - issue_date_bucket
fixed:
  model_id: "<exact provider model snapshot>"
  reasoning_effort: "<exact fixed setting>"
  decoding: "<temperature, seed policy, max output>"
  base_image_digest: "<container digest>"
  per_instance_budget:
    input_tokens: <N>
    output_tokens: <N>
    tool_calls: <N>
    wall_clock_seconds: <N>
  evaluator:
    command: "<fixed test command>"
    harness_version: "<commit or image digest>"
arms:
  A_baseline:
    run_design_commit: "<baseline commit>"
  B_treatment:
    run_design_commit: "<treatment commit>"
    changed_factor: "<one of context, tool-feedback, validation, retry, decomposition>"
randomization:
  order: randomized_per_instance
  seeds: [1, 2, 3]
  pairing_key: [instance_id, seed]
records_per_run:
  - instance_id
  - arm
  - seed
  - resolved_boolean
  - patch_applied_without_harness_repair_boolean
  - evaluator_result
  - total_input_tokens
  - total_output_tokens
  - estimated_api_cost_usd_all_runs
  - wall_clock_seconds
  - tool_calls
  - failed_edits
  - retries
  - validation_tests_run
  - budget_exhausted_boolean
analysis:
  primary: paired_resolution_difference_B_minus_A
  secondary:
    - paired_all_run_cost_difference_usd
    - paired_wall_clock_difference_seconds
    - budget_exhaustion_difference
    - patch_apply_without_repair_difference
  report:
    - counts_and_percentages_per_arm
    - paired_contingency_table_A_B
    - uncertainty_interval
    - per_repository_breakdown
    - failures_and_exclusions
adoption_rule:
  preregister:
    min_resolution_gain_pp: <G>
    max_cost_increase_pct: <C>
    max_latency_increase_pct: <L>
  decision:
    adopt: "B meets the predeclared resolution and efficiency criteria on the holdout."
    reject: "B misses either criterion or increases budget exhaustion/repeated failures beyond its limit."
    inconclusive: "Interval includes both a meaningful loss and meaningful gain; collect more paired tasks."
```

This artifact avoids model and reasoning-effort changes. It also keeps evaluator patch repair distinct from agent repair, preventing a harness-side intervention from being credited to the agent.

## Retained-source appendix

1. **Yang et al.**, *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering*. Primary research paper, arXiv:2405.15793v3. First submitted 2024-05-06, updated 2024-11-11.  
   - Original inspected HTML: https://arxiv.org/html/2405.15793  
   - Original inspected metadata: https://export.arxiv.org/api/query?id_list=2405.15793  
   - Decisive locators: [§4/Table 1](https://arxiv.org/html/2405.15793#S4.T1), [§4/Table 3](https://arxiv.org/html/2405.15793#S4.T3), [§5.1](https://arxiv.org/html/2405.15793#S5.SS1), [§5.2](https://arxiv.org/html/2405.15793#S5.SS2), [Appendix B.3](https://arxiv.org/html/2405.15793#A2.SS3).

2. **Xia et al.**, *Agentless: Demystifying LLM-based Software Engineering Agents*. Primary research paper, arXiv:2407.01489v2. First submitted 2024-07-01, updated 2024-10-29.  
   - Original inspected HTML: https://arxiv.org/html/2407.01489  
   - Original inspected metadata: https://export.arxiv.org/api/query?id_list=2407.01489  
   - Decisive locators: [§5.2/Table 4](https://arxiv.org/html/2407.01489#S5.T4), [§5.2.2](https://arxiv.org/html/2407.01489#S5.SS2.SSS2), [§6.1–6.2](https://arxiv.org/html/2407.01489#S6).

3. **Jimenez et al.**, *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?* Primary benchmark paper, arXiv:2310.06770v3, ICLR 2024. First submitted 2023-10-10, updated 2024-11-11.  
   - Original inspected HTML: https://arxiv.org/html/2310.06770  
   - Original inspected metadata: https://export.arxiv.org/api/query?id_list=2310.06770  
   - Decisive locators: [§2](https://arxiv.org/html/2310.06770#S2), [Appendix A.1](https://arxiv.org/html/2310.06770#A1.SS1), [Appendix A.3](https://arxiv.org/html/2310.06770#A1.SS3).