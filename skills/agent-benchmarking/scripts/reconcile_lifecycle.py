#!/usr/bin/env python3
"""Fail-closed structural or strict benchmark lifecycle reconciliation."""

from __future__ import annotations

import argparse
from collections import defaultdict
import datetime
from decimal import Decimal
import hashlib
from pathlib import Path
import re
import sys
from typing import Any, Iterable

import aggregate_telemetry
import benchmark_lib as lib

SCHEDULE_FIELDS = (
    "schema_version", "benchmark_id", "schedule_revision", "attempt_id", "task_id",
    "condition_id", "repetition", "wave", "worker_slot", "retry_of",
)
ASSIGNMENT_FIELDS = (*SCHEDULE_FIELDS, "block", "order_position")
TERMINAL_IDENTITY_FIELDS = (
    "status", "startup_state", "assigned_at", "started_at", "terminal_at",
    "requested_runtime", "resolved_runner", "requested_model", "resolved_model",
    "observed_model", "fabric_result", "log_path", "session_path", "process_evidence_path",
    "artifact_paths",
)
EVENT_ALIASES = {
    "assignment": "assigned", "attempt-assigned": "assigned",
    "start": "started", "attempt-started": "started",
    "attempt-terminal": "terminal", "completed": "terminal",
    "child_dispatch": "child-dispatched", "child-dispatch": "child-dispatched",
    "child_acknowledged": "child-acknowledged", "child-acknowledgement": "child-acknowledged",
    "child_start": "child-started", "child_started": "child-started",
    "child_runtime_terminal": "child-runtime-terminal",
    "child_result": "child-result", "child-result-delivered": "child-result",
    "child_consumed": "child-consumed", "child-result-consumed": "child-consumed",
    "child_cleanup": "child-cleanup", "child_cleaned": "child-cleanup",
    "child_settled": "child-settled", "child-settlement": "child-settled",
}
CHILD_TYPES = {
    "child-dispatched", "child-acknowledged", "child-started", "child-runtime-terminal",
    "child-result", "child-consumed", "child-cleanup", "child-settled",
}
CONTRACT_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")


def _load_records(path: Path, *, missing_ok: bool = False) -> list[Any]:
    if not path.exists():
        if missing_ok:
            return []
        raise lib.InputError(f"{path}: required input does not exist")
    if path.suffix.lower() == ".jsonl":
        return lib.load_jsonl(path)
    value = lib.load_json(path)
    if isinstance(value, list):
        return value
    for key in ("records", "rows", "results", "attempts"):
        if isinstance(value, dict) and isinstance(value.get(key), list):
            return value[key]
    return [value]


def _path(root: Path, value: Path | None, default: str) -> Path:
    candidate = value if value is not None else Path(default)
    return candidate if candidate.is_absolute() else root / candidate


def _event_type(row: dict[str, Any]) -> str | None:
    value = row.get("event_type", row.get("type", row.get("kind")))
    if not isinstance(value, str):
        return None
    value = value.lower().replace("_", "-")
    return EVENT_ALIASES.get(value, value)


def _child_id(row: dict[str, Any]) -> str | None:
    for key in ("child_agent_id", "child_id", "agent_id"):
        value = row.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def _artifact_values(row: dict[str, Any]) -> list[tuple[str, str | None, int | None]]:
    raw: Any = row.get("artifact_paths")
    if raw is None:
        raw = row.get("artifacts")
    if raw is None and "settlement_artifact_path" in row:
        raw = [row["settlement_artifact_path"]]
    if not isinstance(raw, list):
        return []
    result: list[tuple[str, str | None, int | None]] = []
    for value in raw:
        if isinstance(value, str):
            result.append((value, None, None))
        elif isinstance(value, dict) and isinstance(value.get("path"), str):
            digest = value.get("sha256") if isinstance(value.get("sha256"), str) else None
            length = value.get("bytes") if isinstance(value.get("bytes"), int) else None
            result.append((value["path"], digest, length))
    return result


def _compare_schedule(
    row: dict[str, Any], scheduled: dict[str, Any], source: str, issues: list[str],
    fields: tuple[str, ...] = SCHEDULE_FIELDS,
) -> None:
    for field in fields:
        if field not in row:
            issues.append(f"{source}: missing schedule field {field!r}")
        elif row[field] != scheduled[field]:
            issues.append(f"{source}.{field}: {row[field]!r} != scheduled {scheduled[field]!r}")


def _grade_decision(grade: dict[str, Any]) -> tuple[Any, ...]:
    """Project a grade to its adjudication-relevant decision, excluding rationale."""
    criteria = grade.get("criterion_results")
    criterion_decisions: list[tuple[Any, ...]] = []
    if isinstance(criteria, list):
        for row in criteria:
            if isinstance(row, dict):
                criterion_decisions.append(
                    (row.get("criterion_id"), row.get("status"), row.get("score"))
                )
    return (
        grade.get("status"),
        grade.get("score"),
        tuple(sorted(criterion_decisions, key=lambda row: str(row[0]))),
    )


def _grader_run_base(blind_id: str, grader_id: str, revision: str) -> str:
    return f"grader-runs/{blind_id}/{grader_id}-{revision}"


def _time(value: Any) -> datetime.datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo is not None else None
    except ValueError:
        return None


def _check_times(row: dict[str, Any], source: str, issues: list[str]) -> None:
    assigned = _time(row.get("assigned_at"))
    started = _time(row.get("started_at"))
    terminal = _time(row.get("terminal_at"))
    if assigned is not None and started is not None and started < assigned:
        issues.append(f"{source}: started_at precedes assigned_at")
    lower = started if started is not None else assigned
    if lower is not None and terminal is not None and terminal < lower:
        issues.append(f"{source}: terminal_at precedes lifecycle predecessor")


