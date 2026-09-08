# Prompt-technique selection for production LLMs

**Decision date:** 2026-09-07  
**Scope:** technical prompts and scaffold/context boundaries for text, reasoning, and tool-using LLM systems. This is a same-evidence Terra-medium synthesis repair, not a new literature search or a universal ranking.

## Executive decision

Start with the smallest prompt and harness that can satisfy the task. Add a technique only for a diagnosed failure and retain it only when a paired local test improves final-state outcome within declared safety, latency, and total-cost limits.

- **Multi-step reasoning:** test concise few-shot chain-of-thought (CoT) against direct structured output. It is measured to help difficult arithmetic/reasoning under its original large-model conditions, but not easy one-step work or smaller models. **Confidence: medium.**
- **Fresh facts or stateful tools:** use a bounded observe–reason–act loop with concise tool contracts, explicit state, and verified final state. It improves some retrieval/action tasks, but can lose to CoT and adds tool/planning failure modes. **Confidence: medium.**
- **Long context:** test quote extraction and relevant contextual examples at the actual context length and answer-position distribution. They improved one controlled long-document recall setup, while end-position performance could degrade. **Confidence: medium.**
- **Repair/reflection:** only retry when a trustworthy verifier returns actionable feedback. Feedback-free reflection regressed in the retained coding ablation. **Confidence: medium.**

No retained evidence establishes parity across current production models, tasks, tool interfaces, token prices, or tail latency. `Unknown` is the correct disposition for any unmeasured combination.

## Evidence ledger and comparability boundary

Numbers below are measurements, not a common leaderboard. Model, task, evaluator, prompt, context/action budget, and metric differ across rows. Do not average or rank them.

| Technique and evidence status | Exact original condition and comparator | Retained result | Decision meaning and limit |
|---|---|---|---|
| **Few-shot CoT — measured** [S1] | PaLM-540B, greedy decoding, GSM8K; eight manually composed CoT exemplars versus standard few-shot answer prompting. | **56.9% vs 17.9%** accuracy, +39.0 points. | Test on locally multi-step work. The paper says gains emerged at about 100B parameters; PaLM-540B MAWPS SingleOp was **94.1% vs 94.1%**, so do not default CoT for one-step tasks. No end-to-end cost or latency reported. |
| **Interleaved tool reasoning (ReAct) — measured** [S2] | Frozen PaLM-540B, manual few-shot trajectories, constrained Wikipedia API; question-only HotpotQA/FEVER. Compared Standard, CoT, CoT self-consistency, and action-only prompts. | ReAct: **27.4 EM** HotpotQA and **60.9%** FEVER. CoT: **29.4/56.3**. Best fallbacks: ReAct→CoT-SC **35.1/62.0** and CoT-SC→ReAct **34.2/64.6**. | Retrieval grounding helps FEVER here but ReAct loses to CoT on HotpotQA. Step cap/fallback is part of the intervention, not decoration. |
| **Tool-action loop — measured** [S2] | Same paper, one/two-shot prompting on ALFWorld and WebShop, compared against cited imitation/RL methods. | Authors report absolute success advantages of **34** and **10** points, respectively. | Directional evidence for observation-grounded action, not a matched modern tool-calling comparison. |
| **ReAct prompt sensitivity and token burden — measured counterevidence** [S3] | ALFWorld ablation. GPT-3.5 Turbo/Instruct: 134 instances across six tasks. GPT-4/Claude Opus: 60 instances, due to cost. | Variations improve or hold performance even with weaker/irrelevant guidance. Repeated re-prompting consumed about **14M input** and **150K output tokens** for 134 instances. | Do not attribute a win solely to a visible “thought” format. Measure all prompt variants, repeated-context token cost, and tool trajectory. |
| **Verifier-conditioned repair — measured; feedback-free repair constrained** [S4] | GPT-4 on the 50 hardest HumanEval Python problems translated to Rust. Reflexion combines test generation/execution and self-reflection. | GPT-4 baseline **60.0% pass@1**, Reflexion **68.0% pass@1**. The paper’s compromised feedback-free reflection condition is reported as **52%**, below base. | Add at most bounded repair after compiler/test/API feedback. A self-critique string is not evidence of correction. |
| **Tool selection and call validity — measured** [S5] | API-Bank, `gpt-4-0613`, three settings: Call, Retrieve+Call, Plan+Retrieve+Call. | Overall API-call correctness **60.24%**. Error analysis: failed API retrieval **67.86%**, false call format **17.86%**. | Grade tool retrieval, schema validity, execution, and final outcome separately. A correct simple call does not imply multi-stage success. |
| **Long-context quote scratchpad/contextual examples — measured, vendor study** [S6] | Claude Instant 1.2, generated government-document MCQ collages at roughly 75K/90K tokens, four prompting strategies, passage beginning/middle/end; source-only failures (about 10%) excluded. Claude 2 shown only for base and best Instant strategy. | Quote extraction helped every reported head-to-head comparison, with latency cost. Claude 2 moved **0.939→0.961** in that setup, described as 36% error reduction. | Test at production length and answer location. The report says beginning/middle improved while end can degrade. Synthetic task, vendor model, and exclusion rule limit transfer. |

