# T3 Source Note: Counterevidence and Transfer Limits for Tool-Using Agent Deployment

**Scope:** R2 primary. Supports R1 and R3 only where necessary to interpret evaluation evidence.  
**As-of date:** 2026-09-07.  
**Bottom line:** Public benchmark success is evidence about a *specified harness, task distribution, tool surface, grader, and threat set*. It does not establish production reliability or security. Deployment claims should be overturned by environment mismatch, unrecovered stateful failures, repeatability failures, or new/adaptive prompt-injection success.

## Decision-relevant findings

### F1. A realistic execution benchmark can expose very low end-to-end success, but remains an environment-specific measurement. `[R1, R2]`

**Source:** [OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments](https://arxiv.org/html/2404.07972v2), research preprint, 2024, inspected original.

- **Environment and method:** 369 executable Ubuntu tasks, plus 43 Windows tasks. Tasks receive configured initial state and are graded by custom execution-based scripts. The benchmark explicitly returns a positive reward only when terminal state meets its objective, including correct declaration that an infeasible task cannot be completed ([§2.1–3](https://arxiv.org/html/2404.07972v2#S2)).
- **Comparator and result:** In the reported baseline table, GPT-4o with screenshots achieved **11.21%** aggregate task success, versus **72.36%** human accuracy. The human comparison used computer-science students unfamiliar with the samples/software ([Table 2 and §3.4](https://arxiv.org/html/2404.07972v2#S3.SS4)).
- **Failure signals:** The authors report imprecise screenshot grounding, repetitive actions, interference from unexpected windows, limited GUI and domain-software knowledge ([§5.2](https://arxiv.org/html/2404.07972v2#S5.SS2)). Multi-application workflows were generally below **5%** for the evaluated agents, while human performance stayed around 70% ([same section](https://arxiv.org/html/2404.07972v2#S5.SS2)).
- **Transfer boundary:** This measures desktop GUI completion on particular VM images, task initial states, applications, action APIs, and terminal-state scripts. It does not measure production permissions, adversarial content, non-VM integrations, data loss, or recovery after real external-side-effect failures. Even the benchmark’s own QA reports remaining false positives/negatives after four review rounds and says additional red teaming could reduce them ([§3.2](https://arxiv.org/html/2404.07972v2#S3.SS2)).

**Adoption-overturn condition:** Do not accept a GUI-agent adoption claim based on aggregate success if the target work contains multi-app flows, pop-ups, unavailable controls, or application versions absent from the test environment and those strata are not measured separately.

---

### F2. Prompt injection is an execution-path risk, not merely a text-quality defect. `[R1, R2, R3]`

**Source:** [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents](https://arxiv.org/html/2406.13352), research paper, 2024, inspected original.

- **Environment and method:** A stateful dynamic environment in which agents use tools over untrusted data. Initial release: **97 tasks** and **629 security test cases**, including email, banking, and travel applications. Utility is formally checked from environment state rather than by an LLM simulator ([Introduction](https://arxiv.org/html/2406.13352#S1)).
- **Outcome and comparator:** The authors state that current LLMs solve **less than 66%** of tasks *without attack*. Their attacks succeed against the best-performing agents in **less than 25%** of cases. Adding a secondary injection detector lowered measured attack-success rate to **8%** ([Introduction](https://arxiv.org/html/2406.13352#S1)).
- **Critical counterevidence:** Aggregate figures conceal severe suite variation. In the Slack suite, web-content injections achieved **92% attack success**, with the attacker controlling a substantial share of tool outputs ([§4.1, Figure 7](https://arxiv.org/html/2406.13352#S4.F7)). Under attack, evaluated defenses lost **15–20 percentage points of utility**; the paper says repeating the user prompt after a tool call is “unlikely to withstand adaptive attacks” ([§4.2, Figure 9](https://arxiv.org/html/2406.13352#S4.F9)).
- **Evaluator limit addressed by the paper:** It rejects LLM-simulated tool/utility evaluation for this threat model because a successful injection could hijack the evaluator too ([related-work discussion](https://arxiv.org/html/2406.13352#S1)).

**Interpretation:** The 8% detector result is not a security proof. It is a result for tested attacks, agent/tool configurations, and a measured utility tradeoff. A low aggregate ASR cannot justify connecting the agent to a tool that can create irreversible harm.

**Adoption-overturn condition:** Any successful attack that crosses a production trust boundary, such as sending externally, changing authorization, exposing confidential data, or executing code, overturns an unattended deployment claim regardless of aggregate ASR.

---

### F3. Prompt-injection results are highly sensitive to attack framing and benchmark simplification. `[R2]`

**Source:** [InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents](https://arxiv.org/html/2403.02691v2), research preprint, 2024, inspected original.

- **Environment and method:** **1,054** test cases, **17** user-tool categories, **62** attacker tools, spanning direct harm and private-data exfiltration. Thirty agents were evaluated. “ASR-valid” is attacks successful among *valid outputs*, unlike ASR-all, which includes invalid outputs ([§2–3](https://arxiv.org/html/2403.02691v2#S2)).
- **Outcome and comparator:** ReAct-prompted GPT-4 had **23.6% ASR-valid** in the base setting and **47.0%** with a predefined “hacking prompt.” Fine-tuned GPT-4 was reported at **3.8%** and **7.1%**, respectively ([Table 3 and §3.2](https://arxiv.org/html/2403.02691v2#S2.T3)).
- **Qualification:** Analysis restricted its principal ASR claims to **19 agents with valid rate above 50%** ([§4](https://arxiv.org/html/2403.02691v2#S4)). Therefore ASR-valid alone cannot describe total operational risk, because invalid calls, refusals, parser failures, and agent unavailability are excluded from its denominator.
- **Author-stated transfer limits:** The paper uses one fixed enhanced prompt, notes that developers could filter it, assumes external content contains only attacker instructions rather than mixed benign/malicious content, and limits attacks to single-turn and at most two steps ([§8 Limitations](https://arxiv.org/html/2403.02691v2#S8)).

**Interpretation:** The difference between 23.6% and 47.0% demonstrates attack-distribution sensitivity, not a stable vulnerability constant. Neither number transfers directly to a deployed model version, tool schema, policy, or attacker corpus.

---

### F4. LM-emulated environments accelerate discovery but cannot independently validate real-world safety. `[R2]`

**Source:** [ToolEmu: Identifying the Risks of LM Agents with an LM-Emulated Sandbox](https://arxiv.org/html/2309.15817), research paper, 2023/ICLR 2024, inspected original.

- **Environment and method:** GPT-4 emulates tool execution and state from tool specifications and tool inputs. ToolEmu curated **144** underspecified-instruction cases across **36 toolkits**, **18 categories**, and **9 risk types**. GPT-4 also acts as emulator and automatic safety/helpfulness evaluator ([§3](https://arxiv.org/html/2309.15817#S3)).
- **Outcome:** The safest evaluated agent still had evaluator-detected failures in **23.9%** of test cases ([§1–2](https://arxiv.org/html/2309.15817#S1)). The automatic safety evaluator identified **73.1%** of majority-of-three-human-annotator failures, versus **78.8%** for one held-out human annotator. Of identified failures, **68.8%** were human-validated as genuinely risky ([Introduction](https://arxiv.org/html/2309.15817#S1)).
- **Reality check:** Of seven severe ChatGPT-3.5 terminal failures inspected, **six** could be instantiated on a real Bash terminal. This supports the method as a failure-discovery mechanism, but it is not a validation rate for all emulated failures ([Introduction](https://arxiv.org/html/2309.15817#S1)).

**Interpretation:** An LM evaluator can prioritize traces for review. Its recall and human-validation figures show it is not ground truth. Do not use an LLM-emulated pass result to certify a real privileged tool integration.

---

### F5. Evaluation score semantics can invert the decision. `[R2, R3]`

**Source:** [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), vendor engineering guidance, undated webpage inspected 2026-09-07.

- The source distinguishes a **trajectory** from the **outcome**. An agent’s assertion that it booked a flight is not evidence of a reservation. The database/environment terminal state is the outcome ([definitions](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
- It warns that agent behavior varies by run. For a per-trial success probability, **pass@k** approaches 100% as retries increase while **pass^k** approaches zero. The former answers “did any run work?” and the latter answers “does it work consistently?” ([non-determinism section](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
- It characterizes model graders as non-deterministic and requiring calibration against humans. Code graders are reproducible but can reject valid variations ([grader comparison](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Interpretation:** Report per-run success, repeated-run consistency, and terminal-state correctness separately. A retry-enabled “best of k” number is not an unattended-agent reliability number.

## Decision table

| Decision claim | Evidence sufficient to support | Evidence that must not support it | Overturning signal |
|---|---|---|---|
| “The agent completes this workflow reliably.” | Exact production-like tools and states, terminal-state grader, repeated independent trials, and failure/recovery outcomes by task stratum | A benchmark aggregate, agent final text, pass@k, or one successful trace | Any critical workflow’s pass^k, terminal-state success, or recovery rate falls below the deployment threshold |
| “The agent is safe against prompt injection.” | None from a benchmark alone. At most, a scoped claim about tested attacks and controls | Low ASR, detector deployment, prompt repetition, or a static injection suite | A new/adaptive injection causes unauthorized egress, privilege use, state change, or secrets exposure |
| “An LLM grader proves the workflow is safe/correct.” | Never alone. It can triage evidence when calibrated and paired with deterministic checks/human review | LM-emulated pass or rubric score without real-state verification | Disagreement with terminal state or calibrated human review |
| “A model upgrade preserves reliability.” | Paired replay over frozen regression tasks plus fresh production-like holdout tasks, same harness and policy, with uncertainty | Vendor model benchmark, old-model score, or prompt-only comparison | Any stratum regression, especially side-effecting or exception paths |

## Smallest resolving evaluation

Run a **production-surface holdout of 30–50 real, permission-scoped traces** before unattended deployment:

1. Include normal work, tool errors/timeouts, ambiguous instructions, stale data, retry/idempotency cases, and adversarial untrusted-content cases.
2. Execute each case **five independent times** with the intended model, exact agent harness, tool schemas, credentials/permissions, and rate limits.
3. Grade **terminal environment state** with deterministic assertions. Log every tool call, authorization decision, retry, rollback, and outbound data field.
4. Human-review every destructive, externally communicative, access-control, or data-egress trace, plus all evaluator/terminal-state disagreements.
5. Report per-task **pass^5**, terminal-state success, unsafe-action count, unauthorized-egress count, failure detection rate, and successful rollback/recovery rate.

This resolves the decisive uncertainty that public benchmarks do not: whether the exact deployed harness is consistently correct and contained across its own tools, data, failure modes, and attackers. A single unsafe boundary crossing blocks unattended deployment.

## Actionable controls derived from the evidence

- **Treat untrusted tool output as hostile input.** Separate data retrieval from action authorization. Do not let model text directly authorize email, payment, code execution, permission changes, or secret disclosure.
- **Constrain tools structurally.** Use narrow capabilities, typed parameters, allowlisted destinations, per-action authorization, idempotency keys, transaction/rollback paths, and approval gates for irreversible effects.
- **Measure recovery, not only completion.** Inject tool timeouts, malformed returns, duplicate execution, stale state, and partial completion. A safe failure must leave a bounded state and produce an actionable escalation.
- **Keep outcome evidence.** Preserve trace, tool arguments/results, state-diff, policy decision, and grader version. Final narrative output is not proof of task completion.
- **Maintain a living adversarial suite.** Add every production incident and red-team result. Static injection prompts and fixed suites decay against adaptive attackers, as both AgentDojo and InjecAgent explicitly indicate.

## Retained-source appendix

1. **AgentDojo** — [original HTML](https://arxiv.org/html/2406.13352). Retained for dynamic, state-based prompt-injection evaluation, utility-security tradeoffs, adaptive-attack caveat, and suite-level 92% counterexample.
2. **InjecAgent** — [original HTML](https://arxiv.org/html/2403.02691v2). Retained for attack-framing sensitivity, ASR-valid denominator limitation, and author-stated single-turn/fixed-prompt limits.
3. **OSWorld** — [original HTML](https://arxiv.org/html/2404.07972v2). Retained for executable terminal-state grading, human comparator, environment-specific low-success evidence, and benchmark-grader limitations.
4. **ToolEmu** — [original HTML](https://arxiv.org/html/2309.15817). Retained for LM-emulated environment/evaluator validation rates and the distinction between discovery and safety validation.
5. **Anthropic, “Demystifying evals for AI agents”** — [original page](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). Retained for outcome-versus-trajectory semantics, repeatability metric interpretation, and grader calibration limits.