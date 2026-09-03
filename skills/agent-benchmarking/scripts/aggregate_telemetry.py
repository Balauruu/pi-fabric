#!/usr/bin/env python3
"""Validate and aggregate direct parent/child benchmark telemetry without double counting."""

from __future__ import annotations

import argparse
from decimal import Decimal
from pathlib import Path
import sys
from typing import Any, Iterable

import benchmark_lib as lib

USAGE_FIELDS = (
    "input_tokens",
    "output_tokens",
    "cache_read_tokens",
    "cache_write_tokens",
    "cost_usd",
)


def _records(path: Path) -> list[Any]:
    if path.suffix.lower() == ".jsonl":
        return lib.load_jsonl(path)
    value = lib.load_json(path)
    if isinstance(value, list):
        return value
    if isinstance(value, dict) and isinstance(value.get("records"), list):
        return value["records"]
    return [value]


def _attempts(path: Path | None, schema: dict[str, Any]) -> dict[str, dict[str, Any]]:
    if path is None:
        return {}
    directory_paths: list[Path] | None = None
    if path.is_dir():
        directory_paths = sorted(path.glob("*/terminal.json"), key=lambda item: item.as_posix())
        values = [lib.load_json(item) for item in directory_paths]
        sources = [item.as_posix() for item in directory_paths]
    else:
        values = _records(path)
        sources = [f"{path}[{index}]" for index in range(len(values))]
    result: dict[str, dict[str, Any]] = {}
    issues: list[str] = []
    for index, (source, value) in enumerate(zip(sources, values)):
        issues.extend(f"{source}: {issue}" for issue in lib.validate_json_schema(value, schema))
        if not isinstance(value, dict):
            continue
        attempt_id = value.get("attempt_id")
        if not isinstance(attempt_id, str):
            continue
        if directory_paths is not None and directory_paths[index].parent.name != attempt_id:
            issues.append(f"{source}: attempt_id does not equal its directory name")
        if attempt_id in result:
            issues.append(f"{source}: duplicate attempt_id {attempt_id!r}")
        else:
            result[attempt_id] = value
    if issues:
        raise lib.ContractError(tuple(sorted(issues)))
    return result


def _tool_projection(rows: Any) -> list[dict[str, Any]]:
    if not isinstance(rows, list):
        return []
    totals: dict[str, dict[str, int]] = {}
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("name"), str):
            continue
        target = totals.setdefault(row["name"], {"count": 0, "failed": 0})
        target["count"] += 1
        if row.get("status") == "failed":
            target["failed"] += 1
    return [{"name": name, **totals[name]} for name in sorted(totals)]


