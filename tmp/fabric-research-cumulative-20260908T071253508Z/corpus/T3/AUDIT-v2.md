# Independent audit v2: T3 frozen corpus

## Verdict: CORRECTIONS RECORDED BEFORE TRIALS

This v2 audit preserves the existing `AUDIT.md` facts and adds the corrections required by `T1/INDEPENDENT-AUDIT.md` and `T3/INDEPENDENT-AUDIT.md`. No prior source snapshot was altered. `sources/agentprop-bench-2604.16706.md` is added as a distinct frozen primary source. It is the historical primary source for the κ discussion and is neither a replacement for nor a version of S3, `evaluator-validity-audit-2607.02577.md`.

## C1. AgentDojo has two unreconciled internal conflicts

### Tool count: 74 versus 70

S4 v3 §3.1 prose says AgentDojo has **74 tools**. Table 1 says the suite has **70 tools**, 97 realistic user tasks, and 27 injection targets. Its table rows are 24 + 11 + 28 + 11 = **74**, so the row sum agrees with the prose and not the table/caption total. S4 does not reconcile this conflict.

**Correction.** Do not state an unqualified operational tool count. Say: “AgentDojo v3 reports 74 tools in §3.1 and by Table 1 row sum, while Table 1/caption says 70. The source does not resolve the discrepancy.” The consistently reported 97 user tasks and 629 security test cases remain retained facts.

### Tool-filter ASR: prose 7.5% versus Table 5 6.84%

S4 §4.3 prose says: “Our simple tool filtering defense is particularly effective, lowering the attack success rate to **7.5%**.” Appendix C Table 5 instead reports tool-filter targeted ASR **6.84% ± 2.0**, with no-defense targeted ASR **57.69% ± 3.9** under that table's defense/attack selection. The source gives no reconciliation. The prose also limits the mechanism to pre-plannable tool sets and says task tools suffice for the attack in 17% of cases.

**Correction.** Preserve both values exactly and bind claims to prose versus Table 5. Do not call 7.5% a rounding of 6.84%, the same condition, or a general security rate.

## C2. ToolBench-X v1/v2 differ by experiment scope, not a single incompatible result row

The frozen S2 is arXiv `2606.25819v1` (submitted 2026-06-24). Its Figure 4 is a **five-model, 200-task diagnostic subset** comparing Baseline, Hint, test-time scaling, and Oracle under injected recoverable hazards.

arXiv `2606.25819v2` (submitted 2026-06-27) adds a distinct **main benchmark**: its Experimental Setup says it benchmarks **twelve prominent LLMs**, and Table 2 is “Main Results on ToolBench-X” for those twelve models on the full benchmark. v2 still separately retains Figure 4 as “Overall accuracy on the 200-task subset across five models,” with the same diagnostic arms.

**Correction.** Retain the frozen v1 five-model 200-task diagnostic and its stated units/conditions. A historical “twelve models” reference denotes v2's main benchmark unless a particular value/table/version is supplied. It must not be called an incompatible snapshot merely because it is not the v1 five-model diagnostic.

## C3. Historical κ provenance is AgentProp-Bench, not S3

The historical κ values trace to **AgentProp-Bench**, arXiv HTML `2604.16706`, preserved at `sources/agentprop-bench-2604.16706.md`. Historical experiments identify it as `experiments/run-0202-rev04-T3/RESEARCH.md`, S9. The evaluator-validity audit, `2607.02577`, is a different publication and is **not** an AgentProp-Bench replacement, revision, or superseding evaluator source.

### Resolution: 0.036 versus 0.049

AgentProp-Bench §5/Table 2 reports the substring heuristic's Cohen κ against different human references: **0.049** against annotator A1, **0.015** against annotator A2, and **0.036** against their 92-trace consensus. Therefore 0.036 and 0.049 are both source-supported values with different comparators. Neither is an erroneous replacement for the other.

The old wording “kappa 0.049 versus erroneous 0.036” is corrected to this comparator-qualified account. The previous S3 no-match remains a valid source-bound observation about S3 only. It is not evidence of historical error, supersession, or a version transition.

### Source-internal abstract/body conflict

The source abstract says substring κ is **0.049 against each of two annotators**. This conflicts with §5/Table 2, whose distinct comparator columns report **0.049 versus A1**, **0.015 versus A2**, and **0.036 versus the 92-trace consensus**. It is not merely condensed wording. Retain this disagreement explicitly. Use the body/Table 2 when giving comparator-qualified values, without implying the abstract supports that mapping. Exact primary passages are preserved in `sources/agentprop-bench-2604.16706.md`, Abstract and §5/Table 2. This closes M1 in `../FINAL-RECHECK.md` before trials.

### Retained AgentProp-Bench qualifications

- The calibration sample is 100 stratified P2 traces, independently labeled by two annotators, blind to automatic verdicts. Human agreement is κ=0.835 (92% raw).
- The three-LLM majority ensemble uses GPT-4o, Gemini-2.5-Flash, and GPT-4o-mini. It is conservatively biased. The source reports P(human correct | ensemble correct)=0.76 and P(human correct | ensemble wrong)=0.25.
- GPT-4o-mini is the strongest reported single judge (κ=0.567), while the retained ensemble is κ=0.432. This selection is qualified by overlapping bootstrap CIs and the risk of selecting on the same calibration labels.
- Tool-call behavior constrains interpretation: GPT-4o and GPT-4.1-nano call tools in 99–100% of cited traces, Gemini-2.0-Flash calls tools in 5% and fabricates in 37.5%, and GPT-4o-mini calls tools in 40% and fabricates in 12%. Fabricated tool use means asserting tool-derived results without a tool call and is not visible to end-to-end/substrings scores.
- Table 8 is a five-model concurrent-control interceptor experiment. It reports reductions on four tool-calling models and a −1.3 pp null for low-tool-call Gemini-2.0-Flash. It is not a production-security proof. Calibration size, deterministic simulated tools, one-parameter injection, and small stage-two per-model samples remain limitations.

## Existing source-bound S3 facts preserved

S3 still supports its own reported 92/496 evaluator-human disagreements, Table 3 distributions, and 23-run LiveMCPBench range/mean/SD/spread under its stated benchmark/model conditions. Those facts are not deleted or replaced. S3 contains no `Cohen`, `kappa`, `0.049`, or `0.036` passages in the previously recorded corpus search. This absence now has the proper limited interpretation: it does not address AgentProp-Bench's values.

## Trial readiness

The phase input now lists the AgentProp-Bench source as frozen evidence. Future T3 responses must keep S1–S5 source boundaries, conditions, comparators, and limitations explicit and must not merge AgentProp-Bench results into S3.
