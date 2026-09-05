#!/usr/bin/env python3
"""Saved legacy inspection remains stdlib-only and leaves all record bytes alone."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalInspectionTests(unittest.TestCase):
    def test_saved_json_and_markdown_are_not_migrated_or_recomputed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            documents = {"decision-report.json": json.dumps({"schema_version": 1, "decision": "inconclusive", "unknown": None}), "report.md": "# Historical result\nInconclusive.\n"}
            for name, text in documents.items():
                (root / name).write_text(text)
            before = {p.name: (p.read_bytes(), p.stat().st_mtime_ns) for p in root.iterdir()}
            for name, text in documents.items():
                result = subprocess.run([sys.executable, "-I", "-S", "-B", str(ROOT / "scripts/inspect_legacy_report.py"), str(root / name)], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, text)
            self.assertEqual(before, {p.name: (p.read_bytes(), p.stat().st_mtime_ns) for p in root.iterdir()})

    def test_invalid_or_missing_saved_report_is_an_actionable_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.json"
            path.write_text('{"value": NaN}')
            result = subprocess.run([sys.executable, "-I", "-S", "-B", str(ROOT / "scripts/inspect_legacy_report.py"), str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn("non-finite", result.stderr)


if __name__ == "__main__":
    unittest.main()
