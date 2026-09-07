# Ticket contracts

Use the common ticket and resolution templates, adding only the fields for the selected type. These eight types are result categories, not mandatory stages. Unknown inputs remain unknown; do not fabricate facts to complete a template. Use `not applicable` with a reason for genuinely irrelevant fields.

## Investigation

**Question:** What is true, and what remains unknown?

**Inputs:** precise question; scope; source/code revision or observation date; evidence standard; timebox and stopping condition.

**Resolution:** findings with exact source/code references; observations versus inference; counterevidence; remaining unknowns; downstream implications.

**Completion:** answer to the declared standard, or a justified conclusion that available evidence is insufficient after the bounded investigation. Outcomes: `answered` or `inconclusive`. Time exhaustion without the promised investigation is not an answered result.

An inconclusive result does not establish a missing measurement. Downstream work may consume a documented unknown only if its predicate explicitly permits it. Use for external research, call/impact tracing, diagnosis, and as-is architecture views. A diagram is not additional evidence for its own claims.

## Experiment

**Question:** What happens if we try this?

**Inputs:** hypothesis/uncertainty; method; criteria; budget; exact environment; isolation/side-effect limits; cleanup owner; required human feedback if subjective.

**Resolution:** what actually ran; prototype/benchmark artifact; environment and revision; measurements or attributed human observations; limitations; interpretation; cleanup status; next question/decision.

**Completion:** trial executed and interpreted against the declared criteria. Outcomes: `supported`, `refuted`, or `inconclusive`; a negative result can be complete. An unrun trial cannot claim any of these as measured evidence.

For exploratory UI work, phrase a testable uncertainty rather than inventing a numeric metric. If promised human feedback is missing, keep the ticket awaiting that feedback. Prototype assets are non-production unless later accepted through Implementation. Unfinished cleanup is explicit corrective work with an owner, not hidden success.

## Decision

**Question:** What will we choose, and why?

**Inputs:** question; named decision owner or verified delegated authority; measurable/prioritized drivers where meaningful; constraints; evidence; viable alternatives, including the boring/status-quo option where meaningful.

**Resolution:** chosen option and rationale; rejected alternatives; trade-offs; positive/negative consequences; reversibility; rollback implications; validation; measurable revisit/flip conditions where possible; authority and approval evidence.

**Completion:** an authorized choice is accepted. Outcome: `accepted`. A recommendation stays in Review. A refusal returns work for revision, or closes as cancelled with the refusal recorded; it is not `accepted`. Choosing to do nothing can be an accepted choice if the owner explicitly chooses it.

Create an ADR when the choice is durable, consequential, surprising without context, and involves real alternatives. Otherwise a concise ticket resolution is enough. With an ADR, link its accepted revision as canonical; do not repeat its content in a competing decision record. Acceptance applies to the exact proposal, not future edits. Human-owned values must come from the human, not simulated grilling.

## Design

**Question:** How does the accepted approach fit together?

**Inputs:** desired behavior/acceptance; accepted applicable decisions; current-system evidence; constraints.

**Resolution:** responsibilities/interfaces; data and control flows; invariants; failure handling; compatibility/migration; tests/fitness checks; bounded implementation slices when useful; remaining uncertainties; review/acceptance evidence.

**Completion:** an implementer can proceed within scope without silently resolving consequential open choices, and required design review is satisfied. Outcome: `ready`. If a material decision remains, hold readiness and create/link the Decision. Ordinary internal details need not be prescribed.

As-is topology is Investigation. Proposed topology and interface shape are Design. Reviewing the proposed design can be part of this ticket, including in planning mode; a separate delivery Verification type is not required for routine design acceptance.

## Implementation

**Question:** What bounded working change will we deliver?

**Inputs:** observable acceptance; applicable decisions/designs; scope/exclusions; required tests/checks; declared delivery target; permissions.

**Resolution:** exact changes and commit/PR or equivalent artifact; acceptance evidence at the tested revision; limitations; actual delivery location.

**Completion:** required checks pass and the declared target is reached. Outcome: `delivered`. For ordinary repository work the default target is merged with required checks satisfied. A branch/patch-only target must be stated explicitly; target defaults do not authorize a merge. If merge is not authorized or still pending, do not close as delivered against a merged target.

Routine unit/regression tests belong here. Do not manufacture separate Verification tickets for them. Features, defects, refactors, infrastructure and documentation are change-kind facets. Production deployment is Release when relevant. A prototype does not bypass these acceptance requirements.

## Verification

**Question:** Does this exact subject satisfy these claims?

**Inputs:** exact artifact/revision/build/deployment; claims and criteria; method; environment; required reviewer independence proportional to consequence.

**Resolution:** verdict `pass`, `fail`, or `inconclusive`; actual checks/evidence; reproduction instructions; coverage limits; severity-ranked findings; linked corrective work.

**Completion:** declared evaluation is concluded and the evidence-backed verdict is recorded. Completed with `fail` or `inconclusive` is valid closure, but it does not satisfy a dependency requiring `pass`. If evaluation could not run, record why and an inconclusive verdict only with explicit coverage limits; never claim checks ran.

A passing result is bound to its subject and environment assumptions. It does not automatically transfer from commit A to commit B. Revalidate or obtain explicit evidence of applicability under the same acceptance policy. Preserve the original verdict when recording a later run.

## Release

**Question:** Can we safely make this available?

**Inputs:** exact candidate/target environment; required valid passing verification; authorized release owner; rollout steps; rollback/recovery; abort thresholds; observation window; action approval.

**Resolution:** actual candidate, environment and time; steps and approvals; observed health; outcome `successful`, `rolled-back`, or `failed`; corrective work and ongoing ownership.

**Completion:** the rollout attempt and required observation/recovery conclude. Pending observation is not successful closure. Failed or rolled-back attempts can close with those outcomes but do not establish destination availability. Unknown deployment state after timeout requires reconciliation, not a second blind deployment.

For irreversible changes, explicitly document recovery limits and owner-accepted risk rather than inventing rollback. Mode change, an agent recommendation, or a ticket comment is not deployment authorization.

## Enabler

**Question:** What prerequisite must exist before other work proceeds?

**Inputs:** exact prerequisite; whom/what it enables; permission/cost limits; verification; expiration and cleanup ownership where relevant.

**Resolution:** what is available; checked usability; safe location/access instructions without secret values; expiration; cleanup status/owner.

**Completion:** prerequisite exists and is usable. Outcome: `ready`. An expired environment or revoked access no longer satisfies readiness even though its historical ticket remains closed.

Use for sandboxes, access, sanitized data, or scheduling required participation. Name at least one enabled activity. Work that directly delivers the destination is Implementation or Release, not a miscellaneous Enabler. Planning-mode enablers must serve planning activities.
