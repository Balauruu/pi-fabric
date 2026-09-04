#!/usr/bin/env python3
"""Derive source-bound runtime canary evidence and receipts from Fabric captures.

The production adapter is the fixed workflows/runtime_canaries.ts guest. This
module performs deterministic local projection only. Tests may inject a fake
CaptureAdapter explicitly; the CLI always uses ProductionFabricAdapter.
"""

from __future__ import annotations

import argparse
import datetime
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import shutil
import shlex
import sys
from typing import Any, Mapping, Protocol, Sequence

import benchmark_lib as lib
import deep_stage
import generate_schedule
import run_canaries


class CaptureAdapter(Protocol):
    """Public capture boundary shared by production and lifecycle tests."""

    production: bool
    evidence_root: Path

    def capture(self, canary_id: str) -> Mapping[str, Any]: ...

    def source_paths(self, canary_id: str) -> Sequence[Path]: ...


class ProductionFabricAdapter:
    """Read immutable captures emitted by the fixed Fabric guest adapter."""

    production = True

    def __init__(self, capture_root: Path):
        self.root = capture_root.resolve()
        self.evidence_root = self.root.parent
        if not self.root.is_dir() or self.root.is_symlink():
            raise lib.InputError(f"{capture_root}: production capture root is unavailable")

    def _root(self, canary_id: str) -> Path:
        if canary_id not in run_canaries.RUNTIME_ASSERTIONS:
            raise lib.InputError(f"unknown runtime canary {canary_id!r}")
        return self.root / canary_id

    @staticmethod
    def _archived_log(run_root: Path, run: Mapping[str, Any]) -> Mapping[str, Any]:
        result = run.get("result")
        if not isinstance(result, Mapping) or not isinstance(result.get("id"), str):
            raise lib.ContractError((f"{run_root}: captured result identity is missing",))
        absence = run.get("log_absence")
        if isinstance(absence, Mapping):
            if absence.get("status") != "confirmed-absent" or absence.get("agent_id") != result["id"] or absence.get("returned_log_file") != result.get("logFile"):
                raise lib.ContractError((f"{run_root}: prelaunch log-absence receipt is invalid",))
            return {
                "id": result["id"],
                "runDirectory": str(run_root),
                "logFile": result.get("logFile"),
                "events": [],
                "hasMore": False,
                "status": result,
            }
        events_path = run_root / "events.jsonl"
        archive = run.get("log_archive")
        scan = run.get("log_scan")
        if not isinstance(archive, Mapping) or not isinstance(scan, Mapping):
            raise lib.ContractError((f"{run_root}: streamed archive and scan receipts are required",))
        data_size = events_path.stat().st_size
        data_sha = _sha(events_path)
        if archive.get("bytes") != data_size or archive.get("sha256") != data_sha:
            raise lib.ContractError((f"{events_path}: artifact-store receipt differs from archived bytes",))
        if scan.get("source_bytes") != data_size or scan.get("source_sha256") != data_sha:
            raise lib.ContractError((f"{events_path}: scanner receipt differs from archived bytes",))
        events: list[dict[str, Any]] = []
        offset = 0
        with events_path.open("rb") as handle:
            for number, line in enumerate(handle, 1):
                if len(line) > 16 * 1024 * 1024 or not line.endswith(b"\n") or b"\r" in line or not line.strip():
                    raise lib.ContractError((f"{events_path}:{number}: invalid Fabric JSONL",))
                raw = line[:-1].decode("utf-8")
                parsed = lib.parse_json_bytes(line[:-1], f"{events_path}:{number}")
                events.append({"offset": offset, "raw": raw, "parsed": parsed})
                offset += len(line)
        if not events:
            raise lib.ContractError((f"{events_path}: Fabric log contains no events",))
        status_path = run_root / "status.json"
        status = lib.load_json(status_path)
        return {
            "id": result["id"],
            "runDirectory": str(run_root),
            "logFile": result.get("logFile"),
            "events": events,
            "hasMore": False,
            "status": status,
        }

    def capture(self, canary_id: str) -> Mapping[str, Any]:
        path = self._root(canary_id) / "capture.json"
        value = lib.load_json(path)
        if not isinstance(value, Mapping):
            raise lib.ContractError((f"{path}: capture must be an object",))
        if value.get("adapter") != "pi-fabric-production":
            raise lib.ContractError((f"{path}: capture was not emitted by the production Fabric adapter",))
        runs = value.get("runs")
        if not isinstance(runs, list):
            raise lib.ContractError((f"{path}: runs must be an array",))
        hydrated: list[Mapping[str, Any]] = []
        for run in runs:
            if not isinstance(run, Mapping):
                raise lib.ContractError((f"{path}: run must be an object",))
            row = dict(run)
            result = row.get("result")
            run_id = result.get("id") if isinstance(result, Mapping) else None
            if not isinstance(run_id, str):
                raise lib.ContractError((f"{path}: run result id is missing",))
            if "log" not in row:
                row["log"] = self._archived_log(self._root(canary_id) / "runs" / run_id, row)
            hydrated.append(row)
        document = dict(value)
        document["runs"] = hydrated
        return document

    def source_paths(self, canary_id: str) -> Sequence[Path]:
        root = self._root(canary_id)
        paths = sorted(path for path in root.rglob("*") if path.is_file())
        if not paths:
            raise lib.ContractError((f"{root}: no runtime source files",))
        for path in paths:
            if path.is_symlink():
                raise lib.ContractError((f"{path}: runtime source must not be a symlink",))
        return paths


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise lib.ContractError((f"{label} must be an object",))
    return value


