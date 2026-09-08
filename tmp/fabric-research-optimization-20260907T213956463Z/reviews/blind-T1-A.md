# Blind comparative review

## Basis and decision

I read the task and all three supplied reports. I checked decisive claims in their cited primary pages, rather than relying on report summaries: Wei et al. Table 2/4, Yao et al. Table 1/3/4, Wang et al. Table 2, Li et al. API-Bank Tables 3/6, and Anthropic’s long-context method/results passage. There is **No overall winner**: each candidate has a material regression on at least one rubric dimension. This is a case-specific report comparison, not evidence of general skill quality.

### Cross-report findings

- **Equivalent and genuinely unavailable:** all three explicitly reject a universal ranking, retain original-condition comparators, provide a paired local-evaluation artifact, and say a matched current-production total-cost/latency comparison is unavailable. That absence is correctly preserved, not a shortcoming to fill by inference.
- **Observed tradeoff:** Y has the broadest useful R1/R2 coverage. X is the clearest focused decision guide and release-gate artifact. Z most completely operationalizes adversarial/tool-state failure handling. Breadth alone is not a quality score.
- **Critical factual defects:**
  - **X:** its `Evidence ledger` S6 says the Anthropic study used “roughly 75K/90K” contexts. The cited primary method says **70K and 95K** token documents, with Claude Instant 1.2, beginning/middle/end placement, four strategies, and a 10% source-only exclusion. This changes the stated original condition, so it fails Q3 exact-condition preservation.
  - **Y:** its `R1 — measured effects` self-consistency row reports PaLM-540B GSM8K **56.9% → 74.4%** while citing Wang et al. Wang et al.’s Table 2 reports **56.5% → 74.4%** for that sampled-CoT experiment. The 56.9% number is from Wei et al.’s different greedy CoT table. This is a Q2/Q3 citation-entailment and exact-comparator defect.
  - **X:** its S4 **60% → 68%** Reflexion result was not recoverable from the fetched primary HTML text, while the same source directly supports the stated 52% versus 60% feedback-free/baseline result. Do not retain the 68% claim without inspecting the cited Table 3/PDF cell. This is an unresolved verification gap, not a demonstrated contradiction.

## Rubric profiles

| Variant | Strengths | Material regressions |
|---|---|---|
| **X** | `Executive decision`, `Reconciled contradictions`, and `Operating rules` form the most coherent decision path. Its YAML artifact has strong final-state, postcondition, budget, stratum, and rollback fields. The six-row `Retained primary-source appendix` is complete for its retained set and limits are explicit. | Q1 is materially narrower than Y and Z: no measured zero-shot/decomposition/self-consistency, formatting, schema constraint, or adversarial-tool evidence. Q3 has the S6 75K/90K error above. S4 has useful within-study counterevidence but little direct treatment of prompt injection/security. |
| **Y** | `R1 — measured effects` covers the widest relevant range while preserving models, tasks, comparators, and compute qualifications. `R2` gives strong counterevidence across reflection, ReAct brittleness, position, RAG/long-context, and injection. `Operational decision table` and YAML artifact are actionable. The `Retained-source appendix` is complete and source limitations are usually attached to use claims. | The self-consistency number above is an exact-result error. The `Coverage and actual stop reason` section’s references to a verifier, assignments, and other report files are not decision evidence and weaken Q6 self-contained coherence. The tool-documentation claim is responsibly qualified but remains an unresolved table-level check. |
| **Z** | `R1 — measured technique evidence` gives concrete conditions across reasoning, retrieval, context, formats, and constrained decoding. `R2` has the strongest explicit security trade-offs, including injection-defense utility loss. `R3` and its A0–A4 artifact most completely specify injection, authorization, stale-tool, accepted-task-cost, and p99 signals. Its self-consistency row correctly retains Wang et al.’s **56.5% → 74.4%** condition. Its `Source appendix` is complete for the cited retained sources. | `Coverage and actual stop reason`, `Pending independent revalidation`, and `Report validation` inject process assertions, state-file references, and claimed validation outcomes rather than evidence for the research decision. That is a material Q6 coherence/self-containment regression. It is also more verbose than needed and buries the otherwise useful guide. |

## Pairwise verdicts

### X versus Y

**Verdict: observed tradeoff, no dominance.** Y materially improves Q1/Q2 coverage in `R1` and `R2`, especially zero-shot/decomposition/self-consistency, context/RAG, formatting, schemas, and security. X materially improves Q5/Q6 economy: `Executive decision` through `Reusable paired evaluation artifact` supplies a direct failure-to-test-to-rollback path without Y’s process narrative. X cannot win overall because `Evidence ledger` S6 misstates the primary long-context conditions. Y cannot win overall because its self-consistency row mixes the Wang sampled-CoT result with Wei’s 56.9% greedy-CoT baseline.

### X versus Z

**Verdict: observed tradeoff, no dominance.** Z materially improves Q1/Q2 with measured self-consistency, retrieval failure, format, constrained-decoding, persona, and injection evidence, and improves Q5 for adversarial tool use in `R3`. X materially improves Q6 by keeping the selection argument compact and source-directed, avoiding Z’s process/validation material. X’s S6 condition error is a Q3 regression. Z’s process claims are a Q6 regression. Neither hides the other.

### Y versus Z

**Verdict: observed tradeoff, no dominance.** Y is the more coherent production-selection synthesis: its `R1` to `R3` sequence and table/YAML pair are easier to apply, and it has a broader useful context/RAG treatment. Z improves Q2/Q5 by making injection, capability boundaries, authorization, and utility-security trade-offs first-class operational tests. Z also preserves Wang’s 56.5% self-consistency baseline where Y does not. Y’s numeric defect and Z’s self-containment/process defect prevent either from being a winner.

## Minimal resolving checks

1. Correct X S6 to 70K/95K and retain the primary page’s 10% exclusion and end-position caveat.
2. Correct Y’s Wang self-consistency comparator to 56.5%, or cite and label a distinct 56.9% protocol.
3. Inspect Reflexion Table 3/PDF before retaining X’s 68% result.
4. Remove Z’s process, state, and validation assertions. Keep only research evidence, limits, and the decision protocol.

## Primary-passage checks

- Wei et al., Table 2 supports PaLM-540B GSM8K **17.9% → 56.9%** and Table 4 supports **94.1% → 94.1%** SingleOp: https://arxiv.org/html/2201.11903
- Yao et al., Table 1 supports ReAct **27.4/60.9**, CoT **29.4/56.3**, and the hybrid results. Tables 3/4 qualify the ALFWorld best-of-six and WebShop claims: https://arxiv.org/html/2210.03629
- Wang et al., Table 2 supports PaLM-540B GSM8K sampled self-consistency **56.5% → 74.4%**, with 40 sampled paths: https://arxiv.org/html/2203.11171
- API-Bank Tables 3/6 support GPT-4 correctness **60.24%**, failed retrieval **67.86%**, and false format **17.86%**: https://arxiv.org/html/2304.08244
- Anthropic’s primary method specifies **70K/95K**, position conditions, and the 10% exclusion. Its result text supports the 0.939→0.961 figure, 36% error-reduction statement, quote-extraction latency qualification, and possible end degradation: https://www.anthropic.com/research/prompting-long-context
