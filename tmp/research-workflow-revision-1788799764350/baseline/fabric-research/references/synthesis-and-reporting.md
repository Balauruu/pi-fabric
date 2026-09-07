# Synthesis and reporting

Use for complex or disputed synthesis, quantitative rankings, causal or transfer claims, and consequential recommendations, whether Main researched directly or delegated. Apply only relevant sections. The parent SKILL.md owns execution policy and the final completion gate; the user's output contract wins.

## Synthesize from the research documents

Main reads the substantive findings, source notes, methods/results, counterevidence and gaps in RESEARCH.md and every assigned stream document before drafting. Follow supporting-file links and read omitted sections in bounded ranges. Compact worker handoffs are navigation, not a substitute for this reading.

Reconcile decision-changing claims in RESEARCH.md with links to their owning sections. Record what Main verified and why a finding is retained, qualified, rejected or left unknown; do not duplicate the evidence into another schema or intermediate ledger. Split compound assertions about specification, performance, causality and recommendation so each can be checked. Keep original research notes, including meaningful alternatives and limitations, even when they do not appear in the final report.

Several URLs or workers repeating one paper, run or customer story count as one evidence origin. Preserve support into synthesis and ensure final prose introduces no material unsupported claim. Reuse retrieved support; do not refetch merely to populate administrative fields. Missing nonmaterial metadata is not a reason to discard useful evidence. A study's design without its results cannot establish a measured benefit; a source description or retailer metadata cannot establish suitability or superiority.

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

For substantive research, write the answer to REPORT.md. Unless the user specifies another structure, include:

1. **Answer and scope:** the conclusion, intended decision, assumptions and research date where freshness matters; label partial or blocked findings.
2. **Evidence-backed analysis by question:** explain the results and their meaning, not just what each source is about. Use appropriate comparisons, actual outcomes, methods and applicability limits. Cite original sources inline and link to the local research sections retaining fuller context.
3. **Disagreements, alternatives and limitations:** strongest counterevidence, unresolved questions, important exclusions and what can or cannot be inferred.
4. **Recommendations or implications:** only when warranted by the task, with trade-offs, applicability and evidence that would change the action.
5. **Coverage and stop reason:** what was checked, what remains partial, why work stopped and the highest-impact next check. Link RESEARCH.md and relevant stream sections.

Omit irrelevant sections for a focused answer, but do not omit a required question or compress substantive research into an executive summary alone. Summarize delegated scopes and coverage without presenting worker count as corroboration. Synthesize rather than concatenate reports. Full bibliographies and exhaustive rejection lists are optional unless requested or needed to explain a material gap. The parent skill owns file creation, read-back and final completion checks.

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

