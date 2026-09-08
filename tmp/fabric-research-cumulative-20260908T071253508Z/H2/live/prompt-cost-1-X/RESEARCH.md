# Tree of Thoughts for a production reasoning workflow

**Decision:** Do **not** replace direct input-output (IO) or chain-of-thought (CoT) prompting with Tree of Thoughts (ToT) by default. The original study supports a gated use only for costly, bounded-depth problems where local evidence shows direct/CoT quality is inadequate and intermediate states can be credibly ranked or externally verified. It does not establish a general production advantage, current-model performance, latency, or current cost.

**Scope and research date:** This report is limited to Yao et al.'s original paper, its appendix/HTML version, and its linked official implementation, inspected 2026-09-08. The paper's GPT-4 experiments ran 2023-05-05 through 2023-05-16. This investigation ends there because the assigned source has no production replication or current-model/cost evidence.

## What ToT changes

ToT is not one fixed prompt. It decomposes a problem into task-specific intermediate “thoughts,” generates alternatives, evaluates states, and searches them. The paper's four design choices are thought granularity, candidate generation, state evaluation, and search algorithm. That flexibility is also the principal transfer risk: its strongest result uses arithmetic states, three steps, a `sure/maybe/impossible` evaluator, and breadth-first search (BFS), whereas its writing result uses plan/passage generation and voting.

## Original measured results

### Game of 24: large gain in a constrained, verifiable task

