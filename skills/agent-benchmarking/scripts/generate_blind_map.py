#!/usr/bin/env python3
"""Create deterministic private and condition-free public blind maps."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys
from typing import Any, Mapping, Sequence

import benchmark_lib as lib

_SCHEMA = Path(__file__).resolve().parent.parent / "schemas" / "schedule-row.schema.json"


def _validated_schedule(path: str | Path) -> tuple[list[dict[str, Any]], bytes]:
    lib.assert_no_symlink_components(path, field="schedule")
    data = lib.read_bytes(path)
    records = lib.parse_jsonl_bytes(data, str(path))
    if not records:
        raise lib.InputError(f"{path}: schedule must not be empty")
    schema = lib.load_json(_SCHEMA)
    issues: list[str] = []
    rows: list[dict[str, Any]] = []
    for index, record in enumerate(records, 1):
        if not isinstance(record, dict):
            issues.append(f"row {index}: expected an object")
            continue
        row_issues = lib.validate_json_schema(record, schema)
        issues.extend(f"row {index}: {issue}" for issue in row_issues)
        rows.append(record)
    if issues:
        raise lib.ContractError(tuple(issues))
    attempt_ids = [row["attempt_id"] for row in rows]
    if len(attempt_ids) != len(set(attempt_ids)):
        raise lib.ContractError(("schedule: attempt IDs are not unique",))
    return rows, data


def generate_blind_maps(
    schedule_rows: Sequence[Mapping[str, Any]],
    *,
    seed: int,
    schedule_sha256: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Return a private reverse map and a grader-safe public item map."""
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise lib.InputError("seed: expected an integer")
    if not schedule_rows:
        raise lib.InputError("schedule must not be empty")
    if (
        not isinstance(schedule_sha256, str)
        or re.fullmatch(r"[0-9a-f]{64}", schedule_sha256) is None
    ):
        raise lib.InputError("schedule_sha256: expected a SHA-256 digest")

    rows = [dict(row) for row in schedule_rows]
    required = {"attempt_id", "task_id", "condition_id"}
    for index, row in enumerate(rows, 1):
        missing = sorted(required - row.keys())
        if missing:
            raise lib.ContractError((f"schedule row {index}: missing {', '.join(missing)}",))
        if any(not isinstance(row[field], str) or not row[field] for field in required):
            raise lib.ContractError((f"schedule row {index}: IDs must be non-empty strings",))
    attempt_ids = [row["attempt_id"] for row in rows]
    if len(attempt_ids) != len(set(attempt_ids)):
        raise lib.ContractError(("schedule: attempt IDs are not unique",))

    shuffled = list(range(len(rows)))
    lib.deterministic_shuffle(shuffled, seed)
    width = max(6, len(str(len(rows))))
    private_rows: list[dict[str, str]] = []
    public_rows: list[dict[str, str]] = []
    for blind_number, source_index in enumerate(shuffled, 1):
        source = rows[source_index]
        blind_id = f"blind-{blind_number:0{width}d}"
        private_rows.append(
            {
                "blind_id": blind_id,
                "attempt_id": source["attempt_id"],
                "task_id": source["task_id"],
                "condition_id": source["condition_id"],
            }
        )
        public_rows.append(
            {
                "blind_id": blind_id,
                "task_id": source["task_id"],
                "item_path": f"blinded/{blind_id}/item.json",
            }
        )

    if len({row["blind_id"] for row in private_rows}) != len(rows):
        raise lib.ContractError(("private map: blind IDs are not unique",))
    if {row["attempt_id"] for row in private_rows} != set(attempt_ids):
        raise lib.ContractError(("private map: attempt mapping is not bijective",))
    if any(set(row) != {"blind_id", "task_id", "item_path"} for row in public_rows):
        raise lib.ContractError(("public map: private fields leaked",))

    public = {
        "schema_version": 1,
        "rows": public_rows,
    }
    private = {
        "schema_version": 1,
        "seed": seed,
        "schedule_sha256": schedule_sha256,
        "public_map_sha256": lib.sha256_bytes(lib.canonical_json_bytes(public)),
        "rows": private_rows,
    }
    return private, public


def create_blind_maps(
    *,
    schedule: str | Path,
    seed: int,
    private_output: str | Path,
    public_output: str | Path,
    receipt_output: str | Path | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    private_path = Path(private_output)
    public_path = Path(public_output)
    if receipt_output is None:
        receipt_output = private_path.with_name(f"{private_path.name}.commit.json")
    receipt_path = Path(receipt_output)

    rows, schedule_bytes = _validated_schedule(schedule)
    private, public = generate_blind_maps(
        rows,
        seed=seed,
        schedule_sha256=lib.sha256_bytes(schedule_bytes),
    )
    private_data = lib.canonical_json_bytes(private)
    public_data = lib.canonical_json_bytes(public)
    receipt = {
        "schema_version": 1,
        "status": "committed",
        "tool": "generate_blind_map",
        "prng_algorithm": lib.DETERMINISTIC_SHUFFLE_ALGORITHM,
        "seed": seed,
        "schedule_sha256": lib.sha256_bytes(schedule_bytes),
        "rows": len(private["rows"]),
        "outputs": [
            {
                "role": "private",
                "path": str(private_output),
                "sha256": lib.sha256_bytes(private_data),
                "bytes": len(private_data),
            },
            {
                "role": "public",
                "path": str(public_output),
                "sha256": lib.sha256_bytes(public_data),
                "bytes": len(public_data),
            },
        ],
    }
    receipt_data = lib.canonical_json_bytes(receipt)
    lib.preflight_create_outputs((private_path, public_path, receipt_path))
    lib.atomic_create_bytes(public_path, public_data, mode=0o644)
    lib.atomic_create_bytes(private_path, private_data, mode=0o600)
    # The receipt is the commit marker. Without it, neither map is published as
    # a complete blind-map transaction.
    lib.atomic_create_bytes(receipt_path, receipt_data, mode=0o644)
    return private, public


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schedule", required=True, help="canonical schedule JSONL")
    parser.add_argument("--seed", required=True, type=int)
    parser.add_argument("--private-output", required=True, help="create-only private map")
    parser.add_argument("--public-output", required=True, help="create-only grader map")
    parser.add_argument(
        "--receipt-output",
        required=True,
        help="create-only commit receipt published after both maps",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        private, _ = create_blind_maps(
            schedule=args.schedule,
            seed=args.seed,
            private_output=args.private_output,
            public_output=args.public_output,
            receipt_output=args.receipt_output,
        )
        print(
            lib.canonical_json_bytes(
                {
                    "status": "created",
                    "rows": len(private["rows"]),
                    "private_output": str(args.private_output),
                    "public_output": str(args.public_output),
                    "receipt_output": str(args.receipt_output),
                }
            ).decode("utf-8"),
            end="",
        )
        return lib.EXIT_OK
    except lib.BenchmarkError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return lib.EXIT_INVALID


if __name__ == "__main__":
    raise SystemExit(main())
