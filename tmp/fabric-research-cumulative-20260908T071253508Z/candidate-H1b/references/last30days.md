# Recent discussion with last30days

Assign a discussion collector only when practitioner experience, changing conditions, regressions or sentiment matters. It owns one research stream and returns a substantive note directly to the synthesizer. Engagement measures attention, not truth or controlled performance.

The collector reads the installed [last30days skill](/home/balauru/.pi-profiles/fabric/skills/last30days/skills/last30days/SKILL.md) and [agent JSON reference](/home/balauru/.pi-profiles/fabric/skills/last30days/docs/reference/json-export.md) for query planning and engine invocation. Use existing dependencies and authentication, with no onboarding, installation, credential changes or publishing. In this embedded collector, this reference owns tool limits, file destinations, stopping rules and the note handoff. The installed skill supplies query planning and engine mechanics, not its standalone onboarding, follow-up invitations, report formatting or retry loops.

## Persisted collection

- Run `/home/balauru/.pi-profiles/fabric/skills/last30days/skills/last30days/scripts/last30days.py` with `/home/balauru/.pi-profiles/fabric/skills/last30days/.venv/bin/python -B`. Use this absolute script path when adapting the installed skill's invocation examples. The skill-level `--agent` flag is not a Python argument. If the declared environment is unavailable, report the missing coverage.
- Put necessary engine files in `support/last30days-<stream>/` inside this run, where `<stream>` is Main's assigned stream ID. Pass that absolute directory as `--save-dir` and keep any plan or explicit `--output` path there. Scope `LAST30DAYS_CONFIG_DIR`, `LAST30DAYS_MEMORY_DIR` and `TMPDIR` there, and set `PYTHONDONTWRITEBYTECODE=1`. Use existing process auth without copying credentials into the scoped config directory.
- Keep collection nonbrowser: use `--no-browser-cookies`, `LAST30DAYS_TRUSTPILOT_NO_BROWSER=1`, and explicit `--search` sources excluding `xiaohongshu`/`xhs`; prevent inherited `INCLUDE_SOURCES` from re-enabling them. Report inaccessible coverage rather than opening browser sessions.
- Preserve requested `--days`, `--as-of`, `--quick` or `--deep`; otherwise use engine defaults. Use its query plan and `--emit=json --json-profile=agent`.
- Set `LAST30DAYS_NATIVE_SEARCH=1` only when the collector will actually use host search during collection. The flag suppresses an engine fallback; it does not execute host search. Otherwise leave it unset or clear an inherited value for this invocation. Keep configured providers.

Read ordinary agent exports through `results` and `source_status`, or comparison exports through each `reports[].report` with its entity label intact. Keep actual source failures, dates, original URLs, engagement and selection limitations visible. An unfamiliar export is an access/format limitation, not an empty survey. Useful results can coexist with source failures or a zero exit code.

Return the findings, representative original evidence, contradictions and coverage limits as a full Markdown note, including the engine's badge/footer when produced. Link useful engine artifacts from that note. Workflow code saves the note under `streams/`; engine JSON does not replace the research or final answer.

## No-write collection

Do not run the file-producing engine or create support directories. Use permitted nonbrowser discussion retrieval within the assigned stream, or report the unavailable coverage. Disclose that the engine was not run. Return findings inline with no saved paths.
