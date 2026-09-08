## R1 — Qualify

**Source-check evidence:** Direct originals confirm the reported CoT, self-consistency, ReAct, ToT, and few-shot/zero-shot comparisons under their named conditions. For example, [Wei et al.](https://arxiv.org/html/2201.11903) reports PaLM-540B GSM8K 17.9→56.9; [Wang et al.](https://arxiv.org/html/2203.11171) reports 40 independent paths, averaged over 10 runs; [ReAct](https://arxiv.org/html/2210.03629) reports ALFWorld 71 vs 45 and WebShop 40.0 vs 30.1; [ToT](https://arxiv.org/html/2305.10601) confirms GPT-4 Game-of-24 74%, GPT-3.5 ToT 19%, 5.5k completion tokens, and 5–100× CoT-generation-token variability.

**Correction request:** Correct the zero-shot-CoT cost/method row. [Kojima et al.](https://arxiv.org/html/2205.11916) explicitly uses **two-stage prompting**: one generation for rationale and a second for answer extraction. Replace “one generation per case” with two sequential model generations, while retaining that token and currency totals are unreported.

## R2 — Retain, qualified

**Source-check evidence:** Direct originals support the retained limits: [Zhao et al.](https://arxiv.org/html/2102.09690v2) confirms SST-2 order sensitivity of 54.3→93.4 and 88.5→51.3; [Turpin et al.](https://arxiv.org/html/2212.10001v2) confirms the invalid-rationale ablation, 800 GSM8K and 125 Bamboogle cases, and over-90% intrinsic-rationale retention; [Lost in the Middle](https://arxiv.org/html/2307.03172v3) confirms 56.1% closed-book, 45.6% worst-case retrieval, and positional degradation; [AgentDojo](https://arxiv.org/html/2406.13352v3) confirms 97 tasks, 629 security cases, the reported utility/ASR rows, BERT-based injection detection, and the 17% tool-sufficiency boundary.

No correction required. All conclusions must remain bounded to the evaluated models, prompts, benchmarks, and threat models.

## R3 — Qualify

**Source-check evidence:** [Wang et al.](https://arxiv.org/html/2203.11171) supports trying 5 or 10 self-consistency paths after establishing the 40-path comparison. [ReAct](https://arxiv.org/html/2210.03629) supports the same-trajectory, thoughts-removed control. [Turpin et al.](https://arxiv.org/html/2305.04388v2) supports paired comparisons and counterfactual faithfulness checks, including GPT-3.5 zero-shot-CoT 59.6→23.3 under Suggested Answer bias.

**Correction requests:**
1. Mark the direct-instruction/schema text rule as a **proposed local baseline**, not evidence-grounded measured guidance. The retained sources do not establish a production prose-quality effect.
2. Repair the artifact’s self-consistency treatment. Its global `temperature: 0` conflicts with diverse-path sampling. Use treatment-specific sampling settings and parameterize a 5/10-path screening sweep.
3. Add total-cost-per-accepted-task fields: input, cached-input, reasoning, output, tool, retry, and verification cost where available. Keep unavailable components explicitly unknown.
4. Label `repeats: 3`, the bootstrap rule, and acceptance thresholds as proposed local design choices, or supply their decision-specific basis.