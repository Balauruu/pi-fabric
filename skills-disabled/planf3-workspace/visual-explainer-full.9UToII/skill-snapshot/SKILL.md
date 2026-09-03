---
name: planf3
description: Use when the user asks to plan, spec, or design implementation work, revise an existing HTML plan, refresh its metadata or cross-references, or execute work from one.
---

# Plan F3

PlanF3 manages the full lifecycle of a self-contained HTML implementation plan: create, update, cross-reference, and build. Select one workflow from the user prompt and load only that branch's files.

## Variables

```text
USER_PROMPT: $1
QUESTIONABLE: $2 (default false; true values are true, 1, yes, or on, case-insensitive)
SKILL_DIRECTORY: directory containing this SKILL.md
VALIDATOR: SKILL_DIRECTORY/scripts/validate-plan.mjs
PLAN_OUTPUT_DIRECTORY: docs/specs/
PLAN_FILE: PLAN_OUTPUT_DIRECTORY/<descriptive-kebab-name>.html
```

Positional variables are the invocation contract. If `USER_PROMPT` is empty, ask the user for the planning or lifecycle request before proceeding.

## Shared plan contract

- A saved plan is one well-formed, self-contained `.html` file with exactly one `<style id="planf3-style">` block, no `<script>` or resource-bearing media elements, and no linked styles, fonts, images, or runtime dependencies. Escape literal HTML markup inside code examples.
- New Create plans use the template's compact first-viewport brief, section navigation, and evidence-backed coverage; Update refreshes those presentation seams only when they already exist and their meaning changes.
- Saved plans contain no `{{...}}` placeholders and no unresolved `VISUAL_SLOT` comments.
- `created` is immutable. `modified`, `commits`, `agent`, `session`, `back-references`, and `forward-references` are append-only lists. Replace `None` on the first append and do not duplicate entries.
- Preserve machine-addressable hooks when editing: `data-planf3-meta`, `data-planf3-phase`, `data-planf3-task`, `data-planf3-check`, `data-planf3-validation`, `data-visual-id`, and `#amendments`.
- Status markers are `[]` idle, `[wip]` in progress, `[x]` complete, and `[f]` failed. Store status only in the associated `<code class="status">` element.
- PlanF3 owns the page theme and canonical `--plan-*` tokens. Visual patches consume those tokens and may add only requested-ID-scoped CSS.
- Resolve bundled paths relative to `SKILL_DIRECTORY`. Run `node "$VALIDATOR" "$PLAN_FILE"` after Create or Update and before Build, then `node "$VALIDATOR" --complete "$PLAN_FILE"` after Build. Resolve every reported error before reporting success.

## Workflow router

Choose the single best branch. Read only the selected workflow and the files it explicitly points to.

| Workflow | Trigger | Read |
| --- | --- | --- |
| Create Plan | Plan, spec, or design new work when no existing plan is the target | `workflows/create-plan.md` |
| Update Plan | Change, extend, or revise an existing plan | `workflows/update-plan.md` |
| Update References | Refresh metadata or append back/forward relationships | `workflows/update-references.md` |
| Build Plan | Implement or execute work from an existing plan | `workflows/build-plan.md` |

### Conditional visual subworkflow

Read `workflows/visual-explainer-integration.md` only when Create has selected concrete visual slots or Update explicitly affects named visual IDs. No requested IDs means no visual work and no visual reference loading.
