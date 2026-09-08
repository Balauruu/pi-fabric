# Wayfinder extended ticket types proposal

**Status:** proposed, not implemented.

## Overview

Extend Wayfinder into a decision-to-delivery tracker with **eight work-ticket types plus the existing Map container**.

The organizing principle:

> A ticket's type describes the result it must produce, not the tool, skill, person, or technical discipline used to produce it.

This avoids overlapping types such as “Fovea ticket,” “architecture ticket,” “security ticket,” and “grilling ticket,” with ambiguous completion rules.

## 1. Core domain model

| Term | Meaning |
| --- | --- |
| **Map** | An effort with a destination, scope, completion criteria, and linked tickets |
| **Ticket** | A bounded unit of work with one primary result and a checkable completion contract |
| **Evidence** | A sourced observation or measurement supporting a finding, decision, or acceptance claim |
| **Artifact** | A durable output such as a report, ADR, design, patch, or validation result |
| **Dependency** | A required result from another ticket, not merely a link or ordering preference |
| **Frontier** | Eligible, unclaimed tickets whose required inputs and dependencies are satisfied |
| **Fog** | In-scope work that cannot yet be expressed with a precise question or outcome |
| **Resolution** | The recorded result, evidence, disposition, and consequences of finishing a ticket |

Preserve Wayfinder's progressive discovery. A complete tracker does **not** require a complete upfront plan.

### Map operating modes

Keep planning as the safe default, with an explicit broader mode:

- **Planning:** discover, investigate, experiment, decide, and design. Enablers are permitted when needed for those activities.
- **Delivery:** additionally track implementation, verification, and release.

A map may transition from planning to delivery through an explicit scope update. This does not automatically authorize deployment, purchases, or other consequential actions.

## 2. Proposed ticket types

| Label | Primary question | Required result |
| --- | --- | --- |
| `wayfinder:investigation` | **What is true, and what remains unknown?** | Evidence-backed findings |
| `wayfinder:experiment` | **What happens if we try this?** | Observations from a bounded trial |
| `wayfinder:decision` | **What will we choose, and why?** | An authorized choice |
| `wayfinder:design` | **How does the chosen approach fit together?** | An implementable design |
| `wayfinder:implementation` | **What working change will we deliver?** | A verified change |
| `wayfinder:verification` | **Does this satisfy the stated claims?** | An acceptance verdict |
| `wayfinder:release` | **Can we safely make this available?** | A recorded rollout outcome |
| `wayfinder:enabler` | **What prerequisite must exist before work can proceed?** | A confirmed prerequisite |

These are not mandatory stages. A small bug fix might need only one Implementation ticket. A consequential migration might use all eight.

### 2.1 Investigation

**Purpose:** establish facts through inspection, research, tracing, or diagnosis.

Includes:
- External documentation and package research.
- Repository exploration and dependency analysis.
- Production-log analysis.
- Root-cause investigation.
- Existing-system architecture discovery.

**Required inputs**
- Precise question.
- Scope and relevant environment/revision.
- Evidence standard and stopping condition.

**Required resolution**
- Findings with source or code references.
- Observations distinguished from inference.
- Contradictory evidence and remaining unknowns.
- Implications for dependent tickets.

**Completion:** the question is answered to the declared evidence standard, or the investigation explicitly concludes that available evidence is insufficient.

An inconclusive investigation may be complete **without satisfying a dependent ticket's evidence requirement**.

**Likely methods:** Fabric research, scouting, Fovea.

### 2.2 Experiment

**Purpose:** create new evidence through a bounded intervention.

Includes:
- Throwaway prototypes.
- Benchmarks.
- Integration spikes.
- Usability trials.
- Failure-injection exercises.
- Reproduction experiments.

**Required inputs**
- Hypothesis or uncertainty.
- Trial method and evaluation criteria.
- Time/resource budget.
- Isolation, cleanup, and side-effect constraints.

**Required resolution**
- What was actually run.
- Artifact and environment/revision.
- Measurements or human observations.
- Limitations and interpretation.
- Cleanup outcome.
- Recommended next decision or experiment.

**Completion:** the trial was performed and interpreted, including a negative or inconclusive result.

**Important distinction:** prototype code is not production implementation. Promoting it requires explicit implementation acceptance.

A UI prototype may need live human feedback; a benchmark generally does not. Therefore “Experiment” should not imply a fixed HITL/AFK mode.

### 2.3 Decision

**Purpose:** commit to an approach under explicit constraints.

Includes:
- Architecture choices.
- Product scope and priority choices.
- Domain terminology and ownership.
- Build-versus-buy.
- Risk acceptance.
- Reconsideration of an earlier decision.

**Required inputs**
- Decision question.
- Decision owner.
- Drivers and constraints.
- Relevant evidence.
- Viable alternatives, including the status quo where meaningful.

**Required resolution**
- Chosen option and rationale.
- Rejected alternatives and trade-offs.
- Positive and negative consequences.
- Reversibility and rollback implications.
- Validation expectations.
- Revisit conditions.
- Approval or documented delegated authority.