The evaluation was 100 relatively hard 4nums.com puzzles (indices 901–1,000). A success is an equation that equals 24 and uses each input exactly once. GPT-4 Chat Completions used temperature 0.7 unless otherwise stated. The ToT condition used a one-example sequential proposal prompt, three equation steps, BFS retaining five states (`b=5`), and three value samples per state. [Paper §4.1 and Table 2](https://arxiv.org/html/2305.10601v2#S4.SS1)

| Method | Success on 100 puzzles | Condition and interpretation |
|---|---:|---|
| IO | 7.3% | Five in-context examples. Average over 100 samples per game. |
| CoT | 4.0% | Three explicit intermediate equations. Average over 100 samples per game. |
| CoT self-consistency | 9.0% | Majority final answer from 100 CoT samples. |
| IO + refine | 27% | Up to 10 iterations with ground-truth equation-correctness feedback. |
| IO best of 100 | 33% | **Oracle** selection using known correctness. |
| CoT best of 100 | 49% | **Oracle** selection using known correctness. |
| ToT, `b=1` | 45% | Three equation-thought steps. |
| ToT, `b=5` | 74% | Paper's BFS configuration. |

The source-bound contrasts are 74% ToT versus 4% sampled CoT, and 74% versus 49% oracle best-of-100 CoT. They support structured search with language-model state evaluation on this exact problem. They do not show that independent-sample selection is deployable: “best of 100” has an oracle correctness selector. The refinement comparison is also not a normal production baseline because it receives ground-truth correctness feedback. The paper reports roughly 60% of CoT samples failing after the first intermediate equation, which is evidence for why local branching helped here, not evidence that the same mechanism helps an arbitrary workflow. [Paper §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1)

### Creative Writing: a smaller, subjective gain, with a simpler counterexample

The paper invented 100 inputs, each requiring a coherent four-paragraph passage ending in four supplied random sentences. There is no reference answer. IO and CoT were zero-shot and produced 10 samples per task. ToT used depth two and retained one state at each stage: generate five plans, vote five times for one plan, generate five passages from it, then vote five times for one passage. The linked scripts set GPT-4 temperature to 1.0. [Paper §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2), [official scripts](https://github.com/princeton-nlp/tree-of-thought-llm/tree/master/scripts/text)

| Method | Mean GPT-4 coherence score, 1–10 | Comparator condition |
|---|---:|---|
| IO | 6.19 | Zero-shot, 10 samples/task. |
| CoT | 6.93 | Zero-shot brief-plan-then-passage, 10 samples/task. |
| ToT | 7.56 | Five-plan/five-vote then five-passage/five-vote search. |
| IO + refine | 7.67 | Up to five refinement iterations from one random IO sample. |
| ToT + refine | 7.91 | ToT followed by refinement. |

ToT exceeded plain CoT by 0.63 score points and IO by 1.37. The five GPT-4 evaluation scores per output had average within-output standard deviation about 0.56. In the authors' blind comparison, ToT was preferred over CoT in 41/100 pairs, CoT in 21/100, and 38/100 were similarly coherent. These outcomes are suggestive, but the primary metric is GPT-4 judging GPT-4 outputs and the human evaluation used only a subset of authors. [Paper §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2)

Most importantly for adoption, IO refinement scored **7.67**, above plain ToT's **7.56**. This is direct counterevidence to choosing ToT over every simpler workflow. It supports evaluating refinement as a realistic paired comparator, not treating the paper as a universal ToT ranking.

## Original token and dollar accounting

Appendix B.3 reports completion (“generate”) and prompt tokens per case, plus dollar cost. It does **not** report pricing inputs, latency, token/cost variance, or total bills for every baseline. Values below must therefore remain 2023 experiment measurements, not a current price forecast. [Paper Appendix B.3, Tables 7–8](https://arxiv.org/html/2305.10601v2#A2.SS3)

| Task/method | Completion / prompt tokens per case | Dollar cost per case | Quality from the same experiment |
|---|---:|---:|---:|
| Game24, IO best of 100 | 1.8k / 1.0k | $0.13 | 33% |
| Game24, CoT best of 100 | 6.7k / 2.2k | $0.47 | 49% |
| Game24, ToT | 5.5k / 1.4k | $0.74 | 74% |
| Creative Writing, IO | 0.9k / 0.4k | $0.06 | 6.19 |
| Creative Writing, CoT | 0.9k / 0.4k | $0.07 | 6.93 |
| Creative Writing, ToT | 4.0k / 2.9k | $0.32 | 7.56 |

On Game24, ToT used fewer reported completion and prompt tokens than 100 CoT trials (5.5k vs 6.7k and 1.4k vs 2.2k), but cost more per case ($0.74 vs $0.47). The source does not explain that apparent dollar/token relationship, so it must not be reverse-engineered into a general pricing rule. On Creative Writing, ToT used about 4.4 times CoT completion tokens, 7.25 times prompt tokens, and 4.6 times its stated dollar cost. The authors estimate the two 100-case main ToT experiments at about $106 ($0.74 × 100 + $0.32 × 100), and Crosswords DFS within $100. That is not the total study cost.

The appendix says ToT can require 5–100 times more generated tokens than CoT, depending on prompts and search algorithm. Its Table 8 caption says “Cost analysis on Game of 24,” though its rows and surrounding discussion are Creative Writing. The table body is used above, with the inconsistency retained.

## Transfer evidence and limits

The paper has limited additional transfer measurements, not a production validation:

| Setting | IO / CoT / ToT | What it means |
|---|---:|---|
| 100 random GSM8K test questions, zero-shot GPT-4 | 51 / 86 / 90 | +4 points over CoT. |
| 100 random StrategyQA development questions, zero-shot GPT-4 | 73 / 82 / 83 | +1 point over CoT. Authors identify external knowledge as the bottleneck. |
| Game24, GPT-3.5 | 6% / 3% / 19% | Much weaker than GPT-4 ToT's 74%; the GPT-3.5 ToT prompt changed from one-shot to three-shot. |
| Game24 hybrid | GPT-4 generation + GPT-3.5 evaluation: 64%; GPT-3.5 generation + GPT-4 evaluation: 31% | The authors infer generation, not evaluation, was the bottleneck on this task. |
| Creative Writing, GPT-3.5 | 4.47 / 5.16 / 6.62 | Same ordering, but a different model and subjective metric. |

[Paper Appendix B.1–B.2](https://arxiv.org/html/2305.10601v2#A2)

The main tasks were invented or selected to challenge 2023 GPT-4, and the paper explicitly says ToT may not be needed where GPT-4 already excels. Its central evidence covers only three relatively simple task types. It provides no independent evaluator or evaluator calibration, confidence intervals, tail latency, retries/recovery, parallelism behavior, current-model replication, or production-risk assessment. The official repository also records a reproduced Game24 `b=5` run at **69% rather than 74%** because GPT decoding is random. [Official repository, “Paper Trajectories”](https://github.com/princeton-nlp/tree-of-thought-llm)

## Adoption boundary

Enable ToT only behind a routing rule when all conditions hold:

1. Direct and CoT have failed a predefined quality threshold on representative cases.
2. The task has a bounded, composable intermediate state, and a credible ranking signal or external verifier.
3. Candidate count, depth, total tokens, retries, and wall-clock time can be capped.
4. The measured incremental quality is worth the observed unit cost and p95 latency.

Do not infer from this paper that ToT should globally replace IO/CoT, that its 2023 dollar figures predict present cost, or that self-voting works for unconstrained production reasoning.

## Concrete local paired-evaluation artifact

The following is a proposed decision control, not a result of the paper. Freeze 100–300 representative production-like cases, stratified by difficulty and failure consequence. Use an objective scorer where possible. For subjective outputs, use blinded independent raters and a predeclared rubric. Run every case under IO, CoT, fixed-completion-budget CoT self-consistency, ToT, and refinement when it is a realistic alternative. Pin model/version, system prompt, tool access, temperature, token limits, retry policy, and evaluator.

```yaml
paired_tot_eval:
  unit: one frozen case evaluated by every treatment
  treatments: [io, cot, cot_self_consistency, tot, refine]
  budgets:
    equal: same maximum total input_plus_output_tokens_or_dollars
    quality_target: lowest cost reaching the predeclared quality threshold
  tot_grid:
    breadth: [1, 3, 5]
    evaluator_votes: [1, 3, 5]
    required_logs: [branch, prune_reason, generation_tokens, evaluation_tokens, latency_ms, external_calls, final_output]
  outcomes:
    primary: objective_success_or_blinded_preference
    secondary: [valid_output_rate, input_tokens, output_tokens, unit_cost, p50_latency_ms, p95_latency_ms, evaluator_agreement, failure_mode]
    uncertainty: paired_bootstrap_confidence_intervals
  diagnostic: compare_lm_selector_with_external_or_deterministic_verifier_when_available
  adoption_gate: >-
    Adopt only when ToT clears a predeclared material paired-quality lift and both p95-latency and unit-cost limits.
    Otherwise keep the simpler winning treatment and route only empirically identified hard cases to ToT.
```

This design separates search quality from selector quality, controls resource asymmetry, and yields the missing deployment evidence rather than assuming transfer from the paper.

## Material gaps

- No current-model or representative production-task replication.
- No latency distribution, tail-cost distribution, pricing basis, or recovery data.
- No fair non-oracle selector for Game24's 100-sample best-of baseline.
- No independent, calibrated evaluator or uncertainty intervals for Creative Writing.
- No evidence that a target workflow has suitable thought states, reliable ranking, or a positive quality-to-cost tradeoff.

## Source appendix

| Retained source | Type/date | Evidence form | Supports | Important limitation |
|---|---|---|---|---|
| [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*, arXiv v2](https://arxiv.org/html/2305.10601v2) | Original paper, 2023 | Methods, main tables, appendix token/cost and transfer experiments | All reported task scores, conditions, token/cost figures, and stated resource tradeoff | 2023 GPT-4, bespoke tasks/configurations, no production latency or current pricing. |
| [Official Tree-of-Thought LLM repository](https://github.com/princeton-nlp/tree-of-thought-llm) | Linked official implementation, retrieved 2026-09-08 | Prompts/scripts and reproduction note | Creative-writing temperature/scripts and 69% reproduced Game24 `b=5` result | Repository statement, not a multi-run uncertainty analysis. |
| [Local assigned evidence note](streams/s1.md) | Local synthesis input | Source-passage index and scoped qualifications | Deeper local traceability for this report | Not independent evidence; claims are retained only where verified against the two sources above. |
