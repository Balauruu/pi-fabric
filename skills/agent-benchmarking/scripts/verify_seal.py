#!/usr/bin/env python3
"""Create revisioned seals and verify their exact owned closure."""

from __future__ import annotations

import argparse
from pathlib import Path, PurePosixPath
import re
import stat
import sys
from typing import Any, Mapping, Sequence

import benchmark_lib as lib

_SCHEMA = Path(__file__).resolve().parent.parent / "schemas" / "seal.schema.json"

_REVISION = re.compile(r"^(design|execution|raw)-v([1-9][0-9]*)$")
_TYPE_TO_PREFIX = {"design": "design", "execution": "execution", "raw-freeze": "raw"}


ERROR_CATEGORIES = {
    "changed_copies": [],
    "changed_sources": [],
    "contract": [],
    "duplicate_paths": [],
    "extra_copies": [],
    "extra_owned": [],
    "missing_copies": [],
    "missing_sources": [],
    "stale": [],
    "unmatched_paths": [],
    "unsafe_paths": [],
}


def _safe_root(root: str | Path) -> Path:
    root_input = lib.assert_no_symlink_components(root, field="root")
    kind = _path_kind(root_input)
    if kind != "directory":
        raise lib.InputError(f"{root}: root is not a directory")
    return root_input.resolve(strict=True)


def _path_kind(path: Path) -> str:
    try:
        mode = path.lstat().st_mode
    except FileNotFoundError:
        return "missing"
    if stat.S_ISLNK(mode):
        return "symlink"
    if stat.S_ISREG(mode):
        return "file"
    if stat.S_ISDIR(mode):
        return "directory"
    return "special"


def _assert_safe_chain(
    root: Path,
    relative: str,
    *,
    allow_directory: bool | None,
) -> Path:
    """Resolve an existing relative path without following any symlink.

    ``allow_directory`` selects directories when true, regular files when false,
    and either kind when null.
    """
    rel = lib.safe_relative_path(relative)
    current = root
    parts = PurePosixPath(rel).parts
    for index, part in enumerate(parts):
        current = current / part
        final = index + 1 == len(parts)
        kind = _path_kind(current)
        if kind == "missing":
            raise lib.InputError(f"{rel}: source path is missing")
        if kind == "symlink":
            raise lib.UnsafePathError(f"{rel}: symlink path is forbidden")
        if not final and kind != "directory":
            raise lib.UnsafePathError(f"{rel}: expected a directory")
        if final:
            if allow_directory is True and kind != "directory":
                raise lib.UnsafePathError(f"{rel}: expected a directory")
            if allow_directory is False and kind != "file":
                raise lib.UnsafePathError(f"{rel}: expected a regular file")
            if allow_directory is None and kind not in {"file", "directory"}:
                raise lib.UnsafePathError(f"{rel}: expected a regular file or directory")
    return current


def _assert_safe_parent_chain(root: Path, relative: str) -> None:
    current = root
    parts = PurePosixPath(lib.safe_relative_path(relative)).parts
    for index, part in enumerate(parts[:-1]):
        current = current / part
        kind = _path_kind(current)
        if kind == "missing":
            raise lib.InputError(f"{relative}: parent directory is missing")
        if kind == "symlink":
            raise lib.UnsafePathError(f"{relative}: parent symlink is forbidden")
        if kind != "directory":
            raise lib.InputError(f"{relative}: parent component is not a directory")


def _under(parent: str, child: str) -> bool:
    parent_parts = PurePosixPath(parent).parts
    child_parts = PurePosixPath(child).parts
    if len(child_parts) < len(parent_parts):
        return False
    return child_parts[: len(parent_parts)] == parent_parts


def _path_overlap(left: str, right: str) -> bool:
    left_parts = PurePosixPath(left).parts
    right_parts = PurePosixPath(right).parts
    return left_parts == right_parts[: len(left_parts)] or right_parts == left_parts[: len(right_parts)]


def _expand_owned_paths(root: Path, requested: Sequence[str]) -> list[str]:
    if not requested:
        raise lib.InputError("at least one --owned-path is required")
    expanded: list[str] = []

    for raw in requested:
        relative = lib.safe_relative_path(raw, "owned_path")
        source = _assert_safe_chain(root, relative, allow_directory=None)
        if _path_kind(source) == "file":
            expanded.append(relative)
            continue

        for child in sorted(source.rglob("*"), key=lambda item: item.as_posix()):
            child_relative = child.relative_to(root).as_posix()
            kind = _path_kind(child)
            if kind == "symlink":
                raise lib.UnsafePathError(f"{child_relative}: symlinks are forbidden")
            if kind == "special":
                raise lib.UnsafePathError(f"{child_relative}: unsupported file type")
            if kind == "file":
                expanded.append(lib.safe_relative_path(child_relative, "owned_path"))

    if not expanded:
        raise lib.InputError("owned paths contain no regular files")

    deduplicated = sorted(set(expanded))
    if len(deduplicated) != len(expanded):
        raise lib.InputError("duplicate owned paths")
    if any(PurePosixPath(path).parts[0] == "manifest.json" for path in deduplicated):
        raise lib.InputError("manifest.json is reserved for the seal manifest")
    return deduplicated


