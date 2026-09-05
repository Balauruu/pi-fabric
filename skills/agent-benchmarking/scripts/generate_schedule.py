#!/usr/bin/env python3
"""Generate a deterministic blocked benchmark schedule as LF JSONL."""

from __future__ import annotations

import argparse
import csv
import io
import itertools
import math
import re
import sys
from collections import Counter
from collections.abc import Iterator, Mapping
from pathlib import Path
from typing import Any, Sequence

import benchmark_lib as lib

_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_REVISION = re.compile(r"^v[1-9][0-9]*$")
_MAX_ROWS = 1_000_000
_SCHEMA = Path(__file__).resolve().parent.parent / "schemas" / "schedule-row.schema.json"
_FIELDS = (
    "schema_version",
    "benchmark_id",
    "schedule_revision",
    "schedule_mode",
    "attempt_id",
    "task_id",
    "condition_id",
    "repetition",
    "block",
    "order_position",
    "wave",
    "worker_slot",
    "retry_of",
)


def _unique_ids(values: Sequence[str], name: str) -> list[str]:
    if not values:
        raise lib.InputError(f"{name}: at least one ID is required")
    result = list(values)
    bad = [value for value in result if not isinstance(value, str) or not _ID.fullmatch(value)]
    if bad:
        raise lib.InputError(f"{name}: invalid ID {bad[0]!r}")
    duplicates = sorted(value for value, count in Counter(result).items() if count > 1)
    if duplicates:
        raise lib.InputError(f"{name}: duplicate IDs: {', '.join(duplicates)}")
    return result


def _generate_legacy_schedule(
    *,
    benchmark_id: str,
    schedule_revision: str,
    conditions: Sequence[str],
    tasks: Sequence[str],
    repetitions: int,
    seed: int,
    workers: int | None = None,
    schedule_mode: str = "comparative",
) -> list[dict[str, object]]:
    """Return complete randomized task blocks with balanced positions."""
    if not isinstance(benchmark_id, str) or not _ID.fullmatch(benchmark_id):
        raise lib.InputError(f"benchmark_id: invalid ID {benchmark_id!r}")
    if not isinstance(schedule_revision, str) or not _REVISION.fullmatch(schedule_revision):
        raise lib.InputError("schedule_revision: expected v followed by a positive integer")
    condition_ids = _unique_ids(conditions, "conditions")
    task_ids = _unique_ids(tasks, "tasks")
    if schedule_mode not in {"comparative", "single-condition-smoke"}:
        raise lib.InputError(
            "schedule_mode: expected comparative or single-condition-smoke"
        )
    if schedule_mode == "comparative" and len(condition_ids) < 2:
        raise lib.InputError(
            "comparative schedules require at least two conditions; use "
            "single-condition-smoke explicitly for a non-comparative smoke"
        )
    if schedule_mode == "single-condition-smoke" and len(condition_ids) != 1:
        raise lib.InputError("single-condition-smoke requires exactly one condition")
    if isinstance(repetitions, bool) or not isinstance(repetitions, int) or repetitions < 1:
        raise lib.InputError("repetitions: expected a positive integer")
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise lib.InputError("seed: expected an integer")

    block_count = len(task_ids) * repetitions
    row_count = block_count * len(condition_ids)
    if row_count > _MAX_ROWS:
        raise lib.InputError(f"schedule has {row_count} rows; maximum is {_MAX_ROWS}")
    worker_count = row_count if workers is None else workers
    if isinstance(worker_count, bool) or not isinstance(worker_count, int):
        raise lib.InputError("workers: expected an integer")
    if worker_count < 1 or worker_count > row_count:
        raise lib.InputError(f"workers: expected a value from 1 through {row_count}")

    rng = lib.DeterministicPrng(seed)
    blocks = [
        (task_id, repetition)
        for task_id in task_ids
        for repetition in range(1, repetitions + 1)
    ]
    rng.shuffle(blocks)

    base = condition_ids.copy()
    rng.shuffle(base)
    shifts: list[int] = []
    full_cycles, remainder = divmod(block_count, len(base))
    for _ in range(full_cycles):
        cycle = list(range(len(base)))
        rng.shuffle(cycle)
        shifts.extend(cycle)
    if remainder:
        cycle = list(range(len(base)))
        rng.shuffle(cycle)
        shifts.extend(cycle[:remainder])

    width = max(6, len(str(row_count)))
    rows: list[dict[str, object]] = []
    for block_number, ((task_id, repetition), shift) in enumerate(zip(blocks, shifts), 1):
        ordered = base[shift:] + base[:shift]
        for position, condition_id in enumerate(ordered, 1):
            index = len(rows) + 1
            rows.append(
                {
                    "schema_version": 1,
                    "benchmark_id": benchmark_id,
                    "schedule_revision": schedule_revision,
                    "schedule_mode": schedule_mode,
                    "attempt_id": f"a-{index:0{width}d}",
                    "task_id": task_id,
                    "condition_id": condition_id,
                    "repetition": repetition,
                    "block": block_number,
                    "order_position": position,
                    "wave": (index - 1) // worker_count + 1,
                    "worker_slot": (index - 1) % worker_count + 1,
                    "retry_of": None,
                }
            )
    _check_schedule(rows, condition_ids, task_ids, repetitions, worker_count)
    schema = lib.load_json(_SCHEMA)
    schema_issues = [
        f"row {index}: {issue}"
        for index, row in enumerate(rows, 1)
        for issue in lib.validate_json_schema(row, schema)
    ]
    if schema_issues:
        raise lib.ContractError(tuple(schema_issues))
    return rows


