---
name: fabric-research
description: Runs parallel external research and synthesizes detailed, source-backed answers for investigations, comparisons, literature reviews and substantive decisions.
disable-model-invocation: true
---

# Research: frame, investigate, synthesize

Build a useful answer from independently researched questions. The core is substantive source reading and synthesis, not process documentation. Use three stages: **frame → parallel research → synthesize**.

## 1. Frame

Identify the decision or question, intended use, scope, dates/versions, exclusions and requested output. Ask only when an unresolved choice would materially change the investigation. Otherwise state the narrowest reasonable assumption.

Main is the coordinating agent. Choose the route before retrieval:

| Route | Selection condition | Action |
| --- | --- | --- |
| Direct lookup | One precise fact, with no multi-step investigation or comparison | Answer with the relevant source and limitations. If the scope expands, switch to substantive research before further retrieval. |
| Substantive research | Any other investigation, comparison, literature review or substantive decision | Main frames the work and runs research and synthesis inside one TypeScript `fabric_exec` program. Read [runtime](references/runtime.md), [stream assignments](references/stream-contracts.md) and the [researcher request](researcher.md) when building it. |

For substantive research, persist by default unless the user requests no writes. A request for inline output alone does not prohibit persistence. Apply the no-write rules below when saving is forbidden.

Derive streams from independently answerable uncertainties. Give each stream the exact questions it owns, why they matter and the report material it must supply. Cover the decision's distinct dimensions rather than sending several workers after the same headline findings. Let source evidence determine the eventual categories and recommendations.

Honor user-specified streams, counts and output structure. Otherwise choose only as many streams as there are useful independent questions. Main does the framing; there is no separate planning agent. A normal substantive run uses one worker per stream and one synthesizer. Decision-grade reports also use the bounded source-grounded publication check below.

## 2. Research in parallel

Launch the planned streams with the filled researcher request. Researchers pursue original evidence, relevant alternatives and counterevidence within their own assignments. Batch independent searches and source reads. Stop expanding an assignment when new sources no longer change its answer, conditions or important gaps, or when its budget/access ends.

Each researcher returns a full Markdown note: findings, source passages or locators, methods and actual results, applicability, contradictions and remaining gaps. Keep this substantive material intact for synthesis rather than reducing it to a handoff summary. Workers do not share intermediate conclusions or delegate.

Use a recent-discussion stream only when changing practice, regressions, sentiment or freshness matters. That collector follows [last30days integration](references/last30days.md); it is not an extra default stage.

When planned streams finish or fail, proceed with the available evidence. Missing evidence remains a stated limitation. Do not relaunch streams or add follow-up investigations. The bounded publication correction below does not reopen research.

## 3. Synthesize once

Give one synthesizer the complete questions, source notes, any failed-stream limitations and [synthesis and reporting](references/synthesis-and-reporting.md). It reads the substantive evidence and relevant cited originals, reconciles disagreements, and writes one coherent answer at the requested depth.

The synthesizer owns the answer: preserve useful findings and their conditions, explain what they mean for the decision, and leave unsupported conclusions unknown. Source interpretation belongs in this writing stage. For focused or comparative reports, finish after synthesis. For decision-grade reports, read and execute [publication check](references/publication-check.md): independently check material source support and required coverage, apply at most one source-grounded correction, then independently recheck that correction before calling the report complete. This is not a style review or a new research stream.

## Files and handoff

For persisted research, create a new directory at `/home/balauru/.pi-profiles/fabric/runs/<timestamp>-research-<topic>/`. Derive `<topic>` from the question as lowercase ASCII words separated by single hyphens, falling back to `topic` if empty. Generate `<timestamp>` with `new Date().toISOString().replace(/[-:.]/g, "")`. Reserve the directory without replacing an existing one. On a name collision, append the smallest unused positive integer suffix to the topic slug. Keep all run-owned paths inside that directory.

```text
runs/<timestamp>-research-<topic>/
├── RESEARCH.md
└── streams/
    └── <question>.md
```

Workflow code saves each returned source note to its assigned stream file. The synthesizer alone writes `RESEARCH.md`. Add supporting files only for material such as an actual dataset or the optional discussion engine's output. Keep progress in native workflow events and compact in-program results, not a mandatory on-disk status ledger.

The final report is the reader-facing deliverable, not a brief or process log. Main returns the synthesizer's concise conclusion, original-source links, report path and material limitations. Use the outcome definitions in [runtime](references/runtime.md#results-and-persistence), not worker success alone, to state whether the result is complete, partial or blocked.

For **no-write requests**, create no run directory or files. Pass the full notes to the synthesizer in memory; it returns the report inline without file-writing tools. Main relays it. If research cannot run, explain the blocker. If only part succeeds, retain what is useful and make the missing coverage visible.
