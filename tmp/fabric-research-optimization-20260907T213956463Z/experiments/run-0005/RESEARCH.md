# Research dossier

## Brief
Produce a decision-grade research-backed operating policy for improving tool-using coding-agent performance WITHOUT changing the model or reasoning effort. R1: What evidence distinguishes context selection, tool interfaces, task contracts, parallelism and recovery interventions, including actual results and methods? R2: Where do more context, more agents, retries or self-critique fail, and what cannot transfer to current GPT-5.6 Terra? R3: Which observed failure should trigger which intervention, with validation and stop conditions? R4: What exact fixed-model paired evaluation could change the recommendation, including accepted-task quality, wall time and failure accounting? Use primary inspected sources and null/regression evidence, retain measured values with conditions, provide a failure-to-intervention matrix and usable evaluation checklist, and a complete source appendix. Research date 2026-09-07. No universal effect sizes or unmeasured performance claims.

Research date: 2026-09-07. Persisted trial output.

## Required questions
- R1: distinguish interventions with methods and measured outcomes.
- R2: identify failure/regression boundaries and GPT-5.6 Terra transfer limits.
- R3: map observed failure to intervention, validation and stop conditions.
- R4: specify a fixed-model paired evaluation.

## Assignment index
- context-tools-contracts: R1 → [stream](streams/context-tools-contracts.md)
- parallelism-recovery-failures: R1, R2, R3 → [stream](streams/parallelism-recovery-failures.md)
- fixed-model-evaluation: R2, R4 → [stream](streams/fixed-model-evaluation.md)

## Verification
In progress. See [state.json](state.json) for execution accounting.


## Verification reconciliation — 2026-09-07

**Independent inspection scope.** Read the governing synthesis reference, this dossier, `state.json`, and every named nonempty saved stream: [context-tools-contracts](streams/context-tools-contracts.md), [parallelism-recovery-failures](streams/parallelism-recovery-failures.md), and [fixed-model-evaluation](streams/fixed-model-evaluation.md). The streams contain only launch-block messages, not source notes, URLs, methods, results, counterevidence, or retrieved original support. `state.json` records all three researcher assignments as native-completed but their probes say `agents.run` was blocked at Fabric agent-depth limit 2. Execution completion is therefore not evidence adequacy.

### Claim dispositions

| Claim group | Disposition | Reconciliation |
|---|---|---|
| Context selection, tool interfaces, and task contracts improve coding-agent performance | Unknown | No inspected primary source, method, comparator, metric, or result was saved. |
| Parallelism, retries, recovery, or self-critique have measured benefits or regressions | Unknown | No saved evidence supports either effect, failure boundary, or stop rule. |
| Any literature finding transfers to current GPT-5.6 Terra at fixed reasoning effort | Unknown | No direct Terra evaluation or comparable inspected source was saved. |
| A fixed-model paired evaluation can be specified from evidence | Qualified | The governing reference supplies methodological requirements, not empirical efficacy: pair representative tasks; hold model, reasoning effort, scaffold, tools, budgets and validator fixed; measure final-state accepted-task quality, wall time, retries/loops and all failures; and predeclare a decision rule. It does not establish a sample size, threshold, or recommended intervention. |

### Requirement-level coverage

| ID | Disposition | Checked coverage and gap |
|---|---|---|
| R1 | Blocked | No original inspected support distinguishes context selection, interfaces, contracts, parallelism, or recovery, and no results or methods exist in the saved streams. |
| R2 | Blocked | No null/regression evidence or direct GPT-5.6 Terra transfer evidence was saved. |
| R3 | Blocked | No observed failure-to-intervention evidence exists, so a failure matrix, validation rule, or intervention stop condition would be invented. |
| R4 | Qualified | A non-empirical checklist is supported by the inspected synthesis guidance: paired representative tasks, fixed variables, deterministic final-state acceptance where possible, accounting for accepted tasks, wall time, retries/loops, out-of-scope work, reviewer defects, and token/tool/total cost; screen then repeat finalists or close results; predeclare the observable rule that changes the decision. Task set, repetitions, thresholds, and intervention recommendation remain unestablished. |

### Gaps and decision impact

No operating policy recommendation, measured value, universal effect size, intervention matrix, or complete source appendix is supportable from this experiment. The required matrix must remain absent rather than convert unobserved failures into triggers. The only inspected source appendix entry is the local [Synthesis and reporting reference](../../candidates/baseline-medium/references/synthesis-and-reporting.md), a methodology reference rather than primary performance evidence.

**One decision-changing repair request (R1).** Independently retrieve and save a bounded primary-evidence note for one comparator in each R1 class (context selection, tool interface, task contract, and either parallelism or recovery), including original URLs, decisive locators, task/dataset and version, fixed model/scaffold/tools/reasoning conditions, intervention and comparator, validator and denominator, measured result, and one null/regression or explicit absence per class when available. Stop after these four class records are inspected or after authoritative original sources cannot be accessed, recording the access gap. Do not claim transfer to GPT-5.6 Terra. This would determine whether any intervention can enter a policy rather than remain unknown.

**Actual stop reason.** Verification stopped because all three assigned research launches hit Fabric's agent-depth limit before research retrieval. The persisted corpus has no substantive external evidence; not because evidence saturation, a completed research phase, or a negative empirical result.


## Reverification reconciliation — 2026-09-07

