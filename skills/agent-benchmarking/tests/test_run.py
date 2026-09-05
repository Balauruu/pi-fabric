#!/usr/bin/env python3
"""Behavioral WP1/WP2 tests for the file-backed run/report interface."""

from __future__ import annotations

import copy
import json
import os
import sys
import tempfile
import threading
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
FIXTURE = ROOT / "tests" / "fixtures" / "refactor" / "minimal-deterministic"
sys.path.insert(0, os.fspath(SCRIPTS))

import benchmark_lib as lib  # noqa: E402
import lifecycle_store as lifecycle  # noqa: E402
import run as runner  # noqa: E402


class Crash(BaseException):
    pass


def load_fixture_spec() -> dict:
    return json.loads((FIXTURE / "spec.json").read_text(encoding="utf-8"))


def fake_schedule(request: dict) -> dict:
    spec = request["resolvedSpec"]
    rows = []
    block_index = 0
    for task in spec["tasks"]:
        for repetition in range(1, spec["design"]["repetitions"] + 1):
            block_index += 1
            order = list(spec["design"]["conditionOrder"])
            if block_index % 2 == 0:
                order.reverse()
            for position, condition_id in enumerate(order, 1):
                attempt = len(rows) + 1
                rows.append(
                    {
                        "attemptId": f"a-{attempt:06d}",
                        "taskId": task["id"],
                        "conditionId": condition_id,
                        "repetition": repetition,
                        "blockId": f"b-{block_index:06d}",
                        "blockIndex": block_index,
                        "orderPosition": position,
                        "retryOf": None,
                    }
                )
    return {
        "schemaVersion": 1,
        "experimentId": spec["experimentId"],
        "assignment": {
            **copy.deepcopy(spec["design"]["assignment"]),
            "conditionOrder": list(spec["design"]["conditionOrder"]),
        },
        "rows": rows,
    }


def fake_grade(request: dict) -> dict:
    grades = []
    expected = request["gradingPlan"]["deterministic"]["expectedByTask"]
    for item in request["items"]:
        assignment = item["assignment"]
        result = item["result"]
        native = result["nativeResult"]
        observed = native.get("text", native.get("output", native.get("value")))
        correct = str(observed).strip() == str(expected[assignment["taskId"]]).strip()
        attempt_id = assignment["attemptId"]
        grades.append(
            {
                "schemaVersion": 1,
                "gradeId": f"grade-{attempt_id}-objective",
                "attemptId": attempt_id,
                "stage": "deterministic",
                "method": "deterministic",
                "graderId": "exact-text",
                "blindedItemId": None,
                "status": "valid",
                "labels": [
                    {
                        "criterionId": "correct",
                        "label": "correct" if correct else "incorrect",
                        "score": 1 if correct else 0,
                        "uncertainty": None,
                        "rationale": "fixture exact match",
                    }
                ],
                "nativeResultPath": None,
                "error": None,
            }
        )
    return {"schemaVersion": 1, "status": "complete", "grades": grades, "jobs": [], "errors": []}


def fake_telemetry(request: dict) -> dict:
    return {
        "schemaVersion": 1,
        "attempts": copy.deepcopy(request["attempts"]),
        "totals": {"attempts": len(request["attempts"])},
        "limitations": [],
    }


def fake_analysis(request: dict) -> dict:
    return {
        "schemaVersion": 1,
        "status": "complete",
        "paired": {"rowCount": len(request["dataset"]["rows"])},
        "inference": {},
        "multiplicity": {},
        "sensitivities": [],
        "diagnostics": [],
        "limitations": [],
        "scientificDecision": "inconclusive",
    }


def fake_model(request: dict) -> dict:
    return {
        "schemaVersion": 1,
        "status": "complete",
        "pairedResult": request["pairedResult"],
        "model": {},
        "diagnostics": [],
        "artifacts": [],
        "limitations": [],
    }


@contextmanager
def production_seams():
    with (
        mock.patch.object(lifecycle, "_generate_schedule", side_effect=fake_schedule),
        mock.patch.object(lifecycle, "_grade", side_effect=fake_grade),
        mock.patch.object(lifecycle, "_aggregate_telemetry", side_effect=fake_telemetry),
        mock.patch.object(lifecycle, "_analyze", side_effect=fake_analysis),
        mock.patch.object(lifecycle, "_analyze_model", side_effect=fake_model),
    ):
        yield


