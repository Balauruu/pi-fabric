# Arbor QA results template

Copy this template into a new disposable run's evidence directory. Do not replace previous attempts. Runbook: `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/docs/qa-runbook.md`.

**Initial status: NOT-RUN. This template contains no newly passing product results.**

## Run identity

| Field | Value |
| --- | --- |
| QA run ID / operator / authorization | |
| Start/end UTC | |
| Original repository | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor` |
| Disposable QA root / APP / state / profile | |
| Commit / merge parents / branch | |
| Working-tree patch and content-hash evidence | |
| Original status / copied status evidence | |
| Node executable/version/architecture | |
| OS/kernel/filesystem / CPU / memory / free disk | |
| Git / npm / tsx versions | |
| Pi version: source / installed | |
| Fabric version: source / installed | |
| Declared Fabric peer | `>=0.83.0` in inspected working tree, recheck for this run |
| Selected compatibility-matrix cell | |
| Playwright version / Chromium revision / manual browser | |
| Local-model identities / child availability | |
| Network/download approval, if any | None by default |
| Credential/external-service prerequisites | None for deterministic native lanes |
| Test source/installed variants actually executed | |
| Outer execution deadline / test deadlines / interruptions | |
| Evidence archive and retention owner | |

Do not include credentials, auth file contents or private source text. An exact model identity is not a secret. Record service availability without leaking keys.

## Result meanings

| Status | Use only when |
| --- | --- |
| PASSED | Required case/variant actually executed, reached its checks, satisfied observable criteria, and has linked logs/exits/evidence. Expected rejection cases passed only if the expected refusal and preservation checks held. |
| FAILED | A reached oracle/assertion failed, an unauthorized effect/data loss occurred, or the test's own timeout/required process exit failed. Distinguish product defect, harness defect and historical gate conflict in the category column. |
| BLOCKED | A specific required environment/dependency/identity/evidence prerequisite prevented valid execution. Name it. Do not use this to conceal an unexplained integration hang. |
| SKIPPED | Operator deliberately omitted/interrupted the case. State reason and authorization. Filtered-out variants are not passed. |
| NOT-RUN | No execution attempt yet. This is the default, not a synonym for passed. |

If cause is unknown after an attempted integration timeout, preserve the observed failure/noncompletion and say “cause unresolved”. Never substitute historical publication evidence. A parent T/M family is PASSED only when every required variant passed. Otherwise retain the child statuses and summarize the outstanding cases.

## Case execution ledger

Add one row for **each** parameterized scenario, source/installed version, policy value and fault stage. The family rows below are planning rows. Replace each with child rows or link to a complete machine-readable subtest list.

| Case / variant | Status | Exact command or UI steps | Expected vs observed / category | Exit / signal / counts / duration | Evidence paths | Cleanup / follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| T01 package/install | NOT-RUN | | | | | |
| T02 managed/setup/lease | NOT-RUN | | | | | |
| T03 store/service/contracts | NOT-RUN | | | | | |
| T04 roles/presets/preparation | NOT-RUN | | | | | |
| T05 evaluator/arithmetic | NOT-RUN | | | | | |
| T06 source capture/preservation | NOT-RUN | | | | | |
| T07 material journeys | NOT-RUN | | | | | |
| T08 tree/search | NOT-RUN | | | | | |
| T09 source journals/review | NOT-RUN | | | | | |
| T10 split/validation contracts | NOT-RUN | | | | | |
| T11 grounding/provenance | NOT-RUN | | | | | |
| T12 lessons/trajectories | NOT-RUN | | | | | |
| T13 readers/presentation/storage | NOT-RUN | | | | | |
| T14 PR13 cutover/legacy refusal | NOT-RUN | | | | | |
| T15 native substrate | NOT-RUN | | | | | |
| T16 native observation/deferred | NOT-RUN | | | | | |
| T17 native evaluation/provider | NOT-RUN | | | | | |
| T18 native material | NOT-RUN | | | | | |
| T19 native autonomous research | NOT-RUN | | | | | |
| T20 native parallel/A12 | NOT-RUN | | | | | |
| T21 native controls/crash/recovery | NOT-RUN | | | | | |
| T22 native held-out/final | NOT-RUN | | | | | |
| T23 native grounding/experience | NOT-RUN | | | | | |
| T24 native packs, all source/installed variants | NOT-RUN | | | | | |
| T25 native browser/lifetime, all source/installed variants | NOT-RUN | | | | | |
| T26 historical cutover audit | NOT-RUN | | F03 static baseline conflict is not an observed exit | | | |
| T27 each numeric/schema boundary | NOT-RUN | | | | | |
| T28-bytes-ok | NOT-RUN | | | | | |
| T28-bytes-over | NOT-RUN | | | | | |
| T28-files-ok | NOT-RUN | | | | | |
| T28-files-over | NOT-RUN | | | | | |
| T28-empty | NOT-RUN | | | | | |
| T28-selection | NOT-RUN | | F04 documentation/implementation discrepancy predicted, not executed | | | |
| T29 each CLI valid/invalid/asset/permission variant | NOT-RUN | | | | | |
| M01 human install/setup/doctor | NOT-RUN | | | | | |
| M02 intake/config/selector | NOT-RUN | | | | | |
| M03 packs/research/budgets | NOT-RUN | | | | | |
| M04 controls/review/denials | NOT-RUN | | | | | |
| M05 persistence/roles/recovery | NOT-RUN | | | | | |
| M06 grading/promotion/final interpretation | NOT-RUN | | | | | |
| M07 source apply/undo/recovery | NOT-RUN | | | | | |
| M08 grounding/lessons | NOT-RUN | | | | | |
| M09 Pi/CLI/browser/export parity | NOT-RUN | | | | | |
| M10 browser UX/read-only/lifetime | NOT-RUN | | | | | |

For filtered runs record the exact matching subtest names and number actually executed. For aggregate commands link each nested lane's log and exit. Reusing an execution for overlapping coverage is allowed. Double-counting it as independent evidence is not.

### Machine-readable row format

```json
{
  "qaRunId": "REPLACE",
  "caseId": "T25",
  "variant": "source-application-held-spawn",
  "status": "NOT-RUN",
  "featureIds": ["F45", "F47"],
  "commit": null,
  "workingTreeHash": null,
  "fabricVersion": null,
  "piVersion": null,
  "nodeVersion": null,
  "command": null,
  "startedAt": null,
  "finishedAt": null,
  "expected": null,
  "observed": null,
  "exitCode": null,
  "signal": null,
  "testsExecuted": null,
  "failed": null,
  "cancelled": null,
  "skipped": null,
  "category": null,
  "evidence": [],
  "cleanup": "retained",
  "followUp": null
}
```

## Feature coverage closure

Link **executed** T/M subcases, not just planned mappings. Missing source/installed/manual/version/fault variants stay open. Each row begins NOT-RUN.

| Feature | Status | Executed evidence / remaining variants |
| --- | --- | --- |
| F07 package/assets | NOT-RUN | |
| F08 public skill/roles | NOT-RUN | |
| F09 setup/passivity | NOT-RUN | |
| F10 diagnostics/availability | NOT-RUN | |
| F11 config/precedence | NOT-RUN | |
| F12 intake/confirmation | NOT-RUN | |
| F13 start/inspect/deferred | NOT-RUN | |
| F14 exact evaluate | NOT-RUN | |
| F15 material workflow | NOT-RUN | |
| F16 autonomous research | NOT-RUN | |
| F17 material types/scope | NOT-RUN | F04 remains unresolved |
| F18 dirty source preservation | NOT-RUN | |
| F19 capture refusals/bounds | NOT-RUN | |
| F20 exact gain acceptance | NOT-RUN | |
| F21 measurement invalidity/accounting | NOT-RUN | |
| F22 optional evaluators | NOT-RUN | |
| F23 held-out/final | NOT-RUN | |
| F24 tree/search policy | NOT-RUN | |
| F25 parallel waves/CAS | NOT-RUN | |
| F26 budgets | NOT-RUN | |
| F27 controls/resume admission | NOT-RUN | |
| F28 modes/review | NOT-RUN | |
| F29 keep/discard selection | NOT-RUN | |
| F30 partial/restart | NOT-RUN | |
| F31 native uncertainty/recovery | NOT-RUN | |
| F32 roles/spec persistence | NOT-RUN | |
| F33 apply/undo | NOT-RUN | |
| F34 source intent recovery | NOT-RUN | |
| F35 grounding modes/catalog | NOT-RUN | |
| F36 source provenance | NOT-RUN | |
| F37 lessons | NOT-RUN | |
| F38 trajectories | NOT-RUN | |
| F39 bundled packs | NOT-RUN | |
| F40 prepared-input adapter | NOT-RUN | |
| F41 exports | NOT-RUN | |
| F42 Pi selection/views | NOT-RUN | |
| F43 CLI reads/refusals | NOT-RUN | |
| F44 browser read-only | NOT-RUN | |
| F45 SSE/stale/transport | NOT-RUN | |
| F46 cold storage | NOT-RUN | |
| F47 owner lifetime | NOT-RUN | |
| F48 native Fabric views | NOT-RUN | |
| F49 substrate diagnostics | NOT-RUN | |
| F50 merge/version/audit | NOT-RUN | F03 remains unresolved |

## Prior timeout and attempt history

| Attempt | Snapshot / versions | Observed outcome | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| Previous integration validation reported by user | Exact lane/versions not supplied | Timed out, **not passed** | Not supplied to this investigation | Preserve nonpassing history, cause unresolved. Do not substitute historical PR13 passes. |
| This QA attempt | | NOT-RUN | | |
| Any later retry, separately identified | | NOT-RUN | | |

For a timeout capture outer deadline, test name/deadline, elapsed time, last reached event, stdout/stderr, child exit/signal/killed flag, exact owned live PIDs, native IDs, run state/revision, held reservations and retained workspace. Do not mark a reported timeout PASSED because a marker appeared before process exit.

## Contradictions, blockers and defects

Preserve runbook finding codes F01–F06, risk codes R01–R06 and feature codes F07–F50. New defect IDs use D01, D02, etc.

| ID | Type | Expected contract | Observed behavior/evidence | Impact / affected cases | Owner / next action |
| --- | --- | --- | --- | --- | --- |
| F03 | Static audit-baseline conflict | Current peer declaration is tested without falsifying historical evidence | Audit requires old peer/dependency/lockfile identity | T26/F50, not newly executed | |
| F04 | Documentation/implementation contradiction | Explicit non-Git selection guidance | Source walks nonignored files, current test accepts empty selection | T28-selection/F17, not newly executed | |
| F05 | Documentation/diagnostic gap | Discoverable accurate commands/current evidence references | Final validation omitted from main list/help, stale diagnostic/evidence pointers | M01/M02/M06 | |
| D01 | | | | | |

## Compatibility summary

| Fabric / Pi / Node / OS | Source status + evidence | Installed status + evidence | Manual/browser status + evidence | Declared versus tested conclusion |
| --- | --- | --- | --- | --- |
| Locked baseline 0.83.0 / 0.85.1 / operator Node / operator OS | NOT-RUN | NOT-RUN | NOT-RUN | Declared/configured, no new test proof |
| Operator-selected additional version | NOT-RUN | NOT-RUN | NOT-RUN | Do not infer from open-ended `>=0.83.0` |

Check the actual installed manifests. A source run against a newer Fabric with hard-coded installed fixtures at 0.83.0 is a mixed matrix, not installed proof of the newer version.

## Summary and cleanup sign-off

- **A01 — Outcome:** NOT-RUN until evidence exists. Then state bounded smoke/regression outcome with passed/failed/blocked/skipped/not-run totals by unique subcase and family.
- **A02 — Coverage:** link completed feature matrix and unresolved version/manual/fault combinations. Never say “complete coverage” from a build or aggregate count alone.
- **A03 — Preservation:** source/index/refs/stash/worktree, cold DB/WAL/SHM/journal and artifact before/after evidence reviewed: [ ]. Any exclusions explicitly listed: [ ].
- **A04 — Lifetime:** exact owned processes/listeners/stores settled and closed: [ ]. Unknown handles/reservations retained: [ ]. No unrelated processes stopped: [ ].
- **A05 — Archive:** reviewed evidence archive path and owner: [ ]. Failed/interrupted material released for deletion by: [ ].
- **A06 — Cleanup:** retained by default. Optional exact QA root deletion authorized and guarded: [ ]. Original user/profile/runtime data untouched: [ ].
- **A07 — Release decision:** out of scope unless separately authorized. No product behavior changes, commits, pushes, policy downgrades, audit rewrites or test-result upgrades are authorized by filling this template.
