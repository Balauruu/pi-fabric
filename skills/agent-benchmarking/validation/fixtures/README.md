# Preserved regression inputs

These are retained fixture **data**, not an old execution path or per-run certification system. Do not execute the legacy stage requests. The only current production entry remains `workflows/benchmark.ts`, documented in the skill README.

The original bytes of 30 non-protection assets are preserved. Only `baselines/project-status.txt`, `baselines/protected-packet.json`, and `isolated-defect/stale-seal.json` are retired because they enforce removed protection/seal machinery. Historical catalogs may mention those retired assets; they are not current acceptance manifests.

See [the mechanical disposition inventory](../../tests/fixtures/legacy-disposition.json) and [current fixture-consuming tests](../../tests/test_legacy_fixture_ports.py). Field translation exists only inside these tests; it preserves paired observations and missing cells without introducing a legacy runtime codec or reinterpreting historical inference.