### Reconciled contradictions

| Apparent conflict | Classification | Disposition |
|---|---|---|
| CoT helps GSM8K but not MAWPS SingleOp. | Different task complexity and model scale. | Use task complexity as a screening hypothesis, then paired local evaluation. |
| ReAct beats CoT on FEVER but trails it on HotpotQA. | Different task population and grounding value under the same paper’s constrained API. | Choose retrieval/action loops only when observations can resolve material uncertainty. |
| ReAct reports tool-task gains, but its later ablation finds weak/irrelevant guidance can work and high repeated-context cost. | Different models/harnesses and causal ambiguity. | Treat the scaffold as a bundle. Attribute no effect to “reasoning traces” without an ablation. |
| Reflection can lift Rust pass@1 but feedback-free reflection regresses. | Different feedback condition. | Require a reliable executable or state validator before repair. |
| Long-context scaffolds help but can hurt end-position recall. | Context position and prompt-distance interaction. | Include position-stratified evaluation; do not use a single aggregate recall score. |

## Operating rules

| Observed task/failure signal | First candidate | Keep only if paired evidence shows | Stop, rollback, or escalate when |
|---|---|---|---|
| One-step extraction/classification or strict structured response | Direct instruction, schema, deterministic parser | Final-state validity improves without added invalid outputs or cost | CoT adds tokens/verbosity with flat outcome. |
| Multi-step transformation, arithmetic, or planning | Direct baseline vs concise CoT examples | Outcome uplift within latency/token SLO and no protected-stratum regression | Gains appear only in one exemplar order, model snapshot, or seed. |
| Fact depends on a current source | Retrieve/observe then answer with evidence IDs or quotes | Citation coverage and answer correctness improve at fixed retrieval budget | Empty/irrelevant retrieval, unsupported claim, or retrieval loop. |
| State-changing tool task | Concise retrieved tool docs, typed schema, state summary, bounded ReAct loop | Tool choice, argument validity, verified postcondition, and final success improve | Repeated action, invalid arguments, unverified state change, or budget exhaustion. |
| Long document question | Quote extraction then answer; test contextual examples separately | Position-stratified accuracy improves at production context length | End-position or long-tail latency regresses. |
| Code/API task with deterministic feedback | One bounded repair using compiler/test/API error | Repair uplift exceeds extra attempts and false-pass/unsafe-action rate does not rise | No trustworthy verifier, repeated same failure, or retry budget reached. |

**Non-negotiable budgets:** set max turns, tool calls, retries, input/output tokens, wall time, spend, and irreversible-action policy before testing. Verify final state, not plausibility of the transcript.

## Reusable paired evaluation artifact

```yaml
experiment: prompt_or_scaffold_change
frozen_contract:
  model: "<provider/model/version/date>"
  decoding: {temperature: 0, top_p: 1, max_output_tokens: 1200}
  system_prompt_hash: "<sha256>"
  prompt_renderer_hash: "<sha256>"
  tools_and_schemas_hash: "<sha256>"
  retrieval: {corpus_snapshot: "<id>", top_k: 5, reranker: "<version>"}
  environment_snapshot: "<clean-state-id>"
  budgets: {turns: 8, tool_calls: 12, retries: 1, input_tokens: 16000,
            output_tokens: 6000, wall_seconds: 90, spend: "<cap>"}
variants:
  A: {name: baseline, prompt_hash: "<sha256>", scaffold: "direct"}
  B: {name: candidate, prompt_hash: "<sha256>", scaffold: "<CoT|quotes|ReAct|repair>"}
tasks:
  manifest: "<versioned production-like holdout + historical failures>"
  strata: [common, high_impact, edge, tool_required, tool_not_required,
            context_beginning, context_middle, context_end]
  trial: {clean_initial_state: true, randomized_variant_order: true,
          repetitions: "<predeclared; >=3 if stochastic>"}
  graders: [deterministic_final_state, tool_trace_constraints,
            groundedness_or_calibrated_blinded_review, safety_policy]
record:
  [task_id, stratum, variant, seed, final_success, grader_reason,
   invalid_output, unsupported_claim, tool_retrieval_hit, tool_schema_valid,
   postcondition_verified, actions, retries, input_tokens, output_tokens,
   tool_latency_ms, wall_latency_ms, estimated_total_cost, budget_stop,
   unsafe_or_irreversible_attempt, transcript_pointer]
report:
  [paired_delta_final_success, paired_CI_or_exact_test, per_stratum_delta,
   pass_at_1, pass_to_k_when_every_run_must_work, failure_taxonomy,
   p50_p95_latency, token_and_total_cost]
decision:
  promote_only_if: "predeclared outcome gain and protected strata pass; no hard safety, tool-state, validity, cost, or p95-latency regression"
  rollback_if: "any hard safety/postcondition failure or declared SLO breach"
```

