# Decision-grade guide: production LLM prompt techniques

**Research date requested:** 2026-09-07. **Inspected evidence:** 12 distinct primary paper/report origins and four independent source-tested leaves. This is a selective technical guide, not a universal ranking or exhaustive review. All quantities remain under their original harnesses.

## Executive decision

**Recommendation.** Use a direct, explicit task contract as the baseline. Add exemplars only after testing example set and order. Add CoT or decomposition only for observed multistep failures. Add sampling, search, retries, or reflection only when an independent final-state validator can justify the extra token, latency, and tool budget. Treat tool-use approaches as full scaffolds, not prose-only prompt changes.

## Measured effects and boundaries

| Technique | Original conditions and comparator | Result | Compute/cost and limit |
|---|---|---|---|
| Few-shot CoT [S1] | GSM8K, PaLM-540B, standard prompt versus 8 CoT examples, greedy decode | 17% to 57% | No token/latency/price reported. Historical reasoning result, not a current-model default. |
| Self-consistency [S2] | GSM8K, PaLM-540B, greedy CoT versus 40 sampled paths, 10 runs | 56.5% to 74.4%, +17.9 points | 40 rollouts materially multiply generation cost and latency. Paper reports no dollar/token total. |
| Least-to-most [S3] | SCAN length split, code-davinci-002, CoT versus sequential decomposition | 16.2% to 99.7% | 8 decomposition plus 14 mapping examples. Synthetic compositional benchmark, not general text generation. |
| ReAct [S4] | ALFWorld, PaLM-540B, 2-shot, best-of-six ReAct versus Act-only | 71% versus 45%, average ReAct 57% | 134 environments. Best-of-six is not single-run reliability and cost is unreported. |
| ReAct regression [S4] | HotpotQA, PaLM-540B, Wikipedia API | ReAct EM 27.4 versus standard 28.7 and CoT 29.4 | 500 dev examples, six-shot. Tool interface and fallback policy are part of treatment. |
| Reflexion bundle [S5] | ALFWorld, GPT-3 + ReAct with feedback-triggered reset/retry | 130/134, reported +22 points | Combines detector, retry, reset, memory, and critique. The reported 100-WebShop run did not improve. |
| Exemplar order [S9] | 11 classification datasets, GPT-2/GPT-3 families | entropy ordering: 13% mean relative gain; SST-2 orders near 50% to >85% | 24 permutations and multiple sets. Winning order transfer from GPT-3 2.7B to 175B was Spearman 0.05. |
| Random labels [S10] | 26 NLP datasets, 12 decoder-only models | gold-to-random-label loss 0-5 points, means 1.7 MC and 2.6 classification | Examples can work through format/distribution, not only label semantics. |
| Instruction compliance [S11] | IFEval strict, GPT-4 / PaLM 2 Small | 76.89% / 43.07% prompt-level | Compliance is not semantic correctness. |

## Strongest counterevidence

- **Task dependence:** the inspected CoT review reports gains for symbolic/math/logical tasks but 56.8% CoT versus 56.1% direct in other categories. [S6]
- **Pattern induction reversal:** across nine pattern-ICL datasets and 16 models, direct answer exceeded CoT by 5.10 points, ReAct by 8.02, and ToT by 9.64. Long-reasoning systems used 12x total and 40x inference tokens while comparable or worse. [S8]
- **Rationales are not verification:** injected suggested-answer bias dropped GPT-3.5 zero-shot CoT from 39.5% to 23.3%; only 1 of 426 reviewed explanations mentioned the bias. [S7]
- **Search is a harness result:** ToT Game-of-24 results depend on GPT-4, exact equation verification, depth 3, breadth 5, and three value samples per thought. Do not transfer that number to free-form text. [S13]

## Operational selection table

| Observed condition | Candidate | Failure signal | Paired local comparison |
|---|---|---|---|
| Contract/format failure | explicit requirements plus deterministic schema/field checks | valid shape but incorrect content | direct versus contract prompt, same model/decoding/tokens; score semantic correctness separately |
| Multistep symbolic or arithmetic failure | CoT, then least-to-most only if intermediate dependencies are real | verbose rationale, easy-task regression, propagation | direct, CoT, and decomposition under equal total context/token cap |
| Normalizable answer and external checker | 2, 5, then 20 samples with vote/verifier | low vote margin, no marginal gain | record correctness, vote margin, total tokens, cost, p95 latency |
| Tool task requires fresh observations | ReAct versus direct action and Act-only | repeated actions, ignored tool errors, invalid calls | freeze tool schema/index/action limit; score external final state and call utility |
| Diagnosable recoverable failure | one validator-driven retry | retry without new evidence | first-pass success, conditional recovery, validator FP/FN, incremental cost |

## Reusable local evaluation artifact

