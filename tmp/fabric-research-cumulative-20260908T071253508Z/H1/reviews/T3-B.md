# T3-B independent paired assessment

## Verdict

**Frozen-scope quality, not legacy parity:** H1 is not a reliable overall improvement. T3-1 is byte-identical to its incumbent, so it has no gain. T3-2 materially improves source fidelity and decision-critical evaluation detail without a new regression, but both T3-2 reports retain material source-conflict/condition defects. The mixed result across the two repeats makes the claimed advantage repeat-sensitive. This review does **not** establish full legacy parity, workflow behavior, or speed.

## Directly verified evidence

- S1 defines reward as final database equality **and** required user-visible information, and says `r=1` can still violate an explicit-confirmation policy. It defines `pass^k` as all k i.i.d. trials succeeding. (`corpus/T3/sources/tau-bench-2406.12045.md`, §3 “Reward” and “Pass^k metric”)
- S2 states that every injected instance preserves a viable recovery path. Its Figure 4 is explicitly “Overall accuracy on the 200-task subset across five models,” with Baseline, Hint, TTS, and clean Oracle; Hint adds 25.5–35.5 points and TTS 3.5–11.5. (`corpus/T3/sources/toolbench-x-2606.25819v1.md`, Abstract and “Further Analysis” around Figure 4)
- The frozen S2 extraction also has a full-benchmark Table 3 with twelve named models despite its v1 header, whereas `AUDIT-v2.md` says the twelve-model main benchmark is v2 and the retained v1 evidence is the five-model 200-task diagnostic. This source/audit inconsistency needs an explicit treatment, not silent selection.
- S3 reports 92/496 evaluator-human disagreements and 23-run LiveMCPBench scores of 57.9%–76.8%. (`corpus/T3/sources/evaluator-validity-audit-2607.02577.md`, Abstract)
- S4 §3.1 says “74 tools”; Table 1/caption says 70 while its rows sum to 74. S4 §4.3 says tool filtering lowers ASR to 7.5%, while Appendix C Table 5 reports 6.84% ±2.0 under its stated defense/attack selection. (`corpus/T3/sources/agentdojo-2406.13352v3.md`, §3.1/Table 1, §4.3/Table 5)
- S5’s abstract says substring κ=0.049 “against each of two annotators”; §5/Table 2 instead maps 0.049 to A1, 0.015 to A2, and 0.036 to the 92-trace consensus. (`corpus/T3/sources/agentprop-bench-2604.16706.md`, Abstract, §5/Table 2)

## Paired results

### P1. T3-1: X1 versus Y1

**No improvement.** The reports are byte-identical (110 lines each), including their defects. Therefore Y1 has neither an accuracy nor a structural gain over X1.

**Shared material defects.**

1. **D1 — ToolBench-X scope is mishandled.** Both state: “**Twelve models are scored**” and “**Table 2 reports best overall accuracy 0.513 … GPT-5.4 0.453, GPT-4o 0.359**” (`baseline/T3-1/RESEARCH.md` and `H1/T3-1/RESEARCH.md`, “What the publications evaluate,” ToolBench-X row). The primary extraction labels these values Table 3, not Table 2. More importantly, the response gives the twelve-model full-benchmark account as unqualified v1 evidence, while `AUDIT-v2.md` requires the retained v1 claim to be the five-model, 200-task diagnostic and identifies the twelve-model main-benchmark framing as v2. The frozen extraction itself conflicts with that correction record, so a decision-grade report must name and bound the discrepancy.
2. **D2 — S5’s decisive source-internal conflict is omitted.** Both give the body/Table 2 κ mapping but never state that it conflicts with the abstract’s “0.049 against each of two annotators” claim (`baseline/T3-1/RESEARCH.md` and `H1/T3-1/RESEARCH.md`, AgentProp-Bench row). `AUDIT-v2.md`, `FINAL-RECHECK.md`, and the frozen S5 passages require preservation of both.
3. **D3 — S4 conditions are blurred.** Both pair S4 Table 3 no-defense figures with a Table 5 tool-filter figure in the same account, calling them “under its attack setup” (`baseline/T3-1/RESEARCH.md` and `H1/T3-1/RESEARCH.md`, AgentDojo row). The report identifies the 7.5%/6.84% prose-table conflict later, which is good, but does not clearly say that Table 5 is a stronger attack/defense selection and cannot be treated as the Table 3 comparator.

