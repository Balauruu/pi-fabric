## R3: Selection rules and local paired evaluation

### Evidence-grounded rules

| Situation | Start with | Escalate when | Do not infer |
|---|---|---|---|
| Bounded text transformation or extraction | Direct instruction plus explicit output schema | Paired quality or validity score is inadequate | That verbose reasoning improves prose quality |
| Discrete, independently checkable reasoning | CoT baseline, then self-consistency | A small sample count improves the paired score enough to justify its token and latency cost | That CoT is a faithful explanation |
| Stateful tool task with observations that can change the plan | Interleaved `thought → action → observation` and explicit state/goal checks | The action-only paired control loses track of state or misses subgoals | That a benchmark gain transfers to live tools |
| High-stakes, adversarial, or biased inputs | Verifiable final answer and external checks, not rationale inspection | Counterfactual prompt variants cause material answer changes | That a plausible rationale establishes correctness |

**Why these rules follow from inspected evidence**

- **Use self-consistency only for answer spaces with a stable aggregation rule.** Wang et al. sampled **40 outputs independently**, averaged over **10 runs**, and compared majority aggregation to greedy CoT. On GSM8K with PaLM-540B, accuracy was **74.4% vs 56.5%** (+17.9 points). The paper explicitly identifies greater computation cost and proposes starting with **5 or 10 paths** because gains often saturate. This is evidence for a bounded local sample sweep, not a fixed production count.  
  Source: [Wang et al., 2023](https://arxiv.org/abs/2203.11171)

- **Use ReAct-like interleaving only when observations are decision-relevant.** In ReAct’s controlled ALFWorld setup, the same annotated trajectories were used for Act and ReAct, removing thoughts only for the Act control. Across six prompt permutations and 134 unseen games, best-of-six ReAct reached **71%** success versus **45%** for Act. On the 500-instruction WebShop test, ReAct was **40.0%** success versus **30.1%** Act.  
  Source: [Yao et al., ReAct](https://arxiv.org/html/2210.03629v3)

- **Never use CoT as a correctness or safety monitor without a faithfulness test.** Turpin et al. found that zero-shot CoT with GPT-3.5 under a “Suggested Answer” bias dropped from **59.6%** in the unbiased condition to **23.3%** in the biased condition, a **−36.3-point** difference, while explanations did not disclose the bias. The study used paired differences on identical data and reported CIs of ±1.6–2.4 points.  
  Source: [Turpin et al., 2023](https://arxiv.org/html/2305.04388v2)

### Failure signals

1. **No paired gain:** the candidate’s bootstrap CI for `candidate − baseline` includes zero on the primary metric. Keep the simpler baseline.
2. **Cost-dominated gain:** any gain fails the predeclared minimum improvement per added token, tool call, or latency budget.
3. **Instability:** outputs or tool trajectories vary materially across repeated runs, prompt-order permutations, or equivalent phrasing.
4. **Rationale mismatch:** a hidden, irrelevant, or biasing input change changes answers while the rationale omits it. Treat reasoning text as untrusted telemetry.
5. **Tool-state loss:** repeated invalid actions, repeated calls with unchanged arguments, goal-constraint omissions, or action after an explicit terminal observation.
6. **Unsafe transfer:** offline tool success is not enough if local fixtures do not represent authentication, malformed results, rate limits, stale state, or destructive actions.

### Concrete reusable paired local evaluation artifact

```yaml
artifact: prompt-technique-paired-eval/v1
model:
  provider: "<provider>"
  model_id: "<pinned-version>"
  decoding:
    temperature: 0
    max_output_tokens: 800

treatments:
  - id: direct
    prompt_template: |
      {{task}}
      Return only the requested answer in this schema: {{schema}}
  - id: cot
    prompt_template: |
      {{task}}
      Work through the problem, then return only the requested answer in this schema: {{schema}}
  - id: self_consistency_5
    base_treatment: cot
    samples: 5
    aggregate: "majority(final_answer)" # require normalized discrete answer
  - id: react
    prompt_template: |
      Goal: {{goal}}
      State: {{initial_state}}
      At each turn choose exactly one:
      THOUGHT: brief plan update
      ACTION: <tool>(JSON)
      FINAL: <answer>
    tools: "<local read-only fixture tools>"

corpus:
  frozen_jsonl: "eval-cases.jsonl"
  required_fields:
    - id
    - family             # text | reasoning | tool
    - input
    - expected
    - schema
    - risk_tier
  strata:
    text: "representative production transformations, including malformed inputs"
    reasoning: "gold-answer cases with independently executable/scorable answers"
    tool: "deterministic local fixtures with success, stale-state, malformed-result, and denied-action cases"

design:
  pairing: "Every case runs under every applicable treatment."
  order: "randomize treatment order independently per case."
  repeats: 3
  fixed_seed_per_case_repeat: true
  holdout: "Do not tune templates or thresholds on the final holdout."
  tool_safety: "Fixtures only. Destructive operations are simulated and logged."

metrics:
  text:
    - schema_valid_rate
    - blind_pairwise_preference
    - factual_error_rate
    - p95_latency_ms
    - mean_input_output_tokens
  reasoning:
    - exact_or_programmatic_accuracy
    - invalid_answer_rate
    - p95_latency_ms
    - mean_total_tokens
  tool:
    - task_success_rate
    - invalid_action_rate
    - repeated_action_rate
    - constraint_violation_rate
    - mean_tool_calls
    - p95_latency_ms

decision:
  primary_metric_by_family:
    text: blind_pairwise_preference
    reasoning: exact_or_programmatic_accuracy
    tool: task_success_rate
  analysis:
    effect: "paired candidate-minus-direct difference"
    uncertainty: "stratified bootstrap 95% CI over case IDs"
    cost: "paired delta in tokens, latency, and tool calls"
  acceptance:
    - "lower 95% CI > 0 for the family primary metric"
    - "no risk-tier regression above the predeclared limit"
    - "added cost fits the production budget"
    - "tool treatment has no terminal or denied-action violation"
  report_rows:
    - case_id
    - family
    - treatment
    - repeat
    - score
    - validity
    - tokens
    - latency_ms
    - tool_calls
    - failure_code
    - output_hash
```

### Decisive passages and constraints

- ReAct’s control: “Act prompts are constructed using the same trajectories, but without thoughts,” with six prompt variants per task type. This supports a local **same-case, same-tool, thoughts-removed control**. [Source](https://arxiv.org/html/2210.03629v3)
- ReAct’s own limitation: WebShop prompting methods remained well below human success, **40.0% vs 59.6%**. Do not treat the technique as a sufficient autonomy control. [Source](https://arxiv.org/html/2210.03629v3)
- Turpin et al.: “CoT explanations can be plausible yet systematically unfaithful.” Evaluate outcome and counterfactual sensitivity separately from rationale quality. [Source](https://arxiv.org/html/2305.04388v2)
- Wei et al. found CoT gains were larger on harder arithmetic tasks but “negative or very small” on the easy single-operation MAWPS subset. Complexity is a selection condition, not a universal reason to add CoT. [Source](https://proceedings.neurips.cc/paper_files/paper/2022/file/9d5609613524ecf4f15af0f7b31abca4-Paper-Conference.pdf)

### Coverage and gaps

**Covered:** selection criteria for text, reasoning, and tool tasks; measured comparators; cost-aware escalation; counterfactual faithfulness checks; and a paired local artifact.

**Gaps:** these original studies use older, specified models and benchmark environments. Their exact effect sizes are not estimates for a current production model, proprietary tool interface, or open-ended text-quality objective. The artifact therefore requires pinned-model, representative local measurement before adoption.