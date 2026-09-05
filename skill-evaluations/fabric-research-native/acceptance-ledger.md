# Native research migration acceptance ledger

Implementation explicitly authorized by the user. The unchanged plan is the historical specification. No optional startup preset.

## Result: implementation and fresh-process behavior validated; Main reload remains

**25 checks passed:** 13 deterministic workflow tests, 7 live-evidence tests, 5 Main-owned trace tests. Native typechecking, skill validation, syntax, scoped whitespace and historical hashes passed. Passing live research branches were not rerun unnecessarily.

The current Main TUI has not reloaded. Run `/reload` or restart it. Fresh ordinary Pi startup and native workers were independently validated; those do not reload Main's existing process.

| Requirement | Mechanical evidence |
|---|---|
| Normal package loading, unrelated changes preserved | settings.before.json records the old override; current settings.json has plain npm:betterwright. Main changed only that object. Concurrent package additions remain intact. |
| One ordinary native workflow | skills/fabric-research/scripts/workflow-program.js uses actual agents.run, parallel, workflow.configure/item/event, phase and native budget observations. native-typecheck.json has zero errors. No SDK adapter, synthetic provider, loader framework or replacement tool remains. |
| Existing four retrieval tools, configured search | All four tools succeeded. search-native-entry.json, obtained from the owner-held native log, records response mtocuw8c11xs6l, provider exa, no error and the IANA URL. Invocation: workflow:none, no provider/model override. Exa exposes no separate search-model identity here; worker identity is not substituted. |
| One authoritative browser rule carried into assignments | Exact rule occurs once in SKILL.md and is copied into every canonical assignment, including retries. Deterministic assignment tests and native child traces confirm normal grants and behavior. No QA activation, latch, gateway or denial runtime. |
| Research methodology retained | Full five-file audit retains routing, requirement/uncertainty ownership, provenance, temporal validity, comparability, source independence, Main verification/synthesis, bounded recovery and partial coverage. |
| Direct research, zero children | Main-owned finalized traces cover three recorded direct calls: four existing web tools, zero agent dispatches, zero browser calls. coordinator-verification.md retains clock, exact IANA passage, entailment and requirement disposition. |
| Native multistream and surviving siblings | Actual IANA/current-field workers complete; third dispatch hits native attempt cap without losing siblings. Separate impossible-schema worker fails while valid sibling completes. Original native receipts remain unchanged. |
| Native budgets, progress and telemetry | Owner trace records Preflight/Research/Account, native configure/parallel/items/event, two successful dispatches and one native budget refusal. owner-trace-summary.json retains 21 canonical operations. Helper token observation is explicitly not a raw-agents.run token cap; missing aggregate usage stays unavailable. |
| Retrieval and coordinator verification/recovery | Exact IANA opening paragraph independently fetched and checked. source_check's unclear result not blindly promoted. Deliberate .invalid fetch yields ENOTFOUND and successful=0, retained as gap without browser recovery/retry. |
| Native current-field last30days | Installed .venv Python -B ran once through native worker: HN-only quick seven-day window, both no-browser-cookies and Trustpilot opt-out, scoped config/memory/tmp/save/output. Exit0, schema1.2, HN source_status ok, six results. No setup/install/credential copies or dependency edits. |
| Old runtime/tests/docs removed, history retained | extensions/qa-browser/, docs/runtime-browser-policy/, three old mechanism tests and search-probe removed. Four historical evidence/output files still match historical-evidence.sha256. Historical README explicitly superseded. |
| Fresh normal resources and ordinary BetterWright | Ordinary profile-scoped RPC exposes research skill and normal commands, no QA commands or target diagnostics. Fresh native leaf exposes BetterWright and all four web tools. Separate NON-RESEARCH existing-about:blank inspection/proof succeeds without activation. Basic usability proven, not login/checkout. |
| Zero research browser calls, no artificial denial loops | Main reconciled 60/60 coordinator tool starts/ends, zero dropped finalized operations, plus owned child terminal calls. Sole coordinator browser call belongs to explicitly separate NON-RESEARCH probe. Direct/canonical research windows have no browser-denial errors or retries. |
| Unrelated work and installed dependencies preserved | Scoped migration only. Concurrent benchmarking/package/settings additions untouched. Nested last30days checkout clean. No dependency/provider/model/credential configuration edits by this migration. |

