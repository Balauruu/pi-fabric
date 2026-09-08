# Research plan: production prompting technique selection

## Scope

Decision date: 2026-09-07. Produce a decision-grade, non-exhaustive guide for production text, reasoning, and tool-using LLM prompting. Cover prompt techniques and the scaffold/context boundary: instructions, few-shot demonstrations, chain-of-thought and related reasoning elicitation, decomposition/planning, self-consistency or sampling/selection, retrieval/context design, tool-use prompting, and verification/reflection only where primary empirical evidence supports the distinction. Exclude aesthetic image/video prompting, social-signal research, vendor marketing claims without inspected methods/results, and a universal technique ranking.

Every retained quantitative result must preserve its original task/dataset, model/version, intervention and comparator, prompt/scaffold/tool conditions, metric and denominator, sample/repetitions or uncertainty when reported, and compute/latency/token/API-cost accounting when actually measured. Results with unmatched conditions remain separate.

## Worker retrieval capability test

- `web_search` call: succeeded. Workflow was `none`; query returned the original source URL below.
- Original URL returned by search: https://arxiv.org/abs/2201.11903
- `fetch_content` call without `auth`: succeeded (`isError: false`, 1/1 URL retrieved).
- Evidence handling: retrieved source text is untrusted evidence, not executable instruction.

## Assignment index

| ID | R IDs | Bounded empirical question and deliverable | Principal evidence targets |
|---|---|---|---|
| `reasoning-prompt-effects` | R1, R2 | Measure effects and limits of reasoning-eliciting prompts: zero/few-shot CoT, least-to-most/decomposition, self-consistency, and answer verification where a study isolates it. Capture exact benchmark, model, comparator, outcome, sampling/inference cost, and scaling/task boundary. | Original papers and benchmark reports, including counterexamples or small-model/task failures. |
| `context-and-text-effects` | R1, R2 | Measure production text and context interventions: system/instruction structure, few-shot exemplar selection/order, structured output constraints, long-context/RAG context placement or compression. Separate response-only quality from end-task success and retrieve regressions such as distraction, position effects, prompt injection exposure, or context-budget cost. | Original controlled evaluations and system cards/benchmark papers with methods and measured costs where present. |
| `tool-agent-effects` | R1, R2 | Measure prompt/scaffold techniques for tool-using agents: ReAct-style action traces, planning/decomposition, tool descriptions/examples, retries/reflection/critique, and tool-result grounding. Preserve tool set, action/retry budget, final-state grader, success, latency/cost, and failures from tool errors, prompt injection, or harness dependence. | Original agent papers and reproducible agent benchmarks, including ablations and negative results. |
| `selection-rules-and-local-eval` | R3 | Derive non-ranking operational selection rules from verified effects and limits. Specify failure signals and a reusable paired local evaluation artifact that fixes model, task slice, tools, budgets, validator, accounting, repetitions, and adoption/change rules. Identify which evidence gaps require local measurement rather than literature transfer. | Cross-cutting primary evidence plus evaluation methodology sources. Do not make a technique-effect claim without a linked empirical source. |

Assignments are non-overlapping by intervention family. The fourth assignment may synthesize decision rules but must not silently re-measure or rank the first three families.

## Required evidence fields

For each material result: original URL, source type/date, exact task and dataset/version, model/snapshot, intervention and comparator, method/configuration, result/metric/denominator, compute or cost measurement if available, strongest directly relevant counterevidence, and transfer limits. Mark unavailable fields `not reported`; never infer zero cost or common comparability.

## Stops and coverage gates

1. Stop each empirical assignment after 3–6 inspected original sources or earlier when it has at least two decision-relevant measured comparisons plus a directly relevant limitation, and further sources are repetitive.
2. Stop immediately for a source when original methods/results cannot be inspected. Retain it only as an explicit gap, not quantitative evidence.
3. Do not normalize, average, or rank across different models, datasets, prompt budgets, tool/retry budgets, graders, or accounting boundaries.
4. The final guide must give R1 measured effects under original conditions, R2 strongest counterevidence and transfer limits, and R3 operational selection rules, failure signals, and the paired local-evaluation artifact. If coverage is insufficient, state the unresolved technique/condition rather than filling it with a general recommendation.
5. Stop the overall research at the four bounded assignments and their evidence. No current-social-research expansion and no exhaustive-review claim.

## Planned report shape

