# H2 prompt-cost A: independent exact-topic comparison

## Artifact mapping

- **Pair 1:** identical assignment.md in `live/prompt-cost-1-X` and `live/prompt-cost-1-Y`; incumbent `prompt-cost-1-X/RESEARCH.md`, candidate `prompt-cost-1-Y/RESEARCH.md`.
- **Pair 2:** identical assignment.md in `live/prompt-cost-2-X` and `live/prompt-cost-2-Y`; incumbent `prompt-cost-2-X/RESEARCH.md`, candidate `prompt-cost-2-Y/RESEARCH.md`.
- Both assignments require original-paper-only Game of 24 and Creative Writing results, generation/prompt accounting, exact comparators, model/sample/algorithm conditions, limitations, adoption boundary, and matched local evaluation. I audited each report and its own `streams/s1.md` against `corpus/T1/sources/S2-tree-of-thoughts.md` and `S2-cost-tables.md`.

## Decisive primary evidence

- **Cost table format:** raw Appendix B.3 Table 7 headers are `Game of 24 | Generate/Prompt tokens | Cost per case | Success`; rows are IO (best of 100) 1.8k / 1.0k, $0.13, 33%; CoT (best of 100) 6.7k / 2.2k, $0.47, 49%; ToT 5.5k / 1.4k, $0.74, 74% (`S2-cost-tables.md`, “Faithful extraction of Table 7”). Table 8's header is `Creative Writing`, but its published caption says `Cost analysis on Game of 24`; its rows are IO 0.9k / 0.4k / $0.06, CoT 0.9k / 0.4k / $0.07, ToT 4k / 2.9k / $0.32 (same file, “Faithful extraction of Table 8”).
- **Comparator boundary:** Appendix B.3 says 5.5k completion tokens is close to 100 CoT trials (6.7k), while ToT outperforms “best of 100 independent CoT trials.” It also says resource use depends on prompts/search and can be 5–100× more generated tokens than CoT (`S2-tree-of-thoughts.md`, Appendix B.3). Thus historical 1.4k prompt tokens must not be mistaken for 14k, and fewer reported tokens do not establish lower actual dollar cost.

## Pair verdicts

### P1 — prompt-cost-1-X → prompt-cost-1-Y: **INCONCLUSIVE / correction required**

**Gains.** Y improves table provenance and presentation: it preserves the exact `Generate/Prompt tokens` label, all six cost rows, the Table 8 caption/header conflict, historical-dollar boundary, oracle and refinement qualifications, and a stronger actionable matched-budget protocol. Its conclusion remains appropriately conditional.

**Material regression.** Y calls the 74% versus 4.0% contrast a “single CoT result” and calls it “near completion-token scale” (`prompt-cost-1-Y/RESEARCH.md`, Game of 24 interpretation). That is not supported by its own source stream or the original comparison framing. `prompt-cost-1-X/streams/s1.md` records IO/CoT as averages over 100 samples per game, and the primary Appendix frames 6.7k as 100 CoT trials. Y's table omits the 100-samples-per-game condition entirely. This changes the decision-critical sample/comparator description even though the 4% number and final recommendation are unchanged.

**Required correction, smallest check:** Replace “single CoT result” and “near completion-token scale” with a source-faithful statement: ordinary CoT was reported as average performance over 100 samples per game, while the resource comparison is ToT 5.5k completion tokens versus 6.7k for the oracle best-of-100 CoT arm. Add that sample condition to the Game24 table. Re-read §4.1/Table 2 and Appendix B.3 after editing.

### P2 — prompt-cost-2-X → prompt-cost-2-Y: **CONCLUSIVE PASS**

Y gains the direct raw-format recovery that X lacked: it preserves the table labels, all rows, the Table 8 caption/header conflict, the absence of a paper tariff/per-call breakdown, and the non-deployability of oracle best-of-100. It retains every decision-critical result, method, sample, units, historical cost, qualifier, transfer boundary, and local paired-evaluation control. It correctly states that 5.5k/1.4k versus 6.7k/2.2k does not explain $0.74 versus $0.47. Its more compact local artifact still controls model, selector, budget, cost, p95 latency, failures, and paired quality. No material regression found.

## Overall verdict: **INCONCLUSIVE — Y does not yet demonstrate gain without material regression across both pairs**

Pair 2 passes. Pair 1 has a localized but decision-critical comparator/sample regression. Apply P1's one wording-and-table correction, then rerun only the stated source check; no broad rewrite is needed.