The reports otherwise have a coherent source table, separate S3 from S5, distinguish measurements from proposed controls, and provide actionable permission, trace, retry, human-review, and adversarial-test controls. Those strengths are parity, not H1 gains.

### P2. T3-2: X2 versus Y2

**Material improvement without a new Y-specific regression, but incomplete.** Y2 changes two source-table passages that repair consequential omissions in X2.

**Gains in Y2.**

1. **G1 — τ-bench outcome semantics.** X2 says “Primary result is state-based pass^1” (`baseline/T3-2/RESEARCH.md`, τ-bench row). Y2 instead says “combined database-action and required-output pass^1” and adds, “A reward of 1 can still miss an explicit-confirmation policy violation” (`H1/T3-2/RESEARCH.md`, same row). This matches S1’s reward passage and preserves the key evaluator/policy limitation.
2. **G2 — ToolBench-X scoring and comparator scope.** X2 reduces the metric to “Exact final-answer matching compares clean and hazard environments.” Y2 states “backend-state match or a final response explicitly containing the ground-truth answer” and “Clean-versus-faulted comparison is limited to the 200-task diagnostic subset” (`baseline/T3-2/RESEARCH.md` and `H1/T3-2/RESEARCH.md`, ToolBench-X row). This better preserves scoring units and the actual diagnostic comparator.

**Shared material defects, not repaired by Y2.**

1. **D4 — Unqualified AgentDojo tool count.** Both say “70 tools” (`baseline/T3-2/RESEARCH.md` and `H1/T3-2/RESEARCH.md`, AgentDojo row). That is not decision-grade because S4 itself says 74 in prose and its Table 1 rows sum to 74. The report must state the unresolved 74-versus-70 conflict.
2. **D5 — Mixed S4 table conditions.** Both label “no defense” as benign utility 69.0%, utility under attack 50.01%, targeted ASR 57.69%, then contrast the tool filter 6.84% (`baseline/T3-2/RESEARCH.md` and `H1/T3-2/RESEARCH.md`, AgentDojo row). Audited Table 3 no-defense values are 69.00%, 50.08%, and 47.69%; 57.69% is Table 5’s stronger attack-selection no-defense ASR. The report neither names the table boundary nor supplies a condition-matched comparison.
3. **D6 — S5 abstract/body conflict remains omitted.** Both state the body mapping “κ=.049/.015 vs annotators, .036 consensus” but omit the conflicting abstract claim, as in P1.
4. **D7 — S2 correction conflict remains unaddressed.** Y2 correctly narrows the clean-versus-faulted comparison to 200 tasks, but neither report explains the frozen v1-header/Table-3 twelve-model content versus `AUDIT-v2.md`’s v2-scope correction. Its generic “all evaluated models” avoids an erroneous count but does not resolve the evidence conflict.

Y2 retains X2’s coherent structure, source separation, non-production-security conclusion, decision table, and operational controls. The two additions are genuine gains and introduce no observable Y-only regression.

## Overall assessment

- **Accuracy:** P1 contains material ToolBench-X scope/table errors. P2 Y improves S1/S2 accuracy, but all P2 reports materially mishandle S4’s tool-count and Table 3/Table 5 conditions and omit the required S5 conflict.
- **Decision-critical preservation:** Y2 is better on S1 reward semantics and S2 scoring/subset. Neither repeat fully preserves all required source conflicts.
- **Comparators, units, samples, conditions:** S1/S3 are generally well bounded. S2 needs an explicit frozen-source versus audit-v2 scope note. S4 needs Table 3 versus Table 5 condition separation. S5 needs abstract versus body/Table 2 comparator separation.
- **Actionability and controls:** All reports supply sensible source-labeled operational controls and a smallest deployment evaluation. They properly avoid claiming that benchmark, evaluator, or defense measurements prove production security.

**Disposition:** P1: no H1 improvement. P2: H1 materially improves the incumbent without regression, but remains below decision-grade frozen-scope quality because D4–D7 remain. Overall: **no stable material H1 superiority across paired repeats**.
