# Blind quality review

**Verdict: accept X over Y for T1, T2, and T3.** Each has a material improvement in decision-grade qualification or operationalization, and no material regression that reverses that conclusion. All three still miss some legacy-specific evidence and should not be described as legacy-complete.

Fresh X sampling and retrieval time differ from the reused Y/Z outputs. This review makes **no speed, freshness, or throughput conclusion** from that difference.

## Primary-source checks

- **T1:** Wei et al. Table 2 directly supports the retained PaLM-540B GSM8K comparison: standard prompting **17.9%**, CoT **56.9%**, calculator **58.6%**. The source also says the effect is scale-dependent. X preserves the method boundary rather than generalizing it.
- **T2:** Agentless Table 4 directly reports majority vote **77 (25.67%), $0.00**, regression testing **81 (27.00%), $0.01**, and reproduction testing **96 (32.00%), $0.25**. X correctly frames this as pipeline-specific patch selection, not a universal repair-loop effect.
- **T3:** AgentDojo directly distinguishes the GPT-4o base-agent row (**69.00% benign utility, 50.08% utility under attack, 47.69% targeted ASR**) from the defense table, where tool filtering is **73.13% / 56.28% / 6.84%** and the detector is **41.49% / 21.14% / 7.95%**. X explicitly prevents the cross-table conflation.

## T1 — Prompt-technique selection

| Criterion | Finding |
|---|---|
| Q1 Coverage | **X gain over Y.** X expands from a small technique set to conditional evidence for least-to-most, retrieval-feedback, process supervision, Toolformer, CoVe, Reflexion, and context placement. It preserves comparability warnings rather than ranking heterogeneous results. |
| Q2 Source entailment | **X gain.** Methods, comparator, result, budget, and transfer boundary are placed together in R1. The CoT claim passes the primary-source check. |
| Q3 Methods/results/conditions | **X gain.** The selection table ties each arm to an equal-budget comparator, stop signal, and intended condition. The evaluation artifact freezes retrieval, tool schema, budgets, safety controls, and holdout strata. |
| Q4 Counterevidence | **X gain with a retained loss.** X adds intrinsic self-correction failure, unfaithful rationales, non-monotonic sampling, indirect injection, jailbreak limits, and judge bias. **Legacy parity unmet:** Z’s concrete ReAct prompt-brittleness/token-accounting and API-Bank stage-error evidence are not retained. Y’s specific few-shot permutation result is also absent as source-backed counterevidence, although X lists example-order sensitivity as a stop signal. |
| Q5 Actionability/artifacts | **X gain.** The ten-situation decision table and YAML gate are directly runnable as an evaluation specification, with promotion and rollback criteria. |
| Q6 Structure/appendix | **X gain.** R1/R2/R3 separation, explicit unknowns, and a source appendix make claims traceable. |

**T1 judgment:** improvement over Y. It remains below Z’s specificity for tool-call-stage diagnosis and ReAct prompt-cost sensitivity.

## T2 — Fixed-model coding-agent run design

| Criterion | Finding |
|---|---|
| Q1 Coverage | **X mixed gain.** It covers the core decisions: interface/feedback, context, linting, selection, decomposition, retries, and evaluator meaning. It deliberately avoids treating staged Agentless design as a causal decomposition result. **Legacy parity unmet:** Z retains broader evidence on retrieval/context policy, multi-location allocation, and repair-loop behavior. |
| Q2 Source entailment | **X gain.** It distinguishes bundled SWE-agent ACI effects from isolated levers, successful-run cost from all-run cost, and test-harness “resolved” from semantic correctness. The Agentless numeric claim passes the primary-source check. |
| Q3 Methods/results/conditions | **X gain.** The experimental artifact fixes model, reasoning effort, prompt hash, permissions, base commit, hidden acceptance evaluator, paired seeds, and future-state-access stopping conditions. |
| Q4 Counterevidence | **X gain.** It adds all-developer-test reductions, answer-bearing issue descriptions, repository future-commit leakage, task-distribution shift, and the within-task trajectory-length reversal. This is stronger deployment-relevance discipline than Y. |
| Q5 Actionability/artifacts | **X gain.** The five change-specific rules identify telemetry, adoption conditions, and rejection conditions. The holdout/evaluation YAML is materially more auditable than a generic benchmark recommendation. |
| Q6 Structure/appendix | **X gain.** It clearly separates measured effects, comparability, counterevidence, adoption rules, unknowns, and source limitations. |

