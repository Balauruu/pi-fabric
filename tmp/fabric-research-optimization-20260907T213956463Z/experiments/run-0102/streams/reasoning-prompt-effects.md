# Prompt-technique selection guide

**Status: partial.** The requested cutoff, **2026-09-07**, is future relative to this investigation. This note therefore reports only inspected primary sources available now. Results are not a universal ranking and should not be extrapolated across models, benchmarks, or inference budgets.

## R1 — Measured interventions

| Technique | Isolated measured effect under original conditions | Cost / method | Adoption implication |
|---|---|---|---|
| **Few-shot CoT** | On five arithmetic datasets, [Wei et al.](https://arxiv.org/html/2201.11903#A2.T2) compare standard prompts with eight CoT exemplars. For **PaLM 540B**, GSM8K rises **17.9→56.9%** and SVAMP **69.4→79.0%**. For **code-davinci-002**, GSM8K rises **19.7→63.1%**. | One generation, but long prompt plus generated rationale. No dollar/latency cost reported. | Candidate for hard, multi-step, objectively scored tasks when a suitable large model and vetted demonstrations exist. |
| **Zero-shot CoT** | [Kojima et al.](https://arxiv.org/html/2205.11916#S4.T2) append “Let’s think step by step” plus a separate answer-extraction prompt. With **text-davinci-002**, MultiArith is **17.7→78.7%** and GSM8K **10.4→40.7%**. With **PaLM 540B**, GSM8K is **12.5→43.0%**. | Two stages, so at least an additional model call and rationale tokens. No price reported. | Cheapest reasoning probe when examples are unavailable. Evaluate the exact trigger and extraction format locally. |
| **Least-to-most / decomposition** | [Zhou et al.](https://arxiv.org/html/2205.10625#S3) use a decomposition prompt then solve sequential subproblems with **code-davinci-002**. On GSM8K, CoT **60.97→62.39%** overall, but on problems requiring at least five expected steps **39.07→45.23%**. On SCAN length split, least-to-most reports **99.7%**. | Multiple dependent calls, one per generated subproblem. No compute/cost measurement. | Use only where task decomposition is stable, independently checkable, and difficult test instances are deeper than demonstrations. |
| **Self-consistency** | [Wang et al.](https://arxiv.org/html/2203.11171) replace greedy CoT decoding with sampled reasoning paths and majority answer selection. The inspected comparative result reported through [Kojima et al.’s Table 2](https://arxiv.org/html/2205.11916#S4.T2): **PaLM 540B few-shot CoT GSM8K 56.9→74.4%**. | Original protocol samples **40** paths, then votes, making inference roughly 40× the generated-path workload versus greedy decoding. | Use only if an answer normalizer exists, candidate answers genuinely vary, and an accuracy gain justifies the fixed fan-out. |
| **LLM self-verification, factual text** | [Dhuliawala et al.](https://arxiv.org/html/2309.11495#S4.T1) test Chain-of-Verification on the same **Llama 65B**, greedy decoding, few-shot baseline. Wikidata list precision: **0.17→0.36** for two-step CoVe, while mean hallucinated entities fall **2.95→0.68**. MultiSpanQA F1: **0.39→0.48** for factored CoVe. Biography FactScore: **55.9→71.4** for factor+revise. | Draft, plan, one or more verification answers, optionally per-claim cross-check, then revise. Authors explicitly call factored execution more computationally expensive, though parallelizable. | Appropriate only for high-cost factual claims where precision matters more than coverage and verification questions can be independently grounded. |
| **CoT in a tool/action setting** | [Wei et al.](https://arxiv.org/html/2201.11903#S4) include SayCan robot-plan tasks, but this is not an isolated production tool-use evaluation with retries or cost. | Not sufficient for a production tool-use adoption claim. | Treat as hypothesis only. Pair with a tool trace evaluator and a deterministic validator. |

### Decisive source passages

- [Wei et al., §3.2](https://arxiv.org/html/2201.11903#S3.SS2): CoT gains emerge only at roughly **100B+** scale in their tested models and are negative or small on easy one-step MAWPS subsets.
- [Kojima et al., Table 4](https://arxiv.org/html/2205.11916#S4.T4): on MultiArith/text-davinci-002, tested wording ranges from **78.7%** (“Let’s think step by step”) to **13.1%** (“It’s a beautiful day”), versus **17.7%** zero-shot.
- [Zhou et al., §3.3](https://arxiv.org/html/2205.10625#S3.SS3): decomposition’s GSM8K aggregate gain is modest, concentrated in deeper solutions.
- [Dhuliawala et al., §3.3](https://arxiv.org/html/2309.11495#S3.SS3): factored verification deliberately excludes the original draft from answer prompts to reduce repetition of its hallucinations.

## R2 — Counterevidence and transfer limits

1. **Scale and task depth are preconditions, not details.** Few-shot CoT degraded or barely changed easy single-operation tasks and did not help small models in [Wei et al.](https://arxiv.org/html/2201.11903#S3.SS2). Do not infer a benefit for short classification, extraction, or routine prose.

2. **Prompt demonstrations and formatting are experimental variables.** [Kojima et al.](https://arxiv.org/html/2205.11916#S4.T4) show large template sensitivity. Their cross-task few-shot analysis finds worse results when examples and target differ in answer type. A benchmark result with hand-authored exemplars is not evidence that arbitrary production examples transfer.

3. **Decomposition can fail at its own interface.** Least-to-most remains below 100% on long last-letter lists, with observed copying, omission, and concatenation errors ([Zhou et al., Appendix §7.4](https://arxiv.org/html/2205.10625#S7.SS4)). Generated decomposition must be measured separately from final-answer accuracy.

4. **Voting spends inference, not understanding.** Self-consistency’s reported gain is inseparable from 40-path sampling and answer aggregation. It can amplify a common systematic error, fail when answers cannot be normalized, and its published gain does not establish the same accuracy-per-dollar for current models.

5. **Self-critique is not reliable verification.** [Valmeekam et al.](https://arxiv.org/html/2402.08115v2#S5) tested GPT-4 over 100 instances each of Game of 24, graph coloring, and STRIPS planning. Their LLM-as-verifier loop **decreased** performance; adding critique sometimes further hurt it. Sound external verification improved results, and sampling with a sound verifier produced comparable gains at lower prompt-token growth. Their appendix estimates 100 CoT prompts at **$0.47/problem** and Tree-of-Thought at **$0.74/problem** in its compared setting.  
   **Rule:** an LLM may suggest tests, but a high-stakes accept/reject decision requires an independent executable, retrieval-grounded, or human verifier.

6. **CoVe is not tool-grounded.** Its authors explicitly do not use retrieval or tools for verification ([§3.3](https://arxiv.org/html/2309.11495#S3.SS3)). Its results establish same-model contextual separation on particular factual benchmarks, not factual truth in a changing production corpus.

## Operational decision table

| Situation | Start with | Escalate when | Do not use as acceptance criterion |
|---|---|---|---|
| Short-form production text, no multi-step correctness metric | Direct structured prompt | Add retrieval or editorial review if factual claims matter | CoT prose length or apparent confidence |
| Multi-step task with deterministic checker | Zero-shot CoT | Few-shot CoT if local tests confirm an improvement | Model’s self-declared correctness |
| Deep compositional task with reusable subproblem schema | Least-to-most | Deterministic subproblem and final-output checks | Unchecked generated decomposition |
| Objective answer task with costly mistakes | CoT + self-consistency | Independent verifier reranks candidates | Majority vote alone |
| Factual long-form generation | Retrieval-grounded generation | CoVe-style claim splitting only after measured precision gain | Same-model self-check alone |
| Tool use | Plan/action schema + sandboxed tool execution + trace validator | Retry only on a categorized, validator-observed failure | Natural-language “tool result looks right” |

**Failure signals:** baseline-correct answers are changed to incorrect, gains disappear on a held-out prompt set, variance across seeds/examples exceeds gain, tool-call invalidity rises, majority answers are low-margin, verifier false-negative rate rejects known-good outputs, or p95 token/call budget exceeds the service objective.

## Reusable paired local evaluation artifact

```yaml
experiment: prompt-technique-gate
unit: one fixed production request with a deterministic oracle or blinded rubric
arms:
  - direct
  - zero_shot_cot
  - few_shot_cot
  - least_to_most
  - self_consistency_40
  - verify_then_revise
controls:
  model_id: "<pinned provider/model/version>"
  system_prompt: "<identical except intervention>"
  retrieval_snapshot: "<pinned corpus/index version or none>"
  tools: "<same allowlist, timeout, retry=0 except tested retry arm>"
  temperature: "<record>"
  max_output_tokens: "<record>"
  seed_or_run_id: "<record>"
metrics:
  primary: "exact correctness | executable test pass | blinded factual-precision rubric"
  safety: ["invalid_tool_call_rate", "unsupported_claim_rate", "baseline_correct_to_wrong_rate"]
  cost: ["input_tokens", "output_tokens", "tool_calls", "wall_ms", "price_if_known"]
  uncertainty: "paired bootstrap 95% CI over request-level score differences"
decision:
  adopt_only_if:
    - "primary improvement CI excludes 0"
    - "safety metrics do not regress beyond predeclared limit"
    - "p95 cost and latency fit the service budget"
    - "effect repeats on held-out tasks and a second prompt/example set"
  rollback_if:
    - "verifier rejects known-good answers"
    - "tool traces fail validation"
    - "gain is smaller than prompt/example variance"
```

## Coverage and stop reason

- **R1: supported, qualified.** Exact, isolated evidence was retained for few/zero-shot CoT, least-to-most, self-consistency, and answer verification under their stated study conditions.
- **R2: supported, qualified.** Primary counterevidence establishes scale dependence, prompt sensitivity, decomposition errors, and GPT-4 self-verification regressions.
- **Tool-using production transfer: unknown.** Inspected sources do not provide a decisive isolated study with production tool budgets, retry policy, and external tool-trace validation.
- **Stop reason:** evidence saturation for the four requested techniques from primary studies, plus a future cutoff and the remaining decision-changing production tool-use gap.

## Retained-source appendix

1. Wei et al., [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/html/2201.11903) — primary CoT comparisons, scale limit, SayCan.
2. Kojima et al., [*Large Language Models are Zero-Shot Reasoners*](https://arxiv.org/html/2205.11916) — zero-shot CoT, templates, comparators.
3. Zhou et al., [*Least-to-Most Prompting Enables Complex Reasoning in Large Language Models*](https://arxiv.org/html/2205.10625) — decomposition and depth-conditioned results.
4. Wang et al., [*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/html/2203.11171) — sampled-path voting method.
5. Madaan et al., [*Towards Understanding Chain-of-Thought Prompting: An Empirical Study of What Matters*](https://arxiv.org/html/2212.10001) — retained as controlled CoT-mechanism/transfer context.
6. Weng et al., [*Large Language Models are Better Reasoners with Self-Verification*](https://arxiv.org/html/2212.09561v4) — retained positive self-verification evidence and its reported bias.
7. Dhuliawala et al., [*Chain-of-Verification Reduces Hallucination in Large Language Models*](https://arxiv.org/html/2309.11495) — isolated same-model factual verification pipeline.
8. Valmeekam et al., [*On the Self-Verification Limitations of Large Language Models on Reasoning and Planning Tasks*](https://arxiv.org/html/2402.08115v2) — primary regression evidence and sound-verifier comparison.