# Stream contracts

Read this before dispatching research subagents. A stream contract should be detailed enough that a researcher can work independently without seeing the other assignments or inventing the final decision. Include only fields and specializations relevant to that stream; mark a field not applicable rather than forcing quantitative methodology onto qualitative evidence.

## Shared contract

Use this shape and replace every placeholder with task-specific content:

```text
Research program:
Central question or decision:
Intended use and consequence of error:

Assigned independent stream:
Unique uncertainty this stream owns:
Why resolving it changes the final answer:

Scope and definitions:
Time horizon:
Required inclusions:
Explicit exclusions:
Decision criteria or final-report slots this stream must inform:
Variables, task definitions, or harness details that must stay comparable:

Source priorities:
Required methodology or evaluation detail:

Deliver:
- a direct stream-specific conclusion;
- an evidence ledger with claim, value or finding, direct URL, source type, publication or retrieval date, method, sample, and relevance;
- measured facts separated from documented facts, sourced claims, inference, and recommendation;
- quantitative results only with exact task, dataset, harness, metric, model/system, effort/configuration, evaluator, repetitions, and uncertainty when reported;
- contradictions and plausible reasons for disagreement;
- confidence for every major finding;
- explicit evidence gaps, using “No public direct measurement found” when applicable;
- sources kept and rejected, with brief reasons;
- the smallest additional measurement that would resolve the highest-impact gap.

Evidence rules:
- Prefer primary sources for specifications and direct events.
- Prefer independent, reproducible evaluations for performance claims.
- Use original papers rather than summaries.
- Do not compare numbers from incompatible harnesses as if normalized.
- Do not infer unmeasured combinations or invent values.
- Treat vendor benchmarks, customer reports, journalism, and anecdotes as their stated source types.
- Provide a direct URL for every material external claim.

Stopping rule:
Prioritize decisive evidence. Stop expanding once additional sources repeat the same origin or no longer alter the conclusion. Return a concise evidence ledger from evidence already gathered rather than browsing indefinitely.

Do not make the final cross-stream decision.
Do not launch subagents.
Do not modify files.
```

Add only the relevant specialization below. Do not append every specialization to every stream.

## Official facts, interface, policy, or economics

Require:

- primary first-party documentation;
- current values and effective dates;
- aliases, defaults, scope, availability, limits, and exceptions;
- historical values only when they explain a conflict;
- exact passage verification for decisive specifications;
- explicit documentation gaps.

Third-party summaries may locate a source but do not replace it.

## Benchmarks and practical performance

Require:

- separation of independent benchmark, vendor benchmark, customer evaluation, and anecdote;
- task count and task provenance;
- exact system/model/configuration and date;
- prompt, scaffold, tools, action and retry budgets;
- pass metric, grader or judge, repetitions, exclusions, and uncertainty;
- latency, token, cost, completion, retry, and failure data where measured;
- contamination, evaluator, and harness limitations;
- no normalization across different benchmark harnesses.

A benchmark name is not a methodology. Retrieve the method.

## Research papers and technical reports

Require for every retained paper:

- title and full author list;
- venue, publisher, or repository;
- publication and revision date;
- DOI, publisher page, OpenReview, ACL Anthology, or arXiv URL;
- models or systems, datasets, sample, interventions, controls, metrics, and uncertainty;
- finding relevant to the central decision;
- methodological limitations;
- whether evidence is directly about the target or only indirectly transferable;
- an explanation of transfer plausibility and what does not transfer.

If direct literature is sparse, report the gap. Do not pad the stream with unrelated papers.

## Systems, operations, implementation, or tool use

Require:

- the exact workflow or interface evaluated;
- statefulness, tool access, retry and action budgets;
- final-state versus response-only evaluation;
- coordination, recovery, stopping, and verification behavior;
- quality, cost, latency, token, and failure implications;
- implementation-specific constraints that limit transfer;
- explicit separation of product behavior, model behavior, and harness behavior.

## Adversarial or counterevidence

Require active searches for:

- null results and regressions;
- non-monotonic behavior;
- task or harness dependence;
- selection, publication, evaluator, and survivorship bias;
- reward hacking, contamination, and environment exploitation;
- costs or risks omitted by positive reports;
- conditions under which the apparent recommendation fails.

The goal is not reflexive opposition. It is to identify the strongest evidence that could overturn or narrow the leading conclusion.

## Current field signals with last30days

Use only when current practitioner evidence, launch behavior, regressions, changing prices, or sentiment materially affects the decision.

Use this contract instead of ordinary web-only research:

```text
Load and follow the full last30days skill for the supplied topic and decision context. Do not substitute ordinary web search for its required process.

Investigate current practitioner discussion, emerging failures, new evaluations, changing sentiment, and recent first-party statements. Report exact dates, platforms, direct links, engagement context where available, and inaccessible-source caveats.

Group findings by confidence. Distinguish corroborated claims from isolated reports. Social engagement shows attention, not truth. Verify emerging factual claims against primary or stronger sources where possible. Identify contradictions with official documentation, benchmarks, and papers.

Preserve the last30days badge and engine footer in the return.
Do not make the final cross-stream decision.
Do not launch subagents.
Do not modify files.
```

## Evidence-ledger row

A compact row should answer:

| Field | Meaning |
| --- | --- |
| Claim | The smallest material assertion supported or contradicted |
| Finding | Exact value, result, passage, or bounded conclusion |
| Status | documented fact, measured effect, sourced claim, inference, or recommendation |
| Source | Direct URL and title |
| Type | primary documentation, independent benchmark, vendor benchmark, paper, technical report, customer report, journalism, or anecdote |
| Date | Publication plus retrieval date where material |
| Method | Task, sample, intervention, comparison, evaluator, repetitions, uncertainty |
| Independence | Original evidence origin and funding/vendor relationship if known |
| Relevance | How directly it answers the stream uncertainty |
| Confidence | high, medium, or low with a reason |
