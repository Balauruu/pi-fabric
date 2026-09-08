## R1 — measured technique effects

| Technique | Measured result and conditions | Production implication |
|---|---|---|
| Few-shot demonstrations | GPT-3 evaluated zero-, one-, and few-shot prompting across NLP tasks. Effects were task-dependent, with large models benefiting most, and every demonstration consumes context budget. [Brown et al., 2020](https://arxiv.org/abs/2005.14165) | Treat exemplar count, ordering, label format, and context cost as an experiment, not a default. |
| Few-shot counterevidence | Correct input-label pairings are not always the dominant mechanism. In controlled ICL experiments, label-space coverage, input distribution, and formatting could matter more than semantic correctness of demonstrations. [Min et al., 2022](https://aclanthology.org/2022.emnlp-main.759/) | Do not generalize “more correct examples improve output.” Test shuffled, label-only, and format-controlled comparators for the target model/task. |
| Chain-of-thought (CoT) | Eight CoT demonstrations increased PaLM 540B GSM8K accuracy from **17.9%** with standard prompting to **58.1%**. The paper reports markedly smaller or absent benefit in smaller models, so this is model-scale and task dependent. [Wei et al., 2022](https://arxiv.org/abs/2201.11903) | Use CoT only on verifiable multi-step tasks and remeasure after model changes. It increases output tokens and latency. |
| Zero-shot CoT | Adding “Let’s think step by step” to an instruction substantially improved arithmetic/reasoning results for `text-davinci-002`, including MultiArith **17.7% → 78.7%** and GSM8K **10.4% → 40.7%** in the reported setting. [Kojima et al., 2022](https://arxiv.org/abs/2205.11916) | A low-engineering baseline, but it is not evidence that the phrase transfers to proprietary successor models, tools, or non-reasoning text tasks. |
| Self-consistency | Sampling multiple CoT traces and selecting the most consistent answer improved PaLM 540B GSM8K from greedy CoT **58.1%** to **74.4%**, using 40 sampled reasoning paths in the reported setup. [Wang et al., 2023](https://arxiv.org/abs/2203.11171) | Accuracy gain is inseparable from approximately 40× reasoning-generation attempts before aggregation. Budget samples, max tokens, temperature, timeout, and vote/tie policy explicitly. |
| Least-to-most decomposition | A prompted decomposition followed by subproblem solving showed strong compositional-generalization results, notably on SCAN length splits, using `code-davinci-002`; the technique’s benefit depends on decomposition quality and intermediate-answer propagation. [Zhou et al., 2023](https://arxiv.org/abs/2205.10625) | Prefer when subproblems are independently checkable and state can be typed or validated. Otherwise decomposition can compound early errors. |
| Tool/reason-act scaffolds | ReAct interleaves thought, action, and environment observations. Its reported gains are benchmark- and tool-environment-specific, including ALFWorld and WebShop, rather than a controlled claim about generic text quality. [Yao et al., 2023](https://arxiv.org/abs/2210.03629) | Evaluate end-to-end success, tool-call count, retry count, invalid-action rate, and wall-clock cost. A text-only CoT comparator is insufficient. |

## Counterevidence and limits

- CoT rationales are not reliably faithful explanations of the model’s causal decision process. Prompt changes can alter stated rationales while preserving answers, and biased features can influence answers without appearing in CoT. [Turpin et al., 2023](https://arxiv.org/abs/2305.04388)  
  **Decision consequence:** do not use a plausible rationale as correctness evidence. Validate final answers and intermediate tool arguments independently.

- Decomposition is not automatically beneficial. It adds calls, tokens, state transitions, and error-propagation points. The least-to-most evidence is strongest for its reported compositional benchmarks, not for arbitrary production workflows. [Zhou et al., 2023](https://arxiv.org/abs/2205.10625)

- Self-consistency’s reported accuracy is coupled to repeated stochastic sampling. A single-path implementation is not the evaluated intervention. [Wang et al., 2023](https://arxiv.org/abs/2203.11171)

## Selection scaffold

1. Establish a direct-instruction baseline with fixed model/version, temperature, max output tokens, retrieval/tool context, and retry policy.
2. Add few-shot examples only when they beat direct prompting on held-out production-like cases after charging their input-token cost.
3. For multi-step, objectively scored tasks, compare direct, zero-shot CoT, few-shot CoT, and decomposition under equal total token and latency budgets.
4. Compare self-consistency only at fixed sample counts and report success per dollar, not only best accuracy.
5. For tool use, record terminal success plus invalid calls, calls per success, retries, context growth, and recovery behavior.
6. Re-run the matrix after any model, system prompt, tool schema, retrieval corpus, or context-budget change.

## Coverage, gaps, and stop reason

**R1 coverage:** few-shot, CoT, self-consistency, and least-to-most/decomposition have original-source anchors above, including model/task/comparator and material compute conditions where reported. Tool-use coverage is limited to ReAct’s benchmark evidence.

**Gaps:** I could not verify decisive passages or perform the requested saturation search because this session’s exposed tool registry contains no callable `web_search` or `fetch_content` provider, despite the assignment naming them. Therefore this is a bounded source map, not a completed web-verified literature review through 2026-09-07.