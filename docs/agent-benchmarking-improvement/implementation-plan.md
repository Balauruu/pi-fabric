# Ordered implementation plan

Plan only. Findings and target contracts are in [findings](findings.md) and [architecture](architecture.md). S/F/R prefixes have the same meaning. Every package preserves user changes and historical evidence. No package authorizes paid validation by itself.

## Releases and dependencies

```text
WP0 regression baseline
 -> WP1 fail-closed correctness/capabilities
 -> WP2 task/grading contract + simple design/preview
 -> WP3 role progress + readable measurements                 [R1]
 -> WP4 supported Fabric workflow/allowance seam
 -> WP5 independent native concurrency + recovery              [R2]
 -> WP6 evidence producers + evaluator choices/calibration
 -> WP7 pairwise/batched grading
 -> WP8 native keyed/rate/descendant scheduling as selected
 -> WP9 operational statistical stopping and method validation [R3]
```

WP3 may start after WP1 while WP2 settles its schema. WP4 can be developed independently after WP0, but WP5 depends on WP1-WP4. WP6 can follow R1 without waiting for throughput. WP7 depends on WP2/WP5/WP6. WP8 depends on WP4-WP5; WP9 can be developed independently after WP2 but requires WP5/WP6 integration to release. Do not postpone R1 behind optional model methods or speculative runtime features.

### Cross-package release invariants

- One native agent path and one experiment admission/persistence policy shared by production and fakes. No second launcher or scientific estimator hidden in tests.
- Full native return before grade projection; immutable assignment/result/grade IDs; failure-inclusive denominators; ambiguity blocks replay.
- Reports remain stdlib-only and read-only, including failed/incomplete/old runs; new summaries never modify old directories.
- A represented option is not supported until its public run path has a behavioral test. Known scientific failures remain red with original criteria/seeds.
- New semantics are versioned. Old runs are not migrated or reinterpreted. New run directories are the rollback/migration boundary.

## WP0. Freeze review regressions and preservation baseline

**Objective:** turn findings into red-capable local fixtures before changing behavior. Dependencies: none.

**Likely files:** `S/tests/test_run.py`, `test_grading.py`, `test_measurement.py`, `test_task_state.py`, `test_fixed_guest.mjs`, `tests/fixtures/refactor/` and `tests/fixtures/grading/`; new `tests/test_reporting.py` and contract fixtures as needed. Documentation: `S/references/validation.md` and README evidence index.

**Schema/API:** none. Do not add transient certification fields to ordinary specs.

**Steps:**
1. Preserve current git status and user changes. Use synthetic minimized fixtures for recent mismatch/missing context, not copied historical answers as new scored tasks.
2. Add exact-JSON boolean/number and ignored-keyword failures, command/final-state preflight failures, zero guard behavior, role counts, missing task context and duplicate rubric mismatch.
3. Add deferred fake native completions showing fast-sibling persistence, same-owner in-flight versus orphaned assignment, budget mismatch and interruption at each persistence frontier.
4. Keep existing randomization oracles, failure retention and model-validation failures. Do not delete independent statistical tests while consolidating lifecycle fakes.

**Acceptance/tests:** reproduce review findings deterministically; prior 29 focused checks still pass or fail only at intentionally changed assertions. Each new test must demonstrate a meaningful failure on old code and not merely assert new symbol names. Fake native work must not access credentials or invoke models.

**Failure/recovery:** crashes are injected with deferred promises/controlled hooks, not timing sleeps. Fixtures retain failures; interruption must not dispatch a duplicate. Probe-generated temporary files cleaned independently of run evidence.

**Compatibility/rollback:** no production changes in this package. Revert only newly added faulty tests, never historical artifacts or unrelated modifications. Risk: overfitting to one run; include positive controls and domain-neutral tasks.

## WP1. Fail-closed grading and truthful selected capabilities

**Objective:** prevent false objective grades and spending on unwired methods. Dependencies: WP0. Findings: F10-F12, F14-F15.

**Files:** `S/scripts/grade.py`, `benchmark_lib.py`, `lifecycle_store.py`, `run.py`; `S/schemas/spec.schema.json`; owning tests from WP0. Keep helpers internal except a shared JSON-semantic equality/schema-validation function used across authoring/grading.

