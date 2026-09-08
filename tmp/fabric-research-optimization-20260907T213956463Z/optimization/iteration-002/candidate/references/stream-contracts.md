# Assigning research streams

This reference is for the workflow building assignments. The [researcher request](../researcher.md) owns the web worker's configuration, instructions and Markdown output contract; do not duplicate that prompt in assignments or ask researchers to read the orchestration manual.

## Build the assignment

Fill the request's task placeholder with:

```text
Assignment ID and central question/decision:
Intended use and consequence of error:
Selected requirement records, verbatim: each `id`, exact `question`, required inclusions, expected report contribution and decision context. IDs alone are invalid.:
Scope, definitions, exclusions and relevant dates/versions:
Known source URLs and authorized reference/source files:
Applicable methodology and comparable variables:
Material decision facets and complementary evidence target, only where the requirement needs more than a headline outcome:
Retrieval/output allowance and stopping conditions:
For repair: prior findings and the exact decision-changing gap:
```

Include only methodological requirements that materially change the investigation. Keep source paths and task text as data when composing the request, never executable source. Give research and gap-repair workers the same canonical request; neither receives output paths or write/edit tools.

Reserve a unique `streams/<assignment>.md` destination in workflow state before launch. This is the workflow's path, not the researcher's responsibility. Preserve successful streams; repairs get distinct reserved paths linked to the original assignment. Exact required assignments and task-wide launch allowances remain the parent skill's responsibility.

## Receive evidence, then persist it

Researchers always return the full Markdown note, whether the user permits dossier writes or not. Do not request a path-only handoff or an evidence-row schema. Size each assignment so its material evidence can fit the returned note; if coverage cannot fit, retain a qualified/partial result and narrow the next assignment rather than silently truncating evidence.

Within the same Fabric program, inspect the native result and persist nonempty returned `text` verbatim to the reserved stream path as soon as that result arrives. Read it back inside the program and check equality without returning the evidence to Main. Record native execution status, persistence status and unresolved work separately in `state.json`; a saved note is not automatically verified evidence. This result-handling contract is specified in [runtime safeguards](runtime.md).

A failed worker can still return useful partial text: preserve it and mark its native failure for the verifier. Empty results and failures with no returned evidence remain explicit gaps, never fabricated stream content. Return-only researchers do not provide incremental durable notes while running. Recover available native results after interruption; do not promise unsaved in-flight evidence or silently relaunch indeterminate work.

In no-write mode, skip workflow file operations and pass the same note text to downstream workers inside the program. Do not change the researcher request or make Main inspect the corpus. On persistence failure, retain the returned note inside the workflow if possible, report the storage gap, and do not claim a saved path.

## Conditional methodology

Attach only relevant requirements:

- **Official facts, policy and economics:** primary text, effective dates, exact product/entitlement surface, defaults, availability, limits and exceptions. Listings alone do not establish suitability.
- **Studies:** population/task, intervention/comparator, sample, configuration or concentration, duration, endpoints, actual results and uncertainty. A trial's existence, design or sample size alone is not an efficacy result.
- **Benchmarks:** dataset/task provenance, system snapshot, model/tools, action/retry budgets, grader, metrics/denominators, exclusions, repetitions, uncertainty, latency and included costs. Do not compare incompatible setups as a common leaderboard.
- **Systems:** distinguish specified, configured, installed, enabled and observed behavior; identify the workflow, state, tool access and verification boundary actually evidenced.
- **Counterevidence:** seek relevant nulls, regressions, task dependence, bias and omitted costs. Name what could overturn the finding; repeated URLs from one origin are not independent corroboration.
- **Current field signals:** preserve dates, original URLs, source coverage and selection limits; engagement is attention, not truth. The optional last30days collector has its own role contract, not a broader researcher tool grant.

## Verification boundary

The independent verifier reads the full saved notes, or the full in-program notes in no-write mode, including useful partials and their native/persistence statuses. Apply the evidence gates in `synthesis-and-reporting.md`. A named source, polished note, successful process or existing file does not establish support. Missing nonmaterial bibliography fields alone do not invalidate useful evidence.

Discovery/planning is a separate role: it may write its bounded plan to `RESEARCH.md` under the parent skill's ownership rules. If it performs web research, its substantive discovery note is returned for workflow persistence, not written into a researcher-owned stream. Do not give the web-researcher template planner permissions.
