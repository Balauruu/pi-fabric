# fabric-research live behavior evaluation

**Scope:** current worktree `/home/balauru/.pi-profiles/fabric/.worktrees/research-skill-rework`, branch `research-skill-rework`, profile `/home/balauru/.pi-profiles/fabric`. Pre-dispatch environment matched exactly. `/home/balauru/.pi/agent` was never accessed. All new artifacts are below this directory. No shipped skill/main files, configuration, installs, credentials, browser surfaces, fixtures, mocks, injected failures, commits, or pushes were changed.

## Result

The live narrow shortcut and the current A/C/D/B/E composition passed. Two fixed substantive streams completed, the current D preserved candidate/flag artifacts, Main independently checked retained original passages, and E emitted `synthesis-input.json` with `status: success`, four supported slots, two confirmed launches, and no indeterminate attempts.

This is evidence of the observed single runs, not a statistical comparison or a general quality preference.

## Acceptance evidence

| Criterion | Result | Evidence |
|---|---|---|
| Environment/profile isolation | Pass | Root, branch and `PI_CODING_AGENT_DIR` matched before work. |
| Current skill and four references read | Pass | `SKILL.md`; `evidence.schema.json`; `stream-contracts.md`; `synthesis-and-reporting.md`; `last30days.md` read before live execution. |
| Current model/contracts | Pass | `tools.models()` contained exact `openai-codex/gpt-5.6-terra`; current `agents.run`, `web_search`, `fetch_content`, `get_search_content`, and `source_check` contracts captured in `preflight.json`. |
| Validator and Pi loading | Pass with static-check caveat | Standalone validator: `OK fabric-research: valid frontmatter, local links, and 5 reachable files`. Current loader found one `fabric-research` skill with `disableModelInvocation: true`, no diagnostics. |
| Fresh narrow shortcut | Pass | Native `176fd39ecd83452fafc68d697c790c36`, `completed`, runner `pi`, Terra/high/extensions/recursive false, captured grants `read, fetch_content`; child discovered/described fetch and made one official SQLite fetch. It did not request bash for ledger construction. |
| Exact two-agent/two-stream C | Pass | `40ab07cb56ee491d8de2b707f273246f` (concurrency) and `e664e4475cc64057b8fba1e075912e88` (backups), both `completed`, explicit runner `pi`, model Terra, high thinking, extensions true, recursive false. Ledger records exactly two reserved/confirmed launches and two streams. |
| Child access and policy | Pass | Both current children returned discovery of `extensions.web_search`, `extensions.fetch_content`, and `extensions.get_search_content`; all searches recorded `workflow: none`, and fetch receipts contain no auth/provider override. |
| Lossless C/D/E packets | Pass | Current C saved native packets, D yielded 8 candidates and 6 substantive gaps, E persisted `review.json` and `synthesis-input.json`. C/D/E were executed with fresh shared packet-helper preambles. |
| Main verification/repair B | Pass | Five Main B fetch receipts succeeded: SQLite WAL `mtqvl65drxtbwo`; PostgreSQL MVCC `mtqvl6az2aq10k`; PostgreSQL architecture `mtqvl6cz3mvb30`; SQLite Backup API `mtqvl6l9vzqyii`; pg_basebackup `mtqvl6pmqpsta4`. Main inspected exact decisive passages, including pg_basebackup `--wal-method` text already present in its full receipt, without spending an extra call. |
| E coverage/citation preparation | Pass | `live-run-20260328-a-cde/synthesis-input.json`: all four slots supported; 7 Main-checked rows; exact agent count met. |

## Fresh native execution and retrieval accounting

- **Narrow child:** `176fd39ecd83452fafc68d697c790c36`, completed. One retrieval: `fetch_content https://www.sqlite.org/wal.html`, response `mtqvdvikip9x7a`.
- **Concurrency child:** `40ab07cb56ee491d8de2b707f273246f`, completed. Retrieval sequence: `web_search` `mtqvgvehtf27bc`; one five-URL `fetch_content` `mtqvh49r38e0zl`; `get_search_content` three times on that response (SQLite exact passages, PostgreSQL MVCC slice, PostgreSQL architecture slice). Reported count 5/allowance 5.
- **Backup child:** `e664e4475cc64057b8fba1e075912e88`, completed. Retrieval sequence: `web_search` `mtqvgvqc852i06`; one six-URL `fetch_content` `mtqvh286k8nqsk`; `get_search_content` twice (SQLite Backup API and pg_basebackup). Reported count 4/allowance 5, stopping under its documented no-call-at-allowance rule.
- **Main B:** five successful single-URL `fetch_content` calls listed above, consuming the planned five-call Main budget. No Main search, passage, auth fetch, or browser recovery occurred.

Full native envelopes and direct receipts are retained under `live-run-20260328-a-cde/`.

