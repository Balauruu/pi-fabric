# Production prompting guide

## Brief
Produce a decision-grade guide to choosing prompt techniques for production text, reasoning and tool-using LLMs, as of 2026-09-07. R1: Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available? R2: What strongest counterevidence, regressions and model/task transfer limits constrain adoption? R3: What practical selection rules, failure signals and paired local evaluation follow? Include original inspected sources, quantitative evidence kept under its original conditions, an operational decision table, concrete reusable evaluation artifact, and complete retained-source appendix. Do not invent a universal ranking or force current social research. Scope is technical prompting and scaffold/context boundaries, not aesthetic image/video prompts. Select decisive studies without pretending to be an exhaustive systematic review.

## Requirement contract
- **R1**: Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?
  - Inclusions: measured effect; exact task/model/comparator/result/method; compute or cost where reported
  - Contribution: Technique evidence and comparability-qualified quantitative table.
  - Decision context: Choose production prompting/scaffold defaults without a universal ranking.
- **R2**: What strongest counterevidence, regressions and model/task transfer limits constrain adoption?
  - Inclusions: negative or regressive results; model/task/context transfer limits; conditions that overturn adoption
  - Contribution: Counterevidence and limitation analysis.
  - Decision context: Avoid deploying prompts whose gains do not transfer to the target workload.
- **R3**: What practical selection rules, failure signals and paired local evaluation follow?
  - Inclusions: operational selection rules; failure signals; paired local evaluation artifact
  - Contribution: Operational decision table and reusable evaluation protocol.
  - Decision context: Run an evidence-sensitive local choice among candidate prompting approaches.

## Decision guide

### Decision now

Use **A0: a direct structured prompt with only needed context, deterministic schema/tool validation, and one bounded retry from the last known-good state** as the *provisional evaluation baseline*, not as a proven production winner. Add a technique only for the failure mode it targets and only after it clears paired target gates for acceptance, safety, total cost, and p95 latency. The retained studies are condition-specific and are not a common leaderboard.

### R1 — measured technique evidence

**Comparability rule.** Do not average or rank these figures: tasks, model snapshots, prompts, tools, validators, decoding budgets, retries, and cost accounting differ. “No cost reported” means unknown, not zero. Reported training compute is not serving cost.

