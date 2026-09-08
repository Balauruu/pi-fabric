# Blind Comparison Review A

## Source checks

Primary-source checks supported the decisive reported results:

- **T1:** ToT’s 74% vs 4% Game-of-24 result, 5.5k-token cost, creative-writing scores, and GPT-3.5 transfer caveat are in [Yao et al.](https://arxiv.org/html/2305.10601). Anthropic confirms the 0.939→0.961 result, 70K/95K setup, scratchpad benefit, latency cost, and end-position degradation ([source](https://www.anthropic.com/news/prompting-long-context)). FeedbackEval and Self-Verification Limitations support their reported repair and self-critique boundaries.
- **T2:** SWE-agent supports the 51.7% failed-edit rate and six-run 17.94±0.49 result ([source](https://arxiv.org/html/2405.15793)). Agentless supports 96/300 at 32.00% ([source](https://arxiv.org/html/2407.01489)). Validation Evidence supports the 46.0%, 23.8%, 7.8-point, and 11-second claims ([source](https://arxiv.org/html/2607.28871)). LivePlan supports the stated +15.2-point maximum, +9.9-point mean, and $0.08 cost ([source](https://arxiv.org/html/2608.06701v1)).
- **T3:** AgentDojo supports the GPT-4o utility/ASR and tool-filter values ([source](https://arxiv.org/html/2406.13352v3)). ToolBench-X supports 0.513 best accuracy, 25.5–35.5-point hint gains, and 44–76% repeated-call behavior ([source](https://arxiv.org/html/2606.25819v1)). The evaluator audit supports 92/496 disagreements and 57.9–76.8% run range ([source](https://arxiv.org/html/2607.02577)).

## T1

| Criterion | X | Y | Finding |
|---|---|---|---|
| Q1 coverage | Focused CoT, ReAct, repair, tools, and long context | Broader coverage, adding ToT, example selection, ToolRet, Toolformer | **Tradeoff.** Y broadens technique coverage, but X retains decisive original CoT scale/task boundaries and ReAct-causality evidence that Y explicitly lacks. |
| Q2 sources | Six primary/vendor sources, linked and scoped | Ten linked primary/vendor/repository sources | **Equivalent.** Both have good inline entailment and appendices. |
| Q3 conditions/results | Strong exact-condition ledger and comparators | Strong numerical reporting and qualifications | **Equivalent.** |
| Q4 counterevidence | Reconciled contradictions table and explicit unknowns | Technique-specific caveats and explicit excluded evidence | **Equivalent.** X is more compactly decisive. |
| Q5 operational artifact | Frozen hashes, clean state, randomized order, repetitions, budgets, safety gates | Useful paired artifact, but mixed multi-arm design and fewer reproducibility controls | **Regression in Y.** |
| Q6 standalone/appendix | Coherent, full retained-source appendix | Coherent, full appendix for its broader set | **Equivalent.** |

**Verdict:** **Tradeoff, not promotion.** Y adds verified material but loses retained decision-critical evidence and evaluation rigor. The missing material is genuinely marked unavailable, but is not unavailable to the comparison because X retains it.

## T2

| Criterion | X | Y | Finding |
|---|---|---|---|
| Q1 coverage | Covers context, feedback, retrieval, retry diversity, validation, RepairAgent, Reflexion, leakage, stochasticity, transfer, and evaluator limits | Covers context, edits, branches, selection, evidence quality, and steering | **Regression in X.** X omits retained RepairAgent, Reflexion, patch-vs-full-file, multimodal transfer, and SWE-Bench Pro evidence. |
| Q2 sources | Primary sources plus official Agentless procedure | Strong primary links for retained claims | **Regression in X.** Its appendix is accurate but incomplete against the retained source set. |
| Q3 conditions/results | Detailed fixed-model conditions, costs, comparators, and caveats | Exact conditions and values for retained sources | **Tradeoff.** X improves newer validation-evidence detail, but loses several exact legacy methods/results. |
| Q4 counterevidence | Leakage, weak tests, variance, confounding, transfer, and false negatives | Leakage, variance, confounding, and excluded causal references | **Regression in X.** Explicit gaps acknowledge omissions but do not replace the omitted counterevidence. |
| Q5 operational artifact | Concrete paired artifact and single-lever rules | Clear paired artifact with acceptance primary endpoint | **Equivalent.** |
| Q6 standalone/appendix | Full retained-source appendix | Coherent, but not a full retained-source appendix | **Regression in X.** |

**Verdict:** **Regression.** X is well-written and source-checked, but removes material required for full coverage and retained-source completeness.

## T3

| Criterion | X | Y | Finding |
|---|---|---|---|
| Q1 coverage | Covers τ-bench, ToolSandbox, AgentDojo, ToolBench-X, ToolEmu, WebArena, ToolBench, evaluator audit, InjecAgent, NIST | Covers most operational benchmark and security evidence | **Regression in Y.** Y drops ToolBench API-scale/evaluator evidence and NIST lifecycle/injection guidance. |
| Q2 sources | Thirteen retained sources, including implementation/version sources | Nine retained sources, all linked | **Regression in Y.** The omitted sources are available in X, so “explicitly absent” is not a valid completeness disposition. |
| Q3 conditions/results | Exact methods and outcomes, including ToolBench and NIST scope | Exact methods/results for retained sources | **Tradeoff.** Y clarifies ToolBench-X’s single configuration, but loses exact retained results. |
| Q4 counterevidence | Broad evaluator, simulator, benchmark-version, defense-tradeoff, and security-transfer boundaries | Strong concise boundaries | **Regression in Y.** It omits NIST’s specific control framing and ToolBench evaluator limitations. |
| Q5 operational artifact | Specific 30–50 workflow range, eight-run protocol, approval permutations, and release criterion | Strong deployment evaluation sequence | **Regression in Y.** Y removes the concrete sample/repetition prescription and approval-test matrix. |
| Q6 standalone/appendix | Full retained-source appendix | Coherent, but appendix is incomplete against retained evidence | **Regression in Y.** |

**Verdict:** **Regression.** Y preserves major source-checked claims but narrows required evidence and operational specificity.

## Identity disclosure and literal paths

| Case | X | Y |
|---|---|---|
| T1 | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/experiments/run-0104/RESEARCH.md` | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/live/T1/RESEARCH.md` |
| T2 | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/live/T2/RESEARCH.md` | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/legacy-T2/RESEARCH.md` |
| T3 | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/legacy-T3/RESEARCH.md` | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/live/T3/RESEARCH.md` |

## Overall gate verdict

**FAIL.** T1 is a non-promotable tradeoff. T2 and T3 regress on required retained-evidence coverage, counterevidence, and full retained-source appendices.