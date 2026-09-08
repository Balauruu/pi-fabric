# Measured Reasoning-Prompt Techniques

## Question, scope, and status

**Question:** Which measured reasoning-prompt and scaffold techniques support production defaults, and what limits their transfer?

**Scope:** Text reasoning and tool-adjacent scaffolds only. Research cut-off supplied: **2026-09-07**. This note inspected original papers for CoT, self-consistency, least-to-most, backward self-verification, and reflection limits. It does not infer results for current proprietary model snapshots, agent tools, or production workloads.

**Status: partial.** The evidence establishes benchmark-specific effects and counterevidence, but not a universal production ranking or dollar/token cost. Reported compute is retained where available.

## Requirement contract

| ID | Exact question | Required inclusions | Expected final-report contribution | Decision context | Status |
|---|---|---|---|---|---|
| R1 | “Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?” | “measured effect”; “exact task/model/comparator/result/method”; “compute or cost where reported” | “Technique evidence and comparability-qualified quantitative table.” | “Choose production prompting/scaffold defaults without a universal ranking.” | qualified |
| R2 | “What strongest counterevidence, regressions and model/task transfer limits constrain adoption?” | “negative or regressive results”; “model/task/context transfer limits”; “conditions that overturn adoption” | “Counterevidence and limitation analysis.” | “Avoid deploying prompts whose gains do not transfer to the target workload.” | supported |

## Findings

### Quantitative evidence