## Independent checked synthesis input

The compact evidence answer is intentionally limited to documented behavior, not throughput or reliability ranking:

- In WAL mode, SQLite says readers do not block writers and writers do not block readers, but WAL processes must be on one host and WAL does not work over a network filesystem. [SQLite WAL](https://www.sqlite.org/wal.html)
- PostgreSQL's MVCC documentation says reads do not block writes and writes do not block reads; its client/server documentation permits client and server hosts to differ over TCP/IP and states the server handles multiple concurrent client connections. [MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html) [Architecture](https://www.postgresql.org/docs/current/tutorial-arch.html)
- SQLite's Online Backup API documents a live-source backup whose source lock is held only while reading, allowing other source connections to read/write during the backup. [SQLite Online Backup API](https://www.sqlite.org/c3ref/backup_finish.html)
- PostgreSQL documents `pg_basebackup` as a running-cluster backup that does not affect other clients. Its `--wal-method=fetch` can fail unusably if needed WAL is recycled; stream needs a second replication connection and a client that keeps up with WAL. [pg_basebackup](https://www.postgresql.org/docs/current/app-pgbasebackup.html)

**Limitations:** these are current-documentation facts. They do not compare throughput, backup time, restore correctness, or end-to-end reliability. The decision-changing remaining gap is version-pinned validation of deployed PostgreSQL WAL/retention/replication settings, SQLite WAL topology, and restore procedures. Use a restore drill before adoption.

## Natural failure replay, separate from fresh live execution

No fresh child failed. Therefore the preserved real records were replayed without alteration:

- Historical concurrency native `1ff169b39bf643228d8567f23cda2e53` is `failed` because its then-schema required `origin` and `sourceType`; the first SQLite support item omitted them. Its JSON `text` nevertheless contains three usable rows and five real retrieval receipts.
- Historical sibling backup native `94479f3ee142442faca80b8e9b3a3cd6` is `completed`, with four rows and five real retrieval receipts.
- Current D executed against those original paths, not a mock: it parsed partial text, retained **3** failed-concurrency candidates plus **4** successful-sibling candidates, flagged the failed status and `Unvalidated partial text`, and preserved all gaps. Evidence: `replay-natural-schema-failure/{candidates.json,validation-flags.json}`.

This confirms the current schema no longer requires that administrative metadata and current D preserves useful structured partial text. It does not reclassify the historical failed worker as completed.

## Baseline comparison, descriptive only

Saved unchanged baseline records used the same three questions and Terra/high Pi context:

| Case | Baseline handoff | Current live handoff/intervention |
|---|---|---|
| Lookup | `47ae4d24f8cd4bb69f6030b5d8f2c866`, completed prose answer/one source | `176fd39ecd83452fafc68d697c790c36`, completed concise prose answer/one source. Both had 3 agent tool calls and 4 turns. |
| Concurrency | `ec639d6f28324d01b17c99387b00030e`, completed prose; self-reported 6 retrieval invocations despite cap 5 | `40ab07cb56ee491d8de2b707f273246f`, completed schema `value`, 5 reported retrieval invocations, then C packet/D candidate/review accounting. |
| Backups | `b7b9980d7d7044b8940604df29bf0eb8`, completed prose with bounded pg_basebackup gap | `e664e4475cc64057b8fba1e075912e88`, completed schema `value`, 4 reported retrieval invocations, retained gaps, and Main B independently checked the retained source-backed rows. |

The intervention is **structured worker-to-Main handoff plus lossless C/D/E handling and Main verification**, versus saved prose-only handoff. One run per condition is insufficient for a statistical or preference claim.

## Static checks, failures, and suggested fixes

- Historical `static-results.json` says the earlier six extracted blocks were syntax/type clean. The current isolated checker sees **seven** TypeScript blocks and correctly loads/compiles the evidence schema, but reports unresolved `saveJSON`/`loadJSON` in C/D/E when it type-checks each fenced block alone.
- This is a **checker composition limitation**, not a live execution failure: the skill explicitly requires prepending the helper block to C/D/E, and all three actual composed stages ran successfully. Suggested evaluator-source fix: make `check.mjs` inject the shared helper block into C/D/E before isolated type checking, or type-check the documented composed program variants. Keep the separate helper block in the skill as the authoritative composition contract.
- Two initial checker attempts failed only in evaluator-local setup: a quoted-path transcription error, then missing evaluator-local `contracts.json`. Both are recorded in activity and were corrected only inside this artifact directory; neither bears on shipped skill behavior.
- The worktree already had modified shipped skill/reference files and an untracked schema before this evaluation. They were observed with `git status --short` and left untouched.

## Cleanup gate

Delete `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-rework-review/behavior-evaluator-final` before merge. It contains all evaluator outputs, including copied/adapted checker artifacts, native packets, receipts, replay outputs, and this report.
