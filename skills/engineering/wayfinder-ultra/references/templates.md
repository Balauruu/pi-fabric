# Map and ticket templates

Replace every angle-bracket placeholder. Use stable ids and exact result names from the [ticket-type contracts](ticket-types.md).

## Map

```markdown
---
id: <map-id>
mode: planning
status: active
owner: <human-or-team>
mode-approved-by:
mode-approved-at:
mode-approval:
coordination: serial
tracker:
mirror-status: not-configured
mirror-checked-at:
frontier: []
completion-requires: []
created: <ISO-date>
updated: <ISO-date>
---

# <Destination name>

## Destination

<Observable end state.>

## Success criteria

- [ ] <Observable criterion>

## Notes

<Domain vocabulary, standing constraints, approval policy, and skills or repository conventions to consult.>

## Current route

<Compact human view generated from the structured `frontier`. Link records; do not copy them.>

## Fog

<In-scope uncertainty that cannot yet be stated as a precise outcome, or `- None.`>

## Out of scope

- <Explicit exclusion and reason>

## Residual risks

- <risk-id> — <risk and signal>; owner: <owner>; destination: <ticket, map, or operational system>

## Coordination

- Tracker mirror: <URL or `none`>
- Mirror status: <status and last verified read>
- Canonical branch: <branch>
```

## Ticket

The filename is exactly `<ticket-id>.md`.

```markdown
---
id: <ticket-id>
map: <map-id>
type: investigation
status: open
result: pending
disposition: pending
execution: autonomous
priority: normal
owner: <owner>
approver:
claimed-by:
claimed-at:
created: <ISO-date>
updated: <ISO-date>
requires: []
relates: []
implements: []
verifies: []
supersedes: []
discipline:
change-kind:
method:
subject-revision:
expires-at:
tracker:
---

# <Ticket name>

## Outcome

<One precise question or deliverable.>

## Context and scope

<Why it matters and what is excluded.>

## Ownership

<Who executes, who accepts, and which actions still require separate authorization.>

## Required inputs

<List each dependency and why its exact result is required.>

## Acceptance

- [ ] <Checkable criterion>

## Constraints

<Timebox, cost, permission, environment, side effects, and cleanup rules.>

## References

<Links to evidence, decisions, designs, revisions, and related work.>
```

## Resolution appendage

Add this before entering `review` or `closed`:

```markdown
## Resolution

<Type-specific result and concise explanation.>

## Evidence and artifacts

- <Durable link plus exact revision/environment where relevant>

## Acceptance check

- [x] <Criterion and evidence>

## Consequences

<New tickets, invalidated assumptions, residual risks, and remaining limitations.>

## Approval

<Approver, exact subject/revision, decision, and durable reference; or why no approval was required under established policy.>
```

Then update frontmatter. Closed productive work normally uses `disposition: completed`; terminal result names are defined by the type contract.

## Result-aware example

```text
INV-01 established current constraints
  -> DEC-01 accepted the worker model
      -> DES-01 approved job state and interfaces
          -> IMP-01 delivered the integrated candidate at abc123
              -> VER-01 failed recovery acceptance at abc123
                  -/-> REL-01 requires VER-01:pass and remains blocked
```

Closing `VER-01` does not unblock `REL-01`. Corrective Implementation and a new Verification of the corrected revision must produce a passing result.
