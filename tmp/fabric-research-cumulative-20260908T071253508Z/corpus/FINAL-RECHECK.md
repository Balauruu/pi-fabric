# FINAL-RECHECK

## Verdict: SPECIFIC MATERIAL CORRECTION REQUIRED

Do not modify the frozen source snapshots. T1's ToT correction is supported. T3's AgentDojo corrections and the AgentProp-Bench body/Table 2 comparator mapping are supported. One T3 source-internal conflict must be recorded explicitly rather than described only as an abstract “condensation.”

### M1. AgentProp-Bench abstract conflicts with its body/Table 2

The frozen primary snapshot's abstract says the substring heuristic has Cohen's kappa **0.049 “against each of two annotators.”** Its Section 5/Table 2 instead defines columns `vs. A1`, `vs. A2`, and `vs. cons.` and reports substring kappa **0.049 vs. A1**, **0.015 vs. A2**, and **0.036 vs. the 92-trace consensus**. Therefore the comparator-qualified mapping in `T3/AUDIT-v2.md` and `T3/CORRECTIONS.md` is correct, but the abstract is not merely a condensed presentation: it conflicts with the body/Table 2 result. Preserve both passages and designate Table 2/body as the source for comparator-qualified values.

Primary locators: `T3/sources/agentprop-bench-2604.16706.md`, Abstract and §5/Table 2. Direct re-fetch of `https://arxiv.org/html/2604.16706` exposed the rendered v2 table headers `vs. A1`, `vs. A2`, and `vs. cons.` and the 92-trace-consensus wording.

## Confirmed baseline corrections

### T1 ToT cost accounting

- Raw `https://arxiv.org/html/2305.10601v2` Appendix B.3/Table 7 gives ToT **5.5k / 1.4k**, **$0.74**, **74%**, under header `Generate/Prompt tokens`; the nearby prose calls 5.5k “completion tokens.”
- The accessible original `https://arxiv.org/pdf/2305.10601v2` is a 14-page PDF marked “37th Conference on Neural Information Processing Systems (NeurIPS 2023)” and repeats the same Table 7 header, cells, and prose. Thus there is **no HTML-versus-v2-PDF discrepancy**.
- Neither the full raw v2 HTML search nor the retrieved v2 PDF appendix supports a **14k** token figure. It must not be asserted for v2. The source leaves the slash-column semantic unresolved, so retain the literal header and the prose wording rather than assigning 5.5k or 1.4k by expectation.
- Table 8 in both inspected v2 forms retains the primary mismatch: `Creative Writing` header but caption “Cost analysis on Game of 24.”

Primary locators: raw HTML `#A2.SS3`, `#A2.T7`, `#A2.T8`; PDF v2, p.14 / Appendix B.3.

### T3 AgentDojo conflicts

- Primary v3 §3.1 says **74 tools**. Table 1 caption says **70 tools**, and its listed environment rows total 24 + 11 + 28 + 11 = **74**. The source does not reconcile this.
- Primary v3 §4.3 says tool filtering lowers ASR to **7.5%**. Appendix C Table 5, which has actual cells rather than only a caption, reports tool-filter targeted ASR **6.84% ± 2.0** and no-defense targeted ASR **57.69% ± 3.9**. These remain unreconciled source passages.

Primary locators: `T3/sources/agentdojo-2406.13352v3.md`, §3.1/Table 1 and §4.3/Appendix C Table 5; direct re-fetch `https://arxiv.org/html/2406.13352v3`.

## Source and format limitations

- v2 ToT HTML and PDF were both accessible and agree. A retrieval attempt for ToT v1 PDF timed out, so this recheck does not establish whether a historical 14k report came from v1 or another source. That limitation is not evidence that 14k is valid or invalid outside inspected v2 formats.
- The ToT `Generate/Prompt tokens` slash convention is undefined by the primary text.
- AgentProp-Bench's live HTML is rendered v2. The frozen extraction identifies that rendered revision; the finding above is a source-internal abstract/body-table conflict, not a claim about another paper or evaluator audit.
