# Tool-security H2 comparison audit

## Artifact mapping

| Pair | Incumbent X | Candidate Y | Same assignment |
|---|---|---|---|
| 1 | `H2/live/tool-security-1-X/RESEARCH.md` | `H2/live/tool-security-1-Y/RESEARCH.md` | `H2/live/tool-security-1-{X,Y}/assignment.md` |
| 2 | `H2/live/tool-security-2-X/RESEARCH.md` | `H2/live/tool-security-2-Y/RESEARCH.md` | `H2/live/tool-security-2-{X,Y}/assignment.md` |

All four assignments are byte-for-byte the same topic and decision. X is the incumbent and Y is the source-format-recovery candidate. Audit authority is `corpus/T3/sources/agentdojo-2406.13352v3.md`, not either local stream.

## Primary-source checks

- **P1 — exact defense comparison.** Appendix C, Table 5 has raw headers **Defenses**, **Benign utility**, **Utility w. attack**, and **Targeted ASR**. Its GPT-4o rows are: No defense 69.0 ±3.6, 50.01 ±3.9, 57.69 ±3.9; Delimiting 72.66 ±3.5, 55.64 ±3.9, 41.65 ±3.9; PI detector 41.49 ±3.9, 21.14 ±3.2, 7.95 ±2.1; Repeat prompt 85.53 ±2.8, 67.25 ±3.7, 27.82 ±3.5; Tool filter 73.13 ±3.5, 56.28 ±3.9, 6.84 ±2.0. Source: primary Appendix C, Table 5.
- **P2 — comparator condition.** Section 4.3 says all defenses are GPT-4o “against our strongest attack.” Tool filtering is an LLM restriction to tools required for the task **before observing untrusted data**. It fails for result-dependent planning and where user-required tools also carry out the attack, stated as 17% of cases. Source: primary §4.3, “Prompt Injection Defenses” and “Strengths and limitations of tool isolation mechanisms.”
- **P3 — do not merge experiments.** Appendix C Table 3 gives GPT-4o 47.69 ±3.90 targeted ASR, Table 4 gives Important message 57.7 ±2.0 and Max 57.55 ±2.7, and Table 5 gives no-defense 57.69 ±3.9. The source does not reconcile these. Table 4’s raw columns are attack variants and raw rows are **Targeted** and **Untargeted**. Source: primary Appendix C, Tables 3–5.
- **P4 — method and sample.** The source states 97 user tasks, 27 injection tasks, 629 within-environment security cases, deterministic utility/security functions over output and state, YAML runtime output, and 1–20 injection-task steps. Source: primary §3.1, §3.4, Table 1. Table 1’s stated total is 70 tools while §3.1 prose says 74 and its row counts sum to 74. Retaining the conflict is correct.
- **P5 — placement condition.** Appendix D says end-position injection is most effective and an attacker *may* influence position in some cases, but AgentDojo does not currently support that. It is an ablation, not the standard attack setting. Source: primary Appendix D, “Impact of injection position.”

## Pair findings

### Pair 1 — conclusive pass, with one scope correction

**Y gains.** `tool-security-1-Y/streams/s1.md` preserves the complete ten-model Table 3, Table 4’s targeted and untargeted rows, Table 5, and the Table-3/Table-4/Table-5 conflict. `RESEARCH.md` carries those gains into a clearer decision, explicit denominators, complete measured defense table with intervals, mechanism limits, and a paired local artifact that freezes agent/model/prompt/schema/state and reports paired, stratum-level outcomes. X has a sound but selective five-model baseline table and a less complete artifact. This is a decision-critical evidence, method, comparator, and actionable-local-evaluation gain.

**No material regression.** Y preserves P1’s values, P2’s before-untrusted-data and 17% conditions, P3’s non-pooling qualification, P4’s sample/method and 70/74 conflict, and P5’s placement qualification. It does not claim that 47.69% beats or is comparable to 57.69%, and does not convert historical US$35/US$4 evaluation estimates into current costs.

**Required correction (non-material, smallest change).** Remove the `AgentDojo results` live-page entry and any claims supported only by it from Y’s source appendix. The assignment limits scope to the original v3 and embedded appendix. This isolated provenance/scope breach does not affect the decision or Table 3–5 synthesis, so it is not a material regression. Keep the original-paper citations.

**Verdict:** **CONCLUSIVE PASS, conditional on the scope cleanup.**

### Pair 2 — conclusive pass

**Y gains.** `tool-security-2-Y/streams/s1.md` retains the full source chain from environment through raw result tables to failure modes and a concrete 30-workflow/90-security-case local design. Its `RESEARCH.md` makes the security-boundary conclusion more direct, adds a concise full ten-model table with intervals, keeps Table 4’s Max conflict visible, gives exact Table 5 deltas, and specifies local corpus classes, adaptive variants, persistence, paired invariants, deterministic checks, and a no-unauthorized-action deployment gate. These are coherent, actionable gains without using length as a proxy.

**No material regression.** Y keeps the P1 rows and Table-5-only comparator boundary, P2’s mechanism and 17% condition, P3’s separate-experiment warning, P4 denominators/evaluator and 70/74 conflict, P5 placement qualification, and historical-cost qualification. Its conclusion correctly treats trusted enforcement, resource/action constraints, approvals, and logging as proposed local controls rather than AgentDojo measurements.

**Legacy parity note, not a Y regression.** Both X and Y normalize primary labels in prose/tables, for example `Defense`/`Comparator` rather than raw **Defenses**, and expand labels such as `Delimiting` or `PI detector`. P1 shows the preserved raw headers and cells. Future revisions should retain raw labels beside explanatory labels, but this is shared and does not negate Y’s gain.

**Verdict:** **CONCLUSIVE PASS.**

## Overall verdict

**CONCLUSIVE PASS: Y gains without a material regression versus X in both pairs.** Pair 1 needs only the isolated non-material scope cleanup above. The source-format recovery improves coverage of exact results and qualifications, while the decision remains appropriately bounded to a synthetic GPT-4o fixed-attack defense experiment and a required local paired evaluation.
