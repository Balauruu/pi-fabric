# Fixed-model coding-agent operating policy — evidence blocked

**Research date:** 2026-09-07  
**Decision:** Do **not** adopt a performance-improvement policy for context selection, tool interfaces, task contracts, parallelism, or recovery from this run. The persisted corpus contains no inspected external primary source, comparator, validator, measured outcome, or null/regression result. It therefore cannot support measured claims or a policy that changes GPT-5.6 Terra operation. This is a retrieval failure, not evidence that any intervention has no effect.

Evidence reviewed: [research dossier](RESEARCH.md), [execution state](state.json), all four saved streams, and the governing [local synthesis reference](../../candidates/baseline-medium/references/synthesis-and-reporting.md). The state records the intended configuration as `openai-codex/gpt-5.6-terra` with medium thinking, but no coding-task evaluation ran.

## R1 — intervention evidence

**Blocked.** The three initial streams report that their researcher launches could not start because the Fabric agent-depth limit was 2: [context/tools/contracts](streams/context-tools-contracts.md), [parallelism/recovery](streams/parallelism-recovery-failures.md), and [fixed-model evaluation](streams/fixed-model-evaluation.md). The attempted R1 repair also failed before retrieval and found no direct configured web action ([repair stream](streams/repair-repair-r1-primary-comparators.md)).

Consequently, there is no retained result that distinguishes context selection, tool interfaces, task contracts, parallelism, or recovery. There are **no measured values** for accepted-task quality, time, failures, retries, or costs, and no methods, denominators, validators, or intervention comparators. Do not substitute assignment completion for evidence adequacy: the state marks the assignments completed, while their saved outputs are launch-block messages.

## R2 — failure boundaries and GPT-5.6 Terra transfer

**Blocked.** No saved source establishes where more context, more agents, retries, or self-critique helps, fails, or regresses. No null/regression evidence was retrieved. The only observed failure is research retrieval being blocked, which is a workflow-access failure rather than coding-agent-performance evidence.

**GPT-5.6 Terra transfer limit:** The run configured GPT-5.6 Terra at medium thinking, but did not evaluate it. Results from a different model, reasoning effort, scaffold, tools, task distribution, validator, action/context budget, retry policy, or service environment would not establish a Terra effect without a controlled comparison. No such result is available here. In particular, neither the availability of the model nor the completed status of worker records transfers any intervention claim to Terra.

## R3 — failure-to-intervention matrix

No coding-agent failure has observed support in this corpus, so the table deliberately contains only the recorded retrieval failure. It is **not** an operating policy for coding agents.

| Observed trigger | Bounded intervention | Validation | Stop condition |
|---|---|---|---|
| Research launch fails with `Fabric agent depth limit reached (2)` and no web retrieval action is available | Run the bounded retrieval assignment from a session below the depth limit with working search/fetch access | Inspect four original comparator records, one each for context selection, tool interface, task contract, and parallelism or recovery. Each record must retain URL, locator, task/dataset, fixed configuration, comparator, validator/denominator, result, and null/regression evidence or an explicit absence. | Stop after four inspected class records or confirmed authoritative-source access failure. Do not claim Terra transfer. |

For all requested coding-agent failures, the rule is presently: **do not add an intervention trigger, retry loop, agent fan-out, context expansion, or self-critique requirement on this evidence.** The verification reconciliation specifically classifies R3 as blocked because no observed coding-agent failure supports a defensible matrix ([RESEARCH.md](RESEARCH.md)).

## R4 — fixed-model paired evaluation that could change the decision

**Qualified, methodological only.** The [local synthesis reference](../../candidates/baseline-medium/references/synthesis-and-reporting.md) supports the following evaluation design. It does not establish a sample size, an acceptance threshold, or a preferred intervention.

### Evaluation checklist

