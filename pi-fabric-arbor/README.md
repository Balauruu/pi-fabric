# pi-fabric-arbor

`pi-fabric-arbor` is an independent, source-loaded Pi add-on for the Arbor v2 replacement described by the repository plan at `docs/Arbor/deep-refactoring-plan.md`.

## Current work: PR12 presentation

Arbor now has owning-Pi launch/intake and current-run selection, candidate-parent diffs, evidence/review controls and a session-owned read-only browser. Pi, CLI and browser read the same transactional research projection. JSON/report/trajectory generation and source apply/undo remain owner-only. [PR12 evidence and acceptance status](docs/pr12-presentation-evidence.md) is authoritative. Local regression, native/browser and both milestone/lifetime audits pass after the approved repairs. Independent scoped and final reconciliation reviews also pass. Publication remains separate. PR13 deletion has not started.

## Prior checkpoint: PR11 presets, scaffolds and runnable packs

**Independently reviewed deterministic local gate PASS:** normal321, targeted14, native packs/permissions8 plus installed bound guard1 and unchanged full PR6/7/8/9/10 gates21/5/42/13/4. PR11 adds source-installed code, agent-improvement and data/recipe packs, closed presets and owner-only write-risk scaffolding. All three source/clean-installed packs have actual owner/coordinator baseline-to-candidate measured-keep evidence. [PR11 exact gates, independent repairs and publication status](docs/pr11-examples-evidence.md) distinguish preparation from validation. PR #3 stays draft; PR12-13 and broader product acceptance remain outstanding. The [PR10 grounding/experience gate](docs/pr10-grounding-evidence.md) remains preserved. [PR9 held-out evidence](docs/pr9-held-out-evidence.md) and [PR8 recovery evidence](docs/pr8-recovery-evidence.md) remain preserved.

- Pi loads `src/extension.ts` directly. No build, `dist/`, or `.test-dist/` is required.
- Registration declares passive managed component metadata. It never starts inference, creates an actor or opens research storage.
- `/arbor setup` configures one managed instance; `/arbor doctor` reports configured policy and observed lifecycle blockers without inference.
- The approved lifetime architecture keeps one passive `arbor` configuration parent with one operational `arbor.owner` and one non-operational sibling `arbor.drain`. The parent does not await child readiness. The owner preserves its original post-activation `context.call`, signal and ten native `ARBOR_OWNER_REFS`.
- In `inspect` mode, an owning-Pi call creates one persistent proposal-only actor, validates bounded proposals, launches native workers, owns their waits and supplies fresh observations to later asks. Actor outbox delivery is passive, not a Main continuation.
- `src/research/` owns a fresh transactional SQLite schema, frozen domain-neutral specification and origins, typed proposals, atomic reservations, controls, evidence-linked observations and real owning-Pi review receipts. `src/managed/` retains native linkage and the verified execution lifecycle.
- Native owner/root/host identity is immutable. Evaluation recovery requires explicit same-owner reconciliation after reload; unknown handles block without redispatch. Quiescent research resume replaces the stopped actor and re-observes saved facts. Known exact native/material recovery and separately charged partial continuation are described below; ambiguous launches still block. Models and tools for coordinator, executor, literature, subject and optional judge are resolved independently.
- Exactly one rewritten public skill, `fabric-arbor`, is registered. New inspect/material/research runs explicitly freeze packaged coordinator/executor roles and conditional procedures outside candidate material. Selected PR10 literature uses the same frozen operational bundle.
- CLI and the session-owned browser are strictly read-only, with no live-owner attachment, effect callbacks or export-generation routes.

PR4 adds packaged command, native agent-suite and finite configured-provider evaluation over **an explicitly supplied pair of committed material references**. It freezes the task/grade definition, explicitly loads subject prompt/skill bytes, charges every invocation and retains native evidence before grading. Native execution, evaluation validity, quality gates, descriptive analysis and incumbent decisions are separate facts.

Default `inspect` execution preserves the PR3 read-only lane. PR4 `evaluate` preserves explicit committed pairs; PR5 `material` preserves owner-selected candidates. Explicit `research` runs autonomous scored proposals through those same material/evaluator operations. PR8 adds explicit owning-Pi source apply/undo and separately charged partial-worker continuation, never automatic source writes. Read-only JSON exports include evaluation summaries; detailed derived records live at `runs/RUN/evaluations/EVALUATION.json`. See [PR4 evidence and precise acceptance scopes](docs/pr4-evaluator-evidence.md).

`/arbor start` submits an exact action through the ordinary owning-Pi model/Fabric path, not an unchecked service call. `/arbor show` reads the shared source projection and opens candidate diff/evidence/native-log selection. Controls, review and export generation use the normal Pi/Fabric action path. Submission is not a durable receipt or completion. [Commands/configuration](docs/consumer-installation.md), [exact action/schema manifest](docs/pr3-action-manifest.json) and [PR3 evidence/limitations](docs/pr3-interface-evidence.md) describe the boundaries.

