## R2 — Reliability, leakage, evaluator, and transfer counterevidence

**Scope:** sources inspected through 2026-09-07. This evidence constrains claims about run design. It does not establish a universal ranking of agents or run patterns.

| Risk | Decisive evidence | Implication |
|---|---|---|
| Benchmark-answer leakage | [SWE-bench+](https://arxiv.org/html/2410.06992v2) manually reviewed 251 SWE-Agent+GPT-4 passes. **32.67%** had the solution stated in issue text/comments and **31.08%** were suspicious passes under weak tests. Removing both reduced measured resolution from **12.47% to 3.97%**. Over **94%** of SWE-bench issues/PRs predated studied models’ cutoffs. | A score improvement can reflect extracting issue-provided answers, memorized public data, or evaluator weakness, not better context, validation, or repair design. |
| Fresh-task counterevidence | The same study’s post-cutoff, answer-leak-filtered SWE-bench+ yielded **0.55%** for SWE-Agent+GPT-4, versus **3.97%** on its filtered legacy set. Other reported SWE-bench+ results were **0.73%** SWE-RAG+GPT-4, **0.55%** SWE-RAG+GPT-3.5, and **3.83%** AutoCodeRover+GPT-4o. | Do not use static public SWE-bench alone to adopt a run change. Require a temporally fresh or private holdout. This is a dataset comparison, not a causal estimate of any one design feature. |
| Passing tests is an incomplete correctness oracle | SWE-bench+ reports that **67.72%** of its resolved instances, on average, “did not truly resolve the issue, despite passing all the tests.” The stated patterns were wrong localization, incomplete fixes, or incorrect fixes. | Record test-pass rate separately from independent patch review and behavior checks. A validation loop optimized against exposed tests can improve the metric while reducing real correctness. |
| Stochastic trajectories make one run unreliable | [SWE-rebench](https://arxiv.org/html/2505.20411) states: “the outcome of a single run can vary significantly,” and warns that reporting only a best run overstates resolved rate. Its protocol runs every model **five times**, reporting mean, **SEM**, and **pass@5**. | A/B comparisons need paired task-level seeds and repeated runs. Do not compare one pass@1 run, pass@N, or best-of-N result against a single-run baseline. |
| Scaffold confounding | SWE-rebench identifies “highly engineered prompts, complex multi-agent frameworks, retry mechanisms, best-of-N sampling strategies and validation loops” as factors that prevent isolation of raw capability. It also warns of “reporting pass@N as pass@1” or implicitly using final-test information. | Hold model, tools, test visibility, prompt, budget, timeout, retry count, seed policy, and evaluator constant except for the intended run-design intervention. Log every retry and budget consumed. |
| Domain-transfer failure | [SWE-bench Multimodal](https://arxiv.org/html/2410.03859v1) says ordinary SWE-bench is Python-only and mostly text-only. On **619** visual JavaScript tasks from **17** repositories, the adapted SWE-agent resolved **12%**, versus **6%** for the next-best system. Python-oriented Agentless JS scored **4.6%** and had file-localization F1 **0.142**, versus SWE-agent’s **0.367**. | A result on Python package repairs does not transfer automatically to JavaScript, UI, visual, or multi-language work. Evaluate production task strata separately. |
| Evaluator false negatives and coverage limits remain even after curation | [SWE-Bench Pro](https://arxiv.org/html/2509.16941) explicitly limits coverage: Java, C++, and Rust are underrepresented. Its limitation states that a correct real-world solution may fail the original test suite because many correct solutions exist. | Test suites can reject valid alternatives as well as accept invalid patches. Use reviewer adjudication for a sampled set of both test passes and test failures. |

### Evaluator mechanics and conditions

The original [SWE-bench](https://arxiv.org/html/2310.06770) evaluator applies the PR-derived test patch, applies the predicted patch, and counts success only if the selected tests pass. Each task has at least one fail-to-pass test. **40%** have at least two, plus a median **51** additional tests intended to protect existing functionality.

That is executable and useful, but it is not equivalent to complete behavioral correctness. The original benchmark itself is restricted to **2,294** tasks from **12 Python repositories**. Its own limitations section says all task instances are Python.

SWE-bench Multimodal found flaky evaluation cases during construction and ran each candidate task **10 times**, removing inconsistent tests. This is direct evidence that evaluation stability needs checking, not assuming.

### Decisive source passages

1. **Leakage and weak tests:** SWE-bench+ reports: “**32.67%** of the successful patches involve ‘cheating’” from issue/comment solutions, and “**31.08%** … are suspicious patches due to weak test cases.”  
   Source: [SWE-bench+](https://arxiv.org/html/2410.06992v2)

2. **Post-cutoff contrast:** “When we ran SWE-Agent+GPT-4 on SWE-bench+ dataset, its resolution rate dropped to **0.55%**.”  
   Source: [SWE-bench+](https://arxiv.org/html/2410.06992v2)

3. **Run variance:** SWE-rebench: “Due to the stochastic nature of agent trajectories, the outcome of a single run can vary significantly.”  
   Source: [SWE-rebench](https://arxiv.org/html/2505.20411)

4. **Cross-domain limit:** SWE-bench Multimodal concludes that top SWE-bench systems “struggle with SWE-bench M,” exposing limits in visual problem solving and cross-language generalization.  
   Source: [SWE-bench Multimodal](https://arxiv.org/html/2410.03859v1)

5. **Test-oracle limit:** SWE-Bench Pro: “real software engineering tasks may have a variety of correct solutions, even if they do not pass the original tests.”  
   Source: [SWE-Bench Pro](https://arxiv.org/html/2509.16941)

### Required reliability guardrails for fixed-model run-design claims

| Claim type | Minimum evidence |
|---|---|
| “Improves task success” | Paired, repeated runs per task, mean difference with uncertainty, same fixed model/tools/budget, and fresh/private holdout. |
| “Improves reliability” | Per-task success frequency across seeds, not merely pass@5 or best-of-N. Report timeout, invalid-patch, and evaluator-error rates. |
| “Improves correctness” | Hidden tests plus blinded human review of a sample of passes and failures. Separate evaluator pass from adjudicated correctness. |
| “Transfers to production” | Stratified holdout covering target languages, repositories, task sizes, visual/UI requirements, and dependency environments. |
| “Is more efficient” | Same model and reasoning setting, with median and tail tokens, tool calls, wall time, retry count, and cost per adjudicated-correct fix. |

### Coverage and gaps

- **Covered:** public-data contamination, answer leakage, weak/flaky tests, trajectory stochasticity, scaffold confounding, Python-to-JavaScript/visual transfer limits, and incomplete test-oracle validity.
- **Not established:** a causal estimate for any specific context-selection, retry, decomposition, or validation strategy under one fixed model. These sources motivate the experimental controls but do not substitute for that experiment.
- **Not established:** security properties. None of the inspected sources measures security regressions, secret handling, or vulnerability introduction, so no security claim should follow.