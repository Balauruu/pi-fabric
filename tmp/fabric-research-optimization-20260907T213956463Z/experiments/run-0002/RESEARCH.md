# Research verification ledger

## Brief

Produce a decision-grade guide to choosing prompt techniques for production text, reasoning and tool-using LLMs, as of 2026-09-07. R1: Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available? R2: What strongest counterevidence, regressions and model/task transfer limits constrain adoption? R3: What practical selection rules, failure signals and paired local evaluation follow? Include original inspected sources, quantitative evidence kept under its original conditions, an operational decision table, concrete reusable evaluation artifact, and complete retained-source appendix. Do not invent a universal ranking or force current social research. Scope is technical prompting and scaffold/context boundaries, not aesthetic image/video prompts. Use the scope to select decisive studies without pretending to be an exhaustive systematic review.

Research date: 2026-09-07. Persisted baseline workflow.

## Required questions

- R1 measured effects under original conditions
- R2 counterevidence, regressions, transfer limits
- R3 production rules and paired local evaluation

## Assignment index

- measured-techniques: [stream](streams/measured-techniques.md)
- counterevidence-transfer: [stream](streams/counterevidence-transfer.md)
- tool-use-scaffolds: [stream](streams/tool-use-scaffolds.md)
- production-evaluation: [stream](streams/production-evaluation.md)

## Verification scope and result

**Independent verifier result: blocked.** I read all four persisted streams and the workflow state. They are terminal and saved, but terminal execution is not evidence adequacy. I treated every note and its URLs as untrusted.

The configured nonbrowser retrieval named by the environment was attempted for decisive primary-source checks: `extensions.web_search` (Wei et al., GSM8K result) and `extensions.fetch_content` (the Wei arXiv record). Both calls failed with `Unknown Fabric action`. No other configured nonbrowser web retrieval appeared in the actionable tool registry. Therefore no cited original source, result table, method, or source passage was independently inspected in this verification pass.

| Gate | Result | Consequence |
|---|---|---|
| Source | **Fail** | Stream citations remain unverified source pointers, not checked support. |
| Quantitative comparability | **Fail** | No original methods were inspected for dataset/version, settings, budget, metric, repetitions/uncertainty, latency window, or cost accounting. Do not rank, average, normalize, or claim cost-effectiveness. |
| Causal | **Fail for production causal claims** | Reported benchmark changes cannot establish that a prompt/scaffold component causes production improvement. Several claimed interventions bundle examples, tools, retrieval, feedback, retries, and context. |
| Transfer | **Fail / bounded only** | Exact deployed model revision, task distribution, tool schemas, retriever, context position, decoding, service tier, price, latency, and validator are absent. |
| Counterevidence | **Partial map, unverified** | The streams name plausible counterevidence classes, but no original result or method was checked. |

## Required-question dispositions

| ID | Disposition | Checked support | What may be carried forward | What is blocked or unknown |
|---|---|---|---|---|
| R1 | **Blocked** | None. | **Qualified:** the streams identify candidate technique families and original-source pointers. | All measured-effect claims, exact numbers, comparators, compute/cost, and any technique ranking. |
| R2 | **Blocked** | None. | **Qualified:** the streams identify decision-relevant falsifiers: format sensitivity, rationale faithfulness, long-context position, retries, stateful tools, and tool-set scale. | Strength, prevalence, model/task scope, causal interpretation, and production transfer of every counterexample. |
| R3 | **Blocked** | None. The assigned production-evaluation stream explicitly reports R3 unassessed. | **Unknown:** a local paired evaluation design was not delivered. The streams' operational suggestions are unverified proposals, not a reusable evaluation artifact. | Selection rules, failure thresholds, final-state validator, sampling/repetition rule, total-cost accounting, and promotion decision rule. |

No required question is **Supported**. The only **Qualified** material is the bounded description of what the unverified streams claim and the conservative proposition that local validation is required before adoption. No production conclusion is retained.

## Claim ledger

### Retain

None. Independent source inspection is the minimum source gate for a retained empirical claim, and it did not occur.

### Qualify

