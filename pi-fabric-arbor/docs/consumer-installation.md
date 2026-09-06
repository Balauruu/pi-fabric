# Source-only installation and availability

PR1 packages `pi-fabric-arbor` as an independent Pi extension with no emitted runtime. Pi packages execute with the user's OS authority, so review the source before installation.

## Requirements

- Node.js 24 or newer.
- A trusted Pi project for project-local resources.
- Declared peer `pi-fabric >=0.83.0 <0.84.0`.
- Declared runtime dependency `tsx@4.23.13` for the standalone source CLI.

The retained PR1 E2E uses Node 26.7.0, Pi 0.85.1, and Fabric 0.83.0. These distinguish tested versions from broader availability claims.

## Install

Published package:

```sh
pi install npm:pi-fabric-arbor@0.1.0
```

Reviewed local source:

```sh
pi install /absolute/path/to/pi-fabric-arbor
```

For project scope, add `-l` while inside the trusted project. Use `pi list` to inspect the configured source and `pi config` to enable the package extension and public skill. Restart Pi after first activation or use `/reload` after source changes.

The package manifest points directly to:

```text
extension: ./src/extension.ts
skill:     ./skills/fabric-arbor/SKILL.md
```

No build, prepack hook, release hash generation, certificate generation, `dist/`, or `.test-dist/` is required.

## Verify current availability

Inside Pi:

```text
/arbor availability
/arbor assets
```

Outside Pi:

```sh
pi-fabric-arbor availability
pi-fabric-arbor assets
```

A correct PR1 installation reports:

```text
extension: source-loaded
CLI: read-only
Web: read-only-assets
research: unavailable-until-pr2-plus
component: not-registered-by-pr1
```

Exactly one package skill, `/skill:fabric-arbor`, is discovered. Files under `skills/fabric-arbor/roles/` and `skills/fabric-arbor/references/` are internal assets and must not appear as skills or agents.

## Read-only boundary

The CLI may inspect a bounded existing file, replay existing JSONL, retrieve an existing regular artifact beneath an explicit root, or read a packaged asset. It cannot attach to a live owner or setup/start/control/review/apply/undo/generate exports. The packaged browser assets contain no forms, transport, request code, or mutation path. PR1 does not start a Web server.

Setup and doctor belong to PR2. Production role assembly belongs to PR6/PR10, and full research presentation belongs to PR12. Do not use old v1 certificates, binaries, providers, or intent APIs as v2 substitutes.

## Update and uninstall

A package source update becomes visible after Pi reload; no compilation step is involved. For a source checkout, `npm test` and `npm run check` execute the clean package/install cases and the named retained TypeScript characterization lane without `dist/` or `.test-dist/`. The retained lane covers model arithmetic/state/schema, Git noninterference/workspaces/promotion, persistence/artifacts, recovery and reports, command concurrency, evaluator parsing, and component/provider behavior.

The clean-install harness removes every inherited `PI_*` variable from npm, CLI, import, and Pi fixture subprocesses. Its Pi process receives only fixture-local `PI_CODING_AGENT_DIR`, `PI_OFFLINE=1`, and `PI_SKIP_VERSION_CHECK=1`; shared session, mesh, provider, model, and configuration identities are not inherited.

Superseded v1 certificate/admission, containment, authorization/promotion, Phase 7, retention, and writable-Web suites are historical pending PR13, not active certification gates. Their exact disposition is recorded in `docs/pr1-source-install-evidence.md`; no pass is implied for those excluded suites.

```sh
pi remove npm:pi-fabric-arbor
# or project scope
pi remove -l npm:pi-fabric-arbor
```

Removing package registration does not authorize deletion of existing user databases, reports, artifacts, keys, workspaces, or certification evidence. PR1 does not scan, migrate, or remove those paths.
