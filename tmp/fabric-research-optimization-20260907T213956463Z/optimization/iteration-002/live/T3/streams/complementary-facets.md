# Complementary-facets research note

## Question, scope, status

**Assignment:** T3 holdout, as of 2026-09-07. Complementary evidence for evaluation, reliability, and security boundaries of tool-using agents.

**Status:** Partial but decision-useful. This note inspected original benchmark papers and OWASP’s original prompt-injection guidance. It does not establish real-world incident rates, universal model rankings, or that any evaluation proves security.

### Requirement contract

| ID | Exact question | Required inclusions | Expected contribution and decision context |
|---|---|---|---|
| R1 | “which primary evaluations or standards measure tool-agent reliability, task success, failure handling, and security-relevant behavior, with exact environment, agent/model, comparator, method and outcomes?” | Exact environment, model, comparator, method, outcomes | Decision-grade guide for deploying tool-using agents |
| R2 | “what counterevidence, benchmark/evaluator limits, and transfer constraints prevent overclaiming safety or reliability?” | Counterevidence, evaluator limits, transfer constraints | Bound deployment claims and identify evidence gaps |
| R3 | “what actionable evaluation and operational controls follow for deploying a tool-using agent?” | Concrete failure signals, decision table, smallest resolving evaluation | Define deployment controls and a resolving evaluation |

## Findings

### F1. Final-state success and repeated-run reliability are distinct

