#!/usr/bin/env python3
"""Behavioral evidence for the task-paired statistical core.

Expected effects, multiplicity values, and bootstrap draws are calculated from
small hand/numerical references rather than by calling the production method a
second time as an oracle.
"""

from __future__ import annotations

import copy
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

import analyze_paired  # noqa: E402
import benchmark_lib as lib  # noqa: E402
import generate_schedule  # noqa: E402
import statistical_core  # noqa: E402
from test_randomization import configured_spec, request_for  # noqa: E402


def add_metric(spec: dict, *, metric_id: str, summary: str, direction: str, quantile=None) -> None:
    metric = copy.deepcopy(spec["analysis"]["metrics"][0])
    metric.update(
        id=metric_id,
        source="telemetry.value",
        summary=summary,
        quantile=quantile,
        direction=direction,
        unit=f"{metric_id}-units",
    )
    spec["analysis"]["metrics"].append(metric)


def all_success_request(spec: dict, values) -> dict:
    schedule = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": spec})
    tasks = {task["id"]: task for task in spec["tasks"]}
    rows = []
    for schedule_row in schedule["rows"]:
        task = tasks[schedule_row["taskId"]]
        rows.append(
            {
                **schedule_row,
                "family": task["family"],
                "stratum": task["stratum"],
                "attemptStatus": "succeeded",
                "outcomes": [
                    {"metricId": metric["id"], "status": "observed", "value": float(values(schedule_row, metric))}
                    for metric in spec["analysis"]["metrics"]
                ],
                "gradeIds": [],
                "telemetry": {},
            }
        )
    return {
        "schemaVersion": 1,
        "resolvedSpec": spec,
        "schedule": schedule,
        "dataset": {"schemaVersion": 1, "rows": rows},
        "grades": [],
        "telemetry": {},
    }


