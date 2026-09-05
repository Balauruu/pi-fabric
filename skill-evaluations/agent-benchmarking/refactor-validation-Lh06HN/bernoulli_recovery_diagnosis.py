"""Independent checks of the retained Bernoulli recovery failure, with no refit."""
import json
from pathlib import Path
import sys
sys.path.insert(0, '/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking/tests')
from test_analysis_models import scientific_rows
import numpy as np
from scipy.optimize import brentq
from scipy.special import expit
from scipy.stats import binom
from scipy.signal import fftconvolve

SEED = 202603
rows, tasks, declared_truth = scientific_rows('bernoulli', .9, SEED)
n = len(tasks); repetitions = 40
weights = np.arange(1, n + 1); normalized = weights / weights.sum()
rng = np.random.default_rng(SEED)
intercepts = rng.normal(0, .55, n); slopes = rng.normal(0, .45, n)
slopes -= normalized @ slopes
shift = brentq(lambda a: float(normalized @ (expit(-.2 + intercepts + slopes + a) - expit(-.2 + intercepts))), -5., 5.)
p0 = expit(-.2 + intercepts); p1 = expit(-.2 + intercepts + slopes + shift + .9)
truth = float(normalized @ (p1 - p0))
assert abs(truth - declared_truth) < 1e-12
counts = {c: np.array([sum(r['outcomes'][0]['value'] for r in rows if r['taskId'] == t and r['conditionId'] == c) for t in tasks]) for c in ['control', 'candidate']}
observed = float(normalized @ (counts['candidate'] - counts['control']) / repetitions)
# Exact independent binomial sampling distribution, convolved on the integer
# lattice. Encode candidate successes + control failures; subtract sum(w)*r.
distribution = np.array([1.])
for weight, a, b in zip(weights, p0, p1):
    for p in [1 - a, b]:
        sparse = np.zeros(repetitions * weight + 1)
        sparse[::weight] = binom.pmf(np.arange(repetitions + 1), repetitions, p)
        distribution = fftconvolve(distribution, sparse)
distribution = np.maximum(distribution, 0); distribution /= distribution.sum()
scale = repetitions * weights.sum()
support = (np.arange(len(distribution)) - scale) / scale
exact_tail = float(distribution[np.abs(support - truth) >= abs(observed - truth) - 1e-12].sum())
# Independent Beta(1,1) cell posterior: no hierarchical optimizer or MCMC.
posterior_rng = np.random.default_rng(202609052)
size = 100000
posterior = np.zeros(size)
for i, weight in enumerate(normalized):
    a = posterior_rng.beta(1 + counts['candidate'][i], 1 + repetitions - counts['candidate'][i], size)
    b = posterior_rng.beta(1 + counts['control'][i], 1 + repetitions - counts['control'][i], size)
    posterior += weight * (a - b)
ci = np.quantile(posterior, [.025, .975])
result = dict(seed=SEED, truth=truth, observedRateDifference=observed,
    exactTwoSidedSamplingTail=exact_tail,
    independentBetaMean=float(normalized @ ((counts['candidate'] + 1) / 42 - (counts['control'] + 1) / 42)),
    independentBeta95Interval=ci.tolist(), independentBetaContainsTruth=bool(ci[0] <= truth <= ci[1]),
    posteriorIndependentDraws=size, posteriorDrawSeed=202609052,
    hierarchyFitRepeated=False, existingRecoveryCriterionChanged=False,
    conclusion='Diagnostic comparison only; it does not turn the retained hierarchical recovery failure into a passing test.')
print(json.dumps(result, allow_nan=False))
