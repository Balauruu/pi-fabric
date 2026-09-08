# H2 versus H2b fixed-evidence review — prompt-cost A

## Verdict

**Conclusive: H2b (Y) closes the two named repair risks in both pairs, with no material new-evidence regression.** The original conditional conclusion remains supported: do not make ToT the default, and test a bounded configuration locally. This is a correctness and decision-utility comparison, not a speed or full-legacy-parity score.

## Evidence boundary and audit method

Assignment literal: “**Use ONLY these frozen original source files**” and “**Follow full relevant method/result/table/limitation passages with real read continuations.**” I read only each pair’s `RESEARCH.md`, its `streams/s1.md`, its `assignment.md`, and the two authorized primary files. The governing primary passages were checked against the reports, not against local synthesis notes.

Primary literal anchors:

- `S2-tree-of-thoughts.md`, §4.1: “**For each game, we sample IO and CoT prompting for 100 times for average performance.**” It separately describes CoT self-consistency as majority output from 100 samples and iterative refine as using “**groundtruth feedback signals about equation correctness**.”
- §3 defines a ToT instantiation by “**1. How to decompose … 2. How to generate … 3. How to heuristically evaluate … 4. What search algorithm to use.**” It says thoughts should be small enough for diverse generation and large enough for evaluation.
- `S2-cost-tables.md`: “**5.5k completion tokens, close to 100 CoT trials (6.7k tokens). But the performance of ToT is better than best of 100 independent CoT trials.**” Table 7 gives `CoT (best of 100) | 6.7k / 2.2k | $0.47 | 49%` and `ToT | 5.5k / 1.4k | $0.74 | 74%`. The supplement also says the slash convention is not defined and that cost “**highly depend[s] on the prompts and search algorithms used**.”
- The same supplement gives Creative Writing’s `IO 0.9k / 0.4k / $0.06`, `CoT 0.9k / 0.4k / $0.07`, and `ToT 4k / 2.9k / $0.32`, while preserving the Table 8 caption/header conflict.

## Pair 1: `prompt-cost-1-X` → `prompt-cost-1-Y`

**Outcome: gain, correction closed, no material regression.**

| Required condition | X mapping | Y mapping | Primary check and decision impact |
|---|---|---|---|
| Comparator type | “**best-of-k … is an oracle calculation, not a deployed selection policy**.” | “**IO, oracle best-of-100**” and “**CoT, oracle best-of-100**”; later, “**Do not substitute oracle best-of-*n* performance**.” | Table 7 labels these `best of 100`, while the source describes independent trials. Calling selection oracle is a clearly marked deployment inference, not a false source quote. Y retains and operationalizes the distinction. Material risk closed. |
| Ordinary-sample versus selected result | X separates 7.3%, 4.0%, 9.0%, and best-of-100. | Y’s table explicitly labels 7.3%/4.0% as “**Average performance across 100 samples per game**,” 9.0% as majority output, and 33%/49% as oracle selection. | This exactly respects the source’s distinct average and majority procedures. No ambiguity survives in the final composition. |
| Units and sample | X supplies the 100 hard games, GPT-4, temperature, dates, cost/token table. | Y retains 100 cases, indices, success rule, five-shot IO, three-equation CoT, 100 samples/game, and `Generate / prompt tokens`. | Matches the assigned requirement to keep model, task, algorithm, budget, and metric explicit. No material loss. |
| Recovered tables and source conflict | X preserves slash ambiguity and Table 8 discrepancy. | Y says “**Preserve these as published rather than recalculating**” and “**That source inconsistency is retained.**” | Matches the raw supplement’s undefined slash convention and its published Table 8 caption/header mismatch. Recovered-table context survives extraction and final composition. |
| Counterevidence and boundary | X includes refinement above standalone ToT and evaluator-pruning risk. | Y retains refinement scores, noisy GPT-4 judge, author-subset comparison, GPT-3.5/mixed-condition transfer limits, and pruning false-negative gate. | These are source-supported and materially constrain the recommendation. |
| Paired evaluation | X proposes paired arms and costs. | Y requires the same `pair_id`, records deployable-selector arm, and separates “**Fixed cost**” from “**Fixed quality target**.” | This prevents substitution of oracle selection for deployable selection and jointly tests quality, cost, latency, and evaluator error. |

