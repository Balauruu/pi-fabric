# Production Prompting and Scaffold Decision Guide

## Decision

Use **A0** as the provisional evaluation baseline: a direct structured prompt, only needed context, deterministic schema/tool validation, and one bounded retry from the last known-good state. It is **not** a proven production winner. Add a technique only for the failure mode it targets and only after it clears paired target gates for acceptance, safety, total cost, and p95 latency.

The evidence below is condition-specific, not a common leaderboard. “No cost reported” means unknown, not zero.

## Scope and method

This brief covers technical prompting and scaffold/context boundaries for production text, reasoning, and tool-using LLMs, with the supplied cutoff of 2026-09-07. It selects decisive, inspected original sources rather than claiming an exhaustive review. Measurements remain under their original task, model, comparator, prompt, tool, decoding, and evaluator conditions. No retained study supplies target-workload acceptance, total cost, latency, retry/tool cost, or safety telemetry.

## Measured effects

| Technique | Exact condition and comparator | Measured result | Method and reported compute/cost | Decision use |
|---|---|---:|---|---|
| Few-shot CoT | GSM8K, PaLM-540B, standard few-shot vs CoT | 17.9% → 56.9% (+39.0 pp) | Eight manual CoT exemplars and greedy decoding. No tokens, price, or latency reported. [Wei et al.](https://arxiv.org/html/2201.11903v6) | Candidate for genuinely multi-step, validator-checkable work. |
| Self-consistency | GSM8K, PaLM-540B, greedy CoT vs sampled-vote CoT | 56.5% → 74.4% (+17.9 pp) | 40 sampled paths, averaged over 10 runs. At least 40 generations before aggregation. No USD/latency. [Wang et al.](https://arxiv.org/abs/2203.11171) | Candidate only for side-effect-free, canonically aggregatable outputs. |
| Least-to-most | SCAN length split, `code-davinci-002`, CoT vs decomposition | 16.2% → 99.7% | Eight reduction and 14 mapping examples, constrained intermediate representation and output expansion. No cost reported. [Zhou et al.](https://openreview.net/pdf?id=WZH7099tgfM) | Narrow evidence for stable compositional decomposition. |
| Backward self-verification | GSM8K, `code-davinci-002`, CoT vs backward condition-mask ranking | 60.81% → 65.14% (+4.33 pp) | Sample candidates, mask a source condition, predict it backward, and rank consistency. Candidate/verification calls added, but K/P, tokens, and USD unreported. [Weng et al.](https://aclanthology.org/2023.findings-emnlp.167.pdf) | Candidate where an independently checkable relation exists. |
| ReAct | PaLM-540B, constrained Wikipedia API, HotpotQA/FEVER, ReAct vs CoT/Act | HotpotQA: 27.4 EM vs CoT 29.4. ReAct→CoT-SC: 35.1 vs CoT-SC 33.4. FEVER: 60.9% vs CoT 56.3%. | Six HotpotQA and three FEVER trajectories. CoT-SC used 21 samples. No USD/latency. [Yao et al.](https://arxiv.org/abs/2210.03629) | Tool-grounded loop candidate, not a blanket CoT replacement. |
| Tool-description retrieval | APIBench single-call generation, Gorilla, no retrieval vs BM25/GPT-Index/oracle docs | No retrieval: 59.13/71.68/83.79%; BM25: 40.32/17.03/41.89%; oracle: 67.20/91.26/94.16% across TorchHub/HF/TensorHub | AST-subtree match. Fine-tuning used 8×A100-40GB for five epochs. No serving cost/latency. [Patil et al.](https://arxiv.org/abs/2305.15334) | Retrieve descriptions only when selection precision is demonstrated. |
| Context position/volume | Multi-document QA, GPT-3.5-Turbo-0613 and Claude-1.3, relevant passage position/top-k varied | GPT-3.5 middle positions at 20/30 docs fell >20 pp and below its 56.1% closed-book baseline. 20→50 docs gave about +1.5% GPT-3.5 and +1% Claude. | Greedy decoding. Full GPT-4 evaluation was estimated at >$6,000. [Liu et al.](https://aclanthology.org/2024.tacl-1.9/) | Compact context and test placement, not “include all history.” |
| Few-shot examples | Closed-book QA, GPT-3 175B, zero/one/few shot | CoQA F1 81.5→84.0→85.0; TriviaQA 64.3→68.0→71.2 | 10–100 examples within 2,048 tokens. No request price/latency. [Brown et al.](https://arxiv.org/html/2005.14165) | Test examples when they convey missing target behavior. |
| Format/template choice | 53 classification/MC tasks, LLaMA-2-13B and GPT-3.5, plausible formats | Maximum spread: 76 points for LLaMA-2-13B, 56 for GPT-3.5. Median: 7.5 and 6.4 points. | 320 formats across 53 tasks. GPT-3.5 search averaged <$10/task. [Sclar et al.](https://arxiv.org/html/2310.11324v2) | Treat wording and format changes as regression candidates. |
| Constrained decoding | JSONSchemaBench, six frameworks, constrained vs LM-only | Up to 50% faster generation, about 2× best-vs-worst schema coverage, and up to +4% downstream accuracy | Llama-3.2-1B-Instruct, temperature 0, one generation, 40-second timeouts. [Beurer-Kellner et al.](https://arxiv.org/html/2501.10868v1) | Use mechanical syntax/schema constraints for machine-consumed output, then validate semantics. |

## Counterevidence and transfer limits

- **CoT is conditional.** PaLM-8B GSM8K regressed from 4.9% standard prompting to 4.1% CoT. CoT gains emerged at scale and were small or negative on easy MAWPS subsets. [Wei et al.](https://arxiv.org/html/2201.11903v6)
- **Sampling is a budgeted intervention.** Self-consistency changes inference work by many complete generations, can select a common wrong answer, and must not precede side-effecting tool calls. Low agreement is a failure signal, not a correctness certificate. [Wang et al.](https://arxiv.org/abs/2203.11171)
- **Reflection is not a reliability control.** ChatGPT HotpotQA fell from 80.2 ± 0.4% with standard prompting to 71.9% with self-reflection. Llama-2-7B-chat fell from 61.0 ± 1.0% to 57.5%. Self-assessed comprehension did not distinguish all-wrong from all-correct answers. [Li et al.](https://aclanthology.org/2024.findings-naacl.237.pdf)
- **Decomposition and verification are systems, not phrases.** Least-to-most DROP failures included bad reductions and wrong subanswers, while its result included normalization and equation recalculation. Backward verification on `code-davinci-001` GSM8K was only 13.84%→13.92%. [Zhou et al.](https://openreview.net/pdf?id=WZH7099tgfM), [Weng et al.](https://aclanthology.org/2023.findings-emnlp.167.pdf)
- **Examples, templates, and personas can harm.** A simple zero-shot translation prompt beat a 10-shot-style prompt, and one added example significantly worsened it. Template winners did not reliably transfer. Across 2,410 MMLU questions, 162 personas, and nine models, no persona was statistically better overall than no persona. [Reynolds and McDonell](https://arxiv.org/html/2102.07350), [Sclar et al.](https://arxiv.org/html/2401.06766), [Pei et al.](https://aclanthology.org/2024.findings-emnlp.888/)
- **Retrieval, context, and tool loops have concrete failure modes.** Weak retrieval degraded Gorilla on every source. Longer windows did not cure middle-context access failures. ReAct’s simple APIs and simulators do not establish safety for stateful production tools. [Patil et al.](https://arxiv.org/abs/2305.15334), [Liu et al.](https://aclanthology.org/2024.tacl-1.9/), [Yao et al.](https://arxiv.org/abs/2210.03629)
- **Structure is not semantic safety.** Strict Structured Outputs adheres to supported schemas, whereas JSON mode does not guarantee schema adherence. Refusals, filters, truncation, unsupported/deep schemas, and first-schema latency remain possible. [OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs)
- **Injection defenses retain risk and can cost utility.** GPT-4-0613 ReAct had 23.6% base and 47.0% enhanced indirect-injection attack success in InjecAgent. Function calling reduced this to 6.6%/7.1%, not zero. In AgentDojo, a detector reduced attack success 57.69%→7.95% but benign utility 69.00%→41.49%; tool filtering reached 6.84% attack success and 73.13% utility. [Yi et al.](https://aclanthology.org/2024.findings-acl.624/), [Debenedetti et al.](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf)

## Operational decision table

| Target condition | Start candidate | Failure signal | Paired local comparator | Adopt only if |
|---|---|---|---|---|
| Text task with deterministic acceptance | A0 direct task/output contract | Validator failures after harmless wording/template change | A0 vs direct-template variants and 1/2/4-shot | Acceptance or cost per accepted task improves without critical-stratum regression |
| Multi-step, checkable reasoning | A0 + bounded CoT | Flat validator pass, verbosity/cost increase, uncheckable rationale | A0 vs A1 CoT | Gain clears preregistered acceptance, total-cost, and p95 gates |
| Canonical side-effect-free answer | A0 + bounded sampling/vote | Low agreement, common wrong answer, duplicated actions | A1 vs A2 self-consistency | Paired accepted-task benefit pays for all samples |
| External state is required | A0 + interleaved read/tool loop | Repeated calls, unchanged error, invalid arguments, state contradiction | Structured-only vs A3 under identical tools and step limit | Tool-grounded acceptance rises with no safety/reliability regression |
| Large catalog or retrieved evidence | Compact selected descriptions/context at boundaries | Gold tool absent, distractor selection, middle-context miss, top-k decline | No retrieval vs top-k variants, plus oracle diagnostic | Retrieval improves acceptance across placement/distractor strata |
| Third-party tool content | Capability allowlist, data/instruction separation, pre-action validator | Hostile text becomes policy, disallowed call, injection success | Baseline vs filtering/detector/permission guard | Benign utility and adversarial gates both pass |
| Machine-consumed response | Strict schema/constrained decoder plus semantic validator | Refusal, truncation, schema rejection, semantically invalid fields | Prompt-only JSON vs strict schema/decoder | Semantic correctness and reliability improve within latency budget |

## Paired local evaluation

**Arms.** Apply only to relevant strata: A0 is the baseline. A1=A0+bounded CoT. A2=A0+self-consistency with a preregistered sample count and no side-effecting calls during sampling. A3=A0+interleaved reasoning/actions for tool-required cases. A4=A0+compact retrieval/context-placement variant for context-required cases. Stratify text-only, multi-step reasoning, retrieval/context, read-only tools, and state-changing tools.

**Freeze controls.** Pin provider/model snapshot/date, prompts, decoding settings, tool schemas/backends, retrieval corpus and ordering, retry/backoff, timeout, permissions, validator/safety-policy versions, run-date prices, and seed where available. Randomize arm order within matched cases and repeat stochastic pairs when seeds are unavailable.

**Representative cases.** Retain routine and ambiguous tasks, malformed/stale tool output, unavailable tools, decisive evidence at beginning/middle/end, distractors, indirect injection, read-only tools, and state-changing tools. Report each stratum separately.

**Per-trajectory ledger.** Store case/arm/run IDs; prompt/completion/reasoning tokens; tool calls/results; first-pass and eventual validator result/reason; schema/argument error; retry/loop/timeout/backend failure; model/tool/retry total cost; end-to-end and model/tool latency; context length/evidence position; unsafe proposal/execution, authorization violation, data exposure, injection success, and reviewer defects. Calculate paired acceptance difference, first-pass/eventual reliability, total cost per attempted and accepted task, median/p95/p99/time-to-accepted-result, and safety rates per attempted and accepted task.

**Selection gates.** Before results, set minimum acceptance and safety/reliability SLOs plus maximum total-cost and p95-latency budgets. Select an arm only if it clears its paired acceptance gate, stays within all budgets including tools/retries, has no critical-stratum regression, and has no safety regression beyond tolerance. Otherwise retain A0.

## Coverage, gaps, and stop reason

| Requirement | Disposition | Covered | Decision-changing gap |
|---|---|---|---|
| R1 | Qualified | Conditional benchmark results for reasoning, examples/formats, schemas, context, and tool loops. Reported compute/cost retained where available. | No target model/prompt/tool/validator traces, total cost, latency, retry/tool cost, or acceptance result. |
| R2 | Qualified | Direct regressions and transfer limits for CoT, reflection, examples, retrieval, context, schema limits, and injection defenses. | No target adversarial, authorization, malformed-tool, retry-escalation, or validator result. |
| R3 | Qualified | A concrete A0–A4 paired protocol, selection gates, and failure signals. | No preregistered target thresholds or paired executions to select a production configuration. |

**Stop reason.** The available evidence supports a qualified literature-backed candidate set and a reusable evaluation protocol, but no target workload artifacts or local paired runs were supplied. A production-wide configuration cannot be selected. The next decision-changing action is to preregister gates, freeze A0–A4, and retain paired target traces including safety, total cost, and tail latency.

## Retained-source appendix

| Source | Type/date | Evidence form | Supported claim | Important limitation |
|---|---|---|---|---|
| [Wei et al., *Chain-of-Thought Prompting*](https://arxiv.org/html/2201.11903v6) | Primary paper, 2022, v6 | Benchmark prompt comparison | PaLM-540B GSM8K gain; small-model/easy-task limits | Old models, manual exemplars, no serving cost |
| [Wang et al., *Self-Consistency*](https://arxiv.org/abs/2203.11171) | Primary paper, 2022 | 40-path sampling vs greedy CoT | GSM8K gain and compute multiplier | No USD/latency; vote can be wrong |
| [Zhou et al., *Least-to-Most*](https://openreview.net/pdf?id=WZH7099tgfM) | Primary paper, 2023 | Decomposition benchmark experiments | SCAN/DROP gains and reduction failures | Intermediate language, postprocessing, examples are material |
| [Weng et al., *Self-Verification*](https://aclanthology.org/2023.findings-emnlp.167.pdf) | Primary paper, 2023 | Backward condition-mask ranking | GSM8K gain and weak `code-davinci-001` transfer | No full call/token/cost accounting |
| [Li et al., *Self-Reflection*](https://aclanthology.org/2024.findings-naacl.237.pdf) | Primary paper, 2024 | Standard/exploration/reflection ablations | HotpotQA regression and poor self-gating | QA benchmarks, not target tools |
| [Yao et al., *ReAct*](https://arxiv.org/abs/2210.03629) | Primary paper, 2023 | Thought-action-observation experiments | QA/interactive results and pure-ReAct HotpotQA regression | Simple APIs/simulators, no production cost |
| [Patil et al., *Gorilla*](https://arxiv.org/abs/2305.15334) | Primary paper, 2023 | APIBench retrieval ablation | Weak retrieval can harm; oracle docs help | Single-call API generation, fine-tuned system |
| [Liu et al., *Lost in the Middle*](https://aclanthology.org/2024.tacl-1.9/) | Primary paper, 2024 | Position and retrieval-volume ablations | Middle-context degradation and saturation | QA/key-value tasks, not every production context |
| [Brown et al., *Language Models are Few-Shot Learners*](https://arxiv.org/html/2005.14165) | Primary paper, 2020 | Zero/one/few-shot benchmark comparison | Closed-book QA demonstration gains | GPT-3-era model/context; no request cost |
| [Sclar et al., *Mind Your Format*](https://arxiv.org/html/2401.06766) | Primary paper, 2024 | Templates, demonstrations, inference variants | Template sensitivity/non-transfer and sweep compute | Classification datasets, not tool workflows |
| [Sclar et al., *Prompt Formatting*](https://arxiv.org/html/2310.11324v2) | Primary paper, 2023/2024 | Plausible equivalent-format sweep | Large format spreads and <$10/task search | Exact template search is not a general prompt-length result |
| [Reynolds and McDonell](https://arxiv.org/html/2102.07350) | Primary paper, 2021 | Translation prompt-format comparison | One example can regress direct prompting | API/model sizes changed; limited numerical transfer |
| [Pei et al., *Persona Prompting*](https://aclanthology.org/2024.findings-emnlp.888/) | Primary paper, 2024 | 162-persona mixed-effects MMLU study | No general persona accuracy winner | Open models and MCQ, not proprietary/open-ended work |
| [Beurer-Kellner et al., *Generating Structured Outputs*](https://arxiv.org/html/2501.10868v1) | Primary paper, 2025 | JSONSchemaBench framework tests | Decoder speed/coverage/downstream findings | Framework/model-specific, 40-second timeouts |
| [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) | Provider documentation, current/undated | Specified behavior and exceptions | Strict-schema contract and failure paths | Not an independent semantic-correctness benchmark |
| [Yi et al., *InjecAgent*](https://aclanthology.org/2024.findings-acl.624/) | Primary paper, 2024 | Indirect-injection benchmark | ReAct/function-calling attack-success rates | Security benchmark, not benign utility |
| [Debenedetti et al., *AgentDojo*](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf) | Primary paper, 2024 | Security-defense evaluation | Defense security–utility trade-off | Specific tools, defenses, permission model |
| [Schick et al., *Toolformer*](https://arxiv.org/abs/2302.04761) | Primary paper, 2023 | Self-supervised tool-use training/evaluation | Tool-use evidence is for a specially trained model, not a prompt-only retrofit | Training, tools, and evaluation setup differ from target |
| [*Prompting Science Report 2*](https://arxiv.org/abs/2506.07142) | Research report, 2025 | Task/model comparisons of prompting and explicit reasoning | Explicit reasoning can add tokens/time with little benefit or introduce errors | Report-level support, not target-workload evidence |
