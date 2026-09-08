# Checkpoint-driven release manager

Status: recommended design, not implemented. Saving this document does not authorize actor creation or configuration changes in this session. Automatic commits and pushes are authorized for future operation within the agreed repository, branch, destination, and checkpoint policy, without per-operation confirmation.

## Operating model

One session-local persistent Fabric actor manages explicit workflow checkpoints. Commit synchronously, then push asynchronously.

```text
Implement → integrate → verify
                         ↓
              checkpoint request
              writers briefly pause
                         ↓
              actor creates commits
                         ↓
              writers resume
              actor pushes exact commit tip
```

A checkpoint is a completed, independently explainable outcome whose relevant checks passed, declared by Main or the workflow. Examples include a finished fix, a verified migration phase, or final task completion. One checkpoint may contain several coherent commits.

The local commits are the immutable checkpoint record. No separate content-snapshot mechanism is needed. Main supplies the completed outcome, eligible paths, and verification evidence. The actor owns inspection, grouping, messages, Git operations, and recovery.

### Stable commit boundary

- Wait for writers touching eligible files to finish before submitting a checkpoint.
- Pause shared-worktree edits and Git mutations until the commit request returns.
- Other isolated worktrees may continue. Their work becomes eligible only after integration; this actor is not a merge coordinator.
- Resume editing as soon as local commits exist. Push the recorded commit SHA, not whatever `HEAD` becomes later.
- The final workflow checkpoint waits for publication before claiming everything was pushed.

This is workflow synchronization, not a human approval gate. Local Git operations are usually short, but actor inference, hooks, signing, and network operations are not reliably instantaneous. Reuse existing checks and keep pushes outside the writer pause.

### Activation and lifetime

Use explicit `agents.ask` and `agents.tell` requests. Do not subscribe to host events or participant lifecycle events for release activation. `agent_settled` means a run stopped continuing, not that its changes are complete. Dashboard milestones such as `workflow.event()` are not checkpoint requests.

Use `scope: "session"` and omit `residency`. Fabric defaults residency to `"session"`; there is no `"none"` option. The actor retains context between checkpoints in this session and stops or suspends with its host. Saved definitions and history may remain, but no resident process continues committing or pushing. Reopening sessions or serving other root sessions is not required by this first implementation.

## Actor persona

> You manage checkpoint commits and pushes for this session.
>
> On initialization, inspect the task repository and Git configuration. Bind one canonical worktree, local branch, and unambiguous push URL and destination ref. Account for existing unpublished commits. Ask only when the destination or included history cannot be resolved from the agreed policy.
>
> On a commit checkpoint, inspect the declared completed outcome, eligible paths, diff, and verification evidence. Reuse passing checks when their tested content and relevant dependencies remain unchanged. Run only missing or invalidated checks.
>
> Commit only completed eligible changes. Leave unrelated work untouched. Defer files containing mixed completed and ongoing edits. Preserve existing staging; if its ownership is unclear, return a blocker to Main.
>
> Group changes by independently explainable intent. Keep implementation and its tests together; avoid artificial file-by-file commits. Write an imperative subject and a short body explaining why, material behavior, and verification. Include the checkpoint identifier.
>
> Record resulting commit SHAs before returning. On push requests, publish only the recorded checkpoint tip to the bound destination using a normal, explicit, non-force refspec.
>
> Before repeating work, reconcile checkpoint records with local and remote Git history. Do not create another commit for an already committed checkpoint. An uncertain push requires observation before retry.
>
> Preserve hook and signing requirements. Return code or integration failures to Main rather than implementing fixes. Escalate to the user only for unresolved authorization, destination, credentials, or consequential history choices.
>
> Keep successful reports to one line. Do not publish packages, create tags, bump versions, or deploy.

## Fabric settings and template setup

The following snippets describe future setup, not operations performed while designing the actor. `PERSONA` denotes the persona above.

### Reusable template

```ts
await agents.create({
  name: "checkpoint-release-manager",
  scope: "global",
  instructions: PERSONA,
  runner: "pi",
  transport: "process",
  extensions: true,
  tools: ["read", "grep", "find", "ls", "bash"],
  events: [],
  topics: [],
  coalesce: false,
  responseMode: "directive",
  delivery: "nextTurn",
  triggerTurn: false,
});
```

