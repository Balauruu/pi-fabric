#!/usr/bin/env python3
"""Deterministic mechanics for deep, resumable Pi Fabric benchmark stages.

This module deliberately performs no model calls.  It validates the installed
adapter, plans bounded invocations, publishes immutable artifacts, scans large
Fabric logs locally, projects telemetry, and computes resume/finalize plans.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from enum import Enum
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import stat
import sys
import tempfile
from typing import Any, Iterable, Iterator, Mapping, Sequence

import benchmark_lib as lib

MECHANICS_VERSION = "deep-stage-v1"
TELEMETRY_PROJECTOR_VERSION = "fabric-usage-v2"
DEFAULT_DIRECT_CALL_LIMIT = 100
_ALLOWED_TRAFFIC = ("attempt", "judge", "adjudicate", "audit", "canary")
_STAGE_ORDER = ("attempt", "judge", "adjudicate", "finalize")
# Retain the historical direct-root form for archive API compatibility. Doctor
# receipts use the stricter discovered pattern with one agent-id directory.
_TMP_LOG_FALLBACK = re.compile(r"^/tmp/pi-fabric-runs-[^/]+(?:/[^/]+)?/events\.jsonl$")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")
_MAX_PER_EXECUTION_PATTERN = re.compile(r"maxPerExecution\s*:\s*([0-9]+)")
_RECURSIVE_CWD_GUARD = re.compile(r"request\.cwd\s*!?==\s*void\s*0\s*&&\s*request\.recursive\s*===\s*true")
_RUN_ROOT_PREFIX_PATTERN = re.compile(r"mkdtempSync\(\s*[^)]*?path\d*\.join\(([^,]+),\s*['\"]pi-fabric-runs-['\"]\s*\)\s*\)")
_EVENT_ROOT_PATTERN = re.compile(r"(?:path\d+\.)?join\(this\.#runRoot,\s*id\)")
_EVENT_FILE_PATTERN = re.compile(r"(?:path\d+\.)?join\(runDirectory\d*,\s*[\"']events\.jsonl[\"']\)")
_MESH_ROOT_DEFAULT_PATTERN = re.compile(r'(?:path\d+\.)?join\(projectRoot,\s*[\"\']\.pi[\"\'],\s*[\"\']fabric[\"\'],\s*[\"\']mesh[\"\']\)')
_MESH_ROOT_OVERRIDE_PATTERN = re.compile(r"PI_FABRIC_MESH_ROOT")


_NUMERIC_BOUND_PATTERNS = {
    "max_output_chars": re.compile(r"\bmaxOutputChars:\s*([0-9eE+* .-]+)\s*,"),
    "max_nested_result_chars": re.compile(r"\bmaxNestedResultChars:\s*([0-9eE+* .-]+)\s*,"),
    "max_failure_model_output_chars": re.compile(r"\bMAX_FAILURE_MODEL_OUTPUT_CHARS\s*=\s*([0-9eE+* .-]+)\s*;"),
    "execution_details_max_bytes": re.compile(r"\bFABRIC_EXECUTION_DETAILS_MAX_BYTES\s*=\s*([0-9eE+* .-]+)\s*;"),
    "execution_trace_max_bytes": re.compile(r"\bFABRIC_EXECUTION_TRACE_MAX_BYTES\s*=\s*([0-9eE+* .-]+)\s*;"),
    "max_event_line_chars": re.compile(r"\bMAX_EVENT_LINE_CHARS\s*=\s*([0-9eE+* .-]+)\s*;"),
    "max_stderr_chars": re.compile(r"\bMAX_STDERR_CHARS\s*=\s*([0-9eE+* .-]+)\s*;"),
}


def _parse_js_integer(expression: str, label: str) -> int:
    factors = [part.strip() for part in expression.strip().split("*")]
    if not factors or any(not re.fullmatch(r"[0-9]+(?:[eE][+]?[0-9]+)?", part) for part in factors):
        raise lib.InputError(f"unable to parse installed numeric bound {label}")
    value = 1
    for factor in factors:
        decimal = Decimal(factor)
        if decimal != decimal.to_integral_value():
            raise lib.InputError(f"installed numeric bound {label} is not an integer")
        value *= int(decimal)
    if value < 1:
        raise lib.InputError(f"installed numeric bound {label} is not positive")
    return value


def _discover_runtime_bounds(root: Path) -> tuple[dict[str, int], dict[str, int], tuple[str, ...]]:
    discovered: dict[str, set[int]] = {name: set() for name in _NUMERIC_BOUND_PATTERNS}
    evidence: list[str] = []
    for path in _iter_js(root):
        text = _load_js_text(path)
        relative = path.relative_to(root).as_posix()
        for name, pattern in _NUMERIC_BOUND_PATTERNS.items():
            matches = tuple(pattern.finditer(text))
            for match in matches:
                discovered[name].add(_parse_js_integer(match.group(1), name))
            if matches:
                evidence.append(f"pi-fabric/{relative}:{name}")
    invalid = {name: sorted(values) for name, values in discovered.items() if len(values) != 1}
    if invalid:
        raise lib.InputError(f"unable to derive unique installed runtime bounds: {invalid}")
    values = {name: next(iter(found)) for name, found in discovered.items()}
    output = {name: values[name] for name in (
        "max_output_chars", "max_nested_result_chars", "max_failure_model_output_chars",
        "execution_details_max_bytes", "execution_trace_max_bytes",
    )}
    event_log = {name: values[name] for name in ("max_event_line_chars", "max_stderr_chars")}
    return output, event_log, tuple(sorted(set(evidence)))


def _interface_fields(declarations: str, name: str) -> tuple[tuple[str, ...], str | None]:
    match = re.search(rf"interface {re.escape(name)}(?: extends ([A-Za-z_$][A-Za-z0-9_$]*))?\s*\{{(.*?)\n\}}", declarations, re.DOTALL)
    if match is None:
        raise lib.InputError(f"installed guest declarations omit {name}")
    fields = tuple(re.findall(r"^\s*([A-Za-z_$][A-Za-z0-9_$]*)\??:\s*", match.group(2), re.MULTILINE))
    if not fields or len(fields) != len(set(fields)):
        raise lib.InputError(f"installed guest declaration {name} has invalid fields")
    return fields, match.group(1)


def _discover_agent_fields(root: Path) -> tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]]:
    declaration_path = root / "dist/runtime/guest-types.d.ts"
    if not declaration_path.is_file() or declaration_path.is_symlink():
        raise lib.InputError("installed generated guest declarations are unavailable")
    try:
        text = declaration_path.read_text(encoding="utf-8")
        prefix = "export declare const GUEST_TYPE_DECLARATIONS = "
        start = text.index(prefix) + len(prefix)
        end = text.index(";\nexport interface FabricGuestDeclarationOptions", start)
        declarations = json.loads(text[start:end])
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as exc:
        raise lib.InputError(f"cannot parse installed guest declarations: {exc}") from None
    if not isinstance(declarations, str):
        raise lib.InputError("installed guest declarations are not a string")
    request_fields, request_parent = _interface_fields(declarations, "FabricAgentRequest")
    handle_fields, handle_parent = _interface_fields(declarations, "FabricAgentHandle")
    result_fields, result_parent = _interface_fields(declarations, "FabricAgentResult")
    if request_parent is not None or handle_parent is not None or result_parent != "FabricAgentHandle":
        raise lib.InputError("installed agents.run inheritance surface is unsupported")
    flattened_result = tuple(dict.fromkeys((*handle_fields, *result_fields)))
    required_request = {"task", "runner", "model", "tools", "timeoutMs", "extensions", "recursive", "cwd", "schema"}
    required_result = {"id", "name", "status", "runner", "transport", "cwd", "startedAt", "finishedAt", "turns", "toolCalls", "text", "value", "error", "usage", "logFile"}
    if not required_request.issubset(request_fields) or not required_result.issubset(flattened_result):
        raise lib.ContractError(("installed agents.run request/result surface omits required fields",))
    evidence = (
        "pi-fabric/dist/runtime/guest-types.d.ts:FabricAgentRequest",
        "pi-fabric/dist/runtime/guest-types.d.ts:FabricAgentHandle",
        "pi-fabric/dist/runtime/guest-types.d.ts:FabricAgentResult",
    )
    return request_fields, flattened_result, evidence


class StageStatus(str, Enum):
    BLOCKED = "blocked"
    READY = "ready"
    RUNNING = "running"
    INTERRUPTED = "interrupted"
    COMPLETE = "complete"
    FINALIZED = "finalized"


class ResumeAction(str, Enum):
    RUN = "run"
    SKIP = "skip"
    REFUSE_REPLAY = "refuse-replay"
    DETERMINISTIC_REPAIR_ONLY = "deterministic-repair-only"


@dataclass(frozen=True)
class RuntimeCapabilities:
    pi_version: str
    fabric_version: str
    direct_call_limit: int
    recursive_custom_cwd: bool
    temporary_log_pattern: str
    actor_mesh_default_root: str
    actor_mesh_root_env: str
    output_bounds: tuple[tuple[str, int], ...]
    event_log_bounds: tuple[tuple[str, int], ...]
    supported_agent_request_fields: tuple[str, ...]
    supported_agent_result_fields: tuple[str, ...]
    evidence: tuple[str, ...]

    def document(self, *, max_concurrency: int = 32) -> dict[str, Any]:
        if isinstance(max_concurrency, bool) or not isinstance(max_concurrency, int) or not 1 <= max_concurrency <= 32:
            raise lib.InputError("max_concurrency must be from 1 through 32")
        facts = {
            "pi_version": self.pi_version,
            "fabric_version": self.fabric_version,
            "effective_max_calls": self.direct_call_limit,
            "max_concurrency": max_concurrency,
            "recursive_agents": True,
            "recursive_custom_cwd": self.recursive_custom_cwd,
            "absolute_log_roots": [os.path.abspath(tempfile.gettempdir()) + "/pi-fabric-runs-*"],
            "telemetry_projection_version": TELEMETRY_PROJECTOR_VERSION,
            "actor_mesh_default_root": self.actor_mesh_default_root,
            "actor_mesh_root_env": self.actor_mesh_root_env,
            "temporary_log_pattern": self.temporary_log_pattern,
            "output_bounds": dict(self.output_bounds),
            "event_log_bounds": dict(self.event_log_bounds),
            "supported_agent_request_fields": list(self.supported_agent_request_fields),
            "supported_agent_result_fields": list(self.supported_agent_result_fields),
        }
        capability_id = "runtime-" + lib.sha256_bytes(lib.canonical_json_bytes(facts))[:24]
        return {
            "schema_version": 1,
            "mechanics_version": MECHANICS_VERSION,
            "status": "passed",
            "capability_id": capability_id,
            **facts,
            "evidence": list(self.evidence),
        }


def _package_version(root: Path, name: str) -> str:
    package = lib.load_json(root / "package.json")
    if not isinstance(package, dict) or package.get("name") != name:
        raise lib.InputError(f"{root}/package.json: expected installed package {name!r}")
    version = package.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?", version):
        raise lib.InputError(f"{root}/package.json: invalid package version")
    exports = package.get("exports")
    if name == "pi-fabric" and not isinstance(exports, dict):
        raise lib.InputError("pi-fabric package does not expose a supported exports map")
    return version


def _iter_js(root: Path) -> Iterator[Path]:
    dist = root / "dist"
    if not dist.is_dir() or dist.is_symlink():
        raise lib.InputError(f"{dist}: installed adapter dist directory is unavailable")
    yield from sorted(dist.glob("*.js"), key=lambda p: p.as_posix())
    yield from sorted(dist.glob("chunks/*.js"), key=lambda p: p.as_posix())


def _load_js_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise lib.InputError(f"{path}: cannot inspect installed adapter: {exc}") from None


def _normalize_tmp_root(base: str) -> str:
    base = base.strip()
    if "tmpdir()" in base:
        return re.escape(os.path.abspath(tempfile.gettempdir()))
    literal = base.strip('"\'')
    if not os.path.isabs(literal):
        raise lib.InputError("unable to derive an absolute Fabric temporary run root")
    return re.escape(os.path.abspath(literal))


def _discover_runtime_fabric_contract(root: Path) -> tuple[tuple[int, ...], bool, str, str, str]:
    max_per_execution: list[int] = []
    recursive_guard = False
    run_root_base: str | None = None
    has_event_root = False
    has_event_file = False
    has_mesh_override = False
    has_mesh_default = False
    mesh_default = ".pi/fabric/mesh"
    for path in _iter_js(root):
        text = _load_js_text(path)
        for match in _MAX_PER_EXECUTION_PATTERN.finditer(text):
            value = int(match.group(1))
            if value > 0:
                max_per_execution.append(value)
        recursive_guard = recursive_guard or _RECURSIVE_CWD_GUARD.search(text) is not None
        has_mesh_override = has_mesh_override or _MESH_ROOT_OVERRIDE_PATTERN.search(text) is not None
        has_mesh_default = has_mesh_default or _MESH_ROOT_DEFAULT_PATTERN.search(text) is not None
        has_event_root = has_event_root or _EVENT_ROOT_PATTERN.search(text) is not None
        has_event_file = has_event_file or _EVENT_FILE_PATTERN.search(text) is not None
        match = _RUN_ROOT_PREFIX_PATTERN.search(text)
        if match:
            run_root_base = _normalize_tmp_root(match.group(1))
    if run_root_base is None or not has_event_root or not has_event_file:
        raise lib.InputError("unable to derive the Fabric events.jsonl path shape from installed bytes")
    if not has_mesh_default:
        raise lib.InputError("unable to derive the default actor mesh root from installed bytes")
    if not has_mesh_override:
        raise lib.InputError("unable to derive the actor mesh environment override from installed bytes")
    event_pattern = f"^{run_root_base}/pi-fabric-runs-[^/]+/[^/]+/events\\.jsonl$"
    return (
        tuple(sorted(set(max_per_execution))), recursive_guard, event_pattern,
        mesh_default, "PI_FABRIC_MESH_ROOT",
    )


def doctor_runtime(
    fabric_root: Path,
    pi_root: Path,
    *,
    configured_max_per_execution: int | None = None,
    invocation_agent_budget: int | None = None,
) -> RuntimeCapabilities:
    """Inspect installed bytes and derive the race-free direct-call ceiling."""
    fabric_root = fabric_root.resolve(strict=True)
    pi_root = pi_root.resolve(strict=True)
    fabric_version = _package_version(fabric_root, "pi-fabric")
    pi_version = _package_version(pi_root, "@earendil-works/pi-coding-agent")
    defaults, recursive_cwd_guard, temporary_log_pattern, actor_root_default, mesh_env = _discover_runtime_fabric_contract(fabric_root)
    output_bounds, event_log_bounds, bound_evidence = _discover_runtime_bounds(fabric_root)
    request_fields, result_fields, field_evidence = _discover_agent_fields(fabric_root)
    evidence: list[str] = ["pi-fabric/package.json:version", "pi-coding-agent/package.json:version", *bound_evidence, *field_evidence]
    if not defaults:
        raise lib.InputError("unable to discover a positive maxPerExecution from installed bytes")
    installed_default = min(defaults)
    if not recursive_cwd_guard:
        raise lib.ContractError(("installed adapter recursive/custom-cwd guard was not found",))
    evidence_patterns = (
        ("maxPerExecution", _MAX_PER_EXECUTION_PATTERN),
        ("recursive-cwd-guard", _RECURSIVE_CWD_GUARD),
        ("temporary-run-root", _RUN_ROOT_PREFIX_PATTERN),
        ("agent-run-directory", _EVENT_ROOT_PATTERN),
        ("events-file", _EVENT_FILE_PATTERN),
        ("actor-mesh-default", _MESH_ROOT_DEFAULT_PATTERN),
        ("actor-mesh-env", _MESH_ROOT_OVERRIDE_PATTERN),
    )
    for path in _iter_js(fabric_root):
        text = _load_js_text(path)
        relative = path.relative_to(fabric_root).as_posix()
        for label, pattern in evidence_patterns:
            if pattern.search(text):
                evidence.append(f"pi-fabric/{relative}:{label}")
    evidence.append(f"temporary_log_pattern:{temporary_log_pattern}")
    evidence.append(f"actor_mesh_default:{actor_root_default}")
    evidence.append(f"actor_mesh_env:{mesh_env}")
    ceilings = [DEFAULT_DIRECT_CALL_LIMIT, installed_default]
    for name, value in (
        ("configured_max_per_execution", configured_max_per_execution),
        ("invocation_agent_budget", invocation_agent_budget),
    ):
        if value is not None:
            if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                raise lib.InputError(f"{name}: expected a positive integer")
            ceilings.append(value)
    return RuntimeCapabilities(
        pi_version=pi_version,
        fabric_version=fabric_version,
        direct_call_limit=min(ceilings),
        recursive_custom_cwd=not recursive_cwd_guard,
        temporary_log_pattern=temporary_log_pattern,
        actor_mesh_default_root=actor_root_default,
        actor_mesh_root_env=mesh_env,
        output_bounds=tuple(output_bounds.items()),
        event_log_bounds=tuple(event_log_bounds.items()),
        supported_agent_request_fields=request_fields,
        supported_agent_result_fields=result_fields,
        evidence=tuple(sorted(set(evidence))),
    )


class DirectCallLimiter:
    """Race-free synchronous reservation primitive for one invocation."""

    def __init__(self, limit: int = DEFAULT_DIRECT_CALL_LIMIT):
        if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
            raise lib.InputError("direct call limit must be a positive integer")
        self.limit = limit
        self.used = 0

    def reserve(self, count: int = 1) -> int:
        if isinstance(count, bool) or not isinstance(count, int) or count < 1:
            raise lib.InputError("reservation count must be a positive integer")
        if self.used + count > self.limit:
            raise lib.ContractError((
                f"direct call {self.used + 1} would exceed effective per-invocation limit {self.limit}",
            ))
        first = self.used + 1
        self.used += count
        return first


def make_call_plan(
    *, benchmark_id: str, stage: str, call_ids: Sequence[str],
    max_concurrency: int, limit: int = DEFAULT_DIRECT_CALL_LIMIT,
    declared_descendant_calls: int = 0,
    predecessor_checkpoint_path: str | None = None,
    effective_call_cap: int | None = None,
) -> dict[str, Any]:
    """Create one workflow-compatible, digest-stable stage call plan."""
    if stage not in {"execute", "judge", "adjudicate", "audit"}:
        raise lib.InputError("stage is not call-bearing")
    if not isinstance(benchmark_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", benchmark_id):
        raise lib.InputError("invalid benchmark_id")
    if isinstance(call_ids, (str, bytes)) or not isinstance(call_ids, Sequence):
        raise lib.InputError("call_ids must be a sequence of IDs")
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
        raise lib.InputError("limit must be a positive integer")
    ids = list(call_ids)
    if len(ids) != len(set(ids)) or any(not isinstance(item, str) or re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", item) is None for item in ids):
        raise lib.InputError("call_ids must be unique safe IDs")
    if not ids:
        raise lib.InputError("call_ids must contain at least one ID")
    if isinstance(max_concurrency, bool) or not isinstance(max_concurrency, int) or not 1 <= max_concurrency <= 32:
        raise lib.InputError("max_concurrency must be from 1 through 32")
    if isinstance(declared_descendant_calls, bool) or not isinstance(declared_descendant_calls, int) or declared_descendant_calls < 0:
        raise lib.InputError("declared_descendant_calls must be a non-negative integer")
    cap = limit
    if effective_call_cap is not None:
        if isinstance(effective_call_cap, bool) or not isinstance(effective_call_cap, int) or effective_call_cap < 1:
            raise lib.InputError("effective_call_cap must be a positive integer")
        cap = min(cap, effective_call_cap)
    if len(ids) + declared_descendant_calls > cap:
        raise lib.ContractError((
            f"stage plan reserved calls {len(ids) + declared_descendant_calls} would exceed effective call cap {cap}",
        ))
    if predecessor_checkpoint_path is not None:
        predecessor_checkpoint_path = lib.safe_relative_path(predecessor_checkpoint_path, "predecessor_checkpoint_path")
    identity = {
        "benchmark_id": benchmark_id, "stage": stage, "call_ids": ids,
        "max_calls": len(ids), "max_concurrency": max_concurrency,
        "reserved_descendant_calls": declared_descendant_calls,
        "reserved_calls": len(ids) + declared_descendant_calls,
        "predecessor_checkpoint_path": predecessor_checkpoint_path,
    }
    return {
        "schema_version": 1,
        "plan_id": "calls-" + lib.sha256_bytes(lib.canonical_json_bytes(identity))[:24],
        **identity,
    }


def _partition_reserved_counts(direct: int, descendants: int, cap: int) -> list[tuple[int, int]]:
    """Partition direct and descendant reservations with one direct call per batch."""
    if direct == 0:
        if descendants:
            raise lib.ContractError(("descendant calls cannot be reserved without a direct parent call",))
        return []
    batch_count = (direct + descendants + cap - 1) // cap
    if batch_count > direct:
        raise lib.ContractError((
            "declared descendants cannot be safely partitioned across direct-call invocations",
        ))
    direct_counts: list[int] = []
    remaining_direct = direct
    for index in range(batch_count):
        batches_after = batch_count - index - 1
        count = min(cap, remaining_direct - batches_after)
        direct_counts.append(count)
        remaining_direct -= count
    remaining_descendants = descendants
    result: list[tuple[int, int]] = []
    for count in direct_counts:
        reserved = min(cap - count, remaining_descendants)
        result.append((count, reserved))
        remaining_descendants -= reserved
    if remaining_descendants:
        raise lib.ContractError(("descendant call reservation partition is incomplete",))
    return result


def partition_call_ids(
    *, benchmark_id: str, stage: str, call_ids: Sequence[str],
    max_concurrency: int, limit: int = DEFAULT_DIRECT_CALL_LIMIT,
    declared_descendant_calls: int = 0,
    effective_call_cap: int | None = None,
) -> list[dict[str, Any]]:
    """Partition an ordered stage list without reordering or dropping IDs."""
    if isinstance(call_ids, (str, bytes)) or not isinstance(call_ids, Sequence):
        raise lib.InputError("call_ids must be a sequence of IDs")
    ids = list(call_ids)
    if len(ids) != len(set(ids)) or any(not isinstance(item, str) or re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", item) is None for item in ids):
        raise lib.InputError("call_ids must be unique safe IDs")
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
        raise lib.InputError("limit must be a positive integer")
    if isinstance(declared_descendant_calls, bool) or not isinstance(declared_descendant_calls, int) or declared_descendant_calls < 0:
        raise lib.InputError("declared_descendant_calls must be a non-negative integer")
    cap = limit
    if effective_call_cap is not None:
        if isinstance(effective_call_cap, bool) or not isinstance(effective_call_cap, int) or effective_call_cap < 1:
            raise lib.InputError("effective_call_cap must be a positive integer")
        cap = min(cap, effective_call_cap)
    plans: list[dict[str, Any]] = []
    predecessor = None
    offset = 0
    for direct_count, descendant_count in _partition_reserved_counts(len(ids), declared_descendant_calls, cap):
        chunk = ids[offset:offset + direct_count]
        offset += direct_count
        plan = make_call_plan(
            benchmark_id=benchmark_id, stage=stage, call_ids=chunk,
            max_concurrency=max_concurrency, limit=cap,
            declared_descendant_calls=descendant_count,
            effective_call_cap=cap,
            predecessor_checkpoint_path=predecessor,
        )
        plans.append(plan)
        predecessor = f"checkpoints/{plan['plan_id']}/receipt.json"
    return plans


def plan_stage_calls(
    counts: Mapping[str, int],
    declared_descendant_calls: Mapping[str, int] | None = None,
    limit: int = DEFAULT_DIRECT_CALL_LIMIT,
) -> dict[str, Any]:
    """Partition traffic by semantic stage and then by the effective call cap."""
    declared_descendant_calls = declared_descendant_calls or {}
    if not isinstance(counts, Mapping) or not isinstance(declared_descendant_calls, Mapping):
        raise lib.InputError("counts and declared_descendant_calls must be mappings")
    unknown = sorted((str(key) for key in set(counts) - set(_ALLOWED_TRAFFIC)))
    if unknown:
        raise lib.InputError("unknown traffic stages: " + ", ".join(unknown))
    for key in declared_descendant_calls:
        if key not in _ALLOWED_TRAFFIC:
            raise lib.InputError(f"unknown declared descendant stage: {key}")
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
        raise lib.InputError("limit must be a positive integer")
    invocations: list[dict[str, Any]] = []
    ordinal = 0
    for stage in _ALLOWED_TRAFFIC:
        count = counts.get(stage, 0)
        descendants = declared_descendant_calls.get(stage, 0)
        if isinstance(count, bool) or not isinstance(count, int) or count < 0:
            raise lib.InputError(f"{stage}: call count must be a non-negative integer")
        if isinstance(descendants, bool) or not isinstance(descendants, int) or descendants < 0:
            raise lib.InputError(f"declared_descendant_calls[{stage}]: expected a non-negative integer")
        offset = 0
        for size, reserved_descendants in _partition_reserved_counts(count, descendants, limit):
            ordinal += 1
            invocations.append({
                "invocation": ordinal,
                "stage": stage,
                "call_offset": offset,
                "call_count": size,
                "reserved_descendant_calls": reserved_descendants,
                "reserved_calls": size + reserved_descendants,
                "limit": limit,
            })
            offset += size
    return {
        "schema_version": 1,
        "planner_version": MECHANICS_VERSION,
        "effective_direct_call_limit": limit,
        "total_calls": sum(counts.values()),
        "total_reserved_calls": sum(counts.values()) + sum(declared_descendant_calls.values()),
        "declared_descendant_calls": dict(declared_descendant_calls),
        "invocations": invocations,
    }


def recursive_attempt_request(
    *, prompt: str, project_root: Path, condition_package: Path, workspace: Path,
    model: str | None = None,
) -> dict[str, Any]:
    """Build a recursive request without the unsupported custom-cwd field."""
    project = project_root.resolve(strict=True)
    package = condition_package.resolve(strict=True)
    output = workspace.resolve(strict=True)
    for name, path in (("condition_package", package), ("workspace", output)):
        if path == project or project not in path.parents:
            raise lib.InputError(f"{name} must resolve below project_root")
    request: dict[str, Any] = {
        "prompt": prompt,
        "recursive": True,
        "context": {
            "project_root": str(project),
            "condition_package": str(package),
            "output_workspace": str(output),
        },
    }
    if model is not None:
        request["model"] = model
    return request


def _secure_mkdirs(root: Path, parent: PurePosixPath) -> Path:
    current = root
    for part in parent.parts:
        current = current / part
        try:
            current.mkdir(mode=0o700)
        except FileExistsError:
            pass
        info = current.lstat()
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
            raise lib.UnsafePathError(f"artifact parent {current} is not a real directory")
    return current


def publish_stream_create_only(
    root: Path, relative: str, chunks: Iterable[bytes], *, mode: int = 0o600,
) -> dict[str, Any]:
    """Stream bytes into a private temp file and publish by non-replacing link."""
    relative = lib.safe_relative_path(relative, "artifact path")
    root = lib.assert_no_symlink_components(root, field="artifact root")
    if not root.is_dir() or root.is_symlink():
        raise lib.InputError("artifact root must be a real existing directory")
    pure = PurePosixPath(relative)
    parent = _secure_mkdirs(root, pure.parent)
    destination = parent / pure.name
    if destination.exists() or destination.is_symlink():
        raise lib.InputError(f"{destination}: destination already exists")
    token = secrets.token_hex(12)
    temporary = parent / f".{destination.name}.tmp-{os.getpid()}-{token}"
    digest = hashlib.sha256()
    length = 0
    descriptor = None
    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_CLOEXEC", 0), mode)
        for chunk in chunks:
            if not isinstance(chunk, bytes):
                raise lib.InputError("artifact stream yielded a non-bytes chunk")
            digest.update(chunk)
            length += len(chunk)
            view = memoryview(chunk)
            while view:
                written = os.write(descriptor, view)
                if written <= 0:
                    raise OSError("short write")
                view = view[written:]
        os.fsync(descriptor)
        os.close(descriptor)
        descriptor = None
        os.link(temporary, destination, follow_symlinks=False)
        try:
            directory_fd = os.open(parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        except OSError:
            pass
    except FileExistsError:
        raise lib.InputError(f"{destination}: destination already exists") from None
    except lib.BenchmarkError:
        raise
    except OSError as exc:
        raise lib.InputError(f"{destination}: streamed create-only publication failed: {exc}") from None
    finally:
        if descriptor is not None:
            os.close(descriptor)
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass
    return {"path": relative, "bytes": length, "sha256": digest.hexdigest(), "mode": mode}


def archive_fabric_event_log(
    source: Path,
    root: Path,
    relative: str,
    *,
    temporary_log_pattern: str | re.Pattern[str] | None = None,
) -> dict[str, Any]:
    """Safely archive an exact Fabric event log without buffering it."""
    compiled: re.Pattern[str]
    if temporary_log_pattern is None:
        compiled = _TMP_LOG_FALLBACK
    elif isinstance(temporary_log_pattern, re.Pattern):
        compiled = temporary_log_pattern
    else:
        try:
            compiled = re.compile(temporary_log_pattern)
        except re.error as exc:
            raise lib.InputError(f"invalid temporary_log_pattern: {exc}") from None
    source_text = os.path.abspath(os.fspath(source))
    if compiled.fullmatch(source_text) is None:
        raise lib.UnsafePathError(f"source must match {compiled.pattern!r}")
    lib.assert_no_symlink_components(source_text, field="Fabric event log source")
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0)
    try:
        descriptor = os.open(source_text, flags)
    except OSError as exc:
        raise lib.InputError(f"{source_text}: cannot open Fabric event log: {exc}") from None
    try:
        before = os.fstat(descriptor)
        if not stat.S_ISREG(before.st_mode):
            raise lib.InputError("Fabric event log source is not a regular file")

        def chunks() -> Iterator[bytes]:
            while True:
                chunk = os.read(descriptor, 1024 * 1024)
                if not chunk:
                    break
                yield chunk
            stable = os.fstat(descriptor)
            before_identity = (
                before.st_dev, before.st_ino, before.st_size,
                before.st_mtime_ns, before.st_ctime_ns,
            )
            stable_identity = (
                stable.st_dev, stable.st_ino, stable.st_size,
                stable.st_mtime_ns, stable.st_ctime_ns,
            )
            if before_identity != stable_identity:
                raise lib.InputError("Fabric event log changed while it was archived")

        receipt = publish_stream_create_only(root, relative, chunks())
        if receipt["bytes"] != before.st_size:
            raise lib.InputError("Fabric event log archive length does not match source")
        return {**receipt, "source_kind": "pi-fabric-events-jsonl"}
    finally:
        os.close(descriptor)


def _walk(value: Any) -> Iterator[Any]:
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from _walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk(child)


def scan_event_log(
    path: Path,
    *,
    allowed_roots: Sequence[Path] = (),
    max_line_bytes: int = 16 * 1024 * 1024,
) -> dict[str, Any]:
    """Scan JSONL incrementally and emit compact mechanism/access evidence."""
    if isinstance(max_line_bytes, bool) or not isinstance(max_line_bytes, int) or max_line_bytes < 1:
        raise lib.InputError("max_line_bytes must be a positive integer")
    allowed = tuple(os.path.abspath(os.fspath(item)) for item in allowed_roots)
    digest = hashlib.sha256()
    events = 0
    actor_create = 0
    actor_terminal = 0
    actor_cleanup = 0
    child_ids: set[str] = set()
    forbidden: set[str] = set()
    source_bytes = 0
    try:
        handle = path.open("rb")
    except OSError as exc:
        raise lib.InputError(f"{path}: cannot read event log: {exc}") from None
    with handle:
        for number, line in enumerate(handle, 1):
            digest.update(line)
            source_bytes += len(line)
            if len(line) > max_line_bytes:
                raise lib.InputError(f"{path}:{number}: JSONL line exceeds {max_line_bytes} bytes")
            if not line.endswith(b"\n") or b"\r" in line or not line.strip():
                raise lib.InputError(f"{path}:{number}: invalid LF-delimited JSONL")
            value = lib.parse_json_bytes(line[:-1], f"{path}:{number}")
            events += 1
            for node in _walk(value):
                if not isinstance(node, dict):
                    continue
                words = " ".join(str(node.get(key, "")) for key in ("event", "event_type", "type", "tool", "name", "status", "action")).lower()
                if "actor" in words and any(term in words for term in ("create", "spawn")):
                    actor_create += 1
                if "actor" in words and any(term in words for term in ("terminal", "settled", "complete")):
                    actor_terminal += 1
                if "actor" in words and any(term in words for term in ("cleanup", "delete", "remove", "stop")):
                    actor_cleanup += 1
                for key in ("child_id", "childId", "agent_id", "agentId"):
                    identity = node.get(key)
                    if isinstance(identity, str) and identity:
                        child_ids.add(identity)
                if any(term in words for term in ("read", "write", "edit", "grep", "find", "tool")):
                    for key in ("path", "file", "cwd"):
                        candidate = node.get(key)
                        if isinstance(candidate, str) and os.path.isabs(candidate):
                            absolute = os.path.abspath(candidate)
                            if allowed and not any(absolute == root or absolute.startswith(root + os.sep) for root in allowed):
                                forbidden.add(absolute)
    return {
        "schema_version": 1,
        "scanner_version": MECHANICS_VERSION,
        "source_sha256": digest.hexdigest(),
        "source_bytes": source_bytes,
        "event_count": events,
        "flags": {
            "actor_create": actor_create > 0,
            "actor_terminal": actor_terminal > 0,
            "actor_cleanup": actor_cleanup > 0,
        },
        "counts": {
            "actor_create": actor_create,
            "actor_terminal": actor_terminal,
            "actor_cleanup": actor_cleanup,
        },
        "child_ids": sorted(child_ids),
        "forbidden_paths": sorted(forbidden),
    }


def project_fabric_telemetry(result: Mapping[str, Any], *, version: str = TELEMETRY_PROJECTOR_VERSION) -> dict[str, Any]:
    """Project Fabric usage while retaining exact native values and cache semantics."""
    if version not in {"fabric-usage-v1", TELEMETRY_PROJECTOR_VERSION}:
        raise lib.InputError(f"unsupported telemetry projector version {version!r}")
    usage = result.get("usage")
    if not isinstance(usage, Mapping):
        usage = {}
    native = {key: usage.get(key) for key in ("input", "output", "cacheRead", "cacheWrite", "cost")}
    for key, value in native.items():
        if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0):
            raise lib.InputError(f"Fabric usage {key} must be a non-negative number or null")
    input_value = native["input"]
    if version == TELEMETRY_PROJECTOR_VERSION and input_value is not None:
        # Fabric's normalized input counter excludes separately reported cache
        # categories in the affected adapter.  The strict projection is total input.
        input_value = input_value + (native["cacheRead"] or 0) + (native["cacheWrite"] or 0)
    return {
        "schema_version": 1,
        "projector_version": version,
        "source": "FabricAgentResult.usage",
        "source_result_id": result.get("id"),
        "input_tokens": input_value,
        "output_tokens": native["output"],
        "cache_read_tokens": native["cacheRead"],
        "cache_write_tokens": native["cacheWrite"],
        "cost": native["cost"],
        "cost_unit": "fabric-native-unknown",
        "provider_native": native,
    }


def revision_seal_plan(
    *, seal_type: str, revisions: Sequence[Mapping[str, Any]], new_revision: str,
    changed_paths: Sequence[str], receipt_name: str = "receipt.json",
) -> dict[str, Any]:
    """Plan a delta seal chain without recursively copying prior seal trees."""
    if seal_type not in {"design", "execution", "raw-freeze", "postscore", "analysis"}:
        raise lib.InputError("unsupported seal_type")
    if not re.fullmatch(r"[a-z][a-z0-9-]*-v[1-9][0-9]*", new_revision):
        raise lib.InputError("new_revision must end in a positive -vN suffix")
    checked_receipt = lib.safe_relative_path(receipt_name, "receipt_name")
    if "/" in checked_receipt:
        raise lib.InputError("receipt_name must be a basename")
    receipt_name = checked_receipt
    chain: list[dict[str, str]] = []
    seen: set[str] = set()
    previous: str | None = None
    for index, item in enumerate(revisions):
        revision = item.get("revision")
        digest = item.get("manifest_sha256")
        if not isinstance(revision, str) or revision in seen or not isinstance(digest, str) or _SHA256.fullmatch(digest) is None:
            raise lib.InputError(f"revisions[{index}]: invalid or duplicate revision/digest")
        if item.get("previous_revision") != previous:
            raise lib.InputError(f"revisions[{index}]: broken delta chain")
        seen.add(revision)
        chain.append({"revision": revision, "manifest_sha256": digest})
        previous = revision
    paths = sorted({lib.safe_relative_path(path, "changed_paths") for path in changed_paths})
    if not paths:
        raise lib.InputError("delta revision requires at least one changed path")
    if new_revision in seen:
        raise lib.InputError("new revision already exists")
    return {
        "schema_version": 1,
        "planner_version": MECHANICS_VERSION,
        "seal_type": seal_type,
        "revision": new_revision,
        "previous_revision": previous,
        "delta_paths": paths,
        "prior_manifests": chain,
        "seal_directory": f"seals/{new_revision}",
        "manifest_basename": "manifest.json",
        "receipt_basename": receipt_name,
        "copy_prior_seal_trees": False,
    }


def plan_resume(rows: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Classify immutable row state without guessing from process visibility."""
    actions: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, Mapping):
            raise lib.InputError(f"rows[{index}]: expected an object")
        attempt_id = row.get("attempt_id")
        if not isinstance(attempt_id, str) or not attempt_id or attempt_id in seen:
            raise lib.InputError(f"rows[{index}]: invalid or duplicate attempt_id")
        seen.add(attempt_id)
        assignment = row.get("assignment")
        terminal = row.get("terminal")
        if not isinstance(assignment, bool):
            raise lib.InputError(f"rows[{index}].assignment: expected boolean")
        if terminal not in {None, "valid", "malformed", "repairable"}:
            raise lib.InputError(f"rows[{index}].terminal: invalid state")
        if terminal is not None and not assignment:
            action, reason = ResumeAction.REFUSE_REPLAY, "terminal without assignment is a lifecycle contradiction"
        elif terminal == "valid":
            action, reason = ResumeAction.SKIP, "valid immutable terminal"
        elif terminal in {"malformed", "repairable"}:
            action, reason = (
                ResumeAction.DETERMINISTIC_REPAIR_ONLY,
                "terminal projection requires deterministic repair from immutable evidence; model replay forbidden",
            )
        elif assignment:
            action, reason = ResumeAction.REFUSE_REPLAY, "assigned without terminal is ambiguous"
        else:
            action, reason = ResumeAction.RUN, "never assigned"
        actions.append({"attempt_id": attempt_id, "action": action.value, "reason": reason})
    blocked = [item["attempt_id"] for item in actions if item["action"] == ResumeAction.REFUSE_REPLAY.value]
    repairs = [
        item["attempt_id"] for item in actions
        if item["action"] == ResumeAction.DETERMINISTIC_REPAIR_ONLY.value
    ]
    return {
        "schema_version": 1,
        "planner_version": MECHANICS_VERSION,
        "status": StageStatus.BLOCKED.value if blocked else StageStatus.READY.value,
        "actions": actions,
        "runnable_attempt_ids": [item["attempt_id"] for item in actions if item["action"] == ResumeAction.RUN.value],
        "skipped_attempt_ids": [item["attempt_id"] for item in actions if item["action"] == ResumeAction.SKIP.value],
        "deterministic_repair_only_attempt_ids": repairs,
        "blocked_attempt_ids": blocked,
    }