def write_spec(directory: Path, spec: dict, name: str = "spec.json") -> Path:
    path = directory / name
    path.write_text(json.dumps(spec, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return path.resolve()


def request_for(spec_path: Path, run_dir: Path) -> dict:
    return {"specPath": os.fspath(spec_path.resolve()), "outputDirectory": os.fspath(run_dir.absolute())}


def file_snapshot(root: Path) -> dict[str, tuple[bytes, int]]:
    if not root.exists():
        return {}
    return {
        os.fspath(path.relative_to(root)): (path.read_bytes(), path.stat().st_mtime_ns)
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def scalable_spec(total_calls: int) -> dict:
    spec = load_fixture_spec()
    factors = next(
        ((tasks, total_calls // tasks) for tasks in range(1, total_calls + 1) if total_calls % tasks == 0 and total_calls // tasks >= 2),
        None,
    )
    assert factors is not None
    task_count, condition_count = factors
    spec["experimentId"] = f"calls-{total_calls}"
    spec["tasks"] = []
    expected = {}
    for index in range(task_count):
        task_id = f"task-{index + 1}"
        expected[task_id] = "ok"
        spec["tasks"].append(
            {
                "id": task_id,
                "prompt": f"Return only ok for task {index + 1}.",
                "weight": 1,
                "family": None,
                "stratum": None,
                "inputPaths": [],
                "outcomeDefinition": "Exact text ok.",
            }
        )
    spec["grading"]["deterministic"]["expectedByTask"] = expected
    spec["conditions"] = []
    for index in range(condition_count):
        condition_id = f"condition-{index + 1}"
        spec["conditions"].append(
            {
                "id": condition_id,
                "runner": "pi",
                "model": "fixture-model",
                "instructions": "Return the exact requested text.",
                "instructionPaths": [],
                "tools": [],
                "settings": {},
                "intervention": f"Condition {index + 1}.",
            }
        )
    condition_ids = [item["id"] for item in spec["conditions"]]
    spec["design"]["conditionOrder"] = condition_ids
    spec["design"]["concurrency"]["max"] = min(7, total_calls)
    contrast = spec["analysis"]["contrasts"][0]
    contrast["candidateConditionId"] = condition_ids[1]
    contrast["controlConditionId"] = condition_ids[0]
    hypotheses = [f"{contrast['id']}.accepted"]
    spec["analysis"]["multiplicity"]["hypothesisIds"] = hypotheses
    spec["analysis"]["sequential"] = {
        "method": "fixed-sample",
        "maxTasks": task_count,
        "looks": [{"id": "final", "completeTasks": task_count, "alphaByHypothesis": {hypotheses[0]: 0.05}}],
        "stopOn": "final-look",
    }
    spec["stoppingAndBudgets"]["maxTasks"] = task_count
    spec["stoppingAndBudgets"]["maxDirectCalls"] = total_calls
    return spec


class CountingDispatch:
    def __init__(self, response=None):
        self.calls = []
        self._lock = threading.Lock()
        self.response = response

    def __call__(self, request: dict) -> dict:
        with self._lock:
            self.calls.append(copy.deepcopy(request))
            index = len(self.calls)
        if callable(self.response):
            return self.response(request, index)
        if self.response is not None:
            return copy.deepcopy(self.response)
        return {
            "id": f"fake-{index}",
            "status": "completed",
            "text": "ok",
            "usage": {"input": 1, "output": 1, "cacheRead": 0, "cacheWrite": 0, "cost": 0},
            "logFile": None,
        }


class RunLifecycleTests(unittest.TestCase):
    def assert_public(self, value: dict) -> None:
        schema = lib.load_json(ROOT / "schemas" / "result.schema.json")
        self.assertEqual([], lib.validate_json_schema(value, schema))

    def test_minimal_objective_file_only_run_report_and_completed_rerun(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            run_dir = root / "run"

            def result_for(request: dict, index: int) -> dict:
                prompt = request["prompt"]
                candidate = "carefully" in request["instructions"]
                if "2 and 3" in prompt:
                    text = "5" if candidate else "4"
                else:
                    text = "BLUE"
                return {
                    "id": f"native-{index}",
                    "status": "completed",
                    "text": text,
                    "turns": 1,
                    "toolCalls": 0,
                    "usage": {"input": 3, "output": 1, "cacheRead": 0, "cacheWrite": 0, "cost": 0},
                    "logFile": None,
                }

            dispatch = CountingDispatch(result_for)
            publication_order = []
            original_publish_bytes = lifecycle._publish_bytes

            def traced_publish(path: Path, data: bytes) -> bool:
                if path.name in {"report.md", "report.json"}:
                    publication_order.append(path.name)
                return original_publish_bytes(path, data)

            with mock.patch.object(lifecycle, "_publish_bytes", side_effect=traced_publish):
                result = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assert_public(result)
            self.assertEqual("complete", result["status"])
            self.assertEqual(4, len(dispatch.calls))
            self.assertEqual(["report.md", "report.json"], publication_order[-2:])
            self.assertFalse(any(name in json.dumps(lib.load_json(run_dir / "spec.json")) for name in ("protected", "softwareIdentity", "component", "environmentInventory")))
            for attempt in sorted((run_dir / "attempts").iterdir()):
                self.assertTrue((attempt / "assignment.json").is_file())
                self.assertTrue((attempt / "result.json").is_file())
                self.assertTrue((attempt / "terminal.json").is_file())
            self.assertFalse((run_dir / ".run.lock").exists())

            before_report = file_snapshot(run_dir)
            with mock.patch.object(lifecycle.importlib, "import_module", side_effect=AssertionError("report imported a backend")):
                inspected = runner.report({"outputDirectory": os.fspath(run_dir), "format": "markdown"})
            self.assertEqual("complete", inspected["status"])
            self.assertEqual(before_report, file_snapshot(run_dir))

            rerun_dispatch = CountingDispatch()
            rerun = runner.run(request_for(spec_path, run_dir), dispatch=rerun_dispatch)
            self.assertEqual("complete", rerun["status"])
            self.assertEqual([], rerun_dispatch.calls)
            self.assertEqual(before_report, file_snapshot(run_dir))

    def test_minimal_run_uses_the_shared_schedule_grade_telemetry_and_analysis_interfaces(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())

            def response(request: dict, index: int) -> dict:
                if "2 and 3" in request["prompt"]:
                    text = "5" if "carefully" in request["instructions"] else "4"
                else:
                    text = "BLUE"
                return {
                    "id": f"native-{index}",
                    "status": "completed",
                    "text": text,
                    "usage": {"input": 1, "output": 1, "cacheRead": 0, "cacheWrite": 0, "cost": 0},
                    "logFile": None,
                }

            dispatch = CountingDispatch(response)
            result = runner.run(request_for(spec_path, root / "run"), dispatch=dispatch)
            self.assertEqual("complete", result["status"])
            self.assertEqual(4, len(dispatch.calls))
            report_document = lib.load_json(root / "run" / "report.json")
            self.assertEqual("complete", report_document["analysis"]["status"])
            self.assertEqual(4, len(report_document["dataset"]["rows"]))
            self.assertEqual(4, len(report_document["grades"]))

    def test_205_jobs_cross_the_internal_100_call_ceiling(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, scalable_spec(205))
            run_dir = root / "run"
            dispatch = CountingDispatch()
            request = request_for(spec_path, run_dir)
            first = runner.run(request, dispatch=dispatch)
            self.assertEqual("checkpoint", first["status"])
            self.assertEqual(100, len(dispatch.calls))
            second = runner.run(request, dispatch=dispatch)
            self.assertEqual("checkpoint", second["status"])
            self.assertEqual(200, len(dispatch.calls))
            third = runner.run(request, dispatch=dispatch)
            self.assertEqual("complete", third["status"])
            self.assertEqual(205, len(dispatch.calls))
            self.assertEqual(205, len({item["attemptId"] for item in map(lib.load_json, (run_dir / "attempts").glob("*/assignment.json"))}))
            before = file_snapshot(run_dir)
            fourth = runner.run(request, dispatch=dispatch)
            self.assertEqual("complete", fourth["status"])
            self.assertEqual(205, len(dispatch.calls))
            self.assertEqual(before, file_snapshot(run_dir))

    def test_fixed_guest_internal_bridge_uses_the_same_records_and_helper_interfaces(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            spec = load_fixture_spec()
            for condition in spec["conditions"]:
                condition["settings"] = {}
            spec_path = write_spec(root, spec)
            run_dir = root / "run"
            request = request_for(spec_path, run_dir)
            calls = 0
            final = None
            while final is None or final["status"] == "checkpoint":
                token = None
                while True:
                    admission = runner.internal_admit(
                        request,
                        token=token,
                        requested_call_ceiling=2,
                        configured_call_ceiling=2,
                        usable_call_ceiling=None,
                        fresh_invocation=True,
                    )
                    token = admission["invocationToken"]
                    if not admission["jobs"]:
                        final = admission["public"]
                        break
                    for job in admission["jobs"]:
                        calls += 1
                        text = "5" if "2 and 3" in job["request"]["prompt"] else "BLUE"
                        result_path = run_dir / ".bridge" / token / f"{job['workId']}.json"
                        result_path.parent.mkdir(parents=True, exist_ok=True)
                        result_path.write_text(json.dumps({"native": {"status": "completed", "text": text, "logFile": None}}) + "\n")
                        publication = runner.internal_publish_result(
                            spec_path=spec_path,
                            run_dir=run_dir,
                            token=token,
                            attempt_id=job["workId"],
                            result_path=result_path,
                        )
                        self.assertEqual("checkpoint", publication["public"]["status"])
                    checkpoint = runner.internal_checkpoint(spec_path=spec_path, run_dir=run_dir, token=token)
                    self.assertEqual("checkpoint", checkpoint["public"]["status"])
            self.assertEqual("complete", final["status"])
            self.assertEqual(4, calls)
            self.assertTrue((run_dir / "report.json").is_file())
            self.assertFalse((run_dir / ".run.lock").exists())

    def test_optional_blinded_judges_and_declared_adjudication_use_the_same_bounded_run(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            spec = load_fixture_spec()
            (root / "judge-calibration.json").write_text('{"knownGood":"correct","knownBad":"incorrect"}\n', encoding="utf-8")
            spec["grading"] = {
                "method": "model",
                "rubric": "Label the outcome correct only when it satisfies the frozen task definition.",
                "scoreMapping": [{"label": "incorrect", "score": 0}, {"label": "correct", "score": 1}],
                "deterministic": None,
                "judgment": {
                    "graderIds": ["judge-1", "judge-2"],
                    "runner": "pi",
                    "model": "fixture-judge",
                    "rubric": "Judge only the blinded outcome evidence.",
                    "calibrationInputPaths": ["judge-calibration.json"],
                    "labelSet": ["incorrect", "correct"],
                    "repetitions": 1,
                    "retainUncertainty": True,
                },
                "adjudication": {
                    "enabled": True,
                    "trigger": "declared-disagreement",
                    "resolverIds": ["resolver-1"],
                    "maxCalls": 4,
                    "precedence": "resolver",
                },
            }
            spec["stoppingAndBudgets"]["maxDirectCalls"] = 16
            spec_path = write_spec(root, spec)
            blind_counts = {}

            def response(request: dict, index: int) -> dict:
                prompt = request["prompt"]
                if "Return exactly one JSON object" not in prompt:
                    text = "5" if "2 and 3" in prompt else "BLUE"
                    return {"status": "completed", "text": text, "logFile": None}
                marker = '"blindedItemId":"'
                blind = prompt.split(marker, 1)[1].split('"', 1)[0]
                if '"labels":[' in prompt.split("INPUT", 1)[-1]:
                    label = "correct"
                else:
                    count = blind_counts.get(blind, 0)
                    blind_counts[blind] = count + 1
                    label = "correct" if count == 0 else "incorrect"
                payload = {
                    "labels": [
                        {
                            "criterionId": "outcome",
                            "label": label,
                            "uncertainty": 0.1,
                            "rationale": "fixture judgment",
                        }
                    ]
                }
                return {"status": "completed", "text": json.dumps(payload), "logFile": None}

            dispatch = CountingDispatch(response)
            run_dir = root / "run"
            result = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assertEqual("complete", result["status"], result)
            self.assertEqual(16, len(dispatch.calls))
            self.assertEqual(8, len(lib.load_json(run_dir / "grading" / "judge-plan.json")["jobs"]))
            self.assertEqual(4, len(lib.load_json(run_dir / "grading" / "adjudicate-plan.json")["jobs"]))
            self.assertEqual(12, len(list((run_dir / "grading").glob("grade-*.json"))))
            before = len(dispatch.calls)
            self.assertEqual("complete", runner.run(request_for(spec_path, run_dir), dispatch=dispatch)["status"])
            self.assertEqual(before, len(dispatch.calls))

    def test_below_at_and_above_hard_call_ceiling_boundaries(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            for total in (99, 100, 101):
                spec_path = write_spec(root, scalable_spec(total), f"spec-{total}.json")
                run_dir = root / f"run-{total}"
                dispatch = CountingDispatch()
                first = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
                self.assertEqual("complete" if total <= 100 else "checkpoint", first["status"])
                self.assertEqual(min(total, 100), len(dispatch.calls))
                if total > 100:
                    second = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
                    self.assertEqual("complete", second["status"])
                    self.assertEqual(total, len(dispatch.calls))

    def test_assignment_is_durable_before_every_dispatch(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            run_dir = root / "run"
            observed = []

            def response(request: dict, index: int) -> dict:
                assignment_paths = sorted((run_dir / "attempts").glob("*/assignment.json"))
                observed.append(len(assignment_paths))
                text = "5" if "2 and 3" in request["prompt"] else "BLUE"
                return {"status": "completed", "text": text, "logFile": None}

            result = runner.run(request_for(spec_path, run_dir), dispatch=CountingDispatch(response))
            self.assertEqual("complete", result["status"])
            self.assertEqual([1, 2, 3, 4], observed)

    def test_configured_and_usable_call_ceilings_are_lowered_and_unknown_remainder_refuses(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "5" if "2 and 3" in request["prompt"] else "BLUE", "logFile": None})
            dispatch.configured_call_ceiling = 3
            dispatch.usable_call_ceiling = 2
            result = runner.run(request_for(spec_path, root / "bounded"), dispatch=dispatch)
            self.assertEqual("checkpoint", result["status"])
            self.assertEqual(2, len(dispatch.calls))

            unknown = CountingDispatch()
            unknown.fresh_invocation = False
            unsupported_dir = root / "unknown"
            unsupported = runner.run(request_for(spec_path, unsupported_dir), dispatch=unknown)
            self.assertEqual("unsupported", unsupported["status"])
            self.assertEqual("UNKNOWN_REMAINING_INVOCATION_BUDGET", unsupported["errors"][0]["code"])
            self.assertEqual([], unknown.calls)
            self.assertFalse((unsupported_dir / "attempts").exists())

    def test_assignment_without_result_is_never_replayed_even_after_manual_stale_lock_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            run_dir = root / "run"

            def crash(_: dict) -> dict:
                raise Crash("after assignment")

            with self.assertRaises(Crash):
                runner.run(request_for(spec_path, run_dir), dispatch=crash)
            assignments = list((run_dir / "attempts").glob("*/assignment.json"))
            self.assertEqual(1, len(assignments))
            self.assertFalse(assignments[0].with_name("result.json").exists())

            stale_token = lifecycle.acquire_lock(run_dir)
            blocked_calls = CountingDispatch()
            locked = runner.run(request_for(spec_path, run_dir), dispatch=blocked_calls)
            self.assertEqual("blocked", locked["status"])
            self.assertEqual("RUN_LOCKED", locked["errors"][0]["code"])
            lifecycle.release_lock(run_dir, stale_token)
            blocked = runner.run(request_for(spec_path, run_dir), dispatch=blocked_calls)
            self.assertEqual("blocked", blocked["status"])
            self.assertEqual("AMBIGUOUS_ASSIGNED_ATTEMPT", blocked["errors"][0]["code"])
            self.assertEqual([], blocked_calls.calls)

    def test_complete_saved_result_derives_terminal_without_replay(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            run_dir = root / "run"
            dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "5", "logFile": None})
            original = lifecycle.derive_terminal
            tripped = False

            def interrupt_once(*args, **kwargs):
                nonlocal tripped
                if not tripped:
                    tripped = True
                    raise Crash("after result publication")
                return original(*args, **kwargs)

            with mock.patch.object(lifecycle, "derive_terminal", side_effect=interrupt_once):
                with self.assertRaises(Crash):
                    runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            first = run_dir / "attempts" / "a-000001"
            self.assertTrue((first / "result.json").exists())
            self.assertFalse((first / "terminal.json").exists())
            calls_before = len(dispatch.calls)
            resumed = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assertEqual("complete", resumed["status"])
            self.assertTrue((first / "terminal.json").exists())
            self.assertEqual(3, len(dispatch.calls) - calls_before)

    def test_terminal_before_checkpoint_is_not_dispatched_twice(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            run_dir = root / "run"
            dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "5", "logFile": None})
            original = lifecycle._checkpoint
            tripped = False

            def interrupt_once(*args, **kwargs):
                nonlocal tripped
                if not tripped:
                    tripped = True
                    raise Crash("before checkpoint")
                return original(*args, **kwargs)

            with mock.patch.object(lifecycle, "_checkpoint", side_effect=interrupt_once):
                with self.assertRaises(Crash):
                    runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assertTrue((run_dir / "attempts" / "a-000001" / "terminal.json").exists())
            calls_before = len(dispatch.calls)
            result = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assertEqual("complete", result["status"])
            self.assertEqual(3, len(dispatch.calls) - calls_before)

    def test_retry_has_unique_linked_id_and_preserves_failed_parent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec = load_fixture_spec()
            spec["analysis"]["retryPolicy"] = {
                "estimand": "both",
                "maxRetries": 1,
                "eligibleStatuses": ["agent-failure"],
                "retainOriginal": True,
            }
            spec["stoppingAndBudgets"]["maxRetries"] = 1
            spec["stoppingAndBudgets"]["maxDirectCalls"] = 5
            spec_path = write_spec(root, spec)
            failed_once = False

            def response(request: dict, index: int) -> dict:
                nonlocal failed_once
                if not failed_once:
                    failed_once = True
                    return {"status": "failed", "error": "transient", "logFile": None}
                text = "5" if "2 and 3" in request["prompt"] else "BLUE"
                return {"status": "completed", "text": text, "logFile": None}

            dispatch = CountingDispatch(response)
            result = runner.run(request_for(spec_path, root / "run"), dispatch=dispatch)
            self.assertEqual("complete", result["status"])
            self.assertEqual(5, len(dispatch.calls))
            run_dir = root / "run"
            parent_terminal = lib.load_json(run_dir / "attempts" / "a-000001" / "terminal.json")
            retry_assignment = lib.load_json(run_dir / "attempts" / "a-000001-retry-01" / "assignment.json")
            self.assertEqual("agent-failure", parent_terminal["status"])
            self.assertEqual("a-000001", retry_assignment["retryOf"])
            self.assertNotEqual(retry_assignment["attemptId"], retry_assignment["retryOf"])

    def test_frozen_input_copies_detect_source_change_without_dispatch(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            source_input = root / "fixture.txt"
            source_input.write_text("first\n", encoding="utf-8")
            spec = load_fixture_spec()
            spec["tasks"][0]["inputPaths"] = ["fixture.txt"]
            spec_path = write_spec(root, spec)
            dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "5", "logFile": None})
            dispatch.configured_call_ceiling = 1
            run_dir = root / "run"
            first = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assertEqual("checkpoint", first["status"])
            saved = lib.load_json(run_dir / "spec.json")
            self.assertEqual(["inputs/fixture.txt"], saved["tasks"][0]["inputPaths"])
            self.assertEqual(b"first\n", (run_dir / "inputs" / "fixture.txt").read_bytes())
            source_input.write_text("changed\n", encoding="utf-8")
            no_call = CountingDispatch()
            resumed = runner.run(request_for(spec_path, run_dir), dispatch=no_call)
            self.assertEqual("blocked", resumed["status"])
            self.assertEqual("SPEC_MISMATCH", resumed["errors"][0]["code"])
            self.assertEqual([], no_call.calls)

    def test_large_native_log_is_archived_and_malformed_native_result_is_terminal(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            log_path = root / "native.jsonl"
            log_path.write_bytes((b'{"event":"x"}\n' * 150000))
            spec_path = write_spec(root, load_fixture_spec())
            call = 0

            def response(request: dict, index: int):
                nonlocal call
                call += 1
                if call == 1:
                    return {
                        "id": "native-full",
                        "status": "completed",
                        "text": "5",
                        "usage": {"input": 9, "output": 1, "cacheRead": 2, "cacheWrite": 0, "cost": 0.01},
                        "turns": 2,
                        "toolCalls": 1,
                        "logFile": os.fspath(log_path),
                    }
                if call == 2:
                    return ["malformed"]
                return {"status": "completed", "text": "BLUE", "logFile": None}

            dispatch = CountingDispatch(response)
            result = runner.run(request_for(spec_path, root / "run"), dispatch=dispatch)
            self.assertEqual("complete", result["status"])
            self.assertLess(len(json.dumps(result)), 5000)
            run_dir = root / "run"
            saved_result = lib.load_json(run_dir / "attempts" / "a-000001" / "result.json")
            self.assertEqual("native-full", saved_result["nativeResult"]["id"])
            archive = run_dir / saved_result["nativeLog"]["path"]
            self.assertEqual(log_path.read_bytes(), archive.read_bytes())
            malformed = lib.load_json(run_dir / "attempts" / "a-000002" / "result.json")
            terminal = lib.load_json(run_dir / "attempts" / "a-000002" / "terminal.json")
            self.assertEqual("MALFORMED_NATIVE_RESULT", malformed["error"]["code"])
            self.assertEqual("infrastructure-failure", terminal["status"])

    def test_report_on_incomplete_run_is_byte_for_byte_read_only(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            run_dir = root / "run"
            dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "5", "logFile": None})
            dispatch.configured_call_ceiling = 1
            self.assertEqual("checkpoint", runner.run(request_for(spec_path, run_dir), dispatch=dispatch)["status"])
            before = file_snapshot(run_dir)
            inspected = runner.report({"outputDirectory": os.fspath(run_dir), "format": "json"})
            self.assertEqual("checkpoint", inspected["status"])
            self.assertEqual("inspect", inspected["phase"])
            self.assertEqual(before, file_snapshot(run_dir))

    def test_strict_cross_field_validation_precedes_mutation_and_version_labels_are_irrelevant(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            invalid = load_fixture_spec()
            invalid["analysis"]["randomization"]["inferenceContract"] = "task-vector-v1"
            invalid["stoppingAndBudgets"]["maxTasks"] = 99
            invalid["protection"] = {}
            spec_path = write_spec(root, invalid)
            dispatch = CountingDispatch()
            run_dir = root / "run"
            result = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assertEqual("failed", result["status"])
            self.assertEqual("INVALID_SPEC", result["errors"][0]["code"])
            self.assertEqual([], dispatch.calls)
            self.assertFalse(run_dir.exists())

            valid_path = write_spec(root, load_fixture_spec(), "valid.json")
            for label in (None, "not-a-version", "0.1.0", "999.999.999"):
                candidate_dir = root / f"version-{str(label).replace('/', '_')}"
                candidate_dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "5" if "2 and 3" in request["prompt"] else "BLUE", "logFile": None})
                candidate_dispatch.capabilities = {"agentsRun": True, "nativeResult": True, "versionLabel": label}
                completed = runner.run(request_for(valid_path, candidate_dir), dispatch=candidate_dispatch)
                self.assertEqual("complete", completed["status"])

    def test_declared_human_grading_without_label_channel_refuses_before_scored_dispatch(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            spec = load_fixture_spec()
            spec["grading"] = {
                "method": "human",
                "rubric": "Apply the frozen outcome definition.",
                "scoreMapping": [{"label": "incorrect", "score": 0}, {"label": "correct", "score": 1}],
                "deterministic": None,
                "judgment": {
                    "graderIds": ["human-1"],
                    "runner": "pi",
                    "model": "not-used",
                    "rubric": "Apply the frozen outcome definition.",
                    "calibrationInputPaths": [],
                    "labelSet": ["incorrect", "correct"],
                    "repetitions": 1,
                    "retainUncertainty": True,
                },
                "adjudication": {
                    "enabled": False,
                    "trigger": "never",
                    "resolverIds": [],
                    "maxCalls": 0,
                    "precedence": "not-applicable",
                },
            }
            spec_path = write_spec(root, spec)
            dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "unused", "logFile": None})
            run_dir = root / "run"
            result = runner.run(request_for(spec_path, run_dir), dispatch=dispatch)
            self.assertEqual("unsupported", result["status"])
            self.assertEqual("HUMAN_GRADING_INPUT_UNAVAILABLE", result["errors"][0]["code"])
            self.assertEqual([], dispatch.calls)
            self.assertFalse((run_dir / "attempts").exists())

    def test_cutover_advertises_one_fixed_runner_and_retires_old_active_assets(self) -> None:
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("workflows/benchmark.ts", skill)
        for obsolete in (
            "benchmark.source.ts",
            "artifact_store.ts",
            "deep_stage.py",
            "reconcile_lifecycle.py",
            "workflow-request.schema.json",
            "public-result.schema.json",
        ):
            self.assertNotIn(obsolete, skill)
        for path in (
            ROOT / "workflows" / "benchmark.source.ts",
            ROOT / "workflows" / "artifact_store.ts",
            ROOT / "scripts" / "deep_stage.py",
            ROOT / "scripts" / "reconcile_lifecycle.py",
            ROOT / "schemas" / "workflow-request.schema.json",
            ROOT / "schemas" / "public-result.schema.json",
        ):
            self.assertFalse(path.exists(), path)
        self.assertTrue((ROOT / "workflows" / "benchmark.ts").is_file())
        self.assertTrue((ROOT / "schemas" / "result.schema.json").is_file())

    def test_recursive_hard_cap_and_unknown_fixed_guest_setting_refuse_before_assignment(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            recursive = load_fixture_spec()
            recursive["conditions"][0]["settings"] = {"recursive": True, "hardDescendantCallLimit": 2}
            recursive_path = write_spec(root, recursive, "recursive.json")
            dispatch = CountingDispatch()
            unsupported = runner.run(request_for(recursive_path, root / "recursive-run"), dispatch=dispatch)
            self.assertEqual("unsupported", unsupported["status"])
            self.assertEqual("UNSUPPORTED_RECURSIVE_HARD_CAP", unsupported["errors"][0]["code"])
            self.assertFalse((root / "recursive-run" / "attempts").exists())

            unknown = load_fixture_spec()
            unknown["conditions"][0]["settings"] = {"temperature": 0}
            unknown_path = write_spec(root, unknown, "unknown.json")
            fixed = runner.internal_admit(
                request_for(unknown_path, root / "fixed-run"),
                token=None,
                requested_call_ceiling=100,
                configured_call_ceiling=100,
                usable_call_ceiling=None,
                fresh_invocation=True,
            )
            self.assertEqual("unsupported", fixed["public"]["status"])
            self.assertEqual("UNSUPPORTED_REQUEST_SETTING", fixed["public"]["errors"][0]["code"])
            self.assertFalse((root / "fixed-run").exists())

    def test_extra_or_contradictory_attempt_ids_prevent_false_completion(self) -> None:
        with tempfile.TemporaryDirectory() as temporary, production_seams():
            root = Path(temporary)
            spec_path = write_spec(root, load_fixture_spec())
            run_dir = root / "run"
            dispatch = CountingDispatch(lambda request, index: {"status": "completed", "text": "5", "logFile": None})
            dispatch.configured_call_ceiling = 1
            self.assertEqual("checkpoint", runner.run(request_for(spec_path, run_dir), dispatch=dispatch)["status"])
            extra = run_dir / "attempts" / "not-planned"
            extra.mkdir(parents=True)
            assignment = lib.load_json(run_dir / "attempts" / "a-000001" / "assignment.json")
            assignment["attemptId"] = "not-planned"
            lib.atomic_create_json(extra / "assignment.json", assignment)
            no_call = CountingDispatch()
            blocked = runner.run(request_for(spec_path, run_dir), dispatch=no_call)
            self.assertEqual("blocked", blocked["status"])
            self.assertTrue(any(error["code"] == "UNPLANNED_ATTEMPT" for error in blocked["errors"]))
            self.assertEqual([], no_call.calls)


if __name__ == "__main__":
    unittest.main()