**Schema/API changes:** clarify current guard/time meanings; future semantics get a versioned enforcement descriptor (`unsupported`, `report-only`, `observed-stop`, `native-enforced`, with scope). Until outcome-check support exists, command/final-state return unsupported before assignment. Distinguish retrospective sequential analysis from operational stop; reject unsupported online selection. Do not silently alias modes.

**Steps:**
1. Replace Python raw equality in exact-json (and state comparisons where relevant) with JSON type-aware recursive equality. Decide and document JSON numeric equality (1 versus 1.0) separately from booleans.
2. Check every embedded deterministic schema against the supported subset before dispatch. Reuse/check the existing schema checker without requiring a full Draft validator in report. Unsupported keywords fail, never disappear.
3. Validate all task-key/criterion coverage, label maps, selected methods and deterministic evidence producers before run mutation. Add family-wide finite-look alpha validation shared with analysis.
4. Reject command/final-state without runner evidence contract and hard descendant/rate requests without native support. Expose capability reason and stage, not a fabricated universal ready status.
5. Choose new-version observed-stop semantics for token/cost guards. Compute from saved native results after settlement and before admission; null disables, zero stops. Unknown usage/unit follows explicit policy. Keep v1 semantics visibly report-only rather than retroactively changing a resumed run.
6. Separate invocation admission duration from experiment deadline. Persist experiment deadline/origin once; never reset it on resume. Native in-flight hard timeout remains a separate capability.

**Acceptance/tests:** false positives now fail; zero stop limits cause zero new dispatch; after one job crosses an observed threshold no second is admitted; unknown currency cannot be advertised as USD. Unsupported producers/transforms/online stops fail with zero calls and no scored assignment. Positive exact-text/JSON runs still complete with zero judges.

**Failure/recovery:** threshold hit gives explicit partial/blocked policy status with retained failures and remaining grading capacity. Missing native usage cannot become zero. Stop does not cancel/replay an already assigned call. Disk failure while publishing evidence remains blocked.

**Docs:** README truthful method matrix; grading reference supported subset; telemetry and lifecycle explain observational versus hard limits and old wall-time meaning. Move transient evidence status behind links, not into SKILL.md.

**Compatibility/rollback:** retain v1 reader; new behavior only through versioned resolved design where semantics differ. Safety refusal fixes apply to new admissions, not mutation of completed runs. Risk: stricter validation rejects previously accepted specs; show actionable errors/new-experiment path. Rollback disables newly supported modes, never restores silently ignored constraints.

## WP2. Shared task/output contract and simple authoring preview

**Objective:** deliver the same public requirements to every measured condition and judge while keeping keys private; reduce schema labor. Dependencies: WP1. Findings: F02, F04-F08, F16.

**Files:** `S/schemas/spec.schema.json`; new `schemas/draft.schema.json`; new `scripts/task_contracts.py` (assembly/validation owner) and `scripts/design.py` (draft resolution, if substantial); `scripts/lifecycle_store.py` materialization/prepare_assignment; `scripts/grade.py` projection/prompt; `scripts/run.py` design/preview CLI; `tests/test_run.py`, `test_grading.py`, new `test_task_contracts.py`; small examples under `tests/fixtures/refactor/` or an explicitly documented examples directory.

**Schema/API:** v2 task contract: public question/requirements/output structure/scope/input references; private keys/reference evidence with disclosure class; criterion IDs and links; shared restrictions plus condition deltas; distinct examples versus calibration metadata. One rubric owner. Draft schema expands to strict resolved v2, not a second execution spec. Keep final assembled measured/judge inputs as immutable records with contract/version references.

**Steps:**
1. Define public/private projection allowlists and one assembler; include original question/outcome context in every judge request.
2. Validate criterion-to-requirement links, all task keys and evidence availability. Reject private presentation requirements or conflicting rubric authorities. Add explicit semantic-review warnings for issues no deterministic check can establish.
3. Assemble shared restrictions identically. Show intervention delta and prompt-only versus enforced authority. Record restricted workflow scope, such as no delegation.
4. Add dry preview of actual measured task strings and judge templates with representative output placeholders. Actual scored judge prompts are saved later from the same assembler.
5. Add deterministic minimal design defaults: one repeat, fixed sample, estimate-only, no retries/models/adjudication, explicit weights and grading choice. Never choose consequential scientific policy from observed outputs.
6. Add evidence descriptors so research-specific guidance can supply frozen passages without making the core a web-research framework. Preserve private keys from measured prompt leakage.

