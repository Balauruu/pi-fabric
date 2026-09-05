# Predeclared Bernoulli multi-dataset calibration

Written before generating any new outcome data or running fits. This is supplementary development calibration. The original Bernoulli recovery assertion and crossed-Gaussian threshold stay unchanged and red; this study cannot retroactively satisfy them.

## Hypotheses and independent evidence

1. An unusual original Bernoulli dataset: the independent exact sampling tail was .04922493, and independent Beta cells also excluded truth. Prediction: misses will not recur systematically across new datasets.
2. Systematic shrinkage/interval error: prediction is repeated signed error or failure-inclusive undercoverage despite usable sampler diagnostics.
3. Sampler/diagnostic failures: prediction is an excessive failed-fit fraction, recorded separately without removing failures from coverage.

The existing independent Gaussian known-variance oracle covered 388/400 versus production 366/400, with no production refits in the oracle computation. Nine subsequent unchanged fits reproduced two variance-boundary rejections and seven nonconvergences. This does not identify a variance-estimation repair or justify changing optimizers/thresholds. See `gaussian-oracle-v1.json` and `scientific-adjudication.md`.

## Frozen design and gates

- Root seed 202609052. Two independent SeedSequence streams, effect .9 and null 0, 400 datasets each. Each dataset has independent data and sampler seeds, all saved in `bernoulli-calibration-v1/protocol.json` before data generation.
- Existing `scientific_rows('bernoulli', ...)` DGP: 20 tasks, 40 trajectories per condition/task, saved normalized weights 1..20, task intercept SD .55 and slope SD .45, centered on a zero finite-task rate difference before applying the effect.
- Existing production Bayesian Bernoulli method, finite-task saved-weight mean/rate contrast. Four NUTS chains, 1500 tuning and 2000 retained draws each; targetAccept .95, maxTreeDepth 10. Existing scientific priors and sensitivity alternatives, explicitly retained. R-hat <=1.01, bulk/tail ESS >=400, relative MCSE <=.05, zero divergences; complete finite coordinate diagnostics required.
- Per-design coverage >= .95 - 3*sqrt(.95*.05/400) = .9173082579; failed-fit fraction <= .025. Failures count as noncoverage.
- Per-design recovery fraction >= the same .9173082579: usable estimate within .07 of truth and interval width < .20. Failures count as nonrecovery.
- Null false-positive fraction <= .0826917421, conservatively counting failed fits as false positives. Effect detection is not labeled a false positive.
- Exact binomial coverage intervals and signed errors among usable fits are descriptive diagnostics, never replacement denominators/gates. No complete verdict before all 800 results exist.

## Execution budget and preservation

Initial execution is the first TWO frozen cases only, effect then null. This verifies real integration at the original strict fitting settings; it is not a calibration verdict. Full study requires 800 total local model fits, zero agent/model-service calls, and substantial CPU time. No automatic full-study launch is authorized by this initial batch.

`tests/bernoulli_calibration.py init DIRECTORY` creates the protocol exclusively without generating outcomes. `run DIRECTORY --max-new-fits 2` consumes only the next unattempted prefix. No seed/case selectors or retries exist. Every attempted case has create-only assignment and complete analysis JSON; assignment without result blocks rather than refits. A bounded continuation changes scheduling only, never total N or acceptance criteria. Do not resume after changing generator/model code or protocol. Posterior arrays are not persisted for this resource-bounded study; complete returned diagnostics/analysis JSON are retained.

`report DIRECTORY` reads retained results. Partial results stay incomplete. Unit tests inject failures, missing diagnostics and a 366-versus-367 coverage boundary to prove the harness can go red without stochastic refits.
