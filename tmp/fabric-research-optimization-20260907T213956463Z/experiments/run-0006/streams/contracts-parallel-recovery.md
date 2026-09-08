# contracts-parallel-recovery

## Question, scope and status

**Status: blocked.** Research date requested: 2026-09-07. No primary web sources could be inspected: the required `agents.run` call failed with `Fabric agent depth limit reached (2)`, and the configured tool registry exposed no web-search or fetch provider. No browser was used.

The supplied local workflow references are procedural only and contain no results about coding-agent interventions: [`researcher.md`](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/researcher.md), [`stream-contracts.md`](file:///home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/references/stream-contracts.md).

## Findings and analysis

No measured claim is supportable for context selection, tool interfaces, task contracts, parallel/multi-agent execution, retries, recovery, or self-critique in coding agents under this run.

**Operational consequence:** do not change the fixed-model GPT-5.6 Terra operating policy based on universal assumptions such as “more context,” “more agents,” “retry,” or “self-critique” improving outcomes. No inspected evidence establishes their effect, cost, latency, or transferability.

## Failure-to-intervention matrix

| Observed failure | Intervention | Validation | Stop condition | Evidence status |
|---|---|---|---|---|
| Any proposed policy change based on the listed mechanisms | Do not deploy mechanism-specific change | Require a primary source with task, model/system snapshot, scaffold/tools, budget, grader/denominator, result, and cost/latency | Stop at missing comparable evidence | Unknown |
| Claimed transfer from another model or benchmark to GPT-5.6 Terra | Treat as non-transferable pending a fixed-model evaluation | Evaluate unchanged model/reasoning effort on the target task distribution with a defined comparator | Stop if model, tools, budget, grader, or task differ without a direct validation run | Unknown |
| Research execution lacks an authorized working provider | Repair research environment, not the coding-agent policy | Confirm a depth-one worker can use `web_search` with `workflow:"none"` and unauthenticated `fetch_content` | Stop this stream until sources can be inspected | Observed execution blocker |

## Counterevidence and limitations

There is no null, regression, or cost evidence from primary studies in this result. Absence of retrieved evidence is not evidence that an intervention fails. The only supported conclusion is that this run cannot distinguish effects or justify transfer to GPT-5.6 Terra.

## Requirement coverage and gaps

| ID | Exact question | Required inclusions | Expected report contribution | Decision context | Coverage | Smallest next check | Stop reason |
|---|---|---|---|---|---|---|---|
| R1 | What evidence distinguishes context selection, tool interfaces, task contracts, parallelism and recovery interventions, including actual results and methods? | inspected primary sources; actual results with methods and conditions; separate intervention categories | Evidence-backed distinctions among intervention classes. | Choose fixed-model operating changes without claiming universal effects. | **Blocked** | Run the supplied researcher request from a non-depth-limited parent with working configured web tools, then inspect primary originals. | Required worker failed at Fabric depth limit and no configured web provider was available. |
| R2 | Where do more context, more agents, retries or self-critique fail, and what cannot transfer to current GPT-5.6 Terra? | null or regression evidence; failure conditions and methods; explicit GPT-5.6 Terra transfer limits | Bounded failure modes and non-transferable evidence. | Avoid adopting scale, retry, or critique mechanisms on unsupported assumptions. | **Blocked** | Retrieve primary ablations containing null/regression outcomes and compare configuration boundaries to Terra. | No primary results were retrievable or inspectable. |
| R3 | Which observed failure should trigger which intervention, with validation and stop conditions? | failure-to-intervention matrix; observable trigger; validation and stopping criteria | Usable operating policy. | Make operational response decisions for tool-using coding agents. | **Qualified** | Derive triggers only after R1/R2 sources establish observable failure signatures and validation metrics. | The matrix above is an evidence-gating policy, not an evidence-backed intervention policy. |