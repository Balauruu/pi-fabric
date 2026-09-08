# Synthesis and reporting

The synthesizer reads this reference and the full research notes. It combines their evidence into the user's answer, not a sequence of worker summaries.

## Build the argument from the evidence

Organize around the decision and its questions. Read the findings, original-source passages, methods, outcomes, counterevidence and gaps in every stream. Follow cited originals where their context matters to interpretation. The notes are substantive inputs, not a set of preapproved claims.

Explain what the evidence establishes, how it was obtained, where it applies and what remains uncertain. Distinguish documented facts, measured results, sourced assertions, inference and recommendations. Several URLs repeating one study or story are one evidence origin, not independent corroboration.

Keep each numerical comparison with its original source/table, task or population, system/model, baseline, intervention, metric/units and important conditions. Do not splice a baseline from one experiment into another. If methods or denominators differ, discuss results separately instead of presenting a common ranking. Missing cost, latency or uncertainty is unknown, not zero. A vendor measurement can be useful, but retain its provenance and limitations.

Resolve apparent contradictions through source dates, populations, configurations, metrics and methods when the evidence explains them. Otherwise preserve the disagreement and narrow the conclusion. Evidence from another model or setting needs an explicit transfer limitation. Do not invent an explanation or use source voting to settle uncertainty.

## Preserve useful depth

Retain distinctions that change the reader's decision: actual effect sizes and comparators, failure conditions, null results, costs, exceptions and operational controls. Do not compress these into generic advice merely because the executive answer is short. Conversely, do not preserve every sentence or source when it adds no decision-relevant information.

Derive categories and matrices from meaningful differences in the evidence. A comparison cell should contain an interpretable finding, source and applicability or gap. Keep shared methodology outside the cells. Required questions with insufficient evidence remain visible as unanswered or qualified; do not fill them with guesses.

Recommendations should state when to use an approach, why, the important trade-offs, when it fails, and what evidence would change the choice. When public evidence cannot settle the decision, describe the specific local comparison or measurement that would resolve it. Do not turn that proposal into another stage of this research run.

## Write one report

Honor the user's requested structure and depth first. Otherwise select the first matching row. These are content requirements, not literal heading templates.

| Report form | Selection condition | Required content |
| --- | --- | --- |
| Decision-grade | A consequential decision needs detailed justification, or the assignment calls for a substantive literature/benchmark review | Executive answer, detailed evidence chapters, meaningful quantitative comparisons where comparable results exist, operational guidance where supported, unresolved questions and a retained-source appendix. |
| Comparative | The question compares alternatives and the decision-grade condition does not apply | Conditional recommendation, criterion-by-criterion evidence, disagreements, unknowns and sources. |
| Focused | All remaining questions | Answer, decisive evidence and limitations. |

Cite material external claims inline with descriptive links to inspected original sources. For supplied local evidence, link the file and label it local. A decision-grade source appendix lists the retained sources with direct URL, source type/date where relevant, method or evidence form, supported finding and important limitation. Local stream links provide deeper context, not substitutes for original citations.

In persisted mode, write `RESEARCH.md` at the assigned absolute destination as a standalone answer. The initial synthesis writes once. Only a correcting synthesizer invoked by the decision-grade [publication check](publication-check.md) may replace it, once, to close source-demonstrable material defects while preserving unaffected evidence and structure. In no-write mode, return that same report inline without creating files. Include concise reader-relevant scope, research date, limitations and why the investigation ended. Do not add worker-status narratives, process ledgers or approval claims. The report need not reproduce the assignment briefs.

If evidence is insufficient, state the bounded conclusion or blocker plainly. This writing pass ends composition. Decision-grade reports then undergo the bounded publication check before Main determines completeness. Return a concise conclusion, supporting original-source links, material gaps and the saved report path to Main. In no-write mode, return the full report inline instead and report no saved paths. If the report write fails, return the full unsaved report inline with the storage error and no claimed saved report path. Do not retry a failed write. Do not revise the report except when Main explicitly assigns the single publication correction.
