# Audit and Reporting

Use this reference to audit an existing benchmark packet, determine the smallest valid repair, and produce the final decision report. Audit is evidence-first and read-only with respect to existing packet artifacts. It does not rerun an existing benchmark or rewrite evidence.

## Audit contract

Start from the packet bytes, not its summary. Record the packet root, revision IDs, seal paths and digests, audit time, auditor/tool versions, and any inaccessible surfaces. Preserve the packet unchanged. Write audit output to a new create-only revision or outside the audited root according to its ownership policy.

An audit may validate, reconcile, and recompute deterministic projections from immutable evidence. It may not:

- call a model or tool as a continuation of an existing attempt;
- fill gaps with model-authored IDs, timestamps, provenance, or retrieval dates;
- overwrite or delete a failed, ambiguous, or unfavorable record;
- infer completion from counts, terminal prose, UI state, process absence, or reconstructed timestamps;
- silently reinterpret conditions, estimands, thresholds, exclusions, or grader policy;
- rerun scored work under an existing attempt ID.

If valid repair requires new scored or grader calls, recommend a new linked benchmark/execution revision with new IDs. Do not perform that run on the Audit route.

## Finding taxonomy

Assign every finding one or more of these classes and state its affected claims.

### Fatal

A fatal defect prevents the claimed benchmark decision or completion state. Examples include:

- design or execution ownership cannot be established, a required seal is missing/mismatched, or design choices changed after outputs;
- schedule, assignment, terminal, raw result, decisive grader, retry, child, or artifact ownership cannot reconcile exactly;
- an assigned-without-terminal attempt is replayed, a terminal attempt is overwritten, or failures were silently excluded;
- conditions are not identifiable/comparable enough to define the intended contrast;
- a grader or historical/source criterion is result-changing and cannot be corrected from contemporaneous immutable evidence;
- the blind/freeze boundary was violated in a way that can influence grading;
- analysis uses an incompatible estimand, post-hoc threshold, or unsupported denominator and the primary result cannot be recovered deterministically.

Retain the packet as failure evidence. Do not call it benchmark-complete or use it for the blocked decision.

### Confounding

A confounding defect leaves outcomes observable but prevents clean attribution to the declared intervention. Examples include fixed order, shared mutable state, unequal budgets, grader traffic overlapping only one condition, runtime/model mismatch, mutable external inputs sampled at different times, or a bundle mislabeled as one mechanism.

Report descriptive condition differences if lifecycle and grading remain valid, but narrow or withhold causal claims. A confounder may also be fatal for a decision that specifically requires causal attribution.

### Repairable

A repairable defect is clerical or serialization-only. The complete semantic output and decisive contemporaneous evidence already exist as immutable bytes, and repair needs no model call, tool call, changed context, new external evidence, or workspace mutation. Examples include deterministic parsing, restoring a projection field from a sealed raw result, correcting an owned path reference, or publishing a missing terminal projection from an already persisted full result.

The repair creates a new linked artifact. Record original and repaired digests, deterministic method/version, operator, time, added local latency/cost, and why semantics did not change. Never mutate the source. If reasonable repairs can change a grade or status, the finding is not merely repairable.

### Analysis-limited

An analysis-limited packet is structurally valid but cannot support the desired precision or transfer. Examples include too few tasks, hand-curated tasks with no population sampling frame, one task family, one model/provider snapshot, coarse exact-test resolution, unstable cluster bootstrap, one subjective grader, unknown provider-native fields, sparse mechanism exposure, or unmeasured serial performance.

Keep the valid measurements and state the narrower estimand. Do not manufacture a population, equivalence, mechanism, or provider-general claim.

## Audit procedure

### 1. Inventory and verify ownership

Inventory design, execution, task, condition, schedule, grader, raw, blind-map, telemetry, analysis, report, correction, and provenance artifacts. Reject unsafe paths, duplicate JSON keys, malformed encodings, unsupported schema versions, duplicate owners, orphan artifacts, and unowned design inputs. Verify each seal by exact bytes and ownership closure, including missing, changed, extra, stale, and unmatched files.

### 2. Reconcile execution

Reconcile by stable IDs, not aggregate counts:

- every sealed schedule row has exactly one matching assignment and terminal;
- every assignment repeats the sealed task, condition, repetition, block, position, wave, and worker slot;
- started is zero-or-one and agrees with terminal startup state;
- each terminal owns the full raw `FabricAgentResult` or preserved prelaunch exception and all decisive artifacts;
- retries/repairs have retained predecessors and legal IDs;
- graders, children, session/log evidence, and artifacts each have one owner;
- publication sequence is monotonic and reconstructed occurrence times are labeled rather than presented as live chronology;
- every failure and exclusion remains in its frozen denominator.

An assigned-without-terminal row is ambiguous, not pending permission to replay. Follow [execution lifecycle](execution-lifecycle.md).

### 3. Verify conditions and mechanism

Compare requested, Fabric-resolved, and provider-observed runner/model evidence. Verify exact prompts/instruction bundles, skills, extensions, tools, permissions, mutable-state isolation, budgets, concurrency, and external-input windows. Prompt text or a slash command alone does not prove a skill or mechanism loaded. If inline instructions were used, audit the condition as that instruction bundle and restrict equivalence claims.

Check the assignment, treatment-verified, mechanism-exposed, and output-contract-valid denominators separately. Mechanism-conditioned results remain diagnostic unless exposure was randomized or structurally forced.

