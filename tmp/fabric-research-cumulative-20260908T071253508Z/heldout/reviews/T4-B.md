# T4 independent complete-workflow review

## Artifact mapping

- **X, installed incumbent00:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T4-X/RESEARCH.md`
- **Y, candidateH2c:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T4-Y/RESEARCH.md`
- **Task:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/T4.md`
- **Close historical reference, not exact-topic parity target:** `/home/balauru/.pi-profiles/fabric/runs/research-architecture-decision-tools-1788797692774/REPORT.md`

## Verdict

**Incumbent-relative: NO.** Y adds a clearer paired local-evaluation design and more explicit selected-stack boundaries, but it drops material, decision-relevant effectiveness limitation retained by X. Thus it does **not** improve X without material regression.

**Legacy-quality: NO, but comparison is only close-task.** The historical report answers a broader architecture-decision-tools/package-survey prompt. It is not an exact same-prompt target, so this is not an exact parity claim. Y does not reach its relevant depth in decision-record specification, independently useful candidate analysis, or retained evidence detail.

No speed conclusion is made. No relevant repeated quality evidence was supplied or verified.

## Decisive evidence

### Primary-source checks

The retrieved Playbook says: “**Never write implementation code before the Gate 4 slice plan is approved**,” keeps state under `docs/plans/<feature-slug>/`, and requires re-approval after backtracking. Both reports correctly preserve these core boundaries.

The retrieved Wayfinder source says: “**each ticket resolves a decision, and the map is done when the way is clear**”; “**Where the map, its child tickets, blocking, and frontier queries physically live is tracker-specific**”; and charting research tickets instructs subagents to capture findings “**on a throwaway `research/<name>` branch**.” Both reports accurately distinguish planning from delivery and tracker dependence. Neither fully carries the last branch-mutation boundary into its permission model.

The retrieved Fovea README says its route-shape tests were on “**eight cloned projects**,” with junk below (\hat p\approx0.27), real shapes above (\hat p\approx0.75), and promotion at (\hat p\ge0.55), (n\ge4) sites, (\ge2) files. That supports the shared narrow extractor claim only, not an architecture-decision outcome claim.

### Material regression in Y

X’s quantitative-evidence table retains a separate `bench.ts` entry: “**bounded `fovea_focus` versus alphabetically ordered outline**,” at **500/1,000/2,000/4,000 tokens**, with recall against Fovea’s own **16,000-token** focus output, then states: “**No benchmark output was inspected. Self-oracle, weak comparator... cannot establish better architecture decisions.**”

Y instead says the eight-project observation has “**no architectural-decision accuracy, task completion, precision/recall across graph edges, cost, latency, uncertainty, or user outcome**.” This is useful, but it omits the specific available benchmark design and its self-oracle/weak-comparator defect. That defect is material counterevidence for the requested exact effectiveness-evidence limitations, not redundant detail. The loss is in Y’s synthesis, not shown to be caused by absent retrieval: Y’s own retained appendix names the Fovea README but not `scripts/bench.ts`, while X’s appendix retains that benchmark source.

### Promising Y gain

Y’s two-arm table improves evaluation actionability. It fixes snapshots, model, permissions, reviewers and budgets, separates clear versus foggy cases, and uses explicit retain rules. Its warning that unequal tokens, wall time, tool calls, researcher attention, or human latency must be reported rather than called matched is stronger than X’s single broader proposal. This is a promising gain, but it does not repair the lost benchmark limitation.

### Other material common omission

Y says Wayfinder requires tracker operations and its workflow says use the appropriate authority, but it does not state that the primary charting procedure directs AFK research subagents to make throwaway branches. X likewise says only that research is AFK. For the task’s workflow/state/permission boundary, a complete recommendation must require explicit repository branch/write authority for that default Wayfinder research path, or replace it with a no-write capture path. This is a shared defect, not evidence of a Y-only regression.

## Legacy comparison

The historical report includes a concrete minimum architecture-decision record with owner, measurable drivers, constraints, evidence, alternatives including status quo, trade-offs, pre-mortem, reversibility, rollback/abort, validation, and flip condition. It also assesses a broader package and external-skill set with source-specific maintenance and privilege boundaries. Y has good narrative equivalents, for example “**Record which evidence is decisive, rejected alternatives, assumptions, and an explicit invalidation trigger**,” but lacks that enforceable complete record and the comparable candidate/evidence depth.

Do not adopt every historical assertion as correct merely because it is historical. In particular, its package/version claims remain snapshot claims that would need current primary-source and artifact checks before any installation. The historical scope is broader than T4, so this finding is about relevant quality/depth, not an obligation to reproduce its package list.

## Required repair and smallest recheck

1. **Y effectiveness repair:** add a `pi-fovea/scripts/bench.ts` retained-source row and a quantitative row with the exact comparator, **500/1,000/2,000/4,000** budgets, **16,000-token self-oracle**, and the fact that no output was inspected. Explicitly retain the self-oracle and weak-comparator limitation. Recheck against the primary script, not the README summary.
2. **Y Wayfinder-permission repair:** in the permission boundary and operating workflow, state that the documented charting path creates `research/<name>` branches for research subagents. Require explicit repo-write/branch authority, or specify a no-write alternative before using that path. Recheck against the primary Wayfinder “Chart the map” step 5.
3. **Legacy-depth repair, only if parity is desired:** add a compact decision-record template or mandatory fields equivalent to owner, drivers, constraints, options/status quo, evidence/unknowns, trade-offs, reversibility/rollback, validation, and flip condition. Then recheck that it remains proportionate to T4 rather than importing historical package-survey scope.

Until 1 and 2 are actually repaired and primary-source rechecked, the incumbent-relative result remains **NO**.


## Post-verdict static-check update

After the verdict, `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2c/STATIC-CHECKS.json` changed and reports `expectedTwoFiles: true`, `frontmatterPreserved: true`, `explicitModel: true`, `explicitMedium: true`, `explicitNamedGrants: true`, `leafOnly: true`, `singleReport: true`, and `noRejectedH1Stages: true`, but `whitespaceOk: false` with `whitespaceOutput: "(no output)"`. This is a candidate artifact/configuration static check, not report/source evidence and does not alter either quality judgment. It is also not repaired: rerun/fix the whitespace validator so a passing result is recorded before treating this check as validation evidence.
