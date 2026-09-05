# Research skill implementation checks

Scope: authorized migration steps 2-5 only. Root verified by the mandatory first command as `/home/balauru/.pi-profiles/fabric`. Settings, cleanup, installed dependencies, package declarations, credentials/provider/model settings, AGENTS.md and agent-benchmarking were not modified by this implementation. Existing native snapshots and historical evidence were preserved. No startup preset, custom runtime, adapter or launcher was added.

## Acceptance ledger

| Check | Evidence |
|---|---|
| Existing baseline demonstrates migration failures | `workflow-red.txt`: unchanged body, 9 tests, 1 passed / 8 failed |
| Native request shape and canonical source execution | Deterministic tests exercise actual `workflow-program.js`, plus the ordinary execution example in `references/workflow-program.md` |
| Existing four retrieval tools; configured search and zero-child direct examples | Direct examples executed with minimal mocked tool seams; `workflow: "none"`, no provider/model/auth overrides, zero children asserted |
| One authoritative Browser rule copied into every assignment | Rule extracted from SKILL.md; full assignment equality checked for native dispatch; current-field and retries use same assignment builder |
| Sibling failure survival and bounded recovery | Returned failures and thrown native budget refusal retain successful siblings; one fresh targeted retry; overlapping ownership does not invent a sole owner |
| Native current-field dispatch | `recursive:false`, `extensions:true`, exact profile cwd, read/bash/write plus retrieval grants; attempt-local artifacts, engine environment, cookie and Trustpilot opt-outs asserted |
| Preflight | Missing tools/empty grants produce zero calls; malformed dates/unowned requirements rejected; missing or escaping current-field artifact scope blocks only that stream |
| Provenance | Missing provenance and foreign requirement rows retained but not candidate-usable; native schema failure retained separately |
| Native receipts and budgets | Result IDs/status/usage/turns/toolCalls retained, no SDK launch projection. Missing telemetry remains unavailable. Dispatches without native results counted explicitly. Native budget refusal is not retried |
| Methodology preserved | Routing, requirements and uncertainty ownership, original-source dependence, temporal and comparability gates, Main verification/synthesis and honest partial coverage retained in the five existing files |
| Skill validation | `skill-validation.txt`: valid frontmatter, local links, 5 reachable files |
| Syntax and whitespace | `node --check` and scoped `git diff --check` passed |
| Actual direct/multistream/current-field retrieval and configured provider/model | NOT RUN. Requires fresh normal loading after Main cleanup |
| Complete browser-free parent/child traces; native live progress/budgets/receipts | NOT RUN. Deterministic seams do not prove live behavior |
| Ordinary BetterWright and absence of obsolete registrations | NOT RUN. Cleanup/restart/non-research browser proof remain Main-owned |

## Commands

```bash
node --test skill-evaluations/fabric-research-native/workflow.test.mjs
python -B skills/ultra-skill-creator/scripts/validate_skill.py skills/fabric-research
node --check skills/fabric-research/scripts/workflow-program.js
git diff --check -- skills/fabric-research skill-evaluations/fabric-research-native
```

Final deterministic suite: **13 passed, 0 failed**, recorded in `workflow-green.txt`. Tests use the real canonical source with only native agent/tool/progress/parallel seams mocked. They are not native execution receipts or a replacement runtime.

## Decisions and remaining live constraints

- `agentBudget` is a native dispatch-attempt cap bounded by configured `agents.maxPerExecution`. Raw `agents.run` is intentionally retained for native results.
- Verified installed Fabric source distinction: `tokenBudget`/`budget.spent()` count workflow helpers, not raw `agents.run`. The code reports that native observation without fabricating enforcement or reservations. Child usage comes from native result receipts.
- `maxRetrievalSteps` is advisory and never sent as a native agent option. Total child `toolCalls` cannot establish retrieval compliance or count engine-internal source calls.
- Lower `timeoutMs` values cannot shorten the configured native timeout floor. No child timeout/model override is passed.
- Current-field workers read the installed last30days skill in full, use its declared `.venv` interpreter and engine beside the skill, and apply the structured JSON exception. No `--agent` CLI flag, onboarding, setup, doctor, installs, dependency changes, credential copies or publication.
- `LAST30DAYS_CONFIG_DIR`, memory/save paths and temporary files are attempt-local. Config scoping changes which `.env` is read; source availability must be observed, not assumed. Trustpilot opt-out skips all Trustpilot retrieval. Xiaohongshu is excluded. These instructions are not a universal no-browser switch or sandbox.
- Parent startup environment does not follow from cwd. Fresh ordinary Pi must start with the exact profile environment and native child loading must be independently verified before live acceptance.

Changed skill files: `SKILL.md`, `references/stream-contracts.md`, `references/synthesis-and-reporting.md`, `references/workflow-program.md`, `scripts/workflow-program.js`, all beneath `skills/fabric-research/`. Evaluation additions are confined to this directory.
