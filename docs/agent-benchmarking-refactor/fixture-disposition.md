# WP7 legacy fixture disposition

The original 33 fixture assets were mechanically enumerated from the pre-cutover Git tree. All 30 assets not confined to protection/seal machinery were restored byte-for-byte, including malformed UTF-8 and CRLF inputs. Only the three protection/seal-only assets remain deleted. No paid run directory was read, changed or migrated for this restoration.

Authoritative inventory: `skills/agent-benchmarking/tests/fixtures/legacy-disposition.json`. Relative paths below are under `skills/agent-benchmarking/validation/fixtures/`. The current test owner is `skills/agent-benchmarking/tests/test_legacy_fixture_ports.py`; its cutover assertion checks all 33 dispositions, retained paths, referenced test symbols, and that active fixture deletions are a subset of the three explicit retirements.

Fifteen assets are directly consumed by current-interface tests. The other fifteen restored files remain historical input/catalog data, not assertions of replacement behavioral coverage. Restoration preserves those cases for further porting; it does not advertise old stage requests as an execution API. Historical catalogs are not current acceptance manifests and can still mention the explicitly retired protection assets.

The restored unknown-analysis-option fixture exposed a real regression: standalone analysis silently ignored `optimistic_promotion`. `analysis_engine.build_context` now validates the resolved specification against the authoritative schema before inference. A malformed simulation stub was expanded to a valid model declaration without changing its unsupported-process assertion. No Bernoulli generator, sampler, model implementation, seed, or criterion was changed.

Checks: nine fixture-port tests pass. The adjacent 33-test analysis run passed 32 and exposed the malformed stub; after fixing that stub, the one failed simulation case passed. Two real lifecycle/model-target handoff checks also passed. Counts overlap and are not a unique full-suite total. Scientific A07/A13 remain open and the frozen Bernoulli continuation is still running.

| Legacy asset | Disposition | Current assertion or reason |
| --- | --- | --- |
| `baselines/project-status.txt` | Retired: protection/seal only | Protected-state project snapshot; removed protection scan only. |
| `baselines/protected-packet.json` | Retired: protection/seal only | Protected-state baseline packet; removed protection scan only. |
| `boundary/schedule-boundaries.json` | Restored; consumed by current tests | `test_schedule_boundary_cases_use_current_generation` |
| `boundary/single-task-paired-analysis.json` | Restored; consumed by current tests | `test_single_task_boundary_cannot_promote` |
| `canary/attempt-lifecycle.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/blind-map-isolation.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/condition-loading.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/development/README.txt` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/false-complete-refusal.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/fresh-parent-sessions.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/interrupted-wave-resume.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/mechanism-nested.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/primary-source-grading.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/randomized-schedule.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/runtime-model-identity.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/supervisor-prelaunch-failure.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/synthetic-catalog.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/token-cost-attribution.request.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `canary/workflow-request.json` | Restored; consumed by current tests | `test_old_stage_requests_are_data_not_current_runner_aliases` |
| `fixture-catalog.json` | Restored; historical input only | Retained regression input; legacy request syntax is data, not an active runner entry. |
| `isolated-defect/grader-condition-leakage.json` | Restored; consumed by current tests | `test_condition_leakage_fixture_maps_to_actual_blind_projection` |
| `isolated-defect/stale-seal.json` | Retired: protection/seal only | Removed seal verification only. |
| `known-bad/analysis-unknown-option.json` | Restored; consumed by current tests | `test_unknown_analysis_option_is_not_silently_dropped` |
| `known-bad/unequal-cells.json` | Restored; consumed by current tests | `test_unequal_cells_fail_against_the_saved_complete_schedule` |
| `known-bad/workflow-request-extra-property.json` | Restored; consumed by current tests | `test_old_stage_requests_are_data_not_current_runner_aliases` |
| `known-good/confirmatory-paired-analysis.json` | Restored; consumed by current tests | `test_paired_values_match_independent_hand_effects` |
| `known-good/paired-analysis.json` | Restored; consumed by current tests | `test_paired_values_match_independent_hand_effects` |
| `known-good/workflow-request.json` | Restored; consumed by current tests | `test_old_stage_requests_are_data_not_current_runner_aliases` |
| `malformed/blank-line.jsonl` | Restored; consumed by current tests | `test_original_malformed_bytes_reach_current_parser` |
| `malformed/crlf.jsonl` | Restored; consumed by current tests | `test_original_malformed_bytes_reach_current_parser` |
| `malformed/duplicate-key.json` | Restored; consumed by current tests | `test_original_malformed_bytes_reach_current_parser` |
| `malformed/invalid-utf8.json` | Restored; consumed by current tests | `test_original_malformed_bytes_reach_current_parser` |
| `malformed/invalid.json` | Restored; consumed by current tests | `test_original_malformed_bytes_reach_current_parser` |
