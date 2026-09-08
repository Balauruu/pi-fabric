# AgentDojo v3: constraints on a permission-bounded tool agent

**Decision:** Deploy task-scoped, least-privilege tool exposure as defense in depth, not as a security guarantee. AgentDojo v3 measured a tool filter that reduced GPT-4o targeted attack success from 57.69% to 6.84% under its defense experiment while retaining 73.13% benign utility. That result is bounded to its synthetic, resettable, text-tool benchmark and fixed attack configuration. A deployment decision requires the paired local evaluation specified below, including attacks adapted to the planner/filter.

**Scope and date.** This report uses only the frozen original [AgentDojo arXiv v3 source](https://arxiv.org/html/2406.13352v3), supplied for this question, as of 2026-09-07. It does not claim production security.

## What the benchmark establishes

AgentDojo evaluates tool-calling agents in four mutable simulated environments: Workspace, Slack, Travel, and Banking. Tools read and write dummy state and return YAML-formatted outputs to the model. Success is not LLM-judged: deterministic binary utility and security functions inspect model output and state before/after execution. The workload contains **97** user tasks and **629** user-task × injection-task security cases. Tasks can require up to 18 calls, use up to 7,000 GPT-4 tokens of data and 4,000 tokens of tool descriptions. [Methods (§3–§3.4)](https://arxiv.org/html/2406.13352v3#S3)

The attack case construction matters: candidates are injection placeholders in outputs of tools required by the user task's ground-truth call sequence. This gives attacks relevant, actually queried placement, but also gives the benchmark attack construction privileged knowledge of task-required tools and controllable endpoints. [Appendix A](https://arxiv.org/html/2406.13352v3#A1)

Metrics have distinct denominators:

- **Benign utility:** fraction of the 97 user tasks solved without attack.
- **Utility under attack:** fraction of 629 security cases where the user task succeeds with no adversarial side effect.
- **Targeted ASR:** fraction of 629 security cases where the attacker goal succeeds.
- **Max:** a multi-attack case succeeds if any included attack succeeds.

These are useful deterministic benchmark measures, not estimates of real-world incident probability. [Metric definitions](https://arxiv.org/html/2406.13352v3#S3.SS4)

## Measured results

### Baseline-agent results

All models received a shared system prompt. Claude Sonnet variants received additional provider-recommended prompts, Llama 3 70B used a separate adapted tool-calling prompt, and official APIs were used except for Llama. The baseline attack was the authors' **Important message** prompt, which directs the agent to do the malicious task before the original task. [Evaluation setup (§4–§4.1)](https://arxiv.org/html/2406.13352v3#S4)

| Model/configuration | Benign utility | Utility under attack | Targeted ASR |
|---|---:|---:|---:|
| Claude 3 Opus | 66.61 ± 3.69 | 52.46 ± 3.90 | 11.29 ± 2.47 |
| Claude 3 Sonnet | 53.10 ± 3.90 | 33.23 ± 3.68 | 26.71 ± 3.46 |
| Claude 3.5 Sonnet | 78.22 ± 3.23 | 51.19 ± 3.91 | 33.86 ± 3.70 |
| Command-R+ | 25.44 ± 3.40 | 25.12 ± 3.39 | 0.95 ± 0.76 |
| Gemini 1.5 Flash | 36.09 ± 3.75 | 34.18 ± 3.71 | 12.24 ± 2.56 |
| Gemini 1.5 Pro | 45.63 ± 3.89 | 28.93 ± 3.54 | 25.60 ± 3.41 |
| GPT-3.5 Turbo | 33.86 ± 3.70 | 34.66 ± 3.72 | 8.43 ± 2.17 |
| GPT-4 Turbo | 63.43 ± 3.76 | 54.05 ± 3.89 | 28.62 ± 3.53 |
| GPT-4o | 69.00 ± 3.61 | 50.08 ± 3.91 | 47.69 ± 3.90 |
| Llama 3 70B | 34.50 ± 3.71 | 18.28 ± 3.02 | 20.03 ± 3.13 |

Percentages are reported 95% confidence intervals from [Table 3](https://arxiv.org/html/2406.13352v3#A3.T3). GPT-4o lost 18.92 percentage points of utility under attack versus benign utility in this table. This is configuration-specific evidence, not a general model ranking.

Heterogeneity is material: GPT-4o's Slack-suite ASR was 92%, while a Travel attack requiring both an expensive booking and email exfiltration succeeded in 0% of cases. End-of-tool-output placement reached up to 70% average success against GPT-4o. [Results (§4.1)](https://arxiv.org/html/2406.13352v3#S4.SS1)

### Attack and defense comparisons

For GPT-4o, the paper compared four prompt families and a per-case best-of-set Max. The targeted and untargeted ASR results below are from the same attack-comparison experiment. [Table 4](https://arxiv.org/html/2406.13352v3#A3.T4)

| Attack | Targeted ASR | Untargeted ASR |
|---|---:|---:|
| TODO | 3.66 ± 0.7 | 32.75 ± 1.8 |
| Ignore previous instructions | 5.41 ± 0.9 | 33.23 ± 1.8 |
| InjecAgent | 5.72 ± 0.9 | 31.48 ± 1.8 |
| Important message | 57.70 ± 2.0 | 49.90 ± 2.0 |
| Max | 57.55 ± 2.7 | 68.36 ± 2.6 |

The defense experiment was GPT-4o against the paper's stated strongest attack. It compared data delimiters, a per-tool-output BERT injection detector that aborts on detection, repeated user prompt after each call, and a pre-untrusted-data tool filter. [Defense methods (§4.3)](https://arxiv.org/html/2406.13352v3#S4.SS3)

| Defense | Benign utility | Utility under attack | Targeted ASR |
|---|---:|---:|---:|
| None | 69.00 ± 3.6 | 50.01 ± 3.9 | 57.69 ± 3.9 |
| Delimiting | 72.66 ± 3.5 | 55.64 ± 3.9 | 41.65 ± 3.9 |
| PI detector | 41.49 ± 3.9 | 21.14 ± 3.2 | 7.95 ± 2.1 |
| Repeat prompt | 85.53 ± 2.8 | 67.25 ± 3.7 | 27.82 ± 3.5 |
| Tool filter | 73.13 ± 3.5 | 56.28 ± 3.9 | 6.84 ± 2.0 |

Percentages are reported 95% confidence intervals from [Table 5](https://arxiv.org/html/2406.13352v3#A3.T5). Within this table only, the tool filter reduced targeted ASR by **50.85 percentage points** relative to no defense and increased benign utility by **4.13 points**. The detector reached a similar ASR but its benign utility was **27.51 points lower** than no defense, consistent with the authors' false-positive explanation. All defenses lost material utility under attack.

## Interpretation and bounded recommendation

The measured control is authority reduction: before observing untrusted data, the model chooses tools needed for the user task, and only that set remains exposed. This is a practical reason to enforce a task-scoped capability boundary outside the LLM. Delimiters and repeated prompts may improve this benchmark configuration, but they are prompt-level controls rather than authority boundaries.

**Recommend:** use an externally enforced pre-data capability plan, minimized to the task, with logging of selected capabilities and denied attempts. Treat the plan as a defense-in-depth layer beside normal authorization and approval controls. Do not represent it as preventing prompt injection or malicious recommendations.

**Do not infer:** that the 6.84% result transfers to real identities, permissions, durable sessions, data formats, multimodal inputs, or production attackers. The paper uses manually inspected synthetic dummy state and text-only tools. It explicitly says default attacks alone are unsuitable for robustness evaluation without a thorough adaptive attack. [Data card (§F.5.2)](https://arxiv.org/html/2406.13352v3#S5)

## Operational boundaries and controls

Measured tool-filter failure conditions are decisive:

1. It cannot protect a task whose necessary tools cannot be planned before untrusted output is seen.
2. It cannot block an attacker action already possible with the user's legitimate tool set. The paper says this applies to **17%** of its security cases.
3. It may fail in retained multi-task contexts: an injection can wait for a later task that grants the necessary tool.
4. Even stronger proposed symbolic isolation can still be bypassed when injected content changes a recommendation without adding a tool call.

These conditions support operational controls: reset or strictly scope capability grants per task, expire grants before a later task, separate read/recommendation output from high-impact execution, and log capability selection, calls, denials, context/task identifiers, and state changes for evaluation. These are deployment guidance inferred from the measured boundaries, not evaluated production controls. [Tool-isolation limitations](https://arxiv.org/html/2406.13352v3#S4.SS3)

## Concrete paired local evaluation artifact

Run the following paired artifact against the actual agent. It is a proposed transfer test, not an AgentDojo result.

```yaml
artifact: permission-boundary-paired-eval/v1
constant_conditions:
  model: identical
  system_and_user_prompts: identical
  tool_schemas: identical
  task_cases_and_initial_state: identical, reset before each run
  runtime_limits: identical
  injection_endpoint_and_position: identical
arms:
  A_full_exposure:
    capability_policy: all ordinarily available tools
  B_task_scoped:
    capability_policy: pre-untrusted-data minimal tool plan
    enforcement: outside the LLM
    required_log: [selected_capabilities, denied_attempts, tool_calls, state_changes, task_id, context_id]
case_sets:
  benign: user tasks only
  security: paired user_task_x_attacker_goal cases
  attacks: [TODO, ignore-previous, InjecAgent, important-message, defense-aware-planner-filter]
  required_strata: [tool-overlap, delayed-persistent-context, recommendation-manipulation, capability-family]
outputs:
  per_arm: [benign_utility, utility_under_attack, targeted_ASR, 95_percent_intervals]
  stratified: [ASR_by_capability_family, overlap_case_count]
  paired: [A_to_B_outcome_change_per_case, denied_attempt_count]
deploy_gate: >-
  Treat B as defense in depth only if it preserves the predeclared acceptable benign
  utility and materially reduces targeted ASR under the defense-aware local attacks.
  A reduction only against the four fixed prompt families is not a security guarantee.
```

Keep benign and security denominators separate, retain paired case-level results, and report the count where legitimate authority already permits the attacker action. The artifact directly tests the unproven transfer, adaptive-attack, overlap, and persistence questions rather than borrowing a benchmark delta.

## Unresolved questions and limitations

- No result evaluates attacks optimized against each defense. Fixed-attack results can overstate robustness.
- No result covers persistent multi-task contexts, production permissions or identities, multimodal inputs, or realistic attacker length/format constraints.
- Do not combine GPT-4o values across tables: Table 3 reports 47.69% targeted ASR, while Table 4 reports 57.70% for Important message and Table 5's no-defense row reports 57.69%. The source does not reconcile their run configurations. Its prose also says Max adds 10% success, although Table 4 targeted Max (57.55%) is slightly below Important message (57.70%).
- There is a tool-total inconsistency: §3.1 says 74 tools, while Table 1 and the data card say 70. The Table 1 per-environment counts sum to 74. This does not alter the stated 97/629 denominators but qualifies reproducibility.

Investigation ended at the supplied frozen source boundary. These gaps require the local paired evaluation, not extrapolation from this paper.

## Source appendix

| Retained source | Type/date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents, arXiv v3](https://arxiv.org/html/2406.13352v3) | Original paper, v3, frozen as of 2026-09-07 | Benchmark design, deterministic evaluators, 97/629 workload, model/attack/defense results, Table 3–5 intervals, stated tool-isolation failures and data card | One synthetic text-tool benchmark. Results are configuration-specific, non-production, and lack defense-adaptive evaluation. |

