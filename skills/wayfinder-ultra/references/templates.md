# Working templates

Replace placeholders with actual facts; unknown required fields remain explicit blockers. Optional facets may be omitted. Use relative paths for the local backend and named tracker links for external backends. These examples describe metadata, not executable commands or an installed schema parser.

## Map

```markdown
# <destination title>

Workflow: wayfinder-ultra
Schema: 1
Label: wayfinder:map
ID: <stable identity>
Mode: planning
Owner: <human owner>
Status: open
Tracker: <backend and canonical location>
Writer policy: <verified conditional claim or named single coordinator>
Artifact roots: <repo ADR/design/evidence locations>
Capacity policy: <verified limits/units and index budget, or unresolved>

## Destination and acceptance
<observable outcome; criterion-by-criterion evidence required to finish>

## Scope and exclusions
<in scope; deliberately excluded with reasons>

## Authority and execution
<decision owners; approval policy; allowed effects; executor identities>

## Notes
<domain, constraints, methods, ordering preferences>

## Current view
<frontier query or local enumeration procedure; blocked/stale work query>

## Decisions and artifacts index
<bounded named links and one-line gists; links to index pages>

## Not yet specified
<in-scope fog; no duplicate of already-ticketed work>

## Risks and revisit triggers
<signal; affected decision; owner; follow-up>

## Membership and recovery
<how all tickets/resolutions remain enumerable; export/rebuild location>

## Handoff or closure
<open until checked; achieved/cancelled; destination evidence;
mandatory fog/blockers; accepted residual risk/deferrals and owners>
```

## Ticket

```markdown
# <question or deliverable title>

Workflow: wayfinder-ultra
Schema: 1
ID: <stable identity>
Created: <immutable UTC timestamp; unknown only for unavailable legacy history>
Part of: <named map link>
Type: <one of the eight types>
Label: wayfinder:<type>
Lifecycle: open
Closure disposition: none
Outcome: pending
Current resolution: none
Owner: <human owner>
Executor: <session identity or unclaimed>
Claim: <unclaimed or identity/time/handoff details>
Execution mode: <autonomous | collaborative | human-performed>
Approval: <named approver and scope, or not-required with basis>
Priority: <project value or unspecified>
Facets: <optional discipline, change-kind, method, risk>

## Outcome sought
<one precise question/deliverable>

## Context and scope
<why this matters; exclusions>

## Required inputs and relationships
- Requires: <ticket link>; result: <predicate>; subject: <revision/environment>;
  evidence: <resolution>; applicability: <current/stale/unknown with basis>
- Implements / Verifies / Supersedes: <links when relevant>

## Acceptance
<checkable criteria; required approval; declared delivery target if implementation>

## Type-specific contract
<fields required by the selected type's input and resolution contract>

## Constraints
<budget/timebox; permissions; environment; cleanup; side effects>

## Evidence and references
<source/artifact links; revisions; observation dates>

## Resolution history
<append-only named links; never overwrite a historical finding>
```

## Resolution

```markdown
# <ticket title>: <result summary>

Resolution ID: <unique stable identity>
Ticket: <named link>
Map: <named backlink>
Recorded: <time and executor>
Disposition: <completed | cancelled | superseded | duplicate>
Outcome: <type-specific evidenced result, or none for non-completion>
Subject: <exact revision/artifact/environment where applicable>

## Result
<answer/change/verdict and selected type's required resolution fields>

## Evidence and artifacts
<durable named links; measurements; reproducible checks; coverage limits>

## Acceptance check
<each criterion: met/unmet/not-applicable with evidence and reason>

## Approval
<who accepted precisely what, authority source, revision and scope;
or valid not-required basis; never fabricated>

## Consequences
<new work; unsatisfied/stale downstream predicates; fog graduation;
revisit conditions; risk/deferrals; cleanup and ownership>

## Publication/recovery
<confirmed external effects; ticket/index updates confirmed or pending;
stable effect/operation references for reconciliation>
```

A proposed resolution awaiting acceptance belongs in Review, not closed/completed. Keep it explicitly marked proposed until acceptance; retain proposal history when publishing the final result.

## Example dependency and failure

```text
Map: Large reports are available without request timeouts (delivery)
Investigation: Trace bottleneck -> answered with source references
Enabler: Prepare sanitized workload -> ready and usable
Experiment: Benchmark workers -> refuted leading throughput hypothesis
Decision: Choose execution model -> accepted by owner after comparing options
Design: Define job state/interfaces -> ready with migration and test plan
Implementation: Deliver submit/process/download -> delivered at merged commit A
Verification: Check recovery at A -> completed, fail
Release: Activate progressively -> open, blocked (requires Verification.pass at A)
```

The failed verification has a legitimate completed resolution. Release stays blocked and corrective work is linked. If the fix produces B, record verification for B and update the release candidate/predicate explicitly. If rollout later rolls back, its Release outcome is rolled-back and destination availability remains unproven.
