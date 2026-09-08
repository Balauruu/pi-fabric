# Prompt-technique selection for production LLMs

**Research date:** 2026-09-07. **Streams:** 4 independent streams: controlled prompting, reasoning-time compute, tool/scaffold/context, and adversarial transfer limits.

## Executive decision

**Do not adopt or rank prompt techniques from this trial.** The only permitted retrieval provider was not callable, so no original source was inspected and no quantitative effect, cost, regression, or transfer claim can be supported. This is a blocked evidence decision, not evidence that any technique is ineffective.

## R1 — measured effects

No retained measurement. All requested fields (task, model, comparator, results, method, and compute/cost) are **unknown** because no source content was available for inspection.

## R2 — counterevidence and transfer limits

No substantive counterevidence was retrieved. The decisive operational limitation is stronger: absent inspected primary evidence, a result cannot be transferred across models, tasks, prompts, tools, scaffold, context/action/retry budgets, metrics, or graders. No universal ranking is warranted.

## R3 — operational decision table

| Production situation | Technique decision | Evidence status | Failure/escalation signal | Next action |
|---|---|---|---|---|
| Text generation | Unknown, do not select a technique | No original source inspected | Quality/cost claim relies on memory, marketing, or an uncited benchmark | Restore retrieval and run paired local evaluation |
| Reasoning task | Unknown, do not select a sampling/search/reflection route | No measured quality, latency, or token tradeoff retained | Different model, sample budget, metric, or grader is treated as comparable | Retrieve original studies, then test finalists locally |
| Tool-using workflow | Unknown, do not select prompt or scaffold changes | No separation of model, scaffold, and harness effects | Tool retries, verification, or action budget are omitted | Retrieve direct evidence and measure final-state success locally |

### Reusable paired local evaluation artifact

Use this **unvalidated template** after source retrieval identifies candidate techniques. It is a proposed measurement procedure, not a finding from this run.

    evaluation: prompt-technique-pair
    unit: representative production task
    controls:
      model_snapshot: fixed
      system_prompt_and_context: fixed_except_intervention
      tools_and_tool_versions: fixed
      action_retry_and_token_budget: fixed
      temperature_seed_and_sampling_count: recorded
      grader_and_acceptance_criteria: fixed
    variants:
      - baseline: current production prompt/scaffold
      - candidate: one named intervention
    records_per_case:
      - final_state_acceptance
      - deterministic_test_result
      - retries_loops_and_out_of_scope_actions
      - input_cached_reasoning_output_tokens
      - tool_cost_total_cost
      - end_to_end_latency
      - blinded_reviewer_defects_if_judgment_is_unavoidable
    decision_rule: promote only when acceptance improves within predeclared cost, latency, and safety thresholds; repeat close finalists.
    reversal_rule: revert when gains disappear on held-out cases or final-state validation, or accepted-task cost/latency exceeds threshold.

## Evidence reconciliation

All four streams independently reported the same concrete blocker: advertised retrieval actions resolved as unknown, and none used an alternate provider, browser, shell retrieval, or invented sources. This is a tooling/access failure, not corroborating technical evidence. No schema-validation or truncation issue was counted as a source failure.

## Original inspected-source appendix

**Retained original inspected sources: none.** The required complete appendix is empty because no source content was inspectable. Stream-specific attempted-provider evidence and full retained evidence ledgers are preserved in `streams/`.

## What would change this decision

1. A callable configured-provider search followed by direct original-source content retrieval.
2. Original studies/reports with comparable task, model, intervention, baseline, metric, and budget details.
3. The paired local evaluation above showing a predeclared accepted-task improvement under fixed controls.

## End state

Adopt nothing from this trial. Restore the configured retrieval provider, verify one search and one direct-source fetch, then rerun the same four-stream program.