def plan_transaction(stages: Mapping[str, str]) -> dict[str, Any]:
    """Plan Analyze/judge/adjudicate/finalize as receipt-gated transactions."""
    unknown = sorted(set(stages) - set(_STAGE_ORDER))
    if unknown:
        raise lib.InputError("unknown transaction stages: " + ", ".join(unknown))
    normalized: dict[str, StageStatus] = {}
    for name in _STAGE_ORDER:
        raw = stages.get(name, StageStatus.BLOCKED.value)
        try:
            normalized[name] = StageStatus(raw)
        except ValueError:
            raise lib.InputError(f"{name}: invalid typed status {raw!r}") from None
    plan: list[dict[str, Any]] = []
    prior_complete = True
    for name in _STAGE_ORDER:
        status = normalized[name]
        eligible = prior_complete and status in {StageStatus.READY, StageStatus.COMPLETE, StageStatus.FINALIZED}
        plan.append({"stage": name, "status": status.value, "eligible": eligible})
        prior_complete = prior_complete and status in {StageStatus.COMPLETE, StageStatus.FINALIZED}
    finalize = normalized["finalize"]
    can_finalize = all(normalized[name] == StageStatus.COMPLETE for name in _STAGE_ORDER[:-1]) and finalize == StageStatus.READY
    already_finalized = all(normalized[name] == StageStatus.COMPLETE for name in _STAGE_ORDER[:-1]) and finalize == StageStatus.FINALIZED
    return {
        "schema_version": 1,
        "planner_version": MECHANICS_VERSION,
        "stages": plan,
        "can_finalize": can_finalize,
        "status": StageStatus.FINALIZED.value if already_finalized else (StageStatus.READY.value if can_finalize else StageStatus.BLOCKED.value),
    }


