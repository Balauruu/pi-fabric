---
name: create-fabric-skill
description: Designs, authors, and revises task-shaped Pi Fabric skills with explicit authority, executable contracts, and verified lifecycle behavior. Invoke explicitly to construct or rework a skill package.
disable-model-invocation: true
---

# Create Fabric Skill

Construct from requirements, not a universal multi-agent template. Main owns architectural judgment and integration. This constructor's output is a skill package or its design, never execution of the generated skill's task.

## Establish the contract

Extract the requested capability, accepted inputs, output and consumer, consequential decisions, authority, lifecycle, and observable success criteria. Carry forward settled answers. Resolve facts from supplied files and the installed runtime. Ask only about unresolved choices that materially change this contract. Do not require an interview skill, routine confirmation round, or API choices from the user.

Choose the requested delivery mode:

| Mode          | Deliverable and authority                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design        | Implementation-ready design, connected execution blocks, proposed files and validation plan. No package writes. Label blockers rather than leaving runnable placeholders. |
| Author        | Complete usable package contents in the reply. No installation or filesystem writes.                                                                                      |
| Write/install | Write only explicitly authorized package paths and validate there. Installation outside those paths needs separate authorization.                                         |

Design approval is not write permission. None of these modes authorizes generated task execution, provisioning dependencies, or changes to configuration, credentials, permissions, or models. Scope test effects separately. If mode or destination is materially ambiguous, ask before writing.

For revision, read the complete existing package and every linked reference before editing. Trace input → execution → output. Record each file's disposition and the task-specific constraints that must survive. Inspect existing changes and preserve unrelated or user-authored work. For creation, use supplied requirements and examples without importing policy from unrelated investigations.

Keep an acceptance ledger linking each requirement to its owning instruction or code and a check. This is a working authoring aid, not mandatory runtime state in the generated skill.

## Earn the abstraction and choose mechanisms

Read [mechanism selection](references/mechanism-selection.md) now, before selecting the architecture. It owns the selection and grounding rules.

Require concrete evidence that a reusable workflow centralizes stable phases, policy, failure handling, output contracts, or lifecycle behavior beyond a prompt wrapper. Apply the deletion test: if deleting it merely removes a name, it is not earned. If required complexity would spread across callers, it is. Evidence can be recurring caller obligations or one intrinsically reusable contract, not an arbitrary number of examples.

When a workflow is not earned, recommend direct `fabric_exec` work or a small prompt instead. If the user still explicitly wants a thin skill, identify it honestly and keep it thin. Do not fabricate delegation to justify the package.

Give every selected mechanism one task-backed responsibility. Ordinary direct work is a complete Fabric design. Keep mechanism selection internal to the constructor, not exposed as a menu of infrastructure the generated skill's user must understand.

## Author the execution

Read [workflow composition](references/workflow-composition.md) at this point, before producing executable blocks. It owns data flow, effects, failure semantics, and the connected examples. Read the whole reference, but instantiate only branches the task earns.

Give each execution profile, tool grant, data shape, persistence rule, state transition, and output contract one authoritative owner. Consumers reference or derive from it. Repeated or variable dispatch uses a request factory taking actual runtime item identity and assignment. Do not duplicate profiles between prose, code, and stage-specific files.

Produce concrete runnable bodies in the configured kernel with all helpers defined. Keep arbitrary data out of generated source. Use exact named payload keys or validated runtime variables. In author/write modes, operative behavior belongs inside the package, not in a surrounding proposal. No unresolved substitutions, invented actions, or instructions to execute another user-only Fabric workflow without explicit composition authorization.

Keep the public interface small: accepted request, consequential decisions, authority, output, and failure modes. Hide scheduling and mechanism selection behind it. Include support files only at distinct points of use where they change execution. Merge shallow references whose callers always need them together. Keep always-required executable code together. Do not add scripts, schemas, state files, examples, or directories by habit.

## Validate and deliver

Read the complete resulting package and diff. Reconcile the acceptance ledger, preserved constraints, and file dispositions. Validate:

- **V1 Discovery:** use current Pi `docs/skills.md` and the installed loader. Check name syntax, nonempty description, all links and paths, duplicate names, explicit command discoverability, and model-catalog exclusion for user-only skills. This constructor stays `disable-model-invocation: true`. Advanced generated workflows also remain user-invoked under Fabric policy. Simple skills choose their justified invocation policy.
- **V2 Executability:** check exact payload bindings, defined helpers, native request/result contracts, action availability and selected kernel. Type-check executable blocks against installed guest declarations and effective action schemas where supported. A provider schema does not validate a guest callback API. No type check establishes permission or semantics.
- **V3 Behavior:** use authorized temporary fixtures outside the package. Exercise direct work, finite partial outcomes, persistent stop/recovery, and unavailable preflight for the branches actually authored. Test the extracted code, not a parallel reimplementation. Inject native failures, useful partial text, and ambiguous outcomes. Mocks establish local control flow only, not live provider or actor behavior. Never launch a generated task as an implicit test.
- **V4 Integrity:** search for duplicated contracts, accidental domain policy, unsupported claims, unsafe source substitution, static multi-item bindings, unresolved placeholders, unjustified infrastructure, and unauthorized user-only workflow dependencies. Run applicable Markdown/formatting and repository checks. Inspect failures and rerun only affected cases plus relevant controls.

Stop when checks cover the requested artifact or a material blocker prevents progress. Preserve useful results and name any unverified requirements without silently weakening them. In design mode, unrun checks remain a plan.

Finish with changed paths or complete contents, principal design decisions, checks actually performed and their outcomes, and limitations. Distinguish designed, authored, written, discoverable, type-checked, behaviorally tested, and currently running. Do not claim one from evidence for another.
