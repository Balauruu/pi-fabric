# Fixed-Model Run Design for a Production Coding Agent

**T2 holdout, 2026-09-07.** This guide concerns changes to a coding agent’s context selection, tool feedback, validation/repair, retries, and decomposition while the generating model and reasoning-effort setting remain unchanged. The evidence supports local, paired ablations. It does not establish universal design rankings, model changes, or security effects.

## Answer and scope

Run design can materially change repository-task outcomes, but the strongest causal evidence is narrow: specific models, scaffolds, task subsets, and budget definitions. The most direct fixed-model studies support testing bounded context and compact observations, structured edit feedback, candidate allocation, and validation selection. Test-feedback repair has model-specific benefits and a necessary independent-restart control. Public SWE-bench outcomes are screening evidence only because test adequacy, solution-bearing input, and benchmark exposure can inflate apparent resolution.

**Decision:** retain the incumbent unless a candidate run design wins a predeclared paired evaluation on a frozen temporal or private holdout, under equal total budget and an information-policy audit. Use public benchmarks for development diagnostics, not deployment approval.

## R1. What primary evaluations measure

| Run-design choice | Primary evaluation: task and fixed agent/model | Comparator and method | Outcome | Cost or efficiency condition |
|---|---|---|---|---|
| Context window and observation history | SWE-agent, GPT-4 Turbo, 300 SWE-bench Lite tasks | 30-line, 100-line, and whole-file viewer; last five observations versus full history | 100 lines: **18.0%** resolved, versus 14.3% at 30 lines and 12.7% with whole files. Last five observations: **18.0%**, versus 15.0% with full history. | No per-arm token, latency, or dollar distribution. This is one ACI and benchmark, not a universal window-size rule. |
| Search feedback and edit feedback | Same SWE-agent evaluation | Summarized search, iterative result paging, or no search. Dedicated editor with linting, editor without linting, or no editor. | Summarized search: **18.0%**. Iterative: **12.0%**, below no search at 15.7%. Editor plus linting: **18.0%**; no linting: 15.0%; no editor: 10.3%. | The authors attribute iterative-search loss to exhaustive traversal consuming context/cost budget. The ablation does not separate all editor features or report per-arm cost. |
| Deployable versus gold-derived context | SWE-bench, 2,294 Python issue-to-patch tasks from 12 repositories; Claude 2 and GPT-4 | BM25 context compared with files changed by the reference patch. Also compare oracle files with gold-edit-centered compression. | Claude 2 BM25: **1.96%**; oracle retrieval: **4.8%**. Gold-edit compression: GPT-4 1.3% to 3.4%; Claude 2 4.8% to 5.9%. | Oracle files and gold-edit positions are unavailable in production. These are upper bounds showing sensitivity to context, not shippable selectors. GPT-4 budgeted conditions used 574 tasks. |
| Patch representation | SWE-bench; Claude 2 under oracle retrieval | Patch generation versus regenerating whole files | **4.8%** patch generation versus **2.2%** whole-file generation. On the shorter-input half: 7.8% versus 3.9%. | Oracle context and unspecified equal output-budget conditions preclude a universal tool/API ranking. |
| Hierarchical repository context | Agentless, GPT-4o `gpt-4o-2024-05-13`, 300 SWE-bench Lite tasks, with `text-embedding-3-small` retrieval | Prompt localization, embedding retrieval, and their combination, then skeleton-based narrowing | File localization: prompt 78.7%, embeddings 67.7%, combined 81.7%. Reported second-stage context falls from `>>3000` to `<<800` units with skeletonization. | Retrieval model and multi-stage pipeline change with the context policy, so this is not a pure compression ablation. |
| Decomposition and candidate allocation | Agentless, same GPT-4o/SWE-bench Lite pipeline | 40 repair patches allocated to a greedy location, merged multi-location context, or four location hypotheses times ten samples | Greedy: **88/300 (29.33%), $0.22**. Merged: 85/300 (28.33%), $0.24. Four-location allocation: **96/300 (32.00%), $0.29**. | Equal candidate count, but different context allocation and $0.07/task more than greedy. It is within-pipeline evidence, not a comparison with interactive agents. |
| Validation and candidate selection | Agentless, same pipeline | Majority vote, then regression-test filtering, then generated reproduction-test filtering | Majority: **77/300 (25.67%), $0.00**. Regression: **81/300 (27.00%), $0.01**. Reproduction: **96/300 (32.00%), $0.25**. | Extra test generation and execution are part of the intervention. Reported dollars are not latency or semantic-correctness evidence. |
| Feedback-driven repair | Conversational test-suite repair, 92 selected single-function SWE-bench Lite tasks; Llama 3.1 70B Instruct and GPT-4o-mini | Six five-request conversations with test failure feedback versus 30 independent one-request samples | Llama public+hidden validity: **47%** feedback versus **34%** independent. GPT-4o-mini: **46%** versus **47%**, no feedback advantage. | Equal maximum calls, not tokens, wall time, or dollars. Faulty-function localization is oracle-supplied and the task panel is filtered. |
| Repair iterations | FeedbackEval, 178 single-function SWE-bench Verified erroneous instances, fixed model/prompt/hyperparameters | Re-evaluate and regenerate test feedback through Repair@3 | Test feedback: GPT-4o 45.6% Repair@1 to **53.2% Repair@3**; Claude 3.5 59.4% to **68.6%**; DeepSeek-R1 68.2% to **75.7%**. | Later rounds have more repair opportunity and no cost/runtime data. Multi-iteration settings were run once. |
| Repairs versus independent restarts | Self-Repair, GPT-4 on APPS Python tasks | Feedback repairs compared with i.i.d. samples at equal program-sample count | Ten initial programs plus one repair each reached **1.05× pass@20**; two initial programs plus ten repairs each reached **0.97× pass@22**. | Feedback-token cost is excluded. This is direct counterevidence to assuming deeper repair dominates diverse attempts. |

