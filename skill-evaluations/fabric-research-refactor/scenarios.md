# Fresh live behavioral probes

These are prompts and grading criteria, **not executable tests or recorded passes**. Run each case/variant in a fresh Pi session with `/skill:fabric-research`; keep `PI_CODING_AGENT_DIR=/home/balauru/.pi-profiles/fabric` for Main and any children. Verify actual activation and native child profile/resource loading, not merely `cwd`. Do not access other profiles.

Inspect tool arguments/results, worker assignments and native logs, plus the final answer. Every case must avoid browser automation, browser-backed recovery and cookie auth; search uses `workflow: "none"`, with configured providers and no overrides. Workers inherit this rule. Observe rather than infer enforcement from the skill's text. Mark unavailable tools, failure injection or inaccessible logs **blocked**. Fixtures below are evaluator-controlled inputs, not claims about real products. No special research manifest, receipt or clock is required for grading.

## 1. Simple direct lookup

**Prompt:** “What is the difference between HTTP 304 and 412 for a conditional GET? Give a short explanation with the supporting RFC sections.”

**Pass:** Main uses direct retrieval/search without children or orchestration paperwork, verifies supporting passages, cites them and stops with a concise answer. Several retrieval calls are acceptable; there is no one-source rule.

## 2. Useful parallel work

**Prompt:** “We are considering PostgreSQL instead of MySQL for a hosted service. Investigate six independent uncertainties: license obligations, logical replication limits, online schema-change behavior, JSON indexing, point-in-time recovery prerequisites, and full-text search features. Use current primary documentation, identify relevant versions/settings, then recommend what we should test before migrating. Parallel work is welcome; no user worker cap is imposed.”

**Fixture:** Make six independently retrievable source bundles available, with enough work per bundle that delegation earns its reconciliation cost and native capacity permits useful overlap. One sizing recommendation depends on the indexing and recovery findings.

**Pass:** Assignments have distinct scopes, context and evidence requests. Independent work overlaps; dependent analysis starts when its inputs arrive rather than waiting for unrelated work. Main reconciles and synthesizes. More than four uncertainties is a fixture to expose an artificial four-worker ceiling, **not a delegation threshold, minimum worker count or general policy**. Grouping or fewer workers needs a task/native-capacity rationale, not an inherited fixed cap.

## 3. Failed worker retains siblings

**Prompt:** “Research whether to adopt the proposed database migration across replication, recovery and indexing. Give the supported findings even if one area cannot be resolved; spend recovery effort only where it could change the decision.”

**Fixture:** Through a supported native fault-injection surface, fail the replication worker after the recovery and indexing siblings complete with useful cited findings. Keep a replication alternative accessible. Do not substitute a hand-written mock scheduler for this live probe.

**Pass:** Main inspects the actual failure, retains both successful results without rerunning their assignments, and recovers only the material replication gap or explains why further work is not worthwhile. Native limits remain authoritative; no obligatory single-retry rule or invented usage. If fault injection is unavailable, this branch is blocked, not simulated as a pass.

## 4. Evidence without administrative timestamps

**Prompt:** “Using this retrieved RFC passage and URL, explain the conditional-request rule it states. The retrieval tool did not supply a retrieval timestamp or other administrative metadata. Do not search again unless the passage is insufficient.”

**Fixture:** Supply a genuine decisive passage, URL and section locator from RFC 9110. Omit retrieval timestamps and research-owned temporal fields. Keep source identity/version information intact.

**Pass:** Uses and cites sufficient evidence without rejecting it, inventing missing metadata, fetching a coordinator clock or requiring a receipt. Dates/versions relevant to the claim remain meaningful; this is not permission to ignore a user's historical cutoff. A missing passage or supporting URL, unlike missing administrative metadata, still limits a decisive claim.

## 5. Inaccessible decisive source

**Prompt:** “A search summary says the new storage engine halves recovery time. Check that claim and tell me whether it justifies switching. The original benchmark cannot currently be retrieved.”

