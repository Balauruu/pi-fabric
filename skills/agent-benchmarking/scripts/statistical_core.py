"""Numerical primitives for the agent-benchmarking statistical core.

This module is intentionally free of runner and record I/O.  It receives already
validated finite values and makes the resampling unit and approximation visible
in every result.
"""

from __future__ import annotations

from collections import defaultdict
import math
from typing import Any, Mapping, Sequence


def finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field}: expected a finite number")
    result = float(value)
    if not math.isfinite(result):
        raise ValueError(f"{field}: expected a finite number")
    return result


def weighted_mean(values: Sequence[float], weights: Sequence[float]) -> float:
    if not values or len(values) != len(weights):
        raise ValueError("weighted mean needs equally sized non-empty values and weights")
    denominator = math.fsum(weights)
    if not math.isfinite(denominator) or denominator <= 0:
        raise ValueError("weights must have a positive finite sum")
    result = math.fsum(value * weight for value, weight in zip(values, weights)) / denominator
    if not math.isfinite(result):
        raise ValueError("weighted mean is non-finite")
    return result


def summarize(values: Sequence[float], method: str, quantile: float | None) -> float:
    """Apply the saved within-task/condition repetition summary."""
    import numpy as np

    if not values:
        raise ValueError("cannot summarize an empty cell")
    array = np.asarray(values, dtype=float)
    if not bool(np.isfinite(array).all()):
        raise ValueError("summary values must be finite")
    if method == "transformed-mean":
        raise ValueError("transformed-mean requires an executable saved transformation, which is not implemented")
    if method in {"mean", "binary-rate"}:
        result = float(np.mean(array))
    elif method == "median":
        result = float(np.median(array))
    elif method == "quantile":
        if quantile is None or not 0.0 <= quantile <= 1.0:
            raise ValueError("quantile summary requires a probability from zero through one")
        result = float(np.quantile(array, quantile, method="linear"))
    else:
        raise ValueError(f"unsupported summary method {method!r}")
    if not math.isfinite(result):
        raise ValueError("summary result is non-finite")
    return result


def clopper_pearson(successes: int, trials: int, level: float) -> tuple[float, float]:
    """Exact binomial interval, including the zero/all-success boundaries."""
    from scipy.stats import beta

    if trials < 1 or successes < 0 or successes > trials:
        raise ValueError("invalid binomial counts")
    if not 0.0 < level < 1.0:
        raise ValueError("interval level must be between zero and one")
    alpha = 1.0 - level
    lower = 0.0 if successes == 0 else float(beta.ppf(alpha / 2.0, successes, trials - successes + 1))
    upper = 1.0 if successes == trials else float(beta.ppf(1.0 - alpha / 2.0, successes + 1, trials - successes))
    return lower, upper


def adjust_family(
    hypothesis_ids: Sequence[str],
    p_values: Sequence[float],
    *,
    method: str,
    alpha: float,
    family_id: str,
    interval_policy: str,
) -> dict[str, Any]:
    """Adjust one complete, declared p-value family in one statsmodels call."""
    import numpy as np

    if not hypothesis_ids or len(hypothesis_ids) != len(p_values):
        raise ValueError("multiplicity family must contain every hypothesis exactly once")
    if len(set(hypothesis_ids)) != len(hypothesis_ids):
        raise ValueError("multiplicity hypothesis IDs must be unique")
    if method not in {"none", "bonferroni", "holm", "fdr-bh", "fdr-by"}:
        raise ValueError(f"unknown multiplicity method {method!r}")
    if interval_policy not in {"marginal", "simultaneous", "not-reported"}:
        raise ValueError(f"unknown interval policy {interval_policy!r}")
    if not 0.0 < alpha < 1.0:
        raise ValueError("multiplicity alpha must be between zero and one")
    values = np.asarray(p_values, dtype=float)
    if not bool(np.isfinite(values).all()) or bool(((values < 0) | (values > 1)).any()):
        raise ValueError("p-values must be finite probabilities")

    if method == "none":
        adjusted = values.copy()
        rejected = values <= alpha
        correction = "none"
    else:
        from statsmodels.stats.multitest import multipletests

        method_name = {
            "bonferroni": "bonferroni",
            "holm": "holm",
            "fdr-bh": "fdr_bh",
            "fdr-by": "fdr_by",
        }[method]
        rejected, adjusted, _, _ = multipletests(values, alpha=alpha, method=method_name)
        correction = f"statsmodels:{method_name}"

    interval_label = {
        "marginal": "marginal-not-multiplicity-adjusted",
        "simultaneous": "simultaneous-bonferroni",
        "not-reported": "not-reported",
    }[interval_policy]
    rows = [
        {
            "hypothesisId": hypothesis_id,
            "rawPValue": float(raw),
            "adjustedPValue": float(adjusted_value),
            "reject": bool(reject),
        }
        for hypothesis_id, raw, adjusted_value, reject in zip(
            hypothesis_ids, values, adjusted, rejected
        )
    ]
    return {
        "familyId": family_id,
        "method": method,
        "implementation": correction,
        "alpha": alpha,
        "hypothesisIds": list(hypothesis_ids),
        "intervalPolicy": interval_policy,
        "intervalLabel": interval_label,
        "completeFamily": True,
        "status": "controlled" if method != "none" or len(hypothesis_ids) == 1 else "uncontrolled-complete-family",
        "dependenceAssumption": {
            "fdr-bh": "independent or qualifying positive dependence",
            "fdr-by": "general dependence conservative control",
        }.get(method, "family-wise procedure or no adjustment as labeled"),
        "results": rows,
    }


