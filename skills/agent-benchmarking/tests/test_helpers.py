#!/usr/bin/env python3
"""Stdlib-only deterministic and adversarial checks for benchmark helpers."""

from __future__ import annotations

import argparse
import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import aggregate_telemetry
import analyze_paired
import benchmark_lib as lib
import deep_stage
import final_integrity
import generate_blind_map
import generate_schedule
import reconcile_lifecycle
import run_canaries
import validate_contracts
import verify_seal


class TemporaryDirectoryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="agent-benchmark-tests-")
        self.temp = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_json(self, relative: str, value: object) -> Path:
        path = self.temp / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(lib.canonical_json_bytes(value))
        return path

    def write_jsonl(self, relative: str, values: list[object]) -> Path:
        path = self.temp / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(lib.canonical_jsonl_bytes(values))
        return path


class BenchmarkLibTests(TemporaryDirectoryTest):
    def test_strict_json_and_jsonl_reject_malformed_fixtures(self) -> None:
        malformed = ROOT / "validation/fixtures/malformed"
        with self.assertRaises(lib.InputError):
            lib.load_json(malformed / "duplicate-key.json")
        with self.assertRaises(lib.InputError):
            lib.load_json(malformed / "invalid.json")
        with self.assertRaises(lib.InputError):
            lib.load_json(malformed / "invalid-utf8.json")
        with self.assertRaises(lib.InputError):
            lib.load_jsonl(malformed / "crlf.jsonl")
        with self.assertRaises(lib.InputError):
            lib.load_jsonl(malformed / "blank-line.jsonl")

    def test_safe_paths_and_create_only_publication(self) -> None:
        for unsafe in ("../escape", "/absolute", "a\\b", "a//b", "file:test"):
            with self.subTest(unsafe=unsafe), self.assertRaises(lib.UnsafePathError):
                lib.safe_relative_path(unsafe)
        destination = self.temp / "artifact.json"
        lib.atomic_create_json(destination, {"b": 2, "a": 1})
        self.assertEqual(destination.read_bytes(), b'{"a":1,"b":2}\n')
        with self.assertRaises(lib.InputError):
            lib.atomic_create_json(destination, {"replacement": True})

    def test_schema_validator_rejects_additional_property(self) -> None:
        schema = lib.load_json(ROOT / "schemas/workflow-request.schema.json")
        good = lib.load_json(ROOT / "validation/fixtures/known-good/workflow-request.json")
        bad = lib.load_json(ROOT / "validation/fixtures/known-bad/workflow-request-extra-property.json")
        self.assertEqual(lib.validate_json_schema(good, schema), [])
        self.assertTrue(any("additional property" in issue for issue in lib.validate_json_schema(bad, schema)))

    def test_failed_atomic_output_never_partially_publishes_destination(self) -> None:
        destination = self.temp / "artifact.json"
        with mock.patch.object(os, "write", side_effect=OSError("injected write failure")):
            with self.assertRaises(lib.InputError):
                lib.atomic_create_bytes(destination, b"complete bytes")
        self.assertFalse(destination.exists())
        self.assertEqual(list(self.temp.glob(".artifact.json.tmp-*")), [])

    def test_write_once_entry_is_canonical_and_refuses_replacement(self) -> None:
        (self.temp / "input.json").write_text('{"b":2,"a":1}\n', encoding="utf-8")
        command = [
            sys.executable, "-B", str(SCRIPTS / "write_once.py"),
            "--root", str(self.temp), "--input", "input.json", "--json", "output.json",
        ]
        first = subprocess.run(command, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        second = subprocess.run(command, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.assertEqual(first.returncode, lib.EXIT_OK)
        self.assertEqual(second.returncode, lib.EXIT_INVALID)
        self.assertEqual((self.temp / "output.json").read_bytes(), b'{"a":1,"b":2}\n')


class ContractTests(TemporaryDirectoryTest):
    def test_every_schema_uses_supported_machine_contract(self) -> None:
        for name in validate_contracts.CONTRACT_NAMES:
            with self.subTest(schema=name):
                schema = lib.load_json(ROOT / f"schemas/{name}.schema.json")
                self.assertEqual(lib.check_schema(schema, machine_contract=True), [])

    def test_ref_helper_and_schema_agree_on_nested_required_fields(self) -> None:
        schema = {
            "$schema": lib.DRAFT_2020_12,
            "type": "object",
            "$defs": {
                "payload": {
                    "type": "object", "required": ["value"],
                    "properties": {"value": {"type": "integer"}},
                    "additionalProperties": False,
                }
            },
            "required": ["schema_version", "payload"],
            "properties": {
                "schema_version": {"const": 1},
                "payload": {"$ref": "#/$defs/payload"},
            },
            "additionalProperties": False,
        }
        self.assertEqual(lib.check_schema(schema, machine_contract=True), [])
        self.assertEqual(lib.validate_json_schema({"schema_version": 1, "payload": {"value": 2}}, schema), [])
        self.assertIn("$.payload: missing required property 'value'", lib.validate_json_schema({"schema_version": 1, "payload": {}}, schema))

    def test_validate_contracts_entry_classifies_documents(self) -> None:
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            status = validate_contracts.main([
                "--schema", "workflow-request",
                str(ROOT / "validation/fixtures/known-good/workflow-request.json"),
            ])
        self.assertEqual(status, lib.EXIT_OK)
        with contextlib.redirect_stderr(io.StringIO()):
            status = validate_contracts.main([
                "--schema", "workflow-request",
                str(ROOT / "validation/fixtures/known-bad/workflow-request-extra-property.json"),
            ])
        self.assertEqual(status, lib.EXIT_INVALID)


class ScheduleTests(TemporaryDirectoryTest):
    def test_schedule_is_deterministic_balanced_and_seeded(self) -> None:
        arguments = dict(
            benchmark_id="bench", schedule_revision="v1",
            conditions=["a", "b", "c"], tasks=["t1", "t2", "t3", "t4"],
            repetitions=2, workers=3,
        )
        first = generate_schedule.generate_schedule(seed=7, **arguments)
        second = generate_schedule.generate_schedule(seed=7, **arguments)
        alternate = generate_schedule.generate_schedule(seed=8, **arguments)
        self.assertEqual(first, second)
        self.assertNotEqual(first, alternate)
        self.assertEqual(len(first), 24)
        self.assertNotIn(b"\r", lib.canonical_jsonl_bytes(first))
        generate_schedule._check_schedule(first, arguments["conditions"], arguments["tasks"], 2, 3)

    def test_worker_and_condition_boundaries(self) -> None:
        cases = lib.load_json(ROOT / "validation/fixtures/boundary/schedule-boundaries.json")["cases"]
        for case in cases:
            with self.subTest(case=case["case_id"]):
                rows = generate_schedule.generate_schedule(
                    benchmark_id="boundary", schedule_revision="v1", seed=3,
                    conditions=case["conditions"], tasks=case["tasks"],
                    repetitions=case["repetitions"], workers=case["workers"],
                )
                self.assertEqual(max(row["worker_slot"] for row in rows), case["workers"])
                self.assertNotIn(b"\r", generate_schedule.csv_bytes(rows))

    def test_fixed_order_adversary_is_rejected(self) -> None:
        results = run_canaries.validate_synthetic_catalog(ROOT / "validation/fixtures/canary/synthetic-catalog.json")
        row = next(item for item in results if item["canary_id"] == "fixed-order")
        self.assertEqual(row["observed"], "rejected")


class SealTests(TemporaryDirectoryTest):
    def setUp(self) -> None:
        super().setUp()
        (self.temp / "seals").mkdir()
        (self.temp / "owned").mkdir()
        (self.temp / "owned/design.json").write_text("frozen\n", encoding="utf-8")

    def create(self) -> dict[str, object]:
        return verify_seal.create_seal(
            root=self.temp, seal="seals/design-v1", benchmark_id="bench",
            seal_type="design", revision="design-v1", previous_revision=None,
            created_at="2026-09-02T00:00:00Z", owned_paths=["owned"],
        )

    def test_create_verify_and_second_create_refusal(self) -> None:
        self.assertEqual(self.create()["status"], "passed")
        with self.assertRaises(lib.InputError):
            self.create()

    def test_changed_missing_extra_unmatched_and_unsafe_fail_closed(self) -> None:
        self.create()
        (self.temp / "owned/design.json").write_text("changed\n", encoding="utf-8")
        receipt = verify_seal.verify_seal(root=self.temp, seal="seals/design-v1")
        self.assertEqual(receipt["status"], "failed")
        self.assertIn("owned/design.json", receipt["errors"]["changed_sources"])
        copy_path = self.temp / "seals/design-v1/owned/design.json"
        copy_path.unlink()
        (self.temp / "seals/design-v1/extra.txt").write_text("extra", encoding="utf-8")
        receipt = verify_seal.verify_seal(root=self.temp, seal="seals/design-v1")
        self.assertTrue(receipt["errors"]["missing_copies"])
        self.assertTrue(receipt["errors"]["extra_copies"])
        with self.assertRaises(lib.UnsafePathError):
            verify_seal.verify_seal(root=self.temp, seal="../escape")

    def test_ownership_closure_detects_extra_owned_file(self) -> None:
        self.create()
        (self.temp / "owned/late.json").write_text("late\n", encoding="utf-8")
        receipt = verify_seal.verify_seal(
            root=self.temp, seal="seals/design-v1", ownership_roots=["owned"]
        )
        self.assertIn("owned/late.json", receipt["errors"]["extra_owned"])

    def test_seal_and_source_path_component_symlinks_fail_closed(self) -> None:
        self.create()
        copy_path = self.temp / "seals/design-v1/owned/design.json"
        copy_path.unlink()
        copy_path.symlink_to(self.temp / "owned/design.json")
        receipt = verify_seal.verify_seal(root=self.temp, seal="seals/design-v1")
        self.assertTrue(receipt["errors"]["unsafe_paths"])

        copy_path.unlink()
        copy_path.write_text("frozen\n", encoding="utf-8")
        source = self.temp / "owned/design.json"
        source.unlink()
        real = self.temp / "real-owned"
        real.mkdir()
        (real / "design.json").write_text("frozen\n", encoding="utf-8")
        (self.temp / "owned").rmdir()
        (self.temp / "owned").symlink_to(real, target_is_directory=True)
        receipt = verify_seal.verify_seal(root=self.temp, seal="seals/design-v1")
        self.assertTrue(receipt["errors"]["unsafe_paths"])

    def test_duplicate_unmatched_and_missing_source_manifest_entries_fail(self) -> None:
        self.create()
        manifest_path = self.temp / "seals/design-v1/manifest.json"
        manifest = lib.load_json(manifest_path)
        manifest["owned_paths"].append(manifest["owned_paths"][0])
        manifest["owned_paths"].append("owned/unmatched.json")
        manifest_path.write_bytes(lib.canonical_json_bytes(manifest))
        (self.temp / "owned/design.json").unlink()
        receipt = verify_seal.verify_seal(root=self.temp, seal="seals/design-v1")
        self.assertTrue(receipt["errors"]["duplicate_paths"])
        self.assertTrue(receipt["errors"]["unmatched_paths"])
        self.assertTrue(receipt["errors"]["missing_sources"])
        self.assertTrue(receipt["errors"]["contract"])


class BlindMapTests(TemporaryDirectoryTest):
    def test_seeded_bijection_privacy_and_write_once(self) -> None:
        rows = generate_schedule.generate_schedule(
            benchmark_id="bench", schedule_revision="v1", conditions=["a", "b"],
            tasks=["t1", "t2"], repetitions=1, seed=11, workers=2,
        )
        schedule = self.write_jsonl("schedule.jsonl", rows)
        private_path = self.temp / "private.json"
        public_path = self.temp / "public.json"
        private, public = generate_blind_map.create_blind_maps(
            schedule=schedule, seed=9, private_output=private_path, public_output=public_path
        )
        repeated = generate_blind_map.generate_blind_maps(
            rows, seed=9, schedule_sha256=lib.sha256_file(schedule)
        )
        self.assertEqual((private, public), repeated)
        self.assertEqual({row["attempt_id"] for row in private["rows"]}, {row["attempt_id"] for row in rows})
        self.assertTrue(all("condition_id" not in row and "attempt_id" not in row for row in public["rows"]))
        with self.assertRaises(lib.InputError):
            generate_blind_map.create_blind_maps(
                schedule=schedule, seed=9, private_output=private_path, public_output=self.temp / "other.json"
            )

    def test_partial_multi_output_has_no_commit_receipt(self) -> None:
        rows = generate_schedule.generate_schedule(
            benchmark_id="bench", schedule_revision="v1", conditions=["a", "b"],
            tasks=["t1"], repetitions=1, seed=2, workers=1,
        )
        schedule = self.write_jsonl("schedule.jsonl", rows)
        private_path = self.temp / "private.json"
        public_path = self.temp / "public.json"
        receipt_path = self.temp / "commit.json"
        original = lib.atomic_create_bytes
        calls = 0

        def fail_commit(path: object, data: bytes, *, mode: int = 0o600) -> None:
            nonlocal calls
            calls += 1
            if calls == 3:
                raise lib.InputError("injected commit publication failure")
            original(path, data, mode=mode)

        with mock.patch.object(generate_blind_map.lib, "atomic_create_bytes", side_effect=fail_commit):
            with self.assertRaisesRegex(lib.InputError, "commit publication failure"):
                generate_blind_map.create_blind_maps(
                    schedule=schedule, seed=2, private_output=private_path,
                    public_output=public_path, receipt_output=receipt_path,
                )
        self.assertTrue(private_path.is_file())
        self.assertTrue(public_path.is_file())
        self.assertFalse(receipt_path.exists())


class WorkflowTemplateTests(TemporaryDirectoryTest):
    def test_analyze_blind_map_cli_commits_before_packet_publication(self) -> None:
        source = (ROOT / "workflows/benchmark.ts").read_text(encoding="utf-8")
        start = source.index("async function createOrVerifyBlindMaps")
        end = source.index("async function createBlindEvidenceAliases", start)
        block = source[start:end]

        self.assertIn("const receiptScratch =", block)
        self.assertIn("--receipt-output ${shell(receiptScratch)}", block)
        self.assertIn("await readJson(receiptScratch)", block)
        self.assertLess(
            block.index("await readJson(receiptScratch)"),
            block.index('await createOrVerifySame(root, "blind-map.private.json"'),
        )
        item_publication = (
            'await createOrVerifySame(root, `blinded/${blind.blind_id}/item.json`, '
            'item, "json");'
        )
        self.assertIn(item_publication, source)
        self.assertLess(
            source.index("await readJson(receiptScratch)", start),
            source.index(item_publication, end),
        )

        rows = generate_schedule.generate_schedule(
            benchmark_id="bench", schedule_revision="v1", conditions=["a", "b"],
            tasks=["t1"], repetitions=1, seed=2, workers=1,
        )
        schedule = self.write_jsonl("schedule.jsonl", rows)
        private_path = self.temp / "private.json"
        public_path = self.temp / "public.json"
        receipt_path = self.temp / "commit.json"
        command = [
            sys.executable, "-B", str(SCRIPTS / "generate_blind_map.py"),
            "--schedule", str(schedule), "--seed", "9",
            "--private-output", str(private_path),
            "--public-output", str(public_path),
            "--receipt-output", str(receipt_path),
        ]
        completed = subprocess.run(
            command, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        self.assertEqual(completed.returncode, lib.EXIT_OK, completed.stderr.decode())
        receipt = lib.load_json(receipt_path)
        public = lib.load_json(public_path)
        self.assertEqual(receipt["status"], "committed")
        self.assertEqual(receipt["tool"], "generate_blind_map")
        self.assertEqual(
            {entry["sha256"] for entry in receipt["outputs"]},
            {lib.sha256_file(private_path), lib.sha256_file(public_path)},
        )
        self.assertTrue(all(
            row["item_path"] == f"blinded/{row['blind_id']}/item.json"
            for row in public["rows"]
        ))


class TelemetryTests(TemporaryDirectoryTest):
    @staticmethod
    def usage(input_tokens: int | None, output_tokens: int | None, cost: float | None) -> dict[str, object]:
        return {
            "input_tokens": input_tokens, "output_tokens": output_tokens,
            "cache_read_tokens": 1 if input_tokens else None,
            "cache_write_tokens": 0 if input_tokens is not None else None,
            "cost_usd": cost,
            "provider_native": {"cache_read_input_tokens": 1} if input_tokens else {},
        }

    def record(self) -> dict[str, object]:
        parent_usage = self.usage(10, 2, 0.1)
        child_usage = self.usage(5, 1, None)
        subtree = self.usage(15, 3, None)
        subtree["cache_read_tokens"] = 2
        return {
            "schema_version": 1, "benchmark_id": "bench", "attempt_id": "a1",
            "estimate_version": None,
            "parent": {
                "agent_id": "parent", "parent_agent_id": None, "session_id": "s-parent",
                "requested_model": "m", "resolved_model": "m", "observed_model": None,
                "direct_usage": parent_usage, "tool_calls": [{"name": "read", "count": 1, "failed": 0}],
                "latency_ms": 10, "provider_native": {},
            },
            "children": [{
                "agent_id": "child", "parent_agent_id": "parent", "session_id": "s-child",
                "requested_model": "m", "resolved_model": "m", "observed_model": None,
                "direct_usage": child_usage, "tool_calls": [], "latency_ms": None, "provider_native": {},
            }],
            "child_ownership": [{
                "child_agent_id": "child", "owner_agent_id": "parent",
                "settlement_artifact_path": "children/child/settled.json",
            }],
            "subtree_usage": subtree,
        }

    def test_direct_subtree_unknown_and_native_cache_accounting(self) -> None:
        schema = lib.load_json(ROOT / "schemas/telemetry.schema.json")
        result = aggregate_telemetry.aggregate([self.record()], {}, schema)
        totals = result["totals"]
        self.assertEqual(totals["parent_direct"]["usage"]["input_tokens"], 10)
        self.assertEqual(totals["nested_direct"]["usage"]["input_tokens"], 5)
        self.assertEqual(totals["unique_direct_subtrees"]["usage"]["input_tokens"], 15)
        self.assertIsNone(totals["unique_direct_subtrees"]["usage"]["cost_usd"])
        self.assertEqual(totals["unique_direct_subtrees"]["unknown_counts"]["cost_usd"], 1)

    def test_inclusive_parent_plus_child_is_rejected(self) -> None:
        schema = lib.load_json(ROOT / "schemas/telemetry.schema.json")
        record = self.record()
        record["parent"]["direct_usage"]["provider_native"]["usage_scope"] = "inclusive"
        with self.assertRaises(lib.ContractError):
            aggregate_telemetry.aggregate([record], {}, schema)

    def test_telemetry_omission_is_rejected(self) -> None:
        schema = lib.load_json(ROOT / "schemas/telemetry.schema.json")
        with self.assertRaisesRegex(lib.ContractError, "at least one record"):
            aggregate_telemetry.aggregate([], {}, schema)

    def test_orphan_child_is_rejected(self) -> None:
        schema = lib.load_json(ROOT / "schemas/telemetry.schema.json")
        record = self.record()
        record["child_ownership"] = []
        with self.assertRaises(lib.ContractError):
            aggregate_telemetry.aggregate([record], {}, schema)


class PairedAnalysisTests(TemporaryDirectoryTest):
    def request(self) -> dict[str, object]:
        return lib.load_json(ROOT / "validation/fixtures/known-good/paired-analysis.json")

    def test_task_pairs_exact_test_bootstrap_and_threshold_states(self) -> None:
        request = self.request()
        records = request.pop("records")
        request.pop("schema_version")
        first = analyze_paired.analyze(records, **request)
        second = analyze_paired.analyze(records, **request)
        self.assertEqual(first, second)
        self.assertEqual(first["counts"]["tasks"], 4)
        self.assertTrue(first["estimand"]["repetitions_nested_within_task"])
        self.assertEqual(first["exact_test"]["permutations"], 16)
        self.assertEqual(first["bootstrap"]["seed"], 17)
        self.assertEqual(first["noninferiority"]["state"], "descriptive-support-only")
        self.assertEqual(first["multiplicity"]["status"], "controlled")
        self.assertIn("exact-test-resolution-cannot-reach-alpha", first["small_sample_limits"])
        self.assertEqual(first["sample_label"], "screening")
        self.assertEqual(first["decision"], "inconclusive")
        self.assertFalse(first["practical_threshold"]["inferential_gate"]["passed"])

    def test_frozen_adjusted_gate_prevents_screening_decision_contradiction(self) -> None:
        request = lib.load_json(ROOT / "validation/fixtures/known-good/confirmatory-paired-analysis.json")
        records = request.pop("records")
        request.pop("schema_version")
        confirmed = analyze_paired.analyze(records, **request)
        self.assertEqual(confirmed["sample_label"], "confirmatory-capable")
        self.assertTrue(confirmed["practical_threshold"]["inferential_gate"]["passed"])
        self.assertEqual(confirmed["decision"], "practical-superiority")

        request["inferential_gate_frozen"] = False
        screening = analyze_paired.analyze(records, **request)
        self.assertEqual(screening["sample_label"], "screening")
        self.assertEqual(screening["decision"], "inconclusive")
        self.assertEqual(screening["evidence_role"], "screening/descriptive")

    def test_unknown_analysis_option_is_cleanly_rejected(self) -> None:
        with self.assertRaisesRegex(lib.InputError, "unknown analysis options: optimistic_promotion"):
            analyze_paired._load_input(ROOT / "validation/fixtures/known-bad/analysis-unknown-option.json")
        with contextlib.redirect_stderr(io.StringIO()):
            status = analyze_paired.main([
                "--input", str(ROOT / "validation/fixtures/known-bad/analysis-unknown-option.json")
            ])
        self.assertEqual(status, lib.EXIT_INVALID)

    def test_unequal_cells_and_duplicate_cells_refuse_analysis(self) -> None:
        request = lib.load_json(ROOT / "validation/fixtures/known-bad/unequal-cells.json")
        with self.assertRaises(lib.ContractError):
            analyze_paired.analyze(request["records"], control=request["control"], candidate=request["candidate"])
        duplicate = self.request()["records"]
        duplicate.append(copy.deepcopy(duplicate[0]))
        with self.assertRaises(lib.ContractError):
            analyze_paired.prepare_task_pairs(duplicate, control="control", candidate="candidate")

    def test_prespecified_task_weights_apply_to_pair_and_cluster_units(self) -> None:
        request = self.request()
        result = analyze_paired.analyze(
            request["records"], control="control", candidate="candidate",
            bootstrap_draws=20,
            task_weights={"t1": 10, "t2": 1, "t3": 1, "t4": 1},
        )
        self.assertEqual(result["estimand"]["weighting"], "prespecified-task-weights")
        self.assertEqual(result["exact_test"]["task_weights"], [10.0, 1.0, 1.0, 1.0])
        self.assertEqual(result["bootstrap"]["task_weights"], [10.0, 1.0, 1.0, 1.0])
        with self.assertRaises(lib.InputError):
            analyze_paired.analyze(
                request["records"], control="control", candidate="candidate",
                bootstrap_draws=2, task_weights={"t1": 1},
            )

    def test_multiplicity_and_vetoes_fail_closed(self) -> None:
        request = self.request()
        result = analyze_paired.analyze(
            request["records"], control="control", candidate="candidate",
            bootstrap_draws=20, multiplicity={"family_id": "family", "family_size": 2, "hypothesis_index": 1, "method": "none", "prespecified": True},
        )
        self.assertEqual(result["multiplicity"]["status"], "uncontrolled-fixed-family")
        self.assertEqual(result["decision"], "inconclusive")
        vetoed = analyze_paired.analyze(
            request["records"], control="control", candidate="candidate",
            bootstrap_draws=20, integrity_veto=True,
        )
        self.assertEqual(vetoed["decision"], "blocked-by-veto")

    def test_single_task_boundary_is_explicitly_limited(self) -> None:
        request = lib.load_json(ROOT / "validation/fixtures/boundary/single-task-paired-analysis.json")
        records = request.pop("records")
        request.pop("schema_version")
        result = analyze_paired.analyze(records, **request)
        self.assertIn("single-task-screening-only", result["small_sample_limits"])
        self.assertTrue(result["bootstrap"]["degenerate"])


class LifecycleTests(TemporaryDirectoryTest):
    def test_false_complete_and_ambiguous_resume_are_refused(self) -> None:
        rows = generate_schedule.generate_schedule(
            benchmark_id="bench", schedule_revision="v1", conditions=["a", "b"],
            tasks=["t1"], repetitions=1, seed=1, workers=1,
        )
        self.write_jsonl("schedule.jsonl", rows)
        first = rows[0]
        assigned = dict(first, event_type="assigned", sequence=1)
        self.write_jsonl("events.jsonl", [assigned])
        self.write_jsonl("ledger.jsonl", [])
        self.write_jsonl("grades.jsonl", [])
        self.write_jsonl("telemetry.jsonl", [])
        (self.temp / "attempts").mkdir()
        args = reconcile_lifecycle._parser().parse_args(["--root", str(self.temp), "--strict-completion"])
        result = reconcile_lifecycle.reconcile(args)
        self.assertFalse(result["complete"])
        self.assertIn(first["attempt_id"], result["ambiguous_attempt_ids"])
        self.assertTrue(any("replay forbidden" in item for item in result["completion_blockers"]))

    def test_nonmonotonic_and_illegal_prelaunch_start_are_detected(self) -> None:
        rows = generate_schedule.generate_schedule(
            benchmark_id="bench", schedule_revision="v1", conditions=["a", "b"],
            tasks=["t1"], repetitions=1, seed=1, workers=1,
        )
        self.write_jsonl("schedule.jsonl", rows)
        events = [
            dict(rows[0], event_type="started", sequence=2),
            dict(rows[1], event_type="assigned", sequence=1),
        ]
        self.write_jsonl("events.jsonl", events)
        self.write_jsonl("ledger.jsonl", [])
        self.write_jsonl("grades.jsonl", [])
        self.write_jsonl("telemetry.jsonl", [])
        (self.temp / "attempts").mkdir()
        result = reconcile_lifecycle.reconcile(reconcile_lifecycle._parser().parse_args(["--root", str(self.temp)]))
        joined = "\n".join(result["issues"])
        self.assertIn("nonmonotonic", joined)
        self.assertIn("illegal prelaunch start", joined)


class CanaryTests(TemporaryDirectoryTest):
    @staticmethod
    def _telemetry_record() -> dict[str, object]:
        def usage(input_tokens: int, output_tokens: int) -> dict[str, object]:
            return {
                "input_tokens": input_tokens, "output_tokens": output_tokens,
                "cache_read_tokens": 1, "cache_write_tokens": 0, "cost_usd": None,
                "provider_native": {"cache_read_input_tokens": 1},
            }
        return {
            "schema_version": 1, "benchmark_id": "canary", "attempt_id": "a1",
            "estimate_version": None,
            "parent": {
                "agent_id": "parent", "parent_agent_id": None, "session_id": "s1",
                "requested_model": "m", "resolved_model": "m", "observed_model": "m",
                "direct_usage": usage(10, 2), "tool_calls": [], "latency_ms": 10,
                "provider_native": {},
            },
            "children": [{
                "agent_id": "child", "parent_agent_id": "parent", "session_id": "s2",
                "requested_model": "m", "resolved_model": "m", "observed_model": "m",
                "direct_usage": usage(5, 1), "tool_calls": [], "latency_ms": 5,
                "provider_native": {},
            }],
            "child_ownership": [{
                "child_agent_id": "child", "owner_agent_id": "parent",
                "settlement_artifact_path": "children/child/settled.json",
            }],
            "subtree_usage": {
                "input_tokens": 15, "output_tokens": 3, "cache_read_tokens": 2,
                "cache_write_tokens": 0, "cost_usd": None, "provider_native": {},
            },
        }

    def _observations(self, canary_id: str, request_sha256: str) -> dict[str, object]:
        if canary_id == "condition-loading":
            return {
                "invocation_path": "agents.run:pi:process", "request_sha256": request_sha256,
                "requested_condition_sha256": "a" * 64, "loaded_condition_sha256": "a" * 64,
                "submitted_prompt": "/skill:agent-benchmarking canary",
                "observed_prompt": '<skill name="agent-benchmarking">expanded</skill>',
                "child_result": {"received_as_literal": False},
                "inline_control": {"instruction_mode": "inline-bundle", "nonce": "control"},
            }
        if canary_id == "mechanism-nested":
            return {
                "events": [
                    {"event_type": "child-dispatched", "sequence": 1, "child_id": "c1"},
                    {"event_type": "child-result", "sequence": 2, "child_id": "c1"},
                    {"event_type": "child-consumed", "sequence": 3, "child_id": "c1"},
                ],
                "ownership": [{"child_id": "c1", "artifact": "children/c1.json"}],
                "child_token": "token", "parent_transform_suffix": "-used",
                "parent_consumed_value": "token-used",
            }
        if canary_id == "fresh-parent-sessions":
            def parent(agent: str, process: str, workspace: str, sentinel: str) -> dict[str, object]:
                return {
                    "fabric_agent_id": agent, "process_handle": process,
                    "persisted_runner_session_id": None, "workspace_id": workspace,
                    "status": "completed", "tool_calls": 1, "own_sentinel": sentinel,
                    "file_value": sentinel, "other_sentinel_seen": False,
                }
            return {
                "parents": [parent("a1", "p1", "w1", "one"), parent("a2", "p2", "w2", "two")],
                "declared_mutable_surfaces": ["workspace"],
                "limitations": ["persisted runner session identity is unavailable"],
            }
        if canary_id == "randomized-schedule":
            design = {"conditions": ["a", "b"], "tasks": ["t1", "t2", "t3", "t4"], "repetitions": 1, "workers": 8}
            rows = None
            seed = None
            for candidate_seed in range(1, 20):
                candidate = generate_schedule.generate_schedule(
                    benchmark_id="canary", schedule_revision="v1", seed=candidate_seed, **design
                )
                sequences: dict[object, list[object]] = {}
                for row in candidate:
                    sequences.setdefault(row["block"], []).append(row["condition_id"])
                if len({tuple(value) for value in sequences.values()}) > 1:
                    rows, seed = candidate, candidate_seed
                    break
            self.assertIsNotNone(rows)
            digest = lib.sha256_bytes(lib.canonical_jsonl_bytes(rows))
            return {
                "design": design, "rows": rows, "sealed_schedule_sha256": digest,
                "execution_schedule_sha256": digest, "seed": seed,
                "randomizer": lib.DETERMINISTIC_SHUFFLE_ALGORITHM,
            }
        if canary_id == "attempt-lifecycle":
            return {
                "events": [
                    {"event_type": "assigned", "sequence": 1},
                    {"event_type": "agents-run-call", "sequence": 2},
                    {"event_type": "started", "sequence": 3},
                    {"event_type": "terminal", "sequence": 4},
                ],
                "runtime_start_artifact_sha256": "b" * 64,
                "scheduled_ids": ["a1"], "assigned_ids": ["a1"],
                "terminal_ids": ["a1"], "ledger_ids": ["a1"],
                "artifacts": [{"path": "attempts/a1/result.json", "sha256": "c" * 64}],
            }
        if canary_id == "blind-map-isolation":
            public = [{"blind_id": "b1", "task_id": "t1", "item_path": "blinded/b1.json"}]
            return {
                "public_rows": public,
                "private_rows": [{"blind_id": "b1", "task_id": "t1", "attempt_id": "a1", "condition_id": "c1"}],
                "public_map_sha256": lib.sha256_bytes(lib.canonical_json_bytes({"schema_version": 1, "rows": public})),
                "raw_frozen_at": "2026-09-02T00:00:00Z", "grading_started_at": "2026-09-02T00:00:01Z",
                "reverse_map_available_to_grader": False, "grader_tool_calls": 0,
                "grader_result": {"condition_identity_seen": False, "keys_seen": ["blind_id", "item_path", "task_id"]},
            }
        if canary_id == "primary-source-grading":
            captured = "A primary statement is retained."
            return {
                "claim": {
                    "quote": "primary statement", "captured_text": captured,
                    "source_type": "primary", "source_url": "https://www.itl.nist.gov/source",
                    "claim_date": "2026-09-01", "captured_at": "2026-09-02T00:00:00Z",
                    "capture_sha256": hashlib.sha256(captured.encode()).hexdigest(), "decision": "entailed",
                },
                "temporal_negative_control": {"claim_date": "2026-09-03", "decision": "rejected"},
            }
        if canary_id == "runtime-model-identity":
            return {
                "parent": {"requested": "m", "resolved": "m", "observed": "m", "observed_source": "provider-log"},
                "nested": {"requested": "n", "resolved": "n", "observed": None, "observed_source": "unavailable"},
                "unknown_fields": ["nested.observed"],
            }
        if canary_id == "token-cost-attribution":
            return {
                "telemetry_records": [self._telemetry_record()],
                "attempt_traffic_id": "attempt-traffic", "grader_traffic_id": "grader-traffic",
                "inclusive_duplicate_control": {"status": "rejected", "diagnostic": "subtree_usage differs from unique-direct sum"},
            }
        if canary_id == "interrupted-wave-resume":
            return {
                "terminal_ids": ["a1"], "assigned_without_terminal_ids": ["a2"],
                "never_assigned_ids": ["a3"], "selected_ids": ["a3"],
                "ambiguous_replay_decision": "refused",
                "frozen_retry_ids": ["r1"], "selected_retry_ids": [],
                "terminal_before_sha256": "d" * 64, "terminal_after_sha256": "d" * 64,
            }
        if canary_id == "false-complete-refusal":
            return {
                "missing_records_result": {
                    "complete": False, "ambiguous_attempt_ids": ["a2"],
                    "completion_blockers": ["assigned without terminal: a2"],
                },
                "field_mismatch_result": {
                    "complete": False, "issues": ["condition_id differs from scheduled condition_id"],
                },
            }
        if canary_id == "supervisor-prelaunch-failure":
            error = "spawn veda ENOENT"
            return {
                "events": [
                    {"event_type": "assigned", "sequence": 1},
                    {"event_type": "agents-run-call", "sequence": 2},
                    {"event_type": "terminal", "sequence": 3, "status": "prelaunch-failed", "exception": error},
                ],
                "runtime_agent_start_observed": False, "settlement_ms": 25, "timeout_ms": 100,
                "request_validated": True,
                "fabric_result": {"id": "a1", "runner": "veda", "status": "failed", "turns": 0, "error": error},
                "limitations": ["controlled startup failure does not establish crash recovery"],
            }
        self.fail(f"missing observations for {canary_id}")

    def _runtime_receipts(self) -> Path:
        receipt_root = self.temp / "receipts"
        (receipt_root / "evidence").mkdir(parents=True)
        source_path = self.write_json("runtime-raw/source.json", {"kind": "unit-test-source"})
        source_data = source_path.read_bytes()
        source_entry = {
            "path": "runtime-raw/source.json",
            "sha256": hashlib.sha256(source_data).hexdigest(), "bytes": len(source_data),
            "role": "isolated unit-test source",
        }
        fixture_root = ROOT / "validation/fixtures/canary"
        for canary_id in run_canaries.RUNTIME_ASSERTIONS:
            request_path = fixture_root / f"{canary_id}.request.json"
            request_sha256 = lib.sha256_file(request_path)
            evidence_document = {
                "schema_version": 1, "canary_id": canary_id,
                "request_sha256": request_sha256,
                "observations": {"_sources": [source_entry], **self._observations(canary_id, request_sha256)},
            }
            evidence_path = self.write_json(f"receipts/evidence/{canary_id}.json", evidence_document)
            data = evidence_path.read_bytes()
            self.write_json(
                f"receipts/{canary_id}.json",
                {
                    "schema_version": 1, "canary_id": canary_id,
                    "non_scoring": True, "status": "passed", "scored_attempt_ids": [],
                    "request_fixture": f"{canary_id}.request.json",
                    "request_sha256": request_sha256,
                    "evidence": [{
                        "path": f"evidence/{canary_id}.json",
                        "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data),
                    }],
                },
            )
        return receipt_root

    def test_every_required_adversary_is_evaluated(self) -> None:
        results = run_canaries.validate_synthetic_catalog(ROOT / "validation/fixtures/canary/synthetic-catalog.json")
        self.assertEqual({row["canary_id"] for row in results}, set(run_canaries.SYNTHETIC_IDS))
        self.assertTrue(all(row["status"] == "passed" for row in results))

    def test_standalone_fixtures_use_production_validators_and_stable_diagnostics(self) -> None:
        results = run_canaries.validate_fixture_catalog(ROOT / "validation/fixtures")
        self.assertEqual({row["family"] for row in results}, {"known-good", "known-bad", "isolated-defect", "boundary", "malformed"})
        self.assertTrue(all(row["status"] == "passed" for row in results))

    def test_runtime_receipts_verify_request_and_evidence_digests_and_derive_facts(self) -> None:
        receipt_root = self._runtime_receipts()
        result = run_canaries.run(
            fixture_root=ROOT / "validation/fixtures/canary", receipt_root=receipt_root
        )
        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["runtime"]["count"], len(run_canaries.RUNTIME_ASSERTIONS))

        receipt_path = receipt_root / "condition-loading.json"
        original_receipt = receipt_path.read_bytes()
        bad_receipt = lib.parse_json_bytes(original_receipt)
        bad_receipt["request_sha256"] = "0" * 64
        receipt_path.write_bytes(lib.canonical_json_bytes(bad_receipt))
        with self.assertRaisesRegex(lib.ContractError, "request fixture sha256 mismatch"):
            run_canaries.run(
                fixture_root=ROOT / "validation/fixtures/canary", receipt_root=receipt_root
            )
        receipt_path.write_bytes(original_receipt)

        bad_path = receipt_root / "evidence/false-complete-refusal.json"
        bad_path.write_bytes(bad_path.read_bytes() + b" ")
        with self.assertRaisesRegex(lib.ContractError, "sha256 mismatch"):
            run_canaries.run(
                fixture_root=ROOT / "validation/fixtures/canary", receipt_root=receipt_root
            )

    def test_runtime_facts_are_derived_even_when_tampered_evidence_is_rehashed(self) -> None:
        receipt_root = self._runtime_receipts()
        evidence_path = receipt_root / "evidence/false-complete-refusal.json"
        evidence = lib.load_json(evidence_path)
        evidence["observations"]["missing_records_result"]["complete"] = True
        data = lib.canonical_json_bytes(evidence)
        evidence_path.write_bytes(data)
        receipt_path = receipt_root / "false-complete-refusal.json"
        receipt = lib.load_json(receipt_path)
        receipt["evidence"][0]["sha256"] = hashlib.sha256(data).hexdigest()
        receipt["evidence"][0]["bytes"] = len(data)
        receipt_path.write_bytes(lib.canonical_json_bytes(receipt))
        with self.assertRaisesRegex(lib.ContractError, "completion_refused"):
            run_canaries.run(
                fixture_root=ROOT / "validation/fixtures/canary", receipt_root=receipt_root
            )

    def test_boolean_assertions_cannot_substitute_for_runtime_evidence(self) -> None:
        receipt_root = self._runtime_receipts()
        bad_path = receipt_root / "condition-loading.json"
        bad = lib.load_json(bad_path)
        bad["assertions"] = {name: True for name in run_canaries.RUNTIME_ASSERTIONS["condition-loading"]}
        bad_path.write_bytes(lib.canonical_json_bytes(bad))
        with self.assertRaisesRegex(lib.ContractError, "unexpected receipt fields: assertions"):
            run_canaries.run(
                fixture_root=ROOT / "validation/fixtures/canary", receipt_root=receipt_root
            )

    def test_missing_runtime_receipt_fails_closed(self) -> None:
        receipts = self.temp / "empty"
        receipts.mkdir()
        with self.assertRaises(lib.ContractError):
            run_canaries.run(
                fixture_root=ROOT / "validation/fixtures/canary", receipt_root=receipts
            )


class DeepStageTests(TemporaryDirectoryTest):
    def test_installed_runtime_doctor_finds_effective_100_call_cap(self) -> None:
        fabric = Path("/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric")
        pi = Path("/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent")
        capabilities = deep_stage.doctor_runtime(fabric, pi)
        self.assertEqual(capabilities.direct_call_limit, 100)
        self.assertFalse(capabilities.recursive_custom_cwd)
        self.assertRegex(capabilities.fabric_version, r"^\d+\.\d+\.\d+")
        self.assertEqual(
            deep_stage.doctor_runtime(
                fabric, pi, configured_max_per_execution=250,
                invocation_agent_budget=80,
            ).direct_call_limit,
            80,
        )

    def test_call_101_is_rejected_and_96_plus_18_is_partitioned_by_stage(self) -> None:
        limiter = deep_stage.DirectCallLimiter(100)
        limiter.reserve(100)
        with self.assertRaisesRegex(lib.ContractError, "direct call 101"):
            limiter.reserve()
        plan = deep_stage.plan_stage_calls({"judge": 96, "adjudicate": 18})
        self.assertEqual(
            [(row["stage"], row["call_count"]) for row in plan["invocations"]],
            [("judge", 96), ("adjudicate", 18)],
        )
        split = deep_stage.plan_stage_calls({"judge": 101})
        self.assertEqual([row["call_count"] for row in split["invocations"]], [100, 1])
        plans = deep_stage.partition_call_ids(
            benchmark_id="bench", stage="judge",
            call_ids=[f"judge-{index:03d}" for index in range(101)],
            max_concurrency=4,
        )
        self.assertEqual([plan["max_calls"] for plan in plans], [100, 1])
        self.assertEqual(
            plans[1]["predecessor_checkpoint_path"],
            f"checkpoints/{plans[0]['plan_id']}/receipt.json",
        )

    def test_recursive_attempt_launcher_omits_custom_cwd(self) -> None:
        project = self.temp / "project"
        package = project / "conditions/candidate"
        workspace = project / "workspaces/a1"
        package.mkdir(parents=True)
        workspace.mkdir(parents=True)
        request = deep_stage.recursive_attempt_request(
            prompt="run", project_root=project, condition_package=package,
            workspace=workspace, model="model",
        )
        self.assertTrue(request["recursive"])
        self.assertNotIn("cwd", request)
        self.assertEqual(request["context"]["condition_package"], str(package.resolve()))

    def test_create_only_artifact_store_creates_parents_and_streams_large_tmp_log(self) -> None:
        source_dir = Path(tempfile.mkdtemp(prefix="pi-fabric-runs-", dir="/tmp"))
        try:
            source = source_dir / "events.jsonl"
            row = lib.canonical_json_bytes({"event_type": "message", "padding": "x" * (2 * 1024 * 1024)})
            source.write_bytes(row + lib.canonical_json_bytes({"event_type": "actor cleanup"}))
            receipt = deep_stage.archive_fabric_event_log(
                source, self.temp, "attempts/a1/logs/log.raw.jsonl"
            )
            destination = self.temp / receipt["path"]
            self.assertGreater(receipt["bytes"], 2 * 1024 * 1024)
            self.assertEqual(receipt["sha256"], lib.sha256_file(source))
            self.assertEqual(destination.read_bytes(), source.read_bytes())
            with self.assertRaisesRegex(lib.InputError, "already exists"):
                deep_stage.archive_fabric_event_log(source, self.temp, receipt["path"])
            with self.assertRaises(lib.UnsafePathError):
                deep_stage.archive_fabric_event_log(
                    self.temp / "events.jsonl", self.temp, "other.jsonl"
                )
        finally:
            for child in source_dir.iterdir():
                child.unlink()
            source_dir.rmdir()

    def test_compact_log_scanner_handles_multi_megabyte_input_and_total_mechanisms(self) -> None:
        allowed = self.temp / "workspace"
        allowed.mkdir()
        log = self.temp / "large.jsonl"
        rows = [
            {"event_type": "tool read", "path": str(allowed / "input.json"), "padding": "z" * (2 * 1024 * 1024)},
            {"event_type": "actor create", "child_id": "child-1"},
            {"event_type": "actor terminal", "child_id": "child-1"},
            {"event_type": "actor cleanup", "child_id": "child-1"},
        ]
        log.write_bytes(lib.canonical_jsonl_bytes(rows))
        compact = deep_stage.scan_event_log(log, allowed_roots=[allowed])
        self.assertEqual(compact["event_count"], 4)
        self.assertEqual(compact["child_ids"], ["child-1"])
        self.assertTrue(all(compact["flags"].values()))
        self.assertEqual(compact["forbidden_paths"], [])
        self.assertTrue(deep_stage.total_mechanism_evidence(compact, actor_expected=True)["valid"])
        missing = deep_stage.total_mechanism_evidence(None, actor_expected=False)
        self.assertEqual(missing, {
            "valid": False, "missing": True, "actor_expected": False,
            "actor_create": False, "actor_terminal": False,
            "actor_cleanup": False, "forbidden_access": None,
        })

    def test_versioned_telemetry_projection_preserves_native_cache_and_cost(self) -> None:
        result = {
            "id": "run-1",
            "usage": {"input": 10, "output": 3, "cacheRead": 7, "cacheWrite": 2, "cost": 0.25},
        }
        projected = deep_stage.project_fabric_telemetry(result)
        self.assertEqual(projected["input_tokens"], 19)
        self.assertEqual(projected["cache_read_tokens"], 7)
        self.assertEqual(projected["cost"], 0.25)
        self.assertEqual(projected["cost_unit"], "fabric-native-unknown")
        self.assertEqual(projected["provider_native"]["input"], 10)
        legacy = deep_stage.project_fabric_telemetry(result, version="fabric-usage-v1")
        self.assertEqual(legacy["input_tokens"], 10)

    def test_delta_seal_plan_uses_basename_receipt_and_no_recursive_seal_copy(self) -> None:
        previous = [{
            "revision": "design-v1", "previous_revision": None,
            "manifest_sha256": "a" * 64,
        }]
        plan = deep_stage.revision_seal_plan(
            seal_type="design", revisions=previous, new_revision="design-v2",
            changed_paths=["amendments/design-v2/decision.json"],
            receipt_name="verify-receipt.json",
        )
        self.assertEqual(plan["previous_revision"], "design-v1")
        self.assertEqual(plan["receipt_basename"], "verify-receipt.json")
        self.assertFalse(plan["copy_prior_seal_trees"])
        self.assertEqual(plan["prior_manifests"][0]["manifest_sha256"], "a" * 64)

    def test_resume_and_transaction_planners_block_ambiguity_and_partial_finalize(self) -> None:
        resume = deep_stage.plan_resume([
            {"attempt_id": "done", "assignment": True, "terminal": "valid"},
            {"attempt_id": "ambiguous", "assignment": True, "terminal": None},
            {"attempt_id": "new", "assignment": False, "terminal": None},
        ])
        self.assertEqual(resume["status"], "blocked")
        self.assertEqual(
            {row["attempt_id"]: row["action"] for row in resume["actions"]},
            {"done": "skip", "ambiguous": "refuse-replay", "new": "run"},
        )
        interrupted = deep_stage.plan_transaction({
            "attempt": "complete", "judge": "complete",
            "adjudicate": "interrupted", "finalize": "ready",
        })
        self.assertFalse(interrupted["can_finalize"])
        complete = deep_stage.plan_transaction({
            "attempt": "complete", "judge": "complete",
            "adjudicate": "complete", "finalize": "ready",
        })
        self.assertTrue(complete["can_finalize"])

    def test_protected_pi_conflict_and_global_run_cost_ledger(self) -> None:
        project = self.temp / "project"
        (project / ".pi/fabric/mesh").mkdir(parents=True)
        incompatible = deep_stage.check_protected_state_compatibility(
            recursive=True, cwd=str(project), project_root=project,
            protected_relative=[".pi"], actor_state_root=project / ".pi/fabric/mesh",
        )
        self.assertEqual(incompatible["status"], "incompatible")
        self.assertEqual(len(incompatible["conflicts"]), 2)
        ledger = deep_stage.global_run_cost_ledger([
            {"run_id": "p1", "owner_id": "a1", "traffic": "attempt", "projected_cost": "1.20", "observed_cost": "1.10"},
            {"run_id": "g1", "owner_id": "b1", "traffic": "judge", "projected_cost": "0.30", "observed_cost": None},
        ], maximum_cost="2.00")
        self.assertEqual(ledger["totals"]["projected"]["known"], "1.50")
        self.assertEqual(ledger["totals"]["observed"]["unknown_count"], 1)
        with self.assertRaisesRegex(lib.ContractError, "duplicate global run_id"):
            deep_stage.global_run_cost_ledger([
                {"run_id": "same", "owner_id": "a", "traffic": "attempt", "projected_cost": 1, "observed_cost": 1},
                {"run_id": "same", "owner_id": "b", "traffic": "judge", "projected_cost": 1, "observed_cost": 1},
            ])


class FinalIntegrityTests(TemporaryDirectoryTest):
    def test_unavailable_baselines_and_missing_package_paths_fail_closed(self) -> None:
        result = final_integrity.run(
            root=self.temp,
            protected_baseline=self.temp / "missing-protected-baseline.json",
            project_baseline=self.temp / "missing-project-baseline.txt",
        )
        self.assertEqual(result["status"], "failed")
        self.assertIn("protected-baseline", result["uncheckable"])
        self.assertIn("project-baseline", result["uncheckable"])
        self.assertTrue(result["failed_checks"])

    def test_protected_baseline_closes_tree_type_mode_size_and_hash(self) -> None:
        protected = self.temp / "protected"
        (protected / "nested").mkdir(parents=True)
        target = protected / "nested/packet.txt"
        target.write_text("before\n", encoding="utf-8")
        target.chmod(0o640)
        baseline = self.write_json(
            "protected-baseline.json", final_integrity.protected_baseline_document(protected)
        )
        self.assertEqual(final_integrity._protected_comparison(baseline)["status"], "passed")

        target.chmod(0o600)
        receipt = final_integrity._protected_comparison(baseline)
        self.assertEqual(receipt["status"], "failed")
        self.assertIn("mode:nested/packet.txt", receipt["differences"])
        target.chmod(0o640)
        (protected / "extra.txt").write_text("unlisted\n", encoding="utf-8")
        receipt = final_integrity._protected_comparison(baseline)
        self.assertIn("extra:extra.txt", receipt["differences"])

    def test_protected_baseline_rejects_symlink_and_path_component_symlink(self) -> None:
        protected = self.temp / "protected"
        protected.mkdir()
        outside = self.temp / "outside.txt"
        outside.write_text("outside\n", encoding="utf-8")
        (protected / "link.txt").symlink_to(outside)
        with self.assertRaisesRegex(lib.InputError, "unsafe paths"):
            final_integrity.protected_baseline_document(protected)

        (protected / "link.txt").unlink()
        real = self.temp / "real"
        real.mkdir()
        (real / "packet.txt").write_text("packet\n", encoding="utf-8")
        (protected / "component").symlink_to(real, target_is_directory=True)
        with self.assertRaisesRegex(lib.InputError, "unsafe paths"):
            final_integrity.protected_baseline_document(protected)

    def test_project_porcelain_v2_snapshot_reports_changes_and_authorized_paths(self) -> None:
        project = self.temp / "project"
        project.mkdir()
        subprocess.run(["git", "init", "-q", str(project)], check=True)
        subprocess.run(["git", "-C", str(project), "config", "user.email", "test@example.invalid"], check=True)
        subprocess.run(["git", "-C", str(project), "config", "user.name", "Test"], check=True)
        (project / "tracked.txt").write_text("base\n", encoding="utf-8")
        (project / "authorized").mkdir()
        (project / "authorized/owned.txt").write_text("base\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(project), "add", "."], check=True)
        subprocess.run(["git", "-C", str(project), "commit", "-qm", "base"], check=True)
        baseline = self.write_json(
            "project-baseline.json",
            final_integrity.project_baseline_document(project, ["authorized"]),
        )
        self.assertEqual(final_integrity._project_comparison(baseline)["status"], "passed")

        (project / "authorized/new.txt").write_text("owned change\n", encoding="utf-8")
        authorized = final_integrity._project_comparison(baseline)
        self.assertEqual(authorized["status"], "passed")
        self.assertEqual(authorized["authorized_current_entries"][0]["path"], "authorized/new.txt")
        self.assertEqual(authorized["authorized_differences"][0]["path"], "authorized/new.txt")
        (project / "tracked.txt").write_text("unexpected\n", encoding="utf-8")
        changed = final_integrity._project_comparison(baseline)
        self.assertEqual(changed["status"], "failed")
        self.assertEqual(changed["differences"][0]["path"], "tracked.txt")

    def test_package_only_scope_supports_non_destructive_actual_package_checks(self) -> None:
        result = final_integrity.run(root=ROOT, package_only=True)
        self.assertEqual(result["scope"], "package-only")
        self.assertFalse(result["complete"])
        canonical = next(row for row in result["mechanical"]["checks"] if row["check"] == "canonical-paths")
        self.assertEqual(canonical["status"], "passed")
        self.assertEqual(result["protected_comparison"]["status"], "not-requested")

    def test_python_static_defect_is_found_without_running_agent(self) -> None:
        scripts = self.temp / "scripts"
        scripts.mkdir()
        for name in final_integrity.CANONICAL_SCRIPTS:
            path = scripts / name
            path.write_text("def broken(:\n", encoding="utf-8")
            path.chmod(0o755)
        checks = final_integrity._package_checks(self.temp)
        static = next(row for row in checks if row["check"] == "python-static-before-agent")
        self.assertEqual(static["status"], "failed")


if __name__ == "__main__":
    unittest.main()
