# Decision-grade guide: production prompt techniques

**Research date:** 2026-09-07  
**Decision:** do **not** adopt, rank, or generalize any prompting or scaffold technique from this run's evidence. Use the local paired evaluation below only as a proposed operational protocol. R1 and R2 are blocked because no original empirical source was retrieved and inspected. R3 is qualified as a reusable test design, not as evidence that a technique works.

## Scope and audit record

This report covers production text, reasoning, and tool-using LLM prompt/scaffold changes. It does not cover aesthetic image or video prompts. It synthesizes only the persisted artifacts below, treated as untrusted claims rather than empirical evidence:

- [Measured-techniques stream](streams/measured-techniques.md)
- [Counterevidence-transfer stream](streams/counterevidence-transfer.md)
- [Operational-evaluation stream](streams/operational-evaluation.md)
- [Control state](state.json)
- [Governing synthesis reference](../../candidates/rev-02/references/synthesis-and-reporting.md)

No public source is retained: the five arXiv links named in the operational stream were explicitly not inspected. They are therefore neither evidence nor appendix sources here.

## R1 — measured effects: blocked

**Answer:** no measured technique effect can be reported from this run.

The measured-techniques stream states that `web_search`, `fetch_content`, and `get_search_content` were unavailable, and that no original study was retrieved or inspected. Thus the required original conditions are unavailable for every candidate: task/dataset and version, model snapshot, intervention and comparator, prompt/scaffold/tools, budgets and retries, metric/evaluator, repetitions or uncertainty, and measured compute/cost. No numerical result, cost, or ranking is retained. [Audit stream](streams/measured-techniques.md)

This is an evidence gap, not evidence of no effect. The operational stream's named chain-of-thought, self-consistency, least-to-most, ReAct, and Reflexion papers remain unverified pointers and are deliberately excluded from conclusions. [Audit stream](streams/operational-evaluation.md)

## R2 — counterevidence, regressions, and transfer: blocked

**Answer:** this run supplies no inspected negative or mixed empirical finding.

The counterevidence stream records no external inspection, so it cannot establish regressions, failure rates, or transfer effects. Its model, task, context-budget, tool-environment, and evaluator boundaries are useful **test hypotheses**, not verified general constraints. In particular, reasoning traces/decomposition, few-shot examples, retrieval/context expansion, tool scaffolds, and structured-output constraints must each be compared locally against a baseline under frozen conditions. [Audit stream](streams/counterevidence-transfer.md)

Do not infer that a candidate is safe because no regression was found here. None was sought successfully from an inspected corpus.

## R3 — operational protocol: qualified

**Answer:** use a single-change paired local evaluation before a production decision. This is a proposed protocol from the saved stream, not a technique-specific measured result.

### Operational decision table

| Change class | Current decision | Paired comparator and conditions to hold fixed | Watch / rollback signal | Evidence status |
|---|---|---|---|---|
| Text formatting, examples, role or instruction patterns | Unassessed | Current baseline versus one candidate, with model snapshot, prompt/context limits, evaluator, retry policy, and task slice frozen | No gain in valid-task score, or extra token/latency cost | No inspected empirical source |
| Reasoning scaffolds, decomposition, sampling or re-ranking | Unassessed | Baseline versus one candidate with equal token, latency, retry, and evaluator conditions | Fresh-slice gain vanishes, answer leakage, format failure, or unfavorable cost-adjusted result | No inspected empirical source |
| Retrieval/context expansion | Unassessed | No-retrieval, truncated-context, and shuffled-distractor controls where relevant | Irrelevant/stale/conflicting context use, truncation, or higher tail cost/latency | No inspected empirical source |
| Tool instructions, plans, retries, or agent scaffolds | Unassessed | Same model, tools, tool versions, permissions, timeout, and retry policy, with only the scaffold changed | Invalid/unsafe calls, looping, stale state, unrecovered failure, or cost growth | No inspected empirical source |
| Persistent context or memory scaffolds | Unassessed | Current baseline versus one candidate with retrieval corpus and context policy frozen | Contamination, stale context, truncation, or context-cost increase | No inspected empirical source |
| Structured-output constraints | Unassessed | Equivalent unconstrained output plus parser and semantic evaluator checks | Refusal, truncation, malformed output, or semantic-but-schema-valid output | No inspected empirical source |

