# Synthesis and reporting

Verification, synthesis and report-validation workers read this reference. It owns evidence gates and report content; the parent SKILL.md owns the phase graph and document ownership. Apply only relevant methodology sections. The user's output contract wins. A narrow direct lookup can use the applicable gates without a workflow.

## Storage mode comes first

The assignment states persisted or no-write mode. In no-write mode, all file-read/write instructions below refer instead to the full evidence and role outputs passed inside the program: the verifier consumes substantive research and returns checked dispositions plus bounded gap requests; the synthesizer consumes that evidence and verification and returns the report text; the independent validator consumes the report and its evidence and returns acceptance or correction requests. No role writes files or returns saved paths. Keep each handoff within its task budget without replacing evidence with metadata; if full required support cannot fit, return partial/blocked coverage. The final validated report may return inline to Main for relay. Persisted mode uses the dossier and document ownership below.

## Verify, reconcile and request repairs

The verifier is independent of the research authors. Read the actual workflow-persisted streams' findings, evidence/methods, counterevidence and gaps, including useful partial notes returned by failed runs and their native/persistence status in control state. Follow supporting-file links and continuations. For a large corpus, accept bounded verification shards with explicit required-question IDs and reserved verification-note paths. Shards write only those single-owner support notes. A reconciliation worker returns checked dispositions to workflow code. No verification role writes RESEARCH.md or creates a competing report.

1. Separate execution success from evidence adequacy. A completed worker may lack support; a failed worker may leave useful evidence.
2. Check each decisive/disputed claim against inspected source support, surrounding conditions and actual results. Reuse retained passages when they establish faithful support. If they do not, retrieve the original or use available trace evidence within this worker; neither assertions nor temporary handles establish independent verification.
3. Apply the source, quantitative-comparability, causal and transfer gates below. Return retain/qualify/reject/unknown dispositions to workflow code, linked to original notes. Preserve the notes even if the report omits them.
4. Investigate contradictions through actual methods and conditions. Retain bounded conflicting findings or leave conclusions unknown when reconciliation is unsupported. For consequential/disputed recommendations, seek overturning evidence or record the counterevidence coverage gap.
5. Return compact required-question dispositions and ranked decision-changing gap requests with affected IDs, exact missing evidence, bounded assignment and stop condition. The workflow, not this leaf worker or Main, dispatches repairs. After repair, recheck changed evidence and affected conclusions only.

Every required question needs checked support, a qualified answer, an explicit gap or a blocked conclusion. One cited subquestion does not close a broad requirement. Distinguish evidence saturation from access/budget exhaustion. Do not accept a broad recommendation merely to avoid another phase; preserve the unresolved gap.

## Synthesize from the research documents

The synthesizer reads substantive findings, source notes, methods/results, counterevidence and gaps in every assigned stream plus verifier dispositions supplied by workflow code before drafting. Follow supporting-file links and read omitted sections in bounded ranges. Researchers return full Markdown notes, which the workflow persists unchanged. Compact control receipts are navigation, not a substitute for reading those notes. Do not ask Main to absorb the corpus.

Follow the verifier's decision-changing dispositions supplied by workflow code, linked to owning sections. Preserve why a finding is retained, qualified, rejected or left unknown; do not duplicate evidence into another schema or intermediate ledger. Split compound assertions about specification, performance, causality and recommendation so each can be checked. Keep original research notes, including meaningful alternatives and limitations, even when they do not appear in the final report.

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

For substantive research, the synthesizer alone writes the final answer to the single authoritative `RESEARCH.md`, once, from a clean task-specific outline. Do not create `REPORT.md`. Keep canonical requirements, reservations, phase/status history and validation dispositions in workflow control state. Keep full source and verification notes in their single-owner support documents. RESEARCH.md may retain only reader-relevant scope/method, evidence gaps and the actual stop reason. It must not narrate workflow progress, claim validation, or ask for pending revalidation. Unless the user specifies another structure, include:

