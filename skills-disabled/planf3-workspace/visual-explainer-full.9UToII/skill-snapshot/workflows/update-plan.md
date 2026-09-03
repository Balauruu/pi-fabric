# Update Plan

Completion means only the requested plan content and directly affected visuals changed, metadata and Amendments were appended, and the result validates.

1. **Identify the plan** - Resolve the target `.html` file from `USER_PROMPT` and read that existing plan.
2. **Preflight** - Run `node "$VALIDATOR" "$PLAN_FILE"`. If an older plan lacks current hooks, make only local, unambiguous hook repairs needed for this update; report broader migration needs rather than replacing the document from the template.
3. **Scope the change** - Identify the exact sections, tasks, metadata fields, and visual IDs whose meaning changes. When present, include only affected plan-brief cells and navigation anchors in scope. Preserve unrelated content and stable hooks.
4. **Apply the content change** - Edit the relevant HTML in place. Keep an existing plan brief consistent with the detailed sections and keep every navigation link paired with a real section ID. Saved-plan content is concrete HTML, so never introduce or preserve `{{...}}` authoring placeholders.
5. **Refresh named visuals when necessary** - Create an explicit `REQUESTED_VISUAL_IDS` set containing only visuals requested by the user or made inaccurate by the content change. If non-empty, read and run `workflows/visual-explainer-integration.md`; otherwise leave every visual byte-for-byte unchanged and do not load the visual reference.
6. **Append metadata** - Append the current ISO timestamp to `data-planf3-meta="modified"` and current agent/session values when available. Replace `None` on first append and do not duplicate entries.
7. **Append an amendment** - Remove `<p data-planf3-empty="amendments">` on the first update, then append one concrete `<details>` entry at the bottom of `#amendments` with timestamp, summary, and rationale.
8. **Validate and review presentation** - Run `node "$VALIDATOR" "$PLAN_FILE"` and fix every new failure. If the update changed layout, navigation, tables, or visuals, verify anchors, wrapping, contained table scrolling, and desktop/narrow viewport overflow with browser tools when available.
9. **Report** - Report changed sections, refreshed visual IDs, presentation checks performed, and the amendment.