**Completion:** the authorized owner accepts a choice. An agent recommendation alone is not acceptance.

**ADR rule:** create an ADR when the choice is sufficiently durable and consequential; otherwise retain a concise decision record in the ticket. If there is an ADR, the ticket links to it rather than duplicating its contents.

**Likely methods:** grilling, domain modeling, Principal-style decision analysis.

### 2.4 Design

**Purpose:** turn accepted choices into a coherent implementation contract.

Includes:
- Module interfaces and responsibilities.
- Data contracts and state transitions.
- End-to-end flows.
- Migration sequencing.
- Acceptance and test design.
- Implementation-slice decomposition.

**Required inputs**
- Desired behavior and acceptance criteria.
- Applicable accepted decisions.
- Current-system evidence.
- Relevant constraints.

**Required resolution**
- Proposed interfaces and behavior.
- Data/control flows and invariants.
- Failure handling.
- Compatibility and migration implications.
- Validation approach.
- Implementation slices where needed.
- Explicit remaining uncertainties.

**Completion:** someone can implement within the stated scope without silently making unresolved consequential decisions.

Routine implementation details need not be predetermined. If a material architectural choice emerges, create or reopen a Decision ticket.

**Distinction:** an as-is C4 diagram belongs to Investigation; a proposed topology belongs to Design and references the decisions that justify it.

### 2.5 Implementation

**Purpose:** deliver one bounded working change.

Includes:
- Features.
- Bug fixes.
- Refactoring.
- Infrastructure changes.
- Documentation changes.
- Migration tooling.

**Required inputs**
- Observable acceptance criteria.
- Applicable decision/design references.
- Scope and exclusions.
- Required checks.

**Required resolution**
- Linked commits or PR.
- What changed.
- Acceptance evidence tied to the tested revision.
- Known limitations.
- Delivery location: branch, merged revision, or other explicitly named target.

**Completion:** the change reaches the ticket's declared delivery target and passes its required checks.

For the ordinary repository workflow, default to **merged with required checks satisfied**, not merely “code written.” Deployment remains separate when relevant.

Routine testing belongs inside Implementation. Do not create a separate Verification ticket for every unit-test run.

### 2.6 Verification

**Purpose:** independently assess a significant claim or acceptance boundary.

Includes:
- Cross-module acceptance testing.
- Architecture fitness checks.
- Security review.
- Performance acceptance.
- Migration rehearsal.
- Independent design or implementation review.

**Required inputs**
- Exact subject: revision, artifact, build, or deployment.
- Claims and acceptance criteria.
- Method and required reviewer independence.
- Environment.

**Required resolution**
- Pass, fail, or inconclusive verdict.
- Evidence and reproduction instructions.
- Coverage limits.
- Severity-ranked findings.
- Linked corrective work.

**Completion:** the evaluation is complete and its verdict is recorded.

**Critical rule:** a Verification ticket can be complete with a **failed** verdict. That must not unblock a release requiring a pass.

Independence should be proportional to consequence; it need not always mean another person or model.

### 2.7 Release

**Purpose:** manage the transition from verified work to actual availability.

Includes:
- Deployment.
- Feature-flag activation.
- Package publication.
- Production data migration.
- Decommissioning.

**Required inputs**
- Exact release candidate.
- Required passing verification.
- Authorized release owner.
- Rollout and rollback procedure.
- Abort thresholds and observation window.

**Required resolution**
- What was released, where, and when.
- Actual rollout steps and approvals.
- Health observations.
- Outcome: successful, rolled back, or failed.
- Follow-up work and ownership.

**Completion:** the rollout attempt and required observation are concluded, including rollback when needed.

A completed but rolled-back Release does not satisfy a map whose destination requires successful availability.

### 2.8 Enabler

**Purpose:** establish a concrete prerequisite without pretending it is a decision or product increment.

Includes:
- Provisioning a sandbox.
- Obtaining access.
- Preparing a sanitized dataset.
- Arranging stakeholder participation.
- Configuring a required test environment.

**Required inputs**
- Exact prerequisite.
- Tickets or activities it enables.
- Permissions, cost, and cleanup constraints.

**Required resolution**
- What is now available.
- Evidence that it is usable.
- Relevant location or access instructions, never secret values.
- Expiration and cleanup ownership where applicable.

**Completion:** the prerequisite exists and has been checked.

**Scope rule:** Enabler is not a miscellaneous-task bucket. If the work directly delivers the destination, use Implementation or Release.

## 3. Keep type separate from other dimensions

Do not encode everything into ticket types.

### Recommended facets

- **Discipline:** architecture, security, data, UX, performance, operations.
- **Change kind:** feature, defect, refactor, migration, documentation.
- **Execution mode:** autonomous, collaborative, human-performed.
- **Approval:** none required under existing authority, or named approver.
- **Priority and risk:** project-defined.
- **Method:** grilling, prototype, benchmark, source review.

Examples:

