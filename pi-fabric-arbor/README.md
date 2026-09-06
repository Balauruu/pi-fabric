# pi-fabric-arbor

`pi-fabric-arbor` is an independent, source-loaded Pi add-on for the Arbor v2 replacement described by the repository plan at `docs/Arbor/deep-refactoring-plan.md`.

## Current checkpoint: PR2 managed execution substrate

- Pi loads `src/extension.ts` directly. No build, `dist/`, or `.test-dist/` is required.
- Registration declares passive managed component metadata. It never starts inference, creates an actor or opens research storage.
- `/arbor setup` configures one managed instance; `/arbor doctor` reports configured policy and observed lifecycle blockers without inference.
- The operational child uses exact definition-time public Fabric dependencies and captured post-activation `context.call`.
- An owning-Pi call creates one persistent proposal-only actor, validates bounded proposals, launches native workers, owns their waits and supplies fresh observations to later asks. Actor outbox delivery is passive, not a Main continuation.
- Native owner/root/host identity, generation, material/cwd/OID/policy/model and returned IDs are retained in a small execution-binding database. Replacement generations and other native roots cannot silently adopt or redispatch it.
- Exactly one public skill, `fabric-arbor`, is registered. Packaged role/procedure assembly remains PR6/PR10 work.
- CLI and stable source Web assets remain strictly read-only, with no live-owner attachment or Web server.

This is **not scored research**. The full run specification/store, evaluation, review controls, partial resume, apply/undo and exports remain later PRs. `completed` means bounded native execution completed, not a measured win. Ambiguous cleanup remains `cleanup_pending` with evidence retained.

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
npm run test:pr1
npm run test:source:retained
npm pack --ignore-scripts --json
```

Normal `npm test` and `npm run check` retain the five package/install cases and 92 source-characterization cases, and add the managed PR2 tests. Both typechecks are no-emit. The source-loaded fingerprint oracle and legacy source Web characterization remain unchanged.

The separate PR2 host lane loads the production extension through real Pi/Fabric. Native processes, actor asks, worker waits and reload are real; inference is deterministic local fixture code, including a loopback model for extension-free workers. All dependencies resolve from this app's `node_modules`. Disposable profiles strip inherited `PI_*`/`ARBOR_*` values and retain host traces under `.runtime/pr2-host/`. No paid model or dataset download is used.

See [PR2 evidence and limitations](docs/pr2-managed-owner-evidence.md), [PR1 source-install evidence](docs/pr1-source-install-evidence.md) and [PR0 owner-local evidence](docs/pr0-owner-local-evidence.md). The separate `npm run test:pr0:e2e` lane was not rerun for PR2: its source/fixtures remain unchanged, while the new lane exercises production code rather than the probe.

## Legacy boundary

Legacy v1 source and certification artifacts remain only for historical characterization until PR13. They are not package exports, binaries, Pi registrations or package contents. Superseded certificate/admission, containment, authorization, Phase 7 and writable-Web suites are not active gates; their exact disposition remains in the PR1 evidence. No existing user data, reports, keys, databases or certification artifacts are deleted or migrated.
