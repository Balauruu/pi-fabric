# Source-only installation and availability

Pi packages execute with the user's OS authority. Review source before installation. The package requires Node 24+, peer `pi-fabric >=0.83.0 <0.84.0` and runtime `tsx@4.23.13`. Tests use app-local locked dependencies. No build/prepack, certificates or profile-local helper skills are needed.

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

Setup atomically merges one enabled `{id:"arbor", component:"arbor"}` entry into `.pi/fabric.json`, preserving unrelated/inherited entries and rejecting conflicts. The default state directory is `<active-Pi-profile>/arbor/<project-path-hash>/v2/`, outside material. It does not alter agents, mesh, trust, approvals or Schema policy.

Doctor distinguishes installed, configured, enabled, observed and tested capabilities. An active component does not prove enabled inference: disabled Fabric agents retain descriptors. An unavailable owner causes research commands to report diagnostics without submitting inference. Schema enforce is unsupported for this delegation path; the installed host's additional `Missing: extensions` startup failure is recorded in [PR3 evidence](pr3-interface-evidence.md). Arbor does not downgrade policy or patch Fabric.

## Owning-Pi commands

```text
/arbor start
/arbor start {"runId":"instructions-1","overrides":{"material":{"kind":"instructions","mutablePaths":["AGENTS.md"]},"objective":{"description":"Improve instruction clarity","direction":"maximize","unit":"quality"}}}
/arbor show instructions-1
/arbor pause instructions-1
/arbor steer instructions-1 Inspect the constraints first
/arbor resume instructions-1
/arbor cancel instructions-1
/arbor review instructions-1 DECISION_ID
/arbor export instructions-1
/arbor keep instructions-1 NODE_ID
/arbor discard instructions-1 NODE_ID
/arbor apply instructions-1 DECISION_ID
/arbor undo-apply instructions-1 DECISION_ID
```

A command submits an exact allowlisted action request through Pi's normal model/Fabric tool path. It does not invoke an unchecked service, bypass Fabric permissions or introduce a transport. The request can be queued behind the current Pi turn. Submission is **not** a durable control receipt or completion. Controls resolve the saved revision before submission and can still be rejected if it changes. Programmatic owning-Pi callers can use the exact schemas for explicit idempotency keys.