### Source-bound quantitative contrasts

- In the SWE-agent GPT-4 Turbo experiment, a 100-line viewer beat whole-file exposure by **5.3 percentage points**, and summarized search beat iterative search by **6.0 points**.
- In Agentless, four location-conditioned groups added **8 solved tasks** over 40 samples at one greedy location, for **$0.07/task** more reported inference cost.
- In Agentless validation selection, generated reproduction tests added **15 solved tasks** beyond regression filtering, with **$0.24/task** additional reported cost.
- In the conversational-repair study, feedback changed hidden-test validity by **+13 points** for Llama 3.1 70B but **−1 point** for GPT-4o-mini under the equal-call comparator.

These contrasts remain tied to their stated systems and budget comparators. They do not compare SWE-agent with Agentless or establish that one architecture is better.

## R2. Counterevidence, reliability limits, and evaluator boundaries

1. **Benefits are model- and task-conditional.** GPT-4o-mini did not gain from conversational test feedback under the 30-call comparison. SWE-agent uses GPT-4 Turbo; Agentless uses GPT-4o plus an embedding model. Re-run the experiment after a model snapshot, reasoning setting, tokenizer, prompt, or tool-schema change.
2. **More context or interaction can be harmful.** Whole files and full history underperformed bounded views in SWE-agent, and iterative search underperformed no search. Agentless also reports that a staged approach is weaker where issue descriptions provide no location clue.
3. **Budget equality is not interchangeable.** Equal call count, equal program-sample count, and equal tokens/tool time/wall time/dollars answer different questions. The repair studies do not supply an equal-total-effort production comparison.
4. **Candidate generation and final selection differ.** Agentless reports at least one solving candidate for 126/300 tasks (42.0%) but 96/300 selected final patches (32.0%). More retries can expose a selector bottleneck rather than improve delivered outcomes. Its reported plateau around 40 candidates is pipeline-specific, not a general retry ceiling.
5. **Harness pass is not full correctness.** SWE-bench evaluates selected FAIL_TO_PASS and PASS_TO_PASS tests. SWE-Bench+ manual review found suspicious successful patches, weak-test patterns, incomplete fixes, and unrelated-file changes. Its reported rates depend on dataset slice and filtering rule: preserve the distinct Full figures (12.47% reported, 5.49% stricter classification, and a separately reported 3.97% filtered figure) and the Verified reviewed-success subset (22.4% to 10.0% after suspicious classifications). Do not combine them.
6. **Public inputs can leak solutions.** SWE-Bench+ classified 32.67% of 251 successful Full-benchmark patches as having solution material in issue text or comments. Tool feedback that exposes comments, PR text, future history, hidden tests, or gold-patch-derived files changes the information policy and cannot be treated as a scaffold-only change.
7. **Contamination evidence is diagnostic, not proof.** The SWE-Bench Illusion reports unusually high file-path prediction and n-gram overlap for SWE-bench-family tasks, while Ramos et al. show model- and benchmark-specific contamination signals. Neither access to training data nor n-gram similarity proves that a particular resolved patch was memorized. The original SWE-bench temporal split also found little difference for most models, which weakens the claim that all results are simple recall.
8. **Variance and reproducibility matter.** SWE-agent reports six Lite runs averaging 17.94% with 0.49 standard deviation, while noting task-level variation. The official SWE-bench evaluator caches by `run_id` and `instance_id`; reusing the pair with a changed patch can reuse the prior result. Preserve unique run identity, task manifest, configuration, trajectories, patch hashes, logs, and evaluator/container revisions.
9. **No retained source measures security effects.** Do not infer a security benefit or cost from feedback, retries, validation, decomposition, or richer observations.