Schema enforce remains unavailable for this external delegation path. Commands explain the inactive owner without inference. The installed host also exhibits an earlier `Missing: extensions` initialization failure under enforce; that is retained as a limitation, not claimed as a successful exact-reference guard test.

## Approved scoped owner lifetime

The owner retains the existing 21 `arbor.*` product/diagnostic refs and provides discoverable acquisition-only `arbor_lifetime.lease`. Its contract is closed empty-object arguments/null output, risk `agent`, and scoped/ordered effect resource `arbor:owner:lifetime`. The sibling guard requires only that ref and acquires exactly that resource at activation. It has no native effects, actor bootstrap, services, participant registry or transport. The coordinator still requires only `agents.self`, not the lifetime capability. One configured application entry and one public skill remain unchanged.

New mutations require read-only generation-bound guard status and lease ownership, in addition to service monotone draining and post-await checks. Internal cleanup does not depend on that admission gate. Required teardown is admission retirement -> scoped drain with real settlement -> native owner unload/abort -> eventual `arbor` provider `close()` for supporting storage. The lease inverse awaits generation `ResearchService.dispose()`, not storage close. Partial activation fails closed and still requires generation-owned cleanup. Cleanup failure remains explicit. This is not a retire-last Fabric directive.

Use the root `arbor` application for component reload. The tested whole-Pi and application reload scopes are recorded in [PR12 evidence](docs/pr12-presentation-evidence.md); they do not prove owner-only or dependency-driven replacement. The public loader rejects the internal owner as a reload target. Catalog changes remain quiescent maintenance. Exact results and milestone/publication status belong to the evidence and acceptance ledger, not to the architecture contract.

## PR11 presets and runnable examples

Use [the packaged examples guide](examples/README.md) for the exact owning-Pi `/arbor scaffold` request, declared local Node/Git/models and normal `/arbor start` path. The public `examples/manifest.json` inventories all three runnable packs: code deduplication, native-agent instruction improvement and synthetic data/recipe tuning. Code uses three trials/median/1% relative gain with ties never winning; agent tasks use one paired repeat, independent grading and descriptive usage/latency, not three whole-suite repeats. Research grounding is optional and the agent held-out split is explicitly selected.

Preparation enters through owner-only **write-risk `arbor.scaffold`** under normal Fabric permission, never a helper CLI or actor capability. It creates only a new canonical destination, preserves existing paths and records prepared input hashes/model/environment provenance. It launches no inference/install/download/source apply. Returned `start` data selects the same research owner/coordinator/evaluator, not a new orchestrator. The optional upstream command template consumes explicitly prepared local inputs and a pinned declared upstream revision; it is not a shipped/executed upstream benchmark. Preparation remains `unvalidated`; actual baseline/check/measurement records determine validation.

`presetSchema()`, `packManifestSchema()`, `readPackManifest()`, `loadPreset()` and `SCAFFOLD_SCHEMA` are public package exports. Exact action input/output/risk/effect and both data schemas are in [the manifest](docs/pr3-action-manifest.json). CLI/browser cannot scaffold, prepare, init, create or generate exports in any mode. Use `npm run test:pr11`, `npm run test:pr11:e2e` and `npm run audit:pr11`; [the evidence record](docs/pr11-examples-evidence.md) owns exact acceptance and limits.

## PR10 grounding, lessons and trajectories

`/arbor lessons RUN QUERY` calls read-only `arbor.lessons({runId, query, limit})`, with `limit`1-8. Retrieval considers at most128 recent relevant fresh-v2 project records and returns at most16KiB. It retains negative and opposing observations, explains lexical matches and duplicate provenance, and labels every result `hypothesis-to-retest`. Source-run lesson revisions/digests, evaluation/native evidence IDs, material IDs and applicability remain linked. Hypotheses may include returned `lessonRefs`; stale/forged or another-project references reject without grade adoption.

The native coordinator receives bounded relevant lesson selections. Owning-Pi `/arbor export RUN` includes actual coordinator proposals, context digests/references, native activation/request IDs, selected actions and receipt-bound outcomes with exact development evaluation/attempt/material/insight links. It is an analysis artifact, not a training pipeline or transcript mirror. The existing CLI can retrieve that generated artifact without creating exports. Ordinary actor proposals cannot consume held-out/final evidence; direct owner inspection retains those separate records.

Grounding is selected only with `execution: "research"`. It defaults off:

```json
{"grounding":{"mode":"required","catalog":"public","query":"parser cache","maxSources":3,"model":null}}
```

`mode` is `off`, `optional` or `required`; `maxSources` is1-4 and a null model inherits the active Pi model. Configure at most four provider pairs in the owning profile's `arbor.sources.json`, **before definition registration**:

```json
[{"id":"public","search":{"ref":"public.search","descriptorHash":"<64 lowercase hex from tools.catalog>"},"fetch":{"ref":"public.fetch","descriptorHash":"<64 lowercase hex from tools.catalog>"}}]
```

