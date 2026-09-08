# Research: fixed-model tool-using coding-agent operating policy

## Brief

Produce a decision-grade operating policy for improving tool-using coding-agent performance **without changing the model or reasoning effort**.

- **Fixed model:** `openai-codex/gpt-5.6-terra`
- **Reasoning effort:** medium
- **Research date:** 2026-09-07
- **Scope:** context selection, tool interfaces, task contracts, parallelism, retries, recovery, and self-critique.
- **Constraint:** do not claim universal effect sizes or unmeasured performance gains.

## Requirement contract

| ID | Exact question | Required inclusions | Expected contribution | Decision context |
|---|---|---|---|---|
| R1 | What evidence distinguishes context selection, tool interfaces, task contracts, parallelism and recovery interventions, including actual results and methods? | Inspected primary sources, actual results with methods and conditions, separate intervention categories | Evidence-backed distinctions among intervention classes | Choose fixed-model operating changes without claiming universal effects |
| R2 | Where do more context, more agents, retries or self-critique fail, and what cannot transfer to current GPT-5.6 Terra? | Null or regression evidence, failure conditions and methods, explicit GPT-5.6 Terra transfer limits | Bounded failure modes and non-transferable evidence | Avoid adopting scale, retry, or critique mechanisms on unsupported assumptions |
| R3 | Which observed failure should trigger which intervention, with validation and stop conditions? | Failure-to-intervention matrix, observable trigger, validation, stopping criteria | Usable operating policy | Make operational response decisions for tool-using coding agents |
| R4 | What exact fixed-model paired evaluation could change the recommendation, including accepted-task quality, wall time and failure accounting? | Paired fixed-model protocol, accepted-task quality and validator, wall time and complete failure accounting, decision rule | Executable evaluation checklist | Test the policy without changing model or reasoning effort |

## Answer and scope

This run cannot support an empirical recommendation that more context, different tool interfaces, stronger task contracts, more agents, retries, recovery loops, or self-critique improve coding-agent outcomes.

No public primary coding-agent source, original benchmark artifact, measured result, null result, regression result, or source passage was retrieved and inspected. The retained local workflow materials specify research and evaluation requirements only. They contain no experimental results about coding-agent interventions.

The supported operating conclusion is therefore limited:

> Do not adopt mechanism-specific changes for GPT-5.6 Terra on an assumed benefit. Treat each proposed intervention as unverified until it passes a fixed-model paired evaluation on the target task distribution with complete attempted-run accounting.

This is not evidence that any intervention fails. It is an evidence-availability conclusion.

## Retrieval status and evidence limits

The assigned research streams consistently report that the required configured web-research provider was unavailable. The delegated configured-model research path also encountered the Fabric agent-depth limit. Browser use, authentication, and substitute retrieval paths were excluded by the assignment.

The observed execution blocker is documented in the retained streams:

- No authorized `web_search` or `fetch_content` provider was callable.
- The prescribed delegated research route could not start because of the Fabric agent-depth limit.
- The repair stream did not retrieve or inspect primary evidence.
- Completed worker status and persisted nonempty notes establish only that notes were saved. They do not establish provider availability, successful external retrieval, or empirical support.

The source, quantitative-comparability, and Terra-transfer gates therefore fail for R1 and R2.

## R1 — intervention evidence

**Disposition: blocked.**

No inspected primary evidence distinguishes context selection, tool interfaces, task contracts, parallelism, retries, recovery, or self-critique for coding agents in this run.

Actual results and methods are unavailable. There is no retained study with all material comparison fields:

- task or dataset and version;
- model and serving snapshot;
- system prompt, scaffold, tools, permissions, and context policy;
- action, retry, and wall-time budgets;
- comparator and intervention definition;
- validator, denominator, exclusions, and failure handling;
- measured outcome, repetitions, uncertainty, and latency or cost accounting.

Accordingly, the following must not be treated as findings:

- More or better-selected context improves coding-agent performance.
- A particular tool interface independently improves outcomes.
- Better task contracts improve quality or reduce time.
- Parallel or multi-agent work improves accepted-task quality.
- Retries, recovery, or self-critique improve pass rate, latency, or cost.

The retained notes identify these as categories requiring controlled evidence, not categories with demonstrated effects.

## R2 — failures, counterevidence, and GPT-5.6 Terra transfer

**Disposition: blocked.**

No inspected null or regression evidence establishes where larger context, more agents, retries, or self-critique fail. The failure conditions below are hypotheses suitable for testing, not verified empirical findings.

