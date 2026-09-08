# Production prompt-technique selection guide

**Scope and research date.** This guide assesses technical prompting and scaffold/context boundaries for text, reasoning, and tool-using LLMs from six frozen primary-source snapshots, inspected 2026-09-08. It does not establish performance for any current production model, unstated tool, workload, or image/video prompting. Measurements below retain their original model, task, comparator, and conditions.

## Executive answer

There is no corpus-supported universal prompt ranking. Start with a direct, compact task prompt for ordinary text generation. For multi-step reasoning, test few-shot **chain-of-thought (CoT)** against the direct baseline on the deployed model and task. Escalate to **Tree of Thoughts (ToT)** only where branching, reversible search, and a task-valid state evaluator are worth materially higher cost. For tool use, use an interleaved **ReAct**-style thought/action/observation scaffold only with bounded actions and observable outcomes. Treat long context as a retrieval-and-prompt-layout problem, not as a capacity guarantee. Use execution feedback to repair code only when paired evaluation shows it beats independent resampling at equal budget.

These are conditional operational recommendations, not measured production claims. The decisive evidence is task-specific: CoT helped sufficiently large 2022-era models on arithmetic benchmarks but regressed on smaller models and one AQuA condition; ToT dominated a constrained GPT-4 Game of 24 experiment but consumed more tokens and dollars; ReAct improved controlled tool benchmarks but had retrieval and looping failures; and self-repair often did not beat equal-budget sampling.

## Operational decision table

| Situation | Choose first | Measured evidence under original conditions | Failure signal | Operational control and local decision rule |
|---|---|---|---|---|
| Ordinary text generation or simple extraction | Direct instruction/input-output prompt | This corpus supplies no direct text-quality comparison establishing that a reasoning scaffold improves general production writing. ToT’s creative-writing result is a narrow constructed constraint task. | More tokens or latency without a task-quality gain. | Keep context minimal and evaluate direct prompting before adding a scaffold. Do not infer a text-wide ranking from reasoning studies. |
| Multi-step arithmetic, symbolic, or commonsense reasoning | Few-shot CoT, after direct baseline | With PaLM-540B on GSM8K, 8 CoT exemplars scored 56.9% versus 17.9% standard prompting (+39.0 points). With GPT-3 175B it was 46.9% versus 15.6% (+31.3). | Fluent but illogical intermediate steps, or weak/small-model regression. | Require final-answer scoring plus error review. Use CoT only if it improves the deployed-model score at a stated token/latency ceiling. |
| Search/planning with reversible intermediate choices | ToT/BFS or DFS, only after CoT baseline | GPT-4 Game of 24: 74% ToT breadth 5 versus 4.0% CoT and 9.0% CoT self-consistency, on 100 hard games. | State evaluator wrongly prunes viable branches, search cost exceeds benefit, or task is already solved by direct/CoT. | Define state, candidate generation, evaluator, breadth/depth, timeout, and a valid terminal checker. Compare at equal money/tokens, not just success. |
| Tool-using QA, verification, or interactive environment | ReAct-style interleaved reasoning, action, observation | PaLM-540B on HotpotQA: ReAct 27.4 EM versus Act 25.7 and CoT 29.4. On FEVER: 60.9% versus Act 58.9 and CoT 56.3. | Repeated thought/action loops, non-informative retrieval, unsafe or unbounded action. | Constrain action schema and permissions, log observations and terminal outcome, cap steps, and fail closed on malformed actions. Escalate/retrieve differently when observation is uninformative. |
| Large retrieved context | Retrieval selection, reranking, and position sweep before longer prompts | Multi-document QA showed U-shaped positional performance: relevant material at start/end outperformed middle. Adding >20 retrieved documents improved GPT-3.5-Turbo about 1.5% and Claude-1.3 about 1% in one NaturalQuestions-Open case study. | Answer-bearing evidence is in the middle, accuracy stalls as documents grow, or input cost rises. | Evaluate answer position and document count separately. Rerank/truncate and place query before and after data only where its own evaluation helps. |
| Code with executable tests and a failed candidate | Diverse initial samples plus at most a measured repair branch | Equal-budget self-repair was often modest, absent, or worse than i.i.d. sampling. GPT-4 on APPS: 10 initial plus one repair each (up to 20 samples) was 1.05× pass@20, while 2 initial plus 10 repairs each (up to 22) was 0.97× pass@22. | Repeated repairs from a weak candidate, inaccurate feedback, incomplete/nonrepresentative tests. | Execute tests, retain error output, allocate budget first to diverse roots, and compare repair versus independent samples at equal total tokens/program samples. |

