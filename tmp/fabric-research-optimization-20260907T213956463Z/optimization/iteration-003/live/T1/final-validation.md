# Not accepted

The report is structurally strong, but its blanket “no accepted anchors” status is obsolete after source checking and it retains a material comparator error.

| ID | Disposition | Source-checked trace and bounded correction |
|---|---|---|
| Q1 | **Not accepted** | `RESEARCH.md` R1 and the source appendix contain direct original links, but its verification status rejects all evidence despite the supplied stream notes and independently retrievable sources. **Correction:** replace the blanket rejection with per-anchor retain/qualify dispositions. |
| Q2 | **Accepted, qualified** | **ToT** is rendered in `RESEARCH.md` R1 and `streams/operations.md` §1. Original source supports GPT-4 Game-of-24 ToT `b=5` **74%** versus CoT **4%**, and identifies high search cost. Conditions, comparator, unit, and puzzle/self-evaluator caveat travel with the claim. **Correction:** recheck and quote Table 7 before retaining the exact dollar and prompt-token figures. |
| Q3 | **Accepted, qualified** | **Lost in the Middle** is rendered in `RESEARCH.md` R1 and `streams/operations.md` §2. Original source supports the `>20%` worst-case GPT-3.5-Turbo drop below **56.1%** closed-book accuracy and near-superimposed 10/20-document curves. The controlled QA, 2023-model, and non-universal-placement caveats are present. **Correction:** verify the reported **88.3%** oracle value against the cited table before accepting that exact number. |
| Q4 | **Not accepted** | **Reflexion** appears in `RESEARCH.md` R1/R2 and `streams/operations.md` §3. The original source supports the generated-test mechanism, MBPP limitation, and non-independent-validator caveat, but the inspected HTML describes HumanEval baseline accuracy as **82%** while the report states **80.1%**. **Correction:** reconcile the exact source version/table, benchmark subset, language, and baseline before retaining `91.0% vs 80.1%` and the MBPP/LeetCode figures. |
| Q5 | **Accepted, qualified** | **Self-Refine, ReAct, Bhattacharya, equal-token sampling, and Silver Bullet** are rendered in `RESEARCH.md` R1/R2 and comparison notes. Checked sources support: Self-Refine `27.3→36.0` and `27.5/26.0/24.8`; ReAct HotpotQA `27.4/25.7/29.4` and FEVER `60.9/58.9/56.3`; Bhattacharya’s `14M` input/`150K` output tokens and exemplar sensitivity; equal-token losses of `3.6–10.1` points at 7B; and `1.05×` versus `0.97×` repair-budget results. Conditions, comparators, units, and transfer caveats are mostly preserved. **Correction:** change ReAct ALFWorld wording from “**57% ReAct versus 45% Act**” to distinguish **ReAct average 57%** from **Act best-of-six 45%**. They are not like-for-like aggregate statistics. |
| Q6 | **Not accepted** | The paired local evaluation is concrete and appropriately labels product thresholds as local. However, its recommendation table is presented ahead of accepted evidence, while all evidence remains labeled unverified. **Correction:** after Q1–Q5 dispositions are repaired, explicitly map each retained rule to its accepted/qualified anchor and retain unknowns for unverified exact figures. |

## Required bounded corrections

1. Rebuild `verification.md` from the supplied stream notes and original-source checks, with retain/qualify/reject dispositions per anchor.
2. Correct or qualify the Reflexion baseline figures and ReAct ALFWorld aggregate comparator.
3. Recheck the exact ToT cost-table and Lost-in-the-Middle oracle figures before accepting those numbers.
4. Update `RESEARCH.md` status and R1/R2 coverage so they no longer contradict the source-checked anchors.