# Synthesis and reporting

Use for complex or disputed synthesis, quantitative rankings, causal or transfer claims, and consequential recommendations, whether Main researched directly or delegated. Apply only relevant sections. The parent SKILL.md owns execution policy and the final completion gate; the user's output contract wins.

## One material-claim ledger

Before prose, reconcile the same evidence rows returned by workers. Keep only decision-changing claims; a simple lookup does not need a table. Split compound assertions about specification, performance, causality and recommendation into independently assessable claims.

| Field | Required meaning when applicable |
| --- | --- |
| Claim / finding | Smallest material assertion; exact value or bounded result |
| Evidence status | Documented fact, measured result, sourced claim, inference, recommendation or unknown |
| Support | Direct URL/title and exact passage, table context or locator; retrieval handle where useful |
| Counterevidence | Strongest contradiction or bounded search gap |
| Origin / source type | Original evidence origin, source class and relevant vendor/funding relationship if known |
| Date | Publication, revision, effective or retrieval date where it changes relevance |
| Method / applicability | Task, sample, comparison and conditions; direct relevance or transfer limits |
| Comparability | Applicable differences, missing fields and resulting limits |
| Confidence | Qualitative strength with a short evidence-based reason |
| Disposition | Retain, qualify, reject or unknown, with the decision implication |

Several URLs or workers repeating one paper, run or customer story count as one evidence origin. Preserve support through aggregation and ensure final prose introduces no material unsupported claim. Reuse retrieved support; do not refetch merely to populate a ledger. Keep the ledger internal unless the user needs the audit trail. Missing nonmaterial metadata is not a reason to discard useful evidence.

## Evidence status is not confidence or provenance

- **Documented fact:** what authoritative primary documentation specifies, not proof of practical performance.
- **Measured result:** an observed result under an inspected method and stated conditions.
- **Sourced claim:** an assertion whose measurement support has not been sufficiently inspected or established.
- **Inference:** a bounded interpretation or transfer from evidence.
- **Recommendation:** an action under stated goals and trade-offs.
- **Unknown:** insufficient, unmeasured or irreconcilably conflicting evidence.

A vendor evaluation may contain real measurements; preserve its provenance and method limits rather than automatically dismissing it or calling it independent. A source asserting a measurement without inspected support remains a sourced claim. Advertised capacity is not demonstrated usable capacity; anecdotes are not controlled performance evidence.

Confidence is separate: explain directness, relevance, method quality, uncertainty and corroboration where appropriate. High/medium/low labels are optional shorthand, never fabricated probabilities. Primary authority does not guarantee methodological relevance; vendor association alone does not determine confidence.

## Match the method to the claim

Use primary documentation for specifications, effective prices/policies and direct event records; relevant reproducible evaluations for performance; and original papers with explicit limitations for mechanisms or transfer. Current field signals can motivate hypotheses or operational warnings, not substitute for measured performance. Sentiment evidence establishes reported sentiment, not capability.

A causal conclusion needs a design that isolates the intervention, such as paired or randomized comparisons with relevant confounders held fixed. Observing improvement does not identify its cause. For indirect literature, name the task/model/system/environment differences, justify transfer plausibility and say what remains untested. A high-authority source can still be irrelevant to the particular claim.

## Quantitative comparability gate

Before ranking or normalizing numbers, inspect applicable fields:

1. Task/dataset, version/date and system snapshot.
2. Configuration, prompt, scaffold, tools and effort.
3. Context/action budgets, retries, exclusions and failure handling.
4. Metric/unit, evaluator and final-state validator versus response-only grading.
5. Sample size, repetitions and reported uncertainty.
6. Service tier/provider/region/load/measurement window for latency claims.
7. Included accounting components for cost claims.

If a material field differs or is unknown, show results separately rather than averaging, ranking or implying a controlled common leaderboard. This does not prevent an explicitly qualified qualitative discussion. Mark non-applicable fields; do not invent missing methodology.

For economic decisions, prefer total cost per accepted task when supported. State the acceptance denominator and include relevant input/cache/reasoning/output, tools, retries, parallel branches and verification where available. Missing components remain unknown, not zero. Token list price alone does not establish operating cost.

## Contradiction dispositions

Classify a decision-changing conflict using inspected evidence: temporal change; product/entitlement surface; task/population; harness/configuration/effort; metric/denominator; sampling/evaluator disagreement; shared origin; or genuinely unresolved contradiction.

Do not invent a methodological explanation from the mere existence of disagreement. Reconcile with supporting evidence, preserve both findings under their respective conditions, narrow the recommendation, or leave the choice unresolved. Source voting, anecdote counts and stronger prose confidence do not settle missing evidence.


## Recommendations and report depth

User criteria and requested output slots can be fixed before research. Derive empirical categories, rankings and recommendations from the evidence, rather than forcing results into a preferred taxonomy. Merge or remove optional matrix rows the evidence cannot distinguish; retain required rows with explicit gaps. Keep unmeasured cells unknown. Cells should be independently interpretable with a bounded finding/status and source identifier; put shared methods outside the cells.

For consequential recommendations, name applicability, strongest support/confidence basis, important cost/latency/risk trade-offs, failure or escalation signals, and evidence that would change the action. Recommendations must not be broader than the evidence.

The user's requested structure always wins. Otherwise choose the smallest form preserving the evidence:

- **Focused:** direct answer, decisive support and material limitations.
- **Comparative:** recommendation under stated criteria, criterion-by-criterion evidence, valid quantitative comparisons, disagreements/counterevidence, unknowns and what changes the recommendation.
- **Decision-grade:** add operational rules, a gap-specific resolving evaluation and a source appendix mapping retained direct URLs to supported claims, relevant dates, source types, methods and important limitations. End with what to adopt now, strongest support, highest-impact uncertainties and the measurements that could change the decision.

State the research date where freshness matters and, for delegated work, summarize stream scopes and coverage without presenting worker count as corroboration. Synthesize rather than concatenate reports. Full bibliographies and rejected-source lists are optional unless the user requests them or they explain a material gap.

## Smallest resolving evaluation

When a material choice remains unresolved, specify:

1. The disputed decision and exact evidence gap.
2. Representative tasks derived from that gap, not a generic benchmark checklist.
3. Variables held fixed in paired comparisons; randomization or blinding where relevant.
4. Acceptance metric and validator, preferring final-state correctness and deterministic checks over response plausibility; use blinded review where judgment is unavoidable.
5. Relevant acceptance/failure, retries/loops, out-of-scope work, reviewer defects, latency and token/tool/total-cost accounting. Do not request metrics unrelated to the decision.
6. The smallest justified screening set, then repetitions for finalists or close results as needed.
7. The observable result or decision rule that would change the recommendation.

Use user thresholds where available. Otherwise label proposed thresholds/sample sizes and explain their basis; never prescribe a universal number or invent statistical certainty. Proposing an evaluation is not authorization to run a costly or mutating experiment. If the decision threshold itself is unresolved, name that requirement rather than manufacturing it.

