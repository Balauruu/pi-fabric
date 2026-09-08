# Tree of Thoughts in production: bounded adoption decision

**Decision:** Do **not** replace direct input-output (IO) or chain-of-thought (CoT) prompting wholesale with Tree of Thoughts (ToT). Make ToT an **evaluated, opt-in workflow** only for hard target cases where local CoT failure is demonstrated and where intermediate states can be meaningfully selected or verified. The original study establishes sizeable gains in two narrow GPT-4 experiments, but not a general production quality, cost, latency, or reliability advantage.

**Scope and research date.** This report is restricted to the frozen original-paper extracts specified for this assignment, including the raw recovery of its cost tables. Research date: 2026-09-08. “Direct” below means the paper’s IO prompt.

## What the original evidence establishes

All main experiments used GPT-4 Chat Completion at temperature 0.7, run May 5–16, 2023. Results therefore describe that model, prompts, search configurations, task distributions, and contemporaneous price structure, not a current-model forecast. [Original methods](https://arxiv.org/html/2305.10601v2#S4).

### Game of 24: large gain on a verifiable arithmetic-search task

The study evaluated 100 relatively hard 4nums.com instances (indices 901–1,000). A result was successful only if it equalled 24 and used all four supplied numbers exactly once. [Task setup](https://arxiv.org/html/2305.10601v2#S4.SS1)

| Condition | Success | Comparator condition and interpretation |
|---|---:|---|
| IO, 5-shot, 100 samples per game, average | 7.3% | Direct baseline |
| CoT, three intermediate equations, 100 samples per game, average | 4.0% | Single-chain CoT, lower than IO here |
| CoT self-consistency, majority from 100 CoT samples | 9.0% | Deployable majority rule, not oracle selection |
| ToT BFS, breadth 1 | 45% | Search/evaluation with one retained state |
| ToT BFS, breadth 5 | 74% | Main ToT result |
| IO best-of-100 oracle | 33% | Retrospective best sample, not a described deployable selector |
| CoT best-of-100 oracle | 49% | Retrospective best sample, not a described deployable selector |

The important matched-compute directional contrast is **74% ToT versus 49% CoT best-of-100** in the paper’s cost table, not the abstract’s 4% versus 74% comparison. The latter compares ToT with a single-chain CoT condition. [Original cost table](https://arxiv.org/html/2305.10601v2#A2.SS3)

The ToT condition decomposed the solution into three intermediate equations. At each step it proposed next equations, used GPT-4 to classify candidates as sure, maybe, or impossible, sampled that valuation three times per thought, and retained the best five states with breadth-first search. The paper reports that about 60% of CoT samples failed after the first step. This supports a mechanism claim for early, irreversible arithmetic choices, not a claim about tasks without such a structure. [Game of 24 method and error analysis](https://arxiv.org/html/2305.10601v2#S4.SS1)

**Qualification.** Iterative refinement was given ground-truth equation-correctness feedback and is not a like-for-like no-external-feedback comparison. Its result cell is unavailable in the authorized source text and is not reconstructed here.

### Creative Writing: modest score gain at about five times the cost

The task required a coherent four-paragraph passage from four random sentences, with each paragraph ending in one supplied sentence. It had no reference output. Across 100 inputs, the paper reported the following. [Method and results](https://arxiv.org/html/2305.10601v2#S4.SS2)

| Condition | Outcome |
|---|---:|
| IO, zero-shot | GPT-4 coherence score 6.19 / 10 |
| CoT, zero-shot plan then write | 6.93 / 10 |
| ToT | 7.56 / 10 |
| Iterative refine from IO | 7.67 / 10 |
| Iterative refine from ToT | 7.91 / 10 |
| Blind human ToT versus CoT | ToT preferred 41/100, CoT 21/100, tie 38/100 |

The automatic score averaged five GPT-4 zero-shot ratings per output. The reported mean within-output standard deviation was about 0.56. The human comparison used a blinded, randomized evaluation by a subset of the authors. It is supporting evidence, but neither measurement is an independent production-quality measure.

This ToT variant was staged sample-and-vote rather than multi-branch retained BFS: generate five plans, vote five times to select one, generate five passages from that plan, then vote five times to select one. Its breadth was one. IO and CoT each generated ten samples per task, but the authorized source does not state how those samples were selected or aggregated for the reported score. That missing selection rule blocks a tighter comparison.

## Resource and price evidence

The original Appendix B.3 header is **“Generate/Prompt tokens.”** Its prose calls the first value completion tokens but does not define the slash convention. The figures below retain the published labels rather than infer a different accounting scheme. [Appendix B.3](https://arxiv.org/html/2305.10601v2#A2.SS3)

| Task and condition | Generate / Prompt tokens per case | Cost per case | Linked measured outcome |
|---|---:|---:|---:|
| Game of 24 IO best-of-100 | 1.8k / 1.0k | $0.13 | 33% success |
| Game of 24 CoT best-of-100 | 6.7k / 2.2k | $0.47 | 49% success |
| Game of 24 ToT | 5.5k / 1.4k | $0.74 | 74% success |
| Creative Writing IO | 0.9k / 0.4k | $0.06 | Quality not reported in this table |
| Creative Writing CoT | 0.9k / 0.4k | $0.07 | Quality not reported in this table |
| Creative Writing ToT | 4.0k / 2.9k | $0.32 | Quality not reported in this table |

On Game of 24, ToT used fewer generated tokens than best-of-100 CoT (5.5k versus 6.7k) and had higher recorded success, while costing more per case ($0.74 versus $0.47). On Creative Writing, ToT used about 4.4 times the generated tokens and 7.25 times the prompt tokens of IO/CoT, and about five times the money cost ($0.32 versus $0.06/$0.07). The paper reports about **$106** for the two main ToT experiment runs: 100 × $0.74 plus 100 × $0.32. It says Crossword DFS experiments *should* also be within $100, which is not an observed exact total. It states ToT can require 5–100 times more generated tokens than CoT depending on prompts and search algorithm.

**Source-format caveat.** The HTML caption of Table 8 says “Cost analysis on Game of 24,” while the table header and rows say Creative Writing. The discrepancy is preserved.

## Adoption boundary and operating controls

### Recommendation

Use ToT only when all of the following are true:

1. **Need:** A local baseline shows that CoT fails materially on representative hard cases, especially from an early decision that later steps cannot repair.
2. **Searchability:** The task has meaningful intermediate states, diverse alternatives, and a legitimate selection or verification signal.
3. **Value:** The incremental quality is worth the measured production cost, latency, and implementation complexity.
4. **Evaluator safety:** Evaluator error is controlled by retaining alternatives, a deterministic validator where available, or a defined fallback.

Keep IO/CoT as the default for routine cases, cases already adequate under CoT, and knowledge-bound cases where branching cannot supply the missing information. This last boundary is consistent with the paper’s small zero-shot gains on GSM8K and StrategyQA, where GPT-4+CoT was already strong and StrategyQA’s bottleneck was external knowledge. [Appendix B.1](https://arxiv.org/html/2305.10601v2#A2.SS1)

### Operational guidance

These are proposed production controls, not results measured by the paper.

- Specify the thought unit, candidate count, evaluator, breadth/depth, pruning rule, stop rule, output validator, and fallback in the workflow configuration.
- Charge every branch, vote, repeated prompt, retry, and discarded candidate to the request. Do not estimate ToT cost only from its final answer.
- Record evaluator-selection errors and cases pruned before a valid solution. The paper’s Crossword ablation found that removing pruning discovered correct solutions in cases the pruned search did not solve within 100 steps, demonstrating that self-evaluation can remove viable paths.
- Enforce per-request dollar and latency ceilings, with fallback to the standard path when a ceiling is reached.
- Use an independent deterministic validator when the task permits it. Otherwise use blinded domain judgment and separately report uncertainty.

## Paired local evaluation artifact

This is the concrete decision test needed before enabling ToT. It is a proposed local artifact, not evidence from the paper.

```yaml
artifact: tot-adoption-paired-evaluation-v1
freeze:
  model_and_version: required
  temperature: required
  system_prompt: required
  task_context_and_tools: required
  timeout: required
  output_validator: required
cohorts:
  mechanism:
    definition: representative hard cases with verifiable multi-step states and early-decision sensitivity
    decision_use: primary adoption cohort
  boundary:
    definition: routine/easy cases plus knowledge-limited cases
    decision_use: report separately to detect transfer failure and unnecessary spend
arms_per_case:
  - io_direct
  - cot
  - cot_multisample_with_deployable_selector
  - tot
resource_analyses:
  budget_matched:
    equal_caps: [generated_tokens, prompt_tokens, requests, wall_clock_latency]
    compare: [cot_multisample_with_deployable_selector, tot]
  service_level_matched:
    equal_caps: [dollars, production_latency]
    include: [repeated_prompts, votes, retries, discarded_branches]
tot_configuration_fields:
  [thought_unit, candidate_count, evaluator, breadth, depth, pruning_policy, stop_rule, fallback]
record_per_case:
  [case_id, cohort, arm, success_or_blinded_quality, severity, abstention_or_fallback,
   evaluator_selection_error, generated_tokens, prompt_tokens, api_cost, request_count,
   p50_latency, p95_latency, run_seed_or_repeat]
adoption_rule: >
  Enable ToT only if it improves the pre-specified primary quality metric on the mechanism
  cohort, stays within the chosen cost and latency ceilings, and does not materially increase
  severe failures. Report the boundary cohort separately; it is not a paper-established gate.
```

Run every arm on every case. Analyze both budget-matched and service-level-matched comparisons rather than combining mismatched resource conditions. Measure task success with an independent deterministic validator where possible, otherwise use blinded domain judgment. Also measure severity, abstention/fallback, evaluator-selection error, total tokens, API cost, request count, p50/p95 latency, and repeated-run variance. The pre-specified rule above, rather than a retrospective best-of-samples oracle, is the adoption decision.

## Limitations and why the investigation ends here

- The main evidence is from a 2023 GPT-4 Chat Completion configuration, not current production models or prices.
- Game of 24 is narrow but fully verifiable. Creative Writing has no ground truth and is primarily GPT-4-as-judge evidence with a small author-subset human comparison.
- The paper gives no p50/p95 latency, rate-limit behavior, retry/recovery cost, or end-to-end reliability result.
- The authorized text omits the main Game of 24 table cells and the Creative Writing figure details needed to recover the Game-of-24 iterative-refinement result and the Creative-Writing baseline sample-selection rule. No reconstruction was attempted.
- The controlled evidence boundary permits only the two frozen primary-source files. Research ends at that boundary rather than importing later studies, model information, or historical reports.

## Source appendix

1. **Yu et al., “Tree of Thoughts: Deliberate Problem Solving with Large Language Models,” arXiv HTML v2 / NeurIPS 2023.** Primary study, experiments run May 5–16, 2023. [Original source](https://arxiv.org/html/2305.10601v2) and [local frozen extract](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-tree-of-thoughts.md). Supports task methods, result values, GPT-4/temperature conditions, search configuration, evaluator-ablation risk, and stated transfer limitations. Important limitation: the frozen text extraction omits some displayed table/figure cells.
2. **Yu et al., Appendix B.3 Tables 7–8, raw primary HTML recovery.** [Original Appendix](https://arxiv.org/html/2305.10601v2#A2.SS3) and [local frozen cost-table supplement](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-cost-tables.md). Primary raw-table extraction. Supports per-case Generate/Prompt token labels, costs, Game-of-24 success cells, and the approximately $106 experiment total. Important limitation: the source does not define the slash notation and Table 8’s published caption conflicts with its Creative Writing header and rows.