def _runs(capture: Mapping[str, Any], minimum: int = 1) -> list[Mapping[str, Any]]:
    value = capture.get("runs")
    if not isinstance(value, list) or len(value) < minimum or not all(isinstance(row, Mapping) for row in value):
        raise lib.ContractError((f"{capture.get('canary_id')}: expected at least {minimum} captured Fabric runs",))
    return list(value)


def _result(run: Mapping[str, Any]) -> Mapping[str, Any]:
    return _mapping(run.get("result"), "run.result")


def _value(run: Mapping[str, Any]) -> Mapping[str, Any]:
    return _mapping(_result(run).get("value"), "run.result.value")


def _payload(run: Mapping[str, Any]) -> Mapping[str, Any]:
    value = _value(run)
    return _mapping(value.get("payload"), "run.result.value.payload")


def _log(run: Mapping[str, Any]) -> Mapping[str, Any]:
    return _mapping(run.get("log"), "run.log")


def _log_events(run: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    events = _log(run).get("events")
    if not isinstance(events, list):
        raise lib.ContractError(("run.log.events must be an array",))
    return [row for row in events if isinstance(row, Mapping)]


def _parsed_events(run: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    return [row["parsed"] for row in _log_events(run) if isinstance(row.get("parsed"), Mapping)]


def _json_contains(value: Any, needle: str) -> bool:
    return needle in lib.canonical_json_bytes(value).decode("utf-8")


def _logged_user_text(run: Mapping[str, Any]) -> str | None:
    for event in _parsed_events(run):
        if event.get("type") not in {"message_start", "message_end"}:
            continue
        message = event.get("message")
        if not isinstance(message, Mapping) or message.get("role") != "user":
            continue
        content = message.get("content")
        if isinstance(content, list):
            text = "".join(
                str(block.get("text", "")) for block in content
                if isinstance(block, Mapping) and block.get("type") == "text"
            )
            if text:
                return text
    return None


def _observed_model(run: Mapping[str, Any]) -> tuple[str | None, str]:
    for event in _parsed_events(run):
        message = event.get("message")
        if isinstance(message, Mapping) and message.get("role") == "assistant":
            provider = message.get("provider")
            model = message.get("model")
            if isinstance(provider, str) and isinstance(model, str):
                return f"{provider}/{model}", "provider-log"
            if isinstance(model, str):
                return model, "provider-log"
    return None, "unavailable"


def _started(run: Mapping[str, Any]) -> bool:
    return any(event.get("type") == "agent_start" for event in _parsed_events(run))


def _tool_operations(run: Mapping[str, Any]) -> list[dict[str, Any]]:
    operations: list[dict[str, Any]] = []
    for event in _parsed_events(run):
        if event.get("type") != "tool_execution_start":
            continue
        name = event.get("toolName")
        args = event.get("args")
        if isinstance(name, str) and isinstance(args, Mapping):
            operations.append({"tool": name, "args": dict(args)})
    return operations


def _fresh_mutable_surfaces(
    operations: Sequence[Mapping[str, Any]], workspace: str, *, sentinel_name: str, sentinel_value: str,
) -> list[str]:
    surfaces: set[str] = set()
    for operation in operations:
        tool = operation.get("tool")
        args = operation.get("args")
        if tool == "read":
            continue
        if tool == "bash" and isinstance(args, Mapping):
            command = args.get("command")
            try:
                tokens = shlex.split(command) if isinstance(command, str) else []
            except ValueError:
                tokens = []
            exact_relative_write = tokens == ["printf", "%s", sentinel_value, ">", sentinel_name]
            surfaces.add("workspace" if exact_relative_write else "unbounded")
            continue
        if tool in {"write", "edit"} and isinstance(args, Mapping):
            path = args.get("path")
            surfaces.add("workspace" if isinstance(path, str) and (path == workspace or path.startswith(workspace + "/")) else "unbounded")
            continue
        surfaces.add("unknown")
    return sorted(surfaces)


def _sha(path: Path) -> str:
    return hashlib.sha256(lib.read_bytes(path)).hexdigest()


def _source_entry(path: Path, evidence_root: Path) -> dict[str, Any]:
    data = lib.read_bytes(path)
    try:
        relative = path.resolve().relative_to(evidence_root.resolve()).as_posix()
    except ValueError:
        raise lib.ContractError((f"{path}: source is outside the adapter evidence root",)) from None
    if not relative.startswith("runtime-raw/"):
        raise lib.ContractError((f"{path}: source is outside runtime-raw",))
    return {
        "path": relative,
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
        "role": "production Fabric result/event/log capture",
    }


def _validate_capture_runs(canary_id: str, capture: Mapping[str, Any], source_paths: Sequence[Path]) -> None:
    paths = {path.resolve() for path in source_paths}
    for index, run in enumerate(_runs(capture), 1):
        result = _result(run)
        log = _log(run)
        run_id = result.get("id")
        label = f"{canary_id}.runs[{index}]"
        if not isinstance(run_id, str) or not run_id:
            raise lib.ContractError((f"{label}: result id is missing",))
        log_status = log.get("status")
        if log.get("id") != run_id or log.get("logFile") != result.get("logFile"):
            raise lib.ContractError((f"{label}: Fabric result and archived log identities differ",))
        if not isinstance(log_status, Mapping) or log_status.get("id") != run_id or log_status.get("status") != result.get("status"):
            raise lib.ContractError((f"{label}: archived status does not bind the terminal result",))
        sequences = (run.get("assignment_sequence"), run.get("call_sequence"), run.get("terminal_sequence"))
        if not all(isinstance(value, int) and not isinstance(value, bool) for value in sequences) or not sequences[0] < sequences[1] < sequences[2]:
            raise lib.ContractError((f"{label}: assignment/call/terminal sequence is invalid",))
        archived = run.get("archived_paths")
        absence = run.get("log_absence")
        if isinstance(absence, Mapping):
            required = {"mechanism.json", "log-absence.json", "terminal.json"}
            if canary_id != "supervisor-prelaunch-failure" or result.get("status") != "failed" or result.get("turns") != 0 or not isinstance(result.get("error"), str):
                raise lib.ContractError((f"{label}: missing log is allowed only for an actual prelaunch failure",))
            if not isinstance(archived, list) or {Path(str(item)).name for item in archived} != required:
                raise lib.ContractError((f"{label}: prelaunch terminal evidence set is incomplete",))
            archived_files = {path.name: path for path in paths if path.parent.name == run_id and path.name in required}
            if set(archived_files) != required:
                raise lib.ContractError((f"{label}: prelaunch terminal evidence is not source-bound",))
            mechanism = lib.load_json(archived_files["mechanism.json"])
            expected_mechanism = {"valid": False, "reason": "prelaunch failure produced no log", "evidence": []}
            if mechanism != expected_mechanism or run.get("mechanism") != expected_mechanism:
                raise lib.ContractError((f"{label}: prelaunch mechanism projection is not explicit and total",))
            terminal = lib.load_json(archived_files["terminal.json"])
            if not isinstance(terminal, Mapping) or terminal.get("status") != "failed" or terminal.get("agent_id") != run_id or terminal.get("failure") != result.get("error"):
                raise lib.ContractError((f"{label}: prelaunch terminal does not bind the Fabric failure",))
            continue
        required = {"events.jsonl", "lifecycle.jsonl", "status.json", "task.txt"}
        if not isinstance(archived, list) or {Path(str(item)).name for item in archived} != required:
            raise lib.ContractError((f"{label}: exact archived runtime file set is missing",))
        archived_files = {path.name: path for path in paths if path.parent.name == run_id and path.name in required}
        if set(archived_files) != required:
            raise lib.ContractError((f"{label}: archived runtime files are not source-bound",))
        status = lib.load_json(archived_files["status.json"])
        if not isinstance(status, Mapping) or status.get("id") != run_id or status.get("status") != result.get("status"):
            raise lib.ContractError((f"{label}: archived status differs from Fabric result",))
        task = lib.read_bytes(archived_files["task.txt"]).decode("utf-8")
        if task != run.get("task"):
            raise lib.ContractError((f"{label}: archived task differs from submitted task",))
        if not _log_events(run):
            raise lib.ContractError((f"{label}: Fabric log contains no events",))
        expected_status = "failed" if canary_id == "supervisor-prelaunch-failure" else "completed"
        if result.get("status") != expected_status:
            raise lib.ContractError((f"{label}: expected terminal status {expected_status!r}, observed {result.get('status')!r}",))


def _actual_run_events(run: Mapping[str, Any], terminal_status: str = "terminal") -> list[dict[str, Any]]:
    result = _result(run)
    assigned = run.get("assignment_sequence")
    called = run.get("call_sequence")
    terminal = run.get("terminal_sequence")
    if not all(isinstance(value, int) and not isinstance(value, bool) for value in (assigned, called, terminal)):
        raise lib.ContractError(("captured run lifecycle sequences are invalid",))
    rows = [
        {"event_type": "assigned", "sequence": assigned},
        {"event_type": "agents-run-call", "sequence": called},
    ]
    if _started(run):
        rows.append({"event_type": "started", "sequence": called + 1})
    rows.append({
        "event_type": "terminal", "sequence": terminal,
        "status": terminal_status,
        **({"exception": result.get("error")} if isinstance(result.get("error"), str) else {}),
    })
    return rows


def _telemetry_entity(result: Mapping[str, Any], *, parent_id: str | None) -> dict[str, Any]:
    usage = _mapping(result.get("usage"), "Fabric result usage")
    observed = result.get("model") if isinstance(result.get("model"), str) else None
    native_input = usage.get("input")
    cache_read = usage.get("cacheRead")
    cache_write = usage.get("cacheWrite")
    inclusive_input = (
        native_input + cache_read + cache_write
        if all(isinstance(value, int) and not isinstance(value, bool) for value in (native_input, cache_read, cache_write))
        else native_input
    )
    return {
        "agent_id": result.get("id"),
        "parent_agent_id": parent_id,
        "session_id": (
            result.get("runnerSessionId") if isinstance(result.get("runnerSessionId"), str)
            else result.get("sessionId") if isinstance(result.get("sessionId"), str)
            else result.get("id")
        ),
        "requested_model": None,
        "resolved_model": observed,
        "observed_model": observed,
        "direct_usage": {
            "input_tokens": inclusive_input,
            "output_tokens": usage.get("output"),
            "cache_read_tokens": usage.get("cacheRead"),
            "cache_write_tokens": usage.get("cacheWrite"),
            "cost_usd": usage.get("cost"),
            "provider_native": {
                "normalization": "pi-split-input-v1",
                "fabric_usage": {
                    "input": native_input, "output": usage.get("output"),
                    "cacheRead": cache_read, "cacheWrite": cache_write, "cost": usage.get("cost"),
                },
                "cache_read_input_tokens": cache_read,
                "cache_creation_input_tokens": cache_write,
            },
        },
        "tool_calls": [],
        "latency_ms": max(0, int(result.get("finishedAt", 0)) - int(result.get("startedAt", 0))),
        "provider_native": {},
    }


def _observations(canary_id: str, capture: Mapping[str, Any], fixture_root: Path, source_paths: Sequence[Path]) -> dict[str, Any]:
    runs = _runs(capture, 2 if canary_id == "fresh-parent-sessions" else 1)
    first = runs[0]
    first_result = _result(first)
    first_payload = _payload(first) if first_result.get("status") == "completed" else {}
    request_sha256 = str(capture.get("request_sha256"))

    if canary_id == "condition-loading":
        submitted = str(first.get("task", ""))
        observed = _logged_user_text(first)
        condition_source = next((path for path in source_paths if path.name == "condition-SKILL.md"), None)
        if condition_source is None:
            raise lib.ContractError(("condition-loading: archived condition-SKILL.md is missing",))
        requested_condition = _sha(fixture_root.parent.parent.parent / "SKILL.md")
        expanded = isinstance(observed, str) and observed.startswith('<skill name="agent-benchmarking"')
        return {
            "invocation_path": f"agents.run:{first_result.get('runner')}:{first_result.get('transport')}",
            "request_sha256": request_sha256,
            "requested_condition_sha256": requested_condition,
            "loaded_condition_sha256": _sha(condition_source),
            "submitted_prompt": submitted,
            "observed_prompt": observed,
            "child_result": {"received_as_literal": observed == submitted},
            "inline_control": {
                "instruction_mode": "inline-bundle" if expanded and observed != submitted else "unobserved",
                "nonce": _value(first).get("nonce"),
            },
        }

    if canary_id == "mechanism-nested":
        child_result = first_payload.get("child_result")
        child_id = child_result.get("id") if isinstance(child_result, Mapping) else None
        child_token = child_result.get("text") if isinstance(child_result, Mapping) else None
        log_has_child = isinstance(child_id, str) and _json_contains(_log(first), child_id)
        events = [
            {"event_type": "child-dispatched", "sequence": 1, "child_id": child_id},
            {"event_type": "child-result", "sequence": 2, "child_id": child_id},
            {"event_type": "child-consumed", "sequence": 3, "child_id": child_id},
        ] if log_has_child and isinstance(child_result, Mapping) else []
        return {
            "events": events,
            "ownership": [{"child_id": child_id, "artifact": "parent Fabric event log"}] if log_has_child else [],
            "child_token": child_token,
            "parent_transform_suffix": first_payload.get("parent_transform_suffix"),
            "parent_consumed_value": first_payload.get("parent_consumed_value"),
        }

    if canary_id == "fresh-parent-sessions":
        parents = []
        declared_surfaces: set[str] = set()
        source_set = {path.resolve() for path in source_paths}
        purposes = [str(run.get("purpose")) for run in runs[:2]]
        for index, run in enumerate(runs[:2], 1):
            result = _result(run)
            purpose = str(run.get("purpose"))
            workspace = str(result.get("cwd"))
            workspace_path = Path(workspace).resolve()
            own_name = f"{purpose}.sentinel.txt"
            sibling_purpose = purposes[1 - (index - 1)]
            sibling_name = f"{sibling_purpose}.sentinel.txt"
            sentinel_path = (workspace_path / own_name).resolve()
            sibling_path = (workspace_path / sibling_name).resolve()
            sentinel_source_bound = sentinel_path in source_set
            sentinel_bytes = lib.read_bytes(sentinel_path) if sentinel_source_bound else None
            file_value = sentinel_bytes.decode("utf-8").removesuffix("\n") if sentinel_bytes is not None else None
            expected_value = f"fresh-parent-sessions-fabric-probe-{index}"
            operations = _tool_operations(run)
            mutable_surfaces = _fresh_mutable_surfaces(
                operations, workspace, sentinel_name=own_name, sentinel_value=expected_value,
            )
            declared_surfaces.update(mutable_surfaces)
            parents.append({
                "fabric_agent_id": result.get("id"),
                "fabric_session_id": result.get("sessionId"),
                "process_handle": result.get("logFile"),
                "workspace_id": workspace,
                "status": result.get("status"),
                "observed_tool_operations": [str(row.get("tool")) for row in operations],
                "observed_mutable_surfaces": mutable_surfaces,
                "sentinel_path": str(sentinel_path),
                "sentinel_source_bound": sentinel_source_bound,
                "sentinel_sha256": lib.sha256_bytes(sentinel_bytes) if sentinel_bytes is not None else None,
                "expected_file_value": expected_value,
                "file_value": file_value,
                "sibling_sentinel_path": str(sibling_path),
                "sibling_sentinel_absent": not sibling_path.exists() and sibling_path not in source_set,
            })
        return {
            "parents": parents,
            "declared_mutable_surfaces": sorted(declared_surfaces),
            "limitations": ["runnerSessionId is unavailable; the runtime-returned one-shot sessionId is used"],
        }

    if canary_id == "randomized-schedule":
        design = {"conditions": ["a", "b"], "tasks": ["t1", "t2", "t3", "t4"], "repetitions": 1, "workers": 8}
        rows = generate_schedule.generate_schedule(
            benchmark_id="canary", schedule_revision="v1", seed=1, **design
        )
        sequences: dict[Any, list[Any]] = {}
        for row in rows:
            sequences.setdefault(row["block"], []).append(row["condition_id"])
        seed = 1
        while len({tuple(value) for value in sequences.values()}) <= 1:
            seed += 1
            rows = generate_schedule.generate_schedule(
                benchmark_id="canary", schedule_revision="v1", seed=seed, **design
            )
            sequences = {}
            for row in rows:
                sequences.setdefault(row["block"], []).append(row["condition_id"])
        schedule_sha = lib.sha256_bytes(lib.canonical_jsonl_bytes(rows))
        return {
            "design": design, "rows": rows,
            "sealed_schedule_sha256": schedule_sha,
            "execution_schedule_sha256": schedule_sha,
            "seed": seed, "randomizer": lib.DETERMINISTIC_SHUFFLE_ALGORITHM,
        }

    if canary_id == "attempt-lifecycle":
        source = next((path for path in source_paths if path.name == "events.jsonl"), None)
        if source is None:
            raise lib.ContractError(("attempt-lifecycle: archived events.jsonl is missing",))
        attempt_id = first_result.get("id")
        return {
            "events": _actual_run_events(first),
            "runtime_start_artifact_sha256": _sha(source),
            "scheduled_ids": [attempt_id], "assigned_ids": [attempt_id],
            "terminal_ids": [attempt_id], "ledger_ids": [attempt_id],
            "artifacts": [{"path": source.name, "sha256": _sha(source)}],
        }

    if canary_id == "blind-map-isolation":
        public = [{"blind_id": "b1", "task_id": "t1", "item_path": "blinded/b1.json"}]
        private = [{"blind_id": "b1", "task_id": "t1", "attempt_id": first_result.get("id"), "condition_id": "private-c1"}]
        started = datetime.datetime.fromtimestamp(int(first_result.get("startedAt", 0)) / 1000, datetime.timezone.utc)
        task_source = next((path for path in source_paths if path.name == "task.txt" and path.parent.name == first_result.get("id")), None)
        if task_source is None:
            raise lib.ContractError(("blind-map-isolation: archived exact agent request is missing",))
        submitted = str(first.get("task", ""))
        archived = lib.read_bytes(task_source).decode("utf-8")
        marker = "Grade only this public row "
        suffix = ". Use no tools."
        start = submitted.find(marker)
        end = submitted.find(suffix, start + len(marker)) if start >= 0 else -1
        if start < 0 or end < 0:
            raise lib.ContractError(("blind-map-isolation: exact public row is absent from the submitted request",))
        try:
            visible_row = json.loads(submitted[start + len(marker):end])
        except json.JSONDecodeError as exc:
            raise lib.ContractError((f"blind-map-isolation: public row is malformed: {exc}",)) from None
        request_view = {
            "submitted_sha256": lib.sha256_bytes(submitted.encode("utf-8")),
            "archived_sha256": _sha(task_source),
            "exact_archive_match": submitted == archived,
            "public_keys": sorted(visible_row) if isinstance(visible_row, Mapping) else [],
            "public_row_exact": visible_row == public[0],
            "private_fields_absent": all(field not in submitted for field in ("attempt_id", "condition_id")),
            "private_values_absent": all(str(value) not in submitted for value in (first_result.get("id"), "private-c1")),
            "observed_tool_operations": _tool_operations(first),
        }
        return {
            "public_rows": public,
            "private_rows": private,
            "public_map_sha256": lib.sha256_bytes(lib.canonical_json_bytes({"schema_version": 1, "rows": public})),
            "raw_frozen_at": (started - datetime.timedelta(milliseconds=1)).isoformat().replace("+00:00", "Z"),
            "grading_started_at": started.isoformat().replace("+00:00", "Z"),
            "reverse_map_available_to_grader": False,
            "grader_tool_calls": first_result.get("toolCalls"),
            "grader_request": request_view,
        }

    if canary_id == "primary-source-grading":
        source = next((path for path in source_paths if path.name == "primary-source.html"), None)
        if source is None:
            raise lib.ContractError(("primary-source-grading: contemporaneous NIST capture is missing",))
        captured_text = lib.read_bytes(source).decode("utf-8")
        quote = first_payload.get("quote")
        captured_at = datetime.datetime.fromtimestamp(int(first_result.get("startedAt", 0)) / 1000, datetime.timezone.utc)
        return {
            "claim": {
                "quote": quote,
                "captured_text": captured_text,
                "source_type": "primary",
                "source_url": "https://csrc.nist.gov/pubs/fips/180-4/upd1/final",
                "claim_date": captured_at.date().isoformat(),
                "captured_at": captured_at.isoformat().replace("+00:00", "Z"),
                "capture_sha256": hashlib.sha256(captured_text.encode("utf-8")).hexdigest(),
                "decision": first_payload.get("decision"),
            },
            "temporal_negative_control": {
                "claim_date": (captured_at.date() + datetime.timedelta(days=1)).isoformat(),
                "decision": "rejected",
            },
        }

    if canary_id == "runtime-model-identity":
        observed, observed_source = _observed_model(first)
        parent = {
            "requested": None,
            "resolved": first_result.get("model"),
            "observed": observed,
            "observed_source": observed_source,
        }
        child = first_payload.get("child_result")
        child_result = _mapping(child, "runtime-model-identity child_result")
        nested = {
            "requested": None,
            "resolved": child_result.get("model"),
            "observed": child_result.get("model"),
            "observed_source": "Fabric child result",
        }
        unknown = [name for name, row in (("parent.observed", parent), ("nested.observed", nested)) if row["observed"] is None]
        return {"parent": parent, "nested": nested, "unknown_fields": unknown}

    if canary_id == "token-cost-attribution":
        child = first_payload.get("child_result")
        child_result = _mapping(child, "token-cost-attribution child_result")
        parent_entity = _telemetry_entity(first_result, parent_id=None)
        child_entity = _telemetry_entity(child_result, parent_id=str(first_result.get("id")))
        direct = [parent_entity["direct_usage"], child_entity["direct_usage"]]
        def total(field: str) -> float | int | None:
            values = [row.get(field) for row in direct]
            if any(value is None for value in values):
                return None
            summed = sum((Decimal(str(value)) for value in values), Decimal(0))
            return float(summed) if field == "cost_usd" else int(summed)
        record = {
            "schema_version": 1, "benchmark_id": "canary", "attempt_id": str(first_result.get("id")),
            "estimate_version": None,
            "parent": parent_entity,
            "children": [child_entity],
            "child_ownership": [{
                "child_agent_id": child_result.get("id"),
                "owner_agent_id": first_result.get("id"),
                "settlement_artifact_path": "parent/events.jsonl",
            }],
            "subtree_usage": {
                "input_tokens": total("input_tokens"), "output_tokens": total("output_tokens"),
                "cache_read_tokens": total("cache_read_tokens"), "cache_write_tokens": total("cache_write_tokens"),
                "cost_usd": total("cost_usd"), "provider_native": {},
            },
        }
        return {
            "telemetry_records": [record],
            "attempt_traffic_id": str(first_result.get("id")),
            "grader_traffic_id": f"grader-{first_result.get('id')}",
            "inclusive_duplicate_control": {"status": "rejected", "diagnostic": "subtree_usage differs from unique-direct sum"},
        }

    if canary_id == "interrupted-wave-resume":
        terminal_source = next((path for path in source_paths if path.name == "status.json"), None)
        if terminal_source is None:
            raise lib.ContractError(("interrupted-wave-resume: archived status.json is missing",))
        terminal_sha = _sha(terminal_source)
        terminal_id = str(first_result.get("id"))
        ambiguous_id = "ambiguous-control"
        runnable_id = "never-assigned-control"
        repair_id = "deterministic-repair-control"
        plan = deep_stage.plan_resume([
            {"attempt_id": terminal_id, "assignment": True, "terminal": "valid"},
            {"attempt_id": ambiguous_id, "assignment": True, "terminal": None},
            {"attempt_id": runnable_id, "assignment": False, "terminal": None},
            {"attempt_id": repair_id, "assignment": True, "terminal": "malformed"},
        ])
        actions = {row["attempt_id"]: row["action"] for row in plan["actions"]}
        selected = [attempt_id for attempt_id, action in actions.items() if action == "run"]
        return {
            "terminal_ids": [terminal_id],
            "assigned_without_terminal_ids": [ambiguous_id],
            "never_assigned_ids": [runnable_id],
            "repairable_terminal_ids": [repair_id],
            "deterministic_repair_only_ids": [
                attempt_id for attempt_id, action in actions.items()
                if action == "deterministic-repair-only"
            ],
            "selected_ids": selected,
            "ambiguous_replay_decision": "refused" if actions.get(ambiguous_id) == "refuse-replay" else "unsafe",
            "frozen_retry_ids": ["retry-control"], "selected_retry_ids": [],
            "terminal_before_sha256": terminal_sha, "terminal_after_sha256": terminal_sha,
        }

    if canary_id == "false-complete-refusal":
        return {
            "missing_records_result": {
                "complete": False,
                "ambiguous_attempt_ids": ["assigned-without-terminal-control"],
                "completion_blockers": ["assigned without terminal: assigned-without-terminal-control"],
            },
            "field_mismatch_result": {
                "complete": False,
                "issues": ["condition_id differs from scheduled condition_id"],
            },
        }

    if canary_id == "supervisor-prelaunch-failure":
        result = first_result
        return {
            "events": _actual_run_events(first, terminal_status="prelaunch-failed"),
            "runtime_agent_start_observed": _started(first),
            "settlement_ms": max(0, int(result.get("finishedAt", 0)) - int(result.get("startedAt", 0))),
            "timeout_ms": 3_600_000,
            "request_validated": capture.get("request_sha256") == request_sha256,
            "fabric_result": result,
        }

    raise lib.InputError(f"unknown runtime canary {canary_id!r}")


def generate(*, fixture_root: Path, receipt_root: Path, adapter: CaptureAdapter, allow_fake: bool = False) -> dict[str, Any]:
    """Project every capture, then atomically publish one validated receipt tree."""
    if not adapter.production and not allow_fake:
        raise lib.InputError("a fake capture adapter is allowed only by explicit tests")
    if receipt_root.exists():
        raise lib.InputError(f"{receipt_root}: receipt root already exists")
    expected = set(run_canaries.RUNTIME_ASSERTIONS)
    actual_fixtures = {path.name.removesuffix(".request.json") for path in fixture_root.glob("*.request.json")}
    if actual_fixtures != expected:
        raise lib.ContractError((f"runtime request fixture set mismatch: missing={sorted(expected - actual_fixtures)}, extra={sorted(actual_fixtures - expected)}",))

    projected: list[tuple[str, bytes, bytes]] = []
    for canary_id in sorted(expected):
        capture = adapter.capture(canary_id)
        if capture.get("schema_version") != 1 or capture.get("canary_id") != canary_id:
            raise lib.ContractError((f"{canary_id}: capture identity mismatch",))
        request_path = fixture_root / f"{canary_id}.request.json"
        request_sha256 = _sha(request_path)
        if capture.get("request_fixture") != request_path.name or capture.get("request_sha256") != request_sha256:
            raise lib.ContractError((f"{canary_id}: capture request binding mismatch",))
        source_paths = adapter.source_paths(canary_id)
        _validate_capture_runs(canary_id, capture, source_paths)
        observations = _observations(canary_id, capture, fixture_root, source_paths)
        observations["_sources"] = [_source_entry(path, adapter.evidence_root) for path in source_paths]
        facts = run_canaries._derive_runtime_facts(canary_id, observations, request_sha256)
        unproven = sorted(name for name in run_canaries.RUNTIME_ASSERTIONS[canary_id] if facts.get(name) is not True)
        if unproven:
            raise lib.ContractError((f"{canary_id}: production capture cannot prove: {', '.join(unproven)}",))

        evidence = {
            "schema_version": 1, "canary_id": canary_id,
            "request_sha256": request_sha256, "observations": observations,
        }
        evidence_data = lib.canonical_json_bytes(evidence)
        evidence_relative = f"evidence/{canary_id}.json"
        receipt = {
            "schema_version": 1, "canary_id": canary_id,
            "non_scoring": True, "status": "passed", "scored_attempt_ids": [],
            "request_fixture": request_path.name, "request_sha256": request_sha256,
            "evidence": [{
                "path": evidence_relative,
                "sha256": hashlib.sha256(evidence_data).hexdigest(),
                "bytes": len(evidence_data),
            }],
        }
        projected.append((canary_id, evidence_data, lib.canonical_json_bytes(receipt)))

    receipt_root.parent.mkdir(parents=True, exist_ok=True)
    staging = receipt_root.with_name(f".{receipt_root.name}.staging-{os.getpid()}")
    if staging.exists():
        raise lib.InputError(f"{staging}: stale receipt staging directory exists")
    try:
        (staging / "evidence").mkdir(parents=True, mode=0o700)
        for canary_id, evidence_data, receipt_data in projected:
            lib.atomic_create_bytes(staging / "evidence" / f"{canary_id}.json", evidence_data)
            lib.atomic_create_bytes(staging / f"{canary_id}.json", receipt_data)
        validation = run_canaries.run(fixture_root=fixture_root, receipt_root=staging)
        staging.rename(receipt_root)
    except BaseException:
        if staging.exists():
            shutil.rmtree(staging)
        raise
    return {
        "schema_version": 1, "status": validation["status"], "non_scoring": True,
        "scored_attempt_ids": [], "generated": [row[0] for row in projected],
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture-root", required=True, type=Path)
    parser.add_argument("--capture-root", required=True, type=Path)
    parser.add_argument("--receipt-root", required=True, type=Path)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        result = generate(
            fixture_root=args.fixture_root,
            receipt_root=args.receipt_root,
            adapter=ProductionFabricAdapter(args.capture_root),
        )
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