Inspect exact public descriptors first. `src/research/GroundingContracts.ts` exports the closed search/fetch input/output schemas: bounded query/limit to URL/title/snippet results, then exact URL/maxChars to visited URL/title/text. Selected providers must match those schemas, have `read` or `network` risk and `none`/`commutative` effects. No arbitrary provider transport or credentials are added. Calls use only the captured managed component context and its finite optional requirements. Missing or incompatible capability blocks required grounding before baseline evaluation; optional grounding records unavailability and unrelated local research stays available. Minimize and maximize use the same source path. Changing the catalog requires quiescent owning-Pi `/reload` definition registration and a new run; component reload alone never rereads it or widens a saved binding.

The owner reserves one bounded search/fetch batch, saves actual fetched passage artifacts and exact source/run/material/epoch/spec/catalog/request/result identities, then spawns one native Pi literature child with the preserved role, evidence procedure, exact model, `read` only and a closed result contract. It validates each returned verbatim passage against its visited artifact before recording inspected source IDs/native provenance. Discovery snippets and free-form node references remain `uninspectedSourceRefs`, never inspections. Grounded hypotheses use exact returned `groundingRefs`; wrong-run/revision/digest, unvisited IDs and changed artifacts reject. Required hypotheses cannot omit inspected references. Source claims and recalled lessons are hypotheses to retest, not grades or scientific endorsement.

Resume verifies frozen roles and reuses completed grounding without redispatch. Interrupted/reserved batches retain their artifacts and block automatic retry; no guessed handle, fallback research runtime or novelty subsystem exists. Existing CLI/browser read-only boundaries and the single public skill are unchanged. Run `npm run test:pr10` and `npm run test:pr10:e2e`; [exact gate/review/publication status](docs/pr10-grounding-evidence.md) is authoritative, not this feature description.
## PR6 autonomous research and operational roles

Select `execution: "research"`, the material scope/evaluator definition described below, available role models and explicit writable executor tools. `/arbor start` freezes/captures with `arbor.start`, then invokes **execute-risk `arbor.runResearch`** under normal policy. This gate covers command evaluation; actual actor/subject/worker effects traverse the managed owner's exact declared `agents.*` requirements. Captured component calls do not substitute for ordinary risk approvals: start/resume must first pass the ordinary agent-risk and execute-risk actions. Direct `arbor.start` does not begin research effects. `/arbor resume RUN` uses the same execute gate, not an agent-risk control bypass.

One persistent proposal-only actor chooses all operations and hypotheses. The owner validates closed revision/material/evidence/budget bindings and performs dispatch, native waits, freeze, exact evaluation, decisions and evidence-linked lesson storage. Main does not select the next research step. Worker reports use `arbor.worker-result.v1` with an attempt-bound sentinel; reports are not grades. No worker-initiated scored-feedback capability is exposed. Informal diagnostics are not admitted beyond the identity check, and are never imported as scores.

Research uses bounded one- or two-candidate waves with `search.concurrency: 1 | 2` (default 1); exact measurements remain serial. `search.maxActorTurns` bounds each active episode; `stopAfterNoGain` (5), `shiftAfterNoGain` (3), `stopAfterFailures` (2) and optional exact `target` expose transparent policy. No-gain counts valid discarded comparisons, failed checks are separate, and measured keeps reset no-gain. Known failed workers remain unscored; ambiguous execution interrupts without automatic redispatch. Stops also cover attempts, full evaluator capacity, active time and cumulative owned-artifact admission. Active time excludes pauses. Artifact/time enforcement is admission-based: trusted native writers may overshoot between boundaries; no hard disk, descendant, token or monetary containment is claimed. Native usage remains observational; unknown aggregate costs are reported as unavailable.

Native-effect admission is checked again after baseline and immediately before each actor create/ask, worker spawn, evaluator invocation/retry/judge, command check and provider call after awaited descriptor validation. Cumulative research artifacts include owned files and canonical retained SQLite evaluator/log and native-evidence records; derived JSON copies count additionally. Shared DB page/WAL overhead and Fabric runtime storage are excluded. A refused optional export never erases retained evidence from accounting.

Evaluation summaries expose nullable `attemptId` and exact baseline/candidate OIDs. Equal material OIDs do not associate attempts with evaluations; decided facts retain their original exact evidence. Both the owning-Pi keep command and integration require an exact attempt link; historical unlinked records remain readable but cannot authorize a keep. Authorized quiescent reload appends bounded `run.generationHistory` without rewriting historical failed attempts or artifacts. Fresh actor-requested review survives successful quiescent research pause; changed or forged review bindings still reject. Unresolved material/evaluator state cannot be hidden by any actor cleanup outcome.

At a quiescent paused boundary, `/arbor revise-roles RUN` explicitly freezes the current installed package roles as a new attributable revision. Then resume to replace/re-ground the actor. The immutable measurement spec/epoch and prior native invocations are never rewritten. Ordinary package changes without this command retain the old bundle. Missing/incompatible bundles or required phases refuse before research effects. Branching and bounded parallel policy are described below; exact partial continuation and conservative ambiguous-handle refusal are described below.

