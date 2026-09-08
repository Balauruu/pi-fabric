# Arbor implementation guidance

Follow `../docs/Arbor/deep-refactoring-plan.md`. Current verification/publication belongs in `acceptance-ledger.md` and `docs/pr13-cutover-evidence.md`; historical evidence is not an active gate. Human usage belongs in README/consumer docs and role procedures in the single public skill.

## Cutover and validation

- Never restore v1 admission/protocol/driver/authorization/certification/Phase 7, writable Web, emitted consumers, legacy readers or migration bridges. Source rollback uses Git.
- Preserve existing user runtime data, keys, reports and artifacts. Tracked fixture deletion never authorizes runtime cleanup. Do not scan/import historical runs.
- Run `npm run check`, `npm run test:pr13`, `npm run test:pr13:e2e`, `npm run audit:pr13` and impacted native lanes. Preserve useful contracts against current interfaces, not the retired test runtime.
- Keep product source reachable from source exports/extension/read-only CLI. Ship roles, references, manifest, browser and all examples. No build/prepack, private Fabric import, hidden profile helper, new SDK/runtime/broker or participant registry.
- Real source/installed native Pi/Fabric and browser evidence is mandatory. Graphs, builds and simulated engines are not acceptance. Preserve A12 workloads, atomic reservations, three warmed waves, actual overlap and 80% oracle.

## Ownership and policy

- One passive configured application registers one operational owner and one non-operational scoped drain. The parent never waits for child readiness; native work starts after owner activation.
- Preserve original captured `context.call`/signal, exact native requirements and finite definition-time optional catalog refs. Only the owner dispatches/collects. The proposal actor cannot mutate, approve itself or gain Arbor/lifetime capabilities.
- Preserve the complete public manifest, acquisition-only lease and single public skill. Internal roles are not registered skills. Intended caller is not an invented ACL guarantee.
- Admission requires read-only current-generation guard status and acquired/unreleased lease. Preserve monotone draining/post-await checks. Internal exact-owned cleanup must not traverse this gate.
- Teardown: admission withdrawal, real scoped generation disposal, native owner unload/abort, eventual provider storage close. Register cleanup before preparation/provision; preserve partial activation/failure evidence and support for old readers. Cache cleanup failures; never close storage in the lease inverse.
- Target root application reload. Owner-only/dependency/provider replacement needs separate proof. Catalog changes require quiescent maintenance/re-registration.
- All mutations use ordinary owning-Pi Fabric policy. Agent-risk start/control cannot hide execute/write effects. Resume requires a bound agent-risk intent and separately admitted single-consumption execute claim. Separate user invocations need separate IDs; quiescent exact closed-request replay returns the prior receipt without effects, never rebased to the latest revision.
- Queuing, domain receipts and native settlement differ. Track creates before dispatch; await asks/waits/stops and late-result cleanup. Only exact local terminal evidence releases ownership. Unknown, malformed, mesh-shaped and mismatched results remain unresolved with artifacts retained.

## Research and material

- ResearchStore alone owns domain truth. Preserve bounded closed schemas, revisions/reservations, immutable provenance and terminal monotonicity. Complete admission awaits before duplicate checks/reservation, including role reads.
- Preserve original source/index/refs, selected dirty content, modes, symlinks, staged deletions, stash and sibling worktrees. Only proven settled writers may freeze/restore owned candidates. Trusted worktrees are not containment; unsupported sparse/submodule/merge/snapshot cases refuse explicitly.
- Exact current-incumbent BigInt comparisons are authoritative. Freeze expected native/provider bindings before awaits; never grade against mutable callee requests. Persist invocation/completion before ingestion. Unknown handles block without redispatch; invalid/check/timeout/tie evidence cannot promote.
- Keep held-out/final separation, exact attempt/evaluation links and reserved checks/judges/retries. No held-out leakage into ordinary ideation/ranking/lessons. Changed combined material requires reevaluation and exact Git CAS intent/reconciliation.
- Recheck cumulative attempt/evaluator/active/artifact admission before each new effect and after awaited catalog checks. Observational costs are not hard enforcement. Reserve complete waves atomically; never borrow sibling credits.
- Resume saved native owner/material/roles/spec explicitly. Package-resolved role bundles are immutable; candidate collisions cannot replace them. Explicit role revision is append-only attribution.
- Genuine owning-Pi review is separate from permission and binds the exact pending choice. Source apply/undo preserves newer edits with per-path pre/postimages and original intent across recovery. Continuation is newly charged work, not reuse of uncertainty.
- Grounding is finite definition-time search/fetch plus native literature evidence. Preserve visited text and exact source/run/revision/digest/request provenance. No guessed recovery, snippet-as-fact, fallback runtime or novelty classifier. Lessons are hypotheses; delayed trajectories retain original revision/incumbent.

## Reads and packaging

- Pi/CLI/browser share transactional projections. Presentation owns selection/listener lifetime only. No browser mutation routes/forms, mutating reads, generated export retrieval or CLI attachment. Reuse Fabric participants/logs/activity.
- Cold readers use disposable read-only SQLite admission and preserve every byte/file, including WAL/SHM on refusal. Preserve original errors/causes and close readers. Only owner setup configures writing; stamp metadata only for fresh initialization, never on quiescent current-schema reopen.
- Export admission covers existing bytes and registration. Final bounded write/receipt has no await. Retain persistence-failure files, permit identical retry and reject conflicting bytes. Artifact retrieval never generates output.
- Presets/examples are closed data and bounded owner-authorized preparation. Scaffold only under identity/write policy at safe absent destinations. Never initialize user Git, download datasets/models or install into system Python. No paid experiment inference or upstream validation claim.
