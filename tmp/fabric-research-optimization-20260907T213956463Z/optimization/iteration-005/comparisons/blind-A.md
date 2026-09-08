# Blind quality review

## Overall verdict: **Reject X as a corpus-wide improvement**

X improves over Y on **T1**, but **T2 materially regresses** in retained repair/retry evidence and experimental controls. T3 is credible and operationally strong, but does not clearly improve on Y’s broader reliability, evaluator, and attack-budget coverage. Legacy non-parity is reported separately and is not used as proof against incumbent improvement.

**Sampling caveat:** X was freshly sourced at a different time from reused Y/Z reports. Differences can reflect source availability, versions, and selection rather than authoring quality. I draw **no speed conclusion**.

## Primary-source checks

Direct retrieval confirmed the decisive reported passages:

- **T1:** CoT Table 2 reports PaLM-540B GSM8K **17.9% → 56.9%** with eight exemplars; the same source says easy SingleOp gains are minimal. [Wei et al.](https://arxiv.org/html/2201.11903)
- **T1:** ToT reports Game of 24 CoT **4%**, breadth-5 ToT **74%**, and **5.5k** completion tokens versus **6.7k** for 100 CoT trials. [Yao et al.](https://arxiv.org/html/2305.10601)
- **T2:** SWE-agent Table 3 reports the exact 18.0/12.0/15.7 search, 18.0/14.3/12.7 viewer, 18.0/15.0 history, and 18.0/15.0/10.3 lint/editor contrasts. [SWE-agent](https://arxiv.org/html/2405.15793v3)
- **T2:** Agentless Table 3 reports **88/300, $0.22** versus **96/300, $0.29** allocation; Table 4 reports **77/300, $0.00**, **81/300, $0.01**, and **96/300, $0.25** selection. [Agentless](https://arxiv.org/html/2407.01489)
- **T3:** τ-bench supports roughly 61% retail pass¹, 35.2% airline pass¹, retail pass⁸ below 25%, and the nonexistent-ID-call contrast. [τ-bench](https://arxiv.org/html/2406.12045)
- **T3:** AgentDojo’s defense table supports no-defense ASR **57.69%**, detector **7.95%**, filter **6.84%**, their utility trade-offs, and the 17% tool-filter limitation. [AgentDojo](https://arxiv.org/html/2406.13352v3)
- **T3:** OSWorld supports 12.24% best-model versus 72.36% human success and reports mouse-click inaccuracies in over 75% of its sampled failed examples. [OSWorld](https://arxiv.org/html/2404.07972)

## T1 — Prompt-technique selection

| Criterion | X versus Y | X versus Z |
|---|---|---|
| Q1 coverage | **Gain.** X adds bounded measurements for least-to-most, retrieval-plus-feedback, process supervision, Toolformer, CoVe, Reflexion, and context placement. It preserves task/model/comparator boundaries rather than treating them as a leaderboard. | **Near parity / gain in breadth.** Z’s compact contradiction ledger is clearer, but X covers more relevant intervention types. |
| Q2 entailment | **Gain.** X’s self-correction, rationale-faithfulness, sampling, injection, jailbreak, and judge sections distinguish feasibility, curated attacks, and transfer limits. | **Partial parity.** Z’s ReAct-ablation and verifier-conditioned-reflection counterevidence remain more directly tied to deployment technique choice. |
| Q3 methods/results/conditions | **Gain.** X retains concrete conditions such as 40 sampled paths, ToT token/cost framing, best-of-six qualification, and training-versus-prompting distinctions. | **Partial parity.** Z better foregrounds prompt-renderer and retrieval hashes in its artifact. |
| Q4 counterevidence | **Gain over Y.** X’s “sampling is not monotonic,” untrusted retrieval, and alignment-not-authorization distinctions are decision-relevant additions. | **Not full parity.** It omits Z’s direct ReAct prompt-brittleness/token-accounting evidence. |
| Q5 actionability/artifacts | **Gain.** X’s decision table and YAML gate cover direct prompts, long context, tools, validators, mutation approval, judge controls, budgets, promotion, and rollback. | **Near parity.** Z’s experiment is slightly more concrete about clean-state/environment snapshots. |
| Q6 structure/appendix | **Slight gain.** X has a usable source appendix with retained claim and limitation for each source. The R1/R2/R3 organization is clear despite no literal Q labels. | **Near parity.** Z’s evidence ledger/reconciled-contradictions presentation is more compact. |

**T1 finding:** **Accept as an improvement over Y.** X materially improves decision coverage and preserves sufficient original conditions. The remaining Z gaps are specific, not evidence against the Y comparison.

## T2 — Fixed-model coding-agent run design

| Criterion | X versus Y | X versus Z |
|---|---|---|
| Q1 coverage | **Mixed.** X strongly retains SWE-agent and Agentless controlled contrasts and adds evaluator protocol, leakage path, task-distribution, and trajectory-length evidence. But it drops Y’s deployable-versus-gold context/patch-representation evidence and model-specific feedback-repair evidence. | **Below parity.** Z retains RepairAgent’s stateful search/repair ablation and Reflexion’s negative feedback-free condition, both absent from X. |
| Q2 entailment | **Gain in evaluator integrity.** X carefully limits all-tests reruns, contamination diagnostics, repository future-state leakage, and observational trajectory evidence. | **Partial parity.** Z’s explicit benchmark leakage and fresh-task contrasts remain more concrete for deployment transfer. |
| Q3 methods/results/conditions | **Material regression.** Y requires a token/tool-time/wall-time/dollar-matched independent-restart control for repair experiments. X’s artifact has no restart-control arm, despite its own statement that retry policy cannot be inferred from benchmark success. | **Below parity.** Z explicitly gates retries on a new localization, hypothesis, or diagnostic signal and records compacted context, tool traces, and failure transitions. |
| Q4 counterevidence | **Gain.** X’s warning that within-task analysis reverses the pooled trajectory-length association is a useful anti-heuristic. | **Mixed.** It loses direct repair/reflection counterevidence. |
| Q5 actionability/artifacts | **Regression.** X provides a solid hidden-acceptance-test artifact but weakens the most important repair causal control. “Paired seeds” do not replace matched independent restarts. | **Below parity.** Z provides clearer per-lever retry and validation rollback conditions. |
| Q6 structure/appendix | **Comparable.** X’s appendix is precise and limitations are well stated. This does not offset the missing method control. | **Partial parity.** Z’s appendix is less granular, but its retained sources better support omitted run-design mechanisms. |

**T2 finding:** **Reject as an improvement over Y.** The loss of feedback-repair/restart evidence and the restart-control omission are material because retry/repair is central to the topic. This is also **unmet legacy parity**, especially for RepairAgent and Reflexion evidence.

## T3 — Tool-using-agent evaluation, reliability, and security

| Criterion | X versus Y | X versus Z |
|---|---|---|
| Q1 coverage | **Mixed.** X adds OSWorld and InjecAgent with strong method/denominator qualifications. It omits Y’s ToolEval/ToolBench, AgentBench, AgentHarm, and AgentProp-Bench evidence. | **Gain.** X’s WebArena, OSWorld, GAIA, and InjecAgent presentation is more method-specific than Z’s condensed ledger. |
| Q2 entailment | **Mixed.** X accurately separates AgentDojo paper-table and base-agent values, explains metric denominators, and limits emulation. But it loses Y’s empirical grader-disagreement, fabricated-tool-result, and attack-budget evidence. | **Near parity.** Z’s evaluator-audit and version-drift warnings are more explicit. |
| Q3 methods/results/conditions | **Gain.** X’s authorization-bound controls are concrete: parameter-bound approval, typed validation, idempotency discipline, deterministic state/policy assertions, and a blocking hostile-content condition. | **Near parity.** Z’s eight-trial requirement and approval-state matrix are more exact for unattended-write testing. |
| Q4 counterevidence | **Partial regression.** X retains strong repeatability, transfer, adaptive-attack, and emulation limits, but misses Y’s direct evidence that evaluation changes conclusions and that low tool use can conceal fabrication. | **Partial parity.** Z’s simulator error and τ-bench version caveat remain absent. |
| Q5 actionability/artifacts | **Gain.** The per-write-class scenario schema is immediately implementable and correctly treats five trials as screening rather than proof. | **Near parity.** Z better specifies a broader 30–50 workflow sample and pass⁸ reporting. |
| Q6 structure/appendix | **Comparable.** X’s decision table, operational rules, resolving evaluation, and source appendix are clear. | **Gain.** X’s appendix preserves more method and limitation detail. |

**T3 finding:** **No clear improvement over Y.** X is high quality and operationally useful, but its reduced evaluator and attack-budget coverage prevents a net improvement finding. This is not a rejection for citation volume. It is a loss of specific evidence needed to assess score validity and adversarial reliability.

## Final decision

- **T1:** improve over incumbent Y.
- **T2:** reject due to material regression over incumbent Y.
- **T3:** no demonstrated net improvement over incumbent Y.
- **Overall:** reject X as a replacement set. T2 alone blocks promotion. T3 should retain Y’s missing evaluator and attack-budget evidence before reconsideration.

## Literal mapping

- **Candidate X**
  - T1: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-005/live/T1/RESEARCH.md`
  - T2: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-005/live/T2/RESEARCH.md`
  - T3: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-005/live/T3/RESEARCH.md`
- **Incumbent Y**
  - T1: `quality-gate/20260908T/candidate-T1/RESEARCH.md`
  - T2: `experiments/run-0201-rev03-T2/RESEARCH.md`
  - T3: `experiments/run-0202-rev04-T3/RESEARCH.md`
- **Legacy Z**
  - T1: `experiments/run-0104/RESEARCH.md`
  - T2: `quality-gate/20260908T/legacy-T2/RESEARCH.md`
  - T3: `quality-gate/20260908T/legacy-T3/RESEARCH.md`