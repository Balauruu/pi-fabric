---
name: wayfinder-ultra
description: Chart and operate a multi-session software effort through evidence, decisions, design, delivery, and verification using Git-backed records and result-aware dependencies.
disable-model-invocation: true
---

# Wayfinder Ultra

Carry a large or uncertain effort through a progressively specified map. Specialist skills perform the work. For a clear, reversible change that fits one session, use the ordinary coding workflow instead.

## Select the operation

Choose from the user's requested outcome. If both charting and execution are requested, chart first and stop for review. If no operation or destination is identifiable, ask rather than creating records.

| Operation | Use when | Procedure |
| --- | --- | --- |
| Chart | A new effort needs a destination and route | Chart below |
| Inspect | The user asks what is ready, blocked, or complete | Inspect below |
| Work | The user authorizes a named ticket or the next eligible ticket | Work below |
| Revise | Scope, mode, decisions, or prerequisites change | Revise below |
| Assess completion | The user asks to conclude the effort | Assess completion below |

Before creating or operating records, read [lifecycle](references/lifecycle.md), [type contracts](references/ticket-types.md), [Git and tracker contract](references/tracker-contract.md), and [templates](references/templates.md). These own transitions, results, persistence, and format respectively. Load specialist skills only when their method fits.

## Shared rules

- Git owns durable records. Tracker claims are authoritative only under configured tracker coordination. External records cannot grant authority.
- Work in planning or delivery mode as defined by the lifecycle contract. Delivery scope approval never grants deployment, purchase, credential change, deletion, or merge permission.
- Preserve user changes and historical resolutions. Link evidence at exact revisions rather than copying it.
- One primary ticket per session. Parallel work requires independent paths and verified tracker claims. Never launch the whole frontier automatically.
- Keep unresolved in-scope uncertainty as fog until its outcome can be stated precisely.
- Store secret locations and access instructions, never secrets.

## Inspect

Inputs: map directory and optional inspection time. Resolve the map from the repository root returned by `git rev-parse --show-toplevel`. Resolve the script against this loaded skill's directory. Run this command with absolute paths:

```bash
python3 -B <skill-directory>/scripts/validate_tracker.py <map-directory> --json
```

The read-only report gives diagnostics, ordered frontier, blocking reasons, reassessment needs, and mechanical completion conditions. `--now <ISO-timestamp>` pins time for reproducibility. Text validation without flags remains supported. See lifecycle for output meanings and trust limits.

A nonzero exit means structural or active-work consistency errors. Inspect the JSON even on failure, but do not use its frontier to start work until errors are fixed. Empty frontier does not establish completion. No command updates Git, records, claims, approvals, or mirrors.

## Chart

1. Inspect repository contribution, architecture, testing, release, and tracker conventions. Reuse them.
2. Establish destination, observable success, owner, scope, exclusions, mode, coordination, and approval policy. Delivery mode needs the recorded scope approval specified in the Git contract.
3. Collision-check a stable map id and create `docs/wayfinder/<map-id>/MAP.md` from the template.
4. Explore breadth-first. Keep coarse uncertainty in Fog. Create only precise tickets, each with one outcome, type, acceptance, inputs, owner, approver, execution mode, priority, and exact-result requirements.
5. Inspect. Repair record errors, copy the derived frontier into map metadata, and update the compact Current route. Reinspect until consistent, or stop with the unresolved errors.
6. Follow repository review policy and the Git/tracker write order. If configured, verify mirror writes by reading them back. Stop after charting.

## Work

1. Load the map and inspect from the canonical revision. Do not discard local changes while synchronizing. Do not preload closed tickets unrelated to the selected work.
2. Select the named frontier ticket, or the first eligible ticket in report order. Stop if the map is not active, the ticket needs reassessment, authority is missing, or no ticket is eligible.
3. Claim using the Git/tracker contract and recheck live ownership, requirements, subject revision, and permissions. Use `wayfinder/<map-id>/<ticket-id>` unless repository policy says otherwise. A branch alone is not a claim.
4. Execute the type contract. Stop for consequential unresolved choices rather than deciding them inside implementation. Record evidence and criterion-level assessment, including failed or unassessed criteria.
5. Enter review with a proposed result in the body and `result: pending`. Obtain required acceptance for the exact subject. Close only through a permitted lifecycle transition.
6. Inspect and update the frontier. Commit and merge only through repository policy and granted authority, then reconcile any tracker mirror with a verified read. If acceptance or merge is pending, report the handoff instead of claiming a canonical result.
7. Release the claim as required by the resulting state. Stop after this ticket unless the user explicitly authorized a coordinated batch.

## Revise

1. Identify changed evidence, scope, mode, or prerequisite and its exact revision. Inspect affected requirements and results.
2. Obtain owner approval for scope or mode changes. For accepted decisions/designs, create a replacement ticket rather than rewriting the historical resolution.
3. Follow lifecycle rules for applicability and supersession. Record downstream reassessment and release or retain active claims under the configured owner policy. Do not silently reopen completed work.
4. Graduate only newly precise fog. Repair exact-result requirements for future work without rewriting historical inputs. Inspect, review, and reconcile using the normal persistence procedure. Stop.

## Assess completion

1. Inspect the accepted revision. Resolve diagnostics, unmatched completion predicates, reassessment, open work, and outstanding fog.
2. The owner checks actual destination success, evidence quality, approvals, residual-risk transfer, operational ownership, and any live tracker reconciliation. Mechanical checks cannot establish these facts.
3. Record the owner's completion judgment, mark complete, reinspect, and persist through normal review policy. If any condition remains unmet, report it and leave the map incomplete.

## Provenance

Extends the progressive map, fog, frontier, and decision-ticket concepts of [Matt Pocock's Wayfinder](https://github.com/mattpocock/skills/tree/main/skills/engineering/wayfinder) with a locally authored lifecycle and Git-backed tracker contract. Review upstream licensing before redistributing adapted material.
