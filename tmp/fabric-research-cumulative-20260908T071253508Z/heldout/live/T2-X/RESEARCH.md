# Fixed-model coding-agent run design: decision guide

**Scope and research date.** Decision-grade synthesis for repository-level issue repair, through **2026-09-07**. The decision is whether to change context selection, tool feedback, validation/repair, retries, or decomposition while holding the production model and configured reasoning effort fixed. “Resolved” below means the cited study’s evaluator result, not a security or production-incident claim. Primary originals cited here were inspected where their quantitative claims are used. The investigation ends at the stated cutoff because the available primary evidence either repeats the same limitations or changes model, budget, or both.

## Executive decision

**Do not adopt a run-design change as a general improvement on public benchmark pass rate alone.** There is direct evidence that an LM-oriented agent–computer interface can matter, and direct but small-sample evidence that a particular context-file intervention did not improve correctness. There is no inspected primary study that cleanly identifies the causal effect of test-output feedback, repair-loop count, retries, or decomposition **while holding both model and total effort constant**.

Adopt only after a paired, repeated, frozen-model holdout experiment shows a practically worthwhile validated-success gain without an unacceptable tail-latency, cost, or false-pass increase. Treat retries and replay as **budget-allocation policies**, and decomposition with another submodel as an **architecture-plus-model change**, not fixed-effort run-design evidence.

## What primary evaluations establish

### 1. Context selection and delivery

