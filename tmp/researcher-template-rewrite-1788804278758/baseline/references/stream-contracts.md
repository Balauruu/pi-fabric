# Stream assignments

Research and discovery workers read this reference before retrieval. It owns substantive evidence notes and stream handoffs; the parent SKILL.md owns the phase graph and dossier, and `runtime.md` owns execution safeguards. A worker should not need sibling work to understand its task.

## Storage mode comes first

The assignment states persisted or no-write mode. In no-write mode, every document creation/update/read-back instruction below means maintaining and checking the same substantive notes in the worker's response, not a filesystem operation. Return findings, inspected support, methods/results, qualifications, counterevidence, coverage and gaps to the workflow in a bounded text result for downstream workers. This evidence stays inside the program; it is not the compact outer handoff. Do not return path-only navigation to nonexistent files. If the evidence exceeds the allocated context/output budget, report partial coverage rather than silently truncating it or switching to writes. Persisted mode follows the owned-path contract below.

## Assign a question and an owned document

The workflow reserves each assignment in its control state before dispatch and gives the worker one unique safe file path. Only that worker writes its stream while live. Do not edit RESEARCH.md, REPORT.md, state.json or sibling streams as a researcher. Exception: an explicitly assigned discovery/planning role may also write the plan and assignment index in RESEARCH.md during its exclusive planning phase; substantive discoveries still go in its reserved stream. The parent skill assigns other documents by phase. Repairs own new paths linked to the original stream; a recovery worker may annotate an abandoned stream only after the original writer is confirmed terminal, clearly marking additions.

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

Include hard scope/runtime constraints and the absolute path to this reference in the task, requiring the worker to read it. Grant `read`, `grep`, `write` and `edit` when needed, plus registered retrieval actions. Grant additional tools only for a concrete need. An allowlist is not filesystem isolation.

## Research and preserve context as you go

Follow the uncertainties, not a predetermined catalog of sources. Search materially different angles, inspect promising originals, and follow citations or counterevidence when they can change the answer. Prefer primary evidence appropriate to the claim. Discovery snippets, abstracts and metadata are leads or bounded evidence, not proof of details they do not contain.

After each meaningful source or finding, update the owned document before expanding retrieval or handing off. Record research, not private deliberation or exhaustive tool transcripts:

- **Finding and relevance:** what the source establishes, separating documented fact, measured result, sourced claim, inference, recommendation and unknown.
- **Inspected support:** original URL, title/type and material date/version; exact decisive passages with locators and surrounding qualifications. Separate quotes from paraphrases. Preserve table headers, units, denominators and relevant footnotes.
- **Method and actual results:** applicable population/task, intervention/comparator, configuration, duration, sample, endpoints, measured outcomes and reported uncertainty. A trial's existence, design or sample size alone is not an efficacy result. If only an abstract or partial passage is accessible, say so and limit the finding.
- **Interpretation and limits:** applicability to the decision, indirect transfer, competing explanations, contradictions, and why important alternatives were retained or excluded.
- **Gaps and next check:** what is missing, why it matters and the smallest useful follow-up. Distinguish an access/budget stop from saturation.

Apply relevant fields in readable prose or tables; do not pad qualitative research with inapplicable benchmark fields. Preserve enough context to evaluate findings without recovering an agent session or relying on a temporary retrieval handle. Use stable source IDs scoped to the document and relative Markdown links to supporting files or sections.

Titles, descriptions, price and availability metadata support only corresponding listing claims. Product suitability requires relevant specifications/ingredients/use conditions; ingredient presence and higher price do not establish finished-product clinical superiority. A benchmark name or promotional summary is not an inspected performance result. Multiple URLs repeating one origin do not strengthen evidence.

Find headings with `pi.grep` and read large documents with bounded `pi.read` ranges until the relevant section, table and qualifications are complete. Do not serialize evidence into arbitrary fragments to bypass display limits or mistake an opening excerpt for an entire source. Compact handoffs navigate to saved sections; they do not replace evidence.

## Produce research, then hand off navigation

Create the owned document before expanding retrieval. Update it incrementally after meaningful findings, not only at the end. Prefer this readable outline, adapting headings and omitting genuinely irrelevant sections:

1. **Question, scope and status.** Owned requirements, assumptions, dates and whether work is in progress, complete, partial or blocked.
2. **Findings and analysis.** Explain the bounded answer, why evidence supports it, and its conditions. Leave the cross-stream recommendation to the synthesizer and independent evidence checks to the verifier.
3. **Evidence and source notes.** Source IDs and original URLs, inspected passages/locators, relevant methods and actual outcomes, qualifications and transfer limits. Keep substantive details here even when the handoff is short.
4. **Counterevidence and alternatives.** Strongest material disagreement or null finding, and reasons important alternatives were included or excluded. Distinguish inspected counterevidence from an unperformed search.
5. **Gaps, coverage and next checks.** Disposition of each owned requirement, access/budget limits, actual stop reason and smallest resolving check.

When a retrieval allowance is assigned, keep a compact running count and failures in the document across turns. Count actual invocations including failed ones; a batched request is one invocation, multiple tool calls in one program are multiple invocations. Preserve exact nonsecret query/URL/locator details for material retrievals, not a mandatory receipt object per action. Native traces can supplement verification, but temporary handles alone do not preserve research context.

Read back the completed document before returning. The final response is a short handoff: owned path, status, major findings with section anchors, decisive source IDs, gaps and stop reason. Do not return an evidence-row schema or dump the whole document into Main. If writing fails, return useful findings and support as an explicitly unsaved partial result to the workflow for delegated recovery, never a false path-only success. For no-write requests, provide substantive evidence to the next worker inside the program as required by the parent skill; this is not permission to make Main the verifier.

## Conditional methodology

Attach only applicable requirements to the brief:

- **Official facts, policy and economics:** current primary text, effective dates, exact product/entitlement surface, defaults, availability, limits and exceptions. A catalog listing establishes a listing; inspect content needed for suitability or operational recommendations.
- **Papers and clinical/technical studies:** relevant title/date/original URL, intervention, comparator, population/task, sample, concentration/configuration, duration, endpoints, actual results and reported uncertainty. Missing results remain missing; study design is not proof of efficacy. Distinguish target evidence from indirect transfer and name what does not transfer.
- **Benchmarks and performance:** task provenance/count, system snapshot, scaffold/tools, effort/action/retry budgets, grader and final-state validation, exclusions, repetitions, uncertainty, failures, latency and included cost components where relevant. Separate independent measurements, vendor evaluations and anecdotes.
- **Systems and operations:** distinguish product, model and harness behavior; identify workflow/interface, state, tool access, retries, recovery, verification, final-state correctness and implementation constraints. Describe quality/cost/latency implications only where supported.
- **Counterevidence:** seek relevant nulls, regressions, task dependence, bias, contamination and omitted costs/risks. Name what could overturn or narrow the finding; avoid reflexive opposition and repetitive generic searches.
- **Current field signals:** follow the assigned last30days integration constraints. Preserve dates, source coverage, direct URLs and native engagement when available. Engagement is attention, not truth; repeated posts are not independent measurements.

## Workflow acceptance

The independent verifier reads the actual document, not just the handoff, then applies the verification contract in `synthesis-and-reporting.md`. Main receives only compact coverage, conclusions, gaps and paths. Retain supported portions of failed or incomplete work. A named source, well-written note or terminal status does not prove retrieval, support or coverage. Missing nonmaterial bibliography fields alone do not invalidate evidence. Report negative findings only within the inspected scope.