def _derive_previous_manifest(seal_relative: str, previous_revision: str) -> str:
    """Return the exact sibling manifest path for a seal directory."""
    return (PurePosixPath(seal_relative).parent / previous_revision / "manifest.json").as_posix()


def _derive_previous_manifest_from_manifest(
    manifest_relative: str,
    previous_revision: str,
) -> str:
    seal_relative = PurePosixPath(manifest_relative).parent
    return _derive_previous_manifest(seal_relative.as_posix(), previous_revision)


def _revision_parts(revision: Any) -> tuple[str, int] | None:
    match = _REVISION.fullmatch(revision) if isinstance(revision, str) else None
    if not match:
        return None
    return match.group(1), int(match.group(2))


def _revision_issues(
    seal_type: Any,
    revision: Any,
    previous_revision: Any,
    seal_relative: str,
    *,
    strict_previous: bool = False,
) -> list[str]:
    issues: list[str] = []
    match = _revision_parts(revision)
    if not match:
        return ["revision does not have a supported revisioned form"]

    prefix, revision_number = match
    expected_prefix = _TYPE_TO_PREFIX.get(seal_type if isinstance(seal_type, str) else None)
    if expected_prefix != prefix:
        issues.append("revision prefix does not match seal_type")

    if PurePosixPath(seal_relative).name != revision:
        issues.append("seal directory basename does not match revision")

    if revision_number == 1:
        if previous_revision is not None:
            issues.append("first revision must have null previous_revision")
        return issues

    previous = _revision_parts(previous_revision)
    if previous is None:
        issues.append("revision after v1 requires previous_revision")
        return issues
    if previous[0] != prefix:
        issues.append("previous_revision must be an earlier revision of the same type")
    elif previous[1] + 1 != revision_number and strict_previous:
        issues.append("previous_revision must immediately precede revision")
    elif previous[1] >= revision_number:
        issues.append("previous_revision must be an earlier revision of the same type")
    return issues


def _seal_overlaps_requested(seal_relative: str, requested: Sequence[str], root: Path) -> bool:
    seal_parts = PurePosixPath(seal_relative).as_posix()
    for raw in requested:
        relative = lib.safe_relative_path(raw, "owned_path")
        source = _assert_safe_chain(root, relative, allow_directory=None)
        if _path_overlap(seal_parts, source.relative_to(root).as_posix()):
            return True
        if source.is_dir() and _under(source.relative_to(root).as_posix(), seal_parts):
            return True
    return False


def _manifest_path(value: Any, field: str, unsafe: list[str]) -> str | None:
    try:
        return lib.safe_relative_path(value, field)
    except lib.BenchmarkError as exc:
        unsafe.append(f"{field}: {exc}")
        return None


def _duplicates(values: Sequence[str]) -> list[str]:
    result: list[str] = []
    observed: set[str] = set()
    for value in values:
        if value in observed:
            result.append(value)
            continue
        observed.add(value)
    return sorted(set(result))


def _scan_seal_files(seal_directory: Path, unsafe: list[str]) -> set[str]:
    actual: set[str] = set()
    for path in sorted(seal_directory.rglob("*"), key=lambda item: item.as_posix()):
        relative = path.relative_to(seal_directory).as_posix()
        kind = _path_kind(path)
        if relative == "manifest.json":
            if kind != "file":
                unsafe.append(f"{relative}: expected manifest.json to be a regular file")
            continue
        if kind == "file":
            try:
                actual.add(lib.safe_relative_path(relative, "sealed_copy"))
            except lib.BenchmarkError as exc:
                unsafe.append(f"sealed_copy: {relative}: {exc}")
        elif kind == "symlink":
            unsafe.append(f"{relative}: symlink path is forbidden")
        elif kind == "special":
            unsafe.append(f"{relative}: unsupported file type")
    return actual


def _flatten_errors(errors: Mapping[str, Sequence[str]]) -> list[str]:
    return [f"{category}: {item}" for category in sorted(errors) for item in errors[category]]