# The refactored schedule document uses camelCase record fields.  The legacy
# JSONL generator above stays byte-for-byte compatible at its public wrapper so
# historical callers and attempt identifiers are not reinterpreted.
_NEW_METHODS = frozenset({
    "independent-block-v1",
    "task-vector-v1",
    "balanced-cyclic-v1",
    "counterbalanced-v1",
})


def _require_mapping(value: Any, field: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise lib.InputError(f"{field}: expected an object")
    return value


def _validate_new_request(request: Mapping[str, Any]) -> tuple[Mapping[str, Any], list[str], list[str]]:
    if set(request) != {"schemaVersion", "resolvedSpec"}:
        unknown = sorted(set(request) - {"schemaVersion", "resolvedSpec"})
        missing = sorted({"schemaVersion", "resolvedSpec"} - set(request))
        detail = []
        if unknown:
            detail.append(f"unknown keys: {', '.join(unknown)}")
        if missing:
            detail.append(f"missing keys: {', '.join(missing)}")
        raise lib.InputError("generate_schedule request: " + "; ".join(detail))
    if request.get("schemaVersion") != 1:
        raise lib.InputError("generate_schedule request.schemaVersion must be 1")
    spec = _require_mapping(request.get("resolvedSpec"), "resolvedSpec")
    experiment_id = spec.get("experimentId")
    if not isinstance(experiment_id, str) or not _ID.fullmatch(experiment_id):
        raise lib.InputError("resolvedSpec.experimentId: expected a valid ID")
    tasks_raw = spec.get("tasks")
    conditions_raw = spec.get("conditions")
    if not isinstance(tasks_raw, list) or not isinstance(conditions_raw, list):
        raise lib.InputError("resolvedSpec tasks and conditions must be arrays")
    task_ids = _unique_ids(
        [item.get("id") if isinstance(item, Mapping) else item for item in tasks_raw],
        "resolvedSpec.tasks",
    )
    condition_ids = _unique_ids(
        [item.get("id") if isinstance(item, Mapping) else item for item in conditions_raw],
        "resolvedSpec.conditions",
    )
    if len(condition_ids) < 2:
        raise lib.InputError("resolvedSpec.conditions requires at least two conditions")
    return spec, task_ids, condition_ids


def _validate_assignment(
    spec: Mapping[str, Any], condition_ids: Sequence[str]
) -> tuple[Mapping[str, Any], int, list[str], int]:
    design = _require_mapping(spec.get("design"), "resolvedSpec.design")
    repetitions = design.get("repetitions")
    if isinstance(repetitions, bool) or not isinstance(repetitions, int) or repetitions < 1:
        raise lib.InputError("resolvedSpec.design.repetitions must be a positive integer")
    order = _unique_ids(design.get("conditionOrder", []), "resolvedSpec.design.conditionOrder")
    if set(order) != set(condition_ids) or len(order) != len(condition_ids):
        raise lib.ContractError(("design.conditionOrder must name every condition exactly once",))
    assignment = _require_mapping(design.get("assignment"), "resolvedSpec.design.assignment")
    method = assignment.get("method")
    if method not in _NEW_METHODS:
        raise lib.InputError(f"unsupported assignment method {method!r}")
    seed = assignment.get("seed")
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise lib.InputError("resolvedSpec.design.assignment.seed must be an integer")
    expected_conditioning = "period-and-block" if method == "counterbalanced-v1" else "fixed-block-order"
    if assignment.get("conditioning") != expected_conditioning:
        raise lib.InputError(
            f"{method} requires conditioning={expected_conditioning!r}; "
            "a different randomization law is not silently substituted"
        )
    parameters = _require_mapping(
        assignment.get("parameters"), "resolvedSpec.design.assignment.parameters"
    )
    expected_remainder = "random-distinct-shifts" if method == "balanced-cyclic-v1" else "not-applicable"
    if parameters.get("balanceRemainder") != expected_remainder:
        raise lib.InputError(
            f"{method} requires balanceRemainder={expected_remainder!r}"
        )
    if method == "counterbalanced-v1":
        if parameters.get("periods") != len(condition_ids):
            raise lib.InputError("counterbalanced-v1 periods must equal the number of conditions")
        if not isinstance(parameters.get("carryoverAssumption"), str) or not parameters["carryoverAssumption"]:
            raise lib.InputError("counterbalanced-v1 requires a declared carryoverAssumption")
    elif parameters.get("periods") is not None or parameters.get("carryoverAssumption") is not None:
        raise lib.InputError(f"{method} does not accept period/carryover parameters")
    return assignment, repetitions, order, seed


def _shuffled_blocks(
    task_ids: Sequence[str], repetitions: int, rng: lib.DeterministicPrng
) -> list[tuple[str, int]]:
    blocks = [
        (task_id, repetition)
        for task_id in task_ids
        for repetition in range(1, repetitions + 1)
    ]
    rng.shuffle(blocks)
    return blocks


def _balanced_orders(
    conditions: Sequence[str], block_count: int, rng: lib.DeterministicPrng
) -> list[list[str]]:
    # This is the existing generator: a randomized base and independently
    # randomized distinct shifts in every complete/remainder cycle.
    base = list(conditions)
    rng.shuffle(base)
    shifts: list[int] = []
    full_cycles, remainder = divmod(block_count, len(base))
    for _ in range(full_cycles):
        cycle = list(range(len(base)))
        rng.shuffle(cycle)
        shifts.extend(cycle)
    if remainder:
        cycle = list(range(len(base)))
        rng.shuffle(cycle)
        shifts.extend(cycle[:remainder])
    return [base[shift:] + base[:shift] for shift in shifts]


def _counterbalanced_sequences(conditions: Sequence[str]) -> tuple[tuple[str, ...], ...]:
    """Return a Williams-style position/first-order-carryover sequence roster."""
    count = len(conditions)
    indexes = [0]
    low, high = 1, count - 1
    while len(indexes) < count:
        indexes.append(low)
        low += 1
        if len(indexes) < count:
            indexes.append(high)
            high -= 1
    first = tuple(conditions[index] for index in indexes)
    location = {condition: index for index, condition in enumerate(conditions)}
    rotations = tuple(
        tuple(conditions[(location[condition] + shift) % count] for condition in first)
        for shift in range(count)
    )
    if count % 2 == 0:
        return rotations
    return rotations + tuple(tuple(reversed(sequence)) for sequence in rotations)


def _new_schedule(request: Mapping[str, Any]) -> dict[str, Any]:
    spec, task_ids, condition_ids = _validate_new_request(request)
    assignment, repetitions, condition_order, seed = _validate_assignment(spec, condition_ids)
    block_count = len(task_ids) * repetitions
    row_count = block_count * len(condition_ids)
    if row_count > _MAX_ROWS:
        raise lib.InputError(f"schedule has {row_count} rows; maximum is {_MAX_ROWS}")

    rng = lib.DeterministicPrng(seed)
    blocks = _shuffled_blocks(task_ids, repetitions, rng)
    method = str(assignment["method"])
    if method == "balanced-cyclic-v1":
        orders = _balanced_orders(condition_order, block_count, rng)
    elif method == "counterbalanced-v1":
        roster = _counterbalanced_sequences(condition_order)
        if block_count % len(roster) != 0:
            raise lib.InputError(
                f"counterbalanced-v1 requires task-repetition blocks to be a multiple of its {len(roster)}-sequence roster"
            )
        orders = []
        for _ in range(block_count // len(roster)):
            indexes = list(range(len(roster)))
            rng.shuffle(indexes)
            orders.extend([list(roster[index]) for index in indexes])
    elif method == "independent-block-v1":
        orders = []
        for _ in blocks:
            order = list(condition_order)
            rng.shuffle(order)
            orders.append(order)
    else:
        by_task: dict[str, list[str]] = {}
        for task_id in task_ids:
            order = list(condition_order)
            rng.shuffle(order)
            by_task[task_id] = order
        orders = [by_task[task_id] for task_id, _ in blocks]

    width = max(6, len(str(row_count)))
    rows: list[dict[str, Any]] = []
    for block_index, ((task_id, repetition), order) in enumerate(zip(blocks, orders), 1):
        block_id = f"b-{block_index:06d}"
        for order_position, condition_id in enumerate(order, 1):
            attempt_index = len(rows) + 1
            rows.append(
                {
                    "attemptId": f"a-{attempt_index:0{width}d}",
                    "taskId": task_id,
                    "conditionId": condition_id,
                    "repetition": repetition,
                    "blockId": block_id,
                    "blockIndex": block_index,
                    "orderPosition": order_position,
                    "retryOf": None,
                }
            )

    document = {
        "schemaVersion": 1,
        "experimentId": spec["experimentId"],
        "assignment": {
            "method": method,
            "seed": seed,
            "conditionOrder": list(condition_order),
            "conditioning": assignment["conditioning"],
            "parameters": dict(assignment["parameters"]),
        },
        "rows": rows,
    }
    _validate_schedule_document(document, task_ids, repetitions)
    return document


def generate_schedule(
    request: Mapping[str, Any] | None = None,
    **legacy: Any,
) -> dict[str, Any] | list[dict[str, object]]:
    """Generate the refactor document, or preserve the historical keyword API.

    New lifecycle callers pass exactly ``{"schemaVersion": 1,
    "resolvedSpec": ...}``.  Existing keyword callers continue to receive the
    historical snake_case row list and identifiers.
    """
    if request is not None:
        if legacy:
            raise lib.InputError("mapping and legacy schedule arguments cannot be mixed")
        return _new_schedule(_require_mapping(request, "request"))
    required = {
        "benchmark_id", "schedule_revision", "conditions", "tasks",
        "repetitions", "seed",
    }
    missing = sorted(required - set(legacy))
    unknown = sorted(set(legacy) - required - {"workers", "schedule_mode"})
    if missing or unknown:
        details = []
        if missing:
            details.append(f"missing: {', '.join(missing)}")
        if unknown:
            details.append(f"unknown: {', '.join(unknown)}")
        raise lib.InputError("legacy generate_schedule arguments: " + "; ".join(details))
    return _generate_legacy_schedule(**legacy)


def _validate_schedule_document(
    schedule: Mapping[str, Any], task_ids: Sequence[str] | None = None,
    repetitions: int | None = None,
) -> None:
    if schedule.get("schemaVersion") != 1:
        raise lib.InputError("schedule.schemaVersion must be 1")
    assignment = _require_mapping(schedule.get("assignment"), "schedule.assignment")
    conditions = _unique_ids(assignment.get("conditionOrder", []), "schedule.assignment.conditionOrder")
    rows = schedule.get("rows")
    if not isinstance(rows, list) or not rows:
        raise lib.InputError("schedule.rows must be a non-empty array")
    attempt_ids: set[str] = set()
    rows_by_id: dict[str, Mapping[str, Any]] = {}
    blocks: dict[int, list[Mapping[str, Any]]] = {}
    cells: Counter[tuple[str, int, str]] = Counter()
    for index, raw in enumerate(rows, 1):
        row = _require_mapping(raw, f"schedule.rows[{index}]")
        attempt_id = row.get("attemptId")
        task_id = row.get("taskId")
        condition_id = row.get("conditionId")
        repetition = row.get("repetition")
        block_index = row.get("blockIndex")
        if not isinstance(attempt_id, str) or not _ID.fullmatch(attempt_id):
            raise lib.InputError(f"schedule.rows[{index}].attemptId is invalid")
        if attempt_id in attempt_ids:
            raise lib.ContractError((f"duplicate schedule attempt ID {attempt_id!r}",))
        attempt_ids.add(attempt_id)
        rows_by_id[attempt_id] = row
        if not isinstance(task_id, str) or not _ID.fullmatch(task_id):
            raise lib.InputError(f"schedule.rows[{index}].taskId is invalid")
        if condition_id not in conditions:
            raise lib.ContractError((f"schedule row {attempt_id!r} has an unknown condition",))
        if isinstance(repetition, bool) or not isinstance(repetition, int) or repetition < 1:
            raise lib.InputError(f"schedule row {attempt_id!r} has an invalid repetition")
        if isinstance(block_index, bool) or not isinstance(block_index, int) or block_index < 1:
            raise lib.InputError(f"schedule row {attempt_id!r} has an invalid blockIndex")
        if row.get("retryOf") is None:
            blocks.setdefault(block_index, []).append(row)
            cells[(task_id, repetition, condition_id)] += 1
    for attempt_id, row in rows_by_id.items():
        parent_id = row.get("retryOf")
        if parent_id is None:
            continue
        parent = rows_by_id.get(parent_id)
        if parent is None:
            raise lib.ContractError((f"retry {attempt_id!r} names unknown parent {parent_id!r}",))
        if any(row.get(name) != parent.get(name) for name in ("taskId", "conditionId", "repetition")):
            raise lib.ContractError((f"retry {attempt_id!r} changes its scheduled cell",))
    if sorted(blocks) != list(range(1, len(blocks) + 1)):
        raise lib.ContractError(("schedule blockIndex values must be contiguous from one",))
    for block_index, members in blocks.items():
        task_repetitions = {(row["taskId"], row["repetition"]) for row in members}
        positions = sorted(row.get("orderPosition") for row in members)
        if len(members) != len(conditions) or len(task_repetitions) != 1:
            raise lib.ContractError((f"schedule block {block_index} is not one complete task/repetition block",))
        if {row["conditionId"] for row in members} != set(conditions):
            raise lib.ContractError((f"schedule block {block_index} omits or duplicates a condition",))
        if positions != list(range(1, len(conditions) + 1)):
            raise lib.ContractError((f"schedule block {block_index} has invalid order positions",))
    if any(count != 1 for count in cells.values()):
        raise lib.ContractError(("schedule task-condition-repetition cells are not unique",))
    if task_ids is not None and repetitions is not None:
        expected = {
            (task_id, repetition, condition)
            for task_id in task_ids
            for repetition in range(1, repetitions + 1)
            for condition in conditions
        }
        if set(cells) != expected:
            raise lib.ContractError(("schedule task-condition-repetition cells are incomplete",))


def _law_context(schedule: Mapping[str, Any]) -> tuple[str, tuple[str, ...], tuple[str, ...], tuple[tuple[str, int], ...]]:
    _validate_schedule_document(schedule)
    assignment = _require_mapping(schedule["assignment"], "schedule.assignment")
    method = assignment.get("method")
    if method not in _NEW_METHODS:
        raise lib.InputError(f"unsupported assignment law {method!r}")
    expected_conditioning = "period-and-block" if method == "counterbalanced-v1" else "fixed-block-order"
    if assignment.get("conditioning") != expected_conditioning:
        raise lib.InputError(f"allocation law requires conditioning={expected_conditioning!r}")
    conditions = tuple(assignment["conditionOrder"])
    grouped: dict[int, list[Mapping[str, Any]]] = {}
    for row in schedule["rows"]:
        if row.get("retryOf") is None:
            grouped.setdefault(int(row["blockIndex"]), []).append(row)
    blocks = tuple(
        (str(min(rows, key=lambda row: int(row["orderPosition"]))["taskId"]),
         int(min(rows, key=lambda row: int(row["orderPosition"]))["repetition"]))
        for _, rows in sorted(grouped.items())
    )
    task_order: list[str] = []
    for task_id, _ in blocks:
        if task_id not in task_order:
            task_order.append(task_id)
    return str(method), conditions, tuple(task_order), blocks


def assignment_law_metadata(schedule: Mapping[str, Any]) -> dict[str, Any]:
    """Describe the exact generating path law without enumerating its support."""
    method, conditions, tasks, blocks = _law_context(schedule)
    if method == "independent-block-v1":
        exponent = len(blocks)
        factor = math.factorial(len(conditions))
        unit = "task-repetition-block"
    elif method == "task-vector-v1":
        exponent = len(tasks)
        factor = math.factorial(len(conditions))
        unit = "task"
    elif method == "balanced-cyclic-v1":
        exponent = 1 + math.ceil(len(blocks) / len(conditions))
        factor = math.factorial(len(conditions))
        unit = "randomized-base-and-distinct-shift-cycle"
    else:
        roster_size = len(_counterbalanced_sequences(conditions))
        if len(blocks) % roster_size != 0:
            raise lib.ContractError(("counterbalanced schedule has an incomplete sequence roster",))
        exponent = len(blocks) // roster_size
        factor = math.factorial(roster_size)
        unit = "counterbalanced-sequence-cycle"
    return {
        "method": method,
        "conditioning": "observed-period-and-block" if method == "counterbalanced-v1" else "observed-fixed-block-order",
        "conditionCount": len(conditions),
        "generatingChoiceUnit": unit,
        "equiprobableChoiceFactor": factor,
        "independentChoiceCount": exponent,
        "generatingPathCountFormula": f"({factor})^{exponent}",
        "eachGeneratingPathProbability": f"1/({factor})^{exponent}",
        "duplicateGeneratingPathsMayShareAllocation": method == "balanced-cyclic-v1",
    }


def allocation_path_count(schedule: Mapping[str, Any], *, stop_after: int | None = None) -> int:
    """Return the number of equiprobable generating paths, capped if requested."""
    metadata = assignment_law_metadata(schedule)
    base = int(metadata["equiprobableChoiceFactor"])
    exponent = int(metadata["independentChoiceCount"])
    result = 1
    for _ in range(exponent):
        result *= base
        if stop_after is not None and result > stop_after:
            return stop_after + 1
    return result


def _iter_allocation_paths(schedule: Mapping[str, Any]) -> Iterator[tuple[tuple[str, ...], ...]]:
    method, conditions, tasks, blocks = _law_context(schedule)
    permutations = tuple(itertools.permutations(conditions))
    if method == "independent-block-v1":
        yield from itertools.product(permutations, repeat=len(blocks))
        return
    if method == "task-vector-v1":
        for path in itertools.product(permutations, repeat=len(tasks)):
            by_task = dict(zip(tasks, path))
            yield tuple(by_task[task_id] for task_id, _ in blocks)
        return
    if method == "counterbalanced-v1":
        roster = _counterbalanced_sequences(conditions)
        cycle_count = len(blocks) // len(roster)
        sequence_permutations = tuple(itertools.permutations(roster))
        for cycles in itertools.product(sequence_permutations, repeat=cycle_count):
            yield tuple(sequence for cycle in cycles for sequence in cycle)
        return

    shift_permutations = tuple(itertools.permutations(range(len(conditions))))
    cycle_count = math.ceil(len(blocks) / len(conditions))
    for base in permutations:
        for cycles in itertools.product(shift_permutations, repeat=cycle_count):
            shifts = tuple(shift for cycle in cycles for shift in cycle)[:len(blocks)]
            yield tuple(base[shift:] + base[:shift] for shift in shifts)


def observed_allocation(schedule: Mapping[str, Any]) -> tuple[tuple[str, ...], ...]:
    _validate_schedule_document(schedule)
    grouped: dict[int, list[Mapping[str, Any]]] = {}
    for row in schedule["rows"]:
        if row.get("retryOf") is None:
            grouped.setdefault(int(row["blockIndex"]), []).append(row)
    return tuple(
        tuple(str(row["conditionId"]) for row in sorted(rows, key=lambda item: int(item["orderPosition"])))
        for _, rows in sorted(grouped.items())
    )


def validate_observed_support(schedule: Mapping[str, Any]) -> None:
    """Check membership in linear time, independently of enumeration budgets."""
    method, conditions, _, blocks = _law_context(schedule)
    observed = observed_allocation(schedule)
    valid = True
    if method == "task-vector-v1":
        by_task: dict[str, tuple[str, ...]] = {}
        for (task, _), order in zip(blocks, observed):
            if task in by_task and by_task[task] != order:
                valid = False
            by_task[task] = order
    elif method == "balanced-cyclic-v1":
        # The first order identifies the base up to rotation. Each cycle uses
        # distinct shifts, including the partial final cycle.
        base = observed[0]
        rotations = {base[i:] + base[:i] for i in range(len(conditions))}
        valid = all(order in rotations for order in observed)
        for start in range(0, len(observed), len(conditions)):
            cycle = observed[start:start + len(conditions)]
            valid = valid and len(set(cycle)) == len(cycle)
    elif method == "counterbalanced-v1":
        roster = _counterbalanced_sequences(conditions)
        valid = len(observed) % len(roster) == 0
        for start in range(0, len(observed), len(roster)):
            valid = valid and Counter(observed[start:start + len(roster)]) == Counter(roster)
    if not valid:
        raise lib.ContractError(("observed schedule is outside its declared assignment law",))


def allocation_distribution(
    schedule: Mapping[str, Any], *, max_generating_paths: int
) -> dict[str, Any]:
    """Exhaustively aggregate actual generating paths into allocation atoms."""
    if isinstance(max_generating_paths, bool) or not isinstance(max_generating_paths, int) or max_generating_paths < 1:
        raise lib.InputError("max_generating_paths must be a positive integer")
    validate_observed_support(schedule)
    path_count = allocation_path_count(schedule, stop_after=max_generating_paths)
    if path_count > max_generating_paths:
        raise lib.InputError(
            f"assignment law has more than {max_generating_paths} generating paths; exact enumeration refused"
        )
    counts = Counter(_iter_allocation_paths(schedule))
    if sum(counts.values()) != path_count:
        raise lib.ContractError(("allocation path enumeration count mismatch",))
    observed = observed_allocation(schedule)
    if observed not in counts:
        raise lib.ContractError(("observed schedule is outside its declared assignment law",))
    atoms = [
        {
            "allocation": [list(order) for order in allocation],
            "pathMultiplicity": multiplicity,
            "probabilityNumerator": multiplicity,
            "probabilityDenominator": path_count,
            "probability": multiplicity / path_count,
        }
        for allocation, multiplicity in sorted(counts.items())
    ]
    return {
        "method": schedule["assignment"]["method"],
        "conditioning": schedule["assignment"]["conditioning"],
        "generatingPathCount": path_count,
        "uniqueAllocationCount": len(atoms),
        "observedAllocation": [list(order) for order in observed],
        "observedPathMultiplicity": counts[observed],
        "observedProbability": counts[observed] / path_count,
        "atoms": atoms,
    }


def sample_allocation(schedule: Mapping[str, Any], rng: Any) -> tuple[tuple[str, ...], ...]:
    """Sample one allocation by sampling an equiprobable generating path."""
    method, conditions, tasks, blocks = _law_context(schedule)

    def permutation(values: Sequence[Any]) -> tuple[Any, ...]:
        indexes = rng.permutation(len(values))
        return tuple(values[int(index)] for index in indexes)

    if method == "independent-block-v1":
        return tuple(permutation(conditions) for _ in blocks)
    if method == "task-vector-v1":
        by_task = {task_id: permutation(conditions) for task_id in tasks}
        return tuple(by_task[task_id] for task_id, _ in blocks)
    if method == "counterbalanced-v1":
        roster = _counterbalanced_sequences(conditions)
        cycle_count = len(blocks) // len(roster)
        return tuple(sequence for _ in range(cycle_count) for sequence in permutation(roster))
    base = permutation(conditions)
    shifts: list[int] = []
    full_cycles, remainder = divmod(len(blocks), len(conditions))
    for _ in range(full_cycles):
        shifts.extend(permutation(tuple(range(len(conditions)))))
    if remainder:
        shifts.extend(permutation(tuple(range(len(conditions))))[:remainder])
    return tuple(base[shift:] + base[:shift] for shift in shifts)


def _check_schedule(
    rows: Sequence[dict[str, object]],
    conditions: Sequence[str],
    tasks: Sequence[str],
    repetitions: int,
    workers: int,
) -> None:
    expected = len(conditions) * len(tasks) * repetitions
    if len(rows) != expected:
        raise lib.ContractError((f"schedule: expected {expected} rows, found {len(rows)}",))
    if len({row["attempt_id"] for row in rows}) != expected:
        raise lib.ContractError(("schedule: attempt IDs are not unique",))

    cells = Counter(
        (row["task_id"], row["repetition"], row["condition_id"])
        for row in rows
    )
    expected_cells = {
        (task, repetition, condition)
        for task in tasks
        for repetition in range(1, repetitions + 1)
        for condition in conditions
    }
    if set(cells) != expected_cells or any(count != 1 for count in cells.values()):
        raise lib.ContractError(("schedule: task-condition-repetition cells are incomplete",))

    blocks: dict[int, list[dict[str, object]]] = {}
    for row in rows:
        blocks.setdefault(int(row["block"]), []).append(row)
    for block, members in blocks.items():
        if len(members) != len(conditions):
            raise lib.ContractError((f"schedule: block {block} is incomplete",))
        if {member["condition_id"] for member in members} != set(conditions):
            raise lib.ContractError((f"schedule: block {block} does not contain every condition",))
        if sorted(int(member["order_position"]) for member in members) != list(
            range(1, len(conditions) + 1)
        ):
            raise lib.ContractError((f"schedule: block {block} positions are invalid",))

    positions = Counter(
        (row["condition_id"], row["order_position"])
        for row in rows
    )
    for condition in conditions:
        counts = [positions[(condition, position)] for position in range(1, len(conditions) + 1)]
        if max(counts) - min(counts) > 1:
            raise lib.ContractError((f"schedule: positions for {condition!r} differ by more than one",))

    for index, row in enumerate(rows, 1):
        expected_wave = (index - 1) // workers + 1
        expected_slot = (index - 1) % workers + 1
        if row["wave"] != expected_wave or row["worker_slot"] != expected_slot:
            raise lib.ContractError((f"schedule: invalid wave or worker slot at row {index}",))


def schedule(
    conditions: Sequence[str],
    tasks: Sequence[str],
    repetitions: int,
    seed: int,
    workers: int | None = None,
    *,
    benchmark_id: str = "benchmark",
    schedule_revision: str = "v1",
    schedule_mode: str = "comparative",
) -> list[dict[str, object]]:
    """Compatibility-friendly functional entry point."""
    return generate_schedule(
        benchmark_id=benchmark_id,
        schedule_revision=schedule_revision,
        conditions=conditions,
        tasks=tasks,
        repetitions=repetitions,
        seed=seed,
        workers=workers,
        schedule_mode=schedule_mode,
    )


def csv_bytes(rows: Sequence[dict[str, object]]) -> bytes:
    if not rows:
        raise lib.InputError("cannot serialize an empty schedule")
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=_FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    encoded = stream.getvalue().encode("utf-8")
    if b"\r" in encoded:
        raise lib.ContractError(("schedule: CSV serialization contains CR bytes",))
    return encoded


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--benchmark-id", required=True)
    parser.add_argument("--schedule-revision", required=True, help="revision such as v1")
    parser.add_argument("--conditions", nargs="+", required=True, help="unique condition IDs")
    parser.add_argument("--tasks", nargs="+", required=True, help="unique task IDs")
    parser.add_argument("--repetitions", type=int, required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--workers", type=int, help="maximum attempts in each wave")
    parser.add_argument(
        "--mode",
        dest="schedule_mode",
        choices=("comparative", "single-condition-smoke"),
        default="comparative",
        help="comparative requires at least two conditions; smoke requires exactly one",
    )
    parser.add_argument("--output", help="create-only JSONL path; defaults to stdout")
    parser.add_argument("--csv", dest="csv_output", help="optional create-only CSV path")
    parser.add_argument(
        "--receipt-output",
        help="create-only commit receipt, required when both JSONL and CSV are published",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        rows = generate_schedule(
            benchmark_id=args.benchmark_id,
            schedule_revision=args.schedule_revision,
            conditions=args.conditions,
            tasks=args.tasks,
            repetitions=args.repetitions,
            seed=args.seed,
            workers=args.workers,
            schedule_mode=args.schedule_mode,
        )
        jsonl = lib.canonical_jsonl_bytes(rows)
        if b"\r" in jsonl or not jsonl.endswith(b"\n"):
            raise lib.ContractError(("schedule: JSONL is not canonical LF output",))
        if args.csv_output and not args.output:
            raise lib.InputError("--csv requires --output; stdout cannot be part of a commit")
        if args.csv_output and not args.receipt_output:
            raise lib.InputError("--receipt-output is required for JSONL and CSV publication")
        if args.receipt_output and not (args.output and args.csv_output):
            raise lib.InputError("--receipt-output is only valid with --output and --csv")

        if not args.output:
            sys.stdout.buffer.write(jsonl)
            return lib.EXIT_OK

        if not args.csv_output:
            lib.preflight_create_outputs((args.output,))
            lib.atomic_create_bytes(args.output, jsonl, mode=0o644)
            return lib.EXIT_OK

        csv_data = csv_bytes(rows)
        receipt = {
            "schema_version": 1,
            "status": "committed",
            "tool": "generate_schedule",
            "schedule_mode": args.schedule_mode,
            "prng_algorithm": lib.DETERMINISTIC_SHUFFLE_ALGORITHM,
            "seed": args.seed,
            "rows": len(rows),
            "outputs": [
                {
                    "role": "jsonl",
                    "path": str(args.output),
                    "sha256": lib.sha256_bytes(jsonl),
                    "bytes": len(jsonl),
                },
                {
                    "role": "csv",
                    "path": str(args.csv_output),
                    "sha256": lib.sha256_bytes(csv_data),
                    "bytes": len(csv_data),
                },
            ],
        }
        receipt_data = lib.canonical_json_bytes(receipt)
        lib.preflight_create_outputs(
            (args.output, args.csv_output, args.receipt_output)
        )
        lib.atomic_create_bytes(args.output, jsonl, mode=0o644)
        lib.atomic_create_bytes(args.csv_output, csv_data, mode=0o644)
        # This receipt is the commit marker. Its absence means the publication
        # is incomplete, even if one or both data files exist.
        lib.atomic_create_bytes(args.receipt_output, receipt_data, mode=0o644)
        return lib.EXIT_OK
    except lib.BenchmarkError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return lib.EXIT_INVALID


if __name__ == "__main__":
    raise SystemExit(main())
