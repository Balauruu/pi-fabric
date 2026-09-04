---
name: agent-benchmarking
description: Design, execute, audit, or analyze controlled benchmarks of agents, prompts, skills, models, tools, and workflows with sealed conditions, certified graders, resumable Fabric-native execution, exact telemetry, and task-paired inference.
compatibility: Verified for Pi 0.84.4 and Pi Fabric 0.77.0. Requires a runtime-capability receipt proving the effective 100-or-lower call ceiling, staged runner bindings, and recursive requests with custom cwd omitted. Other versions or missing capabilities return unsupported before mutation.
---

# Agent Benchmarking

Use this skill when evidence may change which agent, prompt, skill, model, tool, or workflow is adopted. A demonstration, a few successes, or a leaderboard point estimate is not a controlled benchmark.

## Route first

Choose one route and read every listed owner before acting.

| Route | Use when | Owners |
| --- | --- | --- |
| Design | Freeze a protocol before scored output | [Protocol design](references/protocol-design.md), [conditions and mechanisms](references/conditions-and-mechanisms.md), [grading](references/grading.md), [statistical analysis](references/statistical-analysis.md) |
| Execute | Run or resume sealed scored waves | [Execution lifecycle](references/execution-lifecycle.md), [telemetry](references/telemetry.md), [architecture](references/architecture.md), [validation](references/validation.md) |
| Audit | Inspect a packet read-only | [Audit and reporting](references/audit-and-reporting.md), [validation](references/validation.md), then implicated owners |
| Analyze | Run a preplanned bounded post-raw stage | [Grading](references/grading.md), [telemetry](references/telemetry.md), [statistical analysis](references/statistical-analysis.md), [audit and reporting](references/audit-and-reporting.md), [architecture](references/architecture.md) |

The redesign basis is the [v2-v14 failure-to-fix ledger](references/evidence/session-failure-to-fix.md), [runtime evidence](references/evidence/external-research.md), [durable decisions](references/evidence/decision-ledger.md), and [archive receipt](references/evidence/migration-cleanup.md).

## Use only the fixed runner

Execute the exact bytes of [the bundled runner](workflows/benchmark.ts) in `fabric_exec` and supply one schema-valid [workflow request](schemas/workflow-request.schema.json) through `strings.request`. Never author, patch, wrap, or paste bespoke TypeScript to adapt a session. A missing runner feature is `unsupported`, not permission to create another workflow.

Before any mutation, prove the installed runtime matches the compatibility declaration and can support the requested route. Record the effective agent-call cap, output/log bounds, recursion and cwd behavior, stage selection, native-log access, and global budget plan. Use the lower of requested, configured, and observed call ceilings, with reserved failure/finalization headroom. The historical effective ceiling was 100 calls per invocation.

For recursive measured parents, omit the `cwd` field so Fabric starts from its supported project root, then provide sealed absolute condition-package and workspace paths. If the fixed runner cannot express and canary that request, stop `unsupported`. Never use a custom recursive cwd or custom runner.

## Preplanned stages

Design and Audit are bounded invocations. Execute advances sealed waves. Analyze is not one all-or-nothing invocation: freeze this stage plan before grading:

1. `prepare` - verify design/execution/raw seals, reconcile attempts, freeze the revision-scoped staging inputs, and commit the blind map; this dedicated invocation adds zero model calls.
2. `judge` batch N - run only the call-plan's named, never-terminal judge IDs within the reserved call budget; checkpoint last.
3. `adjudicate` batch N - run only the call-plan's predeclared disagreements with new IDs; null/missing terminals are incomplete, never successful.
4. `finalize` - verify all stage checkpoints and revision-qualified seals, aggregate, analyze, reconcile, and report; zero model calls.

Every stage has frozen input digests, exact planned IDs, call reservations including descendants, create-only outputs, and a checkpoint published only after exact reconciliation. Resume skips valid terminals, blocks assigned-without-terminal IDs, and runs only never-assigned planned IDs. Each Fabric invocation runs exactly one bounded preplanned stage. If the installed fixed runner/schema cannot select and bound `prepare`, `judge`, `adjudicate`, or `finalize`, stop `unsupported` before grading rather than forking workflow source.