New `inspect`, `material` and `research` runs save a content-addressed operational bundle under `runs/RUN/roles/`, outside mutable material. `src/managed/RoleBundle.ts` resolves only this installed package's role assets, verifies their version sentinels and identities, and explicitly assembles native `instructions`/`task` fields. Strategy and evidence procedures are included only for their applicable coordinator phases; the selected literature inspector receives the evidence procedure. Candidate skills with the same name/path do not choose optimizer instructions.

Native bindings record bundle/role/request identities, selected procedures, model, tools, requirements and result contract before create/ask/spawn, then attach native IDs without rewriting earlier attribution. Missing or corrupt bootstrap blocks dispatch before reservation. Completed-baseline material resume checks the preserved bundle before evaluator reconciliation, so package updates cannot silently substitute instructions. This is trusted configuration separation, not containment or proof of scientific adherence. No worker gets shared Arbor mutation/delegation capabilities; worker-driven scored feedback is not currently exposed.

The [PR6 evidence](docs/pr6-research-evidence.md) records exact executed gate status, two actual autonomous five-stage journeys, native role/reload checks and remaining limitations. Earlier PR3/PR5 fixtures are regression evidence, not substitutes for those journeys.

## PR7 branching and bounded waves

The actor explicitly chooses each eligible hypothesis and records its selection slot, kind, reason and any absent-kind/direction fallback. Typed topology enforces parent existence, measured-parent refinement, leaf dispatch, ancestor pruning/review, `maxDepth` (3) and `maxChildren` (3). `exploreEvery` (3) reserves every third selection for exploration when eligible; other slots prefer directions with measured keeps. At three valid no-gains a different direction is requested; at five selection stops. Serial decision chronology, not sibling reservation order, controls measured-keep resets. These are transparent heuristics, not scientific-merit or MCTS claims.

Each wave atomically reserves one or two attempts and evaluator credits against a fixed incumbent. Concurrency one reuses a single native slot serially with no intervening actor ask; concurrency two permits independent native overlap. All admitted workers settle before serial collection and measurement (`measurementConcurrency: 1`, the only supported setting). Ranking uses exact direction-aware ratios and stable ID ties. Keep still validates against the latest incumbent; changed combined material requires a fresh exact evaluation. Ancestor lessons append against current revisions so siblings cannot overwrite each other.

Pending review blocks expansion transactionally without rebasing the approval binding. Root hypotheses and their refinements share one exploitation/shift lineage. Preparation/admission failure releases only proven-unlaunched reservations; failed dispatch receipts remain blocked on replay. Freeze refusal does not skip independently attempted restore of proven-settled writers; both errors and retained refs survive.

Pruning changes future selection, not active-worker cancellation. Owning-Pi pause/cancel and midwave budget/convergence checks stop further launches; ambiguous outcomes retain their bindings and workspaces. Existing terminal cleanup, immutable roles, review/execute-policy separation and read-only CLI/browser remain unchanged.

[PR7 exact evidence](docs/pr7-parallel-evidence.md): controlled actual-native two-candidate, one-second workloads, one discarded warmup and three warmed waves per mode. Parallel median **1962 ms** versus serial **3524 ms** (**55.68%**, target <=80%); all measured parallel waves overlap. This measures workspace setup through wave collection, excluding actor/evaluator turns outside that boundary, not end-to-end campaign speed or research quality. Use `npm run test:pr7`, `npm run test:pr7:e2e` and `npm run audit:pr7`. The native script runs files serially to avoid timing interference. Repaired scope passes: targeted **67**, normal **252**, prior native PR2–6 **8/20/21/9/21**, PR7 native **5** (A12, pause/cancel, preparation/protected-write failures). Independent whole-diff review additionally found retained-PR6 projection compatibility; only additive output fields became optional, preserving saved identities. Schema-impacted native PR3/PR6 reruns pass **20/21**; a subsequent shared-ancestor insight-overflow finding now rejects transactionally at the unchanged100 bound, with another native PR6 **21/21**. Final restaged review gates publication. That historical gate does not confer PR8 acceptance; see the separate PR8 evidence below.

## PR9 selected held-out and untouched final validation

Set `evaluator.heldOut` to an absolute or project-relative **validation policy JSON file** when starting `material` or `research`; `null` disables it. Profile/project/explicit precedence and preset null-disabling remain unchanged. The file contains a closed version-1 object:

| Field | Meaning |
| --- | --- |
| `policy` | `selected` automatically checks development-eligible candidates on the adaptive held-out split; `final` defers its sole untouched comparison to explicit owner selection. |
| `maxUses` | 1-100 adaptive candidate comparisons for `selected`; exactly 1 for `final`. |
| `criterion` | `non-regression` permits a paired tie, never a loss; `gain` requires the saved practical gain. Native failures, quality vetoes and descriptive uncertainty still veto both. |
| `heldOut` | A complete `EvaluationDefinition` object, not a filename. |
| `final` | `null`, or a complete separate untouched `EvaluationDefinition` for a `selected` policy. For `final` policy this must be `null`, because `heldOut` is already the untouched split. |

