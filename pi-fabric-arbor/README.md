# pi-fabric-arbor

`pi-fabric-arbor` is an independent, source-loaded Pi add-on for the Arbor v2 replacement described by the repository plan at `docs/Arbor/deep-refactoring-plan.md`.

## Current checkpoint: PR3 transactional interface, final adversarial verification PASS

- Pi loads `src/extension.ts` directly. No build, `dist/`, or `.test-dist/` is required.
- Registration declares passive managed component metadata. It never starts inference, creates an actor or opens research storage.
- `/arbor setup` configures one managed instance; `/arbor doctor` reports configured policy and observed lifecycle blockers without inference.
- The operational child uses exact definition-time public Fabric dependencies and captured post-activation `context.call`.
- An owning-Pi call creates one persistent proposal-only actor, validates bounded proposals, launches native workers, owns their waits and supplies fresh observations to later asks. Actor outbox delivery is passive, not a Main continuation.
- `src/research/` owns a fresh transactional SQLite schema, frozen domain-neutral specification and origins, typed proposals, atomic reservations, controls, evidence-linked observations and real owning-Pi review receipts. `src/managed/` retains native linkage and the verified execution lifecycle.
- Native owner/root/host identity and generation are immutable. Other roots and replacement generations cannot adopt or redispatch retained work. Profile/project/explicit configuration origins and coordinator/executor/subject model identities are separate.
- Exactly one public skill, `fabric-arbor`, is registered. Packaged role/procedure assembly remains PR6/PR10 work.
- CLI and stable source Web assets remain strictly read-only, with no live-owner attachment or Web server.

This is **not scored research**. PR3 implements the four facade and six research boundaries, with evaluator/keep/apply/undo routes returning explicit unavailable results until their PR4+ dependencies exist. Native attempts only inspect source references, never create scored candidate snapshots. JSON projection exports and research-choice review are implemented; full reports, stopped-actor/partial resume and workspace apply/undo remain later work. `completed` means native execution settled, not a measured win. Ambiguous cleanup remains `cleanup_pending`.

`/arbor start` submits an exact action through the ordinary owning-Pi model/Fabric path, not an unchecked service call. `/arbor show RUN`, controls, review and exports use the same path. Submission is not a durable receipt or completion. [Commands/configuration](docs/consumer-installation.md), [exact action/schema manifest](docs/pr3-action-manifest.json) and [PR3 evidence/limitations](docs/pr3-interface-evidence.md) describe the boundaries.

Schema enforce remains unavailable for this external delegation path. Commands explain the inactive owner without inference. The installed host also exhibits an earlier `Missing: extensions` initialization failure under enforce; that is retained as a limitation, not claimed as a successful exact-reference guard test.

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
npm run test:pr1
npm run test:source:retained
npm pack --ignore-scripts --json
```

Normal `npm test` and `npm run check` retain the five package/install cases and 92 source-characterization cases, and add the managed PR2 and transactional PR3 source tests. Both typechecks are no-emit. The source-loaded fingerprint oracle and legacy source Web characterization remain unchanged.

The separate PR2 host lane loads the production extension through real Pi/Fabric. Native processes, actor asks, worker waits and reload are real; inference is deterministic local fixture code, including a loopback model for extension-free workers. All dependencies resolve from this app's `node_modules`. Disposable profiles strip inherited `PI_*`/`ARBOR_*` values and retain host traces under `.runtime/pr2-host/` and `.runtime/pr3-host/`. No paid model or dataset download is used.

See [PR2 evidence and limitations](docs/pr2-managed-owner-evidence.md), [PR1 source-install evidence](docs/pr1-source-install-evidence.md) and [PR0 owner-local evidence](docs/pr0-owner-local-evidence.md). The separate `npm run test:pr0:e2e` lane was not rerun for PR2: its source/fixtures remain unchanged, while the new lane exercises production code rather than the probe.

## Legacy boundary

Legacy v1 source and certification artifacts remain only for historical characterization until PR13. They are not package exports, binaries, Pi registrations or package contents. Superseded certificate/admission, containment, authorization, Phase 7 and writable-Web suites are not active gates; their exact disposition remains in the PR1 evidence. No existing user data, reports, keys, databases or certification artifacts are deleted or migrated.
