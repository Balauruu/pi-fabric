# T1-B independent paired assessment

## Scope and method

Read only the four mapped reports, T1 input/audits, FINAL-RECHECK/CLOSURE, and frozen T1 primary snapshots. This is a frozen-scope quality judgment, not production validation, full legacy parity, workflow-behavior, or speed evidence. `FINAL-RECHECK.md` confirms the T1 v2 ToT accounting and the unresolved slash-column meaning. `CLOSURE.md` concerns T3's AgentProp conflict and supplies no T1 quality verdict.

The task requires conditional technique selection, original-condition quantitative evidence, counterevidence and transfer limits, an operational table, a paired local-evaluation artifact, and frozen-source path/locator appendix. `AUDIT-v2.md` adds explicit repair matched-restart/token controls and ReAct fallback/interface controls.

## Pair verdicts

| Pair | Result | Evidence |
|---|---|---|
| X1 baseline/T1-1 vs Y1 H1/T1-1 | **No material improvement. Regression on a source-conflicted CoT detail.** | The sole byte-level report change is in `Reliability limits`: X1 says “**one** was correct by chance”; Y1 says “**two** were correct by chance.” Both otherwise preserve the same guide, table, controls, and appendix. The frozen source conflicts internally, but Y1 neither identifies it nor cites the passage supporting its changed number. |
| X2 baseline/T1-2 vs Y2 H1/T1-2 | **No change.** | SHA-256 is identical for X2 and Y2: `3b09ff968c2fc3a741e4da319d49869daaedc2554cd64eb5fd55063eb606840a`. Thus Y2 provides neither a gain nor a regression relative to X2. |
| Overall | **H1 does not materially improve the incumbent without regression. Repeat sensitivity is adverse.** | The only attempted change in repeat 1 is unsupported as presented, and it disappears entirely in repeat 2. There is no repeatable H1 improvement. |

## Decisive passage audit

### R1. CoT source conflict, and the Y1 regression

- **X1 report passage:** `Reliability limits` says “in 50 correct GSM8K LaMDA 137B traces, **one** was correct by chance.”
- **Y1 report passage:** the same sentence says “**two** were correct by chance,” while retaining the citation `[CoT Appendix D]`.
- **Frozen primary main-text passage:** `sources/S1-chain-of-thought.md:101` says “all ... correct except **two** that coincidentally arrived at the correct answer.”
- **Frozen primary Appendix D passage:** `sources/S1-chain-of-thought.md:2218` says “Of these 50, **only one** arrived at the correct answer through incorrect reasoning ... The other 49 had correct logic and math.”

This is a material source-internal conflict for a claim used to qualify rationale faithfulness. X1 is not fully clean: it selects the Appendix value without recording the conflict. Y1 is worse as an audited report because it changes to the main-text value while still citing Appendix D, whose decisive passage contradicts that value, and still does not disclose the conflict. A sound report would preserve both passages and avoid a single settled count.

### R2. ToT corrected accounting is preserved in both variants

Both reports correctly retain the v2 literal accounting and its ambiguity. Their Table-7 passage is: “ToT `5.5k / 1.4k`, `$0.74`, `74%`,” with header `Generate/Prompt tokens`, and the prose qualification that 5.5k is called completion tokens. This agrees with `sources/S2-cost-tables.md:9,13,23-27`, including the exact ToT row. Both also preserve the Table-8 Creative-Writing/header-versus-Game-of-24-caption mismatch, consistent with `S2-cost-tables.md:50-56`. No 14k-token error appears.

### R3. Decision-critical comparative controls are generally retained

Both reports condition the recommendations rather than create a universal ranking, retain scope/model/task limits, and separate proposed local controls from measurements. They preserve audited core comparisons: PaLM-540B GSM8K 17.9→56.9, Game-of-24 IO/CoT/CoT-SC/ToT 7.3/4.0/9.0/74, ReAct’s conditional HotpotQA/FEVER tradeoff, executable-test-bound repair, and long-context positional testing. The H1/T1-2 report additionally states the key-value boundary numerically: “perfect ... 300 pairs” versus “45.6% worst case,” then says it minimally improved multi-document QA. This matches `S3-lost-in-the-middle.md:155-157`.

The repair controls are substantively directionally correct but should be read as incomplete operationalization of the v2 audit: both require equal sampled-program and token comparisons, but neither specifies that token matching includes feedback tokens nor explicitly requires fresh independent restarts for uncertainty. The primary says program-count pass@k “does not account for the feedback tokens ... and so risks overemphasizing” repair (`S4-self-repair-silver-bullet.md:332-336`) and warns one pre-populated tree risks statistical artefacts (`:180`). This is a shared, non-comparative omission, not an H1 gain.

## Quality assessment

- **Accuracy:** Strong on audited ToT accounting, conditions, comparators, units, and transfer limits. The unresolved S1 one-versus-two conflict is the sole identified factual defect and is mishandled by both variants, more severely by Y1.
- **Decision-critical preservation:** Strong. The reports retain counterevidence, constrained action/tool environments, repair-test limitations, positional conditions, cost ambiguity, and explicit local evaluation. H1/T1-2 is clearer and more compact than T1-1, but it is the unchanged incumbent in pair 2, not an H1 improvement.
- **Structure and actionability:** Strong. Each guide has an operational table, a bounded selection rule, failure signals, rollback/decision conditions, and a local paired-evaluation artifact. The repair artifact needs the two v2 controls above to be fully audit-responsive.
- **Source handling:** Frozen paths and locators are present in each source appendix. Direct original URLs supplement, rather than replace, frozen local citations. The S1 conflict should be named explicitly, as the reports already do for ToT's table-format conflict.

## Required conclusion

H1 is **not** a material, repeatable frozen-scope improvement over the incumbent. Do not infer full legacy parity, production behavior, or speed from these phase-only comparisons.
