# ADR 0007: Certification, graduation, provenance, and licensing

Status: B0 and current-host B1 accepted locally; graduation remains separately governed

## Upstream and compatibility evidence

Arbor supports one installed-package certification target: `pi-fabric@0.76.2`. `UpstreamCertificationV1` retains package-lock resolution/integrity, every bounded payload file with bytes/mode/SHA-256 and claim mapping, exports, licenses/notices, interface groups, exact certifier source digests, tool versions, bounded command logs/digests, provenance, predecessor, limitations, compatibility linkage, and a mechanical validity predicate. Verification recomputes every manifest, mapping, log, linkage, and certificate digest.

The paired compatibility artifact includes every required export/provider/component/schema/risk/cancellation/approval/boundary/lifecycle check, a required host-integration-runtime check, and all six exact agent actions. Evidence is labeled `direct-runtime`, `direct-representation`, `contract-harness`, or `not-tested`. Static package/schema/descriptor/boundary facts use direct representation, public protocol harnesses use contract-harness, and support requires direct runtime evidence for all six agent actions, cancellation, approval allow/deny/once/session/auto, and the installed Fabric integration subprocess.

Current B0 and B1 evidence is valid for exactly `pi-fabric@0.76.2` and the retained host. Live Fabric evidence records model-backed run/spawn/status/wait/stop/cleanup observations, output sentinels, a running-child marker, and cancellation to exit 143. The retained approval artifact covers all five required decisions. A separately retained, bounded, timeout-enforced subprocess executes the current integration test through the real installed Fabric component/provider/`fabric_exec` path and records complete output, exit, process-group cleanup, and source/test/artifact digests. The fixture-backed integration lane is not represented as a second model run.

Production imports pi-fabric only through its public root export. `lintPiFabricPackageBoundary` rejects deep, `src`, `dist`, and root-escaping imports.

## Graduation protocol

Benchmark inputs, fixture digests, inference configuration, graders, reliability/accessibility/usability criteria, and thresholds must be sealed and administrator-signed before execution. Raw observations, commands, bounded complete logs, exits, platform, package/tool digests, and predecessor hash are retained. B11 thresholds remain unresolved and this package makes no graduation claim.

## Licensing decision

Package-authored code is offered under Apache-2.0 as recorded in `LICENSE` and `NOTICE`. The implementation is clean-room from the local authoritative plan. `THIRD_PARTY_NOTICES.md` records installed upstream notices, but legal review remains outside this technical certification.

## Consequences

Package upgrades, lockfile/export changes, certifier changes, host/tool drift, runtime-artifact tampering, approval-harness drift, or integration-test drift invalidate admission. B1 cannot be promoted through declaration inspection or an Arbor-only mock. The retained direct live-host evidence satisfies the existing runtime predicate without requiring model calls for static hash checks.
