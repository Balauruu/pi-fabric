# Workflow Composition

Read before authoring execution blocks. This reference owns how chosen Fabric mechanisms connect; mechanism selection belongs to the sibling reference and the parent skill owns the authoring process.

## Make the boundaries executable

For each meaningful block specify:

| Contract | Author must supply |
| --- | --- |
| Use and prerequisite | Observable branch condition; completed earlier work and required capabilities |
| Inputs | Exact named payload keys, their format and producer; source paths/handles and validation |
| Action and owner | Runnable body, locally defined helpers, permitted tools/effects, and who may mutate what |
| Output | One authoritative result contract and the projection returned to Main |
| Next | Exact consumer and next action, including Main's semantic judgment or a user pause |
| Completion | Observable success, useful partial, blocked, cancellation or stop condition |

Apply this as a completeness test, not repeated ceremonial headings. Author task-specific code, not a universal scaffold. An example is not executable if it depends on unspecified imports, undeclared helper functions, fictitious API fields, literal placeholder identities, or evidence the executor has not obtained.

Use `fabric_exec` as the execution path. Core tools use `pi.*`; captured tools use `extensions.*`; MCP calls and stable providers use their documented proxies. Reserve `tools.call({ref,args})` for discovered or computed refs. Pass quote-heavy or multiline content via named `payloads`, using exactly the matching `π.key`. Use current return envelopes, not guessed success predicates.

## Choose the invocation boundary

- **One program:** keep deterministic loops, scheduling, transformations and bounded intermediate data local while their prerequisites are available. Parallelize independent calls, sequence dependent ones. Pass thunks to Fabric `parallel`, not already-started promises.
- **Main judgment:** return the candidates and evidence Main must inspect. Name the next decision and what its resulting input means. Main performs semantic verification and final integration rather than executing a placeholder `verify()` function.
- **Another invocation:** local variables and helpers are gone. Pass the needed small values as fresh named payloads or reload an explicitly identified artifact. A path or handle is useful only if the next executor can access and interpret it.
- **User interaction:** end the invocation, ask the scoped question, then supply the confirmed answer to the next block. Do not pretend a QuickJS local variable waits across user turns.
- **Persistent execution:** use actual actor/agent identity and supported lifecycle state, not a background promise held by a finished program.

### Small direct composition example

For a TypeScript-kernel skill whose confirmed task is counting lines in supplied text, a complete execution body can be this small. For another configured kernel, author the equivalent native program using its installed contract. Input: `payloads.text`, the user's exact text. Output: `{lines}`. Main reports the count and stops; empty text has zero lines and a terminal newline terminates the last line rather than adding an empty line.

```ts
const text = π.text;
const lines = text.length === 0 ? 0
  : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
return { lines };
```

The actual task determines parsing semantics. This example needs no worker, persistent state, schema file or tool preflight. Do not expand it into fan-out to appear Fabric-native.

## Finite delegated composition

Author the actual dispatch, collection and continuation blocks for the task; do not stop at this outline:

1. Main sizes and normalizes the inventory. Deduplicate without erasing required work; identify dependencies, limits and output ownership. If decomposition is unknown, perform bounded orientation first.
2. Give each worker its purpose, owned input/scope, constraints, permitted effects, required capabilities, output contract and stop condition. Carry task policy into the actual executor, including runner/model requirements when the task has them. Grant required optional/captured tools explicitly. A tool list is not proof of enforcement or filesystem isolation; verify the child's effective access before relying on it.
3. Choose workflow helper output or native `agents.run` outcomes deliberately. Native resolved failures may have useful `value` or `text`; a returned envelope is not necessarily successful execution. Catch failures inside each independent branch. Observe native status/error as well as thrown exceptions.
4. Bound and dispatch checked batches using native concurrency constraints and task-specific limits. Reserve room for verification and integration. Observed token/cost budgets may settle after concurrent calls; do not promise hard reservations. An all-failed/systemic batch calls for diagnosis before new dispatch, not unchanged repetition.
5. Collect all requested items as completed, failed, not started, cancelled or indeterminate as appropriate. Keep successful siblings and inspect useful partial output. Return bounded candidate evidence and missing coverage to Main.
6. Main verifies against source/final state, accepts or qualifies useful output, and integrates the task result. If judgment needs another invocation, explicitly transfer candidates/evidence and Main's decisions. Repair only material missing work within remaining authority and budget, or report the gap and stop.

Execution status and substantive adequacy remain separate. A failed worker can be repaired directly without relabeling it completed. A completed worker can supply unusable output. Synthesis failure must not erase the available findings. When cancellation can prevent an outer return, preserve supported recovery handles/state before claiming partial results are guaranteed recoverable.

