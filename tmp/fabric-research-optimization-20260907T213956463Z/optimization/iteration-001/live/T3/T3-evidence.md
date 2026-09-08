# Tool-agent reliability evidence note

**Scope and status:** **partial** as of 2026-09-07. This fresh evidence examines recoverable tool failures, stateful evaluation, evaluator validity, security-relevant behavior, and benchmark drift. It does not establish production security or survey every applicable standard. Configured web search failed with an Exa 429, so I retrieved and inspected the original arXiv, GitHub, and benchmark sources directly.

## Requirement contract

| ID | Exact question | Required inclusions | Expected contribution and decision context |
|---|---|---|---|
| R1 | “which primary evaluations or standards measure tool-agent reliability, task success, failure handling, and security-relevant behavior, with exact environment, agent/model, comparator, method and outcomes?” | Primary sources, exact environment, model/agent, comparator, method, outcomes | Evidence base for selecting an evaluation protocol before deployment |
| R2 | “what counterevidence, benchmark/evaluator limits, and transfer constraints prevent overclaiming safety or reliability?” | Counterevidence, evaluator and benchmark limits, transfer constraints | Bound the claims and prevent benchmark scores from becoming safety claims |
| R3 | “what actionable evaluation and operational controls follow for deploying a tool-using agent?” | Concrete failure signals, decision table, smallest resolving evaluation | Deployment controls for a tool-using agent. “Do not present a generic checklist as evidence or claim an evaluation proves security.” |

## Findings

### 1. Recoverable failure must be measured separately from rejection and tool-use adherence