Run A and B on the same fixtures and clean states, preserve transcripts, and report every seed/order rather than best prompt. Use deterministic final-state graders where possible. A subjective grader must be calibrated and blinded to variant.

## What to adopt now, uncertainty, and decision-changing measurement

**Adopt now:** a direct structured baseline, bounded tools with concise schemas and postcondition checks, and this paired evaluation contract. Trial CoT, quote extraction, ReAct-style state loops, and verifier-backed repair only where the matching failure signal exists.

**Strongest support:** the original CoT task/scale boundary [S1], ReAct’s within-paper task split and fallback results [S2], the ReAct ablation’s token and causal warning [S3], and Reflexion’s feedback-dependent ablation [S4].

**Highest-impact unknowns:** current model snapshot behavior, real task distribution, tool reliability/schema design, context placement, total cost including retries/tools, p95 latency, and evaluator validity. No source supplies a matched modern cross-technique total-cost/latency comparison.

**Measurements that would change the choice:** on the frozen local contract, promote a candidate only if its paired final-success interval clears the predeclared gain threshold and protected strata, while invalid/unsupported/tool-state failures do not rise and total cost/p95 latency remain within SLO. A zero or negative paired outcome delta, a hard safety/postcondition regression, or a gain that disappears across exemplar order/model version overturns adoption.

## Retained primary-source appendix

| ID | Primary source, direct URL, publication | Evidence form and supported claim | Important limitation |
|---|---|---|---|
| S1 | Wei et al., [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/html/2201.11903), 2022 | Controlled prompt comparison. Exact passages inspected: eight manual exemplars; scale/task results; SingleOp boundary. Supports conditional CoT trial. | Legacy models/tasks, mostly greedy decoding, no production cost/latency. |
| S2 | Yao et al., [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/html/2210.03629), ICLR 2023 | PaLM-540B tool/reasoning benchmark, Table 1 and failure analysis. Supports grounded loop and fallback conditions. | Constrained Wikipedia API and benchmark harness, not current production tools. |
| S3 | Song et al., [On the Brittle Foundations of ReAct Prompting for Agentic Large Language Models](https://arxiv.org/html/2405.13966), 2024 | ALFWorld prompt ablations and token accounting. Supports sensitivity/cost warning. | 134/60-instance split, no dollar or tail-latency comparison. |
| S4 | Shinn et al., [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/html/2303.11366), 2023 | GPT-4 coding agent with generated/executed tests and ablation on 50 hard Rust translations. Supports verifier-conditioned repair only. | Benchmark coding and paper-specific reflection/test loop. |
| S5 | Li et al., [API-Bank: A Comprehensive Benchmark for Tool-Augmented LLMs](https://arxiv.org/html/2304.08244), 2023 | Tool-use benchmark, `gpt-4-0613` stage accuracy and error taxonomy. Supports stage-wise tool grading. | Benchmark APIs and older model interface. |
| S6 | Anthropic, [Prompt engineering for Claude’s long context window](https://www.anthropic.com/research/prompting-long-context), 2023 | Official controlled vendor case study with synthetic collage documents, location and context-length conditions. Supports local quote/context tests. | Vendor-associated, synthetic MCQ construction, exclusion of source-only failures. |

**Exact-source inspection record:** The source passages used for S1–S6 were directly retrieved during this repair. In particular, S1 directly states the 17.9→56.9 GSM8K result and 94.1→94.1 SingleOp boundary; S2’s Table 1 contains 27.4/60.9 and the two hybrid values; S3 states the 14M/150K accounting and sample split; S4 identifies the 50-hard-Rust ablation and 60→68 result; S5 defines the retrieval and false-format errors; S6 specifies its 75K/90K-style setup, four strategies, location conditions, exclusions, latency qualification, and end-position regression. Search snippets were not treated as evidence.
