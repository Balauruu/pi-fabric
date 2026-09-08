# Tool-Using Agent Evaluation, Reliability, and Security Boundaries

**Scope:** Decision guide as of 2026-09-07. Benchmark results establish behavior only within their stated environments, tasks, tool surfaces, and threat models. They do not establish production reliability or security.

## Decision

Deploy only within a tested task-and-permission envelope. Require repeated clean-environment trials, server-side authorization assertions, deterministic post-state checks, bounded recovery, trace retention, and adversarial untrusted-content tests before expanding privileges.

## Evidence for Evaluation Design

| Dimension | Source-bound result | What to measure locally | Limit |
|---|---|---|---|
| Stateful task success and repeatability | [τ-bench](https://arxiv.org/html/2406.12045), GPT-4o function-calling: about **61% pass¹** retail, **35% pass¹** airline, and **<25% pass⁸** retail. GPT-4o-0613 simulated users, stateful retail/airline APIs, policies, at least three trials per task, maximum 30 actions. | Report pass¹ and pass^k together, with final-state assertions and trajectories. | Simulated users and dated task versions do not measure production availability. |
| Stateful recovery and prohibited actions | [ToolSandbox](https://arxiv.org/html/2408.04682), 1,032 human-authored scenarios, 34 tools, 11 domains, 44% stateful tools. GPT-4o-2024-05-13 scored **73.0** average similarity, versus Claude-3-Opus **69.2** and GPT-3.5-Turbo **65.6**. GPT-4o insufficient-information score: **42.0**. Minefield violations score zero. | Include malformed or insufficient-information requests, state dependencies, and prohibited-event assertions. | Milestone similarity and simulated interaction are not security guarantees. |
| Injection utility and attack success | [AgentDojo](https://arxiv.org/html/2406.13352v3), GPT-4o benign utility **69.00% ±3.61**, utility under attack **50.08% ±3.91**, targeted attack-success rate **47.69% ±3.90**. Tool filtering produced **6.84% ±2.0** attack success and **73.13% ±3.5** benign utility. 97 stateful tasks and 629 security cases use deterministic state-based scoring. | Test each reachable untrusted-data channel. Report utility under attack and attack success together. | Tools, attack selection, and threat definitions are suite-specific. Current techniques are not foolproof for security-critical tasks. |
| Fault diagnosis and recovery | [ToolBench-X](https://arxiv.org/html/2606.25819v1), 1,106 executable tasks with recoverable specification, invocation, execution, output, and cross-source hazards. Best accuracy: Doubao-Seed-2.0-Lite **0.513**, GPT-5.4 **0.453**, GPT-4o **0.359**. Diagnosis hints added **25.5–35.5 points**. Repeating the failed call occurred in **44–76%** of post-failure trajectories. | Classify failures, cap retries, validate schemas, use idempotent recovery and verified fallback. | Structured recoverable faults do not represent all production failures. |
| Controlled web completion and false abstention | [WebArena](https://arxiv.org/html/2307.13854), best GPT-4 agent end-to-end success **14.41%**, versus human **78.24%**. GPT-4 falsely labeled **54.9%** of feasible tasks impossible under the UA hint. 812 tasks in self-hosted web applications use outcome-based validation. | Track false completion and false abstention separately. | Frozen sites and sampled human comparison do not represent live-site reliability or adversarial security. |
| Emulator and safety-evaluator validity | [ToolEmu](https://arxiv.org/html/2309.15817), **68.8% ±6.7** of adversarial-emulator evaluator-identified failures were validated as true failures. GPT-4 Safety failure incidence was **23.9%**. | Use simulation to discover cases, then reproduce decisive failures against actual tools and policies. | LM-emulated execution and evaluation are triage evidence, not integration reproduction. |
| Injection transfer boundary | [InjecAgent](https://arxiv.org/html/2403.02691), ReAct GPT-4 attack success **24%** baseline and **47%** with an enhanced hacking prompt. Dataset: 1,054 cases, 17 user tools, 62 attacker tools. | Keep attack-success results separate by benchmark and test actual attack paths. | Attack success is not breach probability and cannot be pooled with AgentDojo. |
| Evaluator error and run variance | [Benchmarking the Benchmarks](https://arxiv.org/html/2607.02577): **92/496 (18.5%)** evaluator-human disagreements. LiveMCPBench ranged **57.9–76.8%** over 23 runs, mean **69.4%**, SD **5.4 points**, spread **18.9 points**. | Preserve traces, repeat close comparisons, and manually adjudicate failures and samples of automated labels. | Preprint audit of specified configurations, not an independent replication or universal evaluator result. |
| Version identity | [τ-bench repository](https://github.com/sierra-research/tau-bench) warns that airline and retail tasks are outdated and directs users to τ³-bench. | Pin benchmark release or commit, task set, model, prompt, tools, evaluator, and policy. Rerun after any material change. | Documentation establishes version status, not performance. |

## Counterevidence and Boundaries

- A strong pass¹ can conceal weak all-runs reliability. τ-bench’s GPT-4o retail result falls from about 61% pass¹ to below 25% pass⁸.
- Automated evaluators can materially disagree with human review. Benchmarking the Benchmarks found 18.5% disagreement in its audit.
- Simulated users, deterministic tools, emulated environments, frozen websites, and benchmark-specific attacks limit transfer to production.
- Recovery benchmarks with recoverable hazards do not establish safety under irreversible side effects, authorization failures, adaptive attacks, or irrecoverable outages.
- ToolSandbox does not address mandatory confirmation or authentication.
- AgentDojo’s tool filter reduced attack success but can fail where task-required tools also enable the attack.
- ToolEmu’s evaluator evidence supports triage, not treating an LLM judge as ground truth.
- Benchmark scores from different versions, threat models, models, prompts, policies, or evaluators are not a common leaderboard.

## Deployment Decision Table

| Decision | Release evidence required | Control |
|---|---|---|
| Claim reliable completion | Repeated local trials with pass¹ and pass^k, per-trial traces, final-state checks, and failure taxonomy. | Block expansion of consequential permissions when a release-critical scenario fails. |
| Permit consequential tool actions | Tests for authorization, exact parameters, duplicate effects, expired or altered approvals, and recovery. | Enforce authorization and confirmation outside the model. Bind approval to exact server-side parameters. |
| Handle failures | Fault-injection results for timeout, schema/output drift, stale/conflicting output, and tool exceptions. | Bounded retries, failure classification, idempotency, fallback, and human escalation. |
| Assess prompt injection | Representative untrusted content from every reachable channel and attempted out-of-policy actions. | Least privilege, content segregation, tool-side enforcement, approval gates, and adversarial regression tests. |
| Compare systems | Same release, task set, environment, tools, prompt, decoding settings, evaluator, and trial count. | Do not pool public scores from unmatched benchmark versions or configurations. |
| Accept automated grading | Human-calibrated evaluation on representative traces, including disagreement review. | Retain traces and manually review decisive failures and sampled automated labels. |

## Smallest Resolving Evaluation

Run the exact candidate deployment in a shadow replica of its highest-impact workflow.

1. Pin model/version, prompts, orchestration and tool-schema hashes, authorization policy, credential scope, retrieval snapshot, resource limits, network policy, retries, and decoding settings.
2. Select representative benign tasks plus irreversible and permission-sensitive cases.
3. For each task, execute clean runs and inject timeout, schema/output drift, stale or conflicting output, state-dependency failure, duplicate/retry hazards, denied authorization, and indirect instructions from reachable untrusted channels.
4. Compare no-recovery, bounded classify-and-recover, and human-escalation policies under identical action and time budgets.
5. Assert final business state, permitted arguments, no duplicate irreversible action, expected refusal or recovery, authorization outcome, and transcript evidence.
6. Report pass¹ and pass^k, false completion, false abstention, policy violations, unsafe actions, recovery success conditional on fault, latency, token use, and total cost.
7. Require zero authorization-policy violations in the tested consequential-action set before widening privileges. This is evidence for the tested environment and permission set, not a general security claim.

## Coverage

| Requirement | Conclusion |
|---|---|
| R1: evaluations, methods, and outcomes | Qualified. The retained sources measure bounded task completion, repeatability, recovery, evaluator behavior, and injection outcomes with stated environments and methods. |
| R2: counterevidence and transfer constraints | Retained. Evaluator disagreement, run variance, simulator dependence, version drift, and differing threat models prohibit broad safety or reliability claims. |
| R3: actionable controls | Qualified. Deployment-specific post-state and authorization assertions, bounded retries, trace review, and adversarial untrusted-content testing are necessary operational controls. |

## Explicitly Absent Material

| Dimension | Status |
|---|---|
| ToolBench API-scale and ToolEval human-agreement result | Absent from retained evidence. |
| NIST AI 600-1’s specific indirect-injection and lifecycle-control statements | Absent from retained evidence. |
| AgentDojo detector-specific utility and attack-success result | Absent from retained evidence. |
| ToolBench-X extra-round gain range | Absent as an independently retained exact result. |

## Retained-Source Appendix

1. Tian, Shi, Zhao. [ToolBench-X: Beyond Function Calling](https://arxiv.org/html/2606.25819v1). Preprint, June 2026. Recoverable hazard injection, recovery accuracy, diagnosis hints, and retry behavior. Limitation: structured recoverable faults.
2. Lu et al. [ToolSandbox](https://arxiv.org/html/2408.04682). Preprint, August 2024. Stateful conversational tool evaluation, milestones, minefields, and insufficient-information behavior. Limitation: simulated interaction and no authentication or confirmation coverage.
3. Zhang et al. [AgentDojo](https://arxiv.org/html/2406.13352v3). Preprint, June 2024. Deterministic utility and security scoring for indirect prompt injection in stateful tool environments. Limitation: benchmark-specific threats and tools.
4. WebArena authors. [WebArena](https://arxiv.org/html/2307.13854). Preprint, July 2023. Controlled web-task completion and impossible-task classification. Limitation: self-hosted frozen sites.
5. Ruan et al. [ToolEmu](https://arxiv.org/html/2309.15817). Preprint, September 2023. LM-emulated tool-risk evaluation and evaluator-validity limits. Limitation: emulation is not actual integration behavior.
6. InjecAgent authors. [InjecAgent](https://arxiv.org/html/2403.02691). Preprint, March 2024. Indirect-prompt-injection attack success in tool-integrated agents. Limitation: attack success is not production breach probability.
7. Benchmarking the Benchmarks authors. [Benchmarking the Benchmarks](https://arxiv.org/html/2607.02577). Preprint, July 2026. Evaluator-human disagreement and repeat-run variation. Limitation: audited configurations only.
8. Sierra Research. [τ-bench](https://arxiv.org/html/2406.12045). Preprint, June 2024. Stateful customer-service tasks and pass^k repeatability. Limitation: simulated users and historical task versions.
9. Sierra Research. [τ-bench repository](https://github.com/sierra-research/tau-bench). Official repository, accessed 2026-09-07. Outdated-task warning and τ³-bench direction. Limitation: version documentation, not performance evidence.