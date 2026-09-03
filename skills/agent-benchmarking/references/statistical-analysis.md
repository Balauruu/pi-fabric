# Statistical Analysis

Use this reference after raw outputs and grader records are frozen and lifecycle reconciliation passes. The sealed protocol owns the estimand, metric direction, practical threshold, non-inferiority margin, task weights, planned contrasts, and missing-data policy. Analysis must implement those choices, not select favorable alternatives after seeing results.

## Analysis gate

Refuse confirmatory analysis unless:

- design and execution seals verify byte-for-byte;
- every sealed schedule row reconciles to one assignment and terminal;
- all raw and grader artifacts are immutable and ownership-complete;
- treatment verification, failures, retries, repairs, and exclusions follow the frozen policy;
- every planned task-condition-repetition cell is present or has its prespecified terminal outcome;
- the blind map remains condition-private until grading is frozen.

An audit may still compute clearly labeled descriptive diagnostics from an incomplete packet. It must not present them as the sealed benchmark result.

## Task-paired estimand

The task is normally the sampling, weighting, and bootstrap-cluster unit. Repetitions are nested within task, not independent task samples. Do not confuse that inferential unit with the randomization unit. In the canonical generated schedule, one complete assignment block is `(task_id, repetition)`: every condition appears once, and condition labels are assigned to fixed `order_position` values inside that repetition block. Thus a repetition block may be a legitimate label-permutation unit even though it is not an independent population observation. The test statistic must still collapse repetitions within task and then weight tasks as sealed.

For two conditions, calculate the primary contrast in this order:

1. retain every repetition-level outcome for task `t` and condition `c`;
2. apply the frozen failure and partial-outcome mapping;
3. compute the condition summary within each task using equal repetition weight unless another rule was sealed;
4. orient each task contrast so positive always means improvement;
5. compute the prespecified weighted or unweighted mean of task contrasts.

In notation:

```text
y_bar[t,c] = summary over repetitions r of y[t,c,r]
d[t]       = oriented(y_bar[t,candidate] - y_bar[t,control])
effect      = sum(w[t] * d[t]) / sum(w[t])
```

Default task weights are equal. Population weights are valid only when frozen from a defined target population before outputs. Do not give a task extra weight because it has more retries, valid survivors, or grader records.

Show the raw task-condition-repetition table, each task summary, each paired contrast, and the aggregate. Report task-condition interaction through the distribution of `d[t]`, wins/ties/losses where meaningful, and the worst material regressions. An overall average cannot establish reliability or hide task concentration.

The assignment-based contrast is primary. Treatment-load, mechanism-exposure, or contract-valid subsets are diagnostic unless exposure was randomized or structurally forced. Keep their denominators and do not interpret behavior-conditioned filtering causally.

## Practical thresholds and decision states

Apply the sealed practical-effect threshold to the point estimate and uncertainty without moving the threshold after observation. Apply quality and integrity vetoes independently. A statistically distinguishable but practically trivial result does not pass a practical adoption rule. A favorable point estimate with uncertainty crossing the decision boundary is `inconclusive` unless the sealed rule says otherwise.

For each primary or planned secondary metric report:

- direction and unit;
- task-paired point effect;
- practical threshold or non-inferiority margin;
- uncertainty method and level;
- count of tasks and nested repetitions;
- decision state under the frozen rule;
- quality/integrity veto status.

Do not combine quality, latency, tokens, cache, tools, and cost into one saturated ordinal efficiency score. Report their continuous or count distributions and failure-inclusive denominators separately.

## Exact randomization and permutation inference

Use an exact randomization test only when its allocations reproduce the frozen assignment mechanism. Preserve task/repetition membership, condition counts, fixed schedule positions, and every cross-block balance restriction. State separately:

- **sampling/weighting unit:** normally task;
- **assignment block:** the rows among which condition labels were randomized, normally one `(task_id, repetition)` block;
- **permutation unit:** one complete label allocation allowed by the frozen randomizer. This may be one repetition-block swap, one task-vector swap, or a globally coupled schedule allocation, depending on what was actually randomized.

