#!/usr/bin/env python3
"""Independent oracle evidence for assignment-matched randomization methods.

The expected allocation sets below are built directly with itertools.  They do
not call the production enumerator to manufacture their expected answers.
"""

from __future__ import annotations

from collections import Counter
import copy
from itertools import permutations, product
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import analysis_engine  # noqa: E402
import analyze_paired  # noqa: E402
import benchmark_lib as lib  # noqa: E402
import generate_schedule  # noqa: E402


def base_spec() -> dict:
    return json.loads((ROOT / "tests/fixtures/refactor/minimal-deterministic/spec.json").read_text())


def configured_spec(
    *,
    method: str,
    tasks: int = 2,
    repetitions: int = 1,
    conditions: int = 2,
) -> dict:
    spec = base_spec()
    task_template = spec["tasks"][0]
    spec["tasks"] = []
    for index in range(tasks):
        item = copy.deepcopy(task_template)
        item.update(
            id=f"task-{index + 1}",
            weight=float(index + 1),
            family=f"family-{index // 2 + 1}",
            stratum="odd" if index % 2 else "even",
        )
        spec["tasks"].append(item)
    condition_template = spec["conditions"][0]
    spec["conditions"] = []
    for index in range(conditions):
        item = copy.deepcopy(condition_template)
        item["id"] = f"condition-{index + 1}"
        spec["conditions"].append(item)
    order = [item["id"] for item in spec["conditions"]]
    spec["design"]["conditionOrder"] = order
    spec["design"]["repetitions"] = repetitions
    spec["design"]["assignment"]["method"] = method
    spec["design"]["assignment"]["conditioning"] = "fixed-block-order"
    spec["design"]["assignment"]["parameters"] = {
        "periods": None,
        "carryoverAssumption": None,
        "balanceRemainder": (
            "random-distinct-shifts" if method == "balanced-cyclic-v1" else "not-applicable"
        ),
    }
    contrast = spec["analysis"]["contrasts"][0]
    contrast["id"] = "c2-v-c1"
    contrast["candidateConditionId"] = order[1]
    contrast["controlConditionId"] = order[0]
    contrast["taskWeighting"] = "equal"
    spec["analysis"]["randomization"]["inferenceContract"] = method
    spec["analysis"]["randomization"]["tail"] = "greater-or-equal"
    spec["analysis"]["randomization"]["maxExactAllocations"] = 100000
    spec["analysis"]["bootstrap"]["draws"] = 199
    hypothesis_ids = ["c2-v-c1.accepted"]
    spec["analysis"]["multiplicity"]["hypothesisIds"] = hypothesis_ids
    spec["analysis"]["sequential"] = {
        "method": "fixed-sample",
        "maxTasks": tasks,
        "looks": [{"id": "final", "completeTasks": tasks, "alphaByHypothesis": {hypothesis_ids[0]: 0.05}}],
        "stopOn": "final-look",
    }
    spec["analysis"]["sensitivities"] = ["missing-outcome-bounds"]
    spec["analysis"]["reliability"] = []
    spec["stoppingAndBudgets"]["maxTasks"] = tasks
    spec["stoppingAndBudgets"]["maxRepetitions"] = repetitions
    return spec


