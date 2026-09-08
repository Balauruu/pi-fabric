# Counterevidence-transfer

## Status

**Blocked for evidence collection.** As of 2026-09-07, the required nonbrowser retrieval actions (`web_search`, `fetch_content`, `get_search_content`) are not registered in this session. No external source was inspected, so this note makes no empirical effectiveness claims.

## Requirement contract

| ID | Exact question | Required inclusions | Report contribution | Decision context | Status |
|---|---|---|---|---|---|
| R2 | What strongest counterevidence, regressions, and model/task transfer limits constrain adoption of prompt techniques? | negative or mixed findings; regressions and failure modes; transfer limits | Limits that bound recommendations. | Avoid universal rankings. | **Blocked** |

## Production decision rule pending evidence

Do not promote a prompt or scaffold based on another model, benchmark, tool environment, or context budget. Treat every proposed technique as a local intervention requiring a paired evaluation against the current baseline.

| Change class | Likely transfer boundary to test | Regression signals | Required local comparator |
|---|---|---|---|
| Reasoning traces, decomposition, self-consistency | Model family/version, task type, output-token budget | lower exactness, verbosity/cost increase, answer leakage, format failures | Baseline prompt under equal token, latency, retry, and evaluator conditions |
| Few-shot examples | Label schema, domain distribution, example order and format | label anchoring, recency/order sensitivity, poorer tail performance | Zero-shot and alternative-example-set controls |
| Retrieval/context expansion | Context position, distractor rate, document authority and length | irrelevant-context distraction, lost-middle behavior, stale/conflicting evidence use | No-retrieval, truncated-context, and shuffled-distractor controls |
| Tool instructions/agent scaffolds | Tool reliability, authentication state, retry policy, action space | looping, unsafe or invalid calls, recoverability loss, cost explosion | Same model and tools with scaffold removed or minimally constrained |
| Structured-output constraints | Model snapshot, schema complexity, downstream parser | refusal, truncation, malformed output, semantic-but-schema-valid errors | Equivalent unconstrained output plus parser/evaluator checks |

## Reusable paired evaluation artifact

```text
For each production slice S:
  Freeze: model snapshot, system prompt, tools, tool versions, retrieval corpus,
          decoding, token limits, retry policy, timeout, evaluator, and traffic slice.
  Run A: current baseline.
  Run B: one prompt/scaffold intervention.
  Record per attempt:
    task ID, success metric, evaluator result, input/output tokens, tool calls,
    retry count, latency, monetary cost, invalid/unsafe action, and failure class.
  Report:
    Δ success with uncertainty, tail-slice Δ, Δ cost, Δ latency,
    tool-action error rate, and regression count.
  Adopt only if B clears predeclared quality and safety floors and its cost/latency
  tradeoff is acceptable on the target slice. Retain A as rollback.
```

## Coverage and gaps

- **R2 — counterevidence, regressions, and transfer limits:** **blocked.** The governing request requires original inspected sources and quantitative findings under original conditions. None could be retrieved or inspected because the mandated retrieval tools are unavailable.
  - **Smallest useful next check:** enable the four requested actions, then inspect primary empirical papers for each candidate technique and record model snapshot, task/dataset, comparator, scaffold/tools, budget/retries, evaluator, repetitions, metric, and cost.
  - **Stop reason:** explicit inaccessible retrieval gap, not negative evidence.

## Retained-source appendix

- Local governing template inspected: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/researcher.md`
- No public sources retained or cited.