# Prompt-technique evidence note

**Scope/status:** Complete for the assigned techniques as of 2026-09-07. This is not a common leaderboard: results remain under each study’s task, model, scaffold, and budget.

## Requirement contract

| ID | Exact requirement | Required contribution | Status |
|---|---|---|---|
| R1 | “Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?” | Quantitative source-bound evidence | Supported |
| R2 | “What strongest counterevidence, regressions and model/task transfer limits constrain adoption?” | Adoption constraints | Supported |
| R3 | “What practical selection rules, failure signals and paired local evaluation follow?” | Operational decision table and evaluation artifact | Supported |

## Quantitative findings

| Technique | Source-bound measured contrast | Conditions and resource evidence |
|---|---|---|
| Few-shot CoT | On GSM8K, PaLM-540B: standard prompt **17.9%** to CoT **56.9%** accuracy. GPT-3 175B `text-davinci-002`: **15.6% → 46.9%**. | Eight manually composed exemplars, except four for AQuA, greedy decoding. [Wei et al., Appendix B Table 1](https://arxiv.org/html/2201.11903#A1.T1) |
| Zero-shot CoT | `text-davinci-002`: MultiArith **17.7% → 78.7%**, GSM8K **10.4% → 40.7%** accuracy. | Add “Let’s think step by step,” generate rationale, then use a second answer-extraction prompt. Both decoding paths greedy. [Kojima et al., Table 1](https://arxiv.org/html/2205.11916#S3.T1) |
| Self-consistency | PaLM-540B GSM8K CoT greedy **56.5% → 74.4%** self-consistency, **+17.9 percentage points**. Code-davinci-002 AQuA **39.8% → 52.0%**, **+12.2 pp**. | Few-shot CoT, 40 independently sampled paths per run, majority answer, results averaged over 10 runs. No API dollar cost reported. [Wang et al., Table 2](https://arxiv.org/html/2203.11171#S4.T2) |
| Tree-of-Thought | GPT-4 Game of 24: CoT **4.0%**, CoT self-consistency with 100 samples **9.0%**, ToT breadth 5 **74%** success. | GPT-4 Chat Completions, temperature 0.7, May 5–16 2023. BFS over three equation steps, retain five candidates, LM valuation. ToT: **5.5k completion + 1.4k prompt tokens**, **$0.74/case**. CoT best-of-100: **6.7k + 2.2k tokens**, **$0.47/case**, **49%** success. [Yao et al., Tables 2 and 7](https://arxiv.org/html/2305.10601v2#S4.T2) |
| ReAct | PaLM-540B HotpotQA EM: ReAct **27.4**, CoT **29.4**, Act **25.7**. ReAct→CoT-SC **35.1**. ALFWorld: ReAct best-of-six **71%** versus Act best-of-six **45%**. WebShop: ReAct **40.0%** success versus Act **30.1%**. | Frozen PaLM-540B, greedy few-shot trajectories. HotpotQA used six examples and restricted Wikipedia `search`/`lookup`; ALFWorld had 134 unseen games and six prompt permutations; WebShop had 500 test instructions. [Yao et al., Tables 1–3](https://arxiv.org/html/2210.03629) |
| Long-context position / prompt-order intervention | In multi-document QA, GPT-3.5-Turbo closed-book accuracy was **56.1%**, oracle single-document accuracy **88.3%**. With 20–30 documents, middle-position relevant evidence could fall below the closed-book result by **over 20 percentage points**. GPT-3.5-Turbo and its 16K counterpart were nearly superimposed when both fit the context. | Controlled document count and relevant-document position. [Liu et al., Table 1 and §2.3/Figure 5](https://aclanthology.org/2024.tacl-1.9.pdf) |
| Long-context prompt intervention | Across 21 decoder-only models and LogiQA, SciQ, RACE-M, RACE-H, repeating answer options after context improved QOC ordering **54.54% → 62.76%**, **+8.22 pp**. CoT reduced the CQO–QOC ordering gap **14.72 → 7.47 pp**. | Accuracy averaged across 21 models. The CoT block uses generative scoring, unlike logit scoring above, so absolute values are not comparable across blocks. [“Lost in the Prompt Order,” Table 2](https://aclanthology.org/2026.findings-acl.1921.pdf) |

## Diagnostic and counterevidence

- **CoT is not monotonically beneficial.** LaMDA-137B on AQuA regressed **25.5% → 20.6%**. LaMDA-420M GSM8K regressed **2.6% → 0.4%**. GPT-3 175B on MAWPS SingleOp regressed **90.9% → 88.8%**. These are direct evidence against applying rationale prompting to easy tasks or undersized models without measurement. [Wei et al., Appendix B Tables 1–3](https://arxiv.org/html/2201.11903)
- **Zero-shot CoT is task- and output-format-sensitive.** The source reports no CommonsenseQA gain and cases of multiple-choice output ambiguity despite seemingly reasonable rationales. [Kojima et al., Table 3](https://arxiv.org/html/2205.11916#S3.T3)
- **Self-consistency multiplies inference.** Its headline values use **40 generations × 10 runs**. Gains can be small, including PaLM-540B AddSub **+1.8 pp**. The authors state five or ten paths may capture most gains, but do not publish monetary cost. [Wang et al., §3 and Table 2](https://arxiv.org/html/2203.11171)
- **ToT is specialized search, not a generic prompt.** The 74% result is Game of 24, a novel three-step search task. The authors explicitly limit coverage to three relatively simple tasks and report **5–100×** more generated tokens than CoT depending on prompt/search choices. [Yao et al., Appendix B.3 and Limitations](https://arxiv.org/html/2305.10601v2)
- **ReAct tool observations reduce one failure mode but introduce others.** In a human review of 50 correct and 50 incorrect trajectories per method, ReAct success traces had **6%** false-positive/hallucinated facts versus CoT’s **14%**. Among failures, ReAct had **47%** reasoning error and **23%** search-result error, while CoT had **56%** hallucination. Empty or unhelpful search results can derail ReAct. [Yao et al., HotpotQA error analysis](https://arxiv.org/html/2210.03629)
- **Repair evidence is narrow.** One ALFWorld trajectory succeeded after a human edited two thought entries. This demonstrates a repair mechanism, not a measured autonomous-repair rate. [Yao et al., ALFWorld case study](https://arxiv.org/html/2210.03629)
- **Long context is not reliable retrieval.** Larger nominal context did not resolve position sensitivity in the controlled study. Reordering or repeating decision-critical material is a testable intervention, not proof that all long-context tasks benefit.

## Operational selection table

| Work type | Start with | Escalate when | Failure signal | Do not infer |
|---|---|---|---|---|
| Production text generation | Direct prompt with deterministic format validator | Few-shot examples only if measured output quality rises | Longer answers, format drift, or unchanged acceptance | Reasoning-benchmark CoT gains transfer to prose quality |
| Bounded arithmetic or symbolic reasoning | Few-shot CoT | Self-consistency with a small tested path count if final-answer validator exists | CoT regression against direct prompting | A rationale is faithful or causally correct |
| Search/planning with reversible intermediate states | ToT-style bounded search | Only when branch value can be checked and token budget is acceptable | Branch explosion, weak state valuation, no gain over best-of-*k* | Game-of-24 economics transfer to production tasks |
| Tool-using tasks | ReAct with restricted tools, action schema, state validator, loop cap | Hybrid ReAct→CoT-SC for stalled/low-confidence tasks | Repeated action/thought, empty observations, seven-step stall, unsafe or irrelevant tool call | Tool access alone improves correctness |
| Long-context QA or decision prompts | Put decisive evidence near query/end, repeat critical options or identifiers | Retrieval/reranking or decomposition after position probes | Material answer changes when support is shuffled | Advertised context length means uniform context use |

## Reusable paired evaluation artifact

```text
Task strata: text-generation / reasoning / tool-use / long-context.
For each frozen task input:
  A = production baseline prompt and scaffold.
  B = one intervention only.

Hold fixed: model snapshot, system prompt, temperature, max output,
tools, retrieval corpus, retry policy, validator, context/token budget.
Randomize task order. For long-context tasks, rotate support material
beginning/middle/end. For tool tasks, retain action-observation trace.

Record per task:
  final-state acceptance, validator failure category, input/output tokens,
  tool calls, retries, wall time, and total accepted-task cost.
Decision rule:
  adopt B only if its acceptance improvement exceeds its agreed cost and
  latency budget in every required stratum, with no new safety-critical
  failure category. Otherwise retain A or narrow B's applicability.
```

## Coverage and gaps

| Requirement | Disposition | Stop reason and smallest next check |
|---|---|---|
| R1 measured effects | Supported | Primary studies supplied task, model, comparator, metric, and available token/USD or compute conditions. Most CoT, zero-shot CoT, ReAct, and long-context papers do not provide production-total cost. Next check: run the paired artifact with the deployed model, tools, and price schedule. |
| R2 counterevidence and transfer | Supported | Direct regressions, task limits, tool-stage diagnostics, and context-position failures were inspected. The older studies do not establish outcomes for 2026 proprietary model snapshots. Next check: repeat representative strata on the target snapshot. |
| R3 selection rules and local evaluation | Supported | Rules are bounded inferences from evidence, not universal rankings. The artifact needs user-defined acceptance, latency, and cost thresholds before execution. |

## Retained-source appendix

| Source | Type/date | Supports | Important limitation |
|---|---|---|---|
| [Wei et al.](https://arxiv.org/html/2201.11903) | NeurIPS paper, 2022 | Few-shot CoT gains and regressions | Older models and manually authored examples |
| [Kojima et al.](https://arxiv.org/html/2205.11916) | arXiv paper, 2022 | Two-stage zero-shot CoT | `text-davinci-002`, output-extraction sensitivity |
| [Wang et al.](https://arxiv.org/html/2203.11171) | ICLR paper, 2023 | Multi-sample self-consistency | Large sampling budget, no dollar cost |
| [Yao et al., ToT](https://arxiv.org/html/2305.10601v2) | NeurIPS paper, 2023 | Search success and tokens/USD | Three specialized tasks |
| [Yao et al., ReAct](https://arxiv.org/html/2210.03629) | ICLR paper, 2023 | Tool use, hybrid stages, diagnostics | Frozen PaLM-540B and restricted environments |
| [Liu et al.](https://aclanthology.org/2024.tacl-1.9.pdf) | TACL paper, 2024 | Long-context position failure | Controlled QA, not all long-context work |
| [Lost in the Prompt Order](https://aclanthology.org/2026.findings-acl.1921.pdf) | ACL Findings paper, 2026 | CoT and option-repetition intervention | Scoring methods differ across Table 2 blocks |