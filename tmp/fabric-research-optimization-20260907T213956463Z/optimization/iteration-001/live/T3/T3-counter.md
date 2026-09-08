# T3: Tool-Agent Evaluation, Reliability, and Security Boundaries

**Status:** Partial, researched 2026-09-08. This is fresh evidence limited to inspected primary sources. No inspected source establishes that a benchmark result proves production security.

## Requirement contract

| ID | Exact question and required inclusions | Contribution and decision context |
|---|---|---|
| R1 | “which primary evaluations or standards measure tool-agent reliability, task success, failure handling, and security-relevant behavior, with exact environment, agent/model, comparator, method and outcomes?” | Identify appropriate evidence for deployment qualification. |
| R2 | “what counterevidence, benchmark/evaluator limits, and transfer constraints prevent overclaiming safety or reliability?” | Bound conclusions and prevent benchmark-to-production overreach. |
| R3 | “what actionable evaluation and operational controls follow for deploying a tool-using agent?” | Produce deployment controls, concrete failure signals, a decision table, and a smallest resolving evaluation. |

## Findings

### Repeated-run reliability: measure consistency, not only one-run success

[τ-bench](https://arxiv.org/html/2406.12045) evaluates tool-using customer-service agents in stateful **retail** and **airline** environments with simulated users, domain-policy prompts, APIs, and final database-state comparison against an annotated goal state. Its `pass^k` is the probability that **all** \(k\) independent trials succeed, averaged across tasks. This is deliberately unlike `pass@k`, which measures whether *at least one* trial succeeds.  
**Locator:** §4 “Pass^k metric”; §5, Table 2 and Figure 4.

| Source-bound result | Environment and conditions | Comparator / outcome |
|---|---|---|
| `pass^1` is mean task reward. Main runs used **at least 3 trials per task**, **≤30 agent actions** per task, agent temperature **0.0**, simulated-user temperature **1.0**. | τ-retail and τ-airline, tool-calling agents, policy supplied as system prompt. | Enables repeated semantic variants of the same task, but three runs are insufficient to estimate high \(k\) reliability tightly. |
| GPT-4o function calling achieved **35.2% task success** on τ-airline. | Table 2, function-calling configuration. | The best reported model in that comparison remained far from reliable completion. |
| The paper reports GPT-4o retail `pass^1` above **60%** but `pass^8` below **25%**. | Figure 4, same underlying task with sampled conversational variation. | A strong average does not imply repeatable execution. |

**Operational implication:** use task-level repeated runs and report both `pass^1` and `pass^k` for the deployment-relevant \(k\). A one-of-\(k\) measure is appropriate for search or drafting, not for a transaction that must succeed every time.

### Recovery and fault evidence: promising but narrowly transferable

[CAX-Agent](https://arxiv.org/html/2605.15218) is a controlled, repeated-run recovery-policy experiment for MAPDL finite-element automation. It is a **preprint** and evaluates a specialized engineering harness, not general-purpose tool agents.  
**Locator:** Abstract; §III-B; §IV-A–B; §V “Limitations.”

| Source-bound result | Environment, model, method | Comparator / outcome |
|---|---|---|
| **50** standard structural benchmarks × **3** strategies × **3** repeated runs = **450 case-runs**. | MAPDL tasks involving beams, plates, and cylinders under static, modal, and thermal loads. Two blind human raters. | Compares `no_recovery`, deterministic `rule_only`, and bounded-retry error-log-conditioned `model_only`. |
| Rater agreement: quadratic weighted Cohen’s \(\kappa=0.84\); **96%** of score pairs were within **1 point**. | Blind scoring of all 450 runs. | Evaluation agreement, not production correctness. |
| `model_only`: completion **0.9267**, task score **3.59/4**, total **9.16/10**, zero-intervention rate **0.84**. | Claude Sonnet 4.6 and MAPDL under the stated harness. | Versus `rule_only`: **0.7733**, **3.17/4**, **7.03/10**, **0.00**. Versus one-shot: **0.6933**, **2.74/4**, **5.60/10**, **0.00**. Reported Cliff’s \(\delta=0.81–0.87\). |

**Fault/recovery inference:** an orchestrator-owned retry budget, checkpointed state, error classification, bounded regeneration, and human escalation can improve completion in this specific setup. It does **not** establish that retries are safe for irreversible tools, nor that recovery generalizes beyond simple MAPDL geometries, one solver backend, and one external model.

### Security-relevant behavior: evaluate utility and attack success jointly

[AgentDojo](https://arxiv.org/html/2406.13352) is a dynamic prompt-injection evaluation for tool agents processing untrusted tool output.  
**Locator:** Abstract; §3.1 “Task suites”; §3.4 “Reporting AgentDojo Results”; §4.3 and Appendix C, Tables 3 and 5.

| Source-bound result | Environment and validator | Outcome |
|---|---|---|
| **97** user tasks, **70** tools, **27** injection targets, and **629** security cases. | Stateful Workspace, Slack, Travel, and Banking environments. The suite uses deterministic utility and security functions over pre/post environment state. | It measures benign utility, utility under attack, and targeted attack-success rate (ASR). |
| Current models solved **<66%** of benign tasks. | Baseline agents in AgentDojo. | Benign task competence is materially incomplete before attacks are considered. |
| With GPT-4o, a prompt-injection detector achieved targeted ASR **7.95% ± 2.1 percentage points**, but benign utility only **41.49% ± 3.9 pp**. | Appendix C, Table 5. | Security mitigation incurred large utility loss. |
| With GPT-4o, tool filtering achieved targeted ASR **6.84% ± 2.0 pp**, benign utility **73.13% ± 3.5 pp**, and utility-under-attack **56.28% ± 3.9 pp**. | Appendix C, Table 5. | Better in this suite, but the authors state tool filtering fails when a legitimate task itself requires the sensitive write capability. |
| The paper states that all tested defenses lost **15–20% utility under attack**. | §4.3, Figure 9. | Do not represent a reduced ASR as a no-cost security control. |

[ToolEmu](https://arxiv.org/html/2309.15817) provides complementary fault and risk discovery using LM-emulated tools and an LM safety evaluator.  
**Locator:** Abstract; §4.2–4.3; §5, Table 5; §7 “Limitations & Future Directions.”

| Source-bound result | Method and conditions | Qualification |
|---|---|---|
| **36** high-stakes toolkits, **144** test cases, **9** risk types, and **18** toolkit categories. | Ambiguous or underspecified user-instruction threat model, LM-emulated tool environment. | Tests a subset of safety failures, not prompt injection or real system security comprehensively. |
| GPT-4 with a safety prompt had failure incidence **23.9%**; GPT-4 basic **39.4%**; Claude-2 basic **44.3%**. | Table 5, evaluator-estimated failure incidence. `NoAct` scored **0.00%** failure incidence but helpfulness **0.063** on a 0–3 scale. | Safety can be inflated by refusing to act. Measure utility and safety together. |
| Safety evaluator recall was **73.1%**, versus mean held-out-human recall **78.8%**. | Three-human-majority reference. | Automated evaluation misses risky actions. |
| Adversarial-emulator identified-failure precision was **68.8% ± 6.7 pp** and true-failure incidence **50.0% ± 5.1 pp**. | §4.3, Table 3. | The simulator and evaluator themselves create measurement error. |

## Counterevidence and transfer limits

1. **Simulation is not deployment.** τ-bench uses a simulated user and simplified retail/airline schemas. Its authors identify ambiguity, typos, and missing user domain knowledge as simulator limits. Its database-state reward can be necessary but not sufficient for policy-compliant success.

2. **A fixed attack suite is not security assurance.** AgentDojo explicitly says default attacks alone are unsuitable for robustness evaluation. Its authors require strong adaptive attacks because a defense can defeat fixed prompts while remaining non-robust.

3. **Evaluator error is material.** ToolEmu’s LM evaluator recovered only 73.1% of majority-human failures and reports emulator constraint omissions, especially in complex or adversarial scenarios. Its failure percentages are evaluator-mediated estimates, not observed production incident rates.

4. **Recovery may trade correctness for completion.** CAX-Agent’s model-driven recovery result is limited to simple geometry, MAPDL, one external model, three runs per strategy, and no common-benchmark comparison with other systems. It supports a testable hypothesis, not a general deployment default.

5. **Security and task completion conflict.** AgentDojo’s detector substantially reduced ASR but reduced benign utility to 41.49%. ToolEmu’s non-acting agent achieved perfect measured safety with nearly zero helpfulness. No safety score alone is deployable.

## Decision table

| Deployment class | Evidence needed before proceeding | Operational disposition |
|---|---|---|
| Read-only, reversible, low-impact tools | Representative benign repeated-run success, deterministic final-state validator, injection suite with no privileged write path. | Pilot with audit logs and rate limits. |
| Reversible writes | `pass^k` on representative tasks, attack ASR and utility-under-attack, fault/retry evidence, idempotency validation. | Permit only through scoped credentials, confirmation or policy gate, and rollback path. |
| Irreversible, financial, identity, external-communication, or production-admin writes | All above plus adversarial evaluation targeted to actual tool permissions, independent human review of consequential actions, demonstrated halt/escalation behavior. | Do not grant autonomous authority on the inspected evidence alone. |
| High-consequence safety or security controls | Real-environment or high-fidelity sandbox evidence, deterministic policy enforcement outside the model, red-team evidence, incident response rehearsal. | Human authorization remains required. |

## Actionable operational controls and acceptance measurements

These are operational recommendations inferred from the evidence, not claims that any benchmark proves security.

- **Final-state correctness:** fraction of representative tasks whose externally validated terminal state satisfies the business invariant. Report numerator, denominator, task version, and excluded runs.
- **Repeatability:** report `pass^1`, `pass^k`, \(k\), independent-run count, model snapshot, temperature, prompts, tools, retries, and validator. Choose \(k\) based on the number of independent executions the operation must survive.
- **Fault handling:** inject tool timeout, malformed output, stale state, denied permission, duplicate-call risk, and partial write. Measure safe-stop rate, successful recovery rate, duplicate side effects, rollback success, retries, escalation frequency, and time to safe terminal state.
- **Security:** measure benign utility, utility under attack, targeted ASR, and privileged side-effect rate separately. Test adaptive attacks against the deployed prompt, tool schema, memory, and least-privilege policy.
- **Safety boundaries:** put authorization, capability scope, idempotency keys, transaction limits, and audit logs outside the model. An LLM-generated retry must never repeat an irreversible action without an externally checked idempotency condition.
- **Failure signals:** any policy-denied call attempt, unvalidated state mutation, non-idempotent retry, validator disagreement, attack success, rollback failure, or loss of trace continuity triggers halt and human escalation.

## Smallest resolving evaluation

**Decision gap:** whether a specific tool agent may perform a bounded class of reversible writes without per-action human approval.

| Element | Evaluation design |
|---|---|
| Representative tasks | Select the smallest task set containing the actual tool schemas, state transitions, permissions, untrusted-content paths, and consequential write cases proposed for deployment. |
| Fixed variables | Hold model version, system prompt, tool definitions, credential scope, budgets, retry policy, sandbox snapshot, and validator constant across compared harnesses. |
| Arms | One-shot baseline versus proposed recovery harness. For each arm, evaluate no-fault, injected-fault, and adaptive prompt-injection conditions. |
| Repetitions | Run each task repeatedly with independent stochastic seeds or user variants. Report \(n\) and confidence intervals. Do not claim `pass^k` beyond what \(n\) can estimate. |
| Validators | Deterministic final-state and policy validators for task success, unauthorized side effects, duplicate operations, and rollback. Blind human review only for irreducibly subjective outcomes. |
| Acceptance measures | `pass^1`, deployment-chosen `pass^k`, safe-stop rate, recovery rate, unauthorized-side-effect rate, targeted ASR, utility-under-attack, duplicate-write rate, rollback success, p50/p95 latency, and total cost per accepted task. |
| Decision rule | Advance only if every consequential side effect is externally validated, no unauthorized side effect occurs in the evaluated threat cases, and recovery improves accepted-task completion without increasing duplicate or unauthorized effects. Otherwise restrict permissions or retain human approval. |

## Coverage and gaps

| Requirement | Status | Evidence and smallest next check |
|---|---|---|
| R1: evaluations/standards with environment, model, comparator, method, outcomes | **Supported, qualified** | τ-bench, CAX-Agent, AgentDojo, and ToolEmu provide inspected quantitative evaluation evidence. NIST AI RMF is a voluntary risk-management framework, not a measured agent-security standard. Next: inspect the target system’s own environment against these method fields. |
| R2: counterevidence, limits, transfer constraints | **Supported** | Source limitations include simulated users, non-adaptive attacks, evaluator error, narrow recovery domain, and utility-security trade-offs. |
| R3: actionable evaluation and controls | **Supported, qualified** | The decision table and resolving evaluation follow from the inspected evidence. Exact deployment thresholds are **unknown** because the task supplies no impact tolerance, loss budget, or acceptable incident threshold. |

## Retained-source appendix

| Source | Type/date | Evidence form and supported claim | Important limitation |
|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | ICLR 2025 paper, arXiv 2024 | Repeated tool-agent evaluation, `pass^k`, final database-state validation, ≤30 actions, ≥3 trials. | Simulated users and simplified domains. |
| [AgentDojo](https://arxiv.org/html/2406.13352) | Research paper, 2024 | Stateful deterministic utility/security evaluation of tool agents under prompt injection, 97 tasks and 629 security cases. | Default attacks are not sufficient. Defenses face utility trade-offs and must be adaptively attacked. |
| [ToolEmu](https://arxiv.org/html/2309.15817) | Research paper, 2023 | LM-emulated red-teaming and evaluator validation across 144 test cases. | LM simulator/evaluator has imperfect precision and recall. |
| [CAX-Agent](https://arxiv.org/html/2605.15218) | arXiv preprint, 2026 | Controlled 450-run comparison of three MAPDL recovery strategies. | Specialized domain, one solver/model, simple geometries, and three repetitions. |
| [NIST AI RMF landing page](https://www.nist.gov/itl/ai-risk-management-framework) | NIST primary documentation, updated 2026 | AI RMF is voluntary and intended to incorporate trustworthiness into design, development, use, and evaluation. | Framework guidance, not empirical proof of tool-agent reliability or security. |