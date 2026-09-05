# Deep-refactoring plan for pi-fabric-arbor

Status: implementation plan, not an implemented or validated refactor.

This document supersedes the previous proposal. It incorporates the nine requested revisions and retains the agreed usability, measurement, source-loading, and simplification goals. The scope of this task is writing this plan only.

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

### 1.2 Non-goals

- Reproduce upstream's provider/authentication runtime or adopt its complete Python coordinator.
- Carry v1 certificates, authorization keys, compatibility actions, or effect protocols into v2.
- Preserve access to old run history as a release obligation. Existing user data must still not be silently deleted.
- Build a standalone daemon, generic task scheduler, distributed queue, or arbitrary multi-host execution platform.
- Implement novelty assessment, automated benchmark acquisition campaigns, training pipelines, a separate critic architecture, composite-objective optimization, or general stateful-task machinery in this refactor. These were deferred or omitted previously.
- Reproduce paper benchmark scores or claim research quality from architecture tests.

### 1.3 What remains deliberately small

One component, one research coordinator actor per run, one experiment store, two initial evaluator adapters, one workspace abstraction, one shared presentation model. A preset is data plus instructions, not another orchestrator. Research features can be disabled in a run without removing them from the delivery scope.

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
| Selective reuse | Tree semantics, prompts, report ideas, optional benchmark preparation | Chosen, without maintaining a second research-state owner |

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

`/arbor` opens the current dashboard or a launch card. Four product-facing operations support commands, tools, and browser controls:

```text
arbor.start(spec)
arbor.inspect(query)
arbor.control(command)
arbor.export(request)
```

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
Pi commands/tools          CLI/browser presentation
        |                            |
        +------ four product operations ------+
                                              |
                           managed component: arbor
                           provides namespace: arbor
                           lifecycle + deterministic domain operations
                                              |
          +-------------------+---------------+----------------+
          |                   |                                |
     ResearchStore        Workspace                      Evaluators
     SQLite + files       Git/artifacts                  command / agent suite
          ^                   ^                                ^
          |                   |                                |
          +----------- actor-facing operations ----------------+
                                      ^
                                      |
                       Fabric coordinator actor
                       observe / ideate / select /
                       dispatch / abstract / decide
                                      |
                         Fabric short-lived executors
                         one hypothesis per workspace