| Mechanism | Hypothesis to test | Why external results do not transfer automatically to GPT-5.6 Terra |
|---|---|---|
| More context | Additional material may be stale, contradictory, irrelevant, or may crowd out task-relevant information. | Results depend on model and serving snapshot, effective context window, repository-selection policy, summarization, transcript format, and task distribution. Token count alone is not comparable. |
| More agents | Coordination may duplicate work, create incompatible edits, delay validation, or weaken accountability. | Results depend on role prompts, communication topology, model sampling, concurrency, merge policy, tool isolation, and shared-state handling. |
| Retries | Repeating an unchanged failed trajectory may replay the same diagnosis or increase attempts without improving the complete-denominator outcome. | Retry benefit depends on state reset, retry cap, validator feedback, failure classification, denominator treatment, elapsed-time accounting, and whether exhausted attempts are retained. |
| Self-critique | A critic may share the generator’s blind spots, lack independent execution evidence, or rewrite an already-correct patch. | Results depend on critic model, prompt, rubric, validator feedback, extra context, and any additional reasoning budget. A label of “self-critique” is not a comparable intervention. |

No GPT-5.6 Terra result was retrieved. A result from another model, benchmark, scaffold, tool set, validator, context policy, retry policy, or deployment snapshot cannot establish Terra performance without a direct validation run.

## R3 — failure-to-intervention matrix

**Disposition: qualified.**

The matrix below is a proposed safety and accounting policy. It does not establish that the listed interventions improve GPT-5.6 Terra outcomes.

| Observed trigger | Proposed intervention without changing model or reasoning effort | Validation | Stop condition | Status |
|---|---|---|---|---|
| Deterministic tool error, such as invalid arguments, missing path, or permission denial | Inspect the exact error and tool contract. Make one corrected call or use one authorized alternative. | The corrected call succeeds and its expected artifact or output is observed. | Stop after one unchanged repeated error, or when authorization is required. Record an unrecovered tool failure. | Proposed operating rule |
| Command or validator exits nonzero with actionable output | Read the smallest relevant failure output and source range. Make one localized corrective action, then rerun the same target validator. | The target validator passes. | Stop after two attempts without new diagnostic information, or when the failure is environmental or dependency-owned. | Proposed operating rule |
| Repeated equivalent action or no-op sequence | Halt the repeated sequence. Reconstruct state and choose a materially different inspection or validation action. | The new action produces new state, diagnostic information, or a verified completion condition. | Stop on the first detected repeat unless changed input, state, or hypothesis justifies continuation. | Proposed operating rule |
| Conflicting observations, unknown prior edits, or uncertain repository state | Re-read authoritative state, diff, logs, and validator output before editing. | A single next action and expected validator are identified. | Stop and mark blocked when state cannot be reconstructed from available artifacts. | Proposed operating rule |
| Validator fails after an apparently successful edit | Treat the task as unaccepted. Diagnose from validator output. Revert only the agent’s known attempted change when safe. | The required acceptance validator passes on the recorded repository state. | Stop when the declared retry budget is exhausted. Do not count a self-report, patch, or tool success as acceptance. | Proposed operating rule |
| Timeout, hang, or stalled external dependency | Preserve elapsed time and partial logs. Run one bounded health or progress check instead of repeating the same long action. | The check identifies progress, completion, or an external blocker. | Stop when the fixed wall-time budget is consumed or the dependency is unavailable. | Proposed operating rule |
| Recovery action succeeds but acceptance validator is unavailable | Record recovery separately from accepted-task outcome. | The independent validator becomes available and passes. | Stop as **unvalidated recovery**, not accepted. | Proposed operating rule |
| Proposed policy change relies on assumed gains from context, agents, retries, or critique | Do not deploy the mechanism-specific change. | Require an inspected comparable source or a target fixed-model paired evaluation. | Stop at missing task, model, scaffold, budget, validator, denominator, result, or latency/failure accounting. | Evidence-gating rule |
| Claimed result is from another model or benchmark | Treat it as non-transferable pending a direct target evaluation. | Verify unchanged model, reasoning effort, scaffold, target tasks, validator, and accounting in a paired run. | Stop the transfer claim if material fields differ without direct validation. | Evidence-gating rule |
| Research workflow lacks an authorized retrieval provider | Repair the research environment rather than changing the coding-agent policy. | Confirm a depth-one worker can call configured search and unauthenticated content retrieval. | Stop research synthesis until original sources can be inspected. | Observed execution blocker |