| Setting | Recommendation |
| --- | --- |
| Live actor scope | `session` |
| Residency | Omit; defaults to `session` |
| Activation | Explicit `agents.ask` / `agents.tell` |
| Host/lifecycle subscriptions | None |
| `validWhile` | Omit |
| Success delivery | `nextTurn`, without waking Main |
| Genuine blocker | Explicit follow-up to the requesting Main |
| Model | Inherit the project's configured capable coding model |

`validWhile` is not a Git safety mechanism. It can discard stale queued activations or completed responses, but cannot undo side effects. A checkpoint should be reconciled explicitly rather than silently discarded because Main continued working.

### Configuration requirements

Merge these requirements into the applicable project configuration rather than replacing existing settings:

```json
{
  "fullCodeMode": true,
  "executor": { "kernel": "typescript" },
  "agents": { "enabled": true },
  "mesh": { "enabled": true, "actorScope": "session" },
  "approvals": {
    "read": "allow",
    "write": "allow",
    "execute": "allow",
    "agent": "allow"
  }
}
```

Schema enforce mode is incompatible with this actor design. These approval settings are broad project/session permissions, not an actor-specific Git sandbox. That matches the fully trusted actor decision. Allowed shell execution also permits Git's network traffic; a separate Fabric network-risk restriction does not constrain networking inside an allowed shell command.

Do not use `ask` or model-based `auto` approval for routine checkpoint operations: both can introduce interactive gates in unattended execution. Git credentials, signing, and hooks must also be usable unattended; inability to satisfy them is a blocker, not permission to bypass them.

Import once per session and retain the actor ID:

```ts
const actor = await agents.import({
  name: "checkpoint-release-manager",
});
```

Import takes its live scope from `mesh.actorScope`; it has no scope override. Global templates contain definitions, not session history.

In the researched profile, the template registry resolves under:

```text
/home/balauru/.pi-profiles/fabric/fabric/actors/
```

Keep `PI_CODING_AGENT_DIR` bound to `/home/balauru/.pi-profiles/fabric`. Never fall back to the blacklisted `/home/balauru/.pi/agent` profile.

Research-time implementation caveat: template import omitted stored `kernel` and `requires`, despite documentation describing kernel preservation. This design inherits TypeScript from configuration and does not rely on imported capability requirements. Recheck that implementation detail when implementing or upgrading.

## Policy, configuration, and transient state

Keep three small layers:

1. **Template:** stable persona and actor settings.
2. **Session binding:** discovered repository, branch, destination, requesting Main identity, and initial history baseline.
3. **Checkpoint record:** outcome, eligible paths, verification evidence, resulting SHAs, and publication status.

Use existing mesh state for checkpoint records, keyed by session and checkpoint ID. Compare-and-swap supports claims and updates. Git remains authoritative when a record disagrees with observable effects. Actor memory alone is not a sufficient recovery ledger.

### Automatic repository and destination binding

Inspect the task repository and its effective Git push configuration, including push-remote overrides. Do not assume `origin`, or equate the upstream with the push destination.

Bind a canonical repository/worktree, local branch, destination URL, and destination ref once when unambiguous; revalidate before pushing. Account for any existing commits ahead of the destination, because pushing a checkpoint may publish that ancestor history too.

Ask only when configuration is missing, conflicting, multi-destination, changed, or otherwise leaves a consequential publishing ambiguity. Detached HEAD or uncertain worktree selection also needs resolution rather than a guessed branch.

No configuration skill is needed initially. Package this setup procedure as a skill only if reuse warrants it.

## Checkpoint contract

The smallest request payload is:

```ts
{
  id: "auth-refresh-rotation",
  outcome: "Reject reused refresh tokens",
  paths: ["src/auth/refresh.ts", "test/auth/refresh.test.ts"],
  evidence: "Reference to passing checks and the content they tested"
}
```

The sender asserts that eligible work is complete and relevant writers are paused. Evidence can reference existing workflow results rather than duplicating logs. It must identify the tested content and relevant dependencies sufficiently for the actor to detect staleness. A bare claim that tests passed is not enough.

Repository and destination information belong in the session binding, not every checkpoint payload. The actor records commit SHAs and status under the session-qualified checkpoint key.

### Minimal workflow integration

```ts
await agents.ask({
  id: releaseActorId,
  message: "Commit checkpoint; record committed or blocked status.",
  data: checkpoint,
});

// Inspect the recorded result. Only after status is committed:
await agents.tell({
  id: releaseActorId,
  message: "Push recorded checkpoint.",
  data: { id: checkpoint.id },
});

// Resume workers without waiting for the push.
```

