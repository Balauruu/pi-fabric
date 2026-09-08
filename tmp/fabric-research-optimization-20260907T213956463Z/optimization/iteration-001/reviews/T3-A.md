Candidate reviewed at literal path:

`/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-001/live/T3/RESEARCH.md`

**Overall: material regression.** The candidate improves operational synthesis and adds useful primary evidence, but drops several legacy sources that materially support R1 and R2.

| Question | Classification | Comparison |
|---|---|---|
| Q1 Decision and scope | Equivalent | Both correctly reject claims of production security or autonomous authority from benchmarks alone. |
| Q2 Evaluation evidence | Material regression | Candidate retains τ-bench, ToolSandbox, AgentDojo, and ToolEmu, and adds AgentProp-Bench and CAX-Agent. But it removes ToolBench-X’s directly relevant fault/recovery diagnostic, WebArena’s controlled end-to-end and human-comparator evidence, and ToolBench’s API availability/versioning evidence. |
| Q3 Counterevidence and transfer limits | Material regression | Candidate has strong simulator, evaluator, recovery, and drift limits. It omits the legacy evaluator audit’s cross-suite 18.5% evaluator-human disagreement and 18.9-point repeated-run spread, plus InjecAgent’s independent security-suite noncomparability evidence. |
| Q4 Deployment controls | Equivalent | Candidate’s decision table is concrete and appropriately externalizes authorization, idempotency, transaction limits, and auditability. Its provenance controls are stronger than legacy. |
| Q5 Smallest resolving evaluation | Tradeoff | Candidate is better scoped to an actual disputed reversible-write permission envelope and has sound paired arms and deterministic validators. Legacy is more immediately executable through stated 30–50 workflows and eight repetitions. Candidate intentionally leaves sample counts and thresholds deployment-specific. |
| Q6 Appendix | Material regression | Candidate’s appendix is well structured and identifies methods and limitations, but it retains only nine sources versus legacy’s 13. It silently omits ToolBench-X, WebArena, ToolBench, the evaluator audit, InjecAgent, ToolSandbox implementation, and NIST AI 600-1. For a “retained-source appendix,” this is an evidence-retention failure. |

### Concrete regressions

1. **Recovery evidence lost:** ToolBench-X supplied executable, multi-hazard recovery evidence, targeted-hint gains, and repeated-failed-call rates. CAX-Agent is a useful replacement only for specialized MAPDL automation with unequal retry budgets, not general tool-agent fault handling.

2. **Evaluator-validity evidence narrowed:** AgentProp’s calibration is valuable, but it does not replace the legacy audit across multiple external benchmarks showing 92/496 evaluator-human disagreements and substantial run-to-run variation.

3. **Independent prompt-injection counterevidence lost:** AgentDojo remains, but removing InjecAgent weakens the case that ASR values and defenses do not transfer across suites.

4. **Live interactive-completion context lost:** Removing WebArena drops a controlled end-to-end benchmark and its human comparison, which helps bound claims from API-only and simulated environments.

5. **Appendix provenance degraded:** Omitted retained sources are neither listed nor dispositioned.

### Primary-source check

Named web-source inspection confirmed core candidate claims:
- [τ-bench](https://arxiv.org/html/2406.12045) supports final-state evaluation, `pass^k`, temperatures, action cap, and the cited GPT-4o reliability pattern.
- [τ³-bench repository](https://github.com/sierra-research/tau2-bench) supports the 75+ task fixes and `banking_knowledge` v1.0.1 noncomparability notice.
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) supports its voluntary governance characterization.
- Candidate’s cited AgentProp-Bench, ToolSandbox, CAX-Agent, AgentDojo, ToolEmu, and τ repositories were inspected as named primary sources.

**Disposition:** retain the candidate’s decision table, AgentProp provenance treatment, and resolving-evaluation design, but restore the omitted legacy evidence and appendix entries before passing the gate.