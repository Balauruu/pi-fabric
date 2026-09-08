# Production prompt-technique selection

**Research date:** 2026-09-07  
**Decision:** use the least complex prompt or scaffold that wins a pinned, paired local evaluation for the actual task family. The retained evidence supports conditional choices for discrete reasoning and stateful tool tasks. It does not establish a universal ranking, a production-prose benefit, or current-frontier-model effects.

## Scope and evidence status

This guide covers technical prompts and scaffold/context boundaries for production text, reasoning, and tool-using LLMs. A result below is a **measured result** only under its named model, task, prompt, decoding, and evaluator. Recommendations are bounded inferences from those results. Costs absent from the source are unknown, not zero.

## Q1. Measured effects

| Technique | Retained measurement and comparator | What it supports | Cost or limit |
|---|---|---|---|
| Few-shot CoT | On GSM8K, PaLM-540B with greedy decoding and eight hand-written CoT exemplars solved **56.9%**, versus **17.9%** for the same few-shot prompt with direct-answer exemplars, a **+39.0-point** difference ([Wei et al.](https://arxiv.org/html/2201.11903)). | Reasoning-bearing demonstrations can help hard arithmetic at this scale. | No token or price total reported. The same paper found no positive effect in smaller models and negative or very small gains on easy MAWPS subsets. |
| Zero-shot CoT | With `text-davinci-002`, appending “Let’s think step by step” and extracting the answer raised MultiArith from **17.7% to 78.7%** and GSM8K from **10.4% to 40.7%**, versus direct zero-shot answers ([Kojima et al.](https://arxiv.org/html/2205.11916)). | A minimal reasoning cue can change arithmetic performance. | One generation per reported comparison, but token and currency cost were not reported. No improvement on that paper’s commonsense tasks, and small models did not benefit. |
| Self-consistency | On GSM8K, `code-davinci-002` few-shot CoT with modal aggregation of sampled paths reached **78.0%**, versus **60.1%** greedy CoT ([Wang et al.](https://arxiv.org/html/2203.11171)). | Sampling and aggregating discrete answers can improve this reasoning task. | **40 independent outputs** per run, not one. No total token or dollar cost reported. |
| ReAct | With PaLM-540B, sparse thought/action trajectories and two demonstrations, best-of-six prompt permutations on **134 unseen ALFWorld** games gave **71%** success, versus **45%** for matched action-only trajectories. One-shot WebShop was **40.0% vs 30.1%** ([Yao et al.](https://arxiv.org/html/2210.03629)). | Interleaving observations with action planning can help in these stateful environments. | Trajectory length, tool cost, and latency were not reported. It was not uniformly best on Wikipedia-backed QA: HotpotQA EM was **27.4% ReAct**, **29.4% CoT**, and **33.4% CoT-self-consistency**. |
| Tree of Thoughts | On 100 hard Game-of-24 instances, GPT-4 temperature 0.7 with breadth-5 search/backtracking achieved **74%**, versus **4%** single CoT and **49%** best-of-100 CoT ([Yao et al.](https://arxiv.org/html/2305.10601)). | Explicit search can outperform single-path and large best-of sampling on this planning puzzle. | ToT used **5.5k completion + 1.4k prompt tokens** and **$0.74/case**. Best-of-100 CoT used **6.7k + 2.2k** and **$0.47/case**. GPT-3.5 ToT was **19%**, and the paper reports a possible **5–100×** CoT generation-token requirement depending on configuration. |

These are separate measurement units, not a common leaderboard. They differ in task, model, decoding, prompt, environment, search budget, and metric. None measures production prose quality, real-web reliability, current-model performance, ReAct token cost, or safety against adversarial tool output.

## Q2. Counterevidence, regressions, and transfer limits

**Few-shot stability.** Demonstration order is a material configuration variable. On SST-2 with four demonstrations and GPT-3 2.7B, changing only their permutation moved accuracy from **54.3% to 93.4%**. Reversing two examples moved it from **88.5% to 51.3%**. Content-free contextual calibration improved average and worst-case accuracy by up to **30.0 absolute points** ([Zhao et al.](https://arxiv.org/html/2102.09690v2)). A prompt therefore has no stable deployment claim until exemplar set, order, label tokens, and format survive perturbation testing on the pinned model.

**CoT is not a faithful audit trail.** Replacing valid few-shot rationales with invalid ones produced only limited answer degradation in a greedy, temperature-0 test on 800 GSM8K examples and all 125 Bamboogle examples. For example, `text-davinci-003` moved from **54.5 to 51.5** GSM8K accuracy and **59.5 to 56.4** Bamboogle F1, while Flan-PaLM moved from **63.8 to 64.4** and **56.9 to 52.8** ([Turpin et al., rationale study](https://arxiv.org/html/2212.10001v2)). Tested models retained over 90% of CoT performance under intrinsic rationale metrics with invalid demonstrations. Do not authorize tools, grade answers, or explain incidents solely from emitted rationale text. A bounded alternative, not a universal replacement, is symbolic translation plus deterministic solving: it improved relative accuracy over standard CoT on 9 of 10 tested benchmarks, including **+6.3%** math-word problems and **+21.4%** relational inference ([Faithful CoT](https://arxiv.org/abs/2301.13379)).

**Self-consistency has a steep and task-bounded trade-off.** The retained protocol averages 10 runs of 40 paths. PaLM-540B GSM8K rose **56.5% to 74.4%**, but ARC-E moved only **95.3% to 96.4%** and GPT-3 Coinflip **99.0% to 99.5%** ([Wang et al.](https://arxiv.org/html/2203.11171)). The authors limit direct use to problems with a fixed answer set. Open text needs a sound equivalence rule. Their PaLM jobs took **2–12 hours per task**, and GPT-3 used 128 generated tokens per sample.

**More context can regress retrieval.** With identical relevant evidence moved across contexts, GPT-3.5-Turbo multi-document QA dropped by over **20 points** by evidence position. Its worst-case 20/30-document score was **56.1%**, below closed-book performance. GPT-3.5-Turbo-16K’s worst-case synthetic key-value retrieval was **45.6%** without query-aware contextualization, while it was perfect at 300 pairs with contextualization ([Liu et al.](https://arxiv.org/html/2307.03172v3)). Adding documents beyond 20 delivered only roughly **+1.5%** for GPT-3.5-Turbo and **+1%** for Claude-1.3. Capacity is not demonstrated use: test position, distractors, length, and ordering separately.

**Tool prompting is not an authorization boundary.** Across 97 tasks and 629 security cases in four stateful domains, AgentDojo measured Claude 3.5 Sonnet benign utility at **78.22%**, utility under attack at **51.19%**, and targeted attack success at **33.86%**. GPT-4o was **69.00%**, **50.08%**, and **47.69%**, respectively ([Debenedetti et al.](https://arxiv.org/html/2406.13352v3)). A BERT injection detector reduced GPT-4o targeted attack success to **7.95%** but benign utility to **41.49%**. Tool filtering reached **6.84%** targeted attack success, yet failed where task-required tools were attack-sufficient, **17%** of cases. Use external capability limits and side-effect controls, then measure both task completion and attack success.

A separate paired bias result reinforces the faithfulness limit: GPT-3.5 zero-shot CoT under a “Suggested Answer” bias fell from **59.6%** unbiased to **23.3%** biased, a **−36.3-point** difference, while explanations did not reveal the bias ([Turpin et al., unfaithful explanations](https://arxiv.org/html/2305.04388v2)).

## Q3. Selection rules, failure signals, and local evaluation

| Workload | Start | Escalate only if paired evidence shows | Do not conclude |
|---|---|---|---|
| Bounded transformation or extraction | Direct instruction and explicit output schema | Better validity or quality on representative cases | Verbose reasoning improves prose quality. |
| Discrete, independently scorable reasoning | CoT baseline | A 5-then-10-path sample sweep earns its token and latency cost | The rationale is faithful or 40 samples are universally needed. |
| Stateful tool work with decision-relevant observations | Thought → action → observation with state and goal checks | A thoughts-removed, same-case/same-tool control loses state or subgoals | Benchmark success transfers to live tools. |
| High-risk or adversarial input | Verifiable final-state checks and external capability controls | Counterfactual variants expose no material regression and safety metrics pass | Delimiters or plausible rationales are authorization. |

**Failure signals:** retain the simpler baseline when the bootstrap CI for paired candidate-minus-baseline primary score includes zero. Escalate investigation for prompt-order or paraphrase instability, rationale/answer mismatch after hidden or biasing-input changes, repeated or unchanged tool calls, invalid actions, omitted constraints, actions after a terminal observation, or fixture gaps around authentication, malformed results, rate limits, stale state, and destructive actions.

### Reusable paired local evaluation artifact

```yaml
artifact: prompt-technique-paired-eval/v1
model: {provider: "<provider>", model_id: "<pinned-version>", decoding: {temperature: 0, max_output_tokens: 800}}
treatments:
  - {id: direct, prompt: "{{task}}\nReturn only the requested answer in this schema: {{schema}}"}
  - {id: cot, prompt: "{{task}}\nWork through the problem, then return only the requested answer in this schema: {{schema}}"}
  - {id: self_consistency_5, base_treatment: cot, samples: 5, aggregate: "majority(normalized_final_answer)"}
  - {id: react, prompt: "Goal: {{goal}}\nState: {{initial_state}}\nChoose THOUGHT, ACTION: <tool>(JSON), or FINAL.", tools: "<local read-only fixtures>"}
corpus:
  frozen_jsonl: eval-cases.jsonl
  fields: [id, family, input, expected, schema, risk_tier]
  strata:
    text: "representative transformations, including malformed inputs"
    reasoning: "independently executable or scorable gold-answer cases"
    tool: "deterministic success, stale-state, malformed-result, denied-action fixtures"
design:
  pairing: "every case under every applicable treatment"
  order: "randomized independently per case"
  repeats: 3
  fixed_seed_per_case_repeat: true
  holdout: "no template or threshold tuning on final holdout"
  safety: "fixtures only; destructive operations simulated and logged"
metrics:
  text: [schema_valid_rate, blind_pairwise_preference, factual_error_rate, p95_latency_ms, mean_input_output_tokens]
  reasoning: [exact_or_programmatic_accuracy, invalid_answer_rate, p95_latency_ms, mean_total_tokens]
  tool: [task_success_rate, invalid_action_rate, repeated_action_rate, constraint_violation_rate, mean_tool_calls, p95_latency_ms]
decision:
  effect: "paired candidate-minus-direct difference; stratified bootstrap 95% CI over case IDs"
  acceptance:
    - "lower 95% CI > 0 on family primary metric"
    - "no risk-tier regression above the predeclared limit"
    - "added tokens, latency, and tool calls fit production budget"
    - "tool treatment has no terminal or denied-action violation"
  record: [case_id, family, treatment, repeat, score, validity, tokens, latency_ms, tool_calls, failure_code, output_hash]
```

This is a proposed reusable local artifact, not evidence that any fixed threshold, three repeats, or five samples is universally optimal. It holds task set, model version, decoding, fixtures, and baseline fixed; uses final-state validators rather than rationale plausibility; accounts for retries through recorded runs; and changes the choice only when the predeclared acceptance rule is met. For text, blind pairwise preference is the primary metric. For reasoning it is exact or programmatic accuracy. For tools it is final task success, alongside invalid, repeated, terminal, and denied-action failures.

## What to adopt now

Start direct for bounded text. For discrete, checkable reasoning, compare direct, CoT, and a small self-consistency sweep under a pinned model and budget. For stateful tools, test an interleaved prompt against a thoughts-removed control in deterministic fixtures and enforce authorization outside the model. Keep retrieved authoritative material near positions proven effective locally. The highest-impact unknowns are current-model transfer, production prose quality, real tool reliability and total operating cost. The paired evaluation above, including adversarial and stale-state tool cases, is the next measurement that can change these choices.

## Source appendix

| Retained source | Direct URL | Type and relevant date | Evidence form and supported claim | Important limitation |
|---|---|---|---|---|
| Wei et al., *Chain-of-Thought Prompting* | https://arxiv.org/html/2201.11903 | Research paper, 2022 | GSM8K PaLM-540B eight-example CoT versus direct few-shot measurement | Older model and arithmetic benchmarks, no cost total. |
| Kojima et al., *Large Language Models are Zero-Shot Reasoners* | https://arxiv.org/html/2205.11916 | Research paper, 2022 | `text-davinci-002` zero-shot-CoT arithmetic comparison | Not prose quality or commonsense transfer. |
| Wang et al., *Self-Consistency Improves CoT* | https://arxiv.org/html/2203.11171 | Research paper, 2023 | 40-path modal aggregation versus greedy CoT, accuracy and compute conditions | Fixed-answer aggregation boundary, no total price. |
| Yao et al., *ReAct* | https://arxiv.org/html/2210.03629 | Research paper, 2023 | Matched Act/ReAct environment controls and task success | Simulated environments, unreported cost and latency. |
| Yao et al., *Tree of Thoughts* | https://arxiv.org/html/2305.10601 | Research paper, 2023 | Game-of-24 search comparison and token/dollar table | Narrow task, model-sensitive outcome. |
| Zhao et al., *Calibrate Before Use* | https://arxiv.org/html/2102.09690v2 | Research paper, 2021 | Demonstration-order sensitivity and contextual calibration | Classification/retrieval/extraction settings and older models. |
| Turpin et al., *Towards Understanding CoT Prompting* | https://arxiv.org/html/2212.10001v2 | Research paper, 2022 | Invalid-rationale ablation and answer performance | Does not establish every CoT is unfaithful. |
| Lyu et al., *Faithful Chain-of-Thought Reasoning* | https://arxiv.org/abs/2301.13379 | Research paper, 2023 | Symbolic-solver alternative relative improvements | Not shown for arbitrary open-ended text. |
| Liu et al., *Lost in the Middle* | https://arxiv.org/html/2307.03172v3 | Research paper, 2023 | Evidence-position and long-context retrieval regressions | Specific models, context constructions, and QA/retrieval tasks. |
| Debenedetti et al., *AgentDojo* | https://arxiv.org/html/2406.13352v3 | Research paper, 2024 | Benign utility, attack utility, attack success, and defense trade-offs | Stateful benchmark threat model, not every production integration. |
| Turpin et al., *Language Models Don’t Always Say What They Think* | https://arxiv.org/html/2305.04388v2 | Research paper, 2023 | Suggested-answer bias paired result and unfaithful explanations | Specific model, bias intervention, and tasks. |

## Coverage and stop reason

This report retains the repaired streams’ inspected original-source notes and all their direct sources. It covers the requested Q1–Q3 categories, not an exhaustive literature review. It stops at the available repaired evidence. Unmeasured transfer to current production models, open-ended prose, live tools, adversarial tool outputs outside the listed benchmark, latency, and complete operating cost remain unknown and require the local paired evaluation above.