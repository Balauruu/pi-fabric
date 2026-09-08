# T3 Blind Comparison Review A

## Verdict

**Candidate decisively improves on legacy.** No candidate-vs-legacy material regression found. The candidate supplies source-bound evaluation evidence, limits, deployment decisions, a resolving evaluation, and a retained-source appendix. The legacy explicitly has no inspected primary sources or retained evidence.

## Q1. Question-level coverage — **Candidate superior**

- **Candidate inspected:** “Direct source-bound evidence from τ-bench, WebArena, ToolBench/ToolEval, AgentBench, AgentDojo, AgentHarm, ToolEmu, and AgentProp-Bench.”
- **Legacy inspected:** “No primary evaluation or standard was inspected.”
- The candidate directly covers reliability, task success, failure handling, security-relevant behavior, methods, models, comparators, and outcomes. Legacy cannot satisfy R1 by its own evidence-status declaration.

## Q2. Source entailment and citation completeness — **Candidate superior, with bounded verification**

- **Candidate inspected:** “These are harness-specific trade-offs, not a security proof. [S5]”
- **Candidate appendix inspected:** S1–S12 each give direct URL, type/date, inspected method, supported claim, and limitation.
- **Legacy inspected:** “These URLs were identified in the legacy stream but were not inspected” and “**None.** No external primary source was inspected.”
- The candidate’s citations are complete at the report level and bind numeric claims to IDs. Direct external retrieval was unavailable in this review environment, so this review does not independently re-verify the underlying paper text. That limitation does not create a candidate regression relative to legacy.

## Q3. Retained values, methods, comparators, and limits — **Candidate superior**

- **Candidate inspected:** “14.41% end-to-end task success for the best GPT-4 agent versus 78.24% for humans.”
- **Candidate inspected:** “GPT-4o function-calling achieved about **61% pass¹** in retail and **35.2% pass¹** in airline.”
- **Candidate inspected:** “no defense had targeted ASR **57.69% ±3.9** … Tool filtering had **6.84% ±2.0** ASR.”
- The candidate retains environments, configurations, comparators, outcome values, and explicit transfer limits. Legacy retains no source-bound values or methods.

## Q4. Counterevidence — **Candidate superior**

- **Candidate inspected:** “Single-run success hides tail risk.”
- **Candidate inspected:** “A lower attack rate can buy less useful work.”
- **Candidate inspected:** “Automated evaluation can alter the conclusion.”
- **Legacy inspected:** “Methodological limits only, not source-verified.”
- Candidate gives concrete counterevidence on repeatability, utility-security trade-offs, evaluator disagreement, fabricated results, and attack-budget sensitivity. Legacy lists plausible limits but labels them non-source-verified.

## Q5. Actionable rules and usable evaluation artifacts — **Candidate superior**

- **Candidate inspected:** decision table with required evidence, enforced boundary, and “Concrete block, rollback, or incident signal.”
- **Candidate inspected:** “Before granting a consequential action class, run **50 newly authored private, target-workflow scenarios**.”
- **Candidate inspected:** “any unauthorized consequential action … blocks that action class.”
- Both reports provide useful controls, but only the candidate connects them to measured failure modes, explicit instrumentation, paired clean/attacked utility measurement, and a concrete release evaluation.

## Q6. Standalone structure and retained-source appendix — **Candidate superior**

- Candidate is standalone: decision, R1–R3 evidence, inference constraints, decision table, failure signals, resolving evaluation, coverage limits, and S1–S12 appendix.
- **Candidate appendix inspected:** “Direct URL | Type and date | Inspected method | Supported claim | Limitation.”
- **Legacy inspected:** “Retained-source appendix: **None.**”
- Candidate fulfills the retained-source-appendix requirement. Legacy explicitly does not.

## Material gaps

1. **Legacy gap:** no inspected primary sources, values, comparators, or evidence appendix.
2. **Legacy gap:** counterevidence is not source-verified.
3. **Review limitation:** direct source retrieval was unavailable here, so the candidate’s original-paper passages were assessed through its citation structure and declared inspected sections, not independently reproduced.

## Candidate-vs-legacy conclusion

**Select the candidate.** It addresses all requested dimensions without treating benchmark results as a security proof.