| Technique | Task, model, comparator | Measured result | Method and measured compute/cost | Production interpretation |
|---|---|---:|---|---|
| **Few-shot CoT** | GSM8K, PaLM 540B, standard few-shot prompt | **17.9% → 56.9%** solve rate, **+39.0 points** | Eight manually composed CoT exemplars, greedy decoding. The paper reports no token count or price. [Wei et al., Table 2](https://arxiv.org/html/2201.11903v6) | Strong evidence for difficult multi-step arithmetic on this old, very large model. It is not evidence that “show work” improves arbitrary production tasks. |
| **Self-consistency** | GSM8K, PaLM 540B, greedy CoT | **56.5% → 74.4%**, **+17.9 points** | Sample diverse CoT paths and majority-vote final answer. **40 independent outputs per run**, averaged over **10 runs**. Thus generation count is at least 40× greedy-CoT before aggregation. No token/USD cost. [Wang et al., Table 2 and method](https://arxiv.org/abs/2203.11171) | A measured accuracy-cost trade-off when answers have a canonical aggregateable form. Use low agreement as an uncertainty signal, not proof of correctness. |
| **Least-to-most** | SCAN length split, GPT-3 `code-davinci-002`, CoT | **16.2% → 99.7%** accuracy | Decompose command into short commands, then map/solve sequentially. Separate contexts used **8 reduction** and **14 mapping** examples. The output-expansion procedure achieved near-perfect 99.7%; no token/USD cost. [Zhou et al., Table 9 and §4](https://openreview.net/pdf?id=WZH7099tgfM) | Very strong but structurally narrow compositional-generalization result. Its intermediate representation and constrained action language are part of the intervention. |
| **Least-to-most** | Numerical DROP, `code-davinci-002`, CoT | Non-football: **74.77% → 82.45%**. Football: **59.56% → 73.42%** | Prompting methods were 3-shot, except the least-to-most reduction prompt was 5-shot. Outputs were numerically normalized, equations recalculated, and rounded to target precision. [Zhou et al., Table 11](https://openreview.net/pdf?id=WZH7099tgfM) | Evidence supports decomposition when a task naturally breaks into dependent numerical subproblems. The scoring/postprocessing scaffold is material and must be reproduced in any comparison. |
| **Backward self-verification** | GSM8K, `code-davinci-002`, CoT | **60.81% → 65.14%**, **+4.33 points** | Generate sampled CoT candidates, rewrite each candidate as a conclusion, mask an original numerical condition, repeatedly predict it backward, score consistency, and select the highest scorer. Candidate and verification sampling add calls, but the paper does not give total K/P, tokens, or USD in the inspected passages. [Weng et al., Table 1 and §§3–4](https://aclanthology.org/2023.findings-emnlp.167.pdf) | A modest measured improvement with a task-specific, checkable backward relation. It is a scaffold, not free “reflection.” |
| **Backward self-verification** | SingleEq, `code-davinci-002`, CoT | **91.01% → 93.40%**, **+2.39 points** | Same backward condition-mask verification. [Weng et al., Table 1](https://aclanthology.org/2023.findings-emnlp.167.pdf) | Smaller gain at a high baseline illustrates diminishing headroom. |

### What the sources actually support

1. **CoT is conditional on model scale and task structure.** The original CoT paper says positive effects emerged around models of roughly 100B parameters. Smaller models generated fluent but illogical chains and could underperform standard prompting. Its Table 2 shows PaLM 8B GSM8K **4.9% standard vs 4.1% CoT**, while PaLM 540B is **17.9% vs 56.9%**. On easy one- or two-step MAWPS subsets, gains were negative or small. [Wei et al., §3.2 and Tables 2–3](https://arxiv.org/html/2201.11903v6)

2. **Self-consistency changes decoding budget, not merely wording.** Its headline GSM8K result compares 40 sampled paths with one greedy path. The same paper reports `code-davinci-002` GSM8K **60.1% CoT → 78.0% self-consistency**, but UL2-20B only **4.1% → 7.3%**. [Wang et al., Table 2](https://arxiv.org/abs/2203.11171) These are not comparable at equal inference cost.

3. **Least-to-most can help on hard compositional structure but adds failure points.** In the inspected DROP failure sample, 4/20 failures were bad reductions, 13/20 wrong subproblem answers, and 3/20 apparently incorrect ground truth. The authors explicitly state some problems are not readily reducible. [Zhou et al., §6](https://openreview.net/pdf?id=WZH7099tgfM)

4. **Verification needs an independently checkable relation.** Weng et al.’s method does not simply ask the model to reconsider. It tests whether a candidate conclusion lets the model recover masked source conditions, then ranks candidates. The reported `code-davinci-001` GSM8K effect is only **13.84% → 13.92%** despite the same design, versus +4.33 points for `code-davinci-002`. [Weng et al., Table 1](https://aclanthology.org/2023.findings-emnlp.167.pdf)

## Counterevidence and limitations

- **C1: Reflection is not a safe default.** Under no external feedback, iterative self-reflection improved ChatGPT’s TruthfulQA metrics but harmed HotpotQA accuracy: **80.2 ± 0.4% standard prompting, 69.7% exploration-only, 71.9% self-reflection**. On TruthfulQA, self-reflection scored **59.0 Rouge-1 / 72.9 BLEURT** versus **57.5 ± 1.1 / 66.8 ± 1.9** standard prompting. [Li et al., Table 2](https://aclanthology.org/2024.findings-naacl.237.pdf) This is a direct regression on grounded multi-hop QA.

- **C2: Reflection transfer is model-dependent.** In the same study, Llama-2-7B-chat HotpotQA fell **61.0 ± 1.0% → 57.5%** with self-reflection. Mixtral-8x7B-v0.1 likewise fell **89.8 ± 0.3% → 89.2%**. [Li et al., Tables 3–4](https://aclanthology.org/2024.findings-naacl.237.pdf)

- **C3: Correctness cannot be self-gated reliably.** The reflection study tested 20 all-wrong and 20 all-correct examples. Models typically gave their own comprehension a 4 or 5 in both sets. [Li et al., Appendix G](https://aclanthology.org/2024.findings-naacl.237.pdf) Do not enable a reflection pass because the model says it is uncertain or confident.

- **C4: Prompt and evaluator are confounded with the technique.** Least-to-most DROP results include numerical recalculation and normalization. SCAN uses Python-like intermediate notation and near-perfect output expansion. CoT uses manually composed demonstrations. These are valid measured systems, not isolated textual instructions.

- **C5: No inspected study establishes tool-use reliability.** None directly measures API invocation accuracy, recovery from tool errors, security, latency SLOs, or current-model costs. A verifier should use an external execution result, schema validator, retrieval citation check, or deterministic domain constraint when production correctness depends on tools.

## Decision guidance

**Inference, not a sourced universal ranking:** choose a scaffold by failure mode and verify it against the target model snapshot and workload.

- Use **single-pass CoT** as an evaluated baseline for genuinely multi-step tasks where intermediate text is acceptable.
- Add **self-consistency** only where the final answer is canonical, aggregatable, and the budget permits many full rollouts.
- Use **least-to-most** only where decomposition is stable, subanswers can be carried forward reliably, and decomposition failures are observable.
- Prefer **external or deterministic verification** for consequential outputs. Treat model-only reflection as an experiment with a stop rule, not a reliability control.
- For tool workflows, compare direct execution, constrained plan plus tool validation, and verifier-gated retry under the same tool-error and retry budget.

## Coverage and gaps

| Requirement | Coverage | Smallest useful next check | Stop reason |
|---|---|---|---|
| **R1 — measured effects with task, model, comparator, result, method, and compute/cost where available** | **qualified** | Run an internal, fixed-snapshot evaluation that records prompt tokens, completion tokens, calls, retry rate, tool failures, latency, and task-specific correctness for direct, CoT, sampled-vote, decomposition, and verifier variants. | Original studies supplied exact benchmark results and some generation counts, but no comparable token, dollar, latency, or tool-error data. |
| **R2 — counterevidence, regressions, and model/task transfer limits** | **supported** | Reproduce the no-feedback reflection ablation on the target grounded/tool workload, stratified by first-pass correctness and task difficulty. | Evidence saturation for the bounded techniques: primary sources directly document small-model CoT regressions, decomposition failures, weak verifier transfer, and reflection regressions. |