def _collect_manifest_chain(
    root: Path,
    tip_manifest_relative: str,
    *,
    expected_revision: str | None = None,
    expected_seal_type: str | None = None,
    expected_benchmark_id: str | None = None,
) -> tuple[list[tuple[str, Mapping[str, Any]]], list[str]]:
    """Load a digest-linked chain from tip to v1 without following symlinks."""
    chain: list[tuple[str, Mapping[str, Any]]] = []
    issues: list[str] = []
    seen: set[str] = set()
    cursor = tip_manifest_relative
    expected_revision_for_cursor = expected_revision
    expected_type_for_cursor = expected_seal_type
    expected_benchmark_for_cursor = expected_benchmark_id

    while True:
        try:
            manifest_relative = lib.safe_relative_path(cursor, "manifest")
        except lib.BenchmarkError as exc:
            issues.append(f"seal manifest path: {exc}")
            break
        if manifest_relative in seen:
            issues.append(f"{manifest_relative}: manifest chain is cyclic")
            break
        seen.add(manifest_relative)

        try:
            manifest_path = _assert_safe_chain(
                root, manifest_relative, allow_directory=False,
            )
            manifest = lib.load_json(manifest_path)
        except lib.BenchmarkError as exc:
            issues.append(f"{manifest_relative}: {exc}")
            break
        if not isinstance(manifest, Mapping):
            issues.append(f"{manifest_relative}: manifest is not an object")
            break
        chain.append((manifest_relative, manifest))

        revision = manifest.get("revision")
        revision_parts = _revision_parts(revision)
        if revision_parts is None:
            issues.append(f"{manifest_relative}.revision: invalid revision")
            break

        seal_type = manifest.get("seal_type")
        expected_prefix = _TYPE_TO_PREFIX.get(seal_type) if isinstance(seal_type, str) else None
        if expected_prefix != revision_parts[0]:
            issues.append(f"{manifest_relative}.seal_type: mismatched revision prefix")

        seal_directory_name = PurePosixPath(manifest_relative).parent.name
        if seal_directory_name != revision:
            issues.append(
                f"{manifest_relative}: seal directory basename does not match revision"
            )

        if expected_revision_for_cursor is not None and revision != expected_revision_for_cursor:
            issues.append(
                f"{manifest_relative}.revision: chain revision mismatch; "
                f"expected {expected_revision_for_cursor}"
            )
        if expected_type_for_cursor is not None and seal_type != expected_type_for_cursor:
            issues.append(
                f"{manifest_relative}.seal_type: chain seal_type mismatch; "
                f"expected {expected_type_for_cursor}"
            )

        benchmark_id = manifest.get("benchmark_id")
        if not isinstance(benchmark_id, str):
            issues.append(f"{manifest_relative}.benchmark_id: expected string")
        elif expected_benchmark_for_cursor is not None and benchmark_id != expected_benchmark_for_cursor:
            issues.append(
                f"{manifest_relative}.benchmark_id: chain benchmark_id mismatch; "
                f"expected {expected_benchmark_for_cursor}"
            )

        schema_version = manifest.get("schema_version")
        if schema_version == 1:
            if revision_parts[1] != 1:
                issues.append(f"{manifest_relative}: schema v1 requires revision v1")
            if manifest.get("previous_revision") is not None:
                issues.append(
                    f"{manifest_relative}.previous_revision: "
                    "v1 manifest cannot define previous revision"
                )
            return chain, issues
        if schema_version != 2:
            issues.append(
                f"{manifest_relative}.schema_version: unsupported value {schema_version}"
            )
            return chain, issues
        if revision_parts[1] < 2:
            issues.append(f"{manifest_relative}: schema v2 requires revision v2 or later")

        previous_revision = manifest.get("previous_revision")
        previous_parts = _revision_parts(previous_revision)
        if previous_parts is None:
            issues.append(f"{manifest_relative}.previous_revision: invalid revision")
            break
        if previous_parts[0] != revision_parts[0]:
            issues.append(
                f"{manifest_relative}.previous_revision: previous revision type mismatch"
            )
        if previous_parts[1] + 1 != revision_parts[1]:
            issues.append(
                f"{manifest_relative}.previous_revision: "
                "previous revision must immediately precede revision"
            )

        previous_manifest_value = manifest.get("previous_manifest_path")
        try:
            previous_manifest_relative = lib.safe_relative_path(
                previous_manifest_value, "previous_manifest_path",
            )
        except lib.BenchmarkError as exc:
            issues.append(f"{manifest_relative}.previous_manifest_path: {exc}")
            break

        expected_previous_path = _derive_previous_manifest_from_manifest(
            manifest_relative, previous_revision,
        )
        if previous_manifest_relative != expected_previous_path:
            issues.append(
                f"{manifest_relative}.previous_manifest_path: "
                f"{previous_manifest_relative} does not match expected "
                f"{expected_previous_path}"
            )
            break
        if previous_manifest_relative in seen:
            issues.append(f"{previous_manifest_relative}: manifest chain is cyclic")
            break

        previous_sha = manifest.get("previous_manifest_sha256")
        if not isinstance(previous_sha, str) or re.fullmatch(r"[0-9a-f]{64}", previous_sha) is None:
            issues.append(
                f"{manifest_relative}.previous_manifest_sha256: expected sha256 hex"
            )
            break
        try:
            previous_manifest = _assert_safe_chain(
                root, previous_manifest_relative, allow_directory=False,
            )
            actual_sha = lib.sha256_file(previous_manifest)
        except lib.BenchmarkError as exc:
            issues.append(f"{manifest_relative}.previous_manifest_path: {exc}")
            break
        if actual_sha != previous_sha:
            issues.append(
                f"{manifest_relative}.previous_manifest_sha256: stale digest"
            )
            break

        cursor = previous_manifest_relative
        expected_revision_for_cursor = previous_revision
        expected_type_for_cursor = seal_type if isinstance(seal_type, str) else None
        expected_benchmark_for_cursor = benchmark_id if isinstance(benchmark_id, str) else None

    return chain, issues


