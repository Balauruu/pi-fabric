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

Before substantive package writes, create and maintain an acceptance proof matrix with these columns:

| ID  | Material requirement | Owning instruction or code | Proof type | Planned check or scenario |
| --- | -------------------- | -------------------------- | ---------- | ------------------------- |

Give every row one owner and a planned proof before authoring begins. Mark unresolved proofs as design blockers or explicitly unrun planned checks; do not silently drop the requirement. Reconcile the matrix after each changed route and before delivery. This is a working authoring aid, not mandatory runtime state in the generated skill.

## Earn the abstraction and choose mechanisms

Read [mechanism selection](references/mechanism-selection.md) now, before selecting the architecture. It owns the selection and grounding rules.

Require concrete evidence that a reusable workflow centralizes stable phases, policy, failure handling, output contracts, or lifecycle behavior beyond a prompt wrapper. Apply the deletion test: if deleting it merely removes a name, it is not earned. If required complexity would spread across callers, it is. Evidence can be recurring caller obligations or one intrinsically reusable contract, not an arbitrary number of examples.

When a workflow is not earned, recommend direct `fabric_exec` work or a small prompt instead. If the user still explicitly wants a thin skill, identify it honestly and keep it thin. Do not fabricate delegation to justify the package.

Give every selected mechanism one task-backed responsibility. Ordinary direct work is a complete Fabric design. Keep mechanism selection internal to the constructor, not exposed as a menu of infrastructure the generated skill's user must understand.

## Author the execution

Read [workflow composition](references/workflow-composition.md) before producing executable blocks. It owns shared data flow, effects, and failure semantics. Read it completely, then follow its branch links only for mechanisms selected for this task.

Give each execution profile, tool grant, data shape, persistence rule, state transition, and output contract one authoritative owner. Consumers reference or derive from it. For every structured boundary, define and enforce both the shape contract and the relational contract from workflow composition; consumers must not accept schema-valid data until applicable relational invariants pass. Repeated or variable dispatch uses a request factory taking actual runtime item identity and assignment. Do not duplicate profiles between prose, code, and stage-specific files.

Produce concrete runnable bodies in the configured kernel with all helpers defined. Keep arbitrary data out of generated source. Use exact named payload keys or validated runtime variables. In author/write modes, operative behavior belongs inside the package, not in a surrounding proposal. No unresolved substitutions, invented actions, or instructions to execute another user-only Fabric workflow without explicit composition authorization.

Keep the public interface small: accepted request, consequential decisions, authority, output, and failure modes. Hide scheduling and mechanism selection behind it. Include support files only at distinct points of use where they change execution. Merge shallow references whose callers always need them together. Keep always-required executable code together. Do not add scripts, schemas, state files, examples, or directories by habit.

## Validate and deliver

Read the complete resulting package and diff. Reconcile the acceptance proof matrix, preserved constraints, and file dispositions. Validate:

- **V1 Discovery:** use current Pi `docs/skills.md` and the installed loader. Check name syntax, nonempty description, all links and paths, duplicate names, explicit command discoverability, and model-catalog exclusion for user-only skills. This constructor stays `disable-model-invocation: true`. Advanced generated workflows also remain user-invoked under Fabric policy. Simple skills choose their justified invocation policy.
- **V2 Executability:** check exact payload bindings, defined helpers, native request/result contracts, action availability and selected kernel. Type-check executable blocks against installed guest declarations and effective action schemas where supported. Check that each implemented relational guard rejects mismatched identity, missing or duplicate required coverage, foreign references, and valid-universe references associated with the wrong assignment when applicable. A provider schema does not validate a guest callback API. No type check establishes permission or semantics.
- **V3 Behavior:** for authored executable code, run applicable deterministic tests using authorized temporary fixtures outside the package. Exercise direct work, finite partial outcomes, persistent stop/recovery, and unavailable preflight for the branches actually authored. Test the extracted code, not a parallel reimplementation. Inject native failures, useful partial text, ambiguous outcomes, and adversarial structured outputs with missing, duplicate, foreign, or mismatched identities and references. For each failed effect, assert preservation of the exact useful payload and absence of unverified success paths, receipts, or handles, not only the outcome class. Mocks establish local control flow only, not live provider or actor behavior. Never launch a generated task as an implicit test.
- **V4 Integrity:** search for duplicated contracts, accidental domain policy, unsupported claims, unsafe source substitution, static multi-item bindings, unresolved placeholders, unjustified infrastructure, and unauthorized user-only workflow dependencies. Match exact filenames, links, placeholders, and stale markers literally; with `pi.grep`, use `literal: true`. Use regular expressions only when their semantics are intentional and their metacharacters are escaped. If a batched outer call fails, or any batch member is failed, indeterminate, or lacks confirmed completion, inspect completed operation outcomes and current state before retrying because earlier operations may already have committed. Do not repeat a mutation until it is reconciled. Run applicable Markdown/formatting and repository checks. Inspect failures and rerun only affected cases plus relevant controls.

Only when the user explicitly requests agent evaluation or an independent agent critique, run one focused fresh `agents.run` critique after applicable deterministic checks pass. Package complexity alone does not trigger this step, and omitting an unrequested critique is not a validation gap. Give the critic a read-only execution profile with no package-write authority, plus the acceptance proof matrix, changed package content or diff, and explicit scope boundaries. Require only potential contract violations with file or section evidence. Main verifies every finding and is the only owner allowed to alter the package. Critique is not proof and never replaces deterministic checks. If the action is unavailable, report the requested critique as unrun rather than launching the generated task or inventing a substitute.

Stop when checks cover the requested artifact or a material blocker prevents progress. Preserve useful results and name any unverified requirements without silently weakening them. In design mode, unrun checks remain a plan.

Finish with changed paths or complete contents, principal design decisions, checks actually performed and their outcomes, and limitations. Distinguish designed, authored, written, discoverable, type-checked, behaviorally tested, and currently running. Do not claim one from evidence for another.
