#!/usr/bin/env python3
"""Behavioral evidence for objective, blinded, and adjudicated grading."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
FIXTURES = ROOT / "tests" / "fixtures" / "grading"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import benchmark_lib as lib  # noqa: E402
import grade  # noqa: E402
import run as benchmark_run  # noqa: E402


def load(name: str):
    return lib.load_json(FIXTURES / name)


class DeterministicGradingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = load("deterministic-criteria.json")

    def test_reusable_five_class_matrix_grades_actual_outcomes(self) -> None:
        original = deepcopy(self.fixture)
        evidence = grade.validate_criterion_fixtures(
            self.fixture["gradingPlan"], self.fixture["fixtures"]
        )
        self.assertEqual(evidence["status"], "passed")
        self.assertEqual(
            {row["fixtureClass"] for row in evidence["cases"]},
            {"known-good", "known-bad", "isolated-defect", "boundary", "malformed"},
        )
        observed = {row["fixtureId"]: row for row in evidence["cases"]}
        self.assertEqual(observed["good-exact"]["score"], 1)
        self.assertEqual(observed["bad-value"]["score"], 0)
        self.assertEqual(observed["case-only-defect"]["score"], 0)
        self.assertEqual(observed["trim-boundary"]["score"], 1)
        self.assertEqual(observed["conflicting-native-fields"]["status"], "failed")
        self.assertEqual(self.fixture, original, "pure fixture grading mutated frozen input")

    def test_objective_phase_is_normal_zero_job_path(self) -> None:
        request = {
            "schemaVersion": 1,
            "phase": "deterministic",
            "gradingPlan": self.fixture["gradingPlan"],
            "items": [row["item"] for row in self.fixture["fixtures"][:4]],
        }
        original = deepcopy(request)
        result = grade.grade(request)
        self.assertEqual(result["status"], "complete")
        self.assertEqual(len(result["grades"]), 4)
        self.assertEqual(result["jobs"], [])
        self.assertEqual(request, original)
        self.assertTrue(all(row["blindedItemId"] is None for row in result["grades"]))

    def test_always_pass_and_always_fail_evaluators_are_rejected(self) -> None:
        plan = self.fixture["gradingPlan"]

        def constant(label: str, score: int):
            def evaluate(_plan, item):
                attempt_id = item["assignment"]["attemptId"]
                return {
                    "status": "valid",
                    "labels": [{"criterionId": "outcome", "label": label, "score": score}],
                    "attemptId": attempt_id,
                }
            return evaluate

        with self.assertRaisesRegex(grade.GradingContractError, "always-pass|known-good"):
            grade.validate_criterion_fixtures(
                plan, self.fixture["fixtures"], evaluator=constant("correct", 1)
            )
        with self.assertRaisesRegex(grade.GradingContractError, "always-fail|known-bad"):
            grade.validate_criterion_fixtures(
                plan, self.fixture["fixtures"], evaluator=constant("incorrect", 0)
            )

    def test_objective_only_fixture_completes_through_shared_run_with_zero_judges(self) -> None:
        import tempfile

        spec_path = ROOT / "tests" / "fixtures" / "refactor" / "minimal-deterministic" / "spec.json"
        calls = []

        def dispatch(request):
            calls.append(deepcopy(request))
            output = "5" if "2 and 3" in request["prompt"] else "BLUE"
            return {
                "status": "completed",
                "output": output,
                "usage": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "cost": 0},
            }

        dispatch.capabilities = {
            "agentsRun": True,
            "nativeResult": True,
            "recursiveHardCallCap": False,
            "settingFields": ["temperature"],
        }
        with tempfile.TemporaryDirectory(prefix="wp3-objective-", dir=ROOT) as temporary:
            output = Path(temporary) / "run"
            result = benchmark_run.run(
                {"specPath": str(spec_path.resolve()), "outputDirectory": str(output.resolve())},
                dispatch=dispatch,
            )
            self.assertEqual(result["status"], "complete")
            self.assertEqual(len(calls), 4)
            grades = [lib.load_json(path) for path in sorted((output / "grading").glob("*.json"))]
            self.assertEqual(len(grades), 4)
            self.assertTrue(all(row["stage"] == "deterministic" for row in grades))
            self.assertTrue(all(row["method"] == "deterministic" for row in grades))
            self.assertFalse(any(row["stage"] in {"judge", "adjudicate"} for row in grades))

    def test_strict_json_rejects_duplicate_keys_as_malformed(self) -> None:
        plan = deepcopy(self.fixture["gradingPlan"])
        plan["deterministic"]["kind"] = "exact-json"
        plan["deterministic"]["expectedByTask"] = {"json-task": {"answer": 1}}
        item = {
            "assignment": {"attemptId": "json-attempt", "taskId": "json-task"},
            "result": {
                "dispatchStatus": "completed",
                "nativeResult": {"output": '{"answer":1,"answer":2}'},
            },
            "existingLabels": [],
        }
        result = grade.grade_deterministic_item(plan, item)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["error"]["code"], "DETERMINISTIC_MALFORMED")

    def test_equivalent_native_text_and_structured_value_are_not_false_conflicts(self) -> None:
        plan = deepcopy(self.fixture["gradingPlan"])
        plan["deterministic"]["kind"] = "exact-json"
        plan["deterministic"]["expectedByTask"] = {"json-task": {"answer": 1}}
        item = {
            "assignment": {"attemptId": "json-structured", "taskId": "json-task"},
            "result": {
                "dispatchStatus": "completed",
                "nativeResult": {"text": '{"answer":1}', "value": {"answer": 1}},
            },
            "existingLabels": [],
        }
        self.assertEqual(grade.grade_deterministic_item(plan, item)["labels"][0]["label"], "correct")

    def test_command_grader_ignores_agent_native_claim_and_requires_runner_evidence(self) -> None:
        plan = deepcopy(self.fixture["gradingPlan"])
        plan["deterministic"]["kind"] = "command"
        plan["deterministic"]["expectedByTask"] = {"command-task": "tests-pass"}
        item = {
            "assignment": {"attemptId": "command-attempt", "taskId": "command-task"},
            "result": {
                "dispatchStatus": "completed",
                "nativeResult": {
                    "output": "all tests pass",
                    "deterministicEvidence": {"status": "passed", "rationale": "agent claim"},
                },
            },
            "existingLabels": [],
        }
        claimed = grade.grade_deterministic_item(plan, item)
        self.assertEqual(claimed["status"], "failed")
        item["result"]["deterministicEvidence"] = {
            "status": "passed",
            "criterionId": "outcome",
            "rationale": "runner observed command exit zero",
        }
        observed = grade.grade_deterministic_item(plan, item)
        self.assertEqual(observed["labels"][0]["label"], "correct")

    def test_final_state_uses_runner_supplied_actual_evidence(self) -> None:
        plan = deepcopy(self.fixture["gradingPlan"])
        plan["deterministic"]["kind"] = "final-state"
        plan["deterministic"]["expectedByTask"] = {"state-task": {"saved": True}}
        item = {
            "assignment": {"attemptId": "state-attempt", "taskId": "state-task"},
            "result": {
                "dispatchStatus": "completed",
                "nativeResult": {"output": "I think it worked"},
                "finalState": {"saved": True}
            },
            "existingLabels": [],
        }
        result = grade.grade_deterministic_item(plan, item)
        self.assertEqual(result["labels"][0]["label"], "correct")
        item["result"]["finalState"] = {"saved": False}
        self.assertEqual(
            grade.grade_deterministic_item(plan, item)["labels"][0]["label"],
            "incorrect",
        )


class JudgmentGradingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = load("advanced-6-96-18.json")
        self.plan = self.fixture["gradingPlan"]
        self.items = self.fixture["items"]

    @staticmethod
    def response(criteria, label: str, uncertainty: float = 0.2):
        return {
            "dispatchStatus": "completed",
            "nativeResult": {
                "output": json.dumps({
                    "labels": [
                        {
                            "criterionId": criterion,
                            "label": label,
                            "uncertainty": uncertainty,
                            "rationale": f"fixture {label} for {criterion}",
                        }
                        for criterion in criteria
                    ]
                })
            },
        }

    def test_advanced_grading_plan_matches_shared_spec_schema(self) -> None:
        spec = lib.load_json(ROOT / "tests" / "fixtures" / "refactor" / "minimal-deterministic" / "spec.json")
        spec["grading"] = deepcopy(self.plan)
        schema = lib.load_json(ROOT / "schemas" / "spec.schema.json")
        self.assertEqual(lib.validate_json_schema(spec, schema), [])

    def judge_jobs(self):
        result = grade.grade({
            "schemaVersion": 1,
            "phase": "judge",
            "gradingPlan": self.plan,
            "items": self.items,
        })
        self.assertEqual(result["status"], "checkpoint")
        return result["jobs"]

    def judge_grades(self):
        jobs = self.judge_jobs()
        criteria = self.fixture["criteria"]
        result_items = []
        for job in jobs:
            judge_number = int(job["graderId"].split("-")[-1])
            label = "pass" if judge_number % 2 else "fail"
            result_items.append({
                "assignment": job,
                "result": self.response(criteria, label),
                "existingLabels": [],
                "nativeResultPath": f"grading/{job['jobId']}/result.json",
            })
        result = grade.grade({
            "schemaVersion": 1,
            "phase": "judge",
            "gradingPlan": self.plan,
            "items": result_items,
        })
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["jobs"], [])
        return result["grades"]

    def test_blinded_jobs_are_randomized_no_tools_and_output_only(self) -> None:
        original = deepcopy(self.items)
        first = self.judge_jobs()
        second = self.judge_jobs()
        self.assertEqual(first, second)
        self.assertEqual(len(first), self.fixture["expected"]["judgeJobs"])
        self.assertEqual(len({job["jobId"] for job in first}), len(first))
        self.assertEqual(len({job["blindedItemId"] for job in first}), 6)
        self.assertEqual([job["presentationIndex"] for job in first], list(range(1, 97)))
        self.assertNotEqual(
            [job["attemptId"] for job in first[:16]],
            sorted(job["attemptId"] for job in first[:16]),
            "presentation order should not fall back to source order",
        )
        for job in first:
            self.assertEqual(job["request"]["tools"], [])
            self.assertEqual(
                set(job["projection"]),
                {"schemaVersion", "blindedItemId", "rubric", "evidence"},
            )
            prompt = job["request"]["prompt"]
            self.assertNotIn("candidate", prompt)
            self.assertNotIn("control", prompt)
            self.assertNotIn("measured-model", prompt)
            self.assertNotIn("usage", prompt)
            self.assertNotIn("logFile", prompt)
        self.assertEqual(self.items, original)

    def test_pairwise_left_right_randomization_keeps_reverse_map_private(self) -> None:
        item = deepcopy(self.items[0])
        item["assignment"]["criterionEvidence"] = {
            "criteria": ["outcome"],
            "presentations": [
                {"output": "artifact alpha", "conditionId": "control", "model": "model-a"},
                {"output": "artifact beta", "conditionId": "candidate", "model": "model-b"},
            ],
        }
        projection, reverse_map, residual = grade.project_pairwise_judgment_input(
            self.plan, item, blinded_item_id="blind-pair"
        )
        self.assertEqual([row["position"] for row in projection["evidence"]["presentations"]], ["left", "right"])
        self.assertEqual({row["sourceIndex"] for row in reverse_map}, {0, 1})
        public_text = json.dumps(projection, sort_keys=True)
        self.assertNotIn("conditionId", public_text)
        self.assertNotIn("model-a", public_text)
        self.assertNotIn("model-b", public_text)
        self.assertTrue(any(row["private"].get("conditionId") == "candidate" for row in reverse_map))
        self.assertEqual(residual, [])
        self.assertEqual(
            (projection, reverse_map, residual),
            grade.project_pairwise_judgment_input(self.plan, item, blinded_item_id="blind-pair"),
        )

    def test_individual_labels_uncertainty_and_abstention_are_retained(self) -> None:
        job = self.judge_jobs()[0]
        valid = grade.parse_judgment_item(
            self.plan,
            {
                "assignment": job,
                "result": self.response(["outcome"], "pass", 0.35),
                "existingLabels": [],
            },
            expected_phase="judge",
        )
        self.assertEqual(valid["status"], "valid")
        self.assertEqual([row["criterionId"] for row in valid["labels"]], ["outcome"])
        self.assertTrue(all(row["uncertainty"] == 0.35 for row in valid["labels"]))

        irrelevant = grade.parse_judgment_item(
            self.plan,
            {
                "assignment": job,
                "result": self.response(["provider-preference"], "pass", 0.1),
                "existingLabels": [],
            },
            expected_phase="judge",
        )
        self.assertEqual(irrelevant["status"], "malformed")
        self.assertEqual(irrelevant["error"]["code"], "GRADER_CRITERION_COVERAGE_INVALID")

        abstained = grade.parse_judgment_item(
            self.plan,
            {
                "assignment": job,
                "result": {
                    "dispatchStatus": "completed",
                    "nativeResult": {"output": json.dumps({"abstain": True, "uncertainty": 1, "rationale": "insufficient evidence"})},
                },
                "existingLabels": [],
            },
            expected_phase="judge",
        )
        self.assertEqual(abstained["status"], "abstained")
        self.assertIsNone(abstained["labels"][0]["score"])
        self.assertEqual(abstained["labels"][0]["uncertainty"], 1)

    def test_missing_and_malformed_judge_returns_fail_explicitly(self) -> None:
        jobs = self.judge_jobs()[:2]
        result = grade.grade({
            "schemaVersion": 1,
            "phase": "judge",
            "gradingPlan": self.plan,
            "items": [
                {"assignment": jobs[0], "result": None, "existingLabels": []},
                {
                    "assignment": jobs[1],
                    "result": {"dispatchStatus": "completed", "nativeResult": {"output": "not-json"}},
                    "existingLabels": [],
                },
            ],
        })
        self.assertEqual(result["status"], "failed")
        self.assertEqual([row["status"] for row in result["grades"]], ["missing", "malformed"])
        self.assertEqual(
            {row["code"] for row in result["errors"]},
            {"GRADER_RESULT_MISSING", "GRADER_RESULT_MALFORMED"},
        )

    def test_residual_unblinding_is_reported_not_discarded(self) -> None:
        item = deepcopy(self.items[1])
        item["result"]["nativeResult"]["output"] = "candidate identity appears in artifact"
        jobs = grade.plan_judge_jobs(self.plan, [item])
        self.assertEqual(jobs[0]["residualUnblinding"], ["evidence-contains-conditionId"])
        self.assertIn("candidate identity appears", jobs[0]["request"]["prompt"])

    def test_resolver_majority_and_retain_disagreement_precedence(self) -> None:
        def record(stage, grader_id, label):
            return {
                "schemaVersion": 1,
                "gradeId": f"g-{stage}-{grader_id}",
                "attemptId": "a-one",
                "stage": stage,
                "method": "model",
                "graderId": grader_id,
                "blindedItemId": "blind-one",
                "status": "valid",
                "labels": [{"criterionId": "outcome", "label": label, "score": int(label == "pass"), "uncertainty": 0.1, "rationale": "fixture"}],
                "nativeResultPath": None,
                "error": None,
                "residualUnblinding": [],
            }

        tied = [record("judge", "j1", "pass"), record("judge", "j2", "fail")]
        resolvers = [record("adjudicate", f"r{i}", "pass") for i in range(1, 4)]
        resolver = grade.resolve_labels(self.plan, tied + resolvers)["criteria"][0]
        self.assertEqual((resolver["label"], resolver["reason"]), ("pass", "resolver-precedence"))

        majority_plan = deepcopy(self.plan)
        majority_plan["adjudication"]["precedence"] = "majority"
        majority = grade.resolve_labels(
            majority_plan,
            tied + [record("judge", "j3", "pass"), record("adjudicate", "r1", "fail")],
        )["criteria"][0]
        self.assertEqual((majority["label"], majority["reason"]), ("pass", "judge-majority"))
        tie_break = grade.resolve_labels(majority_plan, tied + resolvers)["criteria"][0]
        self.assertEqual((tie_break["label"], tie_break["reason"]), ("pass", "resolver-tie-break"))

        retain_plan = deepcopy(self.plan)
        retain_plan["adjudication"]["precedence"] = "retain-disagreement"
        retained = grade.resolve_labels(retain_plan, tied + resolvers)["criteria"][0]
        self.assertEqual((retained["status"], retained["label"], retained["reason"]), ("unresolved", None, "retained-disagreement"))

    def test_fake_advanced_shape_plans_96_judges_then_18_adjudicators(self) -> None:
        judge_grades = self.judge_grades()
        self.assertEqual(len(judge_grades), 96)
        self.assertEqual(len({row["gradeId"] for row in judge_grades}), 96)

        by_attempt = {item["assignment"]["attemptId"]: deepcopy(item) for item in self.items}
        for row in judge_grades:
            by_attempt[row["attemptId"]]["existingLabels"].append(row)
        adjudication = grade.grade({
            "schemaVersion": 1,
            "phase": "adjudicate",
            "gradingPlan": self.plan,
            "items": list(by_attempt.values()),
        })
        self.assertEqual(adjudication["status"], "checkpoint")
        self.assertEqual(len(adjudication["jobs"]), self.fixture["expected"]["adjudicationJobs"])
        self.assertEqual(len({row["jobId"] for row in adjudication["jobs"]}), 18)
        self.assertTrue(all(row["request"]["tools"] == [] for row in adjudication["jobs"]))
        self.assertEqual(self.fixture["expected"]["liveCalls"], 0)

        resolver_items = [
            {
                "assignment": job,
                "result": self.response([job["criterionId"]], "pass", 0.1),
                "existingLabels": [],
            }
            for job in adjudication["jobs"]
        ]
        resolver_result = grade.grade({
            "schemaVersion": 1,
            "phase": "adjudicate",
            "gradingPlan": self.plan,
            "items": resolver_items,
        })
        self.assertEqual(resolver_result["status"], "complete")
        self.assertEqual(len(resolver_result["grades"]), 18)

        all_first = [row for row in judge_grades + resolver_result["grades"] if row["attemptId"] == "a-000001"]
        resolution = grade.resolve_labels(self.plan, all_first)
        self.assertEqual(len(resolution["criteria"]), 1)
        self.assertTrue(all(row["status"] == "resolved" for row in resolution["criteria"]))
        self.assertTrue(all(row["label"] == "pass" for row in resolution["criteria"]))
        self.assertTrue(all(row["reason"] == "resolver-precedence" for row in resolution["criteria"]))

    def test_shared_runner_crosses_ceiling_for_six_plus_96_plus_18_fake_calls(self) -> None:
        import tempfile

        spec = lib.load_json(ROOT / "tests" / "fixtures" / "refactor" / "minimal-deterministic" / "spec.json")
        third = deepcopy(spec["tasks"][0])
        third.update({"id": "third-task", "prompt": "Return artifact three.", "family": "third-family"})
        spec["tasks"].append(third)
        spec["grading"] = deepcopy(self.plan)
        spec["grading"]["judgment"]["calibrationInputPaths"] = ["calibration.json"]
        spec["analysis"]["sequential"]["maxTasks"] = 3
        spec["analysis"]["sequential"]["looks"][0]["completeTasks"] = 3
        spec["stoppingAndBudgets"].update({"maxTasks": 3, "maxDirectCalls": 120, "maxWallTimeSeconds": 120})
        calls = {"measured": 0, "judge": 0, "adjudicator": 0}

        def dispatch(request):
            prompt = request["prompt"]
            if prompt.startswith("Grade only"):
                if '"evidence":' in prompt:
                    calls["judge"] += 1
                    label = "pass" if calls["judge"] % 2 else "fail"
                else:
                    calls["adjudicator"] += 1
                    label = "pass"
                text = json.dumps({
                    "labels": [{
                        "criterionId": "outcome",
                        "label": label,
                        "uncertainty": 0.1,
                        "rationale": "fake bounded grading response",
                    }]
                })
            else:
                calls["measured"] += 1
                text = f"artifact {calls['measured']}"
            return {
                "status": "completed",
                "text": text,
                "usage": {"input": 1, "output": 1, "cacheRead": 0, "cacheWrite": 0, "cost": 0},
                "logFile": None,
            }

        dispatch.capabilities = {
            "agentsRun": True,
            "nativeResult": True,
            "recursiveHardCallCap": False,
            "settingFields": ["temperature"],
        }
        with tempfile.TemporaryDirectory(prefix="wp3-advanced-", dir=ROOT) as temporary:
            root = Path(temporary)
            (root / "calibration.json").write_text('{"anchors":["pass","fail"]}\n', encoding="utf-8")
            spec_path = root / "spec.json"
            spec_path.write_bytes(lib.canonical_json_bytes(spec))
            request = {"specPath": str(spec_path.resolve()), "outputDirectory": str((root / "run").resolve())}
            first = benchmark_run.run(request, dispatch=dispatch)
            self.assertEqual((first["status"], first["phase"]), ("checkpoint", "grade"), first)
            self.assertEqual(sum(calls.values()), 100)
            second = benchmark_run.run(request, dispatch=dispatch)
            self.assertEqual((second["status"], second["phase"]), ("complete", "complete"))
            self.assertEqual(calls, {"measured": 6, "judge": 96, "adjudicator": 18})
            report = lib.load_json(root / "run" / "report.json")
            self.assertEqual(len(report["grades"]), 114)
            self.assertEqual(report["telemetry"]["totals"]["measured"]["attemptCount"], 6)
            self.assertEqual(report["telemetry"]["totals"]["judge"]["attemptCount"], 96)
            self.assertEqual(report["telemetry"]["totals"]["adjudicator"]["attemptCount"], 18)
            third = benchmark_run.run(request, dispatch=dispatch)
            self.assertEqual(third["status"], "complete")
            self.assertEqual(calls, {"measured": 6, "judge": 96, "adjudicator": 18})

    def test_adjudication_refuses_incomplete_judges_and_call_limit_overflow(self) -> None:
        judge_grades = self.judge_grades()
        by_attempt = {item["assignment"]["attemptId"]: deepcopy(item) for item in self.items}
        for row in judge_grades[:-1]:
            by_attempt[row["attemptId"]]["existingLabels"].append(row)
        incomplete = grade.grade({
            "schemaVersion": 1,
            "phase": "adjudicate",
            "gradingPlan": self.plan,
            "items": list(by_attempt.values()),
        })
        self.assertEqual(incomplete["status"], "failed")
        self.assertEqual(incomplete["jobs"], [])
        self.assertIn("JUDGE_LABEL_MISSING", {row["code"] for row in incomplete["errors"]})

        complete = {item["assignment"]["attemptId"]: deepcopy(item) for item in self.items}
        for row in judge_grades:
            complete[row["attemptId"]]["existingLabels"].append(row)
        planned_jobs, planning_errors = grade.plan_adjudication_jobs(self.plan, list(complete.values()))
        self.assertEqual(planning_errors, [])
        malformed_job = planned_jobs[0]
        malformed_record = {
            "gradeId": malformed_job["gradeId"],
            "attemptId": malformed_job["attemptId"],
            "stage": "adjudicate",
            "status": "malformed",
            "labels": [],
        }
        complete[malformed_job["attemptId"]]["existingLabels"].append(malformed_record)
        invalid_adjudicator = grade.grade({
            "schemaVersion": 1,
            "phase": "adjudicate",
            "gradingPlan": self.plan,
            "items": list(complete.values()),
        })
        self.assertEqual(invalid_adjudicator["status"], "failed")
        self.assertEqual(invalid_adjudicator["jobs"], [])
        self.assertIn("ADJUDICATOR_RESULT_INVALID", {row["code"] for row in invalid_adjudicator["errors"]})
        complete[malformed_job["attemptId"]]["existingLabels"].remove(malformed_record)

        bounded_plan = deepcopy(self.plan)
        bounded_plan["adjudication"]["maxCalls"] = 17
        overflow = grade.grade({
            "schemaVersion": 1,
            "phase": "adjudicate",
            "gradingPlan": bounded_plan,
            "items": list(complete.values()),
        })
        self.assertEqual(overflow["status"], "failed")
        self.assertEqual(overflow["jobs"], [])
        self.assertIn("ADJUDICATION_CALL_LIMIT_EXCEEDED", {row["code"] for row in overflow["errors"]})


if __name__ == "__main__":
    unittest.main()
