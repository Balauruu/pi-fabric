## R1: Fixed-model run-design evaluations

### E1 — Agentless component ablations
**Source:** [Agentless (Xia et al., 2024)](https://arxiv.org/html/2407.01489)  
**Task:** 300 real Python-repository issue fixes in SWE-bench Lite.  
**Fixed coding model:** `gpt-4o-2024-05-13`; greedy decoding by default and temperature 0.8 for sampling. The paper states: “we implement Agentless using GPT-4o … During sampling, we use a sampling temperature of 0.8.”

| Run-design choice | Comparator | Outcome | Cost condition |
|---|---|---:|---:|
| Context selection: prompt retrieval vs embedding retrieval vs combined | Prompt only: 78.67% correct ground-truth file localization. Embedding: 67.67% without irrelevant-folder filtering, 70.33% with it. Combined: **81.67%**. | Combining context selectors improved file localization by **3.00 pp** over prompt-only. | $0.02 prompt, $0.04 filtered embedding, $0.06 combined per issue for file localization. |
| Decomposition / context compression | File → relevant element localization with full file versus skeleton representation. | The paper reports skeletons retain more ground-truth locations than whole files, while reducing context. Its decisive condition is that all localized files exceed 3,000 lines, while the next hierarchical stage reduces the context below 800 lines. | Not a clean isolated end-to-end solve-rate contrast in the extracted table. |
| Diversity/retries: repair from locations | 40 repairs from one greedy location set: **88/300 (29.33%)**. 40 repairs from merged multi-location contexts: **85 (28.33%)**. Four separately sampled location sets × 10 repairs: **96 (32.00%)**. | Preserving separate contexts gained **8 fixes / 2.67 pp** over greedy locations and **11 / 3.67 pp** over merged contexts. | Repair-stage average cost: $0.22, $0.24, and $0.29 respectively. |
| Validation / repair selection | Majority vote: **77/300 (25.67%)**. Add existing regression-test filtering: **81 (27.00%)**. Add generated reproduction-test filtering: **96 (32.00%)**. | Regression feedback gained **4 fixes / 1.33 pp**. Reproduction-test feedback gained another **15 / 5.00 pp**, or **19 / 6.33 pp** over voting alone. | Selection-stage average costs: $0.00, $0.01, and $0.25. |
| Retry budget | Candidate patch count increased to 40. | One greedy patch per each of four location sets solved 80 issues. Performance plateaued around 40 samples. If an oracle selected any correct candidate, 126/300 (**42.0%**) had a correct candidate. | More sampling is not automatically useful after the selection mechanism saturates. |

**Method details.** Agentless is a prescribed localization → repair → validation pipeline rather than an autonomous tool-choosing loop. It localizes the top three suspicious files, creates four separate edit-location sets, generates ten repairs per set, then selects among 40 patches. Its implementation documentation confirms that it runs both repository regression tests and up to 40 generated reproduction-test candidates before reranking: [Agentless SWE-bench procedure](https://github.com/OpenAutoCoder/Agentless/blob/main/README_swebench.md).

**Decisive passages.**
- “Table 3: Performance of different repair setups” reports **88 (29.33%)**, **85 (28.33%)**, and **96 (32.00%)** at $0.22, $0.24, and $0.29.
- “Table 4: Performance of different patch selection” reports **77 (25.67%)**, **81 (27.00%)**, and **96 (32.00%)** at $0.00, $0.01, and $0.25.
- The paper reports that a single large context is counterproductive: “Using all of the localized files leads to a large context window (>3000),” motivating hierarchical localization.

### E2 — SWE-bench context and output-format ablations
**Source:** [SWE-bench (Jimenez et al., 2024)](https://arxiv.org/html/2310.06770)  
**Task:** 2,294 issue–pull-request tasks from 12 Python repositories.  
**Fixed-model comparisons:** Same model within each context/output condition, including GPT-4 and Claude 2.

| Run-design choice | Comparator and outcome | Interpretation |
|---|---|---|
| Context selection | BM25 retrieval versus **oracle** reference-patch files. Claude 2: **1.96%** resolved with BM25 and **4.8%** with oracle files. | Retrieval/context is a major bottleneck, but oracle context is not a deployable agent condition. |
| Context compression | Oracle full files versus oracle-collapsed files, retaining only edited lines ±15 lines. GPT-4: **1.3% → 3.4%**. Claude 2: **4.8% → 5.9%**. | With the same model, less irrelevant context improved measured resolution. This is evidence for selective, task-local context, not for leaking ground-truth edit locations. |
| Output representation | Claude 2 generating full files versus patches under oracle retrieval: **2.2%** versus **4.8%**. For the shorter half of tasks: **3.9%** full-file versus **7.8%** patch generation. | Structured small-edit output is preferable to full-file regeneration in this setup. |
| More retrieved context | Increasing BM25 maximum context could improve recall of oracle files, but “performance drops.” | Context coverage is not a sufficient metric. Measure downstream resolution and distractor load. |

**Method conditions and counterevidence.** The study’s sparse setting uses BM25 over repository files. Its oracle setting supplies files edited by the reference pull request and is explicitly “less realistic.” At a 27k-token limit, BM25 retrieved an oracle-file superset in about 40% of cases, but retrieved **none** of the oracle files in almost half. The paper also states that models “perform best on the shortest context window.”

## Operational implications

| Decision | Adopt when | Do not infer |
|---|---|---|
| Hierarchical, bounded context selection | It improves paired task resolution and lowers tokens or latency. | More retrieved files, higher retrieval recall, or an oracle-context result means production gain. |
| Candidate diversity across independently localized contexts | Marginal correct-patch coverage still rises and a validated selector can exploit it. | A fixed retry count is universally optimal. Agentless plateaued near 40 samples in its harness. |
| Validation-based selection | Existing tests and generated task-specific tests demonstrably improve final held-out resolution. | Passing generated tests proves semantic correctness or security. |
| Patch/diff output | Patches apply and resolve more tasks than full-file outputs under the same harness. | The result transfers unchanged to non-Python, greenfield, or multi-repository tasks. |

## Reliability limits and gaps

- **L1 — Benchmark quality:** Agentless’ manual review found exact ground-truth patches in **4.3%** of Lite issues, missing critical information in **10.0%**, and misleading solutions in **5.0%**. It therefore filtered Lite to 249 tasks. This constrains absolute solve rates and can alter rankings.
- **L2 — Leakage remains unresolved:** Agentless identifies possible developer-patch exposure in GPT-4o training data as an internal validity threat. Its temporal comparison is evidence against a strong simple cutoff effect, not proof of no contamination.
- **L3 — Oracle context is diagnostic only:** E2’s largest context effect supplies reference-patch files. Use it to establish headroom, never as evidence that a retrieval method can attain that result.
- **L4 — Narrow coverage:** The direct fixed-model ablations found cover context selection, decomposition, retry diversity, and test-guided selection. They do **not** isolate autonomous tool-feedback loops, wall-clock latency, production incident impact, security, or generalization beyond the SWE-bench Python issue-fix setting.

## Retained-source appendix

1. Xia et al. (2024), *Agentless: Demystifying LLM-based Software Engineering Agents*  
   https://arxiv.org/html/2407.01489  
   Primary fixed-model ablation source. Inspected tables 2–4, implementation, threats to validity, and benchmark-quality analysis.

2. OpenAutoCoder, *Agentless SWE-bench procedure*  
   https://github.com/OpenAutoCoder/Agentless/blob/main/README_swebench.md  
   Original implementation documentation. Inspected repair count, regression testing, reproduction-test generation, and reranking procedure.

3. Jimenez et al. (2024), *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*  
   https://arxiv.org/html/2310.06770  
   Primary benchmark and fixed-model context/output-format evaluation source.