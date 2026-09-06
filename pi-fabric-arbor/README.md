# pi-fabric-arbor

`pi-fabric-arbor` is an independent, source-loaded Pi add-on for the Arbor v2 replacement described by the repository plan at `docs/Arbor/deep-refactoring-plan.md`.

## Current checkpoint: PR4 exact-material evaluators, independent scoped verification PASS

- Pi loads `src/extension.ts` directly. No build, `dist/`, or `.test-dist/` is required.
- Registration declares passive managed component metadata. It never starts inference, creates an actor or opens research storage.
- `/arbor setup` configures one managed instance; `/arbor doctor` reports configured policy and observed lifecycle blockers without inference.
- The operational child uses exact definition-time public Fabric dependencies and captured post-activation `context.call`.
- In `inspect` mode, an owning-Pi call creates one persistent proposal-only actor, validates bounded proposals, launches native workers, owns their waits and supplies fresh observations to later asks. Actor outbox delivery is passive, not a Main continuation.
- `src/research/` owns a fresh transactional SQLite schema, frozen domain-neutral specification and origins, typed proposals, atomic reservations, controls, evidence-linked observations and real owning-Pi review receipts. `src/managed/` retains native linkage and the verified execution lifecycle.
- Native owner/root/host identity is immutable. Evaluation recovery requires explicit same-owner reconciliation after reload; unknown handles block without redispatch. Broader research/partial-material resume remains PR8. Models and tools for coordinator, executor, subject and optional judge are resolved independently.
- Exactly one public skill, `fabric-arbor`, is registered. Packaged role/procedure assembly remains PR6/PR10 work.
- CLI and stable source Web assets remain strictly read-only, with no live-owner attachment or Web server.

PR4 adds packaged command, native agent-suite and finite configured-provider evaluation over **an explicitly supplied pair of committed material references**. It freezes the task/grade definition, explicitly loads subject prompt/skill bytes, charges every invocation and retains native evidence before grading. Native execution, evaluation validity, quality gates, descriptive analysis and the still-unimplemented incumbent decision are separate fields.

This is **not autonomous scored research**. Default `inspect` execution still uses the preserved PR3 proposal actor and read-only executors. PR4 `evaluate` is a deterministic exact-material seam, not dirty capture, candidate generation, incumbent adoption or source apply. These remain PR5+. Full partial-material continuation remains PR8. Read-only JSON exports include evaluation summaries; detailed derived records live at `runs/RUN/evaluations/EVALUATION.json`. See [PR4 evidence and precise acceptance scopes](docs/pr4-evaluator-evidence.md).

`/arbor start` submits an exact action through the ordinary owning-Pi model/Fabric path, not an unchecked service call. `/arbor show RUN`, controls, review and exports use the same path. Submission is not a durable receipt or completion. [Commands/configuration](docs/consumer-installation.md), [exact action/schema manifest](docs/pr3-action-manifest.json) and [PR3 evidence/limitations](docs/pr3-interface-evidence.md) describe the boundaries.

Schema enforce remains unavailable for this external delegation path. Commands explain the inactive owner without inference. The installed host also exhibits an earlier `Missing: extensions` initialization failure under enforce; that is retained as a limitation, not claimed as a successful exact-reference guard test.

## Exact-material evaluation

In the owning Pi session, select an available exact model and a frozen definition:

```text
/arbor start {"runId":"prompt-pair","overrides":{"execution":"evaluate","evaluator":{"kind":"agent-suite","definition":"/absolute/evaluation.json"}}}
/arbor show prompt-pair
/arbor pause prompt-pair
/arbor resume prompt-pair
```

The [packaged deterministic example](examples/pr4-agent-improvement/README.md) contains baseline/candidate material, fixed tasks and preset data. Its clean-install test prepares disposable Git references before calling the actual product; no mutating preparation CLI is shipped. It is a loading/grading oracle, not a research benchmark. The public package exports `definitionSchema`, `providerInputSchema` and `providerOutputSchema`; the [machine manifest](docs/pr3-action-manifest.json) includes these contracts.