`start` resolves and stores a fresh spec, then by default runs a bounded proposal-only actor and **read-only native observation attempts**. `overrides.execution:"deferred"` saves configuration without inference. `execution: "evaluate"` runs a frozen committed pair. `execution: "material"` captures dirty Git or non-Git input in an external owned repository, measures its baseline and permits explicit native candidate dispatch/evaluation/keep. See [PR5 material configuration and limits](../README.md#pr5-dirty-material-and-owned-incumbent). Only `material` mode captures source bytes; observation source references are not snapshots. Five attempts, concurrency one and eight actor turns are admission bounds, not a promise to exhaust the attempt budget.

Pause stops new dispatch at the current boundary; it cannot mask interrupted or cleanup-pending material work. Terminal material runs cannot be reopened by pause/resume; start a new run instead. Quiescent paused material runs resume explicitly, with command evaluation remaining on the execute-policy route. Steering is stored for the next ask. Cancellation receipts are queued acknowledgments, while inspection records actual terminal cleanup. Native stopped-actor/partial-material resume is explicitly unavailable until PR8. Deferred configuration resume uses the saved spec without re-reading defaults. Unknown owners/generations and ambiguous handles never cause redispatch.

Review opens an actual owning-Pi user dialog **after** Fabric permission. It binds the answer to the exact pending decision, source reference, epoch, revision and native session. Supplied approval booleans/receipts are invalid; dismissal/timeout never approves. This only approves a research choice, never a measured win or source write. Keeping remains blocked without evaluator evidence. Apply/undo return concrete unavailable receipts until workspace/preimage reconciliation ships. Export generates an idempotent JSON projection, plus a captured-baseline-to-incumbent patch in material mode. It is not a complete autonomous research report.

## Configuration and exact public contracts

New runs merge:

```text
built-in defaults < <active-Pi-profile>/arbor.defaults.json < <project>/arbor.config.json < start.overrides
```

Every file/override uses the same bounded closed configuration schema. The database saves effective values, per-field origins, canonical material root/Git OID when present, source-reference identity and distinct coordinator/executor/subject identities. Coordinator/executor models default to the actual active Pi model, not Fabric's unrelated worker default. Unknown subject identity remains null. Tools and capability requirements are recorded separately. Operational role bundles/candidate skill isolation remain PR6 work; the current inline observation bootstrap identities do not claim full role-bundle delivery.

The four facade refs are `arbor.start`, `arbor.inspect`, `arbor.control`, `arbor.export`. The six owner research refs are `arbor.propose`, `arbor.dispatch`, `arbor.collect`, `arbor.evaluate`, `arbor.distill`, `arbor.decide`. Separate `arbor.review`, `arbor.apply`, `arbor.undoApply` routes carry write risk. Exact input/output schemas, actor proposals, command mappings, caller classes, risks, effects and component requirements are in [the generated manifest](pr3-action-manifest.json). Runtime discovery is authoritative for effective host availability:

```ts
await tools.describe({ ref: "arbor.start" });
await components.status({ id: "arbor.owner" });
await tools.call({ ref: "arbor.start", args: { runId: "inspection-1" } });
await tools.call({ ref: "arbor.inspect", args: { runId: "inspection-1" } });
```

The PR2 lifecycle substrate has explicit diagnostic names `arbor.substrateStart`, `arbor.substrateInspect`, `arbor.substrateCancel`, all listed in the manifest. Their original bounded execution arguments are not a legacy v1 reader or a fallback for product research. Diagnostic routes cannot control research runs. Their lifecycle assertions remain active in the PR2 gate.

The coordinator commits only `agents.self`; it cannot dispatch workers or resolve Arbor mutation refs. Observation workers use native read/grep/find/ls. Material workers may use explicitly configured write/edit/bash tools in isolated owned worktrees. Both use `recursive:false`, `extensions:false`. Their selected model must work without extension-only registration, for example through a built-in or `models.json` provider. Main availability does not prove child availability. Native failure is never a score.

## Review and evidence boundaries

An actor's fresh review request is finalized at successful native settlement before the owning Pi reviews the settled revision. Approval and rejection come from the actual Pi dialog, not actor flags. Intervening controls or stale dialogs are still rejected. Requesting a new review revokes that node's prior admission immediately; rejection or dismissal never restores it, and replaying an older approval only returns its historical receipt. In `direction` and `collaborative` modes, executable hypotheses must have an approved, eligible parent direction at dispatch admission; an unreviewed root hypothesis cannot bypass that policy. Complete interaction-mode continuation/native resume remains PR8 work, not a promise of this bounded observation lane.

Native evidence has an immutable identity and explicit attempt/material/epoch/generation/native provenance. JSON exports use a separate artifact identity even if their command ID matches evidence. Exports are never valid evidence inputs. Conflicting artifact inserts roll back, and late native attachment cannot turn a terminal attempt back into running. Existing runtime artifacts are retained, not rewritten or upgraded into evidence.

## Read-only surfaces and updates

Exactly one public `fabric-arbor` skill is packaged; internal role/reference files are not separately discovered skills. The standalone CLI only supports availability/assets/asset and existing-file inspect/replay/artifact retrieval. Every mutation verb is rejected in attached/offline modes; no attachment transport exists. Browser assets remain static and read-only, with no server, mutation forms or routes. Reads never generate exports.

Reload source updates with `/reload`. `npm run check` includes package/install, retained source and PR2-PR5 source tests. Run `npm run test:pr2:e2e`, `npm run test:pr3:e2e`, `npm run test:pr4:e2e` and `npm run test:pr5:e2e` for actual Pi/Fabric local-model gates. See [PR3 evidence](pr3-interface-evidence.md) for exact passing scope and outstanding work.

Removing the package does not authorize deletion of databases, reports, artifacts, keys, workspaces or historical evidence. No legacy history is imported or migrated.
