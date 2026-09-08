# Tree of Thoughts: decision on production adoption

**Decision:** Do **not** adopt Tree of Thoughts (ToT) as the default production reasoning workflow on this evidence alone. Retain direct input-output (IO) or chain-of-thought (CoT) prompting as the default. Run a bounded, paired local trial only for a workflow slice with explicit, short intermediate states, real branching and backtracking value, and a reliable verifier or validated state evaluator.

**Scope and evidence boundary.** This report answers the narrowed question from the frozen original Tree of Thoughts materials only, as of 2026-09-07. It does not rank prompting methods generally or claim performance on current models or a production workload. Research ended because the controlled assignment permits only the supplied primary-paper extraction and its frozen cost-table supplement.

## What the original measurements establish

All main experiments used chat-completion GPT-4 at temperature 0.7, run May 5–16, 2023. The results are task-specific configurations, not a single generic ToT setting. The paper defines ToT by four independently variable choices: thought decomposition, candidate generation, state evaluation, and search algorithm. [Original paper, §3–4](https://arxiv.org/html/2305.10601v2)

### Game of 24: objective success, but a narrow search task

The test set was 100 relatively hard games, indices 901–1,000 of a 1,362-game collection. A result succeeded only if it formed 24 with all four inputs used exactly once. The metric was success rate over those 100 games. IO used five in-context examples. CoT used three intermediate equations. IO and CoT were each sampled 100 times per game for the reported average performance. [Methods and results, §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1)

| Condition | Success | What it measures |
|---|---:|---|
| IO, 5-shot | 7.3% | Average performance across 100 samples per game |
| CoT | 4.0% | Average performance across 100 samples per game |
| CoT self-consistency | 9.0% | Majority output from 100 CoT samples |
| IO, oracle best-of-100 | 33% | Existence of a successful sample under an oracle selector |
| CoT, oracle best-of-100 | 49% | Existence of a successful sample under an oracle selector |
| ToT BFS, breadth 1 | 45% | Search and state evaluation with one retained state |
| ToT BFS, breadth 5 | 74% | Main reported ToT condition |

Source: [§4.1](https://arxiv.org/html/2305.10601v2#S4.SS1) and [Appendix B.3, Table 7](https://arxiv.org/html/2305.10601v2#A2.T7).

The 74% ToT condition decomposed reasoning into three intermediate-equation steps. It used one-example sequential proposals, breadth-first search, retained the best five states at each step, and evaluated candidates as `sure`, `maybe`, or `impossible` using three value samples per thought. About 60% of CoT samples had already failed after the first step. This supports the mechanism that local alternatives plus useful pruning can help in this finite, externally verifiable search setting. It does not show that ordinary CoT lacked a production-feasible selector, because the best-of-100 baselines use an oracle and are not deployable selection policies.

#### Per-case resource and quality comparison

| Same task, published condition | Generate / prompt tokens | Published cost per case | Success |
|---|---:|---:|---:|
| IO, oracle best-of-100 | 1.8k / 1.0k | $0.13 | 33% |
| CoT, oracle best-of-100 | 6.7k / 2.2k | $0.47 | 49% |
| ToT | 5.5k / 1.4k | $0.74 | 74% |

Source: [Appendix B.3, Table 7](https://arxiv.org/html/2305.10601v2#A2.T7).

Within this table, ToT exceeded oracle best-of-100 CoT by 25 percentage points while reporting fewer generated tokens, 5.5k versus 6.7k, but a higher per-case dollar cost, $0.74 versus $0.47. Preserve these as published rather than recalculating: the table header is **Generate/Prompt tokens**, while the surrounding prose calls the 5.5k value completion tokens and does not define the slash convention.

### Creative Writing: quality signal, not correctness proof

The task used 100 inputs, each four random sentences. A valid output was a coherent four-paragraph passage ending each paragraph with its corresponding input sentence. There was no ground-truth passage. Coherence was measured by five GPT-4 zero-shot scores on a 1–10 scale, averaged per output, and a blinded comparison by a subset of the authors between CoT and ToT outputs. [Methods and results, §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2)

| Condition | Result |
|---|---:|
| IO, zero-shot | GPT-4 coherence score 6.19 |
| CoT, zero-shot plan then write | 6.93 |
| ToT | 7.56 |
| Iterative refinement on IO | 7.67 |
| Iterative refinement on ToT | 7.91 |
| Blind author comparison, ToT vs CoT | ToT preferred 41/100, CoT 21/100, tied 38/100 |

Source: [§4.2](https://arxiv.org/html/2305.10601v2#S4.SS2).

ToT had depth two: sample five plans, vote five times to retain one, sample five passages from that plan, then vote five times to retain one. IO and CoT each produced 10 samples per task. The ToT score was 0.63 points above CoT and 1.37 above IO, but iterative refinement on IO scored 0.11 points above ToT. Thus this evidence does not establish ToT as the dominant open-ended-workflow technique.

| Same task, published condition | Generate / prompt tokens | Published cost per case |
|---|---:|---:|
| IO | 0.9k / 0.4k | $0.06 |
| CoT | 0.9k / 0.4k | $0.07 |
| ToT | 4.0k / 2.9k | $0.32 |

Source: [Appendix B.3, Table 8](https://arxiv.org/html/2305.10601v2#A2.T8).

The paper describes ToT as about five times the completion-token and monetary cost of IO/CoT for this task. Its Table 8 caption says “Cost analysis on Game of 24,” while the table header says “Creative Writing.” That source inconsistency is retained. The automatic metric is potentially noisy, scores GPT-4 outputs with GPT-4, and the human comparison used only a subset of authors. These are quality signals, not independently validated correctness evidence.

### Experiment-level cost and variability

The authors estimate the two main ToT experiments at $0.74 × 100 Game-of-24 cases plus $0.32 × 100 Creative-Writing cases, or about **$106**. Crossword DFS is stated only as “within $100,” not as an exact cost. They state that ToT cost depends heavily on prompts and search algorithms and can require **5–100×** more generated tokens than CoT. [Appendix B.3](https://arxiv.org/html/2305.10601v2#A2.SS3)

## Adoption boundary and operational guidance

**Use ToT only when all gates below are met.** These are proposed production controls, not results measured by the paper.

1. **Search structure:** the workflow has a small, explicit sequence of intermediate states, with multiple plausible next actions and costly or irreversible early errors.
2. **Selection validity:** a deterministic verifier, outcome signal, or locally validated evaluator can rank or prune states. Do not substitute oracle best-of-*n* performance for this gate.
3. **Baseline need:** direct and CoT prompting have demonstrated material failure on the same workload at an acceptable budget.
4. **Economic case:** the measured improvement is worth the full incremental token, API, latency, orchestration, and failure-handling cost.
5. **Safety of pruning:** evaluator false negatives are measured and bounded. The paper’s crossword result shows an evaluator can prune solvable states when it treats unfamiliar or obsolete terms as impossible; it calls better DFS pruning critical. [§4.3](https://arxiv.org/html/2305.10601v2#S4.SS3)

Do not treat open-ended or knowledge-limited work with an unreliable evaluator as an adoption candidate based on this paper. Test it separately as exploratory work. The paper itself says ToT may be unnecessary for tasks GPT-4 already handles well and studied only three relatively simple hard tasks. Its GPT-3.5 Game-of-24 result was 19% versus GPT-4 ToT’s 74%, after changing the proposal prompt from one-shot to three-shot. Mixed generation/evaluation conditions were 64% for GPT-4 generation with GPT-3.5 evaluation and 31% in the reverse direction. This constrains transfer across models and configurations. [§6](https://arxiv.org/html/2305.10601v2#S6), [Appendix B.2](https://arxiv.org/html/2305.10601v2#A2.SS2)

Operationally, make the thought unit, branching factor, evaluator, prune threshold, depth limit, stop rule, and fallback visible configuration. Log every branch and prune with its evaluator result and later verified outcome where available. Stop early on a verified solution. These controls address the paper’s stated prompt/search-dependent cost and evaluator-pruning risk, but their efficacy needs local measurement.

## Concrete paired local evaluation artifact

Run this as a **demonstrated-mechanism** test only: a held-out, production-representative set of verifiable multi-step search cases, stratified by difficulty and known failure mode. Every case must run all arms with the same production model, model version, input, system context, and evaluation window:

- IO
- CoT
- CoT with a production-feasible selector, if one exists
- ToT with fixed thought granularity, branch factor, evaluator, prune rule, depth limit, and stop rule

Use the following record as the required paired artifact. Store one record per `case_id` and arm, with the same `pair_id` across arms. Fields marked `TBD` are filled by the local run, not inferred from the paper.

```json
{
  "pair_id": "P-0001",
  "case_id": "C-0001",
  "stratum": "difficulty/failure-mode",
  "arm": "io | cot | cot_feasible_selector | tot",
  "model_and_version": "TBD",
  "prompt_context_hash": "TBD",
  "budget_view": "fixed_cost | fixed_quality_target",
  "budget_cap_tokens_or_usd": "TBD",
  "thought_spec": {
    "unit": "none | explicit local unit",
    "branch_factor": 1,
    "evaluator": "none | verifier/evaluator ID",
    "prune_rule": "none | explicit rule",
    "depth_limit": 0,
    "stop_rule": "explicit rule"
  },
  "verified_success": "TBD",
  "input_tokens": "TBD",
  "output_tokens": "TBD",
  "total_tokens": "TBD",
  "api_cost_usd": "TBD",
  "wall_latency_ms": "TBD",
  "model_calls": "TBD",
  "branches_generated": "TBD",
  "branches_pruned": "TBD",
  "evaluator_or_verifier_error": "TBD",
  "failure_stage": "none | initial-state | intermediate-state | selection | finalization",
  "recovered_from_early_bad_state": "TBD"
}
```

Analyze the records in two non-interchangeable views:

- **Fixed cost:** cap every arm at the same token or dollar budget. Compare paired verified success, cost, latency, calls, and evaluator error.
- **Fixed quality target:** set an acceptable verified-success target before the run, then estimate the least cost and latency at which each arm reaches it.

Adopt ToT only if its paired improvement is operationally meaningful, survives full-cost and tail-latency accounting, and remains positive after evaluator false-negative failures are included. For open-ended or knowledge-dependent workflows, use a separate exploratory comparison against CoT **and** iterative refinement with blinded independent raters, pre-specified rubric, factuality, and safety checks. Do not merge those results with the verifiable-search decision.

## Limitations and unresolved questions

- The evidence is from deliberately constructed hard tasks, an early GPT-4 chat-completion setting, and task-specific prompts and algorithms. It does not quantify transfer to a current production model, workload, pricing, or latency regime.
- The supplied extraction does not retain main-result table cells or figure data beyond the preserved result prose and cost tables. It cannot recover unreported ablation values, full scale curves, or further Creative-Writing selection details.
- The paper’s oracle IO/CoT comparisons show sample availability, not a deployable selection policy.
- Creative-Writing quality is not objective correctness and is entangled with the evaluated model and author subset.
- Published token/cost values should not be normalized because the source does not define the `Generate/Prompt tokens` slash convention. Missing latency, evaluator-error rates, and uncertainty intervals remain unknown.

## Source appendix

| Retained source | Type and date | Evidence form | Supports | Important limitation |
|---|---|---|---|---|
| [Tree of Thoughts: Deliberate Problem Solving with Large Language Models, arXiv HTML v2](https://arxiv.org/html/2305.10601v2) | Primary paper, NeurIPS 2023. Frozen extraction supplied for this assignment | Methods, result prose, discussion, appendices | Model/time conditions, task definitions, comparators, Game-of-24 and Creative-Writing results, evaluator failure, GPT-3.5 transfer, limitations | Main-result table cells and figures are not retained in the supplied text extraction |
| [Appendix B.3 cost tables, arXiv HTML v2](https://arxiv.org/html/2305.10601v2#A2.SS3) | Primary paper supplement. Frozen raw table extraction supplied for this assignment | Faithful Tables 7–8 plus surrounding cost prose | Per-case token strings, cost, Game-of-24 success, $106 experiment calculation, 5–100× statement | Token slash convention is undefined. Table 8 caption/header mismatch is present in the primary source |

Local evidence consulted: [substantive source-bound note](streams/s1.md). It is a supplied synthesis aid, not an independent evidence origin.