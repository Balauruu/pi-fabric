#!/usr/bin/env python3
"""Fail-closed package checks and optional seal, contract, and lifecycle orchestration."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from pathlib import PurePosixPath
import re
import stat
import subprocess
import sys
import tempfile
from typing import Any, Iterable, Mapping, Sequence

import benchmark_lib as lib
import reconcile_lifecycle
import validate_contracts
import verify_seal

CANONICAL_REFERENCES = (
    "protocol-design.md",
    "conditions-and-mechanisms.md",
    "grading.md",
    "execution-lifecycle.md",
    "telemetry.md",
    "statistical-analysis.md",
    "audit-and-reporting.md",
    "architecture.md",
    "validation.md",
)
CANONICAL_SCRIPTS = (
    "benchmark_lib.py",
    "write_once.py",
    "generate_schedule.py",
    "verify_seal.py",
    "validate_contracts.py",
    "reconcile_lifecycle.py",
    "generate_blind_map.py",
    "aggregate_telemetry.py",
    "analyze_paired.py",
    "final_integrity.py",
    "run_canaries.py",
)
SCHEMAS = validate_contracts.CONTRACT_NAMES
LEGACY_PATHS = (
    "references/pi-herdr-execution.md",
    "scripts/check_pi_herdr_ledger.py",
    "scripts/make_schedule.py",
    "references/grading-and-analysis.md",
    "references/execution-and-evidence.md",
)
_REQUIRED_FIXTURE_FAMILIES = ("known-good", "known-bad", "isolated-defect", "boundary", "malformed")
_LINK = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def _check(condition: bool, name: str, detail: str, checks: list[dict[str, Any]]) -> None:
    checks.append({"check": name, "status": "passed" if condition else "failed", "detail": detail})


def _package_checks(root: Path) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    required = [
        "SKILL.md",
        "workflows/benchmark.ts",
        "tests/test_helpers.py",
        *(f"references/{name}" for name in CANONICAL_REFERENCES),
        "references/evidence/session-failure-to-fix.md",
        "references/evidence/external-research.md",
        "references/evidence/decision-ledger.md",
        "references/evidence/migration-cleanup.md",
        *(f"scripts/{name}" for name in CANONICAL_SCRIPTS),
        *(f"schemas/{name}.schema.json" for name in SCHEMAS),
        *(f"validation/fixtures/{name}" for name in _REQUIRED_FIXTURE_FAMILIES),
    ]
    missing = sorted(path for path in required if not (root / path).exists())
    _check(not missing, "canonical-paths", "missing: " + ", ".join(missing) if missing else f"{len(required)} required paths present", checks)

    skill = root / "SKILL.md"
    frontmatter_ok = False
    if skill.is_file():
        text = skill.read_text(encoding="utf-8")
        frontmatter_ok = text.startswith("---\n") and re.search(r"(?m)^name:\s*agent-benchmarking\s*$", text) is not None and re.search(r"(?m)^description:\s*\S", text) is not None
    _check(frontmatter_ok, "frontmatter-and-discovery", "SKILL.md names agent-benchmarking and has a description", checks)

    schema_issues: list[str] = []
    for name in SCHEMAS:
        path = root / "schemas" / f"{name}.schema.json"
        try:
            schema = lib.load_json(path)
            schema_issues.extend(f"{name}: {issue}" for issue in lib.check_schema(schema, machine_contract=True))
        except lib.BenchmarkError as exc:
            schema_issues.append(f"{name}: {exc}")
    _check(not schema_issues, "machine-contracts", "; ".join(schema_issues) if schema_issues else f"{len(SCHEMAS)} schemas parse and use the supported fail-closed subset", checks)

    static_issues: list[str] = []
    for relative in [*(f"scripts/{name}" for name in CANONICAL_SCRIPTS), "tests/test_helpers.py"]:
        path = root / relative
        if not path.is_file():
            continue
        try:
            compile(path.read_bytes(), relative, "exec")
        except (SyntaxError, ValueError) as exc:
            static_issues.append(f"{relative}: {exc}")
    _check(not static_issues, "python-static-before-agent", "; ".join(static_issues) if static_issues else "all Python entry points compile in memory before any runtime call", checks)

    executable_issues = [f"scripts/{name}" for name in CANONICAL_SCRIPTS if (root / "scripts" / name).is_file() and not os.access(root / "scripts" / name, os.X_OK)]
    _check(not executable_issues, "script-executability", "not executable: " + ", ".join(executable_issues) if executable_issues else "all canonical scripts are executable", checks)

    link_issues: list[str] = []
    markdown_paths = sorted([root / "SKILL.md", *root.glob("references/**/*.md")], key=lambda item: item.as_posix())
    for source in markdown_paths:
        if not source.is_file():
            continue
        try:
            text = source.read_text(encoding="utf-8")
        except UnicodeError as exc:
            link_issues.append(f"{source.relative_to(root)}: {exc}")
            continue
        for target in _LINK.findall(text):
            target = target.strip().split(maxsplit=1)[0].strip("<>")
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            path_text = target.split("#", 1)[0]
            if not path_text:
                continue
            destination = (source.parent / path_text).resolve(strict=False)
            try:
                destination.relative_to(root)
            except ValueError:
                link_issues.append(f"{source.relative_to(root)}: link escapes package: {target}")
                continue
            if not destination.exists():
                link_issues.append(f"{source.relative_to(root)}: unresolved link: {target}")
    _check(not link_issues, "direct-local-links", "; ".join(link_issues) if link_issues else f"checked {len(markdown_paths)} Markdown files", checks)

    legacy_present = [path for path in LEGACY_PATHS if (root / path).exists()]
    _check(not legacy_present, "legacy-and-duplicate-authorities-absent", "present: " + ", ".join(legacy_present) if legacy_present else "legacy and superseded authority paths absent", checks)

    stale_hits: list[str] = []
    allowed_history = {
        root / "references/evidence/migration-cleanup.md",
        root / "references/evidence/session-failure-to-fix.md",
        root / "references/evidence/decision-ledger.md",
        root / "references/validation.md",
    }
    stale_pattern = re.compile(r"pi-herdr-execution\.md|check_pi_herdr_ledger\.py|make_schedule\.py")
    for source in sorted([root / "SKILL.md", *root.glob("references/**/*.md")], key=lambda item: item.as_posix()):
        if not source.is_file() or source in allowed_history:
            continue
        for number, line in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
            if stale_pattern.search(line):
                stale_hits.append(f"{source.relative_to(root)}:{number}")
    _check(not stale_hits, "no-live-stale-names", ", ".join(stale_hits) if stale_hits else "no stale live references", checks)

    caches = sorted(path.relative_to(root).as_posix() for path in root.rglob("*") if path.name == "__pycache__" or path.suffix in {".pyc", ".pyo"})
    _check(not caches, "no-bytecode-or-cache", ", ".join(caches) if caches else "no package bytecode or cache paths", checks)

    fixture_issues = []
    for family in _REQUIRED_FIXTURE_FAMILIES:
        directory = root / "validation" / "fixtures" / family
        if not directory.is_dir() or not any(path.is_file() for path in directory.rglob("*")):
            fixture_issues.append(family)
    _check(not fixture_issues, "persistent-fixture-families", "empty or absent: " + ", ".join(fixture_issues) if fixture_issues else "all five labeled fixture families are populated", checks)
    return checks


def _mode(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 0o7777:
        raise lib.InputError(f"{field}: expected an integer permission mode")
    return value


def _parse_protected_baseline(value: Mapping[str, Any]) -> tuple[Path, int, dict[str, dict[str, Any]]]:
    allowed_top = {"schema_version", "root", "root_mode", "entries"}
    unknown_top = sorted(set(value) - allowed_top)
    if unknown_top:
        raise lib.InputError(f"protected baseline has unknown fields: {', '.join(unknown_top)}")
    if value.get("schema_version") != 1:
        raise lib.InputError("protected baseline schema_version must be 1")
    root_value = value.get("root")
    if not isinstance(root_value, str) or not root_value:
        raise lib.InputError("protected baseline root must be a non-empty string")
    rows = value.get("entries")
    if not isinstance(rows, list):
        raise lib.InputError("protected baseline entries must be an array")
    entries: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        source = f"entries[{index}]"
        if not isinstance(row, dict) or set(row) != {"path", "type", "mode", "bytes", "sha256"}:
            raise lib.InputError(f"{source}: expected exactly path, type, mode, bytes, sha256")
        relative = lib.safe_relative_path(row["path"], f"{source}.path")
        if relative in entries:
            raise lib.InputError(f"{source}.path: duplicate path {relative!r}")
        kind = row["type"]
        if kind not in {"file", "directory"}:
            raise lib.InputError(f"{source}.type: protected trees permit only file and directory")
        mode = _mode(row["mode"], f"{source}.mode")
        length = row["bytes"]
        digest = row["sha256"]
        if kind == "file":
            if isinstance(length, bool) or not isinstance(length, int) or length < 0:
                raise lib.InputError(f"{source}.bytes: expected a non-negative integer")
            if not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
                raise lib.InputError(f"{source}.sha256: invalid digest")
        elif length is not None or digest is not None:
            raise lib.InputError(f"{source}: directory bytes and sha256 must be null")
        entries[relative] = {
            "path": relative, "type": kind, "mode": mode,
            "bytes": length, "sha256": digest,
        }
    return Path(root_value), _mode(value.get("root_mode"), "root_mode"), entries


def _protected_tree(root: Path) -> tuple[int, dict[str, dict[str, Any]], list[str]]:
    root_stat = root.lstat()
    if stat.S_ISLNK(root_stat.st_mode) or not stat.S_ISDIR(root_stat.st_mode):
        raise lib.InputError(f"{root}: protected root must be a real directory, not a symlink")
    entries: dict[str, dict[str, Any]] = {}
    unsafe: list[str] = []

    def visit(directory: Path, prefix: PurePosixPath | None = None) -> None:
        with os.scandir(directory) as children:
            ordered = sorted(children, key=lambda item: item.name)
        for child in ordered:
            relative_path = PurePosixPath(child.name) if prefix is None else prefix / child.name
            relative = lib.safe_relative_path(relative_path.as_posix(), "protected path")
            info = child.stat(follow_symlinks=False)
            permission = stat.S_IMODE(info.st_mode)
            if stat.S_ISREG(info.st_mode):
                data = lib.read_bytes(directory / child.name)
                entries[relative] = {
                    "path": relative, "type": "file", "mode": permission,
                    "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                }
            elif stat.S_ISDIR(info.st_mode):
                entries[relative] = {
                    "path": relative, "type": "directory", "mode": permission,
                    "bytes": None, "sha256": None,
                }
                visit(directory / child.name, relative_path)
            else:
                unsafe.append(f"unsafe-type:{relative}")

    visit(root)
    return stat.S_IMODE(root_stat.st_mode), entries, unsafe


def protected_baseline_document(root: Path) -> dict[str, Any]:
    """Create baseline bytes in memory; callers decide where and whether to publish them."""
    root_mode, entries, unsafe = _protected_tree(root)
    if unsafe:
        raise lib.InputError("protected tree contains unsafe paths: " + ", ".join(unsafe))
    return {
        "schema_version": 1,
        "root": str(root),
        "root_mode": root_mode,
        "entries": [entries[key] for key in sorted(entries)],
    }


def _protected_comparison(path: Path | None) -> dict[str, Any]:
    if path is None or not path.is_file() or path.is_symlink():
        return {"status": "uncheckable", "reason": "protected baseline unavailable"}
    try:
        value = lib.load_json(path)
        if not isinstance(value, dict):
            raise lib.InputError("baseline must be an object")
        if value.get("status") == "unavailable":
            return {"status": "uncheckable", "reason": str(value.get("reason", "baseline marked unavailable"))}
        root, expected_root_mode, expected = _parse_protected_baseline(value)
        actual_root_mode, actual, unsafe = _protected_tree(root)
        differences = list(unsafe)
        if actual_root_mode != expected_root_mode:
            differences.append(f"root-mode:{expected_root_mode:o}->{actual_root_mode:o}")
        differences.extend(f"missing:{name}" for name in sorted(set(expected) - set(actual)))
        differences.extend(f"extra:{name}" for name in sorted(set(actual) - set(expected)))
        for name in sorted(set(expected) & set(actual)):
            for field in ("type", "mode", "bytes", "sha256"):
                if expected[name][field] != actual[name][field]:
                    differences.append(f"{field}:{name}")
        return {
            "status": "passed" if not differences else "failed",
            "checked": len(expected),
            "differences": differences,
        }
    except (lib.BenchmarkError, OSError, UnicodeError) as exc:
        return {"status": "uncheckable", "reason": str(exc)}


def _decode_git_path(value: bytes) -> str:
    try:
        return value.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise lib.InputError(f"git status path is not UTF-8 at byte {exc.start}") from None


def _porcelain_v2_entries(project_root: Path) -> list[dict[str, str | None]]:
    root_stat = project_root.lstat()
    if stat.S_ISLNK(root_stat.st_mode) or not stat.S_ISDIR(root_stat.st_mode):
        raise lib.InputError("project_root must be a real directory, not a symlink")
    try:
        process = subprocess.run(
            ["git", "-C", str(project_root), "status", "--porcelain=v2", "-z", "--untracked-files=all", "--ignored=no"],
            check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise lib.InputError(str(exc)) from None
    if process.returncode != 0:
        raise lib.InputError(process.stderr.decode("utf-8", "replace").strip())
    chunks = process.stdout.split(b"\0")
    if chunks and chunks[-1] == b"":
        chunks.pop()
    rows: list[dict[str, str | None]] = []
    index = 0
    while index < len(chunks):
        record = chunks[index]
        index += 1
        if record.startswith(b"1 "):
            parts = record.split(b" ", 8)
            if len(parts) != 9:
                raise lib.InputError("malformed porcelain-v2 ordinary record")
            rows.append({"path": _decode_git_path(parts[8]), "status": "1 " + _decode_git_path(parts[1]), "orig_path": None})
        elif record.startswith(b"2 "):
            parts = record.split(b" ", 9)
            if len(parts) != 10 or index >= len(chunks):
                raise lib.InputError("malformed porcelain-v2 rename/copy record")
            original = chunks[index]
            index += 1
            rows.append({
                "path": _decode_git_path(parts[9]),
                "status": "2 " + _decode_git_path(parts[1]) + " " + _decode_git_path(parts[8]),
                "orig_path": _decode_git_path(original),
            })
        elif record.startswith(b"u "):
            parts = record.split(b" ", 10)
            if len(parts) != 11:
                raise lib.InputError("malformed porcelain-v2 unmerged record")
            rows.append({"path": _decode_git_path(parts[10]), "status": "u " + _decode_git_path(parts[1]), "orig_path": None})
        elif record.startswith((b"? ", b"! ")):
            rows.append({"path": _decode_git_path(record[2:]), "status": _decode_git_path(record[:1]), "orig_path": None})
        else:
            raise lib.InputError(f"unsupported porcelain-v2 record {record[:20]!r}")
    return sorted(rows, key=lambda row: (str(row["path"]), str(row["orig_path"]), str(row["status"])))


def project_baseline_document(project_root: Path, authorized_exclusions: Sequence[str] = ()) -> dict[str, Any]:
    exclusions = [lib.safe_relative_path(value, "authorized_exclusions") for value in authorized_exclusions]
    if len(exclusions) != len(set(exclusions)):
        raise lib.InputError("authorized_exclusions must be unique")
    return {
        "schema_version": 1,
        "project_root": str(project_root),
        "porcelain_version": 2,
        "authorized_exclusions": sorted(exclusions),
        "entries": _porcelain_v2_entries(project_root),
    }


def _excluded(path: str, exclusions: Sequence[str]) -> bool:
    return any(path == prefix or path.startswith(prefix + "/") for prefix in exclusions)


def _project_comparison(path: Path | None) -> dict[str, Any]:
    if path is None or not path.is_file() or path.is_symlink():
        return {"status": "uncheckable", "reason": "project baseline unavailable"}
    try:
        raw = lib.read_bytes(path)
        if raw.startswith(b"UNAVAILABLE"):
            return {"status": "uncheckable", "reason": raw.decode("utf-8", "replace").strip()}
        value = lib.parse_json_bytes(raw, str(path))
        if not isinstance(value, dict) or set(value) != {
            "schema_version", "project_root", "porcelain_version", "authorized_exclusions", "entries"
        }:
            raise lib.InputError("project baseline has an invalid top-level contract")
        if value["schema_version"] != 1 or value["porcelain_version"] != 2:
            raise lib.InputError("project baseline requires schema_version 1 and porcelain_version 2")
        exclusions = value["authorized_exclusions"]
        if not isinstance(exclusions, list):
            raise lib.InputError("authorized_exclusions must be an array")
        checked_exclusions = [lib.safe_relative_path(item, "authorized_exclusions") for item in exclusions]
        if len(checked_exclusions) != len(set(checked_exclusions)):
            raise lib.InputError("authorized_exclusions must be unique")
        expected_rows = value["entries"]
        if not isinstance(expected_rows, list):
            raise lib.InputError("project baseline entries must be an array")
        expected: dict[tuple[str, str | None], str] = {}
        for index, row in enumerate(expected_rows):
            if not isinstance(row, dict) or set(row) != {"path", "status", "orig_path"}:
                raise lib.InputError(f"entries[{index}] has an invalid contract")
            if not isinstance(row["path"], str) or not row["path"] or not isinstance(row["status"], str):
                raise lib.InputError(f"entries[{index}] has an invalid path or status")
            if row["orig_path"] is not None and not isinstance(row["orig_path"], str):
                raise lib.InputError(f"entries[{index}].orig_path is invalid")
            key = (row["path"], row["orig_path"])
            if key in expected:
                raise lib.InputError(f"entries[{index}] duplicates a path-level record")
            expected[key] = row["status"]
        actual_rows = _porcelain_v2_entries(Path(value["project_root"]))
        actual = {(row["path"], row["orig_path"]): row["status"] for row in actual_rows}
        expected_active = {key: status for key, status in expected.items() if not _excluded(key[0], checked_exclusions)}
        actual_active = {key: status for key, status in actual.items() if not _excluded(key[0], checked_exclusions)}
        differences: list[dict[str, Any]] = []
        for key in sorted(set(expected_active) - set(actual_active)):
            differences.append({"change": "removed", "path": key[0], "orig_path": key[1], "expected_status": expected_active[key], "actual_status": None})
        for key in sorted(set(actual_active) - set(expected_active)):
            differences.append({"change": "added", "path": key[0], "orig_path": key[1], "expected_status": None, "actual_status": actual_active[key]})
        for key in sorted(set(expected_active) & set(actual_active)):
            if expected_active[key] != actual_active[key]:
                differences.append({"change": "status", "path": key[0], "orig_path": key[1], "expected_status": expected_active[key], "actual_status": actual_active[key]})
        authorized_expected = [
            {"path": key[0], "orig_path": key[1], "status": status}
            for key, status in sorted(expected.items())
            if _excluded(key[0], checked_exclusions)
        ]
        authorized_current = [row for row in actual_rows if _excluded(str(row["path"]), checked_exclusions)]
        authorized_expected_map = {(row["path"], row["orig_path"]): row["status"] for row in authorized_expected}
        authorized_current_map = {(row["path"], row["orig_path"]): row["status"] for row in authorized_current}
        authorized_differences = []
        for key in sorted(set(authorized_expected_map) | set(authorized_current_map)):
            before = authorized_expected_map.get(key)
            after = authorized_current_map.get(key)
            if before != after:
                authorized_differences.append({
                    "path": key[0], "orig_path": key[1],
                    "expected_status": before, "actual_status": after,
                })
        return {
            "status": "passed" if not differences else "failed",
            "porcelain_version": 2,
            "differences": differences,
            "authorized_exclusions": checked_exclusions,
            "authorized_baseline_entries": authorized_expected,
            "authorized_current_entries": authorized_current,
            "authorized_differences": authorized_differences,
        }
    except (lib.BenchmarkError, OSError, UnicodeError, TypeError) as exc:
        return {"status": "uncheckable", "reason": str(exc)}


def _active_seals(packet_root: Path) -> dict[str, tuple[str, dict[str, Any]]]:
    active: dict[str, tuple[str, dict[str, Any]]] = {}
    for manifest_path in sorted(packet_root.glob("seals/*/manifest.json"), key=lambda item: item.as_posix()):
        manifest = lib.load_json(manifest_path)
        if not isinstance(manifest, dict):
            raise lib.ContractError((f"{manifest_path}: expected object",))
        seal_type = manifest.get("seal_type")
        revision = manifest.get("revision")
        if seal_type not in {"design", "execution", "raw-freeze"} or not isinstance(revision, str):
            raise lib.ContractError((f"{manifest_path}: invalid seal identity",))
        match = re.search(r"-v([1-9][0-9]*)$", revision)
        if not match:
            raise lib.ContractError((f"{manifest_path}: invalid revision",))
        existing = active.get(seal_type)
        if existing is None or int(match.group(1)) > int(re.search(r"-v([1-9][0-9]*)$", existing[1]["revision"]).group(1)):
            active[seal_type] = (manifest_path.parent.relative_to(packet_root).as_posix(), manifest)
    return active


def _packet_checks(packet_root: Path, *, require_graders: bool, expected_graders: Sequence[str]) -> dict[str, Any]:
    if not packet_root.is_dir():
        raise lib.InputError(f"{packet_root}: packet root is not a directory")
    active = _active_seals(packet_root)
    required = {"design", "execution"} | ({"raw-freeze"} if require_graders else set())
    missing = sorted(required - active.keys())
    seal_results: dict[str, Any] = {}
    for seal_type in sorted(active):
        relative, _ = active[seal_type]
        seal_results[seal_type] = verify_seal.verify_seal(root=packet_root, seal=relative)
    seal_ok = not missing and all(result["status"] == "passed" for result in seal_results.values())

    with tempfile.TemporaryDirectory(prefix="agent-benchmark-integrity-") as temporary:
        receipt_paths: list[Path] = []
        for seal_type, (relative, manifest) in sorted(active.items()):
            receipt = {
                "schema_version": 1,
                "seal": relative,
                "revision": manifest["revision"],
                "status": "passed",
                "owned": len(set(manifest.get("owned_paths", []))),
            }
            receipt_path = Path(temporary) / f"{seal_type}.json"
            receipt_path.write_bytes(lib.canonical_json_bytes(receipt))
            receipt_paths.append(receipt_path)
        argv = ["--root", str(packet_root), "--strict-completion"]
        for receipt_path in receipt_paths:
            argv.extend(("--seal-receipt", str(receipt_path)))
        if require_graders:
            argv.append("--require-graders")
        for grader in expected_graders:
            argv.extend(("--expected-grader", grader))
        reconcile_args = reconcile_lifecycle._parser().parse_args(argv)
        reconciliation = reconcile_lifecycle.reconcile(reconcile_args)
    return {
        "status": "passed" if seal_ok and reconciliation["complete"] else "failed",
        "seals": {"status": "passed" if seal_ok else "failed", "missing": missing, "results": seal_results},
        "contracts": {"status": "passed" if not reconciliation["issues"] else "failed", "issues": reconciliation["issues"]},
        "reconciliation": reconciliation,
    }


def run(
    *,
    root: Path,
    protected_baseline: Path | None = None,
    project_baseline: Path | None = None,
    packet_root: Path | None = None,
    require_graders: bool = False,
    expected_graders: Sequence[str] = (),
    package_only: bool = False,
) -> dict[str, Any]:
    root = root.resolve()
    package_checks = _package_checks(root)
    protected_input = protected_baseline
    project_input = project_baseline
    protected = {"status": "not-requested"} if package_only else _protected_comparison(protected_input)
    project = {"status": "not-requested"} if package_only else _project_comparison(project_input)
    packet = None
    if packet_root is not None:
        packet = _packet_checks(packet_root.resolve(), require_graders=require_graders, expected_graders=expected_graders)
    failed = [item["check"] for item in package_checks if item["status"] != "passed"]
    uncheckable = []
    for name, value in (("protected-baseline", protected), ("project-baseline", project)):
        if value["status"] == "failed":
            failed.append(name)
        elif value["status"] == "uncheckable":
            uncheckable.append(name)
    if packet is not None and packet["status"] != "passed":
        failed.append("packet-integrity")
    status = "passed" if not failed and not uncheckable else "failed"
    return {
        "schema_version": 1,
        "scope": "package-only" if package_only else "final-integrity",
        "status": status,
        "complete": status == "passed" and not package_only,
        "mechanical": {"status": "passed" if not any(item["status"] != "passed" for item in package_checks) else "failed", "checks": package_checks},
        "packet": packet if packet is not None else {"status": "not-requested"},
        "protected_comparison": protected,
        "project_comparison": project,
        "failed_checks": sorted(failed),
        "uncheckable": sorted(uncheckable),
        "remaining_limitations": [
            "Mechanical checks prove only the encoded package, baseline, and optional packet contracts.",
            "The canonical globally position-balanced schedule is not supported by the helper's task-vector exact sign flip; confirmatory exact-randomization inference remains analysis-limited.",
            "One-shot runtime evidence distinguishes Fabric agent IDs, process handles, and workspaces, but does not prove persisted runner-session identity, OS process IDs, or nested and non-workspace state reset.",
            "No provider determinism, population representativeness, hard token/spend limit, universal cost semantics, or catastrophic coordinator-loss claim follows from this receipt.",
        ],
        "smallest_follow_up": (
            "Add sealed-randomizer allocation support to analyze_paired.py and verify one hand-enumerated "
            "coupled-schedule case before using canonical schedules for confirmatory exact inference."
        ),
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--protected-baseline", type=Path)
    parser.add_argument("--project-baseline", type=Path)
    parser.add_argument("--packet-root", type=Path, help="optional benchmark packet to reconcile strictly")
    parser.add_argument("--require-graders", action="store_true")
    parser.add_argument("--expected-grader", action="append", default=[], metavar="ID@REVISION")
    parser.add_argument(
        "--package-only", action="store_true",
        help="check the installed package without claiming final baseline or packet integrity",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        result = run(
            root=args.root,
            protected_baseline=args.protected_baseline,
            project_baseline=args.project_baseline,
            packet_root=args.packet_root,
            require_graders=args.require_graders,
            expected_graders=args.expected_grader,
            package_only=args.package_only,
        )
        sys.stdout.buffer.write(lib.canonical_json_bytes(result))
        return lib.EXIT_OK if result["status"] == "passed" else lib.EXIT_INVALID
    except lib.ContractError as exc:
        for issue in exc.issues:
            print(f"error: {issue}", file=sys.stderr)
        return lib.EXIT_INVALID
    except (lib.BenchmarkError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return lib.EXIT_INVALID


if __name__ == "__main__":
    raise SystemExit(main())
