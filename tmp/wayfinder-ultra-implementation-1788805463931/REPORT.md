# Wayfinder Ultra implementation results

## Delivered

New manually invoked skill: `skills/wayfinder-ultra/SKILL.md`, with four directly linked references for ticket contracts, state/dependencies, tracker operations and templates. No extension installed and no original skill/configuration edited.

## Baseline

A fresh worker inspected unchanged Wayfinder. It found four original types, closure-only dependency readiness, assignment-only claims, and no separate design/implementation/verification/release contracts or revision-bound result semantics. See `baseline.md`.

## Acceptance evidence

- Standalone skill validator: valid frontmatter, local links, five reachable files.
- Installed Pi explicit-directory loader: discovers exactly `wayfinder-ultra`, zero diagnostics, manual-only metadata and hidden automatic prompt entry verified. No blacklisted profile loaded.
- Eight exact labels and input/resolution/completion contracts mechanically asserted.
- Fresh behavioral probe: eight classifications and eight adversarial cases covered failed verification, stale revisions, planning/authority, inconclusive evidence, conflicting claims, rolled-back release, capacity/recovery and opt-in migration. See `behavior.md`.
- Independent review found one defect: missing persisted ticket creation time. Fixed by adding immutable UTC Created metadata and canonical ordering with explicit unknown-legacy fallback. Held-out ordering and original safety controls passed in `ordering-recheck.md`.
- Real disposable local tracker test: agent read actual config.txt, claimed and resolved T0001, wrote source-identified evidence and resolution, refreshed downstream applicability and map index, and released its claim. T0002 remains open awaiting the owner and the map remains unachieved. Main inspected all four resulting artifacts and mechanically checked state, source hash, local links, one-resolution-only behavior and capacity. See `local-smoke.md` and `fixture/`.
- Original Wayfinder SKILL.md matches its pre-task snapshot exactly. The pre-existing deleted `skills/engineering/wayfinder/agents/openai.yaml` was not restored or otherwise changed. Other concurrent work preserved.

## Limits and stop reason

The skill is instruction-based, not a transactional tracker or permission sandbox. No live GitHub, merge, deployment, multi-writer race, provider capacity limit or crash recovery integration was exercised. Pi explicit-path discovery was tested, not the already-running TUI's command refresh. Manual invocation is intentional, so automatic casual/typo triggering is not promised. Behavioral evaluation uses small fresh probes and one real local happy path, not statistical efficacy claims.

All implementation criteria are covered at the stated levels; the sole review defect was repaired and rechecked. Stop at this evidence rather than installing integrations or extending scope.

## Use

In a new/reloaded Pi session: `/skill:wayfinder-ultra` followed by an idea, a map path/URL, or a map and named ticket. The original `/skill:wayfinder` remains separate.