Include `version: 1`. Split task IDs must be disjoint; evaluator kind, subject configuration and initial material references must agree. Tasks, expected answers, judges/checks, repeats/retries and per-split deadlines are frozen into the saved spec/epoch before capture and effects. Selected validation uses a separate captured-baseline record and remeasures **current incumbent versus exact candidate** for every eligible comparison; it never compares against a cached original score. Changed combined material needs new development and held-out evidence.

`/arbor validate RUN ATTEMPT` selects the latest exact eligible development pair at a quiescent owning-Pi boundary, including a paused final-policy run. It composes public execute-risk `arbor.evaluate` with `payload: {attemptId, evaluationId, validation: "final"}`. A selected policy with an additional final split must first pass held-out validation. Final admission verifies the prerequisite development/held-out snapshots and rechecks revision after awaits, before consuming untouched evidence. Final evaluation is never launched by the actor or a repeated threshold loop. Admission checks capacity before touching the final split; its reserved record consumes the one use even if interrupted/invalid. Exact replay does not launch again; recovery is explicit and unknown handles block. Final selection prevents further candidate/evaluation effects. A passing final result still requires `/arbor keep RUN NODE` and any selected genuine review, then separate source-apply permission/dialog.

Projection `validation.label` is `development-only`, `held-out-validated` or `final-validated`, tied to the measured current keep. `heldOutUses` counts adaptive candidate comparisons, not the separate initial baseline record; all baseline invocations still consume budget. `finalUses` is 0 or 1. No selected/evidenced validation means **no transfer claim**, even for a development measured keep. Held-out losers cannot be kept/applied or rescued by review/development scores. Ordinary actor observations/rankings omit held-out task/grade details, including test-linked lessons and decisions. Test-only decisions cannot drive development convergence; complete evidence remains visible to the owner.

Evaluation budgets include baseline, adaptive/final, retry, recheck, judge and required-check reservations. Active time and owned artifact limits are **admission** bounds; in-flight native work can overshoot them. Native usage/cost remains observational. Each split selects its own 10-3600000ms deadline, including long agent suites; short agent deadlines use Arbor's public exact-owned stop, not an assumed shorter Fabric default. Trusted local workers can technically access local files: these are not sealed/secret datasets or confinement guarantees. Repeated held-out use is adaptive reuse, not pristine final generalization.

Use `npm run test:pr9`, `npm run test:pr9:e2e` and `npm run audit:pr9`. PR9 source tests are also selected by normal `npm test` / `npm run check`. CLI and browser stay read-only, including `validate` in every CLI mode. [Exact evidence](docs/pr9-held-out-evidence.md) distinguishes local gates from independent acceptance.

## PR8 owner controls, exact continuation and source apply

Use `/arbor pause RUN`, `/arbor steer RUN instruction`, `/arbor cancel RUN`, `/arbor review RUN DECISION` and `/arbor resume RUN` only in the owning Pi. Auto progresses without research dialogs; Direction gates expansion, Review gates promotion, and Collaborative uses reviewed direction plus explicit continuation. A real dialog records material, epoch, exact revision and intrinsic native owner. Dismissal or the sixty-second timeout never approves. Control submission/queued receipt is not proof of completed cleanup.

Resume reads the saved spec/role bundle, not changed defaults or native private conversation history. It re-observes exact known local native provenance, reconciles settled material and owned-ref intents, and replaces/re-grounds a stopped actor. Unreturned/unknown native handles block without redispatch. Losing the intrinsic owning Pi host is not portable ownership: a reopened different owner can inspect existing artifacts but cannot adopt, review or apply the old run. Unresolved cancellation remains `cleanup_pending`. For a pending material/research choice after same-owner component reload, `/arbor resume RUN` only renews its exact review binding and returns `awaiting_review`: no approval, evaluation or dispatch. Use a fresh `/arbor review RUN DECISION`, then resume to continue. Old-generation dialogs remain invalid.

```text
/arbor continue-partial RUN PRIOR_ATTEMPT Finish the same hypothesis from this exact partial artifact
# Alternative, not an alias:
/arbor restart-parent RUN PRIOR_ATTEMPT Explicitly retry the same hypothesis from its recorded parent
/arbor resume RUN
/arbor apply RUN CURRENT_MEASURED_KEEP_DECISION
# After a postwrite gap: resume nonterminal research first. Never resume a cancelled run.
# Cancelled same-owner runs reconcile the original source intent directly after reload.
/arbor apply RUN ORIGINAL_APPLY_COMMAND_ID
/arbor undo-apply RUN ORIGINAL_APPLY_COMMAND_ID
```

Each continuation creates a **new charged bounded native invocation**, retaining the prior attempt, root lineage, chosen partial/parent OID and explicit summary. It is native agent-risk dispatch, not a command evaluator or a free retry; scoring/research continues through its separate policy route. Neither path reuses an ambiguous invocation or silently changes the hypothesis, spec, epoch, models or budgets. Measured continuations remain eligible as refinement parents; discard addresses the latest continuation without resetting its retained original. Cancellation during collection remains terminal after freeze/restore finishes.

