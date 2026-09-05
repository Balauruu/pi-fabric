# Observed run diagnostics

Exactly one foreground engine invocation, Bash timeout 300 seconds, exit 0. Declared .venv Python -B; PYTHONDONTWRITEBYTECODE=1; HN-only --search and plan; --quick --days=7 --as-of 2026-09-05; both browser prohibitions and LAST30DAYS_NATIVE_SEARCH=1 supplied. Config, memory, tmp, output and diagnostics scoped to this directory. No auth copied or provider overrides supplied.

Actual generated_at: 2026-09-05T12:31:02.756799Z, preserved unchanged. Coordinator clock remains 2026-09-05T12:28:56.446Z, not replaced by engine time. Cache range_from=2026-08-29, range_to=2026-09-05; window_days=7. Adapter includes the full end day, yielding eight inclusive calendar dates despite seven-day date difference, so this is not an exact trailing 168-hour or intraday-cutoff proof.

Agent schema_version=1.2; source_status={"hackernews":"ok"}; six flat results, six clusters, no freshness verdicts. Stderr reports 14 raw hits, three low-engagement filtered, 11 stories then four prefix-filtered, final six exported. These counters are distinct pipeline stages, not a representative sample. The engine logs no source failure. All exported results are HN-origin but canonical URLs point to submitted articles/repos. HN discussion URLs survive in config/last-report.json metadata.hn_url. All cached top_comments arrays are empty, so discussion content in the report is explicitly from the separate HN retrieval, not engine comment enrichment.

Validation: parsed engine.json, stdout.json and raw/sqlite-database-reliability-raw.json are equal; all result sources hackernews; window_days=7; schema_version=1.2; source_status exact HN ok. Byte comparison differed due to rendering terminator, not parsed content. All original JSON left untouched.

Exposed provider_runtime: reasoning_provider=local, planner_model=deterministic, rerank_model=local-score. Stderr explicitly says plan source=external and echoes the written single subquery. Do not misread the deterministic model label as proof that the host plan was ignored. Host search provider/model was not exposed.

Coverage warning contradiction: generic stderr says 'Research quality: 4/5 core sources' and recommends unlocking X. Those generic messages do not establish multi-source retrieval, are outside HN-only scope, and were not acted upon. Actual source_status and results show only Hacker News.

Selected item 49501147: engine publication date 2026-08-30, 30 HN points, 14 comments; low final relevance 0.0687. A bounded direct HN fetch establishes backup/recovery and deployment-safety content despite the low score. No measured reliability conclusion follows.

Repository notifications regarding agent-benchmarking and pi-fabric-arbor are outside the SQLite research path; no such files were inspected or changed. Three retrieval calls total; no retry; stop requirements-covered for acceptance only. Other five results not promoted into reliability evidence.
