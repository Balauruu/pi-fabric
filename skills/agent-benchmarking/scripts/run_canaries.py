#!/usr/bin/env python3
"""Validate standalone fixtures and evidence-backed non-scoring canary receipts."""

from __future__ import annotations

import argparse
import datetime
import hashlib
from pathlib import Path
import stat
import sys
from typing import Any, Mapping, Sequence

import aggregate_telemetry
import analyze_paired
import benchmark_lib as lib
import generate_schedule

RUNTIME_ASSERTIONS: dict[str, tuple[str, ...]] = {
    "condition-loading": ("exact_invocation_path", "loading_proven", "literal_slash_not_accepted", "objective_effect"),
    "mechanism-nested": ("child_dispatched", "child_result_returned", "parent_consumed", "handoff_owned", "result_dependent_consumption"),
    "fresh-parent-sessions": ("distinct_fabric_ids", "distinct_process_handles", "distinct_workspaces", "mutable_state_reset", "declared_surface_reset", "unsupported_session_claim_limited"),
    "randomized-schedule": ("sealed_bytes_used", "randomized", "block_complete", "condition_balanced", "position_balanced", "randomizer_frozen", "maximum_workers_reserved"),
    "attempt-lifecycle": ("assignment_before_call", "start_evidence_backed", "terminal_last", "exact_reconciliation", "resolving_artifacts"),
    "blind-map-isolation": ("public_map_condition_private", "reverse_map_private", "grading_after_freeze", "grader_isolated"),
    "primary-source-grading": ("claim_entailment", "source_authority", "historical_cutoff", "contemporaneous_capture", "temporal_failure_rejected"),
    "runtime-model-identity": ("parent_identity_layers", "nested_identity_layers", "unknowns_explicit", "independent_parent_observation"),
    "token-cost-attribution": ("parent_direct", "nested_direct", "unique_subtree", "cache_native", "traffic_separated", "no_double_counting", "inclusive_duplicate_rejected"),
    "interrupted-wave-resume": ("terminals_skipped", "never_assigned_only", "ambiguous_refused", "retry_ids_frozen", "terminal_immutable"),
    "false-complete-refusal": ("incomplete_packet_injected", "completion_refused", "diagnostic_emitted", "field_mismatch_refused"),
    "supervisor-prelaunch-failure": ("assignment_retained", "no_start", "one_terminal", "exception_preserved", "bounded_settlement", "runner_startup_failure"),
}

SYNTHETIC_IDS = frozenset(
    {
        "false-complete-refusal", "interrupted-wave-resume-policy",
        "grader-condition-leakage", "mutable-state-reuse", "unequal-budgets",
        "fixed-order", "silent-exclusions", "retry-contamination",
        "unsupported-causal-claims", "stale-seals", "orphan-children",
        "efficiency-accounting", "static-before-agent-ordering",
    }
)


def _is_true(value: Any) -> bool:
    return value is True


