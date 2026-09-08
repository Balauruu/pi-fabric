# Revision journal

| Revision | Hypothesis / diff | Trial | Quality verdict | Timing | Decision | Consecutive no-improvement |
|---|---|---|---|---|---|---:|
| B | Snapshot baseline, medium-only transport adaptation | T1 attempted | Inconclusive: all research workers failed before evidence | Worker timing unavailable in receipt | Baseline retained for comparison | 0 |
| C1 | Self-contained requirement contract, semantic assignment gate, one authoritative RESEARCH.md, source appendix rule, Terra-medium policy | T1 attempted | Inconclusive: agent depth limit prevented worker launch | Trial receipt did not record useful phase durations | Not a quality revision result | 0 |

Both attempts are infrastructure-blocked and do not count toward the requested five tested no-improvement revisions. Artifact evidence: `trials/B-T1`, `trials/C1-T1`.

| B (recursive) | Same medium-only baseline | T1 recursive retry | Inconclusive: depth limit 2 blocked researcher dispatch | No useful phase duration | Blocked, not counted | 0 |
| C2 | Explicit stream requirement records, mandatory source-appendix validator gate, terminal state receipt | T1 recursive retry | Inconclusive: no substantive worker launched | Research attempt max 5 ms, finalization 16 ms, not research timing | Blocked, not counted | 0 |

## Blocking evidence

C2 receipt:

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


B recursive file inventory:

/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/trials/B-T1-recursive/20260907T215302276Z-research-production-prompt-techniques/RESEARCH.md
/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/trials/B-T1-recursive/20260907T215302276Z-research-production-prompt-techniques/REPORT.md
/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/trials/B-T1-recursive/20260907T215302276Z-research-production-prompt-techniques/state.json


Installed-package fingerprint check:

c44bf18728c1a31e5694f5543fc8aa3f9158c517d8fd6e507d1d92885d48bfa3  /home/balauru/.pi-profiles/fabric/skills/fabric-research/SKILL.md
c44bf18728c1a31e5694f5543fc8aa3f9158c517d8fd6e507d1d92885d48bfa3  /home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/snapshots/initial/fabric-research/SKILL.md


| rev-03 | Clean sole-writer RESEARCH.md and source-bound measurements | T1 phase-only replay, T2 full live integration | T2 source/coverage/actionability passed after bounded report correction; T1 phase replay has an unclosed Lost-in-the-Middle check and is not whole-workflow evidence | T2 research 750s parallel wall maximum plus verify/synthesis/validation 436s sequential | Retained as basis, not installed due dense-note readback regression | 0 |
| rev-04 | Continuation-aware exact readback after line/byte caps, source-marker boundary guard; preserves single-line blocker | Direct probes plus T3 full live integration | T3 independent validator accepted. Two parity reviews found T3 at least legacy quality; T1/T2 evidence is qualified by phase-only/T2 correction provenance | T3 research 221s parallel wall maximum plus verify/synthesis/validation 703s sequential. Not a matched speed comparison | Accepted and installed. No speed superiority claim | 0 |
