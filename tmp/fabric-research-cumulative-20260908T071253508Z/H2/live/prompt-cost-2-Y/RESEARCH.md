# Tree of Thoughts for a Production Reasoning Workflow

**Decision:** Do **not** replace direct prompting or chain-of-thought (CoT) with Tree of Thoughts (ToT) as the production default. The original study supports a bounded escalation path only: evaluate ToT for request classes where the current direct/CoT path demonstrably misses a quality target, intermediate states can be usefully branched and credibly ranked or verified, and the incremental value clears explicit cost and latency caps.

**Scope and research date.** This report considers only the original Tree of Thoughts paper, arXiv v2 (HTML says v2, 3 December 2023), its appendix, and its linked original formats. The principal experiments used Chat Completion GPT-4 at temperature 0.7 between 5 and 16 May 2023. Research was checked on 2026-09-08 and ended here because the assigned scope excludes later replications and comparisons. [Original paper, §4](https://arxiv.org/html/2305.10601v2#S4)

## What the evidence supports

ToT is not one extra prompt. In this paper it is a task-specific system that defines thought units, generates candidates, evaluates states, and searches them. The implementation choices matter: a thought can be an arithmetic equation, a writing plan, or another task-specific unit, and the evaluator can value states or vote among them. [Method, §3](https://arxiv.org/html/2305.10601v2#S3)

The measured result is therefore: bespoke search improved performance on two deliberately difficult, 100-case GPT-4-era tasks. It is not: generic tree search is superior to direct prompting or CoT in a contemporary production workflow, at equal cost, latency, model, or implementation effort.

## Source-bound results and cost

### Game of 24: a large gain on a hard, verifiable search task

The test set was the relatively hard 901–1,000 slice of 1,362 4nums games. Success required a valid equation that reached 24 and used every supplied number exactly once. The score is success rate over 100 games. [Task and methods, §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1)

| Arm | Exact condition | Success | Generate / prompt tokens per case | Cost per case |
|---|---|---:|---:|---:|
| IO | 5 in-context examples, 100 samples for average performance | 7.3% | — | — |
| CoT | IO examples plus three intermediate equations, 100 samples | 4.0% | — | — |
| CoT self-consistency | majority of 100 CoT samples | 9.0% | — | — |
| IO iterative refine | up to 10 iterations with equation-correctness feedback | 27% | — | — |
| IO oracle best-of-100 | successful sample selected after the fact | 33% | 1.8k / 1.0k | $0.13 |
| CoT oracle best-of-100 | successful sample selected after the fact | 49% | 6.7k / 2.2k | $0.47 |
| ToT-BFS | breadth 1 | 45% | — | — |
| ToT-BFS | breadth 5 | **74%** | 5.5k / 1.4k | $0.74 |

Sources: [results and method, §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1); [token/cost accounting, Appendix Table 7](https://arxiv.org/html/2305.10601v2#A2.T7).

The 74% ToT result came from three equation steps, a one-example propose prompt, BFS retaining five candidates at each step, and three `sure/maybe/impossible` value samples per candidate. Against the paper's best-of-100 CoT oracle, ToT is +25 percentage points (74% vs 49%) but costs 1.57 times more per case ($0.74 vs $0.47). Although ToT reports fewer generated and prompt tokens than that CoT arm, its dollar cost is higher. The paper labels the counts only as “Generate/Prompt tokens,” gives no tariff or per-call breakdown, so the cause cannot be inferred.

Neither oracle best-of-100 arm is directly deployable without a selector as reliable as the after-the-fact success check. Likewise, iterative refinement used ground-truth equation-correctness feedback. Those are useful task-specific comparators, not evidence that such selection or feedback exists in another workflow.

### Creative Writing: a moderate judged gain with a large cost premium

Each of 100 inputs contained four random sentences; the required output was a coherent four-paragraph passage ending paragraphs with those sentences. There was no reference output. GPT-4 produced five zero-shot 1–10 coherence scores per output, averaged by the authors. The reported mean within-output standard deviation was about 0.56. A blinded comparison by a subset of authors compared ToT and CoT outputs. [Task, methods, and results, §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2)

| Arm | Exact condition | GPT-4 coherence score | Human comparison, ToT vs CoT | Generate / prompt tokens per case | Cost per case |
|---|---|---:|---|---:|---:|
| IO | zero-shot, 10 samples per task | 6.19 | — | 0.9k / 0.4k | $0.06 |
| CoT | zero-shot brief plan then passage, 10 samples | 6.93 | CoT preferred 21/100 | 0.9k / 0.4k | $0.07 |
| ToT | depth 2: 5 plans then 5 passages, five votes at each stage, breadth 1 | **7.56** | ToT preferred 41/100, similar 38/100 | 4.0k / 2.9k | $0.32 |
| IO iterative refine | up to 5 refinements | 7.67 | — | — | — |
| ToT iterative refine | up to 5 refinements | 7.91 | — | — | — |

Sources: [methods/results, §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2); [cost accounting, Appendix Table 8](https://arxiv.org/html/2305.10601v2#A2.T8).

Standalone ToT gains 1.37 points over IO and 0.63 over CoT, at 5.3 times IO cost and 4.6 times CoT cost. The human comparison favors ToT more often than CoT (41 vs 21), but 38 of 100 were judged similar. Crucially, IO plus refinement scored 7.67, above standalone ToT's 7.56; ToT plus refinement added only 0.24. The result is a quality-cost choice among deliberate-generation strategies, not evidence that standalone ToT dominates refinement.

The paper does not fully specify how the ten-sample IO/CoT baselines were selected or how that selection maps to the Table 8 accounting. Its HTML labels Table 8 “Creative Writing,” while the caption says “Cost analysis on Game of 24”; the table heading and surrounding prose identify it as Creative Writing. Preserve this source-format inconsistency rather than treating the accounting as more precise than it is.

### Experiment spend and resource claim

For the two 100-case main ToT experiments, the appendix calculates $106: 100 × $0.74 for Game of 24 plus 100 × $0.32 for Creative Writing. It says the crossword DFS experiments “should be also within $100,” and states that ToT can consume 5–100× more generated tokens than CoT depending on prompts and search algorithm. This is a historical experiment estimate, not a current production forecast. [Appendix B.3](https://arxiv.org/html/2305.10601v2#A2.SS3)

## Applicability, counterevidence, and operational boundary

The paper itself says ToT may be unnecessary where GPT-4 already performs well, and characterizes the work as three relatively simple tasks constructed to challenge GPT-4. Its additional zero-shot tests showed small changes where CoT was already strong: GSM8K 86 to 90 and StrategyQA 82 to 83; it attributes StrategyQA's bottleneck to external knowledge. [Discussion](https://arxiv.org/html/2305.10601v2#S6); [Appendix B.1](https://arxiv.org/html/2305.10601v2#A2.SS1)

Model transfer is also not established. On Game of 24, GPT-3.5 scores were IO 6%, CoT 3%, ToT 19%, and the ToT proposal prompt changed from one-shot to three-shot. A mixed-model ablation was 64% with GPT-4 generation plus GPT-3.5 evaluation and 31% with GPT-3.5 generation plus GPT-4 evaluation. This indicates that generation capability and prompt design were material in this setup, not that a cheaper model plus generic ToT will recover GPT-4's result. [Appendix B.2, Tables 5–6](https://arxiv.org/html/2305.10601v2#A2.SS2)

**Use ToT only when all conditions hold:**

1. Representative local cases show direct/CoT missing a predeclared quality target.
2. The task has coherent intermediate states, useful branching, and a credible intermediate-state or final-output verifier/ranker.
3. Incremental business value exceeds the measured added API cost, calls, latency, and failure handling cost.
4. The service can enforce a hard search budget and fall back to direct/CoT when the budget, search, or verifier fails.

Avoid it as the default for already-high-performing, low-latency, open-ended, or poorly verifiable requests. This is a proposed production control, not a measured result of the paper.

## Concrete local paired-evaluation artifact

Create one immutable run directory, for example `tot-paired-eval/<run-id>/`, with these artifacts. Freeze the holdout before prompt or parameter tuning; partition it into routine and hard/search-like strata.

```text
eval_manifest.json       # model/version, system context, retrieval/tools, schema,
                         # temperature, max-output tokens, timeout, scorer, caps, seed/date
cases.jsonl              # case_id, stratum, frozen input, deterministic or independent-human rubric
runs.jsonl               # one row per case_id × arm × replicate, schema below
summary.md               # paired estimates and CIs by stratum, budget view, promotion decision
```

```json
{
  "case_id": "...", "stratum": "routine|hard_search_like", "arm": "io|cot|cot_sc|refine|tot",
  "replicate": 1, "model": "pinned-model-id", "quality_score": 0,
  "verifier_outcome": "pass|fail|not_applicable", "selection_rule": "...",
  "thought_representation": "...", "depth": 0, "candidates_per_node": 0,
  "beam_width": 0, "evaluator_or_voter": "...", "votes_per_decision": 0,
  "pruning_or_early_stop": "...", "input_tokens": 0, "prompt_tokens": 0,
  "completion_tokens": 0, "cached_tokens": 0, "total_tokens": 0,
  "api_cost_usd": 0, "call_count": 0, "branch_count": 0,
  "latency_ms": 0, "search_stop": "budget|success|exhausted|error",
  "parse_or_tool_failure": false, "fallback_used": false
}
```

Run the same pinned current model, system context, retrieval/tools, output schema, temperature, maximum output tokens, timeout, and **same available final verifier** in five arms: IO, single-path CoT, CoT self-consistency at a predeclared budget, refinement where that verifier exists, and ToT. Predeclare ToT's thought representation, candidate count, evaluator/vote count, pruning rule, depth, and hard call/token/dollar caps. Do not treat best-of-k as deployable unless every arm has the same operational selection rule.

Report two non-interchangeable views: (a) quality at equal dollar and equal token budgets, and (b) cost and p50/p95 latency to reach a common quality target. For each stratum, calculate paired quality differences and confidence intervals, plus incremental cost, latency, error/fallback rate, and branch/call counts. Promote ToT only where the paired quality interval excludes the predeclared practical minimum gain and p95 latency plus incremental cost remain within caps. Ablate beam/candidate count, votes, depth, evaluator model, and early stopping before rollout to determine whether a cheaper shallow configuration, or the evaluator rather than tree search, causes the gain.

## Material gaps

- No principal-rate confidence intervals, seeds, or repeated-run variance for the 100-case focal results.
- No per-call traces, latency distribution, rate-limit behavior, parsing reliability, error recovery, or operational availability data.
- No fully specified historical tariff or per-call cost decomposition, so paper dollars cannot be translated to current pricing.
- Creative Writing uses GPT-4 to judge GPT-4 outputs and a limited author-subset human comparison, with no ground-truth reference and an incompletely specified baseline-selection/accounting mapping.
- Results do not establish transfer to current models, normal production data, different prompts, or tasks without a verifier.

## Source appendix

| Retained source | Type/date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*, arXiv v2](https://arxiv.org/html/2305.10601v2) | Original paper, v2 dated 2023-12-03; focal runs 2023-05-05 to 2023-05-16 | Methods, focal results, appendices, token/cost tables, model ablations, discussion | Single original study with bespoke tasks and historical GPT-4 configuration; no production replication or latency evidence |
| [Local assigned-paper evidence note](streams/s1.md) | Local synthesis of the retained original source | Preserves table values, qualifications, source-format inconsistency, and scoped local-evaluation proposal | Not independent evidence; original paper above remains the authority |
