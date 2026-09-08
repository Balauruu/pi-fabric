# Tool-security B: independent exact-topic H2 comparison

## Artifact mapping

| Pair | X incumbent | Y candidate | Same assignment |
|---|---|---|---|
| 1 | `live/tool-security-1-X/RESEARCH.md` | `live/tool-security-1-Y/RESEARCH.md` | `live/tool-security-1-{X,Y}/assignment.md`: AgentDojo v3 constraints for deploying a permission-bounded tool agent |
| 2 | `live/tool-security-2-X/RESEARCH.md` | `live/tool-security-2-Y/RESEARCH.md` | `live/tool-security-2-{X,Y}/assignment.md`: same literal assignment |

Audit basis: the four reports, their respective `streams/s1.md`, and primary snapshot `corpus/T3/sources/agentdojo-2406.13352v3.md`. Local stream prose was used only to locate synthesis changes, not to override the primary paper.

## Primary-source checks

- **P1 Methods/sample/metrics.** §3.1/Table 1 says 97 user tasks, 27 injection targets, 629 security cases, but has a real count conflict: prose says 74 tools while Table 1 says 70 and its four displayed counts sum to 74. §3.4 defines benign utility, utility under attack, and targeted ASR, and makes a collection successful when any constituent attack succeeds. Both candidates preserve the denominators and the unresolved conflict.
- **P2 Attack comparator.** §4.2 calls Max per-case selection from TODO, Ignore previous, InjecAgent, and Important message. Appendix C Table 4 headers are `Attacks / Targeted / Untargeted`; its displayed targeted rows are 3.66%, 5.41%, 5.72%, 57.7%, and 57.55% (Max), respectively. The source prose says Max adds another 10%, so the rendered targeted ordering is an unreconciled format/source conflict. Both Y reports retain it rather than infer an upper bound.
- **P3 Decision table and condition.** §4.3 says GPT-4o defenses are evaluated against its strongest attack. Table 5 headers are `Defenses / Benign utility / Utility w. attack / Targeted ASR`, with No defense 69.0% ±3.6, 50.01% ±3.9, 57.69% ±3.9 and Tool filter 73.13% ±3.5, 56.28% ±3.9, 6.84% ±2.0. Thus the 50.85-point ASR delta is valid only inside Table 5, never versus Table 3's GPT-4o 47.69% ±3.90. The candidates make that separation.
- **P4 Limits/cost.** §4.3 says filtering fails for result-dependent planning and tool overlap, explicitly 17% of test cases, and flags multi-task context without reset and output/recommendation manipulation. Appendix D estimates US$35 for 629 GPT-4o security cases and US$4 for 97 utility cases. Neither is a current local-cost or speed result. Both candidates correctly avoid a speed claim.

## Pair verdicts

### Pair 1 — **NO: Y has a material regression**

**Gain traced to recovery.** Relative to X, Y recovers the complete Table 3 model rows and confidence intervals, complete Table 4 untargeted rows, more explicit reproducibility fields, and a clearer paired manifest. These are genuine evidence and local-evaluation gains. The source stream is substantively strong on the same Table 5 conditions and 17% overlap constraint.

**Material synthesis loss.** Y's `acceptance_gate` requires B to lower targeted ASR in `allowed_tools_can_achieve_attacker_goal`, then says a reduction only where policy makes the attack impossible is not transfer evidence. This reverses the mechanism established in §4.3: the filter is particularly effective where the attacker needs a tool outside the user-required set; it explicitly fails when user-required tools can carry out the attack. X correctly makes the disjoint/denied-capability stratum the predicted benefit and treats overlap as residual risk. This is decision-critical because it can reject the demonstrated transfer mechanism and demand an unsupported security effect in the known failure stratum.

**Required correction, smallest targeted check.** Replace that gate with: evaluate and expect benefit primarily in `allowed_tools_cannot_achieve_attacker_goal`; separately report residual ASR and legitimate-completion tradeoffs in overlap/same-capability cases. Delete the claim that blocking an ungranted capability is not transfer evidence. Recheck the manifest stratum names and gate against §4.3 and Table 5 only.

### Pair 2 — **YES: Y gains without material regression**

**Gains traced to recovery/synthesis.** Y retains X's correct decision boundary and supplies full Table 3 rows with 95% CIs, exact Table 4/Table 5 intervals, explicit suite-row counts, the Table 4 Max-versus-Important conflict, table-local comparator discipline, and a concrete 30-workflow/90-security-case local artifact with units, strata, placements, outcomes, and a no-aggregate-pass decision rule. It continues to distinguish measured filtering from proposed trusted authorization, and does not treat historical US$35/US$4 as present cost or speed.

**Nonmaterial correction required.** Y says defense ablations used GPT-4o “due to Claude rate limits.” The primary wording is narrower and mixed: it says GPT-4o was the highest-utility focus when in-depth analysis began because Claude **Opus** access was rate limited, while it separately says Claude 3.5 Sonnet was released after the first version. Correct that attribution rather than generalizing it to Claude. Also retain raw Table 5 headers when reproducing the table, especially `Defenses` and `Utility w. attack`, instead of relabeling them `Comparator` and `Utility under attack`.

## Overall verdict — **INCONCLUSIVE / mixed**

Y improves evidence recovery and actionable evaluation in both pairs, but does **not** clear the no-material-regression test overall because pair 1 reverses the decision-critical capability-stratum acceptance rule. Pair 2 is a conclusive improvement after the small attribution/header correction. The minimal path to an overall YES is the pair-1 gate correction above, followed by a primary-source-only check of the Table 5 conditions and §4.3 failure mechanism.