Apply is opt-in, after an exact current measured keep and a separate source dialog under normal Fabric write permission. Review approval is neither source approval nor Fabric permission. A durable journal records the captured-baseline delta and every affected path's pre/postimage before source writes. Apply/undo preserve unrelated edits and original Git index/refs. Undo verifies the prior applied postimage rather than applying a blind inverse. Newer affected bytes/modes, unsafe parents and mixed partial outcomes block without overwriting them; the patch remains in the source journal and owner exports. After same-owner reload/resume for nonterminal research, `apply RUN ORIGINAL_APPLY_COMMAND_ID` uses a fresh source dialog under the same Fabric write policy to adopt only a complete exact postimage set. It cannot replay even an all-preimage set. Adoption/undo remains available if resumed research has since kept a newer incumbent: admission and dialog bind the original recorded measured target, never the newer target. The original immutable intent/approval remains unchanged; a separate bounded adoption receipt binds the fresh command, generation, owner and revision. For cancelled terminal research after same-owner reload, invoke recovery/undo directly: only an original apply intent may be reconciled, without resuming research or changing its terminal state/generation. Fresh source approval and exact postimages are still required; another Pi owner is denied. This is trusted filesystem consistency, not arbitrary-writer locking or containment.

CLI/browser can retrieve existing projection, export and journal files only, including when ownership is lost. No mutating CLI mode, live attachment transport or new public skill was added. See [PR8 exact evidence and nine-gap table](docs/pr8-recovery-evidence.md), `npm run test:pr8`, `npm run test:pr8:e2e` and `npm run audit:pr8`. PR9-PR11 are recorded separately above; PR12-PR13 remain out of scope. PR8 final independent guard and Main entire-staged-diff reviews pass. Exact current gate counts and retained evidence belong to the evidence record and ledger.

## PR5 dirty material and owned incumbent

In the owning Pi, select `execution: "material"`, a frozen evaluator definition, exact `material.mutablePaths` and `material.evaluationInputs` (file/directory prefixes, not globs), and `material.selectedUntracked`. Writable worker tools must be explicitly configured through `roleTools.executor`; `inspect` remains read-only. For capture definitions, use the canonical source root and `oid: "capture"` in both material refs. Start replaces those placeholders with the full captured tree and persists the resolved definition.

```text
/arbor start {"runId":"owned-material","overrides":{"execution":"material","material":{"mutablePaths":["prompt.md"],"evaluationInputs":["checks"],"selectedUntracked":[]},"roleTools":{"executor":["read","write","edit","bash"]},"evaluator":{"kind":"agent-suite","definition":"/absolute/evaluation.json"}}}
```

Start captures and evaluates the baseline (command evaluation still enters through the separate execute-policy action). The owning-Pi `arbor.propose` / `arbor.dispatch` operations admit **one explicit hypothesis-bound native worker**, then wait, freeze its exact material and restore its worktree. `arbor.evaluate` accepts `{attemptId, evaluationId}` and never a caller score. This explicit mode remains separate from the autonomous `research` selection. `/arbor keep RUN NODE` selects matching current-incumbent evidence; review mode requires a real `arbor.review` dialog for a pending choice naming that exact evaluation before keep.

- Original root/OID, owned repository/baseline/candidate and protected evaluation-input identity are distinct. Git sources capture current indexed paths' working bytes without refreshing or writing the original index. A staged deletion left on disk is untracked and excluded unless selected. Ignored selections are refused; non-Git roots use an external owned repository and Git ignore rules without initializing source.
- Modes, symlinks, binary bytes, deletions and NUL-delimited filenames are preserved. Two inventories compare content/stat/index identity to detect concurrent changes. Unresolved merge stages, submodules, sparse/skip-worktree cases, special files, invalid paths and over-bound captures are refused. Capture is limited to 4096 files / 16 MiB; UTF-8 filenames are required.
- Candidate worktrees start detached. Only settled native writers can freeze; worker commits/staging and rejected partial trees remain reachable under owned refs. Restore returns owned worktrees to their exact detached parent. Research never applies to source automatically; explicit PR8 source apply is separate. No automatic artifact cleanup occurs.
- Evaluators read separate whole-tree snapshots, including protected inputs. Added/changed evaluation files invalidate exactness; evaluators that write into their input tree are currently unsupported. Escaping evaluation symlinks and non-UTF-8 link targets are refused; owned capture retains raw link bytes without normalization. Trusted worktrees are not containment, and arbitrary background descendants are not guaranteed stopped.
- A keep requires valid native/check/task evidence for the exact candidate/spec/epoch against the **current incumbent**. BigInt decimal gain must be strictly positive and meet the saved threshold. Relative gain uses incumbent magnitude (`0.01` means 1%); zero denominators are inconclusive and require an absolute policy. Ties never win. Command spread at least as large as observed gain, or mixed paired-task gains/losses, is inconclusive. A separately charged `recheck` may supply fresh evidence; no significance claim is made.
- Changed integration material is re-evaluated through the production evaluator. SQLite records integration intent before Git CAS, then commits the incumbent/decision together. An interrupted keep retains the intent; exact replay adopts an already-present target, retries only the predecessor and refuses another ref value. Replay is proven in the still-current owner after durable intent survives a store reopen. Explicit same-owner PR8 resume can reconcile a known intent after generation replacement without rewriting its original evidence. A different intrinsic native owner or ambiguous handle blocks. Ambiguous launch/cleanup blocks rather than redispatching.
- Export generation is owner-only and embeds `captured baseline -> owned incumbent`, not `source HEAD -> candidate`. Thus the patch excludes the user's pre-existing dirty work. CLI/browser only retrieve existing exports. See [PR5 evidence, exact gates and limitations](docs/pr5-material-evidence.md).

