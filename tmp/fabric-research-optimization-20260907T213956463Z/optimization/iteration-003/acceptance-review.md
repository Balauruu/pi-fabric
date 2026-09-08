# Iteration 003 acceptance review

## Decision

Reject the candidate. `evidenceAdequate: true`; `meaningfulImprovement: false`; `materialRegression: true`; `matchedParity: false`.

## Evidence reviewed

- The candidate differs from best `rev-04` only in `SKILL.md` and `references/synthesis-and-reporting.md`. The T1/T3 role receipts in `execution.json` and `execution-recovery.json` explicitly supplied those candidate paths and recorded native `openai-codex/gpt-5.6-terra` at `medium` with extensions enabled and nonrecursive execution.
- T1 and T3 are real changed-path live workflows with researcher, verification, synthesis, validation, correction, and two independent literal-mapped reviews. T2 is a source-checked nonregression review, not a fresh iteration-003 workflow replay.
- The recovered blind maps identify candidate X as `live/T1/RESEARCH.md` and `live/T3/RESEARCH.md`, and legacy Y as `experiments/run-0104/RESEARCH.md` and the mapped legacy T3 report. Both reviewers independently find T1 materially worse. They also find T3 retains some checked strengths but loses legacy evaluator-audit, version-drift, standards, and operational material.

## Decisive findings

T1 final validation is not accepted: it retains a material Reflexion comparator/baseline discrepancy and obsolete blanket rejection of all anchors. Its validator accepts several bounded source claims but requires reconciliation before retaining the `91.0%` versus `80.1%` Reflexion comparison. The direct original-source check was unable to resolve that comparison, so it cannot cure the report defect.

T3 final validation accepts its corrected report, but this does not remove the material same-topic coverage losses found by both independent comparisons. Direct inspection confirms the candidate's `9.2%` wording was imprecise: the original v2 passage reports `9.25% ± 0.25` after removing forced attacker-tool inclusion. The corrected final validation records this, but it does not restore the lost legacy evidence.

There is no measured speed claim, matched clock comparison, repetition/order analysis, or quality-preserving end-to-end speed evidence. Speed therefore cannot establish improvement.

## Result rationale

The live Terra-medium tests, source checks, literal mappings, and independent comparisons are enough to make a concrete rejection rather than call the result inconclusive. The source-anchor revision has no supported quality gain over best and introduces material T1 factual/validation failure plus T1/T3 useful coverage loss against legacy. It does not meet the required T1/T2/T3 parity gate.

## Remaining check

- Fresh literal-mapped, same-question T2 end-to-end replay of the iteration-003 candidate against its mapped legacy report under recorded Terra-medium conditions. This is required to close a future parity claim, but would not overturn the present T1/T3 rejection.
