# Measured Prompting and Scaffold Evidence Note

**Decision scope:** production text, reasoning, and tool-using LLM systems. **Research date requested:** 2026-09-07. This note retains only the original sources inspected below, dated 2022–2026. Results are source-local, not a universal ranking.

## R1. Primary quantitative contrasts

| Technique | Original task and configuration | Comparator → result | Cost or budget reported | Adoption boundary |
|---|---|---|---|---|
| Few-shot chain-of-thought (CoT) | GSM8K arithmetic word problems, PaLM 540B, eight manually authored CoT exemplars, greedy decoding | Standard prompting **17.9%** accuracy → CoT **56.9%** (+39.0 points). Post-hoc calculator: **58.6%**. | No token, latency, or currency cost reported. | Evidence is for a 540B-era model and benchmark arithmetic, not general prose quality. |
| Self-consistency | GSM8K, 40 sampled CoT paths per run, averaged over 10 runs. PaLM 540B, temperature 0.7. | Greedy CoT **56.5%** → majority-voted self-consistency **74.4%** (+17.9 points). | **40 sampled outputs**, thus materially greater inference work than one greedy output. Authors report gains often saturate with 5–10 paths, but do not provide token or dollar cost. | Use only when answers can be normalized and independently scored or voted. |
| ReAct, reasoning interleaved with actions | HotpotQA, PaLM 540B, six-shot prompt, limited Wikipedia API, exact-match metric | Act-only **25.7 EM**, CoT **29.4**, ReAct **27.4**, CoT self-consistency **33.4**, ReAct→CoT-SC **35.1**. | API/action count and cost not reported. | ReAct alone did not beat CoT on this QA setup. Tool loop needs an observable environment and evaluation of tool errors. |
| ReAct, interactive environments | ALFWorld, PaLM 540B, 134 unseen games, task-specific setup, two annotated trajectories per prompt, six prompt permutations | Act-only best-of-six **45%** success → ReAct best-of-six **71%**. BUTLER best-of-eight **37%**. ReAct average across prompts **57%**. | Prompt-selection budget is six prompts. No token or currency cost. | “Best-of-six” is selection-sensitive and is not a single fixed production prompt result. |
| ReAct, shopping environment | WebShop, PaLM 540B, one-shot prompt, 500 test instructions | Act-only: Score **62.3**, SR **30.1**. ReAct: Score **66.6**, SR **40.0**. Human: Score **82.1**, SR **59.6**. | No token, action, or currency budget reported. | Simulated shopping remains far below human performance. |
| Long-context position management | Multi-document QA, GPT-3.5-Turbo, 10/20/30 documents, answer-bearing passage position varied | Closed-book **56.1%**. Worst cases at 20 or 30 documents fell below it, by **more than 20 percentage points** in some cases. | No token price or latency reported. | Context-window availability is not reliable use of all positions. |
| Long-context retrieval probe | Serialized JSON key-value retrieval, 75/140/300 pairs, 500 examples per condition | Worst case without query-aware contextualization: **45.6%**. GPT-3.5-Turbo 16K with query-aware contextualization: **100%** at 300 pairs. | No cost reported. | Synthetic retrieval does not establish grounded production-answer quality. |
| Toolformer tool use | GPT-J-derived Toolformer, self-supervised tool-use training, QA API; LAMA factual completion, correct word in first five output words | Toolformer-disabled: SQuAD **22.1**, Google-RE **6.3**, T-REx **34.9**. Toolformer: **33.8**, **11.5**, **53.5**. | Up to 25k generated examples/API, 1,024-token sequences, batch 128, ≤2k training steps. Runtime: at most **one API call/input**. | This is **fine-tuning plus a tool policy**, not a prompt-only technique. Do not treat it as evidence that adding tool instructions alone produces these gains. |

## Exact source passages and conditions

### CoT

**Claim:** CoT materially improved one arithmetic benchmark under a large-model, fixed-prompt setup.

