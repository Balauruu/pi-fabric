#!/usr/bin/env python3
"""Validate benchmark JSON or JSONL against the bundled machine contracts."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Any

from benchmark_lib import (
    BenchmarkError,
    ContractError,
    EXIT_INVALID,
    EXIT_OK,
    check_schema,
    load_json,
    load_jsonl,
    validate_contract_semantics,
    validate_json_schema,
)

CONTRACT_NAMES = (
    "workflow-request",
    "task",
    "condition",
    "schedule-row",
    "attempt",
    "grader",
    "result",
    "seal",
    "telemetry",
)
DEFAULT_SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schemas"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Validate strict UTF-8 JSON/JSONL with duplicate-key rejection. "
            "Exit codes: 0 valid, 1 malformed/schema/contract failure, "
            "2 command-line usage."
        )
    )
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument(
        "--schema",
        metavar="NAME_OR_PATH",
        help="bundled contract name or an explicit schema path",
    )
    selection.add_argument(
        "--all-schemas",
        action="store_true",
        help="check all bundled schemas; DOCUMENT must be omitted",
    )
    parser.add_argument(
        "--schema-dir",
        type=Path,
        default=DEFAULT_SCHEMA_DIR,
        help="bundled schema directory",
    )
    parser.add_argument(
        "--jsonl",
        action="store_true",
        help="treat each DOCUMENT as LF-only JSONL and validate every row",
    )
    parser.add_argument(
        "documents",
        metavar="DOCUMENT",
        nargs="*",
        type=Path,
        help="document paths to validate",
    )
    return parser


def _schema_path(value: str, schema_dir: Path) -> Path:
    if value in CONTRACT_NAMES:
        return schema_dir / f"{value}.schema.json"
    return Path(value)


def _load_checked_schema(path: Path) -> dict[str, Any]:
    schema = load_json(path)
    issues = check_schema(schema, machine_contract=True)
    if issues:
        raise ContractError(tuple(f"{path}: {issue}" for issue in issues))
    return schema


def _print_issues(issues: list[str] | tuple[str, ...]) -> None:
    for issue in issues:
        print(f"validate_contracts: invalid: {issue}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.all_schemas:
        if args.documents:
            parser.error("DOCUMENT is not allowed with --all-schemas")
        if args.jsonl:
            parser.error("--jsonl is not allowed with --all-schemas")
        failures: list[str] = []
        for name in CONTRACT_NAMES:
            path = args.schema_dir / f"{name}.schema.json"
            try:
                _load_checked_schema(path)
            except ContractError as exc:
                failures.extend(exc.issues)
            except BenchmarkError as exc:
                failures.append(str(exc))
        if failures:
            _print_issues(failures)
            return EXIT_INVALID
        print(f"valid schemas: {len(CONTRACT_NAMES)}")
        return EXIT_OK

    if not args.documents:
        parser.error("at least one DOCUMENT is required with --schema")
    schema_path = _schema_path(args.schema, args.schema_dir)
    contract_name = (
        args.schema
        if args.schema in CONTRACT_NAMES
        else schema_path.name.removesuffix(".schema.json")
    )
    try:
        schema = _load_checked_schema(schema_path)
        failures: list[str] = []
        record_count = 0
        for document_path in args.documents:
            records = load_jsonl(document_path) if args.jsonl else [load_json(document_path)]
            if args.jsonl and not records:
                failures.append(f"{document_path}: JSONL contains no records")
            for index, record in enumerate(records, 1):
                source = f"{document_path}:{index}" if args.jsonl else str(document_path)
                issues = validate_json_schema(record, schema)
                issues.extend(validate_contract_semantics(contract_name, record))
                for issue in issues:
                    failures.append(f"{source}: {issue}")
                record_count += 1
        if failures:
            _print_issues(failures)
            return EXIT_INVALID
    except ContractError as exc:
        _print_issues(exc.issues)
        return EXIT_INVALID
    except BenchmarkError as exc:
        _print_issues([str(exc)])
        return EXIT_INVALID
    print(f"valid documents: {len(args.documents)}; records: {record_count}")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
