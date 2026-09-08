# Tree of Thoughts: original evidence for a production adoption decision

**Decision:** Do not replace direct input-output (IO) or chain-of-thought (CoT) prompting with Tree of Thoughts (ToT) by default. Run a bounded, task-specific trial only where the current baseline misses a material quality requirement, intermediate states are compact and valid, and a useful branch/prune or verifier signal exists. The original study demonstrates large gains on its designed hard tasks, but also materially higher compute and no production latency or reliability evidence.

**Scope and research date.** Research date: 2026-09-08. This report uses only the frozen original ToT paper and its frozen primary cost-table extraction specified in the assignment. The evidence is the paper's GPT-4 experiments, run May 5–16, 2023, plus its limited GPT-3.5 appendix. It is not evidence of current-model, production, or universal prompting performance.

## What the original evidence establishes

### Game of 24: a large result under a purpose-built search setting

The task was 100 relatively hard games, indices 901–1,000 of 4nums.com. Success required a valid equation equal to 24 using each input number exactly once. The model was Chat Completion GPT-4 at temperature 0.7.

| Condition | Method and sampling condition | Success | What can be compared |
|---|---|---:|---|
| IO | Five in-context examples, 100 samples/game | 7.3% | Average sampled baseline |
| CoT | Same structure with three intermediate equations, 100 samples/game | 4.0% | Average sampled baseline |
| CoT self-consistency | Majority final output of 100 CoT samples | 9.0% | Deployable only when majority voting is meaningful |
| ToT, breadth 1 | Three equation thoughts | 45% | Search effect at narrow breadth |
| ToT, BFS breadth 5 | Sequential proposals, retain five states/step; three sampled `sure/maybe/impossible` valuations per thought | 74% | Main ToT result |
| IO, best of 100 | Oracle selection from 100 samples | 33% | Not a normal deployable baseline without an equivalent verifier |
| CoT, best of 100 | Oracle selection from 100 samples | 49% | Not a normal deployable baseline without an equivalent verifier |

