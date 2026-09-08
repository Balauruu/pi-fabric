# MATCHED quality gate — rev04

## Scope and decision

**Verdict: NOT MATCHED.** The required T1/T2/T3 matched-case gate is not closed. T2 supports at-least-legacy quality, but fresh matched comparisons found material candidate regressions in T1 and T3. No skill was changed. No speed claim was evaluated.

All new artifacts are under this directory. Earlier zero-source reports and review outputs are preserved as historical failed-grant evidence and are not accepted as quality evidence.

## Exact question and report mapping

| Case | Exact prompt | Candidate report | Legacy report | Candidate evidence status | Matched comparison verdict |
|---|---|---|---|---|---|
| T1 | [questions/T1.md](questions/T1.md) | [candidate-T1/RESEARCH.md](candidate-T1/RESEARCH.md) | [../../experiments/run-0104/RESEARCH.md](../../experiments/run-0104/RESEARCH.md) | Fresh rev04 whole-workflow replay. Final validation is qualified. | Material regression. |
| T2 | [questions/T2.md](questions/T2.md) | [../../experiments/run-0201-rev03-T2/RESEARCH.md](../../experiments/run-0201-rev03-T2/RESEARCH.md) | [legacy-T2/RESEARCH.md](legacy-T2/RESEARCH.md) | Reused corrected live report because rev03→rev04 did not change content method. Pre-correction copy retained at `../../experiments/run-0201-rev03-T2-pre-correction/`. | Candidate stronger overall, with bounded retained-evidence gaps. |
| T3 | [questions/T3.md](questions/T3.md) | [../../experiments/run-0202-rev04-T3/RESEARCH.md](../../experiments/run-0202-rev04-T3/RESEARCH.md) | [legacy-T3/RESEARCH.md](legacy-T3/RESEARCH.md) | Existing live rev04 output. | Candidate stronger overall but does not clear the gate without corrections. |

The literal path mapping is also stored in [artifact-mapping.json](artifact-mapping.json). The T2 unchanged-path probe is [T2-reuse-direct-probe.txt](T2-reuse-direct-probe.txt); its shell command had a quoting failure, so this reuse justification relies on the recorded state paths plus the revision journal's documented readback-only rev04 change, not a false successful probe.

## Method adaptation and execution records

- Candidate T1 used direct-controller live research, independent verification, sole-writer synthesis, and independent validation. Native configuration and elapsed records: [candidate-T1/state-research.json](candidate-T1/state-research.json), [candidate-T1/state-synthesis.json](candidate-T1/state-synthesis.json), [repair-synthesis-state.json](repair-synthesis-state.json).
- Existing candidate T2 and T3 native records: [../../experiments/run-0201-rev03-T2/state.json](../../experiments/run-0201-rev03-T2/state.json) and [../../experiments/run-0202-rev04-T3/state.json](../../experiments/run-0202-rev04-T3/state.json).
- Legacy T2/T3 used the copied legacy method with disclosed direct-controller transport: independent Terra-medium research leaves plus same-model synthesis adapter. No candidate verification phase was added to legacy. Records: [legacy-research-state.json](legacy-research-state.json) and [repair-synthesis-state.json](repair-synthesis-state.json).
- Every new role was native Pi, `openai-codex/gpt-5.6-terra`, `medium`, extensions enabled, nonrecursive. Initial ref-qualified leaf web grants failed inside children and produced zero sources. Those reports are retained as `RESEARCH.zero-source.md`. A named-child-grant probe succeeded at [grant-recovery-research-state.json](grant-recovery-research-state.json); repaired source-bearing streams and reports are the only ones assessed.

## Source-check evidence and per-case findings

### T1 — failed matched parity

Fresh validator: [candidate-T1/support/repair-final-validation.md](candidate-T1/support/repair-final-validation.md). It independently entailed CoT, zero-shot CoT, self-consistency, ReAct and counterevidence claims, but required corrections to the self-consistency treatment, cost accounting, unsupported local thresholds/baseline wording, and a contradictory retained source note.

Both independent comparisons found material regression:
- [reviews/repaired-T1-A.md](reviews/repaired-T1-A.md): Tree-of-Thought prompt tokens are reported as 1.4k rather than the source's 14k; candidate drops legacy's measured long-context intervention, verifier-backed repair, and API-call diagnostic coverage.
- [reviews/repaired-T1-B.md](reviews/repaired-T1-B.md): also finds loss of ReAct token accounting, repair/tool-stage evidence, and a less complete evaluation artifact.

### T2 — matched at least legacy, with limitations

- [reviews/repaired-T2-A.md](reviews/repaired-T2-A.md) and [reviews/repaired-T2-B.md](reviews/repaired-T2-B.md) source-check central candidate SWE-agent, Agentless, conversational-repair, self-repair and SWE-Bench+ claims. Both select candidate overall.
- Remaining candidate gaps are direct cross-domain transfer, broader stochasticity, stateful tool-loop evidence, and some operational cost detail retained by legacy. These do not overturn its overall matched-case result but prevent a claim of strict dominance on every dimension.

### T3 — failed matched parity

- [reviews/repaired-T3-A.md](reviews/repaired-T3-A.md) finds loss of ToolBench-X recoverable-failure evidence and the cross-benchmark evaluator audit, plus an insufficient three-run resolving evaluation after the report's own pass^8 reliability evidence.
- [reviews/repaired-T3-B.md](reviews/repaired-T3-B.md) independently confirms those regressions and identifies a factual S9 evaluator-kappa error (0.036 reported versus 0.049 source), missing version-warning/recovery evidence, and inadequate repeat-run design.

## Gate limitations

1. T1 candidate report is freshly live but its validator is qualified, not accepted.
2. T2 is valid current corrected live output reuse, not a new rev04 whole-workflow rerun.
3. T3 is existing live rev04 output, not a new rerun.
4. T1 and T3 have concrete material regressions, so phase validity cannot substitute for matched quality.
5. No access/runtime blocker remains after named tool-grant recovery. The gate is unmet because of report-quality regressions, not blocked access.

## Required candidate improvements before a later gate

- T1: correct ToT token evidence, restore or equivalently retain source-backed long-context intervention, repair, and tool-stage diagnostic coverage, and fix validator-required evaluation/cost/source-note defects.
- T3: correct S9 kappa, restore materially unique recovery/evaluator/version evidence or equivalent source-backed coverage, and strengthen the resolving evaluation to a reliability-relevant repeated-run design.
- Do not modify this installed skill in this task.