**Acceptance/tests:** fixture with rubric-only quotation requirement cannot silently run; valid public quotation requirement appears byte-equivalently in both conditions and judge context. Private answer key is absent from measured requests and present only where authorized for grading. No-tools judge receives actual question, not a reconstructed one from answer text. Duplicate criterion/missing key/invalid evidence paths fail before dispatch. Simple deterministic benchmark resolves/previews without calibration files, environment manifests or model backends.

**Failure/recovery:** preview never creates assignments. Changing public contract after initialization requires a new experiment. Partial input copying cannot be treated as complete freeze. Missing reference evidence yields unsupported/unverified selection per explicit policy, not fabricated grading facts.

**Docs:** SKILL.md short design/preview gate; protocol-design owns authoring concepts; grading owns private/public evidence; conditions-and-mechanisms owns restrictions/exposure. README owns commands/examples. Avoid another duplicated manual.

**Compatibility/rollback:** read v1 with known undelivered outcomeDefinition semantics; no auto-conversion of old prompts. New contract is v2 only. Risk: IDs create false confidence in semantic consistency; require author acknowledgement of consequential warnings. Rollback keeps v1 read-only path and disables v2 execution, not rewrites records.

## WP3. Role progress and deterministic readable measurements

**Objective:** useful partial/final reports with honest telemetry and zero model cost. Dependencies: WP1; integrate WP2 contract when available. Findings: F03, F10, F12-F13.

**Files:** new `S/scripts/reporting.py`; `scripts/lifecycle_store.py` Inspection/public_result/finalize/inspect_report; `scripts/aggregate_telemetry.py`; `scripts/run.py`; `schemas/result.schema.json`; new `references/reading-measurements.md`; `tests/test_reporting.py`, `test_measurement.py`, `test_run.py`, `test_legacy_report.py`.

**Schema/API:** result v2 adds role progress, label coverage, budget/enforcement summary, summary report path and measurement availability. Preserve legacy attempt counts as explicitly named view. Native-derived durations carry basis/unit, not a generic unlabeled elapsed value. Summary renderer version is report metadata, not a software-attestation gate.

**Steps:**
1. Reconstruct work by role from assignments/results/plans; derive label coverage separately. Native running/queued is available only with native owner evidence; historical orphan status remains ambiguous.
2. Map documented native numeric timestamps to native run duration; retain disagreement/invalid ordering. Add experiment elapsed/active/makespan values only from saved records with known clock semantics. Do not invent historical timing from mtimes.
3. Project reasoning/total tokens only from native fields with scope. Keep observed zero, unavailable, partial and conflicting distinct. Separate currency-known and currency-unknown costs; preserve direct/inclusive ownership.
4. Render concise summary tables and explanatory text from authoritative analysis/telemetry, with task paired effects, intervals, practical margins, reliability, material regressions, failures and limitations.
5. Split measured, retry, judge, adjudicator, verification/calibration and local overhead. Explain native outer tool calls versus any nested counts.
6. Finalization creates summary.md for new runs. Read-only report summary renders in memory, including partial/old records, with no backend loading or repair. report.md becomes an index or uses the same renderer, not a second narrative.

**Acceptance/tests:** golden minimal report understandable without JSON; 12 measured + 12 judge fixture shows two roles and one evaluator identity. Observed cache-write zero differs visibly from unknown latency/cost unit. Out-of-order times and partial native usage are not summed blindly. Failed fits/unsupported analyses show non-success and available descriptive evidence. Full historical bytes/entries/mtime snapshots unchanged; test without NumPy/PyMC availability. Repeated same-input rendering deterministic.

**Failure/recovery:** missing analysis yields partial summary, not new inference; absent summary in old run is rendered, not backfilled. Interrupted finalization publishes no false report commit. Report corruption is reported, not repaired. Unknown cost is never silently priced locally.

**Docs:** new reading-measurements guide is the human definitions owner; telemetry reference keeps technical mapping/ownership; audit-and-reporting keeps immutable read semantics; SKILL.md links both where appropriate.

**Compatibility/rollback:** v1 report/JSON bytes never changed. New output formatter can be disabled independently; machine records remain authoritative. Risk: rounding changes conclusions visually; state scale/precision and use unrounded saved values for decisions. Rollback removes only new exports/renderer selection, not evidence.