[τ-bench](https://arxiv.org/html/2406.12045) evaluates multi-turn airline and retail customer-service agents against **annotated final database state**, rather than response plausibility. It runs a stochastic `gpt-4-0613` user simulator with a function-calling agent, limits episodes to **30 actions**, and used agent temperature **0.0**, user temperature **1.0**, and **at least three trials per task** for main results (§§3, 5).

For the `gpt-4o` function-calling agent, reported final-state success was approximately **61% retail** and **35.2% airline**. Repetition matters: although the best retail configuration had over 60% `pass^1`, its `pass^8` was **below 25%** (§§1, 5.1). `pass^k` requires all `k` independent trials for a task to pass, so it measures consistency rather than “at least one success.”

**Cost condition:** the paper reports **$0.38 agent + $0.23 user simulation per retail task**, or roughly **$200** for one benchmark trial over its task set (§5.1). Repeated-run reliability therefore has material evaluation cost.

**Decision implication:** require deterministic final-state validation and report both one-run success and repeated-run all-pass behavior. A response judged plausible is not a valid substitute.

### F2. Fault recovery needs its own controlled measurement

[ToolMaze](https://arxiv.org/html/2606.05806) isolates recovery from clean success. It generates **400** DAG-based base tasks, 100 at each of four topology levels, expands them into **2,000** instances across clean and four fault modes, and uses **270 simulated tools** (§§3–4). It tests explicit versus implicit and transient versus permanent tool faults, with maximum **25 steps**, temperature **1**, and a 16,000-token cap (§4.1).

Its three metrics are:

- **TSR:** final task completion.
- **PRR:** conditional recovery after an encountered perturbation. Recovery is retry for transient faults, reroute for recoverable permanent faults, or correctly abort an unsolvable task.
- **RC:** recovery-cost penalty for unnecessary calls after the fault. `RC → 0` is optimal recovery (§3.5).

Across tested models, explicit-transient faults had mean **PRR 81.44%**, while explicit-permanent faults had **38.12%**; implicit/permanent faults pushed PRR below **20%** and RC above **70%** (§4.3). The average explicit-to-implicit PRR gap was **37.15 percentage points**. Scaling improved clean TSR by **17.85 pp** per order of magnitude of open-model parameters, versus **4.88 pp** for PRR, a 3.66× gap (§4.3).

**Decision implication:** a retry counter alone is not recovery. Test diagnosis of semantically wrong but structurally valid outputs, bounded retries, rerouting, and safe aborts separately from final completion.

### F3. Security evaluation should measure authorized utility and harmful state changes together

[AgentDojo](https://arxiv.org/html/2406.13352) is a stateful, adversarial tool-agent environment with **97 user tasks** and **629 security cases** across four environments. Its evaluator is a deterministic utility function over output and pre/post environment state, avoiding an LLM judge that could itself be prompt-injected (§§3.1, 3.4).

It reports:

- **Benign utility:** task success without attack.
- **Utility under attack:** successful authorized task completion with no adversarial side effect.
- **Targeted ASR:** fraction where the attacker’s requested harmful tool actions occur (§3.4).

For `GPT-4o` on all 629 cases under the paper’s strongest attack, the defense trade-off was (§4.3, Appendix C Table 5, 95% CIs shown):

| Defense | Benign utility | Utility under attack | Targeted ASR |
|---|---:|---:|---:|
| None | 69.0% ±3.6 | 50.01% ±3.9 | 57.69% ±3.9 |
| Delimit untrusted data | 72.66% ±3.5 | 55.64% ±3.9 | 41.65% ±3.9 |
| Prompt-injection detector | 41.49% ±3.9 | 21.14% ±3.2 | 7.95% ±2.1 |
| Repeat user prompt | 85.53% ±2.8 | 67.25% ±3.7 | 27.82% ±3.5 |
| Preplanned tool filter | 73.13% ±3.5 | 56.28% ±3.9 | 6.84% ±2.0 |

The tool filter constrains the agent to tools needed for the known user task *before* it sees untrusted data. It worked especially where legitimate work was read-only and the attack required write access. The paper explicitly says it can fail when later tool results determine needed tools or multiple user tasks share a context (§4.3).

[OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) correspondingly recommends application-held credentials, least-privilege tool access, human approval for privileged actions, separation of untrusted content, and adversarial testing. OWASP also states no fool-proof prompt-injection prevention is known.

**Decision implication:** enforce authorization outside the model. A model prompt, delimiter, or detector is not an authorization boundary.

## Deployment decision table

| Decision condition | Required control | Evaluation evidence | Failure signal and bounded response |
|---|---|---|---|
| Irreversible or high-impact mutation | Separate application credential, minimum scope, explicit approval | Final-state validator checks authorized change only | Missing approval, scope mismatch, or unverified mutation: deny or escalate, never retry blindly |
| Tool error or timeout | Per-fault retry budget, fault classification, idempotency-aware retry | PRR, recovery cost, successful safe abort | Repeated identical failure, budget exhaustion, ambiguous response: stop and escalate |
| Semantically suspicious tool output | Independent schema/state/provenance check before consequential use | Implicit-fault tests, not just HTTP-error tests | Valid-shaped but inconsistent result: quarantine, re-query through independent path, or escalate |
| Untrusted retrieved content plus write-capable tools | Preplanned allowlist/tool isolation and stateful injection testing | Utility under attack and targeted ASR | Attempted out-of-scope tool call or exfiltration path: deny and log |
| Claimed reliability | Repeated isolated runs and final-state checks | `pass^1`, all-pass repeated-run metric, distribution of failures and cost | Large single-vs-repeated-run gap: do not automate at that risk level |

## Counterevidence and limitations

- **L1: Benchmark transfer.** τ-bench simplifies APIs, policies, and domains, and uses an LLM user simulator. Its authors identify instruction ambiguity, incomplete domain knowledge, simulator reasoning/context limitations, difficult manual annotation, and curation bias from using `gpt-4-turbo` during prompt refinement (§6). Its scores do not establish airline, retail, or production-agent reliability.
- **L2: Recovery transfer.** ToolMaze’s exact recovery ground truth comes from controlled procedural DAGs. It does not cover open web workflows, cascading faults, adversarial injection, or complex multi-hop failures (Limitations). Its recovery numbers cannot be treated as production outage rates.
- **L3: Security transfer.** AgentDojo evaluates simulated environments and relatively simple initial attacks/defenses. It lacks multimodal attacks, may need automated task/utility construction to scale, and its tool-filter result does not cover evolving multi-task contexts (§5). Its ASR is neither an incident probability nor proof that a defense secures another system.
- **L4: Evaluator validity.** Final-state deterministic checking is stronger for stateful work than response-only LLM judging, but only if the target state and prohibited side effects are complete. A deterministic checker with an incomplete harm model can still miss security failure.
- **L5: Benchmark/version drift.** τ-bench’s repository warns that its original airline and retail tasks are outdated and directs users to a later τ³-bench release. Do not mix results across these versions or use the original score as a current leaderboard.

## Smallest resolving evaluation

**Disputed deployment decision:** whether a specific agent may autonomously perform a bounded class of state-changing tool tasks.

1. Select representative tasks that include normal completion, transient errors, permanent authorization errors, semantically corrupted tool responses, and indirect prompt injection before a write action.
2. Hold model snapshot, scaffold, tool schemas, credentials, state seed, action cap, retry cap, and approval policy fixed. Run clean and fault/attack variants separately.
3. Use deterministic final-state and side-effect validators. Score authorized final-state success, unauthorized mutation/exfiltration, PRR, safe-abort rate, retries/tool calls, latency, and total accepted-task cost.
4. Repeat each stochastic task enough to estimate the deployment-relevant all-pass behavior. Do not report only best-of-run success.
5. The risk owner must set the acceptance thresholds. Automation should remain disabled for any task class with unauthorized side effects, unbounded recovery loops, or an unresolved gap between clean success and repeated/faulted success.

## Coverage and gaps

| Requirement | Coverage | Status | Next check and stop reason |
|---|---|---|---|
| R1: primary evaluations or standards with environment, method, comparator, outcomes | τ-bench, ToolMaze, AgentDojo, and OWASP guidance inspected | Supported, qualified | Inspect the candidate system under its actual tool, credential, and evaluator configuration. Stopped after complementary evidence covered all named facets. |
| R2: counterevidence, evaluator limits, transfer constraints | Source-specific limitations and version drift retained | Supported | Compare target tasks and threat model to benchmark task/model versions before transfer. |
| R3: actionable controls | Authorization boundary, final-state evaluation, bounded recovery, adversarial tests, and decision table provided | Qualified | Thresholds and approval policy require risk-owner input and target-system testing. No benchmark proves security. |

## Retained-source appendix

| Source | Type/date | Method and supported claim | Important limitation |
|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | Original paper, 2024 | Stateful final database comparison and repeated-run `pass^k`; `gpt-4o` retail/airline outcomes and cost | Simulated users, simplified domains, original benchmark version superseded |
| [ToolMaze](https://arxiv.org/html/2606.05806) | Original paper, 2026 | Controlled transient/permanent and explicit/implicit fault recovery with TSR, PRR, RC | Procedural DAGs, not open-world or adversarial fault conditions |
| [AgentDojo](https://arxiv.org/html/2406.13352) | Original paper, 2024 | Deterministic state-based utility, utility-under-attack, ASR, and defense trade-offs | Simulated environments and incomplete adaptive/multimodal coverage |
| [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | Original OWASP guidance, 2025 | Least privilege, app-held credentials, approval, content separation, adversarial testing | Guidance, not measured evidence that controls eliminate prompt injection |