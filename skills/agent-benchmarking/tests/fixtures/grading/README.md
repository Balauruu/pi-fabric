# WP3 grading fixtures

These fixtures exercise the shared `grade(request)` contract without dispatching a model.

- `deterministic-criteria.json` covers reusable known-good, known-bad, isolated-defect, boundary, and malformed actual outcomes. `validate_criterion_fixtures` requires both a passing and failing valid case, so constant always-pass and always-fail evaluators are rejected.
- `advanced-6-96-18.json` contains six measured outputs, sixteen judge identities, one disputed outcome criterion, three resolvers, and an 18-call adjudication maximum. Pure planning produces 96 no-tools judge jobs and exactly 18 eligible adjudication jobs. Tests inject fake native returns; live calls remain zero. The shared runner test admits exactly 100 fake calls in the first invocation, completes the remaining 20 in the second, and proves a completed third invocation makes no calls.

## Pure API seam

```python
grade(request)
grade_deterministic_item(grading_plan, item)
validate_criterion_fixtures(grading_plan, fixtures)
project_judgment_input(grading_plan, item, blinded_item_id=...)
project_pairwise_judgment_input(grading_plan, item, blinded_item_id=...)
plan_judge_jobs(grading_plan, items)
parse_judgment_item(grading_plan, item, expected_phase=...)
plan_adjudication_jobs(grading_plan, items)
resolve_labels(grading_plan, grades)
```

The runner freezes the grading plan and measured records, publishes jobs/results, and owns all dispatch. Job order and `presentationIndex` retain the randomized presentation. For pairwise use, `project_pairwise_judgment_input` returns the private left/right reverse map separately from the public projection. Only `job["request"]` is sent to the grader. That request contains a blinded rubric/output projection, an explicit empty tools list, and no condition, measured-model/provider, timing, usage, log, or prior-score fields unless the artifact itself contains residual identifying text. Residual unblinding is retained explicitly rather than hidden.

Missing/malformed results and incomplete judge sets are non-success records. Adjudication is generated only for complete declared disagreements, uses deterministic unique IDs, and refuses to create a partial queue when the frozen maximum is too small.