## R3. Fixed-model production experiment and adoption rules

### Operational decision table

| Candidate change | Paired comparison and controls | Adopt only if | Do not adopt globally when |
|---|---|---|---|
| Bounded code windows or history | Current policy, small/medium/full windows, and recent-N/full history. Fix model, reasoning effort, prompt, action limit, repository snapshot, and total budget. | Held-out behavioral resolution has a positive paired CI and no cost, latency, or reviewed-false-pass guardrail breach. | Improvement occurs only on public data or a critical large/multi-file stratum regresses. |
| Search summarization | Current search, summarized/refinable results, and iterative paging under equal action and context budgets. | Localization and accepted-patch outcomes improve on holdout. | Summary hides decisive detail or no-location-clue tasks lose materially. |
| Edit acknowledgment or lint feedback | Same edit capability, with only changed-span/syntax/lint observation changed. | Fewer malformed edits and better held-out resolution justify added time and context. | Feedback is noisy, non-actionable, or consumes budget without paired benefit. |
| Validation/repair | One-shot, one-feedback-repair, and capped-repair arms against a token/tool-time/wall-time-matched independent-restart arm. | Repair exceeds restart and one-shot on held-out behavioral resolution without worse regression or false-pass rate. | It receives more total effort, hidden information, or only improves the public harness pass. |
| Retries/candidates | Predeclare serial, parallel, or adaptive sampling and fix total tokens, tool time, wall time, dollars, and candidate-selection policy. | Marginal selected-patch gain clears the product’s predeclared cost and latency threshold. | Only “any candidate succeeds” or pass@k rises while selected final-patch success does not. |
| Staged decomposition | Localization → repair → validation versus exploration, stratified by location clues and change scope. | It wins or is cost-effective in its intended strata. | No-location-clue, broad-search, or multi-file strata regress. Route only after evidence supports routing. |
| Benchmark-only gain | Public benchmark as development screen, with frozen private or temporal holdout for decision. | The result reproduces on a second frozen holdout slice with a clean transcript audit. | Leaderboard rank or one public score is the only evidence. |

### Concrete paired fixed-model evaluation artifact

