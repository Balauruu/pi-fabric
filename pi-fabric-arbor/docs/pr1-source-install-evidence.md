# PR1 source-only installation evidence

Status: **PASS for the repaired PR1 source-only package/install and retained-characterization gate**. PR2 is next. Final review kept the oracle change minimal: source-resolved digest, original direct independent implementation, and no new subprocess/IPC runtime. `npm run check` passed again after that correction: both no-emit checks, 5 package/install tests and 92 retained source tests.

## Executed environment

Executed 2026-09-06 from `/home/balauru/.pi-profiles/fabric/pi-fabric-arbor` with:

- Node 26.7.0
- npm 12.0.2
- Pi 0.85.1 from the package's exact dev dependency
- pi-fabric 0.83.0 from the package's exact dev dependency and the clean fixture's declared dependency
- tsx 4.23.13 from Arbor's declared runtime dependency

The fixture stripped every inherited `PI_*` variable from npm, CLI, source-import, and Pi subprocess environments. The Pi fixture received only isolated `PI_CODING_AGENT_DIR`, `PI_OFFLINE=1`, and `PI_SKIP_VERSION_CHECK=1`, alongside an isolated `HOME`; shared session, mesh, owner-host, parent-run, actor, provider, model, reasoning, and configuration identities could not leak in. It used npm offline installation, no session, no external inference, and no profile-local skill or benchmark helper. Installed Pi/Fabric were ordinary declared harness dependencies resolved through `node_modules`; no private Fabric path was imported.

## Gate results

### Clean package/install/reload E2E

```sh
node --import tsx --test tests/package/pr1-source-install-e2e.test.ts
```

PASS: **1/1**, 0 failed/skipped, 4761.812246 ms in the direct repair probe. The same case also passed inside normal `npm test`.

The test:

1. Ran `npm pack --ignore-scripts --json` without a prepack hook.
2. Installed the tarball with `npm install --ignore-scripts --offline --no-audit --no-fund` into a disposable fixture that declared `pi-fabric@0.83.0`.
3. Verified `dist/`, `.test-dist/`, certification payloads, and an export directory were absent from the Arbor tarball and installed Arbor package. Fabric's declared harness package retains its own normal upstream `dist/`.
4. Imported `pi-fabric-arbor` from its exported `.ts` source through `tsx` and executed the installed `.mjs` CLI.
5. Loaded the installed package through Pi's package settings and actual extension loader.
6. Observed exactly one Arbor extension command and one `skill:fabric-arbor`; coordinator, executor, and literature Markdown did not register as skills.
7. Read every declared skill, role, reference, and Web asset from the installed package.
8. Edited the installed `pr1-source-a` sentinel, invoked a fixture command that calls actual Pi `ctx.reload()`, and observed `pr1-source-b` from the reloaded extension.
9. Observed no `agent_start`, Arbor run/actor storage, database, JSONL research state, export, or external inference from normal registration and read-only commands.

### Targeted and normal source tests

```sh
npm run test:source:retained
```

PASS: **92/92**, 0 failed/skipped. The final `npm test` invocation completed this lane in 15618.487994 ms; `npm run check` repeated it in 15694.158066 ms. The lane directly executes `.ts` with the declared `tsx` loader and covers:

- all decimal arithmetic, normalized/public schema, and state-machine cases under `tests/model/`;
- Git fingerprint source noninterference with 100 dirty-checkout oracle trials plus mutation quarantine, the original independent oracle implementation loaded through declared `tsx` without a new subprocess runtime, workspace isolation, source/index/ref preservation, detached promotion construction, and exact winner/rollback-ref CAS;
- all persistence and artifact cases;
- dispatch crash classification, outbox idempotency/uncertainty, report publication/conflict, cleanup ordering, the 19 x 20 process-kill fault matrix, application recovery classifications, evaluator/report crash boundaries, and complete/failed/terminal reporting;
- duplicate/concurrent command behavior and stale fences;
- strict evaluator parsing, malformed/stale/unknown-field rejection, and finalization scope checks;
- source-executed runtime/Web component and fixture-provider characterization; and
- the retained fixture application flow and persistence-only start behavior.

```sh
npm test
```

PASS: package/install **5/5** plus retained source **92/92**, for **97/97** total with 0 failed/skipped. `npm test` calls the named retained lane through `test:source`; `npm run check` calls `npm test` after both no-emit checks. The five package cases cover the active manifest, passive source extension, all package assets, read-only Web source, CLI mutation rejection/noninterference, clean pack/install, and reload.

The CLI test rejected these verbs with exit 2 in the same unchanged real-filesystem fixture: `setup`, `start`, `pause`, `resume`, `cancel`, `steer`, `keep`, `discard`, `review`, `apply`, `undo`, `undo-apply`, `export`, `generate`, `serve`, `authorize`, `certify`, and `cleanup`. Inspection, replay, packaged-asset reads, and existing-artifact retrieval preserved the fixture fingerprint; installed asset reads created no export directory.

