# Bounded corrections required

**Status:** partial. I independently inspected all nine retained original sources.

- **Q1 Coverage:** Pass, qualified. R1–R3 are substantively answered. The report correctly bounds NIST AI RMF as governance guidance, not a tool-agent reliability/security measurement.
- **Q2 Entailment and citations:** Pass. Material claims have direct original-source links, and the appendix maps each retained source.
- **Q3 Values, methods, comparators, limits:** Correction required. At `RESEARCH.md:29`, qualify `13.9` turns and `3.80` calls as averages from **GPT-4o-agent trajectories** in ToolSandbox, not intrinsic averages of all cases. The other checked numerical claims match their sources, including AgentProp’s conditional `≈0.62`, CAX-Agent’s unequal budgets, and AgentDojo’s tool-count contradiction.
- **Q4 Counterevidence:** Pass. Simulation, evaluator error, retry-budget confounding, adaptive-attack limits, security-utility trade-offs, and benchmark drift are retained.
- **Q5 Rules and resolving evaluation:** Pass, qualified. Controls are explicitly inference-based and the evaluation uses final-state, authorization, provenance, recovery, and attack measures without claiming security proof.
- **Q6 Standalone structure and appendix:** Correction required. Add a concise `## Coverage and stop reason` section after the resolving evaluation. State R1 qualified, R2 supported, R3 qualified, the target-system evidence gap, and that work stopped at the bounded inspected-source set. The report currently has no explicit coverage/stop-reason section.

## Retention-set coverage

Pass, subject to the ToolSandbox qualification above. All required decision dimensions and source-unique contributions are present: repeated reliability, evaluator validity/provenance, stateful final-state evaluation, bounded recovery, prompt injection and utility, emulated-risk limits, standards boundary, simulation and transfer limits, drift, operational controls, and version pinning.

## Appendix, ownership, and structure

- **Appendix:** Pass. `## Source appendix` includes every retained source with direct URL, type/date, method/evidence form, supported claim, and limitation.
- **One-report ownership:** Pass. `live/T3/RESEARCH.md` is the sole authoritative report. `verification.md`, `T3-evidence.md`, and `T3-counter.md` function as support notes.
- **Standalone:** Fails only for the missing explicit coverage/stop-reason section above.

Revalidate after only these two edits.