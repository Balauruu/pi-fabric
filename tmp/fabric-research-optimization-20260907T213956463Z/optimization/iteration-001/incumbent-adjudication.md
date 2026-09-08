# Incumbent-relative adjudication — iteration 001

## Verdict

**Reject relative to rev04.** The live candidate has some useful additions, including a bounded prompt-ordering discussion and a concrete paired local-evaluation artifact, but it introduces material source-integrity and retained-operating-detail regressions. Those regressions defeat a claim of meaningful useful gain **without any material regression**. This is an adjudication of the saved T1/T3 experiments, not a new trial or failure event.

## Evidence

### T1: source correctness regression

The candidate identifies arXiv:2304.03262 as Huang et al., *Large Language Models Can Self-Improve* in both its discussion and appendix ([live/T1/RESEARCH.md:42,110](live/T1/RESEARCH.md)). The primary record is instead *When do you need Chain-of-Thought Prompting for ChatGPT?* and describes whether CoT remains effective for instruction-finetuned ChatGPT ([arXiv:2304.03262](https://arxiv.org/abs/2304.03262)). This is a new unsupported source identity in the candidate, not a defect inherited from the incumbent: the incumbent T1 appendix contains neither that false attribution nor that URL ([quality-gate/20260908T/candidate-T1/RESEARCH.md:91-109](../../quality-gate/20260908T/candidate-T1/RESEARCH.md)).

The candidate also presents arXiv:2601.14152v2 as a source named only *Lost in the Prompt Order* while assigning it a specific method and figures ([live/T1/RESEARCH.md:31,111](live/T1/RESEARCH.md)). The original title is *Lost in the Prompt Order: Revealing the Limitations of Causal Attention in Language Models*, and its abstract says CQO exceeds QOC by over 14 percentage points because causal attention blocks option tokens from context ([arXiv:2601.14152](https://arxiv.org/abs/2601.14152)). This partial identity is less severe than the false 2304 identity, but confirms that the candidate's new appendix material was not source-bound enough to offset the source-correctness regression.

### T1: incumbent detail lost

The incumbent preserves the Game-of-24 ToT operating figures: 5.5k completion plus 1.4k prompt tokens and about $0.74/case, alongside best-of-100 CoT's 6.7k plus 2.2k and $0.47/case ([quality-gate/20260908T/candidate-T1/RESEARCH.md:18](../../quality-gate/20260908T/candidate-T1/RESEARCH.md)). The candidate keeps 5.5k completion tokens but says there is no verified per-case USD figure ([live/T1/RESEARCH.md:21,107](live/T1/RESEARCH.md)); its own live validator requires correction to restore the lost per-case accounting ([live/T1/validation.md:9-22](live/T1/validation.md)). The primary ToT cost section states 5.5k completion tokens and derives the $106 total as $0.74 × 100 plus $0.32 × 100 ([arXiv:2305.10601v2](https://arxiv.org/html/2305.10601v2)). This is a concrete loss of useful source-bound operating detail relevant to T1's compute/cost requirement, not a count-based comparison.

### T3 and T2 boundary

T3's candidate validator records two unresolved candidate defects: the ToolSandbox 13.9-turn/3.80-call statement needs its GPT-4o-trajectory condition, and the report lacks the required coverage/stop-reason section ([live/T3/validation.md:5-13](live/T3/validation.md)). Rev04 T3 has the latter structured coverage/stop-reason section ([experiments/run-0202-rev04-T3/RESEARCH.md:76-82](../../experiments/run-0202-rev04-T3/RESEARCH.md)). These support the rejection context, but the verdict does not depend on treating any common ToolSandbox wording as a new regression.

T2 was an unchanged-content reuse. Its incumbent report was read as specified; no fresh T2 trial is needed because the decisive T1 source-integrity and operating-detail regressions are concrete and live-tested.

## Adequacy and scope

The exact acceptance review records completed native live integrations and identifies the candidate reports and validators ([acceptance-review.md:11-19](acceptance-review.md)). The live validators directly identify the candidate defects, the same-topic rev04 reports establish the preserved baseline, and original arXiv passages were inspected for the disputed source identities and ToT cost relationship. No historical different-topic report is used as incumbent evidence.

- **incumbentRelativeRejectionVerified:** true
- **meaningfulGainWithoutRegression:** false
- **evidenceAdequate:** true
