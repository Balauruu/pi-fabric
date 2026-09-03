#!/usr/bin/env python3
"""Deterministic task-paired analysis with exact sign flips and cluster bootstrap."""

from __future__ import annotations

import argparse
from collections import defaultdict
import itertools
import math
from pathlib import Path
import random
import statistics
import sys
from typing import Any, Mapping, Sequence

import benchmark_lib as lib

_MAX_EXACT_TASKS = 20
_ANALYSIS_OPTIONS = frozenset(
    {
        "control", "candidate", "direction", "practical_threshold",
        "noninferiority_margin", "seed", "bootstrap_draws", "confidence_level",
        "alternative", "alpha", "multiplicity", "task_weights", "sample_scope",
        "quality_veto", "integrity_veto", "inferential_gate_frozen",
    }
)


def _number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise lib.InputError(f"{field}: expected a finite number")
    return float(value)


def _quantile(values: Sequence[float], probability: float) -> float:
    if not values:
        raise lib.InputError("cannot calculate a quantile of no values")
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] * (1.0 - fraction) + ordered[upper] * fraction


def prepare_task_pairs(
    records: Sequence[Mapping[str, Any]],
    *,
    control: str,
    candidate: str,
    direction: str = "higher",
) -> list[dict[str, Any]]:
    """Validate equal task/repetition cells and return task-level paired effects."""
    if control == candidate or not control or not candidate:
        raise lib.InputError("control and candidate must be distinct non-empty IDs")
    if direction not in {"higher", "lower"}:
        raise lib.InputError("direction must be 'higher' or 'lower'")
    if not records:
        raise lib.InputError("records must not be empty")

    cells: dict[tuple[str, str, int], float] = {}
    seen_conditions: set[str] = set()
    for index, record in enumerate(records, 1):
        if not isinstance(record, Mapping):
            raise lib.InputError(f"records[{index}]: expected an object")
        task = record.get("task_id")
        condition = record.get("condition_id")
        repetition = record.get("repetition")
        if not isinstance(task, str) or not task:
            raise lib.InputError(f"records[{index}].task_id: expected a non-empty string")
        if not isinstance(condition, str) or not condition:
            raise lib.InputError(f"records[{index}].condition_id: expected a non-empty string")
        if condition not in {control, candidate}:
            raise lib.ContractError((f"records[{index}]: unplanned condition {condition!r}",))
        if isinstance(repetition, bool) or not isinstance(repetition, int) or repetition < 1:
            raise lib.InputError(f"records[{index}].repetition: expected a positive integer")
        outcome_fields = [name for name in ("outcome", "value", "score") if name in record]
        if len(outcome_fields) != 1:
            raise lib.InputError(
                f"records[{index}]: expected exactly one of outcome, value, or score"
            )
        outcome = _number(record[outcome_fields[0]], f"records[{index}].{outcome_fields[0]}")
        key = (task, condition, repetition)
        if key in cells:
            raise lib.ContractError((f"duplicate task-condition-repetition cell {key!r}",))
        cells[key] = outcome
        seen_conditions.add(condition)

    if seen_conditions != {control, candidate}:
        missing = sorted({control, candidate} - seen_conditions)
        raise lib.ContractError((f"missing conditions: {', '.join(missing)}",))

    by_task: dict[str, dict[str, dict[int, float]]] = defaultdict(lambda: defaultdict(dict))
    for (task, condition, repetition), outcome in cells.items():
        by_task[task][condition][repetition] = outcome

    issues: list[str] = []
    result: list[dict[str, Any]] = []
    sign = 1.0 if direction == "higher" else -1.0
    for task in sorted(by_task):
        condition_rows = by_task[task]
        control_repetitions = set(condition_rows.get(control, {}))
        candidate_repetitions = set(condition_rows.get(candidate, {}))
        if control_repetitions != candidate_repetitions or not control_repetitions:
            issues.append(
                f"task {task!r}: unequal repetition cells: control={sorted(control_repetitions)}, "
                f"candidate={sorted(candidate_repetitions)}"
            )
            continue
        repetitions = []
        for repetition in sorted(control_repetitions):
            repetitions.append(
                {
                    "repetition": repetition,
                    "control": condition_rows[control][repetition],
                    "candidate": condition_rows[candidate][repetition],
                }
            )
        control_mean = statistics.fmean(row["control"] for row in repetitions)
        candidate_mean = statistics.fmean(row["candidate"] for row in repetitions)
        result.append(
            {
                "task_id": task,
                "repetitions": repetitions,
                "control_mean": control_mean,
                "candidate_mean": candidate_mean,
                "oriented_effect": sign * (candidate_mean - control_mean),
            }
        )
    if issues:
        raise lib.ContractError(tuple(issues))
    return result


