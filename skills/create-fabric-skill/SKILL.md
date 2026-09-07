---
name: create-fabric-skill
description: Designs and authors task-shaped Fabric skills by selecting and composing native mechanisms into concrete executable workflows. Explicit invocation for a new skill, an existing procedure, or a skill rework.
disable-model-invocation: true
compatibility: Requires Pi with pi-fabric and the existing grilling skill. Ground selected mechanisms in installed documentation and effective executor contracts.
---

# Create Fabric Skill

Turn a task into an executable composition of Fabric mechanisms. This is the Fabric architectural authoring tool, not a generic skill-writing tutorial. Optimize for the task's quality criteria: direct work, delegated reasoning, structured workflows, and persistent observation are all legitimate shapes.

## 1. Brief grilling: confirm the shape first

**First substantive action:** read and apply the existing [grilling skill](<skill-dir>/../engineering/grilling/SKILL.md), reached as `/skill:grilling`. Do not reproduce its interview manual. If that dependency is unavailable, report the blocker rather than silently substitute an interview.

Scope its design tree to consequential authoring decisions: purpose/scope, inputs and outputs, execution/interaction shape, authority, and success criteria. Carry forward answers from the request, conversation, examples, and existing package. Read supplied files completely; resolve factual prerequisites rather than asking the user to look them up. Follow grilling's frontier method and recommended-answer format for unresolved shape-changing questions only.

Normally use one compact frontier round. Follow up only when an answer newly unblocks another consequential shape decision. This exhausts the **bounded skill-shape tree**, not every implementation alternative: Main owns subsequent architectural judgment. Keep research needed to frame questions bounded; postpone mechanism selection and authoring until the shape is confirmed. Do not force a worker merely to look up a small fact; this scoped use adapts grilling's factual-research instruction, not the shared skill itself.

Summarize the resulting shape and wait for confirmation unless the same shape was already explicitly confirmed. Settled or delegated decisions are not new questions. A newly discovered consequential trade-off later reopens only its affected branch.

Include the deliverable mode in that shape:

- **Design:** implementation-ready design, representative execution blocks, proposed files, prerequisites and validation plan; no files written.
- **Author:** complete usable package contents in the reply, including necessary references/code; no installation.
- **Write/install:** author the package at explicitly authorized paths and validate it there. Preserve pre-existing changes.

Use a clear user request to select the mode; ask when materially ambiguous. Acknowledging a design is not permission to write files. None of these modes authorizes executing the resulting skill's underlying task or changing runtime permissions/configuration. Separately scope any behavioral test effects.

**Complete when:** the shape, authority, deliverable, and success criteria are confirmed; remaining factual blockers are visible.

## 2. Map the task to Fabric requirements

Main owns sizing, architectural judgment, semantic verification, and final integration. Code handles mechanics; workers receive bounded responsibilities, not ownership of Main's final answer by default.

Identify the actual execution demands: independent versus dependent work, context size, human decision points, effects, structured consumers, observation/redirection, and lifecycle. Translate them into a short mechanism brief. Do not ask the user to choose APIs or assume that every task needs agents.

For an existing skill, inventory and read its entire package. Trace input to execution to output, then classify each existing mechanism and file as retained, replaced, split, or removed. Preserve task-specific constraints without inheriting unsuitable infrastructure.

For general packaging or evaluation technique, consult the applicable branches of the installed [ultra-skill-creator](<skill-dir>/../ultra-skill-creator/SKILL.md); do not duplicate its authoring manual. The Fabric composition remains this skill's responsibility.

**Complete when:** each execution demand maps to a task requirement and every existing file has a disposition.

## 3. Select and ground the Fabric composition

**Hard pointer:** read [mechanism selection](<skill-dir>/references/mechanism-selection.md) before choosing the architecture. Use its catalogue to select a primary execution shape and complementary mechanisms, not to accumulate features.

Explain each selected mechanism's contribution and any consequential alternative. An obvious direct task needs only a short rationale. Choose bounds from actual work, runtime constraints, and user budgets; do not invent fixed worker counts, retry quotas, or size thresholds as universal defaults.

