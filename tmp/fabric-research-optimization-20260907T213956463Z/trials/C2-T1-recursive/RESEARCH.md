# Production LLM prompt-technique selection

## Brief
Decision-grade guide for selecting prompt techniques in production LLM systems. Scope: explicit reasoning instructions, few-shot examples, multi-sample selection, decomposition, retrieval/context structuring, and output constraints where original evaluations support them. Do not present incomparable evaluations as a common leaderboard. Research date: 2026-09-07.

## Canonical requirement contract
### R1
- **Question:** What measured effects do production-relevant LLM prompt techniques have, under which task and model, relative to what comparator, and with what method and cost?
- **Required inclusions:** measured technique effects; task and model; explicit comparator; methods and cost
- **Report contribution:** Evidence table retaining outcomes and incompatible settings separately.
- **Decision context:** Select prompting techniques for production systems without treating benchmark gains as universal.

### R2
- **Question:** What counterevidence, regressions, and transfer limits constrain use of those techniques?
- **Required inclusions:** original counterevidence; failure modes; task/model transfer limits
- **Report contribution:** Limits and failure signals that bound recommendations.
- **Decision context:** Avoid techniques that degrade reliability, cost, latency, or safety.

### R3
- **Question:** What actionable technique-selection and evaluation rules follow for production use, including failure signals and the smallest resolving evaluation?
- **Required inclusions:** selection rules; evaluation design; operational failure signals
- **Report contribution:** Operational decision rules and a task-specific evaluation protocol.
- **Decision context:** Choose what to trial now and what measurement would change that choice.

## Assignment index
- `effects`: R1
- `limits`: R2
- `operations`: R3

## Workflow navigation
Evidence is retained in [streams/](streams/). Execution accounting is in [state.json](state.json). This file is the sole authoritative report.

## Workflow outcome
**Status: blocked.** No decision-grade guide can be authored because all three delegated research launches were rejected by the Fabric runtime before native execution: `Fabric agent depth limit reached (2)`. The required model and thinking were configured for every launch, but observed model and thinking are null because no worker started. No sources were retrieved, so R1–R3 remain blocked rather than inferred.

## Coverage and stop reason
| Requirement | Disposition | Reason |
| --- | --- | --- |
| R1 | blocked | Researcher launch rejected before source retrieval. |
| R2 | blocked | Researcher launch rejected before source retrieval. |
| R3 | blocked | Researcher launch rejected before source retrieval. |

Stop reason: systemic pre-execution depth-limit failure. The workflow did not retry or substitute another model, direct research, or a generic response.

## Source appendix
No retained sources. Delegated researchers did not start.

## Final validation
**Not run.** Independent validation could not run without research evidence. This report is a durable blocked outcome, not a validated decision-grade guide.
