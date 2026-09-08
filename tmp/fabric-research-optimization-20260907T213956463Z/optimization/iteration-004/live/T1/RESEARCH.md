# Production Prompt-Technique Guide

**Scope:** Technical prompting and scaffold/context boundaries for production text, reasoning, and tool-using LLMs, as of 2026-09-07. Results remain under their original task, model, configuration, budget, and evaluator conditions. They are not a common leaderboard.

## Answer and decision rules

Use bounded search only for reasoning tasks with externally checkable intermediate states. Prefer refinement plus blinded domain review for subjective text. Treat retrieval, verification, and execution as separately measured stages in tool workflows. Do not automate same-model critique without a calibrated or executable external check.

| Situation | Technique to test | Primary success measure | Failure signals |
|---|---|---|---|
| Discrete reasoning with externally checkable intermediate states | Bounded Tree of Thoughts (ToT) | Final-state correctness per total cost | Search does not improve accepted success enough to justify added tokens, latency, or evaluator errors |
| Subjective text generation | Iterative refinement and blind domain review before tree search | Blind preference or rubric score under equal total budget | LLM-judge gain does not survive human or domain review |
| Long document QA | Quote scratchpad, then answer | Position-stratified grounded-answer accuracy | End-position regression, excess latency, quote extraction misses evidence |
| Many-shot examples | Fixed curated or random examples first | Accepted-task quality under equal token budget | Query-selected examples add cost without a credible gain |
| Repair with executable feedback | Compiler, tests, structured diagnostics, bounded repair | Final-state valid repair rate | Marginal gains flatten, or repairs damage correct outputs |
| Same-model critique without an external check | Do not automate by default | Compare against retaining the original output | False rejection of correct candidates, more loops reduce success |
| Large tool catalog | Retrieval or reranking before call-prompt tuning | Tool completeness@k, then execution-effect correctness | Required tool absent, correct syntax produces wrong state effect |
| Stateful interactive work | Bounded observe-act loop with stop or fallback | End-to-end task success, safety, cost per success | Repeated calls, no-progress observations, failed retrieval, budget exhaustion |
| Closed-world answer generation | Direct prompt or CoT baseline | Accepted answer quality per cost | Tool or retrieval loop does not improve the final outcome |

## Evidence by technique

### Bounded search for verifiable reasoning

