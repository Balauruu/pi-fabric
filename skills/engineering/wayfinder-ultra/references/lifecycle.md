# Lifecycle, applicability, and inspection

## Modes and authority

Planning permits investigation, experiment, decision, design, enabler, and verification of planning artifacts. A planning Verification must set `verification-scope: planning` and identify its exact artifact in `subject-revision`. It must not authorize or perform implementation or release work. Delivery permits every ticket type, including planning work. Planning-scoped Verification cannot serve as the required passing release verification, even after the map enters delivery. Enter delivery only with owner-approved scope recorded in map metadata. Changing modes never grants permission for consequential actions.

## State transitions

| Transition | Owner and required evidence |
| --- | --- |
| New -> open | Author defines outcome, inputs, acceptance, ownership, and scope |
| open -> active | Executor obtains permitted claim, checks current requirements and authority |
| active -> review | Executor records proposed result, evidence, acceptance assessment, consequences, and approval request |
| review -> active | Executor records requested changes and retains a valid claim |
| review -> closed | Required approver accepts the exact subject, or executor records why standing policy permits closure |
| active -> open | Executor releases claim and records interruption and remaining work |
| open/active/review -> closed administrative result | Authorized owner records cancellation, duplication, or supersession rationale and assessment of unperformed work |

Open means defined but unclaimed, active means claimed and being worked, review means a result is proposed and awaiting acceptance, and closed means a terminal resolution is recorded. Active/review requires a claim. Open/closed has none. Result and disposition stay pending until closure. Closed type-specific results require disposition `completed`, including negative results. Administrative results `cancelled`, `superseded`, and `duplicate` require matching dispositions. Terminal records are not reopened automatically. Corrective work normally receives a new ticket. Git history records transitions and their actors. Snapshot inspection checks resulting records, not whether a historical transition was authorized.

## Acceptance assessment

`acceptance-outcome` is optional for compatibility. New templates include it with initial value `pending`.

- `pending`: no final assessment yet. Allowed while open/active/review, not when closed.
- `satisfied`: every outcome acceptance criterion holds.
- `not-satisfied`: at least one criterion failed. Explain each failure and link correction or disposition.
- `not-assessed`: the work stopped or could not establish an assessment. Identify unassessed criteria and why.

While non-closed, the field may contain a proposed final assessment in review only. A successful type result requires `satisfied`. Unsuccessful and administrative results may use any final assessment supported by evidence. A Verification `fail` may still have satisfied the ticket's outcome of conducting a review. These are different claims.

For explicit `not-satisfied`/`not-assessed`, the original Acceptance checklist retains failed/unassessed unchecked items. Acceptance check must contain a concrete criterion-by-criterion assessment with checked entries meaning **assessment recorded**, not **criterion passed**. Do not tick a failed original criterion to close a ticket.

Legacy records without this field retain their existing complete-checklist rules. Do not infer or rewrite historical assessment. When revising such a record, add the field only after reviewing its evidence.

## Applicability and history

`applicability` is optional, defaulting to `current`. New templates include it. `needs-reassessment` is set by the executor or reviewer when recorded evidence no longer supports continued reliance. Clearing it requires a recorded review of the exact subject by the required approver. Preserve the old resolution and append the new assessment with date, actor, evidence, and consequences. Git owns the history.

Inspection also derives reassessment when a ticket's required result no longer matches, when an upstream result is itself inapplicable, or when a ready enabler has expired at the inspection time. This propagates through dependencies. Expiry does not rewrite historical `ready` to `expired`. An owner may explicitly record `expired` with supporting evidence.

A closed completed ticket with invalidated inputs is historically recorded, not structurally invalid merely for that reason. Its result cannot satisfy downstream readiness or map completion until reassessment is resolved. Active/review work with such inputs is an error and must stop. An open ticket with unmatched requirements is blocked, not invalid.

An effective successful same-type replacement lists the old ticket in `supersedes`. Set the old current result/disposition to `superseded`, preserving its historical resolution. Do not rewrite old downstream requirements to manufacture historical validity. Reassess or supersede affected results. A reassessment cannot override a still-unmatched requirement.

## Inspection interface

The Python module in `scripts/validate_tracker.py` exposes:

```python
inspect_map(map_dir: Path, *, now: datetime) -> Inspection
```

Supply timezone-aware time. Inspection reads local Markdown and never writes records or contacts Git or a tracker. The standard-library-only command supplies current UTC time by default. `validate(map_dir)` remains a compatibility wrapper returning error strings.

The JSON report contains:

- `diagnostics`: objects with `code` and `message`. `invalid-record` indicates a structural or consistency error. Messages include record paths where applicable.
- `frontier`: open, unclaimed, applicable tickets whose exact-result requirements match, ordered by priority, creation time, then id. This is dependency readiness, not permission to execute. Map activity and serial capacity are separate blockers.
- `blockers`: ticket ids mapped to explicit reasons, including claims, map status, serial capacity, unmatched requirements, and reassessment.
- `reassessment`: ticket ids mapped to reasons their result cannot currently be relied on.
- `completion`: `mechanical-ready` plus `unmet` conditions. This is never proof of product success, human approval, accepted Git revision, or live tracker state.

Any diagnostic makes the report non-actionable and the command exits 1. Successful inspection exits 0 even if work is legitimately blocked. CLI argument errors exit 2. Output order is deterministic for the same files and inspection time. Persist only the returned frontier, not the entire report. Inspection reports stale persisted frontier as an error and still returns its derived replacement.

## Maintaining this skill

Run the interface and command checks from any directory, substituting the absolute loaded skill directory:

```bash
python3 -B -m unittest discover -s <skill-directory>/tests -q
python3 -B <skill-directory>/scripts/validate_tracker.py --self-test
```

Tests build temporary records from the actual templates, exercise inspection with a fixed clock, verify CLI exit/output behavior, and check local documentation links. They do not mutate repository maps.

## Compatibility and migration

Existing commands and constrained frontmatter remain supported. No automatic migration or record writer is introduced. The new ticket fields are optional. Add `verification-scope: planning` when creating or moving planning Verification records. Existing delivery Verification records need no change.

Existing successful closed records retain their checklist checks. Negative legacy records keep their prior interpretation until explicitly assessed. Expired enablers and invalidated closed dependents now report non-applicability rather than requiring historical evidence to be rewritten. Maps previously relying on those results must resolve the reported completion blockers before completion. Review any persisted frontier changes, rerun inspection, then follow normal Git review policy.
