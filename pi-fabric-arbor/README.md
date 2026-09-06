# pi-fabric-arbor

`pi-fabric-arbor` is an independent, source-loaded Pi add-on for the Arbor v2 replacement described by the repository plan at `docs/Arbor/deep-refactoring-plan.md`.

## Current checkpoint: PR1

PR1 provides packaging and read-only inspection only:

- Pi loads `src/extension.ts` directly. No package build, `dist/`, or `.test-dist/` is required.
- The standalone CLI is a handwritten `.mjs` launcher using the declared `tsx` runtime dependency.
- Exactly one public skill, `fabric-arbor`, is registered.
- Coordinator, executor, literature, and conditional-reference Markdown files are packaged internal assets, not skills or agents.
- Stable read-only HTML, JavaScript, and CSS are loaded directly from `web/read-only/`.
- Normal extension registration creates no component, agent, research run, database, artifact, or export.
- Normal `npm test` runs the five package/install cases plus the named 92-test `test:source:retained` characterization lane directly from TypeScript source.

PR1 does **not** implement setup, doctor, a production managed Arbor component, research, review, apply/undo, export generation, or a Web server. Those remain dependency-ordered PR2+ work. The source facade reports this limitation instead of exposing legacy v1 mutations or certificates as v2 behavior.

## Requirements

- Node.js 24 or newer. PR1 was exercised on Node 26.7.0.
- Pi 0.85.1 was used for the clean reload E2E.
- `pi-fabric >=0.83.0 <0.84.0`; PR1 was exercised with 0.83.0.

The Pi version is an observed test version, not a claimed permanent compatibility floor. The package declares `tsx@4.23.13` as a runtime dependency and `pi-fabric` as a peer dependency.

## Install and reload

After publication:

```sh
pi install npm:pi-fabric-arbor@0.1.0
pi list
pi config
```

For a reviewed local source checkout:

```sh
pi install /absolute/path/to/pi-fabric-arbor
```

Project-local package settings require project trust. Restart Pi after first activation or run `/reload` after a source update. No `npm run build` or prepack compilation is part of normal installation or update.

Inside Pi:

```text
/arbor availability
/arbor assets
/skill:fabric-arbor
```

`/arbor setup`, `/arbor doctor`, and research/control commands are intentionally unavailable in PR1.

## Read-only CLI

```sh
pi-fabric-arbor availability
pi-fabric-arbor assets
pi-fabric-arbor asset coordinatorRole
pi-fabric-arbor inspect --file /path/to/existing-projection.json
pi-fabric-arbor replay --file /path/to/existing-events.jsonl
pi-fabric-arbor artifact --root /path/to/existing/artifacts --path report.md
```

The CLI has no live-owner attachment and no setup, start, pause/resume, cancel, steering, review, keep/discard, apply/undo, cleanup, authorization, certification, server, or export-generation command. Unknown and mutating verbs fail with exit code 2. Inspection reads bounded existing regular files and does not create an export.

## Development checks

```sh
npm install --ignore-scripts
npm run typecheck
npm run typecheck:test
npm test
npm run check
npm run test:pr1
npm run test:source:retained
npm pack --ignore-scripts --json
```

`npm run test:pr1` packs and installs into a disposable fixture, loads the installed package through the actual Pi package loader, verifies the single skill and all internal assets, edits a source sentinel, calls an actual Pi reload, and verifies the changed source. Every fixture subprocess strips inherited `PI_*` values; the Pi process receives only isolated `PI_CODING_AGENT_DIR`, `PI_OFFLINE`, and `PI_SKIP_VERSION_CHECK` values. It uses declared local test dependencies, a local deterministic/no-inference process, and no external model.

`npm run test:source:retained` covers all model decimal/state/schema tests; Git fingerprint noninterference through an independent source-loaded oracle process, workspaces, and promotion refs; persistence and artifacts; dispatch/outbox/report/cleanup/crash recovery; report completeness; command concurrency; strict evaluator parsing; application fixture flow; and component/provider characterization. It has no emitted-path dependency and is part of both `npm test` and `npm run check`.

Superseded v1 certificate/admission, Bubblewrap/held-out containment, local authorization/promotion, Phase 7, retention, and writable-Web hardening suites remain historical pending PR13. They are not active gates and are not reported as passing. The exact excluded file list and reasons are in [`docs/pr1-source-install-evidence.md`](docs/pr1-source-install-evidence.md).

The revised owner-local PR0 regression remains separately available:

```sh
npm run test:pr0:e2e
```

PR0 is not folded into every normal PR1 test because it is an approximately two-minute host integration lane. The PR1 repair did not change `src/pr0/`, its host fixture, or its integration tests, so the previously passing 11-test PR0 lane was not rerun. See [`docs/pr0-owner-local-evidence.md`](docs/pr0-owner-local-evidence.md) and [`docs/pr1-source-install-evidence.md`](docs/pr1-source-install-evidence.md).

## Legacy source boundary

Legacy v1 implementation and certification artifacts remain in the working repository to preserve prior source and historical characterization until the PR13 deletion gate. They are not package exports, binaries, Pi registrations, or npm package contents. `src/legacy/extension-v1.ts` keeps the old extension behavior explicit for historical tests only.

Existing user data, reports, keys, databases, and certification artifacts are not deleted or migrated by PR1.
