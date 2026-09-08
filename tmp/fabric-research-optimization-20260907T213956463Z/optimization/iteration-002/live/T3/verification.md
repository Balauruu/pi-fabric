## Requirement dispositions

| Requirement | Disposition | Basis |
|---|---|---|
| R1 | **Qualified** | [τ-bench](https://arxiv.org/html/2406.12045), [ToolMaze](https://arxiv.org/html/2606.05806), and [AgentDojo](https://arxiv.org/html/2406.13352v3) provide source-bound environments, methods, comparators, and outcomes. NIST and OWASP are guidance, not measured tool-agent security standards or certifications. |
| R2 | **Supported** | The notes retain source-stated evaluator incompleteness, simulator/procedural-environment transfer limits, attack-coverage limits, and version drift. [τ-bench’s repository](https://github.com/sierra-research/tau-bench) confirms its retail and airline tasks are outdated versus τ³-bench. |
| R3 | **Qualified** | Final-state, repetition, fault-injection, and attack/utility tests follow measured constructs. Deployment thresholds, rollback policy, and authorization design remain target-system and risk-owner decisions. No cited evaluation proves security. |

## Coverage portfolio

| Facet | Disposition | Source-bound contribution / consequence |
|---|---|---|
| Stateful final-state task success | **Supported, qualified** | [τ-bench](https://arxiv.org/html/2406.12045) uses final database state **and** required user-output content. Its authors state a passing reward can still miss consent or policy violations. Consequence: check final state, required output, authorization, and prohibited side effects. |
| Recoverable fault diagnosis and bounded recovery | **Supported** | [ToolMaze](https://arxiv.org/html/2606.05806) tests explicit/implicit and transient/permanent faults, TSR, conditional PRR, recovery cost, safe abort, and a 25-step cap. Consequence: clean success cannot stand in for diagnosis, bounded retry/reroute, or escalation behavior. |
| Evaluator validity and repeated-run reliability | **Qualified** | [τ-bench](https://arxiv.org/html/2406.12045) defines all-pass `pass^k` and reports GPT-4o retail `pass^8 <25%` despite >60% one-run success. [AgentDojo](https://arxiv.org/html/2406.13352v3) uses deterministic state-based utility/security functions. ToolMaze does not report repetitions or confidence intervals. Consequence: repeat target-system trials and retain failure distributions. |
| Security utility trade-off and authorization boundary | **Qualified** | [AgentDojo](https://arxiv.org/html/2406.13352v3) reports GPT-4o no-defense/tool-filter targeted ASR of 57.69%/6.84%, with utility trade-offs. It also says filtering fails when required and malicious actions overlap or tools cannot be planned first. [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) recommends app-held credentials, least privilege, and approval, while stating no fool-proof prevention exists. Consequence: enforce authorization outside the model and test same-capability attacks. |
| Benchmark/version and transfer limitation | **Supported** | [τ-bench repository](https://github.com/sierra-research/tau-bench) marks retail/airline tasks outdated and points to τ³-bench. [WebArena v0.2.0](https://github.com/web-arena-x/webarena/releases/tag/v0.2.0) changed annotations, locators, and evaluator corner cases. Consequence: retain benchmark version, model snapshot, scaffold, budgets, evaluator, and threat model with each result. |

## Bounded corrections

1. Change τ-bench descriptions from “final database state” alone to its composite reward: exact database state **plus required response content**. Retain its explicit consent/policy caveat.
2. Label capability-gateway enforcement as an operational inference, not a measured AgentDojo result. The benchmark’s tool filter is not evidence that a production authorization service is non-bypassable.
3. State explicitly that ToolMaze supplies controlled recovery evidence, not repeated-run reliability estimates, production incident rates, or cost estimates.
4. Replace the unsupported WebArena claim that v0.2.0 “directs evaluators to self-host/reset.” The inspected release supports evaluator/data changes only. Use τ-bench’s own repository for the τ³ supersession claim.
5. Label AgentDojo’s 47.69% and 57.69% GPT-4o ASR figures by their exact attack/table conditions. Do not compare them as one common no-defense baseline without that condition.