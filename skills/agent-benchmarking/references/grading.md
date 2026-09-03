# Grading

Use this reference to build and certify graders before attempts, then grade immutable terminal evidence without condition leakage. Design ownership belongs in [protocol design](protocol-design.md); attempt freezing and grader lifecycle belong in [execution lifecycle](execution-lifecycle.md); analysis belongs in [statistical analysis](statistical-analysis.md).

## Grade the final state

Prefer objective evidence from the state the task was meant to change.

| Outcome | Primary evidence |
| --- | --- |
| Code or automation | Behavioral/regression tests, final repository state, and scope checks |
| Web or computer action | Backing application/database state or task-specific state extractor |
| Structured response | Fail-closed parse/schema validation plus independent semantic predicates |
| Repository research | Exact live path/range/excerpt checks and verified call-path evidence |
| Source-based research | Claim-level passage entailment, authority, and temporal-validity evidence |
| Subjective artifact | Blinded anchored rubric with calibrated reviewers and adjudication |
| Required process | Structured evidence for the exact required or forbidden action, scored separately from outcome |

Grade the actual terminal message, structured result envelope, and final external state. Do not select a favorable earlier draft, terminal prose marker, tool-call success, reference-like patch, or plausible narrative as a substitute. Preserve unfinished, extra, or malformed terminal material and apply the frozen malformed-output rule. Multiple valid trajectories pass when they reach the same required final state.

For each criterion freeze required predicates, forbidden changes, evidence paths, partial-credit and abstention rules, malformed/timeout/integrity handling, grader command or rubric, and disagreement precedence. Objective final-state checks come first. Use model or human judgment only where deterministic evidence is insufficient.

## Construct graders before attempts

Build and design-seal grader contracts, implementations, hidden checks, reference material, rubrics, parser versions, and fixtures before scored output is visible. Keep grader-only material inaccessible to evaluated agents when leakage or gaming is possible.

Compound criteria require separately observable subcriteria. A grader must fail closed on missing, ambiguous, malformed, stale, or non-uniquely-owned evidence. Do not grade trajectory similarity unless trajectory itself is the declared outcome.

Create a governed development tier for grader iteration and an untouched final tier for the decision. Record task and fixture reuse, exposure, tuning history, and contamination risk. Hidden does not mean contamination-free.

## Certification fixture matrix

Every decisive criterion needs a persistent matrix containing all applicable fixture classes:

| Class | Required purpose |
| --- | --- |
| `known-good` | At least one valid final state that must pass |
| `known-bad` | A representative invalid final state that must fail |
| `isolated-defect` | One fixture per material predicate, with only that defect introduced |
| `boundary` | Threshold, tie, abstention, empty, maximum-size, and near-valid cases relevant to the contract |
| `malformed` | Invalid UTF-8, malformed or truncated JSON/JSONL, duplicate keys, wrong types, extra fields, and missing required evidence as applicable |

Citation, parser, and envelope graders also cover every natural output form allowed to conditions. Known-good fixtures prevent an always-fail grader; known-bad and isolated defects prevent always-pass or compound-criterion blind spots. Boundary fixtures verify the frozen decision edges. Malformed fixtures must fail closed without mutating source evidence.

Persist one certification row per `(grader_revision, criterion_id, fixture_id)` with fixture class, expected outcome, observed outcome, command/version, and resolving evidence paths. Certification passes only when every expected and observed outcome agrees, all required classes are present, and every evidence path resolves uniquely. Keep the matrix and receipt immutable. Machine-readable records follow the canonical [grader](../schemas/grader.schema.json) and [result](../schemas/result.schema.json) schemas; persistent adversarial cases are owned by [validation](validation.md), not redefined here.

## Citation and temporal grading

Grade source-based work at claim level. For each material claim retain:

- the exact claim and citation target;
- fetched passage or record that entails it;
- source title, publisher or authority, document type, canonical URL or identifier;
- publication, update, effective, and event dates when relevant;
- coordinator-observed retrieval time and raw/archive evidence path;
- the task's historical cutoff and the temporal-validity decision.

A citation passes only when the cited passage entails the claim, the source has suitable authority for that claim, and the evidence was valid at the frozen cutoff. Publication, announcement, effective, and event dates are not interchangeable. For mutable web claims, retain a contemporaneous archive or versioned primary record that proves what was available by the cutoff. A current page, search snippet, model-authored retrieval date, or later correction does not prove historical availability.

If cutoff validity or archival state cannot be established, return the criterion's frozen `unknown`, abstention, or failure outcome rather than inferring a date. Fixture the wrong-date, future-source, weak-authority, non-entailing, mutable-page, corrected-page, and missing-archive cases. External source selection evidence and transfer limits are recorded in [external research](evidence/external-research.md).

## Blinding and calibration

Freeze and reconcile raw attempts before generating a condition-private blind map. Verify the commit receipt for both map digests before publishing any public grader packet. Every public-map `item_path` must resolve to the create-only public packet at `blinded/<blind_id>/item.json`; private reverse-map paths never enter grader packets. Public grader inputs expose only the blinded item ID and criterion-relevant final evidence. Hide condition, model, provider, price, schedule order, latency, prior scores, and irrelevant trace prose. Keep the reverse map inaccessible to graders until immutable grader terminals exist.

For pairwise judgment, randomize item order and swap left/right positions. Anchor every rubric level with observable examples. Calibrate each model or human grader version on independently labeled fixtures before final grading; retain individual labels, disagreements, adjudication, and agreement measures when available. Inspect a stratified sample of passes, failures, boundaries, and disagreements. One grader provides no estimate of inter-grader variance, so state that limitation. High-consequence decisions require independent deterministic or human confirmation.

Calibration fixtures are not scored benchmark attempts. Changing rubric, prompt, model, parsing, adjudication, or thresholds after seeing scored outputs creates a new grader and benchmark revision.

## Separate grader traffic

Run model graders through direct `agents.run` only after agent execution is complete and raw outputs are frozen. Use separate agent IDs, sessions, logs, usage, tool calls, provider metadata, and immutable grader terminal records. Grader retries receive new IDs and never overwrite prior results. Do not use `workflow.agent` for model graders.

Do not overlap grader and measured-agent traffic unless shared evaluator load is a declared intervention. If overlap occurs, report it as a confounder and do not attribute affected latency or rate limits solely to a condition. Grader usage and cost remain separate from attempt usage; [telemetry](telemetry.md) owns the accounting rules.

## Grading completion gate

Grading may start only after the design seal verifies, the complete fixture matrix certifies every grader revision, scheduled attempts reconcile exactly, raw outputs are frozen, and the blind map is created write-once. It completes only when every gradable terminal has exactly one immutable grader terminal per required grader, malformed and invalid cases remain visible, grader traffic reconciles separately, and unblinding occurs after the graded freeze. Final result construction and uncertainty then follow [statistical analysis](statistical-analysis.md); completion claims follow [audit and reporting](audit-and-reporting.md).
