# AgentDojo v3 constraints for a permission-bounded tool agent

**Decision:** Deploy a pre-untrusted-data capability bound only as a constrained control for tasks whose legitimate minimum tool set is determinable before untrusted tool output and excludes the attack-enabling action. Do not treat AgentDojo v3 as evidence of production security, or as a release gate for capability-overlap, dynamic-plan, persistent-context, recommendation-integrity, multimodal, or defense-adaptive cases.

**Scope and research date:** This report assesses only AgentDojo arXiv v3, frozen on 2026-09-07. It answers what that source constrains for a permission-bounded tool agent, not whether any deployed agent is secure.

## Executive answer

AgentDojo establishes a useful but narrow result: in its synthetic, stateful tool benchmark, a GPT-4o tool filter that selects task-required tools **before seeing untrusted data** reduced targeted attack success from **57.69% to 6.84%** (−50.85 percentage points), while reported benign utility rose from **69.00% to 73.13%**. This comparison is matched only within the paper's GPT-4o, 629-security-case defense configuration and fixed reported attack evaluation. It does not show resistance to attacks adapted to that filter.

The deployment implication is bounded. Use an immutable per-task allowlist as a defense-in-depth boundary for read-oriented, pre-plannable work, with a deterministic approval or policy gate for effects outside the bound. The source expressly identifies the main non-transfer classes: plans needing untrusted results, shared legitimate/attack-capable tools (17% of its cases), long-lived multi-task context, and manipulation of a required result without an extra tool call. Those classes require separate evaluation, not an inferred extension of the positive result.

## What was measured