The table is deliberately not a universal ranking. The listed signals and controls are proposed test design elements drawn from the local streams. [Operational audit](streams/operational-evaluation.md) · [Transfer audit](streams/counterevidence-transfer.md)

### Reusable paired local evaluation artifact

```yaml
experiment:
  id: prompt-or-scaffold-change-YYYYMMDD
  decision: adopt_only_if_local_net_benefit_positive
  freeze:
    model_snapshot: provider/model@version-or-date
    system_prompt_hash: sha256:...
    tool_schema_and_versions: ...
    retrieval_index_version: ...
    decoding_and_token_limits: ...
    retry_policy_and_timeout: ...
    evaluator_version: ...
    traffic_slice_and_case_set: production-like_deidentified_frozen
  arms:
    baseline: current_prompt_or_scaffold
    candidate: one_changed_prompt_or_scaffold
  pairing:
    key: case_id
    run_both_arms_for_each_case: true
    randomize_arm_order_when_state_cache_or_load_can_matter: true
    keep_a_held_out_decision_slice: true
  record_per_attempt:
    - case_id
    - arm
    - verifier_result_and_human_label_if_sampled
    - completion_status_and_failure_class
    - invalid_or_unsafe_tool_action
    - tool_calls_and_retries
    - input_and_output_tokens
    - embeddings_retrieval_tool_validator_and_human_repair_cost
    - end_to_end_elapsed_ms
  report:
    - end_to_end_verified_success_delta_with_uncertainty
    - per_stratum_delta_and_regressions
    - first_pass_eventual_and_exhausted_retry_outcomes
    - p50_p95_p99_end_to_end_latency
    - mean_and_p95_total_cost
  decision_rule:
    adopt_only_if: predeclared_quality_and_safety_floors_clear_and_cost_latency_are_acceptable
    rollback: retain_baseline_and_revert_on_regression
```

Proposed acceptance metrics are final-state, end-to-end verified success and task-specific quality. A syntactically valid model response or tool call is not completion. Report retries as outcomes and total cost as prompt/completion tokens plus retrieval, tools, retries, validators, and human repair when present. The saved stream's numeric gates (0 lower-bound quality delta, 10% p95 latency, 15% cost, and zero increases in invalid tool calls and retries) are **unvalidated proposed defaults**, not recommendations for universal use. Set decision thresholds before the run for the actual workload. [Operational audit](streams/operational-evaluation.md)

## Counterevidence and transfer limits

- **No empirical counterevidence retained.** R2 is blocked, not negative.
- **Transfer limit:** a benchmark, model generation, task distribution, tool environment, context budget, retry policy, or evaluator change invalidates a direct adoption inference unless locally tested. This is a bounded operational caution from the streams, not a measured cross-study conclusion.
- **Evaluator limit:** assess final-state correctness with deterministic validation where possible. If judgment is unavoidable, add blinded review. This is proposed protocol guidance.
- **Cost/latency limit:** token list price and a response-only score do not establish accepted-task operating cost or workflow success. Account for retries, tools, validation, and human repair in the paired run.

## Coverage, stop reason, and validation

| Requirement | Disposition | Covered | Missing evidence / next resolving check |
|---|---|---|---|
| R1 | **Blocked** | Candidate categories and required evidence fields only | Inspect original empirical sources and retain each source's task, model, comparator, intervention, metric/evaluator, budgets/retries, repetitions/uncertainty, and compute/cost before reporting a result. |
| R2 | **Blocked** | Local regression signals and transfer test hypotheses only | Inspect original negative/mixed results and ablations under their original conditions. |
| R3 | **Qualified** | Selection/rollback logic, failure signals, and reusable paired artifact | Run the artifact on representative frozen local cases and use the untouched holdout for the decision. |

