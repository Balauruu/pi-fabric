# pi-fabric-arbor guidance

## V2 replacement work

- Follow `../docs/Arbor/deep-refactoring-plan.md` for the v2 replacement. The owner-local PR0 gate is recorded in `acceptance-ledger.md`; textual checks never substitute for its E2E lane. Use `src/managed/` for the production owner execution path and `npm run test:pr2:e2e` for its real-host gate; the PR0 probe is not the production driver. Keep broader acceptance and observed limitations in the ledger, never infer later production acceptance from fixture results.
- PR3's acceptance and native evidence are recorded in `acceptance-ledger.md` and `docs/pr3-interface-evidence.md`. Use `npm run test:pr3:e2e` for its real native gate, not deferred-only review fixtures. Preserve the actor -> settlement -> RPC user review path, exact stale bindings, approved-direction dispatch admission, renewed-review revocation (including rejection and historical receipt replay), immutable artifact identities/provenance, terminal monotonicity, and successful host-exit assertions.
- PR4 evaluator ownership lives in `src/evaluators/` over the existing managed execution adapter. Run `npm run test:pr4` and `npm run test:pr4:e2e`; the latter uses the actual installed/source product, native Pi/Fabric and deterministic local inference. Keep exact committed-material evaluation separate from later dirty capture/candidate generation and incumbent adoption.
- Snapshot detached, recursively immutable expected native/provider bindings before awaits; never validate replies against callee-mutable requests or retain reply aliases across further awaits. Preserve committed executable flags in exact-material identities and verify mode drift. Treat filenames as data using prototype-free maps; verify persisted selected-file coverage and reject inherited prompt entries.
- Persist evaluator invocation reservations and native completion before grading. Judge infrastructure faults must interrupt, not become invalid grades; completion requires every invocation ingested. Resume must explicitly validate the saved owner/component/material/OID/epoch/definition/catalog/request bindings, reconstruct the native owner, and re-observe known handles. Unknown handles block without redispatch. Keep generation history, native execution, validity, quality, descriptive interpretation and incumbent decisions separate.
- Command effects must enter through execute-risk `arbor.evaluate`; an agent-risk `arbor.start` or `arbor.control` cannot directly run/resume a command evaluator. Owning-Pi command programs compose the public actions under normal Fabric policy. Keep the CLI/browser read-only, including example assets: do not add a mutating helper CLI.
- Optional evaluator refs come only from the finite catalog read before definition registration. Validate the committed descriptor identity and effective schemas/risk/effect before calling a selected action through captured `context.call`. Catalog changes require explicit quiescent maintenance/re-registration and reconciliation, never a run-triggered reload or generic provider transport. Preset selection uses property presence: explicit/project null disables lower-precedence inheritance without reading the shadowed file.
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