```

**The actor is the sole research-policy coordinator.** Deterministic operations validate and record facts, reserve capacity, run bounded domain work, and perform integration. They do not decide the next hypothesis or run an independent autonomous search loop.

### 4.2 Why component plus actor

A component manages capability publication, dependencies, reload, and awaited cleanup. An actor retains a reasoning context and responds to messages across activations. Neither replaces the other.

Choose `guarantee: "managed"`. Git changes, external evaluation, and spawned work are not globally reversible merely because a component has a disposer. Do not claim `revertible` independence for them.

Register the definition using public `pi-fabric/protocol` component registration/discovery events. Provide `arbor` through `context.provide`. Add one declarative enabled component entry using the documented configuration shape, preserving unrelated configuration. Definition name, configured instance ID, provider namespace, and run actor ID are separate identities even if the first three use the label `arbor`.

Activation opens deterministic services and registers their disposer. It does not run experiments, create a coordinator that needs its own unpublished provider, wait for child readiness, or call supervisor lifecycle operations from inside activation/teardown. Start the actor through `arbor.start` after the component is active.

### 4.3 Native responsibilities, not replacements

| Need | Use | Do not build |
|---|---|---|
| Persistent reasoning | `agents.create`, `agents.tell`, Fabric actor history | Custom conversation persistence or coordinator daemon |
| Individual executions | Public `agents.spawn`, `status`, `wait`, `stop`, `list` | Pi SDK worker runtime in parallel with Fabric |
| Completion routing | `agents.subscribe` and native lifecycle delivery | Model-authored polling loop or bespoke message broker |
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
- Explicit follow-up delivery with `triggerTurn: true`; avoid subscriptions to every host turn.
- Exact `requires` for the actor's Arbor operations and optional source tools only when enabled. Tool availability and dependency commitments must both be tested in the actual child.
- Initial message contains the run ID and instruction to observe the store, not an entire copied history.
- Trigger turns for start/resume, relevant completed work, and steering/review decisions. Coalesce notifications where supported; event duplication must not duplicate domain transitions.
- End an activation after a bounded wave or pending external work. Do not continuously reason while nothing changed.

Fabric `agents.stop` stops an actor; it is not merely a pause command. Ordinary Arbor pause records a dispatch boundary and lets the current actor activation settle. If cancellation/reload stopped the actor, resume can create a replacement and re-ground it from the tree. Do not promise that telling a stopped actor restarts it or that the private transcript is required for recovery.

Successful completion also has an explicit lifecycle boundary: commit the terminal research state and summary references, let the current actor activation return, then finalize owned runtime resources from the native completion handler outside that activation. Retire per-worker subscriptions when their terminal evidence is ingested; stop/remove the run's idle coordinator when terminal, using only supported public APIs. Do not stop an actor synchronously from the provider call that actor is awaiting. Late notifications read terminal state and become no-ops. Cleanup failure is recorded separately and does not reopen research or erase results. Component teardown retries unfinished owned cleanup; native historical worker records need not be purged or duplicated. Test successful, failed, cancelled, and duplicate-terminal delivery paths, including zero live run-owned actors/subscriptions after successful cleanup.

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

The actor also reads `arbor.inspect`. User-facing keep/discard routes through the same decision rules; it does not bypass failed evaluation. A manual unverified selection, if supported, is explicitly labeled and never becomes a measured win.

These names are proposed application APIs, not existing Fabric built-ins. Mechanically test registration, schemas, descriptor effects, and actor dependencies. Keep lease IDs, internal operation journals, and worker ownership reconciliation behind these interfaces.

### 4.6 Deep modules

| Module | Small interface | Hidden responsibility |
|---|---|---|
| Experiment service | start/inspect/control/export | User-oriented contract, lookup, validation and presentation |
| Research operations | Six actions above | Domain transactions, admissible research changes, finite effects |
| ResearchStore | load/commit/control/events | Revision checks, atomic reservations, compact events and evidence references |
| Workspace | capture/materialize/freeze/restore/export/apply | Dirty snapshots, immutable identities, per-candidate isolation and integration |
| Evaluator | evaluate(snapshot, spec, signal) | Execution, parsing/grading, repetitions, native evidence and validity |
| Fabric execution adapter | launch/observe/stop | Native request/handle adaptation, subscriptions and deadlines |
| Lessons | retrieve/distill/export | Applicability, provenance, deduplication and bounded context selection |
| Presentation | projection/control receipt | Pi/CLI/web consistency; no experiment authority |

Do not create a port for every function. Do not retain `RunEngine.run()` as another owner of the research loop.

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

Executors may edit/debug/rerun development feedback within their attempt allowance. They may not silently change the assigned hypothesis when it fails. A changed hypothesis creates a new node/attempt. Worker reports contain material references, factual observations, suggested insights, and relevant execution paths; their score claims are not authoritative.

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

Approval timeout does not silently approve. Show `awaiting_review` and the pending decision. These modes share the same facts and controls; they are not separate engines.

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

For controlled agent comparisons, leverage the existing profile `skills/agent-benchmarking` workflow rather than duplicate its statistical and grading machinery. Its current public contract is the exact `workflows/benchmark.ts` guest with `{specPath, outputDirectory}`, repeated in a fresh dedicated invocation on `checkpoint`. `scripts/run.py report` is reporting, not an execution command. Do not call private `internal-*` operations directly or copy the guest's lifecycle into Arbor.

Integration is an explicit PR0/PR4 proof obligation: a bounded evaluation worker invokes that supported workflow, persists the experiment directory, and returns its native result. If unattended use cannot meet the fixed-guest/fresh-invocation contract, report the integration blocker; do not pretend a source import is a public `evaluate()` API. A separately configured external task-suite command is supported by the command adapter, but does not silently fulfill the native benchmark integration proof.

Respect the benchmark runner's supported-method and runtime limitations. `complete`, `checkpoint`, `blocked`, `unsupported`, and `failed` are execution states, distinct from `adopt`, `retain-control`, `inconclusive`, and `descriptive-only`. Changed experiment specs get new output directories. Use its declared local environment, never system `pip` installation.

### 6.2.1 Preset and plugin extension contract

A preset is a validated JSON document with `id`, `materialKind`, `objectiveDefaults`, `evaluator`, `searchDefaults`, and optional `instructions`/`sourceRefs`. Merge its defaults before profile/project/explicit overrides and record their origins. It cannot start a coordinator or create another research store.

Support a small evaluator-plugin seam through an exact configured Fabric provider action, not an arbitrary package scanner. `evaluator.providerAction` names a discovered action whose input contract accepts a snapshot reference, resolved evaluation spec, output directory, and evaluation ID, and whose output identifies execution status, measurements, checks, artifacts, and native provenance. Validate the effective descriptor and result contract before using it. The component binds the selected dependency through the documented configuration/reload path; it does not widen a committed capability view mid-call. A plugin supplies execution evidence, never the incumbent decision. Ship a tiny external fake provider fixture and verify registration/discovery, missing/mismatched schema errors, preset precedence, evaluation, and result rejection through the actual Arbor path. Trusted custom command evaluators remain the simpler extension option. No general plugin framework or copied upstream coordinator is needed.

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

For noisy command measurements, use a bounded incumbent/candidate recheck when spread is comparable to gain; otherwise report inconclusive. Product defaults are not significance tests. For agent tasks, preserve pairing and task-level uncertainty; do not count repeated trajectories or grader labels as independent tasks. Let the selected benchmark analysis own statistical claims.

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
    attempts/<attempt-id>/
      worker-summary.json
      candidate.patch
      evaluation.json
      logs/
    sources/
    exports/
```