## Exact-material evaluation

In the owning Pi session, select an available exact model and a frozen definition:

```text
/arbor start {"runId":"prompt-pair","overrides":{"execution":"evaluate","evaluator":{"kind":"agent-suite","definition":"/absolute/evaluation.json"}}}
/arbor show prompt-pair
/arbor pause prompt-pair
/arbor resume prompt-pair
```

The [packaged deterministic example](examples/pr4-agent-improvement/README.md) contains baseline/candidate material, fixed tasks and preset data. Its clean-install test prepares disposable Git references before calling the actual product; no mutating preparation CLI is shipped. It is a loading/grading oracle, not a research benchmark. The public package exports `definitionSchema`, `validationSchema`, `providerInputSchema` and `providerOutputSchema`; the [machine manifest](docs/pr3-action-manifest.json) includes these contracts.

- Material is a bounded list of regular committed UTF-8 files at full Git OIDs in the selected canonical root. The exact checked blob is copied even when the selected root is a Git subdirectory; prototype-named files retain exact bytes and persisted selected-file coverage is verified. Committed executable files remain directly runnable (owned mode `0700`, ordinary files `0600`); executable flags are identity-bound and checked for drift before and after use. Dirty-file/mode capture, symlink workflows, non-Git capture and workspace integration remain outside this PR4 seam.
- The subject's `model`, read-only `tools`, and explicit `promptFiles` come from the frozen definition, not ambient skill-name discovery or cwd alone. `roles` and `roleTools` configure operational models/tools separately. Optional judges use their own model/instructions, receive no tools and can veto deterministic grades; they never choose research policy.
- Fixed task IDs, baseline/candidate order, repeats, retries, expected answers, deadlines and analysis are frozen. Retries, rechecks, scored feedback, held-out/final comparisons, judges and required command checks have distinct linked reserved IDs; check native IDs are retained separately from measurement IDs. Native usage is observational, not a hard monetary ceiling.
- Command definitions declare `argv`, required `checks` and `unit`. Output must contain exactly one `ARBOR_METRIC DECIMAL UNIT` line. Nonzero exit, timeout, interruption, wrong/ambiguous output and incomplete/failed checks never score. No checks means limited validation. Trusted commands are not contained; only directly owned processes are stopped.
- `/arbor start` composes command setup and the separate **execute-risk** `arbor.evaluate` action through normal Fabric policy. Direct `arbor.start` for a command definition only freezes configuration; it cannot bypass execute denial. `/arbor resume` likewise selects the execute-risk route for command evaluations. Agent-suite launches retain the native agent permission gate; external evaluators retain their declared execute gate.
- Paired task summaries include failures and an observed delta range. Repeats are grouped within tasks, not counted as independent tasks. This is descriptive evidence, not a confidence interval or statistical superiority. Unsupported analysis methods, contradictory aggregation/repeat policy and unknown quality vetoes block selection. Supported quality vetoes are `no-native-failures` and, for agent suites, `all-tasks-correct` and `preserve-baseline-correct`. The latter independently vetoes losing any baseline-correct paired task, including an apparent aggregate gain.
- Interruption returns `INTERRUPTED`. Explicit resume checks the saved native owner, component, source cwd/OID, epoch, definition, catalog and snapshot/request identities. Known subject and judge native completions are re-observed and ingested idempotently; infrastructure failures are not invalid grades, and completion requires every invocation ingested. Unknown/ambiguous launches are not retried. Native/provider requests use detached immutable expected bindings, with mutation checks across awaits; poisoned execution requires a new measurement rather than resume. When retirement lost the deadline receipt, recovered execution stays invalid rather than guessing it succeeded within the deadline.

Authoritative feedback uses `arbor.evaluate` with the current run binding and `payload: {attemptId: "exact-material", evaluationId: "unique-id", purpose: "feedback"}` (or `recheck`). This evaluates the saved exact pair, never an arbitrary worker-supplied scalar or changed cwd. In PR5 material mode, use the settled attempt ID instead of `exact-material`; each evaluation freezes the current-incumbent/selected-candidate pair. Autonomous selection uses the same accounted owner evaluator. Worker-initiated scored feedback is not exposed; worker reports and diagnostics cannot supply scores.

