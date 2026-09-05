# Statistical analysis

This is the scientific contract for designing and interpreting comparisons. The saved experiment, not favorable observed results, selects the method. The [README method/evidence ledger](../README.md#statistical-method-coverage) distinguishes implemented, validated, and unsupported combinations; this reference does not certify those implementations.

Analysis consumes the resolved spec, full schedule, every attempt and status mapping, individual grader labels, and native telemetry. It makes no model-backend calls, silently regrades nothing, and preserves the assignment-based paired result even when a model analysis is selected. Incomplete records can support explicitly descriptive diagnostics and conservative bounds, not a complete-confirmation label.

## Question, population, and estimand

- Distinguish a finite-task comparison from inference to a task population. Record sampling frame, selection procedure, strata/families, and any prespecified population weights.
- Keep development, calibration/smoke, exploratory screening, and confirmation roles distinct. Explain task reuse and contamination limitations without calling a locally hidden set automatically clean.
- Define assignment-based primary estimands, outcome direction/unit, aggregation, failure mapping, and the decision or estimation question.
- Treat the task as the usual inferential unit, with repetitions nested within task. If tasks share a stronger dependence unit, declare that family/repository cluster and handle it in uncertainty calculations.
- Treatment-load and mechanism-exposure subsets are diagnostics unless assignment/exposure was randomized or forced in a way that supports the causal claim.
- Do not invent a target population or decision margin from observed output.

## Sample size, precision, and stopping design

Provide design-time precision/power exploration using plausible effect/variance scenarios, task heterogeneity, failure rates, grading noise, and the actual randomizer/estimator where feasible.

Use NumPy to simulate complete experiments through the production assignment, analysis, multiplicity, and stopping rules. SciPy `stats.power` and statsmodels `TTestPower` provide numerical/reference cases, not automatic design-faithful simulations. For paired analytic checks, standardize task differences and count independent tasks, not trajectories. Separate random streams for outcomes, assignment, grading, and inner resampling; report Monte Carlo error as well as scenario sensitivity.

- Prefer simulation through the selected design over a trajectory-level independent-sample formula.
- Use pilot/development assumptions, not the final observed effect as retrospective “power.”
- Explore adding tasks versus adding repetitions; repetitions do not create new task diversity.
- Show sensitivity to assumptions, expected interval width or decision probability, cost, and the exact test's attainable resolution.
- Save the maximum sample and stopping rule before scored output. Do not prescribe a universal credible run count.
- Describe underpowered screening as screening. A small budget does not justify an overstated conclusion.

## Task-paired estimates

For each task and condition, apply the saved failure/partial-outcome rule, summarize repetitions, and then compute the oriented paired contrast:

```text
y_bar[t,c] = saved summary of outcomes across repetitions for task t, condition c
d[t]       = oriented(y_bar[t,candidate] - y_bar[t,control])
effect     = sum(w[t] * d[t]) / sum(w[t])
```

Default task weights are equal. Weighting cannot depend on which tasks succeeded, how many retries were attempted, or which condition looked best.

Show the raw task-condition-repetition table, task summaries, paired contrasts, task-effect distribution, meaningful wins/ties/losses, and the largest regressions. Support multiple conditions through a saved set of contrasts, not automatic promotion of the observed winner.

Different metrics can need different summaries, such as a mean, quantile, binary rate, or a prespecified transformation. Save these choices and their interpretation; do not use one saturated ordinal “efficiency” score.

## Randomization contracts and the known mismatch

The historical generator balanced positions through cyclic shifts while its paired helper used task-vector sign flips. These are different assignment laws; the refactored interface records the law explicitly and must not reinterpret old schedules.

A balanced schedule cannot receive an exact-randomization claim from a task-vector calculation. Verify the selected law against its independent support/probability oracle; a passing test of another randomizer is not evidence.

Implement named contracts for:

1. **Independent repetition-block assignment:** each `(task, repetition)` block contains all conditions and receives its declared random label permutation.
2. **Task-vector assignment:** one condition-label transformation applies across all repetitions of a task; inference may use matching task-vector swaps.
3. **Existing balanced cyclic assignment:** preserve its actual block-order, position restrictions, and assignment probabilities. Do not substitute a uniformly sampled set of arbitrary balanced schedules.
4. **Selected counterbalanced/shared-state designs:** retain their period/carryover assumptions and use analysis appropriate to them. Counterbalancing alone does not prove independence or eliminate interference.

Save the observed schedule, seed, algorithm name/parameters, assignment blocks, fixed positions, and any conditioning choices. A new simpler generator has a different declared contract; it cannot reinterpret a historical schedule.

Retain the researched counterexample as a regression fixture: with two conditions and four blocks, conditioning on block order, the existing cyclic construction permits four order patterns, arbitrary global balance permits six, and independent block swaps permit sixteen. Check generating-path multiplicities independently. This small support example is not a proof of all finite-seed probabilities or of every conditional analysis.

## Exact tests and Monte Carlo randomization

For each supported randomizer:

- Define the sharp null, assignment support, probabilities, statistic, conditioning, and one- or two-sided tail convention.
- Distinguish sampling/weighting unit, assignment block, and permutation unit.
- Recompute task summaries and the saved task-weighted statistic for every allocation. Swapping repetition blocks does not make repetitions independent population samples.
- For two-condition independent repetition blocks, enumerate the `2^B` legal block swaps when feasible. For task-vector assignment, use the corresponding `2^T` support. Multi-condition blocks use their allowed permutations.
- For the balanced cyclic generator, derive support and weights from its actual generating choices, including repeated generation paths that produce the same allocation. Verify conditioning on observed features rather than assuming it is innocuous.
- Include the observed allocation with the correct probability and report the discrete minimum attainable p-value and tie convention.
- Use exhaustive exact enumeration only within a declared computational limit. Beyond it, use a seeded Monte Carlo procedure that samples from the correct law, with an appropriate finite-sampling p-value construction, draw count, and Monte Carlo uncertainty.
- Never label sampled allocations “exact.” Do not silently switch from exact to Monte Carlo if the analysis plan forbids approximation; return a method-specific limitation instead.
- Keep sharp-null randomization claims distinct from population-average, mechanism, practical-significance, and equivalence claims.

Use SciPy's standard permutation procedures only for their matching assignment/exchangeability schemes. The balanced generator needs a custom joint allocation-law adapter; `monte_carlo_test` can wrap that adapter, but cannot supply its law. Prefer a small explicit sampler/tail accumulator if packing schedules into a generic array interface obscures the design.

For a fixed number `M` of simulated allocations, a construction such as `(1 + extreme_count) / (M + 1)` requires the observed and simulated statistics to be exchangeable under the correct null law. Sampling nonuniform allocations with the wrong probabilities is not repaired by this correction. Prespecify extremeness and ties: SciPy's default twice-smaller-tail convention is not universally identical to the existing absolute-statistic rule.

Implement small independent exhaustive oracles before optimizing the production enumerator/sampler. Nonuniform allocation probabilities and multi-condition schedules need explicit fixtures.

## Cluster bootstrap and interval construction

Retain task-cluster bootstrap uncertainty for the paired estimand. Every sampled cluster carries its complete conditions, repetitions, failures, and applicable weights. Recompute the statistic on every draw.

Use SciPy for interval machinery, not to infer the resampling unit. `paired=True` shares row indices across arrays; it does not automatically preserve task/family clusters. Resample cluster IDs or whole-cluster vectors, and implement cluster-level deletion for BCa jackknifing. Detect degenerate distributions and NaN bounds rather than silently switching interval methods.

- If a higher-level family/repository is the declared dependence unit, resample that unit rather than splitting dependent tasks.
- Use stratified resampling where the sampling/weighting design requires it. Treat complex sampling weights according to a justified design, not as arbitrary bootstrap weights.
- Record seed, draw count, interval construction, confidence level, cluster count, and degeneracy diagnostics.
- Prespecify percentile or other supported interval constructions. An alternative construction needs its own calibration and assumptions, not a cosmetic option name.
- Produce deterministic outputs for repeated pure-method calls on identical inputs/settings in the same environment. Validate numerical backends to documented tolerances rather than promising bitwise equality across all software and hardware.
- Explain that resampling a small curated sample measures instability of those observed clusters, not automatic population coverage.

## Superiority, practical effects, and non-inferiority

Keep point effects, uncertainty, statistical evidence, and practical decisions separate.

- Save metric direction, threshold, decision margin, confidence level, and any outcome-quality vetoes.
- A small p-value with a trivial effect does not imply adoption. A favorable point estimate whose uncertainty crosses the decision boundary is ordinarily inconclusive under that rule.
- For non-inferiority, save a defensible margin and its practical rationale before scoring. With positive values meaning improvement, compare the appropriate one-sided bound against `-margin`.
- Report the operational benefit sought while retaining quality, worst task regressions, failures/intercurrent events, and conservative sensitivity results.
- Do not turn failure to reject a superiority null into equivalence or non-inferiority.
- Do not import clinical placebo/constancy/regulatory assumptions into an agent benchmark.
- Outcome-quality vetoes refer to declared task requirements, not the removed machine-protection subsystem.

## Multiplicity and multi-condition comparisons

Support a saved family of conditions, metrics, and contrasts with explicit primary/secondary/exploratory roles.

- Implement Holm and Bonferroni family-wise control for applicable tests.
- Support Benjamini-Hochberg false-discovery control where its dependence assumptions are justified; use Benjamini-Yekutieli when its general-dependence guarantee is the selected conservative alternative.
- Report raw and adjusted p-values, family membership, error-rate target, and decision thresholds.
- Do not treat p-value adjustment as an automatic adjustment of reported confidence intervals. Use compatible simultaneous intervals where available or label intervals as marginal.
- Include multiple conditions and pairwise contrasts in the declared family; do not choose the best candidate first and pretend its comparison was the only planned test.
- Reject an unknown adjustment method or an incoherent family instead of silently using “none.”

Use `statsmodels.stats.multitest.multipletests` with an explicit method. Holm/BH/BY require the complete declared family, not a single-p-value helper. Collect its p-values, adjust once, and map results back to the saved contrast IDs. Never run a family procedure separately on each individual p-value.

## Adaptivity and sequential decisions

Retain both fixed-sample and justified prespecified sequential designs.

- Fixed sample remains the default. Unplanned peeking, task additions, prompt/grader changes, and early stopping are exploratory.
- A sequential specification includes the maximum sample, look times on complete relevant clusters/blocks, statistic, stopping criteria, and error control across looks and contrasts.
- Start with a custom finite-look controller using valid per-look procedures and saved error allocations `alpha[look,hypothesis]` whose sum is at most the overall alpha. This union-bound control does not require independent looks, but it does require valid constituent p-values. Holm within each look with a total across-look allocation is another supported construction. Do not call this efficient group-sequential spending; more efficient spending or always-valid methods need their own supported implementation and calibration.
- Ensure each look's randomization law respects the actual schedule, including globally coupled restrictions. Ordinary fixed-horizon p-values and nominal bootstrap intervals are not automatically anytime-valid.
- Record each look and the reason for stopping. Separate a valid planned stop from interruption, cost exhaustion, or service failure.
- Disclose adaptive development and retain an untouched final task set where the decision requires confirmation. Repeatedly analyzing a reused set does not make it confirmatory.

## Missingness, failures, retries, and sensitivity

Retain every scheduled row and distinguish agent failure, timeout, cancellation, infrastructure invalidation, grader failure, treatment-unverified output, and unresolved execution.

- Apply prespecified scoring to failures where defined. Unknown evidence is not fabricated as a successful or zero-cost observation.
- Never drop condition-dependent failures to form a flattering complete-case sample.
- Reconcile unequal cells and explain departures. An incomplete run may receive descriptive diagnostics and bounds; it does not receive an unconditional complete-confirmation label.
- Keep first attempts, permitted retries, and repaired outputs separately identifiable. Preserve failed parents and link new attempts.
- Implement the selected sensitivity analyses: conservative missing-outcome bounds; infrastructure inclusion/exclusion; first attempt versus production retry policy; repaired versus original outputs; treatment/exposure uncertainty; alternative justified summaries/weights; leave-one-task/family-out concentration; grader disagreement/error bounds; and relevant concurrency/service strata.
- Label unplanned sensitivities as exploratory. Never substitute a favorable sensitivity for the primary analysis.

The current implementation treats global missingness as an eligibility ceiling: `refuse > bound > missing > score`. A metric may be more conservative; its unit-specific score is used only when global and metric mappings both permit scoring. A global refusal can never become a favorable metric score.

Selected `alternative-summary`, `alternative-weighting`, and `repaired-vs-original` methods require saved entries in `analysis.sensitivityScenarios`. Their payloads respectively select `metricId`/`summary`/`quantile`, supply `taskWeights`, or retain attempt/metric `originalValue` and `repairedValue` pairs. Original values must match the retained mapped observations. Missing or unusable required scenarios block completion/adoption, not merely add a favorable-result footnote. Executable metric transformations remain unsupported; a transformed-summary label is not a transformation.

## Reliability and efficiency

Keep these operational questions distinct:

- `pass@1`: first-attempt acceptance under the declared single-attempt policy;
- retry-policy acceptance: acceptance under the exact production retry and budget rules;
- `pass@k`: at least one eligible success under an applicable `k`-attempt policy, with assumptions stated;
- `pass^k` / all-attempt consistency: all required attempts succeed when that is the operational requirement.

Do not conflate repeated benchmark samples with a production retry policy. Where a combinatorial `pass@k` estimator is used, check the eligibility, sample-size, and exchangeability assumptions and its boundary cases.

Analyze latency, tokens, tools, and cost on their declared failure-inclusive populations. Specify timeout/censoring and unavailable-attribution handling; analyzing only successful, cheap runs can reverse the conclusion. Report quality-efficiency tradeoffs directly rather than hiding them in a composite score.

## Hierarchical, Bayesian, and crossed-effects analyses

Retain these as supported, prespecified choices for questions that need them. They do not run by default and must not displace the raw task-paired result.

- Choose a likelihood appropriate to the outcome, such as binary acceptance versus continuous quality or latency.
- Model task effects and relevant condition-by-task variation; include repeated trajectories and crossed grader effects where the data support them.
- State estimand, link/scale, fixed/random effects, priors where applicable, and treatment of failures/missingness.
- Use statsmodels `MixedLM` for its supported frequentist Gaussian mixed/crossed models, and direct PyMC plus ArviZ for the selected Bayesian likelihoods and diagnostics. Do not write a sampler or mixed-model optimizer from scratch.
- For crossed task/grader effects in statsmodels, verify the single-group/variance-component construction and its covariance restrictions. It supports some crossed models, not every correlated crossed random-slope specification.
- Do not fit binary acceptance with Gaussian `MixedLM` merely for convenience. statsmodels' binomial/Poisson mixed-model approximations are Bayesian, not frequentist GLMM estimation. General frequentist binary crossed GLMMs are not supported by the adopted Python stack; report that combination unsupported rather than silently substituting a Bayesian model. The initial model scope is Gaussian frequentist plus outcome-appropriate Bayesian models, not every likelihood/framework combination.
- Transform fitted/posterior predictions into the saved task-weighted outcome contrast. A conditional log-odds coefficient is not a marginal acceptance-rate difference. Preserve output IDs when multiple graders label the same trajectory; grader severity effects do not automatically identify grader accuracy.
- Validate Bayesian prior/posterior predictive behavior, convergence, effective sample size, divergences, and sensitivity to consequential priors.
- Validate frequentist fit convergence, singularity/identifiability, interval construction, residual/model adequacy, and small-cluster limitations.
- Do not claim one grader estimates a grader population, or a few tasks identify a rich interaction structure.
- Include simulation recovery and deliberately weakly identified fixtures. Surface a fit failure or unsupported data design instead of returning plausible-looking estimates.
- Keep posterior probabilities/credible intervals distinct from frequentist p-values/confidence intervals. Apply the saved decision rule to the selected inferential framework.

Only claim a model family as supported when its implementation and diagnostics have mechanical evidence. An `unsupported` placeholder alone does not implement a required model family.

Current model predictions target conditional saved finite-task means/rates. The lifecycle preserves the declared scope, estimand, equal/saved weighting and metric summary. Population, median/quantile and transformed model targets are refused before dispatch rather than replaced with a raw finite-task mean. Gaussian prediction intervals use joint fixed/random covariance conditional on fitted variance components; that plug-in approximation still needs coverage calibration. Every required Bayesian parameter coordinate and the reported contrast must have finite, complete diagnostics; filtering out undefined R-hat, ESS or MCSE is not a passing check. The strict Bernoulli recovery case remains red despite good diagnostics, so A13/full scientific validation is not complete.

## Analysis output

The structured analysis and human report contain:

1. question, scope, sampling/assignment units, estimand, and saved decision rule;
2. all task-condition-repetition outcomes and their status mapping;
3. task summaries, contrasts, aggregate effects, heterogeneity, and material regressions;
4. uncertainty construction, statistical tests, assumptions, and diagnostic results;
5. actual randomizer/inference match, allocation or Monte Carlo details, and exact resolution;
6. multiplicity family and adjustments, plus sequential looks if selected;
7. failures, unresolved records, retries, grading disagreement, and denominator reconciliation;
8. sensitivities, concentration, and limits on transfer to new tasks;
9. separate quality, reliability, latency, usage, and cost findings;
10. adoption/retention/inconclusive/descriptive-only decisions with the rule that produced them;
11. unsupported requested analyses or failed model fits, without concealing available descriptive evidence.

No analysis artifact requires runner source identity, a software attestation, or a cryptographic seal chain.


## Implementation and evidence owners

- `scripts/generate_schedule.py` owns assignment laws, including conditioning and generating-path probabilities.
- `scripts/analyze_paired.py`, `analysis_engine.py`, and `statistical_core.py` own the dataset, estimands, numerical adapters, decision policy, and finite-look controller.
- `scripts/analysis_models.py` owns selected Gaussian frequentist and outcome-appropriate Bayesian models, diagnostics, and posterior persistence.
- [Grading](grading.md) owns calibration, individual labels, blinding, and declared adjudication.
- The [validation reference](validation.md) links commands and independent oracle/simulation checks. Numerical tolerances and simulation budgets belong in those tests before execution, not in favorable post-hoc explanations.
- [Historical research](evidence/external-research.md) and [failure evidence](evidence/session-failure-to-fix.md) retain context. Their removed protection, seal, and software/version policies do not govern current analyses.
