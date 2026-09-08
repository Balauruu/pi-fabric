# H1b versus incumbent: independent final comparison B

## Verdict

- **Conclusive:** yes.
- **Incumbent gain:** yes.
- **Material regression:** yes.
- **Promotion:** blocked. The new T1-1 factual error is material because it changes a quantitative result in the decision guide and gives a citation that does not support that measurement.

## Candidate-relative changes

### Gain: AgentDojo tool-count discrepancy is now accurately preserved

- **Candidate report passage:** `H1b/T3-2/RESEARCH.md:16` says §3.1 prose reports **74** tools while Table 1 reports **70**. The incumbent at the same passage reported only 70.
- **Primary passages:** `corpus/T3/sources/agentdojo-2406.13352v3.md:73` states “74 tools”; `:116` states 70 tools, 97 user tasks, and 27 injection targets.
- **Finding:** This is a material candidate-relative gain. It satisfies the request to preserve the source's unresolved prose/table conflict rather than silently choosing one count.

### Loss: CoT calculator result changed from the supported 17.8% to 17.3%

- **Incumbent report passage:** `baseline/T1-1/RESEARCH.md:43` says LaMDA 137B GSM8K changes from 14.3% to **17.8%**, citing Table 1.
- **Candidate report passage:** `H1b/T1-1/RESEARCH.md:43` changes it to **17.3%** and cites Table 2.
- **Original cited measurement:** `corpus/T1/sources/S1-chain-of-thought.md:468-470` defines the post-hoc external-calculator condition and Table 1. Its LaMDA 137B GSM8K rows are CoT 14.3 at `:550-552` and `+ ext. calc` 17.8 at `:562-564`.
- **Proposed cited location and same-measurement check:** Table 2 begins at `:692` and is the standard-versus-CoT table, not the external-calculator table. The candidate's 17.3 appears in that table at `:1158`, outside the Table 1 external-calculator measurement. Thus 17.3 is not the reported LaMDA-137B GSM8K calculator result, while 17.8 is.
- **Finding:** Material new factual regression. It blocks promotion despite the separate T3-2 gain.

## Unchanged samples and shared baseline limitations

- **T1-2 and T3-1:** byte-identical to the incumbent. They are not regressions and do not add candidate-relative gain.
- **ToolBench-X scope wording:** both `baseline/T3-2/RESEARCH.md:14` and `H1b/T3-2/RESEARCH.md:14` retain wording about not blending a later v2 main-benchmark scope into v1. This is a shared limitation, not a new H1b regression. Per `corpus/T3/SCOPE-ADJUDICATION.md`, frozen v1 itself contains both the twelve-model main benchmark and the distinct five-model, 200-task diagnostic. The primary source confirms v1 at `toolbench-x-2606.25819v1.md:4-5`, the twelve-model Table 2/main setup at `:637,645,649`, and the five-model 200-task diagnostic at `:663,667`. No private-audit reconciliation is required.
- The phase-only evidence does not establish current-production parity or speed. No such conclusion is drawn here.

## Needed targeted check

Correct only `H1b/T1-1/RESEARCH.md:43`: restore the LaMDA 137B GSM8K external-calculator result to **14.3% → 17.8%** and cite **Table 1**. Then recheck that sentence against all Table 1 rows for the same external-calculator condition. No broad rerun is needed.
