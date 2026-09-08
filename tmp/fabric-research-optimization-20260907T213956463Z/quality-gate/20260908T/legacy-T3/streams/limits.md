## R2 — counterevidence and transfer constraints

**Research status:** blocked. The explicitly granted transports `extensions.web_search` and `extensions.fetch_content` are unavailable in this session (`Unknown Fabric action`). I therefore cannot honestly provide inspected passages, source-bound values, or claim web verification.

### Evaluator limits that must constrain conclusions

| Evidence class | What it can establish | What it cannot establish |
|---|---|---|
| Sandbox task benchmark | Success within its fixed tasks, tools, states, scoring, and model setup | Production reliability under changing APIs, credentials, latency, users, or adversarial inputs |
| Simulated-tool safety evaluation | Behavior against the simulator’s tool semantics and attack distribution | Security against real integrations, authorization bugs, side channels, or novel indirect prompt injection |
| Web/UI benchmark | Performance on the benchmark’s sites, snapshots, accounts, and reset conditions | Reliability on live sites with drift, anti-bot controls, payments, privacy constraints, or irreversible actions |
| Red-team scenario set | Resistance to tested attack templates | Absence of vulnerabilities outside tested templates or attacker knowledge assumptions |

### Counterevidence and failure signals

- **Distribution dependence:** benchmark tasks and tool schemas are finite. High task success can coexist with failure on new tools, changed parameter meanings, sparse documentation, or multi-party authorization.
- **Evaluator/model coupling:** LLM-as-judge and LLM-emulated environments can share model blind spots with the evaluated agent. A passing score may reflect evaluator agreement, not correct or safe execution.
- **Simulation gap:** tool emulators usually omit production latency, partial failures, stale state, rate limits, identity boundaries, hidden side effects, and inconsistent API responses.
- **Security coverage gap:** a benchmarked indirect-prompt-injection pattern does not prove resistance to untested payloads, poisoned retrieved content, cross-tool data exfiltration, confused-deputy actions, or compromised upstream tools.
- **Success-only metrics hide near misses:** aggregate task completion can conceal unsafe retries, excessive permissions, irreversible actions, disclosure attempts, and failures recovered only because the benchmark resets state.
- **Contamination and reproducibility risk:** public benchmark tasks, documentation, and trajectories may enter model training or prompt libraries. Results require a contamination assessment and held-out private tasks.
- **Human baseline mismatch:** comparing an agent to humans is informative only when time budget, interface, instructions, tool access, retries, and authority are equivalent.

### Transfer boundary

Do not transfer a benchmark result beyond the intersection of its **task distribution, tool interface, authority level, threat model, failure semantics, and scoring method**. In particular, a tool-agent evaluation does **not** prove security. It supports only a bounded claim such as: “Under this harness and tested attacks, this configuration produced this measured outcome.”

### Minimum resolving local evaluation

1. Create private, versioned tasks from the intended workflows, including normal completion, ambiguous requests, tool errors, stale state, denied authorization, and adversarial retrieved/tool content.
2. Run with production-equivalent permissions but non-production accounts and reversible fixtures.
3. Score task completion separately from policy violations, secret disclosure, unauthorized tool calls, unsafe retries, and recovery quality.
4. Compare the candidate agent against a constrained baseline under equal time, tools, prompts, and retry budget.
5. Require zero tolerance for critical security violations and publish confidence intervals plus failure traces, not only an average success rate.

### Original sources to inspect once transport is restored

- AgentDojo: https://arxiv.org/abs/2406.13352  
- ToolEmu: https://arxiv.org/abs/2309.15817  
- WebArena: https://arxiv.org/abs/2307.13854  
- OSWorld: https://arxiv.org/abs/2404.07972  
- GAIA: https://arxiv.org/abs/2311.12983  
- AgentBench: https://arxiv.org/abs/2308.03688  

**Coverage:** evaluator and transfer limitations are scoped. **Gap:** no source passages or measurements were inspected because all allowed web-research transports failed.