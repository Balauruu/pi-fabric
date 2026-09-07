**PASS**

Deterministic equal-priority order:

1. **T0002** - Created 2026-01-01
2. **T0001** - Created 2026-01-02
3. **T0003** - Created unknown
4. **T0004** - Created unknown

Verified:

- Local tickets persist immutable `Created` metadata: `references/templates.md:62`, applied by local fallback via `references/tracker.md:27`.
- Main work selection delegates to the canonical ordering: `SKILL.md:70` → `references/state.md:64`.
- Failed/stale dependency semantics remain intact:
  - completed `fail` does not satisfy required `pass`;
  - stale or unknown applicability remains unsatisfied.
  - Evidence: `references/state.md:54-62`, `references/templates.md:143-156`, `references/tickets.md:73-75`.
- Planning semantics remain intact: Investigation, Experiment, Decision, and Design are allowed; Enabler only supports planning work; Implementation, Verification, and Release remain delivery-only (`SKILL.md:41-56`).

Read-only review completed. No edits.