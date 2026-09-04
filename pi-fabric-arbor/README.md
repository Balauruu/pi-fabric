# pi-fabric-arbor

`pi-fabric-arbor` is a separately versioned ESM TypeScript package for deterministic, journaled Arbor research runs on pi-fabric. It contains the Phase 0-2 control plane, Phase 3 production seams, Phase 4 recovery and detached monitoring, Phase 5 evaluator-certified package-ref promotion, Phase 6 release hardening, and Phase 7 graduation. Phase 7 adds signed pre-execution thresholds, hard process/token/cost/concurrency budgets, an opaque-capability held-out evaluator service, two complete direction-aware 35-step E2E runs with closed concrete per-step receipts and exact cross-bindings, baseline comparison, a durable recovery soak, supported-platform admission, production Playwright evidence, independent security/accessibility/license reviews, and a signed graduation verdict.

## Install and activate

Pi packages execute with the user's full OS authority. Review this package and its retained evidence before installation.

```sh
pi install npm:pi-fabric-arbor@0.1.0       # after publication, global and pinned
pi install -l /absolute/path/pi-fabric-arbor # reviewed project-local checkout
pi list
pi config                                  # enable the extension and skill
```

Project-local resources require Pi project trust and a restart or `/reload`. Verify pi-fabric component/provider/action discovery and production admission before calling anything; neither the package nor the `fabric-arbor` skill assumes `arbor.*` actions exist. See [`docs/consumer-installation.md`](docs/consumer-installation.md).

## Safety status

Production admission remains **fail-closed**. The current profile sibling host is `pi-fabric@0.77.0`, one of the two exactly retained and certified releases: `0.76.2 || 0.77.0`. Current B0-B12, Phase 4-7, browser, platform, and final distribution artifacts verify, the signed Phase 7 verdict has `passed: true` with no unresolved predicates, and the active status reports `productionCertified: true` and `realAgentsEnabled: true`. Retained evidence applies only to its exact release payload, host, source, tools, configuration, and artifacts; any drift disables real execution until the complete dependent chain is intentionally regenerated and reviewed. Each supported release has its own direct model-backed `agents.run/spawn/status/wait/stop/cleanup` evidence, validated output sentinels, running-child and exit-143 cancellation observations, five-mode approval evidence, and bounded installed Fabric component/provider/`fabric_exec` integration. Static representations remain labeled `direct-representation`, provider protocol probes remain labeled `contract-harness`, and no untested future release is admitted by range.

| Gate | Current local evidence | Result |
|---|---|---|
| B0 installed upstream | Separate bounded payload, lock provenance, export, notice, interface, command, and certifier-source inventories for `pi-fabric@0.76.2` and `0.77.0` | valid for both exact retained releases |
| B1 Fabric runtime compatibility | Per-release direct evidence for all six agent actions and cancellation; installed-runtime approval evidence for all five modes; bounded real installed Fabric integration; exact package/tool/source/test/artifact bindings | valid for the exact retained set `0.76.2 || 0.77.0` |
| B3 private workspaces/evaluation | Exact-OID private imports, three isolated workspaces, finalization validation, bounded confined evaluation | locally tested |
| B5 containment | Signed local Linux/Bubblewrap certificate and complete 34-case direct adversarial matrix | valid only for the named kernel/runtime/binary/tool digest |
| B6 non-interference | 100 signed dirty-checkout trials, separate oracle implementation, full Git/common-dir/worktree/stash/ref capture, chain linkage | valid only for the named tools |
| Phase 4 recovery | 19 boundaries x 20 deterministic injections, source-bound retained certificate, B6 bindings, no duplicate accepted side effects, fresh/reconstructed projection equality | locally valid |
| B7 local authorization | Owner-UID principal registry, owner-only Ed25519 keys, bounded TTY confirmation, canonical one-time signatures, expiry/revocation, and retained negative matrix | valid only for the named local implementation and file-owner policy |
| B8 held-out isolation | Held-out evaluator input/capability separation plus direct worker-denial and evaluator-read matrix | valid only for the named Linux/Bubblewrap policy and active input digest |
| Phase 5 promotion | Detached construction, same-policy certificates, exact winner-ref CAS, crash observation, rollback, and re-promotion | locally valid when its retained certificate and all production startup gates verify |
| B9 Web threat model | Actual loopback server matrix for session/CSRF/Host/Origin/schema/body/rate/SSE/artifact/response bounds plus release-built UI static analysis | valid for the retained source and release assets |
| B10 legal/licensing | Exact active `pi-fabric@0.77.0` dependency/license/notices inventory and shipped notice validation | valid for the retained lock/package inputs |
| B11 distribution | Every non-self packed path/byte count/mode/SHA-256, build-source/tool digests, independently unpacked tarball equality, exact bin/export/asset/license/notice inventories, deterministic self exclusion, and leak checks | valid for the final retained package |
| B12 retention | Explicit per-class/per-outcome durations, legal holds, deletion rules, retained evidence, report/query consistency, and cleanup protections | valid for the retained policy source |
| Phase 7 graduation | Signed threshold seal, supported-platform certificate, two 35-step directions, benchmark deltas 12/12, 10,000-cycle soak, browser UX/accessibility, independent reviews, and signed verdict | **passed** on active `pi-fabric@0.77.0`; unresolved predicates `[]` |

