# Acceptance ledger

Updated 2026-09-03 after the Phase 7 implementation and retained acceptance run. Claims apply only to the exact certified package, host, platform, tools, sources, and content-addressed evidence. Any verifier drift invalidates the claim.

> **Current remediation state: ADMITTED for the exact active host.** Separate complete B0/B1 matrices certify `pi-fabric@0.76.2 || pi-fabric@0.77.0`. On the current exact `0.77.0` payload, all B0-B12 and Phase 4-7 artifacts verify, the signed Phase 7 verdict has `passed: true` with unresolved predicates `[]`, the final distribution inventory verifies, and both `productionCertified` and `realAgentsEnabled` are true. This remains fail-closed evidence, not forward compatibility: any changed input or untested release removes admission.

## Production gates B0-B12

| Gate | Status | Mechanical evidence |
|---|---|---|
| B0 upstream | PASS for exact `0.76.2 || 0.77.0` | Separate bounded payload, package-lock provenance, export, notice, and certifier-input inventories under `certification/upstream/pi-fabric/{0.76.2,0.77.0}/` |
| B1 runtime compatibility | PASS for exact `0.76.2 || 0.77.0` | Per-release direct six-action agent lifecycle/cancellation evidence, five approval modes, installed Fabric integration, and compatibility `supported: true` |
| B2 domain/schema | PASS | Closed bounded catalogs, Phase 7 public schemas, exact decimal arithmetic, state-machine and compatibility tests |
| B3 workspace/evaluation | PASS for retained host | Exact-OID dissociated private repository, isolated worktrees, strict finalization, confined evaluation |
| B4 persistence/recovery | PASS | WAL/replay/snapshot/outbox/recovery projections and migration 5 Phase 7 stores |
| B5 containment | PASS for retained Linux/Bubblewrap | Signed 38-observation direct matrix covering all 34 required names, pre-exec identity/cgroup handshake, and hard wall/output/process-tree/RSS termination |
| B6 non-interference | PASS for retained Git/platform | 100 signed primary/oracle fingerprint trials and 68 Phase 7 boundary certificates |
| B7 authorization | PASS for retained local policy | Owner-UID, owner-only Ed25519 keys, bounded TTY, expiry/revocation/one-use negative matrix |
| B8 held-out isolation | PASS | Worker denial, evaluator-only capability, sealed Unix service and exact candidate/input/policy receipts |
| B9 Web/security | PASS | Loopback-only intent inbox, Host/Origin/CSRF/schema/rate/body/SSE/artifact bounds, release UI and independent review |
| B10 licensing | PASS for retained active `0.77.0` lock/package | 267 reviewed packages, license/notice closure, zero unresolved obligations |
| B11 thresholds/distribution | PASS | Signed pre-execution policy seal and mechanically verified final 579-file dry-run npm inventory |
| B12 retention | PASS | Explicit outcome durations, holds, deletion rules, complete reports and protected retained evidence |

## Phase exits

| Phase | Exit status | Evidence |
|---|---|---|
| P0-P3 | PASS for declared retained scope | Domain, schemas, package boundary, B0/B1, Git, containment, evaluator and fingerprint artifacts |
| P4 | PASS | 19 boundaries x 20 deterministic crash injections, exact fence/identity observation, zero duplicate accepted effects |
| P5 | PASS | B7/B8, detached same-policy evaluation, exact winner-ref CAS, rollback and re-promotion certificates |
| P6 | PASS | Release-built detached Web UI, complete reports, cleanup/retention, Web/approval/license/browser/distribution artifacts |
| P7 | PASS | Signed seal, platform admission, 70 mandatory E2E steps, benchmark, soak, hard resources, browser UX/accessibility, independent reviews and signed graduation verdict |

## Mandatory E2E 1-35

Both `maximize` and `minimize` executions contain all numbered steps. Every step retains one nonempty, bounded, closed, step-discriminated concrete evidence receipt whose `evidenceDigest` is the canonical digest of that receipt. Steps 2-35 cross-bind the exact signed fingerprint certificate, effect, command, fence, containment, correlations, previous digest, before/after repository digests, and report generation; step 1 retains exact initial OID, dirty tracked/untracked, stash, sibling, user-ref, and bounded command/log facts.

| Steps | Retained observation |
|---|---|
| 1-4 | Presealed policy, dirty source/oracle fingerprint, content-addressed contract, exact-OID private Git import |
| 5-7 | Source/sibling write denial, complete direct containment matrix, canonical development plus sealed held-out baselines |
| 8-10 | Three reserved hypotheses/attempts, concurrent valid/protected/interrupted processes, exact digest-bound interrupted-workspace readiness before cancellation, completed-child crash gap |
| 11-15 | Disconnected durable Web intent, SSE catch-up, stale-fence rejection, completed-child recovery without rerun, retry with fresh identities |
| 16-20 | Exact candidate OID, direction/boundary/spread/tie arithmetic, detached merges, same-policy held-out comparison, correct trust labels |
| 21-27 | Web intent-only promotion, local authorization, independent Fabric approval evidence, exact CAS, crash observation, rollback, fresh re-promotion |
| 28-31 | Frozen report plan, partial-file/rename recovery, complete published report, manifest-only idempotent cleanup |
| 32-35 | Restart parity, guarded boundary coverage, independent oracle equality, deliberate mutation quarantine |

Retained acceptance IDs and digests:

