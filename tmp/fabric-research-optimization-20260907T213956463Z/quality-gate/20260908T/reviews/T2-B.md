# T2 Blind Comparison Review B

**Verdict: Candidate materially exceeds legacy and is decision-grade. No material regression found. No changes made.**

## Q1. Question-level coverage — **Pass**
Candidate covers all required run-design choices with primary evaluations: context, tool feedback, validation/repair, retries, and decomposition. Each row supplies task, model/agent, comparator, method, outcome, and limits/cost conditions.

**Inspected candidate passages**
- “100 lines: **18.0%** resolved, versus 14.3% at 30 lines and 12.7% with whole files.”
- “Four-location allocation: **96/300 (32.00%), $0.29**.”
- “Test feedback: GPT-4o 45.6% Repair@1 to **53.2% Repair@3**.”
- “Feedback repairs compared with i.i.d. samples at equal program-sample count.”

**Legacy contrast:** its evaluation matrix is entirely “Unknown,” with no primary evaluations or quantitative contrasts.

## Q2. Source entailment and citation completeness — **Pass, with minor presentation limitation**
Candidate links named original sources in its retained-source appendix and maps each to a supported claim and limitation. The report’s central claims inspected against original sources were entailed.

**Original-source passages inspected**
- SWE-Agent source table passages include the reported **18.0**, **15.7**, **14.3**, and **10.3** values.
- Agentless source: “highest performance (**32.00%, 96 correct fixes**) and low cost.”
- Conversational repair source: “LLaMA 3.1 70B can generate valid patches in **47%** of cases.”
- Self-Repair source: “1 repair candidate each … leads to a pass rate **1.05×** higher than … `pass@22` (**0.97×**).”
- SWE-Bench+ source: “**32.67%** of the successful patches involve ‘cheating’” and SWE-Agent+GPT-4 drops from **12.47%** to **3.97%** after filtering.
- FeedbackEval source tables contain the retained **45.6**, **53.2**, **59.4**, **68.6**, **68.2**, and **75.7** values.

**Minor limitation:** citations are appendix-mapped rather than placed directly in every evidence-table row. The named studies and one-to-one appendix mapping keep claims traceable, so this is not a material gap.

## Q3. Retained values, methods, comparators, and limits — **Pass**
Candidate preserves actionable numbers alongside intervention details and comparators, while explicitly retaining unequal-budget and oracle-context constraints.

**Inspected candidate passages**
- “Claude 2 BM25: **1.96%**; oracle retrieval: **4.8%**.”
- “Greedy: **88/300 (29.33%), $0.22** … Four-location allocation: **96/300 (32.00%), $0.29**.”
- “Llama public+hidden validity: **47%** feedback versus **34%** independent. GPT-4o-mini: **46%** versus **47%**.”
- “Equal maximum calls, not tokens, wall time, or dollars.”
- “Oracle files and gold-edit positions are unavailable in production.”

**Legacy contrast:** retains a generic protocol but no actual evaluations, values, methods, or source-bound comparator limits.

## Q4. Counterevidence — **Pass**
Candidate includes direct negative results, evaluator limitations, leakage concerns, contamination qualification, variance, and a no-security-inference boundary.

**Inspected candidate passages**
- “GPT-4o-mini did not gain from conversational test feedback.”
- “Whole files and full history underperformed bounded views.”
- “More retries can expose a selector bottleneck rather than improve delivered outcomes.”
- “Neither access to training data nor n-gram similarity proves that a particular resolved patch was memorized.”
- “No retained source measures security effects.”

The SWE-Bench+ source check supports the report’s leakage and weak-evaluator warnings.

## Q5. Actionable rules and usable evaluation artifacts — **Pass**
Candidate provides both an operational decision table and a concrete paired-evaluation YAML artifact. It fixes model and reasoning effort, specifies equalized budgets, restart controls, transcript information audits, holdouts, paired confidence intervals, guardrails, and replication.

**Inspected candidate passages**
- “Adopt only if … a positive paired CI and no cost, latency, or reviewed-false-pass guardrail breach.”
- “C_restart_control: ‘independent attempts matched to B's token, tool-time, wall-time, and dollar ceilings’.”
- “95% paired-CI lower bound for held-out behavioral resolution is > 0.”
- “No prohibited-information finding in transcripts.”

**Legacy contrast:** its artifact is useful as a generic minimum protocol, but lacks evidence-derived arm design, restart-control specificity, information-policy audit, and source-grounded thresholds.

## Q6. Standalone structure and retained-source appendix — **Pass**
Candidate is coherent standalone: scope, evidence matrix, quantitative contrasts, counterevidence, decision table, executable artifact, stopping boundary, and a 13-source appendix with direct URLs, methods, supported claims, and limitations.

**Inspected candidate passage**
- “Actual stop reason: published evidence lacks a fixed-model, equal-realized-total-effort, production-representative causal evaluation.”

**Legacy contrast:** its appendix explicitly records no retrieved external sources and includes non-source internal artifacts. It therefore does not meet the requested complete retained original-source appendix.

## Material gaps
None supported. The candidate’s only notable limitation is citation placement in the appendix rather than row-level links, but its source mapping remains sufficient and is not a material regression.