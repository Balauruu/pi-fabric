# Operating policy research note

## Question, scope, status

**Assignment:** operating-policy  
**Research date:** 2026-09-07  
**Status:** **blocked for evidence-grounded recommendations; partial for an executable proposed evaluation.**

The required web-research runner could not launch because the Fabric agent-depth limit was reached. The only configured external provider subsequently discoverable was `lean-ctx`; no authorized `web_search` or `fetch_content` provider was available. Therefore no primary papers, benchmark protocols, or original artifacts were inspected. No claimed effect transfers to GPT-5.6 Terra.

## Findings and analysis

### Documented facts

- The supplied requirement contract requires R3 and R4 exactly as stated below.
- The assignment prohibits changing the model or reasoning effort.
- No primary-source methods or measured results were retrieved and inspected.

### Proposed operating policy

This is a **design proposal, not an evidence-backed finding**. Run interventions only after recording the observable failure, affected task, command/tool, elapsed wall time, retry count, and validator state.

| Observable failure trigger | Intervention, without changing model or reasoning effort | Validation | Stop condition |
|---|---|---|---|
| Tool call returns a deterministic error, such as invalid arguments, missing path, or permission denial | Inspect the exact error and tool contract. Make one corrected call or use the authorized alternative tool. | Corrected call succeeds and its expected artifact/output is observed. | Stop after one unchanged repeated error or when authorization is required. Record as unrecovered tool failure. |
| Command/test exits nonzero with actionable failure output | Read the smallest relevant failure output and source range. Apply one localized corrective action. Re-run the same target validator. | Target validator passes. | Stop after two attempts with no new diagnostic information, or if the failure is environmental or dependency-owned. |
| Repeated no-op or equivalent tool/action sequence | Halt the repeated sequence. Summarize current state and choose a materially different inspection or validation action. | New action yields new state, diagnostic information, or a verified completion condition. | Stop after the first detected repeat if no changed input, state, or hypothesis justifies it. |
| Context/state uncertainty, including conflicting observations or unknown prior edits | Re-read authoritative state, diff, relevant logs, and validator output before editing. | Reconstructed state identifies a single next action and expected validator. | Stop and mark blocked if state cannot be established from available artifacts. |
| Validation fails after an apparently successful edit | Treat the task as unaccepted. Revert only the agent’s known attempted change if safe, then diagnose from validator output. | Required acceptance validator passes under the recorded denominator. | Stop after the retry budget is exhausted. Do not count a self-report as acceptance. |
| Timeout, hang, or stalled external dependency | Preserve elapsed time and partial logs. Run a bounded health/progress check rather than repeating the same long action. | Health check identifies progress, completion, or an external blocker. | Stop when the fixed wall-time budget is consumed or the dependency is unavailable. |
| Recovery succeeds but validator remains unavailable | Record technical recovery separately from accepted-task outcome. | Independent validator becomes available and passes. | Stop as “unvalidated recovery,” not accepted. |

**Policy guardrails:** fixed per-task action, retry, context, and wall-time budgets must be declared before execution. Every stop is a terminal observation, not a silently excluded run.

## R4: exact fixed-model paired evaluation

### Unit and pairing

1. Freeze a task set, repository snapshots, task instructions, system prompt, GPT-5.6 Terra model snapshot, reasoning-effort setting, scaffold, tools, permissions, context window, action budget, retry budget, and wall-time limit.
2. For each task, create matched run pairs with identical starting state and randomized treatment order:
   - **Control:** current operating behavior.
   - **Treatment:** the proposed trigger/intervention/stop policy.
3. Use the same fixed model and reasoning effort for both members of every pair. Do not substitute a newer model snapshot mid-study.
4. Pre-register the task denominator and exclusion rules. Exclude a pair only for a pre-specified infrastructure failure that demonstrably affected both arms. Retain one-sided failures.

### Accepted-task quality