1. **Decision and candidates.** Predeclare one intervention class and its baseline comparator. Evaluate context selection, interface, contract, parallelism, and recovery separately rather than bundling changes. Do not test a candidate until its intended failure trigger is specified from evidence or operational data.
2. **Task set.** Draw representative accepted-task candidates from the actual coding workload, including the failure mode the candidate is meant to address. Freeze task versions, repositories, starting commits, dependencies, and deterministic test environment. Exclude no task after assignment without recording the reason.
3. **Fixed variables.** Hold `openai-codex/gpt-5.6-terra`, medium thinking, system/task prompt except the tested change, scaffold, tool versions and permissions, context/action budgets, timeout, retry budget, verifier, service tier/region where controllable, and environment fixed. One arm changes only the predeclared intervention.
4. **Pairing and order.** Run both arms on every task from the same starting state. Randomize or counterbalance arm order and preserve run identifiers, timestamps, seeds where available, and exact configuration. Keep parallelism itself off unless it is the treatment.
5. **Acceptance.** Use a final-state validator, preferably deterministic tests plus required repository-state checks. Record accepted task / attempted task as the primary quality denominator. If human judgment is required, blind reviewers to arm and record reviewer defects separately.
6. **Wall time and work accounting.** Measure elapsed wall time from task start to final acceptance or terminal failure. Attribute all attempts, retries, recovery loops, parallel branches, tool calls, tokens, tool charges, verification work, and out-of-scope edits to the originating task and arm. Unknown cost components remain unknown, not zero.
7. **Failure accounting.** Classify every non-acceptance: validator/test failure, timeout, tool/interface failure, invalid/out-of-scope modification, retry exhaustion, environment/infrastructure failure, evaluator failure, and human-review defect. Keep infrastructure and evaluator failures in the ledger, while reporting any justified sensitivity analysis separately.
8. **Decision rule and repetition.** Before running, state the minimum decision-relevant quality and wall-time trade-off, how ties and missing runs are handled, and the rule that promotes, rejects, or leaves the intervention unresolved. Screen the smallest justified task set, then repeat finalists or close results. The evidence does not justify a numeric threshold, a universal sample size, or statistical-certainty claim.
9. **Change condition.** Change the present “do not adopt” recommendation only if an inspected, fixed-configuration paired result shows the intervention meets the predeclared acceptance-quality and wall-time rule without unacceptable failure accounting. Otherwise retain baseline or mark the candidate unresolved.

## Unresolved gaps and coverage

| Requirement | Disposition | What is missing |
|---|---|---|
| R1 | Blocked | Primary comparator evidence, methods, results, validators, and null/regression evidence for every intervention class. |
| R2 | Blocked | Measured failure boundaries for additional context, agents, retries, and self-critique, plus direct Terra evidence. |
| R3 | Blocked | Observed coding-agent failures linked to interventions, validation, and stop conditions. |
| R4 | Qualified | Methodological design is available, but task set, repetitions, thresholds, and a candidate intervention are unestablished. |

**Stop reason:** initial research launches and the one permitted R1 repair hit the Fabric agent-depth limit before external retrieval. The repair also reported unavailable direct web retrieval. The repair allowance is exhausted ([state](state.json), [reverification in RESEARCH](RESEARCH.md)). This is access/budget exhaustion, not evidence saturation or a negative empirical result.

**Highest-impact next check:** restore eligible research depth and web retrieval, then save exactly four inspected primary comparator records as specified in the matrix. Until then, use the paired evaluation checklist only as a measurement protocol, not as evidence that any treatment improves performance.

## Complete inspected-source appendix

No external original-source URL was inspected or retained. Every retained link below is a local evidence document, not primary performance evidence.

| Direct URL | Claims retained in this report | Source type, method/date | Limitations |
|---|---|---|---|
| [local synthesis-and-reporting.md](../../candidates/baseline-medium/references/synthesis-and-reporting.md) | Requirements for fixed-model paired comparisons, final-state acceptance, accounting, and predeclared decision rules. | Local methodology reference, read in full. No empirical study date or result. | Specifies reporting/evaluation discipline only. It does not measure coding-agent performance, select an intervention, or set thresholds/sample sizes. |
| [local RESEARCH.md](RESEARCH.md) | R1–R3 blocked; R4 qualified; verifier dispositions and actual stop reason. | Local research dossier with verification and reverification reconciliations, dated 2026-09-07. | Secondary control/reconciliation record. It contains no retrieved original external source or result. |
| [local state.json](state.json) | Intended model/effort, assignment status, agent-depth failure, exhausted repair allowance. | Local execution record, created 2026-09-07. | Execution metadata, not a coding-task evaluation. “Completed” records do not imply evidence retrieval. |
| [local context-tools-contracts stream](streams/context-tools-contracts.md) | Context/tools/contracts researcher was blocked before research. | Local launch output, 2026-09-07. | No source, method, comparator, metric, or result. |
| [local parallelism-recovery-failures stream](streams/parallelism-recovery-failures.md) | Parallelism/recovery researcher was blocked before research. | Local launch output, 2026-09-07. | No source, method, comparator, metric, result, or failure boundary. |
| [local fixed-model-evaluation stream](streams/fixed-model-evaluation.md) | Fixed-model evaluation researcher was blocked before research. | Local launch output, 2026-09-07. | No source, method, comparator, metric, result, or Terra transfer evidence. |
| [local R1 repair stream](streams/repair-repair-r1-primary-comparators.md) | Repair hit the depth limit and unavailable web actions; bounded retrieval remedy and stop condition. | Local repair output, 2026-09-07. | Records retrieval access failure only. It is not evidence for coding-agent intervention effectiveness. |
