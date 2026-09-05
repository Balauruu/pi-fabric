#!/usr/bin/env python3
"""Executable WP0 fixtures for the agent-benchmarking refactor."""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
from itertools import combinations, permutations, product
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "refactor"
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import benchmark_lib as lib  # noqa: E402


def load(path: Path):
    return lib.parse_json_bytes(path.read_bytes(), str(path))


def keys_in(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield key
            yield from keys_in(child)
    elif isinstance(value, list):
        for child in value:
            yield from keys_in(child)


class RefactorBaselineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.spec_schema = load(ROOT / "schemas" / "spec.schema.json")
        self.public_result_schema = load(ROOT / "schemas" / "result.schema.json")

    def assert_valid(self, instance, schema) -> None:
        self.assertEqual(lib.validate_json_schema(instance, schema), [])

    def test_minimal_deterministic_two_condition_fixture(self) -> None:
        fixture = FIXTURES / "minimal-deterministic"
        spec = load(fixture / "spec.json")
        schedule = load(fixture / "schedule.json")
        native_results = load(fixture / "native-results.json")
        expected = load(fixture / "expected.json")

        self.assert_valid(spec, self.spec_schema)
        self.assert_valid(expected["publicResult"], self.public_result_schema)
        forbidden = {
            "protectionmanifest",
            "protectedroots",
            "environmentinventory",
            "softwarefingerprint",
            "softwareidentity",
            "runtimeversion",
            "component",
            "database",
        }
        self.assertTrue(forbidden.isdisjoint(key.lower() for key in keys_in(spec)))

        rows = schedule["rows"]
        self.assertEqual(len(rows), len(spec["tasks"]) * len(spec["conditions"]))
        self.assertEqual(len({row["attemptId"] for row in rows}), len(rows))
        self.assertEqual(schedule["assignment"]["method"], spec["design"]["assignment"]["method"])

        result_by_attempt = {row["attemptId"]: row for row in native_results}
        expected_by_task = spec["grading"]["deterministic"]["expectedByTask"]
        grades = {}
        task_condition_scores = {}
        for row in rows:
            native = result_by_attempt[row["attemptId"]]
            score = int(native["nativeResult"]["output"].strip() == expected_by_task[row["taskId"]])
            grades[row["attemptId"]] = score
            task_condition_scores[(row["taskId"], row["conditionId"])] = score

        self.assertEqual(grades, expected["gradeByAttempt"])
        effects = {
            task["id"]: (
                task_condition_scores[(task["id"], "candidate")]
                - task_condition_scores[(task["id"], "control")]
            )
            for task in spec["tasks"]
        }
        weighted = sum(task["weight"] * effects[task["id"]] for task in spec["tasks"])
        weighted /= sum(task["weight"] for task in spec["tasks"])
        self.assertEqual(effects, expected["taskEffects"])
        self.assertEqual(weighted, expected["taskWeightedEffect"])
        self.assertEqual(expected["judgeCalls"], 0)
        self.assertEqual(expected["adjudicatorCalls"], 0)

    def test_interrupted_assignment_without_result_is_unresolved_not_replayable(self) -> None:
        run_dir = FIXTURES / "interrupted-assigned-no-result"
        spec = load(run_dir / "spec.json")
        schedule = load(run_dir / "schedule.json")
        checkpoint = load(run_dir / "checkpoint.json")
        expected = load(run_dir / "expected.json")
        self.assert_valid(spec, self.spec_schema)
        self.assert_valid(expected["publicResult"], self.public_result_schema)

        planned_ids = {row["attemptId"] for row in schedule["rows"]}
        assigned_ids = {
            path.parent.name
            for path in (run_dir / "attempts").glob("*/assignment.json")
        }
        result_ids = {
            path.parent.name
            for path in (run_dir / "attempts").glob("*/result.json")
        }
        terminal_ids = {
            path.parent.name
            for path in (run_dir / "attempts").glob("*/terminal.json")
        }
        unresolved = assigned_ids - terminal_ids
        reconstructed = {
            "planned": len(planned_ids),
            "assigned": len(assigned_ids),
            "terminal": len(terminal_ids),
            "failed": 0,
            "unresolved": len(unresolved),
            "pending": len(planned_ids - assigned_ids),
        }

        self.assertEqual(reconstructed, expected["authoritativeCounts"])
        self.assertNotEqual(checkpoint["counts"], reconstructed)
        self.assertEqual(unresolved, set(expected["automaticReplayForbidden"]))
        self.assertEqual(result_ids, set())
        self.assertEqual(terminal_ids, set())
        for attempt_id in unresolved:
            self.assertFalse((run_dir / "attempts" / attempt_id / "result.json").exists())
            self.assertFalse((run_dir / "attempts" / attempt_id / "terminal.json").exists())

    def test_balanced_cyclic_task_vector_mismatch_oracle(self) -> None:
        fixture = load(FIXTURES / "balanced-cyclic-mismatch" / "oracle.json")
        symbols = ("C", "A")
        shifts = tuple(permutations(range(2)))

        generating_paths = []
        for base in permutations(symbols):
            for first_cycle in shifts:
                for second_cycle in shifts:
                    generating_paths.append(
                        "".join(base[shift] for shift in first_cycle + second_cycle)
                    )
        balanced_counts = Counter(generating_paths)
        globally_balanced = {
            "".join("C" if index in control_positions else "A" for index in range(4))
            for control_positions in combinations(range(4), 2)
        }
        independent = {"".join(values) for values in product(symbols, repeat=4)}
        observed = fixture["observedAllocation"]
        task_vector = {
            "".join(
                symbol if keep else ("A" if symbol == "C" else "C")
                for symbol, keep in zip(observed, mask)
            )
            for mask in product((False, True), repeat=4)
        }

        self.assertEqual(len(generating_paths), fixture["balancedCyclic"]["generatingPathCount"])
        self.assertEqual(sorted(balanced_counts), fixture["balancedCyclic"]["uniqueAllocations"])
        self.assertEqual(dict(sorted(balanced_counts.items())), fixture["balancedCyclic"]["pathMultiplicityByAllocation"])
        self.assertEqual(sorted(globally_balanced), fixture["arbitraryGlobalBalance"]["uniqueAllocations"])
        self.assertEqual(len(balanced_counts), 4)
        self.assertEqual(len(globally_balanced), 6)
        self.assertEqual(len(independent), fixture["independentBlock"]["uniqueAllocationCount"])
        self.assertEqual(len(task_vector), fixture["taskVectorForFourOneRepetitionTasks"]["uniqueAllocationCount"])
        self.assertNotEqual(set(balanced_counts), task_vector)
        self.assertNotEqual(fixture["scheduleContract"], fixture["requestedInferenceContract"])
        self.assertEqual(Fraction(fixture["balancedCyclic"]["minimumOneSidedP"]), Fraction(1, 4))
        self.assertEqual(Fraction(fixture["arbitraryGlobalBalance"]["minimumOneSidedP"]), Fraction(1, 6))
        self.assertEqual(Fraction(fixture["independentBlock"]["minimumOneSidedP"]), Fraction(1, 16))
        self.assertEqual(fixture["expectedDecision"], "refuse-confirmatory-contract-mismatch")

    def test_spec_rejects_removed_infrastructure_fields(self) -> None:
        spec = load(FIXTURES / "minimal-deterministic" / "spec.json")
        spec["protectionManifest"] = {"roots": []}
        issues = lib.validate_json_schema(spec, self.spec_schema)
        self.assertIn("$.protectionManifest: additional property is forbidden", issues)


if __name__ == "__main__":
    unittest.main()
