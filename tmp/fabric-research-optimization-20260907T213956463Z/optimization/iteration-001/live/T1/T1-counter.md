# Prompt-technique evidence note

**Status:** partial, fresh primary-source review conducted for the specified research phase. Research date target: **2026-09-07**. This note covers source-unique families needed for actionable selection: explicit CoT, sampled self-consistency, and interleaved reasoning/tool actions. It does not establish a universal ranking or current provider-specific performance.

## Requirement contract

| ID | Exact question | Required inclusions | Expected contribution and decision context |
|---|---|---|---|
| R1 | “Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?” | Original inspected sources, quantitative evidence under original conditions. | Determine which prompting/scaffold variants merit a production experiment. |
| R2 | “What strongest counterevidence, regressions and model/task transfer limits constrain adoption?” | Counterevidence, applicability limits. | Prevent benchmark-derived defaults from becoming blanket production policy. |
| R3 | “What practical selection rules, failure signals and paired local evaluation follow?” | Operational decision table and concrete reusable evaluation artifact. | Choose and validate a prompt/scaffold for production text, reasoning, and tool-using LLMs. |

Source: [local task contract](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/questions/T1.md).

## Findings

| Family | Measured result under original conditions | Applicability and cost condition |
|---|---|---|
| **Few-shot CoT** | [Wei et al., Table 2 / Figure 4](https://arxiv.org/html/2201.11903#S3.T2): PaLM-540B, GSM8K, eight CoT exemplars, achieved **58.1% accuracy** versus **17.9%** standard few-shot prompting, a **+40.2 percentage-point** difference. | Arithmetic, commonsense, and symbolic benchmark prompts. Authors report gains appearing only around **~100B parameters** and smaller models producing fluent but illogical chains. No serving-token, latency, or dollar cost was reported. |
| **Zero-shot CoT instruction** | [Kojima et al., Table 2](https://arxiv.org/html/2205.11916#S3.T2): text-davinci-002 on MultiArith: **78.7%** with “Let’s think step by step” versus **17.7%** zero-shot, **+61.0 pp**. GSM8K: **40.7%** versus **10.4%**, **+30.3 pp**. | A low-prompt-authoring alternative to hand-built demonstrations, but the evidence is benchmark reasoning, not general production prose. Output length and cost are unreported. |
| **Self-consistency** | [Wang et al., §3.2, Table 2](https://arxiv.org/html/2203.11171#S3.T2): PaLM-540B GSM8K, CoT greedy decoding **56.5%** versus self-consistency **74.4%**, **+17.9 pp**. text-davinci-002 GSM8K: **60.1%** to **78.0%**, **+17.9 pp**. | The intervention samples **40 independent outputs per run** then majority-aggregates final answers. Thus inference generation count is up to **40×** the greedy comparator, before aggregation and validation. The paper reports no tokens, latency, tool cost, or dollars. Do not call it economical without local accepted-task cost. |
| **Interleaved reason–act tool scaffold (ReAct)** | [Yao et al., §3.3, Table 1](https://arxiv.org/html/2210.03629#S3.T1): PaLM-540B with a simple Wikipedia API: HotpotQA EM **27.4%** ReAct vs **25.7%** Act and **29.4%** CoT. FEVER accuracy **60.9%** vs **58.9%** Act and **56.3%** CoT. Their switch policies reached **35.1%** HotpotQA EM (ReAct→CoT-SC) and **64.6%** FEVER accuracy (CoT-SC→ReAct). | Tool use is warranted where freshness or external state matters. The tested retriever was deliberately weaker than SOTA retrieval and used 6/3 manually composed exemplars for HotpotQA/FEVER. Tool-call counts, token cost, and dollar cost are not reported. |
| **Interleaved reasoning for long-horizon actions** | [Yao et al., §4, Table 3](https://arxiv.org/html/2210.03629#S4.T3): ALFWorld, best-of-six prompt trials, ReAct **71%** success versus Act **45%** and BUTLER **37%**. WebShop: ReAct **40.0%** success versus Act **30.1%**, IL **29.1%**, IL+RL **28.7%**. | ALFWorld used 134 unseen games and task-specific prompts. “Best of six” is not a production average and must not be compared to a single-prompt run. WebShop is simulated shopping, not authorization-sensitive real commerce. |

## Counterevidence and transfer limits

1. **Explicit CoT can regress on instruction-tuned models.** [Huang et al., §4.1 and Tables 2–3](https://arxiv.org/html/2304.03262#S4.SS1) found ChatGPT’s explicit CoT was worse than no instruction on **four of six** arithmetic datasets and improved only AQuA-RAT by **+0.4 pp**. On CSQA and StrategyQA, trigger-word prompting was best. This is historical ChatGPT evidence, not a claim about current models.

2. **Broader cross-model evidence rejects “CoT helps everything.”** [Sprague et al., §4.2](https://arxiv.org/html/2409.12183#S4.SS2) evaluated 14 models and 13 datasets. With Bonferroni-adjusted **p = 0.00027**, only **59 comparisons (about 32%)** showing a benefit in knowledge, soft-reasoning, and commonsense categories were significant. Nearly half, **26**, were MMLU/MMLU-Pro comparisons, principally math slices. The paper further states that CoT rarely beats tool-augmented methods for the same problems.

3. **Tool scaffolds trade hallucination for execution/search failures.** ReAct’s human review of 200 HotpotQA trajectories reported ReAct’s failure mix as **47% reasoning error**, **23% empty/unhelpful search**, **0% hallucination**, and **29% label ambiguity**, while CoT had **16% reasoning error** and **56% hallucination.** [Table 2](https://arxiv.org/html/2210.03629#S3.T2.fig1). A tool loop needs explicit stop, retry, source-quality, and authorization controls.

4. **No retained study establishes production text-writing quality or total operating cost.** Benchmarks mostly score exact answer accuracy or simulated task success. They do not measure editorial correctness, brand compliance, accepted-task cost, real API latency, retry costs, or security outcomes. These remain unknown.

## Operational selection table

| Task signal | Start with | Escalate when | Failure signal | Do not infer |
|---|---|---|---|---|
| Constrained production text | Direct instruction plus schema, examples only if format errors persist | Add a small task-matched exemplar set | Parse failures, unsupported claims, style violations | CoT benchmark gains imply better prose |
| Multi-step arithmetic, symbolic transformation, or auditable deduction | Direct baseline vs zero-/few-shot CoT | Self-consistency only if the accepted-correctness gain offsets up-to-40 sampled generations | Low answer agreement, wrong deterministic check, token/latency budget breach | A rationale is proof of correctness |
| Fact requiring current or proprietary state | Tool scaffold with grounded observations and deterministic tool schemas | ReAct-like thought/action loop when a single retrieve-then-answer pass misses multi-hop state | Empty retrieval, repeated action, stale source, unsupported final claim | CoT alone can supply current facts |
| Side-effecting tool use | Plan, validate arguments, authorize, execute, then verify final state | Bounded recovery loop only after classifying the error | Unauthorized action, repeated identical tool call, invalid arguments, unverifiable state | Simulated WebShop success transfers to real transactions |

## Reusable paired evaluation artifact

```yaml
name: prompt-technique-screen
unit: one production task instance
arms:
  - direct: {prompt: base, samples: 1, tools: allowed_baseline}
  - cot: {prompt: base_plus_reasoning_instruction, samples: 1, tools: allowed_baseline}
  - few_shot_cot: {prompt: base_plus_fixed_matched_demos, samples: 1, tools: allowed_baseline}
  - self_consistency:
      prompt: chosen_cot_prompt
      samples: [3, 5, 10] # proposed screening ladder, not a universal prescription
      aggregate: normalized_final_answer_majority
  - tool_loop:
      prompt: base_plus_action_schema
      tools: allowlisted
      max_steps: fixed_per_task
      final_state_check: deterministic_or_blinded_review
held_fixed:
  model_snapshot: exact provider/model/version
  system_prompt: exact text
  temperature_and_seed_policy: exact values
  tool_entitlements_and_region: exact values
  context_budget: exact input/output limits
  retry_policy: exact values
record_per_instance:
  - accepted_final_state
  - deterministic_validator_result
  - reviewer_defects_when_needed
  - input_cached_reasoning_output_tokens
  - tool_calls_tool_cost
  - retries
  - wall_latency_ms
  - total_cost_per_accepted_task
decision_rule: >
  Adopt an escalation only when its accepted-final-state improvement on the
  representative held-out slice outweighs its measured total-cost and latency
  increase and does not worsen critical failures. Otherwise retain the simpler arm.
```

Use paired instance-level comparison, randomized arm order where nondeterminism or time-sensitive tools matter, and preserve failed trajectories. The smallest decision-changing first screen is the direct arm against one relevant escalation family, not all families at once.

## Coverage and stop reason

| Requirement | Disposition | Evidence and next check |
|---|---|---|
| R1 — measured effects with conditions and cost where available | **Supported, qualified** | Exact task/model/comparator/results are retained above. Source-measured dollar, token, and latency costs were absent. Next check: run the supplied paired artifact against the target provider and production task slice. |
| R2 — counterevidence, regressions, transfer limits | **Supported** | Retained counterevidence covers model changes, cross-model/task scope, tool-loop failure modes, and benchmark-to-production limits. |
| R3 — selection rules, signals, local evaluation | **Supported, qualified** | Operational table and reusable artifact supplied. Thresholds and sample ladder are proposed screening controls, not empirically universal defaults. |

**Stop reason:** bounded fresh inspection of five primary papers completed. The major unresolved decision variable is target-model and target-workload performance and total accepted-task cost, which literature evidence cannot substitute for.