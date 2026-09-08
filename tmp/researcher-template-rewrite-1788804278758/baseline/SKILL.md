---
name: fabric-research
description: Builds and runs a delegated Fabric workflow for external research, disputed comparisons, literature and published benchmarks, producing a source-backed dossier.
disable-model-invocation: true
---

# Research: build and run an evidence workflow

Main owns the user-facing brief and the workflow, not the investigation. For substantive research, put discovery, research, verification, gap repair, synthesis and report validation inside one type-checked TypeScript `fabric_exec` program. Workers retain the evidence in readable documents; only a compact outcome returns to Main. This is a research specialization of Fabric's code-held workflow, not Main researching alongside helpers.

## 1. Frame and route

Identify the question/decision, intended use and consequence of error; scope, exclusions, definitions and dates/versions; required questions and output criteria; comparable variables; and sufficient-support, diminishing-return, budget/access and blocked-conclusion stops. Ask one grouped clarification only when an unresolved answer changes the investigation or evidence standard. Otherwise state the narrowest reasonable assumption. Fix the user's criteria, not empirical rankings or recommendations.

- **Narrow lookup:** a precise fact needing a few sources may be answered directly with a decisive citation and limitations, without a dossier or delegation. If it expands into multi-step comparison or investigation, switch to the workflow before further retrieval.
- **Substantive research:** Main frames, checks runtime availability, opens the dossier and builds the workflow. An unclear decomposition calls for a bounded discovery worker, not a Main-side discovery pass. Do not fetch sources in Main while workers run, reread the entire evidence corpus afterward, repair findings directly, or write the report yourself. Accountability means arranging independent verification, not repeating every worker's investigation in Main.
- **Blocked delegation:** return a blocked/partial outcome with the needed capability or user decision. Do not silently substitute direct research or another model to finish the task.

Choose effort from uncertainty, accessibility, methodological difficulty, freshness and consequence of error. Reserve capacity for verification, bounded repair, synthesis and final validation before allocating research fan-out. There is no universal source quota or worker count.

Main reads [runtime and delegation safeguards](references/runtime.md) before retrieval or dispatch. For substantive work, also read the installed Fabric workflow pattern at `/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric/skillsets/typescript/fabric-workflow/SKILL.md`. Give workers the appropriate absolute paths below and require them to read their role's contract; Main need not load the research-method references:

- Researchers and discovery workers: [stream assignments and evidence notes](references/stream-contracts.md).
- Verifier, synthesizer and report validator: [verification, synthesis and reporting](references/synthesis-and-reporting.md).
- Recent practitioner-discussion worker only: [last30days integration](references/last30days.md).

## 2. Open the dossier and assign ownership

Use a new directory at `/home/balauru/.pi-profiles/fabric/runs/research-<topic>-<timestamp>/`. Choose a safe topic slug and unique timestamp; inspect for an existing directory before writing and never overwrite another run. Resume an existing dossier only when that run is in scope. Keep historical runs intact unless migration is requested.

```text
runs/research-<topic>-<timestamp>/
├── REPORT.md
├── RESEARCH.md
├── state.json               # workflow control only, not evidence
├── streams/
│   └── <owned-question>.md  # one document per meaningful research assignment
└── support/verification/   # only when verification is sharded
    └── <shard>.md
```

Main creates a brief and required-question list in `RESEARCH.md`, an explicitly in-progress `REPORT.md`, and initial control state before dispatch, then shares the run path. From then on the program coordinates these single-writer ownership transfers:

| Document | Owner and authoritative content |
| --- | --- |
| `state.json` | Workflow code only: phase, allowances, assignment reservations/native IDs/statuses, owned paths, coverage dispositions and next actions. Serialize updates even during fan-out. |
| `RESEARCH.md` | Planner first: bounded approach and linked assignment index. Verifier next: checks, cross-stream reconciliation, disagreements, coverage and gaps. Report validator last: report acceptance and actual stop reason. No concurrent writers. Link to `state.json` for execution accounting instead of duplicating it. |
| `streams/<owned-question>.md` | Assigned researcher: findings, inspected support, methods/results, qualifications, alternatives and gaps. Repairs own new paths, linked to the original assignment; preserve successful evidence. |
| `support/verification/<shard>.md` | Assigned verifier shard only: bounded checks and dispositions. Reserve each safe path before launch; one reconciliation worker reads these notes and alone updates `RESEARCH.md`. No-write mode uses in-memory shard outputs instead. |
| `REPORT.md` | Synthesizer: standalone answer, evidence-backed analysis, recommendations where requested, citations, limitations and research links. A later correction takes ownership only after the prior writer is terminal. |

Keep source excerpts in the owning research document, referenced rather than copied into successive ledgers. Only add a supporting file when a real table, dataset or substantial extract warrants it; link it from its owner. No files per search, fetch, claim or tool return, and no mandatory evidence database or packet pipeline. Control state is not the research deliverable; native logs are diagnostics, not its sole context.

**No-write requests:** keep substantive work delegated in the same code-held phases, with evidence passed between workers inside the program instead of persisted. Remove write/edit grants and skip dossier creation. The final synthesized answer may return inline as the necessary output exception; Main relays it without taking over research. Explain the lack of persistence/recovery. If storage unexpectedly fails, stop expanding work, retain accessible partial findings inside the workflow, and return an honest partial result or persistence blocker without false saved paths.

