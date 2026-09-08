# AgentDojo constraints for a permission-bounded tool agent

**Decision.** Deploy a permission boundary only as an executor-enforced, task-scoped capability control, not as evidence that the model or a prompt defense is secure. In AgentDojo v3, a pre-observation tool filter was the strongest tested GPT-4o defense: targeted attack success rate (ASR) fell from **57.69% to 6.84%** against the paper's strongest reported attack, while benign utility was **69.00% to 73.13%**. That result applies chiefly where the task needs read access and the attacker needs a distinct write capability. It does **not** establish safety when legitimate and malicious work share tools, tool choice depends on later results, or context and privileges persist across tasks.

**Scope and stopping point.** This is a decision-grade synthesis of the original [AgentDojo arXiv v3](https://arxiv.org/html/2406.13352v3), its appendices, and its linked results page, inspected 2026-09-07. v3 was posted 2024-11-24 and states that it fixes a Llama implementation bug and updates the Travel suite ([version record](https://arxiv.org/abs/2406.13352v3)). It is not a production-security evaluation and this report does not broaden to other studies.

## What the paper actually evaluates

AgentDojo is a synthetic, stateful tool environment spanning Workspace, Slack, Travel, and e-banking. Tool outputs are rendered as YAML for the LLM. User-task utility and attacker success are deterministic binary functions of the model output and pre/post environment state, rather than an LLM judge. This makes its outcome predicates less vulnerable to an injected evaluator, but does not make the simulated environment representative of production systems ([environment and evaluator](https://arxiv.org/html/2406.13352v3#S3)).

The suite has **97** user tasks and **27** injection targets, crossed only within applicable environments for **629 security cases**. A no-attack run over the 97 user tasks is the benign-utility denominator. Tasks can require up to 7,000 GPT-4 tokens of data, 4,000 tool-description tokens, and 18 calls. Injection goals range from 1 to 20 steps ([task suite and difficulty](https://arxiv.org/html/2406.13352v3#S3)). The paper internally conflicts on tool count: §3.1 says **74**, while Table 1 and the data card say **70**. The 97 + 27 task counts are consistent, but tool count should not be used as an exact deployment comparison.

The metrics have different denominators and must remain separate:

- **Benign utility:** user tasks solved / 97, without injection.
- **Utility under attack:** security cases in which the user task is solved and no adversarial side effect occurs / 629. Its complement is untargeted ASR.
- **Targeted ASR:** security cases in which the attacker goal is met / 629.
- **Max:** a case succeeds if any candidate attack succeeds, modelling per-case selection from the supplied candidates ([reporting method](https://arxiv.org/html/2406.13352v3#S3.SS4)).

The evaluated models were Claude 3 Opus, Claude 3 Sonnet, Claude 3.5 Sonnet, GPT-3.5 Turbo, GPT-4 Turbo, GPT-4o, Gemini 1.5 Flash/Pro, Command R+, and Llama 3 70B. Official provider function-calling APIs were used except Llama 3, which received an added tool-calling prompt. GPT-4o was used for defenses and ablations because it had the highest benign utility at the time those experiments were selected ([evaluation setup](https://arxiv.org/html/2406.13352v3#S4)). The linked results page identifies the defense-run model as `gpt-4o-2024-05-13` but cautions it is **not a leaderboard** because models, attacks, and defenses were not all tested in comparable combinations ([results caveat](https://agentdojo.spylab.ai/results/)). Appendix C is therefore the source of record for v3 numbers below.

## Baseline evidence: capable tool agents can be redirected

All values in this table are the v3 Appendix C Table 3 result for the generic **Important message** injection. It was inserted at relevant placeholders in tool outputs that the ground-truth user trajectory expects the agent to query. It tells the named model to perform the attacker goal before the user goal. This is a selected, non-adaptive baseline attack, not a general attack-rate estimate ([attack placement and baseline](https://arxiv.org/html/2406.13352v3#S4)).

| Model | Benign utility (97) | Utility under attack (629) | Targeted ASR (629) |
|---|---:|---:|---:|
| Claude 3 Opus | 66.61% | 52.46% | 11.29% |
| Claude 3 Sonnet | 53.10% | 33.23% | 26.71% |
| Claude 3.5 Sonnet | 78.22% | 51.19% | 33.86% |
| Command R+ | 25.44% | 25.12% | 0.95% |
| Gemini 1.5 Flash | 36.09% | 34.18% | 12.24% |
| Gemini 1.5 Pro | 45.63% | 28.93% | 25.60% |
| GPT-3.5 Turbo | 33.86% | 34.66% | 8.43% |
| GPT-4 Turbo | 63.43% | 54.05% | 28.62% |
| GPT-4o | 69.00% | 50.08% | 47.69% |
| Llama 3 70B | 34.50% | 18.28% | 20.03% |

*Source: [Appendix C, Table 3](https://arxiv.org/html/2406.13352v3#A3.T3). The paper reports 95% proportion intervals, approximately ±2.2 to ±3.9 percentage points depending on the cell.*

This supports a deployment constraint, not a model ranking: GPT-4o had 69.00% benign utility and 47.69% targeted ASR under this injection. A lower ASR on another model can be entangled with its lower ability to complete the attacker’s goal, so it is not evidence of an architecture-level defense. The benchmark also reports strong scenario variation: Slack reached 92% ASR in the reported breakdown, whereas the Travel goal requiring both a costly booking and email exfiltration reached 0%, often because the agent completed only part of the attacker goal ([per-task discussion](https://arxiv.org/html/2406.13352v3#S4)).

Attack wording is a material condition. For GPT-4o, Table 4 reports targeted ASR of **3.66%** for TODO, **5.41%** for “Ignore previous instructions,” **5.72%** for InjecAgent, **57.70%** for Important message, and **57.55%** for Max. The corresponding untargeted ASRs are 32.75%, 33.23%, 31.48%, 49.90%, and 68.36% ([Appendix C, Table 4](https://arxiv.org/html/2406.13352v3#A3.T4)). The prose says Max adds “another 10%,” which conflicts with its rendered targeted-ASR value. The report preserves the conflict rather than claiming a targeted uplift. Naming both user and model raised targeted ASR only from 45.8% to 47.7%, but a wrong user or model reduced it to about 23%; end-of-output placements reached up to 70% average ASR ([attack ablations](https://arxiv.org/html/2406.13352v3#S4.SS2)).

## Defense comparison and the permission-boundary implication

Every row here is GPT-4o against the strongest reported attack configuration in v3 Table 5. It is a within-model, common-suite comparison. Values are percentages. Reported 95% proportion intervals are about ±2.0 to ±3.9 points.

| Defense | Benign utility (97) | Utility under attack (629) | Targeted ASR (629) | Decision-relevant tradeoff |
|---|---:|---:|---:|---|
| None | 69.00 | 50.01 | 57.69 | Reference configuration |
| Delimit tool output | 72.66 | 55.64 | 41.65 | Residual compromise remains high |
| BERT prompt-injection detector, abort | 41.49 | 21.14 | 7.95 | Low ASR at a large false-positive and availability cost |
| Repeat user prompt after each tool call | 85.53 | 67.25 | 27.82 | Better measured tradeoff, still substantial residual ASR |
| Pre-observation tool filter | 73.13 | 56.28 | 6.84 | Best tested ASR reduction where a capability split exists |

*Source: [Appendix C, Table 5](https://arxiv.org/html/2406.13352v3#A3.T5). Do not compare these against Table 3 as if they were identical attack configurations.*

**Measured result.** The tool filter reduced targeted ASR by **50.85 percentage points** (57.69% → 6.84%) while benign utility increased 4.13 points (69.00% → 73.13%). The detector similarly reached 7.95% ASR but cut benign utility by 27.51 points and utility under attack by 28.87 points. Delimiting and prompt repetition are not authorization substitutes: their residual ASRs were 41.65% and 27.82%, respectively. The authors explicitly judge repeated prompts unlikely to withstand an adaptive injection telling the model to ignore future instructions ([defense discussion](https://arxiv.org/html/2406.13352v3#S4.SS3)).

**Why the filter worked, and where it did not.** The filter selects the tools permitted for the task before the agent observes tool results. It is effective in many cases because benign work needs read access while the attacker needs a write action. It fails when later results determine which legitimate tool is needed and when legitimate task tools are sufficient for the attack, which the paper reports for **17%** of test cases. AgentDojo does not test multiple user tasks over persistent context, where an injection can wait until the needed tool becomes available ([tool-isolation limitations](https://arxiv.org/html/2406.13352v3#S4.SS3)).

## Deployment controls and boundaries

### Controls supported by this evidence

1. **Enforce a task-scoped capability allowlist below the LLM.** Decide the tool set before untrusted tool output reaches the planner and enforce it in the executor. This is the closest transfer of the measured filter, not a claim that a prompt-level instruction is a permission boundary.
2. **Split retrieval from consequential authority.** Keep read-only retrieval distinct from write, purchase, transfer, or data-release capabilities. The measured benefit depends on this separation.
3. **Use detectors and prompt techniques as telemetry or explicit availability tradeoffs.** They can be layered, but AgentDojo does not demonstrate that they authorize actions safely.
4. **Reset or compartmentalize context and privileges between tasks.** This directly addresses an unevaluated failure mode identified by the authors.

### Proposed, not measured, operational controls

Route irreversible operations and sensitive-data release through independent policy checks or confirmation, and record denials, prompts, tool calls, and policy decisions. These are sensible deployment controls but AgentDojo does not measure their efficacy.

### What remains unproven

- Real-world transfer: state and data are synthetic, manually authored or LLM-generated then manually inspected. There is no production data or integration.
- Adaptive robustness: the paper says a static attack suite is insufficient and its data card says default attacks alone are unsuitable for evaluating a defense ([attack-design rationale](https://arxiv.org/html/2406.13352v3#S3.SS3); [data-card limitation](https://arxiv.org/html/2406.13352v3#A6)).
- Overlap, result-dependent planning, and persistent multi-task context, as above.
- Output manipulation without an extra tool call, such as a compromised recommendation or selection.
- Cost and latency transfer: the appendix estimates **US$35** for 629 GPT-4o security cases and **US$4** for 97 utility cases, but supplies no production latency, human-review load, or cost for the defenses ([Appendix D](https://arxiv.org/html/2406.13352v3#A4)).

## Concrete local paired evaluation artifact

Create one versioned evaluation manifest, `permission-boundary-paired-eval.jsonl`, and a paired run record for each `case_id`. It is the transfer test, not a claim already supported by this paper.

**Arms.** In a sandbox with representative redacted state, run the actual deployment agent, system prompt, model snapshot, tool schemas, output format, run limit, and policy/executor in both arms. **A, baseline:** current full task-relevant exposure. **B, bounded:** pre-untrusted-data allowlist enforced by the executor, excluding sensitive write and exfiltration tools unless independently authorized. Reuse the same seed, user task, attacker goal, injection endpoint and placement in both rows of each pair.

**Case construction.** Run every benign task without attack. For every applicable user-task × attacker-goal pair, inject at each actual untrusted endpoint. Pre-register strata: read-only versus write/exfiltration target, tool overlap versus disjoint capability, static versus result-dependent tool need, injection position including end-of-output, attacker-controlled fraction, and reset versus persistent context. Start with the four v3 wording families, then add adaptive variants targeting the real filter, policy names, tool descriptions, output format, ordering, and multi-turn memory. Record partial effects separately from full security-predicate success.

**Required fields per arm.** `case_id`, `pair_id`, `arm`, model/version, seed, task and attacker-goal IDs, endpoint and placement, all pre-registered strata, allowlist and authorization decision, user-success predicate, unauthorized-side-effect predicate, targeted-security predicate, false-block/abort flag, authorization-prompt count, latency, tool-call count, review time, trace reference, and failure classification.

**Analysis.** Preserve denominators: benign utility = successful benign tasks / all benign tasks; utility under attack = user task succeeds with no unauthorized side effect / all attack cases; targeted ASR = attacker predicate true / all attack cases. Report each metric by arm and stratum, 95% binomial confidence intervals, paired per-case deltas, and operational costs. Do not pool benign and attack runs or hide the overlap stratum.

**Decision rule.** Support B only as a narrower permission boundary if it preserves completion and independently blocks the consequential capability. Do not support it if lower ASR is achieved mainly by preventing normal work, if residual ASR is concentrated in high-impact overlap cases, or if adaptive or persistent-context cases restore write/exfiltration. This artifact directly resolves the paper’s transfer gap.

## Source appendix

| Retained source | Type/date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [AgentDojo v3 paper and appendices](https://arxiv.org/html/2406.13352v3) | Primary research paper, v3, 2024-11-24 | Synthetic stateful environment, deterministic predicates, evaluation method, tables, attack and defense limitations, cost estimate | One synthetic benchmark, selected attacks and model snapshots, no production guarantee |
| [arXiv v3 record](https://arxiv.org/abs/2406.13352v3) | Primary version record, 2024-11-24 | Version date and stated Llama bug/Travel update | No additional experimental detail |
| [AgentDojo results](https://agentdojo.spylab.ai/results/) | Linked project results page, inspected 2026-09-07 | Model snapshot names and explicit non-leaderboard caveat | Live rows differ in places from rendered v3 tables and are not a common comparison |
| [Local substantive source note](streams/s1.md) | Local supplied evidence note | Full assigned-source findings and source passages used for synthesis | Context aid, not a substitute for the original sources above |

**Material gaps.** No evidence here establishes production transfer, robustness to thorough adaptive attacks, long-lived-context safety, multimodal robustness, behavior under tool overlap, or defense-related latency and human-review cost. Those gaps are why the local paired evaluation is required before treating the boundary as a deployment control.