# Measured techniques

## Status

**Blocked.** The required nonbrowser web-retrieval tools (`web_search`, `fetch_content`, and `get_search_content`) were not available in this session. No original study was retrieved or inspected. I therefore cannot responsibly report quantitative technique effects, source locators, or an as-of-2026-09-07 evidence base.

## Requirement contract

| ID | Exact question | Required inclusions | Expected contribution | Decision context |
|---|---|---|---|---|
| R1 | Which prompt and scaffold/context techniques have measured effects for production text, reasoning, and tool-using LLMs, with exact task, model, comparator, results, method, and measured compute/cost where available? | original inspected sources; quantitative results under original conditions; task, model, comparator, method; reported compute or cost | Measured-technique evidence and operational decision table. | Select production interventions without unsupported transfer. |

## Decision rule

Do not adopt or rank prompting or scaffold patterns from unverified benchmark recollection. Each candidate requires an inspected original source and a paired local evaluation under the deployed model snapshot, tools, latency policy, context budget, and evaluator.

| Intervention class | Adoption status | Minimum evidence needed |
|---|---:|---|
| Text formatting, examples, role/instruction patterns | Unassessed | Paired task results, prompt-token cost, output-token cost, quality evaluator |
| Reasoning scaffolds, decomposition, sampling/re-ranking | Unassessed | Accuracy and failure rate, sample count, token and latency distribution, aggregation method |
| Tool-use instructions, plans, retrieval/context structure, retries | Unassessed | End-to-end task success, invalid-action rate, tool calls, retry budget, wall time, cost |
| Persistent context or memory scaffolds | Unassessed | Task quality plus contamination, stale-context, truncation, and context-cost measurements |

## Reusable paired evaluation artifact

```markdown
# Prompt/scaffold evaluation record

Candidate:
Model provider and immutable snapshot:
Task population and version:
Production tool environment and fixture version:
Baseline prompt/scaffold:
Candidate prompt/scaffold:
Context limit, output limit, temperature, seed policy:
Tool permissions, retry policy, timeout:

| Metric | Baseline | Candidate | Delta | Uncertainty / repetitions |
|---|---:|---:|---:|---:|
| Task success / quality | | | | |
| Critical-error rate | | | | |
| Invalid tool-action rate | | | | |
| Median / p95 latency | | | | |
| Input tokens | | | | |
| Output tokens | | | | |
| Tool calls / retries | | | | |
| Measured provider cost | | | | |

Evaluator and adjudication protocol:
Known failure slices:
Transfer limits:
Decision: adopt / reject / conditional trial
```

## Counterevidence and transfer constraints

No negative finding can be claimed from the unavailable corpus. The local evaluation must specifically test:

1. **Model transfer:** a pattern’s effect may change across model families or snapshots.
2. **Task transfer:** benchmark reasoning gains may not improve production text generation or tool execution.
3. **Budget transfer:** multi-sample, retry, retrieval, and long-context scaffolds can improve a quality metric while worsening cost, latency, or tail reliability.
4. **Evaluator transfer:** automated grading can miss policy violations, malformed tool calls, and operationally harmful but plausible answers.
5. **Context interaction:** retrieved, persistent, or example context can become stale, irrelevant, truncated, or prompt-injection-bearing.

## Coverage and gaps

| Requirement | Status | Smallest useful next check | Stop reason |
|---|---|---|---|
| R1 — measured technique effects with original conditions and compute/cost | Blocked | Restore nonbrowser search and fetch access, then inspect original papers and benchmark reports for each candidate technique. | Required retrieval providers were unavailable; no original sources were inspected. |
| R2 — counterevidence, regressions, and transfer limits | Unknown | Retrieve original ablations and negative-result studies alongside positive papers. | No evidence corpus was accessible. |
| R3 — selection rules, failure signals, and paired local evaluation | Qualified | Apply the supplied paired evaluation record to representative production fixtures. | The protocol is actionable, but technique-specific rules require retrieved evidence. |

## Retained-source appendix

- Local supplied governing request: [`researcher.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/researcher.md). Inspected. It specifies the evidence and reporting standard, not empirical findings.