No artifact claims behavior that was inferred from declarations or documentation. `loadProductionCertificationStatus()` mechanically validates retained artifacts against the active package, platform, Bubblewrap binary, adapter, and fingerprint tools before deriving startup gates. See [`docs/compatibility-matrix.md`](docs/compatibility-matrix.md) for the exact B1 tier matrix.

## Build, test, and certificates

Requires Node 24 or newer, Git, Linux user namespaces, and Bubblewrap for containment certification.

```sh
npm install --ignore-scripts
npm run build
npm test
npm run certify:host-integration-runtime
npm run certify:upstream
npm run certify:containment
npm run certify:fingerprint
npm run certify:recovery
npm run certify:authorization
npm run certify:held-out
npm run certify:promotion
npm run certify:web
npm run certify:approval-runtime
npm run certify:licensing
npm run certify:retention
npm run test:browser
npm run certify:phase7:seal
npm run test:browser:phase7
npm run certify:phase7
npm run verify:phase7
npm run certify:distribution
npm run verify:certificates
npm run lint:package-boundary
npm pack --dry-run --ignore-scripts --json
```

Canonical retained artifacts:

- `certification/upstream/pi-fabric/{0.76.2,0.77.0}/`, each including `artifacts/host-runtime-evidence.v1.json` and `artifacts/host-integration-runtime.v1.json`
- `certification/containment/linux-x86_64-bwrap-0.12.0/`
- `certification/fingerprint/linux-git-2.55.0/`
- `certification/recovery/phase4/`
- `certification/authorization/local-ed25519/`
- `certification/held-out/linux-x86_64-bwrap-0.12.0/`
- `certification/promotion/phase5/`
- `certification/phase6/web-threat-b9.v1.json`
- `certification/phase6/approval-runtime-b9.v1.json`
- `certification/phase6/licensing-b10.v1.json`
- `certification/phase6/retention-b12.v1.json`
- `certification/phase6/distribution-phase6.v1.json`
- `certification/phase6/browser/`
- `certification/phase7/`; complete immutable threshold, browser, platform, maximize/minimize acceptance, benchmark, soak, independent-review, and signed passing graduation artifacts.

Phase 0-6 generation requires explicit deterministic timestamps. Phase 7 timestamps are captured at execution because the verifier rejects evidence outside the signed seal window. Regeneration is required after any certified input, source tool, adapter, package lock, platform, binary, Phase 7 policy, reviewer, or browser runner changes.

## Production seams

