#!/usr/bin/env python3
"""Generate a deterministic blocked benchmark schedule as LF JSONL."""

from __future__ import annotations

import argparse
import csv
import io
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Sequence

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


def generate_schedule(
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