## 3. Build the complete phase graph

Use the native workflow progress and agent surfaces described in the runtime reference. Keep phase transitions, coverage checks, budgets and repair decisions in code, not a series of Main turns. Pass the objective and awkward source text through named top-level `payloads`. Source evidence stays in worker contexts and documents, not the outer tool result.

1. **Discover/plan:** reserve the planner with write authority for `RESEARCH.md` and a unique `streams/discovery.md` path before launch. The planner turns the brief into bounded, non-overlapping uncertainties and proposed assignments, with required-question IDs, owned paths and stop conditions. It may inspect sources to sharpen the decomposition and saves substantive discoveries in its own stream. The program validates the returned control plan against scope, safe paths, exact requested assignments and reserved downstream capacity before fan-out. For an already explicit decomposition, include its assignment index in the initial brief and use it without a redundant planner launch.
2. **Research:** launch independent assignments in bounded parallel batches with unique path ownership. Researchers read the stream contract and save substantive evidence incrementally. Catch failures per assignment; preserve partial artifacts. Stop new fan-out after systemic failure rather than repeating the batch.
3. **Verify:** a separate worker reads actual stream evidence, including useful partials, checks decisive/disputed claims against inspected source support, applies the reporting gates, and records reconciliation and requirement-level dispositions in `RESEARCH.md`. A worker's success or polished handoff is not evidence acceptance.
4. **Repair/reverify:** use the verifier's bounded control output to dispatch only decision-changing gaps within the predeclared repair/launch allowance. Reverification examines changed evidence and affected conclusions; keep successful siblings. Stop on sufficient support, no material progress, exhausted allowance, or blocked access. Remaining gaps become explicit qualified/partial conclusions, not permission for Main to research.
5. **Synthesize:** a worker reads the evidence documents and verifier dispositions and writes `REPORT.md` at the requested depth. It does not concatenate handoffs or introduce unverified recommendations. Missing evidence stays visible.
6. **Validate report:** an independent worker, not the report author, reads back the report, checks question coverage, decisive support, qualifications, source/local links and saved notes, then records acceptance in `RESEARCH.md`. Route only actionable corrections back to a writer within the remaining allowance, followed by validation of the changes. Otherwise return partial with the failed checks. Never claim completion merely because the report file exists.

The verifier may return for final report validation, but must not validate its own authored report. Size tasks by useful uncertainty and context load; shard a large verification corpus into non-overlapping checks, each owning a separate verification note, and let one reconciliation worker alone update `RESEARCH.md`, never by pulling the corpus into Main. Every required question ends with checked support, a qualified answer, an explicit gap or a blocked conclusion.

## 4. Return the compact outcome

Require the final validator to return the complete outcome below through a bounded control schema, then forward the checked outcome. Do not reconstruct it from native statuses or replace requirement dispositions with a blanket “report accepted.” A status-and-paths-only response is incomplete, even if every worker succeeded.

The outcome requires:

- status: complete, partial or blocked;
- main conclusion with clickable links to the original sources supporting it and material limitations;
- required-question coverage and unresolved decision-changing gaps;
- report/research/control paths that actually exist, or an explicit unsaved status;
- verification and report-validation outcome, stop reason, and any needed user decision.

```ts
type ResearchOutcome = {
  status: "complete" | "partial" | "blocked";
  conclusion: string;
  citations: string[]; // descriptive Markdown links to original sources, not dossier notes
  limitations: string[];
  coverage: { questionId: string; disposition: "supported" | "qualified" | "unknown" | "blocked"; reason: string }[];
  gaps: string[];
  paths: { report: string | null; research: string | null; state: string | null };
  verification: "passed" | "partial" | "failed" | "not_run";
  reportValidation: "passed" | "failed" | "not_run";
  stopReason: string;
  userDecision: string | null;
};
```

Populate `citations` with descriptive Markdown links whose labels name the sources and whose targets are original URLs actually inspected by workers. Local report/stream links belong in artifact navigation and do not substitute for original-source citations. If the original evidence is a supplied local file with no public URL, link that file and label it local; never invent a public URL. Missing source links are an explicit evidence gap.

This is a control contract, not an evidence schema. Bound string/array sizes to the task in JSON Schema and require all fields; use `null` paths for unsaved outputs. In no-write mode include the validated inline report as the explicit output exception.

Validate this control shape, nonempty conclusion, preserved requirement IDs/dispositions and artifact existence in code. For an early blocker, populate the same fields honestly with no accepted conclusion, missing coverage and `not_run` checks; never invent a successful answer. On failure return compact diagnostics and useful artifact paths, not raw research or native logs. Main checks the outcome contract and includes the returned original-source links alongside the supported conclusion in the final chat answer, plus artifact paths; it does not routinely read back `REPORT.md` or every stream. A missing or contradictory field goes back to a targeted worker check. Main handles user clarification and exceptional runtime recovery only. Context compaction in Main is not the workflow's progress mechanism; durable state and worker-owned evidence are.

Depth belongs in the saved report: explain what the evidence establishes, how, under which conditions and what remains uncertain. A short Main handoff must not turn the dossier into an aggregation of descriptions, URLs or metadata.
