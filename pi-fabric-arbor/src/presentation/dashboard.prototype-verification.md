# Issue #7 textual prototype verification

User selection: O1, recorded verbatim as “I choose O1”. This approves the tabbed
hierarchy, not production behavior or native UI rendering. Closure is pending
separate explicit approval.

Static checks executed through Fabric TypeScript against the complete Markdown:
extract fenced `text` blocks, split into lines, measure maximum line length and
row count. Panels 1, 4, 6 and 8 use 80x24. All others use 40x20. All text panels
are ASCII, so character counts equal terminal columns for these fixtures.

Coverage review: widgets, three layout alternatives, explicit run selection,
keyboard navigation, completion, status/dashboard separation, empty/running/
blocked/stopping/pausing/paused/finalizing/finished states, no-improvement outcome,
end-only final review, advisory final evidence, guarded apply and undo. The
fixture arithmetic is 120 to 108 ms = 10% lower latency. No new lifecycle policy
supersedes the approved #9 resolution.

Limits: static prototype only. No browser, native Pi, integration, source apply,
permission or production test was run. Full repository implementation gates are
not represented as passing. The issue and parent map explicitly exclude production
implementation during this planning phase. GitHub remains the canonical decision
record. The alternatives are archived off main, not production assets.

Publication checks are recorded in the issue comment only after observation:
exact scoped staged diff, whitespace check, ordinary commit/push, remote commit
identity and archive content identity. This file does not preclaim those results.

| Panel | Columns | Rows | Limit | Result |
| --- | --- | --- | --- | --- |
| 1 | 62 | 2 | 80x24 | PASS |
| 2 | 36 | 3 | 40x20 | PASS |
| 3 | 37 | 5 | 40x20 | PASS |
| 4 | 60 | 13 | 80x24 | PASS |
| 5 | 39 | 12 | 40x20 | PASS |
| 6 | 62 | 8 | 80x24 | PASS |
| 7 | 39 | 13 | 40x20 | PASS |
| 8 | 64 | 10 | 80x24 | PASS |
| 9 | 38 | 10 | 40x20 | PASS |
| 10 | 36 | 3 | 40x20 | PASS |
| 11 | 34 | 5 | 40x20 | PASS |
| 12 | 34 | 6 | 40x20 | PASS |
| 13 | 34 | 2 | 40x20 | PASS |
| 14 | 33 | 3 | 40x20 | PASS |
| 15 | 36 | 4 | 40x20 | PASS |
| 16 | 35 | 5 | 40x20 | PASS |
| 17 | 37 | 6 | 40x20 | PASS |
| 18 | 35 | 4 | 40x20 | PASS |
| 19 | 40 | 7 | 40x20 | PASS |
