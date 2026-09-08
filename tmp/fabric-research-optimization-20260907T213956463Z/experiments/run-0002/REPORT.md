# Prompt and scaffold selection: blocked evidence, runnable local decision

**Research date:** 2026-09-07  
**Decision:** Do not adopt or rank few-shot prompting, CoT, self-consistency, decomposition, planning, reflection, ReAct-style tool scaffolds, or expanded context from this run. Use the paired local evaluation below to decide a specific deployment tuple.

This is a decision-grade **blocked** result, not a literature verdict. All four saved research streams and the verification ledger were read. The verifier independently found that **no original source was retrieved or inspected** because the configured retrieval actions were unavailable. Therefore no source-backed quantitative effect, cost, latency, causal attribution, or production-transfer claim is retained. The original-condition quantitative evidence requested for R1 is consequently **unknown**, rather than zero.

Local evidence: [verification ledger](RESEARCH.md), [measured-techniques stream](streams/measured-techniques.md), [counterevidence stream](streams/counterevidence-transfer.md), [tool/scaffold stream](streams/tool-use-scaffolds.md), and [production-evaluation stream](streams/production-evaluation.md).

## R1. Measured effects under original conditions

**Answer: unknown.** The streams contain numerical and methodological *pointers* to original papers, but they were not independently inspected. The required fields for each retained result are therefore unknown: original task/dataset/version, model snapshot, exact prompt and comparator, decoding, context/action budget, retries, metric denominator, repetitions/uncertainty, and cost/latency accounting.

No number is reproduced as evidence. In particular, the notes’ claimed CoT, zero-shot-CoT, and self-consistency deltas cannot be treated as measured evidence because their original methods and results were not checked. This prevents a valid comparison between a direct completion, a multi-sample ensemble, and a tool/retry/context scaffold. It also prevents success-per-dollar or latency conclusions.

### What is separated, not concluded

| Candidate intervention | What must be separated | Status and decision |
|---|---|---|
| Few-shot examples | example semantics, label space, order, format, input-token/context cost | Unknown. Test against direct and format-controlled comparators. |
| CoT or zero-shot CoT | wording, exemplars, model scale, reasoning-token output, answer validation | Unknown. Test only where final correctness is independently checkable. |
| Self-consistency | prompt versus sample count, temperature, aggregation/tie rule, total attempts | Unknown. Treat as an inference-time ensemble, not a prompt-only change. |
| Decomposition or planning | plan quality, intermediate-state validation, extra calls/tokens, propagation failures | Unknown. Compare with an equal total-budget direct baseline. |
| ReAct, ART, Reflexion, tool use | demonstrations, tools, observations, retrieval, retries, retained memory, validators | Unknown. These are bundles, not isolated wording effects. |
| Program/tool execution | reasoning text versus deterministic computation/tool substitution | Unknown. Measure final state and invalid/stateful calls, not prose plausibility. |

## R2. Counterevidence and transfer limits

**Answer: unknown in strength and prevalence, with actionable test hypotheses.** The unverified streams identify failure classes that should be treated as test slices, not established production findings:

- Examples may be sensitive to format, ordering, label space, or target model version.
- A rationale may look plausible without being a valid correctness or causal audit trail.
- Relevant context may be sensitive to position and distractor load.
- A retry without new information may differ from a retry driven by a verifier, tool result, or retrieval.
- New, stateful, or large tool sets may fail differently from single-turn structured-output tests.
- Added context, tool observations, memory, retries, and sampling can change both quality and the total cost/latency denominator.

These are **transfer limits**, not empirical conclusions from this run. The available notes do not establish their magnitude on the target model, task distribution, tool schema, retriever, or service configuration. The strongest counterevidence to any broad choice is the missing causal isolation itself: a reported gain from a bundle cannot identify the contribution of its prompt wording, scaffold, tool access, feedback, or retries.

## R3. Operational selection rules and paired local evaluation

### Selection rules

