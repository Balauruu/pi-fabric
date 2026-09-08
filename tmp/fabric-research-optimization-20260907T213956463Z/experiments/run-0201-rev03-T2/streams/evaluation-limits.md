# T2-C: SWE-bench Validity, Leakage, and Reliability Limits

**Scope.** Evidence available on or before **2026-09-07**. This is a validity guide for fixed-model run-design experiments, not a model comparison or a security assessment. SWE-bench results measure execution against selected repository tests. They do not by themselves establish production correctness, generalization, or safety.

## Decision summary

SWE-bench-style evaluations are useful for controlled within-agent comparisons only when the experiment fixes the harness, task split, model snapshot, reasoning setting, tool environment, and total budget. Treat a score increase on public SWE-bench Verified as **screening evidence**, not an adoption decision, unless it reproduces on a temporally held-out or private task set and survives stronger validation.

The strongest direct run-design evidence found concerns **context selection and output representation**. The original SWE-bench study found large changes with a fixed model under oracle versus BM25 context, but oracle context is not deployable because it reveals files changed by the reference patch. No inspected primary source cleanly isolates validation/repair loops, retries, decomposition, or tool-feedback designs under a fixed total reasoning-and-cost budget.

## R1. Primary evaluations relevant to run design

| Run-design choice | Primary evaluation | Task, fixed agent/model, comparator, method | Outcome and cost/effort condition | Decision use and caveat |
|---|---|---|---|---|
| Context selection | [Jimenez et al., SWE-bench, §4.1, §5, Appendix C.1](https://arxiv.org/html/2310.06770) | 2,294 GitHub issue-to-patch tasks from 12 Python repositories. **Claude 2** compared BM25-retrieved code context with “oracle” files edited by the gold PR. | Claude 2 resolved **1.96%** with BM25 and **4.8%** with oracle retrieval, a **+2.84 percentage-point** contrast. GPT-4 oracle and BM25-27K tests used only a **25% random subset (574 tasks)** because of budget. | Establishes that context choice can dominate a fixed-model result. Oracle retrieval uses reference-patch information unavailable in production, so it is a localization upper bound, not an implementation to ship. |
| Context compression and selection | [Jimenez et al., §5, Table 6 discussion](https://arxiv.org/html/2310.06770) | Same task family and fixed models. Oracle-file context versus oracle files collapsed except for lines edited by the gold PR ±15 lines. | GPT-4: **1.3% → 3.4%**. Claude 2: **4.8% → 5.9%**. The paper reports that larger BM25 windows raised oracle-file recall but reduced performance. | Strong evidence that more supplied code is not automatically better. This is also non-deployable because collapse positions depend on gold edits. Test deployable localization/compression methods, not gold-derived compression. |
| Patch representation | [Jimenez et al., §5](https://arxiv.org/html/2310.06770) | Claude 2 under oracle retrieval, patch generation versus regenerating whole files. | **4.8%** for patch generation versus **2.2%** for whole-file generation. On the shorter half by input tokens: **7.8%** versus **3.9%**. | A fixed-model formatting intervention can change execution success. Oracle context and unspecified equivalent output-token budgets prevent interpreting this as a universal API-design ranking. |
| Evaluation target and validity, not a run-design intervention | [Aleithan et al., SWE-Bench+, Abstract, §§2.2–4](https://arxiv.org/html/2410.06992) | Manual review of **251** test-passing SWE-Agent + GPT-4 patches on SWE-bench Full. Then the same named systems on a new post-cutoff dataset. | Full-set reported rate **12.47%**. Authors report **32.67%** answer leakage and **31.08%** weak-test suspicious cases among successful patches. Their stricter classifications yield **5.49%** correct fixes, while a separate filtering statement reports **3.97%**. On SWE-bench+, SWE-Agent + GPT-4 resolved **0.55%**. | Demonstrates that pass-rate is not a sufficient outcome measure. It does **not** isolate a run-design change because benchmark, task dates, and systems differ. Preserve both reported stricter rates rather than collapsing them. |
| Memorization diagnostic, not agent resolution | [Liang, Garg, and Moghaddam, §§3–5](https://arxiv.org/html/2506.12286) | Ten API models, issue text plus repository name but no repository structure, predicting a changed Python file path. Cross-benchmark diagnostic. | File-path accuracy on SWE-bench Verified: **60–76%** across models, compared with **<53%** on outside-repository tasks. Maximum consecutive 5-gram overlap: **35%** on Verified/Full versus **18%** on other benchmarks. Chat models had 2,048 completion tokens and o-series models 4,096. | Evidence that benchmark exposure can confound a run-design comparison. It is a proxy diagnostic, not direct proof that a resolved patch was memorized or that all leaderboard gains are invalid. |
| Independent contamination counterevidence | [Ramos et al., §§II–IV](https://arxiv.org/html/2411.13323) | Open base models only, benchmark fixed files versus recent repositories. Membership in TheStack, NLL, and 5-gram accuracy. SWE-bench **Lite**, not Verified/full-agent evaluation. | codegen-multi: **82%** 5-gram accuracy on Defects4J and **34 pp** more than new repositories. LLaMA 3.1 70B had Defects4J:GitBug-Java NLL ratio **1.27**, versus codegen-multi’s **3.82**. | Contamination risk is model- and benchmark-specific, not universal. The authors explicitly note that membership does not prove model exposure, and low n-gram similarity does not prove absence of memorization. |

### Evidence gap

No retained primary evaluation cleanly answers whether, **at one fixed model and fixed total reasoning, token, tool-call, wall-time, and dollar budget**, validation/repair, retries, decomposition, or richer tool feedback improve production-relevant repository repair. Do not infer those effects from cross-agent leaderboard comparisons.

## R2. Reliability limits and counterevidence

### F1. Test passing is an incomplete correctness oracle

SWE-bench evaluates generated patches using repository tests linked to the original PR. That is reproducible execution, not proof of complete behavioral correctness. In SWE-Bench+, three authors independently reviewed successful SWE-Agent + GPT-4 patches and reported weak-test patterns, incomplete fixes, and patches changing unrelated files despite passing tests. On their reviewed SWE-bench Verified successes, **55.36%** were classified suspicious, reducing the reported rate from **22.4% to 10.0%**. This is material, but is specific to that agent, model, reviewer rubric, and successful-patch subset.  
Source: [SWE-Bench+, §2.3](https://arxiv.org/html/2410.06992).

**Implication:** record harness pass as one metric. Add held-out behavioral tests, mutation testing where feasible, and blinded patch review for a stratified sample of passes and failures.

### F2. Public issue text can reveal solutions

SWE-Bench+ classified **32.67% of 251** successful Full-benchmark patches as having a solution outlined in an issue report or comments. The same study found direct solutions in **37 SWE-bench Verified issue/discussion records**. This is evaluation-input leakage, distinct from model-pretraining contamination.  
Source: [SWE-Bench+, Abstract and §2.3](https://arxiv.org/html/2410.06992).

**Implication:** a context-selection or tool-feedback intervention that surfaces issue comments, PR text, or repository history must be explicitly marked as information-policy changed. It cannot be compared as though only “agent reasoning” changed.

### F3. Temporal and repository exposure confound public benchmarks

The original benchmark is built from public GitHub repositories and historical issues. SWE-Bench+ notes that **94%** of Full instances and their PRs predate the studied models’ cutoff dates. Liang et al. find unusually high no-repository-context localization and reproduction performance on SWE-bench-family tasks.  
Sources: [SWE-Bench+, Abstract](https://arxiv.org/html/2410.06992), [SWE-Bench Illusion, Abstract and §4](https://arxiv.org/html/2506.12286).

**Counterevidence:** the original SWE-bench paper partitioned oracle-retrieval tasks before and after 2023 and reported little difference for most models. This weakens a simplistic claim that all results are direct recall of a later repository version. It does not eliminate training exposure, benchmark-specific tuning, solution-text leakage, or repository-distribution effects.  
Source: [Jimenez et al., §5 and Table 7 discussion](https://arxiv.org/html/2310.06770).

### F4. Contamination diagnostics are proxies

Liang et al. explicitly lack model hidden states and training data. Their n-gram measure is noisy because correct solutions naturally overlap with gold code. Ramos et al. likewise state that training-corpus membership does not establish that a model saw or memorized a particular file, and their NLL comparisons are valid only within a model family because tokenization and architectures differ.  
Sources: [SWE-Bench Illusion, limitations](https://arxiv.org/html/2506.12286), [Ramos et al., §§II–IV](https://arxiv.org/html/2411.13323).

**Implication:** call these diagnostics “contamination-risk signals,” not proof of leakage. Report them alongside temporal holdout results rather than using them to discard an experiment automatically.

### F5. Reproducibility requires harness identity, not merely a benchmark name

The official harness uses Docker and publishes logs, but its README warns that evaluation caching keys only on `run_id` and `instance_id`. Reusing that pair with a changed patch reuses the first evaluation result. It also states resource requirements of at least 120 GB storage, 16 GB RAM, and 8 CPU cores.  
Source: [official SWE-bench repository, evaluation notes](https://github.com/SWE-bench/SWE-bench).

**Implication:** generate an immutable run ID from code commit, container digest, task-manifest hash, configuration hash, and prediction hash. Save raw trajectories, patches, test logs, and the full evaluator result.

## R3. Fixed-model production experiment and adoption rules

### Operational decision table

| Decision | Fixed controls | Required evidence | Adopt | Do not adopt |
|---|---|---|---|---|
| D1: Context selector or compression | Exact model version, reasoning setting, system prompt, tool schema, repo image, max input/output tokens, and total budget | Paired task-level comparison on frozen public dev tasks **and** private or post-cutoff holdout. Report resolution delta, test pass, cost, latency, localization recall, and regression rate. | Positive paired confidence interval on holdout, no material cost/latency breach, and no increase in independently reviewed false passes. | Improvement only on public SWE-bench, gold-derived context, or a score gain that disappears on holdout. |
| D2: Validation/repair loop | Same total tool calls, tokens, wall time, and retry allowance for both arms. Baseline receives equivalent unused budget or a neutral terminal action. | Compare “one-shot patch” with “test-feedback repair” under a single total budget. Log each test command, failure, patch, and stop reason. | Holdout resolution rises with non-inferior false-pass rate and acceptable median/p95 cost. | Repair uses a larger budget, hidden test information, or only increases harness passes without behavioral validation. |
| D3: Retries or decomposition | Same model sampling parameters and total attempt budget. Pre-register whether attempts are serial, parallel, or adaptive. | Per-task paired outcomes and best-of-budget outcome, plus attempts used and marginal gain by attempt number. | Incremental holdout gain remains above the preset business threshold after cost and latency. | “Pass@k” is reported without total cost, or retries consume more effort than baseline. |
| D4: Tool feedback | Same tool permissions and repository snapshot. Explicitly deny network, future git state, PR diffs, hidden tests, and issue comments unless they are intended production inputs. | Ablate only the feedback representation or summarization policy. Audit tool transcripts for prohibited information. | Benefit appears on private/post-cutoff tasks and transcript audit is clean. | Tool traces can access solution-bearing sources or differ in permissions across arms. |
| D5: Benchmark-only gain | All controls above. | Replication on an independent, temporally held-out internal set with stronger oracle checks. | Use as screening only until holdout corroborates. | Ship based on leaderboard position or one public benchmark score. |

### Concrete paired evaluation artifact

```yaml
experiment_id: run-design-context-v1
hypothesis: >
  Deployment-context selector B improves repository-task resolution over selector A
  without increasing false-pass rate, while model and total effort remain fixed.

frozen_controls:
  model: provider/model-snapshot-YYYY-MM-DD
  reasoning_effort: fixed
  system_prompt_sha256: "<hash>"
  tool_schema_sha256: "<hash>"
  container_image_digest: "sha256:<digest>"
  network: disabled
  repository_history: base_commit_only
  hidden_tests: unavailable_to_agent
  temperature: 0
  max_wall_seconds_per_task: 900
  max_total_input_tokens_per_task: 120000
  max_total_output_tokens_per_task: 16000
  max_tool_calls_per_task: 40
  max_test_executions_per_task: 4
  max_usd_per_task: 2.00

arms:
  A:
    change: "current deployable selector"
  B:
    change: "candidate deployable selector"
  invariant: >
    Both arms receive the same issue text, checkout, tools, permissions,
    model, reasoning setting, and total budget. No gold-patch-derived files,
    issue comments, PR text, future commits, or network retrieval.

task_sets:
  public_dev:
    purpose: "debug instrumentation only, never final adoption"
    manifest_sha256: "<hash>"
  private_temporal_holdout:
    purpose: "adoption decision"
    created_after: "<model-training-cutoff-or-ingestion-date>"
    frozen_before_experiment: true
    stratify_by: [language, repository, task_type, changed-file-count, test-runtime]

pairing:
  unit: "task_id"
  order: "randomized and counterbalanced"
  retries: "one deterministic run per arm; stochastic designs use matched seed list"
  analysis: >
    paired delta in task resolution; paired bootstrap 95% CI; repository-clustered
    sensitivity analysis; report all tasks, not only applied patches.

outcomes:
  primary: "held-out behavioral resolution"
  secondary:
    - "official harness pass"
    - "PASS_TO_PASS preservation"
    - "patch applies"
    - "median and p95 wall time"
    - "median and p95 token/tool/test usage"
    - "cost per resolved task"
    - "reviewed false-pass rate"
  validation:
    - "run official task tests"
    - "run independent held-out regression tests where available"
    - "mutation or adversarial tests for a sampled pass set"
    - "blinded human review of stratified passes and failures"

adoption_gate:
  require:
    - "primary paired 95% CI lower bound > 0"
    - "no predeclared cost, latency, or false-pass guardrail breach"
    - "no prohibited-information transcript finding"
    - "result reproduced on a second frozen holdout slice"
  otherwise: "retain incumbent and classify candidate as exploratory"
```

## Retained-source appendix

| Source | Status and decisive locator | Requirements covered |
|---|---|---|
| [Jimenez et al., “SWE-bench: Can Language Models Resolve Real-World GitHub Issues?” (ICLR 2024)](https://arxiv.org/html/2310.06770) | Original benchmark paper. §2 construction, §4.1 retrieval protocol, §5 and Table 6 discussion, Appendix C.1 budget caveat, Table 7 temporal analysis. | R1, R2, R3 |
| [Official SWE-bench documentation](https://www.swebench.com/SWE-bench/) | Official statement that Verified contains 500 engineer-confirmed solvable problems and Docker evaluation is reproducible. | R2 |
| [Official SWE-bench repository](https://github.com/SWE-bench/SWE-bench) | Evaluation README notes Docker harness, resource conditions, result-cache key behavior, and output-log locations. | R2, R3 |
| [Aleithan et al., “SWE-Bench+: Enhanced Coding Benchmark for LLMs”](https://arxiv.org/html/2410.06992) | Abstract, §§2.2–2.3, §4. Manual review design, answer leakage, weak-test classifications, Verified/Lite counts, post-cutoff SWE-bench+ construction. | R1, R2, R3 |
| [Liang, Garg, and Moghaddam, “The SWE-Bench Illusion”](https://arxiv.org/html/2506.12286) | Abstract, §§3–4, limitations. Cross-benchmark localization/reproduction diagnostic, model/token conditions, and proxy limitations. | R2, R3 |
| [Ramos et al., “Are Large Language Models Memorizing Bug Benchmarks?”](https://arxiv.org/html/2411.13323) | Abstract, §§II–IV. Triangulated membership/NLL/5-gram method, model-specific results, and stated diagnostic limits. | R2, R3 |

**Explicit gap:** no retained source supplies a decision-grade, fixed-model-and-fixed-total-effort causal evaluation of retries, decomposition, validation/repair, or tool-feedback policy on a production-representative holdout. The paired artifact above is therefore an experiment prescription, not a claim that any one design wins.