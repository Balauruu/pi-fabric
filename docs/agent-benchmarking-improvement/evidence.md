# Evidence and verification record

Root: `/home/balauru/.pi-profiles/fabric`. S/F/R prefixes match [findings](findings.md). Review concerns implementation and method validity, not the recent comparison's winner. No paid agents/model calls or implementation changes were made.

## Evidence boundaries

- Applicable guidance: root AGENTS.md; benchmarking SKILL/README and protocol-design, conditions-and-mechanisms, grading, statistical-analysis, execution-lifecycle, telemetry, audit-and-reporting and validation references; ultra-skill-creator design guidance; deep-module design guidance; user-supplied fabric-workflow skill.
- Pi contract: `/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md` was read, not any blacklisted profile path mentioned as a generic default in documentation.
- Fabric: installed docs/agents.md, configuration.md, interface.md, providers.md, components.md, audit-trace.md; fabric-exec skill and agent reference; package exports and relevant public protocol/component declarations. Effective agents.run was inspected via tools.describe. No private runtime imports or process launcher were used.
- Navigation: bounded Fovea skill sketch reported 90 files/907 symbols; targeted searches and source windows supplied proof. Generated dependency chunks/caches and evaluation histories were not bulk-read.
- Saved evidence: source spec/calibration, one ordinary measured assignment, one complete native result, one judge assignment, two sampled grade rationales, report header, aggregate telemetry/role fields, and a 101-line bounded archived log window. File-role enumeration/counts and streamed hashes do not constitute a review of all answers or all trajectories.
- The user-reported eval/wrapper failure is not retained in the inspected run records. It is not assigned a verified technical cause here. No broad session-history search was used to fill that gap.
- Existing README scientific failure gates were inspected as documented limitations, not independently rerun. Transient study status in that README is not established as current operational state.

## Execution-path evidence map

| Step | Decisive source |
| --- | --- |
| Public request/exact guest | S/SKILL.md:19-27; S/workflows/benchmark.ts:17-19,157-220 |
| Strict spec, input freeze | S/scripts/lifecycle_store.py:272-417,486-660 |
| Assignment law/records | S/scripts/lifecycle_store.py:700-786,996-1077; S/scripts/generate_schedule.py owns generator |
| Local lock and budget admission | S/scripts/lifecycle_store.py:792-865,1718-1745; S/scripts/run.py:80-251 |
| Assembled task/native request | S/scripts/lifecycle_store.py:1094-1130; S/workflows/benchmark.ts:77-114 |
| Native persistence/log archive | S/scripts/lifecycle_store.py:1239-1348; S/scripts/run.py:274-337 |
| Judge input/plan | S/scripts/grade.py:471-655; S/scripts/lifecycle_store.py:1774-1849,2014-2067 |
| Label parse/terminal | S/scripts/grade.py:696-796; S/scripts/lifecycle_store.py:1446-1515 |
| Analysis/finalization | S/scripts/lifecycle_store.py:2347-2432; S/scripts/analysis_engine.py:1174-1263 for finite looks |
| Report/render/inspection | S/scripts/lifecycle_store.py:2219-2285,2642-2740 |

## Saved-run facts

Source: `R/spec.json`, `R/calibration.json`; complete role results and assignments under `R/run/attempts/` and `R/run/grading/jobs/` (each compact JSON record is line 1). Values below are bounded projections, not a new analysis/adoption judgment.

| Observation | Value / interpretation |
| --- | --- |
| Tasks / conditions / repetitions | 6 / 2 / 1, finite curated screening design |
| Configured design concurrency | 1 |
| Measured result records | 12 |
| Judge result records | 12 |
| Grader IDs | astra-judge, appearing in 12 job assignments |
| Grader model configuration | one judgment.model, one repetition per output |
| Public report counts | planned/assigned/terminal 12; failed/unresolved/pending 0; attempt counts, not all-role calls |
| Markdown size | 33,272 bytes, 1,032 lines; analysis JSON starts at line 20 |
| Measured native toolCalls total | 171, outer native granularity |
| Judge native toolCalls total | 0 |
| Measured native timestamp span | 2,068.105 seconds |
| Sum of measured native timestamp differences | 1,947.588 seconds |
| Judge native timestamp span | 244.848 seconds |
| Sum of judge native timestamp differences | 159.679 seconds |
| Saved measured latency projection | unavailable, 12 unknown entries |
| Measured cache-write projection | observed numeric zero, 12 known entries |
| Measured cost projection | numeric 3.1081296000000003 with unit null and explicit unit-unavailable limitation; not labeled USD here |

