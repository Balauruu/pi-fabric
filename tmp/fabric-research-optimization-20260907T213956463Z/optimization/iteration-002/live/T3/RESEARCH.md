# Tool-Using Agent Evaluation, Reliability, and Security Boundaries

**Scope:** decision-grade guidance as of 2026-09-07.

## Answer

A tool-using agent should not be deployed autonomously on the basis of a clean-task score or prompt-injection defense result. Deploy only narrowly scoped task classes after demonstrating:

1. Authorized final-state completion, including required user-facing output and prohibited-side-effect checks.
2. Repeated-run consistency, not only one-run success.
3. Bounded diagnosis, recovery, rerouting, and safe abort under injected tool faults.
4. Security utility under attack, with authorization enforced outside the model.

No cited benchmark proves a production system secure or supplies production incident rates.

## R1. Primary evaluations and guidance

| Source | Environment and method | Agent/model and comparator | Outcomes | Decision use |
|---|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | Stateful retail and airline customer-service APIs. Reward requires annotated final database state **and** required response content. `gpt-4-0613` simulates users. Episodes allow at most 30 actions. Agent temperature 0.0, user temperature 1.0, at least three trials per task. | Function-calling agents, including GPT-4o. Repeated-run `pass^k` requires every one of *k* independent trials to pass. | GPT-4o achieved about 61% Retail and 35.2% Airline one-run success. Best Retail configuration exceeded 60% `pass^1` but had `pass^8` below 25%. Retail evaluation cost was $0.38 agent plus $0.23 user simulation per task, about $200 per full benchmark trial. | Measure persisted state and required output. Report both one-run success and all-pass repeated-run reliability. |
| [ToolMaze](https://arxiv.org/html/2606.05806) | 400 generated DAG base tasks, 100 at each of four topology levels, expanded to 2,000 clean and faulted instances using 270 simulated tools. Explicit/implicit and transient/permanent faults. 25-step cap, temperature 1, 16,000-token cap. | Six open-weight models plus GPT-5.5, Claude-Sonnet-4.6, and Gemini-3.1-Pro-Preview. Standard tool prompt compared with failure-aware prompting. | TSR measures completion. PRR measures recovery conditional on a perturbation. RC measures excess recovery calls. Mean PRR was 81.44% for explicit-transient faults and 38.12% for explicit-permanent faults. Implicit-permanent faults had PRR below 20% and RC above 70%. Explicit-to-implicit PRR gap averaged 37.15 percentage points. Clean TSR improved 17.85 pp per open-model size order, versus 4.88 pp for PRR. | Clean completion is not recovery evidence. Test diagnosis, bounded retries, permitted fallback, safe abort, and excess calls independently. |
| [AgentDojo](https://arxiv.org/html/2406.13352v3) | Stateful adversarial environment with 70 tools, 97 user tasks, 27 injection targets, and 629 security cases across four environments. Deterministic utility and security functions inspect output and pre/post state. | Official API tool-calling agents including GPT-4o, Claude, Gemini, Llama, and Command R+. Defenses compared against no defense. Results include 95% proportion confidence intervals. | GPT-4o under the “Important message” injection: benign utility 69.00% ±3.61, utility under attack 50.08% ±3.91, targeted attack success 47.69% ±3.90. Under the paper’s strongest attack, no defense had 57.69% ±3.9 targeted ASR; preplanned tool filtering reduced it to 6.84% ±2.0, with benign utility 73.13% ±3.5 and utility under attack 56.28% ±3.9. Estimated GPT-4o costs: $35 security suite and $4 utility suite. | Measure legitimate-task completion and harmful state changes together. A defense can reduce ASR while changing utility. |
| [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | Prompt-injection guidance. | Not a comparative agent evaluation. | Recommends application-held credentials, least privilege, approval for privileged actions, separation of untrusted content, and adversarial testing. States no fool-proof prevention exists. | Use as design guidance, not evidence that a control eliminates injection. |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | Voluntary AI risk-management framework. | Not agent-specific and not a certification. | Supports incorporating trustworthiness into AI design, development, use, and evaluation. | Use for governance framing, not as proof of tool-agent security. |

## R2. Limits that prevent overclaiming

- **Composite success is incomplete.** τ-bench’s final state and required-response reward is stronger than response plausibility, but the authors note that a passing state can still omit consent or violate policy. Acceptance checks therefore need authorization and prohibited-side-effect invariants.
- **Repeated-run evidence is distinct from recovery evidence.** τ-bench demonstrates stochastic consistency through `pass^k`. ToolMaze does not report repetitions, confidence intervals, or monetary cost. Its recovery findings are controlled diagnostic evidence, not production reliability estimates.
- **Simulator transfer is limited.** τ-bench uses simplified policies, APIs, and an LM user simulator. ToolMaze uses procedural DAGs. Neither establishes reliability in open web, financial, identity, coding, or organization-specific workflows.
- **Security suites have bounded attack coverage.** AgentDojo does not establish resistance to adaptive attackers, compromised tools, confused-deputy failures, supply-chain compromise, multimodal attacks, or attacks requiring the same capability legitimately needed by the user task.
- **Filtering is not authorization.** AgentDojo’s tool filter is effective where task-required tools can be selected before untrusted content and malicious actions require different tools. The paper states this condition can fail when later results determine needed tools or legitimate and malicious actions overlap. A production capability gateway is an operational control, not a measured proof from AgentDojo.
- **Versions and configurations travel with results.** [τ-bench’s repository](https://github.com/sierra-research/tau-bench) marks its original Retail and Airline tasks outdated in favor of τ³-bench. [WebArena v0.2.0](https://github.com/web-arena-x/webarena/releases/tag/v0.2.0) changed annotations, locators, and evaluator corner cases. Do not combine results across benchmark versions, model snapshots, scaffolds, tool schemas, action/retry budgets, or evaluators.

## R3. Operational decision table

| Decision condition | Control and measurement | Failure signal | Required response |
|---|---|---|---|
| State-changing or irreversible action | Application-held, least-privilege, task-scoped capability. Explicit approval for write, payment, external communication, credential, or export actions. Check final state, required output, authorization record, and audit log. | Missing approval, scope mismatch, unverified mutation, or invariant failure. | Deny or escalate. Roll back and quarantine state where possible. |
| Reliability claim | Fixed model snapshot, scaffold, tools, state seed, and budgets. Report `pass^1`, all-pass `pass^k`, failure distribution, and accepted-task cost. | Large `pass^1` to `pass^k` drop or unstable reruns. | Restrict autonomy or require review for that task class. |
| Tool timeout, error, or ambiguous result | Fault classification, idempotency-aware bounded retry, permitted alternate-tool path, and safe-abort measurement using TSR, PRR, and RC. | Repeated identical calls, step-budget exhaustion, no permitted fallback, or ambiguous response. | Stop, preserve diagnostic trace, and escalate. |
| Semantically wrong but well-formed tool result | Independent schema, state, and provenance checks before consequential use. Test implicit as well as explicit faults. | Output passes syntax/schema but conflicts with authoritative state or provenance. | Quarantine, re-check through an independent path, or escalate. |
| Untrusted content reaches write-capable tools | Capability selection before untrusted content where feasible, tool isolation, stateful injection testing, and separate utility-under-attack and ASR reporting. | Out-of-scope call, capability expansion, export path, or unauthorized side effect. | Deny, revoke capability, record the event, and investigate the path. |

## Smallest resolving evaluation

**Decision:** whether a named agent may autonomously execute one bounded, low-risk state-changing tool class.

1. Select representative tasks from that class, including normal completion, explicit transient failures, implicit wrong-but-valid responses, permanently blocked primary tools with permitted fallback, no-path cases, and indirect prompt injection before a write.
2. Hold model snapshot, prompt/scaffold, tool schemas, credentials, seeded state, action cap, retry cap, and approval policy fixed. Compare the baseline with capability-gateway enforcement.
3. Check authorized final state, required output, authorization records, prohibited mutations, and audit invariants deterministically.
4. Measure one-run and all-pass repeated-run success, TSR, conditional PRR, recovery cost, safe-abort rate, retry/tool-call counts, latency, unauthorized-side-effect rate, targeted attack success, and utility under attack.
5. Account for model, tool, retry, checking, and reviewer cost per accepted task. Unknown components remain unknown.
6. The risk owner sets thresholds. Permit autonomy only when every unauthorized action is denied, agreed repeated-run and final-state thresholds are met, and no-path cases escalate within budget. Otherwise narrow capabilities or retain human approval.

## Coverage and stop reason

| Requirement | Coverage | Disposition | Remaining decision consequence |
|---|---|---|---|
| R1: primary evaluations or standards | τ-bench, ToolMaze, AgentDojo, OWASP, and NIST distinguish measured environments from guidance. | Qualified | These sources support evaluation design, not a universal model ranking or a production-security conclusion. |
| R2: counterevidence and transfer limits | Evaluator incompleteness, simulation limits, attack-coverage limits, recovery-method limits, and version drift are retained. | Supported | Results must be rerun against the actual tools, credentials, threat model, and acceptance checks. |
| R3: deployment controls | Final-state checks, repeated runs, fault injection, bounded recovery, least privilege, and attack/utility measurement follow the measured constructs and guidance. | Qualified | Approval policy, rollback semantics, and thresholds require target-system and risk-owner decisions. |

Work stops at source-bound coverage of final-state success, recovery, repeated-run reliability, security-utility trade-offs, and their material limits. The highest-impact next check is the resolving evaluation against the actual tool and authorization surface.

## Source appendix

| Source | Type/date | Method or evidence form | Supported claim | Important limitation |
|---|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | Original benchmark paper, ICLR 2025 | Stateful customer-service APIs, composite state/output reward, repeated-run `pass^k`, cost estimate | Final-state success and repeated-run reliability differ materially. | LM user simulation, simplified domains, incomplete policy/consent coverage. |
| [ToolMaze](https://arxiv.org/html/2606.05806) | Original benchmark paper, 2026 | Procedural DAG tasks with explicit/implicit and transient/permanent tool faults, TSR/PRR/RC | Clean success scales differently from fault recovery. | Simulated tools and DAGs, no production incident rate, repetitions, confidence intervals, or cost estimate. |
| [AgentDojo](https://arxiv.org/html/2406.13352v3) | Original benchmark paper, NeurIPS 2024 | Deterministic state-based utility/security functions across 629 cases, defense comparison with 95% CIs | Prompt-injection defenses have measurable security-utility trade-offs. | Defined simulated attacks do not establish broad production security. |
| [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | Original OWASP guidance, 2025 | Prompt-injection mitigation guidance | Least privilege, application-held credentials, approval, and adversarial testing are prudent controls. | Guidance, not measured proof of effectiveness. |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | Official framework page, updated 2026 | Voluntary AI risk-management guidance | Governance framework for trustworthy AI practice. | Not tool-agent-specific, a certification, or empirical control evidence. |
| [τ-bench repository](https://github.com/sierra-research/tau-bench) | Official repository, accessed 2026-09-07 | Benchmark maintenance notice | Original Retail and Airline tasks are outdated relative to τ³-bench. | Does not supply comparable τ³ measurements. |
| [WebArena v0.2.0](https://github.com/web-arena-x/webarena/releases/tag/v0.2.0) | Official release, 2024 | Release notes | Evaluator/data changes can alter benchmark comparability. | Not evidence of tool-agent reliability or security. |