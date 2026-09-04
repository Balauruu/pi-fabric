# Operator data dictionary

All public identifiers are bounded opaque Arbor IDs or Git object IDs. Browser/API projections are redacted before serialization. Complete reports use a strict allowlist projection and reject unexpected file names, raw paths, or recognizable secret values instead of silently redacting them. Raw filesystem paths, credentials, authorization nonces, signatures, signing keys, held-out inputs, and unrestricted logs are not public fields.

| Term | Meaning | Authority |
|---|---|---|
| Run | Immutable contract plus its revisioned, journaled orchestration state. | `RunAggregateV1`, event journal |
| Contract | Objective, repository identity, metric, evaluation split, path and permission policy, budgets, gates, promotion mode, and retention class frozen at run start. | `ArborContractV1` |
| Revision | Optimistic concurrency number. Every command or inbox intent supplies the exact expected revision. | Run store transaction |
| Sequence | Monotonic event journal cursor, distinct from revision. | Event journal |
| Driver lease/fence | Exclusive admitted workflow ownership. A newer fence invalidates old callbacks. Web never acquires one. | Driver record |
| Hypothesis | Bounded rationale/plan node with lineage, lessons, attempts, pin state, and terminal status. | Run aggregate |
| Attempt | One budget-reserved workspace/agent lifecycle. A retry is a new attempt linked by `retryOfAttemptId`; identities are never reused. | Run aggregate |
| Effect | Intent-before-execution record with an exact identity, fence, observation, and at most one accepted durable outcome. | Effect journal |
| Candidate | Exact finalized object identity and changed-path manifest produced by an attempt. | Workspace finalization |
| Evaluation certificate | Canonical integer-decimal trials, aggregation, metric identity, OID, split role, parser, and validity. Worker claims are informational only. | Evaluator |
| Epoch | Contract/repository/evaluator comparison boundary. Cross-epoch ranking is prohibited. | Run aggregate |
| Promotion | Detached construction and winner-ref exact-OID CAS journal. | Package private repository |
| Rollback | Exact inverse winner-ref CAS to the recorded predecessor. It is not history rewriting. | Package private repository |
| Package authorization | One-use local owner-TTY decision and signature bound to one action/challenge. Browser sees only status and digests. | Trusted principal registry and authorization journal |
| Fabric write approval | Package-owned receipt proving the risky provider invocation was allowed and binding its host call/correlation IDs to one exact action, CAS argument digest, operation, candidate, and package authorization. It is obtained internally, never accepted in command input. | Admitted Fabric invocation and promotion journal |
| Gate | Typed confirm, single-choice, multi-choice, or bounded-text question. Only a matching open, unexpired gate accepts an answer. | Run aggregate |
| Web intent | Durable inbox request. Submission is never execution; the admitted Fabric driver separately processes it. | Intent journal |
| Report generation | Immutable complete generation containing markdown plus strict allowlist machine-readable evidence indexes and a digest manifest. Terminal outcomes remain `REPORT_PENDING` until the frozen manifest is observed. | `FileReportPublisher` and central terminal report-debt reducer |
| Resource | Package-owned workspace, containment, report, cleanup, or other bounded resource projection. | Resource/effect records |
| Cleanup manifest | Owner-only root-identity and digest-bound allowlist of deletable relative entries. | `CleanupManifestV1` |
| Retention class | Versioned per-outcome minimum duration, legal-hold behavior, deletion rule, and retained evidence set. | `src/retention/policy.ts` |
| Runtime admission | Opaque, identity-bound authority issued only by production composition after all B0-B12, release, exact Phase 7, distribution, executing npm `dist`, source/artifact/host tree, configuration, B9 policy-runtime, and adapter-identity bindings verify. | Graduated production composition |
| Fabric policy traversal proof | Journaled proof that the actual winner-ref apply invocation crossed the B9-certified Fabric write-policy boundary. Fixture proofs are labeled `explicit-test-fixture` and never claim production approval. | `FabricPolicyTraversalProofV1` |
| Certification gate | Mechanically verified evidence bound to exact source, package, binary, platform, or runtime inputs. No inferred declaration closes a gate. | Retained certificates |

## Summary states

Run state describes current lifecycle. Outcome describes settled disposition. A newly settled outcome enters `REPORT_PENDING`; the final run state is restored only after observation of the exact complete-generation manifest. Cleanup planning also freezes and publishes its intent/dependencies before deletion, and completed cleanup creates a new post-cleanup report debt. `INDETERMINATE` and `QUARANTINED` are evidence-preserving fail-closed outcomes, not generic failures.