def exact_sign_flip(
    effects: Sequence[float],
    *,
    alternative: str = "two-sided",
    weights: Sequence[float] | None = None,
) -> dict[str, Any]:
    """Enumerate task-level label swaps under the paired sharp null."""
    if alternative not in {"two-sided", "greater", "less"}:
        raise lib.InputError("alternative must be two-sided, greater, or less")
    values = [_number(value, "effects") for value in effects]
    if not values:
        raise lib.InputError("effects must not be empty")
    weight_values = [1.0] * len(values) if weights is None else [_number(value, "weights") for value in weights]
    if len(weight_values) != len(values) or any(value <= 0 for value in weight_values):
        raise lib.InputError("weights must contain one positive value per task")
    weight_sum = sum(weight_values)
    if len(values) > _MAX_EXACT_TASKS:
        raise lib.InputError(
            f"exact sign flip is limited to {_MAX_EXACT_TASKS} task blocks; "
            "use a separately labeled seeded approximation for larger designs"
        )
    observed = sum(weight * value for weight, value in zip(weight_values, values)) / weight_sum
    extreme = 0
    permutations = 1 << len(values)
    tolerance = 1e-15
    for signs in itertools.product((-1.0, 1.0), repeat=len(values)):
        statistic = sum(
            weight * sign * value
            for weight, sign, value in zip(weight_values, signs, values)
        ) / weight_sum
        if alternative == "greater":
            is_extreme = statistic >= observed - tolerance
        elif alternative == "less":
            is_extreme = statistic <= observed + tolerance
        else:
            is_extreme = abs(statistic) >= abs(observed) - tolerance
        extreme += int(is_extreme)
    return {
        "method": "exact-task-sign-flip",
        "sharp_null": "within each task, the complete candidate and control vectors are exchangeable",
        "exchangeability_unit": "task",
        "task_weights": weight_values,
        "alternative": alternative,
        "observed_statistic": observed,
        "permutations": permutations,
        "observed_assignment_included": True,
        "extreme_permutations": extreme,
        "p_value": extreme / permutations,
        "minimum_attainable_p": (2 if alternative == "two-sided" and permutations > 1 else 1) / permutations,
    }


def task_cluster_bootstrap(
    effects: Sequence[float],
    *,
    seed: int,
    draws: int,
    confidence_level: float,
    weights: Sequence[float] | None = None,
) -> dict[str, Any]:
    """Resample complete observed task clusters with replacement."""
    values = [_number(value, "effects") for value in effects]
    if not values:
        raise lib.InputError("effects must not be empty")
    weight_values = [1.0] * len(values) if weights is None else [_number(value, "weights") for value in weights]
    if len(weight_values) != len(values) or any(value <= 0 for value in weight_values):
        raise lib.InputError("weights must contain one positive value per task")
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise lib.InputError("seed must be an integer")
    if isinstance(draws, bool) or not isinstance(draws, int) or draws < 1:
        raise lib.InputError("draws must be a positive integer")
    if not 0.0 < confidence_level < 1.0:
        raise lib.InputError("confidence_level must be between zero and one")
    rng = random.Random(seed)
    count = len(values)
    estimates: list[float] = []
    for _ in range(draws):
        sample = [rng.randrange(count) for _ in range(count)]
        denominator = sum(weight_values[index] for index in sample)
        estimates.append(
            sum(weight_values[index] * values[index] for index in sample) / denominator
        )
    alpha = 1.0 - confidence_level
    return {
        "method": "seeded-task-cluster-percentile-bootstrap",
        "algorithm": "python-random-mt19937-v1",
        "seed": seed,
        "draws": draws,
        "task_count": count,
        "task_weights": weight_values,
        "confidence_level": confidence_level,
        "lower": _quantile(estimates, alpha / 2.0),
        "upper": _quantile(estimates, 1.0 - alpha / 2.0),
        "one_sided_lower": _quantile(estimates, alpha),
        "one_sided_upper": _quantile(estimates, confidence_level),
        "degenerate": min(estimates) == max(estimates),
    }


