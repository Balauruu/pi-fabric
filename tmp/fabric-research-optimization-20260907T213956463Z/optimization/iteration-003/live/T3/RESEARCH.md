# Tool-Using Agent Evaluation: Reliability and Security Boundaries

## Answer and scope

As of 2026-09-07, no benchmark result establishes that a tool-using agent is generally reliable or secure in production. The strongest evidence supports using stateful, final-state evaluation for task success and security outcomes, repeated trials for reliability, calibrated evaluators, and explicit testing of recovery and tool-provenance failures.

Results below apply only to each benchmark’s models, tool environment, attack suite, evaluator, and configuration.

## Evidence-backed evaluation findings

| Evidence | What it measures | Result and conditions | Deployment meaning |
|---|---|---|---|
| E1: [ToolBench-X v1, Figure 4](https://arxiv.org/html/2606.25819v1#Sx4.F4) | Recovery from injected tool hazards | Across 200 tasks, five models, and injected recoverable hazards, oracle-like diagnostic hints improved performance by **25.5–35.5 percentage points**, recovering about **60–80%** of baseline-to-oracle loss. Ten additional rounds improved only **3.5–11.5 points**. | Evaluate diagnosis and recovery separately from allowing more retries. Synthetic recoverable hazards do not demonstrate production incident recovery. |
| E2: [ToolBench-X v1, Appendix A](https://arxiv.org/html/2606.25819v1#A1.SS2) | Final-answer scoring validity | Backend exact match agreed with independent human semantic judgment on **97/100 (97.0%)** instances in a stratified random sample of 100 retained cases. | Exact-match scoring can be suitable for that final-answer surface, but does not validate trajectories, recovery, or safety. |
| E4: [τ-bench, §5.1 and Figure 4](https://arxiv.org/html/2406.12045#S5) | Stateful task success and repeated-run reliability | In deterministic retail and airline environments with a GPT-4-0613 user simulator and at least three trials per task, GPT-4o function calling achieved retail pass¹ of about **61%** and airline pass¹ of **35.2%**. Retail pass⁸ was **under 25%**. | One-shot success is not sufficient for reliability claims. Do not exponentiate aggregate pass¹ to estimate passᵏ. |
| E3: [AgentDojo v3, Appendix C Table 5](https://arxiv.org/html/2406.13352v3#A3.T5) | Prompt-injection security and utility under attack | In 629 security cases for the authors’ GPT-4o, no defense had targeted ASR **57.69% ± 3.9** and utility under attack **50.01% ± 3.9**. A tool filter had ASR **6.84% ± 2.0** and utility **56.28% ± 3.9**. | Measure attack success and task utility together. This only supports the tested filter, attack family, validator, and bounded stateful environment. |
| E5: [AgentProp-Bench v2, §5 Table 2](https://arxiv.org/html/2604.16706v2#S5.T2) | Automated evaluator calibration | On a stratified P2 sample of 100 traces, two blinded human annotators had κ **0.835** and **92%** raw agreement. GPT-4o-mini had κ **0.567** and a three-LLM ensemble κ **0.432**. The substring heuristic had κ **0.049** against one annotator, **0.015** against the other, and **0.036** against consensus. | Calibrate the actual automated evaluator against blinded local human judgments before using it for release decisions. These are not universal κ thresholds. |
| E6: [AgentProp-Bench v2, §8 Table 7](https://arxiv.org/html/2604.16706v2#S8.T7) | Tool-use provenance and apparent injection rejection | In P2 semantic-wrong traces with deterministic simulated tools, Gemini-2.0-Flash made parseable tool calls in **5%** of traces. Among traces with no parseable tool call, it fabricated tool use in **37.5%**. | A low apparent attack-success rate can reflect non-use or fabricated provenance rather than safe refusal. Record tool-call adherence and provenance. |
| E7: [ToolEmu v2, validation](https://arxiv.org/html/2309.15817v2#S4.SS3) and [limitations](https://arxiv.org/html/2309.15817v2#S7) | Emulated-tool risk detection | With GPT-4 emulation and evaluation across 144 cases and 36 toolkits, evaluator precision/recall were **75.3%/73.1%**. Held-out human precision/recall were **78.7%/78.8%**. An adversarial emulator’s identified-failure precision was **68.8% ± 6.7%**. | Emulation is useful for risk screening, not evidence that harms are absent. Complex and adversarial constraints may be omitted. |

## Counterevidence and transfer limits

[Firewalls or Stronger Benchmarks? v2](https://arxiv.org/html/2510.05244v2#S7) found that public prompt-injection outcomes can be highly sensitive to attack construction and benchmark configuration. For GPT-4o without a defense on ASB, reported ASR changed from **70%** under forced attacker-tool inclusion to **9.25%** when the **agent** could freely select from the full tool set, in which attack tools remained available but were no longer forcibly included. This defense-authored preprint motivates fixed-version, adaptive retesting. It does not invalidate all prior benchmark results.

The benchmarks also have material transfer limits:

- Simulated users, APIs, databases, and tools do not reproduce production permissions, outages, ambiguous requests, or adversarial adaptation.
- Final-state success can conceal unsafe or wasteful trajectories.
- Attack success is conditional on the attack family, tool surface, defense, evaluator, and state validator.
- Emulator and LLM-judge errors mean measured failure rates are lower-bound screening signals, not complete harm detection.
- Scores from differently configured models, prompts, scaffolds, tool sets, retry budgets, evaluators, and benchmark versions are not a common leaderboard.

## Operational controls

1. **Gate consequential actions by deterministic state checks.** Require authorization, allowlisted tool scopes, constrained parameters, and auditable final-state validation before irreversible actions.
2. **Measure repeated success.** Report pass¹ and repeated-run outcomes separately, with task-level retries, loops, latency, tool calls, and total accepted-task cost.
3. **Treat recovery as a tested capability.** Inject representative recoverable failures and compare a fixed diagnostic intervention with equal-budget extra rounds.
4. **Test security and utility jointly.** For each attack suite, report targeted ASR, benign-task utility under attack, tool-call rate, tool-call provenance, and out-of-scope attempts.
5. **Calibrate evaluators locally.** Use blinded human review of a stratified trace sample to measure agreement with the release evaluator. Escalate disagreement, uncertain judgments, and provenance anomalies.
6. **Keep autonomy bounded by evidence.** Benchmark passage supports deployment only within the tested tool class and controls. It does not prove general prompt-injection security.

## Deployment decision table

| Deployment decision | Evidence gate | Failure signal | Bounded action |
|---|---|---|---|
| Permit read-only, reversible tasks | Per-task repeated final-state success and calibrated evaluation | Fabricated tool use, false completion, or unstable passᵏ | Restrict credentials to read-only scope, retain traces, and require deterministic result checks. |
| Permit bounded writes | Paired benign and adversarial results, authorization compliance, and recovery evidence for the same agent and tool budget | Unauthorized write, injected side effect, retry loop, or failed post-recovery validation | Use least-privilege scopes, idempotency keys, rate limits, rollback where available, and limit autonomy to the passing task class. |
| Permit irreversible or high-impact writes | Production-like task and attack evaluation with deterministic authorization and policy checks | Any authorization or policy-evaluator disagreement, irreversible duplicate effect, or provenance anomaly | Require human confirmation at commit, dual control, and independent policy enforcement. |
| Claim general security or reliability | No supporting evidence from these evaluations | N/A | Do not make the claim. State the tested task class, tool permissions, model and scaffold version, attack set, evaluator, and residual risk. |

## Smallest resolving evaluation

**Decision:** whether a candidate agent may autonomously execute a defined class of production tool actions.

Use representative tasks that include normal completion, recoverable tool/API failure, ambiguous authorization, indirect prompt injection, and provenance checks. Compare the candidate configuration with the proposed controls under identical model version, prompts, tools, permissions, task set, action budget, retry policy, and evaluator. Randomize task order and blind human reviewers where judgment is necessary.

Use deterministic final-state correctness and policy compliance as primary acceptance checks. Record targeted attack success, benign-task utility under attack, recovery after injected failures, tool-call adherence, fabricated tool-use rate, retries or loops, latency, reviewer defects, and total cost per accepted task including model, tools, retries, branches, and verification.

Screen the smallest task set that covers each decision-changing failure mode. Repeat close finalists or unstable configurations. Adopt only if the controlled configuration meets the organization’s predeclared acceptance thresholds without a material increase in policy violations, provenance failures, or total accepted-task cost. Thresholds remain a product-risk decision, not a benchmark-derived universal constant.

## Coverage and stop reason

| Requirement | Coverage |
|---|---|
| R1: Evaluations and standards | Qualified. ToolBench-X, τ-bench, AgentDojo, AgentProp-Bench, and ToolEmu provide source-bound measures of success, recovery, evaluator quality, provenance, and security-relevant outcomes. |
| R2: Counterevidence and limits | Supported. Simulator limits, evaluator recall limits, repeated-run degradation, and benchmark-design sensitivity constrain transfer. |
| R3: Actionable controls | Qualified. Controls follow from measured failure modes, but no retained source supports a universal autonomy, ASR, passᵏ, or evaluator-agreement threshold. |

The evidence stop point is fixed-version coverage of the material evaluation surfaces and their principal transfer limits. The highest-impact next check is the resolving evaluation above using the intended production tool class, permissions, and acceptance thresholds.

## Source appendix

| Source | Type/date | Evidence form and supported claim | Important limitation |
|---|---|---|---|
| [ToolBench-X v1](https://arxiv.org/html/2606.25819v1) | Research preprint, 2026-06 | Injected-hazard recovery comparison and final-answer scorer validation. | Oracle-like diagnostic hints and synthetic recoverable paths do not establish production recovery. |
| [τ-bench](https://arxiv.org/html/2406.12045) | Research paper/preprint, 2024-06 | Stateful task benchmark with repeated-run pass metrics. | Simulated retail and airline domains with a simulated user. |
| [AgentDojo v3](https://arxiv.org/html/2406.13352v3) | Research paper/preprint, 2024-06 | Deterministic security/utility evaluation of attacks and a tool filter. | Fixed attack family, validator, and bounded environment. |
| [AgentProp-Bench v2](https://arxiv.org/html/2604.16706v2) | Research preprint, 2026-04 | Human-versus-automated evaluator calibration and tool-provenance findings. | One benchmark, small calibration sample, simulated tools, and version-sensitive values. |
| [ToolEmu v2](https://arxiv.org/html/2309.15817v2) | Research paper/preprint, 2023-09 | Emulator and evaluator precision/recall validation across toolkits. | Emulation can omit critical constraints, particularly in complex or adversarial cases. |
| [Firewalls or Stronger Benchmarks? v2](https://arxiv.org/html/2510.05244v2) | Defense-authored research preprint, 2025-10 | Benchmark-audit evidence that ASR changes with attack and tool-selection configuration. | Supports adaptive fixed-version retesting, not wholesale rejection of prior benchmark findings. |