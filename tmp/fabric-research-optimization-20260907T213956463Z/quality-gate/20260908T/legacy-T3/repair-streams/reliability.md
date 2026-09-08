# R1: Decision-grade evidence for tool-agent evaluation

**Scope:** direct primary-source review, as-of **2026-09-07**. These evaluations measure bounded behaviors in simulated or emulated environments. None proves a deployed agent is secure.

| Evaluation | Environment and method | Agent/comparator and exact outcome | What it measures |
|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | Stateful retail and airline databases, deterministic Python APIs, policy documents, and a GPT-4-0613 simulated user. Reward requires the final database to equal the annotated goal state and, where applicable, required output text. At least 3 trials/task, agent temperature 0, user temperature 1, maximum 30 agent actions. `pass^k` requires a task to succeed in all \(k\) independent trials. | GPT-4o function-calling: **~61% pass¹** retail and **~35% pass¹** airline. The same GPT-4o retail agent fell to **~25% pass⁸**. In a 115-trajectory retail sample, **40 failed** and pass¹ was **65.2%**. | End-to-end task completion, policy adherence, interaction robustness, and repeatability under conversational variation. |
| [ToolSandbox](https://arxiv.org/html/2408.04682) | 1,032 human-authored scenarios, 34 tools across 11 domains, stateful execution and an LLM user simulator. Human-authored *milestones* score required trajectory events; *minefields* set the final score to zero if forbidden events occur. | GPT-4o-2024-05-13 had **73.0** average similarity, versus Claude-3-Opus **69.2** and GPT-3.5-Turbo-0125 **65.6**. GPT-4o’s score on deliberately insufficient-information cases was only **42.0**. | Stateful multi-call execution, recovery after execution errors, clarification, dependency ordering, and refusing/handover when completion is impossible. |
| [AgentDojo](https://arxiv.org/html/2406.13352) | Four stateful domains: Workspace, Slack, Travel, and e-banking. **70 tools, 97 user tasks, 27 injection targets, 629 security cases**. Deterministic utility and security functions inspect environment state rather than asking an LLM judge. Each security case pairs a user task, attacker goal, and untrusted-data injection endpoint. | GPT-4o: benign utility **69.00% ±3.61**, utility under attack **50.08% ±3.91**, targeted attack-success rate (ASR) **47.69% ±3.90**. With the paper’s strongest attack selection, no defense had **57.69% ±3.9 ASR**. Prompt-injection detector: **7.95% ±2.1 ASR**, but benign utility fell to **41.49% ±3.9**. Tool filter: **6.84% ±2.0 ASR**, benign utility **73.13% ±3.5**. | Indirect prompt injection causing tool misuse, user-task completion under attack, and the utility-security trade-off. |
| [ToolBench-X](https://arxiv.org/html/2606.25819v1) | Executable multi-step tasks with deterministic tools and canonical answers. Injects five **recoverable** hazards: specification drift, invocation error, execution failure, output drift, and cross-source conflict. A 200-task diagnostic subset compares baseline, extra 10 interaction rounds, targeted hazard hints, and clean-environment oracle. | Twelve models: best reported overall accuracy was only slightly above one half. GPT-5.4: **0.453**. Across five tested models, targeted hints improved accuracy **25.5–35.5 percentage points**, recovering about **60–80%** of baseline-to-oracle loss. | Fault diagnosis, retry/fallback/cross-check recovery, and the gap between happy-path success and robust completion. |

## Decisive passages and failure signals

- **τ-bench:** “even state-of-the-art LMs like gpt-4o achieve low task success rates … **~61% on τ-retail and ~35% on τ-airline**,” while `pass⁸` on retail is “**~25%**.” Its sampled GPT-4o failures include wrong arguments/information, wrong policy decisions, and partial completion of compound requests.  
  Source: [paper, results and failure analysis](https://arxiv.org/html/2406.12045)

- **ToolSandbox:** an insufficient-information case is explicitly designed so the agent “should never call” a tool whose arguments cannot be correct. The paper reports GPT-4 hallucinated a current timestamp, invoked that tool, and therefore received a **zero** minefield-gated score.  
  Source: [paper, minefield method](https://arxiv.org/html/2408.04682)

- **AgentDojo:** targeted ASR is “the fraction of security cases where the attacker’s goal is met.” Its GPT-4o maximum-attack result was **57.7% targeted ASR**. The paper’s own limiting condition matters: tool filtering works chiefly where a benign task needs read access and the attack needs write access, and “fails … when the list of tools to use cannot be planned in advance.”  
  Source: [paper, full tables and tool-isolation limitation](https://arxiv.org/html/2406.13352)

- **ToolBench-X:** the clean-oracle gap is roughly **35–50 points**. The authors conclude hints recover much of that loss, so many no-hint failures are not intrinsically unsolvable but result from missed anomaly diagnosis.  
  Source: [paper, diagnostic experiment](https://arxiv.org/html/2606.25819v1)

# R2: Counterevidence, limits, and transfer constraints

| Claim to reject | Counterevidence / transfer boundary |
|---|---|
| “High average task success means reliable deployment.” | τ-bench’s GPT-4o drops from ~61% retail pass¹ to ~25% pass⁸. Repeatability is distinct from one-run success. |
| “A benchmark score proves safety.” | AgentDojo evaluates specified task/attack pairs in four simulated applications. The authors state supplied attacks and defenses are general-purpose and not designed for any specific deployment scenario. Adaptive attacks, real identities, real integrations, and novel exfiltration paths remain unmeasured. |
| “Prompt-injection detection solves the problem.” | AgentDojo’s detector reduced ASR to 7.95% but benign utility to 41.49%. This is a measured trade-off, not a security guarantee. |
| “Tool filtering is universally safe.” | AgentDojo’s filter depends on precomputing the needed tool set. Dynamic workflows can require a later tool based on earlier results, the stated failure condition. |
| “An LLM evaluator is sufficient for security testing.” | ToolSandbox explicitly criticizes trajectory-only LLM judging as raising reliability and interpretability questions. AgentDojo instead uses deterministic state checks because an injection could also fool an LLM evaluator. |
| “Simulated interaction directly transfers to users.” | τ-bench uses an LM-simulated user. ToolSandbox reports user-simulator residual total error around 8% even after prompt improvements. Results can rank agents within that harness but do not establish human-facing reliability. |
| “Current τ-bench scores are stable comparators.” | The official repository marks its airline and retail tasks **outdated** and directs users to τ³-bench because of task fixes and new domains. Do not compare results across task versions without rerunning. [Repository notice](https://github.com/sierra-research/tau-bench) |
| “Recovery on deterministic injected faults proves production resilience.” | ToolBench-X hazards are structured, known categories with an assured recovery path. Real faults can be coupled, adversarial, irreversible, or lack a safe fallback. |

**Coverage:** task completion, repeatability, policy violations, state dependencies, impossible-task hallucination, recoverable tool faults, and indirect prompt injection are covered.

**Gaps:** production APIs and credentials, authorization-boundary failures, real human behavior, financial/legal harm, irreversible side effects, cross-agent escalation, adaptive attackers trained on the deployed policy, and operational detection/response latency are not established by these benchmarks.

# R3: Deployment controls justified by the evidence

| Decision | Control | Measured rationale |
|---|---|---|
| Permit read-only work first | Issue separate read and write capabilities. Default to narrow, per-task tool allowlists. | AgentDojo’s tool filter reduced GPT-4o targeted ASR from 57.69% to 6.84% in its harness. |
| Gate consequential actions | Require explicit user confirmation immediately before writes, payments, messages, exports, permission changes, and destructive operations. Bind confirmation to rendered action parameters. | τ-bench identifies incorrect policy decisions and partial compound resolution. AgentDojo demonstrates untrusted text can cause malicious tool actions. |
| Make failure safe | Treat timeout, schema error, inconsistent output, insufficient information, or repeated failed calls as an abort/escalate state, not permission to invent arguments or retry indefinitely. | ToolSandbox’s minefield case catches hallucinated arguments. ToolBench-X shows diagnosis, not extra turns alone, is the limiting capability. |
| Verify before commit | Separate planning, read/verify, and write phases. Validate tool outputs against independent state or invariants before a write. | ToolBench-X explicitly includes output drift and cross-source conflict. |
| Preserve evidence and reversibility | Log prompts, tool schemas, outputs, authorization decisions, planned action, confirmation, state diff, and final outcome. Use idempotency keys, transaction boundaries, dry runs, and compensating actions. | Required to diagnose τ-bench wrong-argument/policy failures and AgentDojo-style misuse. This is an operational inference, not benchmark-measured proof. |
| Release by measured envelope | Deploy only task families, tool sets, and consequence levels tested locally. Track pass¹, passᵏ, action-policy violation rate, unsafe-action rate under injection, recovery rate, and cost/latency. | τ-bench’s pass¹/pass⁸ divergence shows an average alone masks reliability. |

## Smallest resolving evaluation

Before any write-capable release, run a **task-specific, deterministic shadow evaluation**:

1. Select **50–100 representative workflows** with production-equivalent tool schemas, policies, and state.
2. For each, define deterministic post-state success criteria, forbidden state changes, allowed tool set, and maximum calls/retries.
3. Run each workflow **eight times** with independent conversational perturbations. Report pass¹ and pass⁸ separately.
4. Add adversarial untrusted-data fixtures at every retrieval boundary and score both task success and attempted/committed forbidden actions.
5. Inject timeout, schema drift, stale output, and conflicting-output faults. A safe abort counts separately from successful recovery.
6. Do not enable unattended writes unless there are **zero committed forbidden actions** in the test, bounded recovery behavior, and passᵏ meets the deployment’s consequence-specific threshold.

This resolves the central unknown that public benchmarks cannot: whether this agent, its tools, policies, permissions, and users remain safe and reliable together.

## Retained-source appendix

1. τ-bench primary paper: https://arxiv.org/html/2406.12045  
2. τ-bench repository/version warning: https://github.com/sierra-research/tau-bench  
3. ToolSandbox primary paper: https://arxiv.org/html/2408.04682  
4. ToolSandbox implementation: https://github.com/apple/ToolSandbox  
5. AgentDojo primary paper: https://arxiv.org/html/2406.13352  
6. AgentDojo implementation and results: https://github.com/ethz-spylab/agentdojo  
7. ToolBench-X primary paper: https://arxiv.org/html/2606.25819v1