def _extract_manifest_components(
    manifest: Mapping[str, Any],
    manifest_relative: str,
    schema_version: int,
    errors: dict[str, list[str]],
) -> tuple[list[str], dict[str, Mapping[str, Any]], list[str]]:
    owned_values = manifest.get("owned_paths") if isinstance(manifest.get("owned_paths"), list) else []
    file_values = manifest.get("files") if isinstance(manifest.get("files"), list) else []
    deleted_values = manifest.get("deleted_paths") if schema_version == 2 and isinstance(manifest.get("deleted_paths"), list) else []

    owned: list[str] = []
    for index, value in enumerate(owned_values):
        safe = _manifest_path(value, f"{manifest_relative}.owned_paths[{index}]", errors["unsafe_paths"])
        if safe is not None:
            owned.append(safe)

    file_map: dict[str, Mapping[str, Any]] = {}
    file_paths: list[str] = []
    for index, value in enumerate(file_values):
        if not isinstance(value, Mapping):
            errors["unsafe_paths"].append(f"{manifest_relative}.files[{index}]: expected object")
            continue
        path = _manifest_path(value.get("path"), f"{manifest_relative}.files[{index}].path", errors["unsafe_paths"])
        if path is not None:
            file_map[path] = value
            file_paths.append(path)

    deleted: list[str] = []
    if schema_version == 2:
        for index, value in enumerate(deleted_values):
            safe = _manifest_path(value, f"{manifest_relative}.deleted_paths[{index}]", errors["unsafe_paths"])
            if safe is not None:
                deleted.append(safe)

    errors["duplicate_paths"].extend(f"owned:{path}" for path in _duplicates(owned))
    errors["duplicate_paths"].extend(f"files:{path}" for path in _duplicates(file_paths))
    errors["duplicate_paths"].extend(f"deleted_paths:{path}" for path in _duplicates(deleted))
    return owned, file_map, deleted


def _entry_signature(
    entry: Mapping[str, Any],
    label: str,
    issues: list[str],
) -> tuple[str | None, int | None]:
    sha256_value = entry.get("sha256") if isinstance(entry, Mapping) else None
    bytes_value = entry.get("bytes") if isinstance(entry, Mapping) else None
    if not isinstance(sha256_value, str):
        issues.append(f"{label}.sha256: expected string")
        sha256_value = None
    if not isinstance(bytes_value, int) or isinstance(bytes_value, bool):
        issues.append(f"{label}.bytes: expected integer")
        bytes_value = None
    return sha256_value, bytes_value


def _build_effective_state(
    nodes: Sequence[dict[str, Any]],
    errors: dict[str, list[str]],
) -> dict[str, tuple[str, int]]:
    """Apply root-to-tip manifests while enforcing exact delta semantics."""
    state: dict[str, tuple[str, int]] = {}
    seen_root = False

    for node in reversed(nodes):
        relative = node["relative"]
        schema_version = node["schema_version"]
        owned_set = set(node["owned"])
        file_map: Mapping[str, Mapping[str, Any]] = node["files"]
        file_keys = set(file_map)
        deleted = set(node["deleted"])

        if schema_version == 1:
            if seen_root:
                errors["contract"].append(f"{relative}: v1 manifest must be chain root")
            next_state: dict[str, tuple[str, int]] = {}
            for path, entry in file_map.items():
                digest, size = _entry_signature(
                    entry, f"{relative}.files[{path}]", errors["unsafe_paths"],
                )
                if digest is not None and size is not None:
                    next_state[path] = (digest, size)
            for path in sorted(owned_set - set(next_state)):
                errors["unmatched_paths"].append(f"owned-only:{path}")
            for path in sorted(set(next_state) - owned_set):
                errors["unmatched_paths"].append(f"files-only:{path}")
            state = next_state
            seen_root = True
            continue

        if not seen_root:
            errors["contract"].append(f"{relative}: v2 manifest has no prior v1 state")

        previous_state = state
        previous_keys = set(previous_state)
        expected_deleted = previous_keys - owned_set
        if deleted != expected_deleted:
            errors["contract"].append(
                f"{relative}: deleted_paths is not the exact ownership delta"
            )
        for path in sorted(deleted - previous_keys):
            errors["contract"].append(f"{relative}: deleted path is unknown: {path}")
        for path in sorted(deleted & file_keys):
            errors["contract"].append(
                f"{relative}.files: path is both deleted and updated: {path}"
            )
        for path in sorted(file_keys - owned_set):
            errors["contract"].append(
                f"{relative}.files: delta copy is not currently owned: {path}"
            )

        additions = owned_set - previous_keys
        for path in sorted(additions - file_keys):
            errors["contract"].append(
                f"{relative}.files: added path is missing its delta copy: {path}"
            )

        next_state = {
            path: signature
            for path, signature in previous_state.items()
            if path in owned_set
        }
        for path, entry in file_map.items():
            digest, size = _entry_signature(
                entry, f"{relative}.files[{path}]", errors["unsafe_paths"],
            )
            if digest is None or size is None:
                continue
            signature = (digest, size)
            if path in previous_state and previous_state[path] == signature:
                errors["contract"].append(
                    f"{relative}.files: unchanged path has a redundant delta copy: {path}"
                )
            if path in owned_set:
                next_state[path] = signature

        for path in sorted(owned_set - set(next_state)):
            errors["unmatched_paths"].append(f"owned-only:{path}")
        for path in sorted(set(next_state) - owned_set):
            errors["unmatched_paths"].append(f"files-only:{path}")
        state = next_state

    return state


