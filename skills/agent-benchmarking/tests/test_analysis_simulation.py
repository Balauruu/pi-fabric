#!/usr/bin/env python3
"""Predeclared finite-look and full-design simulation checks.

Seeds, draw budgets, and acceptance tolerances are constants below and are not
changed after observing a run.  These tests execute once; they are not rerun
until a favorable stochastic result appears.
"""

from __future__ import annotations

import copy
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

import analyze_paired  # noqa: E402
import benchmark_lib as lib  # noqa: E402
import statistical_core  # noqa: E402
from test_randomization import configured_spec, request_for  # noqa: E402

NULL_SEED = 713_021
NULL_SIMULATIONS = 1200
NULL_ALPHA = 0.05
# Predeclared, one-run acceptance ceiling: nominal alpha + three binomial SEs.
NULL_MAX_FALSE_REJECTION = NULL_ALPHA + 3 * math.sqrt(NULL_ALPHA * (1 - NULL_ALPHA) / NULL_SIMULATIONS)
POWER_SEED = 713_022
POWER_SIMULATIONS = 120
BOOTSTRAP_COVERAGE_SEED = 713_023
BOOTSTRAP_COVERAGE_RUNS = 120
BOOTSTRAP_DRAWS = 399
BOOTSTRAP_LEVEL = 0.90
BOOTSTRAP_COVERAGE_TOLERANCE = 0.10


def continuous_metric(spec: dict) -> None:
    metric = spec["analysis"]["metrics"][0]
    metric.update(summary="mean", source="synthetic.continuous", unit="oriented-quality")
    spec["analysis"]["reliability"] = []


def finite_plan(spec: dict, first: int, final: int) -> None:
    hypothesis_id = spec["analysis"]["multiplicity"]["hypothesisIds"][0]
    spec["analysis"]["multiplicity"]["alpha"] = NULL_ALPHA
    spec["analysis"]["sequential"] = {
        "method": "finite-look-union-bound",
        "maxTasks": final,
        "looks": [
            {"id": "interim", "completeTasks": first, "alphaByHypothesis": {hypothesis_id: 0.025}},
            {"id": "final", "completeTasks": final, "alphaByHypothesis": {hypothesis_id: 0.025}},
        ],
        "stopOn": "declared-boundary",
    }


