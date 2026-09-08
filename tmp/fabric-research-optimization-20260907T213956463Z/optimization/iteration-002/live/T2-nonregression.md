## Validation result

**Qualified nonregression.** The candidate preserves the required coverage portfolio and improves the fixed-model evaluation design. One inherited factual attribution defect remains.

| Gate | Result | Comparison |
|---|---|---|
| Q1 Primary evaluations | Equivalent | Candidate covers context, feedback, validation/repair, retries, and decomposition with source-bound conditions in [`RESEARCH.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0201-rev03-T2/RESEARCH.md). |
| Q2 Quantitative comparability | Improvement | Candidate explicitly separates equal calls from equal total effort and retains task/model/budget caveats. Original checks matched SWE-agent, Agentless, SWE-bench, conversational-repair, and Self-Repair figures. |
| Q3 Reliability and counterevidence | Tradeoff, not regression | Candidate replaces legacy RepairAgent, Reflexion, SWE-rebench, multimodal, and Pro coverage with direct repair/restart, contamination, and harness evidence. It still covers variance, selector loss, leakage, evaluator limits, and transfer qualification. |
| Q4 Production actionability | Improvement | Candidate’s paired artifact fixes model, reasoning effort, information policy, total budgets, evaluator revision, false-pass guardrails, restart control, and replication. This is stronger than legacy’s artifact. |
| Q5 Source/report integrity | **Qualified defect** | The candidate says “SWE-Bench+ classified 32.67%…” in R2.6. The cited original study assigns **32.67% of 251 passes to SWE-bench Full**, not SWE-Bench+. SWE-Bench+ is reported as having no solution-leakage issues. This wording is also present in the legacy report, so it is **not a candidate regression**, but it must be corrected for decision-grade accuracy. |
| Q6 Scope and safety | Equivalent | Candidate explicitly excludes model-change, universal-ranking, and security conclusions, as required by [`T2.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/questions/T2.md). |

## Coverage-portfolio rule

**Pass.** The candidate retains source-bound contributions for: context/representation (SWE-agent, SWE-bench), staged localization/allocation/selection (Agentless), feedback repair plus independent-restart counterevidence, evaluator validity/leakage/contamination, and official harness behavior. Missing per-arm total-cost evidence is explicitly qualified rather than treated as zero.

## Decisive original-source checks

- [SWE-agent](https://arxiv.org/html/2405.15793): all inspected ACI values match, including 18.0% for 100 lines, 14.3% for 30 lines, 12.7% whole file, and 18.0% versus 15.0% compact versus full history.
- [Agentless](https://arxiv.org/html/2407.01489v2): localization, allocation, selection, cost, no-location-clue, and 126/300-versus-96/300 claims match.
- [SWE-bench](https://arxiv.org/html/2310.06770): corpus, BM25/oracle, patch-format, and 574-task budgeted-condition claims match.
- [SWE-Bench+ paper](https://arxiv.org/html/2410.06992): supports the reported Full and Verified figures, but exposes the Full-versus-SWE-Bench+ attribution error.
- [Official SWE-bench repository](https://github.com/SWE-bench/SWE-bench): supports the `run_id` plus `instance_id` cache warning.

**Artifacts compared:** candidate [`RESEARCH.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0201-rev03-T2/RESEARCH.md), legacy [`RESEARCH.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/legacy-T2/RESEARCH.md), and candidate reporting contract [`synthesis-and-reporting.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-002/candidate/references/synthesis-and-reporting.md).