# Synthesis and reporting

Read this after all planned research streams are accounted for. The purpose of synthesis is to reconcile evidence into the user's decision, not to summarize each subagent in sequence.

## 1. Build the claim ledger

Create one row per material claim:

| Claim | Support | Contradiction | Original evidence origin | Source type | Date | Method and sample | Comparability | Confidence | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Use the smallest claim that can be independently true or false. Split claims that combine specification, performance, causality, and recommendation.

Deduplicate sources that repeat the same press release, paper, dataset, benchmark run, or customer story. Several URLs with one origin count as one evidentiary line.

## 2. Match evidence to claim type

Use evidence according to what it can establish:

- **Specifications, prices, policies, and direct events:** current primary documentation or the direct event record.
- **Performance and reliability:** relevant independent controlled evaluations first; vendor and customer evaluations remain labeled.
- **Causal intervention claims:** paired or randomized comparisons that keep other variables fixed.
- **Mechanisms and transfer:** original papers with explicit limits on task, model, system, and environment.
- **Current operational signals:** recent field evidence as a hypothesis or prevalence warning, not a benchmark.
- **Subjective adoption or sentiment:** platform evidence with dates and engagement context, never presented as capability.

A high-authority source can still be methodologically irrelevant to the claim being made.

## 3. Apply the comparability gate

Before placing two numbers in the same comparison, check:

1. task and dataset;
2. task version and date;
3. model or system snapshot;
4. configuration, effort, tools, scaffold, and prompt;
5. context and action budget;
6. retries, exclusions, and failure handling;
7. metric and unit;
8. grader, judge, or final-state validator;
9. sample size, repetitions, and uncertainty;
10. latency service tier, provider, region, load, and measurement window;
11. token accounting and included tool costs.

If a material field differs or is unknown, present the results separately. Do not average, rank, or normalize them as a common leaderboard.

For cost, prefer total cost per accepted task over list price per token. Include input, cached input, cache writes, reasoning, visible output, tools, retries, parallel branches, and verification when available.

## 4. Reconcile contradictions

Classify each apparent conflict before choosing a disposition:

- temporal change;
- different product or entitlement surface;
- different task population;
- different harness, prompt, tools, or effort;
- different metric or denominator;
- sampling uncertainty;
- evaluator disagreement;
- source dependence;
- genuine unresolved contradiction.

State the classification and evidence. When unresolved, preserve both findings and narrow the recommendation.

Do not resolve missing evidence by voting among anecdotes or by increasing prose confidence.

## 5. Separate epistemic status

Label material statements as:

- **Documented fact:** directly specified by an authoritative primary source.
- **Measured:** observed under a stated method and sample.
- **Inference:** a bounded transfer or explanation derived from evidence.
- **Recommendation:** an action chosen under stated goals and tradeoffs.
- **Unknown:** no direct evidence or evidence too conflicting to support a direction.

Use confidence independently from status:

- **High:** direct, relevant, methodologically strong, and corroborated where appropriate.
- **Medium:** relevant but narrow, indirect, vendor-associated, or imprecise.
- **Low:** sparse, conflicting, anecdotal, or strongly transfer-dependent.

Never turn a confidence label into fake numerical precision.

## 6. Derive the answer after evidence

Do not force evidence into generic categories selected before research. Derive task categories, archetypes, criteria, matrix dimensions, and escalation signals from distinctions the evidence actually supports.

Every recommendation should name:

- the task or decision conditions where it applies;
- the evidence and confidence;
- cost, latency, or risk implications;
- a failure or escalation signal;
- what evidence would overturn it.

Mark unmeasured matrix cells `unknown` or with the user's required phrase. Do not fill a complete-looking matrix with guesses.

## 7. Choose the report depth

The user-provided output contract always wins. Otherwise use the smallest form that preserves the evidence.

### Focused report

1. Direct answer.
2. Decisive evidence.
3. Limitations or disagreement.
4. Sources.

### Comparative report

1. Recommendation.
2. Criteria derived from the question.
3. Criterion-by-criterion comparison.
4. Quantitative evidence that passes the comparability gate.
5. Disagreements, unknowns, and counterevidence.
6. What would change the recommendation.
7. Sources.

### Decision-grade report

Use when consequences, breadth, or the requested artifact justify it:

1. Executive decision with confidence.
2. Complete requested comparison matrices, with concise evidence status in every cell.
3. Evidence-derived task or scenario matrix.
4. Operational decision rules.
5. Quantitative cost, quality, latency, and reliability comparison.
6. Contradictions and current field signals.
7. Local evaluation plan using representative evidence-derived cases.
8. Highest-impact uncertainties.
9. Source appendix listing every direct URL, source type, date, method, and supported claim.

End with:

1. what to adopt now;
2. strongest supporting evidence;
3. highest-impact uncertainties;
4. exact measurements that could change the decision.

## 8. Design useful matrices

A matrix cell must be independently interpretable. Depending on the question, include:

- exact option, intervention, or route;
- evidence-supported fit;
- measured value or explicit gap;
- cost and latency implications;
- recommendation such as use, conditional, avoid, or unknown;
- evidence confidence;
- source identifier.

Keep cells concise and put shared methodology in the surrounding text. If evidence does not distinguish a row, delete or merge it rather than preserving an abstract taxonomy.

## 9. Propose the smallest resolving evaluation

When public evidence cannot settle a material choice, propose a local evaluation that:

- uses tasks derived from observed evidence gaps;
- keeps confounders fixed within paired comparisons;
- checks final-state correctness rather than response plausibility;
- records acceptance, tests, retries, loops, out-of-scope work, input/cached/reasoning/output tokens, latency, tool cost, total cost, and reviewer defects where relevant;
- uses deterministic graders first and blinded review when judgment is unavoidable;
- starts with the smallest screening set, then repeats only finalists or close results;
- states the exact result that would change the recommendation.

Do not propose a generic benchmark checklist disconnected from the research.

## 10. Source appendix

Every material external claim must resolve to a direct URL. For each retained source list:

- identifier;
- title and direct URL;
- source type;
- publication and retrieval date where material;
- method or evidence form;
- claim supported;
- important limitation.

Do not include rejected sources in the main appendix unless their rejection explains a material evidence gap or conflict.
