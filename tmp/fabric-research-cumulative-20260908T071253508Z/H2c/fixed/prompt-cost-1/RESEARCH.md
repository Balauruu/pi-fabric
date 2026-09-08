# Decision: use Tree of Thoughts only as a gated, evaluated option

**Scope and research date:** This report assesses the original Tree of Thoughts (ToT) study only, using the supplied frozen primary-paper extracts as of 2026-09-07. “Direct” below means the paper's input-output (IO) prompting. The decision is whether to replace direct or chain-of-thought (CoT) prompting in a production reasoning workflow.

## Executive answer

**Do not adopt ToT as the default replacement for IO or CoT.** The study establishes that one GPT-4 Chat Completion configuration, at temperature 0.7 in May 2023, achieved large gains on a hard, verifiable arithmetic-search task and smaller evaluator-dependent gains on an invented creative-writing task. It also establishes materially higher and configuration-specific resource use. It does **not** establish an advantage for current production models, routine tasks, knowledge-limited tasks, production latency, reliability, or unit economics.

Adopt ToT only behind a task-class gate where local evidence shows all of the following: (1) CoT fails on difficult target cases, especially after an early irreversible choice, (2) the work has meaningful intermediate states and a valid selector or verifier, and (3) its incremental quality clears explicit cost and latency limits. Keep IO/CoT as the default elsewhere. Run the paired local evaluation artifact below before enabling the gate.

## What the original measurements establish

### Game of 24: large gain on a constrained search task