```yaml
experiment_id: run-design-fixed-model-v1
hypothesis: "Candidate run policy improves held-out behavioral resolution over incumbent under equal total effort."

frozen_controls:
  model_id: "<exact provider/model snapshot>"
  reasoning_effort: "<unchanged>"
  system_prompt_sha256: "<hash>"
  tool_schema_sha256: "<hash>"
  decoding: {temperature: 0, seed_policy: "matched seed list"}
  repository_revision: "<immutable SHA>"
  environment_image: "sha256:<digest>"
  evaluator_revision: "<immutable SHA>"
  network: "disabled unless identical intended production input"
  prohibited_information: ["gold patches", "PR diffs", "future git history", "hidden tests", "solution-bearing comments"]
  max_input_tokens: 120000
  max_output_tokens: 16000
  max_tool_calls: 40
  max_test_executions: 4
  max_wall_seconds: 900
  max_usd: 2.00

arms:
  A_incumbent: "current run policy"
  B_candidate: "one explicitly named design change"
  C_restart_control: "independent attempts matched to B's token, tool-time, wall-time, and dollar ceilings"
  # For repair experiments, B may be one repair or capped repairs. These are candidate arms, not defaults.

tasks:
  public_dev: "instrumentation and debugging only"
  decision_holdout: "frozen private or post-cutoff tasks, inaccessible to the agent's final evaluator"
  unit: "issue + immutable repository snapshot + hidden behavioral tests"
  strata: ["location clue", "language", "repository", "single|multi-file", "repository size", "focused|broad tests"]
  assignment: "every task receives every arm; randomized, counterbalanced order"
  repeats: "one matched deterministic run, or a predeclared matched seed list when stochastic"

record_per_run:
  - task_id
  - arm
  - seed
  - hidden_behavioral_resolution
  - harness_pass
  - PASS_TO_PASS_preservation
  - regression_result
  - reviewed_false_pass_sample
  - input_tokens
  - output_tokens
  - tool_calls
  - tool_seconds
  - test_executions
  - wall_seconds
  - estimated_cost
  - retries
  - repair_attempts
  - stop_reason
  - patch_hash
  - trajectory_hash
  - prohibited_information_audit

analysis:
  primary: "paired delta in hidden behavioral resolution with 95% paired CI"
  secondary: ["win/loss/tie", "stratum deltas", "p50/p95 latency", "cost per resolved task", "regression rate", "reviewed false-pass rate", "marginal gain by attempt"]
  sensitivity: "repository-clustered analysis and complete-task reporting"

adoption_gate:
  require:
    - "95% paired-CI lower bound for held-out behavioral resolution is > 0"
    - "no predeclared cost, p95 latency, regression, or false-pass guardrail breach"
    - "no prohibited-information finding in transcripts"
    - "replication on a second frozen holdout slice"
  otherwise: "retain incumbent; classify the candidate as exploratory or limit it to a demonstrated stratum"
```

## Coverage and stopping boundary

**Coverage:** retained primary evidence covers context and representation (SWE-agent and SWE-bench), staged localization/candidate allocation/validation selection (Agentless), feedback repair and independent-restart counterevidence, plus evaluator validity, leakage, and contamination diagnostics. It also includes official SWE-bench harness documentation.

**Actual stop reason:** published evidence lacks a fixed-model, equal-realized-total-effort, production-representative causal evaluation of the listed run-design choices.

## Retained-source appendix