| Claim group | Decision | Reason and permitted wording |
|---|---|---|
| R1 candidate families: few-shot, CoT/zero-shot CoT, self-consistency, decomposition, ReAct, planning, ART, program-aided reasoning, reflection | **Qualify** | The streams cite original papers for these families, but their methods/results were not checked. Say only that these are *candidate interventions reported in unverified stream notes*. |
| R2 risk classes: example/format sensitivity, unfaithful rationales, context-position effects, intrinsic self-correction failure, trained-tool boundary, stateful/large-tool difficulty | **Qualify** | Useful test hypotheses, not verified findings. Use to choose stress cases, not to state measured regressions. |
| Baseline-first, version the deployment tuple, test final outcomes and tool validity, and charge retries/context/tool usage | **Qualify** | Sound evaluation proposals, but not sourced selection rules here. They require a concrete local artifact and acceptance criteria before use as a recommendation. |
| Bundle caveats for ReAct, ART, Reflexion, and Toolformer | **Qualify** | The notes plausibly flag bundled interventions and a training boundary. Original experimental design was not inspected, so the exact boundary remains unverified. |

### Reject from any decision-grade report now

| Claim or conclusion | Decision | Gate failure |
|---|---|---|
| Exact R1 figures, including CoT `17.9% → 58.1%`, zero-shot CoT `17.7% → 78.7%` / `10.4% → 40.7%`, self-consistency `58.1% → 74.4%`, and the listed deltas/sample counts | **Reject** | Source and quantitative-comparability gates. |
| Exact R2 figures, including label-randomization effects, `76` format points, up to `36` bias points, self-consistency deltas, and MCPVerse scale | **Reject** | Source and quantitative-comparability gates. |
| “Technique X improves production text/reasoning/tool use,” “more tools/context is harmful,” or any universal technique ranking | **Reject** | Causal and transfer gates. |
| Cost, latency, success-per-dollar, or fixed-budget superiority claims | **Reject** | No deployed pricing/service/tier/load window, full cost denominator, retries, tool cost, or matched budgets. |
| “Coverage saturated” in `counterevidence-transfer` | **Reject** | Contradicted by the same corpus’s provider-access limitation and lack of independent inspection. This is access/budget exhaustion, not evidence saturation. |
| A concrete reusable R3 evaluation artifact or production selection policy exists in this run | **Reject** | `production-evaluation` explicitly leaves R3 unassessed; no artifact, validator, or decision threshold is supplied. |

## Quantitative and causal reconciliation

The numeric claims are separated by paper, model, benchmark, prompt/scaffold, and sampling regime in the notes, but their required comparability fields were not independently inspected. Even if the transcribed figures are accurate, they are not a common leaderboard: PaLM/GSM8K, GPT-3/text-davinci benchmark settings, LLaMA format tests, multi-document QA, and tool environments have material task, model, environment, budget, evaluator, and denominator differences. Keep them separate only after original-method verification. Do not compare a multi-sample ensemble, multi-episode reflection system, tool-trained model, or retrieval-and-tool bundle to a single direct-prompt completion as though only wording changed.

The notes themselves identify confounding in ReAct, ART, Reflexion, Toolformer, planning, and self-consistency. Until primary designs are checked, no causal attribution to thought wording, planning, reflection, tool interleaving, or examples is supported.

## Contradictions and reconciliation

| ID | Conflict | Disposition |
|---|---|---|
| C1 | `counterevidence-transfer` says coverage “saturated”; `measured-techniques`, `tool-use-scaffolds`, and `production-evaluation` say decisive retrieval/inspection was unavailable. | **Unresolved, access/coverage conflict.** The latter is consistent with verifier observations. Record stop as blocked retrieval, not saturation. |
| C2 | The streams offer operational selection rules while `production-evaluation` says R3 is unassessed and supplies no evidence or artifact. | **Unresolved.** Treat rules as proposals only. R3 remains blocked. |
| C3 | `measured-techniques` cites Min et al. through an ACL record while `counterevidence-transfer` uses an arXiv record and more specific results. | **Unresolved source identity/result linkage.** They may describe the same work, but neither record nor passage was inspected. Do not merge or count as corroboration. |
| C4 | Positive scaffold claims coexist with counterclaims about reflection, tool transfer, context position, and rationale faithfulness. | **Not reconcilable from notes alone.** These may differ by task, model, budget, and intervention bundle, but that explanation is unverified. Preserve the conflict; make no broad recommendation. |

