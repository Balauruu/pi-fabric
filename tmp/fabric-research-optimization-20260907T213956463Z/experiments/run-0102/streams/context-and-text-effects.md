# Production Prompt and Context Selection Guide

**Assignment:** `context-and-text-effects`  
**Scope date:** 2026-09-07. Technical prompting and scaffold/context boundaries for text, reasoning, and tool-using systems. This is a selective, decision-oriented evidence set, not a universal ranking.

## R1 — Measured effects under original conditions

| Intervention | Controlled task and method | Measured result | Production implication |
|---|---|---|---|
| **Few-shot exemplar order selection** | Lu et al. enumerate the 24 orders of four demonstrations. They evaluate GPT-2 (0.1B–1.5B) and GPT-3 (2.7B, 175B) on 11 text-classification datasets. DBPedia is 1-shot, AGNews 2-shot, others 4-shot. Baselines use five seeds × 24 permutations. GPT-3 175B uses two seeds × 12 permutations due to compute budget. Evaluation subsamples 256 validation examples per dataset for API-cost control. | On SST-2, some four-shot permutations exceed 85% accuracy while others are near 50%. An entropy-based order-selection method reports **13% mean relative improvement** over the all-order baseline across 11 tasks, with up to **30% relative** improvement for high-variance cases. [Original paper, Fig. 1, §4–5](https://arxiv.org/html/2104.08786#S4) | Treat demonstration ordering as a release parameter, not prose formatting. Optimize only on held-out development cases for the deployed model and exemplar pool. |
| **Exemplar-order transfer failure** | Same exhaustive-order experiment across GPT-family sizes. | A permutation fell from **88.7%** on GPT2-XL (1.5B) to **51.6%** on GPT2-Large (0.8B). [Original paper, §2](https://arxiv.org/html/2104.08786#S2) | A prompt order proven on one model/version is not a portable asset. Re-run the order sweep after a model, tokenizer, template, or exemplar change. |
| **Relevant-context placement** | Liu et al. hold the answer constant while moving its one relevant document among 10, 20, or 30 documents in NaturalQuestions-Open multi-document QA. They also use synthetic JSON key–value retrieval with 75, 140, or 300 pairs and 500 examples per setting. | Relevant information at the beginning or end produces a U-shaped curve. In the worst 20/30-document case, GPT-3.5-Turbo loses **more than 20 percentage points** and can perform below its **56.1%** closed-book accuracy. [Original paper, §2.3](https://arxiv.org/html/2307.03172v3#S2.SS3) | For answer-bearing RAG chunks, test start, middle, and end placements. Do not assume a supported context window means uniform usable context. |
| **Repeat the query around context** | The same paper compares normal query-after-context prompting with query-aware contextualization, which places the query both before and after context. | On synthetic 300-pair retrieval, GPT-3.5-Turbo (16K) reaches **100%** with duplicated-query context; its worst normal-prompt condition is **45.6%**. This intervention minimally helps multi-document QA and slightly worsens some placements. [Original paper, §4.2](https://arxiv.org/html/2307.03172v3#S4.SS2) | Use this as a narrowly scoped retrieval probe, not a general reasoning recipe. Its striking gain is for exact synthetic retrieval, not end-task QA. |
| **Prompt/context compression** | LLMLingua compresses instructions, demonstrations, and questions with a budget controller, demonstration-level compression, and token-level pruning. It evaluates GSM8K, BBH, ShareGPT, and ArXiv-March23. | The paper reports **up to 20× compression with little performance loss**. It frames the objective as lower inference cost and latency, but the inspected abstract does **not** provide a dollar cost, a universal quality delta, or a production-model-specific guarantee. [Original paper, abstract](https://arxiv.org/html/2310.05736) | Compression is a candidate when input-token cost or latency dominates. Preserve and separately test task instructions, values, citations, and tool constraints because “little loss” is aggregate and dataset-bound. |
| **RAG versus full long context** | LaRA evaluates 2,326 QA cases over novels, papers, and financial statements, four task types, 32K/128K contexts, seven open and four proprietary models. Outputs are judged by GPT-4o, with a 100-prediction-per-task-type human agreement check for two LC models. | At 32K, LC averages **2.4 points** above RAG across models. At 128K, RAG averages **3.68 points** above LC. At 128K, RAG exceeds LC by **6.48 points** on Llama-3.2-3B-Instruct and **38.12 points** on Mistral-Nemo-12B; GPT-4o and Claude-3.5-Sonnet instead exceed RAG on reasoning by **9.09** and **8.98 points**. [Original paper, abstract and §4](https://arxiv.org/html/2502.09977#S4) | Route by deployed model, effective context length, and task type. Compare/reasoning workloads may need full context on strong LC models. Long noisy location tasks on weaker models are stronger RAG candidates. |
| **Strict structured output constraints** | OpenAI’s documented `json_schema` structured-output mode uses `strict: true`; the comparator is JSON mode. | This is a **contract guarantee**, not a task-quality benchmark: strict structured output adheres to the supported schema, whereas JSON mode guarantees valid JSON but not schema adherence. The API still requires handling refusals, content filtering, and max-token incompleteness. [Official documentation](https://developers.openai.com/api/docs/guides/structured-outputs#structured-outputs-vs-json-mode) | If a downstream program needs a schema, use provider-native strict constraints where supported. Measure semantic field correctness separately. A valid object can still contain wrong decisions. |

### Measured cost and compute

- The few-shot ordering study limits GPT-3 evaluation to 256 validation samples and reduces GPT-3 175B to two seeds and 12 permutations for compute reasons. It does not report a dollar total. [§4](https://arxiv.org/html/2104.08786#S4)
- The long-context placement paper reports that a full GPT-4 experiment would cost **over $6,000**, so it evaluates GPT-4 only on a subset. [§2.2](https://arxiv.org/html/2307.03172v3#S2.SS2)
- No inspected source supplies a portable per-token or per-request cost. Measure actual provider input, output, reasoning, tool, retry, and compression-model costs locally.

## R2 — Counterevidence, regressions, and transfer limits

1. **Prompt-order gains are fragile.** The best ordering transfers poorly even between adjacent GPT-2 sizes. Exhaustive order search costs \(n!\), and the reported selection method is demonstrated on classification, not arbitrary agent trajectories. [Lu et al., §2 and §5](https://arxiv.org/html/2104.08786#S2)

2. **A retrieval improvement is not necessarily an end-task improvement.** Duplicating the query cured synthetic key–value retrieval but did not cure multi-document QA position sensitivity. Do not accept extraction accuracy as proof of grounded reasoning quality. [Liu et al., §4.2](https://arxiv.org/html/2307.03172v3#S4.SS2)

3. **Long-context effects are model and task conditional.** Extended-context GPT-3.5 variants had near-superimposed position curves when both fit the prompt. Some models performed nearly perfectly in the synthetic retrieval test. [Liu et al., §2.3 and §3.2](https://arxiv.org/html/2307.03172v3#S2.SS3) The effect is evidence for testing placement, not proof that every current model loses the middle.

4. **RAG and LC do not have a winner.** LaRA explicitly finds reversals by model strength, context length, and task type. Its own scope is long-document QA, not arbitrary production tool use. [LaRA, §4](https://arxiv.org/html/2502.09977#S4)

5. **Compression changes the evidence boundary.** LLMLingua’s aggregate “little performance loss” does not establish preservation of a particular legal qualifier, tool permission, user preference, or retrieved citation. Its compression model and target-model distribution alignment are additional moving parts. [LLMLingua, abstract and §1](https://arxiv.org/html/2310.05736)

6. **Schema validity is not semantic correctness or safety.** Strict output can fail via refusal or incomplete generation, and it cannot make a model select the correct tool or truthful field value. [OpenAI documentation, refusal and incompleteness handling](https://developers.openai.com/api/docs/guides/structured-outputs#refusals-with-structured-outputs)

7. **Retrieved text is an instruction-injection channel.** In Rag-n-Roll’s LangChain QA configurations, most indirect attacks settle near **40%** malicious-response success, or **60%** when ambiguous answers count. Two or more unoptimized malicious documents can approximate optimized attacks; configuration tuning had limited defensive effect unless functionality was severely harmed. [Original paper, abstract and §VII](https://arxiv.org/html/2408.05025#S7) This is a particular experimental RAG system, not a universal attack rate.

## Operational decision table

| Situation | Default choice | Failure signal | Paired comparison |
|---|---|---|---|
| Stable extraction/classification with examples | Fixed few-shot set, then development-set order selection | Large score range over permutations or model upgrade | Random/current order versus top development order and a held-out permutation set |
| Structured parser, router, or tool arguments | Native strict schema/function constraint plus semantic validation | Parse success is high but argument validity, tool success, or safety failures are not | Free text plus parser/retry versus strict schema, with identical model, temperature, and token cap |
| Exact lookup in a long trusted record | Test query-after versus query-before-and-after context | Middle-position retrieval failure | Three answer placements at each token budget |
| Multi-document reasoning or comparison | Start with LC for strong LC models, evaluate RAG route in parallel | Evidence omission, middle-position failure, or expensive prompts | Full context, top-\(k\) RAG, and compressed top-\(k\), stratified by task type |
| Cost-limited long prompts | Compression only after preserving protected spans | Citation/value/tool-rule loss, increased abstention, or tool-argument errors | Uncompressed versus 2×/5×/10× compression at equal output limits |
| Any untrusted retrieved content with tools | Treat retrieved content as data, not authority. Gate high-impact tools outside prompt text. | Instruction-following from retrieved text, unexpected tool selection, secret disclosure attempt | Clean corpus versus injected corpus, measuring both benign task success and attack success |

## Reusable paired local evaluation artifact

```yaml
name: context_prompt_release_gate
unit: one production-like request
fixed:
  model: "<exact provider/model snapshot>"
  temperature: 0
  max_output_tokens: 1200
  tool_retry_budget: 1
  retrieval_index: "<version/hash>"
  evaluator: "<exact rubric or judge version>"
arms:
  - id: current
    prompt: current
  - id: reordered_examples
    prompt: examples_ordered_from_dev_only
  - id: strict_output
    prompt: current
    output_constraint: "<schema hash>"
  - id: full_context
    context: full
  - id: rag
    context: "top_k=<k>, chunk=<tokens>, ordering=<rule>"
  - id: compressed_rag
    context: "rag + compressor=<version>, ratio=<r>"
stress_strata:
  - relevant_evidence_position: [start, middle, end]
  - retrieval: [clean, distractor, indirect_injection]
  - task: [extract, reason, compare, abstain, tool_call]
record_per_case:
  - task_success
  - schema_valid
  - semantic_field_valid
  - grounded_citation_correct
  - abstention_correct
  - injection_attack_success
  - tool_call_valid
  - tool_side_effect_success
  - input_tokens
  - output_tokens
  - reasoning_tokens
  - tool_calls
  - retries
  - latency_ms
  - monetary_cost
decision:
  primary: "paired per-case task_success difference with confidence interval"
  guards:
    - "no increase in injection_attack_success"
    - "no regression in tool_call_valid or semantic_field_valid"
    - "cost and p95 latency within budget"
  report: "aggregate and every stress stratum. Do not ship on aggregate-only wins."
```

## Coverage and stop reason

- **R1: Supported with qualifications.** Retained controlled evidence covers exemplar order, context placement, query duplication, compression, RAG-versus-LC routing, and output constraints. Strict-schema evidence is an official behavioral contract rather than an independent response-quality experiment.
- **R2: Supported with qualifications.** Retained evidence includes model-transfer failure, synthetic-to-end-task divergence, RAG/LC reversals, schema limitations, and end-to-end indirect injection exposure.
- **R3: Derived operationally.** The selection rules and artifact are an inference from the paired evidence, not a measured universal policy.
- **Stop reason:** Evidence saturation across the requested intervention classes after inspecting original papers and official documentation. The only inaccessible candidate was OpenAI’s announcement page, which returned HTTP 403; the official documentation supplied the decision-changing output-contract details. No additional source was retained merely to broaden coverage.

## Retained-source appendix

1. Lu et al., **“Fantastically Ordered Prompts and Where to Find Them”**. Original paper. Inspected: Fig. 1, §2, §4, §5. https://arxiv.org/html/2104.08786  
2. Liu et al., **“Lost in the Middle: How Language Models Use Long Contexts.”** Original paper. Inspected: §2.2–2.3, §3.2, §4.2. https://arxiv.org/html/2307.03172v3  
3. Jiang et al., **“Compressing Prompts for Accelerated Inference of Large Language Models.”** Original paper. Inspected: abstract and §1. https://arxiv.org/html/2310.05736  
4. Zhang et al., **“LaRA: Benchmarking Retrieval-Augmented Generation and Long-Context LLMs.”** Original paper and benchmark description. Inspected: abstract, §2–4, Appendix C/D. https://arxiv.org/html/2502.09977  
5. De Stefano, Schönherr, and Pellegrino, **“An End-to-End Evaluation of Indirect Prompt Manipulations in LLM-based Application Frameworks.”** Original paper. Inspected: abstract, §VI–VII. https://arxiv.org/html/2408.05025  
6. OpenAI, **“Structured model outputs.”** Official technical documentation. Inspected: Structured Outputs vs JSON mode, refusals, incompleteness, supported-schema limitations. https://developers.openai.com/api/docs/guides/structured-outputs