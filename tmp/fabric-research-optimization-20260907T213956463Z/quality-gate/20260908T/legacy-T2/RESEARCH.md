# Fixed-model coding-agent run design: decision guide

**Question date:** 2026-09-07. **Scope:** change controller/run design while holding the exact model version and reasoning-effort setting fixed. Evidence is strongest for Python repository issue repair under specific harnesses. It does not establish a universal ranking, a model change, production transfer, or security properties.

**Method note:** This is a direct-controller legacy transport adaptation of the supplied repaired evidence. It preserves the inspected sources, reported conditions, and limitations without adding candidate-verification process.

## Decision

Adopt, behind paired evaluation, (1) ranked bounded context with summaries and capped file slices, (2) compact actionable tool feedback and edit guardrails, (3) bounded working state rather than raw full history, and (4) cheap regression validation before selective task-specific reproduction testing. Add retries only after a new localization, hypothesis, or diagnostic signal. Do not make full-history retention, exhaustive traversal, or a larger retry budget the default.

## R1. Primary evaluations of run-design choices

| Lever and evaluation | Task, fixed agent/model, and method | Source-bound contrast | Cost or efficiency condition | Decision use |
|---|---|---|---|---|
| Context selection and compression, SWE-agent ACI ablation | 300 SWE-bench Lite tasks, GPT-4 Turbo, $4/instance cap. Same agent/model while interface components varied. | Summarized search **18.0%**, iterative result-by-result search **12.0%**, no search **15.7%**. File viewer: 30 lines **14.3%**, 100 lines **18.0%**, full file **12.7%**. | Successful runs: median **$1.21/12 steps**. Unsuccessful: **$2.52/21 steps**. | Prefer bounded summaries and ~task-local slices. More traversal or full files were worse in this harness. |
| Tool feedback and context history, SWE-agent ACI ablation | Same 300-task, GPT-4 Turbo setup. | Linting edit action **18.0%** versus **15.0%** without. Last five observations **18.0%** versus full history **15.0%**. | Same $4 cap. | Normalize compiler/test feedback and retain compact current state, not raw trajectory. |
| Context retrieval, Agentless | 300 SWE-bench Lite issue fixes, `gpt-4o-2024-05-13`. Localization pipeline. | Prompt retrieval file localization **78.67%**, filtered embedding **70.33%**, combined **81.67%**. Combined beat prompt-only by **3.00 pp**. | Per issue: prompt **$0.02**, filtered embedding **$0.04**, combined **$0.06**. | Evaluate retrieval by downstream repair, not retrieval recall alone. |
| Hierarchical decomposition, Agentless | Same model and task. Localize files then relevant elements. | Full localized files can exceed **3,000** lines. The next hierarchy reduces context below **800** lines; skeletons retained more ground-truth locations than whole files. | No isolated end-to-end solve-rate contrast retained. | Treat as a bounded-context hypothesis to test locally, not a measured universal gain. |
| Retry diversity and decomposition, Agentless | Same model and benchmark. Four location sets and repair sampling. | 40 repairs from one greedy location set: **88/300 (29.33%)**. Merged multi-location contexts: **85 (28.33%)**. Four separately sampled sets ×10: **96 (32.00%)**. | Average repair cost **$0.22**, **$0.24**, **$0.29**, respectively. Performance plateaued around 40 samples. | Preserve genuinely distinct contexts only if a selector can exploit the additional candidates. |
| Validation/repair selection, Agentless | Same model and benchmark. Candidate selection varied. | Majority vote **77/300 (25.67%)**. + regression tests **81 (27.00%)**. + generated reproduction tests **96 (32.00%)**. | Selection-stage average cost **$0.00**, **$0.01**, **$0.25**. | Run cheap regression tests first. Generate reproduction tests only when they can discriminate plausible candidates. |
| Context and output format, SWE-bench | 2,294 tasks from 12 Python repositories. Same model within each condition, including GPT-4 and Claude 2. | Claude 2 BM25 **1.96%** vs oracle reference-patch files **4.8%**. Oracle collapsed files: GPT-4 **1.3%→3.4%**, Claude 2 **4.8%→5.9%**. Claude 2 full-file generation **2.2%** vs patch **4.8%**. Shorter half: **3.9%** vs **7.8%**. | At 27k tokens BM25 found an oracle-file superset in ~40% but none of the oracle files in almost half. Increasing max BM25 context improved recall but performance dropped. | Use patch/diff output and selective context. Oracle files measure headroom only, not deployable retrieval. |
| Stateful repair/search, RepairAgent | GPT-3.5-0125 on Defects4J. Alternates localization, information collection, hypothesis, patching, validation. | Full multi-cycle workflow fixed **21/100** in its ablation. Removing search tools fixed about half as many and doubled cost. A configuration reported **16 fixes for $29**, a **25%** capability decrease with **81%** higher cost. | Full result: 164 correct fixes/835 bugs, mean **270,000 tokens/$0.14 per bug**. The ablation is only 100 random bugs. | Directional evidence only. Gate retries on information gain and cost. |
| Reflection/retries counterexample, Reflexion | GPT-4 on HumanEval. | Reflexion reported **91% pass@1** vs prior GPT-4 **80%**. On 50 hardest HumanEval Rust tasks, reflection **52%** vs baseline **60%**. Generated-test false-positive execution: MBPP Python **16.3%**, HumanEval Python **1.4%**. | No general retry budget follows. | Reflection and generated-test feedback need local empirical gating. |