State lives outside candidate material. Backups, corruption errors, and current-format resume remain useful. They do not imply a legacy migration obligation.

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

Component teardown prevents launches, settles in-flight launch results, stops tracked work through public APIs, records interruption/cleanup status, releases subscriptions/resources, closes storage, and retires the published generation. Register cleanup during activation; do not depend on adding lifecycle registrations afterward.

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

### 8.2 Compatibility without admission

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
| Interaction modes | Required auto/direction/review/collaborative boundaries | PR8, PR12 |
| Literature search | Required integration, optional activation | PR10 |
| Grounded ideation | Required visited-source evidence and hypothesis links | PR10 |
| Novelty assessment | Remains deferred | No new novelty subsystem |
| Experience distillation | Required leaf/direction/project lessons | PR6, PR10 |
| Trajectory export | Required structured proposal/action/outcome records | PR10, PR12 |
| Domain presets/plugins | Required lightweight preset/adapter contracts | PR4, PR11 |
| Configuration precedence | Required frozen resolved spec and provenance | PR3 |
| Benchmark scaffolding | Required optional preparation workflow; scaffold is unvalidated until run | PR11 |
| Benchmark zoo/example packs | Required packaged/documented integration examples | PR11 |
| Rich web/replay/export | Required supported UI, replay and export; optional to open | PR12 |

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

Retain ordinary schemas, command exit validation, exact material/evidence identity, transactions, source-work preservation, and explicit apply. Those prevent incorrect results and lost work; they are not a revived certification mode. Do not strip unrelated dependency security defaults as part of simplification. The web interface is for this trusted personal-use environment, not a newly supported public service.

## 10. Module-by-module change map