def _manifest_copy_ref(manifest_relative: str, relative: str) -> str:
    return f"{PurePosixPath(manifest_relative).parent.as_posix()}/{relative}"


def _normalize_chain_nodes(
    chain: Sequence[tuple[str, Mapping[str, Any]]],
    schema: Mapping[str, Any],
    errors: dict[str, list[str]],
) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    for manifest_relative, manifest in chain:
        version = manifest.get("schema_version")
        if not isinstance(version, int):
            errors["contract"].append(f"{manifest_relative}.schema_version: expected integer")
            continue
        owned, file_map, deleted = _extract_manifest_components(manifest, manifest_relative, version, errors)
        nodes.append({
            "relative": manifest_relative,
            "manifest": manifest,
            "schema_version": version,
            "owned": owned,
            "files": file_map,
            "deleted": deleted,
        })
    return nodes


def _verify_no_prior_seal_growth(
    nodes: Sequence[dict[str, Any]],
    errors: dict[str, list[str]],
) -> None:
    """Reject any delta whose source closure contains an older seal tree."""
    for index, node in enumerate(nodes):
        if node["schema_version"] != 2:
            continue
        prior_directories = {
            PurePosixPath(prior["relative"]).parent.as_posix()
            for prior in nodes[index + 1 :]
        }
        for path in node["owned"]:
            for prior_directory in prior_directories:
                if _under(prior_directory, path):
                    errors["contract"].append(
                        f"{node['relative']}.owned_paths: path includes prior "
                        f"seal tree {prior_directory}: {path}"
                    )


def _verify_manifest_chain_digests(
    root: Path,
    nodes: Sequence[dict[str, Any]],
    errors: dict[str, list[str]],
) -> None:
    """Recheck every link against the loaded next node and its current bytes."""
    for index, node in enumerate(nodes):
        if node["schema_version"] != 2:
            continue
        manifest = node["manifest"]
        relative = node["relative"]
        previous_path_value = manifest.get("previous_manifest_path")
        previous_sha = manifest.get("previous_manifest_sha256")
        if not isinstance(previous_path_value, str):
            continue
        try:
            previous_relative = lib.safe_relative_path(
                previous_path_value, f"{relative}.previous_manifest_path",
            )
        except lib.BenchmarkError:
            continue
        if index + 1 >= len(nodes) or nodes[index + 1]["relative"] != previous_relative:
            errors["contract"].append(f"{relative}: manifest chain link is incomplete")
            continue
        try:
            previous_path = _assert_safe_chain(
                root, previous_relative, allow_directory=False,
            )
            actual = lib.sha256_file(previous_path)
        except lib.BenchmarkError as exc:
            errors["contract"].append(
                f"{relative}.previous_manifest_sha256: {exc}"
            )
            continue
        if actual != previous_sha:
            errors["contract"].append(
                f"{relative}.previous_manifest_sha256: stale digest"
            )


