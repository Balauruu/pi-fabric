# Blind comparative review

## Basis and rubric application

I read the task and all three reports. I inspected original passages for the decisive disputed measurements: Wei et al. Table 2–3, Wang et al. Table 2 and its 40-path protocol, Yao et al. Table 1/3/4, and Zhou et al. §3.3/SCAN. These checks establish that the reports are selective guides, not evidence of universal technique or skill quality.

**Overall result: no unqualified winner.** Z is the strongest decision structure and broadest retained evidence set, but it has a material Q2/Q3 numeric-comparator error. X preserves that comparator correctly and has broader counterevidence, but includes irrelevant process/validation narration and a less disciplined source boundary. Y is a clear, useful compact operational guide, but its six-source ledger is materially incomplete for R1/R2. Correct Z's defect, then Z would be the strongest overall candidate.

## Critical defect

**C1 — Z conflates two different CoT baselines.** In Z, **“R1 — measured effects” → “Self-consistency,”** the cited Wang et al. condition is stated as PaLM-540B few-shot CoT GSM8K **56.9% → 74.4%**. Wang et al.'s original Table 2 instead reports **56.5% → 74.4%** for that self-consistency experiment, with 40 paths. The separately cited Wei et al. Table 2 reports **56.9%** for its own PaLM-540B CoT condition. This is not an equivalent rounding difference and breaks the promised original-condition comparator. Replace Z's baseline with 56.5%, or explicitly say 56.9% comes from a different paper/prompt and is not the direct comparator. X, **“R1 — measured technique evidence” → “Self-consistency,”** preserves 56.5% correctly.

## Pairwise comparisons

### X vs Y

**Verdict: X is stronger overall, with a real Y clarity tradeoff.**

- **X improvements (Q1–Q2):** X's **R1 table** retains measured evidence for self-consistency, least-to-most, backward verification, Gorilla retrieval, formatting, constrained decoding, and few-shot examples. Y's **“Evidence ledger”** retains only CoT, ReAct, Reflexion, API-Bank, brittle ReAct, and one long-context vendor study. Thus Y omits material technique families needed for the question, especially sampling, decomposition, format/schema constraints, retrieval-quality ablations, and context-position evidence. X's **R2** also adds concrete reflection, persona, injection-defense, schema, retrieval, and format counterevidence.
- **X factual improvement (Q2/Q3):** X gives the Wang self-consistency comparator as **56.5% → 74.4%**, matching Wang et al. Table 2. Y does not retain that result, so it avoids rather than resolves this evidence.
- **Y improvements (Q5–Q6):** Y's **“Reconciled contradictions”** makes the decision implications of CoT complexity, ReAct's HotpotQA/FEVER split, feedback-conditioned repair, and position effects more immediately legible. Its **evaluation artifact** gives explicit input/output-token and spend caps, while X's **A0–A4 protocol** is more comprehensive but less compact.
- **Y regression (Q1/Q4/Q6):** Its **“Retained primary-source appendix”** has only S1–S6. This is a genuine coverage loss, not merely brevity, because its R1/R2 conclusions rely on unrepresented technique categories. The six sources do form a complete appendix for the six retained sources, but the evidence available in the compared reports is not unavailable evidence.
- **X regression (Q6):** X's **“Coverage and actual stop reason,” “Pending independent revalidation,” and “Report validation”** introduce workflow/state/validation history rather than decision evidence. This weakens coherence and creates audit claims outside the report's retained-source appendix. Remove these process passages and retain the target-evidence gap only.

### X vs Z

**Verdict: observed tradeoff, not an unqualified winner.**

- **Z improvements (Q1/Q3/Q5/Q6):** Z's **R1 table** preserves a wider useful set of conditions: zero-shot CoT, chain-of-verification, exemplar order, RAG versus long context, tool documentation, planning/repair, and tool-stage reliability. It clearly separates measured results from documentation contracts, e.g. **“Compression and strict schemas.”** Its **operational decision table** and YAML artifact explicitly freeze environment, retrieval, tool schemas, budgets, protected strata, and paired analysis. Its **appendix** is coherent and labels limitations per retained source.
- **X improvements (Q2/Q4):** X has the correct Wang comparator in its self-consistency row, whereas Z has C1. X also foregrounds concrete injection-defense security/utility tradeoffs in **R2**, which Z's retained set does not quantify in the same direct form.
- **Z regression (Q2/Q3):** C1 is material because it is a headline quantitative row advertised as under original conditions. Z cannot be declared the pairwise winner until repaired.
- **X regression (Q6):** The process narration and self-validation claims cited above are not useful evidence for the production choice. Its appendix also calls every listed item “retained, inspected” while several rows support no foreground quantitative claim, which makes the retained-source boundary less clear than Z's method/result framing.
- **Equivalent evidence:** Both correctly preserve Wei et al.'s PaLM-540B GSM8K **17.9% → 56.9%**, including the small-model/easy-task limitation, and both preserve Yao et al.'s within-paper HotpotQA/FEVER reversal. The Yao Table 1 passage supports ReAct 27.4 vs CoT 29.4 on HotpotQA and 60.9 vs 56.3 on FEVER, with hybrids 35.1/62.0 and 34.2/64.6.

### Y vs Z

**Verdict: Z is materially more complete, but not a clean winner while C1 remains.**

- **Z improvements (Q1/Q4/Q5):** Z covers substantially more technique and counterevidence classes and gives a more complete release-gate artifact. Y's operational table is sound but lacks explicit tests for self-consistency, decomposition, exemplar order, RAG-versus-long-context, compression, structured decoding, and planning confounds.
- **Y improvements (Q6):** Y is easier to navigate: its executive decision, contradiction table, and six source-to-claim mappings give a short path from evidence to action. This is a presentation improvement, not evidence superiority.
- **Z regression (Q2/Q3):** Y does not repeat C1 because it omits self-consistency. Omission is not positive coverage, but it means Z's additional evidence comes with a verified comparator error. The resolving check is limited: repair the single Z row from 56.9% to 56.5% and rerun the appendix-to-table citation check.

## Requirement disposition

- **Q1:** Z > X > Y for breadth of measured technique conditions. Y's narrow selection is insufficient for the requested guide.
- **Q2/Q3:** X and Z are otherwise strong in anchoring results to tasks/models/comparators and preserving limits. C1 gives X the factual lead on the directly disputed self-consistency condition. All reports correctly avoid treating unreported serving cost/latency as zero.
- **Q4:** X is strongest on explicit adversarial/security and failure-mode counterevidence. Z is strong on transfer/accounting limits. Y identifies the key selected contradictions but leaves major counterevidence unavailable only because it was not retained.
- **Q5:** Z has the most reusable evaluation artifact. Y is a meaningful compact alternative with concrete budget fields. X is adequate and unusually explicit about cost per accepted task and safety strata.
- **Q6:** Z is the most coherent after C1 correction. Y is the clearest concise guide but has an incomplete retained evidence set. X is less coherent because internal process history and validation assertions distract from the decision and source appendix.

## Minimal resolving checks

1. Amend Z's self-consistency row to Wang Table 2's **56.5% → 74.4%** and state its 40-path protocol.
2. Remove X's process-state and self-validation sections, or replace them with only the decision-changing evidence gap.
3. If Y remains a candidate, add retained original-source rows and condition-specific evidence for the omitted major technique families before representing it as a complete decision-grade guide.
