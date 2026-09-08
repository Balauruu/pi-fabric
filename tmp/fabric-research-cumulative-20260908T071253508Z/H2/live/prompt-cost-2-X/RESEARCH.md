# Tree of Thoughts: adoption decision from the original study

**Decision:** Do **not** replace direct prompting or chain-of-thought (CoT) with Tree of Thoughts (ToT) by default. The original study supports a selective use case: high-value tasks with genuine branching and recoverable intermediate states, where a credible deployable selector or verifier can guide search and a local matched test demonstrates that the error reduction pays for extra calls, tokens, and latency. It does not establish a general production advantage.

**Scope and research date:** Original ToT paper, arXiv v2 (3 December 2023), its appendix, and the paper-linked repository/prompts, inspected 2026-09-08. The main GPT-4 experiments used Chat Completion mode, temperature 0.7, during 5–16 May 2023. This investigation ends at the assigned original materials. It does not infer a universal prompting ranking or add later research.

## What the study measured

### Game of 24: a large gain in a specialized search setting

The paper tested 100 relatively hard Game-of-24 instances, indices 901–1000 of a 1,362-game 4nums.com set. A response succeeded only if it formed 24 and used every input number exactly once. This gives a deterministic, external correctness test. [Paper §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1)

| Condition | Success on the 100 puzzles | Comparison and conditions |
|---|---:|---|
| Direct IO | 7.3% | 5-shot prompt, average of 100 samples/game |
| CoT | 4.0% | 5-shot prompt with three intermediate equations, average of 100 samples/game |
| CoT self-consistency | 9.0% | majority output from 100 CoT samples |
| IO + iterative refinement | 27% | at most 10 refinements, receiving ground-truth equation-correctness feedback |
| ToT BFS, breadth 1 | 45% | three equation thoughts, LM value heuristic |
| ToT BFS, breadth 5 | **74%** | same, retain five states per level |
| IO best-of-100 | 33% | oracle success if any of 100 samples is valid |
| CoT best-of-100 | 49% | oracle success if any of 100 samples is valid |