**Code-to-contract gate before delivery:** inspect the emitted dispatch loop, not just the surrounding prose. Locate the actual stop-dispatch predicate and how it records undispatched items. Check that each returned native envelope preserves `id` alongside status and usable output, including storage/verification failures. Trace an all-failed batch and a failed sibling with useful text through the code. If the loop always advances or the projection silently clips away partial evidence without a recovery route, correct the code before calling the package usable. A later instruction for Main cannot retroactively stop dispatch inside a still-running program. Use discovered recovery handles for retained native text, or reduce dispatch to fit; do not require artifact writes in a read-only task.

For concurrent edits, give each path one writer or isolate worktrees, then name the integration owner and post-integration checks. Partitioned source does not remove cross-partition dependencies.

## One authoritative data contract

Use JSON Schema when machine aggregation benefits, not for every return. Define each data object once, inline or in a schema file as scale warrants; reuse it in worker requests, validation, aggregation and final output. Distinct stage envelopes may wrap the same data without redefining its meaning.

A well-formed value does not establish correctness, tool execution or evidence support. Keep native execution metadata separate from task data and Main's semantic disposition. Required output slots remain explicit gaps when unsupported; do not force findings into a preferred answer or discard useful data over irrelevant metadata.

## Recover ambiguous effects proportionally

A read-only single call rarely needs a persistent ledger. Dispatch ceilings, non-idempotent effects, multiple invocations, or recovery requirements may justify stronger accounting.

- Record the intended operation/assignment and attempt before effects when losing that fact would permit an unsafe duplicate. Preserve confirmed returned identities even if later storage fails.
- Distinguish confirmed failure from unknown outcome. A timeout, rejected promise, cancelled outer call, or failed receipt write does not prove that a launch/publication never happened.
- Reconcile through supported status, receipts, logs or artifact read-back before replay. Reuse a still-live worker when appropriate. Repair missing work rather than silently replacing its identity or restarting successful siblings.
- If identity or outcome cannot be recovered, keep it indeterminate and report the blocked recovery. Do not remove reservations merely to make the accounting look complete.

State guarantees precisely: atomic visibility is not multi-file transactions, power-loss durability, or exactly-once external execution. Verify any required shell/library dependencies before adopting a storage implementation; no packet format is prescribed here.

## Bound context without losing required information

Keep unused intermediate data inside the program. Return needed evidence, decisions, failures, coverage counts and next steps, not opaque native objects or complete histories. Bound nested fields as well as row counts.

When required information exceeds the return budget, retain it in an authorized recoverable artifact or supported handle and expose omissions, total coverage and a concrete continuation. Verify read bounds, serialization, access from the next executor, publication and lifetime. Page required information before final integration; never cite or dispatch using clipped identifiers. If safe retention is unavailable, narrow dispatch or report the limitation rather than silently truncate required results.

Choose storage only for actual scale or lifecycle needs. Assign ownership, validate a reload/roundtrip, and define retention/cleanup without deleting user data. Mesh/state/provider semantics are not interchangeable scratch stores.

## Persistent and event-driven composition

Author runnable startup, status/recovery, event behavior and stop blocks with explicit payloads. Treat these as connected lifecycle operations, not an illustrative create call followed by prose.

- Establish identity and ownership. On repeated invocation, inspect/reuse a matching owned resource or request a consequential replacement decision. Do not create duplicates because startup acknowledgement was lost; reconcile the ambiguous attempt first.
- Select events, source scope, delivery, turn triggering, coalescing and silence criteria deliberately. Event names and delivery combinations must match effective schemas. Define how repeated events or resumed delivery avoid duplicate effects and self-sustaining warning loops.
- Separate session/project definition scope, independent runner history, and residency. Host survival requires supported durable execution and its prerequisites, not merely a project-scoped definition. Cwd does not change profile or confer project trust.
- Pass policy and dependencies to the actor's actual runner. Parent access, `requires`, and prompt instructions do not independently establish child authority. Restrict tools and further delegation according to the task.
- Verify startup state and return only the confirmed ID, relevant lifecycle status and exact stop path, not an entire actor object containing instructions/history. Creation without verification remains an uncertain startup, not success.
- Consume terminal notifications, lifecycle subscriptions or `wait` where appropriate rather than model-authored polling loops. Redirect still-live work when it preserves useful context.
- Stop/unsubscribe/remove only owned resources through supported owner-aware controls and verify the outcome. Preserve recovery identifiers if cleanup fails. Define what survives stopping and what is retained; cleanup must not destroy required evidence or unrelated resources.

A session-scoped advisory observer should not acquire durable residency, mesh task claims, external effects or repair authority without a task need. A durable coordinator, by contrast, must actually specify ownership loss, reattachment and recovery.
