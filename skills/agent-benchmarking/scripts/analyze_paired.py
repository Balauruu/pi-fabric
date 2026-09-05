#!/usr/bin/env python3
"""Pure dictionary interface for the full assignment-matched analysis engine."""

from __future__ import annotations

import argparse
from collections.abc import Mapping, Sequence
from pathlib import Path
import sys
from typing import Any

import analysis_engine
import benchmark_lib as lib


def analyze_paired(request: Mapping[str, Any]) -> dict[str, Any]:
    """Analyze a resolved schedule/dataset without model calls or record writes."""
    if not isinstance(request, Mapping):
        raise lib.InputError("analyze_paired request must be an object")
    return analysis_engine.analyze_request(request)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="analysis request JSON")
    parser.add_argument("--output", type=Path, help="create-only result path; defaults to stdout")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        request = lib.load_json(args.input)
        if not isinstance(request, dict):
            raise lib.InputError(f"{args.input}: expected an analysis request object")
        result = analyze_paired(request)
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
