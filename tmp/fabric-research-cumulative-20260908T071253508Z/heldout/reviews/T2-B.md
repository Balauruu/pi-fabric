# T2 independent complete-workflow verdict

## Artifact mapping

- **X, incumbent00:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T2-X/RESEARCH.md`
- **Y, candidateH2c:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T2-Y/RESEARCH.md`
- **Historical target:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/legacy-T2/RESEARCH.md`
- **Question:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/T2.md`

## Verdict

**Conclusive.**

1. **Incumbent-relative judgment: NO.** Y does **not** improve X without material regression.
2. **Legacy-quality judgment: NO, pending the corrections and recheck below.** Y is more disciplined than parts of the legacy report, but it does not reach the relevant exact-topic target because it loses material direct evidence and contains a material cost-unit error.

## Decisive evidence

### Y gains

Y is clearer and more operational than X on evaluator validity and repeatability. Its R2 passage, “**Single-run pass@1 ranged 2.2–6.0 pp**,” is accurately supported by the primary *On Randomness in Agentic Evals* abstract/method passage: “single-run pass@1 estimates vary by **2.2 to 6.0 percentage points**,” across 60,000 trajectories. Its paired artifact correctly keeps model, reasoning effort, evaluator, tools, task commit, seed schedule, and resource envelope visible. Its PatchDiff qualification is also materially better than a generic false-pass claim: Y correctly says “**260/877 (29.6%)** were behaviorally divergent” is not an incorrect-patch rate, while the primary reports the 11.0% incorrectness estimate as an extrapolation from 22 incorrect cases among 77 manually assessed suspicious patches.

### Material regression

Y omits the closest retained direct counterevidence for the requested **context-selection** decision. X reports Khatri’s controlled two-agent, 17-task, 288-evaluated-run gold-test ablation: “**no statistically significant overall difference**,” Claude gaps at most 2.3 pp, Codex maximum 5.9 pp, and the dynamic-range subset “**58% versus 42%**” for no-context versus both context conditions. This is not merely another source: it directly tests the intervention class under repeated, hidden-test conditions and limits the practical meaning of Y’s SWE-agent-only positive ablations.

The primary original confirms the exact limitation: it has 288 evaluated cells, no detectable strategy effect (Claude p=1.00, Codex p=0.66), and on four Codex-borderline tasks, **none 58% versus always-on 42% and selective 42%**. It also documents the selective-corpus confound and low task count. The right conclusion is bounded, not that context is universally harmful.

This loss originates in Y’s source-note selection, not merely its final prose. `T2-Y/streams/s1.md` retains SWE-agent, Agentless, AutoCodeRover, and RepairAgent but not Khatri. `T2-Y/streams/s2.md` retains evaluator/variance/live-benchmark material but not that direct context ablation. Consequently Y’s synthesis says “the evidence supports evaluating bounded context ... first” without the strongest retained direct correctness null. X retains it in both synthesis and its cited R2/R3 record.

Y also narrows the newer direct evidence X supplies for validation/restarts/decomposition to older package studies. That is a secondary depth loss. The context-null omission alone is material because R1 expressly asks for context-selection evaluations and R2 asks for counterevidence.

### Material numerical distortion

Y states: “**Its reported dollar figure is API inference cost averaged over successfully resolved instances**,” and the appendix repeats “**successful-instance cost metric**.” Both are incorrect. The SWE-agent primary Table 2 reports SWE-agent GPT-4 Turbo on Lite as **18.00%** and **$1.67 Avg. Cost** alongside shell-only **11.00%** and **$1.46**. Primary source context describes this as average cost **per task/instance**, not cost per resolved instance. The candidate’s denominator error falsely makes the $1.67 figure incomparable with the per-task costs it places beside Agentless and AutoCodeRover, weakening a central R1 cost comparison.

This is a synthesis/source-interpretation defect. The candidate’s `streams/s1.md` repeats the same false “per resolved instance” wording, so the final report inherited rather than repaired it.

## Legacy comparison

The historical report is exact-topic comparable, not a prompt-mismatched proxy. It covers the required levers with an operational table and concrete paired artifact. Its evidence breadth includes Agentless selection costs, SWE-agent context/tool ablations, SWE-bench context/output evidence, RepairAgent, and a retry counterexample. Y improves the legacy report’s caution around evaluator validity, variance, and its non-universal adoption framing. Do not preserve legacy assertions merely because they are historical, including its stronger “Adopt, behind paired evaluation” language.

But the relevant standard is decision-grade coverage, not stylistic restraint alone. Until Y restores the direct bounded context null and fixes the cost denominator, it lacks material counterevidence required for a context-design decision and makes a distorted cost comparison. It therefore does not meet the legacy-quality target.

## Required repair and smallest recheck

1. **R1 — Correct the SWE-agent cost unit.** In Y R1 replace “averaged over successfully resolved instances” with “average API inference cost per Lite task/instance under the reported cap.” Replace the appendix’s “successful-instance cost metric” likewise. Recheck against SWE-agent Table 2 and its cost-method/source context.
2. **R2 — Restore the direct context counterevidence.** Add a bounded Khatri subsection or counterevidence row with: 17 tasks from three Python repositories, Claude Code Sonnet 4.6 and Codex CLI GPT-5.5, three strategies, three repeats, 288 valid evaluations, hidden PR gold tests, no overall significant correctness effect, maximum gaps 2.3 pp/5.9 pp, dynamic-range 58% none vs 42% always/selective, and the selective-corpus and low-power limitations. State that its ≤10/≤15 pp figures are descriptive bounds, not powered equivalence claims.
3. **R3 — Align the decision table.** Change the context row so bounded context is a locally testable hypothesis with both SWE-agent’s configuration-specific positive ablations and Khatri’s repeated correctness null. Retain the narrow possible efficiency effect only as exploratory and repository-specific.

**Smallest recheck:** inspect the repaired two cost passages against SWE-agent Table 2, inspect every restored Khatri metric against the primary abstract/method/results, then verify that the executive decision, R1 context subsection, R2 counterevidence, R3 table, and retained appendix all carry the same bounded conclusion. No broader retrieval is needed.
