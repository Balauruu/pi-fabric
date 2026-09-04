# Phase 7 graduation runbook

Phase 7 is a fail-closed, evidence-producing graduation. Do not edit thresholds or evidence after seeing results. Any source, package-lock, tool, platform, browser runner, reviewer, or prior-certificate drift requires a new threshold seal and a complete rerun in a new `certification/phase7/` directory.

## Supported production envelope

The retained platform certificate admits only the exact current Linux architecture and release, Node executable/version/digest, Git version/digest, Bubblewrap version/digest, installed `pi-fabric@0.76.2` package digest, B1 compatibility certificate, and the required resource-enforcement capabilities. Unsupported or stale platforms fail before acceptance starts.

Remote Web, resident mode, and publication to user repository refs remain explicitly disabled. The Web server is loopback-only and intent-only. Workers never receive held-out input or the evaluator capability. Production deployment must pass its exact package-issued fingerprint-decorated adapter/configuration graph to `loadGraduatedProductionStatusV1()` and use the returned opaque `admission`, or use `prepareGraduatedProductionProviderV1()`. Caller booleans cannot select production. The extension remains blocked and exposes exact verifier reasons unless that preparation succeeds.

## Clean regeneration order

1. Verify the repository root and preserve all existing evidence and uncommitted work.
2. Regenerate every stale source-bound Phase 0-6 certificate. Generate licensing after package-lock/upstream changes. Do not generate distribution yet.
3. Run `npm run build`, `npm test`, `npm run lint:package-boundary`, and `npm audit --audit-level=high`.
4. Remove or archive the complete old `certification/phase7/` directory. Individual Phase 7 artifacts are create-only and must never be replaced in place.
5. Run `npm run certify:phase7:seal`. This creates a read-only Ed25519 threshold seal and SHA-256 checksum before execution. The default signed execution window is four hours.
6. Inspect `graduation-thresholds.v1.json`. Stop if any threshold is wrong. Do not edit it.
7. Run `npm run test:browser:phase7`. This runs production Chromium against release-built assets at desktop, tablet, and mobile viewports and writes screenshots, JSON evidence, and a checksum bound to the threshold seal.
8. Run `npm run certify:phase7`. It rejects preexisting execution artifacts, certifies the platform, executes all 35 mandatory steps once for maximize and once for minimize, compares baseline and candidate receipts, runs the duration-and-cycle recovery soak, launches independent read-only reviewers, and signs the graduation verdict.
9. Run `npm run verify:phase7`. Require `valid: true`, `passed: true`, and an empty unresolved-predicate list.
10. Run `npm run certify:distribution` last, then `npm run verify:certificates` and `npm pack --dry-run --ignore-scripts --json`.

## Mechanical graduation predicates

The verifier independently checks:

- the Ed25519 threshold signature, source/schema/payload/seal digests, checksum, and execution window;
- exact platform/tool/package/B1 bindings and all advertised hard-enforcement capabilities;
- two direction-aware 35-step acceptance certificates with a closed, bounded, step-discriminated concrete receipt for every numbered step, 68 boundary fingerprints, source non-interference, evaluator isolation, crash recovery, Web disconnect/reconnect, promotion, rollback, cleanup, and restart continuity;
- each step receipt digest, exact boundary certificate/effect/command/fence/containment/correlation/previous-digest/repository/report binding, initial source-state fact, top-level acceptance field, three-attempt classification, fresh authorization and write-policy approval, exact winner-ref CAS transition, report inventory, projection, cleanup, quarantine probe, and resource snapshot;
- exact-arithmetic benchmark deltas in maximize and minimize directions under one sealed evaluator policy;
- at least 10,000 durable soak cycles and 30 seconds, a complete hash-chained JSONL log, 100% accepted recovery outcomes, and zero duplicate effects;
- p95 and p99 operation latency thresholds;
- hard evaluator wall/output/process/RSS limits and aggregate agent concurrency/token/cost/evaluator budgets;
- release-built browser route, viewport, keyboard, WCAG-oriented, intent-only, leakage, and representative journey evidence;
- independent security, accessibility, and licensing reviews, including zero npm-audit high or critical findings and closed notice obligations;
- all source, prior-gate, evidence, checksum, review, and graduation signature bindings;
- the executing `dist/src/phase7/index.js`, digest-bearing npm inventory, all shipped `dist` bytes, active source/artifact/pi-fabric trees, exact runtime configuration and adapter identities, package-issued fingerprint wrappers, and the internal policy-traversal authority bound to the exact B9 approval-runtime certificate.

A missing file, malformed record, stale digest, unsupported platform, unmet threshold, contradictory summary, audit finding, or nonempty unresolved-predicate list makes verification fail.

## Retention and incident response

Retain the entire `certification/phase7/` tree, including all `.sha256` files, screenshots, independent reviews, complete soak JSONL, acceptance fingerprints, all 70 concrete per-step evidence receipts, and the graduation certificate. Do not retain opaque capability plaintext, signing private keys, credentials, temporary repositories, evaluator sockets, or scratch state.

If any predicate later becomes stale, immediately treat production as uncertified. Disable real-agent dispatch, promotion, rollback, and evaluator execution; preserve current evidence under legal-hold rules; diagnose the drift; regenerate affected Phase 0-6 evidence; then repeat Phase 7 from a new pre-execution seal. Do not reuse or copy a prior admission object: it is process-local and bound by identity to the exact verified adapter graph.
