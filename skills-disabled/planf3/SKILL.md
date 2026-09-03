---
name: planf3
description: Use for implementation or knowledge-work plans, approach decisions, disposable plans-of-attack for answer-seeking requests, deeper review, surgical plan revision/reference refresh, or execution from a current PlanF3 plan.
---

# Plan F3

PlanF3 manages one-page HTML plans. Select one workflow and load only its routed files.

## Variables

```text
USER_PROMPT: $1
QUESTIONABLE: $2 (default false; true values: true, 1, yes, on)
SKILL_DIRECTORY: directory containing this SKILL.md
VALIDATOR: SKILL_DIRECTORY/scripts/validate-plan.mjs
PLAN_OUTPUT_DIRECTORY: docs/specs/
PLAN_FILE: PLAN_OUTPUT_DIRECTORY/<descriptive-kebab-name>.html
CONTEXT_HELPER: SKILL_DIRECTORY/scripts/context-slice.mjs
```

Ask for the request when `USER_PROMPT` is empty.

## Shared contract

- Read `references/content-contract.md`, `references/presentation-contract.md`, and `references/information-design.md`.
- Current plans use one full-width page shell, the pinned source meta, one canonical style, and one embedded runtime. Emit no format discriminator.
- Present semantic records as editorial ledgers. Phases use full-width owner/detail ledgers with visibly owned unit lanes, collapsing to one column on narrow screens.
- Dependencies are ordering authority. Executable phases/units expose derived wave and work mode, a visible Execution order field, and one exact SVG branching projection first in `#phases`; its grouped HTML fallback remains source-visible and authoritative for links/waves.
- Code units own Before/After File Impact deltas. Unit-owned code snippets use one shared terminal-audit source/illustrative figure: source excerpts retain full guards and exact per-line numbers; illustrative snippets are visibly labelled non-authoritative intent. Every profile owns one global, reusable 3-6 scorecard Key metrics overview immediately after the hero and before Goal and Scope.
- Hero observability is inventory only. Lifecycle statuses remain `[]`, `[wip]`, `[x]`, `[f]`; visual tones never change status text.
- Saved plans contain no placeholders. Preserve seven metadata hooks, immutable `created`, append-only lifecycle lists, stable IDs, and `#amendments`.
- Run `node "$VALIDATOR" "$PLAN_FILE"` after Create/Update and before Build; run `node "$VALIDATOR" --complete "$PLAN_FILE"` after Build.

## Workflow router

| Workflow | Trigger | Read |
| --- | --- | --- |
| Create Plan | New plan/spec/design, answer-seeking, or approach request | `workflows/create-plan.md` |
| Deepen Plan | Explicit deepen request; confidence review after substantial Create | `workflows/deepen-plan.md` |
| Update Plan | Surgically revise a current plan | `workflows/update-plan.md` |
| Update References | Refresh metadata or relationships | `workflows/update-references.md` |
| Build Plan | Execute an approved current code/knowledge plan | `workflows/build-plan.md` |
