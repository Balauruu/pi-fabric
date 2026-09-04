# Public schema reference

All public structures are version 1 canonical JSON. Object schemas are closed (`additionalProperties: false`), identifiers match `^[a-z][a-z0-9_]{2,63}$`, SHA-256 values are 64 lowercase hex characters, timestamps are UTC millisecond ISO strings, and integers are nonnegative safe integers unless a narrower bound is stated. Unknown fields, missing required fields, unsafe numeric values, and over-count/over-size values fail closed.

Machine-readable domain/action schemas are exported by `pi-fabric-arbor/schemas` through `createArborSchemaCatalogV1(40|64)`. Web response schemas and route contracts are exported by `pi-fabric-arbor/web` as `WEB_API_ENVELOPE_SCHEMAS_V1`, `WEB_SSE_EVENT_SCHEMAS_V1`, and `WEB_ROUTES_V1`. TypeScript interfaces are exported from the package root and subpath exports. This document is a human index; the exported versioned schema is authoritative for validation.

## `ArborContractV1`

| Field | Closed content and bounds |
|---|---|
| `version` | Constant `1`. |
| `objective` | 1-2000 characters. |
| `repository` | `repositoryId`; exact 40- or 64-hex `initialOid`; `dirtyPolicy` is `reject` or `committedOnly`. |
| `metric` | Bounded `name`/`unit`; direction `maximize|minimize`; decimal quantum from `1` through `0.000000001`; canonical `minimumImprovement`; 1-99 trials; `single|median`; canonical nondeterminism tolerance. |
| `evaluation` | Development and held-out evaluator IDs, parser version, and constant `invalidTrialPolicy: failEvaluation`. |
| `paths` | At most 128 each of relative editable/protected globs and required output paths. Absolute, drive, URI, traversal, backslash, NUL, empty-component, and unsupported glob forms are rejected. |
| `permissions` | At most 64 unique tool IDs, three booleans for network/package installation/process execution, and at most 16 unique credential aliases. |
| `budgets` | Hypothesis/attempt/cycle limits up to 10,000; concurrency up to 64; retry up to 32; wall time up to 604,800,000 ms; agent/evaluator calls up to 100,000; optional safe-integer tokens and canonical cost. `finalizationReserve` cannot exceed totals. |
| `gates` | `beforeDispatch: always|policy`, `beforePromotion: always`, `timeout: pause|reject`. |
| `promotion` | Constant `mode: packageWinnerRef`. |
| `retentionClass` | Administrator-admitted ID. |

Canonical decimals prohibit exponent notation, NaN/infinity, negative zero, noncanonical trailing zeros, and values outside the catalog grammar. Ranking converts quantized strings directly to integer arithmetic, never JavaScript `number`.

## Events and command receipts

`PublicDomainEventV1` contains exactly `version`, `runId`, nonnegative `sequence`, nonnegative `revision`, bounded `type`, and `at`. It deliberately omits the private aggregate. `EventPageV1` contains `version`, `runId`, `afterSequence`, at most 200 public events, `nextSequence`, and `hasMore`.

`CommandReceiptV1` contains `version`, `commandId`, `runId`, `revision`, `sequence`, `duplicate`, 1-64 bounded event types, and an optional closed `ArborDirectiveV1`. Directive variants are: `evaluateBaseline`, `coordinateHypothesis`, `selectHypothesis`, `reserveAgentDispatch`, `materializeWorkspace`, `dispatchAgent`, `finalizeCandidate`, `evaluateCandidate`, `buildPromotionCandidate`, `evaluateHeldOutCandidate`, `finalizeRun`, `processIntent`, `planReport`, `publishReport`, and `done`. Every variant accepts only its named identity bindings.

`IntentReceiptV1` contains `version`, `intentId`, `runId`, `state` (`PENDING|CLAIMED|APPLIED|REJECTED_STALE|REJECTED`), and `revision`. Receipt state confirms inbox persistence, not effect execution.

## Evaluator schemas

### `EvaluatorRecordV1`

The evaluator emits exactly one JSON line, at most 1 MiB, containing: `version`, `runId`, `evaluationId`, `contractDigest`, `epochDigest`, exact Git `oid`, `evaluatorId`, `parserVersion`, `split` (`development|heldOut`), metric, unit, canonical decimal `value`, safe-integer seed, positive trial ordinal, `outputDigest`, at most 512 `{artifactId,digest}` entries, at most 128 `{path,digest}` required outputs, `containmentId`, and `environmentDigest`. Every identity must equal the expected request. Malformed output invalidates evaluation without fallback.

### `EvaluationCertificateV1`