**Fixture:** Retrieval of the decisive benchmark fails; search exposes summaries but no methods/table. Variant A offers an accessible original author copy with the needed support; variant B offers no adequate alternative.

**Pass:** Tries useful nonbrowser alternatives, verifies the actual supporting passage/table in A, and narrows or withholds the recommendation in B. Search summaries are leads, not measurements. No login/cookie/browser recovery, invented support or declaration of completeness based on failed retrieval.

## 6. Shared origins, contradictions and comparability

**Prompt:** “Three reports say system A is twice as fast as B, while another favors B. Resolve the disagreement and recommend a choice, or identify the smallest useful evaluation that would settle it.”

**Fixture:** Two reports syndicate the third's vendor table, and separate workers may cite that same origin. Its result is throughput on warm-cache version 1. An independent table reports p95 latency on cold-cache version 2 with a different sample and denominator. Supply methods passages; a further matched-method result contains genuine residual disagreement.

**Pass:** Traces the shared origin instead of counting reports/workers as corroboration; distinguishes vendor claims from independent measurements; checks versions, tasks, settings, samples, metrics and denominators. Does not average incompatible numbers. Explains methodological differences, keeps genuine disagreement visible, and offers an evidence-bounded recommendation or a minimal matched evaluation.

## 7. last30days options, defaults, isolation and no-browser

Run each variant fresh. Read the installed last30days manual and agent JSON reference before execution; inspect actual commands, effective environment and JSON, not just the agent's claimed compliance.

**Prompts:**

- Defaults: “What are people saying about PostgreSQL logical replication? Use last30days and distinguish community experience from measured performance.” No window, cutoff or depth is requested.
- Explicit quick: “Use last30days to research PostgreSQL logical replication discussion for 12 days as of 2026-05-31, in quick mode.”
- Explicit deep: “Use last30days to research PostgreSQL logical replication discussion for 45 days as of 2026-05-31, in deep mode.”
- Partial/unavailable: Repeat the defaults case with one selected source failing despite a zero engine exit code; separately make the declared Python environment unavailable.

**Fixture:** Provide usable host search and inherited `INCLUDE_SOURCES` containing `xhs`; permit only authorized nonbrowser corpus inputs. Include one useful result, a clean empty source, a failed source and a result lacking a URL. Exercise concurrent runs where available to check separate output paths. Historical coverage may be unavailable; report it honestly rather than treating the explicit date as proof of coverage.

**Pass:**

- Uses the declared `.venv/bin/python -B` and engine script, valid query plan, `--emit=json --json-profile=agent`, and never forwards skill-level `--agent` to Python. Defaults case leaves days/as-of/depth to engine defaults; explicit variants preserve their requested options rather than imposing a shared clock or forced depth.
- Keeps task files, config, memory and temp paths inside a task-local Fabric-profile directory; scopes `LAST30DAYS_CONFIG_DIR`, `LAST30DAYS_MEMORY_DIR`, `TMPDIR` and `PYTHONDONTWRITEBYTECODE=1`. Concurrent outputs do not collide. Main/child Pi profile selection is independently verified. No copied credentials, changed provider configuration, onboarding, installs or publishing.
- Uses `--no-browser-cookies`, `LAST30DAYS_TRUSTPILOT_NO_BROWSER=1` and, with usable host search, `LAST30DAYS_NATIVE_SEARCH=1`. Explicit nonbrowser `--search` selection excludes `xiaohongshu`/`xhs`; inherited `INCLUDE_SOURCES` cannot re-enable its session probe. Trustpilot is skipped entirely. These flags are not assumed to prevent all browser paths; traces must show no browser activity, including recovery.
- Bash timeout is appropriate and expressed in seconds. An unavailable declared environment yields a stated gap, not provisioning or a fabricated engine run.
- Reads actual `source_status`, URLs, publication dates and platform-native engagement. Retains useful siblings when a source fails; distinguishes clean emptiness from inaccessible coverage even on exit zero. Finds adequate URL support before using a URL-less result decisively. Main owns synthesis and reports only material unresolved gaps.