### Source no-emit checks

```sh
npm run typecheck
npm run typecheck:test
```

PASS and PASS. Both TypeScript configurations set `noEmit: true`; neither command creates runtime output. Final `npm run check` passed both checks and repeated all 97 normal tests.

### Package and boundary scans

```sh
npm pack --dry-run --ignore-scripts --json
```

PASS: **25 files**, prohibited inventory `[]`. The inventory contains source entries, one `.mjs` launcher, one public skill, six internal role/reference documents, three read-only Web assets, and documentation/license files. It contains no emitted directory, certification payload, legacy source entry, or obsolete binary.

A mechanical Node manifest scan reported:

```text
main: ./src/package.ts
types: ./src/package.ts
exports: ., ./extension, ./assets
bin: pi-fabric-arbor -> ./bin/pi-fabric-arbor.mjs
Pi extension: ./src/extension.ts
Pi skill: ./skills/fabric-arbor/SKILL.md
failures: []
```

A bounded grep over active packaged sources/tests found no absolute profile path, blacklisted Pi root, benchmarking-skill dependency, `pi-fabric/src`, or private `pi-fabric/dist` import. Final `git diff --check` passed.

### PR0 coverage choice

The approximately 114-second `npm run test:pr0:e2e` lane was not rerun for this repair. No repair changed `src/pr0/`, `tests/fixtures/pr0-owner-local-extension.ts`, or the PR0 integration tests; the touched legacy fingerprint/Web source paths are not on the PR0 owner-local execution path. The prior 11/11 PR0 evidence remains recorded in `docs/pr0-owner-local-evidence.md`, but it is not represented as a fresh repair run.

## Acceptance boundary

- **A01:** PASS for source extension, strictly read-only CLI, source tests, read-only assets, clean install, and actual reload with emitted directories absent from Arbor package/fixture.
- **A30:** PARTIAL. Independent package contents and declared dependency resolution pass. PR12's research-view reuse of Fabric participant/log/activity facilities is not implemented.
- **A17/A22:** only their PR1 packaging boundaries are observed: current CLI/Web assets are read-only and exactly one Arbor skill is discovered. Shared research projections, four facade/six owner operations, and complete user journeys remain later work.

No production Arbor component, provider, actor, evaluator, setup/doctor command, research mutation, review/apply route, Web server, export generator, or PR2+ behavior is implemented or accepted.

## Legacy characterization limitation

The legacy v1 implementation and retained user/certification artifacts remain on disk for the PR13 deletion gate but are excluded from active exports, bins, Pi registration, and npm inventory. `src/legacy/extension-v1.ts` explicitly preserves the old extension for the source-executed provider/component characterization tests.

These exact test groups remain historical and are excluded from normal `npm test`:

- `tests/authorization/trusted-principal.test.ts` and `tests/promotion/application.test.ts`: superseded local-key/TTY authorization, admission, and certificate-bound promotion workflow.
- `tests/certification/*.test.ts`, including `phase4-recovery-artifact.test.ts`: retained B0-B12/Phase 5-7 certificate and distribution artifacts. The recovery artifact assertion was moved intact out of the active fault-matrix file; it now invokes its TypeScript binary with declared `tsx`, but old signed digests are expected to drift when active source changes.
- `tests/compatibility/{cli,fail-closed,phase4-surface,phase5-surface,production-admission,supported-versions}.test.ts` and `tests/integration/real-fabric.test.ts`: obsolete emitted CLI/subpath contracts, exact 0.76/0.77 admission matrices, and legacy production certification.
- `tests/containment/bubblewrap.test.ts`, `tests/evaluation/{confined-process,held-out-isolation}.test.ts`, and `tests/phase7/hardening.test.ts`: removed Bubblewrap/process-group/sealed-held-out/hardening gates.
- `tests/web/{detached-server,detached-sqlite,intents-redaction,phase6-server,response-schemas}.test.ts`: superseded writable intent, CSRF/origin, and Web-mutation/security protocol. The narrower component lifecycle characterization remains active and now loads unhashed source Web assets in memory without emitted files.
- `tests/e2e/phase7-acceptance.test.ts`, `tests/cleanup/manifest-adapter.test.ts`, and `tests/retention/policy.test.ts`: signed Phase 7 ceremony, certified cleanup manifest, and legal-hold retention policy removed by the v2 plan.

PR0 plan/owner-local tests remain separate named lanes, not historical tests. None of the historical groups above is skipped inside the active lane, reintroduced as a certification gate, or claimed to pass. Their assertions were not loosened. Useful model, Git, persistence/artifact, recovery/report, concurrency, evaluator-parser, fixture-flow, and component/provider assertions run from source in the 92-test normal lane.
