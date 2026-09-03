# PlanF3 Visual Explainer presentation contract v1

## Current one-page document

A current document carries `data-planf3-presentation="current"` and `data-planf3-runtime="visual-explainer-v1"`, the pinned source meta, one canonical `style#planf3-style`, and one embedded versioned runtime. No format discriminator is emitted. Unmarked, legacy, partial-current, or discriminator-bearing documents are invalid.

Create fills `assets/plan-template.html`, inlining `themes.css`, `information-design.css`, and `runtime.js` exactly once. The single canonical style is the exact template composition of theme registry, shared information design, and focused page CSS; later narrowing overrides are invalid. Use native HTML/CSS first. Additional representation dependencies are optional only when the information shape needs them and must preserve visible fallbacks. Semantic content follows `content-contract.md` and `information-design.md`.

## Composition

The shell is `.wrap > nav.toc + main#plan-content`, preceded by a focus-visible skip link. It uses all available width with a minimal responsive gutter and a `120rem` ceiling. Prose stays readable width; structural ledgers, phase rails, definitions, tables, and diagrams use the main column. At narrow widths the TOC becomes a horizontal scroller and phase owner/detail ledgers collapse to one column.

Every phase directly owns one owner column and one unit lane; all phase headings/fields stay in the owner and all owned units stay in the lane. Sequential/parallel indicators, exact-labelled File Impact pairs, code snippet variants, and Key metrics use semantic tones while preserving explicit text. Source and illustrative code share one responsive terminal-audit figure with a visible provenance header, bounded dark code body, and comment-style caption; source alone shows exact authored line numbers, while visible labels prevent illustrative code from masquerading as current source. Metrics use one reusable scorecard overview, a direct ledger and housekeeping row, visible `was ...` trends, planned-target emphasis, and observed-result emphasis after execution. Semantic records remain editorial ledgers, never card grids. The mandatory global `#key-metrics` overview sits immediately after the hero and before Goal and Scope.

`#phases` starts with the mandatory SVG branching execution-order projection for executable profiles. Existing Mermaid support renders one deterministic top-down, one-edge-per-line source into a labelled focusable SVG viewport; exact normalized authority labels and dependency-derived split, convergence, and terminal closeout edges prevent visual drift. No new dependency is added. Its source-visible fallback retains direct phase groups and labelled unit-wave bands so exact links, sequential modes, and parallel sibling topology survive failed rendering and canonical export.

Read retained upstream `css-patterns.md`, `libraries.md`, and `responsive-nav.md` as needed. Retained templates are architecture, data table, and Mermaid flowchart exemplars. Report requests additionally use `report-patterns.md`; projections remain source-visible and do not become authority.

## Runtime and resilience

The toolbar contains exactly theme, color mode, and Download HTML controls. File filtering is section-local. Canonical export clears filters, restores hidden rows, removes generated render state, and retains embedded source/runtime. There is no print/share/search/editing control.

Reveal content is visible before enhancement. Mermaid and Chart.js inputs retain visible semantic fallbacks; charts have accessible names and adjacent JSON source. Tables avoid nested vertical scrolling. Irreducible horizontal scrollers are labelled and keyboard focusable. Images have nonempty alt text. Print CSS hides toolbar/TOC and preserves semantic content.

Seven adaptive themes remain available. Theme and mode changes may re-render optional diagrams/charts without altering lifecycle state. Generated imagery is used only when it carries information unavailable from semantic HTML/CSS or a focused diagram.

## Delivery

Run the validator from the repository root, plus all self-tests. Confirm current markers, canonical CSS/runtime, full-width shell, exact ordering projection, mandatory metrics, File Impact deltas, TOC targets, source-visible fallbacks, and no unresolved placeholders.