- **Source:** Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*, arXiv preprint, 2022. [Original HTML](https://arxiv.org/html/2201.11903)
- **Locator:** §3.1, Appendix B Table 1, Appendix G Table 20.
- **Exact table condition:** “All metrics are accuracy (%). Ext. calc.: post-hoc external calculator for arithmetic computations only.”
- **Table row:** PaLM 540B, standard **17.9**; chain of thought **56.9 (+39.0)**; chain of thought plus external calculator **58.6**.
- **Method passage:** The study uses “eight manually composed few-shot chain-of-thought exemplars” and greedy decoding.
- **Transfer limit:** The paper reports CoT as an emergent scale effect and states smaller models can produce fluent but illogical chains, lowering performance. This does not support assuming CoT improves a smaller, current, or instruction-tuned production model.

### Self-consistency

**Claim:** Majority voting over sampled reasoning traces improved GSM8K accuracy, while multiplying inference work.

- **Source:** Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*, arXiv preprint, 2022. [Original HTML](https://arxiv.org/html/2203.11171)
- **Locator:** §3.2 “Arithmetic Reasoning,” Table 2.
- **Method passage:** “Self-consistency” samples diverse reasoning paths and selects the most consistent final answer.
- **Exact PaLM-540B row:** greedy CoT **56.5%**; self-consistency **74.4% (+17.9)**; temperature **0.7**.
- **Other GSM8K rows, preserving source conditions:** UL2-20B **4.1 → 7.3** at T=0.5, LaMDA-137B **17.1 → 27.7** at T=0.5, code-davinci-001 **14.6 → 23.4** at T=0.7, code-davinci-002 **60.1 → 78.0** at T=0.7.
- **Sampling condition:** 40 sampled outputs per run, averaged over ten runs.
- **Cost limit:** The authors explicitly state self-consistency “incurs more computation cost.” The measured budget is 40 paths, not a published token or price amount.

### ReAct

**Claim:** Action-grounded reasoning can help in interactive environments, but the result varies by task and comparator.

- **Source:** Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*, arXiv preprint, 2022. [Original HTML](https://arxiv.org/html/2210.03629)
- **HotpotQA locator:** §3.3, Table 1. Six-shot PaLM-540B with a simple Wikipedia API. ReAct **27.4 EM** did not exceed CoT **29.4** or CoT-SC **33.4**. The combined ReAct→CoT-SC method reached **35.1**.
- **ALFWorld locator:** §4, Table 3. On 134 unseen games, ReAct best-of-six reached **71%** versus Act best-of-six **45%**. The mean ReAct result was **57%**. This is not a direct fixed-prompt comparison because the reported best result selects among six prompts.
- **WebShop locator:** §4, Table 4. On 500 test instructions, ReAct reached **40.0%** success versus Act **30.1%**, with Scores **66.6** and **62.3** respectively.
- **Source-stated caveats:** The HotpotQA API is “significantly weaker” than state-of-the-art retrievers. Some labels may be outdated. ReAct can make repetitive reasoning/search errors. On WebShop, human score and success remain substantially higher.

### Long-context placement

**Claim:** relevant material placement, not merely inclusion, changes accuracy.

- **Source:** Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*, arXiv preprint, 2023. [Original HTML](https://arxiv.org/html/2307.03172)
- **Locator:** §2.3 Figure 5 and Table 1; §3.2 Figure 7; §4.1 Figure 8; §4.3 Figure 10; Appendix E Figure 16.
- **Exact passage:** performance is “often highest when relevant information occurs at the beginning or end” and “significantly degrades” for information in the middle.
- **Quantitative conditions:** GPT-3.5-Turbo’s closed-book multi-document QA accuracy was **56.1%**. In worst 20- or 30-document placements, performance was lower than closed-book and could drop by **more than 20%**.
- **Mitigation contrast:** query-aware contextualization achieved perfect GPT-3.5-Turbo 16K key-value retrieval at 300 pairs, while the worst uncontextualized condition was **45.6%**.
- **Transfer limit:** This is a position-controlled QA/retrieval study on named 2023 models, not a guarantee for current long-context models or arbitrary document synthesis.

### Toolformer

**Claim:** tools can improve factual completion when the model is trained to invoke and consume them.

- **Source:** Schick et al., *Toolformer: Language Models Can Teach Themselves to Use Tools*, arXiv preprint, 2023. [Original HTML](https://arxiv.org/html/2302.04761)
- **Locator:** §4.1, §4.2.1 Table 3, Appendix B.
- **Exact metric:** LAMA counts a correct answer when the correct word appears “within the first five words predicted.”
- **Exact contrast:** Toolformer vs its disabled-tool version: SQuAD **33.8 vs 22.1**, Google-RE **11.5 vs 6.3**, T-REx **53.5 vs 34.9**.
- **Runtime constraint:** API token can be in the top **k=10** predicted tokens, with at most **one API call per input**.
- **Boundary:** Results include synthetic data generation and fine-tuning. They do not measure prompt-only tool calling.

## R2. Strongest counterevidence and failure modes

| Constraint | Evidence | Production implication |
|---|---|---|
| More sampled reasoning is not monotonic | [Inference-scaling faithfulness study](https://arxiv.org/html/2601.06423), §4.2–§5.3, Table 2/4/5: on 100 GSM8K items, GPT-5.2 accuracy went **78% → 90% → 86%** for N=1/5/20 while early-answering faithfulness went **0.540 → 0.510 → 0.499**. Claude Opus 4.5 accuracy went **78% → 74.3% → 74.3%**. | Do not set a fixed large `n` because “more thinking is better.” Test N=1, a small N, and the maximum allowed N under the real acceptance metric. |
| A strong CoT baseline can beat an action scaffold | ReAct HotpotQA: CoT **29.4 EM**, ReAct **27.4 EM**. | Tool orchestration is not free improvement. Separate retrieval quality, action validity, and final-answer quality. |
| Prompt selection can inflate apparent agent results | ReAct ALFWorld reports best-of-six **71%**, average **57%**. | Freeze one prompt before final holdout. Report average and selection protocol, not only the best seed or prompt. |
| Long context can suppress relevant evidence | GPT-3.5-Turbo multi-document QA can fall over 20 points under passage repositioning. | Evaluate first, middle, and last placement. Retrieve, compress, and structure evidence instead of indiscriminately appending context. |
| Reasoning benchmarks do not prove rationale faithfulness | The 2026 study’s metric is an early-answering probe, and the authors limit claims to GSM8K, 100 items, API model variability, and a necessity-style rather than causal faithfulness test. | Treat visible reasoning as an operational trace, not proof that it caused the answer. Verify externally where correctness matters. |
| Toolformer is not prompt-only evidence | Toolformer uses training data generation, fine-tuning, and modified decoding. | Compare a prompt-only tool policy with a trained policy only when the training and runtime budgets are actually available. |

## R3. Selection rules and operational decision table

| Workload and precondition | Start with | Add only if local evidence supports it | Failure signal | Paired local test |
|---|---|---|---|---|
| Bounded structured text transformation | Explicit output schema, constraints, and 0–3 representative examples | More examples only if format adherence or domain terminology fails | Extra examples reduce instruction adherence, exceed context, or increase leakage/copying | Zero/few-shot against same model and decoding settings. Measure schema-valid rate, task rubric score, input/output tokens, p95 latency. |
| Multi-step problem with objectively normalizable answer | CoT baseline with exact answer extraction | Self-consistency at small N, then larger N only if marginal benefit pays for token/latency budget | Vote disagreement, answer-parser failures, no lift over N=1, or increased easy-case regressions | Matched items and seeds at N=1/5/10/20. Measure accuracy, pass rate, disagreement, input/output tokens, wall time, cost. |
| Factual answer requiring changing/private data | Retrieval or narrow tool call with source-bearing final answer | ReAct-like interleaving only when the task demonstrably requires multiple observations/actions | Unsupported citation, failed call, repeated call, stale result, action loop | Compare answer-only RAG, single tool call, and interleaved tool loop. Measure grounded-answer rate, citation correctness, tool-call success, calls/task, cost/task. |
| Stateful or consequential tool use | Typed action schema, allowlist, deterministic validation, bounded steps | Reason/action trace only when it reduces observed action error | Invalid arguments, repeated action, state drift, unverified success | Replay fixed environment episodes. Measure task success, unsafe/invalid-action rate, steps, retries, rollback rate, tokens and time. |
| Long document synthesis or QA | Retrieval, headings, provenance, relevant excerpts near query and final instruction | Query-aware contextualization or compression after position tests | Answer changes when supporting evidence moves, middle-position misses, citation mismatch | Place same evidence first/middle/last at several lengths. Measure answer/citation accuracy by position and token cost. |

## Reusable paired evaluation artifact

```yaml
evaluation:
  name: prompt-technique-decision-gate
  freeze:
    model: "<exact provider/model/version>"
    system_prompt_hash: "<sha256>"
    tool_schema_hash: "<sha256 or none>"
    retrieval_index_version: "<id or none>"
    decoding:
      temperature: 0
      top_p: 1
      max_output_tokens: 1200
    budget:
      max_tool_calls: 3
      max_wall_seconds: 30
      max_total_tokens: 8000

  variants:
    - id: baseline
      prompt: "<production prompt, no new technique>"
    - id: candidate
      technique: "<few-shot|cot|self-consistency|react|context-layout>"
      prompt: "<only the deliberate change>"
      samples: 1
      vote_normalizer: "<exact parser, or none>"

  cases:
    split:
      development: 100
      frozen_holdout: 100
    strata:
      - normal
      - long_input
      - ambiguous
      - adversarial_or_edge
      - tool_failure_or_stale_data
    record_per_case:
      - task_id
      - expected_result_or_rubric
      - source_position
      - tool_state
      - output
      - parsed_answer
      - correctness
      - schema_valid
      - grounded_or_citation_valid
      - tool_calls
      - invalid_actions
      - input_tokens
      - output_tokens
      - latency_ms
      - estimated_cost

  decision:
    primary_metric: "<accuracy|task_success|rubric_score>"
    guardrails:
      - "no increase in invalid or unsafe action rate"
      - "no increase in citation/grounding failure rate"
      - "p95 latency and cost/task remain within product budget"
    report:
      - "paired candidate-minus-baseline result with confidence interval"
      - "per-stratum regressions"
      - "mean and p95 token, latency, tool-call, and cost values"
      - "exact model, prompt, tools, retrieval corpus, and dates"
    promotion_rule: >
      Promote only if the frozen-holdout primary-metric improvement and
      guardrails meet predeclared thresholds. Retain the baseline otherwise.
```

## Unknowns that prevent stronger claims

1. None of the inspected primary studies reports a production dollar cost per correct task under a common pricing scheme.
2. The key CoT and self-consistency results use older, partly unavailable models. Their numeric lifts are not transferable estimates for a current deployed model.
3. ReAct’s results combine prompting, environment interfaces, tool quality, and in some cases prompt selection. They do not isolate a universal “reasoning trace” effect.
4. Toolformer evaluates a trained tool-use policy, so it cannot validate prompt-only tool scaffolds.
5. The counterevidence study is narrowly GSM8K-based and has 100 items. It is decisive against assuming monotonic inference scaling, not against all sampling methods.

## Retained-source appendix

1. **Primary study, 2022:** Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*. Original inspected source: <https://arxiv.org/html/2201.11903>. Key locators: §3.1, Appendix B Table 1, Appendix G Table 20.

2. **Primary study, 2022:** Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*. Original inspected source: <https://arxiv.org/html/2203.11171>. Key locator: §3.2 Table 2.

3. **Primary study, 2022:** Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*. Original inspected source: <https://arxiv.org/html/2210.03629>. Key locators: §3.3 Table 1, §4 Tables 3–4.

4. **Primary study, 2023:** Schick et al., *Toolformer: Language Models Can Teach Themselves to Use Tools*. Original inspected source: <https://arxiv.org/html/2302.04761>. Key locators: §4.1, §4.2.1 Table 3, Appendix B.

5. **Primary study, 2023:** Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*. Original inspected source: <https://arxiv.org/html/2307.03172>. Key locators: §2.3 Figure 5/Table 1, §3.2 Figure 7, §4.1 Figure 8, §4.3 Figure 10, Appendix E Figure 16.

6. **Primary counterevidence study, arXiv identifier 2601.06423:** *Does Inference Scaling Improve Reasoning Faithfulness? A Comprehensive Multi-Model Analysis of Self-Consistency Tradeoffs in Chain-of-Thought Reasoning*. Original inspected source: <https://arxiv.org/html/2601.06423>. Key locators: §3.1–§3.5, §4.2–§4.6, §5.1–§5.3, Tables 2, 4, and 5, Figures 2–4.