#!/usr/bin/env python3
"""Behavioral evidence for the new native telemetry contract.

The cases distinguish observed zero from unavailable values, retain units and
conflicting model/settings observations, separate every traffic role, and prove
that recursive direct and inclusive views are alternatives rather than additive
usage.  Duplicate/missing ownership fails instead of guessing attribution.  A
historical source digest is inert on this path.
"""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import aggregate_telemetry  # noqa: E402


class TelemetryProjectionTests(unittest.TestCase):
    def request(self):
        return {
            "schemaVersion": 1,
            "attempts": [
                {
                    "attemptId": "measured-zero",
                    "role": "measured",
                    "nativeResult": {
                        "status": "completed",
                        "request": {"model": "requested-model", "settings": {"temperature": 0}},
                        "resolvedModel": "resolved-model",
                        "observedModel": "observed-model",
                        "observedSettings": {"temperature": 1},
                        "usage": {
                            "scope": "direct",
                            "input": 0,
                            "output": 0,
                            "cacheRead": 0,
                            "cacheWrite": 0,
                            "cost": 0,
                            "costUnit": "USD",
                            "agentCalls": 1,
                            "toolCalls": 0,
                            "latencyMs": 0
                        },
                        "logFile": "/tmp/native-measured-zero.jsonl"
                    },
                    "children": []
                },
                {
                    "attemptId": "measured-recursive",
                    "role": "measured",
                    "nativeResult": {
                        "status": "completed",
                        "directUsage": {
                            "inputTokens": 10,
                            "outputTokens": 5,
                            "cacheReadTokens": 0,
                            "cacheWriteTokens": 0,
                            "costUsd": 0.10,
                            "agentCalls": 1,
                            "toolCalls": 1,
                            "latencyMs": 50
                        },
                        "inclusiveUsage": {
                            "inputTokens": 100,
                            "outputTokens": 30,
                            "cacheReadTokens": 0,
                            "cacheWriteTokens": 0,
                            "costUsd": 1.00,
                            "agentCalls": 3,
                            "toolCalls": 3,
                            "latencyMs": 80
                        }
                    },
                    "children": [
                        {
                            "childId": "child-one",
                            "nativeResult": {
                                "status": "completed",
                                "directUsage": {
                                    "inputTokens": 30,
                                    "outputTokens": 10,
                                    "cacheReadTokens": 0,
                                    "cacheWriteTokens": 0,
                                    "costUsd": 0.30,
                                    "agentCalls": 1,
                                    "toolCalls": 1,
                                    "latencyMs": 20
                                }
                            },
                            "children": [
                                {
                                    "childId": "child-two",
                                    "nativeResult": {
                                        "status": "completed",
                                        "directUsage": {
                                            "inputTokens": 20,
                                            "outputTokens": 5,
                                            "cacheReadTokens": 0,
                                            "cacheWriteTokens": 0,
                                            "costUsd": 0.20,
                                            "agentCalls": 1,
                                            "toolCalls": 1,
                                            "latencyMs": 10
                                        }
                                    },
                                    "children": []
                                }
                            ]
                        }
                    ]
                },
                {
                    "attemptId": "judge-inclusive",
                    "role": "judge",
                    "nativeResult": {
                        "status": "completed",
                        "usage": {
                            "scope": "inclusive",
                            "input": 40,
                            "output": 8,
                            "cacheRead": 0,
                            "cacheWrite": 0,
                            "cost": 0.4,
                            "costUnit": "USD",
                            "agentCalls": 2,
                            "toolCalls": 2,
                            "latencyMs": 30
                        }
                    },
                    "children": [
                        {
                            "childId": "judge-child",
                            "nativeResult": {
                                "status": "completed",
                                "directUsage": {
                                    "inputTokens": 10,
                                    "outputTokens": 2,
                                    "cacheReadTokens": 0,
                                    "cacheWriteTokens": 0,
                                    "costUsd": 0.1,
                                    "agentCalls": 1,
                                    "toolCalls": 1,
                                    "latencyMs": 5
                                }
                            },
                            "children": []
                        }
                    ]
                },
                {
                    "attemptId": "adjudicator-one",
                    "role": "adjudicator",
                    "nativeResult": {
                        "status": "completed",
                        "usage": {"input": 4, "output": 1, "cacheRead": 0, "cacheWrite": 0, "cost": 0.04, "costUnit": "USD"},
                        "toolCalls": [{"name": "read"}, {"name": "write"}],
                        "latencyMs": 7
                    },
                    "children": []
                },
                {
                    "attemptId": "retry-conflict",
                    "role": "retry",
                    "nativeResult": {
                        "status": "failed",
                        "usage": {"input": 1, "inputTokens": 2, "output": 0}
                    },
                    "children": []
                },
                {
                    "attemptId": "smoke-unknown",
                    "role": "smoke",
                    "nativeResult": {"status": "cancelled"},
                    "children": []
                },
                {
                    "attemptId": "local-one",
                    "role": "local",
                    "nativeResult": {
                        "status": "completed",
                        "usage": {"input": 0, "output": 0, "cost": 0.25}
                    },
                    "children": []
                }
            ],
            "ownership": [
                {"childId": "child-one", "ownerAttemptId": "measured-recursive"},
                {"childId": "child-two", "ownerAttemptId": "measured-recursive"},
                {"childId": "judge-child", "ownerAttemptId": "judge-inclusive"}
            ]
        }

    def test_roles_zero_unknown_status_units_and_native_fields_are_distinct(self) -> None:
        request = self.request()
        original = deepcopy(request)
        result = aggregate_telemetry.aggregate_telemetry(request)
        self.assertEqual(request, original, "projection mutated native input")
        self.assertEqual(
            set(result["totals"]),
            {"measured", "judge", "adjudicator", "retry", "smoke", "local", "all"},
        )
        by_id = {row["attemptId"]: row for row in result["attempts"]}
        zero = by_id["measured-zero"]["entities"][0]
        self.assertEqual(zero["usage"]["direct"]["inputTokens"]["status"], "observed")
        self.assertEqual(zero["usage"]["direct"]["inputTokens"]["value"], 0)
        self.assertEqual(zero["usage"]["direct"]["inputTokens"]["unit"], "tokens")
        self.assertEqual(zero["nativeUsage"]["usage"], request["attempts"][0]["nativeResult"]["usage"])
        self.assertEqual(zero["nativeStatus"]["normalized"], "completed")
        self.assertEqual(zero["logs"][0]["value"], "/tmp/native-measured-zero.jsonl")

        unknown = by_id["smoke-unknown"]["entities"][0]["usage"]["direct"]["inputTokens"]
        self.assertEqual(unknown["status"], "unavailable")
        self.assertIsNone(unknown["value"])
        self.assertEqual(result["totals"]["smoke"]["accounted"]["inputTokens"]["status"], "unavailable")
        adjudicator = by_id["adjudicator-one"]["entities"][0]
        self.assertEqual(adjudicator["usage"]["direct"]["toolCalls"]["value"], 2)
        self.assertEqual(adjudicator["usage"]["direct"]["latencyMs"]["value"], 7)
        self.assertEqual(len(adjudicator["nativeTools"]), 2)
        self.assertEqual(adjudicator["nativeTiming"]["latencyMs"], 7)
        self.assertEqual(result["totals"]["local"]["accounted"]["cost"]["unit"], None)
        self.assertTrue(any("native cost unit is unavailable" in row for row in result["limitations"]))

    def test_unique_direct_and_inclusive_are_alternatives_never_added(self) -> None:
        result = aggregate_telemetry.aggregate_telemetry(self.request())
        by_id = {row["attemptId"]: row for row in result["attempts"]}
        measured = by_id["measured-recursive"]["usage"]
        self.assertEqual(measured["direct"]["inputTokens"]["value"], 60)
        self.assertEqual(measured["inclusive"]["inputTokens"]["value"], 100)
        self.assertEqual(measured["accounted"]["inputTokens"]["value"], 60)
        self.assertEqual(measured["accounted"]["inputTokens"]["basis"], "unique-direct")
        self.assertEqual(result["totals"]["measured"]["accounted"]["inputTokens"]["value"], 60)

        judge = by_id["judge-inclusive"]["usage"]
        self.assertEqual(judge["direct"]["inputTokens"]["status"], "partial")
        self.assertEqual(judge["direct"]["inputTokens"]["value"], 10)
        self.assertEqual(judge["inclusive"]["inputTokens"]["value"], 40)
        self.assertEqual(judge["accounted"]["inputTokens"]["value"], 40)
        self.assertEqual(judge["accounted"]["inputTokens"]["basis"], "root-inclusive")
        self.assertEqual(result["totals"]["judge"]["accounted"]["inputTokens"]["value"], 40)

    def test_observed_model_settings_and_alias_conflicts_are_retained(self) -> None:
        result = aggregate_telemetry.aggregate_telemetry(self.request())
        by_id = {row["attemptId"]: row for row in result["attempts"]}
        entity = by_id["measured-zero"]["entities"][0]
        self.assertEqual(entity["models"]["requested"]["value"], "requested-model")
        self.assertEqual(entity["models"]["observed"]["value"], "observed-model")
        kinds = {row["kind"] for row in entity["observationConflicts"]}
        self.assertIn("requested-vs-observed-model", kinds)
        self.assertIn("requested-vs-observed-settings", kinds)

        conflict = by_id["retry-conflict"]["entities"][0]["usage"]["direct"]["inputTokens"]
        self.assertEqual(conflict["status"], "conflict")
        self.assertEqual(len(conflict["observations"]), 2)
        self.assertIsNone(conflict["value"])
        self.assertTrue(any("conflicting native aliases" in row for row in result["limitations"]))

    def test_new_projection_does_not_require_or_gate_on_source_attestation(self) -> None:
        attempts = []
        for index in (1, 2):
            attempts.append({
                "attemptId": f"plain-{index}",
                "role": "measured",
                "nativeResult": {
                    "status": "completed",
                    "usage": {"input": index, "output": 0},
                    "providerNative": {"source_digest": "same-historical-attestation-value"},
                },
                "children": [],
            })
        result = aggregate_telemetry.aggregate_telemetry(
            {"schemaVersion": 1, "attempts": attempts, "ownership": []}
        )
        self.assertEqual(result["totals"]["measured"]["accounted"]["inputTokens"]["value"], 3)
        self.assertFalse(any("digest" in item for item in result["limitations"]))

    def test_duplicate_or_missing_ownership_is_refused(self) -> None:
        request = self.request()
        request["ownership"].append({"childId": "child-one", "ownerAttemptId": "measured-recursive"})
        with self.assertRaisesRegex(aggregate_telemetry.TelemetryContractError, "more than one owner"):
            aggregate_telemetry.aggregate_telemetry(request)

        request = self.request()
        request["ownership"] = [row for row in request["ownership"] if row["childId"] != "child-two"]
        with self.assertRaisesRegex(aggregate_telemetry.TelemetryContractError, "child-two.*ownership"):
            aggregate_telemetry.aggregate_telemetry(request)

    def test_empty_roles_remain_explicit_without_fabricating_zeros(self) -> None:
        result = aggregate_telemetry.aggregate_telemetry({"schemaVersion": 1, "attempts": [], "ownership": []})
        for role in ("measured", "judge", "adjudicator", "retry", "smoke", "local"):
            self.assertEqual(result["totals"][role]["attemptCount"], 0)
            metric = result["totals"][role]["accounted"]["inputTokens"]
            self.assertEqual(metric["status"], "unavailable")
            self.assertIsNone(metric["value"])


if __name__ == "__main__":
    unittest.main()
