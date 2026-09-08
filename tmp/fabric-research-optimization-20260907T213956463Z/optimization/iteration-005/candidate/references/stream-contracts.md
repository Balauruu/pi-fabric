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
Retrieval/output allowance and stopping conditions:
For repair: prior findings and the exact decision-changing gap:
```

Include only methodological requirements that materially change the investigation. Keep source paths and task text as data when composing the request, never executable source. Give research and gap-repair workers the same canonical request; neither receives output paths or write/edit tools.

Reserve a unique `streams/<assignment>.md` destination in workflow state before launch. This is the workflow's path, not the researcher's responsibility. Preserve successful streams; repairs get distinct reserved paths linked to the original assignment. Exact required assignments and task-wide launch allowances remain the parent skill's responsibility.

## Receive evidence, then persist it

Researchers always return the full Markdown note, whether the user permits dossier writes or not. Do not request a path-only handoff or an evidence-row schema. Size each assignment so its material evidence can fit the returned note; if coverage cannot fit, retain a qualified/partial result and narrow the next assignment rather than silently truncating evidence.

Within the same Fabric program, inspect the native result and persist nonempty returned `text` verbatim to the reserved stream path as soon as that result arrives. Read it back inside the program and check equality without returning the evidence to Main. Record native execution status, persistence status and unresolved work separately in `state.json`; a saved note is not automatically verified evidence. This result-handling contract is specified in [runtime safeguards](runtime.md).

A failed worker can still return useful partial text: preserve it and mark its native failure for the reconciliation/composer. Empty results and failures with no returned evidence remain explicit gaps, never fabricated stream content. Return-only researchers do not provide incremental durable notes while running. Recover available native results after interruption; do not promise unsaved in-flight evidence or silently relaunch indeterminate work.

In no-write mode, skip workflow file operations and pass the same note text to downstream workers inside the program. Do not change the researcher request or make Main inspect the corpus. On persistence failure, retain the returned note inside the workflow if possible, report the storage gap, and do not claim a saved path.

## Conditional methodology

Attach only relevant requirements:

- **Official facts, policy and economics:** primary text, effective dates, exact product/entitlement surface, defaults, availability, limits and exceptions. Listings alone do not establish suitability.
- **Studies:** population/task, intervention/comparator, sample, configuration or concentration, duration, endpoints, actual results and uncertainty. A trial's existence, design or sample size alone is not an efficacy result.
- **Benchmarks:** dataset/task provenance, system snapshot, model/tools, action/retry budgets, grader, metrics/denominators, exclusions, repetitions, uncertainty, latency and included costs. Do not compare incompatible setups as a common leaderboard.
- **Systems:** distinguish specified, configured, installed, enabled and observed behavior; identify the workflow, state, tool access and verification boundary actually evidenced.
- **Counterevidence:** seek relevant nulls, regressions, task dependence, bias and omitted costs. Name what could overturn the finding; repeated URLs from one origin are not independent corroboration.
- **Current field signals:** preserve dates, original URLs, source coverage and selection limits; engagement is attention, not truth. The optional last30days collector has its own role contract, not a broader researcher tool grant.

## Reconciliation and final acceptance boundary

After all available notes are persisted, the one reconciliation/composer reads each full note, including partials and statuses, and checks original decisive sources while writing the sole `RESEARCH.md`. It applies the gates in `synthesis-and-reporting.md`, returns compact requirement dispositions and ranks only decision-changing gaps. This replaces a mandatory pre-synthesis verifier handoff, not independent final validation.

A different final source/coverage/contract validator reads the report, all full notes and decisive sources. It checks source/claim binding, quantitative context, counterevidence, unknowns, complete appendix and each requirement. It returns bounded corrections or gap research only to workflow code. Preserve successful notes and source links. A repair gets a distinct reserved stream path and the old report is retained before the sole composer replaces it; an independent validator rechecks the replacement. No source count means blocked rather than a prose success.

Discovery/planning is a conditional separate role: use it only when actual unknown decomposition exists. If it performs web research, its substantive discovery note is returned for workflow persistence, not written into a researcher-owned stream. Do not give the web-researcher template planner permissions.
