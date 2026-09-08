# Mechanism Selection

Read when selecting the architecture. The entry skill owns requirements, modes, and the deletion test. This reference owns specialization, mechanism choice, runtime grounding, and operational limits.

## Separate specialization, identity, and lifetime

A one-shot agent is an invocation specialized by task, context, tools, constraints, model, schema, and orchestration. A `name` or `label` provides operational identity, not behavior. Reusing a name does not resume a conversation. A detailed assignment with an evidence standard and constrained tools is meaningful specialization. A named “expert” without an operational contract is not.

`agents.run()` waits for a finite run. `agents.spawn()` returns a background handle for a finite run. Durable residency lets a spawned run outlive Main's host, not become an indefinitely reusable teammate. Live workers can be redirected with supported steering. Completed one-shot runs are read-only, though retained logs and handles may remain inspectable.

Use `agents.create()` only when the requirement needs persistent context, a serial mailbox, subscriptions, or event-driven reasoning. Definition scope, persistent runner history, and active host survival are separate choices. Project scope alone does not keep an actor running after its owner shuts down. Durable residency requires its documented trusted-project, mesh, and mode prerequisites.

Predefined personas are optional. Pi and Claude calls do not use the Veda-only `persona` selector. Veda supports built-in/custom personas but not persistent actors or recursive Fabric. Pi/Claude actors and inactive global actor templates support reusable role instructions. A stored template is a definition without imported history, not a running participant. Verify effective runner support rather than equating documentation with current availability.

Ordinary one-shot children do not inherit Main's full transcript. Supply explicit prompt data, accessible files, or supported handles. Actors retain their own context. Trajectory handoff is the explicit Pi branch-fork mechanism. Neither residency nor mesh automatically shares model context.

## Select from observable demands

| Demand                              | Smallest fitting mechanism and selection boundary                                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context-sized, tightly coupled work | Direct `fabric_exec` tools and local computation. No child unless it owns a distinct reasoning responsibility.                                                                                                                                          |
| Finite independent assignments      | Native `agents.run` outcomes or `agent`/`workflow.agent`; bounded independent fan-out. Compare a direct loop first.                                                                                                                                     |
| Dependent stages                    | Sequential `await` or `pipeline` stages with explicit per-item inputs and dependency gates. Independent items may overlap.                                                                                                                              |
| Competing perspectives              | A focused critic, role workers, or `council.run` with independent initial reports and an integration owner. Use multiple models only for a demonstrated need. Agreement is not verification.                                                            |
| Oversized context                   | Bounded source reads and nonoverlapping partitions first. Use `rlm.query` or supported recursive Pi calls only when remaining partitions still require decomposition. Difficulty alone is not a context-size argument.                                  |
| Trajectory continuation             | `agents.handoff` when a child needs the actual Pi branch. It is deferred to the completed outer invocation boundary. Later code in that invocation still runs and cannot consume child output.                                                          |
| Finite work needing redirection     | `agents.spawn`, handle transfer, steering, wait or terminal notifications. A background promise is not durable orchestration state.                                                                                                                     |
| Ongoing observation                 | An actor only if history or interpretation is needed. A lifecycle subscription can route a notification without another model. Choose events, silence, freshness, and stop behavior.                                                                    |
| Durable coordination                | Mesh topics and versioned CAS claims with explicit owners, dependencies and duplicate handling. Add actors or durable residency only when needed. Main-owned coordination is simpler for finite work.                                                   |
| Evidence-gated mutation             | Ordinary authorized edits and tests unless certificate-bound local-file transactions are required. Then use `schema.hypothesize` → `schema.verify` → `schema.commit` in one invocation, with abort/recovery. Never promise arbitrary external rollback. |
| External capabilities               | Discover exact registered extension, MCP, or provider actions and their envelopes. Missing dependencies block required work, not trigger installation or invented substitutes.                                                                          |

Memory recall, state evidence, compaction, and capability commitments are complementary mechanisms only when their own contracts are needed. They are not interchangeable scratch stores. No design must include agents, councils, recursion, actors, mesh, state, persistence, or transactions merely to look Fabric-native.

## Ground the chosen composition

