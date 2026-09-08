# Requirement dispositions

| Requirement | Disposition | Evidence |
| --- | --- | --- |
| Fixed model and reasoning effort | satisfied | Main and all four direct leaves were natively verified as `openai-codex/gpt-5.6-terra`, `medium`, Pi runner. Final statuses are recorded below. |
| Exact four independent streams, no coordinator | satisfied | Dispatch ledger and four preserved stream files. |
| Primary inspected sources and measured results | blocked | The only permitted `pi-web-access` provider had no registered callable actions. All four streams independently reported no inspected sources. |
| R1 evidence distinctions | blocked | No permissible retrieval completed. |
| R2 null/regression and transfer evidence | blocked | No permissible retrieval completed. |
| R3 evidence-backed failure matrix | blocked | A non-evidentiary evaluation template is supplied in RESEARCH.md, explicitly not an operating recommendation. |
| R4 exact fixed-model paired evaluation | partial | A pre-registrable measurement protocol is specified, but its thresholds are provisional rather than evidence-derived. |
| Complete original-source appendix | partial | Appendix correctly contains no sources because none were inspected. |
| Actual streams, phase timings, report in output directory | satisfied | `streams/`, `PHASE_TIMINGS.json`, and `RESEARCH.md`. |

## Final native status

```json
[
  {
    "name": "context-contracts",
    "id": "f0f90fd2d6924ef7bcb750d8a02aa1bb",
    "status": "completed",
    "model": "openai-codex/gpt-5.6-terra",
    "thinking": "medium",
    "runner": "pi",
    "startedAt": 1788819883432,
    "finishedAt": 1788819933869
  },
  {
    "name": "parallel-recovery",
    "id": "c810c5b224604c1db3eb46c8bf665848",
    "status": "completed",
    "model": "openai-codex/gpt-5.6-terra",
    "thinking": "medium",
    "runner": "pi",
    "startedAt": 1788819883457,
    "finishedAt": 1788819978784
  },
  {
    "name": "coding-benchmarks",
    "id": "b668f08c541f49f389e368a2df1cc776",
    "status": "completed",
    "model": "openai-codex/gpt-5.6-terra",
    "thinking": "medium",
    "runner": "pi",
    "startedAt": 1788819883445,
    "finishedAt": 1788819976042
  },
  {
    "name": "counterevidence-evaluation",
    "id": "26a156573b694910971e6ecf31c6d783",
    "status": "completed",
    "model": "openai-codex/gpt-5.6-terra",
    "thinking": "medium",
    "runner": "pi",
    "startedAt": 1788819883446,
    "finishedAt": 1788819960328
  }
]
```

## Concrete blocker and bounded repair

Main discovery and every stream found no callable `pi-web-access` action in Fabric. Workers made a single direct-action repair attempt and received `Unknown Fabric action`. Per the task constraints, no browser, alternate provider, configuration change, or broad rerun was allowed.
