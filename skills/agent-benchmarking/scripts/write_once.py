#!/usr/bin/env python3
"""Publish one complete file without replacing an existing destination."""

from __future__ import annotations

import argparse
import sys

from benchmark_lib import (
    BenchmarkError,
    EXIT_INVALID,
    EXIT_OK,
    atomic_create_bytes,
    canonical_json_bytes,
    canonical_jsonl_bytes,
    parse_json_bytes,
    parse_jsonl_bytes,
    read_bytes,
    safe_join,
    safe_relative_path,
)


def _mode(value: str) -> int:
    try:
        parsed = int(value, 8)
    except ValueError:
        raise argparse.ArgumentTypeError("mode must be an octal integer") from None
    if parsed < 0 or parsed > 0o777:
        raise argparse.ArgumentTypeError("mode must be between 000 and 777")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Atomically create OUTPUT under ROOT. Existing outputs are never "
            "replaced. Exit codes: 0 created, 1 invalid/input/write refusal, "
            "2 command-line usage."
        )
    )
    parser.add_argument(
        "output",
        metavar="OUTPUT",
        help="canonical POSIX relative output path beneath --root",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="output and input root (default: current directory)",
    )
    parser.add_argument(
        "--input",
        default="-",
        metavar="PATH",
        help="safe relative input path beneath --root, or - for stdin (default: -)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="reject malformed/duplicate-key JSON and write canonical JSON",
    )
    parser.add_argument(
        "--jsonl",
        action="store_true",
        help="reject malformed/duplicate-key JSONL and write canonical LF JSONL",
    )
    parser.add_argument(
        "--mode",
        type=_mode,
        default=0o600,
        metavar="OCTAL",
        help="new file permissions (default: 600)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.json and args.jsonl:
        parser.error("--json and --jsonl are mutually exclusive")
    try:
        output_relative = safe_relative_path(args.output, "OUTPUT")
        output_path = safe_join(args.root, output_relative)
        if args.input == "-":
            data = sys.stdin.buffer.read()
        else:
            input_relative = safe_relative_path(args.input, "--input")
            data = read_bytes(safe_join(args.root, input_relative))
        if args.json:
            data = canonical_json_bytes(parse_json_bytes(data, args.input))
        elif args.jsonl:
            data = canonical_jsonl_bytes(parse_jsonl_bytes(data, args.input))
        atomic_create_bytes(output_path, data, mode=args.mode)
    except (BenchmarkError, OSError) as exc:
        print(f"write_once: invalid: {exc}", file=sys.stderr)
        return EXIT_INVALID
    print(f"created {output_relative} ({len(data)} bytes)")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
