## T1 verdict: **Y preferred, with X’s broader counterevidence retained as a supplement**

| Criterion | X | Y | Comparison |
|---|---|---|---|
| Q1 coverage | Broad: ToT, context placement, repair, ReAct, equal-budget sampling. Omits measured CoT. | Covers CoT, ReAct, repair, tool-call validity, and long context. | **Tradeoff.** Y better matches production selection basics. X adds valuable search and equal-budget evidence. |
| Q2 source entailment/citations | Detailed primary links and conditions, but explicitly marks every anchor unverified and blocked. | Six retained primary sources, direct-inspection record, and checked claims generally entail cited results. | **Y materially stronger.** Source-check confirmed S1, S5, and most S6 claims. S4 confirms 60% baseline and 52% feedback-free result, but the inspected rendering did not expose the claimed 68%. |
| Q3 conditions/results/methods | Strong quantitative detail, especially ToT costs and placement conditions. | Good condition/comparator detail and clearer comparability boundary. | **Near-equivalent.** X is richer for ToT and equal-budget reflection. |
| Q4 counterevidence | Stronger: MBPP regression, equal-budget sampling losses, self-bias, exemplar sensitivity, tool failure taxonomy. | Strong, but narrower. | **X stronger.** |
| Q5 operational usefulness/artifact | Good selection rules and paired experiment. | Better concrete artifact: frozen hashes, budgets, strata, graders, rollback conditions, and reporting fields. | **Y stronger.** |
| Q6 standalone/appendix | Standalone, nine-source appendix. | Standalone, six-source appendix and explicit inspection record. | **Y stronger.** |

**T1 source-check notes:** Y’s CoT and API-Bank figures are supported under their stated legacy conditions. Its Anthropic source supports quote extraction and the 0.939→0.961 result, but mixes approximate 75K/90K descriptive context with later 70K/95K evaluation lengths. X’s ToT PDF was unavailable to the source-check renderer, and its 2026 equal-budget source-check was unavailable due to service overload. Those are unavailable evidence, not contradictions.

**T1 decision:** Use **Y as the decision-grade base**. Add X’s source-verified-or-reproduced ToT, placement, and equal-budget counterevidence before treating those additions as accepted evidence.

## T3 verdict: **X preferred for evidence discipline, Y preferred for deployment artifact detail**

| Criterion | X | Y | Comparison |
|---|---|---|---|
| Q1 coverage | Focused coverage of recovery, repeated reliability, injection utility tradeoffs, evaluator calibration, provenance, and emulation. | Broader: adds ToolSandbox, WebArena, ToolBench, and standards guidance. | **Y broader, X more coherent.** |
| Q2 source entailment/citations | Six direct primary-source links with source-bound claims. Reviewer source-check confirmed ToolBench-X and AgentProp central values. | Thirteen retained sources, but explicitly adapts legacy evidence without a new inspection process. | **X stronger.** Y’s provenance is weaker despite breadth. |
| Q3 conditions/results/methods | Exact methods are usually present and compact. | More detailed τ-bench methods, failure classes, and benchmark conditions. | **Y stronger.** |
| Q4 counterevidence | Good simulator, evaluator, provenance, and benchmark-design limits. | Stronger and wider: evaluator-human audit, cross-suite ASR non-comparability, version drift, NIST boundary, explicit unmeasured risks. | **Y stronger.** |
| Q5 operational usefulness/artifact | Strong controls and a credible smallest resolving evaluation. | More operationally actionable: permission-bound controls, approval tests, injected faults, untrusted-channel coverage, and an eight-run repeated-workflow protocol. | **Y stronger.** |
| Q6 standalone/appendix | Standalone six-source appendix, all cited. | Standalone 13-item retained-source appendix, including implementations and NIST. | **Y stronger in completeness.** Neither report provides T1Y-level explicit source-inspection evidence. |

**T3 source-check notes:**  
- X’s ToolBench-X recovery figures and 97/100 scorer agreement are entailed. AgentProp’s κ and fabricated-provenance figures are entailed.  
- Y’s ToolSandbox counts and scores are entailed. Its evaluator-audit figures are entailed.  
- The apparent AgentDojo conflict is a **condition mismatch**, not a contradiction: 47.69% ASR and 50.08% utility-under-attack come from the baseline-agent comparison, while 57.69% ASR, 50.01% utility-under-attack, and tool-filter 6.84% ASR/56.28% utility-under-attack come from the strongest-attack defense comparison. Y reports 73.13% benign utility for the filter but omits its 56.28% utility-under-attack result.  
- Y’s “about 25% pass⁸” should be tightened to **“under 25%”**. X is exact.

**T3 decision:** Use **X for the core evidence ledger and numerical claims**. Merge Y’s deployment controls and resolving evaluation only after adding explicit source-inspection provenance and correcting the τ-bench wording.