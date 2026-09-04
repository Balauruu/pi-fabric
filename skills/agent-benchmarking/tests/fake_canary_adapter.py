"""Deterministic CaptureAdapter used only by canary failpoint/lifecycle tests."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Mapping, Sequence

import benchmark_lib as lib
import run_canaries


class FakeCanaryAdapter:
    production = False

    def __init__(self, root: Path, fixture_root: Path):
        self.evidence_root = root / "runtime-canaries"
        self.root = self.evidence_root / "runtime-raw"
        self.fixture_root = fixture_root
        self.root.mkdir(parents=True)
        self._captures: dict[str, Mapping[str, Any]] = {}
        for canary_id in run_canaries.RUNTIME_ASSERTIONS:
            self._captures[canary_id] = self._build(canary_id)

    @staticmethod
    def _usage(scale: int = 1) -> dict[str, object]:
        return {"input": 10 * scale, "output": 2 * scale, "cacheRead": 1, "cacheWrite": 0, "cost": 0.01 * scale}

    def _result(self, canary_id: str, index: int, payload: Mapping[str, Any], *, failed: bool = False) -> dict[str, Any]:
        agent_id = f"fake-{canary_id}-{index}"
        result: dict[str, Any] = {
            "id": agent_id, "name": agent_id,
            "task": f"fake task {canary_id}",
            "status": "failed" if failed else "completed",
            "runner": "veda" if failed else "pi", "transport": "process",
            "cwd": f"/tmp/fake-workspace-{canary_id}-{index}",
            "model": "test-provider/test-model",
            "startedAt": 1_788_494_040_000 + index * 100,
            "finishedAt": 1_788_494_040_050 + index * 100,
            "turns": 0 if failed else 1, "toolCalls": 0, "text": "",
            "usage": self._usage(index),
            "logFile": f"/tmp/pi-fabric-runs-fake/{agent_id}/events.jsonl",
            "sessionId": f"fake-session-{canary_id}-{index}",
        }
        if failed:
            result["error"] = "spawn veda ENOENT"
        else:
            nonce = f"{canary_id}-fabric-probe-{index}"
            result["value"] = {"request_id": canary_id, "nonce": nonce, "payload": dict(payload)}
        return result

    @staticmethod
    def _log(result: Mapping[str, Any], *, observed_prompt: str | None = None, include_start: bool = True, extra: object = None, operation_events: Sequence[Mapping[str, Any]] = ()) -> dict[str, Any]:
        parsed: list[dict[str, Any]] = []
        if include_start:
            parsed.append({"type": "agent_start"})
        if observed_prompt is not None:
            parsed.append({"type": "message_start", "message": {"role": "user", "content": [{"type": "text", "text": observed_prompt}]}})
        parsed.append({"type": "message_start", "message": {"role": "assistant", "provider": "test-provider", "model": "test-model", "content": []}})
        if extra is not None:
            parsed.append({"type": "fixture-extra", "value": extra})
        parsed.extend(dict(row) for row in operation_events)
        return {
            "id": result["id"], "runDirectory": str(Path(str(result["logFile"])).parent),
            "logFile": result["logFile"], "status": dict(result),
            "events": [{"offset": index, "raw": lib.canonical_json_bytes(row).decode(), "parsed": row} for index, row in enumerate(parsed)],
            "hasMore": False,
        }

    def _payload(self, canary_id: str, index: int) -> dict[str, Any]:
        if canary_id == "condition-loading":
            return {
                "received_as_literal": False, "instruction_mode": "inline-bundle",
                "nonce_echo": "condition-control", "condition_sha256": lib.sha256_file(self.fixture_root.parent.parent.parent / "SKILL.md"),
            }
        if canary_id in {"mechanism-nested", "token-cost-attribution", "runtime-model-identity"}:
            child = self._result(canary_id, 9, {"nonce_echo": "child"})
            child["text"] = "child-token-1"
            return {
                "child_id": child["id"], "child_token": "child-token-1",
                "parent_transform_suffix": "-used", "parent_consumed_value": "child-token-1-used",
                "child_result": child,
            }
        if canary_id == "fresh-parent-sessions":
            return {"file_value": f"fresh-parent-sessions-fabric-probe-{index}"}
        if canary_id == "blind-map-isolation":
            return {"nonce_echo": f"blind-map-isolation-fabric-probe-{index}"}
        if canary_id == "primary-source-grading":
            return {"decision": "entailed", "quote": "A cryptographic hash function"}
        return {"request_sha256": lib.sha256_file(self.fixture_root / f"{canary_id}.request.json"), "nonce_echo": f"nonce-{index}"}

    def _build(self, canary_id: str) -> Mapping[str, Any]:
        root = self.root / canary_id
        (root / "runs").mkdir(parents=True)
        count = 2 if canary_id == "fresh-parent-sessions" else 1
        if canary_id == "primary-source-grading":
            source = root / "workspaces/primary-source.html"
            source.parent.mkdir(parents=True)
            source.write_text("A cryptographic hash function maps a bit string of arbitrary finite length to a bit string of fixed length.", encoding="utf-8")
        runs = []
        for index in range(1, count + 1):
            failed = canary_id == "supervisor-prelaunch-failure"
            payload = self._payload(canary_id, index)
            result = self._result(canary_id, index, payload, failed=failed)
            if canary_id == "fresh-parent-sessions":
                workspace = root / "workspaces" / f"parent-{index}"
                workspace.mkdir(parents=True, exist_ok=True)
                (workspace / f"parent-{index}.sentinel.txt").write_text(str(payload["file_value"]), encoding="utf-8")
                result["cwd"] = str(workspace.resolve())
                result["toolCalls"] = 1
            run_task = f"/skill:agent-benchmarking fake task {canary_id}" if canary_id == "condition-loading" else str(result["task"])
            if canary_id == "blind-map-isolation":
                run_task = 'Grade only this public row {"blind_id":"b1","task_id":"t1","item_path":"blinded/b1.json"}. Use no tools. In payload return only nonce_echo.'
            elif canary_id == "fresh-parent-sessions":
                run_task = f"Write fresh-parent-sessions-fabric-probe-{index} to parent-{index}.sentinel.txt. In payload return only file_value."
            result["task"] = run_task
            prompt = '<skill name="agent-benchmarking">expanded</skill>' if canary_id == "condition-loading" else f"fake task {canary_id}"
            operation_events: list[Mapping[str, Any]] = []
            if canary_id == "fresh-parent-sessions":
                command = f"printf '%s' 'fresh-parent-sessions-fabric-probe-{index}' > parent-{index}.sentinel.txt"
                operation_events = [
                    {"type": "tool_execution_start", "toolName": "bash", "args": {"command": command}},
                    {"type": "tool_execution_end", "toolName": "bash", "result": {"content": [{"type": "text", "text": str(payload['file_value'])}]}},
                ]
            log = self._log(
                result, observed_prompt=prompt, include_start=not failed,
                extra=payload.get("child_id") if isinstance(payload, Mapping) else None,
                operation_events=operation_events,
            )
            run_root = root / "runs" / str(result["id"])
            run_root.mkdir()
            for name, value in {
                "events.jsonl": b'{"type":"agent_start"}\n',
                "lifecycle.jsonl": b'{"version":1,"event":"pi.agent_start"}\n' if not failed else b"",
                "status.json": lib.canonical_json_bytes(result),
                "task.txt": run_task.encode(),
            }.items():
                (run_root / name).write_bytes(value)
            runs.append({
                "purpose": f"parent-{index}", "assignment_sequence": index * 4 - 3,
                "call_sequence": index * 4 - 2, "terminal_sequence": index * 4,
                "task": run_task,
                "result": result, "log": log,
                "archived_paths": [f"runs/{result['id']}/{name}" for name in ("events.jsonl", "lifecycle.jsonl", "status.json", "task.txt")],
            })
        if canary_id == "condition-loading":
            (root / "condition-SKILL.md").write_bytes((self.fixture_root.parent.parent.parent / "SKILL.md").read_bytes())
        capture = {
            "schema_version": 1, "adapter": "deterministic-fake", "canary_id": canary_id,
            "request_fixture": f"{canary_id}.request.json",
            "request_sha256": lib.sha256_file(self.fixture_root / f"{canary_id}.request.json"),
            "captured_at": "2026-09-04T00:00:00Z", "runs": runs,
        }
        (root / "capture.json").write_bytes(lib.canonical_json_bytes(capture))
        return capture

    def capture(self, canary_id: str) -> Mapping[str, Any]:
        return self._captures[canary_id]

    def source_paths(self, canary_id: str) -> Sequence[Path]:
        return sorted(path for path in (self.root / canary_id).rglob("*") if path.is_file())