- `src/certification/`: generators, mechanical validators, startup gate loader, and retained evidence contracts.
- `src/git/PackageWorkspaceManager.ts`: no-alternates, no-hardlink, remote-free exact-OID package repositories and independent worktrees.
- `src/git/fingerprint.ts` and `fingerprint-oracle.ts`: primary and separately implemented oracle capture, Ed25519 certificates, chain linkage, and quarantine-on-mismatch.
- `src/git/guarded-adapters.ts`: package-issued before/after fingerprint decorators for workspace, agent, evaluator, report, cleanup, detached merge, winner-ref observation, and winner-ref CAS boundaries.
- `src/containment/`: Linux Bubblewrap adapter, prerequisite checks, fresh user/PID/IPC/UTS/cgroup/network/mount namespaces, empty root, process-group lifecycle, and adversarial matrix.
- `src/evaluation/ConfinedProcessEvaluator.ts`: bounded canonical JSONL parsing, exact identity bindings, deterministic integer aggregation, timeout/cancellation handling, and path-redacted evidence.
- `src/driver/AdmittedDriver.ts`: public-invoker dispatch, explicit admission handshake, schema-enforce rejection, child-handle persistence, and conservative crash-gap classification.
- `src/recovery/`: four-way effect observers, exact-fence coordinator, child-correlation observer, transactional outbox drainer, and the deterministic Phase 4 fault matrix.
- `src/web/`: loopback-only detached server with one-time bootstrap, cookie/CSRF/Host/Origin controls, SSE reconnect/reset, bounded redacted projections, and durable inbox-only command intents.
- `src/component/definitions.ts`: `arbor-runtime` and `arbor-web` component lifecycle definitions using only public pi-fabric exports.
- `src/git/PromotionGitIntegrator.ts`: complete detached baseline/candidate construction and package-owned exact-OID winner-ref CAS.
- `src/authorization/`: trusted owner-UID principals, owner-only Ed25519 key handling, bounded local TTY authorization, one-time signature validation, and an internal Fabric policy-traversal contract. No public approval minting API or caller-owned approval callback exists.
- `src/evaluation/HeldOutIsolationAdapter.ts`: split/capability guard requiring the retained B8 digest before held-out evaluation.
- `src/certification/{authorization,held-out,promotion}.ts`: B7, B8, and Phase 5 retained evidence generation and active-input verification.
- `src/reports/FileReportPublisher.ts`: atomic immutable complete report generations from a strict allowlist projection, with honest final/publication/admission state, nonempty evaluator/effect/policy evidence indexes, digest manifests, and hard file bounds.
- `src/cleanup/ManifestCleanupAdapter.ts`: owner-only, root-identity/digest/mount/symlink/overlap checked cleanup allowlists.
- `src/retention/policy.ts`: explicit per-class/per-outcome deletion eligibility, legal hold behavior, and retained evidence requirements.
- `src/certification/{web,distribution,retention}.ts`: reproducible Phase 6 B9/B11/B12 matrices bound to active source, assets, policy, and npm inventory.
- `src/phase7/`: immutable graduation policy, budget authority, benchmark, recovery soak, platform gate, and complete acceptance harness.
- `src/evaluation/SealedHeldOutEvaluatorService.ts`: evaluator-only Unix socket capability, sealed candidate/input policy, Bubblewrap read-only evaluator, and content-addressed receipts.
- `src/certification/phase7.ts`: fail-closed generation and independent verification of all Phase 7 predicates and artifact bindings.

The browser remains an intent inbox and bounded projection surface. It can request promotion or rollback and display challenge status, but it never receives the nonce/private key, signs a challenge, acquires a driver, or executes Git. Held-out inputs and capabilities are absent from worker requests. Production code cannot select production with booleans or inject an approval callback. It must call `prepareGraduatedProductionProviderV1()`, which verifies all prior gates, B9/B10/B12, the exact Phase 7 graduation certificate, the distribution certificate, the current host, every shipped npm file digest, the actually executing `dist/src/phase7/index.js`, source/artifact/package trees, and package-issued fingerprint decorators. The composition then privately binds the admitted application to the exact B9 approval-runtime certificate and records per-gate B0-B12 evidence. The extension publishes a real provider only after that preparation; otherwise it publishes a blocked provider with the verifier's exact reasons.

## Phase 5 operator runbook

The current retained build admits `productionCertified` only while B1 and every dependent production certificate mechanically verify. Use these controls without weakening the startup gates.