**Useful omissions, not regressions:** Y does not repeat X’s derived $13/$47/$74 100-case totals or its 1.57× calculation. The raw per-case cells and the $106 source arithmetic remain. Those omissions do not change the adoption decision. Y also omits X’s “one common proposal prompt” wording but retains sequential proposals, three steps, BFS breadth five, and three valuations, which are the material algorithm conditions.

## Pair 2: `prompt-cost-2-X` → `prompt-cost-2-Y`

**Outcome: gain, correction closed, no material regression.**

| Required condition | X mapping | Y mapping | Primary check and decision impact |
|---|---|---|---|
| Comparator and resource matching | X: “**best of 100 is oracle-selected**.” | Y: “**The important matched-compute directional contrast is 74% ToT versus 49% CoT best-of-100**,” then requires both budget-matched and service-level-matched analyses. | The wording does not call the selected CoT result ordinary CoT. Its proposed comparison explicitly includes a deployable selector. This closes the ordinary-sample/oracle ambiguity. |
| Material condition completeness | X supplies task, 100-case sample, model, temperature, algorithm, scores, costs, and limits. | Y preserves the same conditions and adds that Creative Writing baseline sample aggregation is unavailable: “**That missing selection rule blocks a tighter comparison.**” | This is appropriate source-bound uncertainty, not fabricated comparability. |
| Source conflict and recovered-table context | X retains token-label and Table 8 caption/header limitations. | Y quotes the exact header, retains every Table 7/8 row, says “**The discrepancy is preserved**,” and says the first value is called completion tokens in prose without defined slash semantics. | Directly matches the raw-table supplement. No extraction-to-composition loss found. |
| Counterevidence and operational boundary | X covers pruning failure, GPT-3.5 transfer, and no latency/reliability evidence. | Y retains those limits, distinguishes verifiable arithmetic from model-judged writing, and excludes routine/easy and knowledge-bound cases from default adoption. | Source supports the narrow transfer conclusion. Proposed controls are labelled as such. |
| Mechanism transfer versus known-failure stratum | X requires recoverability from an early bad step. | Y defines a “**mechanism**” cohort as “**representative hard cases with verifiable multi-step states and early-decision sensitivity**,” and a separate boundary cohort “**to detect transfer failure and unnecessary spend**.” | Y does **not** dismiss demonstrated mechanism transfer. It makes it the primary adoption cohort, while correctly requiring local confirmation before production promotion. The local-CoT-failure gate is a proposed decision control, not a claim that the paper established a production failure stratum. Risk closed. |
| Paired evaluation | X pairs IO/CoT/ToT on identical cases. | Y requires every arm per case, including deployable CoT multi-sample selection, fixed conditions, equal caps, full branch/vote/retry accounting, and a pre-specified mechanism-cohort rule. | Complete enough to answer the assigned matched-local-evaluation requirement without treating oracle results as deployment evidence. |

**Useful omissions, not regressions:** Y does not repeat X’s detailed “four of 20” crossword count or all derived cost ratios. It retains the material pruning mechanism and primary table values. The omitted details do not alter the conditional adoption decision.

## Shared findings, kept separate from pair gains

- **F1 — historical transfer limit:** Both Y reports correctly restrict the evidence to the 2023 GPT-4 configuration and do not infer current production performance.
- **F2 — no operational outcome source:** Both state that latency, tail latency, reliability, and current economics require a local test. This is a source-bound omission in the primary study, not a report defect.
- **F3 — no source conflict unresolved:** Both preserve, rather than normalize away, the undefined `Generate/Prompt tokens` convention and Table 8 caption/header mismatch.

## Final conclusion

Both H2b reports retain the authoritative numbers, conditions, counterevidence, and boundaries while making comparator selection and paired evaluation condition-complete. **Conclusive outcome: accept H2b’s repair for both pairs.**