| Existing area | Action and target |
|---|---|
| `package.json`, lockfile, TS configs, `bin/` | Source exports/runtime/tests; one thin launcher; remove certificate binaries and prepack build |
| `src/extension.ts` | Pi commands/tools, component registration/discovery, setup/doctor; no hidden readiness pointer |
| `src/component/definitions.ts` | Managed Arbor provider lifetime and cleanup; no research loop in activation |
| `src/application/ProductionAdmission.ts` | Delete |
| `src/application/ProductionComposition.ts` | Replace with explicit small service composition |
| `src/application/ArborApplication.ts` | Replace with experiment service and finite research operations; no v1 reducer translation |
| `src/public/`, `src/schemas/` | Four product and six actor operations with one shared schema source |
| `src/driver/` | Replace admitted driver with native Fabric execution adapter and actor definition/instructions |
| `src/adapters/interfaces.ts` | Reduce to actual workspace/evaluator/execution seams |
| `src/domain/decimal.ts` | Retain arithmetic; fix tie/current-incumbent decision behavior |
| `src/domain/types.ts`, state machines | Fresh run/node/attempt/evaluation domain; remove legacy protocol types |
| `src/evaluation/` | Command and agent-suite evaluators; development/held-out separation without sealed admission |
| `src/system/process.ts` | Ordinary owned command execution, output/deadline handling; remove process-group/containment dependencies |
| `src/git/` | Retain useful safe Git helpers; replace private certified workspace/promotion framework with snapshots/worktrees/apply |
| `src/persistence/` | Fresh smaller SQLite schema and artifact store; no legacy reader/importer |
| `src/recovery/` | Consequential operation/handle reconciliation, not universal effect certification |
| New `src/research/` | Actor context/proposals/tree policies and deterministic domain operations |
| New `src/presets/`, `examples/` | Code, agent-improvement and research configurations; no second plugin runtime |
| `src/reports/` | Direction-aware summary, failures, uncertainty, trajectory/report exports |
| `src/web/`, `web/` | Shared projections/controls, tree/evidence/replay UI, static source assets |
| `ReleaseWebAssets.ts`, `scripts/build-web.mjs` | Replace emitted manifest/hash-copy coupling with source assets |
| `src/authorization/`, `src/certification/`, certification compatibility modules | Delete active runtime and scripts |
| `src/phase7/` | Delete signed machinery; move useful limits/test cases to their domain owners |
| `src/retention/`, `src/cleanup/` | Explicit owned-artifact cleanup; no legal-hold framework |
| `src/fixtures/` | Move useful deterministic fixtures under tests; forbid production imports |
| `skills/fabric-arbor/SKILL.md` | Rewrite for setup, research use, interpretation and control; no manual driver choreography |
| README, scoped `AGENTS.md`, docs, acceptance ledger | Authoritative v2 commands/architecture and observed-vs-planned evidence |
| `dist/`, `.test-dist/`, certification payload packaging | Remove from active product and shipped contents |

New actor/research code must not import Fabric `dist` chunks, reconstruct internal execution contexts, launch its own Pi SDK sessions, or invent unsupported provider methods. The component uses the supported host API; actor guests use native Fabric proxies.

## 11. Implementation backlog and dependency order

All PRs below are required for the agreed scope. Intermediate milestones are useful development checkpoints, not permission to declare completion before research/UI integration ships. Effort ranges are rough focused maintainer-days, not commitments.

### PR0. Falsify actor/component and evaluator integration first

**Dependencies:** none. **Effort:** 2-3 days.

Create a source-loaded test component, local fake model/provider, disposable material, one persistent coordinator, and two bounded executor activations. Exercise idle-host continuation, dependency commitment in the child, terminal subscriptions, pause, stop, reload, and re-grounded resume. Separately prove the supported agent-benchmark fixed-guest integration, including one checkpoint continuation.

**Acceptance:** only public APIs; no internal imports, certificates, emitted output, custom coordinator loop, or real paid model required. A stopped actor is replaced correctly when needed. Provider generation replacement cannot admit stale writes. Evaluation completion cannot be confused with adoption.

**Risk/response:** if the actor's committed Arbor namespace is unavailable in child execution, or component/actor teardown deadlocks, report the exact blocker and revise that integration before production implementation. Do not silently substitute a custom engine or SDK runtime. Host-surviving residency is optional and requires a separate successful probe before advertised support.

### PR1. Source-only package and test path

**Dependencies:** PR0. **Effort:** 1-2 days.

Change exports, imports, launcher, TS checking, tests, web asset loading, package contents and scripts. Delete mandatory build/prepack paths.

**Acceptance:** clean temporary install loads source extension, CLI and browser assets with `dist`/`.test-dist` absent; a source sentinel edit appears after reload. No generated runtime is needed.

**Risk/response:** path/loader assumptions. Fix the source path, not a parallel permanent build fallback.

### PR2. Real managed component and actor binding

**Dependencies:** PR1. **Effort:** 2-3 days.

Replace admission/composition; register the managed `arbor` component/provider; implement setup/doctor and exact dependencies. Add actor creation/reuse linkage after provider activation, disposer and subscriptions.

**Acceptance:** available capabilities activate without certificates; missing required refs give actionable diagnostics; no duplicate coordinator from reload/discovery; normal registration does not start research.

