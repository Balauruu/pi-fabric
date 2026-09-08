# T1 Blind Review

## Verdict: **PASS — X is stronger**

X is the more decision-grade report. It has narrower technique coverage than Y, but materially better operational evaluation design, clearer comparability boundaries, and stronger treatment of counterevidence. Y adds valuable, correctly sourced coverage for ToT, many-shot example selection, ToolRet, Toolformer, and FeedbackEval, but it is not a wholesale improvement.

**Disposition:** retain X as the primary report. Y is a **tradeoff**, not an equivalent replacement or regression. Its additional evidence would be useful only if incorporated without weakening X’s condition tracking and paired-evaluation contract.

## Literal mapping disclosure

- **X:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0104/RESEARCH.md`
- **Y:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/live/T1/RESEARCH.md`
- Internal blind-analysis order was randomized as **A = Y, B = X**. Mapping is disclosed only after analysis.

## Q1. Required coverage

| Candidate | Assessment |
|---|---|
| X | Covers direct prompting/schema, few-shot CoT, ReAct/tool loops, long-context quote extraction, verifier-backed repair, and tool-call validity. It satisfies the core text, reasoning, and tool-use scope. |
| Y | Broader coverage: ToT, refinement, long-context prompting, many-shot ICL selection, feedback repair, same-model verification, tool retrieval, ReAct, and call-trigger policy. |

**Finding:** Y is broader. X deliberately selects fewer decisive studies and still meets the requested non-exhaustive scope. The missing ToT and modern tool-retrieval evidence is a coverage limitation, not a failure.

## Q2. Source entailment and citation completeness

Both reports use primary sources with direct links and retained-source appendices. Direct inspection confirmed decisive claims including:

- CoT: PaLM-540B GSM8K **17.9% → 56.9%** and MAWPS SingleOp **94.1% → 94.1%**.
- ReAct: HotpotQA **27.4 EM** versus CoT **29.4**, FEVER **60.9%** versus **56.3%**, and distinct hybrid results.
- ReAct brittleness: **14M input / 150K output tokens** for 134 instances.
- Reflexion: the 50-hard-Rust ablation’s **52% versus 60% baseline** when test generation/execution is omitted.
- API-Bank: GPT-4 total correctness **60.24%**, failed retrieval **67.86%**, false call format **17.86%**.
- ToT: GPT-3.5’s **19%** versus GPT-4’s **74%** Game-of-24 result, with a changed three-shot proposal prompt.
- ICL selection: significant gains in fewer than **15%** of instances across 18 datasets.
- ToolRet: NV-Embed-v1 nDCG@10 **33.83**, GPT-3.5 ToolBench-G1 **50.60** with retrieved tools versus **62.00** oracle.
- FeedbackEval: reported feedback-type averages and diminishing iterative gains.

**Finding:** Citation entailment is strong in both. X is better at binding a claim to its decision implication and explicit transfer limit. Y is better at adding source-supported breadth.

## Q3. Exact conditions, methods, and results

| Candidate | Assessment |
|---|---|
| X | Usually excellent: model, benchmark, comparator, result, and limitations appear together. Its ReAct ALFWorld/WebShop row should explicitly state that the ALFWorld 34-point comparison is the paper’s **best-of-six** trial result, not an average. |
| Y | Strong on ToT, API-Bank, ToolRet, ReAct, Toolformer, and FeedbackEval. It correctly labels ReAct ALFWorld as best-of-six. Its long-context token-length wording is less reliable than X’s and should preserve the source’s exact reported lengths rather than rounded alternatives. |

**Finding:** X wins on condition discipline. Y has more measured methods, but X more consistently prevents invalid cross-study comparison.

## Q4. Counterevidence and transfer limits

X is stronger. It explicitly reconciles:

- CoT’s difficult-arithmetic benefit versus no SingleOp benefit.
- ReAct’s FEVER gain versus HotpotQA regression.
- Prompt-bundle causal ambiguity and repeated-context token cost.
- Verifier-backed repair versus harmful feedback-free reflection.
- Long-context gains versus end-position degradation.

Y has meaningful counterevidence: same-model self-verification degradation, weak many-shot selection gains, ToT portability limits, and retrieval-versus-oracle loss. However, it explicitly lacks retained evidence for CoT’s task/scale boundary, ReAct brittleness, and Reflexion’s feedback-conditioned ablation. Those omissions reduce its ability to constrain adoption.

## Q5. Operational usefulness and evaluation artifacts

X is clearly superior.

Its YAML artifact freezes model, decoding, renderer, tools, retrieval, and environment snapshots. It requires clean-state paired trials, randomized order, repetitions for stochastic systems, trace retention, stage-level tool metrics, per-stratum deltas, confidence intervals or exact tests, and predeclared promotion and rollback rules.

Y’s artifact is reusable and useful, particularly its tool-workflow measures. It lacks X’s rigor around reproducibility hashes, trial ordering, stochastic repetitions, clean-state verification, and paired statistical reporting.

## Q6. Standalone structure and retained-source appendix

Both are standalone, navigable, and include complete appendices for their respective retained sources.

- **X:** Better structure. The evidence ledger, contradiction table, operating rules, and adoption/unknowns section form a coherent decision flow.
- **Y:** Clear, but evidence is organized by technique without an equivalent cross-technique comparability ledger. It reads more like a broad guide than a tightly governed decision memo.

## Final comparison

| Dimension | Winner | Reason |
|---|---|---|
| Coverage | Y | More techniques and modern retrieval/repair evidence. |
| Entailment/completeness | X, slight | Better claim-to-condition-to-decision binding. |
| Exactness | X | More consistent original-condition retention. |
| Counterevidence | X | Stronger causal and transfer-limit treatment. |
| Operational usefulness | X | Superior paired local-evaluation artifact. |
| Standalone decision structure | X | Better comparability and decision framing. |

**Final verdict:** **X passes as decision-grade. Y is a useful evidence-expanding tradeoff, not a replacement.**