def _synthetic_evaluate(canary_id: str, value: Mapping[str, Any]) -> tuple[str, str]:
    """Evaluate intentionally defective inputs without trusting expected labels."""
    data = value.get("input")
    if not isinstance(data, Mapping):
        return "invalid-fixture", "input must be an object"
    if canary_id == "false-complete-refusal":
        rejected = data.get("scheduled") != data.get("terminals") or data.get("graders") != data.get("scheduled")
        return ("rejected", "incomplete lifecycle forbids completion") if rejected else ("accepted", "counts reconcile")
    if canary_id == "interrupted-wave-resume-policy":
        replay = set(data.get("selected", [])) & set(data.get("terminal", []))
        ambiguous = set(data.get("selected", [])) & set(data.get("assigned_without_terminal", []))
        allowed = set(data.get("selected", [])) <= set(data.get("never_assigned", []))
        rejected = bool(replay or ambiguous or not allowed)
        return ("rejected", "resume selected an ineligible row") if rejected else ("accepted", "only never-assigned rows selected")
    if canary_id == "grader-condition-leakage":
        leaked = bool(set(data.get("grader_fields", [])) & {"condition_id", "condition", "treatment"}) or _is_true(data.get("reference_visible_to_condition"))
        return ("rejected", "condition or grader reference leaked") if leaked else ("accepted", "no declared leak")
    if canary_id == "mutable-state-reuse":
        fields = ("workspace_id", "cache_id", "browser_id", "service_state_id", "session_id")
        attempts = data.get("attempts", [])
        reused = any(len({row.get(field) for row in attempts}) != len(attempts) for field in fields) if isinstance(attempts, list) and attempts else True
        return ("rejected", "mutable attempt state was reused") if reused else ("accepted", "state IDs are distinct")
    if canary_id == "unequal-budgets":
        budgets = data.get("condition_budgets", {})
        unequal = isinstance(budgets, Mapping) and len({lib.canonical_json_bytes(item) for item in budgets.values()}) > 1
        return ("rejected", "condition budgets differ") if unequal else ("accepted", "budgets equal")
    if canary_id == "fixed-order":
        sequences = data.get("condition_sequences", [])
        fixed = bool(sequences) and len({tuple(row) for row in sequences}) == 1
        return ("rejected", "condition order is fixed") if fixed else ("accepted", "order varies")
    if canary_id == "silent-exclusions":
        scheduled = set(data.get("scheduled_ids", []))
        reported = set(data.get("reported_ids", []))
        return ("rejected", "scheduled rows are absent from denominator") if scheduled != reported else ("accepted", "denominator complete")
    if canary_id == "retry-contamination":
        attempts = data.get("attempts", [])
        ids = [row.get("attempt_id") for row in attempts] if isinstance(attempts, list) else []
        overwrite = len(ids) != len(set(ids)) or any(row.get("reported_pass_at_1") and row.get("retry_of") for row in attempts)
        return ("rejected", "retry overwrote or contaminated first-attempt accounting") if overwrite else ("accepted", "retry lineage retained")
    if canary_id == "unsupported-causal-claims":
        claim = data.get("claim", {})
        unsupported = isinstance(claim, Mapping) and claim.get("basis") == "exposed-subset" and not (claim.get("exposure_randomized") or claim.get("exposure_forced"))
        return ("rejected", "exposure-conditioned causal claim is unsupported") if unsupported else ("accepted", "claim basis supported")
    if canary_id == "stale-seals":
        stale = data.get("sealed_sha256") != data.get("current_sha256") or data.get("unmatched_paths") not in ([], None)
        return ("rejected", "seal is stale or unmatched") if stale else ("accepted", "seal matches")
    if canary_id == "orphan-children":
        children = set(data.get("child_ids", []))
        owned = set(data.get("owned_child_ids", []))
        duplicate = len(data.get("owned_child_ids", [])) != len(owned)
        return ("rejected", "child ownership is orphaned or duplicated") if children != owned or duplicate else ("accepted", "children uniquely owned")
    if canary_id == "efficiency-accounting":
        rejected = not _is_true(data.get("failures_included")) or _is_true(data.get("inclusive_parent_plus_children")) or not _is_true(data.get("continuous_metrics_reported"))
        return ("rejected", "efficiency accounting excludes failures, double counts, or saturates") if rejected else ("accepted", "efficiency accounting valid")
    if canary_id == "static-before-agent-ordering":
        rejected = data.get("static_status") == "failed" and int(data.get("agents_run_calls", -1)) == 0
        return ("rejected-before-agent", "static failure blocked agent assignment") if rejected else ("unsafe", "agent call occurred or static defect was ignored")
    return "invalid-fixture", "unknown canary"


def validate_synthetic_catalog(path: Path) -> list[dict[str, Any]]:
    value = lib.load_json(path)
    if not isinstance(value, dict) or value.get("schema_version") != 1 or not isinstance(value.get("cases"), list):
        raise lib.ContractError((f"{path}: expected schema_version 1 and cases",))
    cases: dict[str, Mapping[str, Any]] = {}
    for index, case in enumerate(value["cases"], 1):
        if not isinstance(case, Mapping) or not isinstance(case.get("canary_id"), str):
            raise lib.ContractError((f"{path}: case {index} is malformed",))
        canary_id = case["canary_id"]
        if canary_id in cases:
            raise lib.ContractError((f"{path}: duplicate canary_id {canary_id!r}",))
        cases[canary_id] = case
    missing = sorted(SYNTHETIC_IDS - cases.keys())
    extra = sorted(cases.keys() - SYNTHETIC_IDS)
    if missing or extra:
        raise lib.ContractError((f"{path}: synthetic catalog mismatch; missing={missing}, extra={extra}",))
    results = []
    for canary_id in sorted(cases):
        actual, diagnostic = _synthetic_evaluate(canary_id, cases[canary_id])
        expected = cases[canary_id].get("expected")
        if actual != expected:
            raise lib.ContractError((f"{path}: {canary_id}: expected {expected!r}, observed {actual!r}: {diagnostic}",))
        results.append({"canary_id": canary_id, "status": "passed", "observed": actual, "diagnostic": diagnostic})
    return results