def check_protected_state_compatibility(
    *, recursive: bool, cwd: str | None, project_root: Path,
    protected_relative: Sequence[str], actor_state_root: Path | None,
    capability_id: str | None = None,
) -> dict[str, Any]:
    """Reject launcher/runtime combinations that necessarily touch protected state."""
    conflicts: list[str] = []
    if not isinstance(recursive, bool):
        raise lib.InputError("recursive must be a boolean")
    if cwd is not None and not isinstance(cwd, str):
        raise lib.InputError("cwd must be a string or null")
    project = project_root.resolve(strict=True)
    if capability_id is None:
        capability_id = "runtime-unknown"
    elif not isinstance(capability_id, str) or not capability_id:
        raise lib.InputError("capability_id must be a non-empty string or null")
    if recursive and cwd is not None:
        conflicts.append("recursive Fabric agents cannot use custom cwd")
    protected_abs: list[str] = []
    for item in protected_relative:
        if not isinstance(item, str):
            raise lib.InputError("protected_relative entries must be strings")
        relative = lib.safe_relative_path(item, "protected_relative")
        resolved = (project / PurePosixPath(relative)).resolve()
        if resolved == project:
            raise lib.InputError(f"protected_relative {item!r} cannot resolve to project root")
        protected_abs.append(resolved.as_posix())
    actor = actor_state_root.resolve(strict=False).as_posix() if actor_state_root is not None else None
    for target in protected_abs:
        actor_path = Path(actor) if actor is not None else None
        protected_path = Path(target)
        if actor_path is not None and (actor_path == protected_path or actor_path in protected_path.parents or protected_path in actor_path.parents):
            conflicts.append(f"actor runtime state conflicts with protected {target}")
    return {
        "schema_version": 1,
        "status": "incompatible" if conflicts else "compatible",
        "capability_id": capability_id,
        "project_root": project.as_posix(),
        "protected_absolute_roots": sorted(set(protected_abs)),
        "actor_state_root": actor,
        "conflicts": sorted(set(conflicts)),
        "required_request_cwd": None if recursive else cwd,
    }