Agentless is a prescribed localization → repair → validation pipeline, not an autonomous tool-choice loop: top three files, four edit-location sets, ten repairs per set, and selection among 40 patches. Its procedure documentation records repository regression tests and up to 40 generated reproduction-test candidates before reranking.

## R2. Counterevidence and reliability limits

| Constraint | Evidence | Required interpretation |
|---|---|---|
| Public benchmark leakage and answer exposure | SWE-bench+ manual review of 251 SWE-Agent+GPT-4 passes found **32.67%** with solution text in issue/comments and **31.08%** suspicious under weak tests. Removing both changed resolution **12.47%→3.97%**. More than **94%** of issues/PRs predated studied-model cutoffs. | A score change may be issue-answer extraction, memorization, or a weak evaluator, not a run-design effect. |
| Fresh-task contrast | SWE-bench+ post-cutoff answer-leak-filtered result: SWE-Agent+GPT-4 **0.55%** versus **3.97%** on filtered legacy data. Other reported post-cutoff results: SWE-RAG+GPT-4 **0.73%**, SWE-RAG+GPT-3.5 **0.55%**, AutoCodeRover+GPT-4o **3.83%**. | Require fresh or private holdout. These are dataset contrasts, not causal estimates for a lever. |
| Test passing is not correctness | SWE-bench+ reports **67.72%** of resolved instances on average did not truly resolve the issue despite passing tests. | Separate evaluator pass from independent behavior checks and blinded review. |
| Stochastic runs | SWE-rebench says a single run can vary significantly and runs each model five times, reporting mean, SEM, and pass@5. | Run paired task-level repetitions. Never compare a single run, best-of-N, or pass@N to a single-run baseline. |
| Scaffold confounding | SWE-rebench identifies prompts, multi-agent frameworks, retries, best-of-N, and validation loops as confounders and warns against pass@N reported as pass@1 or final-test leakage. | Hold model, reasoning effort, prompt, tools, test visibility, budgets, timeout, retry policy, seeds, and evaluator fixed except one lever. |
| Domain transfer | SWE-bench Multimodal: 619 visual JavaScript tasks from 17 repositories. Adapted SWE-agent **12%**, next best **6%**. Agentless JS **4.6%** and localization F1 **0.142**, versus SWE-agent **0.367**. | Python repair findings do not automatically transfer to JS, UI, visual, multi-language, or production work. Stratify local holdout. |
| Evaluator coverage and false negatives | SWE-bench Pro notes Java, C++, Rust underrepresentation and that valid solutions may fail original tests. SWE-bench Multimodal ran candidates 10 times and removed inconsistent tests. | Adjudicate samples of test passes and failures and check test stability. |

Original SWE-bench applies a PR-derived test patch then the predicted patch, requiring selected tests to pass. Each task has at least one fail-to-pass test, 40% have at least two, and a median 51 additional tests protect existing behavior. This is useful executable evaluation, not complete semantic correctness. The original corpus is 2,294 tasks from 12 Python repositories.

## R3. Production experiment and adoption rules

### Concrete paired fixed-model evaluation artifact

