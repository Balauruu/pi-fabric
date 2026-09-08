# T3 corrections and provenance ledger

## Scope

This ledger records corrections made before trials. It does not delete or rewrite prior source snapshots or audit facts. `AUDIT.md` remains preserved. `AUDIT-v2.md` is the corrective audit.

## C1. AgentDojo tool count

**Prior corpus wording:** `AUDIT.md` A4 described the environment as “70 tools.”

**Corrected wording:** AgentDojo v3 has an internal conflict: §3.1 says **74 tools**. Table 1/caption says **70 tools**, while Table 1 rows total 24 + 11 + 28 + 11 = **74**.

**Primary provenance:** `sources/agentdojo-2406.13352v3.md`, §3.1 and Table 1. Independently recorded in `INDEPENDENT-AUDIT.md`, C2.

**Disposition:** Preserve 97 user tasks and 629 security test cases. Do not use either tool count as a precise capacity fact.

## C2. AgentDojo tool-filter ASR

**Prior corpus facts preserved:** `AUDIT.md` A4 quoted §4.3 saying tool filtering lowers ASR to **7.5%**, while its Measured paragraph reports Table 5 tool-filter targeted ASR **6.84% ± 2.0**.

**Corrected interpretation:** These are unreconciled source passages, not documented equivalents or rounding. Table 5's same row gives 73.13% ± 3.5 benign utility and the no-defense comparator is 57.69% ± 3.9 targeted ASR. §4.3 limits the defense to pre-plannable tool sets and says task tools are sufficient for the attack in 17% of cases.

**Primary provenance:** `sources/agentdojo-2406.13352v3.md`, §4.3 and Appendix C Table 5. Independently recorded in `T1/INDEPENDENT-AUDIT.md`, C1.

## C3. ToolBench-X scope/version correction

**Prior corpus wording:** the legacy correction said a row “combines incompatible result snapshots and names twelve models.”

**Corrected interpretation:** arXiv `2606.25819v1` (submitted 2026-06-24) is the frozen five-model **200-task Figure 4 diagnostic**. arXiv `2606.25819v2` (submitted 2026-06-27) separately reports a **twelve-model main benchmark** in Table 2, and also retains Figure 4's five-model 200-task diagnostic. A bare twelve-model reference is not intrinsically an incompatible snapshot.

**Primary provenance:** frozen `sources/toolbench-x-2606.25819v1.md`; live primary `https://arxiv.org/html/2606.25819v2`; independently recorded in `INDEPENDENT-AUDIT.md`, C1.

## C4. Historical κ source correction

**Prior corpus wording:** `AUDIT.md` removed “kappa 0.049 versus erroneous 0.036” because S3 contained no matching strings.

**Corrected provenance:** The historical source is **AgentProp-Bench**, `https://arxiv.org/html/2604.16706`, historically traced in `experiments/run-0202-rev04-T3/RESEARCH.md` S9. The recovered frozen extraction is `sources/agentprop-bench-2604.16706.md`. `evaluator-validity-audit-2607.02577.md` is a different source and is not an AgentProp-Bench replacement or version.

**Exact primary passage and resolution:** AgentProp-Bench §5/Table 2 says substring κ is “**0.049 and 0.015; 0.036 on the 92-trace consensus**.” Hence **0.049** is agreement with annotator A1, **0.015** with annotator A2, and **0.036** with the 92-trace consensus. The values differ by comparator. Neither is erroneous.

**Retained supported qualifications:** 100 stratified P2 traces have two blind human annotations, κ=0.835 and 92% raw agreement. The ensemble uses GPT-4o, Gemini-2.5-Flash, and GPT-4o-mini and is calibrated with P(human correct | ensemble correct)=0.76 and P(human correct | ensemble wrong)=0.25. Model-specific tool-call/fabrication rates and Table 8's concurrent-control limits are preserved in the new source and `AUDIT-v2.md`.

**S3 fact preserved:** the prior no-match describes S3 only. It cannot support a historical supersession claim.
