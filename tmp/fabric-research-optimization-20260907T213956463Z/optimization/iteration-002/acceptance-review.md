# Acceptance review — iteration 002

## Decision

**Reject.**

| Field | Decision |
|---|---|
| evidenceAdequate | **true** |
| meaningfulImprovement | **false** |
| materialRegression | **true** |
| matchedParity | **false** |

## Evidence adequacy

This is a genuine, adequately evidenced non-improvement. The literal mapping was checked: T1 maps the fresh candidate report to `live/T1/RESEARCH.md` against `experiments/run-0104/RESEARCH.md`; T3 maps `live/T3/RESEARCH.md` against `quality-gate/20260908T/legacy-T3/RESEARCH.md`. Both reports, their questions, verification/validation notes, and both blind same-topic reviews per topic exist and were inspected. `execution.json` records the requested `openai-codex/gpt-5.6-terra`, `medium`, extensions enabled, nonrecursive operation, completed research/verification/synthesis/validation leaves, and phase clocks. The changed portfolio instructions occur in the four changed production files and are visibly exercised in the T1/T3 coverage-portfolio verification records. Direct checks also cover report boundaries, one-report ownership, unchanged persistence/no-write/partial/continuation contracts, and changed-file scope.

This is quality-stage evidence only. There is no matched legacy end-to-end timing or speed claim, so no speed gain is accepted or inferred.

## Quality findings

- **T1:** The candidate adds useful self-consistency and Self-Refine evidence, but both comparisons find material losses relative to legacy: long-context intervention conditions, stage-wise tool-call validity, ReAct result/comparator detail, and the stronger release-evaluation artifact. Its own final validation is `Not accepted`: the Reflexion contrast omits GPT-3, the reset-without-reflection comparator, and the `>30 actions` trigger. Direct source inspection confirms the Reflexion paper specifies GPT-3, 130/134 tasks, the `>3` repeated action/response trigger, and `>30` actions. This is an R1 measurement-unit loss, not cosmetic compression.
- **T3:** The candidate’s concise ToolMaze recovery coverage is useful, but both comparisons identify loss of legacy evaluator-validity evidence, broader empirical counterevidence, and concrete release-evaluation specificity. That prevents at-least-legacy coverage. Direct source checks corroborate that the legacy ToolSandbox label is defective (42.0 is insufficient information and 75.1 is zero distraction tools) and that AgentDojo distinguishes 57.69% no-defense and 6.84% tool-filter values from the 57.55% Max-attack result. Those legacy defects do not rescue the candidate, because its material coverage losses remain.
- **T2:** The changed-contract review finds useful nonregression and an inherited SWE-Bench+ attribution defect, but it is not a fresh candidate workflow replay. The literal mapping labels `live/T2-nonregression.md` as the new candidate report, while that document actually evaluates `experiments/run-0201-rev03-T2/RESEARCH.md`. It cannot establish T2 whole-workflow parity for this iteration.

The candidate therefore has supported gains in selected evidence facets but material coverage and source-bound operating-detail losses. It is neither a meaningful improvement nor parity with legacy. The best revision remains unchanged.

## Remaining check

- Fresh, same-question T2 end-to-end candidate workflow replay using the iteration-002 package, compared with its mapped legacy report under the recorded Terra-medium conditions. This is needed only to establish three-topic parity, not to change this rejection.
