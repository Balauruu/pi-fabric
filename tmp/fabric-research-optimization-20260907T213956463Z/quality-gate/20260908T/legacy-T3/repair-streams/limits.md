## R2 — Benchmark and Transfer Counterevidence

**Conclusion:** benchmark success is evidence only for the tested agent, tool contract, environment, evaluator, attack set, and run configuration. It does **not** establish production reliability or security.

| Counterevidence | Exact evidence and method | Transfer constraint |
|---|---|---|
| **Evaluator error can dominate scores** | A 2026 preprint audit manually adjudicated full traces, tool calls, state transitions, and visible outcomes for **496** executions from BFCL v4, τ²-Bench Retail, LiveMCPBench, and MCP-Atlas. It found **92 evaluator–human disagreements (18.5%)**. Per-suite error: τ²-Bench **9.8%** (11/112), BFCL **20.0%** (40/200), MCP-Atlas **13.5%** (12/89), LiveMCPBench **30.5%** (29/95). [Source](https://arxiv.org/html/2607.02577) | Treat any small leaderboard difference as unresolved unless evaluator agreement, raw traces, and repeated-run uncertainty are reported. This is an audit preprint, not an independent reproduction. |
| **LLM-judge repeatability is insufficient for fine ranking** | For the same 95-task LiveMCPBench configuration, **23** repeated runs ranged **57.9%–76.8%**, mean **69.4%**, SD **5.4 points**, spread **18.9 points**. The source attributes variance to both agent sampling and a two-call stochastic scorer that regenerates criteria then judges the trace. [Source](https://arxiv.org/html/2607.02577) | A one-run LLM-judged score cannot support a claim that one agent is more reliable than another within roughly that observed spread. This result is specific to that evaluator and configuration, not a universal error rate. |
| **Functional success remains far below human performance in a controlled web environment** | WebArena evaluates functional correctness across **812** long-horizon tasks in self-hosted e-commerce, forum, GitLab, and CMS sites, plus map/calculator/scratchpad tools. Its best GPT-4 agent achieved **14.41%** end-to-end success versus **78.24%** for five CS graduate students on one task per **170** templates. GPT-4 with CoT achieved **11.70%**; it falsely declared **54.9%** of feasible tasks unachievable under the benchmark’s unachievable-task hint. [Source](https://arxiv.org/html/2307.13854) | This bounds performance in WebArena’s frozen, accessibility-tree interaction environment. It neither estimates reliability on live sites nor measures adversarial prompt injection, authorization, cost, or real-user recovery behavior. |
| **“Real API” tool evaluation still has temporal and judge dependencies** | ToolBench initially collected **10,853 tools / 53,190 APIs** but retained **3,451 tools / 16,464 APIs** after filtering because APIs could return **404** or internal errors. ToolEval uses ChatGPT, at least **4** evaluations and majority vote. Against human labels, it reported **87.1%** pass-rate and **80.3%** win-rate agreement from sampled solution pairs. [Source](https://arxiv.org/html/2307.16789) | The reported agreement is not perfect, and API versioning/filtering changes the task distribution. Its pass and preference metrics do not demonstrate safe authorization or production outcome correctness. |
| **Security outcomes reverse across attack suites and cannot be pooled** | InjecAgent: **1,054** generated/refined cases, **17** user tools, **62** attacker tools, and **30** agents. ReAct-prompted GPT-4 had **24%** base ASR and **47%** with the fixed “hacking prompt”; fine-tuned GPT-4 was reported at **7.1%**. ASR-valid excludes invalid outputs. [Source](https://arxiv.org/html/2403.02691) | The benchmark’s cases use GPT-4-assisted generation, simulated attacker tool responses for data theft, fixed attack wording in the enhanced condition, and ASR-valid denominators. Its rates do not compare directly with other security suites or predict a deployed agent’s breach probability. |
| **A lower attack rate elsewhere is not evidence of a general defense** | AgentDojo evaluates state mutations using deterministic utility/security checks across four simulated environments, **97** user tasks, **629** security cases, and up to **18** tool calls. The paper reports benign task utility under **66%**, attacks against its best agents under **25%**, and **8%** ASR with a secondary detector. [Source](https://arxiv.org/html/2406.13352) | This differs from InjecAgent in environments, task/attack construction, models, defenses, metrics, and attack adaptivity. Thus **8% is not a refutation of 47%**, nor is either a production security guarantee. AgentDojo itself states its preloaded agents, defenses, and attacks are general-purpose rather than tailored to each scenario. |

### Decisive passages

- Evaluator audit: “**92 evaluator–human disagreements, corresponding to an 18.5% misalignment rate**” and LiveMCPBench score spread of “**18.9 percentage points**.”  
  [Original source](https://arxiv.org/html/2607.02577)

- WebArena: “best GPT-4-based agent only achieves … **14.41%**, … human performance **78.24%**”; GPT-4 “erroneously identifies **54.9%** of feasible tasks as impossible.”  
  [Original source](https://arxiv.org/html/2307.13854)

- InjecAgent: ReAct GPT-4 ASR “**24%**” rising to “**47%**” with the enhanced fixed prompt. The paper also notes that unoptimized adversarial strings could increase ASR.  
  [Original source](https://arxiv.org/html/2403.02691)

- AgentDojo: “current techniques are **not foolproof**, and may be unable to provide guarantees for security-critical tasks.”  
  [Original source](https://arxiv.org/html/2406.13352)

### Decision implications

| Claim | Decision |
|---|---|
| “Our benchmark score proves reliable deployment.” | **Reject.** Require local outcome checks, repeated runs, and error review. |
| “A prompt-injection benchmark proves the agent is secure.” | **Reject.** It measures resistance to its stated attacks and tools only. |
| “A defense with lower ASR on one suite transfers to another stack.” | **Unproven.** Compare only under a shared harness, agent, tools, policy boundary, attack corpus, and metric. |
| “Deterministic outcome gates remove all evaluation risk.” | **Reject.** They reduce judge variance but can still encode incorrect state targets or reject valid alternate outcomes. |

### Smallest resolving evaluation

Run the deployed agent with its actual model, prompts, tool schemas, permissions, and policy gate on a versioned holdout containing:

1. representative benign tasks and realistic failures,
2. indirect-injection cases delivered through every untrusted tool-output channel,
3. high-impact action attempts with and without valid external authorization.

Record complete traces and tool-state deltas. Score irreversible outcomes with deterministic policy/state gates, have humans adjudicate a stratified sample of automated pass/fail labels, and repeat stochastic configurations enough to report mean, spread, false-pass, false-fail, and unsafe-action rates. This resolves local transfer better than importing a leaderboard score.

### Coverage and gaps

**Covered:** evaluator misalignment and instability, long-horizon task failure, API/environment drift, indirect injection, utility-security tradeoffs, and non-comparability of security rates.

**Gaps:** no inspected source establishes live-production incident rates, robustness to newly adaptive attackers, security of compromised authorization metadata, cross-language behavior, or the reliability of a specific deployment. Those remain local measurements, not benchmark deductions.