def _budget_decimal(value: str | int | float, field: str) -> Decimal:
    if isinstance(value, bool):
        raise lib.InputError(f"{field}: expected a finite non-negative decimal")
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise lib.InputError(f"{field}: expected a finite non-negative decimal") from None
    if not parsed.is_finite() or parsed < 0:
        raise lib.InputError(f"{field}: expected a finite non-negative decimal")
    return Decimal(0) if parsed == 0 else parsed


def reserve_launch_budget(
    rows: Sequence[Mapping[str, Any]], *, maximum_calls: int,
    maximum_cost: str | int | float, cost_unit: str = "fabric-native-unknown",
) -> dict[str, Any]:
    """Reserve direct, declared descendant, and projected cost before launch."""
    if isinstance(maximum_calls, bool) or not isinstance(maximum_calls, int) or maximum_calls < 1:
        raise lib.InputError("maximum_calls must be a positive integer")
    if not isinstance(cost_unit, str) or not cost_unit:
        raise lib.InputError("cost_unit must be a non-empty string")
    cost_ceiling = _budget_decimal(maximum_cost, "maximum_cost")
    if not rows:
        raise lib.InputError("at least one launch reservation is required")
    seen: set[str] = set()
    reservations: list[dict[str, Any]] = []
    direct_total = 0
    descendant_total = 0
    cost_total = Decimal(0)
    for index, row in enumerate(rows):
        if not isinstance(row, Mapping):
            raise lib.InputError(f"rows[{index}]: expected an object")
        reservation_id = row.get("reservation_id")
        traffic = row.get("traffic")
        direct = row.get("direct_calls")
        descendants = row.get("declared_descendant_calls")
        if not isinstance(reservation_id, str) or re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", reservation_id) is None:
            raise lib.InputError(f"rows[{index}].reservation_id: invalid safe ID")
        if reservation_id in seen:
            raise lib.ContractError((f"duplicate budget reservation_id {reservation_id!r}",))
        seen.add(reservation_id)
        if traffic not in _ALLOWED_TRAFFIC:
            raise lib.InputError(f"rows[{index}].traffic: invalid traffic class")
        for name, value in (("direct_calls", direct), ("declared_descendant_calls", descendants)):
            if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                raise lib.InputError(f"rows[{index}].{name}: expected a non-negative integer")
        if direct < 1:
            raise lib.InputError(f"rows[{index}]: reservation must include a direct parent call")
        projected = _budget_decimal(row.get("projected_cost"), f"rows[{index}].projected_cost")
        reserved_calls = direct + descendants
        direct_total += direct
        descendant_total += descendants
        cost_total += projected
        reservations.append({
            "reservation_id": reservation_id,
            "traffic": traffic,
            "direct_calls": direct,
            "declared_descendant_calls": descendants,
            "reserved_calls": reserved_calls,
            "projected_cost": format(projected, "f"),
        })
    reserved_total = direct_total + descendant_total
    issues: list[str] = []
    if reserved_total > maximum_calls:
        issues.append(
            f"reserved direct plus descendant calls {reserved_total} exceed maximum_calls {maximum_calls}"
        )
    if cost_total > cost_ceiling:
        issues.append(
            f"reserved projected cost {format(cost_total, 'f')} exceeds maximum_cost {format(cost_ceiling, 'f')}"
        )
    if issues:
        raise lib.ContractError(tuple(issues))
    identity = {
        "maximum_calls": maximum_calls,
        "maximum_cost": format(cost_ceiling, "f"),
        "cost_unit": cost_unit,
        "reservations": reservations,
    }
    return {
        "schema_version": 1,
        "ledger_version": MECHANICS_VERSION,
        "budget_id": "budget-" + lib.sha256_bytes(lib.canonical_json_bytes(identity))[:24],
        "status": "reserved",
        "launch_allowed": True,
        **identity,
        "reserved_direct_calls": direct_total,
        "reserved_descendant_calls": descendant_total,
        "reserved_calls": reserved_total,
        "reserved_cost": format(cost_total, "f"),
        "remaining_calls": maximum_calls - reserved_total,
        "remaining_cost": format(cost_ceiling - cost_total, "f"),
    }