def _index(
    values: list[Any], key: str, source: str, issues: list[str], schema: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for position, value in enumerate(values):
        label = f"{source}[{position}]"
        if schema is not None:
            issues.extend(f"{label}: {issue}" for issue in lib.validate_json_schema(value, schema))
        if not isinstance(value, dict):
            issues.append(f"{label}: expected object")
            continue
        identity = value.get(key)
        if not isinstance(identity, str) or not identity:
            issues.append(f"{label}: missing non-empty {key}")
        elif identity in result:
            issues.append(f"{label}: duplicate {key} {identity!r}")
        else:
            result[identity] = value
    return result


def _criterion_contract(
    grader: dict[str, Any], source: str, issues: list[str]
) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    total = Decimal(0)
    criteria = grader.get("criteria")
    if not isinstance(criteria, list) or not criteria:
        issues.append(f"{source}: criteria must be non-empty")
        return result
    for position, criterion in enumerate(criteria):
        criterion_source = f"{source}.criteria[{position}]"
        if not isinstance(criterion, dict):
            continue
        criterion_id = criterion.get("criterion_id")
        if not isinstance(criterion_id, str) or not criterion_id:
            continue
        if criterion_id in result:
            issues.append(f"{criterion_source}: duplicate criterion_id {criterion_id!r}")
        else:
            result[criterion_id] = criterion
        weight = criterion.get("weight")
        if isinstance(weight, (int, float)) and not isinstance(weight, bool):
            total += Decimal(str(weight))
    if total <= 0:
        issues.append(f"{source}: criterion weights must have a positive total")
    return result


def _grade_digest(record: dict[str, Any]) -> str:
    return hashlib.sha256(lib.canonical_json_bytes(record)).hexdigest()


def _validate_grade_semantics(
    grade: dict[str, Any], grader: dict[str, Any], source: str, issues: list[str]
) -> None:
    criteria: dict[str, dict[str, Any]] = {}
    grader_criteria = grader.get("criteria")
    if isinstance(grader_criteria, list):
        for criterion in grader_criteria:
            if isinstance(criterion, dict) and isinstance(criterion.get("criterion_id"), str):
                criteria.setdefault(criterion["criterion_id"], criterion)
    rows = grade.get("criterion_results")
    if not isinstance(rows, list):
        return
    results: dict[str, dict[str, Any]] = {}
    for position, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        criterion_id = row.get("criterion_id")
        if not isinstance(criterion_id, str) or not criterion_id:
            continue
        if criterion_id in results:
            issues.append(f"{source}.criterion_results[{position}]: duplicate criterion_id {criterion_id!r}")
        else:
            results[criterion_id] = row
        status = row.get("status")
        score = row.get("score")
        if status == "passed" and score != 1:
            issues.append(f"{source}.criterion_results[{position}]: passed criterion must score exactly 1")
        elif status == "failed" and (
            not isinstance(score, (int, float)) or isinstance(score, bool) or not 0 <= score < 1
        ):
            issues.append(f"{source}.criterion_results[{position}]: failed criterion must have score in [0, 1)")
        elif status in {"abstained", "error"} and score is not None:
            issues.append(f"{source}.criterion_results[{position}]: {status} criterion must have null score")
    expected_ids = set(criteria)
    actual_ids = set(results)
    missing = sorted(expected_ids - actual_ids)
    extra = sorted(actual_ids - expected_ids)
    if missing:
        issues.append(f"{source}: criterion_results omit frozen criteria: {', '.join(missing)}")
    if extra:
        issues.append(f"{source}: criterion_results contain unknown criteria: {', '.join(extra)}")
    if missing or extra or len(results) != len(rows) or not criteria:
        return

    statuses = [results[criterion_id].get("status") for criterion_id in criteria]
    overall_status = grade.get("status")
    overall_score = grade.get("score")
    if overall_status == "passed":
        if any(status != "passed" for status in statuses):
            issues.append(f"{source}: passed result requires every criterion to pass")
        if overall_score != 1:
            issues.append(f"{source}: passed result must score exactly 1")
    elif overall_status == "failed":
        if any(status not in {"passed", "failed"} for status in statuses) or "failed" not in statuses:
            issues.append(f"{source}: failed result requires at least one failed criterion and no abstention/error")
        else:
            numeric_weights = all(
                isinstance(criteria[item].get("weight"), (int, float))
                and not isinstance(criteria[item].get("weight"), bool)
                for item in criteria
            )
            total_weight = (
                sum((Decimal(str(criteria[item]["weight"])) for item in criteria), Decimal(0))
                if numeric_weights else Decimal(0)
            )
            numeric_scores = all(
                isinstance(results[item].get("score"), (int, float))
                and not isinstance(results[item].get("score"), bool)
                for item in criteria
            )
            if total_weight > 0 and numeric_scores:
                weighted = sum(
                    (Decimal(str(criteria[item]["weight"])) * Decimal(str(results[item]["score"])) for item in criteria),
                    Decimal(0),
                ) / total_weight
                if not isinstance(overall_score, (int, float)) or isinstance(overall_score, bool) or Decimal(str(overall_score)) != weighted:
                    issues.append(f"{source}: failed result score does not equal the frozen weighted criterion score")
    elif overall_status == "abstained":
        if any(status not in {"passed", "abstained"} for status in statuses) or "abstained" not in statuses:
            issues.append(f"{source}: abstained result requires at least one abstained criterion and no failure/error")
        if overall_score is not None:
            issues.append(f"{source}: abstained result must have null score")
    elif overall_status in {"grader-error", "invalid"}:
        if "error" not in statuses:
            issues.append(f"{source}: {overall_status} result requires at least one criterion error")
        if overall_score is not None:
            issues.append(f"{source}: {overall_status} result must have null score")

    model = grader.get("model")
    native = grade.get("provider_native")
    if isinstance(model, dict) and isinstance(native, dict):
        for frozen_field, native_field in (
            ("requested", "requested_model"),
            ("resolved", "resolved_model"),
            ("observed", "observed_model"),
        ):
            frozen = model.get(frozen_field)
            if frozen is not None and native.get(native_field) != frozen:
                issues.append(f"{source}.provider_native.{native_field}: disagrees with frozen grader identity")
        raw_result = native.get("raw_result")
        if isinstance(raw_result, dict) and raw_result.get("id") is not None and raw_result.get("id") != grade.get("grader_run_id"):
            issues.append(f"{source}.grader_run_id: disagrees with provider-native grader agent ID")


def _has_symlink(root: Path, relative: str) -> bool:
    cursor = root
    for part in relative.split("/"):
        cursor = cursor / part
        if cursor.is_symlink():
            return True
    return False


def _claim_artifacts(
    root: Path,
    owner: str,
    values: list[tuple[str, str | None, int | None]],
    owners: dict[str, str],
    source: str,
    issues: list[str],
    *,
    require: bool = True,
) -> None:
    if require and not values:
        issues.append(f"{source}: non-empty resolving artifact list is required")
        return
    seen: set[str] = set()
    for relative, digest, length in values:
        try:
            canonical = lib.safe_relative_path(relative, f"{source}.artifact")
            path = lib.safe_join(root, canonical)
        except lib.BenchmarkError as exc:
            issues.append(str(exc))
            continue
        if canonical in seen:
            issues.append(f"{source}: duplicate artifact path {canonical!r}")
        seen.add(canonical)
        previous = owners.setdefault(canonical, owner)
        if previous != owner:
            issues.append(f"{source}: artifact {canonical!r} is also owned by {previous}")
        if not path.is_file() or _has_symlink(root, canonical):
            issues.append(f"{source}: unresolved or symlinked regular artifact {canonical!r}")
            continue
        data = lib.read_bytes(path)
        if digest is not None and hashlib.sha256(data).hexdigest() != digest:
            issues.append(f"{source}: artifact {canonical!r} sha256 mismatch")
        if length is not None and len(data) != length:
            issues.append(f"{source}: artifact {canonical!r} byte count mismatch")


def _verify_digest_binding(
    root: Path, binding: Any, source: str, issues: list[str]
) -> None:
    if binding is None or not isinstance(binding, dict):
        return
    relative = binding.get("path")
    digest = binding.get("sha256")
    if not isinstance(relative, str) or not isinstance(digest, str):
        return
    try:
        path = lib.safe_join(root, lib.safe_relative_path(relative, f"{source}.path"))
    except lib.BenchmarkError as exc:
        issues.append(str(exc))
        return
    if not path.is_file() or _has_symlink(root, relative):
        issues.append(f"{source}: digest-bound path is unresolved or symlinked")
    elif lib.sha256_file(path) != digest:
        issues.append(f"{source}: sha256 mismatch")


def _nested_ids(value: Any) -> set[str]:
    result: set[str] = set()
    if isinstance(value, dict):
        for key in ("nested_agents", "nestedAgents", "children"):
            children = value.get(key)
            if isinstance(children, list):
                for child in children:
                    if isinstance(child, dict):
                        identity = child.get("agent_id", child.get("id"))
                        if isinstance(identity, str) and identity:
                            result.add(identity)
                        result.update(_nested_ids(child))
        for child in value.values():
            if isinstance(child, (dict, list)):
                result.update(_nested_ids(child))
    elif isinstance(value, list):
        for child in value:
            result.update(_nested_ids(child))
    return result


def _verify_seal_receipt(
    root: Path, receipt_path: Path, seal_schema: dict[str, Any], issues: list[str]
) -> str | None:
    receipt = lib.load_json(receipt_path)
    if not isinstance(receipt, dict):
        issues.append(f"{receipt_path}: seal receipt must be an object")
        return None
    for key in ("ok", "valid", "verified"):
        if key in receipt and receipt[key] is not True:
            issues.append(f"{receipt_path}: seal receipt does not report success")
    if "status" in receipt and receipt["status"] != "passed":
        issues.append(f"{receipt_path}: seal receipt does not report passed status")
    manifest_value = None
    seal_directory: Path | None = None
    for key in ("manifest_path", "seal_manifest", "manifest"):
        if isinstance(receipt.get(key), str):
            manifest_value = receipt[key]
            break
    if manifest_value is None and isinstance(receipt.get("seal"), str):
        manifest_value = f"{receipt['seal']}/manifest.json"
        try:
            seal_directory = lib.safe_join(root, lib.safe_relative_path(receipt["seal"], "seal"))
        except lib.BenchmarkError as exc:
            issues.append(str(exc))
            return None
    if manifest_value is None:
        issues.append(f"{receipt_path}: seal receipt has no manifest path or seal directory")
        return None
    try:
        manifest_path = lib.safe_join(root, lib.safe_relative_path(manifest_value, "manifest_path"))
    except lib.BenchmarkError as exc:
        issues.append(str(exc))
        return None
    if not manifest_path.is_file() or manifest_path.is_symlink():
        issues.append(f"{receipt_path}: seal manifest is unresolved")
        return None
    manifest_bytes = lib.read_bytes(manifest_path)
    expected_digest = receipt.get("manifest_sha256", receipt.get("manifest_digest"))
    if expected_digest is not None and (
        not isinstance(expected_digest, str)
        or hashlib.sha256(manifest_bytes).hexdigest() != expected_digest
    ):
        issues.append(f"{receipt_path}: stale seal receipt manifest digest")
    manifest = lib.parse_json_bytes(manifest_bytes, manifest_path.as_posix())
    manifest_issues = lib.validate_json_schema(manifest, seal_schema)
    issues.extend(f"{manifest_path}: {issue}" for issue in manifest_issues)
    if manifest_issues or not isinstance(manifest, dict):
        return None
    if receipt.get("revision") is not None and receipt.get("revision") != manifest.get("revision"):
        issues.append(f"{receipt_path}: stale seal receipt revision")
    if receipt.get("owned") is not None and receipt.get("owned") != len(set(manifest.get("owned_paths", []))):
        issues.append(f"{receipt_path}: stale seal receipt owned count")
    for position, entry in enumerate(manifest.get("files", [])):
        source = f"{manifest_path}.files[{position}]"
        try:
            relative = lib.safe_relative_path(entry["path"], f"{source}.path")
            artifact = lib.safe_join(root, relative)
            sealed_copy = seal_directory / relative if seal_directory is not None else None
        except (KeyError, TypeError, lib.BenchmarkError) as exc:
            issues.append(f"{source}: invalid path: {exc}")
            continue
        expected_hash = entry.get("sha256")
        expected_bytes = entry.get("bytes")
        for label, candidate in (("source", artifact), ("sealed copy", sealed_copy)):
            if candidate is None:
                continue
            relative_to_root = candidate.relative_to(root).as_posix()
            if not candidate.is_file() or _has_symlink(root, relative_to_root):
                issues.append(f"{source}: {label} is missing, symlinked, or not regular")
                continue
            data = lib.read_bytes(candidate)
            if hashlib.sha256(data).hexdigest() != expected_hash or len(data) != expected_bytes:
                issues.append(f"{source}: stale seal receipt, {label} bytes changed")
    return manifest.get("seal_type") if isinstance(manifest.get("seal_type"), str) else None


def reconcile(args: argparse.Namespace) -> dict[str, Any]:
    root = args.root.resolve()
    issues: list[str] = []
    incomplete: list[str] = []
    owners: dict[str, str] = {}

    schedule_schema = lib.load_json(args.schedule_schema)
    attempt_schema = lib.load_json(args.attempt_schema)
    result_schema = lib.load_json(args.result_schema)
    grader_schema = lib.load_json(args.grader_schema)
    task_schema = lib.load_json(args.task_schema)
    telemetry_schema = lib.load_json(args.telemetry_schema)
    seal_schema = lib.load_json(args.seal_schema)
    adjudication_plan_schema = lib.load_json(args.adjudication_plan_schema) if args.adjudication_plan is not None else None
    adjudication_assignment_schema = lib.load_json(args.adjudication_assignment_schema)
    adjudication_terminal_schema = lib.load_json(args.adjudication_terminal_schema)

    schedule_path = _path(root, args.schedule, "schedule.jsonl")
    schedule_values = _load_records(schedule_path)
    schedule_issue_count = len(issues)
    schedule = _index(schedule_values, "attempt_id", schedule_path.as_posix(), issues, schedule_schema)
    if len(issues) != schedule_issue_count:
        raise lib.ContractError(tuple(sorted(set(issues))))

    benchmark_ids = {row.get("benchmark_id") for row in schedule.values()}
    revisions = {row.get("schedule_revision") for row in schedule.values()}
    if len(benchmark_ids) != 1:
        issues.append("schedule: rows must share exactly one benchmark_id")
    if len(revisions) != 1:
        issues.append("schedule: rows must share exactly one schedule_revision")
    for attempt_id, row in schedule.items():
        retry_of = row.get("retry_of")
        if retry_of is not None and retry_of not in schedule:
            issues.append(f"schedule[{attempt_id}].retry_of: unresolved predecessor {retry_of!r}")
        if retry_of == attempt_id:
            issues.append(f"schedule[{attempt_id}].retry_of: self-reference is forbidden")
        seen_retries: set[str] = set()
        cursor = attempt_id
        while cursor in schedule and schedule[cursor].get("retry_of") is not None:
            if cursor in seen_retries:
                issues.append(f"schedule[{attempt_id}].retry_of: retry cycle detected")
                break
            seen_retries.add(cursor)
            cursor = schedule[cursor]["retry_of"]

    events_path = _path(root, args.events, "events.jsonl")
    event_values = _load_records(events_path, missing_ok=True)
    events_by_type: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    child_events: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    previous_sequence: int | None = None
    for position, value in enumerate(event_values):
        source = f"{events_path}[{position}]"
        if not isinstance(value, dict):
            issues.append(f"{source}: expected object")
            continue
        sequence = value.get("sequence")
        if not isinstance(sequence, int) or isinstance(sequence, bool):
            issues.append(f"{source}: sequence must be an integer")
        elif previous_sequence is not None and sequence <= previous_sequence:
            issues.append(f"{source}: nonmonotonic sequence {sequence} after {previous_sequence}")
        if isinstance(sequence, int) and not isinstance(sequence, bool):
            previous_sequence = sequence
        kind = _event_type(value)
        if kind is None:
            issues.append(f"{source}: missing event_type")
            continue
        attempt_id = value.get("attempt_id")
        if not isinstance(attempt_id, str) or attempt_id not in schedule:
            issues.append(f"{source}: event has unresolved attempt_id {attempt_id!r}")
            continue
        if kind in CHILD_TYPES:
            child_id = _child_id(value)
            if child_id is None:
                issues.append(f"{source}: child event lacks child identity")
            elif kind in child_events[child_id]:
                issues.append(f"{source}: duplicate {kind} for child {child_id!r}")
            else:
                child_events[child_id][kind] = value
            continue
        if kind not in {"assigned", "started", "terminal"}:
            issues.append(f"{source}: unsupported event_type {kind!r}")
            continue
        if attempt_id in events_by_type[kind]:
            issues.append(f"{source}: duplicate {kind} event for attempt {attempt_id!r}")
        else:
            events_by_type[kind][attempt_id] = value
        _compare_schedule(
            value, schedule[attempt_id], source, issues,
            ASSIGNMENT_FIELDS if kind == "assigned" else SCHEDULE_FIELDS,
        )

    assignments = events_by_type["assigned"]
    starts = events_by_type["started"]
    terminal_events = events_by_type["terminal"]
    for attempt_id, assignment in assignments.items():
        if _time(assignment.get("assigned_at")) is None:
            issues.append(f"events[{attempt_id}]: assignment lacks valid assigned_at")
        predecessor_id = schedule[attempt_id].get("retry_of")
        if predecessor_id is not None:
            predecessor_terminal = terminal_events.get(predecessor_id)
            if predecessor_terminal is None:
                issues.append(f"events[{attempt_id}]: retry assigned before predecessor terminal exists")
            else:
                assigned_sequence = assignment.get("sequence")
                terminal_sequence = predecessor_terminal.get("sequence")
                if isinstance(assigned_sequence, int) and isinstance(terminal_sequence, int) and assigned_sequence <= terminal_sequence:
                    issues.append(f"events[{attempt_id}]: retry assignment sequence does not follow predecessor terminal")
    for attempt_id, start in starts.items():
        if attempt_id not in assignments:
            issues.append(f"events: illegal prelaunch start for unassigned attempt {attempt_id!r}")
        else:
            if _time(start.get("started_at", start.get("runtime_started_at"))) is None:
                issues.append(f"events[{attempt_id}]: started event lacks valid runtime start time")
            start_sequence = start.get("sequence")
            assigned_sequence = assignments[attempt_id].get("sequence")
            if isinstance(start_sequence, int) and isinstance(assigned_sequence, int) and start_sequence <= assigned_sequence:
                issues.append(f"events[{attempt_id}]: started sequence does not follow assignment")
    for attempt_id, event in terminal_events.items():
        if attempt_id not in assignments:
            issues.append(f"events: terminal without assignment for {attempt_id!r}")
        startup = event.get("startup_state")
        status = event.get("status")
        has_start = attempt_id in starts
        if startup == "started" and not has_start:
            issues.append(f"events[{attempt_id}]: startup_state started without started event")
        if startup == "not-started" and has_start:
            issues.append(f"events[{attempt_id}]: illegal prelaunch start for not-started terminal")
        if status == "prelaunch-failed":
            if has_start:
                issues.append(f"events[{attempt_id}]: prelaunch-failed attempt has a started event")
            if startup != "not-started" or event.get("started_at") is not None:
                issues.append(f"events[{attempt_id}]: prelaunch-failed terminal must have no start")
            fabric_event = event.get("fabric_result")
            if isinstance(fabric_event, dict) and (
                fabric_event.get("agent_id") is not None or fabric_event.get("started_at") is not None
            ):
                issues.append(f"events[{attempt_id}]: prelaunch-failed terminal must have no Fabric agent ID/start")
        else:
            if not has_start or startup != "started" or _time(event.get("started_at")) is None:
                issues.append(f"events[{attempt_id}]: launched terminal status {status!r} requires a backed started event")
            elif _time(starts[attempt_id].get("started_at", starts[attempt_id].get("runtime_started_at"))) != _time(event.get("started_at")):
                issues.append(f"events[{attempt_id}]: started event time disagrees with terminal started_at")
        predecessor = starts.get(attempt_id, assignments.get(attempt_id, {})).get("sequence")
        terminal_sequence = event.get("sequence")
        if isinstance(terminal_sequence, int) and isinstance(predecessor, int) and terminal_sequence <= predecessor:
            issues.append(f"events[{attempt_id}]: terminal sequence does not follow lifecycle predecessor")
        _check_times(event, f"terminal event {attempt_id}", issues)
        _claim_artifacts(root, f"attempt:{attempt_id}", _artifact_values(event), owners, f"terminal event {attempt_id}", issues)

    attempts_dir = _path(root, args.attempts_dir, "attempts")
    terminal_paths = sorted(attempts_dir.glob("*/terminal.json"), key=lambda item: item.as_posix()) if attempts_dir.is_dir() else []
    terminal_values = [lib.load_json(path) for path in terminal_paths]
    terminal_issue_count = len(issues)
    terminals = _index(terminal_values, "attempt_id", attempts_dir.as_posix(), issues, attempt_schema)
    for terminal_path, terminal in zip(terminal_paths, terminal_values):
        if isinstance(terminal, dict) and terminal.get("attempt_id") != terminal_path.parent.name:
            issues.append(f"{terminal_path}: attempt_id does not equal its directory name")
    if len(issues) != terminal_issue_count:
        raise lib.ContractError(tuple(sorted(set(issues[terminal_issue_count:]))))
    fabric_agent_owners: dict[str, str] = {}
    fabric_session_owners: dict[str, str] = {}
    for attempt_id, terminal in terminals.items():
        if attempt_id not in schedule:
            issues.append(f"attempt terminal {attempt_id!r}: not in schedule")
            continue
        _compare_schedule(terminal, schedule[attempt_id], f"attempt terminal {attempt_id}", issues)
        event = terminal_events.get(attempt_id)
        if event is None:
            issues.append(f"attempt terminal {attempt_id!r}: missing terminal event")
        else:
            for field in TERMINAL_IDENTITY_FIELDS:
                if event.get(field) != terminal.get(field):
                    issues.append(f"attempt terminal {attempt_id}.{field}: disagrees with terminal event")
        has_start = attempt_id in starts
        if (terminal.get("startup_state") == "started") != has_start:
            issues.append(f"attempt terminal {attempt_id}: startup_state disagrees with started event")
        if terminal.get("startup_state") == "started" and terminal.get("started_at") is None:
            issues.append(f"attempt terminal {attempt_id}: started startup_state lacks started_at")
        if terminal.get("startup_state") == "not-started" and terminal.get("started_at") is not None:
            issues.append(f"attempt terminal {attempt_id}: not-started startup_state has started_at")
        _check_times(terminal, f"attempt terminal {attempt_id}", issues)
        fabric_result = terminal.get("fabric_result", {})
        if terminal.get("status") == "prelaunch-failed":
            if has_start or terminal.get("startup_state") != "not-started" or terminal.get("started_at") is not None:
                issues.append(f"attempt terminal {attempt_id}: prelaunch failure must have no start")
            if fabric_result.get("agent_id") is not None or fabric_result.get("started_at") is not None:
                issues.append(f"attempt terminal {attempt_id}: prelaunch failure must have no Fabric agent ID/start")
            if not (fabric_result.get("error") or fabric_result.get("provider_native")):
                issues.append(f"attempt terminal {attempt_id}: prelaunch failure lacks preserved exception evidence")
        else:
            start_time = _time(starts.get(attempt_id, {}).get("started_at", starts.get(attempt_id, {}).get("runtime_started_at")))
            terminal_start = _time(terminal.get("started_at"))
            fabric_start = _time(fabric_result.get("started_at"))
            if not has_start or terminal.get("startup_state") != "started" or terminal_start is None:
                issues.append(f"attempt terminal {attempt_id}: launched status requires a backed started event")
            if not isinstance(fabric_result.get("agent_id"), str) or not fabric_result["agent_id"]:
                issues.append(f"attempt terminal {attempt_id}: launched attempt lacks Fabric agent_id")
            elif starts.get(attempt_id, {}).get("agent_id") != fabric_result["agent_id"]:
                issues.append(f"attempt terminal {attempt_id}: started event agent_id disagrees with Fabric agent_id")
            if fabric_start is None:
                issues.append(f"attempt terminal {attempt_id}: launched attempt lacks Fabric started_at evidence")
            if start_time is not None and terminal_start is not None and start_time != terminal_start:
                issues.append(f"attempt terminal {attempt_id}: started event time disagrees with terminal started_at")
            if fabric_start is not None and terminal_start is not None and fabric_start != terminal_start:
                issues.append(f"attempt terminal {attempt_id}: Fabric started_at disagrees with terminal started_at")
        agent_id = fabric_result.get("agent_id")
        if isinstance(agent_id, str):
            prior = fabric_agent_owners.setdefault(agent_id, attempt_id)
            if prior != attempt_id:
                issues.append(f"attempt terminal {attempt_id}: Fabric agent_id is also owned by {prior}")
        session_id = fabric_result.get("session_id")
        if isinstance(session_id, str):
            prior = fabric_session_owners.setdefault(session_id, attempt_id)
            if prior != attempt_id:
                issues.append(f"attempt terminal {attempt_id}: Fabric session_id is also owned by {prior}")
        if terminal.get("resolved_model") is not None and fabric_result.get("model") is not None and terminal["resolved_model"] != fabric_result["model"]:
            issues.append(f"attempt terminal {attempt_id}: resolved_model disagrees with Fabric result model")
        owned_values = _artifact_values(terminal)
        owned_paths = {value[0] for value in owned_values}
        for path_field in ("log_path", "session_path", "process_evidence_path"):
            if terminal.get(path_field) is not None and terminal[path_field] not in owned_paths:
                owned_values.append((terminal[path_field], None, None))
                owned_paths.add(terminal[path_field])
        _claim_artifacts(root, f"attempt:{attempt_id}", owned_values, owners, f"attempt terminal {attempt_id}", issues)

    ledger_path = _path(root, args.ledger, "ledger.jsonl")
    ledger_values = _load_records(ledger_path, missing_ok=True)
    ledger = _index(ledger_values, "attempt_id", ledger_path.as_posix(), issues)
    for attempt_id, row in ledger.items():
        if attempt_id not in schedule:
            issues.append(f"ledger[{attempt_id}]: not in schedule")
            continue
        _compare_schedule(row, schedule[attempt_id], f"ledger[{attempt_id}]", issues)
        terminal = terminals.get(attempt_id)
        if terminal is None:
            issues.append(f"ledger[{attempt_id}]: terminal artifact is missing")
        else:
            for field in TERMINAL_IDENTITY_FIELDS:
                if row.get(field) != terminal.get(field):
                    issues.append(f"ledger[{attempt_id}].{field}: disagrees with terminal artifact")
        included = row.get("analysis_included", row.get("included"))
        if included is False and not any(isinstance(row.get(key), str) and row[key] for key in ("exclusion_reason", "invalidation_reason")):
            issues.append(f"ledger[{attempt_id}]: silent exclusion without reason")

    grades_path = _path(root, args.grades, "grades.jsonl")
    grade_values = _load_records(grades_path, missing_ok=True)
    expected_option: set[tuple[str, str]] = set()
    for spec in args.expected_grader:
        if "@" not in spec:
            issues.append(f"--expected-grader {spec!r}: expected GRADER_ID@REVISION")
            continue
        grader_id, revision = spec.rsplit("@", 1)
        identity = (grader_id, revision)
        if not grader_id or not revision:
            issues.append(f"--expected-grader {spec!r}: empty component")
        elif identity in expected_option:
            issues.append(f"--expected-grader: duplicate assertion {spec!r}")
        else:
            expected_option.add(identity)

    adjudication_plan_path = (
        _path(root, args.adjudication_plan, "adjudication-plan.json")
        if args.adjudication_plan is not None
        else None
    )
    adjudication_plan_rows: dict[tuple[str, str, str], dict[str, Any]] = {}
    adjudication_plan_sources: dict[tuple[str, str, str], str] = {}
    adjudication_bases: dict[str, tuple[str, str, str]] = {}
    adjudication_plan_data: dict[str, Any] | None = None
    if adjudication_plan_path is not None:
        adjudication_plan_data = lib.load_json(adjudication_plan_path)
        if adjudication_plan_schema is not None:
            issues.extend(
                f"{adjudication_plan_path}: {issue}" for issue in lib.validate_json_schema(adjudication_plan_data, adjudication_plan_schema)
            )
        if not isinstance(adjudication_plan_data, dict):
            issues.append(f"{adjudication_plan_path}: adjudication plan must be an object")
        else:
            if adjudication_plan_data.get("benchmark_id") not in benchmark_ids:
                issues.append(f"{adjudication_plan_path}: benchmark_id does not match schedule")
            jobs = adjudication_plan_data.get("jobs")
            if not isinstance(jobs, list):
                jobs = []
            for position, row in enumerate(jobs):
                source = f"{adjudication_plan_path}.jobs[{position}]"
                if not isinstance(row, dict):
                    issues.append(f"{source}: row must be an object")
                    continue
                attempt_id = row.get("attempt_id")
                adjudicator_id = row.get("adjudicator_id")
                adjudicator_revision = row.get("adjudicator_revision")
                if not isinstance(attempt_id, str):
                    issues.append(f"{source}: attempt_id must be a string")
                    continue
                if not isinstance(adjudicator_id, str):
                    issues.append(f"{source}: adjudicator_id must be a string")
                    continue
                if not isinstance(adjudicator_revision, str):
                    issues.append(f"{source}: adjudicator_revision must be a string")
                    continue
                identity = (attempt_id, adjudicator_id, adjudicator_revision)
                if identity in adjudication_plan_rows:
                    issues.append(f"{source}: duplicate adjudication plan row {identity!r}")
                    continue
                adjudication_plan_rows[identity] = row
                adjudication_plan_sources[identity] = source
                blind_id = row.get("blind_id")
                if isinstance(blind_id, str):
                    base = _grader_run_base(blind_id, adjudicator_id, adjudicator_revision)
                    previous = adjudication_bases.setdefault(base, identity)
                    if previous != identity:
                        issues.append(
                            f"{source}: adjudication artifact path collides with plan job {previous!r}"
                        )

    grade_attempt_ids = {
        value.get("attempt_id") for value in grade_values
        if isinstance(value, dict) and isinstance(value.get("attempt_id"), str)
    }
    require_judge_results = args.require_graders or (
        adjudication_plan_path is not None and args.strict_completion
    )
    planned_attempt_ids = {identity[0] for identity in adjudication_plan_rows}
    task_ids = {
        row["task_id"] for attempt_id, row in schedule.items()
        if require_judge_results or attempt_id in grade_attempt_ids or attempt_id in planned_attempt_ids
    }
    tasks_dir = _path(root, args.tasks_dir, "tasks")
    tasks: dict[str, dict[str, Any]] = {}
    for task_id in sorted(task_ids):
        task_path = tasks_dir / f"{task_id}.json"
        if not task_path.is_file() or task_path.is_symlink():
            issues.append(f"task {task_id!r}: frozen task contract is missing")
            continue
        task = lib.load_json(task_path)
        task_issues = lib.validate_json_schema(task, task_schema)
        issues.extend(f"{task_path}: {issue}" for issue in task_issues)
        if not isinstance(task, dict):
            continue
        if task.get("task_id") != task_id:
            issues.append(f"{task_path}: task_id does not match canonical path")
        if task.get("benchmark_id") not in benchmark_ids:
            issues.append(f"{task_path}: benchmark_id does not match schedule")
        tasks[task_id] = task

    adjudication_jobs_by_attempt: dict[str, set[tuple[str, str]]] = defaultdict(set)
    for identity in adjudication_plan_rows:
        adjudication_jobs_by_attempt[identity[0]].add((identity[1], identity[2]))

    required_grader_ids: set[str] = set()
    task_grader_ids: set[str] = set()
    for task in tasks.values():
        values = task.get("grader_ids")
        if isinstance(values, list):
            task_grader_ids.update(value for value in values if isinstance(value, str))
    required_grader_ids.update(task_grader_ids)
    required_grader_ids.update(
        value.get("grader_id") for value in grade_values
        if isinstance(value, dict) and isinstance(value.get("grader_id"), str)
    )
    required_grader_ids.update(identity[1] for identity in adjudication_plan_rows)
    required_grader_ids.update(identity[0] for identity in expected_option)
    graders_dir = _path(root, args.graders_dir, "graders")
    frozen_graders: dict[str, dict[str, Any]] = {}
    for grader_id in sorted(required_grader_ids):
        if CONTRACT_ID.fullmatch(grader_id) is None:
            issues.append(f"grader identity {grader_id!r}: unsafe or invalid contract ID")
            continue
        grader_path = graders_dir / f"{grader_id}.json"
        if not grader_path.is_file() or grader_path.is_symlink():
            issues.append(f"grader {grader_id!r}: frozen grader contract is missing")
            continue
        grader = lib.load_json(grader_path)
        grader_issues = lib.validate_json_schema(grader, grader_schema)
        issues.extend(f"{grader_path}: {issue}" for issue in grader_issues)
        if not isinstance(grader, dict):
            continue
        if grader.get("grader_id") != grader_id:
            issues.append(f"{grader_path}: grader_id does not match canonical path")
        if grader.get("benchmark_id") not in benchmark_ids:
            issues.append(f"{grader_path}: benchmark_id does not match schedule")
        _criterion_contract(grader, grader_path.as_posix(), issues)
        frozen_graders[grader_id] = grader

    frozen_task_identities = {
        (grader_id, str(frozen_graders[grader_id].get("revision")))
        for grader_id in task_grader_ids if grader_id in frozen_graders
    }
    if expected_option and expected_option != frozen_task_identities:
        missing_assertions = sorted(frozen_task_identities - expected_option)
        stale_assertions = sorted(expected_option - frozen_task_identities)
        if missing_assertions:
            issues.append("--expected-grader omits frozen identities: " + ", ".join(f"{item[0]}@{item[1]}" for item in missing_assertions))
        if stale_assertions:
            issues.append("--expected-grader names non-frozen identities: " + ", ".join(f"{item[0]}@{item[1]}" for item in stale_assertions))

    expected_judge_by_attempt: dict[str, set[tuple[str, str, str]]] = {}
    adjudication_expected_by_attempt: dict[str, set[tuple[str, str, str]]] = {}
    for attempt_id, scheduled in schedule.items():
        task = tasks.get(scheduled["task_id"])
        judge_expected: set[tuple[str, str, str]] = set()
        adjudication_expected: set[tuple[str, str, str]] = set()
        if task is not None and isinstance(task.get("grader_ids"), list):
            for grader_id in task["grader_ids"]:
                if not isinstance(grader_id, str):
                    continue
                grader = frozen_graders.get(grader_id)
                if grader is None:
                    continue
                judge_expected.add((grader_id, str(grader.get("revision")), "judge"))
        for adjudicator_id, adjudicator_revision in adjudication_jobs_by_attempt.get(attempt_id, set()):
            source = adjudication_plan_sources[(attempt_id, adjudicator_id, adjudicator_revision)]
            row = adjudication_plan_rows[(attempt_id, adjudicator_id, adjudicator_revision)]
            task_id = row.get("task_id")
            if task_id != scheduled["task_id"]:
                issues.append(f"{source}: task_id does not match scheduled task")
            grader = frozen_graders.get(adjudicator_id)
            if grader is None:
                continue
            frozen_revision = str(grader.get("revision"))
            if adjudicator_revision != frozen_revision:
                issues.append(f"{source}: adjudicator revision does not match frozen grader")
                continue
            adjudication_expected.add((adjudicator_id, frozen_revision, "adjudicate"))
        expected_judge_by_attempt[attempt_id] = judge_expected
        adjudication_expected_by_attempt[attempt_id] = adjudication_expected

    if adjudication_plan_path is not None:
        for identity in adjudication_plan_rows:
            if identity[0] not in schedule:
                source = adjudication_plan_sources[identity]
                issues.append(f"{source}: attempt not in schedule")

    grade_keys: set[tuple[str, str, str, str]] = set()
    grader_runs: set[str] = set()
    blind_owners: dict[str, str] = {}
    judge_blind_by_attempt: dict[str, set[str]] = defaultdict(set)
    judge_results: dict[tuple[str, str, str], dict[str, Any]] = {}
    grade_matrix: dict[str, set[tuple[str, str, str]]] = defaultdict(set)
    adjudication_results: dict[tuple[str, str, str], dict[str, Any]] = {}
    known_judge_bases: set[str] = set()
    for position, grade in enumerate(grade_values):
        source = f"{grades_path}[{position}]"
        grade_schema_issues = lib.validate_json_schema(grade, result_schema)
        issues.extend(f"{source}: {issue}" for issue in grade_schema_issues)
        if not isinstance(grade, dict):
            continue
        attempt_id = grade.get("attempt_id")
        stage = grade.get("stage")
        grader_id = grade.get("grader_id")
        grader_revision = grade.get("grader_revision")
        blind_id = grade.get("blind_id")
        identity = (
            str(attempt_id),
            str(grader_id),
            str(grader_revision),
            str(stage),
        )
        if identity in grade_keys:
            issues.append(f"{source}: duplicate grade identity {identity!r}")
        grade_keys.add(identity)
        run_id = grade.get("grader_run_id")
        if isinstance(run_id, str):
            if run_id in grader_runs:
                issues.append(f"{source}: duplicate grader_run_id {run_id!r}")
            grader_runs.add(run_id)
        if isinstance(blind_id, str) and isinstance(attempt_id, str):
            prior_attempt = blind_owners.setdefault(blind_id, attempt_id)
            if prior_attempt != attempt_id:
                issues.append(f"{source}: blind_id {blind_id!r} is also owned by attempt {prior_attempt!r}")
        if attempt_id not in terminals:
            issues.append(f"{source}: grade has unresolved terminal attempt {attempt_id!r}")
        else:
            terminal = terminals[attempt_id]
            if grade.get("benchmark_id") != terminal.get("benchmark_id"):
                issues.append(f"{source}: benchmark_id disagrees with attempt")
            if isinstance(attempt_id, str):
                grade_identity = (str(grader_id), str(grader_revision), str(stage))
                grade_matrix[attempt_id].add(grade_identity)
                if stage == "judge":
                    if grade_identity not in expected_judge_by_attempt.get(attempt_id, set()):
                        issues.append(f"{source}: judge identity {str(grader_id)}@{str(grader_revision)} is not configured for attempt task")
                    if isinstance(blind_id, str):
                        judge_blind_by_attempt[attempt_id].add(blind_id)
                        judge_key = (attempt_id, str(grader_id), str(grader_revision))
                        judge_results.setdefault(judge_key, grade)
                        known_judge_bases.add(
                            _grader_run_base(blind_id, str(grader_id), str(grader_revision))
                        )
                elif stage == "adjudicate":
                    adjudication_results.setdefault(
                        (attempt_id, str(grader_id), str(grader_revision)), grade
                    )
                    if grade_identity not in adjudication_expected_by_attempt.get(attempt_id, set()):
                        issues.append(f"{source}: adjudication identity {str(grader_id)}@{str(grader_revision)} is not planned for attempt")
                else:
                    issues.append(f"{source}: stage must be judge or adjudicate")
        grader = frozen_graders.get(grader_id) if isinstance(grader_id, str) else None
        if grader is None:
            issues.append(f"{source}: result has no matching frozen grader contract")
        else:
            if str(grader.get("revision")) != str(grader_revision):
                issues.append(f"{source}: grader_revision does not match frozen grader")
            if grade.get("benchmark_id") != grader.get("benchmark_id"):
                issues.append(f"{source}: benchmark_id disagrees with frozen grader")
            elif stage in {"judge", "adjudicate"}:
                _validate_grade_semantics(grade, grader, source, issues)
        for relative, digest, length in _artifact_values({"artifact_paths": grade.get("evidence_paths", [])}):
            try:
                artifact = lib.safe_join(root, lib.safe_relative_path(relative, f"{source}.evidence_path"))
                if not artifact.is_file() or _has_symlink(root, relative):
                    issues.append(f"{source}: unresolved or symlinked evidence path {relative!r}")
                elif digest is not None and lib.sha256_file(artifact) != digest:
                    issues.append(f"{source}: evidence digest mismatch for {relative!r}")
                elif length is not None and artifact.stat().st_size != length:
                    issues.append(f"{source}: evidence byte count mismatch for {relative!r}")
            except lib.BenchmarkError as exc:
                issues.append(str(exc))
        if args.require_graders and stage == "judge" and isinstance(blind_id, str) and isinstance(grader_id, str) and isinstance(grader_revision, str):
            base = f"grader-runs/{blind_id}/{grader_id}-{grader_revision}"
            assignment_relative = f"{base}/assignment.json"
            assignment_path = lib.safe_join(root, assignment_relative)
            if not assignment_path.is_file() or _has_symlink(root, assignment_relative):
                issues.append(f"{source}: immutable grader assignment is missing")
            else:
                assignment = lib.load_json(assignment_path)
                if not isinstance(assignment, dict):
                    issues.append(f"{source}: grader assignment must be an object")
                else:
                    for field in ("benchmark_id", "blind_id", "grader_id", "grader_revision", "stage"):
                        if assignment.get(field) != grade.get(field):
                            issues.append(f"{source}: grader assignment {field} disagrees with grade")
                    expected_request = f"{base}/result.raw.json"
                    if assignment.get("request_path") != expected_request:
                        issues.append(f"{source}: grader assignment request_path is not canonical")
                    _claim_artifacts(
                        root,
                        f"grader:{blind_id}:{grader_id}:{grader_revision}:assignment",
                        [(assignment.get("request_path"), None, None)] if isinstance(assignment.get("request_path"), str) else [],
                        owners,
                        f"grader assignment {blind_id}:{grader_id}",
                        issues,
                    )
            terminal_relative = f"{base}/terminal.json"
            terminal_path = lib.safe_join(root, terminal_relative)
            if not terminal_path.is_file() or _has_symlink(root, terminal_relative):
                issues.append(f"{source}: immutable grader terminal is missing")
            else:
                grader_terminal = lib.load_json(terminal_path)
                if not isinstance(grader_terminal, dict):
                    issues.append(f"{source}: grader terminal must be an object")
                else:
                    for field in ("benchmark_id", "blind_id", "grader_id", "grader_revision", "status", "stage"):
                        if grader_terminal.get(field) != grade.get(field):
                            issues.append(f"{source}: grader terminal {field} disagrees with grade")
                    expected_result_path = f"{base}/result.json"
                    expected_raw_path = f"{base}/result.raw.json"
                    if grader_terminal.get("result_path") != expected_result_path:
                        issues.append(f"{source}: grader terminal result_path is not canonical")
                    if grader_terminal.get("raw_path") != expected_raw_path:
                        issues.append(f"{source}: grader terminal raw_path is not canonical")
                    elif not lib.safe_join(root, expected_result_path).is_file():
                        issues.append(f"{source}: grader result artifact is missing")
                    else:
                        persisted_grade = lib.load_json(lib.safe_join(root, expected_result_path))
                        if persisted_grade != grade:
                            issues.append(f"{source}: grades ledger row disagrees with immutable grader result")
                    grader_artifacts = []
                    for field in ("result_path", "raw_path", "log_path"):
                        if isinstance(grader_terminal.get(field), str):
                            grader_artifacts.append((grader_terminal[field], None, None))
                    _claim_artifacts(
                        root,
                        f"grader:{blind_id}:{grader_id}:{grader_revision}",
                        grader_artifacts,
                        owners,
                        f"grader terminal {blind_id}:{grader_id}",
                        issues,
                    )

    if require_judge_results and not any(expected_judge_by_attempt.values()):
        incomplete.append("no frozen task-to-grader identities are available")
    if require_judge_results:
        attempts_requiring_judges = schedule if adjudication_plan_path is not None else terminals
        for attempt_id in sorted(attempts_requiring_judges):
            missing_judges = sorted(
                expected_judge_by_attempt.get(attempt_id, set())
                - grade_matrix.get(attempt_id, set())
            )
            for grader in missing_judges:
                incomplete.append(f"attempt {attempt_id!r} lacks judge {grader[0]}@{grader[1]}")

    if adjudication_plan_path is not None:
        plan_revision = (
            adjudication_plan_data.get("plan_revision")
            if isinstance(adjudication_plan_data, dict) else None
        )
        benchmark_id = next(iter(benchmark_ids), None)
        for identity, row in adjudication_plan_rows.items():
            attempt_id, adjudicator_id, adjudicator_revision = identity
            source = adjudication_plan_sources.get(identity, f"{adjudication_plan_path}[{identity}]")
            if attempt_id not in schedule:
                continue
            if row.get("task_id") != schedule[attempt_id]["task_id"]:
                continue
            expected_blind = row.get("blind_id")
            if not isinstance(expected_blind, str):
                continue
            observed_blinds = judge_blind_by_attempt.get(attempt_id, set())
            if not observed_blinds:
                issues.append(f"{source}: blind_id cannot be validated until judge results are available")
            elif observed_blinds != {expected_blind}:
                issues.append(f"{source}: blind_id does not match every judge result")

            source_rows = row.get("source_judge_results")
            decisions: list[tuple[Any, ...]] = []
            if isinstance(source_rows, list):
                seen_sources: set[tuple[str, str]] = set()
                for source_position, source_row in enumerate(source_rows):
                    source_label = f"{source}.source_judge_results[{source_position}]"
                    if not isinstance(source_row, dict):
                        continue
                    source_grader = source_row.get("grader_id")
                    source_revision = source_row.get("grader_revision")
                    result_path = source_row.get("result_path")
                    result_digest = source_row.get("result_digest")
                    if not isinstance(source_grader, str) or not isinstance(source_revision, str):
                        continue
                    source_identity = (source_grader, source_revision)
                    if source_identity in seen_sources:
                        issues.append(
                            f"{source_label}: duplicate source judge result "
                            f"{source_grader!r}@{source_revision}"
                        )
                        continue
                    seen_sources.add(source_identity)
                    if (
                        source_grader, source_revision, "judge"
                    ) not in expected_judge_by_attempt.get(attempt_id, set()):
                        issues.append(
                            f"{source_label}: source judge {source_grader!r}@{source_revision} "
                            "is not configured for attempt"
                        )
                        continue
                    observed = judge_results.get((attempt_id, source_grader, source_revision))
                    if observed is None:
                        issues.append(
                            f"{source_label}: source judge result {source_grader!r}@{source_revision} "
                            "is missing from grade ledger"
                        )
                        continue
                    decisions.append(_grade_decision(observed))
                    if observed.get("blind_id") != expected_blind:
                        issues.append(f"{source_label}: source judge blind_id does not match plan job")
                    expected_result_path = (
                        f"{_grader_run_base(expected_blind, source_grader, source_revision)}/result.json"
                    )
                    if result_path != expected_result_path:
                        issues.append(f"{source_label}: source judge result_path is not canonical")
                        continue
                    try:
                        source_result_path = lib.safe_join(root, result_path)
                    except lib.BenchmarkError as exc:
                        issues.append(str(exc))
                        continue
                    if not source_result_path.is_file() or _has_symlink(root, result_path):
                        issues.append(f"{source_label}: source judge result_path is unresolved or symlinked")
                        continue
                    source_bytes = lib.read_bytes(source_result_path)
                    observed_digest = hashlib.sha256(source_bytes).hexdigest()
                    if result_digest != observed_digest:
                        issues.append(
                            f"{source_label}: source judge result digest mismatch for "
                            f"{source_grader!r}@{source_revision}"
                        )
                    persisted_source = lib.parse_json_bytes(source_bytes, source_result_path.as_posix())
                    if persisted_source != observed:
                        issues.append(f"{source_label}: source result disagrees with grades ledger")
                expected_sources = {
                    (grader_id, revision)
                    for grader_id, revision, stage
                    in expected_judge_by_attempt.get(attempt_id, set())
                    if stage == "judge"
                }
                if seen_sources != expected_sources:
                    missing_sources = sorted(expected_sources - seen_sources)
                    extra_sources = sorted(seen_sources - expected_sources)
                    if missing_sources:
                        issues.append(
                            f"{source}: source_judge_results omit required judges: "
                            + ", ".join(f"{item[0]}@{item[1]}" for item in missing_sources)
                        )
                    if extra_sources:
                        issues.append(
                            f"{source}: source_judge_results contain extra judges: "
                            + ", ".join(f"{item[0]}@{item[1]}" for item in extra_sources)
                        )
                if len(decisions) >= 2 and len(set(decisions)) == 1:
                    issues.append(f"{source}: plan job does not identify a judge disagreement")

            grade = adjudication_results.get(identity)
            expected_grade_identity = (adjudicator_id, adjudicator_revision, "adjudicate")
            if grade is None or expected_grade_identity not in grade_matrix.get(attempt_id, set()):
                incomplete.append(
                    f"attempt {attempt_id!r} lacks adjudicator "
                    f"{adjudicator_id}@{adjudicator_revision}"
                )

            base = _grader_run_base(expected_blind, adjudicator_id, adjudicator_revision)
            assignment_relative = f"{base}/assignment.json"
            result_relative = f"{base}/result.json"
            raw_relative = f"{base}/result.raw.json"
            terminal_relative = f"{base}/terminal.json"
            assignment_path = lib.safe_join(root, assignment_relative)
            result_path = lib.safe_join(root, result_relative)
            raw_path = lib.safe_join(root, raw_relative)
            terminal_path = lib.safe_join(root, terminal_relative)

            if not assignment_path.is_file() or _has_symlink(root, assignment_relative):
                incomplete.append(f"{source}: immutable adjudication assignment is missing")
            else:
                assignment = lib.load_json(assignment_path)
                issues.extend(
                    f"{source}: assignment {issue}"
                    for issue in lib.validate_json_schema(
                        assignment, adjudication_assignment_schema
                    )
                )
                if isinstance(assignment, dict):
                    expected_assignment = {
                        "benchmark_id": benchmark_id,
                        "plan_revision": plan_revision,
                        "attempt_id": attempt_id,
                        "task_id": row.get("task_id"),
                        "blind_id": expected_blind,
                        "grader_id": adjudicator_id,
                        "grader_revision": adjudicator_revision,
                        "stage": "adjudicate",
                    }
                    for field, expected in expected_assignment.items():
                        if assignment.get(field) != expected:
                            issues.append(f"{source}: assignment {field} disagrees with plan job")
                    expected_request = f"{base}/request.json"
                    if assignment.get("request_path") != expected_request:
                        issues.append(f"{source}: assignment request_path is not canonical")
                    for binding_name in ("runtime_capability_binding", "call_plan_binding"):
                        _verify_digest_binding(
                            root, assignment.get(binding_name),
                            f"{source}: assignment {binding_name}", issues,
                        )
                    _claim_artifacts(
                        root,
                        f"adjudication:{attempt_id}:{adjudicator_id}:{adjudicator_revision}:assignment",
                        [(expected_request, None, None)],
                        owners,
                        f"{source}: assignment",
                        issues,
                    )

            persisted_grade: Any = None
            if not result_path.is_file() or _has_symlink(root, result_relative):
                incomplete.append(f"{source}: immutable adjudication result is missing")
            else:
                persisted_grade = lib.load_json(result_path)
                issues.extend(
                    f"{source}: result {issue}"
                    for issue in lib.validate_json_schema(persisted_grade, result_schema)
                )
                if not isinstance(persisted_grade, dict):
                    issues.append(f"{source}: terminal adjudication result must be non-null")
                else:
                    for field, expected in (
                        ("benchmark_id", benchmark_id),
                        ("attempt_id", attempt_id),
                        ("blind_id", expected_blind),
                        ("grader_id", adjudicator_id),
                        ("grader_revision", adjudicator_revision),
                        ("stage", "adjudicate"),
                    ):
                        if persisted_grade.get(field) != expected:
                            issues.append(f"{source}: result {field} disagrees with plan job")
                    if grade is None:
                        issues.append(f"{source}: adjudication result is absent from grades ledger")
                    elif persisted_grade != grade:
                        issues.append(f"{source}: adjudication result disagrees with grades ledger")

            if not terminal_path.is_file() or _has_symlink(root, terminal_relative):
                incomplete.append(f"{source}: immutable adjudication terminal is missing")
            else:
                terminal = lib.load_json(terminal_path)
                issues.extend(
                    f"{source}: terminal {issue}"
                    for issue in lib.validate_json_schema(
                        terminal, adjudication_terminal_schema
                    )
                )
                if isinstance(terminal, dict):
                    expected_terminal = {
                        "benchmark_id": benchmark_id,
                        "plan_revision": plan_revision,
                        "attempt_id": attempt_id,
                        "task_id": row.get("task_id"),
                        "blind_id": expected_blind,
                        "grader_id": adjudicator_id,
                        "grader_revision": adjudicator_revision,
                        "stage": "adjudicate",
                        "status": persisted_grade.get("status") if isinstance(persisted_grade, dict) else None,
                        "result_path": result_relative,
                        "raw_path": raw_relative,
                    }
                    for field, expected in expected_terminal.items():
                        if terminal.get(field) != expected:
                            issues.append(f"{source}: terminal {field} disagrees with adjudication job")
                    terminal_artifacts: list[tuple[str, str | None, int | None]] = [
                        (result_relative, terminal.get("result_sha256"), None),
                        (raw_relative, terminal.get("raw_sha256"), None),
                    ]
                    if isinstance(terminal.get("log_path"), str):
                        terminal_artifacts.append((terminal["log_path"], None, None))
                    _claim_artifacts(
                        root,
                        f"adjudication:{attempt_id}:{adjudicator_id}:{adjudicator_revision}",
                        terminal_artifacts,
                        owners,
                        f"{source}: terminal",
                        issues,
                    )

        for base in sorted(known_judge_bases & set(adjudication_bases)):
            issues.append(
                f"adjudication plan: artifact bundle {base!r} collides with a judge lifecycle"
            )
        known_bases = known_judge_bases | set(adjudication_bases)
        grader_runs_root = root / "grader-runs"
        discovered_bases: set[str] = set()
        if grader_runs_root.is_dir():
            for artifact_name in ("assignment.json", "result.json", "terminal.json"):
                for artifact_path in grader_runs_root.glob(f"*/*/{artifact_name}"):
                    discovered_bases.add(artifact_path.parent.relative_to(root).as_posix())
        for base in sorted(discovered_bases - known_bases):
            issues.append(f"adjudication plan: unexpected grader lifecycle artifact bundle {base!r}")

    telemetry_path = _path(root, args.telemetry, "telemetry.jsonl")
    telemetry_values = _load_records(telemetry_path, missing_ok=True)
    telemetry_ids = [
        value.get("attempt_id") for value in telemetry_values
        if isinstance(value, dict) and isinstance(value.get("attempt_id"), str)
    ]
    telemetry_id_set = set(telemetry_ids)
    unexpected_telemetry = sorted(telemetry_id_set - set(schedule))
    if unexpected_telemetry:
        issues.append("telemetry: unexpected scheduled-attempt IDs: " + ", ".join(unexpected_telemetry))
    if args.strict_completion:
        missing_telemetry = sorted(set(schedule) - telemetry_id_set)
        if missing_telemetry:
            incomplete.append("telemetry missing scheduled attempts: " + ", ".join(missing_telemetry))
    telemetry_aggregate: dict[str, Any] | None = None
    if telemetry_values or args.strict_completion:
        try:
            telemetry_aggregate = aggregate_telemetry.aggregate(
                telemetry_values, terminals, telemetry_schema, require_attempt_match=True
            )
        except lib.ContractError as exc:
            issues.extend(exc.issues)

    telemetry_children: dict[str, str] = {}
    for position, record in enumerate(telemetry_values):
        source = f"{telemetry_path}[{position}]"
        if not isinstance(record, dict) or record.get("attempt_id") not in schedule:
            continue
        attempt_id = record["attempt_id"]
        children = record.get("children")
        if not isinstance(children, list):
            continue
        for child in children:
            if not isinstance(child, dict) or not isinstance(child.get("agent_id"), str):
                continue
            child_id = child["agent_id"]
            previous = telemetry_children.setdefault(child_id, attempt_id)
            if previous != attempt_id:
                issues.append(f"{source}: child {child_id!r} crosses telemetry attempts {previous!r} and {attempt_id!r}")
        ownership = record.get("child_ownership")
        if not isinstance(ownership, list):
            continue
        for edge in ownership:
            if not isinstance(edge, dict):
                continue
            _claim_artifacts(
                root, f"child:{edge.get('child_agent_id')}",
                _artifact_values({"settlement_artifact_path": edge.get("settlement_artifact_path")}),
                owners, source, issues,
            )

    discovered_children: dict[str, str] = {}
    for attempt_id, terminal in terminals.items():
        for child_id in _nested_ids(terminal.get("fabric_result", {})):
            previous = discovered_children.setdefault(child_id, attempt_id)
            if previous != attempt_id:
                issues.append(f"nested child {child_id!r} appears under attempts {previous!r} and {attempt_id!r}")
    all_children = set(child_events) | set(telemetry_children) | set(discovered_children)
    for child_id in sorted(all_children):
        event_attempts = {event.get("attempt_id") for event in child_events.get(child_id, {}).values()}
        known_attempts = event_attempts | ({telemetry_children[child_id]} if child_id in telemetry_children else set()) | ({discovered_children[child_id]} if child_id in discovered_children else set())
        if len(known_attempts) != 1 or next(iter(known_attempts), None) not in schedule:
            issues.append(f"child {child_id!r}: orphaned or crossed attempt ownership")
        lifecycle = child_events.get(child_id, {})
        if "child-dispatched" not in lifecycle:
            issues.append(f"child {child_id!r}: missing child-dispatched event")
        if "child-settled" not in lifecycle:
            issues.append(f"child {child_id!r}: missing child-settled event")
        else:
            _claim_artifacts(root, f"child:{child_id}", _artifact_values(lifecycle["child-settled"]), owners, f"child {child_id} settlement", issues)

    observed_seal_types: set[str] = set()
    for receipt in args.seal_receipt:
        receipt_path = receipt if receipt.is_absolute() else root / receipt
        seal_type = _verify_seal_receipt(root, receipt_path, seal_schema, issues)
        if seal_type:
            if seal_type in observed_seal_types:
                issues.append(f"duplicate active seal receipt for type {seal_type!r}")
            observed_seal_types.add(seal_type)
    required_seals = set(args.require_seal_type)
    for seal_type in sorted(required_seals - observed_seal_types):
        incomplete.append(f"required {seal_type} seal receipt is absent")

    scheduled_ids = set(schedule)
    sets = {
        "assigned": set(assignments), "started": set(starts), "terminal_events": set(terminal_events),
        "terminal_artifacts": set(terminals), "ledger": set(ledger),
    }
    for name in ("assigned", "terminal_events", "terminal_artifacts", "ledger"):
        missing = sorted(scheduled_ids - sets[name])
        if missing:
            incomplete.append(f"{name} missing {len(missing)} scheduled attempts: {', '.join(missing)}")
    if set(terminal_events) != set(terminals):
        issues.append("terminal event IDs and terminal artifact IDs do not reconcile exactly")
    if set(terminals) != set(ledger):
        issues.append("terminal artifact IDs and ledger IDs do not reconcile exactly")
    ambiguous = sorted(set(assignments) - set(terminal_events))
    if ambiguous:
        incomplete.append(f"assigned without terminal, replay forbidden: {', '.join(ambiguous)}")

    issues = sorted(set(issues))
    incomplete = sorted(set(incomplete))
    complete = not issues and not incomplete
    return {
        "schema_version": 1,
        "mode": "strict-completion" if args.strict_completion else "structural-audit",
        "status": "invalid" if issues else ("complete" if complete else "incomplete"),
        "complete": complete,
        "counts": {
            "scheduled": len(schedule), "assigned": len(assignments), "started": len(starts),
            "terminal_events": len(terminal_events), "terminal_artifacts": len(terminals),
            "ledger": len(ledger), "grades": len(grade_values),
            "telemetry_records": len(telemetry_values),
            "telemetry_aggregated_records": 0 if telemetry_aggregate is None else telemetry_aggregate["record_count"],
            "children": len(all_children), "owned_artifacts": len(owners),
            "seal_receipts": len(args.seal_receipt),
        },
        "ambiguous_attempt_ids": ambiguous,
        "issues": issues,
        "completion_blockers": incomplete,
    }


def _parser() -> argparse.ArgumentParser:
    base = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--schedule", type=Path)
    parser.add_argument("--events", type=Path)
    parser.add_argument("--ledger", type=Path)
    parser.add_argument("--attempts-dir", "--attempts", dest="attempts_dir", type=Path)
    parser.add_argument("--grades", "--results", dest="grades", type=Path)
    parser.add_argument("--telemetry", type=Path)
    parser.add_argument("--tasks-dir", type=Path)
    parser.add_argument("--graders-dir", type=Path)
    parser.add_argument("--seal-receipt", action="append", default=[], type=Path)
    parser.add_argument("--require-seal-type", action="append", default=[], choices=("design", "execution", "raw-freeze"))
    parser.add_argument(
        "--expected-grader", action="append", default=[], metavar="ID@REVISION",
        help="backward-compatible assertion against task-owned frozen grader identities",
    )
    parser.add_argument("--require-graders", action="store_true")
    parser.add_argument("--adjudication-plan", type=Path)
    parser.add_argument(
        "--adjudication-plan-schema", type=Path, default=base / "schemas" / "adjudication-plan.schema.json",
    )
    parser.add_argument(
        "--adjudication-assignment-schema",
        type=Path,
        default=base / "schemas" / "adjudication-assignment.schema.json",
    )
    parser.add_argument(
        "--adjudication-terminal-schema",
        type=Path,
        default=base / "schemas" / "adjudication-terminal.schema.json",
    )
    parser.add_argument("--strict-completion", "--require-complete", dest="strict_completion", action="store_true", help="exit nonzero unless exact completion holds")
    parser.add_argument("--output", type=Path, help="create-only JSON receipt (default: stdout)")
    parser.add_argument("--schedule-schema", type=Path, default=base / "schemas" / "schedule-row.schema.json")
    parser.add_argument("--attempt-schema", type=Path, default=base / "schemas" / "attempt.schema.json")
    parser.add_argument("--result-schema", type=Path, default=base / "schemas" / "result.schema.json")
    parser.add_argument("--grader-schema", type=Path, default=base / "schemas" / "grader.schema.json")
    parser.add_argument("--task-schema", type=Path, default=base / "schemas" / "task.schema.json")
    parser.add_argument("--telemetry-schema", type=Path, default=base / "schemas" / "telemetry.schema.json")
    parser.add_argument("--seal-schema", type=Path, default=base / "schemas" / "seal.schema.json")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        result = reconcile(args)
        if args.output:
            destination = args.output if args.output.is_absolute() else args.root / args.output
            lib.atomic_create_json(destination, result)
        else:
            sys.stdout.buffer.write(lib.canonical_json_bytes(result))
        if result["issues"]:
            return lib.EXIT_INVALID
        if args.strict_completion and not result["complete"]:
            return lib.EXIT_INVALID
        return lib.EXIT_OK
    except lib.ContractError as exc:
        for issue in exc.issues:
            print(f"error: {issue}", file=sys.stderr)
        return lib.EXIT_INVALID
    except lib.BenchmarkError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return lib.EXIT_IO if isinstance(exc, lib.InputError) else lib.EXIT_INVALID


if __name__ == "__main__":
    raise SystemExit(main())