1. **Generate retained evidence:** run `npm run certify:authorization`, `npm run certify:held-out`, `npm run certify:promotion`, `npm run certify:host-integration-runtime`, and `npm run certify:upstream`, then run `npm run verify:certificates`. `loadProductionCertificationStatus()` must report B1/B7/B8/Phase 5 valid, `productionCertified: true`, `realAgentsEnabled: true`, and no blockers.
2. **Create a signing key outside browser/report roots:** create `operator-keys/<principal-id>.ed25519.pk8` as DER PKCS#8 Ed25519, with the directory mode `0700`, file mode `0600`, and the current OS user as owner. For example, `openssl genpkey -algorithm Ed25519 -outform DER -out operator-keys/principal_operator.ed25519.pk8`; derive the configured SPKI base64 public key with `openssl pkey -inform DER -in operator-keys/principal_operator.ed25519.pk8 -pubout -outform DER | base64 -w0`.
3. **Configure trusted principals:** create an owner-only `trusted-principals.json` with `version: 1`, bounded `principals`, `revokedAuthorizationIds`, and `revokedNonceDigests`. Each principal supplies `principalId`, numeric `osUid`, SPKI base64 `publicKey`, `repositoryIds`, `allowedActions` (`promote`, `rollback`), and optional `expiresAt`. Keep this file mode `0600` and its parent mode `0700`. Do not place it or `operator-keys` below any browser, report, or static-serving root.
4. **Configure held-out evaluation:** give only the held-out evaluator its canonical read-only `dataRoot` and optional read-only credential root. Set its declared `dataDigest` to `computeHeldOutInputDigest(dataRoot)` and its `isolationCertificateDigest` to the currently verified B8 certificate digest. Worker containment must receive neither path nor capability.
5. **Request and authorize promotion:** the browser submits only `requestPromotion`. Export `PI_FABRIC_ARBOR_DATABASE`, `PI_FABRIC_ARBOR_STATE_ROOT` (the browser-reachable state/report root), `PI_FABRIC_ARBOR_PRIVATE_GIT_DIR`, `PI_FABRIC_ARBOR_TRUSTED_PRINCIPALS`, `PI_FABRIC_ARBOR_KEY_ROOT`, `PI_FABRIC_ARBOR_HELD_OUT_CERTIFICATE_DIGEST`, and optionally `PI_FABRIC_ARBOR_GIT_OID_LENGTH=64`. The key root must be outside the state root. On the local owner TTY run `pi-fabric-arbor authorize promotion --challenge <opaque-id>`. Verify the bounded run/repository/candidate/merge OID/certificate/ref/predecessor/expiry display and type `yes`. Planning consumes and freezes that local authorization without claiming Fabric approval. Fabric separately applies its write policy to `arbor.applyWinnerRef`; only the package provider's active call identity can create the B9-bound traversal proof immediately before the CAS. Caller-supplied proofs are not command fields.
6. **Verify outcome:** require promotion state `COMMITTED`, run outcome `PROMOTED`, observed winner OID equal to the frozen merge OID, distinct package authorization and Fabric policy-traversal records, and matching pre-observe/CAS/post-observe journals. Every terminal outcome first enters `REPORT_PENDING` with a frozen complete-report generation and publication directive. It becomes its final visible state only after that exact manifest is observed. Any stale or unobservable state is indeterminate/quarantined rather than guessed.
7. **Rollback:** request rollback in the browser, then run `pi-fabric-arbor authorize rollback` with the new challenge and the same local file options. After the actual `arbor.applyRollbackRef` call traverses Fabric write policy, rollback CAS changes only the package winner ref from the promoted OID to the exact journaled predecessor. Verify state `ROLLED_BACK` and the rollback observation. Re-promotion always requires a fresh held-out certificate and a fresh authorization.

Private-key files must never be copied into reports or browser-served storage. Authorization expiry, denial, timeout, revocation, reuse, UID mismatch, or signature mismatch produces no Git mutation.

## Detached Web and reports

Run Arbor Web through its supervised component with an absolute SQLite database path and optional artifact root. The component emits a one-time local URL whose fragment token bootstraps an HttpOnly session and is then removed. All controls append durable inbox intents; an admitted Fabric driver must process them. See [`docs/runbooks/detached-web.md`](docs/runbooks/detached-web.md).

Complete report generations contain `REPORT.md`, the contract and run summary, nonempty evaluator/artifact/effect indexes, promotion and rollback journals, package authorization and Fabric policy receipts, cleanup/retention indexes, evaluation and fingerprint certificate bindings, exact runtime-admission status, and a digest manifest. Terminal transitions create report debt centrally, including cancellation, failure, indeterminate/quarantine, promotion, rollback, re-promotion, and post-cleanup settlement. Destructive cleanup requires a published complete report covering the cleanup intent and all current dependencies, then creates a post-cleanup report debt. See [`docs/data-dictionary.md`](docs/data-dictionary.md) and [`docs/retention-policy.md`](docs/retention-policy.md).

## Package boundary

Production source may import pi-fabric only through the public `pi-fabric` root export. `npm run lint:package-boundary` enforces this rule. Fixture adapters remain explicitly labeled and are not production evidence. Follow [`docs/runbooks/phase6-release.md`](docs/runbooks/phase6-release.md) for Phase 6 ordering and [`docs/runbooks/phase7-graduation.md`](docs/runbooks/phase7-graduation.md) for sealed graduation.

## Documentation map

- [`docs/consumer-installation.md`](docs/consumer-installation.md): consumer install, Pi package activation, discovery, detached Web, and data-preserving uninstall.
- [`docs/administrator-guide.md`](docs/administrator-guide.md): runtime configuration, migration/backup/restore, recovery/quarantine, authorization, rollback/re-promotion, export, retention, cleanup, and troubleshooting.
- [`docs/schema-reference.md`](docs/schema-reference.md): all public contract, event, evaluator, certificate, fingerprint, Web route, SSE, security, and trust-label schemas.
- [`docs/runbooks/detached-web.md`](docs/runbooks/detached-web.md): loopback Web operations and incident response.
- [`docs/compatibility-matrix.md`](docs/compatibility-matrix.md): exact supported pi-fabric scope and evidence tiers.

See `acceptance-ledger.md` for requirement-to-artifact mapping, command results, certificate IDs/digests, and unresolved blockers.
