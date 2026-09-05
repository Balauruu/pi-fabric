#!/usr/bin/env python3
"""Prespecified hierarchical model adapters for agent benchmark analyses.

The public :func:`analysis_models` seam uses only JSON-compatible mappings.  This
module deliberately imports no numerical package at module import time.  A
selected frequentist model loads NumPy/SciPy/statsmodels; a selected Bayesian
model loads NumPy/PyMC/ArviZ.  Saved JSON summaries can therefore be inspected
with :func:`inspect_model_report` when model backends are unavailable.

Supported families are deliberately narrow:

* ``gaussian-mixedlm`` uses statsmodels MixedLM.  A task-only model has an
  unstructured group covariance for the requested task intercept/condition
  slopes.  Crossed task/output/grader/family terms use the documented one-group
  independent variance-component construction.
* ``bayesian-gaussian`` and ``bayesian-bernoulli`` use direct PyMC templates
  with task intercepts, task-by-condition variation, optional family and
  grader intercepts, and an automatically included output intercept when the
  same raw output has repeated labels.

The estimand is always reconstructed as a saved-task-weighted candidate minus
control contrast on the outcome scale, conditional on the saved finite tasks.
It is not the population fixed coefficient or a prediction for new tasks.
Gaussian intervals use joint fixed/random-effect prediction-error covariance
with fitted variance components treated as known (plug-in, not exact coverage).
Bayesian contrasts retain posterior task effects and variance uncertainty.
A Bernoulli coefficient on the logit scale is never returned as a rate difference.
Every sampled parameter coordinate and the derived contrast must have complete,
finite diagnostics; MCSE is scaled by each coordinate's own posterior SD.
"""

from __future__ import annotations

from collections import Counter, defaultdict, deque
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
import copy
import importlib
import json
import math
import os
from pathlib import Path
import re
import tempfile
import time
from typing import Any
import warnings

Document = dict[str, Any]

_SUPPORTED_METHODS = {
    "gaussian-mixedlm": "gaussian",
    "bayesian-gaussian": "gaussian",
    "bayesian-bernoulli": "bernoulli",
}
_SUPPORTED_FIXED_EFFECTS = {"intercept", "condition", "conditionId", "condition-id"}
_SUPPORTED_RANDOM_EFFECTS = {
    "task-intercept",
    "task-condition",
    "grader-intercept",
    "family-intercept",
}
_ID_RE = re.compile(r"[^A-Za-z0-9_.-]+")

# These are analysis defaults, not host admission checks.  A saved method can
# override them through its ``priors`` object before outcomes are observed.
_DEFAULT_PRIORS: dict[str, float | int] = {
    "interceptMean": 0.0,
    "interceptScale": 2.5,
    "conditionMean": 0.0,
    "conditionScale": 1.5,
    "taskScale": 1.0,
    "taskConditionScale": 1.0,
    "graderScale": 1.0,
    "familyScale": 1.0,
    "outputScale": 1.0,
    "residualScale": 1.0,
    "targetAccept": 0.9,
    "maxTreeDepth": 10,
    "priorPredictiveDraws": 100,
    "rhatMax": 1.01,
    "essBulkMin": 100.0,
    "essTailMin": 100.0,
    "mcseRelativeMax": 0.1,
    "maxDivergences": 0,
    "varianceTolerance": 1e-8,
    "fitMaxIterations": 1000,
}
_BAYESIAN_PRIOR_KEYS = (set(_DEFAULT_PRIORS) - {"fitMaxIterations", "varianceTolerance"}) | {
    "tune",
    "sensitivity",
    "metricId",
}
_FREQUENTIST_MODEL_KEYS = {"fitMaxIterations", "varianceTolerance", "metricId"}


