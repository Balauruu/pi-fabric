# Evidence brief for Main: SQLite on Hacker News

Scope: user-specified Hacker News only, quick depth, `--days 7 --as-of 2026-09-05`. Evidence, not a cross-topic recommendation.

## Findings

- **SQLite's established reliability is the comparison baseline, especially against AI-written forks.** The September 1 DoltLite thread has 61 points and 60 reported comments, the most discussion among the six retained engine results. anon291: “A database efforts main product is not exotic data structures but validation.” Conversely, zachmu argues that domain expertise and existing SQLite/Dolt test suites distinguish this effort from unguided code generation. These are competing community assertions, not independently verified reliability results. [Thread](https://news.ycombinator.com/item?id=49516848), [anon291](https://news.ycombinator.com/item?id=49517937), [zachmu](https://news.ycombinator.com/item?id=49540531).
- **Version-controlled SQLite attracts genuine local-first interest, but users dispute the need and implementation tradeoffs.** ncruces: “The problem DoltLite solves is merging, not forking.” vonnieda wants a local-first music app that syncs across devices. Others question whether copying/snapshots or table auditing suffice. The thread also disputes a claimed 1.2x–4x slowdown; do not relay that as an established performance measurement. [ncruces](https://news.ycombinator.com/item?id=49519289), [vonnieda](https://news.ycombinator.com/item?id=49518760), [benchmark dispute](https://news.ycombinator.com/item?id=49524052).
- **Practical SQLite deployment discussion centers on backup, restore, and writer coordination.** The August 30 SQLite/Litestream thread has 30 points and 14 reported comments. sighansen reports ephemeral-pod deployments restored from object storage, with “No issues so far.” simonw asks about multiple instances corrupting a shared Litestream store; the author describes binding IDs but promises to check further safeguards. Positive experience is anecdotal and does not resolve the safety question. [Thread](https://news.ycombinator.com/item?id=49501147), [experience](https://news.ycombinator.com/item?id=49501681), [question](https://news.ycombinator.com/item?id=49502335), [author reply](https://news.ycombinator.com/item?id=49502495).
- **A small builder-use signal, not broad sentiment:** four other submissions feature a SQLite-to-CLI tool, minimal Python ORM, Svelte editable websites, and single-file personal finance. Each has only 4–6 points and 0–2 comments. [Declick](https://news.ycombinator.com/item?id=49564984), [Model](https://news.ycombinator.com/item?id=49553359), [Editable](https://news.ycombinator.com/item?id=49508276), [Helius](https://news.ycombinator.com/item?id=49519540).

## Coverage and limitations

- Actual installed engine ran successfully with declared `.venv/bin/python -B`, external plan, `--search hackernews --quick --days 7 --as-of 2026-09-05 --no-browser-cookies --emit=json --json-profile=agent`. Exit 0, agent schema 1.2, `source_status.hackernews = ok`, six results. No other evidence source was queried by this assignment.
- Date-boundary nuance: engine log starts at August 29, and its HN adapter includes September 5. All six retained submissions are August 30–September 4; cited comments are August 30–September 3, so none relies on the extra August 29 boundary. Retrieval occurred September 5 at about 14:00–14:02 UTC, not after that day's close.
- Quick engine output had no comment text. Two bounded HN Algolia item fetches both returned HTTP 200. They supplied 60 DoltLite comments and 7 Litestream comments; the latter is incomplete relative to the reported 14-comment count. Engagement is observed at retrieval, not historical end-of-day engagement. HN comment votes are unavailable; quotes are not presented as highest-voted or representative of all HN.
- The six-story sample is filtered and quick, not exhaustive: engine discarded low-engagement stories and title/prefix mismatches. Two threads dominate the observable discussion. Engine relevance order is not engagement order.
- Agent-export URLs point to linked external submissions; HN discussion URLs were recovered from raw report metadata. Only HN content was fetched for evidence, not GitHub, DoltHub, SQLite documentation, or linked blogs.
- Generic engine stderr onboarding/source-quality advice is not a coverage finding for this HN-only task and was not followed. No engine/source access failure observed. No skill, dependency, provider, or credential configuration edited; no installs, browser access, publishing, or prior evaluation results used.

## Artifacts

All paths are under `/home/balauru/.pi-profiles/fabric/skill-evaluations/fabric-research-refactor/last30days-run/`:

- `query-plan.json`: HN-only external query plan.
- `engine.json`, `stdout.json`, `stderr.log`, `exit-code.txt`: actual engine output and outcome.
- `config/last-report.json`: internal report with HN discussion IDs and metadata.
- `memory/sqlite-raw.json`: engine-saved agent export.
- `check-hn-comments.py`, `comment-check.log`: bounded supplementation and inspection output.
- `hn-49516848.json`, `hn-49501147.json`: full HN API responses with retrieval timestamps.
- `hn-49516848-comments.json`, `hn-49501147-comments.json`: extracted comment texts, authors, IDs, timestamps.