```text
Decision
  discipline: architecture
  execution: collaborative
  approval: technical owner

Experiment
  discipline: performance
  method: benchmark
  execution: autonomous

Implementation
  change-kind: defect
  discipline: data
```

**Autonomous execution is not permission to approve its own consequential actions.**

## 4. Lifecycle and dependency semantics

### Common lifecycle

```text
Open → Active → Review → Closed
          ↑        │
          └────────┘
```

- **Open:** defined but not yet being worked.
- **Active:** claimed and in progress.
- **Review:** result available; required acceptance remains pending.
- **Closed:** resolution or non-completion disposition recorded.

Allow Active → Closed when no separate review is required.

Track separately:
- Closure disposition: completed, cancelled, superseded, duplicate.
- Type-specific result: accepted decision, inconclusive research, failed verification, successful release.
- Blocked/readiness status: derived from prerequisites, not confused with lifecycle.

### Replace “closed means unblocked”

Current Wayfinder considers closed blockers satisfied. That is inadequate for delivery.

Instead:

> A dependency is satisfied when its declared required result exists and remains applicable.

Examples:

```text
Implementation requires Decision.accepted
Release requires Verification.pass for the release candidate
Experiment requires Enabler.environment-ready
```

Cancellation, supersession, failure, and inconclusive findings do not automatically satisfy dependencies.

Use native tracker blocking for visibility, but keep the required-result condition explicit. If the tracker cannot express it, the skill must check it before claiming downstream work.

### Relationship types

Keep the initial set small:

- **Part of:** ticket belongs to a map.
- **Requires:** work depends on a specified result.
- **Implements:** change realizes a decision or design.
- **Verifies:** evaluation assesses a particular subject.
- **Supersedes:** new work replaces an earlier record.

Only **Requires** determines blocking. Prevent cycles in that graph.

## 5. Shared ticket template

```markdown
## Outcome
<one precise question or deliverable>

## Context and scope
<why this matters; exclusions>

## Ownership
<executor, execution mode, required approver>

## Required inputs
<dependencies and the specific results required>

## Acceptance
<checkable completion conditions>

## Constraints
<budget, permissions, environment, risk, timebox>

## References
<evidence, decisions, designs, related work>
```

At resolution, record:

```markdown
## Resolution
<result and type-specific outcome>

## Evidence and artifacts
<durable links; exact revisions where applicable>

## Acceptance check
<criterion-by-criterion result>

## Consequences
<new tickets, invalidated assumptions, remaining limitations>

## Approval
<who accepted what, where required>
```

Keep type-specific detail in linked templates, not in every ticket.

## 6. Map-level completion

The map should contain:

- Destination and observable success criteria.
- Planning or delivery mode.
- Scope and exclusions.
- Ownership and approval policy.
- Compact decision/artifact index.
- Fog.
- Outstanding risks and revisit triggers.
- Links to live tracker queries.

A map is complete only when:
1. Its destination criteria are satisfied.
2. Required ticket outcomes are satisfied.
3. No mandatory fog or blocking work remains.
4. Residual risks and deferred work have explicit disposition and ownership.

**“All issues closed” is not sufficient.**

Ongoing monitoring should transfer to a named operational owner or follow-up effort rather than keeping every map open forever.

## 7. Example: introducing asynchronous report generation

```text
Map: Users can generate large reports without request timeouts
│
├─ Investigation: Trace current report bottlenecks
├─ Investigation: Establish delivery and retention requirements
│
├─ Enabler: Prepare representative sanitized workload
│   └─ Experiment: Measure candidate worker throughput
│
├─ Decision: Choose execution and retry model
│   requires relevant investigation and experiment results
│
├─ Design: Define job state, interfaces, and failure handling
│   requires accepted execution model
│
├─ Implementation: Deliver submit → process → download slice
├─ Implementation: Add cancellation and duplicate protection
│
├─ Verification: Validate throughput and recovery behavior
│   verifies the integrated candidate revision
│
└─ Release: Enable the worker-backed path progressively
    requires a passing verdict for that candidate
```

A failed recovery test completes the Verification ticket with a failure verdict, creates corrective work, and leaves Release blocked.

## 8. Migration from current Wayfinder

| Current type | Proposed treatment |
| --- | --- |
| Research | Investigation |
| Prototype | Experiment, with `method: prototype` |
| Grilling | Decision, with `method: grilling` |
| Task | Enabler, preserving its prerequisite-only purpose |

Existing closed tickets should retain their historical meaning. Reclassify open tickets only after inspecting what result they actually need.

Preserve one primary ticket per working session by default, but permit explicitly coordinated parallel work on independent tickets. Do not automatically launch every Investigation merely because its type allows autonomous work.

## Recommendation

Adopt this taxonomy, but keep the everyday experience small:

> Investigate what is true. Experiment where evidence is missing. Decide what to do. Design how it fits. Implement the change. Verify the claims. Release safely. Enable prerequisites when necessary.

That provides full lifecycle coverage while preserving Wayfinder's most valuable property: **only expose the next precise, justified work instead of manufacturing a giant plan upfront.**
