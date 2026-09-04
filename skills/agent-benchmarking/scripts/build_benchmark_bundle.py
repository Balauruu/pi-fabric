#!/usr/bin/env python3
"""Build or verify the prebuilt Fabric benchmark guest from modular sources."""
from __future__ import annotations
import argparse, hashlib, json, os, stat, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "workflows/benchmark.source.ts"
ARTIFACT_STORE = ROOT / "workflows/artifact_store.ts"
BUNDLE = ROOT / "workflows/benchmark.ts"
MARKER = "/* @include ./artifact_store.ts */"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rendered() -> tuple[bytes, dict[str, object]]:
    source = SOURCE.read_bytes()
    module = ARTIFACT_STORE.read_bytes()
    source_text = source.decode("utf-8")
    module_text = module.decode("utf-8")
    if source_text.count(MARKER) != 1:
        raise ValueError("benchmark source must contain exactly one artifact-store include marker")
    module_lines = []
    for line in module_text.splitlines():
        module_lines.append(line[len("export "):] if line.startswith("export ") else line)
    inlined = "\n".join(module_lines).rstrip() + "\n"
    header = (
        "/* GENERATED FILE - DO NOT EDIT.\n"
        " * Source: workflows/benchmark.source.ts\n"
        " * Module: workflows/artifact_store.ts\n"
        f" * Source-SHA256: {digest(source)}\n"
        f" * Artifact-Store-SHA256: {digest(module)}\n"
        " * Regenerate: python -B scripts/build_benchmark_bundle.py --write\n"
        " */\n"
    )
    output = (header + source_text.replace(MARKER, inlined.rstrip())).encode("utf-8")
    metadata = {
        "schema_version": 1,
        "source_path": SOURCE.relative_to(ROOT).as_posix(),
        "source_sha256": digest(source),
        "artifact_store_path": ARTIFACT_STORE.relative_to(ROOT).as_posix(),
        "artifact_store_sha256": digest(module),
        "bundle_path": BUNDLE.relative_to(ROOT).as_posix(),
        "bundle_sha256": digest(output),
        "bundle_bytes": len(output),
    }
    return output, metadata


def write_atomic(path: Path, data: bytes) -> None:
    if path.is_symlink():
        raise ValueError("bundle path must not be a symlink")
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    args = parser.parse_args()
    output, metadata = rendered()
    if args.write:
        write_atomic(BUNDLE, output)
        status = "written"
    else:
        if not BUNDLE.is_file() or BUNDLE.is_symlink() or BUNDLE.read_bytes() != output:
            print(json.dumps({**metadata, "status": "failed", "reason": "prebuilt bundle differs from modular sources"}, sort_keys=True))
            return 1
        status = "passed"
    print(json.dumps({**metadata, "status": status}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