The paper tested 100 relatively hard games, indices 901–1,000 from 4nums.com. A success was a valid equation equaling 24 that used every input number exactly once. The model was GPT-4 Chat Completion at temperature 0.7; experiments ran May 5–16, 2023. [Original methods and results](https://arxiv.org/html/2305.10601v2#S4.SS1)

| Condition | Success | Comparator condition and interpretation |
|---|---:|---|
| IO, 5-shot, 100 samples per game averaged | 7.3% | Direct-prompt baseline. |
| CoT, three intermediate equations, 100 samples per game averaged | 4.0% | One sampled chain, worse than IO in this task. |
| CoT self-consistency, majority output of 100 CoT samples | 9.0% | Deployable only where a majority output is meaningful. |
| ToT BFS, breadth 1 | 45% | Search with one retained state. |
| ToT BFS, breadth 5 | 74% | Main ToT result. |
| IO, oracle best of 100 | 33% | Retrospective best-of-samples result, not a described deployable selector. |
| CoT, oracle best of 100 | 49% | Same oracle limitation. |

The ToT configuration used three thought steps, each an intermediate equation. It proposed next steps, retained the best five states at each BFS level, and had GPT-4 classify candidates as sure, maybe, or impossible. Each thought was valued with three samples. About 60% of CoT samples failed after the first step. This supports the narrow mechanism claim that branching can help when an early decision makes a solvable arithmetic state unrecoverable. It does not show that branching helps tasks without that structure.

The often-quoted **4% versus 74%** contrast is single-chain CoT versus ToT. The more demanding available comparison is **49% CoT oracle-best-of-100 versus 74% ToT**, but it is not an equivalent deployment comparison: the CoT condition has retrospective oracle selection, while ToT has model-based intermediate selection. The paper maps samples and visited tree nodes for a scale analysis, but neither this nor similar completion-token totals equalizes prompts, requests, selection opportunity, cost, or latency.

### Creative Writing: smaller score gain, model-judged and human-subset evidence

The task supplied four random sentences and required a coherent four-paragraph passage ending each paragraph with the corresponding sentence. There was no reference passage. Over 100 inputs, the paper reported: [Original methods and results](https://arxiv.org/html/2305.10601v2#S4.SS2)

| Condition | Outcome |
|---|---:|
| IO, zero-shot | GPT-4 coherence score 6.19/10 |
| CoT, zero-shot plan then write | 6.93/10 |
| ToT | 7.56/10 |
| Iterative refine from IO | 7.67/10 |
| Iterative refine from ToT | 7.91/10 |
| Blind human ToT vs. CoT | ToT preferred 41/100, CoT 21/100, tie 38/100 |

The automatic outcome is five GPT-4 zero-shot scores per output, averaged. The mean within-output standard deviation was about 0.56. The human comparison used a subset of authors, blinded to condition with randomized passage order. Those methods support a directional result under this evaluation setup, not an independent production-quality estimate.

ToT here was depth 2, not retained multi-branch BFS: it generated five plans, used five votes to select one, generated five passages from that plan, then used five votes to select one. Breadth was one. IO and CoT each generated 10 samples per task, but the supplied source does not state how those samples were selected or aggregated for the reported score. Do not treat this result as a clean, equal-selection comparison.

## Published resource and cost accounting

The primary table header is **Generate/Prompt tokens**. Its surrounding prose calls the first number completion tokens, but does not define the slash convention. The figures below preserve the source's labels rather than infer billing semantics. [Appendix B.3 and tables 7–8](https://arxiv.org/html/2305.10601v2#A2.SS3)

| Task and condition | Generate/Prompt tokens per case | Published cost per case | Quality field in same table |
|---|---:|---:|---:|
| Game of 24 IO, best of 100 | 1.8k / 1.0k | $0.13 | 33% |
| Game of 24 CoT, best of 100 | 6.7k / 2.2k | $0.47 | 49% |
| Game of 24 ToT | 5.5k / 1.4k | $0.74 | 74% |
| Creative Writing IO | 0.9k / 0.4k | $0.06 | Not reported in table |
| Creative Writing CoT | 0.9k / 0.4k | $0.07 | Not reported in table |
| Creative Writing ToT | 4.0k / 2.9k | $0.32 | Not reported in table |

On Game of 24, ToT used fewer published generated/completion tokens than CoT best-of-100 (5.5k vs. 6.7k), fewer published prompt tokens (1.4k vs. 2.2k), and had higher success (74% vs. 49%), but cost more per case ($0.74 vs. $0.47). This does not make the methods cost-matched: the selection regimes differ and the paper supplies no request count or latency distribution.

On Creative Writing, ToT's published generated tokens were about 4.4× IO/CoT (4.0k vs. 0.9k), prompt tokens about 7.25× (2.9k vs. 0.4k), and money cost about 5.3× IO ($0.32 vs. $0.06) or 4.6× CoT ($0.32 vs. $0.07). The paper summarizes this as around 5× completion tokens and money cost. Its two main ToT runs cost about **$106**: 100 × $0.74 plus 100 × $0.32. It says Crossword DFS experiments should be within $100, not that their exact cost was measured. It further says ToT could require 5–100× more generated tokens than CoT depending on prompts and search algorithm.

The HTML caption for Table 8 says “Cost analysis on Game of 24,” while its table header and rows say Creative Writing. This source-format discrepancy is retained. Historical API costs and token totals are measurements of the tested model, prompt, search procedure, and pricing, not current cost forecasts.

## Operational guidance

**Use ToT only when all gates pass.** The following are proposed operating controls, not measured paper results.

1. **Mechanism gate.** Require a multi-step task with alternative intermediate states, a credible backtracking or selection opportunity, and demonstrated difficult CoT cases. Do not assume a plan-and-vote configuration transfers to deep BFS or vice versa.
2. **Evaluator gate.** Use an independent deterministic validator where possible. If model evaluation is necessary, log candidate states, evaluator decisions, pruned branches, and final selection. Retain alternatives or define a fallback when the evaluator is uncertain.
3. **Budget gate.** Set per-request dollar, generated-token, prompt-token, request-count, and p95 latency ceilings that include votes, retries, discarded branches, and fallback work. Treat unmeasured latency and reliability as unknown.
4. **Routing gate.** Route routine/easy cases to IO or CoT. Route knowledge-limited cases away from ToT unless the missing knowledge is separately supplied. The paper reports only slight zero-shot ToT improvement on GSM8K and StrategyQA when GPT-4+CoT was already strong, and identifies external knowledge as StrategyQA's bottleneck. [Appendix B.1](https://arxiv.org/html/2305.10601v2#A2.SS1)

The need for evaluator controls is evidence-based. In the Crossword ablation, model pruning could discard a correct state. Without pruning, correct solutions were found in four of 20 games, three of which pruned ToT did not solve within 100 steps, although the output heuristic returned only one. This is direct evidence that self-evaluation is not reliably correct. [Original ablation](https://arxiv.org/html/2305.10601v2#S4.SS3)

## Paired local evaluation artifact

**Purpose:** a pre-deployment comparison, not a result of the paper. Freeze the artifact before running it.

| Artifact field | Specification |
|---|---|
| Decision | Enable ToT only for the mechanism cohort if it improves the prespecified primary quality metric, meets all service ceilings, and does not materially increase severe failures. |
| Cohorts | (A) representative hard cases with verifiable intermediate states and early-decision sensitivity; (B) routine/easy and knowledge-limited boundary cases. Report B separately and do not use it to claim an established ToT gate. |
| Paired arms | Same case in IO, CoT, CoT multi-sample/self-consistency with a deployable selector, and ToT. Freeze model/version, temperature, system prompt, task context, tools, timeout, output validator, and fallback policy across arms. |
| ToT manifest | Thought unit; generation count; evaluator and aggregation; depth; breadth; pruning rule; stop rule; fallback. Store this beside every run. |
| Analysis 1: budget-matched | Cap generated tokens, prompt tokens, requests, and wall-clock latency equally for CoT multi-sample and ToT. Analyze each case pair. |
| Analysis 2: service-level-matched | Compare arms under the production dollar and latency ceilings, including repeated prompts, voting, retries, and discarded branches. |
| Outcomes | Independently validated task success or blinded domain judgment; quality severity; severe failure; abstention/fallback; evaluator-selection error; generated/prompt tokens; API cost; request count; p50/p95 latency; repeated-run variance. |
| Required report row | `case_id, cohort, arm, model_version, seed/run_id, valid, primary_quality, severe_failure, fallback, generated_tokens, prompt_tokens, request_count, api_cost, latency_ms, evaluator_error, manifest_id` |
| Adoption rule | Pre-specify the minimum paired quality improvement, maximum severe-failure increase, and ceilings before inspection. Publish all arm outcomes and cohort B separately. |

## Limitations and stopping point

The original work covers three relatively simple tasks selected to challenge GPT-4, not a production domain. Game of 24 is narrow and fully verifiable. Creative Writing lacks ground truth and relies on GPT-4-as-judge plus a small author subset. The supplied sources provide no p50/p95 latency, rate-limit behavior, retry/failure recovery cost, end-to-end reliability, current-model result, or production-domain value threshold.

The frozen source also does not retain the main Game of 24 result-table cells or Creative Writing figure cells beyond the reported prose, including the iterative-refine Game of 24 result and Creative Writing baseline sample-selection detail. No reconstruction was attempted. Investigation ends here because the permitted evidence is limited to the supplied frozen original-paper extracts.

## Source appendix

1. **[Yao et al., “Tree of Thoughts: Deliberate Problem Solving with Large Language Models”](https://arxiv.org/html/2305.10601v2)**. Primary paper, NeurIPS 2023, HTML v2. Evidence form: methods, reported outcomes, discussion, and appendices. Supports the GPT-4 task results, configurations, transfer qualifications, and evaluator-pruning counterexample. Limitation: three selected tasks and historical configuration, with some table/figure cells absent from the supplied extraction.
2. **[Primary Appendix B.3 cost tables](https://arxiv.org/html/2305.10601v2#A2.SS3)**. Primary paper table recovery, HTML v2. Evidence form: Tables 7–8 and surrounding cost prose. Supports published per-case Generate/Prompt token labels, costs, $106 total, and 5–100× statement. Limitation: slash convention is undefined, and Table 8's caption conflicts with its Creative Writing rows.

Local evidence used for this synthesis: [substantive note](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2b/fixed/prompt-cost-2-Y/streams/s1.md), cross-checked against the two frozen primary-source files above.