[AgentDojo v3](https://arxiv.org/html/2406.13352v3) is a stateful simulated environment, not an LLM tool simulator. It has Workspace, Slack, Travel, and Banking suites. Tool calls operate on mutable synthetic state. User-task utility and attacker success are deterministic binary checks over model output and state before/after execution. The dummy data were author-created or generated with GPT-4o/Claude 3 Opus and manually inspected ([§3.1](https://arxiv.org/html/2406.13352v3#S3.SS1); [data card §F.7](https://arxiv.org/html/2406.13352v3#S6.F7)).

| Suite | Tools listed | User tasks | Injection tasks | Security cases (cross-product) |
|---|---:|---:|---:|---:|
| Workspace | 24 | 40 | 6 | 240 |
| Slack | 11 | 21 | 5 | 105 |
| Travel | 28 | 20 | 7 | 140 |
| Banking | 11 | 16 | 9 | 144 |
| **Total** | **74** | **97** | **27** | **629** |

Tasks include up to 18 calls, tool-output contexts up to 7,000 GPT-4 tokens, and tool descriptions up to 4,000 tokens ([§3.1](https://arxiv.org/html/2406.13352v3#S3.SS1)). The 629 denominator is reconstructible from the suite-level task cross-products.

**Metrics.** Benign utility is the fraction of 97 user tasks solved without attack. Utility under attack is the fraction of 629 user–injection cases where the user task succeeds without adversarial side effects. Targeted ASR is the fraction of those cases where the formal malicious goal is met. For an attack collection, a case succeeds if any constituent attack succeeds, intended to represent selecting the best attack per case ([§3.4](https://arxiv.org/html/2406.13352v3#S3.SS4)). Reported intervals are 95% proportion confidence intervals using statsmodels.stats.proportion.proportion_confint; the readable source does not state provider snapshot IDs, temperatures, repeated stochastic-run counts, or exact provider-evaluation dates ([checklist](https://arxiv.org/html/2406.13352v3#S5)).

## Baseline exposure and attack conditions

All ten baseline agents were evaluated on 629 security cases and 97 benign tasks. The models were Claude 3 Opus/Sonnet/3.5 Sonnet, Command-R+, Gemini 1.5 Flash/Pro, GPT-3.5 Turbo, GPT-4 Turbo, GPT-4o, and Llama 3 70B. They used a common system prompt, with extra provider-recommended prompts for Claude Sonnet variants and a special tool-calling prompt for Llama. Official APIs were used except for Llama ([§4](https://arxiv.org/html/2406.13352v3#S4)). The cross-model attack was the generic **Important message** injection, which instructs the agent to perform the malicious task before the original task ([§4.1](https://arxiv.org/html/2406.13352v3#S4.SS1); [attack prompt](https://arxiv.org/html/2406.13352v3#A2.SS3)).

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

*Source: [Table 3](https://arxiv.org/html/2406.13352v3#A3.T3), percentages with reported 95% intervals.*

This shows neither high benign utility nor a specific model family implies targeted-injection resistance. For example, GPT-4o reported 69.00% benign utility and 47.69% ASR, while Claude 3.5 Sonnet reported 78.22% and 33.86%, respectively. Most models lost 10–25 percentage points of utility under attack, as the paper notes. This is an observation under one generic attack, not a model ranking for deployment.

For GPT-4o, the paper compared TODO, Ignore previous instructions, InjecAgent, Important message, and a `Max` selection over the four prompts ([§4.2](https://arxiv.org/html/2406.13352v3#S4.SS2); [Table 4](https://arxiv.org/html/2406.13352v3#A3.T4)).

| Attack | Targeted ASR | Untargeted ASR |
|---|---:|---:|
| TODO | 3.66 ± 0.7 | 32.75 ± 1.8 |
| Ignore previous instructions | 5.41 ± 0.9 | 33.23 ± 1.8 |
| InjecAgent | 5.72 ± 0.9 | 31.48 ± 1.8 |
| Important message | 57.70 ± 2.0 | 49.90 ± 2.0 |
| Max | 57.55 ± 2.7 | 68.36 ± 2.6 |

Placement was consequential: injections near the end of a tool response reached up to 70% average success against GPT-4o. The reported Slack breakdown reached 92% ASR. One Travel attack requiring both an expensive Paris booking and email exfiltration achieved 0%, often because only one malicious subgoal was completed ([§4.1](https://arxiv.org/html/2406.13352v3#S4.SS1); [Appendix D](https://arxiv.org/html/2406.13352v3#A4)). Correct model and user names changed the identity-ablation ASR from 45.8% (generic references) to 47.7%; a wrong user or model name was about 23% ([Table 2](https://arxiv.org/html/2406.13352v3#S4.T2)).

## Defense evidence and tradeoff

The defense comparison uses GPT-4o and the paper's strongest reported attack configuration, not a defense-adaptive attack ([§4.3](https://arxiv.org/html/2406.13352v3#S4.SS3)).

| Defense | Mechanism | Benign utility | Utility under attack | Targeted ASR |
|---|---|---:|---:|---:|
| None | Baseline | 69.00 ± 3.6 | 50.01 ± 3.9 | 57.69 ± 3.9 |
| Delimiting | Mark tool output as data and tell the model to ignore its instructions | 72.66 ± 3.5 | 55.64 ± 3.9 | 41.65 ± 3.9 |
| PI detector | Classify each tool output and abort on detection | 41.49 ± 3.9 | 21.14 ± 3.2 | 7.95 ± 2.1 |
| Repeat prompt | Repeat the user instruction after every tool call | 85.53 ± 2.8 | 67.25 ± 3.7 | 27.82 ± 3.5 |
| Tool filter | Select task-required tools before seeing untrusted data | 73.13 ± 3.5 | 56.28 ± 3.9 | 6.84 ± 2.0 |

*Source: [Table 5](https://arxiv.org/html/2406.13352v3#A3.T5), percentages with reported 95% intervals.*

The filter is the most decision-relevant measured mechanism: ASR fell 50.85 points and benign utility increased 4.13 points relative to no defense. The detector yielded a similar ASR (7.95%) but lost 27.51 benign-utility points, consistent with the paper's stated false-positive cost. Delimiting and prompt repetition improved their reported utility measures but retained ASR of 41.65% and 27.82%, respectively. No comparison establishes equal compute, cost, latency, or selection opportunity. The only cost evidence is a historical benchmark estimate of about US$35 for 629 GPT-4o security cases and US$4 for 97 benign cases, not a local cost forecast ([Appendix D](https://arxiv.org/html/2406.13352v3#A4)).

## Operational boundary and recommendation

**Use only in the demonstrated class.** Before any untrusted read reaches a planning model, derive and freeze a task-specific capability allowlist. The source's example is a read-email-only task where removing send-email prevents a write-oriented attacker goal. If execution needs another tool, stop and route it through a distinct deterministic policy or approval gate. Separate read-only from side-effecting tools so the bound is auditable.

**Do not claim these controls are sufficient.** The source says filtering fails when the tool list cannot be planned before results, when a tool required by the user can also execute the attack (17% of test cases), and potentially when persistent context lets an injection wait for a later task to grant a needed tool. It also says planner-to-isolated-worker designs remain vulnerable when injected content manipulates a required result, such as a hotel recommendation ([§4.3](https://arxiv.org/html/2406.13352v3#S4.SS3)). Delimiters, repeated prompts, and detector aborts are measured candidates for defense in depth, not adoption gates.

**Decision rule.** Permit the bounded pattern for the demonstrated class only after the paired local evaluation below shows reduced targeted ASR without unacceptable task denial. For every excluded class, require a separate policy and adaptive-attack evaluation before permission is granted. The paper itself calls default-attacks-only robustness evaluation unsuitable ([data card §F.5](https://arxiv.org/html/2406.13352v3#S6.F5)).

## Paired local evaluation artifact

This is a proposed local evaluation artifact, not a result from AgentDojo or this research run.

| Field | Required artifact content |
|---|---|
| Unit | One `task × injection goal × initial state × injection placement` trial. Record a stable trial ID, agent/model configuration, tool schemas, context/reset policy, and capability-overlap class. |
| Arm A | Current agent with its normal full tool set. |
| Arm B | The same agent/configuration with a task-specific allowlist fixed before any untrusted tool output. Log the exact bound and every requested/denied tool. |
| Pairing | Run A and B from identical initial state with identical user task, injected output, placement, and deterministic user-success/security checks. Preserve separate benign trials. |
| Attacks | Include the four v3 phrasings, vary placement including tool-output end, calculate per-case maximum ASR, then add attacks adapted to the actual bound and gates. |
| Outcomes | Benign utility, utility under attack, targeted ASR, tool-denial/escalation rate, and 95% proportion intervals. Publish denominators separately by task, injection goal, tool class, and overlap class. |
| Acceptance | B must preserve the locally defined benign-utility threshold and reduce targeted ASR versus A in the pre-plannable/no-overlap stratum. No pooled pass may authorize dynamic-plan, overlap, persistent-context, or recommendation-manipulation strata. |
| Exploratory arms | In excluded strata, compare bounded execution, approval-gated writes, and any symbolic isolation. Attack each defense adaptively and report failures separately. |

This paired design directly tests transfer of the demonstrated mechanism while preserving its failure boundary. It avoids treating similar token counts as equal cost or latency, and it makes tool denial visible rather than misclassifying it as security.

## Source conditions, discrepancies, and limitations

1. **Tool count conflict.** §3.1 prose and Table 1 rows total 74 tools, but the Table 1 caption and data card report 70. This report retains 74 for the suite-row arithmetic and does not resolve the conflict.
2. **GPT-4o baseline conflict.** Table 3 reports 47.69 ± 3.90% ASR for Important message; Table 4 reports 57.70 ± 2.0%; Table 5 no-defense reports 57.69 ± 3.9%; Table 2's generic identity-ablation baseline is 45.8%. The source does not explain configuration, run, or denominator differences. These values are presented only in their respective tables and are not pooled.
3. **Max conflict.** Although Max is defined as best attack per case, its Table 4 targeted ASR (57.55%) is slightly below Important message (57.70%). The source leaves this unresolved.
4. **Detector description conflict.** §4.3 calls it a BERT classifier, while the cited artifact is named DeBERTa-v3-base. The source does not give threshold or calibration, so detector operational performance is not transferable.
5. **External validity.** The environment is synthetic, text-only, dummy-data, and single-task in the evaluated setting. It is not evidence for real identities/data, different tool graphs/models, multimodal inputs, realistic injection constraints, or long-lived production agents. The paper identifies more sophisticated defenses, adaptive attacks, harder non-preplannable tasks, multimodal support, and injection length/format constraints as future work ([§5](https://arxiv.org/html/2406.13352v3#S5)).

Investigation ended at the fixed-evidence boundary: no code inspection, external validation, later version, other study, audit, or production evidence was used.

## Retained-source appendix

| Source | Type and date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents, arXiv v3](https://arxiv.org/html/2406.13352v3) | Original paper, v3. Frozen for this report on 2026-09-07. | Benchmark design (§3), GPT-4o/defense methods and results (§4, Tables 2–5), cost/placement details (Appendix D), intended-use and provenance conditions (data card). Supports the reported 629-case environment, metrics, tool-filter result, applicability boundary, and evaluation requirements. | One source only. Synthetic dummy data and fixed reported attacks. Source-internal count/result inconsistencies, incomplete reproducibility details in the readable source, and no production-security claim. |