```yaml
experiment: controller-change/<short-name>
unit: issue-or-task-instance
pairing:
  corpus: production-like holdout frozen before implementation
  stratify_by: [repository, language, task_type, change_size]
  assignment: every task runs both arms from identical base commit
fixed:
  model: <exact-provider-model-version>
  reasoning_effort: <exact-setting>
  system_prompt: <hash>
  temperature: <value>
  seed_policy: <same-seed-or-N-seeds-per-arm>
  tool_permissions: <identical>
  environment_image: <digest>
  task_inputs: <issue-and-repository-revision-hashes>
  wall_clock_cap: <seconds>
  token_cap: <tokens>
  dollar_cap: <currency-value>
arms:
  A_baseline:
    controller_version: <hash>
    context_policy: <current>
    retry_policy: <current>
    validation_policy: <current>
  B_candidate:
    controller_version: <hash>
    changed_lever: <one lever only>
    expected_mechanism: <pre-registered>
outcomes:
  primary: independently-run heldout tests pass
  secondary: [patch applies cleanly, regression tests pass, reviewer acceptance or blinded semantic review, cost_usd, input_output_tokens, wall_clock_seconds, tool_calls, attempts, unsafe_or_policy_blocked_actions]
analysis:
  primary_estimate: paired resolved-rate difference B_minus_A
  uncertainty: paired bootstrap 95% CI
  report: [wins_B, wins_A, both_pass, neither_pass, median paired cost difference, failure-signature transition table]
  exclusions: predeclared only, with raw count and reason
decision_rule:
  adopt_if:
    - primary CI lower bound is greater than 0
    - median cost increase is within predeclared budget
    - no material regression in any predeclared task stratum
  otherwise: retain baseline or run a narrowed follow-up
artifacts_per_run: [immutable task revision, controller/config hashes, complete tool trace, compacted contexts supplied to model, patch, test commands outputs and exit codes, token/cost/time accounting]
```

This artifact measures policy-blocked or sandbox-escape events, but no inspected evidence supports a claim that a design is more secure.

### Operational decision table

| Change | Evaluate first | Adopt when | Reject or roll back when |
|---|---|---|---|
| Summarized ranked search and bounded slices | Localization-heavy holdout | Paired resolved-rate CI lower bound >0 and cost is within budget | Traversal rises, context-cap hits increase, or hard-task resolution falls |
| Compact compiler/test feedback and edit guardrails | Build/test-failure tasks | More repairs after a failing validation | Compression omits needed file, line, assertion, or stack-frame detail |
| Bounded working state | Multi-step fixes | Same or higher resolution with lower tokens | Refuted hypotheses recur or required cross-file state is lost |
| Regression then reproduction tests | Candidate-patch selection | Incremental adjudicated acceptance quality exceeds generation/execution cost | Tests are flaky, non-discriminating, unisolated, or merely raise exposed-test pass |
| Extra retry after diagnostic transition | Tasks with failure output | Attempt n+1 changes hypothesis, evidence, or patch scope and improves paired outcomes | Same failure signature repeats, no new evidence occurs, or marginal gain misses the cost threshold |

**Adopt now:** implement the bounded-context, compact-feedback, bounded-state, and staged-validation candidates as single-lever paired experiments, not as an unmeasured bundled controller rewrite. **Strongest support:** same-model ablations show summarized/limited context and linting outperform their comparators, while Agentless shows regression and reproduction-test selection gains with stated costs. **Highest-impact uncertainty:** transfer to the target task mix and whether observed evaluator passes are adjudicated correctness. **Measurements that change the decision:** repeated paired heldout resolution with confidence intervals, stratum regressions, adjudicated pass/fail samples, evaluator-flake rate, and median/tail token, time, tool-call, retry, and cost deltas.

## Retained-source appendix

1. Xia et al. (2024), *Agentless: Demystifying LLM-based Software Engineering Agents*. Primary fixed-model ablations, costs, benchmark-quality analysis, and threats. https://arxiv.org/html/2407.01489
2. OpenAutoCoder, *Agentless SWE-bench procedure*. Implementation procedure for repair count, regression/reproduction tests, and reranking. https://github.com/OpenAutoCoder/Agentless/blob/main/README_swebench.md
3. Jimenez et al. (2024), *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?* Benchmark, evaluator, fixed-model context/output comparisons, and limitations. https://arxiv.org/html/2310.06770
4. Yang et al. (2024), *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering*. Fixed-model ACI ablations, budget, and trajectory cost. https://arxiv.org/html/2405.15793
5. Shinn et al. (2023), *Reflexion: Language Agents with Verbal Reinforcement Learning*. Fixed-GPT-4 programming outcomes, generated-test false positives, and negative Rust result. https://arxiv.org/html/2303.11366
6. Xia and Zhang et al. (2024), *RepairAgent: An Autonomous, LLM-Based Agent for Program Repair*. Stateful workflow, ablation scope, costs, and validity threats. https://arxiv.org/html/2403.17134
7. SWE-bench+ (2024), benchmark leakage and weak-test analysis, including post-cutoff comparison. https://arxiv.org/html/2410.06992v2
8. SWE-rebench (2025), repeated-run protocol, stochasticity, and scaffold-confounding limits. https://arxiv.org/html/2505.20411
9. SWE-bench Multimodal (2024), visual JavaScript transfer evaluation and flaky-test curation. https://arxiv.org/html/2410.03859v1
10. SWE-Bench Pro (2025), evaluator coverage and valid-solution false-negative limitations. https://arxiv.org/html/2509.16941