## WP4. Fabric-owned registered workflow and effective allowance

**Objective:** avoid model-authored runner code without a second runtime. Dependencies: WP0; required by WP5. Findings: F01, F09, F17. **Upstream Fabric work**, not a patched dependency in this profile.

**Installed evidence/likely upstream owners:** `F/dist/fabric-exec-tool.d.ts`, `fabric-exec-arguments.d.ts`, `execution-service.d.ts`, `dist/protocol.d.ts`, `dist/runtime/guest-types.d.ts`, `dist/providers/agents-provider.d.ts`; likely upstream `src/fabric-exec-tool.ts`, `src/fabric-exec-arguments.ts`, `src/execution-service.ts`, `src/protocol.ts`, `src/runtime/guest-types.ts`, `src/providers/agents-provider.ts` and focused runtime tests. Resolve real upstream ownership before editing; these source paths are inferred from distribution layout. Update `F/docs/agents.md`, configuration/providers docs and fabric-workflow skill when released. Skill adapter: `S/workflows/benchmark.ts`, `S/SKILL.md`, README and native-contract tests.

**Public changes, proposed not existing:** trusted workflow registration with ID/fixed source/payload schema; top-level fabric_exec workflow selection mutually exclusive with code; immutable effective dedicated-invocation allowance and native concurrency scope. No arbitrary guest import/eval hook or nested execution service.

**Steps:**
1. Write contract tests for public registration/load/trust, duplicate ID refusal, input validation and full-source typecheck through the existing executor.
2. Ensure workflow resolution occurs before assignment and preserves normal approvals, caller cancellation/deadline, audit ownership and hard agent budget. All native calls still use agents.run/spawn/wait.
3. Expose actual clamped allowance in the existing workflow context, not defaults. Document dedicated invocation requirement; reject unknown/shared allowance for initial integration.
4. Register the skill's fixed program once through supported package/extension registration, with no per-run component ceremony. Keep exact-source compatibility fallback.
5. Use existing native lifecycle/results. A managed-provider alternative is acceptable only if tests prove caller budget, cancellation and deadline forwarding; context.call alone is insufficient evidence.

**Acceptance/tests:** runtime-local fake backend verifies configured cap below/at requested, effective remaining allowance zero/one/many (without treating agentBudget:0 as a valid current tool argument), unrelated prior calls rejected by dedicated contract, cancellation and nested permissions preserved, unknown workflow fails before work. Static public schema/type declarations and registration discoverability confirmed. No private imports/process spawning/model client in skill integration. A new native live smoke is a later separately authorized test, not run by this plan.

**Failure/recovery:** unknown capability returns unsupported. Loading or typecheck failure must create no assignments. Runtime rejection proven pre-dispatch can be represented distinctly; ambiguous execution cannot be inferred safe. Cancellation must not leave an invisible background supervisor.

**Compatibility/rollback:** additive registered variant; existing code execution remains. Feature flag off restores one-call skill path for new invocations. No runtime version gate; check selected public capability. Risk: new entry accidentally bypasses guard/audit or starts nested invocation budgets; parity tests are blocking release gates.

## WP5. Independent concurrency, immediate persistence and conservative resume

**Objective:** bounded work-conserving native execution for independent tasks/conditions and judges. Dependencies: WP1-WP4. Findings: F01, F10, F17.

**Files:** `S/workflows/benchmark.ts`; `scripts/run.py` bridge; `scripts/lifecycle_store.py` admission, record inspection/ownership and grading progression; `schemas/result.schema.json`; new versioned work/ownership schema if not kept in spec/result definitions; `tests/test_fixed_guest.mjs`, `test_run.py`, `test_task_state.py` and native-contract tests from WP4.

**Schema/API:** separate role concurrency from direct totals; saved contention/overlap policy; invocation-owner/native-handle association; result-saved versus evaluated state; role reservations. Internal admit/settle transport remains private, not caller-authored wave plans. One policy reducer serves fake and native paths.