**Scope and evidence boundary.** Re-read the governing local synthesis reference, this dossier, `state.json`, and all four nonempty saved streams, including the R1 repair stream. The three initial streams are launch-block messages. The repair stream is also blocked and cites only local methodology references, not a retrieved primary source. No original external source, method, comparator, validator, result, null/regression finding, or Terra-specific measurement is present in the persisted evidence. Native assignment completion is not treated as research success.

### Claim dispositions

| Claim group | Disposition | Inspected support and limit |
|---|---|---|
| Context selection, tool interfaces, task contracts, parallelism, or recovery improve performance | Unknown | No saved primary evidence identifies an intervention, comparator, task, metric, validator, or result. |
| More context, more agents, retries, or self-critique have a measured failure boundary | Unknown | No saved null, regression, or counterevidence supports an effect or a trigger. |
| Any finding transfers to GPT-5.6 Terra at fixed reasoning effort | Unknown | The state identifies the configured model and effort, but contains no evaluated Terra result or comparable source. |
| A fixed-model paired evaluation is methodologically specified | Qualified | The inspected local methodology supports holding model, reasoning effort, scaffold, tools, budgets, and validator fixed; using representative paired tasks and final-state acceptance; accounting for accepted tasks, wall time, retries/loops, out-of-scope work, reviewer defects, and token/tool/total cost; and predeclaring a decision rule. It does not support a threshold, sample size, or intervention choice. |

### Requirement-level coverage

| ID | Disposition | Reverified coverage and gap |
|---|---|---|
| R1 | Blocked | No original inspected evidence distinguishes any requested intervention class, supplies methods/results, or supplies required null/regression evidence. |
| R2 | Blocked | No measured boundary for additional context, agents, retries, or self-critique, and no Terra transfer evidence, was saved. |
| R3 | Blocked | Apart from the workflow's retrieval failure, no observed coding-agent failure supports a performance intervention matrix, validation rule, or stop condition. The repair stream's retrieval-access row is not evidence for an agent-performance policy. |
| R4 | Qualified | A usable non-empirical paired-evaluation checklist is supported by the local methodology reference, but representative task set, repetitions, thresholds, and a recommendation-changing intervention remain unestablished. |

### Gaps, repair status, and stop reason

No decision-grade operating policy, measured values, failure-to-intervention matrix for coding-agent performance, or complete primary-source appendix can be supported. The prior bounded R1 repair was attempted and saved as blocked; `state.json` records `repairsRemaining: 0`, so no further repair is issued. The only source appendix entries remain local methodology references, which govern verification and evaluation design rather than demonstrate performance.

**Actual stop reason.** The initial three research assignments and the subsequent R1 repair could not retrieve evidence because their nested agent runs hit Fabric's agent-depth limit of 2. The repair stream additionally reports unavailable direct web retrieval, but that availability assertion is unverified worker content. Work stopped for retrieval failure and exhausted repair allowance, not evidence saturation or a negative empirical finding.


## Independent report validation — 2026-09-07

**Report acceptance: Accepted as an evidence-blocked report.** Independent validation re-read all four saved streams, the governing synthesis reference, this ledger, `state.json`, and `REPORT.md`. The report does not convert worker completion, model availability, or retrieval failure into coding-agent performance evidence. It preserves the absence of primary results, methods, comparators, validators, measured values, and null/regression evidence, and confines its recommendation to non-adoption pending evidence.

### Requirement dispositions

| ID | Disposition | Validation finding |
|---|---|---|
| R1 | Blocked | No inspected primary comparator, method, result, validator, denominator, or measured value distinguishes context selection, tool interfaces, task contracts, parallelism, or recovery. |
| R2 | Blocked | No inspected null/regression evidence establishes a boundary for more context, agents, retries, or self-critique. No Terra-specific result permits transfer. |
| R3 | Blocked | No observed coding-agent failure supports an intervention trigger. The report correctly limits its sole matrix row to retrieval remediation and labels it non-policy evidence. |
| R4 | Qualified | The local methodology reference supports the fixed-model paired checklist, including final-state accepted-task quality, wall time, and comprehensive failure accounting. It does not set a task set, threshold, sample size, or preferred treatment. |

### Checks and material failed evidence checks

- **Local links: passed.** `REPORT.md` links to this ledger, `state.json`, the four named streams, and the local synthesis reference. Each target was read during this validation. No heading fragments are used.
- **Original-source URLs: none exist to validate.** The corpus contains no retained external original-source URL or inspected performance source. The report's source appendix explicitly records that absence rather than presenting local control records as primary evidence.
- **Report content gates: passed for an evidence-blocked disposition.** The report answers R1–R4 at the available evidence boundary, states null/regression evidence is absent, distinguishes local methodology from empirical evidence, gives a bounded retrieval-failure matrix, and provides a usable but non-empirical paired-evaluation checklist.
- **Material failed check: primary-evidence acquisition failed.** This is a corpus/evidence failure, not a report defect: no primary comparator records, measured outcomes, or null/regression findings were saved. The resulting policy remains blocked and no coding-agent intervention is accepted.

### Actual stop reason

Work stopped because the three initial nested research launches and the single R1 repair each recorded `Fabric agent depth limit reached (2)` before external retrieval. `state.json` records the repair allowance as exhausted. The repair stream's claim that direct web actions were unavailable is retained only as unverified worker content and is not needed to establish the stop reason. This is access/budget exhaustion, not evidence saturation or a negative performance result.

**Validation outcome:** `verification: partial`; `reportValidation: passed`. No report correction is requested. The decision-changing gap remains four inspected primary comparator records, one for each R1 class, with methods, results, validators/denominators, and null/regression evidence or explicit absence.
