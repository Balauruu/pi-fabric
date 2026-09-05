# Mechanism Selection for Fabric-Native Skills

Read this reference before choosing an architecture. It is a decision aid, not a capability inventory or replacement for installed API documentation.

## Select for quality and fit

1. Map the confirmed quality criteria to evidence-producing steps: source grounding, independent alternatives, adversarial checks, executable tests, human judgment, or coverage accounting.
2. Identify the execution shape: bounded or open-ended; sequential or independent; one context or oversized; one turn, multiple turns, or surviving the host; advisory or effectful.
3. Compare the strongest feasible architectures. Evaluate expected evidence quality, independence, context loss, coordination risk, and operational fit. Treat cost/latency as the user's constraints, not an automatic preference for the cheapest option. Avoid numeric quality scores without a real evaluation method.
4. Select a primary shape and any orthogonal mechanisms that add a distinct quality benefit. Specify an acceptance check for each claimed benefit. Use fewer mechanisms to break a genuine quality/fit tie, not to override a better design.
5. Verify current contracts and prerequisites. A design may be conditionally feasible; do not claim optimality across models or tools you did not evaluate.

## Execution shapes

| Observable need | Native shape | Quality contribution and boundary |
|---|---|---|
| Tightly coupled work with enough context and no useful independent roles | One `fabric_exec` program using `pi.*` and known provider proxies | Preserves shared context and coherent decisions. Direct work can still include strong tests and an evidence loop. |
| One bounded delegated responsibility | `agent()` / `workflow.agent()` or `agents.run()` | Gives one worker an explicit evidence and output contract. A child is not automatically a verifier. |
| Finite independent items or repeated stages | `workflow` with `parallel(thunks, { concurrency })` or `pipeline(items, ...stages)` | Makes coverage and stage dependencies explicit. Keep dependent stages ordered and partial results available. |
| Complementary independent roles on the same question | `council.run()` or explicitly composed role workers and synthesis | Surfaces distinct failure modes. Use specific roles, evidence access, and preserved disagreements, not duplicate generic reviewers. |
| Model diversity materially improves alternatives or critique | Fusion-shaped native agent calls: read-only references plus judge/verifier, or references plus one authorized implementer | Resolve genuinely distinct available models. Same aliases are not diversity; agreement is not truth. Compare mode does not acquire mutation authority. Verify low-level APIs rather than inventing a `fusion.*` provider. |
| Relevant source exceeds a single context | RLM-shaped orientation, deduplicated partitions, plain agents for context-sized leaves; `rlm.query()` only for still-oversized partitions | Preserves coverage without repeatedly serializing the corpus. Difficulty alone does not justify recursion. Account for seams and cross-partition dependencies. |
| Long-running finite work needs observation and redirection between turns | `agents.spawn()` with status, steering, and terminal delivery/wait as appropriate | Retains a valuable worker rather than restarting it. Distinguish a background handle from a resumable orchestration program. |
| Ongoing advice, goal supervision, or spec compliance | `agents.create()` with explicit events, delivery policy, and stop controls | Maintains an outside observer or evidence ledger across activations. Specify when it may interrupt, trigger another turn, or stay silent. |
| Multiple workers must coordinate durably | Actors plus `mesh` messages/topics and CAS task claims | Gives durable ownership and recoverable task transitions. Host survival additionally requires supported durable residency, not merely project scope or mesh storage. |
| Mutation needs evidence-bound transactions | `schema.hypothesize()` → `schema.verify()` → `schema.commit()`, with abort/recovery paths | Provides the documented transaction guarantees only under actual prerequisites. Check `schema.status()`; audit is not enforcement, and a proposal is not a committed transaction. |
| An authorized continuation needs the current trajectory or model handoff | `agents.handoff()` or a documented model-switch path | Avoids rebuilding necessary context. Handoff is deferred to the outer execution boundary; later code in that invocation cannot consume its result. Not a default fan-out mechanism. |

Choose from the observed need, not from the task's label. A large migration may require a finite workflow, oversized-context decomposition, or durable coordination; those are different predicates.

## Composition contracts

### Every proposed program

- Use `fabric_exec` as the execution path, `pi.*` for core tools, `extensions.*` for captured tools, `mcp.*` for known MCP actions, and first-class stable provider proxies. Reserve `tools.call({ ref, args })` for discovered or computed refs.
- Put awkward content in the call's named `payloads`; each `π.key` must exist there. Use the installed contract, not a copied legacy argument spelling.
- Keep intermediate values in the program and return compact evidence, decisions, and failures. Fresh QuickJS bindings end with the invocation. User questions are turn boundaries, not blocking code variables that survive indefinitely.
- Define permissions and effect boundaries explicitly. Tool lists and prompts are not proof of isolation across nested delegation or extension surfaces; inspect effective child capabilities before claiming read-only enforcement. Give research workers explicit no-mutation/no-further-delegation instructions when that is their intended role.

