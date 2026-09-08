# Repair-targeted-local-eval

## Question, scope, and status

**Decision:** no production-wide prompting or scaffold configuration can be adopted from the supplied information alone. Adopt a **minimal, directly validated baseline** temporarily and run the paired local protocol below before enabling CoT, sampling/voting, or an agentic tool loop.

**Status: partial.** The target model snapshot, tool schemas, prompt corpus, retry policy, validator, pricing, and retained paired-protocol results were not supplied. Therefore total target cost, latency, reliability, and safety are **unknown**, not estimated from external studies.

**Scope:** text, reasoning, and tool-using LLM prompting/scaffolds. Research cutoff requested: 2026-09-07. Inspected accessible primary sources are 2022–2025; this is not a claim of exhaustive coverage through the cutoff.

## Requirement contract

| ID | Exact question | Required inclusions | Expected final-report contribution | Decision context |
|---|---|---|---|---|
| R1 | Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available? | measured effect; exact task/model/comparator/result/method; compute or cost where reported | Technique evidence and comparability-qualified quantitative table. | Choose production prompting/scaffold defaults without a universal ranking. |
| R2 | What strongest counterevidence, regressions and model/task transfer limits constrain adoption? | negative or regressive results; model/task/context transfer limits; conditions that overturn adoption | Counterevidence and limitation analysis. | Avoid deploying prompts whose gains do not transfer to the target workload. |
| R3 | What practical selection rules, failure signals and paired local evaluation follow? | operational selection rules; failure signals; paired local evaluation artifact | Operational decision table and reusable evaluation protocol. | Run an evidence-sensitive local choice among candidate prompting approaches. |

## Findings and analysis

### Comparability-qualified evidence

| Technique | Task, model, comparator, method | Measured result | Cost/latency evidence | Decision relevance |
|---|---|---|---|---|
| Few-shot chain-of-thought (CoT) | Arithmetic, commonsense, and symbolic benchmarks; PaLM 540B, GPT-3/InstructGPT, LaMDA and others. Comparator: standard prompting. Method: few-shot demonstrations containing intermediate reasoning. | PaLM 540B GSM8K: **17.9% to 58.1%** in the paper’s reported comparison. | No production price or end-to-end latency reported. Extra exemplars and generated reasoning necessarily increase input/output tokens, but the paper does not give a dollar multiplier. | Evidence for multi-step benchmark reasoning, not for the target workload. |
| Self-consistency over CoT | GSM8K, SVAMP, AQuA, StrategyQA, ARC-Challenge; PaLM 540B, LaMDA 137B, UL2-20B, GPT-3. Comparator: greedy CoT. Method: sample reasoning paths then majority/marginal answer selection. | PaLM 540B: GSM8K **56.5% to 74.4%** (+17.9 points), SVAMP **79.0% to 86.6%**, AQuA **35.8% to 48.3%**. The reported protocol averages 10 runs of **40 independently sampled outputs**. | No currency or latency result. It requires 40 generations per evaluation run, so it is not comparable to one-shot cost or latency without target traces. | Candidate only where a validator can check a final answer and the success gain clears a large cost/latency budget. |
| Interleaved reasoning and actions (ReAct) | HotpotQA, FEVER with a simple Wikipedia API; ALFWorld and WebShop. Comparator: stated baselines including imitation/RL on interactive tasks. Method: prompt with 1–2 in-context trajectories and alternate reasoning, action, observation. | Reported absolute interactive success-rate improvement: **+34% ALFWorld** and **+10% WebShop** over imitation/RL baselines. Authors report reduced CoT hallucination/error propagation in QA/fact verification through retrieval. | No target-like tool-error rate, price, or end-to-end latency in the inspected passage. Every tool round trip adds latency and a tool-call failure surface. | Evidence supports evaluating grounded tool loops when the target task actually needs tools. It does not establish that a ReAct trace is the default for arbitrary function calling. |
| Long-context scaffold | Multi-document QA and key-value retrieval across long-context models. Comparator: changing only the position of relevant information. | Relevant information in the middle can cause substantial degradation, including for explicitly long-context models. Performance is often best when evidence is near the beginning or end. | No universal cost comparison. Longer contexts cost more under token-priced APIs. | Prefer compact, task-relevant retrieved context and test position sensitivity. Do not treat context-window size as evidence of reliable use. |