Timestamp figures are direct arithmetic on native startedAt/finishedAt fields divided by 1,000, not independently certified provider inference latency or total experiment wall time. The proposed adapter must document native timing semantics before labeling derived latency. Gaps include orchestration/idle time, and first-to-last native span excludes some initialization/finalization work.

### Authoring mismatch and actual judge context

- `R/run/attempts/a-000008/assignment.json:1`: baseline Rust prompt requests two consequential edition changes and migration path, but no quotations/exact question restatement/evidence item format. Instructions refer to an undefined task-required report format.
- `R/run/grading/jobs/judge-blind-000001-astra-judge-r001-e58f934a269e34575dfaeb3c/assignment.json:1`: projection contains rubric/output only, plus appended illustrative calibration strings in the request. No original authoritative task context.
- `R/run/grading/grade-a-000001-judge-astra-judge-r001-9753aa46024f149950b20e56.json:1`: rationale says the report "does not restate the exact research question or provide the required supporting quotations linked to claims, preventing a strong rating."
- `R/run/grading/grade-a-000002-judge-astra-judge-r001-d24efaaaf492551a911bb932.json:1`: second sampled rationale gives the same missing-format penalty. This establishes the issue in sampled saved decisions; no claim every judgment had this rationale.

### One observed skill-content load

Bounded examination: `R/run/attempts/a-000001/native.log`, lines 380-480 only, selecting tool_execution_start/end events.

- Line 469: fabric_exec starts an MCP shell call with command `cat /home/balauru/.pi-profiles/fabric/skills/fabric-research/SKILL.md`.
- Line 471: corresponding tool end has isError false and contains `name: fabric-research` in returned content.

This is observed content loading for one trajectory, not mere prompt intent. It does not establish all treatment loads, full reference use, behavioral compliance, no delegation in all trajectories, or the efficacy of the unrestricted research workflow. No blacklisted file was opened in this review.

## Public runtime contracts observed

Effective tools.describe({ref:"agents.run"}) returned required task and optional name/runner/transport/model/persona/thinking/tools/timeoutMs/extensions/recursive/cwd/worktree/schema, with additionalProperties false. It had no per-request descendant hard-call cap, provider-rate setting, idempotency key or caller-supplied experiment assignment ID. Native name is a label, not an exactly-once key. No currently callable effective-capacity/registered-workflow action was established.

Documentation states:

- workflow.parallel takes thunks; workflow.pipeline composes stages; helpers preserve native execution but workflow.agent projects value/text (`F/docs/agents.md:9-21`).
- maxConcurrent is the native semaphore; maxPerExecution is a hard outer-execution limit; recursive processes have their own concurrency and best-effort shared cost ledger (`F/docs/agents.md:534-536`; configuration Agents section). Do not generalize this to all sessions/provider accounts.
- timeoutMs below configured agent floor is ignored; orchestration raises the executor floor (`F/docs/agents.md:233`; configuration.md:18-46).
- spawn/wait/status/stop and durable lifecycle subscriptions are existing public surfaces. Subscription delivery can duplicate across a crash; deduplicate native event IDs (`F/skills/fabric-exec/references/agents.md:33-76`).
- package exports main and protocol only; plain FabricInvocationContext has signal/activity but not a generic nested call method (`F/package.json:8-18`; `F/dist/protocol.d.ts:226-258`). Managed component context.call exists, but is not proof of correct per-caller forwarding for a registered run wrapper (`F/dist/components/types.d.ts:58-71`).

Discovery lists and effective describe views can differ; listed names/schema vocabulary do not prove backend installation, authentication, enabled policy or live capacity. No model enumeration/dispatch was needed to make the architecture recommendation. An upstream implementation must verify its new selected effective schema and native behavior, not depend on this snapshot as permanent inventory.

## Focused existing tests, observed

Command, from the skill directory:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 PYTHONPATH=tests \
.venv/bin/python -B -m unittest \
  test_grading test_measurement \
  test_run.RunLifecycleTests.test_assignment_without_result_is_never_replayed_even_after_manual_stale_lock_recovery \
  test_run.RunLifecycleTests.test_complete_saved_result_derives_terminal_without_replay \
  test_run.RunLifecycleTests.test_report_on_incomplete_run_is_byte_for_byte_read_only \
  test_run.RunLifecycleTests.test_configured_and_usable_call_ceilings_are_lowered_and_unknown_remainder_refuses \
  test_run.RunLifecycleTests.test_extra_or_contradictory_attempt_ids_prevent_false_completion
