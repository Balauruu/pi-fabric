# H2 versus H2b fixed-evidence comparison: prompt-cost B

## Scope and method

Compared only `prompt-cost-{1,2}-{X,Y}`. X is the H2 retrieval-guidance control and Y is the H2b condition-complete-recovery treatment. The four assignments impose the same frozen-source boundary: only `corpus/T1/sources/S2-tree-of-thoughts.md` and `S2-cost-tables.md`, with no live retrieval. No other reviews or production checks were inspected.

Primary-passage anchors used below:

- `S2-tree-of-thoughts.md:143,147-149` says IO and CoT were sampled 100 times per Game-of-24 game for average performance, calls best-of-k an **oracle** setup, reports 7.3%, 4.0%, 9.0%, 45%, 74%, 49% best-of-100 CoT, and reports about 60% first-step CoT failures.
- `S2-tree-of-thoughts.md:155-163` gives the Creative-Writing 100-input, five-GPT-4-score, author-subset comparison, 10 baseline samples, iterative-refinement conditions, 6.19/6.93/7.56, 41/21/38, 7.67/7.91, and sample-vote procedure.
- `S2-tree-of-thoughts.md:315-323` says 5.5k completion tokens is close to 100 CoT trials at 6.7k, but ToT performed better than best-of-100 CoT, says Creative Writing is around 5x, calculates $106, and limits the broad claim to 5–100x generated tokens depending on prompts and search.
- `S2-cost-tables.md`, “Surrounding primary qualifications” and Tables 7–8, literally gives `Generate/Prompt tokens`, Table-7 cells (1.8k/1.0k/$0.13/33%; 6.7k/2.2k/$0.47/49%; 5.5k/1.4k/$0.74/74%), Table-8 cells (0.9k/0.4k/$0.06; 0.9k/0.4k/$0.07; 4k/2.9k/$0.32), the undefined slash convention, and the Table-8 caption/header conflict.

## Pair 1: `prompt-cost-1-X` → `prompt-cost-1-Y`

**Outcome: conclusive gain, no new material regression, correction closure passes.**

| Material test | Literal X → Y mapping and primary verification | Result |
|---|---|---|
| Conditions, sample, comparator | X says “best-of-k … is an oracle calculation” and gives 49% versus 74% (`X/RESEARCH.md:23`). Y preserves the ordinary 100-sample averages and labels the 33%/49% rows “Existence of a successful sample under an oracle selector” (`Y:20-21`), then says they are not deployable policies (`Y:27`). This matches source `:143,147-149`. | Pass |
| Recovered table, units, and cost | X’s final table has the exact Table-7 cells (`X:29-33`) and preserves the undefined `Generate/Prompt` convention (`X:35`). Y preserves the same cells (`Y:31-39`) and explicitly retains the label conflict. Both preserve Table 8 and its caption/header conflict (`X:62`; `Y:58,66`). | Pass |
| Counterevidence and source conflicts | Both retain the Creative-Writing 6.19/6.93/7.56 and 7.67 refinement result. Y additionally states that the automatic metric is noisy and the human comparison is an author subset (`Y:66`). This is source-consistent with `S2-tree-of-thoughts.md:155-163`. | Pass |
| Operational boundary | X requires a deterministic/external evaluator and calls LM evaluation “not a proven oracle” (`X:72`). Y requires a reliable or validated evaluator and makes no current-model or general-production claim (`Y:3,77-78`). The primary pruning counterexample supports the caution. | Pass |
| Paired evaluation and mechanism transfer | X proposes a held-out stratified protocol (`X:78-129`). Y strengthens it with a “demonstrated-mechanism” cohort of verifiable multi-step cases, stratified by difficulty and **known failure mode**, while retaining a production-feasible selector requirement (`Y:86-88,141-143`). This uses the source’s observed early-step failure mechanism rather than treating an oracle result as normal CoT. | Gain |
| Extraction → final composition | Y extraction states the Table-7 cells, undefined slash convention, Table-8 conflict, $106, and the oracle limitation. Final Y repeats all of them at `RESEARCH.md:20-21,31-39,58,66,141-150`. The recovered-table context survives. | Pass |

