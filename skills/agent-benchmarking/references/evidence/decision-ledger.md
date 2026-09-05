# Historical decision ledger

> Historical evidence only. The refactored runner intentionally supersedes the version-admission, protection, seal, staged-call-plan, certification, and release policies below. Current behavior is defined by `SKILL.md` and `README.md`.

These decisions recorded the earlier v2-v14 package policy and are retained only to explain the cutover.

1. **One supported runner.** Callers execute the exact `workflows/benchmark.ts` bytes with a schema-valid request. They do not author, patch, wrap, or paste bespoke TypeScript for a benchmark session.
2. **Capability before mutation.** Require Pi >=0.84.4 and Pi Fabric >=0.77.0, pin the exact versions used by each run, and prove request fields, stage selection, call cap, recursion, cwd, output bounds, and native-log access. Missing or contradictory support yields `unsupported` before assignment or grading.
3. **Protected state is a launch gate.** Declare protected roots and mutable-state ownership, capture a baseline, and require an isolation plan. A detected protected mutation yields `blocked`; preserve it as evidence rather than cleaning it away.
4. **Bounded stage plan.** Analyze is preplanned as one explicit zero-call `prepare` transaction, one or more bound `judge` call plans, one or more bound `adjudicate` call plans, and `finalize`. Every call stays below the effective runtime call cap, is independently resumable, and publishes a revision-bound checkpoint.
5. **Transactional stage closure.** A stage commits inputs and assignments first, publishes all required terminals and derivatives create-only, reconciles exact identities, then publishes its checkpoint last. Finalize performs no model calls.
6. **Global budgets.** Reserve measured, nested, judge, adjudicator, support, and retry calls before launch. Include recursive descendants in global accounting even when runtimes enforce only per-manager limits. Observational token/cost guards are not hard limits.
7. **Recursive compatibility.** Recursive attempts omit `cwd`, start from Fabric's supported project root, and receive sealed absolute package/workspace paths. If the installed fixed runner cannot construct and validate that request, the condition is unsupported rather than adapted with custom code.
8. **Total mechanism evidence.** Every terminal has a mechanism projection. Missing, unreadable, oversized, or unowned source evidence maps to an explicit invalid/unknown state, never absence or success.
9. **Versioned telemetry.** Preserve native bytes and source semantics. Derived telemetry names its schema and transformer version, input digests, ownership scope, and unknowns.
10. **Delta revisions.** Never reseal an edited closure. Plan a revision from the prior verified seal plus an explicit added/changed/removed path delta; preserve predecessor seals and the reason confirmatory validity is or is not retained.
11. **Deterministic resume.** Skip valid terminals, run only never-assigned planned IDs, block assigned-without-terminal IDs, and use new linked IDs for model/tool retries. Serialization-only repair requires immutable contemporaneous source bytes.
12. **Typed outcomes.** Route and stage outcomes are only `complete`, `checkpoint`, `blocked`, `unsupported`, `inconclusive`, or `failed`. Attempt outcomes remain schema-owned. Explanations live in structured blockers/limitations, not invented status strings.
13. **External receipts.** Generated validation receipts and raw runtime captures live under `skill-evaluations/agent-benchmarking/`, not in the distributable skill. Fixtures required by tests remain in the package.
