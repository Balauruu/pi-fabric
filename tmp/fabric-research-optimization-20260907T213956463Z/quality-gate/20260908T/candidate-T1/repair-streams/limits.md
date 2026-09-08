## R2 — Counterevidence, regressions, and transfer limits

### 1. Few-shot prompts are highly order- and format-sensitive

[Calibrate Before Use](https://arxiv.org/html/2102.09690v2) tested GPT-3 (2.7B, 13B, 175B) and GPT-2 1.5B across classification, retrieval, and extraction tasks.

- **Method:** Hold format fixed, vary demonstrations and evaluate every ordering.
- **Task/model/result:** On SST-2 with four demonstrations and GPT-3 2.7B, changing only demonstration permutation moved accuracy from **54.3% to 93.4%**. Reversing two examples changed accuracy from **88.5% to 51.3%**.
- **Decisive passage:** “*varying the permutation of the training examples can cause accuracy to go from near chance (54.3%) to near state-of-the-art (93.4%).*”
- **Mechanism tested:** answer-label and position bias. Content-free contextual calibration (`N/A`, `[MASK]`, empty string) improved average and worst-case accuracy by up to **30.0 absolute points**.
- **Adoption limit:** A winning few-shot prompt is not a stable technique claim until it survives exemplar-set, order, label-token, and formatting perturbations on the deployed model.

### 2. CoT gains do not establish faithful reasoning

[Towards Understanding Chain-of-Thought Prompting](https://arxiv.org/html/2212.10001v2) replaced correct few-shot rationales with invalid ones, using greedy decoding at temperature 0 on 800 GSM8K examples and all 125 Bamboogle examples.

| Model | GSM8K answer accuracy, valid → invalid CoT | Bamboogle answer F1, valid → invalid |
|---|---:|---:|
| `text-davinci-002` | 48.5 → 39.5 | 45.2 → 39.4 |
| `text-davinci-003` | 54.5 → 51.5 | 59.5 → 56.4 |
| Flan-PaLM | 63.8 → 64.4 | 56.9 → 52.8 |
| PaLM | 37.0 → 31.8 | 54.8 → 46.1 |

- The authors report that all tested models retained **over 90%** of CoT performance under intrinsic rationale metrics with invalid demonstrations.
- **Decisive passage:** “*ablating the validity of reasoning for the demonstrations only brings a small performance degradation.*”
- **Transfer limit:** effects varied by task and model. On Bamboogle, PaLM and InstructGPT reversed the importance of rationale coherence versus relevance. For Flan-PaLM, no ablation had significant impact.
- **Implication:** Do not treat an emitted chain as an audit trail or use it as the sole basis for tool authorization, grading, or incident explanation.

A stronger alternative is [Faithful Chain-of-Thought Reasoning](https://arxiv.org/abs/2301.13379), which translates natural language into a symbolic program and uses a deterministic solver. Against standard CoT, it improved relative accuracy on 9 of 10 benchmarks: **+6.3%** math-word problems, **+3.4%** planning, **+5.5%** multi-hop QA, and **+21.4%** relational inference. This is counterevidence to relying on prose CoT alone, not evidence that symbolic translation transfers to arbitrary open-ended text tasks.

### 3. Self-consistency buys accuracy by multiplying inference cost and has bounded applicability

[Self-Consistency Improves Chain of Thought Reasoning](https://arxiv.org/html/2203.11171) compared greedy CoT against majority voting over **40 independently sampled reasoning paths**, averaged over 10 runs.

- **Compute condition:** 40 decodes, not one. PaLM-540B jobs took **2–12 hours per task**, and GPT-3 used 128 generated tokens per sample.
- **Example effect:** PaLM-540B GSM8K accuracy improved **56.5% → 74.4%**. `code-davinci-002` improved **60.1% → 78.0%**.
- **Diminishing-return counterweight:** Some tasks improved only modestly, e.g. PaLM ARC-E **95.3% → 96.4%** and GPT-3 Coinflip **99.0% → 99.5%**.
- **Transfer boundary:** the method is applicable “*only to problems where the final answer is from a fixed answer set*.” Open text requires a sound equivalence/consistency metric.
- **Model boundary:** smaller models saw lower gains, which the authors attribute to reasoning capabilities emerging only at sufficient scale.
- **Operational limit:** test 5 or 10 paths first, report quality against generated-token and latency budgets, and do not extrapolate fixed-answer majority voting to text generation or tool plans.

### 4. More context and larger context windows do not reliably improve retrieval

[Lost in the Middle](https://arxiv.org/html/2307.03172v3) tested multi-document NaturalQuestions QA, synthetic key-value retrieval, and open-domain QA across GPT-3.5, Claude, MPT, Flan-UL2, Llama-2, and others.

- **Comparator:** identical relevant evidence at different context positions.
- **Result:** GPT-3.5-Turbo’s multi-document QA performance dropped by **over 20 points** by evidence position; worst-case 20/30-document performance was **56.1%**, below its closed-book result.
- GPT-3.5-Turbo-16K’s worst-case synthetic key-value retrieval was **45.6%** without query-aware contextualization, versus perfect retrieval at 300 pairs when contextualized.
- Llama-2 13B showed a **20-point** base-model best-to-worst disparity. Fine-tuning still left a **10-point** worst-case degradation.
- Adding documents beyond 20 gave only about **+1.5%** for GPT-3.5-Turbo and **+1%** for Claude-1.3 despite improved retrieval recall.
- **Decisive passage:** performance is typically highest when relevant material is at the beginning or end and degrades for material in the middle, “*even for explicitly long-context models*.”

**Adoption limit:** context-window capacity is not demonstrated context use. Evaluate evidence position, distractor count, context length, and retrieval ordering separately. Keep authoritative instructions and relevant evidence near the positions proven effective for the exact model and workload.

### 5. Tool use turns prompt failure into an integrity and availability failure

[AgentDojo](https://arxiv.org/html/2406.13352v3) evaluated tool-using agents over **97 realistic tasks**, **629 security test cases**, and four stateful domains: workspace, Slack, travel, and e-banking. Metrics were benign utility, utility under attack, and targeted attack success rate.

| Agent | Benign utility | Utility under attack | Targeted attack success |
|---|---:|---:|---:|
| Claude 3.5 Sonnet | 78.22% | 51.19% | 33.86% |
| GPT-4 Turbo | 63.43% | 54.05% | 28.62% |
| GPT-4o | 69.00% | 50.08% | 47.69% |
| Llama 3 70B | 34.50% | 18.28% | 20.03% |

- **Decisive passage:** “*Most models incur a loss of 10%–25% in absolute utility under attack.*”
- GPT-4o’s adaptive `Max` attack reached **57.55% targeted** and **68.36% untargeted** attack success, versus **5.41%/33.23%** for a simple “ignore previous” attack.
- Prompt-only defenses trade off safety and usefulness. The BERT injection detector reduced targeted attack success to **7.95%**, but benign utility fell from **69.0% to 41.49%**. Prompt sandwiching left **27.82%** targeted attack success.
- Tool filtering reached **6.84%** targeted attack success, but fails when task-required tools are also attack-sufficient, which applied to **17%** of cases.

**Adoption limit:** prompt instructions and delimiters are not an authorization boundary. Evaluate on task-specific untrusted-tool-output attacks, restrict tool capabilities and side effects outside the prompt, and measure both benign task completion and attack success.

## Coverage and gaps

**Covered:** few-shot stability, CoT faithfulness, sampling-cost tradeoffs, long-context regressions, and tool-agent prompt injection, with original inspected papers and conditions.

**Gaps:** This is not an exhaustive review and does not establish results for post-study model versions, proprietary system prompts, production distributions, multilingual tasks, or aesthetic image/video prompting. Each reported value remains tied to its source model, benchmark, prompt, decoding, and threat model.