## Launch gates and typed outcomes

Run gates in this order:

1. **Capability** - exact versions and requested runner behavior are canaried. Failure: `unsupported`.
2. **Protected state** - declare protected roots, capture the baseline, and prove task-relevant workspace/home/config/cache/browser/account/tool-service isolation. Existing mismatch or no safe isolation: `blocked`.
3. **Design** - freeze population, estimand, practical thresholds, vetoes, revisions, randomization, graders, stage IDs, and global call/token/cost budgets.
4. **Condition and mechanism** - prove exact-path loading and total mechanism evidence for actor and non-actor terminals.
5. **Scheduler and supervisor** - prove concurrency, cap reservation, startup/terminal accounting, interruption, and false-complete refusal.
6. **Seal** - verify owned closure and explicit revision delta before assignment.

Public route/stage statuses are only `complete`, `checkpoint`, `blocked`, `unsupported`, `inconclusive`, or `failed`. Put reasons in structured blockers and limitations. Do not invent qualified pass strings or infer completion from counts.

## Required lifecycle

Frame; inventory; freeze design; build and certify graders; preflight conditions; verify mechanisms; test scheduler/supervisor; seal execution; execute waves; freeze raw outputs; prepare the first judge transaction; run blind `judge` batches; run `adjudicate` batches; `finalize`; report; cleanup owned temporary state.

Never assign scored work until all earlier launch gates pass. Preserve every assignment, failure, retry, child, native result/log, protected-state delta, and unknown. Mechanism evidence must be total: missing or unreadable evidence is an explicit invalid/unknown projection bound to the terminal. Archive large absolute Fabric logs outside bounded result channels with validated source paths and create-only copies.

Telemetry derivatives identify schema/transformer versions, source digests, and direct/inclusive/unknown ownership. Global accounting includes measured parents, recursive descendants, judges, adjudicators, support calls, retries, canaries, and local work. Never double count parent/child usage or call observational guards hard limits.

A revision is prior verified seal plus an explicit added/changed/removed path delta. Never overwrite or nest an old seal as the new closure. Finalize deterministically from sealed inputs and performs no model calls.

## Completion gate

Report success only when seals and revision deltas verify; planned IDs reconcile one-to-one; graders pass all fixture classes; capability, mechanism, scheduler, supervisor, resume, and protected-state canaries pass; telemetry ownership and budgets reconcile globally; paired inference matches the frozen assignment; and cleanup changes only owned temporary state. Otherwise return the typed non-success state, residual limitation, and smallest resolving evaluation.

Generated receipts never live in this skill. Follow [validation](references/validation.md) and write each run to a new revisioned directory under `skill-evaluations/agent-benchmarking/`.

## Asset index

Every distributable support file is linked directly here. Catalog links replace directory links.

**Schemas:** [adjudication assignment](schemas/adjudication-assignment.schema.json), [adjudication plan](schemas/adjudication-plan.schema.json), [adjudication terminal](schemas/adjudication-terminal.schema.json), [attempt](schemas/attempt.schema.json), [budget ledger](schemas/budget-ledger.schema.json), [call plan](schemas/call-plan.schema.json), [condition](schemas/condition.schema.json), [mechanism projection](schemas/mechanism.schema.json), [grader](schemas/grader.schema.json), [protected state](schemas/protected-state.schema.json), [result](schemas/result.schema.json), [runtime capability](schemas/runtime-capability.schema.json), [schedule row](schemas/schedule-row.schema.json), [seal](schemas/seal.schema.json), [task](schemas/task.schema.json), [telemetry](schemas/telemetry.schema.json), [workflow request](schemas/workflow-request.schema.json).

