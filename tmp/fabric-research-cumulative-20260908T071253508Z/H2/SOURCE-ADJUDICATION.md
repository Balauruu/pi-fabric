# H2 source adjudication

## Outcome

**Conclusive mixed result.** Both candidates add useful evidence recovery and local-test detail. Pair 1 prompt-cost has one material comparator-description defect. Pair 1 tool-security has one material acceptance-gate defect. Neither defect negates the useful gains, but each prevents an unconditional pair-1 pass until the stated minimal repair is made.

## Issue 1 — prompt-cost pair 1

### Actual report and primary passages

- Candidate Y says: “The 74% versus 4.0% **single CoT result**” and then: “The more decision-relevant compute-scale comparison is ToT 74% versus **oracle CoT best-of-100 49%**” and “At near completion-token scale” (`H2/live/prompt-cost-1-Y/RESEARCH.md`, Game of 24, lines 8–23).
- Its own stream and incumbent X identify ordinary CoT as “average over **100 samples per game**” and separately identify best-of-100 as oracle selection (`H2/live/prompt-cost-1-Y/streams/s1.md`, Game of 24; `H2/live/prompt-cost-1-X/RESEARCH.md`, Game of 24).
- The primary reports ordinary IO and CoT results as averaged over 100 samples per game (`corpus/T1/sources/S2-tree-of-thoughts.md`, §4.1, Game of 24). Its Appendix B.3 says ToT needs **5.5k completion tokens**, close to **100 CoT trials at 6.7k**, and performs better than best of 100 independent CoT trials (`S2-tree-of-thoughts.md`, Appendix B.3). The raw Table 7 rows are ToT 74%, 5.5k/1.4k, $0.74 and CoT best-of-100 49%, 6.7k/2.2k, $0.47 (`corpus/T1/sources/S2-cost-tables.md`, Table 7).

### Adjudication

**Material defect: yes.** “Single CoT result” falsely describes the ordinary 4.0% comparator. It omits a decision-relevant sampling condition and can make the 74%-versus-4% quality contrast look like a one-draw baseline comparison.

The subsequent compute statement is **not** that same contrast. It expressly switches to the valid reported resource comparison: 74% ToT versus **49% oracle best-of-100 CoT**, at 5.5k versus 6.7k completion tokens. It must remain attached to that oracle comparison, with its non-deployable-selector qualification. It must not be represented as a near-token comparison of 74% versus ordinary 4%.

### Minimal repair and check

Replace “single CoT result” with “ordinary CoT’s reported average over 100 samples per game,” and add that condition to the Game of 24 table. Keep the next sentence explicitly scoped to oracle best-of-100 CoT and its 5.5k-versus-6.7k completion-token comparison. Re-read only §4.1/Table 2 and Appendix B.3/Table 7.

### Gain, completeness, and non-material items

- **Gain versus X:** Y correctly recovers the raw `Generate/Prompt tokens` format, Table 8 caption/header conflict, historical-cost boundary, and oracle comparison. Those are real gains.
- **Complete-quality / legacy parity:** Y drops X's linked-script Creative-Writing temperature-1.0 detail. That is a method-fidelity loss worth restoring, but it does not alter the disputed Game of 24 comparator or the bounded adoption decision, so it is not the material pair-1 regression.
- **Not material:** raw-header typography by itself is not a regression. The material correction is the ordinary-CoT sample/comparator condition.

## Issue 2 — tool-security pair 1

### Actual report and primary passages

- Candidate Y correctly labels resource/action scopes and high-impact approvals as “proposed deployment controls, **not AgentDojo measurements**” (`H2/live/tool-security-1-Y/RESEARCH.md`, Practical controls). That is a stronger local policy test, not an inference that AgentDojo measured those controls.
- But Y's `acceptance_gate` requires B to lower targeted ASR in `allowed_tools_can_achieve_attacker_goal` and says that a reduction only where policy makes the attack impossible “is not transfer evidence” (`H2/live/tool-security-1-Y/RESEARCH.md`, Local paired-evaluation artifact).
- Incumbent X states the source mechanism correctly: benefit is predicted mainly where the attacker needs an ungranted capability, and the authorized-capability stratum measures residual abuse (`H2/live/tool-security-1-X/RESEARCH.md`, Local paired-evaluation artifact).
- AgentDojo describes the tool filter as selecting the user-task tool set **before observing untrusted data**. It says the filter is particularly effective where user work is read-only and the attacker needs a write tool, but fails where user-required tools also suffice for the attack, explicitly **17%** of test cases (`corpus/T3/sources/agentdojo-2406.13352v3.md`, §4.3, “Strengths and limitations of tool isolation mechanisms”). Table 5 measures tool-filter targeted ASR of 6.84% ± 2.0 only in that paper's fixed GPT-4o defense experiment (`agentdojo-2406.13352v3.md`, Appendix C, Table 5).

### Adjudication

**Material defect: yes.** Y reverses the source-supported capability-stratum mechanism. Denied/disjoint-tool cases are the demonstrated tool-filter benefit condition. Shared/allowed-tool cases are its stated failure condition. Therefore rejecting disjoint-tool reduction as non-transfer evidence and requiring benefit in overlap is a false source inference and an unsound release criterion for the measured mechanism.

Resource/action scopes and approvals can be tested as a **new, stronger local policy** in both strata. A result from that policy could establish a local result, including an overlap benefit, but AgentDojo does not predict or establish that benefit. The local test must not use it as a required proof of AgentDojo transfer.

### Minimal general repair and needed test

Replace the gate with a stratum-preserving rule:

1. Require paired benefit and acceptable legitimate-task utility in cases where the bounded policy denies an authority needed for the attacker goal.
2. Separately report residual ASR, utility loss, false blocks, and approval burden where the attacker can act through allowed authority.
3. Treat any overlap-stratum reduction from resource/action constraints or approvals as a separately demonstrated local-policy result, not as a consequence inferred from coarse tool filtering.

The needed test is the already specified paired local evaluation, with deterministic side-effect checks and results by these two authority-overlap strata. An unchanged sample is not a regression. It is evidence only of no observed improvement for that sampled condition.

### Gain, completeness, and non-material items

- **Gain versus X:** Y adds explicit resource/action scopes, approval burden, persistent-session cases, and policy-targeting variants. These improve the proposed local evaluation.
- **Complete-quality / legacy parity:** Y keeps the Table-5-local comparator, pre-untrusted-data condition, and 17% overlap limitation, but its acceptance gate contradicts them. The defect is in synthesis, not absence of the primary evidence.
- **Not material:** source-count or table-header typography alone does not change this verdict. The material correction is the stratum-to-mechanism acceptance rule.
