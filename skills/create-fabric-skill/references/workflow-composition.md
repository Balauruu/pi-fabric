# Workflow Composition

Read before authoring execution blocks. Mechanism selection owns runtime grounding and operational limits. This reference owns shared data flow, outcome handling, and effects. Branch references own finite delegation examples and persistent lifecycle implementation. Examples are generic construction checks, not a required architecture or permission to launch them.

## Make every boundary executable

For each meaningful block identify its prerequisite and branch condition, exact inputs and named payload keys with producers, action owner and permitted effects, native result handling, output contract, next consumer, and observable completion. This is a completeness test, not mandatory headings. All helpers must be defined in that block or loaded from an identified authoritative file.

Use the configured kernel. Keep code-owned loops, transformations, phases and data in one invocation when possible. Return only useful evidence and decisions to Main. End the invocation for user decisions or Main's semantic judgment, then explicitly pass resulting values into the next block. Guest locals do not survive another invocation. A file/handle transfer must specify access, format, retention and recovery.

Pass arbitrary or multiline data in top-level `payloads`; only matching `π.key` values exist. Parse JSON to `unknown` and validate before use. Request factories may interpolate validated data into a prompt at runtime, never into generated TypeScript/Python source. JSON serialization does not make untrusted content higher-priority instructions. Do not construct shell commands by interpolating arbitrary task data either.

Define each substantive data contract once. A JSON Schema can own machine-aggregated data; requests and consumers reuse it rather than invent stage-specific variants. Keep native status, errors, usage, IDs and partial text separate from substantive data and Main's semantic acceptance. `agent`/`workflow.agent` unwraps `value` or text and throws on non-completion. Use `agents.run` when useful failed output or native status matters. Schema validity proves shape, not correctness or tool execution.

Define a separate relational contract for each structured boundary. State and enforce applicable dynamic invariants after shape validation and before effects or semantic acceptance: returned identity equals assigned identity; every required ID occurs exactly once; foreign IDs and references are rejected; references point to members of the originating input and match the assignment, question, or record association defined there rather than merely any valid member; and derived counts, statuses, paths, receipts, and handles agree with the accepted records. Do not let `Set` or `Map` normalization silently turn duplicate or foreign data into valid data. Deduplicate for presentation only after validity is established.

## Finite outcome and effect contract

Every generated finite path must implement applicable outcomes in code, not promise a later instruction will repair a missing branch:

| Evidence                                   | Handling                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completed native run                       | Preserve data and evidence. Main checks substantive adequacy before claiming task success.                                                              |
| Confirmed failure                          | Preserve ID, error, usage and useful partial output. Do not erase successful siblings.                                                                  |
| Unavailable prerequisite                   | Block before affected effects. Name the missing action, tool, model, input, trust or mode. Independent work continues only if the task permits it.      |
| Confirmed cancellation or native `stopped` | Stop new dispatch. Preserve receipts and completed siblings. Do not translate cancellation into successful completion.                                  |
| Native `timed_out`                         | Keep the native state and partial text. Stop or continue other work according to task policy. Reconcile effects before replay.                          |
| Partial coverage or failed synthesis       | Return usable results plus exact gaps and failed verification. Never rerun successful branches by default.                                              |
| Indeterminate launch/effect                | Keep intended assignment and known handles. Reconcile supported status/logs/receipts before replay. A rejected call is not proof that nothing happened. |
| Undispatched work                          | Record identity and why it was not started. Do not invent a result.                                                                                     |

Apply a failure-conservation invariant to every confirmed or indeterminate effect failure. Never claim a successful path, receipt, or handle unless it is verified; preserve known indeterminate handles with that state. Whenever execution can return after the failure and still holds useful payload, expose that exact payload through one authoritative returned fallback or verified durable handle, without conflicting duplicate representations. Preserve successful siblings and their identities unchanged. A design that cannot preserve required payload must block before the effect or declare before execution that recovery is not guaranteed; it cannot classify the failed path as satisfying failure conservation. Behavioral tests compare preserved content and recovery identifiers, not only status labels or path absence.

Define initial state, transitions, transition evidence and one updater for every task state that must persist. Default to Main/workflow code as sole writer of shared artifacts. Give a child write ownership only when its assignment requires it. Concurrent writers need disjoint paths or isolated worktrees, an integration owner and post-integration checks. Idempotency, claims or durable receipts are earned by ambiguous effects/recovery needs, not added to every read-only loop.

A cancelled outer invocation may never return its local partial array. When guaranteed recovery is required, publish authorized receipts or handles before relying on them and test read-back. Otherwise state this limit and use retained runtime logs for best-effort recovery. Never claim exactly-once external effects from CAS storage or file rename alone.

Bound the actual stop-dispatch predicate, inventory, nested data and output size. Preserve full identities. If required evidence cannot fit, use supported paging/handles or authorized artifact retention with explicit lifetime and next consumer. If no safe retention is available, reduce dispatch or block rather than silently clip required information.

## Example A: direct work without invented delegation

Prerequisite: TypeScript kernel, supplied text within the invocation payload limit. Main supplies `payloads.text` as the user's exact text. The workflow performs no host effects. Output is `{lines}` consumed by Main, which reports it and stops. Empty text has zero lines; a terminal newline terminates the last line rather than adding an empty one. A different task must define its own parsing semantics.

```ts
const text = π.text;
const lines =
  text.length === 0
    ? 0
    : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
return { lines };
```

Bad construction: fan out “counter” and “verifier” agents for this deterministic operation. Deleting those agents removes only names and overhead.

## Select branch references

After mechanism selection, read only the references whose conditions apply. For mixed designs, read each selected branch once. These links do not authorize example execution.

| Selected mechanism | Read before authoring that branch |
| --- | --- |
| Direct work without finite delegation or persistent actors | No additional composition reference. Example A above illustrates direct execution. |
| Finite independent delegated assignments | [Finite delegation](finite-delegation.md), including its linked preflight before adapting Example B. |
| Persistent actors | [Persistent lifecycle](persistent-lifecycle.md), including its linked preflight before adapting Example C. |

For mechanisms not illustrated here, use the shared rules and selected installed documentation from mechanism selection. Do not load an unrelated example merely to fill the gap.