The known ordinary-average versus oracle ambiguity is closed in Y. The known-failure-mode cohort is an operational gate for demonstrated mechanism, not a claim that the paper proved every production stratum fails. It therefore does not dismiss mechanism transfer.

## Pair 2: `prompt-cost-2-X` → `prompt-cost-2-Y`

**Outcome: correction gain is conclusive, but the final no-regression verdict is inconclusive because of one material comparator label.**

| Material test | Literal X → Y mapping and primary verification | Result |
|---|---|---|
| Conditions, sample, and oracle separation | X calls best-of-100 oracle selection (`X/RESEARCH.md:20-25`). Y distinguishes majority self-consistency from best-of-100 oracle rows (`Y:19,22-23`) and says the 4% versus 74% comparison is single-chain CoT versus ToT (`Y:25`). This is faithful to source `:143,147-149`. | Gain |
| Recovered table, units, and cost | X has the full recovered tables and undefined-label qualification (`X:45-60`). Y retains exact Table-7 and Table-8 cells, separately states generated/prompt units, $106, the non-observed Crossword estimate, and Table-8 conflict (`Y:50-63`). This directly matches the cost supplement. | Pass |
| Counterevidence and boundaries | Y retains unknown Creative-Writing baseline aggregation rather than inventing it (`Y:46`), narrow transfer/evaluator limits, and the no-latency boundary (`Y:139,145` and surrounding sections). It also separates mechanism and exploratory boundary cohorts (`Y:103-132`). This is source-bound useful omission handling, not a loss. | Gain |
| Paired evaluation | X already requires deployable selection and resource matching (`X:78-92`). Y improves it with paired arms, budget-matched and service-level-matched analyses, independent validation or blinded judgment, and a separately reported exploratory cohort (`Y:88-132`). This addresses the local-known-failure concern without treating the boundary cohort as a source-established exclusion. | Gain |
| Comparator precision | Y says “The important **matched-compute** directional contrast is 74% ToT versus 49% CoT best-of-100” (`Y:25`). The primary instead says ToT’s 5.5k completion tokens are *close to* 100 CoT trials’ 6.7k (`S2-tree-of-thoughts.md:315`), while Table 7 shows different prompt tokens and $0.74 versus $0.47. “Directional contrast” is defensible. “Matched-compute” is not exact across the published token and dollar units. Y later supplies the correct values and requires truly budget/service-level-matched local analyses (`Y:61,88-132`), so the adoption decision is not changed. | Narrow material wording regression |
| Extraction → final composition | Y extraction preserves the complete raw-table context and final Y preserves it at `RESEARCH.md:50-63,139,145`. The recovery itself survives extraction and composition. The comparator-label issue arises in final composition, not from lost table context. | Pass for recovery |

## Shared defects and excluded dimensions

No shared material source-grounding defect was found. Both X and Y retain the source’s undefined token slash, Table-8 conflict, historical-cost scope, no production latency/reliability evidence, evaluator-pruning risk, and no-default-adoption conclusion. Source count, label typography, legacy-report parity, and speed were not scored.

## Verdict

- **P1:** H2b is a conclusive gain. It closes the oracle-versus-ordinary-sample and paired mechanism-evaluation issues without a new material regression.
- **P2:** H2b conclusively preserves the recovered-table context and improves the paired design, but its “matched-compute” label overstates comparability because the source’s token and dollar units differ. Correction closure is therefore **inconclusive** until that phrase is narrowed to a directional near-100-sample comparison or the resource dimensions are explicitly named.

Overall, H2b’s condition-complete recovery survives extraction and final composition in both pairs. One final-composition comparator phrase prevents an unqualified all-pair no-new-material-regression verdict.
