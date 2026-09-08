# Research contract

- Central decision: choose production prompt techniques for text, reasoning, and tool-using LLMs as of 2026-09-07 without a universal ranking.
- Use: implementation and local-evaluation choices. Error consequence: adopting an effect that does not transfer can waste cost/latency or lower reliability.
- Scope: technical prompting and scaffold/context boundaries. Excludes aesthetic image/video prompting and current-social research.
- Evidence standard: original inspected sources; quantitative claims retain exact task, model, comparator, result, method, and measured compute/cost where reported.
- Comparability: do not rank or normalize across differing task, model snapshot, harness, tool/context/action/retry budget, metric/grader, or token/cost accounting.
- Planned independent streams (4): S1 controlled prompt-technique evidence for text/reasoning; S2 reasoning-time techniques and compute tradeoffs; S3 tool-use/scaffold/context interventions; S4 adversarial counterevidence, regressions, and transfer limits.
- Output slots: R1 measured effects; R2 counterevidence; R3 operational decision table, failure signals, paired local evaluation artifact; original-source appendix and requirement dispositions.
- Stopping: source/coverage saturation, then only bounded repair that could change a decision.
