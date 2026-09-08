# T2-B: Test Feedback, Repair Loops, Retries, and Stopping Policy

## Bottom line

Use structured test feedback with a bounded repair loop, but treat it as a measured policy choice rather than a default. The strongest directly comparable result holds a 30-call budget fixed and finds test-feedback conversation helps Llama 3.1 70B but not GPT-4o-mini. Equal-sample counterevidence finds many repairs can underperform diverse independent attempts. Start with one repair after a useful failed validation, evaluate caps of 0–3 against an equal-budget restart baseline, and retain further retries only when paired, held-out data shows their incremental value exceeds latency and inference cost.

## R1. Primary evaluations

| Study | Task, agent/model | Fixed-model comparator and method | Outcome | Efficiency condition and caveat |
|---|---|---|---|---|
| **[S1] Conversational test-suite repair** | 92 manually runnable, single-function SWE-bench Lite tasks. Llama 3.1 70B Instruct, 4-bit local, and GPT-4o-mini. | **Conversational test feedback:** six conversations × five requests, maximum 30 calls. After a failure, provide failure information and repair. **Comparator:** 30 independent one-request generations with no test-failure feedback. | Llama: public-test-valid 62% versus 46%; public+hidden-test valid 47% versus 34%, a **+13 pp** source-bound contrast. GPT-4o-mini: 56% versus 54% public and 46% versus 47% public+hidden, therefore no feedback advantage. | Equal **call count**, not equal tokens, wall time, or dollars. Stops on public-suite success or attempt cap. Oracle faulty-function localization and selected runnable tasks make this a repair-stage result, not end-to-end issue resolution. (§2–3, Figs. 1–2.) |
| **[S2] FeedbackEval** | 572 erroneous instances across HumanEval, CoderEval, and 178 single-function SWE-bench Verified instances. GPT-4o, Claude 3.5, DeepSeek-R1, GLM-4, Qwen2.5. | Same model, erroneous-code set, prompts, hyperparameters, and feedback type. Re-evaluate and regenerate feedback after each repair, through Repair@3. | With **test feedback**, GPT-4o on the SWE subset rises 45.6% Repair@1 → 53.2% Repair@3 (**+7.6 pp**); Claude 3.5 59.4% → 68.6% (**+9.2 pp**); DeepSeek-R1 68.2% → 75.7% (**+7.5 pp**). | Fixed model but deliberately greater repair budget at later k. No token, runtime, or price data. Multi-iteration settings ran once, so this establishes an observed trend, not a stable deployment estimate. (Table 4, §6.1–6.2, §8.) |
| **[S3] Self-repair counterevaluation** | APPS self-contained Python tasks, GPT-4. | Same-model generation, feedback, and repair versus GPT-4 i.i.d. generation at the same **program-sample** count. | 10 initial programs plus one feedback-repair each, up to 20 samples, reached **1.05× pass@20**. Two initial programs plus ten repair steps each, up to 22 samples, reached only **0.97× pass@22**. | Equal sample count does **not** include feedback-token cost, which the paper says can overstate repair. It directly supports comparing retries with independent restarts, rather than assuming retries dominate. (§4.1, Fig. 3, Appendix A.) |
| **[S4] Repair-loop cap study** | Code generation, test generation, and translation with Gemma-4, Qwen 3.5, GPT-4o-mini; tools include INTERVENOR, LDB, CASCADE, OCI, and a basic call. | Measure completion at initial generation and after each repair through a cap of 10. | Largest relative improvement occurs at repair 1. By repair 3 marginal gains are single-digit or lower, and approach zero after steps 5–7. | No exact cost, runtime, or per-condition table values are extractable from the inspected rendering. Tool ports altered some original tool semantics, executions were not repeated for every setting, and results concern cost-efficient models. Use this as directional evidence for cap testing, not a numeric adoption threshold. (§3–5, Fig. 2, Table 2.) |

### Interpretation

1. **Test feedback can help, conditional on model and task.** [S1] provides the cleanest fixed-call contrast: Llama gains 13 pp on hidden-test validity, while GPT-4o-mini does not. The intervention is not a universal improvement.
2. **A small repair budget is plausible, not proven optimal.** [S2] shows gains through Repair@3, while [S4] reports diminishing returns after the early iterations. Neither gives production-grade latency or cost measurements.
3. **Restarts are a necessary control.** [S3] shows that concentrating budget on repairs can lose to independent samples at the same sample count. Any adoption test must include that comparator.