def _verify_chain_copies(
    root: Path,
    nodes: Sequence[dict[str, Any]],
    errors: dict[str, list[str]],
) -> None:
    for node in nodes:
        relative = node["relative"]
        manifest_directory = _assert_safe_chain(
            root, relative, allow_directory=False,
        ).parent
        expected = set(node["files"])
        actual = _scan_seal_files(manifest_directory, errors["unsafe_paths"])

        for path in sorted(expected - actual):
            errors["missing_copies"].append(_manifest_copy_ref(relative, path))
        for path in sorted(actual - expected):
            errors["extra_copies"].append(_manifest_copy_ref(relative, path))

        for path in sorted(expected & actual):
            entry = node["files"][path]
            expected_hash, expected_bytes = _entry_signature(
                entry,
                f"{relative}.files[{path}]",
                errors["unsafe_paths"],
            )
            if expected_hash is None or expected_bytes is None:
                continue
            copy_relative = (
                PurePosixPath(relative).parent / PurePosixPath(path)
            ).as_posix()
            try:
                destination = _assert_safe_chain(
                    root, copy_relative, allow_directory=False,
                )
                destination_stat = destination.stat()
                destination_hash = lib.sha256_file(destination)
            except (lib.BenchmarkError, OSError):
                errors["changed_copies"].append(
                    _manifest_copy_ref(relative, path)
                )
                continue
            if (
                destination_stat.st_size != expected_bytes
                or destination_hash != expected_hash
            ):
                errors["changed_copies"].append(
                    _manifest_copy_ref(relative, path)
                )