[AgentProp-Bench](https://arxiv.org/html/2604.16706v2) uses **2,000 tasks** and **14,750 traces** from **13 agents** across four domains. It injects a single parameter-level error and separates:

- **Rejection:** the injection does not reach execution.
- **Recovery:** conditional on execution of the corrupted call, the agent still reaches a correct answer.
- **Tool-call adherence and fabricated tool use:** whether the claimed tool result was actually obtained.

Its validated pooled result is an approximately **0.62 probability** that an injected parameter error reaches a wrong final answer, across proprietary and open-weight models. Rejection and recovery had no significant monotonic relationship, **Spearman ρ = 0.041, p = 0.893, n = 13 models**. Thus a single “robustness” score is not a valid summary. [§7, Table 6](https://arxiv.org/html/2604.16706v2#S7.T6)

The distinction changes interpretation. In the P2 semantic-wrong condition, **GPT-4.1-nano** had **37.5% rejection** and **2.9% recovery**, while **Gemini-2.0-Flash** called tools in only **5%** of traces and fabricated tool-derived results in **37.5%**. Its apparent **95% rejection** therefore does not demonstrate safe filtering. The fabricated-tool classifier was hand-checked on 40 flagged traces with **92.5% precision, 37/40**. [§8, Table 7](https://arxiv.org/html/2604.16706v2#S8.T7)

**Operational implication:** record an immutable tool-event ledger. A final answer that asserts a tool-derived fact without a matching completed event is a distinct, high-severity provenance failure, not a successful recovery.

### 2. Stateful tasks expose a concrete recoverable-error path

[ToolSandbox](https://arxiv.org/html/2408.04682v1) models stateful tool execution, implicit world-state dependencies, a GPT-4o user simulator, and dynamic trajectory grading. Its motivating state-dependent trajectory is: a send-message call fails because cellular service is off, then the agent must infer the state dependency, enable service, and retry. The execution environment returns exceptions to the agent, making recovery observable rather than treating a failed call as terminal. [§1–2](https://arxiv.org/html/2408.04682v1#S2)

The benchmark’s final-state-sensitive evaluator uses human-authored **Milestones** and **Minefields** over a DAG of required ordering. It matches milestones against message history and world state, permits alternative valid trajectories, and makes a minefield violation produce an overall score of **0**. Turn count is tracked separately, so a high task score does not imply efficient recovery. [§2.3](https://arxiv.org/html/2408.04682v1#S2.SS3)

Its workload is materially more interactive than the reported comparators:

| Source-bound measurement | ToolSandbox | BFCL comparator | ToolEval comparator | API-Bank comparator |
|---|---:|---:|---:|---:|
| Mean turns per test case | **13.9 turns** | 2.00 turns | 7.53 turns | 3.88 turns |
| Mean tool calls per test case | **3.80 calls** | 0.78 calls | 1.46 calls | 2.04 calls |
| Test cases | **1,032** | 2,000 | 1,625 | 261 |
| Tools | **34** | 1,193 | 3,917 | 73 |

[ToolSandbox, Table 3](https://arxiv.org/html/2408.04682v1#S3.T3). This is a workload-description comparison, not a model ranking.

For a model result under this exact environment, **GPT-4o-2024-05-13** achieved average similarity **73.0/100** overall and **76.6/100** on State Dependency scenarios. **Claude-3-Opus-20240229** was **69.2/100** overall and **71.1/100** on State Dependency. These are milestone-similarity scores, not real-world success rates. [ToolSandbox, Table 4](https://arxiv.org/html/2408.04682v1#S4.T4)

### 3. Automated evaluator validity is itself a deployment gate

AgentProp-Bench directly calibrated answer grading on a stratified sample of **100 P2 traces**, independently labeled by **two annotators**, blind to each other and automatic verdicts. Human inter-annotator agreement was **Cohen’s κ = 0.835** with **92% raw agreement**. Against that reference:

| Evaluator | Cohen’s κ | Comparator and conditions |
|---|---:|---|
| Substring heuristic | **0.049** against annotator 1 and **0.015** against annotator 2 | 100 labeled traces, answer-to-reference matching |
| Three-LLM majority ensemble: GPT-4o, Gemini-2.5-Flash, GPT-4o-mini | **0.432** | Same 100 labels |
| GPT-4o-mini single judge | **0.567** | Same 100 labels |
| Human annotator pair | **0.835** | Same 100 labels |

[AgentProp-Bench, §5 and Table 2](https://arxiv.org/html/2604.16706v2#S5.T2)

This makes substring correctness unsuitable as a reliability outcome. The selected ensemble was also conservatively biased: it marked **25** traces correct while humans marked **38**, including **19** human-correct answers it rejected, underestimating correctness by approximately **13 percentage points**. [Table 3](https://arxiv.org/html/2604.16706v2#S5.T3)

**Evaluator control:** before using an automated judge to accept production changes, calibrate it against blinded human adjudication on representative final states and failure trajectories. Report agreement, direction of bias, and the acceptance denominator. Do not use response-only grading for an action whose final state can be deterministically validated.

### 4. Security evaluation is evidence of a bounded attack surface, not proof of security

[AgentDojo](https://arxiv.org/abs/2406.13352) is a dynamic prompt-injection evaluation environment for agents that execute tools over untrusted data. Its release contains **97 realistic user tasks** and **629 security test cases**, spanning examples such as email, e-banking, and travel. The paper reports that state-of-the-art LLMs fail some tasks even without attack and that existing attacks break some security properties but not all. [Abstract](https://arxiv.org/abs/2406.13352)

That is appropriate evidence for exercising prompt-injection resistance and utility jointly. It does **not** establish resistance to new injection forms, authorization defects, malicious tools, data exfiltration paths outside the modeled environment, or production integrations.

### 5. Benchmark and task versions must be recorded as experimental variables

The original [τ-bench repository](https://github.com/sierra-research/tau-bench) explicitly warns that its airline and retail tasks are **outdated**, directing users to τ³-bench because the newer release contains fixed tasks and new domains. Its old leaderboard reports, for example, Airline tool-calling `claude-3-5-sonnet-20241022` values of **Pass¹ 0.460**, **Pass² 0.326**, **Pass³ 0.263**, and **Pass⁴ 0.225**. These are historical values on the repository’s outdated tasks, not directly comparable to current τ³ scores. [README warning and leaderboard](https://github.com/sierra-research/tau-bench#readme)

The current [τ³-bench repository](https://github.com/sierra-research/tau2-bench) gives a sharper warning: after its July 2026 **v1.0.1** grading update fixed `banking_knowledge` task errors, results from versions **< 1.0.1 are not comparable with ≥ 1.0.1** for that domain. It reports **75+ task fixes** across airline, retail, and banking, including incorrect expected actions, ambiguous instructions, impossible constraints, and missing fallbacks. [README, “What’s New in τ³-bench”](https://github.com/sierra-research/tau2-bench#whats-new-in-τ3-bench)

ToolSandbox independently identifies another drift risk: some tools rely on external web services, which affects reproducibility, and suggests caching akin to StableToolBench. [ToolSandbox, §4 discussion](https://arxiv.org/html/2408.04682v1#S4)

## Deployment decision table

| Decision | Evidence basis | Adopt now | Failure signal | Do not infer |
|---|---|---|---|---|
| Score recoverable failures separately | AgentProp Table 6 | Report rejection, executed-corruption recovery, tool-call rate, fabricated-use rate, and final-state success separately | Corrupted call executes and final state is wrong, or agent claims an unobserved result | A low injection-admission rate is robustness |
| Use stateful final-state validation | ToolSandbox §2.3 | Validate world-state snapshots, ordered milestones, forbidden actions, and turn cost | Required state change absent, incorrect ordering, minefield hit, retry loop | Answer plausibility proves task completion |
| Qualify automated grading | AgentProp Table 2–3 | Human-calibrate the actual evaluator and publish κ, confusion matrix, and bias | Low κ, systematic false accepts/rejects, or judge and human disagreement | An LLM judge is a reliable oracle |
| Enforce provenance at runtime | AgentProp §8 | Bind every tool-derived assertion to a completed, authorized tool event and abstain/escalate on mismatch | Fabricated tool result, tool result outside authorization scope | End-to-end correctness detects provenance failure |
| Test security separately from utility | AgentDojo abstract | Pair task-success and security-property outcomes under adaptive, untrusted-data attacks | Unauthorized action, sensitive disclosure, policy escape, or utility collapse | Passing AgentDojo proves deployment security |
| Pin and disclose benchmark snapshots | τ-bench and τ³-bench READMEs | Record benchmark commit/tag, task split, grader version, environment image, model snapshot, tool schemas, and date | Any changed task/grader/API without re-baselining | Scores across changed versions share a leaderboard |

## Counterevidence and limits

1. **AgentProp is not live integration evidence.** Its tools use deterministic simulators, it injects one parameter per trace, and multi-parameter and multi-turn propagation remain untested. The human calibration is only 100 traces from two similarly situated annotators. Per-model stage-two samples range from **2 to 56**. [Limitations](https://arxiv.org/html/2604.16706v2#S11)

2. **The interceptor result is conditional.** AgentProp’s concurrent-control result reduces hallucination on tool-calling models, but an interceptor that observes a call cannot correct an agent that never calls a tool or makes unauthorized but syntactically valid calls. Absolute per-arm rates were not human-labeled. [§9 and §11](https://arxiv.org/html/2604.16706v2#S9)

3. **ToolSandbox’s realism is bounded.** Its GPT-4o user simulator itself had total simulation error of **8.02% ± 1.36%** when paired with GPT-4o, under the paper’s manually annotated setting. It includes external-service-backed tools, affecting reproducibility. [Table 5](https://arxiv.org/html/2408.04682v1#A1.T5) and [§4](https://arxiv.org/html/2408.04682v1#S4)

4. **Security transfer is limited.** AgentDojo’s task and attack suite is a useful evaluation environment, but neither it nor the reliability benchmarks assess every authorization, network, tool-supply-chain, data-retention, or human-approval boundary.

5. **Version drift changes the denominator.** The τ³ warning is direct counterevidence to unqualified leaderboard comparison. A task fix can change scores without any agent change.

## Smallest resolving evaluation

**Disputed deployment decision:** whether an agent can safely execute a bounded set of consequential tools after recoverable API/tool errors and untrusted tool content.

| Element | Proposed evaluation |
|---|---|
| Representative tasks | 20–30 deployment-derived workflows with state changes, dependent calls, one recoverable tool error, and one untrusted tool-returned instruction where applicable |
| Fixed variables | Same model snapshot, prompt, tool schemas, policies, permissions, task-state image, maximum retries, timeout, and evaluator version |
| Paired conditions | Baseline versus provenance binding plus failure interceptor. Randomize task order. Reinitialize state per run |
| Acceptance validator | Deterministic final-state checks, ordered event ledger, explicit authorization checks, and forbidden-action checks. Blind human review only for residual semantic ambiguity |
| Required outcomes | Final-state success, rejection rate, conditional recovery after executed failure, fabricated-tool-use rate, unauthorized-action rate, abstention/escalation rate, retries, latency, and total cost per accepted task |
| Decision rule | Deploy only if the protected condition improves or preserves accepted-task success while producing zero unauthorized actions and zero unsupported tool-result claims in this sample. Any such event blocks expansion and requires trace review |
| Version control | Publish exact benchmark/task hashes, image digest, model IDs/dates, tool and policy versions, prompts, validator commit, and run date |

The sample size and threshold above are a bounded screening proposal, not a universal statistical guarantee. Run a larger, repeated evaluation only if the screen is close to the deployment decision.

## Coverage and gaps

| Requirement | Status | Evidence and gap | Next check and stop reason |
|---|---|---|---|
| R1: primary evaluations/standards with environment, model, comparator, method, outcomes | **qualified** | AgentProp, ToolSandbox, AgentDojo, and τ-bench provide primary evaluation evidence. No relevant formal standard was inspected, so “standards” is not closed | Inspect applicable organizational or sector-specific standards after the deployment domain is known. Stopped at the bounded requested topics |
| R2: counterevidence, evaluator limits, transfer constraints | **supported** | Direct limits include κ validity, simulator-only tools, small per-model stage samples, user-simulator error, security-suite scope, external-service reproducibility, and τ task/grader drift | Run the resolving evaluation on the actual deployment tool set |
| R3: actionable evaluation and operational controls | **supported** | Decision table and resolving evaluation derive from source-bound failure modes and evaluator/version evidence | Validate controls against production-equivalent traces before deployment |

## Retained-source appendix

| Source | Type and date | Method/evidence | Supports | Important limitation |
|---|---|---|---|---|
| [AgentProp-Bench paper](https://arxiv.org/html/2604.16706v2) | Primary preprint, arXiv v2, 2026 | 2,000 tasks, 14,750 traces, 13 agents, injected parameter errors, 100 human-labeled calibration traces | Evaluator κ, propagation, recovery, fabricated tool use, interceptor findings | Deterministic simulators, single-parameter injection, limited human calibration |
| [ToolSandbox paper](https://arxiv.org/html/2408.04682v1) | Primary preprint, 2024 | 1,032 stateful interactive scenarios, milestone/minefield final-state evaluation | Stateful recovery, final-state validation, workload and model measurements | User simulator and some external services limit transfer and reproducibility |
| [AgentDojo paper](https://arxiv.org/abs/2406.13352) | Primary benchmark paper, updated 2024 | 97 tasks, 629 security cases, adaptive attack/defense environment | Prompt-injection evaluation boundary | Does not prove production security |
| [τ-bench repository](https://github.com/sierra-research/tau-bench) | Primary benchmark repository, inspected 2026-09-07 | Repository warning and historical leaderboard | Old tasks are outdated, historical values need qualification | Does not supply current-task results |
| [τ³-bench repository](https://github.com/sierra-research/tau2-bench) | Primary benchmark repository, inspected 2026-09-07 | v1.0.1 grading notice and task-fix disclosure | Version-specific non-comparability and task-quality drift | Repository warning is specific to named versions/domains |