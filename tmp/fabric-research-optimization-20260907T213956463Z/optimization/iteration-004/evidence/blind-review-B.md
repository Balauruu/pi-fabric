# Blind Comparison Review B

## T1

| Criterion | X | Y | Finding |
|---|---|---|---|
| Q1 Coverage | Qualified | Pass | X adds useful ToT, retrieval, and feedback evidence but explicitly lacks CoT scale/task boundaries, ReAct-ablation evidence, and Reflexion’s negative coding ablation. Y retains all four decision-critical technique classes with direct conditions. |
| Q2 Sources | Pass | Pass | Both use primary sources and distinguish limits. Source checks confirm X’s ToT, FeedbackEval, and self-verification claims. Y’s source appendix is more traceable per claim. |
| Q3 Exactness | Pass | Pass | X gives strong numeric detail for ToT and repair. Y gives stronger controlled-condition detail for CoT, ReAct, and Reflexion. |
| Q4 Counterevidence | Pass | Pass | X covers model dependence, judge limits, and cost. Y more directly reconciles conflicting technique outcomes. |
| Q5 Operational artifact | Pass | Pass | Both provide usable paired-evaluation contracts. Y’s artifact more fully specifies protected strata, state verification, and rollback. |
| Q6 Structure and appendix | Qualified | Pass | X is coherent and has a full appendix for its retained set, but its declared omissions remove material retained evidence. Y is standalone and has a complete annotated retained-source appendix. |

**Verdict:** **Tradeoff, Y preferred.** X broadens the literature but regresses required CoT, ReAct-ablation, and verifier-conditioned-reflection coverage. This is not unavailable evidence because Y retains and cites it.

**Identity disclosure**

- X: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/live/T1/RESEARCH.md`
- Y: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0104/RESEARCH.md`

## T2

| Criterion | X | Y | Finding |
|---|---|---|---|
| Q1 Coverage | Pass | Qualified | X covers context, feedback, localization, validation, retry diversity, leakage, repeatability, multimodal transfer, and evaluator limits. Y omits RepairAgent, Reflexion, patch-versus-full-file evidence, multimodal transfer, and SWE-Bench Pro limits. |
| Q2 Sources | Pass | Pass | Both principally cite primary papers. X has a larger retained set and identifies the implementation-procedure source separately. |
| Q3 Exactness | Pass | Pass | X consistently states models, task counts, budgets, comparators, and costs. Y adds useful failed-edit and repeated-run details. |
| Q4 Counterevidence | Pass | Qualified | Y retains leakage, scaffold confounding, and richer-navigation regression, but loses several transfer and retry counterexamples. |
| Q5 Operational artifact | Pass | Pass | Both supply paired fixed-model evaluation artifacts. Y’s test-evidence fields are particularly useful. |
| Q6 Structure and appendix | Pass | Qualified | Y is concise and standalone, but its explicit gaps confirm reduced retained-source coverage. |

**Verdict:** **Regression, X preferred.** Y adds two useful evidence-quality/steering references, but does not retain several required coding-agent decision boundaries. Its steering evidence also adds an advisor model, outside the fixed-model-stack premise.

**Identity disclosure**

- X: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/legacy-T2/RESEARCH.md`
- Y: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/live/T2/RESEARCH.md`

## T3

| Criterion | X | Y | Finding |
|---|---|---|---|
| Q1 Coverage | Qualified | Pass | X retains core benchmark evidence but explicitly omits ToolBench scale/evaluator agreement, NIST guidance, AgentDojo detector results, and ToolBench-X extra-round evidence. Y includes these. |
| Q2 Sources | Pass | Pass | Source checks confirm τ-bench’s pass¹/pass⁸ boundary, AgentDojo’s 97-task/629-case design, the evaluator audit’s 92/496 disagreements, and ToolBench-X’s hazard design. |
| Q3 Exactness | Pass | Qualified | X’s ToolBench-X results are precise and match the checked table: Doubao 0.513, GPT-5.4 0.453, GPT-4o 0.359. Y’s “different streams” presentation is cautious but leaves the result unnecessarily unresolved. |
| Q4 Counterevidence | Pass | Pass | Both correctly reject production-security transfer from public benchmarks. Y additionally retains NIST’s governance boundary. |
| Q5 Operational artifact | Pass | Pass | Both provide strong release controls. X’s explicit 30–50 workflow and eight-run protocol is more immediately executable. |
| Q6 Structure and appendix | Qualified | Pass | X has a fuller source set but a bare URL list. Y’s annotated appendix is clearer, but incomplete relative to the evidence it explicitly marks absent. |

**Verdict:** **Tradeoff, Y preferred for coverage and structure.** X is operationally stronger and more decisive on ToolBench-X results. Y is preferable because the omitted evidence is relevant and available, not genuinely unavailable.

**Identity disclosure**

- X: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/live/T3/RESEARCH.md`
- Y: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/legacy-T3/RESEARCH.md`

## Source-check record

- **Confirmed:** ToT’s 74% versus 4% Game-of-24 result, FeedbackEval’s feedback-type outcomes, and self-verification degradation are entailed by their cited original papers.
- **Confirmed:** τ-bench’s approximate 61% retail and 35% airline pass¹ with retail pass⁸ below 25%, AgentDojo’s 97 tasks and 629 security cases, and the evaluator audit’s 92/496 disagreement and 57.9–76.8% repeated-run range.
- **Confirmed:** ToolBench-X directly reports 1,106 tasks, five recoverable hazard types, and the model results quoted by T3 X.
- **Caution:** Checked claims support bounded benchmark conclusions only. Neither report establishes production reliability, security, current-model transfer, or universal technique rankings.

## Overall gate verdict

**FAIL.** The candidate set improves T3’s coverage but regresses T2 materially and T1 on retained decision-critical evidence. The omissions are documented, source-available, and relevant to the required questions.