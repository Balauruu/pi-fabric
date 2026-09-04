#!/usr/bin/env python3
"""Focused reconciliation tests for first-class disagreement adjudication."""

from __future__ import annotations

import copy
import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import benchmark_lib as lib
import reconcile_lifecycle


NOW = "2026-09-02T00:00:00Z"
STARTED = "2026-09-02T00:00:01Z"
ENDED = "2026-09-02T00:00:02Z"


class AdjudicationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="adjudication-tests-")
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_json(self, relative: str, value: object) -> Path:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(lib.canonical_json_bytes(value))
        return path

    def write_jsonl(self, relative: str, values: list[object]) -> Path:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(lib.canonical_jsonl_bytes(values))
        return path

    @staticmethod
    def grader(grader_id: str) -> dict[str, object]:
        return {
            "schema_version": 1,
            "benchmark_id": "bench",
            "grader_id": grader_id,
            "revision": "v1",
            "kind": "model",
            "blind": True,
            "criteria": [{
                "criterion_id": "correct",
                "description": "The final state is correct.",
                "evidence_type": "judgment",
                "weight": 1,
                "fatal": False,
            }],
            "fixtures": {
                "known_good": ["fixtures/good.json"],
                "known_bad": ["fixtures/bad.json"],
                "isolated_defect": ["fixtures/defect.json"],
                "boundary": ["fixtures/boundary.json"],
                "malformed": ["fixtures/malformed.json"],
            },
            "prompt_path": "prompts/grader.txt",
            "output_schema_path": "schemas/result.json",
            "model": {"requested": "m", "resolved": "m", "observed": "m"},
            "provider_native": {},
        }

    @staticmethod
    def grade(grader_id: str, *, stage: str, passed: bool) -> dict[str, object]:
        status = "passed" if passed else "failed"
        score = 1 if passed else 0
        return {
            "schema_version": 1,
            "benchmark_id": "bench",
            "attempt_id": "a1",
            "blind_id": "blind-1",
            "grader_id": grader_id,
            "grader_revision": "v1",
            "grader_run_id": f"run-{grader_id}",
            "stage": stage,
            "status": status,
            "qualifiers": ["model-terminal"],
            "failure": None,
            "score": score,
            "criterion_results": [{
                "criterion_id": "correct",
                "status": status,
                "score": score,
                "rationale": "fixture decision",
            }],
            "evidence_paths": ["evidence/grade.txt"],
            "graded_at": ENDED,
            "provider_native": {
                "requested_model": "m",
                "resolved_model": "m",
                "observed_model": "m",
            },
        }

    def build_packet(self) -> dict[str, object]:
        row = {
            "schema_version": 1,
            "benchmark_id": "bench",
            "schedule_revision": "v1",
            "schedule_mode": "single-condition-smoke",
            "attempt_id": "a1",
            "task_id": "task-1",
            "condition_id": "condition-1",
            "repetition": 1,
            "block": 1,
            "order_position": 1,
            "wave": 1,
            "worker_slot": 1,
            "retry_of": None,
        }
        self.write_jsonl("schedule.jsonl", [row])
        mechanism_source = self.write_json("attempts/a1/mechanism.source", {"observed": True})
        self.write_json("attempts/a1/mechanism.json", {
            "schema_version": 1, "benchmark_id": "bench", "attempt_id": "a1",
            "valid": True, "reason": "mechanism-observed", "detail": None,
            "evidence": ["attempts/a1/mechanism.source"], "status": "valid",
            "qualifiers": ["non-actor-mechanism"], "condition_role": "candidate",
            "actor_expected": False, "actor_observed": False,
            "actor_lifecycle": {"create": False, "terminal": False, "cleanup": False},
            "attempt_status": "succeeded", "predicate": "fixture source exists", "exposure": "forced",
            "source_state": "file", "source_path": "attempts/a1/mechanism.source",
            "source_sha256": lib.sha256_file(mechanism_source), "log_scan_path": None,
        })
        terminal = {
            "schema_version": 1,
            "benchmark_id": "bench",
            "schedule_revision": "v1",
            "attempt_id": "a1",
            "task_id": "task-1",
            "condition_id": "condition-1",
            "repetition": 1,
            "wave": 1,
            "worker_slot": 1,
            "retry_of": None,
            "stage": "execute",
            "status": "succeeded",
            "qualifiers": [],
            "failure": None,
            "startup_state": "started",
            "assigned_at": NOW,
            "started_at": STARTED,
            "terminal_at": ENDED,
            "requested_runtime": "pi",
            "resolved_runner": "pi",
            "requested_model": "m",
            "resolved_model": "m",
            "observed_model": "m",
            "fabric_result": {
                "agent_id": "agent-a1",
                "status": "completed",
                "model": "m",
                "session_id": "session-a1",
                "output": "done",
                "error": None,
                "usage": {
                    "input_tokens": 1,
                    "output_tokens": 1,
                    "cache_read_tokens": 0,
                    "cache_write_tokens": 0,
                    "cost_usd": None,
                    "provider_native": {},
                },
                "turns": 1,
                "tool_calls": [],
                "started_at": STARTED,
                "ended_at": ENDED,
                "provider_native": {},
            },
            "log_path": None,
            "session_path": None,
            "process_evidence_path": None,
            "mechanism_evidence_path": "attempts/a1/mechanism.json",
            "artifact_paths": ["attempts/a1/mechanism.source", "attempts/a1/mechanism.json"],
        }
        self.write_json("attempts/a1/terminal.json", terminal)
        assigned = dict(row, event_type="assigned", sequence=1, assigned_at=NOW)
        started = dict(
            row, event_type="started", sequence=2, started_at=STARTED,
            agent_id="agent-a1",
        )
        terminal_event = dict(terminal, event_type="terminal", sequence=3)
        self.write_jsonl("events.jsonl", [assigned, started, terminal_event])
        self.write_jsonl("ledger.jsonl", [terminal])
        self.write_json("evidence/grade.txt", {"evidence": True})
        self.write_json(
            "tasks/task-1.json",
            {
                "schema_version": 1,
                "benchmark_id": "bench",
                "task_id": "task-1",
                "revision": "v1",
                "stratum": "unit",
                "prompt_path": "prompts/task.txt",
                "fixture_path": None,
                "grader_ids": ["judge-1", "judge-2"],
                "timeout_seconds": 60,
                "network_access": "denied",
                "mutable_state_paths": [],
                "required_artifact_paths": [],
                "forbidden_path_prefixes": [],
            },
        )
        self.write_json("analysis-plan.json", {"adjudicator_ids": ["adjudicator-1"]})
        for grader_id in ("judge-1", "judge-2", "adjudicator-1"):
            self.write_json(f"graders/{grader_id}.json", self.grader(grader_id))

        judge_one = self.grade("judge-1", stage="judge", passed=True)
        judge_two = self.grade("judge-2", stage="judge", passed=False)
        adjudication = self.grade("adjudicator-1", stage="adjudicate", passed=True)
        grades = [judge_one, judge_two, adjudication]
        for grade in grades:
            base = f"grader-runs/blind-1/{grade['grader_id']}-v1"
            self.write_json(f"{base}/result.json", grade)

        source_rows = []
        for grade in (judge_one, judge_two):
            relative = f"grader-runs/blind-1/{grade['grader_id']}-v1/result.json"
            source_rows.append({
                "grader_id": grade["grader_id"],
                "grader_revision": "v1",
                "result_path": relative,
                "result_digest": lib.sha256_file(self.root / relative),
            })
        plan = {
            "schema_version": 1,
            "benchmark_id": "bench",
            "plan_revision": "v1",
            "jobs": [{
                "attempt_id": "a1",
                "blind_id": "blind-1",
                "task_id": "task-1",
                "adjudicator_id": "adjudicator-1",
                "adjudicator_revision": "v1",
                "source_judge_results": source_rows,
            }],
            "notes": None,
        }
        self.write_json("adjudication-plan.json", plan)

        adjudication_base = "grader-runs/blind-1/adjudicator-1-v1"
        self.write_json(f"{adjudication_base}/request.json", {"job": "adjudicate"})
        raw_path = self.write_json(f"{adjudication_base}/result.raw.json", {"text": "pass"})
        assignment = {
            "schema_version": 1,
            "benchmark_id": "bench",
            "plan_revision": "v1",
            "attempt_id": "a1",
            "task_id": "task-1",
            "blind_id": "blind-1",
            "grader_id": "adjudicator-1",
            "grader_revision": "v1",
            "stage": "adjudicate",
            "assigned_at": NOW,
            "request_path": f"{adjudication_base}/request.json",
            "runtime_capability_binding": None,
            "call_plan_binding": None,
            "traffic_class": "adjudication",
            "delta_seal_references": [],
        }
        self.write_json(f"{adjudication_base}/assignment.json", assignment)
        result_path = self.root / f"{adjudication_base}/result.json"
        adjudication_terminal = {
            "schema_version": 1,
            "benchmark_id": "bench",
            "plan_revision": "v1",
            "attempt_id": "a1",
            "task_id": "task-1",
            "blind_id": "blind-1",
            "grader_id": "adjudicator-1",
            "grader_revision": "v1",
            "stage": "adjudicate",
            "status": "passed",
            "terminal_at": ENDED,
            "result_path": f"{adjudication_base}/result.json",
            "result_sha256": lib.sha256_file(result_path),
            "raw_path": f"{adjudication_base}/result.raw.json",
            "raw_sha256": lib.sha256_file(raw_path),
            "log_path": None,
        }
        self.write_json(f"{adjudication_base}/terminal.json", adjudication_terminal)
        self.write_jsonl("grades.jsonl", grades)

        usage = {
            "input_tokens": 1,
            "output_tokens": 1,
            "cache_read_tokens": 0,
            "cache_write_tokens": 0,
            "cost_usd": None,
            "provider_native": {},
        }
        self.write_jsonl("telemetry.jsonl", [{
            "schema_version": 1,
            "benchmark_id": "bench",
            "attempt_id": "a1",
            "estimate_version": None,
            "parent": {
                "agent_id": "agent-a1",
                "parent_agent_id": None,
                "session_id": "session-a1",
                "requested_model": "m",
                "resolved_model": "m",
                "observed_model": "m",
                "direct_usage": usage,
                "tool_calls": [],
                "latency_ms": 1000,
                "provider_native": {},
            },
            "children": [],
            "child_ownership": [],
            "subtree_usage": usage,
        }])
        return {
            "plan": plan,
            "grades": grades,
            "assignment": assignment,
            "terminal": adjudication_terminal,
        }

    def reconcile(self, expected_graders: tuple[str, ...] = ()) -> dict[str, object]:
        argv = [
            "--root", str(self.root),
            "--adjudication-plan", "adjudication-plan.json",
            "--strict-completion",
        ]
        for identity in expected_graders:
            argv.extend(("--expected-grader", identity))
        args = reconcile_lifecycle._parser().parse_args(argv)
        return reconcile_lifecycle.reconcile(args)

    def test_schemas_are_strict_and_legacy_task_grader_contracts_remain_valid(self) -> None:
        for name in (
            "task", "grader", "adjudication-plan", "adjudication-assignment",
            "adjudication-terminal",
        ):
            with self.subTest(name=name):
                schema = lib.load_json(ROOT / f"schemas/{name}.schema.json")
                self.assertEqual(lib.check_schema(schema, machine_contract=True), [])

        packet = self.build_packet()
        task = lib.load_json(self.root / "tasks/task-1.json")
        grader = lib.load_json(self.root / "graders/judge-1.json")
        self.assertEqual(
            lib.validate_json_schema(task, lib.load_json(ROOT / "schemas/task.schema.json")),
            [],
        )
        self.assertEqual(
            lib.validate_json_schema(grader, lib.load_json(ROOT / "schemas/grader.schema.json")),
            [],
        )
        self.assertNotIn("adjudicator_ids", task)
        self.assertNotIn("stage", grader)
        self.assertIsNotNone(packet)

    def test_strict_plan_reconciles_exact_disagreement_lifecycle(self) -> None:
        self.build_packet()
        result = self.reconcile(("judge-1@v1", "judge-2@v1", "adjudicator-1@v1"))
        self.assertEqual(result["issues"], [])
        self.assertEqual(result["completion_blockers"], [])
        self.assertTrue(result["complete"])

    def test_adjudicator_must_be_in_frozen_design_roster(self) -> None:
        self.build_packet()
        self.write_json("analysis-plan.json", {"adjudicator_ids": []})
        result = self.reconcile(("judge-1@v1", "judge-2@v1", "adjudicator-1@v1"))
        joined = "\n".join(result["issues"])
        self.assertIn("absent from frozen analysis plan", joined)
        self.assertIn("non-frozen identities: adjudicator-1@v1", joined)
        self.assertFalse(result["complete"])

    def test_plan_does_not_replace_required_normal_judges(self) -> None:
        packet = self.build_packet()
        grades = [row for row in packet["grades"] if row["grader_id"] != "judge-2"]
        self.write_jsonl("grades.jsonl", grades)
        result = self.reconcile()
        self.assertFalse(result["complete"])
        self.assertTrue(any("lacks judge judge-2@v1" in item for item in result["completion_blockers"]))

    def test_plan_rejects_non_disagreement_and_source_path_or_digest_drift(self) -> None:
        packet = self.build_packet()
        grades = copy.deepcopy(packet["grades"])
        grades[1]["status"] = "passed"
        grades[1]["score"] = 1
        grades[1]["criterion_results"][0]["status"] = "passed"
        grades[1]["criterion_results"][0]["score"] = 1
        self.write_jsonl("grades.jsonl", grades)
        self.write_json("grader-runs/blind-1/judge-2-v1/result.json", grades[1])
        plan = copy.deepcopy(packet["plan"])
        plan["jobs"][0]["source_judge_results"][0]["result_path"] = "wrong/result.json"
        plan["jobs"][0]["source_judge_results"][1]["result_digest"] = "0" * 64
        self.write_json("adjudication-plan.json", plan)
        result = self.reconcile()
        joined = "\n".join(result["issues"])
        self.assertIn("result_path is not canonical", joined)
        self.assertIn("result digest mismatch", joined)
        self.assertIn("does not identify a judge disagreement", joined)

    def test_exact_adjudication_artifacts_reject_missing_extra_and_digest_mismatch(self) -> None:
        packet = self.build_packet()
        (self.root / "grader-runs/blind-1/adjudicator-1-v1/assignment.json").unlink()
        terminal = copy.deepcopy(packet["terminal"])
        terminal["result_sha256"] = "0" * 64
        self.write_json("grader-runs/blind-1/adjudicator-1-v1/terminal.json", terminal)
        self.write_json("grader-runs/extra/other-v1/result.json", {"stage": "adjudicate"})
        result = self.reconcile()
        joined_issues = "\n".join(result["issues"])
        joined_blockers = "\n".join(result["completion_blockers"])
        self.assertIn("immutable adjudication assignment is missing", joined_blockers)
        self.assertIn("sha256 mismatch", joined_issues)
        self.assertIn("unexpected grader lifecycle artifact bundle", joined_issues)

    def test_null_result_and_stage_or_identity_mismatch_cannot_complete(self) -> None:
        packet = self.build_packet()
        self.write_json("grader-runs/blind-1/adjudicator-1-v1/result.json", None)
        assignment = copy.deepcopy(packet["assignment"])
        assignment["stage"] = "judge"
        self.write_json("grader-runs/blind-1/adjudicator-1-v1/assignment.json", assignment)
        terminal = copy.deepcopy(packet["terminal"])
        terminal["attempt_id"] = "other-attempt"
        self.write_json("grader-runs/blind-1/adjudicator-1-v1/terminal.json", terminal)
        result = self.reconcile()
        joined = "\n".join(result["issues"])
        self.assertIn("terminal adjudication result must be non-null", joined)
        self.assertIn("assignment stage disagrees with plan job", joined)
        self.assertIn("terminal attempt_id disagrees with adjudication job", joined)
        self.assertFalse(result["complete"])


if __name__ == "__main__":
    unittest.main()
