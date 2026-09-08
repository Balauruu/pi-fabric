# T1 frozen-evidence input

## Scope lock
This corpus is for **phase-only tests** of the original T1 task. Use only the six saved primary-source files below. Do not add sources, use unstated current-model assumptions, or treat a claim from one condition as a cross-model ranking.

## Frozen sources
- [S1: Chain-of-Thought](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S1-chain-of-thought.md)
- [S2: Tree of Thoughts](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-tree-of-thoughts.md)
- [S2 cost-table supplement: raw primary extraction](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S2-cost-tables.md). Use this supplement for Table 7/8 headers and cells. It identifies the exact v2 primary URL, raw HTML locators, markup, and format limitation.
- [S3: Lost in the Middle](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S3-lost-in-the-middle.md)
- [S4: Is Self-Repair a Silver Bullet for Code Generation?](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S4-self-repair-silver-bullet.md)
- [S5: ReAct](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/corpus/T1/sources/S5-react.md)

## Exact T1 prompt for this corpus
Produce a decision-grade guide to choosing prompt techniques for production text, reasoning, and tool-using LLMs using **only the frozen evidence above**.

1. State which techniques have measured effects, preserving each original task, model, comparator, result, method, and measured compute or cost where available.
2. State the strongest counterevidence, regressions, and model/task transfer limits.
3. Give practical selection rules, failure signals, and a paired local-evaluation artifact.

Include an operational decision table and an original-inspected-source appendix that cites the frozen source path and passage locator. Keep quantitative claims under their original conditions. Distinguish measured evidence from proposed operational controls. Do not invent a universal ranking, claim current-production parity, introduce outside evidence, or supply any conclusion not supported by this corpus. Scope is technical prompting and scaffold/context boundaries for text, reasoning, and tool-using LLMs, not aesthetic image/video prompts.