class FiniteLookControllerTests(unittest.TestCase):
    def test_final_decision_never_bypasses_eligible_look_allocations(self):
        spec = configured_spec(method="independent-block-v1", tasks=5)
        finite_plan(spec, first=2, final=5)
        spec["analysis"]["decision"].update(rule="adopt-if-all-primary", practicalThreshold=.1)
        result = analyze_paired.analyze_paired(request_for(spec, lambda r: .2 if r["conditionId"] == "condition-2" else 0.))
        self.assertEqual([r["crossedHypothesisIds"] for r in result["inference"]["sequential"]["looks"]], [[], []])
        self.assertEqual(result["inference"]["randomization"][0]["pValue"], .03125)
        self.assertFalse(result["decisions"][0]["sharpNull"]["rejected"])
        self.assertEqual(result["scientificDecision"], "inconclusive")

    def test_sequential_decision_uses_stopped_sample_and_allocated_uncertainty(self):
        spec = configured_spec(method="independent-block-v1", tasks=8)
        continuous_metric(spec)
        finite_plan(spec, first=6, final=8)
        spec["analysis"]["decision"].update(rule="adopt-if-all-primary", practicalThreshold=.1)
        result = analyze_paired.analyze_paired(request_for(spec, lambda r: (.2 if int(r["taskId"].split("-")[-1]) <= 6 else -10.) if r["conditionId"] == "condition-2" else 0.))
        self.assertLess(result["paired"]["contrasts"][0]["effect"], 0.)
        self.assertEqual(result["scientificDecision"], "adopt")
        self.assertAlmostEqual(result["decisions"][0]["pointEffect"], .2)
        interval = result["inference"]["sequential"]["looks"][0]["tests"][0]["uncertainty"]
        self.assertEqual(interval["confidenceLevel"], .975)
        self.assertEqual(interval["clusterCount"], 6)
        spec["analysis"]["bootstrap"]["method"] = "bca"
        spec["analysis"]["decision"].update(rule="retain-control-unless-noninferior", nonInferiorityMargin=.1)
        unavailable = analyze_paired.analyze_paired(request_for(spec, lambda r: .2 if r["conditionId"] == "condition-2" else 0.))
        self.assertNotEqual(unavailable["status"], "complete")
        self.assertNotEqual(unavailable["scientificDecision"], "adopt")

    def test_balanced_remainder_looks_condition_on_full_global_law(self) -> None:
        spec = configured_spec(method="balanced-cyclic-v1", tasks=5)
        continuous_metric(spec)
        finite_plan(spec, first=2, final=5)
        request = request_for(
            spec,
            lambda row: row["blockIndex"] + row["orderPosition"] / 10,
        )
        result = analyze_paired.analyze_paired(request)
        sequential = result["inference"]["sequential"]
        self.assertEqual(sequential["allocatedAlpha"], 0.05)
        self.assertTrue(sequential["unionBoundValidWithoutIndependentLooks"])
        self.assertIn("full saved schedule law", sequential["globalCoupledLaw"])
        self.assertEqual(len(sequential["looks"]), 2)
        # Five two-condition blocks are one full remainder design: base plus
        # three independently generated shift cycles, 2^4 paths.
        for look in sequential["looks"]:
            inference = look["tests"][0]["inference"]
            self.assertEqual(inference["generatingPathCount"], 16)
            self.assertEqual(inference["lawScope"], "full observed schedule conditional on fixed block order")

    def test_illegal_alpha_and_unplanned_look_shapes_fail_closed(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=6)
        continuous_metric(spec)
        finite_plan(spec, first=3, final=6)
        spec["analysis"]["sequential"]["looks"][0]["alphaByHypothesis"]["c2-v-c1.accepted"] = 0.04
        spec["analysis"]["sequential"]["looks"][1]["alphaByHypothesis"]["c2-v-c1.accepted"] = 0.04
        with self.assertRaisesRegex(lib.ContractError, "exceeds overall alpha"):
            analyze_paired.analyze_paired(request_for(spec, lambda row: row["orderPosition"]))

        incomplete = configured_spec(method="independent-block-v1", tasks=6)
        continuous_metric(incomplete)
        finite_plan(incomplete, first=3, final=6)
        incomplete["analysis"]["sequential"]["looks"].pop()
        with self.assertRaisesRegex(lib.ContractError, "complete final task count"):
            analyze_paired.analyze_paired(request_for(incomplete, lambda row: row["orderPosition"]))

    def test_planned_early_stop_does_not_require_evaluating_later_looks(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=12)
        continuous_metric(spec)
        hypothesis_id = "c2-v-c1.accepted"
        spec["analysis"]["sequential"] = {
            "method": "finite-look-union-bound",
            "maxTasks": 12,
            "looks": [
                {"id": "interim", "completeTasks": 6, "alphaByHypothesis": {hypothesis_id: 0.02}},
                {"id": "final", "completeTasks": 12, "alphaByHypothesis": {hypothesis_id: 0.03}},
            ],
            "stopOn": "declared-boundary",
        }
        # 12-block exact support is too large for this behavioral probe, while
        # a seeded MC p-value can attain the interim boundary.
        spec["analysis"]["randomization"].update(
            mode="monte-carlo", permitApproximation=True, maxExactAllocations=8
        )
        spec["analysis"]["randomization"]["monteCarlo"] = {
            "draws": 255, "seed": 4477, "intervalLevel": 0.95
        }
        request = request_for(
            spec,
            lambda row: 1.0 if row["conditionId"] == "condition-2" else 0.0,
        )
        result = analyze_paired.analyze_paired(request)
        sequential = result["inference"]["sequential"]
        self.assertEqual(sequential["stopReason"], "declared-boundary-crossed")
        self.assertEqual(sequential["stoppedAt"], "interim")
        self.assertEqual(len(sequential["looks"]), 1)
        self.assertEqual(sequential["allocatedAlpha"], 0.05)


