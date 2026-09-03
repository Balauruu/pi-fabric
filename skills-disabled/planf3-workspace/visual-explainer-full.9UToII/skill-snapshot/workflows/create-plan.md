# Create Plan

Completion means a validated, self-contained plan exists at `PLAN_FILE`, with no unresolved placeholders or visual slots.

1. **Resolve the request** - Parse `USER_PROMPT`, decide the concrete planning outcome, and resolve `QUESTIONABLE` from its documented true values.
2. **Research before layout** - Read relevant project instructions, README and architecture docs, existing specs, source, and tests. Collect evidence for entry points, precedents, affected modules, public interfaces, tests, configuration/schema/data, and documentary constraints. Distinguish observed current state from proposed decisions; finish when the plan can name its seams and files from evidence.
3. **Load the Create scaffold** - Read `SKILL_DIRECTORY/assets/plan-template.html`.
4. **Design and map coverage** - Define the solution, edge cases, error handling, validation strategy, and ordered phases. Prefer existing project patterns and dependencies. Before rendering HTML, cover goal and out-of-scope work, current state, proposed design, implementation sequence, file map, interfaces/contracts, risks/decisions, test coverage, and observable acceptance criteria. Merge trivial content, but do not omit a category silently.
5. **Choose the destination** - Create `PLAN_OUTPUT_DIRECTORY` if needed and select a descriptive kebab-case filename.
6. **Populate the scaffold** - Replace every `{{...}}` placeholder with concrete HTML or `None`. Keep the first-viewport plan brief to one short outcome, scope boundary, primary implementation seam, and acceptance signal; details belong in sections. Use semantic tables for matrices, real lists for sequences, and native `<details>` only for secondary evidence. Wrap wide tables in `.table-wrap` and use `.plan-table`. Initial metadata uses:
   - `created`: current ISO timestamp.
   - `modified` and `commits`: `None` unless real entries already exist.
   - `agent` and `session`: current values when available, otherwise `None`.
   - back/forward references: concrete relative links when known, otherwise `None`.
   - Amendments remains the template's concrete `No amendments yet.` state.
7. **Create executable phases** - Give every phase, task, checklist item, and global validation item a unique stable hook and one status marker. Use this shape:

```html
<div class="phase" data-planf3-phase="1">
  <h3><code class="status">[]</code> Phase 1: Name</h3>
  <p>Outcome and boundaries.</p>
  <div class="task" data-planf3-task="1.1">
    <h4><code class="status">[]</code> 1.1 Task name</h4>
    <ul class="checklist">
      <li data-planf3-check="1.1.1"><code class="status">[]</code> Specific action</li>
    </ul>
  </div>
  <div class="task" data-planf3-task="1.2">
    <h4><code class="status">[]</code> 1.2 Testing Strategy</h4>
    <ul class="checklist">
      <li data-planf3-check="1.2.1"><code class="status">[]</code> <code>validation command</code> - what it proves</li>
    </ul>
  </div>
</div>
```

Global validation items use `data-planf3-validation="global-1"`. Every phase ends with a Testing Strategy task containing runnable commands or concrete manual checks.

8. **Handle Questionables** - When `QUESTIONABLE` is true, replace `QUESTIONABLES_SECTION_HTML` with a concrete `<section id="questionables">` containing one `<details>` entry per open decision, assumption, or risk. Otherwise replace it with an empty string.
9. **Select visuals by information shape** - Use a visual only when relationships, branching, or ordered boundaries are materially clearer with connectors. Keep comparisons, file maps, contracts, risks, and test matrices as semantic tables; keep linear implementation work in phases; keep secondary evidence in `<details>`. Each visual slot has a unique `id`, `type`, `takeaway`, and nearby `context`. Record those IDs as the exact `REQUESTED_VISUAL_IDS`; do not create default hero, problem, or solution slots.
10. **Save the draft** - Write the complete scaffold to `PLAN_FILE`. At this point every `{{...}}` token is gone. Only explicitly requested temporary visual slots may remain.
11. **Integrate requested visuals** - If `REQUESTED_VISUAL_IDS` is non-empty, read and run `workflows/visual-explainer-integration.md`. Otherwise skip visual work without loading its reference.
12. **Validate** - Run `node "$VALIDATOR" "$PLAN_FILE"` and fix every failure.
13. **Review presentation** - Check that the plan brief and section navigation expose the decision path before detail, headings are semantic, anchors resolve, long paths wrap, tables scroll inside their containers, and the page has no horizontal overflow at desktop or narrow viewport widths. Use browser tools when available; otherwise inspect the markup and shared responsive CSS. Keep critical risks and acceptance criteria expanded.
14. **Report and preview** - Summarize the plan and provide `PLAN_FILE`. Open it only when an interactive browser is available or the user requested a preview; inability to open a browser does not invalidate the plan.
