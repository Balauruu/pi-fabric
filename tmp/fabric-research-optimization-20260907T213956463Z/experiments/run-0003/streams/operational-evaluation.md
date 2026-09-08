# Operational evaluation of prompting and scaffolds

**Status:** partial. **As-of target:** 2026-09-07. The required nonbrowser retrieval tools were unavailable in this execution, so this note cannot claim fresh web-source inspection or complete source coverage. The operational design is actionable, while quantitative literature claims require source re-verification before adoption.

## Requirement contract

| ID | Exact question | Required inclusions | Expected contribution | Decision context |
|---|---|---|---|---|
| R3 | What practical selection rules, failure signals, and paired local evaluation follow for production text, reasoning and tool-using LLMs? | selection rules; failure signals; reusable paired local evaluation artifact; cost latency retry accounting | Actionable selection and evaluation. | Adopt only when local benefit exceeds tradeoffs. |

## Selection rules

| Workload | Default | Escalate when | Reject or roll back when |
|---|---|---|---|
| Constrained text generation | Minimal structured instruction plus schema validation | Errors are primarily missing task context or format ambiguity | Extra examples or reasoning increase tokens/latency without improving valid-task score |
| Closed reasoning | Direct answer baseline, then concise reasoning or sampled reasoning | Paired evaluation shows material correctness gain on representative hard cases | Gains vanish on fresh slices, evaluator detects answer leakage, or cost-adjusted gain is negative |
| Retrieval/tool use | Explicit tool contract, typed arguments, bounded state, tool-result grounding | Failures are due to planning, decomposition, or recovery rather than tool/API defects | More agent turns increase invalid calls, stale-state use, loop rate, or unrecovered failure rate |
| High-consequence tasks | Deterministic validation and selective human/escalation path | Model uncertainty or verifier disagreement identifies a recoverable subset | The scaffold merely produces longer rationales, not independently checkable evidence |

**Adoption rule:** compare a candidate with the current production baseline on the *same frozen cases*, model snapshot, tools, budgets, and retry policy. Adopt only if its lower confidence bound on decision-relevant quality clears the predeclared threshold and its incremental cost, latency, and operational-error rate remain inside budget.

Do not select a technique because it won a different benchmark, a different model generation, or an unpaired demonstration.

## Failure signals

| Signal | Likely cause | Required response |
|---|---|---|
| Quality gain is confined to a few examples | Prompt overfitting or split contamination | Stratify by task family and hold out a fresh slice |
| More reasoning tokens, no verified gain | Unnecessary scaffold or weak evaluator | Revert to the simpler prompt |
| Higher nominal success but lower end-to-end completion | Tool retries, validation failures, or hidden human repair | Measure workflow completion, not model-turn correctness |
| Tool-call count or retry rate rises | Planning loop, malformed arguments, or unclear tool contract | Cap turns, log failure class, improve contract or stop |
| Outputs become longer but not more correct | Rationale verbosity rather than useful inference | Score final correctness and independently verifiable intermediate artifacts separately |
| Benefit disappears after model/tool version change | Invalid transfer across snapshots | Re-run the paired suite for every version change |
| Judge and user/production outcomes diverge | Evaluator bias or proxy failure | Add blinded human labels or a task-specific deterministic verifier |
| Tail latency worsens materially | Sampling, retries, serial tools, or context growth | Report p50/p95/p99 end-to-end latency and enforce a budget gate |

## Paired local evaluation artifact

```yaml
experiment:
  id: prompt-or-scaffold-change-YYYYMMDD
  decision: adopt_only_if_local_net_benefit_positive
  frozen:
    model: provider/model@version-or-date
    system_prompt_hash: sha256:...
    tool_schema_hash: sha256:...
    retrieval_index_version: ...
    evaluator_version: ...
    temperature: 0
    max_output_tokens: 800
    max_tool_turns: 4
    retry_policy:
      attempts: 1
      retryable_errors: [transport_failure, rate_limit]
  arms:
    - id: baseline
      prompt_hash: sha256:...
      scaffold: direct
    - id: candidate
      prompt_hash: sha256:...
      scaffold: concise_cot_or_tool_loop
  cases:
    source: production-like, deidentified, frozen
    split:
      development: 0.20
      decision_holdout: 0.80
    strata: [easy, hard, long-context, adversarial, tool-required, safety-critical]
    pairing_key: case_id
  record_per_run:
    - case_id
    - arm
    - output
    - verifier_result
    - human_label_if_sampled
    - tool_calls
    - invalid_tool_calls
    - retries
    - input_tokens
    - output_tokens
    - tool_cost
    - elapsed_ms
    - completion_status
    - failure_class
  primary_metric: end_to_end_verified_success_rate
  secondary_metrics:
    - task_specific_quality
    - invalid_output_rate
    - tool_success_rate
    - retry_rate
    - p50_p95_p99_elapsed_ms
    - mean_and_p95_cost
  analysis:
    unit: paired_case
    report:
      - candidate_minus_baseline_delta
      - paired_confidence_interval
      - per_stratum_delta
      - regressions_by_case
    gates:
      min_quality_delta_lower_bound: 0
      max_p95_latency_increase_pct: 10
      max_cost_increase_pct: 15
      max_invalid_tool_call_increase: 0
      max_retry_rate_increase: 0
```

### Measurement rules

1. Run both arms for every case under the same pinned conditions. Randomize arm order when state, rate limits, or caching can affect results.
2. Count the full workflow cost: prompt and completion tokens, embeddings/retrieval, tool/API charges, retries, validator calls, and human repair.
3. Measure wall-clock latency from request receipt to verified completion. Report p50, p95, and p99, not only mean model latency.
4. Treat a retry as an outcome, not an implementation detail. Report first-pass success, eventual success, attempts per completed task, and exhausted-retry rate.
5. Separate model success from verified workflow success. A syntactically valid tool call is not a completed task.
6. Freeze development cases after technique choice. Use an untouched decision holdout for the adoption decision, then monitor a post-release shadow sample.

## Evidence interpretation

Published prompting evidence supports testing techniques such as chain-of-thought, self-consistency, decomposition, and interleaved reasoning/action under their reported benchmark conditions, but does not establish a universal production ordering. Frequently cited originals include:

- Wei et al., [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903)
- Wang et al., [*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171)
- Zhou et al., [*Least-to-Most Prompting Enables Complex Reasoning in Large Language Models*](https://arxiv.org/abs/2205.10625)
- Yao et al., [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629)
- Shinn et al., [*Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366)

These are not interchangeable experiments. Their results depend on task distribution, model size and snapshot, demonstrations, sampling budget, tool environment, evaluator, and whether additional model calls are counted. The missing fresh inspection means this note intentionally does not restate their numerical results as verified evidence.

## Coverage and gaps

| Requirement | Status | Smallest useful next check | Stop reason |
|---|---|---|---|
| R3: production selection rules, failure signals, paired local evaluation, and cost/latency/retry accounting | **qualified** | Run the supplied paired artifact on representative production-like cases, then inspect original studies for exact comparable conditions and results | Required web retrieval interfaces were not registered in this execution |
| R1: measured techniques with exact conditions and compute/cost | **blocked** | Retrieve and inspect the original papers and any model/provider evaluation reports | No fresh source retrieval available |
| R2: strongest counterevidence and transfer limits | **blocked** | Retrieve counterevidence on prompt sensitivity, reasoning faithfulness, benchmark contamination, and agent/tool reliability | No fresh source retrieval available |