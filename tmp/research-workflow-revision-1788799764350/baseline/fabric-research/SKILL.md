---
name: fabric-research
description: Research external questions, disputed comparisons, literature and published benchmarks, with source-backed synthesis and delegation where useful.
disable-model-invocation: true
---

# Research: build a readable evidence-backed dossier

Main owns the question, effort, evidence standard, verification and final synthesis. The deliverable is an in-depth answer supported by durable research notes, not an aggregation of descriptions, URLs or site metadata. Depth means explaining what the evidence establishes, how, under which conditions, and what remains uncertain; it is not a fixed length, source quota or agent count.

## 1. Frame and size the work

Identify the question/decision, intended use and consequence of error; scope, exclusions, definitions and dates/versions; required questions and output criteria; comparable variables; and sufficient-support, diminishing-return, budget/access and blocked-conclusion stops. Ask one grouped clarification only when an unresolved answer changes the investigation or evidence standard. Otherwise state the narrowest reasonable assumption. Fix the user's criteria, not empirical rankings or recommendations.

- Answer a precise fact with a few sources directly. A single-source lookup needs no dossier unless requested.
- For substantive multi-step research, create the dossier below even if Main does all retrieval.
- Delegate only distinct uncertainties that benefit from parallel retrieval or different methods. If decomposition is unclear, Main performs a bounded discovery pass first.
- Choose effort from uncertainty, accessibility, methodological difficulty, freshness and consequence of error. Reserve capacity for source content, counterevidence and Main's verification. Do not import example call limits or agent counts as defaults.

Read [runtime and delegation safeguards](references/runtime.md) before retrieval or dispatch. For delegated work, also read [stream assignments](references/stream-contracts.md). For substantive research, read [synthesis and reporting](references/synthesis-and-reporting.md). Use [last30days integration](references/last30days.md) only when recent practitioner discussion can materially change the answer.

## 2. Open the dossier

Use a new directory at `/home/balauru/.pi-profiles/fabric/runs/research-<topic>-<timestamp>/`. Choose a safe topic slug and unique timestamp; inspect for an existing directory before writing and never overwrite another run. Resume an existing dossier only when that run is in scope. Keep historical runs intact unless migration is requested.

```text
runs/research-<topic>-<timestamp>/
├── REPORT.md
├── RESEARCH.md
└── streams/                  # only for delegated research
    └── <owned-question>.md   # one document per meaningful assignment
```

Main creates `RESEARCH.md` with the brief, required questions, approach and progress before substantive retrieval. Create `REPORT.md` as explicitly in progress, then develop it into the deliverable. Share the run path so the user can inspect work while it proceeds. For direct research, put source notes in `RESEARCH.md`; do not create an empty `streams/` directory.

| Document | Owner and authoritative content |
| --- | --- |
| `RESEARCH.md` | Main: brief, linked assignment index, execution progress/counts, direct research notes, cross-stream verification decisions, unresolved disagreements and next checks. |
| `streams/<owned-question>.md` | Assigned researcher: substantive findings, inspected support, methods/results, qualifications, alternatives and gaps for that question. |
| `REPORT.md` | Main: standalone answer, evidence-backed analysis, recommendations where requested, source citations, limitations and links to relevant research sections. |

Use meaningful headings and stable source IDs scoped to each document. Link locally with relative Markdown paths and section anchors. Keep source excerpts in the owning research document, referenced rather than copied into successive intermediate ledgers. Only add a supporting file when a real table, dataset or substantial source extract warrants it; link it from its owner. Do not create files per search, fetch, claim or tool return. There is no mandatory evidence JSON, packet generation, candidates/review/synthesis copy or database.

If automated recovery genuinely needs structured state, use at most one small internal `state.json` for assignment/launch IDs, statuses and document paths, not evidence. Otherwise the execution section of `RESEARCH.md` is sufficient. Choose one owner for execution accounting rather than mirroring two ledgers. Native host logs remain diagnostics, not the deliverable or its sole source of context.

When the user prohibits writes, honor that restriction: research directly and return the report and relevant notes inline, explaining that no dossier was saved. If storage unexpectedly fails, retain useful findings in the response, report the persistence gap and do not claim a saved report exists.

## 3. Research and preserve context as you go

Follow the uncertainties, not a predetermined catalog of sources. Search across materially different angles, inspect promising original sources, and follow citations or counterevidence when they can change the answer. Prefer primary evidence appropriate to the claim. Discovery snippets, abstracts and metadata are leads or bounded evidence, not proof of details they do not contain.

After each meaningful source or finding, update its owning document before further expansion or final handoff. Record substantive research, not private deliberation or exhaustive tool transcripts:

- **Finding and relevance:** what the source establishes about the question, separating documented fact, measurement, sourced claim, inference, recommendation and unknown.
- **Inspected support:** original URL, title/type and material date/version; exact decisive passages with locators and surrounding qualifications. Separate quotations from paraphrases. Preserve table headers, units, denominators and relevant footnotes.
- **Method and actual results:** applicable population/task, intervention/comparator, configuration, duration, sample, endpoints, measured outcomes and reported uncertainty. A trial's existence, design or sample size alone is not an efficacy result. If only an abstract or partial passage was accessible, say so and limit the finding.
- **Interpretation and limits:** how the result applies to the decision, where transfer is indirect, competing explanations, contradictions, and why important alternatives were retained or excluded.
- **Gaps and next check:** what is missing, why it matters, and the smallest useful follow-up. Distinguish an access/budget stop from saturation.

Apply relevant fields in readable prose or tables; do not pad qualitative research with inapplicable benchmark fields. Preserve enough context to evaluate the finding without recovering an agent session or relying on a temporary retrieval handle.

Titles, descriptions, price and availability metadata support only corresponding listing claims. Product suitability requires relevant specifications/ingredients/use conditions; ingredient presence and higher price do not establish finished-product clinical superiority. A benchmark name or promotional summary is not an inspected performance result. Multiple URLs repeating one origin do not strengthen the evidence.

Find headings with `pi.grep` and read large documents with bounded `pi.read` line ranges. Continue until the relevant section, table and qualifications are complete. Do not serialize research into arbitrary fragments to work around a tool display limit, or mistake an opening excerpt for an entire source. Compact tool returns navigate to saved sections, not replace them.

## 4. Read, verify, reconcile and repair

Before synthesis, Main reads every stream's findings, evidence/method sections, counterevidence and gaps, following continuations and supporting-file links as needed. A short handoff is an index, not the research. Keep substantive worker notes intact when findings are omitted or qualified in the final answer.

Main then:

1. Separates execution status from evidence adequacy. Inspect useful partial documents even when an agent failed; a completed agent may still have inadequate evidence.
2. Checks each decisive/disputed claim against inspected source support, surrounding conditions and actual results. Reuse support already retrieved and visible to Main; if notes alone cannot establish faithful support, inspect an available host trace or retrieve the original source. Worker assertions and session-local handles are not independent verification.
3. Applies the source, quantitative-comparability, causal and transfer gates in the synthesis reference. Records material checks and dispositions in `RESEARCH.md`, linked to the original notes, not another claim database.
4. Investigates contradictions through actual methods/conditions. Retains bounded conflicting findings or leaves conclusions unknown when reconciliation is unsupported. For consequential/disputed recommendations, seek overturning evidence or report the counterevidence coverage gap.
5. Repairs the highest-impact gap directly by default. Redirect a still-live worker when that preserves context; a new gap-only assignment must earn its cost and respect the same launch ceiling. Never rerun successful siblings or treat repair as independent corroboration.

Every required question ends with checked support, a qualified answer, an explicit gap or a blocked conclusion. Do not mark a broad criterion supported because one subquestion has a citation. Stop when evidence is sufficient at the requested depth, further work is unlikely to change the answer, or a real limit blocks progress. A limit-stopped deliverable is partial, not evidence-saturated.

## 5. Write and verify the deliverable

Write `REPORT.md` according to the reporting reference and the user's requested structure. Main synthesizes rather than concatenates worker notes. Include direct source citations for material external claims and local links to research sections preserving their context. A bibliography or local note link alone is not evidence-backed analysis.

Before calling substantive research complete:

- Read back `REPORT.md`: it answers the actual questions with analysis at the requested depth, not just source descriptions or populated slots.
- Verify decisive claims retain applicable results, conditions, counterevidence and uncertainty; recommendations stay within coverage.
- Check source URLs and local file/section links. For heading fragments, derive the actual Markdown heading slug (including lowercase and punctuation handling), then check that the target heading exists; a file-existence check alone does not validate an anchor. Prefer a file-only link when the renderer's anchor convention is uncertain. Check coverage of every required question and remove in-progress placeholders from a completed report.
- Confirm meaningful research notes are saved, assignments/counts are accounted for, and unresolved requirements and the actual stop reason are visible. A partial report must say what remains partial.

End the chat with the main conclusion, material limitations and clear paths to `REPORT.md` and `RESEARCH.md`. The saved report is the durable deliverable, not a promise to write it later. A narrow lookup ends with its answer, decisive citation and material limitation without mandatory files or delegation.