## R2. Reliability, evaluator, and leakage limits

| Constraint | Evidence and operational implication |
|---|---|
| **Oracle localization and task filtering** | [S1] supplies the faulty function from the gold patch, begins from known failing tests, excludes Django, and reduces 300 Lite tasks to 92. Do not extrapolate its 47% Llama hidden-test rate to an end-to-end repository agent. |
| **Single-run iterative measurement** | [S2] ran multi-iteration configurations once due to compute limits. Estimate paired uncertainty across repeated seeds before using small deltas to select a policy. |
| **Budget mismatch** | [S1] equalizes calls but not token volume. [S3] equalizes program samples but excludes feedback-token cost. Instrument input/output tokens, tool time, and end-to-end elapsed time locally. |
| **Synthetic and narrow feedback setting** | [S2] is Python-only, includes generated erroneous code and some LLM-simulated feedback, and omits reviewer dialogue and domain logs. Validate on production-like repositories and failure modes. |
| **Tests are an incomplete oracle** | SWE-bench requires `FAIL_TO_PASS` and `PASS_TO_PASS` tests to pass, but does not evaluate `FAIL_TO_FAIL` or `PASS_TO_FAIL`. Its authors state execution testing does not guarantee comprehensive behavior, reliability, efficiency, or readability. [S5, §2.3, Appendix A.4–A.5, §7.] |
| **Benchmark evaluator under-detection** | [S6] reports that running all tests found 7.8% of plausible patches incorrect. PatchDiff found 29.6% behaviorally different from ground truth, 28.6% confirmed incorrect, and estimated a 6.2-pp score overstatement. Keep a broader regression suite and review sample rather than treating benchmark resolution as full correctness. |
| **Issue and training leakage** | [S6] found complete solutions in 32.67% of 251 SWE-Agent + GPT-4 issue descriptions. Removing suspicious instances changed 12.47% to 3.97%. It also flags many issues predating model training cutoffs. Use temporally held-out internal tasks, redact direct solution disclosures, and report a leakage-screened slice. |
| **Leaderboard non-comparability** | [S6] finds 79 Lite and 99 Verified entries, 80 unique approaches, with incomplete disclosure. Lite and Verified use different filters and score distributions. Do not use a leaderboard rank to choose a stopping policy. |
| **No measured security result** | None of the retained sources measures security effects of validator feedback, retries, or stopping. This guide makes no security claim. |

## R3. Production fixed-model experiment and adoption rules

### Paired evaluation artifact

Use the following artifact for every task-policy pair. Freeze the model identifier, reasoning effort, system prompt, tool versions, sandbox image, maximum context, and task snapshot.

```yaml
run_design_eval_v1:
  task_id: "<immutable internal task id>"
  task_snapshot: "<repo SHA + environment digest>"
  model:
    id: "<unchanged model id>"
    reasoning_effort: "<unchanged setting>"
    temperature: 0.0
    seed: "<paired seed>"
  arms:
    - id: A_baseline
      policy: "one attempt; validate once; no repair"
    - id: B_feedback_1
      policy: "attempt; targeted validation; one repair only after actionable failure"
    - id: C_feedback_3
      policy: "attempt; validate; at most three repairs; stop on pass, repeated failure signature, or budget"
    - id: D_restart_budget_matched
      policy: "independent fresh attempts; no repair; match C's median token-and-tool budget"
  validator:
    targeted: "<failing or changed-component tests>"
    regression: "<broader affected suite>"
    static_checks: "<lint/type/build as applicable>"
    hidden_holdout: "<post-run evaluator unavailable to agent>"
  capture:
    resolved_targeted: boolean
    resolved_regression: boolean
    resolved_hidden_holdout: boolean
    regressions: integer
    attempts: integer
    repair_attempts: integer
    validator_runs: integer
    input_tokens: integer
    output_tokens: integer
    tool_seconds: number
    wall_seconds: number
    estimated_cost: number
    stop_reason: "<pass|budget|repeat_failure|validator_unavailable|other>"
    failure_signature_hashes: ["<normalized validator output hash>"]
```

### Design