class FullPolicySimulationTests(unittest.TestCase):
    def test_simulation_uses_saved_decision_bootstrap_weights_and_nonnegative_seeds(self):
        spec = configured_spec(method="independent-block-v1", tasks=6)
        continuous_metric(spec)
        spec["analysis"]["contrasts"][0]["taskWeighting"] = "saved"
        spec["analysis"]["decision"].update(rule="descriptive-only", practicalThreshold=1000.)
        spec["analysis"]["randomization"].update(mode="monte-carlo", monteCarlo={"draws": 39, "seed": 1, "intervalLevel": .95})
        spec["analysis"]["precisionPower"] = {"method": "simulation", "simulationCount": 8, "seed": 717,
            "scenarios": [{"id": "policy", "tasks": 6, "repetitions": 1, "effect": 10., "taskStandardDeviation": .01, "failureRate": 0., "graderErrorRate": 0.}]}
        result = analyze_paired.analyze_paired(request_for(spec, lambda r: r["orderPosition"]))
        row = result["inference"]["precisionPower"]["scenarios"][0]
        self.assertEqual(row["status"], "complete")
        self.assertEqual(row["decisionProbability"], 0.)
        self.assertGreater(row["rejectionProbability"], 0.)
        self.assertEqual(row["simulatedTasks"], [{k: t[k] for k in ("id", "weight", "family", "stratum")} for t in spec["tasks"]])
        self.assertEqual(row["intervalMethod"], "percentile")
        self.assertGreater(row["expectedIntervalWidth"], 0.)
        spec["analysis"]["decision"]["rule"] = "adopt-if-all-primary"
        row = analyze_paired.analyze_paired(request_for(spec, lambda r: r["orderPosition"]))["inference"]["precisionPower"]["scenarios"][0]
        self.assertEqual(row["decisionProbability"], 0.)

    def test_selected_unsimulated_process_is_explicit_not_disabled(self):
        spec = configured_spec(method="independent-block-v1", tasks=6)
        # A selected but unsimulated method must still be a valid frozen method.
        spec["analysis"]["models"] = [{
            "id": "selected-model", "method": "gaussian-mixedlm", "likelihood": "gaussian",
            "fixedEffects": ["intercept", "condition"],
            "randomEffects": ["task-intercept", "task-condition"],
            "priors": {"metricId": "accepted"}, "sampler": "not-applicable",
            "intervalProbability": .95, "draws": 0, "chains": 0, "seed": 7,
        }]
        spec["analysis"]["precisionPower"] = {"method": "simulation", "simulationCount": 2, "seed": 7,
            "scenarios": [{"id": "requires-model", "tasks": 6, "repetitions": 1, "effect": 1., "taskStandardDeviation": .1, "failureRate": 0., "graderErrorRate": 0.}]}
        result = analyze_paired.analyze_paired(request_for(spec, lambda r: r["orderPosition"]))
        scenario = result["inference"]["precisionPower"]["scenarios"][0]
        self.assertEqual(scenario["status"], "unsupported")
        self.assertIn("selected model", scenario["reason"])
        self.assertNotIn("decisionProbability", scenario)
        self.assertNotEqual(result["scientificDecision"], "adopt")

    def test_task_cluster_percentile_coverage_with_predeclared_tolerance(self) -> None:
        import numpy as np

        rng = np.random.default_rng(BOOTSTRAP_COVERAGE_SEED)
        covered = 0
        for simulation in range(BOOTSTRAP_COVERAGE_RUNS):
            effects = rng.normal(0.0, 1.0, size=16)
            items = [
                {
                    "taskId": f"t{index}", "family": f"f{index}",
                    "effect": float(effect), "weight": 1.0, "strata": {},
                }
                for index, effect in enumerate(effects)
            ]
            interval = statistical_core.cluster_bootstrap(
                items, unit="task", stratify_by=[], method="percentile",
                draws=BOOTSTRAP_DRAWS, confidence_level=BOOTSTRAP_LEVEL,
                seed=BOOTSTRAP_COVERAGE_SEED + simulation + 1,
            )
            covered += int(interval["lower"] <= 0.0 <= interval["upper"])
        coverage = covered / BOOTSTRAP_COVERAGE_RUNS
        monte_carlo_se = math.sqrt(coverage * (1 - coverage) / BOOTSTRAP_COVERAGE_RUNS)
        self.assertLessEqual(abs(coverage - BOOTSTRAP_LEVEL), BOOTSTRAP_COVERAGE_TOLERANCE)
        self.assertLessEqual(monte_carlo_se, 0.05)

    def test_null_false_rejection_calibration_reports_monte_carlo_uncertainty(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=8)
        continuous_metric(spec)
        finite_plan(spec, first=6, final=8)
        spec["analysis"]["bootstrap"]["method"] = "none"
        spec["analysis"]["bootstrap"]["draws"] = 0
        spec["analysis"]["precisionPower"] = {
            "method": "simulation-with-reference",
            "simulationCount": NULL_SIMULATIONS,
            "seed": NULL_SEED,
            "scenarios": [
                {
                    "id": "sharp-null-calibration",
                    "tasks": 8,
                    "repetitions": 1,
                    "effect": 0.0,
                    "taskStandardDeviation": 1.0,
                    "failureRate": 0.0,
                    "graderErrorRate": 0.0,
                }
            ],
        }
        result = analyze_paired.analyze_paired(request_for(spec, lambda row: row["orderPosition"]))
        simulation = result["inference"]["precisionPower"]
        row = simulation["scenarios"][0]
        self.assertEqual(simulation["seed"], NULL_SEED)
        self.assertEqual(row["simulations"], NULL_SIMULATIONS)
        self.assertEqual(row["status"], "complete")
        self.assertIn("finite-look-union-bound", row["fullDesignPath"])
        self.assertLessEqual(row["rejectionProbability"], NULL_MAX_FALSE_REJECTION)
        # Six independent blocks attain 1/64 < .025. The interim must actually
        # reject in this fixed-seed null run, not merely exist as a dead branch.
        self.assertGreater(row["earlyStopProbability"], 0.0)
        self.assertEqual(row["decisionProbability"], 0.0)  # saved estimate-only rule
        self.assertAlmostEqual(
            row["rejectionProbabilityMonteCarloSE"],
            math.sqrt(row["rejectionProbability"] * (1 - row["rejectionProbability"]) / NULL_SIMULATIONS),
        )
        print("NULL_CALIBRATION", {key: row[key] for key in ("rejectionProbability", "rejectionProbabilityMonteCarloSE", "rejectionProbabilityMonteCarloInterval", "earlyStopProbability")}, "ceiling", NULL_MAX_FALSE_REJECTION)
        # The predeclared ceiling is wider than three null-binomial SEs.
        null_se = math.sqrt(NULL_ALPHA * (1 - NULL_ALPHA) / NULL_SIMULATIONS)
        self.assertGreaterEqual(NULL_MAX_FALSE_REJECTION, NULL_ALPHA + 3 * null_se)

    def test_tasks_versus_repetitions_run_through_balanced_assignment_and_analysis(self) -> None:
        spec = configured_spec(method="balanced-cyclic-v1", tasks=12)
        continuous_metric(spec)
        spec["analysis"]["bootstrap"]["method"] = "none"
        spec["analysis"]["bootstrap"]["draws"] = 0
        spec["analysis"]["precisionPower"] = {
            "method": "simulation-with-reference",
            "simulationCount": POWER_SIMULATIONS,
            "seed": POWER_SEED,
            "scenarios": [
                {
                    "id": "more-tasks",
                    "tasks": 12,
                    "repetitions": 1,
                    "effect": 0.8,
                    "taskStandardDeviation": 0.5,
                    "failureRate": 0.02,
                    "graderErrorRate": 0.01,
                },
                {
                    "id": "more-repetitions",
                    "tasks": 6,
                    "repetitions": 2,
                    "effect": 0.8,
                    "taskStandardDeviation": 0.5,
                    "failureRate": 0.02,
                    "graderErrorRate": 0.01,
                },
            ],
        }
        result = analyze_paired.analyze_paired(request_for(spec, lambda row: row["orderPosition"]))
        simulation = result["inference"]["precisionPower"]
        by_id = {row["id"]: row for row in simulation["scenarios"]}
        self.assertEqual(simulation["seed"], POWER_SEED)
        self.assertEqual(simulation["separateRandomStreams"], [
            "outcomes", "assignment", "grading", "inner-randomization"
        ])
        self.assertTrue(all(row["status"] == "complete" for row in by_id.values()))
        self.assertIn("balanced-cyclic-v1", by_id["more-tasks"]["fullDesignPath"])
        self.assertLess(
            by_id["more-tasks"]["analyticExpectedIntervalWidth"],
            by_id["more-repetitions"]["analyticExpectedIntervalWidth"],
        )
        self.assertGreater(by_id["more-tasks"]["rejectionProbability"], 0.5)
        self.assertTrue(all(row["decisionProbability"] == 0. for row in by_id.values()))
        self.assertTrue(all(row["expectedIntervalWidth"] is None for row in by_id.values()))
        self.assertTrue(all(row["analyticPairedTaskReference"] is not None for row in by_id.values()))

    def test_simulation_budget_refusal_and_binomial_boundary_are_explicit(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=12)
        continuous_metric(spec)
        spec["analysis"]["precisionPower"] = {
            "method": "simulation",
            "simulationCount": 10000,
            "seed": 2,
            "scenarios": [{
                "id": "too-large", "tasks": 12, "repetitions": 2,
                "effect": 0.1, "taskStandardDeviation": 1.0,
                "failureRate": 0.0, "graderErrorRate": 0.0,
            }],
        }
        result = analyze_paired.analyze_paired(request_for(spec, lambda row: row["orderPosition"]))
        scenario = result["inference"]["precisionPower"]["scenarios"][0]
        self.assertEqual(result["status"], "unsupported")
        self.assertEqual(scenario["status"], "unsupported")
        self.assertIn("5,000,000", scenario["reason"])

        lower, upper = statistical_core.clopper_pearson(0, 100, 0.95)
        self.assertEqual(lower, 0.0)
        self.assertAlmostEqual(upper, 1 - 0.025 ** (1 / 100), places=14)


if __name__ == "__main__":
    unittest.main()
