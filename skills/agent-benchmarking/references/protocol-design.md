# Protocol Design

Use this reference to freeze what the benchmark may decide and how its sample supports that decision. Condition identity and mechanisms belong in [conditions and mechanisms](conditions-and-mechanisms.md); grader certification belongs in [grading](grading.md); execution behavior belongs in [execution lifecycle](execution-lifecycle.md); and inference procedures belong in [statistical analysis](statistical-analysis.md).

## Decision record

Write the decision record before selecting scored tasks or inspecting scored outputs.

| Field | Required content |
| --- | --- |
| Decision | The exact action the result may change |
| Error consequences | Costs of false adoption, false retention, and an inconclusive result |
| Target population | Tasks, users, repositories, domains, and operating conditions covered by the claim |
| Sampling frame | Enumerated source, inclusion and exclusion rules, selection procedure, strata, and frozen population weights, if any |
| Conditions | Condition IDs and the single intervention or named bundle defined in the condition manifests |
| Primary estimand | Assignment-based contrast, inferential unit, outcome, aggregation, and failure-inclusive denominator |
| Practical threshold | Smallest worthwhile benefit and largest tolerable regression, in outcome units |
| Decision rule | Adoption, retain-control, blocked, or inconclusive rule, including quality and integrity vetoes |
| Budget and stopping | Fixed maximum tasks, repetitions, attempts, time, cost, review, and any valid sequential rule |

Treat unknown fields as unknown. Do not derive a threshold from observed results or continue until a preferred condition wins. Without a decision threshold, report estimates and uncertainty but make no promotion claim.

## Population, sample, and task roles

Select the scored sample from the declared sampling frame before condition outputs are visible. Record provenance, creation date, selection method, public exposure, contamination risk, strata, difficulty or risk coverage, and expected infeasible cases. Freeze each task's prompt, initial state, required and forbidden outcomes, budget, and grader contract.

Keep these roles disjoint:

- development tasks for harness and grader iteration;
- non-scoring canaries for condition, mechanism, scheduler, and supervisor checks;
- screening tasks for bounded exploratory comparisons;
- untouched confirmation tasks for the final decision.

Use a governed development/final split when prompts, graders, or harnesses are adapted. Describe disclosure and reuse honestly. Do not claim a holdout is contamination-free merely because it was hidden locally.

A repeated trajectory measures variation within a task. It does not enlarge the task population. One task supports a task-specific conclusion, and many near-duplicates do not establish broad generality.

## Estimand and practical decision rule

The task is normally the inferential unit, with repetitions nested within task. Define the primary contrast under assignment to each complete condition. Predeclare:

- the exact outcome and task-level aggregation;
- treatment of failure, abstention, timeout, invalidation, cancellation, and permitted retry;
- population weights, or equal task weighting by default;
- the practical effect threshold and every safety, quality, or integrity veto;
- whether the goal is superiority or non-inferiority;
- secondary contrasts and their fixed family.

Mechanism-exposure denominators are diagnostic unless exposure is randomized or structurally forced. See [conditions and mechanisms](conditions-and-mechanisms.md). First-attempt and production retry-policy estimands remain separate.

For non-inferiority, freeze the direction and margin before outputs, justify the margin in decision units, use a one-sided interval or test consistent with the estimand, and predeclare intercurrent-event and sensitivity handling. Import no clinical placebo, M1, or constancy assumptions. An interval crossing meaningful benefit and harm produces `inconclusive`, not equivalence.

The executable estimators, exact permutation assumptions, task-cluster bootstrap qualifications, multiplicity handling, and small-sample labels are owned by [statistical analysis](statistical-analysis.md).

## Blocking, randomization, and repetitions

Create the complete schedule before scored execution.

1. Form a block for each `(task_id, repetition)` and schedule every condition exactly once in that block.
2. Plan equal repetitions per task-condition cell. If this is impossible, revise the design before launch rather than silently accepting unequal cells.
3. Randomize condition order within blocks from a recorded seed and algorithm. Preserve assigned wave, position, and worker slot even when an attempt fails.
4. Spread conditions and task blocks across the operational window. Do not execute all control rows before all candidate rows.
5. Keep concurrency fixed or randomized as designed, and record any service regime that could interact with condition.

Fresh isolated state plus randomized order is the default. Use a Williams or other counterbalanced sequence only when units must share state and carryover cannot be removed. In that case, model or report period and carryover limitations rather than assuming an additive block model. Task-condition interactions remain visible in per-task results.

Choose repetitions from the practical threshold, desired precision, anticipated stochastic variation, task count, invalidation risk, and available budget. There is no universal credible run count. A single non-scoring attempt per materially distinct condition is a harness smoke, not reliability evidence. Screening needs repeated paired trajectories and remains exploratory. Confirmation uses an untouched task sample and a frozen maximum budget or valid predeclared sequential design.

The deterministic schedule contract and boundary checks belong in [validation](validation.md); immutable assignment and resume semantics belong in [execution lifecycle](execution-lifecycle.md).

## Design seal

Seal the design before scored output exists. A design revision owns at least:

- the decision record, population, sampling frame, and task revisions;
- task and condition manifests;
- grader contracts, implementations, fixture matrix, and certification receipt;
- the complete randomized block schedule;
- primary and secondary estimands, thresholds, vetoes, stopping rule, and statistical plan;
- every prompt, instruction bundle, rubric, hidden check, and analysis file that could change the result.

The seal manifest records `schema_version`, benchmark and design revision, owned safe relative paths, exact byte digests, and the sealing tool revision. Ownership must be closed: reject missing, changed, extra-owned, stale, unmatched, duplicate, or unsafe paths. Create seals write-once and verify local bytes immediately before any assignment. Cryptographic signatures or WORM storage are optional high-consequence controls; exact local byte verification is mandatory.

Launcher, supervisor, lifecycle, and telemetry implementation belong to the separate execution seal described in [execution lifecycle](execution-lifecycle.md). Never edit a seal. Plan each new revision as a verified predecessor plus an explicit manifest of added, changed, and removed owned paths and their before/after digests; do not copy or nest an earlier sealed closure into the new one. Verify the delta and new ownership closure before activation. A design-owned change creates a new design revision; any such change after scored output was inspected creates a new benchmark revision and must not be described as preregistered. Corrections retain the prior revision, append provenance, and state whether the timing forces descriptive or inconclusive interpretation.

## Design completion gate

Design is frozen only when the decision and sampling frame are explicit, the assignment-based estimand and threshold are executable, every task-condition block is complete and randomized, repetitions have a recorded rationale, graders are certified, condition verification is specified, and the design seal verifies byte-for-byte. Otherwise return `blocked` with the missing owner or `inconclusive` where no defensible decision rule exists.

Research support and transfer limits are recorded in [external research](evidence/external-research.md), not duplicated here.
