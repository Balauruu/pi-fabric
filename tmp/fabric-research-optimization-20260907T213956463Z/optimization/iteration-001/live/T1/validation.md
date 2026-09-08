# Validation: bounded correction required

| Check | Disposition |
|---|---|
| Q1 Measured techniques | **Correct after C1.** Task, model, comparator, method, and results are present. |
| Q2 Counterevidence and transfer | **Accepted.** Direct regressions, simulated-environment limits, and production gaps are retained. |
| Q3 Practical rules and evaluation | **Accepted.** The decision table and paired artifact are concrete, bounded, and retain acceptance, cost, latency, tool, and safety checks. |
| Q4 Retention set | **Correction required.** ToT’s source-unique cost evidence is omitted and contradicted. |
| Q5 Numeric correctness | **Correction required.** All independently checked non-ToT headline numbers are consistent with their primary sources. |
| Q6 Appendix, ownership, structure | **Accepted.** `RESEARCH.md` is the sole report, standalone structure is decision-grade, and the nine-source appendix has linked original sources, type/date, method, claim, and limitation. |

## C1: Correct the ToT cost claim

In **“Bounded search: Tree of Thoughts”** and its appendix row, replace:

> “The paper reports **$106 total** … not a per-case price.”

with the source-bound figures:

- Game of 24 ToT BFS breadth 5: **5.5k completion + 1.4k prompt tokens, approximately $0.74/case**, under the paper’s May 2023 GPT-4 pricing.
- Best-of-100 CoT: **6.7k completion + 2.2k prompt tokens, approximately $0.47/case**, with **49%** success.
- **$106** is the combined cost for the paper’s 100-case Game-of-24 and 100-case creative-writing main experiments, not a universal price.

Keep the existing historical-pricing and non-transfer qualifications. This is required because R1 asks for measured compute/cost where available.

Independent named-web inspection retrieved all nine linked primary sources and directly checked the decisive ToT, self-consistency, and prompt-order claims. The ToT primary source supports the per-case figures.