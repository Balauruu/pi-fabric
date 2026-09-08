# Independent Comparison Review B

**Verdict:** Candidate is stronger overall, but does **not** fully clear the gate without corrections. It adds decision-grade controls and broader primary evidence, while dropping several uniquely material legacy sources and misstating one audited evaluator value.

## Q1. Coverage

**Improved:** Candidate covers state-based task success, repeated-run reliability, long-horizon web work, evaluator validity, prompt injection, harmful tool behavior, and standards. Its decision table directly answers the deployment question.

**Material regressions:**
- It drops **ToolSandbox**, the legacy’s direct stateful, milestone/minefield evaluation of clarification, ordering, insufficient information, and forbidden events.
- It drops **ToolBench-X**, the legacy’s only direct fault-and-recovery evaluation with injected tool-environment hazards, hint versus extra-round comparators, and same-tool retry rates.
- It drops **InjecAgent**, reducing independent indirect-injection evidence and attack-construction diversity.
- It omits the τ-bench repository warning that its retail and airline tasks are outdated and directs users to τ³-bench. This materially matters because candidate relies on original τ-bench results.

## Q2. Entailment and citation completeness

**Mostly improved:** Candidate generally binds values to named sources, configurations, methods, and limits. Its AgentDojo paper claims are entailed. The original paper reports GPT-4o no-defense utility-under-attack **50.01%** and targeted ASR **57.69%**, detector **21.14% / 7.95%**, and tool filter **56.28% / 6.84%**. It also states the tool filter fails where required tools enable the attack in **17%** of cases.  
Source: <https://arxiv.org/html/2406.13352v3>

**Factual error:** Candidate S9 reports substring-grader κ = **0.036**. The cited source reports **κ = 0.049**. This must be corrected.  
Source: <https://arxiv.org/html/2604.16706>

**Citation-completeness regression:** The candidate replaces the legacy’s cross-benchmark evaluator audit with a narrower 100-label audit. The removed audit directly reports **92/496 (18.5%)** official-label disagreements and LiveMCPBench variation of **57.9–76.8%** across 23 runs. Those are retained, decision-relevant counterevidence and should remain in the appendix and body.  
Source: <https://arxiv.org/html/2607.02577>

## Q3. Values, methods, comparators, and limits

**Improved:** Candidate usually supplies exact values and methodology, especially for τ-bench, WebArena, ToolBench, AgentBench, AgentDojo, AgentHarm, ToolEmu, and its evaluator audit. It correctly keeps paper and dashboard AgentDojo results separate.

**Regression:** Removing ToolBench-X loses direct evidence that, under injected recoverable hazards, hints improved accuracy **25.5–35.5 points** while ten additional interaction rounds improved only **3.5–11.5 points**, with same-tool retries after a first error at **44–76%**. That evidence directly supports the requested failure-handling and recovery conclusions.  
Source: <https://arxiv.org/html/2606.25819v1>

## Q4. Counterevidence

**Improved overall:** Candidate explicitly limits simulator transfer, judge validity, adaptive attacks, outcome-only scoring, configuration drift, and cross-source aggregation. It correctly rejects security-proof claims.

**Regression:** It omits the strongest retained quantitative evidence of benchmark-version staleness and evaluator instability:
- τ-bench’s own repository labels the cited airline and retail tasks “not updated.”
- The removed evaluator audit quantifies human-label disagreement and repeat-run spread.

## Q5. Usable rules and evaluation artifacts

**Improved:** Candidate’s decision table, block and rollback signals, instrumentation list, authority-boundary framing, and change-control rule are more operational than legacy.

**Material regression:** Its smallest resolving evaluation requires only **three** runs per stochastic configuration and reports pass¹/pass³. Legacy required **eight** independent perturbation runs plus mean, spread, false-pass, false-fail, recovery, latency, and cost reporting. Three runs are too weak to substantiate a repeated-run reliability decision, particularly after candidate emphasizes τ-bench’s pass⁸ collapse. Restore at least the legacy repeat-run requirement or justify a consequence-specific alternative.

## Q6. Standalone structure and retained appendix

**Improved:** Candidate is standalone, navigable, and its appendix is materially better structured than legacy’s URL-only list.

**Not complete as a retained appendix:** It removes legacy sources that carry unique evidence:
1. ToolSandbox and its implementation.
2. ToolBench-X and its implementation/results.
3. The evaluator-validity audit.
4. InjecAgent.
5. τ-bench’s version-warning repository.

## Required corrections

1. Correct S9 substring κ from **0.036** to **0.049**.
2. Restore the τ-bench outdated-task warning and require version-specific reruns.
3. Restore ToolBench-X’s recovery evidence and the cross-benchmark evaluator audit.
4. Restore ToolSandbox or equivalent direct evidence for stateful clarification, ordering, and forbidden-event handling.
5. Strengthen the resolving evaluation from three repeats to a reliability-relevant repeated-run design, including spread and false-pass/false-fail reporting.