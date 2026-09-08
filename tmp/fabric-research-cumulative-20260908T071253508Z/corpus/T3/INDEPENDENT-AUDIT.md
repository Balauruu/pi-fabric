# Independent audit: T3 frozen corpus

## Verdict: NEEDS CORRECTION

The frozen passages substantiate the main T3 measurements under their stated conditions, and the requested T1 checks are materially sound. Two decision-critical provenance/interpretation corrections are required before quality experiments: the ToolBench-X version-history treatment and AgentDojo's conflicting tool count. One evaluator-history qualification is also missing.

## Scope and method

Read `INPUT.md`, `AUDIT.md`, and the decisive saved passages/tables in all four T3 primary files, including bounded continuations. Cross-checked the decisive passages and arXiv identity/version metadata live on 2026-09-08. This audit does not alter the frozen corpus.

## Findings requiring correction

### C1. ToolBench-X version drift is known but not documented precisely

`AUDIT.md` says the legacy row "combines incompatible result snapshots and names twelve models," then retains only the v1 five-model 200-task diagnostic. That is not enough version evidence for dropping the historical twelve-model expectation.

**Exact live version evidence.** arXiv `2606.25819` reports v1 submitted 2026-06-24 and v2 submitted 2026-06-27. The frozen source is explicitly `https://arxiv.org/html/2606.25819v1`. Current v2's main-results section states: “We conduct a comprehensive evaluation on ToolBench-X by benchmarking twelve prominent large language models,” and its Table 2 lists twelve models. The same v2 retains the distinct diagnostic: “Figure 4: Overall accuracy on the 200-task subset across five models,” including the same Baseline/Hint/TTS/Oracle design. The frozen v1/live-v1 diagnostic says “Figure 4: Overall accuracy on the 200-task subset across five models.”

**Required correction.** Preserve the v1 five-model diagnostic as the frozen measurement, but add the exact v1→v2 submission dates and distinguish v2's twelve-model *main benchmark* from its five-model *200-task diagnostic*. Do not characterize “twelve models” alone as an incompatible result snapshot. If a historical row included a particular twelve-model value, identify that value/table/version or mark it unverified, rather than deleting it solely because this corpus freezes v1.

### C2. AgentDojo's tool count is internally inconsistent and the audit presents one value as unqualified

A4 says the environment has “70 tools.” In frozen/live S4 v3, §3.1 prose says: “We populate AgentDojo with total of 74 tools,” while Table 1 says: “Our suite features a total of 70 tools, 97 realistic user tasks and 27 injection targets.” The table row counts are 24 + 11 + 28 + 11 = 74, confirming that 70 is not their sum. The live source is still v3. arXiv metadata says v3 (2024-11-24) updated the Llama implementation and travel suite.

**Required correction.** Replace the unqualified “70 tools” with an explicit source conflict, for example: “S4 v3 reports 74 tools in §3.1 and by Table 1's row sum, but Table 1 and its caption say 70; this corpus does not resolve the discrepancy.” Keep 97 user tasks and 629 security cases, which are consistently reported. Do not use either tool count as a precise operational capacity fact.

### C3. Evaluator-audit historical-correction provenance is insufficiently specified

The numerical S3 audit facts are supported by frozen/live v1: “Across 496 expert-reviewed benchmark tasks, we find 92 evaluator-human disagreements,” Table 3 gives 11/112, 40/200, 12/89, and 29/95, and §4.4 says “Across 23 runs, LiveMCPBench scores range from 57.9% to 76.8% ... spread 18.9 percentage points.” S3 v1 is currently the only arXiv version.

However, `AUDIT.md` removes the legacy “kappa 0.049 versus erroneous 0.036” claim based only on absence from S3. It does not identify the historical report/source/version that supposedly contained that claim or establish a version change. Absence from the frozen source supports excluding it from a source-bound answer, but not a claim that the historical result was superseded.

**Required correction.** Retain the exclusion from T3's source-bound facts, but say: “No source/version for the legacy kappa values is identified in this corpus; S3 v1 contains no such values, and no supersession claim is established.”

## Verified T3 evidence and qualifiers

- **τ-bench S1 identity/conditions.** Live arXiv metadata identifies only v1. Frozen/live S1 defines pass^k as all k i.i.d. trials succeeding, uses deterministic Python database transitions and a `gpt-4-0613` simulated user, caps tasks at 30 agent actions, uses at least three trials for main results, agent temperature 0.0 and user temperature 1.0. It reports GPT-4o function-calling approximately 61% retail, 35% airline, and retail pass^8 below 25%. It also says reward=1 “might be a necessary but not sufficient condition,” including confirmation-policy violation. The audit correctly does not turn these into production reliability/security rates.
- **ToolBench-X S2 method/units.** Frozen/live v1 supports a constructed-recoverability condition, the 200-task stratified diagnostic subset, Hint after failure, TTS as “an additional budget of 10 interaction rounds,” and the 25.5–35.5 absolute-point Hint lift across five diagnostic models. These are percentage points of task accuracy under recoverable injected hazards, not an arbitrary-retry or real-incident claim. The audit's stated condition and qualification are accurate, subject to C1.
- **Evaluator audit S3 method.** Three independent expert annotators inspected complete traces, tool outputs, state changes, and final response, with adjudication. The audit correctly labels the results as that publication's expert-adjudicated analysis, not an independent reproduction, and correctly preserves the differing task/model distributions for Tool-Veritas.
- **AgentDojo S4 contrasts.** Table 3's GPT-4o baseline values (69.00% benign utility, 50.08% utility under attack, 47.69% targeted ASR) and Table 5's strongest-attack defense comparison are not interchangeable. The audit correctly labels its Table 5 values as “under its strongest attack selection” and distinguishes benchmark security-case fractions from production compromise probability. It also correctly preserves the tool-filter planning prerequisite and the 17% case limitation where task tools suffice for the attack.

## Requested T1 control checks

- **ToT cost accounting:** T1's ToT source says Game of 24 ToT uses 5.5k completion tokens/problem, versus 6.7k for 100 CoT trials; the main Game of 24 plus Creative Writing experiment cost is stated as $106, and the paper warns of 5–100× CoT generated-token cost. T1 preserves completion-token scope and flags cost as conditional. No defect found.
- **PaLM CoT boundary:** T1 specifies PaLM 540B, GSM8K, eight manual exemplars, greedy decoding, and retains the MAWPS SingleOp 94.1% versus 94.1% boundary. No defect found.
- **Repair feedback/control conditions:** T1's repair source explicitly warns that pass@k omits feedback-token cost and reports results only for self-contained Python tasks with executable unit tests; its conclusion reports stronger-feedback and experienced-programmer-feedback conditions, including 1.58× fully passing repairs. T1's qualification is adequate. No defect found.
- **ReAct trial count:** T1 preserves the actual CoT-SC control (21 sampled trajectories at temperature 0.7), the 7/5 ReAct fallback caps, and the paper's statement that more steps did not improve performance. No defect found.

## Non-corrections

No material defect found in the model, metric, comparator, sample, units, stated conditions, or measurement/control separation for the retained S1/S2/S3/S4 claims apart from C1–C3. The required changes are provenance and source-conflict corrections, not replacement measurements.
