# Visual Patch Contract

Read this reference only when a Create or Update branch supplies one or more explicit `REQUESTED_VISUAL_IDS`.

## Ownership

PlanF3 owns planning content, slot placement, the canonical Hermes theme in `assets/plan-template.html`, and final integration. The visual branch owns the composition of the requested explainer blocks.

The page's `--plan-*` tokens are the single visual identity source. Visual markup and CSS consume those tokens. Per-visual CSS is scoped to its requested `data-visual-id` and does not define `:root`, page-level selectors, fonts, or theme values.

## Inputs

- `PLAN_FILE`: saved draft or existing plan.
- `PATCH_FILE`: `/tmp/planf3/<plan-basename>.visual-patches.md`.
- `REQUESTED_VISUAL_IDS`: explicit ordered set of visual IDs.

An empty requested set completes as a no-op without creating a patch.

For Create, each requested ID has a temporary slot in the saved draft:

```html
<figure class="visual-slot" data-visual-id="problem" data-visual-type="audit-panel">
  <!-- VISUAL_SLOT id="problem" type="audit-panel" takeaway="Show the capability gap" context="Problem section" -->
</figure>
```

For Update, the target may already be an integrated `.vx-visual`. Address it directly through `data-visual-id`; do not add a temporary slot merely to regenerate it.

## Patch output

The output is exactly one patch file at `PATCH_FILE`. It contains one section for every requested ID, in requested order, and no other IDs.

````markdown
# PlanF3 visual patch v1
requested: problem, phase-2

## visual: problem
selector: figure[data-visual-id="problem"]

### html
```html
<figure class="vx-visual vx-visual--audit" data-visual-id="problem">
  ...complete replacement figure...
</figure>
```

### css
```css
.vx-visual[data-visual-id="problem"] .vx-audit-grid { ... }
```

## visual: phase-2
selector: figure[data-visual-id="phase-2"]

### html
```html
...complete replacement figure...
```

### css
```css
...CSS scoped under .vx-visual[data-visual-id="phase-2"]...
```
````

The HTML block is a complete replacement for the selected figure. The CSS block contains only rules needed by that visual. Use an empty CSS block when the template's shared `.vx-*` primitives are sufficient.

The patch file is the sole generation artifact and contains only the requested replacement figures and per-ID CSS. `PLAN_FILE` remains unchanged until patch generation finishes.

## Representation boundary

Match the representation to the question instead of turning every fact into a diagram:

- Relationships, branching, or rollback boundaries with meaningful connectors → one focused visual.
- Comparisons and file/contract/risk/test matrices → a real semantic table by default. Use a focused visual only when spatial change or likelihood/impact position is the requested takeaway.
- Linear implementation work → PlanF3 phases and checklists unless stage boundaries are the point.
- Secondary evidence → native `<details>`; keep decisions, highest risks, and acceptance criteria expanded.

Prefer a small overview plus section detail when a visual would exceed eight named parts. Avoid uniform card grids when hierarchy, sequence, or tabular structure communicates the content better.

## Composition recipe

For each requested ID, determine:

1. One-sentence takeaway.
2. The conclusion the viewer should reach.
3. Named parts and truthful source data from the nearby plan section.
4. The simplest matching visual type.
5. The minimum HTML and CSS needed to communicate it.

Use semantic headings, lists, tables, cards, badges, callouts, and CSS connectors. The figure should explain its point without requiring a caption.

| Type | Best use |
| --- | --- |
| `comparison-board` | Before/after where spatial change is the takeaway; otherwise use a semantic table |
| `flow-choice` | A decision creates branches and one path is preferred |
| `process-flow` | Three to eight ordered steps without branching |
| `phase-timeline` | Milestones or work across time |
| `risk-matrix` | Likelihood/impact position is the takeaway; otherwise use a semantic table |
| `implementation-map` | Files, components, or layers and their relationships; plain file impact stays tabular |
| `audit-panel` | Capability checks where relationship or hierarchy matters more than a checklist |
| `stat-strip` | A few source-backed metrics carry the conclusion |
| `callout-grid` | Two to four independent concepts genuinely need equal-weight cards |

Choose a bespoke semantic block when none fits rather than forcing a diagram.

## Quality gate

Each returned visual has:

- A visible takeaway and named parts.
- Content derived from the plan rather than invented facts.
- Meaningful connectors and labels where relationships matter.
- Readable contrast, spacing, mobile collapse, and `min-width: 0` on grid/flex children that contain long text.
- Wrapped long paths and contained horizontal scrolling for any wide table or code block; never page-level overflow.
- No empty or decorative-only cards.
- No unlabeled shapes or unexplained arrows.
- No emoji, external assets, chart libraries, Mermaid, D2, or PlantUML.
- Tiny inline SVG only when an icon, arrow, texture, or small custom shape is awkward in HTML/CSS.
- A root `<figure>` with exactly the requested `data-visual-id`.
- CSS selectors rooted at `.vx-visual[data-visual-id="<requested-id>"]`.

Render or inspect the integrated plan when browser tools are available. Otherwise inspect markup and verify the final plan with `node "$VALIDATOR" "$PLAN_FILE"`.
