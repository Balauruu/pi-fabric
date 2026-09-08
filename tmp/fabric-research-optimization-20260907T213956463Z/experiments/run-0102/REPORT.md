# Production Prompt-Technique Selection Guide

**Decision date:** 2026-09-07. **Scope:** production text, reasoning, context/RAG, and tool-using LLM scaffolds. This is a selective synthesis of the retained original sources, not an exhaustive review or a universal ranking. The verifier qualifies R1 and R3 and supports R2 with qualification. No retained study supplies a matched, current-production comparison of total cost per accepted task across techniques.

## Answer and decision boundary

**R1.** Measured gains exist, but only inside materially different harnesses. Reasoning prompts improved particular arithmetic benchmarks; retrieval/action scaffolds improved some tool tasks and degraded others; context position and exemplar order can dominate outcomes; verification helps only when its evidence is independent enough to detect errors. Each measurement below retains its original model, task, comparator, and budget.

**R2.** The strongest counterevidence is within-study: CoT was small or negative on easy tasks and weaker models, ReAct lost to CoT on HotPotQA, unguided reflection regressed, prompt ordering failed to transfer across model sizes, and RAG versus long context reverses by model/task/context length. No independent retained replication demonstrates transfer to a current deployment.

**R3.** Adopt a technique only as a paired local change against the current scaffold, with frozen model and environment, a final-state validator, complete cost/latency accounting, and protected safety strata. The table and artifact below are **operational inferences**, not a measured package-wide policy.

## R1 — measured effects, not cross-study rankings

