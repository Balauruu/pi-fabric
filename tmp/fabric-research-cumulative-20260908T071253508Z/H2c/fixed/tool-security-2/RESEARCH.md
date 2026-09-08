# AgentDojo v3 constraints for a permission-bounded tool agent

**Decision:** deploy a pre-untrusted-data capability bound only for task classes whose minimum legitimate tools are determinable before any untrusted tool output is read, and use it as a risk-reduction control, not a security guarantee. Do not use AgentDojo v3 alone to approve tasks with dynamic plans, shared legitimate/malicious capabilities, persistent context, or recommendation-integrity risk.

**Scope and research date.** This assessment is limited to AgentDojo arXiv v3, frozen 2026-09-07. It evaluates synthetic, text-only, single-task environments with dummy data. It does not establish a production-security property.

## Executive answer

AgentDojo v3 provides directly relevant evidence for a narrow deployment mechanism: restrict the agent to task-required tools **before** it sees untrusted data. In the paper's GPT-4o defense experiment under its strongest reported fixed attack, tool filtering reduced targeted attack success rate (ASR) from **57.69% ± 3.9** to **6.84% ± 2.0**, a **50.85 percentage-point** reduction. Benign utility increased from **69.00% ± 3.6** to **73.13% ± 3.5**, while utility under attack increased from **50.01% ± 3.9** to **56.28% ± 3.9**. This is a matched defense comparison only within that benchmark configuration. It is not evidence against an attack adapted to the filter.

The mechanism has a stated boundary: it works principally when the user needs read access while the attacker needs an ungranted write tool. The paper reports that tools needed for the user task are also sufficient for the attack in **17%** of its test cases. It also identifies failure risk for plans that depend on untrusted results, persistent multi-task context, and attacks that manipulate the content of a required result without needing another tool call. Those cases require separate controls and local evidence.

## What AgentDojo v3 measures

### Environment and evaluator

