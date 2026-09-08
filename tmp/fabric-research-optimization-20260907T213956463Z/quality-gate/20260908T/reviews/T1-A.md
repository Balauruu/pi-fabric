# Blind comparison review A

## Verdict

**Legacy is materially better.** Candidate correctly avoids fabricating evidence, but it retains no original sources, measurements, counterevidence, or usable experiment artifact required by the question.

## Q1 — Question-level coverage: **Material regression**

- **Candidate inspected:** “**Unknown.** No eligible measurement is retained for any technique.”
- **Legacy inspected:** “PaLM-540B… GSM8K… **56.9% vs 17.9%** accuracy” and ReAct’s task-specific results.
- **Source checks:** Wei et al. reports PaLM-540B standard **17.9** versus CoT **56.9 (+39.0)**. Yao et al. reports ReAct **27.4/60.9**, CoT **29.4/56.3**, and hybrid results.

Candidate does not answer R1’s required measured effects, task, model, comparator, method, results, or cost conditions. Legacy does, with applicability limits.

## Q2 — Source entailment and citation completeness: **Material regression**

- **Candidate inspected:** “**Retained original sources: none.**”
- **Legacy inspected:** six direct primary-source rows S1–S6, each with URL, evidence form, supported claim, and limitation.

Direct-source checks support decisive legacy claims:
- S1: CoT’s scale and easy-task limits.
- S2: ReAct’s HotpotQA/FEVER split and ALFWorld/WebShop gains.
- S3: weaker/irrelevant guidance and approximately **14M input / 150K output** tokens.
- S4: feedback-free reflection **52% vs 60%** baseline and Reflexion **0.68**.
- S5: GPT-4 API-Bank overall **60.24%**, failed retrieval **67.86%**, false format **17.86%**.
- S6: Claude 2 **0.939 → 0.961**, described as 36% error reduction.

Candidate’s local-note links are not original-source citations and do not supply inspectable evidence.

## Q3 — Retained values, methods, comparators, and limits: **Material regression**

- **Candidate inspected:** “this report cannot state a task, model, intervention, comparator, metric, result, method, or compute/cost condition.”
- **Legacy retained:** concrete model/task/comparator/result bundles for CoT, ReAct, tool use, repair, API calling, and long context.

Legacy also preserves limits rather than flattening results into a ranking: model scale, task complexity, constrained APIs, benchmark harnesses, synthetic long-context setup, and absent end-to-end cost or latency.

## Q4 — Counterevidence: **Material regression**

- **Candidate inspected:** “No eligible original source establishes a regression, adverse result, or transfer boundary.”
- **Legacy inspected:** CoT does not improve PaLM-540B MAWPS SingleOp (**94.1% vs 94.1%**), ReAct trails CoT on HotpotQA, weaker/irrelevant ReAct guidance can perform similarly, feedback-free repair falls to **52%** versus **60%**, and long-context end-position performance can degrade.

Source passages checked support these central counterexamples. Candidate retains none.

## Q5 — Actionable rules and reusable evaluation artifact: **Material regression**

- **Candidate inspected:** “**Status: blocked.** No reusable experiment specification is retained.”
- **Legacy inspected:** a failure-signal decision table and a concrete YAML paired-evaluation artifact with frozen model/prompt/tool/retrieval contracts, budgets, task strata, graders, recorded fields, reporting outputs, promotion rule, and rollback rule.

Candidate provides reasonable evidence-admissibility conditions, but not the requested concrete reusable artifact or evidence-grounded selection rules.

## Q6 — Standalone structure and retained-source appendix: **Mixed, materially insufficient**

Candidate is coherent and clearly labels its evidence absence. However, its appendix explicitly contains no retained original sources, so it cannot meet the question’s required complete retained-source appendix.

Legacy is standalone, structured around decisions, evidence, contradictions, operating rules, an artifact, uncertainty, and a six-source direct-URL appendix.

## Material gaps

1. No retained primary sources or original URLs.
2. No measured technique-versus-baseline evidence.
3. No actual values, methods, comparators, or cost conditions.
4. No source-backed counterevidence or transfer limits.
5. No usable paired-evaluation artifact.
6. No complete retained-source appendix.

## No changes

No files changed.