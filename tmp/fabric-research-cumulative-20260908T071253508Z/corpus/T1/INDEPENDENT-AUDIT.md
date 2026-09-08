# Independent frozen-corpus audit

## Verdict: NEEDS CORRECTION

I independently inspected all five saved T1 primary extractions, the requested T3 evidence, and live arXiv originals. T1's ten decision facts are materially supported under their stated models, tasks, metrics, comparators, samples, units, and conditions. In particular: (a) ToT's 5.5k versus 6.7k claim is explicitly **completion-token** accounting and its $106 is only the stated Game of 24 plus Creative Writing main-experiment cost, not a general or end-to-end deployment cost; (b) the CoT SingleOp 94.1/94.1 boundary holds; (c) self-repair uses test-execution error messages and feedback-source substitution, with the human-feedback result 33.3% to 52.6% (1.58x); and (d) ReAct's 7/5 cap is a fallback condition, with the paper stating more steps did not improve ReAct. No correction to the frozen T1 facts is warranted.

The corpus nevertheless needs the two T3 decision-critical corrections below before quality experiments, because the task explicitly includes T3 version/evaluator/AgentDojo checks.

## C1: AgentDojo defense prose and table are numerically inconsistent without a documented reconciliation

**Affected audit passage:** `T3/AUDIT.md`, A4, the quoted prose says: “Our simple tool filtering defense is particularly effective, lowering the attack success rate to **7.5%**.” The same A4 **Measured** paragraph says Table 5 reports tool-filter targeted ASR **6.84% ±2.0** and no-defense **57.69% ±3.9**.

**Saved-primary passages:**
- `T3/sources/agentdojo-2406.13352v3.md`, §4.3, lines 299–305: prose gives 7.5% and limits tool filtering to pre-plannable tool sets, noting the 17% case where required task tools can also execute the attack.
- `T3/sources/agentdojo-2406.13352v3.md`, Appendix C Table 5, lines 759–837: under the listed defense columns, no defense is 57.69% ±3.9 and tool filter is 6.84% ±2.0.

**Live cross-check:** `https://arxiv.org/html/2406.13352v3` contains both passages unchanged. It identifies itself as arXiv v3, while its data card says dataset current version v1.0, last updated/released 06/2024.

**Required correction:** Do not present 7.5% as a rounded form of 6.84% or as the same condition. Preserve both exact figures, state that the source does not reconcile them, and bind any claim to its table/prose condition. If a historical AgentDojo figure is replaced because v3 differs, record the prior version, exact prior passage/value, v3 passage/value, and evidence of the version change. The current audit records v3 but supplies none of that change evidence.

## C2: Evaluator-audit corrections lack a historical-source/version trail

**Affected audit passage:** `T3/AUDIT.md`, “Legacy corrections”: “The legacy claim that the evaluator audit reports ‘kappa 0.049 versus erroneous 0.036’ is **not retained**. Searches in the retrieved original S3 … return no matches.”

**Saved-primary passages:**
- `T3/sources/evaluator-validity-audit-2607.02577.md`, header lines 3–7: `https://arxiv.org/html/2607.02577`, retrieved URL with no explicit v suffix.
- Same source, §3.7 lines 105–107: it says corrected annotations, repaired evaluation logic, and revised harnesses are constructed.
- Same source, Table 3 lines 185–269: 92/496 disagreements, 18.5%, with the four benchmark counts and agents.
- Same source, §4.4 lines 303–317: 23 runs of the same 95-task configuration, 57.9%–76.8%, mean 69.4%, SD 5.4 points, spread 18.9 points.

**Live cross-check:** `https://arxiv.org/html/2607.02577` matches the saved source, including §3.7, 92/496, and the 23-run statistics.

**Required correction:** A no-match in the current 2607.02577 rendering is not evidence that a historical reported expectation was erroneous or superseded. Preserve the legacy claim as unverified unless the corpus records its historical source/version and exact passage, then records the later source/version and exact correction/change. The current audit must not silently turn an absent current-string search into a versioned correction.

## Verification notes

- **ToT:** saved `T1/sources/S2-tree-of-thoughts.md` §4.1 lines 141–147 and Appendix B.3 lines 313–323, confirmed live at `https://arxiv.org/html/2305.10601`.
- **CoT:** saved `T1/sources/S1-chain-of-thought.md` Table 2 and MAWPS table, confirmed live at `https://arxiv.org/html/2201.11903` for 17.9/56.9 and 94.1/94.1.
- **Self-repair:** saved `T1/sources/S4-self-repair-silver-bullet.md` abstract/method/Appendix A, confirmed live at `https://arxiv.org/html/2306.09896`.
- **ReAct:** saved `T1/sources/S5-react.md` §3.2 lines 62–70 and §3.3 lines 80–214, confirmed live at `https://arxiv.org/html/2210.03629`.
- **Long-context:** saved `T1/sources/S3-lost-in-the-middle.md` §2–§4 supports the positional intervention and its synthetic-key-value-only query-repetition qualification. No material contradiction found.
