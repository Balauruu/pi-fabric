# T2 Blind Comparison Review A

**Verdict:** Candidate is materially superior to legacy. No candidate-to-legacy material regression is supported. **No changes made.**

**Scope inspected:**  
- Question: `.../questions/T2.md`  
- Candidate: `.../run-0201-rev03-T2/RESEARCH.md`  
- Legacy: `.../legacy-T2/RESEARCH.md`  
- Original-source passages: none directly inspected. The candidate’s linked sources are individually identified, but this review could not independently retrieve them.

## Q1. Question-level coverage — Candidate passes, legacy fails

- **Candidate passage inspected:** “*Run design can materially change repository-task outcomes...*” and the ten-row **“R1. What primary evaluations measure”** table.
- **Legacy passage inspected:** “*No primary evaluations, original URLs, or quantitative contrasts were retained.*”

The candidate covers context, tool feedback, validation/repair, retries, and decomposition with tasks, model/agent, comparator, method, outcomes, and stated budget limitations. Legacy explicitly supplies none of the required primary evidence.

## Q2. Source entailment and citation completeness — Candidate provisionally passes, legacy fails

- **Candidate passage inspected:** the 13-entry **“Retained-source appendix”**, including direct original URLs, inspected-method descriptions, supported claims, and limitations.
- **Legacy passage inspected:** “*No external sources were retrieved or inspected.*”

The candidate has a traceable source appendix and binds key numeric claims to named studies. Because no original linked passage was retrievable in this review, source entailment is not independently certified here. This is an evidence-verification limit of the review, not a supported candidate regression. Legacy has no citations or source-bound claims.

## Q3. Retained values, methods, comparators, and limits — Candidate passes, legacy fails

- **Candidate passages inspected:**  
  - “*100 lines: 18.0% resolved, versus 14.3% at 30 lines and 12.7% with whole files.*”  
  - “*Greedy: 88/300 (29.33%), $0.22... Four-location allocation: 96/300 (32.00%), $0.29.*”  
  - “*Llama public+hidden validity: 47% feedback versus 34% independent. GPT-4o-mini: 46% versus 47%.*”  
  - “*Ten initial programs plus one repair each reached 1.05× pass@20... 0.97× pass@22.*”
- **Legacy passage inspected:** every evidence-matrix outcome is “*Unknown*.”

Candidate preserves actual quantities alongside interventions, comparators, budget conditions, and non-generalization limits. Legacy retains no values or methods.

## Q4. Counterevidence — Candidate passes, legacy partially passes but is unsupported

- **Candidate passages inspected:**  
  - “*GPT-4o-mini did not gain from conversational test feedback...*”  
  - “*Whole files and full history underperformed bounded views... iterative search underperformed no search.*”  
  - “*Feedback-token cost is excluded.*”  
  - “*Harness pass is not full correctness.*”
- **Legacy passage inspected:** “*Benchmark contamination, evaluator validity, run-to-run variance... are all unknown.*”

Candidate supplies concrete, study-tied counterevidence, leakage boundaries, evaluator limits, and non-equivalent budget warnings. Legacy offers sensible generic cautions but no evidentiary basis or quantified counterexamples.

## Q5. Actionable rules and usable evaluation artifact — Candidate passes, legacy partially passes

- **Candidate passages inspected:**  
  - “*retain the incumbent unless a candidate run design wins a predeclared paired evaluation... under equal total budget and an information-policy audit.*”  
  - **“Operational decision table”**  
  - **“Concrete paired fixed-model evaluation artifact”**, including pinned controls, restart arm, holdout design, recorded fields, paired CI, and adoption gate.
- **Legacy passages inspected:** **“Operational Rules”** and **“Paired Evaluation Artifact.”**

Both reports provide usable paired-evaluation artifacts. Candidate is materially more decision-grade because it operationalizes information-policy controls, restart controls, hidden behavioral resolution, false-pass sampling, stratification, trajectory/patch retention, and a replication gate.

## Q6. Standalone structure and complete retained-source appendix — Candidate passes, legacy fails

- **Candidate passage inspected:** coherent scope, R1–R3 structure, decision table, YAML artifact, stopping boundary, and source appendix.
- **Legacy passage inspected:** appendix lists local methodology and stream files despite stating no sources were retrieved.

Candidate is standalone and has a complete retained-source appendix for its substantive evidence. Legacy is coherent as a protocol-only fallback, but cannot satisfy the requested evidence appendix because it retains no external sources.

## Material gaps

- **G1:** Candidate source entailment was not independently confirmed against original source text in this review. Treat its quantitative claims as cited but not independently revalidated here.
- **G2:** Legacy has no external evidence, source-bound contrasts, or source appendix capable of answering R1–R2.

No material candidate regression relative to legacy is established.