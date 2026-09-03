# Execution Lifecycle

Use this reference for scored attempts, bounded Analyze stages, model graders, resumable waves, and lifecycle reconciliation. The schemas own machine field names and enums. The frozen protocol, schedule, and stage plan own which IDs may run.

## Current Fabric attempt contract

For Pi Fabric 0.75.0, execute a measured attempt with direct `agents.run` inside one type-checked `fabric_exec` program. `agents.run(request)` blocks until the one-shot child is terminal and returns a `FabricAgentResult`. Preserve the complete returned object, including:

- `id`, `name`, `runner`, `transport`, `cwd`, `model`, `thinking`, and optional `runnerSessionId`;
- `status`, `text`, optional `value` and `error`;
- `startedAt`, optional `finishedAt`, `turns`, `toolCalls`, and `usage`;
- optional session, log, worktree, branch, and pending-message fields when present.

The result is evidence, not the whole benchmark record. Retain the exact request, coordinator observations, full result, and authorized session or run log evidence. Never synthesize an absent `runnerSessionId`, provider identity, timestamp, or usage field. `FabricAgentResult.model` is Fabric-resolved metadata, not independent provider-observed attribution.

Use `agents.run` for measured attempts and model graders. `workflow.agent` may support bounded design inventory, semantic audit, or report review only. It does not expose enough identity, lifecycle, usage, turn, tool-call, or session evidence for measurement. Direct `agents.run` traffic does not count against workflow token-budget accounting, so enforce frozen agent-count and concurrency ceilings in the coordinator.

## Attempt state machine

Each sealed schedule row has one immutable `attempt_id` and follows exactly one path:

```text
never assigned -> assigned -> terminal(not-started)
never assigned -> assigned -> started -> terminal(started)
```

`assigned` means the coordinator durably committed the exact sealed row before calling `agents.run`. It is not proof that a process started. `started` requires runtime evidence, such as the returned Fabric `startedAt` bound to the same result ID and corroborating session or run evidence when available. A prelaunch rejection or coordinator failure without that evidence terminates with `startup_state: not-started` and no started record.

`agents.run` is blocking. The current API can return `startedAt` only with the terminal result, so a coordinator may be unable to publish a crash-safe started record while the call is in flight. If it writes the started projection after return, label its source and publication time and do not present publication sequence as live occurrence chronology. Do not claim crash-safe in-flight start publication without a targeted runtime canary proving it.

Publish terminal last. A terminal record is valid only after all required raw artifacts have been durably created, hashed, and bound to the attempt. A thrown call still receives a terminal failure record from the supervisor, with the thrown error preserved and startup state supported by evidence.

## Write-once artifact protocol

All scored attempt, grader, checkpoint, freeze, and correction artifacts are create-only.

1. Validate safe benchmark-relative paths and reject symlinks or ownership escapes.
2. Serialize deterministically to a temporary file in the destination directory.
3. Flush the file and, where supported, its directory.
4. Publish with a create-only operation that fails if the destination exists.
5. Never reopen a published artifact for modification.

A rename that can replace an existing path is not write-once. Use the bundled write-once helper for machine artifacts. Preserve original bytes. Corrections create a linked revision and state why the original remains authoritative evidence of what occurred.

A minimal attempt projection is:

```text
attempts/<attempt-id>/
  assignment.json
  request.json
  result.raw.json
  started.json                 # zero or one
  terminal.json                # exactly one, published last
  logs/                        # authorized immutable exports or pointers
  artifacts/                   # final state and decisive evidence
```

The applicable schemas, not this example, define required fields. One artifact has one owner. Record content digests for every terminal-owned artifact and reject duplicate ownership across attempts, graders, children, or revisions.

## Preflight and launch

Before the first assignment in an execution revision:

1. Pass the runtime-capability gate. Pin versions and prove the fixed runner can express recursion/cwd, stage selection, native-log access, output bounds, and the effective call cap required by the condition. Otherwise return `unsupported` before mutation.
2. Pass the protected-state gate. Capture declared protected roots and prove isolation for every task-relevant mutable surface. A pre-existing mismatch or unsafe plan is `blocked`; do not clean evidence to manufacture a pass.
3. Verify the design and execution seals byte-for-byte.
4. Validate every task, condition, schedule row, grader contract, stage ID, and global call reservation.
5. Compile and type-check the exact fixed Fabric program.
6. Pass deterministic fixtures and non-scoring canaries for condition loading, model attribution, total mechanism evidence, fresh state, scheduler behavior, lifecycle failure, and resume.
7. Prove frozen concurrency and the lower requested/configured/observed call ceiling against the actual runner and service regime.
8. Create fresh per-attempt process/session state and isolate all task-relevant mutable workspace, home/config, memory, browser/account, cache, credential, and tool-server state.