| Retained source: direct URL | Type / date | Method inspected | Supported claim in this guide | Limitation |
|---|---|---|---|---|
| Yang et al., [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/html/2405.15793) | Primary paper, NeurIPS 2024 | 300-task SWE-bench Lite GPT-4 Turbo ACI ablations, Tables 1 and 3, §5.1, Appendix B.5 | Bounded viewer/history, summarized search, and editor/linting materially changed reported resolution; task-level outcomes vary. | One model, interface, benchmark, and incomplete per-arm cost reporting. |
| Xia et al., [Agentless: Demystifying LLM-based Software Engineering Agents](https://arxiv.org/html/2407.01489v2) | Primary paper, 2024 | GPT-4o staged localization, repair-allocation, and validation-selection experiments, Tables 1, 3, 4, §§5–7 | Within-pipeline context, allocation, validation, selection, and no-location-clue limits. | Uses an embedding model and multi-stage pipeline. Does not causally compare staged and interactive agents. |
| Jimenez et al., [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/html/2310.06770) | Primary benchmark paper, ICLR 2024 | 2,294 task construction, BM25/oracle retrieval, gold-edit compression, patch representation, temporal discussion | Context and representation sensitivity, benchmark scope, oracle boundaries, evaluator scope. | Oracle retrieval/compression is non-deployable. Some model conditions used a 574-task budget subset. |
| [Official SWE-bench documentation](https://www.swebench.com/SWE-bench/) | Official documentation, undated | Verified benchmark and Docker-evaluation description | Verified is engineer-confirmed and evaluation is reproducible execution. | Documentation does not establish production correctness or run-design causality. |
| [Official SWE-bench repository](https://github.com/SWE-bench/SWE-bench) | Official repository documentation, undated | Evaluation README: Docker conditions, caching behavior, output logs | Harness identity and unique run IDs are necessary for reproducibility. | Operational documentation, not an outcome study. |
| Aleithan et al., [SWE-Bench+: Enhanced Coding Benchmark for LLMs](https://arxiv.org/html/2410.06992) | Primary empirical benchmark analysis, 2024 | Manual review of test-passing patches, leakage and weak-test classification, post-cutoff dataset | Harness pass limits, solution-bearing issues, dataset-slice-specific false-pass warnings. | Reviewer rubric, model/agent, task slice, and filtering rule constrain estimates. |
| Liang, Garg, and Moghaddam, [The SWE-Bench Illusion](https://arxiv.org/html/2506.12286) | Primary diagnostic study, 2025 | File-path prediction and n-gram overlap across API models and benchmarks | Public benchmark exposure is a contamination-risk signal. | Proxy diagnostics cannot prove memorization of a specific solution. |
| Ramos et al., [Are Large Language Models Memorizing Bug Benchmarks?](https://arxiv.org/html/2411.13323) | Primary diagnostic study, 2024 | Open-model corpus membership, NLL, and n-gram analyses | Contamination varies by model and benchmark; diagnostics are not proof. | Lite/other benchmark settings and open base models, not full-agent resolution. |
| [Exploring the Potential of Conversational Test Suite Based Program Repair on SWE-bench](https://arxiv.org/html/2410.04485v1) | Primary preprint, 2024 | 92 runnable, oracle-localized single-function tasks; 30-call conversation versus independent samples | Test feedback helped Llama 3.1 70B but not GPT-4o-mini under equal calls. | Calls, not total effort, are matched; filtered task set and oracle localization. |
| [FeedbackEval: A Benchmark for Evaluating Large Language Models in Feedback-Driven Code Repair Tasks](https://arxiv.org/html/2504.06939) | Primary benchmark/report, 2025 | Fixed-model feedback/re-generation through Repair@3 on erroneous instances | Observed test-feedback gains through three repair rounds for several models. | More repair opportunity, no cost/runtime data, and multi-round settings ran once. |
| [Is Self-Repair a Silver Bullet for Code Generation?](https://arxiv.org/html/2306.09896) | Primary paper, ICLR 2024 | GPT-4 APPS feedback repair versus i.i.d. program samples at matched sample count | Independent restarts are a required control for repair-policy testing. | Feedback-token cost excluded; self-contained code tasks, not repository repair. |
| [Is Three the Magic Number? An Empirical Evaluation of LLM-Based Repair Loops](https://arxiv.org/html/2607.05197) | Primary preprint, 2026 | Completion measured through ten repair rounds across generation/translation tools | Directional evidence to test low repair caps and diminishing returns. | Inspected rendering lacks extractable per-condition quantities; altered tool semantics and limited repetition. |
| [Dissecting the SWE-Bench Leaderboards: Profiling Submitters and Architectures of LLM- and Agent-Based Repair Systems](https://arxiv.org/html/2506.17208v2) | Primary empirical analysis, 2025 | Leaderboard/system disclosure and evaluator analysis | Leaderboard comparisons are incomplete and non-comparable without protocol disclosure. | PatchDiff/all-tests quantitative figures cited by that paper are not used here as primary evidence. |