class _InputError(ValueError):
    """A malformed model request or unsupported data design."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class _Unsupported(ValueError):
    """A deliberately unsupported model/framework combination."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class _BackendUnavailable(RuntimeError):
    """A selected backend could not be imported."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class _Observation:
    observation_id: str
    output_id: str
    task_id: str
    condition_id: str
    value: float
    grader_id: str | None
    family_id: str | None


@dataclass(frozen=True)
class _PreparedData:
    observations: tuple[_Observation, ...]
    metric_id: str
    candidate_id: str
    control_id: str
    conditions: tuple[str, ...]
    tasks: tuple[str, ...]
    task_weights: dict[str, float]
    direction: str
    practical_threshold: float | None
    noninferiority_margin: float | None
    omitted_count: int
    repeated_label_count: int
    output_count: int
    graders: tuple[str, ...]
    families: tuple[str, ...]
    task_family: dict[str, str | None]
    limitations: tuple[str, ...]


@dataclass(frozen=True)
class _BayesianFit:
    idata: Any
    prior: Any
    posterior_predictive: Any
    contrast_draws: Any
    elapsed_seconds: float
    memory: dict[str, int | None]
    priors: dict[str, Any]
    diagnostic_variables: tuple[str, ...]
    model_metadata: dict[str, Any]


def _diagnostic(code: str, message: str, *, severity: str = "info", **fields: Any) -> Document:
    row: Document = {"code": code, "severity": severity, "message": message}
    row.update(fields)
    return row


def _process_memory() -> dict[str, int | None]:
    """Return Linux process resident/high-water memory in KiB when available."""
    values: dict[str, int | None] = {"residentKiB": None, "highWaterKiB": None}
    try:
        with open("/proc/self/status", "r", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("VmRSS:"):
                    values["residentKiB"] = int(line.split()[1])
                elif line.startswith("VmHWM:"):
                    values["highWaterKiB"] = int(line.split()[1])
    except (OSError, ValueError, IndexError):
        pass
    return values


def _memory_measurement(before: Mapping[str, int | None], after: Mapping[str, int | None]) -> dict[str, int | None]:
    baseline = before.get("residentKiB")
    resident = after.get("residentKiB")
    high_water = after.get("highWaterKiB")
    increase = None
    if baseline is not None and high_water is not None:
        increase = max(0, high_water - baseline)
    return {
        "baselineResidentKiB": baseline,
        "finalResidentKiB": resident,
        "maximumResidentKiB": high_water,
        "peakIncreaseFromBaselineKiB": increase,
    }


def _result(
    status: str,
    paired_result: Mapping[str, Any],
    *,
    model: Document | None = None,
    diagnostics: Sequence[Document] = (),
    artifacts: Sequence[Document] = (),
    limitations: Sequence[str] = (),
) -> Document:
    result = {
        "schemaVersion": 1,
        "status": status,
        "pairedResult": copy.deepcopy(dict(paired_result)),
        "model": model,
        "diagnostics": [copy.deepcopy(row) for row in diagnostics],
        "artifacts": [copy.deepcopy(row) for row in artifacts],
        "limitations": list(dict.fromkeys(str(item) for item in limitations)),
    }
    pending: list[Any] = [result]
    while pending:
        value = pending.pop()
        if isinstance(value, Mapping):
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)
        elif isinstance(value, float) and not math.isfinite(value):
            raise _InputError(
                "NONFINITE_MODEL_RESULT",
                "A model backend produced a non-finite JSON value; the result was refused rather than serialized",
            )
    return result


def _import_modules(names: Sequence[str], *, model_backend: bool) -> dict[str, Any]:
    loaded: dict[str, Any] = {}
    for name in names:
        try:
            loaded[name] = importlib.import_module(name)
        except (ImportError, ModuleNotFoundError) as exc:
            requirement = "requirements-models.txt" if model_backend else "requirements.txt"
            code = "MODEL_BACKEND_UNAVAILABLE" if model_backend else "STATISTICAL_BACKEND_UNAVAILABLE"
            raise _BackendUnavailable(
                code,
                f"Selected analysis requires import {name!r}. Install the project-local backend with "
                f".venv/bin/python -m pip install -r {requirement}; no alternative model was selected. "
                f"Original import error: {exc}",
            ) from exc
    return loaded


def _finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise _InputError("INVALID_NUMERIC_VALUE", f"{field} must be a finite number")
    result = float(value)
    if not math.isfinite(result):
        raise _InputError("INVALID_NUMERIC_VALUE", f"{field} must be finite")
    return result


def _positive_number(value: Any, field: str, *, allow_zero: bool = False) -> float:
    result = _finite_number(value, field)
    if result < 0 if allow_zero else result <= 0:
        relation = "non-negative" if allow_zero else "positive"
        raise _InputError("INVALID_MODEL_SETTING", f"{field} must be {relation}")
    return result


def _positive_int(value: Any, field: str, *, allow_zero: bool = False) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise _InputError("INVALID_MODEL_SETTING", f"{field} must be an integer")
    if value < 0 if allow_zero else value <= 0:
        relation = "non-negative" if allow_zero else "positive"
        raise _InputError("INVALID_MODEL_SETTING", f"{field} must be {relation}")
    return value


def _string_id(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise _InputError("INVALID_IDENTIFIER", f"{field} must be a non-empty string")
    return value


def _walk_values(value: Any, key: str) -> list[Any]:
    found: list[Any] = []
    pending: deque[Any] = deque([value])
    seen: set[int] = set()
    while pending:
        current = pending.popleft()
        if isinstance(current, Mapping):
            marker = id(current)
            if marker in seen:
                continue
            seen.add(marker)
            if key in current:
                found.append(current[key])
            pending.extend(current.values())
        elif isinstance(current, list):
            pending.extend(current)
    return found


def _first_saved(paired: Mapping[str, Any], keys: Sequence[str]) -> Any:
    for key in keys:
        values = _walk_values(paired, key)
        for value in values:
            if value is not None:
                return value
    return None


def _unique_saved(paired: Mapping[str, Any], keys: Sequence[str], field: str) -> Any:
    values: list[Any] = []
    for key in keys:
        values.extend(value for value in _walk_values(paired, key) if value is not None)
    unique: list[Any] = []
    for value in values:
        if value not in unique:
            unique.append(value)
    if len(unique) > 1:
        raise _InputError(
            "AMBIGUOUS_SAVED_MODEL_TARGET",
            f"pairedResult contains multiple {field} values {unique!r}; the model target must be selected before fitting",
        )
    return unique[0] if unique else None


def _resolve_metric_id(dataset: Mapping[str, Any], method: Mapping[str, Any], paired: Mapping[str, Any]) -> str:
    priors = method.get("priors")
    selected = priors.get("metricId") if isinstance(priors, Mapping) else None
    if selected is None:
        selected = _unique_saved(paired, ("metricId", "metric_id"), "metricId")
    available: set[str] = set()
    for row in dataset.get("rows", []):
        if not isinstance(row, Mapping):
            continue
        for outcome in row.get("outcomes", []):
            if isinstance(outcome, Mapping) and isinstance(outcome.get("metricId"), str):
                available.add(outcome["metricId"])
        for label in row.get("labels", []):
            if isinstance(label, Mapping):
                for key in ("metricId", "criterionId"):
                    if isinstance(label.get(key), str):
                        available.add(label[key])
    for grade in dataset.get("labels", []):
        if not isinstance(grade, Mapping):
            continue
        nested = grade.get("labels")
        if isinstance(nested, list):
            for label in nested:
                if isinstance(label, Mapping):
                    for key in ("metricId", "criterionId"):
                        if isinstance(label.get(key), str):
                            available.add(label[key])
        else:
            for key in ("metricId", "criterionId"):
                if isinstance(grade.get(key), str):
                    available.add(grade[key])
    if selected is not None:
        selected = _string_id(selected, "pairedResult.metricId")
        if available and selected not in available:
            raise _InputError(
                "METRIC_NOT_FOUND",
                f"Saved metric {selected!r} is absent from model observations {sorted(available)!r}",
            )
        return selected
    if len(available) == 1:
        return next(iter(available))
    if not available:
        return "outcome"
    raise _InputError(
        "AMBIGUOUS_METRIC",
        f"The model dataset contains multiple metrics {sorted(available)!r}; pairedResult must select metricId",
    )


def _context_by_output(dataset: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    contexts: dict[str, Mapping[str, Any]] = {}
    for index, row in enumerate(dataset.get("rows", [])):
        if not isinstance(row, Mapping):
            raise _InputError("INVALID_DATASET_ROW", f"dataset.rows[{index}] must be an object")
        raw = row.get("outputId", row.get("attemptId"))
        if isinstance(raw, str) and raw:
            contexts[raw] = row
    return contexts


def _label_value(label: Mapping[str, Any]) -> Any:
    if "value" in label:
        return label["value"]
    if "score" in label:
        return label["score"]
    raw = label.get("label")
    if raw in (0, 1):
        return raw
    if isinstance(raw, str):
        normalized = raw.strip().lower()
        if normalized in {"pass", "passed", "accept", "accepted", "true", "yes", "positive", "1"}:
            return 1
        if normalized in {"fail", "failed", "reject", "rejected", "false", "no", "negative", "0"}:
            return 0
    return None


def _append_observation(
    target: list[_Observation],
    *,
    source: Mapping[str, Any],
    context: Mapping[str, Any],
    value: Any,
    index: int,
    likelihood: str,
) -> None:
    task_id = source.get("taskId", context.get("taskId"))
    condition_id = source.get("conditionId", context.get("conditionId"))
    output_id = source.get(
        "outputId",
        source.get("attemptId", context.get("outputId", context.get("attemptId"))),
    )
    grader_id = source.get("graderId", context.get("graderId"))
    family_id = source.get("family", source.get("familyId", context.get("family", context.get("familyId"))))
    task_id = _string_id(task_id, f"observation[{index}].taskId")
    condition_id = _string_id(condition_id, f"observation[{index}].conditionId")
    output_id = _string_id(output_id, f"observation[{index}].outputId/attemptId")
    if grader_id is not None:
        grader_id = _string_id(grader_id, f"observation[{index}].graderId")
    if family_id is not None:
        family_id = _string_id(family_id, f"observation[{index}].family")
    numeric = _finite_number(value, f"observation[{index}].value")
    if likelihood == "bernoulli" and numeric not in (0.0, 1.0):
        raise _InputError(
            "INVALID_BERNOULLI_OUTCOME",
            f"Bernoulli observation {index} must be exactly 0 or 1, got {numeric!r}",
        )
    observation_id = source.get("gradeId", source.get("observationId"))
    if not isinstance(observation_id, str) or not observation_id:
        observation_id = f"{output_id}:label-{index:06d}"
    target.append(
        _Observation(
            observation_id=observation_id,
            output_id=output_id,
            task_id=task_id,
            condition_id=condition_id,
            value=numeric,
            grader_id=grader_id,
            family_id=family_id,
        )
    )


def _extract_observations(
    dataset: Mapping[str, Any],
    *,
    metric_id: str,
    likelihood: str,
) -> tuple[tuple[_Observation, ...], int]:
    rows = dataset.get("rows")
    if not isinstance(rows, list):
        raise _InputError("INVALID_DATASET", "dataset.rows must be an array")
    contexts = _context_by_output(dataset)
    observations: list[_Observation] = []
    omitted = 0
    global_labels = dataset.get("labels")

    def matches_metric(label: Mapping[str, Any]) -> bool:
        label_metric = label.get("metricId", label.get("criterionId"))
        return label_metric is None or label_metric == metric_id

    if global_labels is not None:
        if not isinstance(global_labels, list):
            raise _InputError("INVALID_DATASET", "dataset.labels must be an array when present")
        flattened: list[tuple[Mapping[str, Any], Mapping[str, Any]]] = []
        for grade_index, grade in enumerate(global_labels):
            if not isinstance(grade, Mapping):
                raise _InputError("INVALID_GRADE_LABEL", f"dataset.labels[{grade_index}] must be an object")
            output_key = grade.get("outputId", grade.get("attemptId"))
            context = contexts.get(output_key, grade) if isinstance(output_key, str) else grade
            nested = grade.get("labels")
            if isinstance(nested, list):
                for nested_label in nested:
                    if not isinstance(nested_label, Mapping):
                        raise _InputError("INVALID_GRADE_LABEL", "nested grade labels must be objects")
                    merged = dict(grade)
                    merged.pop("labels", None)
                    merged.update(nested_label)
                    flattened.append((merged, context))
            else:
                flattened.append((grade, context))
        for label, context in flattened:
            status = label.get("status", "valid")
            if status not in {"valid", "observed", "succeeded"} or not matches_metric(label):
                omitted += 1
                continue
            value = _label_value(label)
            if value is None:
                omitted += 1
                continue
            _append_observation(
                observations,
                source=label,
                context=context,
                value=value,
                index=len(observations),
                likelihood=likelihood,
            )
    elif any(isinstance(row, Mapping) and isinstance(row.get("labels"), list) for row in rows):
        for row in rows:
            if not isinstance(row, Mapping):
                continue
            for label in row.get("labels", []):
                if not isinstance(label, Mapping):
                    raise _InputError("INVALID_GRADE_LABEL", "row labels must be objects")
                if label.get("status", "valid") not in {"valid", "observed", "succeeded"} or not matches_metric(label):
                    omitted += 1
                    continue
                value = _label_value(label)
                if value is None:
                    omitted += 1
                    continue
                _append_observation(
                    observations,
                    source=label,
                    context=row,
                    value=value,
                    index=len(observations),
                    likelihood=likelihood,
                )
    else:
        for row_index, row in enumerate(rows):
            if not isinstance(row, Mapping):
                continue
            selected: list[Mapping[str, Any]] = []
            outcomes = row.get("outcomes")
            if isinstance(outcomes, list):
                selected = [
                    outcome
                    for outcome in outcomes
                    if isinstance(outcome, Mapping) and outcome.get("metricId") == metric_id
                ]
            elif "value" in row or "score" in row:
                selected = [row]
            for outcome in selected:
                status = outcome.get("status", "observed")
                if status not in {"observed", "valid", "succeeded"}:
                    omitted += 1
                    continue
                value = _label_value(outcome)
                if value is None:
                    omitted += 1
                    continue
                _append_observation(
                    observations,
                    source=outcome,
                    context=row,
                    value=value,
                    index=len(observations),
                    likelihood=likelihood,
                )
    if not observations:
        raise _InputError("NO_MODEL_OBSERVATIONS", f"No observed values were available for metric {metric_id!r}")
    return tuple(observations), omitted


def _resolve_contrast(
    observations: Sequence[_Observation],
    paired: Mapping[str, Any],
) -> tuple[str, str, str, float | None, float | None, tuple[str, ...]]:
    conditions = tuple(dict.fromkeys(obs.condition_id for obs in observations))
    candidate = _unique_saved(
        paired,
        ("candidateConditionId", "candidate_condition_id"),
        "candidateConditionId",
    )
    control = _unique_saved(
        paired,
        ("controlConditionId", "control_condition_id"),
        "controlConditionId",
    )
    limitations: list[str] = []
    if candidate is None and "candidate" in conditions:
        candidate = "candidate"
    if control is None and "control" in conditions:
        control = "control"
    if candidate is None or control is None:
        raise _InputError(
            "AMBIGUOUS_CONTRAST",
            "pairedResult must retain candidateConditionId and controlConditionId unless the literal IDs are 'candidate' and 'control'",
        )
    candidate = _string_id(candidate, "pairedResult.candidateConditionId")
    control = _string_id(control, "pairedResult.controlConditionId")
    if candidate == control or candidate not in conditions or control not in conditions:
        raise _InputError(
            "INVALID_CONTRAST",
            f"Contrast {candidate!r} versus {control!r} is not present in observed conditions {list(conditions)!r}",
        )
    direction = _unique_saved(paired, ("direction", "metricDirection"), "metric direction")
    if direction is None:
        direction = "higher"
        limitations.append("pairedResult omitted metric direction; the literal higher-is-better orientation was used")
    if direction not in {"higher", "lower"}:
        raise _InputError("INVALID_DIRECTION", "Saved metric direction must be 'higher' or 'lower'")
    threshold = _first_saved(paired, ("practicalThreshold", "practical_threshold"))
    margin = _first_saved(paired, ("nonInferiorityMargin", "noninferiorityMargin", "non_inferiority_margin"))
    if threshold is not None:
        threshold = _finite_number(threshold, "pairedResult.practicalThreshold")
    if margin is not None:
        margin = _positive_number(margin, "pairedResult.nonInferiorityMargin", allow_zero=True)
    return candidate, control, direction, threshold, margin, tuple(limitations)


def _resolve_task_weights(
    tasks: Sequence[str],
    paired: Mapping[str, Any],
) -> tuple[dict[str, float], tuple[str, ...]]:
    raw = _first_saved(paired, ("taskWeights", "task_weights"))
    limitations: list[str] = []
    weights: dict[str, float] = {}
    if isinstance(raw, Mapping):
        for task, value in raw.items():
            task_id = _string_id(task, "pairedResult.taskWeights key")
            weights[task_id] = _positive_number(value, f"pairedResult.taskWeights[{task_id!r}]")
    elif isinstance(raw, list):
        for index, row in enumerate(raw):
            if not isinstance(row, Mapping):
                raise _InputError("INVALID_TASK_WEIGHTS", f"taskWeights[{index}] must be an object")
            task_id = _string_id(row.get("taskId"), f"taskWeights[{index}].taskId")
            weights[task_id] = _positive_number(row.get("weight"), f"taskWeights[{index}].weight")
    elif raw is not None:
        raise _InputError("INVALID_TASK_WEIGHTS", "Saved task weights must be an object or array")
    else:
        task_effect_sets = [
            value
            for value in _walk_values(paired, "taskEffects")
            if isinstance(value, list)
            and all(isinstance(row, Mapping) for row in value)
        ]
        if len(task_effect_sets) == 1:
            for index, row in enumerate(task_effect_sets[0]):
                task_id = _string_id(row.get("taskId"), f"taskEffects[{index}].taskId")
                weights[task_id] = _positive_number(row.get("weight"), f"taskEffects[{index}].weight")
        elif len(task_effect_sets) > 1:
            raise _InputError(
                "AMBIGUOUS_TASK_WEIGHTS",
                "pairedResult contains multiple task-effect/weight sets; select the model hypothesis before fitting",
            )
        else:
            weights = {task: 1.0 for task in tasks}
            limitations.append("pairedResult did not expose a task-weight map; equal saved-task weights were used")
    missing = sorted(set(tasks) - set(weights))
    extra = sorted(set(weights) - set(tasks))
    if missing or extra:
        raise _InputError(
            "INCOMPLETE_TASK_WEIGHTS",
            f"Task weights must match modeled tasks exactly; missing={missing!r}, extra={extra!r}",
        )
    total = sum(weights.values())
    return {task: weights[task] / total for task in tasks}, tuple(limitations)


def _connected_components(observations: Sequence[_Observation]) -> list[set[str]]:
    graph: dict[str, set[str]] = defaultdict(set)
    for obs in observations:
        if obs.grader_id is None:
            continue
        output_node = f"output:{obs.output_id}"
        grader_node = f"grader:{obs.grader_id}"
        graph[output_node].add(grader_node)
        graph[grader_node].add(output_node)
    components: list[set[str]] = []
    unseen = set(graph)
    while unseen:
        start = next(iter(unseen))
        component: set[str] = set()
        queue = deque([start])
        while queue:
            node = queue.popleft()
            if node in component:
                continue
            component.add(node)
            unseen.discard(node)
            queue.extend(graph[node] - component)
        components.append(component)
    return components


def _prepare_data(method: Mapping[str, Any], dataset: Mapping[str, Any], paired: Mapping[str, Any]) -> _PreparedData:
    method_name = method.get("method")
    likelihood = method.get("likelihood")
    metric_id = _resolve_metric_id(dataset, method, paired)
    observations, omitted = _extract_observations(dataset, metric_id=metric_id, likelihood=str(likelihood))
    candidate, control, direction, threshold, margin, contrast_limits = _resolve_contrast(observations, paired)
    conditions = tuple(dict.fromkeys([control, candidate] + [obs.condition_id for obs in observations]))
    tasks = tuple(dict.fromkeys(obs.task_id for obs in observations))
    output_counts = Counter(obs.output_id for obs in observations)
    repeated_labels = sum(count - 1 for count in output_counts.values() if count > 1)
    graders = tuple(sorted({obs.grader_id for obs in observations if obs.grader_id is not None}))
    families = tuple(sorted({obs.family_id for obs in observations if obs.family_id is not None}))
    task_mapping: dict[str, set[str | None]] = defaultdict(set)
    output_mapping: dict[str, set[tuple[str, str]]] = defaultdict(set)
    for obs in observations:
        task_mapping[obs.task_id].add(obs.family_id)
        output_mapping[obs.output_id].add((obs.task_id, obs.condition_id))
    bad_outputs = sorted(output for output, mapping in output_mapping.items() if len(mapping) != 1)
    if bad_outputs:
        raise _InputError(
            "OUTPUT_IDENTITY_CONFLICT",
            f"Each raw output must map to one task and condition; conflicting output IDs: {bad_outputs!r}",
        )
    bad_tasks = sorted(task for task, mapping in task_mapping.items() if len(mapping) != 1)
    if bad_tasks:
        raise _InputError(
            "TASK_FAMILY_CONFLICT",
            f"Each task must map to at most one family in this template; conflicting tasks: {bad_tasks!r}",
        )
    task_family = {task: next(iter(mapping)) for task, mapping in task_mapping.items()}
    task_weights, weight_limits = _resolve_task_weights(tasks, paired)

    random_effects = set(method.get("randomEffects", []))
    if "grader-intercept" in random_effects:
        if any(obs.grader_id is None for obs in observations):
            raise _InputError(
                "MISSING_GRADER_ID",
                "grader-intercept requires a graderId on every modeled label",
            )
        if len(graders) < 2:
            raise _InputError(
                "SINGLE_GRADER_NOT_IDENTIFIABLE",
                "One grader cannot identify a grader-population variance; retain this as a single-grader limitation or omit grader-intercept",
            )
        components = _connected_components(observations)
        if len(components) != 1:
            sizes = sorted(len(component) for component in components)
            raise _InputError(
                "DISCONNECTED_GRADER_OUTPUT_DESIGN",
                f"Crossed output/grader effects require one connected label graph; found {len(components)} components with sizes {sizes!r}",
            )
    if "family-intercept" in random_effects:
        if any(obs.family_id is None for obs in observations):
            raise _InputError("MISSING_FAMILY_ID", "family-intercept requires a family on every observation")
        if len(families) < 2:
            raise _InputError(
                "FAMILY_EFFECT_NOT_IDENTIFIABLE",
                "family-intercept requires at least two observed families",
            )
    if "task-condition" in random_effects:
        missing_cells = [
            (task, condition)
            for task in tasks
            for condition in conditions
            if not any(obs.task_id == task and obs.condition_id == condition for obs in observations)
        ]
        if missing_cells:
            raise _InputError(
                "TASK_CONDITION_NOT_IDENTIFIABLE",
                f"Finite-task condition variation requires candidate and control observations for every task; missing {missing_cells!r}",
            )
    limitations = list(contrast_limits + weight_limits)
    if omitted:
        limitations.append(
            f"{omitted} unavailable/non-selected labels were retained in denominator diagnostics but omitted from the observed-data likelihood"
        )
    if repeated_labels:
        limitations.append(
            f"{repeated_labels} repeated labels share raw output IDs and are measurement replication, not independent trajectories or tasks"
        )
    if len(tasks) <= 8 and random_effects & {"task-intercept", "task-condition"}:
        limitations.append(
            f"Only {len(tasks)} task clusters inform task variation; variance and population-transfer claims are weak"
        )
    if len(graders) == 2 and "grader-intercept" in random_effects:
        limitations.append("Only two graders inform grader variance; grader-population inference is weak")
    if method_name == "gaussian-mixedlm":
        if random_effects & {"task-intercept", "task-condition"} and len(tasks) < 3:
            raise _InputError(
                "TOO_FEW_FREQUENTIST_CLUSTERS",
                "Gaussian MixedLM task variation requires at least three task clusters",
            )
        if "grader-intercept" in random_effects and len(graders) < 3:
            raise _InputError(
                "TOO_FEW_FREQUENTIST_GRADERS",
                "Gaussian MixedLM grader variance requires at least three graders",
            )
        if repeated_labels and sum(count >= 2 for count in output_counts.values()) < 3:
            raise _InputError(
                "TOO_FEW_REPLICATED_OUTPUTS",
                "Gaussian output-level variance requires at least three independently produced outputs with repeated labels",
            )
    return _PreparedData(
        observations=observations,
        metric_id=metric_id,
        candidate_id=candidate,
        control_id=control,
        conditions=conditions,
        tasks=tasks,
        task_weights=task_weights,
        direction=direction,
        practical_threshold=threshold,
        noninferiority_margin=margin,
        omitted_count=omitted,
        repeated_label_count=repeated_labels,
        output_count=len(output_counts),
        graders=graders,
        families=families,
        task_family=task_family,
        limitations=tuple(limitations),
    )


def _validate_method(method: Mapping[str, Any]) -> tuple[str, str, tuple[str, ...], tuple[str, ...]]:
    method_name = method.get("method")
    likelihood = method.get("likelihood")
    if method_name not in _SUPPORTED_METHODS:
        raise _Unsupported(
            "UNSUPPORTED_MODEL_METHOD",
            f"Unsupported model method {method_name!r}; supported methods are {sorted(_SUPPORTED_METHODS)!r}",
        )
    if method_name == "gaussian-mixedlm" and likelihood == "bernoulli":
        raise _Unsupported(
            "UNSUPPORTED_FREQUENTIST_BINARY_GLMM",
            "General frequentist binary mixed/crossed GLMM estimation is not supplied by the adopted statsmodels stack. Select the prespecified Bayesian Bernoulli method; Gaussian MixedLM will not be substituted.",
        )
    expected_likelihood = _SUPPORTED_METHODS[method_name]
    if likelihood != expected_likelihood:
        raise _Unsupported(
            "MODEL_LIKELIHOOD_MISMATCH",
            f"Method {method_name!r} requires likelihood {expected_likelihood!r}, not {likelihood!r}",
        )
    fixed_raw = method.get("fixedEffects")
    random_raw = method.get("randomEffects")
    if not isinstance(fixed_raw, list) or not fixed_raw:
        raise _InputError("INVALID_FIXED_EFFECTS", "method.fixedEffects must be a non-empty array")
    if not isinstance(random_raw, list):
        raise _InputError("INVALID_RANDOM_EFFECTS", "method.randomEffects must be an array")
    if len(fixed_raw) != len(set(fixed_raw)) or len(random_raw) != len(set(random_raw)):
        raise _InputError("DUPLICATE_MODEL_TERM", "Fixed and random effect arrays must not contain duplicates")
    unknown_fixed = sorted(set(fixed_raw) - _SUPPORTED_FIXED_EFFECTS)
    unknown_random = sorted(set(random_raw) - _SUPPORTED_RANDOM_EFFECTS)
    if unknown_fixed:
        raise _Unsupported(
            "UNSUPPORTED_FIXED_EFFECT",
            f"This prespecified template supports intercept and condition fixed effects only; unsupported={unknown_fixed!r}",
        )
    if unknown_random:
        raise _Unsupported(
            "UNSUPPORTED_RANDOM_EFFECT",
            f"Unsupported random effects {unknown_random!r}",
        )
    if not any(term in {"condition", "conditionId", "condition-id"} for term in fixed_raw):
        raise _InputError("MISSING_CONDITION_EFFECT", "A condition fixed effect is required for the saved contrast")
    sampler = method.get("sampler")
    draws = method.get("draws")
    chains = method.get("chains")
    interval = _finite_number(method.get("intervalProbability"), "method.intervalProbability")
    if not 0.0 < interval < 1.0:
        raise _InputError("INVALID_INTERVAL_PROBABILITY", "intervalProbability must lie strictly between 0 and 1")
    if method_name == "gaussian-mixedlm":
        if sampler != "not-applicable" or draws != 0 or chains != 0:
            raise _InputError(
                "INVALID_FREQUENTIST_SAMPLER",
                "gaussian-mixedlm requires sampler='not-applicable', draws=0 and chains=0",
            )
    else:
        if sampler not in {"nuts", "metropolis"}:
            raise _InputError("INVALID_BAYESIAN_SAMPLER", "Bayesian methods require explicit sampler 'nuts' or 'metropolis'")
        _positive_int(draws, "method.draws")
        if _positive_int(chains, "method.chains") < 2:
            raise _InputError(
                "INSUFFICIENT_CHAINS",
                "At least two chains are required for rank-normalized split-Rhat diagnostics",
            )
    priors = method.get("priors")
    if not isinstance(priors, Mapping):
        raise _InputError("INVALID_PRIORS", "method.priors must be an object")
    return str(method_name), str(likelihood), tuple(fixed_raw), tuple(random_raw)


def _resolved_priors(method: Mapping[str, Any]) -> dict[str, Any]:
    supplied = method.get("priors", {})
    allowed = _FREQUENTIST_MODEL_KEYS if method.get("method") == "gaussian-mixedlm" else _BAYESIAN_PRIOR_KEYS
    unknown = sorted(set(supplied) - allowed)
    if unknown:
        raise _Unsupported(
            "UNSUPPORTED_PRIOR_SETTING",
            f"Unsupported prior/model diagnostic settings {unknown!r}; no setting is silently ignored",
        )
    result: dict[str, Any] = dict(_DEFAULT_PRIORS)
    result.update(supplied)
    positive = (
        "interceptScale",
        "conditionScale",
        "taskScale",
        "taskConditionScale",
        "graderScale",
        "familyScale",
        "outputScale",
        "residualScale",
        "targetAccept",
        "rhatMax",
        "essBulkMin",
        "essTailMin",
        "mcseRelativeMax",
        "varianceTolerance",
    )
    for key in positive:
        result[key] = _positive_number(result[key], f"method.priors.{key}")
    if not 0.5 < result["targetAccept"] < 1.0:
        raise _InputError("INVALID_TARGET_ACCEPT", "targetAccept must be between 0.5 and 1")
    for key in ("interceptMean", "conditionMean"):
        result[key] = _finite_number(result[key], f"method.priors.{key}")
    for key in (
        "maxTreeDepth",
        "priorPredictiveDraws",
        "maxDivergences",
        "fitMaxIterations",
    ):
        result[key] = _positive_int(result[key], f"method.priors.{key}", allow_zero=key == "maxDivergences")
    if method.get("method") == "gaussian-mixedlm":
        result["tune"] = 0
    else:
        tune = supplied.get("tune", method.get("draws"))
        result["tune"] = _positive_int(tune, "method.priors.tune")
    sensitivity = result.get("sensitivity", [])
    if not isinstance(sensitivity, list):
        raise _InputError("INVALID_PRIOR_SENSITIVITY", "method.priors.sensitivity must be an array")
    result["sensitivity"] = copy.deepcopy(sensitivity)
    return result


def _condition_design(data: _PreparedData, np: Any) -> tuple[Any, tuple[str, ...]]:
    effects = tuple(condition for condition in data.conditions if condition != data.control_id)
    matrix = np.zeros((len(data.observations), len(effects)), dtype=float)
    lookup = {condition: index for index, condition in enumerate(effects)}
    for row_index, obs in enumerate(data.observations):
        if obs.condition_id != data.control_id:
            matrix[row_index, lookup[obs.condition_id]] = 1.0
    return matrix, effects


def _finite_task_gaussian_prediction(model: Any, fit: Any, data: _PreparedData, np: Any) -> tuple[float, float, list[Document], Any]:
    """BLUPs and joint prediction-error covariance at ML variance components.

    Invert Henderson's joint precision for (beta, b), with a flat beta prior
    and b ~ N(0, G). This includes fixed/random cross-covariance, unlike
    adding conditional random-effect variances to cov_params(). Equivalently
    it is the Gaussian posterior covariance conditional on the fitted G, R.
    Variance-component estimation uncertainty is NOT included. This is a
    plug-in model-based prediction interval, not design-based population CI.
    """
    X = np.asarray(model.exog, dtype=float)
    blocks, covariances, keep = [], [], []
    for gi, group in enumerate(model.group_labels):
        indices = model.row_indices[group]
        if model.k_re:
            block = np.zeros((len(X), model.k_re))
            block[indices] = model.exog_re_li[gi]
            blocks.append(block)
            covariances.append(np.asarray(fit.cov_re, dtype=float))
            keep.extend([True] * model.k_re)
        for vi, name in enumerate(model.exog_vc.names):
            local = np.asarray(model.exog_vc.mats[vi][gi], dtype=float)
            block = np.zeros((len(X), local.shape[1])); block[indices] = local
            blocks.append(block)
            covariances.append(np.eye(local.shape[1]) * fit.vcomp[vi])
            # New output effects are mean zero. Graders are standardized at
            # mean zero for Gaussian means; their common offset cancels.
            keep.extend([name == 'task' or name == 'family' or name.startswith('task_condition_')] * local.shape[1])
    Z = np.column_stack(blocks)
    G = np.zeros((Z.shape[1], Z.shape[1]))
    start = 0
    for covariance in covariances:
        end = start + len(covariance)
        G[start:end, start:end] = covariance
        start = end
    try:
        np.linalg.cholesky(G)
        W = np.column_stack([X, Z])
        precision = W.T @ W / float(fit.scale)
        precision[X.shape[1]:, X.shape[1]:] += np.linalg.solve(G, np.eye(len(G)))
        np.linalg.cholesky(precision)
        joint = np.linalg.solve(precision, np.eye(len(precision)))
        coefficients = np.linalg.solve(precision, W.T @ model.endog / float(fit.scale))
    except np.linalg.LinAlgError as exc:
        raise _InputError('MIXEDLM_INVALID_COVARIANCE', 'Joint fixed/random prediction precision is not positive definite') from exc
    effects = [c for c in data.conditions if c != data.control_id]
    sign = 1.0 if data.direction == 'higher' else -1.0
    predictions, contrasts = [], []
    for task in data.tasks:
        vectors = []
        for condition in (data.control_id, data.candidate_id):
            indices = [i for i, obs in enumerate(data.observations) if obs.task_id == task and obs.condition_id == condition]
            if not indices:  # only possible without task slopes, so Z is constant by condition
                indices = [i for i, obs in enumerate(data.observations) if obs.task_id == task]
            x = np.array([1.] + [float(c == condition) for c in effects])
            z = Z[indices].mean(axis=0) * np.asarray(keep)
            vectors.append(np.concatenate([x, z]))
        contrast = sign * (vectors[1] - vectors[0])
        contrasts.append(contrast)
        predictions.append({'taskId': task, 'weight': data.task_weights[task],
                            'control': float(vectors[0] @ coefficients),
                            'candidate': float(vectors[1] @ coefficients),
                            'orientedDifference': float(contrast @ coefficients)})
    L = np.asarray(contrasts)
    weights = np.asarray([data.task_weights[t] for t in data.tasks])
    task_covariance = L @ joint @ L.T
    estimate = float(weights @ L @ coefficients)
    variance = float(weights @ task_covariance @ weights)
    if not np.all(np.isfinite(task_covariance)) or not math.isfinite(estimate) or variance <= 0:
        raise _InputError('MIXEDLM_INVALID_COVARIANCE', 'Finite-task prediction has invalid variance or estimate')
    return estimate, variance, predictions, task_covariance


def _frequentist_fit(method: Mapping[str, Any], data: _PreparedData) -> tuple[Document, list[Document]]:
    modules = _import_modules(
        ("numpy", "pandas", "scipy.stats", "statsmodels.api", "statsmodels.formula.api", "statsmodels.tools.sm_exceptions"),
        model_backend=False,
    )
    np = modules["numpy"]
    pd = modules["pandas"]
    scipy_stats = modules["scipy.stats"]
    sm = modules["statsmodels.api"]
    smf = modules["statsmodels.formula.api"]
    sm_exceptions = modules["statsmodels.tools.sm_exceptions"]
    priors = _resolved_priors(method)
    random_effects = set(method["randomEffects"])
    design, condition_effects = _condition_design(data, np)
    frame_data: dict[str, Any] = {
        "value": [obs.value for obs in data.observations],
        "task": [obs.task_id for obs in data.observations],
        "condition": [obs.condition_id for obs in data.observations],
        "output": [obs.output_id for obs in data.observations],
        "grader": [obs.grader_id or "__none__" for obs in data.observations],
        "family": [obs.family_id or "__none__" for obs in data.observations],
        "all_group": ["all"] * len(data.observations),
    }
    fixed_names: list[str] = ["Intercept"]
    for index, condition in enumerate(condition_effects):
        column = f"condition_{index}"
        frame_data[column] = design[:, index]
        fixed_names.append(column)
    frame = pd.DataFrame(frame_data)
    formula = "value ~ " + " + ".join(fixed_names[1:])
    crossed = bool(random_effects & {"grader-intercept", "family-intercept"}) or data.repeated_label_count > 0
    covariance_family: str
    covariance_restrictions: list[str]
    if not random_effects and not data.repeated_label_count:
        raise _InputError("NO_RANDOM_EFFECT", "gaussian-mixedlm requires at least one random effect")
    if crossed:
        vc_formula: dict[str, str] = {}
        if "task-intercept" in random_effects:
            vc_formula["task"] = "0 + C(task)"
        if "task-condition" in random_effects:
            for index, _condition in enumerate(condition_effects):
                vc_formula[f"task_condition_{index}"] = f"0 + C(task):condition_{index}"
        if "grader-intercept" in random_effects:
            vc_formula["grader"] = "0 + C(grader)"
        if "family-intercept" in random_effects:
            vc_formula["family"] = "0 + C(family)"
        if data.repeated_label_count:
            vc_formula["output"] = "0 + C(output)"
        covariance_family = "independent-crossed-variance-components"
        covariance_restrictions = [
            "All crossed variance components are independent scalar families in a one-group MixedLM construction.",
            "Correlated crossed random slopes and correlated task/output/grader effects are not supported by this construction.",
        ]
        model = smf.mixedlm(
            formula,
            frame,
            groups=frame["all_group"],
            re_formula="0",
            vc_formula=vc_formula,
        )
    elif random_effects <= {"task-intercept", "task-condition"}:
        re_terms: list[str] = []
        if "task-intercept" in random_effects:
            re_terms.append("1")
        if "task-condition" in random_effects:
            re_terms.extend(fixed_names[1:])
        re_formula = ("0 + " if "task-intercept" not in random_effects else "") + " + ".join(re_terms)
        covariance_family = "unstructured-task-group"
        covariance_restrictions = [
            "The task intercept and requested task-condition slopes share one unstructured within-task covariance matrix.",
            "No crossed grader/family/output factor is present in this covariance family.",
        ]
        model = smf.mixedlm(formula, frame, groups=frame["task"], re_formula=re_formula)
    elif random_effects == {"family-intercept"}:
        covariance_family = "random-intercept-family-group"
        covariance_restrictions = ["One Gaussian family random intercept is modeled; no crossed factor is present."]
        model = smf.mixedlm(formula, frame, groups=frame["family"], re_formula="1")
    elif random_effects == {"grader-intercept"}:
        covariance_family = "random-intercept-grader-group"
        covariance_restrictions = ["One Gaussian grader random intercept is modeled; no output replication is present."]
        model = smf.mixedlm(formula, frame, groups=frame["grader"], re_formula="1")
    else:
        raise _Unsupported(
            "UNSUPPORTED_FREQUENTIST_COVARIANCE",
            f"The requested Gaussian covariance combination is not implemented: {sorted(random_effects)!r}",
        )
    caught: list[str] = []
    memory_before = _process_memory()
    started = time.perf_counter()
    try:
        with warnings.catch_warnings(record=True) as warning_rows:
            warnings.simplefilter("always")
            fit = model.fit(
                reml=False,
                method=["lbfgs", "bfgs", "cg"],
                maxiter=int(priors["fitMaxIterations"]),
                full_output=True,
                disp=False,
            )
        caught = [str(row.message) for row in warning_rows]
    except Exception as exc:
        raise _InputError("MIXEDLM_FIT_FAILED", f"statsmodels MixedLM failed: {type(exc).__name__}: {exc}") from exc
    elapsed = time.perf_counter() - started
    fit_memory = _memory_measurement(memory_before, _process_memory())
    if not bool(getattr(fit, "converged", False)):
        raise _InputError("MIXEDLM_NOT_CONVERGED", "statsmodels MixedLM did not report convergence")
    singular_messages = [
        message
        for message in caught
        if "singular" in message.lower() or "not positive definite" in message.lower()
    ]
    boundary_messages = [message for message in caught if "boundary" in message.lower()]
    variances: list[float] = []
    covariance_matrix: list[list[float]] = []
    if getattr(fit, "cov_re", None) is not None:
        covariance_array = np.asarray(fit.cov_re, dtype=float)
        if covariance_array.size:
            covariance_matrix = covariance_array.tolist()
            variances.extend(np.diag(covariance_array).tolist())
    if getattr(fit, "vcomp", None) is not None:
        variances.extend(np.asarray(fit.vcomp, dtype=float).reshape(-1).tolist())
    tolerance = float(priors["varianceTolerance"])
    if singular_messages or not variances or any(not math.isfinite(value) or value <= tolerance for value in variances):
        details = singular_messages or [f"estimated variance at/below tolerance {tolerance:g}: {variances!r}"]
        raise _InputError("MIXEDLM_SINGULAR", "Gaussian mixed model is singular or on a variance boundary: " + "; ".join(details))
    fixed = np.asarray(fit.fe_params, dtype=float)
    estimate, prediction_variance, task_predictions, task_covariance = _finite_task_gaussian_prediction(model, fit, data, np)
    raw_estimate = estimate if data.direction == "higher" else -estimate
    standard_error = math.sqrt(prediction_variance)
    probability = float(method["intervalProbability"])
    alpha = 1.0 - probability
    quantile = float(scipy_stats.norm.ppf(1.0 - alpha / 2.0))
    lower = estimate - quantile * standard_error
    upper = estimate + quantile * standard_error
    z_value = estimate / standard_error if standard_error > 0 else math.copysign(math.inf, estimate)
    p_value = float(2.0 * scipy_stats.norm.sf(abs(z_value)))
    residuals = np.asarray(fit.resid, dtype=float)
    shapiro = None
    if 3 <= residuals.size <= 5000 and float(np.ptp(residuals)) > 0:
        shapiro_result = scipy_stats.shapiro(residuals)
        shapiro = {"statistic": float(shapiro_result.statistic), "pValue": float(shapiro_result.pvalue)}
    diagnostics = [
        _diagnostic(
            "MIXEDLM_CONVERGENCE",
            "statsmodels MixedLM converged with the prespecified optimizer",
            converged=True,
            optimizerSequence=["lbfgs", "bfgs", "cg"],
            reml=False,
            elapsedSeconds=elapsed,
            fitMemory=fit_memory,
            warnings=caught,
            boundaryWarnings=boundary_messages,
        ),
        _diagnostic(
            "MIXEDLM_IDENTIFIABILITY",
            "Random-effect variance estimates exceeded the prespecified boundary tolerance",
            covarianceFamily=covariance_family,
            varianceTolerance=tolerance,
            varianceEstimates=variances,
            covarianceRestrictions=covariance_restrictions,
        ),
        _diagnostic(
            "MIXEDLM_RESIDUAL_ADEQUACY",
            "Residual summary is descriptive; a non-rejection from Shapiro-Wilk is not proof of model adequacy",
            residualMean=float(np.mean(residuals)),
            residualStandardDeviation=float(np.std(residuals, ddof=1)) if residuals.size > 1 else 0.0,
            shapiroWilk=shapiro,
        ),
        _diagnostic(
            "MEASUREMENT_REPLICATION",
            "Observation, raw-output, task, and grader counts remain distinct",
            observationCount=len(data.observations),
            rawOutputCount=data.output_count,
            taskCount=len(data.tasks),
            graderCount=len(data.graders),
            repeatedLabelCount=data.repeated_label_count,
        ),
    ]
    model_result: Document = {
        "id": method.get("id"),
        "method": method["method"],
        "framework": "frequentist",
        "likelihood": "gaussian",
        "formula": formula,
        "fixedEffects": {name: float(value) for name, value in zip(fixed_names, fixed)},
        "randomEffects": list(method["randomEffects"]),
        "covarianceFamily": covariance_family,
        "covarianceRestrictions": covariance_restrictions,
        "randomCovariance": covariance_matrix,
        "residualVariance": float(fit.scale),
        "logLikelihood": float(fit.llf),
        "aic": float(fit.aic),
        "bic": float(fit.bic),
        "outcomeScaleContrast": {
            "metricId": data.metric_id,
            "candidateConditionId": data.candidate_id,
            "controlConditionId": data.control_id,
            "direction": data.direction,
            "estimate": estimate,
            "rawCandidateMinusControl": raw_estimate,
            "standardError": standard_error,
            "interval": [lower, upper],
            "intervalProbability": probability,
            "confidenceProbability": probability,
            "intervalConstruction": "wald-normal-joint-fixed-random-prediction-plugin",
            "target": "saved-finite-task-conditional-mean-difference",
            "uncertaintyTarget": "latent conditional task means, not future realized outcomes or a new-task population",
            "varianceComponentUncertainty": "not included; ML variance components treated as known",
            "taskPredictionCovariance": {"taskIds": list(data.tasks), "matrix": task_covariance.tolist()},
            "pValueInterpretation": "plug-in Gaussian prediction-error Wald reference; not an exact randomization or population-effect test",
            "pValue": p_value,
            "taskWeighting": "saved-normalized",
            "taskPredictions": task_predictions,
        },
        "assumptions": [
            "Gaussian identity-link residual model.",
            "Saved finite tasks are the targets, conditional on fitted task and family effects; new output and common grader offsets are mean zero.",
            "Joint fixed/random-effect prediction-error covariance includes their cross-covariance, conditional on fitted ML variance components. Variance-component estimation uncertainty is omitted; small-cluster coverage is not guaranteed.",
            "No new-task population inference or sampling-frame extrapolation is supplied by this model contrast.",
            "Repeated labels with one output ID are measurement replication and receive an output variance component.",
        ],
    }
    return model_result, diagnostics


def _index(values: Sequence[str]) -> tuple[tuple[str, ...], dict[str, int]]:
    levels = tuple(dict.fromkeys(values))
    return levels, {value: index for index, value in enumerate(levels)}


def _build_bayesian_model(method: Mapping[str, Any], data: _PreparedData, modules: Mapping[str, Any]) -> tuple[Any, dict[str, Any]]:
    np = modules["numpy"]
    pm = modules["pymc"]
    random_effects = set(method["randomEffects"])
    priors = _resolved_priors(method)
    condition_design, condition_effects = _condition_design(data, np)
    tasks, task_lookup = _index([obs.task_id for obs in data.observations])
    outputs, output_lookup = _index([obs.output_id for obs in data.observations])
    graders, grader_lookup = _index([obs.grader_id for obs in data.observations if obs.grader_id is not None])
    families, family_lookup = _index([obs.family_id for obs in data.observations if obs.family_id is not None])
    task_idx = np.asarray([task_lookup[obs.task_id] for obs in data.observations], dtype="int64")
    output_idx = np.asarray([output_lookup[obs.output_id] for obs in data.observations], dtype="int64")
    grader_idx = (
        np.asarray([grader_lookup[obs.grader_id] for obs in data.observations], dtype="int64")
        if graders
        else None
    )
    family_idx = (
        np.asarray([family_lookup[obs.family_id] for obs in data.observations], dtype="int64")
        if families
        else None
    )
    y = np.asarray([obs.value for obs in data.observations], dtype=float)
    include_output = data.repeated_label_count > 0
    coords: dict[str, Any] = {
        "observation": [obs.observation_id for obs in data.observations],
        "task": list(tasks),
        "condition_effect": list(condition_effects),
        "output": list(outputs),
    }
    if graders:
        coords["grader"] = list(graders)
    if families:
        coords["family"] = list(families)
    with pm.Model(coords=coords) as model:
        intercept = pm.Normal(
            "intercept",
            mu=float(priors["interceptMean"]),
            sigma=float(priors["interceptScale"]),
        )
        beta_condition = pm.Normal(
            "beta_condition",
            mu=float(priors["conditionMean"]),
            sigma=float(priors["conditionScale"]),
            dims="condition_effect",
        )
        eta = intercept + pm.math.dot(condition_design, beta_condition)
        diagnostic_variables = ["intercept", "beta_condition"]
        if "task-intercept" in random_effects:
            sigma_task = pm.HalfNormal("sigma_task", sigma=float(priors["taskScale"]))
            z_task = pm.Normal("z_task", 0.0, 1.0, dims="task")
            task_effect = pm.Deterministic("task_effect", z_task * sigma_task, dims="task")
            eta = eta + task_effect[task_idx]
            diagnostic_variables.extend(["sigma_task", "z_task"])
        if "task-condition" in random_effects:
            sigma_task_condition = pm.HalfNormal(
                "sigma_task_condition",
                sigma=float(priors["taskConditionScale"]),
                dims="condition_effect",
            )
            z_task_condition = pm.Normal(
                "z_task_condition",
                0.0,
                1.0,
                dims=("task", "condition_effect"),
            )
            task_condition_effect = pm.Deterministic(
                "task_condition_effect",
                z_task_condition * sigma_task_condition,
                dims=("task", "condition_effect"),
            )
            eta = eta + pm.math.sum(task_condition_effect[task_idx] * condition_design, axis=1)
            diagnostic_variables.extend(["sigma_task_condition", "z_task_condition"])
        if "grader-intercept" in random_effects:
            sigma_grader = pm.HalfNormal("sigma_grader", sigma=float(priors["graderScale"]))
            z_grader = pm.Normal("z_grader", 0.0, 1.0, dims="grader")
            grader_effect = pm.Deterministic("grader_effect", z_grader * sigma_grader, dims="grader")
            eta = eta + grader_effect[grader_idx]
            diagnostic_variables.extend(["sigma_grader", "z_grader"])
        if "family-intercept" in random_effects:
            sigma_family = pm.HalfNormal("sigma_family", sigma=float(priors["familyScale"]))
            z_family = pm.Normal("z_family", 0.0, 1.0, dims="family")
            family_effect = pm.Deterministic("family_effect", z_family * sigma_family, dims="family")
            eta = eta + family_effect[family_idx]
            diagnostic_variables.extend(["sigma_family", "z_family"])
        if include_output:
            sigma_output = pm.HalfNormal("sigma_output", sigma=float(priors["outputScale"]))
            z_output = pm.Normal("z_output", 0.0, 1.0, dims="output")
            output_effect = pm.Deterministic("output_effect", z_output * sigma_output, dims="output")
            eta = eta + output_effect[output_idx]
            diagnostic_variables.extend(["sigma_output", "z_output"])
        if method["likelihood"] == "gaussian":
            sigma_observation = pm.HalfNormal("sigma_observation", sigma=float(priors["residualScale"]))
            pm.Normal("y_obs", mu=eta, sigma=sigma_observation, observed=y, dims="observation")
            diagnostic_variables.append("sigma_observation")
        else:
            probability = pm.Deterministic("acceptance_probability", pm.math.sigmoid(eta), dims="observation")
            pm.Bernoulli("y_obs", p=probability, observed=y.astype("int8"), dims="observation")
    metadata = {
        "conditionEffects": condition_effects,
        "taskLevels": tasks,
        "outputLevels": outputs,
        "graderLevels": graders,
        "familyLevels": families,
        "includeOutputEffect": include_output,
        "taskIndex": task_lookup,
        "graderIndex": grader_lookup,
        "familyIndex": family_lookup,
        "diagnosticVariables": tuple(diagnostic_variables),
        "coords": coords,
    }
    return model, metadata


def _group_dataset(tree: Any, group: str) -> Any:
    """Return an xarray Dataset for ArviZ InferenceData or ArviZ 1.3 DataTree."""
    if hasattr(tree, "children"):
        children = getattr(tree, "children")
        if group not in children:
            raise _InputError("MISSING_POSTERIOR_GROUP", f"Sample result has no {group!r} group")
        node = tree[group]
        return getattr(node, "dataset", node)
    if hasattr(tree, group):
        return getattr(tree, group)
    try:
        node = tree[group]
    except Exception as exc:
        raise _InputError("MISSING_POSTERIOR_GROUP", f"Sample result has no {group!r} group") from exc
    return getattr(node, "dataset", node)


def _dataset_dims(dataset: Any) -> dict[str, int]:
    sizes = getattr(dataset, "sizes", {})
    return {str(key): int(value) for key, value in sizes.items()}


def _sample_bayesian(
    method: Mapping[str, Any],
    data: _PreparedData,
    modules: Mapping[str, Any],
) -> _BayesianFit:
    pm = modules["pymc"]
    priors = _resolved_priors(method)
    model, metadata = _build_bayesian_model(method, data, modules)
    sampler = method["sampler"]
    seed = int(method["seed"])
    draws = int(method["draws"])
    chains = int(method["chains"])
    memory_before = _process_memory()
    with model:
        prior = pm.sample_prior_predictive(
            draws=int(priors["priorPredictiveDraws"]),
            random_seed=seed + 104729,
            return_inferencedata=True,
        )
        if sampler == "nuts":
            step = pm.NUTS(
                target_accept=float(priors["targetAccept"]),
                max_treedepth=int(priors["maxTreeDepth"]),
            )
        else:
            step = pm.Metropolis()
        started = time.perf_counter()
        idata = pm.sample(
            draws=draws,
            tune=int(priors["tune"]),
            chains=chains,
            cores=1,
            blas_cores=1,
            random_seed=seed,
            step=step,
            progressbar=False,
            quiet=True,
            compute_convergence_checks=False,
            discard_tuned_samples=True,
            return_inferencedata=True,
        )
        elapsed = time.perf_counter() - started
        posterior_predictive = pm.sample_posterior_predictive(
            idata,
            var_names=["y_obs"],
            random_seed=seed + 130363,
            progressbar=False,
            return_inferencedata=True,
        )
    fit_memory = _memory_measurement(memory_before, _process_memory())
    posterior = _group_dataset(idata, "posterior")
    dims = _dataset_dims(posterior)
    if dims.get("chain") != chains or dims.get("draw") != draws:
        raise _InputError(
            "CHAIN_DRAW_DIMENSION_MISMATCH",
            f"Posterior dimensions must preserve chain={chains}, draw={draws}; observed={dims!r}",
        )
    contrast_draws = _bayesian_outcome_contrast(
        posterior,
        data=data,
        metadata=metadata,
        likelihood=method["likelihood"],
        np=modules["numpy"],
    )
    return _BayesianFit(
        idata=idata,
        prior=prior,
        posterior_predictive=posterior_predictive,
        contrast_draws=contrast_draws,
        elapsed_seconds=elapsed,
        memory=fit_memory,
        priors=priors,
        diagnostic_variables=metadata["diagnosticVariables"],
        model_metadata=metadata,
    )


def _posterior_array(dataset: Any, name: str, np: Any) -> Any | None:
    variables = getattr(dataset, "data_vars", {})
    if name not in variables:
        return None
    return np.asarray(dataset[name].values)


def _bayesian_outcome_contrast(
    posterior: Any,
    *,
    data: _PreparedData,
    metadata: Mapping[str, Any],
    likelihood: str,
    np: Any,
) -> Any:
    intercept = _posterior_array(posterior, "intercept", np)
    beta = _posterior_array(posterior, "beta_condition", np)
    if intercept is None or beta is None:
        raise _InputError("POSTERIOR_VARIABLE_MISSING", "Posterior lacks intercept or condition coefficients")
    condition_effects = metadata["conditionEffects"]
    candidate_index = condition_effects.index(data.candidate_id)
    task_effect = _posterior_array(posterior, "task_effect", np)
    task_condition = _posterior_array(posterior, "task_condition_effect", np)
    grader_effect = _posterior_array(posterior, "grader_effect", np)
    family_effect = _posterior_array(posterior, "family_effect", np)
    sigma_output = _posterior_array(posterior, "sigma_output", np)
    task_lookup = metadata["taskIndex"]
    family_lookup = metadata["familyIndex"]
    raw = np.zeros_like(intercept, dtype=float)
    # Gauss-Hermite integration gives the expected Bernoulli probability for a
    # newly produced output when an output random effect is present.
    if likelihood == "bernoulli" and sigma_output is not None:
        nodes, gh_weights = np.polynomial.hermite.hermgauss(15)
        gh_weights = gh_weights / math.sqrt(math.pi)
    else:
        nodes = gh_weights = None

    def expected_outcome(eta: Any) -> Any:
        if likelihood == "gaussian":
            return eta
        if grader_effect is None:
            grader_etas = eta[..., None]
        else:
            grader_etas = eta[..., None] + grader_effect
        if sigma_output is None:
            probabilities = 1.0 / (1.0 + np.exp(-grader_etas))
            return np.mean(probabilities, axis=-1)
        expanded = grader_etas[..., None] + math.sqrt(2.0) * sigma_output[..., None, None] * nodes
        probabilities = 1.0 / (1.0 + np.exp(-expanded))
        integrated = np.sum(probabilities * gh_weights, axis=-1)
        return np.mean(integrated, axis=-1)

    for task in data.tasks:
        task_index = task_lookup[task]
        base = intercept.copy()
        if task_effect is not None:
            base = base + task_effect[..., task_index]
        if family_effect is not None:
            family_id = data.task_family[task]
            base = base + family_effect[..., family_lookup[family_id]]
        control_eta = base
        candidate_eta = base + beta[..., candidate_index]
        if task_condition is not None:
            candidate_eta = candidate_eta + task_condition[..., task_index, candidate_index]
        difference = expected_outcome(candidate_eta) - expected_outcome(control_eta)
        raw = raw + data.task_weights[task] * difference
    if data.direction == "lower":
        raw = -raw
    if not np.all(np.isfinite(raw)):
        raise _InputError("NONFINITE_POSTERIOR_CONTRAST", "Posterior outcome-scale contrast contains non-finite values")
    return raw


def _predictive_summary(tree: Any, group: str, observed_mean: float, np: Any) -> Document:
    dataset = _group_dataset(tree, group)
    values = np.asarray(dataset["y_obs"].values, dtype=float)
    sample_means = values.mean(axis=-1) if values.ndim >= 3 else values
    return {
        "group": group,
        "drawCount": int(math.prod(values.shape[:2])) if values.ndim >= 2 else int(values.shape[0]),
        "predictiveMean": float(np.mean(values)),
        "predictiveStandardDeviation": float(np.std(values)),
        "predictiveMinimum": float(np.min(values)),
        "predictiveMaximum": float(np.max(values)),
        "observedMean": observed_mean,
        "meanDiscrepancyTailProbability": float(np.mean(np.abs(sample_means - np.mean(sample_means)) >= abs(observed_mean - np.mean(sample_means)))),
        "allFinite": bool(np.all(np.isfinite(values))),
    }


def _arviz_diagnostics(
    fit: _BayesianFit,
    method: Mapping[str, Any],
    data: _PreparedData,
    modules: Mapping[str, Any],
) -> tuple[list[Document], bool]:
    np = modules["numpy"]
    az = modules["arviz"]
    var_names = list(fit.diagnostic_variables)
    posterior = _group_dataset(fit.idata, "posterior")
    missing = set(var_names) - set(posterior.data_vars)
    if missing:
        raise _InputError('POSTERIOR_VARIABLE_MISSING', f'Required diagnostic variables absent: {sorted(missing)}')
    # Diagnose the actual reported estimand as well as every sampled parameter.
    posterior = posterior[var_names].assign(outcome_scale_contrast=(("chain", "draw"), fit.contrast_draws))
    var_names.append('outcome_scale_contrast')
    summaries = {
        'rhat': az.rhat(posterior, var_names=var_names, method='rank'),
        'bulk': az.ess(posterior, var_names=var_names, method='bulk'),
        'tail': az.ess(posterior, var_names=var_names, method='tail'),
        'mcse': az.mcse(posterior, var_names=var_names, method='mean'),
    }
    coordinates: list[Document] = []
    for name in var_names:
        variable = posterior[name]
        dims = tuple(d for d in variable.dims if d not in ('chain', 'draw'))
        shape = tuple(variable.sizes[d] for d in dims)
        arrays = {}
        for key, summary in summaries.items():
            if name not in summary.data_vars:
                arrays[key] = None
                continue
            item = summary[name]
            # Coordinate alignment must be complete, not merely the right size.
            aligned = set(item.dims) == set(dims) and all(
                item.sizes[d] == variable.sizes[d] and np.array_equal(item[d].values, variable[d].values)
                for d in dims)
            arrays[key] = np.asarray(item.transpose(*dims).values) if aligned else None
        samples = np.asarray(variable.transpose('chain', 'draw', *dims).values)
        for index in np.ndindex(shape):
            row = {'variable': name, 'coordinates': {d: str(variable[d].values[i]) for d, i in zip(dims, index)}}
            values = samples[(slice(None), slice(None)) + index]
            scale = float(np.std(values, ddof=1))
            for key, array in arrays.items():
                value = float(array[index]) if array is not None else math.nan
                row[key] = value if math.isfinite(value) else None
            row['posteriorStandardDeviation'] = scale if math.isfinite(scale) else None
            relative = row['mcse'] / scale if row['mcse'] is not None and math.isfinite(scale) and scale > 0 else math.nan
            row['relativeMcse'] = relative if math.isfinite(relative) else None
            row['samplesFinite'] = bool(np.all(np.isfinite(values)))
            coordinates.append(row)

    def extreme(key: str, operation: Any) -> float | None:
        values = [row[key] for row in coordinates]
        # Undefined/missing ANY coordinate invalidates the whole summary.
        return float(operation(values)) if values and all(v is not None and math.isfinite(v) for v in values) else None

    worst_rhat = extreme('rhat', max)
    minimum_bulk = extreme('bulk', min)
    minimum_tail = extreme('tail', min)
    maximum_mcse = extreme('mcse', max)
    relative_mcse = extreme('relativeMcse', max)
    sample_stats = _group_dataset(fit.idata, "sample_stats")
    divergences = None
    if "diverging" in getattr(sample_stats, "data_vars", {}):
        values = np.asarray(sample_stats['diverging'].transpose('chain', 'draw').values)
        if values.shape == (int(method['chains']), int(method['draws'])) and np.all(np.isin(values, [0, 1])):
            divergences = int(values.sum())
    limits = fit.priors
    pass_rhat = worst_rhat is not None and worst_rhat <= float(limits["rhatMax"])
    pass_bulk = minimum_bulk is not None and minimum_bulk >= float(limits["essBulkMin"])
    pass_tail = minimum_tail is not None and minimum_tail >= float(limits["essTailMin"])
    pass_mcse = relative_mcse is not None and relative_mcse <= float(limits["mcseRelativeMax"]) and all(row['mcse'] is not None and row['mcse'] >= 0 for row in coordinates)
    pass_divergence = (method['sampler'] != 'nuts' and divergences is None) or (divergences is not None and divergences <= int(limits["maxDivergences"]))
    diagnostics_ok = pass_rhat and pass_bulk and pass_tail and pass_mcse and pass_divergence and all(row['samplesFinite'] for row in coordinates)
    observed_mean = sum(obs.value for obs in data.observations) / len(data.observations)
    prior_predictive = _predictive_summary(fit.prior, "prior_predictive", observed_mean, np)
    posterior_predictive = _predictive_summary(fit.posterior_predictive, "posterior_predictive", observed_mean, np)
    diagnostics_ok = diagnostics_ok and prior_predictive['allFinite'] and posterior_predictive['allFinite']
    rows = [
        _diagnostic('PARAMETER_COORDINATE_DIAGNOSTICS',
                    'Every sampled parameter coordinate and the reported outcome contrast; undefined values are null and block inference',
                    coordinates=coordinates),
        _diagnostic(
            "BAYESIAN_SAMPLING",
            "PyMC used the explicitly selected sampler and fixed saved budget",
            sampler=method["sampler"],
            draws=int(method["draws"]),
            tune=int(fit.priors["tune"]),
            chains=int(method["chains"]),
            cores=1,
            blasCores=1,
            elapsedSeconds=fit.elapsed_seconds,
            fitMemory=fit.memory,
        ),
        _diagnostic(
            "RANK_NORMALIZED_SPLIT_RHAT",
            "ArviZ rank-normalized split-chain Rhat",
            severity="info" if pass_rhat else "error",
            maximum=worst_rhat,
            threshold=float(limits["rhatMax"]),
            passed=pass_rhat,
        ),
        _diagnostic(
            "EFFECTIVE_SAMPLE_SIZE",
            "ArviZ bulk and tail effective sample sizes",
            severity="info" if pass_bulk and pass_tail else "error",
            minimumBulk=minimum_bulk,
            minimumTail=minimum_tail,
            bulkThreshold=float(limits["essBulkMin"]),
            tailThreshold=float(limits["essTailMin"]),
            passed=pass_bulk and pass_tail,
        ),
        _diagnostic(
            "MONTE_CARLO_STANDARD_ERROR",
            "ArviZ posterior-mean MCSE divided by each parameter/contrast coordinate's own posterior standard deviation",
            severity="info" if pass_mcse else "error",
            maximum=maximum_mcse,
            relativeMaximum=relative_mcse,
            relativeThreshold=float(limits["mcseRelativeMax"]),
            passed=pass_mcse,
        ),
        _diagnostic(
            "DIVERGENCES",
            "NUTS divergences are counted from sample_stats; Metropolis has no divergence diagnostic",
            severity="info" if pass_divergence else "error",
            count=divergences,
            threshold=int(limits["maxDivergences"]),
            passed=pass_divergence,
        ),
        _diagnostic(
            "PRIOR_PREDICTIVE",
            "Prior predictive behavior from direct PyMC sampling",
            severity="info" if prior_predictive["allFinite"] else "error",
            **prior_predictive,
        ),
        _diagnostic(
            "POSTERIOR_PREDICTIVE",
            "Posterior predictive behavior from direct PyMC sampling",
            severity="info" if posterior_predictive["allFinite"] else "error",
            **posterior_predictive,
        ),
        _diagnostic(
            "MEASUREMENT_REPLICATION",
            "Observation, raw-output, task, and grader counts remain distinct",
            observationCount=len(data.observations),
            rawOutputCount=data.output_count,
            taskCount=len(data.tasks),
            graderCount=len(data.graders),
            repeatedLabelCount=data.repeated_label_count,
        ),
    ]
    return rows, diagnostics_ok


def _normal_log_density(values: Any, mean: float, scale: float, np: Any) -> Any:
    return -0.5 * ((values - mean) / scale) ** 2 - math.log(scale) - 0.5 * math.log(2.0 * math.pi)


def _prior_sensitivity(
    fit: _BayesianFit,
    modules: Mapping[str, Any],
) -> list[Document]:
    np = modules["numpy"]
    posterior = _group_dataset(fit.idata, "posterior")
    intercept = _posterior_array(posterior, "intercept", np)
    beta = _posterior_array(posterior, "beta_condition", np)
    if intercept is None or beta is None:
        return []
    rows: list[Document] = []
    base = fit.priors
    supported = {"id", "interceptMean", "interceptScale", "conditionMean", "conditionScale"}
    for index, scenario in enumerate(base.get("sensitivity", [])):
        if not isinstance(scenario, Mapping):
            raise _InputError("INVALID_PRIOR_SENSITIVITY", f"sensitivity[{index}] must be an object")
        unknown = sorted(set(scenario) - supported)
        if unknown:
            raise _Unsupported(
                "UNSUPPORTED_PRIOR_SENSITIVITY",
                f"Importance-reweighted prior sensitivity supports {sorted(supported)!r}; unsupported={unknown!r}",
            )
        scenario_id = _string_id(scenario.get("id"), f"sensitivity[{index}].id")
        alt_intercept_mean = _finite_number(scenario.get("interceptMean", base["interceptMean"]), f"sensitivity[{index}].interceptMean")
        alt_intercept_scale = _positive_number(scenario.get("interceptScale", base["interceptScale"]), f"sensitivity[{index}].interceptScale")
        alt_condition_mean = _finite_number(scenario.get("conditionMean", base["conditionMean"]), f"sensitivity[{index}].conditionMean")
        alt_condition_scale = _positive_number(scenario.get("conditionScale", base["conditionScale"]), f"sensitivity[{index}].conditionScale")
        log_ratio = (
            _normal_log_density(intercept, alt_intercept_mean, alt_intercept_scale, np)
            - _normal_log_density(intercept, float(base["interceptMean"]), float(base["interceptScale"]), np)
            + np.sum(
                _normal_log_density(beta, alt_condition_mean, alt_condition_scale, np)
                - _normal_log_density(beta, float(base["conditionMean"]), float(base["conditionScale"]), np),
                axis=-1,
            )
        )
        flat_log = log_ratio.reshape(-1)
        flat_log = flat_log - float(np.max(flat_log))
        weights = np.exp(flat_log)
        weights = weights / np.sum(weights)
        flat_contrast = np.asarray(fit.contrast_draws).reshape(-1)
        effective = float(1.0 / np.sum(weights**2))
        estimate = float(np.sum(weights * flat_contrast))
        rows.append(
            {
                "id": scenario_id,
                "method": "posterior-importance-reweighting",
                "outcomeScaleContrastMean": estimate,
                "importanceEffectiveSampleSize": effective,
                "posteriorDrawCount": int(flat_contrast.size),
                "stable": effective >= max(20.0, 0.1 * flat_contrast.size),
                "changedPriors": {
                    "interceptMean": alt_intercept_mean,
                    "interceptScale": alt_intercept_scale,
                    "conditionMean": alt_condition_mean,
                    "conditionScale": alt_condition_scale,
                },
            }
        )
    return rows


def _hdi(values: Any, probability: float, az: Any, np: Any) -> list[float]:
    interval = np.asarray(az.hdi(np.asarray(values).reshape(-1), prob=probability, method="nearest"), dtype=float).reshape(-1)
    if interval.size != 2 or not np.all(np.isfinite(interval)):
        raise _InputError("INVALID_CREDIBLE_INTERVAL", "ArviZ returned a non-finite credible interval")
    return [float(interval[0]), float(interval[1])]


def _artifact_payloads(fit: _BayesianFit, data: _PreparedData, modules: Mapping[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    np = modules["numpy"]
    arrays: dict[str, Any] = {}
    dimensions: dict[str, list[str]] = {}
    groups = (
        ("posterior", fit.idata, "posterior"),
        ("sample_stats", fit.idata, "sample_stats"),
        ("prior_predictive", fit.prior, "prior_predictive"),
        ("posterior_predictive", fit.posterior_predictive, "posterior_predictive"),
    )
    coordinate_values: dict[str, list[Any]] = {}
    for prefix, tree, group in groups:
        dataset = _group_dataset(tree, group)
        for coordinate, values in getattr(dataset, "coords", {}).items():
            raw = np.asarray(values.values).tolist()
            if isinstance(raw, list):
                coordinate_values.setdefault(str(coordinate), raw)
        for variable in getattr(dataset, "data_vars", {}):
            key = f"{prefix}__{variable}"
            arrays[key] = np.asarray(dataset[variable].values)
            dimensions[key] = [str(item) for item in dataset[variable].dims]
    arrays["derived__outcome_scale_contrast"] = np.asarray(fit.contrast_draws)
    dimensions["derived__outcome_scale_contrast"] = ["chain", "draw"]
    metadata = {
        "schemaVersion": 1,
        "format": "numpy-npz-with-json-coordinates",
        "sampleDimensions": {
            "chain": int(fit.contrast_draws.shape[0]),
            "draw": int(fit.contrast_draws.shape[1]),
        },
        "dimensions": dimensions,
        "coordinates": coordinate_values,
        "contrast": {
            "metricId": data.metric_id,
            "candidateConditionId": data.candidate_id,
            "controlConditionId": data.control_id,
            "direction": data.direction,
        },
        "notes": [
            "Arrays preserve chain and draw as separate leading dimensions.",
            "Repeated grader labels retain raw output coordinates and are not recoded as tasks or trajectories.",
        ],
    }
    return arrays, metadata


def _artifact_paths(request: Mapping[str, Any], method: Mapping[str, Any]) -> tuple[Path, Path] | None:
    artifact_directory = request.get("artifactDirectory")
    if artifact_directory is None:
        return None
    if not isinstance(artifact_directory, str) or not os.path.isabs(artifact_directory):
        raise _InputError("INVALID_ARTIFACT_DIRECTORY", "artifactDirectory must be an absolute local path")
    destination = Path(artifact_directory)
    method_id = _ID_RE.sub("-", str(method.get("id", "model"))).strip("-") or "model"
    return (
        destination / f"{method_id}-posterior.npz",
        destination / f"{method_id}-coordinates.json",
    )


def _preflight_artifact_destination(request: Mapping[str, Any], method: Mapping[str, Any]) -> None:
    paths = _artifact_paths(request, method)
    if paths is None:
        return
    for path in paths:
        if path.exists():
            raise _InputError(
                "MODEL_ARTIFACT_EXISTS",
                f"Refusing to overwrite existing model artifact {path}; reuse the saved report instead of rerunning an unchanged stochastic fit",
            )


def _create_artifacts(
    request: Mapping[str, Any],
    method: Mapping[str, Any],
    fit: _BayesianFit,
    data: _PreparedData,
    modules: Mapping[str, Any],
) -> tuple[list[Document], list[str]]:
    paths = _artifact_paths(request, method)
    if paths is None:
        return [], [
            "No artifactDirectory was supplied to the internal model seam; posterior arrays were not embedded in the JSON result. The lifecycle must supply a run-local directory to persist them."
        ]
    arrays_path, metadata_path = paths
    np = modules["numpy"]
    destination = arrays_path.parent
    destination.mkdir(parents=True, exist_ok=True)
    method_id = _ID_RE.sub("-", str(method.get("id", "model"))).strip("-") or "model"
    for path in (arrays_path, metadata_path):
        if path.exists():
            raise _InputError(
                "MODEL_ARTIFACT_EXISTS",
                f"Refusing to overwrite existing model artifact {path}; reuse the saved report instead of rerunning an unchanged stochastic fit",
            )
    arrays, metadata = _artifact_payloads(fit, data, modules)
    temporary_arrays: Path | None = None
    temporary_metadata: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination, prefix=f".{method_id}-", suffix=".npz", delete=False) as handle:
            temporary_arrays = Path(handle.name)
            np.savez_compressed(handle, **arrays)
            handle.flush()
            os.fsync(handle.fileno())
        with tempfile.NamedTemporaryFile(dir=destination, prefix=f".{method_id}-", suffix=".json", mode="w", encoding="utf-8", delete=False) as handle:
            temporary_metadata = Path(handle.name)
            json.dump(metadata, handle, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.link(temporary_arrays, arrays_path)
        os.link(temporary_metadata, metadata_path)
    except FileExistsError as exc:
        raise _InputError("MODEL_ARTIFACT_EXISTS", f"Refusing to overwrite model artifacts for {method_id!r}") from exc
    except OSError as exc:
        raise _InputError("MODEL_ARTIFACT_WRITE_FAILED", f"Could not publish model artifacts: {exc}") from exc
    finally:
        if temporary_arrays is not None:
            temporary_arrays.unlink(missing_ok=True)
        if temporary_metadata is not None:
            temporary_metadata.unlink(missing_ok=True)
    return [
        {
            "id": f"{method_id}-posterior-arrays",
            "kind": "posterior-arrays",
            "format": "npz",
            "path": str(arrays_path),
            "bytes": arrays_path.stat().st_size,
            "contains": sorted(arrays),
        },
        {
            "id": f"{method_id}-coordinate-metadata",
            "kind": "coordinate-metadata",
            "format": "json",
            "path": str(metadata_path),
            "bytes": metadata_path.stat().st_size,
        },
    ], []


def _bayesian_fit(method: Mapping[str, Any], data: _PreparedData, request: Mapping[str, Any]) -> tuple[Document, list[Document], list[Document], list[str], bool]:
    _preflight_artifact_destination(request, method)
    modules = _import_modules(("numpy", "pymc", "arviz"), model_backend=True)
    np = modules["numpy"]
    az = modules["arviz"]
    try:
        fit = _sample_bayesian(method, data, modules)
    except (_InputError, _Unsupported):
        raise
    except Exception as exc:
        raise _InputError("PYMC_FIT_FAILED", f"PyMC sampling failed: {type(exc).__name__}: {exc}") from exc
    diagnostics, diagnostics_ok = _arviz_diagnostics(fit, method, data, modules)
    sensitivity = _prior_sensitivity(fit, modules)
    posterior = np.asarray(fit.contrast_draws, dtype=float)
    flat = posterior.reshape(-1)
    probability = float(method["intervalProbability"])
    interval = _hdi(flat, probability, az, np)
    estimate = float(np.mean(flat))
    median = float(np.median(flat))
    probability_improvement = float(np.mean(flat > 0.0))
    threshold_probability = (
        float(np.mean(flat > data.practical_threshold)) if data.practical_threshold is not None else None
    )
    noninferiority_probability = (
        float(np.mean(flat > -data.noninferiority_margin)) if data.noninferiority_margin is not None else None
    )
    posterior_ds = _group_dataset(fit.idata, "posterior")
    beta = _posterior_array(posterior_ds, "beta_condition", np)
    condition_effects = fit.model_metadata["conditionEffects"]
    candidate_index = condition_effects.index(data.candidate_id)
    log_link_draws = beta[..., candidate_index]
    task_draw_summaries: list[Document] = []
    task_condition = _posterior_array(posterior_ds, "task_condition_effect", np)
    for task in data.tasks:
        task_effect = log_link_draws
        if task_condition is not None:
            task_index = fit.model_metadata["taskIndex"][task]
            task_effect = task_effect + task_condition[..., task_index, candidate_index]
        task_draw_summaries.append(
            {
                "taskId": task,
                "weight": data.task_weights[task],
                "conditionalLinkScaleDifferenceMean": float(np.mean(task_effect)),
            }
        )
    artifacts, artifact_limits = _create_artifacts(request, method, fit, data, modules)
    assumptions = [
        "Direct PyMC non-centered independent random-effect templates with saved priors.",
        "The reported contrast averages saved task weights and observed grader severities; output heterogeneity is integrated for Bernoulli predictions.",
        "Raw output IDs, not repeated labels, define produced trajectories; labels sharing an output ID are measurement replication.",
        "Grader severity is not grader accuracy, and one connected label graph does not by itself validate a grader-population claim.",
    ]
    model_result: Document = {
        "id": method.get("id"),
        "method": method["method"],
        "framework": "bayesian",
        "likelihood": method["likelihood"],
        "link": "identity" if method["likelihood"] == "gaussian" else "logit",
        "fixedEffects": list(method["fixedEffects"]),
        "randomEffects": list(method["randomEffects"]),
        "automaticOutputIntercept": bool(fit.model_metadata["includeOutputEffect"]),
        "priors": {key: value for key, value in fit.priors.items() if key != "sensitivity"},
        "sampler": {
            "name": method["sampler"],
            "draws": int(method["draws"]),
            "tune": int(fit.priors["tune"]),
            "chains": int(method["chains"]),
            "cores": 1,
        },
        "outcomeScaleContrast": {
            "metricId": data.metric_id,
            "candidateConditionId": data.candidate_id,
            "controlConditionId": data.control_id,
            "direction": data.direction,
            "estimate": estimate,
            "median": median,
            "interval": interval,
            "intervalProbability": probability,
            "credibleProbability": probability,
            "intervalConstruction": "arviz-highest-density-nearest",
            "target": "saved-finite-task-conditional-mean-difference",
            "uncertaintyTarget": "posterior conditional saved-task means; not a new-task population",
            "posteriorProbabilityImprovement": probability_improvement,
            "posteriorProbabilityAbovePracticalThreshold": threshold_probability,
            "posteriorProbabilityNonInferior": noninferiority_probability,
            "taskWeighting": "saved-normalized",
            "taskLinkScaleDiagnostics": task_draw_summaries,
        },
        "linkScaleConditionCoefficient": {
            "mean": float(np.mean(log_link_draws)),
            "note": "Diagnostic only; for Bernoulli data this log-odds coefficient is not the reported rate difference.",
        },
        "priorSensitivity": sensitivity,
        "inferenceUsable": diagnostics_ok,
        "assumptions": assumptions,
    }
    limitations = list(artifact_limits)
    if not diagnostics_ok:
        limitations.append(
            "One or more prespecified convergence/Monte Carlo diagnostic thresholds failed; the posterior summary is retained for diagnosis but is not decision-usable"
        )
    return model_result, diagnostics, artifacts, limitations, diagnostics_ok


def model_target_issue(paired: Mapping[str, Any]) -> Document | None:
    """Check the selected estimand without importing a numerical backend.

    The lifecycle uses this same check before assigning scored work. Older
    standalone helper requests without metadata retain their documented finite
    saved-task mean target; explicit unsupported targets are never substituted.
    """
    scope = _unique_saved(paired, ('scope',), 'scope')
    summary = _unique_saved(paired, ('metricSummary',), 'metricSummary')
    estimand = _unique_saved(paired, ('estimand',), 'estimand')
    if scope not in (None, 'finite-task-set'):
        return {'code': 'UNSUPPORTED_MODEL_TARGET_SCOPE', 'message':
                f'Model predictions target conditional saved finite tasks, not scope {scope!r}; task-population prediction is not implemented'}
    if summary not in (None, 'mean', 'binary-rate'):
        return {'code': 'UNSUPPORTED_MODEL_TARGET_SUMMARY', 'message':
                f'Model predictions estimate outcome-scale means, not summary {summary!r}; no metric transformation or quantile model is implemented'}
    if estimand not in (None, 'task-weighted-mean-difference', 'task-weighted-rate-difference'):
        return {'code': 'UNSUPPORTED_MODEL_TARGET_ESTIMAND', 'message':
                f'Model target {estimand!r} is not implemented; raw mean predictions cannot substitute for a transformed estimand'}
    weighting = _unique_saved(paired, ('taskWeighting',), 'taskWeighting')
    weights = _unique_saved(paired, ('taskWeights',), 'taskWeights')
    if weighting == 'equal' and isinstance(weights, Mapping) and len(set(weights.values())) > 1:
        return {'code': 'UNSUPPORTED_MODEL_TARGET_WEIGHTING', 'message':
                'Equal task weighting conflicts with the supplied nonuniform model task weights'}
    return None


def analysis_models(request: Mapping[str, Any]) -> Document:
    """Fit one selected, prespecified model without mutating ``request``.

    Required request members follow the shared refactor contract:
    ``schemaVersion``, ``method``, ``dataset`` and ``pairedResult``.  The
    optional internal ``artifactDirectory`` is an absolute run-local directory
    used to publish separate NPZ posterior arrays and JSON coordinate metadata.
    Without it a fit may be inspected in memory, but no posterior arrays are
    embedded into the JSON return.
    """
    paired: Mapping[str, Any] = {}
    diagnostics: list[Document] = []
    try:
        if not isinstance(request, Mapping):
            raise _InputError("INVALID_REQUEST", "analysis_models request must be an object")
        if request.get("schemaVersion") != 1:
            raise _InputError("UNSUPPORTED_SCHEMA_VERSION", "analysis_models requires schemaVersion 1")
        unknown = sorted(set(request) - {"schemaVersion", "method", "dataset", "pairedResult", "artifactDirectory"})
        if unknown:
            raise _InputError("UNKNOWN_REQUEST_FIELD", f"Unknown analysis_models request fields: {unknown!r}")
        method = request.get("method")
        dataset = request.get("dataset")
        paired_value = request.get("pairedResult")
        if not isinstance(method, Mapping):
            raise _InputError("INVALID_METHOD", "request.method must be an object")
        if not isinstance(dataset, Mapping) or dataset.get("schemaVersion") != 1:
            raise _InputError("INVALID_DATASET", "request.dataset must be a schemaVersion 1 object")
        if not isinstance(paired_value, Mapping):
            raise _InputError("INVALID_PAIRED_RESULT", "request.pairedResult must be an object")
        paired = paired_value
        issue = model_target_issue(paired)
        if issue is not None:
            raise _Unsupported(issue['code'], issue['message'])
        method_name, _likelihood, _fixed, _random = _validate_method(method)
        _resolved_priors(method)
        data = _prepare_data(method, dataset, paired)
        limitations = list(data.limitations)
        if method_name == "gaussian-mixedlm":
            model, model_diagnostics = _frequentist_fit(method, data)
            diagnostics.extend(model_diagnostics)
            return _result(
                "complete",
                paired,
                model=model,
                diagnostics=diagnostics,
                limitations=limitations,
            )
        model, model_diagnostics, artifacts, model_limits, diagnostics_ok = _bayesian_fit(method, data, request)
        diagnostics.extend(model_diagnostics)
        limitations.extend(model_limits)
        return _result(
            "complete" if diagnostics_ok else "failed",
            paired,
            model=model,
            diagnostics=diagnostics,
            artifacts=artifacts,
            limitations=limitations,
        )
    except _Unsupported as exc:
        diagnostics.append(_diagnostic(exc.code, str(exc), severity="error"))
        return _result("unsupported", paired, diagnostics=diagnostics, limitations=[str(exc)])
    except _BackendUnavailable as exc:
        diagnostics.append(_diagnostic(exc.code, str(exc), severity="error"))
        return _result("unsupported", paired, diagnostics=diagnostics, limitations=[str(exc)])
    except _InputError as exc:
        diagnostics.append(_diagnostic(exc.code, str(exc), severity="error"))
        return _result("failed", paired, diagnostics=diagnostics, limitations=[str(exc)])
    except Exception as exc:  # Defensive typed failure at the JSON seam.
        message = f"Unexpected model analysis failure: {type(exc).__name__}: {exc}"
        diagnostics.append(_diagnostic("UNEXPECTED_MODEL_FAILURE", message, severity="error"))
        return _result("failed", paired, diagnostics=diagnostics, limitations=[message])


def inspect_model_report(path: str | os.PathLike[str]) -> Document:
    """Read an already-saved model JSON document with the standard library.

    This adapter intentionally does not import NumPy, statsmodels, PyMC or
    ArviZ.  It is suitable for report-only inspection when optional model
    backends are absent.  Non-standard JSON constants are rejected.
    """
    report_path = Path(path)

    def reject_constant(value: str) -> None:
        raise ValueError(f"non-finite JSON constant {value!r} is not allowed")

    with report_path.open("r", encoding="utf-8") as handle:
        value = json.load(handle, parse_constant=reject_constant)
    if not isinstance(value, dict):
        raise ValueError("saved model report must contain a JSON object")
    return value


__all__ = ["analysis_models", "inspect_model_report", "model_target_issue"]
