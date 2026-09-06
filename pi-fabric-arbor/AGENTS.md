# pi-fabric-arbor guidance

## V2 replacement work

- Follow `../docs/Arbor/deep-refactoring-plan.md` for the v2 replacement. The owner-local PR0 gate is recorded in `acceptance-ledger.md`; textual checks never substitute for its E2E lane. The revised PR0 falsification gate and repaired PR1 source-install/source-characterization gate pass; PR2 is the next unimplemented dependency. PR1 accepts A01's source-package lane and only the package half of A30; fixture evidence never accepts later production requirements.
- Keep `npm run test:source:retained` source-executed and included in normal `npm test`/`npm run check`. It must retain the named model, Git, persistence/artifact, recovery/report, concurrency, evaluator-parser, and component/provider assertions without emitted paths. Superseded v1 certificate/admission/containment/writable-Web suites remain historical, not active gates, until PR13.
- The managed Arbor component in the owning Pi host owns operational services and deterministic bounded dispatch/collection. Use captured post-activation `FabricComponentContext.call` only for exact declared public Fabric refs.
- The persistent Pi actor chooses research direction through structured `agents.ask` proposals. It cannot mutate Arbor services, approve itself, dispatch workers, or commit domain transitions.
- Only the owning Pi session may mutate, review, apply/undo, or generate exports. CLI and web are strictly read-only in every mode and gain no attachment transport.
- No Fabric API additions, private runtime imports, replacement runtime, broker, daemon, second participant registry, profile-local benchmarking-skill dependency, paid experiment inference, or dataset download.
- Import pi-fabric only through package exports. Never import `pi-fabric/src` or unexported `dist` paths.
- Keep v2 schemas bounded and closed, use exact decimal arithmetic for promotable values, and preserve transactional revision/material/evidence bindings.
- Preserve existing runtime data and artifacts. Update `acceptance-ledger.md` without upgrading evidence status unless the cited behavior was actually run and retained.

## Legacy v1 guidance

The rules below describe the existing v1 certificate/web-intent implementation only. They preserve untouched legacy code during the cut-over, but they do not govern the replacement v2 architecture or create v2 acceptance gates.

- Treat `ArborApplication` as the only legal v1 domain-transition owner. Stores persist atomically but do not invent transitions.
- Keep legacy public, evaluator, and browser schemas versioned, bounded, closed, and synchronized with tests.
- Use integer decimal arithmetic only. Never convert promotable values through `number`.
- Journal durable intent before any external operation and observe interrupted effects before retry.
- Reconcile legacy effects through `EffectRecoveryCoordinator` with exact revision/fence/identity bindings. Never turn `UNCERTAIN` into replay; never signal an unverified PID or descendant unit.
- Keep legacy detached Web code read/inbox-only. Its v1 intent and certificate behavior must not be carried into the strictly read-only v2 web or CLI.
- The private-repository, owner-TTY, certificate, containment, fingerprint, signed Phase 7, hashed `dist/web-assets`, and retained certification mandates are legacy-only. Do not reproduce them in v2.
