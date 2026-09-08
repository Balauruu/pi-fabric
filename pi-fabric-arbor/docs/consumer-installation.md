# Source-only installation and availability

Pi packages execute with the user's OS authority. Review source before installation. The package requires Node 24+, peer `pi-fabric >=0.83.0` and runtime `tsx@4.23.13`. Tests use app-local locked dependencies. No build/prepack, certificates or profile-local helper skills are needed.

## Install and configure

```sh
pi install /absolute/path/to/pi-fabric-arbor
# After publication: pi install npm:pi-fabric-arbor@0.1.0
pi list
pi config
```

Enable both package extensions in a trusted Pi project. Registration is passive: no actor, inference or database.

```text
/arbor setup
/reload
/arbor doctor
```

Setup atomically merges one enabled `{id:"arbor", component:"arbor"}` entry into `.pi/fabric.json`, preserving unrelated/inherited entries and rejecting conflicts. The approved architecture keeps this single passive configuration parent with one operational `arbor.owner` and one non-operational sibling `arbor.drain`. Do not configure either internal child separately. The parent does not await child readiness. The default state directory is `<active-Pi-profile>/arbor/<project-path-hash>/v2/`, outside material. It does not alter agents, mesh, trust, approvals or Schema policy.

Doctor distinguishes installed, configured, enabled, observed and tested capabilities. An active component does not prove enabled inference: disabled Fabric agents retain descriptors. An unavailable owner causes research commands to report diagnostics without submitting inference. Schema enforce is unsupported for this delegation path; the installed host's additional `Missing: extensions` startup failure is recorded in [PR3 evidence](pr13-cutover-evidence.md). Arbor does not downgrade policy or patch Fabric.

## Owning-Pi commands

```text
/arbor
/arbor start
/arbor show
/arbor browser
/arbor pause
/arbor steer Inspect the constraints first
/arbor resume
/arbor revise-roles
/arbor cancel
/arbor review
/arbor export
/arbor export report
/arbor export trajectory
/arbor keep
/arbor discard
/arbor apply
/arbor undo-apply
/arbor continue-partial
/arbor restart-parent
/arbor lessons exact evaluation
```

The selector is session-local and scoped to the configured state directory. A unique live owned run is the default. Ambiguous runs require selection, never creation-order targeting. Explicit run/target IDs and JSON start requests remain supported for automation, not required for ordinary use. `--run RUN` resolves an exact run directly, including runs outside the bounded picker. Export format words are formats. A steering instruction or lesson query that collides with a run ID requires `--run RUN` rather than silently selecting that run. Unknown explicit runs never fall back. Keep/discard select the latest settled attempt at each hypothesis and pin the UI revision. Changed facts require a fresh selection. Continuation asks for an explicit same-hypothesis summary.

A command submits an exact allowlisted action request through Pi's normal model/Fabric tool path. The command request itself uses ordinary Fabric policy. That does not prove approval on later captured component calls. The request can be queued behind an unrelated current Pi turn. Owning-Pi research start/resume selects `background:true` on existing execute-risk `arbor.runResearch`. Initial work consumes the fresh agent-admitted start. Resume first records an owner-bound intent through ordinary agent-risk `arbor.control`, then claims it once through ordinary execute-risk `arbor.runResearch`. The intent receipt explicitly means execution has not started. Direct execute calls cannot skip this phase or reuse a stale/consumed intent. After admission the existing managed owner retains and tracks the work, so Main is free for normal policy-checked controls. The returned projection contains only saved facts, not a fabricated durable queue receipt or completed research result. Programmatic calls without that option retain blocking behavior. The pre-guard owner retirement path aborted retained public promises before real settlement, losing the authoritative held-spawn handle and leaving an explicit cleanup-pending reservation. The approved guard instead retires admission and awaits scoped drain before native owner unload/abort. A rejected public wrapper still does not prove native settlement. Failed evidence persistence remains an explicit cleanup failure. Paused/old-generation failures now leave a bounded attributable refusal. Source/installed agent deny/ask after actual reload now prevents both command-composed and unadmitted direct resume. This is bounded operation admission, not fresh native-risk checks or immediate policy revocation during admitted work. The journal-read repair checkpoint and held-spawn reload validation status are recorded in [the PR12 gate](pr13-cutover-evidence.md). The implemented scoped lifetime and its tested limits are described below; current verification is recorded in the cutover evidence. Submission is **not** a durable control receipt or completion. Controls resolve the saved revision before submission and can still be rejected if it changes. Programmatic owning-Pi callers can use the exact schemas for explicit idempotency keys.

