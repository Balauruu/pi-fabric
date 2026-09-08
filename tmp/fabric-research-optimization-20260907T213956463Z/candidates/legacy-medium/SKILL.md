---
name: research-orchestrator
description: Orchestrates multi-stream research for substantive decisions by deriving independent subagent assignments and reconciling primary sources, papers, benchmarks, field evidence, contradictions, and gaps. Use for deep research, investigations, literature or benchmark reviews, research-backed comparisons, evaluations or policies, or requests for multiple independent research agents or streams. Skip it when one authoritative source can answer the question, for a single-document summary or recent-social-only request.
compatibility: Requires Pi with subagent and subagent_message tools, an available research-capable agent, and web access. The last30days skill is optional and required only for a recent-field stream.
---

# Independent research orchestrator

Produce one precise answer from independently owned research streams. Design the research program before dispatch. Decompose by unresolved uncertainty, not by a reusable list of generic lenses.

## 1. Route the request

Use the smallest research process that can support the requested conclusion.

- For a stable fact answerable from one authoritative source, research directly without subagents unless the user explicitly requires independent streams.
- For a substantive investigation, comparison, literature review, benchmark review, evaluation, or research-backed decision, use independent streams.
- A user-specified stream count, assignment, source requirement, or output structure is authoritative. Honor exact counts and do not silently add, remove, merge, or replace streams. If the exact count is one, use one stream and state that it cannot provide independent triangulation.
- If the user supplies a detailed research program, complete and operationalize it rather than substituting this skill's defaults.

Ask one grouped clarification only when an unresolved answer would change the stream architecture, evidence standard, or final decision. Otherwise state the narrowest reasonable assumption and proceed.

## 2. Frame the research contract

Before dispatch, extract:

1. the exact question, decision, or artifact;
2. how the answer will be used and the consequence of error;
3. definitions, scope, exclusions, and time horizon;
4. criteria by which claims or alternatives will be judged;
5. evidence needed for each criterion;
6. causal or comparability constraints, including variables that must remain fixed;
7. the final report sections, tables, matrices, or appendices the evidence must support;
8. what would count as sufficient evidence, an explicit gap, or a blocked conclusion.

Do not pre-populate task categories, matrix rows, archetypes, or recommendations before research unless the user supplied them. Predeclare the output slots, not their conclusions.

**Complete when:** each stream can be derived from a distinct unresolved question and the final answer has a checkable evidence contract.

## 3. Derive independent streams

Map the uncertainties that must be resolved. Give one stream ownership of each independently answerable uncertainty.

When the user did not specify a count:

- use two or three streams for a focused comparison;
- use four or five for a decision spanning several evidence classes or disputed claims;
- use six to eight only when that many non-overlapping uncertainties materially affect the result;
- do not create more streams merely to increase source count.

Independence means streams do not share intermediate conclusions and do not delegate further. They may study the same object only when they use meaningfully different methods, evidence classes, or adversarial hypotheses.

Useful stream forms include official facts, controlled benchmarks, reproducible field evaluations, research papers, economics, implementation or operations, historical evidence, current field signals, and adversarial counterevidence. These are examples, not mandatory lenses.

Add a current-field stream only when recency, practitioner experience, regressions, sentiment, or fast-changing conditions matter. Only that stream loads `last30days`. The skill's availability is not a reason to add the stream. Do not force recent social evidence into stable or historical questions.

For high-consequence decisions, ensure at least one stream actively seeks disconfirming evidence unless the user already assigned an equivalent stream.

**Complete when:** every stream has a unique uncertainty, all decision criteria are covered, and no two streams would perform the same search for the same purpose.

## 4. Write stream contracts

Read [stream contracts](references/stream-contracts.md) before dispatch. Give each subagent a self-contained assignment containing:

- the central question and intended final decision;
- its unique uncertainty and why it matters;
- definitions, scope, exclusions, and time horizon;
- criteria and output slots it must inform;
- source priorities and required methodology;
- variables or harness details that must remain comparable;
- stream-specific deliverables;
- shared evidence rules;
- a stopping rule based on evidence saturation;
- an instruction not to launch subagents or modify files.

