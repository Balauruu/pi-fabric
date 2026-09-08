# Iteration 001 verdict

## Hypothesis

The candidate adds a compact evidence-retention acceptance gate. The verifier maps required decision dimensions and material source-unique contributions to report locations. The synthesizer must retain or qualify them, and the independent validator checks every material numeric claim against source conditions.

## Production delta

Only two of the cloned six files differ from rev-04:

- candidate/SKILL.md
- candidate/references/synthesis-and-reporting.md

The other four production files are byte-identical to rev-04. Stream persistence, partial-result handling, continuation-safe read-back, and no-write routing were therefore unchanged. Reuse basis: rev-04 checks/pure-contract-results.json and readback probes, plus iteration checks confirming no changes to researcher/runtime/stream contracts.

## Native configuration and execution

All 16 leaf roles were native Pi, openai-codex/gpt-5.6-terra, medium, extensions true, recursive false. Exact IDs, status, usage, and elapsed time are in execution.json. Four fresh research leaves, two verifiers, two synthesizers, two validators, a T2 changed-path nonregression validator, and four independent blind reviewers completed. End-to-end controller elapsed: 956195 ms. Timing is one candidate execution only and is not a speed comparison.

## Results

- T1 validator required a correction: ToT was reported as $106 total instead of the source-bound Game-of-24 per-case 5.5k completion + 1.4k prompt tokens and about $0.74/case. Both blind comparisons also found material losses of legacy verifier-backed repair, API tool-stage, ReAct token/brittleness, and long-context evidence.
- T3 validator required ToolSandbox conditioning and a coverage/stop-reason section. Blind reviews found material or tradeoff-level losses of WebArena, ToolBench-X recovery, evaluator-audit, InjecAgent, and approval-boundary evidence. One review also identified a ToolEmu recall comparison error.
- T2 changed-path nonregression rejected unchanged reuse: it omits multiple legacy source-unique contributions and quantitative cost evidence under the new gate.
- The no-write direct probe completed with paths null, left the T1 artifact set unchanged, and correctly failed reportValidation on the ToT retention/numeric defect.

## Verdict

Tested but not retained. The mechanism correctly exposes some numeric/retention defects, but this live integration did not reach matched quality because research/synthesis still omitted material source-unique evidence. Failed reports are preserved and were not edited after review.

## Non-quality tool failures

The initial root CONTINUATION.md lookup was absent and was recovered at the evaluation root. Fovea impact was unavailable through discovered extensions. A preliminary static script had an assertion failure; the replacement shell check passed. None is quality evidence.
