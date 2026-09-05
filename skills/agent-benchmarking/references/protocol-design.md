# Protocol design

Freeze the design before scored assignment. The resolved spec is the authority; changing it requires a new run directory.

## Scientific question

State the intervention, control, task domain, primary outcome, direction, practical threshold, and decision the benchmark may support. Mark the role as development, screening, estimation, or confirmatory. Distinguish a finite curated task-set claim from a task-population claim and record the sampling frame and selection method. Do not generalize convenience tasks to an unspecified population.

## Units and assignment

The task is normally the sampling and cluster unit. Repetitions estimate within-task variability and are not new independent tasks. Define condition order, repetitions, concurrency, and one assignment law:

- `independent-block-v1`: condition allocation varies independently in each repetition block;
- `task-vector-v1`: one allocation vector is shared within each task;
- `balanced-cyclic-v1`: support is the seeded balanced cyclic generator, including path multiplicities;
- `counterbalanced-v1`: use only with its declared periods and carryover assumptions.

Save the realized block/order fields. Inference must condition on exactly this mechanism. Interleaving limits order drift but does not establish exchangeability by itself.

## Outcomes and decisions

For each metric, save type, direction, weight, valid range, and status mapping. Define timeout, cancellation, infrastructure failure, evaluator failure, and treatment-unverified behavior. Keep retries linked and separate. Prespecify:

- contrasts and complete hypothesis family;
- practical superiority or non-inferiority margin;
- exact/Monte Carlo randomization choices, tails, ties, and approximation policy;
- bootstrap unit/strata/method and confidence level;
- fixed sample or valid finite-look alpha allocation;
- reliability, missingness, grader-uncertainty, and sensitivity estimands;
- optional model likelihood, effects, priors, sampler, interval, and seeds.

No practical threshold means estimation only, not an invented adoption rule. Cost stopping does not become a statistical sequential design.

## Grading and state

Prefer deterministic evidence tied to the declared task outcome. If judgment is needed, freeze rubric, calibration inputs, labels, grader repetitions, blinding, and disagreement handling before outputs are exposed. Task setup/reset is required only when the task actually has mutable state; use a concrete task-specific command/check rather than a generic infrastructure inventory.
