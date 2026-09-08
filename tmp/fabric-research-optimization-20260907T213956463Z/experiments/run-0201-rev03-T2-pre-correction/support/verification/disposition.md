## 1. R1–R3 disposition

| Requirement | Disposition | Reason |
|---|---|---|
| R1: primary evidence | **Qualified** | The SWE-agent ablations are directly supported ([Table 3](https://arxiv.org/html/2405.15793#S4.T3)); Agentless’s staged-pipeline figures are supported ([Tables 3–4](https://arxiv.org/html/2407.01489v2#S5.T3)). Repair evidence is conditional by model, task filtering, oracle localization, and budget definition. |
| R2: limits and counterevidence | **Supported** | The streams correctly preserve major limits: public-benchmark leakage/weak tests ([SWE-Bench+](https://arxiv.org/html/2410.06992)), contamination is diagnostic rather than proof ([SWE-Bench Illusion](https://arxiv.org/html/2506.12286)), and repair need not beat independent samples ([Self-Repair](https://arxiv.org/html/2306.09896)). |
| R3: production experiment and adoption rules | **Qualified** | The proposed paired, held-out, equal-budget design follows the evidence gaps. It is an appropriate prescription, but no inspected source validates its exact thresholds, three-repair default, or global routing policy. |

## 2. Claim decisions

### Retain

- `context-feedback.md`: “100-line context, last-five-observation history, summarized search, editor/linting” improve SWE-agent’s reported Lite resolution **in that GPT-4 Turbo ACI experiment**. Table 3 supports all stated rates.
- `context-feedback.md`: “Iterative search was worse than no search” is supported. The paper attributes this to exhaustive traversal consuming context/cost budget.
- `context-feedback.md`: Agentless’s four-location allocation and validation-selection figures are usable as **within-pipeline** results, not cross-agent evidence.
- `evaluation-limits.md`: Oracle retrieval/compression must not be presented as deployable context policy. Both use reference-patch information.
- `evaluation-limits.md`: Public SWE-bench pass rate is insufficient for production correctness. Retain the weak-test, solution-leakage, and contamination-risk warnings.
- `validation-repair.md`: [S1] supports the conditional claim that feedback helped Llama 3.1 70B but not GPT-4o-mini under an equal **call-count** comparison.
- `validation-repair.md`: [S3] supports retaining an independent-restart control when evaluating repair.

### Qualify

- `context-feedback.md`: “Prefer bounded, structured context” must remain a **hypothesis for local ablation**, not a general preference. SWE-agent changes multiple ACI components and only tests one benchmark/model setup.
- `context-feedback.md`: “Add validation only when incremental outcome clears cost and latency” is sound policy, but Agentless Table 4 supplies reported dollar cost, not decision-grade latency or semantic-correctness evidence.
- `context-feedback.md`: “Performance plateaued around 40 candidates” is descriptive for Agentless’s pipeline. Do not convert it into a general retry ceiling.
- `evaluation-limits.md`: “Context choice can dominate a fixed-model result” is true only with the explicit oracle-retrieval caveat. It cannot establish the value of a deployable selector.
- `evaluation-limits.md`: The `55.36%`, `22.4% → 10.0%`, and `3.97%/5.49%` SWE-Bench+ figures must remain separated by dataset slice and filtering rule. They are not interchangeable estimates.
- `validation-repair.md`: [S2] Repair@3 gains show increased repair opportunity, not an equal-total-effort causal effect.
- `validation-repair.md`: [S4] may support testing low repair caps directionally only. The stream itself lacks extractable per-condition quantities and reports altered tool semantics and limited repetition.
- `validation-repair.md`: The [S6] `7.8%`, `29.6%`, `28.6%`, and `6.2 pp` figures are secondhand in the cited leaderboard-analysis paper. Cite the originating PatchDiff/all-tests study before using them as primary quantitative evidence.

### Reject

- `validation-repair.md` bottom line: “Use structured test feedback with a bounded repair loop” as a default. The cited evidence is model-conditional and does not establish equal-token, equal-latency, production-representative benefit.
- `validation-repair.md`: “Start with one repair” and “three repair rounds” as operational defaults. Retain only as candidate arms or provisional stop rules to test.
- Any synthesis implying that staged Agentless beats interactive SWE-agent causally. Model, date, prompts, implementation, sampling, and evaluation conditions differ.
- Any synthesis claiming that test feedback, retries, decomposition, or richer tool output improves security. No retained source measures that outcome.

## 3. Decision-changing gaps

1. **G1 — Equal-total-budget repair comparison:** paired held-out comparison of no repair, one repair, capped repair, and independent restarts with matched tokens, tool time, wall time, and dollars.
2. **G2 — Deployment-valid outcome:** hidden behavioral tests plus broader regression and reviewed false-pass measurement. Harness pass alone cannot decide adoption.
3. **G3 — Transfer boundary:** same intervention across the intended model version, repositories, languages, task sizes, and location-clue strata.
4. **G4 — Feedback-information audit:** prove repair feedback and tools do not expose gold patches, PR text, future history, hidden tests, or solution-bearing issue comments.
5. **G5 — Marginal-value curve:** per-attempt accepted-patch gain and cost, not pass@k or “any candidate succeeds.”

## 4. Exact synthesis constraints

- State every causal result with its model, benchmark, task count, arm definition, and budget comparator.
- Label call-count equality, sample-count equality, and total-effort equality as different conditions.
- Present SWE-agent and Agentless as separate within-system studies. Do not rank their architectures.
- Treat oracle retrieval and gold-edit compression as upper bounds only.
- Use public SWE-bench results as screening evidence, never standalone adoption evidence.
- Describe contamination findings as risk signals, not proof of memorization or invalidation.
- State that feedback benefit is model- and task-conditional, with GPT-4o-mini counterevidence.
- Present one- and three-repair policies only as experimental arms pending G1–G5.
- Preserve explicit unknowns for security, production latency, equal-total-budget repair effects, and universal retry/decomposition effects.