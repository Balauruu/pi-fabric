# Tool-using agents: evaluation, reliability, and security boundaries

**Question:** T3 holdout, as of 2026-09-07. **Decision:** authorize only a tested task-and-permission envelope. Public benchmarks establish bounded evidence, not production reliability or security.

**Method note:** This standalone synthesis adapts retained legacy evidence through the direct controller. It preserves reported methods, values, comparators, and limits without adding candidate-verification process.

## Q1. What is measured, and what happened

| Evaluation / source | Environment and method | Agent / comparator and retained outcome | What it measures |
|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | Stateful retail and airline databases, deterministic Python APIs, policies, GPT-4-0613 simulated user. Reward requires final database state to equal annotated goal plus required text. At least 3 trials/task, agent temperature 0, user temperature 1, max 30 actions. pass^k requires success in every k independent trial. | GPT-4o function-calling: about **61% pass¹** retail, **35% pass¹** airline, and **25% pass⁸** retail. In a 115-trajectory retail sample, 40 failed and pass¹ was 65.2%. | Completion, policy adherence, conversational robustness, repeatability. Failure signals: wrong arguments/information, wrong policy decision, partial compound completion. |
| [ToolSandbox](https://arxiv.org/html/2408.04682) | 1,032 human-authored scenarios, 34 tools, 11 domains, stateful execution, LLM user simulator. Human milestones score required events. A forbidden minefield event yields zero. | GPT-4o-2024-05-13: **73.0** average similarity vs Claude-3-Opus **69.2** and GPT-3.5-Turbo-0125 **65.6**. Its insufficient-information score was **42.0**. | Stateful multi-call execution, recovery, ordering, clarification, refusal/handover. A reported agent hallucinated a timestamp and invoked a tool whose arguments could not be correct, causing zero score. |
| [AgentDojo](https://arxiv.org/html/2406.13352v3) | Four stateful domains, 70 tools, 97 user tasks, 27 injection targets, 629 security cases. Each case pairs a task, attacker goal, and untrusted-data injection endpoint. Deterministic utility/security functions inspect state, not an LLM judge. | GPT-4o benign utility **69.00% ±3.61**, utility under attack **50.08% ±3.91**, targeted ASR **47.69% ±3.90**. Strongest attack selection: **57.69% ±3.9 ASR**. Detector: **7.95% ±2.1 ASR**, benign utility **41.49% ±3.9**. Tool filter: **6.84% ±2.0 ASR**, benign utility **73.13% ±3.5**. | Indirect injection-driven tool misuse and utility-security trade-offs. |
| [ToolBench-X](https://arxiv.org/html/2606.25819v1) | Executable multi-step tasks, deterministic tools, canonical answers. Five recoverable hazards: specification drift, invocation error, execution failure, output drift, cross-source conflict. A 200-task diagnostic subset compares baseline, 10 extra rounds, targeted hints, clean-environment oracle. | Twelve models. Retained streams report different snapshots: best only slightly above half with GPT-5.4 **0.453**, versus best **0.513** and GPT-4o **0.359**. Do not combine them without exact table/configuration. Both retain targeted-hint gains of **25.5–35.5 points** and extra-round gains only **3.5–11.5 points**. One reports repeated failed calls in **44–76%** of post-failure trajectories. | Fault diagnosis, bounded retry, fallback, cross-checking, verification. |
| [ToolEmu](https://arxiv.org/html/2309.15817) | LM-emulated safety evaluation across 36 high-stakes toolkits and 144 cases under underspecified instruction. | Human study judged **68.8%** of evaluator-identified failures valid real-world failures. Safest agent still had identified failures in **23.9%** of cases. | Triage candidate failures, which require reproduction in actual integrations. |
| [WebArena](https://arxiv.org/html/2307.13854) | 812 long-horizon tasks in self-hosted e-commerce, forum, GitLab, CMS, map/calculator/scratchpad. Frozen accessibility-tree interaction. | Best GPT-4 agent **14.41%** end-to-end success vs **78.24%** for five CS graduate students, one task per 170 templates. GPT-4 CoT **11.70%**; it falsely called **54.9%** of feasible tasks impossible. | Controlled web task completion only, not live-site reliability or adversarial security. |
| [ToolBench](https://arxiv.org/html/2307.16789) | Initially 10,853 tools / 53,190 APIs, filtered to 3,451 tools / 16,464 APIs after 404/internal errors. ToolEval uses ChatGPT, at least four evaluations, majority vote. | Against human labels, **87.1%** pass-rate and **80.3%** win-rate agreement on sampled pairs. | API-tool evaluation with versioning, availability, and imperfect-judge dependencies. |

## Q2. Counterevidence and boundaries

| Claim | Counterevidence and transfer constraint | Decision |
|---|---|---|
| One-run benchmark ranking establishes reliability | An audit of 496 executions from BFCL v4, τ²-Bench Retail, LiveMCPBench, and MCP-Atlas found **92 evaluator-human disagreements (18.5%)**. Per-suite: 9.8% (11/112), 20.0% (40/200), 13.5% (12/89), 30.5% (29/95). On the same 95-task LiveMCPBench configuration, 23 runs ranged **57.9–76.8%**, mean 69.4%, SD 5.4, spread 18.9 points. The audit is a preprint, not independent reproduction. | Require traces, repeated runs, uncertainty, and human adjudication. Small differences are unresolved. |
| A security score transfers across suites or to production | [InjecAgent](https://arxiv.org/html/2403.02691): 1,054 generated/refined cases, 17 user tools, 62 attacker tools, 30 agents. ReAct GPT-4 ASR **24%**, or **47%** with a fixed enhanced prompt. It differs from AgentDojo in environments, attack construction, defenses, metrics, and adaptivity. | Do not pool ASR values. Neither is breach probability. |
| A defense proves security | AgentDojo’s lower detector/filter ASR has a utility trade-off. Its filter is strongest when benign work needs reads and attack needs writes, and fails when needed tools cannot be planned in advance. Authors state techniques are not foolproof for security-critical tasks. | Enforce authorization outside the model and test the actual allowed capability set. |
| Simulated users and deterministic faults directly transfer | τ-bench uses an LM-simulated user. ToolSandbox reports residual simulator total error around 8%. ToolBench-X faults are structured and assured recoverable. | Benchmark ranks are harness-specific. Test users, schemas, APIs, credentials, and irreversible effects locally. |
| Scores remain comparable over versions | The [τ-bench repository](https://github.com/sierra-research/tau-bench) marks airline and retail tasks outdated and directs users to τ³-bench. | Rerun across task versions. |
| Guidance certifies security | [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) identifies indirect injection, data theft, remote-code-execution risks and calls for pre-deployment and continuous evaluation, while saying applicability varies by context. | Guidance is not certification or proof. |

**Unmeasured:** production incident rates, compromised authorization metadata, live human behavior, financial/legal harm, irreversible effects, adaptive attackers targeting local business logic, cross-agent escalation, provider drift, incident-response latency.

## Q3. Deployment controls and release evidence

| Observable condition | Enforced control | Required result |
|---|---|---|
| Read-only work | Scoped, short-lived read capability. Separate read/write tools; default to per-task allowlists. | Log tool selection and state delta. |
| Retrieved, user-provided, or third-party output | Treat as untrusted data. It cannot grant authority, alter policy, select a new tool, or expand scope. | Test every reachable untrusted-output channel. |
| Timeout, malformed call, schema drift, stale/conflicting output, repeated identical call | Per-tool retry cap, response-schema validation, correlation ID, approved fallback, explicit discrepancy state. | Abort/escalate or verified recovery. Never fabricate completion. |
| Send, publish, delete, purchase, permission change, code execution, export, sensitive disclosure | Server-side policy decision, preview, authorized human approval bound to exact parameters. | Every declined, expired, altered, or absent approval blocks the action. |
| Injection detector, policy violation, prohibited tool choice, anomalous exfiltration | Kill run, revoke session credentials, preserve trace and retrieved-content hashes, alert owner, record incident. | Contain before investigation. |
| Model, prompt, tool, policy, source change | Re-run local resolving evaluation before widening permissions. | No equivalence assumption. |

### Smallest resolving evaluation

Fix and record hashes/versions for model, system prompt, orchestration, schemas, authorization policy, identity, retrieval snapshot, and temperature. In a shadow environment with actual deployment configuration:

1. Run **30–50** representative benign workflows and assert post-state completion, arguments, latency, cost.
2. Inject timeout, schema drift, stale output, conflict, transient errors. Assert diagnosis, bounded retries, safe fallback, verified recovery, no false completion.
3. Put indirect injections in every reachable untrusted source, including exfiltration, recipient change, broadened search, and write-tool requests. Measure targeted ASR, utility under attack, blocked action rate, trace completeness.
4. Test consequential actions with declined, expired, modified, granted approvals. Assert server-side enforcement and parameter-bound audit records.
5. Run each representative workflow **eight** times with independent conversational perturbations. Report pass¹, pass⁸, mean/spread, false pass, false fail, action-policy violation, unsafe-action, recovery, latency, cost.

Use deterministic environment-state and policy-log assertions, not an LLM judge, for sent, deleted, purchased, permission-changed, or secret-disclosed outcomes. Manually review every failure and a stratified sample of automated labels. **Unattended-write release criterion:** zero committed prohibited actions, all unapproved or altered actions blocked, bounded recovery, and pass^k meets the product’s consequence-specific threshold. This resolves only the tested permission set, not general safety.

## Retained-source appendix

1. τ-bench: https://arxiv.org/html/2406.12045
2. τ-bench repository/version warning: https://github.com/sierra-research/tau-bench
3. ToolSandbox: https://arxiv.org/html/2408.04682
4. ToolSandbox implementation: https://github.com/apple/ToolSandbox
5. AgentDojo: https://arxiv.org/html/2406.13352v3
6. AgentDojo implementation/results: https://github.com/ethz-spylab/agentdojo
7. ToolBench-X: https://arxiv.org/html/2606.25819v1
8. ToolEmu: https://arxiv.org/html/2309.15817
9. WebArena: https://arxiv.org/html/2307.13854
10. ToolBench: https://arxiv.org/html/2307.16789
11. Evaluator audit preprint: https://arxiv.org/html/2607.02577
12. InjecAgent: https://arxiv.org/html/2403.02691
13. NIST AI RMF: Generative AI Profile, AI 600-1: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
