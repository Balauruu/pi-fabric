# Prompt Techniques for Production LLMs

**Scope:** technical prompting and scaffolds for text, reasoning, and tool-using LLMs, as of 2026-09-07. Evidence is primarily 2022–2023 benchmark research on PaLM, GPT-3/4, and related models. It does not establish a universal ranking or current-model production cost-effectiveness.

## Decision summary

Adopt techniques only for task slices matching their measured conditions and with a local final-state evaluator.

- **Closed-answer reasoning:** test few-shot CoT first. Add self-consistency only if deterministic answer normalization and the multi-sample cost are justified.
- **Constrained text or code:** use iterative refinement only behind deterministic constraint, compiler, test, or other external acceptance checks.
- **Tool tasks:** use ReAct-style traces when final state is inspectable. Add reflection only for observable, locally diagnosable failures.
- **Open-ended quality tasks:** these studies do not establish correctness from agreement, rationale quality, or self-feedback. Use blinded human review or a validated task-specific evaluator.

## Measured effects and boundaries

| Technique | Source-bound measured result | Method, compute, and cost | Adoption boundary |
|---|---|---|---|
| Few-shot CoT | On GSM8K, PaLM-540B with eight manually written CoT exemplars scored **56.9%**, versus **17.9%** with standard few-shot prompting. [Wei et al., Table 2](https://arxiv.org/html/2201.11903) | Greedy decoding. No token, latency, tool, or monetary cost reported. | Gains were reported around roughly 100B+ scale. Smaller models could produce fluent but illogical chains and underperform standard prompting. Easy single-operation MAWPS subsets had small or negative gains. More generated tokens alone were not the supported intervention. |
| Self-consistency | On GSM8K, PaLM-540B scored **74.4% ± 0.1** with majority voting over sampled CoT paths, versus **56.5%** greedy CoT. code-davinci-002 scored **78.0%** versus **60.1%**. [Wang et al., Table 2](https://arxiv.org/html/2203.11171) | Temperature 0.7, **40 sampled paths per run**, averaged over **10 runs**. No token totals, latency, or price. This is a 40-trajectory decoding configuration, not a prompt-only substitution. | Requires a normalizable answer and reliable aggregation. On UL2-20B, four-letter concatenation was **0.0 → 0.0** and Coinflip **50.4 → 50.5**. Agreement is not a correctness oracle. |
| Self-Refine | GPT-4 constrained-generation coverage with 20–30 required concepts increased **15.0% → 45.0%**. GPT-4 code optimization increased **27.3% → 36.0%** optimized programs. [Madaan et al., Table 1](https://arxiv.org/html/2303.17651) | Up to **four** feedback/refinement iterations, retaining prior output and feedback in context. No total token, latency, or monetary accounting. | GPT-4 math changed only **92.9% → 93.1%**. Self-feedback said “everything looks good” for **94%** of math instances. Vicuna-13B showed feedback-format, repetition, and hallucinated-conversation failures. Use an external deterministic validator for correctness-critical work. |
| ReAct | On HotpotQA with a restricted Wikipedia API and PaLM-540B, ReAct achieved **27.4 EM**, versus **25.7** action-only and **29.4** CoT. ReAct→CoT self-consistency fallback reached **35.1 EM**. In ALFWorld, ReAct’s best prompt achieved **71%** task success, versus **45%** action-only and **37%** BUTLER. [Yao et al., Tables 1–2](https://arxiv.org/html/2210.03629) | HotpotQA backoff used seven ReAct steps and FEVER used five because additional steps did not help. ALFWorld used 134 unseen games and six prompt permutations. No token, latency, tool-cost, or dollar accounting. | ReAct lost to CoT on HotpotQA. In reviewed incorrect HotpotQA traces, **47%** had reasoning errors and **23%** had unhelpful or empty retrieval. Environment completion, not transcript plausibility, was the meaningful ALFWorld signal. |
| Reflexion | ReAct + Reflexion completed **130/134** ALFWorld tasks over **12** trials, an absolute 22-point gain over the cited strong baseline. [Shinn et al., Fig. 3](https://arxiv.org/html/2303.11366) | At most three retained reflections. Reflection triggered after repeated identical action/response for more than three cycles or an overlong trajectory. No accepted-task token, tool, latency, or monetary cost. | ReAct-only plateaued around trials six to seven with a reported **22%** hallucination rate. On 100 WebShop environments, four trials produced no significant improvement over ReAct and unhelpful reflections. Reflection is not a default recovery strategy for exploration-heavy tasks. |

## Counterevidence and transfer limits

1. **Model and task transfer is unproven.** The measurements are from historical model snapshots and benchmark distributions. They do not measure current production models, proprietary tool stacks, or a specific organization’s task mix.

2. **Extra inference is an unpriced input.** Self-consistency’s 40 paths, Self-Refine’s iterations, ReAct’s action-observation turns, and Reflexion’s retries all add inference or tool work. None of the retained studies reports total cost per accepted task, including input, output, reasoning, retries, tools, verification, and latency.

3. **Self-generated assessment is insufficient.** Self-Refine’s weak math improvement and false-positive self-feedback show that model critique is not an acceptance criterion. Reflexion’s WebShop result similarly limits retry-based recovery where exploration, rather than localized repair, is required.

4. **Tool traces are not outcomes.** ReAct and Reflexion evidence is strongest where an environment reports completion. For production agents, inspect final backend state, artifact validity, and tool-transition validity separately from the narrative trace. [Anthropic, *Demystifying Evals for AI Agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## Operational decision table

| Situation | Provisional choice | Required guardrail | Escalate or stop when |
|---|---|---|---|
| Closed-answer reasoning with deterministic extraction | Compare direct prompting or greedy CoT against fixed-\(k\) self-consistency | Same model, prompt, task set, answer normalizer, and validator for both arms | Low agreement, invalid extraction, regression cases, or cost per accepted answer exceeds budget |
| Constrained text or code with mechanical checks | Self-Refine | Deterministic constraint coverage, compilation, tests, or schema validation controls acceptance. Cap iterations. | The validator fails, refinement repeats output, feedback is malformed, or iteration budget is exhausted |
| Tool retrieval or state-changing work | ReAct-style thought/action/observation trace | Action cap, permission boundary, deterministic final-state check, and fallback path | Empty retrieval, invalid tool transition, repeated action-observation loop, or step cap |
| Observable and repairable failed tool trajectory | Reflexion after a verified failure | Retain a bounded number of reflections and retry only with a trustworthy failure oracle | No predeclared improvement within retry budget, repeated unhelpful reflection, or exploration diversity is required |
| Open-ended text judged by preference | No technique claim from these results alone | Blind human review or a validated task-specific rubric | Generated-draft agreement is the only available signal |

## Reusable paired local evaluation artifact

```yaml
comparison:
  fixed:
    model: "<versioned model ID and provider surface>"
    system_prompt: "<versioned prompt>"
    tools_and_permissions: "<identical>"
    task_bank: "<frozen representative tasks, including regressions>"
    validator: "<deterministic final-state check where possible>"
    max_turns: 12

  arms:
    - id: baseline
      prompt_or_scaffold: "<current direct or single-path approach>"
      sample_paths: 1
      retry_budget: 0
    - id: candidate
      prompt_or_scaffold: "<CoT | self-consistency-k | ReAct | reflection>"
      sample_paths: "<1 or k>"
      retry_budget: "<0 or n>"
      action_cap: "<n, if tools are used>"

per_trial:
  record:
    - final_state_pass
    - validator_result
    - failure_class
    - tool_calls_and_parameters
    - turns
    - input_output_reasoning_tokens
    - tool_cost
    - latency
    - retry_count
    - unsafe_or_invalid_transition

decision:
  primary: "accepted-task final-state pass rate"
  guardrails:
    - "no regression on frozen regression cases"
    - "cost per accepted task within the stated budget"
    - "no unsafe or invalid tool transition"
  change_rule: >
    Adopt only on task slices where the candidate improves accepted-task
    final-state pass rate enough to justify added total cost and latency.
  escalation:
    - "low self-consistency agreement"
    - "empty retrieval"
    - "repeated action-observation loop"
    - "no reflection improvement within retry budget"
```

Use the smallest representative screening set first. Repeat finalists or close comparisons enough to assess decision stability. The artifact proposes no universal threshold or sample size because acceptance-cost and error tolerance are decision-specific.

## Coverage and stop reason

| Requirement | Coverage | Decision consequence |
|---|---|---|
| R1: measured effects, method, comparator, and compute/cost | **Qualified** | Five families retain source-bound task, model, comparator, outcomes, and available repetition/configuration details. Accepted-task tokens, latency, tool costs, and monetary cost are unavailable in every retained academic study, so production cost-effectiveness is unknown. |
| R2: regressions and transfer limits | **Supported, bounded** | Each adopted family has source-specific regression or transfer evidence. It constrains adoption but does not establish behavior on current models or production distributions. |
| R3: selection rules, failure signals, and local evaluation | **Qualified** | The rules and paired artifact preserve observed failure mechanisms and final-state evaluation boundaries. They are an evaluation design, not a measured production result. |

**Stop reason:** retained evidence covers measured outcomes, configuration/repetition where reported, regressions, and final-state signals for tool work. The highest-impact unresolved question is a paired local evaluation on the intended model snapshot, tools, tasks, validator, and accepted-task cost budget.

## Source appendix

| Source | Type and date | Method or evidence form | Supported claim | Important limitation |
|---|---|---|---|---|
| [Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/html/2201.11903) | NeurIPS paper, 2022 | PaLM benchmark comparisons, Table 2 and scale/task ablations | GSM8K CoT result, scale dependence, and easy-task limits | PaLM-era benchmark evaluation, no production cost accounting |
| [Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/html/2203.11171) | ICLR paper, 2023 | Multi-path sampled CoT with majority aggregation, Tables 1–5 | 40-path, 10-run reasoning gains and model/task-dependent failures | Fixed-answer aggregation, no token, latency, or monetary cost |
| [Madaan et al., *Self-Refine: Iterative Refinement with Self-Feedback*](https://arxiv.org/html/2303.17651) | Original paper, 2023 | Iterative feedback/refinement experiments, Tables 1–2 and Figure 4 | Constrained-text and code gains, weak math gain, and self-feedback failures | Some text measures depend on preference or model judging. No total cost accounting |
| [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/html/2210.03629) | Original paper, 2023 | PaLM-540B knowledge-tool and ALFWorld environment experiments | ReAct’s HotpotQA trade-off, ALFWorld completion result, and trajectory failure categories | Historical model and restricted environments. No total tool or inference cost |
| [Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/html/2303.11366) | Original paper, 2023 | Multi-trial ReAct with retained reflections in ALFWorld and WebShop | ALFWorld recovery result, loop trigger, and WebShop non-improvement | Historical GPT-3-era scaffold, unpriced retries, and limited transfer to exploration-heavy work |
| [Anthropic, *Demystifying Evals for AI Agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Engineering guidance, accessed 2026-09-07 | Agent-evaluation design guidance | Final state, tool validity, and operational traces should be measured separately. `pass@k` and consistency-oriented `pass^k` answer different reliability questions. | Guidance, not a controlled comparison of these prompting techniques |