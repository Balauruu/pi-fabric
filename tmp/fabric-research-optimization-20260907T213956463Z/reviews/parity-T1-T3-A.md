# Independent review

## T1 — Prompting and scaffold guide

| Dimension | Assessment |
|---|---|
| Coverage | Strong across prompting, reasoning, context, schemas, retrieval, tool loops, and injection. |
| Concrete methods | Strong A0–A4 paired design, frozen controls, strata, telemetry, and adoption gates. |
| Source support | Strong. Checked CoT values against the original Table 2: PaLM-540B 17.9→56.9 and PaLM-8B 4.9→4.1. Quantities remain source-bound. |
| Counterevidence | Strong. It retains small-model CoT regression, reflection regressions, weak retrieval, template non-transfer, schema exceptions, and security-utility trade-offs. |
| Actionability | Strong, with appropriately conditional adoption rules. |
| Structure | Clear decision-first organization, comparability guardrails, and a usable protocol. |

No material quantitative cross-study mixing found. Its main limit is appropriate: no target-workload acceptance, cost, latency, safety, or retry telemetry.

## T2 — Fixed-model coding-agent design

| Dimension | Assessment |
|---|---|
| Coverage | Strong for context, editing feedback, repair, candidate allocation, evaluator limits, leakage, and contamination. |
| Concrete methods | Strong experiment artifact, including hidden behavioral resolution, restart control, information-policy audit, and second-holdout replication. |
| Source support | Strong for decisive claims checked here. SWE-agent’s 18.0/14.3/12.7 viewer result and related history/search/editor values match the original. Agentless’s 88/$0.22, 85/$0.24, 96/$0.29 and selection figures also match. |
| Counterevidence | Strong. It distinguishes call-count, sample-count, and total-effort comparisons; preserves GPT-4o-mini’s null repair result; rejects harness pass as production correctness. |
| Actionability | Strong, but “equal total budget” should mean measured realized effort or an explicit allocation policy, not merely equal ceilings. |
| Structure | Material defect. The stop reason says that “three supplied evidence streams” and a “supplied disposition” were inspected. This is administrative/process prose and makes the report appear dependent on external review artifacts. |

**Material regression:** T2 retained a defect that its own validation record explicitly required removing. Replace that stop reason with the substantive evidentiary boundary only. This is not a source-integrity failure, but it blocks clean standalone installation.

## T3 rev04 — Tool-agent evaluation, reliability, and security

| Dimension | Assessment |
|---|---|
| Coverage | Strong for state-based evaluation, repeated-run reliability, evaluator calibration, security utility/ASR trade-offs, controls, and release gates. |
| Concrete methods | Strong. The 50-scenario resolving evaluation is operationally specific and correctly separates benchmark evidence from authorization enforcement. |
| Source support | Strong. Checked original sources confirm τ-bench’s approximate GPT-4o retail pass¹ of 61%, airline 35.2%, and retail pass⁸ below 25%; AgentDojo Table 5 supports the stated no-defense, tool-filter, and detector figures; AgentProp-Bench supports the reported evaluator-calibration values. |
| Counterevidence | Strong. It preserves simulator limits, attack-budget dependence, judge error, low-tool-use fabrication, public-task contamination risk, and the paper/dashboard AgentDojo separation. |
| Actionability | Strong and appropriately risk-owner bounded. Controls are presented as safeguards, not benchmark-proven security. |
| Structure | Strong standalone report. No material administrative prose or cross-study aggregation found. |

One precision note: AgentDojo’s narrative text says 7.5% for tool filtering while Table 5 reports 6.84%. T3 correctly uses the table value but should retain the table locator when this number is reused.

## Material regressions

- **R1:** T2’s administrative stop reason is a standalone-ownership regression and contradicts its final-validation correction request.
- **R2:** T2’s “equal total budget” framing is stronger than its ceiling-based artifact guarantees. Record and analyze realized tokens, tool time, wall time, and cost, or define a fixed allocation mechanism.
- **R3:** No comparable material regression found in T1 or T3. Both preserve source conditions and unknowns rather than converting benchmark effects into production claims.

## rev04 versus legacy quality

**Yes, T3 rev04 is at least legacy quality for its own tool-agent reliability/security scope.** It meets the legacy bar for source-conditioned quantitative claims, counterevidence, explicit unknowns, operational rules, and a reusable local evaluation. It exceeds legacy on evaluator-validity and security-boundary treatment.

Limit: this is not a claim that T3 supersedes legacy’s prompt-technique evidence. They cover different decision domains and should remain separate modules.

## Install recommendation

**Do not install the full T1/T2/T3 set unchanged.** Install **T1 and T3 rev04** if modular installation is supported. Hold **T2** until its administrative stop reason is replaced and its total-effort comparison language is tightened.