Source: [original paper, §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1) and [Table 7](https://arxiv.org/html/2305.10601v2#A2.T7).

The main ToT result exceeds average IO by 66.7 percentage points, average CoT by 70.0 points, and oracle best-of-100 CoT by 25 points. The latter is the strongest sampling contrast, but it assumes an oracle can identify a correct sample. Iterative refinement is also not a like-for-like baseline because it used ground-truth equation-correctness feedback and up to ten refinements from an IO sample.

### Creative Writing: a quality lift with subjective measurement

The task used 100 inputs of four random sentences. Each output had to be a coherent four-paragraph passage ending its paragraphs with those sentences. There was no ground-truth passage. IO directly generated a passage; CoT first made a brief plan then wrote; both were zero-shot and generated 10 samples/task. ToT had depth two: generate five plans and select one via five votes, then generate five passages from that plan and select one via five votes. It retained one choice at each stage.

| Condition | GPT-4 coherence score, 1–10 | Paired human result |
|---|---:|---|
| IO | 6.19 | Not reported |
| CoT | 6.93 | Compared with ToT only |
| ToT | 7.56 | ToT preferred in 41/100 blind author-subset pairs, CoT in 21/100, tied/similarly coherent in 38/100 |
| Iterative refinement from IO | 7.67 | Not reported |
| Iterative refinement from ToT | 7.91 | Not reported |

Source: [original paper, §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2).

ToT's mean score was 1.37 points above IO and 0.63 above CoT. This is suggestive rather than a general quality guarantee: the paper explicitly calls the automatic GPT-4 judge potentially noisy; the human comparison covered only CoT versus ToT and used an author subset. The refinement results are separate conditions, not proof that ToT dominates refinement.

## Cost and compute evidence

The primary table column is literally **Generate/Prompt tokens**. The accompanying prose calls the first number “completion tokens,” but does not define the slash convention. It should not be converted into a modern billing specification.

| Task and condition | Generate/Prompt tokens | Paper cost per case | Outcome in the same table |
|---|---:|---:|---:|
| Game of 24, IO best of 100 | 1.8k / 1.0k | $0.13 | 33% |
| Game of 24, CoT best of 100 | 6.7k / 2.2k | $0.47 | 49% |
| Game of 24, ToT | 5.5k / 1.4k | $0.74 | 74% |
| Creative Writing, IO | 0.9k / 0.4k | $0.06 | Not tabulated |
| Creative Writing, CoT | 0.9k / 0.4k | $0.07 | Not tabulated |
| Creative Writing, ToT | 4k / 2.9k | $0.32 | Not tabulated |

Source: [Table 7](https://arxiv.org/html/2305.10601v2#A2.T7) and [Table 8](https://arxiv.org/html/2305.10601v2#A2.T8). The frozen raw extraction is available [locally](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-cost-tables.md).

Within these tabled conditions, Game-of-24 ToT cost 1.6× oracle best-of-100 CoT ($0.74/$0.47) and 5.7× oracle best-of-100 IO ($0.74/$0.13). Creative ToT cost about 5× IO ($0.32/$0.06) and 4.6× CoT ($0.32/$0.07), with 4k versus 0.9k generated tokens. The paper calculates about $106 for the two 100-case main ToT experiments: 100 × $0.74 + 100 × $0.32. It characterizes ToT as potentially requiring 5–100× more generated tokens than CoT depending on prompts and search algorithm, not as a fixed multiplier.

The $ values are historical paper measurements, not a current forecast. The source reports no end-to-end latency, tail latency, retry rate, availability, tool-integration behavior, or production error rate. Table 8's caption says “Cost analysis on Game of 24” although its header and rows say “Creative Writing”; this report preserves the header/rows and flags the original caption mismatch.

## Adoption boundary and operational controls

**Recommendation.** Keep IO or CoT as the default. Consider ToT only for a task stratum that passes every gate below:

1. Current direct and CoT baselines fail a pre-defined, material quality threshold.
2. Intermediate states can be made small, explicit, and validity-checkable enough to branch and compare.
3. A branch/prune signal is meaningful, ideally an external production-equivalent verifier. A model self-evaluator alone is a known risk.
4. Search can recover from a bad early step through retained alternatives or backtracking.
5. The stratum can tolerate the measured local incremental dollars, tokens, and p95 latency.

Do not use ToT for easy, latency-sensitive, or weakly verifiable tasks merely because it improved the study's tasks. The paper itself says deliberate search may be unnecessary where GPT-4 already excels and tested only three relatively simple tasks constructed to challenge it.

**Operational controls proposed here, not measured paper findings:** route only eligible cases to ToT; cap depth, branch width, votes, retries, tokens, dollars, and wall time; make pruning auditable; and fall back to the cheapest passing baseline on budget exhaustion or missing verifier evidence. Monitor final quality, cost, p95 latency, state pruning, verifier disagreements, and failure mode by task stratum.

The control is important because the paper's crossword analysis shows an imperfect self-evaluator can prune a correct state as “impossible.” Without pruning, correct solutions were found for four of 20 games but the output heuristic surfaced only one, including three that the pruning setup did not solve within 100 steps. This is evidence that search configuration and selection heuristics, not the ToT label alone, determine the result.

## Paired local evaluation artifact

**Purpose:** resolve the transfer and cost-quality decision before promotion. This is a proposed local experiment, not a result from the paper.

| Design field | Paired requirement |
|---|---|
| Corpus | Freeze a representative evaluation set before runs, stratified by task type and difficulty. Use externally checked cases where possible. For open-ended outputs, use independently blinded human comparisons. |
| Pairing unit | Run IO, CoT, and bounded ToT on every identical case. Pair outcomes within case and stratum rather than comparing unmatched aggregates. |
| Fixed conditions | Same model version, system prompt, context, temperature, tool access, output limit, retry policy, and test cases. Pre-register per-case token, dollar, and latency caps. |
| Arms | One deployable IO, one deployable CoT, and bounded ToT. If sampling is allowed, give all arms the same total token or dollar budget. Report verifier/oracle-selected results separately and only where the verifier is production-equivalent. |
| ToT grid | Predefine a small grid of depth, branch width, and vote count. Do not tune on the scored set. |
| Per-case log | Input/stratum, arm/configuration, generated and prompt tokens separately, API calls, wall time, branch count, retained/pruned states and reasons, verifier outcome, final outcome, and failure mode. |
| Promotion rule | For each stratum, promote ToT only if its paired quality lift clears a pre-set practical threshold and its cost, p95 latency, and error profile stay within the service budget. Otherwise retain the cheapest passing arm. |

This design avoids the study's central comparison trap: “best of 100” is oracle-selected and must not be treated as normal CoT or IO performance unless the local verifier can make the same selection in production.

## Limitations and why this investigation ends here

- The evidence transfers only from GPT-4 in May 2023 and these purpose-built tasks. The limited GPT-3.5 result is materially lower on Game of 24: 19% ToT versus 74% for GPT-4 ToT. GPT-4 generation with GPT-3.5 evaluation achieved 64%; GPT-3.5 generation with GPT-4 evaluation achieved 31%, indicating model/configuration dependence in that setting.
- The two primary tasks use different metrics and selection methods: objectively checkable equation correctness versus model-judged coherence with limited human comparison. They should not be combined into one performance ranking.
- No confidence intervals, latency data, reliability data, or current-price/current-model evidence is supplied.
- The controlled assignment prohibits further retrieval and outside studies. The frozen sources answer the requested historical methods, results, and cost tables but cannot settle a production adoption decision without the paired local evaluation above.

## Source appendix

| Retained source | Type and date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [Yu et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*, arXiv HTML v2](https://arxiv.org/html/2305.10601v2) | Primary paper, NeurIPS 2023. Experiments May 5–16, 2023. | Methods, task conditions, Game-of-24 and Creative-Writing outcomes, GPT-3.5 extension, discussion limitations, and cost prose. | Three designed tasks, historical model/configuration, mixed task metrics, and no production latency/reliability data. |
| [Frozen primary cost-table extraction (local)](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-cost-tables.md) | Local raw extraction of the assigned primary HTML v2. | Faithful cells for Tables 7–8 and surrounding Appendix B.3 cost language. | `Generate/Prompt tokens` slash convention is undefined; Table 8 caption/header mismatch is preserved. |
| [Substantive research note (local)](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2b/fixed/prompt-cost-2-X/streams/s1.md) | Local synthesis input. | Traceability to the supplied evidence and proposed operational controls. | Not an independent source and not used as corroboration. |
