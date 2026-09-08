# VALIDATION

**ACCEPTED: yes**

## Q1 — R1 evidence
Pass. All retained run-design dimensions have source-bound task, model, comparator, method, outcome, and applicable efficiency conditions.

## Q2 — Quantitative fidelity
Pass. Checked original sources support the reported SWE-agent, Agentless, Validation Evidence, LivePlan, SWE-bench, SWE-Bench+, SWE-rebench, AutoCodeRover, and OpenHands values. No material numeric, unit, model, comparator, or method mismatch found.

## Q3 — Causal boundaries
Pass. The report correctly limits same-scaffold ablations to their source harnesses and excludes AutoCodeRover, OpenHands critic scaling, and advisor-based steering from fixed-model causal recommendations.

## Q4 — Reliability and counterevidence
Pass. Harness scope, leakage and weak-test findings, stochasticity, scaffold confounding, and search regression are accurately qualified.

## Q5 — Production experiment
Pass. The paired artifact freezes model, reasoning effort, infrastructure, decoding, tools, and budgets; it separates harness resolution from independent acceptance and records required cost and validation-evidence fields.

## Q6 — Appendix and source traceability
Pass. The appendix covers all accepted retained origins: SWE-agent, Agentless, Validation Evidence, LivePlan, SWE-bench, SWE-Bench+, and SWE-rebench. AutoCodeRover and OpenHands are explicitly discussed as excluded causal references, not retained support.

## Source-unit coverage

| Units | Status |
|---|---|
| U1–U3: SWE-agent context, failed edits, repeated runs | Covered |
| U4–U5: Agentless branching and validation selection | Covered |
| U6–U7: validation evidence and bug-contrast feedback | Covered |
| U8: LivePlan steering | Covered and correctly excluded from fixed-model-stack evidence |
| U9–U11: evaluator meaning, leakage, stochasticity | Covered |
| U12–U13: AutoCodeRover and OpenHands | Covered as excluded counterexamples, not causal support |

## Errors and bounded corrections

No material numeric, unit, model, comparator, method, or caveat errors found.

Optional traceability improvement: add relative links to `streams/1.md` and `streams/2.md` from the relevant report sections for fuller local evidence context.