### Optional evaluator catalog and presets

A closed preset supplies `id`, `materialKind`, `objectiveDefaults`, `evaluator`, `searchDefaults`, and optional `groundingDefaults`/`limitDefaults`/`instructions`/`sourceRefs`. The exported `presetSchema()` is authoritative; new runs retain independent `presetSource` path/content identity even when higher-precedence source references override defaults. Precedence is built-in defaults < preset < profile < project < explicit. An explicit/project `preset: null` disables lower-precedence preset inheritance without reading its file. Presets are data, not operational bootstrap authority or plugins that start research.

The owning Pi profile may contain `arbor.evaluators.json`, a finite array (maximum eight):

```json
[{"ref":"myEvaluator.evaluate","descriptorHash":"64-lowercase-hex-characters"}]
```

Inspect `tools.describe({ref})` against the exported provider schemas/risk/effect contract and obtain the exact hash from `tools.catalog`. Registration reads the configured catalog **before activation** and declares exact optional requirements. Evaluation validates the committed binding and effective descriptor before invocation. Missing/mismatched optional actions block that selection, not built-ins; later discovery cannot widen an already committed view.

Before changing the catalog, inspect every affected run, pause/cancel and settle owned work, then explicitly `/reload` Pi to re-register the derived definition. `components.reload` alone does not reread the catalog file. Provider replacement can retire the shared owner and interrupt both provider and built-in runs. Fresh built-in evaluation reactivates; saved runs require explicit immutable-bound reconciliation. Changed catalog/definition identity blocks old measurements and requires a new measurement/run, never silent rebinding or automatic reload from a run. CLI/browser cannot perform maintenance or resume.

## Requirements and installation

Node.js 24 or newer; declared peer `pi-fabric >=0.83.0 <0.84.0`; declared `tsx@4.23.13` runtime dependency. Tests observed Node 26.7.0, Pi 0.85.1 and Fabric 0.83.0, not a permanent Pi compatibility floor.

After publication, `pi install npm:pi-fabric-arbor@0.1.0`; for reviewed local source:

```sh
pi install /absolute/path/to/pi-fabric-arbor
pi list
pi config
```

Enable Fabric and trust the project explicitly. Inside Pi:

```text
/arbor availability
/arbor setup
/reload
/arbor doctor
/arbor assets
/skill:fabric-arbor
```

Setup only merges the project component entry. It preserves unrelated/global component entries and does not enable agents, mesh, approvals or change Schema policy. See [installation and exact provider use](docs/consumer-installation.md).

## Read-only CLI

```sh
pi-fabric-arbor availability
pi-fabric-arbor assets
pi-fabric-arbor asset coordinatorRole
pi-fabric-arbor inspect --file /path/to/existing-projection.json
pi-fabric-arbor replay --file /path/to/existing-events.jsonl
pi-fabric-arbor artifact --root /path/to/existing/artifacts --path report.md
```

Unknown and mutating CLI verbs fail with exit code 2. Reads do not create exports. Browser assets have no mutation forms, transport or endpoints.

## Development checks

```sh
npm ci --ignore-scripts
npm run check
npm run test:pr2:e2e
npm run test:pr3:e2e
npm run test:pr4:e2e
npm run test:pr5:e2e
npm run test:pr6:e2e
npm run audit:pr6
npm run test:pr1
npm run test:source:retained
npm pack --ignore-scripts --json
```

Normal `npm test` and `npm run check` retain the five package/install cases and 92 source-characterization cases, and include the managed PR2, transactional PR3, PR4 evaluator and PR5 material source tests. Both typechecks are no-emit. The source-loaded fingerprint oracle and legacy source Web characterization remain unchanged.

The separate PR2 host lane loads the production extension through real Pi/Fabric. Native processes, actor asks, worker waits and reload are real; inference is deterministic local fixture code, including a loopback model for extension-free workers. All dependencies resolve from this app's `node_modules`. Disposable profiles strip inherited `PI_*`/`ARBOR_*` values and retain host traces under `.runtime/pr2-host/`, `.runtime/pr3-host/`, `.runtime/pr4-host/` and `.runtime/pr5-host/`. No paid model or dataset download is used.

See [PR2 evidence and limitations](docs/pr2-managed-owner-evidence.md), [PR1 source-install evidence](docs/pr1-source-install-evidence.md) and [PR0 owner-local evidence](docs/pr0-owner-local-evidence.md). The separate `npm run test:pr0:e2e` lane was not rerun for PR2: its source/fixtures remain unchanged, while the new lane exercises production code rather than the probe.

## Legacy boundary

Legacy v1 source and certification artifacts remain only for historical characterization until PR13. They are not package exports, binaries, Pi registrations or package contents. Superseded certificate/admission, containment, authorization, Phase 7 and writable-Web suites are not active gates; their exact disposition remains in the PR1 evidence. No existing user data, reports, keys, databases or certification artifacts are deleted or migrated.