- Define acceptance as the task’s independent, pre-existing validator passing on the resulting repository state.
- Record the validator command/version, pass/fail result, timeout status, and whether manual review is required.
- If manual review is unavoidable, blind reviewers to arm and pair identity, use a written rubric, and record disagreements and adjudication.
- Primary quality outcome: paired difference in accepted-task indicator.
- Do not replace failed validation with agent assertions, tool success, or patch existence.

### Wall time and complete failure accounting

For every run, record:

- monotonic start and terminal timestamps
- elapsed wall time to terminal outcome, including tool waits, recovery, validation, and timeout time
- model/tool call count, action count, retry count, repeated-action count, and intervention count
- terminal classification: accepted, validator-failed, tool-failed, environment-blocked, timeout, budget-stop, unrecoverable-state, or unvalidated recovery
- every failure event: trigger, first occurrence timestamp, intervention, validation result, recovery result, and stop reason
- task and pair identifiers, seed where controllable, repository revision, model/system snapshot, scaffold/tool versions, and all fixed budgets

Report paired distributions, not only averages: accepted-task difference, paired wall-time difference among all runs and among accepted tasks, failure-category counts, recovery rate conditional on each trigger, and uncertainty intervals appropriate to the paired design.

### Decision-changing rule

Adopt the policy only if, on the frozen paired denominator:

1. accepted-task quality is non-inferior to control by a pre-specified margin,
2. the uncertainty interval for paired wall-time change meets a pre-specified operational threshold,
3. no prespecified failure category materially worsens, including timeout, budget-stop, validator-failed, and unrecovered tool failure, and
4. complete failure accounting is available for every retained pair.

Otherwise retain the control policy or revise only the failed intervention, then rerun the same fixed-model paired protocol. This is a proposed decision rule, not a measured conclusion.

## Counterevidence and limitations

- No inspected evidence establishes that any intervention improves quality, time, retries, or recovery.
- Effects may vary by repository, task type, scaffold, validator, tool permissions, model snapshot, and budget configuration.
- Paired evaluations reduce task heterogeneity but do not eliminate order effects, stochasticity, caching, or shared infrastructure effects.
- GPT-5.6 Terra-specific effects are unknown. The protocol tests a fixed snapshot but does not justify transfer across model versions or reasoning settings.

## Sources and inspected support

**Local evidence only:**

- [`researcher.md`](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/researcher.md), complete local read. It requires primary-source inspection, separation of facts/results/inference/unknowns, and explicit coverage/gaps.
- [`stream-contracts.md`](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/references/stream-contracts.md), complete local read. It specifies benchmark fields including task provenance, model/tools, budgets, graders, denominators, repetitions, uncertainty, latency, and costs.

No public primary source was inspected. The policy table and protocol are therefore proposed operational design rather than sourced experimental findings.

## Coverage and gaps

### R3 — Which observed failure should trigger which intervention, with validation and stop conditions?

**Required inclusions:** failure-to-intervention matrix, observable trigger, validation and stopping criteria.  
**Expected contribution:** usable operating policy.  
**Decision context:** operational responses for tool-using coding agents.  
**Status:** **qualified.** A complete proposed matrix is provided, but no primary experimental support was retrieved.  
**Smallest next check:** inspect primary coding-agent benchmark artifacts reporting tool failures, retries, recovery, validators, and wall time.  
**Stop reason:** authorized web-retrieval provider unavailable.

### R4 — What exact fixed-model paired evaluation could change the recommendation, including accepted-task quality, wall time and failure accounting?

**Required inclusions:** paired fixed-model protocol, accepted-task quality and validator, wall time and complete failure accounting, decision-changing rule.  
**Expected contribution:** executable evaluation checklist.  
**Decision context:** test policy without changing model or reasoning effort.  
**Status:** **qualified.** The proposed protocol meets the requested design fields but is not calibrated by inspected primary results.  
**Smallest next check:** inspect original benchmark protocols for task denominator, repetitions, uncertainty method, timing boundaries, and failure taxonomy before finalizing thresholds.  
**Stop reason:** authorized web-retrieval provider unavailable.