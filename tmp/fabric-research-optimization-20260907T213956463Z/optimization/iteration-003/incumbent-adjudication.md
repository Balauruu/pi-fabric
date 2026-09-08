# Incumbent-relative adjudication — iteration 003

## Verdict

**Reject.** `incumbentRelativeRejectionVerified: true`; `meaningfulGainWithoutRegression: false`; `evidenceAdequate: true`.

This adjudicates the saved live T1 and T3 candidate reports against the named same-topic rev04 incumbent reports, not against legacy reports. T2 is unchanged-content reuse and supplies no fresh candidate trial; it neither adds a failure nor defeats the concrete T1/T3 evidence below.

## Evidence inspected

- Iteration acceptance review, exact T1/T2/T3 questions, candidate `live/T1` and `live/T3` reports, and their validation, final-validation, and verification records.
- Same-topic incumbent: `quality-gate/20260908T/candidate-T1/RESEARCH.md`, `experiments/run-0201-rev03-T2/RESEARCH.md`, and `experiments/run-0202-rev04-T3/RESEARCH.md`.
- Direct primary passages: Reflexion, WebArena, AgentDojo Table 5, and *Firewalls or Stronger Benchmarks?* v2.

## Same-topic comparison

### T1: new material source-correctness regression

The candidate adds a Reflexion comparator that the incumbent does not make: “91.0% Pass@1 versus single-generation 80.1%.” Its own final validation identifies the discrepancy, while the direct original page supports 91% versus 80% in the abstract and elsewhere states a HumanEval-Python 82% baseline. It contains no 80.1% value. The candidate also gives MBPP and LeetCode figures without reconciling the exact table/version, subset, and language conditions. This is a new unsupported quantitative assertion, not a defect shared with the incumbent.

The candidate’s report-level evidence status is also materially worse: it labels every quantitative anchor “unverified” and says none may support an adoption decision, even though it renders many source claims. Its validation accordingly rejects R1/R2 and the source appendix. In contrast, the incumbent T1 retains direct primary URLs, conditions, comparators, units, limitations, and a usable paired-evaluation artifact. That is loss of decision-grade source traceability and usable coverage, not a word-count judgment.

The candidate has useful additions, including an equal-completion-token self-repair counterexample and a paired evaluation outline. They do not cure the new unsupported Reflexion comparison or restore accepted source-bound status.

### T3: useful incumbent coverage and operating detail lost

The candidate correctly adds useful, source-supported ToolBench-X recovery/scorer evidence and corrects its final report’s ASB condition to 70% to 9.25% when the agent freely selects from the full set, including attack tools. Direct primary text confirms that correction. These are genuine gains.

They coexist with material losses from the actual rev04 T3 incumbent:

- The incumbent preserves WebArena’s 812-task, 14.41%-versus-78.24% human comparison and concrete harness signals: stop after more than three repeated actions on the same observation or three consecutive invalid actions. The candidate has neither the source unit nor these deployment-relevant failure controls. Direct WebArena text confirms each omitted detail.
- The incumbent preserves a source-bound AgentDojo detector trade-off, the tool-filter 17% attack-sufficient-tool limitation, and distinguishes paper-table from live-result configurations. The candidate keeps only no-defense/tool-filter values and loses the detector utility trade-off, the 17% limitation, and configuration crosswalk. Direct AgentDojo Table 5 supports the omitted detector values (7.95% ASR, 21.14% utility under attack) and the 17% limitation.
- The incumbent additionally preserves ToolBench/ToolEval, AgentBench, AgentHarm, NIST, and OWASP evidence plus controls for version manifests, authority boundaries, retry reconciliation, ingress-to-sink testing, and explicit block/rollback signals. The candidate’s shorter deployment table cannot substitute for these distinct reliability, evaluator, attack-budget, standards, and consequential-action controls.

These are concrete losses of source-backed coverage, counterevidence, and operational artifacts in the same T3 question. They are not historical different-topic substitutions. Candidate final validation acceptance establishes that its retained claims were repaired, not that the incumbent material was retained.

## Decision basis

The candidate has meaningful additions, but rejection is warranted because they arrive with (1) a new unsupported T1 source-bound quantitative comparator and (2) demonstrated loss of material incumbent T3 coverage and operating detail. No speed claim is used. No new trial or failure event is asserted. A missing fresh T2 replay does not negate these direct, decisive T1/T3 incumbent-relative regressions.

## Exact primary passages checked

- Reflexion, https://arxiv.org/html/2303.11366: 91% HumanEval result is paired with 80% in the abstract and 82% HumanEval-Python baseline elsewhere, not 80.1%.
- WebArena, https://arxiv.org/html/2307.13854: 812 tasks, 14.41% GPT-4, 78.24% human, and the repeated-action/invalid-action stop rules.
- AgentDojo, https://arxiv.org/html/2406.13352v3#A3.T5: no-defense 57.69% ASR/50.01% utility, detector 7.95%/21.14%, tool filter 6.84%/56.28%, and the 17% attack-sufficient-tool limitation.
- Firewalls or Stronger Benchmarks? v2, https://arxiv.org/html/2510.05244v2#S7: forced inclusion versus free full-tool selection, attack tools retained, 70% to 9.25%.