### Finite fan-out, councils, and model diversity

- Bound and deduplicate work before launching it. Assign labels and evidence scopes; use JSON Schema when aggregation depends on structured outputs.
- Pass functions to `parallel`, not already-started promises. Batch independent work, preserve dependent ordering, and stop dispatch after a systemic all-failed batch.
- Reserve capacity for orientation, verification, and optional synthesis. Top-level `agentBudget` is bounded by configuration; token and shared cost observations may lag concurrent usage. Do not promise a hard spend reservation or unlimited quality search.
- For consequential findings, use a verifier with access to primary evidence. Collect independent initial reports before exposing peer conclusions when independence matters. A synthesis that merely restates reports is not verification.
- Return `success`, `partial`, or `failed` with requested/dispatched/completed coverage and named gaps. Keep successful evidence if synthesis fails. Retry only affected items when needed; do not restart successful work because coverage is partial.
- For edits, partition ownership by path or use worktrees. Assign shared files to one owner and define integration plus post-integration tests. Independent review does not imply concurrent mutation is safe.

### Oversized context

- Estimate the relevant corpus, orient, normalize paths, and reject duplicate/overlapping partitions before spending on children. Reserve an explicit integration step for cross-partition behavior.
- Let children inspect bounded paths or handles rather than copying the whole corpus into every prompt. Recurse only on partitions that remain oversized, with explicit depth, fan-out, and stopping bounds.
- Keep scratch values in code during one invocation. Only when cross-turn storage is authorized, use root-scoped mesh bindings with cleanup; use files plus digests for values beyond mesh limits. Do not use the state provider as a scratchpad or store secrets in mesh.

### Persistence and durable coordination

- Separate lifecycle dimensions: session/project definition scope, independent actor runner history, background execution, and durable residency that survives the originating host. One does not prove another.
- Verify the required trusted-project, mesh, runner, ownership, and Schema-mode prerequisites before promising durability. Schema enforce mode blocks agents/actors and is incompatible with that execution branch; do not compose an impossible enforced-Schema swarm or silently disable enforcement.
- Define actor identity/reuse, event subscriptions, delivery/turn-trigger policy, mailbox behavior, owner-aware controls, termination, and cleanup. Confirm actual create/setter schemas rather than copying incompatible event defaults.
- Shared tasks need versioned CAS claims, dependencies, ownership, progress, result evidence, and recovery after owner loss. At-least-once delivery calls for deduplication/idempotency; do not replay purchases, messages, or other non-idempotent effects on generic retry.
- Define how to stop workers and unsubscribe/remove owned resources without destroying user data or artifacts needed for recovery.

### Supporting mechanisms are orthogonal

Use `memory` for supported recall/expansion of prior evidence, `state` for claims/evidence/certification and executable goals, `compact` for documented advisory compaction boundaries, and supervised `components` for actual capability lifecycle requirements. None makes an unverified answer true or turns local variables into durable state. Add these only when the task needs their semantics.

Optional repository navigation, web, browser, and domain tools remain native provider/extension calls after discovery. Their contracts and permissions must be preserved; writing a skill does not authorize logins, downloads, external messages, or other underlying task effects.

## Authoritative documentation to locate

Find the installed pi-fabric package first; these are package-relative source pointers, not paths relative to this reference. Read only documents needed by the selected branches, completely, and follow relevant cross-references:

| Design question | Primary documents |
|---|---|
| Pi discovery, frontmatter, explicit invocation | Installed Pi `docs/skills.md` |
| Fabric skill boundaries and reference ownership | Fabric `docs/skills.md` |
| Guest calls, payloads, schemas, and return envelopes | Fabric `skills/fabric-exec/SKILL.md` and effective `tools.describe` results |
| Workflows, agents, runners, councils, actors, handoff | Fabric `docs/agents.md`, `skills/fabric-exec/references/agents.md` |
| Mesh, CAS, participant ownership | Fabric `skills/fabric-exec/references/mesh.md` |
| Durable host lifecycle | Fabric `docs/residency-runtime.md` |
| Evidence transactions and enforcement restrictions | Fabric `docs/schema-enforcement.md`, `docs/state-layer.md` |
| Model resolution, budgets, enablement | Fabric `docs/configuration.md`, effective discovery, safe scoped configuration inspection |
| Provider effects or supervised lifecycle | Fabric `docs/providers.md`, `docs/components.md` |
| Recall and compaction | Fabric `docs/memory-recall.md`, `docs/programmatic-compaction.md`, `docs/compaction.md` |

Do not read authentication stores or unrelated profile state to fill a capability table. If a required fact cannot be established safely, label it unverified and make the proposed preflight responsible for checking it.