| Intervention | Measurement under original conditions | Result | Cost / applicability boundary |
|---|---|---|---|
| Few-shot CoT | [Wei et al.](https://arxiv.org/html/2201.11903#A2.T2): eight CoT demonstrations versus standard prompting, greedy decoding, PaLM-540B, five arithmetic datasets. | GSM8K **17.9% → 56.9%**; SVAMP **69.4% → 79.0%**. Code-davinci-002 GSM8K **19.7% → 63.1%**. The calculator-assisted GSM8K figure is **58.6%**, not 58.1%. | No dollar/latency measurement. The reported prompt is part of the intervention. |
| Zero-shot CoT | [Kojima et al.](https://arxiv.org/html/2205.11916#S4.T2): append “Let’s think step by step,” then a separate extraction prompt. | text-davinci-002: MultiArith **17.7% → 78.7%**, GSM8K **10.4% → 40.7%**. PaLM-540B GSM8K **12.5% → 43.0%**. | Two-stage protocol, hence an extra call and rationale tokens. No price reported. |
| Decomposition / least-to-most | [Zhou et al.](https://arxiv.org/html/2205.10625#S3): code-davinci-002 decomposes then solves sequential subproblems. | GSM8K CoT **60.97% → 62.39%** overall; problems with at least five expected steps **39.07% → 45.23%**. SCAN length split **99.7%**. | Multiple dependent calls. No compute/cost result. |
| Self-consistency | [Wang et al.](https://arxiv.org/html/2203.11171): sampled CoT paths and majority answer selection. The comparable table is retained in [Kojima et al.](https://arxiv.org/html/2205.11916#S4.T2). | PaLM-540B few-shot CoT GSM8K **56.9% → 74.4%**. | Protocol samples **40** paths. It is not comparable to greedy decoding on inference workload. |
| Factual chain-of-verification | [Dhuliawala et al.](https://arxiv.org/html/2309.11495#S4.T1): Llama-65B, greedy decoding, few-shot baseline versus draft/verify/revise variants. | Wikidata list precision **0.17 → 0.36**, hallucinated entities **2.95 → 0.68**; MultiSpanQA F1 **0.39 → 0.48**; biography FactScore **55.9 → 71.4**. | Factored execution is explicitly more computationally expensive, though parallelizable. It did not use retrieval/tools. |
| Exemplar order | [Lu et al.](https://arxiv.org/html/2104.08786#S4): all 24 orders of four demonstrations across 11 classification datasets; GPT-2 0.1B–1.5B and GPT-3 2.7B/175B. | SST-2 permutations range from near **50%** to above **85%**. Entropy selection reports **13% mean relative** improvement over all-order baseline and up to **30% relative** in high-variance cases. | GPT-3 used 256 validation examples; 175B used two seeds × 12 permutations for cost. No dollar total. |
| Context placement / repeated query | [Liu et al.](https://arxiv.org/html/2307.03172v3#S2.SS3): answer document moved among 10/20/30 documents in NQ-Open; synthetic 75/140/300 key-value pairs, 500 examples/setting. | Worst 20/30-document GPT-3.5-Turbo cases lose **>20 points**, sometimes below **56.1%** closed-book. On synthetic 300-pair retrieval, duplicated query reached **100%** versus **45.6%** in its worst normal-prompt condition. | The duplicated-query result minimally helped multi-document QA and slightly worsened some placements. A full GPT-4 run was estimated at **>$6,000**. |
| RAG versus long context | [LaRA](https://arxiv.org/html/2502.09977#S4): 2,326 long-document QA cases, 32K/128K, seven open and four proprietary models, GPT-4o judging with limited human agreement check. | At 32K, LC averages **2.4 points** above RAG; at 128K RAG averages **3.68 points** above LC. At 128K, RAG leads LC by **6.48** on Llama-3.2-3B-Instruct and **38.12** on Mistral-Nemo-12B, while GPT-4o and Claude-3.5-Sonnet lead RAG on reasoning by **9.09** and **8.98**. | These are reversals, not a winner. Scope is long-document QA. |
| Compression and strict schemas | [LLMLingua](https://arxiv.org/html/2310.05736) reports up to **20×** compression with little aggregate loss across GSM8K, BBH, ShareGPT, and ArXiv-March23. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs#structured-outputs-vs-json-mode) specifies `strict: true` schema adherence versus JSON-mode validity. | Compression is a measured aggregate claim. Strict schema is a documented API contract, **not** a semantic-quality measurement. | No portable compression dollar/quality result. Strict mode still needs refusal/incomplete-output handling and semantic validation. |
| ReAct / observation grounding | [Yao et al.](https://arxiv.org/html/2210.03629v3): PaLM-540B, manually composed few-shot prompts and constrained Wikipedia API. | HotPotQA EM: Act **25.7**, ReAct **27.4**, CoT **29.4**. FEVER: **58.9**, **60.9**, **56.3**. Hybrids: ReAct→CoT-SC **35.1 EM** HotPotQA; CoT-SC→ReAct **64.6%** FEVER. Caps: 7/5 steps because more did not help. | Same paper, not a common comparison with reasoning studies. |
| ReAct in stateful/web tasks | Same source: ALFWorld 134 unseen games, six two-trajectory prompt permutations, greedy decoding; WebShop 500 instructions, one-shot. | ALFWorld best ReAct **71%**, Act **45%**, BUTLER **37%**; ReAct-IM **53%**. WebShop Act **30.1%**, ReAct **40.0%** success; attribute score **62.3 → 66.6**. | ALFWorld result uses best-of-six ReAct, best-of-six Act, best-of-eight BUTLER selection. WebShop does not account for token/tool cost. |
| Tool documentation | [Hsieh et al.](https://arxiv.org/html/2308.00675): usually gpt-3.5-turbo, docs plus 0–16 demonstrations over ScienceQA, TabMWP, NLVRv2 and 50 renamed-GCP CLI questions. | Documentation-only zero-shot was reported on par with **16-shot** TabMWP and **12-shot** NLVRv2. CLI tasks used at least two commands from 200 tools and TF-IDF-retrieved docs. | No dollar/token cost. Supports docs plus relevance filtering, not a full static catalog. |
| Planning and feedback-conditioned repair | [Plan-and-Act](https://arxiv.org/html/2503.09572): WebArena-Lite final-state success, trained planner plus executor changes. Base executor **9.85% → 29.63%** with planner; full system **57.58%**, CoT adding **4.36 points**. [Reflexion](https://arxiv.org/html/2303.11366): GPT-4 HumanEval agent with up to six generated/executed tests and one memory. | Reflexion reports Python **91% pass@1** versus then-reported GPT-4 **80%**; on 50 hardest HumanEval-Rust translations, unguided reflection **52%** versus base **60%**. | Plan-and-Act also changes 923 action trajectories, 10,000 plans, and 5,000 failure-derived pairs, so it is not prompt-only causality. Repair result depends on executable feedback. |
| Tool-stage reliability | [API-Bank](https://arxiv.org/html/2304.08244): 314 retained dialogues/753 calls after discarding 21.5% of 400 annotated dialogues. | gpt-3.5-turbo-0613 overall call correctness **47.16%** and gpt-4-0613 **60.24%**. GPT-4 errors: **67.86%** failed retrieval, **17.86%** invalid format. | Evaluate retrieval, serialization, execution, and final task success separately. Annotation cost was **$8/dialogue**, not operating cost. |

## R2 — counterevidence and transfer limits

- **Reasoning is conditional.** CoT effects emerged at roughly 100B+ in Wei et al.’s tested models and were small or negative on easy one-step MAWPS. Exact zero-shot wording ranged from **78.7%** (“Let’s think step by step”) to **13.1%** (“It’s a beautiful day”) on MultiArith/text-davinci-002, against **17.7%** zero-shot ([Kojima Table 4](https://arxiv.org/html/2205.11916#S4.T4)). Decompositions had copying, omission, and concatenation errors ([Zhou Appendix](https://arxiv.org/html/2205.10625#S7.SS4)).
- **Self-critique is not an accept/reject oracle.** [Valmeekam et al.](https://arxiv.org/html/2402.08115v2#S5) tested GPT-4 on 100 instances each of Game of 24, graph coloring, and STRIPS planning: LLM-verifier loops decreased performance and critique sometimes worsened it. Their compared appendix estimates are **$0.47/problem** for 100 CoT prompts and **$0.74/problem** for Tree-of-Thought. This does not establish current pricing or general cost. Use executable, retrieval-grounded, or human validation for consequential decisions.
- **Tool scaffolds are brittle.** ReAct lost to CoT on HotPotQA and prompt-only ReAct was worst of four methods for PaLM-8B/62B. [Brittle ReAct](https://arxiv.org/html/2405.13966#S5) reports GPT-3.5-Instruct ALFWorld **44.7% → 61.9%** under one variation, while Claude Opus falls **56.6% → 30.0%** under another; its 134-instance run used about **14M input** and **150K output** tokens because the prompt was resent each action. This counters any claim that a ReAct format or thought trace is universally causal.
- **Context is conditional and can be hostile.** Position effects are not uniform across models; duplicating a query fixes synthetic retrieval more than multi-document reasoning. Compression may remove a protected qualifier, permission, or citation. In [Rag-n-Roll](https://arxiv.org/html/2408.05025#S7), most indirect attacks in its LangChain QA configurations settled near **40%** malicious-response success, or **60%** under its ambiguous-answer convention. This is a system-specific attack rate, not a universal one. Treat retrieved text as data and gate consequential tools outside the prompt.
- **Evidence and accounting limits.** Anthropic’s [long-context experiment](https://www.anthropic.com/research/prompting-long-context) is controlled vendor evidence, not independent replication: Claude Instant 1.2 on 70K/95K synthetic government-document MCQ collages, answer passage at beginning/middle/end, with four strategies. Source-only questions passed about **90%** and the remaining 10% were excluded. Quote extraction helped every head-to-head comparison with latency cost; Claude 2 recall **0.939 → 0.961** (stated 36% error reduction). It does not establish a provider-neutral production result. No retained source matches provider, region/load, retry policy, tools, task mix, and accepted-task denominator to compare total cost or latency across techniques.

## R3 — operational selection rules

The following are recommendations inferred from R1/R2, not universal measured rankings.

## Operational decision table

| Technique | Use only when | Failure signal | Paired local test | Cost / latency |
|---|---|---|---|---|
| Direct structured instruction + native schema | Task is simple extraction/routing and schema is supported. | Schema-valid but semantically invalid fields, refusal, or incomplete output. | Current free text/parser vs strict schema at same model/temperature/token cap; score semantic fields and side effects. | Native constraint overhead not measured here. |
| Zero/few-shot CoT | Multi-step task has an objective final checker and the deployed model can benefit. | Baseline-correct → wrong, gain disappears on holdout, or prompt/example variance exceeds gain. | Direct vs exact CoT/template and separately varied exemplar sets on frozen tasks. | Extra extraction call for zero-shot; long examples/rationales. No price reported. |
| Least-to-most | Deep tasks have a stable subproblem schema and subproblems can be checked. | Omitted/copied/concatenated subproblems or no final-success gain. | CoT vs decomposition with subproblem and final validators. | Multiple dependent calls. Not measured in dollars. |
| Self-consistency | Answers can be normalized and costly errors justify fan-out. | Low vote margin, shared systematic error, or gain below workload budget. | Greedy CoT vs same prompt with fixed candidate count and deterministic answer aggregation. | 40 sampled paths in the retained protocol. |
| Claim splitting / CoVe | Factual precision matters and verification questions can be independently grounded. | Unsupported claims persist or correct claims are removed. | Draft-only vs verify/revise with claim-level external or human checks. | More stages; authors call factored protocol more expensive. |
| Exemplar order / context layout | Few-shot or long-context production case has a held-out dev set. | Order/position range is material, middle retrieval fails. | Random/current vs dev-selected order; start/middle/end answer placements at production length. | Search/sweep can be factorial; 175B study constrained seeds/orders for compute. |
| RAG, LC, or compression | Long-document task and corpus/trust boundary are known. | Evidence omission, position failure, injection following, protected-span loss, or budget breach. | Full context vs top-k RAG vs compressed top-k, by task type and clean/distractor/injection strata. | Input cost may dominate; no portable per-request cost. |
| ReAct / tool grounding | External observation resolves uncertainty, tools are sandboxed, and final state is checkable. | Invalid calls, repeated actions, unsupported claims, or action-budget timeout. | Same tools/docs/state and caps: action-only vs grounded loop; validate stage and final state. | Bounded steps required. Published caps 7/5 for QA; token cost often unreported. |
| Retrieved tool docs / typed schemas | Catalog is large and relevant tools can be filtered. | Top-k retrieval misses required tool, invalid arguments, or tool choice is wrong. | Docs+retrieval vs examples/static catalog; record retrieval recall, chosen-tool and argument validity. | TF-IDF retrieval/truncation confounds the source result. |
| Plan and verified repair | Long-horizon coordination fails, or an executable verifier supplies actionable failure. | Fixed plan conflicts with new state, false pass, retry loop, unsafe attempt. | Bounded plan/replan or one repair vs baseline, with identical action/retry budgets and final-state grader. | Planning and retry cost not comparable. Do not use unguided reflection. |

## Reusable paired local evaluation artifact

```yaml
experiment: prompt_or_scaffold_release_gate
purpose: "Decide one named technique change, not a universal winner"
fixed:
  model: "<provider/model/version/date>"
  decoding: {temperature: 0, top_p: 1, max_output_tokens: 1200}
  system_prompt_hash: "<sha256>"
  prompt_template_hash: "<sha256>"
  tools_and_schemas_hash: "<sha256-or-none>"
  retrieval: {corpus_snapshot: "<id-or-none>", top_k: 5, reranker: "<version-or-none>"}
  environment_snapshot: "<state/container/id>"
  budgets: {max_turns: 8, max_tool_calls: 12, retries: 0, timeout_s: 90}
variants:
  A: {name: baseline, prompt_hash: "<sha256>", scaffold: "<current>"}
  B: {name: candidate, prompt_hash: "<sha256>", scaffold: "<single named change>"}
tasks:
  source: "versioned production-like holdout plus historical failures"
  strata: [common, high-impact, edge, tool-required, tool-not-required, clean-retrieval, injected-retrieval]
  each: {id: "<stable-id>", input: "<redacted fixture>", initial_state: "<clean reset>", expected_outcome: "<oracle/pass condition>"}
  graders: [deterministic_final_outcome, tool_trace_constraints, safety_policy, groundedness_or_calibrated_blinded_rubric]
protocol:
  randomize_variant_order_within_task: true
  trials_per_task_per_variant: "<predeclare; at least 3 if stochastic>"
  isolate_and_reset_every_trial: true
  preserve_all_transcripts: true
  record: [task_id, stratum, condition, seed, final_success, grader_reason, pass_at_1, pass_at_k_if_relevant, schema_valid, semantic_field_valid, grounded_citation_correct, unsupported_claim, tool_selected, tool_schema_valid, tool_error, actions, retries, irreversible_action_attempt, input_tokens, output_tokens, reasoning_tokens, tool_calls, tool_latency_ms, wall_latency_ms, monetary_cost, timeout_or_budget_stop]
analysis:
  primary: "paired per-task delta in final task_success"
  report: [paired_delta_each_secondary_metric, predeclared_paired_bootstrap_CI_or_exact_test, stratum_results, failure_taxonomy, all_prompt_seed_variants]
decision:
  predeclare: "minimum outcome gain and maximum safety, cost, latency, and validity regression"
  ship_only_if: "B meets the predeclared rule overall and in protected strata"
  rollback_if: "any hard safety or tool-state condition regresses"
```

This artifact follows the retained [Anthropic agent-evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): distinguish pass@1 from pass@k, validate tasks and graders, retain transcripts, and account for token/cost/latency. Proposed repetition and promotion thresholds are placeholders to be set locally, not evidence-derived universal values.

## Coverage and actual stop reason

- **R1: qualified.** Retained measurements cover reasoning, verification, examples, context, schemas, retrieval, and tool-agent interventions under their stated conditions. The verifier corrected the CoT GSM8K result to **56.9%** and requires the calculator condition for **58.6%**. Tool-documentation table numbers beyond the conditions reported here were not foregrounded because table-level confirmation remained a gap.
- **R2: supported with qualification.** The counterevidence is strongest within the original harnesses. Transfer to current model/provider versions, real task mix, tool permissions, prompt rendering, pricing, and production load is unmeasured.
- **R3: supported with qualification.** The rules and artifact are bounded inferences from the evidence and evaluation methodology.
- **Actual stop reason:** the workflow stopped after the four bounded evidence assignments and direct verification of the retained original sources and decisive passages. It detected and corrected the CoT numerical mismatch and left a table-level tool-documentation confirmation gap. Further broad search would not resolve the decisive cross-harness cost, latency, or deployment-transfer gaps. No local paired experiment was run.

## Retained-source appendix

Each URL below was retained as an inspected original source. Duplicates across streams are consolidated. “Method/result” states the claim retained above; “limit” prevents broader transfer.

| Original inspected URL | Claims / method / result retained | Important limitation |
|---|---|---|
| [Wei et al., Chain-of-Thought](https://arxiv.org/html/2201.11903) | Eight-example CoT, PaLM-540B arithmetic results; scale/easy-task limits; SayCan context. | Legacy models and hand-authored prompts; no production cost. |
| [Kojima et al., Zero-Shot Reasoners](https://arxiv.org/html/2205.11916) | Trigger/extraction protocol, arithmetic gains, wording sensitivity, comparative self-consistency table. | Exact template and model specific. |
| [Zhou et al., Least-to-Most](https://arxiv.org/html/2205.10625) | Sequential decomposition results and interface errors. | code-davinci-002 benchmarks, no cost. |
| [Wang et al., Self-Consistency](https://arxiv.org/html/2203.11171) | 40-path sampled-vote method. | Fan-out is inseparable from reported gain. |
| [Madaan et al., Understanding CoT](https://arxiv.org/html/2212.10001) | Retained controlled CoT mechanism/transfer context. | Not used for a foreground numeric claim. |
| [Weng et al., Self-Verification](https://arxiv.org/html/2212.09561v4) | Retained positive self-verification/bias context. | Not used for a foreground numeric claim. |
| [Dhuliawala et al., Chain-of-Verification](https://arxiv.org/html/2309.11495) | Same-model factual verify/revise benchmarks and measured results. | No retrieval/tool grounding; more compute. |
| [Valmeekam et al., Self-Verification Limitations](https://arxiv.org/html/2402.08115v2) | GPT-4 verifier/critique regression and stated comparison costs. | Planning benchmarks and compared historical pricing. |
| [Lu et al., Fantastically Ordered Prompts](https://arxiv.org/html/2104.08786) | Exhaustive order experiment and transfer failure across GPT-2 sizes. | Classification tasks and constrained seed/sample design. |
| [Liu et al., Lost in the Middle](https://arxiv.org/html/2307.03172v3) | Placement and duplicated-query experiments; GPT-4 cost estimate. | NQ/synthetic retrieval, not universal context behavior. |
| [Jiang et al., LLMLingua](https://arxiv.org/html/2310.05736) | Up-to-20× aggregate compression claim. | No universal quality/cost guarantee or protected-span result. |
| [Zhang et al., LaRA](https://arxiv.org/html/2502.09977) | 2,326-case RAG/LC reversals by context/model/task. | Long-document QA and GPT-4o judge. |
| [De Stefano et al., Rag-n-Roll](https://arxiv.org/html/2408.05025) | LangChain indirect-prompt-manipulation attack outcomes. | System/configuration-specific attack rates. |
| [OpenAI, Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Strict-schema versus JSON-mode contract and handling conditions. | Documentation, not empirical semantic-quality evidence. |
| [Yao et al., ReAct paper](https://arxiv.org/html/2210.03629v3) | PaLM-540B QA, ALFWorld, WebShop, caps, trajectory analysis. | Prompt selection and legacy/harness-specific results. |
| [Yao et al., ReAct implementation](https://github.com/ysymyth/ReAct) | Prompt/notebook and 500-sample evaluation-practice context. | Implementation context, not independent performance evidence. |
| [Shinn et al., Reflexion paper](https://arxiv.org/html/2303.11366) | HumanEval test-conditioned repair and unguided-reflection ablation. | Then-reported GPT-4 baseline and benchmark harness. |
| [Shinn et al., Reflexion implementation](https://github.com/noahshinn/reflexion) | Trial configuration and logged-run availability. | Implementation context, not independent performance evidence. |
| [Hsieh et al., Tool Documentation](https://arxiv.org/html/2308.00675) | Documentation/demo setup and 200-tool TF-IDF retrieval condition. | Documentation-only equivalence table numbers were not foregrounded pending table-level confirmation. |
| [Li et al., API-Bank](https://arxiv.org/html/2304.08244) | Dataset filter, stage correctness, and GPT-4 error shares. | API benchmark, not end-to-end production cost. |
| [Kang et al., Plan-and-Act](https://arxiv.org/html/2503.09572) | WebArena-Lite results and planner/training/data confound. | Cannot isolate prompt wording. |
| [On the Brittle Foundations of ReAct](https://arxiv.org/html/2405.13966) | ALFWorld prompt-sensitivity counterevidence and token accounting. | Small/uneven model denominators and specific harness. |
| [Anthropic, Prompting Long Context](https://www.anthropic.com/research/prompting-long-context) | 70K/95K controlled position/quote study and stated recall result. | Vendor evidence, synthetic collages, filtered questions. |
| [Anthropic, Demystifying Agent Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Evaluation-method guidance for pass metrics, graders, transcripts, and accounting. | Method guidance, not a technique-effect experiment. |
| [Anthropic, Define Success Criteria](https://docs.anthropic.com/en/docs/build-with-claude/develop-tests) | Retained task-specific, multidimensional-evaluation guidance. | Guidance, not a technique-effect experiment. |

For fuller source notes and verification dispositions, see [RESEARCH.md](RESEARCH.md), [reasoning stream](streams/reasoning-prompt-effects.md), [context stream](streams/context-and-text-effects.md), [tool-agent stream](streams/tool-agent-effects.md), and [selection stream](streams/selection-rules-and-local-eval.md).