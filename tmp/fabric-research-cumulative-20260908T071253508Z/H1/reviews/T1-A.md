# T1-A independent paired assessment

## Scope and verdict

This is a frozen-scope quality judgment only. It does **not** establish full legacy parity, production-validator behavior, end-to-end workflow behavior, or speed.

**Overall: H1 does not materially improve the incumbent.** Repeat 1 contains one factual regression and no decision-grade gain. Repeat 2 is byte-identical to its incumbent. The result is repeat-sensitive only in the unfavorable sense: one run regresses and the other makes no change.

## Pair results

| Pair | Judgment | Exact H1 delta | Result |
|---|---|---|---|
| X1 → Y1 | No material improvement, with regression | `RESEARCH.md` changes “in 50 correct GSM8K LaMDA 137B traces, **one** was correct by chance” to “... **two** were correct by chance.” | The frozen primary says: “Of these 50, **only one** arrived at the correct answer through incorrect reasoning” (`corpus/T1/sources/S1-chain-of-thought.md:2218`). X1 was correct. Y1 is incorrect. |
| X2 → Y2 | No improvement or regression | No textual change. SHA-256 is identical: `3b09ff968c2fc3a741e4da319d49869daaedc2554cd64eb5fd55063eb606840a`. | All strengths and defects are preserved exactly. |

The Y1 edit is not a material correction because the cited source contradicts it. It is a narrow factual regression. No H1 passage adds a missing audited fact, comparator, unit, condition, counterexample, or operational control.

## Frozen-source accuracy and retained strengths

Both report families are generally coherent, actionable, and careful about conditional claims. They retain the critical ToT accounting without resolving the source ambiguity: Y2 says “`5.5k/1.4k generate/prompt tokens, $0.74`,” and the frozen Table 7 gives exactly `5.5k / 1.4k`, `$0.74`, and `74%` under `Generate/Prompt tokens` (`corpus/T1/sources/S2-cost-tables.md`, Table 7). The report also explicitly preserves the prose/header ambiguity.

Other decisive claims are accurately bounded:

- Y2: “`IO averaged 7.3%, CoT 4.0%, CoT self-consistency 9.0%, ToT breadth 1 45%, and breadth 5 74%`.” The source reports those values for 100 hard Game-of-24 cases and describes the task-specific three-step BFS/value setup (`corpus/T1/sources/S2-tree-of-thoughts.md:136-159`).
- Y2: “`query-aware contextualization ... 100% at 300 pairs, versus a 45.6% worst case ... minimally changed multi-document QA and slightly decreased other positions`.” The primary passage confirms all of this and separates synthetic key-value retrieval from multi-document QA (`corpus/T1/sources/S3-lost-in-the-middle.md:145-163`).
- Y2 retains ReAct’s task/model/comparator split rather than declaring a universal winner: “`ReAct 27.4 EM versus Act 25.7 and CoT 29.4. On FEVER: 60.9% versus Act 58.9 and CoT 56.3.`” The source explicitly says ReAct lags CoT on HotpotQA and beats it on FEVER (`corpus/T1/sources/S5-react.md:208`).
- Both reports retain the repair comparison’s core restriction. The source compares repair to `k=|programs(T)|` i.i.d. samples and warns that pass@k omits feedback-token cost (`corpus/T1/sources/S4-self-repair-silver-bullet.md:85-89, 332-342`).

The source appendix supplies the required local frozen paths and meaningful passage locators. The reports recognize the ToT source-format limitation rather than presenting conflicting token semantics as settled.

## Shared incumbent material defects retained by H1

### D1. The v2 repair causal-control package is incomplete

Both reports say to compare repair to independent samples at equal sample/token budget. That is useful, but neither paired artifact explicitly requires all three v2 safeguards: (1) record the matched `k` program-sample relation, (2) separately match **total program plus feedback tokens**, and (3) distinguish bootstrap resampling from independent trial replication and run independent restarts for uncertainty.

The omission matters because the primary states that the main metric “does not account for the feedback tokens ... and so risks overemphasizing” repair (`S4:332-334`), while its estimates subsample one large repair tree with replacement (`S4:85-89`). The reports mention bootstrapping as a limitation, but their artifact’s “quality/success with uncertainty” does not turn this into the required independent-restart control.

### D2. ReAct fallback is not operationally reproducible at the reported conditions

Both reports give the combined-policy scores and say to consider “`a bounded fallback between ReAct and sampled CoT only after local validation`” (T1-1 decision table), but omit the actual conditional rule and budgets. The source defines CoT-SC as **21** trajectories at temperature **0.7** with majority answer, and triggers ReAct→CoT-SC only after no answer within **7 HotpotQA** or **5 FEVER** steps (`corpus/T1/sources/S5-react.md:62-70`). The v2 expectation requires preserving both arms and these conditions. Generic step caps in the artifact do not preserve this reported fallback design.

### D3. X2/Y2 omit the audited exact one-step no-gain boundary

X2/Y2 describe “low or negative benefit on easy one-step MAWPS subsets,” but do not retain the audited PaLM-540B SingleOp comparator of **94.1% standard versus 94.1% CoT**. This is decision-critical counterevidence against treating CoT as a default. X1/Y1 do state it, so the omission is report-specific rather than corpus-wide. The frozen table cells show `94.1` and `94.1` (`corpus/T1/sources/S1-chain-of-thought.md:1308-1332`).

## Overall comparison and repeat sensitivity

- **Gain evidence:** none. Y1’s only changed passage is a false numeric change. Y2 has no changed passage.
- **Regression evidence:** Y1’s “`two were correct by chance`” conflicts with the frozen source’s “`only one`.”
- **Baseline quality:** Both baselines are substantially useful frozen-scope guides with strong condition preservation, cost/unit treatment, source appendix, and practical evaluation artifacts. D1-D3 are material baseline defects because they leave repair causality, fallback reproduction, or a central no-gain boundary under-specified.
- **H1 conclusion:** reject a claim that H1 materially improves the incumbent. It preserves baseline defects in both repeats, worsens one factual detail in T1-1, and changes nothing in T1-2.
