# Fabric Research optimization: final status and mutation proposals

## Status

Stopped on the user's explicit instruction before H3. Both tested hypotheses were rejected as integrated improvements. H1b and H2b/H2c were implementation repairs, not additional hypotheses. The consecutive non-improvement count is 2, not 3. This is a user-directed stop, not evidence of a quality ceiling.

`/home/balauru/.pi-profiles/fabric/skills/fabric-research` is unchanged from `incumbent-00`. Final directory comparison found no differences, excluding desktop `.directory` metadata. No candidate was promoted. All locally listed experiment agents are completed, with none active.

The baseline is the installed skill frozen at this run's start, not historical rev04. Historical reports served as separate quality references. Legacy parity remains unestablished.

## Insights and baseline comparison

### F1 — More checking did not reliably improve correctness

H1 added source-grounded checking, bounded correction and independent recheck. It repaired useful tool/security conditions but introduced unsupported numerical substitutions and citation/context mismatches in prompt-technique reports. The citation-local H1b repair still regressed. Closure-only measured overhead was about 102–302 seconds initially and 130–374 seconds after repair. These are added phase times, not whole-workflow measurements.

Recommendation: do not add a mandatory reviewer/correction loop to the skill.

### F2 — Retrieval fidelity and interpretation are separate failure points

Readable extraction omitted material table cells. H2's fallback to another original format recovered useful results, headers and source conflicts. Recovery alone did not preserve sampling, selection, resource and applicability conditions through recommendations. H2b/H2c addressed that handoff and unsupported equivalence labels. Both independent fixed-note reviewers passed all four final compositions without material new regression.

This supports the local mechanisms, not an unconditional claim that the integrated skill is better.

### F3 — Complete-workflow testing exposed a different weakness

| Held-out task | H2c versus incumbent | Decisive evidence |
|---|---|---|
| T2: fixed-model coding-agent run design | Mixed gains, rejected | Better evaluator/variance guidance and cost interpretation, but source notes omitted a direct repeated context-delivery null that materially constrained the context recommendation. |
| T4: architecture-decision tooling | Improved | Corrected Wayfinder's local-Markdown tracker fallback and supplied a more diagnostic role-specific evaluation. |

T2's omission existed before synthesis. A final rewrite cannot reliably restore evidence never collected. The observed regression establishes failed acceptance on this held-out sample, not proof that the fallback instruction inherently causes omissions.

### F4 — Reviewer agreement is not source truth

Both T2 reviewers proposed changing SWE-agent's $1.67 denominator to per-instance cost. Source adjudication found the original Metrics section explicitly defines the average over successfully resolved instances, so the candidate was correct. Do not apply that proposed correction.

T4's omitted unrun Fovea benchmark design was not a material efficacy regression because the candidate retained the decision-changing absence of architecture-outcome evidence. Protect useful evidence, not every baseline source or sentence.

### F5 — Operational boundaries need explicit retention

Both T4 reports omitted the documented Wayfinder research-branch write requirement from their final permission guidance. This is a shared baseline/candidate gap. The candidate's general architecture and evaluation gains do not eliminate it.

## Timing observations

| Complete workflow | Incumbent | H2c |
|---|---:|---:|
| T2 | 884.379 s | 488.469 s |
| T4 | 507.500 s | 379.168 s |

These are single paired observations measured around research, persistence and synthesis, excluding subsequent acceptance reviews. The candidate finished sooner in both, but quality failed overall and repeated speed evidence is absent. No quality-preserving speed improvement is accepted.

## Proposed mutations — not applied

Paths below are relative to `skills/fabric-research/`. Retain frame → parallel research → one synthesis, full source-note handoff, and one authoritative `RESEARCH.md`.

### M1 — Recover incomplete original evidence

**File:** `researcher.md`.

When extracted text references a material table or figure but lacks cells, labels, units or notes, retrieve that same original in raw mode or another original format. Inspect bounded relevant passages with headers, captions and methods. Preserve disagreements between versions or sections. If recovery fails, identify what is missing rather than reconstructing it.

**Evidence:** tested H2 component with useful recovery gains. The exact proposed text is preserved in `candidate-H2c/researcher.md`. Not independently proven as a whole-skill improvement.

### M2 — Preserve governing conditions through the recommendation

**Files:** `researcher.md` and `references/synthesis-and-reporting.md`.

Carry sampling/averaging, candidate selection, metric denominator, resource axes and applicability conditions from the original into notes, comparisons and proposed local tests. Call a comparison matched only for variables actually held equal. Similar token counts do not establish equal compute, cost, latency or selection opportunity. Separate testing a demonstrated mechanism in applicable cases from exploratory testing outside those cases. Resolve a proposed numerical correction against the exact cited passage and its governing definition, not table labels or reviewer agreement.

**Evidence:** governing-condition and equivalence-label repairs passed the four H2c fixed-note compositions. The exact tested two-file diff is preserved in `candidate-H2c/`. Source-local correction discipline is additionally motivated by F1/F4, not separately benchmarked.

### M3 — Make counterevidence coverage explicit at assignment time

**File:** `references/stream-contracts.md`.

For each decision-critical intervention or alternative, assign responsibility for both supporting evidence and direct null/adverse comparisons. Before the worker stops, its note should state the resulting bounded conclusion or an explicit unresolved evidence gap. Require relevant coverage, not a source quota or more streams by default. Keep this within existing framing and research, without a new coordinator or rewrite loop.

**Evidence:** directly targets the T2 collection-stage omission. This mutation is untested. H3 was not started, and this proposal does not claim the omission would be prevented.

### M4 — Retain consequential side effects in operational recommendations

**File:** `references/stream-contracts.md`, under systems and operations.

When recommending a workflow, carry its consequential writes, branch creation, installs or external mutations and their required authority into the operating guidance. Identify a documented or explicitly proposed no-write alternative where relevant. Do not infer permission from a tool's availability.

**Evidence:** targets the shared T4 branch-authority omission. This mutation is untested.

## Recommendation

Keep the installed baseline for now. Preserve M1/M2 as the strongest tested candidate components and M3/M4 as evidence-motivated proposals. Do not install H2c wholesale or add H1's mandatory validation stages. No additional experiment or skill mutation is authorized by this closure.

## Evidence index

- `JOURNAL.md` and `LOOP.json`: hypothesis history and user-directed stop.
- `H2/SOURCE-ADJUDICATION.md`: initial condition/comparator failures and real gains.
- `H2c/reviews/A.md`, `H2c/reviews/B.md`: independent final fixed-note rechecks.
- `heldout/FINAL-ADJUDICATION.md`: authoritative held-out resolution, including overturned reviewer corrections.
- `heldout/live/T2-{X,Y}/receipt.json`, `heldout/live/T4-{X,Y}/receipt.json`: native execution pins and measured durations. Their historical pending-quality fields are superseded by the final adjudication.
- `H2c/STATIC-CHECKS.json`: two-file candidate mutation surface and preserved runtime contract.
