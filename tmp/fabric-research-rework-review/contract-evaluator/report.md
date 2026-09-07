# fabric-research rework independent evaluation

## Scope and boundary

- **PASS** - Verified before inspection: git root is `/home/balauru/.pi-profiles/fabric/.worktrees/research-skill-rework`, branch is `research-skill-rework`, and `PI_CODING_AGENT_DIR` is `/home/balauru/.pi-profiles/fabric`.
- No shipped skill was edited. No agents, browser automation, installs, configuration changes, commits, pushes, mocks, fixtures, or injected failures were used in this evaluation. `/home/balauru/.pi/agent` was not accessed.
- Fresh inputs read: `skills/fabric-research/SKILL.md`, all four files under `skills/fabric-research/references/`, and `ACCEPTANCE.md`.

## Matrix

| Area | Result | Concrete evidence |
|---|---|---|
| Boundary and profile isolation | PASS | Exact root/branch/environment check succeeded. Candidate keeps the profile gate and prohibited path at `SKILL.md:36`, `:97-98`. |
| Static skill validity | PASS | `python -B .../validate_skill.py .../skills/fabric-research` returned `OK ... 5 reachable files`. |
| Pi skill loader | PASS | Parent `check.mjs` loaded exactly one `fabric-research` skill from this worktree, `disableModelInvocation: true`, with no diagnostics. |
| Syntax, installed guest types, schema compile | PASS, static only | `check.mjs`: all six TypeScript blocks had zero syntax and semantic diagnostics; AJV compiled the current schema. The checker used installed TypeScript/Pi/Fabric packages and its saved captured-contract snapshot. |
| Effective native contract | PASS | `tools.describe({ref:"agents.run"})` currently accepts the used `runner`, `model`, `thinking`, `extensions`, `recursive`, `tools`, and `schema` fields. Current `tools.models()` includes exact key `openai-codex/gpt-5.6-terra`. |
| Effective captured contracts and direct retrieval | BLOCKED | Current `tools.search` returned no `web_search`, `fetch_content`, `get_search_content`, or `source_check`; `tools.describe("extensions.web_search")` and a bounded nonbrowser `extensions.web_search` probe both returned `Unknown Fabric action`. This is current-profile availability, not evidence that browser fallback is allowed. The candidate’s preflight/narrow route correctly has a blocked branch at `SKILL.md:49-51`, `:103-108`. Restore/capture the prescribed extensions and rerun actual retrieval before merge. |
| Narrow lookup comparison | PASS, recorded live evidence | `baseline-lookup.json` and `candidate-lookup.json` use the same task/runner/model/thinking/options. Both completed with the official SQLite WAL answer. Candidate used one retrieval and correctly sized effort low. |
| Two-stream comparison and counts | PASS, recorded live evidence | `launches.json` records exactly 6 authorized/attempted launches: baseline lookup + two streams, candidate lookup + two streams. Candidate `live/ledger.json` has `maxLaunches:2`, `concurrency:2`, `exactAgents:2`, `exactStreams:2`, two confirmed IDs, and distinct `failed`/`completed` outcomes. The code separately records reservations, confirmed IDs, indeterminate launches, and exact-count status at `SKILL.md:180-212`, `:298-308`. |
| Saved real partial-failure replay | PASS with source/live conflict | Parsed `live/worker-concurrency.json` `text` has 3 rows, 5 calls, and 3 discovered actions; it validates against the **current** `references/evidence.schema.json`. The native envelope is nevertheless `status:"failed"`, has no `value`, and says the schema submitted then required `origin, sourceType`. This is a real partial native return, not a fixture. It proves the need for the partial-text path, but is not a current end-to-end C/D pass because the submitted embedded schema differs from the current schema. |
| Browser/provider/profile/last30days policy | PASS, static | Direct-first sizing and no fixed worker number are at `SKILL.md:10-26`; browser prohibition/configuration restraint at `:30-36`; exact native worker policy at `:32`; conditional last30days boundary at `:271` and `references/last30days.md:3-17`. Baseline policy is preserved in substance. |
| Per-item failure preservation and untrusted handoff validation | FAIL | D parses failed native `text` but validates only four top-level arrays. It then dereferences `a.slots`, `c.retrieved`, `row.support.length`, and `row.id` without guarding malformed partial data (`SKILL.md:228-251`). One malformed row/call, unknown assignment, or non-array support throws out of D and hides later siblings, contrary to its stated partial-outcome handling. It also treats any reported discovered/retrieved ref as sufficient, without checking it is an allowed `extensions.${requiredAction}` ref. |
| Output/read bounding | FAIL | `SKILL.md:40` promises individual JSON reads remain below 50 KB, but C serializes the full native result unbounded (`:189-205`) and D reads it unbounded (`:230`). The current evidence schema has no `maxItems` for `discovered`, `calls`, `rows`, or `gaps`, and no maximum for passages/details (`references/evidence.schema.json:10-64`). A valid large child result can therefore exceed `pi.read` limits, then be truncated or become unparseable. |

## Required fixes before a merge pass

1. **Make D total and per-outcome safe** - `skills/fabric-research/SKILL.md:228-251`.
   - Validate the parsed candidate before use: assignment identity, allowed exact action refs, array/object shapes, row slot/id/disposition, and `Array.isArray(row.support)`.
   - Put candidate conversion for each outcome and each row behind its own catch/flag; continue to later outcomes/rows.
   - Only mark a row eligible when receipts are for declared `extensions.${requiredAction}` refs and the plan’s required-action semantics are met. Keep failed native text as flagged candidate material, never as certified evidence.

2. **Enforce the stated 50 KB boundary** - `skills/fabric-research/SKILL.md:40, 189-205, 230` and `skills/fabric-research/references/evidence.schema.json:10-64`.
   - Add concrete `maxItems`/`maxLength` limits for stream arrays, receipt detail, findings, support passages, gaps, and stop reason.
   - Before persisting/re-reading native results, bound or shard the textual payload and store a compact index plus paths. D must reject/flag oversized data before `JSON.parse`, rather than relying on a truncated `pi.read` result.

3. **Rerun live checks after the fixes** - no source edit is prescribed for the current missing captured actions. Capture/restore the configured research extensions, then rerun the same narrow lookup and two-stream comparison. Confirm D on naturally occurring partial native output and retain distinct static versus live evidence.

## Pre-merge gate

This review directory, including `contract-evaluator/report.md`, `check.mjs`, generated type/template/static files, and all recorded evaluation artifacts, is temporary and must be deleted before merge. Current result is **FAIL** until fixes 1-2 pass and the blocked live retrieval check is rerun.