```

Observed: **29 tests, 3.298 seconds, OK**. This is one overlapping focused selection, not the full suite or native concurrency evidence. Tests use fake dispatch and local deterministic operations. No new MCMC fits or paid calls.

## Direct deterministic probes, observed and unfixed

Using S/.venv/bin/python -B, production scripts imported from S/scripts, minimal-deterministic fixture spec, and fresh TemporaryDirectory per case. No patched grading/analysis helper and no paid backend.

| Probe | Observed result |
| --- | --- |
| Set tokenGuard=0, costGuard=0; fake returns usage input=1/output=1/cost=1 | complete; all 4 fake measured calls dispatched; 4 succeeded terminals; no guard error |
| Select deterministic kind command with otherwise valid fixture | 1 fake call, failed GRADING_FAILED: no command outcome evidence; assigned 1, terminal 0, pending 3 |
| Select deterministic kind final-state | 1 fake call, failed GRADING_FAILED: no outer final-state evidence; assigned 1, terminal 0, pending 3 |
| Exact JSON expected {"x":true}, actual {"x":1} | label correct, score 1 |
| JSON schema type integer/multipleOf 2, output 3 | label correct, score 1 |

Minimal reproducer for the grading semantic defects (run with the skill-local Python, from profile root):

```python
import copy, json, pathlib, sys
s = pathlib.Path('skills/agent-benchmarking')
sys.path.insert(0, str(s / 'scripts'))
import grade
fixture = json.loads((s / 'tests/fixtures/refactor/minimal-deterministic/spec.json').read_text())
p = copy.deepcopy(fixture['grading'])
p['deterministic'].update(kind='exact-json', expectedByTask={'t': {'x': True}})
item = {'assignment': {'attemptId': 'probe', 'taskId': 't'},
        'result': {'dispatchStatus': 'completed', 'nativeResult': {'text': '{"x":1}'}}}
print(grade.grade_deterministic_item(p, item)['labels'])
p['deterministic'].update(kind='json-schema',
    expectedByTask={'t': {'type': 'integer', 'multipleOf': 2}})
item['result']['nativeResult']['text'] = '3'
print(grade.grade_deterministic_item(p, item)['labels'])
```

Lifecycle reproducer: load the same fixture, change only guards or kind as above, write the spec to a temporary directory, and call `run.run({specPath:absolute_spec, outputDirectory:absolute_new_run}, dispatch=fake)`. Fake returns completed native object with unique fake ID, correct task text (5 or BLUE), small usage and toolCalls 0. Count calls and saved terminals. This crosses production admission, grading and finalization; direct helper evidence alone would not establish the command/final-state wiring failure.

Initial review probe authoring had a record-key assumption and syntax errors; these were corrected before the reported results. They are not product failures or passing tests. The final probe output above is the observed result, not an unchanged rerun of expensive work.

## Historical read-only inspection, observed

Before and after the actual report CLI:

```text
S/.venv/bin/python -B S/scripts/run.py report --run-dir /absolute/R/run --format markdown
```

A local probe enumerated all descendants, rejected unexpected symlinks, streamed SHA-256 file contents in 1 MiB blocks and compared relative path, size, mtime_ns and digest, including directory metadata. It did not parse all native logs.

Observed: **exit 0; 148 entries identical; 33,272 stdout bytes; empty stderr**. No report backfill, lock repair, analysis recompute or model capability check was invoked. This preservation result is for that operation, not a promise arbitrary future report implementations are safe.

## Remaining unverified claims / future tests

- No live higher-concurrency or interrupted paid native run was launched.
- No runtime-wide effective-capacity query, cross-owner rate limit or hard descendant budget was demonstrated.
- No calibrated grader population, factual citation verification, batch equivalence, or end-to-end pairwise runner was demonstrated.
- No run-wide skill exposure/compliance conclusion, outer eval-failure diagnosis, or unrestricted research-workflow test was made.
- No old scientific failure was closed or criterion/seed changed.

These limits drive the ordered plan and validation gates. A build or passing existing helper suite alone cannot establish completion.

## Deliverable checks

Six Markdown files contain 17 findings, 10 ordered work packages and 24 validation cases. All 11 local document links resolve. Mechanical checks validated 89 source citations covering 107 line ranges after correcting range endpoints; this checks existence/range bounds, not semantic proof by itself. Final working-tree inspection showed only this review directory added beyond the pre-existing changes and benchmarks directory. No skill/runtime implementation file was changed.