**Risk/response:** stale generation or lifecycle races. Keep doctor/inspection available and launch no work when binding is unresolved.

### PR3. Fresh run specification, store, and public interface

**Dependencies:** PR2. **Effort:** 2-4 days.

Implement the fresh schema, domain-neutral spec, configuration precedence, four product actions, six research actions, transactions, control receipts and compact events. No legacy schema support.

**Acceptance:** duplicate controls/results do not duplicate effects; stale revisions cannot overwrite; budgets reserve atomically; source and model identities/origins are recorded.

**Risk/response:** state ambiguity. Add crash/reopen and transaction tests now; no second mesh authority.

### PR4. Material and evaluator adapters, including agents

**Dependencies:** PR3. **Effort:** 3-5 days.

Implement command and agent-suite adapters, immutable evaluation definitions, metric parsing, quality vetoes and native benchmark integration. Distinguish coordinator/executor/subject roles. Define lightweight preset contracts.

**Acceptance:** a prompt-only candidate is evaluated on fixed tasks with deterministic grading; failed native execution never becomes a score; benchmark checkpoint/unsupported states remain truthful. Command parsing covers direction/units/failures.

**Risk/response:** unsupported suite methods/runtime. Preserve concrete limitations and evidence; no fabricated wrapper API or replacement statistics engine.

### PR5. Dirty snapshots, owned workspaces, and acceptance

**Dependencies:** PR3-PR4. **Effort:** 3-5 days.

Implement source-preserving capture, per-candidate workspaces, freeze/restore, exact evaluation identity, current-incumbent comparison and noise policy.

**Acceptance:** staged/unstaged/untracked material, modes, symlinks and worker commits behave correctly; ties/check failures cannot win; deltas exclude pre-existing user work.

**Risk/response:** Git edge cases. Retain characterization tests and refuse unsupported states rather than guessing.

### PR6. Complete actor-led research, two vertical slices

**Dependencies:** PR2-PR5. **Effort:** 3-5 days.

Implement actor instructions/context and observe/ideate/select/dispatch/collect/evaluate/distill/decide behavior. Add within-run lessons and stop rules.

**Acceptance:** two actual end-to-end fixtures: code optimization and agent-instruction improvement. Each performs baseline, improvement, valid non-improvement, failed check, and further improvement with the correct incumbent. No fixture driver shortcut or user-sequenced loop.

**Risk/response:** reasoning/continuation stalls. Surface waiting/failed state; fix native routing and explicit operation contracts, not a hidden autonomous fallback controller.

### PR7. Branching, parallel candidates, pruning, and convergence (O1)

**Dependencies:** PR6. **Effort:** 3-5 days.

Implement typed tree/refinement, exploration/exploitation policy, two-candidate waves, capacity reservations, serial measurement option, stale-incumbent revalidation, and ancestor revision updates.

**Acceptance:** no duplicate dispatch or lost sibling insight; minimization rankings correct; combined material re-evaluated; pause/convergence stops new waves; concurrency one remains simple.

**Risk/response:** overhead/interference. Measure it and choose concurrency one for affected workloads, without a new scheduler service.

### PR8. Controls, partial resume, recovery, and apply

**Dependencies:** PR5-PR7. **Effort:** 3-6 days.

Connect pause/steer/cancel/review, native stop/subscriptions, partial material continuation, consequential operation journal, keep/export/apply/undo, and component reload recovery.

**Acceptance:** crash-point suite; one-command current-format resume; original source preserved; control receipt differs from completion; no worker relaunch across ambiguous attachment; interrupted cleanup visible.

**Risk/response:** ownership and partial source writes. Preserve artifacts and block ambiguous operations; never guess PIDs or undo later user edits.

### PR9. Held-out research validation (O2, part one)

**Dependencies:** PR4-PR8. **Effort:** 2-3 days.

Implement selected test/final validation policies, baseline/candidate comparison, configured long evaluation deadlines, and clear dev-only/held-out labels.

**Acceptance:** dev winner/test loser is not validated; absent held-out evidence never shown as transfer; repeated test use counted; changed integrated material remeasured.

**Risk/response:** overfitting/noise. Preserve uncertainty and limit adaptive test use; no sealed-data machinery.

### PR10. Grounding, experience, recall, and trajectories (O3, part one)

