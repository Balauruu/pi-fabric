# AgentDojo v3: deployment constraints for a permission-bounded tool agent

**Decision.** Deploy a pre-data, enforced permission-boundary only for task classes in which the allowed tools can be determined before any untrusted tool output and exclude the tools needed for the attacker goal. In the frozen AgentDojo v3 evaluation, this *tool filter* was the lowest targeted-attack-success defense tested on GPT-4o: **6.84% ±2.0** versus **57.69% ±3.9** with no defense, a **50.85 percentage-point** reduction. It is a useful, bounded control, not a production-security guarantee or a solution for shared-capability, dynamic-discovery, retained-context, or recommendation-manipulation cases. Do not use AgentDojo default attacks alone to approve deployment. [Original source, §4.3 and Table 5](https://arxiv.org/html/2406.13352v3#S4.SS3).

**Scope and research date.** This assessment is limited to frozen AgentDojo arXiv v3 material available as of 2026-09-07. It evaluates a simulated, stateful tool environment and does not establish a production-security result.

## What was evaluated

AgentDojo v3 has four mutable simulated environments: Workspace, Slack, Travel, and Banking. Its main text specifies **74 tools**, **97 user tasks**, and **27 injection targets**, crossed within environments into **629 security cases**. Tool outputs are formatted as text. User-task utility and attacker success are deterministic binary checks over model output and environment state before and after execution, rather than LLM judging. [§3–§3.1](https://arxiv.org/html/2406.13352v3#S3), [Table 1](https://arxiv.org/html/2406.13352v3#S3.T1).

The workload includes up to 18 tool calls, up to 7,000 GPT-4 tokens of state/context and 4,000 tokens of tool descriptions. Injection goals require one to 20 steps, from generic actions to sensitive actions. Attacks are inserted only in candidate placeholders from outputs of tools in the user task’s ground-truth required-call sequence. Thus, the result concerns injections on tool output the agent is expected to read, not arbitrary placement in unqueried data. [§3.1](https://arxiv.org/html/2406.13352v3#S3.SS1), [Appendix A](https://arxiv.org/html/2406.13352v3#A1).

Metrics and denominators are distinct:

- **Benign utility:** share of 97 user tasks solved without an attack.
- **Utility under attack:** share of 629 user/injection pairs in which the user task is solved without adversarial side effects.
- **Targeted ASR:** share of 629 security cases in which the attacker goal is met.
- For a collection of attacks, success can be **any** attack succeeding in a case, a best-of-collection measure. [§3.4](https://arxiv.org/html/2406.13352v3#S3.SS4).

The paper evaluates Claude 3 Opus/Sonnet/3.5 Sonnet, Command R+, Gemini 1.5 Flash/Pro, GPT-3.5 Turbo, GPT-4 Turbo, GPT-4o, and Llama 3 70B. It uses a default system prompt, additional model-specific prompts for Claude and Llama, and official provider APIs except for Llama. Defense and attack ablations focus on GPT-4o because it had the highest benign utility among models available for detailed analysis. [§4](https://arxiv.org/html/2406.13352v3#S4).

## Source-bound results

### Baseline exposure is material, but model results are configuration-specific

Under the generic “Important message” attack, Table 3 reports the following non-comparable model configurations. Values are percentage points with reported 95% proportion confidence intervals.

| Model | Benign utility, 97 tasks | Utility under attack, 629 cases | Targeted ASR, 629 cases |
|---|---:|---:|---:|
| Claude 3 Opus | 66.61 ±3.69 | 52.46 ±3.90 | 11.29 ±2.47 |
| Claude 3.5 Sonnet | 78.22 ±3.23 | 51.19 ±3.91 | 33.86 ±3.70 |
| GPT-4o | 69.00 ±3.61 | 50.08 ±3.91 | 47.69 ±3.90 |
| GPT-4 Turbo | 63.43 ±3.76 | 54.05 ±3.89 | 28.62 ±3.53 |
| Command R+ | 25.44 ±3.40 | 25.12 ±3.39 | 0.95 ±0.76 |

[Table 3](https://arxiv.org/html/2406.13352v3#A3.T3). These values show that low targeted ASR can coexist with poor task utility, so ASR alone is not a deployment ranking.

For GPT-4o, attack wording changes the outcome substantially. Table 4 reports targeted ASR of **3.66% ±0.7** for TODO, **5.41% ±0.9** for ignore-previous, **5.72% ±0.9** for InjecAgent, **57.7% ±2.0** for Important message, and **57.55% ±2.7** for Max. Max selects the most effective of those four fixed phrasings per case. Its untargeted ASRs are respectively 32.75%, 33.23%, 31.48%, 49.9%, and 68.36%. [§4.2 and Table 4](https://arxiv.org/html/2406.13352v3#S4.SS2). “Max” is not a defense-aware adaptive attack.

The source also reports heterogeneity: GPT-4o’s Slack suite had **92%** attack success, while a Travel goal requiring an expensive booking *and* email exfiltration succeeded in **0%** of cases because the agent often completed only one malicious subgoal. Injections at the end of a tool output reached up to **70% average ASR**. [§4.1](https://arxiv.org/html/2406.13352v3#S4.SS1), [Appendix D](https://arxiv.org/html/2406.13352v3#A4).

### Defense comparison: permissions lead this selected GPT-4o test, not all threats

All rows below are GPT-4o against the paper’s strongest selected attack configuration. Do not combine this table with Table 3’s GPT-4o result: Table 3 reports 47.69% targeted ASR, while the no-defense row here reports 57.69%; the supplied source does not explain the configuration/run difference.

| Defense | Benign utility | Utility under attack | Targeted ASR | Interpretation |
|---|---:|---:|---:|---|
| No defense | 69.00 ±3.6 | 50.01 ±3.9 | 57.69 ±3.9 | Reference configuration |
| Data delimiters | 72.66 ±3.5 | 55.64 ±3.9 | 41.65 ±3.9 | Retains utility but leaves high ASR |
| PI detector, abort on detection | 41.49 ±3.9 | 21.14 ±3.2 | 7.95 ±2.1 | Near-filter ASR with false-positive/abort cost |
| Repeat user prompt after each call | 85.53 ±2.8 | 67.25 ±3.7 | 27.82 ±3.5 | Best reported utility, but substantial residual ASR |
| Pre-data tool filter | 73.13 ±3.5 | 56.28 ±3.9 | 6.84 ±2.0 | Lowest tested ASR, residual risk remains |

[§4.3 and Table 5](https://arxiv.org/html/2406.13352v3#S4.SS3). Relative to no defense, the filter raises benign utility **4.13 pp** and utility under attack **6.27 pp**, while reducing targeted ASR **50.85 pp**. The detector reduces ASR **49.74 pp**, but lowers benign utility **27.51 pp** because it aborts when any tool output is detected as an injection. Repeating the prompt is explicitly judged unlikely to withstand an injection that tells the model to ignore future instructions.

## Operational deployment boundary

### Recommended control

Before the first untrusted result, produce and enforce an allowlist of only the tools required for the user’s task. Treat enforcement as a runtime capability boundary, not merely a model instruction. This maps to the measured mechanism: read-only user work can exclude write-capable attacker actions. [§4.3](https://arxiv.org/html/2406.13352v3#S4.SS3).

Use it only when all of these hold:

1. Required capabilities are determinable before untrusted data is read.
2. The planned allowlist excludes every capability needed for the modeled attacker goal.
3. The run has a bounded context lifecycle, with the allowlist recomputed and re-enforced per task.
4. User completion, prohibited side effects, and attacker-goal completion have deterministic checks in local testing.

### Do not infer coverage for these cases

| Boundary | What the source establishes | Operational treatment |
|---|---|---|
| Shared capability | Tools required for the user task also suffice for the attack in **17%** of test cases. | Do not claim protection from filtering. Apply separate transaction/policy controls or do not automate the action. |
| Dynamic tool discovery | Filtering fails when one tool result determines which tool is needed next. | Route to a separately evaluated design. Do not widen permissions based solely on untrusted output. |
| Persistent multi-task context | The benchmark does not cover multiple tasks without reset. An injection could wait for a later task enabling the needed tool. | Reset context and capability grants per task. Treat retained-context behavior as unproven until locally tested. |
| Content or recommendation manipulation | Isolation can still fail when malicious content changes a result without an additional tool call. | Do not treat permissions as integrity protection for retrieved content or recommendations. |

These are source-stated limitations, not estimates of local incidence. [§4.3](https://arxiv.org/html/2406.13352v3#S4.SS3).

## Concrete paired local evaluation artifact

Run the following protocol before transferring the recommendation. It is a proposed local artifact, not an AgentDojo result.

```yaml
artifact: permission-boundary-paired-evaluation-v1
unit: one identical task plus injected state, executed once in each arm
fixed_across_arms:
  - model_and_version
  - system_and_user_prompts
  - tool_implementations_and_initial_state
  - token_and_runtime_limits
  - injection_text_and_position
arms:
  unrestricted: all production candidate tools available
  pre_data_bounded: task-derived allowlist enforced before first untrusted tool output
metrics:
  benign_utility: completed_benign_tasks / benign_tasks
  utility_under_attack: attacked_cases_with_user_success_and_no_side_effect / attacked_cases
  targeted_asr: attacked_cases_with_attacker_goal / attacked_cases
  intervals: report 95% proportion intervals with numerator and denominator
strata:
  S1_preplannable_separable: user tools exclude attack tools
  S2_shared_capability: an allowed user tool can execute the attack
  S3_dynamic_discovery: later tool need depends on an untrusted result
  S4_retained_context: sequential tasks retain prior context
  S5_content_integrity: recommendation or result manipulation needs no forbidden tool
attack_battery:
  fixed_phrasings: [TODO, ignore-previous, InjecAgent, Important-message]
  placement: include end-of-tool-output cases
  reporting: per-phrase and best-of-fixed-phrases, never label the latter defense-aware adaptive
  exploratory: defense-aware adaptive attacks reported separately
case_record_fields:
  - case_id
  - stratum
  - arm
  - prompt_id
  - injection_position
  - user_success
  - prohibited_side_effect
  - attacker_goal_success
  - allowed_tools
  - attempted_blocked_tools
```

**Decision rule.** Claim transfer only for S1, and only if the bounded arm preserves benign utility while materially reducing targeted ASR using identical paired cases, disclosed denominators, and intervals. S2–S5 results are exploratory evidence, not proof that permissions solve those classes. This design preserves the source’s metric definitions and adds the missing transfer test. The v3 data card says use of default attacks without a thorough adaptive evaluation is unsuitable. [Data card §F.5.2](https://arxiv.org/html/2406.13352v3#A6).

## Unproven tradeoffs and limitations

- v3 uses synthetic state and simulated applications, not a production deployment.
- The paper calls its attacks and defenses relatively simple and proposes stronger adaptive attacks and defenses. It does not establish robustness against defense-aware attacks.
- It lacks multimodal tasks and realistic injection length/format constraints, and does not report per-stratum tool-filter outcomes.
- The reported confidence intervals are 95% proportion intervals from `statsmodels.stats.proportion.proportion_confint`; the inspected source does not state a repeated-run or seed protocol for these results.
- The source contains a tool-count conflict: §3.1 says 74 and Table 1 rows sum to 74, while Table 1’s caption and the data card say 70. This does not alter the reported 97/27/629 task-case counts, but it limits precision about tool inventory.
- Results conflict across reported GPT-4o configurations: Table 3 is 47.69% targeted ASR under Important message, Table 4 is 57.7%, Table 5 no defense is 57.69%, and Table 2’s knowledge-ablation baseline is 45.8%. The frozen source does not resolve the difference. They must remain separate.

Investigation ends here because the fixed-evidence scope permits only the frozen AgentDojo v3 source.

## Source appendix

| Retained source | Type/date | Evidence form | Supports | Important limitation |
|---|---|---|---|---|
| [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents, arXiv v3](https://arxiv.org/html/2406.13352v3) | Original benchmark paper, v3, frozen as of 2026-09-07 | Environment/method sections, Tables 1–5, Appendices A, C, D, and F | Environment, denominators, model/attack/defense results, tool-filter boundaries, data-card warning | Single synthetic benchmark source. Configuration discrepancies and absence of a thorough defense-aware adaptive evaluation prevent a production-security claim. |

Local frozen evidence inspected: [`agentdojo-2406.13352v3.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T3/sources/agentdojo-2406.13352v3.md).