class DatasetAndEstimandTests(unittest.TestCase):
    def test_global_refusal_cannot_be_overridden_by_metric_score(self):
        spec = configured_spec(method="independent-block-v1", tasks=6)
        spec["analysis"]["decision"].update(rule="adopt-if-all-primary", practicalThreshold=.1)
        for action in spec["analysis"]["missingness"]["statusActions"]:
            if action["status"] == "agent-failure":
                action.update(action="refuse", value=None)
        request = request_for(spec, lambda r: r["conditionId"] == "condition-2")
        row = next(r for r in request["dataset"]["rows"] if r["conditionId"] == "condition-1")
        row.update(attemptStatus="agent-failure", outcomes=[])
        result = analyze_paired.analyze_paired(request)
        self.assertEqual(result["status"], "failed")
        self.assertNotEqual(result["scientificDecision"], "adopt")
        self.assertTrue(result["paired"]["dataset"]["failureMappingRefusals"])

    def test_multicondition_metrics_saved_weights_directions_and_summaries(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=2, repetitions=2, conditions=3)
        add_metric(spec, metric_id="latency", summary="median", direction="lower")
        add_metric(spec, metric_id="tail", summary="quantile", direction="higher", quantile=0.75)
        contrast = spec["analysis"]["contrasts"][0]
        contrast["metricIds"] = ["accepted", "latency", "tail"]
        contrast["taskWeighting"] = "saved"
        second = copy.deepcopy(contrast)
        second.update(id="c3-v-c1", candidateConditionId="condition-3", metricIds=["accepted"])
        spec["analysis"]["contrasts"].append(second)
        hypothesis_ids = [
            "c2-v-c1.accepted", "c2-v-c1.latency", "c2-v-c1.tail", "c3-v-c1.accepted"
        ]
        spec["analysis"]["multiplicity"].update(method="holm", hypothesisIds=hypothesis_ids)
        spec["analysis"]["sequential"]["looks"][0]["alphaByHypothesis"] = {
            item: 0.0125 for item in hypothesis_ids
        }

        def value(row, metric):
            task_index = int(row["taskId"].split("-")[-1])
            condition_index = int(row["conditionId"].split("-")[-1])
            repetition = row["repetition"]
            if metric["id"] == "accepted":
                return task_index * (condition_index - 1)
            if metric["id"] == "latency":
                return 12 - condition_index * task_index + (repetition - 1) * 2
            return condition_index * task_index + repetition

        result = analyze_paired.analyze_paired(all_success_request(spec, value))
        estimates = {row["hypothesisId"]: row for row in result["paired"]["contrasts"]}
        # Saved weights are 1 and 2.  c2-c1 task effects are 1 and 2.
        self.assertAlmostEqual(estimates["c2-v-c1.accepted"]["effect"], 5 / 3)
        # Lower is better: median latency improvement is 1 and 2.
        self.assertAlmostEqual(estimates["c2-v-c1.latency"]["effect"], 5 / 3)
        self.assertEqual(estimates["c2-v-c1.accepted"]["wins"], 2)
        self.assertEqual(len(result["paired"]["taskConditionSummaries"]), 2 * 3 * 3)
        self.assertEqual(result["multiplicity"]["hypothesisIds"], hypothesis_ids)
        self.assertTrue(result["paired"]["rawTaskPairedVisible"])

    def test_failure_score_bound_refuse_and_nonfinite_are_not_survivor_filtered(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=2)
        request = request_for(spec, lambda row: row["conditionId"] == "condition-2")
        failed_row = request["dataset"]["rows"][0]
        failed_row["attemptStatus"] = "agent-failure"
        failed_row["outcomes"] = [{"metricId": "accepted", "status": "unavailable", "value": None}]
        scored = analyze_paired.analyze_paired(request)
        mapped = next(row for row in scored["paired"]["dataset"]["mappedRows"] if row["attemptId"] == failed_row["attemptId"])
        self.assertEqual(mapped["outcomes"][0]["mappingAction"], "score")
        self.assertEqual(mapped["outcomes"][0]["mappedValue"], 0.0)
        self.assertTrue(scored["paired"]["dataset"]["completeScheduleReconciled"])

        spec["analysis"]["sensitivities"].append("infrastructure-inclusion-exclusion")
        bounded_request = request_for(spec, lambda row: row["conditionId"] == "condition-2")
        bounded_row = bounded_request["dataset"]["rows"][0]
        bounded_row["attemptStatus"] = "infrastructure-failure"
        bounded_row["outcomes"] = [{"metricId": "accepted", "status": "unavailable", "value": None}]
        bounded = analyze_paired.analyze_paired(bounded_request)
        estimate = bounded["paired"]["contrasts"][0]
        bounds = next(item for item in bounded["sensitivities"] if item["method"] == "prespecified-missing-outcome-bounds")
        self.assertEqual(bounded["status"], "descriptive-only")
        self.assertIsNone(estimate["effect"])
        self.assertIsNotNone(estimate["completeCaseEffect"])
        self.assertEqual(bounds["lower"], 0.5)
        self.assertEqual(bounds["upper"], 1.0)
        infrastructure = next(item for item in bounded["sensitivities"] if item["method"] == "infrastructure-inclusion-exclusion")
        self.assertEqual(infrastructure["status"], "descriptive-only")
        self.assertEqual(len(infrastructure["excludedTaskIds"]), 1)
        self.assertTrue(infrastructure["survivorFilteredExclusionNeverPromoted"])
        self.assertIn("not survivor-filtered", " ".join(bounded["limitations"]))

        refused_spec = configured_spec(method="independent-block-v1", tasks=2)
        timeout_rule = next(item for item in refused_spec["analysis"]["metrics"][0]["statusActions"] if item["status"] == "timeout")
        timeout_rule.update(action="refuse", value=None)
        refused_request = request_for(refused_spec, lambda row: 1)
        refused_row = refused_request["dataset"]["rows"][0]
        refused_row["attemptStatus"] = "timeout"
        refused_row["outcomes"] = [{"metricId": "accepted", "status": "unavailable", "value": None}]
        refused = analyze_paired.analyze_paired(refused_request)
        self.assertEqual(refused["status"], "failed")
        self.assertTrue(refused["paired"]["dataset"]["failureMappingRefusals"])

        nonfinite_request = request_for(spec, lambda row: 1)
        nonfinite_request["dataset"]["rows"][0]["outcomes"][0]["value"] = math.inf
        with self.assertRaisesRegex(lib.InputError, "finite number"):
            analyze_paired.analyze_paired(nonfinite_request)

    def test_schedule_dataset_omission_and_duplicates_fail_closed(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=2)
        missing = request_for(spec, lambda row: 1)
        missing["dataset"]["rows"].pop()
        with self.assertRaisesRegex(lib.ContractError, "omits scheduled"):
            analyze_paired.analyze_paired(missing)
        duplicate = request_for(spec, lambda row: 1)
        duplicate["dataset"]["rows"].append(copy.deepcopy(duplicate["dataset"]["rows"][0]))
        with self.assertRaisesRegex(lib.ContractError, "duplicate dataset"):
            analyze_paired.analyze_paired(duplicate)