**Dependencies:** PR6-PR9. **Effort:** 2-4 days.

Integrate existing search/fetch capabilities, inspected-source references, grounded hypotheses, project lesson retrieval/distillation, negative findings, and trajectory export.

**Acceptance:** unvisited sources not marked inspected; minimization unaffected by maximization-only gates; lessons retain source/run/evidence links; duplicate or contradictory findings remain explainable.

**Risk/response:** unavailable tools or excessive context/cost. Bound selected evidence and expose optional-feature unavailability; no duplicate search runtime.

### PR11. Presets, scaffold, and example packs (O2/O3 remainder)

**Dependencies:** PR4, PR9-PR10. **Effort:** 2-4 days.

Ship code and agent-improvement examples, a data/recipe-oriented example, research presets, and optional upstream benchmark scaffold/pack integration through its public preparation interface in a declared environment. Do not adopt the upstream coordinator/tree as a side effect.

**Acceptance:** deterministic examples run through the real application; generated scaffolds explicitly unvalidated until baseline execution; optional heavyweight datasets/services are documented, not downloaded automatically. Separate runnable packs from illustrative configurations.

**Risk/response:** upstream internal API drift. Use documented package/CLI boundaries or a small maintained template adapter; pin preparation inputs where needed, not host runtime admission.

### PR12. Pi dashboard, web/replay, reports, and skill

**Dependencies:** PR6-PR11. **Effort:** 3-5 days.

Implement launch card, compact widget, tree/table/diff/log drilldown, controls and review, browser projections/SSE replay, reports/exports, CLI inspection, and rewritten source skill.

**Acceptance:** Pi/CLI/web agree on authoritative revision; controls show queued/applied/blocked; replay preserves failures and direction-aware rankings; no-driver state is honest. All nine journeys are exercised.

**Risk/response:** second-state creep. UI only reads projections/submits commands. No browser security-hardening workstream is added.

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
| A09 | Pause, steer, cancel and partial resume match persisted semantics/budgets. Exercise Auto continuous progress, Direction approval before expansion, Review approval before promotion, and Collaborative pause/resume on a supplied decision; timeout in every approval mode never auto-approves. |
| A10 | Spawn/attachment, evaluation/decision, ref/commit and partial-apply crash gaps reconcile or block without duplicate effects |
| A11 | Component reload/dependency replacement settles tracked work and prevents stale writes; stopped actor is replaced correctly. Successful/failed/cancelled terminal cleanup leaves no live run-owned coordinator/subscriptions; duplicate/late notifications cannot restart work. |
| A12 | Two parallel candidates have isolated material, atomic reservations, no insight overwrite, and serialized measurement where configured. In a controlled fixture with two independent one-second executor workloads, three warmed waves demonstrate actual overlap and median parallel wave time at most 80% of serial time; record setup/dispatch/collection overhead and environment. A failure triggers investigation, not an unsubstantiated practical-speedup claim. This fixture requires no paid model. |
| A13 | Tree direction/leaf/depth rules, exploration, pruning and convergence work without treating prose quality as proven |
| A14 | Held-out loss blocks validated promotion; dev-only labels and adaptive test-use counts are accurate |
| A15 | Literature grounding, negative lesson reuse, experience distillation and trajectory export retain factual provenance |
| A16 | Presets, benchmark scaffolding and runnable example packs are integrated; the external evaluator-provider fixture passes discovery/schema/precedence/execution/result-validation tests. Illustrative assets are not reported as executed. |
| A17 | Pi, CLI and web/replay agree on state, evidence, failure, uncertainty, pending controls and stop reason |
| A18 | Fresh install/cut-over needs no legacy history, certificates, compatibility bridge or migration |
| A19 | Mechanical source/import/schema/UI scans confirm removed package-owned sandbox/process-group/web-safeguard and certification implementations are not retained in v2. No corresponding setup, tests, licensing workstreams or release gates are reintroduced. Unrelated dependency defaults are not stripped. |
| A20 | Fixed benchmark guest integration handles checkpoint/unsupported states and preserves execution-versus-adoption distinction |
| A21 | Attempt/evaluation limits include retries; delayed/unknown usage is not presented as a hard enforced cost bound |
| A22 | All four product and six research actions, command mappings, source skill and component configuration are mechanically registered |

