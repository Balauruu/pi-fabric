Literal candidate path confirmed:

`/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-001/live/T1/RESEARCH.md`

Overall classification: **material regression**.

| Question | Comparison | Classification |
|---|---|---|
| Q1 Measured effects | Candidate adds useful zero-shot CoT, self-consistency, ToT, and ordering evidence. It removes legacy’s measured verifier-backed repair, tool-call validity/error-stage evidence, and ReAct brittleness/token accounting. | **Tradeoff**, but weakened by citation defects |
| Q2 Counterevidence | Candidate improves generic CoT regressions and ReAct failure taxonomy. It drops decisive legacy counterevidence: ReAct’s approximately 14M input / 150K output-token burden, feedback-free Reflexion’s 52% vs 60% baseline regression, and long-context end-position degradation. | **Material regression** |
| Q3 Operational selection | Candidate’s table is usable for text, reasoning, tools, and context. It omits the legacy’s explicit code/API verifier-backed repair path and detailed tool-schema/tool-selection rules. | **Material regression** |
| Q4 Local evaluation artifact | Candidate retains pairing and per-instance cost fields, but removes clean-state control, declared hard budgets, repetitions, protected strata, p50/p95 reporting, exact/CI testing, and explicit rollback criteria. | **Material regression** |
| Q5 Source appendix | Candidate lists its nine cited sources, but is not a reliable complete retained-source appendix. It drops five legacy retained sources and has two title/URL mismatches. | **Material regression** |
| Q6 Decision-grade integrity | Candidate is concise, scoped, and appropriately rejects universal rankings. Citation integrity and the reduced production-agent/repair evaluation contract prevent it from replacing legacy. | **Material regression** |

Concrete regressions:

1. **Broken source identity:** candidate labels `arxiv.org/html/2304.03262` as Huang et al., *Large Language Models Can Self-Improve*. The inspected primary source title is *When do you need Chain-of-Thought Prompting for ChatGPT?*
2. **Broken source identity:** candidate labels `arxiv.org/html/2601.14152v2` as *Lost in the Prompt Order*. The inspected primary source title is *Revealing the Limitations of Causal Attention in Language Models*. Its ordering numbers therefore need source-specific revalidation before use.
3. **Lost agent-cost warning:** legacy’s Song et al. evidence is absent. The inspected source reports approximately **14M input tokens** and **150K output tokens** for 134 ReAct instances.
4. **Lost repair boundary:** legacy’s Reflexion evidence is absent. The inspected source reports feedback-free reflection at **52% versus 60%** baseline, supporting the verifier requirement.
5. **Lost tool-stage evidence:** legacy’s API-Bank evidence is absent. The inspected source reports GPT-4 overall correctness **60.24%**, with failed API retrieval **67.86%** and false call format **17.86%** in its error analysis.
6. **Weaker long-context guidance:** candidate omits the inspected Anthropic result that scratchpad/examples can degrade end-position performance, despite helping beginning/middle placement.

Primary-source checks confirm the major legacy quantitative claims above, plus candidate’s Wei and Kojima figures. The appendix is therefore **not acceptable as a retained-source appendix** until the two mismatched citations are corrected and the omitted legacy sources are either restored or explicitly dispositioned.