**T2 judgment:** improvement over Y. It does not achieve legacy parity for breadth of repair/restart and retrieval-policy evidence, but the omitted material is not needed to sustain the narrower fixed-model decision guide.

## T3 — Tool-using-agent evaluation, reliability, and security

| Criterion | Finding |
|---|---|
| Q1 Coverage | **X mixed gain.** X adds GUI-grounding evidence, tool-selection oracle dependence, and injection-denominator sensitivity. It retains stateful completion, repeatability, final-state evaluation, injection, and emulation limits. **Legacy parity unmet:** Z’s ToolSandbox insufficient-information/recovery evidence and ToolBench judge-calibration evidence are not retained. |
| Q2 Source entailment | **X gain.** The explicit AgentDojo configuration crosswalk is a substantive correction. It prevents combining the 47.69% base-agent ASR with the 57.69% defense-table no-defense ASR. |
| Q3 Methods/results/conditions | **X gain.** τ-bench retains action cap, temperatures, repeated trials, `pass^k`, final-state criteria, and cost. The deployment evaluation fixes state, attacker payload, tool contract, forbidden predicates, and baseline/candidate comparison. |
| Q4 Counterevidence | **X gain with a gap.** X keeps simulated-environment, grader, retry, and attack-set boundaries, plus an explicit unknowns section. **Legacy parity unmet:** it no longer retains Z’s evaluator-audit disagreement rates or ToolSandbox simulator-error figure. |
| Q5 Actionability/artifacts | **X gain.** The scope-specific table, parameter-bound approval rule, retry restrictions, and exact write-scenario artifact provide clear release-blocking conditions. “Zero forbidden predicates” is appropriately bounded to the tested suite, not claimed as security proof. |
| Q6 Structure/appendix | **X gain.** The report is more concise without collapsing distinct metrics. Its appendix identifies empirical versus contextual sources and names limitations. |

**T3 judgment:** improvement over Y. The dropped evaluator-audit and ToolSandbox detail prevents legacy parity, but X’s configuration hygiene and deployment test design are more decision-useful.

## Overall

X should replace Y for all three topics. The principal quality gains are:

1. **Entailment discipline:** X more consistently binds numerical claims to the original model, task, comparator, budget, and transfer limit.
2. **Decision artifacts:** X supplies bounded, falsifiable evaluation and rollback contracts rather than only recommendations.
3. **Metric hygiene:** X avoids cross-study rankings and, notably in T3, separates incompatible AgentDojo configurations.

Remaining parity work is targeted, not a rejection basis: restore T1’s ReAct/API-stage specifics, T2’s broader repair/restart evidence, and T3’s ToolSandbox plus evaluator-audit evidence.

## Literal mapping

- **X:** Candidate — T1 `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-005/live/T1/RESEARCH.md`; T2 `.../live/T2/RESEARCH.md`; T3 `.../live/T3/RESEARCH.md`.
- **Y:** Incumbent — T1 `.../quality-gate/20260908T/candidate-T1/RESEARCH.md`; T2 `.../experiments/run-0201-rev03-T2/RESEARCH.md`; T3 `.../experiments/run-0202-rev04-T3/RESEARCH.md`.
- **Z:** Legacy — T1 `.../experiments/run-0104/RESEARCH.md`; T2 `.../quality-gate/20260908T/legacy-T2/RESEARCH.md`; T3 `.../quality-gate/20260908T/legacy-T3/RESEARCH.md`.