def records_from_root(
    root: Path, attempt_schema: dict[str, Any], telemetry_schema: dict[str, Any]
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    attempts = _attempts(root / "attempts", attempt_schema)
    records: list[dict[str, Any]] = []
    issues: list[str] = []
    for attempt_id in sorted(attempts):
        attempt = attempts[attempt_id]
        fabric = attempt["fabric_result"]
        native_result = fabric.get("provider_native", {}).get("raw_result")
        nested = native_result.get("nestedAgents") if isinstance(native_result, dict) else None
        if isinstance(nested, list) and nested:
            issues.append(
                f"attempt {attempt_id}: raw nestedAgents require explicit child telemetry and ownership records"
            )
            continue
        agent_id = fabric.get("agent_id")
        parent = {
            "agent_id": agent_id,
            "parent_agent_id": None,
            "session_id": fabric.get("session_id"),
            "requested_model": attempt.get("requested_model"),
            "resolved_model": attempt.get("resolved_model"),
            "observed_model": attempt.get("observed_model"),
            "direct_usage": fabric["usage"],
            "tool_calls": _tool_projection(fabric.get("tool_calls")),
            "latency_ms": None,
            "provider_native": {
                "fabric_result": fabric.get("provider_native", {}),
                "fabric_status": fabric.get("status"),
                "fabric_turns": fabric.get("turns"),
                "latency_boundary": {
                    "start": "FabricAgentResult.started_at",
                    "end": "FabricAgentResult.ended_at",
                    "clock": "Fabric runtime wall clock, not summed",
                },
                "unlaunched_projection": agent_id is None,
            },
        }
        record = {
            "schema_version": 1,
            "benchmark_id": attempt["benchmark_id"],
            "attempt_id": attempt_id,
            "estimate_version": None,
            "parent": parent,
            "children": [],
            "child_ownership": [],
            "subtree_usage": {
                **{field: fabric["usage"][field] for field in USAGE_FIELDS},
                "provider_native": {},
            },
        }
        schema_issues = lib.validate_json_schema(record, telemetry_schema)
        issues.extend(f"attempt {attempt_id}: {issue}" for issue in schema_issues)
        records.append(record)
    if issues:
        raise lib.ContractError(tuple(sorted(issues)))
    return records, attempts


def _decimal(value: int | float) -> Decimal:
    return Decimal(str(value))


def _json_number(value: Decimal, *, integer: bool) -> int | float:
    if integer:
        return int(value)
    return float(value)


def _sum_usage(usages: Iterable[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any], dict[str, int]]:
    rows = list(usages)
    complete: dict[str, Any] = {}
    known: dict[str, Any] = {}
    unknown: dict[str, int] = {}
    for field in USAGE_FIELDS:
        values = [row[field] for row in rows if row[field] is not None]
        missing = len(rows) - len(values)
        total = sum((_decimal(value) for value in values), Decimal(0))
        integer = field != "cost_usd"
        known[field] = _json_number(total, integer=integer)
        unknown[field] = missing
        complete[field] = None if missing else _json_number(total, integer=integer)
    return complete, known, unknown


def _equal_number(left: Any, right: Any) -> bool:
    if left is None or right is None:
        return left is right
    if isinstance(left, bool) or isinstance(right, bool):
        return False
    if not isinstance(left, (int, float)) or not isinstance(right, (int, float)):
        return False
    return _decimal(left) == _decimal(right)


def _walk_mappings(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _walk_mappings(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_mappings(child)


def _first(native: Any, keys: set[str]) -> Any:
    for mapping in _walk_mappings(native):
        for key in keys:
            if key in mapping:
                return mapping[key]
    return None


def _native_digests(native: Any) -> set[str]:
    keys = {"native_payload_sha256", "payload_sha256", "source_digest", "source_sha256"}
    found: set[str] = set()
    for mapping in _walk_mappings(native):
        for key in keys:
            value = mapping.get(key)
            if isinstance(value, str) and len(value) == 64:
                found.add(value)
    return found


def _check_usage(
    usage: dict[str, Any],
    entity_native: dict[str, Any],
    estimate_version: str | None,
    source: str,
    issues: list[str],
) -> None:
    input_tokens = usage.get("input_tokens")
    for field in ("cache_read_tokens", "cache_write_tokens"):
        value = usage.get(field)
        if value is not None and input_tokens is not None and value > input_tokens:
            issues.append(f"{source}.{field}: cache subset exceeds input_tokens")

    native = {"usage": usage.get("provider_native", {}), "entity": entity_native}
    scope = _first(native, {"usage_scope", "accounting_scope", "scope"})
    if isinstance(scope, str) and scope.lower().replace("_", "-") in {
        "inclusive", "subtree", "unknown", "unknown-scope", "run-total"
    }:
        issues.append(f"{source}: direct_usage is marked with non-direct scope {scope!r}")

    currency = _first(native, {"cost_currency", "currency"})
    if currency is not None and (not isinstance(currency, str) or currency.lower() != "usd"):
        issues.append(f"{source}: cost_usd currency must be USD, got {currency!r}")

    cost = usage.get("cost_usd")
    cost_source = _first(native, {"cost_source", "cost_basis", "source_type"})
    explicitly_estimated = isinstance(cost_source, str) and "estimat" in cost_source.lower()
    rate_card = _first(native, {"rate_card"})
    if explicitly_estimated and estimate_version is None:
        issues.append(f"{source}: estimated cost requires estimate_version")
    if estimate_version is not None and cost is not None:
        if not isinstance(rate_card, dict):
            issues.append(f"{source}: local cost estimate requires provider_native.rate_card")
        else:
            rate_currency = rate_card.get("currency")
            if not isinstance(rate_currency, str) or rate_currency.lower() != "usd":
                issues.append(f"{source}: rate card currency must be USD")
            if not any(isinstance(rate_card.get(key), str) and rate_card[key] for key in ("source", "source_url", "id")):
                issues.append(f"{source}: rate card requires a source or id")
            if not any(isinstance(rate_card.get(key), str) and rate_card[key] for key in ("version", "date", "effective_at")):
                issues.append(f"{source}: rate card requires a version or effective date")


def _check_latency(entity: dict[str, Any], source: str, issues: list[str]) -> None:
    native = entity["provider_native"]
    boundary = _first(native, {"latency_boundary"})
    if boundary is None:
        return
    if not isinstance(boundary, dict):
        issues.append(f"{source}: latency_boundary must be an object")
        return
    for key in ("start", "end", "clock"):
        if not isinstance(boundary.get(key), str) or not boundary[key]:
            issues.append(f"{source}: latency_boundary requires non-empty {key}")
    start_ms = boundary.get("start_monotonic_ms")
    end_ms = boundary.get("end_monotonic_ms")
    if (start_ms is None) != (end_ms is None):
        issues.append(f"{source}: monotonic latency boundary requires both endpoints")
    elif isinstance(start_ms, (int, float)) and isinstance(end_ms, (int, float)):
        if end_ms < start_ms:
            issues.append(f"{source}: latency boundary ends before it starts")
        elif entity["latency_ms"] is not None and _decimal(end_ms) - _decimal(start_ms) != _decimal(entity["latency_ms"]):
            issues.append(f"{source}: latency_ms does not equal its monotonic boundary")


def _nested_agent_ids(value: Any) -> list[str]:
    result: list[str] = []
    if isinstance(value, dict):
        for key in ("nested_agents", "nestedAgents", "children"):
            children = value.get(key)
            if isinstance(children, list):
                for child in children:
                    if isinstance(child, dict):
                        identity = child.get("agent_id", child.get("id"))
                        if isinstance(identity, str) and identity:
                            result.append(identity)
                        result.extend(_nested_agent_ids(child))
        for key, child in value.items():
            if key not in {"nested_agents", "nestedAgents", "children"} and isinstance(child, (dict, list)):
                result.extend(_nested_agent_ids(child))
    elif isinstance(value, list):
        for child in value:
            result.extend(_nested_agent_ids(child))
    return result


def _identity_matches(record: dict[str, Any], attempt: dict[str, Any], source: str, issues: list[str]) -> None:
    expected = {
        "requested_model": attempt.get("requested_model"),
        "resolved_model": attempt.get("resolved_model"),
        "observed_model": attempt.get("observed_model"),
    }
    for field, value in expected.items():
        if record.get(field) != value:
            issues.append(f"{source}.{field}: {record.get(field)!r} != attempt {value!r}")
    fabric = attempt.get("fabric_result", {})
    for field, value in (
        ("agent_id", fabric.get("agent_id")),
        ("session_id", fabric.get("session_id")),
    ):
        if record.get(field) != value:
            issues.append(f"{source}.{field}: {record.get(field)!r} != attempt Fabric value {value!r}")


def aggregate(
    records: list[Any],
    attempts: dict[str, dict[str, Any]],
    schema: dict[str, Any],
    *,
    require_attempt_match: bool | None = None,
) -> dict[str, Any]:
    issues: list[str] = []
    join_required = bool(attempts) if require_attempt_match is None else require_attempt_match
    if not records:
        issues.append("telemetry: at least one record is required")
    by_attempt: dict[str, dict[str, Any]] = {}
    agent_owners: dict[str, str] = {}
    session_owners: dict[str, str] = {}
    settlement_owners: dict[str, str] = {}
    digest_owners: dict[str, str] = {}

    for index, value in enumerate(records):
        source = f"telemetry[{index}]"
        schema_issues = lib.validate_json_schema(value, schema)
        issues.extend(f"{source}: {issue}" for issue in schema_issues)
        if schema_issues or not isinstance(value, dict):
            continue
        attempt_id = value.get("attempt_id")
        if isinstance(attempt_id, str):
            if attempt_id in by_attempt:
                issues.append(f"{source}: duplicate attempt_id {attempt_id!r}")
            else:
                by_attempt[attempt_id] = value
        if join_required and attempt_id not in attempts:
            issues.append(f"{source}: unresolved attempt_id {attempt_id!r}")

    benchmark_ids = {record.get("benchmark_id") for record in by_attempt.values()}
    if len(benchmark_ids) > 1:
        issues.append("telemetry: records must share one benchmark_id")
    if join_required:
        telemetry_ids = set(by_attempt)
        attempt_ids = set(attempts)
        missing = sorted(attempt_ids - telemetry_ids)
        extra = sorted(telemetry_ids - attempt_ids)
        if missing:
            issues.append(f"telemetry: missing attempt IDs: {', '.join(missing)}")
        if extra:
            issues.append(f"telemetry: unexpected attempt IDs: {', '.join(extra)}")

    for attempt_id in sorted(by_attempt):
        record = by_attempt[attempt_id]
        source = f"telemetry[{attempt_id}]"
        parent = record["parent"]
        children = record["children"]
        ownership = record["child_ownership"]
        entities = [parent, *children]
        local: dict[str, dict[str, Any]] = {}

        if parent["parent_agent_id"] is not None:
            issues.append(f"{source}.parent.parent_agent_id: root must have no parent")
        if parent.get("agent_id") is None and (not join_required or attempt_id not in attempts):
            issues.append(f"{source}.parent.agent_id: null is allowed only for a joined prelaunch failure")
        for position, entity in enumerate(entities):
            role = "parent" if position == 0 else f"children[{position - 1}]"
            owner = f"{attempt_id}:{role}"
            agent_id = entity["agent_id"]
            if position > 0 and not isinstance(agent_id, str):
                issues.append(f"{source}.{role}.agent_id: nested agents require a non-empty exact ID")
            if agent_id is not None:
                if agent_id in local:
                    issues.append(f"{source}.{role}: duplicate agent_id {agent_id!r} in attempt")
                else:
                    local[agent_id] = entity
                previous = agent_owners.setdefault(agent_id, owner)
                if previous != owner:
                    issues.append(f"{source}.{role}: agent_id {agent_id!r} is also owned by {previous}")
            session_id = entity["session_id"]
            if session_id is not None:
                previous_session = session_owners.setdefault(session_id, owner)
                if previous_session != owner:
                    issues.append(f"{source}.{role}: session_id {session_id!r} is also owned by {previous_session}")
            _check_usage(entity["direct_usage"], entity["provider_native"], record["estimate_version"], f"{source}.{role}.direct_usage", issues)
            _check_latency(entity, f"{source}.{role}", issues)
            native_identity = entity["provider_native"].get("identity")
            if isinstance(native_identity, dict):
                for field in ("requested_model", "resolved_model", "observed_model"):
                    if field in native_identity and native_identity[field] != entity[field]:
                        issues.append(f"{source}.{role}.{field}: disagrees with provider-native identity")
            if "observed_model" in entity["provider_native"] and entity["provider_native"]["observed_model"] != entity["observed_model"]:
                issues.append(f"{source}.{role}.observed_model: disagrees with provider_native.observed_model")
            tool_names: set[str] = set()
            for tool in entity["tool_calls"]:
                if tool["name"] in tool_names:
                    issues.append(f"{source}.{role}.tool_calls: duplicate tool name {tool['name']!r}")
                tool_names.add(tool["name"])
                if tool["failed"] > tool["count"]:
                    issues.append(f"{source}.{role}.tool_calls[{tool['name']}]: failed exceeds count")
            native = {"entity": entity["provider_native"], "usage": entity["direct_usage"]["provider_native"]}
            for digest in _native_digests(native):
                prior = digest_owners.setdefault(digest, owner)
                if prior != owner:
                    issues.append(f"{source}.{role}: native payload digest is also owned by {prior}")

        if join_required and attempt_id in attempts:
            attempt = attempts[attempt_id]
            if record["benchmark_id"] != attempt["benchmark_id"]:
                issues.append(f"{source}.benchmark_id: does not match attempt")
            _identity_matches(parent, attempt, f"{source}.parent", issues)
            expected_children_list = _nested_agent_ids(attempt.get("fabric_result", {}))
            duplicate_expected = sorted({item for item in expected_children_list if expected_children_list.count(item) > 1})
            for child_id in duplicate_expected:
                issues.append(f"{source}: attempt evidence repeats nested agent ID {child_id!r}")
            expected_children = set(expected_children_list)
            actual_children = {child["agent_id"] for child in children if isinstance(child.get("agent_id"), str)}
            missing_children = sorted(expected_children - actual_children)
            extra_children = sorted(actual_children - expected_children)
            if missing_children:
                issues.append(f"{source}: telemetry omits nested agent IDs: {', '.join(missing_children)}")
            if extra_children:
                issues.append(f"{source}: telemetry has unbacked nested agent IDs: {', '.join(extra_children)}")
            launched = attempt.get("status") != "prelaunch-failed"
            if launched and parent.get("agent_id") is None:
                issues.append(f"{source}.parent.agent_id: launched attempt requires its exact Fabric agent ID")
            if not launched:
                if parent.get("agent_id") is not None:
                    issues.append(f"{source}.parent.agent_id: prelaunch failure must not synthesize an agent ID")
                if children or ownership:
                    issues.append(f"{source}: prelaunch failure cannot own nested agents")
                for field in USAGE_FIELDS:
                    if parent["direct_usage"][field] is not None or record["subtree_usage"][field] is not None:
                        issues.append(f"{source}: prelaunch failure must preserve unknown {field} as null")
                if parent["tool_calls"]:
                    issues.append(f"{source}: prelaunch failure cannot report launched tool calls")

        edges: dict[str, str] = {}
        for position, edge in enumerate(ownership):
            child_id = edge["child_agent_id"]
            edge_source = f"{source}.child_ownership[{position}]"
            if child_id in edges:
                issues.append(f"{edge_source}: duplicate ownership for child {child_id!r}")
            else:
                edges[child_id] = edge["owner_agent_id"]
            if child_id == parent["agent_id"] or child_id not in local:
                issues.append(f"{edge_source}: unresolved child_agent_id {child_id!r}")
            if edge["owner_agent_id"] not in local:
                issues.append(f"{edge_source}: unresolved owner_agent_id {edge['owner_agent_id']!r}")
            try:
                artifact = lib.safe_relative_path(edge["settlement_artifact_path"], f"{edge_source}.settlement_artifact_path")
                prior = settlement_owners.setdefault(artifact, f"{attempt_id}:{child_id}")
                if prior != f"{attempt_id}:{child_id}":
                    issues.append(f"{edge_source}: settlement artifact is also owned by {prior}")
            except lib.BenchmarkError as exc:
                issues.append(str(exc))

        child_ids = {
            child["agent_id"] for child in children if isinstance(child.get("agent_id"), str)
        }
        missing_edges = sorted(child_ids - set(edges))
        extra_edges = sorted(set(edges) - child_ids)
        for child_id in missing_edges:
            issues.append(f"{source}: child {child_id!r} has no ownership edge")
        for child_id in extra_edges:
            issues.append(f"{source}: ownership edge names absent child {child_id!r}")
        for child in children:
            child_id = child["agent_id"]
            if edges.get(child_id) != child["parent_agent_id"]:
                issues.append(f"{source}: child {child_id!r} parent_agent_id disagrees with ownership")

        for child_id in sorted(child_ids):
            seen: set[str] = set()
            cursor = child_id
            while cursor != parent["agent_id"]:
                if cursor in seen:
                    issues.append(f"{source}: ownership cycle contains {cursor!r}")
                    break
                seen.add(cursor)
                cursor = edges.get(cursor, "")
                if not cursor:
                    issues.append(f"{source}: child {child_id!r} is orphaned from parent root")
                    break

        calculated, _, _ = _sum_usage(entity["direct_usage"] for entity in entities)
        for field in USAGE_FIELDS:
            if not _equal_number(record["subtree_usage"][field], calculated[field]):
                issues.append(
                    f"{source}.subtree_usage.{field}: {record['subtree_usage'][field]!r} "
                    f"!= unique-direct sum {calculated[field]!r}"
                )

    if issues:
        raise lib.ContractError(tuple(sorted(set(issues))))

    ordered = [by_attempt[key] for key in sorted(by_attempt)]
    parent_entities = [row["parent"] for row in ordered]
    child_entities = [child for row in ordered for child in row["children"]]

    def tool_summary(entities: list[dict[str, Any]]) -> dict[str, Any]:
        by_name: dict[str, dict[str, int]] = {}
        total = 0
        failed = 0
        for entity in entities:
            for tool in entity["tool_calls"]:
                target = by_name.setdefault(tool["name"], {"count": 0, "failed": 0})
                target["count"] += tool["count"]
                target["failed"] += tool["failed"]
                total += tool["count"]
                failed += tool["failed"]
        return {
            "count": total,
            "failed": failed,
            "by_name": [{"name": name, **by_name[name]} for name in sorted(by_name)],
        }

    def category(entities: list[dict[str, Any]]) -> dict[str, Any]:
        values, known_sums, unknown_counts = _sum_usage(
            entity["direct_usage"] for entity in entities
        )
        latencies = [entity["latency_ms"] for entity in entities if entity["latency_ms"] is not None]
        return {
            "entity_count": len(entities),
            "usage": values,
            "known_sums": known_sums,
            "unknown_counts": unknown_counts,
            "tool_calls": tool_summary(entities),
            "direct_latency_ms": {
                "values": latencies,
                "unknown_count": len(entities) - len(latencies),
                "summed": False,
            },
        }

    attempt_views = []
    for row in ordered:
        entities = [row["parent"], *row["children"]]
        values, known_sums, unknown_counts = _sum_usage(
            entity["direct_usage"] for entity in entities
        )
        attempt_views.append({
            "attempt_id": row["attempt_id"],
            "parent_agent_id": row["parent"]["agent_id"],
            "child_agent_ids": sorted(child["agent_id"] for child in row["children"]),
            "subtree_usage": values,
            "known_sums": known_sums,
            "unknown_counts": unknown_counts,
            "subtree_tool_calls": tool_summary(entities),
        })

    all_entities = [*parent_entities, *child_entities]
    identity_unknowns = {
        field: sum(entity[field] is None for entity in all_entities)
        for field in ("agent_id", "session_id", "requested_model", "resolved_model", "observed_model")
    }
    return {
        "schema_version": 1,
        "record_count": len(ordered),
        "identity_unknown_counts": identity_unknowns,
        "attempts": attempt_views,
        "totals": {
            "parent_direct": category(parent_entities),
            "nested_direct": category(child_entities),
            "unique_direct_subtrees": category([*parent_entities, *child_entities]),
        },
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", "--telemetry", dest="input", action="append", type=Path, help="telemetry JSON or JSONL; repeatable")
    source.add_argument("--root", type=Path, help="derive parent telemetry from ROOT/attempts/*/terminal.json")
    parser.add_argument("--attempts", type=Path, help="attempt JSON/JSONL or attempts directory for identity joins")
    parser.add_argument("--output", type=Path, help="create-only aggregate JSON (default: stdout)")
    parser.add_argument("--derived-output", type=Path, help="create-only derived telemetry JSONL; valid only with --root")
    parser.add_argument("--schema", type=Path, default=Path(__file__).resolve().parent.parent / "schemas" / "telemetry.schema.json")
    parser.add_argument("--attempt-schema", type=Path, default=Path(__file__).resolve().parent.parent / "schemas" / "attempt.schema.json")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        schema = lib.load_json(args.schema)
        attempt_schema = lib.load_json(args.attempt_schema)
        if args.root is not None:
            root = args.root.resolve()
            records, attempts = records_from_root(root, attempt_schema, schema)
            result = aggregate(records, attempts, schema, require_attempt_match=True)
            if args.derived_output:
                derived_destination = args.derived_output if args.derived_output.is_absolute() else root / args.derived_output
                output_destination = None if args.output is None else (args.output if args.output.is_absolute() else root / args.output)
                if output_destination is not None and derived_destination.resolve(strict=False) == output_destination.resolve(strict=False):
                    raise lib.InputError("--output and --derived-output must name different files")
                lib.atomic_create_bytes(derived_destination, lib.canonical_jsonl_bytes(records))
            if args.output:
                destination = args.output if args.output.is_absolute() else root / args.output
                lib.atomic_create_json(destination, result)
            else:
                sys.stdout.buffer.write(lib.canonical_json_bytes(result))
        else:
            if args.derived_output:
                raise lib.InputError("--derived-output requires --root")
            records = [record for path in args.input for record in _records(path)]
            result = aggregate(
                records, _attempts(args.attempts, attempt_schema), schema,
                require_attempt_match=args.attempts is not None,
            )
            if args.output:
                lib.atomic_create_json(args.output, result)
            else:
                sys.stdout.buffer.write(lib.canonical_json_bytes(result))
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
