# Comparison Review B

**Verdict: Candidate is stronger overall, with two material evidence-coverage regressions.**

| Criterion | Assessment |
|---|---|
| Q1 coverage | Improved. Candidate adds direct fixed-model feedback-repair evidence and an equal-call independent-restart comparator. |
| Q2 entailment and citations | Mostly improved. Reported central contrasts match the cited primary sources. The appendix maps claims to direct URLs and methods, though row-level citations would be easier to audit. |
| Q3 values, methods, comparators, limits | Improved. Candidate consistently states task, model, comparator, outcomes, and non-equivalent budget limits. Its Agentless, SWE-agent, conversational-repair, FeedbackEval, and self-repair values are supported by the cited sources. |
| Q4 counterevidence | Mixed. Candidate improves repair-specific counterevidence and evaluator/leakage treatment, but loses direct empirical transfer and broader repeated-run evidence retained by legacy. |
| Q5 usable rules and artifacts | Improved substantially. The paired artifact fixes model, reasoning effort, environment, information policy, realized budgets, restart control, records, analysis, and adoption gates. |
| Q6 standalone structure and retained appendix | Improved. Candidate is standalone, clearly scoped, has decision and operational tables, and includes a complete appendix for sources it retains. |

## Material regressions

1. **Cross-domain transfer evidence was removed.** Legacy retained SWE-bench Multimodal evidence that a Python-oriented Agentless design transferred poorly to visual JavaScript: 4.6% resolution and 0.142 localization F1 versus SWE-agent’s 0.367. Candidate only gives general cautions about task and model conditionality. That is a material reduction in direct evidence for its “route only by demonstrated strata” rule.

2. **Broader stochasticity evidence was removed.** Legacy retained SWE-rebench’s five-run, SEM, and pass@5 protocol. Candidate retains SWE-agent’s six-run Lite variation, which is useful but narrower: one system, one model, and one benchmark. The candidate’s paired-CI rule remains sound, but the empirical basis for repeated-run policy is less broad.

3. **Tool-loop evidence breadth was reduced.** Legacy retained RepairAgent’s Defects4J evaluation, including an ablation where removing search tools reduced fixes and increased cost. Candidate’s SWE-agent evidence still supports tool-feedback and context choices, but it no longer retains direct evidence from a stateful iterative repair/search loop on a distinct Java benchmark.

## Source checks

- Candidate’s SWE-agent ACI figures are entailed: summarized search 18.0% versus iterative 12.0% and no search 15.7%, 100-line viewer 18.0% versus full-file 12.7%, and last-five observations 18.0% versus full history 15.0%.  
  Source: [SWE-agent](https://arxiv.org/html/2405.15793)

- Candidate’s Agentless allocation and validation figures are entailed, including 88/300 at $0.22, 85/300 at $0.24, and 96/300 at $0.29.  
  Source: [Agentless](https://arxiv.org/html/2407.01489v2)

- Candidate’s feedback-versus-independent comparison is entailed: hidden-test-valid outcomes are 47% versus 34% for Llama 3.1 70B and 46% versus 47% for GPT-4o-mini, with equal request count but oracle localization and a filtered 92-task panel.  
  Source: [Conversational test-suite repair](https://arxiv.org/html/2410.04485v1)

- Candidate correctly preserves distinct SWE-Bench+ quantities rather than conflating them: 12.47% reported Full resolution, 5.49% manually classified correct fixes, 3.97% after leakage/weak-test filtering, and Verified 22.4% to 10.0%.  
  Source: [SWE-Bench+](https://arxiv.org/html/2410.06992)

- Candidate’s restart control is well supported: shallow repair allocation reached 1.05× pass@20, while deeper repair allocation reached 0.97× pass@22.  
  Source: [Is Self-Repair a Silver Bullet?](https://arxiv.org/html/2306.09896)

## Decision

Use the candidate as the better decision guide, but restore the legacy’s direct **cross-domain transfer** and **multi-run stochasticity** evidence to avoid weakening Q4.