[Khatri, *Do Context Files Help Coding Agents?* (2026)](https://arxiv.org/html/2607.27250v1) is the closest direct test. It evaluated 17 PR-derived Python tasks from three repositories with hidden PR gold tests, using Claude Code Sonnet 4.6 and Codex CLI GPT-5.5. Each agent ran no context, context every turn, and selective retrieval, with three repeats per task (288 valid evaluations). Within each agent, policy was fixed, but selective retrieval also changed the context corpus for two repositories.

* **Correctness:** no statistically significant overall difference. The reported Claude pairwise gaps were at most 2.3 percentage points (pp), Codex’s maximum was 5.9 pp, with omnibus p=1.00 and p=0.66 respectively. In the dynamic-range subset, no-context resolved 58% versus 42% for both always-on and selective context. The authors’ descriptive bounds were below 10 pp for Claude and 15 pp for Codex, not powered equivalence bounds.
* **Efficiency mechanism, not correctness:** for Claude on opshin, blind full-suite pytest invocations fell 3.67 → 2.44 → 1.67 and wall time 2689 s → 2066 s → 2032 s (none → always → selective). The n=4 sign test was p=0.25. This follows a repository-specific warning that the full suite takes more than 20 minutes.

**Decision implication:** do not add static context indiscriminately. Test the exact content, delivery channel, and retrieval corpus in the target repositories. A context change may save expensive unnecessary validation without improving success, but that result is exploratory and repository-specific.

### 2. Tool feedback, search, and edit interface

[Yang et al., *SWE-agent* (2024)](https://arxiv.org/html/2405.15793v3) compared an LM-oriented agent–computer interface (ACI) with a shell-only agent, both using GPT-4 Turbo, on the 300-task SWE-bench Lite Python issue-repair split. The ACI combines structured viewing/search/editing, concise command feedback, guardrails, history management, and a demonstration. It is therefore a **bundle comparison**, not an isolated test-feedback study.

* The ACI resolved **18.0% (54/300)** at **$1.67 average cost per instance**, versus shell-only **11.0%** at **$1.46**: **+7.0 pp**, roughly **64% relative**, at **+$0.21 average cost per instance**.
* On full SWE-bench, the same ACI reported **12.47% (286/2294)** at $1.59. That is a different task set and must not be combined with the Lite contrast.
* Within the ACI’s own Lite ablations, edit action with linting was 18.0% versus 15.0% without linting, summarized search 18.0% versus 12.0% iterative search, and last-five-observation context 18.0% versus 15.0% full history. These are configuration-specific ablations, not independent proof that a production agent will receive the same gain.

**Decision implication:** structured, concise tool observations and reliable edit confirmation are credible candidates for local A/B testing. Split the bundle into separately named deltas (for example, edit confirmation versus test-result formatting), otherwise a win is not attributable and cannot guide further design.

### 3. Decomposition and context-window management

[*SWE-Edit* (2026)](https://arxiv.org/html/2604.26102) compares a string-replace editor with viewer/editor subagents on 500 SWE-bench Verified tasks, averaged across three runs. Its main agent is GPT-5 and its subagents are GPT-5-mini, so the intervention changes model calls as well as workflow and is not a fixed-model or fixed-effort contrast.

The full design reports **+2.1 pp resolve**, **+3.5 pp edit success**, and **−17.9% total inference cost**. A viewer-only configuration reports **+0.4 pp** and **−7.7% cost**, $243.7 → $225.0, while returning 39.7% of requested content and reducing main-agent noncached input from 276.7K to 237.1K tokens. Its generalization evidence is only 100 instances and two runs per model.

**Decision implication:** classify this as a promising efficiency architecture, not evidence that role decomposition itself improves a fixed production agent. A local test must keep the model policy equivalent or explicitly approve the model/architecture confound.

### 4. Validation, repair, retries, and replay

[*ORACLE-SWE* (2026)](https://arxiv.org/html/2604.07789) injects oracle information such as reproduction/regression tests, locations, stack context, and APIs into a minimal SWE-agent on filtered SWE-bench sets. It uses a 120-step cap and three runs per condition. Its validation stage uses a stronger extractor and weaker resolver with 50/70 steps. More signals can reduce steps but lengthen input logs and token cost; its same-weak-model two-stage validation result on SWE-bench Live improved by at most **4 pp**. Because the signals are oracle-derived, this is an **upper bound on useful information**, not a deployable measured effect of running ordinary tests or interpreting their output.

[*Fail-Fast, Restart-Smart* (2026)](https://arxiv.org/html/2608.03222v1) evaluates restarts on 500 SWE-bench Verified tasks with 11 trajectories per instance and a 350/50/100 train/validation/test split. A separately trained 0.6B monitor triggers aborts. At 5% false-positive abort rate, early stopping saved **14.6–20.4% execution tokens** across policies. At 25% FPR, Qwen3.6-27B rose **66.6% → 71.8%** (+5.2 pp), whereas a cold restart was **66.8%** (+0.2 pp), but the maximum-resolution configuration used **43.8% more net compute**. The policy model is held within the comparison, but total effort changes and the monitor is another model.

[*SWE-Replay* (2026)](https://arxiv.org/html/2601.22129v2) compares trajectory replay/branching with naive test-time scaling across SWE-bench Verified, Pro, and Multilingual and several backends/scaffolds. It reports, on Verified, up to **17.4% lower cost** with up to **3.8% higher resolve**. One ablation reports random branch **56.0%, $1.53**, LLM judge **54.0%, $3.31 including judge**, and replay **60.0%, $1.52**. These are multi-sample scaling results, not a one-run fixed-budget result.

**Decision implication:** do not label a retry, abort, judge, or replay policy “better” without stating the total token/time budget and auxiliary-model cost. For a fixed end-to-end budget, compare allocation, not just best-of-N success. Do not claim a validation-loop gain from oracle studies.

## Reliability limits and counterevidence

### Evaluator validity

[SWE-Bench+ (2024)](https://arxiv.org/html/2410.06992v2) manually reviewed 251 SWE-Agent + GPT-4 patches that passed associated SWE-bench Full tests. Three authors compared generated/gold patches, issue reports, tests, and trajectories, then resolved disagreements jointly. In that successful-patch sample, 32.67% had an answer stated directly in the issue/comments, 31.08% were incorrect, incomplete, or changed unrelated code despite passing, and 63.75% were classified suspicious. Its reclassification changed the reported SWE-Agent + GPT-4 rate from **12.47% to 3.97%**. On its Verified review, it reports 12.50% incorrect and 9.82% incomplete successful patches and a **22.4% → 10.0%** rate change. These are audit results for a specific agent/model/sample, not universal false-pass rates, but they rule out harness pass as the sole adoption criterion.

[SWE-ABS (2026)](https://arxiv.org/html/2603.00520) strengthened evaluation for 11,041 patches that originally passed from the top 30 SWE-bench Verified agents. The strengthened tests rejected **2,184 (19.78%)**; the leading score fell **78.80% → 62.20%**, with an average **14.56-pp** resolve-rate drop and leaderboard rank correlation ρ=0.82. This constrains benchmark-only comparisons but is not a causal test of any run design.

### Leakage, freshness, variance, and scaffold dependence

SWE-Bench+ says more than 94% of original SWE-bench issues and PRs predate the tested models’ stated cutoffs. Its 548-task successor used issues after October 2023 and manually excluded answer leakage, yet it reports that on average 67.72% of initially resolved successor instances did not truly resolve the issue after manual validation. Dataset/evaluation changes mean its new-set rates cannot be interpreted as A/B effects of agent design.

[DeepSWE (2026)](https://arxiv.org/html/2607.07946) explicitly identifies public GitHub issue, discussion, and fix exposure as a pretraining-recall risk and supplies 113 original long-horizon tasks. Fresh/original tasks reduce this risk but do not prove absence of contamination or production transfer.

[SWE-rebench (NeurIPS 2025)](https://papers.nips.cc/paper_files/paper/2025/file/21bec6ace947b1b58967b945c8ac0f10-Paper-Datasets_and_Benchmarks_Track.pdf) supplies a useful protocol precedent: 294 executable tasks from 169 repositories, a fixed minimal ReAct scaffold, identical prompts and developer-recommended parameters, and five seeded runs per model with SEM and pass@5. Its reported DeepSeek-V3 full run took about seven hours. The study restricts task scope and its task-quality predictor is imperfect, so it is a protocol reference rather than proof of general reliability. (The directly fetched PDF did not expose its full text in this environment; detailed figures above are cross-checked against the supplied local research note and should be rechecked in the PDF before being used as an external numeric basis.)

[Same Signal, Different Semantics (2026)](https://arxiv.org/html/2605.18332) is observational, not randomized: 64,380 public SWE-bench Verified trajectories from 126 model–framework configurations and 43 frameworks, with sparse submission coverage and 100% oracle test visibility. Still, it is strong counterevidence to generic trace rules. With three tracer LLMs held across 6–8 frameworks, framework variation exceeded LLM variation in **44/63 (69.8%)** feature comparisons. For mean turns, framework identity explained **64%** of between-configuration variance versus **10%** for LLM family. Error-rate association split **47** configurations where lower error correlated with resolution versus **48** where higher error did. A trace metric therefore needs target-framework calibration and causal outcome validation.

## Operational decision table

| Candidate change | Evidence-supported posture | Fixed controls and primary metric | Conditional decision |
|---|---|---|---|
| Context delivery/retrieval | Test locally. One small repeated study found no overall correctness gain, with possible suite-time savings. | Same task commit, model, effort, tools, context cap, seed, total token/step/time cap, hidden evaluator. Primary: paired validated pass. | Adopt gradually only if holdout gain is practical and no stratum is harmed. Retain if correctness is flat but suite time falls within a declared reliability budget. |
| Tool feedback/edit format | Highest-priority candidate, but test one component at a time. ACI bundle improved 18.0% vs 11.0%. | Freeze commands/permissions and test command. Measure invalid edits, recovery, tool observations, and validated pass. | If a bundle wins, decompose before broad rollout. Reject an un-attributable bundle when operating cost or failure mode is unacceptable. |
| Validation/repair | Treat oracle evidence as opportunity mapping, not a proven intervention. | Freeze initial trajectory and evaluator; compare a bounded repair allocation after the same initial failure. Measure recovery conditional on initial failure and false accepts. | Adopt only when independently validated recovery gain exceeds repair cost and evaluator disagreement stays below a predeclared ceiling. |
| Retry/restart/replay | A budget-allocation option, not fixed-effort improvement. | Same model, total end-to-end token/time budget, seeds, final evaluator. Report pass@1 and fixed-budget pass@k separately. | Use only for requests that can accept higher tail latency. Reject if abort kills too many would-pass runs or benefit requires excess budget. |
| Decomposition | Architecture-plus-model change when subagents differ. | Keep policy model equivalent, tools and total budget fixed; record role token/cost split and context manifests. | Escalate for separate approval if a different submodel, privileged retrieval, or extra reasoning is introduced. |

## Concrete paired local evaluation artifact

```yaml
experiment_id: fixed-model-run-design-v1
purpose: one named run-design delta, not a composite redesign
unit: task_id × seed
population:
  development: internal held-out issues used only to tune the delta
  frozen_holdout: decision set, untouched during tuning
  fresh_canary: post-model-boundary or access-controlled tasks, untouched during tuning
  strata: [repository, language, task_type, changed_file_band, baseline_difficulty_band]
arms:
  A: {name: production_baseline, run_design_sha256: "<A>"}
  B: {name: one_named_delta, run_design_sha256: "<B>"}
fixed:
  model_id: "<exact provider/version>"
  reasoning_effort: "<fixed configured and observed setting>"
  prompt_sha256: "<identical except treatment instructions>"
  tool_manifest_sha256: "<identical commands, permissions, environment>"
  evaluator_image_digest: "<identical frozen image and dependency lock>"
  task_commit: "<pinned per task>"
  max_steps: 120
  total_token_budget: 200000
  wall_time_limit_s: 1800
seeds: [101, 202, 303, 404, 505]
evaluator:
  primary: hidden_regression_plus_new_adversarial_tests
  audit: blinded independent review of a predeclared sample of harness passes
record_per_run:
  - task_id, repository, stratum, seed, arm
  - harness_pass, adversarial_pass, independent_label # correct/incorrect/unclear
  - input_output_cached_tokens, wall_time_s, model_calls, tool_calls_by_type
  - test_commands_and_results, edit_failures, retries, repair_cycles, termination_reason
  - selected_context_manifest, patch_digest, budget_violations
analysis:
  primary_estimand: mean(B.harness_pass - A.harness_pass) paired by task×seed
  uncertainty: stratified paired bootstrap by task, retaining all seeds
  report: [pass_at_1, fixed_budget_pass_at_k, task-level deltas, seed_variance,
           median_p95_time, cost_per_validated_success, false_pass_unclear_rate]
adoption_rule:
  adopt_gradually_if: "frozen-holdout paired interval and practical threshold support B; blinded error/unclear rate and p95 time remain within predeclared limits"
  block_if: "raw-harness gain coincides with higher blinded invalid/incomplete rate, a changed frozen factor, or a material budget violation"
  continue_measurement_if: "paired uncertainty overlaps the practical no-effect bound or seed variance dominates"
```

This artifact produces the missing evidence directly: it separates ordinary one-run reliability from retry availability, preserves task-level pairing, detects evaluator weakness, and makes model/effort changes visible rather than attributing them to run design.

## Material limitations

1. Direct causal evidence is sparse, mostly Python/GitHub issue repair, and often uses SWE-bench-style Docker/test harnesses. It does not establish production transfer.
2. The largest apparent gains often bundle several interface changes, add an auxiliary model, use oracle information, or change test-time compute. They cannot answer the strict fixed-model-and-effort question alone.
3. Public tasks can be leaked or evaluator-incomplete. Freshness reduces one threat, not all of them.
4. No retained study measures security outcomes. No security conclusion follows.

## Retained-source appendix

| Source | Type/date and evidence form | Supports | Important limitation |
|---|---|---|---|
| [Yang et al., SWE-agent](https://arxiv.org/html/2405.15793v3) | Primary paper, 2024. Controlled ACI/baseline and component ablations on SWE-bench. | Same-model ACI bundle contrast and cost. | Bundle changes interface, feedback, search, edit, history, demonstrations, guardrails. |
| [Khatri, Context Files](https://arxiv.org/html/2607.27250v1) | Primary preprint, 2026. Repeated two-agent context ablation with hidden PR tests. | Bounded correctness null and exploratory suite-efficiency result. | 15–17 Python tasks, changed selective corpus, low power. |
| [SWE-Edit](https://arxiv.org/html/2604.26102) | Primary preprint, 2026. Viewer/editor decomposition evaluation. | Reported resolve, edit-success, context and cost contrasts. | GPT-5-mini subagents and role/context bundle break fixed-model attribution. |
| [Fail-Fast, Restart-Smart](https://arxiv.org/html/2608.03222v1) | Primary preprint, 2026. Restart/abort evaluation. | Token-saving and compute–resolution trade-off. | Extra 0.6B monitor and changed compute budget. |
| [SWE-Replay](https://arxiv.org/html/2601.22129v2) | Primary preprint, 2026. Replay versus test-time scaling. | Replay cost/resolve contrasts. | Multi-trajectory scaling, not one fixed run. |
| [ORACLE-SWE](https://arxiv.org/html/2604.07789) | Primary preprint, 2026. Oracle-signal and validation experiments. | Upper bound on information value and limited two-stage validation result. | Oracle information and altered model/stage configurations are not deployable causal feedback evidence. |
| [SWE-ABS](https://arxiv.org/html/2603.00520) | Primary preprint, 2026. Strengthened-test re-evaluation. | Benchmark false-pass constraint. | Not an intervention experiment. |
| [DeepSWE](https://arxiv.org/html/2607.07946) | Primary preprint, 2026. Original long-horizon benchmark. | Public-task pretraining exposure limitation. | Fresh/original tasks do not prove decontamination or production transfer. |
| [SWE-Bench+](https://arxiv.org/html/2410.06992v2) | Primary paper, 2024. Manual patch audit and newer benchmark construction. | Test-pass validity and leakage constraints. | One agent/model successful-patch audit, not a universal false-pass rate. |
| [SWE-rebench](https://papers.nips.cc/paper_files/paper/2025/file/21bec6ace947b1b58967b945c8ac0f10-Paper-Datasets_and_Benchmarks_Track.pdf) | NeurIPS 2025 benchmark/protocol paper. | Five-seed, fixed-scaffold evaluation precedent. | PDF extraction was unavailable here and benchmark/task filters limit transfer. |
| [Same Signal, Different Semantics](https://arxiv.org/html/2605.18332) | Primary preprint, 2026. Observational cross-framework trajectory analysis. | Framework-dependent meaning of trace metrics. | Sparse public configuration matrix, parser dependence, oracle test visibility, no randomized intervention. |

**Local evidence consulted:** [R1 stream note](streams/s1.md) and [R2/R3 stream note](streams/s2.md). They supplied the scoped research record and were reconciled against the linked originals above; they are not independent external corroboration.
