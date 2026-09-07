# Stream assignments

Read before delegated research. The parent SKILL.md owns the dossier and research-content contract; `runtime.md` owns execution safeguards. Carry applicable constraints into each self-contained assignment. A worker should not need sibling work to understand its task.

## Assign a question and an owned document

Main prepares `streams/` and reserves the assignment in its execution accounting before dispatch. Give each worker one unique safe file path. Only that worker writes its file while live; Main alone edits RESEARCH.md and REPORT.md. Separate files allow parallel work without lost updates. Main may annotate or recover a stream after its worker is terminal, clearly marking additions.

Use this brief, replacing every field with the actual task:

```text
Central question/decision, intended use and consequence of error:
Owned uncertainty and why it matters:
Required questions/criteria this stream informs:
Scope, definitions, exclusions, dates/versions:
Known sources, search angles, source priorities:
Required method and variables that must remain comparable:
Absolute dossier path and your single owned Markdown path:
Research-content contract and applicable methodology gates:
Execution constraints, allowed tools, retrieval/time allowance if any:
Stop conditions and highest-impact follow-up rule:
```

Include the parent skill's substantive note requirements and applicable runtime safeguards in the task, not merely a pointer to constraints the child cannot access. Grant `read`, `grep`, `write` and `edit` when needed, plus registered retrieval actions. Grant additional tools only for a concrete need. An allowlist is not filesystem isolation.

## Produce research, then hand off navigation

Create the owned document before expanding retrieval. Update it incrementally after meaningful findings, not only at the end. Prefer this readable outline, adapting headings and omitting genuinely irrelevant sections:

1. **Question, scope and status.** Owned requirements, assumptions, dates and whether work is in progress, complete, partial or blocked.
2. **Findings and analysis.** Explain the bounded answer, why evidence supports it, and its conditions. Do not decide Main's cross-stream recommendation.
3. **Evidence and source notes.** Source IDs and original URLs, inspected passages/locators, relevant methods and actual outcomes, qualifications and transfer limits. Keep substantive details here even when the handoff is short.
4. **Counterevidence and alternatives.** Strongest material disagreement or null finding, and reasons important alternatives were included or excluded. Distinguish inspected counterevidence from an unperformed search.
5. **Gaps, coverage and next checks.** Disposition of each owned requirement, access/budget limits, actual stop reason and smallest resolving check.

When a retrieval allowance is assigned, keep a compact running count and failures in the document across turns. Count actual invocations including failed ones; a batched request is one invocation, multiple tool calls in one program are multiple invocations. Preserve exact nonsecret query/URL/locator details for material retrievals, not a mandatory receipt object per action. Native traces can supplement verification, but temporary handles alone do not preserve research context.

Read back the completed document before returning. The final response is a short handoff: owned path, status, major findings with section anchors, decisive source IDs, gaps and stop reason. Do not return an evidence-row schema or dump the whole report into the parent tool result. If writing fails, return useful findings and support as a clearly unsaved partial result rather than a false path-only success.

## Conditional methodology

Attach only applicable requirements to the brief:

- **Official facts, policy and economics:** current primary text, effective dates, exact product/entitlement surface, defaults, availability, limits and exceptions. A catalog listing establishes a listing; inspect content needed for suitability or operational recommendations.
- **Papers and clinical/technical studies:** relevant title/date/original URL, intervention, comparator, population/task, sample, concentration/configuration, duration, endpoints, actual results and reported uncertainty. Missing results remain missing; study design is not proof of efficacy. Distinguish target evidence from indirect transfer and name what does not transfer.
- **Benchmarks and performance:** task provenance/count, system snapshot, scaffold/tools, effort/action/retry budgets, grader and final-state validation, exclusions, repetitions, uncertainty, failures, latency and included cost components where relevant. Separate independent measurements, vendor evaluations and anecdotes.
- **Systems and operations:** distinguish product, model and harness behavior; identify workflow/interface, state, tool access, retries, recovery, verification, final-state correctness and implementation constraints. Describe quality/cost/latency implications only where supported.
- **Counterevidence:** seek relevant nulls, regressions, task dependence, bias, contamination and omitted costs/risks. Name what could overturn or narrow the finding; avoid reflexive opposition and repetitive generic searches.
- **Current field signals:** follow Main's last30days integration constraints. Preserve dates, source coverage, direct URLs and native engagement when available. Engagement is attention, not truth; repeated posts are not independent measurements.

## Main's acceptance

Main reads the actual document, not just the handoff, then applies the parent verification loop. Retain supported portions of failed or incomplete work. A named source, well-written note or terminal status does not prove retrieval, support or coverage. Missing nonmaterial bibliography fields alone do not invalidate evidence. Report negative findings only within the inspected scope.
