# H2c fixed-note correction/recheck B

## Literal mappings

| Topic | Pre-correction comparator | H2c repeat 1 | H2c repeat 2 |
|---|---|---|---|
| prompt-cost | `H2b/fixed/prompt-cost-2-Y/RESEARCH.md` | `H2c/fixed/prompt-cost-1/RESEARCH.md` | `H2c/fixed/prompt-cost-2/RESEARCH.md` |
| tool-security | `H2b/fixed/tool-security-2-Y/RESEARCH.md` | `H2c/fixed/tool-security-1/RESEARCH.md` | `H2c/fixed/tool-security-2/RESEARCH.md` |

All four H2c reports cite the same mapped H2b substantive note and frozen primary evidence. No fresh retrieval is represented.

## Decisive primary and source passages checked

### prompt-cost

- `S2-cost-tables.md`: “Running ToT requires significantly more computations than IO or CoT prompting”; Game of 24 Table 7 reports IO best-of-100 `1.8k / 1.0k, $0.13, 33%`, CoT best-of-100 `6.7k / 2.2k, $0.47, 49%`, ToT `5.5k / 1.4k, $0.74, 74%`; Creative Writing Table 8 reports IO `0.9k / 0.4k, $0.06`, CoT `0.9k / 0.4k, $0.07`, ToT `4k / 2.9k, $0.32`. The header is literally `Generate/Prompt tokens`; its slash convention is not defined.
- `S2-cost-tables.md`: “close to 100 CoT trials (6.7k tokens). But the performance of ToT is better than best of 100 independent CoT trials”; it also says the two main runs cost `$106`, Crossword DFS “should be also within 100 dollars,” and ToT can require `5-100` times more generated tokens depending on prompts/search.
- `S2-tree-of-thoughts.md` and `H2b/.../streams/s1.md`: Game of 24 is 100 hard 4nums cases, GPT-4 Chat Completion, temperature 0.7, May 5–16 2023; ToT uses three equation thoughts, three evaluator samples per thought, BFS `b=5`; about 60% of CoT samples fail after the first step. Creative Writing uses five plans/five votes then five passages/five votes at `b=1`, and baseline ten-sample aggregation is not specified.

### tool-security

- `agentdojo-2406.13352v3.md`, Table 5: no defense `69.00 ± 3.6` benign utility, `50.01 ± 3.9` utility under attack, `57.69 ± 3.9` targeted ASR; tool filter `73.13 ± 3.5`, `56.28 ± 3.9`, `6.84 ± 2.0`. This supports the stated 50.85-point ASR reduction only in that GPT-4o defense configuration.
- Same source, “Strengths and limitations of tool isolation mechanisms”: filtering is effective where a user needs read access and the attacker needs write access; it fails if tools cannot be planned in advance, if user-required tools can carry out the attack (`17%` of cases), and may fail with persistent multi-task context. Planner/worker isolation remains vulnerable when injected content changes a required result, such as a hotel recommendation.
- Same source, Tables 3–5: GPT-4o baseline/attack values differ by table (47.69, 57.70, 57.69 targeted ASR); Table 4 Max is 57.55 despite Important message being 57.70. The reports retain these as unpooled source conflicts.

## Per-repeat verdicts

| Repeat | Verdict | Findings |
|---|---|---|
| prompt-cost-1 | **Conclusive** | Correctly separates 4% single-chain CoT from 74% ToT, labels best-of-100 as retrospective oracle selection, preserves exact token/cost units and the undefined slash notation, and explicitly says token totals do not equalize prompt, request, selection, cost, or latency. The mechanism cohort and exploratory boundary cohort are separately gated. |
| prompt-cost-2 | **Conclusive** | Preserves the same exact values, oracle qualification, original methods, Table 8 caption conflict, and non-equivalence of reported tokens and cost. Its local test makes the mechanism cohort primary and boundary strata exploratory. |
| tool-security-1 | **Conclusive** | Preserves Table 5 values, fixed-attack/configuration qualification, distinct metric denominators, source conflicts, and the pre-exposure/read-versus-write mechanism boundary. It does not turn comparable ASR into equal compute/cost/latency or turn local controls into paper results. |
| tool-security-2 | **Conclusive** | Preserves Table 5 values and source conflicts, states that the defense result is not adaptive robustness, and prevents a demonstrated-class pass from authorizing dynamic-plan, overlap, persistent-context, or content-integrity strata. |

## Material corrections closed

1. **Comparator correction closed.** Both prompt-cost repeats distinguish ordinary averages/self-consistency from retrospective best-of-100 oracle results. They do not present 74% versus 49% as an equal-cost or deployable-selector comparison.
2. **Resource-comparability correction closed.** Both prompt-cost repeats retain generate/prompt token labels, dollar values, and unknown request/latency/selection accounting. Neither claims equal compute or cost from near-completion token totals.
3. **Mechanism-versus-exploratory correction closed.** ToT reports make early-decision, verifiable intermediate-state cases the adoption cohort and label routine/knowledge-bound cases exploratory. AgentDojo reports confine the capability-bound mechanism to pre-plannable, no-overlap cases and explicitly segregate non-transfer strata.
4. **Security-comparator correction closed.** Both tool-security repeats retain fixed-attack and GPT-4o conditions, metric denominators, the 17% overlap boundary, and decisive unpooled source conflicts. They do not equate full legacy parity with an incumbent gain. No such unsupported claim appears.
5. **Recovered evidence retained.** Exact results, methods, units, conditions, cost-table qualification, ablation/failure boundaries, and local evaluation artifacts from the H2b notes remain present in both repeats. Unchanged correct samples are retained.

## Remaining defects and limitations

**Material new regressions:** none found.

**Shared remaining limitations:** these are source limits, not correction failures: historical GPT-4/price conditions and missing latency/reliability for ToT; synthetic fixed-attack AgentDojo conditions, no adaptive-defense result, missing run-configuration details, and source-internal count/result conflicts.

**Minor remaining limitations:** wording such as “strongest reported attack” is qualified as a fixed paper configuration and does not alter the bounded verdict. The primary sources still do not supply a deployable Creative-Writing baseline selection rule or complete omitted rendered cells. Those gaps are identified rather than filled by inference.

## Overall verdict

**Conclusive.** All four H2c repeats apply the comparability and condition corrections, preserve useful recovered evidence, retain decisive source qualifications, and introduce no material regression.
