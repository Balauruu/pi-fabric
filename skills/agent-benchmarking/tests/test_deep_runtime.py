#!/usr/bin/env python3
"""Focused regressions for deep-stage runtime discovery and CLI mechanics."""

from __future__ import annotations

import contextlib
import io
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import benchmark_lib as lib
import deep_stage

FABRIC_ROOT = Path("/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric")
PI_ROOT = Path("/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent")


class DeepRuntimeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="deep-runtime-tests-")
        self.temp = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_json(self, name: str, value: object) -> Path:
        path = self.temp / name
        path.write_bytes(lib.canonical_json_bytes(value))
        return path

    def test_doctor_derives_installed_versions_guard_log_shape_and_mesh(self) -> None:
        capability = deep_stage.doctor_runtime(FABRIC_ROOT, PI_ROOT)
        document = capability.document()
        self.assertEqual(document["fabric_version"], lib.load_json(FABRIC_ROOT / "package.json")["version"])
        self.assertEqual(document["pi_version"], lib.load_json(PI_ROOT / "package.json")["version"])
        self.assertLessEqual(document["effective_max_calls"], 100)
        self.assertFalse(document["recursive_custom_cwd"])
        pattern = re.compile(document["temporary_log_pattern"])
        self.assertIsNotNone(pattern.fullmatch("/tmp/pi-fabric-runs-abc/agent-id/events.jsonl"))
        self.assertIsNone(pattern.fullmatch("/tmp/pi-fabric-runs-abc/events.jsonl"))
        self.assertIsNone(pattern.fullmatch("/tmp/pi-fabric-runs-abc/agent-id/nested/events.jsonl"))
        self.assertEqual(document["actor_mesh_default_root"], ".pi/fabric/mesh")
        self.assertEqual(document["actor_mesh_root_env"], "PI_FABRIC_MESH_ROOT")
        self.assertTrue(any("actor-mesh-default" in item for item in document["evidence"]))
        self.assertTrue(any("actor-mesh-env" in item for item in document["evidence"]))
        self.assertEqual(document["output_bounds"], {
            "max_output_chars": 50000,
            "max_nested_result_chars": 2000000,
            "max_failure_model_output_chars": 20000,
            "execution_details_max_bytes": 524288,
            "execution_trace_max_bytes": 524288,
        })
        self.assertEqual(document["event_log_bounds"], {
            "max_event_line_chars": 4194304, "max_stderr_chars": 20000,
        })
        self.assertTrue({"task", "model", "timeoutMs", "recursive", "cwd", "schema"}.issubset(
            document["supported_agent_request_fields"]
        ))
        self.assertTrue({"status", "text", "usage", "logFile", "startedAt", "finishedAt"}.issubset(
            document["supported_agent_result_fields"]
        ))
        self.assertTrue(any("max_output_chars" in item for item in document["evidence"]))
        self.assertTrue(any("FabricAgentRequest" in item for item in document["evidence"]))
        self.assertTrue(any("FabricAgentResult" in item for item in document["evidence"]))

    def test_101_calls_partition_and_descendants_consume_each_cap(self) -> None:
        plans = deep_stage.partition_call_ids(
            benchmark_id="bench",
            stage="judge",
            call_ids=[f"j-{index}" for index in range(101)],
            max_concurrency=4,
        )
        self.assertEqual([item["max_calls"] for item in plans], [100, 1])
        reserved = deep_stage.partition_call_ids(
            benchmark_id="bench",
            stage="execute",
            call_ids=[f"a-{index}" for index in range(100)],
            max_concurrency=4,
            declared_descendant_calls=1,
        )
        self.assertEqual(sum(item["max_calls"] for item in reserved), 100)
        self.assertEqual(sum(item["reserved_descendant_calls"] for item in reserved), 1)
        self.assertTrue(all(item["reserved_calls"] <= 100 for item in reserved))

    def test_budget_reserves_direct_descendant_and_cost_before_launch(self) -> None:
        rows = [
            {
                "reservation_id": "attempt-wave-1",
                "traffic": "attempt",
                "direct_calls": 3,
                "declared_descendant_calls": 2,
                "projected_cost": "1.25",
            },
            {
                "reservation_id": "judge-wave-1",
                "traffic": "judge",
                "direct_calls": 1,
                "declared_descendant_calls": 0,
                "projected_cost": "0.25",
            },
        ]
        ledger = deep_stage.reserve_launch_budget(rows, maximum_calls=6, maximum_cost="2.00")
        self.assertEqual(ledger["reserved_direct_calls"], 4)
        self.assertEqual(ledger["reserved_descendant_calls"], 2)
        self.assertEqual(ledger["reserved_calls"], 6)
        self.assertEqual(ledger["reserved_cost"], "1.50")
        self.assertTrue(ledger["launch_allowed"])
        with self.assertRaisesRegex(lib.ContractError, "direct plus descendant"):
            deep_stage.reserve_launch_budget(rows, maximum_calls=5, maximum_cost="2.00")
        with self.assertRaisesRegex(lib.ContractError, "projected cost"):
            deep_stage.reserve_launch_budget(rows, maximum_calls=6, maximum_cost="1.49")

    def test_new_schemas_are_strict_and_validate_generated_documents(self) -> None:
        project = self.temp / "project"
        (project / ".pi").mkdir(parents=True)
        documents = {
            "runtime-capability": deep_stage.doctor_runtime(FABRIC_ROOT, PI_ROOT).document(),
            "call-plan": deep_stage.make_call_plan(
                benchmark_id="bench", stage="judge", call_ids=["j-1"],
                max_concurrency=1, declared_descendant_calls=1,
            ),
            "protected-state": deep_stage.check_protected_state_compatibility(
                recursive=True, cwd=None, project_root=project,
                protected_relative=[".pi"], actor_state_root=None,
            ),
            "budget-ledger": deep_stage.reserve_launch_budget(
                [{
                    "reservation_id": "r-1", "traffic": "canary",
                    "direct_calls": 1, "declared_descendant_calls": 0,
                    "projected_cost": "0",
                }],
                maximum_calls=1, maximum_cost="0",
            ),
        }
        for name, document in documents.items():
            schema = lib.load_json(ROOT / "schemas" / f"{name}.schema.json")
            self.assertEqual(lib.check_schema(schema, machine_contract=True), [], name)
            self.assertEqual(lib.validate_json_schema(document, schema), [], name)

        capability_schema = lib.load_json(ROOT / "schemas/runtime-capability.schema.json")
        original = documents["runtime-capability"]
        tampered_documents = []
        for field in ("output_bounds", "event_log_bounds", "supported_agent_request_fields", "supported_agent_result_fields"):
            tampered = json.loads(json.dumps(original))
            del tampered[field]
            tampered_documents.append(tampered)
        tampered = json.loads(json.dumps(original))
        tampered["output_bounds"]["unowned_limit"] = 1
        tampered_documents.append(tampered)
        tampered = json.loads(json.dumps(original))
        tampered["supported_agent_result_fields"].append(tampered["supported_agent_result_fields"][0])
        tampered_documents.append(tampered)
        for tampered in tampered_documents:
            self.assertTrue(lib.validate_json_schema(tampered, capability_schema))

    def test_all_subcommands_accept_create_only_output(self) -> None:
        project = self.temp / "project"
        (project / ".pi").mkdir(parents=True)
        archive_root = self.temp / "archive"
        archive_root.mkdir()
        run_root = Path(tempfile.mkdtemp(prefix="pi-fabric-runs-", dir="/tmp"))
        agent_root = run_root / "agent-id"
        agent_root.mkdir()
        events = agent_root / "events.jsonl"
        events.write_bytes(lib.canonical_json_bytes({"event_type": "actor create"}))
        inputs = {
            "plan": self.write_json("plan.json", {
                "benchmark_id": "b", "stage": "judge", "call_ids": ["j-1"],
                "max_concurrency": 1,
            }),
            "protect": self.write_json("protect.json", {
                "recursive": True, "cwd": None, "project_root": str(project),
                "protected_relative": [".pi"], "actor_state_root": None,
            }),
            "telemetry": self.write_json("telemetry.json", {
                "id": "r", "usage": {
                    "input": 1, "output": 1, "cacheRead": 0,
                    "cacheWrite": 0, "cost": 0,
                },
            }),
            "resume": self.write_json("resume.json", [
                {"attempt_id": "a", "assignment": False, "terminal": None},
            ]),
            "budget": self.write_json("budget.json", {
                "maximum_calls": 1, "maximum_cost": "0",
                "reservations": [{
                    "reservation_id": "r", "traffic": "attempt",
                    "direct_calls": 1, "declared_descendant_calls": 0,
                    "projected_cost": "0",
                }],
            }),
            "transaction": self.write_json("all-transaction.json", {
                "attempt": "complete", "judge": "complete",
                "adjudicate": "complete", "finalize": "ready",
            }),
        }
        invocations = {
            "doctor": ["doctor", "--fabric-root", str(FABRIC_ROOT), "--pi-root", str(PI_ROOT)],
            "plan": ["plan", "--input", str(inputs["plan"])],
            "protect": ["protect", "--input", str(inputs["protect"])],
            "archive": [
                "archive", "--source", str(events), "--root", str(archive_root),
                "--relative", "events.jsonl",
            ],
            "scan": ["scan", "--input", str(events)],
            "telemetry": ["telemetry", "--input", str(inputs["telemetry"])],
            "resume": ["resume", "--input", str(inputs["resume"])],
            "budget": ["budget", "--input", str(inputs["budget"])],
            "transaction": ["transaction", "--input", str(inputs["transaction"])],
        }
        try:
            for name, invocation in invocations.items():
                output = self.temp / f"{name}.out.json"
                self.assertEqual(deep_stage.main([*invocation, "--output", str(output)]), lib.EXIT_OK, name)
                self.assertIsInstance(lib.load_json(output), dict, name)
        finally:
            events.unlink(missing_ok=True)
            agent_root.rmdir()
            run_root.rmdir()

    def test_subcommands_publish_optional_output_create_only(self) -> None:
        commands = set(deep_stage._parser()._subparsers._group_actions[0].choices)
        self.assertEqual(
            commands,
            {"doctor", "plan", "protect", "archive", "scan", "telemetry", "resume", "budget", "transaction"},
        )
        request = self.write_json("transaction.json", {
            "attempt": "complete", "judge": "complete",
            "adjudicate": "complete", "finalize": "ready",
        })
        output = self.temp / "transaction-output.json"
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(deep_stage.main(["transaction", "--input", str(request), "--output", str(output)]), lib.EXIT_OK)
            original = output.read_bytes()
            self.assertEqual(deep_stage.main(["transaction", "--input", str(request), "--output", str(output)]), lib.EXIT_INVALID)
        self.assertEqual(output.read_bytes(), original)
        self.assertTrue(lib.load_json(output)["can_finalize"])


if __name__ == "__main__":
    unittest.main()
