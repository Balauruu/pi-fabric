# Iteration 005 acceptance review

## Decision

**Reject.** This was a real, adequately evidenced quality test, but it does not meet the no-material-regression condition for replacing the incumbent. This decision does not count or alter any stop streak and makes no speed claim.

## Acceptance fields

| Field | Result | Basis |
|---|---|---|
| `evidenceAdequate` | `true` | The saved changed-path mechanical checks are all true in `evidence/mechanical-checks.json`; compact native receipts record completed Terra-medium, named-grant, nonrecursive research/composition/validation/recheck workflows for T1–T3 in `evidence/native-receipts.json`; and final rechecks plus primary passages establish a concrete negative verdict. |
| `meaningfulImprovement` | `false` | T1 is accepted and improved, but useful gains do not satisfy the definition when material losses remain in T2 and T3. |
| `materialRegression` | `true` | T2 loses incumbent repair/retry causal coverage and its resolving evaluation lacks the incumbent's independent-restart control. T3 retains material source-bound quantitative/context defects. |
| `matchedParity` | `false` | The three same-topic legacy comparisons are not all at the legacy standard. This is reported separately from incumbent improvement. |

## Observations and adjudication

### T1

The final independent recheck accepted T1: complete R1–R3 coverage, the operational table and paired evaluation artifact, and all 18 source-unique retained sources (`live/T1/support/final-validation-recheck.md`). Both comparisons find an incumbent improvement. The legacy T1 still contains specific ReAct prompt-brittleness/token-accounting and API-Bank stage-error detail absent from the candidate (`experiments/run-0104/RESEARCH.md`, “Evidence ledger and comparability boundary”, entries S3 and S5). That is a legacy-parity gap, not evidence against the T1-over-incumbent gain.

### T2

T2 is otherwise decision-grade and covers the requested measurement, counterevidence, operating rules, and resolving evaluation: `live/T2/RESEARCH.md` §§R1–R3 binds fixed-model source results, carries evaluator/leakage limits, and supplies a frozen paired, independently accepted, hidden-test evaluation with retry curves, all-run cost/latency, paired seeds, and audit labels. Thus the two omitted-stream dispositions in `live/T2/support/final-validation-recheck.md` are not treated as an irrelevant checkbox or as a source-count proxy.

Reviewer A's substantive point nevertheless resolves against replacement. The candidate's retry rule and YAML record retry buckets and paired seeds but contain no equal-budget independent-restart arm for a repair-policy comparison (`live/T2/RESEARCH.md` §R3, “Retries” and `evaluation_id: fixed-model-run-design-v1`). The incumbent explicitly retains feedback-versus-independent-sample evidence and states the independent-restart requirement (`experiments/run-0201-rev03-T2/RESEARCH.md` §R1, “Feedback-driven repair” and “Repairs versus independent restarts”; source: [Self-Repair](https://arxiv.org/html/2306.09896), matched-sample repair comparison). Because validation/repair and retries are explicit T2 scope, losing that causal control is a material actionability/coverage regression, not merely lost breadth. The candidate's stronger evaluator-integrity material, including all-developer-test and trajectory confounding limits (`live/T2/RESEARCH.md` §R2), is a real gain but does not remove that loss.

Same-topic legacy T2 additionally retains RepairAgent and Reflexion/repair evidence not retained by the candidate (`quality-gate/20260908T/legacy-T2/RESEARCH.md` §R1 and retained-source appendix entries 5–6). This confirms T2 legacy non-parity but is not the reason for the incumbent-regression finding.

### T3

The recheck correctly rejects T3 for source/context defects (`live/T3/support/final-validation-recheck.md`). Primary passages resolve rather than merely vote on the reviewer disagreement:

- The candidate's AgentDojo report row is corrected and source-bound: its 69.0/50.01/57.69 no-defense, 73.13/56.28/6.84 tool-filter, and 41.49/21.14/7.95 detector values match [AgentDojo Appendix C, Table 5](https://arxiv.org/html/2406.13352v3), while the separate 47.69 base-agent value is explicitly separated in `live/T3/RESEARCH.md` §R1. The residual operations-stream aggregation is defective, but the authoritative report no longer makes that table-mixing error.
- The candidate states fine-tuned GPT-4 base/enhanced `ASR-valid` as 3.8%/7.1% (`live/T3/RESEARCH.md` §R1, “InjecAgent”). [InjecAgent Table 3](https://arxiv.org/html/2403.02691v2) identifies its `ASR-valid` columns by setting and reports the fine-tuned-GPT-4 table values, while 3.8% is associated with the fine-tuned-GPT-3.5 row/other column context. The candidate therefore fails to retain the metric/model/setting context accurately, as the final recheck records.
- The candidate contrasts WebArena's 14.41% agent result with 78.24% human performance as if both describe the 812-task evaluation (`live/T3/RESEARCH.md` §R1, “WebArena”). The original [WebArena “Human Performance” passage](https://arxiv.org/html/2307.13854) says the human result came from five computer-science graduate students performing one task from each of 170 templates, whereas the benchmark contains 812 instantiated tasks. This is an important comparator-context omission.

Those T3 defects concern core R1 reliability/security evidence, not an administrative formality. They are material factual/context regressions under the acceptance rule even though T3 also gains a useful configuration-hygiene correction, an explicit write-scenario evaluation, and several source-bound controls. The incumbent also retains broader evaluator/attack-budget evidence (`experiments/run-0202-rev04-T3/RESEARCH.md` §§R1–R2), but the verified candidate factual/context defects independently block acceptance.

The same-topic legacy T3 has ToolSandbox recovery/insufficient-information evidence and evaluator-audit disagreement detail that the candidate does not retain (`quality-gate/20260908T/legacy-T3/RESEARCH.md` §§Q1–Q2). This is legacy non-parity, separately from the incumbent regression decision.

## Comparison disposition

`comparisons/blind-A.md` and `comparisons/blind-B.md` agree on T1 improvement, T2/T3 legacy gaps, and no speed conclusion. Their disagreement is resolved by the artifacts and primary passages above: A is correct that T2's missing restart control is material to the requested repair/retry decision, while B is correct that the T2 report has real evaluator-integrity and operational gains. On T3, the primary source checks confirm the final validator's remaining InjecAgent and WebArena defects; AgentDojo's final-report correction is retained and is not counted as a defect. Therefore gains exist, but no replacement-set improvement without material loss is demonstrated.

## Unresolved adjudication blockers

None. The outcome does not depend on the incomplete T2 source dispositions, on legacy parity alone, on reviewer vote, or on an unmeasured speed claim.
