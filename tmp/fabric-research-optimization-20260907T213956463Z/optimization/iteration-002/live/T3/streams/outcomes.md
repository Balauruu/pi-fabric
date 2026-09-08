# Outcomes research note — T3

**Status:** partial, as of **2026-09-07**. Primary-source evidence supports final-state task evaluation, repeated-run reliability, injected-fault recovery, and prompt-injection utility trade-offs. It does **not** establish a universal deployment reliability or prove security. Sources are controlled benchmarks and a voluntary risk framework.

## Requirement contract

| ID | Exact question and required contribution | Decision context | Status |
|---|---|---|---|
| R1 | “which primary evaluations or standards measure tool-agent reliability, task success, failure handling, and security-relevant behavior, with exact environment, agent/model, comparator, method and outcomes?” Include original inspected sources and source-bound measurements. | Select a deployment evaluation approach. | Supported |
| R2 | “what counterevidence, benchmark/evaluator limits, and transfer constraints prevent overclaiming safety or reliability?” Include benchmark/version and transfer limits. | Prevent a benchmark score becoming a production-security claim. | Supported |
| R3 | “what actionable evaluation and operational controls follow for deploying a tool-using agent?” Include concrete failure signals, decision table, smallest resolving evaluation, and retained-source appendix. Do not present a generic checklist as evidence or claim an evaluation proves security. | Define a deployment gate and authorization boundary. | Qualified. Controls are bounded inferences from evaluations and NIST guidance, not experimentally universal. |

## Findings

### F1. Use end-state validators, not action-string or response plausibility, for stateful side effects

