# R3: Fixed-model adoption protocol

## Result

No external evidence was retained. The explicitly granted research transport was unavailable: `extensions.web_search` returned `Unknown Fabric action`. I did not use ungranted browser, shell, delegation, files, candidate material, or alternative search tools. Therefore no source-bound quantitative claim, benchmark comparison, or production adoption recommendation is justified.

## Provisional paired evaluation artifact

Use this as a local protocol, not as an evidence-derived rule:

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

## Operational decision table

| Decision | Required evidence from the paired run | Rule |
|---|---|---|
| Adopt | Higher independent-test success with fixed model and effort | Roll out behind a feature flag, then repeat on fresh holdout tasks. |
| Keep evaluating | Directionally positive but uncertain result | Add tasks or repetitions. Do not claim improvement. |
| Reject | Lower success, guardrail breach, or evaluator-only gain | Revert the run-design change. |
| Unknown | Model, effort, prompts, tools, task state, or evaluator differed | Invalidate the comparison and rerun. |

## Coverage and gaps

- **Covered:** a concrete paired, fixed-model artifact that isolates one run-design variable and preserves audit evidence.
- **Not covered:** measured effects of context selection, tool feedback, repair loops, retries, or decomposition.
- **Not covered:** actual cost, success-rate, reliability, leakage, or evaluator-limit comparisons.
- **Counterevidence:** unavailable because no external sources could be searched or inspected.
- **Adoption limit:** do not adopt based on this note. The protocol only specifies how to obtain decision-grade local evidence.

## Retained-source appendix

| Source | Type | Status | Original URL / decisive passage |
|---|---|---|---|
| `T2.md` | Assignment brief | Read | Local file, no URL |
| `SKILL.md` | Copied legacy research method | Read | Local file, no URL |
| External web sources | Required research evidence | Unavailable | No source could be retrieved through the granted transport |