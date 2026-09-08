# T2 independent complete-workflow review

## Artifact mapping

- **X, installed incumbent00:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T2-X/RESEARCH.md`
- **Y, candidateH2c:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T2-Y/RESEARCH.md`
- **Original task:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/T2.md`
- **Relevant exact-topic historical target:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/legacy-T2/RESEARCH.md`

## Verdict

**Conclusive.**

1. **Y does not improve X without material regression.** Y is more coherent around its older, directly actionable fixed-model studies and has a materially stronger evaluator-validity/variance section. It regresses by dropping X's closest direct modern context-delivery null and its bounded conclusion. That omission matters because context selection is a named primary lever and Y's affirmative SWE-agent context ablations are otherwise the only direct context basis for its “evaluate bounded context first” prioritization.
2. **Y reaches the relevant legacy-quality target in substance, but is not cleanly accepted until C1 is repaired and rechecked.** It covers the target's central SWE-agent, Agentless, AutoCodeRover, RepairAgent, leakage/evaluator, retry, and paired-evaluation material with better decision boundaries and a stronger audit/variance treatment. This is an exact-topic comparison. No prompt mismatch applies.

## Decisive evidence

### Y gains that are real

- Y gives a compact, source-bound Agentless selector table: majority vote **77/300 (25.67%), $0.00**; regression **81/300 (27.00%), $0.01**; generated reproduction test **96/300 (32.00%), $0.25**. The original Table 4 states the same values and says the final test adds cost because tests must be generated. Y correctly preserves the 40-patch pipeline and its non-interactive scope.
- Y correctly states the Audit study's boundary: **7.8%** of plausible patches fail additional developer tests, a **4.5 pp** mean resolved-rate reduction, while **260/877 (29.6%)** PatchDiff divergences are suspicious rather than synonymous with incorrect. The primary Table 1 reports CodeStory **62.2%→57.0%**, LearnByInteract **60.2%→55.6%**, and OpenHands **53.0%→49.2%**. Primary Table 3 reports **260/877**, **$0.105/patch**, and **$91.716** at two repair iterations.
- Y adds decision-useful repeatability evidence absent from the legacy target: the original *On Randomness in Agentic Evals* reports **60,000** trajectories, **2.2–6.0 pp** single-run ranges, standard deviations above **1.5 pp** even at temperature 0, and approximately **36 runs per agent** for a 1 pp effect at median variance. Its protocol appropriately says to size replication from a local pilot rather than import 36 as a rule.
- Y's experiment artifact freezes model, reasoning effort, prompt/tool/environment/evaluator versions, pairs runs, separates tuning from holdout, records resource/evaluator outcomes, and treats pass@k as a retry-policy result. That meets the original task's operational and concrete-artifact requirements better than a prose-only recommendation.

### Material regression versus X

X reports the closest direct modern test of context-file delivery:

> “17 PR-derived Python tasks from three repositories with hidden PR gold tests… no statistically significant overall difference… Claude pairwise gaps were at most 2.3 pp, Codex’s maximum was 5.9 pp, with omnibus p=1.00 and p=0.66.”

It also preserves the directly decision-relevant adverse subset:

> “In the dynamic-range subset, no-context resolved 58% versus 42% for both always-on and selective context.”

and limits the apparent efficiency result to an exploratory repository-specific mechanism:

> “blind full-suite pytest invocations fell 3.67 → 2.44 → 1.67 and wall time 2689 s → 2066 s → 2032 s… The n=4 sign test was p=0.25.”

Y contains no equivalent modern direct null or the countervailing dynamic-range result. Its retained R1 record instead says from SWE-agent that “A bounded viewer beat both smaller and full-file alternatives here,” which is useful but is a different interface/budgeted harness. It cannot replace the omitted test of static context delivery. This omission originates in Y's R1 source note, not merely final compression: `T2-Y/streams/s1.md` retains SWE-agent, Agentless, AutoCodeRover, and RepairAgent but not the Khatri context-file evaluation. Therefore it is a material evidence-coverage regression, not a synthesis-only repair.

X also supplies current, explicitly non-fixed-effort counterevidence for retry/replay/monitor policies and classifies it as budget allocation. Y's AutoCodeRover @1/@3 contrast remains useful, but does not replace those modern decision boundaries.

## Validator correction requiring repair and recheck

### C1 — wrong SWE-agent cost denominator and unit

**Where:** Y R1 says:

> “The full ACI's reported average cost was **$1.67 per resolved Lite instance**.”

The same erroneous wording appears in Y's source note `T2-Y/streams/s1.md`:

> “Full ACI average reported cost on Lite: **$1.67 per resolved instance**.”

**Primary passage checked:** SWE-agent Table 2 labels the column **“$ Avg. Cost”** and reports, on SWE-bench Lite, shell-only GPT-4 Turbo **11.00, 1.46** and SWE-agent GPT-4 Turbo **18.00, 1.67**. The table and the retrieved original passage do not define $1.67 as cost only over resolved instances. The paper separately reports distributions for “Resolved” and “Any” trajectories, confirming that outcome-conditioned statistics are a distinct analysis.

**Required repair:** replace both claims with “reported average cost: **$1.67 per Lite instance/run under the paper's $4 per-instance cap**,” or quote the paper's exact denominator after re-inspecting its methodology. Do not retain “per resolved instance” without an original passage that explicitly supports it. Recheck the corrected report and note against Table 2 before treating this as fixed.

This is a numerical-condition error, not repaired by identifying it. It does not reverse Y's adoption boundary, but it invalidates its current cost-comparability warning as written.

## Incumbent-relative judgment

Y is preferable to X for its clear Agentless validation selection contrast, explicit Audit caveats, quantified variance evidence, and concise paired protocol. Those are promising gains. But the original task asks for counterevidence and decision-grade context-selection guidance. Omitting X's closest direct context-file null removes material evidence that should temper Y's SWE-agent-derived bounded-context priority. The smallest needed check is C1 plus restoration of the Khatri study's exact task/model/repeats/comparator/null/efficiency qualifications, followed by a synthesis recheck that the executive decision does not imply a general bounded-context gain.

## Legacy judgment

The historical report is exact-topic and materially comparable. It contains the same legacy core: SWE-agent's **18.0/12.0/15.7** search, **14.3/18.0/12.7** viewer, **18.0/15.0** context-history and linting contrast; Agentless's fixed GPT-4o validation selection; AutoCodeRover retry costs; RepairAgent's realistic-localization warning; benchmark limits; and a paired artifact.

Y meets that quality bar in substance and improves it by making the evaluator audit's uncertainty explicit, adding repeated-run numerical evidence, avoiding universal thresholds, and using a more usable decision table. C1 remains an actual outstanding correction. X is broader and stronger than both on current direct context and recent scaling/replay/benchmark counterevidence, but source quantity alone did not decide this judgment.

## Retrieval record

Primary originals retrieved and inspected without authenticated browser or answer-mode abstraction:

- SWE-agent: https://arxiv.org/html/2405.15793
- Agentless: https://arxiv.org/html/2407.01489
- Are “Solved Issues” in SWE-bench Really Solved Correctly?: https://arxiv.org/html/2503.15223v2
- On Randomness in Agentic Evals: https://arxiv.org/html/2602.07150

No reviewer outputs or candidate instructions were consulted.