1. Freeze the **deployment tuple** before comparing: provider and model revision, service tier/region, system prompt, decoding/seed policy, output cap, retrieval corpus and ordering, tool schemas, context policy, retry/sample policy, and evaluator/validator version.
2. Start with a direct-instruction baseline. Change one named intervention or a predeclared bundle at a time.
3. Use final-state correctness and deterministic constraint/tool validation where possible. Do not promote a candidate because its explanation looks better.
4. Charge every attempt: input, cached, reasoning, and output tokens; tool/verification costs; retries; parallel branches; and elapsed latency. Report **cost per accepted task**, with all unpriced components marked unknown.
5. Select only on representative held-out production slices and a predeclared stress slice. A benchmark average or a successful demo is not a promotion result.
6. Re-run after any change to the deployment tuple. Do not transfer a winning prompt across model revisions or tool/retrieval schemas without retesting.

### Operational decision table

| Situation | Candidate comparison | Promotion rule | Failure signal and action |
|---|---|---|---|
| Structured text with deterministic constraints | direct vs examples | Candidate improves accepted-task rate within the predeclared total-cost and latency limits | Invalid schema/constraint output rises: reject or add deterministic validation, then retest. |
| Multi-step task with objective answer | direct vs CoT vs decomposition/planning | Candidate improves final correctness under matched total token, call, and time budgets | More intermediate errors, longer tails, or no gain after budget matching: retain direct. |
| Ambiguous reasoning where explanations are persuasive but unvalidated | direct vs candidate with blinded final-state review | Candidate wins on blinded final outcome, not rationale quality | Rationale and validated outcome diverge: do not use rationale as a gate. |
| Tool task with executable subproblem | direct/tool-first vs candidate scaffold | Candidate improves terminal state and valid calls under fixed tool and retry policies | Invalid arguments, wrong state mutation, unrecovered tool failure, or call growth: reject or constrain the tool interface. |
| Retry/reflection proposal | no retry vs retry with a specified new signal | Candidate improves accepted tasks after charging all attempts | Retry repeats without new signal or degrades final outcome: disable that retry path. |
| More retrieval/context or tools | compact/retrieved subset vs expanded context/tool list | Candidate improves the held-out and position/distractor stress slices | Middle-position, distractor, or tool-selection regression: retain compact context/subset. |

### Reusable paired local evaluation artifact

Copy this as `prompt-scaffold-paired-eval.yaml`, fill the `REQUIRED` fields, and run it manually or in the local harness. Its thresholds are intentionally not universal. The decision owner must supply them before promotion.

```yaml
version: 1
status: proposed-local-artifact
question: "Does candidate C beat direct baseline B for this frozen deployment tuple?"
deployment_tuple:
  provider_model_revision: REQUIRED
  service_tier_region: REQUIRED
  system_prompt_digest: REQUIRED
  decoding_and_seed_policy: REQUIRED
  max_input_output_tokens: REQUIRED
  retriever_corpus_digest_ordering: REQUIRED_OR_NOT_APPLICABLE
  tool_schema_digest: REQUIRED_OR_NOT_APPLICABLE
  retry_sample_and_timeout_policy: REQUIRED
  validator_version: REQUIRED
arms:
  B: {name: direct, prompt_or_scaffold_digest: REQUIRED}
  C: {name: candidate, prompt_or_scaffold_digest: REQUIRED}
held_fixed:
  - deployment_tuple
  - task inputs and acceptance definitions
  - tool availability and permissions
  - total budget cap per task
  - evaluator and scoring code
cases:
  screening_set: REQUIRED_REPRESENTATIVE_CASE_IDS
  held_out_set: REQUIRED_CASE_IDS
  stress_slices:
    - format_or_paraphrase: REQUIRED_OR_NOT_APPLICABLE
    - context_position_and_distractor: REQUIRED_OR_NOT_APPLICABLE
    - invalid_and_stateful_tool_calls: REQUIRED_OR_NOT_APPLICABLE
    - retry_without_vs_with_new_signal: REQUIRED_OR_NOT_APPLICABLE
execution:
  assignment: randomized_paired_order
  blinding: blind_human_review_when_judgment_is_required
  repetitions: "REQUIRED for stochastic or close results; record seed and every attempt"
  retries: "Only the frozen policy. Record signal that justified each retry."
record_per_attempt:
  - case_id
  - arm
  - accepted_final_state
  - validator_failures
  - tool_calls_invalid_calls_state_changes
  - attempts_and_retry_signal
  - input_cached_reasoning_output_tokens
  - tool_and_verification_cost
  - total_priced_cost_and_unknown_components
  - p50_p95_or_raw_latency
  - prompt_context_and_tool_observation_tokens
analysis:
  primary: "accepted tasks / all assigned tasks, by arm and slice"
  secondary: [invalid_call_rate, retries_per_accepted_task, total_cost_per_accepted_task, p50_latency, p95_latency]
  exclusions: "None silently. Mark timeout, refusal, validator failure, and out-of-scope work explicitly."
pre_registered_decision:
  promote_if: "C meets the owner-specified improvement threshold on held_out_set, stays within owner-specified cost and p95 limits, and has no owner-defined unacceptable stress-slice regression."
  retain_baseline_if: "Any criterion is not met, denominator is incomplete, or a required field is unknown."
  reverse_if: "Post-promotion monitoring crosses the same failure limits or deployment_tuple changes."
```

