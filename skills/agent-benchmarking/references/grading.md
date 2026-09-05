# Grading

Grade actual task outcomes, not model claims about success. Prefer the least subjective valid evidence: exact text/JSON, strict schema plus semantic predicates, command/test evidence, or final task state.

## Objective grading

The frozen deterministic rule defines expected evidence by task, case sensitivity, malformed handling, and timeout handling. Validate the rule against reusable known-good, known-bad, isolated-defect, boundary, and malformed fixtures. A rule that always passes or always fails is invalid. Objective-only runs are a normal zero-judge path.

Deterministic grading produces one immutable grade record per attempt and criterion. Agent-supplied booleans or prose never substitute for runner-observed command/final-state evidence.

## Model judgment

Freeze a nonempty calibration input set, rubric, complete label set and score mapping, grader IDs/repetitions, runner/model, uncertainty retention, and any adjudication rule. Calibration is a design input, not a post-result approval ceremony.

Judge jobs expose a deterministic blind ID and criterion-relevant output/evidence. They omit condition, model, provider, price, timing, schedule position, prior scores, and sibling labels. Pairwise items randomize presentation and keep the reverse map private. If output content itself reveals a condition, record residual unblinding rather than silently discarding the item.

Require strict JSON. Every expected criterion appears exactly once with an allowed label, optional bounded uncertainty, and rationale. Preserve each individual label. Missing, malformed, abstained, and failed returns are explicit non-valid states and cannot count as agreement or successful evaluator completion.

## Adjudication

Plan adjudication only for disagreements selected by the frozen trigger. Save the finite job plan before assignment, enforce the declared maximum call count, and apply only the declared resolver/majority/retain-disagreement precedence. Adjudicator jobs use the same fixed Fabric worker and direct-call budget as measured and judge calls. Missing normal judges cannot be replaced by adjudication.

Finalization requires exact frozen judge/adjudicator job IDs with assignment, complete native result, and individual grade projection. A grade assignment without a native result is ambiguous and is never automatically replayed.

## Human grading

Human grading is a valid declared method only when an actual label input channel and calibrated labels are supplied. The current runner has no such channel and returns `unsupported` before scored dispatch. That truthful refusal is not evidence that human grading is delivered.