def _fixture_diagnostic(case: Mapping[str, Any], validation_root: Path) -> tuple[str, str]:
    relative = lib.safe_relative_path(case.get("path"), "fixture path")
    path = lib.safe_join(validation_root, relative)
    validator = case.get("validator")
    try:
        if validator == "workflow-request-schema":
            schema = lib.load_json(validation_root.parent.parent / "schemas/workflow-request.schema.json")
            document = lib.load_json(path)
            issues = lib.validate_json_schema(document, schema)
            issues.extend(lib.validate_contract_semantics("workflow-request", document))
            if issues:
                raise lib.ContractError(tuple(issues))
        elif validator == "paired-analysis":
            records, options = analyze_paired._load_input(path)
            analyze_paired.analyze(records, **options)
        elif validator == "schedule-boundaries":
            value = lib.load_json(path)
            for row in value["cases"]:
                generate_schedule.generate_schedule(
                    benchmark_id="fixture", schedule_revision="v1", seed=3,
                    conditions=row["conditions"], tasks=row["tasks"],
                    repetitions=row["repetitions"], workers=row["workers"],
                )
        elif validator == "strict-json":
            lib.load_json(path)
        elif validator == "strict-jsonl":
            lib.load_jsonl(path)
        elif validator == "public-grader-map":
            value = lib.load_json(path)
            fields = value.get("public_grader_fields") if isinstance(value, dict) else None
            if not isinstance(fields, list) or set(fields) & {"condition_id", "condition", "treatment"}:
                raise lib.ContractError(("public grader map leaks condition identity",))
        elif validator == "stale-seal-record":
            value = lib.load_json(path)
            if value.get("sealed_sha256") != value.get("current_sha256"):
                raise lib.ContractError(("sealed source digest mismatch",))
        else:
            raise lib.InputError(f"unknown fixture validator {validator!r}")
        return "accepted", "accepted by production validator"
    except lib.ContractError as exc:
        return "rejected", "; ".join(exc.issues)
    except lib.BenchmarkError as exc:
        return "rejected", str(exc)


def validate_fixture_catalog(validation_root: Path) -> list[dict[str, Any]]:
    path = validation_root / "fixture-catalog.json"
    value = lib.load_json(path)
    if not isinstance(value, dict) or value.get("schema_version") != 1 or not isinstance(value.get("cases"), list):
        raise lib.ContractError((f"{path}: malformed fixture catalog",))
    seen: set[str] = set()
    families: set[str] = set()
    results: list[dict[str, Any]] = []
    for index, case in enumerate(value["cases"], 1):
        if not isinstance(case, Mapping):
            raise lib.ContractError((f"{path}: case {index} must be an object",))
        case_id = case.get("case_id")
        family = case.get("family")
        if not isinstance(case_id, str) or not case_id or case_id in seen:
            raise lib.ContractError((f"{path}: duplicate or invalid case_id at case {index}",))
        if family not in {"known-good", "known-bad", "isolated-defect", "boundary", "malformed"}:
            raise lib.ContractError((f"{path}: {case_id}: invalid family",))
        seen.add(case_id)
        families.add(family)
        observed, diagnostic = _fixture_diagnostic(case, validation_root)
        expected = case.get("expected")
        diagnostic_contains = case.get("diagnostic_contains")
        if observed != expected or (diagnostic_contains is not None and diagnostic_contains not in diagnostic):
            raise lib.ContractError((
                f"{path}: {case_id}: expected {expected!r}/{diagnostic_contains!r}, "
                f"observed {observed!r}: {diagnostic}",
            ))
        results.append({"case_id": case_id, "family": family, "status": "passed", "observed": observed, "diagnostic": diagnostic})
    required = {"known-good", "known-bad", "isolated-defect", "boundary", "malformed"}
    if families != required:
        raise lib.ContractError((f"{path}: fixture families mismatch; missing={sorted(required - families)}",))
    return results


def _time(value: Any) -> datetime.datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo is not None else None
    except ValueError:
        return None


