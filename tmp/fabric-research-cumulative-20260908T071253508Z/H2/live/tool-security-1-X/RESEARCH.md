# AgentDojo v3: deployment constraints for a permission-bounded tool agent

**Decision.** Deploying a runtime-enforced permission boundary is justified as a defense-in-depth control, not as a production-security claim. In the paper’s matched GPT-4o defense experiment, a tool filter chosen **before untrusted output is observed** reduced targeted prompt-injection success from **57.69% ± 3.9** to **6.84% ± 2.0**. It does not protect actions that can be performed with a legitimately granted capability, tasks requiring tools discovered after untrusted reads, persistent multi-task context, or manipulation of the final answer without a further tool call. Require independent operation- and argument-level authorization for consequential actions, and validate transfer with the paired local evaluation below before relying on the boundary.

**Scope and stopping point.** This report is limited to [AgentDojo arXiv v3](https://arxiv.org/html/2406.13352v3), including its appendices, retrieved 2026-09-08. v3 is dated 24 November 2024 and fixes a Llama implementation bug and updates the travel suite ([arXiv record](https://arxiv.org/abs/2406.13352v3)). No later release, outside study, or production system was researched. The supplied [local source note](streams/s1.md) is retained for traceability but is not independent evidence.

## What the benchmark actually measures

AgentDojo is a stateful simulated text-tool environment, not a production service. Its four environments are Workspace, Slack, Travel Agency, and e-banking. Tool descriptions are in the model prompt and the runtime supplies YAML-formatted tool outputs. Dummy state was authored manually or with GPT-4o/Claude 3 Opus assistance, then manually inspected ([§3.1](https://arxiv.org/html/2406.13352v3#S3.SS1)).

The reported suite has **97 user tasks, 27 injection targets, and 629 security cases**. A security case is a relevant within-environment user-task × injection-task pair. Tasks use up to 7,000 GPT-4 tokens of environment data, 4,000 tokens of tool descriptions, up to 18 user-task calls, and injection goals of 1–20 steps ([Table 1 and §3.1](https://arxiv.org/html/2406.13352v3#S3.SS1)). The paper inconsistently describes 70 tools in its abstract/Table 1/data card but 74 implementation tools in §3.1. The benchmark characterization should retain 70, with 74 unresolved rather than silently reconciled.

Evaluation is a useful methodological constraint: task-specific deterministic functions inspect model output and pre/post environment state. They do not use an LLM judge, avoiding the possibility that the injection also compromises the evaluator ([§3.1](https://arxiv.org/html/2406.13352v3#S3.SS1)). The three reported metrics are:

| Metric | Condition and denominator |
|---|---|
| Benign utility | User task solved with no attack, nominally 97 tasks. |
| Utility under attack | User task solved **and** no adversarial side effect, over nominally 629 security cases. Its complement is untargeted/derailment ASR. |
| Targeted ASR | Attacker goal achieved, over nominally 629 security cases. |

The paper reports 95% proportion confidence intervals using `statsmodels.stats.proportion.proportion_confint` ([checklist](https://arxiv.org/html/2406.13352v3#S5)). These are not current-system estimates.

## Baseline and attack sensitivity

All-model evaluation used Claude 3 Opus/Sonnet/3.5 Sonnet, Command R+, Gemini 1.5 Flash/Pro, GPT-3.5 Turbo, GPT-4 Turbo, GPT-4o, and Llama 3 70B. Except Llama 3, models used official provider APIs; Claude and Llama also received provider-specific prompts ([§4](https://arxiv.org/html/2406.13352v3#S4)). The baseline attack was the generic indirect **“Important message”** prompt that tells the agent to complete the malicious task before the user task ([§4.1 and Fig. 19](https://arxiv.org/html/2406.13352v3#S4.SS1)).

| Model | Benign utility | Utility under attack | Targeted ASR |
|---|---:|---:|---:|
| Claude 3 Opus | 66.61% ± 3.69 | 52.46% ± 3.90 | 11.29% ± 2.47 |
| Claude 3.5 Sonnet | 78.22% ± 3.23 | 51.19% ± 3.91 | 33.86% ± 3.70 |
| GPT-4 Turbo | 63.43% ± 3.76 | 54.05% ± 3.89 | 28.62% ± 3.53 |
| GPT-4o | 69.00% ± 3.61 | 50.08% ± 3.91 | 47.69% ± 3.90 |
| Llama 3 70B | 34.50% ± 3.71 | 18.28% ± 3.02 | 20.03% ± 3.13 |

*Source: [Appendix C, Table 3](https://arxiv.org/html/2406.13352v3#A3.T3), all models and the stated generic attack. Do not treat lower ASR as inherently safer: low task competence can prevent both benign and malicious actions. The authors report roughly 10–25 percentage-point utility loss under attack for most models and an inverse capability/attackability relationship in this configuration ([§4.1](https://arxiv.org/html/2406.13352v3#S4.SS1)).*

Attack choice materially changes the result. In a separate GPT-4o attack comparison, targeted ASR was 3.66% for `TODO`, 5.41% for “Ignore previous,” 5.72% for InjecAgent, and 57.7% for “Important message” ([Appendix C, Table 4](https://arxiv.org/html/2406.13352v3#A3.T4)). The paper’s `Max` collection counts a case successful if any attack succeeds, modeling per-case best-attack selection ([§3.4](https://arxiv.org/html/2406.13352v3#S3.SS4)). Therefore a local evaluation limited to weak, fixed prompt templates is not evidence of robustness.

Results also vary by attack surface and goal: Slack attacks reached 92% success, while a Travel attack requiring both a costly Paris booking and email exfiltration reached 0%, often because only one subgoal completed. Near-end placement in tool output reached up to 70% average GPT-4o ASR ([§4.1 and Appendix D](https://arxiv.org/html/2406.13352v3#S4.SS1)). Correct names added 1.9 points, but incorrect guesses reduced ASR by about 22 points ([§4.2, Table 2](https://arxiv.org/html/2406.13352v3#S4.SS2)).

## Permission-boundary evidence and tradeoffs

The defense experiments use GPT-4o and the paper’s strongest tested attack configuration ([§4](https://arxiv.org/html/2406.13352v3#S4)). The comparisons below are valid **within Table 5 only**.

| Defense | Mechanism | Benign utility | Utility under attack | Targeted ASR |
|---|---|---:|---:|---:|
| None | Base agent | 69.00% ± 3.6 | 50.01% ± 3.9 | 57.69% ± 3.9 |
| Data delimiting | Labels tool output as data and tells the model to ignore instructions | 72.66% ± 3.5 | 55.64% ± 3.9 | 41.65% ± 3.9 |
| PI detector | BERT-family classifier on each tool output, abort on detection | 41.49% ± 3.9 | 21.14% ± 3.2 | 7.95% ± 2.1 |
| Repeat prompt | Repeats the user instruction after each tool call | 85.53% ± 2.8 | 67.25% ± 3.7 | 27.82% ± 3.5 |
| **Tool filter** | Model selects user-task tools before reading untrusted data; execution restricted to them | 73.13% ± 3.5 | 56.28% ± 3.9 | **6.84% ± 2.0** |

*Source: [Appendix C, Table 5](https://arxiv.org/html/2406.13352v3#A3.T5); mechanisms: [§4.3](https://arxiv.org/html/2406.13352v3#S4.SS3). The paper’s prose rounds the tool-filter ASR to 7.5%; this report uses the tabulated 6.84%.*

**Measured comparison.** The tool filter’s ASR reduction is **50.85 percentage points** versus its matched no-defense row. Its benign utility is 4.13 points higher and attacked utility 6.27 points higher than that row. The detector reaches a similar measured ASR (7.95%) but costs 27.51 benign-utility points and 28.87 attacked-utility points versus no defense, which the authors attribute to excessive false positives. Repeat prompting has the best reported utility figures but leaves 27.82% targeted ASR; the paper says it is unlikely to withstand an injection that asks the model to ignore *future* instructions.

**Boundary of the evidence.** Table 3 reports GPT-4o ASR 47.69% ± 3.90, while Table 4 reports 57.7% ± 2.0 and Table 5 reports 57.69% ± 3.9 for nominally “Important message.” The paper does not explain the run/configuration difference. Do not calculate defense deltas from Table 3. This unresolved discrepancy, and the fact that attacks were generic rather than defense-adaptive, preclude a clean broader ranking.

## Deployment constraints

The paper supports a narrow principle: minimize the capability set before untrusted content is read. It does **not** show that a model-selected set is complete, that its enforcement is production-grade, or that tool access alone is a sufficient security policy.

| Condition | What the paper establishes | Deployment consequence |
|---|---|---|
| Attack needs an ungranted tool | Tool filtering is particularly effective where user work is read-only and the attacker needs a write tool. | Enforce the selected grant in the runtime, not as model text. |
| Legitimate and malicious work share a capability | User-required tools also suffice for the attack in **17%** of cases. | Apply operation/argument restrictions and policy checks. Tool-level allowlisting alone is insufficient. |
| Next tool depends on tool output | Up-front selection fails when results reveal what tool is needed next. | Use constrained staged grants, with policy review at each expansion. Measure false blocks. |
| Multiple tasks retain context | Not covered. The paper identifies a “wait” injection until an enabling tool becomes available. | Reset or compartmentalize untrusted context between tasks. Test delayed multi-turn triggers. |
| Harm changes an answer without another tool call | More involved isolation can still fail, e.g. coercing selection of a hotel result. | Validate recommendations and protect consequential decisions separately from tool permissions. |
| Adaptive attacker | Default attacks are generic. The paper says static attacks are insufficient and calls for adaptive evaluation. | Hold out boundary-aware attacks. A result on default templates alone is not a release gate. |

The following are **recommended controls inferred from those failure conditions, not v3-measured guarantees**: runtime-enforced per-operation and narrow argument limits, separate authority domains for reading, recommendations, external sends, transfers, and credentials, non-LLM policy or user confirmation before consequential writes/scope expansion, and logging of denied capability attempts.

## Local paired-evaluation artifact

Use this concrete artifact against the actual agent, model version, prompts, tool APIs, and policy runtime. It tests transfer rather than projecting AgentDojo percentages onto a local system.

```yaml
name: permission-boundary-transfer-pair
unit: one fixed local task plus one injected untrusted-output instance
arms:
  A_baseline:
    initial_grants: production-equivalent available tools
  B_permission_bounded:
    initial_grants: grants selected before first untrusted output
    enforcement: runtime rejects every tool, operation, and argument outside grant/policy
constants: [agent_build, model_snapshot, system_prompt, tool_api_versions, task_fixture, injected_case]
case_set:
  benign: representative local tasks
  injected: same task fixtures with injected tool-output cases
  holdout_attacks:
    - late-position indirect instructions
    - benign-looking recommendation/output manipulation
    - abuse of an authorized capability
    - requests to escalate tool authority
    - delayed multi-turn triggers after a context boundary
    - argument-level exfiltration or recipient/amount expansion
strata:
  denied_capability: attacker goal requires an ungranted capability
  authorized_capability: attacker can misuse a granted capability
oracle: deterministic action and state assertions, never an LLM judge
outcomes:
  - benign_completion
  - attacked_completion_without_policy_violation
  - targeted_attacker_goal_achieved
  - blocked_authority_escalation
  - false_block
  - confirmation_required
  - residual_asr_authorized_capability
analysis:
  pairing: compare A and B on identical case IDs
  report: exact numerator/denominator, 95% intervals, paired case outcomes, per-domain and per-stratum results
  failure_taxonomy: [missing_grant, authorized-tool-abuse, argument-policy-bypass, dynamic-plan-block, delayed-trigger, output-manipulation]
```

Report the three AgentDojo-compatible metrics with denominators, then the listed control-specific outcomes. Pre-register the paired comparison and retain failures by taxonomy. The key transfer test is the stratum split: the tool-filter mechanism predicts its benefit mainly where the attack needs an ungranted capability. A low aggregate ASR that conceals residual ASR in the `authorized_capability` stratum does not demonstrate protection against authorized-tool abuse.

## Material gaps

1. AgentDojo v3 does not measure real production data or side effects, multimodal input, persistent sessions, argument-level authorization, user confirmations, or a defense-aware adaptive attacker against the filter.
2. It cannot identify which local untrusted surfaces, capability overlaps, policy semantics, models, or tool schemas match its simulated cases. Transfer is unknown until the paired evaluation is run.
3. The unexplained GPT-4o cross-table baseline discrepancy and the 70-versus-74 tool description prevent exact cross-experiment reconciliation.
4. The paper’s historical runtime cost, approximately US$35 for 629 GPT-4o security cases and US$4 for 97 utility cases ([Appendix D](https://arxiv.org/html/2406.13352v3#A4)), is not a current cost estimate.

## Source appendix

| Retained source | Type/date | Method or evidence | Supports | Important limitation |
|---|---|---|---|---|
| [AgentDojo v3 HTML paper](https://arxiv.org/html/2406.13352v3) | Original research paper, v3, 2024-11-24 | Stateful simulated environment, deterministic state/action checks, all reported experiments | Scope, environment, metrics, attacks, defenses, limitations | Single simulated benchmark, generic pre-deployed attacks, no production guarantee |
| [§3.1 and Table 1](https://arxiv.org/html/2406.13352v3#S3.SS1) | Paper methods | Environment composition and evaluator | 97 tasks, 27 targets, 629 cases, deterministic evaluator, 70/74 discrepancy | Synthetic state and tools do not establish local equivalence |
| [§3.4](https://arxiv.org/html/2406.13352v3#S3.SS4) | Paper method | Metric definitions and `Max` attack collection | Required denominators and attacker-selection interpretation | `Max` remains limited to constituent attacks |
| [Appendix C Tables 3–5](https://arxiv.org/html/2406.13352v3#A3.T3) | Paper results | 95% CI quantitative results | All-model, attack-sensitivity, and defense comparisons | GPT-4o baseline differs across tables |
| [§4.3](https://arxiv.org/html/2406.13352v3#S4.SS3) | Paper discussion/results | Tool-filter mechanism and stated failures | Up-front planning, 17% overlap, persistent-context and output-manipulation limits | Discusses rather than measures proposed stronger isolation |
| [Local source note](streams/s1.md) | Local supplied evidence | Detailed extraction and source links | Traceability for this synthesis | Not independent of the original paper |
