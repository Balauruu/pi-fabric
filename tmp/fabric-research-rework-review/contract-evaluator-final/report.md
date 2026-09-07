# fabric-research revised final contract evaluation

## Overall: FAIL

The prior correctness failures are fixed: current code is valid, uses the granted retrieval contracts, preserves partial native evidence, and losslessly shards large packets. One remaining contract failure prevents a pass: several blocks can return unbounded native/details data to model context despite the skill's small-output/paged-packet rule. No shipped file was modified.

## PASS

| Criterion | Evidence |
| --- | --- |
| Isolation | Verified first: root `/home/balauru/.pi-profiles/fabric/.worktrees/research-skill-rework`, branch `research-skill-rework`, and `PI_CODING_AGENT_DIR=/home/balauru/.pi-profiles/fabric`. No access to `/home/balauru/.pi/agent`. |
| Current contracts and minimal live capability | Independently listed/described `extensions.web_search`, `fetch_content`, `get_search_content`, `source_check`, and `agents.run`; current models include exact `openai-codex/gpt-5.6-terra`. One configured-provider `web_search` probe used `workflow:"none"`, no provider override, succeeded (`successfulQueries: 1`), and its native return is saved locally. No `fetch_content.auth` was used. |
| Loader, validator, schema, TypeScript | `python -B .../validate_skill.py .../skills/fabric-research`: `OK ... 5 reachable files`. Actual Pi loader found exactly `fabric-research`, `disableModelInvocation: true`, no diagnostics. AJV compiled current `references/evidence.schema.json`. Temporary checker compiled all 7 current TS blocks with installed guest declarations plus dynamic declarations generated from current captured contracts; syntax and semantic diagnostics were empty. It compiled blocks C/D/E with the shared helper block prepended. |
| Allowed refs and total aggregation | A only permits the four prescribed action names (`SKILL.md:100-108`). C grants the plan's registered captured names and sends exact `extensions.<name>` refs to the child (`:219-226`). D forms the same exact allowlist and rejects nonmatching receipts (`:257-278`), with independent per-outcome and per-row catches (`:260-292`). |
| Partial native replay without relabeling | The saved native `live/worker-concurrency.json` remains `status:"failed"`, ID `1ff169b39bf643228d8567f23cda2e53`. Its actual `text` parses and validates against the current schema: 3 rows, 5 calls. Current D plus the helper block replayed only the saved failed and completed native envelopes: 7 candidate rows, 8 flags, including the failed worker's native error and the explicit `Unvalidated partial text` flag. This is a replay, not fresh live execution. |
| Lossless packets | Exact shared helpers at `SKILL.md:169-185` round-tripped only saved native returns: failed concurrency envelope in 3 parts and completed backup envelope in 4 parts, byte-for-byte JSON-equivalent after reload; each maximum fragment was exactly 8,000 Unicode code points. This confirms the sharding path rather than imposing arbitrary evidence/schema caps. |
| C persistence/siblings, static | C reserves first, then each parallel thunk preserves a returned native ID/status even if `saveJSON` fails, makes a best-effort raw outcome write, and returns that outcome; all outcomes are appended only after the full parallel join (`SKILL.md:212-240`). Thus a per-item persistence failure retains that item's native ID when available and does not discard successful siblings. This was inspected statically, not fault-injected. |
| Policy retained | Current browser prohibition, no-auth/no-provider-override worker policy, profile prohibition, exact-count policy, and conditional last30days boundary are present at `SKILL.md:26-36, 199, 312-316` and in the four current references. Comparison with the supplied baseline found no relaxation of those constraints. |
| Self-contained child contract/counts | C's task contains policy, question, scope, `context`, standard, stop, assignment, exact required refs, allowance, and schema (`SKILL.md:223-226`). Reservations are task-ledger based and exact count uses confirmed IDs plus indeterminate reservations (`:207-213, 238-241`; E `:343-353`). All payload keys used by the blocks are documented and compile against `π`. |

## FAIL - actionable issue

1. **Unbounded model-facing returns violate the stated compact/paged-output contract.**
   - `SKILL.md:54-56` and `:152` return raw `details`, whose effective captured-tool contract has no size bound.
   - `SKILL.md:229-241` returns every outcome with unbounded `error` and opaque `usage`; `maxLaunches` is caller-supplied, so this is not a display bound.
   - `SKILL.md:296-299` slices arrays but returns unbounded `gap` strings in each flag.
   - Most importantly, `SKILL.md:348-360` saves the complete result packet but then spreads that complete `result` back into the return. `execution.outcomes` and `coverage` are therefore unsliced, contradicting the rule to return only the next needed slice at `:189`.

   **Fix:** preserve full native/details/coverage data in the existing direct receipt or chunk packet, but return a bounded, sanitized page: counts, paths, IDs/statuses, `hasError`/`hasUsage`, and explicitly sliced/length-limited display fields. E should return an execution/coverage summary plus its existing evidence page and packet path, not `...result`. This does not require schema `maxItems` or evidence truncation.

## Validation limitations and cleanup gate

- No child agent was launched and no failures were injected. The partial-failure and packet checks replayed saved native data only; they are not fresh live execution.
- Only the minimal `web_search` live probe was needed. `fetch_content`, `get_search_content`, and `source_check` were contract-described but not live-invoked; this does not establish their provider-side retrieval health.
- Static compilation cannot prove child adherence to prompt policy or recovery from a final ledger-write failure.
- All artifacts created by this evaluation are confined to `tmp/fabric-research-rework-review/contract-evaluator-final/` and must be deleted, along with the earlier evaluator artifacts, before merge.