- `acceptance_phase7_maximize_v1`: `896eeac0fee8cfe32e90804b70a688346726cf120c6db7b11faeb9edda42b893`
- `acceptance_phase7_minimize_v1`: `9c2fb34c4ef8dddf7a486d1ad66ed7ba2a5888a7e6886fe8c99e2656f479c24a`
- Total: 70/70 passed steps, 70 retained concrete receipt variants, 68 valid fingerprint certificates, 36 bounded command/log receipts, 6 distinct authorizations, 6 distinct Fabric write-policy approvals, 6 exact winner-ref CAS observations, and 22 complete report-file receipts.

## Phase 7 sealed results

| Predicate | Sealed threshold | Observed | Result |
|---|---:|---:|---|
| Normalized benchmark delta | >= 5, both directions | maximize 12; minimize 12 | PASS |
| Recovery success | 10,000 basis points | 10,000 | PASS |
| Duplicate effects | 0 | 0 | PASS |
| Soak | >= 10,000 cycles and >= 30,000 ms | 10,000 cycles; 30,000 ms | PASS |
| Step latency | p95 <= 750 ms; p99 <= 5,000 ms | p95 658 ms; p99 3,070 ms | PASS |
| Evaluator process | <= 10,000 ms, 65,536 output bytes, 16 processes, 536,870,912 RSS bytes | Hard cgroup-v2 enforcement and measured receipts; no acceptance breach | PASS |
| Agent aggregate | <= 3 concurrent, 4,096 tokens/agent, 12,288 tokens total, USD 1/agent, USD 3 total | Atomic pre-reservation and metered settlement; no acceptance breach | PASS |
| Accessibility | >= 8 checks, 3 viewports, no critical/serious findings | 11 boolean predicates, four contrast samples, named-control inventory, 3 viewports, no findings | PASS |
| Usability | >= 2 journeys, 100% success, median <= 120,000 ms | 2 journeys, 100% success | PASS |
| Security | >= 50 direct checks, zero critical/high | 71 checks, zero critical/high; npm audit 0 vulnerabilities | PASS |
| Licensing | zero unresolved obligations | 0 | PASS |

Artifact digests:

- Threshold seal `seal_phase7_graduation_v1`: `c1ca4aa826d37c87810ac828faf75e984f49b7f08b7354f4f3ba1d475772790d`
- Supported platform: `989be94c40ba6e67a43523dd028487f3692ac3d2fd1dde9b3661ba927ae7ebc1`
- Benchmark: `50d0b616adf4d321131497f0dc873c1dd95e85281a793ce859c7807a6e25b8a8`
- Soak: `5b76ef4b853ca6186b657ab736bab00a465e9e2ef25bc3b31387d3e1eedcd5bd`
- Browser evidence file: `962beb82c297621c76bfacd0af56e32648f51f6ce19f858d3c6ef6ad45a02e6d`
- Independent reviews: security `89ae7ec9b738f48ea58ec75f251007ee1309d6ef86cdd7391a9836905f9748b5`; accessibility `fae2004c5949ffabe7973476122352c2dc8d03ba1a2b8084a61fd5c62e6c3a77`; license `9f82463e0e91425f16cc09500952f505338144ad31449836df8a431d0e2deaeb`
- Graduation `phase7_graduation_v1`: `6686edae59dbfd7d03b68db2904350bb6b3a92b7f0e26c35e5afbeca09f3ae2a`, `passed: true`, unresolved predicates `[]`.

The complete hash-chained 10,000-cycle JSONL log, screenshots, review inputs, acceptance certificates, checksums and signatures are retained under `certification/phase7/`. Remote Web, resident mode and user-ref publication remain disabled.

## Final verification evidence

- `npm test`: PASS, 179 tests, 0 failures, including both retained release matrices, packaged-entrypoint admission, all 35 closed Phase 7 variants, readiness-digest tampering, all 34 consequential fingerprint mutations, containment fast exits, private-Git candidate verification, recovery, Web, promotion, report, cleanup, retention, and distribution checks.
- `npm run test:browser:phase7`: PASS, 33 ordinary-control route checks, 114 assertions, three screenshots/viewports, 11 boolean accessibility predicates plus structured contrast/control evidence, two journeys at 10,000 basis points, and no unexpected browser, HTTP, external-network, console, or leakage findings.
- `npm run verify:phase7`: PASS on active `pi-fabric@0.77.0`, certificate `6686edae59dbfd7d03b68db2904350bb6b3a92b7f0e26c35e5afbeca09f3ae2a`, no errors.
- `npm run lint:package-boundary`: PASS, no violations.
- `npm run verify:certificates`: PASS for both exact B0/B1 release matrices and every retained containment, fingerprint, recovery, authorization, held-out, promotion, Web, approval, licensing, retention, Phase 7, and distribution artifact.
- `npm run certify:distribution` and distribution verification: PASS with 579 certified inventory files and all required bins, exports, assets, Phase 0-7 evidence, runbooks, license/notice files, and prohibited-file checks.
- Direct startup aggregation on the current exact `pi-fabric@0.77.0` host reports `productionCertified: true`, `realAgentsEnabled: true`, and blockers `[]`. An unlisted future version or any digest drift remains blocked.

Production remains fail-closed. Use the opaque `admission` returned by `loadGraduatedProductionStatusV1()` or `prepareGraduatedProductionProviderV1()`. The package is not admitted if any active source, built/shipped byte, adapter identity, configuration, dependency, tool, platform, prior certificate, threshold, artifact, review, checksum, or signature binding drifts.
