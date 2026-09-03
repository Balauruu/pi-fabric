# PlanF3 report composition patterns

Report patterns are optional source-visible presentation projections. They use `data-planf3-report-pattern`, never add semantic IDs or hidden JSON, and never drive lifecycle or Build. Keep `REQ/DEC/EVD/PHS/UNT/CHK/VAL`, unit-local File Impact, and phase handoff authoritative. Use `.ve-status` or namespaced data tokens for visual state, never lifecycle `.status`.

## Selection and anatomy

- **Executive summary**: `executive-summary` wraps concise narrative in `.report-narrative`. Precede major report sections with visible sequential two-digit `data-planf3-section-ordinal` kickers.
- **Repository KPI dashboard**: `kpi-dashboard` owns 1-6 `data-planf3-kpi` articles. Each declares `data-planf3-kpi-source="author|derived"`, tone `positive|negative|warning|info|neutral`, and one visible value and label; trend is recommended. Include exactly one `data-planf3-housekeeping="status"` row.
- **Architecture**: `architecture-diagram` uses the existing `.diagram-shell` contract, a changed-state legend, and kind `architecture|flow|sequence|state|topology`.
- **Before / After**: `comparison` owns exactly one `.report-comparison-pair` for each `data-planf3-side="before|after"`. Each pair contains exactly one visible direct child header and body distinguished by `data-planf3-comparison-part`, so responsive stacking preserves each header/body relationship. Repeat the whole pattern for independent changes.
- **Resolution paths**: `resolution-path` uses the diagram contract plus a visible `data-planf3-resolution-label`. Prefer state or sequence Mermaid source for lifecycle and call resolution.
- **File Map**: `file-map` declares numeric total and changed attributes and has collapsible `details` groups `source` and `tests`. Every entry has a repo-relative path and `NEW|MOD|DEL|unchanged`. Actionable paths exactly equal unique File Impact paths; unchanged entries carry `data-planf3-context="only"` and are never authority.
- **Test comparison**: `test-comparison` uses the same responsive-safe paired Before/After anatomy and describes coverage behavior, not invented percentages.
- **Review findings**: `review-findings` owns one or more `data-planf3-review-item` entries with kind `good|bad|ugly|question`, visible title, grounded prose, source locator, and resolvable `data-planf3-links` to semantic records.
- **Decision Log**: `decision-log` contains the authoritative `DEC-*` records. Optional `data-planf3-decision-confidence="high|medium|low"` requires a visible `.decision-confidence` label with the same value and may supplement but never replace required provenance, alternatives, rationale, links, status, or revisit.
- **Code excerpt**: `code-excerpt` wraps exactly one shared terminal-audit `code-snippet` source variant with one guarded code body, exact authored per-line numbers, one visible `data-planf3-code-file-header`, and exact source/range labels. All snippet hash, ownership, path, range, purpose, and size guards apply. Use the shared illustrative variant without `code-excerpt` for proposed code, pseudocode, or commands that are not current source.
- **Re-entry**: `re-entry` owns visible `phase-handoff`, `remaining-checks`, `risks`, and `next-commands` blocks grounded in the corresponding current plan content.

Page compositions use the same anatomy. Choose dashboard, split, diagram, table, code, or narrative regions by information shape. Preserve fallbacks, print, responsive layout, reduced motion, and static completeness. Remove template authoring exemplars before saving.
