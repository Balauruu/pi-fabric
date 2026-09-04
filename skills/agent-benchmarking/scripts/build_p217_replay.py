#!/usr/bin/env python3
"""Build the deterministic P2.17 release-gate replay packet."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROFILE = ROOT.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import benchmark_lib as lib
import deep_stage
import generate_blind_map
import verify_seal

BENCHMARK_ID = "p2.17-release-replay"
CREATED_AT = "2026-09-04T06:00:00Z"
STARTED_AT = "2026-09-04T06:00:01Z"
ENDED_AT = "2026-09-04T06:00:02Z"
JUDGES = [f"judge-{index:02d}" for index in range(1, 17)]
ADJUDICATORS = [f"adjudicator-{index:02d}" for index in range(1, 4)]


def write_json(root: Path, relative: str, value: object) -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(lib.canonical_json_bytes(value))
    return path


def write_jsonl(root: Path, relative: str, values: list[object]) -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(lib.canonical_jsonl_bytes(values))
    return path


def digest(path: Path) -> str:
    return lib.sha256_file(path)


def archive_large_replay_log(root: Path, relative_base: str, attempt_id: str) -> dict[str, object]:
    source_root = Path(tempfile.mkdtemp(prefix="pi-fabric-runs-p217-replay-"))
    source = source_root / f"measured-agent-{attempt_id}" / "events.jsonl"
    source.parent.mkdir()
    try:
        with source.open("xb") as handle:
            handle.write(lib.canonical_json_bytes({"type": "agent_start", "agentId": f"measured-agent-{attempt_id}"}))
            for index in range(24_000):
                handle.write(lib.canonical_json_bytes({
                    "type": "message_delta", "agentId": f"measured-agent-{attempt_id}",
                    "index": index, "delta": "x" * 64,
                }))
            handle.write(lib.canonical_json_bytes({"type": "agent_end", "agentId": f"measured-agent-{attempt_id}", "status": "completed"}))
        log_relative = f"{relative_base}/events.jsonl"
        archive = deep_stage.archive_fabric_event_log(source, root, log_relative)
        if archive["bytes"] <= 2 * 1024 * 1024:
            raise lib.InputError("release replay Fabric log did not exceed 2 MiB")
        archive_relative = f"{relative_base}/events.archive.json"
        scan_relative = f"{relative_base}/events.scan.json"
        write_json(root, archive_relative, archive)
        scan = deep_stage.scan_event_log(root / log_relative, allowed_roots=[root])
        write_json(root, scan_relative, scan)
        if scan["source_sha256"] != archive["sha256"] or scan["source_bytes"] != archive["bytes"]:
            raise lib.InputError("large replay log scan does not match archived bytes")
        return {
            "path": log_relative, "bytes": archive["bytes"], "sha256": archive["sha256"],
            "archive_receipt_path": archive_relative, "scan_path": scan_relative,
            "event_count": scan["event_count"],
        }
    finally:
        shutil.rmtree(source_root)


def stable_id(prefix: str, label: str) -> str:
    return f"{prefix}-{hashlib.sha256(label.encode()).hexdigest()[:24]}"


def grader(grader_id: str) -> dict[str, object]:
    return {
        "schema_version": 1,
        "benchmark_id": BENCHMARK_ID,
        "grader_id": grader_id,
        "revision": "v1",
        "kind": "model",
        "blind": True,
        "criteria": [{
            "criterion_id": "correct",
            "description": "The blinded synthetic attempt satisfies the frozen criterion.",
            "evidence_type": "judgment",
            "weight": 1,
            "fatal": False,
        }],
        "fixtures": {
            "known_good": ["fixtures/grader/good.json"],
            "known_bad": ["fixtures/grader/bad.json"],
            "isolated_defect": ["fixtures/grader/defect.json"],
            "boundary": ["fixtures/grader/boundary.json"],
            "malformed": ["fixtures/grader/malformed.json"],
        },
        "prompt_path": "prompts/grader.txt",
        "output_schema_path": "schemas/grader-output.schema.json",
        "model": {"requested": "fake-model", "resolved": "fake-model", "observed": None},
        "provider_native": {
            "runner": "pi",
            "transport": "process",
            "tools": [],
            "timeout_ms": 60000,
            "effective_timeout_ms": 60000,
            "timeout_evidence_path": f"preflight/grader-timeouts/{grader_id}.json",
        },
    }


def condition(condition_id: str, intervention_type: str) -> dict[str, object]:
    return {
        "schema_version": 1,
        "benchmark_id": BENCHMARK_ID,
        "condition_id": condition_id,
        "revision": "v1",
        "intervention_type": intervention_type,
        "intervention_description": f"Synthetic {condition_id} replay cell.",
        "invocation": {
            "surface": "fabric-agents-run",
            "mode": "plain",
            "skill_name": None,
            "instruction_path": None,
            "expansion_proof_path": None,
        },
        "runtime": {
            "requested_selector": "pi",
            "requested_model": None,
            "resolved_runner": "pi",
            "resolved_model": "fake-measured-model",
            "observed_model": None,
        },
        "mechanism": {
            "owner": "release-replay",
            "predicate": "synthetic attempt terminal exists",
            "exposure": "not-applicable",
            "minimum_canary_exposures": 0,
        },
        "isolation": {
            "fresh_process": True,
            "fresh_session": True,
            "fresh_workspace": True,
            "fresh_fixture": True,
            "fresh_mutable_tool_state": True,
        },
        "budget": {
            "timeout_seconds": 60,
            "max_turns": 1,
            "provider_token_limit": 100,
            "provider_cost_limit_usd": 0,
        },
        "provider_native": {},
    }


def runtime_capability() -> dict[str, object]:
    import subprocess
    command = [
        sys.executable, "-B", str(ROOT / "scripts/deep_stage.py"), "doctor",
        "--fabric-root", str(PROFILE / "npm/node_modules/pi-fabric"),
        "--pi-root", "/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent",
        "--max-concurrency", "32",
    ]
    completed = subprocess.run(command, check=True, text=True, capture_output=True)
    return json.loads(completed.stdout)


def make_budget(call_ids: list[str]) -> dict[str, object]:
    reservations = []
    for call_id in call_ids:
        reservations.append({
            "reservation_id": call_id,
            "traffic": "adjudicate" if "adjudicator" in call_id else "judge",
            "direct_calls": 1,
            "declared_descendant_calls": 0,
            "reserved_calls": 1,
            "projected_cost": "0",
        })
    total = len(reservations)
    return {
        "schema_version": 1,
        "ledger_version": "p2.17-replay-v1",
        "budget_id": stable_id("budget", "p2.17-release-replay"),
        "status": "reserved",
        "launch_allowed": True,
        "maximum_calls": total,
        "maximum_cost": "0",
        "cost_unit": "USD",
        "reservations": reservations,
        "reserved_direct_calls": total,
        "reserved_descendant_calls": 0,
        "reserved_calls": total,
        "reserved_cost": "0",
        "remaining_calls": 0,
        "remaining_cost": "0",
    }


def make_plan(label: str, stage: str, call_ids: list[str], predecessor: str | None) -> dict[str, object]:
    return {
        "schema_version": 1,
        "plan_id": stable_id("calls", label),
        "benchmark_id": BENCHMARK_ID,
        "stage": stage,
        "call_ids": call_ids,
        "max_calls": len(call_ids),
        "max_concurrency": min(32, len(call_ids)),
        "reserved_descendant_calls": 0,
        "reserved_calls": len(call_ids),
        "predecessor_checkpoint_path": predecessor,
    }


def binding(root: Path, relative: str) -> dict[str, str]:
    return {"path": relative, "sha256": digest(root / relative)}


def request(
    root: Path,
    packet_relative: str,
    request_id: str,
    stage: str,
    max_agents: int,
    max_concurrency: int,
    call_plan_path: str | None,
) -> dict[str, object]:
    return {
        "schema_version": 1,
        "request_id": request_id,
        "benchmark_id": BENCHMARK_ID,
        "route": "Analyze",
        "stage": stage,
        "packet_path": packet_relative,
        "design_revision": "design-v1",
        "execution_revision": "execution-v1",
        "analysis_revision": "analysis-v1",
        "wave_id": None,
        "requested_runtime": "pi",
        "requested_model": None,
        "runtime_capability_binding": binding(root, "preflight/runtime-capability.json"),
        "protected_state_binding": binding(root, "preflight/protected-state.json"),
        "budget_ledger_binding": binding(root, "preflight/budget-ledger.json"),
        "call_plan_binding": None if call_plan_path is None else binding(root, call_plan_path),
        "delta_seal_references": [],
        "dry_run": False,
        "max_agents": max_agents,
        "max_concurrency": max_concurrency,
    }


def build_mechanism_fixture(root: Path) -> dict[str, object]:
    """Build a fresh sealed Execute packet for total mechanism branch coverage."""
    if root.exists():
        raise lib.InputError(f"{root}: output already exists")
    if not root.is_absolute() or PROFILE not in root.parents:
        raise lib.InputError(f"output must be an absolute descendant of {PROFILE}")
    root.mkdir(parents=True)
    packet_relative = root.relative_to(PROFILE).as_posix()
    (root / "protocol.md").write_text(
        "# Total mechanism Execute fixture\n\nFive non-scoring branch attempts.\n", encoding="utf-8",
    )
    (root / "prompts").mkdir()
    (root / "prompts/task.txt").write_text("Execute the named non-scoring mechanism branch.\n", encoding="utf-8")
    (root / "prompts/grader.txt").write_text("Unused fixture grader.\n", encoding="utf-8")
    write_json(root, "schemas/grader-output.schema.json", {
        "type": "object", "required": ["status"],
        "properties": {"status": {"enum": ["passed", "failed"]}},
        "additionalProperties": False,
    })
    for name in ("good", "bad", "defect", "boundary", "malformed"):
        write_json(root, f"fixtures/grader/{name}.json", {"fixture": name})
    task = {
        "schema_version": 1, "benchmark_id": BENCHMARK_ID, "task_id": "task-1", "revision": "v1",
        "stratum": "mechanism-totality", "prompt_path": "prompts/task.txt", "fixture_path": None,
        "grader_ids": ["judge-01"], "timeout_seconds": 60, "network_access": "denied",
        "mutable_state_paths": [], "required_artifact_paths": [], "forbidden_path_prefixes": [],
    }
    write_json(root, "tasks/task-1.json", task)
    write_json(root, "graders/judge-01.json", grader("judge-01"))

    specs = [
        ("candidate-actor", "single", True, "forced"),
        ("candidate-no-actor", "single", False, "forced"),
        ("control-no-actor", "control", False, "not-applicable"),
        ("missing-mechanism", "single", False, "forced"),
        ("failed-attempt", "single", False, "forced"),
    ]
    rows: list[dict[str, object]] = []
    for position, (condition_id, intervention_type, recursive, exposure) in enumerate(specs, 1):
        value = condition(condition_id, intervention_type)
        value["mechanism"] = {
            "owner": "fixture-host", "predicate": f"{condition_id} structured evidence",
            "exposure": exposure, "minimum_canary_exposures": 0 if exposure == "not-applicable" else 1,
        }
        value["provider_native"] = {
            "recursive": recursive, "mechanism_evidence_path": "mechanism.json",
            "extensions": False, "transport": "process", "tools": [],
        }
        write_json(root, f"conditions/{condition_id}.json", value)
        rows.append({
            "schema_version": 1, "benchmark_id": BENCHMARK_ID, "schedule_revision": "v1",
            "schedule_mode": "comparative", "attempt_id": condition_id, "task_id": "task-1",
            "condition_id": condition_id, "repetition": 1, "block": position,
            "order_position": position, "wave": 1, "worker_slot": position, "retry_of": None,
        })
    write_jsonl(root, "schedule.jsonl", rows)

    (root / "seals").mkdir()
    verify_seal.create_seal(
        root=root, seal="seals/design-v1", benchmark_id=BENCHMARK_ID,
        seal_type="design", revision="design-v1", previous_revision=None, created_at=CREATED_AT,
        owned_paths=["protocol.md", "tasks", "conditions", "graders", "prompts", "schemas", "fixtures", "schedule.jsonl"],
    )
    write_json(root, "execution-marker.json", {"schema_version": 1, "status": "frozen"})
    verify_seal.create_seal(
        root=root, seal="seals/execution-v1", benchmark_id=BENCHMARK_ID,
        seal_type="execution", revision="execution-v1", previous_revision=None, created_at=CREATED_AT,
        owned_paths=["execution-marker.json"],
    )
    design_sha = digest(root / "seals/design-v1/manifest.json")
    execution_sha = digest(root / "seals/execution-v1/manifest.json")
    isolation = condition("placeholder", "single")["isolation"]
    for row in rows:
        attempt_id = str(row["attempt_id"])
        condition_id = str(row["condition_id"])
        workspace_relative = f"workspaces/{attempt_id}"
        (root / workspace_relative).mkdir(parents=True)
        write_json(root, f"{workspace_relative}/isolation-receipt.json", {
            "schema_version": 1, "status": "passed", "benchmark_id": BENCHMARK_ID,
            "attempt_id": attempt_id, "task_id": "task-1", "task_revision": "v1",
            "task_sha256": digest(root / "tasks/task-1.json"), "condition_id": condition_id,
            "condition_revision": "v1", "condition_sha256": digest(root / f"conditions/{condition_id}.json"),
            "workspace_path": workspace_relative, "design_revision": "design-v1",
            "design_manifest_sha256": design_sha, "execution_revision": "execution-v1",
            "execution_manifest_sha256": execution_sha, "isolation": isolation,
            "mutable_state_paths": [], "fixture_path": None, "requested_timeout_ms": 60000,
            "effective_timeout_ms": 60000, "timeout_status": "passed",
        })

    runtime = runtime_capability()
    write_json(root, "preflight/runtime-capability.json", runtime)
    write_json(root, "preflight/protected-state.json", {
        "schema_version": 1, "status": "compatible", "capability_id": runtime["capability_id"],
        "project_root": str(PROFILE), "protected_absolute_roots": ["/home/balauru/.pi/agent"],
        "actor_state_root": str(PROFILE / ".pi/fabric/mesh"), "conflicts": [],
        "required_request_cwd": str(PROFILE),
    })
    reservations = []
    for row in rows:
        descendants = 1 if row["attempt_id"] == "candidate-actor" else 0
        reservations.append({
            "reservation_id": row["attempt_id"], "traffic": "attempt", "direct_calls": 1,
            "declared_descendant_calls": descendants, "reserved_calls": 1 + descendants,
            "projected_cost": "0",
        })
    write_json(root, "preflight/budget-ledger.json", {
        "schema_version": 1, "ledger_version": "mechanism-fixture-v1",
        "budget_id": stable_id("budget", "mechanism-totality"), "status": "reserved",
        "launch_allowed": True, "maximum_calls": 6, "maximum_cost": "0", "cost_unit": "USD",
        "reservations": reservations, "reserved_direct_calls": 5, "reserved_descendant_calls": 1,
        "reserved_calls": 6, "reserved_cost": "0", "remaining_calls": 0, "remaining_cost": "0",
    })
    call_ids = [str(row["attempt_id"]) for row in rows]
    write_json(root, "replay/call-plans/execute.json", {
        "schema_version": 1, "plan_id": stable_id("calls", "mechanism-totality"),
        "benchmark_id": BENCHMARK_ID, "stage": "execute", "call_ids": call_ids,
        "max_calls": 5, "max_concurrency": 5, "reserved_descendant_calls": 1,
        "reserved_calls": 6, "predecessor_checkpoint_path": None,
    })
    gates = {name: "passed" for name in (
        "condition_smoke", "full_pipeline", "grader_certification", "fresh_state", "model_attribution",
        "effective_timeout", "scheduler", "supervisor_failure", "resume", "target_concurrency",
        "template_typecheck", "audit_dry_run",
    )}
    gates["mechanism"] = {
        "required": True, "predicate": "all mechanism branches are fixture-certified",
        "observed": 1, "minimum": 1, "status": "passed",
    }
    write_json(root, "preflight-receipt.json", {
        "schema_version": 1, "benchmark_id": BENCHMARK_ID, "design_revision": "design-v1",
        "design_manifest": "seals/design-v1/manifest.json", "design_manifest_sha256": design_sha,
        "execution_revision": "execution-v1", "execution_manifest": "seals/execution-v1/manifest.json",
        "execution_manifest_sha256": execution_sha, "requested_runtime": "pi", "requested_model": None,
        "max_agents": 5, "max_concurrency": 5, "scored_attempts_started": 0,
        "decision": "start-scored", "gates": gates,
    })
    execute_request = {
        "schema_version": 1, "request_id": "mechanism-totality", "benchmark_id": BENCHMARK_ID,
        "route": "Execute", "stage": "execute", "packet_path": packet_relative,
        "design_revision": "design-v1", "execution_revision": "execution-v1", "analysis_revision": None,
        "wave_id": "1", "requested_runtime": "pi", "requested_model": None,
        "runtime_capability_binding": binding(root, "preflight/runtime-capability.json"),
        "protected_state_binding": binding(root, "preflight/protected-state.json"),
        "budget_ledger_binding": binding(root, "preflight/budget-ledger.json"),
        "call_plan_binding": binding(root, "replay/call-plans/execute.json"),
        "delta_seal_references": [], "dry_run": False, "max_agents": 5, "max_concurrency": 5,
    }
    write_json(root, "replay/requests/execute.json", execute_request)
    metadata = {
        "schema_version": 1, "benchmark_id": BENCHMARK_ID, "packet_path": packet_relative,
        "scenario": "mechanism-totality", "request_path": "replay/requests/execute.json",
        "branches": [row["attempt_id"] for row in rows],
    }
    write_json(root, "replay/metadata.json", metadata)
    return metadata



def build_resume_fixture(root: Path) -> dict[str, object]:
    """Build a sealed Execute packet spanning every public resume classification."""
    base = build_mechanism_fixture(root)
    rows = {str(row["attempt_id"]): row for row in lib.load_jsonl(root / "schedule.jsonl")}
    design_sha = digest(root / "seals/design-v1/manifest.json")
    execution_sha = digest(root / "seals/execution-v1/manifest.json")
    request_value = lib.load_json(root / "replay/requests/execute.json")

    def assignment(attempt_id: str) -> dict[str, object]:
        row = rows[attempt_id]
        return {
            **row,
            "assigned_at": STARTED_AT,
            "request_id": request_value["request_id"],
            "stage": "execute",
            "runtime_capability_binding": request_value["runtime_capability_binding"],
            "protected_state_binding": request_value["protected_state_binding"],
            "budget_ledger_binding": request_value["budget_ledger_binding"],
            "call_plan_binding": request_value["call_plan_binding"],
            "delta_seal_references": [],
            "design_revision": "design-v1",
            "design_manifest_sha256": design_sha,
            "execution_revision": "execution-v1",
            "execution_manifest_sha256": execution_sha,
            "request_path": f"attempts/{attempt_id}/request.json",
        }

    assigned_ids = ["candidate-actor", "candidate-no-actor", "control-no-actor"]
    for attempt_id in assigned_ids:
        write_json(root, f"attempts/{attempt_id}/request.json", {
            "schema_version": 1, "fixture": "production-shaped-resume", "attempt_id": attempt_id,
        })
        write_json(root, f"attempts/{attempt_id}/assignment.json", assignment(attempt_id))

    valid_id = "candidate-actor"
    valid_raw = write_json(root, f"attempts/{valid_id}/result.raw.json", {
        "schema_version": 1, "agent_id": "resume-valid-agent", "status": "completed", "text": "immutable",
    })
    valid_mechanism = {
        "schema_version": 1, "benchmark_id": BENCHMARK_ID, "attempt_id": valid_id,
        "valid": True, "reason": "actor-mechanism-observed", "detail": None,
        "evidence": [f"attempts/{valid_id}/result.raw.json"], "status": "valid",
        "qualifiers": ["actor-expected", "actor-observed"], "condition_role": "candidate",
        "actor_expected": True, "actor_observed": True,
        "actor_lifecycle": {"create": True, "terminal": True, "cleanup": True},
        "attempt_status": "succeeded", "predicate": "immutable resume fixture evidence",
        "exposure": "forced", "source_state": "file",
        "source_path": f"attempts/{valid_id}/result.raw.json", "source_sha256": digest(valid_raw),
        "log_scan_path": None,
    }
    write_json(root, f"attempts/{valid_id}/mechanism.json", valid_mechanism)
    row = rows[valid_id]
    artifact_paths = [
        f"attempts/{valid_id}/request.json", f"attempts/{valid_id}/assignment.json",
        f"attempts/{valid_id}/result.raw.json", f"attempts/{valid_id}/mechanism.json",
    ]
    write_json(root, f"attempts/{valid_id}/terminal.json", {
        "schema_version": 1, "benchmark_id": BENCHMARK_ID, "schedule_revision": row["schedule_revision"],
        "attempt_id": valid_id, "task_id": row["task_id"], "condition_id": row["condition_id"],
        "repetition": row["repetition"], "wave": row["wave"], "worker_slot": row["worker_slot"],
        "retry_of": row["retry_of"], "stage": "execute", "status": "succeeded", "qualifiers": [],
        "failure": None, "startup_state": "started", "assigned_at": STARTED_AT,
        "started_at": STARTED_AT, "terminal_at": ENDED_AT, "requested_runtime": "pi",
        "resolved_runner": "pi", "requested_model": None, "resolved_model": "fixture/model",
        "observed_model": "fixture/model",
        "fabric_result": {
            "agent_id": "resume-valid-agent", "status": "completed", "model": "fixture/model",
            "session_id": "resume-valid-session", "output": "immutable", "error": None,
            "usage": {"input_tokens": 1, "output_tokens": 1, "cache_read_tokens": 0,
                      "cache_write_tokens": 0, "cost_usd": 0, "provider_native": {}},
            "turns": 1, "tool_calls": [], "started_at": STARTED_AT, "ended_at": ENDED_AT,
            "provider_native": {},
        },
        "log_path": None, "session_path": None,
        "process_evidence_path": f"attempts/{valid_id}/result.raw.json",
        "mechanism_evidence_path": f"attempts/{valid_id}/mechanism.json",
        "artifact_paths": artifact_paths,
    })

    repair_id = "candidate-no-actor"
    write_json(root, f"attempts/{repair_id}/result.raw.json", {
        "schema_version": 1, "agent_id": "resume-repair-agent", "status": "completed",
        "text": "decisive immutable output",
    })
    (root / f"attempts/{repair_id}/terminal.json").write_bytes(b'{"schema_version":1,"truncated":\n')

    contradiction_id = "failed-attempt"
    write_json(root, f"attempts/{contradiction_id}/terminal.json", {
        "schema_version": 1, "attempt_id": contradiction_id, "status": "succeeded",
    })

    metadata = {
        "schema_version": 1,
        "benchmark_id": BENCHMARK_ID,
        "packet_path": base["packet_path"],
        "scenario": "resume-finalize-modes",
        "request_path": "replay/requests/execute.json",
        "expected_actions": {
            "candidate-actor": "skip",
            "candidate-no-actor": "deterministic-repair-only",
            "control-no-actor": "refuse-replay",
            "missing-mechanism": "run",
            "failed-attempt": "refuse-replay",
        },
    }
    write_json(root, "replay/resume-metadata.json", metadata)
    return metadata
def populate_prefinalize_fixture(
    root: Path,
    *,
    rows: list[dict[str, object]],
    private_map: dict[str, object],
    public_map: dict[str, object],
    judges: list[str],
    adjudicators: list[str],
    plans: dict[str, dict[str, object]],
    requests: dict[str, dict[str, object]],
    design_sha: str,
    execution_sha: str,
) -> int:
    """Create a strict non-scoring fixture at the zero-call finalize boundary."""
    private_path = write_json(root, "blind-map.private.json", private_map)
    public_path = write_json(root, "blind-map.public.json", public_map)
    write_json(root, "blind-map.commit.json", {
        "schema_version": 1,
        "status": "committed",
        "tool": "generate_blind_map",
        "seed": private_map["seed"],
        "schedule_sha256": private_map["schedule_sha256"],
        "outputs": [
            {"role": "private", "path": "blind-map.private.json", "sha256": digest(private_path), "bytes": private_path.stat().st_size},
            {"role": "public", "path": "blind-map.public.json", "sha256": digest(public_path), "bytes": public_path.stat().st_size},
        ],
    })
    prompt = (root / "prompts/grader.txt").read_text(encoding="utf-8")
    output_schema = lib.load_json(root / "schemas/grader-output.schema.json")
    runtime_binding = requests["finalize"]["runtime_capability_binding"]
    plan_by_call: dict[str, tuple[str, dict[str, object]]] = {}
    for plan_path, plan in plans.items():
        for call_id in plan["call_ids"]:
            plan_by_call[str(call_id)] = (plan_path, plan)

    def model_request(blind_id: str, grader_id: str, item: dict[str, object]) -> dict[str, object]:
        return {
            "name": f"grader-{blind_id}-{grader_id}"[:120],
            "task": f"{prompt}\n\nBLINDED ITEM:\n{json.dumps(item, ensure_ascii=False, separators=(',', ':'))}",
            "runner": "pi",
            "model": "fake-model",
            "transport": "process",
            "tools": [],
            "timeoutMs": 60000,
            "extensions": False,
            "recursive": False,
            "schema": output_schema,
        }

    def grade_result(
        blind: dict[str, object], grader_id: str, stage: str, passed: bool, evidence_path: str,
    ) -> dict[str, object]:
        status = "passed" if passed else "failed"
        score = 1 if passed else 0
        return {
            "schema_version": 1,
            "benchmark_id": BENCHMARK_ID,
            "attempt_id": blind["attempt_id"],
            "blind_id": blind["blind_id"],
            "grader_id": grader_id,
            "grader_revision": "v1",
            "grader_run_id": stable_id("fixture-grade", f"{blind['blind_id']}/{grader_id}"),
            "stage": stage,
            "status": status,
            "qualifiers": ["model-terminal"],
            "failure": None,
            "score": score,
            "criterion_results": [{
                "criterion_id": "correct",
                "status": status,
                "score": score,
                "rationale": "Deterministic non-scoring pre-finalize fixture outcome.",
            }],
            "evidence_paths": [evidence_path],
            "graded_at": "2026-09-04T06:00:59Z",
            "provider_native": {
                "source": "deterministic-fake-non-scoring",
                "requested_model": "fake-model",
                "resolved_model": "fake-model",
                "observed_model": None,
                "usage": {
                    "input_tokens": 10,
                    "output_tokens": 5,
                    "cache_read_tokens": 0,
                    "cache_write_tokens": 0,
                    "cost_usd": None,
                    "provider_native": {"fixture": True},
                },
            },
        }

    judge_results: dict[str, list[dict[str, object]]] = {}
    terminal_by_attempt = {
        str(row["attempt_id"]): lib.load_json(root / f"attempts/{row['attempt_id']}/terminal.json")
        for row in rows
    }
    for blind in private_map["rows"]:
        blind_id = str(blind["blind_id"])
        terminal = terminal_by_attempt[str(blind["attempt_id"])]
        item = {
            "schema_version": 1,
            "blind_id": blind_id,
            "task_id": blind["task_id"],
            "attempt_status": terminal["status"],
            "startup_state": terminal["startup_state"],
            "output": terminal["fabric_result"]["output"],
            "error": terminal["fabric_result"]["error"],
            "frozen_evidence_paths": [],
        }
        item_path = f"blinded/{blind_id}/item.json"
        write_json(root, item_path, item)
        judge_results[blind_id] = []
        for index, grader_id in enumerate(judges):
            call_id = f"{blind_id}-{grader_id}-v1"
            plan_path, _plan = plan_by_call[call_id]
            base = f"grader-runs/{blind_id}/{grader_id}-v1"
            exact_request = model_request(blind_id, grader_id, item)
            write_json(root, f"{base}/request.json", exact_request)
            write_json(root, f"{base}/assignment.json", {
                "schema_version": 1,
                "benchmark_id": BENCHMARK_ID,
                "blind_id": blind_id,
                "grader_id": grader_id,
                "grader_revision": "v1",
                "assigned_at": "2026-09-04T06:00:57Z",
                "stage": "judge",
                "runtime_capability_binding": runtime_binding,
                "call_plan_binding": binding(root, plan_path),
                "delta_seal_references": [],
                "design_revision": "design-v1",
                "design_manifest_sha256": design_sha,
                "execution_revision": "execution-v1",
                "execution_manifest_sha256": execution_sha,
                "request_path": f"{base}/request.json",
                "traffic_class": "grader-separate-from-measured-attempts",
            })
            result = grade_result(blind, grader_id, "judge", True if len(rows) == 2 else index % 2 == 0, item_path)
            write_json(root, f"{base}/result.raw.json", {
                "schema_version": 1, "benchmark_id": BENCHMARK_ID, "blind_id": blind_id,
                "grader_id": grader_id, "fixture": "deterministic-fake-non-scoring",
            })
            result["evidence_paths"].append(f"{base}/result.raw.json")
            write_json(root, f"{base}/result.json", result)
            write_json(root, f"{base}/terminal.json", {
                "schema_version": 1,
                "benchmark_id": BENCHMARK_ID,
                "blind_id": blind_id,
                "grader_id": grader_id,
                "grader_revision": "v1",
                "stage": "judge",
                "status": result["status"],
                "result_path": f"{base}/result.json",
                "raw_path": f"{base}/result.raw.json",
                "log_path": None,
                "terminal_at": "2026-09-04T06:01:00Z",
            })
            judge_results[blind_id].append(lib.load_json(root / f"{base}/result.json"))

    plan_jobs: list[dict[str, object]] = []
    for blind in private_map["rows"]:
        blind_id = str(blind["blind_id"])
        if len({result["status"] for result in judge_results[blind_id]}) < 2:
            continue
        source_results = []
        for result in judge_results[blind_id]:
            result_path = f"grader-runs/{blind_id}/{result['grader_id']}-{result['grader_revision']}/result.json"
            source_results.append({
                "grader_id": result["grader_id"],
                "grader_revision": result["grader_revision"],
                "result_path": result_path,
                "result_digest": digest(root / result_path),
            })
        base_item = lib.load_json(root / f"blinded/{blind_id}/item.json")
        for grader_id in adjudicators:
            item = {
                "schema_version": base_item["schema_version"],
                "blind_id": base_item["blind_id"],
                "task_id": base_item["task_id"],
                "attempt_status": base_item["attempt_status"],
                "startup_state": base_item["startup_state"],
                "output": base_item["output"],
                "error": base_item["error"],
                "frozen_evidence_paths": base_item["frozen_evidence_paths"],
                "adjudication_source_judge_results": source_results,
                "adjudication_source_outcomes": judge_results[blind_id],
            }
            item_path = f"blinded/{blind_id}/adjudication-{grader_id}.json"
            write_json(root, item_path, item)
            base = f"grader-runs/{blind_id}/{grader_id}-v1"
            write_json(root, f"{base}/request.json", model_request(blind_id, grader_id, item))
            write_json(root, f"{base}/assignment.json", {
                "schema_version": 1,
                "benchmark_id": BENCHMARK_ID,
                "plan_revision": "v1",
                "attempt_id": blind["attempt_id"],
                "task_id": blind["task_id"],
                "blind_id": blind_id,
                "grader_id": grader_id,
                "grader_revision": "v1",
                "stage": "adjudicate",
                "assigned_at": "2026-09-04T06:01:01Z",
                "request_path": f"{base}/request.json",
                "runtime_capability_binding": runtime_binding,
                "call_plan_binding": binding(root, "replay/call-plans/adjudicate.json"),
                "traffic_class": "adjudication",
                "delta_seal_references": [],
            })
            result = grade_result(blind, grader_id, "adjudicate", True, item_path)
            write_json(root, f"{base}/result.json", result)
            raw = {
                "schema_version": 1,
                "benchmark_id": BENCHMARK_ID,
                "blind_id": blind_id,
                "grader_id": grader_id,
                "fixture": "deterministic-fake-non-scoring",
            }
            write_json(root, f"{base}/result.raw.json", raw)
            write_json(root, f"{base}/terminal.json", {
                "schema_version": 1,
                "benchmark_id": BENCHMARK_ID,
                "plan_revision": "v1",
                "attempt_id": blind["attempt_id"],
                "task_id": blind["task_id"],
                "blind_id": blind_id,
                "grader_id": grader_id,
                "grader_revision": "v1",
                "stage": "adjudicate",
                "status": result["status"],
                "terminal_at": "2026-09-04T06:01:02Z",
                "result_path": f"{base}/result.json",
                "result_sha256": digest(root / f"{base}/result.json"),
                "raw_path": f"{base}/result.raw.json",
                "raw_sha256": digest(root / f"{base}/result.raw.json"),
                "log_path": None,
            })
            plan_jobs.append({
                "attempt_id": blind["attempt_id"],
                "blind_id": blind_id,
                "task_id": blind["task_id"],
                "adjudicator_id": grader_id,
                "adjudicator_revision": "v1",
                "source_judge_results": source_results,
            })

    write_json(root, "analysis/analysis-v1/adjudication-plan.json", {
        "schema_version": 1,
        "benchmark_id": BENCHMARK_ID,
        "plan_revision": "v1",
        "jobs": plan_jobs,
        "notes": "Generated deterministically from digest-bound disagreements among every frozen task judge.",
    })
    return sum(1 for _path in (root / "grader-runs").glob("*/*/terminal.json"))


def build(root: Path, *, compact: bool = False, prefinalize: bool = False) -> dict[str, object]:
    if root.exists():
        raise lib.InputError(f"{root}: output already exists")
    if not root.is_absolute() or PROFILE not in root.parents:
        raise lib.InputError(f"output must be an absolute descendant of {PROFILE}")
    root.mkdir(parents=True)
    packet_relative = root.relative_to(PROFILE).as_posix()
    judges = ["judge-01", "judge-02"] if compact else JUDGES
    adjudicators = ADJUDICATORS

    attempt_shape = 2 if compact else 6
    protocol_shape = f"{attempt_shape} frozen attempts, {len(judges)} model judges, and distinct disagreement adjudication."
    (root / "protocol.md").write_text(f"# P2.17 synthetic release replay\n\n{protocol_shape}\n", encoding="utf-8")
    (root / "prompts").mkdir()
    (root / "prompts/task.txt").write_text("Return the frozen synthetic state.\n", encoding="utf-8")
    (root / "prompts/grader.txt").write_text("Grade the blinded item using the supplied schema only.\n", encoding="utf-8")
    output_schema = {
        "type": "object",
        "required": ["status", "score", "criterion_results"],
        "properties": {
            "status": {"enum": ["passed", "failed"]},
            "score": {"type": "number", "minimum": 0, "maximum": 1},
            "criterion_results": {
                "type": "array", "minItems": 1, "maxItems": 1,
                "items": {
                    "type": "object",
                    "required": ["criterion_id", "status", "score", "rationale"],
                    "properties": {
                        "criterion_id": {"const": "correct"},
                        "status": {"enum": ["passed", "failed"]},
                        "score": {"type": "number", "minimum": 0, "maximum": 1},
                        "rationale": {"type": "string", "minLength": 1},
                    },
                    "additionalProperties": False,
                },
            },
        },
        "additionalProperties": False,
    }
    write_json(root, "schemas/grader-output.schema.json", output_schema)
    for name, value in {
        "good": {"status": "passed"}, "bad": {"status": "failed"},
        "defect": {"status": "failed", "defect": True}, "boundary": {"score": 0.5},
        "malformed": {"malformed": True},
    }.items():
        write_json(root, f"fixtures/grader/{name}.json", value)

    task = {
        "schema_version": 1,
        "benchmark_id": BENCHMARK_ID,
        "task_id": "task-1",
        "revision": "v1",
        "stratum": "synthetic-release",
        "prompt_path": "prompts/task.txt",
        "fixture_path": None,
        "grader_ids": judges,
        "timeout_seconds": 60,
        "network_access": "denied",
        "mutable_state_paths": [],
        "required_artifact_paths": [],
        "forbidden_path_prefixes": [],
    }
    write_json(root, "tasks/task-1.json", task)
    write_json(root, "conditions/control.json", condition("control", "control"))
    write_json(root, "conditions/candidate.json", condition("candidate", "single"))
    for grader_id in [*judges, *adjudicators]:
        write_json(root, f"graders/{grader_id}.json", grader(grader_id))

    rows: list[dict[str, object]] = []
    position = 0
    for repetition in range(1, 2 if compact else 4):
        for condition_id in ("control", "candidate"):
            position += 1
            rows.append({
                "schema_version": 1,
                "benchmark_id": BENCHMARK_ID,
                "schedule_revision": "v1",
                "schedule_mode": "comparative",
                "attempt_id": f"attempt-{condition_id}-{repetition}",
                "task_id": "task-1",
                "condition_id": condition_id,
                "repetition": repetition,
                "block": repetition,
                "order_position": position,
                "wave": 1,
                "worker_slot": position,
                "retry_of": None,
            })
    write_jsonl(root, "schedule.jsonl", rows)
    analysis_plan = {
        "schema_version": 1,
        "blind_seed": 217,
        "adjudicator_ids": adjudicators,
        "adjudication_plan_revision": "v1",
        "required_grade_keys": [],
        "required_adjudication_keys": [],
        "control": "control",
        "candidate": "candidate",
        "direction": "higher",
        "practical_threshold": 0.1,
        "noninferiority_margin": 0.1,
        "seed": 23,
        "bootstrap_draws": 500,
        "confidence_level": 0.95,
        "alternative": "two-sided",
        "alpha": 0.05,
        "sample_scope": "observed-task-set",
        "quality_veto": False,
        "integrity_veto": False,
        "inferential_gate_frozen": True,
        "multiplicity": {
            "family_id": "p2.17-release",
            "family_size": 1,
            "hypothesis_index": 1,
            "method": "none",
            "prespecified": True,
        },
    }
    write_json(root, "analysis-plan.json", analysis_plan)

    large_log_evidence: dict[str, object] | None = None
    for index, row in enumerate(rows, 1):
        attempt_id = str(row["attempt_id"])
        base = f"attempts/{attempt_id}"
        assigned = f"2026-09-04T06:00:{index * 3:02d}Z"
        started = f"2026-09-04T06:00:{index * 3 + 1:02d}Z"
        ended = f"2026-09-04T06:00:{index * 3 + 2:02d}Z"
        write_json(root, f"{base}/assignment.json", {**row, "assigned_at": assigned, "request_id": "frozen-execution", "stage": "execute"})
        write_json(root, f"{base}/started.json", {
            "schema_version": 1, "benchmark_id": BENCHMARK_ID, "attempt_id": attempt_id,
            "agent_id": f"measured-agent-{index}", "runtime_started_at": started,
            "published_at": ended, "source": "synthetic immutable Fabric result projection",
        })
        log_path = None
        if index == 1:
            large_log_evidence = archive_large_replay_log(root, base, attempt_id)
            log_path = large_log_evidence["path"]
        observation_path = f"{base}/mechanism-observation.json"
        write_json(root, observation_path, {
            "schema_version": 1,
            "source": "deterministic-fake-non-scoring",
            "attempt_id": attempt_id,
            "actor_expected": False,
            "actor_observed": False,
        })
        mechanism = {
            "schema_version": 1,
            "benchmark_id": BENCHMARK_ID,
            "attempt_id": attempt_id,
            "valid": True,
            "reason": "mechanism-not-applicable",
            "detail": None,
            "evidence": [observation_path],
            "status": "not-applicable",
            "qualifiers": ["control"] if row["condition_id"] == "control" else [],
            "condition_role": "control" if row["condition_id"] == "control" else "candidate",
            "actor_expected": False,
            "actor_observed": False,
            "actor_lifecycle": {"create": False, "terminal": False, "cleanup": False},
            "attempt_status": "succeeded",
            "predicate": "synthetic attempt terminal exists",
            "exposure": "not-applicable",
            "source_state": "not-applicable",
            "source_path": None,
            "source_sha256": None,
            "log_scan_path": large_log_evidence["scan_path"] if index == 1 and large_log_evidence is not None else None,
        }
        write_json(root, f"{base}/mechanism.json", mechanism)
        artifact_paths = [observation_path, f"{base}/mechanism.json"]
        if large_log_evidence is not None and index == 1:
            artifact_paths.extend([
                str(large_log_evidence["path"]),
                str(large_log_evidence["archive_receipt_path"]),
                str(large_log_evidence["scan_path"]),
            ])
        terminal = {
            "schema_version": 1,
            "benchmark_id": BENCHMARK_ID,
            "schedule_revision": "v1",
            "attempt_id": attempt_id,
            "task_id": row["task_id"],
            "condition_id": row["condition_id"],
            "repetition": row["repetition"],
            "wave": row["wave"],
            "worker_slot": row["worker_slot"],
            "retry_of": None,
            "stage": "execute",
            "status": "succeeded",
            "qualifiers": [],
            "failure": None,
            "startup_state": "started",
            "assigned_at": assigned,
            "started_at": started,
            "terminal_at": ended,
            "requested_runtime": "pi",
            "resolved_runner": "pi",
            "requested_model": None,
            "resolved_model": "fake-measured-model",
            "observed_model": None,
            "fabric_result": {
                "agent_id": f"measured-agent-{index}",
                "status": "completed",
                "model": "fake-measured-model",
                "session_id": f"measured-session-{index}",
                "output": f"synthetic-{row['condition_id']}-{row['repetition']}",
                "error": None,
                "usage": {
                    "input_tokens": 10,
                    "output_tokens": 5,
                    "cache_read_tokens": 0,
                    "cache_write_tokens": 0,
                    "cost_usd": None,
                    "provider_native": {},
                },
                "turns": 1,
                "tool_calls": [],
                "started_at": started,
                "ended_at": ended,
                "provider_native": {"aggregate_tool_call_count": 0, "nested_agents": []},
            },
            "log_path": log_path,
            "session_path": None,
            "process_evidence_path": None,
            "mechanism_evidence_path": f"{base}/mechanism.json",
            "artifact_paths": artifact_paths,
        }
        write_json(root, f"{base}/terminal.json", terminal)

    (root / "seals").mkdir()
    design_owned = [
        "protocol.md", "tasks", "conditions", "graders", "prompts", "schemas",
        "fixtures", "schedule.jsonl", "analysis-plan.json",
    ]
    verify_seal.create_seal(
        root=root, seal="seals/design-v1", benchmark_id=BENCHMARK_ID,
        seal_type="design", revision="design-v1", previous_revision=None,
        created_at=CREATED_AT, owned_paths=design_owned,
    )
    write_json(root, "execution-marker.json", {"schema_version": 1, "status": "frozen"})
    verify_seal.create_seal(
        root=root, seal="seals/execution-v1", benchmark_id=BENCHMARK_ID,
        seal_type="execution", revision="execution-v1", previous_revision=None,
        created_at=CREATED_AT, owned_paths=["execution-marker.json"],
    )
    verify_seal.create_seal(
        root=root, seal="seals/raw-v1", benchmark_id=BENCHMARK_ID,
        seal_type="raw-freeze", revision="raw-v1", previous_revision=None,
        created_at=CREATED_AT, owned_paths=["attempts"],
    )

    design_sha = digest(root / "seals/design-v1/manifest.json")
    execution_sha = digest(root / "seals/execution-v1/manifest.json")
    for grader_id in [*judges, *adjudicators]:
        write_json(root, f"preflight/grader-timeouts/{grader_id}.json", {
            "schema_version": 1,
            "status": "passed",
            "benchmark_id": BENCHMARK_ID,
            "grader_id": grader_id,
            "grader_revision": "v1",
            "requested_timeout_ms": 60000,
            "effective_timeout_ms": 60000,
            "design_revision": "design-v1",
            "design_manifest_sha256": design_sha,
            "execution_revision": "execution-v1",
            "execution_manifest_sha256": execution_sha,
        })

    schedule_sha = digest(root / "schedule.jsonl")
    private_map, public_map = generate_blind_map.generate_blind_maps(rows, seed=217, schedule_sha256=schedule_sha)
    judge_call_ids = [
        f"{blind['blind_id']}-{grader_id}-v1"
        for blind in private_map["rows"]
        for grader_id in judges
    ]
    adjudication_call_ids = [] if compact else [
        f"{blind['blind_id']}-{grader_id}-v1"
        for blind in private_map["rows"]
        for grader_id in adjudicators
    ]
    all_call_ids = [*judge_call_ids, *adjudication_call_ids]

    runtime = runtime_capability()
    write_json(root, "preflight/runtime-capability.json", runtime)
    write_json(root, "preflight/protected-state.json", {
        "schema_version": 1,
        "status": "compatible",
        "capability_id": runtime["capability_id"],
        "project_root": str(PROFILE),
        "protected_absolute_roots": ["/home/balauru/.pi/agent"],
        "actor_state_root": None,
        "conflicts": [],
        "required_request_cwd": str(PROFILE),
    })
    write_json(root, "preflight/budget-ledger.json", make_budget(all_call_ids))

    prep_id = "replay-prepare"
    adjudicate_id = "replay-adjudicate"
    finalize_id = "replay-finalize"
    judge_batches = [judge_call_ids[index:index + 100] for index in range(0, len(judge_call_ids), 100)]
    plans: dict[str, dict[str, object]] = {}
    requests: dict[str, dict[str, object]] = {
        "prepare": request(root, packet_relative, prep_id, "prepare", 100, 32, None),
    }
    request_order = ["prepare"]
    predecessor = f"analysis/analysis-v1/checkpoints/{prep_id}/receipt.json"
    for index, batch in enumerate(judge_batches, 1):
        name = f"judge-{index}"
        request_id = f"replay-judge-{index}"
        plan_path = f"replay/call-plans/{name}.json"
        plans[plan_path] = make_plan(name, "judge", batch, predecessor)
        write_json(root, plan_path, plans[plan_path])
        requests[name] = request(
            root, packet_relative, request_id, "judge", len(batch), min(32, len(batch)), plan_path,
        )
        request_order.append(name)
        predecessor = f"analysis/analysis-v1/checkpoints/{request_id}/receipt.json"
    if adjudication_call_ids:
        plans["replay/call-plans/adjudicate.json"] = make_plan(
            "adjudicate", "adjudicate", adjudication_call_ids, predecessor,
        )
        write_json(root, "replay/call-plans/adjudicate.json", plans["replay/call-plans/adjudicate.json"])
        requests["adjudicate"] = request(
            root, packet_relative, adjudicate_id, "adjudicate",
            len(adjudication_call_ids), min(32, len(adjudication_call_ids)),
            "replay/call-plans/adjudicate.json",
        )
        request_order.append("adjudicate")
    requests["finalize"] = request(root, packet_relative, finalize_id, "finalize", 1, 1, None)
    request_order.append("finalize")
    for name, value in requests.items():
        write_json(root, f"replay/requests/{name}.json", value)

    prefinalize_terminal_count = 0
    if prefinalize:
        prefinalize_terminal_count = populate_prefinalize_fixture(
            root, rows=rows, private_map=private_map, public_map=public_map,
            judges=judges, adjudicators=adjudicators, plans=plans, requests=requests,
            design_sha=design_sha, execution_sha=execution_sha,
        )

    metadata = {
        "schema_version": 1,
        "benchmark_id": BENCHMARK_ID,
        "packet_path": packet_relative,
        "attempt_count": len(rows),
        "judge_model_call_count": len(judge_call_ids),
        "adjudication_model_call_count": len(adjudication_call_ids),
        "total_model_call_count": len(all_call_ids),
        "judge_wave_counts": [len(batch) for batch in judge_batches],
        "large_log_evidence": large_log_evidence,
        "request_order": request_order,
        "call_ids_sha256": lib.sha256_bytes(lib.canonical_json_bytes(all_call_ids)),
    }
    if prefinalize:
        metadata["prefinalize_terminal_count"] = prefinalize_terminal_count
    write_json(root, "replay/metadata.json", metadata)
    return metadata


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--compact-interruption-fixture", action="store_true")
    parser.add_argument("--pre-finalize-fixture", action="store_true")
    parser.add_argument("--execute-mechanism-fixture", action="store_true")
    parser.add_argument("--execute-resume-fixture", action="store_true")
    args = parser.parse_args()
    try:
        execute_modes = int(args.execute_mechanism_fixture) + int(args.execute_resume_fixture)
        if execute_modes > 1 or (execute_modes and (args.compact_interruption_fixture or args.pre_finalize_fixture)):
            raise lib.InputError("Execute fixture modes are exclusive and cannot be combined with Analyze fixture modes")
        value = (
            build_mechanism_fixture(args.root.resolve()) if args.execute_mechanism_fixture else
            build_resume_fixture(args.root.resolve()) if args.execute_resume_fixture else
            build(args.root.resolve(), compact=args.compact_interruption_fixture, prefinalize=args.pre_finalize_fixture)
        )
    except lib.BenchmarkError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    sys.stdout.buffer.write(lib.canonical_json_bytes(value))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
