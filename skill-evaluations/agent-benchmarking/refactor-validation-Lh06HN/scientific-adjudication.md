# Independent worker review

Retained from agent `7799eebfa2b14fb6a12aa3a22f4b22d9`. Findings below are the reviewer's reported observations, not an acceptance certificate. No production estimator, seed or criterion was changed in response.

## Bounded adjudication

**A13 and full-framework A07 remain open.** The Bernoulli recovery assertion and crossed-Gaussian calibration remain failed under their unchanged criteria. Neither good diagnostics nor an alternative analysis overrides those failures.

Paths below are relative to `/home/balauru/.pi-profiles/fabric`.

### Ranked findings

#### 1. Bernoulli: evidence favors an unusual dataset, not an identified formula/estimand bug

**Observed:** The production contrast applies the inverse link separately to candidate/control task predictions, subtracts on the outcome scale, then applies normalized saved task weights. That matches this fixture’s finite-task rate-difference target.  
Sources: `skills/agent-benchmarking/scripts/analysis_models.py:1462–1525`; `skills/agent-benchmarking/tests/test_analysis_models.py:923–1003`.

I independently reproduced, without posterior sampling:

- Truth: **0.2058305865**
- Raw weighted difference: **0.1530952381**
- Exact DGP-centered, absolute-deviation sampling tail: **0.04922493**
- Raw sampling error: **−1.9686 sampling SD**
- Analytic independent-cell Beta posterior mean: **0.14580499**

The saved independent Beta interval **[0.095039, 0.196106]** also excludes truth. This is an independent *method*, not an independent dataset; its equal-tailed interval is not directly interchangeable with the hierarchical HDI.

**Inference:** A downward sampling fluctuation explains much of the discrepancy without invoking a production bug. The agreement across methods strengthens that explanation but does not prove hierarchical calibration.

The implication “a correct Bayesian implementation must include truth in this dataset’s 95% credible interval” is overstrong. Credible probability is not guaranteed per-dataset truth containment, nor automatic 95% frequentist coverage for this fixed DGP. **Nevertheless, the frozen assertion remains binding and red.** Passing the `.07` point tolerance does not satisfy it.

#### 2. Gaussian: the frozen end-to-end calibration genuinely fails

I recounted the individual records and verified all **800 saved seeds** against the frozen seed streams.

| Design | Covered | Failed fits | Frozen verdict |
|---|---:|---:|---|
| Correlated task effects | 376/400 = **.940** | 0 | PASS |
| Crossed independent components | 366/400 = **.915** | 9 | FAIL |

The minimum `.9173082579` requires **367 covered datasets**. Being one covered dataset short is still failure. The failure fraction **9/400 = .0225** separately passes the `.025` ceiling.

The crossed result contains **25 noncovering usable intervals plus nine failed fits**. Its conditional coverage, **366/391 = .936061**, is informative diagnostically, not a replacement denominator.

The saved known-variance oracle reaches **388/400 = .970**. Its exact 95% coverage interval includes `.95`; it is neither evidence of universal overcoverage nor an implementable replacement using estimated variances.

**Inference:** Variance estimation, interval approximation, and fitting failures remain relevant. Mean plug-in/oracle SE **.979725** alone cannot identify their respective contributions. Correct conditional covariance algebra does not establish calibrated uncertainty after estimating covariance components.

Sources: `skills/agent-benchmarking/tests/test_model_calibration.py:17–22,109–145`; the named calibration/oracle artifacts under `skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/`.

#### 3. Warning rejection is blanket, but it did not cause these nine failures

**Code observation:** `analysis_models.py:1116–1136` rejects any accumulated warning containing `"singular"` or `"not positive definite"`, without distinguishing transient warnings from final-state evidence.

**Direct reproduction:** Nine unchanged production `MixedLM.fit` calls reproduced all original failure codes.

| Cases, zero-based replicate IDs | Final evidence |
|---|---|
| **6, 40** | Converged, but task-slope variances **1.36e−10** and **1.25e−9**, below frozen **1e−8** tolerance |
| **8, 37, 55, 128, 161, 212, 294** | Still nonconverged; final square-root-parameter score norms **0.152–7.922** |
| **55, 161** specifically | Final observed-information minimum eigenvalues **−9.35**, **−32.14** |

Cases 6 and 40 had positive-definite observed information and marginal outcome covariance. They are **variance-boundary rejections**, not demonstrated literal matrix singularities or stale-warning casualties.

All nine had positive-definite marginal outcome covariance. That alone does not establish optimization convergence or valid interval inference.

In the installed statsmodels path, singular warnings can arise during score evaluations, whereas the Hessian warning examined here is generated at the **final estimate**. Removing blanket warning rejection would not rescue these nine cases under the existing convergence/boundary rules.

#### 4. No ML/REML or interval “repair” is scientifically established yet

ML is not itself a formula bug. The production interval explicitly omits variance-component uncertainty (`analysis_models.py:939–947,1216–1229`). Switching to REML may have a principled variance-estimation rationale, but **REML alone neither integrates that uncertainty nor guarantees coverage**.

Selecting an estimator or interval because it crosses the observed cutoff would be post-hoc optimization of the test result.

### Smallest defensible next actions

1. **Preserve both failed gates and all artifacts.** Supplementary calibration cannot replace the Bernoulli assertion or establish A13 completion under your rule.

2. **Prioritize diagnostic hardening, not relaxed rejection:** retain final convergence, gradients, covariance/boundary measurements, observed-information eigenvalues, and warning provenance on failures. Separate transient-warning handling from final validity checks, with regression evidence. This is not a demonstrated coverage fix.

3. **Predeclare further scientific validation before additional simulations.** For Bernoulli, distinguish fixed-DGP repeated-sampling recovery from prior-generative Bayesian calibration. For Gaussian, select at most one theoretically motivated uncertainty-aware procedure targeting finite-task prediction error, then validate its complete failure-inclusive policy. Keep these inspected datasets as development evidence and use untouched confirmation datasets. No seed replacement, denominator filtering, threshold changes, or estimator shopping.

**Scope:** Nine deterministic production fit calls; no alternative estimators, MCMC, posterior draws, installations, source edits, agent calls, or live benchmarks. Nine inspected source/evidence files were hash-unchanged across the fit probe. Accepted-fit Hessians were not exhaustively audited; the excluded native-profile/live-fixture path was not investigated.
