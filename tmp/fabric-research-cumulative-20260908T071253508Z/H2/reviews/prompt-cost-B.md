# Independent H2 review: prompt-cost B

## Artifact mapping

| Pair | Incumbent X | Candidate Y | Same assignment |
|---|---|---|---|
| 1 | `live/prompt-cost-1-X/RESEARCH.md` | `live/prompt-cost-1-Y/RESEARCH.md` | `live/prompt-cost-1-{X,Y}/assignment.md` |
| 2 | `live/prompt-cost-2-X/RESEARCH.md` | `live/prompt-cost-2-Y/RESEARCH.md` | `live/prompt-cost-2-{X,Y}/assignment.md` |

Both assignments require original Game of 24 and Creative Writing results, `Generate/Prompt tokens`, cost, exact comparators and conditions, limits, and a paired local evaluation. The source-note streams inspected were the matching `live/prompt-cost-{1,2}-{X,Y}/streams/s1.md` files.

## Decisive primary evidence

`corpus/T1/sources/S2-cost-tables.md`, Appendix B.3, preserves the primary header **`Generate/Prompt tokens`**. Table 7 rows are IO best-of-100 `1.8k / 1.0k`, `$0.13`, `33%`; CoT best-of-100 `6.7k / 2.2k`, `$0.47`, `49%`; and ToT `5.5k / 1.4k`, `$0.74`, `74%`. Table 8's header/rows identify Creative Writing, while its published caption says Game of 24. Its rows are IO `0.9k / 0.4k`, `$0.06`; CoT `0.9k / 0.4k`, `$0.07`; ToT `4k / 2.9k`, `$0.32`. The surrounding passage says ToT's 5.5k completion tokens are close to 100 CoT trials' 6.7k, but does not turn that into an equal-cost result or explain the dollar/token relationship.

The original-paper passage in `corpus/T1/sources/S2-tree-of-thoughts.md`, §4.1, says ordinary IO and CoT are **averaged over 100 samples per game**. Thus 74% ToT versus 4.0% CoT is not a single-CoT-sample comparison. It also establishes the 100-game slice, success rule, 5-shot IO, three-equation CoT, 100-sample self-consistency, ground-truth refinement feedback, three equation steps, BFS `b=5`, and three `sure/maybe/impossible` value samples. §4.2 establishes the 100 writing inputs, zero-shot ten-sample IO/CoT baselines, five-plan/five-vote then five-passage/five-vote ToT, coherence scores, and author-subset blind comparison.

## Pair verdicts

### P1 — **CONCLUSIVE: Y gains, but with MATERIAL REGRESSION. Verdict: NO.**

**Gain traced before synthesis.** `prompt-cost-1-Y/streams/s1.md` adds the raw header, table-caption conflict, and guards against treating the completion-token comparison as equal-cost. `prompt-cost-1-Y/RESEARCH.md` carries those improvements: it identifies the Table 8 caption/header conflict and says the dollar cause cannot be inferred. This corrects X's weaker rewritten `Completion / prompt` presentation in `prompt-cost-1-X/RESEARCH.md` and retains decision-critical rows, oracle/refinement qualifications, limits, and a usable local evaluation.

**Regression.** `prompt-cost-1-Y/RESEARCH.md`, Game of 24 interpretation, calls 74% versus 4.0% a “single CoT result.” That contradicts its own table's 100-sample condition and the §4.1 primary passage above. It materially misstates the comparator/sample condition, so the candidate cannot pass despite the source-format gain. The candidate also omits X's linked-script Creative Writing temperature-1.0 condition, which should be restored for complete method fidelity.

**Required corrections.**
1. Replace “single CoT result” with: “the reported 4.0% is the average over 100 CoT samples per game; it is still not a cost- or selector-matched production comparison.”
2. Restore the Creative Writing GPT-4 temperature-1.0 linked-script condition, or explicitly limit the claim to the paper's stated default and mark the script-specific setting unreported.
3. Render the cost-table column literally as `Generate/Prompt tokens`, rather than a rewritten label, wherever the table is reproduced.

### P2 — **CONCLUSIVE: Y gains without material regression. Verdict: YES.**

`prompt-cost-2-X/streams/s1.md` and `prompt-cost-2-X/RESEARCH.md` contain two decision-critical defects: they call 74% versus 4% a single-CoT comparison and derive `$0.372` from a repository tariff to label the reported `$0.74` an internal accounting inconsistency. The latter goes beyond the decisive primary table, whose raw labels and report do not supply a tariff or per-call decomposition.

`prompt-cost-2-Y/streams/s1.md` removes both errors before synthesis. `prompt-cost-2-Y/RESEARCH.md` correctly records 100-sample averaging, preserves oracle and ground-truth-feedback qualifications, keeps the reported `$0.74` and `$0.47` without reverse-engineering their difference, preserves the Table 8 conflict, and has a coherent, actionable paired evaluation with equal-dollar/equal-token and quality-target views. Its result, methods, sample, units, costs, limits, and local adoption rule are all decision-usable.

**Required correction (format fidelity only, not material regression):** render the table header exactly as `Generate/Prompt tokens`, not `Generate / prompt tokens per case`.

## Overall verdict — **CONCLUSIVE: MIXED, NOT A UNIFORM PASS**

Y improves source-format recovery and primary-evidence discipline in both pairs. Pair 2 passes. Pair 1 fails because it newly misstates the ordinary CoT sample/comparator condition. The smallest targeted check after correction is to re-read §4.1's baseline sentence and the Game of 24 interpretation together, then verify the literal Appendix B.3 header and Table 7/8 rows remain unchanged. No speed finding is accepted or inferred.
