# Production prompt-technique selection guide

**Scope and evidence date.** This is a decision-grade guide for technical prompting and scaffold/context boundaries in text, reasoning, and tool-using LLM systems. It uses only the six supplied frozen primary-source files, inspected on 2026-09-08. Results are historical, task- and model-specific measurements, not evidence of parity with any current production model. Investigation ends here because the evidence corpus is fixed.

## Executive answer

Use a **direct, constrained prompt** as the default for ordinary text generation, but this corpus does not measure its general production quality. Add **few-shot chain-of-thought (CoT)** when a locally tested target model faces multi-step arithmetic, symbolic, or structured reasoning and the added tokens are acceptable. The strongest measured CoT gains are on difficult multi-step tasks and sufficiently large historical models, not an all-model rule. For hard, verifiable search/planning problems where one path fails early, use **Tree of Thoughts (ToT)** only when its substantial inference cost is justified and its generator/evaluator have passed a local comparison. For a bounded tool environment, use **ReAct**: sparse, interleaved thought, action, and observation, with explicit stop conditions and tool-result validation. Treat **self-repair** as a tested code-only loop, not a universal correction layer: compare it at equal sample/token budget to independent generation and execution; prioritize diverse initial candidates and high-quality feedback. For long contexts, place decision-critical material near the beginning or end and evaluate positions, not merely window fit.

There is no corpus-supported universal ranking. The studies use different models, dates, tasks, metrics, action spaces, feedback, and budgets.

## Operational decision table

