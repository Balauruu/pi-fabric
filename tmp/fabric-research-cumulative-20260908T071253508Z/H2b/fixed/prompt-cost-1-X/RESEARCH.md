# Should a production reasoning workflow adopt Tree of Thoughts?

**Decision:** Do **not** adopt Tree of Thoughts (ToT) as the default. The original study supports a bounded pilot only where direct input-output (IO) and chain-of-thought (CoT) have a measured quality shortfall, intermediate states are small and meaningful, and a reliable evaluator plus a hard search budget exist. Otherwise retain the simpler matched baseline. For writing-like work, test iterative refinement as a first-class alternative because it exceeded standalone ToT in the study.

**Scope and evidence boundary.** This is an extraction and decision assessment of the original ToT study’s Game of 24 and Creative Writing experiments only. It relies only on the frozen primary study and its frozen raw-table extraction, both linked in the appendix. Research date: 2026-09-08. The investigation ends here because the supplied evidence contains no current-model or local-workflow result.

## What the original measurements establish

### Game of 24: a large result in a structured search problem

The task required a valid equation equal to 24 using each of four input numbers exactly once. The test set was 100 relatively hard games, indices 901–1,000 of 1,362 games scraped from 4nums.com. Success was exact validity across those 100 games. Unless otherwise stated, experiments used Chat Completion GPT-4 at temperature 0.7, run May 5–16, 2023. [Original study, §4–4.1](https://arxiv.org/html/2305.10601v2#S4).

| Condition | Success | Exact experimental condition |
|---|---:|---|
| IO | 7.3% | Five-shot IO, average over 100 samples per game |
| CoT | 4.0% | Five-shot prompt with three intermediate equations, average over 100 samples per game |
| CoT self-consistency | 9.0% | Majority output of 100 CoT samples |
| ToT, breadth 1 | 45% | Three intermediate-equation thought steps |
| ToT, breadth 5 | 74% | BFS retaining five candidates per step |

The 74% ToT configuration used one common proposal prompt across three steps, BFS with breadth 5, and three LM value samples for each candidate. Values were `sure`, `maybe`, or `impossible` for reachability of 24. This is a task-specific combination of an exact state representation and an LM reachability heuristic, not merely a different final-answer prompt. [Original study, §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1).

The paper also reports **best-of-k** independent IO/CoT samples. That is an oracle calculation, not a deployed selection policy: it asks whether any sample succeeded. At k=100, best-of-100 CoT reached 49%, compared with ToT’s 74%, a 25-percentage-point difference. It demonstrates headroom in sampled paths, but cannot justify production use without an equivalent reliable local verifier or selector. [Original study, §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1); [Table 7](https://arxiv.org/html/2305.10601v2#A2.T7).

### Game of 24: quality came with higher recorded API cost

| Condition | Generate / Prompt tokens per case | Cost per case | Success |
|---|---:|---:|---:|
| IO, best of 100 | 1.8k / 1.0k | $0.13 | 33% |
| CoT, best of 100 | 6.7k / 2.2k | $0.47 | 49% |
| ToT | 5.5k / 1.4k | $0.74 | 74% |

Source: [original Table 7](https://arxiv.org/html/2305.10601v2#A2.T7). Across 100 cases, these per-case figures imply $13, $47, and $74, respectively. Relative to best-of-100 CoT, ToT was 1.57× the recorded per-case cost while using fewer first-column tokens and producing 25 points more success. Do not describe it as 5.7× costlier: $0.74 / $0.47 is 1.57.

**Token-label limitation.** The primary table labels the columns `Generate/Prompt tokens`; nearby prose calls ToT’s 5.5k value “completion tokens.” The frozen primary HTML does not define the slash convention further, so the labels above are preserved rather than reinterpreted.

### Creative Writing: a smaller, evaluator-dependent gain, with a stronger refinement comparator

The task used 100 inputs, each four random sentences. The required output was a coherent four-paragraph passage ending each paragraph with its respective input sentence. There was no ground-truth passage. GPT-4 judged each output five times on a 1–10 coherence scale and the scores were averaged. A subset of the authors also conducted a blinded CoT-versus-ToT pair comparison. [Original study, §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2).

| Condition | Outcome | Conditions |
|---|---:|---|
| IO | GPT-4 coherence 6.19 | Zero-shot, 10 samples per task |
| CoT | 6.93 | Zero-shot brief-plan-then-write, 10 samples per task |
| ToT | 7.56 | Depth 2: five plans, five votes, retain one plan; then five passages and five votes |
| Human CoT vs ToT | ToT preferred 41, CoT 21, tie 38 of 100 | Blinded author-subset comparison |
| Iterative refine from IO | 7.67 | Up to five iterations from one random IO sample |
| Iterative refine from ToT | 7.91 | Up to five iterations |

Source: [original study, §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2). ToT improved on IO by 1.37 and CoT by 0.63 points under the study’s GPT-4 coherence judge. The human comparison is directionally consistent but includes 38 ties and comes from an author subset. Crucially, iterative refinement from IO scored 7.67, above standalone ToT’s 7.56. The source therefore does not support a general claim that ToT is the best production choice for open-ended writing.

### Creative Writing: approximately fivefold recorded cost

| Condition | Generate / Prompt tokens per case | Cost per case |
|---|---:|---:|
| IO | 0.9k / 0.4k | $0.06 |
| CoT | 0.9k / 0.4k | $0.07 |
| ToT | 4.0k / 2.9k | $0.32 |

Source: [original Table 8](https://arxiv.org/html/2305.10601v2#A2.T8). Per 100 cases, the recorded costs imply $6, $7, and $32. ToT was 5.33× IO cost and 4.57× CoT cost. The paper’s two main ToT runs together cost about $106 ($0.74 × 100 + $0.32 × 100). It further states that ToT may require 5–100× more generated tokens than CoT depending on prompts and search algorithm. [Original study, Appendix B.3](https://arxiv.org/html/2305.10601v2#A2.SS3).

**Published-format discrepancy.** Table 8’s caption says “Cost analysis on Game of 24,” while its row header says “Creative Writing.” This report uses the table’s Creative Writing header and retains the discrepancy rather than silently correcting it.

## Adoption boundary and operating controls

This is a recommendation derived from the measured conditions and limitations, not another study result.

Run a ToT pilot only when **all** conditions hold:

1. **Measured need:** matched IO and CoT have a material quality shortfall on the local task and failure is costly enough to justify extra calls.
2. **Searchable state:** the work decomposes into small intermediate states that are valid enough to generate diversely and large enough to evaluate. Game of 24’s equations and Creative Writing’s plans met this condition in different ways.
3. **Credible evaluation:** a deterministic or external state/final evaluator is preferred. LM self-evaluation is a risk control target, not a proven oracle. The paper says values need only be approximately helpful, and its crossword ablation showed pruning could discard actual solutions.
4. **Budgeted operation:** define maximum nodes, candidate breadth, votes, calls, tokens, cost, and an early-stop rule before deployment. The study reports API cost, not end-to-end median or p95 latency, reliability, or maintenance cost.
5. **Safe fallback:** stop at the budget or evaluator-confidence boundary and return the matched CoT result or route the case for review. Log the selected path and evaluator evidence.

Do not use best-of-k as the production comparator unless the local task has a reliable selection mechanism. For open-ended work, include iterative refinement in the baseline set. The paper itself notes that ToT may be unnecessary where GPT-4 already excels and that its experiments covered only three relatively simple challenge tasks. [Original study, §6](https://arxiv.org/html/2305.10601v2#S6).

## Concrete paired local evaluation artifact

Create the following artifact before a pilot. This is a proposed local protocol, not evidence from the paper.

```yaml
artifact: tot-local-paired-evaluation.yaml
purpose: Decide whether bounded ToT earns its incremental cost over direct, CoT, and where applicable iterative refinement.
dataset:
  id: <frozen-held-out-local-set-version>
  strata: [difficulty, failure_consequence]
  acceptance_criteria: <written-before-runs>
shared_conditions:
  model_and_version: <fixed>
  temperature: <fixed>
  prompt_examples: <fixed-per-arm>
  output_token_budget: <fixed>
  tool_access: <fixed>
  retry_policy: <fixed>
arms:
  - id: io
    procedure: direct output
  - id: cot
    procedure: single chain of thought
  - id: iterative_refine
    include_when: open_ended_or_writing_like
    max_iterations: <pre-registered>
  - id: tot
    decomposition: <pre-registered intermediate state>
    candidates_per_node: <pre-registered>
    breadth: <pre-registered>
    evaluator: <deterministic|external|LM plus validation>
    votes_or_value_samples: <pre-registered>
    max_nodes: <hard-cap>
    early_stop: <pre-registered>
    fallback: cot
per_case_record:
  - final_quality
  - verifier_outcome
  - blinded_human_rating_when_no_ground_truth
  - input_tokens
  - output_tokens
  - calls
  - dollar_cost
  - median_latency
  - p95_latency
  - evaluator_disagreement
  - pruning_error
  - failure_mode
decision_rule: >
  Adopt only if ToT exceeds the best matched non-ToT arm by the predeclared
  quality threshold and remains worthwhile at p95 cost and latency. Report
  quality and cost jointly. Never substitute an oracle best-of-k result.
```

## Limitations and unanswered questions

- **Transfer:** the direct evidence is a May 2023 GPT-4 Chat Completion configuration on 100-case, constructed task sets. It is not a current-model replication or a production workflow comparison.
- **Evaluator dependence:** Game of 24 had exact validity. Creative Writing had no ground truth and used GPT-4 scoring plus a limited author-subset comparison. A local evaluator can change the conclusion.
- **Algorithm dependence:** ToT’s result combines a task-specific decomposition, proposal/vote or value prompts, breadth, and search. The paper explicitly says cost and efficiency depend strongly on prompts and search algorithm.
- **Missing operational measures:** no source-bound end-to-end latency distribution, p95 cost, availability, reliability, maintenance burden, or local cost-normalized result is provided.
- **Unresolved evidence needed to change the decision:** a matched local experiment using the selected production model, representative held-out cases, a credible evaluator, and the artifact above.

## Source appendix

1. **Yu et al., “Tree of Thoughts: Deliberate Problem Solving with Large Language Models,” NeurIPS 2023, arXiv HTML v2.** Direct URL: <https://arxiv.org/html/2305.10601v2>. Primary study. Supports task definitions, GPT-4/time/temperature condition, IO/CoT/ToT procedures, Game of 24 and Creative Writing outcomes, evaluator conditions, and stated limitations. Important limitations: narrow task set, dated configuration, task-specific search design, and no production latency or reliability measurement. Frozen local copy: [S2-tree-of-thoughts.md](../../../../../corpus/T1/sources/S2-tree-of-thoughts.md).
2. **Raw primary extraction of Appendix B.3 Tables 7–8 from the same arXiv v2 HTML.** Direct URL: <https://arxiv.org/html/2305.10601v2#A2.SS3>. Primary-source table extraction. Supports token labels, per-case costs, success rows, the $106 arithmetic, and the Table 8 caption/header discrepancy. Important limitation: `Generate/Prompt tokens` is not further defined in the source. Frozen local copy: [S2-cost-tables.md](../../../../../corpus/T1/sources/S2-cost-tables.md).
