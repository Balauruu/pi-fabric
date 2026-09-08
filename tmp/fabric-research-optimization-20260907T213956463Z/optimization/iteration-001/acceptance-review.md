# Acceptance review — iteration 001

## Decision

- **evidenceAdequate:** true
- **meaningfulImprovement:** false
- **materialRegression:** true
- **matchedParity:** false
- **Acceptance:** reject. Do not replace the best revision.

## Verified evidence

The tested candidate is `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-001/candidate`; the read-only best is `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-04`.

The only production deltas are `candidate/SKILL.md` and `candidate/references/synthesis-and-reporting.md`, both adding the retention-set and material-quantitative-claim checks. `checks/final-scope-check.txt` confirms that scope. The actual changed-path no-write probe used Terra medium, preserved the T1 artifact byte listing, returned null paths, and failed report validation for the retained ToT numeric defect (`checks/no-write-boundary.json`, `checks/no-write-boundary.md`).

Actual integrations ran 16 native Pi leaves at `openai-codex/gpt-5.6-terra`, `medium`, extensions enabled and nonrecursive. `execution.json` records the role IDs, completed status, and 956195 ms controller elapsed. This is sufficient behavioral and live-integration evidence to reject a tested revision. It is explicitly not a matched speed comparison.

The two independent T1 comparisons both name the exact inspected candidate report `live/T1/RESEARCH.md`; the two T3 comparisons do the same for `live/T3/RESEARCH.md`. The reports and validators exist. The iteration record does not provide an exact literal legacy-report mapping for those comparisons, so they cannot establish the required T1/T2/T3 whole-workflow parity on their own. T2 is expressly an unchanged-report retention replay, not a fresh whole-workflow run.

## Material regressions

1. **T1 source integrity and coverage:** `live/T1/RESEARCH.md` misidentifies both `2304.03262` and `2601.14152v2` in its appendix. Direct primary-page inspection identifies them as *When do you need Chain-of-Thought Prompting for ChatGPT?* and *Revealing the Limitations of Causal Attention in Language Models*, respectively. The same report lacks the legacy-specific verifier-conditioned repair, API-stage failure, ReAct token/brittleness, and long-context evidence identified by both independent comparisons. These are useful operating details, not cosmetic omissions.
2. **T1 retention failure:** its validator requires correction of omitted/contradicted ToT cost evidence. The primary ToT source directly supports the 5.5k-completion-token Game-of-24 statement, while the candidate report presents only experiment-total $106 and omits required source-bound per-case accounting requested by its validator.
3. **T3 contract failure:** `live/T3/validation.md` requires a ToolSandbox conditioning qualification and the mandated coverage/stop-reason section. The report lacks that section despite the changed contract requiring it. The independent T3 comparisons also identify material loss of legacy recovery, evaluator-audit, and benchmark/version evidence. The ToolEmu 73.1% versus 78.8% statement is supported by the source's overview passage, so the conflicting 75.3% reviewer objection is not used as a regression finding.

No supported quality gain outweighs these losses. No speed claim was tested.

## Remaining checks

- Fresh same-prompt, same-topic whole-workflow legacy-versus-current-candidate T1, T2, and T3 runs with literal report mappings and matched timing, if parity or speed is later claimed.
