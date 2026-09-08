# Incumbent-relative adjudication — iteration 002

## Verdict

**Reject relative to rev04.** `incumbentRelativeRejectionVerified: true`. The live candidate has a useful new recovery-evidence gain, but it loses incumbent material required for the T3 decision guide. This is a same-topic comparison to the specified rev04 reports, not a legacy-parity finding and not a new failure event.

## Evidence inspected

- Iteration acceptance review: `acceptance-review.md`.
- Candidate live reports and validation records: `live/T1/RESEARCH.md`, `live/T1/validation.md`, `live/T3/RESEARCH.md`, and `live/T3/validation.md`.
- Exact questions: `quality-gate/20260908T/questions/T1.md`, `T2.md`, and `T3.md`.
- Same-topic incumbent reports: `quality-gate/20260908T/candidate-T1/RESEARCH.md`, `experiments/run-0201-rev03-T2/RESEARCH.md`, and `experiments/run-0202-rev04-T3/RESEARCH.md`.
- Tested T1/T3 reviews and verification records were inspected as supporting evidence only. T2 is unchanged-content reuse and no fresh T2 replay is needed to decide the concrete T3 regression.

## Decisive comparison

### Useful candidate gain

The candidate T3 adds ToolMaze’s fault taxonomy and recovery measurements: explicit versus implicit and transient versus permanent perturbations, conditional PRR, recovery-call excess, and a bounded recovery procedure. That is useful operating detail not present in the incumbent’s selected evidence. Direct inspection of the primary ToolMaze paper confirms its four perturbation modes. The candidate also carries that distinction into explicit wrong-but-well-formed-result, no-path, retry, and safe-abort checks.

### Material incumbent loss

The rev04 incumbent retains an independent evaluator-validity evidence unit, AgentProp-Bench, in its R1 table and R2 counterevidence: deterministic simulators, 2,000 tasks, 14,750 traces, a 100-trace two-annotator comparison, judge-versus-human agreement values, and the consequence that a release gate must be calibrated against representative human labels. It converts that evidence into a concrete release-evaluation requirement: blind review of prohibited effects and a stratified evaluator-disagreement sample.

The candidate T3 retains no independent evaluator-validity study, no quantitative judge/human calibration evidence, and no corresponding human-review or disagreement-sampling step in its resolving evaluation. Its general statements that final state should be checked and that ToolMaze lacks repetitions/confidence intervals do not replace the lost question of whether the evaluator itself is valid. This is a material R2 counterevidence and R3 artifact loss because an uncalibrated evaluator can turn an apparently passing final-state/recovery/security result into a false release decision.

The original AgentProp-Bench passage directly supports the distinctive evidence category: it describes a released benchmark with 2,000 tasks, 14,750 traces, and 100 human labels from two annotators, and reports judge-human reliability findings. The original ToolMaze passage confirms the candidate’s recovery addition but does not supply evaluator calibration. These are complementary, not interchangeable, evidence units.

### T1 check and non-bases

The candidate T1’s Reflexion row omits the exact `>30 actions` trigger, model, and comparator details. The primary Reflexion paper states the trigger as more than three repeated action/response cycles **or** more than 30 actions. This is a candidate source-bound defect, but it is **not** used as the incumbent-relative loss: the specified rev04 T1 incumbent does not contain a Reflexion row. Conversely, the candidate adds useful Self-Refine and self-consistency material. The T1 defect therefore neither establishes nor defeats this rejection.

The incumbent’s AgentDojo condition-label defect and any defects shared with the candidate are not counted as comparative regressions. No word or source count was used.

## Decision

The candidate plausibly improves recovery coverage, but it does not do so without material regression: it drops incumbent-specific empirical evaluator-validity counterevidence and the associated calibrated human-review artifact. That concrete same-topic T3 loss is sufficient to reject relative to rev04. The evidence is adequate because the saved live T3 validation/review evidence and direct original-primary inspections establish both the gained recovery facet and the lost evaluator-validity facet. No research, report, candidate, installed, or best artifact was changed.
