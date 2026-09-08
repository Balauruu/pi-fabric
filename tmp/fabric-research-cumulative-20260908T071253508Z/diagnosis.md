# Fabric-research loss diagnosis

## Scope and confidence

This is a read-only diagnosis of the current installed skill and the 2026-09-07 optimization corpus. It traces three decisive iteration-005 losses. The installed skill is **not** historical rev04: it is a smaller `researcher → synthesizer` topology. Its runtime hands every note to synthesis after all streams terminate, but it has no required independent source/coverage acceptance or repair/recheck phase. Historical rev04 instead required research → independent verification → repair/reverify → synthesis → independent validation. Therefore a historical candidate result is evidence about failure modes, not direct evidence that any rev04 instruction should be restored.

## Loss traces

### L1 — T2: independent-restart control absent

**Final loss.** `optimization/iteration-005/acceptance-review.md` rejects replacement because the candidate’s repair/retry evaluation has no equal-budget independent-restart arm. The incumbent explicitly requires it.

**Backward trace.** The candidate `live/T2/RESEARCH.md` contains retry buckets and paired seeds but no `Self-Repair`, independent-restart, or matched-sample comparator. Searches of its `streams/measured.md`, `streams/operations.md`, and composer receipt show the same absence. In contrast, the incumbent `experiments/run-0201-rev03-T2/RESEARCH.md` preserves the Self-Repair result and makes an independent restart arm explicit in both the decision table and YAML evaluation.

**Primary passage.** The original Self-Repair paper says that GPT-4/APPS with 10 initial samples plus one repair reached 1.05× pass@20, while two initial samples plus ten repairs reached 0.97× the i.i.d. pass@22 baseline. It defines the comparator by matching the total program-sample count: <https://arxiv.org/html/2306.09896>.

**Classification.** **Retrieval/coverage omission.** The evidence was not in a candidate source note, so it cannot be attributed to source extraction, handoff, or composition. The iteration-005 topology deliberately avoided counterpart reports, and its plan-only routing did not preserve this incumbent decision boundary. This is not evidence that more general prose would fix it.

### L2 — T3: InjecAgent table/model value drift

**Final loss.** The final recheck rejects `fine-tuned GPT-4` base `ASR-valid = 3.8%` in `live/T3/RESEARCH.md` and `streams/limits.md`; it asks for 3.9% with the setting retained.

**Backward trace.** `streams/limits.md` already states 3.8%/7.1%, so the composer preserved rather than introduced the error. The final report has the same value. The historical final validator found it but the run ended rejected without applying its bounded correction request.

**Primary passage.** InjecAgent Table 3 labels fine-tuned GPT-4 as base 3.9 and enhanced 7.1 `ASR-valid`; 3.8 is the fine-tuned GPT-3.5 enhanced total. The surrounding paper prose also says 3.8 for fine-tuned GPT-4, so the source itself is internally inconsistent. The table is the more specific evidence for this field, but a robust process should flag rather than silently choose between conflicting primary passages: <https://arxiv.org/html/2403.02691v2>.

**Classification.** **Extraction distortion, then uncorrected validation defect.** It is not handoff loss or composition omission because the erroneous field is already in the note and is retained verbatim in the report. The validation defect is failure to close a detected, actionable correction, not failure to detect it.

### L3 — T3: WebArena unmatched human comparator

**Final loss.** The candidate contrasts the 14.41% agent result with 78.24% human performance as though both cover the 812-task evaluation. The final recheck identifies the missing human-sample boundary.

**Backward trace.** `live/T3/streams/measured.md` already makes the unmatched contrast, and `live/T3/RESEARCH.md` retains it. Thus composition did not drop a supplied qualifier. The source note did not extract the human sampling frame, and the final validator detected but did not get a correction cycle.

**Primary passage.** WebArena reports 812 benchmark examples and the 14.41% best GPT-4-agent score. Its Human Performance section says it sampled one task from each of 170 templates and used five computer-science graduate students for the 78.24% result: <https://arxiv.org/html/2307.13854>.

