---
name: agent-benchmarking
description: Design, run or resume, inspect, and statistically analyze comparisons of agents, prompts, skills, models, tools, and workflows. Use for controlled benchmarks and paired-result decisions, not one-off demonstrations or ordinary code review.
---

# Agent benchmarking

Frame the comparison, then invoke one fixed runner. Execution completion is not evidence for adoption: a completed experiment may be inconclusive or descriptive-only.

## Design

Read [protocol design](references/protocol-design.md), [conditions and mechanisms](references/conditions-and-mechanisms.md), [grading](references/grading.md), and [statistical analysis](references/statistical-analysis.md) for the selected comparison. Establish the question, sample and inferential units, conditions, grading/failure rules, assignment law, estimand, thresholds, multiplicity, stopping rule, and budget before scored outputs. Make consequential unknowns explicit rather than choosing them from observed results.

Write the experiment using [the spec schema](schemas/spec.schema.json). The runner validates it and saves resolved values and task-facing inputs. A changed experiment requires a new output directory. Use [README](README.md) for setup and verified method/runtime limitations.

## Run or resume

Read [operations](references/execution-lifecycle.md). Execute the exact source of [the fixed guest](workflows/benchmark.ts) in a fresh, dedicated `fabric_exec` invocation, supplying:

```json
{"agentBudget":1,"payloads":{"request":"{\"specPath\":\"/absolute/spec.json\",\"outputDirectory\":\"/absolute/new-run\"}"}}
```

The guest makes at most one native call per invocation; never embed it after other agent calls. On `checkpoint`, repeat the identical operation in a fresh dedicated invocation. The runner owns pending work, call limits, deterministic graders, optional judges/adjudicators, checkpoints, and finalization. Do not author workflow source, calculate grading batches, repair records, or relaunch an assigned-without-result ID. On `blocked`, `unsupported`, or `failed`, report the concrete cause and follow the documented recovery action.

Ordinary text tasks require no protection manifest, software fingerprint, runtime-version gate, environment inventory, database, component, or extension build. Inspect [measurement guidance](references/telemetry.md) when interpreting native logs, unknowns, recursion, timing, or observational cost limits.

## Inspect and report

Use local read-only reporting for completed or interrupted runs:

```sh
cd /home/balauru/.pi-profiles/fabric/skills/agent-benchmarking
.venv/bin/python -B scripts/run.py report --run-dir /absolute/run --format markdown
```

Reporting performs no dispatch, repair, installation, or run-directory writes and needs no live model backend. Preserve every failure and retry. Old paid runs are data, not automatic migration/resume candidates; use the historical inspection guidance in [audit and reporting](references/audit-and-reporting.md).

## Interpret

Read the selected statistical owner before interpreting results. Keep task-paired effects, practical margins, uncertainty, statistical evidence, quality vetoes, and decisions distinct. Never survivor-filter failures or count repeated trajectories/grader labels as independent tasks. Show material regressions, sensitivity, missing evidence, unsupported methods, and failed fits. Non-rejection of superiority is not equivalence or non-inferiority.

Use the skill-local Python environment. Numerical/model backend setup and implementation checks belong in [README](README.md) and [validation](references/validation.md), not per-run certification.
