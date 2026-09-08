## T3 research note — repeated-run reliability, evaluator validity, and security boundaries

**Status:** Complete with qualifications. Research date: 2026-09-07. Evidence concerns controlled, simulated tool-agent environments, not proof of live-deployment security or reliability.

### Requirement contract

| ID | Exact question | Required inclusions | Contribution |
|---|---|---|---|
| R1 | “which primary evaluations or standards measure tool-agent reliability, task success, failure handling, and security-relevant behavior, with exact environment, agent/model, comparator, method and outcomes?” | Primary evaluations or standards, exact environment, model, comparator, method, outcomes | Decision-grade evaluation guide |
| R2 | “what counterevidence, benchmark/evaluator limits, and transfer constraints prevent overclaiming safety or reliability?” | Counterevidence, benchmark/evaluator limits, transfer constraints | Bound claims and identify unresolved risks |
| R3 | “what actionable evaluation and operational controls follow for deploying a tool-using agent?” | Actionable controls, concrete failure signals, decision table, smallest resolving evaluation | Deployment decision and evaluation design |

## Findings

### Repeated runs measure a different property than best-of-\(k\)

[\(\tau\)-bench](https://arxiv.org/pdf/2406.12045) defines **pass\(^k\)** as the probability that **all** \(k\) i.i.d. trials of the same task succeed, averaged across tasks. Its empirical estimator for a task with \(c\) successes in \(n\) trials is \(\binom{c}{k}/\binom{n}{k}\), then averaged over tasks (Section 3, pp. 4–5). This contrasts with pass@\(k\), which is success at least once.

This matters operationally. If a particular task has stable independent per-run success probability \(p\), its all-success probability is \(p^k\). A 90% success probability implies \(0.9^8=43.0\%\) for eight flawless repeats. But the aggregate benchmark pass\(^k\) is **not generally** the aggregate pass\(^1\) raised to \(k\), because task difficulty and per-task stability differ. Estimate it from repeated runs per task.

In \(\tau\)-bench’s two simulated customer-service domains, agents interacted with deterministic database APIs, policy documents, and a stochastic GPT-4-0613 user simulator. Success required the final database to equal a unique annotated state and required response information to be present. For function-calling GPT-4o, pass\(^1\) was **61.2% retail** and **35.2% airline**. In retail, its pass\(^8\) was **under 25%**, despite pass\(^1\) over 60% (Table 2 and Figure 4, p. 7). This is direct evidence that a single-run score can substantially overstate repeated-use reliability in that environment.

### Evaluator agreement must be measured before trusting agent scores

[AgentProp-Bench](https://arxiv.org/pdf/2604.16706) audited correctness evaluators against two blinded human annotators on 100 stratified tool-agent traces. The environment used deterministic API simulators across calendar, weather, medical, knowledge, and held-out retail tasks. It collected 14,750 traces from 13 models under an identical prompted-ReAct harness where applicable.

Its evaluator comparison is decision-changing:

| Evaluator | Cohen’s \(\kappa\) against human-consensus labels | Comparator / caveat |
|---|---:|---|
| Substring heuristic | 0.036 | Near chance. |
| GPT-4o-mini judge | 0.586 | Best single judge in this 100-trace calibration set. |
| Three-LLM majority ensemble | 0.448 | Conservative: judged 25% correct where humans judged 38%. |
| Human vs. human | 0.835, 92% raw agreement | Two annotators, same-background limitation. |

Source: [Table 2 and Table 3, pp. 4–5](https://arxiv.org/pdf/2604.16706).

The study also found that low apparent injection admission can be a false reliability signal. Gemini-2.0-Flash made tool calls in only **5.0%** of tested traces and fabricated tool-derived results in **37.5%** of traces with no call, so its apparent 95% “rejection” was not evidence of secure input filtering ([Table 7, p. 8](https://arxiv.org/pdf/2604.16706)). Evaluate tool-call adherence, verified provenance, rejection, recovery, and final-state correctness separately.

### Security evaluation establishes bounded resistance, not security

[AgentDojo](https://arxiv.org/pdf/2406.13352) evaluates prompt injection in four mutable tool environments: Workspace, Slack, Travel, and Banking. It contains 97 user tasks, 27 injection goals, and 629 user-task/injection-task security cases. Agents use tools against untrusted data, while deterministic utility and attacker-goal functions inspect environment state rather than relying on an LLM judge (Sections 3–4, pp. 3–7).

Across baseline tool-calling models, most lost **10–25 percentage points of absolute utility under attack** ([Figure 6b, p. 7](https://arxiv.org/pdf/2406.13352)). For GPT-4o, attacks in the Slack suite reached **92% ASR** while one compound Travel attack reached **0%** ASR, showing that attack success is task- and capability-dependent rather than a single model property ([Figure 7, p. 8](https://arxiv.org/pdf/2406.13352)). Tool filtering, selected before observing untrusted data, reduced targeted ASR to **7.5%** in the authors’ suite, but failed when required task tools also enabled the attack, which applied to **17%** of test cases ([Section 4.3, p. 9](https://arxiv.org/pdf/2406.13352)).

Therefore, prompt filtering, delimiter prompts, and a passed benchmark are not security boundaries. Enforced tool authorization, scoped credentials, stateful approval for consequential writes, and independently verified end-state checks are boundaries.

## Counterevidence and transfer limits

- **Simulator dependence:** \(\tau\)-bench’s user is GPT-4-0613. Its authors identify simulator reasoning, memory, alignment, typos or ambiguity, and task-curation bias from tuning prompts with GPT-4-Turbo as limitations ([Discussion, p. 9](https://arxiv.org/pdf/2406.12045)). Its repeated-run result does not quantify reliability with real users.
- **Reward incompleteness:** \(\tau\)-bench explicitly says its binary reward can be necessary but insufficient, for example when an agent performs an action without required confirmation (Section 3, p. 4). Final state alone needs an authorization and policy-compliance check for consequential tools.
- **Evaluator uncertainty:** AgentProp-Bench’s ensemble remains only moderate against human labels, used two annotators and 100 traces, and has small stage-two subsamples for some models ([Limitations, p. 7](https://arxiv.org/pdf/2604.16706)). Its \(\kappa\) results justify calibration, not a universal release threshold.
- **Security coverage is attack-set bounded:** AgentDojo states its attacks and defenses are relatively simple, its task/utility specifications are manual, and it does not yet cover multimodal attacks or all multi-task persistent-context settings ([Conclusion, p. 9](https://arxiv.org/pdf/2406.13352)). A low ASR means resistance to the tested attacks under tested tool permissions.
- **Benchmark score comparability:** Model, scaffold, prompt, tool schemas, retries, user simulation, validator, task mixture, and state reset alter results. Do not rank scores from these studies as a common leaderboard.

## Deployment decision table

| Decision | Evidence needed | Failure signal | Operational control |
|---|---|---|---|
| Permit read-only, reversible tasks | Per-task repeated final-state success and evaluator calibration | Any fabricated tool use, false completion, or unstable pass\(^k\) | Read-only credentials, trace retention, deterministic result checks |
| Permit bounded writes | Paired benign/adversarial success, authorization compliance, recovery evidence | Unauthorized write, side effect after injection, retry loop | Least-privilege tool scopes, idempotency keys, rate limits, rollback |
| Permit irreversible or high-impact writes | Evidence from production-like tasks and attacks remains unresolved | Any evaluator disagreement on authorization or policy outcome | Human confirmation at commit, dual control, independent policy enforcement |
| Claim “secure” or “reliable” generally | Not supported by these evaluations | N/A | Do not make the claim. State tested environment, task class, attack set, model/scaffold version, and residual risk. |

## Smallest resolving evaluation

**Decision gap:** whether a named deployment configuration can autonomously execute a specified class of tool writes when untrusted tool outputs may contain prompt injection.

1. **Tasks:** sample representative production-derived tasks, stratified by read-only, reversible-write, irreversible-write, and cross-tool workflows. Include known failure modes: malformed arguments, missing authorization, retry/timeout, conflicting user intent, untrusted-content injection, and tool-result provenance gaps.
2. **Paired conditions:** hold model snapshot, prompt, scaffold, tool schemas, credentials, task initial state, action/token budgets, retries, and validator fixed. Randomize task order. Compare benign versus injected/untrusted-data conditions and candidate control versus no-control control.
3. **Primary acceptance:** deterministic final-state correctness **and** a separately checked authorization/policy invariant. A fluent final answer is insufficient.
4. **Repeatability:** run every task repeatedly under stochastic settings and report pass\(^1\), pass\(^k\) for a deployment-relevant \(k\), per-task outcomes, and confidence intervals. Do not infer pass\(^k\) from the aggregate pass\(^1\).
5. **Evaluator calibration:** blind two human reviewers on a stratified trace set containing successes, failures, disputed cases, and security events. Report raw agreement, Cohen’s \(\kappa\), false-positive and false-negative direction against deterministic checks where available. If agreement is inadequate for the claimed decision, retain human adjudication or redesign the validator.
6. **Record:** unauthorized side effects, attempted disallowed calls, failed recoveries, fabricated tool claims, retries, latency, tokens, tool cost, and total accepted-task cost.
7. **Decision rule:** autonomous writes remain disallowed for any task class with an unremediated authorization violation or evaluator-validity gap. Expand autonomy only for task classes whose repeated paired results meet the organization’s predeclared reliability and safety threshold. The threshold is a governance choice not supplied by the sources.

## Coverage and gaps

| Requirement | Status | Support and smallest next check |
|---|---|---|
| R1: primary evaluations with environment, agents, comparators, methods, outcomes | Supported | \(\tau\)-bench, AgentProp-Bench, and AgentDojo provide direct measurements. Next: rerun the chosen deployment snapshot in its actual tool environment. |
| R2: counterevidence, evaluator limits, transfer constraints | Supported | Simulator, reward, calibration, and adaptive-attack limits are documented above. Next: independently red-team persistent-context and multimodal surfaces if in scope. |
| R3: actionable evaluation and operational controls | Supported, qualified | Design and controls follow directly from measured failure modes. No universal pass\(^k\), \(\kappa\), or ASR threshold is evidenced. |

## Evidence anchors

1. **Claim:** Repeated-run all-success reliability can fall sharply despite moderate single-run success.  
   **Source/locator:** [\(\tau\)-bench, Table 2 and Figure 4, p. 7](https://arxiv.org/pdf/2406.12045).  
   **Result/unit:** GPT-4o function calling pass\(^1\): 61.2% retail, 35.2% airline. Retail pass\(^8\): <25%.  
   **Conditions:** 115 retail and 50 airline tasks, deterministic databases/APIs, stochastic GPT-4-0613 user simulation, domain policies.  
   **Comparator:** pass\(^1\) versus pass\(^8\); models in Table 2.  
   **Caveat:** Synthetic domains and simulated user.  
   **Question contribution:** R1 reliability measurement, R2 transfer boundary, R3 repeated-run design.

2. **Claim:** pass\(^k\) measures all-\(k\)-trial success, unlike pass@\(k\).  
   **Source/locator:** [\(\tau\)-bench, Section 3 “Pass\(^k\) metric,” pp. 4–5](https://arxiv.org/pdf/2406.12045).  
   **Result/unit:** Per-task estimator \(\binom{c}{k}/\binom{n}{k}\), averaged over tasks.  
   **Conditions:** \(n\) trials of the same semantic task.  
   **Comparator:** pass\(^k\) versus pass@\(k\).  
   **Caveat:** Aggregate pass\(^1\)^k is not the benchmark pass\(^k\) when tasks differ.  
   **Question contribution:** R1 metric interpretation and R3 evaluation design.

3. **Claim:** Automated output judges may be materially less reliable than human agreement.  
   **Source/locator:** [AgentProp-Bench, Table 2–3, pp. 4–5](https://arxiv.org/pdf/2604.16706).  
   **Result/unit:** Substring \(\kappa=0.036\) against consensus, GPT-4o-mini \(\kappa=0.586\), three-LLM ensemble \(\kappa=0.448\), human-human \(\kappa=0.835\), \(n=100\).  
   **Conditions:** Blinded two-annotator labels from stratified P2 tool-agent traces.  
   **Comparator:** Automated judges versus human labels and human-human agreement.  
   **Caveat:** Two annotators, 100 traces, one benchmark.  
   **Question contribution:** R1 evaluator agreement, R2 score-validity limit, R3 calibration requirement.

4. **Claim:** Low tool-call frequency can masquerade as robustness.  
   **Source/locator:** [AgentProp-Bench, Table 7, p. 8](https://arxiv.org/pdf/2604.16706).  
   **Result/unit:** Gemini-2.0-Flash tool-call rate 5.0%; fabricated-tool-use rate 37.5%.  
   **Conditions:** Semantic-wrong injection traces in deterministic simulated tools.  
   **Comparator:** Apparent injection rejection versus actual tool-call/provenance behavior.  
   **Caveat:** Deterministic simulators and single-parameter injection.  
   **Question contribution:** R1 failure handling, R2 counterevidence, R3 provenance checks.

5. **Claim:** Tool isolation reduced tested prompt-injection ASR but left a material uncovered class.  
   **Source/locator:** [AgentDojo, Section 4.3, p. 9](https://arxiv.org/pdf/2406.13352).  
   **Result/unit:** Tool filter targeted ASR 7.5%; tools needed for the user task also enabled the attack in 17% of test cases.  
   **Conditions:** GPT-4o, four stateful tool environments, 629 security cases.  
   **Comparator:** Tool filter versus no defense and other prompt-injection defenses.  
   **Caveat:** Fixed benchmark attacks, manual task specifications, incomplete coverage of persistent-context and multimodal attacks.  
   **Question contribution:** R1 security behavior, R2 security-transfer limit, R3 least-privilege control.