### 4. Verify freeze, grading, and sources

Confirm graders and their known-good, known-bad, isolated-defect, boundary, and malformed fixtures were certified before scored outputs. Verify raw freeze preceded blind-map creation and model grading. Confirm model graders used separate direct agent traffic and immutable grader terminals.

For source-based tasks, inspect claim-level entailment, source authority, temporal validity, historical cutoff, and contemporaneous archive evidence. A current page cannot prove what it said at an earlier cutoff. Record unavailable or mutable evidence as unknown, not as a pass.

### 5. Verify telemetry and analysis

Check unique parent/child ownership, direct versus inclusive usage, provider-native fields, cache semantics, tool-call provenance, latency boundaries, grader separation, and unknown-value handling as defined in [telemetry](telemetry.md). Recompute sums from raw rows and reject double counting.

Verify task-paired estimands, repetitions nested within task, exact/block-restricted permutations, task-cluster resampling, practical/non-inferiority thresholds, multiplicity, adaptive history, sensitivity analyses, and small-sample labels against [statistical analysis](statistical-analysis.md).

### 6. Classify and select minimum repair

For each finding record evidence paths and digests, class, affected rows/claims, whether results can change, smallest valid repair, and residual limitation. Prefer, in order:

1. no change, only narrow the claim;
2. deterministic recomputation from complete immutable evidence;
3. serialization-only create-once correction;
4. regrade frozen raw outputs under a new grader revision, only when the design permits and old grades remain visible;
5. a new linked execution/benchmark revision with new IDs;
6. abandon the unsupported decision while retaining the packet.

Choose the first option that restores the required validity. Never rerun unaffected scored work for convenience. Any new revision must declare which earlier evidence it reuses and why that reuse cannot leak treatment or outcomes.

## Decision report structure

Keep these sections separate:

1. **Facts:** sealed conditions, runtime identities, task sample, schedule, assignments, statuses, artifacts, deviations, and audit findings directly supported by immutable evidence.
2. **Measurements:** frozen grader outcomes, task-paired effects, distributions, uncertainty, failures, latency, tokens/cache, tools, cost, and denominators under the declared protocol.
3. **Inference:** bounded interpretation under stated assignment, sampling, grader, runtime, and external-validity assumptions.
4. **Recommendation:** adopt, retain control, block, or declare inconclusive under the prespecified practical, quality, integrity, and non-inferiority rules.
5. **Unknowns:** missing evidence, unresolved contradictions, unsupported transfer, and the smallest additional measurement that could change the recommendation.

Also include exact condition bundles and verified exposure, task population and sampling frame, repetitions, waves, worker slots, proven maximum concurrency, retry/repair strata, grader certification and disagreement, per-task regressions, multiplicity/adaptivity disclosure, and every protocol deviation.

Do not claim one condition is generally better from one repository, task family, model/provider snapshot, evaluator, concurrency regime, or live time window. State the supported boundary in the recommendation sentence itself.

## Exact completion gate

A benchmark is complete only when every applicable item below is proven from immutable artifacts:

1. Design and execution revisions are sealed, ownership-closed, and byte-verified.
2. Tasks, conditions, schedule, thresholds, graders, retry policy, and analysis plan are the frozen revisions used.
3. Static checks and required non-scoring canaries passed before the first scored assignment.
4. Schedule rows, assignments, terminals, and ledger projections are exact one-to-one matches.
5. Every row has zero or one valid started record; prelaunch terminals have none and started terminals have one.
6. Every terminal owns one full raw result or prelaunch exception, final-state evidence, and all required logs/pointers without duplicate or orphan ownership.
7. Every retry, repair, grader, and nested child has a legal unique ID, retained predecessor/parent, terminal state, and failure-inclusive accounting.
8. No assigned row, failure, cancellation, malformed output, treatment mismatch, or exclusion disappeared from a reported denominator.
9. Raw outputs froze only after execution reconciliation; blinding followed raw freeze; all grader terminals then reconciled and froze.
10. Telemetry preserves requested/resolved/observed identity, provider-native values, direct/inclusive scope, unknowns, and no double counting.
11. Analysis uses the sealed task-paired estimand, nested repetitions, thresholds, multiplicity rule, sensitivity checks, and justified uncertainty labels.
12. The report separates facts, measurements, inference, recommendation, and unknowns, and states external-validity and small-sample limits.
13. Every correction is append-only, linked, digest-verifiable, and classified as result-preserving or result-changing.
14. No unresolved fatal finding remains, and every confounding or analysis-limited finding is reflected in the supported claim and recommendation.

Failing any applicable item forbids a benchmark-complete signal. Return a deterministic reconciliation failure and the smallest valid repair instead. Count equality alone is insufficient.

## Completion receipt

The final create-only receipt records:

- packet root and all governing revision/seal digests;
- reconciliation and validator versions with command/argument records;
- exact scheduled, assigned, started, terminal, frozen, graded, analyzed, failed, excluded, retry, repair, child, and artifact counts;
- telemetry ownership/sum checks and unknown counts;
- finding IDs by taxonomy and their disposition;
- completion-gate result for each numbered item;
- supported recommendation scope, remaining limitations, and smallest follow-up evaluation;
- protected-state and unrelated-state checks, including anything uncheckable.

The receipt reports completion evidence. It cannot waive a failed gate or replace the underlying raw artifacts.