def _bootstrap_quantiles(
    estimates: Any,
    *,
    point: float,
    confidence_level: float,
    method: str,
    jackknife: Sequence[float],
    influences: Sequence[float] | None = None,
) -> tuple[float, float, float, float, dict[str, Any]]:
    import numpy as np
    from scipy.stats import norm

    alpha = 1.0 - confidence_level
    diagnostics: dict[str, Any] = {"bcaBiasCorrection": None, "bcaAcceleration": None}
    if method == "percentile":
        probabilities = (alpha / 2.0, 1.0 - alpha / 2.0, alpha, confidence_level)
    elif method == "bca":
        tied = np.isclose(estimates, point, rtol=0, atol=16 * np.finfo(float).eps * max(1., abs(point)))
        less = float(np.mean((estimates < point) & ~tied))
        equal = float(np.mean(tied))
        proportion = min(max(less + 0.5 * equal, 1.0 / (2.0 * len(estimates))), 1.0 - 1.0 / (2.0 * len(estimates)))
        z0 = float(norm.ppf(proportion))
        jack = np.asarray(jackknife, dtype=float)
        if len(jack) < 3 or not bool(np.isfinite(jack).all()):
            raise ValueError("BCa requires at least three finite cluster jackknife estimates")
        center = float(np.mean(jack))
        deviations = center - jack if influences is None else np.asarray(influences, dtype=float)
        denominator = 6.0 * float(np.sum(deviations * deviations)) ** 1.5
        if denominator == 0.0:
            raise ValueError("BCa acceleration is undefined for a degenerate cluster jackknife")
        acceleration = float(np.sum(deviations ** 3)) / denominator
        diagnostics.update({"bcaBiasCorrection": z0, "bcaAcceleration": acceleration})

        def adjusted(probability: float) -> float:
            z = float(norm.ppf(probability))
            divisor = 1.0 - acceleration * (z0 + z)
            if abs(divisor) < 1e-14:
                raise ValueError("BCa adjusted quantile is numerically singular")
            result = float(norm.cdf(z0 + (z0 + z) / divisor))
            if not math.isfinite(result):
                raise ValueError("BCa adjusted quantile is non-finite")
            return min(max(result, 0.0), 1.0)

        probabilities = tuple(
            adjusted(probability)
            for probability in (alpha / 2.0, 1.0 - alpha / 2.0, alpha, confidence_level)
        )
        diagnostics["adjustedProbabilities"] = list(probabilities)
    else:
        raise ValueError(f"unsupported bootstrap method {method!r}")

    values = tuple(float(np.quantile(estimates, probability, method="linear")) for probability in probabilities)
    if not all(math.isfinite(value) for value in values):
        raise ValueError("bootstrap interval has a non-finite bound")
    return (*values, diagnostics)