def _multiplicity(raw_p: float, metadata: Mapping[str, Any] | None) -> dict[str, Any]:
    value = dict(metadata or {})
    method = value.get("method", "none")
    family_id = value.get("family_id", "primary")
    family_size = value.get("family_size", 1)
    hypothesis_index = value.get("hypothesis_index", 1)
    prespecified = value.get("prespecified", True)
    if method not in {"none", "bonferroni"}:
        raise lib.InputError("multiplicity.method must be none or bonferroni")
    if isinstance(family_size, bool) or not isinstance(family_size, int) or family_size < 1:
        raise lib.InputError("multiplicity.family_size must be a positive integer")
    if isinstance(hypothesis_index, bool) or not isinstance(hypothesis_index, int) or not 1 <= hypothesis_index <= family_size:
        raise lib.InputError("multiplicity.hypothesis_index must be within the family")
    if not isinstance(family_id, str) or not family_id or not isinstance(prespecified, bool):
        raise lib.InputError("invalid multiplicity metadata")
    if family_size > 1 and method == "none":
        status = "uncontrolled-fixed-family"
        adjusted = None
    else:
        status = "controlled" if prespecified else "exploratory"
        adjusted = min(1.0, raw_p * family_size) if method == "bonferroni" else raw_p
    return {
        "family_id": family_id,
        "family_size": family_size,
        "hypothesis_index": hypothesis_index,
        "method": method,
        "prespecified": prespecified,
        "raw_p_value": raw_p,
        "adjusted_p_value": adjusted,
        "status": status,
    }


def _inferential_gate(
    effects: Sequence[float],
    *,
    null_boundary: float,
    weights: Sequence[float],
    alpha: float,
    multiplicity: Mapping[str, Any] | None,
    frozen: bool,
    hypothesis: str,
) -> dict[str, Any]:
    """Test an oriented boundary and expose every fail-closed gate component."""
    shifted = [value - null_boundary for value in effects]
    exact = exact_sign_flip(shifted, alternative="greater", weights=weights)
    adjustment = _multiplicity(exact["p_value"], multiplicity)
    reasons: list[str] = []
    if not frozen:
        reasons.append("inferential-gate-not-frozen")
    if not adjustment["prespecified"]:
        reasons.append("hypothesis-family-not-prespecified")
    if adjustment["status"] != "controlled" or adjustment["adjusted_p_value"] is None:
        reasons.append("adjusted-p-value-unavailable")
    if exact["minimum_attainable_p"] > alpha:
        reasons.append("exact-test-resolution-cannot-reach-alpha")
    adjusted = adjustment["adjusted_p_value"]
    if adjusted is not None and adjusted > alpha:
        reasons.append("adjusted-p-value-exceeds-alpha")
    return {
        "hypothesis": hypothesis,
        "frozen": frozen,
        "null_boundary": null_boundary,
        "alternative": "greater",
        "alpha": alpha,
        "exact_test": exact,
        "multiplicity": adjustment,
        "passed": not reasons,
        "blocking_reasons": reasons,
    }