Locate current installed Pi `docs/skills.md`, Fabric `docs/skills.md`, and the configured kernel's `fabric-exec` reference. Read relevant documents completely, following cross-references needed by the selected mechanisms. Locate the installed package from known resource paths or package metadata, not an assumed legacy `skills/` layout. Do not load or route through another user-only Fabric workflow unless the user explicitly requested that composition. Inspect native runtime documentation instead. The grilling composition above is an explicit exception, not a routing policy for generated skills.

For unfamiliar actions, use bounded discovery and `tools.describe` to inspect effective input/output contracts before specifying executable calls. Guest helpers require their current runtime declarations/documentation; a provider schema is not automatically their contract. Verify necessary command/tool dependencies without provisioning them.

Distinguish **documented**, **installed**, **enabled**, **available**, and **behaviorally verified**. Parent access is not proof of child access. Missing capabilities make the affected branch conditional or blocked; do not change configuration or silently downgrade the requirement. Carry prerequisites into the generated skill's preflight, not just this design discussion.

**Complete when:** mechanisms have distinct jobs, their composition is feasible under explicit prerequisites, and unfamiliar APIs are grounded rather than recalled.

## 4. Author the executable path

**Hard pointer:** read [workflow composition](<skill-dir>/references/workflow-composition.md) before producing execution blocks. Apply its boundary contracts to the selected shape.

Normally provide concrete Fabric code for the designed execution, not just “delegate, aggregate, verify.” A small direct skill may need only a short program. A finite workflow may use one code-held loop or multiple invocations around Main judgment. An event-driven skill needs concrete startup, observation, status/recovery and stop paths. Use the configured kernel; this creator does not mandate a language or dual-language package for every third-party skill.

Choose package boundaries by ownership and when material is needed. Keep always-required executable code together. References must change execution, scripts must earn their dependency cost, and examples must illustrate task behavior rather than impose a layout. Give each data/output contract one authoritative owner; derive consumers and projections from it.

Produce the selected deliverable with:

- identity, invocation policy, accepted inputs and task output;
- execution blocks with actual prerequisites, payloads, outputs and connected next actions;
- applicable authority, verification, recovery and stop behavior;
- the smallest package tree, with every support file reachable;
- actual validation evidence and explicit unverified or blocked items.

These are required decisions, not mandatory report headings. In author/write mode, place operative instructions inside the generated package; a surrounding proposal cannot supply missing runtime behavior. Parameterize real inputs with named payloads rather than leaving literal `<actor-id>` or `TODO` placeholders in runnable blocks.

**Complete when:** a fresh executor can follow input through verified output without inventing a handoff, missing helper, hidden state, or ungranted capability.

## 5. Validate, integrate, and stop

Keep evaluation artifacts outside the final skill package. For revisions, use fresh-context observations of the unchanged baseline where practical. Test the actual authored package, not only an author's description of it.

Check frontmatter and every local pointer; use installed Pi loading to confirm the intended name and invocation policy. This creator remains explicit-only; generated skills choose their own justified policy, respecting Fabric's user-opt-in advanced workflow boundary. For a user-only skill, test explicit loading and absence from the model catalogue rather than expecting implicit invocation.

Type-check executable blocks against effective contracts where supported, then run authorized behavioral probes. Static validation does not establish semantics. Exercise representative success and failure paths for the chosen shape: direct simplicity, finite partial results and integration, or persistent identity/event/stop behavior. Include cross-invocation transfer, child capability gaps, ambiguous effects, and oversized outputs when the design actually has those risks.

Main inspects results and primary evidence/final state. Classify failures, fix the causal omission, rerun affected cases and relevant controls, and preserve passing work. Do not repeat whole workflows merely because coverage is partial. Stop when criteria are met, a material blocker requires the user, or further iteration offers no meaningful improvement; name the actual reason.

Before delivery, inspect the complete diff/package for duplicated contracts, unsupported API claims, accidental domain policy, unnecessary machinery, and stale proposal-only wording. In design mode, unrun behavioral checks remain a plan. In author/write modes, report which checks ran and which were blocked or deferred; never call an untested package verified.

Finish with the delivered mode, paths or complete contents, selected Fabric composition, concise check results, and remaining limitations. Distinguish authored, written, discoverable, tested, and currently running. Installation is not task execution.