## Native identities

Validator: 9ac67fd06e68473e9cfcbecf5ba7bb8c, native Pi process transport.

- Fresh resources: d5c7964a565f472eaeca01aeecba91e3
- Canonical IANA: 2fd290b6f7fd4e4da0c63f9e5ed4bce9
- Canonical current-field: 254ad50ac5144924a61a20c8c66ce6e3
- Valid delivery sibling: 984294b476c6419db8b506aa33f0942e
- Impossible-schema worker: 9fd12bc9e26f4f118699148d07950a50

## Reproducible checks

```sh
node --test skill-evaluations/fabric-research-native/workflow.test.mjs
node --test skill-evaluations/fabric-research-native/live-evidence.test.mjs
node --test skill-evaluations/fabric-research-native/owner-evidence.test.mjs
node skill-evaluations/fabric-research-native/native-typecheck.mjs
python -B skills/ultra-skill-creator/scripts/validate_skill.py skills/fabric-research
node --check skills/fabric-research/scripts/workflow-program.js
sha256sum -c skill-evaluations/fabric-research-native/historical-evidence.sha256
```

First suite: minimal mocked native seams against the actual canonical body. Other suites: retained actual live receipts/API traces, not new live executions. Records: implementation-checks.md, workflow-green.txt, live-evidence-tests.txt, owner-test-results.txt.

Main paginated agents.log through 426 API calls, reconciling every finalized tool trace to the native 60-call receipt. Three oversized redundant agent_end/progress snapshots exceeded the API limit; all starts/ends and finalized traces remain available with droppedOperations=0. No raw session files scraped. coordinator-owner-trace.json retains events; search-native-entry.json separately retains actual custom search metadata.

## Limitations and explained failures

1. **Main still needs /reload or restart.** Fresh startup/native loading passed; the existing Main process has not refreshed.
2. **Current-field evidence quality:** engine succeeded, worker omitted provenance.retrievedAtUTC. The original row correctly remains quarantined as completed-no-usable-evidence. No candidate coverage or SQLite recommendation is invented. This is honest partial evidence, not an engine-dispatch failure.
3. **Engine diagnostics:** generic stderr says '4/5 core sources' and recommends browser login despite HN-only source_status. Worker ignored browser advice. Coverage uses source_status. Date window is inclusive calendar dates, not exact intraday evidence. Dependency unchanged.
4. **Explained test failure:** Main's first error matcher included a startup /proc/1111/environ PermissionError in research recovery. The exact operation was inspected. Corrected test retains and asserts that one unrelated startup failure, still checks zero browser calls across all coordinator operations except the separate probe, and checks denial-free behavior in the pre-recorded direct/canonical research windows. Other setup errors and deliberate native failure fixtures remain visible.
5. **Host artifact scope exception:** BetterWright automatically wrote /home/balauru/.betterwright/artifacts/85b42e1702877c85/proof-1788611903441-ddbbd7.png; a profile copy is retained. This intrinsic behavior exceeded the requested profile-only write scope and is disclosed, not claimed as confinement. No external cleanup/config edits attempted. Native Fabric also retains normal host-managed logs.
6. **Transport diagnostic:** validator completed exit0 with usable native receipts, but stderr contains an installed QuickJS shutdown assertion. No dependency repair attempted; reconciled finalized traces remain valid.

Rollback restores only migration-owned edits, never the entire tree. pre-migration.patch and settings.before.json are evidence snapshots, not permission to overwrite subsequent concurrent changes.