## R4 — exact fixed-model paired evaluation checklist

**Disposition: qualified.**

This is an executable evaluation design, not a measured recommendation. It requires pre-registration of its unresolved thresholds and uncertainty method before execution.

### A1. Freeze the evaluation surface

For every task and run, hold constant unless the item is the single declared treatment:

- [ ] Exact GPT-5.6 Terra deployment or immutable model snapshot identifier.
- [ ] Medium reasoning effort and any configured hidden reasoning or token limits.
- [ ] Precommitted task denominator, repository revision, issue text, fixtures, environment image, and reset method.
- [ ] System prompt, scaffold, tools, tool versions, permissions, shell and network access.
- [ ] Context policy, except when context policy is the explicitly tested intervention.
- [ ] Tool-call cap, action cap, retry cap, output cap, concurrency limit, and total wall-time cap.
- [ ] Sampling settings, including temperature and seed where controllable.
- [ ] Pinned acceptance validator command, version, timeout, and acceptance rubric.
- [ ] Human-review rubric, reviewer blinding, disagreement handling, and adjudication rule when deterministic validation is insufficient.
- [ ] Infrastructure-failure definition and treatment.

### A2. Define matched pairs

- [ ] Use identical starting repository and environment states for each pair.
- [ ] Run one **control** arm using the current production policy.
- [ ] Run one **treatment** arm changing exactly one mechanism: context policy, tool interface, task contract, parallelism, retry or recovery policy, or critique step.
- [ ] Randomize control and treatment order within each task-repetition pair.
- [ ] Reset repository and environment before each run.
- [ ] Do not let one arm reuse the other arm’s diagnosis, tool output, patch, test output, or retained memory unless that reuse is the declared intervention and is equivalently available to control.
- [ ] Pre-register repetitions, task denominator, exclusions, and the paired uncertainty procedure.

### A3. Define accepted-task quality

- [ ] Define acceptance as the pinned independent validator passing on the final repository state.
- [ ] Record validator command and version, pass or fail outcome, timeout status, output reference, and final diff hash.
- [ ] Treat tool success, patch existence, agent self-report, and recovery without validation as non-acceptance.
- [ ] If manual review is necessary, blind reviewers to arm and pair identity, apply a written rubric, and record disagreement and adjudication.
- [ ] Use accepted-task indicator as the primary outcome for each attempted run.
- [ ] Report accepted-task quality on the complete assigned-task denominator, not only completed, patched, or validator-reached runs.

### A4. Record wall time, attempts, and retries

For every attempted run:

- [ ] Record monotonic start and terminal timestamps.
- [ ] Record total elapsed wall time through recovery, validation, timeout, or terminal stop.
- [ ] Record queue, setup, model, tool, and validator components where measurable.
- [ ] Record model calls, tool calls, action count, retry count, repeated-action count, intervention count, context supplied, and agent count.
- [ ] Preserve partial logs and elapsed time for timeouts and external dependency failures.
- [ ] Report paired wall-time differences for all attempted runs and separately for accepted tasks.
- [ ] Report paired distributions, not only averages. Predeclare the chosen summaries, such as median and upper-tail measures.

### A5. Account for terminal and infrastructure failures

Every attempted run remains in the denominator. Record one terminal classification and any contributing events:

- [ ] Accepted.
- [ ] Validator failed.
- [ ] Validator unavailable.
- [ ] Tool failed.
- [ ] Environment blocked.
- [ ] Infrastructure failure.
- [ ] Timeout.
- [ ] Budget stop.
- [ ] Unrecoverable state.
- [ ] Coordinator or merge failure.
- [ ] Cancelled run.
- [ ] Unvalidated recovery.
- [ ] Valid patch rejected by acceptance criteria.

For every failure event, record:

- [ ] task and pair identifier;
- [ ] arm and exact configuration;
- [ ] first-occurrence timestamp;
- [ ] observed trigger;
- [ ] intervention attempted;
- [ ] validation result;
- [ ] recovery result;
- [ ] terminal classification;
- [ ] stop reason.

Do not exclude one-sided timeouts, crashes, invalid patches, validator failures, merge conflicts, or infrastructure failures. A pair may be excluded only under a predeclared infrastructure rule showing that the same event materially affected both arms. Report exclusions separately.

### A6. Predeclare the decision rule

Predeclare before execution:

- [ ] The practically meaningful accepted-task-quality margin.
- [ ] The paired uncertainty interval or statistical criterion.
- [ ] The operational wall-time limit.
- [ ] The material-worsening rule for each failure category.
- [ ] The infrastructure-failure rule.
- [ ] The required complete-denominator consistency check.