def create_seal(
    *,
    root: str | Path,
    seal: str,
    benchmark_id: str,
    seal_type: str,
    revision: str,
    previous_revision: str | None,
    created_at: str,
    owned_paths: Sequence[str],
) -> dict[str, Any]:
    """Create a copied-seal manifest with incremental support for v2+ revisions."""
    root_path = _safe_root(root)
    seal_relative = lib.safe_relative_path(seal, "seal")

    revision_issues = _revision_issues(
        seal_type, revision, previous_revision, seal_relative, strict_previous=True,
    )
    if revision_issues:
        raise lib.ContractError(tuple(revision_issues))

    if _seal_overlaps_requested(seal_relative, owned_paths, root_path):
        raise lib.UnsafePathError("seal directory overlaps owned path")

    _assert_safe_parent_chain(root_path, seal_relative)
    seal_path = lib.safe_join(root_path, seal_relative)
    if seal_path.exists() or seal_path.is_symlink():
        raise lib.InputError(f"{seal_path}: seal already exists; create a new revision")

    expanded = _expand_owned_paths(root_path, owned_paths)
    expanded_set = set(expanded)

    revision_parts = _revision_parts(revision)
    if revision_parts is None:
        raise lib.ContractError(("revision does not have a supported revisioned form",))

    schema = lib.load_json(_SCHEMA)

    if revision_parts[1] == 1:
        source_values = []
        for relative in expanded:
            source = _assert_safe_chain(root_path, relative, allow_directory=False)
            data = lib.read_bytes(source)
            source_values.append((relative, data))

        manifest: dict[str, Any] = {
            "schema_version": 1,
            "benchmark_id": benchmark_id,
            "seal_type": seal_type,
            "revision": revision,
            "previous_revision": previous_revision,
            "created_at": created_at,
            "owned_paths": expanded,
            "files": [
                {"path": relative, "sha256": lib.sha256_bytes(data), "bytes": len(data)}
                for relative, data in source_values
            ],
        }
        schema_errors = lib.validate_json_schema(manifest, schema)
        if schema_errors:
            raise lib.ContractError(tuple(schema_errors))

        manifest_path = seal_path / "manifest.json"
        destinations = [manifest_path]
        for relative in expanded:
            destination = seal_path / relative
            destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            destinations.append(destination)
        lib.preflight_create_outputs(destinations)

        for source_path, destination in zip(( _assert_safe_chain(root_path, relative, allow_directory=False) for relative in expanded),
                                            (seal_path / relative for relative in expanded)):
            data = lib.read_bytes(source_path)
            lib.atomic_create_bytes(destination, data, mode=0o600)

        for relative, destination in ((relative, seal_path / relative) for relative in expanded):
            source = _assert_safe_chain(root_path, relative, allow_directory=False)
            expected = lib.sha256_file(source)
            actual = lib.sha256_file(destination)
            if expected != actual or source.stat().st_size != destination.stat().st_size:
                raise lib.ContractError((f"source changed while creating seal: {relative}",))

        lib.atomic_create_bytes(manifest_path, lib.canonical_json_bytes(manifest), mode=0o600)
        receipt = verify_seal(root=root_path, seal=seal_relative)
        if receipt["status"] != "passed":
            raise lib.ContractError(tuple(_flatten_errors(receipt["errors"])))
        return receipt

    if previous_revision is None:
        raise lib.ContractError(("v2+ revisions require previous_revision",))

    previous_manifest_relative = _derive_previous_manifest(seal_relative, previous_revision)
    previous_manifest_path = _assert_safe_chain(root_path, previous_manifest_relative, allow_directory=False)
    prior_seal_directory = PurePosixPath(previous_manifest_relative).parent.as_posix()
    if any(_path_overlap(prior_seal_directory, path) for path in expanded):
        raise lib.UnsafePathError("owned paths include prior seal directory")

    chain, chain_issues = _collect_manifest_chain(
        root_path,
        previous_manifest_relative,
        expected_revision=previous_revision,
        expected_seal_type=seal_type,
        expected_benchmark_id=benchmark_id,
    )
    prior_errors: dict[str, list[str]] = {
        key: [] for key in ERROR_CATEGORIES
    }
    prior_errors["contract"].extend(chain_issues)
    for relative, entry in chain:
        prior_errors["contract"].extend(
            f"{relative}: {issue}"
            for issue in lib.validate_json_schema(entry, schema)
        )
    chain_nodes = _normalize_chain_nodes(chain, schema, prior_errors)
    _verify_no_prior_seal_growth(chain_nodes, prior_errors)
    _verify_manifest_chain_digests(root_path, chain_nodes, prior_errors)
    previous_state = _build_effective_state(chain_nodes, prior_errors)
    _verify_chain_copies(root_path, chain_nodes, prior_errors)
    if any(prior_errors.values()):
        raise lib.ContractError(tuple(_flatten_errors(prior_errors)))

    prior_seal_directories = {
        PurePosixPath(relative).parent.as_posix()
        for relative, _entry in chain
    }
    for path in expanded:
        for prior_directory in prior_seal_directories:
            if _under(prior_directory, path):
                raise lib.UnsafePathError(
                    f"owned paths include prior seal tree: {prior_directory}"
                )

    previous_manifest_sha256 = lib.sha256_file(previous_manifest_path)

    current_state: dict[str, tuple[str, int]] = {}
    for relative in expanded:
        source = _assert_safe_chain(root_path, relative, allow_directory=False)
        data = lib.read_bytes(source)
        current_state[relative] = (lib.sha256_bytes(data), len(data))

    changed_paths = [
        path for path in expanded
        if previous_state.get(path) != current_state[path]
    ]
    deleted = sorted(set(previous_state) - expanded_set)

    manifest_files = [
        {
            "path": path,
            "sha256": current_state[path][0],
            "bytes": current_state[path][1],
        }
        for path in changed_paths
    ]

    manifest: dict[str, Any] = {
        "schema_version": 2,
        "benchmark_id": benchmark_id,
        "seal_type": seal_type,
        "revision": revision,
        "previous_revision": previous_revision,
        "previous_manifest_path": previous_manifest_relative,
        "previous_manifest_sha256": previous_manifest_sha256,
        "created_at": created_at,
        "owned_paths": expanded,
        "deleted_paths": deleted,
        "files": manifest_files,
    }
    schema_errors = lib.validate_json_schema(manifest, schema)
    if schema_errors:
        raise lib.ContractError(tuple(schema_errors))

    manifest_path = seal_path / "manifest.json"
    destinations: list[Path] = [manifest_path]
    seal_path.mkdir(mode=0o700)

    for item in manifest_files:
        destination = seal_path / item["path"]
        destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        destinations.append(destination)
    lib.preflight_create_outputs(destinations)

    for item in manifest_files:
        relative = item["path"]
        source = _assert_safe_chain(root_path, relative, allow_directory=False)
        data = lib.read_bytes(source)
        destination = seal_path / relative
        lib.atomic_create_bytes(destination, data, mode=0o600)

    for item in manifest_files:
        relative = item["path"]
        source = _assert_safe_chain(root_path, relative, allow_directory=False)
        destination = seal_path / relative
        if lib.sha256_file(source) != item["sha256"] or source.stat().st_size != item["bytes"]:
            raise lib.ContractError((f"source changed while creating seal: {relative}",))
        if lib.sha256_file(destination) != item["sha256"] or destination.stat().st_size != item["bytes"]:
            raise lib.ContractError((f"sealed copy mismatch before commit: {relative}",))

    lib.atomic_create_bytes(manifest_path, lib.canonical_json_bytes(manifest), mode=0o600)
    receipt = verify_seal(root=root_path, seal=seal_relative)
    if receipt["status"] != "passed":
        raise lib.ContractError(tuple(_flatten_errors(receipt["errors"])))
    return receipt


