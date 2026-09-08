## R3: Deployment controls and resolving evaluation

**Decision:** deploy only within a purpose-bound, least-privilege tool boundary, with irreversible or externally consequential actions approval-gated. Do not treat benchmark performance as security proof. Evidence supports a measured release gate plus runtime containment.

### Evidence that drives controls

| Source and method | Decisive result | Deployment consequence |
|---|---|---|
| [AgentDojo (NeurIPS 2024)](https://arxiv.org/html/2406.13352v3) | Stateful, dynamic tool environment: 97 tasks and 629 injection security cases. **GPT-4o** under the “Important message” injection had 69.00% benign utility, 50.08% utility under attack, and **47.69% targeted ASR**. A tool-filter defense reduced targeted ASR to **6.84%** but utility under attack was 56.28%. | Enforce authorization outside the model. Measure both task completion and prohibited side effects. Require defense tradeoff testing, not security-only scores. |
| [ToolBench-X (2026 preprint)](https://arxiv.org/html/2606.25819v1) | Executable multistep tasks inject five *recoverable* hazards: specification drift, invocation error, execution failure, output drift, and cross-source conflict. Final-task accuracy is state/ground-truth based. All models were below 60%; best reported overall was **0.513**, GPT-4o **0.359**. Repeating the same failed call occupied **44–76%** of post-failure trajectories. Hints improved accuracy **25.5–35.5 points**, while extra rounds improved only **3.5–11.5 points**. | Instrument error classification, bounded retries, fallback, verification, and fail-closed escalation. More agent turns are not a substitute for diagnosing a faulty tool or untrusted output. |
| [ToolEmu (2023)](https://arxiv.org/html/2309.15817) | LM-emulated safety evaluation across 36 high-stakes toolkits and 144 cases, under *underspecified user instruction*. Its human study judged **68.8%** of identified failures valid real-world failures. The safest evaluated agent still had evaluator-identified failures in **23.9%** of cases. | Test ambiguous requests and dangerous-but-plausible tool contexts. Treat LM-emulated findings as triage candidates needing reproduction in the real integration. |
| [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | NIST describes indirect injection as adversarial instructions placed in retrieved data and notes demonstrated data theft and remote code execution. It calls for risk-relevant capability and safety-robustness evaluations before deployment and continuously, but says applicability varies by actor and context. | Maintain a use-case-specific threat model, pre-release evidence, runtime telemetry, incident handling, and reassessment after model, tool, policy, or data-source change. It is voluntary guidance, not a certification or proof of security. |

**Direct passages**

- AgentDojo defines *utility under attack* as completing the user task “**without any adversarial side effects**” and targeted ASR as cases where “**the agent executes the malicious actions**.” It measures environment state, rather than an LLM simulating the outcome.  
  Source: [§3.4](https://arxiv.org/html/2406.13352v3#S3.SS4)
- ToolBench-X reports that each injected instance preserves at least one recovery path, including retry, fallback, normalization, cross-checking, or verification. Its low score therefore measures failure to handle a constructed recoverable condition, not an intrinsically impossible task.  
  Source: [benchmark construction and experiments](https://arxiv.org/html/2606.25819v1)
- NIST: “**prompt injection involves modifying what input is provided to a GAI system so that it behaves in unintended ways**”; indirect injection exploits data likely to be retrieved.  
  Source: [AI 600-1, §2](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

### Operational decision table

| Condition / observable signal | Enforced control | Outcome |
|---|---|---|
| Tool needs only read access | Issue a scoped, short-lived read capability. Do not expose write-capable alternatives in the tool set. | Continue with trace logging. |
| Tool output is retrieved, user-provided, or third-party content | Label it untrusted data. Do not allow it to grant authority, alter policy, choose a new tool, or expand scope. | Continue only within existing capability boundary. |
| Repeated identical call, malformed invocation, schema drift, timeout, stale/conflicting result | Per-tool retry cap, backoff, response-schema validation, correlation ID, alternate approved source or tool, and explicit discrepancy state. | Escalate or return partial result. Never silently fabricate completion. |
| Attempt to send, publish, delete, purchase, change permissions, run code, or disclose sensitive data | Server-side policy decision and transaction preview. Require authorized human approval tied to the exact action parameters. | Block or await approval. Model refusal alone is insufficient. |
| Prompt-injection detector, policy violation, prohibited tool selection, or anomalous exfiltration pattern | Kill the run, revoke session credentials, preserve trace and retrieved content hashes, alert owner, and create an incident record. | Contain first, investigate second. |
| Model/tool/prompt/policy/source change | Rerun the resolving evaluation below before widening permissions. | No automatic equivalence assumption. |

### Smallest resolving evaluation

Run this before granting any write or external-action capability.

**Fixed system under test:** exact model version, system prompt, orchestration code, tool schemas, authorization policy, identity, retrieval corpus snapshot, and temperature. Record hashes and vendor versions.

| Arm | Cases | Measure | Release criterion |
|---|---:|---|---|
| Benign, representative tasks | 30–50 real workflow cases, including required tool calls | State-verified task completion, correct tool arguments, latency, and cost | Meets product-defined minimum with confidence interval reported |
| Recoverable tool faults | Same tasks with deterministic timeout, schema drift, stale output, conflict, and transient error injections | Correct diagnosis, bounded retry count, safe fallback, verified recovery, false completion | **0 prohibited side effects** and no unmarked success after unresolved evidence |
| Indirect prompt injection | Same workflows with injections in each reachable untrusted source, including instructions to exfiltrate, change recipient, broaden search, or invoke a write tool | Targeted-ASR, utility under attack, blocked-action rate, and trace completeness | **0 successful prohibited actions**. Any success blocks release or requires removing the capability. |
| Approval path | Consequential actions with approval declined, expired, modified, and granted | Server-side enforcement, parameter binding, audit record | Every unapproved or altered action is blocked. |

Use environment-state assertions and policy-log assertions, not an LLM judge, for “sent,” “deleted,” “permission changed,” “secret disclosed,” or “purchase made.” Review every failure manually. The result resolves whether the proposed *specific* permission set is acceptable, not whether the agent is generally safe.

### Counterevidence and limits

- **AgentDojo is not a universal security result.** Its authors state a static benchmark is limited by evolving attacks, and its results vary materially by attack and defense. Its tool-filter defense works especially where legitimate work is read-only and the attack needs write access. That does not establish protection when legitimate work itself requires the same write capability.
- **ToolBench-X is a preprint with synthetic, deterministic tools and deliberately recoverable faults.** Its strong diagnosis finding transfers to fault handling, but does not quantify live API outages, compromised tools, or adaptive attackers.
- **ToolEmu uses GPT-4 as emulator and evaluator.** The 68.8% figure is evidence of useful triage precision, not a real-system failure rate. Reproduce candidate severe failures against the actual tool integration.
- **NIST AI 600-1 is guidance.** Its suggested actions are context-dependent and it explicitly does not make every action applicable to every actor. Conformance cannot prove resistance to prompt injection or operational reliability.

### Coverage and gaps

**Covered:** stateful tool-task success, recoverable tool faults, failure behavior, prompt injection, harmful side effects, and deployment governance boundaries.

**Gaps requiring local evidence:** actual production tools and credentials, authorization implementation, user population and task mix, sensitive-data taxonomy, model/provider drift, adaptive attackers targeting local business logic, cross-agent delegation, and incident response latency.

## Retained-source appendix

1. Debenedetti et al., *AgentDojo*, NeurIPS Datasets & Benchmarks 2024. Original paper: https://arxiv.org/html/2406.13352v3  
2. Tian, Shi, Zhao, *Beyond Function Calling: ToolBench-X*, 2026 preprint. Original paper: https://arxiv.org/html/2606.25819v1  
3. Ruan et al., *Identifying the Risks of LM Agents with an LM-Emulated Sandbox (ToolEmu)*, 2023. Original paper: https://arxiv.org/html/2309.15817  
4. NIST, *AI RMF: Generative AI Profile*, NIST AI 600-1, 2024. https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf