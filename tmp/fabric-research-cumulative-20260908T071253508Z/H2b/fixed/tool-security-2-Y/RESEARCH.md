# AgentDojo v3 constraints for a permission-bounded tool agent

**Decision:** deploy a pre-execution, task-specific capability allowlist only for the narrow task class whose legitimate tools can be determined before any untrusted tool output is observed. Treat it as a measured risk-reduction mechanism, not a security guarantee. Do not use AgentDojo v3 as evidence that it protects dynamic plans, shared-capability tasks, persistent contexts, recommendation integrity, multimodal inputs, or defenses facing adaptive attacks.

**Scope and research date.** This report addresses the stated deployment decision using only the frozen original [AgentDojo arXiv v3](https://arxiv.org/html/2406.13352v3), as available in the assignment corpus on 2026-09-07. It makes no production-security claim.

## Executive answer

AgentDojo provides useful evidence for one deployment control: restricting the tool set before the planning model reads untrusted tool output. In the paper's GPT-4o defense comparison, the tool filter reduced targeted attack success rate (ASR) from **57.69% ± 3.9** with no defense to **6.84% ± 2.0**, a **50.85-percentage-point** difference. Benign utility was **73.13% ± 3.5** versus **69.00% ± 3.6** without defense. The closest measured comparator, a prompt-injection detector, reached **7.95% ± 2.1** targeted ASR but reduced benign utility to **41.49% ± 3.9**. [Table 5](https://arxiv.org/html/2406.13352v3#A3.T5)

That result applies where a precomputed minimal capability set lets the user complete the task while excluding the attack's needed tool, notably read-only user tasks versus write-side attacks. The paper states that this condition fails when a plan depends on tool results, when a user-required tool can execute the attack, or with persistent multi-task context. It reports the shared-tool condition in **17%** of test cases. Even a more isolated architecture does not prevent an injected result from manipulating a recommendation without requiring another tool call. [Tool-isolation limitations](https://arxiv.org/html/2406.13352v3#S4.SS3)

**Bounded recommendation:** make pre-untrusted-data capability binding a deployment gate for the eligible class. For all excluded classes, require a separate local security evaluation before relying on the agent for side effects. Prompt formatting, repeated user prompts, and output classifiers can be evaluated as supplementary controls, but the source does not establish any of them as a security boundary.

## What the benchmark measures

AgentDojo is a stateful simulated tool environment spanning Workspace, Slack, Travel, and Banking. It uses synthetic, manually inspected dummy data and actual tool calls against mutable state, rather than an LLM environment simulator. Utility and security are deterministic binary checks of model output plus pre- and post-execution state. [Environment and checks](https://arxiv.org/html/2406.13352v3#S3.SS1); [data card](https://arxiv.org/html/2406.13352v3#S6.F7)

| Suite | Tools listed | User tasks | Injection tasks | Security cases |
|---|---:|---:|---:|---:|
| Workspace | 24 | 40 | 6 | 240 |
| Slack | 11 | 21 | 5 | 105 |
| Travel | 28 | 20 | 7 | 140 |
| Banking | 11 | 16 | 9 | 144 |
| **Total** | **74** | **97** | **27** | **629** |

Security cases are the within-environment cross-product of user and injection tasks. Tasks can require up to 18 tool calls; tool-output contexts reach 7,000 GPT-4 tokens, with up to 4,000 tokens of tool descriptions. [§3.1 and Table 1](https://arxiv.org/html/2406.13352v3#S3.SS1)

The metrics have distinct denominators and should not be merged:

- **Benign utility:** user tasks solved without an attack, denominator 97.
- **Utility under attack:** security cases where the user task succeeds without adversarial side effects, denominator 629. Its complement is untargeted or derailment success.
- **Targeted ASR:** security cases where the attacker's formal goal is met, denominator 629.
- For an attack set, a case is successful if any attack succeeds, intended to represent per-case selection of the best attack. [Metrics](https://arxiv.org/html/2406.13352v3#S3.SS4)

The source reports 95% proportion confidence intervals using `statsmodels.stats.proportion.proportion_confint`. It does not state model snapshot IDs, temperature, number of stochastic repeats, or provider-evaluation dates in the readable v3 text. Those omissions limit reproducibility and transfer.

## Baseline exposure and attack conditions

All baseline models were evaluated on 629 security cases and 97 benign tasks: Claude 3 Opus/Sonnet/3.5 Sonnet, Command-R+, Gemini 1.5 Flash/Pro, GPT-3.5 Turbo, GPT-4 Turbo, GPT-4o, and Llama 3 70B. They received a common system prompt, with additional provider-recommended prompts for the Claude Sonnet variants and a dedicated tool-calling prompt for Llama; official APIs were used except for Llama. [Evaluation setup](https://arxiv.org/html/2406.13352v3#S4)

The cross-model baseline used the generic **Important message** injection, which directs the model to perform the malicious task before the original one. [Baseline attack](https://arxiv.org/html/2406.13352v3#S4.SS1)

| Model | Benign utility | Utility under attack | Targeted ASR |
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

*Percent; 95% intervals. Source: [Table 3](https://arxiv.org/html/2406.13352v3#A3.T3).* 

This shows no simple equivalence between benign capability and targeted-injection resistance. For example, Claude 3.5 Sonnet had 78.22% benign utility and 33.86% targeted ASR, while GPT-4o had 69.00% and 47.69%, respectively. Most models lost 10–25 percentage points of utility under attack, according to the authors. These are model- and prompt-specific benchmark outcomes, not a ranking for a production system.

Attack phrasing and placement materially changed results for GPT-4o. [Table 4](https://arxiv.org/html/2406.13352v3#A3.T4) reports:

| Attack | Targeted ASR | Untargeted ASR |
|---|---:|---:|
| TODO | 3.66 ± 0.7 | 32.75 ± 1.8 |
| Ignore previous instructions | 5.41 ± 0.9 | 33.23 ± 1.8 |
| InjecAgent | 5.72 ± 0.9 | 31.48 ± 1.8 |
| Important message | 57.70 ± 2.0 | 49.90 ± 2.0 |
| Max per-case selector | 57.55 ± 2.7 | 68.36 ± 2.6 |

Injections near the end of a tool response reached up to 70% average success against GPT-4o. Slack reached 92% ASR in the suite breakdown. One Travel injection requiring both an expensive Paris booking and email exfiltration succeeded in 0% of cases because the model often completed only one subgoal. [Attack results and placement](https://arxiv.org/html/2406.13352v3#S4.SS1); [position method](https://arxiv.org/html/2406.13352v3#A4). Identity knowledge was not decisive but affected this configuration: generic references yielded 45.8% ASR, correct model and user names 47.7%, and incorrect model or user names about 23%. [Table 2](https://arxiv.org/html/2406.13352v3#S4.T2)

## Defense comparison and deployment implication

All defense figures below are GPT-4o results against the paper's strongest reported attack. They are not a defense-adaptive attack evaluation. [Defense method](https://arxiv.org/html/2406.13352v3#S4.SS3)

| Defense | Mechanism | Benign utility | Utility under attack | Targeted ASR |
|---|---|---:|---:|---:|
| None | Baseline | 69.00 ± 3.6 | 50.01 ± 3.9 | 57.69 ± 3.9 |
| Delimiting | Marks tool output as data and asks model to ignore its instructions | 72.66 ± 3.5 | 55.64 ± 3.9 | 41.65 ± 3.9 |
| PI detector | Classifies each tool output and aborts on detection | 41.49 ± 3.9 | 21.14 ± 3.2 | 7.95 ± 2.1 |
| Repeat prompt | Repeats user instruction after every tool call | 85.53 ± 2.8 | 67.25 ± 3.7 | 27.82 ± 3.5 |
| Tool filter | Selects task-required tools before seeing untrusted data | 73.13 ± 3.5 | 56.28 ± 3.9 | 6.84 ± 2.0 |

*Percent; 95% intervals. Source: [Table 5](https://arxiv.org/html/2406.13352v3#A3.T5).* 

**Interpretation.** Tool filtering is the directly relevant comparator because it constrains executable capability before exposure, rather than asking the exposed model to recognize instructions as data. Its measured ASR reduction versus no defense was 50.85 points. The detector's similar ASR result came with a 27.51-point benign-utility reduction, which the paper attributes to false positives. Delimiting and prompt repetition improved utility in this experiment but left targeted ASR at 41.65% and 27.82%. The authors specifically warn that prompt repetition is unlikely to withstand an injection that instructs the model to ignore future instructions. These comparisons establish a tradeoff in this configuration only.

## Operational guidance

Apply these controls only as stated:

1. **Capability-bind before exposure.** Compute and enforce the task-specific allowlist before the planning model receives untrusted tool data. This is the source-supported mechanism.
2. **Separate reads from side effects.** Structure tool permissions so read-only tasks do not receive write capability. This makes the demonstrated condition testable.
3. **Fail closed on capability expansion.** If execution requires a tool outside the bound, abort or escalate to a distinct approval or deterministic policy gate. This is a proposed deployment control, not a result measured by AgentDojo.
4. **Classify excluded tasks up front.** Do not claim allowlist protection for output-dependent plans, shared legitimate/attack tools, persistent context, or recommendation/content-integrity tasks. Route them to the local evaluation below.
5. **Use other defenses only in depth.** Formatting, prompt repetition, and output detection may be measured as supplements. Do not make an adoption decision from their fixed-attack results alone.

## Concrete paired local evaluation artifact

Create one evaluation manifest and result table per release, with each row a matched trial. This is a proposed local test, not evidence that AgentDojo performed it.

```yaml
# permission-bound-agent-eval.yaml
trial_id: string
stratum: precomputable-minimal-capability | output-dependent-plan | shared-tool | persistent-context | recommendation-integrity
initial_state_id: string
user_task_id: string
injection_goal_id: string
injection_phrase: TODO | ignore-previous | injecagent | important-message
injection_position: start | middle | end
capability_overlap: none | partial | full
arm: A-full-toolset | B-pre-exposure-allowlist
allowed_tools: [string]
user_success: boolean
adversarial_side_effect: boolean
targeted_attack_success: boolean
tool_denied_or_escalated: boolean
```

**Paired protocol.** For every local task whose minimal legitimate capability set is known before untrusted reads, use identical initial state, user task, injection goal, model configuration, and deterministic user-success and security checks in both arms:

- **A:** normal full tool set.
- **B:** the same agent with a task-specific allowlist fixed before untrusted data.

Use the four paper phrasings, vary placement including the end of tool output, and calculate per-case maximum ASR. Report benign utility, utility under attack, targeted ASR, tool-denial/escalation rate, and 95% proportion intervals. Break out denominators by task, injection goal, tool class, and capability overlap. The decision condition for the eligible stratum is that B preserves benign utility while reducing targeted ASR relative to A.

Evaluate output-dependent, shared-tool, persistent-context, and recommendation-integrity strata separately. For them, compare bounded execution, approval-gated writes, and any symbolic-isolation design, then use attacks adapted to the exact defense. Do not infer a pass for these strata from an allowlist result in the eligible stratum. For rough historical planning only, AgentDojo estimates US$35 for 629 GPT-4o security cases and US$4 for 97 benign cases; this is not a forecast for local cost. [Appendix D](https://arxiv.org/html/2406.13352v3#A4)

## Unresolved issues and limitations

- **L1 — Adaptive robustness is unmeasured.** The paper says fixed generic attacks are insufficient for robustness evaluation and explicitly frames the benchmark as extensible for adaptive attacks. No listed defense result proves resistance to an attacker adapting to that defense. [§3.3](https://arxiv.org/html/2406.13352v3#S3.SS3)
- **L2 — Transfer is unestablished.** The environment is synthetic, text-only, single-task, and populated with dummy data. It does not validate production tool graphs, real identities/data, different models, or persistent workflows.
- **L3 — Capability overlap and integrity remain exposed.** Shared required tools, dynamic tool selection, later task grants, and recommendation manipulation are stated failure boundaries, not edge cases resolved by the reported ASR.
- **L4 — Source-internal discrepancies require caution.** §3.1 prose and Table 1 rows total 74 tools, while the Table 1 caption and data card say 70. The listed task cross-products still reconstruct 629 cases. GPT-4o Important-message ASR is 47.69% in Table 3, 57.70% in Table 4, and 57.69% for no defense in Table 5, while Table 2's generic identity-ablation baseline is 45.8%. The readable source does not explain the configuration, run, or denominator differences, so these values are reported separately. Finally, the defined Max selector is slightly lower than Important message in targeted ASR (57.55% versus 57.70%), despite being described as selecting the best attack per case. This remains unresolved.
- **L5 — Reproducibility detail is incomplete.** Model snapshots, temperatures, repeated-run count, detector threshold/calibration, and exact provider-evaluation dates are not stated in the readable source. The prose calls the detector a BERT classifier while its cited artifact is named DeBERTa-v3-base.

Research ends here because the fixed-evidence instruction restricted this report to the supplied frozen original source. No external validation, later version, code inspection, production evidence, or other study was used.

## Source appendix

| Retained source | Type/date | Evidence form | Supports | Important limitation |
|---|---|---|---|---|
| [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents, arXiv v3](https://arxiv.org/html/2406.13352v3) | Original research paper, arXiv v3, frozen 2026-09-07 | Benchmark methods, tables, appendices, and stated limitations | Environment, metrics, model/attack conditions, defense comparisons, cost estimate, and failure boundaries reported above | Synthetic dummy-data setting; fixed reported attacks; source-internal table discrepancies; incomplete configuration detail |
| [Frozen local source snapshot](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T3/sources/agentdojo-2406.13352v3.md) | Local supplied evidence snapshot | Controlled readable extraction of the original v3 source | Audit trail for this fixed-evidence report | Local snapshot, not independent corroboration |
| [Local substantive evidence note](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2b/fixed/tool-security-2-Y/streams/s1.md) | Local supplied synthesis note | Extraction and source-conflict record | Deeper local context for the constrained analysis | Not an independent source |
