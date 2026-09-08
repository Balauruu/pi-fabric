# T3-A: Tool-Agent Reliability, Failure, and Evaluator Design

## Decision summary

Tool-agent evaluation should use **state-based task correctness**, **repeated-trial consistency**, **trace-level failure classification**, and **adversarial utility/security trade-offs**. No cited evaluation establishes that an agent or defense is secure in deployment. Benchmark results transfer only to the evaluated agent, model version, tool surface, task distribution, attack set, and budget.

## R1. Primary source-bound evaluation evidence

| Unit | Environment and method | Agent/model and comparator | Result | Budget and caveat |
|---|---|---|---|---|
| **U1 — τ-bench reliability** | [τ-bench](https://arxiv.org/html/2406.12045), §§3–5, Table 2/Fig. 4. Dynamic retail and airline conversations: LM-simulated user, domain API tools, policies, and final database state compared to annotated goal state. `pass^k` measures a task being solved across *k* i.i.d. trials. | Function-calling agents, including GPT-4o, versus other models/methods. | GPT-4o FC: about **61% pass¹ retail** and **35% pass¹ airline**. Despite >60% average retail task success, **pass⁸ <25%**. This exposes stochastic inconsistency hidden by a single-run average. | At most **30 agent actions** per task. At least **3 trials/task** for main results. Agent temperature 0.0, user temperature 1.0. GPT-4o-agent + GPT-4-user retail cost was **$0.38 + $0.23/task**. Simulated users and synthesized domains constrain transfer. |
| **U2 — τ-bench failure analysis** | Same source, §5.2/Fig. 5. Manual analysis of held-out retail trajectories. Final-state evaluation catches incorrect end state and policy violations. | GPT-4o FC, 115 retail trajectories. | **40/115 failed** (`pass¹=65.2%`). Four were task typo/ambiguity and corrected. Of remaining 36 agent failures, documented modes include wrong tool arguments, omitted/wrong user information, failure to follow one-time action rules, and incomplete multi-item handling. GPT-4o made **0.46 nonexistent-ID calls/task**, versus GPT-3.5 FC **2.08** and Act **6.34**. | This is an error sample, not a population estimate. It supports instrumenting wrong-argument, invalid-ID, omitted-constraint, and irreversible-policy failures. |
| **U3 — WebArena end-to-end and recovery** | [WebArena](https://arxiv.org/html/2307.13854), §§3–5 and Appendix A.6. Self-hosted Docker web apps with organic data, **812** long-horizon intents, outcome-based programmatic functional-correctness checks. | Few-shot GPT-4/PALM-2/GPT-3.5 agents. Best GPT-4 agent compared with humans. | Best GPT-4 agent achieved **14.41%** end-to-end task success versus **78.24%** human performance. Authors attribute limitations partly to inadequate active exploration and failure recovery. | GPT-4-0613 at temperature 1.0, top-p 0.9, maximum **30 state transitions**. Harness stops after the same action >3 times on the same observation or 3 consecutive invalid actions. These are useful production stop signals, but not evidence that retries are generally safe. |
| **U4 — ToolBench/ToolEval tool execution and evaluator validity** | [ToolLLM/ToolBench](https://arxiv.org/html/2307.16789), §§3, A.5, Tables 3, 4, 6. ToolBench covers 16,464 RapidAPI REST APIs. ToolEval labels whether a trajectory completes the instruction within a limited API-call budget and uses repeated ChatGPT pairwise judgments for preference. | GPT-4, ChatGPT, ToolLLaMA, Claude-2, text-davinci-003 with ReAct or DFSDT. GPT-4+DFSDT compared with ChatGPT-ReAct reference. | GPT-4+DFSDT average **71.1% pass rate** and **70.4% win rate**. In evaluator validation, ChatGPT agreement with human annotation was **87.1%** for pass rate and **80.3%** for win rate. | Human-validation sample: 300 test instructions per sampled method; pass labels for three DFSDT systems and preference between two ChatGPT methods. This validates agreement on that sample, not correctness of all evaluator decisions or security behavior. ReAct failure modes explicitly include error propagation, faulty loops, wrong API calls, and hallucinated APIs. |
| **U5 — AgentDojo adversarial utility/security trade-off** | [AgentDojo](https://arxiv.org/html/2406.13352v3), §§3–4, Appendix C Tables 3–5. Stateful email, banking, and travel-style tool environments with formal checks over environment state, not an LLM judge. Measures benign utility, utility under attack, and targeted attack-success rate (ASR). | Tool-calling models. Defense experiment fixes **GPT-4o**, comparing no defense, delimiting, prompt-injection detector, repeated prompt, and tool filter. | Initial suite: **97 user tasks, 629 security cases**. With GPT-4o, no-defense targeted ASR was **57.69% ±3.9**. PI detector: **7.95% ±2.1** ASR, but utility under attack **21.14% ±3.2**. Tool filter: **6.84% ±2.0** ASR and utility under attack **56.28% ±3.9**. Authors report all defenses lose roughly 15–20% utility under attack. | Full GPT-4o security suite estimated **US$35** and benign suite **US$4**. Tool filtering works especially when benign work is read-only but attacker action needs writes. It fails when required tools cannot be planned in advance. The dataset card says default attacks alone are unsuitable for robustness claims without adaptive attack and thorough security evaluation. |

## What the measurements support

- **Task success:** final environment/database state is stronger evidence than action-string matching or self-reported completion. τ-bench, WebArena, and AgentDojo use this form.
- **Reliability:** report `pass¹` *and* repeated-trial `pass^k`; a high one-run average can conceal unacceptable tail inconsistency.
- **Failure handling:** preserve trajectory evidence and count distinct terminal causes: invalid arguments, nonexistent IDs, repeated actions on unchanged state, consecutive invalid actions, policy violation, incomplete multi-step completion, tool failure, and explicit safe abort.
- **Security-relevant behavior:** report targeted ASR *and* benign utility/utility under attack. A defense that reduces ASR while collapsing useful task completion is not a deployment win by default.

## R2. Counterevidence and transfer limits

### Direct counterevidence

1. **C1 — Average success is not reliable execution.** τ-bench’s GPT-4o retail result falls from >60% average success to **<25% pass⁸**. A single-run pass rate does not establish repeatability.
2. **C2 — Strong nominal model does not imply robust long-horizon tool use.** WebArena’s best GPT-4 agent reached **14.41%**, far below **78.24%** humans, under a bounded, reproducible environment.
3. **C3 — Security controls have a measurable utility cost.** In AgentDojo, GPT-4o’s PI detector lowered targeted ASR from **57.69%** to **7.95%**, while utility under attack fell from **50.01%** to **21.14%**. “Low ASR” without the utility denominator is incomplete.
4. **C4 — Tool restriction is not a universal defense.** AgentDojo states tool filtering fails when required tools cannot be planned beforehand. Its success is partly structural where legitimate work reads and attacker objectives write.
5. **C5 — An automated evaluator is not ground truth.** ToolEval’s 87.1%/80.3% human agreement leaves disagreement, was validated on selected trajectories, and evaluates tool-use completion/preference rather than adversarial misuse.

### Evaluator and benchmark limits

| Limit | Why it blocks overclaiming | Required interpretation |
|---|---|---|
| **Synthetic/sandboxed environment** | τ-bench uses LM-simulated users and generated data. WebArena and AgentDojo are reproducible simulations, not the production application, identities, data, integrations, or outage modes. | Treat results as pre-deployment evidence for a matched abstraction, not field reliability. |
| **Model and service drift** | Results bind to named versions, prompt, temperature, tools, orchestration, and dates. Hosted models and tool schemas change. | Re-run on the deployed model snapshot and agent configuration after material changes. |
| **Finite action/cost budgets** | 30-step caps, stopping rules, and cost budgets affect both success and failure rates. More retries can help exploration or multiply harmful actions. | Publish step, retry, token, time, and cost limits with every metric. |
| **Evaluator disagreement** | LLM-as-judge agreement does not remove false positives/negatives, reward hacking, or shared model bias. | Use executable state assertions for critical outcomes and blinded human adjudication for a stratified disagreement sample. |
| **Fixed/default attacks** | AgentDojo explicitly says default attacks alone are unsuitable for a robustness evaluation. Attackers can adapt prompts, tool outputs, timing, and routes. | Measure against system-specific adaptive attacks and treat residual ASR as an observed lower bound for that attack set, not a security guarantee. |
| **Outcome-only score** | A successful end state can hide unnecessary access, secret exposure, dangerous near-misses, or unsafe retries. | Score trace-level prohibited calls and information flows separately from task completion. |
| **Benchmark contamination/optimization** | Public benchmarks can enter training data or become tuned targets. | Hold back private, representative tasks and rotate perturbations, while retaining fixed regression cases. |

## R3. Deployment decisions and controls

### Decision table

| Decision | Evidence needed | Deploy condition | Block / rollback signal |
|---|---|---|---|
| **D1 — Permit read-only, reversible tasks** | Private state-based task suite: pass¹, pass⁴ or pass⁸, failure taxonomy, and latency/cost. | Repeated-trial success meets the product threshold and no prohibited read/access event occurs. | Repeated unchanged-state action, invalid tool call, goal-state mismatch, or action-budget exhaustion. |
| **D2 — Permit state-changing tools** | Same as D1 plus policy-conformance checks, action-level allowlist, and adversarial task suite measuring utility-under-attack and targeted ASR. | Least-privilege scoped capability, typed/validated arguments, idempotency key or compensating action, and explicit approval for high-impact writes. | Any unapproved irreversible write, policy violation, cross-tenant access, or injection-tainted request reaching a privileged sink. |
| **D3 — Permit access to untrusted content** | AgentDojo-style paired benign/adversarial tests using the actual retrieval channels and write tools. | Untrusted content is data, not authority. Separate reading from privileged execution, minimize downstream capabilities, and record provenance through tool-call arguments. | Targeted ASR above the pre-set risk tolerance, unsafe effect despite a detector, or material utility loss that encourages bypass. |
| **D4 — Use retries/recovery** | Fault-injection evaluation for timeouts, malformed results, partial completion, stale state, and tool 4xx/5xx errors. | Retries are bounded, idempotent, state-rechecked, and prohibited after an ambiguous or irreversible effect. | Same action/observation loop, repeated invalid actions, changing arguments without new evidence, or reconciliation mismatch. |
| **D5 — Change model, prompt, tool schema, policy, or orchestration** | Differential rerun of private regression and adversarial suites, preserving prior baselines. | No material regression in repeated success, unsafe-call rate, policy correctness, or attack/utility frontier. | Any regression outside predeclared tolerance. Do not rely on a prior benchmark score. |

### Operational design implications

- Make the **tool boundary the enforcement point**: server-side authorization, scoped credentials, tenant checks, immutable audit logs, typed schemas, value/range validation, and deny-by-default capabilities. Prompt instructions and model refusals are not authorization.
- Partition tools into **read, reversible write, and irreversible/high-impact write**. Require user confirmation or a deterministic policy gate for the last class. Never give broad standing credentials merely because a task may need one action.
- Enforce a **bounded state machine**: maximum turns/time/cost, per-tool retry policy, duplicate-action detection, invalid-action threshold, and safe escalation/abort. WebArena’s repeated-observation and consecutive-invalid-action stops are concrete initial signals, not universal thresholds.
- Record the complete trace: user request, model/version, prompt/policy revision, retrieved untrusted inputs, tool arguments/results, authorization decision, retry reason, final state assertion, and operator approval. This makes state-based regressions and incident reconstruction possible.
- Maintain separate **capability, reliability, and security scorecards**. Report denominators, confidence intervals where applicable, action budget, costs, evaluator method, and both benign and adversarial utility.

## Smallest resolving evaluation

Before enabling any state-changing production tool, run this minimum matched evaluation:

1. **Build 30–50 private representative tasks** with executable final-state and policy assertions. Include normal, ambiguous, partial-information, tool-error, and interrupted workflows.
2. **Run each task eight times** on the exact deployed model, prompts, tools, credentials, temperatures, and action/retry limits. Report pass¹, pass⁸, per-tool invalid-call rate, duplicate-action loops, safe aborts, and prohibited effects.
3. **Add 15–25 paired adversarial cases** in which actual untrusted tool content attempts to induce a forbidden state-changing call. Measure targeted ASR, benign utility, and utility under attack.
4. **Inject tool faults**: timeout, malformed response, stale read, 4xx/5xx, and ambiguous post-write response. Verify no retry can duplicate an irreversible effect.
5. **Human-review every prohibited effect and evaluator disagreement.** Do not enable writes if any test creates an unapproved irreversible effect or crosses the predeclared ASR/policy-violation limit.

This evaluation resolves the decision that public benchmark scores cannot: whether this agent, at this permission boundary, behaves acceptably under the application’s real task and attack distribution.

## Requirements coverage and gaps

| Requirement | Coverage | Gap |
|---|---|---|
| **R1** | U1–U5 provide environments, models/agents, comparators, methods, outcomes, budgets, and caveats. | No universal standard supplies a pass/fail threshold for a specific deployment. |
| **R2** | C1–C5 and evaluator limits identify direct counterevidence and non-transfer conditions. | Adaptive attacks and production incidents remain system-specific and must be tested locally. |
| **R3** | Decision table, operational boundaries, and smallest resolving evaluation convert evidence into deploy/no-deploy controls. | Thresholds must be set by the operator’s harm model, legal obligations, reversibility, and user impact. |

## Retained-source appendix

1. **τ-bench — original paper**  
   Yao et al., “τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains.”  
   https://arxiv.org/html/2406.12045  
   Inspected locators: abstract; §§3–5; Table 2; Figs. 4–5; §5.2; §6.  
   Retained measurements: final-database-state scoring, `pass^k`, GPT-4o results, 30-action limit, temperatures, cost, manual failure sample.

2. **WebArena — original paper**  
   Zhou et al., “WebArena: A Realistic Web Environment for Building Autonomous Agents.”  
   https://arxiv.org/html/2307.13854  
   Inspected locators: abstract; §§3–5; Appendix A.6; Appendix A.10.  
   Retained measurements: 812 tasks, programmatic outcome checks, GPT-4 14.41%, human 78.24%, 30-transition/repeated-action/invalid-action stop rules.

3. **ToolLLM / ToolBench — original paper**  
   Qin et al., “ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs.”  
   https://arxiv.org/html/2307.16789  
   Inspected locators: §§3–4; Tables 3–4; Appendix A.5/Table 6.  
   Retained measurements: ToolEval method, GPT-4+DFSDT results, human agreement, loop/error-propagation limitations.

4. **AgentDojo — original paper**  
   Debenedetti et al., “AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents.”  
   https://arxiv.org/html/2406.13352v3  
   Inspected locators: §§3–5; Appendix C Tables 3–5; Appendix D cost; dataset-card intended-use statement.  
   Retained measurements: 97 tasks/629 security cases, formal state checks, GPT-4o defense trade-offs, confidence intervals, cost, adaptive-attack limitation.

5. **NIST AI RMF 1.0 — primary framework page**  
   https://www.nist.gov/itl/ai-risk-management-framework  
   Inspected locator: “Overview of the AI RMF.”  
   Retained use: voluntary risk-management framework for incorporating trustworthiness considerations into AI design, development, use, and evaluation. It is governance guidance, not a certification that an agent is secure.