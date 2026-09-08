Literal candidate path confirmed:  
`/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-001/live/T3/RESEARCH.md`

| Question | Comparison | Classification |
|---|---|---|
| Q1: Evaluation evidence | Candidate improves repeated-run reliability, provenance/evaluator validity, and bounded recovery with AgentProp and CAX-Agent. It loses legacy’s WebArena, ToolBench-X, and ToolBench evidence, including real web-task failure and executable multi-hazard recovery evidence. | Tradeoff |
| Q2: Source-bound fidelity | Most candidate measurements match inspected primary sources: τ-bench, AgentProp, ToolSandbox, CAX-Agent, AgentDojo, benchmark-drift repos, and NIST. | Equivalent |
| Q3: Counterevidence and transfer limits | Candidate is strong on simulator, evaluator, adaptive-attack, recovery, and benchmark-drift boundaries. It omits legacy’s cross-suite evaluator audit, InjecAgent non-comparability evidence, and explicit production unknowns. | Tradeoff |
| Q4: Operational controls | Candidate’s decision table is clearer and more decision-oriented, with failure signals and external authorization boundaries. Legacy is more concrete on parameter-bound approvals, credential revocation, untrusted-data authority restrictions, and change-triggered reevaluation. | Tradeoff |
| Q5: Smallest resolving evaluation | Candidate appropriately refuses universal thresholds and specifies paired arms, deterministic validators, adaptive injection, and an expansion-blocking rule. Legacy is more immediately executable through its 30–50 task and eight-repeat defaults. | Equivalent |
| Q6: Appendix | Candidate appendix is materially better structured: every retained source has type/date, method, supported claim, and limitation. It is complete for candidate citations, but its narrower source set omits useful retained legacy evidence. | Tradeoff |

## Concrete regressions

1. **R1 — Material evidence loss:** Removing WebArena loses the strongest retained direct evidence that long-horizon web agents can perform far below humans and falsely declare feasible tasks impossible. Removing ToolBench-X loses evidence about specific post-failure retry behavior and the effect of targeted diagnostic hints.

2. **R2 — Reduced evaluator counterevidence:** Removing the evaluator-audit preprint loses the retained quantified cross-suite disagreement evidence: 92/496 evaluator-human disagreements and substantial repeated-run variation. AgentProp is valuable but does not replace cross-benchmark audit evidence.

3. **R3 — Potential numerical error:** Candidate states ToolEmu’s safety-evaluator recall was **73.1% versus mean held-out-human recall 78.8%**. The inspected ToolEmu source reports **73.1% versus 75.3% human-annotator recall**. This should be corrected or source-qualified.

4. **R4 — Control specificity loss:** Candidate’s consequential-write row requires halt and escalation, but legacy more explicitly requires server-side, exact-parameter-bound approval and tests declined, expired, and modified approvals. That is a meaningful operational detail for consequential actions.

## Primary-source inspection

Inspected named sources: [τ-bench](https://arxiv.org/html/2406.12045), [AgentProp-Bench](https://arxiv.org/html/2604.16706v2), [ToolSandbox](https://arxiv.org/html/2408.04682v1), [CAX-Agent](https://arxiv.org/html/2605.15218), [AgentDojo](https://arxiv.org/html/2406.13352), [ToolEmu](https://arxiv.org/html/2309.15817), [τ-bench repository](https://github.com/sierra-research/tau-bench), [τ³-bench repository](https://github.com/sierra-research/tau2-bench), and [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework).

The candidate correctly preserves AgentDojo’s internal 70-versus-74-tool inconsistency and does not claim benchmark evidence proves production security.

**Overall:** Tradeoff, not material regression. Candidate is more decision-grade and better appended, but should restore or explicitly replace the lost WebArena, ToolBench-X, evaluator-audit, and approval-boundary evidence, and correct the ToolEmu recall figure.