**Steps:**
1. Refactor duplicated Python execute_run/native bridge policy to one admission/state reducer. Fake dispatch tests cross this seam; Python threads are not production dispatch.
2. Read effective dedicated allowance, cap work before assignment, reserve all experiment role calls atomically under one writer.
3. Use lazy Fabric parallel thunks with bounded queue pages. Each native result is persisted independently before its slot is reusable; catch siblings separately. Do not wait for an entire wave to publish.
4. Permit active siblings known to this live invocation while keeping foreign/orphan assignments ambiguous. Save exact handles when using spawn/wait; do not infer liveness from helper PID.
5. Keep model grading after measurements by default. Plan the full judge roster deterministically and dispatch judges under role/native limits. Optional overlap remains disabled until dependency-stable planning and contention tests pass.
6. Update progress through existing workflow.item/event and compact returned records. Independent experiments use different directories; rely on the shared native owner semaphore, not a skill-wide lock.
7. On graceful checkpoint stop admission, settle/persist active work, release writer. On cancellation let native runtime stop owned work; retain uncertainty across unpersisted crash windows.

**Acceptance/tests:** at requested 3/native 2 peak is exactly 2 with enough independent work, never 3; total 5 budget permits five calls even with concurrency 2, not two or unlimited. Slow A/fast B permits C start and B persistence before A settles. Failed B does not erase A/C. Same-run second writer blocked; different runs under one native owner share its ceiling. Stateful tasks remain serial and schedule unchanged. Resume never redispatches assignment without result; saved native result repairs terminal locally. Duplicate settle events are idempotent or explicit conflicts.

**Failure/recovery:** inject crash before assignment, after assignment/before native call, after native start/before handle save, after native result/before persistence, and after persistence/before grade. Only proven unassigned/no-dispatch work is launchable; unknowns block. Lost handle/expired native retention blocks. Cannot promise exactly-once external execution.

**Docs:** lifecycle state table/budget semantics, telemetry role states, SKILL.md small run/resume command, README effective versus requested capacity. No instructions to calculate waves, delete locks or author wrappers.

**Compatibility/rollback:** new run format only; v1 remains on its original path or read-only. Feature-disable concurrency for new runs without changing already frozen designs. An active v2 parallel run must checkpoint/block rather than silently resume under a different interference policy. Risks: races, admission charging twice, fast-sibling evidence loss; no release on build/typecheck alone.

## WP6. Real outcome evidence and evaluator calibration choices

**Objective:** complete objective grading and distinguish examples, calibration and verification. Dependencies: WP2-WP3; WP5 preferred for throughput. Findings: F02, F06-F08, F11.

**Files:** `S/scripts/grade.py`, `lifecycle_store.py` task-command/outcome evidence, `task_contracts.py`, `aggregate_telemetry.py`, `schemas/spec.schema.json`; tests `test_grading.py`, `test_task_state.py`, `test_run.py`; `references/grading.md`, conditions-and-mechanisms, protocol-design and research-specific subsection/example.

**Schema/API:** evaluator configurations keyed by identity with runner/model/settings/tools/rubric binding; examples-only versus measured calibration; frozen case references/thresholds; second-evaluator sample law; verification and calibration roles; post-attempt outcome-check contract with command/state observation source/time/resource policy.

**Steps:**
1. Execute trusted local post-attempt checks outside native agent claims; retain commands, exit/timeout, bounded logs and actual observed state in create-only evidence records. Readiness and outcome checks stay separate.
2. Freeze per-evaluator configuration and actual assembled requests. No-tools configuration must be natively enforceable where required, not only instruction text.
3. Implement measured calibration jobs with same runtime path and budget. Compare predictions with held-out references; retain abstentions/malformed/failed cases. Report criterion/class coverage and uncertainty, not just example count.
4. Implement seeded condition-balanced second-evaluator sampling or declared disagreement/adjudication with finite maxima. Preserve original labels and selection indicators.
5. Add frozen research evidence or separate verifier work as selected. Verification evidence is not synonymous with grading score; temporal/source accessibility limits remain explicit.
6. Record delivery/supplied-content/observed-load/compliance evidence separately from existing logs. No new attestation observer; missing trace cannot become proof of no exposure.

**Acceptance/tests:** command grader ignores native booleans and consumes runner check results; final-state discrepancies fail; retries get independent state. Calibration constants/boundaries/malformed/abstention fixtures detect bad evaluators. Example-only mode claims no measured calibration. Second evaluator sample invariant under condition renaming/output order, with paired equal treatment. Judge sees task/evidence but not identity. Verification missingness does not become factual failure without declared mapping.

