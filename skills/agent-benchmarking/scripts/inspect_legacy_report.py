#!/usr/bin/env python3
"""Read one already-saved historical JSON/Markdown report without running anything."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys


def inspect_report(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        # Preserve the original schema; do not migrate, analyze, or grade it.
        json.loads(text, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f"non-finite JSON: {value}")))
    elif path.suffix.lower() not in {".md", ".markdown"}:
        raise ValueError("select a saved .json or .md report file, not a run directory")
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="path to an existing historical decision-report.json or report.md")
    args = parser.parse_args()
    try:
        sys.stdout.write(inspect_report(args.path))
        return 0
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
