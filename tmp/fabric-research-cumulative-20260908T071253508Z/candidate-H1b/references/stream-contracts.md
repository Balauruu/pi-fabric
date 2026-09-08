# Stream assignments

A researcher must be able to investigate its question without reading the orchestration manual or guessing what an ID means. Build the assignment consumed by [researcher.md](../researcher.md) using the following text template. Repeat it once per planned stream, preserving label order and filling each line with that stream's data. Use `None supplied` for absent source inputs, `None` for inapplicable method details, and `Runtime limits only` when no explicit resource budget exists. Never leave a field blank or invent a user constraint. Required questions and scope come from Main's framing. Include the assigned share of any explicit budget with its units.

```text
Central question and intended decision:
Independent uncertainty this stream owns:
Exact assigned questions, including their IDs when supplied:
Required inclusions and contribution to the final report:
Scope, definitions, exclusions and time horizon:
Known source URLs or supplied files:
Relevant method, comparison conditions and resource budget:
```

Use the user's actual question wording. Include the details needed to answer it, not a formal requirement table repeated across roles. Keep assignments distinct in purpose, even when they examine the same system or paper. Researchers choose the sources and subtopics needed within that scope; do not preassign the answer.

Attach only relevant methodological detail:

- **Official facts and economics:** primary text, effective dates, product/entitlement surface, defaults, limits and exceptions.
- **Studies:** original publication, population/task, intervention, comparator, sample, actual outcomes, uncertainty and applicability. A study's existence or design alone is not a result.
- **Benchmarks:** task provenance, system/model, prompt/tools, effort, metric, scoring method, repetitions, exclusions and measured cost/latency. Keep incompatible settings separate.
- **Systems and operations:** distinguish documented, configured and observed behavior. Include implementation constraints and what happens under relevant failure conditions.
- **Counterevidence:** relevant null results, regressions, alternative explanations, bias and omitted costs that could change the recommendation.
- **Current discussion:** original dates/links, source coverage and engagement context. Use the [discussion collector](last30days.md) when the task needs that evidence.

Workers return substantive notes, not paths or tiny summaries. Keep exact results with their source and conditions, and explain their decision relevance. Before dispatch, Main assigns each stream an immutable ID `s1`, `s2`, and so on in assignment order, separately from any user-supplied question IDs. Bind its assignment, native worker ID, result and path to that stream ID. Workflow code saves the returned text under `streams/<question>.md`, where `<question>` is the stream ID. Do not derive filenames from arbitrary question text or reuse a path for another stream. Researchers have no file-writing responsibilities. Successful notes and useful partials go directly to the synthesizer, together with the original questions and failure limitations.