[Tree of Thoughts](https://arxiv.org/html/2305.10601) tested GPT-4 on 100 hard Game-of-24 items. BFS ToT with breadth 5 achieved **74%** success, versus **4.0%** for CoT and **49%** for best-of-100 CoT. The ToT condition used **5.5k completion / 1.4k prompt tokens** and cost **$0.74** at 2023 prices. Best-of-100 CoT used **6.7k / 2.2k** and cost **$0.47**. This supports testing bounded search where state checking and backtracking can recover failures, not adopting it as a general reasoning default.

Portability is limited. In the same Game-of-24 setting, ToT was **19%** with GPT-3.5 versus **74%** with GPT-4, but the GPT-3.5 condition changed the proposal prompt from one-shot to three-shot. GPT-4 generation with GPT-3.5 evaluation reached **64%**, while GPT-3.5 generation with GPT-4 evaluation reached **31%**. Test the target generation model and its exact prompt configuration, not only the evaluator.

For constrained writing, ToT coherence was **7.56**, versus **6.19** for IO and **6.93** for CoT on a GPT-4 1–10 scale. In blind pairs, authors preferred ToT in **41/100**, CoT in **21/100**, with **38/100** ties. Refinement scored **7.67** from IO and **7.91** from ToT. The ToT writing condition used **4k / 2.9k completion/prompt tokens** and cost **$0.32/task**. This is qualified evidence: the evaluator was GPT-4 and the human comparison was a small author study. Refinement is the relevant baseline for subjective text. Historical dollar values do not include current pricing, latency, retries, tools, or total operating cost.

### Long context and example selection

In a limited Claude 2 comparison, Anthropic’s [long-context prompting experiment](https://www.anthropic.com/news/prompting-long-context) reported accuracy increasing from **0.939** to **0.961**, described as a **36% error reduction**, with its best prompt. Its primary study used Claude Instant 1.2 on synthetic government-document multiple-choice recall at roughly **70K/95K tokens**, with evidence placed at the beginning, middle, or end. Quote scratchpads helped all reported head-to-head comparisons with a small latency cost.

The same study reports that scratchpad and examples can degrade end-position performance. It is vendor-authored, uses a synthetic task, excludes source-only failures, and leaves some chart cells inaccessible as text. Treat quote extraction as a document-QA hypothesis to test at production context lengths and evidence positions, not as evidence for open-ended writing, reasoning, or tools.

[Revisiting ICL with Long Context LMs](https://arxiv.org/html/2412.16926) found advanced demonstration selection statistically significantly better than random selection in **fewer than 15%** of instances across **18 datasets** and four task families. It studied Gemini 1.5 Flash/Pro and Llama 3.1 70B. Compare per-query selection against a fixed example set under equal budgets. This evidence concerns many-shot ICL, not quote extraction, and does not establish production billing cost.

### Repair and self-critique

[FeedbackEval](https://arxiv.org/html/2504.06939) reports code-repair success of **63.6%** for mixed feedback, **62.9%** for LLM-Expert, **57.9%** for test, **53.1%** for minimal, **49.2%** for compiler, and **48.8%** for LLM-Skilled feedback. It tested GPT-4o, Claude-3.5, DeepSeek-R1, GLM-4, and Qwen2.5 on code repair. Marginal gain declined after **two or three iterations**. These are aggregate feedback-type outcomes, not a no-feedback comparison, and LLM-Expert uses ground-truth knowledge. Prefer actionable test or compiler diagnostics and locally measure the loop cap.

[Self-Verification Limitations](https://arxiv.org/html/2402.08115v2) found that GPT-4 acting as generator, critic, and backprompt source worsened performance across almost all studied reasoning and planning domains. More backprompts consistently degraded quality. The accessible source does not provide a single aggregate numeric delta. Do not replace an accepted candidate based solely on same-model critique without a calibrated or executable check.

### Tool use and agent loops

[API-Bank](https://arxiv.org/html/2304.08244) evaluated `gpt-4-0613` over 73 simulated APIs, 314 dialogues, and 753 calls using execution-equivalent effects rather than syntax-only grading.

| Condition | GPT-4 correctness |
|---|---:|
| Known API, Call | **63.66%** |
| Unknown API, Retrieve+Call | **37.04%** |
| Multi-step, Plan+Retrieve+Call | **70.00%** |
| Total | **60.24%** |

Among GPT-4 errors, failed retrieval was **67.86%** and false call format **17.86%**. Measure retrieval, schema validity, execution effect, and task success with separate denominators. The advanced conditions used only 50 instances each and simulated fixed APIs.

[ToolRet](https://arxiv.org/html/2503.01763) tested retrieval across **43,215 tools** and **7,615 tasks**. NV-Embed-v1 achieved **nDCG@10 33.83** and **Completeness@10 32.12**, where completeness requires every needed tool in the top 10. In the ToolBench-G1 retrieved-candidate condition, **GPT-3.5** achieved a **50.60** pass rate with `bge-large`, versus **62.00** with oracle candidates, an **11.40-point decrease**. This is ToolBench-specific retrieval-then-calling evidence, not a general model result. Tool labels may omit functionally acceptable alternatives.

[ReAct](https://arxiv.org/html/2210.03629) interleaved thought, action, and observation with PaLM-540B. In simulated interactive environments, its best ALFWorld trial achieved **71%** success, versus **45%** for Act and **37%** for BUTLER. WebShop achieved **40.0%** versus **30.1%** for Act. The ALFWorld result is the best of six controlled trials, not an average production outcome.

ReAct was not universally better. On HotpotQA, ReAct scored **27.4 EM**, versus **29.4** for CoT and **33.4** for CoT-SC. On FEVER, ReAct reached **60.9%**, versus **56.3%** for CoT and **60.4%** for CoT-SC. The ReAct → CoT-SC hybrid scored **35.1 EM** on HotpotQA and **62.0%** on FEVER. Separately, the CoT-SC → ReAct hybrid scored **34.2 EM** on HotpotQA and **64.6%** on FEVER. These configurations are distinct and should not be combined into one hybrid result.

Sampled ReAct HotpotQA failures were **47%** reasoning error, **23%** unsuccessful search result, **0%** hallucination, and **29%** label ambiguity. These proportions apply within sampled failures, not benchmark-wide rates. The study reports no token, latency, call-count, or dollar cost.

[Toolformer](https://arxiv.org/html/2302.04761) shows that call triggering can be policy-sensitive. Raising API-token top-*k* from 1 to 10 changed API-call rates from **40.3% to 98.1%** on T-REx and **8.5% to 100%** on WebQS. This was a GPT-J 6.7B trained system limited to at most one API call per input. Tune overcalling and call thresholds against final outcomes, not syntax alone.

## Paired local evaluation artifact

```yaml
name: production-prompt-technique-paired-eval
unit:
  id: string
  task_class: text | reasoning | document_qa | tool_workflow | repair
  request: string
  expected_final_state: structured_oracle_or_blind_rubric
  required_tools: [tool_id]
  evidence_position: beginning | middle | end | not_applicable

arms:
  - baseline_direct_or_cot
  - bounded_search_or_refinement
  - quote_scratchpad_or_examples
  - verifier_backed_repair
  - retrieve_then_call
  - observe_act_loop

fixed_controls:
  model_version: string
  decoding: temperature_seed_token_cap
  context_budget: equal_or_declared
  wall_clock_cap: duration
  tool_permissions: identical
  input_set: paired_held_out_cases

record:
  final_state_success: accepted_cases / all_cases
  grounded_or_blind_quality: score
  retrieval_completeness_at_10: all_required_tools_present / cases
  schema_valid_rate: valid_calls / attempted_calls
  execution_effect_rate: expected_effect_calls / attempted_calls
  input_tokens: number
  output_tokens: number
  tool_calls: number
  model_latency_ms: number
  tool_latency_ms: number
  total_cost: number
  false_rejection_rate: damaged_correct_outputs / correct_baseline_outputs
  failure_labels:
    - missing_required_tool
    - wrong_tool_or_argument
    - invalid_schema
    - failed_retrieval
    - repeated_call
    - no_progress
    - verifier_false_rejection
    - budget_exhaustion
    - wrong_final_state

decision_rule: >
  Adopt only when the intervention improves final-state success or the
  predeclared domain-quality measure over its paired baseline while meeting
  product-specific ceilings for unsafe effects, p95 latency, and total cost
  per accepted task. Diagnose the first failed stage before changing prompts.
```

Use deterministic final-state checks where possible. For subjective text, use blinded domain review. Stratify long-context cases by evidence position. Keep budgets equal or explicitly report their difference. No universal acceptance threshold is supplied because safety, latency, and cost ceilings are product-specific.

## Limitations and unresolved dimensions

- No retained direct support establishes the legacy few-shot CoT boundary of PaLM-540B GSM8K **56.9% versus 17.9%** or MAWPS SingleOp **94.1% versus 94.1%**.
- No retained direct support establishes Song et al.’s ReAct prompt-causal ablation or its approximately **14M input / 150K output tokens** over 134 ALFWorld instances.
- No retained direct support establishes Reflexion’s GPT-4 Rust ablation of **60.0%** baseline, **68.0%** Reflexion, and **52%** feedback-free condition.
- Most retained sources do not report current production cost, p95 latency, retries, tool charges, or cost per accepted task.
- Benchmark metrics are not quantitatively comparable across Game of 24, writing, synthetic document recall, code repair, simulated APIs, tool retrieval, and interactive environments.

## Coverage and stop reason

Checked coverage includes source-bound results for bounded search, long-context prompting, many-shot selection, feedback-driven repair, self-verification, API calling, tool retrieval, interactive agent loops, and tool-call triggering. The guide is partial for legacy few-shot CoT, ReAct prompt-causal brittleness and repeated-context cost, Reflexion’s feedback-conditioned ablation, and current production economics.

Research stopped at the requested 2026-09-07 cutoff after selecting decisive inspected studies, not as an exhaustive systematic review. The highest-impact next check is a paired target-model evaluation using the artifact above, with final-state acceptance, failure-stage instrumentation, p95 latency, and total cost per accepted task.

## Source appendix

| Source | Type/date | Method or evidence form | Supported claim | Important limitation |
|---|---|---|---|---|
| [Yao et al., *Tree of Thoughts*](https://arxiv.org/html/2305.10601) | Paper, 2023 | GPT-4 search and writing experiments | ToT can improve discrete-search correctness and improve constrained-writing scores at higher historical token and dollar cost | Task-specific, 2023 prices, subjective-text judging limits |
| [Anthropic, *Prompt engineering for Claude’s long context window*](https://www.anthropic.com/news/prompting-long-context) | Vendor experiment, 2023-09-27 | Long-document synthetic MCQ recall | Quote scratchpads and examples improved the reported best prompt, but can hurt end-position performance | Vendor source, synthetic corpus, excluded failures, limited numeric detail |
| [Baek, Lee, Gupta, *Revisiting ICL with Long Context LMs*](https://arxiv.org/html/2412.16926) | Paper, 2024 | 18-dataset many-shot ICL comparison | Advanced example selection rarely significantly beat random selection | Many-shot ICL, not quote extraction, no billing |
| [*FeedbackEval*](https://arxiv.org/html/2504.06939) | Benchmark paper, 2025 | Multi-model feedback-driven code repair | Structured and mixed feedback outperformed weaker feedback forms, with gains flattening after two or three loops | Code repair only, not a no-feedback comparison |
| [Stechly et al., *Self-Verification Limitations*](https://arxiv.org/html/2402.08115v2) | Paper, 2024 | GPT-4 self-critique and backprompt loop | Same-model self-verification can degrade reasoning and planning output | No accessible aggregate numeric delta |
| [Li et al., *API-Bank*](https://arxiv.org/html/2304.08244) | Benchmark paper, 2023 | Execution-equivalent API effects | Retrieval and calling stages have distinct correctness and failure profiles | Fixed simulated APIs and small advanced-condition subsets |
| [Shi et al., *ToolRet*](https://arxiv.org/html/2503.01763) | Benchmark paper, 2025 | Large-catalog tool retrieval and ToolBench calling | Retrieval completeness is a bottleneck and retrieved candidates reduced GPT-3.5 ToolBench-G1 pass rate | Aggregated labels and ToolBench-specific setup |
| [Yao et al., *ReAct*](https://arxiv.org/html/2210.03629) | Paper, 2022 | PaLM-540B few-shot interactive trajectories | Observe-act loops can help interactive tasks but regress on some knowledge tasks | Simulations, best-of-six ALFWorld result, no cost measurement |
| [Schick et al., *Toolformer*](https://arxiv.org/html/2302.04761) | Paper, 2023 | GPT-J tool-use training and decoding-policy comparison | Tool-call rate is highly trigger-policy sensitive | Legacy trained model, one-call inference limit |