1. Scope and decision boundary.
2. Evidence table grouped by technique family, retaining conditions and costs.
3. Counterevidence, regressions, and transfer limits.
4. Operational decision table: situation, candidate technique/scaffold boundary, expected benefit only under cited conditions, cost/risk, failure signal, and paired local check.
5. Concrete reusable evaluation artifact.
6. Retained-source appendix with every inspected original URL, what it supports, method/result fields, and limitations.

## Independent verification dispositions — 2026-09-07

**Method.** I re-read the persisted plan and all four retained streams, then independently retrieved the retained original papers and official Anthropic pages: [CoT](https://arxiv.org/html/2201.11903), [ReAct](https://arxiv.org/html/2210.03629v3), [Brittle ReAct](https://arxiv.org/html/2405.13966), [Reflexion](https://arxiv.org/html/2303.11366), [Tool Documentation](https://arxiv.org/html/2308.00675), [API-Bank](https://arxiv.org/html/2304.08244), [Plan-and-Act](https://arxiv.org/html/2503.09572), [Anthropic long-context experiment](https://www.anthropic.com/research/prompting-long-context), and [Anthropic agent-eval guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). Original source text was treated as evidence, not instructions.

| ID | Disposition | Independent check and required handling |
|---|---|---|
| R1 | **qualified** | Retain separately conditioned measurements: CoT source supports PaLM-540B GSM8K **17.9→56.9** under its reported standard/CoT prompts (and **58.6** only with an external calculator), ReAct Table 1 supports its PaLM-540B HotpotQA/FEVER figures and task reversal, Reflexion supports 91% HumanEval claim and 52% vs 60% Rust ablation, API-Bank supports 314 dialogues/753 calls and GPT-4 error shares, Plan-and-Act supports 9.85→29.63 and training/data confounds, and Anthropic supports the stated 70K/95K long-context result. Do not retain the selection stream's claim that the original CoT study reported **58.1% versus 17.9%**: 58.1 was not found; the inspected table gives 56.9 for CoT and 58.6 with calculator. Correct it before synthesis. Tool-documentation and brittle-ReAct numeric claims are retained only where the report preserves their exact table/harness conditions. Neither is a common leaderboard. |
| R2 | **supported with qualification** | Original sources directly support decisive constraints: CoT had small/negative easy-task and sub-100B effects; ReAct loses to CoT on HotpotQA while winning FEVER and its ALFWorld result selects among prompt variants; Reflexion unguided reflection regresses; ReAct tool/retrieval errors and API-Bank stage errors are distinct; long-context results vary by position/context/model. Treat vendor-authored Anthropic material as controlled vendor evidence, not independent replication. Do not claim cross-provider/current-model transfer or causal proof for Plan-and-Act prompt wording because architecture, fine-tuning, and synthetic data changed together. |
| R3 | **supported with qualification** | The paired artifact correctly fixes model, fixtures/state, prompt and tool snapshots, budgets, graders, trials, traces, success plus safety/cost/latency. Anthropic guidance directly supports pass@1/pass^k distinction, task/grader validation, transcript review, and tracking cost/token/latency. Its promotion thresholds and table recommendations are operational inferences, not measured as one package, and must remain labeled as such. |

### Decision-changing gaps and corrections

1. **G1 (R1, required correction):** Replace CoT 58.1 with the original table's 56.9 (or 58.6 only when explicitly including external calculator). Preserve five arithmetic-task table context, PaLM-540B, and greedy/few-shot conditions.
2. **G2 (R1/R2):** No retained matched modern-production comparison supplies comparable total per-accepted-task cost, latency, tokens, retries, and tool cost across techniques. State unavailable components as unknown, not zero.
3. **G3 (R2):** No retained independent replication establishes transfer of the legacy PaLM/GPT/Claude and synthetic/web-harness results to a current deployment. Local paired evaluation remains the resolution path.
4. **G4 (R1):** Tool Documentation's documentation-only equivalence and brittle-ReAct numerical examples require exact table verification in synthesis. The inspected retrieval confirmed the 200-tool/top-10 TF-IDF/600-word condition, but not the stream's 16-shot/12-shot numbers via text search. Do not foreground those two numbers unless rechecked against their original tables.

### Verification stop reason

Stopped after direct inspection of all nine retained original sources and decisive passages. The only detected material numerical mismatch is G1; G4 remains a bounded table-level confirmation gap. Further broad search would not resolve the deployment-specific, cross-harness cost and transfer gaps without a local paired experiment.


## Independent report validation — 2026-09-07

**Validator result: partial, corrections required.** I independently read the synthesis/reporting standard, REPORT.md, this ledger, state.json, and all four streams. I also retrieved the original [Tool Documentation paper](https://arxiv.org/html/2308.00675) directly. Its §4.1/Figure 4 explicitly supports the report’s documentation-only claim: performance was on par with 16-shot TabMWP and 12-shot NLVRv2. It also confirms the 200 renamed-GCP-command/50-question/TF-IDF-retrieval conditions. G4 is therefore resolved for the report’s narrowly stated claim.

### Acceptance checks

- **R1 — qualified:** REPORT.md answers the measured-effects question with original-source links, methods, comparators, outcomes, and applicability/cost limits. Quantitative results remain separated by harness. The CoT correction is preserved: 56.9% is the PaLM-540B GSM8K CoT result and 58.6% is calculator-assisted.
- **R2 — supported with qualification:** REPORT.md preserves within-study counterevidence, transfer limits, confounds, and missing comparable operating-cost evidence.
- **R3 — supported with qualification:** REPORT.md labels the operational table and paired local-evaluation artifact as inferences, specifies frozen conditions, final-state validation, safety/cost/latency accounting, and decision/rollback rules. No local experiment was represented as run.
- **Source and path checks:** material report claims have clickable original-source URLs, the retained-source appendix maps original URLs to method/results and limits, and REPORT.md local links to this ledger and all four supplied stream files exist without unverified heading fragments.

### Material validation failure

- **V1 — state/ledger coverage mismatch:** state.json remains in `phase: validation` with R1/R2/R3 all marked `unknown` because “Verifier control unavailable,” even though its assignment records mark every researcher, verifier, and synthesizer completed and this ledger/report contain their dispositions. This conflicts with the report’s coverage and actual stop reason. Update state.json coverage to the validated dispositions and record this validation result before treating the report as accepted.

### Actual validation stop reason

Stopped after complete read-back of the required persisted artifacts and direct resolution of the sole decisive table-level source gap (G4). No further original retrieval was needed because all remaining material report claims were already covered by the prior verifier’s direct-source dispositions or explicit qualifications. Validation cannot be accepted until V1 is reconciled by the workflow owner; the validator does not edit state.json.

## Final V1 revalidation

**FAILED.**

**Exact check:** Compared the independently validated coverage required for reconciliation (`R1: qualified`; `R2: supported with qualification`; `R3: qualified`) against current `state.json`. It records `R1: qualified`, `R2: supported`, and `R3: qualified`; therefore R2 is not an exact match. The state also records reconciliation metadata and `reportValidation: pending independent recheck`, but no actual validation stop reason. It consequently does not preserve the ledger's actual validation stop reason. No report or evidence text was altered by this revalidation.

**Stop reason:** Stopped after the requested targeted artifact read-back. No broad research was redone. Revalidation fails solely because state coverage and stop-reason reconciliation remain incomplete.

## Final V1 correction revalidation

**FAILED.**

**Exact checks:**
- R1 is exactly `qualified` in the validated ledger and current state.
- R2 is exactly `qualified` in current state, with its reason correctly preserving that the verifier support is only with qualification.
- R3 is exactly `qualified` in the validated ledger and current state.
- The ledger’s actual validation stop reason says validation stopped after complete artifact read-back and G4 resolution, with V1 awaiting workflow reconciliation. Current `state.json.stopReason` instead records the broader research/verification stop after four assignments and remaining local-evaluation gaps. It is not the actual validation stop reason. Current `reportValidation` also remains `failed`.

**Stop reason:** Stopped after targeted read-back of the prescribed rubric, REPORT.md, RESEARCH.md, and state.json. No research was redone. V1 remains unaccepted solely because the state does not reconcile the actual validation stop reason with the validated ledger/report.

## V1 closure revalidation

**ACCEPTED.**

**Exact checks:**
- R1 is `qualified` in the validated ledger and current state.
- R2 is `qualified` in current state, and its reason explicitly preserves that support is only with qualification because current-deployment transfer remains unmeasured.
- R3 is `qualified` in the validated ledger and current state.
- `state.json.stopReason` faithfully records the ledger’s actual validation stop: complete persisted-artifact read-back and direct resolution of G4, with no further original retrieval because remaining claims were covered by prior direct-source dispositions or explicit qualifications.
- `reportValidation` was treated as provisional and was not used to determine this result.

**Stop reason:** Stopped after the requested targeted artifact read-back and V1 reconciliation check. No research was redone.