Bare `/arbor start` previews the same preset/profile/project configuration used by the owner, asks only for missing consequential choices and confirms material, evaluation/checks, model roles and limits. It selects bounded `research` execution. The submitted `expectedSpecId` binds the confirmation to the resolved configuration, evaluator definitions and model choices. Drift rejects before capture and requires intake again. The programmatic `arbor.start` and explicit JSON route preserve configured execution defaults, including read-only `inspect`. `overrides.execution:"deferred"` saves configuration without inference. `execution: "evaluate"` runs a frozen committed pair. `execution: "material"` captures dirty Git or non-Git input in an external owned repository, measures its baseline and permits explicit native candidate dispatch/evaluation/keep. See [PR5 material configuration and limits](research-configuration.md#material-configuration). Both `material` and `research` capture source bytes; observation source references are not snapshots. Explicit `research` lets one persistent proposal actor select bounded operations through the same owner material/evaluator path. Its start command composes `arbor.start` then execute-risk `arbor.runResearch`; direct start freezes only. See [research controls and budgets](research-configuration.md#research-controls-and-budgets). Five attempts, concurrency one and eight actor turns are admission bounds, not a promise to exhaust the attempt budget.

Pause stops new dispatch at the current boundary; it cannot mask interrupted or cleanup-pending material work. Terminal material runs cannot be reopened by pause/resume; start a new run instead. Quiescent paused material runs resume explicitly, with command evaluation remaining on the execute-policy route. Steering is stored for the next ask. Cancellation receipts are queued acknowledgments, while inspection records actual terminal cleanup. Quiescent paused research resumes through execute-risk `arbor.runResearch`, replacing/re-grounding its stopped actor. `continue-partial` and `restart-parent` each charge a new bounded same-hypothesis native invocation; neither replays an ambiguous launch. Use `resume` separately to continue owner evaluation/research. Deferred configuration resume uses the saved spec without re-reading defaults. Unknown owners and ambiguous handles never cause redispatch. After same-owner component replacement with a pending material/research choice, `resume` explicitly re-observes quiescence and renews only its pending review binding. It returns `awaiting_review` without approving or dispatching. Review with a fresh dialog, then resume research; old-generation dialogs cannot approve.

Review opens an actual owning-Pi user dialog **after** Fabric permission. It binds the answer to the exact pending decision, source reference, epoch, revision and native session. Supplied approval booleans/receipts are invalid; dismissal/timeout never approves. This only approves a research choice, never a measured win or source write. Keeping remains blocked without evaluator evidence. Measured material apply/undo require separate exact owning-Pi dialogs. Per-path pre/postimage journals preserve dirty source/index/refs; newer affected bytes or modes and mixed partial outcomes block, retaining the patch. Undo takes the original apply command ID, not a research decision ID. If all source writes completed before final journal/receipt persistence, first resume nonterminal research after same-owner reload, then use `/arbor apply RUN ORIGINAL_APPLY_COMMAND_ID`. For cancelled terminal research, do not resume: invoke original-intent recovery or undo directly. The same-owner terminal source path preserves research state/generation, requires fresh approval and exact postimages, and never launches an actor/worker or admits a new apply intent. This fresh write-policy command and source dialog reconcile the original immutable intent only when every postimage matches, without rewriting its original approval or replaying writes. Resumed research may have kept a newer incumbent; recovery still binds the original recorded measured target and its exact postimages, with that original target shown in the dialog. A separate adoption receipt records the current binding; normal undo of that original command is then available. All-preimage, mixed or newer affected states block. Non-material runs still return a concrete unavailable receipt. Export generates idempotent JSON, report Markdown or proposal-trajectory Markdown. Material JSON/report exports include the captured-baseline-to-incumbent delta. Candidate inspection instead shows its recorded parent-to-candidate delta. Export admission counts cumulative owned artifacts and refuses changed revisions before writing. Process/storage failure can retain a file without a committed receipt, never fabricate success or authorize cleanup.

## Owner-only pack preparation

`/arbor scaffold JSON` submits exact write-risk `arbor.scaffold`, with explicit `pack`, absolute new `destination`, local `environment` model/Node choices and `heldOut` selection. It writes no existing source/artifact path and never installs, downloads, initializes source Git or launches research. The returned `start` object is used with the normal `/arbor start` command under separate execute/agent policy. Do not report the `unvalidated` preparation receipt as baseline evidence. See [runnable packs and optional upstream template](../examples/README.md) for complete requests, environment dependencies, frozen provenance and configurable defaults. This route is absent from actor commitments and every CLI/browser mode.

## Configuration and exact public contracts

New runs merge:

```text
built-in defaults < selected preset < <active-Pi-profile>/arbor.defaults.json < <project>/arbor.config.json < start.overrides
```

Every file/override uses the same bounded closed configuration schema. The database saves effective values, per-field origins, canonical material root/Git OID when present, source-reference identity and distinct coordinator/executor/subject identities. Coordinator/executor models default to the actual active Pi model, not Fabric's unrelated worker default. Unknown subject identity remains null. Tools and capability requirements are recorded separately. Operational package roles are frozen outside candidate material and explicitly loaded into native requests. Ordinary package updates/resume use the saved bundle. At a quiescent pause, `revise-roles` records a new package-resolved role binding without changing the immutable measurement spec or prior invocation attribution.

PR10 optionally selects `grounding` for research runs. Before loading the component definition, inspect public search/fetch descriptors with `tools.describe`, obtain their exact `descriptorHash` values from `tools.catalog`, and configure the finite `<active-Pi-profile>/arbor.sources.json` pairs. See [the exact grounding configuration and schema contract](research-configuration.md#grounding-configuration-and-schemas). No Arbor credentials or network fallback are added. Missing source capability blocks required grounding only; optional/unrelated local runs remain available. A quiescent owning-Pi `/reload` rereads the catalog for new runs; component reload alone does not. Saved complete grounding and role bundles are immutable on resume, while unresolved batches are retained without automatic replay.

`/arbor lessons --run RUN QUERY` uses read-only `arbor.lessons` for fresh-v2 project hypotheses with exact source-run/lesson/revision/digest links. Only owning-Pi `/arbor export RUN` generates actual proposal/action/outcome trajectories; the CLI/browser can retrieve existing artifacts without writing. Neither recall nor literature claims become experiment grades.

The four facade refs are `arbor.start`, `arbor.inspect`, `arbor.control`, `arbor.export`. The agent-risk `arbor.resumeAttempt` admits only a new bounded native worker, leaving scoring on its separate evaluator/research policy route. The six owner research refs are `arbor.propose`, `arbor.dispatch`, `arbor.collect`, `arbor.evaluate`, `arbor.distill`, `arbor.decide`. Separate `arbor.review`, `arbor.apply`, `arbor.undoApply` and `arbor.reviseRoles` routes carry write risk; autonomous `arbor.runResearch` carries execute risk and actual native agent effects retain their managed policy checks. Exact input/output schemas, actor proposals, command mappings, caller classes, risks, effects and component requirements are in [the generated manifest](pr3-action-manifest.json). Runtime discovery is authoritative for effective host availability:

```ts
await tools.describe({ ref: "arbor.start" });
await components.status({ id: "arbor" });
await tools.call({ ref: "arbor.start", args: { runId: "inspection-1" } });
await tools.call({ ref: "arbor.inspect", args: { runId: "inspection-1" } });
```

The PR2 lifecycle substrate has explicit diagnostic names `arbor.substrateStart`, `arbor.substrateInspect`, `arbor.substrateCancel`, all listed in the manifest. Their original bounded execution arguments are not a legacy v1 reader or a fallback for product research. Diagnostic routes cannot control research runs. Their lifecycle assertions remain active in the PR2 gate.

The coordinator commits only `agents.self`, never `arbor_lifetime.lease`; it cannot dispatch workers or resolve Arbor mutation refs. Observation workers use native read/grep/find/ls. Material workers may use explicitly configured write/edit/bash tools in isolated owned worktrees. Both use `recursive:false`, `extensions:false`. Their selected model must work without extension-only registration, for example through a built-in or `models.json` provider. Main availability does not prove child availability. Native failure is never a score.

## Scoped lifetime and reload boundaries

The owner keeps its original captured `context.call` and signal, the ten native `ARBOR_OWNER_REFS` and existing 21 `arbor.*` product/diagnostic refs. The approved additional discoverable capability is acquisition-only `arbor_lifetime.lease`, with closed empty-object args/null output, risk `agent` and scoped/ordered effect resource `arbor:owner:lifetime`. It is not a research command or actor capability. The sibling guard requires only that ref and acquires exactly that resource during activation, without native effects, actor bootstrap, services, participant registry or transport.

All new mutation admission requires read-only generation-bound guard status and lease ownership. An active parent or published owner alone is insufficient. Service monotone draining and post-await checks remain. Internal cleanup is independent of that gate. Teardown retires admission, awaits real scoped drain, then permits native owner unload/abort, with eventual `arbor` provider `close()` retaining supporting storage until safe. The lease inverse awaits generation `ResearchService.dispose()`, not storage close. Partial activation refuses admission and still requires generation-owned cleanup. Cleanup failures stay explicit. This is not a retire-last Fabric directive.

For component reload, target `components.reload({id: "arbor"})`, not the internal owner, which the public loader rejects as a reload target. [cutover evidence](pr13-cutover-evidence.md) records tested whole-Pi/application scopes and final validation. Do not infer owner-only or dependency-driven replacement safety from those results. Broader milestone/publication gates remain separate. Changing evaluator/source catalogs still requires quiescent maintenance and full Pi `/reload` to re-register definitions. Component reload alone does not reread catalogs. One public `fabric-arbor` skill remains unchanged.

## Review and evidence boundaries

An actor's fresh review request is finalized at successful native settlement before the owning Pi reviews the settled revision. Approval and rejection come from the actual Pi dialog, not actor flags. Intervening controls or stale dialogs are still rejected. Requesting a new review revokes that node's prior admission immediately; rejection or dismissal never restores it, and replaying an older approval only returns its historical receipt. In `direction` and `collaborative` modes, executable hypotheses must have an approved, eligible parent direction at dispatch admission; an unreviewed root hypothesis cannot bypass that policy. PR8 actual-native mode, timeout and frozen-role/reload journeys are recorded separately in [PR8 evidence](pr13-cutover-evidence.md); the observation lane is not their substitute.

Native evidence has an immutable identity and explicit attempt/material/epoch/generation/native provenance. JSON exports use a separate artifact identity even if their command ID matches evidence. Exports are never valid evidence inputs. Conflicting artifact inserts roll back, and late native attachment cannot turn a terminal attempt back into running. Existing runtime artifacts are retained, not rewritten or upgraded into evidence.

## Read-only surfaces and updates

Cold inspection uses a short-lived read-only SQLite connection with connection-local EXCLUSIVE locking before database access. This is not journal-mode conversion and does not change the owning writer's locking policy. If WAL appears during admission, the read may report `read-only projection unavailable` rather than create sidecars or attempt recovery. The connection always closes; inspection never starts a hidden owner or retains a keepalive. Existing WAL is refused early, and only an explicit owning-Pi write-open may perform the existing quiescent journal setup. Exact tested platform/runtime scope is recorded in [PR12 evidence](pr13-cutover-evidence.md).

Exactly one rewritten public `fabric-arbor` skill is packaged. The three internal roles and conditional references are assets, not separately discovered skills. [Role maintenance](role-maintenance.md) records all eleven upstream dispositions.

`/arbor browser` starts a loopback read-only listener in the owning Pi. It closes on shutdown/reload. Tree, evidence, exact candidate diff, saved native references, SSE and event replay show existing research facts. Fabric `/fabric` and `/fabric log` retain topology, full logs and native operational controls. Arbor has no second participant registry or transcript mirror. Browser run/view selectors only navigate. There are no mutation forms, effect endpoints, callbacks or export-generation routes.

```text
pi-fabric-arbor inspect --state <existing-directory> --run <run>
pi-fabric-arbor replay --state <existing-directory> --run <run>
pi-fabric-arbor artifact --state <existing-directory> --run <run> --id <registered-artifact>
```

These read the exact current research revision without creating storage. The existing `--file` and `--root/--path` commands remain explicitly file reads, not claims of current state. Replay lists saved research events, not reconstructed historical workspaces. Registered artifact retrieval verifies its exact saved identity and never generates an export. Every CLI mutation is rejected in all modes, with no attachment transport. Pending review is displayed without answering it.

Reload source updates with `/reload`. The [current cutover gate](pr13-cutover-evidence.md) records actual source/installed owning-Pi UI and production-browser proof. For its local browser test, install the declared dev dependencies, then run `PLAYWRIGHT_BROWSERS_PATH="$PWD/.runtime/pr12-browsers" npx playwright install chromium` and `npm run test:pr12:e2e`. Playwright is a test-only dependency, not required for the installed app. `npm run test:pr12` covers the shared reader and presentation contracts. `npm run check` includes current package/install, managed, research, evaluator and material source tests; no legacy test runtime is retained. Run `npm run test:pr2:e2e`, `npm run test:pr3:e2e`, `npm run test:pr4:e2e` `npm run test:pr5:e2e` and `npm run test:pr6:e2e` for actual Pi/Fabric local-model gates. [PR6 evidence](pr13-cutover-evidence.md) records both autonomous five-stage journeys and exact scope. See [PR3 evidence](pr13-cutover-evidence.md) for exact passing scope and outstanding work.

Removing the package does not authorize deletion of databases, reports, artifacts, keys, workspaces or historical evidence. No legacy history is imported or migrated.