[AgentDojo v3](https://arxiv.org/html/2406.13352v3) implements stateful simulated Workspace, Slack, Travel, and Banking environments. Agents make tool calls against mutable state. User-task utility and attacker-goal security are deterministic binary functions of model output and pre/post-execution environment state, rather than LLM-judged simulation. The state contains synthetic dummy data, generated manually or with GPT-4o and Claude 3 Opus then manually inspected.

| Suite | Tools listed | User tasks | Injection tasks | Security cases, user × injection |
|---|---:|---:|---:|---:|
| Workspace | 24 | 40 | 6 | 240 |
| Slack | 11 | 21 | 5 | 105 |
| Travel | 28 | 20 | 7 | 140 |
| Banking | 11 | 16 | 9 | 144 |
| **Total** | **74** | **97** | **27** | **629** |

The paper states tasks can require up to 18 calls, tool-output contexts up to 7,000 GPT-4 tokens, and tool descriptions up to 4,000 GPT-4 tokens. The security denominator is the within-environment cross-product and is reconstructible as 629.

**Metrics and attack selection.** Benign utility is the fraction of 97 user tasks solved with no attack. Utility under attack is the fraction of 629 security cases in which the user task succeeds without adversarial side effects. Targeted ASR is the fraction of security cases in which the formal malicious goal is met. For an attack collection, a case is successful if any attack succeeds, intended to model selecting the best attack per user/injection case. The source reports 95% proportion confidence intervals using `statsmodels.stats.proportion.proportion_confint`; it does not specify model snapshot IDs, temperatures, repeated stochastic-run counts, or provider-evaluation date.

### Baseline exposure

All listed baseline agents were evaluated on 629 security cases and 97 benign tasks. They used a common system prompt, with extra provider-recommended prompts for Claude Sonnet variants and a special tool-calling prompt for Llama. The paper says official APIs were used except for Llama. The cross-model attack was the generic **Important message** injection, instructing the model to perform the malicious task before the original task.

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

*Table 3 in the [original appendix](https://arxiv.org/html/2406.13352v3#A3.T3). Percentages; intervals are reported 95% intervals.*

Capability and injection resistance do not move together in these data. For example, Claude 3.5 Sonnet had 78.22% benign utility and 33.86% targeted ASR, while GPT-4o had 69.00% and 47.69%, respectively. Most models lost 10–25 points of utility under attack. This is descriptive for the named models, prompts, and generic attack, not a general model ranking.

## Attack reliability and selection conditions

For GPT-4o, the source compared four phrasings and a per-case Max selector:

| Attack | Targeted ASR | Untargeted ASR |
|---|---:|---:|
| TODO | 3.66 ± 0.7 | 32.75 ± 1.8 |
| Ignore previous instructions | 5.41 ± 0.9 | 33.23 ± 1.8 |
| InjecAgent | 5.72 ± 0.9 | 31.48 ± 1.8 |
| Important message | 57.70 ± 2.0 | 49.90 ± 2.0 |
| Max | 57.55 ± 2.7 | 68.36 ± 2.6 |

*Table 4 in the [original appendix](https://arxiv.org/html/2406.13352v3#A3.T4). Percentages; intervals are reported 95% intervals.*

Attack wording and placement are material conditions, not details to abstract away. Injections near the end of tool output reached up to 70% average success against GPT-4o. The Slack suite reached 92% reported attack success, while a Travel injection requiring both an expensive Paris booking and email exfiltration succeeded in 0% of cases because the model often completed only one malicious subgoal. In the identity ablation, generic model/user references yielded 45.8% targeted ASR, both correct names 47.7%, and a wrong model or user about 23%.

The source calls fixed generic attacks inadequate for robustness evaluation and marks default-attacks-only evaluation unsuitable. Therefore its defense results must not be read as adaptive robustness evidence.

## Defense comparison and decision implications

All defenses below are GPT-4o measurements against the paper's strongest reported attack, not a demonstrated attack adapted to each defense.

| Defense | Benign utility | Utility under attack | Targeted ASR | Difference from no defense, targeted ASR |
|---|---:|---:|---:|---:|
| None | 69.00 ± 3.6 | 50.01 ± 3.9 | 57.69 ± 3.9 | — |
| Delimiting | 72.66 ± 3.5 | 55.64 ± 3.9 | 41.65 ± 3.9 | −16.04 points |
| PI detector | 41.49 ± 3.9 | 21.14 ± 3.2 | 7.95 ± 2.1 | −49.74 points |
| Repeat prompt | 85.53 ± 2.8 | 67.25 ± 3.7 | 27.82 ± 3.5 | −29.87 points |
| Tool filter | 73.13 ± 3.5 | 56.28 ± 3.9 | 6.84 ± 2.0 | −50.85 points |

*Table 5 in the [original appendix](https://arxiv.org/html/2406.13352v3#A3.T5). Percentages; intervals are reported 95% intervals.*

**Interpretation.** The tool filter and detector achieved similarly low ASR in this setting. Their utility tradeoff differed sharply: the detector lost 27.51 points of benign utility versus no defense, which the paper attributes to false positives. The filter increased benign utility by 4.13 points, but still had only 56.28% utility under attack. Delimiting and prompt repetition are not security boundaries on this evidence. The paper explicitly cautions that prompt repetition is unlikely to withstand an adaptive injection that tells the model to ignore future instructions.

**Source conflict to retain.** The text says tool filtering lowers ASR to 7.5%, while Table 5 reports 6.84% ± 2.0. Table 3 gives GPT-4o Important-message ASR of 47.69% ± 3.90, whereas Table 4 gives 57.70% ± 2.0 and Table 5's no-defense row gives 57.69% ± 3.9. The readable source does not state why configurations, runs, or denominators differ. These results must not be pooled. Also, Max is defined as selecting the best attack per case but reports 57.55%, marginally below Important message's 57.70%; the source does not resolve this. Finally, the text calls the detector a BERT classifier while its cited artifact is named DeBERTa-v3-base, with no threshold or calibration given.

## Bounded recommendation and operational guidance

### Use the capability bound only in its demonstrated class

Adopt a task-specific allowlist when all of the following are true:

1. The minimal legitimate capability set can be computed before any untrusted tool result reaches the planner.
2. The user task is satisfiable without the side-effecting capability needed for the attacker goal.
3. Execution aborts or escalates when a tool outside that fixed bound is requested.
4. The deployment has passed the paired local evaluation below with attacks adapted to the bound.

This applies the measured tool-filter mechanism. It does not convert the paper into a guarantee.

### Treat these as separate, unproven risk classes

Do not approve a capability bound as the security control where: (a) untrusted results determine the next legitimate tool, (b) a granted tool can perform both legitimate and malicious actions, (c) context persists across multiple user tasks, or (d) the injection can alter a recommendation or other required content without another tool call. The paper reports category (b) in 17% of its own tests and discusses the other three as failure boundaries or extensions.

For side effects, split read-only and write tools and require a distinct approval or deterministic policy gate. Bind the initial allowlist before untrusted data enters the planning model. Record denied-tool and escalation events. Delimiters, prompt repetition, and a detector may be defense-in-depth candidates, but this source does not establish them as adoption gates or as defenses against adaptive attacks.

## Concrete paired local evaluation artifact

Use the following artifact as a local test specification. It compares the same agent and initial state with and without the pre-untrusted-data bound. It is deliberately split so a positive result in the demonstrated class cannot be transferred to known failure classes.

```yaml
name: permission-bound-tool-agent-paired-eval-v1
unit: task × injection-goal × injection-variant
shared:
  agent: <pinned model, snapshot, system prompt, tool schemas>
  initial_state: identical-per-pair
  user_success_check: deterministic
  attacker_goal_check: deterministic
  repeats: <declare count or deterministic setting>
  intervals: 95% proportion intervals, method recorded
arms:
  A_full_tools:
    tools: normal full tool set
  B_predata_allowlist:
    allowlist_timing: before any untrusted tool output reaches planner
    tools: minimal task-specific legitimate capability set
    outside_allowlist: abort_or_escalate
attacks:
  phrasing: [TODO, ignore-previous-instructions, InjecAgent, important-message]
  placement: [early, middle, end-of-tool-output]
  selection: per-case maximum ASR across allowed variants
strata:
  demonstrated_class:
    inclusion: plan and minimal capability set known before untrusted read
  nontransfer_dynamic_plan:
    inclusion: untrusted result determines legitimate next tool
  nontransfer_capability_overlap:
    inclusion: granted user tool can execute attacker goal
  nontransfer_persistent_context:
    inclusion: tasks share retained context
  nontransfer_content_integrity:
    inclusion: malicious outcome is recommendation/content selection without extra tool
report:
  by: [task, injection_goal, tool_class, capability_overlap, stratum]
  metrics:
    - benign_utility
    - utility_under_attack
    - targeted_ASR
    - per_case_max_ASR
    - tool_denial_rate
    - escalation_rate
  comparisons:
    - A_full_tools_vs_B_predata_allowlist within identical task-state-attack pairs
    - adaptive attacks against each deployed defense
acceptance_for_demonstrated_class:
  - B preserves benign utility relative to A within predeclared deployment tolerance
  - B reduces targeted ASR relative to A
  - no safety claim is made for nontransfer strata from this result
```

The planning-scale cost cited by the paper is about US$35 for 629 GPT-4o security cases and US$4 for 97 benign cases. It is historical, benchmark-specific cost evidence, not a forecast for this local design, model, attack suite, or runtime.

## Limitations and research boundary

- **Synthetic transfer limit.** The benchmark uses manually inspected dummy data in simulated environments, not a production tool graph, real identities/data, or a live attacker.
- **Attack limit.** Reported defenses face fixed generic attacks, while the source itself requires thorough adaptive evaluation.
- **Coverage limit.** The benchmark is text-only and its stated extensions include multimodal inputs, injection length/format constraints, and harder tasks that cannot use advance tool selection.
- **Reproducibility detail limit.** Model snapshots, temperatures, repeated-run counts, and exact provider-evaluation date are absent from the readable source.
- **Internal reporting limit.** Tool count is inconsistent: §3.1 prose and Table 1 rows total 74, while the Table 1 caption and data card say 70. The 629 security-case total remains reconstructible from task cross-products.

Investigation ended at the fixed-evidence boundary. No web retrieval, code inspection, external study, audit, later version, or production evidence was used.

## Source appendix

| Retained source | Type and date | Evidence form | Supports | Important limitation |
|---|---|---|---|---|
| [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents, arXiv v3](https://arxiv.org/html/2406.13352v3) | Primary paper, v3, frozen 2026-09-07 | Environment design, deterministic metrics, baseline/attack/defense tables, limitations, data card | 97 user tasks, 27 injection tasks, 629 security cases, model and defense outcomes, tool-isolation boundary, reported costs | Synthetic single-task text setting, generic attacks rather than defense-adaptive attacks, unresolved internal inconsistencies and missing run configuration detail |

Local evidence context: [supplied AgentDojo v3 extraction note](../tool-security-2-Y/streams/s1.md) and [frozen source snapshot](../../../corpus/T3/sources/agentdojo-2406.13352v3.md). These are local copies/context, not independent evidence origins.