**Failure/recovery:** failed outcome check is retained evaluator/infrastructure failure as defined, not an agent success. Interrupted check has explicit ambiguity if effectful and cannot auto-rerun. Calibration gate fails before scored work, without favorable retry. Unknown reference availability yields abstention/unverified. Verification retries have unique linked IDs and budget.

**Compatibility/rollback:** optional for new runs; example-only simple screens remain cheap. Changed rubric/reference/calibration configuration requires new experiment. Disable new producers if unsafe, restoring preflight unsupported rather than agent self-report. Risk: calibration leakage or domain-specific core bloat; keep contracts generic and examples domain-scoped.

## WP7. Pairwise and batched grading end to end

**Objective:** optional grading efficiency without changing estimands silently. Dependencies: WP2, WP5-WP6. Finding: F02.

**Files:** `S/scripts/grade.py` planner/projector/parser/resolver; `lifecycle_store.py` job dependencies and exact reconciliation; `analysis_engine.py`, `analyze_paired.py` and `statistical_core.py` only for new declared preference analysis; schemas spec/result/work records; tests grading/run/randomization/analysis/reporting.

**Schema/API:** explicit pointwise/pairwise topology and output type; matching contrast/task/repetition/output IDs; private position maps; batch IDs and exact item set; prespecified packing/overflow rule; per-item labels and failure states. Pairwise outcomes have a distinct metric/estimand, never coerced into existing absolute grade.score without a declared conversion.

**Steps:** freeze pair roster from saved assignment/matching policy; resolve both output references; randomize presentation independent of content; save maps privately. Add bounded context-compatible batch packing with frozen seed/order and size ceilings. Parse exact item/criterion coverage, retaining valid sibling labels. Integrate resolutions into dataset at task/pair level and expose batch/evaluator dependence to uncertainty/sensitivity. Compare pointwise batch versus unbatched behavior on held-out local canned evaluator fixtures and separately authorized calibration later.

**Acceptance/tests:** two conditions × six tasks yields six paired jobs with both native outputs correctly mapped; swapped labels/order/identical outputs handled; wrong/missing/duplicate batch IDs fail appropriately. One malformed item does not erase valid siblings; whole unparsable response stays one failed native call. Counts distinguish 3 calls/12 judgments/criterion labels for batch size four. Budget formula matches exact frozen plan. Pairwise report explicitly changes outcome interpretation and retains task as inferential unit.

**Failure/recovery:** missing counterpart never pairs across another task/repetition. Freeze incomplete-output policy and coverage denominator. Interrupted batch is not replayed. Retry uses new ID; no double labels/call charging. Adjudication cannot fill missing ordinary labels.

**Docs:** grading modes/formulas; statistics owner for preference target and dependence; measurement guide labels/calls/identities. Compatibility: opt-in v2+; no historical regrading. Rollback disables topology for new designs; existing evidence stays inspectable. Risk: batching changes behavior and correlated error; keep optional until calibration, not default just because it is cheaper.

## WP8. Native resource/rate/descendant constraints and optional overlap

**Objective:** extend throughput to selected conflicting/shared workloads without duplicating runtime. Dependencies: WP4-WP5. Findings: F01, F12, F16-F17. **Fabric integration/upstream work where capability is absent.**

**Files:** skill spec task resource declarations, workflow adapter and lifecycle dependencies; runtime likely existing combinator/agents-provider/agent-manager queue owners represented under `F/dist/runtime/`, `dist/providers/agents-provider.d.ts`, `dist/agents/`; locate upstream source before editing. Docs Fabric agents/configuration and skill lifecycle. Tests native queue/fake transport, skill state/run/assignment oracles.

**Schema/API:** native optional resource keys/capacities or ready-work constraints, scoped provider-rate policy and lineage hard-call allowance only if implemented upstream. Distinguish per-host/process/project/provider scope. Skill spec declares needs, not fabricated enforcement. Overlap policy has separate role limits and measurement interference statement.

**Steps:** first evaluate existing public native scheduling capability. If missing, extend the current native queue to skip unavailable resource keys fairly while preserving required order, with cancellation releasing slots and failed siblings retained. Add native provider-rate/descendant reservation only for selected hard needs, reusing current dispatch/budget stores. No skill-side rate sleeps, process polling or tree supervisor. Test isolation for worktrees/accounts/databases explicitly. Enable judge overlap only once dependency-stable job IDs/plans and contention policy are proven; current global blind-map/whole-plan machinery cannot be frozen on a growing arbitrary prefix.

