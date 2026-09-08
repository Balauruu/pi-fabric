# Fixed-Model Run-Design Decision Guide

**As of:** 2026-09-07  
**Evidence status:** No external sources were retrieved or inspected. The legacy streams report that their authorized web transport was unavailable. Therefore, no source-bound performance, cost, reliability, leakage, or security claim is supported.

## Decision

Do not adopt any run-design change as generally superior. Use the paired protocol below to generate local evidence while holding the model and reasoning effort fixed.

## Evidence Matrix

| Choice | Task / agent / comparator | Method / outcome | Cost / efficiency |
|---|---|---|---|
| Context selection | Unknown | Unknown | Unknown |
| Tool feedback | Unknown | Unknown | Unknown |
| Validation and repair | Unknown | Unknown | Unknown |
| Retries | Unknown | Unknown | Unknown |
| Decomposition | Unknown | Unknown | Unknown |

No primary evaluations, original URLs, or quantitative contrasts were retained.

## Limits and Counterevidence

- Benchmark contamination, evaluator validity, run-to-run variance, harness dependence, and production transfer are all **unknown**.
- No measured claim may be made about reliability, cost, security, or a universal ranking of run designs.
- A gain limited to a non-independent evaluator is not adoption evidence.
- Comparisons are invalid if model revision, reasoning effort, prompts, tools, repository state, task state, or evaluator differ between arms.

## Operational Rules

| Decision | Required local evidence | Action |
|---|---|---|
| Adopt | Higher independent-test success, with fixed model and effort, and no predeclared cost or reliability breach | Feature-flag rollout, then repeat on fresh holdout tasks |
| Continue evaluation | Positive direction but uncertainty crosses the practical threshold | Add held-out tasks or repetitions |
| Reject | Lower success, guardrail breach, or evaluator-only gain | Revert the change |
| Invalid / unknown | Any uncontrolled comparison variable | Reset and rerun |

## Paired Evaluation Artifact

```yaml
experiment: run-design-pair
fixed:
  model: exact provider/model revision
  reasoning_effort: exact setting
  system_prompt: byte-identical
  tools_and_versions: byte-identical
  repository_commit: pinned
  task_environment: isolated and reset per run
  max_wall_time_minutes: 30
  max_model_tokens: 100000
  max_tool_calls: 200

paired_variable:
  baseline: current run design
  treatment: one named change only
  allowed_examples:
    - context-selection policy
    - tool-feedback formatting
    - validation-repair loop
    - retry policy
    - decomposition policy

tasks:
  source: held-out, deduplicated issue-to-patch tasks
  pairing: run both arms on every task
  order: randomized within task
  repeats_per_arm: 3

outcomes:
  primary: task-level independent test pass
  secondary:
    - patch applies
    - repository test pass
    - elapsed_seconds
    - input_output_tokens
    - tool_calls
    - estimated_cost
    - invalid_or_timeout_rate

decision:
  estimate: paired difference in task pass rate
  adopt_if:
    - treatment improves paired primary outcome
    - no predeclared cost or reliability guardrail is breached
    - improvement remains when excluding infrastructure failures
  reject_if:
    - primary outcome declines
    - gain is confined to non-independent evaluator checks
    - regression or confidence interval crosses the predeclared practical threshold

retain:
  - task IDs and commits
  - prompts and run-design configuration hashes
  - seeds and execution order
  - complete tool traces
  - patch diffs
  - raw evaluator outputs
  - exclusion reasons
```

## What Could Change the Decision

Adoption requires a predeclared practical improvement threshold, paired independent-test results on fresh holdouts, and evidence that cost, timeout, and invalid-run guardrails remain acceptable.

## Retained-Source Appendix

| Source | Type | Status | Original URL |
|---|---|---|---|
| `T2.md` | Assignment brief | Read | None, local file |
| `SKILL.md` | Copied legacy research methodology | Read | None, local file |
| `legacy-T2/streams/effects.md` | Evaluation stream note | Read | None. Reports no retrieved sources |
| `legacy-T2/streams/limits.md` | Limitations stream note | Read | None. Reports no retrieved sources |
| `legacy-T2/streams/operations.md` | Operations stream note | Read | None. Reports no retrieved sources |
| External primary sources | Required evidence | Unavailable | None retrieved or inspected |