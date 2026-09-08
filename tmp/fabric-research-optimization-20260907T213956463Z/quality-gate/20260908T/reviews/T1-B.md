# T1 Blind Comparison Review B

**Verdict:** Candidate materially regresses from legacy. It replaces a decision-grade, source-linked guide with a blocked-evidence notice.

## Q1 — Question-level coverage: Regression

Candidate covers scope but does not answer R1–R3.

- Candidate: “**No prompt technique can be selected, ranked, or operationally recommended**.”
- Legacy provides conditional selections for CoT, ReAct, long-context scaffolds, and verifier-backed repair, with measured conditions and adoption limits.

## Q2 — Source entailment and citation completeness: Regression

Candidate retains no original sources or source-bound claims.

- Candidate: “**Retained original sources: none.**”
- Candidate cites only uninspectable relative “local … note” links, not original sources.
- Legacy retains six direct primary-source URLs, source IDs S1–S6, supported claims, and limitations.

No candidate original-source passage was available to inspect because it provides no original URL.

## Q3 — Retained values, methods, comparators, and limits: Regression

Candidate deletes all retained empirical content.

- Candidate: “**No eligible measurement is retained for any technique.**”
- Legacy retains, for example:
  - S1: PaLM-540B GSM8K CoT versus standard few-shot, “**56.9% vs 17.9%**.”
  - S2: ReAct versus CoT on HotpotQA/FEVER, including “**27.4 EM**” and “**60.9%**.”
  - S4: GPT-4 Rust evaluation, “**60.0% pass@1**” versus “**68.0% pass@1**,” with feedback-free reflection at “**52%**.”
  - S6: long-context setup, position effects, exclusions, and latency qualification.

The candidate preserves only generic evidence-admissibility requirements, not the requested actual values or original conditions.

## Q4 — Counterevidence: Regression

Candidate removes the legacy’s concrete counterevidence and transfer limits.

- Candidate: “**No eligible original source establishes a regression, adverse result, or transfer boundary.**”
- Legacy retains task/model limits, including CoT’s no gain on MAWPS SingleOp, ReAct trailing CoT on HotpotQA, feedback-free repair regression, prompt sensitivity/token burden, and end-position long-context degradation.

## Q5 — Actionable rules and usable evaluation artifacts: Regression

Candidate has generally sound cautionary rules, but no usable evaluation artifact or evidence-derived decision process.

- Candidate: “**Paired local evaluation artifact: Status: blocked.**”
- Legacy provides an operational decision table, failure signals, fixed-budget requirements, and a reusable YAML A/B evaluation contract with frozen variables, strata, graders, records, and promotion/rollback criteria.

## Q6 — Standalone structure and retained-source appendix: Regression

Candidate is readable and internally coherent as a blocked finding, but it is not a standalone answer to the assigned question.

- Candidate: “**Source appendix — Retained original sources: none.**”
- Legacy has a coherent standalone structure and a six-row retained primary-source appendix with direct URLs, evidence forms, supported claims, and limitations.

## Material gaps

1. All empirical technique evidence, including values, comparators, methods, and applicability boundaries, was removed.
2. All original-source citations and the retained-source appendix were removed.
3. Concrete counterevidence was replaced with an absence-of-evidence statement.
4. The reusable paired evaluation artifact was replaced with a non-actionable blocked status.

## Inspected passages

**Candidate report:** the quoted passages above, including its R1/R2 unknown findings, blocked artifact, and no-source appendix.  
**Legacy report:** the quoted S1, S2, S4, and S6 evidence-ledger passages and its primary-source appendix.  
**Original sources:** none inspected. The candidate supplies no original-source URLs, so its claims cannot be source-checked from its retained record.

**No changes made.**