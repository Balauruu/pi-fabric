"""Resolved-plan task-paired analysis for the refactored benchmark runner."""

from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
import copy
import math
from pathlib import Path
from typing import Any

import benchmark_lib as lib
import generate_schedule as schedules
import statistical_core as core

_FAILURE_STATUSES = (
    "agent-failure",
    "timeout",
    "cancelled",
    "infrastructure-failure",
    "evaluator-failure",
    "treatment-unverified",
    "unresolved",
)
_ATTEMPT_STATUSES = frozenset(("succeeded",) + _FAILURE_STATUSES)


def _mapping(value: Any, field: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise lib.InputError(f"{field}: expected an object")
    return value


def _array(value: Any, field: str) -> list[Any]:
    if not isinstance(value, list):
        raise lib.InputError(f"{field}: expected an array")
    return value


def _finite(value: Any, field: str) -> float:
    try:
        return core.finite_number(value, field)
    except ValueError as exc:
        raise lib.InputError(str(exc)) from exc


def _unique_objects(values: Any, field: str) -> tuple[list[Mapping[str, Any]], dict[str, Mapping[str, Any]]]:
    items = _array(values, field)
    result: list[Mapping[str, Any]] = []
    by_id: dict[str, Mapping[str, Any]] = {}
    for index, value in enumerate(items):
        item = _mapping(value, f"{field}[{index}]")
        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id:
            raise lib.InputError(f"{field}[{index}].id: expected a non-empty string")
        if item_id in by_id:
            raise lib.ContractError((f"{field}: duplicate ID {item_id!r}",))
        result.append(item)
        by_id[item_id] = item
    return result, by_id


def _status_actions(metric: Mapping[str, Any]) -> dict[str, Mapping[str, Any]]:
    actions: dict[str, Mapping[str, Any]] = {}
    for index, value in enumerate(_array(metric.get("statusActions"), f"metric {metric.get('id')!r}.statusActions")):
        item = _mapping(value, f"metric {metric.get('id')!r}.statusActions[{index}]")
        status = item.get("status")
        if status not in _FAILURE_STATUSES:
            raise lib.InputError(f"metric {metric.get('id')!r}: unknown mapped status {status!r}")
        if status in actions:
            raise lib.ContractError((f"metric {metric.get('id')!r}: duplicate status action {status!r}",))
        action = item.get("action")
        if action not in {"score", "missing", "bound", "refuse"}:
            raise lib.InputError(f"metric {metric.get('id')!r}: unknown status action {action!r}")
        mapped_value = item.get("value")
        if action == "score":
            _finite(mapped_value, f"metric {metric.get('id')!r} status {status!r} value")
        elif mapped_value is not None:
            raise lib.InputError(
                f"metric {metric.get('id')!r} status {status!r}: only score actions accept a value"
            )
        actions[str(status)] = item
    if set(actions) != set(_FAILURE_STATUSES):
        raise lib.ContractError((
            f"metric {metric.get('id')!r}: status map must name every failure status exactly once",
        ))
    return actions


def _outcome_by_metric(row: Mapping[str, Any], attempt_id: str) -> dict[str, Mapping[str, Any]]:
    result: dict[str, Mapping[str, Any]] = {}
    for index, value in enumerate(_array(row.get("outcomes"), f"dataset row {attempt_id!r}.outcomes")):
        outcome = _mapping(value, f"dataset row {attempt_id!r}.outcomes[{index}]")
        metric_id = outcome.get("metricId")
        if not isinstance(metric_id, str) or not metric_id:
            raise lib.InputError(f"dataset row {attempt_id!r}: outcome metricId is invalid")
        if metric_id in result:
            raise lib.ContractError((f"dataset row {attempt_id!r}: duplicate outcome {metric_id!r}",))
        result[metric_id] = outcome
    return result


def _map_outcomes(
    row: Mapping[str, Any],
    *,
    attempt_id: str,
    metrics: Sequence[Mapping[str, Any]],
    actions_by_metric: Mapping[str, Mapping[str, Mapping[str, Any]]],
) -> tuple[dict[str, float | None], list[dict[str, Any]], list[str]]:
    attempt_status = row.get("attemptStatus")
    if attempt_status not in _ATTEMPT_STATUSES:
        raise lib.InputError(f"dataset row {attempt_id!r}: unknown attemptStatus {attempt_status!r}")
    outcomes = _outcome_by_metric(row, attempt_id)
    unknown = sorted(set(outcomes) - {str(metric["id"]) for metric in metrics})
    if unknown:
        raise lib.ContractError((f"dataset row {attempt_id!r}: unplanned outcomes {unknown}",))
    mapped: dict[str, float | None] = {}
    records: list[dict[str, Any]] = []
    refusals: list[str] = []
    for metric in metrics:
        metric_id = str(metric["id"])
        outcome = outcomes.get(metric_id)
        raw_status = None if outcome is None else outcome.get("status")
        raw_value = None if outcome is None else outcome.get("value")
        if attempt_status == "succeeded":
            if outcome is None or raw_status != "observed":
                raise lib.ContractError((
                    f"successful dataset row {attempt_id!r} lacks observed metric {metric_id!r}",
                ))
            value = _finite(raw_value, f"dataset row {attempt_id!r} metric {metric_id!r}")
            action = "observed"
        else:
            rule = actions_by_metric[metric_id][str(attempt_status)]
            action = str(rule["action"])
            value = _finite(rule["value"], f"status map {metric_id!r}/{attempt_status!r}") if action == "score" else None
            if action == "refuse":
                refusals.append(f"{attempt_id}:{metric_id}:{attempt_status}")
        mapped[metric_id] = value
        records.append(
            {
                "metricId": metric_id,
                "rawStatus": raw_status,
                "rawValue": raw_value,
                "mappingAction": action,
                "mappedValue": value,
                "available": value is not None,
            }
        )
    return mapped, records, refusals


def _retry_chains(
    schedule_rows: Sequence[Mapping[str, Any]],
    rows_by_id: Mapping[str, Mapping[str, Any]],
    retry_plan: Mapping[str, Any],
) -> tuple[dict[str, list[str]], dict[str, str], dict[str, str]]:
    schedule_by_id = {str(row["attemptId"]): row for row in schedule_rows}
    children: dict[str, list[str]] = defaultdict(list)
    roots: list[str] = []
    for attempt_id, row in schedule_by_id.items():
        parent = row.get("retryOf")
        if parent is None:
            roots.append(attempt_id)
        else:
            if parent not in schedule_by_id:
                raise lib.ContractError((f"retry {attempt_id!r} names unknown parent {parent!r}",))
            parent_row = schedule_by_id[str(parent)]
            identity = ("taskId", "conditionId", "repetition")
            if any(row.get(name) != parent_row.get(name) for name in identity):
                raise lib.ContractError((f"retry {attempt_id!r} changes its task/condition/repetition cell",))
            children[str(parent)].append(attempt_id)
    if any(len(values) > 1 for values in children.values()):
        raise lib.ContractError(("retry chains must not branch",))

    chains: dict[str, list[str]] = {}
    root_by_attempt: dict[str, str] = {}
    max_retries = retry_plan.get("maxRetries")
    if isinstance(max_retries, bool) or not isinstance(max_retries, int) or max_retries < 0:
        raise lib.InputError("analysis.retryPolicy.maxRetries must be a non-negative integer")
    for root in roots:
        chain = [root]
        seen = {root}
        while children.get(chain[-1]):
            child = children[chain[-1]][0]
            if child in seen:
                raise lib.ContractError((f"retry chain rooted at {root!r} contains a cycle",))
            seen.add(child)
            chain.append(child)
        if len(chain) - 1 > max_retries:
            raise lib.ContractError((f"retry chain rooted at {root!r} exceeds the saved maximum",))
        chains[root] = chain
        for attempt_id in chain:
            root_by_attempt[attempt_id] = root
    if set(root_by_attempt) != set(schedule_by_id):
        raise lib.ContractError(("one or more retry schedule rows are disconnected",))

    eligible = set(retry_plan.get("eligibleStatuses", []))
    production: dict[str, str] = {}
    for root, chain in chains.items():
        chosen = root
        for index, attempt_id in enumerate(chain):
            chosen = attempt_id
            status = rows_by_id[attempt_id]["attemptStatus"]
            has_retry = index + 1 < len(chain)
            if status == "succeeded":
                if has_retry:
                    raise lib.ContractError((f"successful attempt {attempt_id!r} has an ineligible retry",))
                break
            if has_retry and status not in eligible:
                raise lib.ContractError((
                    f"attempt {attempt_id!r} status {status!r} is not eligible for its saved retry",
                ))
        production[root] = chosen
    return chains, {root: root for root in roots}, production


def build_context(request: Mapping[str, Any]) -> dict[str, Any]:
    """Validate and map the complete schedule/dataset without survivor filtering."""
    expected_keys = {"schemaVersion", "resolvedSpec", "schedule", "dataset", "grades", "telemetry"}
    if set(request) != expected_keys:
        raise lib.InputError(
            "analyze_paired request must contain exactly " + ", ".join(sorted(expected_keys))
        )
    if request.get("schemaVersion") != 1:
        raise lib.InputError("analyze_paired request.schemaVersion must be 1")
    spec = _mapping(request.get("resolvedSpec"), "resolvedSpec")
    # Standalone analysis must not silently ignore unknown saved policy fields.
    # Use the public schema, not a second drifting analysis-key allowlist.
    schema = lib.load_json(Path(__file__).resolve().parents[1] / "schemas" / "spec.schema.json")
    issues = lib.validate_json_schema(spec, schema)
    if issues:
        raise lib.ContractError(tuple(f"resolvedSpec: {issue}" for issue in issues))
    schedule = _mapping(request.get("schedule"), "schedule")
    dataset = _mapping(request.get("dataset"), "dataset")
    if dataset.get("schemaVersion") != 1:
        raise lib.InputError("dataset.schemaVersion must be 1")
    if schedule.get("experimentId") != spec.get("experimentId"):
        raise lib.ContractError(("schedule experimentId does not match the resolved specification",))
    schedules._validate_schedule_document(schedule)

    tasks, tasks_by_id = _unique_objects(spec.get("tasks"), "resolvedSpec.tasks")
    conditions, conditions_by_id = _unique_objects(spec.get("conditions"), "resolvedSpec.conditions")
    analysis = _mapping(spec.get("analysis"), "resolvedSpec.analysis")
    metrics, metrics_by_id = _unique_objects(analysis.get("metrics"), "resolvedSpec.analysis.metrics")
    contrasts, contrasts_by_id = _unique_objects(analysis.get("contrasts"), "resolvedSpec.analysis.contrasts")
    if not metrics or not contrasts:
        raise lib.InputError("analysis needs at least one metric and contrast")
    actions_by_metric = {str(metric["id"]): _status_actions(metric) for metric in metrics}
    missingness_plan = _mapping(analysis.get("missingness"), "resolvedSpec.analysis.missingness")
    global_actions = _status_actions({"id": "analysis.missingness", "statusActions": missingness_plan.get("statusActions")})
    # Global eligibility is a ceiling, not a second ignored score map. A metric
    # may be more conservative and supplies its own unit-specific score only
    # when both maps permit scoring. Refuse > bound > missing > score.
    priority = {"score": 0, "missing": 1, "bound": 2, "refuse": 3}
    for metric_actions in actions_by_metric.values():
        for status, global_rule in global_actions.items():
            if priority[global_rule["action"]] > priority[metric_actions[status]["action"]]:
                metric_actions[status] = global_rule

    condition_order = list(_mapping(schedule.get("assignment"), "schedule.assignment").get("conditionOrder", []))
    if set(condition_order) != set(conditions_by_id):
        raise lib.ContractError(("schedule condition order does not match the resolved conditions",))
    design = _mapping(spec.get("design"), "resolvedSpec.design")
    saved_assignment = _mapping(design.get("assignment"), "resolvedSpec.design.assignment")
    if schedule["assignment"].get("method") != saved_assignment.get("method"):
        raise lib.ContractError(("schedule assignment method differs from the saved design",))
    if schedule["assignment"].get("conditioning") != saved_assignment.get("conditioning"):
        raise lib.ContractError(("schedule conditioning differs from the saved design",))

    schedule_rows = [_mapping(row, f"schedule.rows[{index}]") for index, row in enumerate(schedule["rows"])]
    schedule_by_id = {str(row["attemptId"]): row for row in schedule_rows}
    dataset_rows = _array(dataset.get("rows"), "dataset.rows")
    rows_by_id: dict[str, Mapping[str, Any]] = {}
    mapped_by_id: dict[str, dict[str, float | None]] = {}
    mapped_table: list[dict[str, Any]] = []
    refusals: list[str] = []
    for index, raw in enumerate(dataset_rows):
        row = _mapping(raw, f"dataset.rows[{index}]")
        attempt_id = row.get("attemptId")
        if not isinstance(attempt_id, str) or not attempt_id:
            raise lib.InputError(f"dataset.rows[{index}].attemptId is invalid")
        if attempt_id in rows_by_id:
            raise lib.ContractError((f"duplicate dataset attempt ID {attempt_id!r}",))
        scheduled = schedule_by_id.get(attempt_id)
        if scheduled is None:
            raise lib.ContractError((f"dataset attempt {attempt_id!r} is not scheduled",))
        for name in (
            "taskId", "conditionId", "repetition", "blockId", "blockIndex",
            "orderPosition", "retryOf",
        ):
            if row.get(name) != scheduled.get(name):
                raise lib.ContractError((f"dataset attempt {attempt_id!r} differs from schedule field {name}",))
        mapped, outcome_records, row_refusals = _map_outcomes(
            row,
            attempt_id=attempt_id,
            metrics=metrics,
            actions_by_metric=actions_by_metric,
        )
        rows_by_id[attempt_id] = row
        mapped_by_id[attempt_id] = mapped
        refusals.extend(row_refusals)
        mapped_table.append(
            {
                "attemptId": attempt_id,
                "taskId": row["taskId"],
                "family": row.get("family"),
                "stratum": row.get("stratum"),
                "conditionId": row["conditionId"],
                "repetition": row["repetition"],
                "blockId": row["blockId"],
                "blockIndex": row["blockIndex"],
                "orderPosition": row["orderPosition"],
                "retryOf": row.get("retryOf"),
                "attemptStatus": row["attemptStatus"],
                "outcomes": outcome_records,
                "gradeIds": list(row.get("gradeIds", [])),
                "telemetry": copy.deepcopy(row.get("telemetry", {})),
            }
        )
    missing_rows = sorted(set(schedule_by_id) - set(rows_by_id))
    if missing_rows:
        raise lib.ContractError((f"dataset omits scheduled attempts: {missing_rows}",))

    for task in tasks:
        weight = _finite(task.get("weight"), f"task {task['id']!r}.weight")
        if weight <= 0:
            raise lib.InputError(f"task {task['id']!r}.weight must be positive")
    for contrast in contrasts:
        candidate = contrast.get("candidateConditionId")
        control = contrast.get("controlConditionId")
        if candidate == control or candidate not in conditions_by_id or control not in conditions_by_id:
            raise lib.ContractError((f"contrast {contrast['id']!r} has invalid conditions",))
        metric_ids = contrast.get("metricIds")
        if not isinstance(metric_ids, list) or not metric_ids or len(set(metric_ids)) != len(metric_ids):
            raise lib.InputError(f"contrast {contrast['id']!r}.metricIds must be a unique non-empty array")
        unknown_metrics = sorted(set(metric_ids) - set(metrics_by_id))
        if unknown_metrics:
            raise lib.ContractError((f"contrast {contrast['id']!r} names unknown metrics {unknown_metrics}",))

    retry_plan = _mapping(analysis.get("retryPolicy"), "analysis.retryPolicy")
    chains, first_selection, production_selection = _retry_chains(schedule_rows, rows_by_id, retry_plan)
    estimand = retry_plan.get("estimand")
    if estimand not in {"first-attempt", "production-policy", "both"}:
        raise lib.InputError(f"unknown retry estimand {estimand!r}")
    selection = first_selection if estimand == "first-attempt" else production_selection
    selected_values = {
        root: mapped_by_id[selected] for root, selected in selection.items()
    }
    base_rows = [row for row in schedule_rows if row.get("retryOf") is None]

    base_cells = Counter((row["taskId"], row["conditionId"], row["repetition"]) for row in base_rows)
    repetitions = design.get("repetitions")
    expected_cells = {
        (task["id"], condition["id"], repetition)
        for task in tasks
        for condition in conditions
        for repetition in range(1, int(repetitions) + 1)
    }
    if set(base_cells) != expected_cells or any(value != 1 for value in base_cells.values()):
        raise lib.ContractError(("base schedule is not a complete task-condition-repetition dataset",))

    block_rows: dict[int, list[Mapping[str, Any]]] = defaultdict(list)
    for row in base_rows:
        block_rows[int(row["blockIndex"])].append(row)
    ordered_blocks = [
        sorted(rows, key=lambda row: int(row["orderPosition"]))
        for _, rows in sorted(block_rows.items())
    ]

    return {
        "request": request,
        "spec": spec,
        "analysis": analysis,
        "schedule": schedule,
        "tasks": tasks,
        "tasksById": tasks_by_id,
        "conditions": conditions,
        "conditionsById": conditions_by_id,
        "metrics": metrics,
        "metricsById": metrics_by_id,
        "contrasts": contrasts,
        "contrastsById": contrasts_by_id,
        "scheduleRows": schedule_rows,
        "baseRows": base_rows,
        "orderedBlocks": ordered_blocks,
        "rowsById": rows_by_id,
        "mappedById": mapped_by_id,
        "mappedTable": mapped_table,
        "refusals": refusals,
        "retryChains": chains,
        "firstSelection": first_selection,
        "productionSelection": production_selection,
        "selection": selection,
        "selectedValues": selected_values,
    }


def hypotheses(context: Mapping[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for contrast in context["contrasts"]:
        for metric_id in contrast["metricIds"]:
            metric = context["metricsById"][metric_id]
            result.append(
                {
                    "id": f"{contrast['id']}.{metric_id}",
                    "contrastId": contrast["id"],
                    "metricId": metric_id,
                    "candidateConditionId": contrast["candidateConditionId"],
                    "controlConditionId": contrast["controlConditionId"],
                    "role": contrast["role"],
                    "estimand": contrast["estimand"],
                    "taskWeighting": contrast["taskWeighting"],
                    "direction": metric["direction"],
                    "unit": metric["unit"],
                    "summary": metric["summary"],
                    "quantile": metric["quantile"],
                }
            )
    return result


def _fill_value(hypothesis: Mapping[str, Any], assigned_condition: str, mode: str, bounds: tuple[float, float]) -> float:
    lower, upper = bounds
    sign = 1.0 if hypothesis["direction"] == "higher" else -1.0
    candidate = hypothesis["candidateConditionId"]
    control = hypothesis["controlConditionId"]
    if assigned_condition not in {candidate, control}:
        return (lower + upper) / 2.0
    if mode == "lower":
        if (assigned_condition == candidate and sign > 0) or (assigned_condition == control and sign < 0):
            return lower
        return upper
    if (assigned_condition == candidate and sign > 0) or (assigned_condition == control and sign < 0):
        return upper
    return lower


def hypothesis_estimate(
    context: Mapping[str, Any],
    hypothesis: Mapping[str, Any],
    *,
    allocation: tuple[tuple[str, ...], ...] | None = None,
    task_ids: Sequence[str] | None = None,
    missing_fill: str | None = None,
    selected_values: Mapping[str, Mapping[str, float | None]] | None = None,
) -> dict[str, Any]:
    """Recompute saved task summaries and contrast for one allocation."""
    if missing_fill not in {None, "lower", "upper"}:
        raise lib.InputError("missing_fill must be lower, upper, or null")
    chosen_tasks = [str(task["id"]) for task in context["tasks"]] if task_ids is None else list(task_ids)
    if not chosen_tasks or not set(chosen_tasks).issubset(context["tasksById"]):
        raise lib.InputError("hypothesis task subset is empty or unknown")
    metric_id = str(hypothesis["metricId"])
    values = context["selectedValues"] if selected_values is None else selected_values
    bound_plan = _mapping(context["analysis"].get("missingness"), "analysis.missingness")
    bound_range = _mapping(bound_plan.get("boundRange"), "analysis.missingness.boundRange")
    bounds = (
        _finite(bound_range.get("lower"), "missingness lower bound"),
        _finite(bound_range.get("upper"), "missingness upper bound"),
    )
    if bounds[0] > bounds[1]:
        raise lib.InputError("missingness bound lower exceeds upper")

    by_task_condition: dict[tuple[str, str], list[float | None]] = defaultdict(list)
    missing_attempts: list[str] = []
    for block_index, block in enumerate(context["orderedBlocks"]):
        task_id = str(block[0]["taskId"])
        if task_id not in chosen_tasks:
            continue
        order = (
            tuple(str(row["conditionId"]) for row in block)
            if allocation is None
            else allocation[block_index]
        )
        if len(order) != len(block):
            raise lib.ContractError(("allocation block width differs from the schedule",))
        for position, row in enumerate(block):
            root = str(row["attemptId"])
            condition_id = order[position]
            value = values[root][metric_id]
            if value is None:
                missing_attempts.append(root)
                if missing_fill is not None:
                    value = _fill_value(hypothesis, condition_id, missing_fill, bounds)
            by_task_condition[(task_id, condition_id)].append(value)

    task_effects: list[dict[str, Any]] = []
    for task_id in chosen_tasks:
        candidate_values = by_task_condition[(task_id, hypothesis["candidateConditionId"])]
        control_values = by_task_condition[(task_id, hypothesis["controlConditionId"])]
        if not candidate_values or not control_values:
            raise lib.ContractError((f"task {task_id!r} lacks a contrast condition cell",))
        complete = all(value is not None for value in candidate_values + control_values)
        candidate_summary = control_summary = effect = None
        if complete:
            try:
                candidate_summary = core.summarize(
                    [float(value) for value in candidate_values],
                    str(hypothesis["summary"]),
                    hypothesis["quantile"],
                )
                control_summary = core.summarize(
                    [float(value) for value in control_values],
                    str(hypothesis["summary"]),
                    hypothesis["quantile"],
                )
            except ValueError as exc:
                raise lib.InputError(str(exc)) from exc
            sign = 1.0 if hypothesis["direction"] == "higher" else -1.0
            effect = sign * (candidate_summary - control_summary)
        task = context["tasksById"][task_id]
        weight = 1.0 if hypothesis["taskWeighting"] == "equal" else _finite(task["weight"], f"task {task_id!r} weight")
        task_effects.append(
            {
                "taskId": task_id,
                "family": task.get("family"),
                "stratum": task.get("stratum"),
                "weight": weight,
                "candidateSummary": candidate_summary,
                "controlSummary": control_summary,
                "orientedEffect": effect,
                "complete": complete,
            }
        )
    complete_rows = [row for row in task_effects if row["complete"]]
    complete_case = None
    if complete_rows:
        complete_case = core.weighted_mean(
            [float(row["orientedEffect"]) for row in complete_rows],
            [float(row["weight"]) for row in complete_rows],
        )
    complete = len(complete_rows) == len(task_effects)
    effect = complete_case if complete else None
    tie_plan = _mapping(_mapping(context["analysis"].get("randomization"), "analysis.randomization").get("tieTolerance"), "tieTolerance")
    abs_tol = _finite(tie_plan.get("absolute"), "tieTolerance.absolute")
    rel_tol = _finite(tie_plan.get("relative"), "tieTolerance.relative")
    wins = ties = losses = 0
    for row in complete_rows:
        value = float(row["orientedEffect"])
        if math.isclose(value, 0.0, abs_tol=abs_tol, rel_tol=rel_tol):
            ties += 1
        elif value > 0:
            wins += 1
        else:
            losses += 1
    return {
        "hypothesisId": hypothesis["id"],
        "effect": effect,
        "completeCaseEffect": complete_case,
        "complete": complete,
        "taskCount": len(task_effects),
        "completeTaskCount": len(complete_rows),
        "missingAttemptIds": sorted(set(missing_attempts)),
        "taskEffects": task_effects,
        "wins": wins,
        "ties": ties,
        "losses": losses,
        "largestRegressions": sorted(
            (
                {"taskId": row["taskId"], "orientedEffect": row["orientedEffect"]}
                for row in complete_rows
            ),
            key=lambda row: (float(row["orientedEffect"]), str(row["taskId"])),
        )[:5],
    }


def task_condition_summaries(context: Mapping[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for metric in context["metrics"]:
        metric_id = str(metric["id"])
        grouped: dict[tuple[str, str], list[float | None]] = defaultdict(list)
        for block in context["orderedBlocks"]:
            for row in block:
                grouped[(str(row["taskId"]), str(row["conditionId"]))].append(
                    context["selectedValues"][str(row["attemptId"])][metric_id]
                )
        for task in context["tasks"]:
            for condition in context["conditions"]:
                values = grouped[(str(task["id"]), str(condition["id"]))]
                complete = bool(values) and all(value is not None for value in values)
                summary = None
                if complete:
                    try:
                        summary = core.summarize(
                            [float(value) for value in values],
                            str(metric["summary"]),
                            metric["quantile"],
                        )
                    except ValueError as exc:
                        raise lib.InputError(str(exc)) from exc
                result.append(
                    {
                        "taskId": task["id"],
                        "conditionId": condition["id"],
                        "metricId": metric_id,
                        "repetitions": len(values),
                        "availableRepetitions": sum(value is not None for value in values),
                        "summary": summary,
                        "complete": complete,
                    }
                )
    return result


def _close(left: float, right: float, tolerance: Mapping[str, Any]) -> bool:
    return math.isclose(
        left,
        right,
        abs_tol=float(tolerance["absolute"]),
        rel_tol=float(tolerance["relative"]),
    )


def _tail_probability(
    statistics: Sequence[float],
    probabilities: Sequence[float],
    observed: float,
    tail: str,
    tolerance: Mapping[str, Any],
) -> tuple[float, float]:
    def ge(value: float, boundary: float) -> bool:
        return value > boundary or _close(value, boundary, tolerance)

    def le(value: float, boundary: float) -> bool:
        return value < boundary or _close(value, boundary, tolerance)

    if tail == "greater-or-equal":
        mask = [ge(value, observed) for value in statistics]
        p_value = math.fsum(probability for probability, keep in zip(probabilities, mask) if keep)
    elif tail == "less-or-equal":
        mask = [le(value, observed) for value in statistics]
        p_value = math.fsum(probability for probability, keep in zip(probabilities, mask) if keep)
    elif tail == "two-sided-absolute":
        mask = [ge(abs(value), abs(observed)) for value in statistics]
        p_value = math.fsum(probability for probability, keep in zip(probabilities, mask) if keep)
    elif tail == "two-sided-doubled":
        lower = math.fsum(probability for value, probability in zip(statistics, probabilities) if le(value, observed))
        upper = math.fsum(probability for value, probability in zip(statistics, probabilities) if ge(value, observed))
        p_value = min(1.0, 2.0 * min(lower, upper))
        mask = [
            (le(value, observed) if lower <= upper else ge(value, observed))
            for value in statistics
        ]
    else:
        raise lib.InputError(f"unknown randomization tail {tail!r}")
    tie_probability = math.fsum(
        probability
        for value, probability in zip(statistics, probabilities)
        if _close(value, observed, tolerance)
    )
    return min(1.0, max(0.0, p_value)), tie_probability


def randomization_inference(
    context: Mapping[str, Any],
    hypothesis: Mapping[str, Any],
    *,
    task_ids: Sequence[str] | None = None,
) -> dict[str, Any]:
    plan = _mapping(context["analysis"].get("randomization"), "analysis.randomization")
    schedule = context["schedule"]
    assignment_method = schedule["assignment"]["method"]
    inference_contract = plan.get("inferenceContract")
    base = {
        "hypothesisId": hypothesis["id"],
        "assignmentContract": assignment_method,
        "inferenceContract": inference_contract,
        "conditioning": schedule["assignment"]["conditioning"],
        "lawScope": "full observed schedule conditional on fixed block order",
        "sharpNull": "the complete position-level outcome vector is invariant to condition labels",
        "samplingUnit": "task",
        "assignmentUnit": (
            "task-repetition-block" if assignment_method == "independent-block-v1"
            else "task-vector" if assignment_method == "task-vector-v1"
            else "counterbalanced-sequence-cycle" if assignment_method == "counterbalanced-v1"
            else "globally-coupled-balanced-cyclic-schedule"
        ),
        "tieConvention": "inclusive using saved absolute and relative tolerance",
        "generatingLaw": schedules.assignment_law_metadata(schedule),
    }
    if inference_contract != assignment_method:
        return dict(
            base,
            status="unsupported",
            method=None,
            pValue=None,
            limitation=(
                f"assignment/inference mismatch: {assignment_method} cannot use {inference_contract}; "
                "no arbitrary balanced or independent-swap fallback was used"
            ),
        )
    if assignment_method not in schedules._NEW_METHODS:
        return dict(base, status="unsupported", method=None, pValue=None, limitation="assignment law is not implemented")
    try:
        schedules.validate_observed_support(schedule)
    except lib.BenchmarkError as exc:
        return dict(base, status="unsupported", method="support-refused", pValue=None,
                    exchangeableLaw=False, limitation=str(exc))
    observed_estimate = hypothesis_estimate(context, hypothesis, task_ids=task_ids)
    if not observed_estimate["complete"]:
        return dict(base, status="unavailable", method=None, pValue=None, limitation="mapped outcomes are incomplete")
    observed = float(observed_estimate["effect"])
    mode = plan.get("mode")
    if mode == "none":
        return dict(base, status="not-requested", method="none", pValue=None, observedStatistic=observed)
    if mode not in {"exact", "monte-carlo", "exact-or-monte-carlo"}:
        raise lib.InputError(f"unknown randomization mode {mode!r}")
    maximum = plan.get("maxExactAllocations")
    if isinstance(maximum, bool) or not isinstance(maximum, int) or maximum < 1:
        raise lib.InputError("randomization.maxExactAllocations must be a positive integer")
    path_count = schedules.allocation_path_count(schedule, stop_after=maximum)
    exact_feasible = path_count <= maximum
    if mode == "exact" and not exact_feasible:
        return dict(
            base,
            status="unsupported",
            method="exact-refused",
            pValue=None,
            observedStatistic=observed,
            computationalLimit=maximum,
            generatingPathCountLowerBound=path_count,
            limitation="exact enumeration exceeds the prespecified generating-path limit and approximation was not selected",
        )
    use_exact = mode == "exact" or (mode == "exact-or-monte-carlo" and exact_feasible)
    if mode == "exact-or-monte-carlo" and not exact_feasible and not bool(plan.get("permitApproximation")):
        return dict(
            base,
            status="unsupported",
            method="exact-refused",
            pValue=None,
            observedStatistic=observed,
            computationalLimit=maximum,
            generatingPathCountLowerBound=path_count,
            limitation="exact enumeration exceeds its limit and permitApproximation is false",
        )
    tolerance = _mapping(plan.get("tieTolerance"), "randomization.tieTolerance")
    _finite(tolerance.get("absolute"), "tieTolerance.absolute")
    _finite(tolerance.get("relative"), "tieTolerance.relative")
    tail = str(plan.get("tail"))

    if use_exact:
        try:
            distribution = schedules.allocation_distribution(
                schedule, max_generating_paths=maximum
            )
        except lib.InputError as exc:
            return dict(base, status="unsupported", method="exact-refused", pValue=None, limitation=str(exc))
        statistics: list[float] = []
        probabilities: list[float] = []
        for atom in distribution["atoms"]:
            allocation = tuple(tuple(order) for order in atom["allocation"])
            estimate = hypothesis_estimate(
                context, hypothesis, allocation=allocation, task_ids=task_ids
            )
            if not estimate["complete"]:
                raise lib.ContractError(("allocation unexpectedly produced an incomplete statistic",))
            statistics.append(float(estimate["effect"]))
            probabilities.append(float(atom["probability"]))
        p_value, tie_probability = _tail_probability(
            statistics, probabilities, observed, tail, tolerance
        )
        # Inclusive tails reach their minimum at an extreme, not at every
        # interior statistic. Avoid a quadratic second scan of exact support.
        endpoints = [min(statistics), max(statistics)]
        if tail == "two-sided-absolute":
            endpoints = [max(statistics, key=abs)]
        attainable = [
            _tail_probability(statistics, probabilities, statistic, tail, tolerance)[0]
            for statistic in endpoints
        ]
        return dict(
            base,
            status="complete",
            method="exact-randomization",
            approximation=False,
            tail=tail,
            observedStatistic=observed,
            pValue=p_value,
            generatingPathCount=distribution["generatingPathCount"],
            allocationCount=distribution["uniqueAllocationCount"],
            observedAllocationIncluded=True,
            observedAllocationProbability=distribution["observedProbability"],
            observedPathMultiplicity=distribution["observedPathMultiplicity"],
            probabilityMass=math.fsum(probabilities),
            tieProbability=tie_probability,
            minimumAttainableP=min(value for value in attainable if value > 0),
            tolerance={"absolute": float(tolerance["absolute"]), "relative": float(tolerance["relative"])},
            limitation=None,
        )

    monte_carlo = _mapping(plan.get("monteCarlo"), "randomization.monteCarlo")
    draws = monte_carlo.get("draws")
    seed = monte_carlo.get("seed")
    level = monte_carlo.get("intervalLevel")
    if isinstance(draws, bool) or not isinstance(draws, int) or draws < 1:
        raise lib.InputError("randomization Monte Carlo draws must be positive")
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise lib.InputError("randomization Monte Carlo seed must be a non-negative integer")
    confidence = _finite(level, "randomization Monte Carlo intervalLevel")
    if not 0.0 < confidence < 1.0:
        raise lib.InputError("Monte Carlo intervalLevel must be between zero and one")
    import numpy as np

    rng = np.random.Generator(np.random.PCG64(seed))
    simulated: list[float] = []
    for _ in range(draws):
        allocation = schedules.sample_allocation(schedule, rng)
        estimate = hypothesis_estimate(context, hypothesis, allocation=allocation, task_ids=task_ids)
        simulated.append(float(estimate["effect"]))
    unit_probabilities = [1.0 / draws] * draws
    raw_tail, _ = _tail_probability(simulated, unit_probabilities, observed, tail, tolerance)

    def is_tie(value: float) -> bool:
        return _close(value, observed, tolerance)

    if tail == "greater-or-equal":
        extreme = sum(value > observed or is_tie(value) for value in simulated)
        multiplier = 1.0
    elif tail == "less-or-equal":
        extreme = sum(value < observed or is_tie(value) for value in simulated)
        multiplier = 1.0
    elif tail == "two-sided-absolute":
        extreme = sum(abs(value) > abs(observed) or _close(abs(value), abs(observed), tolerance) for value in simulated)
        multiplier = 1.0
    elif tail == "two-sided-doubled":
        lower = sum(value < observed or is_tie(value) for value in simulated)
        upper = sum(value > observed or is_tie(value) for value in simulated)
        extreme = min(lower, upper)
        multiplier = 2.0
    else:
        raise lib.InputError(f"unknown randomization tail {tail!r}")
    p_value = min(1.0, multiplier * (1 + extreme) / (draws + 1))
    try:
        cp_lower, cp_upper = core.clopper_pearson(extreme, draws, confidence)
    except ValueError as exc:
        raise lib.InputError(str(exc)) from exc
    interval = [
        min(1.0, multiplier * (1.0 + draws * cp_lower) / (draws + 1)),
        min(1.0, multiplier * (1.0 + draws * cp_upper) / (draws + 1)),
    ]
    return dict(
        base,
        status="complete",
        method="seeded-monte-carlo-randomization",
        approximation=True,
        exchangeableLaw=True,
        generator="numpy-pcg64",
        seed=seed,
        draws=draws,
        tail=tail,
        observedStatistic=observed,
        pValue=p_value,
        uncorrectedSimulatedTailProbability=raw_tail,
        extremeDraws=extreme,
        observedAllocationIncluded="plus-one finite-sampling construction",
        minimumAttainableP=min(1.0, multiplier / (draws + 1)),
        monteCarloIntervalLevel=confidence,
        monteCarloPInterval=interval,
        monteCarloStandardError=multiplier * math.sqrt((extreme / draws) * (1.0 - extreme / draws) / draws),
        ties=sum(is_tie(value) for value in simulated),
        tolerance={"absolute": float(tolerance["absolute"]), "relative": float(tolerance["relative"])},
        limitation="sampled allocations are Monte Carlo, not exact",
    )


def bootstrap_for_hypothesis(
    context: Mapping[str, Any],
    hypothesis: Mapping[str, Any],
    estimate: Mapping[str, Any],
    *,
    confidence_level: float | None = None,
) -> dict[str, Any]:
    plan = _mapping(context["analysis"].get("bootstrap"), "analysis.bootstrap")
    method = plan.get("method")
    if method == "none":
        return {"hypothesisId": hypothesis["id"], "status": "not-requested", "method": "none"}
    if not estimate["complete"]:
        return {"hypothesisId": hypothesis["id"], "status": "unavailable", "method": method, "reason": "mapped outcomes are incomplete"}
    stratify = list(plan.get("stratifyBy", []))

    def task_strata(task_id: str) -> dict[str, Any]:
        task = context["tasksById"][task_id]
        values: dict[str, Any] = {"stratum": task.get("stratum"), "family": task.get("family")}
        selected_rows = []
        for root, selected in context["selection"].items():
            root_row = context["rowsById"][root]
            if root_row["taskId"] == task_id:
                selected_rows.append(context["rowsById"][selected])
        for name in ("concurrency", "service"):
            observed = {
                _mapping(row.get("telemetry", {}), "row.telemetry").get(name)
                for row in selected_rows
            }
            values[name] = next(iter(observed)) if len(observed) == 1 else None
        return values

    items = [
        {
            "taskId": row["taskId"],
            "family": row["family"],
            "effect": row["orientedEffect"],
            "weight": row["weight"],
            "strata": task_strata(str(row["taskId"])),
        }
        for row in estimate["taskEffects"]
    ]
    try:
        result = core.cluster_bootstrap(
            items,
            unit=str(plan.get("unit")),
            stratify_by=stratify,
            method=str(method),
            draws=int(plan.get("draws")),
            confidence_level=(
                float(plan.get("confidenceLevel"))
                if confidence_level is None else confidence_level
            ),
            seed=int(plan.get("seed")),
        )
    except ValueError as exc:
        return {
            "hypothesisId": hypothesis["id"],
            "status": "unavailable",
            "method": method,
            "reason": str(exc),
            "fallbackUsed": False,
        }
    return {"hypothesisId": hypothesis["id"], "status": "complete" if result["available"] else "unavailable", **result}


def missing_bounds(
    context: Mapping[str, Any], hypothesis: Mapping[str, Any]
) -> dict[str, Any]:
    lower = hypothesis_estimate(context, hypothesis, missing_fill="lower")
    upper = hypothesis_estimate(context, hypothesis, missing_fill="upper")
    return {
        "hypothesisId": hypothesis["id"],
        "method": "prespecified-missing-outcome-bounds",
        "lower": lower["effect"],
        "upper": upper["effect"],
        "missingAttemptIds": sorted(set(lower["missingAttemptIds"] + upper["missingAttemptIds"])),
        "fullScheduledTaskWeights": True,
    }


def status_uncertainty_bounds(
    context: Mapping[str, Any],
    hypothesis: Mapping[str, Any],
    *,
    statuses: set[str],
) -> dict[str, Any]:
    selected_values = {
        root: dict(values) for root, values in context["selectedValues"].items()
    }
    affected = []
    for root, selected in context["selection"].items():
        if context["rowsById"][selected]["attemptStatus"] in statuses:
            selected_values[root][hypothesis["metricId"]] = None
            affected.append(selected)
    lower = hypothesis_estimate(
        context, hypothesis, missing_fill="lower", selected_values=selected_values
    )
    upper = hypothesis_estimate(
        context, hypothesis, missing_fill="upper", selected_values=selected_values
    )
    return {
        "lower": lower["effect"],
        "upper": upper["effect"],
        "affectedAttemptIds": sorted(affected),
        "statuses": sorted(statuses),
    }


def concentration(context: Mapping[str, Any], hypothesis: Mapping[str, Any], *, unit: str) -> dict[str, Any]:
    task_ids = [str(task["id"]) for task in context["tasks"]]
    if unit == "task":
        deletions = [(task_id, {task_id}) for task_id in task_ids]
    else:
        missing = [task_id for task_id in task_ids if not context["tasksById"][task_id].get("family")]
        if missing:
            return {"method": "leave-one-family-out", "status": "unavailable", "reason": f"tasks lack family IDs: {missing}"}
        families = sorted({str(context["tasksById"][task_id]["family"]) for task_id in task_ids})
        deletions = [
            (family, {task_id for task_id in task_ids if context["tasksById"][task_id]["family"] == family})
            for family in families
        ]
    rows = []
    for label, deleted in deletions:
        retained = [task_id for task_id in task_ids if task_id not in deleted]
        if not retained:
            rows.append({"deleted": label, "effect": None, "status": "unavailable"})
            continue
        estimate = hypothesis_estimate(context, hypothesis, task_ids=retained)
        rows.append({"deleted": label, "effect": estimate["effect"], "status": "complete" if estimate["complete"] else "unavailable"})
    finite = [float(row["effect"]) for row in rows if row["effect"] is not None]
    return {
        "method": f"leave-one-{unit}-out",
        "status": "complete" if len(finite) == len(rows) else "unavailable",
        "results": rows,
        "range": [min(finite), max(finite)] if finite else None,
    }


def retry_sensitivity(context: Mapping[str, Any], hypothesis: Mapping[str, Any]) -> dict[str, Any]:
    results = {}
    for name, selection in (
        ("first-attempt", context["firstSelection"]),
        ("production-policy", context["productionSelection"]),
    ):
        selected_values = {root: context["mappedById"][attempt] for root, attempt in selection.items()}
        estimate = hypothesis_estimate(context, hypothesis, selected_values=selected_values)
        results[name] = {
            "effect": estimate["effect"],
            "complete": estimate["complete"],
            "selectedAttemptIds": dict(selection),
        }
    return {
        "method": "first-attempt-vs-production-retry",
        "hypothesisId": hypothesis["id"],
        "results": results,
        "distinctPolicies": True,
    }


def reliability_metrics(context: Mapping[str, Any]) -> list[dict[str, Any]]:
    plans = _array(context["analysis"].get("reliability"), "analysis.reliability")
    binary_metrics = [metric for metric in context["metrics"] if metric.get("summary") == "binary-rate"]
    if plans and not binary_metrics:
        return [{"status": "unsupported", "reason": "reliability requires a declared binary-rate metric"}]
    metric_id = str(binary_metrics[0]["id"]) if binary_metrics else ""
    task_weights = {str(task["id"]): float(task["weight"]) for task in context["tasks"]}
    results: list[dict[str, Any]] = []
    base_by_task_condition: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in context["baseRows"]:
        base_by_task_condition[(str(row["taskId"]), str(row["conditionId"]))].append(str(row["attemptId"]))
    for values in base_by_task_condition.values():
        values.sort(key=lambda attempt_id: int(context["rowsById"][attempt_id]["repetition"]))

    for plan_value in plans:
        plan = _mapping(plan_value, "analysis.reliability item")
        metric = plan.get("metric")
        population = plan.get("population")
        k = plan.get("k")
        if population not in {"all-scheduled", "first-attempts", "eligible-retries"}:
            raise lib.InputError(f"unknown reliability population {population!r}")
        by_condition: dict[str, Any] = {}
        limitations: list[str] = []
        for condition in context["conditions"]:
            task_estimates: list[float] = []
            weights: list[float] = []
            unavailable: list[str] = []
            denominators: dict[str, int] = {}
            for task in context["tasks"]:
                task_id = str(task["id"])
                roots = base_by_task_condition[(task_id, str(condition["id"]))]
                if metric == "retry-policy-acceptance":
                    selected_ids = [context["productionSelection"][root] for root in roots]
                elif population == "first-attempts":
                    selected_ids = list(roots)
                elif population == "eligible-retries":
                    selected_ids = [
                        attempt_id
                        for root in roots
                        for attempt_id in context["retryChains"][root][1:]
                    ]
                else:
                    selected_ids = [
                        attempt_id
                        for root in roots
                        for attempt_id in context["retryChains"][root]
                    ]
                values = [context["mappedById"][attempt_id][metric_id] for attempt_id in selected_ids]
                denominators[task_id] = len(values)
                estimate = None
                if values and not any(value is None for value in values):
                    successes = sum(float(value) >= 1.0 for value in values)
                    if metric in {"pass-at-1", "retry-policy-acceptance"}:
                        estimate = successes / len(values)
                    elif metric in {"pass-at-k", "pass-all-k"}:
                        if isinstance(k, bool) or not isinstance(k, int) or k < 1:
                            raise lib.InputError(f"reliability {metric!r} requires positive k")
                        if len(values) >= k:
                            try:
                                estimate = core.pass_k_probability(
                                    successes,
                                    len(values),
                                    k,
                                    all_required=metric == "pass-all-k",
                                )
                            except ValueError as exc:
                                raise lib.InputError(str(exc)) from exc
                    else:
                        raise lib.InputError(f"unknown reliability metric {metric!r}")
                if estimate is None:
                    unavailable.append(task_id)
                else:
                    task_estimates.append(estimate)
                    weights.append(task_weights[task_id])
            by_condition[str(condition["id"])] = {
                "estimate": core.weighted_mean(task_estimates, weights) if task_estimates and not unavailable else None,
                "taskCount": len(task_estimates),
                "attemptDenominatorByTask": denominators,
                "unavailableTaskIds": unavailable,
            }
        if metric in {"pass-at-k", "pass-all-k"}:
            limitations.append("combinatorial estimator assumes eligible attempts are exchangeable within task and condition")
        results.append(
            {
                "metric": metric,
                "outcomeMetricId": metric_id,
                "k": k,
                "population": population,
                "byCondition": by_condition,
                "repetitionsAreNotRetries": metric != "retry-policy-acceptance",
                "limitations": limitations,
            }
        )
    return results


def grader_uncertainty(context: Mapping[str, Any]) -> dict[str, Any]:
    plan = _mapping(context["analysis"].get("graderUncertainty"), "analysis.graderUncertainty")
    method = plan.get("method")
    grades = _array(context["request"].get("grades"), "grades")
    grades_by_id: dict[str, Mapping[str, Any]] = {}
    for index, value in enumerate(grades):
        grade = _mapping(value, f"grades[{index}]")
        grade_id = grade.get("gradeId")
        if not isinstance(grade_id, str) or not grade_id or grade_id in grades_by_id:
            raise lib.ContractError((f"grades[{index}] has a missing or duplicate gradeId",))
        grades_by_id[grade_id] = grade
    output_counts: list[int] = []
    disagreements = []
    missing_labels = []
    grader_ids: set[str] = set()
    for row in context["mappedTable"]:
        scores: list[float] = []
        for grade_id in row["gradeIds"]:
            grade = grades_by_id.get(grade_id)
            if grade is None or grade.get("status") != "valid":
                continue
            grader_id = grade.get("graderId")
            if isinstance(grader_id, str):
                grader_ids.add(grader_id)
            for label in grade.get("labels", []):
                if isinstance(label, Mapping) and label.get("score") is not None:
                    scores.append(_finite(label["score"], f"grade {grade_id!r} score"))
        output_counts.append(len(scores))
        if not scores:
            missing_labels.append(row["attemptId"])
        elif not math.isclose(min(scores), max(scores), abs_tol=1e-12, rel_tol=1e-12):
            disagreements.append({"attemptId": row["attemptId"], "lower": min(scores), "upper": max(scores)})
    limitations = []
    if len(grader_ids) <= 1 and method != "none":
        limitations.append("one grader does not identify inter-grader variance or grader-population accuracy")
    if missing_labels and method != "none":
        limitations.append("missing or malformed grader labels are not agreement")
    return {
        "method": method,
        "graderCount": len(grader_ids),
        "labelsPerOutput": output_counts,
        "disagreements": disagreements,
        "missingLabelAttemptIds": missing_labels,
        "labelBounds": disagreements if method == "label-bounds" else [],
        "crossedModelDelegated": method == "crossed-model",
        "limitations": limitations,
    }


def finite_looks(
    context: Mapping[str, Any], hypothesis_list: Sequence[Mapping[str, Any]]
) -> dict[str, Any]:
    plan = _mapping(context["analysis"].get("sequential"), "analysis.sequential")
    method = plan.get("method")
    looks = _array(plan.get("looks"), "analysis.sequential.looks")
    task_order = [str(task["id"]) for task in context["tasks"]]
    max_tasks = plan.get("maxTasks")
    if max_tasks != len(task_order):
        raise lib.ContractError(("sequential maxTasks must equal the complete saved task count",))
    hypothesis_ids = [str(hypothesis["id"]) for hypothesis in hypothesis_list]
    prior_count = 0
    total_alpha = 0.0
    validated_looks: list[Mapping[str, Any]] = []
    overall_alpha = float(_mapping(context["analysis"].get("multiplicity"), "analysis.multiplicity")["alpha"])
    for index, look_value in enumerate(looks):
        look = _mapping(look_value, f"analysis.sequential.looks[{index}]")
        count = look.get("completeTasks")
        if isinstance(count, bool) or not isinstance(count, int) or count <= prior_count or count > len(task_order):
            raise lib.ContractError(("sequential look task counts must be strictly increasing through maxTasks",))
        prior_count = count
        alpha_map = _mapping(look.get("alphaByHypothesis"), f"look {look.get('id')!r}.alphaByHypothesis")
        if set(alpha_map) != set(hypothesis_ids):
            raise lib.ContractError((f"look {look.get('id')!r} alpha map is not the complete hypothesis family",))
        for hypothesis_id in hypothesis_ids:
            alpha = _finite(alpha_map[hypothesis_id], f"look {look.get('id')!r} alpha")
            if not 0.0 < alpha < 1.0:
                raise lib.InputError("sequential constituent alpha must be between zero and one")
            total_alpha += alpha
        validated_looks.append(look)
    if not validated_looks or prior_count != len(task_order):
        raise lib.ContractError(("sequential looks must include the complete final task count",))
    if method == "finite-look-union-bound" and total_alpha > overall_alpha + 1e-15:
        raise lib.ContractError(("sum of finite-look hypothesis alpha allocations exceeds overall alpha",))

    results = []
    stopped_at = None
    stop_reason = None
    for look in validated_looks:
        count = int(look["completeTasks"])
        alpha_map = _mapping(look["alphaByHypothesis"], f"look {look.get('id')!r}.alphaByHypothesis")
        look_tests = []
        crossed = []
        for hypothesis in hypothesis_list:
            alpha = float(alpha_map[hypothesis["id"]])
            inference = randomization_inference(
                context, hypothesis, task_ids=task_order[:count]
            )
            reject = inference.get("status") == "complete" and float(inference["pValue"]) <= alpha
            estimate = hypothesis_estimate(context, hypothesis, task_ids=task_order[:count])
            uncertainty = None
            if method == "finite-look-union-bound":
                uncertainty = bootstrap_for_hypothesis(context, hypothesis, estimate,
                    confidence_level=max(1. - alpha, float(context["analysis"]["bootstrap"]["confidenceLevel"])))
                uncertainty["reportedInterval"] = {
                    "label": "finite-look-allocated-cluster-interval",
                    "lower": uncertainty.get("lower"), "upper": uncertainty.get("upper"),
                    "oneSidedLower": uncertainty.get("oneSidedLower"),
                    "confidenceLevel": uncertainty.get("confidenceLevel"),
                }
            look_tests.append(
                {
                    "hypothesisId": hypothesis["id"],
                    "allocatedAlpha": alpha,
                    "pValue": inference.get("pValue"),
                    "validConstituentTest": inference.get("status") == "complete",
                    "reject": reject,
                    "inference": inference,
                    "estimate": estimate,
                    "uncertainty": uncertainty,
                }
            )
            if reject:
                crossed.append(str(hypothesis["id"]))
        results.append(
            {
                "lookId": look.get("id"),
                "completeTasks": count,
                "tests": look_tests,
                "crossedHypothesisIds": crossed,
            }
        )
        if method == "finite-look-union-bound" and plan.get("stopOn") == "declared-boundary" and crossed and stopped_at is None:
            stopped_at = look.get("id")
            stop_reason = "declared-boundary-crossed"
            break
    if method == "fixed-sample":
        if len(looks) != 1 or plan.get("stopOn") != "final-look":
            raise lib.ContractError(("fixed-sample analysis requires exactly one final-only look",))
        stopped_at = looks[-1].get("id")
        stop_reason = "final-look"
    elif method != "finite-look-union-bound":
        raise lib.InputError(f"unknown sequential method {method!r}")
    elif stopped_at is None:
        stopped_at = looks[-1].get("id")
        stop_reason = "maximum-sample-reached"
    return {
        "method": method,
        "overallAlpha": overall_alpha,
        "allocatedAlpha": total_alpha,
        "unionBoundValidWithoutIndependentLooks": True,
        "globalCoupledLaw": "every look enumerates or samples the full saved schedule law before selecting its task statistic",
        "looks": results,
        "stoppedAt": stopped_at,
        "stopReason": stop_reason,
        "plannedStop": True,
    }


def precision_power(
    context: Mapping[str, Any], hypothesis_list: Sequence[Mapping[str, Any]]
) -> dict[str, Any]:
    """Simulate the declared assignment, analysis family, and stopping policy.

    Scenario inputs are design assumptions.  They never use the observed scored
    effect.  Outcome, assignment, grading, and inner-randomization streams are
    spawned independently before the first simulation.
    """
    plan = _mapping(context["analysis"].get("precisionPower"), "analysis.precisionPower")
    method = plan.get("method")
    if method == "none":
        return {"method": "none", "status": "not-requested", "scenarios": []}
    if method not in {"simulation", "analytic-reference", "simulation-with-reference"}:
        raise lib.InputError(f"unknown precision/power method {method!r}")
    simulations = plan.get("simulationCount")
    seed = plan.get("seed")
    if isinstance(simulations, bool) or not isinstance(simulations, int) or simulations < 1:
        raise lib.InputError("precision/power simulationCount must be positive for a selected method")
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise lib.InputError("precision/power seed must be a non-negative integer")

    import numpy as np
    from statsmodels.stats.power import TTestPower

    outcomes_seed, assignments_seed, grading_seed, inner_seed = np.random.SeedSequence(seed).spawn(4)
    outcome_rng = np.random.default_rng(outcomes_seed)
    assignment_rng = np.random.default_rng(assignments_seed)
    grading_rng = np.random.default_rng(grading_seed)
    inner_rng = np.random.default_rng(inner_seed)
    scenarios_out: list[dict[str, Any]] = []
    original_looks = list(context["analysis"]["sequential"]["looks"])
    original_max = int(context["analysis"]["sequential"]["maxTasks"])
    alpha = float(context["analysis"]["multiplicity"]["alpha"])
    primary_ids = {str(item["id"]) for item in hypothesis_list if item["role"] == "primary"}
    if not primary_ids:
        primary_ids = {str(item["id"]) for item in hypothesis_list}

    unsimulated = []
    if context["analysis"].get("models"):
        unsimulated.append("selected model methods")
    if context["analysis"]["graderUncertainty"]["method"] != "none":
        unsimulated.append("selected grader uncertainty method")
    if context["analysis"]["retryPolicy"]["maxRetries"]:
        unsimulated.append("selected production retry process")
    if context["analysis"].get("sensitivityScenarios"):
        unsimulated.append("saved alternative-outcome sensitivity scenarios")
    for scenario_value in _array(plan.get("scenarios"), "precisionPower.scenarios"):
        scenario = _mapping(scenario_value, "precisionPower scenario")
        task_count = int(scenario.get("tasks"))
        repetitions = int(scenario.get("repetitions"))
        effect = _finite(scenario.get("effect"), "precision scenario effect")
        sd = _finite(scenario.get("taskStandardDeviation"), "precision scenario taskStandardDeviation")
        failure_rate = _finite(scenario.get("failureRate"), "precision scenario failureRate")
        grader_error = _finite(scenario.get("graderErrorRate"), "precision scenario graderErrorRate")
        if task_count < 1 or repetitions < 1 or sd < 0 or not 0 <= failure_rate <= 1 or not 0 <= grader_error <= 1:
            raise lib.InputError("invalid precision/power scenario")

        simulated_spec = copy.deepcopy(context["spec"])
        if unsimulated or task_count > len(context["tasks"]):
            scenarios_out.append({"id": scenario.get("id"), "status": "unsupported", "reason":
                "simulation has no declared generator for " + ", ".join(unsimulated or ["additional task units/weights beyond the saved task roster"])})
            continue
        simulated_spec["tasks"] = copy.deepcopy(context["tasks"][:task_count])
        simulated_spec["design"]["repetitions"] = repetitions
        simulated_spec["stoppingAndBudgets"]["maxTasks"] = task_count
        simulated_spec["stoppingAndBudgets"]["maxRepetitions"] = repetitions
        simulated_spec["analysis"]["precisionPower"] = {
            "method": "none", "simulationCount": 0, "seed": seed, "scenarios": []
        }
        simulated_spec["analysis"]["sequential"]["maxTasks"] = task_count

        if simulated_spec["analysis"]["sequential"]["method"] == "fixed-sample":
            look = copy.deepcopy(original_looks[-1])
            look["completeTasks"] = task_count
            simulated_spec["analysis"]["sequential"]["looks"] = [look]
        else:
            scaled_looks = []
            previous = 0
            for look in original_looks:
                count = max(1, math.ceil(int(look["completeTasks"]) * task_count / original_max))
                if count <= previous:
                    continue
                scaled = copy.deepcopy(look)
                scaled["completeTasks"] = min(task_count, count)
                scaled_looks.append(scaled)
                previous = scaled["completeTasks"]
            if not scaled_looks or scaled_looks[-1]["completeTasks"] != task_count:
                final_look = copy.deepcopy(original_looks[-1])
                final_look["completeTasks"] = task_count
                scaled_looks.append(final_look)
            simulated_spec["analysis"]["sequential"]["looks"] = scaled_looks

        randomization = simulated_spec["analysis"]["randomization"]
        try:
            prototype_schedule = schedules.generate_schedule(
                {"schemaVersion": 1, "resolvedSpec": simulated_spec}
            )
        except lib.BenchmarkError as exc:
            scenarios_out.append(
                {"id": scenario.get("id"), "status": "unsupported", "reason": str(exc)}
            )
            continue
        exact_limit = int(randomization["maxExactAllocations"])
        exact_paths = schedules.allocation_path_count(
            prototype_schedule, stop_after=exact_limit
        )
        if randomization["mode"] == "monte-carlo" or (
            randomization["mode"] == "exact-or-monte-carlo"
            and exact_paths > exact_limit
            and randomization["permitApproximation"]
        ):
            per_test_work = int(randomization["monteCarlo"]["draws"])
        else:
            per_test_work = exact_paths
        projected_work = simulations * (1 + len(simulated_spec["analysis"]["sequential"]["looks"])) * len(hypothesis_list) * (per_test_work + int(simulated_spec["analysis"]["bootstrap"]["draws"]))
        if projected_work > 5_000_000:
            scenarios_out.append(
                {
                    "id": scenario.get("id"),
                    "status": "unsupported",
                    "reason": "full-design simulation exceeds the explicit 5,000,000 statistic-evaluation limit",
                    "projectedStatisticEvaluations": projected_work,
                }
            )
            continue

        rejections = 0
        adoptions = 0
        early_stops = 0
        widths: list[float] = []
        reference_widths: list[float] = []
        unsupported_runs = 0
        for _ in range(simulations):
            simulated_spec["design"]["assignment"]["seed"] = int(assignment_rng.integers(0, 2**31))
            simulated_spec["analysis"]["randomization"]["monteCarlo"]["seed"] = int(inner_rng.integers(0, 2**31))
            simulated_spec["analysis"]["bootstrap"]["seed"] = int(inner_rng.integers(0, 2**31))
            try:
                simulated_schedule = schedules.generate_schedule(
                    {"schemaVersion": 1, "resolvedSpec": simulated_spec}
                )
            except lib.BenchmarkError:
                unsupported_runs += 1
                continue

            task_signal: dict[tuple[str, str], float] = {}
            for task in simulated_spec["tasks"]:
                for hypothesis in hypothesis_list:
                    task_signal[(str(task["id"]), str(hypothesis["id"]))] = float(
                        outcome_rng.normal(effect, sd)
                    )
            dataset_rows = []
            for schedule_row in simulated_schedule["rows"]:
                metric_outcomes = []
                failed = bool(outcome_rng.random() < failure_rate)
                for metric in simulated_spec["analysis"]["metrics"]:
                    metric_id = str(metric["id"])
                    if failed:
                        metric_outcomes.append({"metricId": metric_id, "status": "unavailable", "value": None})
                        continue
                    value = float(outcome_rng.normal(0.0, sd)) if sd > 0 else 0.0
                    for hypothesis in hypothesis_list:
                        if hypothesis["metricId"] != metric_id:
                            continue
                        signal = task_signal[(str(schedule_row["taskId"]), str(hypothesis["id"]))]
                        raw_sign = 1.0 if hypothesis["direction"] == "higher" else -1.0
                        if schedule_row["conditionId"] == hypothesis["candidateConditionId"]:
                            value += raw_sign * signal / 2.0
                        elif schedule_row["conditionId"] == hypothesis["controlConditionId"]:
                            value -= raw_sign * signal / 2.0
                    if metric["summary"] == "binary-rate":
                        value = float(outcome_rng.random() < min(1.0, max(0.0, 0.5 + value)))
                        if grading_rng.random() < grader_error:
                            value = 1.0 - value
                    elif grading_rng.random() < grader_error:
                        value = -value
                    metric_outcomes.append({"metricId": metric_id, "status": "observed", "value": value})
                task = next(item for item in simulated_spec["tasks"] if item["id"] == schedule_row["taskId"])
                dataset_rows.append(
                    {
                        **schedule_row,
                        "family": task["family"],
                        "stratum": task["stratum"],
                        "attemptStatus": "agent-failure" if failed else "succeeded",
                        "outcomes": metric_outcomes,
                        "gradeIds": [],
                        "telemetry": {},
                    }
                )
            simulated_request = {
                "schemaVersion": 1,
                "resolvedSpec": simulated_spec,
                "schedule": simulated_schedule,
                "dataset": {"schemaVersion": 1, "rows": dataset_rows},
                "grades": [],
                "telemetry": {},
            }
            simulated_context = build_context(simulated_request)
            simulated_hypotheses = hypotheses(simulated_context)
            report = analyze_request(simulated_request)
            if report["status"] != "complete":
                unsupported_runs += 1
                continue
            stopping = report["inference"]["sequential"]
            if stopping["method"] == "fixed-sample":
                rejected = report["multiplicity"]["status"] == "controlled" and any(
                    test["reject"] and test["hypothesisId"] in primary_ids for test in report["multiplicity"]["results"])
            else:
                rejected = any(test["reject"] and test["hypothesisId"] in primary_ids for look in stopping["looks"] for test in look["tests"])
            rejections += int(rejected)
            adoptions += int(report["scientificDecision"] == "adopt")
            if stopping["stopReason"] == "declared-boundary-crossed" and stopping["stoppedAt"] != simulated_spec["analysis"]["sequential"]["looks"][-1]["id"]:
                early_stops += 1
            intervals = report["inference"]["bootstrap"] if stopping["method"] == "fixed-sample" else [test["uncertainty"] for test in stopping["looks"][-1]["tests"]]
            interval = next((item.get("reportedInterval", {}) for item in intervals if item["hypothesisId"] in primary_ids), {})
            if interval.get("lower") is not None and interval.get("upper") is not None:
                widths.append(float(interval["upper"]) - float(interval["lower"]))
            first_primary = next(item for item in simulated_hypotheses if item["id"] in primary_ids)
            estimate = hypothesis_estimate(simulated_context, first_primary)
            complete_effects = [
                float(row["orientedEffect"])
                for row in estimate["taskEffects"]
                if row["orientedEffect"] is not None
            ]
            complete_weights = [
                float(row["weight"])
                for row in estimate["taskEffects"]
                if row["orientedEffect"] is not None
            ]
            reference = core.weighted_t_interval(
                complete_effects,
                complete_weights,
                confidence_level=float(context["analysis"]["bootstrap"]["confidenceLevel"]),
            )
            if reference.get("available"):
                reference_widths.append(float(reference["upper"]) - float(reference["lower"]))

        completed = simulations - unsupported_runs
        if completed == 0:
            scenarios_out.append(
                {"id": scenario.get("id"), "status": "unsupported", "reason": "no full-design simulation completed"}
            )
            continue
        probability = adoptions / completed
        rejection_probability = rejections / completed
        mcse = math.sqrt(probability * (1.0 - probability) / completed)
        analytic = None
        if method in {"analytic-reference", "simulation-with-reference"}:
            total_sd = math.sqrt(sd * sd + (sd * sd / repetitions))
            if total_sd == 0:
                analytic = 1.0 if effect > 0 else alpha
            else:
                analytic = float(TTestPower().power(
                    effect_size=effect / total_sd,
                    nobs=task_count,
                    alpha=alpha,
                    alternative="larger",
                ))
        scenarios_out.append(
            {
                "id": scenario.get("id"),
                "status": "complete" if unsupported_runs == 0 else "partial",
                "tasks": task_count,
                "repetitions": repetitions,
                "decisionProbability": probability if unsupported_runs == 0 else None,
                "decisionProbabilityMeaning": "production scientificDecision equals adopt",
                "decisionProbabilityMonteCarloSE": mcse if unsupported_runs == 0 else None,
                "rejectionProbability": rejection_probability if unsupported_runs == 0 else None,
                "rejectionProbabilityMonteCarloSE": math.sqrt(rejection_probability * (1 - rejection_probability) / completed) if unsupported_runs == 0 else None,
                "rejectionProbabilityMonteCarloInterval": list(core.clopper_pearson(rejections, completed, .95)) if unsupported_runs == 0 else None,
                "expectedIntervalWidth": math.fsum(widths) / len(widths) if widths else None,
                "intervalMethod": simulated_spec["analysis"]["bootstrap"]["method"],
                "analyticExpectedIntervalWidth": math.fsum(reference_widths) / len(reference_widths) if reference_widths else None,
                "simulatedTasks": [{key: task.get(key) for key in ("id", "weight", "family", "stratum")} for task in simulated_spec["tasks"]],
                "analyticPairedTaskReference": analytic,
                "simulations": simulations,
                "completedSimulations": completed,
                "unsupportedSimulations": unsupported_runs,
                "earlyStopProbability": early_stops / completed,
                "fullDesignPath": [
                    simulated_spec["design"]["assignment"]["method"],
                    "complete status mapping",
                    "saved task summaries/weights/directions",
                    "matching randomization tests",
                    "production complete-family multiplicity and scientific decision",
                    simulated_spec["analysis"]["sequential"]["method"],
                ],
                "assumptions": {
                    "taskContrastDistribution": "Gaussian",
                    "taskAndRepetitionStandardDeviation": sd,
                    "failureAction": "saved global eligibility ceiling and metric status map",
                    "graderError": "binary-label flip or continuous sign reversal",
                    "noPeriodOrCarryoverEffect": True,
                },
            }
        )
    overall_status = "complete" if all(row.get("status") == "complete" for row in scenarios_out) else "unsupported"
    return {
        "method": method,
        "status": overall_status,
        "seed": seed,
        "simulationCount": simulations,
        "separateRandomStreams": ["outcomes", "assignment", "grading", "inner-randomization"],
        "scenarios": scenarios_out,
        "retrospectiveObservedEffectUsed": False,
    }


def _strata_sensitivity(context: Mapping[str, Any], hypothesis: Mapping[str, Any], name: str) -> dict[str, Any]:
    task_value: dict[str, Any] = {}
    for task in context["tasks"]:
        task_id = str(task["id"])
        if name in {"stratum", "family"}:
            values = {task.get(name)}
        else:
            values = set()
            for root, selected in context["selection"].items():
                if context["rowsById"][root]["taskId"] == task_id:
                    values.add(_mapping(context["rowsById"][selected].get("telemetry", {}), "telemetry").get(name))
        task_value[task_id] = next(iter(values)) if len(values) == 1 else None
    if any(value is None for value in task_value.values()):
        return {"method": f"{name}-strata", "status": "unavailable", "reason": "stratum is absent or varies within task"}
    rows = []
    for value in sorted(set(task_value.values()), key=str):
        task_ids = [task_id for task_id, observed in task_value.items() if observed == value]
        estimate = hypothesis_estimate(context, hypothesis, task_ids=task_ids)
        rows.append({"stratum": value, "taskIds": task_ids, "effect": estimate["effect"], "complete": estimate["complete"]})
    return {"method": f"{name}-strata", "status": "complete" if all(row["complete"] for row in rows) else "unavailable", "results": rows}


def _grader_bound_sensitivity(
    context: Mapping[str, Any], hypothesis: Mapping[str, Any]
) -> dict[str, Any]:
    metric = context["metricsById"][hypothesis["metricId"]]
    if not str(metric.get("source", "")).startswith("grade"):
        return {"method": "grader-disagreement-bounds", "status": "unavailable", "reason": "metric source is not a grade score"}
    grades_by_id = {
        str(grade["gradeId"]): grade
        for grade in context["request"]["grades"]
        if isinstance(grade, Mapping) and isinstance(grade.get("gradeId"), str)
    }
    lower_values = {root: dict(values) for root, values in context["selectedValues"].items()}
    upper_values = {root: dict(values) for root, values in context["selectedValues"].items()}
    unavailable: list[str] = []
    for root, selected in context["selection"].items():
        row = context["rowsById"][selected]
        scores = []
        for grade_id in row.get("gradeIds", []):
            grade = grades_by_id.get(str(grade_id))
            if not grade or grade.get("status") != "valid":
                continue
            scores.extend(
                _finite(label["score"], f"grade {grade_id!r} score")
                for label in grade.get("labels", [])
                if isinstance(label, Mapping) and label.get("score") is not None
            )
        if not scores:
            unavailable.append(str(selected))
            continue
        condition = context["rowsById"][root]["conditionId"]
        sign = 1.0 if hypothesis["direction"] == "higher" else -1.0
        is_candidate = condition == hypothesis["candidateConditionId"]
        lower_choice = min(scores) if (is_candidate == (sign > 0)) else max(scores)
        upper_choice = max(scores) if (is_candidate == (sign > 0)) else min(scores)
        lower_values[root][hypothesis["metricId"]] = lower_choice
        upper_values[root][hypothesis["metricId"]] = upper_choice
    if unavailable:
        return {
            "method": "grader-disagreement-bounds",
            "status": "unavailable",
            "missingLabelAttemptIds": sorted(unavailable),
            "reason": "missing/malformed labels are not treated as agreement",
        }
    lower = hypothesis_estimate(context, hypothesis, selected_values=lower_values)
    upper = hypothesis_estimate(context, hypothesis, selected_values=upper_values)
    return {
        "method": "grader-disagreement-bounds",
        "status": "complete",
        "lower": lower["effect"],
        "upper": upper["effect"],
        "individualLabelsRetained": True,
    }


def _saved_sensitivity(context: Mapping[str, Any], hypothesis: Mapping[str, Any], scenario: Mapping[str, Any]) -> dict[str, Any]:
    """Recompute one saved alternative, leaving the primary context untouched."""
    method = scenario["method"]
    alternative_context = dict(context)
    alternative_hypothesis = dict(hypothesis)
    values = {root: dict(metrics) for root, metrics in context["selectedValues"].items()}
    if method == "alternative-summary":
        if scenario.get("metricId") not in context["metricsById"]:
            raise lib.ContractError(("alternative summary names an unknown metric",))
        if scenario["metricId"] == hypothesis["metricId"]:
            alternative_hypothesis.update(summary=scenario.get("summary"), quantile=scenario.get("quantile"))
    elif method == "alternative-weighting":
        weights = _mapping(scenario.get("taskWeights"), "sensitivity taskWeights")
        if set(weights) != set(context["tasksById"]):
            raise lib.ContractError(("alternative weights must name the complete saved task set",))
        tasks = {}
        for task_id, task in context["tasksById"].items():
            weight = _finite(weights[task_id], "alternative task weight")
            if weight <= 0:
                raise lib.InputError("alternative task weights must be positive")
            tasks[task_id] = dict(task, weight=weight)
        alternative_context["tasksById"] = tasks
        alternative_hypothesis["taskWeighting"] = "saved"
    elif method == "repaired-vs-original":
        changes = _array(scenario.get("outcomes"), "repair outcomes")
        if not changes:
            raise lib.InputError("repair sensitivity needs saved outcomes")
        roots = {attempt: root for root, attempt in context["selection"].items()}
        seen = set()
        for change in changes:
            attempt, metric = change.get("attemptId"), change.get("metricId")
            if attempt not in roots or metric not in context["metricsById"] or (attempt, metric) in seen:
                raise lib.ContractError(("repair sensitivity has unknown, unselected, or duplicate outcome",))
            seen.add((attempt, metric))
            root = roots[attempt]
            original = change.get("originalValue")
            if original is not None:
                original = _finite(original, "repair originalValue")
            if original != values[root][metric]:
                raise lib.ContractError(("repair originalValue contradicts the retained mapped original",))
            values[root][metric] = _finite(change.get("repairedValue"), "repair repairedValue")
    primary = hypothesis_estimate(context, hypothesis)
    alternative = hypothesis_estimate(alternative_context, alternative_hypothesis, selected_values=values)
    return {"hypothesisId": hypothesis["id"], "method": method, "scenarioId": scenario["id"],
            "status": "complete" if alternative["complete"] and primary["complete"] else "unavailable",
            "primary": primary, "alternative": alternative, "primarySubstituted": False}


def sensitivity_results(
    context: Mapping[str, Any], hypothesis_list: Sequence[Mapping[str, Any]]
) -> tuple[list[dict[str, Any]], list[str]]:
    selected = list(context["analysis"].get("sensitivities", []))
    scenarios, _ = _unique_objects(context["analysis"].get("sensitivityScenarios", []), "sensitivityScenarios")
    for scenario in scenarios:
        if scenario.get("method") not in selected:
            raise lib.ContractError(("sensitivity scenario method is not selected in the saved plan",))
    if (
        context["analysis"]["missingness"].get("incompleteRunPolicy") == "descriptive-with-bounds"
        and "missing-outcome-bounds" not in selected
    ):
        selected.insert(0, "missing-outcome-bounds")
    results: list[dict[str, Any]] = []
    limitations: list[str] = []
    for method in selected:
        for hypothesis in hypothesis_list:
            if method == "missing-outcome-bounds":
                results.append(missing_bounds(context, hypothesis))
            elif method == "first-attempt-vs-production-retry":
                results.append(retry_sensitivity(context, hypothesis))
            elif method == "leave-one-task-out":
                results.append({"hypothesisId": hypothesis["id"], **concentration(context, hypothesis, unit="task")})
            elif method == "leave-one-family-out":
                results.append({"hypothesisId": hypothesis["id"], **concentration(context, hypothesis, unit="family")})
            elif method == "concurrency-strata":
                results.append({"hypothesisId": hypothesis["id"], **_strata_sensitivity(context, hypothesis, "concurrency")})
            elif method == "service-strata":
                results.append({"hypothesisId": hypothesis["id"], **_strata_sensitivity(context, hypothesis, "service")})
            elif method == "grader-disagreement-bounds":
                results.append({"hypothesisId": hypothesis["id"], **_grader_bound_sensitivity(context, hypothesis)})
            elif method == "infrastructure-inclusion-exclusion":
                affected_roots = [
                    root
                    for root, selected_attempt in context["selection"].items()
                    if context["rowsById"][selected_attempt]["attemptStatus"] == "infrastructure-failure"
                ]
                excluded_values = {
                    root: dict(values) for root, values in context["selectedValues"].items()
                }
                for root in affected_roots:
                    excluded_values[root][hypothesis["metricId"]] = None
                excluded = hypothesis_estimate(
                    context, hypothesis, selected_values=excluded_values
                )
                results.append({
                    "hypothesisId": hypothesis["id"],
                    "method": method,
                    "affectedAttemptIds": [context["selection"][root] for root in affected_roots],
                    "includedPrimaryBySavedStatusMap": True,
                    "exclusionCompleteCaseEffect": excluded["completeCaseEffect"],
                    "excludedTaskIds": [row["taskId"] for row in excluded["taskEffects"] if not row["complete"]],
                    "status": "no-affected-attempts" if not affected_roots else "descriptive-only",
                    "survivorFilteredExclusionNeverPromoted": True,
                })
            elif method == "treatment-exposure-uncertainty":
                results.append({
                    "hypothesisId": hypothesis["id"],
                    "method": method,
                    "bounds": status_uncertainty_bounds(
                        context, hypothesis, statuses={"treatment-unverified"}
                    ),
                    "status": "complete",
                })
            elif method in {"repaired-vs-original", "alternative-summary", "alternative-weighting"}:
                matching = [scenario for scenario in scenarios if scenario["method"] == method]
                if not matching:
                    results.append({"hypothesisId": hypothesis["id"], "method": method, "status": "unavailable", "reason": "no alternative values: required saved sensitivityScenarios payload is absent"})
                    limitations.append(f"{method} requested without prespecified alternative values")
                for scenario in matching:
                    results.append(_saved_sensitivity(context, hypothesis, scenario))
            else:
                raise lib.InputError(f"unknown sensitivity method {method!r}")
    return results, limitations


def _decision_rows(
    context: Mapping[str, Any],
    hypothesis_list: Sequence[Mapping[str, Any]],
    estimates: Mapping[str, Mapping[str, Any]],
    bootstraps: Mapping[str, Mapping[str, Any]],
    multiplicity: Mapping[str, Any],
    sequential: Mapping[str, Any],
) -> tuple[list[dict[str, Any]], str]:
    decision_plan = _mapping(context["analysis"].get("decision"), "analysis.decision")
    threshold = decision_plan.get("practicalThreshold")
    margin = decision_plan.get("nonInferiorityMargin")
    if threshold is not None:
        threshold = _finite(threshold, "decision practicalThreshold")
    if margin is not None:
        margin = _finite(margin, "decision nonInferiorityMargin")
        if margin < 0:
            raise lib.InputError("noninferiority margin must be non-negative")
    adjusted = {
        row["hypothesisId"]: row
        for row in multiplicity.get("results", [])
    }
    veto_metric_ids = set(decision_plan.get("vetoMetricIds", []))
    eligible = {}
    if sequential["method"] == "finite-look-union-bound":
        eligible = {test["hypothesisId"]: test for test in sequential["looks"][-1]["tests"]}
    rows = []
    for hypothesis in hypothesis_list:
        look_test = eligible.get(hypothesis["id"])
        estimate = estimates[hypothesis["id"]] if look_test is None else look_test["estimate"]
        bootstrap = bootstraps[hypothesis["id"]] if look_test is None else look_test["uncertainty"]
        effect = estimate["effect"]
        interval_available = bootstrap.get("status") == "complete" and bootstrap.get("available", True)
        reported_interval = bootstrap.get("reportedInterval", {})
        lower = reported_interval.get("lower") if interval_available else None
        one_lower = reported_interval.get("oneSidedLower") if interval_available else None
        practical_pass = (
            threshold is not None and effect is not None and lower is not None
            and float(effect) > threshold and float(lower) > threshold
        )
        ni_pass = (
            margin is not None and effect is not None and one_lower is not None
            and float(one_lower) > -margin
        )
        sharp = adjusted.get(hypothesis["id"])
        if look_test is not None:
            sharp = {"rawPValue": look_test["pValue"], "adjustedPValue": None,
                     "reject": look_test["reject"]}
        rows.append(
            {
                "hypothesisId": hypothesis["id"],
                "pointEffect": effect,
                "practicalSuperiority": {
                    "threshold": threshold,
                    "intervalLower": lower,
                    "passed": practical_pass,
                    "rule": "oriented point effect and lower interval bound must both exceed the saved threshold",
                },
                "nonInferiority": {
                    "margin": margin,
                    "boundary": None if margin is None else -margin,
                    "oneSidedLower": one_lower,
                    "passed": ni_pass,
                    "estimand": "saved task-weighted oriented contrast",
                    "assumptions": [
                        "the declared bootstrap clusters represent the intended sampling variation",
                        "the margin and direction were fixed before scoring",
                    ],
                },
                "outcomeQualityVeto": {
                    "metricSelected": hypothesis["metricId"] in veto_metric_ids,
                    "triggered": (
                        hypothesis["metricId"] in veto_metric_ids
                        and (effect is None or float(effect) < 0.0)
                    ),
                    "rule": "a saved veto metric must have a complete non-regressing oriented effect",
                },
                "sharpNull": {
                    "claim": "no position-level outcome changes under condition-label assignment",
                    "rawPValue": None if sharp is None else sharp["rawPValue"],
                    "adjustedPValue": None if sharp is None else sharp["adjustedPValue"],
                    "nominalRejected": False if sharp is None else sharp["reject"],
                    "rejected": (
                        look_test["reject"] if look_test is not None else (
                            False if sharp is None or multiplicity.get("status") != "controlled"
                            else sharp["reject"]
                        )
                    ),
                    "separateFromPracticalAndNonInferiorityClaims": True,
                },
            }
        )
    primaries = [row for row, hypothesis in zip(rows, hypothesis_list) if hypothesis["role"] == "primary"]
    if not primaries:
        primaries = rows
    rule = decision_plan.get("rule")
    if context["refusals"]:
        decision = "descriptive-only"
    elif any(row["outcomeQualityVeto"]["triggered"] for row in rows):
        decision = "retain-control"
    elif rule == "descriptive-only":
        decision = "descriptive-only"
    elif rule == "estimate-only":
        decision = "inconclusive"
    elif rule == "adopt-if-all-primary":
        decision = "adopt" if primaries and all(
            row["practicalSuperiority"]["passed"] and row["sharpNull"]["rejected"]
            for row in primaries
        ) else "inconclusive"
    elif rule == "retain-control-unless-noninferior":
        decision = "adopt" if primaries and all(row["nonInferiority"]["passed"] for row in primaries) else "retain-control"
    else:
        raise lib.InputError(f"unknown decision rule {rule!r}")
    return rows, decision


def _ensure_finite_json(value: Any, path: str = "$") -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise lib.ContractError((f"analysis output {path} is non-finite",))
    if isinstance(value, Mapping):
        for key, child in value.items():
            _ensure_finite_json(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _ensure_finite_json(child, f"{path}[{index}]")


def analyze_request(request: Mapping[str, Any]) -> dict[str, Any]:
    context = build_context(request)
    hypothesis_list = hypotheses(context)
    paired_estimates = {
        hypothesis["id"]: hypothesis_estimate(context, hypothesis)
        for hypothesis in hypothesis_list
    }
    inference_rows = [randomization_inference(context, hypothesis) for hypothesis in hypothesis_list]
    inference_by_id = {row["hypothesisId"]: row for row in inference_rows}
    bootstrap_rows = [
        bootstrap_for_hypothesis(context, hypothesis, paired_estimates[hypothesis["id"]])
        for hypothesis in hypothesis_list
    ]
    bootstrap_by_id = {row["hypothesisId"]: row for row in bootstrap_rows}

    multiplicity_plan = _mapping(context["analysis"].get("multiplicity"), "analysis.multiplicity")
    family_ids = list(multiplicity_plan.get("hypothesisIds", []))
    expected_ids = [str(hypothesis["id"]) for hypothesis in hypothesis_list]
    if len(family_ids) != len(set(family_ids)) or set(family_ids) != set(expected_ids):
        raise lib.ContractError(("multiplicity family must contain every saved contrast/metric hypothesis exactly once",))
    p_values = []
    inference_complete = True
    for hypothesis_id in family_ids:
        row = inference_by_id[hypothesis_id]
        if row.get("status") != "complete":
            inference_complete = False
            break
        p_values.append(float(row["pValue"]))
    if inference_complete:
        try:
            multiplicity = core.adjust_family(
                family_ids,
                p_values,
                method=str(multiplicity_plan.get("method")),
                alpha=float(multiplicity_plan.get("alpha")),
                family_id=str(multiplicity_plan.get("familyId")),
                interval_policy=str(multiplicity_plan.get("intervalPolicy")),
            )
        except ValueError as exc:
            raise lib.InputError(str(exc)) from exc
    else:
        multiplicity = {
            "familyId": multiplicity_plan.get("familyId"),
            "method": multiplicity_plan.get("method"),
            "alpha": multiplicity_plan.get("alpha"),
            "hypothesisIds": family_ids,
            "intervalPolicy": multiplicity_plan.get("intervalPolicy"),
            "intervalLabel": (
                "marginal-not-multiplicity-adjusted"
                if multiplicity_plan.get("intervalPolicy") == "marginal"
                else str(multiplicity_plan.get("intervalPolicy"))
            ),
            "completeFamily": True,
            "status": "unavailable",
            "results": [],
        }

    interval_policy = multiplicity_plan.get("intervalPolicy")
    if interval_policy == "simultaneous" and context["analysis"]["bootstrap"]["method"] != "none":
        simultaneous_level = 1.0 - float(multiplicity_plan["alpha"]) / len(hypothesis_list)
        for hypothesis in hypothesis_list:
            simultaneous = bootstrap_for_hypothesis(
                context,
                hypothesis,
                paired_estimates[hypothesis["id"]],
                confidence_level=simultaneous_level,
            )
            bootstrap_by_id[hypothesis["id"]]["simultaneousInterval"] = simultaneous
            bootstrap_by_id[hypothesis["id"]]["reportedInterval"] = {
                "label": "simultaneous-bonferroni",
                "confidenceLevel": simultaneous_level,
                "lower": simultaneous.get("lower"),
                "upper": simultaneous.get("upper"),
                "oneSidedLower": simultaneous.get("oneSidedLower"),
            }
    else:
        for hypothesis in hypothesis_list:
            bootstrap = bootstrap_by_id[hypothesis["id"]]
            bootstrap["reportedInterval"] = {
                "label": (
                    "marginal-not-multiplicity-adjusted"
                    if interval_policy == "marginal" else "not-reported"
                ),
                "confidenceLevel": bootstrap.get("confidenceLevel") if interval_policy == "marginal" else None,
                "lower": bootstrap.get("lower") if interval_policy == "marginal" else None,
                "upper": bootstrap.get("upper") if interval_policy == "marginal" else None,
                "oneSidedLower": bootstrap.get("oneSidedLower") if interval_policy == "marginal" else None,
            }

    sequential = finite_looks(context, hypothesis_list)
    precision = precision_power(context, hypothesis_list)
    sensitivities, sensitivity_limits = sensitivity_results(context, hypothesis_list)
    grader = grader_uncertainty(context)
    decisions, scientific_decision = _decision_rows(
        context, hypothesis_list, paired_estimates, bootstrap_by_id, multiplicity, sequential
    )
    unsupported = [row for row in inference_rows if row.get("status") == "unsupported"]
    required_sensitivity_unavailable = any(row.get("status") in {"unavailable", "unsupported"} for row in sensitivities)
    look_uncertainties = [test["uncertainty"] for look in sequential["looks"] for test in look["tests"] if test.get("uncertainty") is not None]
    unavailable = [row for row in inference_rows + bootstrap_rows + sensitivities + look_uncertainties if row.get("status") == "unavailable"]
    if unavailable or unsupported or precision.get("status") == "unsupported":
        scientific_decision = "descriptive-only"
    limitations = list(sensitivity_limits)
    if precision.get("status") == "unsupported":
        limitations.append("one or more requested full-design simulation scenarios were computationally unsupported")
    if multiplicity.get("status") == "uncontrolled-complete-family":
        limitations.append("the complete multi-hypothesis family was reported without error-rate control")
    limitations.extend(row["limitation"] for row in unsupported if row.get("limitation"))
    limitations.extend(row.get("limitation") or row.get("reason") or row.get("error") or f"required analysis {row.get('method')} unavailable" for row in unavailable)
    limitations.extend(grader["limitations"])
    if context["refusals"]:
        limitations.append("one or more prespecified status actions refuse inferential scoring")
    if any(not estimate["complete"] for estimate in paired_estimates.values()):
        limitations.append("primary effects are not survivor-filtered; incomplete contrasts are null with full-schedule bounds")
    limitations = sorted(set(limitations))
    status = "failed" if context["refusals"] else (
        "unsupported" if unsupported or required_sensitivity_unavailable or precision.get("status") == "unsupported" else (
            "descriptive-only" if unavailable else "complete"
        )
    )
    result = {
        "schemaVersion": 1,
        "status": status,
        "paired": {
            "dataset": {
                "schemaVersion": 1,
                "scheduledRows": len(context["scheduleRows"]),
                "mappedRows": context["mappedTable"],
                "completeScheduleReconciled": True,
                "survivorFiltering": False,
                "failureMappingRefusals": context["refusals"],
            },
            "selectionPolicy": context["analysis"]["retryPolicy"]["estimand"],
            "selectedAttemptByRoot": context["selection"],
            "taskConditionSummaries": task_condition_summaries(context),
            "contrasts": [paired_estimates[hypothesis["id"]] for hypothesis in hypothesis_list],
            "rawTaskPairedVisible": True,
        },
        "inference": {
            "randomization": inference_rows,
            "bootstrap": bootstrap_rows,
            "sequential": sequential,
            "precisionPower": precision,
        },
        "multiplicity": multiplicity,
        "decisions": decisions,
        "scientificDecision": scientific_decision,
        "reliability": reliability_metrics(context),
        "graderUncertainty": grader,
        "sensitivities": sensitivities,
        "modelAnalysis": {
            "delegatedTo": "analysis_models",
            "requestedMethodIds": [method["id"] for method in context["analysis"].get("models", [])],
            "called": False,
            "pairedResultMustRemainVisible": True,
        },
        "diagnostics": [
            {
                "code": "ASSIGNMENT_INFERENCE_MATCH",
                "passed": not unsupported,
                "assignment": context["schedule"]["assignment"]["method"],
                "inference": context["analysis"]["randomization"]["inferenceContract"],
            },
            {
                "code": "COMPLETE_DATASET_RECONCILIATION",
                "passed": True,
                "scheduled": len(context["scheduleRows"]),
                "analyzed": len(context["mappedTable"]),
            },
        ],
        "limitations": limitations,
    }
    _ensure_finite_json(result)
    return result