def reserve_budget(
    rows: Sequence[Mapping[str, Any]], *, maximum_calls: int,
    maximum_cost: str | int | float, cost_unit: str = "fabric-native-unknown",
) -> dict[str, Any]:
    """Compatibility alias for launch-time global budget reservation."""
    return reserve_launch_budget(
        rows, maximum_calls=maximum_calls, maximum_cost=maximum_cost,
        cost_unit=cost_unit,
    )


def global_run_cost_ledger(
    rows: Sequence[Mapping[str, Any]], *, maximum_cost: str | int | float | None = None,
) -> dict[str, Any]:
    """Reconcile globally unique run IDs and source-qualified projected/observed cost."""
    issues: list[str] = []
    owners: dict[str, str] = {}
    totals = {"projected": Decimal(0), "observed": Decimal(0)}
    unknown = {"projected": 0, "observed": 0}
    by_traffic: dict[str, dict[str, Decimal | int]] = {}
    for index, row in enumerate(rows):
        run_id = row.get("run_id")
        owner = row.get("owner_id")
        traffic = row.get("traffic")
        if not isinstance(run_id, str) or not run_id or not isinstance(owner, str) or not owner:
            issues.append(f"rows[{index}]: run_id and owner_id are required")
            continue
        if traffic not in _ALLOWED_TRAFFIC:
            issues.append(f"rows[{index}]: invalid traffic class")
            continue
        prior = owners.get(run_id)
        if prior is not None:
            if prior != owner:
                issues.append(f"rows[{index}]: duplicate global run_id {run_id!r}")
            else:
                issues.append(f"rows[{index}]: duplicate global run_id {run_id!r}")
        owners[run_id] = owner
        target = by_traffic.setdefault(traffic, {"count": 0, "projected": Decimal(0), "observed": Decimal(0), "projected_unknown": 0, "observed_unknown": 0})
        target["count"] = int(target["count"]) + 1
        for kind in ("projected", "observed"):
            raw = row.get(f"{kind}_cost")
            if raw is None:
                unknown[kind] += 1
                target[f"{kind}_unknown"] = int(target[f"{kind}_unknown"]) + 1
                continue
            try:
                value = Decimal(str(raw))
            except (InvalidOperation, ValueError):
                issues.append(f"rows[{index}].{kind}_cost: invalid decimal")
                continue
            if not value.is_finite() or value < 0:
                issues.append(f"rows[{index}].{kind}_cost: expected finite non-negative cost")
                continue
            totals[kind] += value
            target[kind] = Decimal(target[kind]) + value
    ceiling = None
    if maximum_cost is not None:
        try:
            ceiling = Decimal(str(maximum_cost))
        except InvalidOperation:
            raise lib.InputError("maximum_cost is not a decimal") from None
        if not ceiling.is_finite() or ceiling < 0:
            raise lib.InputError("maximum_cost must be finite and non-negative")
        if totals["projected"] > ceiling:
            issues.append("projected global cost exceeds maximum")
    if issues:
        raise lib.ContractError(tuple(sorted(set(issues))))
    def number(value: Decimal) -> str:
        return format(value, "f")
    return {
        "schema_version": 1,
        "ledger_version": MECHANICS_VERSION,
        "run_count": len(rows),
        "globally_unique_run_ids": True,
        "totals": {kind: {"known": number(totals[kind]), "unknown_count": unknown[kind]} for kind in totals},
        "by_traffic": {
            key: {
                "count": value["count"],
                "projected_known": number(Decimal(value["projected"])),
                "projected_unknown_count": value["projected_unknown"],
                "observed_known": number(Decimal(value["observed"])),
                "observed_unknown_count": value["observed_unknown"],
            }
            for key, value in sorted(by_traffic.items())
        },
        "maximum_cost": None if ceiling is None else number(ceiling),
        "within_projected_budget": (
            None if ceiling is not None and unknown["projected"] else
            (ceiling is None or totals["projected"] <= ceiling)
        ),
    }


