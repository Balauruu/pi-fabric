# Visual Explainer Integration

Run this subworkflow only with a non-empty explicit `REQUESTED_VISUAL_IDS` set. Visual generation is patch-only; final integration happens after the patch is complete.

## Inputs

- `PLAN_FILE`: saved draft or existing plan.
- `PATCH_FILE`: `/tmp/planf3/<plan-basename>.visual-patches.md`.
- `REQUESTED_VISUAL_IDS`: ordered IDs selected by the calling workflow.

## Workflow

1. **Load the contract** - Read `SKILL_DIRECTORY/references/visual-patch-contract.md` and the nearby plan content for every requested ID.
2. **Resolve targets** - Confirm each requested ID occurs exactly once as `data-visual-id` in `PLAN_FILE`. A Create target is normally `.visual-slot`; an Update target may already be `.vx-visual`. Stop before mutation if any requested target is missing or duplicated.
3. **Generate the patch** - Create `/tmp/planf3` if needed and write exactly one `PATCH_FILE` using the reference's patch format. During this step, do not edit `PLAN_FILE`.
4. **Check patch scope** - Parse the `## visual: <id>` headings and confirm their ordered set equals `REQUESTED_VISUAL_IDS`. Reject missing, duplicate, or extra IDs. Confirm every root figure repeats the matching `data-visual-id` and every CSS selector is rooted at that ID.
5. **Integrate HTML** - Replace exactly one target figure per requested ID with its complete patch HTML. Leave every unrelated visual unchanged.
6. **Integrate CSS** - For each requested ID, replace its existing region or insert a new region immediately before `/* PLANF3:VISUALS:END */`:

```css
/* PLANF3:VISUAL:<id>:START */
...requested-ID-scoped CSS...
/* PLANF3:VISUAL:<id>:END */
```

If the patch CSS block is empty, remove any old region for that ID and rely on the shared `.vx-*` primitives.

7. **Verify** - Confirm requested slot comments are gone, unrelated visual HTML/CSS is unchanged, exactly one canonical style block remains, and no patch defines `:root` or page-level selectors.
8. **Validate** - Run `node "$VALIDATOR" "$PLAN_FILE"` and resolve every failure.
9. **Clean up and report** - Delete `PATCH_FILE` after successful integration. Retain it only after a failed integration for recovery. Report requested IDs, integrated IDs, validation performed, and remaining factual uncertainty.
