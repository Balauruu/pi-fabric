# pi-fabric-arbor guidance

- Treat `ArborApplication` as the only legal domain-transition owner. Stores persist atomically but do not invent transitions.
- Keep public, evaluator, and browser schemas versioned, bounded, closed, and synchronized with tests.
- Use integer decimal arithmetic only. Never convert promotable values through `number`.
- Journal durable intent before any external operation and observe interrupted effects before retry.
- Reconcile through `EffectRecoveryCoordinator` with exact revision/fence/identity bindings. Never turn `UNCERTAIN` into replay; never signal an unverified PID or descendant unit.
- Keep detached Web code read/inbox-only. It may request promotion/rollback and show redacted challenge status, but must not read authorization nonces or keys, sign, acquire a driver lease, evaluate held-out input, or execute effects.
- Construct held-out baseline and candidate trees only in the package private repository with the same detached algorithm. Mutate only the package winner ref through exact-OID CAS; uncertain observations quarantine without guessing.
- Require a fresh owner-TTY authorization and independent Fabric policy decision for every promotion, rollback, and re-promotion. Never reuse consumed authorization.
- Real agents, evaluators, Git mutation, and containment fail closed until their named certificates mechanically validate against the active tool and platform.
- Wrap every production external boundary with before/after repository fingerprint certification and quarantine immediately on mismatch.
- Regenerate retained certificates whenever a certified source tool, adapter, package lock, binary, platform, authorization, held-out policy/input, promotion recovery input, release asset, retention policy, or npm inventory changes. Phase 7 thresholds must be signed before all Phase 7 execution, and Phase 7 evidence is create-only. Generate the distribution certificate last and finish with `npm run verify:certificates`.
- Edit browser sources only under `web/`; `npm run build` owns hashed `dist/web-assets`. Keep cleanup manifest-only and preserve report, journal, authorization, promotion, compatibility, fingerprint, and held-out evidence.
- Import pi-fabric only through its package exports. Never import `pi-fabric/src` or unexported `dist` paths.
- Update `acceptance-ledger.md` without upgrading evidence status unless the cited command was actually run and retained.