Any static, seal, schedule, or canary defect fails before assignment. Once assignment exists, the row remains in attempt accounting even if startup fails.

## Checkpointed waves

A resumable invocation processes only one or more sealed waves and only rows eligible under the resume rules. Within a wave:

- commit every assignment immediately before its call;
- enforce the frozen maximum live-agent count with an explicit semaphore or bounded batch;
- collect calls with failure-inclusive settlement, such as `Promise.allSettled`;
- let each worker publish its own terminal from a `finally` path, then reconcile centrally;
- never start model graders while scored attempt traffic remains active unless overlap is itself sealed as a condition.

At invocation end, create a checkpoint receipt listing the execution revision, schedule and seal digests, considered wave IDs, never-assigned rows, newly assigned rows, terminal rows, ambiguous rows, and the next legal action. A receipt reports state; it does not make an incomplete wave complete.

## Resume decision

Classify each sealed row from immutable artifacts:

| State | Resume action |
| --- | --- |
| Valid terminal exists | Skip. Never call the model again for this ID. |
| No assignment exists | The row may run if its sealed wave is selected. |
| Assignment exists, no terminal exists | Ambiguous in flight. Refuse replay under this ID. |
| Terminal exists but is malformed or ownership fails | Refuse replay and audit the packet. |
| Invalid attempt has a sealed retry row with a new ID | Run only that never-assigned retry row under the frozen policy. |

Do not infer completion by polling session files, UI widgets, process lists, or terminal prose. Do not launch a replacement merely because no child is currently visible. An assigned-without-terminal row may have incurred a provider call or produced an uncollected result.

A serialization-only repair may close a record under the same ID only when all semantic output and decisive evidence already exist as immutable bytes from the original invocation. It may parse, normalize, hash, or publish a missing projection without any model call, tool call, new evidence, changed prompt, or workspace mutation. Record the parser/version, source and output digests, repair time, and added local cost. If those conditions are not provable, preserve the ambiguity and use a new retry ID already present in a new or previously frozen schedule revision.

Every model/tool retry after terminal state uses a new ID linked to its predecessor. Never overwrite failure, silently exclude it, retry until success, or count a repaired/retried success as first-attempt success.

## Bounded Analyze stages

Freeze the zero-call preparation closure, exact `judge` batch call plans, exact `adjudicate` batch call plans, and zero-call `finalize` before grading. Every stage commits inputs and assignments first, publishes one typed terminal per planned call, reconciles exact IDs and global reservations, then publishes its checkpoint last. Missing/null call results keep the stage at `checkpoint` or `failed`; they never count as complete. Recursive descendants consume the same coordinator-owned reservation even if Fabric managers enforce only local counters.

Resume a stage by immutable state: skip valid terminals, block assigned-without-terminal IDs, and run only never-assigned planned IDs. Finalize verifies all stage checkpoints, active revision/delta seals, telemetry versions, and grading closure, performs no model call, and deterministically publishes analysis and report outputs. If the fixed runner/schema cannot select these stages, return `unsupported`; do not create bespoke TypeScript.

## Raw freeze and grading handoff

After all scheduled attempt rows are terminal:

1. Reconcile schedule, assignments, starts, terminals, result IDs, artifact ownership, logs, and retries exactly.
2. Create the raw freeze over original responses, final states, traces/logs, and terminal records.
3. Verify the freeze locally by bytes and digest.
4. Generate a condition-private blind map only after the freeze.
5. Run model graders through separate `agents.run` calls with new grader IDs and separate traffic accounting.
6. Publish immutable grader terminals and reconcile them before analysis.

Never repair or normalize raw output in place. The grader consumes the frozen raw artifact or a deterministic, versioned projection whose source digest is retained.

## Exact lifecycle reconciliation

Reconciliation fails closed unless all of the following hold:

- schedule row, assignment, and terminal are one-to-one by attempt ID;
- assigned schedule fields exactly equal the sealed row;
- each attempt has zero or one started record, and its presence agrees with terminal `startup_state`;
- event/projection sequences are monotonic in publication order and do not masquerade as occurrence chronology;
- every terminal points to one full raw Fabric result or to a preserved prelaunch exception;
- every result, session/log pointer, grader, child, and artifact has one valid owner;
- retries and repairs link to retained predecessors and use legal new IDs where required;
- no failure, cancellation, timeout, unverified treatment, or malformed output disappeared from a denominator;
- all design-owned and execution-owned bytes still match their seals;
- raw freeze and grader freeze, when required for the phase, verify exactly.

A structurally valid failure packet may be auditable, but it is not benchmark-complete. See [audit and reporting](audit-and-reporting.md) for the completion gate.
