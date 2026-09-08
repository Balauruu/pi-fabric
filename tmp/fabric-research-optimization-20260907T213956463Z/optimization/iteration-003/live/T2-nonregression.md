## Depth-2 nonregression review: T2

**Verdict: pass with one material correction.** The candidate is at least nonregressive against legacy on the T2 contract and materially improves traceability and adoption controls.

| Question | Result | Evaluation |
|---|---|---|
| Q1. Original inspected sources | Pass | Candidate retains direct original URLs, including primary papers and SWE-bench documentation. |
| Q2. Source-bound quantitative contrasts | Qualified pass | Contrasts preserve source, model, task, comparator, outcome, cost, and caveats. **Correction:** Agentless’s “embeddings 67.7%” must specify this is *unfiltered* embedding retrieval. Filtered embedding retrieval is 70.33%. |
| Q3. R1 primary evaluations | Pass | Covers context, feedback, validation/repair, retries, and decomposition with fixed-model evidence and explicit comparability limits. |
| Q4. R2 counterevidence and evaluator limits | Pass | Stronger than legacy on information-policy leakage, selected-patch versus any-candidate distinction, unequal-budget cautions, contamination, and evaluator caching. |
| Q5. R3 actionable experiment and adoption rules | Pass | The paired artifact fixes model, reasoning effort, prompt/tool schemas, budget dimensions, information policy, evaluator revision, selection policy, and holdout replication. The decision table gives bounded adoption and rollback conditions. |
| Q6. Complete retained-source appendix | Pass | Every retained source has a direct URL, type/date, inspected method, supported claim, and limitation. This is stronger and more auditable than the legacy bibliography-only appendix. |

### Representative source checks

- [SWE-agent](https://arxiv.org/html/2405.15793): confirms 100-line viewer 18.0% versus full-file 12.7%, summarized search 18.0% versus iterative 12.0%, and last-five-observation 18.0% versus full history 15.0%.
- [Agentless](https://arxiv.org/html/2407.01489v2): confirms repair allocation 88/300 at $0.22 versus 96/300 at $0.29, and distinguishes unfiltered embedding retrieval 67.67% from filtered retrieval 70.33%.
- [Conversational test-suite repair](https://arxiv.org/html/2410.04485v1): confirms 30-call designs and hidden-test results of 47% versus 34% for Llama 3.1 70B, and 46% versus 47% for GPT-4o-mini.
- [Self-Repair](https://arxiv.org/html/2306.09896): confirms 1.05× pass@20 for diverse initial sampling plus one repair and 0.97× pass@22 for repair-heavy allocation.
- [SWE-bench repository](https://github.com/SWE-bench/SWE-bench): confirms cache identity is `run_id` plus `instance_id`; a changed patch under the same pair is not re-evaluated.

## Source-bound anchor mechanism

**No contract regression.** The mechanism improves the internal acceptance contract: it requires each retained decision-changing finding to retain its locator, result/unit, conditions, comparator, caveat, and required-question contribution. It explicitly remains an acceptance constraint rather than a second evidence store or quota, preserves original notes, and requires rendered or explicitly excluded material anchors.

**Risk:** the Agentless localization wording demonstrates why this mechanism must enforce the “applicable method/condition” field. “67.7% embeddings” is source-supported only for the *unfiltered* condition. The report should say that, or use 70.33% for filtered embeddings.

## Limits

This is a document and representative-source review, **not a fresh workflow replay**. I did not execute the candidate workflow, inspect its worker streams/control state, or observe whether anchors were actually emitted, reconciled, and independently validated in a live run.