# Choosing prompt techniques for production LLMs

**Decision date:** 2026-09-07. Use the simplest prompt and scaffold that meets a task-specific acceptance check. The studies below establish large gains on bounded reasoning and simulated tool tasks, but do not establish a universal technique ranking, production prose quality, real-transaction safety, or total accepted-task cost on a current deployed model.

## Evidence-backed analysis

### Few-shot chain-of-thought (CoT)

On GSM8K, [Wei et al.](https://arxiv.org/html/2201.11903) measured PaLM-540B accuracy at **17.9%** with a standard prompt versus **56.9%** with few-shot CoT (**+39.0 percentage points**). The CoT condition used **eight manually authored exemplars** and greedy decoding. This supports testing matched worked examples for multi-step symbolic tasks, not adopting rationales for all text generation. The same paper reports effects emerging around roughly **100B parameters**.

### Zero-shot CoT

[Kojima et al.](https://arxiv.org/html/2205.11916) used greedy, two-stage prompting on `text-davinci-002`: the “Let’s think step by step” rationale call followed by an answer-extraction call changed MultiArith accuracy from **17.7% to 78.7%** and GSM8K from **10.4% to 40.7%**. This is a low-authoring alternative to demonstrations for benchmark reasoning. The source reports neither token, latency, nor total-cost measurements, and the two calls must be included in a local cost and reliability comparison.

### Self-consistency

For PaLM-540B on GSM8K, [Wang et al.](https://arxiv.org/html/2203.11171) measured few-shot-CoT greedy decoding at **56.5%** and self-consistency at **74.4%** (**+17.9 pp**). Their intervention sampled **40 reasoning paths per run**, majority-aggregated final answers, and averaged results over **10 runs**. This is a measured accuracy gain for a fixed-answer reasoning benchmark, not an exact 40× cost claim: path lengths, latency, tool spend, and dollar cost were not reported. The authors suggest that **5 or 10 paths** can capture much of the gain, which is a starting hypothesis to test rather than a production default.

### Bounded search: Tree of Thoughts (ToT)

On [Yao et al.’s Game of 24 evaluation](https://arxiv.org/html/2305.10601v2), GPT-4 success over **100 games** was **4.0%** for CoT, **9.0%** for CoT self-consistency, and **74%** for ToT breadth-first search with breadth 5. Separately, best-of-100 CoT achieved **49%**, so it must not be conflated with the 9.0% CoT-self-consistency condition. ToT used **5.5k completion tokens** in its reported setup. The paper reports **$106 total** for its Game-of-24 and creative-writing main experiments, not a per-case price. Its three relatively simple tasks and stated **5–100×** CoT generated-token range make ToT a specialized, budgeted search option only when candidate states can be evaluated.

### Tool-using prompts: ReAct and hybrids

In [Yao et al.’s ReAct study](https://arxiv.org/html/2210.03629), frozen PaLM-540B with restricted Wikipedia `search`/`lookup` and few-shot trajectories scored HotpotQA EM **27.4** for ReAct, **25.7** for Act, and **29.4** for CoT. On FEVER, accuracy was **60.9** for ReAct, **58.9** for Act, and **56.3** for CoT. The source’s switch policies reached **35.1** HotpotQA EM for ReAct→CoT-SC and **64.6** FEVER accuracy for CoT-SC→ReAct. These conditions used six HotpotQA and three FEVER exemplars.

The same source measured tool-agent environments separately: on **134 unseen ALFWorld games**, ReAct best-of-six was **71%** versus Act best-of-six **45%**. On **500 WebShop test instructions**, ReAct success was **40.0%** versus Act **30.1%**. Best-of-six selection and simulated environments prevent interpreting these as single-run production-agent performance or evidence for real commerce.

### Prompt ordering and long context

Across **21 decoder-only models** and LogiQA, SciQ, RACE-M, and RACE-H, [Lost in the Prompt Order](https://arxiv.org/html/2601.14152v2) measured question-option-context ordering (QOC) at **54.54%** and repeated options at **62.76%** (**+8.22 pp**). In a separate generative-scoring block, CoT reduced the context-question-option versus QOC ordering gap from **14.72 pp to 7.47 pp**. Absolute scores across those blocks are not comparable because the upper block uses logit scoring.

[Lost in the Middle](https://arxiv.org/html/2307.03172) independently establishes position sensitivity in multi-document QA, including GPT-3.5-Turbo closed-book accuracy of **56.1%** and tested contexts of **10, 20, and 30 documents**. The retained evidence does not support a precise oracle-context value or a precise middle-position decrement. Treat prompt ordering, repetition, retrieval, and reranking as paired local interventions, not proof that nominal context length yields uniform use of context.

## Disagreements, regressions, and transfer limits

- **CoT can regress.** [Wei et al.](https://arxiv.org/html/2201.11903) report LaMDA-137B AQuA **25.5% → 20.6%**, LaMDA-420M GSM8K **2.6% → 0.4%**, and GPT-3 175B MAWPS SingleOp **90.9% → 88.8%** under CoT. Do not apply it to easy tasks or smaller models without a direct comparison.
- **Zero-shot phrasing and output handling matter.** [Kojima et al.](https://arxiv.org/html/2205.11916) report no CommonsenseQA gain and multiple-choice parsing/ambiguity failures. A plausible rationale is not proof of a parseable or correct answer.
- **Self-consistency has a structural limit.** [Wang et al.](https://arxiv.org/html/2203.11171) assume an aggregable fixed answer set, and wrong rationales can still win aggregation. Use it only with a final-answer validator and a bounded sampled-path budget.
- **Tool grounding exchanges failure modes.** In ReAct’s HotpotQA failure review, [Yao et al.](https://arxiv.org/html/2210.03629) classified failures as **47% reasoning error**, **23% empty/unhelpful search**, **0% hallucination**, and **29% label ambiguity**. The loop therefore needs an action cap, duplicate-action detection, source-quality checks, authorization boundaries, and final-state validation.
- **Cross-model transfer is limited.** Across 14 models and 13 knowledge, soft-reasoning, and commonsense datasets, [Sprague et al.](https://arxiv.org/html/2409.12183) found only **59** beneficial comparisons, about **32%**, significant at Bonferroni-adjusted **p = 0.00027**. **26** were MMLU/MMLU-Pro comparisons, mainly math slices. This does not establish performance on 2026 production snapshots.
- **Instruction-tuned models are not exempt.** [Huang et al.](https://arxiv.org/html/2304.03262) found explicit CoT worse than no instruction on **four of six** arithmetic datasets for the evaluated ChatGPT, with only **+0.4 pp** on AQuA-RAT. This is model- and period-specific counterevidence, not a claim about every current instruction-tuned model.
- **Production gaps remain material.** None of the retained studies measures editorial correctness, brand compliance, security outcomes, real API latency, retries, or total cost per accepted production task. Benchmark accuracy and simulated success do not fill these gaps.

## Recommendations

### Selection rules

| Task signal | Start with | Escalate when | Failure signal | Boundary |
|---|---|---|---|---|
| Constrained production text | Direct instruction plus schema and deterministic format validator | Add a small matched example set only after measured acceptance gain | Parse error, unsupported claim, style violation, or unchanged acceptance | CoT reasoning results do not establish prose-quality gains |
| Arithmetic, symbolic transformation, auditable deduction | Compare direct prompting with zero- or few-shot CoT | Add bounded self-consistency only with final-answer validation | Direct-vs-CoT regression, low answer agreement, failed deterministic check, token/latency breach | A rationale is not a correctness proof |
| Search/planning with reversible states | Direct or retrieve-then-answer baseline | ToT-like search only when branch value can be checked and budget allows | Branch explosion, weak valuation, no gain over best-of-*k* | Game-of-24 success and economics do not transfer automatically |
| Current or proprietary facts | Restricted tool scaffold with grounded observations and action schema | ReAct-like interleaving when single-pass retrieval misses multi-hop state | Empty retrieval, repeated action, stale source, unsupported final claim | CoT alone does not supply current facts |
| Side-effecting tools | Plan, validate arguments, authorize, execute, verify final state | Bounded recovery after error classification | Unauthorized call, duplicate call, invalid arguments, unverifiable state | Simulated WebShop success does not authorize real transactions |
| Long-context QA/decisions | Place decisive evidence near the query or end and test repetition of critical identifiers/options | Add retrieval, reranking, or decomposition after position probes | Answer changes materially when support is shuffled | Context-window size is not uniform retrieval |

### Paired local evaluation

```yaml
name: prompt-technique-screen
unit: one representative production task instance
arms:
  baseline: {prompt: production_prompt_and_scaffold, samples: 1}
  intervention: {one_of: [matched_examples, cot, self_consistency, bounded_search, tool_loop, prompt_order]}
held_fixed:
  - exact provider/model/snapshot
  - system prompt and prompt text except the tested intervention
  - temperature and seed policy
  - input/output context budgets
  - tool entitlements, retrieval corpus, region, and retry policy
  - validator and acceptance definition
procedure:
  - pair baseline and one intervention on each frozen task input
  - randomize arm order when generation or tools are time-sensitive
  - rotate critical support among beginning, middle, and end for long-context tasks
  - retain action-observation traces and failed trajectories for tool tasks
record_per_instance:
  - accepted_final_state
  - deterministic_validator_result_or_blinded_review_defects
  - failure_class
  - input_cached_reasoning_output_tokens
  - tool_calls_and_tool_cost
  - retries
  - wall_latency_ms
  - total_cost_per_accepted_task
adoption_rule: >
  Adopt the intervention only when paired held-out acceptance improves within
  user-set cost and latency budgets and introduces no safety-critical failure
  class. Otherwise retain the baseline or narrow the intervention to the
  stratum where it passed.
```

Screen the direct baseline against one decision-relevant escalation first. The **3, 5, 10** path ladder sometimes used for self-consistency is a proposed screening ladder, not a universal threshold. User-defined acceptance, latency, and cost limits are required before execution.

## Coverage and stop reason

R1 is supported with source-bound task, model, comparator, method, and measured values. It is qualified because most retained CoT, ReAct, and long-context studies omit production-total cost, and precise uninspected long-context oracle/decrement values are intentionally unknown. R2 is supported with direct regressions, model/task transfer limits, and tool-loop diagnostics. R3 is supported as a bounded local-evaluation recommendation, not a universal ranking. Work stops at the evidence boundary: target-model, target-workload, and accepted-task cost must be measured locally.

## Source appendix

| Retained source | Type/date | Method or evidence form and supported claim | Important limitation |
|---|---|---|---|
| [Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/html/2201.11903) | NeurIPS paper, 2022 | Greedy few-shot, manually authored CoT exemplars. Supports GSM8K gain, regressions, and approximate scale limit. | Older models and benchmark reasoning tasks. |
| [Kojima et al., *Large Language Models are Zero-Shot Reasoners*](https://arxiv.org/html/2205.11916) | arXiv paper, 2022 | Greedy two-stage rationale plus answer extraction on `text-davinci-002`. Supports MultiArith/GSM8K gains and output sensitivity. | No production cost/latency and limited task transfer. |
| [Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/html/2203.11171) | ICLR paper, 2023 | 40 sampled paths, majority aggregation, 10-run average. Supports GSM8K gain and sampling conditions. | Fixed-answer aggregation and no reported dollar/latency cost. |
| [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/html/2305.10601v2) | NeurIPS paper, 2023 | GPT-4 Game-of-24 bounded search comparison and token/experiment-total cost reporting. | Three simple tasks, specialized search, no verified per-case USD figure. |
| [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/html/2210.03629) | ICLR paper, 2023 | Frozen PaLM-540B few-shot tool trajectories, simulated agent tasks, and trajectory review. Supports tool/hybrid contrasts and failure mix. | Restricted tools, best-of-six ALFWorld result, and simulated environments. |
| [Sprague et al., *To CoT or not to CoT? Chain-of-thought helps mainly on math and symbolic reasoning*](https://arxiv.org/html/2409.12183) | arXiv paper, 2024 | Cross-model, cross-dataset significance analysis. Supports limited significant CoT benefits. | Does not measure 2026 production systems. |
| [Huang et al., *Large Language Models Can Self-Improve*](https://arxiv.org/html/2304.03262) | arXiv paper, 2023 | Explicit-CoT versus no-instruction comparisons on arithmetic and QA tasks. Supports evaluated-ChatGPT regressions. | Historical model-specific result. |
| [*Lost in the Prompt Order*](https://arxiv.org/html/2601.14152v2) | ACL Findings paper, 2026 | Controlled ordering and option-repetition comparisons across 21 decoder-only models. Supports ordering intervention and scoring-method qualification. | Logit- and generative-scoring blocks are not absolute-score comparable. |
| [Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/html/2307.03172) | TACL paper, 2024 | Controlled multi-document QA varying relevant-document position. Supports position sensitivity and tested context counts. | Retained evidence does not establish precise oracle or middle-position decrement values. |