def verify_seal(
    *,
    root: str | Path,
    seal: str,
    ownership_roots: Sequence[str] = (),
) -> dict[str, Any]:
    """Verify one seal manifest and copied files against current source bytes."""
    root_path = _safe_root(root)
    seal_relative = lib.safe_relative_path(seal, "seal")

    errors: dict[str, list[str]] = {key: [] for key in ERROR_CATEGORIES}

    manifest_path = _assert_safe_chain(root_path, f"{seal_relative}/manifest.json", allow_directory=False)
    if _path_kind(manifest_path) != "file":
        errors["contract"].append("seal manifest missing or unsafe")
        return {
            "schema_version": 1,
            "seal": seal_relative,
            "revision": None,
            "status": "failed",
            "matched": 0,
            "owned": 0,
            "errors": errors,
        }

    manifest = lib.load_json(manifest_path)
    if not isinstance(manifest, Mapping):
        raise lib.ContractError(("manifest: expected an object",))

    manifest_revision = manifest.get("revision")
    manifest_type = manifest.get("seal_type")
    manifest_benchmark = manifest.get("benchmark_id")
    chain, chain_errors = _collect_manifest_chain(
        root_path,
        f"{seal_relative}/manifest.json",
        expected_revision=manifest_revision if isinstance(manifest_revision, str) else None,
        expected_seal_type=manifest_type if isinstance(manifest_type, str) else None,
        expected_benchmark_id=(
            manifest_benchmark if isinstance(manifest_benchmark, str) else None
        ),
    )
    errors["contract"].extend(chain_errors)

    schema = lib.load_json(_SCHEMA)
    for relative, entry in chain:
        errors["contract"].extend(f"{relative}: {issue}" for issue in lib.validate_json_schema(entry, schema))

    if not chain:
        errors["contract"].append("manifest: chain is missing")
        return {
            "schema_version": manifest.get("schema_version"),
            "seal": seal_relative,
            "revision": manifest_revision,
            "status": "failed",
            "matched": 0,
            "owned": 0,
            "errors": errors,
        }

    nodes = _normalize_chain_nodes(chain, schema, errors)
    _verify_no_prior_seal_growth(nodes, errors)
    _verify_manifest_chain_digests(root_path, nodes, errors)
    _verify_chain_copies(root_path, nodes, errors)

    chain_state = _build_effective_state(nodes, errors)
    tip_owned = set(nodes[0]["owned"]) if nodes else set()

    for path in sorted(tip_owned - set(chain_state)):
        errors["unmatched_paths"].append(f"owned-only:{path}")
    for path in sorted(set(chain_state) - tip_owned):
        errors["unmatched_paths"].append(f"files-only:{path}")

    for path, (expected_hash, expected_bytes) in chain_state.items():
        try:
            source = _assert_safe_chain(root_path, path, allow_directory=False)
            size = source.stat().st_size
            digest = lib.sha256_file(source)
        except lib.BenchmarkError as exc:
            errors["unsafe_paths"].append(f"{path}: {exc}")
            errors["missing_sources"].append(path)
            errors["stale"].append(path)
            continue
        if size != expected_bytes or digest != expected_hash:
            errors["changed_sources"].append(path)
            errors["stale"].append(path)

    if ownership_roots:
        try:
            discovered = set(_expand_owned_paths(root_path, ownership_roots))
        except lib.BenchmarkError as exc:
            errors["unsafe_paths"].append(f"ownership_roots: {exc}")
            discovered = set()
        errors["extra_owned"].extend(sorted(discovered - tip_owned))
        errors["unmatched_paths"].extend(
            f"outside-ownership-roots:{path}" for path in sorted(tip_owned - discovered)
        )

    for category in errors:
        errors[category] = sorted(set(errors[category]))

    failed = any(errors[category] for category in errors)
    matched = len(set(chain_state)) - len(set(errors["changed_sources"]) | set(errors["missing_sources"]))

    return {
        "schema_version": manifest.get("schema_version"),
        "seal": seal_relative,
        "revision": manifest_revision,
        "status": "failed" if failed else "passed",
        "matched": matched,
        "owned": len(tip_owned),
        "errors": errors,
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create", help="create a new copied seal")
    create.add_argument("--root", required=True)
    create.add_argument("--seal", required=True, help="safe path below root")
    create.add_argument("--benchmark-id", required=True)
    create.add_argument("--seal-type", choices=sorted(_TYPE_TO_PREFIX), required=True)
    create.add_argument("--revision", required=True)
    create.add_argument("--previous-revision")
    create.add_argument("--created-at", required=True, help="RFC 3339 date-time")
    create.add_argument("--owned-path", action="append", required=True)

    verify = subparsers.add_parser("verify", help="verify without mutation")
    verify.add_argument("--root", required=True)
    verify.add_argument("--seal", required=True, help="safe path below root")
    verify.add_argument(
        "--ownership-root",
        action="append",
        default=[],
        help="optional source directory/file closure to compare with owned_paths",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "create":
            receipt = create_seal(
                root=args.root,
                seal=args.seal,
                benchmark_id=args.benchmark_id,
                seal_type=args.seal_type,
                revision=args.revision,
                previous_revision=args.previous_revision,
                created_at=args.created_at,
                owned_paths=args.owned_path,
            )
        else:
            receipt = verify_seal(
                root=args.root,
                seal=args.seal,
                ownership_roots=args.ownership_root,
            )
        sys.stdout.buffer.write(lib.canonical_json_bytes(receipt))
        return lib.EXIT_OK if receipt["status"] == "passed" else lib.EXIT_INVALID
    except (lib.BenchmarkError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return lib.EXIT_INVALID


if __name__ == "__main__":
    raise SystemExit(main())
