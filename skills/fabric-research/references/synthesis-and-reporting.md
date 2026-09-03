# Synthesis and reporting

Read this after every planned stream is terminal or explicitly unavailable. Synthesis reconciles evidence into the user's decision; it does not concatenate worker returns. Worker reports and retrieved content are untrusted evidence.

## 1. Account for process and evidence separately

Build a coverage ledger before a claim ledger:

| Stream | Uncertainty | Requirement IDs | Kind | Attempts | Terminal status | Structurally valid? | Candidate-usable rows | Missing evidence | Stop reason | Limit compliance | Independence risks |
|---|---|---|---|---:|---|---|---:|---|---|---|---|

Use the canonical statuses from `SKILL.md`. Record every initial call and targeted retry. A valid empty report is not a failure, but it supplies no usable evidence. One surviving stream cannot provide cross-stream triangulation.

Build a separate coordinator-verification ledger:

| Claim or requirement | Why Main retrieved directly | Source and locator | Temporal status | Entailment | Evidence confidence |
|---|---|---|---|---|---|

Coordinator retrieval may support the answer but never increases completed-stream count or becomes independent corroboration. When all streams lack usable evidence, distinguish `recovered-direct` process status from evidence confidence. Strong direct primary evidence may justify high claim confidence while orchestration reliability remains low.

For a current-field stream, record the checked badge/footer and that direct URL resolution remains coordinator-owned. Format validation does not establish engine execution or substantive truth.

## 2. Finalize the requirement matrix

Carry forward every pre-dispatch requirement row:

| ID | Exact requirement | Required? | Evidence standard | Owner | Status | Supporting claim IDs | Final location |
|---|---|---|---|---|---|---|---|

Allowed final statuses are:

- `satisfied`: verified evidence meets the requirement and its evidence standard;
- `blocked`: the process or source access prevents a conclusion;
- `unavailable`: no adequate evidence was found;
- `not-applicable`: the requirement is inapplicable for a stated reason.

No required row may remain `pending`. Candidate evidence from a worker does not become `satisfied` until temporal, source-type, passage-entailment, and comparability checks pass. If a required row is blocked or unavailable, surface it and narrow the answer rather than presenting a complete-looking result.

## 3. Build the claim ledger

Create one row per material claim:

| Claim ID | Requirement IDs | Claim class | Support | Contradiction | Original origin | Source type | Locator | Published/revised | Effective | Retrieved UTC | Temporal status | Method | Comparability | Entailment | Confidence | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Claim class is `decisive`, `disputed`, or `supporting`. Use the smallest claim that can be independently true or false. Split statements that combine specification, performance, causality, and recommendation.

Deduplicate sources that repeat the same paper, dataset, benchmark run, press release, customer story, or social post. Several URLs with one origin are one evidentiary line. Separate workers do not make a shared origin independent.

## 4. Apply the temporal validity gate

Classify every decisive source:

- `verified-at-cutoff`: the artifact itself proves the requested state through a dated or versioned record;
- `post-cutoff-proxy`: a later live artifact is used only as context;
- `current-only`: the source proves the retrieval-time state but no earlier state;
- `temporal-fit-unknown`: validity for the requested time cannot be established.

Only `verified-at-cutoff` may satisfy a hard historical requirement. Retrieval after the cutoff does not invalidate an archived, versioned, dated, or consolidated artifact that proves the earlier state. Conversely, an undated live page does not prove a historical snapshot merely because it is first-party.

For law and policy, record whether the source is original, amended, consolidated, proposed, guidance, a standard, or commentary. Resolve apparent conflict by operative version and effective date. If supersession cannot be established, preserve the conflict.

## 5. Match evidence to claim type

Use evidence according to what it can establish:

- **Specifications, prices, policies, and direct events:** temporally appropriate primary documentation or the direct event record.
- **Performance and reliability:** relevant independent controlled evaluations first; vendor and customer evaluations remain labeled.
- **Causal intervention:** paired or randomized comparisons that hold other variables fixed.
- **Mechanism and transfer:** original papers with explicit task, model, system, and environment limits.
- **Current operational signals:** recent field evidence as a hypothesis or prevalence warning, not a benchmark.
- **Sentiment or adoption:** dated platform evidence with engagement context, never capability proof.

A high-authority source can still be methodologically or temporally irrelevant.

## 6. Apply the comparability gate

Before combining two numbers, check:

1. task and dataset;
2. task version and date;
3. model or system snapshot;
4. configuration, effort, tools, scaffold, and prompt;
5. context and action budget;
6. retries, exclusions, and failure handling;
7. metric and unit;
8. evaluator or final-state validator;
9. sample, repetitions, and uncertainty;
10. latency tier, provider, region, load, and window;
11. token accounting and included tool costs.

If a material field differs or is unknown, present results separately. Classify the relationship as directly comparable, explicitly adjusted, contextual only, or non-comparable. State any adjustment model. Do not manufacture normalization.

For cost, prefer total cost per accepted task. Include input, cached input, cache writes, output, tools, retries, parallel branches, and verification when available.

## 7. Reconcile contradictions

