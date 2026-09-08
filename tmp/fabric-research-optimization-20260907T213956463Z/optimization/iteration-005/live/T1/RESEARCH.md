# Production prompt-technique selection

**Scope and decision.** This is a selective guide to technical prompting and scaffold/context boundaries for production text, reasoning, and tool-using LLMs, assessed as of 2026-09-07. There is no universal ranking. Adopt the simplest arm that wins a frozen, paired local evaluation under its full call, token, tool, retry, latency, and safety budget. The measurements below retain their original task, model, comparator, metric, and budget.

## R1. Measured effects under original conditions

| Technique | Original method, task, comparator, and result | Budget or cost | Transfer boundary |
|---|---|---|---|
| Few-shot CoT | [Wei et al.](https://arxiv.org/html/2201.11903): PaLM 540B, eight manual CoT exemplars, greedy GSM8K. Standard prompting **17.9% → 56.9%** accuracy. A post-hoc calculator reached **58.6%**. | No token, latency, or currency cost reported. | Arithmetic on an older large model, not prose quality or a current deployment. |
| Zero-shot CoT | [Kojima et al.](https://arxiv.org/html/2205.11916): `text-davinci-002`, add “Let’s think step by step,” then extract the answer. MultiArith **17.7% → 78.7%** and GSM8K **10.4% → 40.7%**. | Two stages, reasoning then extraction. Currency cost unreported. | No gain on its commonsense tasks and ineffective at smaller scales. |
| Self-consistency | [Wang et al.](https://arxiv.org/html/2203.11171): PaLM 540B GSM8K, temperature 0.7, majority vote over sampled CoT paths. Greedy CoT **56.5% → 74.4%**. | **40 outputs/run**, averaged over ten runs. No price or token total. | Requires a stable answer normalizer. Agreement can preserve a shared wrong premise. |
| Least-to-most | [Zhou et al.](https://arxiv.org/html/2205.10625): `code-davinci-002` first decomposes, then solves subproblems in sequence. SCAN length split: CoT **16% → 99.7%** least-to-most, with 8 decomposition and 14 mapping exemplars. On GSM8K items needing ≥5 steps: **39.07% → 45.23%**. | Multiple generations. No token or dollar total. | SCAN uses a constrained language. Decomposition prompts do not generally transfer across domains and can fail within a domain. |
| Tree of Thoughts | [Yao et al.](https://arxiv.org/html/2305.10601): GPT-4 generates and evaluates thought states with BFS/backtracking. On 100 hard Game of 24 problems, CoT **4.0% → 74%** success for breadth-5 ToT. | **5.5k completion tokens/problem** for ToT versus **6.7k** for 100 CoT trials in this task. Main Game of 24 plus Creative Writing experiments cost **$106**. The paper estimates ToT can use **5–100×** CoT generated tokens. | Three small GPT-4-challenging tasks, not general planning. It depends on a credible state evaluator and bounded search. |
| ReAct | [Yao et al.](https://arxiv.org/html/2210.03629): six-shot PaLM 540B plus a simple Wikipedia API on HotpotQA. Act **25.7 EM**, CoT **29.4**, ReAct **27.4**, CoT-SC **33.4**, ReAct→CoT-SC **35.1**. On WebShop’s 500 instructions, Act **30.1% → 40.0%** success. | Tool/action count, tokens, latency, and dollars unreported. | Prompt, tool quality, environment, and selection are confounded. ReAct alone lost to CoT in this QA condition. |
| ReAct in an interactive environment | Same study: ALFWorld, 134 unseen games, two trajectories/prompt. Act best-of-six **45% → 71%** ReAct best-of-six. Mean ReAct across variants was **57%**. | Six-prompt selection budget. No token or currency cost. | Best-of-six is not a fixed-prompt production estimate. Freeze before holdout testing. |
| Retrieval plus utility feedback | [Peng et al.](https://arxiv.org/html/2302.12813): ChatGPT plus LLM-Augmenter versus ChatGPT alone in customer service and WikiQA: **+32.3% usefulness**, **+12.9% humanness**, and **+10 F1** WikiQA. | Feedback can query ChatGPT twice for one answer and slows UX. No price. | Composite retrieval, utility, and revision scaffold, not evidence for generic self-critique. |
| Process supervision | [Lightman et al.](https://arxiv.org/html/2305.20050): a step-labeled reward model ranks 100 generated MATH solutions/problem and outperformed outcome-supervised RM and majority voting; it solved **78.2%** of a representative MATH test subset. | PRM800K: **800k** step labels across **75k** solutions to **12k** problems. No dollar cost. This is training plus best-of-100, not prompting. | Generalization beyond math is explicitly unknown; costly labels and possible MATH contamination limit transfer. |
| Toolformer | [Schick et al.](https://arxiv.org/html/2302.04761): GPT-J is fine-tuned on loss-filtered API-call examples. With tools disabled versus Toolformer on LAMA: SQuAD **22.1 → 33.8**, Google-RE **6.3 → 11.5**, T-REx **34.9 → 53.5**. | Up to **25k** generated examples/API, 1,024-token sequences, batch 128, ≤2k fine-tuning steps, and at most one API call/input. Tool-dependent API cost is not accounted. | Fine-tuning and a learned tool policy, not a prompt-only result. No chained or interactive tool use. |
| Chain-of-Verification | [Dhuliawala et al.](https://arxiv.org/html/2309.11495): Llama 65B drafts, plans verification questions, answers them independently without the draft, then revises. Biography FactScore **55.9 → 71.4** versus few-shot, while facts fell **16.6 → 12.3**; MultiSpanQA F1 **0.39 → 0.48**. | Many additional prompts/tokens, parallelizable; no numerical compute or price. | Does not eliminate hallucinations, addresses directly stated factual errors, and did not evaluate retrieval/tool use. |
| Reflexion | [Shinn et al.](https://arxiv.org/html/2303.11366): actor trajectory, evaluator feedback, verbal reflection retained in episodic memory. HumanEval **91% pass@1** versus reported GPT-4 **80%**; ReAct+Reflexion completed **130/134** ALFWorld tasks. | No monetary total. ALFWorld allowed up to **12** trials; programming used up to **6** self-generated tests. | Not a plain prompt comparison. WebShop did not significantly beat ReAct; self-generated tests can give false positives and diverse exploration remains difficult. |
| Context placement | [Liu et al.](https://arxiv.org/html/2307.03172): GPT-3.5-Turbo multi-document QA varied answer-passage position. Closed-book accuracy was **56.1%**; worst 20/30-document positions fell over **20 points** below it in some cases. In synthetic JSON retrieval, worst uncontextualized was **45.6%**, while GPT-3.5-Turbo 16K with query-aware contextualization reached **100%** at 300 pairs. | 500 examples/condition for the key-value probe. No price or latency. | Context inclusion is not usable-grounding evidence. Synthetic retrieval is not production answer quality. |

These values are not a common leaderboard. Models, datasets, tool environments, selection procedures, metrics, and budgets differ.

## R2. Counterevidence, regressions, and transfer limits

- **Intrinsic review is not correction.** [Huang et al.](https://arxiv.org/html/2310.01798) found intrinsic self-correction decreased performance across its reasoning evaluations without oracle feedback. On GSM8K with `gpt-3.5-turbo-0301`, standard prompting scored **76.7**; self-consistency scored **82.5/85.3/88.2** at 3/6/9 responses, versus debate **83.2/83.0** at 6/9. On CommonGen-Hard, a cited seven-call loop changed **44.0 → 67.0**, but a stronger one-call prompt scored **81.8** and its correction scaffold **75.1**. Equalize instructions, calls, and tokens before crediting a loop. Oracle labels unavailable in production do not establish repair.
- **Rationales are not audit trails.** [Turpin, Michael, and Bowman](https://arxiv.org/html/2305.04388) subjected GPT-3.5 and Claude 1.0 to controlled answer suggestions and biased demonstrations on BBH/BBQ. GPT-3.5 zero-shot CoT dropped up to **36.3 points** under a suggested answer and **18.7** under an “always A” bias. **15%** of annotated unfaithful explanations had no obvious logical or answer-consistency defect. A plausible rationale must not authorize a tool action or release.
- **Sampling is not monotonic.** A 100-item GSM8K API-model probe reports GPT-5.2 accuracy **78% → 90% → 86%** at N=1/5/20 and early-answering faithfulness **0.540 → 0.510 → 0.499**; Claude Opus 4.5 was **78% → 74.3% → 74.3%**. Its narrow dataset, API variability, and necessity-style measure limit transfer, but it rejects an untested “more samples is better” rule. [Study](https://arxiv.org/html/2601.06423)
- **Retrieved content is untrusted data.** [Greshake et al.](https://arxiv.org/html/2302.12173) demonstrate indirect prompt injection in real and synthetic LLM-integrated applications. This is a feasibility/threat-model result, not an attack-rate estimate. Retrieved text, tool output, email, and memory must not grant authority.
- **Alignment is not an authorization control.** [Wei et al., *Jailbroken*](https://arxiv.org/html/2307.02483) evaluated 30 jailbreak methods on GPT-4, Claude v1.3, and GPT-3.5 Turbo using 32 curated red-team prompts and 317 held-out synthetic prompts. New attacks succeeded on **over 96%** of evaluated prompts and **100%** of curated prompts for some attacks; an adaptive attack made Claude v1.3 **100%** vulnerable. Query/annotation cost was acknowledged but unquantified. This is an older, curated safety study, not a prevalence estimate or evidence for every deployment, but it rules out system-prompt/alignment-only authorization. Keep allowlists, typed server-side policy, postconditions, and explicit mutation approval outside the model.
- **LLM judging is measurement, not truth.** [Zheng et al.](https://arxiv.org/html/2306.05685) found GPT-4 agreement above 80% with human preferences in its data, but position and verbosity failures. In a 23-answer repetitive-list attack, failure rates were **91.3%** for Claude-v1 and GPT-3.5 and **8.7%** for GPT-4. Order-swap, padded-duplicate, known-answer, and stratified-human controls are required before using an LLM judge as a gate.

## R3. Selection rules and operational decision table

| Production situation | Start with | Add only when local paired evidence shows | Failure signal / stop rule | Paired comparator |
|---|---|---|---|---|
| Transformation, extraction, drafting | Direct instruction and typed output contract. | 0–3 representative examples improve acceptance or format adherence without copying, leakage, or budget regression. | Schema failure, omitted requirement, example-order sensitivity. | Same prompt without examples, frozen decoding. |
| Exact/executable multistep answer | Direct answer, then CoT. | Exact-pass gain across difficulty strata at a fixed output cap. | Longer output without pass gain, answer reversal, parser failure. | Direct-answer prompt with equal output cap. |
| Independently checkable subproblems | CoT or direct solution. | Least-to-most improves difficult cases and each decomposition/subanswer validates. | Invalid decomposition, accumulated context, uncheckable dependency. | Direct or CoT prompt under equal output/call cap. |
| Closed-answer reasoning | CoT with canonical parser. | Self-consistency improves accepted-task rate at N=1 and then only if marginal gain pays for budget. | Low consensus, shared unsupported premise, cost/latency breach. | N=1/5/10/20, same model, prompt, parser, and seeds. |
| Bounded combinatorial search | Direct/CoT. | ToT wins where the state evaluator distinguishes good states. | Branch/depth/token cap reached or evaluator misranks states. | Equal total token and call budget with CoT/self-consistency. |
| Fresh facts or private state | Retrieval or one narrow typed tool call with citations/state readback. | Multi-observation loop improves grounded answer or completed state. | Unsupported citation, stale result, repeated call, hidden tool error. | Closed-book and one-tool-call baselines. |
| Code, structured output, factual answer with oracle | Deterministic validator. | CoVe/Reflexion-like repair gets a specific external failure and lowers validated error. | Repeated failure, false-positive self-test, unavailable validator, retry cap. | One attempt plus same validator and postcondition. |
| Consequential tool action | Allowlisted typed tools, server-side policy, deterministic postcondition, explicit mutation approval. | Trace/repair lowers measured invalid-action rate. | Invalid argument, state drift, unverified success, context requests authority. | Same episode with bounded one-attempt control. |
| Long-document QA/synthesis | Retrieve, structure provenance, place relevant excerpts near task. | Position testing shows contextualization/compression improves answer and citation accuracy. | First/middle/last placement changes answer or citations. | Identical evidence at several positions and lengths. |
| Open-ended quality | Blinded human sample. | Judge calibration against humans passes adversarial controls. | Winner flips after order swap or padded duplicate. | Order-swapped pairwise judge plus stratified human audit. |

### Reusable paired evaluation artifact

```yaml
evaluation:
  name: prompt-technique-decision-gate
  freeze:
    model: "<provider/model/version>"
    system_prompt_hash: "<sha256>"
    decoding: {temperature: 0, top_p: 1, max_output_tokens: 1200}
    tool_schema_hash: "<sha256-or-none>"
    retrieval_index_version: "<id-or-none>"
    limits: {max_model_calls: 3, max_tool_calls: 3, max_wall_seconds: 30, max_total_tokens: 8000}
  arms:
    - {id: baseline, change: "best direct production prompt"}
    - {id: candidate, change: "one technique only", stop_conditions: "observable bounded conditions"}
  cases:
    split: {development: "predeclared", frozen_holdout: "predeclared"}
    strata: [normal, known_hard, long_input, adversarial_or_malformed, tool_failure_or_stale_data]
  controls:
    - "randomize arm order; blind human evaluator to arm"
    - "for context, move identical evidence first/middle/last"
    - "for reasoning, add irrelevant suggestion and option/document-order swap"
    - "for judges, use answer-order swap, padded duplicate, known-answer set, stratified human audit"
  record_per_case: [case_id, stratum, arm, final_output, task_pass, schema_valid, grounded_or_validator_pass, harmful_action_attempt, model_calls, tool_calls, input_tokens, output_tokens, p50_latency_ms, p95_latency_ms, estimated_cost, failure_code]
  promote_only_if:
    - "paired frozen-holdout primary-metric delta and confidence interval meet a predeclared product threshold"
    - "no safety-critical stratum regresses"
    - "schema/grounding and invalid-action guardrails do not regress"
    - "total accepted-task cost and p95 latency fit the declared service budget"
  rollback_if:
    - "gain disappears after equalizing calls, tokens, tools, retries, and instructions"
    - "gain needs oracle labels or feedback unavailable in production"
    - "a perturbation changes the answer materially or the validator/judge fails its controls"
```

Set the decision threshold before testing. Report total cost per accepted task only when input/output, cache/reasoning, tools, retries, branches, and verification are included. Otherwise identify the missing components as unknown.

## Unknowns

- No retained study supplies comparable current production price, latency distribution, or total cost per accepted task.
- Older benchmark lifts do not transfer estimates to current provider revisions, proprietary system prompts, organization data, or tool schemas.
- Tool-loop results confound prompt, environment, retrieval/tool quality, and sometimes prompt selection; Toolformer and process supervision also include training.
- Performance and explanation faithfulness are separate properties and need separate tests.
- Current robustness to injection, retrieval poisoning, and tool authorization must be measured in the deployed architecture.

## Source appendix

| Source | Direct URL | Type / date | Method or evidence form | Supported claim retained | Important limitation |
|---|---|---|---|---|---|
| Wei et al., *Chain-of-Thought Prompting* | https://arxiv.org/html/2201.11903 | Primary paper, 2022 | PaLM 540B, eight CoT exemplars, GSM8K comparison | 17.9→56.9 CoT and 58.6 calculator result | Older arithmetic benchmark, no cost. |
| Kojima et al., *Large Language Models are Zero-Shot Reasoners* | https://arxiv.org/html/2205.11916 | Primary paper, 2022 | `text-davinci-002`, two-stage zero-shot CoT | Arithmetic gains and non-transfer/error signals | Older model, no price, not general prose. |
| Wang et al., *Self-Consistency* | https://arxiv.org/html/2203.11171 | Primary paper, 2022 / ICLR 2023 | Sample-and-vote CoT paths on GSM8K | 56.5→74.4 at 40 paths | High generation work and normalizable answers required. |
| Zhou et al., *Least-to-Most Prompting* | https://arxiv.org/html/2205.10625 | Primary paper, 2022 / ICLR 2023 | Two-stage decomposition and sequential solve | SCAN 16→99.7 and GSM8K hard-slice result | Domain-specific decomposition prompts. |
| Yao et al., *ReAct* | https://arxiv.org/html/2210.03629 | Primary paper, 2022 / ICLR 2023 | PaLM 540B with API/interactive environments | HotpotQA, ALFWorld, WebShop contrasts | Tool quality and prompt selection confounded. |
| Yao et al., *Tree of Thoughts* | https://arxiv.org/html/2305.10601 | Primary paper, 2023 / NeurIPS 2023 | GPT-4 state generation/evaluation and BFS/DFS | Game of 24 4→74 and token/cost context | Small task set, expensive search, evaluator dependency. |
| Peng et al., *Check Your Facts and Try Again* | https://arxiv.org/html/2302.12813 | Primary paper, 2023 | Retrieval, utility feedback, revision | Customer-service and WikiQA gains | Composite scaffold and extra-call UX cost. |
| Liu et al., *Lost in the Middle* | https://arxiv.org/html/2307.03172 | Primary paper, 2023 | Position-controlled QA and synthetic key-value retrieval | Position degradation and contextualization contrast | 2023 models and synthetic retrieval. |
| Schick et al., *Toolformer* | https://arxiv.org/html/2302.04761 | Primary paper, 2023 | Loss-filtered API examples and GPT-J fine-tuning | LAMA tool-enabled contrasts | Trained policy, no chained interaction, API cost omitted. |
| Lightman et al., *Let’s Verify Step by Step* | https://arxiv.org/html/2305.20050 | Primary paper, 2023 | Step-labeled reward model ranks generated math solutions | 78.2% MATH subset and PRM advantage | Human labels, training, math-only and contamination risk. |
| Dhuliawala et al., *Chain-of-Verification* | https://arxiv.org/html/2309.11495 | Primary paper, 2023 | Draft, independent fact checks, revise | Biography FactScore and MultiSpanQA gains | Extra prompts, direct factual errors only, no retrieval evaluation. |
| Shinn et al., *Reflexion* | https://arxiv.org/html/2303.11366 | Primary paper, 2023 / NeurIPS 2023 | External-feedback reflection in episodic memory | HumanEval/ALFWorld results | Not prompt-only, false-positive tests and exploration limits. |
| Huang et al., *LLMs Cannot Self-Correct Reasoning Yet* | https://arxiv.org/html/2310.01798 | Primary paper, 2023 | Intrinsic review, sampling, debate under response-count comparisons | Self-correction regression, debate comparison, prompt confound | Reasoning benchmarks and dated model versions. |
| Turpin, Michael, Bowman, *Language Models Don’t Always Say What They Think* | https://arxiv.org/html/2305.04388 | Primary paper, 2023 | Controlled prompt-bias and explanation annotation | CoT rationalization and faithfulness failures | Constructed interventions and specific models/tasks. |
| Greshake et al., *Not What You’ve Signed Up For* | https://arxiv.org/html/2302.12173 | Security paper, 2023 | Indirect-injection demonstrations | Retrieved content is an untrusted-input boundary | Feasibility/threat model, not attack prevalence. |
| Wei et al., *Jailbroken* | https://arxiv.org/html/2307.02483 | Primary paper, 2023 | 30 jailbreak methods across three aligned models | Alignment-only control insufficiency | Curated attacks, old models, no prevalence or cost estimate. |
| Zheng et al., *Judging LLM-as-a-Judge* | https://arxiv.org/html/2306.05685 | Primary paper, 2023 | Human-preference agreement and adversarial judge-bias tests | Judge controls for position/verbosity bias | Dated evaluators/data, not universal calibration. |
| *Does Inference Scaling Improve Reasoning Faithfulness?* | https://arxiv.org/html/2601.06423 | Primary preprint, 2026 | 100-item GSM8K multi-model sample-count/early-answering analysis | Non-monotonic sampling warning | Narrow data, API variation, necessity-style faithfulness. |