**Inspected support**

- [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903), abstract and reported GSM8K result discussion. It describes few-shot CoT and reports the PaLM 540B GSM8K comparison above.
- [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171), abstract; Table 2 and experimental-method passages in the paper. The abstract gives the benchmark gains. The inspected method passage specifies 40 sampled outputs and 10-run averaging.
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629), abstract. It identifies the Wikipedia API condition, 1–2 in-context examples, and the +34/+10 absolute interactive-task gains.
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172), abstract. It identifies multi-document QA/key-value retrieval, positional manipulation, and the beginning/end versus middle result.
- [Toolformer: Language Models Can Teach Themselves to Use Tools](https://arxiv.org/abs/2302.04761), abstract. It is supporting context only: its result concerns a specially trained self-supervised tool-using model, not a prompt-only retrofit of the target model.

**Inference:** these studies justify a candidate set, not a ranking. Their model snapshots, tasks, tool environments, prompts, output budgets, graders, and retry policies differ from the target. No published result above supplies the missing target total cost, p95 latency, tool-error probability, or safety-acceptance rate.

## Counterevidence and limitations

1. **CoT can be redundant, slower, and less stable.** [Prompting Science Report 2](https://arxiv.org/abs/2506.07142), abstract, reports task/model-dependent effects, occasional errors on questions otherwise answered correctly, and little accuracy benefit but higher tokens and time for explicit-reasoning models. This overturns default CoT adoption when the target model already reasons internally or direct prompting meets the validator.

2. **Self-consistency is a compute multiplier, not free reliability.** The original self-consistency protocol samples 40 paths. Its accuracy gains are benchmark-specific and its vote can confidently select a common wrong answer. It should not be used where each sample has costly side effects, the final result lacks a deterministic validator, or tail latency is constrained.

3. **Context can degrade performance.** Long-context capacity does not imply robust use of all supplied context. The inspected long-context study shows positional degradation. This overturns “include all history/documents” scaffolds unless target retrieval recall, distractor robustness, and placement have been measured.

4. **Tool-loop results do not transfer automatically.** ReAct’s tool environment was a simple Wikipedia API plus benchmark simulators. Different schemas, stateful mutations, unreliable tools, authorization boundaries, and retry semantics can convert an accuracy gain into more errors or unsafe actions.

5. **Safety is not established by a reasoning trace.** None of the inspected studies measures the target’s authorization violations, secret leakage, prompt-injection susceptibility, unsafe tool arguments, or harmful retry behavior. Safety remains unknown until measured by the target acceptance validator and adversarial cases.

## Configuration to adopt

| Condition observed in the retained paired evaluation | Adopt | Do not adopt / rollback signal |
|---|---|---|
| Direct structured prompt meets reliability and safety SLOs | Minimal explicit task/output contract, bounded relevant context, deterministic tool schema, validator-gated retry. | Add CoT or more context merely because it is conventional. |
| Multi-step, validator-checkable reasoning has a material paired success gain | CoT only for that task stratum, with a fixed output budget. | Validator pass rate is flat/down, p95 latency or cost exceeds its preset budget. |
| Independent samples improve validator success enough to pay for them | Bounded parallel self-consistency only for non-side-effecting work, followed by one validated final action. | Vote disagreement rises, cost/latency budget fails, or tool calls would be duplicated. |
| Grounding requires external facts or environment state | Interleaved tool loop with allowlisted read tools, schema validation, and explicit observation-to-action transition. | Invalid arguments, tool failures, unnecessary calls, repeated calls, or unsafe proposed actions rise. |
| Context retrieval is necessary | Retrieve a compact evidence set, preserve source identity, and test relevant-fact placement. | Adding context lowers acceptance, distractor cases fail, or required facts are missed in the middle. |

**Provisional default:** direct structured prompt + compact retrieved context only when needed + deterministic tool schema + pre-action acceptance validator + bounded retry from the last known-good state. This is a conservative operational baseline, **not** a claim that it has passed the target evaluation.

## Paired local evaluation artifact

### Arms

Run the same retained cases through:

- **A0:** provisional baseline above.
- **A1:** A0 + bounded CoT.
- **A2:** A0 + self-consistency, with a preregistered sample count and no side-effecting tool calls during sampling.
- **A3:** A0 + interleaved tool reasoning/actions, only for tool-required cases.
- **A4:** A0 + compact retrieval/context placement variant, only for context-required cases.

Do not compare A1–A4 on cases where their mechanism is irrelevant. Stratify results by text-only, multi-step reasoning, retrieval/context, read-only tools, and state-changing tools.

### Frozen controls

For every paired case, retain: model provider and snapshot/date, system/developer/user prompts, tool definitions and backend version, decoding parameters, context/retrieval corpus and ordering, retry limit/backoff, timeout, validator version, safety policy, prices, and random seed where available. Randomize arm order within each case. If generation is stochastic and seeds are unavailable, repeat each pair enough times to estimate run variance, while preserving matched case and environment.

### Required records and metrics

| Dimension | Record | Primary calculation |
|---|---|---|
| Effectiveness | Per-case validator outcome and failure reason | Paired acceptance-rate difference, with confidence interval and case-level bootstrap or matched binary test. |
| Reliability | First-pass success, eventual success, retry count, invalid output, tool-schema error, timeout, backend failure | Per-arm rate and paired difference. Report both first-pass and eventual success. |
| Cost | Every request’s input/output/reasoning tokens where exposed, model price at run date, tool/API charges, retries | Total cost per accepted task and per attempted task. Do not report only first-call cost. |
| Latency | Client end-to-end wall time, model time if exposed, queue/tool time, retries | Median, p95, p99, and time-to-accepted-result. |
| Safety | Validator rejection category, disallowed tool proposal/execution, authorization violation, data exposure, prompt-injection success, retry escalation | Rate per attempted task and per accepted result. A safety regression blocks adoption regardless of average quality. |

### Selection rule

Pre-register the target’s minimum acceptable validator-success and safety/reliability SLOs plus maximum total-cost and p95-latency budgets before inspecting results. Select a candidate only when it:

1. clears the paired acceptance threshold for its relevant stratum,
2. does not regress safety or reliability beyond the preset tolerance,
3. stays within total cost and tail-latency budgets, including retries and tools, and
4. has no concentrated regression in a critical case class.

Otherwise retain A0. Report uncertainty and failure categories, not only aggregate averages.

### Failure signals

- Higher eventual success accompanied by sharply worse first-pass success or retry count.
- A lower average cost but worse cost per **accepted** task.
- Better mean latency but worse p95/p99 due to tool loops or sampling.
- Validator pass gains concentrated in easy cases while critical cases regress.
- Increased invalid JSON/function arguments, unnecessary tool calls, timeouts, repeated side effects, or unsafe action proposals.
- Retrieval improvements that disappear with distractors or relevant evidence placed mid-context.
- Any safety-category increase with confidence incompatible with the preset tolerance.

## Coverage and gaps

- **R1 — measured technique effects with exact task/model/comparator/result/method and compute/cost where available: qualified.** Original-source evidence supports CoT, self-consistency, ReAct, and long-context limits with specified conditions. Target compute, pricing, total cost, and latency are absent. **Next check:** run the paired protocol with target request/token/tool telemetry. **Stop reason:** target workload and retained run data were not supplied.

- **R2 — counterevidence, regressions, and model/task/context transfer limits: supported, qualified for target safety.** Evidence supports CoT redundancy/regression risk, sampling cost, long-context positional failure, and tool-environment non-transfer. Target safety behavior is unknown. **Next check:** execute adversarial prompt-injection, authorization, malformed-tool-call, and retry-escalation cases through the target validator. **Stop reason:** no target tool/policy/validator artifact was supplied.

- **R3 — practical selection rules, failure signals, and paired local evaluation artifact: supported.** The protocol preserves the required comparable variables and measures total cost, latency, reliability, and safety. It cannot produce a winner without target runs. **Next check:** preregister SLOs/budgets, freeze A0–A4, then run and retain paired traces. **Stop reason:** the prior verifier gap explicitly requires that unavailable local execution.