For two conditions independently assigned to the two positions within every `(task, repetition)` block, the exact test fixes observed outcomes and positions, enumerates identity/swap for all `B` complete repetition blocks, recomputes task means after every allocation, and applies the sealed task-weighted statistic. Its support has `2^B` allocations before any additional restriction. A concrete executable specification is:

```python
observed = task_weighted_mean(task_mean(candidate - control))
extreme = 0
for signs in itertools.product((-1, 1), repeat=B):
    # One sign per (task_id, repetition) assignment block.
    permuted_task_effect = {
        task: mean(signs[index[task, rep]] * observed_difference[task, rep]
                   for rep in repetitions[task])
        for task in tasks
    }
    statistic = weighted_mean(permuted_task_effect, frozen_task_weights)
    extreme += tail_rule(statistic, observed)
p_value = extreme / (2 ** B)
```

This enumeration uses repetition blocks as assignment/permutation units without pretending they are independent sampled tasks: every permuted statistic re-aggregates by task. For more than two conditions, replace each sign with the condition-label permutations allowed within that complete block.

A task-vector sign flip is different. It swaps all repetitions for a task together and has `2^T` allocations. It is exact only if the frozen mechanism randomized one complete condition vector per task, or if a justified exchangeability model rather than design randomization was prespecified. It is not automatically valid for schedules that randomized labels separately inside each repetition block.

The current `scripts/generate_schedule.py` also couples blocks to enforce global position balance through cyclic shifts. Therefore independent `2^B` flips do not reproduce that generator. A valid exact test for its output must enumerate the complete schedule allocations produced with the same block-order and position-balance restrictions, with their actual assignment probabilities, then reassign labels to fixed outcomes and recompute the task-level statistic. Conditioning on selected schedule features must be prespecified. Enumerating arbitrary balanced schedules uniformly is invalid unless that was the actual frozen randomizer.

The currently shipped `scripts/analyze_paired.py` implements `2^T` task-vector sign flips. Treat that output as exact only for a matching task-vector assignment/exchangeability contract. For the canonical repetition-block schedule, confirmatory exact-randomization status remains blocked until the helper accepts the sealed schedule/randomizer contract and validation proves the allocation support and weights. Do not relabel the existing task-vector calculation as the schedule's exact randomization test.

Every exact-test artifact must record:

- the sharp null;
- assignment versus model-based exchangeability assumptions;
- randomizer ID/version and sealed schedule digest;
- assignment block, permutation unit, allowed allocation set and its size/probabilities;
- whether the observed allocation was included exactly once;
- task aggregation, weights, statistic, and one- or two-sided tail rule;
- the discrete minimum attainable p-value.

If code samples allocations instead of enumerating the complete support, call it a seeded Monte Carlo randomization approximation, report draw count and Monte Carlo uncertainty, and do not label it exact. A small p-value addresses only the declared sharp null under those assumptions. It does not define a target population, prove mechanism efficacy, or establish practical importance.

## Task-cluster bootstrap

For qualified uncertainty on the task-paired estimand, resample task IDs with replacement. Each sampled task carries all of its conditions, repetitions, terminal failures, and frozen weights. Recompute within-task summaries and the aggregate on every draw. Never resample trajectories independently across conditions.

Record seed, algorithm/version, draw count, interval construction, task count, and any degenerate draws. The helper must return byte-identical output for identical input bytes and arguments.

When tasks are few, convenience-selected, or hand-curated, the interval describes instability under resampling of those observed task clusters. It does not manufacture a population sampling claim. Report discrete or unstable intervals, task concentration, and leave broader transfer unknown. A bootstrap cannot repair one task family, one model snapshot, or an undefined sampling frame.

## Non-inferiority adaptation

Use non-inferiority only when the protocol prespecified a defensible one-sided margin and an efficiency or operational benefit that matters if quality is retained. Orient effects so the criterion is unambiguous. For example, if higher quality is better and `d = candidate - control`, non-inferiority requires the appropriate one-sided confidence bound to exceed `-margin`.

Report:

- margin, rationale, unit, and direction;
- assignment-based point effect and one-sided interval/bound;
- failures and intercurrent events under the frozen mapping;
- per-task regressions and quality/integrity vetoes;
- sensitivity results under plausible conservative mappings.

Transfer only prespecification, one-sided margin/interval logic, event classification, and sensitivity analysis. Do not import clinical placebo, M1, constancy, or regulatory assumptions into an agent benchmark.

## Multiplicity and adaptivity

Freeze the primary contrast and any confirmatory family before outputs. For a fixed family of multiple conditions, metrics, or pairwise contrasts, apply the prespecified family-wise or false-discovery control and report both raw and adjusted results. Do not promote whichever secondary metric or condition wins.

Adaptive development is exploratory unless a governed final set and analysis were held apart. Disclose task, grader, prompt, model, condition, threshold, and analysis changes informed by prior outputs. A later final set may reduce direct reuse, but do not claim it is contamination-free. Report exploratory and final revisions separately.

Optional hierarchical Bayesian or crossed random-effects models are prespecified extensions, not defaults. Use them only with enough tasks and diagnostics, and keep the task-paired raw result visible.

## Missingness, invalidation, and sensitivity

Never silently drop a terminal row. Separate agent/condition failures from independently justified infrastructure or evaluator invalidations, then apply the frozen rerun policy symmetrically. Preserve invalid parents and link new retry IDs.

At minimum, run and report prespecified or clearly labeled sensitivity analyses for material risks:

- conservative outcomes for unresolved or ungraded attempts;
- inclusion versus justified exclusion of infrastructure invalidations;
- first attempt versus the exact production retry policy;
- repaired versus unrepaired output, with first-attempt unchanged;
- treatment-unverified and mechanism-unexposed records;
- alternative reasonable task summaries or population weights;
- leave-one-task-out or task-family concentration;
- grader disagreement or plausible grader-error bounds;
- concurrency/service-tier strata and provider-attribution unknowns.

Sensitivity analysis bounds a conclusion; it does not authorize changing the primary result.

## Reliability metrics

Keep first-attempt acceptance separate from retry behavior.

- `pass@1` is first-attempt acceptance under one allowed attempt.
- Retry-policy acceptance is success under the exact production retry policy and total budget.
- `pass@k` is the chance of at least one success among `k` eligible attempts only when production permits that policy and assumptions are stated.
- `pass^k` or all-attempt consistency is the chance all required repeated attempts succeed only when that reliability question is operationally relevant.

These are secondary operational metrics unless sealed as primary. Never present `pass@k` as single-attempt reliability or repaired success as pass@1.

## Small-sample limits

With few task blocks:

- exact tests have coarse resolution and may be unable to reach conventional cutoffs;
- bootstrap intervals may be unstable or degenerate;
- one task can dominate the aggregate;
- interaction and grader variance are weakly identified;
- asymptotic standard errors and trajectory-level independence are not credible shortcuts.

Report counts, per-task effects, medians/ranges, and the exact resolution. Label the result `screening` or `inconclusive` when precision cannot support the frozen decision. Do not turn a significance failure into equivalence, or a significance success into a broad population claim.

## Analysis output

The immutable analysis artifact includes:

1. verified input and seal digests;
2. estimand and frozen decision rule;
3. raw task-condition-repetition outcomes;
4. task summaries and paired contrasts;
5. effect, uncertainty, exact/randomization output, and multiplicity adjustment as applicable;
6. failure-inclusive denominators and retry/repair strata;
7. sensitivity analyses and per-task concentration;
8. practical, non-inferiority, quality, and integrity decision states;
9. assumptions, small-sample limits, and unsupported claims.

The decision report interprets this artifact using [audit and reporting](audit-and-reporting.md). It must not rerun analysis with undisclosed alternatives.

## Evidence basis

Detailed source metadata, versioned URLs, passages, applicability, and transfer limits are owned only by [external research evidence](evidence/external-research.md). Relevant evidence IDs are D4-D11, D15, E1-E3, S1-S9, and T9. This reference states the adopted analysis contract and does not maintain a duplicate source list.
