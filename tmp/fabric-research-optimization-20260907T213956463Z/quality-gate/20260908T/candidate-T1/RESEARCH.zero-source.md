# Prompt-technique selection for production LLMs

## Answer and scope

**Decision:** No prompt technique can be selected, ranked, or operationally recommended from the supplied evidence. As of 2026-09-07, the assigned corpus contains no inspected original sources and therefore no retained measurements, original URLs, or source-bound values. This is a blocked, not negative, finding: it does not establish that any technique lacks an effect.

Scope: production text, reasoning, and tool-using LLM prompting and scaffold/context boundaries. It excludes aesthetic image and video prompting.

## R1 — Measured effects

**Unknown.** No eligible measurement is retained for any technique. Consequently, this report cannot state a task, model, intervention, comparator, metric, result, method, or compute/cost condition without inventing evidence. The supplied R1 evidence note records the absence of inspected original studies and measured effects ([local R1 note](streams/effects.md)).

## R2 — Counterevidence, regressions, and transfer limits

**Unknown.** No eligible original source establishes a regression, adverse result, or transfer boundary. Nor can the absence of such evidence be interpreted as absence of risk. No comparison across models, tasks, configurations, prompts, scaffolds, budgets, retries, or evaluators is supportable from this corpus ([local R2 note](streams/limits.md)).

## R3 — Operational selection and evaluation

### Actionable rules

1. **Do not adopt or rank a prompt technique on the supplied record.** A measured-effect claim requires an inspected original source that retains the task, model, intervention, baseline, metric, outcome, method, and applicable cost/compute conditions.
2. **Treat any claimed gain, regression, or transfer property as unverified until it is source-bound.** Do not transfer a result across model, task, scaffold, context/action budget, retry policy, evaluator, or cost accounting when those conditions are absent.
3. **Use a paired local evaluation only after the evidence gap is populated.** The supplied corpus provides no evidence-derived task set, metric, threshold, sample size, or cost trade-off from which to design or justify one.

### Failure signals

Stop a selection decision and mark it unsupported when any of the following is missing: an original inspected URL, the intervention and baseline, the task/model/configuration, a final acceptance metric and validator, observed outcome, or total-cost/retry accounting where cost is claimed. These are evidence-admissibility signals, not demonstrated failure modes of a prompt technique.

### Paired local evaluation artifact

**Status: blocked.** No reusable experiment specification is retained because no R1 or R2 source supports its representative tasks, fixed variables, acceptance validator, repetitions, or decision threshold. Running a generic comparison would not resolve the stated evidence gap. A future artifact must pair a baseline with one prompt intervention while holding task set, model snapshot, scaffold/tools, context and action budgets, retry policy, validator, and cost accounting fixed; it must record final-state acceptance, failures, retries, latency, token/tool/total cost, and the predeclared result that changes the choice. This is a minimum completeness condition, not an evidence-backed design recommendation ([local R3 note](streams/operations.md)).

## Limitations and coverage

All three required questions are blocked by the absence of inspected original-source evidence in the assigned streams. No quantitative comparison, causal conclusion, counterevidence synthesis, or cost conclusion is retained. The highest-impact next check is to obtain directly inspected original-study notes for a concrete technique-versus-baseline comparison, including decisive methods and results passages and the full applicability boundary.

## Source appendix

**Retained original sources: none.** No original URLs were inspected or retained in the assigned evidence. Accordingly, there are no source rows to list with type, date, method, supported claim, or limitation, and no inline original-source links can be provided without fabrication.
