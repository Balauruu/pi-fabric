# Conditions and Mechanisms

Use this reference to make the assigned intervention identifiable and prove what each attempt actually ran. The decision and estimand are frozen in [protocol design](protocol-design.md); runtime orchestration is owned by [execution lifecycle](execution-lifecycle.md); runtime field accounting is owned by [telemetry](telemetry.md).

## Declare one intervention

Name the control as the actual current or no-intervention configuration. For each causal contrast, change one declared factor and hold every other material field fixed.

If several fields change, choose one valid design before launch:

- name the complete change as a bundled intervention and estimate assignment to that bundle;
- separate the factors in a prespecified factorial design; or
- refuse a single-factor causal claim.

A representation comparison, such as prose versus schema, is single-factor only when semantic content, invocation mode, validation, correction policy, and output requirements are held fixed. Package defaults, model catalogs, prompt substrings, and intended settings do not prove the condition that ran.

## Condition manifest and comparability

Give every condition an immutable ID, revision, and design-sealed manifest. Record exact values or `unknown` for:

- harness and agent source revisions and configuration;
- system and user prompts, skills or inline bundles, memory, scaffold, and context policy;
- provider, requested model selector, reasoning and sampling settings, service tier, and seed;
- tools, canonical implementations, aliases, plugins or extensions, versions, permissions, and load order;
- task fixture, dependency and lockfile revisions, working directory, network, cache, credentials, region, and mutable services;
- process, shell, TTY, project trust, concurrency, worker slot, and resource limits;
- token, action, turn, time, retry, repair, timeout, cancellation, and invalidation policies;
- evaluator revision and token, cost, latency, failure, and tool-call accounting definitions.

A causal contrast passes comparability only when all material fields except the declared intervention are equal or are controlled design factors. Unknowns stay visible. An unknown that could explain the contrast blocks the causal claim rather than being replaced by a package default.

## Requested, resolved, and observed identity

Retain three distinct identity layers for the parent and every nested agent:

| Layer | Meaning | Evidence |
| --- | --- | --- |
| Requested | Runtime, harness or runner, model selectors, and settings submitted by the coordinator | Frozen request and condition manifest |
| Resolved | Runtime revision, runner, provider, model, and settings selected by Fabric/runtime | Runtime-produced resolution metadata |
| Observed | Runtime process/module identity and provider/backend model attribution actually returned, when available | Process evidence, raw provider response, and native metadata |

Record disagreements and `unknown` values. `FabricAgentResult.model` is resolved runtime evidence, not independent provider-observed proof by itself. Package paths, defaults, and model-authored IDs or timestamps are not authoritative identity evidence. Preserve provider-native metadata rather than forcing a universal normalization. See [telemetry](telemetry.md) for parent/nested ownership and direct-versus-subtree totals.

## Pi skill loading on headless paths

Skill loading is part of the condition, not a prompt-format assumption. Pi documents `/skill:name` expansion on prompt and RPC surfaces. Historical packet evidence observed literal preservation on one one-shot path; a 2026-09-02 canary on the installed Pi 0.84.4 / Pi Fabric 0.75.0 `agents.run` process path captured an expanded `<skill ...>` payload instead. These observations are not portable. A slash command in submitted task text alone never proves loading; retain the accepted child prompt or equivalent runtime evidence.

Before scoring, run a non-scoring canary through the exact headless invocation path and retain evidence that the nested agent received the expanded skill content and exhibited a unique, benign skill instruction. If expansion is not proven, either block that condition or pass sealed inline text. An inline condition must be named an **inline instruction bundle** and its claims limited accordingly. Do not claim equivalence to interactive TUI skill dispatch.

Use direct `agents.run` for measured attempts and model graders so identity, status, usage, turns, tool calls, timestamps, session, and log evidence remain available. `workflow.agent` is limited to bounded design inventory, semantic audit, or report review where only its returned value is needed. The exact runtime contract and version map are owned by [architecture](architecture.md).

## Condition receipt

Publish one coordinator-authored, immutable condition receipt for each non-scoring preflight and link every scored attempt to the passing receipt for its condition revision. The receipt records:

- condition, design, execution, manifest, and invocation-path revisions;
- exact request artifact and requested parent/nested runtime, runner, model, and settings;
- Fabric-resolved runtime revision, runner, provider, model, session or agent IDs, and raw result evidence paths;
- process-observed runtime identity and provider-observed model/backend metadata or explicit `unknown`;
- prompt, skill or inline-bundle, extension, tool, permission, environment, budget, and isolation evidence paths;
- mechanism canary evidence and assigned, load-verified, exposed, and contract-valid counts;
- mismatches, unknowns, canary status, and a derived `passed` or `blocked` decision.

The coordinator supplies timestamps, IDs, hashes, and provenance. A receipt passes only when the exact invocation path was exercised, every required field matches its sealed manifest, required evidence resolves to uniquely owned artifacts, and no material unknown remains. Machine-readable condition records follow the canonical [condition schema](../schemas/condition.schema.json); deterministic and runtime canary requirements belong in [validation](validation.md).

## Mechanism ownership and exposure

For a delegation, retrieval, tool-use, repair, structured-handoff, or other mechanism claim, freeze:

- the owner: parent, child, tool, or evaluator;
- the causal path from assignment to final outcome;
- an observable exposure predicate and its structured evidence source;
- whether exposure is structurally forced or optional in production;
- eligible task features and the minimum non-scoring canary exposure;
- the output or handoff contract that makes exposure valid.

Prove exposure with structured parent and child events, tool records, or owned artifacts. Literal prompt presence, slash-command text, substring counts, and scope-path scans are not executed exposure. For delegation, the canary must use a real nested agent and distinguish dispatch, result delivery, parent consumption, and valid handoff.

Publish one mechanism projection for every terminal, including non-actor/control and invalid attempts. A missing, unreadable, oversized, or unowned source maps to an explicit `valid: false` projection with a typed missing/unknown reason; absence is never success and never crashes Analyze. Keep four denominators: assigned, treatment load verified, mechanism exposed, and output or handoff contract valid. Assignment remains the primary estimand unless exposure itself was randomized or structurally forced. Never discard unexposed assignments or treat an unmatched exposed subset as causal evidence. Sparse optional exposure means the benchmark estimates the assigned policy bundle, not the mechanism in isolation.

## Fresh-state isolation

Every attempt starts in a fresh process/session and an independently reset state appropriate to the task. Fresh session alone is insufficient. Isolate or restore:

- workspace and fixture bytes;
- memory and conversation state;
- caches, browser profiles, databases, queues, services, and tool-side mutable state;
- environment variables, temporary files, credentials state, ports, and process groups;
- benchmark outputs, grader secrets, prior attempts, and condition-private data.

Record creation and cleanup evidence plus any intentionally shared resource. If state cannot be isolated, declare the shared unit and carryover risk in the design, randomize or counterbalance it as required by [protocol design](protocol-design.md), and limit the claim. A missing cleanup or ambiguous prior mutation invalidates the affected pair under the frozen rule; it is not repaired by silently rerunning in reused state.

## Preflight gate

No scored assignment may start until runtime capability is supported, protected-state isolation is proven, every condition has a passing receipt, the exact skill or inline intervention is proven on its headless path, requested/resolved/observed identity is recorded, the mechanism canary meets its frozen threshold, and fresh-state reset has passed adversarial canaries. Lifecycle publication and checkpoint rules then follow [execution lifecycle](execution-lifecycle.md).
