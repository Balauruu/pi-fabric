# Production prompt-technique selection

**Decision scope and date.** This guide covers technical prompting and scaffold/context boundaries for production text, reasoning, and tool-using LLMs, assessed as of 2026-09-07. It does not provide a universal ranking. Each measurement below remains bound to its original model, task, comparator, metric, and budget. None reports a comparable production cost per accepted task.

## R1. Measured effects under their original conditions

| Technique | Source-bound measurement | Compute/cost condition | What it supports, and no more |
|---|---|---|---|
| Few-shot CoT | In [Wei et al.](https://arxiv.org/html/2201.11903), PaLM 540B with eight manually written CoT exemplars and greedy decoding scored **17.9% → 56.9%** accuracy on GSM8K. Adding a post-hoc calculator reached **58.6%**. | No token, latency, or currency cost reported. | Test CoT on multi-step, objectively scored tasks. This is not a result for prose quality or a current model. |
| Zero-shot CoT | In [Kojima et al.](https://arxiv.org/html/2205.11916), adding “Let’s think step by step” to `text-davinci-002` changed MultiArith **17.7% → 78.7%** and GSM8K **10.4% → 40.7%**. | Reasoning generation plus answer-extraction stages. No dollar cost reported. | A cheap candidate when no representative demonstrations exist, subject to a local direct-answer control. |
| Self-consistency | In [Wang et al.](https://arxiv.org/html/2203.11171), PaLM 540B on GSM8K at temperature 0.7 changed greedy CoT **56.5% → 74.4%** when final answers from sampled paths were majority-voted. | **40 sampled outputs/run**, averaged over ten runs. No price or token total. | Use only for a normalizable answer space and after comparing marginal gain against a bounded sample count. |
| Interleaved reasoning/actions | In [Yao et al.](https://arxiv.org/html/2210.03629), six-shot PaLM 540B plus a simple Wikipedia API on HotpotQA scored Act-only **25.7 EM**, CoT **29.4**, ReAct **27.4**, CoT self-consistency **33.4**, and ReAct→CoT-SC **35.1**. On WebShop’s 500 instructions, Act scored **30.1%** success and ReAct **40.0%**. | Tool/action counts, token total, latency, and dollars were not reported. | Tools can help when an observation changes the answer or state. ReAct alone did not beat CoT in this QA condition. |
| Interactive-agent prompt | The same ReAct study reports ALFWorld on 134 unseen games: Act best-of-six prompts **45%** success and ReAct best-of-six **71%**. Mean ReAct over those prompt variants was **57%**. | The reported maximum selects among six prompts. | Freeze a prompt before holdout testing. “Best-of-six” is not a single fixed-prompt production estimate. |
| External knowledge plus utility feedback | [Peng et al.](https://arxiv.org/html/2302.12813) evaluated ChatGPT plus LLM-Augmenter on customer-service dialog and WikiQA. It reports **+32.3% usefulness**, **+12.9% humanness**, and **+10 absolute F1** on WikiQA against closed-book ChatGPT. | Feedback can query ChatGPT twice for one response, with slower UX. No dollar cost. | Retrieval plus an independent utility signal is evidence-distinct from generic “self-review.” |
| Context placement | [Liu et al.](https://arxiv.org/html/2307.03172) varied answer-bearing passage position for GPT-3.5-Turbo multi-document QA. Closed-book accuracy was **56.1%**; worst 20/30-document positions fell below it by **more than 20 points** in some cases. In synthetic JSON key-value retrieval, the worst uncontextualized condition was **45.6%**, while GPT-3.5-Turbo 16K with query-aware contextualization reached **100%** at 300 pairs. | 500 examples/condition for the key-value probe. No price or latency. | Context inclusion is not evidence of usable context. Test placement and distinguish synthetic retrieval from grounded answer quality. |

These figures cannot be averaged or ranked: they use different models, datasets, prompts, sample budgets, tool environments, selection procedures, and metrics.

## R2. Counterevidence, regressions, and transfer limits

- **Intrinsic review is not correction.** [Huang et al.](https://arxiv.org/html/2310.01798) report that, without oracle feedback, self-correction decreased performance across their reasoning evaluations. On GSM8K with `gpt-3.5-turbo-0301`, one-response standard prompting scored **76.7**; self-consistency scored **82.5/85.3/88.2** with 3/6/9 responses, while multi-agent debate scored **83.2** with 6 and **83.0** with 9. The equal-response comparator favors sampling, not debate. On CommonGen-Hard, a cited 7-call setup changed **44.0 → 67.0**, but a stronger one-call prompt scored **81.8** and the correction scaffold on it **75.1**. Equalize instructions, calls, and tokens before crediting a loop.
- **A rationale is not a trustworthy audit trail.** [Turpin, Michael, and Bowman](https://arxiv.org/html/2305.04388) exposed GPT-3.5 and Claude 1.0 to controlled answer suggestions and biased demonstrations on BBH/BBQ. On bias-contradicting cases, GPT-3.5 zero-shot CoT fell up to **36.3 points** under a suggested answer and **18.7 points** under an “always A” bias; annotated explanations could omit the causal bias, including **15%** without an obvious logical or answer-consistency defect. Do not use plausibility of visible reasoning as a release gate.
- **CoT transfer is conditional.** Kojima et al. found no gain on their commonsense tasks, ineffectiveness at smaller scales, and instances where continued reasoning changed a correct MultiArith answer into a wrong one. Long rationale, answer reversal after an apparently solved state, or multiple final answers are rollback signals.
- **More samples are not automatically better.** A retained 2026 GSM8K probe reports GPT-5.2 accuracy **78% → 90% → 86%** at N=1/5/20 and early-answering faithfulness **0.540 → 0.510 → 0.499**; Claude Opus 4.5 was **78% → 74.3% → 74.3%**. Its 100-item, API-model, necessity-style design limits transfer, but it rejects an untested monotonic-N rule. [Study](https://arxiv.org/html/2601.06423)
- **Tool/retrieval context is an untrusted-input boundary.** [Greshake et al.](https://arxiv.org/html/2302.12173) demonstrate indirect prompt injection in real and synthetic LLM-integrated applications: retrieved data can manipulate API use and application function. It is a feasibility/threat-model result, not an attack-rate estimate. Authority must remain server-side, separate from retrieved text.
- **Evaluator scores are measurements, not truth.** [Zheng et al.](https://arxiv.org/html/2306.05685) found GPT-4 agreement above 80% with human preferences in their data, but also position and verbosity failures. In their repetitive-list attack, failure rates were 91.3% for Claude-v1 and GPT-3.5 and 8.7% for GPT-4 over 23 answers. Order-swap, padded-duplicate, known-answer, and stratified-human controls are required before an LLM judge becomes a shipping gate.

## R3. Selection rules and operational decision table

| Production situation | Start with | Add only when local paired evidence shows | Failure signal / stop rule | Paired comparator |
|---|---|---|---|---|
| Transformation, extraction, drafting | Direct instruction and typed output contract. Add 0–3 representative examples only when needed. | Better acceptance or format adherence without copying, leakage, or budget regression. | Schema failure, omitted requirement, example-order sensitivity. | Same prompt without examples, frozen decoding. |
| Multistep task with exact/executable answer | Direct answer, then CoT. | Exact-pass gain across difficulty strata at a fixed output cap. | Longer output without pass gain, answer reversal, parser failure. | Direct-answer prompt with equal output budget. |
| Closed-answer reasoning | CoT with canonical answer parser. | Self-consistency improves accepted-task rate at N=1, then only at larger N if marginal gain pays for the budget. | Low consensus margin, correlated unsupported premise, cost/latency breach. | N=1/5/10/20 with equal model, prompt, seeds, and parser. |
| Fresh facts or private state | Retrieval or one narrow, typed tool call with citations/state readback. | A multi-observation loop improves grounded answer or completed state. | Unsupported citation, stale result, repeated call, hidden tool error. | Closed-book and one-tool-call baselines. |
| Consequential tool action | Allowlisted typed tools, server-side policy, deterministic postcondition, explicit approval for mutation. | A trace/repair loop lowers measured invalid-action rate. | Invalid argument, state drift, unverified success, retrieved text requesting authority. | Replay the same environment episode with bounded one-attempt control. |
| Long document QA/synthesis | Retrieve, structure with headings/provenance, and place relevant excerpts near the task. | Position testing shows contextualization/compression improves answer and citation accuracy. | First/middle/last placement changes answer or citations. | Same evidence at several positions and lengths. |
| Open-ended quality | Blinded human sample. | A judge is calibrated against humans and passes adversarial controls. | Winner flips after order swap or padded duplicate. | Order-swapped pairwise judge plus stratified human audit. |

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
    - "gain disappears after equalizing all calls, tokens, tools, retries, and instructions"
    - "gain needs oracle labels or feedback unavailable in production"
    - "a perturbation changes the answer materially or the validator/judge fails its controls"
```

For a task where the decision threshold is not already defined, set it before running the comparison. Report cost as total per accepted task only when model input/output, cache/reasoning, tools, retries, branches, and verification are included; otherwise label the missing components unknown.

## Unknowns

- No retained study supplies a comparable current production price, latency distribution, or total cost per accepted task.
- Old benchmark-model lifts are not transfer estimates for current provider revisions, proprietary system prompts, organization data, or tool schemas.
- Tool-loop effects confound prompt, environment, retrieval/tool quality, and sometimes prompt selection.
- Performance gains and explanation faithfulness are separate properties and require separate tests.
- Current production robustness to indirect injection, retrieval poisoning, and tool authorization must be measured in the deployed architecture.

## Source appendix

| Source | Direct URL | Type / date | Method or evidence form | Supported claim retained here | Important limitation |
|---|---|---|---|---|---|
| Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* | https://arxiv.org/html/2201.11903 | Primary paper, 2022 | PaLM 540B, eight CoT exemplars, GSM8K accuracy comparison | 17.9→56.9 CoT result and calculator contrast | Older model and arithmetic benchmark; no cost. |
| Kojima et al., *Large Language Models are Zero-Shot Reasoners* | https://arxiv.org/html/2205.11916 | Primary paper, 2022 | `text-davinci-002`, zero-shot two-stage prompting on arithmetic/commonsense tasks | Zero-shot CoT results and non-transfer/error signals | Older model; no currency cost; not general prose. |
| Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models* | https://arxiv.org/html/2203.11171 | Primary paper, 2022 / ICLR 2023 | Sample-and-marginalize CoT paths, GSM8K | 56.5→74.4 at 40 paths/run | High generation work; normalizable-answer setting; no price. |
| Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models* | https://arxiv.org/html/2210.03629 | Primary paper, 2022 / ICLR 2023 | PaLM 540B with API or interactive environments | HotpotQA, ALFWorld, and WebShop contrasts | Tool quality and prompt selection confounded; no total cost. |
| Liu et al., *Lost in the Middle: How Language Models Use Long Contexts* | https://arxiv.org/html/2307.03172 | Primary paper, 2023 | Position-controlled multi-document QA and synthetic key-value retrieval | Context-position degradation and contextualization contrast | 2023 models; synthetic retrieval is not grounded QA. |
| Peng et al., *Check Your Facts and Try Again* | https://arxiv.org/html/2302.12813 | Primary paper, 2023 | ChatGPT augmented with retrieval, utility feedback, and revision | Customer-service and WikiQA gains | Composite scaffold, vendor setting, extra call/UX overhead. |
| Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet* | https://arxiv.org/html/2310.01798 | Primary paper, 2023 | Intrinsic review/revision, sampling, debate under response-count comparisons | Self-correction regression, debate comparison, prompt confound | Reasoning benchmark and named model versions; no dollar cost. |
| Turpin, Michael, Bowman, *Language Models Don’t Always Say What They Think* | https://arxiv.org/html/2305.04388 | Primary paper, 2023 | Controlled prompt-bias experiments and explanation annotation | CoT can rationalize bias and fail faithfulness | Specific models/tasks and constructed bias interventions. |
| Greshake et al., *Not What You’ve Signed Up For* | https://arxiv.org/html/2302.12173 | Security paper, 2023 | Demonstrations against real and synthetic LLM-integrated applications | Retrieved content is an untrusted-input security boundary | Feasibility/threat model, not prevalence or attack rate. |
| Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena* | https://arxiv.org/html/2306.05685 | Primary paper, 2023 | Human-preference agreement and adversarial judge-bias tests | LLM judge controls needed for position/verbosity bias | Evaluation models/data are dated and not universal judge calibration. |
| *Does Inference Scaling Improve Reasoning Faithfulness?* | https://arxiv.org/html/2601.06423 | Primary preprint, 2026 | 100-item GSM8K multi-model sample-count/early-answering analysis | More samples need not improve accuracy or faithfulness monotonically | Narrow dataset, API variability, necessity-style faithfulness measure. |