| Technique | Exact condition and comparator | Result | Method and reported compute/cost | Decision use |
|---|---|---:|---|---|
| Few-shot CoT | GSM8K, PaLM-540B, standard few-shot vs CoT | 17.9% → 56.9% (+39.0 pp) | 8 manual CoT exemplars, greedy decoding. No tokens, price, or latency. [Wei et al.](https://arxiv.org/html/2201.11903v6) | Candidate for genuinely multi-step, validator-checkable work. |
| Self-consistency | GSM8K, PaLM-540B, greedy CoT vs sampled-vote CoT | 56.5% → 74.4% (+17.9 pp) | 40 sampled paths, 10-run average, so at least 40 generations before aggregation. No USD/latency. [Wang et al.](https://arxiv.org/abs/2203.11171) | Candidate only when outputs are side-effect-free and canonically aggregatable. |
| Least-to-most | SCAN length split, `code-davinci-002`, CoT vs decomposition | 16.2% → 99.7% | 8 reduction and 14 mapping examples; constrained intermediate representation/output expansion. No cost. [Zhou et al.](https://openreview.net/pdf?id=WZH7099tgfM) | Narrow evidence for stable compositional decomposition. |
| Backward self-verification | GSM8K, `code-davinci-002`, CoT vs backward condition-mask ranking | 60.81% → 65.14% (+4.33 pp) | Sample candidates, mask source condition, predict backward, rank consistency. Candidate/verification calls added, but K/P, tokens, and USD unreported. [Weng et al.](https://aclanthology.org/2023.findings-emnlp.167.pdf) | Candidate where an independent, checkable relation exists. |
| ReAct | PaLM-540B, HotpotQA/FEVER, ReAct vs CoT/Act; constrained Wikipedia API | HotpotQA: 27.4 EM vs CoT 29.4; hybrid ReAct→CoT-SC 35.1 vs CoT-SC 33.4. FEVER: 60.9% vs CoT 56.3%. | 6 HotpotQA/3 FEVER trajectories; self-consistency used 21 samples. No USD/latency. [Yao et al.](https://arxiv.org/abs/2210.03629) | Tool-grounded loop candidate, not a blanket replacement for CoT. |
| Tool-description retrieval | APIBench single-call generation, Gorilla; no retrieval vs BM25/GPT-Index/oracle docs | No retrieval: 59.13/71.68/83.79%; BM25: 40.32/17.03/41.89%; oracle: 67.20/91.26/94.16% across TorchHub/HF/TensorHub | AST-subtree match. Fine-tuning used 8×A100-40GB for 5 epochs. No serving cost/latency. [Patil et al.](https://arxiv.org/abs/2305.15334) | Retrieve descriptions only when selection precision is proven. |
| Context position/volume | Multi-document QA, GPT-3.5-Turbo-0613 and Claude-1.3; relevant passage position/top-k varied | GPT-3.5 middle positions at 20/30 docs fell >20 pp and below its 56.1% closed-book baseline; 20→50 docs yielded about +1.5% GPT-3.5 and +1% Claude | Greedy decoding. Full GPT-4 evaluation estimated >$6,000. [Liu et al.](https://aclanthology.org/2024.tacl-1.9/) | Compact context and test placement, not “include all history.” |
| Few-shot examples | Closed-book QA, GPT-3 175B, zero/one/few shot | CoQA F1 81.5→84.0→85.0; TriviaQA 64.3→68.0→71.2 | 10–100 examples within 2,048 tokens. No request price/latency. [Brown et al.](https://arxiv.org/html/2005.14165) | Test examples where they convey missing target behavior. |
| Format/template choice | 53 classification/MC tasks, LLaMA-2-13B and GPT-3.5, semantically plausible formats | Max spread 76 points LLaMA-2-13B, 56 GPT-3.5; median 7.5 and 6.4 points | 320 formats/53 tasks. GPT-3.5 search averaged <$10/task. [Sclar et al.](https://arxiv.org/html/2310.11324v2) | Treat wording/format changes as regressions requiring tests. |
| Constrained decoding | JSONSchemaBench, six frameworks; constrained vs LM-only | Up to 50% faster generation, ~2× best-vs-worst schema coverage, up to +4% downstream accuracy | Llama-3.2-1B-Instruct, temperature 0, one generation, 40-second compile/generation timeouts. [Beurer-Kellner et al.](https://arxiv.org/html/2501.10868v1) | Prefer mechanical syntax/schema constraints for machine-consumed output, then validate semantics. |

### R2 — counterevidence and transfer limits

- **Reasoning scale and task limit.** CoT regressed on GSM8K for PaLM-8B (4.9% standard vs 4.1% CoT); gains emerged at scale and were small or negative on easy MAWPS subsets. Do not transfer PaLM-540B arithmetic results to a current target model or easy task. [Wei et al.](https://arxiv.org/html/2201.11903v6)
- **Sampling is a budgeted intervention.** Self-consistency changes inference work by many full generations. It can select a common wrong answer and is unsuitable before side-effecting tools. Low agreement is a failure signal, not a correctness certificate. [Wang et al.](https://arxiv.org/abs/2203.11171)
- **Reflection can regress grounded QA.** ChatGPT HotpotQA fell from 80.2 ± 0.4% standard prompting to 71.9% self-reflection; Llama-2-7B-chat fell 61.0 ± 1.0% to 57.5%. The same work found self-assessed comprehension poorly discriminated all-wrong from all-correct answers. [Li et al.](https://aclanthology.org/2024.findings-naacl.237.pdf) Model-only reflection is not a reliability control.
- **Decomposition and verification are systems, not phrases.** Least-to-most failures included bad reductions and wrong subanswers; its DROP result also used normalization and equation recalculation. Backward verification transfers weakly across models: `code-davinci-001` GSM8K was 13.84%→13.92%. [Zhou et al.](https://openreview.net/pdf?id=WZH7099tgfM), [Weng et al.](https://aclanthology.org/2023.findings-emnlp.167.pdf)
- **Examples and templates can harm.** A simple zero-shot translation prompt beat a 10-shot-style prompt, and one added example significantly worsened it. Template winners did not reliably transfer across models, demonstrations, or prediction methods. [Reynolds and McDonell](https://arxiv.org/html/2102.07350), [Sclar et al.](https://arxiv.org/html/2401.06766)
- **Personas are not an accuracy default.** Across 2,410 MMLU questions, 162 personas, and nine models, no persona was statistically better overall than no persona; some reduced performance. [Pei et al.](https://aclanthology.org/2024.findings-emnlp.888/)
- **Tool and context controls have concrete failure modes.** Weak retrieval degraded Gorilla on every source; longer windows did not cure middle-context access failures. ReAct’s simple APIs/simulators do not establish safety for stateful production tools. [Patil et al.](https://arxiv.org/abs/2305.15334), [Liu et al.](https://aclanthology.org/2024.tacl-1.9/), [Yao et al.](https://arxiv.org/abs/2210.03629)
- **Structure is not semantic safety.** Strict structured output is documented to adhere to supported schemas, while JSON mode does not guarantee schema adherence. Refusals, filters, truncation, unsupported/deep schemas, and first-schema latency remain possible. [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) Constrained decoding does not establish correct entities, arguments, permissions, or tool selection.
- **Prompt injection and defenses have residual risk and utility costs.** GPT-4-0613 ReAct had 23.6% base and 47.0% enhanced indirect-injection attack success in InjecAgent; function calling reduced this to 6.6%/7.1%, not zero. In AgentDojo, a detector reduced targeted attack success 57.69%→7.95% but benign utility 69.00%→41.49%; tool filtering reached 6.84% attack success and 73.13% utility in that comparison. [Yi et al.](https://aclanthology.org/2024.findings-acl.624/), [Debenedetti et al.](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf)

### R3 — operational selection rules

| Target condition | Start candidate | Failure signal | Paired local comparator | Adopt only if |
|---|---|---|---|---|
| Text task with deterministic acceptance | A0 direct task/output contract | Validator failures after harmless wording/template change | A0 vs direct-template variants and 1/2/4-shot | Acceptance or cost-per-accepted-task improves without critical-stratum regression |
| Multi-step, checkable reasoning | A0 + bounded CoT | Flat validator pass, verbosity/cost increase, uncheckable rationale | A0 vs A1 CoT | Gain clears preregistered acceptance, total-cost, and p95 gates |
| Canonical side-effect-free answer | A0 + bounded sampling/vote | Low agreement, common wrong answer, duplicated actions | A1 vs A2 self-consistency | Paired accepted-task benefit pays for all samples |
| External state is required | A0 + interleaved read/tool loop | Repeated calls, unchanged error, invalid args, state contradiction | Structured-only vs A3 under same tools/steps | Tool-grounded acceptance rises with no safety/reliability regression |
| Large catalog or retrieved evidence | Compact selected descriptions/context at boundaries | Gold tool absent, distractor selection, middle-context miss, top-k decline | No retrieval vs top-k variants, plus oracle diagnostic | Retrieval improves target acceptance across placement/distractor strata |
| Third-party tool content | Capability allowlist, data/instruction separation, pre-action validator | Hostile text becomes policy, disallowed call, injection success | Baseline vs filtering/detector/permission guard | Benign utility and adversarial gates both pass |
| Machine-consumed response | Strict schema/constrained decoder plus semantic validator | Refusal, truncation, schema rejection, semantically invalid fields | Prompt-only JSON vs strict schema/decoder | Semantic correctness and reliability improve within latency budget |

### Reusable paired local evaluation artifact

**Decision and arms.** Compare only relevant cases. A0 is the provisional baseline. A1=A0+bounded CoT, A2=A0+self-consistency with preregistered sample count and no side-effecting calls during sampling, A3=A0+interleaved tool reasoning/actions for tool-required tasks, and A4=A0+compact retrieval/context-placement variant for context-required tasks.

**Freeze controls.** Pin provider/model snapshot/date, prompts, decoding settings, tool schemas/backends, retrieval corpus and ordering, retries/backoff, timeout, permissions, validator/safety-policy versions, run-date prices, and seed where available. Randomize arm order within a matched case. Repeat stochastic pairs when seeds are unavailable.

**Representative strata.** Retain routine tasks, ambiguous tasks, malformed/stale tool output, unavailable tools, relevant evidence at beginning/middle/end, distractors, indirect injection, read-only tools, and state-changing tools. Report each separately, not only an aggregate.

**Per-trajectory ledger.** Store case/arm/run IDs; prompt and completion/reasoning tokens; tool calls/results; first-pass and eventual validator outcome and reason; schema/argument error; retry/loop/timeout/backend failure; model/tool/retry total cost; client end-to-end and model/tool latency; context length/evidence position; unsafe proposal/execution, authorization violation, data exposure, injection success, and reviewer defects. Calculate paired acceptance difference, first-pass/eventual reliability, total cost per attempted **and accepted** task, median/p95/p99/time-to-accepted-result, and safety rate per attempted and accepted task.

**Pre-register selection gates.** Before results, set the target minimum acceptance and safety/reliability SLOs plus maximum total-cost and p95-latency budgets. Select an arm only if it clears its paired acceptance gate, stays within every budget including tools/retries, has no critical-stratum regression, and has no safety regression beyond the preset tolerance. Otherwise retain A0. Do not manufacture a universal sample size or threshold.

### Coverage and actual stop reason

| Requirement | Disposition | What is covered | Open decision-changing gap |
|---|---|---|---|
| R1 | Qualified | Conditional measured results for reasoning, examples/formats, schemas, context, and tool loops. Reported compute/cost retained where supplied. | No target model/prompt/tool/validator traces, total cost, latency, or acceptance result. |
| R2 | Qualified | Direct regressions and transfer limits for CoT, reflection, examples, retrieval, context, schema limits, and injection defenses. | No target adversarial, authorization, malformed-tool, retry-escalation, or validator result. |
| R3 | Qualified | A concrete A0–A4 paired protocol, selection gates, and failure signals. | No preregistered target thresholds or paired executions to select a production configuration. |

**Actual stop reason.** The first reasoning worker failed because it received the wrapper and attempted forbidden recursive delegation, then a preserved repair stream succeeded. The synthesizer completed, as recorded in `state.json`. More importantly, no target workload artifacts or local paired runs were supplied. The report therefore stops at a qualified literature-backed candidate set and protocol, not a deployment ranking. The highest-impact next check is to preregister the gates, freeze A0–A4, and retain paired target traces including safety, cost, and tail latency.

## Source appendix

Every row is a retained, inspected direct source URL. Dates are publication/version dates where available; documentation is undated/current as inspected.

| Source | Type/date | Method or evidence form | Supported claim | Important limitation |
|---|---|---|---|---|
| [Wei et al., *Chain-of-Thought Prompting*](https://arxiv.org/html/2201.11903v6) | Primary paper, 2022, v6 | Benchmark prompt comparison | PaLM-540B GSM8K CoT gain and small-model/easy-task limits | Old models, manual exemplars, no serving cost |
| [Wang et al., *Self-Consistency*](https://arxiv.org/abs/2203.11171) | Primary paper, 2022 | 40-path sampled decoding vs greedy CoT | GSM8K gain and compute multiplier | No USD/latency; vote can be wrong |
| [Zhou et al., *Least-to-Most*](https://openreview.net/pdf?id=WZH7099tgfM) | Primary paper, 2023 | Decomposition benchmark experiments | SCAN/DROP gains and reduction failures | Intermediate language, postprocessing, and examples are material |
| [Weng et al., *Self-Verification*](https://aclanthology.org/2023.findings-emnlp.167.pdf) | Primary paper, 2023 | Backward condition-mask candidate ranking | GSM8K gain and weak `code-davinci-001` transfer | No full call/token/cost accounting |
| [Li et al., *Self-Reflection*](https://aclanthology.org/2024.findings-naacl.237.pdf) | Primary paper, 2024 | Standard/exploration/reflection ablations | HotpotQA regressions and poor self-gating | QA benchmarks, not target tools |
| [Yao et al., *ReAct*](https://arxiv.org/abs/2210.03629) | Primary paper, 2023 | Prompted thought-action-observation experiments | QA/interactive results and pure-ReAct HotpotQA regression | Simple APIs/simulators, no production cost |
| [Patil et al., *Gorilla*](https://arxiv.org/abs/2305.15334) | Primary paper, 2023 | APIBench AST-match retrieval ablation | Weak retrieval can harm; oracle docs help | Single-call API generation, finetuned system |
| [Liu et al., *Lost in the Middle*](https://aclanthology.org/2024.tacl-1.9/) | Primary paper, 2024 | Position and retrieval-volume ablations | Middle-context degradation and saturation | QA/key-value tasks, not every production context |
| [Brown et al., *Language Models are Few-Shot Learners*](https://arxiv.org/html/2005.14165) | Primary paper, 2020 | Zero/one/few-shot benchmark comparison | Closed-book QA demonstration gains | GPT-3-era model/context; no per-request cost |
| [Sclar et al., *Mind Your Format*](https://arxiv.org/html/2401.06766) | Primary paper, 2024 | Templates, demonstrations, and inference variants | Template sensitivity/non-transfer and sweep compute | Classification datasets, not tool workflows |
| [Sclar et al., *Prompt Formatting*](https://arxiv.org/html/2310.11324v2) | Primary paper, 2023/2024 | Plausible equivalent format sweep | Large format spreads and <$10/task search | Exact template search is not a general prompt-length result |
| [Reynolds and McDonell](https://arxiv.org/html/2102.07350) | Primary paper, 2021 | Translation prompt-format comparison | One example can regress direct prompting | API/model sizes changed; limited numerical transfer |
| [Pei et al., *Persona Prompting*](https://aclanthology.org/2024.findings-emnlp.888/) | Primary paper, 2024 | 162-persona mixed-effects MMLU study | No general persona accuracy winner | Open models and MCQ, not proprietary/open-ended work |
| [Beurer-Kellner et al., *Generating Structured Outputs*](https://arxiv.org/html/2501.10868v1) | Primary paper, 2025 | JSONSchemaBench framework tests | Decoder speed/coverage/downstream findings | Framework/model-specific, 40-second timeouts |
| [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) | Provider documentation, current/undated | Specified behavior and exceptions | Strict-schema contract and documented failure paths | Not an independent semantic-correctness benchmark |
| [Yi et al., *InjecAgent*](https://aclanthology.org/2024.findings-acl.624/) | Primary paper, 2024 | 1,054-case indirect-injection benchmark | ReAct/function-calling attack-success rates | Security benchmark, not benign utility |
| [Debenedetti et al., *AgentDojo*](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf) | Primary paper, 2024 | 97-task/629-security-case defense evaluation | Defense security–utility trade-off | Specific tools, defenses, and permission model |
| [Schick et al., *Toolformer*](https://arxiv.org/abs/2302.04761) | Primary paper, 2023 | Self-supervised tool-use training and benchmark evaluation | Tool-use capability evidence is for a specially trained model, not a prompt-only retrofit | Training, tools, and evaluation setup differ from the target prompt/scaffold |
| [*Prompting Science Report 2*](https://arxiv.org/abs/2506.07142) | Research report, 2025 | Reported task/model comparisons of prompting and explicit reasoning | Explicit reasoning can add tokens/time with little benefit or introduce errors under some conditions | Retained support is report-level and does not establish behavior for the target model or workload |

## Pending independent revalidation

The former validation findings prompted two corrections: the source appendix now includes the retained Toolformer and *Prompting Science Report 2* direct sources, and the actual-stop-reason statement now records that the synthesizer completed. R1, R2, and R3 remain **qualified** because target workload, validator, cost, latency, safety, and paired-run evidence are absent. An independent validator must recheck the complete retained-source appendix and state agreement before any validation result is recorded.

## Report validation

**Result: passed.** An independent revalidation read the reporting criteria, this report, every persisted evidence stream, and `state.json`, then inspected decisive original sources including [Wei et al., *Chain-of-Thought Prompting*](https://arxiv.org/html/2201.11903v6), [Schick et al., *Toolformer*](https://arxiv.org/abs/2302.04761), and [*Prompting Science Report 2*](https://arxiv.org/abs/2506.07142).

- **Appendix completeness:** passed. All 19 retained original sources have one complete appendix row with direct URL, source type/date, method or evidence form, supported claim, and important limitation. This includes the formerly omitted Toolformer and *Prompting Science Report 2* rows.
- **Stop reason/state agreement:** passed. The stop reason correctly says the synthesizer completed. `state.json` records the synthesizer assignment as `status: completed` and `nativeStatus: completed`; the earlier report-validation failure was superseded by the two documented corrections.
- **R1–R3 and links:** qualified coverage remains correct. R1 has conditional benchmark results but no target total-cost, latency, retry/tool-cost, or acceptance evidence. R2 has direct regressions and transfer limits but no target safety/reliability measurement. R3 supplies a reusable A0–A4 paired local-evaluation artifact, but it is unexecuted and has no preregistered target thresholds. The material report links are direct original-source URLs, and no common cross-study ranking is claimed.

**Remaining decision-changing gap:** run the retained paired protocol on the target workload with a fixed model and validator, total-cost and tail-latency accounting, and safety/adversarial strata before selecting a production configuration.