1. **Task set:** Use a frozen, time-held-out internal set plus a representative mix of repository size, language, failing-test availability, and change scope. Keep test artifacts inaccessible to the agent when used only as final holdout evaluation.
2. **Pairing:** Run every arm on every task under matched seeds where supported. If stochasticity remains, repeat each task-arm enough times to estimate paired uncertainty. Preserve failed traces.
3. **Budget:** Set a maximum per-task token, tool-time, and wall-time budget. Match the restart arm to the repair arm on all three as closely as feasible, not only call count.
4. **Validation:** Feed only targeted, compact, actionable failure information into repair. Run broader regression and hidden holdout after the agent stops. Record whether feedback itself is truncated or unavailable.
5. **Primary endpoint:** Hidden-holdout resolution rate. Secondary endpoints: regression rate, cost per hidden-holdout resolution, p50/p95 wall time, validator runs, and stop-reason distribution.
6. **Analysis:** Report paired differences with confidence intervals, stratified by task type and validator availability. Publish the complete policy and budgets alongside results.

### Operational decision table

| Condition | Default action | Adoption gate |
|---|---|---|
| First candidate fails a targeted test with a concise, attributable failure | Permit one feedback repair. | Retain only if B improves hidden-holdout resolution over A without worsening regression rate. |
| A second repair would repeat the same normalized failure signature without a material code or test-scope change | Stop repair. | Use as a loop-break rule, then compare its avoided cost and any lost successes against C without the rule. |
| Targeted validation passes | Stop generation and run regression plus hidden holdout. | Do not continue “improving” a passing patch absent a separate measured objective. |
| Validator times out, is flaky, or output is too large/non-actionable | Do not treat it as a repair signal. Classify `validator_unavailable`, use bounded retry only for known transient infrastructure failures. | Measure this stratum separately. Do not merge it with semantic repair failure. |
| Three repair rounds have not passed | Default to stop or budget-matched restart, not more repair. | Override only if C→additional-repairs yields a positive paired hidden-holdout gain and acceptable marginal cost. [S2, S4] motivate testing this cap, not assuming it. |
| Choosing between repair and more independent attempts | Use the budget-matched restart arm. | Adopt repair only if it exceeds restart on hidden holdout at equal token, tool-time, and wall-time budget. [S3] requires this control. |
| Benchmark-only gain without broader regression or temporal holdout confirmation | Do not deploy based on it. | Require the production task set and the broader validation result because SWE-bench-style evaluation can over-credit patches. [S5, S6] |

## Explicit gaps

- No retained primary evaluation measures a production coding agent’s exact dollar cost, p95 latency, or reliability under a fixed reasoning-effort setting for this policy.
- No retained source evaluates retries under the same model **and** exact matched token, wall-time, and tool-time budgets on production repositories.
- No retained source supports a security conclusion.

## Retained-source appendix

- **[S1]** [Exploring the Potential of Conversational Test Suite Based Program Repair on SWE-bench](https://arxiv.org/html/2410.04485v1). Primary preprint. Inspected §2–3, Algorithm 1, Figs. 1–2, and appendix prompts. Relevant to R1–R3.
- **[S2]** [FeedbackEval: A Benchmark for Evaluating Large Language Models in Feedback-Driven Code Repair Tasks](https://arxiv.org/html/2504.06939). Primary benchmark/report. Inspected §3, §6.1–6.2, Table 4, Fig. 7, and §8. Relevant to R1–R3.
- **[S3]** [Is Self-Repair a Silver Bullet for Code Generation?](https://arxiv.org/html/2306.09896). ICLR 2024 primary paper. Inspected §4.1, Fig. 3, §5, and Appendix A. Relevant to R1–R3.
- **[S4]** [Is Three the Magic Number? An Empirical Evaluation of LLM-Based Repair Loops](https://arxiv.org/html/2607.05197). Primary preprint. Inspected §3–5, Fig. 2, Tables 1–2. Relevant to R1–R3. Exact per-condition values were not available in the inspected rendered content.
- **[S5]** [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/html/2310.06770). Original benchmark report. Inspected §2.1–2.3, §4.1, §5/Table 7, §7, Appendix A.2, A.4–A.5, Tables 1 and 22–23. Relevant to R2–R3.
- **[S6]** [Dissecting the SWE-Bench Leaderboards: Profiling Submitters and Architectures of LLM- and Agent-Based Repair Systems](https://arxiv.org/html/2506.17208v2). Primary empirical analysis. Inspected §1, §3.1–3.2, §4.1–4.4, §6.1–§7, and Table 1. Relevant to R2–R3.