## Measured evidence and boundaries

### 1. CoT: large gains in specific reasoning settings, not a scale-free rule

CoT here means few-shot exemplars containing input, intermediate natural-language reasoning, and output, compared with few-shot input-output exemplars. The study used greedy decoding, mostly one exemplar order, and eight manually composed exemplars (four AQuA exemplars). Its evidence is arithmetic, commonsense, and symbolic benchmarks, not current-production parity.

On five arithmetic datasets, the strongest tabulated comparisons are [Wei et al.’s primary source](https://arxiv.org/html/2201.11903): PaLM-540B standard/CoT accuracy was GSM8K 17.9/56.9, SVAMP 69.4/79.0, ASDiv 72.1/73.9, AQuA 25.2/35.8, and MAWPS 79.2/93.3. GPT-3 175B was 15.6/46.9, 65.7/68.9, 70.3/71.3, 24.8/35.8, and 72.7/87.1 respectively. Codex was 19.7/63.1 on GSM8K and 78.7/92.6 on MAWPS. These comparisons belong to the named models, benchmarks, prompts, and greedy decoding.

**Counterevidence and controls.** CoT was described as emerging only around roughly 100B parameters. In the same table, LaMDA 420M GSM8K fell from 2.6% standard to 0.4% CoT, and its AQuA score fell 23.5% to 8.3%; LaMDA 137B AQuA fell 25.5% to 20.6%. The paper reports low or negative benefit on easy one-step MAWPS subsets. Its ablation found “variable compute only” (dots) and reasoning placed after the answer about baseline, so extra output length alone was not established as the cause. Equation-only prompting helped easier one/two-step problems but not much on GSM8K. External calculator post-processing raised some CoT scores, for example PaLM-540B GSM8K 56.9% to 58.6%, but that is a different system, not a pure prompt comparison.

**Selection rule.** Use CoT only for genuinely multi-step tasks after a same-model direct-prompt baseline. Preserve a machine-checkable final answer where possible. A coherent rationale is not itself proof of correctness: of 50 LaMDA-137B GSM8K wrong answers reviewed, 46% had near-correct chains with minor errors and 54% had major semantic/coherence errors.

### 2. ToT: search can win on constrained planning, at substantial and task-shaped cost

ToT explicitly decomposes a solution into thought states, generates alternatives, uses the LM as a value/vote evaluator, then runs BFS or DFS with pruning/backtracking. The primary experiments used GPT-4 chat completions at temperature 0.7 during 5–16 May 2023. This is a scaffolded search algorithm, not merely a request to “think more.”

For 100 hard Game of 24 instances (indices 901–1,000 from a scraped collection), success meant a valid equation using each input exactly once. The prompt had five IO examples; CoT added three intermediate equations; IO and CoT were sampled 100 times per game. IO averaged 7.3%, CoT 4.0%, CoT self-consistency 9.0%, ToT breadth 1 45%, and ToT breadth 5 74%. Best-of-100 CoT reached 49%, still below the reported ToT result. ToT used three equation steps, breadth 5, 33 value samples per thought, and heuristic labels sure/maybe/impossible.

Cost must remain with this experiment: Table 7 reports IO best-of-100 at 1.8k/1.0k generate/prompt tokens, $0.13 per case, 33%; CoT best-of-100 6.7k/2.2k, $0.47, 49%; ToT 5.5k/1.4k, $0.74, 74%. The source calls the 5.5k figure completion tokens while the header says `Generate/Prompt tokens`; preserve that format ambiguity. On its constructed creative-writing task, ToT’s GPT-4 judged coherence was 7.56 versus IO 6.19 and CoT 6.93, while iterative refinement from IO reached 7.67. Human pairwise judgments preferred ToT over CoT 41/100, preferred CoT 21/100, and tied 38/100. Table 8 reports IO 0.9k/0.4k and $0.06, CoT 0.9k/0.4k and $0.07, and ToT 4k/2.9k and $0.32 per case.

**Counterevidence and controls.** The authors say deliberate search may be unnecessary where GPT-4 already excels, examine only three simple challenge tasks, and report cost dependent on prompt and search, potentially 5–100× CoT generated tokens. In mini crosswords, evaluator pruning could reject correct states because of rare/obsolete words; removing pruning sometimes found answers the heuristic failed to output. Make a terminal validator authoritative where available. Do not transfer Game of 24’s 74% to generic reasoning, coding, or production text.

### 3. Context placement is an input-boundary control, not a prompting technique to rank against CoT

[Liu et al.](https://arxiv.org/html/2307.03172) varied context length and the answer-bearing document’s location in multi-document NaturalQuestions-Open QA. Each context had exactly one answer document and retrieved distractors. Tested models included MPT-30B-Instruct, LongChat-13B (16K), GPT-3.5-Turbo/16K, and Claude-1.3/100K, with greedy decoding. Performance was commonly highest at the beginning or end and degraded in the middle. In 20- and 30-document settings, GPT-3.5-Turbo’s worst case was below its 56.1% closed-book result. Extended-context counterparts were nearly identical where both fit the context window.

The synthetic key-value result is not equivalent to QA: query-aware contextualization (query before and after data) produced near-perfect retrieval, including GPT-3.5-Turbo 16K at 300 pairs, versus a 45.6% worst case without it. That intervention minimally improved multi-document QA and slightly decreased other positions. Therefore, do not generalize a key-value fix to document reasoning. The study’s practical implication is a local sweep over document count and answer position, plus reranking/truncation, while measuring accuracy, latency, and input cost.

### 4. ReAct: controlled benefits from grounding, with retrieval and prompting limits

ReAct augments task actions with free-form thoughts and interleaves thought, action, and observation. In knowledge tasks, PaLM-540B used 6 HotpotQA or 3 FEVER manually composed trajectories and a deliberately limited Wikipedia API (search, lookup, finish), not unrestricted web tools. Table 1 results were: Standard 28.7 EM/57.1% accuracy, CoT 29.4/56.3, CoT self-consistency (21 samples, temperature 0.7) 33.4/60.4, Act 25.7/58.9, ReAct 27.4/60.9, CoT-SC→ReAct 34.2/64.6, and ReAct→CoT-SC 35.1/62.0 for HotpotQA/FEVER. The combined policies have their own fallbacks and cannot be treated as standalone ReAct scores.

The study’s human review of 50 HotpotQA trajectories distinguishes the trade-off: ReAct success false positives were 6% versus CoT’s 14%, and ReAct had no hallucination category among failures versus CoT’s 56%. But ReAct had 47% reasoning errors versus CoT’s 16%, including repetitive thought/action loops, and non-informative search was 23% of ReAct error cases. Grounding is therefore useful only if observations are informative and the agent can recover.

For interactive benchmarks, ALFWorld used 134 unseen games, six prompt permutations from three annotated trajectories per task type, and greedy decoding. Best-of-six ReAct averaged 71% success versus Act 45% and BUTLER 37%; ReAct-IM best-of-six was 53%. On WebShop’s 500 test instructions, ReAct score/success was 66.6/40.0 versus Act 62.3/30.1, IL 59.9/29.1, and IL+RL 62.4/28.7; human score/success was 82.1/59.6. These controlled environments do not prove reliability for open production tools. The authors also note that large action spaces need more demonstrations and can exceed in-context limits.

### 5. Self-repair: feedback quality and budget allocation are decision-critical

The self-repair study evaluates self-contained Python HumanEval and APPS tasks with executable test suites, CodeLlama-13B-Instruct, frozen GPT-3.5-Turbo-0301, and GPT-4-0314, one-shot templated prompts, temperature 0.8. It compares repair trees against i.i.d. sampling at the same number of program samples, and repeats token-based accounting in an appendix with the same broad trends. APPS is a random 300-task subset. These constraints matter: full executable tests and self-contained specifications differ from ordinary software work.

At equal budget, self-repair was often modest, absent, or inferior, particularly at small budgets. On APPS, GPT-4 gains reached 8% over baseline, while GPT-3.5 gained only at large numbers of initial samples. Hard APPS competition problems showed GPT-3.5 gains up to 34% relative to baseline, but that subset result does not settle aggregate performance. The actionable pattern was robust: increasing diverse initial programs at fixed repairs helped, while adding repair samples at fixed roots was often not worth the cost. The explicit example is 10 initial samples plus one repair each, up to 20 programs, at 1.05× pass@20, versus two initials plus ten repairs each, up to 22 programs, at 0.97× pass@22.

Feedback is the bottleneck rather than a reason to assume autonomous repair works. Replacing weak-model feedback with stronger-model feedback beat corresponding self-repair and i.i.d. configurations in the reported configurations. In a 40-failing-program human-feedback study, GPT-4 repair success was 52.6% with human feedback versus 33.3% with GPT-4 feedback (1.58×). Human feedback time was not measured, so this is evidence on feedback quality, not economic superiority of human review.

## Paired local-evaluation artifact

Run this same paired harness before adoption. It is a proposed operational control, not a reported corpus measurement.

```text
Artifact: prompt-technique-paired-eval.csv
Unit: fixed task item × fixed model/version × fixed tool/context snapshot × seed
Columns:
  item_id, task_class, model_version, prompt_or_scaffold_id,
  input_tokens, output_tokens, tool_calls, wall_time_ms, monetary_cost,
  terminal_metric, validator_result, failure_code, evidence_position,
  trace_or_action_log_ref
Arms:
  A direct baseline
  B CoT (same task inputs)
  C ToT only for branchable tasks, with stated breadth/depth/evaluator
  D ReAct only for bounded tools, with stated action set and step cap
  E independent code samples
  F code samples plus execute-feedback-repair
Decision:
  Pre-register terminal metric and budget. Pair results by item and seed.
  Report mean/median score, pass rate where applicable, worst-position score,
  p50/p95 latency, tokens, tool calls, and cost. Adopt an arm only if it
  clears the baseline under the same budget and has no unacceptable failure
  category. Keep failures stratified: wrong answer, invalid action, loop,
  bad retrieval, evaluator mis-prune, and bad repair feedback.
```

For long context, repeat every arm with answer-bearing evidence at start, middle, and end and with the planned document counts. For repair, make E and F equal in total sampled programs and, separately, total tokens. For tools, replay against a frozen tool-response set before any broader deployment. A result that changes only one task, model, evaluator, or budget remains conditional on that setting.

## Unresolved questions and why this investigation ends

The frozen sources do not provide a shared production workload, current model versions, confidence intervals for all comparisons, consistent price/latency accounting, adversarial tool-safety evaluation, or a common metric across text, reasoning, and tool tasks. They also do not establish how these methods compose on one model. These gaps prevent a universal selection order and require the paired local evaluation above. Investigation ends here because the scope lock permits only the supplied primary-source snapshots.

## Original-inspected-source appendix

| Source | Direct original URL and local frozen evidence | Source type/date | Method/evidence form | Supports | Important limitation |
|---|---|---|---|---|---|
| Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* | [Original](https://arxiv.org/html/2201.11903); [local S1](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S1-chain-of-thought.md), §3.1–3.4; Appendix B Tables 1–3 | arXiv HTML v6, 2022 | Few-shot standard versus CoT across named LMs and reasoning benchmarks | Large-model arithmetic gains and small-model/easy-task regressions | Historical models, manual exemplars, mostly greedy decoding, benchmark-specific |
| Yu et al., *Tree of Thoughts* | [Original](https://arxiv.org/html/2305.10601); [local S2](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-tree-of-thoughts.md), §4.1–4.3, §6, App. B.3; [local raw cost tables](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-cost-tables.md), Table 7/8 | NeurIPS 2023 | GPT-4 search/vote/value scaffold experiments | ToT success/cost trade-off and evaluator failure modes | Three constructed/challenge tasks, task-specific heuristics, 2023 GPT-4, Table 8 caption/header mismatch and token-header ambiguity |
| Liu et al., *Lost in the Middle* | [Original](https://arxiv.org/html/2307.03172); [local S3](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S3-lost-in-the-middle.md), §2.1–2.3, §3–5 | TACL 2024 | Controlled document count/position and key-value retrieval experiments | Middle-context degradation and limited marginal value of extra retrieval in the case study | Named historical models/tasks; synthetic retrieval is not QA; greedy decoding |
| Olausson et al., *Is Self-Repair a Silver Bullet for Code Generation?* | [Original](https://arxiv.org/html/2306.09896); [local S4](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S4-self-repair-silver-bullet.md), §3.1–3.2, §4.1–4.3, §5–6 | arXiv HTML | Equal-budget repair-tree versus i.i.d. code sampling with executable tests | Diverse roots and higher-quality feedback matter; repair is not uniformly beneficial | Self-contained Python tasks, APPS subset, bootstrapped repair trees, complete tests assumed |
| Yao et al., *ReAct* | [Original](https://arxiv.org/html/2210.03629); [local S5](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S5-react.md), §3.1–3.3 Tables 1–2; §4 Tables 3–4; §6 | ICLR 2023 | Few-shot PaLM-540B prompt comparisons with restricted Wikipedia API and simulated interactive environments | Grounded tool-use benefits and concrete loop/retrieval failure modes | Historical inaccessible base model, limited action environments, not open-web production safety evidence |
