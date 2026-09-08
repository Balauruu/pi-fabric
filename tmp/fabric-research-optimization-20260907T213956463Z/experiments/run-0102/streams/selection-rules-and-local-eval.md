# R3 — Production prompt-technique selection and paired local evaluation

**Status:** supported, qualified. **Scope/date:** technical text, reasoning, and tool-using LLM scaffolds as of 2026-09-07. This is a decision guide, not a universal ranking. Results below retain their original model, benchmark, and budget conditions.

## Decision rules

| Situation / observed signal | Start with | Advance only if local paired eval shows | Do not transfer from literature |
|---|---|---|---|
| Structured multi-step reasoning, capable model | Direct answer baseline, then concise CoT/few-shot CoT | Improvement in task outcome exceeds its added latency, tokens, and failure rate | CoT’s GSM8K result to a different model, task, prompt length, or deployment distribution |
| Simple extraction, classification, pattern continuation, or one-step task | Direct structured instruction and output schema | CoT improves outcome rather than adding verbosity or invalid outputs | Assumption that “reasoning” is always beneficial. Original CoT work found negative or very small gains on one-step MAWPS SingleOp tasks and benefits only at roughly 100B+ scale. [Wei et al., §3.2](https://arxiv.org/html/2201.11903#S3) |
| Task requires fresh, externally verifiable facts | Tool grounding or retrieve-then-answer baseline. Compare action-only, CoT, and interleaved tool use | Factuality, task success, and tool-error recovery improve at the configured tool/retry budget | ReAct’s results to different tools, APIs, action grammar, or environment |
| Long document QA | Baseline answer, then quote-extraction/scratchpad and contextual examples | Accuracy improves at the production context-length and answer-location distribution, with acceptable latency | Results from Claude Instant 1.2 on synthetic 70K/95K-token government-document MCQ collages |
| Agent changes prompts, models, tools, retrieval, or context assembly | Preserve a near-100%-pass regression suite and a harder capability suite | Same-task paired trials show a useful outcome delta without a regression in safety, tool correctness, cost, or latency | A one-run win, pass@k-only result, or a benchmark score without its harness |

### Evidence that motivates, but does not settle, these rules

- **Use CoT as a hypothesis for multi-step tasks, not a default.** Wei et al. evaluated five arithmetic datasets, commonsense tasks, and symbolic tasks using greedy decoding. Their PaLM-540B GSM8K condition used **eight manually composed CoT exemplars** and reported **58.1%** solve rate versus **17.9%** with standard prompting; the paper reports gains emerging only at approximately 100B parameters, and small or negative gains for the easier one-step subset. [Methods](https://arxiv.org/html/2201.11903#S3.1), [results and scale/task qualification](https://arxiv.org/html/2201.11903#S3.2). This supports trying CoT on analogous local multi-step work, not claiming it helps all current models or tasks.

- **Tool grounding can trade hallucination for tool and planning failures.** ReAct used frozen PaLM-540B, few-shot human trajectories, a Wikipedia API for HotpotQA/FEVER, and 1–2 in-context examples for ALFWorld/WebShop. On HotpotQA/FEVER its reported prompt results were: Standard **28.7/57.1**, CoT **29.4/56.3**, CoT-SC **33.4/60.4**, Act **25.7/58.9**, ReAct **27.4/60.9**, and the two combined sequences **34.2/64.6** and **35.1/62.0** (EM/accuracy). In 200 manually labeled trajectories, false-positive hallucinated reasoning/facts were **14% CoT vs 6% ReAct**. [Setup](https://arxiv.org/html/2210.03629#S2), [Table 1 and trajectory analysis](https://arxiv.org/html/2210.03629#S3.3). For ALFWorld and WebShop, the authors report absolute success-rate advantages of **34** and **10 percentage points** over their imitation/RL comparators, respectively. [Reported conditions](https://arxiv.org/html/2210.03629#S1). Measure the full trade, not only answer accuracy.

- **Prompt/scaffold effects can be brittle and model-specific.** A ReAct replication/ablation on ALFWorld evaluated GPT-3.5 Turbo/Instruct on 134 instances and GPT-4/Claude Opus on 60 due to cost. Its Table 1 reports, for example, GPT-3.5-Instruct base ReAct **44.7%** success, versus **61.9%** for one variation, while Claude Opus fell from **56.6%** to **30.0%** under another. It reports approximately **14M input** and **150K output tokens** for 134 instances because the prompt is resent after each action. [Methods and denominators](https://arxiv.org/html/2405.13966#S4), [results](https://arxiv.org/html/2405.13966#S5), [token accounting](https://arxiv.org/html/2405.13966#A2). This is strong counterevidence to treating the ReAct format or its thought traces as the causal mechanism.

- **Context scaffolds must be tested at production length and position.** Anthropic’s controlled long-context study tested Claude Instant 1.2 on 70K/95K-token documents, four prompting strategies, answer passages at beginning/middle/end, with and without quote scratchpads. It filtered out question pairs the model missed even with the exact source passage: Instant answered those source-only questions about **90%** of the time, so the remaining **10%** were excluded. It found quote extraction helpful in every head-to-head comparison, with latency cost; Claude 2 baseline-to-prompted recall moved **0.939→0.961**, a stated **36% error reduction**. [Evaluation design](https://www.anthropic.com/research/prompting-long-context), [findings and qualifications](https://www.anthropic.com/research/prompting-long-context). That is an evidence-backed reason to test quote extraction locally, not a general retrieval prescription.

## Failure signals requiring a paired test or rollback

1. **Outcome/cost inversion:** quality is flat or lower while input/output tokens, turns, latency, or tool calls rise. The ReAct ablation’s repeated-prompt token cost is a concrete example.  
2. **Scaffold sensitivity:** changing exemplar identity, order, task similarity, model version, or tool description changes success materially. The ReAct ablation reports severe drops under exemplar-domain/instance variations. [Results](https://arxiv.org/html/2405.13966#S5.3)  
3. **Grounding failure:** unsupported final claims, empty/irrelevant retrieval, repeated actions, invalid tool arguments, or state changes without verified completion. ReAct’s original error analysis distinguishes reasoning, search-result, and hallucination modes. [Table 2 discussion](https://arxiv.org/html/2210.03629#S3.3)  
4. **Evaluator failure:** a task is ambiguous, reference solution cannot pass, or all capable systems score 0 across many trials. Anthropic advises that 0% pass@100 is usually a broken task/specification signal. [Evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)  
5. **Metric mismatch:** pass@k rises only because retries were added, while a customer needs reliable first-try behavior. Record pass@1 and, where every-run reliability matters, pass^k. [Definitions and distinction](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## Reusable paired local-evaluation artifact

```yaml
experiment: prompt-or-scaffold-change
frozen_run_contract:
  model: "<provider/model/version/date>"
  decoding: {temperature: 0, top_p: 1, max_output_tokens: 1200}
  system_prompt_hash: "<sha256>"
  tools_and_schemas_hash: "<sha256>"
  retrieval: {corpus_snapshot: "<id>", top_k: 5, reranker: "<version>"}
  budgets: {max_turns: 8, max_tool_calls: 12, retries: 0, timeout_s: 90}
  environment_snapshot: "<container-or-state-id>"

variants:
  A: {name: baseline, prompt_hash: "<sha256>", scaffold: "direct"}
  B: {name: candidate, prompt_hash: "<sha256>", scaffold: "CoT|examples|quotes|ReAct"}

tasks:
  source: "production-like holdout plus historical failures"
  strata: [common, high-impact, edge, tool-required, tool-not-required]
  each:
    id: "<stable-id>"
    input: "<redacted fixture>"
    initial_state: "<clean snapshot>"
    expected_outcome: "<reference solution or explicit pass condition>"
    graders:
      - deterministic_outcome
      - tool_trace_constraints
      - groundedness_or_human_calibrated_rubric
      - safety_policy
    primary_metric: "task_success"
    secondary_metrics: [invalid_output, unsupported_claim, tool_error,
                        turns, tool_calls, input_tokens, output_tokens,
                        wall_latency_ms, estimated_cost]

protocol:
  randomize_variant_order_within_task: true
  trials_per_task_per_variant: "<predeclared, >= 3 when stochastic>"
  isolate_every_trial: true
  preserve_all_transcripts: true
  report:
    - paired_delta_success
    - paired_delta_each_secondary_metric
    - uncertainty: "paired bootstrap CI or exact paired test, predeclared"
    - stratum_results
    - failures_by_taxonomy
    - pass_at_1
    - pass_to_k_if_every_trial_must_work
decision:
  predeclare: "<minimum acceptable outcome gain and maximum allowed
                regression/cost/latency/safety increase>"
  ship_only_if: "B meets the predeclared rule overall and in protected strata"
  rollback_if: "any hard safety/tool-state condition regresses"
```

Run A and B against the **same task fixtures and clean initial state**, counterbalance their order, and retain every transcript. An agent eval’s relevant unit is a task, trial, grader, and transcript; multiple trials are necessary because behavior varies run-to-run. [Definitions](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). Keep deterministic graders for verifiable outcomes and use calibrated model/human graders only for open-ended quality. [Grader trade-offs](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## What must be measured locally

- Current model/version, decoding, hidden provider behavior, and prompt-template rendering.
- Real task mix, edge-case prevalence, user impact, and acceptance thresholds.
- Exact tool schemas, tool reliability, permissions, state-reset behavior, retrieval corpus/index, context truncation, and retry budget.
- End-to-end tokens, latency, monetary cost, rate-limit failures, and tool-side cost.
- Output validity, groundedness, unsafe actions, and consistency across trials.
- Whether the local grader agrees with expert judgment and whether the suite has saturated.

## R-ID coverage and stop reason

- **R3 — Supported, qualified.** The evidence supports conditional selection, explicit failure signals, and paired local evaluation. It does **not** support a cross-model universal ranking.
- **Stop reason:** evidence saturation for the bounded question after inspecting original CoT and ReAct studies, a direct ReAct counterstudy, an official long-context controlled report, and official agent-evaluation methodology. The remaining uncertainty is deployment-specific and must be measured locally rather than expanded through additional benchmark search.

## Retained-source appendix

1. Wei et al., [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/html/2201.11903) — original empirical CoT study, methods, scale/task limits, prompt sensitivity.  
2. Yao et al., [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/html/2210.03629) — original tool-use/reasoning benchmark study and trajectory analysis.  
3. [*On the Brittle Foundations of ReAct Prompting for Agentic Large Language Models*](https://arxiv.org/html/2405.13966) — ablation/counterevidence, model transfer limits, and token accounting.  
4. Anthropic, [*Prompt engineering for Claude’s long context window*](https://www.anthropic.com/research/prompting-long-context) — controlled long-context prompt/scaffold experiment.  
5. Anthropic, [*Demystifying evals for AI agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — trial, grader, harness, reliability, cost, and regression-evaluation methodology.  
6. Anthropic, [*Define success criteria and build evaluations*](https://docs.anthropic.com/en/docs/build-with-claude/develop-tests) — task-specific, measurable, multidimensional evaluation guidance.