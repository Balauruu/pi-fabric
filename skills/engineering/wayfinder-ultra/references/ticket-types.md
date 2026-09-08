# Ticket type contracts

Select a type by the **result the ticket must produce**. A method, discipline, or executor never determines the type. Every ticket also uses the common metadata and body contract in [templates](templates.md).

## Investigation

**Question:** What is true, and what remains unknown?

Use for external research, repository exploration, dependency tracing, production-log analysis, diagnosis, and as-is architecture discovery.

Required inputs:

- a precise question and bounded scope;
- repository revision, environment, or source boundary;
- evidence standard and stopping condition.

Required resolution:

- sourced findings;
- observations separated from inference;
- contradictions and remaining unknowns;
- implications for dependent tickets.

Results:

- `established`: evidence supports a usable answer;
- `disproved`: evidence rejects the tested claim;
- `inconclusive`: the bounded search cannot establish an answer.

Cancellation, duplication, and supersession use the common dispositions. An inconclusive investigation is complete but does not satisfy an `:established` dependency.

## Experiment

**Question:** What happens under a bounded trial?

Use for throwaway prototypes, benchmarks, integration spikes, usability trials, reproduction attempts, and failure injection.

Required inputs:

- hypothesis or uncertainty;
- method and evaluation criteria;
- time/resource budget;
- isolation, cleanup, and side-effect constraints.

Required resolution:

- exact artifact, procedure, environment, and revision;
- measurements or human observations;
- interpretation and limitations;
- cleanup outcome and recommended next step.

Results:

- `observed`: the trial produced usable observations;
- `inconclusive`: it ran but did not resolve the uncertainty;
- `aborted`: it could not safely or validly complete.

Prototype code is evidence, not production implementation. Promotion requires explicit Implementation acceptance.

## Decision

**Question:** What will the authorized owner choose, and why?

Use for architecture, product scope, domain, build-versus-buy, policy, and risk-acceptance choices.

Required inputs:

- active decision question and owner;
- measurable drivers and hard constraints;
- relevant evidence and explicit unknowns;
- viable alternatives, including the status quo when meaningful.

Required resolution:

- chosen option and rationale;
- rejected alternatives and trade-offs;
- positive and negative consequences;
- reversibility, rollback implications, and abort signals;
- validation and measurable revisit conditions;
- recorded approval by the decision owner.

Results:

- `accepted`: an option is authorized;
- `deferred`: the owner postpones commitment under a stated trigger;
- `rejected`: no proposed option is accepted.

Create an ADR only when the choice is hard to reverse, surprising without context, and the result of a real trade-off. The ticket links the ADR and does not restate it.

## Design

**Question:** How do accepted choices fit into an implementable contract?

Use for module interfaces, data contracts, state transitions, flows, migration sequencing, failure behavior, and slice/test design.

Required inputs:

- desired behavior and acceptance criteria;
- applicable accepted decisions;
- current-system evidence and constraints.

Required resolution:

- interfaces, invariants, and responsibilities;
- data/control flows and failure behavior;
- compatibility, migration, and observability implications;
- validation approach and bounded implementation slices;
- remaining uncertainties identified rather than silently decided.

Results:

- `approved`: authorized and implementable;
- `changes-requested`: review found specific design work still required.

An as-is diagram is Investigation evidence. A proposed topology is Design and must cite the Decisions that justify it.

## Implementation

**Question:** What bounded working change will be delivered?

Use for features, defects, refactors, infrastructure, migration tooling, and documentation changes that directly advance the destination.

Required inputs:

- observable acceptance criteria;
- applicable Decision and Design records;
- scope, exclusions, delivery target, and required checks.

Required resolution:

- linked commits or pull request and exact tested revision;
- concise change summary;
- criterion-by-criterion acceptance evidence;
- test/static/security results and known limitations.

Results:

- `delivered`: the declared target is reached with required checks passing;
- `failed`: implementation was attempted but acceptance failed;
- `abandoned`: work stopped intentionally with reasons.

Routine tests belong inside Implementation. Create a Verification ticket only for significant independent acceptance.

## Verification

**Question:** Does an exact subject satisfy the stated claims?

Use for independent acceptance, architecture fitness, security review, performance acceptance, migration rehearsal, or consequential design/code review. Planning maps permit this type only for planning artifacts with `verification-scope: planning`; see [lifecycle](lifecycle.md).

Required inputs:

- exact revision, artifact, build, or deployment;
- claims, thresholds, environment, and method;
- required degree of reviewer independence.

Required resolution:

- `pass`, `fail`, or `inconclusive` verdict;
- reproducible evidence and coverage limits;
- severity-ranked findings and linked corrective work.

Results:

- `pass`: all required acceptance claims hold;
- `fail`: at least one required claim does not hold;
- `inconclusive`: the method cannot establish a valid verdict.

A failed Verification ticket is complete, but it never satisfies a `:pass` dependency.

## Release

**Question:** Can the accepted revision safely become available?

Use for deployment, feature activation, publication, production migration, and decommissioning.

Required inputs:

- exact release candidate;
- required passing Verification result;
- authorized release owner;
- rollout, rollback, abort thresholds, and observation window.

Required resolution:

- target, revision, time, owner, and approval;
- actual rollout steps and health observations;
- rollback details where used;
- follow-up work and operational ownership.

Results:

- `successful`: rollout and observation satisfied the release criteria;
- `rolled-back`: rollback completed after an attempted rollout;
- `failed`: release failed and safe recovery is not yet established.

A completed rolled-back Release does not satisfy a destination requiring successful availability.

## Enabler

**Question:** Which concrete prerequisite must exist before another result can be produced?

Use for access, sandbox provisioning, representative datasets, stakeholder availability, and required test environments.

Required inputs:

- exact prerequisite and dependent work;
- permissions, cost, expiration, and cleanup constraints.

Required resolution:

- what is available and evidence it works;
- approved location or access instructions, never secret values;
- expiration and cleanup ownership.

Results:

- `ready`: the prerequisite is usable;
- `not-ready`: the attempt completed without establishing it;
- `expired`: a previously ready prerequisite is no longer usable.

Inspection at or after `expires-at` makes a recorded `ready` result inapplicable without rewriting its historical resolution. See [lifecycle](lifecycle.md) for reassessment and explicit expiry updates.

Enabler is not a miscellaneous-task bucket. Work that directly delivers the destination is Implementation or Release.

## Common terminal results

The validator also accepts `cancelled`, `superseded`, and `duplicate` for every type when paired with the corresponding closure disposition. These results document termination; they do not satisfy productive dependencies unless a downstream ticket explicitly and unusually requires one.