Required fields are `version`, certificate/evaluation/run IDs, epoch/contract digests, role (`developmentBaseline|heldOutBaseline|developmentCandidate|heldOutCandidate`), OID, evaluator/parser/metric/unit/quantum identity, 1-99 raw trials and quantized integer-unit strings, aggregate/spread units, validity, output digest, and trust (`fixture|certified`). Optional closed evidence includes rejection reason, full evaluation policy, base/candidate/merge OIDs, required/protected-output digests, containment and held-out certificate digests, strict-protocol flag, evaluator/config/environment identity, split/seeds/order/timestamps, bounded exit/log/artifact/output/protected-manifest evidence, containment identities, exact-binding digest, descendant termination, and limitations.

A worker claim is not an evaluation certificate. UI/report trust must label fixture values and invalid certificates and must not rank across epoch digests.

## Fingerprint schemas

`RepositoryFingerprintManifestV1` contains the schema digest; complete source worktree identity; exact HEAD/index/status/stages/tracked/untracked observations; refs, reflogs and stash outputs; packed-refs metadata; common-directory identity/inventory; worktree registration; sibling worktrees; and fingerprint tool digest. File records include relative path, type, mode/executable, decimal-string stat identity, optional digest/symlink target, device/inode/owner/link count, and nanosecond times. Command outputs are bounded bytes represented by name, byte count, SHA-256, and base64.

`RepositoryFingerprintCertificateV1` contains exactly the boundary/effect/command/correlation/fence/revision/containment bindings, source and package repository identity digests, before/after timestamps, schema/tool/oracle digests, before/after manifest digests, comparison digest, `expectedPredicate: exactEquality`, equality result and mismatches, report generation, previous-certificate chain digest, signer/public key, payload digest, signature, and certificate digest. Production requires package-issued before/after certificates at every consequential external boundary. A mismatch quarantines immediately.

## Certificate and evidence families

Each retained family is a closed, bounded, content-addressed record and has an independent verifier. IDs, source/tool/package/platform inputs, observations, limitations, verdict, and final digest/signature are mandatory as defined by its exported interface.

| Public family | Principal schema and distinguishing fields |
|---|---|
| Upstream B0 | `UpstreamCertificationV1`: exact package identity, provenance, payload/file inventory, exports/interfaces/commands/licenses/evidence and certification digest. |
| Fabric B1 | `FabricCompatibilityCertificateV1` plus host runtime evidence: exact package/host/source/test/tool digests and tiered compatibility checks. |
| Containment B5 | `ContainmentCertificateV1`: named OS/kernel/architecture/Bubblewrap/tool policy, direct adversarial matrix, validity and signed digest. |
| Fingerprint B6 | `FingerprintTrialCertificationV1` and `RepositoryFingerprintCertificateV1`: 100 trial/oracle results and boundary certificate chains. |
| Recovery Phase 4 | `Phase4RecoveryCertificateV1`: exactly 19 named boundaries, at least 380 injections, projection equality, no duplicate accepted effects, source/B6 bindings and limitations. |
| Authorization B7 | `AuthorizationCertificationV1`: platform/UID, source/lock/key-protocol digests, signed direct tests, validity and limitations. |
| Held-out B8 | `HeldOutIsolationCertificateV1`: exact policy/input/platform/tool bindings and direct worker-denial/evaluator-access tests. |
| Promotion Phase 5 | `Phase5PromotionCertificateV1`: B7/B8/Git/source bindings, same-policy evidence, exact-CAS crash observations, rollback/re-promotion matrix and digest. |
| Web B9 | `WebThreatCertificateV1`: Web source and release asset digests, route-contract digest, direct security observations, limitations and certificate digest. |
| Fabric approval B9 | `ApprovalRuntimeCertificateV1`: exact installed Fabric/runtime/harness source and five approval-mode observations. |
| Licensing B10 | `LicensingCertificateV1`: exact certified pi-fabric root (`0.76.2` or `0.77.0`), lock/upstream digests, command, every package/license/notice review, obligations, notice digest and unresolved set. |
| Distribution B11 | `DistributionCertificateV1`: every non-self packed `{path,size,mode,digest}`, build-source and tool digests, tarball/unpacked inventory digests, exact bin/export/asset/license/notice inventories, deterministic self exclusions, leak observations and verdict. |
| Retention B12 | `RetentionCertificationV1`: policy/source digests, every class/outcome boundary and legal-hold observation, validation errors and verdict. |
| Phase 7 thresholds | Signed create-only threshold seal: validity window, benchmark/reliability/resource/accessibility/usability/security/license minima, signer and seal digest. |
| Phase 7 acceptance | `Phase7AcceptanceCertificateV1`: direction, 35 closed step-discriminated receipts including the Step 9 interruption-readiness digest, duration/evidence/fingerprint chain and certificate digest. |
| Supported platform | `SupportedPlatformCertificateV1`: exact platform/runtime/tool/resource capability observations and digest. |
| Phase 7 graduation | `Phase7GraduationCertificateV1`: threshold/artifact/source/package/host/review cross-bindings, all predicate results, unresolved predicates, signer/signature and final verdict. |

Certificate validity never transfers to changed inputs. Fixture, `direct-representation`, `contract-harness`, and `direct-runtime` evidence labels are not interchangeable.