**Acceptance/tests:** exclusive resource never overlaps within/across experiments under advertised scope; unrelated ready key progresses while one key blocked; cancellation releases only owned resource; requested total concurrency ceiling still holds. Rate counts requests over intervals, not active jobs. Recursive grandchildren consume native tree allowance race-free if hard cap claimed. Separate owners without shared enforcement return unsupported for requested global constraint. Assignment support and look frontiers unchanged.

**Failure/recovery:** failed resource preparation invalidates its work, not silently opens capacity. Owner loss uses native lifecycle recovery; unresolved effects remain ambiguous. Partial rate/descendant telemetry cannot be hard enforcement. Docs explicitly list unsupported scopes.

**Compatibility/rollback:** optional new designs; no defaults requiring shared services. Revert native feature flag to serial/unsupported new admissions, never reinterpret an active experiment's contention policy. Risk: cross-owner distributed admission scope is materially larger than stateless R2; keep outside smallest release.

## WP9. Operational stopping and scientific acceptance closure

**Objective:** align runtime stopping with selected statistical laws and make known limitations truthful. Dependencies: WP2; integrate WP5-WP6 for operational release. Findings: F10, F15 and existing README red gates.

**Files:** `S/scripts/lifecycle_store.py`, `run.py`, `analysis_engine.py`, `generate_schedule.py`, `statistical_core.py`, `analysis_models.py` only for independently justified fixes; schemas; `tests/test_analysis_simulation.py`, `test_randomization.py`, `test_analysis_core.py`, `test_model_target.py`, existing calibration studies; README/reference ledgers.

**Schema/API:** saved complete-cluster look records, admission frontier, stop reason and planned-stop dispositions; operational versus retrospective mode; native in-flight overshoot policy. No redefinition of population/quantile/transformed targets or estimator substitutions hidden behind existing names.

**Steps:** use shared design validation before dispatch. At a prespecified complete-cluster frontier, finish required grading and run the selected valid per-look analysis before releasing the next frontier. Record look/decision immutably. Reconcile planned-but-unneeded rows separately from failures; full planned-terminal reconciliation must account for legitimate stopped disposition, not fake completion. Preserve globally coupled assignment laws and multiplicity across looks/hypotheses. Retain unavailable simulation/model combinations as explicit unsupported. Review existing Bernoulli/crossed-Gaussian failed gates independently; do not relax seeds/tolerances after observing outcomes.

**Acceptance/tests:** forced early boundary stops native admission before future frontier; fast incomplete tasks never trigger a look. Failed/missing grading follows declared policy. No look reruns with altered data/settings. Exhaustive small-law and full-policy deterministic/small simulation checks match chosen stopping mechanism. Known model failures remain visible until separately authorized scientific validation establishes correction; good fit diagnostics alone never close coverage gates.

**Failure/recovery:** interrupted analysis recovers saved immutable input/results locally; ambiguous model/verification dispatch never replays. A budget stop remains operational partial, not statistical success. Failed model fit retains paired descriptive evidence and non-success.

**Docs:** statistical-analysis owns valid laws/estimands; lifecycle owns dispatch frontiers; README links durable acceptance evidence without claiming all methods validated. Compatibility: offline historical policy analyses stay historical; new operational mode/version only. Risk: optional stopping/selection invalidates inference; default fixed-sample remains until this package passes. Rollback disables operational stopping for new designs, not relabels interrupted runs.

## Final handoff / completion criteria

Release R1 after task context, objective correctness, role progress and read-only summary tests pass. Release R2 only after a supported public Fabric allowance/entry exists and native fake-transport tests prove ceilings, fast-sibling persistence and cancellation/recovery. Live paid smoke, evaluator calibration and expensive model studies require separate authorization; absence of those checks must remain stated. R3 features are individually gated, never a blanket capability claim.

Do not implement by editing installed dist chunks. Work in the authoritative Fabric source package, publish/reinstall through the existing profile package mechanism, then verify effective public contracts. The skill owns experiment policy and records; Fabric owns execution. If that seam cannot be made public safely, retain the conservative runner rather than conceal a workaround.