**Classification.** **Extraction/context distortion, then uncorrected validation defect.** No evidence supports handoff loss or composition omission for this loss. The value itself is retained; the comparison denominator is missing before composition.

## Stage findings

- **F1 Retrieval omission is evidenced once:** L1 was absent from all candidate notes and report.
- **F2 Extraction distortion is evidenced twice:** L2 conflated a table cell with a neighboring model/setting and ignored primary-source conflict. L3 omitted the human sampling frame needed to interpret a comparison.
- **F3 Handoff loss is not evidenced in these traces:** L2 and L3 appear in source notes and final reports. L1 never enters the notes.
- **F4 Composition omission is not evidenced in these traces:** the composer preserved the available defective claims. It may still occur elsewhere, but this corpus sample does not establish it.
- **F5 Validation detection existed historically but closure failed:** the final validator precisely names L2/L3 and corrections, yet the candidate remains rejected. The current simple installed topology has no mandatory independent acceptance/recheck at all, so it currently lacks even that detection boundary.

## Three distinct small mechanisms

### M1 — Coverage-difference gate (retrieval)

**Mechanism.** Before dispatch, represent required decision boundaries as compact semantic keys. For a revision/comparison workflow, compute the set difference between the prior accepted boundary set and proposed stream ownership. Every removed boundary must be marked intentionally out-of-scope with a reason, or assigned to a source stream. This is workflow data validation, not a researcher prompt expansion.

**Predicted benefit.** Catches L1 before retrieval and makes intentional scope reduction explicit. It targets coverage loss without forcing a source quota.

**Regression.** Can preserve stale or irrelevant incumbent material and slow genuinely narrower work.

**Minimal fixed-corpus test.** Feed the incumbent T2 boundary list and iteration-005 T2 assignment index. Expect a failed gate for `repair-vs-independent-restart` unless an explicit exclusion is present. A live probe: run one fixed T2 question with and without the gate and score presence of a source-bound restart comparator, not report length.

### M2 — Typed quantitative claim cards with source-conflict status (extraction)

**Mechanism.** For each numeric comparison, store a small structured card beside the note: source locator, table/figure/section, subject/model, setting, metric, denominator, comparator, value, and `conflict: none|primary-conflict|unresolved`. A report may render only cards with all required fields. A table/prose disagreement forces `primary-conflict` and qualified wording rather than selecting a value.

**Predicted benefit.** Prevents L2’s cross-row value drift and L3’s omitted comparator population. It also makes field-level validation mechanical.

**Regression.** More extraction overhead and false blocking for qualitative claims or sources with poor rendering.

**Minimal fixed-corpus test.** Use the InjecAgent Table 3 plus prose and the WebArena agent/human passages. Expect one `primary-conflict` card for InjecAgent and one rejected/incomplete comparison card until `170 templates` and `five students` are supplied. A live probe: sample ten numerical claims and measure field-complete, source-entailing cards versus current notes.

### M3 — Validator-to-publication closure transaction (validation)

**Mechanism.** Treat final validation as a state transition: `accepted`, `correction-pending`, or `rejected`. A report cannot be called complete or promoted while `correction-pending`. For bounded corrections, composer replacement and an independent recheck are mandatory. If allowance is exhausted, return the report as partial with the defects, rather than a validated completion. This changes orchestration state, not wording.

**Predicted benefit.** Converts detected L2/L3 defects into either repaired reports or explicit partial outcomes. It does not promise better retrieval.

**Regression.** Extra latency/cost and possible deadlock on subjective validator disagreement.

**Minimal fixed-corpus test.** Replay iteration-005’s final-validation JSON with its three correction requests. Assert that promotion is impossible before a replacement report and distinct-validator recheck. A live probe: inject one known wrong table cell into a short research report and require the terminal status to be partial/rejected until repaired.

## Bounded recommendation

Do not reintroduce historical rev04 wholesale or add more researcher instructions. If one mechanism is trialed first, use **M3** because the historical corpus already demonstrated detection but failed closure, and the current installed topology has no independent final-acceptance boundary. Test it on a fixed corpus before a live comparison. M1 and M2 target different upstream failure modes and should be evaluated independently, not bundled.