def cluster_bootstrap(
    items: Sequence[Mapping[str, Any]],
    *,
    unit: str,
    stratify_by: Sequence[str],
    method: str,
    draws: int,
    confidence_level: float,
    seed: int,
) -> dict[str, Any]:
    """Resample task or family clusters whole, optionally within saved strata.

    Each item has ``taskId``, ``family``, ``effect``, ``weight`` and a ``strata``
    mapping.  Family members are never split.  BCa deletes the same whole
    clusters used by the bootstrap rather than deleting scalar rows.
    """
    import numpy as np

    if method not in {"percentile", "bca"}:
        raise ValueError("bootstrap method must be percentile or bca")
    if unit not in {"task", "family"}:
        raise ValueError("bootstrap unit must be task or family")
    if isinstance(draws, bool) or not isinstance(draws, int) or draws < 1:
        raise ValueError("bootstrap draws must be a positive integer")
    if not 0.0 < confidence_level < 1.0:
        raise ValueError("bootstrap confidence level must be between zero and one")
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ValueError("bootstrap seed must be a non-negative integer")
    if len(set(stratify_by)) != len(stratify_by):
        raise ValueError("bootstrap stratifiers must be unique")
    if not items:
        raise ValueError("bootstrap needs at least one task effect")

    normalized: list[dict[str, Any]] = []
    for index, item in enumerate(items):
        task_id = item.get("taskId")
        family = item.get("family")
        if not isinstance(task_id, str) or not task_id:
            raise ValueError(f"bootstrap item {index} has no task ID")
        if unit == "family" and (not isinstance(family, str) or not family):
            raise ValueError("family bootstrap requires a family ID for every task")
        effect = finite_number(item.get("effect"), f"bootstrap item {index} effect")
        weight = finite_number(item.get("weight"), f"bootstrap item {index} weight")
        if weight <= 0:
            raise ValueError("bootstrap task weights must be positive")
        strata = item.get("strata", {})
        if not isinstance(strata, Mapping):
            raise ValueError("bootstrap strata must be a mapping")
        key_parts = []
        for name in stratify_by:
            if name not in strata or strata[name] is None:
                raise ValueError(f"bootstrap stratifier {name!r} is unavailable for task {task_id!r}")
            key_parts.append((name, str(strata[name])))
        normalized.append(
            {
                "taskId": task_id,
                "cluster": task_id if unit == "task" else str(family),
                "effect": effect,
                "weight": weight,
                "stratum": tuple(key_parts),
            }
        )

    cluster_items: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in normalized:
        cluster_items[item["cluster"]].append(item)
    cluster_strata: dict[str, tuple[tuple[str, str], ...]] = {}
    for cluster, members in cluster_items.items():
        values = {member["stratum"] for member in members}
        if len(values) != 1:
            raise ValueError(f"cluster {cluster!r} crosses declared bootstrap strata")
        cluster_strata[cluster] = next(iter(values))

    clusters_by_stratum: dict[tuple[tuple[str, str], ...], list[str]] = defaultdict(list)
    for cluster, stratum in cluster_strata.items():
        clusters_by_stratum[stratum].append(cluster)
    for clusters in clusters_by_stratum.values():
        clusters.sort()
    cluster_ids = sorted(cluster_items)

    def estimate(selected_clusters: Sequence[str]) -> float:
        selected_items = [item for cluster in selected_clusters for item in cluster_items[cluster]]
        return weighted_mean(
            [item["effect"] for item in selected_items],
            [item["weight"] for item in selected_items],
        )

    point = estimate(cluster_ids)
    rng = np.random.Generator(np.random.PCG64(seed))
    estimates = np.empty(draws, dtype=float)
    for draw in range(draws):
        selected: list[str] = []
        for clusters in clusters_by_stratum.values():
            sampled = rng.integers(0, len(clusters), size=len(clusters))
            selected.extend(clusters[int(index)] for index in sampled)
        estimates[draw] = estimate(selected)
    if not bool(np.isfinite(estimates).all()):
        raise ValueError("bootstrap generated a non-finite statistic")

    jackknife: list[float] = []
    influences: list[float] = []
    jackknife_issue = None
    for clusters in clusters_by_stratum.values():
        n = len(clusters)
        if n < 2:
            jackknife_issue = "cluster deletion empties the sample or a declared stratum"
            break
        deletions = []
        for deleted in clusters:
            # Restore the empirical mass of this stratum after deleting one
            # whole cluster. Other strata keep their original contribution.
            retained = [item for item in normalized if item["cluster"] != deleted]
            weights = [item["weight"] * (n / (n - 1) if item["cluster"] in clusters else 1.) for item in retained]
            deletions.append(weighted_mean([item["effect"] for item in retained], weights))
        jackknife.extend(deletions)
        center = math.fsum(deletions) / n
        # Multisample BCa: U_hi=(n_h-1)(mean_j theta_-hj-theta_-hi),
        # acceleration uses U_hi/n_h. Center within each independent stratum.
        influences.extend((n - 1) * (center - value) / n for value in deletions)

    try:
        if method == "bca" and jackknife_issue is not None:
            raise ValueError(jackknife_issue)
        lower, upper, one_lower, one_upper, diagnostics = _bootstrap_quantiles(
            estimates,
            point=point,
            confidence_level=confidence_level,
            method=method,
            jackknife=jackknife,
            influences=influences,
        )
        available = True
        error = None
    except ValueError as exc:
        if method != "bca":
            raise
        lower = upper = one_lower = one_upper = None
        diagnostics = {"bcaBiasCorrection": None, "bcaAcceleration": None}
        available = False
        error = str(exc)

    unique_estimates = int(len(np.unique(estimates)))
    return {
        "method": method,
        "unit": unit,
        "stratifyBy": list(stratify_by),
        "wholeCluster": True,
        "jackknifeUnit": unit,
        "seed": seed,
        "generator": "numpy-pcg64",
        "draws": draws,
        "confidenceLevel": confidence_level,
        "clusterCount": len(cluster_ids),
        "clusterSizes": {cluster: len(cluster_items[cluster]) for cluster in cluster_ids},
        "stratumClusterCounts": {
            "|".join(f"{name}={value}" for name, value in stratum) or "all": len(clusters)
            for stratum, clusters in sorted(clusters_by_stratum.items())
        },
        "pointEstimate": point,
        "available": available,
        "lower": lower,
        "upper": upper,
        "oneSidedLower": one_lower,
        "oneSidedUpper": one_upper,
        "degenerate": unique_estimates == 1,
        "uniqueBootstrapEstimates": unique_estimates,
        "jackknifeEstimates": len(jackknife),
        "error": error,
        "diagnostics": diagnostics,
    }


