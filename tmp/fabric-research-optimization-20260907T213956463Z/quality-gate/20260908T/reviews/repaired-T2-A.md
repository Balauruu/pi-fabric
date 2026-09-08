# Comparison Review: T2 Fixed-Model Run Design

**Verdict: Candidate is materially stronger overall and meets the question better.** It adds a concrete paired artifact, equal-effort restart control, information-policy audit, and clearer benchmark-leakage boundaries. It has three material regressions.

## Q1. Coverage

**Candidate wins.** It covers every requested lever with primary evaluations: context, tool feedback, validation/repair, retries, and decomposition. Its direct conversational-repair and Self-Repair controls are more decision-relevant than the legacy Reflexion evidence.

**Regression R1:** It drops the only retained direct evidence for an interactive, stateful tool/search controller outside SWE-bench: RepairAgent’s Defects4J ablation found 21/100 fixes for the full configuration and roughly half that without search tools, while its realistic-localization condition fell to 16 fixes at $29. This is useful cross-benchmark evidence for search and feedback policy, even though it is not a clean isolated-lever experiment.

## Q2. Source entailment and citation completeness

**Candidate is substantially better.** Its source-bound table names the evaluated system, model, task count, comparator, outcome, and limitations. Checked values are entailed by the cited primary sources, including SWE-agent’s 18.0/12.7/14.3 context ablation, Agentless’s 88/85/96 repair-allocation results, and RepairAgent’s reported limits.

**Finding:** Citations are appendix-linked rather than inline-linked. This remains usable because rows identify the source by name, but precise claim-to-passage mapping would be stronger with source keys in the R1 and R2 tables.

## Q3. Values, methods, comparators, and limits

**Candidate wins.** It consistently separates equal calls, samples, dollars, and realized effort, and it correctly disclaims non-deployable oracle context. The paired artifact appropriately requires matched token, tool-time, wall-time, and dollar ceilings.

**Regression R2:** The SWE-agent row omits available operational cost evidence retained by legacy: the $4/instance cap and the reported successful versus unsuccessful trajectory costs and steps. Saying there is no *per-arm* cost distribution is correct, but dropping the cap and aggregate cost data weakens production budgeting guidance.

## Q4. Counterevidence

**Candidate wins overall.** It adds stronger counterevidence: independent restarts can outperform deep repair, feedback benefit is model-dependent, selection can bottleneck candidate generation, and public benchmark success may contain solution-bearing input or weak-test passes.

**Regression R3:** It removes two distinct external-validity limits:
- SWE-bench Multimodal’s visual JavaScript evidence, which directly shows that Python repository-repair results do not transfer automatically to visual/UI work.
- SWE-Bench Pro’s evidence that valid implementations can fail narrow interface-dependent tests and that language coverage is uneven.

The candidate’s requirement for private or temporal holdouts is sound, but it does not replace these concrete transfer and evaluator-false-negative examples.

## Q5. Usable rules and evaluation artifacts

**Candidate clearly wins.** Its operational table is actionable and its YAML artifact is complete: immutable environment and evaluator identities, matched arms, restart control, hidden behavioral outcome, false-pass sampling, transcript audit, paired confidence interval, guardrails, and replication gate. It avoids unsupported security claims.

## Q6. Standalone structure and retained appendix

**Candidate wins.** It is standalone, scoped, decision-oriented, and includes a complete retained-source appendix with direct URLs and limitations. The appendix is more complete and better structured than legacy’s list.

## Decision

Use the **candidate**. Before final release, restore:  
1. SWE-agent’s $4 cap and aggregate trajectory cost/step context.  
2. A concise cross-domain transfer warning grounded in SWE-bench Multimodal.  
3. A concise evaluator-false-negative and language-coverage warning grounded in SWE-Bench Pro.