### 12.1 Validation ladder

1. Pure arithmetic, parsers, schema/topology, reservations and decision tests.
2. Real filesystem/Git tests in disposable material directories.
3. Full application with deterministic executors and graders, not a replacement fixture engine.
4. Actual Fabric component/actor/child process boundary against a local fake model/provider.
5. Pi/CLI/browser user journeys against the same store/projection.
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
| Actor cannot call the component from its child context | Public contracts support commitments; the complete custom-provider path still requires PR0 execution |
| Lifecycle deadlock/stale generation | Avoid orchestration in activation; test reload/disposal and terminal callbacks across generations |
| Benchmark skill is not a callable library | Prove exact fixed-guest invocation/continuation; never guess a direct API or invoke private lifecycle operations |
| Cost and shorter timeouts | Native telemetry and timeout semantics do not imply hard Arbor budgets; use deadlines/stop and honest accounting |
| Parallel evaluation interference | Separate implementation concurrency from measurement concurrency and compare overhead |
| Agent-score noise and repeated held-out use | Prespecified task pairing/analysis, explicit inconclusive state and test-use reporting |
| Trusted worktree writes escape scope | Scope checks are practical consistency checks, not containment; do not claim hardened isolation |
| Host-surviving execution | Default is session residency with resume. Durable mode requires proof of the whole provider/evaluator path |
| Expanded feature scope becomes another platform | Keep one actor and small domain operations; presets are data; no generic plugin/scheduler/auth runtime |

### 14.2 First five implementation tasks

1. Run the actor/component and fixed-benchmark integration PoCs.
2. Convert package, tests, launcher and assets to source-only execution.
3. Remove admission and establish the managed component with exact dependencies.
4. Implement the fresh domain-neutral spec/store and small action surface.
5. Implement material/evaluator paths, including prompt-only agent improvement, before building a code-only vertical slice.

### 14.3 Definition of complete

The refactor is complete only when the acceptance ledger passes, both code and agent-improvement journeys work through actual actor/component execution, every non-deferred research feature and O1-O3 is integrated, source work is preserved, controls/recovery are truthful, and the old architecture is absent from runtime/package/docs.

Optional per-run features remain optional to use, not optional to deliver. The finish line is a usable actor-led research system with measured evidence, not another certification milestone, a paper-score reproduction, or a legacy migration.

## 15. Evidence references

### Primary research and UX

- [Arbor paper, arXiv:2606.11926](https://arxiv.org/pdf/2606.11926), especially sections 3, 4.2 and 4.3: material/objective/evaluators, hypothesis tree, coordinator/executor loop.
- [Arbor showcase](https://ruc-nlpir.github.io/Arbor/).
- [Inspected BrowseComp showcase tree](https://github.com/RUC-NLPIR/Arbor/blob/2f4e65410a5c21c9e55835a9a0d77ead21a64ffa/project_page/public/assets/demo/browsecomp/idea_tree.html): agent changes, semantic lessons, noise and held-out-timeout limitations.
- [Upstream source snapshot](https://github.com/RUC-NLPIR/Arbor/tree/2f4e65410a5c21c9e55835a9a0d77ead21a64ffa): `src/coordinator/idea_tree.py`, `prompts.py`, `tools/executor_run.py`, `tools/tree_ops.py`, `tools/git_ops.py`, `convergence.py`; `src/mcp/session_ops.py`; `src/experience.py`, `recall.py`, `trajectory.py`, `plugins/`, `zoo/`, `webui/`, `report/`.
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
- Effective discovered schemas for `agents.create`, `tell`, `stop`, `remove`, `subscribe`, and `mesh.put`; discovery establishes availability, not full end-to-end behavior.

Authoring guidance consulted: `skills/create-fabric-skill/SKILL.md` and `references/mechanism-selection.md`, plus Fabric execution/workflow guidance. They support selecting native mechanisms for actual lifecycle needs, not layering user-only skills as runtime routers.

Pi source extension/package loading is documented in the installed Pi `docs/extensions.md` and `docs/packages.md`. Agent evaluation reuse is governed by this profile's `skills/agent-benchmarking/SKILL.md`, README, schemas, and exact `workflows/benchmark.ts` guest. Those contracts, not imagined wrapper APIs or transient version assertions, govern implementation.
