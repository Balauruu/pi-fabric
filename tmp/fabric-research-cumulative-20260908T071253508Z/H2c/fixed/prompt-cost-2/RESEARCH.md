# Tree of Thoughts adoption decision: original quality and cost evidence

**Decision:** Do **not** replace direct input-output (IO) or chain-of-thought (CoT) prompting with Tree of Thoughts (ToT) as a production default. Make ToT an evaluated opt-in workflow only where local evidence shows CoT fails, intermediate states can be meaningfully searched, and a selection or verification signal exists. The original study establishes this conditional result for its tested configurations, not a general or current-production advantage.

**Scope and research date:** This report uses only the frozen original-paper materials supplied for this task, reviewed 2026-09-08. “Direct” means the paper's IO prompt. All reported measurements are from GPT-4 Chat Completion at temperature 0.7, with experiments May 5–16, 2023, unless stated otherwise. No outside studies, current pricing, or external audits were used.

## What the original measurements establish

### Game of 24: quality improved on a hard, verifiable search task

The test set was 100 relatively hard 4nums.com games, indices 901–1,000. Success required a valid equation equaling 24 that used every input number exactly once. The paper used three intermediate-equation thought steps. ToT used BFS, retained breadth \(b=5\), and evaluated candidates as sure/maybe/impossible with three sampled values per thought. [Original methods and results](https://arxiv.org/html/2305.10601v2#S4.SS1)

| Condition | Success | Comparator qualification |
|---|---:|---|
| IO, 5-shot, 100 samples/game averaged | 7.3% | Direct baseline |
| CoT, three intermediate equations, 100 samples/game averaged | 4.0% | Single-chain baseline, lower than IO here |
| CoT self-consistency, majority output from 100 samples | 9.0% | Deployable majority heuristic, not oracle selection |
| ToT BFS, \(b=1\) | 45% | Search/evaluation with one retained state |
| ToT BFS, \(b=5\) | 74% | Main ToT configuration |
| IO best of 100 | 33% | Retrospective oracle framing, not a described deployable selector |
| CoT best of 100 | 49% | Same oracle framing |

The most decision-relevant resource comparison is Table 7: **ToT 74% versus CoT best-of-100 49%**. It is not strictly resource-matched: ToT reported 5.5k generated and 1.4k prompt tokens per case versus CoT's 6.7k and 2.2k, but $0.74 versus $0.47 per case. The source calls the 5.5k figure completion tokens, while the table header is `Generate/Prompt tokens`; it does not define the slash convention further. Lower reported generated tokens therefore did not mean lower reported dollar cost. [Original cost discussion and Table 7](https://arxiv.org/html/2305.10601v2#A2.SS3)

The abstract's 4% versus 74% contrast is single-chain CoT versus ToT, not the 100-sample CoT comparison. Iterative refinement used ground-truth equation-correctness feedback and is not like-for-like with no-external-feedback prompting. Its Game of 24 result cell is unavailable in the authorized extract.

The paper reports roughly 60% of CoT samples failed after their first step. This supports search where an early plausible move makes the remainder unsolvable. It does not establish benefit where this failure mode is absent. [Original Game of 24 analysis](https://arxiv.org/html/2305.10601v2#S4.SS1)

### Creative Writing: a smaller, evaluator-dependent gain at about five times cost

The task supplied four random sentences and required a coherent four-paragraph passage ending each paragraph with one supplied sentence. There was no reference passage. Across 100 inputs, the paper reported: [Original methods and results](https://arxiv.org/html/2305.10601v2#S4.SS2)

| Condition | Outcome |
|---|---:|
| IO, zero-shot | GPT-4 coherence score 6.19/10 |
| CoT, zero-shot plan then write | 6.93/10 |
| ToT | 7.56/10 |
| Iterative refine from IO | 7.67/10 |
| Iterative refine from ToT | 7.91/10 |
| Blind human ToT vs. CoT | ToT preferred 41/100, CoT 21/100, ties 38/100 |

ToT was depth 2 and breadth \(b=1\): generate five plans, choose one using five votes, generate five passages from that plan, then choose one using five votes. This is staged sample-and-vote selection, not retained multi-branch BFS. IO and CoT each generated 10 samples per task, but the authorized source does not state how those samples were selected or aggregated for reported baseline scores. The automatic score was five GPT-4 zero-shot scores per output, averaged, with mean within-output standard deviation about 0.56. The human comparison was blinded and randomized, but used a subset of the authors. These are useful measurements, not an independent production-quality measure.

### Original token and monetary accounting

The table preserves the paper's labels and units. Similar token totals do not establish equal cost, latency, or selection opportunity.

| Task and condition | Generate/Prompt tokens per case | Cost per case | Quality field |
|---|---:|---:|---:|
| Game of 24, IO best of 100 | 1.8k / 1.0k | $0.13 | 33% |
| Game of 24, CoT best of 100 | 6.7k / 2.2k | $0.47 | 49% |
| Game of 24, ToT | 5.5k / 1.4k | $0.74 | 74% |
| Creative Writing, IO | 0.9k / 0.4k | $0.06 | Not in cost table |
| Creative Writing, CoT | 0.9k / 0.4k | $0.07 | Not in cost table |
| Creative Writing, ToT | 4.0k / 2.9k | $0.32 | Not in cost table |

On Creative Writing, ToT used about 4.4 times reported generated tokens, 7.25 times prompt tokens, and roughly five times dollar cost relative to IO/CoT. The two main ToT experiment runs cost about **$106**: 100 × $0.74 + 100 × $0.32. Crossword DFS experiments *should* also be within $100, which is not a measured exact total. The paper says ToT could require 5–100 times more generated tokens than CoT depending on prompts and search algorithm. [Original Appendix B.3 and Tables 7–8](https://arxiv.org/html/2305.10601v2#A2.SS3)

The published Table 8 caption says “Cost analysis on Game of 24,” while its header and rows identify Creative Writing. This report retains that discrepancy. [Frozen raw Table 8 extraction (local)](../../../corpus/T1/sources/S2-cost-tables.md)

## Adoption boundary and operating controls

**Recommendation:** retain IO/CoT as the default. Permit ToT only for a task class that meets every condition below. These are proposed production controls, not measured paper results.

1. **Demonstrated need:** Paired local evidence shows CoT materially fails on representative hard cases, especially at an early irreversible decision.
2. **Searchable representation:** The task has meaningful intermediate states, alternatives, and a thought unit small enough to diversify but large enough to evaluate.
3. **Trustworthy selection:** A deterministic validator or blinded domain-quality protocol can judge outcomes. Measure evaluator-selection error. Do not assume model self-evaluation is correct.
4. **Service budget:** Cost, all prompt/generated tokens, requests, retries, discarded branches, and p95 latency meet a pre-set ceiling.
5. **Safe fallback:** Define stop rule, pruning policy, IO/CoT-or-abstain fallback, and retention of alternatives where evaluator error could discard a valid path.

Keep ToT off routine cases, tasks CoT already solves adequately, and knowledge-bound cases where branching cannot supply missing information. This is consistent with the authors' extension: improvement was only slight on GSM8K and StrategyQA when GPT-4+CoT was already strong, and the stated StrategyQA bottleneck was external knowledge. Crossword ablations also found that pruning could eliminate correct states: without pruning, three cases unsolved by pruned ToT were found within the 100-step limit. [Original extensions](https://arxiv.org/html/2305.10601v2#A2.SS1) and [Crossword ablation](https://arxiv.org/html/2305.10601v2#S4.SS3).

## Paired local evaluation artifact

Use this as the test specification and result-row format. Every `case_id` runs in every arm under the same frozen configuration. It separates the source-supported mechanism cohort from exploratory transfer checks.

```yaml
artifact: tot-adoption-paired-evaluation-v1
freeze_for_all_arms:
  model_and_version: REQUIRED
  temperature: REQUIRED
  system_prompt: REQUIRED
  task_context_and_tools: REQUIRED
  timeout_ms: REQUIRED
  final_output_validator: REQUIRED
cohorts:
  mechanism:
    inclusion: "Representative hard cases with verifiable multi-step states and an early-decision/backtracking opportunity"
    primary: true
  exploratory_boundary:
    inclusion: "Routine/easy and knowledge-limited cases"
    primary: false
arms:
  - id: io
    procedure: "Direct IO"
  - id: cot
    procedure: "Single-chain CoT"
  - id: cot_sc_deployable
    procedure: "Predefined sample count and deployable selection rule"
  - id: tot
    procedure: "Record thought_unit, generation_count, evaluator, breadth, depth, pruning, stop_rule, fallback"
analyses:
  - id: budget_matched
    equal_caps: [generated_tokens, prompt_tokens, requests, wall_clock_latency]
    comparison: [cot_sc_deployable, tot]
  - id: service_level_matched
    equal_caps: [dollar_cost, end_to_end_latency]
    include: [retries, votes, repeated_prompts, discarded_branches]
result_row:
  - case_id
  - cohort
  - arm
  - run_id
  - valid_or_quality_score
  - severe_failure
  - abstained_or_fallback
  - evaluator_choice_correct
  - generated_tokens
  - prompt_tokens
  - request_count
  - api_cost
  - latency_ms
  - runtime_config_hash
adoption_rule: >
  On the mechanism cohort, ToT improves the preregistered primary quality metric
  against the chosen paired comparator, meets cost and latency ceilings, and does
  not materially increase severe failures. Report exploratory outcomes separately.
```

This artifact resolves the study's unmeasured production questions: transfer to the target task/model, deployable selection quality, latency, retry/failure burden, and current economics. It is a proposed test, not evidence that ToT passes it.

## Limitations and stopping point

Evidence is limited to a 2023 GPT-4 configuration and three relatively simple tasks selected because they challenged that model. Game of 24 is narrow and fully verifiable. Creative Writing has no ground truth and relies on GPT-4-as-judge plus a small author subset for human comparison. The paper supplies no p50/p95 latency, rate-limit behavior, retry/recovery cost, end-to-end reliability, or current-model pricing. Main-result cells and Creative Writing baseline-sample selection details missing from the authorized extract were not reconstructed.

Research ended because the controlled assignment restricts this report to the two frozen original-source files and supplied substantive note. Those materials answer the historical measured question but cannot settle present production economics or domain transfer.

## Source appendix

| Source | Type and date | Evidence form | Supports | Important limitation |
|---|---|---|---|---|
| [Yu et al., *Tree of Thoughts*](https://arxiv.org/html/2305.10601v2) | Primary paper, NeurIPS 2023. Frozen HTML extract retrieved 2026-09-08. | Methods, results, discussion, Appendix B.1/B.3. | Tested model/task conditions, outcomes, mechanism, transfer limits, and cost prose. | Historical configuration, not a current-production evaluation. Some rendered table cells are absent from the supplied extract. |
| [Raw cost-table supplement (local)](../../../corpus/T1/sources/S2-cost-tables.md) | Frozen primary HTML recovery for arXiv v2. | Raw Tables 7–8 and surrounding Appendix B.3. | Per-case token labels, costs, success fields, $106 calculation, and Table 8 mismatch. | Slash token convention is undefined in primary HTML. |
| [Substantive research note (local)](../../../H2b/fixed/prompt-cost-2-Y/streams/s1.md) | Supplied synthesis of the same authorized sources. | Source-bound extraction and qualifications. | Retained result-table values and explicit gaps. | Secondary local synthesis, not independent corroboration. |
