#!/usr/bin/env python3
"""Focused regression tests for digest-linked delta seals."""

from __future__ import annotations

import sys
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import benchmark_lib as lib
import verify_seal


class DeltaSealTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="delta-seal-tests-")
        self.root = Path(self.temporary.name)
        (self.root / "seals").mkdir()
        (self.root / "owned").mkdir()
        (self.root / "owned/a.txt").write_bytes(b"a-v1\n")
        (self.root / "owned/b.txt").write_bytes(b"b-v1\n")
        (self.root / "owned/unchanged.txt").write_bytes(b"same\n")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def create(
        self,
        number: int,
        *,
        previous: int | None = None,
        benchmark_id: str = "bench",
        seal_parent: str = "seals",
        owned_paths: list[str] | None = None,
    ) -> dict[str, object]:
        return verify_seal.create_seal(
            root=self.root,
            seal=f"{seal_parent}/design-v{number}",
            benchmark_id=benchmark_id,
            seal_type="design",
            revision=f"design-v{number}",
            previous_revision=(
                f"design-v{previous}" if previous is not None else None
            ),
            created_at=f"2026-09-{number:02d}T00:00:00Z",
            owned_paths=owned_paths or ["owned"],
        )

    def make_v2(self) -> dict[str, object]:
        self.create(1)
        (self.root / "owned/a.txt").write_bytes(b"a-v2\n")
        (self.root / "owned/b.txt").unlink()
        (self.root / "owned/c.txt").write_bytes(b"c-v2\n")
        return self.create(2, previous=1)

    def manifest(self, number: int) -> dict[str, object]:
        value = lib.load_json(self.root / f"seals/design-v{number}/manifest.json")
        self.assertIsInstance(value, dict)
        return value

    def write_manifest(self, number: int, value: dict[str, object]) -> None:
        (self.root / f"seals/design-v{number}/manifest.json").write_bytes(
            lib.canonical_json_bytes(value)
        )

    def test_v2_copies_only_exact_added_and_changed_delta(self) -> None:
        self.assertEqual(self.make_v2()["status"], "passed")
        manifest = self.manifest(2)
        self.assertEqual(manifest["schema_version"], 2)
        self.assertEqual(manifest["previous_revision"], "design-v1")
        self.assertEqual(
            manifest["previous_manifest_path"],
            "seals/design-v1/manifest.json",
        )
        self.assertEqual(
            manifest["previous_manifest_sha256"],
            lib.sha256_file(self.root / "seals/design-v1/manifest.json"),
        )
        self.assertEqual(manifest["deleted_paths"], ["owned/b.txt"])
        self.assertEqual(
            [entry["path"] for entry in manifest["files"]],
            ["owned/a.txt", "owned/c.txt"],
        )
        copied = {
            path.relative_to(self.root / "seals/design-v2").as_posix()
            for path in (self.root / "seals/design-v2").rglob("*")
            if path.is_file()
        }
        self.assertEqual(
            copied,
            {"manifest.json", "owned/a.txt", "owned/c.txt"},
        )
        receipt = verify_seal.verify_seal(
            root=self.root,
            seal="seals/design-v2",
            ownership_roots=["owned"],
        )
        self.assertEqual(receipt["status"], "passed")

    def test_deletion_only_delta_needs_no_copied_files(self) -> None:
        self.create(1)
        (self.root / "owned/b.txt").unlink()
        self.assertEqual(self.create(2, previous=1)["status"], "passed")
        manifest = self.manifest(2)
        self.assertEqual(manifest["files"], [])
        self.assertEqual(manifest["deleted_paths"], ["owned/b.txt"])
        self.assertEqual(
            [path.name for path in (self.root / "seals/design-v2").iterdir()],
            ["manifest.json"],
        )

    def test_v3_resolves_inherited_state_without_old_source_match(self) -> None:
        self.make_v2()
        (self.root / "owned/unchanged.txt").write_bytes(b"changed-in-v3\n")
        self.assertEqual(self.create(3, previous=2)["status"], "passed")
        manifest = self.manifest(3)
        self.assertEqual(manifest["deleted_paths"], [])
        self.assertEqual(
            [entry["path"] for entry in manifest["files"]],
            ["owned/unchanged.txt"],
        )
        self.assertEqual(
            verify_seal.verify_seal(
                root=self.root,
                seal="seals/design-v3",
                ownership_roots=["owned"],
            )["status"],
            "passed",
        )

    def test_creation_requires_immediate_revision_and_chain_identity(self) -> None:
        self.create(1)
        with self.assertRaises(lib.ContractError):
            self.create(3, previous=1)
        with self.assertRaises(lib.ContractError):
            self.create(2, previous=1, benchmark_id="other-benchmark")
        with self.assertRaises(lib.ContractError):
            verify_seal.create_seal(
                root=self.root,
                seal="seals/not-the-revision",
                benchmark_id="bench",
                seal_type="design",
                revision="design-v2",
                previous_revision="design-v1",
                created_at="2026-09-02T00:00:00Z",
                owned_paths=["owned"],
            )

    def test_previous_manifest_and_copy_tampering_fail_closed(self) -> None:
        self.make_v2()
        previous = self.root / "seals/design-v1/manifest.json"
        previous.write_bytes(previous.read_bytes() + b" ")
        receipt = verify_seal.verify_seal(root=self.root, seal="seals/design-v2")
        self.assertEqual(receipt["status"], "failed")
        self.assertTrue(
            any("stale digest" in issue for issue in receipt["errors"]["contract"])
        )

        # Restore the linked bytes, then corrupt an inherited copy.
        previous.write_bytes(previous.read_bytes()[:-1])
        inherited = self.root / "seals/design-v1/owned/unchanged.txt"
        inherited.write_bytes(b"tampered-old-copy\n")
        receipt = verify_seal.verify_seal(root=self.root, seal="seals/design-v2")
        self.assertIn(
            "seals/design-v1/owned/unchanged.txt",
            receipt["errors"]["changed_copies"],
        )

        # Restore it and corrupt the current delta copy as well.
        inherited.write_bytes(b"same\n")
        (self.root / "seals/design-v2/owned/a.txt").write_bytes(b"tampered\n")
        receipt = verify_seal.verify_seal(root=self.root, seal="seals/design-v2")
        self.assertIn(
            "seals/design-v2/owned/a.txt",
            receipt["errors"]["changed_copies"],
        )

    def test_exact_deletions_redundant_copies_and_identity_tampering_fail(self) -> None:
        self.make_v2()
        manifest = self.manifest(2)
        manifest["deleted_paths"] = []
        manifest["benchmark_id"] = "other"
        manifest["seal_type"] = "execution"
        unchanged = self.root / "owned/unchanged.txt"
        manifest["files"].append(
            {
                "path": "owned/unchanged.txt",
                "sha256": lib.sha256_file(unchanged),
                "bytes": unchanged.stat().st_size,
            }
        )
        target = self.root / "seals/design-v2/owned/unchanged.txt"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(unchanged.read_bytes())
        self.write_manifest(2, manifest)

        receipt = verify_seal.verify_seal(root=self.root, seal="seals/design-v2")
        self.assertEqual(receipt["status"], "failed")
        rendered = "\n".join(receipt["errors"]["contract"])
        self.assertIn("exact ownership delta", rendered)
        self.assertIn("redundant delta copy", rendered)
        self.assertIn("benchmark_id mismatch", rendered)
        self.assertIn("seal_type", rendered)

    def test_wrong_link_cycle_and_symlinks_fail_closed(self) -> None:
        self.make_v2()
        manifest = self.manifest(2)
        manifest["previous_manifest_path"] = "seals/design-v2/manifest.json"
        manifest["previous_revision"] = "design-v2"
        manifest["previous_manifest_sha256"] = "0" * 64
        self.write_manifest(2, manifest)
        receipt = verify_seal.verify_seal(root=self.root, seal="seals/design-v2")
        self.assertEqual(receipt["status"], "failed")
        self.assertTrue(
            any("cyclic" in issue for issue in receipt["errors"]["contract"])
        )

        copy = self.root / "seals/design-v2/owned/a.txt"
        copy.unlink()
        copy.symlink_to(self.root / "owned/a.txt")
        receipt = verify_seal.verify_seal(root=self.root, seal="seals/design-v2")
        self.assertEqual(receipt["status"], "failed")
        self.assertTrue(receipt["errors"]["unsafe_paths"])

    def test_current_closure_and_prior_seal_tree_growth_are_rejected(self) -> None:
        self.create(1)
        (self.root / "owned/late.txt").write_bytes(b"late\n")
        receipt = verify_seal.verify_seal(
            root=self.root,
            seal="seals/design-v1",
            ownership_roots=["owned"],
        )
        self.assertIn("owned/late.txt", receipt["errors"]["extra_owned"])

        # A sibling revision may not make an earlier immutable seal part of its
        # source closure, even when that tree is explicitly requested.
        other_root = self.root / "other"
        other_root.mkdir()
        (other_root / "payload.txt").write_bytes(b"payload\n")
        (self.root / "archive").mkdir()
        self.create(1, seal_parent="archive", owned_paths=["other"])
        with self.assertRaises(lib.UnsafePathError):
            self.create(
                2,
                previous=1,
                seal_parent="archive",
                owned_paths=["other", "archive/design-v1"],
            )

    def test_direct_file_sources_work_and_source_symlinks_are_rejected(self) -> None:
        direct_root = self.root / "direct"
        direct_root.mkdir()
        (direct_root / "payload.txt").write_bytes(b"payload\n")
        receipt = verify_seal.create_seal(
            root=self.root,
            seal="direct/design-v1",
            benchmark_id="bench",
            seal_type="design",
            revision="design-v1",
            previous_revision=None,
            created_at="2026-09-01T00:00:00Z",
            owned_paths=["direct/payload.txt"],
        )
        self.assertEqual(receipt["status"], "passed")

        (self.root / "owned/link.txt").symlink_to(self.root / "owned/a.txt")
        with self.assertRaises(lib.UnsafePathError):
            verify_seal.create_seal(
                root=self.root,
                seal="seals/design-v1",
                benchmark_id="bench",
                seal_type="design",
                revision="design-v1",
                previous_revision=None,
                created_at="2026-09-01T00:00:00Z",
                owned_paths=["owned"],
            )


if __name__ == "__main__":
    unittest.main()
