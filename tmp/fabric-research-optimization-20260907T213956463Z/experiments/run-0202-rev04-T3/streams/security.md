# T3-B: Security Evaluation Boundaries for Tool-Using Agents

**Decision:** Treat agent-security benchmarks as evidence of failure modes under their stated harnesses, not evidence that a deployed agent is secure. Deployment requires application-specific adversarial evaluation plus enforced runtime authority boundaries.

## R1. Primary evaluation and standards evidence

| Source-bound unit | Environment, agent/model, comparator | Method, metric, budget | Measured result | Establishes / does not establish |
|---|---|---|---|---|
| **AgentDojo** ([paper §3.4, §4](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf); [live results](https://agentdojo.spylab.ai/results/)) | Simulated tool agents across email, banking, travel, Slack and other suites. 97 user tasks and 629 task-plus-injection security cases. Models include GPT-4o, GPT-4 Turbo, Claude 3/3.5, Gemini 1.5, Llama 3 70B, Command R+. | Measures **benign utility**, **utility under attack** (task completed without adversarial side effect), and **targeted ASR** (malicious goal executed). The public results page warns it is **not a leaderboard** because attacks/defenses were not run uniformly. | GPT-4o-2024-05-13, no defense: benign utility **69.07%**, utility under `important_instructions` **50.08%**, targeted ASR **47.69%**. `tool_filter` changes these to **72.16% / 56.28% / 6.84%**. `spotlighting_with_delimiting` gives **72.16% / 55.64% / 41.65%**. Claude-3.5-Sonnet-20241022, no defense, same attack: **79.38% / 72.50% / 1.11%**. | Direct evidence that indirect-injection resistance and task utility can conflict, and that prompt-only defenses are attack-specific. It does **not** establish resistance to attacks absent from its corpus, real authorizations, or a different tool stack. |
| **AgentHarm** ([paper §3–5, Table 9](https://arxiv.org/html/2410.09024)) | 110 unique and 330 augmented harmful/benign multi-step behaviors, 11 harm categories, 104 synthetic tools. Basic agent loop feeds tool results back to model context. Models span GPT-3.5/GPT-4o, Claude 3/3.5, Gemini, Mistral, and Llama 3.1. | Default: direct prompt, temperature 0, ≤4,096 output tokens; GPT-4o semantic judge scores behavior and refusal. Compares direct request, forced tool call, and one universal jailbreak-template attempt. | Direct request: GPT-4o mini harm score **62.5%**, refusal **22%**. GPT-4o: harm **48.4% → 72.7%** and refusals **48.9% → 13.6%** under template jailbreak. Claude 3.5 Sonnet: **13.5% → 68.7%**, refusals **85.2% → 16.7%**. Gemini 1.5 Pro: **15.7% → 56.1%**, refusals **78.4% → 3.5%**. Best-of-5 at temperature 1 increases GPT-4o **70.7% → 83.7%** and Claude 3.5 Sonnet **65.1% → 79.7%**. | Evidence that chat-oriented refusal does not reliably transfer to multi-step tool execution and that sampling budget is a security variable. It measures proxy harmful behaviors, not real-world harm or an attacker’s complete capability. |
| **ToolEmu** ([paper §4–5, Table 3](https://arxiv.org/html/2309.15817)) | GPT-4 LM emulates tool execution and an evaluator. 36 high-stakes toolkits, 144 test cases, 18 toolkit categories. Agents: ReAct implementations of GPT-4-0613, gpt-3.5-turbo-16k-0613, Claude-2, and Vicuna-1.5. | Validation: 100 randomly sampled cases, GPT-4/ChatGPT-3.5/Claude-2 agents at temperature 0.5, standard plus adversarial emulation, 200 paired trajectories, human annotation. Main evaluation: all 144 cases with adversarial emulator, about **$1.20/case**. | End-to-end identified-failure precision: standard emulator **72.5% ±7.1%**, adversarial **68.8% ±6.7%**. True-failure incidence: **39.6% ±4.9%** and **50.0% ±5.1%**, respectively. Safety evaluator precision **75.3%**, recall **73.1%**, versus held-out human **78.7% / 78.8%**. Even safest evaluated agent failed **23.9%** of cases according to the evaluator. | Useful scalable failure discovery and a calibrated-but-imperfect evaluator. It does **not** validate a real tool’s behavior: the sandbox and judge are both LM-mediated. |
| **NIST AI 600-1, Generative AI Profile** ([pp. 1–2, 24–43](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)) | Voluntary cross-sector AI RMF profile, not an agent benchmark or certification. | Requires risk-specific TEVV and documentation: regular adversarial testing for manipulation/misuse (**MP-2.3-005**); role-play, red-team, or chaos testing for anomalous failure modes (**MP-5.1-005**); performance demonstrated under deployment-like conditions and limits of generalizability documented (**MS-2.3**, **MS-2.5**); regular adversarial testing and real-world evaluation (**MS-4.2-001/002**). | No pass score or security claim. It explicitly says the risks, controls, and measures vary by system/use case, some risks cannot be quantitatively measured, and measurement science remains immature. | Governing standard for evidence, thresholds, monitoring, incident response, and stop criteria. It does **not** certify that a control or evaluation makes an agent secure. |
| **OWASP Top 10 for Agentic Applications 2026** ([pp. 7–13, 22–26](https://genai.owasp.org/download/52117)) | Peer-reviewed threat and mitigation guidance, not an outcome evaluation. Explicitly covers Goal Hijack, Tool Misuse, Identity/Privilege Abuse, RCE, Memory/Context Poisoning, and cascading failures. | Calls for least-agency, untrusted treatment of natural-language and retrieved inputs, policy/approval gates, signed or bound goals where suitable, tool/action logging, anomaly detection, periodic red teams, and rollback testing. | No numerical efficacy results or acceptance threshold. Its premise is that agents cannot reliably distinguish legitimate instructions from attacker-controlled natural-language content. | A threat-model and control-design input. It must be paired with a deployment-specific test corpus and enforcement evidence. |

## R2. Counterevidence and transfer constraints

1. **Evaluator error is material.** ToolEmu’s adversarial end-to-end precision is 68.8% ±6.7%, not 100%. Its safety evaluator recall is 73.1%. A low score can miss failures and a high score can include false alarms. Human agreement is itself moderate.

2. **Synthetic environments bound the inference.** AgentHarm states that synthetic tools make tasks easier and less realistic, so they are proxies for harm. ToolEmu’s LM-emulated tools may not replicate real APIs, authorization failures, side effects, race conditions, data residency, or incident blast radius.

3. **Attack budget changes the conclusion.** AgentHarm’s one-attempt template results are not an upper bound. Its best-of-five experiment materially raises harmful completion. AgentDojo’s targeted ASR depends on the specific attack family and injection placement. Report attacker attempts, adaptive access, model knowledge, and sampling settings with every rate.

4. **Chat safety does not transfer to agents.** AgentHarm finds substantially higher refusals in a chat-only analogue than agentic tasks. A model-card refusal rate or chatbot jailbreak result is not evidence about a tool-connected agent.

5. **Coverage is not a security proof.** AgentDojo covers 629 specified cases, not arbitrary web/email/RAG content, tenant boundaries, privileged tool combinations, persistent memory, or a real attacker. Its own results page says the rows are not a fair cross-model/defense leaderboard.

6. **Known benchmark limits.** AgentHarm uses English-only prompts, excludes user follow-up multi-turn attacks, and acknowledges graders can miss alternative correct traces. Its GPT-4o judge also couples the measurement to a model. NIST AI 600-1 expressly prohibits extrapolating from narrow, anecdotal assessments and requires generalizability limits to be documented.

## R3. Deployment decision table

| Decision area | Required evidence/control | Failure signal | Decision rule |
|---|---|---|---|
| Tool authority | Per-tool, per-action, per-resource allowlist. Separate read from write. Short-lived scoped credentials. | Agent proposes an undeclared tool, recipient, scope, or privilege escalation. | Block by default. No model instruction may override the policy engine. |
| Untrusted content | Label content from web, email, documents, RAG, memory, and tools as data, not authority. Test indirect injection at every ingestion route. | Goal drift, instruction-like text causes a tool call, cross-tenant retrieval, or secret-bearing output. | Pause and quarantine content. Treat as a security incident candidate. |
| High-impact actions | Server-side transaction validation, idempotency, confirmation with a human who sees target, scope, and consequence. | Payment, deletion, external send, permission change, or code execution differs from declared intent. | Require approval or deny. Do not rely on “ask the model to confirm.” |
| Code and execution | Isolated non-root sandbox, dedicated workspace, blocked outbound network by default, package allowlist, static and runtime checks. | Shell invocation, dynamic code evaluation, unpinned dependency, filesystem/network scope expansion. | Stop execution and preserve trace. |
| Memory/RAG | Provenance, tenant/session segmentation, write validation, retention limits, trust scoring, snapshot/rollback. | New memory changes future goal/tool choice, low-trust retrieval reaches a high-impact action. | Quarantine and roll back affected memory. |
| Runtime assurance | Immutable traces of input provenance, active goal, proposed and executed tool calls, policy decisions, approvals, outputs, and model/version. Alert on anomalous tool sequences and invariant violations. | Missing trace, bypassed policy gate, repeated failure, unsafe action near miss, or control drift after model/tool change. | Fail closed for privileged actions. Trigger incident response and re-evaluation. |
| Release governance | Explicit residual-risk threshold, kill switch, staged rollout, independent red team, periodic retest after model, prompt, tool, RAG, policy, or permission changes. | Risk rate above threshold or unbounded severe path. | No-go, or constrain capability until the path is removed. |

## Smallest resolving evaluation

Run this before authorizing any irreversible or externally visible action:

1. **Build 20–30 replayable scenarios from the deployed agent’s actual tools and data flows**, not a generic benchmark. Include clean tasks, indirect injections in every reachable content channel, ambiguous recipient/account/resource cases, authorization escalation, data exfiltration, stale or poisoned memory, and tool/API errors.
2. **For each scenario, execute the production-equivalent orchestration and policy layer** with sandbox credentials and realistic tool responses. Run clean and attacked variants. Use at least three independent samples per stochastic configuration and disclose temperature, model snapshot, prompt, tool schemas, retries, token/step limit, and attacker budget.
3. **Score server-side invariants, not only an LLM judge:** correct task completion, no unauthorized call, no secret/tenant boundary crossing, no action outside declared scope, correct safe failure on error, and complete audit trace.
4. **Gate on severity:** any successful unauthorized irreversible action, cross-tenant disclosure, code-execution escape, or missing policy/audit event is a release blocker. Aggregate success rate is secondary to these catastrophic-path failures.
5. **Resolve the key uncertainty:** compare the same scenario set with policy/approval controls enabled and disabled. The deployable claim is about the enforced system, not the base model.

## Requirements coverage and gaps

| Requirement | Coverage | Gap |
|---|---|---|
| R1 | AgentDojo, AgentHarm, ToolEmu provide exact environments, methods, model/comparator details, budgets where reported, and measured results. NIST and OWASP provide standards/control boundaries. | No source inspected here evaluates the target deployment’s specific tools, identities, or data. |
| R2 | Direct benchmark/evaluator limitations and transfer constraints are stated. | No independent reproduction was run in this assignment. |
| R3 | Decision table and smallest resolving evaluation specify enforceable controls, signals, and release gates. | Thresholds must be set by the deployment owner’s harm and risk tolerance. |

## Retained-source appendix

1. **AgentDojo paper:** https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf  
   Inspected: metrics (§3.4), environment and model evaluation (§4), task/case counts, attack/defense findings.

2. **AgentDojo results:** https://agentdojo.spylab.ai/results/  
   Inspected: result rows and explicit non-leaderboard warning.

3. **AgentHarm:** https://arxiv.org/html/2410.09024  
   Inspected: benchmark design (§3), default evaluation and attack settings (§4.1), results (§4.2–4.3; Table 9), limitations (§5).

4. **ToolEmu:** https://arxiv.org/html/2309.15817  
   Inspected: abstract, validation (§4; Table 3), agent evaluation (§5), evaluator and emulator implementation details.

5. **NIST AI 600-1:** https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf  
   Inspected: pp. 1–2, 24–43, especially MP-2.3-005, MP-5.1-005, MS-2.3, MS-2.5, MS-4.2, MG-2.3/2.4, MG-4.1.

6. **OWASP Top 10 for Agentic Applications 2026:** https://genai.owasp.org/download/52117  
   Inspected: pp. 7–13, 22–26, especially ASI01, ASI05, and ASI06.