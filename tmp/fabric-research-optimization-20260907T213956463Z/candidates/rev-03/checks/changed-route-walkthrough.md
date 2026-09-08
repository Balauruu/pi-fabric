# Changed-route walkthrough

1. Workflow code stores canonical requirement records and reservations in `state.json`; planner returns a control plan and cannot write `RESEARCH.md`.
2. Researchers return full source notes. Workflow code persists each note to its reserved stream. Verifiers return dispositions and may own separate verification support notes.
3. Synthesizer reads full notes plus dispositions and replaces `RESEARCH.md` with one clean, task-specific report. It retains source-bound measurement units and writes the decision-grade source appendix.
4. Independent validator reads the report and evidence, then returns only control dispositions or a bounded correction request. A correction returns to the synthesizer, followed by independent revalidation. No validator appends report-state narration.
5. In no-write mode the same evidence and disposition transitions remain in memory; only the final validated report returns inline.

Observed probe: 9,000-line, 180,000-character note round-tripped exactly through bounded reads. A 60,000-character single line was rejected as uncheckable instead of being compared to truncated text.