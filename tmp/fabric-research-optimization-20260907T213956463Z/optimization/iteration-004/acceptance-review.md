# Acceptance review — iteration 004

## Decision

| Field | Value |
|---|---|
| evidenceAdequate | **true** |
| meaningfulImprovement | **false** |
| materialRegression | **true** |
| matchedParity | **false** |
| Acceptance | **Reject. Do not promote over incumbent rev04.** |

No speed conclusion is made.

## Exact same-topic mappings inspected

| Topic | Question | live candidate | actual incumbent rev04 | legacy |
|---|---|---|---|---|
| T1 | `quality-gate/20260908T/questions/T1.md` | `optimization/iteration-004/live/T1/RESEARCH.md` | `quality-gate/20260908T/candidate-T1/RESEARCH.md` | `experiments/run-0104/RESEARCH.md` |
| T2 | `quality-gate/20260908T/questions/T2.md` | `optimization/iteration-004/live/T2/RESEARCH.md` | `experiments/run-0201-rev03-T2/RESEARCH.md` (documented unchanged content path) | `quality-gate/20260908T/legacy-T2/RESEARCH.md` |
| T3 | `quality-gate/20260908T/questions/T3.md` | `optimization/iteration-004/live/T3/RESEARCH.md` | `experiments/run-0202-rev04-T3/RESEARCH.md` | `quality-gate/20260908T/legacy-T3/RESEARCH.md` |

These are the literal requested prompts, so no historical report was substituted for the current candidate.

## Evidence adequacy and integrity

- `evidence/native-observed-status.json` records completed T1/T2/T3 research and verifier leaves at `openai-codex/gpt-5.6-terra`, `medium`. The final controller event failure does not invalidate these saved completed artifacts.
- Independent live validation passed after T1 repair: T1 retains 15 verified source units across nine original sources (`live/T1/support/validation-post-repair.md`); T2 reports source-bound task/model/comparator/method/outcome checks with no material mismatch (`live/T2/support/validation-1.md`); T3 verifies all nine retained units and prevents benchmark-to-production overclaiming (`live/T3/support/validation-1.md`).
- `evidence/mechanical-checks.json` records passing static contracts, no-write leaf behavior, and an exact 466,945-character continuation round-trip. This supports execution integrity, not quality superiority.
- Decisive numbers were independently source-checked in the saved blind/validation evidence: T1 ToT 74% versus 4% with its token/cost conditions, T2 SWE-agent/Agentless and validation-evidence values, and T3 AgentDojo, ToolBench-X, evaluator-audit, and τ-bench claims. No source-free or merely inconclusive count was used.

## Independent comparison

### T1 prompt techniques

The live candidate is broader than the incumbent/legacy on ToT, many-shot selection, ToolRet, Toolformer, FeedbackEval, and same-model verification. Its ToT 74% versus 4% Game-of-24 result is source-bound and its 70K/95K long-context condition is source-checked. This is a real gain, not assumed.

It nevertheless explicitly lacks incumbent-retained few-shot CoT task/scale boundaries, ReAct prompt-causal brittleness and approximately 14M-input/150K-output accounting, and Reflexion's verifier-conditioned 60% baseline/68% reflection/52% feedback-free contrast. The incumbent has those source-bound constraints and a materially stronger reproducible paired-evaluation artifact: frozen hashes, clean state, randomized order, stochastic repetitions, protected strata, CI/exact testing, rollback, and trace retention. Independent post-repair reviews disagree on which report is the better base, but agree it is a tradeoff rather than an unqualified replacement. Q1 breadth improves, while Q3/Q4/Q5 lose decision-critical condition and operational detail. T1 is not parity.

### T2 fixed-model coding-agent design

The live candidate adds checked test-evidence-quality and steering material, but it labels the latter outside the fixed-model-stack premise. It explicitly lacks stateful RepairAgent search/cost evidence, the repair-versus-independent-restart counterexample, Reflexion's negative feedback/retry evidence, multimodal transfer, and SWE-Bench Pro evaluator/coverage limits. The actual incumbent contains these decision boundaries, including Self-Repair's 1.05x pass@20 versus 0.97x pass@22 contrast, fixed-model SWE-agent/Agentless conditions, and evaluator/reproducibility controls. The legacy likewise retains RepairAgent, Reflexion, multimodal, and Pro coverage. Thus the live candidate has a genuine material R1/R2 retained-detail and counterevidence regression relative to incumbent, even though its retained claims are correct. Q5 and Q6 are usable but do not cure the omitted source set.

### T3 tool-agent reliability/security

The live candidate correctly adds/clarifies ToolBench-X recovery, newer evaluator-audit variance, and τ-bench version warnings. Its nine retained claims are source-checked and it has a coherent decision table and resolving evaluation. But it expressly marks absent ToolBench API-scale/ToolEval human-agreement evidence, NIST AI 600-1's indirect-injection/lifecycle control statements, and ToolBench-X extra-round detail. The actual incumbent retains ToolBench/ToolEval scale and 87.1%/80.3% sampled agreement, NIST risk-specific TEVV and deployment-like testing, and a more concrete release-control matrix. The legacy retains the same relevant areas. These are material Q1/Q2/Q3/Q5 losses, not a word-count judgment. T3 is a tradeoff, not parity.

## Six-question synthesis

| Question | Result |
|---|---|
| Q1 coverage | T1 broadens; T2 and T3 omit incumbent/legacy-relevant measured areas. |
| Q2 source correctness/citations | Candidate retained claims are well-cited and checked. |
| Q3 retained detail/method/conditions | Material T1/T2/T3 incumbent detail is absent as described above. |
| Q4 counterevidence | T1 adds useful limits, but T1 causal/feedback limits and T2 transfer/retry/evaluator limits are lost. |
| Q5 operational artifacts | All reports have usable artifacts, but T1 incumbent reproducibility controls and T3 release matrix are stronger. |
| Q6 single-report structure | All live reports are coherent standalone reports with appendices, although T2/T3 appendices are incomplete against available retained material. |

The candidate therefore has meaningful local gains but not a meaningful improvement **over incumbent without material regression**. The material T2 and T3 losses are sufficient for rejection. Legacy non-parity alone is not the basis for this decision, though all three legacy comparisons also fail the separate all-topics parity gate.

## Prior-review caution

Iterations 001–003 each recorded non-improvement, but their reviews were chiefly relative to a best/legacy threshold and included incomplete or non-fresh T2 evidence. They are not independent incumbent-relative findings for iteration 004 and must not be inflated into five failures. Main controller policy, not this review, owns any tested-revision streak count.
