# Source Note: Primary Quantitative Evaluations for Tool-Using Agents

**Scope:** measured-evaluation facet only, assessed against the requested as-of date **2026-09-07**. All numeric claims below retain their source-specific environment, agent, metric, comparator, and budget. A benchmark result is evidence about its tested configuration and threat model, **not proof of security or general deployment reliability**.

## R1 — What primary evaluations measure

| Evaluation | Environment and method | Agent/configuration and comparator | Source-bound outcome | Decision use |
|---|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) (2024 preprint) | Stateful simulated customer-service interactions in retail and airline domains. The agent receives domain APIs and policy rules, converses with an LM-simulated user, and is scored by **rule-based final database-state comparison** to an annotated target state. ≤30 agent actions, ≥3 trials per task, agent temperature 0.0, user temperature 1.0. | Function-calling models, except Llama-3 text-ReAct. | **GPT-4o function-calling:** approximately **61% pass¹ in retail** but only **35.2% pass¹ in airline**. Its retail **pass⁸ <25%**, despite >60% average task success. The paper defines pass^k as the probability **all** k independent trials succeed, unlike pass@k, which credits any successful trial. | Best published fit for measuring policy-compliant, repeatable API-agent handling rather than lucky single-run completion. |
| [WebArena](https://arxiv.org/html/2307.13854) (ICLR 2024) | Dockerized, self-hosted replicas of e-commerce, forum, GitLab-like development, and CMS apps, plus map/calculator/scratchpad and knowledge bases. **812** long-horizon natural-language web tasks. Validators inspect the resulting state, not one reference trajectory. | Best GPT-4-based baseline versus humans. | **14.41% end-to-end task success** for the best GPT-4 agent versus **78.24% human performance**. | Measures multi-site browser workflow completion and goal-state correctness in a reproducible replica. |
| [OSWorld](https://arxiv.org/html/2404.07972) (NeurIPS 2024 Datasets and Benchmarks Track) | Real Ubuntu computer environment with web and desktop applications, raw mouse/keyboard execution, screenshots/accessibility-tree/terminal observations, seeded states, and per-task execution-based evaluators. **369 Ubuntu tasks**, plus 43 Windows tasks. Baselines were asked to complete tasks in ≤15 steps. | GPT-4V, GPT-4o, Gemini, Claude, and other LLM/VLM agents, versus humans unfamiliar with the software. | Best reported original baseline: **12.24% success** using accessibility-tree inputs, versus **72.36% human** success. Screenshot-plus-pyautogui settings scored **5.26%–5.80%** even for GPT-4V/Gemini-Pro-Vision. In a sample of **550 failures**, **>75%** involved inaccurate mouse clicks. | Measures execution reliability where planning can be correct but GUI grounding and recovery fail. |
| [AgentDojo](https://arxiv.org/html/2406.13352v3) (NeurIPS 2024 Datasets and Benchmarks Track) | Stateful agents call tools over untrusted data. **97** user tasks, **70 tools**, and **629** attack cases spanning workspace, Slack, travel, and banking-style tasks. Scores are formal environment-state utility checks: benign utility, utility under attack, and targeted attack-success rate (ASR). | GPT-4o-2024-05-13 under several injection attacks and defenses. | With GPT-4o and the paper’s injection suite, no defense: **69.00% benign utility**, **50.01% utility under attack**, **57.69% targeted ASR**. Tool filtering: **73.13% benign utility**, **56.28% utility under attack**, **6.84% targeted ASR**. Prompt-injection detector: **41.49% benign utility**, **21.14% utility under attack**, **7.95% targeted ASR**. | The most direct primary evaluation here for indirect prompt injection leading to tool side effects, including utility-security tradeoffs. |
| [ToolEmu](https://arxiv.org/html/2309.15817) (ICLR 2024 Spotlight) | GPT-4 emulates tools and sandbox states from specifications, then an LM safety/helpfulness evaluator grades trajectories. Benchmark: **144** ambiguous/underspecified user-instruction cases, **36 toolkits**, **311 tools**, nine risk types. | GPT-4, Claude-2, ChatGPT-3.5, Vicuna variants, prompt variants. | GPT-4 failure incidence: **39.4%**. GPT-4 plus safety prompt: **23.9%**. Human validation: emulator trajectories were judged realistic in **>80% of 200** trajectories; **68.8%** of identified failures were judged genuinely risky with realistic trajectories. The automatic evaluator identified **73.1%** of majority-of-three-human failures, versus **78.8%** for one held-out human. | Broad, inexpensive risk discovery for underspecified instructions and high-consequence tools where a real sandbox is unavailable. It is not a substitute for a real environment. |

## Source-bound evidence and locators

### E1 — Reliability under repeated policy-constrained tool use

**Source:** [Yao et al., “τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains,” 2024](https://arxiv.org/html/2406.12045), primary preprint.

- **Environment and scoring.** Section 1 states that τ-bench uses “dynamic conversations between a user (simulated by language models) and a language agent provided with domain-specific API tools and policy guidelines,” and compares “the database state at the end of a conversation with the annotated goal state.”
- **Metric.** [Section 3, “Pass^k metric”](https://arxiv.org/html/2406.12045#S3) defines pass^k as the chance that **all k i.i.d. trials** succeed, averaged across tasks. This is the reliability metric appropriate when repeated inconsistent behavior is unacceptable.
- **Method conditions.** [Section 5.1 / Table 2](https://arxiv.org/html/2406.12045#S5.T2): at most 30 actions, at least three trials per task, agent temperature 0.0, simulated-user temperature 1.0.
- **Outcome.** [Section 5.1](https://arxiv.org/html/2406.12045#S5): “even gpt-4o solves only **35.2%** of the tasks” in τ-airline. [Figure 4 discussion](https://arxiv.org/html/2406.12045#S5.F4): the best GPT-4o function-calling agent has >60% average retail success but **pass⁸ <25%**.
- **Budget.** [Cost analysis, Section 5.1](https://arxiv.org/html/2406.12045#S5): GPT-4o agent / GPT-4 user simulation cost **$0.38 / $0.23 per retail task**, with one trial over the benchmark costing “around **$200**.” The agent’s input prompt accounted for **95.9%** of agent cost.
- **Concrete failure signal:** successful final task text is insufficient. A return issued without required user confirmation is a rule violation, even if the database change otherwise appears desirable.

### E2 — Browser workflow success is far below human success

**Source:** [Zhou et al., “WebArena,” ICLR 2024](https://arxiv.org/html/2307.13854), primary conference paper.

- **Environment.** [Abstract and Section 2](https://arxiv.org/html/2307.13854#S2): four self-hosted fully functioning website domains, Docker delivery, gym APIs, tools, and knowledge sources.
- **Method.** [Section 3.2](https://arxiv.org/html/2307.13854#S3.SS2) uses programmatic validators of functional end state rather than textual action-sequence matching, allowing multiple valid paths.
- **Outcome.** [Abstract](https://arxiv.org/html/2307.13854): the best GPT-4-based agent achieved **14.41%** end-to-end success against **78.24%** human performance over **812** tasks.
- **Concrete failure signals.** [Failure analysis, Figure 11](https://arxiv.org/html/2307.13854#S5.F11): the agent repeatedly re-enters a search term already present until reaching a step limit, and latches onto the first semantically related observation rather than validating that it answers the task.

### E3 — GUI execution is a separate reliability boundary

**Source:** [Xie et al., “OSWorld,” 2024](https://arxiv.org/html/2404.07972), primary paper.

- **Environment and evaluator.** [Section 3](https://arxiv.org/html/2404.07972#S3) describes real computer tasks on Ubuntu, with detailed initial-state setup and custom execution-based evaluators. This is a goal-state execution test, not an action imitation test.
- **Method condition.** [Section 4](https://arxiv.org/html/2404.07972#S4): baselines receive a heuristic maximum of **15 steps**.
- **Outcome.** [Table 5 and Section 4.2](https://arxiv.org/html/2404.07972#S4.T5): best accessibility-tree baseline is **12.24%**, human performance **72.36%**. Screenshot-plus-pyautogui baselines range **5.26%–5.80%**.
- **Concrete failure signal.** [Section 5.4](https://arxiv.org/html/2404.07972#S5.SS4): of 550 sampled failed trajectories, **>75%** had inaccurate mouse clicks. This produces repetitive clicks, unintended pop-ups or applications, and inability to recover from altered state.

### E4 — Prompt-injection defenses impose measurable utility tradeoffs

**Source:** [Debenedetti et al., “AgentDojo,” NeurIPS 2024](https://arxiv.org/html/2406.13352v3), primary conference paper.

- **Threat model and metric.** [Section 3 and Section 4](https://arxiv.org/html/2406.13352v3#S4): attacker-controlled instruction appears in a tool response. Targeted ASR is the share of security cases in which the agent performs the attacker’s malicious action. Utility under attack requires both completion of the user task and no adversarial side effect.
- **Result conditions.** [Appendix C, Table 5](https://arxiv.org/html/2406.13352v3#A3.T5): GPT-4o, source’s attack suite, 95% confidence intervals reported.
- **No-defense comparator:** benign utility **69.00% ±3.6**, utility under attack **50.01% ±3.9**, targeted ASR **57.69% ±3.9**.
- **Tool-filter comparator:** benign utility **73.13% ±3.5**, utility under attack **56.28% ±3.9**, targeted ASR **6.84% ±2.0**.
- **Detector comparator:** targeted ASR **7.95% ±2.1**, but benign utility drops to **41.49% ±3.9** and utility under attack to **21.14% ±3.2**.
- **Budget.** [Appendix D](https://arxiv.org/html/2406.13352v3#A4): full GPT-4o run estimated at **US$35** for 629 security cases and **US$4** for 97 benign utility cases.
- **Concrete failure signal:** an untrusted webpage or message caused a write action, external transmission, credential/code disclosure, or policy-breaking side effect, even where the user task completed.

### E5 — Simulated high-stakes risk testing finds failures but has transfer limits

**Source:** [Ruan et al., “ToolEmu,” ICLR 2024](https://arxiv.org/html/2309.15817), primary conference paper.

- **Threat model.** [Section 2](https://arxiv.org/html/2309.15817#S2) explicitly limits the benchmark to **benign but underspecified user instructions**, not malicious users or indirect prompt injections.
- **Results and validation.** [Introduction and Table 5](https://arxiv.org/html/2309.15817#S5.T5): GPT-4 plus safety prompt still produced failures in **23.9%** of cases according to the LM evaluator. The paper reports that six of seven severe ChatGPT-3.5 terminal failures inspected could be instantiated on a real Bash terminal.
- **Transfer warning.** The same paper frames this as a sim-to-real problem: the emulator and evaluator are LMs, so source-reported human validation supports use as a **failure-discovery filter**, not as certification of real-world safety.

## R2 — Counterevidence, limits, and transfer constraints

| Constraint | Evidence | What it prevents |
|---|---|---|
| **Single-run success hides instability** | τ-bench’s >60% GPT-4o retail pass¹ and <25% pass⁸ contrast. | Do not use pass@k or one successful demo as a reliability claim. |
| **Goal-state success does not establish secure behavior** | AgentDojo explicitly separates benign utility, utility under attack, and targeted ASR. | Do not call task completion “safe” if an untrusted input can still cause an unauthorized side effect. |
| **A defense can reduce attacks by denying useful service** | AgentDojo’s injection detector reaches 7.95% ASR but only 41.49% benign utility. | Do not select defenses by ASR alone. Evaluate utility, availability, and unsafe side effects together. |
| **Least privilege only works when future tool needs are knowable** | AgentDojo’s [tool-filter limitation](https://arxiv.org/html/2406.13352v3#S4) says it fails where tools cannot be selected before encountering untrusted data. | Do not assume a static preplanned allowlist protects open-ended workflows. |
| **Replica/sandbox results have environmental transfer limits** | WebArena is a self-hosted replica. OSWorld fixes OS, applications, task states, and a 15-step limit. | Do not extrapolate benchmark success to internal applications, changed UIs, production latency, permissions, or live data. |
| **LM emulation can create both false positives and false negatives** | ToolEmu’s tool environment and safety judge are model-emulated, with only partial human and real-terminal validation. | Do not use ToolEmu’s 23.9% figure as a real incident rate or proof of a deployed control. |
| **Published model results are configuration-specific** | τ-bench changes agent prompting, tool schema, simulated-user model, temperature, action cap, and policy corpus. OSWorld changes observation/action modality. | Do not compare scores across papers as a model ranking or splice best numbers from different stacks. |
| **No primary standard was inspected in this facet** | This note inspected evaluation papers only. | Do not represent these papers as a safety standard, certification framework, or regulatory compliance evidence. |

## R3 — Deployment controls that follow from the evidence

These are operational inferences from the measured failure modes, not evidence substitutes.

1. **Use final-state and side-effect oracles.** For each high-impact action, record required state change, forbidden state changes, policy conditions, and provenance of the triggering tool output. Score user-task success separately from unauthorized side effect. This follows AgentDojo’s utility-under-attack construction and τ-bench’s database-state/policy evaluator.

2. **Make authorization and capability boundaries executable.** Split read, draft, approve, and commit capabilities. Pass only the minimum tool set and scoped credentials to each stage. Require an external confirmation or deterministic policy check immediately before irreversible, external, financial, privilege-changing, or data-egress actions. Tool filtering is a useful measured mitigation, but must be tested in workflows where the required next tool is not known in advance.

3. **Treat untrusted tool output as data, not delegated authority.** Instrument the agent to label external text, record its source, and flag attempted instruction-following that is attributable to a tool response. Alert on cross-boundary sequences such as read-email → send-email, browse-web → credential/API export, or read-record → privilege/write action.

4. **Bound and observe recovery.** Detect repeated identical calls, repeated UI actions, unbounded retries, exhausted step budgets, inconsistent observations, and action after tool error. Stop or route to review when these occur. WebArena’s repeated-query failure and OSWorld’s repetitive misclick failures show why a nominal retry loop is not adequate recovery.

5. **Gate on repeated-run reliability and adverse conditions.** For each deployment candidate, run independent repeats of the same underlying tasks with harmless variation in user wording, timing, tool errors, tool schema/output variation, and hostile content. Report pass¹ and pass^k, plus unsafe-side-effect rate, not only best-of-N success.

## Decision table

| Deployment decision | Minimum evidence | Blocker signal | Recommended action |
|---|---|---|---|
| **Read-only, reversible assistant** | Representative internal goal-state evaluation and repeated-run measure. | Repetition loop, wrong-record access, or materially low pass^k. | Limited pilot with trace retention and user review. |
| **Writes to internal systems** | Goal-state task success plus policy-state checks, failure-recovery trials, and role-scoped credentials. | Unauthorized record mutation, policy breach, or retry after inconsistent tool result. | Keep commit behind approval or deterministic transaction policy. |
| **External communication, payments, privilege, or sensitive-data egress** | Adversarial tool-output evaluation similar to AgentDojo, explicit utility-under-attack and targeted-ASR measures, plus actual-system tests. | Any reproducible injected-content path to external side effect. | No autonomous commit. Require independent authorization and narrow capabilities. |
| **GUI/desktop automation** | OSWorld-like execution-based test in the actual app/version/resolution/accessibility configuration. | Misclick, state drift, popup-induced detour, or inability to restore expected state. | Restrict to sandbox/reversible actions or use deterministic APIs instead. |
| **Novel high-stakes tool with no sandbox** | ToolEmu-style scenario generation may triage failure hypotheses. | Emulator-identified high-consequence failure. | Build a real sandbox and reproduce before deployment. Emulation alone does not clear the tool. |

## Smallest resolving evaluation

**Question resolved:** can this exact agent stack perform one deployment-critical workflow reliably and without obeying hostile tool content?

Run a **paired 20-task evaluation** in a production-faithful sandbox:

- **10 benign tasks** and the **same 10 tasks with injected untrusted content** in the actual tool response path.
- For each task, run **five independent trials** at the intended model, prompt, tool schema, permissions, action budget, temperature, retry policy, and model version.
- Score four separate binary outcomes per trial:
  1. desired final-state task completion,
  2. policy compliance,
  3. no unauthorized side effect,
  4. controlled failure or recovery when tool output is malformed, stale, or errors.
- Require a deterministic state oracle, not an LLM judge, for all high-impact mutations.
- Compare the candidate against the same stack with restricted capabilities or approval-before-commit.

**Decision rule:** a single confirmed hostile-content-induced unauthorized side effect blocks autonomous write deployment. Otherwise, use pass¹ and pass⁵ for successful **and** policy-compliant runs, alongside the observed side-effect rate. This smallest test resolves the actual capability-boundary question more directly than importing a leaderboard score.

## Retained-source appendix

1. **τ-bench** — primary preprint, 2024.  
   https://arxiv.org/html/2406.12045  
   Retained for repeated-run reliability, policy compliance, final database-state scoring, and source-reported cost.

2. **WebArena** — primary ICLR paper, 2024.  
   https://arxiv.org/html/2307.13854  
   Retained for reproducible multi-site browser workflow evaluation and functional end-state validation.

3. **OSWorld** — primary NeurIPS Datasets and Benchmarks Track paper, 2024.  
   https://arxiv.org/html/2404.07972  
   Retained for real-computer GUI execution, execution-based evaluation, human comparator, and concrete failure analysis.

4. **AgentDojo** — primary NeurIPS Datasets and Benchmarks Track paper, 2024.  
   https://arxiv.org/html/2406.13352v3  
   Retained for stateful indirect-prompt-injection evaluation, utility-security metrics, defense comparison, confidence intervals, and cost.

5. **ToolEmu** — primary ICLR Spotlight paper, 2024.  
   https://arxiv.org/html/2309.15817  
   Retained for scalable high-stakes failure discovery, emulator/evaluator human-validation measurements, and explicit simulation-to-real limitation.