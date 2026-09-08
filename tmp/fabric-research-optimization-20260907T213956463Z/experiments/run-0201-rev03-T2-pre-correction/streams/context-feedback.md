# T2-A — Fixed-model evidence on context, observations, and coding-agent scaffolds

**Scope.** This guide concerns run-design changes while keeping the generating model and its reasoning configuration fixed. The strongest directly controlled evidence found is for SWE-agent’s agent-computer interface and Agentless’s fixed GPT-4o pipeline. It does **not** establish universal agent rankings, model-independent effects, or security properties.

## Decision summary

1. **Prefer bounded, structured context over both tiny windows and unbounded history/file exposure.** In one controlled GPT-4 Turbo SWE-agent ablation, a 100-line viewer resolved 18.0% of SWE-bench Lite tasks, versus 14.3% at 30 lines and 12.7% with whole files. Retaining the last five observations resolved 18.0% versus 15.0% for full history. [SWE-agent, Table 3](https://arxiv.org/html/2405.15793#S4.T3).

2. **Treat tool output format as part of the agent.** In the same evaluation, purpose-built editing with immediate updated-file feedback and linting resolved 18.0%; removing linting gave 15.0%, and removing the dedicated editor gave 10.3%. A poorly shaped iterative-search tool was harmful: 12.0%, below no-search at 15.7%. [SWE-agent, §5.1 and Table 3](https://arxiv.org/html/2405.15793#S5).

3. **Add validation only when its incremental outcome quality clears its incremental cost and latency.** In Agentless’s fixed GPT-4o SWE-bench Lite pipeline, majority-vote selection resolved 77/300 (25.67%) at reported incremental validation cost $0.00; adding regression tests gave 81/300 (27.00%) at $0.01; adding generated reproduction tests gave 96/300 (32.00%) at $0.25. This is a within-pipeline result, not proof that generated tests are always beneficial. [Agentless, Table 4](https://arxiv.org/html/2407.01489v2#S5.T4).

4. **Do not equate more interaction, retries, samples, or decomposition with better runs.** Agentless reports repair gains from four location-conditioned groups of ten samples, 96/300 (32.00%), versus 88/300 (29.33%) from 40 samples at one greedy location, but also reports performance plateauing around 40 candidates. [Agentless, §5.2.2 and Table 3](https://arxiv.org/html/2407.01489v2#S5.T3). This changes sampling allocation and cost, so it is an efficiency trade-off rather than a pure scaffold-only result.

---

## R1 — Primary controlled evaluations

| Run-design factor | Primary evaluation, task, fixed generator | Comparator and method | Outcome | Cost/efficiency condition and interpretation |
|---|---|---|---|---|
| **Editing tool and immediate edit observation** | SWE-agent, **GPT-4 Turbo**, 300-task SWE-bench Lite. | Full ACI editor with linting versus editor without linting versus no dedicated editor. [Table 3](https://arxiv.org/html/2405.15793#S4.T3), [§5.1](https://arxiv.org/html/2405.15793#S5). | 18.0% full editor+linting, 15.0% editor without linting, 10.3% no editor. Exact contrasts: −3.0 and −7.7 percentage points from full ACI. | The paper attributes the editor’s effect partly to one-command multiline edits, updated-file feedback, and avoiding silent or cumbersome shell edits. It does not publish separate token, tool-call, or time budgets for each ablation. |
| **Search observation design** | Same SWE-agent/GPT-4 Turbo/300-task setup. | Summarized search versus iterative result-by-result search versus no search. | Summarized search: 18.0%; iterative: 12.0%; no search: 15.7%. Iterative search was −6.0 points from summarized and −3.7 points below no search. | The authors observed exhaustive traversal of matches, exhausting cost/context budgets. This is direct counterevidence to “more observable search results is better.” |
| **Context window size** | Same SWE-agent setup. | File viewer showing 30 lines, 100 lines, or complete file. | 30 lines: 14.3%; 100 lines: 18.0%; full file: 12.7%. Thus the 100-line condition exceeded 30 lines by 3.7 points and full-file by 5.3 points. | The paper gives no per-condition dollar cost. The result supports tuning a bounded context window, not adopting “100 lines” universally. |
| **History retention** | Same SWE-agent setup. | Last five observations versus complete interaction history. | Last five observations: 18.0%; full history: 15.0%, a −3.0-point contrast. | This directly evaluates observation/context selection, but only one truncation policy and one task distribution. |
| **Demonstration in the scaffold** | Same SWE-agent setup. | Full configuration versus removal of its demonstration. | Full: 18.0%; without demonstration: 16.3%, −1.7 points. | A prompt/scaffold component, not a model change. Cost condition is not separately reported. |
| **Hierarchical repository context** | Agentless, **GPT-4o `gpt-4o-2024-05-13`**, SWE-bench Lite (300 tasks), with `text-embedding-3-small` for retrieval. [Implementation and §3.1](https://arxiv.org/html/2407.01489v2#S3). | Prompted file localization, embedding retrieval, and their combination, followed by structure/skeleton-based narrowing. | Prompt-only file localization: 78.7%; embedding-only: 67.7%; combined: 81.7% correct-file localization. The paper states skeletonization reduced the second-stage input from `>>3000` to `<<800` context units. [§5.2.1](https://arxiv.org/html/2407.01489v2#S5.SS2.SSS1). | This is evidence that complementary retrieval signals and compression can improve localization. It is not a clean “context only” intervention because it includes a separate embedding model and a multistage pipeline. |
| **Repair decomposition and candidate allocation** | Same Agentless/GPT-4o/SWE-bench Lite setup. | Constant total 40 repair patches allocated as one greedy location, merged multi-location context, or four location sets × ten samples. [Table 3](https://arxiv.org/html/2407.01489v2#S5.T3). | Greedy location: 88/300, 29.33%, $0.22; merged: 85/300, 28.33%, $0.24; four location sets: 96/300, 32.00%, $0.29. | This is a useful fixed-generator, equal-candidate-count experiment. It supports separated location hypotheses over merged context in this pipeline, while costing $0.07 more per task than the greedy-location setup. |
| **Validation and repair selection** | Same Agentless/GPT-4o/SWE-bench Lite setup. | Majority vote alone, then regression-test filtering, then generated reproduction-test filtering. [Table 4](https://arxiv.org/html/2407.01489v2#S5.T4). | 77/300, 25.67%, $0.00; 81/300, 27.00%, $0.01; 96/300, 32.00%, $0.25. Regression testing added 4 resolved tasks for $0.01. Reproduction tests added 15 further resolved tasks for $0.24 beyond regression tests. | The reproduction-test condition includes additional generation and test execution. It measures an end-to-end selection policy, not a free feedback signal. |
| **Sampling/retry ceiling** | Same Agentless repair experiment. | Increasing candidate-patch count after location decomposition. | The paper reports that resolved performance plateaued around 40 patch samples. It also reports that at least one candidate patch could solve 126/300 tasks (42.0%), versus 96/300 selected final patches (32.0%). [§5.2.2](https://arxiv.org/html/2407.01489v2#S5.SS2.SSS2). | More candidates revealed a selection gap, not a recommendation for unlimited retries. Selection quality and total budget are confounded with retry count. |

### Cross-paper scaffold comparison: useful but not causal

Agentless is a deliberately non-interactive localization → repair → validation pipeline, while SWE-agent is an interactive tool-using agent. Agentless reports 96/300 resolved (32.00%) at average inference cost $0.70 on SWE-bench Lite using GPT-4o. [Agentless Table 1](https://arxiv.org/html/2407.01489v2#S5.T1). SWE-agent reports 18.0% on SWE-bench Lite at $1.67 using GPT-4 Turbo, while its shell-only GPT-4 Turbo agent reports 11.0% at $1.46. [SWE-agent Table 1](https://arxiv.org/html/2405.15793#S4.T1).

These are **not** a causal comparison between agentic and staged designs because model, date, prompts, implementation, sampling, and evaluation conditions differ. They justify testing a staged baseline locally, not adopting Agentless as a general winner.

---

## R2 — Counterevidence and reliability limits

| Constraint | Evidence and consequence |
|---|---|
| **The evidence is model- and scaffold-specific.** | SWE-agent’s controlled results use GPT-4 Turbo; Agentless uses GPT-4o plus a specified embedding model. A context width, observation format, or retry policy may interact with another fixed model’s tool-use tendencies and context behavior. Re-run the paired experiment after any model, API-version, prompt, tokenizer, or tool-schema change. |
| **More context can degrade results.** | SWE-agent’s full-file and full-history settings underperformed bounded windows/history. Iterative search underperformed no search. Do not launch a repository-wide or exhaustive-observation policy without an ablation. |
| **A simple staged pipeline has a known hard-case weakness.** | Agentless reports that closed-source agent tools did better than Agentless when issue descriptions contain **no location clue**, while Agentless was comparable when natural-language, stack-trace, or keyword clues existed. [Agentless §6.2](https://arxiv.org/html/2407.01489v2#S6.SS2). This argues for routing or stratification by localization difficulty, not replacing exploration with decomposition globally. |
| **Retry/sample gains are selection-sensitive.** | Agentless’s 42.0% “any candidate solves” upper bound versus 32.0% selected-patch score shows candidate generation and selection are different bottlenecks. A success increase from more samples may disappear under a different ranker or fixed dollar cap. |
| **Reported aggregate rates conceal stochastic per-task changes.** | SWE-agent reports six GPT-4 runs on SWE-bench Lite averaging 17.94% with 0.49 standard deviation, while noting that individual-instance resolution can vary considerably. [SWE-agent Appendix B.5, Table 10](https://arxiv.org/html/2405.15793#A2.SS5). Use paired task-level outcomes and repeated seeds where feasible, not one aggregate run. |
| **SWE-bench is narrow and static.** | The original benchmark comprises 2,294 issue/PR tasks from 12 popular Python repositories. [SWE-bench abstract](https://arxiv.org/abs/2310.06770). Its test-passing evaluator does not directly measure production developer workflow fit, latency tolerance, code-review acceptability, or security. |
| **Training and task leakage remain unresolved.** | Agentless explicitly identifies developer-patch leakage into GPT-4o training as an internal threat that it cannot fully assess because the model is closed. It also identifies 4.3% of SWE-bench Lite issues with exact ground-truth patches in the description, 10.0% with missing critical information, and 5.0% with misleading proposed solutions. [Agentless §§6.1, 7](https://arxiv.org/html/2407.01489v2#S6.SS1). Its filtered Lite-SS removes these categories, but filtering itself is a judgment call. |
| **External baselines are often non-reproducible.** | Agentless notes that many high-scoring commercial systems did not release code or trajectories. [Agentless §5.1](https://arxiv.org/html/2407.01489v2#S5.SS1). Do not use cross-leaderboard comparisons as evidence for a run-design decision. |
| **Validation feedback is not ground truth.** | Agentless selects patches using regression and generated reproduction tests. Test pass/fail is informative but does not prove semantic correctness beyond the tests. Keep hidden tests, review, and production safeguards as separate outcome measures. No source inspected here supports a security claim. |

### Explicit evidence gaps

- No inspected primary evaluation isolates **retry count alone** while holding candidate budget, wall time, and selection policy fixed.
- No inspected primary evaluation gives a universal comparison of decomposition versus autonomous exploration using the same model, task set, budgets, and implementation.
- No inspected source tests current production repositories, non-Python codebases, proprietary code, multi-day tasks, or security outcomes.
- Agentless’s hierarchical-context result changes retrieval and pipeline stages, so it does not isolate compression from retrieval quality.
- SWE-agent’s ACI ablations report outcome rates but not per-ablation token, latency, or tool-call distributions.

---

## R3 — Production fixed-model experiment and adoption rules

### Experimental design

**Hold fixed**

- Exact generating-model ID, reasoning setting, system prompt except the one tested factor, decoding parameters, seed policy, tool permissions, repository revision, environment image, network policy, evaluator version, and wall-clock and token/dollar ceilings.
- One task set and one hidden evaluator per experiment. Do not tune against the hidden set.
- The candidate patch count when testing context/tool feedback. When testing retries, hold either total token/dollar budget or candidate count fixed and state which.

**Create a representative task panel**

Stratify tasks before assignment:

1. Location clue present versus absent.
2. Single-file versus multi-file change.
3. Existing focused test available versus reproduction required.
4. Small versus large repository/context footprint.
5. Bug fix versus feature/refactor, if the production workload includes both.

Use fresh internal tasks or post-cutoff tasks with immutable repository snapshots. Retain a public benchmark only as a secondary regression check.

**Use paired randomized runs**

For every task, run baseline and intervention under matched conditions. Randomize run order. Use the same seed for deterministic settings. For stochastic settings, use paired seeds across variants and predeclare the number of repeats.

Primary endpoint: hidden-test/task acceptance rate.  
Secondary endpoints: task-level regression pass rate, review acceptance, time to first valid patch, median and p90 wall time, input/output tokens, tool calls, retries, test executions, failure/timeout rate, and cost per accepted task.

Analyze paired outcomes:

- Report `intervention win / baseline win / tie`.
- Report absolute acceptance-rate difference with a paired confidence interval.
- Report the same result by prespecified strata.
- Report budget-normalized value: incremental cost and latency per additional accepted task.
- Preserve trajectories, tool observations, diffs, evaluator output, environment hashes, and the exact configuration for every run.

### Concrete paired-evaluation artifact

```yaml
experiment_id: scaffold-context-v1
decision: "Adopt bounded evidence bundle instead of current unconstrained context policy"

fixed:
  generator_model: "<exact model ID>"
  reasoning_effort: "<unchanged setting>"
  decoding: {temperature: "<unchanged>", seed_policy: "paired seeds"}
  repository_revision: "<immutable SHA>"
  environment_image: "<immutable digest>"
  evaluator_revision: "<immutable SHA>"
  maximum_tokens_per_task: 120000
  maximum_wall_time_minutes: 30
  maximum_tool_calls: 80
  network_access: "unchanged and logged"

arms:
  baseline:
    context: "current policy"
    tools: "current tool schemas and observations"
    validation: "current policy"
  intervention:
    context: "repository tree -> selected-file skeletons -> bounded code windows; retain last N observations"
    tools: "structured search summary; edit acknowledgment with changed span and lint result"
    validation: "same as baseline"
    prohibited_changes:
      - "model ID"
      - "reasoning effort"
      - "prompt changes unrelated to the intervention"
      - "extra total budget"

tasks:
  source: "fresh internal holdout"
  unit: "issue + immutable repository snapshot + hidden tests"
  stratify_by:
    - "location clue: present|absent"
    - "change scope: single-file|multi-file"
    - "repository size: small|large"
    - "test availability: focused|broad"
  assignment: "paired, randomized arm order"
  repeats_per_task: 3

record_per_run:
  - task_id
  - arm
  - seed
  - accepted_by_hidden_evaluator
  - hidden_test_result
  - regression_test_result
  - review_result
  - input_tokens
  - output_tokens
  - tool_calls
  - observations_retained
  - retries
  - test_executions
  - wall_time_seconds
  - estimated_cost
  - timeout_or_failure_reason
  - patch_hash
  - trajectory_hash

decision_rule:
  primary: "paired hidden-evaluator acceptance"
  adopt_if:
    - "lower 95% confidence bound of absolute acceptance lift is > 0"
    - "no prespecified critical stratum has a materially negative paired result"
    - "p90 latency and cost per accepted task stay within product limits"
    - "review/regression failure rates do not exceed baseline guardrails"
  otherwise: "do not adopt globally; inspect trajectories and consider a stratum-specific route"
```

### Operational decision table

| Candidate change | Test first | Adopt when | Do not adopt or route conditionally when |
|---|---|---|---|
| Bounded code windows | Window sizes around the current policy, including a full-context control. | Paired acceptance improves with no budget breach. | Gains occur only on small repositories, or large/multi-file tasks regress. |
| Observation truncation | Current history versus recent-N observations, with equal action limit. | Recent-N improves acceptance or lowers cost with noninferior acceptance. | Long tasks or repair-after-failure cases lose acceptance. |
| Search summary | Current search versus summarized/refinable results versus iterative result paging. | Summary improves localization and accepted patches. | It omits decisive detail or makes no-location-clue tasks worse. |
| Structured edit acknowledgment/lint feedback | Same edit action with and without changed-span, syntax/lint feedback. | Fewer malformed edits and higher acceptance justify added latency. | Lint noise or excess output consumes context without paired benefit. |
| Regression-test filtering | Same candidate set and selector, with and without test filtering. | Incremental accepted tasks justify test cost and latency. | Tests are flaky, weak, unavailable, or filtering rejects accepted patches. |
| Generated reproduction tests | Same candidate set, hidden evaluator, and budget ceiling. | Incremental accepted tasks per dollar/second clears the product threshold. | Generation consumes budget needed for repair, tests are non-reproducible, or review outcomes decline. |
| More retries/candidates | Fixed total budget allocation, e.g., deeper single run versus multiple candidates. | The selected-patch acceptance lift survives paired evaluation and cost-per-accepted-task improves. | Gains only increase “any candidate succeeds,” not selected final-patch success. |
| Staged decomposition | Staged localization/repair/validation versus interactive exploration, stratified by location clues. | It wins or is cost-effective in its intended strata. | No-location-clue and broad-search tasks regress. Route those tasks to an exploration-capable policy instead. |

---

## Retained-source appendix

1. **Yang et al., “SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering,” NeurIPS 2024.**  
   Original inspected source: [arXiv HTML](https://arxiv.org/html/2405.15793) and [NeurIPS PDF](https://papers.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf).  
   Decisive locators: [Table 1, benchmark result/cost conditions](https://arxiv.org/html/2405.15793#S4.T1), [Table 3, ACI ablations](https://arxiv.org/html/2405.15793#S4.T3), [§5.1 interpretation](https://arxiv.org/html/2405.15793#S5), [Appendix B.5/Table 10 variance](https://arxiv.org/html/2405.15793#A2.SS5).  
   Used for: fixed-GPT-4 Turbo context, history, search, editor, linting, demonstration, cost context, and variance evidence.

2. **Xia et al., “Agentless: Demystifying LLM-based Software Engineering Agents,” 2024.**  
   Original inspected source: [arXiv HTML](https://arxiv.org/html/2407.01489v2), [arXiv record](https://arxiv.org/abs/2407.01489).  
   Decisive locators: [§3.1 localization/context design](https://arxiv.org/html/2407.01489v2#S3.SS1), [implementation and Table 1](https://arxiv.org/html/2407.01489v2#S5.T1), [Table 3 repair allocation](https://arxiv.org/html/2407.01489v2#S5.T3), [Table 4 validation](https://arxiv.org/html/2407.01489v2#S5.T4), [§6.1 benchmark classification](https://arxiv.org/html/2407.01489v2#S6.SS1), [§6.2 counterevidence](https://arxiv.org/html/2407.01489v2#S6.SS2), [§7 threats to validity](https://arxiv.org/html/2407.01489v2#S7).  
   Used for: fixed-GPT-4o staged-pipeline, retrieval/context compression, repair decomposition, validation-selection, retry plateau, benchmark-quality, leakage, and external-validity evidence.

3. **Jimenez et al., “SWE-bench: Can Language Models Resolve Real-World GitHub Issues?,” ICLR 2024.**  
   Original inspected source: [arXiv record](https://arxiv.org/abs/2310.06770).  
   Decisive locator: abstract, which specifies 2,294 issue/PR tasks from 12 Python repositories and task formulation.  
   Used for: benchmark scope and representativeness boundary.