A successfully returned API call is not proof that commits were created: inspect the checkpoint's recorded status. For the final checkpoint, use a blocking publication request or another explicit completion check instead of assuming the queued push finished.

Routine successful push reports arrive passively on Main's next turn. Genuine blockers go to the exact requesting Main through an explicit follow-up. Main decides whether a blocker can be resolved by ongoing implementation or actually needs the user.

## Failure and recovery policy

| Situation | Response |
| --- | --- |
| Repeated checkpoint | Inspect record and Git; reuse existing commits |
| Interrupted commit | Reconcile checkpoint trailer, parent, and tree before proceeding |
| Push timeout | Query destination; distinguish published, safely retryable, and unresolved |
| Transient connectivity failure | Bounded retry after reconciliation |
| Hook/check failure or conflict | Return to Main; preserve work |
| Diverged remote | Return integration blocker to Main; no automatic history rewrite |
| Missing credentials or ambiguous destination | Ask user for the missing decision/access |
| Session closes before push finishes | Execution stops; do not claim publication |

Use the recorded checkpoint tip for pushes. If a newer checkpoint is already published, reconcile ancestry rather than trying to move the destination backwards. Never blindly repeat a commit or infer push failure merely because the command's response was lost.

An interrupted run can leave a local commit without a completed mesh update, or a published commit without a recorded success. Recovery observes both systems before deciding whether another side effect is necessary. There is no transactional commit spanning Git and mesh state.

## End-to-end example

Workers finish refresh-token rotation and its tests. An unrelated documentation experiment remains dirty.

Main submits `auth-refresh-rotation` with the two eligible paths and passing test evidence. Relevant writers pause. The actor verifies that evidence still matches and creates:

```text
fix(auth): reject reused refresh tokens

Invalidate the previous token during rotation to prevent replay.
Verified with the refresh-token regression suite.

Checkpoint: auth-refresh-rotation
```

The actor records the resulting SHA and returns. Main queues publication and workers begin the next task. The actor pushes that exact SHA to the session-bound destination, leaving the documentation experiment untouched.

Main receives on its next turn:

> Pushed `a1b2c3d`: refresh-token replay protection. Existing checks reused.

No user confirmation is requested for the commit or push.

## Guarantees and limitations

**Fabric guarantees:** serial actor activations, scope/lifetime behavior, delivery policy, owner routing, and mesh compare-and-swap. Participant lifecycle subscriptions are source-qualified but can deliver at least once after a crash; they are not used for checkpoint activation here.

**Actor/protocol responsibilities:** completed-work judgment, evidence validity, cooperative writer coordination, repository/branch/destination restrictions, coherent commit grouping, and Git reconciliation. General `bash` access is fully trusted, not narrowly confined to Git.

Fabric does not lock the repository, stop unrelated writers, provide exactly-once Git effects, or make Git and mesh updates atomic. `validWhile` does not roll back effects. Session shutdown does not prove a push completed.

## Alternatives considered

- **Capture first, commit later:** immutable Git trees and a separate index could let workers resume before actor review, but require careful branch/index reconciliation. Not selected because resuming after local commits is sufficient.
- **Durable residency:** unnecessary for this first implementation; execution should stop with its session.
- **Project-scoped actor:** could coordinate multiple sessions, but adds ownership and host-exit questions. Defer until cross-session publishing is a requirement.
- **Ambient lifecycle activation:** cannot establish semantic completion or a stable Git boundary. Use explicit checkpoint requests.
- **Narrow Git broker:** unnecessary under the fully trusted actor decision.

## Research references

Paths below are relative to this document and point to the Fabric package in the permitted profile:

- [Agents, actors, lifecycle subscriptions, delivery, and templates](../npm/node_modules/pi-fabric/docs/agents.md)
- [Agent API reference](../npm/node_modules/pi-fabric/skillsets/typescript/fabric-exec/references/agents.md)
- [Mesh state, topics, and compare-and-swap](../npm/node_modules/pi-fabric/skillsets/typescript/fabric-exec/references/mesh.md)
- [Configuration and unattended approval behavior](../npm/node_modules/pi-fabric/docs/configuration.md)
- [Residency runtime](../npm/node_modules/pi-fabric/docs/residency-runtime.md)
- [Schema enforcement](../npm/node_modules/pi-fabric/docs/schema-enforcement.md)

Live action schemas were inspected during research. Revalidate relevant schemas and the noted import caveat before implementation.