def pass_k_probability(successes: int, attempts: int, k: int, *, all_required: bool) -> float:
    """Unbiased finite-sample combinatorial pass-at-k/pass-all-k estimate."""
    if isinstance(successes, bool) or not isinstance(successes, int):
        raise ValueError("successes must be an integer")
    if isinstance(attempts, bool) or not isinstance(attempts, int) or attempts < 1:
        raise ValueError("attempts must be a positive integer")
    if isinstance(k, bool) or not isinstance(k, int) or not 1 <= k <= attempts:
        raise ValueError("k must be between one and the available attempt count")
    if not 0 <= successes <= attempts:
        raise ValueError("successes must be between zero and attempts")
    denominator = math.comb(attempts, k)
    if all_required:
        return math.comb(successes, k) / denominator if successes >= k else 0.0
    failures = attempts - successes
    return 1.0 - (math.comb(failures, k) / denominator if failures >= k else 0.0)


def weighted_t_interval(
    effects: Sequence[float],
    weights: Sequence[float],
    *,
    confidence_level: float,
) -> dict[str, Any]:
    """Task-level weighted t reference with its equal-variance assumptions exposed."""
    from scipy.stats import t

    if len(effects) != len(weights) or len(effects) < 2:
        return {
            "available": False,
            "reason": "at least two task effects are required",
            "assumptions": ["independent sampled task clusters", "approximately Gaussian task effects"],
        }
    theta = weighted_mean(effects, weights)
    sum_w = math.fsum(weights)
    sum_w2 = math.fsum(weight * weight for weight in weights)
    effective_n = sum_w * sum_w / sum_w2
    if effective_n <= 1.0:
        return {"available": False, "reason": "effective task count is at most one", "assumptions": []}
    # Kish-effective-n reference.  This is labeled analytic rather than used as
    # an assignment-randomization claim.
    weighted_variance = math.fsum(
        weight * (effect - theta) ** 2 for effect, weight in zip(effects, weights)
    ) / (sum_w - sum_w2 / sum_w)
    standard_error = math.sqrt(max(0.0, weighted_variance / effective_n))
    degrees = effective_n - 1.0
    alpha = 1.0 - confidence_level
    critical_two = float(t.ppf(1.0 - alpha / 2.0, degrees))
    critical_one = float(t.ppf(confidence_level, degrees))
    return {
        "available": True,
        "method": "weighted-task-t-reference",
        "estimate": theta,
        "effectiveTaskCount": effective_n,
        "degreesOfFreedom": degrees,
        "standardError": standard_error,
        "lower": theta - critical_two * standard_error,
        "upper": theta + critical_two * standard_error,
        "oneSidedLower": theta - critical_one * standard_error,
        "assumptions": [
            "independent sampled task clusters",
            "prespecified fixed weights",
            "approximately Gaussian task effects",
            "the analytic interval is not a sharp-null randomization interval",
        ],
    }
