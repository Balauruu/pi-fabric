"""Behavioral checks through the inspection interface and real command."""
import json
import re
import subprocess
import sys
import tempfile
import unittest
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_tracker import inspect_map, validate

NOW = datetime(2026, 9, 8, tzinfo=timezone.utc)
TEMPLATES = re.findall(r"```markdown\n(.*?)```", (ROOT / "references/templates.md").read_text(), re.S)


def fields(text, **values):
    for key, value in values.items():
        key = key.replace("_", "-")
        rendered = json.dumps(value) if isinstance(value, list) else str(value)
        pattern = rf"^{re.escape(key)}:.*$"
        if re.search(pattern, text, re.M):
            text = re.sub(pattern, lambda _: f"{key}: {rendered}", text, count=1, flags=re.M)
        else:
            text = text.replace("---\n", f"---\n{key}: {rendered}\n", 1)
    return text


def concrete(text):
    return re.sub(r"<[^>]+>", "Fixture", text)


class InspectionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / "tickets").mkdir()
        self.map(mode="planning")

    def map(self, mode="planning", **updates):
        text = TEMPLATES[0].replace("<risk-id> — <risk and signal>; owner: <owner>; destination: <ticket, map, or operational system>", "None.")
        text = text.replace("<In-scope uncertainty that cannot yet be stated as a precise outcome, or `- None.`>", "- None.")
        text = fields(concrete(text), id="sample", owner="owner", created="2026-09-07", updated="2026-09-07", mode=mode)
        if mode == "delivery":
            text = fields(text, mode_approved_by="owner", mode_approved_at="2026-09-07", mode_approval="approval-123")
        text = fields(text, **updates)
        (self.root / "MAP.md").write_text(text)

    def ticket(self, id="INV-01", type="investigation", status="open", result="pending", **updates):
        text = concrete(TEMPLATES[1])
        text = fields(text, id=id, map="sample", type=type, status=status, result=result,
                      owner="owner", created="2026-09-07", updated="2026-09-07")
        if type in {"implementation", "verification", "release"}:
            text = fields(text, subject_revision="abc123")
        if status in {"active", "review"}:
            text = fields(text, claimed_by="agent", claimed_at="2026-09-07")
        if status in {"review", "closed"}:
            text += "\n" + concrete(TEMPLATES[2])
        if status == "closed":
            text = text.replace("[ ]", "[x]")
            text = fields(text, disposition="completed", acceptance_outcome="satisfied")
        text = fields(text, **updates)
        (self.root / "tickets" / f"{id}.md").write_text(text)
        return text

    def inspect(self, now=NOW):
        return inspect_map(self.root, now=now)

    def clean(self):
        report = self.inspect()
        self.assertEqual([], report.diagnostics, [d.message for d in report.diagnostics])
        return report

    def patch(self, path, **updates):
        path = self.root / path
        path.write_text(fields(path.read_text(), **updates))

    def test_template_and_frontier_order(self):
        self.ticket("INV-B", created="2026-09-06")
        self.ticket("INV-A", priority="high")
        self.ticket("INV-C", created="2026-09-06")
        self.patch("MAP.md", frontier=["INV-A", "INV-B", "INV-C"])
        self.assertEqual(["INV-A", "INV-B", "INV-C"], self.clean().frontier)

    def test_stale_frontier_has_replacement(self):
        self.ticket()
        report = self.inspect()
        self.assertEqual(["INV-01"], report.frontier)
        self.assertTrue(any("frontier" in d.message for d in report.diagnostics))

    def test_planning_verification_requires_scope(self):
        self.ticket("VER-01", "verification")
        self.patch("MAP.md", frontier=["VER-01"])
        self.assertTrue(any("verification-scope" in d.message for d in self.inspect().diagnostics))
        self.patch("tickets/VER-01.md", verification_scope="planning")
        self.clean()
        self.patch("tickets/VER-01.md", subject_revision="")
        self.assertTrue(any("subject-revision" in d.message for d in self.inspect().diagnostics))

    def test_delivery_scope_approval(self):
        self.map(mode="delivery", frontier=["IMP-01"])
        self.ticket("IMP-01", "implementation")
        self.clean()
        self.patch("MAP.md", mode_approval="")
        self.assertTrue(any("mode-approval" in d.message for d in self.inspect().diagnostics))
        self.map(frontier=["IMP-01"])
        self.assertTrue(any("not allowed" in d.message for d in self.inspect().diagnostics))

    def test_negative_closure_preserves_failed_criteria(self):
        for result, disposition, assessment in [("failed", "completed", "not-satisfied"), ("cancelled", "cancelled", "not-assessed"), ("abandoned", "completed", "not-assessed")]:
            with self.subTest(result=result):
                self.map(mode="delivery")
                text = self.ticket("IMP-01", "implementation", "closed", result,
                                   disposition=disposition, acceptance_outcome=assessment)
                path = self.root / "tickets/IMP-01.md"
                path.write_text(text.replace("## Acceptance\n\n- [x]", "## Acceptance\n\n- [ ]"))
                self.clean()
                self.patch("tickets/IMP-01.md", result="delivered", disposition="completed")
                self.assertTrue(any("satisfied acceptance-outcome" in d.message for d in self.inspect().diagnostics))

    def test_review_pending_and_claim_rules(self):
        self.ticket(status="review", acceptance_outcome="satisfied")
        self.clean()
        self.patch("tickets/INV-01.md", result="established")
        self.assertTrue(any("non-closed" in d.message for d in self.inspect().diagnostics))
        self.patch("tickets/INV-01.md", result="pending", claimed_by="")
        self.assertTrue(any("requires `claimed-by`" in d.message for d in self.inspect().diagnostics))

    def test_approval_not_inferred(self):
        self.ticket("DEC-01", "decision", "closed", "accepted")
        self.assertTrue(any("requires an approver" in d.message for d in self.inspect().diagnostics))
        self.patch("tickets/DEC-01.md", approver="owner")
        self.clean()

    def test_legacy_records_and_wrapper(self):
        text = self.ticket(status="closed", result="established")
        path = self.root / "tickets/INV-01.md"
        text = re.sub(r"^(acceptance-outcome|applicability|verification-scope):.*\n", "", text, flags=re.M)
        path.write_text(text)
        self.clean()
        self.assertEqual([], validate(self.root))
        path.write_text(text.replace("## Acceptance\n\n- [x]", "## Acceptance\n\n- [ ]"))
        self.assertTrue(self.inspect().diagnostics)

    def test_failed_verification_blocks_release(self):
        self.map(mode="delivery")
        self.ticket("VER-01", "verification", "closed", "fail")
        self.ticket("REL-01", "release", requires=["VER-01:pass"])
        report = self.clean()
        self.assertEqual([], report.frontier)
        self.assertIn("unmatched requirement VER-01:pass", report.blockers["REL-01"])
        self.patch("tickets/VER-01.md", result="pass")
        self.patch("MAP.md", frontier=["REL-01"])
        self.clean()
        self.patch("tickets/REL-01.md", subject_revision="different")
        self.assertTrue(any("subject revision" in d.message for d in self.inspect().diagnostics))

    def test_expiry_is_deterministic_and_transitive(self):
        self.ticket("ENA-01", "enabler", "closed", "ready", expires_at="2026-09-08T00:00:00Z")
        self.ticket("INV-01", status="closed", result="established", requires=["ENA-01:ready"])
        self.ticket("INV-02", requires=["INV-01:established"])
        before = {p: p.read_bytes() for p in self.root.rglob("*.md")}
        report = self.clean()
        self.assertEqual({"ENA-01", "INV-01"}, set(report.reassessment))
        self.assertEqual([], report.frontier)
        earlier = self.inspect(datetime(2026, 9, 7, tzinfo=timezone.utc))
        self.assertEqual(["INV-02"], earlier.frontier)
        self.assertEqual({}, earlier.reassessment)
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob("*.md")})
        self.patch("tickets/INV-02.md", status="active", claimed_by="agent", claimed_at="2026-09-08")
        self.assertTrue(any("requires reassessment" in d.message for d in self.inspect().diagnostics))

    def test_supersession_preserves_historical_dependents(self):
        self.ticket("DEC-OLD", "decision", "closed", "superseded", disposition="superseded")
        self.ticket("DEC-NEW", "decision", "closed", "accepted", approver="owner", supersedes=["DEC-OLD"])
        self.ticket("INV-01", status="closed", result="established", requires=["DEC-OLD:accepted"])
        self.ticket("INV-02", requires=["INV-01:established"])
        report = self.clean()
        self.assertIn("INV-01", report.reassessment)
        self.assertEqual([], report.frontier)

    def test_explicit_reassessment(self):
        self.ticket(applicability="needs-reassessment")
        report = self.clean()
        self.assertIn("INV-01", report.reassessment)
        self.assertEqual([], report.frontier)

    def test_missing_targets_and_cycle(self):
        self.ticket(requires=["MISSING:established"])
        self.assertTrue(any("missing required" in d.message for d in self.inspect().diagnostics))
        self.assertEqual([], self.inspect().frontier)
        self.ticket("INV-02", requires=["INV-01:established"])
        self.patch("tickets/INV-01.md", requires=["INV-02:established"])
        self.assertTrue(any("dependency cycle" in d.message for d in self.inspect().diagnostics))

    def test_scalar_lists_never_throw(self):
        self.ticket()
        for key in ["mode", "status", "owner", "id"]:
            with self.subTest(map_field=key):
                self.map(**{key: []}) if key != "mode" else self.map(mode=[])
                self.assertTrue(self.inspect().diagnostics)
        self.map()
        for key in ["type", "status", "result", "applicability", "priority", "id"]:
            with self.subTest(ticket_field=key):
                self.ticket()
                self.patch("tickets/INV-01.md", **{key: []})
                self.assertTrue(self.inspect().diagnostics)

    def test_malformed_frontmatter(self):
        for text in ["no frontmatter", "---\nid: x", "---\nid: x\nid: y\n---", "---\nid: [bad]\n---", "---\n  id: x\n---"]:
            with self.subTest(text=text):
                (self.root / "MAP.md").write_text(text)
                self.assertTrue(self.inspect().diagnostics)
        (self.root / "MAP.md").write_bytes(b"\xff")
        self.assertTrue(self.inspect().diagnostics)

    def test_serial_capacity_and_paused_map(self):
        self.ticket("INV-01", status="active")
        self.ticket("INV-02")
        self.patch("MAP.md", frontier=["INV-02"])
        self.assertIn("serial capacity occupied", self.clean().blockers["INV-02"])
        self.patch("MAP.md", status="paused")
        self.assertIn("map is paused", self.clean().blockers["INV-02"])

    def test_mechanical_completion_not_all_closed(self):
        self.ticket(status="closed", result="established")
        self.assertFalse(self.clean().completion["mechanical-ready"])
        self.patch("MAP.md", completion_requires=["INV-01:established"])
        path = self.root / "MAP.md"
        path.write_text(path.read_text().replace("[ ]", "[x]"))
        self.assertTrue(self.clean().completion["mechanical-ready"])
        self.patch("MAP.md", status="complete")
        self.clean()
        self.patch("tickets/INV-01.md", applicability="needs-reassessment")
        self.assertFalse(self.inspect().completion["mechanical-ready"])
        self.assertTrue(self.inspect().diagnostics)

    def test_tracker_completion_requires_recorded_reconciliation(self):
        self.map(coordination="tracker", tracker="tracker-url", mirror_status="pending", completion_requires=["INV-01:established"])
        self.ticket(status="closed", result="established")
        path = self.root / "MAP.md"
        path.write_text(path.read_text().replace("[ ]", "[x]"))
        self.assertIn("tracker mirror not recorded reconciled", self.clean().completion["unmet"])
        self.patch("MAP.md", mirror_status="reconciled", mirror_checked_at="2026-09-08")
        self.assertTrue(self.clean().completion["mechanical-ready"])

    def test_cli_json_text_and_exit_codes(self):
        command = [sys.executable, "-B", str(ROOT / "scripts/validate_tracker.py"), str(self.root)]
        output = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(0, output.returncode, output.stderr)
        self.assertIn("valid Wayfinder Ultra map", output.stdout)
        output = subprocess.run(command + ["--json", "--now", NOW.isoformat()], capture_output=True, text=True)
        self.assertEqual(asdict(self.inspect()), json.loads(output.stdout))
        self.assertEqual(0, output.returncode)
        (self.root / "MAP.md").write_text("malformed")
        output = subprocess.run(command + ["--json"], capture_output=True, text=True)
        self.assertEqual(1, output.returncode)
        self.assertEqual("invalid-record", json.loads(output.stdout)["diagnostics"][0]["code"])
        output = subprocess.run(command + ["--now", "bad"], capture_output=True, text=True)
        self.assertEqual(2, output.returncode)

    def test_interface_requires_aware_clock(self):
        with self.assertRaises(ValueError):
            self.inspect(datetime(2026, 9, 8))

    def test_all_type_results_in_both_modes(self):
        results = {
            "investigation": ["established", "disproved", "inconclusive"],
            "experiment": ["observed", "inconclusive", "aborted"],
            "decision": ["accepted", "deferred", "rejected"],
            "design": ["approved", "changes-requested"],
            "implementation": ["delivered", "failed", "abandoned"],
            "verification": ["pass", "fail", "inconclusive"],
            "release": ["successful", "rolled-back", "failed"],
            "enabler": ["ready", "not-ready", "expired"],
        }
        for mode in ["planning", "delivery"]:
            for type, outcomes in results.items():
                for result in outcomes:
                    with self.subTest(mode=mode, type=type, result=result):
                        for path in (self.root / "tickets").glob("*.md"):
                            path.unlink()
                        self.map(mode=mode)
                        updates = {"approver": "owner"}
                        if type == "verification" and mode == "planning":
                            updates["verification_scope"] = "planning"
                        if result == "expired":
                            updates["expires_at"] = "2026-09-07"
                        if type == "release":
                            self.ticket("VER-01", "verification", "closed", "pass", verification_scope="planning" if mode == "planning" else "delivery")
                            updates["requires"] = ["VER-01:pass"]
                        self.ticket("TICKET", type, "closed", result, **updates)
                        if mode == "planning" and type in {"implementation", "release"}:
                            self.assertTrue(any("not allowed" in d.message for d in self.inspect().diagnostics))
                        else:
                            self.clean()

    def test_planning_pass_cannot_gate_release(self):
        self.map(mode="delivery")
        self.ticket("VER-01", "verification", "closed", "pass", verification_scope="planning")
        self.ticket("REL-01", "release", requires=["VER-01:pass"])
        self.patch("MAP.md", frontier=["REL-01"])
        self.assertTrue(any("verification:pass" in d.message for d in self.inspect().diagnostics))

    def test_invalid_ticket_list_fields_and_duplicate_ids(self):
        self.ticket(requires="not-a-list")
        self.assertTrue(any("JSON list" in d.message for d in self.inspect().diagnostics))
        self.ticket()
        copy = self.root / "tickets/copy"
        copy.mkdir()
        (copy / "INV-01.md").write_text((self.root / "tickets/INV-01.md").read_text())
        self.assertTrue(any("duplicate ticket id" in d.message for d in self.inspect().diagnostics))

    def test_long_dependency_chain(self):
        # Exceeds the usual Python recursion limit in DFS order.
        count = 1050
        for index in range(count):
            self.ticket(f"INV-{index:04d}", requires=[f"INV-{index + 1:04d}:established"] if index + 1 < count else [])
        self.patch("MAP.md", frontier=[f"INV-{count - 1:04d}"])
        self.assertEqual([f"INV-{count - 1:04d}"], self.clean().frontier)

    def test_serial_claim_limit(self):
        self.ticket("INV-01", status="active")
        self.ticket("INV-02", status="review")
        self.assertTrue(any("at most one" in d.message for d in self.inspect().diagnostics))
        self.map(coordination="tracker", tracker="tracker-url", mirror_status="pending")
        self.clean()

    def test_documentation_links_and_symbols(self):
        for path in ROOT.rglob("*.md"):
            for target in re.findall(r"\]\(([^)]+)\)", path.read_text()):
                if "://" not in target and not target.startswith("#"):
                    self.assertTrue((path.parent / target.split("#")[0]).exists(), (path, target))
        self.assertTrue(callable(inspect_map))
        self.assertTrue(callable(validate))


if __name__ == "__main__":
    unittest.main()
