# Tool-using agents: evaluation, reliability, and security boundaries

## Answer and scope

**Decision:** benchmark evidence supports a gated deployment qualification process, not autonomous authority or a claim of production security. Evaluate final-state task success, repeated-run reliability, recoverable failure, provenance, and security utility jointly in a production-equivalent sandbox. Put authorization, idempotency, transaction limits, and auditability outside the model.

This guide covers tool-using agents as of **2026-09-07**. No inspected formal standard directly measures tool-agent reliability or production security. The [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) is voluntary governance guidance, not such a measurement. Results below remain **partial** until they are reproduced against the target tool permissions, state transitions, threat model, and impact tolerance.

## Evaluations and what they establish

### Repeated-run reliability

[τ-bench](https://arxiv.org/html/2406.12045) evaluates retail and airline customer-service agents against final database state, using simulated users, policy prompts, and APIs. Its `pass^k` is the probability that **all** `k` independent trials succeed, unlike `pass@k`, which accepts at least one success. Main runs used agent temperature `0.0`, simulated-user temperature `1.0`, at least `3` trials per task, and at most `30` actions per task. This is the appropriate measure for an operation that must succeed every time, but three runs do not tightly estimate high-`k` reliability.

Under that paper's function-calling configuration, GPT-4o achieved airline `pass^1 = 35.2%`. On retail, GPT-4o was about `61% pass^1` but below `25% pass^8`. The comparator is sampled conversational variation of the same underlying task, not another model. A useful one-run average therefore does not establish repeatable execution.

### Recoverable failure and evaluator validity

[AgentProp-Bench](https://arxiv.org/html/2604.16706v2) uses deterministic Python/JSON-schema tools and one schema-valid, semantic parameter corruption before first execution. It contains `2,000` core tasks, `14,750` traces, and `13` agents at temperature `0`. It separates rejection before execution, conditional recovery after an executed corrupted call, tool-call rate, fabricated tool use, and final answer correctness.

The mean across its 13 models for the **execution-to-wrong-answer hop** was about `0.62`. That is not an unconditional injection-to-error rate. The pooled raw hop was `217/271 = 0.80`, and the human-calibrated estimate was about `0.65`. Rejection and recovery were not monotonically related (`Spearman ρ = 0.041`, `p = 0.893`, `n = 13`), so one robustness score obscures distinct failure modes. In the P2 semantic-wrong condition, GPT-4.1-nano had `37.5%` rejection and `2.9%` recovery. Gemini-2.0-Flash called tools in only `5%` of traces but fabricated tool-derived results in `37.5%`, so its apparent `95%` rejection is not evidence of safe filtering.

The same source calibrated answer grading on `100` P2 traces independently labeled by two blinded annotators. Human agreement was `κ = 0.835` and `92%` raw agreement. Against those labels, substring matching had `κ = 0.049` and `0.015` against the respective annotators, a three-LLM majority ensemble had `κ = 0.432`, and a GPT-4o-mini judge had `κ = 0.567`. The ensemble marked `25` traces correct where humans marked `38`, rejecting `19` human-correct answers. Its fabricated-use classifier was hand-checked at `37/40 = 92.5%` precision. Thus response matching is not an adequate reliability outcome, and tool-derived assertions must be checked against completed tool events.

### Stateful final-state evaluation

[ToolSandbox](https://arxiv.org/html/2408.04682v1) uses a stateful Python environment, a GPT-4o user simulator, and human-authored milestone/minefield DAGs. Its evaluator matches milestones to history and world state, permits valid alternative trajectories, and assigns overall `0` on a minefield violation. It therefore distinguishes final state, ordering, forbidden actions, and turn cost from plausible text.

Its `1,032` cases and `34` tools average `13.9` turns and `3.80` tool calls. The source's workload comparators are BFCL at `2.00` turns, ToolEval at `7.53`, and API-Bank at `3.88`; this describes workload interactivity, not model superiority. In this environment, GPT-4o-2024-05-13 scored `73.0/100` overall and Claude-3-Opus-20240229 `69.2/100`. These are milestone-similarity scores, not production success rates.

### Bounded recovery comparison

[CAX-Agent](https://arxiv.org/html/2605.15218) is a MAPDL finite-element automation preprint, not a general-purpose tool-agent benchmark. It ran `450` case-runs: `50` APDL prompts × `3` recovery strategies × `3` repeats, with temperature `0`, Qwen-27B locally and Claude Sonnet 4.6 externally. It compares no recovery (`B=1`), rule-only (`B=2`), and error-log-conditioned model-only recovery (`B=4`), so the retry budgets are unequal. Two blind raters obtained quadratic weighted `κ = 0.84`, with `96%` of score pairs within one point.

Model-only recovery completed `0.9267` of runs (95% CI `0.885–0.968`), scored `9.16/10` total, versus rule-only `0.7733` and `7.03/10`, and no-recovery `0.6933` and `5.60/10`. It supports a bounded hypothesis that checkpointed, error-classified retries can improve completion in this MAPDL harness. It does not show that retries are safe for irreversible actions.

### Security-relevant behavior and risk discovery

[AgentDojo](https://arxiv.org/html/2406.13352) evaluates dynamic prompt injection in four stateful environments with deterministic utility and security functions over pre/post state. It has `97` user tasks, `27` injection targets, and `629` security cases. The source is internally inconsistent on tools: Table 1 and its data card say `70`, while §3.1 says `74`. Report both rather than treating either count as settled.

The relevant outcomes are benign utility, utility under attack, and targeted attack-success rate (ASR), not ASR alone. With GPT-4o, tool filtering yielded `73.13%` benign utility, `56.28%` utility under attack, and `6.84%` targeted ASR. A prompt-injection detector yielded `41.49%`, `21.14%`, and `7.95%`, respectively. The paper reports that all tested defenses lost `15–20%` utility under attack. This is a measured security-utility trade-off in that suite, not proof that either defense secures a production integration.

[ToolEmu](https://arxiv.org/html/2309.15817) supplies a separate, bounded underspecification-risk evaluation: `36` toolkits, `311` tools, `144` cases, and `9` risk types, with GPT-4 at temperature `0`, LM-emulated tools, and LM safety/helpfulness evaluation. GPT-4 with a safety prompt had estimated failure incidence `23.9%` versus GPT-4 basic `39.4%`. `NoAct` had `0.00%` measured failure but helpfulness `0.063` on a `0–3` scale, showing that refusal can inflate a safety metric. The safety evaluator's recall was `73.1%` versus mean held-out-human recall `78.8%`. These are evaluator-mediated estimates, not incident rates.

## Limits, counterevidence, and transfer boundaries

- **Simulation and sample limits:** AgentProp uses deterministic simulators, one parameter corruption per trace, limited human calibration, and stage-two per-model samples of `2–56`. ToolSandbox's GPT-4o user simulator had total simulation error `8.02% ± 1.36%` in its manually annotated setting. Its milestone authoring, external-service-backed tools, and lack of authentication coverage constrain scale, reproducibility, and transfer.
- **Recovery is not authorization:** CAX-Agent is limited to simple geometries, one solver/model setup, three repeats, and unequal retry budgets. Increased completion cannot justify replaying an irreversible tool call. ToolSandbox's turn count similarly shows that high task score does not mean efficient or safe recovery.
- **Security suites are bounded:** AgentDojo says fixed default attacks are insufficient for robustness evaluation. Adaptive attacks are required, and tool filtering can fail when a legitimate task itself needs the sensitive capability. Neither AgentDojo nor the other benchmarks cover every authorization, network, malicious-tool, supply-chain, data-retention, or approval boundary.
- **Evaluator error is a control risk:** ToolEmu's emulator/evaluator can omit constraints in complex or adversarial scenarios. AgentProp shows response-only grading can disagree materially with humans. Calibrate any automated acceptance judge against blinded human adjudication where deterministic final-state validation is unavailable.
- **Benchmark drift changes the denominator:** [τ-bench's repository](https://github.com/sierra-research/tau-bench) labels its airline and retail tasks outdated. [τ³-bench](https://github.com/sierra-research/tau2-bench) reports more than `75` task fixes and says `banking_knowledge` results below v1.0.1 are not comparable with v1.0.1 or later after the July 2026 grading update. A changed task or grader requires re-baselining, not leaderboard comparison.

## Deployment controls and decision table

| Decision | Measured basis | Adopt now | Failure signal | Do not infer |
|---|---|---|---|---|
| Reliable execution | τ-bench `pass^k`; ToolSandbox final state | Report `pass^1` and deployment-relevant `pass^k`, independent-run count, final-state success, ordered milestones, and forbidden actions | Required state absent, wrong ordering, minefield or policy violation | One-run success or plausible text proves reliable completion |
| Recoverable faults | AgentProp separation; CAX-Agent comparison | Inject timeout, malformed output, stale state, permission denial, duplicate-call risk, and partial write. Record rejection, conditional recovery, retries, safe stop, escalation, rollback, and duplicate effects separately | Executed fault ends in wrong state, non-idempotent retry, rollback failure | A low admission rate or higher completion is safe recovery |
| Provenance and evaluator validity | AgentProp calibration and fabricated use | Use immutable authorized tool-event ledger. Bind tool-derived claims to completed events. Calibrate automated judges against blinded human reference and report agreement, bias, and denominator | Unsupported tool claim, trace discontinuity, low agreement, systematic false accept/reject | An LLM judge or end-to-end outcome detects provenance failure |
| Prompt injection | AgentDojo utility/ASR trade-off | Test adaptive attacks against deployed prompts, schemas, memory, credential scope, and least-privilege policy. Measure benign utility, attacked utility, targeted ASR, and privileged side effects jointly | Attack success, unauthorized side effect, sensitive disclosure, policy escape, or utility collapse | Lower ASR proves security |
| Consequential writes | Cross-source boundary | Keep authorization, scope, idempotency keys, transaction limits, and audit logs external to the model. Require halt and human escalation for irreversible, financial, identity, external-communication, production-admin, or high-consequence actions | Any policy-denied attempt or unvalidated mutation | Benchmarks alone justify autonomous authority |
| Comparability | τ/τ³ drift disclosures | Pin task/benchmark commit or tag, split, grader and validator commit, environment image, model snapshot/date, prompts, tool schemas, policy, and run date | Changed task, grader, API, schema, or policy without re-baseline | Scores from changed versions share a common leaderboard |

For read-only, reversible low-impact tools, representative repeated-run success, deterministic validation, injection testing without privileged writes, audit logs, and rate limits can justify a limited pilot. For reversible writes, add scoped credentials, confirmation or policy gates, rollback, and idempotency validation. The inspected evidence does not justify autonomous consequential writes. Exact thresholds remain unknown because the deployment's loss budget and acceptable incident tolerance are unspecified.

## Smallest resolving evaluation

**Decision to resolve:** whether a named agent may perform a bounded class of reversible writes without per-action human approval after tool failures and untrusted tool content.

| Element | Design |
|---|---|
| Representative tasks | Smallest deployment-derived set containing actual schemas, permissions, state transitions, untrusted-content paths, consequential writes, one recoverable tool error, and duplicate/partial-write risk |
| Fixed variables | Model snapshot, system prompt, tool definitions, credential scope, policy, task-state image, retry budget, timeout, sandbox, and validator version |
| Paired arms | One-shot baseline versus proposed recovery/provenance harness, under no-fault, injected-fault, and adaptive prompt-injection conditions. Randomize order and reinitialize state each run |
| Validators | Deterministic final-state, ordered-event, authorization, forbidden-action, duplicate-operation, and rollback checks. Use blinded human review only for residual semantic ambiguity |
| Outcomes | `pass^1`; deployment-chosen `pass^k`; final-state success; rejection; conditional recovery after executed fault; safe stop; unsupported tool-result claims; unauthorized/privileged side effects; targeted ASR; utility under attack; duplicate-write and rollback rates; retries; p50/p95 latency; total cost per accepted task |
| Decision rule | Advance only if every consequential side effect is externally validated, the protected arm improves or preserves accepted-task completion without increasing duplicate or unauthorized effects, and no unauthorized side effect or unsupported tool-result claim occurs in the evaluated threat cases. Any such event blocks expansion for trace review and permission reduction or human approval |

The task count, repetitions, and threshold are deliberately not universal. Start with the smallest set that covers the actual disputed paths, then add repeats for finalists or close results. Do not report `pass^k` beyond the repetitions that estimate it.

## Source appendix

| Retained source | Type and date | Method/evidence form | Supported claim | Important limitation |
|---|---|---|---|---|
| [τ-bench](https://arxiv.org/html/2406.12045) | Primary benchmark paper, arXiv 2024, ICLR 2025 | Stateful retail/airline APIs, simulated users, policy prompts, final database-state reward, repeated-run `pass^k` | Repeated all-runs success differs from one-of-`k` success; reported GPT-4o reliability remains limited | Simulated users and simplified schemas, ambiguity and missing domain knowledge |
| [AgentProp-Bench](https://arxiv.org/html/2604.16706v2) | Primary preprint, arXiv v2, 2026 | Deterministic tools, one semantic parameter corruption, 2,000 tasks/14,750 traces/13 agents, human calibration | Separate rejection, executed-fault recovery, final correctness, fabricated use, and evaluator agreement | Single-parameter simulator injection, small stage-two samples, limited human calibration |
| [ToolSandbox](https://arxiv.org/html/2408.04682v1) | Primary preprint, 2024 | 1,032 stateful cases, milestone/minefield DAG and world-state evaluation, GPT-4o user simulator | Final state, ordering, forbidden actions, and interaction cost need distinct validation | Simulator error, external services, milestone-authoring scale, and no authentication coverage |
| [CAX-Agent](https://arxiv.org/html/2605.15218) | Primary preprint, 2026 | 450 MAPDL case-runs comparing three unequal retry-budget strategies with blind ratings | Bounded model-driven recovery improved completion in one specialized harness | Simple geometries, one solver/model setup, three repeats, unequal retry budgets |
| [AgentDojo](https://arxiv.org/html/2406.13352) | Primary benchmark paper, 2024 | Stateful prompt-injection suite with deterministic utility/security functions | Security, attacked utility, and benign utility must be measured jointly | Fixed attacks are insufficient, adaptive attacks and real permissions remain untested |
| [ToolEmu](https://arxiv.org/html/2309.15817) | Primary research paper, 2023 | LM-emulated tools and LM evaluator across 36 toolkits/144 cases | Refusal can inflate safety metrics and evaluator error is material | Emulation and evaluator do not establish real-system safety |
| [τ-bench repository](https://github.com/sierra-research/tau-bench) | Primary benchmark repository, inspected 2026-09-07 | README task-status warning and historical leaderboard | Airline and retail tasks are outdated | Does not supply current-task results |
| [τ³-bench repository](https://github.com/sierra-research/tau2-bench) | Primary benchmark repository, inspected 2026-09-07 | v1.0.1 grading notice and task-fix disclosure | Cross-version banking_knowledge scores are non-comparable and task fixes alter denominators | Warning is specific to named versions and domains |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | Primary NIST guidance, updated 2026 | Voluntary AI risk-management framework | Governance context, not a measured agent-reliability or security standard | Does not provide tool-agent performance or security outcomes |