[τ-bench (Yao et al., ICLR 2025)](https://arxiv.org/html/2406.12045) evaluates tool-using customer-service agents in stateful Retail and Airline environments. The agent converses with an LM-simulated user, uses domain APIs, and follows policy. Its rule-based evaluator compares the **final database state** with an annotated goal state. This accepts multiple valid trajectories and is materially stronger than scoring a textual action sequence.

Its original function-calling comparison used at most **30 agent actions**, agent temperature **0.0**, user temperature **1.0**, and at least **three trials per task**. GPT-4o function calling achieved approximately **61% pass¹ on Retail** and **35.2% on Airline**. The source’s cost estimate for GPT-4o agent plus GPT-4 user simulation on Retail was **$0.38 + $0.23 per task per trial**, approximately **$200** for one full benchmark trial.  
**Locator:** §3 evaluation, §5.1 main results and cost analysis.

**Decision implication:** A deployment test should inspect persisted records, tool-side logs, and authorization outcomes. An agent’s fluent final answer is not acceptance evidence.

### F2. Mean success hides flakiness, so report repeated-run reliability

τ-bench defines **pass^k** as the fraction of tasks solved successfully in **all k independent trials**, unlike pass@k, which rewards one success among retries. For the same semantic task, user and agent sampling create variation while the intended database state remains fixed. The paper reports GPT-4o function calling above 60% average Retail success but **pass^8 below 25%**.  
**Locator:** [τ-bench §3.3 pass^k and §5.1 consistency analysis](https://arxiv.org/html/2406.12045).

This is complementary to F1: final-state grading establishes whether one run worked. Pass^k establishes whether the same configuration keeps working under ordinary stochastic variation.

**Decision implication:** Do not launch from pass¹ alone. For a high-consequence action class, define an accepted repeated-run threshold and retain the full pass^k curve, not merely a best-of-k result.

### F3. Fault recovery requires a distinct injected-failure evaluation

[ToolMaze (2026)](https://arxiv.org/html/2606.05806) explicitly separates normal task completion from recovery. It uses **270 manually constructed simulated tools**, **400 generated base tasks** across four DAG topological complexities, and expands clean plus four perturbation modes into **2,000 instances**. Perturbations cross explicit versus implicit and transient versus permanent faults. Its stateful simulated tool environment makes recovery paths enumerable.

It measures:

- **TSR:** task success rate.
- **PRR:** probability of recovering conditional on encountering a perturbation.
- **RC:** recovery cost relative to the theoretical minimum tool calls. RC = 1 is recovery failure.

Agents receive at most **25 steps**, temperature **1**, and a **16,000-token** output cap. The comparator is the same model with a standard tool prompt versus a failure-aware prompt. The evaluated set includes six open-weight models and proprietary GPT-5.5, Claude-Sonnet-4.6, and Gemini-3.1-Pro-Preview. Claude-Sonnet-4.6’s clean TSR was **77.00%**, yet performance fell under all perturbation modes. Across models, the PRR gap between explicit and implicit faults averaged **37.15 percentage points**: **53.75 pp** for transient and **20.54 pp** for permanent faults. The paper reports that PRR improved only **4.88 pp per model-size order of magnitude** versus **17.85 pp** for clean TSR, a 3.66× disparity.  
**Locator:** [§3.5 metrics, §4.1 setup, §4.2–4.3 results, limitations](https://arxiv.org/html/2606.05806).

**Decision implication:** Test retry, alternate-tool switching, verification after a plausibly valid but wrong response, and bounded escalation separately. A clean-task score cannot substitute for recovery evidence.

### F4. Security utility is a measurable trade-off, not a property inferred from benign success

[AgentDojo (Debenedetti et al., NeurIPS 2024)](https://arxiv.org/html/2406.13352v3) evaluates prompt injection in stateful tool environments. Its suite has **70 tools, 97 user tasks, 27 injection targets, and 629 security cases**. It has deterministic utility and security functions over environment state, rather than asking an LLM evaluator whether the behavior looked safe.

It evaluates official-API tool-calling agents for Gemini 1.5 Flash/Pro, Claude 3 Sonnet/Opus and 3.5 Sonnet, GPT-3.5 Turbo, GPT-4 Turbo, GPT-4o, Llama 3 70B, and Command R+. All agents ran the full 629-case suite. Results report 95% proportion confidence intervals.

For GPT-4o under the “Important message” injection, benign utility was **69.00% ±3.61**, utility under attack **50.08% ±3.91**, and targeted attacker success **47.69% ±3.90**. Claude 3.5 Sonnet had higher benign utility (**78.22% ±3.23**) and lower targeted ASR (**33.86% ±3.70**) under that setup. The paper finds that more capable models can be easier to attack, partly because weak models also fail at the attacker’s task.  
**Locator:** [§4 baseline agents and attacks; Appendix C Table 3](https://arxiv.org/html/2406.13352v3).

For GPT-4o, a pre-untrusted-data **tool filter** restricted the available tool set to tools selected as necessary for the user task. In the paper’s defense comparison, this changed:

| Configuration | Benign utility | Utility under attack | Targeted ASR |
|---|---:|---:|---:|
| No defense | 69.00% ±3.6 | 50.01% ±3.9 | 57.69% ±3.9 |
| Tool filter | 73.13% ±3.5 | 56.28% ±3.9 | 6.84% ±2.0 |

The same paper says the isolation mechanism is effective where a legitimate task only needs read access but the attack needs write access. It fails when tool needs cannot be planned before untrusted content, or when legitimate and malicious goals need overlapping tools. The full GPT-4o security suite was estimated at **US$35** and the utility suite **US$4**.  
**Locator:** [§4.3; Appendix C Table 5; Appendix D cost](https://arxiv.org/html/2406.13352v3).

**Decision implication:** Establish authorization at the tool gateway, before untrusted content can influence tool selection. Each tool should receive a narrow, task-scoped capability, with write, payment, external communication, credential, and data-export actions separately approved or blocked. Tool filtering reduces a measured attack path. It does not prove authorization is correct or cover same-permission attacks.

## Decision table

| Decision | Evidence-backed deployment rule | Failure signal | Escalation |
|---|---|---|---|
| Final-state success | Accept only deterministic state, artifact, and audit-log validation for side-effecting tasks. | Claimed completion but expected state, authorization record, or artifact invariant fails. | Roll back if possible, quarantine task state, human resolution. |
| Reliability | Report pass¹ and pass^k across fixed configuration and stochastic repetitions. | Large pass¹→pass^k drop or performance variance across reruns. | Restrict autonomy or require review for that task class. |
| Tool-fault recovery | Inject explicit/implicit, transient/permanent faults and measure conditional recovery plus excess tool calls. | Repeated same call, semantic output accepted without verification, no fallback, or step-budget exhaustion. | Stop after bounded retry/switch budget and escalate with diagnostic trace. |
| Authorization boundary | Bind each invocation to least-privilege, task-scoped capabilities selected before untrusted content. | Attempted capability expansion, write/export action outside grant, or untrusted content changing authorization scope. | Deny by default, require human authorization, preserve audit event. |
| Prompt injection | Measure both user-task utility and targeted/untargeted attack success under realistic untrusted tool output. | Any unauthorized side effect, even if the user task succeeds. | Treat as security failure, revoke capability and investigate the injection path. |

## Counterevidence and transfer limits

- **C1 — evaluator completeness:** τ-bench’s authors state final database reward can be necessary but not sufficient. For example, an agent may issue a return without explicit user confirmation yet reach the expected state. Thus final-state validation needs explicit authorization and policy invariants where those matter.
- **C2 — simulator transfer:** τ-bench uses an LM-simulated user. Its users, APIs, and policies are simplified customer-service domains, not evidence for browser, coding, financial, or production-identity workflows.
- **C3 — recovery transfer:** ToolMaze has exact recovery ground truth because it prioritizes procedurally generated DAGs. Its own limitations say this is not an open-ended web environment. Its 2026 paper also does not establish repetitions, confidence intervals, or monetary cost in the inspected methods. Treat the recovery result as strong controlled diagnostic evidence, not an estimate of production incident recovery.
- **C4 — security coverage:** AgentDojo evaluates defined prompt injections and deterministic simulated state. It does not prove resistance to adaptive attackers, compromised tools, confused-deputy authorization, supply-chain compromise, or attacks requiring the same allowed capability as the user’s task.
- **C5 — benchmark/version changes:** WebArena’s canonical repository records a dataset bug-fix release, [v0.2.0](https://github.com/web-arena-x/webarena/releases/tag/v0.2.0), and directs evaluators to self-host/reset the environment. Benchmark release, model snapshot, prompt/scaffold, tools, retry budget, evaluator, and cost accounting must travel with every result. Do not merge these benchmark percentages into a leaderboard.

## Smallest resolving evaluation

**Disputed deployment decision:** whether the proposed agent may autonomously execute a specified low-risk tool class, while all higher-impact capabilities remain reviewed.

1. Build representative tasks from that exact class and validate final state with deterministic service-side checks, including required authorization records.
2. Hold model snapshot, prompt/scaffold, tool schemas, permissions, context/action cap, and retry budget fixed. Compare baseline versus capability-gateway enforcement.
3. Run clean stochastic repetitions and report pass¹ plus pass^k.
4. Inject: explicit transient failure, implicit wrong-but-valid output, permanently blocked primary tool with a permitted fallback, and no viable path. Measure TSR, conditional recovery, recovery cost, repeated-call loops, and correct escalation.
5. Add untrusted tool content seeking an unauthorized write/export. Score user-task final state, unauthorized-side-effect rate, targeted attack success, and utility under attack separately.
6. Account for model, tool, retry, verification, and reviewer costs per accepted task. Keep unknown cost components unknown.
7. **Change rule:** permit autonomy only if every unauthorized action is denied, final-state and authorization invariants pass at the agreed repeated-run threshold, and injected no-path cases escalate within the bounded budget. Otherwise narrow privileges or retain human approval.

## Coverage and gaps

| Requirement | Coverage | Smallest next check | Stop reason |
|---|---|---|---|
| R1 — evaluations/standards with method and outcomes | Supported by τ-bench, ToolMaze, AgentDojo, and [NIST AI RMF / GenAI Profile overview](https://www.nist.gov/itl/ai-risk-management-framework). NIST is voluntary risk-management guidance, not a tool-agent security certification. | Run the resolving evaluation on the actual tool set and authorization service. | Complementary primary sources inspected. |
| R2 — counterevidence and transfer constraints | Supported by source-stated evaluator, simulator, topology, attack-coverage, and version limits. | Threat-model same-permission and compromised-tool cases. | No primary result found that validates universal transfer. |
| R3 — actionable controls | Qualified. Capability gating follows AgentDojo’s measured tool-filter trade-off. Final-state, repeated-run, recovery, and attack tests follow the respective evaluated constructs. | Define task-specific acceptance thresholds and rollback semantics with the decision owner. | Thresholds and consequential authorization policy were not supplied. |

## Retained-source appendix

| Source | Type/date | Method and supported claim | Important limitation |
|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | Original benchmark paper, ICLR 2025 | Stateful customer-service APIs, database final-state validator, pass^k repeated-run metric, model outcomes and cost. | LM user simulation, simplified domains, final state may miss consent/policy defects. |
| [ToolMaze](https://arxiv.org/html/2606.05806) | Original benchmark paper, 2026 | Controlled transient/permanent and explicit/implicit faults, TSR/PRR/RC, clean-versus-perturbed recovery evidence. | Generated DAG topologies, not open production workflows. |
| [AgentDojo](https://arxiv.org/html/2406.13352v3) | Original NeurIPS benchmark paper, 2024 | Stateful prompt-injection cases with deterministic utility/security functions and security-utility defense results. | Defined attack suite does not prove broad security. |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | Official NIST framework page, updated 2026 | AI RMF is voluntary guidance for incorporating trustworthiness in AI design, development, use, and evaluation. | Not agent-specific certification or evidence that any control works. |
| [T3 question, local](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/questions/T3.md) | Supplied local requirement, 2026-09-07 | Scope and required reporting elements. | Not empirical evidence. |