def request_for(spec: dict, value) -> dict:
    schedule = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": spec})
    task_by_id = {task["id"]: task for task in spec["tasks"]}
    rows = []
    for row in schedule["rows"]:
        task = task_by_id[row["taskId"]]
        rows.append(
            {
                **row,
                "family": task["family"],
                "stratum": task["stratum"],
                "attemptStatus": "succeeded",
                "outcomes": [
                    {
                        "metricId": "accepted",
                        "status": "observed",
                        "value": float(value(row)),
                    }
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


class AssignmentLawOracleTests(unittest.TestCase):
    def test_impossible_observed_support_rejected_before_exact_or_mc_limits(self):
        for method in ("balanced-cyclic-v1", "counterbalanced-v1", "task-vector-v1"):
            spec = configured_spec(method=method, tasks=4, repetitions=2 if method == "task-vector-v1" else 1)
            if method == "counterbalanced-v1":
                spec["design"]["assignment"].update(conditioning="period-and-block", parameters={"periods": 2, "carryoverAssumption": "none", "balanceRemainder": "not-applicable"})
            request = request_for(spec, lambda r: r["orderPosition"])
            for rows in (request["schedule"]["rows"], request["dataset"]["rows"]):
                for row in rows:
                    first_a = row["repetition"] == 1 if method == "task-vector-v1" else row["blockIndex"] <= 2
                    row["conditionId"] = "condition-1" if first_a == (row["orderPosition"] == 1) else "condition-2"
            for mode in ("exact", "monte-carlo", "exact-or-monte-carlo"):
                spec["analysis"]["randomization"].update(mode=mode, maxExactAllocations=1, permitApproximation=True)
                context = analysis_engine.build_context(request)
                result = analysis_engine.randomization_inference(context, analysis_engine.hypotheses(context)[0])
                self.assertEqual(result["status"], "unsupported")
                self.assertIn("outside", result["limitation"])
                self.assertFalse(result.get("exchangeableLaw", False))

    def test_legacy_generator_and_new_declared_laws_are_separate(self) -> None:
        legacy = generate_schedule.generate_schedule(
            benchmark_id="historical", schedule_revision="v1",
            conditions=["control", "candidate"], tasks=["task"],
            repetitions=1, seed=3, workers=1,
        )
        self.assertIsInstance(legacy, list)
        self.assertEqual([row["attempt_id"] for row in legacy], ["a-000001", "a-000002"])
        self.assertTrue(all(row["schedule_mode"] == "comparative" for row in legacy))
        spec = configured_spec(method="independent-block-v1", tasks=1)
        declared = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": spec})
        self.assertIsInstance(declared, dict)
        self.assertEqual(declared["assignment"]["method"], "independent-block-v1")
        self.assertNotIn("schedule_mode", declared["rows"][0])

        unsupported = configured_spec(method="independent-block-v1", tasks=1)
        unsupported["design"]["assignment"].update(method="counterbalanced-v1")
        with self.assertRaisesRegex(lib.InputError, "conditioning"):
            generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": unsupported})

    def test_existing_balanced_cyclic_is_four_not_six_or_sixteen(self) -> None:
        spec = configured_spec(method="balanced-cyclic-v1", tasks=4)
        schedule = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": spec})
        distribution = generate_schedule.allocation_distribution(schedule, max_generating_paths=100)

        symbols = ("condition-1", "condition-2")
        paths = []
        for base in permutations(symbols):
            for cycle_one in permutations(range(2)):
                for cycle_two in permutations(range(2)):
                    shifts = cycle_one + cycle_two
                    paths.append(tuple(base[shift:] + base[:shift] for shift in shifts))
        oracle = Counter(paths)
        production = {
            tuple(tuple(order) for order in atom["allocation"]): atom["pathMultiplicity"]
            for atom in distribution["atoms"]
        }
        arbitrary_balance = {
            allocation
            for allocation in product(symbols, repeat=4)
            if allocation.count("condition-1") == 2
        }
        independent = set(product(symbols, repeat=4))

        self.assertEqual(production, oracle)
        self.assertEqual(distribution["generatingPathCount"], 8)
        self.assertEqual(distribution["uniqueAllocationCount"], 4)
        self.assertEqual(len(arbitrary_balance), 6)
        self.assertEqual(len(independent), 16)
        self.assertTrue(all(atom["probability"] == 0.25 for atom in distribution["atoms"]))
        metadata = generate_schedule.assignment_law_metadata(schedule)
        self.assertEqual(metadata["equiprobableChoiceFactor"], math.factorial(2))
        self.assertEqual(metadata["independentChoiceCount"], 3)
        self.assertEqual(
            metadata["equiprobableChoiceFactor"] ** metadata["independentChoiceCount"],
            len(paths),
        )
        self.assertTrue(metadata["duplicateGeneratingPathsMayShareAllocation"])

    def test_balanced_multicondition_remainder_path_weights_match_oracle(self) -> None:
        spec = configured_spec(method="balanced-cyclic-v1", tasks=4, conditions=3)
        schedule = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": spec})
        distribution = generate_schedule.allocation_distribution(schedule, max_generating_paths=1000)
        symbols = tuple(spec["design"]["conditionOrder"])
        oracle: Counter[tuple[tuple[str, ...], ...]] = Counter()
        for base in permutations(symbols):
            for complete_cycle in permutations(range(3)):
                for remainder_cycle in permutations(range(3)):
                    shifts = (complete_cycle + remainder_cycle)[:4]
                    oracle[tuple(base[shift:] + base[:shift] for shift in shifts)] += 1
        production = {
            tuple(tuple(order) for order in atom["allocation"]): atom["pathMultiplicity"]
            for atom in distribution["atoms"]
        }
        self.assertEqual(distribution["generatingPathCount"], 216)
        self.assertEqual(production, oracle)
        self.assertAlmostEqual(sum(atom["probability"] for atom in distribution["atoms"]), 1.0)

    def test_independent_and_task_vector_supports_have_their_own_units(self) -> None:
        independent_spec = configured_spec(method="independent-block-v1", tasks=2, repetitions=2)
        independent = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": independent_spec})
        independent_law = generate_schedule.allocation_distribution(independent, max_generating_paths=100)
        self.assertEqual(independent_law["generatingPathCount"], 16)
        self.assertEqual(independent_law["uniqueAllocationCount"], 16)

        task_spec = configured_spec(method="task-vector-v1", tasks=2, repetitions=2)
        task_schedule = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": task_spec})
        task_law = generate_schedule.allocation_distribution(task_schedule, max_generating_paths=100)
        self.assertEqual(task_law["generatingPathCount"], 4)
        self.assertEqual(task_law["uniqueAllocationCount"], 4)
        block_tasks = [block[0]["taskId"] for block in analysis_engine.build_context(
            request_for(task_spec, lambda row: row["orderPosition"])
        )["orderedBlocks"]]
        for atom in task_law["atoms"]:
            orders = [tuple(order) for order in atom["allocation"]]
            for task_id in set(block_tasks):
                self.assertEqual(len({orders[i] for i, observed in enumerate(block_tasks) if observed == task_id}), 1)

    def test_observed_schedule_outside_balanced_law_is_rejected(self) -> None:
        spec = configured_spec(method="balanced-cyclic-v1", tasks=4)
        schedule = generate_schedule.generate_schedule({"schemaVersion": 1, "resolvedSpec": spec})
        desired = ("condition-1", "condition-1", "condition-2", "condition-2")
        by_block = {}
        for row in schedule["rows"]:
            by_block.setdefault(row["blockIndex"], []).append(row)
        for first, (_, rows) in zip(desired, sorted(by_block.items())):
            rows.sort(key=lambda row: row["orderPosition"])
            rows[0]["conditionId"] = first
            rows[1]["conditionId"] = "condition-2" if first == "condition-1" else "condition-1"
        with self.assertRaisesRegex(lib.ContractError, "outside its declared assignment law"):
            generate_schedule.allocation_distribution(schedule, max_generating_paths=100)


class RandomizationInferenceTests(unittest.TestCase):
    def test_exact_independent_block_p_value_matches_hand_enumeration(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=2)
        request = request_for(spec, lambda row: row["blockIndex"] * (row["orderPosition"] - 1))
        result = analyze_paired.analyze_paired(request)
        inference = result["inference"]["randomization"][0]

        position_values = ((0.0, 1.0), (0.0, 2.0))
        observed_orders = generate_schedule.observed_allocation(request["schedule"])

        def statistic(orders):
            effects = []
            for values, order in zip(position_values, orders):
                assigned = dict(zip(order, values))
                effects.append(assigned["condition-2"] - assigned["condition-1"])
            return sum(effects) / len(effects)

        observed = statistic(observed_orders)
        oracle_statistics = [
            statistic(orders)
            for orders in product(tuple(permutations(("condition-1", "condition-2"))), repeat=2)
        ]
        oracle_p = sum(value >= observed - 1e-12 for value in oracle_statistics) / 4
        self.assertEqual(inference["allocationCount"], 4)
        self.assertEqual(inference["pValue"], oracle_p)
        self.assertEqual(inference["minimumAttainableP"], 0.25)
        self.assertTrue(inference["observedAllocationIncluded"])

    def test_task_vector_exact_p_value_matches_task_level_oracle(self) -> None:
        spec = configured_spec(method="task-vector-v1", tasks=2, repetitions=2)
        request = request_for(
            spec,
            lambda row: row["blockIndex"] + 2 * (row["orderPosition"] - 1),
        )
        inference = analyze_paired.analyze_paired(request)["inference"]["randomization"][0]
        blocks = {}
        dataset_by_id = {row["attemptId"]: row for row in request["dataset"]["rows"]}
        for row in request["schedule"]["rows"]:
            blocks.setdefault(row["blockIndex"], []).append(row)
        ordered_blocks = [sorted(rows, key=lambda row: row["orderPosition"]) for _, rows in sorted(blocks.items())]
        condition_orders = tuple(permutations(("condition-1", "condition-2")))

        def statistic(order_by_task):
            cells = {}
            for block in ordered_blocks:
                task = block[0]["taskId"]
                for condition, row in zip(order_by_task[task], block):
                    cells.setdefault((task, condition), []).append(
                        dataset_by_id[row["attemptId"]]["outcomes"][0]["value"]
                    )
            effects = []
            for task in ("task-1", "task-2"):
                candidate = sum(cells[(task, "condition-2")]) / 2
                control = sum(cells[(task, "condition-1")]) / 2
                effects.append(candidate - control)
            return sum(effects) / 2

        observed_by_task = {}
        for block in ordered_blocks:
            observed_by_task[block[0]["taskId"]] = tuple(row["conditionId"] for row in block)
        observed = statistic(observed_by_task)
        oracle = [
            statistic({"task-1": first, "task-2": second})
            for first, second in product(condition_orders, repeat=2)
        ]
        self.assertEqual(inference["pValue"], sum(value >= observed - 1e-12 for value in oracle) / 4)
        self.assertEqual(inference["assignmentUnit"], "task-vector")
        self.assertEqual(inference["generatingPathCount"], 4)

    def test_contract_mismatch_and_exact_limit_refuse_without_fallback(self) -> None:
        balanced_spec = configured_spec(method="balanced-cyclic-v1", tasks=4)
        balanced_spec["analysis"]["randomization"]["inferenceContract"] = "task-vector-v1"
        mismatch = analyze_paired.analyze_paired(
            request_for(balanced_spec, lambda row: row["orderPosition"])
        )
        row = mismatch["inference"]["randomization"][0]
        self.assertEqual(mismatch["status"], "unsupported")
        self.assertEqual(row["status"], "unsupported")
        self.assertIn("no arbitrary balanced or independent-swap fallback", row["limitation"])

        exact_spec = configured_spec(method="independent-block-v1", tasks=5)
        exact_spec["analysis"]["randomization"]["maxExactAllocations"] = 4
        exact = analyze_paired.analyze_paired(request_for(exact_spec, lambda row: row["orderPosition"]))
        refused = exact["inference"]["randomization"][0]
        self.assertEqual(refused["method"], "exact-refused")
        self.assertIsNone(refused["pValue"])

    def test_prespecified_monte_carlo_is_seeded_labeled_and_has_uncertainty(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=5)
        randomization = spec["analysis"]["randomization"]
        randomization.update(mode="exact-or-monte-carlo", maxExactAllocations=4, permitApproximation=True)
        randomization["monteCarlo"] = {"draws": 127, "seed": 9127, "intervalLevel": 0.95}
        request = request_for(spec, lambda row: row["orderPosition"] + row["blockIndex"] / 10)
        first = analyze_paired.analyze_paired(request)["inference"]["randomization"][0]
        second = analyze_paired.analyze_paired(request)["inference"]["randomization"][0]
        self.assertEqual(first, second)
        self.assertEqual(first["method"], "seeded-monte-carlo-randomization")
        self.assertTrue(first["approximation"])
        self.assertTrue(first["exchangeableLaw"])
        self.assertEqual(first["minimumAttainableP"], 1 / 128)
        self.assertLessEqual(first["monteCarloPInterval"][0], first["pValue"])
        self.assertGreaterEqual(first["monteCarloPInterval"][1], first["pValue"])
        self.assertIn("not exact", first["limitation"])

    def test_multi_condition_exact_and_tolerance_rescaling(self) -> None:
        spec = configured_spec(method="independent-block-v1", tasks=2, conditions=3)
        second = copy.deepcopy(spec["analysis"]["contrasts"][0])
        second.update(id="c3-v-c1", candidateConditionId="condition-3")
        spec["analysis"]["contrasts"].append(second)
        hypothesis_ids = ["c2-v-c1.accepted", "c3-v-c1.accepted"]
        spec["analysis"]["multiplicity"]["hypothesisIds"] = hypothesis_ids
        spec["analysis"]["multiplicity"]["method"] = "holm"
        spec["analysis"]["sequential"]["looks"][0]["alphaByHypothesis"] = {
            hypothesis_id: 0.025 for hypothesis_id in hypothesis_ids
        }
        request = request_for(spec, lambda row: 1e6 * (row["orderPosition"] + row["blockIndex"] / 10))
        spec["analysis"]["randomization"]["tieTolerance"] = {"absolute": 0.0, "relative": 1e-12}
        result = analyze_paired.analyze_paired(request)
        rows = result["inference"]["randomization"]
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(row["generatingPathCount"] == 36 for row in rows))
        self.assertEqual(result["multiplicity"]["method"], "holm")
        self.assertTrue(all(row["tolerance"]["relative"] == 1e-12 for row in rows))

        p_value, tie_mass = analysis_engine._tail_probability(
            [1e12, 1e12 + 0.5, -1e12], [0.25, 0.25, 0.5], 1e12,
            "greater-or-equal", {"absolute": 0.0, "relative": 1e-12},
        )
        self.assertEqual(p_value, 0.5)
        self.assertEqual(tie_mass, 0.5)
        self.assertTrue(math.isfinite(p_value))


if __name__ == "__main__":
    unittest.main()
