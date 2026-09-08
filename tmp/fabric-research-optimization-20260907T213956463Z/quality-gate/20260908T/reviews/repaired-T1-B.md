# Comparison review B

**Verdict: candidate regresses materially from legacy. Do not replace legacy unchanged.**

| Criterion | Assessment |
|---|---|
| Q1 coverage | **Regression.** Candidate adds zero-shot CoT, self-consistency, and ToT, but drops three production-relevant measured areas: verifier-conditioned repair, API retrieval/call validity, and positive long-context scaffolds such as quote extraction/contextual examples. It therefore has no measured positive text/long-context technique despite claiming text scope. |
| Q2 source entailment and citation completeness | **Candidate stronger overall.** Its direct URLs, conditions, comparators, values, and limitations are generally complete and source-entailing. Direct inspection confirms, for example, zero-shot-CoT’s 17.7→78.7 and 10.4→40.7 results, Lost-in-the-Middle’s 56.1 closed-book boundary, AgentDojo’s 78.22/51.19/33.86 figures, and the Suggested Answer 59.6→23.3 result. |
| Q3 values, methods, comparators, limits | **Mixed, with a material regression.** Candidate gives strong quantitative reasoning and security comparisons. But it says ReAct token cost is unreported and leaves ReAct operating cost unknown, while legacy retains the directly supported brittle-ReAct measurement of approximately **14M input and 150K output tokens for 134 instances**. It also loses the legacy’s measured feedback-dependent repair result, **60%→68% pass@1** with feedback-free repair at **52%**, and API-Bank’s **60.24%** tool-call correctness. |
| Q4 counterevidence | **Candidate stronger but incomplete.** Its evidence on exemplar-order instability, unfaithful rationales, self-consistency cost, context position, and prompt injection is substantially better. However, omission of the ReAct causal ablation and feedback-free reflection regression removes counterevidence directly tied to two techniques that legacy covered. |
| Q5 rules and evaluation artifact | **Regression.** Candidate’s artifact is usable for direct/CoT/self-consistency/ReAct fixtures, but omits a repair treatment, retrieval configuration, retrieval/citation measures, tool-schema-retrieval measures, transcript pointers, explicit spend cap, estimated total cost, and rollback criteria for declared SLO breaches. Legacy’s contract more completely evaluates the retained production techniques. |
| Q6 standalone structure and appendix | **Mostly pass.** Candidate is clear, standalone in its main body, and its appendix covers every cited source. However, its “repaired streams” and “available repaired evidence” stop-reason wording is opaque historical provenance rather than standalone evidence framing. |

## Concrete material regressions

1. **R1 coverage loss:** Legacy provides directly measured guidance for verifier-backed repair, API/tool-call correctness, and long-context quote extraction. Candidate removes all three rather than retaining them with their conditions and limits.

2. **Measured compute loss:** Legacy’s ReAct brittleness source directly reports approximately **14M input tokens and 150K output tokens** for 134 instances. Candidate substitutes “not reported” for ReAct cost, which is materially less decision-grade.

3. **Evaluation-contract loss:** Candidate cannot adequately evaluate the dropped techniques or fully price a scaffold change because it lacks retrieval/citation metrics, repair variants, estimated total cost, spend budget, and explicit SLO rollback.

4. **Counterevidence loss:** Candidate omits the legacy’s causal warning that weak or irrelevant ReAct guidance can still perform similarly, and its feedback-free reflection regression. AgentDojo is valuable safety evidence, but it does not replace those technique-specific ablations.