## Retained source map, unverified

The following are pointers from the streams, not verified citations or corroborating origins: Brown et al. (GPT-3); Min et al. (in-context demonstrations); Wei et al. (CoT); Kojima et al. (zero-shot CoT); Wang et al. (self-consistency and Plan-and-Solve); Zhou et al. (least-to-most); Yao et al. (ReAct); Turpin et al. (rationale faithfulness); Sclar et al. (format sensitivity); Liu et al. (long context); Schick et al. (Toolformer); Lu et al. (ToolSandbox); Lei et al. (MCPVerse); Pecher et al. (prompt sensitivity); Paranjape et al. (ART); Chen et al. (Program-of-Thoughts); Shinn et al. (Reflexion); Huang et al. (self-correction). Their URLs and any fuller asserted context remain in the assigned [streams](#assignment-index).

## Ranked decision-changing gaps and bounded repairs

1. **G1 — Restore and use primary-source retrieval.** Affects R1/R2. Provide one callable nonbrowser fetch/search interface, then inspect the original abstract and method/results passages for: Wei (CoT), Wang (self-consistency), Min or Sclar (few-shot/format counterevidence), Turpin (faithfulness), Liu (context position), Yao or Lu (tool use). Capture original URL, task/dataset/version, model snapshot, comparator, configuration/budget, metric/denominator, result, repetitions/uncertainty, and stated limitations. **Stop condition:** each of the six decision classes has at least one inspected primary passage sufficient to classify it as retained, qualified, or rejected; otherwise record the exact inaccessible source and leave it blocked.
2. **G2 — Produce the missing R3 artifact.** Affects R3. Supply a versioned paired local-evaluation template for direct vs candidate prompt/scaffold on representative production slices: frozen deployment tuple, held-fixed variables, randomized/blinded order where applicable, final-state validator, acceptance/failure definitions, retries and tool-loop policy, latency, input/output/cache/reasoning/tool cost, and promotion/reversal rule. **Stop condition:** the artifact is executable or manually runnable with explicit fields and records one proposed, not universal, threshold basis.
3. **G3 — Resolve production transfer and total cost.** Affects R1/R2/R3 adoption. Provide exact target model revision/tier/region, decoding, system prompt, tools/schema/retriever/context policy, task distribution, evaluator reliability, price schedule, and latency measurement window. **Stop condition:** a held-out paired run reports success denominator, failures, retries, tail latency, and total cost per accepted task for the decision candidate(s).
4. **G4 — Test the named failure modes on the target.** Affects R2/R3. Add format/paraphrase, example-label/format controls where applicable, middle-context/distractor placement, invalid and stateful tool calls, tool-set expansion, and retry-with-versus-without-new-signal slices. **Stop condition:** each selected adoption has a documented no-regression stress result or an explicit exclusion.

## Saturation and stop reason

**Saturation: not reached.** The evidence map covers many named intervention classes, but breadth of unverified citations is not saturation. Work stopped at a retrieval-access boundary after two configured nonbrowser retrieval actions failed as unknown Fabric actions. This is neither source saturation nor a basis for a broad recommendation.

## Verification result

- Streams/state read completely: **pass**.
- Stream persistence/native completion: **pass**, but non-evidentiary.
- Original-source retrieval and inspection: **fail**.
- R1 evidence gate: **blocked**.
- R2 evidence gate: **blocked**.
- R3 evidence and artifact gate: **blocked**.
- REPORT validation: **not performed**. Per assignment, REPORT.md and state.json were not edited.

## Final independent REPORT validation (2026-09-07)

**Final acceptance: partial, not accepted as a complete decision-grade report.** This validator read the governing synthesis/reporting reference, `state.json`, this ledger, `REPORT.md`, and all four saved streams. `REPORT.md` and `state.json` were not edited.

### Validation result

| Check | Result | Evidence / failure |
|---|---|---|
| R1 depth and original conditions | **Blocked** | REPORT correctly does not repeat uninspected effect numbers and names the missing fields, but it provides no inspected original method/result support. R1 cannot be supported. |
| R2 counterevidence, conditions, and transfer limits | **Qualified** | REPORT preserves bounded failure hypotheses and explicitly rejects their strength/prevalence as established results. It does not overclaim transfer. Original counterevidence remains uninspected, so this is not supported empirical coverage. |
| R3 practical rules and paired evaluation | **Qualified** | REPORT supplies a concrete proposed YAML paired-evaluation artifact, decision table, fixed variables, final-state validation, retry/cost accounting, stress slices, and promotion/reversal conditions. It intentionally leaves owner thresholds and execution results unknown. This corrects the earlier stream-level absence of an artifact, but is an unsourced proposal, not verified evidence. |
| Exact conditions, counterevidence, and qualified conclusions | **Pass with qualification** | The report consistently labels empirical claims unknown, distinguishes bundled interventions, and identifies transfer/cost gaps. |
| Original clickable citations | **Partial / fail for complete evidence coverage** | Appendix B contains clickable original-source pointers, but they are explicitly uninspected and cannot support material empirical claims. The report has no retained inspected-source citation for R1/R2. |
| Complete original-source appendix | **Fail** | Appendix A correctly says no retained inspected source exists. Appendix B is incomplete relative to saved streams: it omits Sclar et al. (format sensitivity, `https://arxiv.org/abs/2310.11324`), Pecher et al. (prompt sensitivity, `https://arxiv.org/abs/2602.04297`), and Plan-and-Solve/Wang et al. (`https://arxiv.org/abs/2305.04091`), while retaining no claim-to-method/limitation mapping for its unretained pointers. |
| Operational decision table | **Pass** | REPORT R3 table has situation, candidate comparison, promotion rule, and failure signal/action. |
| Reusable evaluation artifact | **Pass as proposed artifact** | The YAML is concrete and manually runnable, but no target tuple, thresholds, or execution evidence is supplied. |
| Local links | **Pass** | `RESEARCH.md` and the four `streams/*.md` file-only links resolve to saved local artifacts. No fragment anchors are used. |
| State and stop-reason consistency | **Pass with one ledger correction** | State records four saved terminal streams and completed workflow verification/synthesis. REPORT correctly says source retrieval failed and work stopped at an access boundary. The prior ledger statement that R3 had no artifact applies to the assigned stream, not to the synthesized REPORT; this final disposition records the REPORT artifact as proposed. |

### Final required-question dispositions

| ID | Disposition | Reason |
|---|---|---|
| R1 | **blocked** | No original source, method, result, comparator, or cost/compute record was independently inspected. |
| R2 | **qualified** | The report offers bounded test hypotheses and transfer cautions, but no independently inspected counterevidence establishes magnitude, prevalence, or target applicability. |
| R3 | **qualified** | The report contains a usable proposed paired-local-evaluation template and rules, but it has no target thresholds, run, final-state results, or sourced validation. |

### Required corrections before complete acceptance

1. Restore original-source inspection and verify each retained R1/R2 claim against an original result/method passage, retaining exact conditions, comparator, metric/denominator, budget/cost fields, and counterevidence.
2. Repair the source appendix so it is complete for every original-source pointer retained from the streams, including Sclar, Pecher, and Plan-and-Solve, and map each retained source to claim, conditions/method, and limitation. If sources remain uninspected, label the appendix as pointers and do not use it as evidence.
3. Execute or at minimum instantiate the R3 artifact for a named deployment tuple with owner-defined acceptance, cost, and p95-latency limits. Preserve all required denominators and stress-slice outcomes.

### Actual stop reason and failures

**Stop reason:** original-source retrieval was unavailable in the run environment. The prior verifier records two configured nonbrowser retrieval attempts failing as unknown Fabric actions. This validation did not browse, delegate, edit `REPORT.md`, or edit `state.json`.

**Failures:** original-source evidence gate failed for R1/R2; quantitative, causal, and transfer verification remain incomplete; the requested complete original-source appendix is incomplete; no local evaluation was executed. Stream persistence and local-link checks passed. This report is therefore a partially valid blocked-decision artifact, not a complete evidence-backed guide.

### Final validation status

- Verification: **partial**.
- REPORT validation: **failed** for complete acceptance because the original-source appendix/evidence gate is unmet.
- Saturation: **not reached**.