**Workflows, helpers, and tests:** [prebuilt fixed benchmark bundle](workflows/benchmark.ts), [benchmark source template](workflows/benchmark.source.ts), [artifact store module](workflows/artifact_store.ts), [bundle builder](scripts/build_benchmark_bundle.py), [deep-runner failpoint probe](scripts/probe_deep_runner.mjs), [fixed production runtime-canary harness](workflows/runtime_canaries.ts), [runtime-canary receipt generator](scripts/generate_canary_receipts.py), [P2.17 replay packet builder](scripts/build_p217_replay.py), [P2.17 native guest replay](scripts/run_p217_replay.mjs), [installed guest typecheck](scripts/typecheck_fabric_guest.mjs), [deep stage mechanics](scripts/deep_stage.py), [aggregate telemetry](scripts/aggregate_telemetry.py), [paired analysis](scripts/analyze_paired.py), [strict primitives](scripts/benchmark_lib.py), [final integrity](scripts/final_integrity.py), [blind map](scripts/generate_blind_map.py), [schedule](scripts/generate_schedule.py), [lifecycle reconciliation](scripts/reconcile_lifecycle.py), [runtime canaries](scripts/run_canaries.py), [contract validation](scripts/validate_contracts.py), [workflow validation](scripts/validate_workflow.mjs), [seal verification](scripts/verify_seal.py), [write once](scripts/write_once.py), [core regression suite](tests/test_helpers.py), [test-only fake canary adapter](tests/fake_canary_adapter.py), [adjudication tests](tests/test_adjudication.py), [deep-runtime tests](tests/test_deep_runtime.py), [delta-seal tests](tests/test_delta_seals.py).

**Fixture catalogs and baselines:** [fixture catalog](validation/fixtures/fixture-catalog.json), [synthetic canary catalog](validation/fixtures/canary/synthetic-catalog.json), [development fixture note](validation/fixtures/canary/development/README.txt), [project baseline](validation/fixtures/baselines/project-status.txt), [protected packet baseline](validation/fixtures/baselines/protected-packet.json).

**Boundary and contract fixtures:** [schedule boundaries](validation/fixtures/boundary/schedule-boundaries.json), [single-task analysis](validation/fixtures/boundary/single-task-paired-analysis.json), [grader leakage](validation/fixtures/isolated-defect/grader-condition-leakage.json), [stale seal](validation/fixtures/isolated-defect/stale-seal.json), [unknown analysis option](validation/fixtures/known-bad/analysis-unknown-option.json), [unequal cells](validation/fixtures/known-bad/unequal-cells.json), [extra request property](validation/fixtures/known-bad/workflow-request-extra-property.json), [confirmatory analysis](validation/fixtures/known-good/confirmatory-paired-analysis.json), [paired analysis](validation/fixtures/known-good/paired-analysis.json), [valid request](validation/fixtures/known-good/workflow-request.json).

**Malformed fixtures:** [blank JSONL line](validation/fixtures/malformed/blank-line.jsonl), [CRLF JSONL](validation/fixtures/malformed/crlf.jsonl), [duplicate JSON key](validation/fixtures/malformed/duplicate-key.json), [invalid JSON](validation/fixtures/malformed/invalid.json), [invalid UTF-8](validation/fixtures/malformed/invalid-utf8.json).

**Runtime request fixtures:** [attempt lifecycle](validation/fixtures/canary/attempt-lifecycle.request.json), [blind-map isolation](validation/fixtures/canary/blind-map-isolation.request.json), [condition loading](validation/fixtures/canary/condition-loading.request.json), [false-complete refusal](validation/fixtures/canary/false-complete-refusal.request.json), [fresh parent sessions](validation/fixtures/canary/fresh-parent-sessions.request.json), [interrupted resume](validation/fixtures/canary/interrupted-wave-resume.request.json), [nested mechanism](validation/fixtures/canary/mechanism-nested.request.json), [primary-source grading](validation/fixtures/canary/primary-source-grading.request.json), [randomized schedule](validation/fixtures/canary/randomized-schedule.request.json), [runtime model identity](validation/fixtures/canary/runtime-model-identity.request.json), [supervisor prelaunch failure](validation/fixtures/canary/supervisor-prelaunch-failure.request.json), [token/cost attribution](validation/fixtures/canary/token-cost-attribution.request.json), [audit dry-run request](validation/fixtures/canary/workflow-request.json).
