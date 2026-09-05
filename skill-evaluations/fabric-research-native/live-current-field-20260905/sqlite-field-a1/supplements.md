# Bounded supplements for r2

Coordinator clock: 2026-09-05T12:28:56.446Z (current mode, unchanged).

Retrieval 2, post-engine search: `site:news.ycombinator.com "Running SQLite Apps on Docker and Kubernetes with Litestream"`, workflow none, provider override omitted. ResponseId mtod3oa8es4cu8. Actual search provider/model unavailable. Results included https://news.ycombinator.com/item?id=49501147 plus older/different threads 44045292 and 45464641. Only 49501147 is selected, joined to the actual engine cache item_id. No claims about the other threads' dates.

Retrieval 3, direct content retrieval: https://news.ycombinator.com/item?id=49501147 using fetch_content, no browser. Returned title: Running SQLite Apps on Docker and Kubernetes with Litestream; 30 points by ajayvk, 14 comments, relative date '5 days ago'. Absolute publication date 2026-08-30 is from the engine's Algolia item, not independently exposed by readable HN extraction.

Extracted passages:
- 'Built-in Litestream replication and automatic restore is a new feature I added in OpenRun (a self-hosted deployment platform for web apps). Apps can use SQLite with zero code changes while OpenRun handles backup/recovery.'
- 'I use the same stack to run my apps! sqlite as Database backen on ephemeral pods. On initialisation, the pod restores the current litestream backup from object storage. No persistent volumes needed. No issues so far.'
- 'Without persistent volumes, every deployment of the app may require the SQLite data to be restored from S3, which can take time if database size is large.'
- 'On Kubernetes, for apps using SQLite, maxReplicas is set to 1 and OpenRun uses the Recreate update strategy. This ensures at most one pod is active (requests are queued until the new pod is healthy). There should never be more than one pod accessing the SQLite database.'

Interpretation: dated reliability-adjacent discussion of backup/recovery and single-writer deployment precautions. These are developer/practitioner claims, not controlled reliability results. Individual commenter handles were not exposed in readable extraction; do not fabricate attribution. The post author's OpenRun pitch and linked openrun.dev article share origin, so they are not independent corroboration. The retrieved responses support a tradeoff (restore cost versus ephemeral convenience), not a contradiction about measured database reliability.

No whole-engine rerun, external publication, browser automation, credential changes, fixture replay or added sources. Three retrieval calls total: pre-search with two queries, supplement search with one query, direct HN fetch. Stop: requirements-covered for bounded acceptance; Main owns final interpretation.
