# Repair-1: Coding-agent intervention ablations

## Status

**Blocked.** No configured web-research provider was available in this execution context: `web_search`/`fetch_content` were not registered, and the template’s prescribed `agents.run` path was rejected by the Fabric agent-depth limit. The assignment prohibits browser use, authentication, and substitute retrieval paths.

No primary source was inspected. Therefore, this note intentionally makes no empirical claims, reports no remembered benchmark numbers, and does not repair the R1/R2 evidence gap.

## Findings and analysis

No decision-grade comparison can be made without inspecting primary sources. In particular, the following must not be assumed:

- Context selection is beneficial relative to larger or full-repository context.
- A particular tool interface improves coding-agent outcomes independently of model, prompt, task distribution, and action budget.
- More agents, retries, recovery loops, or self-critique improve pass rates rather than cost, latency, duplication, or correlated failure.
- Results from older models, SWE-bench variants, custom validators, sampled subsets, or different execution environments transfer to GPT-5.6 Terra.

## Sources and inspected support

None. Retrieval was unavailable, so no source, passage, denominator, validator, model snapshot, intervention budget, uncertainty estimate, or failure accounting was inspected.

## Counterevidence and transfer limits

The absence of inspected evidence is not negative evidence for any intervention. It does, however, preclude adopting a fixed-model operating policy based on claims of universal gains.

There is no demonstrated equivalence between any unavailable study’s evaluated system and GPT-5.6 Terra. Transfer would require, at minimum, matching or explicitly qualifying:

- model and serving snapshot;
- benchmark/task distribution and repository state;
- scaffold, tool interface, context policy, and action/retry budget;
- validator, denominator, sampling, and aggregation method;
- cost, latency, and parallel-resource constraints.

## Coverage and gaps

| ID | Exact question | Required inclusions | Expected contribution | Decision context | Status | Smallest useful next check |
|---|---|---|---|---|---|---|
| R1 | What evidence distinguishes context selection, tool interfaces, task contracts, parallelism and recovery interventions, including actual results and methods? | inspected primary sources; actual results with methods and conditions; separate intervention categories | Evidence-backed distinctions among intervention classes. | Choose fixed-model operating changes without claiming universal effects. | **Blocked** | Restore configured `web_search` with `workflow: "none"` and unauthenticated `fetch_content`; inspect primary controlled ablations and extract intervention, baseline, denominator, validator, budget, and outcome. |
| R2 | Where do more context, more agents, retries or self-critique fail, and what cannot transfer to current GPT-5.6 Terra? | null or regression evidence; failure conditions and methods; explicit GPT-5.6 Terra transfer limits | Bounded failure modes and non-transferable evidence. | Avoid adopting scale, retry, or critique mechanisms on unsupported assumptions. | **Blocked** | Inspect the same primary studies’ ablation tables, error analyses, and protocol limits for nulls, regressions, retry exhaustion, correlation, and model-transfer qualifications. |

**Stop reason:** the required configured-provider retrieval path was unavailable, and the assignment disallows alternate web access.