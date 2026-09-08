# Outcomes evidence note

**Status: partial.** This stream supplies primary-study outcome evidence for four technique families. It does not establish a universal technique ranking or current production cost.

## Requirement contract

| ID | Exact question and required contribution | Status |
|---|---|---|
| R1 | “Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?” Decision contribution: quantified, condition-bound adoption evidence. | Supported for selected CoT, self-consistency, self-refinement, and reflection/tool-loop studies. Cost remains mostly unknown. |
| R2 | “What strongest counterevidence, regressions and model/task transfer limits constrain adoption?” Decision contribution: prevent unsupported transfer. | Supported/qualified. |
| R3 | “What practical selection rules, failure signals and paired local evaluation follow?” Required report inclusions include an operational decision table and concrete reusable evaluation artifact. | Qualified. Evidence supports bounded rules and signals, not a general production prescription. |

Scope: production-oriented text, reasoning, and tool scaffolds. Research date requested: 2026-09-07. Sources inspected are original papers, primarily 2022–2023, so results must not be treated as measurements of later model versions.

## Measured outcomes

| Family | Original measured contrast | Compute/cost | Failure or transfer bound |
|---|---|---|---|
| **Few-shot chain-of-thought (CoT)** | On GSM8K, **PaLM 540B** with eight manually written CoT exemplars scored **58.1%** versus **17.9%** with standard few-shot prompting. Greedy decoding. [Wei et al., Table 2 / Fig. 2](https://arxiv.org/pdf/2201.11903) | No token, latency, or monetary cost reported. CoT emits intermediate tokens and uses a large model. | The authors report gains only around ~100B+ scale. Smaller models generated fluent but illogical chains and could underperform standard prompting. Gains were negative or very small on easy single-operation MAWPS items. |
| **Self-consistency over CoT paths** | On GSM8K, **PaLM 540B** majority vote over sampled CoT paths scored **74.4% ± 0.1**, versus greedy CoT **56.5%**. On the same task, **code-davinci-002** scored **78.0%** versus **60.1%**. [Wang et al., Table 2](https://arxiv.org/pdf/2203.11171) | Each reported result averages **10 runs**, with **40 independently sampled outputs per run**. This is a substantial decoding multiplier over one greedy path. No token or dollar accounting. | It requires a fixed answer set or a dependable agreement function. Gains can be zero, e.g. UL2-20B on four-letter concatenation, 0.0-point change. |
| **Self-feedback/refinement** | For constrained generation with 20–30 required concepts, **GPT-4** coverage rose **15.0% → 45.0%** under Self-Refine. For code optimization, GPT-4 rose **27.3% → 36.0%** optimized programs. [Madaan et al., Table 1](https://arxiv.org/pdf/2303.17651) | Up to **four** feedback/refine iterations, retaining prior outputs and feedback in context. No token, latency, or price measurement. | Math reasoning changed only **92.9% → 93.1%** for GPT-4. The paper reports its self-feedback said “everything looks good” for 94% of math instances. Vicuna-13B often failed required feedback format, repeated output, or hallucinated a conversation. |
| **Reflection with external/tool evaluation** | In **134 ALFWorld** text-environment tasks, GPT-3 ReAct + Reflexion completed **130/134** tasks. Comparator: ReAct-only retried after reset but did not preserve self-reflection. [Shinn et al., §4.1, Fig. 3](https://arxiv.org/pdf/2303.11366) | Up to 12 consecutive trials in the reported ALFWorld result, memory capped at the last three reflections. No token, tool-call, latency, or dollar cost. | The tool-stage trigger was repeated identical action/response for **>3 cycles** or **>30 actions**. ReAct-only converged at a **22% hallucination rate** with no long-term recovery. Four environments still failed under Reflexion. |

## Tool-evaluation signal

Reflection is supported only where a task evaluator exists. In ALFWorld, environment completion is the final-state signal, while the loop’s operational warning signal is repeated action/observation or excess actions. In the same paper’s programming setup, generated tests were syntax-filtered through AST construction and execution, but final pass@1 used hidden benchmark tests. This distinction matters: self-generated tests can guide retries but are not proof of final correctness.

## Counterevidence and implications

1. **Do not adopt CoT merely for more tokens.** The CoT ablation found “variable compute only” performed about like baseline. The supported intervention is structured intermediate reasoning under the cited task/model conditions, not length alone. [Wei et al., §3.3](https://arxiv.org/pdf/2201.11903)

2. **Use self-consistency only when answers can be normalized and voted.** It delivers strong arithmetic gains, but its evaluator is answer agreement, not reasoning validity. The study itself says output probabilities did not reliably distinguish correct from wrong solutions.

3. **Require an external or deterministic check before iterative refinement for correctness-critical work.** Self-Refine’s near-null math result and 94% false “looks good” feedback show that a model’s self-assessment is not a sufficient stopping condition. [Madaan et al., §§3–4](https://arxiv.org/pdf/2303.17651)

4. **Treat retries as a costed scaffold, not free accuracy.** None of the retained studies reports accepted-task total cost, including generated/retried tokens, tools, or verifier calls. Their improvement cannot establish production cost-effectiveness.

## Operational selection rule

| Situation | Adopt provisionally | Required guardrail |
|---|---|---|
| Closed-answer reasoning with deterministic normalization | CoT, then self-consistency if baseline failure is material | Compare one path with 40-path voting under the same model and prompt. Record token and latency multiplier. |
| Constrained text with mechanically checkable constraints | Feedback/refinement | Use deterministic constraint coverage as final selection, not self-feedback alone. Cap iterations. |
| Tool-using task with inspectable final state | ReAct-style actions plus reflection after a verified failed trajectory | Reset/retry only after a concrete signal such as failed final state, repeated observation loop, action cap, compiler/test failure, or tool error. |
| Open-ended text judged by preference | No outcome claim from these studies alone | Blind human or validated task-specific review is required. Agreement among generated drafts is not a correctness signal. |

## Reusable paired evaluation artifact

| Field | Arm A | Arm B |
|---|---|---|
| Fixed inputs, model snapshot, system prompt, tools, budgets | Direct or single-path baseline | One named technique family only |
| Final-state validator | Deterministic task check where possible | Same validator |
| Per-task record | accepted, failure class, input/output tokens, tool calls, retries, wall time | Same fields |
| Stop / escalation | First valid result or fixed budget | Fixed path/iteration/trial cap and explicit loop/error trigger |
| Decision rule | Retain baseline if technique does not improve accepted-task rate enough to cover added total cost and latency | Adopt only for task slices where the paired result improves accepted-task rate without unacceptable regressions |

## Retained-source appendix

| Source | Date / type | Inspected locator | Supports | Important limitation |
|---|---|---|---|---|
| [Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/pdf/2201.11903) | NeurIPS 2022 paper | §3.1–3.4, Fig. 2, Table 2, §6 | CoT outcome, scale dependence, easy-task regression | PaLM-era benchmark evaluation, largely single ordering outside LaMDA. |
| [Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/pdf/2203.11171) | ICLR 2023 paper | §§3.1–3.3, Tables 1–5 | Sampling/voting outcomes, 40-path and 10-run method | Fixed-answer aggregation and no monetary/token cost. |
| [Madaan et al., *Self-Refine: Iterative Refinement with Self-Feedback*](https://arxiv.org/pdf/2303.17651) | 2023 original paper | §§3–4, Tables 1–2, Fig. 4, §6 | Text/code outcomes, iteration cap, self-feedback failures | Several text measures are preference/model-judge based. |
| [Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/pdf/2303.11366) | 2023 original paper | §§3–4.3, Fig. 3, Table 1 | Tool-loop final-state outcome and operational failure signals | Multi-trial scaffold, historical GPT-3 setup, no total cost accounting. |

## Coverage and stop reason

- **R1 — supported, qualified:** Four original studies preserve task, model, comparator, result, method, and available repetition/compute information. Monetary cost, total tokens, latency, and accepted-task cost are unreported.
- **R2 — supported:** Each retained family has a concrete failure or transfer bound.
- **R3 — qualified:** The paired artifact and tool-stage signals follow the evidence, but require local measurement because model snapshots, tools, and production validators differ.
- **Stop reason:** Complementary primary evidence now covers outcome, compute/repetition, failure bounds, and tool final-state validation. Broad technique coverage and current production economics remain explicit gaps.