| Production situation | Select or avoid | Measured basis under original conditions | Operational controls and failure signals |
|---|---|---|---|
| Ordinary text generation or a task without demonstrated multi-step/search need | Start direct. Do not infer that CoT, ToT, or ReAct improves it. | No supplied study measures generic production text quality. ToT itself says its deliberate search may be unnecessary on tasks GPT-4 already handles well. [Primary §6](https://arxiv.org/html/2305.10601) | Evaluate quality, constraint adherence, latency, and cost against direct prompting. Escalate only on repeated, classifiable reasoning or planning failures. |
| Multi-step arithmetic, symbolic, or some commonsense reasoning | Try few-shot CoT with task-matched worked exemplars. | PaLM 540B on GSM8K rose 17.9% → 56.9%; GPT-3 175B, 15.6% → 46.9%; Codex, 19.7% → 63.1%. Same comparison is not uniformly positive: LaMDA 137B on AQuA fell 25.5% → 20.6%. [CoT Table 2](https://arxiv.org/html/2201.11903) | Require final-answer checking where possible. Flag low-model-scale degradation, inconsistent rationale/final answer, or near-zero gain on simple tasks. Keep rationale examples and answer format fixed in the paired evaluation. |
| Difficult, discrete, verifiable search/planning with recoverable branches | Consider ToT with explicit thought unit, candidate generation, state evaluation, and BFS/DFS/backtracking. | On 100 hard Game-of-24 instances with GPT-4, 5-shot IO averaged 7.3%, CoT 4.0%, CoT self-consistency 9.0%, ToT breadth 1 45%, and breadth 5 74%. [ToT §4.1](https://arxiv.org/html/2305.10601) | Use a deterministic validity checker when available. Record nodes, generated/prompt tokens, dollars, prune errors, and success. Stop if evaluator calibration or marginal benefit does not justify cost. |
| Open-ended writing | Do not assume search is best. Compare ToT to direct and iterative refinement. | In an invented 100-input GPT-4 creative-writing task, ToT scored 7.56 vs IO 6.19 and CoT 6.93 by GPT-4 scoring; humans preferred ToT to CoT 41 times, CoT 21, and tied 38. Iterative refinement improved IO to 7.67 and ToT to 7.91. [ToT §4.2](https://arxiv.org/html/2305.10601) | Use human or domain outcome measures, not only model judging. This study is not a general production-writing benchmark. |
| Question answering, fact verification, or an agent that must obtain environment facts | Use ReAct with constrained tools when external observations can resolve uncertainty. Consider a bounded fallback between ReAct and sampled CoT only after local validation. | PaLM-540B prompting: ReAct vs Act was 27.4 vs 25.7 EM on HotpotQA and 60.9 vs 58.9 accuracy on FEVER. ReAct lagged CoT on HotpotQA (27.4 vs 29.4) but beat it on FEVER (60.9 vs 56.3). Hybrid ReAct→CoT-SC was 35.1 HotpotQA EM and CoT-SC→ReAct 64.6 FEVER accuracy. [ReAct Table 1](https://arxiv.org/html/2210.03629) | Restrict action space and permissions. Log observation provenance separately from model inference. Flag repeated action/thought loops, empty or noninformative search, unsupported tool calls, and context growth. |
| Long-horizon tool interaction | Prefer sparse ReAct reasoning that tracks goal, subgoals, state, and next action, within a safe action boundary. | In six controlled ALFWorld prompt trials, best ReAct was 71% overall success vs best Act 45% and BUTLER 37%; WebShop ReAct was 66.6 score/40.0% success vs Act 62.3/30.1. [ReAct Tables 3–4](https://arxiv.org/html/2210.03629) | Require action validation before irreversible effects, step/loop limits, and explicit completion checks. These are benchmark simulations, not evidence for unrestricted web or production APIs. |
| Code with executable tests | Use generate → execute → feedback → repair only as an equal-budget competitor to independent samples. | On APPS, GPT-4 self-repair beat equal-budget sampling by up to 8%; GPT-3.5 gains were marginal except at large initial-sample counts. Example: GPT-4 APPS, 10 initial + one repair each (≤20 samples) was 1.05× baseline pass@20, whereas 2 initial + 10 repairs (≤22) was 0.97× baseline pass@22. [Self-repair §4.1](https://arxiv.org/html/2306.09896) | Keep an executable test oracle, compare equal total samples/tokens, use one repair per diverse initial candidate first, and retain failure diagnostics. Do not claim applicability to incomplete-specification software work. |
| Long retrieved/document context | Treat placement and amount as design variables. Put critical instructions/evidence at beginning or end, and test positional permutations. | On multi-document QA, all studied families commonly showed U-shaped position sensitivity. GPT-3.5-Turbo’s worst 20/30-document middle position was below its closed-book 56.1% accuracy. Query-before-and-after-context was near-perfect only for synthetic key-value retrieval and minimally changed multi-document QA. [Lost in the Middle §§2.3, 4.2](https://arxiv.org/html/2307.03172) | Keep retrieval compact, cite/trace the selected evidence, evaluate begin/middle/end placement at expected context lengths, and watch for accuracy saturation as documents increase. |

## Evidence by technique

### 1. Chain-of-thought: measured effects and boundaries

**What was tested.** Wei et al. compared standard few-shot input-output prompts with few-shot prompts whose demonstrations contain intermediate natural-language reasoning. For arithmetic, they manually composed eight exemplars shared across five benchmarks except multiple-choice AQuA, which used four training-set examples. Models were greedily decoded; LaMDA results average five shuffled exemplar orders, while most other models use one order. [Methods §3.1](https://arxiv.org/html/2201.11903)

**Measured results.** The most decision-relevant figures are condition-specific accuracy percentages:

| Task/model/comparator | Standard → CoT | Qualification |
|---|---:|---|
| GSM8K, PaLM 540B | 17.9 → 56.9 (+39.0) | Eight manual exemplars; greedy decoding. |
| GSM8K, GPT-3 175B text-davinci-002 | 15.6 → 46.9 (+31.3) | Same task, different model. |
| GSM8K, Codex code-davinci-002 | 19.7 → 63.1 (+43.4) | Code model, not a current-model proxy. |
| SVAMP, PaLM 540B | 69.4 → 79.0 (+9.6) | Lower relative need than GSM8K. |
| MAWPS, PaLM 540B | 79.2 → 93.3 (+14.2) | Aggregate task. |
| AQuA, LaMDA 137B | 25.5 → 20.6 (−4.9) | Direct counterexample. |

All values are from [CoT Appendix B, Table 2](https://arxiv.org/html/2201.11903). The same study reports that CoT did not positively affect small models and observed fluent but illogical traces below roughly 100B parameters. On easy MAWPS subsets, effects could be negative or small: GPT-3 175B SingleOp was 90.9 → 88.8 and PaLM 540B SingleOp was 94.1 → 94.1, while their MultiArith results were 33.8 → 91.7 and 42.2 → 94.7 respectively. [Table 3](https://arxiv.org/html/2201.11903)

**What the ablations establish.** On LaMDA 137B GSM8K, standard 6.5%, equation-only 5.4%, dots-for-variable-compute 6.4%, reasoning-after-answer 6.1%, and CoT 14.3%. This supports an association with ordered natural-language intermediate steps in that experiment, not merely extra token budget or post-answer explanation. [CoT Table 6](https://arxiv.org/html/2201.11903) An external calculator changed CoT arithmetic results, for example LaMDA 137B GSM8K 14.3% to 17.3% and PaLM 540B 56.9% to 58.6%, but that is a calculator-augmented condition, not CoT alone. [Table 2](https://arxiv.org/html/2201.11903)

**Reliability limits.** CoT examples and order matter. On LaMDA 137B, alternate annotators/concise examples still exceeded standard across four arithmetic tasks but had nonzero variation. Correct final answers do not prove faithful reasoning: in 50 correct GSM8K LaMDA 137B traces, one was correct by chance; the authors caution that accidental correctness is more likely in binary/multiple-choice tasks. Of 50 wrong traces, 8% were calculator-only errors, 16% symbol mapping, 22% one missing step, and 54% required substantial edits, usually semantic/coherence errors. [CoT Appendix D](https://arxiv.org/html/2201.11903)

### 2. Tree of Thoughts: measured search gains and cost

**What was tested.** ToT treats a thought as a problem-specific coherent unit, generates candidates, has the LM value or vote on states, and uses BFS or DFS with pruning/backtracking. Its flagship Game-of-24 test used 100 relatively hard games (indices 901–1000 from a scraped set of 1,362), GPT-4 Chat Completions at temperature 0.7, five IO/CoT demonstrations, 100 samples per game for IO/CoT averages, and a success criterion of a valid equation using each input number once. ToT used three equation steps, BFS, five retained candidates per step, and three value samples per candidate. [ToT §4.1](https://arxiv.org/html/2305.10601)

The 74% ToT result is therefore a concrete search result, not evidence that ToT raises all reasoning tasks. It also compared favorably to an oracle best-of-100 CoT score of 49% on this task, but uses a different structured exploration process. In mini-crosswords, IO and CoT word-level success were below 16%, while ToT reached 60% and solved 4/20 games; imperfect pruning could discard a correct state, and removing pruning could solve cases that pruned ToT missed. [ToT §4.3](https://arxiv.org/html/2305.10601)

**Measured cost.** Preserve the source header ambiguity: Table 7 calls its column `Generate/Prompt tokens`, while nearby prose calls 5.5k completion tokens.

| Game of 24 method | Generate/Prompt tokens | Cost per case | Success |
|---|---:|---:|---:|
| IO, best of 100 | 1.8k / 1.0k | $0.13 | 33% |
| CoT, best of 100 | 6.7k / 2.2k | $0.47 | 49% |
| ToT | 5.5k / 1.4k | $0.74 | 74% |

[Raw primary Table 7 extraction](https://arxiv.org/html/2305.10601v2). For creative writing, IO was 0.9k/0.4k and $0.06, CoT 0.9k/0.4k and $0.07, ToT 4k/2.9k and $0.32. The published Table 8 caption says Game of 24 despite the table header saying Creative Writing. The authors state ToT can require 5–100× more generated tokens than CoT depending on prompt/search configuration. [Table 8 extraction](https://arxiv.org/html/2305.10601v2)

**Boundary.** ToT examined three relatively simple tasks designed to challenge GPT-4. Its authors explicitly say it may not be necessary on tasks GPT-4 already excels at; performance/cost depends on prompts and search, and GPT-3.5 ToT Game of 24 was 19% versus GPT-4 ToT 74%. [ToT Appendix B, §6](https://arxiv.org/html/2305.10601)

### 3. ReAct: measured grounding and tool-use effects

**What was tested.** ReAct interleaves free-form thoughts, domain actions, and environment observations. The knowledge tasks used PaLM-540B, a constrained Wikipedia API (`search`, `lookup`, `finish`), six manually composed HotpotQA and three FEVER trajectories, and question-only inputs. CoT-SC sampled 21 chains at temperature 0.7. [ReAct §§3.1–3.2](https://arxiv.org/html/2210.03629)

The HotpotQA/FEVER numbers in the decision table show why selection must be conditional. ReAct was more grounded but not simply more accurate: in a manual sample of 50 correct and 50 failed HotpotQA trajectories, ReAct vs CoT false positives were 6% vs 14%; ReAct’s failure breakdown included 47% reasoning errors, 23% noninformative search, 0% hallucination, and 29% label ambiguity, while CoT had 16% reasoning errors, 56% hallucination, and 28% label ambiguity. [ReAct Table 2](https://arxiv.org/html/2210.03629) This is human analysis of sampled benchmark trajectories, not a measured safety guarantee.

For decision tasks, ALFWorld used 134 unseen games, three annotated trajectories per task type and six prompts formed from two-trajectory permutations. WebShop used 500 test instructions. The best-of-six ALFWorld figure is not directly comparable with an average-only system. The paper also reports a 48% worst ReAct trial and describes recurring thought/action loops. [ReAct §4](https://arxiv.org/html/2210.03629)

**Boundary.** The tool environments were deliberately constrained: Wikipedia, benchmark WebShop that cannot buy, and no dangerous/private actions. Large action spaces can require more demonstrations than fit in context. [ReAct §6 and Ethics](https://arxiv.org/html/2210.03629) Do not transfer its benefits to arbitrary live tools without safety and task-specific evaluation.

### 4. Self-repair: code-only, equal-budget evidence

**What was tested.** The repair loop samples initial programs, executes them against the full test bed, turns errors into textual feedback, then samples repairs. It compares a repair tree with an iid no-repair baseline at the same count of generated programs, and additionally reports token-based alternatives. Experiments used frozen GPT-3.5-turbo-0301, GPT-4-0314, CodeLlama-13b-instruct, one-shot templated prompts at temperature 0.8, HumanEval, and 300 proportionally sampled APPS tasks. Estimates were bootstrapped from pre-generated repair trees (50 initial programs, typically 25 feedback strings, 1,000 resamples). [Self-repair §§3–4](https://arxiv.org/html/2306.09896)

Feedback quality matters materially in this condition. Replacing GPT-4’s self-feedback with experienced-programmer feedback raised repair success from 33.3% to 52.6% (1.58×) over 40 failing GPT-4 programs, two human feedback items per program, and 25 repair candidates per feedback/program pair. GPT-4 feedback was obviously inaccurate in 32/80 assessed responses versus 7/80 human responses. [Self-repair §4.3, Table 1](https://arxiv.org/html/2306.09896)

**Boundary.** The authors warn that bootstrapping from one large repair tree may create artifacts. More importantly, these are self-contained Python tasks with executable unit tests, unlike incomplete specifications, long dependencies, and missing snippet-level tests in real software. [Self-repair §5](https://arxiv.org/html/2306.09896)

### 5. Context placement is a scaffold boundary, not a prompt trick

**What was tested.** Liu et al. varied answer-document position and number of documents in NaturalQuestions-Open multi-document QA. Each context had exactly one answer-containing Wikipedia passage plus retrieved distractors, models used greedy decoding, and accuracy required an annotated answer in output. They tested MPT-30B-Instruct, LongChat-13B 16K, GPT-3.5-Turbo/16K, Claude-1.3/100K, and a GPT-4 8K subset. [Lost in the Middle §§2.1–2.3](https://arxiv.org/html/2307.03172)

The documented U-shaped effect remained when distractors were randomized and when GPT-4 was tested on 500 random 20-document examples. Extended-context variants were nearly identical to their base counterparts when both could fit the context. In an open-domain QA case study, raising retrieved documents from 20 to 50 improved GPT-3.5-Turbo about 1.5% and Claude-1.3 about 1%, despite further retriever-recall growth. [Lost in the Middle §§2.3, 5; Appendices C–D](https://arxiv.org/html/2307.03172)

This supports position-aware prompt/context assembly for the tested historical models and tasks. It does not establish the same curve for every current architecture, modality, context length, or retrieval stack.

## Paired local-evaluation artifact

Run this artifact before selecting a technique. It is a proposed operational control, not a measured result from the corpus.

```text
Artifact: prompt-technique paired evaluation card

Decision: <direct | CoT | ToT | ReAct | repair loop | context assembly>
Production slice: <representative inputs, exclusions, risk classes>
Base model/version and decoding: <exact>
Prompt/scaffold versions: A=<baseline>, B=<candidate>; hold task wording/output schema fixed
Budget contract: input tokens, output tokens, calls, tool calls, wall time, dollar cost per case
Comparator contract: same test cases; equal total budget where search/repair/sample count changes

Per case:
  id, task class, context length, critical-evidence position (start/middle/end), seed
  final output, validity/quality outcome, human label if used
  tool observations and provenance, invalid actions, loops, retries
  tokens/cost/latency and stop reason
  rationale-to-answer or plan-to-action consistency check where applicable

Aggregate:
  quality/success with uncertainty, failure taxonomy, cost and latency distribution
  direct-vs-candidate paired deltas by task class and context position
  decision rule: deploy only if predeclared quality/safety gain clears its cost/latency threshold
  rollback trigger: regression in high-risk class, unbounded tool behavior, or position sensitivity
```

For CoT, stratify simple versus multi-step cases. For ToT, log breadth, nodes, evaluator/prune disagreement, and verifier outcome. For ReAct, use a sandboxed allowlist and require every action to be grounded in an observation or explicit policy. For repair, use hidden or holdout tests where available and compare equal total generation/tokens. For long context, run the same relevant evidence at start, middle, and end.

## Material limitations and unresolved questions

1. **No current-production inference.** The corpus studies historical PaLM, GPT-3/3.5/4, Codex, CodeLlama, LaMDA, UL2, MPT, LongChat, and Claude configurations. It contains no measurement of the reader’s model, tooling, pricing, latency, or safety controls.
2. **No cross-technique global benchmark.** CoT, ToT, ReAct, repair, and context studies use different datasets and metrics. Their scores cannot be merged into one ranking.
3. **Text evidence is thin.** The only writing result is an invented creative-writing task with GPT-4 self-scoring plus a small author human preference study. Generic production text quality remains unmeasured.
4. **Tool and repair transfer limits are strong.** ReAct’s action spaces were bounded benchmarks, and repair assumed executable tests on self-contained Python tasks. Neither proves live-agent safety or real repository effectiveness.
5. **Cost is incomplete.** Exact ToT costs are available for two historical GPT-4 tasks, with a source header/prose terminology ambiguity. CoT, ReAct, repair, and context sources do not provide a directly comparable production cost/latency matrix.

## Retained original-inspected source appendix

| Source | Direct original URL | Frozen local evidence and inspected locator | Evidence form and supported finding | Important limitation |
|---|---|---|---|---|
| Wei et al. (2022), Chain-of-Thought | https://arxiv.org/html/2201.11903 | [S1 local](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S1-chain-of-thought.md), §3.1–3.4; Appendix B Tables 1–7; Appendix D | Controlled prompt comparisons across arithmetic, commonsense, symbolic tasks and model scales. Supports conditional large-model, multi-step gains and regressions. | Historical models, manual demonstrations, mostly greedy decoding; final answer/rationale faithfulness not guaranteed. |
| Yu et al. (2023), Tree of Thoughts | https://arxiv.org/html/2305.10601 | [S2 local](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-tree-of-thoughts.md), §§3–4, §6, Appendix B.1–B.3; [cost supplement local](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-cost-tables.md), Table 7/8 raw locators | GPT-4 search/planning experiments, ablations, and token/cost tables. Supports high gain on hard Game of 24 and high cost. | Three constructed/simple task settings; evaluator/pruning can fail; cost/configuration is historical and task-specific. |
| Liu et al. (2024), Lost in the Middle | https://arxiv.org/html/2307.03172 | [S3 local](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S3-lost-in-the-middle.md), §§2.1–2.3, §4.2, §5, Appendices C–D | Controlled document position/length experiments and retrieval case study. Supports position-sensitive context assembly. | Historical model families, NQ/Wikipedia and synthetic KV tasks, greedy decoding. |
| Olausson et al., Self-Repair | https://arxiv.org/html/2306.09896 | [S4 local](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S4-self-repair-silver-bullet.md), §§3–5, Table 1 | Equal-sample-budget repair versus iid sampling, plus feedback-quality study. Supports conditional repair and feedback/diversity controls. | Self-contained Python with executable tests; bootstrapped repair trees; no real-repository proof. |
| Yao et al. (2023), ReAct | https://arxiv.org/html/2210.03629 | [S5 local](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S5-react.md), §§2–4, Tables 1–4, §6 | PaLM-540B prompting on QA/fact verification and interactive benchmarks. Supports conditional grounded tool use and sparse reasoning. | Constrained benchmark action spaces, limited demonstrations, historical inaccessible base model, no unrestricted live-tool evidence. |