def _events(observations: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    value = observations.get("events")
    return [row for row in value if isinstance(row, Mapping)] if isinstance(value, list) else []


def _event_positions(rows: Sequence[Mapping[str, Any]]) -> dict[str, list[int]]:
    result: dict[str, list[int]] = {}
    for row in rows:
        kind = row.get("event_type")
        sequence = row.get("sequence")
        if isinstance(kind, str) and isinstance(sequence, int) and not isinstance(sequence, bool):
            result.setdefault(kind, []).append(sequence)
    return result


def _derive_runtime_facts(canary_id: str, observations: Mapping[str, Any], request_sha256: str) -> dict[str, bool]:
    if canary_id == "condition-loading":
        submitted = observations.get("submitted_prompt")
        accepted = observations.get("observed_prompt")
        requested_digest = observations.get("requested_condition_sha256")
        loaded_digest = observations.get("loaded_condition_sha256")
        result = observations.get("child_result")
        inline = observations.get("inline_control")
        return {
            "exact_invocation_path": observations.get("invocation_path") == "agents.run:pi:process" and observations.get("request_sha256") == request_sha256,
            "loading_proven": (
                re_full_sha256(requested_digest) and requested_digest == loaded_digest
                and isinstance(accepted, str) and accepted.startswith('<skill name="agent-benchmarking"')
            ),
            "literal_slash_not_accepted": (
                isinstance(submitted, str) and submitted.startswith("/skill:agent-benchmarking")
                and isinstance(accepted, str) and accepted != submitted and not accepted.startswith("/skill:")
            ),
            "objective_effect": (
                isinstance(result, Mapping) and result.get("received_as_literal") is False
                and isinstance(inline, Mapping) and inline.get("instruction_mode") == "inline-bundle"
                and isinstance(inline.get("nonce"), str) and bool(inline.get("nonce"))
            ),
        }
    if canary_id == "mechanism-nested":
        rows = _events(observations)
        positions = _event_positions(rows)
        dispatched = positions.get("child-dispatched", [])
        returned = positions.get("child-result", [])
        consumed = positions.get("child-consumed", [])
        child_ids = {row.get("child_id") for row in rows if row.get("event_type") == "child-dispatched"}
        returned_ids = {row.get("child_id") for row in rows if row.get("event_type") == "child-result"}
        consumed_ids = {row.get("child_id") for row in rows if row.get("event_type") == "child-consumed"}
        owned = {row.get("child_id") for row in observations.get("ownership", []) if isinstance(row, Mapping)} if isinstance(observations.get("ownership"), list) else set()
        token = observations.get("child_token")
        parent_value = observations.get("parent_consumed_value")
        suffix = observations.get("parent_transform_suffix")
        return {
            "child_dispatched": len(dispatched) == 1 and len(child_ids) == 1,
            "child_result_returned": len(returned) == 1 and bool(dispatched) and returned[0] > dispatched[0] and returned_ids == child_ids,
            "parent_consumed": len(consumed) == 1 and bool(returned) and consumed[0] > returned[0] and consumed_ids == child_ids,
            "handoff_owned": child_ids == owned and len(child_ids) == 1,
            "result_dependent_consumption": isinstance(token, str) and isinstance(suffix, str) and parent_value == token + suffix,
        }
    if canary_id == "fresh-parent-sessions":
        parents = observations.get("parents")
        rows = parents if isinstance(parents, list) else []
        def distinct(field: str) -> bool:
            values = [row.get(field) for row in rows if isinstance(row, Mapping)]
            return len(values) >= 2 and all(isinstance(value, str) and value for value in values) and len(values) == len(set(values))
        reset = bool(rows) and all(
            isinstance(row, Mapping)
            and row.get("status") == "completed"
            and row.get("tool_calls") == 1
            and isinstance(row.get("own_sentinel"), str)
            and row.get("file_value") == row.get("own_sentinel")
            and row.get("other_sentinel_seen") is False
            for row in rows
        )
        limitations = observations.get("limitations")
        return {
            "distinct_fabric_ids": distinct("fabric_agent_id"),
            "distinct_process_handles": distinct("process_handle"),
            "distinct_workspaces": distinct("workspace_id"),
            "mutable_state_reset": reset,
            "declared_surface_reset": observations.get("declared_mutable_surfaces") == ["workspace"] and reset,
            "unsupported_session_claim_limited": (
                isinstance(limitations, list)
                and any(isinstance(item, str) and "persisted runner session" in item for item in limitations)
                and all(isinstance(row, Mapping) and row.get("persisted_runner_session_id") is None for row in rows)
            ),
        }
    if canary_id == "randomized-schedule":
        rows = observations.get("rows")
        design = observations.get("design")
        valid = isinstance(rows, list) and isinstance(design, Mapping)
        if valid:
            try:
                generate_schedule._check_schedule(rows, design["conditions"], design["tasks"], design["repetitions"], design["workers"])
            except (KeyError, TypeError, lib.BenchmarkError):
                valid = False
        schedule_digest = lib.sha256_bytes(lib.canonical_jsonl_bytes(rows)) if isinstance(rows, list) else None
        sequences: dict[Any, list[Any]] = {}
        if isinstance(rows, list):
            for row in rows:
                if isinstance(row, Mapping):
                    sequences.setdefault(row.get("block"), []).append(row.get("condition_id"))
        randomized = len({tuple(value) for value in sequences.values()}) > 1
        sealed = observations.get("sealed_schedule_sha256")
        execution = observations.get("execution_schedule_sha256")
        return {
            "sealed_bytes_used": re_full_sha256(sealed) and schedule_digest == sealed == execution,
            "randomized": randomized,
            "block_complete": valid,
            "condition_balanced": valid,
            "position_balanced": valid,
            "randomizer_frozen": isinstance(observations.get("seed"), int) and not isinstance(observations.get("seed"), bool) and observations.get("randomizer") == lib.DETERMINISTIC_SHUFFLE_ALGORITHM,
            "maximum_workers_reserved": (
                isinstance(design, Mapping) and design.get("workers") == len(rows or [])
                and bool(rows) and {row.get("wave") for row in rows if isinstance(row, Mapping)} == {1}
                and {row.get("worker_slot") for row in rows if isinstance(row, Mapping)} == set(range(1, len(rows) + 1))
            ),
        }
    if canary_id == "attempt-lifecycle":
        positions = _event_positions(_events(observations))
        assigned = positions.get("assigned", [])
        call = positions.get("agents-run-call", [])
        started = positions.get("started", [])
        terminal = positions.get("terminal", [])
        all_positions = [value for values in positions.values() for value in values]
        artifacts = observations.get("artifacts")
        artifact_rows = artifacts if isinstance(artifacts, list) else []
        return {
            "assignment_before_call": len(assigned) == len(call) == 1 and assigned[0] < call[0],
            "start_evidence_backed": len(started) == 1 and re_full_sha256(observations.get("runtime_start_artifact_sha256")),
            "terminal_last": len(terminal) == 1 and bool(all_positions) and terminal[0] == max(all_positions),
            "exact_reconciliation": observations.get("scheduled_ids") == observations.get("assigned_ids") == observations.get("terminal_ids") == observations.get("ledger_ids"),
            "resolving_artifacts": bool(artifact_rows) and all(isinstance(row, Mapping) and re_full_sha256(row.get("sha256")) and isinstance(row.get("path"), str) for row in artifact_rows),
        }
    if canary_id == "blind-map-isolation":
        public = observations.get("public_rows")
        private = observations.get("private_rows")
        public_rows = public if isinstance(public, list) else []
        private_rows = private if isinstance(private, list) else []
        public_safe = bool(public_rows) and len(public_rows) == len(private_rows) and all(
            isinstance(row, Mapping) and set(row) == {"blind_id", "task_id", "item_path"} for row in public_rows
        )
        private_ids = {row.get("blind_id") for row in private_rows if isinstance(row, Mapping)}
        public_ids = {row.get("blind_id") for row in public_rows if isinstance(row, Mapping)}
        private_attempts = {row.get("attempt_id") for row in private_rows if isinstance(row, Mapping)}
        frozen = _time(observations.get("raw_frozen_at"))
        graded = _time(observations.get("grading_started_at"))
        grader = observations.get("grader_result")
        public_digest = lib.sha256_bytes(lib.canonical_json_bytes({"schema_version": 1, "rows": public_rows})) if public_rows else None
        return {
            "public_map_condition_private": public_safe and public_digest == observations.get("public_map_sha256"),
            "reverse_map_private": (
                private_ids == public_ids and len(private_attempts) == len(private_rows)
                and all(isinstance(row, Mapping) and "condition_id" in row and "attempt_id" in row for row in private_rows)
            ),
            "grading_after_freeze": frozen is not None and graded is not None and graded >= frozen,
            "grader_isolated": (
                observations.get("reverse_map_available_to_grader") is False
                and observations.get("grader_tool_calls") == 0
                and isinstance(grader, Mapping) and grader.get("condition_identity_seen") is False
                and grader.get("keys_seen") == ["blind_id", "item_path", "task_id"]
            ),
        }
    if canary_id == "primary-source-grading":
        claim = observations.get("claim")
        row = claim if isinstance(claim, Mapping) else {}
        quote = row.get("quote")
        captured = row.get("captured_text")
        cutoff = row.get("claim_date")
        capture = row.get("captured_at")
        temporal = observations.get("temporal_negative_control")
        expected_digest = hashlib.sha256(captured.encode("utf-8")).hexdigest() if isinstance(captured, str) else None
        return {
            "claim_entailment": isinstance(quote, str) and isinstance(captured, str) and quote in captured and row.get("decision") == "entailed",
            "source_authority": row.get("source_type") == "primary" and str(row.get("source_url", "")).startswith("https://www.itl.nist.gov/"),
            "historical_cutoff": isinstance(cutoff, str) and isinstance(capture, str) and cutoff <= capture[:10],
            "contemporaneous_capture": expected_digest == row.get("capture_sha256") and re_full_sha256(row.get("capture_sha256")) and _time(capture) is not None,
            "temporal_failure_rejected": isinstance(temporal, Mapping) and temporal.get("decision") == "rejected" and isinstance(temporal.get("claim_date"), str) and isinstance(capture, str) and temporal.get("claim_date") > capture[:10],
        }
    if canary_id == "runtime-model-identity":
        parent = observations.get("parent")
        nested = observations.get("nested")
        def layers(row: Any) -> bool:
            return isinstance(row, Mapping) and set(("requested", "resolved", "observed", "observed_source")) <= set(row) and any(row.get(key) is not None for key in ("requested", "resolved", "observed"))
        unknowns = observations.get("unknown_fields")
        nested_unknown = isinstance(nested, Mapping) and nested.get("observed") is None and "nested.observed" in (unknowns or [])
        return {
            "parent_identity_layers": layers(parent),
            "nested_identity_layers": layers(nested),
            "unknowns_explicit": isinstance(unknowns, list) and nested_unknown,
            "independent_parent_observation": isinstance(parent, Mapping) and parent.get("observed_source") == "provider-log" and isinstance(parent.get("observed"), str) and bool(parent.get("observed")),
        }
    if canary_id == "token-cost-attribution":
        records = observations.get("telemetry_records")
        valid = False
        aggregate = None
        if isinstance(records, list):
            try:
                schema = lib.load_json(Path(__file__).resolve().parent.parent / "schemas/telemetry.schema.json")
                aggregate = aggregate_telemetry.aggregate(records, {}, schema)
                valid = True
            except lib.BenchmarkError:
                valid = False
        totals = aggregate.get("totals", {}) if isinstance(aggregate, Mapping) else {}
        parent = totals.get("parent_direct", {})
        nested = totals.get("nested_direct", {})
        subtree = totals.get("unique_direct_subtrees", {})
        cache_keys = {"cache_read_input_tokens", "cache_creation_input_tokens", "cached_tokens", "cache_read_tokens", "cache_write_tokens"}
        native_cache = bool(records) and all(
            isinstance(entity.get("direct_usage", {}).get("provider_native"), Mapping)
            and bool(set(entity.get("direct_usage", {}).get("provider_native", {})) & cache_keys)
            for record in records for entity in [record.get("parent", {}), *record.get("children", [])]
            if isinstance(record, Mapping)
        )
        duplicate = observations.get("inclusive_duplicate_control")
        return {
            "parent_direct": valid and parent.get("entity_count", 0) > 0,
            "nested_direct": valid and nested.get("entity_count", 0) > 0,
            "unique_subtree": valid and subtree.get("entity_count") == parent.get("entity_count", 0) + nested.get("entity_count", 0),
            "cache_native": native_cache,
            "traffic_separated": isinstance(observations.get("attempt_traffic_id"), str) and isinstance(observations.get("grader_traffic_id"), str) and observations.get("attempt_traffic_id") != observations.get("grader_traffic_id"),
            "no_double_counting": valid,
            "inclusive_duplicate_rejected": isinstance(duplicate, Mapping) and duplicate.get("status") == "rejected" and isinstance(duplicate.get("diagnostic"), str) and "subtree_usage" in duplicate.get("diagnostic", ""),
        }
    if canary_id == "interrupted-wave-resume":
        terminal = set(observations.get("terminal_ids", []))
        ambiguous = set(observations.get("assigned_without_terminal_ids", []))
        never = set(observations.get("never_assigned_ids", []))
        selected = set(observations.get("selected_ids", []))
        retry_ids = set(observations.get("frozen_retry_ids", []))
        return {
            "terminals_skipped": bool(terminal) and not (selected & terminal),
            "never_assigned_only": bool(selected) and selected <= never,
            "ambiguous_refused": bool(ambiguous) and not (selected & ambiguous) and observations.get("ambiguous_replay_decision") == "refused",
            "retry_ids_frozen": set(observations.get("selected_retry_ids", [])) <= retry_ids,
            "terminal_immutable": re_full_sha256(observations.get("terminal_before_sha256")) and observations.get("terminal_before_sha256") == observations.get("terminal_after_sha256"),
        }
    if canary_id == "false-complete-refusal":
        missing = observations.get("missing_records_result")
        mismatch = observations.get("field_mismatch_result")
        missing_row = missing if isinstance(missing, Mapping) else {}
        mismatch_row = mismatch if isinstance(mismatch, Mapping) else {}
        ambiguous = missing_row.get("ambiguous_attempt_ids")
        blockers = missing_row.get("completion_blockers")
        mismatch_issues = mismatch_row.get("issues")
        return {
            "incomplete_packet_injected": isinstance(ambiguous, list) and bool(ambiguous),
            "completion_refused": missing_row.get("complete") is False and isinstance(blockers, list) and bool(blockers),
            "diagnostic_emitted": isinstance(blockers, list) and any(isinstance(item, str) and any(attempt in item for attempt in ambiguous or []) for item in blockers),
            "field_mismatch_refused": mismatch_row.get("complete") is False and isinstance(mismatch_issues, list) and any(isinstance(item, str) and "condition_id" in item and "scheduled" in item for item in mismatch_issues),
        }
    if canary_id == "supervisor-prelaunch-failure":
        rows = _events(observations)
        positions = _event_positions(rows)
        terminals = [row for row in rows if row.get("event_type") == "terminal"]
        elapsed = observations.get("settlement_ms")
        timeout = observations.get("timeout_ms")
        result = observations.get("fabric_result")
        result_row = result if isinstance(result, Mapping) else {}
        exception = terminals[0].get("exception") if len(terminals) == 1 else None
        return {
            "assignment_retained": len(positions.get("assigned", [])) == 1 and len(positions.get("agents-run-call", [])) == 1,
            "no_start": not positions.get("started") and observations.get("runtime_agent_start_observed") is False,
            "one_terminal": len(terminals) == 1 and terminals[0].get("status") == "prelaunch-failed",
            "exception_preserved": isinstance(exception, str) and bool(exception) and exception == result_row.get("error"),
            "bounded_settlement": isinstance(elapsed, int) and isinstance(timeout, int) and 0 <= elapsed <= timeout,
            "runner_startup_failure": (
                observations.get("request_validated") is True and result_row.get("runner") == "veda"
                and result_row.get("status") == "failed" and result_row.get("turns") == 0
                and isinstance(result_row.get("id"), str) and bool(result_row.get("id"))
                and isinstance(result_row.get("error"), str) and "ENOENT" in result_row.get("error", "")
            ),
        }
    raise lib.InputError(f"unknown runtime canary {canary_id!r}")


def re_full_sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(character in "0123456789abcdef" for character in value)


def _safe_evidence(root: Path, relative: str) -> Path:
    canonical = lib.safe_relative_path(relative, "evidence.path")
    current = root
    for component in Path(canonical).parts:
        current = current / component
        try:
            mode = current.lstat().st_mode
        except FileNotFoundError:
            raise lib.InputError(f"evidence path does not exist: {canonical}") from None
        if stat.S_ISLNK(mode):
            raise lib.InputError(f"evidence path is symlinked: {canonical}")
    if not stat.S_ISREG(current.lstat().st_mode):
        raise lib.InputError(f"evidence path is not a regular file: {canonical}")
    return current


def _validate_source_links(observations: Mapping[str, Any], receipt_root: Path, issues: list[str]) -> int:
    links = observations.get("_sources")
    if not isinstance(links, list) or not links:
        issues.append("observations._sources must be a non-empty array")
        return 0
    seen: set[str] = set()
    valid = 0
    for index, entry in enumerate(links):
        if not isinstance(entry, Mapping) or set(entry) != {"path", "sha256", "bytes", "role"}:
            issues.append(f"observations._sources[{index}] must contain exactly path, sha256, bytes, role")
            continue
        relative = entry.get("path")
        if not isinstance(relative, str) or not relative.startswith("runtime-raw/") or relative in seen:
            issues.append(f"observations._sources[{index}].path must be a unique runtime-raw path")
            continue
        seen.add(relative)
        if not isinstance(entry.get("role"), str) or not entry.get("role"):
            issues.append(f"observations._sources[{index}].role must be a non-empty string")
        try:
            source_path = _safe_evidence(receipt_root, relative)
            data = lib.read_bytes(source_path)
            if entry.get("sha256") != hashlib.sha256(data).hexdigest():
                issues.append(f"observations._sources[{index}] sha256 mismatch")
            if entry.get("bytes") != len(data):
                issues.append(f"observations._sources[{index}] byte count mismatch")
            valid += 1
        except lib.BenchmarkError as exc:
            issues.append(str(exc))
    return valid


def _validate_runtime_receipt(canary_id: str, path: Path, fixture_root: Path, receipt_root: Path) -> dict[str, Any]:
    if path.is_symlink():
        raise lib.ContractError((f"{path}: runtime receipt must not be a symlink",))
    value = lib.load_json(path)
    issues: list[str] = []
    if not isinstance(value, dict):
        raise lib.ContractError((f"{path}: expected an object",))
    allowed = {"schema_version", "canary_id", "non_scoring", "status", "scored_attempt_ids", "request_fixture", "request_sha256", "evidence"}
    unknown = sorted(set(value) - allowed)
    if unknown:
        issues.append("unexpected receipt fields: " + ", ".join(unknown))
    if value.get("schema_version") != 1:
        issues.append("schema_version must be 1")
    if value.get("canary_id") != canary_id:
        issues.append(f"canary_id must be {canary_id!r}")
    if value.get("non_scoring") is not True:
        issues.append("non_scoring must be true")
    if value.get("status") != "passed":
        issues.append("status must be passed")
    if value.get("scored_attempt_ids") not in (None, []):
        issues.append("scored_attempt_ids must be absent or empty")

    expected_request = f"{canary_id}.request.json"
    if value.get("request_fixture") != expected_request:
        issues.append(f"request_fixture must be {expected_request!r}")
    request_path = fixture_root / expected_request
    request_sha256 = None
    try:
        request_path = _safe_evidence(fixture_root, expected_request)
        request_bytes = lib.read_bytes(request_path)
        request_sha256 = hashlib.sha256(request_bytes).hexdigest()
        request_value = lib.parse_json_bytes(request_bytes, str(request_path))
        request_schema = lib.load_json(fixture_root.parent.parent.parent / "schemas/workflow-request.schema.json")
        request_issues = lib.validate_json_schema(request_value, request_schema)
        request_issues.extend(lib.validate_contract_semantics("workflow-request", request_value))
        issues.extend(f"request fixture: {issue}" for issue in request_issues)
        if isinstance(request_value, Mapping) and request_value.get("request_id") != canary_id:
            issues.append("request fixture request_id does not match canary_id")
        if value.get("request_sha256") != request_sha256:
            issues.append("request fixture sha256 mismatch")
    except lib.BenchmarkError as exc:
        issues.append(str(exc))

    evidence = value.get("evidence")
    observation_sets: list[Mapping[str, Any]] = []
    if not isinstance(evidence, list) or not evidence:
        issues.append("evidence must be a non-empty array")
        evidence = []
    seen_paths: set[str] = set()
    for index, entry in enumerate(evidence):
        if not isinstance(entry, Mapping) or set(entry) != {"path", "sha256", "bytes"}:
            issues.append(f"evidence[{index}] must contain exactly path, sha256, bytes")
            continue
        relative = entry.get("path")
        if not isinstance(relative, str) or relative in seen_paths:
            issues.append(f"evidence[{index}].path must be a unique string")
            continue
        seen_paths.add(relative)
        try:
            evidence_path = _safe_evidence(receipt_root, relative)
            data = lib.read_bytes(evidence_path)
            if entry.get("sha256") != hashlib.sha256(data).hexdigest():
                issues.append(f"evidence[{index}] sha256 mismatch")
            if entry.get("bytes") != len(data):
                issues.append(f"evidence[{index}] byte count mismatch")
            document = lib.parse_json_bytes(data, str(evidence_path))
            if not isinstance(document, Mapping) or set(document) != {"schema_version", "canary_id", "request_sha256", "observations"}:
                issues.append(f"evidence[{index}] has an invalid document contract")
            elif document.get("schema_version") != 1 or document.get("canary_id") != canary_id or document.get("request_sha256") != request_sha256 or not isinstance(document.get("observations"), Mapping):
                issues.append(f"evidence[{index}] identity or observations mismatch")
            else:
                observation_sets.append(document["observations"])
        except lib.BenchmarkError as exc:
            issues.append(str(exc))

    merged: dict[str, Any] = {}
    for observations in observation_sets:
        overlap = sorted(set(merged) & set(observations))
        if overlap:
            issues.append("duplicate evidence observation keys: " + ", ".join(overlap))
        merged.update(observations)
    source_count = _validate_source_links(merged, receipt_root.parent, issues)
    facts: dict[str, bool] = {}
    if request_sha256 is not None and not issues:
        try:
            facts = _derive_runtime_facts(canary_id, merged, request_sha256)
        except (lib.BenchmarkError, KeyError, TypeError, ValueError) as exc:
            issues.append(f"cannot derive runtime facts: {exc}")
    required = set(RUNTIME_ASSERTIONS[canary_id])
    if set(facts) != required:
        issues.append(f"derived fact set mismatch: expected={sorted(required)}, observed={sorted(facts)}")
    false = sorted(name for name in required if facts.get(name) is not True)
    if false:
        issues.append("independently derived facts not proven: " + ", ".join(false))
    if issues:
        raise lib.ContractError(tuple(f"{path}: {issue}" for issue in issues))
    return {
        "canary_id": canary_id, "status": "passed", "receipt": path.name,
        "request_sha256": request_sha256, "derived_facts": sorted(required),
        "evidence_count": len(evidence), "source_count": source_count,
    }


def run(*, fixture_root: Path, receipt_root: Path) -> dict[str, Any]:
    fixtures = validate_fixture_catalog(fixture_root.parent)
    synthetic = validate_synthetic_catalog(fixture_root / "synthetic-catalog.json")
    runtime: list[dict[str, Any]] = []
    if not receipt_root.is_dir():
        raise lib.InputError(f"{receipt_root}: receipt root is missing")
    expected_names = {f"{canary_id}.json" for canary_id in RUNTIME_ASSERTIONS}
    actual_names = {path.name for path in receipt_root.glob("*.json")}
    missing = sorted(expected_names - actual_names)
    extra = sorted(actual_names - expected_names)
    if missing or extra:
        raise lib.ContractError((f"runtime receipt set mismatch: missing={missing}, extra={extra}",))
    for canary_id in sorted(RUNTIME_ASSERTIONS):
        runtime.append(_validate_runtime_receipt(canary_id, receipt_root / f"{canary_id}.json", fixture_root, receipt_root))
    return {
        "schema_version": 1, "status": "passed", "non_scoring": True,
        "fixtures": {"status": "passed", "count": len(fixtures), "results": fixtures},
        "synthetic": {"status": "passed", "count": len(synthetic), "results": synthetic},
        "runtime": {"status": "passed", "count": len(runtime), "results": runtime},
        "limitations": [
            "Deterministic fixtures prove only encoded rejection rules.",
            "Runtime receipts apply only to their exact request bytes, evidence bytes, installed runtime, provider window, and fixture.",
        ],
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture-root", required=True, type=Path)
    parser.add_argument("--receipt-root", required=True, type=Path)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        result = run(fixture_root=args.fixture_root, receipt_root=args.receipt_root)
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