Adopt a treatment only when all conditions hold on the frozen paired denominator:

1. Accepted-task quality meets the predeclared improvement or non-inferiority rule against control.
2. The predeclared paired uncertainty criterion supports that result.
3. Paired wall-time change remains within the predeclared operational limit.
4. No predeclared failure category materially worsens, especially timeout, validator failure, unrecovered tool failure, coordinator or merge failure, and infrastructure failure.
5. The complete-denominator result agrees with the reported headline result.
6. Complete attempt, retry, terminal, and infrastructure accounting is available for every retained pair.

Otherwise retain the control policy, or revise only the intervention associated with the failed criterion and rerun the same fixed-model paired protocol.

## Disagreements, alternatives, and limitations

The retained streams agree on the evidence gap. One stream described R4 as “supported as an executable protocol,” while another described it as qualified because the thresholds and uncertainty method were not fixed. The reconciled disposition is **qualified**: the protocol structure is usable, but it is not empirically calibrated and cannot change an operating recommendation until thresholds and analysis are predeclared.

The meaningful limitation is not merely incomplete bibliography. The run lacks the source material necessary to assess:

- intervention effects;
- null or regression outcomes;
- task and model comparability;
- retries, exclusions, and failure-denominator handling;
- accepted-task validation;
- latency, wall time, or cost effects;
- transfer to the specified GPT-5.6 Terra deployment.

No statement here should be read as a measured effect for Terra or as a general result about coding agents.

## Requirement coverage and next checks

| ID | Disposition | Coverage | Smallest decision-changing next check | Stop condition |
|---|---|---|---|---|
| R1 | **Blocked** | No inspected primary sources, methods, results, or Terra-transfer evidence distinguish intervention categories. | Restore authorized configured retrieval, inspect primary controlled coding-agent ablations, and retain methods, comparators, denominators, validators, budgets, results, uncertainty, and latency or failure accounting. | Stop after decision-relevant primary evidence and counterevidence for each category, or explicitly mark each unavailable. |
| R2 | **Blocked** | No inspected null or regression evidence establishes failure conditions or Terra-specific transfer limits. | Inspect primary ablations and error analyses, then compare model, task, scaffold, tool, budget, validator, denominator, and deployment differences to Terra. Run the paired Terra evaluation if transfer remains material. | Stop at the predeclared paired denominator, a prespecified safety or operational limit, or explicit retrieval unavailability. |
| R3 | **Qualified** | A complete proposed trigger, intervention, validation, and stop matrix exists. Efficacy is unverified. | Use primary evidence or the paired evaluation to determine which observed failure signatures justify each intervention. | Stop any mechanism-specific deployment claim until a validator-grounded result is available. |
| R4 | **Qualified** | The protocol covers pairing, acceptance validation, wall time, attempts, retries, terminal failures, infrastructure failures, and a conditional decision rule. | Pre-register quality margin, wall-time limit, uncertainty procedure, material-worsening rule, denominator, exclusions, and infrastructure-failure treatment. | Stop before execution until all decision thresholds and accounting rules are frozen. |

## Coverage and stop reason

All saved streams and run-control artifacts were reviewed. The workflow persisted the child-returned Markdown because child write calls used an incompatible field, but the persisted stream content was available for review.

Work stopped because the authorized configured retrieval path was unavailable and the delegated research path encountered the Fabric agent-depth limit. The repair assignment did not change R1 or R2 because it also inspected no primary source.

The highest-impact next action is to restore authorized source retrieval and inspect original controlled coding-agent evidence before making any empirical policy claim. If the decision concerns the current production deployment rather than general literature, the paired fixed-model evaluation above is the direct resolving test.

## Source appendix

No original empirical source, public primary study, or original benchmark artifact was inspected in this run. Therefore this appendix has no retained-source rows.

The local materials reviewed were procedural workflow references, not retained empirical evidence. They specify evidence gates and benchmark-reporting fields, but do not support claims about coding-agent intervention effects.

## Report validation placeholder

Superseded by the final validation below.

## Final validation

- Report validation: **passed**
- Outcome: **partial**
- Verification: **partial**
- Stop reason: Authorized configured retrieval was unavailable, delegated research reached the Fabric agent-depth limit, and repair-1 retrieved no original evidence.
- Coverage: R1 blocked; R2 blocked; R3 qualified; R4 qualified
