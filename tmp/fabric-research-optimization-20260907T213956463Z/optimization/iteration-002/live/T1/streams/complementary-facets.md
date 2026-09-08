# Complementary-facets research note: production prompting

**Status:** partial, research date 2026-09-07. This bounded stream supplies measured compute, failure bounds, and tool/final-state evaluation evidence. It does not establish a universal technique ranking or current-model transfer.

## Requirement contract

| ID | Exact question and required inclusions | Expected contribution and decision context |
|---|---|---|
| R1 | “Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?” | Decision-grade production guide for prompt techniques. |
| R2 | “What strongest counterevidence, regressions and model/task transfer limits constrain adoption?” | Prevent adoption from benchmark headline results alone. |
| R3 | “What practical selection rules, failure signals and paired local evaluation follow?” | Operational decision table and reusable evaluation artifact, including tools where relevant. |

Scope is technical prompting and scaffold/context boundaries for text, reasoning, and tool-using LLMs, not image/video prompting.

## Findings

### F1. Self-consistency improves bounded-answer reasoning, but its direct inference multiplier is large

[Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/html/2203.11171), §3.1–3.5, evaluates self-consistency as: sample multiple CoT paths and majority-aggregate final answers.

- **Method and cost:** PaLM-540B used temperature 0.7 and **40 sampled paths**. Results are means over **10 runs**, each with 40 independently decoded outputs. The paper reports no currency cost, latency, or token total. Relative to one greedy CoT completion, this is a 40-trajectory decoding configuration, not a cheap prompt-only substitution.
- **Measured outcome:** versus greedy CoT, the paper reports absolute gains of **+17.9 points GSM8K**, **+11.0 SVAMP**, **+12.2 AQuA**, **+6.4 StrategyQA**, and **+3.9 ARC-Challenge**. Its LaMDA-137B table reports GSM8K **17.1% → 27.7%** for greedy CoT versus 40-path self-consistency.
- **Failure and transfer bound:** effect size is model- and task-dependent. On UL2-20B, GSM8K rises only **4.1% → 7.3%**. In symbolic out-of-distribution tasks, the paper reports no useful improvement for 4-letter concatenation (**0.0 → 0.0**) and near-zero change for Coinflip (**50.4 → 50.5**) on UL2-20B. The paper also observes incorrect or nonsensical sampled rationales. Majority agreement is therefore an uncertainty signal, not proof of a valid rationale.
- **Decision implication:** use only where many samples can be deterministically aggregated into a checked answer and the accepted-task value covers multi-decode cost. Record paths, output tokens, aggregation rule, and agreement. Do not transfer these arithmetic/commonsense results to open-ended text quality or multi-step tool completion.

### F2. ReAct supplies a final-state tool-use signal, but trades factual grounding for planning flexibility

[Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/html/2210.03629), §3.1–3.3, Table 1–2, and §4, measures interleaved thought/action/observation prompting.

- **Knowledge-tool result:** On question-only HotpotQA with a restricted Wikipedia API and PaLM-540B, **ReAct 27.4 EM** versus **Act 25.7** and **CoT 29.4**. ReAct therefore did **not** beat CoT on this task. With conditional fallback, ReAct→CoT-SC reached **35.1 EM**. The configured backoff was seven ReAct steps for HotpotQA and five for FEVER because more steps did not improve ReAct.
- **Tool final-state result:** In ALFWorld, the paper evaluates **134 unseen games** across six task types, with six prompts formed from permutations of manually written examples. It reports ReAct’s best prompt at **71% task success**, versus **45%** for action-only prompting and **37%** for BUTLER. The measured signal is environment task completion, not response plausibility.
- **Failure bound:** In a human review of 50 correct and 50 incorrect trajectories for each approach on HotpotQA, ReAct’s incorrect trajectories included **47% reasoning errors** and **23% unhelpful/empty search results**. The authors identify the cause as the reasoning/action structure reducing flexibility. CoT’s corresponding major failure was hallucination, **56%** of its failures, versus zero reported for ReAct in that categorized sample. This is a trade-off, not a blanket improvement.
- **Cost:** no token, latency, or dollar accounting is reported. The additional actions, observations, and fallback samples make total operating cost unknown.
- **Decision implication:** adopt interleaved tool traces only with explicit action limits and a checked outcome. Route a repeated action/observation loop, empty retrieval, or exhausted step budget to a fallback or review rather than allowing an unbounded trace.

### F3. Reflection/retry can repair observable failures, but fails on exploration-heavy web shopping

[Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/html/2303.11366), §4.1 and Appendix B.1, evaluates ReAct plus retained textual reflections after failed trials.

- **Method and tool-stage signal:** On 134 ALFWorld environments, the agent receives binary environment success feedback. A heuristic triggers reflection when the same action produces the same response for more than three cycles or a trajectory is too long. The prompt retains at most **three** prior reflections to respect context limits.
- **Measured outcome:** ReAct+Reflexion completed **130/134** ALFWorld tasks after **12** iterative trials, an absolute **22-point** improvement over the cited strong baseline. ReAct-only performance plateaued between trials six and seven, with a reported **22% hallucination rate** and no long-term recovery. This is final-state environment success, not self-reported success.
- **Counterevidence:** In WebShop, a two-shot ReAct+Reflexion agent was tested on **100 environments** and stopped after **four trials** because it showed no improvement. The authors state it did not significantly outperform ReAct and generated unhelpful reflections after failure. They attribute the limit to tasks requiring diverse exploration and escape from local minima.
- **Cost:** no per-accepted-task tokens, tool costs, latency, or currency cost is reported. Retried environment interactions and reflection generations are material but unquantified.
- **Decision implication:** reflection is justified only where the environment exposes a trustworthy binary or deterministic error signal and failures are locally diagnosable. Do not use it as a default web-agent recovery mechanism where search ambiguity and exploration diversity dominate.

## Operational selection rules

| Situation | Adopt condition | Failure / escalation signal | Required measurement |
|---|---|---|---|
| Bounded reasoning with deterministic answer extraction | Compare greedy CoT to a fixed self-consistency budget | Low answer agreement, invalid extraction, or cost per accepted answer above budget | Exact-answer correctness, paths sampled, tokens, latency, cost per accepted task |
| Tool retrieval or state-changing agent | Use ReAct-style traces with action and retry caps | Empty/non-informative retrieval, repeated action-observation cycle, step cap | Final backend/environment state, tool-call validity, turns, tokens, tool cost |
| Retry/reflection | Require a reliable failure oracle and separable, repairable failures | No improvement across a predeclared retry budget, repeated unhelpful reflection, loop | Final-state pass rate by trial, retry distribution, regression cases, total cost per accepted task |

[Anthropic’s agent-evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) supports this evaluation boundary: a transcript is not the outcome. For tools, grade the final state, such as a database reservation or tested artifact, plus the trace where tool choice matters. It also distinguishes `pass@k` from consistency-oriented `pass^k`; use the latter when every production run must be reliable.

## Reusable paired local evaluation artifact

```yaml
comparison:
  fixed:
    model: "<versioned model ID>"
    system_prompt: "<versioned>"
    tools_and_permissions: "<identical>"
    task_bank: "<frozen, representative>"
    max_turns: 12
  variants:
    - id: baseline
      prompt: "<current>"
    - id: candidate
      prompt: "<CoT | self-consistency-k | ReAct | reflection>"
      sample_paths: "<1 or k>"
      retry_budget: "<0 or n>"

per_trial:
  record:
    - final_state_pass            # deterministic checker preferred
    - response_quality_rubric     # only if final state is insufficient
    - tool_calls_and_parameters
    - turns
    - input_output_reasoning_tokens
    - tool_cost
    - latency
    - retry_count
    - failure_class

decision:
  primary: "accepted-task final-state pass rate"
  guardrails:
    - "no regression on existing regression cases"
    - "cost per accepted task within stated budget"
    - "no unsafe or invalid tool transition"
  escalation:
    - "low self-consistency agreement"
    - "repeated action/observation loop"
    - "empty retrieval"
    - "reflection does not improve within retry budget"
```

## Coverage and gaps

| Requirement | Coverage | Gap and stop reason |
|---|---|---|
| R1: measured effects with task, model, comparator, method, compute/cost | **Supported, qualified** | Three technique families retain source-bound outcomes and methods. Currency, latency, and full token cost are unreported in all retained academic evaluations. |
| R2: counterevidence, regressions, transfer limits | **Supported** | ReAct loses to CoT on HotpotQA, self-consistency has weak/no gains on smaller or symbolic settings, and Reflexion fails to improve WebShop. These are not evidence about current proprietary models. |
| R3: selection rules, failure signals, paired evaluation | **Supported, qualified** | Rules follow the observed failure mechanisms and primary evaluator guidance. Thresholds are intentionally not prescribed because the question supplies none. |

**Stop reason:** complementary facets are covered with inspected original sources. The unresolved high-impact next check is a local paired evaluation on the intended model, tool permissions, task distribution, and acceptance-cost budget.