def analyze(
    records: Sequence[Mapping[str, Any]],
    *,
    control: str,
    candidate: str,
    direction: str = "higher",
    practical_threshold: float = 0.0,
    noninferiority_margin: float | None = None,
    seed: int = 1,
    bootstrap_draws: int = 10000,
    confidence_level: float = 0.95,
    alternative: str = "two-sided",
    alpha: float = 0.05,
    multiplicity: Mapping[str, Any] | None = None,
    task_weights: Mapping[str, Any] | None = None,
    sample_scope: str = "observed-task-set",
    quality_veto: bool = False,
    integrity_veto: bool = False,
    inferential_gate_frozen: bool = False,
) -> dict[str, Any]:
    """Analyze two equal task-paired condition cells under frozen parameters."""
    threshold = _number(practical_threshold, "practical_threshold")
    if threshold < 0:
        raise lib.InputError("practical_threshold must be non-negative in oriented units")
    if noninferiority_margin is not None:
        margin = _number(noninferiority_margin, "noninferiority_margin")
        if margin < 0:
            raise lib.InputError("noninferiority_margin must be non-negative")
    else:
        margin = None
    if not 0.0 < alpha < 1.0:
        raise lib.InputError("alpha must be between zero and one")
    if not isinstance(sample_scope, str) or not sample_scope:
        raise lib.InputError("sample_scope must be a non-empty string")
    if not isinstance(quality_veto, bool) or not isinstance(integrity_veto, bool):
        raise lib.InputError("veto fields must be booleans")
    if not isinstance(inferential_gate_frozen, bool):
        raise lib.InputError("inferential_gate_frozen must be a boolean")

    tasks = prepare_task_pairs(records, control=control, candidate=candidate, direction=direction)
    effects = [row["oriented_effect"] for row in tasks]
    if task_weights is None:
        weights = [1.0] * len(tasks)
        weighting = "equal-task"
    else:
        expected = {row["task_id"] for row in tasks}
        if set(task_weights) != expected:
            raise lib.InputError(
                "task_weights must name every observed task exactly; "
                f"expected={sorted(expected)}, observed={sorted(task_weights)}"
            )
        weights = [_number(task_weights[row["task_id"]], f"task_weights[{row['task_id']!r}]") for row in tasks]
        if any(value <= 0 for value in weights):
            raise lib.InputError("task_weights must be positive")
        weighting = "prespecified-task-weights"
    for row, weight in zip(tasks, weights):
        row["weight"] = weight
    effect = sum(weight * value for weight, value in zip(weights, effects)) / sum(weights)
    exact = exact_sign_flip(effects, alternative=alternative, weights=weights)
    bootstrap = task_cluster_bootstrap(
        effects, seed=seed, draws=bootstrap_draws,
        confidence_level=confidence_level, weights=weights,
    )
    multiplicity_result = _multiplicity(exact["p_value"], multiplicity)
    superiority_gate = _inferential_gate(
        effects,
        null_boundary=threshold,
        weights=weights,
        alpha=alpha,
        multiplicity=multiplicity,
        frozen=inferential_gate_frozen,
        hypothesis="oriented effect exceeds the frozen practical threshold",
    )
    noninferiority_gate = None if margin is None else _inferential_gate(
        effects,
        null_boundary=-margin,
        weights=weights,
        alpha=alpha,
        multiplicity=multiplicity,
        frozen=inferential_gate_frozen,
        hypothesis="oriented effect exceeds the frozen noninferiority boundary",
    )

    if bootstrap["lower"] >= threshold:
        practical_state = "meets-with-interval"
    elif effect < threshold:
        practical_state = "does-not-meet-point-threshold"
    else:
        practical_state = "inconclusive"

    noninferiority: dict[str, Any]
    if margin is None:
        noninferiority = {
            "state": "not-prespecified", "margin": None,
            "one_sided_lower": None, "inferential_gate": None,
        }
    else:
        lower = bootstrap["one_sided_lower"]
        if noninferiority_gate["passed"] and lower > -margin:
            state = "non-inferior"
        elif effect <= -margin:
            state = "inferior-at-point-estimate"
        elif lower > -margin:
            state = "descriptive-support-only"
        else:
            state = "inconclusive"
        noninferiority = {
            "state": state,
            "margin": margin,
            "criterion": (
                "frozen adjusted one-sided exact gate passes and descriptive "
                "one-sided lower bootstrap bound > -margin"
            ),
            "one_sided_lower": lower,
            "inferential_gate": noninferiority_gate,
        }

    limits: list[str] = []
    if exact["minimum_attainable_p"] > alpha:
        limits.append("exact-test-resolution-cannot-reach-alpha")
    if len(tasks) == 1:
        limits.append("single-task-screening-only")
    if bootstrap["degenerate"]:
        limits.append("degenerate-cluster-bootstrap")
    if sample_scope != "probability-sample":
        limits.append("bootstrap-describes-only-observed-task-clusters")
    if multiplicity_result["status"] == "uncontrolled-fixed-family":
        limits.append("multiplicity-uncontrolled")
    elif multiplicity_result["status"] != "controlled":
        limits.append("multiplicity-not-confirmatory")
    if not inferential_gate_frozen:
        limits.append("inferential-gate-not-frozen")
    limits = sorted(set(limits))
    label = "screening" if limits else "confirmatory-capable"

    vetoes = {"quality": quality_veto, "integrity": integrity_veto}
    if integrity_veto or quality_veto:
        decision = "blocked-by-veto"
        decision_basis = "a frozen quality or integrity veto blocks promotion"
    elif label != "confirmatory-capable":
        decision = "inconclusive"
        decision_basis = "screening or descriptive evidence cannot make a confirmatory decision"
    elif practical_state == "meets-with-interval" and superiority_gate["passed"]:
        decision = "practical-superiority"
        decision_basis = "practical interval criterion and frozen adjusted inferential gate both pass"
    elif margin is not None and noninferiority["state"] == "non-inferior":
        decision = "non-inferior"
        decision_basis = "noninferiority interval criterion and frozen adjusted inferential gate both pass"
    else:
        decision = "inconclusive"
        decision_basis = "one or more frozen decision criteria did not pass"

    if decision in {"practical-superiority", "non-inferior"} and label != "confirmatory-capable":
        raise lib.ContractError(("decision contradiction: screening evidence cannot be promoted",))

    return {
        "schema_version": 1,
        "estimand": {
            "unit": "task",
            "repetitions_nested_within_task": True,
            "control": control,
            "candidate": candidate,
            "direction": direction,
            "sample_scope": sample_scope,
            "weighting": weighting,
        },
        "counts": {
            "tasks": len(tasks),
            "repetitions_per_task": {
                row["task_id"]: len(row["repetitions"]) for row in tasks
            },
            "records": len(records),
        },
        "task_pairs": tasks,
        "effect": effect,
        "task_effect_range": [min(effects), max(effects)],
        "exact_test": exact,
        "bootstrap": bootstrap,
        "practical_threshold": {
            "value": threshold,
            "state": practical_state,
            "inferential_gate": superiority_gate,
        },
        "noninferiority": noninferiority,
        "multiplicity": multiplicity_result,
        "vetoes": vetoes,
        "decision": decision,
        "decision_basis": decision_basis,
        "sample_label": label,
        "evidence_role": "confirmatory" if label == "confirmatory-capable" else "screening/descriptive",
        "small_sample_limits": limits,
        "claims_limit": (
            "No population claim is supported beyond the declared sampling frame; "
            "the task-cluster bootstrap resamples the observed task clusters."
        ),
    }


