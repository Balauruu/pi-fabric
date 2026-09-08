# Evaluation protocol

## Conditions
- B: snapshot baseline adapted only for mandated Terra-medium execution and evaluation output root.
- C1: revision 01 with identical adaptation.
- L: legacy, if executable through Fabric transport, adapted only for Terra-medium and evaluation output root.

## Fixed conditions
Every run and downstream agent must use `openai-codex/gpt-5.6-terra` at `medium`; same task, tool scope, access, and output root per matched pair. Output-root and legacy transport changes are disclosed as non-comparability limits.

## Quality rubric, independently specified
Q1 question-level answer correctness and coverage, including self-contained requirement meanings; Q2 factual/source entailment at decisive claims; Q3 retained quantitative values, methods, applicability and limitations; Q4 counterevidence and uncertainty; Q5 actionable operating implications/failure signals; Q6 coherent decision structure and source appendix. Reviewers inspect artifacts and decisive sources. Counts are navigation only, never scores.

## Representative topics
T1 Prompt techniques: conditions, measured effects, costs and failures.
T2 Agent run-design changes at fixed model/effort: correctness, reliability and accepted-task efficiency.
T3 Evaluation/reliability/security for tool-using agents.

Each condition starts T1. T2/T3 and repetitions follow only after observing genuine outputs.