- Material is a bounded list of regular committed UTF-8 files at full Git OIDs in the selected canonical root. The exact checked blob is copied even when the selected root is a Git subdirectory; prototype-named files retain exact bytes and persisted selected-file coverage is verified. Committed executable files remain directly runnable (owned mode `0700`, ordinary files `0600`); executable flags are identity-bound and checked for drift before and after use. Dirty-file/mode capture, symlink workflows, non-Git capture and workspace integration remain outside this PR4 seam.
- The subject's `model`, read-only `tools`, and explicit `promptFiles` come from the frozen definition, not ambient skill-name discovery or cwd alone. `roles` and `roleTools` configure operational models/tools separately. Optional judges use their own model/instructions, receive no tools and can veto deterministic grades; they never choose research policy.
- Fixed task IDs, baseline/candidate order, repeats, retries, expected answers, deadlines and analysis are frozen. Retries, rechecks, scored feedback and judges have distinct linked invocation IDs. Native usage is observational, not a hard monetary ceiling.
- Command definitions declare `argv`, required `checks` and `unit`. Output must contain exactly one `ARBOR_METRIC DECIMAL UNIT` line. Nonzero exit, timeout, interruption, wrong/ambiguous output and incomplete/failed checks never score. No checks means limited validation. Trusted commands are not contained; only directly owned processes are stopped.
- `/arbor start` composes command setup and the separate **execute-risk** `arbor.evaluate` action through normal Fabric policy. Direct `arbor.start` for a command definition only freezes configuration; it cannot bypass execute denial. `/arbor resume` likewise selects the execute-risk route for command evaluations. Agent-suite launches retain the native agent permission gate; external evaluators retain their declared execute gate.
- Paired task summaries include failures and an observed delta range. Repeats are grouped within tasks, not counted as independent tasks. This is descriptive evidence, not a confidence interval or statistical superiority. Unsupported analysis methods, contradictory aggregation/repeat policy and unknown quality vetoes block selection. Supported quality vetoes are `no-native-failures` and, for agent suites, `all-tasks-correct`.
- Interruption returns `INTERRUPTED`. Explicit resume checks the saved native owner, component, source cwd/OID, epoch, definition, catalog and snapshot/request identities. Known subject and judge native completions are re-observed and ingested idempotently; infrastructure failures are not invalid grades, and completion requires every invocation ingested. Unknown/ambiguous launches are not retried. Native/provider requests use detached immutable expected bindings, with mutation checks across awaits; poisoned execution requires a new measurement rather than resume. When retirement lost the deadline receipt, recovered execution stays invalid rather than guessing it succeeded within the deadline.

Authoritative feedback uses `arbor.evaluate` with the current run binding and `payload: {attemptId: "exact-material", evaluationId: "unique-id", purpose: "feedback"}` (or `recheck`). This evaluates the saved exact pair, never an arbitrary worker-supplied scalar or changed cwd. Candidate freezing and executor-scoped feedback on new material arrive with PR5/PR6.

### Optional evaluator catalog and presets

A closed preset supplies `id`, `materialKind`, `objectiveDefaults`, `evaluator`, `searchDefaults`, and optional `instructions`/`sourceRefs`. Precedence is built-in defaults < preset < profile < project < explicit. An explicit/project `preset: null` disables lower-precedence preset inheritance without reading its file. Presets are data, not operational bootstrap authority or plugins that start research.

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
npm run test:pr1
npm run test:source:retained
npm pack --ignore-scripts --json
```

Normal `npm test` and `npm run check` retain the five package/install cases and 92 source-characterization cases, and include the managed PR2, transactional PR3 and PR4 evaluator source tests. Both typechecks are no-emit. The source-loaded fingerprint oracle and legacy source Web characterization remain unchanged.

The separate PR2 host lane loads the production extension through real Pi/Fabric. Native processes, actor asks, worker waits and reload are real; inference is deterministic local fixture code, including a loopback model for extension-free workers. All dependencies resolve from this app's `node_modules`. Disposable profiles strip inherited `PI_*`/`ARBOR_*` values and retain host traces under `.runtime/pr2-host/`, `.runtime/pr3-host/` and `.runtime/pr4-host/`. No paid model or dataset download is used.

See [PR2 evidence and limitations](docs/pr2-managed-owner-evidence.md), [PR1 source-install evidence](docs/pr1-source-install-evidence.md) and [PR0 owner-local evidence](docs/pr0-owner-local-evidence.md). The separate `npm run test:pr0:e2e` lane was not rerun for PR2: its source/fixtures remain unchanged, while the new lane exercises production code rather than the probe.

## Legacy boundary

Legacy v1 source and certification artifacts remain only for historical characterization until PR13. They are not package exports, binaries, Pi registrations or package contents. Superseded certificate/admission, containment, authorization, Phase 7 and writable-Web suites are not active gates; their exact disposition remains in the PR1 evidence. No existing user data, reports, keys, databases or certification artifacts are deleted or migrated.
