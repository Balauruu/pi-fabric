---
name: fabric-research
description: Runs bounded external research streams and synthesizes one detailed, source-backed answer for investigations, comparisons, literature reviews, and substantive decisions.
---

# Research: frame, investigate, synthesize

Build a useful answer from independently researched uncertainties. Main frames and coordinates the work; bounded workers gather evidence; one synthesizer writes the answer. Do not add persistent agents, intermediate coordinators, a separate reviewer, or a rewrite loop.

## Recognize an assigned leaf role first

Before framing a plan, distinguish a user investigation from an already-dispatched role. A task beginning `Research this self-contained assignment:`, `Synthesize one final research answer`, or `Collect current discussion for this one assigned stream` is an assigned leaf role, not a new top-level research request.

For that leaf role, execute the supplied self-contained task directly with its granted tools and return its requested structured result. Do not frame another `ResearchPlan`, read the orchestration references, load this skill recursively, or launch another researcher/synthesizer. The parent already owns planning, persistence and orchestration. This branch does not change the task's evidence, source-verification, budget or output requirements.

## Choose the route

| Route | Selection condition | Procedure |
| --- | --- | --- |
| Direct lookup | One precise fact, no comparison or multi-step investigation, and no research artifact requested | Retrieve the relevant original source directly and answer inline with its limitation. Create no agent or run directory. If the question expands after the first retrieval, carry that source into a substantive plan before further research. |
| Substantive research | Any investigation, comparison, literature review, consequential decision, requested artifact, or question with multiple independent uncertainties | Build one `ResearchPlan` and run one TypeScript `fabric_exec` program implementing `ResearchPlan → ResearchRunResult`. Read [runtime](references/runtime.md), [researcher](references/researcher.md), [synthesizer](references/synthesizer.md), and [last30days integration](references/last30days.md) completely before building the program. |

## Frame a substantive plan

Record the central question, intended use, inclusions, exclusions, as-of date or version, time horizon, assumptions, requested report form, persistence mode, stream assignments, and limits. Ask only when an unresolved choice would materially change the investigation. Otherwise use the narrowest reasonable assumption and expose it in the plan.

Derive streams from independently answerable uncertainties. Give each stream an immutable ID `s1`, `s2`, and so on in assignment order. Each required question belongs to one stream. Honor user-specified streams, counts, budgets, and output structure. Otherwise use one stream for one substantive uncertainty, normally two to four streams, and never derive more than six. Use at most four concurrent streams.

A recent-discussion stream is appropriate only when changing practice, regressions, practitioner experience, sentiment, or freshness can change the answer. It counts as one planned stream. The optional engine runs only in persisted mode; inline mode uses the ordinary read-only researcher with a recent-discussion assignment.

## Select persistence deterministically

Apply these rules in order:

1. Explicit `no writes`, `do not save`, or `inline only` means `inline`.
2. An explicit request to save, persist, or return a report path means `persisted`.
3. If both rules match, ask one clarifying question before execution.
4. Otherwise substantive research defaults to `persisted`.
5. Direct lookup remains inline unless an artifact was requested, which selects substantive research.

Inline mode must perform no directory creation, `pi.write`, file-producing discussion-engine invocation, or other artifact write. Persisted mode writes only inside the newly reserved research run directory.

## Execute once

Pass the complete plan as the named payload `plan`. Set top-level `agentBudget` to the number of planned streams plus one synthesizer. When the plan has a token budget, pass the same value as top-level `tokenBudget`. If these capacities cannot be reserved, report the conflict before invoking `fabric_exec`.

Run model/tool preflight before agent dispatch or filesystem effects. Dispatch bounded streams without retries, preserve useful partial evidence, and make exactly one synthesis attempt after every stream is terminal or unavailable. Source verification belongs inside that synthesis call. The outer workflow alone writes ordinary stream notes and `RESEARCH.md`.

Return the exact `ResearchRunResult` from the runtime reference. Do not infer completion from a native worker status or an existing path.

## Completion criterion

Complete only when one of these is true:

- A direct lookup returned the requested fact with an original source and limitations, without agents or files.
- A substantive run returned `complete`, `partial`, or `blocked` using the runtime's mechanical rules, with exact stream and question coverage, only verified saved paths, and the report or surviving evidence required by that outcome.

Never relaunch a failed stream, run a second synthesizer, add a review agent, or silently substitute unavailable models, tools, sources, or persistence.