Source: [Table 2 and §4.1](https://arxiv.org/html/2305.10601v2#S4.F3).

The decision-relevant matched-compute-looking contrast is **74% ToT versus 49% CoT best-of-100**, a 25-point difference, but it is still not a clean deployable comparison: best-of-100 is explicitly an oracle that credits any correct sample, not a production selection method without a verifier. The headline 74% versus 4% instead compares ToT with a one-sample CoT result.

The ToT configuration is materially task-specific: it decomposes the solution into three arithmetic equations, sequentially proposes next steps, keeps the best five states at every BFS step, and samples the language-model state value three times per candidate as `sure/maybe/impossible`. The linked implementation greedily selects values and caches repeated value prompts. [Paper §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1) · [BFS implementation](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/methods/bfs.py) · [Game prompts](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/prompts/game24.py)

The refinement result is also not an ordinary open-ended baseline. It receives a ground-truth signal that the equation is wrong, which many production reasoning tasks lack. Thus this experiment establishes that structured generation plus LM-guided search can help this verifiable symbolic task. It does not isolate an effect transferable to workflows without a reliable state or final-output judge.

### Creative Writing: smaller gain and a strong non-tree alternative

For each of 100 inputs made from four random sentences, the system had to write four coherent paragraphs ending respectively in those sentences. There was no reference answer. GPT-4 assigned coherence scores from 1–10, and a subset of authors performed a blind CoT-versus-ToT pairwise comparison. [Paper §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2)

| Condition | Mean GPT-4 coherence (/10) | Conditions |
|---|---:|---|
| Direct IO | 6.19 | zero-shot, ten samples/task |
| CoT | 6.93 | zero-shot, ten samples/task |
| ToT | **7.56** | five plans then five passages, five votes at each choice |
| IO + iterative refinement | **7.67** | paper’s refinement procedure |
| ToT + iterative refinement | 7.91 | paper’s refinement procedure |

Source: [§4.2 and Figure 4](https://arxiv.org/html/2305.10601v2#S4.SS2).

ToT exceeded CoT by **0.63/10**. In the blind comparison, ToT was preferred for 41/100 pairs, CoT for 21/100, and 38 were similarly coherent. The writing procedure is shallow selection, not broad recursive exploration: generate five plans, vote five times for one, generate five passages from that plan, then vote five times for one passage. [Paper §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2) · [Writing prompts](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/prompts/text.py)

The paper’s own counterevidence matters: iterative refinement took IO from 6.19 to **7.67**, above unreﬁned ToT’s 7.56. This result does not support tree search as the best production upgrade for open-ended writing. Its automatic metric also uses GPT-4 to score material generated and selected by GPT-4, while the human comparison used authors rather than an independent production utility measure.

## Token and monetary evidence

Appendix B.3 reports per-case totals as completion/generation tokens and prompt tokens, followed by then-current GPT-4 cost. These are study-era amounts, not current pricing forecasts. [Appendix B.3, Tables 7–8](https://arxiv.org/html/2305.10601v2#A2.SS3)

| Task and condition | Completion / prompt tokens | Reported cost per case | Reported outcome |
|---|---:|---:|---:|
| Game of 24, IO best-of-100 | 1.8k / 1.0k | $0.13 | 33% |
| Game of 24, CoT best-of-100 | 6.7k / 2.2k | $0.47 | 49% |
| Game of 24, ToT | 5.5k / 1.4k | $0.74 | 74% |
| Creative Writing, IO | 0.9k / 0.4k | $0.06 | 6.19 |
| Creative Writing, CoT | 0.9k / 0.4k | $0.07 | 6.93 |
| Creative Writing, ToT | 4.0k / 2.9k | $0.32 | 7.56 |

The source’s summary is that writing ToT used about five times the completion tokens and money of the simple writing arms. From the reported monetary rows, it is 4.6× the CoT cost ($0.32/$0.07) and 5.3× IO ($0.32/$0.06). The main 100-case ToT Game-of-24 and Creative-Writing experiments were reported as approximately **$106**: 100×$0.74 + 100×$0.32. The paper estimates the crossword DFS experiments at within another $100. [Appendix B.3](https://arxiv.org/html/2305.10601v2#A2.SS3)

Do not derive an exact Game-of-24 cost ratio from the token table. The linked wrapper prices GPT-4 at $0.06/1k completion tokens plus $0.03/1k prompt tokens and accumulates both across API calls. Applying that formula to the ToT row (5.5k, 1.4k) yields **$0.372**, not the table’s reported **$0.74**. The other listed rows approximately reconcile, and the paper gives no explanation. Retain $0.74 as the reported experimental total, but treat this discrepancy as unresolved. [Model wrapper](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/models.py)

Further, the Game-of-24 cost rows price ToT against oracle best-of-100 IO/CoT, not the 7.3% direct or 4.0% CoT conditions. No per-case cost is reported for those ordinary conditions. Therefore the paper does not provide a clean production cost-effectiveness frontier. It states ToT can require **5–100×** more generated tokens than CoT, depending on prompts and search, so a current workflow must measure its own model, prompts, breadth, evaluator, and traffic distribution.

## Transfer limits and adoption boundary

**Measured facts, not general claims**

- The evidence distribution is narrow: 100 hard arithmetic puzzles with an exact verifier and 100 synthetic writing constraints. It does not measure production coding, analysis, operations, safety-critical decisions, customer traffic, tail latency, or reliability. [Discussion](https://arxiv.org/html/2305.10601v2#S6)
- All main results are May-2023 GPT-4. In the paper’s GPT-3.5 writing extension, IO/CoT/ToT score 4.47/5.16/6.62 versus GPT-4’s 6.19/6.93/7.56. In Game of 24, GPT-3.5 ToT reached 19% after changing the proposal prompt from one to three shots, versus GPT-4 ToT’s 74%. This indicates material dependence on both generation and evaluation capability and prompt design. [Appendix B.2](https://arxiv.org/html/2305.10601v2#A2.SS2)
- State selection can fail. The crossword ablations show pruning and final-state selection can remove correct states, while oracle best-state selection solves more. [§4.3 ablations](https://arxiv.org/html/2305.10601v2#S4.SS3)
- On 100-example GSM8K and StrategyQA subsets, the paper reports only slight zero-shot gains over already-strong GPT-4 CoT and says StrategyQA is bottlenecked by external knowledge rather than reasoning. [Appendix B.1](https://arxiv.org/html/2305.10601v2#A2.SS1)

**Recommendation:** Route a task class to ToT only when all conditions hold: (1) direct/CoT misses have material cost, (2) the work has meaningful intermediate states, (3) branching or backtracking helps rather than producing paraphrased samples, (4) a deployable verifier, selector, or outcome-grounded judge exists, (5) the extra calls fit the token, cost, and p95 latency budget, and (6) ToT wins a local paired comparison against direct, CoT, and non-tree refinement. Otherwise retain direct prompting or CoT. For editorial or creative work, test refinement before tree orchestration.

## Local paired-evaluation artifact

This is a proposed production control, not a result of the paper. It is the minimum artifact needed to decide adoption locally.

### Protocol

| Field | Fixed design |
|---|---|
| Population | Pre-register 100–200 held-out representative cases, stratified by difficulty, risk, and verifier availability. Preserve inputs, tool access, and output contract. |
| Arms per case | Direct IO, CoT, iterative refinement, cost-matched CoT/self-consistency, ToT b=1, ToT b=3, and ToT b=5. |
| Controlled variables | Same current model/version, system prompt, tools/permissions, temperature policy, maximum elapsed time, and deployable selector policy. |
| Fair selection | Apply a deterministic verifier to every eligible candidate in every arm. Otherwise use blinded domain experts or an evaluator calibrated against humans and separate from the generation model where feasible. Never count oracle pass@N as production utility. |
| Recorded measures | Utility/correctness, constraint and safety failures, retry rate, prompt tokens, completion tokens, request cost, model-call count, p50/p95 end-to-end latency, selector confidence, evaluator disagreement, and downstream outcome when available. |
| Decision rule | Pre-register the minimum paired utility/error improvement that offsets incremental cost and p95 latency. ToT must beat the best non-tree arm under both equal spend and the intended production budget. Report paired bootstrap confidence intervals, not only means. |
| Rollout | Route only passing task strata to ToT. Keep direct/CoT fallback and monitor selector confidence and downstream outcomes for evaluator failure. |

### Case-level result schema

Store one row per `case_id × arm × run_id` and retain raw outputs and selector/verifier decisions under access-controlled evaluation storage.

```csv
case_id,stratum,arm,run_id,model_version,prompt_revision,temperature,tool_policy,tot_breadth,generator_calls,evaluator_calls,selector_type,verifier_available,utility_score,correct,constraint_failure,safety_failure,retry_count,prompt_tokens,completion_tokens,request_cost_usd,latency_ms,selector_confidence,evaluator_disagreement,downstream_outcome,output_ref
```

Pre-register the pairing key as `case_id`; compare each ToT breadth with every non-tree arm on the same cases. Publish the per-arm paired deltas for utility, correctness/failure rate, cost, and p95 latency, with bootstrap intervals. This separates a structured-search gain from merely spending more on samples.

## Material gaps

1. No confidence intervals, raw per-case outputs, token/cost distributions, latency, stable GPT-4 snapshot identifier, or production traffic evidence are supplied.
2. The Game-of-24 ToT token row and the repository’s stated pricing do not reconcile with the reported $0.74 cost.
3. No deployable comparison exists for the oracle best-of-100 results, and no cost is supplied for the ordinary 7.3% IO and 4.0% CoT rows.
4. Creative-Writing utility is not independently production-grounded, and the paper cannot determine whether any current model, evaluator, or workload transfers.

## Retained-source appendix

| Source | Type/date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [Tree of Thoughts paper, arXiv v2](https://arxiv.org/html/2305.10601v2) | Original paper, v2, 2023-12-03 | Methods, Game-of-24 and writing outcomes, appendix cost accounting, extensions, and stated caveats | Small synthetic tasks, May-2023 GPT-4, no latency or uncertainty reporting |
| [Original BFS implementation](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/methods/bfs.py) | Original linked repository, inspected 2026-09-08 | LM-generated proposals, values/votes, greedy selection, and value caching | Implementation confirms mechanics, not experimental distributions |
| [Original model wrapper](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/models.py) | Original linked repository, inspected 2026-09-08 | Prompt/completion counters and stated GPT-4 pricing used to expose the unreconciled Game-of-24 row | Does not explain table discrepancy or identify a stable service snapshot |
| [Original Game-of-24 prompts](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/prompts/game24.py) and [Writing prompts](https://github.com/princeton-nlp/tree-of-thought-llm/blob/master/src/tot/prompts/text.py) | Original linked repository, inspected 2026-09-08 | Task-specific 5-shot/1-shot proposal/value prompts and writing vote/score prompts | Prompt specificity limits transfer |
| [Local assigned source note](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2/live/prompt-cost-2-X/streams/s1.md) | Local synthesis input, read 2026-09-08 | Cross-checkable detailed extraction and qualifications | Not independent evidence. Original links above are authoritative. |