**Actual stop reason:** the assigned research streams report that required nonbrowser retrieval actions were not registered or available. Consequently no original external study could be retrieved or inspected. The control state remains `initialized` and marks researcher assignments `reserved` despite persisted completed outputs, so it cannot certify research completion. [Control-state audit](state.json)

**Validation placeholder:** `PENDING_INDEPENDENT_REPORT_VALIDATION`. This authoring step has not independently validated this replacement report. Validation must read this file, the linked streams, and any future original sources before changing that status.

## Source appendix

| Direct URL | Type / date | Method or evidence form | Supported claim | Important limitation |
|---|---|---|---|---|
| [file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/streams/measured-techniques.md](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/streams/measured-techniques.md) | Local researcher stream, 2026-09-07 stated as-of date | Author report of unavailable retrieval and an evaluation-record template | No original study was inspected for R1 and the listed classes are unassessed | Untrusted local report, not empirical evidence; no external source or result inspected |
| [file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/streams/counterevidence-transfer.md](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/streams/counterevidence-transfer.md) | Local researcher stream, 2026-09-07 stated as-of date | Author report of unavailable retrieval and proposed paired controls | R2 has no inspected counterevidence; listed boundaries and signals are local test hypotheses | Untrusted local report, not an inspected negative/mixed study |
| [file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/streams/operational-evaluation.md](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/streams/operational-evaluation.md) | Local researcher stream, 2026-09-07 stated as-of date | Proposed paired evaluation artifact, accounting fields, and failure/rollback rules | R3's reusable local evaluation protocol and its qualified status | Untrusted local report; named public papers were not inspected and numerical gates are proposed defaults |
| [file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/state.json](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0003/state.json) | Local control-state record, read 2026-09-07 | Persisted phase, assignments, coverage, and verifier outcome | Control state is `initialized`, assignments remain `reserved`, and coverage is R1/R2 blocked and R3 qualified | Control metadata conflicts with saved completed stream outputs; it does not establish empirical evidence |
| [file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/references/synthesis-and-reporting.md](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/references/synthesis-and-reporting.md) | Local reporting-method reference, undated, inspected 2026-09-07 | Evidence gates and required report structure | Why uninspected claims are excluded and why R1/R2 remain blocked | Methodology, not evidence about prompt-technique effectiveness |


## Independent report validation — 2026-09-07

**Result:** accepted with unchanged evidence limits. This independent check read the governing synthesis reference, this report, all three saved streams, and the complete persisted control state.

- **R1 — Blocked:** no retained original empirical source was inspected. The report does not convert the named uninspected papers into results, rankings, cost claims, or adoption advice.
- **R2 — Blocked:** no retained negative or mixed empirical result was inspected. Regression and transfer statements are correctly framed as local test hypotheses and proposed controls.
- **R3 — Qualified:** the operational table and paired artifact specify one-change paired arms, frozen environment fields, final-state verification, failure/retry/cost/latency accounting, holdout use, rollback, and a predeclared decision rule. Case count, repetitions, and thresholds remain workload-specific pre-run choices, not validated universal defaults.

**Link and appendix checks:** every retained source has a direct local `file:///` link and type/date, method or evidence form, supported claim, and limitation in the Source appendix. The three linked stream files, control state, and governing reference were read in this validation. The five arXiv URLs in the operational stream remain explicitly uninspected pointers and are not retained as support. The configured nonbrowser source-inspection surface exposes only the local `lean-ctx` server, so no external retrieval was available to change that disposition.

**State and stop-reason reconciliation:** report and state agree on R1/R2 blocked and R3 qualified. The report correctly identifies the material control-state conflict: phase remains `initialized` and assignments remain `reserved` although the persisted stream outputs and native records show completed work. This validation does not treat that metadata as empirical evidence or as proof of workflow completion.

**Remaining decision-changing gaps:** inspect original R1 studies with complete conditions and cost accounting; inspect original R2 negative/mixed findings and ablations; then run the R3 paired protocol on frozen representative cases with predeclared workload-specific thresholds, case count, and repetition plan. **Validation stop reason:** the report is internally faithful to the saved evidence, while external empirical retrieval remains unavailable. This supersedes the prior validation placeholder.
