# T1 corrections before trials

**Status:** setup-corpus correction completed before any candidate test. The changes below are evidence-driven and do not change a source snapshot or relax an acceptance condition.

| Change | Reason | Evidence | Effect |
|---|---|---|---|
| Added `sources/S2-cost-tables.md`. | Existing `S2-tree-of-thoughts.md` has only Table 7 and 8 captions at lines 317 and 321, no cells. | Raw HTTP 200 fetch of `https://arxiv.org/html/2305.10601v2`, locator `#A2.SS3`, tables `#A2.T7` and `#A2.T8`. | Preserves all headers, rows, cells, captions, nearby qualifications, exact locator, and raw table markup in a new supplement. |
| Amended `INPUT.md` to include the supplement. | The frozen prompt must be able to cite the table values rather than caption-only extraction. | Same raw primary source. | Scope remains frozen evidence. The supplement is explicitly the source for Table 7/8 cells. |
| Added `AUDIT-v2.md`. | `AUDIT.md` stated partial ToT cost conclusions while its cited saved extraction had no table cells. | Table 7: ToT `5.5k / 1.4k`, `$0.74`, `74%`; CoT best-of-100 `6.7k / 2.2k`, `$0.47`, `49%`. Table 8: ToT `4k / 2.9k`, `$0.32`. | Retains supported prior facts, corrects table accounting, and records Table 8. It does not overwrite `AUDIT.md`. |
| Explicitly added matched independent-restart and token-matched repair controls to `AUDIT-v2.md`. | The S4 paper uses a same-model i.i.d. baseline at matched program budget, but `AUDIT.md` did not make this causal comparison a local evaluation control. | S4 §3.2 lines 85–89, §4 lines 95, 105, 115, 121, and Appendix A lines 332–342. | Requires causal repair-vs-restart comparison at matched program count and total token count, and distinguishes bootstrap reuse from fresh trial replication. |
| Clarified ReAct sample and fallback conditions in `AUDIT-v2.md`. | The values need exact operational interpretation. | S5 §3.2 lines 62, 66, 70 and §3.3 line 80. | Records 21 CoT-SC samples at temperature 0.7, majority answer, 7/5 conditional ReAct fallback caps, 6/3 manual exemplars, PaLM-540B base model, and limited Wikipedia API. |

## Observed source/format limitations

1. arXiv raw HTML labels the numeric column `Generate/Prompt tokens`; adjacent prose calls 5.5k “completion tokens.” The primary HTML does not define the slash convention further.
2. Raw v2 HTML has no `14k` match. A 14k prompt-token figure is therefore not recorded.
3. Table 8’s primary caption says Game of 24 although its header says Creative Writing. The mismatch is preserved.
4. S4’s primary results are bootstrapped from subtrees of a single large repair tree per task setting, with replacement. They are not a set of wholly fresh independent repair-tree runs.
