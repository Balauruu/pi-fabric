#!/usr/bin/env python3
"""File-authoritative lifecycle mechanics for the refactored benchmark runner.

This module deliberately contains no model launcher and imports no numerical or
model backend.  ``run.py`` supplies a dispatch callable locally; the fixed
Fabric guest uses the internal admission/publication bridge at the bottom of
that file.  Attempt assignments, results, and terminals are create-only.
"""

from __future__ import annotations

import copy
import importlib
import json
import math
import os
import re
import secrets
import shutil
import signal
import subprocess
import threading
import time
from collections.abc import Callable, Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import benchmark_lib as lib

Document = dict[str, Any]
Dispatch = Callable[[Document], Document]

ROOT = Path(__file__).resolve().parents[1]
SPEC_SCHEMA_PATH = ROOT / "schemas" / "spec.schema.json"
PUBLIC_RESULT_SCHEMA_PATH = ROOT / "schemas" / "result.schema.json"
HARD_INVOCATION_CALL_CEILING = 100
FIXED_GUEST_SETTING_FIELDS = frozenset(
    {
        "cwd",
        "extensions",
        "hardDescendantCallLimit",
        "persona",
        "recursive",
        "schema",
        "thinking",
        "timeoutMs",
        "transport",
        "worktree",
    }
)
STATUS_VALUES = (
    "agent-failure",
    "timeout",
    "cancelled",
    "infrastructure-failure",
    "evaluator-failure",
    "treatment-unverified",
    "unresolved",
)
FAILURE_TERMINALS = frozenset(
    {
        "agent-failure",
        "timeout",
        "cancelled",
        "infrastructure-failure",
        "evaluator-failure",
        "treatment-unverified",
    }
)
DISPATCH_TO_TERMINAL = {
    "failed": "agent-failure",
    "timeout": "timeout",
    "cancelled": "cancelled",
    "infrastructure-failure": "infrastructure-failure",
}
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")