1. **Answer and scope:** the conclusion, intended decision, assumptions and research date where freshness matters; label partial or blocked findings.
2. **Evidence-backed analysis by question:** explain the results and their meaning, not just what each source is about. Use appropriate comparisons, actual outcomes, methods and applicability limits. Preserve each recorded study contrast as one source-bound measurement unit: original source/table, model, task, baseline, intervention, metric, budget and caveat travel together. Do not combine values from different studies, even when their labels look similar. Cite material claims inline with clickable, descriptive Markdown links whose labels name the inspected original sources and whose targets are their original URLs. Also link to local research sections retaining fuller context; dossier links or an unlinked bibliography do not replace original-source links. For original local-file evidence without a public URL, link the file and label it local rather than inventing a URL.
3. **Disagreements, alternatives and limitations:** strongest counterevidence, unresolved questions, important exclusions and what can or cannot be inferred.
4. **Recommendations or implications:** only when warranted by the task, with trade-offs, applicability and evidence that would change the action.
5. **Coverage and stop reason:** what was checked, what remains partial, why work stopped and the highest-impact next check. Link RESEARCH.md and relevant stream sections.

Omit irrelevant sections for a focused answer, but do not omit a required question or compress substantive research into an executive summary alone. Summarize delegated scopes and coverage without presenting worker count as corroboration. Synthesize rather than concatenate reports. A decision-grade report includes a complete appendix for every retained source: direct URL, source type, relevant date, method/evidence form, supported claim and important limitation. Full bibliographies and exhaustive rejection lists beyond retained sources are optional unless requested or needed to explain a material gap. The parent skill owns file creation, read-back and final completion checks.

## Validate the authored report

The report validator must be independent of the report author. Read back RESEARCH.md and inspect decisive linked evidence and verifier dispositions. Check:

- The actual required questions are answered at the requested depth, with analysis rather than source descriptions or populated slots. For decision-grade work, `## Source appendix` is mandatory and each retained source row has direct URL, type/date, method or evidence form, supported claim and important limitation; reject an absent or incomplete appendix.
- Decisive claims retain applicable results, conditions, counterevidence and uncertainty; recommendations stay within verified coverage. New unsupported report claims are rejected or returned for verification, not silently accepted. Check the retention set against the authored report: every required decision dimension and source-unique material contribution is either present with its source-bound result, units, method/conditions and comparator where applicable, or explicitly qualified with the consequence for the decision. Independently verify every material quantitative report claim against its inspected source rather than checking only the executive conclusion. Return a bounded correction request for any omitted, altered, cross-spliced or unsupported item.
- Both RESEARCH.md and the returned `citations` contain original-source links for their material claims, not just local dossier navigation. URLs correspond to inspected support and are neither invented nor temporary retrieval handles; original local-file evidence is explicitly labeled local. Missing links are failed citation checks or explicit coverage gaps. Local file links exist; for heading fragments, derive the actual Markdown heading slug including lowercase and punctuation handling and check the target heading. File existence alone does not validate an anchor. Prefer file-only links if the renderer's convention is uncertain.
- Meaningful notes are saved and linked, execution state accounts for assignments, and coverage, unresolved requirements and the actual stop reason agree across the report and ledger. A completed report has no in-progress placeholders. A limit-stopped report explicitly says what is partial.

Return acceptance and material failures only through the parent skill's control outcome contract: status, conclusion, decisive citations, limitations, per-question coverage dispositions, gaps, real paths, verification and reportValidation checks, stopReason and userDecision. Do not write validation claims into RESEARCH.md. The assignment must supply that bounded control schema. Do not reduce this to `accepted: true` or replace qualified/unknown dispositions with blanket acceptance; a well-formed report can still contain evidence gaps. If a correction needs report edits, return a bounded correction request to the workflow; a writer applies it, then an independent validator checks the changes. Do not mark an unvalidated draft complete or ask Main to perform validation. In no-write mode inspect the synthesized report and evidence supplied inside the program, and label all outputs unsaved.

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