Locate installed package roots from resource paths or package metadata. The document names below are package-relative lookup instructions, not local links or assumed installation paths. Read selected documents completely and follow relevant cross-references before writing calls. Do not load or route through another user-only Fabric workflow unless the user explicitly requests that composition. Runtime documentation and the core `fabric-exec` reference suffice.

| Need                                         | Authoritative installed material                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Every generated skill                        | Pi `docs/skills.md`; Fabric `docs/skills.md`, `docs/kernels.md`, configured `skillsets/<kernel>/fabric-exec/SKILL.md` |
| Agents, workflow helpers, actors, handoff    | Fabric `docs/agents.md`, configured `fabric-exec/references/agents.md`, current guest declarations                    |
| Tools, modes, approvals and budgets          | Fabric `docs/configuration.md`, `docs/architecture.md`, effective action discovery                                    |
| Mesh or active host survival                 | Configured `fabric-exec/references/mesh.md`, Fabric `docs/residency-runtime.md`                                       |
| Evidence state or transactions               | Fabric `docs/state-layer.md`, `docs/schema-enforcement.md`                                                            |
| Capability commitments or provider lifecycle | Fabric `docs/components.md`, `docs/providers.md` and applicable protocol declarations                                 |
| Memory or compaction                         | Fabric `docs/memory-recall.md`, `docs/compaction.md` and selected reference branches                                  |

TypeScript callback helpers are guest APIs. Python uses its own documented host calls, loops and supported async operations. The current `fabric_exec` kernel is exclusive. Selecting a child's kernel does not switch the caller. Do not run another interpreter through shell merely to bypass that selection, and do not generate both languages unless required.

For unfamiliar actions use `tools.search`/`tools.list`, then `tools.describe({ref})`. Read input and available output schemas. Check exact fields and enum values. Registered schemas can be narrower than general documentation or declarations. Report conflicts and honor the effective restriction. Do not infer actor runner support from an enum alone when the runner's documented lifecycle forbids it.

## Preflight and authority

Before consequential effects, generated code must check the required actions and their schemas, selected model availability, child tools, files, commands, applicable trust, execution mode, and authority. Use supported read-only status/discovery and exact dependency probes. Never inspect credential values or run a write as an availability test. Do not invent a generic “permission granted” status API. When a required fact cannot be established, report that prerequisite as unresolved and block the affected branch.

Keep evidence states distinct: **documented** in a reference, **installed** on disk, **registered** in the current action catalog, **enabled** by effective settings, **granted** to this executor, **available** for this invocation, and **behaviorally verified** by a scoped successful probe. A parent's access proves neither child availability nor grant. Revalidate at the actual effect boundary because capabilities may change after discovery.

Prompts guide behavior, not permissions or isolation. Use optional-tool allowlists and host approvals for operational restrictions. Descendants cannot widen inherited tool grants. `extensions: false` alone is not read-only. Actor `requires` commits exact capabilities but grants no additional authority. JSON Schema checks data shape, not truth. Worktrees isolate working copies, not credentials, processes, network or services. `cwd` is not filesystem isolation. QuickJS/Monty isolation applies to guest code, not trusted host extensions. Native Node/Bun or CPython modes do not promise that sandbox. Schema enforce blocks agent/actor and external-provider paths rather than making them safe to combine with enforced transactions.

## Derive bounds, never invent universal defaults

Derive concurrency and maximum dispatch from inventory, dependency graph, independent effect ownership, model capacity, user budgets and effective limits. Include verifier/integration calls and possible retries in the child count. Bound dispatch before launch. Use thunks, not already-started promises, with TypeScript `parallel`; pipelines sequence per-item stages while allowing cross-item concurrency.

Account separately for whole-program time, child time, token use, cost, recursion depth and attempt count. Omit agent `timeoutMs` unless requesting longer than the configured floor, since lower overrides are ignored. Requesting an executor deadline cannot lower configured policy or exceed its applicable ceiling. Confirm current contracts rather than copying numeric defaults into skills.

Concurrency token/cost accounting is observational, not a hard reservation: multiple calls may pass a check before earlier usage settles. Use actual hard dispatch ceilings and stop launching when exhaustion is observed. Recursive cost accounting is shared where documented, but concurrency/deadline enforcement is process-local. Do not claim a race-free global token ceiling. If required hard bounds cannot be guaranteed, expose the conflict instead of weakening it.