class LifecycleError(Exception):
    """A typed public lifecycle failure."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        status: str = "failed",
        phase: str = "initialize",
        work_id: str | None = None,
        limitations: Sequence[str] = (),
    ) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.phase = phase
        self.work_id = work_id
        self.limitations = list(limitations)
        super().__init__(message)


@dataclass(frozen=True)
class MaterializedSpec:
    source: Document
    resolved: Document
    inputs: dict[str, bytes]


@dataclass
class Inspection:
    planned_ids: list[str]
    pending_ids: list[str]
    recoverable_ids: list[str]
    ambiguous_ids: list[str]
    errors: list[Document]
    assignments: dict[str, Document]
    results: dict[str, Document]
    terminals: dict[str, Document]
    retry_rows: dict[str, Document]

    @property
    def counts(self) -> Document:
        assigned = len(self.assignments)
        terminal = len(self.terminals)
        failed = sum(
            1 for value in self.terminals.values() if value.get("status") in FAILURE_TERMINALS
        )
        return {
            "planned": len(self.planned_ids),
            "assigned": assigned,
            "terminal": terminal,
            "failed": failed,
            "unresolved": len(self.ambiguous_ids) + len(self.errors),
            "pending": len(self.pending_ids),
        }


@dataclass(frozen=True)
class InvocationBudget:
    limit: int
    remaining_global: int


@dataclass(frozen=True)
class RunContext:
    run_dir: Path
    spec: Document
    schedule: Document


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _copy_document(value: Mapping[str, Any]) -> Document:
    try:
        copied = copy.deepcopy(dict(value))
        lib.canonical_json_bytes(copied)
    except Exception as exc:
        raise LifecycleError("INVALID_REQUEST", f"request is not finite JSON: {exc}") from None
    return copied


def _absolute_request_path(value: Any, field: str, *, must_exist: bool) -> Path:
    if not isinstance(value, str) or not value:
        raise LifecycleError("INVALID_REQUEST", f"{field} must be a non-empty string")
    candidate = Path(value)
    if not candidate.is_absolute() or os.path.normpath(value) != value:
        raise LifecycleError("INVALID_REQUEST", f"{field} must be a canonical absolute path")
    try:
        checked = lib.assert_no_symlink_components(
            candidate,
            field=field,
            require_parent=not must_exist,
        )
    except lib.BenchmarkError as exc:
        raise LifecycleError("INVALID_REQUEST", str(exc)) from None
    if must_exist:
        if not checked.is_file():
            raise LifecycleError("INVALID_REQUEST", f"{field} is not a regular file: {checked}")
        try:
            canonical = checked.resolve(strict=True)
        except OSError as exc:
            raise LifecycleError("INVALID_REQUEST", f"{field} cannot be resolved: {exc}") from None
        if os.fspath(canonical) != value:
            raise LifecycleError("INVALID_REQUEST", f"{field} must use its canonical absolute path")
    return checked


def validate_run_request(request: Mapping[str, Any]) -> tuple[Document, Path, Path]:
    value = _copy_document(request)
    if set(value) != {"specPath", "outputDirectory"}:
        unknown = sorted(set(value) - {"specPath", "outputDirectory"})
        missing = sorted({"specPath", "outputDirectory"} - set(value))
        details = []
        if missing:
            details.append(f"missing {missing}")
        if unknown:
            details.append(f"unknown {unknown}")
        raise LifecycleError("INVALID_REQUEST", "run request keys are invalid: " + ", ".join(details))
    spec_path = _absolute_request_path(value["specPath"], "specPath", must_exist=True)
    output = _absolute_request_path(value["outputDirectory"], "outputDirectory", must_exist=False)
    return value, spec_path, output


def validate_report_request(request: Mapping[str, Any]) -> tuple[Document, Path, str]:
    value = _copy_document(request)
    if set(value) != {"outputDirectory", "format"}:
        unknown = sorted(set(value) - {"outputDirectory", "format"})
        missing = sorted({"outputDirectory", "format"} - set(value))
        details = []
        if missing:
            details.append(f"missing {missing}")
        if unknown:
            details.append(f"unknown {unknown}")
        raise LifecycleError("INVALID_REQUEST", "report request keys are invalid: " + ", ".join(details), phase="inspect")
    output = _absolute_request_path(value["outputDirectory"], "outputDirectory", must_exist=False)
    if value["format"] not in {"json", "markdown"}:
        raise LifecycleError("INVALID_REQUEST", "format must be 'json' or 'markdown'", phase="inspect")
    return value, output, value["format"]


def _schema_validate(document: Any, schema_path: Path, source: str) -> None:
    try:
        schema = lib.load_json(schema_path)
        issues = lib.validate_json_schema(document, schema)
    except lib.BenchmarkError as exc:
        raise LifecycleError("INVALID_SCHEMA", str(exc)) from None
    if issues:
        raise LifecycleError(
            "INVALID_SPEC" if schema_path == SPEC_SCHEMA_PATH else "INVALID_RESULT",
            "; ".join(f"{source}: {issue}" for issue in issues),
        )


def _unique_ids(items: Any, label: str, issues: list[str]) -> dict[str, Document]:
    found: dict[str, Document] = {}
    if not isinstance(items, list):
        return found
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        item_id = item.get("id")
        if not isinstance(item_id, str):
            continue
        if item_id in found:
            issues.append(f"{label} id {item_id!r} is duplicated")
        else:
            found[item_id] = item
    return found


def _validate_status_map(actions: Any, label: str, issues: list[str]) -> None:
    if not isinstance(actions, list):
        return
    statuses = [item.get("status") for item in actions if isinstance(item, dict)]
    if sorted(statuses) != sorted(STATUS_VALUES):
        issues.append(f"{label} must contain each terminal non-success status exactly once")
    for item in actions:
        if not isinstance(item, dict):
            continue
        action = item.get("action")
        value = item.get("value")
        if action == "score" and not isinstance(value, (int, float)):
            issues.append(f"{label} score actions require a numeric value")
        if action != "score" and value is not None:
            issues.append(f"{label} non-score actions require null value")


def validate_spec_semantics(spec: Document) -> None:
    issues: list[str] = []
    tasks = _unique_ids(spec.get("tasks"), "task", issues)
    conditions = _unique_ids(spec.get("conditions"), "condition", issues)
    analysis = spec.get("analysis") if isinstance(spec.get("analysis"), dict) else {}
    metrics = _unique_ids(analysis.get("metrics"), "metric", issues)
    contrasts = _unique_ids(analysis.get("contrasts"), "contrast", issues)

    design = spec.get("design") if isinstance(spec.get("design"), dict) else {}
    order = design.get("conditionOrder")
    if isinstance(order, list) and (len(order) != len(conditions) or set(order) != set(conditions)):
        issues.append("design.conditionOrder must contain every condition exactly once")

    budgets = spec.get("stoppingAndBudgets") if isinstance(spec.get("stoppingAndBudgets"), dict) else {}
    repetitions = design.get("repetitions")
    if budgets.get("maxTasks") != len(tasks):
        issues.append("stoppingAndBudgets.maxTasks must equal the number of tasks")
    if budgets.get("maxRepetitions") != repetitions:
        issues.append("stoppingAndBudgets.maxRepetitions must equal design.repetitions")
    retry = analysis.get("retryPolicy") if isinstance(analysis.get("retryPolicy"), dict) else {}
    if budgets.get("maxRetries") != retry.get("maxRetries"):
        issues.append("stoppingAndBudgets.maxRetries must equal analysis.retryPolicy.maxRetries")
    if isinstance(repetitions, int):
        base_calls = len(tasks) * len(conditions) * repetitions
        if not isinstance(budgets.get("maxDirectCalls"), int) or budgets.get("maxDirectCalls", -1) < base_calls:
            issues.append("stoppingAndBudgets.maxDirectCalls must cover every scheduled first attempt")

    for metric_id, metric in metrics.items():
        _validate_status_map(metric.get("statusActions"), f"metric {metric_id!r} statusActions", issues)
        summary = metric.get("summary")
        quantile = metric.get("quantile")
        if (summary == "quantile") != (quantile is not None):
            issues.append(f"metric {metric_id!r} quantile is required only for quantile summary")
    missingness = analysis.get("missingness") if isinstance(analysis.get("missingness"), dict) else {}
    _validate_status_map(missingness.get("statusActions"), "analysis.missingness.statusActions", issues)
    bound = missingness.get("boundRange") if isinstance(missingness.get("boundRange"), dict) else {}
    if isinstance(bound.get("lower"), (int, float)) and isinstance(bound.get("upper"), (int, float)):
        if bound["lower"] > bound["upper"]:
            issues.append("analysis.missingness.boundRange lower must not exceed upper")

    hypotheses: set[str] = set()
    for contrast_id, contrast in contrasts.items():
        candidate = contrast.get("candidateConditionId")
        control = contrast.get("controlConditionId")
        if candidate not in conditions:
            issues.append(f"contrast {contrast_id!r} references unknown candidate condition {candidate!r}")
        if control not in conditions:
            issues.append(f"contrast {contrast_id!r} references unknown control condition {control!r}")
        if candidate == control:
            issues.append(f"contrast {contrast_id!r} must compare different conditions")
        for metric_id in contrast.get("metricIds", []):
            if metric_id not in metrics:
                issues.append(f"contrast {contrast_id!r} references unknown metric {metric_id!r}")
            hypotheses.add(f"{contrast_id}.{metric_id}")

    multiplicity = analysis.get("multiplicity") if isinstance(analysis.get("multiplicity"), dict) else {}
    declared_hypotheses = multiplicity.get("hypothesisIds")
    if isinstance(declared_hypotheses, list) and set(declared_hypotheses) != hypotheses:
        missing = sorted(hypotheses - set(declared_hypotheses))
        extra = sorted(set(declared_hypotheses) - hypotheses)
        issues.append(f"analysis.multiplicity.hypothesisIds is incomplete (missing={missing}, extra={extra})")

    sequential = analysis.get("sequential") if isinstance(analysis.get("sequential"), dict) else {}
    if sequential.get("maxTasks") != len(tasks):
        issues.append("analysis.sequential.maxTasks must equal the number of tasks")
    looks = sequential.get("looks") if isinstance(sequential.get("looks"), list) else []
    look_ids: set[str] = set()
    prior_complete = 0
    alpha_totals = {hypothesis: 0.0 for hypothesis in hypotheses}
    for look in looks:
        if not isinstance(look, dict):
            continue
        look_id = look.get("id")
        if look_id in look_ids:
            issues.append(f"sequential look id {look_id!r} is duplicated")
        if isinstance(look_id, str):
            look_ids.add(look_id)
        complete_tasks = look.get("completeTasks")
        if isinstance(complete_tasks, int) and complete_tasks <= prior_complete:
            issues.append("sequential completeTasks values must be strictly increasing")
        if isinstance(complete_tasks, int):
            prior_complete = complete_tasks
        alpha_map = look.get("alphaByHypothesis")
        if isinstance(alpha_map, dict):
            if set(alpha_map) != hypotheses:
                issues.append(f"sequential look {look_id!r} must allocate alpha to the complete hypothesis family")
            for hypothesis, alpha in alpha_map.items():
                if hypothesis in alpha_totals and isinstance(alpha, (int, float)):
                    alpha_totals[hypothesis] += float(alpha)
    if not looks or prior_complete != len(tasks):
        issues.append("sequential looks must end at the complete task count")
    family_alpha = multiplicity.get("alpha")
    if isinstance(family_alpha, (int, float)):
        for hypothesis, total in alpha_totals.items():
            if total > float(family_alpha) + 1e-15:
                issues.append(f"sequential alpha total for {hypothesis!r} exceeds family alpha")
    if sequential.get("method") == "fixed-sample" and len(looks) != 1:
        issues.append("fixed-sample sequential design requires exactly one final look")

    assignment = design.get("assignment") if isinstance(design.get("assignment"), dict) else {}
    randomization = analysis.get("randomization") if isinstance(analysis.get("randomization"), dict) else {}
    if assignment.get("method") != randomization.get("inferenceContract"):
        issues.append("assignment method and randomization inferenceContract must match exactly")
    if randomization.get("mode") == "exact" and randomization.get("permitApproximation") is True:
        issues.append("exact randomization mode cannot permit approximation")

    grading = spec.get("grading") if isinstance(spec.get("grading"), dict) else {}
    grading_method = grading.get("method")
    deterministic = grading.get("deterministic")
    judgment = grading.get("judgment")
    adjudication = grading.get("adjudication") if isinstance(grading.get("adjudication"), dict) else {}
    if grading_method == "deterministic":
        if not isinstance(deterministic, dict) or judgment is not None:
            issues.append("deterministic grading requires deterministic options and no judgment options")
    elif grading_method in {"model", "human"}:
        if not isinstance(judgment, dict):
            issues.append(f"{grading_method} grading requires judgment options")
        elif grading_method == "model" and not judgment.get("calibrationInputPaths"):
            issues.append("model grading requires at least one frozen calibration input path")
    labels = grading.get("scoreMapping") if isinstance(grading.get("scoreMapping"), list) else []
    label_names = [item.get("label") for item in labels if isinstance(item, dict)]
    if len(label_names) != len(set(label_names)):
        issues.append("grading.scoreMapping labels must be unique")
    if isinstance(deterministic, dict) and deterministic.get("kind") in {"exact-text", "exact-json"}:
        expected = deterministic.get("expectedByTask")
        if not isinstance(expected, dict) or set(expected) != set(tasks):
            issues.append("deterministic expectedByTask must contain every task exactly once")
    if grading_method == "model" and isinstance(judgment, dict) and isinstance(repetitions, int):
        possible_attempts = len(tasks) * len(conditions) * repetitions * (1 + retry.get("maxRetries", 0))
        required_direct_calls = (
            possible_attempts
            + possible_attempts * len(judgment.get("graderIds", [])) * judgment.get("repetitions", 0)
            + (adjudication.get("maxCalls", 0) if adjudication.get("enabled") is True else 0)
        )
        if budgets.get("maxDirectCalls", 0) < required_direct_calls:
            issues.append("stoppingAndBudgets.maxDirectCalls must reserve measured, judge, and maximum adjudication calls")
    if adjudication.get("enabled") is True:
        if grading_method == "deterministic" or adjudication.get("trigger") != "declared-disagreement":
            issues.append("enabled adjudication requires judgment grading and declared-disagreement trigger")
        if not adjudication.get("resolverIds") or adjudication.get("maxCalls", 0) < 1:
            issues.append("enabled adjudication requires resolverIds and a positive maxCalls")
        if adjudication.get("precedence") == "not-applicable":
            issues.append("enabled adjudication requires an applicable precedence rule")
    else:
        if (
            adjudication.get("trigger") != "never"
            or adjudication.get("resolverIds") != []
            or adjudication.get("maxCalls") != 0
            or adjudication.get("precedence") != "not-applicable"
        ):
            issues.append("disabled adjudication must use the explicit never/empty/zero/not-applicable options")

    decision = analysis.get("decision") if isinstance(analysis.get("decision"), dict) else {}
    if decision.get("rule") == "adopt-if-all-primary" and decision.get("practicalThreshold") is None:
        issues.append("adopt-if-all-primary requires a practicalThreshold")
    if decision.get("rule") == "retain-control-unless-noninferior" and decision.get("nonInferiorityMargin") is None:
        issues.append("retain-control-unless-noninferior requires a nonInferiorityMargin")
    for metric_id in decision.get("vetoMetricIds", []):
        if metric_id not in metrics:
            issues.append(f"decision veto references unknown metric {metric_id!r}")

    precision = analysis.get("precisionPower") if isinstance(analysis.get("precisionPower"), dict) else {}
    if precision.get("method") == "none":
        if precision.get("simulationCount") != 0 or precision.get("scenarios") != []:
            issues.append("precisionPower method none requires zero simulations and no scenarios")
    elif precision.get("method") in {"simulation", "simulation-with-reference"}:
        if precision.get("simulationCount", 0) < 1 or not precision.get("scenarios"):
            issues.append("simulation precisionPower requires a positive simulationCount and scenarios")

    bootstrap = analysis.get("bootstrap") if isinstance(analysis.get("bootstrap"), dict) else {}
    if bootstrap.get("method") == "none" and bootstrap.get("draws") != 0:
        issues.append("bootstrap method none requires zero draws")
    if bootstrap.get("method") != "none" and bootstrap.get("draws", 0) < 1:
        issues.append("selected bootstrap method requires positive draws")

    model_ids: set[str] = set()
    for model in analysis.get("models", []):
        if not isinstance(model, dict):
            continue
        model_id = model.get("id")
        if model_id in model_ids:
            issues.append(f"analysis model id {model_id!r} is duplicated")
        if isinstance(model_id, str):
            model_ids.add(model_id)
        try:
            _model_selection(spec, model)
        except LifecycleError as exc:
            issues.append(str(exc))
        method = model.get("method")
        likelihood = model.get("likelihood")
        if method == "gaussian-mixedlm":
            if likelihood != "gaussian" or model.get("sampler") != "not-applicable" or model.get("draws") != 0 or model.get("chains") != 0:
                issues.append(f"model {model_id!r} has inconsistent Gaussian MixedLM options")
        elif method == "bayesian-gaussian" and likelihood != "gaussian":
            issues.append(f"model {model_id!r} requires gaussian likelihood")
        elif method == "bayesian-bernoulli" and likelihood != "bernoulli":
            issues.append(f"model {model_id!r} requires bernoulli likelihood")
        if isinstance(method, str) and method.startswith("bayesian-"):
            if model.get("sampler") == "not-applicable" or model.get("draws", 0) < 1 or model.get("chains", 0) < 1:
                issues.append(f"model {model_id!r} requires an explicit sampler, positive draws, and positive chains")

    required_mechanism_conditions = (
        spec.get("mechanismObservation", {}).get("requiredForConditionIds", [])
        if isinstance(spec.get("mechanismObservation"), dict)
        else []
    )
    for condition_id in required_mechanism_conditions:
        if condition_id not in conditions:
            issues.append(f"mechanismObservation references unknown condition {condition_id!r}")

    if issues:
        raise LifecycleError("INVALID_SPEC", "; ".join(sorted(set(issues))))


def _declared_input_slots(spec: Document) -> list[tuple[list[Any], int, str]]:
    slots: list[tuple[list[Any], int, str]] = []
    for task in spec.get("tasks", []):
        paths = task.get("inputPaths", [])
        for index, relative in enumerate(paths):
            slots.append((paths, index, relative))
    for condition in spec.get("conditions", []):
        paths = condition.get("instructionPaths", [])
        for index, relative in enumerate(paths):
            slots.append((paths, index, relative))
    judgment = spec.get("grading", {}).get("judgment")
    if isinstance(judgment, dict):
        paths = judgment.get("calibrationInputPaths", [])
        for index, relative in enumerate(paths):
            slots.append((paths, index, relative))
    return slots


def materialize_spec(spec_path: Path) -> MaterializedSpec:
    try:
        source = lib.load_json(spec_path)
    except lib.BenchmarkError as exc:
        raise LifecycleError("INVALID_SPEC", str(exc)) from None
    if not isinstance(source, dict):
        raise LifecycleError("INVALID_SPEC", "specification root must be an object")
    _schema_validate(source, SPEC_SCHEMA_PATH, os.fspath(spec_path))
    validate_spec_semantics(source)
    resolved = copy.deepcopy(source)
    inputs: dict[str, bytes] = {}
    base = spec_path.parent
    try:
        for container, index, relative in _declared_input_slots(resolved):
            source_file = lib.safe_join(base, relative)
            if not source_file.is_file():
                raise lib.InputError(f"declared task-facing input is not a regular file: {relative}")
            data = source_file.read_bytes()
            local_relative = f"inputs/{relative}"
            previous = inputs.get(local_relative)
            if previous is not None and previous != data:
                raise lib.InputError(f"task-facing input collision for {relative}")
            inputs[local_relative] = data
            container[index] = local_relative
    except (OSError, lib.BenchmarkError) as exc:
        raise LifecycleError("INVALID_SPEC", str(exc)) from None
    return MaterializedSpec(source=source, resolved=resolved, inputs=inputs)


def _publish_bytes(path: Path, data: bytes) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            if path.is_file() and path.read_bytes() == data:
                return False
        except OSError:
            pass
        raise LifecycleError("RECORD_CONFLICT", f"create-only record conflicts with existing bytes: {path}")
    try:
        lib.atomic_create_bytes(path, data)
    except lib.BenchmarkError as exc:
        if path.exists():
            try:
                if path.read_bytes() == data:
                    return False
            except OSError:
                pass
        raise LifecycleError("PUBLICATION_FAILED", str(exc)) from None
    return True


def _publish_json(path: Path, value: Any) -> bool:
    try:
        data = lib.canonical_json_bytes(value)
    except lib.BenchmarkError as exc:
        raise LifecycleError("PUBLICATION_FAILED", str(exc)) from None
    return _publish_bytes(path, data)


def _replace_json(path: Path, value: Any) -> None:
    data = lib.canonical_json_bytes(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.parent / f".{path.name}.tmp-{os.getpid()}-{secrets.token_hex(8)}"
    descriptor: int | None = None
    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        view = memoryview(data)
        while view:
            written = os.write(descriptor, view)
            if written <= 0:
                raise OSError("short write")
            view = view[written:]
        os.fsync(descriptor)
        os.close(descriptor)
        descriptor = None
        os.replace(temporary, path)
    except OSError as exc:
        raise LifecycleError("CHECKPOINT_FAILED", f"cannot replace checkpoint {path}: {exc}") from None
    finally:
        if descriptor is not None:
            try:
                os.close(descriptor)
            except OSError:
                pass
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def _same_json(left: Any, right: Any) -> bool:
    try:
        return lib.canonical_json_bytes(left) == lib.canonical_json_bytes(right)
    except lib.BenchmarkError:
        return False


def initialize_or_resume(materialized: MaterializedSpec, run_dir: Path) -> RunContext:
    run_dir.mkdir(parents=True, exist_ok=True)
    saved_spec_path = run_dir / "spec.json"
    if saved_spec_path.exists():
        try:
            saved = lib.load_json(saved_spec_path)
        except lib.BenchmarkError as exc:
            raise LifecycleError("INVALID_SAVED_SPEC", str(exc)) from None
        if not isinstance(saved, dict):
            raise LifecycleError("INVALID_SAVED_SPEC", "saved spec root is not an object")
        _schema_validate(saved, SPEC_SCHEMA_PATH, os.fspath(saved_spec_path))
        validate_spec_semantics(saved)
        if not _same_json(saved, materialized.resolved):
            raise LifecycleError(
                "SPEC_MISMATCH",
                "supplied resolved specification differs from the saved run; use a new output directory",
                status="blocked",
            )
        for relative, supplied_bytes in materialized.inputs.items():
            local_path = run_dir / relative
            try:
                saved_bytes = local_path.read_bytes()
            except OSError as exc:
                raise LifecycleError("INPUT_COPY_MISSING", f"cannot read frozen input {local_path}: {exc}", status="blocked") from None
            if supplied_bytes != saved_bytes:
                raise LifecycleError(
                    "SPEC_MISMATCH",
                    f"source input differs from frozen local copy: {relative.removeprefix('inputs/')}",
                    status="blocked",
                )
        resolved = saved
    else:
        if any(run_dir.iterdir()):
            allowed = {".run.lock", ".bridge"}
            unexpected = sorted(path.name for path in run_dir.iterdir() if path.name not in allowed)
            if unexpected:
                raise LifecycleError(
                    "NONEMPTY_NEW_RUN_DIRECTORY",
                    f"new run directory contains records without spec.json: {unexpected}; for an old-format saved report use scripts/inspect_legacy_report.py PATH (read-only), not run/resume",
                    status="blocked",
                )
        for relative, data in sorted(materialized.inputs.items()):
            _publish_bytes(run_dir / relative, data)
        _publish_json(saved_spec_path, materialized.resolved)
        resolved = materialized.resolved

    schedule_path = run_dir / "schedule.json"
    if schedule_path.exists():
        try:
            schedule = lib.load_json(schedule_path)
        except lib.BenchmarkError as exc:
            raise LifecycleError("INVALID_SCHEDULE", str(exc), status="blocked") from None
        validate_schedule(schedule, resolved)
    else:
        schedule = _generate_schedule({"schemaVersion": 1, "resolvedSpec": copy.deepcopy(resolved)})
        validate_schedule(schedule, resolved)
        _publish_json(schedule_path, schedule)
    return RunContext(run_dir=run_dir, spec=resolved, schedule=schedule)


def _call_helper(module_name: str, function_name: str, request: Document, *, code: str, phase: str) -> Document:
    try:
        module = importlib.import_module(module_name)
        value = getattr(module, function_name)(request)
    except LifecycleError:
        raise
    except Exception as exc:
        raise LifecycleError(code, f"{function_name} failed: {exc}", phase=phase) from None
    if not isinstance(value, dict):
        raise LifecycleError(code, f"{function_name} returned a non-object", phase=phase)
    return value


def _generate_schedule(request: Document) -> Document:
    return _call_helper("generate_schedule", "generate_schedule", request, code="SCHEDULE_FAILED", phase="initialize")


def _grade(request: Document) -> Document:
    return _call_helper("grade", "grade", request, code="GRADING_FAILED", phase="grade")


def _aggregate_telemetry(request: Document) -> Document:
    return _call_helper(
        "aggregate_telemetry",
        "aggregate_telemetry",
        request,
        code="TELEMETRY_FAILED",
        phase="analyze",
    )


def _analyze(request: Document) -> Document:
    return _call_helper("analyze_paired", "analyze_paired", request, code="ANALYSIS_FAILED", phase="analyze")


def _analyze_model(request: Document) -> Document:
    return _call_helper("analysis_models", "analysis_models", request, code="MODEL_ANALYSIS_FAILED", phase="analyze")


def validate_schedule(schedule: Any, spec: Document) -> None:
    issues: list[str] = []
    if not isinstance(schedule, dict):
        raise LifecycleError("INVALID_SCHEDULE", "schedule must be an object", status="blocked")
    if set(schedule) != {"schemaVersion", "experimentId", "assignment", "rows"}:
        issues.append("schedule has missing or unknown top-level keys")
    if schedule.get("schemaVersion") != 1:
        issues.append("schedule schemaVersion must be 1")
    if schedule.get("experimentId") != spec.get("experimentId"):
        issues.append("schedule experimentId differs from resolved spec")
    expected_assignment = copy.deepcopy(spec["design"]["assignment"])
    expected_assignment["conditionOrder"] = list(spec["design"]["conditionOrder"])
    assignment = schedule.get("assignment")
    if not isinstance(assignment, dict):
        issues.append("schedule assignment must be an object")
    else:
        required_assignment = {
            "method": expected_assignment["method"],
            "seed": expected_assignment["seed"],
            "conditionOrder": expected_assignment["conditionOrder"],
            "conditioning": expected_assignment["conditioning"],
            "parameters": expected_assignment["parameters"],
        }
        if not _same_json(assignment, required_assignment):
            issues.append("schedule assignment contract differs from resolved design")

    rows = schedule.get("rows")
    if not isinstance(rows, list):
        issues.append("schedule rows must be an array")
        rows = []
    task_ids = [item["id"] for item in spec["tasks"]]
    condition_ids = [item["id"] for item in spec["conditions"]]
    repetitions = spec["design"]["repetitions"]
    expected_cells = {
        (task_id, condition_id, repetition)
        for task_id in task_ids
        for repetition in range(1, repetitions + 1)
        for condition_id in condition_ids
    }
    cells: set[tuple[Any, Any, Any]] = set()
    ids: set[str] = set()
    block_cells: dict[tuple[Any, Any], list[Document]] = {}
    row_keys = {
        "attemptId",
        "taskId",
        "conditionId",
        "repetition",
        "blockId",
        "blockIndex",
        "orderPosition",
        "retryOf",
    }
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or set(row) != row_keys:
            issues.append(f"schedule row {index + 1} has missing or unknown keys")
            continue
        attempt_id = row.get("attemptId")
        if not isinstance(attempt_id, str) or ID_PATTERN.fullmatch(attempt_id) is None:
            issues.append(f"schedule row {index + 1} has invalid attemptId")
        elif attempt_id in ids:
            issues.append(f"schedule attemptId {attempt_id!r} is duplicated")
        else:
            ids.add(attempt_id)
        if row.get("retryOf") is not None:
            issues.append(f"base schedule row {attempt_id!r} cannot be a retry")
        cell = (row.get("taskId"), row.get("conditionId"), row.get("repetition"))
        if cell in cells:
            issues.append(f"schedule cell {cell!r} is duplicated")
        cells.add(cell)
        block_cells.setdefault((row.get("taskId"), row.get("repetition")), []).append(row)
        if not isinstance(row.get("blockIndex"), int) or row["blockIndex"] < 1:
            issues.append(f"schedule row {attempt_id!r} has invalid blockIndex")
        if not isinstance(row.get("orderPosition"), int) or row["orderPosition"] < 1:
            issues.append(f"schedule row {attempt_id!r} has invalid orderPosition")
    if cells != expected_cells:
        issues.append(f"schedule cells are not exact (missing={sorted(expected_cells - cells)}, extra={sorted(cells - expected_cells)})")
    for block, block_rows in block_cells.items():
        if {row.get("conditionId") for row in block_rows} != set(condition_ids):
            issues.append(f"schedule block {block!r} does not contain every condition")
        positions = [row.get("orderPosition") for row in block_rows]
        if set(positions) != set(range(1, len(condition_ids) + 1)):
            issues.append(f"schedule block {block!r} has invalid order positions")
        if len({row.get("blockId") for row in block_rows}) != 1 or len({row.get("blockIndex") for row in block_rows}) != 1:
            issues.append(f"schedule block {block!r} has inconsistent block identity")
    if issues:
        raise LifecycleError("INVALID_SCHEDULE", "; ".join(issues), status="blocked")


def _lock_path(run_dir: Path) -> Path:
    return run_dir / ".run.lock"


def acquire_lock(run_dir: Path, *, token: str | None = None, admitted: int = 0, ceiling: int = 0) -> str:
    run_dir.mkdir(parents=True, exist_ok=True)
    token = token or secrets.token_urlsafe(18)
    record = {
        "schemaVersion": 1,
        "token": token,
        "pid": os.getpid(),
        "startedAt": utc_now(),
        "admitted": admitted,
        "ceiling": ceiling,
        "recovery": "Confirm no invocation is active, preserve unresolved assignments, then manually remove this lock file.",
    }
    path = _lock_path(run_dir)
    data = lib.canonical_json_bytes(record)
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        owner = "unknown"
        try:
            existing = lib.load_json(path)
            if isinstance(existing, dict):
                owner = f"pid={existing.get('pid')}, startedAt={existing.get('startedAt')}"
        except lib.BenchmarkError:
            pass
        raise LifecycleError(
            "RUN_LOCKED",
            f"run directory is locked ({owner}); stale recovery is manual and never authorizes replay",
            status="blocked",
        ) from None
    try:
        view = memoryview(data)
        while view:
            written = os.write(descriptor, view)
            if written <= 0:
                raise OSError("short write")
            view = view[written:]
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    return token


def read_lock(run_dir: Path, token: str) -> Document:
    path = _lock_path(run_dir)
    try:
        value = lib.load_json(path)
    except lib.BenchmarkError as exc:
        raise LifecycleError("RUN_LOCKED", f"cannot validate invocation lock: {exc}", status="blocked") from None
    if not isinstance(value, dict) or value.get("token") != token:
        raise LifecycleError("RUN_LOCKED", "invocation lock token does not match", status="blocked")
    return value


def update_lock(run_dir: Path, token: str, *, admitted: int, ceiling: int) -> None:
    current = read_lock(run_dir, token)
    current["admitted"] = admitted
    current["ceiling"] = ceiling
    path = _lock_path(run_dir)
    temporary = path.parent / f".{path.name}.update-{os.getpid()}-{secrets.token_hex(8)}"
    data = lib.canonical_json_bytes(current)
    try:
        temporary.write_bytes(data)
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    except OSError as exc:
        raise LifecycleError("RUN_LOCKED", f"cannot update invocation lock: {exc}", status="blocked") from None
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def release_lock(run_dir: Path, token: str) -> None:
    path = _lock_path(run_dir)
    current = read_lock(run_dir, token)
    if current.get("token") != token:
        raise LifecycleError("RUN_LOCKED", "refusing to release another invocation's lock", status="blocked")
    try:
        path.unlink()
    except OSError as exc:
        raise LifecycleError("RUN_LOCKED", f"cannot release invocation lock: {exc}", status="blocked") from None


def _attempt_dir(run_dir: Path, attempt_id: str) -> Path:
    if ID_PATTERN.fullmatch(attempt_id) is None:
        raise LifecycleError("INVALID_ATTEMPT_ID", f"invalid attempt id {attempt_id!r}", status="blocked")
    return run_dir / "attempts" / attempt_id


def _schedule_rows(schedule: Document) -> dict[str, Document]:
    return {row["attemptId"]: row for row in schedule["rows"]}


def _retry_id(base_id: str, number: int) -> str:
    suffix = f"-retry-{number:02d}"
    if len(base_id) + len(suffix) > 128:
        base_id = base_id[: 128 - len(suffix)]
    return base_id + suffix


def _valid_assignment(value: Any, row: Document, *, retry_of: str | None) -> bool:
    if not isinstance(value, dict):
        return False
    expected_keys = {
        "schemaVersion",
        "attemptId",
        "taskId",
        "conditionId",
        "repetition",
        "blockId",
        "blockIndex",
        "orderPosition",
        "retryOf",
        "request",
        "assignedAt",
    }
    if set(value) != expected_keys or value.get("schemaVersion") != 1:
        return False
    for key in ("attemptId", "taskId", "conditionId", "repetition", "blockId", "blockIndex", "orderPosition"):
        if value.get(key) != row.get(key):
            return False
    if value.get("retryOf") != retry_of or not isinstance(value.get("request"), dict):
        return False
    return isinstance(value.get("assignedAt"), str)


def _valid_result(value: Any, attempt_id: str) -> bool:
    if not isinstance(value, dict):
        return False
    required = {"schemaVersion", "attemptId", "dispatchStatus", "nativeResult", "error", "receivedAt", "nativeLog"}
    if set(value) != required or value.get("schemaVersion") != 1 or value.get("attemptId") != attempt_id:
        return False
    if value.get("dispatchStatus") not in {"completed", "failed", "timeout", "cancelled", "infrastructure-failure"}:
        return False
    if not isinstance(value.get("receivedAt"), str):
        return False
    if value.get("nativeResult") is None:
        error = value.get("error")
        if not isinstance(error, dict) or set(error) != {"code", "message"}:
            return False
    return True


def _valid_terminal(value: Any, attempt_id: str) -> bool:
    if not isinstance(value, dict):
        return False
    required = {"schemaVersion", "attemptId", "status", "resultAvailable", "gradeIds", "outcomes", "failure", "terminalAt"}
    if set(value) != required or value.get("schemaVersion") != 1 or value.get("attemptId") != attempt_id:
        return False
    if value.get("status") not in {"succeeded", *FAILURE_TERMINALS}:
        return False
    if value.get("resultAvailable") is not True or not isinstance(value.get("gradeIds"), list) or not isinstance(value.get("outcomes"), list):
        return False
    return isinstance(value.get("terminalAt"), str)


def _load_record(path: Path, code: str, errors: list[Document], work_id: str) -> Document | None:
    try:
        value = lib.load_json(path)
    except lib.BenchmarkError as exc:
        errors.append({"code": code, "message": str(exc), "workId": work_id})
        return None
    if not isinstance(value, dict):
        errors.append({"code": code, "message": f"record is not an object: {path}", "workId": work_id})
        return None
    return value


def _derive_retry_rows(spec: Document, schedule: Document, terminals: dict[str, Document], assignments: dict[str, Document]) -> dict[str, Document]:
    policy = spec["analysis"]["retryPolicy"]
    maximum = policy["maxRetries"]
    eligible = set(policy["eligibleStatuses"])
    result: dict[str, Document] = {}
    for base in schedule["rows"]:
        base_id = base["attemptId"]
        previous_terminal = terminals.get(base_id)
        if not previous_terminal or previous_terminal.get("status") not in eligible:
            continue
        for number in range(1, maximum + 1):
            attempt_id = _retry_id(base_id, number)
            row = {**base, "attemptId": attempt_id, "retryOf": base_id}
            result[attempt_id] = row
            terminal = terminals.get(attempt_id)
            if terminal is None:
                break
            if terminal.get("status") not in eligible:
                break
    for attempt_id, assignment in assignments.items():
        retry_of = assignment.get("retryOf")
        if retry_of is None:
            continue
        base = next((row for row in schedule["rows"] if row["attemptId"] == retry_of), None)
        if base is None:
            continue
        match = re.fullmatch(re.escape(_retry_id(retry_of, 1)[:-2]) + r"([0-9]{2})", attempt_id)
        if match is None:
            continue
        number = int(match.group(1))
        if 1 <= number <= maximum:
            result.setdefault(attempt_id, {**base, "attemptId": attempt_id, "retryOf": retry_of})
    return result


def inspect_records(context: RunContext) -> Inspection:
    schedule_rows = _schedule_rows(context.schedule)
    assignments: dict[str, Document] = {}
    results: dict[str, Document] = {}
    terminals: dict[str, Document] = {}
    errors: list[Document] = []
    attempts_root = context.run_dir / "attempts"
    if attempts_root.exists():
        try:
            entries = sorted(attempts_root.iterdir(), key=lambda path: path.name)
        except OSError as exc:
            errors.append({"code": "ATTEMPT_SCAN_FAILED", "message": str(exc), "workId": None})
            entries = []
        for entry in entries:
            attempt_id = entry.name
            if not entry.is_dir() or ID_PATTERN.fullmatch(attempt_id) is None:
                errors.append({"code": "UNKNOWN_ATTEMPT_ENTRY", "message": f"unexpected attempt entry: {entry}", "workId": attempt_id})
                continue
            assignment_path = entry / "assignment.json"
            result_path = entry / "result.json"
            terminal_path = entry / "terminal.json"
            if not assignment_path.exists():
                if result_path.exists() or terminal_path.exists() or any(entry.iterdir()):
                    errors.append({"code": "RESULT_WITHOUT_ASSIGNMENT", "message": "attempt directory has records without assignment.json", "workId": attempt_id})
                continue
            assignment = _load_record(assignment_path, "MALFORMED_ASSIGNMENT", errors, attempt_id)
            if assignment is None:
                continue
            assignments[attempt_id] = assignment
            if result_path.exists():
                result = _load_record(result_path, "MALFORMED_RESULT", errors, attempt_id)
                if result is not None:
                    if _valid_result(result, attempt_id):
                        results[attempt_id] = result
                    else:
                        errors.append({"code": "MALFORMED_RESULT", "message": "result record violates the lifecycle contract", "workId": attempt_id})
            if terminal_path.exists():
                terminal = _load_record(terminal_path, "MALFORMED_TERMINAL", errors, attempt_id)
                if terminal is not None:
                    if _valid_terminal(terminal, attempt_id):
                        terminals[attempt_id] = terminal
                    else:
                        errors.append({"code": "MALFORMED_TERMINAL", "message": "terminal record violates the lifecycle contract", "workId": attempt_id})

    retry_rows = _derive_retry_rows(context.spec, context.schedule, terminals, assignments)
    rows = {**schedule_rows, **retry_rows}
    for attempt_id, assignment in assignments.items():
        row = rows.get(attempt_id)
        if row is None:
            errors.append({"code": "UNPLANNED_ATTEMPT", "message": "assignment ID is not scheduled or a permitted linked retry", "workId": attempt_id})
            continue
        if not _valid_assignment(assignment, row, retry_of=row.get("retryOf")):
            errors.append({"code": "ASSIGNMENT_MISMATCH", "message": "assignment differs from the frozen schedule/request contract", "workId": attempt_id})
    for attempt_id in terminals:
        if attempt_id not in results:
            errors.append({"code": "TERMINAL_WITHOUT_RESULT", "message": "terminal exists without a complete result", "workId": attempt_id})

    planned_ids = list(schedule_rows)
    planned_ids.extend(attempt_id for attempt_id in retry_rows if attempt_id not in schedule_rows)
    pending_ids = [attempt_id for attempt_id in planned_ids if attempt_id not in assignments]
    recoverable_ids = [
        attempt_id
        for attempt_id in planned_ids
        if attempt_id in assignments and attempt_id in results and attempt_id not in terminals
    ]
    ambiguous_ids = [
        attempt_id
        for attempt_id in planned_ids
        if attempt_id in assignments and attempt_id not in terminals and attempt_id not in results
    ]
    return Inspection(
        planned_ids=planned_ids,
        pending_ids=pending_ids,
        recoverable_ids=recoverable_ids,
        ambiguous_ids=ambiguous_ids,
        errors=errors,
        assignments=assignments,
        results=results,
        terminals=terminals,
        retry_rows=retry_rows,
    )


def _condition_map(spec: Document) -> dict[str, Document]:
    return {item["id"]: item for item in spec["conditions"]}


def _task_map(spec: Document) -> dict[str, Document]:
    return {item["id"]: item for item in spec["tasks"]}


def _append_paths(text: str, heading: str, paths: list[str]) -> str:
    if not paths:
        return text
    rendered = "\n".join(f"- {path}" for path in paths)
    return f"{text}\n\n{heading}:\n{rendered}".strip()


def prepare_assignment(context: RunContext, row: Document) -> Document:
    task = _task_map(context.spec)[row["taskId"]]
    condition = _condition_map(context.spec)[row["conditionId"]]
    workspace = _attempt_dir(context.run_dir, row["attemptId"]) / "workspace"
    input_paths = [os.fspath(workspace / relative.removeprefix("inputs/")) for relative in task.get("inputPaths", [])]
    instruction_paths = [os.fspath(context.run_dir / relative) for relative in condition.get("instructionPaths", [])]
    prompt = _append_paths(task["prompt"], "Initial task input copies", input_paths)
    instructions = condition["instructions"]
    for path in instruction_paths:
        instructions += "\n\nFrozen condition instructions:\n" + Path(path).read_text(encoding="utf-8")
    request = {
        "runner": condition["runner"],
        "model": condition["model"],
        "prompt": prompt,
        "instructions": instructions,
        "tools": copy.deepcopy(condition["tools"]),
        "settings": copy.deepcopy(condition["settings"]),
    }
    if "taskState" in context.spec:
        request["prompt"] += f"\n\nTask workspace: {workspace}\nUse this attempt's workspace for task file changes."
        if request["settings"].get("recursive") is not True:
            request["settings"]["cwd"] = os.fspath(workspace)
    return {
        "schemaVersion": 1,
        "attemptId": row["attemptId"],
        "taskId": row["taskId"],
        "conditionId": row["conditionId"],
        "repetition": row["repetition"],
        "blockId": row["blockId"],
        "blockIndex": row["blockIndex"],
        "orderPosition": row["orderPosition"],
        "retryOf": row.get("retryOf"),
        "request": request,
        "assignedAt": utc_now(),
    }


def publish_assignment(context: RunContext, row: Document) -> Document:
    assignment = prepare_assignment(context, row)
    _publish_json(_attempt_dir(context.run_dir, row["attemptId"]) / "assignment.json", assignment)
    # Assignment precedes task effects. An interruption here is never guessed to
    # be safe to replay, including an external reset that may already have run.
    prepare_task_state(context, assignment)
    return assignment


def prepare_task_state(context: RunContext, assignment: Document) -> None:
    """Copy declared files, then run this task's setup/reset/readiness commands.

    Commands are Bash in the attempt workspace, in declaration order, on EVERY
    attempt (including retries). They may directly seed a task checkout, cart,
    or test records. No generic environment, protection, or cleanup manager.
    Stateful attempts are serialized in schedule order because a command may
    reset a shared external resource; unrelated text attempts have no gate.
    """
    task = _task_map(context.spec)[assignment["taskId"]]
    state = context.spec.get("taskState")
    if not task.get("inputPaths") and state is None:
        return
    attempt_dir = _attempt_dir(context.run_dir, assignment["attemptId"])
    workspace = attempt_dir / "workspace"
    stages: list[Document] = []
    stage = "inputs"
    try:
        workspace.mkdir(parents=True, exist_ok=False)
        input_paths = []
        for relative in task.get("inputPaths", []):
            destination = workspace / relative.removeprefix("inputs/")
            destination.parent.mkdir(parents=True, exist_ok=True)
            # Copies, never links to the frozen experiment input snapshot.
            _publish_bytes(destination, (context.run_dir / relative).read_bytes())
            input_paths.append(os.fspath(destination))
        env = dict(os.environ, BENCHMARK_TASK_ID=assignment["taskId"],
                   BENCHMARK_CONDITION_ID=assignment["conditionId"],
                   BENCHMARK_ATTEMPT_ID=assignment["attemptId"],
                   BENCHMARK_WORKSPACE=os.fspath(workspace),
                   BENCHMARK_INPUT_PATHS=json.dumps(input_paths))
        for stage in ("setup", "reset", "verify") if state is not None else ():
            command = state[stage + "Command"]
            if command is None:
                continue
            started = utc_now()
            # Log to local files rather than buffering unbounded command output.
            stdout_path = attempt_dir / f"task-state-{stage}.stdout"
            stderr_path = attempt_dir / f"task-state-{stage}.stderr"
            with stdout_path.open("xb") as stdout, stderr_path.open("xb") as stderr:
                process = subprocess.Popen(["/bin/bash", "-c", command], cwd=workspace,
                    env=env, stdout=stdout, stderr=stderr, start_new_session=True)
                timed_out = False
                try:
                    process.wait(timeout=float(context.spec["stoppingAndBudgets"]["maxWallTimeSeconds"]))
                except subprocess.TimeoutExpired:
                    timed_out = True
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
            def excerpt(path: Path) -> str:
                with path.open("rb") as handle:
                    return handle.read(4096).decode("utf-8", errors="replace")
            stages.append({"stage": stage, "command": command, "startedAt": started,
                "finishedAt": utc_now(), "exitCode": process.returncode, "timedOut": timed_out,
                "stdout": excerpt(stdout_path), "stderr": excerpt(stderr_path),
                "stdoutPath": stdout_path.name, "stderrPath": stderr_path.name})
            if process.returncode != 0 or timed_out:
                raise OSError(f"{stage} command {'timed out' if timed_out else 'exited ' + str(process.returncode)}")
        _publish_json(attempt_dir / "task-state.json", {"schemaVersion": 1,
            "attemptId": assignment["attemptId"], "workspace": os.fspath(workspace),
            "status": "ready", "inputPaths": input_paths, "stages": stages})
    except OSError as exc:
        code = f"TASK_STATE_{stage.upper()}_FAILED"
        _publish_json(attempt_dir / "task-state.json", {"schemaVersion": 1,
            "attemptId": assignment["attemptId"], "workspace": os.fspath(workspace),
            "status": "failed", "stages": stages, "error": str(exc)})
        result = make_result_record(assignment["attemptId"], error=exc)
        result["error"] = {"code": code, "message": str(exc)}
        publish_result(context, assignment["attemptId"], result)
        derive_terminal(context, assignment["attemptId"], assignment, result)
        raise LifecycleError(code, str(exc), phase="execute", work_id=assignment["attemptId"]) from None


def _json_compatible_mapping(value: Any) -> Document | None:
    if not isinstance(value, Mapping):
        return None
    copied = copy.deepcopy(dict(value))
    try:
        lib.canonical_json_bytes(copied)
    except (lib.BenchmarkError, TypeError, ValueError, RecursionError):
        return None
    return copied


def _native_dispatch_status(native: Document) -> str:
    status = native.get("status")
    if status in {"completed", "complete", "succeeded", "success"}:
        if not any(key in native for key in ("text", "output", "value")):
            return "infrastructure-failure"
        return "completed"
    if status in {"failed", "error"}:
        return "failed"
    if status in {"timed_out", "timed-out", "timeout"}:
        return "timeout"
    if status in {"cancelled", "canceled", "stopped"}:
        return "cancelled"
    return "infrastructure-failure"


def make_result_record(attempt_id: str, *, native: Any = None, error: BaseException | None = None) -> Document:
    if error is not None:
        if isinstance(error, TimeoutError):
            status = "timeout"
            code = "DISPATCH_TIMEOUT"
        elif error.__class__.__name__.lower() in {"cancellederror", "aborterror"}:
            status = "cancelled"
            code = "DISPATCH_CANCELLED"
        else:
            status = "infrastructure-failure"
            code = "DISPATCH_ERROR"
        return {
            "schemaVersion": 1,
            "attemptId": attempt_id,
            "dispatchStatus": status,
            "nativeResult": None,
            "error": {"code": code, "message": str(error) or error.__class__.__name__},
            "receivedAt": utc_now(),
            "nativeLog": {"status": "unavailable", "path": None, "bytes": None, "reason": "no native return"},
        }
    compatible = _json_compatible_mapping(native)
    if compatible is None:
        return {
            "schemaVersion": 1,
            "attemptId": attempt_id,
            "dispatchStatus": "infrastructure-failure",
            "nativeResult": None,
            "error": {"code": "MALFORMED_NATIVE_RESULT", "message": "dispatcher returned a non-object or non-JSON native result"},
            "receivedAt": utc_now(),
            "nativeLog": {"status": "unavailable", "path": None, "bytes": None, "reason": "malformed native return"},
        }
    status = _native_dispatch_status(compatible)
    error_value = None
    if status == "infrastructure-failure":
        error_value = {"code": "MALFORMED_NATIVE_RESULT", "message": "native result has no supported terminal status/output shape"}
    elif status != "completed" and compatible.get("error") is not None:
        error_value = {"code": f"DISPATCH_{status.upper().replace('-', '_')}", "message": str(compatible.get("error"))}
    elif status != "completed":
        error_value = {"code": f"DISPATCH_{status.upper().replace('-', '_')}", "message": f"native dispatch status is {status}"}
    return {
        "schemaVersion": 1,
        "attemptId": attempt_id,
        "dispatchStatus": status,
        "nativeResult": compatible,
        "error": error_value,
        "receivedAt": utc_now(),
        "nativeLog": {"status": "pending", "path": None, "bytes": None, "reason": None},
    }


def _archive_native_log_at(context: RunContext, work_id: str, record: Document, destination: Path) -> None:
    native = record.get("nativeResult")
    log_file = native.get("logFile") if isinstance(native, dict) else None
    if log_file is None:
        record["nativeLog"] = {"status": "unavailable", "path": None, "bytes": None, "reason": "native result supplied no logFile"}
        return
    if not isinstance(log_file, str) or not Path(log_file).is_absolute():
        record["nativeLog"] = {"status": "unavailable", "path": None, "bytes": None, "reason": "native log path is not absolute"}
        return
    source = Path(log_file)
    try:
        if not source.is_file():
            raise OSError("path is not a regular file")
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            if destination.read_bytes() != source.read_bytes():
                raise LifecycleError("RECORD_CONFLICT", f"archived native log conflicts for {work_id}", work_id=work_id)
        else:
            with source.open("rb") as input_handle:
                temporary = destination.parent / f".{destination.name}.tmp-{os.getpid()}-{secrets.token_hex(8)}"
                try:
                    with temporary.open("xb") as output_handle:
                        shutil.copyfileobj(input_handle, output_handle, length=1024 * 1024)
                        output_handle.flush()
                        os.fsync(output_handle.fileno())
                    os.link(temporary, destination)
                finally:
                    try:
                        temporary.unlink()
                    except FileNotFoundError:
                        pass
        record["nativeLog"] = {
            "status": "archived",
            "path": os.fspath(destination.relative_to(context.run_dir)),
            "bytes": destination.stat().st_size,
            "reason": None,
        }
    except LifecycleError:
        raise
    except OSError as exc:
        record["nativeLog"] = {"status": "unavailable", "path": None, "bytes": None, "reason": str(exc)}


def _archive_native_log(context: RunContext, attempt_id: str, record: Document) -> None:
    _archive_native_log_at(
        context,
        attempt_id,
        record,
        _attempt_dir(context.run_dir, attempt_id) / "native.log",
    )


def publish_result(context: RunContext, attempt_id: str, record: Document) -> None:
    if not _valid_result({**record, "nativeLog": record.get("nativeLog")}, attempt_id):
        # nativeLog can still be pending here; all other record fields are strict.
        if set(record) != {"schemaVersion", "attemptId", "dispatchStatus", "nativeResult", "error", "receivedAt", "nativeLog"}:
            raise LifecycleError("MALFORMED_RESULT", "result record keys are invalid", work_id=attempt_id)
    _archive_native_log(context, attempt_id, record)
    _publish_json(_attempt_dir(context.run_dir, attempt_id) / "result.json", record)


def _existing_grades(context: RunContext, attempt_id: str) -> list[Document]:
    root = context.run_dir / "grading"
    if not root.exists():
        return []
    grades: list[Document] = []
    for path in sorted(root.glob("grade-*.json")):
        try:
            value = lib.load_json(path)
        except lib.BenchmarkError:
            continue
        if isinstance(value, dict) and value.get("attemptId") == attempt_id and isinstance(value.get("gradeId"), str):
            grades.append(value)
    return grades


def _publish_grades(context: RunContext, attempt_id: str, grades: Any) -> list[Document]:
    if not isinstance(grades, list):
        raise LifecycleError("GRADING_FAILED", "grade response grades must be an array", phase="grade", work_id=attempt_id)
    published: list[Document] = []
    seen: set[str] = set()
    for grade in grades:
        if not isinstance(grade, dict) or grade.get("attemptId") != attempt_id:
            raise LifecycleError("GRADING_FAILED", "grade record has wrong attempt identity", phase="grade", work_id=attempt_id)
        grade_id = grade.get("gradeId")
        if not isinstance(grade_id, str) or ID_PATTERN.fullmatch(grade_id) is None or grade_id in seen:
            raise LifecycleError("GRADING_FAILED", "grade record has invalid or duplicate gradeId", phase="grade", work_id=attempt_id)
        seen.add(grade_id)
        _publish_json(context.run_dir / "grading" / f"{grade_id}.json", grade)
        published.append(grade)
    return published


def _resolved_grade_scores(spec: Document, grades: list[Document]) -> dict[str, float | None]:
    if spec['grading']['method'] != 'model':
        criteria = {label.get('criterionId', 'outcome') for row in grades for label in row.get('labels', [])}
        return {criterion: _grade_score([{**row, 'labels': [label for label in row.get('labels', []) if label.get('criterionId', 'outcome') == criterion]} for row in grades]) for criterion in criteria}
    plan = spec['grading']
    resolved = importlib.import_module('grade').resolve_labels(plan, grades)
    mapping = {row['label']: row['score'] for row in plan['scoreMapping']}
    expected = {(g, r) for g in plan['judgment']['graderIds'] for r in range(1, plan['judgment']['repetitions'] + 1)}
    scores = {}
    for criterion in resolved['criteria']:
        cid = criterion['criterionId']
        observed = {(row.get('graderId'), row.get('graderRepetition', 1)) for row in grades
                    if row.get('stage') == 'judge' and row.get('status') == 'valid'
                    and any(label.get('criterionId') == cid and label.get('score') is not None for label in row.get('labels', []))}
        # Missing/abstained labels are not unanimous agreement. A genuine resolver
        # decision may still resolve a declared dispute; all raw labels stay saved.
        complete = observed == expected
        scores[cid] = mapping.get(criterion['label']) if criterion['status'] == 'resolved' and (complete or criterion['reason'] == 'resolver-precedence') else None
    return scores

def _grade_score(grades: list[Document]) -> float | None:
    scores: list[float] = []
    for grade in grades:
        if grade.get("status") != "valid":
            continue
        for label in grade.get("labels", []):
            if isinstance(label, dict) and isinstance(label.get("score"), (int, float)) and not isinstance(label.get("score"), bool):
                value = float(label["score"])
                if math.isfinite(value):
                    scores.append(value)
    if not scores:
        return None
    return sum(scores) / len(scores)


def _status_action(metric: Document, status: str) -> Document:
    for action in metric["statusActions"]:
        if action["status"] == status:
            return action
    raise LifecycleError("INVALID_SPEC", f"metric {metric['id']} has no action for status {status}")


def _outcomes_for_terminal(spec: Document, status: str, grades: list[Document]) -> list[Document]:
    outcomes: list[Document] = []
    scores = _resolved_grade_scores(spec, grades)
    score = sum(scores.values()) / len(scores) if scores and all(v is not None for v in scores.values()) else None
    for metric in spec["analysis"]["metrics"]:
        selected_score = scores.get(metric["source"].split(":", 1)[1]) if metric["source"].startswith("grade.score:") else score
        if status == "succeeded":
            if (metric["source"] == "grade.score" or metric["source"].startswith("grade.score:")) and selected_score is not None:
                outcomes.append({"metricId": metric["id"], "status": "observed", "value": selected_score})
            else:
                outcomes.append({"metricId": metric["id"], "status": "unavailable", "value": None})
            continue
        action = _status_action(metric, status)
        if action["action"] == "score":
            outcomes.append({"metricId": metric["id"], "status": "observed", "value": action["value"]})
        elif action["action"] == "missing":
            outcomes.append({"metricId": metric["id"], "status": "missing", "value": None})
        else:
            outcomes.append({"metricId": metric["id"], "status": "unavailable", "value": None})
    return outcomes


def derive_terminal(context: RunContext, attempt_id: str, assignment: Document, result: Document) -> Document:
    dispatch_status = result["dispatchStatus"]
    grades = _existing_grades(context, attempt_id)
    if dispatch_status == "completed" and not grades and context.spec["grading"]["method"] == "deterministic":
        grade_response = _grade(
            {
                "schemaVersion": 1,
                "phase": "deterministic",
                "gradingPlan": copy.deepcopy(context.spec["grading"]),
                "items": [{"assignment": copy.deepcopy(assignment), "result": copy.deepcopy(result), "existingLabels": []}],
            }
        )
        if grade_response.get("status") == "failed":
            raise LifecycleError("GRADING_FAILED", f"grader failed for {attempt_id}: {grade_response.get('errors', [])}", phase="grade", work_id=attempt_id)
        if grade_response.get("jobs"):
            raise LifecycleError("GRADING_FAILED", "deterministic grading returned unexpected model jobs", phase="grade", work_id=attempt_id)
        grades = _publish_grades(context, attempt_id, grade_response.get("grades"))
    elif dispatch_status == "completed" and not grades:
        raise LifecycleError(
            "MODEL_GRADING_INCOMPLETE",
            "completed measured output is waiting for its frozen judgment jobs",
            status="blocked",
            phase="grade",
            work_id=attempt_id,
        )
    if dispatch_status == "completed":
        allowed_grade_statuses = {"valid", "abstained"} if context.spec["grading"]["method"] == "model" else {"valid"}
        valid_grading = bool(grades) and all(grade.get("status") in allowed_grade_statuses for grade in grades)
        scores = _resolved_grade_scores(context.spec, grades)
        status = "succeeded" if valid_grading and any(v is not None for v in scores.values()) else "evaluator-failure"
        if context.spec["grading"]["method"] == "model":
            resolution = importlib.import_module("grade").resolve_labels(context.spec["grading"], grades)
            for criterion in resolution["criteria"]:
                if scores.get(criterion["criterionId"]) is None and criterion["status"] == "resolved":
                    criterion.update(status="unresolved", label=None, reason="missing-or-abstained-judge-labels")
            _publish_json(context.run_dir / "grading" / "resolutions" / f"{attempt_id}.json", {"resolution": resolution, "scores": scores})
    else:
        status = DISPATCH_TO_TERMINAL[dispatch_status]
    failure = None
    if status != "succeeded":
        failure = result.get("error") or {"code": status.upper().replace("-", "_"), "message": f"attempt ended as {status}"}
    terminal = {
        "schemaVersion": 1,
        "attemptId": attempt_id,
        "status": status,
        "resultAvailable": True,
        "gradeIds": [grade["gradeId"] for grade in grades],
        "outcomes": _outcomes_for_terminal(context.spec, status, grades),
        "failure": failure,
        "terminalAt": utc_now(),
    }
    _publish_json(_attempt_dir(context.run_dir, attempt_id) / "terminal.json", terminal)
    return terminal


def reconcile_recoverable(context: RunContext) -> Inspection:
    inspection = inspect_records(context)
    changed = False
    for attempt_id in inspection.recoverable_ids:
        if any(error.get("workId") == attempt_id for error in inspection.errors):
            continue
        result = inspection.results[attempt_id]
        if result.get("dispatchStatus") == "completed" and context.spec["grading"]["method"] != "deterministic":
            continue
        derive_terminal(context, attempt_id, inspection.assignments[attempt_id], result)
        changed = True
    if changed:
        inspection = inspect_records(context)
    return inspection


def _error_result(run_dir: Path, error: LifecycleError) -> Document:
    counts = None
    limitations = list(error.limitations)
    # An analysis/publication error does not undo already dispatched work.
    # This is read-only reconstruction, also used by the fixed guest's bridge.
    if (run_dir / 'spec.json').is_file() and (run_dir / 'schedule.json').is_file():
        try:
            context = RunContext(run_dir=run_dir, spec=lib.load_json(run_dir / 'spec.json'),
                                 schedule=lib.load_json(run_dir / 'schedule.json'))
            counts = inspect_records(context).counts
        except Exception as exc:
            limitations.append(f'Saved attempt counts could not be reconstructed ({type(exc).__name__}); zero count fields are unavailable placeholders, not observed zeros.')
    return public_result(
        run_dir,
        status=error.status,
        phase=error.phase,
        counts=counts,
        next_action=error.message if error.status in {"blocked", "unsupported"} else None,
        errors=[{"code": error.code, "message": error.message, "workId": error.work_id}],
        limitations=limitations,
    )


def public_result(
    run_dir: Path,
    *,
    status: str,
    phase: str,
    counts: Document | None,
    next_action: str | None,
    errors: list[Document],
    limitations: list[str],
    report_paths: Document | None = None,
    decision: str | None = None,
) -> Document:
    value = {
        "schemaVersion": 1,
        "status": status,
        "runDirectory": os.fspath(run_dir.absolute()),
        "phase": phase,
        "counts": counts
        or {"planned": 0, "assigned": 0, "terminal": 0, "failed": 0, "unresolved": 0, "pending": 0},
        "nextAction": next_action,
        "errors": errors,
        "limitations": list(dict.fromkeys(limitations)),
        "reportPaths": report_paths or {"json": None, "markdown": None},
        "scientificDecision": decision,
    }
    _schema_validate(value, PUBLIC_RESULT_SCHEMA_PATH, "public result")
    return value


def _blocked_from_inspection(context: RunContext, inspection: Inspection) -> Document | None:
    invalidations = [{"code": terminal["failure"]["code"],
        "message": terminal["failure"]["message"], "workId": attempt_id}
        for attempt_id, terminal in inspection.terminals.items()
        if isinstance(terminal.get("failure"), dict)
        and str(terminal["failure"].get("code", "")).startswith("TASK_STATE_")]
    if invalidations:
        return public_result(context.run_dir, status="failed", phase="execute", counts=inspection.counts,
            next_action="Task fixture readiness failed. Inspect task-state.json and command logs; start a new experiment after fixing the fixture. Never replay this assignment.",
            errors=invalidations, limitations=["Task-state failure invalidates continuation; no model was dispatched for the failed fixture."])
    errors = list(inspection.errors)
    for attempt_id in inspection.ambiguous_ids:
        errors.append(
            {
                "code": "AMBIGUOUS_ASSIGNED_ATTEMPT",
                "message": "Assignment exists without a native result or terminal.",
                "workId": attempt_id,
            }
        )
    if not errors:
        return None
    if inspection.ambiguous_ids:
        first = inspection.ambiguous_ids[0]
        next_action = f"Inspect available runtime output for {first}; do not relaunch it automatically."
    else:
        next_action = "Inspect conflicting saved records; never overwrite or automatically replay them."
    limitations = ["Counts were reconstructed from immutable records; checkpoint.json is not authoritative."]
    return public_result(
        context.run_dir,
        status="blocked",
        phase="execute",
        counts=inspection.counts,
        next_action=next_action,
        errors=errors,
        limitations=limitations,
    )


def _checkpoint(context: RunContext, inspection: Inspection, phase: str, *, calls_admitted: int) -> None:
    _replace_json(
        context.run_dir / "checkpoint.json",
        {
            "schemaVersion": 1,
            "phase": phase,
            "counts": inspection.counts,
            "pendingIds": inspection.pending_ids,
            "unresolvedIds": inspection.ambiguous_ids,
            "callsAdmittedThisInvocation": calls_admitted,
            "updatedAt": utc_now(),
        },
    )


def _dispatch_capabilities(dispatch: Dispatch) -> Mapping[str, Any] | None:
    value = getattr(dispatch, "capabilities", None)
    return value if isinstance(value, Mapping) else None


def selected_capability_error(spec: Document, dispatch: Dispatch) -> LifecycleError | None:
    if spec["design"]["concurrency"]["interleaveConditions"] is not True:
        return LifecycleError("UNSUPPORTED_NONINTERLEAVED_DISPATCH",
            "The runner follows the saved interleaved assignment schedule; grouped condition dispatch is not implemented",
            status="unsupported")
    if "mechanismObservation" in spec:
        observation = spec["mechanismObservation"]
        return LifecycleError("UNSUPPORTED_MECHANISM_OBSERVATION",
            f"No executable observer for {observation['name']!r}, evidence {observation['evidence']!r}, "
            f"required only for conditions {observation['requiredForConditionIds']}. "
            "Native log presence alone does not establish dispatch, return, or parent consumption.",
            status="unsupported")
    if spec["grading"]["method"] == "human":
        return LifecycleError(
            "HUMAN_GRADING_INPUT_UNAVAILABLE",
            "human grading is planned but no human-label input channel is configured",
            status="unsupported",
            phase="grade",
        )
    for method in spec['analysis']['models']:
        selection = _model_selection(spec, method)
        issue = importlib.import_module('analysis_models').model_target_issue(selection)
        if issue is not None:
            return LifecycleError(issue['code'], issue['message'], status='unsupported', phase='analyze')
    if (any(m['summary'] == 'transformed-mean' for m in spec['analysis']['metrics'])
            or any(c['estimand'] == 'task-weighted-transformed-difference' for c in spec['analysis']['contrasts'])
            or any(s.get('summary') == 'transformed-mean' for s in spec['analysis'].get('sensitivityScenarios', []))):
        return LifecycleError('UNSUPPORTED_METRIC_TRANSFORM',
            'No executable metric transformation is defined; averaging raw values cannot implement a transformed estimand',
            status='unsupported', phase='analyze')
    capabilities = _dispatch_capabilities(dispatch)
    if capabilities is not None:
        if capabilities.get("agentsRun") is not True:
            return LifecycleError("MISSING_AGENTS_RUN", "selected dispatch does not expose agents.run", status="unsupported")
        if capabilities.get("nativeResult") is not True:
            return LifecycleError("MISSING_NATIVE_RESULT", "selected dispatch cannot retain the complete native result", status="unsupported")
    selected_launches = list(spec["conditions"])
    judgment = spec["grading"].get("judgment")
    if spec["grading"]["method"] == "model" and isinstance(judgment, dict):
        selected_launches.append({"runner": judgment.get("runner"), "model": judgment.get("model"), "tools": [], "settings": {}})
    for condition in selected_launches:
        runner = condition["runner"]
        if runner not in {"pi", "claude", "veda"}:
            return LifecycleError("UNSUPPORTED_RUNNER", f"agents.run does not support runner {runner!r}", status="unsupported")
        settings = condition["settings"]
        if "taskState" in spec and (settings.get("cwd") is not None or settings.get("worktree") is True):
            return LifecycleError("UNSUPPORTED_TASK_STATE_WORKSPACE",
                "taskState uses an attempt-local workspace; declare a checkout in setupCommand instead of overriding cwd/worktree",
                status="unsupported")
        request_schema = capabilities.get('requestSchema') if capabilities is not None else None
        if request_schema is not None:
            candidate = {'task': 'prepared task', 'runner': runner, **settings}
            if "taskState" in spec and settings.get("recursive") is not True and condition in spec["conditions"]:
                candidate['cwd'] = '/prepared-attempt/workspace'
            if 'model' in condition:
                candidate['model'] = condition['model']
            if 'tools' in condition:
                candidate['tools'] = condition['tools']
            issues = lib.validate_json_schema(candidate, request_schema)
            if issues:
                return LifecycleError('UNSUPPORTED_REQUEST_SETTING', f'selected agents.run request violates effective schema: {issues}', status='unsupported')
        supported_settings = capabilities.get("settingFields", FIXED_GUEST_SETTING_FIELDS) if capabilities is not None else FIXED_GUEST_SETTING_FIELDS
        if supported_settings is not None:
            if not isinstance(supported_settings, (set, frozenset, list, tuple)):
                return LifecycleError("MALFORMED_CAPABILITY", "selected dispatch setting capability is malformed", status="unsupported")
            unknown_settings = sorted(set(settings) - set(supported_settings))
            if unknown_settings:
                return LifecycleError(
                    "UNSUPPORTED_REQUEST_SETTING",
                    f"selected agents.run path does not support settings {unknown_settings}",
                    status="unsupported",
                )
        recursive = settings.get("recursive") is True
        if recursive and runner != "pi":
            return LifecycleError("UNSUPPORTED_RECURSION", "recursive measured attempts require the Pi runner", status="unsupported")
        if recursive and settings.get("cwd") is not None:
            # The request adapter intentionally omits cwd, but an explicit contradictory
            # setting is rejected rather than silently changing the requested condition.
            return LifecycleError("UNSUPPORTED_RECURSIVE_CWD", "recursive agents.run requests must omit custom cwd", status="unsupported")
        hard_descendants = settings.get("hardDescendantCallLimit")
        if hard_descendants is not None:
            supported = capabilities is not None and capabilities.get("recursiveHardCallCap") is True
            if not supported:
                return LifecycleError(
                    "UNSUPPORTED_RECURSIVE_HARD_CAP",
                    "the selected recursive condition requests a hard descendant cap that this dispatch cannot enforce",
                    status="unsupported",
                )
    return None


def invocation_budget(context: RunContext, dispatch: Dispatch, inspection: Inspection) -> InvocationBudget:
    max_direct = context.spec["stoppingAndBudgets"]["maxDirectCalls"]
    already_admitted = len(inspection.assignments) + grade_job_count(context)
    remaining_global = max(0, max_direct - already_admitted)
    requested = min(HARD_INVOCATION_CALL_CEILING, remaining_global)
    configured = getattr(dispatch, "configured_call_ceiling", HARD_INVOCATION_CALL_CEILING)
    fresh = getattr(dispatch, "fresh_invocation", True)
    usable_marker = getattr(dispatch, "usable_call_ceiling", "absent")
    if usable_marker == "absent":
        if not fresh:
            raise LifecycleError(
                "UNKNOWN_REMAINING_INVOCATION_BUDGET",
                "remaining invocation call budget is unknown; start a fresh dedicated invocation or expose the usable remainder",
                status="unsupported",
            )
        usable = configured
    elif usable_marker is None:
        raise LifecycleError(
            "UNKNOWN_REMAINING_INVOCATION_BUDGET",
            "remaining invocation call budget is unknown; no work was assigned",
            status="unsupported",
        )
    else:
        usable = usable_marker
    for name, value in (("configured", configured), ("usable", usable)):
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise LifecycleError("INVALID_CALL_CEILING", f"{name} call ceiling is invalid", status="unsupported")
    return InvocationBudget(limit=min(requested, configured, usable, HARD_INVOCATION_CALL_CEILING), remaining_global=remaining_global)


def _row_for_id(context: RunContext, inspection: Inspection, attempt_id: str) -> Document:
    rows = _schedule_rows(context.schedule)
    rows.update(inspection.retry_rows)
    return rows[attempt_id]


def _dispatch_one(dispatch: Dispatch, assignment: Document) -> Document:
    try:
        native = dispatch(copy.deepcopy(assignment["request"]))
    except Exception as exc:
        return make_result_record(assignment["attemptId"], error=exc)
    return make_result_record(assignment["attemptId"], native=native)


def _dispatch_wave(dispatch: Dispatch, assignments: list[Document]) -> list[Document]:
    if len(assignments) == 1:
        return [_dispatch_one(dispatch, assignments[0])]
    with ThreadPoolExecutor(max_workers=len(assignments), thread_name_prefix="benchmark-attempt") as executor:
        futures = [executor.submit(_dispatch_one, dispatch, assignment) for assignment in assignments]
        return [future.result() for future in futures]


def _grade_plan_path(context: RunContext, phase: str) -> Path:
    return context.run_dir / "grading" / f"{phase}-plan.json"


def _successful_measurement_items(context: RunContext, inspection: Inspection) -> list[Document]:
    items: list[Document] = []
    for attempt_id in inspection.planned_ids:
        result = inspection.results.get(attempt_id)
        assignment = inspection.assignments.get(attempt_id)
        if result is None or assignment is None or result.get("dispatchStatus") != "completed":
            continue
        items.append(
            {
                "assignment": copy.deepcopy(assignment),
                "result": copy.deepcopy(result),
                "existingLabels": _existing_grades(context, attempt_id),
            }
        )
    return items


def _load_or_plan_grade_jobs(context: RunContext, inspection: Inspection, phase: str) -> list[Document]:
    path = _grade_plan_path(context, phase)
    items = _successful_measurement_items(context, inspection)
    response = _grade(
        {
            "schemaVersion": 1,
            "phase": phase,
            "gradingPlan": copy.deepcopy(context.spec["grading"]),
            "items": items,
        }
    )
    if phase == "judge" and items and response.get("status") == "failed":
        raise LifecycleError(
            "GRADING_FAILED",
            f"judge planning failed: {response.get('errors', [])}",
            phase="grade",
        )
    jobs = response.get("jobs")
    if not isinstance(jobs, list):
        raise LifecycleError("GRADING_FAILED", f"{phase} planner returned malformed jobs", phase="grade")
    judgment = context.spec['grading'].get('judgment')
    calibration = []
    if isinstance(judgment, dict):
        for relative in judgment.get('calibrationInputPaths', []):
            calibration.append((context.run_dir / relative).read_text(encoding='utf-8'))
    for job in jobs:
        # Contents, not private paths or condition metadata, reach the no-tools grader.
        if calibration:
            job['request']['prompt'] += '\nCALIBRATION EXAMPLES (frozen reference evidence):\n' + json.dumps(calibration, ensure_ascii=False)
        item = next((item for item in items if item['assignment']['attemptId'] == job['attemptId']), None)
        presentations = item['assignment'].get('criterionEvidence', {}).get('presentations') if item else None
        public_presentations = job.get('projection', {}).get('evidence', {}).get('presentations')
        if presentations is not None and public_presentations is not None:
            # Match the actual saved public order; ties use source order, exactly
            # as the projector does. Never expose identity metadata to the judge.
            remaining = list(enumerate(presentations))
            reverse_map = []
            for public in public_presentations:
                match = next(((index, row) for index, row in remaining if _same_json(row.get('output') if isinstance(row, dict) else row, public['output'])), None)
                if match is None:
                    raise LifecycleError('PAIRWISE_MAP_MISMATCH', 'Public pairwise projection has no source presentation', phase='grade')
                index, row = match
                remaining.remove(match)
                reverse_map.append({'position': public['position'], 'sourceIndex': index, 'private': {k: copy.deepcopy(v) for k, v in row.items() if k != 'output'} if isinstance(row, dict) else {}})
            job['privatePresentationMap'] = reverse_map
        if 'privatePresentationMap' in job:
            _publish_json(context.run_dir / 'grading' / 'private-maps' / f"{job['jobId']}.json", job['privatePresentationMap'])
    document = {"schemaVersion": 1, "phase": phase, "jobs": jobs}
    if path.exists():
        saved = lib.load_json(path)
        if not _same_json(saved, document):
            raise LifecycleError(
                "GRADE_PLAN_MISMATCH",
                f"recomputed {phase} jobs differ from the frozen plan",
                status="blocked",
                phase="grade",
            )
    else:
        _publish_json(path, document)
    return jobs


def _load_grade_plan(context: RunContext, phase: str) -> list[Document] | None:
    path = _grade_plan_path(context, phase)
    if not path.exists():
        return None
    try:
        value = lib.load_json(path)
    except lib.BenchmarkError as exc:
        raise LifecycleError("MALFORMED_GRADE_PLAN", str(exc), status="blocked", phase="grade") from None
    if not isinstance(value, dict) or set(value) != {"schemaVersion", "phase", "jobs"} or value.get("schemaVersion") != 1 or value.get("phase") != phase or not isinstance(value.get("jobs"), list):
        raise LifecycleError("MALFORMED_GRADE_PLAN", f"saved {phase} plan is malformed", status="blocked", phase="grade")
    return value["jobs"]


def _grade_job_dir(context: RunContext, job_id: str) -> Path:
    if not isinstance(job_id, str) or ID_PATTERN.fullmatch(job_id) is None:
        raise LifecycleError("INVALID_GRADE_JOB_ID", f"invalid grade job ID {job_id!r}", status="blocked", phase="grade")
    return context.run_dir / "grading" / "jobs" / job_id


def _validate_grade_job(job: Any, phase: str) -> Document:
    if not isinstance(job, dict):
        raise LifecycleError("MALFORMED_GRADE_PLAN", f"{phase} job is not an object", status="blocked", phase="grade")
    required = {"schemaVersion", "jobId", "gradeId", "workType", "phase", "attemptId", "graderId", "blindedItemId", "criterionIds", "projection", "residualUnblinding", "request", "presentationIndex"}
    allowed = required | {"graderRepetition", "criterionId", "privatePresentationMap"}
    if set(job) - allowed or not required.issubset(job):
        raise LifecycleError("MALFORMED_GRADE_PLAN", f"{phase} job has missing or unknown fields", status="blocked", phase="grade")
    for field in ("jobId", "gradeId", "attemptId", "graderId", "blindedItemId"):
        if not isinstance(job.get(field), str) or ID_PATTERN.fullmatch(job[field]) is None:
            raise LifecycleError("MALFORMED_GRADE_PLAN", f"{phase} job has invalid {field}", status="blocked", phase="grade")
    if job.get("schemaVersion") != 1 or job.get("workType") != "grade-job" or job.get("phase") != phase or not isinstance(job.get("request"), dict):
        raise LifecycleError("MALFORMED_GRADE_PLAN", f"{phase} job contract is invalid", status="blocked", phase="grade")
    return job


def _grade_job_state(context: RunContext, jobs: list[Document], phase: str) -> tuple[list[Document], list[Document], list[Document], list[Document]]:
    pending: list[Document] = []
    ambiguous: list[Document] = []
    recoverable: list[Document] = []
    complete: list[Document] = []
    planned_ids: set[str] = set()
    for raw_job in jobs:
        job = _validate_grade_job(raw_job, phase)
        job_id = job["jobId"]
        if job_id in planned_ids:
            raise LifecycleError("DUPLICATE_GRADE_JOB", f"duplicate grade job ID {job_id!r}", status="blocked", phase="grade")
        planned_ids.add(job_id)
        directory = _grade_job_dir(context, job_id)
        assignment_path = directory / "assignment.json"
        result_path = directory / "result.json"
        grade_path = context.run_dir / "grading" / f"{job['gradeId']}.json"
        if not assignment_path.exists():
            if result_path.exists() or grade_path.exists():
                raise LifecycleError("GRADE_RESULT_WITHOUT_ASSIGNMENT", f"grade job {job_id!r} has output without assignment", status="blocked", phase="grade", work_id=job_id)
            pending.append(job)
            continue
        assignment = lib.load_json(assignment_path)
        if not _same_json(assignment, job):
            raise LifecycleError("GRADE_ASSIGNMENT_MISMATCH", f"grade assignment {job_id!r} differs from its frozen plan", status="blocked", phase="grade", work_id=job_id)
        if not result_path.exists():
            ambiguous.append(job)
        elif not grade_path.exists():
            recoverable.append(job)
        else:
            complete.append(job)
    jobs_root = context.run_dir / "grading" / "jobs"
    if jobs_root.exists():
        other_prefix = "adjudicate-" if phase == "judge" else "judge-"
        extra = sorted(
            path.name
            for path in jobs_root.iterdir()
            if path.is_dir()
            and path.name not in planned_ids
            and not path.name.startswith(other_prefix)
        )
        if extra:
            raise LifecycleError("UNPLANNED_GRADE_JOB", f"unplanned grade job directories exist: {extra}", status="blocked", phase="grade")
    return pending, ambiguous, recoverable, complete


def publish_grade_assignment(context: RunContext, job: Document) -> None:
    _publish_json(_grade_job_dir(context, job["jobId"]) / "assignment.json", job)


def publish_grade_result(context: RunContext, job: Document, record: Document) -> None:
    job_id = job["jobId"]
    _archive_native_log_at(context, job_id, record, _grade_job_dir(context, job_id) / "native.log")
    _publish_json(_grade_job_dir(context, job_id) / "result.json", record)


def consume_grade_result(context: RunContext, job: Document) -> Document:
    result_path = _grade_job_dir(context, job["jobId"]) / "result.json"
    try:
        result = lib.load_json(result_path)
    except lib.BenchmarkError as exc:
        raise LifecycleError("MALFORMED_GRADE_RESULT", str(exc), status="blocked", phase="grade", work_id=job["jobId"]) from None
    if not _valid_result(result, job["jobId"]):
        raise LifecycleError("MALFORMED_GRADE_RESULT", "saved grade native result violates the lifecycle contract", status="blocked", phase="grade", work_id=job["jobId"])
    response = _grade(
        {
            "schemaVersion": 1,
            "phase": job["phase"],
            "gradingPlan": copy.deepcopy(context.spec["grading"]),
            "items": [
                {
                    "assignment": copy.deepcopy(job),
                    "result": result,
                    "existingLabels": _existing_grades(context, job["attemptId"]),
                    "nativeResultPath": result.get("nativeLog", {}).get("path"),
                }
            ],
        }
    )
    grades = response.get("grades")
    published = _publish_grades(context, job["attemptId"], grades)
    if len(published) != 1 or published[0].get("gradeId") != job["gradeId"]:
        raise LifecycleError("GRADING_FAILED", f"grade job {job['jobId']!r} did not produce its frozen grade ID", phase="grade", work_id=job["jobId"])
    return published[0]


def _consume_recoverable_grade_jobs(context: RunContext, jobs: list[Document], phase: str) -> None:
    while True:
        _, _, recoverable, _ = _grade_job_state(context, jobs, phase)
        if not recoverable:
            return
        for job in recoverable:
            consume_grade_result(context, job)


def _grade_dispatch_one(dispatch: Dispatch, job: Document) -> Document:
    try:
        native = dispatch(copy.deepcopy(job["request"]))
    except Exception as exc:
        return make_result_record(job["jobId"], error=exc)
    return make_result_record(job["jobId"], native=native)


def dispatch_grade_jobs(context: RunContext, dispatch: Dispatch, jobs: list[Document], *, maximum: int) -> int:
    if maximum <= 0 or not jobs:
        return 0
    wave = jobs[: min(maximum, context.spec["design"]["concurrency"]["max"])]
    for job in wave:
        publish_grade_assignment(context, job)
    if len(wave) == 1:
        records = [_grade_dispatch_one(dispatch, wave[0])]
    else:
        with ThreadPoolExecutor(max_workers=len(wave), thread_name_prefix="benchmark-grader") as executor:
            futures = [executor.submit(_grade_dispatch_one, dispatch, job) for job in wave]
            records = [future.result() for future in futures]
    for job, record in zip(wave, records, strict=True):
        publish_grade_result(context, job, record)
        consume_grade_result(context, job)
    return len(wave)


def grade_job_count(context: RunContext) -> int:
    jobs_root = context.run_dir / "grading" / "jobs"
    if not jobs_root.exists():
        return 0
    return sum(1 for path in jobs_root.glob("*/assignment.json") if path.is_file())


def admit_model_grade_jobs(context: RunContext, inspection: Inspection, *, maximum: int) -> tuple[list[Document], bool]:
    """Create only the next bounded fixed-guest grade assignments."""
    if context.spec["grading"]["method"] == "human":
        raise LifecycleError(
            "HUMAN_GRADING_INPUT_UNAVAILABLE",
            "the selected human grading plan has no supplied human labels",
            status="unsupported",
            phase="grade",
        )
    judge_jobs = _load_grade_plan(context, "judge")
    if judge_jobs is None:
        judge_jobs = _load_or_plan_grade_jobs(context, inspection, "judge")
    _consume_recoverable_grade_jobs(context, judge_jobs, "judge")
    pending, ambiguous, _, _ = _grade_job_state(context, judge_jobs, "judge")
    if ambiguous:
        raise LifecycleError(
            "AMBIGUOUS_ASSIGNED_GRADE_JOB",
            "grade assignment exists without a native result; it will not be replayed automatically",
            status="blocked",
            phase="grade",
            work_id=ambiguous[0]["jobId"],
        )
    if pending:
        admitted = pending[:maximum]
        for job in admitted:
            publish_grade_assignment(context, job)
        return admitted, False

    adjudication_jobs = _load_grade_plan(context, "adjudicate")
    if adjudication_jobs is None:
        adjudication_jobs = _load_or_plan_grade_jobs(context, inspect_records(context), "adjudicate")
    _consume_recoverable_grade_jobs(context, adjudication_jobs, "adjudicate")
    pending, ambiguous, _, _ = _grade_job_state(context, adjudication_jobs, "adjudicate")
    if ambiguous:
        raise LifecycleError(
            "AMBIGUOUS_ASSIGNED_GRADE_JOB",
            "adjudication assignment exists without a native result; it will not be replayed automatically",
            status="blocked",
            phase="grade",
            work_id=ambiguous[0]["jobId"],
        )
    if pending:
        admitted = pending[:maximum]
        for job in admitted:
            publish_grade_assignment(context, job)
        return admitted, False

    refreshed = inspect_records(context)
    for attempt_id in refreshed.recoverable_ids:
        result = refreshed.results[attempt_id]
        if result.get("dispatchStatus") == "completed":
            derive_terminal(context, attempt_id, refreshed.assignments[attempt_id], result)
    return [], True


def advance_model_grading(context: RunContext, inspection: Inspection, dispatch: Dispatch, *, maximum_calls: int) -> tuple[int, bool]:
    """Advance frozen judge/adjudication jobs; return calls used and completion."""
    if context.spec["grading"]["method"] == "human":
        raise LifecycleError(
            "HUMAN_GRADING_INPUT_UNAVAILABLE",
            "the selected human grading plan has no supplied human labels",
            status="unsupported",
            phase="grade",
        )
    used = 0
    judge_jobs = _load_grade_plan(context, "judge")
    if judge_jobs is None:
        judge_jobs = _load_or_plan_grade_jobs(context, inspection, "judge")
    _consume_recoverable_grade_jobs(context, judge_jobs, "judge")
    pending, ambiguous, _, _ = _grade_job_state(context, judge_jobs, "judge")
    if ambiguous:
        job = ambiguous[0]
        raise LifecycleError(
            "AMBIGUOUS_ASSIGNED_GRADE_JOB",
            "grade assignment exists without a native result; it will not be replayed automatically",
            status="blocked",
            phase="grade",
            work_id=job["jobId"],
        )
    if pending and used < maximum_calls:
        used += dispatch_grade_jobs(context, dispatch, pending, maximum=maximum_calls - used)
        pending, ambiguous, _, _ = _grade_job_state(context, judge_jobs, "judge")
    if pending:
        return used, False

    adjudication_jobs = _load_grade_plan(context, "adjudicate")
    if adjudication_jobs is None:
        adjudication_jobs = _load_or_plan_grade_jobs(context, inspect_records(context), "adjudicate")
    _consume_recoverable_grade_jobs(context, adjudication_jobs, "adjudicate")
    pending, ambiguous, _, _ = _grade_job_state(context, adjudication_jobs, "adjudicate")
    if ambiguous:
        job = ambiguous[0]
        raise LifecycleError(
            "AMBIGUOUS_ASSIGNED_GRADE_JOB",
            "adjudication assignment exists without a native result; it will not be replayed automatically",
            status="blocked",
            phase="grade",
            work_id=job["jobId"],
        )
    if pending and used < maximum_calls:
        used += dispatch_grade_jobs(context, dispatch, pending, maximum=maximum_calls - used)
        pending, ambiguous, _, _ = _grade_job_state(context, adjudication_jobs, "adjudicate")
    if pending:
        return used, False

    refreshed = inspect_records(context)
    for attempt_id in refreshed.recoverable_ids:
        result = refreshed.results[attempt_id]
        if result.get("dispatchStatus") == "completed":
            derive_terminal(context, attempt_id, refreshed.assignments[attempt_id], result)
    return used, True


def _load_all_grades(context: RunContext) -> list[Document]:
    root = context.run_dir / "grading"
    if not root.exists():
        return []
    grades: list[Document] = []
    seen: set[str] = set()
    expected = set(inspect_records(context).planned_ids)
    for path in sorted(root.glob("grade-*.json")):
        try:
            value = lib.load_json(path)
        except lib.BenchmarkError as exc:
            raise LifecycleError("MALFORMED_GRADE", str(exc), phase="analyze") from None
        if not isinstance(value, dict) or not isinstance(value.get("gradeId"), str):
            raise LifecycleError("MALFORMED_GRADE", f"invalid grade record: {path}", phase="analyze")
        if value["gradeId"] in seen:
            raise LifecycleError("DUPLICATE_GRADE", f"duplicate grade ID {value['gradeId']!r}", phase="analyze")
        if value.get("attemptId") not in expected:
            raise LifecycleError("UNKNOWN_GRADE_ATTEMPT", f"grade references unknown attempt {value.get('attemptId')!r}", phase="analyze")
        seen.add(value["gradeId"])
        grades.append(value)
    return grades


def _dataset(context: RunContext, inspection: Inspection) -> Document:
    task_map = _task_map(context.spec)
    rows_by_id = _schedule_rows(context.schedule)
    rows_by_id.update(inspection.retry_rows)
    rows: list[Document] = []
    for attempt_id in inspection.planned_ids:
        row = rows_by_id[attempt_id]
        task = task_map[row["taskId"]]
        terminal = inspection.terminals[attempt_id]
        rows.append(
            {
                "attemptId": attempt_id,
                "taskId": row["taskId"],
                "family": task["family"],
                "stratum": task["stratum"],
                "conditionId": row["conditionId"],
                "repetition": row["repetition"],
                "blockId": row["blockId"],
                "blockIndex": row["blockIndex"],
                "orderPosition": row["orderPosition"],
                "retryOf": row.get("retryOf"),
                "attemptStatus": terminal["status"],
                "outcomes": copy.deepcopy(terminal["outcomes"]),
                "gradeIds": copy.deepcopy(terminal["gradeIds"]),
                "telemetry": {},
            }
        )
    return {"schemaVersion": 1, "rows": rows}


def _telemetry_request(context: RunContext, inspection: Inspection) -> Document:
    attempts = []
    for attempt_id in inspection.planned_ids:
        result = inspection.results[attempt_id]
        attempts.append(
            {
                "attemptId": attempt_id,
                "role": "retry" if inspection.assignments[attempt_id].get("retryOf") else "measured",
                "nativeResult": copy.deepcopy(result.get("nativeResult")),
                "children": [],
            }
        )
    for phase, role in (("judge", "judge"), ("adjudicate", "adjudicator")):
        jobs = _load_grade_plan(context, phase) or []
        for job in jobs:
            result_path = _grade_job_dir(context, job["jobId"]) / "result.json"
            if not result_path.exists():
                continue
            result = lib.load_json(result_path)
            attempts.append(
                {
                    "attemptId": job["jobId"],
                    "role": role,
                    "nativeResult": copy.deepcopy(result.get("nativeResult")) if isinstance(result, dict) else None,
                    "children": [],
                }
            )
    return {"schemaVersion": 1, "attempts": attempts, "ownership": []}


def _scientific_decision(spec: Document, analysis: Document) -> str:
    candidate = analysis.get("scientificDecision") or analysis.get("decision")
    if candidate in {"adopt", "retain-control", "inconclusive", "descriptive-only"}:
        return candidate
    if analysis.get("status") == "descriptive-only" or spec["analysis"]["decision"]["rule"] == "descriptive-only":
        return "descriptive-only"
    return "inconclusive"


def _report_document(
    context: RunContext,
    inspection: Inspection,
    dataset: Document,
    grades: list[Document],
    telemetry: Document,
    analysis: Document,
    model_analyses: list[Document],
    public: Document,
) -> Document:
    return {
        "schemaVersion": 1,
        "status": "complete",
        "experimentId": context.spec["experimentId"],
        "question": copy.deepcopy(context.spec["question"]),
        "counts": inspection.counts,
        "schedule": copy.deepcopy(context.schedule),
        "dataset": dataset,
        "grades": grades,
        "telemetry": telemetry,
        "analysis": analysis,
        "modelAnalyses": model_analyses,
        "scientificDecision": public["scientificDecision"],
        "limitations": public["limitations"],
        "publicResult": public,
        "completedAt": utc_now(),
    }


def render_markdown(report_document: Document) -> str:
    counts = report_document["counts"]
    decision = report_document.get("scientificDecision") or "not available"
    limitations = report_document.get("limitations", [])
    lines = [
        f"# Benchmark report: {report_document.get('experimentId', 'unknown')}",
        "",
        report_document.get("question", {}).get("text", ""),
        "",
        "## Execution reconciliation",
        "",
        f"- Planned: {counts['planned']}",
        f"- Assigned: {counts['assigned']}",
        f"- Terminal: {counts['terminal']}",
        f"- Failed: {counts['failed']}",
        f"- Unresolved: {counts['unresolved']}",
        f"- Pending: {counts['pending']}",
        "",
        "## Scientific decision",
        "",
        f"**{decision}**",
        "",
        "## Analysis",
        "",
        "```json",
        json.dumps(report_document.get("analysis", {}), ensure_ascii=False, sort_keys=True, indent=2),
        "```",
        "",
        "## Limitations",
        "",
    ]
    if report_document.get("modelAnalyses"):
        position = lines.index("## Limitations")
        lines[position:position] = ["## Model analyses", "", "```json", json.dumps(report_document["modelAnalyses"], ensure_ascii=False, sort_keys=True, indent=2), "```", ""]
    lines.extend(f"- {item}" for item in limitations)
    if not limitations:
        lines.append("- None recorded.")
    return "\n".join(lines).rstrip() + "\n"


def _model_selection(spec: Document, method: Document) -> Document:
    contrasts = [c for c in spec['analysis']['contrasts'] if method.get('contrastId', c['id']) == c['id']]
    if len(contrasts) != 1:
        raise LifecycleError('AMBIGUOUS_MODEL_CONTRAST', 'Each selected model must name contrastId when multiple contrasts exist')
    contrast = contrasts[0]
    metric_id = method.get('metricId', method.get('priors', {}).get('metricId'))
    if metric_id is None and len(contrast['metricIds']) == 1:
        metric_id = contrast['metricIds'][0]
    if metric_id not in contrast['metricIds']:
        raise LifecycleError('AMBIGUOUS_MODEL_METRIC', 'Each selected model must select a metricId in its contrast')
    if method.get("metricId") is not None and method.get("priors", {}).get("metricId", metric_id) != metric_id:
        raise LifecycleError("CONFLICTING_MODEL_METRIC", "model metricId conflicts with priors.metricId")
    metric = next(m for m in spec['analysis']['metrics'] if m['id'] == metric_id)
    return dict(metricId=metric_id, candidateConditionId=contrast['candidateConditionId'],
                controlConditionId=contrast['controlConditionId'], direction=metric['direction'],
                practicalThreshold=spec['analysis']['decision']['practicalThreshold'],
                nonInferiorityMargin=spec['analysis']['decision']['nonInferiorityMargin'],
                scope=spec['question']['scope'], estimand=contrast['estimand'],
                taskWeighting=contrast['taskWeighting'], metricSummary=metric['summary'],
                metricQuantile=metric['quantile'],
                taskWeights={t['id']: (1.0 if contrast['taskWeighting'] == 'equal' else t['weight'])
                             for t in spec['tasks']})


def _saved_or_fit_model(context: RunContext, method: Document, dataset: Document, grades: list[Document], paired: Document) -> Document:
    directory = context.run_dir / 'models' / method['id']
    result_path = directory / 'result.json'
    if result_path.exists():
        return lib.load_json(result_path)
    selection = _model_selection(context.spec, method)
    marker = directory / 'started.json'
    if marker.exists():
        # A stochastic fit with no durable result is not replayed. Preserve every
        # artifact and settle it as an explicit failed fit, never a stuck lease.
        result = {'schemaVersion': 1, 'status': 'failed', 'pairedResult': paired,
                  'selection': selection, 'model': {}, 'diagnostics': [{'code': 'MODEL_FIT_INTERRUPTED', 'severity': 'error', 'message': 'Fit interrupted before its result was saved; retained artifacts are not a validated posterior report.'}],
                  'artifacts': [str(p) for p in sorted(directory.glob('*')) if p.name != 'started.json'],
                  'limitations': ['Interrupted stochastic fit was not relaunched or overwritten. Start a separately labeled analysis to refit.']}
        _publish_json(result_path, result)
        return result
    selected_method = {k: copy.deepcopy(v) for k, v in method.items() if k not in {'metricId', 'contrastId'}}
    selected_method['priors']['metricId'] = selection['metricId']
    model_dataset = copy.deepcopy(dataset)
    metric = next(m for m in context.spec['analysis']['metrics'] if m['id'] == selection['metricId'])
    if metric['source'].startswith('grade.score'):
        criterion = metric['source'].split(':', 1)[1] if ':' in metric['source'] else None
        criteria = {l['criterionId'] for g in grades for l in g.get('labels', [])}
        if criterion is None and len(criteria) != 1:
            raise LifecycleError('AMBIGUOUS_MODEL_CRITERION', 'Select grade.score:<criterionId> for a multi-criterion label model', status='unsupported', phase='analyze')
        criterion = criterion or next(iter(criteria))
        model_dataset['labels'] = [{**copy.deepcopy(g), 'labels': [{**copy.deepcopy(l), 'metricId': selection['metricId']} for l in g.get('labels', []) if l['criterionId'] == criterion]} for g in grades]
    _publish_json(marker, {'method': method, 'selection': selection})
    result = _analyze_model({'schemaVersion': 1, 'method': selected_method, 'dataset': model_dataset,
                            'pairedResult': selection, 'artifactDirectory': str(directory)})
    result['pairedResult'] = copy.deepcopy(paired)
    result['selection'] = selection
    _publish_json(result_path, result)
    return result

def finalize(context: RunContext, inspection: Inspection) -> Document:
    if inspection.pending_ids or inspection.ambiguous_ids or inspection.errors or len(inspection.terminals) != len(inspection.planned_ids):
        raise LifecycleError("RECONCILIATION_INCOMPLETE", "exact planned/terminal ID reconciliation has not completed", status="blocked", phase="finalize")
    if set(inspection.assignments) != set(inspection.planned_ids) or set(inspection.results) != set(inspection.planned_ids) or set(inspection.terminals) != set(inspection.planned_ids):
        raise LifecycleError("RECONCILIATION_MISMATCH", "assignment, result, and terminal IDs are not exactly complete", status="blocked", phase="finalize")
    if context.spec["grading"]["method"] != "deterministic":
        for phase in ("judge", "adjudicate"):
            jobs = _load_grade_plan(context, phase)
            if jobs is None:
                raise LifecycleError("RECONCILIATION_INCOMPLETE", f"frozen {phase} plan is missing", status="blocked", phase="finalize")
            pending, ambiguous, recoverable, complete_jobs = _grade_job_state(context, jobs, phase)
            if pending or ambiguous or recoverable or len(complete_jobs) != len(jobs):
                raise LifecycleError("RECONCILIATION_INCOMPLETE", f"{phase} job IDs are not exactly complete", status="blocked", phase="finalize")
    grades = _load_all_grades(context)
    dataset = _dataset(context, inspection)
    telemetry_path = context.run_dir / "telemetry.json"
    telemetry = lib.load_json(telemetry_path) if telemetry_path.exists() else _aggregate_telemetry(_telemetry_request(context, inspection))
    _publish_json(telemetry_path, telemetry)
    analysis_request = {
        "schemaVersion": 1,
        "resolvedSpec": copy.deepcopy(context.spec),
        "schedule": copy.deepcopy(context.schedule),
        "dataset": dataset,
        "grades": grades,
        "telemetry": telemetry,
    }
    paired_path = context.run_dir / "paired-analysis.json"
    analysis = lib.load_json(paired_path) if paired_path.exists() else _analyze(analysis_request)
    _publish_json(paired_path, analysis)
    if analysis.get("status") == "unsupported":
        raise LifecycleError("ANALYSIS_UNSUPPORTED", "selected analysis method is unsupported", status="unsupported", phase="analyze", limitations=analysis.get("limitations", []))
    if analysis.get("status") == "failed":
        raise LifecycleError("ANALYSIS_FAILED", "selected analysis failed", phase="analyze", limitations=analysis.get("limitations", []))
    model_analyses: list[Document] = []
    paired_result = analysis
    for method in context.spec["analysis"]["models"]:
        model_result = _saved_or_fit_model(context, method, dataset, grades, analysis)
        model_analyses.append(model_result)
        if model_result.get("status") == "unsupported":
            raise LifecycleError(
                "MODEL_ANALYSIS_UNSUPPORTED",
                f"selected model analysis {method['id']!r} is unsupported",
                status="unsupported",
                phase="analyze",
                limitations=model_result.get("limitations", []),
            )
        if model_result.get("status") == "failed":
            raise LifecycleError(
                "MODEL_ANALYSIS_FAILED",
                f"selected model analysis {method['id']!r} failed",
                phase="analyze",
                limitations=model_result.get("limitations", []),
            )
        paired_result = model_result.get("pairedResult", paired_result)
    _publish_json(context.run_dir / "analysis.json", {"pairedResult": analysis, "modelAnalyses": model_analyses})
    limitations: list[str] = ["maxWallTimeSeconds stops admission between waves per invocation; it does not cancel in-flight calls or bound final analysis.", "timeoutMs requests an override only; Fabric ignores values below its configured timeout floor. No lower per-call enforcement is claimed."]
    if context.spec["question"]["scope"] == "finite-task-set":
        limitations.append("Results apply to the declared finite task set; no task-population claim was made.")
    for source in (telemetry, analysis, *model_analyses):
        for item in source.get("limitations", []) if isinstance(source, dict) else []:
            if isinstance(item, str):
                limitations.append(item)
    for guard in ("tokenGuard", "costGuard"):
        if context.spec["stoppingAndBudgets"].get(guard) is not None:
            limitations.append(f"{guard} is observational unless the selected backend reports pre-consumption enforcement.")
    decision = _scientific_decision(context.spec, analysis)
    report_paths = {
        "json": os.fspath(context.run_dir / "report.json"),
        "markdown": os.fspath(context.run_dir / "report.md"),
    }
    public = public_result(
        context.run_dir,
        status="complete",
        phase="complete",
        counts=inspection.counts,
        next_action=None,
        errors=[],
        limitations=limitations,
        report_paths=report_paths,
        decision=decision,
    )
    report_document = _report_document(context, inspection, dataset, grades, telemetry, analysis, model_analyses, public)
    markdown = render_markdown(report_document).encode("utf-8")
    _publish_bytes(context.run_dir / "report.md", markdown)
    _publish_json(context.run_dir / "report.json", report_document)
    return public


def _saved_complete_result(run_dir: Path) -> Document | None:
    path = run_dir / "report.json"
    if not path.exists():
        return None
    try:
        report_document = lib.load_json(path)
    except lib.BenchmarkError as exc:
        raise LifecycleError("MALFORMED_REPORT", str(exc), status="blocked", phase="inspect") from None
    if not isinstance(report_document, dict) or report_document.get("status") != "complete":
        raise LifecycleError("MALFORMED_REPORT", "authoritative report.json is not a current complete report; inspect an old-format report with scripts/inspect_legacy_report.py PATH (read-only)", status="blocked", phase="inspect")
    public = report_document.get("publicResult")
    _schema_validate(public, PUBLIC_RESULT_SCHEMA_PATH, os.fspath(path))
    markdown_path = run_dir / "report.md"
    if not markdown_path.is_file():
        raise LifecycleError("MALFORMED_REPORT", "authoritative report.json exists without report.md", status="blocked", phase="inspect")
    try:
        spec = lib.load_json(run_dir / "spec.json")
        schedule = lib.load_json(run_dir / "schedule.json")
    except lib.BenchmarkError as exc:
        raise LifecycleError("MALFORMED_REPORT", f"complete report has unreadable inputs: {exc}", status="blocked", phase="inspect") from None
    if not isinstance(spec, dict):
        raise LifecycleError("MALFORMED_REPORT", "complete report has a malformed saved spec", status="blocked", phase="inspect")
    _schema_validate(spec, SPEC_SCHEMA_PATH, os.fspath(run_dir / "spec.json"))
    validate_spec_semantics(spec)
    validate_schedule(schedule, spec)
    context = RunContext(run_dir=run_dir, spec=spec, schedule=schedule)
    inspection = inspect_records(context)
    expected_ids = set(inspection.planned_ids)
    if (
        inspection.pending_ids
        or inspection.recoverable_ids
        or inspection.ambiguous_ids
        or inspection.errors
        or set(inspection.assignments) != expected_ids
        or set(inspection.results) != expected_ids
        or set(inspection.terminals) != expected_ids
    ):
        raise LifecycleError(
            "REPORT_RECONCILIATION_MISMATCH",
            "authoritative report.json no longer has exact complete assignment/result/terminal ID reconciliation",
            status="blocked",
            phase="inspect",
        )
    if spec["grading"]["method"] != "deterministic":
        for phase in ("judge", "adjudicate"):
            jobs = _load_grade_plan(context, phase)
            if jobs is None:
                raise LifecycleError("REPORT_RECONCILIATION_MISMATCH", f"complete report has no frozen {phase} plan", status="blocked", phase="inspect")
            pending, ambiguous, recoverable, complete_jobs = _grade_job_state(context, jobs, phase)
            if pending or ambiguous or recoverable or len(complete_jobs) != len(jobs):
                raise LifecycleError("REPORT_RECONCILIATION_MISMATCH", f"complete report has incomplete {phase} job IDs", status="blocked", phase="inspect")
    if report_document.get("counts") != inspection.counts or public.get("counts") != inspection.counts:
        raise LifecycleError("REPORT_RECONCILIATION_MISMATCH", "saved report counts differ from authoritative records", status="blocked", phase="inspect")
    try:
        expected_markdown = render_markdown(report_document)
        actual_markdown = markdown_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise LifecycleError("MALFORMED_REPORT", f"cannot read report.md: {exc}", status="blocked", phase="inspect") from None
    if actual_markdown != expected_markdown:
        raise LifecycleError("MALFORMED_REPORT", "report.md differs from the authoritative report.json view", status="blocked", phase="inspect")
    return public


def _verify_complete_request(materialized: MaterializedSpec, run_dir: Path) -> Document | None:
    public = _saved_complete_result(run_dir)
    if public is None:
        return None
    saved_path = run_dir / "spec.json"
    try:
        saved = lib.load_json(saved_path)
    except lib.BenchmarkError as exc:
        raise LifecycleError("INVALID_SAVED_SPEC", str(exc), status="blocked") from None
    if not _same_json(saved, materialized.resolved):
        raise LifecycleError("SPEC_MISMATCH", "supplied specification differs from the completed run", status="blocked")
    for relative, supplied in materialized.inputs.items():
        try:
            frozen = (run_dir / relative).read_bytes()
        except OSError as exc:
            raise LifecycleError("INPUT_COPY_MISSING", f"cannot read frozen input: {exc}", status="blocked") from None
        if frozen != supplied:
            raise LifecycleError("SPEC_MISMATCH", f"source input differs from frozen local copy: {relative}", status="blocked")
    return public


def execute_run(request: Mapping[str, Any], *, dispatch: Dispatch) -> Document:
    run_dir = Path(os.path.abspath(os.fspath(request.get("outputDirectory", ".")))) if isinstance(request, Mapping) else Path.cwd()
    try:
        _, spec_path, run_dir = validate_run_request(request)
        materialized = materialize_spec(spec_path)
        complete = _verify_complete_request(materialized, run_dir) if run_dir.exists() else None
        if complete is not None:
            return complete
        capability_error = selected_capability_error(materialized.resolved, dispatch)
        if capability_error is not None:
            return _error_result(run_dir, capability_error)
        token = acquire_lock(run_dir)
    except LifecycleError as exc:
        return _error_result(run_dir, exc)

    try:
        context = initialize_or_resume(materialized, run_dir)
        inspection = reconcile_recoverable(context)
        blocked = _blocked_from_inspection(context, inspection)
        if blocked is not None:
            _checkpoint(context, inspection, "execute", calls_admitted=0)
            return blocked
        budget = invocation_budget(context, dispatch, inspection)
        if budget.limit == 0 and inspection.pending_ids:
            status = "blocked" if budget.remaining_global == 0 else "checkpoint"
            code = "DIRECT_CALL_BUDGET_EXHAUSTED" if budget.remaining_global == 0 else "ZERO_USABLE_INVOCATION_BUDGET"
            result = public_result(
                context.run_dir,
                status=status,
                phase="execute",
                counts=inspection.counts,
                next_action="Start a new invocation with available call budget." if status == "checkpoint" else "The saved global direct-call budget cannot admit pending work.",
                errors=[{"code": code, "message": "No pending call can be admitted.", "workId": None}],
                limitations=[],
            )
            _checkpoint(context, inspection, "execute", calls_admitted=0)
            return result

        admitted = 0
        deadline = time.monotonic() + float(context.spec["stoppingAndBudgets"]["maxWallTimeSeconds"])
        concurrency = 1 if "taskState" in context.spec else min(context.spec["design"]["concurrency"]["max"], HARD_INVOCATION_CALL_CEILING)
        while admitted < budget.limit:
            inspection = reconcile_recoverable(context)
            blocked = _blocked_from_inspection(context, inspection)
            if blocked is not None:
                _checkpoint(context, inspection, "execute", calls_admitted=admitted)
                return blocked
            if not inspection.pending_ids:
                break
            if time.monotonic() >= deadline:
                break
            wave_ids = inspection.pending_ids[: min(concurrency, budget.limit - admitted)]
            assignments: list[Document] = []
            for attempt_id in wave_ids:
                assignments.append(publish_assignment(context, _row_for_id(context, inspection, attempt_id)))
            admitted += len(assignments)
            results = _dispatch_wave(dispatch, assignments)
            for assignment, result_record in zip(assignments, results, strict=True):
                publish_result(context, assignment["attemptId"], result_record)
                if (
                    result_record["dispatchStatus"] != "completed"
                    or context.spec["grading"]["method"] == "deterministic"
                ):
                    derive_terminal(context, assignment["attemptId"], assignment, result_record)
            inspection = inspect_records(context)
            _checkpoint(context, inspection, "execute", calls_admitted=admitted)

        inspection = reconcile_recoverable(context)
        blocked = _blocked_from_inspection(context, inspection)
        if blocked is not None:
            _checkpoint(context, inspection, "execute", calls_admitted=admitted)
            return blocked
        grading_complete = context.spec["grading"]["method"] == "deterministic"
        if not inspection.pending_ids and not grading_complete:
            while admitted < budget.limit and time.monotonic() < deadline:
                used, grading_complete = advance_model_grading(
                    context,
                    inspection,
                    dispatch,
                    maximum_calls=min(concurrency, budget.limit - admitted),
                )
                admitted += used
                inspection = inspect_records(context)
                _checkpoint(context, inspection, "grade", calls_admitted=admitted)
                if grading_complete or used == 0:
                    break
            inspection = reconcile_recoverable(context)
        if not inspection.pending_ids and grading_complete and not inspection.recoverable_ids:
            return finalize(context, inspection)
        phase = "grade" if not inspection.pending_ids else "execute"
        if phase == "grade" and budget.remaining_global <= admitted:
            status = "blocked"
            errors = [{"code": "DIRECT_CALL_BUDGET_EXHAUSTED", "message": "The saved direct-call budget cannot admit remaining grading work.", "workId": None}]
            next_action = "Start a new experiment with a sufficient frozen direct-call budget."
        else:
            status = "checkpoint"
            errors = []
            next_action = "Repeat the identical run request; pending work is selected internally."
        _checkpoint(context, inspection, phase, calls_admitted=admitted)
        return public_result(
            context.run_dir,
            status=status,
            phase=phase,
            counts=inspection.counts,
            next_action=next_action,
            errors=errors,
            limitations=[],
        )
    except LifecycleError as exc:
        return _error_result(run_dir, exc)
    except Exception as exc:
        return _error_result(
            run_dir,
            LifecycleError("INTERNAL_ERROR", f"unexpected lifecycle failure: {type(exc).__name__}: {exc}"),
        )
    finally:
        try:
            release_lock(run_dir, token)
        except LifecycleError:
            # A failed normal release is represented by the surviving lock itself.
            pass


def inspect_report(request: Mapping[str, Any]) -> Document:
    run_dir = Path(os.path.abspath(os.fspath(request.get("outputDirectory", ".")))) if isinstance(request, Mapping) else Path.cwd()
    try:
        _, run_dir, _ = validate_report_request(request)
        complete = _saved_complete_result(run_dir)
        if complete is not None:
            return complete
        spec_path = run_dir / "spec.json"
        schedule_path = run_dir / "schedule.json"
        if not spec_path.exists() or not schedule_path.exists():
            raise LifecycleError("RUN_NOT_INITIALIZED", "run directory has no current saved spec and schedule; inspect an old-format report with scripts/inspect_legacy_report.py PATH (read-only)", status="failed", phase="inspect")
        spec = lib.load_json(spec_path)
        schedule = lib.load_json(schedule_path)
        if not isinstance(spec, dict):
            raise LifecycleError("INVALID_SAVED_SPEC", "saved spec is not an object", status="blocked", phase="inspect")
        _schema_validate(spec, SPEC_SCHEMA_PATH, os.fspath(spec_path))
        validate_spec_semantics(spec)
        validate_schedule(schedule, spec)
        context = RunContext(run_dir=run_dir, spec=spec, schedule=schedule)
        inspection = inspect_records(context)
        blocked = _blocked_from_inspection(context, inspection)
        if blocked is not None:
            blocked["phase"] = "inspect"
            return blocked
        phase = "finalize" if not inspection.pending_ids and len(inspection.terminals) == len(inspection.planned_ids) else "execute"
        limitations: list[str] = []
        if spec["grading"]["method"] != "deterministic":
            phase = "grade" if not inspection.pending_ids else phase
            for grade_phase in ("judge", "adjudicate"):
                jobs = _load_grade_plan(context, grade_phase)
                if jobs is None:
                    continue
                pending_jobs, ambiguous_jobs, recoverable_jobs, _ = _grade_job_state(context, jobs, grade_phase)
                if ambiguous_jobs:
                    job = ambiguous_jobs[0]
                    return public_result(
                        run_dir,
                        status="blocked",
                        phase="inspect",
                        counts=inspection.counts,
                        next_action=f"Inspect available runtime output for grade job {job['jobId']}; do not relaunch it automatically.",
                        errors=[{"code": "AMBIGUOUS_ASSIGNED_GRADE_JOB", "message": "Grade assignment exists without a native result.", "workId": job["jobId"]}],
                        limitations=["Reporting did not repair or replay the ambiguous grade job."],
                    )
                if pending_jobs:
                    limitations.append(f"{len(pending_jobs)} frozen {grade_phase} jobs are pending assignment.")
                if recoverable_jobs:
                    limitations.append(f"{len(recoverable_jobs)} complete {grade_phase} results await deterministic label publication by run.")
        checkpoint_path = run_dir / "checkpoint.json"
        if checkpoint_path.exists():
            try:
                checkpoint = lib.load_json(checkpoint_path)
                if not isinstance(checkpoint, dict) or checkpoint.get("counts") != inspection.counts:
                    limitations.append("checkpoint.json is stale; displayed counts come from authoritative records.")
            except lib.BenchmarkError:
                limitations.append("checkpoint.json is malformed; displayed counts come from authoritative records.")
        if inspection.recoverable_ids:
            limitations.append("Complete saved results still need deterministic terminal publication by run; report did not repair them.")
        return public_result(
            run_dir,
            status="checkpoint",
            phase="inspect",
            counts=inspection.counts,
            next_action="Repeat the identical run request to continue or finalize saved work.",
            errors=[],
            limitations=limitations,
        )
    except (LifecycleError, lib.BenchmarkError) as exc:
        if isinstance(exc, LifecycleError):
            return _error_result(run_dir, exc)
        return _error_result(run_dir, LifecycleError("INVALID_SAVED_RECORD", str(exc), status="blocked", phase="inspect"))


def read_report_view(run_dir: Path, format_name: str) -> str:
    """Render a report view in memory without publishing or repairing anything."""
    path = run_dir / "report.json"
    if path.exists():
        value = lib.load_json(path)
        if format_name == "markdown":
            markdown = run_dir / "report.md"
            if markdown.exists():
                return markdown.read_text(encoding="utf-8")
            if isinstance(value, dict):
                return render_markdown(value)
        return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    compact = inspect_report({"outputDirectory": os.fspath(run_dir), "format": format_name})
    if format_name == "json":
        return json.dumps(compact, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    counts = compact["counts"]
    lines = [
        "# Benchmark report (incomplete)",
        "",
        f"Status: **{compact['status']}**",
        "",
        f"Planned {counts['planned']}; assigned {counts['assigned']}; terminal {counts['terminal']}; unresolved {counts['unresolved']}; pending {counts['pending']}.",
    ]
    if compact["nextAction"]:
        lines.extend(["", f"Next action: {compact['nextAction']}"])
    return "\n".join(lines) + "\n"
