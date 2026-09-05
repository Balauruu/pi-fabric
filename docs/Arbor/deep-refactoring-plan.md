# Deep-refactoring plan for pi-fabric-arbor

Status: implementation plan, not an implemented or validated refactor.

This document supersedes the previous proposal. It incorporates the responsibility review, consolidates the upstream skill suite, makes the web UI strictly read-only, and removes the profile-local benchmarking-skill dependency. It retains the agreed usability, measurement, source-loading, and simplification goals. The scope of this task is revising the plan only; all implementation and acceptance claims below remain planned unless explicitly identified as prior evidence.

## 1. Decision and scope

Build a source-loaded Pi package whose **managed Fabric component `arbor` exposes deterministic experiment operations and whose persistent Fabric actor owns research coordination**. Use short-lived Fabric agents for individual experiments. Keep a small transactional research store and Git/artifact workspace layer; do not implement a second agent runtime, persistent coordinator loop, mailbox, or participant registry.

The product optimizes **versioned research material**, not just code. First-class material includes agent instructions, skills, tool-use policies, harness configurations, workflows, prompt templates, data-generation recipes, and ordinary programs. Agent improvement is a release requirement, including an actual independently scored end-to-end journey.

### 1.1 Binding decisions

| Request | Decision | Delivery evidence |
|---|---|---|
| Hard cut-over | Delete the v1 execution/protocol/admission architecture. No legacy reader, importer, compatibility bridge, or historical inspectability requirement. | Cut-over tests and deletion audit, section 13 |
| Practical parallel candidates | Include bounded independent candidate waves, initially concurrency 1 or 2. Reuse Fabric dispatch and isolated workspaces; serialize measurements where resources interfere. | PR7 and A12 |
| Agent improvement and broader research | Material/evaluator contracts are domain-neutral. Ship an agent-improvement preset and example alongside code optimization. | PR4, PR6, PR11 and A03 |
| Remove disproportionate safeguards | No Bubblewrap/hardened isolation, process-group/Linux-unit machinery, or loopback/CSRF/origin/bounded-web-input safeguard project. | Removal map and A19 |
| Actor-led coordination | One persistent Pi-runner actor per active run. Fabric owns actor history, delivery, lifecycle, and child execution. | PR0, PR2, PR6 |
| Integrate research capabilities | Every non-deferred item in the earlier research table is required delivery, even when its activation is optional per run. | Complete matrix in section 9 |
| Consider a Fabric component | Choose a managed `arbor` component plus actor, not component versus actor. Their responsibilities differ. | Architecture decision and lifecycle PoC |
| Licensing not a concern | No licensing investigation, certification, approval workflow, or delivery gate. Leave existing notices alone. | No licensing workstream |
| Include optional follow-up PRs | O1, O2, and O3 are absorbed into the main backlog. They are not post-completion stretch goals. | PR7, PR9, PR10, PR11 |
| Read-only web UI | Browser serves projections/replay/existing artifacts only; no browser mutation routes or controls. | PR12 and A17 |
| Independent agent evaluation | Package an Arbor-owned agent-suite adapter over public Fabric execution; no dependency on profile-local benchmarking skills. | PR0, PR4 and A20 |
| Consolidated skills | One public skill, one coordinator role, one executor role and optional literature role; deterministic mechanics stay in code. | PR6, PR10, PR12 and A22 |

### 1.2 Non-goals

- Reproduce upstream's provider/authentication runtime or adopt its complete Python coordinator.
- Carry v1 certificates, authorization keys, compatibility actions, or effect protocols into v2.
- Preserve access to old run history as a release obligation. Existing user data must still not be silently deleted.
- Build a standalone daemon, generic task scheduler, distributed queue, or arbitrary multi-host execution platform.
- Implement novelty assessment, automated benchmark acquisition campaigns, training pipelines, a separate critic architecture, composite-objective optimization, or general stateful-task machinery in this refactor. These were deferred or omitted previously.
- Reproduce paper benchmark scores or claim research quality from architecture tests.

### 1.3 What remains deliberately small

One logical managed Arbor service with an explicit operational owner per run, one research coordinator actor per run, one experiment store, two initial evaluator adapters, one workspace abstraction, and one shared presentation model. Component registrations are host-local, not a cross-process singleton. Ship one public skill and three internal role documents, not eleven local skills. A preset is data plus instructions, not another orchestrator. Research features can be disabled in a run without removing them from the delivery scope. The web UI only observes saved projections and artifacts; Pi commands/tools and an explicitly attached CLI submit controls. Agent-suite evaluation ships with Arbor and has no dependency on `skills/agent-benchmarking`.

## 2. Evidence and current-state diagnosis

### 2.1 Investigation basis

The earlier investigation inspected local `pi-fabric-arbor`, upstream Arbor at `2f4e65410a5c21c9e55835a9a0d77ead21a64ffa`, and the UX reference `pi-autoresearch-harness` at `44c442ed424394f684bf0c3d30dc932b7b104b25`. The revision additionally inspected the Arbor showcase, paper arXiv:2606.11926v1, Fabric actor/component/provider documentation and effective action schemas, and the create-fabric-skill mechanism-selection guidance.

The local application is a directory inside the profile repository, not a separate repository. All implementation paths below are relative to `pi-fabric-arbor/` unless stated otherwise. The only Pi profile in scope is `/home/balauru/.pi-profiles/fabric`.

Evidence categories must remain separate:

- **Inspected implementation:** source behavior traced; not necessarily executed.
- **Documented:** public contract described by installed documentation.
- **Available:** effective discovery exposes an action; this does not prove successful model execution.
- **Probed:** a particular behavior was actually exercised.
- **Planned:** target behavior requiring implementation and tests.

### 2.2 Local blockers

1. `src/application/ProductionComposition.ts` exports a preparation function without an operational startup caller; ordinary activation resolves an initially blocked provider.
2. `src/component/definitions.ts` deliberately does not dispatch autonomously. No production owner completes repeated useful experiments.
3. `src/application/ArborApplication.ts` sends successful candidate evaluation toward finalization rather than continued search.
4. `src/public/descriptors.ts` exposes approximately thirty infrastructure actions. The user must understand claims, attachment, reconciliation, and promotion rather than start a research run.
5. Acceptance compares against the initial development baseline rather than a maintained incumbent; a zero threshold can admit a tie.
6. The inspected compatibility allowlist accepts Fabric `0.76.2 || 0.77.0`, while the profile investigation observed Fabric `0.83.0`. This is an admission defect, not evidence that the newer host is incompatible.
7. Package exports, binaries, tests, and web assets depend on emitted output. Source edits can leave normal execution using stale artifacts.
8. The existing web monitor is real, but writing an intent is not proof that an operation ran. It cannot replace the missing research coordinator.
9. Several declared budgets are not connected to production execution. Schema declarations and certification campaigns are not runtime enforcement.

Useful local implementations include exact decimal arithmetic, command-result validity checks, safe Git/path handling, transactional SQLite primitives, and practical recovery tests. Retain useful behavior, not its certificate-bearing interfaces.

Earlier temporary probes confirmed the release rejection, zero-threshold tie behavior, and direction-aware arithmetic. A process-helper probe exercised cancellation in one setup. None of these establishes that the proposed actor/component integration works. No refactor or optimization campaign has been executed as part of this plan.

### 2.3 What the paper and showcase change