Do not send every agent a generic request to “research the topic.” Do not ask a stream to make the final cross-stream decision.

Require concise evidence ledgers rather than unbounded prose. Tell agents to prioritize decisive sources and return gathered evidence once additional browsing stops changing the conclusion.

## 5. Dispatch once

Call `subagents_list` once and confirm that a research-capable agent is available. If unavailable, report the blocker rather than simulating fan-out.

Create a dispatch ledger with one unique name per stream. Launch every stream in the same turn with `agent: "researcher"`; use the parallel wrapper when available. The number launched must equal the planned count exactly.

After dispatch, end the turn or perform only synthesis preparation independent of pending results. Never poll, sleep, inspect session files, or assume results. The harness delivers each return.

## 6. Account for every return

Do not synthesize until every dispatch-ledger entry has returned or has a disclosed terminal failure.

For each return, verify that it contains its assigned conclusion, direct sources, source types and dates, methods for measurements, contradictions, confidence, and explicit gaps.

- If a return misses required fields, message that same subagent once with a precise completion request.
- If a subagent fails, resume the same named session once with a narrower task and instruct it to return evidence already gathered rather than restart broadly.
- After a second failure, mark the stream unavailable. Do not spawn a replacement when the user required an exact number of independent subagents.
- If a stream finds a gap inside its assignment, follow up with that same session rather than creating an unplanned stream.
- If the user reports that agents are overdue, steer the running agents once to stop browsing and return concise results from evidence already gathered.
- A current-field return is valid only when it shows that `last30days` ran and preserves its required badge and engine footer. If `last30days` is unavailable, disclose the missing stream; do not silently substitute ordinary social search unless the user approves it.

Continue with missing evidence only when the remaining streams can still support a bounded conclusion. Otherwise state the blocker.

## 7. Reconcile before writing

Read [synthesis and reporting](references/synthesis-and-reporting.md). Build a claim ledger before prose.

For every material conclusion:

1. identify the strongest supporting and contradicting evidence;
2. trace apparently independent sources back to their origin;
3. separate documented fact, measurement, sourced claim, inference, and recommendation;
4. check task, dataset, harness, model or system, date, metric, sample, and evaluator before comparing numbers;
5. explain conflicts rather than silently selecting one result;
6. mark unmeasured combinations `unknown` or use the user's required gap phrase;
7. verify decisive or disputed claims against exact primary passages with `source_check` or direct retrieval when available.

Source count is not consensus. Social engagement measures attention, not truth. A benchmark average does not establish production reliability, and an advertised capacity does not establish usable performance.

Derive final categories and matrix dimensions only after reviewing the evidence. Recommendations must be no broader than the evidence that supports them.

## 8. Report to the contract

The user's requested output owns the final structure. Otherwise scale the report to the decision:

- **Focused:** answer, decisive evidence, limitations, sources.
- **Comparative:** recommendation, criterion-by-criterion comparison, disagreements, unknowns, sources.
- **Decision-grade:** executive decision, evidence-derived matrices, operational rules, quantitative comparison, local validation plan, uncertainties, and a complete source appendix.

State the research date and list the number and scopes of streams in one concise line. Synthesize rather than concatenate subagent reports.

For decision-grade work, end with:

1. what to adopt now;
2. the strongest supporting evidence;
3. the highest-impact uncertainties;
4. the exact measurements that could change the decision.

## Completion gate

Finish only when:

- the research contract and final output slots are satisfied;
- every planned stream is accounted for;
- any required current-field stream demonstrably ran `last30days`;
- every material external claim has a direct URL;
- source type, date, method, conflicts, and evidence gaps are visible;
- quantitative comparisons pass the comparability gate;
- inference and recommendation are not presented as measurement;
- decisive disputed claims were checked against exact sources where possible;
- the final recommendation is proportional to the evidence;
- the report names what evidence or local measurement could overturn it.
