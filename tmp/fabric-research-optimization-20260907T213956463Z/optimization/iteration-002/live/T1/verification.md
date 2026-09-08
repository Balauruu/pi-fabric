## Requirement dispositions

| Requirement | Disposition | Basis and consequence |
|---|---|---|
| R1 | **Qualified** | Selected families have condition-bound measured outcomes and comparators. All retained studies lack accepted-task token, latency, tool, or monetary cost. The CoT headline value conflicts with the currently inspected primary version. Do not present production cost-effectiveness. |
| R2 | **Supported, bounded** | Each adopted family has source-specific regression or transfer evidence. These are primarily 2022–23 PaLM/GPT-3/GPT-4-era studies, not evidence for current model snapshots or production distributions. |
| R3 | **Qualified** | The paired-evaluation templates correctly hold variants and validators fixed, record cost and failure signals, and use final-state grading for tools. They are a proposed local evaluation, not a measured production result. The supplied notes do not contain one complete retained-source appendix across all cited sources. |

## Coverage portfolio

| Technique family | Measured outcome | Compute/cost | Failure or regression bound | Tool-stage / final-state signal |
|---|---|---|---|---|
| Few-shot CoT | **Qualified:** [Wei et al.](https://arxiv.org/html/2201.11903), GSM8K, PaLM-540B, standard few-shot 17.9% vs CoT **56.9%** in the inspected current Table 2. | **Qualified:** intermediate tokens implied, but no token, latency, or price accounting. | **Supported:** small models can underperform standard prompting; easy MAWPS subsets see small or negative gains. | Not a tool family. |
| Self-consistency | **Supported:** [Wang et al.](https://arxiv.org/html/2203.11171), GSM8K PaLM-540B greedy CoT 56.5% vs majority vote 74.4%; code-davinci-002 60.1% vs 78.0%. | **Supported/qualified:** 40 independent samples per run and 10 runs. No price, latency, or token total. | **Supported:** UL2-20B improvements are small, and some symbolic tasks have zero or near-zero improvement. | Not a tool family. Agreement is not a correctness oracle. |
| Self-Refine | **Supported:** [Madaan et al.](https://arxiv.org/html/2303.17651), GPT-4 code optimization 27.3% to 36.0%; constrained-generation coverage is reported for CommonGen-Hard. | **Qualified:** iterative feedback/refinement is material extra inference, but no total cost accounting. | **Supported:** weak self-feedback on math, including 94% “everything looks good” feedback; Vicuna-13B formatting/repetition failures. | **Repair gap:** no tool-stage/final-state result for this family in the retained portfolio. Use deterministic acceptance checks locally before adopting it for correctness-critical work. |
| ReAct | **Supported:** [Yao et al.](https://arxiv.org/html/2210.03629), HotpotQA PaLM-540B ReAct 27.4 EM vs Act 25.7 and CoT 29.4. ALFWorld best ReAct prompt 71% success vs Act 45% and BUTLER 37%. | **Qualified:** action/observation and fallback paths add work, but no token, latency, tool-cost, or dollar result. | **Supported:** on HotpotQA ReAct trails CoT; sampled ReAct failures include 47% reasoning errors and 23% unhelpful/empty search. | **Supported:** ALFWorld environment completion is a final-state measure. |
| Reflexion | **Supported:** [Shinn et al.](https://arxiv.org/html/2303.11366), ReAct+Reflexion solves 130/134 ALFWorld tasks over 12 trials. | **Qualified:** retries, reflections, and interactions are unpriced. | **Supported:** no significant WebShop improvement after four trials across 100 environments. | **Supported:** ALFWorld uses completion plus a trigger of repeated identical action/response for >3 cycles or >30 actions; retain at most three reflections. |

The [Anthropic agent-evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) supports the proposed evaluator boundary: a transcript is not the outcome. Grade final state, tool validity, and operational trace metrics separately. Its `pass@k` versus `pass^k` distinction is relevant when consistency, rather than one successful retry, is required.

## Bounded corrections

1. **C1 — Correct or version-pin CoT.** Replace “58.1% versus 17.9%” with **56.9% versus 17.9%** for the inspected current [Wei Table 2](https://arxiv.org/html/2201.11903), or explicitly pin the older paper version that produced 58.1%. Do not mix results across versions.

2. **C2 — Make cost absence explicit in every adoption row.** “40 paths,” four samples, or 12 trials measure an inference configuration, not production cost. Require local input/output/reasoning tokens, tool charges, wall time, retries, and cost per accepted task.

3. **C3 — Repair the source appendix.** Consolidate all retained sources, including ReAct and Anthropic guidance, into one appendix with URL, date/type, exact supported claim, method, and limitation. The two notes do not currently provide a complete appendix for their combined citations.

4. **C4 — Limit Self-Refine correctness claims.** Keep its constrained-text/code evidence, but phrase math improvement and iteration-count claims only with an exact source table or figure locator. Require an external deterministic validator for correctness-critical refinement.