This artifact resolves the actual gap: it isolates the selected intervention while holding the deployment tuple and budget constant, includes paired/randomized order, validates final state, and records retries/tool/context/cost denominators. It does **not** establish a threshold, sample size, or winner. Those remain unknown until the decision owner supplies risk, cost, and latency limits and runs the evaluation.

## Coverage and stop reason

**Coverage:** all four persisted streams, workflow state, and the full verification ledger were read. Their candidate coverage spans examples, reasoning prompts, sampling, decomposition/planning, tool use, reflection/retries, context, and tool scale. This breadth is not evidence saturation.

**Stop reason:** configured source retrieval failed before any original paper, result table, or method passage could be inspected. The verifier records failed original-source retrieval and blocks R1, R2, and R3 empirical support in [RESEARCH.md](RESEARCH.md). Work stopped at an access boundary, not because the literature or counterevidence was exhausted.

**Highest-impact next check:** restore a callable original-source fetch/search path and inspect one primary result/method passage for each decision class: examples, CoT/sampling, rationale validity, context position, and tool scaffolds. Then execute the paired local evaluation on the actual deployment tuple. Until then, retain the direct baseline and treat all candidates as untested.

## Appendix A. Retained inspected original-source map

**None.** No original URL was inspected in this run, so there are no retained original sources to map to claims, methods, or limitations. It would be misleading to present the streams’ URLs as checked support.

| Retained inspected original URL | Claim(s) retained | Method/conditions checked | Limitations checked |
|---|---|---|---|
| None | None | None | Original-source inspection unavailable |

## Appendix B. Unretained source pointers

The following links appear in local research notes but are **not retained evidence** and support no material claim in this report. They are included solely to preserve the distinction between an original-source pointer and an inspected original source: [Brown et al.](https://arxiv.org/abs/2005.14165), [Min et al.](https://arxiv.org/abs/2202.12837), [Wei et al.](https://arxiv.org/abs/2201.11903), [Kojima et al.](https://arxiv.org/abs/2205.11916), [Wang et al.](https://arxiv.org/abs/2203.11171), [Zhou et al.](https://arxiv.org/abs/2205.10625), [Yao et al.](https://arxiv.org/abs/2210.03629), [Turpin et al.](https://arxiv.org/abs/2305.04388), [Liu et al.](https://arxiv.org/abs/2307.03172), [Schick et al.](https://arxiv.org/abs/2302.04761), [Lu et al.](https://arxiv.org/abs/2408.04682), [Lei et al.](https://arxiv.org/abs/2508.16260), [Paranjape et al.](https://arxiv.org/abs/2303.09014), [Chen et al.](https://arxiv.org/abs/2211.12588), [Shinn et al.](https://arxiv.org/abs/2303.11366), and [Huang et al.](https://arxiv.org/abs/2310.01798).
