# Mechanism Selection

Read before selecting a Fabric architecture. This catalogue connects task demands to native mechanisms; effective runtime contracts remain authoritative. Select for evidence quality, coherent execution, and operational fit, not maximal feature use or automatically minimal cost.

## Kernel applicability

Call notation below illustrates TypeScript. `agent` / `workflow.agent`, callback-based `parallel` / `pipeline`, `council.run`, and `rlm.query` are TypeScript convenience surfaces, not kernel-neutral contracts. Python uses native loops and `asyncio.gather` with discovered host `agents.run` calls: compose roles explicitly, and use supported recursive agent requests only when recursion is justified. Do not paste callback helpers or TypeScript result access into a Python skill. Consult the configured kernel's execution reference before translating a pattern; neither a shared mechanism name nor a parent runner establishes identical guest APIs.

## Select a primary shape

| Task demand | Fabric mechanism | Contribution, alternative, and boundary |
| --- | --- | --- |
| Tightly coupled context-sized work | Direct `fabric_exec`, `pi.*`, and provider/extension calls | Keeps context and judgment coherent. Prefer over delegation when no distinct responsibility earns its coordination cost. A direct skill can still have a strong test loop. |
| One bounded reasoning responsibility | `agent()` / `workflow.agent()` or `agents.run()` | Explicit context and deliverable. Helpers unwrap structured value/text; use native outcomes when status, error, usage or useful partial text matters. A worker is not automatically a verifier. |
| Finite independent items or dependent stages per item | Workflow phases with `parallel(thunks, { concurrency })` or `pipeline(items, ...stages)` | Code owns scheduling and coverage. Compare a simpler direct loop. Bound dispatch before launching; sequence prerequisites while allowing unrelated items to progress. |
| Complementary perspectives on the same question | `council.run()` or explicitly composed role workers | Distinct roles expose different failure modes. Compare one focused critic. Preserve independent initial judgments when required; role agreement is not primary evidence. |
| Different models materially improve alternatives or critique | Explicit multi-model agent calls and a defined integration owner | Resolve distinct actual models, not aliases that select the same one. Compare same-model roles. Fusion is a composition pattern, not permission to invent a `fusion.*` provider. |
| Relevant material exceeds a context | Orientation, nonoverlapping partitions, context-sized leaf agents; `rlm.query()` only for still-oversized partitions | Preserves source coverage. Compare bounded reads or nonrecursive fan-out. Difficulty alone does not justify recursion; reserve cross-partition integration. |
| Finite work benefits from observation and redirection between turns | `agents.spawn()`, handles, steering and terminal delivery/wait | Retains useful worker context. Compare a blocking call. A background handle is not a persistent orchestration heap; a completed one-shot cannot be steered. |
| Ongoing advice or supervision across activations | `agents.create()`, selected events, directive/text responses and delivery policy | Maintains an outside observer. Compare a finite verifier or lifecycle subscription. Specify silence, interruption, turn triggering, termination and ownership. |
| An event should notify another participant, without an independent reasoner | Participant lifecycle subscriptions | Routes source-qualified events. Compare an actor only if interpretation/history earns it. Account for at-least-once delivery and remove owned subscriptions. |
| Multiple executors coordinate shared work | Actors/agents plus mesh state, messages/topics and CAS claims | Makes ownership and recovery explicit. Compare Main-owned finite coordination. Storage scope alone does not establish host survival. |
| Mutation requires evidence-bound transaction guarantees | `schema.hypothesize()` → `schema.verify()` → `schema.commit()`, plus abort/recovery | Compare ordinary authorized edits and tests. Check effective mode and prerequisites; audit is not enforcement. Do not promise transactions around arbitrary external effects. |
| A continuation needs the trajectory or another Main model | `agents.handoff()` or a documented model-switch path | Compare a self-contained child. Handoff is deferred to the outer invocation boundary; later code in that program cannot consume its result. |

Use task conditions, not labels: a migration might be direct, finite delegated, recursive, or durably coordinated. A long-running task does not automatically need an actor.

## Add complementary mechanisms deliberately

| Supporting need | Mechanism | Composition obligation |
| --- | --- | --- |
| Retrieve prior session evidence | `memory` recall/expansion | Follow supported handles and continuations; keep provenance. Recall does not make prior claims correct. |
| Track claims, goals and verification evidence | `state` | Use its goal/evidence semantics, not a generic scratchpad. Connect claims to actual checks. |
| Reduce a live context | `compact` | Respect advisory boundaries and preserve needed inputs, decisions, handles and unresolved work. Compaction is not durable workflow storage. |
| Supervise capability dependencies | `components`, or actor capability requirements where supported | Verify effective refs at activation and handle unavailable dependencies. A dependency declaration is not an authority grant. |
| Reach domain tools | `extensions.*`, `mcp.*`, known provider proxies | Discover the actual action, preserve task-specific permissions, and interpret its real success/error envelope. |

Choose the strongest feasible alternative where the choice matters. Explain the quality gain and coordination/context risks without fabricated numeric scores. A bounded native composition is preferable to a copied feature stack whose parts have no distinct jobs.

## Check combinations, not just individual availability

- Workflow helpers can schedule native agents when full outcomes are needed. An outer `try/catch` is not per-item recovery, and an unwrapped text return cannot prove native completion.
- Parallel reviewers can share read-only source access. Parallel implementers need disjoint path ownership or isolated worktrees; Main owns shared files and post-integration tests.
- Councils and multi-model calls can supply alternatives or critique to a finite workflow. They do not replace Main's evidence checks or acquire implementation authority from compare mode.
- Recursive delegation requires supported runner/kernel and delegated authority at each executor. Cwd and an optional-tool allowlist are not filesystem isolation.
- Actors may use mesh for shared coordination, but a session observer may need neither shared state nor durable residency. Separate definition scope, runner history, background execution and survival of the originating host.
- Schema enforce restrictions can rule out agent/actor branches. Verify current enforcement contracts; do not promise an incompatible enforced swarm or disable enforcement to make a design work.
- A lifecycle notification can trigger a new Main turn; this is a deliberate interaction choice, not a harmless default. Event loops must have a silence/stop policy and guard against duplicate effects.
- Memory, state, compaction and components are orthogonal additions. None implicitly shares local variables or guarantees semantic correctness.

## Ground only selected branches

Locate the installed Fabric package and configured skill tree first. These are package-relative document names, not links relative to this reference. Read needed documents completely and follow relevant cross-references. Use effective discovery for action schemas and current guest contracts for callback helpers.

| Selected design | Documentation to locate |
| --- | --- |
| Any Fabric skill | Pi `docs/skills.md`; Fabric `docs/skills.md`; configured `skillsets/<kernel>/fabric-exec/SKILL.md` |
| Finite workflows, runners, roles, handoff or actors | Fabric `docs/agents.md`; configured `fabric-exec/references/agents.md` |
| Shared state, CAS or message routing | Configured `fabric-exec/references/mesh.md` |
| Host survival | Fabric `docs/residency-runtime.md` |
| Transactions/enforcement | Fabric `docs/schema-enforcement.md`, `docs/state-layer.md` |
| Budgets, model resolution, modes | Relevant Fabric `docs/configuration.md` and effective discovery |
| Capability lifecycle | Fabric `docs/providers.md`, `docs/components.md` |
| Recall or compaction | Relevant Fabric `docs/memory-recall.md`, `docs/programmatic-compaction.md`, `docs/compaction.md` |

Document names are navigation evidence, not availability claims. Do not enumerate unrelated configuration or inspect authentication stores. Missing runtime evidence stays a named prerequisite.