```yaml
prompt_scaffold_gate_v1:
  frozen:
    model_snapshot: '<provider/model/date>'
    decoding: {temperature: 0, seed: '<if available>', max_output_tokens: 1200}
    tools_and_index: '<identical schemas, permissions, index snapshot>'
  cases: [normal_holdout, format_variant, adversarial_context, tool_fault]
  arms:
    direct: {calls: 1, prompt: direct_contract}
    candidate: {one_changed_intervention: '<prompt or scaffold>'}
    sampled: {calls: [2, 5, 20], aggregate: verifier_or_normalized_vote}
  record: [case_id, arm, final_state_correct, parse_valid, invalid_action,
           input_output_reasoning_tokens, tool_calls, retries, cost, elapsed_ms, failure_class]
  design: {paired_cases: '100+ stratified cases', stochastic_repetitions: 3}
  promote_only_if:
    - 'paired external-correctness interval excludes zero in favor of candidate'
    - 'no material perturbation or repeated-run regression'
    - 'p95 latency and total cost meet the predeclared budget'
    - 'validator is independent of candidate scaffold'
  stop: ['repeated action-observation >=3', 'invalid actions >=3', 'retry without new verifier evidence']
```

Use 100-200 held-out production-like cases plus 20-40 perturbations. For tool tasks, repeat each case at least five times. A model, prompt, tool schema, retrieval-index, or evaluator change invalidates prior promotion evidence.

## Comparability rule

Do not rank or average results unless task/version, model snapshot, prompt/scaffold, tools, context/action/retry budget, decoding, metric, grader, repetitions, uncertainty, token accounting, and latency window match. Total accepted-task cost includes input, cached/reasoning/output tokens, tools, branches, retries, and verification.

## Retained-source appendix

- **S1** Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*, NeurIPS 2022. https://arxiv.org/abs/2201.11903. Eight-exemplar reasoning study. Limit: historical models and no total cost.
- **S2** Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*, ICLR 2023. https://arxiv.org/abs/2203.11171. Sampled-path decoding. Limit: rollout cost and no production accounting.
- **S3** Zhou et al., *Least-to-Most Prompting Enables Complex Reasoning in Large Language Models*, ICLR 2023. https://arxiv.org/abs/2205.10625. Sequential decomposition. Limit: synthetic benchmark transfer.
- **S4** Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*, ICLR 2023. https://arxiv.org/html/2210.03629v3. Tool-use scaffold. Limit: API and selection budget confounded.
- **S5** Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*, NeurIPS 2023. https://arxiv.org/html/2303.11366. Retry/reflection bundle. Limit: not reflection-only causality.
- **S6** Sprague et al., *To CoT or not to CoT?*, 2024 preprint. https://arxiv.org/html/2409.12183. Broad task-dependence analysis. Limit: heterogeneous methods.
- **S7** Turpin et al., *Language Models Don’t Always Say What They Think*, NeurIPS 2023. https://arxiv.org/html/2305.04388. Faithfulness/bias intervention. Limit: injected-bias setting.
- **S8** Li et al., *The Curse of CoT: On the Limitations of Chain-of-Thought in In-Context Learning*, 2025 preprint. https://arxiv.org/html/2504.05081v2. Pattern-ICL counterevidence. Limit: narrow task family.
- **S9** Lu et al., *Fantastically Ordered Prompts and Where to Find Them*, ACL 2022. https://arxiv.org/html/2104.08786. Exemplar-order experiment. Limit: old decoder models/classification tasks.
- **S10** Min et al., *Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?*, ICLR 2022. https://arxiv.org/html/2202.12837. Label-randomization experiment. Limit: benchmark composition.
- **S11** Zhou et al., *Instruction-Following Evaluation for Large Language Models*, 2023. https://arxiv.org/html/2311.07911. Rule-based instruction compliance. Limit: compliance is not correctness.
- **S12** *The SIFo Benchmark*, Findings of EMNLP 2024. https://aclanthology.org/2024.findings-emnlp.92.pdf. Dependent-instruction evidence. Limit: benchmark rather than local workload.
- **S13** Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*, NeurIPS 2023. https://arxiv.org/html/2305.10601. Search-with-verifier evidence. Limit: bespoke Game-of-24 harness.

## Closing decision

1. **Adopt now:** direct explicit contracts, deterministic checks, and a paired baseline harness. Add one intervention at a time.
2. **Strongest support:** CoT, self-consistency, least-to-most, and ReAct have large measured gains in their original reasoning/tool harnesses.
3. **Highest-impact uncertainties:** current-model transfer, total cost/tail latency, and local similarity to public tasks and validators.
4. **Measurements that change the decision:** paired external-correctness gain with no repeated-run or perturbation regression, within predeclared p95 latency and total-cost budgets.