The [paper](https://arxiv.org/pdf/2606.11926), sections 3 and 4, formulates autonomous optimization as mutable material, an objective, and development/held-out evaluators. Its hypothesis tree binds a hypothesis, distilled insight, and executable metadata. A long-lived coordinator maintains global strategy; short-lived executors test fixed hypotheses. Backpropagation is semantic abstraction, not numerical MCTS reward propagation.

This is a direct fit for a Fabric actor. A deterministic application `while` loop that asks fresh workers what to do would duplicate the long-lived coordination machinery already available in Fabric.

The [showcase](https://ruc-nlpir.github.io/Arbor/) includes BrowseComp agent/harness improvement. The inspected bundled BrowseComp tree contains changes to candidate generation, verification, parallel agents, and a judge that can search and propose another answer. It also records practical shortcomings: noisy small dev samples, a held-out timeout that was too short, missing cross-run lesson reuse, and hypotheses placed at the wrong abstraction level.

Consequences for this design:

- An experiment can change instructions or agent behavior without changing application source.
- Evaluation can be a task suite, not a single shell microbenchmark.
- Direction nodes and executable hypotheses are distinct types.
- Dev improvement and held-out verification are separate evidence.
- Parallelism, lesson reuse, configurable evaluation duration, and honest uncertainty belong in the design.
- Reported showcase/paper gains are source claims, not reproduced results or acceptance thresholds for this package.

### 2.4 Upstream is a reference, not a drop-in runtime

| Mode | What it supplies | Why not use it as the core |
|---|---|---|
| Native Python Arbor | Coordinator, executors, tree, provider configuration, checkpoints, tools | Duplicates Pi/Fabric reasoning, configuration, and participant lifecycle |
| Keyless MCP | Tree/evaluation/worktree/report operations; host owns reasoning | Does not supply the desired coordinator lifecycle; acceptance and cancellation still need work |
| Standalone skill/helper | Host-guided tree/artifact operations | Useful semantics and examples, not equivalent to native runtime guarantees |
| Selective reuse | Tree semantics, adapted role/phase skills, report ideas, optional benchmark preparation | Chosen, without maintaining a second research-state owner |

The upstream suite has eleven skills, not eleven independent agent configurations. Reuse its research procedures with explicit runtime adaptation (section 4.7). Split executor dispatch mechanics from worker instructions; replace native/fallback tool calls with the component contract; remove instructions to switch to the Python runtime or maintain fallback state. Generalize code-specific procedures to research material. Keep literature grounding but omit the search skill's novelty-assessment behavior. Evaluation, budget, and promotion rules remain deterministic operations, not promises made by skill prose. Upstream `agents/openai.yaml` files are UI metadata, not Fabric execution profiles.

Source discrepancies matter: native merge thresholds can be advisory; MCP can accept caller-supplied test scores; metric parsing can outlive failed command execution; some rankings/search gates assume maximization. Do not port these defects. Do not describe documented policy as deterministic enforcement.

## 3. Product contract and user journeys

### 3.1 Public surface

Proposed Pi commands:

```text
/arbor setup
/arbor start
/arbor show [run]
/arbor pause
/arbor resume [run]
/arbor cancel
/arbor steer <instruction>
/arbor keep <attempt>
/arbor discard <attempt>
/arbor export [run]
/arbor apply [run]
/arbor undo-apply [run]
/arbor lessons [query]
/arbor doctor
```

`/arbor` opens the current Pi dashboard or a launch card. Four product-facing facade operations support Pi commands/tools and an explicitly attached CLI:

```text
arbor.start(spec)
arbor.inspect(query)
arbor.control(command)
arbor.export(request)
```

These are product facade operations, not a fixed limit on registered provider actions. Keep read-only inspection separate from effectful operations. The PR3 action manifest must enumerate command mappings, exact refs, schemas, caller classes, risk and effect metadata. Split review approval, source apply and undo into narrowly scoped routes where necessary; an umbrella `arbor.control` descriptor must not understate the most consequential operation it accepts. Actors receive research actions, not human-approval or original-source-apply authority. All mutation entrypoints preserve the applicable host-policy path instead of calling an unchecked service implementation directly.

The browser is a strictly read-only monitor: projections, logs, diffs, replay and retrieval of already-generated exports only. It has no start, setup, steer, pause, resume, cancel, keep/discard, approval, apply/undo, export-generation or other mutation endpoint. Absence is enforced server-side as well as in the UI; hiding buttons is insufficient. Generate exports through Pi or the attached CLI.

A separate small set of actor-facing research operations is described in section 4. They express research actions, not low-level leases, heartbeat, or reconciliation steps for the model to assemble.

### 3.2 Nine user journeys

| Journey | Required behavior |
|---|---|
| 1. Start from current material | Resolve the project/material root and capture its current state. Dirty files are supported without asking the user to stash or commit. Non-code material is equally valid. |
| 2. Choose objective and evaluation | Show material, mutable scope, development evaluator, optional held-out evaluator, metric direction/unit, checks or quality vetoes, model, and limits. Ask only for missing consequential choices. |
| 3. Measure the baseline | Execute the selected evaluator on the initial material before launching candidate-producing executors. This may run agent tasks and graders, not a coding benchmark command. An invalid baseline blocks scored search. |
| 4. Run useful research | The actor observes evidence, proposes/selects hypotheses, dispatches executors, absorbs results, updates insights, and continues within budget. No manual driver protocol. |
| 5. Inspect evidence | Show baseline, incumbent, candidates, deltas, uncertainty, hypotheses, lineage, changed material, logs, failures, and stop reason. Drill into one candidate in one selection. |
| 6. Keep or discard | Keeping updates Arbor's owned incumbent, not the original checkout. Failed/discarded candidates retain a patch and evidence for the current format. Apply to the source is separate. |
| 7. Control and resume | Steering changes subsequent work; pause stops new dispatch; cancel stops active owned work; resume reconstructs from persisted research facts and Fabric participant observations. |
| 8. Reuse lessons | Retrieve source-linked prior v2 lessons as hypotheses to recheck, including negative findings and applicability limits. Do not silently turn recalled claims into facts. |
| 9. Update normally | Reload source after Pi/Fabric updates. Doctor explains missing capabilities. No build, exact-release recertification, or historical migration ceremony. |

### 3.3 Run specification

The resolved run spec includes:

- Material root, material kind, mutable paths, evaluation inputs, and selected untracked files.
- Objective, metric direction/unit, minimum practical gain, and quality vetoes.
- Development evaluator and optional held-out evaluator, with declared repeat/aggregation policy.
- Coordinator model, executor model policy, and subject-agent configuration when applicable. These are different roles.
- Search mode, branching/depth bounds, parallel candidate count, and interaction mode.
- Attempt, evaluator-call, active-time, and artifact limits; cost/token limits labeled according to actual enforcement.
- Preset provenance, configuration origins, and selected lesson/source references.
- Operational role identities, resolved instruction/reference bundle identities, and role configuration origins. Record the effective model, tools/capabilities, and result contract for each actor binding or worker invocation; these are separate from the subject-agent skills/configuration being optimized.

Configuration precedence for new runs:

```text
built-in defaults < profile Arbor defaults < project arbor.config.json < explicit overrides
```

Persist the resolved spec once. Resume uses that spec, not newly changed defaults. Steering and increasing remaining limits are explicit changes. Changing the objective, evaluator, task split, or grading rules creates a new measurement epoch or fork with a fresh baseline.

### 3.4 Defaults and profile-specific settings

- Five candidate attempts; concurrency one, with an explicit two-candidate mode.
- Shell microbenchmark preset: three trials, median, configurable 1% relative practical-gain threshold; ties never win.
- Agent-improvement preset: paired task IDs and declared seeds/repeats where supported; quality and cost/latency summaries. Do not inherit three whole-suite repeats blindly.
- Literature and held-out evaluation are selectable per run. Their implementation is required.
- No automatic apply to the original source. No automatic historical deletion.
- Missing correctness/quality checks produce a visible limited-validation label.
- Pause after two consecutive infrastructure failures; distinguish these from valid negative results.
- Stop for exhausted budget, configured target, explicit stop, or declared convergence/no-gain policy.

Timeouts are domain-specific. A two-minute shell benchmark default must not become a global agent-suite/held-out limit. Fabric currently ignores per-call timeouts shorter than its configured default; enforce shorter Arbor deadlines with an application deadline and public stop controls, not by assuming `timeoutMs` shortened the run. Do not alter unrelated host defaults.

## 4. Architecture and Fabric mechanism decisions

### 4.1 Chosen shape

```text
Pi commands/tools + attached CLI
                 | product facade / policy-aware controls
                 v
       owner-host managed Arbor service <--- child-local Arbor forwarding surface
       namespace: arbor                                  ^
          |         |          |                          | research operations
          v         v          v                          |
     ResearchStore Workspace Evaluators         Fabric coordinator actor
     SQLite/files  Git/artifacts command/agent    strategy, hypotheses, interpretation
          |                    |
          |                    +--> Fabric-owned short-lived executors/subjects
          |                         launched under the intended long-lived owner
          v
     immutable/shared read projections ---> Pi/CLI inspection
          |
          +---> read-only web monitor: tree, evidence, replay, existing artifacts

Worker completion ---> coordinator mailbox (explicit target)
Run terminal state ---> owner-host deterministic cleanup (public seam to prove in PR0)
```

**The actor is the sole research-policy coordinator.** Deterministic operations validate and record facts, reserve capacity, run bounded domain work, and perform integration. They do not decide the next hypothesis or run an independent autonomous search loop.

### 4.2 Why component plus actor

A component manages capability publication, dependencies, reload, and awaited cleanup. An actor retains a reasoning context and responds to messages across activations. Neither replaces the other.

Choose `guarantee: "managed"`. Git changes, external evaluation, and spawned work are not globally reversible merely because a component has a disposer. Do not claim `revertible` independence for them.

Register the definition using public `pi-fabric/protocol` component registration/discovery events. Provide `arbor` through `context.provide`. Add one declarative enabled component entry using the documented configuration shape, preserving unrelated configuration. Definition name, configured instance ID, provider namespace, and run actor ID are separate identities even if the first three use the label `arbor`.

Activation determines whether this host owns operational services or publishes a forwarding/read surface, then registers the corresponding resources and disposer. It does not run experiments, create a coordinator that needs its own unpublished provider, wait for child readiness, or call supervisor lifecycle operations from inside activation/teardown. Start the actor through `arbor.start` after the component is active. Passive/child activation must not reopen an execution owner or assume authority to stop another host's work.

#### Cross-process service ownership

Choose an owner-host service, not independent full Arbor runtimes in every actor process. The run binding records the native Fabric root/owner identity and a domain revision. Fabric remains authoritative for participant existence, ownership and routing; the binding is not a new lease or participant registry. The designated owner holds evaluator handles, in-flight launches and run-owned subscriptions. SQLite owns transactional research facts, but does not make native handles portable.

The same `arbor` descriptors loaded in an actor child provide capability compatibility, not access to the parent's service object. Child calls must reach the designated owner through a bounded request/acknowledgement adapter over a documented public host/transport seam. No private registry/context import, custom agent runtime or polling coordinator is allowed. PR0 must identify and exercise the exact seam, including cancellation and caller/policy propagation; this document does not assert that a general remote-provider invocation API already exists. If the installed public surface cannot support it, block implementation and propose the smallest generic Fabric hook before proceeding.

Launch candidate workers and evaluator work under the intended owner, not an incidental actor-activation host whose shutdown could stop them. End a coordinator activation while its worker is still running and prove that the worker survives, completion reaches the coordinator, and the next activation continues research without Main choosing the next step. A second Pi host may inspect or route controls, but must not duplicate dispatch or cleanup. Owner loss blocks new effects until explicit reconciliation/resume establishes a valid binding.

Pi controls use the same policy-aware owner service. CLI mutations require an acknowledged live-host attachment through the proven public seam; offline CLI mode is read-only. The web reader can use a consistent store projection or saved artifact without launching a Fabric host. Browser requests never submit control intentions, create actors or generate exports. Successful browser reads are not evidence that owner invocation works.

### 4.3 Native responsibilities, not replacements

| Need | Use | Do not build |
|---|---|---|
| Persistent reasoning | `agents.create`, `agents.tell`, Fabric actor history | Custom conversation persistence or coordinator daemon |
| Individual executions | Public `agents.spawn`, `status`, `wait`, `stop`, `list` | Pi SDK worker runtime in parallel with Fabric |
| Completion routing | `agents.subscribe` to the coordinator participant; separate proven public host seam for deterministic cleanup | Treating a participant subscription as a JavaScript callback, model-authored polling, or bespoke broker |
| Cross-participant signaling | Fabric participant routing/mesh topics where needed | Second participant registry or distributed queue |
| Capability lifetime | Managed component and exact `requires` | Global prepared-provider pointer and readiness certificates |
| Research facts | Small transactional store | Full Fabric actor/run transcript mirror |
| Evidence recall | Structured lesson index; optional `memory.recall`/expand for source retrieval | Treating `state` as scratch storage or memory as score authority |
| Compaction | Fabric/Pi actor compaction plus re-observation from store | Custom context-compression engine |
| Finite helper batches | Native workflow/parallel primitives when appropriate | One permanent QuickJS invocation pretending to survive turns |

SQLite is retained for **domain transactions**, not as an alternative Fabric execution store. An attempt/evaluation/incumbent decision needs one atomic commit. Mesh is appropriate for notification and routing; duplicating the same authoritative tree in mesh and SQLite is not. A mesh-only redesign is not necessary to adopt actors and would add a persistence rewrite without a demonstrated benefit here.

### 4.4 Actor contract

- One actor per active run, with stable run-to-actor linkage in the store.
- Pi runner, because the coordinator must call Fabric/provider operations itself.
- Project scope for the live definition; session residency by default. **Project scope is not host-surviving execution.**
- Keep actor input, actor output to Main and deterministic host cleanup separate. Actor `delivery`/`triggerTurn` configures output delivery to Main, not continuation of the actor itself. Default routine output to mailbox-only; any user-facing triggered notification is an explicit policy choice, not an extra research coordinator. Avoid subscriptions to every host turn.
- Exact `requires` for the actor's Arbor operations and optional source tools only when enabled. Tool availability and dependency commitments must both be tested in the actual child.
- Initial message contains the run ID and instruction to observe the store, not an entire copied history.
- Start/resume and Pi/attached-CLI steering/review decisions enqueue messages through supported actor routing. Subscribe to worker lifecycle with `to` explicitly set to the coordinator participant, never rely on the default Main target. Choose the subscription delivery/trigger policy independently from the actor outbox policy. Coalesce notifications where supported; event duplication must not duplicate domain transitions. Suppress or deliberately account for detached-spawn convenience notifications so they do not create an unintended Main reasoning loop.
- End an activation after a bounded wave or pending external work. Do not continuously reason while nothing changed.

Fabric `agents.stop` stops an actor; it is not merely a pause command. Ordinary Arbor pause records a dispatch boundary and lets the current actor activation settle. If cancellation/reload stopped the actor, resume can create a replacement and re-ground it from the tree. Do not promise that telling a stopped actor restarts it or that the private transcript is required for recovery.

Successful completion also has an explicit lifecycle boundary: commit terminal research state and summary references, let the current actor activation return, then finalize owned resources outside that activation. `agents.subscribe` delivers to participants; it is not a JavaScript callback-registration API. PR0 must identify and prove the public lifecycle observation/host callback seam used by the deterministic owner handler, separately from the worker-to-coordinator mailbox route. If that seam is unavailable, report the missing generic capability rather than treating another LLM turn as deterministic cleanup.

Retire per-worker subscriptions when terminal evidence is ingested; stop/remove the idle run coordinator through public APIs. Do not stop an actor synchronously from the provider call it is awaiting. Late notifications read terminal state and become no-ops. Cleanup failure is recorded separately and does not reopen research or erase results. Owner teardown retries unfinished owned cleanup; child/passive teardown never stops another owner's work. Native historical worker records need not be purged or duplicated. Test successful, failed, cancelled and duplicate-terminal paths, including zero live run-owned actors/subscriptions after successful cleanup and no extra Main research inference.

Durable residency is a separate opt-in only if the entire selected provider/evaluator/workspace path is available in Fabric's resident host. Prove that path before advertising host-surviving runs. The default completion criterion is host-bound operation with honest interruption and resume, not a new daemon project.

### 4.5 Actor-facing operations

Keep six additional research actions, with shared schemas and explicit role guidance:

| Action | Responsibility |
|---|---|
| `arbor.propose` | Add typed direction/hypothesis nodes with parent links, rationale, and source references |
| `arbor.dispatch` | Reserve an attempt/capacity, materialize its workspace, launch one hypothesis executor, and attach the native handle |
| `arbor.collect` | Reconcile native terminal evidence and freeze returned material; record failure/partial status honestly |
| `arbor.evaluate` | Execute the selected evaluator on an exact snapshot and persist its result; never accept a supplied scalar as an evaluation |
| `arbor.distill` | Store evidence-linked leaf/ancestor insights with revision checks |
| `arbor.decide` | Validate keep/prune/review/continue/stop decisions against current facts and measurement policy |

The actor also reads `arbor.inspect`. A review decision from `arbor.decide` requests or observes a pending review; it cannot approve itself. User-facing keep/discard routes through the same decision rules and does not bypass failed evaluation. Source apply/undo and human approvals stay outside the coordinator's committed action set. A manual unverified selection, if supported, is explicitly labeled and never becomes a measured win.

These names are proposed application APIs, not existing Fabric built-ins. Mechanically test registration, schemas, descriptor effects, and actor dependencies. Keep lease IDs, internal operation journals, and worker ownership reconciliation behind these interfaces.

### 4.6 Deep modules

| Module | Small interface | Hidden responsibility |
|---|---|---|
| Experiment service | start/inspect/control/export | User-oriented contract, lookup, validation and presentation |
| Research operations | Six actions above | Domain transactions, admissible research changes, finite effects |
| ResearchStore | load/commit/control/events | Revision checks, atomic reservations, compact events and evidence references |
| Workspace | capture/materialize/freeze/restore/export/apply | Dirty snapshots, immutable identities, per-candidate isolation and integration |
| Evaluator | evaluate(snapshot, spec, signal) | Execution, parsing/grading, repetitions, native evidence and validity |
| Fabric execution adapter | launch/observe/stop | Explicit role/request assembly, owner-host forwarding, native handle adaptation, participant notification versus deterministic cleanup, and deadlines |
| Lessons | retrieve/distill/export | Applicability, provenance, deduplication and bounded context selection |
| Presentation | projection; Pi/attached-CLI control receipt | Shared factual views; web has read-only projections and existing artifacts, never control submission or experiment authority |

Do not create a port for every function. Do not retain `RunEngine.run()` as another owner of the research loop.

### 4.7 Role skills and native execution

Ship **one public `fabric-arbor` skill and three internal role documents**. Skills guide judgment; they do not enforce budgets, manage processes, repair storage or authorize human decisions. Consolidate by local responsibility rather than preserving one file per upstream name. The following is the binding disposition of all eleven upstream skills, not a list of local skill registrations:

| Upstream material | Local disposition and owner |
|---|---|
| `arbor-research-agent`, `arbor-agent-setup-intake` | Merge into public `SKILL.md`: clarify the research question, choose evaluation, explain controls and interpret outcomes. Setup/configuration validation executes in Pi commands and domain code. |
| `arbor-agent-orchestrator`, `arbor-agent-coordinator` | Merge into `roles/coordinator.md`: one persistent actor owns strategy, phase selection and hypothesis choices. Dispatch/collection mechanics remain code. |
| `arbor-agent-ideate` | Fold into the coordinator's conditional `references/research-strategy.md`; no independent skill or agent. |
| `arbor-agent-executor` | Keep `roles/executor.md` for a hypothesis-bound child. Component/workspace code owns dispatch, freeze, evaluation accounting and finalization. |
| `arbor-agent-search` | Keep optional `roles/literature.md` for a bounded source-inspection child using existing search/fetch capabilities; no novelty subsystem or search runtime. |
| `arbor-agent-merge-eval` | Delete as a standalone skill. Evidence interpretation goes in coordinator guidance; evaluator code measures, decision code checks eligibility, workspace code integrates. |
| `arbor-agent-resume-report` | Delete as a standalone skill. Coordinator re-observes and explains; recovery code reconciles handles/material and reporting code renders factual projections. |
| `arbor-agent-plugins-hitl-budget` | Dissolve entirely: presets are data, evaluator adapters own execution contracts, Fabric owns effect permissions, Arbor owns research-review state and accounting. Only research-choice guidance remains in the public/coordinator instructions. |
| `arbor-agent-tools` | Delete as a skill and remove fallback storage/backend behavior. Provider descriptors/schemas own the callable contract; `references/actions.md` explains usage without duplicating schema definitions. |

Initial package layout:

```text
skills/fabric-arbor/
  SKILL.md
  roles/
    coordinator.md
    executor.md
    literature.md
  references/
    research-strategy.md
    evidence-interpretation.md
    actions.md
```

Only `SKILL.md` is a discovered skill. Role documents and conditional references are explicitly loaded assets, not hidden skill routers or independently registered agents. Keep the upstream-to-local provenance mapping in maintenance documentation. Split more references only for a demonstrated conditional-loading need, not to retain the upstream file count. Internal procedures must not autonomously invoke unrelated advanced Fabric skills.

Use actor `instructions` and worker bootstrap for Arbor roles. `context.guide()` is appropriate only for bounded model-specific execution advice, not role/run selection: its model/Main/participant selectors would otherwise spread coordinator instructions into executors or optimization subjects. Guidance never grants capabilities or overrides host policy.

#### Role-to-request contract

Keep resolution and prompt assembly inside the existing Fabric execution adapter:

```text
role procedure + assignment + resolved run configuration
    -> instructions + tools/capabilities + model + result contract
    -> native actor creation/activation or agents.spawn
```

The inspected `agents.spawn` API has no Pi `role` or `skills` argument. `name` labels the run, while `persona` is Veda-specific. Do not invent a named-profile parameter or assume skill discovery applies a role. Coordinator bootstrap uses the supported actor `instructions` field; worker bootstrap uses `task`. Bind tools/models and worker output schemas through supported native fields, and use exact actor `requires` where applicable. Verify effective availability in the child rather than inferring it from Main.

- Resolve and read mandatory role instructions before launch, then explicitly include them in the bootstrap. Load phase procedures when applicable rather than copying all eleven skills into every prompt. Required phase reads must precede the actions they govern.
- Resolve reference paths from the packaged role document or its preserved run bundle, never relative to an experiment worktree. Validate required references before admitting that phase; unresolved or unreadable material produces an actionable blocked result, not a generic-worker fallback.
- Keep bounded assignments explicit: role, run/attempt identity, exact hypothesis/material, relevant evidence, development-evaluation contract, allowed scope and expected result shape. Role instructions do not authorize a worker to spawn a replacement coordinator, maintain shared research state, or substitute its own score for evaluator evidence.
- Record the actual instruction/reference identity and native request configuration. Schema validation proves result shape, not scientific quality or instruction adherence. Skills and tool declarations are not a hardened filesystem boundary.

#### Operational roles versus optimization subjects

Snapshot the selected operational instruction/reference bundle into run-owned artifacts outside candidate material. Reference it from the resolved spec and activation/invocation records; do not mirror Fabric transcripts. Resume uses that bundle, not whatever a package update now supplies. If it is unavailable or incompatible with current capabilities, block with a concrete explanation. An explicit role change creates a recorded new binding/revision and leaves prior attempts attributable to their original instructions; subject/evaluator changes still follow the measurement-epoch rules in section 3.3.

Candidate prompts, skills and agent configurations belong to the subject-agent evaluation path, not the optimizer's bootstrap. A candidate with the same skill name or project-relative path must not replace the coordinator/executor role through ambient discovery. Use explicit operational role resolution and test collision behavior in the actual child. Verify separately that the subject runner really loaded the candidate snapshot; changing `cwd` alone is not proof. This is configuration separation in a trusted environment, not a sandbox claim.

## 5. Research behavior

### 5.1 Hypothesis-tree refinement

The actor follows:

1. **Observe:** current incumbent, active frontier, recent evidence, ancestor insights, constraints, controls, and remaining budget.
2. **Ideate:** propose a small set of falsifiable hypotheses under a direction, incorporating grounded sources and negative findings when available.
3. **Select:** choose pending executable leaves, balancing exploration and exploitation. Record a short reason; no invented UCT/MCTS policy claim.
4. **Dispatch:** launch independent bounded executors. Each receives one fixed hypothesis, base snapshot, ancestor insights, mutable scope, and evaluation contract.
5. **Backpropagate:** collect factual results, distinguish interpretations, and update affected ancestor insights serially against current revisions.
6. **Decide:** continue, refine, prune, request review, attempt validated promotion, or stop.

The store validates topology and state transitions. It can enforce `direction` versus `hypothesis`, parent existence, depth, and leaf-only dispatch. It cannot prove that prose is scientifically abstract or causally correct. Good examples and review supplement structural validation.

Executors may edit/debug/rerun development feedback within their attempt allowance. Every invocation of the saved development evaluator, including exploratory feedback, must use the accounted evaluator path with a stable invocation ID, capacity reservation and native result. A feedback request snapshots the current material; its score cannot later validate a different snapshot. If workers need this path, grant only the exact scoped evaluation capability through the proven owner adapter. Informal local diagnostics may run separately, but are labeled non-authoritative, governed by declared diagnostic/time limits and never imported as scored evaluator results. Do not claim hard interception of arbitrary trusted shell work.

Executors may not silently change the assigned hypothesis when it fails. A changed hypothesis creates a new node/attempt. Worker reports contain material references, factual observations, suggested insights, and relevant execution paths; their score claims are not authoritative.

### 5.2 Parallel candidates without a platform rewrite

Include concurrency two as a supported configuration. Each candidate has its own workspace and immutable parent/incumbent reference. Reserve slots and attempts atomically before dispatch. Stop scheduling when the batch/systemic failure rule or run budget requires it.

Start with bounded waves rather than dynamic work stealing:

- Produce one or two independent candidates.
- Collect all terminal results or preserve a clearly partial wave.
- Evaluate serially when shared CPU/GPU/service load would bias measurements.
- Update shared ancestor insights after collection, avoiding sibling overwrites.
- Rank using metric direction and deterministic tie handling.
- Promote at most one candidate at a time against the latest incumbent.

Two candidates that beat the old incumbent do not both become current independently. If integrating another branch changes its material, evaluate the integrated snapshot again. Never reuse a pre-merge score for changed material.

Parallelism overhead includes workspace preparation, coordinator turns, external rate limits, and evaluation interference. Measure it with deterministic fixtures and a later bounded real workload. If a workload gains nothing, use concurrency one. The feature still ships; a full distributed scheduler does not.

### 5.3 Partial executor resume

Preserve partial material and logs when an expensive executor is interrupted. Resume means a new bounded execution on that exact partial snapshot with the same hypothesis and an explicit continuation summary. It does not require private Fabric session surgery or blindly repeating an ambiguous spawn.

Record retry/continuation lineage and charge each invocation. If the artifact or evaluator changed, invalidate affected measurements. Offer restart-from-parent and continue-partial as distinct actions. Do not convert partial work into a completed evaluation.

### 5.4 Interaction modes

- **Auto:** actor proceeds within the configured scope and budgets.
- **Direction:** user approves or steers broad directions before expansion.
- **Review:** require approval before promotion/apply at configured boundaries.
- **Collaborative:** pause for a specific unresolved research choice while preserving current work.

Approval timeout does not silently approve. Show `awaiting_review` and the pending decision. These modes share the same facts and Pi/attached-CLI controls; they are not separate engines. The read-only browser may display the pending decision but cannot answer it.

Fabric permissions authorize effects such as writes, execution and delegation. Arbor review authorizes a particular research transition. Neither substitutes for the other. Persist the pending decision identity, exact material/epoch/revision, authenticated owner-route provenance and actual user response from Pi or the attached CLI. Reject stale responses and caller-supplied approval booleans without that receipt. Keep the approval route outside actor/worker capabilities; `arbor.decide` cannot self-approve. An Arbor approval does not bypass Fabric deny/ask/Schema policy. Skills explain choices; deterministic code enforces the saved review requirement.

### 5.5 Convergence and pruning

Persist a small search-policy configuration: `maxDepth: 3`, `maxChildren: 3`, `exploreEvery: 3`, `shiftAfterNoGain: 3`, and `stopAfterNoGain: 5` are initial configurable defaults. Count completed valid comparisons, not failed infrastructure work, for no-gain; reset that count after a measured keep. At three non-improvements, request a different direction before more refinement; at five, stop. With eligible unexplored directions, every third selection is an exploration slot; other selections prefer refinement of an evidenced promising direction. The actor chooses the actual hypothesis and records its selection kind/reason; domain operations check the configured slot and topology, not scientific merit. If the requested kind has no eligible node, record the fallback. Tests seed a frontier and verify exploration-slot selection, exploitation refinement, fallback, shift, reset, and stop. This is a transparent initial heuristic, not an optimal-search or MCTS claim.

Use transparent no-gain, budget, target, frontier-exhaustion, and repeated-failure rules. Actor recommendations can propose a strategy shift; deterministic stop limits remain enforced by operations. A negative result is not automatically evidence to prune an entire direction.

Pruning marks future selection eligibility. It is not equivalent to cancelling a running executor. If the user requests both, route cancellation through Fabric and record its actual outcome.

### 5.6 Literature, grounding, and experience

Use existing discovered Pi/Fabric search/fetch tools or a configured provider. No Arbor-specific credentials or search-agent runtime.

Persist source URL/title, accessed passage or artifact reference, and the claim it supports. Distinguish discovery snippets from inspected sources. Literature informs hypotheses; it does not replace experiment evidence. Missing search capability blocks only a run that requires grounding, not unrelated local optimization.

Distill leaf findings and direction-level lessons with evidence IDs, limitations, and contrary outcomes. Build a lightweight project lesson index; use optional memory retrieval to locate related session evidence, not as an authoritative research database. Cross-run reuse targets new-format runs; no v1 import is required.

Trajectory export contains proposal, context references, selected action, material identity, factual outcome, and distilled insight. It is an analysis artifact, not a claim that a training pipeline exists.

## 6. Evaluation and material contracts

### 6.1 Domain-neutral material

Git snapshots can version text prompts, agent definitions, workflow/configuration files, recipes, and code. For a material directory without Git, create an Arbor-owned snapshot repository rather than requiring the user to initialize their source directory. Large external data may remain a referenced input with recorded identity; do not copy arbitrary datasets into every worktree.

Separate:

- **Mutable material:** what the executor may improve.
- **Evaluation definition:** tasks, graders/checks, metric policy and comparison rules.
- **Execution environment:** tools/models/dependencies needed to run material.
- **Evidence:** native outputs and evaluations tied to an exact material/spec identity.

This separation is methodological, not a secrecy or hardened sandbox guarantee.

### 6.2 Two initial evaluator adapters

| Adapter | Required behavior |
|---|---|
| Command evaluator | Run a declared command/check set on exact material; preserve exit status, timeout/cancellation, logs, parser output, raw trials and aggregate |
| Agent-suite evaluator | Run fixed task IDs against a versioned agent/prompt/workflow configuration; collect native trajectories/results, deterministic grades or declared judges, paired outcomes and available usage/latency |

Agent-suite evaluation must not be implemented by asking the optimization actor to rate its own candidate. Keep the subject agent separate from the coordinator and hypothesis executor. Graders and task splits are fixed for the measurement epoch.

The agent-suite evaluator is an Arbor-owned adapter built on public Fabric execution primitives. There is **no dependency on `skills/agent-benchmarking`**, its fixed guest, scripts, environment, schemas or private lifecycle. Do not copy that skill into Arbor or invoke it indirectly through an evaluation worker. A clean package installation must evaluate its bundled deterministic agent-improvement fixture without any profile-local skill.

The adapter accepts an exact subject snapshot and frozen task/grade specification, reserves evaluator capacity, assembles explicit subject-agent requests, runs bounded tasks through the existing Fabric execution adapter, persists native results and applies deterministic graders or explicitly configured judges. The subject agent is neither the coordinator nor the hypothesis executor. An optional judge is a bounded evaluation role, not an independent research-policy coordinator. Task IDs, condition pairing/order, seeds/repeats where supported, score mapping, failure rules and output contracts are frozen before scoring. Retries/judge calls receive distinct linked IDs and count against the saved limits. Use Fabric for child execution and cancellation, not a second worker runtime.

Keep statistical scope small and explicit. Ship paired task-level summaries, failure-inclusive results and a declared uncertainty/comparison policy with oracle tests. Use a maintained numerical library for any selected inferential method rather than hand-rolling a generic statistics framework. Unsupported methods block that selection; descriptive results must not be presented as statistical superiority. Native execution status, evaluation validity, scientific interpretation and Arbor's incumbent decision are distinct fields. The coordinator never supplies authoritative grades.

PR0/PR4 must prove baseline and candidate task execution, deterministic independent grading, interrupted/partial evaluation reconciliation without duplicate dispatch, and candidate snapshot loading through the actual owner/worker path. A configured external task-suite command remains supported by the command adapter but does not replace the bundled agent-suite proof. Evaluation artifacts reference native IDs and required evidence; they do not mirror Fabric's entire participant runtime. Declare all runtime/library dependencies in the package and use their declared environment; never install into system Python. Changed evaluation specifications create a new epoch and fresh evaluation outputs.

### 6.2.1 Preset and plugin extension contract

A preset is a validated JSON document with `id`, `materialKind`, `objectiveDefaults`, `evaluator`, `searchDefaults`, and optional `instructions`/`sourceRefs`. Merge its defaults before profile/project/explicit overrides and record their origins. It cannot start a coordinator or create another research store.

Support a small evaluator-plugin seam through an exact configured Fabric provider action, not an arbitrary package scanner. `evaluator.providerAction` names an action whose input accepts a snapshot reference, resolved evaluation spec, output directory and evaluation ID, and whose output identifies execution status, measurements, checks, artifacts and native provenance. Validate the effective descriptor and result contract before use. A plugin supplies execution evidence, never the incumbent decision.

Bind a finite evaluator catalog at component registration: the definition factory resolves the explicitly configured refs into exact optional `requires` entries before activation. `FabricComponentDefinition.requires` is definition metadata; putting a ref in instance `config` does not add it to the committed view. A run selects only an already-bound compatible action. A missing optional action blocks that selected evaluator, not built-in evaluators or unrelated runs. It cannot become callable in the existing view merely because discovery later finds it.

Changing the configured catalog requires an explicit quiescent maintenance/reload boundary and re-registration of the derived definition; no run-triggered automatic reload or mid-call capability widening. Record catalog/descriptor identity in the run, show the affected active runs before maintenance, and reconcile them against the new binding before resuming. Fabric may retire dependents when a present optional provider changes or disappears: stop safely, report the interruption and reactivate unaffected built-in functionality rather than promising uninterrupted optional-dependency failure isolation. PR0/PR4 must prove this blast radius with two runs.

Ship a tiny external fake provider fixture and verify registration/discovery, missing/mismatched schemas, preset precedence, evaluation, result rejection and catalog reload through the actual Arbor path. Trusted custom command evaluators remain the simpler extension option. No general plugin framework or copied upstream coordinator is needed.

### 6.3 Acceptance and uncertainty

A measured keep requires:

1. A settled executor and frozen candidate identity.
2. Mutable-scope/evaluation-input checks appropriate to the run.
3. Successful evaluator execution and valid unambiguous output.
4. Required correctness checks or quality vetoes passing.
5. Measurements tied to this exact candidate and spec/epoch.
6. Comparison against the **current incumbent**, with strictly positive direction-aware gain meeting the practical threshold.
7. Any declared noise/repetition policy and selected held-out gate satisfied.
8. Atomic recording of the decision and exact integration intent.

A metric line before a nonzero exit is diagnostic only. Missing or ambiguous output, timeout, cancellation, and failed required checks cannot become a measured win. Never substitute an LLM-supplied scalar.

For relative thresholds, define denominator behavior using incumbent magnitude; require an absolute threshold or explicit policy for zero baselines. Preserve exact decimal behavior and test minimization, negative values, boundary equality, units, and ties.

For noisy command measurements, use a bounded incumbent/candidate recheck when spread is comparable to gain; otherwise report inconclusive. Product defaults are not significance tests. For agent tasks, preserve pairing and task-level uncertainty; do not count repeated trajectories or grader labels as independent tasks. The evaluator's declared, tested analysis policy owns statistical interpretation; the Arbor decision service combines that evidence with practical gain, quality vetoes and required review. A scalar improvement alone cannot override an inconclusive or failed required evidence gate.

### 6.4 Held-out validation

Ship held-out support as required functionality, enabled by run choice/preset. The actor/executor uses development feedback for search. A selected candidate is evaluated on the held-out split before validated promotion or final verification according to the saved protocol.

Record baseline/incumbent and candidate held-out evidence using the same policy. Keep test-specific details out of ordinary ideation context. Repeated test gating is adaptive reuse, not pristine final generalization evidence; limit and report it, and support a final untouched split when the benchmark provides one.

No sealed evaluator, secret dataset claim, Bubblewrap setup, or signed admission is required. Trusted local workers may technically access local files. State that limitation rather than claiming secrecy from split labels.

### 6.5 Budget accounting

Reserve attempt and active-candidate capacity transactionally. Persist evaluator invocation counts, including retries/rechecks and baseline/held-out evaluations. For agent suites, import available measured/judge/descendant usage without counting parent and child totals twice.

Wall-clock/active-time budgets need a persisted definition across resume. Paused time is excluded from active time; overlapping work counts according to the declared run-time policy, not an accidental sum. Stop new work when remaining capacity is insufficient.

Token/cost telemetry can be delayed or unknown. Label these as observational ceilings unless the selected runtime actually enforces a hard limit. Parallel calls can overshoot observational budgets. Do not advertise a hard monetary cap inferred from native usage after completion.

## 7. State, workspace, controls, and recovery

### 7.1 One research authority

Retain SQLite behind a much smaller fresh schema:

```text
runs, nodes, attempts, evaluations, decisions,
operations, controls, events, artifact_refs, lessons
```

The database owns research facts; Fabric owns execution participants and actor transcripts. Store native IDs/references, not a duplicate actor scheduler. Events are compact deltas; reports and JSONL are derived, not additional writable truths.

Use transactions for capacity reservation, terminal result deduplication, node updates, and incumbent decisions. One active coordinator binding per run plus revision checks prevents stale activations from committing. Do not ask the model to implement lease renewal.

Suggested fresh state layout:

```text
<arbor-state>/<project-id>/v2/
  research.sqlite3
  runs/<run-id>/
    spec.json
    report.md
    roles/                 # resolved operational instructions/references
    attempts/<attempt-id>/
      worker-summary.json
      candidate.patch
      evaluation.json
      logs/
    sources/
    exports/
```

State lives outside candidate material. Preserve the operational role bundles and binding/invocation provenance described in section 4.7 through ordinary package updates and resume. Store only required instruction/reference artifacts and native configuration identities, not credentials or duplicate agent transcripts. Backups, corruption errors, and current-format resume remain useful. They do not imply a legacy migration obligation.

### 7.2 Dirty source capture and workspaces

Capture tracked staged/unstaged content without modifying the source index. Include explicitly selected untracked files; exclude ignored files by default. Preserve modes, symlinks, deletions, and identities; detect source changes during capture. Refuse unresolved merges and unsupported submodule/sparse cases clearly.

Use run-owned refs and independent candidate worktrees. Keep candidates reachable until explicit cleanup. Freeze material after writers settle; separate evaluation-generated changes from accepted material. Export `captured baseline -> selected candidate`, not `source HEAD -> candidate`, so existing user work is not bundled into Arbor's delta.

Restore only owned workspaces, including worker-created commits/staging. Standard worktrees are practical isolation, not write confinement. Keep useful path and NUL-delimited Git handling tests; delete private-object certification architecture after replacement tests pass.

### 7.3 Keep, apply, and undo

Keeping updates the owned incumbent. Applying to the original source is explicit and separate. Check affected-path preimages and preserve unrelated edits. Record intended predecessor/target and per-path pre/postimages before consequential writes. If partial application is ambiguous, preserve the patch and report a conflict rather than claiming success or blindly applying an inverse.

Use Git CAS for owned ref updates. Export is always available when direct apply is blocked. Undo verifies that later user edits will not be overwritten.

### 7.4 Controls and lifecycle

- **Steer:** persist an instruction and notify the actor. Immediate worker steering is optional and must use public supported routing.
- **Pause:** stop new dispatch; finish the currently admitted boundary, then show paused.
- **Cancel:** stop scheduling immediately, invoke public stop for owned actors/workers, cancel evaluator handles, await actual outcomes.
- **Cancelled:** tracked owned work is settled.
- **Cleanup pending/interrupted:** ownership or termination is unresolved; do not claim completed cancellation or delete its workspace.

Use native Fabric lifecycle subscriptions for terminal events. Subscribe and then check status to close the finish-before-subscribe race. On resume, reconcile known IDs even if an event was lost. Duplicate delivery is harmless because terminal ingestion is idempotent.

Fabric retires the live provider binding before dependent withdrawal and inverses; Arbor must not prescribe a conflicting retire-last order. Mark the owner service draining and reject new launches, settle in-flight launch results, stop tracked owned work through public APIs, and record interruption/cleanup status. Already committed views may retain the retiring generation. Keep storage and supporting resources needed by those calls valid until provider `close()` runs after the applicable retainers/in-flight calls release. Avoid double-closing shared resources; register cleanup ownership during activation and prove idempotent generation-aware disposal. Do not depend on adding lifecycle registrations afterward. Child/passive component disposal releases only local forwarding/read resources and never cancels another owner's work. The deterministic terminal cleanup bridge described in section 4.4 must be proven independently of participant mailbox delivery.

Process groups, Linux process units, resistant-descendant containment, and sandbox certification are **not** an Arbor implementation requirement. Use ordinary cancellation for directly owned evaluator processes and the selected Fabric runtime's supported stop contract. Do not promise arbitrary descendant termination. If a workload cannot be stopped through supported ownership handles, report the limitation instead of adding the removed subsystem.

### 7.5 Recovery of consequential gaps

Persist an operation ID, run/attempt identity, expected predecessor, intended target, and observed completion state for consequential Git/apply operations. This is a small recovery journal, not the v1 universal effect protocol.

Mandatory reconciliation points:

1. Attempt reserved but no spawn yet.
2. Spawn returned remotely but handle attachment was interrupted.
3. Worker interrupted with partial material.
4. Worker finished but material not frozen.
5. Material frozen but evaluation not completed.
6. Evaluation finished but decision not committed.
7. Git target/ref changed but operation not committed.
8. Original-source application partially completed.
9. Cancellation/reload interrupted cleanup.

Use native IDs and recorded attempt identity to recover known work. If the spawn/attachment gap cannot be resolved, block that attempt rather than duplicate possibly active execution. For Git, adopt the exact target if already present, retry only from the expected predecessor, and block any other state. Report generation is retryable derived work and never prevents an otherwise valid run from settling.

## 8. Source-only packaging and compatibility

### 8.1 Eliminate the dist workflow

| Surface | Target |
|---|---|
| Package entrypoints/exports | Supported source `.ts` entries; delete obsolete subpath exports |
| Pi registration | Source extension and skill paths |
| CLI | Small handwritten `.mjs` launcher using `tsx/esm/api` to load TypeScript |
| Imports | Consistent source imports with strict no-emit typechecking |
| Tests | Source execution through `tsx`; no `.test-dist` |
| Web assets | Serve existing JS/CSS/HTML directly; stable asset URLs |
| Build scripts/prepack | Remove mandatory compilation and hash/copy-only web build |
| Package contents | Source, launcher, assets, skills, documentation; no runtime data/certification payloads |
| Developer workflow | Typecheck, targeted source tests, source CLI, reload |

Prove package loading, CLI help, tests, assets, and source-edit visibility with `dist` and `.test-dist` absent. Source loading is not permission to import Fabric internal chunks. If the browser later needs transformation, isolate it to the browser rather than restoring a package-wide emitted runtime.

### 8.2 Separate Fabric add-on and installation contract

Publish `pi-fabric-arbor` as an independent Pi extension package, not a Fabric-core feature or fork. Its manifest loads the source extension and the single public `fabric-arbor` skill. Package the three internal role documents, conditional references, presets, evaluators, examples and read-only web assets. Declare Pi/Fabric peer requirements and actual runtime dependencies; do not depend on this profile's directory layout or unrelated skills.

The extension owns Pi commands, setup/doctor, component registration, owner routing and research-specific presentation. The managed component publishes Arbor's deterministic domain operations. Fabric owns the generic agent/actor/participant runtime, permissions, capability lifecycle, operational activity and compaction. Model-specific guidance is optional advice, not an Arbor role loader. A missing generic host-forwarding or completion seam is an explicit PR0 blocker and possible narrowly scoped upstream API proposal, not permission to import Fabric internals.

A clean temporary install must demonstrate independent package loading, built-in command and agent-suite evaluation, explicit component configuration, and read-only browser inspection without any profile-local skill. CLI writes require a live-host connection through the proved public seam; do not start a replacement SDK runtime to make offline commands appear successful.

### 8.3 Compatibility without admission

Keep declared dependency floors, actual tested versions, and lockfile resolutions separate. The earlier inspected targets were Node >=24, Pi >=0.84.4, and Fabric >=0.83.0; these are proposed initial test targets, not assertions about when APIs first appeared or permanent runtime allowlists. Confirm the exact floors during implementation.

Use public component/provider registration, source loading, actors, spawn/status/stop/list, lifecycle subscription and model selection interfaces. Capability availability and argument semantics matter; a newer release label alone never rejects startup.

Doctor remains accessible when the component cannot activate. It distinguishes installed, configured, enabled, available, and behaviorally tested. Missing optional search/held-out support affects only selected features. Missing actor/provider capabilities or incompatible Schema enforce mode produce a concrete blocker; never silently disable host policy or switch to another orchestrator.

Resolve the chosen active Pi model explicitly when no Arbor override exists. Do not accidentally inherit an unrelated worker-model default. Record coordinator/executor/subject model identities separately, and record unknown identity as unknown.

## 9. Capability coverage and disposition

### 9.1 Core retained requirements

| Capability group | Implementation disposition | Acceptance |
|---|---|---|
| Intake/configuration | Launch card and resolved spec with origins | One configured start, no protocol fields |
| Repeated research loop | Persistent actor plus finite deterministic operations | Multiple actual attempts without user sequencing |
| Observe/ideate/select | Tree projection and actor reasoning | Evidence-informed selection with bounded context |
| Dispatch/debug/retry | Native Fabric executors, fixed hypotheses and invocation lineage | No duplicate execution; retries charged |
| Baseline/metrics/checks/threshold | Domain-neutral evaluators and deterministic acceptance | Failed output/checks/ties never win |
| Dirty material/workspaces | Snapshot capture and isolated candidate worktrees | Original contents/index preserved |
| Keep/discard/apply/undo | Owned incumbent plus explicit source integration | Exact rollback and conflict-aware apply |
| Budgets/controls/recovery | Transactions and native execution observations | Pause/cancel/resume match visible state |
| Inspection/failures/lessons | Shared projections, reports, lesson index | All current-format outcomes remain inspectable |

### 9.2 Every earlier research-table entry

“Optional activation” below means the feature ships but the user need not enable it for every run. It does not mean deferred implementation.

| Earlier capability | Revised disposition | Main delivery |
|---|---|---|
| Branching hypothesis tree | Required; typed directions/leaves and lineage | PR6, PR7 |
| Pruning | Required; separate selection pruning from cancellation | PR7 |
| Exploration versus exploitation | Required; explicit actor policy/reasons, not invented MCTS | PR6, PR7 |
| Convergence detection | Required; transparent stop/shift signals | PR6, PR7 |
| Parallel execution | Earlier Defer overridden by requested practical parallelism | PR7 |
| Partial executor resume | Required; exact partial artifact continuation | PR8 |
| Held-out validation | Required implementation, optional activation | PR9 |
| Interaction modes | Required auto/direction/review/collaborative boundaries through Pi/attached CLI; browser observes pending decisions only | PR8, PR12 |
| Literature search | Required integration, optional activation | PR10 |
| Grounded ideation | Required visited-source evidence and hypothesis links | PR10 |
| Novelty assessment | Remains deferred | No new novelty subsystem |
| Experience distillation | Required leaf/direction/project lessons | PR6, PR10 |
| Trajectory export | Required structured proposal/action/outcome records | PR10, PR12 |
| Domain presets/plugins | Required lightweight preset/adapter contracts | PR4, PR11 |
| Configuration precedence | Required frozen resolved spec and provenance | PR3 |
| Benchmark scaffolding | Required optional preparation workflow; scaffold is unvalidated until run | PR11 |
| Benchmark zoo/example packs | Required packaged/documented integration examples | PR11 |
| Rich web/replay/export | Required read-only monitor/replay and retrieval of existing exports; export generation is Pi/attached-CLI only | PR12 |

### 9.3 Former optional follow-up PRs are included

- **O1:** branching and bounded parallel search is PR7, with shared-budget and stale-result tests.
- **O2:** held-out validation and research presets are PR9 and PR11.
- **O3:** grounding, improved recall, and upstream benchmark preparation are PR10 and PR11.

Other earlier deferred items remain deferred: automated acquisition campaigns, a new independent critic subsystem, composite objectives and general stateful tasks. Training-oriented learning pipelines remain omitted. No claim of full upstream parity is required.

### 9.4 Safeguards removed, not renamed

| Old mechanism | Action |
|---|---|
| Exact-release/kernel/binary/source certification | Delete startup gates and corresponding workflows |
| B0-B12/Phase 7 signed graduation chains | Delete; keep useful ordinary tests only |
| Owner-TTY keys and signed promotion authorization | Delete; retain explicit user apply and normal host policy |
| Bubblewrap/hardened isolation | Remove, with no optional hardened adapter backlog |
| Process groups/Linux process units | Remove from implementation and acceptance scope |
| Loopback binding, CSRF/origin checks, bounded web input safeguards | Delete package-owned enforcement and protocol coupling in `src/web/DetachedMonitorServer.ts`, CSRF session fields in `api-schemas.ts`, and associated UI/header/limit checks and tests. Do not port them into v2. A conventional local listening default is not mandatory binding admission. |
| Full-repository certification around every effect | Replace only with practical snapshot/scope/apply consistency checks |
| Legal-hold/certified retention | Delete; use explicit archive/cleanup |
| Licensing certification/investigation | No workstream or release gate |

Retain ordinary schemas, command exit validation, exact material/evidence identity, transactions, source-work preservation, and explicit apply. Those prevent incorrect results and lost work; they are not a revived certification mode. Remove the old browser control endpoints and intent-submission code rather than leaving dormant mutation handlers. Read-only API/asset contract tests are required and are not a reinstatement of the removed security-hardening suite. Do not strip unrelated dependency security defaults as part of simplification. The read-only web interface is for this trusted personal-use environment, not a newly supported public service.

## 10. Module-by-module change map

| Existing area | Action and target |
|---|---|
| `package.json`, lockfile, TS configs, `bin/` | Source exports/runtime/tests; one thin launcher; remove certificate binaries and prepack build |
| `src/extension.ts` | Pi commands/tools, component registration/discovery, setup/doctor; no hidden readiness pointer |
| `src/component/definitions.ts` | Managed owner/forwarding publication, definition-time exact dependencies, retained-resource lifetime and local-only cleanup; no research loop in activation |
| `src/application/ProductionAdmission.ts` | Delete |
| `src/application/ProductionComposition.ts` | Replace with explicit small service composition |
| `src/application/ArborApplication.ts` | Replace with experiment service and finite research operations; no v1 reducer translation |
| `src/public/`, `src/schemas/` | Four facade and six research operations with one shared schema source; an explicit granular provider-action manifest for risk, caller classes, review/apply routes and read-only browser queries |
| `src/driver/` | Replace admitted driver with native Fabric execution adapter, explicit owner-host forwarding, role/request assembly, actor bindings and separate notification/cleanup routes; no profile runtime |
| `src/adapters/interfaces.ts` | Reduce to actual workspace/evaluator/execution seams |
| `src/domain/decimal.ts` | Retain arithmetic; fix tie/current-incumbent decision behavior |
| `src/domain/types.ts`, state machines | Fresh run/node/attempt/evaluation domain; remove legacy protocol types |
| `src/evaluation/` | Packaged command and native Fabric agent-suite evaluators, grading/analysis and accounted feedback; no profile-skill dependency or sealed admission |
| `src/system/process.ts` | Ordinary owned command execution, output/deadline handling; remove process-group/containment dependencies |
| `src/git/` | Retain useful safe Git helpers; replace private certified workspace/promotion framework with snapshots/worktrees/apply |
| `src/persistence/` | Fresh smaller SQLite schema and artifact store; no legacy reader/importer |
| `src/recovery/` | Consequential operation/handle reconciliation, not universal effect certification |
| New `src/research/` | Actor context/proposals/tree policies and deterministic domain operations |
| New `src/presets/`, `examples/` | Code, agent-improvement and research configurations; no second plugin runtime |
| `src/reports/` | Direction-aware summary, failures, uncertainty, trajectory/report exports |
| `src/web/`, `web/` | Strictly read-only tree/evidence/replay projections and static assets; delete mutation endpoints, control intents, approval forms and export-generation handlers |
| `ReleaseWebAssets.ts`, `scripts/build-web.mjs` | Replace emitted manifest/hash-copy coupling with source assets |
| `src/authorization/`, `src/certification/`, certification compatibility modules | Delete active runtime and scripts |
| `src/phase7/` | Delete signed machinery; move useful limits/test cases to their domain owners |
| `src/retention/`, `src/cleanup/` | Explicit owned-artifact cleanup; no legal-hold framework |
| `src/fixtures/` | Move useful deterministic fixtures under tests; forbid production imports |
| `skills/fabric-arbor/SKILL.md` | Rewrite the public entrypoint for setup, research use, interpretation and control; no manual driver choreography |
| New `skills/fabric-arbor/roles/` and `references/` | Consolidated coordinator/executor/literature role documents and conditional references from section 4.7; upstream mapping in maintenance docs; no additional skill registrations |
| README, scoped `AGENTS.md`, docs, acceptance ledger | Authoritative v2 commands/architecture and observed-vs-planned evidence |
| `dist/`, `.test-dist/`, certification payload packaging | Remove from active product and shipped contents |

New actor/research code must not import Fabric `dist` chunks, reconstruct internal execution contexts, launch its own Pi SDK sessions, or invent unsupported provider methods. The component uses the supported host API; actor guests use native Fabric proxies.

## 11. Implementation backlog and dependency order

All PRs below are required for the agreed scope. Intermediate milestones are useful development checkpoints, not permission to declare completion before research/UI integration ships. Effort ranges are rough focused maintainer-days, not commitments; re-estimate after PR0 resolves the owner-host and deterministic completion seams and the independent agent-suite proof. Any required upstream generic API change is an explicit prerequisite, not hidden inside these estimates.

### PR0. Falsify actor/component and evaluator integration first

**Dependencies:** none. **Effort:** 2-3 days.

Create a source-loaded test component, local fake model/provider, disposable material, one persistent coordinator and two bounded executor activations. Identify the exact public seams for owner-host request/acknowledgement, cancellation/policy propagation and deterministic terminal cleanup. Record native owner/root identities across Main, actor child, executor, passive Pi host and attached CLI. End the coordinator activation before its worker completes; prove the worker survives, completion reaches the explicit coordinator mailbox, and another activation continues research without Main choosing the next step. Prove passive/child teardown cannot stop owner work.

Exercise idle-host continuation, child capability commitment, subscriptions versus host cleanup, pause, stop, generation replacement and re-grounded resume. Verify explicit role loading with an instruction sentinel, packaged references from a worktree and effective tools/result schema; missing mandatory files block before spawn. Separately prove Arbor's own agent-suite fixture over public Fabric calls, baseline/candidate snapshot loading, independent deterministic grading and interrupted evaluation recovery. It must run without profile-local benchmarking skills or their environments. Test optional evaluator catalog binding/change with an unrelated built-in-evaluator run.

**Acceptance:** only public APIs; no internal imports, certificates, emitted output, custom coordinator loop, profile-skill dependency or paid model required. Worker ownership survives actor-turn boundaries, notification delivery does not create a Main research loop, and deterministic terminal cleanup runs outside the actor. A stopped actor is replaced correctly when needed. Retained-generation calls do not observe closed storage and replacement cannot admit stale writes. Evaluation completion cannot be confused with adoption.

**Risk/response:** a matching child descriptor is not proof of owner invocation. If public owner forwarding, deterministic lifecycle observation or correct resource lifetime is unavailable, stop and document the smallest required generic Fabric API change before production implementation. Do not substitute private imports, a new message broker, a custom engine or SDK runtime. Host-surviving residency remains optional and needs a separate successful proof of the whole path.

### PR1. Source-only package and test path

**Dependencies:** PR0. **Effort:** 1-2 days.

Change exports, imports, launcher, TS checking, tests, web asset loading, package contents and scripts. Delete mandatory build/prepack paths.

**Acceptance:** clean temporary install loads the independent source extension, CLI and read-only browser assets with `dist`/`.test-dist` absent. Package-loading tests exercise fixture skill/role assets under the intended layout; production role behavior lands in PR6/PR10 and the public entrypoint in PR12. No profile-local skill or copied benchmarking helper is available to the fixture. A source sentinel edit appears after reload; no generated runtime is needed.

**Risk/response:** path/loader assumptions. Fix the source path, not a parallel permanent build fallback.

### PR2. Real managed component and actor binding

**Dependencies:** PR1. **Effort:** 2-3 days.

Replace admission/composition; register the managed `arbor` owner/forwarding component/provider; implement setup/doctor and definition-time exact dependencies. Implement the PR0-proven host routing and cleanup seams, native owner binding and retained-resource disposal. Add actor creation/reuse after provider activation, explicit coordinator-targeted subscriptions and a separate outbox policy. Registration never starts research or grants a passive host cleanup ownership.

**Acceptance:** available capabilities activate without certificates; missing required refs give actionable diagnostics; no duplicate coordinator from reload/discovery; normal registration does not start research.

**Risk/response:** stale generation or lifecycle races. Keep doctor/inspection available and launch no work when binding is unresolved.

### PR3. Fresh run specification, store, and public interface

**Dependencies:** PR2. **Effort:** 2-4 days.

Implement the fresh schema, domain-neutral spec, configuration precedence, four product facade operations, six research operations, transactions, control receipts and compact events. Publish the exact provider-action manifest with schemas, per-action risk/effects, caller classes and command mappings; narrower review/apply/undo routes may add refs without expanding the product facade. Keep human-approval routes outside actor/worker capabilities. The browser schema contains reads only. No legacy schema support.

**Acceptance:** duplicate controls/results do not duplicate effects; stale revisions cannot overwrite; budgets reserve atomically; source/model identities and origins are recorded. Actor self-approval and stale user receipts fail, effect risk is not understated by a facade, and Pi/attached-CLI mutations preserve the required host-policy path. No browser mutation route exists.

**Risk/response:** state ambiguity. Add crash/reopen and transaction tests now; no second mesh authority.

### PR4. Material and evaluator adapters, including agents

**Dependencies:** PR3. **Effort:** 3-5 days.

Implement the packaged command and Arbor-owned agent-suite adapters over the existing Fabric execution adapter. Freeze evaluation definitions, task pairing/order and grading policy; implement metric parsing, deterministic grading, optional bounded judges, failure-inclusive analysis and quality vetoes. Account for exploratory evaluator feedback, retries and rechecks. Distinguish coordinator/executor/subject roles. Implement the finite optional provider catalog and lightweight preset contracts without profile-skill dependencies.

**Acceptance:** a clean install evaluates a prompt-only candidate on fixed tasks using public Fabric execution and independent deterministic grading. Failed native execution never becomes a score; interrupted evaluation reconciles without duplicate dispatch. Candidate loading, pairing, task-level uncertainty and failure inclusion have direct oracle tests. Every scored feedback/retry/judge invocation is charged. Missing optional providers do not block built-in evaluation, and catalog changes follow the explicit maintenance/reload protocol. Command parsing covers direction/units/failures.

**Risk/response:** unsupported suite methods/runtime or uncalibrated analysis. Report concrete limitations, keep statistical scope small, and use tested library methods for selected inference. Do not import a profile skill, fabricate evaluation results or build a generic statistics platform.

### PR5. Dirty snapshots, owned workspaces, and acceptance

**Dependencies:** PR3-PR4. **Effort:** 3-5 days.

Implement source-preserving capture, per-candidate workspaces, freeze/restore, exact evaluation identity, current-incumbent comparison and noise policy.

**Acceptance:** staged/unstaged/untracked material, modes, symlinks and worker commits behave correctly; ties/check failures cannot win; deltas exclude pre-existing user work.

**Risk/response:** Git edge cases. Retain characterization tests and refuse unsupported states rather than guessing.

### PR6. Complete actor-led research, two vertical slices

**Dependencies:** PR2-PR5. **Effort:** 3-5 days.

Implement the single consolidated coordinator role, its conditional strategy/evidence procedures and the executor role, with explicit request assembly, frozen bundles and invocation provenance from section 4.7. Integrate merge/evaluation interpretation and resume explanation into the coordinator; keep grading, eligibility, recovery and factual reporting in code. Implement observe/ideate/select/dispatch/collect/evaluate/distill/decide behavior, within-run lessons and stop rules. Dispatch mechanics stay in the owner service; worker instructions remain hypothesis-bound. Ship foundational role procedures here, not as a late PR12 documentation task.

**Acceptance:** two actual end-to-end fixtures: code optimization and agent-instruction improvement. Each performs baseline, improvement, valid non-improvement, failed check, and further improvement with the correct incumbent. No fixture driver shortcut or user-sequenced loop. Verify explicit role loading, operational-versus-subject skill-name/path collisions, and stable role instructions after package updates or recorded explicit role changes on resume.

**Risk/response:** reasoning/continuation stalls. Surface waiting/failed state; fix native routing and explicit operation contracts, not a hidden autonomous fallback controller.

### PR7. Branching, parallel candidates, pruning, and convergence (O1)

**Dependencies:** PR6. **Effort:** 3-5 days.

Implement typed tree/refinement, exploration/exploitation policy, two-candidate waves, capacity reservations, serial measurement option, stale-incumbent revalidation, and ancestor revision updates.

**Acceptance:** no duplicate dispatch or lost sibling insight; minimization rankings correct; combined material re-evaluated; pause/convergence stops new waves; concurrency one remains simple.

**Risk/response:** overhead/interference. Measure it and choose concurrency one for affected workloads, without a new scheduler service.

### PR8. Controls, partial resume, recovery, and apply

**Dependencies:** PR5-PR7. **Effort:** 3-6 days.

Connect Pi/attached-CLI pause/steer/cancel/review, native stop/subscriptions, partial material continuation, consequential operation journal, keep/export/apply/undo and component reload recovery. Record user review receipts against exact material/revisions; preserve separate Fabric permissions. Reject mutation attempts from offline CLI and keep the browser read-only. Prove owner/passive teardown and generation-retained storage lifetimes.

**Acceptance:** crash-point suite; one-command current-format resume; original source preserved; control receipt differs from completion; no worker relaunch across ambiguous attachment; interrupted cleanup visible.

**Risk/response:** ownership and partial source writes. Preserve artifacts and block ambiguous operations; never guess PIDs or undo later user edits.

### PR9. Held-out research validation (O2, part one)

**Dependencies:** PR4-PR8. **Effort:** 2-3 days.

Implement selected test/final validation policies, baseline/candidate comparison, configured long evaluation deadlines, and clear dev-only/held-out labels.

**Acceptance:** dev winner/test loser is not validated; absent held-out evidence never shown as transfer; repeated test use counted; changed integrated material remeasured.

**Risk/response:** overfitting/noise. Preserve uncertainty and limit adaptive test use; no sealed-data machinery.

### PR10. Grounding, experience, recall, and trajectories (O3, part one)

**Dependencies:** PR6-PR9. **Effort:** 2-4 days.

Integrate existing search/fetch capabilities, inspected-source references, grounded hypotheses, project lesson retrieval/distillation, negative findings, and trajectory export. Adapt the bounded search role through the same native role/request adapter; remove novelty classification and fallback-runtime instructions rather than copying the upstream search skill unchanged.

**Acceptance:** unvisited sources not marked inspected; minimization unaffected by maximization-only gates; lessons retain source/run/evidence links; duplicate or contradictory findings remain explainable. The search child receives its intended role/capabilities and returns source-linked evidence through native completion; it does not run another research coordinator or novelty subsystem.

**Risk/response:** unavailable tools or excessive context/cost. Bound selected evidence and expose optional-feature unavailability; no duplicate search runtime.

### PR11. Presets, scaffold, and example packs (O2/O3 remainder)

**Dependencies:** PR4, PR9-PR10. **Effort:** 2-4 days.

Ship code and agent-improvement examples, a data/recipe-oriented example, research presets, and optional upstream benchmark scaffold/pack integration through its public preparation interface in a declared environment. Do not adopt the upstream coordinator/tree as a side effect.

**Acceptance:** deterministic examples run through the real application; generated scaffolds explicitly unvalidated until baseline execution; optional heavyweight datasets/services are documented, not downloaded automatically. Separate runnable packs from illustrative configurations.

**Risk/response:** upstream internal API drift. Use documented package/CLI boundaries or a small maintained template adapter; pin preparation inputs where needed, not host runtime admission.

### PR12. Pi dashboard, web/replay, reports, and skill

**Dependencies:** PR6-PR11. **Effort:** 3-5 days.

Implement Arbor-specific hypothesis/incumbent/evidence/uncertainty views, candidate diffs, Pi launch/intake/review controls, attached-CLI commands, reports and export generation. Reuse Fabric's participant topology, worker logs, execution status and operational controls; emit generic provider activity updates where sufficient instead of building another worker dashboard. Any Arbor status widget summarizes research facts only.

The browser serves read-only projections, tree/table/diff/log views, SSE/replay and already-generated artifacts. Remove all legacy browser control forms, mutation/intent handlers and export-generation routes, including mutations disguised as reads. Implement the one rewritten public skill; document the three role assets and conditional references already delivered in PR6/PR10. Do not defer role loading to this UI milestone.

**Acceptance:** Pi/CLI/web reads agree on authoritative revision; only Pi/attached-CLI controls show queued/applied/blocked receipts. Browser requests and replay leave research/control rows, workspace refs and export inventory unchanged; attempted mutations are rejected and no side-effectful GET path exists. Browser displays pending review without answering it. Existing artifact retrieval performs no export generation. Reuse native participant/log controls without duplicate ownership state. Exercise all nine journeys through their permitted surfaces.

**Risk/response:** second-state or second-dashboard creep. Presentation owns no research truth. Pi/attached CLI submit commands; web only reads projections/artifacts. Read-only contract tests are required, but no browser security-hardening workstream is added.

### PR13. Hard cut-over deletion and documentation

**Dependencies:** all prior PRs. **Effort:** 1-3 days.

Delete v1 admission/protocol/driver/certification/authorization/Phase 7/build paths and obsolete fixtures/docs. Publish only the fresh source-loaded product. Update README, scoped guidance and acceptance ledger in the same changes.

**Acceptance:** no legacy imports, readers, migration commands, emitted-runtime consumers or certification gates; all required research features and examples present; no stale documented command. Existing user artifacts untouched unless separately authorized for deletion.

**Risk/response:** hidden references. Mechanically audit imports/exports/scripts/package files and run a clean source install. Source rollback is via Git, not a permanent dual runtime.

## 12. Acceptance ledger and validation plan

These are planned checks. Documentation/source inspection and earlier isolated probes do not count as passing this ledger.

| ID | Concrete required proof |
|---|---|
| A01 | Source extension, CLI, tests, assets and reload work with emitted directories absent |
| A02 | Managed component and persistent actor run through public interfaces; no custom coordinator loop or private imports |
| A03 | Agent improvement changes instructions/configuration and improves independently graded task outcomes through the actual product path |
| A04 | Code optimization also runs end to end; non-Git material capture and data/recipe example work |
| A05 | Invalid baseline, failed exit/check, timeout, ambiguous metric, and tie cannot become measured wins |
| A06 | Candidate compares against current incumbent; maximize/minimize, zero/negative and threshold cases pass |
| A07 | Dirty source index/content/untracked files survive start, failure, cancel, discard and export |
| A08 | Staged and committed candidate rollback restores exact owned state; integration-generated material is re-evaluated |
| A09 | Pi/attached-CLI pause, steer, cancel and partial resume match persisted semantics/budgets. Exercise Auto continuous progress, Direction approval before expansion, Review approval before promotion and Collaborative pause/resume; timeout never auto-approves. Browser only displays pending decisions. |
| A10 | Spawn/attachment, evaluation/decision, ref/commit and partial-apply crash gaps reconcile or block without duplicate effects |
| A11 | Component reload/dependency replacement settles tracked work and prevents stale writes; stopped actor is replaced correctly. Successful/failed/cancelled terminal cleanup leaves no live run-owned coordinator/subscriptions; duplicate/late notifications cannot restart work. |
| A12 | Two parallel candidates have isolated material, atomic reservations, no insight overwrite, and serialized measurement where configured. In a controlled fixture with two independent one-second executor workloads, three warmed waves demonstrate actual overlap and median parallel wave time at most 80% of serial time; record setup/dispatch/collection overhead and environment. A failure triggers investigation, not an unsubstantiated practical-speedup claim. This fixture requires no paid model. |
| A13 | Tree direction/leaf/depth rules, exploration, pruning and convergence work without treating prose quality as proven |
| A14 | Held-out loss blocks validated promotion; dev-only labels and adaptive test-use counts are accurate |
| A15 | Literature grounding, negative lesson reuse, experience distillation and trajectory export retain factual provenance |
| A16 | Presets, benchmark scaffolding and runnable example packs are integrated; the external evaluator-provider fixture passes definition-time binding/discovery/schema/precedence/execution/result-validation tests. A missing optional action does not disable built-in evaluation. Catalog changes require maintenance/rebinding; two-run tests expose replacement blast radius without stale calls or silent reload. Illustrative assets are not reported as executed. |
| A17 | Pi, CLI and read-only web/replay agree on state/evidence/failure/uncertainty and stop reason. Browser has no mutation forms/endpoints or control-intent writes, cannot approve or generate exports, and cannot mutate via GET. Read/replay/artifact retrieval leaves research/control records, workspace refs and export inventory unchanged. Pi/attached CLI alone submit controls. |
| A18 | Fresh install/cut-over needs no legacy history, certificates, compatibility bridge or migration |
| A19 | Mechanical source/import/schema/UI scans confirm removed package-owned sandbox/process-group/web-safeguard and certification implementations are not retained in v2. No corresponding setup, hardening/certification tests, licensing workstreams or release gates are reintroduced. Ordinary read-only browser contract tests remain required under A17. Unrelated dependency defaults are not stripped. |
| A20 | Arbor's packaged agent-suite adapter runs baseline/candidate tasks through public Fabric calls in a clean temporary install with no profile-local benchmarking skill, helper or environment. Independently graded outcomes use the exact candidate snapshot; interrupted/partial evaluations reconcile without duplicate dispatch. Native execution, evaluation validity, analysis interpretation and incumbent decisions stay distinct. Selected unsupported methods block honestly. |
| A21 | Attempt/evaluation limits include baseline, exploratory scored feedback, retries, rechecks, held-out and judge calls. Every authoritative evaluator invocation has a reserved ID/native result. Informal diagnostics cannot supply promotion scores and have declared separate limits; delayed/unknown usage is not presented as a hard enforced cost bound. |
| A22 | Four product facade and six research operations are implemented; every registered provider ref, command mapping, schema, caller class, risk and effect is listed in the PR3 manifest, including any narrower review/apply/undo routes. Exactly one public `fabric-arbor` skill is discovered; coordinator/executor/literature documents and conditional references are packaged but not registered as skills. All eleven upstream skills have an explicit merge/delete/role disposition. Component configuration matches the derived definition. |
| A23 | PR0/PR6: actual actor/child boundary exposes the resolved role instructions, effective tools/capabilities and result contract. Inspect the fake provider's received context and exercise an instruction sentinel; test required phase loading and reference resolution from a worktree. Missing bootstrap files block before spawn; missing phase references block that phase. Discovery-list presence alone is not proof. |
| A24 | PR6/PR8: resume after packaged role files change uses the recorded bundle; missing/incompatible bundles block clearly. Explicit role changes create attributable new bindings without rewriting prior attempt provenance. No credentials or duplicate transcripts enter role artifacts. |
| A25 | PR4/PR6/PR10: a candidate skill with the same name/path as an operational role cannot replace coordinator/executor instructions. Separately prove the subject runner loads the candidate snapshot. Adapted search uses native execution and source-linked output without novelty classification or fallback state/runtime. These are trusted configuration tests, not containment claims. |
| A26 | PR0/PR2: record actual native owner identities, route a child provider call to the designated owner, end the coordinator activation while its worker runs, and observe the next coordinator activation on completion with no Main research inference. Passive host/child disposal cannot stop owner work; owner loss and CLI attachment failures block new mutations without duplicate dispatch. |
| A27 | PR0/PR3/PR8: participant-targeted subscriptions and deterministic owner cleanup use separately named, exercised public seams. Actor outbox settings do not masquerade as actor continuation; duplicate/detached notifications do not create a second coordinator. |
| A28 | PR3/PR8: actor self-approval, forged/stale review flags and source-apply calls outside the allowed caller route are rejected. Real Pi/attached-CLI receipts bind to material/epoch/revision; Arbor review never bypasses Fabric permissions, and Fabric allow never substitutes for required research review. |
| A29 | PR0/PR2/PR8: a retained old-generation call has valid supporting storage until provider close; retirement precedes disposal, cleanup is idempotent and owner-scoped, and resource failures remain explicit without stale writes or double-close. |
| A30 | PR1/PR12: independent package manifest/source install includes all runtime assets and declared dependencies without profile-path imports. Arbor research views reuse Fabric participant/log/activity facilities rather than maintaining another operational dashboard or writable execution-state mirror. |

### 12.1 Validation ladder

1. Pure arithmetic, parsers, schema/topology, reservations and decision tests.
2. Real filesystem/Git tests in disposable material directories.
3. Full application with deterministic executors and graders, not a replacement fixture engine.
4. Actual Fabric component/actor/child process boundary against a local fake model/provider.
5. Pi/attached-CLI control journeys plus strictly read-only browser/replay/artifact journeys against the same store/projection; assert browser reads cause no research mutations.
6. Only then a separately budgeted real-model pilot for code and agent improvement.

No paid optimization campaign is authorized by writing this plan. Comparative quality claims require a separate controlled benchmark, not passing structural tests or agreement among reviewers.

### 12.2 Usability targets

- At most install, setup/reload, start after dependencies are present; no normal manual config-file editing.
- One start operation runs baseline and requested candidates in a configured project.
- No build/certification command on normal use or update.
- No copying internal IDs/fences between tools.
- One command plus one selection reaches candidate diff/logs.
- Resume uses one command; actor re-observation is automatic.
- Acknowledgment is prompt and distinct from completed controls.
- Routine owned test workloads stop promptly; unsupported cleanup is labeled, not concealed by a generic cancelled status.
- No model-authored status polling while idle; no duplicate coordinator/worker transcript storage.
- Report generation failure does not erase or reopen an otherwise completed experiment.

## 13. Cut-over and deletion policy

This is a **hard cut-over**, not a migration project.

1. Land fresh source entrypoints and the new application path with its tests.
2. Use a fresh state namespace/schema for new runs. Do not interpret v1 rows, certificates, or effect journals as current facts.
3. Remove old public mutations, CLI commands, exports, admission code, readers and bridges. No v1 compatibility error protocol is required beyond ordinary unknown-command/action diagnostics.
4. Delete obsolete shipped code/assets and test-only certification payloads once their replacements pass.
5. Leave existing user runtime data, keys, artifacts and unrelated uncommitted changes untouched. Their preservation on disk is not a promise of v2 inspectability. Delete actual user data only under explicit separate cleanup authorization.
6. Do not scan/import all historic runs, build a legacy archive/export tool, or retain private repositories merely to satisfy a nonexistent migration acceptance check.
7. Keep tests that characterize useful arithmetic, source noninterference and recovery behavior, rewriting them against the new interfaces.
8. Roll back source with version control if needed; do not ship both architectures indefinitely.

The existing deleted `docs/Arbor/authoritative-native-pi-fabric-arbor-plan.md` is not restored by this task. This plan is a new document at `docs/Arbor/deep-refactoring-plan.md`.

## 14. Risks, unresolved proofs, and completion

### 14.1 Important uncertainties

| Risk | Evidence boundary and response |
|---|---|
| Child provider availability is mistaken for owner invocation | PR0 must prove the public forwarding seam, native owner identity and worker survival beyond the coordinator activation; matching descriptors alone are insufficient |
| Role discovery/loading differs in a child or after reload | Explicit packaged bootstrap and preserved run bundles; prove reference resolution, effective capabilities, resume behavior and operational/subject collisions in PR0/PR6 |
| Lifecycle deadlock/stale generation | Name and prove the public deterministic cleanup seam separately from participant subscriptions; keep retained-call resources valid until provider close and test owner/passive disposal |
| Independent agent-suite evaluation expands into a second runtime/statistics platform | Package a small adapter over public Fabric execution, fixed task/grade policy and tested analysis; no profile-local skill dependency, private lifecycle import or generic benchmark framework |
| Optional evaluator changes retire shared Arbor dependencies | Bind finite optional refs in definition metadata, require explicit catalog maintenance/rebinding and test the two-run blast radius |
| Human review is confused with effect permission | Separate user receipts and actor capabilities from Fabric approvals; test both gates and stale/forged decisions |
| Browser or CLI accidentally creates another owner | Browser is read-only; CLI mutations require live-owner acknowledgement. Prove routes and reject missing-owner mutation attempts |
| Cost and shorter timeouts | Native telemetry and timeout semantics do not imply hard Arbor budgets; use deadlines/stop and honest accounting |
| Parallel evaluation interference | Separate implementation concurrency from measurement concurrency and compare overhead |
| Agent-score noise and repeated held-out use | Prespecified task pairing/analysis, explicit inconclusive state and test-use reporting |
| Trusted worktree writes escape scope | Scope checks are practical consistency checks, not containment; do not claim hardened isolation |
| Host-surviving execution | Default is session residency with resume. Durable mode requires proof of the whole provider/evaluator path |
| Expanded feature scope becomes another platform | Keep one actor and small domain operations; presets are data; no generic plugin/scheduler/auth runtime |

### 14.2 First five implementation tasks

1. Prove owner-host forwarding, worker survival across actor activations, distinct mailbox/cleanup routes and the independent native agent-suite fixture.
2. Convert package, tests, launcher and assets to source-only execution.
3. Remove admission and establish the managed owner/forwarding component, definition-time exact dependencies and retained-resource cleanup.
4. Implement the fresh domain-neutral spec/store and small action surface.
5. Implement material/evaluator paths, including prompt-only agent improvement, before building a code-only vertical slice.

### 14.3 Definition of complete

The refactor is complete only when the acceptance ledger passes, both code and independently graded agent-improvement journeys work through actual actor/component execution without a profile-local benchmarking dependency, and owner continuity/cleanup are proven. Every non-deferred research feature and O1-O3 is integrated; one public skill and the consolidated role assets ship; source work is preserved; Pi/attached-CLI controls and recovery are truthful; the browser is strictly read-only; and the old architecture is absent from runtime/package/docs.

Optional per-run features remain optional to use, not optional to deliver. The finish line is a usable actor-led research system with measured evidence, not another certification milestone, a paper-score reproduction, or a legacy migration.

## 15. Evidence references

### Primary research and UX

- [Arbor paper, arXiv:2606.11926](https://arxiv.org/pdf/2606.11926), especially sections 3, 4.2 and 4.3: material/objective/evaluators, hypothesis tree, coordinator/executor loop.
- [Arbor showcase](https://ruc-nlpir.github.io/Arbor/).
- [Inspected BrowseComp showcase tree](https://github.com/RUC-NLPIR/Arbor/blob/2f4e65410a5c21c9e55835a9a0d77ead21a64ffa/project_page/public/assets/demo/browsecomp/idea_tree.html): agent changes, semantic lessons, noise and held-out-timeout limitations.
- [Upstream source snapshot](https://github.com/RUC-NLPIR/Arbor/tree/2f4e65410a5c21c9e55835a9a0d77ead21a64ffa): `src/coordinator/idea_tree.py`, `prompts.py`, `tools/executor_run.py`, `tools/tree_ops.py`, `tools/git_ops.py`, `convergence.py`; `src/mcp/session_ops.py`; `src/experience.py`, `recall.py`, `trajectory.py`, `plugins/`, `zoo/`, `webui/`, `report/`.
- [Inspected upstream role-skill suite](https://github.com/RUC-NLPIR/Arbor/tree/2f4e65410a5c21c9e55835a9a0d77ead21a64ffa/skills): `README.md` lists the eleven phase/role skills and distinguishes `agents/openai.yaml` UI metadata from execution logic; coordinator, executor, ideate, search, merge-eval and orchestrator `SKILL.md` files establish the adaptation boundaries in section 4.7.
- [Source-loading UX reference](https://github.com/monotykamary/pi-autoresearch-harness/tree/44c442ed424394f684bf0c3d30dc932b7b104b25), particularly package entrypoints and source launcher. Its log/Git sequence is not adopted as a correctness authority.

### Local application evidence

Paths relative to `pi-fabric-arbor/`, at the inspected pre-refactor source:

- `src/application/ProductionComposition.ts:25-73`: prepared-provider startup gap.
- `src/component/definitions.ts:26-91`: component/web composition and explicit non-dispatch.
- `src/application/ArborApplication.ts:443-487,817-848,968-982`: limits, candidate evaluation and finalization.
- `src/public/descriptors.ts:10-40`: low-level action surface.
- `src/certification/pi-fabric-support.ts:6-23`: exact-release admission.
- `src/domain/decimal.ts:128-174`, `tests/model/decimal.test.ts:41-55`: arithmetic and tie behavior.
- `src/evaluation/ConfinedProcessEvaluator.ts:120-256`: evaluator validity worth extracting.
- `src/persistence/SqliteRunStore.ts:40-250`: transactional storage primitives.
- `src/git/PackageWorkspaceManager.ts`, `PromotionGitIntegrator.ts`, `tests/git/`: source/workspace/integration characterization.
- `src/web/DetachedMonitorAuthority.ts`, `src/web/ReleaseWebAssets.ts`, `scripts/build-web.mjs`: projections, control intentions and asset build coupling.

These are navigation/evidence references, not instructions to retain the old module boundaries.

### Fabric/Pi contracts consulted

Within this profile's installed `npm/node_modules/pi-fabric/`:

- `docs/components.md`, component calculus and provider lifecycle references: managed effects, exact dependencies, staged provider publication, lifecycle restrictions and actor commitments.
- `docs/agents.md`, `skills/fabric-exec/references/agents.md`: actor/worker APIs, runner and timeout distinctions, source-qualified subscriptions, stop/routing semantics.
- `docs/providers.md`, `docs/configuration.md`: public registration and configuration.
- `docs/residency-runtime.md`: scope versus residency and hidden resident-host prerequisites.
- `skills/fabric-exec/references/mesh.md`: participant routing, shared state and CAS boundaries.
- `docs/memory-recall.md`, `docs/programmatic-compaction.md`, `docs/state-layer.md`, `docs/schema-enforcement.md`: recall versus authority, compaction, and enforcement compatibility limits.
- `docs/skills.md`: public versus internal invocation boundaries and explicit packaged reference-path handling.
- Effective discovered schemas for `agents.create`, `spawn`, `tell`, `stop`, `remove`, `subscribe`, and `mesh.put`; discovery establishes availability, not full end-to-end behavior. The inspected spawn schema has no Pi `role`/`skills` field; `name` is a label and `persona` is Veda-specific.

Authoring guidance consulted: `skills/create-fabric-skill/SKILL.md` and `references/mechanism-selection.md`, plus Fabric execution/workflow guidance. They support selecting native mechanisms for actual lifecycle needs, not layering user-only skills as runtime routers.

Pi source extension/package loading is documented in the installed Pi `docs/extensions.md` and `docs/packages.md`; `docs/skills.md` documents discovery versus explicit loading, reference paths and skill-name collisions. The profile-local benchmarking-skill integration from the earlier plan is superseded, not a product dependency or acceptance authority. Arbor's packaged agent-suite contract in section 6.2, public Fabric execution interfaces and its own declared grading/analysis tests govern evaluation implementation. Section 4.2/PR0 must identify and prove any additional public owner-forwarding and deterministic lifecycle seam before implementation proceeds.