class BootstrapAndDecisionTests(unittest.TestCase):
    def test_stratified_bca_independent_influence_and_translation_oracle(self):
        values = np.array([0., 0., 1., 0., 1., 4.])
        centered = values - np.repeat([values[:3].mean(), values[3:].mean()], 3)
        acceleration = sum(centered ** 3) / (6 * sum(centered ** 2) ** 1.5)
        intervals = []
        for shift in (0., 100.):
            items = [{"taskId": f"t{i}", "family": f"f{i}", "effect": v + (shift if i >= 3 else 0),
                      "weight": 1., "strata": {"s": str(i // 3)}} for i, v in enumerate(values)]
            result = statistical_core.cluster_bootstrap(items, unit="task", stratify_by=["s"],
                method="bca", draws=9999, confidence_level=.9, seed=1)
            self.assertTrue(result["available"])
            self.assertAlmostEqual(result["diagnostics"]["bcaAcceleration"], acceleration, places=12)
            intervals.append([result["lower"] - shift / 2, result["upper"] - shift / 2])
        np.testing.assert_allclose(intervals[0], intervals[1], rtol=0, atol=1e-12)

    def test_task_family_stratified_percentile_and_bca_use_whole_clusters(self) -> None:
        items = [
            {
                "taskId": f"t{index + 1}",
                "family": f"f{index // 2 + 1}",
                "effect": value,
                "weight": 1.0,
                "strata": {"stratum": "a" if index < 6 else "b"},
            }
            for index, value in enumerate((0.0, 0.2, 0.5, 0.8, 2.0, 2.5, 1.0, 1.5, 3.0, 4.0, 8.0, 9.0))
        ]
        percentile = statistical_core.cluster_bootstrap(
            items, unit="task", stratify_by=[], method="percentile",
            draws=31, confidence_level=0.8, seed=4401,
        )
        # Independent draw oracle for the unstratified equal-weight case.
        rng = np.random.Generator(np.random.PCG64(4401))
        values = np.array([item["effect"] for item in sorted(items, key=lambda item: item["taskId"])])
        oracle = np.array([np.mean(values[rng.integers(0, len(values), len(values))]) for _ in range(31)])
        self.assertAlmostEqual(percentile["lower"], float(np.quantile(oracle, 0.1, method="linear")))
        self.assertAlmostEqual(percentile["upper"], float(np.quantile(oracle, 0.9, method="linear")))

        bca = statistical_core.cluster_bootstrap(
            items, unit="family", stratify_by=["stratum"], method="bca",
            draws=999, confidence_level=0.9, seed=4402,
        )
        self.assertTrue(bca["available"])
        self.assertTrue(bca["wholeCluster"])
        self.assertEqual(bca["jackknifeUnit"], "family")
        self.assertEqual(bca["clusterCount"], 6)
        self.assertEqual(set(bca["clusterSizes"].values()), {2})
        self.assertEqual(bca["jackknifeEstimates"], 6)
        self.assertEqual(bca, statistical_core.cluster_bootstrap(
            items, unit="family", stratify_by=["stratum"], method="bca",
            draws=999, confidence_level=0.9, seed=4402,
        ))

    def test_bca_pathology_is_unavailable_without_percentile_fallback(self) -> None:
        items = [
            {"taskId": f"t{i}", "family": f"f{i}", "effect": 1.0, "weight": 1.0, "strata": {}}
            for i in range(4)
        ]
        result = statistical_core.cluster_bootstrap(
            items, unit="task", stratify_by=[], method="bca",
            draws=101, confidence_level=0.95, seed=7,
        )
        self.assertFalse(result["available"])
        self.assertTrue(result["degenerate"])
        self.assertIn("acceleration", result["error"])
        self.assertIsNone(result["lower"])

    def test_practical_superiority_noninferiority_and_sharp_null_are_separate(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=8)
        spec["analysis"]["decision"].update(
            rule="adopt-if-all-primary", practicalThreshold=0.1, nonInferiorityMargin=0.1
        )
        request = request_for(
            spec,
            lambda row: 0.2 if row["conditionId"] == "condition-2" else 0.0,
        )
        result = analyze_paired.analyze_paired(request)
        decision = result["decisions"][0]
        self.assertEqual(result["scientificDecision"], "adopt")
        self.assertTrue(decision["practicalSuperiority"]["passed"])
        self.assertTrue(decision["nonInferiority"]["passed"])
        self.assertTrue(decision["sharpNull"]["rejected"])
        self.assertTrue(decision["sharpNull"]["separateFromPracticalAndNonInferiorityClaims"])
        self.assertEqual(decision["nonInferiority"]["boundary"], -0.1)

        spec["analysis"]["decision"]["vetoMetricIds"] = ["accepted"]
        boundary = request_for(
            spec,
            lambda row: -0.1 if row["conditionId"] == "condition-2" else 0.0,
        )
        boundary_result = analyze_paired.analyze_paired(boundary)
        self.assertFalse(boundary_result["decisions"][0]["nonInferiority"]["passed"])
        self.assertTrue(boundary_result["decisions"][0]["outcomeQualityVeto"]["triggered"])
        self.assertEqual(boundary_result["scientificDecision"], "retain-control")


class MultiplicityReliabilityAndSensitivityTests(unittest.TestCase):
    def test_required_saved_sensitivity_payloads_run_without_primary_substitution(self):
        spec = configured_spec(method="task-vector-v1", tasks=2, repetitions=3)
        spec["analysis"]["sensitivities"] = ["alternative-summary", "alternative-weighting", "repaired-vs-original"]
        request = request_for(spec, lambda r: (10. if r["repetition"] == 3 else 1.) * int(r["taskId"].split("-")[-1]) if r["conditionId"] == "condition-2" else 0.)
        missing = analyze_paired.analyze_paired(copy.deepcopy(request))
        self.assertEqual(missing["status"], "unsupported")
        self.assertNotEqual(missing["scientificDecision"], "adopt")
        attempt = next(r["attemptId"] for r in request["dataset"]["rows"] if r["conditionId"] == "condition-2" and r["taskId"] == "task-1" and r["repetition"] == 3)
        spec["analysis"]["sensitivityScenarios"] = [
            {"id": "median", "method": "alternative-summary", "metricId": "accepted", "summary": "median", "quantile": None},
            {"id": "weights", "method": "alternative-weighting", "taskWeights": {"task-1": 3., "task-2": 1.}},
            {"id": "repair", "method": "repaired-vs-original", "outcomes": [{"attemptId": attempt, "metricId": "accepted", "originalValue": 10., "repairedValue": 1.}]},
        ]
        self.assertEqual(lib.validate_json_schema(spec, json.loads((ROOT / "schemas/spec.schema.json").read_text())), [])
        before = copy.deepcopy(request)
        result = analyze_paired.analyze_paired(request)
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["paired"]["contrasts"][0]["effect"], 6.)
        by_id = {r["scenarioId"]: r for r in result["sensitivities"] if "scenarioId" in r}
        self.assertEqual(by_id["median"]["alternative"]["effect"], 1.5)
        self.assertEqual(by_id["weights"]["alternative"]["effect"], 5.)
        self.assertEqual(by_id["repair"]["alternative"]["effect"], 4.5)
        self.assertEqual(request, before)
        spec["analysis"]["sensitivityScenarios"][-1]["outcomes"][0]["originalValue"] = 999.
        with self.assertRaisesRegex(lib.ContractError, "original"):
            analyze_paired.analyze_paired(request)

    def test_complete_family_adjustments_match_hand_references(self) -> None:
        ids = ["h1", "h2", "h3"]
        raw = [0.01, 0.04, 0.03]
        expected = {
            "bonferroni": [0.03, 0.12, 0.09],
            "holm": [0.03, 0.06, 0.06],
            "fdr-bh": [0.03, 0.04, 0.04],
            "fdr-by": [0.055, 0.07333333333333333, 0.07333333333333333],
        }
        for method, reference in expected.items():
            with self.subTest(method=method):
                result = statistical_core.adjust_family(
                    ids, raw, method=method, alpha=0.05,
                    family_id="family", interval_policy="marginal",
                )
                observed = [row["adjustedPValue"] for row in result["results"]]
                np.testing.assert_allclose(observed, reference, atol=1e-14, rtol=1e-14)
                self.assertEqual(result["intervalLabel"], "marginal-not-multiplicity-adjusted")
                self.assertTrue(result["completeFamily"])
                self.assertEqual(result["status"], "controlled")
        unadjusted = statistical_core.adjust_family(
            ids, raw, method="none", alpha=0.05,
            family_id="family", interval_policy="marginal",
        )
        self.assertEqual(unadjusted["status"], "uncontrolled-complete-family")
        self.assertIn("positive dependence", statistical_core.adjust_family(
            ids, raw, method="fdr-bh", alpha=0.05,
            family_id="family", interval_policy="marginal",
        )["dependenceAssumption"])

    def test_pass_k_combinatorial_boundaries(self) -> None:
        self.assertEqual(statistical_core.pass_k_probability(0, 5, 1, all_required=False), 0.0)
        self.assertEqual(statistical_core.pass_k_probability(5, 5, 5, all_required=False), 1.0)
        self.assertEqual(statistical_core.pass_k_probability(3, 5, 1, all_required=False), 3 / 5)
        self.assertEqual(statistical_core.pass_k_probability(3, 5, 1, all_required=True), 3 / 5)
        self.assertEqual(statistical_core.pass_k_probability(1, 5, 5, all_required=False), 1.0)
        self.assertEqual(statistical_core.pass_k_probability(4, 5, 5, all_required=True), 0.0)
        with self.assertRaisesRegex(ValueError, "available attempt count"):
            statistical_core.pass_k_probability(2, 3, 4, all_required=False)

    def test_simultaneous_interval_is_computed_not_renamed_marginal(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=2, conditions=3)
        second = copy.deepcopy(spec["analysis"]["contrasts"][0])
        second.update(id="c3-v-c1", candidateConditionId="condition-3")
        spec["analysis"]["contrasts"].append(second)
        ids = ["c2-v-c1.accepted", "c3-v-c1.accepted"]
        spec["analysis"]["multiplicity"].update(
            method="bonferroni", hypothesisIds=ids, intervalPolicy="simultaneous"
        )
        spec["analysis"]["sequential"]["looks"][0]["alphaByHypothesis"] = {item: 0.025 for item in ids}
        result = analyze_paired.analyze_paired(request_for(spec, lambda row: row["orderPosition"]))
        for bootstrap in result["inference"]["bootstrap"]:
            reported = bootstrap["reportedInterval"]
            self.assertEqual(reported["label"], "simultaneous-bonferroni")
            self.assertEqual(reported["confidenceLevel"], 0.975)
            self.assertIn("simultaneousInterval", bootstrap)

    def test_retries_reliability_grader_bounds_and_strata_remain_distinct(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=2, repetitions=3)
        spec["analysis"]["randomization"]["mode"] = "none"
        spec["analysis"]["bootstrap"]["method"] = "none"
        spec["analysis"]["bootstrap"]["draws"] = 0
        spec["analysis"]["retryPolicy"].update(
            estimand="both", maxRetries=1, eligibleStatuses=["agent-failure"]
        )
        spec["analysis"]["reliability"] = [
            {"metric": "pass-at-1", "k": None, "population": "first-attempts"},
            {"metric": "retry-policy-acceptance", "k": None, "population": "eligible-retries"},
            {"metric": "pass-at-k", "k": 2, "population": "all-scheduled"},
            {"metric": "pass-all-k", "k": 2, "population": "all-scheduled"},
        ]
        spec["analysis"]["graderUncertainty"] = {
            "method": "label-bounds",
            "singleGraderPolicy": "state-limitation",
            "disagreementPolicy": "bound",
        }
        spec["analysis"]["sensitivities"] = [
            "first-attempt-vs-production-retry", "grader-disagreement-bounds",
            "leave-one-task-out", "leave-one-family-out", "concurrency-strata",
            "service-strata", "alternative-summary",
        ]
        request = request_for(
            spec,
            lambda row: float((row["repetition"] + int(row["taskId"].split("-")[-1])) % 2 == 0),
        )
        root = request["schedule"]["rows"][0]
        retry = {**root, "attemptId": "a-retry-0001", "retryOf": root["attemptId"]}
        request["schedule"]["rows"].append(retry)
        root_data = next(row for row in request["dataset"]["rows"] if row["attemptId"] == root["attemptId"])
        root_data["attemptStatus"] = "agent-failure"
        root_data["outcomes"] = [{"metricId": "accepted", "status": "unavailable", "value": None}]
        task = next(item for item in spec["tasks"] if item["id"] == retry["taskId"])
        request["dataset"]["rows"].append({
            **retry, "family": task["family"], "stratum": task["stratum"],
            "attemptStatus": "succeeded",
            "outcomes": [{"metricId": "accepted", "status": "observed", "value": 1.0}],
            "gradeIds": [], "telemetry": {},
        })
        for row in request["dataset"]["rows"]:
            task_number = int(row["taskId"].split("-")[-1])
            row["telemetry"] = {"concurrency": "serial", "service": f"service-{task_number}"}
        first = request["dataset"]["rows"][1]
        first["gradeIds"] = ["g1", "g2"]
        for row in request["dataset"]["rows"]:
            if not row["gradeIds"]:
                row["gradeIds"] = [f"g-{row['attemptId']}"]
        request["grades"] = [
            {
                "gradeId": grade_id, "graderId": "grader-1", "status": "valid",
                "labels": [{"score": float(next(row for row in request["dataset"]["rows"] if grade_id in row["gradeIds"])["outcomes"][0]["value"] or 0.0)}],
            }
            for grade_id in {grade_id for row in request["dataset"]["rows"] for grade_id in row["gradeIds"]}
            if grade_id != "g2"
        ]
        request["grades"].append({
            "gradeId": "g2", "graderId": "grader-2", "status": "valid",
            "labels": [{"score": 1.0 - float(first["outcomes"][0]["value"])}],
        })
        result = analyze_paired.analyze_paired(request)
        reliability = {item["metric"]: item for item in result["reliability"]}
        self.assertEqual(set(reliability), {"pass-at-1", "retry-policy-acceptance", "pass-at-k", "pass-all-k"})
        self.assertTrue(reliability["pass-at-k"]["repetitionsAreNotRetries"])
        self.assertIn("exchangeable", reliability["pass-at-k"]["limitations"][0])
        retry_sensitivity = next(item for item in result["sensitivities"] if item["method"] == "first-attempt-vs-production-retry")
        self.assertNotEqual(
            retry_sensitivity["results"]["first-attempt"]["selectedAttemptIds"],
            retry_sensitivity["results"]["production-policy"]["selectedAttemptIds"],
        )
        self.assertEqual(result["graderUncertainty"]["graderCount"], 2)
        self.assertTrue(result["graderUncertainty"]["disagreements"])
        grader_bounds = next(item for item in result["sensitivities"] if item["method"] == "grader-disagreement-bounds")
        self.assertEqual(grader_bounds["status"], "complete")
        service = next(item for item in result["sensitivities"] if item["method"] == "service-strata")
        concurrency = next(item for item in result["sensitivities"] if item["method"] == "concurrency-strata")
        leave_task = next(item for item in result["sensitivities"] if item["method"] == "leave-one-task-out")
        self.assertEqual(service["status"], "complete")
        self.assertEqual(len(service["results"]), 2)
        self.assertEqual(concurrency["status"], "complete")
        self.assertEqual(leave_task["status"], "complete")
        unavailable = next(item for item in result["sensitivities"] if item["method"] == "alternative-summary")
        self.assertEqual(unavailable["status"], "unavailable")
        self.assertIn("no alternative values", unavailable["reason"])


if __name__ == "__main__":
    unittest.main()