## Web request schemas

`bootstrap.v1` is exactly `{version:1, token}` with a 32-256 URL-safe token. `webIntent.v1` is one closed variant: pause/resume, answer gate, pin/prune hypothesis, retry attempt, cancel, request promotion, request rollback, request report, or request cleanup. Every variant has `expectedRevision`; only its defined target/reason/answer fields are accepted. Reasons are at most 4000 characters, bounded text answers at most 2000, and multi-choice answers at most 32 unique IDs.

Artifact/diff reads use only opaque `art_` plus 60 hex IDs and require run/effect capability bindings. Offset is nonnegative and page limit is 1-65,536 bytes.

## Web route response schemas

All success values are redacted and validated at `DetachedMonitorServer` immediately before canonical serialization. The boundary rejects unknown fields, counts, sizes, a response kind belonging to another route, and malformed authority output. Errors use `error.v1` with exactly `version`, bounded uppercase `error`, and a 1-512 character safe `message`.

| Route | Success schema | Maximum response |
|---|---|---:|
| `GET /api/v1/session` | `session.v1` | 65,536 bytes |
| `GET /api/v1/runs` | `runList.v1`, at most 200 closed summaries | 1,048,576 bytes |
| `GET /api/v1/runs/:runId` | `overview.v1` | 1,048,576 bytes |
| `GET .../tree` | `tree.v1` | 1,048,576 bytes |
| `GET .../attempts` | `attempts.v1` | 1,048,576 bytes |
| `GET .../attempts/:attemptId` | `attemptDetail.v1` | 1,048,576 bytes |
| `GET .../comparisons` | `comparisons.v1` | 1,048,576 bytes |
| `GET .../metrics` | `metrics.v1` | 1,048,576 bytes |
| `GET .../events` | `eventBatch.v1` (`events` or `reset`) | 1,048,576 bytes |
| `GET .../resources` | `resources.v1` | 1,048,576 bytes |
| `GET .../promotions` | `promotions.v1` | 1,048,576 bytes |
| `GET .../report` | `report.v1` | 1,048,576 bytes |
| `GET .../contract` | `contract.v1` | 1,048,576 bytes |
| `GET /api/v1/artifacts/:artifactId` | `artifactPage.v1` with `kind: artifact` | 69,632 bytes |
| `GET /api/v1/diffs/:artifactId` | `diffPage.v1` with `kind: diff` | 69,632 bytes |
| `GET /api/v1/stream` | `sseStream.v1` event set | 1,179,648 bytes per event boundary |
| `POST /api/v1/session/bootstrap` | `session.v1` | 65,536 bytes |
| `DELETE /api/v1/session` | `sessionRevocation.v1` | 65,536 bytes |
| `POST .../intents` | `intentReceipt.v1` | 65,536 bytes |

The view schemas each close their route-specific `data` object. Overview contains summary/baseline/best/budget/epoch/gate/report/cleanup/retention state; tree contains bounded lineage; attempts and detail separate claims from canonical evidence; comparisons/metrics bind epochs and integer units; resources contains bounded workspaces/refs/effects/reconciliation/children/evaluators/budgets/gates/approval status/cleanup/confinement/held-out/fingerprint state; promotion exposes redacted status but no nonce/signature/key; report contains publication/retention/cleanup debt; contract is the immutable public contract.

## SSE bodies

The only event names and closed bodies are:

- `arbor-event`: `{version,event,projection}` where event is `PublicDomainEventV1` and projection is `overview.v1`.
- `reset`: `{version,kind:"reset",runId,floor,cursor,reason,projection}`; reason is `compacted|gap|cursorAhead`.
- `caught-up`: `{version,runId,cursor,projection}`.
- `stream-limit`: `{version,runId,cursor,reconnect:true}`.
- `arbor-error`: `{version,runId,cursor,error,message,reconnect:false}`.

The server validates the first event before sending SSE headers. A malformed later authority result produces a validated `arbor-error` event and closes the stream. Browser state is never authoritative.

## Security and trust labels

- `fixture-or-uncertified` / `fixture`: deterministic development evidence only.
- `certificate-bound` / `certified`: every displayed item in scope has a valid matching certificate; this does not by itself mean all production gates pass.
- `production-blocked`: composition lacks one or more exact gates; external work remains unavailable.
- `production-certified`: an opaque package-issued admission matches every active B0-B12, Phase 7, distribution, configuration, host and adapter binding.
- `No active Fabric driver`: detached Web can read and append intents only.
- `PENDING`: durable intent receipt, never a statement that an action executed.
- `INDETERMINATE` / `QUARANTINED`: preserve evidence and prohibit guessing, replay, ref movement, or cleanup.

Web and report output never include raw host paths, SQLite locations, secret values, credential aliases, evaluator environments, unredacted prompts, internal handles, leases/fences, signing keys, signatures, or authorization nonces.