def _load_input(path: Path) -> tuple[list[Mapping[str, Any]], dict[str, Any]]:
    value = lib.load_json(path)
    if isinstance(value, list):
        return value, {}
    if not isinstance(value, dict) or not isinstance(value.get("records"), list):
        raise lib.InputError(f"{path}: expected an array or an object with records")
    if value.get("schema_version") != 1:
        raise lib.InputError(f"{path}: schema_version must be 1")
    options = {key: item for key, item in value.items() if key not in {"schema_version", "records"}}
    unknown = sorted(set(options) - _ANALYSIS_OPTIONS)
    if unknown:
        raise lib.InputError(f"{path}: unknown analysis options: {', '.join(unknown)}")
    return value["records"], options


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="JSON records or analysis request")
    parser.add_argument("--control")
    parser.add_argument("--candidate")
    parser.add_argument("--direction", choices=("higher", "lower"))
    parser.add_argument("--practical-threshold", type=float)
    parser.add_argument("--noninferiority-margin", type=float)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--bootstrap-draws", type=int)
    parser.add_argument("--confidence-level", type=float)
    parser.add_argument("--alternative", choices=("two-sided", "greater", "less"))
    parser.add_argument("--alpha", type=float)
    parser.add_argument("--output", type=Path, help="create-only output; defaults to stdout")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        records, options = _load_input(args.input)
        overrides = {
            "control": args.control,
            "candidate": args.candidate,
            "direction": args.direction,
            "practical_threshold": args.practical_threshold,
            "noninferiority_margin": args.noninferiority_margin,
            "seed": args.seed,
            "bootstrap_draws": args.bootstrap_draws,
            "confidence_level": args.confidence_level,
            "alternative": args.alternative,
            "alpha": args.alpha,
        }
        options.update({key: value for key, value in overrides.items() if value is not None})
        if "control" not in options or "candidate" not in options:
            raise lib.InputError("control and candidate are required in the request or CLI")
        result = analyze(records, **options)
        if args.output:
            lib.atomic_create_json(args.output, result, mode=0o644)
        else:
            sys.stdout.buffer.write(lib.canonical_json_bytes(result))
        return lib.EXIT_OK
    except lib.ContractError as exc:
        for issue in exc.issues:
            print(f"error: {issue}", file=sys.stderr)
        return lib.EXIT_INVALID
    except lib.BenchmarkError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return lib.EXIT_INVALID


if __name__ == "__main__":
    raise SystemExit(main())
