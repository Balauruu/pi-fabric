# Source Note: Adoption Boundaries for Prompting and Scaffolds

**Scope and cutoff:** technical prompting, reasoning prompts, verification, evaluators, and external-feedback/tool scaffolds. Evidence inspected through the original sources listed in the retained-source appendix. Literature is pre-2026-09-07. This is a decisive counterevidence note, not a universal ranking.

## R1. Measured effects, retained under original conditions

| Technique / claim | Original measured setting and comparator | Result | Compute or cost condition | Adoption boundary |
|---|---|---:|---|---|
| Zero-shot CoT, “Let’s think step by step” | `text-davinci-002`; greedy decoding; arithmetic benchmarks. Comparator: ordinary zero-shot. | MultiArith: **17.7% → 78.7%**. GSM8K: **10.4% → 40.7%**. [Kojima et al., 2022, Abstract and §4.1](https://arxiv.org/html/2205.11916#S4.SS1) | Two prompt stages: reasoning generation, then answer extraction. No currency cost reported. | Evidence supports a low-cost pilot for multistep arithmetic/symbolic tasks on sufficiently large instruction-tuned models, not a general “reason harder” default. |
| Zero-shot CoT transfer limit | Same study, `text-davinci-002`; CommonsenseQA and smaller models. | No performance gain on commonsense tasks. CoT was ineffective at smaller model scales. [§4.1, “Does model size matter” and error analysis](https://arxiv.org/html/2205.11916#S4.SS1) | Same two-stage prompting. | Do not extrapolate arithmetic gains to classification, commonsense, or smaller models. |
| Intrinsic self-correction | GPT-3.5-Turbo, GPT-4, GPT-4-Turbo, and Llama-2-70B-chat on GSM8K, CommonSenseQA, HotpotQA, and other reasoning tasks. Comparator: initial answer / standard prompting. Maximum two correction rounds. | Without oracle labels, self-correction **consistently decreased performance** in the reported reasoning evaluations. [Huang et al., 2023, §3.2–3.3](https://arxiv.org/html/2310.01798#S3.SS2) | Initial answer, critique, revised answer means extra model calls and tokens. The paper does not report a dollar amount. | “Review your answer” is not evidence of correction unless the review receives an independent, informative signal. |
| Multi-agent debate versus sampling | `gpt-3.5-turbo-0301`; full GSM8K test set; 3 agents, 2 debate rounds. Comparator: self-consistency at equal response counts. | Standard: **76.7%**. Debate round 1, 6 responses: **83.2%** vs self-consistency **85.3%**. Debate round 2, 9: **83.0%** vs self-consistency **88.2%**. [Huang et al., 2023, Table 7](https://arxiv.org/html/2310.01798#S4) | Equalized by number of responses, not dollar cost. Debate has coordination prompt overhead beyond samples. | Before adopting debate, compare against voting/reranking using the same calls, model, decoding, and token budget. |
| External knowledge plus feedback | ChatGPT with LLM-Augmenter in News Chat, customer service, and WikiQA. Comparator: ChatGPT alone. | Reported human-evaluation improvement: **+32.3% usefulness** and **+12.9% humanness**. WikiQA factuality: **+10 absolute F1**. [Peng et al., 2023, §1 and §3–4](https://arxiv.org/html/2302.12813) | The authors explicitly state interactive feedback may query ChatGPT **twice for one response**, slowing UX. [§6](https://arxiv.org/html/2302.12813#S6) | Prefer a retrieval/tool scaffold when it returns task-relevant evidence and an executable or human-validated utility signal exists. The effect does not establish that generic self-critique works. |
| Process verifier for mathematical reasoning | Reward models trained with step labels versus final-outcome labels on MATH, then evaluated with 100 generated solutions per problem. | Process-supervised reward model solved **78%** of MATH problems in the reported large-scale setup. [Lightman et al., 2023, Abstract and §3](https://arxiv.org/html/2305.20050#S3) | Requires PRM800K human process labels and 100 samples per problem at evaluation. Not a prompt-only intervention. | A verifier can be useful when correctness decomposes into checkable steps. This is not evidence that natural-language CoT is faithful or that the result transfers outside math. |

## R2. Counterevidence, regressions, and transfer limits

### C1. CoT output is not a trustworthy audit trail

Turpin, Michael, and Bowman tested GPT-3.5 and Claude 1.0 on BIG-Bench Hard and BBQ under controlled prompt biases: a suggested answer and demonstrations whose correct option was always A. On bias-contradicting cases, zero-shot CoT for GPT-3.5 dropped as much as **36.3 percentage points** under the Suggested Answer bias and **18.7 points** under Answer-is-Always-A. Claude’s Answer-is-Always-A drop was **4.7 points**. Reported paired-difference confidence intervals across settings were **±1.6 to ±2.4 points**. [Turpin et al., 2023, §3.2](https://arxiv.org/html/2305.04388#S3.SS2)

The relevant failure is not merely reduced accuracy. The models’ explanations often omitted the injected causal feature and rationalized the changed answer. In the authors’ annotated sample, **15%** of unfaithful explanations had no obvious logical, commonsense, missing-step, or answer-consistency error. [§3.3](https://arxiv.org/html/2305.04388#S3.SS3) Thus a plausible-looking rationale cannot be used as a pass condition for a prompt, a tool action, or a safety decision.

**Overturning condition:** If answer choice materially changes under irrelevant label order, user suggestion, answer position, or retrieval-document order while the explanation stays plausible, reject explanation-based auditing as the control. Test interventions directly.

### C2. CoT helps particular tasks and models, and can corrupt a previously correct answer

Kojima et al. report large arithmetic gains, but also three non-transfer signals:

1. CoT did not improve their commonsense tasks. [§4.1](https://arxiv.org/html/2205.11916#S4.SS1)
2. It was ineffective on smaller models. [§4.1, Figure 3 discussion](https://arxiv.org/html/2205.11916#S4.SS1)
3. On MultiArith, zero-shot CoT sometimes continued reasoning after reaching a correct result and changed it to an incorrect answer. It sometimes only restated the question. [§4.1, error analysis](https://arxiv.org/html/2205.11916#S4.SS1)

**Failure signals:** longer rationales with lower exact-match accuracy, a rising rate of answer changes after an apparently solved intermediate state, multiple offered answers when one is required, or performance that vanishes when examples are reordered or task types differ.

### C3. Oracle-gated “self-correction” is not production correction

Huang et al. distinguish oracle self-correction, where the system knows whether an answer is correct, from intrinsic self-correction. The former prevents a correct initial answer from being changed incorrectly, but is not available for the problem the model was deployed to solve. [§3.2](https://arxiv.org/html/2310.01798#S3.SS2)

They also show a prompt-design confound: an original single-call prompt scored **44.0** on CommonGen-Hard, its seven-call self-correction scaffold scored **67.0**, but a stronger one-call initial prompt scored **81.8**. Applying the correction scaffold to that stronger prompt reduced it to **75.1**. [Table 8, §5](https://arxiv.org/html/2310.01798#S5)

**Overturning condition:** Remove labels unavailable in deployment, move all task instructions into the first-pass comparator, and equalize calls/tokens. If the scaffold no longer beats that comparator, it has not earned adoption.

### C4. Tool and retrieval scaffolds add a second failure surface

The external-feedback evidence is conditional on available, relevant knowledge and a utility module. In LLM-Augmenter, always using the knowledge consolidator achieved the best KF1 but incurred extra access overhead, whereas the “self-ask” policy requested it for **24%** of customer-service examples. [Peng et al., 2023, §3.5](https://arxiv.org/html/2302.12813#S3.SS5) The paper’s stated limitation is slower UX because ChatGPT is often called twice. [§6](https://arxiv.org/html/2302.12813#S6)

**Failure signals:** low evidence recall, answers containing claims unsupported by retrieved evidence, tool invocation on easy or answerable-in-context requests, tool errors hidden by a fluent answer, and latency/cost rising without an independently measured gain.

### C5. LLM-as-judge is a measurement instrument, not ground truth

Zheng et al. found GPT-4 judge agreement above **80%** with human preferences on their controlled and crowdsourced data, but directly documented position, verbosity, and reasoning-grading weaknesses. [Zheng et al., 2023, Abstract and §3](https://arxiv.org/html/2306.05685#S3)

Decisive test results:

- Under answer-order swapping, only GPT-4 remained consistent in more than **60%** of cases in their challenging position-bias test. [Table 2, §3.3](https://arxiv.org/html/2306.05685#S3.SS3)
- In a repetitive-list verbosity attack, failure rates were **91.3%** for Claude-v1, **91.3%** for GPT-3.5, and **8.7%** for GPT-4, over 23 answers. [Table 3](https://arxiv.org/html/2306.05685#S3.SS3)
- Few-shot judging raised GPT-4 order-swap consistency from **65.0% to 77.5%**, but made API calls **4×** more expensive and did not prove accuracy. [Appendix D.2](https://arxiv.org/html/2306.05685#A4.SS2)

**Overturning condition:** If a judge changes the winner after answer-order swap, prefers a padded duplicate, cannot pass known-answer cases, or disagrees with a stratified human sample, do not use its score as a shipping gate.

### C6. Strong verifier results are domain-specific and may be contaminated

Lightman et al.’s process-supervision result is about trained reward models for math, not prompt wording. They explicitly state that generalization beyond math is unknown. They also state that MATH problems may have appeared in pretraining and that their decontamination cannot strongly guarantee removal. [§6.2–6.3](https://arxiv.org/html/2305.20050#S6.SS2)

**Overturning condition:** Evaluate on post-cutoff, organization-held-out, or newly authored tasks with independently checked answers. If the verifier’s gain disappears, do not treat benchmark performance as evidence of production reliability.

## R3. Operational selection rules

| Situation | Start with | Add only if local evidence shows | Do not adopt when | Paired control |
|---|---|---|---|---|
| Constrained production text | Direct instruction, output schema, task-specific examples only when representative | Higher acceptance rate and no increase in length, cost, or format failures | Examples cause template copying, sensitivity to order, or leakage of irrelevant context | Same prompt without examples, same model and decoding |
| Multistep problems with deterministic checking | CoT/scratchpad plus separate final answer | Exact-answer or executable-test gain across difficulty strata | CoT is ineffective on the deployed model, increases final-answer reversals, or has no gain on target tasks | Direct-answer prompt with equivalent output-token cap |
| Candidate generation with checkable answers | Independent samples plus deterministic verifier or majority vote | Better pass@budget than one call and than more tokens in one call | “Debate” or critique loses to self-consistency at equal response count | Equal total calls, input tokens, output tokens, and model |
| Code, database, or tool actions | Structured tool contract, tool result in context, retry only on observed error | Higher task completion with bounded retries and verified state | The model critiques itself without a test, tool output, or state readback | Same contract with one tool attempt and mandatory postcondition |
| Retrieval-grounded answers | Retrieval with citations, evidence-coverage and entailment checks | More supported claims and fewer unsupported claims at acceptable latency | Retrieval is irrelevant, stale, poisoned, or unused in the final answer | Closed-book prompt and retrieval-only answerability baseline |
| Open-ended quality | Human sample plus calibrated, adversarially tested LLM judge | Agreement with humans across content categories | Judge has order, verbosity, self-preference, or reasoning failures | Order-swapped pairwise judge and blinded human audit |

## Reusable local evaluation artifact

```yaml
experiment: prompt-technique-gate-v1
unit: one production-like request
fixed:
  model: "<pinned provider/model/version>"
  decoding: {temperature: 0, seed: "<if supported>", max_output_tokens: 1200}
  tool_versions: "<pinned>"
  budget:
    max_model_calls: 3
    max_input_tokens: 12000
    max_output_tokens: 3000
arms:
  - id: baseline
    prompt: "<best direct instruction, all task requirements included>"
  - id: candidate
    prompt_or_scaffold: "<CoT / examples / retrieval / critique / tool loop>"
    stop_conditions: "<bounded and observable>"
paired_tests:
  - name: task_quality
    metric: "<exact match | executable test pass | human rubric>"
  - name: robustness
    perturbations:
      - irrelevant-user-suggestion
      - option_or_document_order_swap
      - representative paraphrase
      - missing_or_conflicting_tool_result
  - name: faithfulness
    metric: "answer change after irrelevant perturbation"
  - name: economics
    metrics: [p50_latency_ms, p95_latency_ms, model_calls, input_tokens, output_tokens, tool_calls, currency_cost]
  - name: evaluator_integrity
    controls: [answer_order_swap, padded-duplicate attack, known-answer set, stratified human audit]
decision:
  promote_if:
    - "candidate beats baseline on the primary production metric with a paired confidence interval reported"
    - "candidate does not breach budget or regress a safety/format metric"
    - "robustness and evaluator controls pass"
  reject_or_roll_back_if:
    - "gain disappears after equalizing calls/tokens"
    - "gain requires oracle labels or unavailable production feedback"
    - "irrelevant-context sensitivity materially changes answers"
    - "judge winner changes under answer-order swap"
record_per_request:
  - request_id
  - arm
  - final_output
  - intermediate_outputs
  - retrieved_context_and_source_ids
  - tool_inputs_outputs_and_postcondition
  - scores_and_rater_ids
  - all_token_call_latency_and_cost_fields
```

## Unknowns

- None of the retained prompt studies establishes stable effects for current production model families, provider revisions, proprietary system prompts, or organization-specific tool schemas.
- The studies report calls, samples, or tokens inconsistently. Treat currency cost as **unreported** unless directly measured locally.
- Benchmark gains are not a substitute for distribution-matched evaluation, especially where prompts, task formats, model versions, or answer checkability differ.
- Rationales can improve task performance while remaining unfaithful. Performance evaluation and explanation-auditing evaluation must be separate gates.

## Retained-source appendix

| ID | Original inspected source | Type / date | Material retained |
|---|---|---|---|
| S1 | [Kojima et al., *Large Language Models are Zero-Shot Reasoners*](https://arxiv.org/html/2205.11916) | arXiv preprint, May 2022 | Abstract; §3.1 two-stage method; §4.1 Tables 1–4, scale study, error analysis. |
| S2 | [Turpin, Michael, Bowman, *Language Models Don’t Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting*](https://arxiv.org/html/2305.04388) | arXiv preprint, May 2023 | §3.1–3.3; BBH/BBQ setup, paired tests, bias-induced accuracy drops, annotated explanation failures. |
| S3 | [Peng et al., *Check Your Facts and Try Again: Improving Large Language Models with External Knowledge and Automated Feedback*](https://arxiv.org/html/2302.12813) | arXiv preprint, February 2023 | §3–4 effects and ablations; §6 latency/call limitation. |
| S4 | [Lightman et al., *Let’s Verify Step by Step*](https://arxiv.org/html/2305.20050) | arXiv preprint, May 2023 | Abstract; §§3–6; process/outcome supervision, 100-sample evaluation, OOD and contamination limits. |
| S5 | [Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*](https://arxiv.org/html/2306.05685) | arXiv preprint, June 2023 | Abstract; §3.3–3.4; Tables 2–4; Appendix D.2. |
| S6 | [Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet*](https://arxiv.org/html/2310.01798) | arXiv preprint, October 2023 | §§3–5; Tables 2–8; §7 limitations. |