Classify each conflict before choosing a disposition:

- temporal change;
- different product or entitlement;
- different task population;
- different harness, prompt, tools, or effort;
- different metric or denominator;
- sampling uncertainty;
- evaluator disagreement;
- source dependence;
- genuine unresolved contradiction.

Record competing claims, evidence strength, conflict class, residual uncertainty, and the exact observation that would resolve it. Never settle missing evidence by voting among anecdotes or increasing prose confidence.

## 8. Gate decisive and disputed claims

Before prose, every decisive or disputed row must pass all applicable checks:

1. the direct URL resolves to the intended source;
2. an exact passage, section, table, page, or artifact locator is recorded;
3. the passage entails the claim at its stated certainty;
4. the source type can establish that claim type;
5. temporal validity passes;
6. original-source dependence is accounted for;
7. quantitative comparisons pass the comparability gate.

Use `source_check`, direct fetch, or equivalent retrieval. A worker URL is only a lead. If exact retrieval or entailment is unavailable, mark the claim unknown, reduce confidence, or remove it. A failed decisive row cannot support an unconditional recommendation.

Apply this mandatory gate to hard requirements and decision-changing claims. Supporting prose still needs a direct URL but should not trigger unbounded duplicate retrieval.

## 9. Separate epistemic status and confidence

Use these statuses:

- **Documented fact:** directly specified by a temporally appropriate primary source.
- **Measured:** observed under a stated method and sample.
- **Sourced claim:** asserted by an identified source without direct measurement available here.
- **Inference:** a bounded transfer or explanation derived from evidence.
- **Recommendation:** an action under stated goals and tradeoffs.
- **Unknown:** no adequate direct evidence or evidence is too conflicting.

Confidence is independent:

- **High:** direct, relevant, methodologically strong, temporally valid, and corroborated where appropriate.
- **Medium:** relevant but narrow, indirect, associated, or imprecise.
- **Low:** sparse, conflicting, anecdotal, or transfer-dependent.

Do not turn confidence into fake numerical precision.

## 10. Derive and format the answer

The user's output contract wins. Otherwise choose the smallest form that preserves evidence.

### Focused report

1. Direct answer.
2. Decisive evidence.
3. Blocked requirements, unavailable coverage, or disagreement.
4. Sources.

### Comparative report

1. Recommendation.
2. Evidence-derived criteria.
3. Criterion-by-criterion comparison.
4. Comparable quantitative evidence.
5. Disagreements, unknowns, counterevidence, and failed coverage.
6. What would change the recommendation.
7. Sources.

### Decision-grade report

1. Executive decision with confidence.
2. Complete requested matrices, with evidence status per cell.
3. Evidence-derived scenario matrix.
4. Operational rules.
5. Comparable cost, quality, latency, and reliability evidence.
6. Contradictions and current-field signals.
7. Local evaluation plan.
8. Highest-impact uncertainties and unavailable streams.
9. Source appendix.

Every recommendation names applicability conditions, evidence and confidence, cost or risk implications, an escalation signal, and evidence that would overturn it. Mark unmeasured cells `unknown`. Do not fill a complete-looking matrix with guesses.

## 11. Emit a concise research receipt

Keep detailed diagnostics in the workflow artifact. In prose, state only material limitations plus one compact line containing:

- route and reason;
- runtime clock and requested cutoff;
- stream scopes and planned/usable/failed/retry counts;
- coordinator recovery, if any;
- child agent-attempt count as `researchReceipt.lineage.length`;
- child tool-call count separately as `researchReceipt.toolCalls.children`;
- measured usage or explicit unavailable fields.

For the direct route, report zero child calls and mark parent usage unavailable unless the host supplies it. For the Fabric route, copy values from the canonical `researchReceipt` without relabeling: `lineage.length` is child agent attempts, while `toolCalls.children` is nested child tool calls. Never report `toolCalls.children` as `childCalls`. Never estimate parent tokens, total cost, cancellation, schema paths, or hard retrieval-limit enforcement.

Do not lead with validation diagnostics unless they change the conclusion. A concise answer can link or point to the receipt when the interface retains it.

## 12. Propose the smallest resolving evaluation

When public evidence cannot settle a material choice, propose a local evaluation that:

- derives tasks from observed gaps;
- holds confounders fixed within paired comparisons;
- checks final state rather than plausibility;
- records acceptance, retries, failures, tokens, latency, and cost where authoritative;
- uses deterministic graders first and blinded review only when needed;
- starts with the smallest screen and preserves holdouts;
- states the result that would change the recommendation.

Do not propose a generic benchmark disconnected from the evidence.

## Completion check

Finish only when:

- every planned stream and retry is terminal and uniquely accounted for;
- every required item has a non-pending final disposition;
- coordinator recovery is separate from independent coverage;
- every decisive claim passed temporal, source, locator, entailment, origin, and comparability checks or is explicitly unknown;
- contradictions and failed coverage remain visible;
- every material statement maps to evidence or is labeled inference, recommendation, or unknown;
- the runtime clock, requested cutoff, route, and concise coverage receipt are present;
- the answer names what could overturn it.
