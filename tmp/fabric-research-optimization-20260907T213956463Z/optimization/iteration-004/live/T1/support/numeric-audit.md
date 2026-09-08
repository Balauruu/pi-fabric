## Audit result: revisions required

### Material mismatches

| ID | Candidate claim | Source finding | Required correction |
|---|---|---|---|
| F1 | Official ToT repository “reports a later **69%** reproduction.” | The linked repository contains no `69%` or `74%` claim in the inspected content. | Remove it or link the exact issue, commit, or reproduction artifact that reports 69%. |
| F2 | ICL selection has complexity \(O(n^2)\) versus \(O(kn)\). | The linked ICL paper supports the 18-dataset and “fewer than 15%” findings, but does not support either complexity expression. | Remove, qualify as an uncited implementation analysis, or add its original source. |
| F3 | ReAct “Hybrid fallbacks reached **35.1 EM** and **64.6%**, respectively.” | [ReAct Table 1](https://arxiv.org/html/2210.03629) assigns **35.1 HotpotQA EM** to **ReAct → CoT-SC** and **64.6 FEVER accuracy** to **CoT-SC → ReAct**. The report omits the configurations and task-to-metric mapping. | State both configurations explicitly. These are not interchangeable hybrid results. |
| F4 | Scope is “as of **2026-09-07**,” while the repository appendix entry says “accessed **2026-09-08**.” | This is a chronology/scope conflict within the report. | Either advance the as-of date or exclude/identify the post-cutoff repository evidence. |

### Tree of Thoughts verification

No numeric error found in the cited Game-of-24 cost table. [Original Table 7](https://arxiv.org/html/2305.10601) reports:

| Method | Completion / prompt tokens | Cost | Success |
|---|---:|---:|---:|
| CoT best-of-100 | 6.7k / 2.2k | $0.47 | 49% |
| ToT | 5.5k / 1.4k | $0.74 | 74% |

The report preserves these numbers and units correctly. The creative-writing ToT row, **4k / 2.9k** and **$0.32**, is also correct. Note that the paper itself mistakenly captions Table 8 as Game of 24 although its rows are the creative-writing setup. The report correctly describes it as writing.

### ReAct verification

Other cited ReAct numbers match the original conditions:

- ALFWorld: best ReAct trial **71%**, best Act **45%**, BUTLER **37%**, across six controlled trials.
- WebShop: ReAct **40.0%** versus Act **30.1%** success rate.
- Direct knowledge-task rows: HotpotQA ReAct **27.4 EM**, CoT **29.4**, CoT-SC **33.4**. FEVER ReAct **60.9%**, CoT **56.3%**, CoT-SC **60.4%**.
- Failure proportions are correctly described as proportions within human-studied ReAct failures, not benchmark-wide rates.

All remaining inspected quantitative claims were consistent with their linked original sources under the stated conditions.