def _default_fabric_root() -> Path:
    return Path(__file__).resolve().parents[3] / "npm/node_modules/pi-fabric"


def _default_pi_root() -> Path | None:
    executable = shutil.which("pi")
    if executable is None:
        return None
    resolved = Path(executable).resolve()
    for parent in resolved.parents:
        package_path = parent / "package.json"
        if not package_path.is_file():
            continue
        try:
            package = lib.load_json(package_path)
        except lib.BenchmarkError:
            continue
        if isinstance(package, dict) and package.get("name") == "@earendil-works/pi-coding-agent":
            return parent
    return None


def _add_output(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--output", type=Path, help="create-only JSON output (default: stdout)")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    doctor = commands.add_parser("doctor", help="inspect installed Pi and Pi Fabric bytes")
    doctor.add_argument("--fabric-root", type=Path, default=_default_fabric_root())
    doctor.add_argument("--pi-root", type=Path, default=_default_pi_root())
    doctor.add_argument("--configured-max-per-execution", type=int)
    doctor.add_argument("--invocation-agent-budget", type=int)
    doctor.add_argument("--max-concurrency", type=int, default=32)
    _add_output(doctor)

    plan = commands.add_parser("plan", help="create a bounded call plan or traffic partition")
    plan.add_argument("--input", required=True, type=Path, help="JSON planning request")
    plan.add_argument("--limit", type=int)
    _add_output(plan)

    protect = commands.add_parser("protect", help="check recursive launch against protected state")
    protect.add_argument("--input", required=True, type=Path, help="JSON protected-state request")
    _add_output(protect)

    archive = commands.add_parser("archive", help="archive one Fabric events.jsonl create-only")
    archive.add_argument("--source", required=True, type=Path)
    archive.add_argument("--root", required=True, type=Path)
    archive.add_argument("--relative", required=True)
    archive.add_argument("--temporary-log-pattern")
    _add_output(archive)

    scan = commands.add_parser("scan", help="scan a Fabric JSONL event log")
    scan.add_argument("--input", required=True, type=Path)
    scan.add_argument("--allowed-root", action="append", type=Path, default=[])
    scan.add_argument("--max-line-bytes", type=int, default=16 * 1024 * 1024)
    _add_output(scan)

    telemetry = commands.add_parser("telemetry", help="project one Fabric result usage object")
    telemetry.add_argument("--input", required=True, type=Path)
    telemetry.add_argument("--version", default=TELEMETRY_PROJECTOR_VERSION)
    _add_output(telemetry)

    resume = commands.add_parser("resume", help="plan resume actions from immutable row state")
    resume.add_argument("--input", required=True, type=Path)
    _add_output(resume)

    budget = commands.add_parser("budget", help="reserve direct, descendant, and cost budget")
    budget.add_argument("--input", required=True, type=Path)
    _add_output(budget)

    transaction = commands.add_parser("transaction", help="plan receipt-gated stage eligibility")
    transaction.add_argument("--input", required=True, type=Path)
    _add_output(transaction)
    return parser


def _object_input(path: Path, label: str) -> dict[str, Any]:
    value = lib.load_json(path)
    if not isinstance(value, dict):
        raise lib.InputError(f"{label} must contain a JSON object")
    return value


def _plan_cli(payload: Mapping[str, Any], cli_limit: int | None) -> dict[str, Any]:
    if "call_ids" in payload:
        limit = cli_limit if cli_limit is not None else payload.get("limit", DEFAULT_DIRECT_CALL_LIMIT)
        common = {
            "benchmark_id": payload.get("benchmark_id"),
            "stage": payload.get("stage"),
            "call_ids": payload.get("call_ids"),
            "max_concurrency": payload.get("max_concurrency"),
            "limit": limit,
            "declared_descendant_calls": payload.get("declared_descendant_calls", 0),
            "effective_call_cap": payload.get("effective_call_cap"),
        }
        if payload.get("partition") is True:
            plans = partition_call_ids(**common)
            return {
                "schema_version": 1,
                "planner_version": MECHANICS_VERSION,
                "plan_count": len(plans),
                "plans": plans,
            }
        return make_call_plan(
            **common,
            predecessor_checkpoint_path=payload.get("predecessor_checkpoint_path"),
        )
    if "counts" in payload:
        counts = payload.get("counts")
        descendants = payload.get("declared_descendant_calls", {})
        limit = cli_limit if cli_limit is not None else payload.get("limit", DEFAULT_DIRECT_CALL_LIMIT)
    else:
        counts = payload
        descendants = {}
        limit = cli_limit if cli_limit is not None else DEFAULT_DIRECT_CALL_LIMIT
    if not isinstance(counts, Mapping) or not isinstance(descendants, Mapping):
        raise lib.InputError("plan counts and declared_descendant_calls must be JSON objects")
    return plan_stage_calls(counts, descendants, limit)


def _dispatch(args: argparse.Namespace) -> dict[str, Any]:
    if args.command == "doctor":
        if args.pi_root is None:
            raise lib.InputError("doctor could not locate installed Pi; provide --pi-root")
        return doctor_runtime(
            args.fabric_root, args.pi_root,
            configured_max_per_execution=args.configured_max_per_execution,
            invocation_agent_budget=args.invocation_agent_budget,
        ).document(max_concurrency=args.max_concurrency)
    if args.command == "plan":
        return _plan_cli(_object_input(args.input, "plan input"), args.limit)
    if args.command == "protect":
        value = _object_input(args.input, "protect input")
        project_root = value.get("project_root")
        protected = value.get("protected_relative")
        if not isinstance(project_root, str) or not isinstance(protected, list):
            raise lib.InputError("protect input requires project_root and protected_relative")
        actor = value.get("actor_state_root")
        if actor is not None and not isinstance(actor, str):
            raise lib.InputError("actor_state_root must be a string or null")
        return check_protected_state_compatibility(
            recursive=value.get("recursive"), cwd=value.get("cwd"),
            project_root=Path(project_root), protected_relative=protected,
            actor_state_root=None if actor is None else Path(actor),
            capability_id=value.get("capability_id"),
        )
    if args.command == "archive":
        return archive_fabric_event_log(
            args.source, args.root, args.relative,
            temporary_log_pattern=args.temporary_log_pattern,
        )
    if args.command == "scan":
        return scan_event_log(
            args.input, allowed_roots=args.allowed_root,
            max_line_bytes=args.max_line_bytes,
        )
    if args.command == "telemetry":
        return project_fabric_telemetry(
            _object_input(args.input, "telemetry input"), version=args.version,
        )
    if args.command == "resume":
        value = lib.load_json(args.input)
        rows = value.get("rows") if isinstance(value, dict) else value
        if not isinstance(rows, list):
            raise lib.InputError("resume input must be an array or an object with rows")
        return plan_resume(rows)
    if args.command == "budget":
        value = _object_input(args.input, "budget input")
        rows = value.get("reservations")
        if not isinstance(rows, list):
            raise lib.InputError("budget input requires a reservations array")
        return reserve_launch_budget(
            rows, maximum_calls=value.get("maximum_calls"),
            maximum_cost=value.get("maximum_cost"),
            cost_unit=value.get("cost_unit", "fabric-native-unknown"),
        )
    if args.command == "transaction":
        value = _object_input(args.input, "transaction input")
        stages = value.get("stages", value)
        if not isinstance(stages, Mapping):
            raise lib.InputError("transaction stages must be a JSON object")
        return plan_transaction(stages)
    raise lib.InputError(f"unknown command {args.command!r}")


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.output is not None:
            lib.preflight_create_outputs((args.output,))
        output = _dispatch(args)
        if args.output is not None:
            lib.atomic_create_json(args.output, output)
        else:
            sys.stdout.buffer.write(lib.canonical_json_bytes(output))
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
