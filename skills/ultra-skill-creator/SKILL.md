---
name: ultra-skill-creator
description: Creates and revises agent skills from requirements, examples, and existing workflows. Use when the user wants to author a SKILL.md, capture a reusable process, or change a skill's instructions or structure.
---

# Ultra Skill Creator

Write agent-facing instructions that specify a capability's inputs, decisions, actions, and result. Use primitives, variables, tables, and literal templates to make those mechanics precise, not to impose a fixed architecture on every skill.

## Creation workflow

### 1. Define the capability

Establish the intended result, inputs, decisions the skill must make, and boundaries from the user's request. For a revision, identify what changes and what remains. Ask only for missing information that would change those mechanics. If a provisional draft is requested, label unresolved assumptions.

### 2. Specify the mechanics

Choose the forms below according to the capability. Combine small sections and omit inapplicable ones. These are construction tools, not a pattern-count checklist.

| Need | Instruction form | Specify |
| --- | --- | --- |
| Reused input or configuration | Named variable, optionally a table | Source, accepted values, default, missing/invalid behavior, and consuming step. For derived values, give dependencies and path base |
| Recurring concept or output unit | Named primitive | Fields and meanings, identity if needed, and composition into larger units |
| Unconditional behavior | Shared rule | Required action, prohibited action where needed, and any exception or preservation boundary |
| Alternative operations | Decision table | Operation, observable selection condition, and procedure or linked file. Resolve overlapping conditions and no-match cases |
| Ordered work | Numbered steps | Actions in dependency order and the result that ends each meaningful stage |
| Reused internal operation | Named procedure | Caller, inputs, result, and failure behavior. Keep it separate from user-selectable routes |
| Exact output shape | Literal template or schema | Required fields, ordering, value meanings, and expansion rules |
| Variable-sized output | Repeatable unit | Exact block boundary, item binding, ordering, cardinality, and empty case |
| Conditional content | Inclusion predicate | When the whole block is included, omitted, or replaced with an absence marker |
| Judgment or creative content | Bounded free-form slot | What may vary without changing the required structure |
| Related outputs | Shared definition | Authoritative identifiers, vocabulary, units, or style and the outputs that consume them |
| Long-lived or updated work | State and mutation contract | See [State and ownership](#state-and-ownership) |

Define each symbol once and give it one meaning. Distinguish configuration names from output slots and literal data. Put exceptions beside their rules. State units, inclusive/exclusive bounds, and counting rules for numeric limits. Separate exact obligations from qualitative preferences.

### 3. Author the skill

Use the package and template rules below. Put shared instructions in `SKILL.md`. Place detailed procedures or templates in references when they are read at a distinct point of use. Link the actual file there and state when to read it. A supporting file need not be linked from every layer or duplicated in the entry file.

Write to the executing agent. Specify what to consume and do, not how a human invokes `/skill:name`. Do not add command-registration explanations, interpreter disclaimers, or descriptions of what the skill is not. Include actual tool syntax or dependencies only where the procedure uses them.

Keep one owner for each rule. A reference supplies detail rather than repeating the body. Do not add generic research steps, exhortations to think carefully, or authoring-process instructions to the generated skill. Include scripts, examples, and assets when they express the requested mechanics more directly.

### 4. Check the authored artifact

Check the requested content, frontmatter, actual link targets, symbol consistency, and template structure. Walk a representative input through each changed route or template to identify undefined values, ambiguous decisions, missing sections, and contradictory completion rules. This is an artifact review, not a model benchmark or a recurring repair stage.

Deliver the changed paths and any unresolved design choice. Creating or revising a skill does not require a baseline, description test, evaluation report, or automatic follow-up optimization.

## Package and frontmatter

A skill contains `SKILL.md` with YAML frontmatter. Start with this template:

```yaml
---
name: skill-name
description: The capability and when it applies.
---
```

Use a name of 1–64 lowercase letters, digits, and single hyphens between words. Keep the description non-empty and at most 1024 characters. Replace both example values with the target skill's identity.

Do not add `compatibility`. Add other metadata only for an explicit requirement, such as a required license. Set `disable-model-invocation: true` only when the user requests a manual-only skill.

Ignore `.directory` files during skill inventory, comparison, and artifact checks. They are desktop metadata, not skill resources.

## Template mechanics

Use language-tagged fences for exact syntax. Label whether a block is a template, executable command, pseudocode, or example. Use backticks for literal identifiers and values. Use longer outer fences when embedding fenced blocks.

For templates, define slot values and repeat/conditional expansion at the point of use. Remove authoring directives from the produced artifact, not from the skill's reusable template. Preserve literal delimiter text that belongs to user data. Escape substitutions for the destination format. Use comments only where that format supports them.

Example output template for a skill that returns findings:

```markdown
# {{TITLE}}
{{SUMMARY}}

<!-- repeat:start FINDING -->
## {{FINDING_TITLE}}
Evidence: {{EVIDENCE}}
Implication: {{IMPLICATION}}
<!-- repeat:end FINDING -->

<!-- if:start INCLUDE_NOTES -->
## Notes
{{NOTES}}
<!-- if:end INCLUDE_NOTES -->
```

For this example, `INCLUDE_NOTES` is a Boolean input defaulting to `false`. Ask if a supplied value is neither `true` nor `false`. Remove the Notes block when false. Otherwise fill `NOTES` with relevant free-form context or `None`. Repeat the Finding block once per finding in source order, binding its three slots to that item. Zero findings removes the block and requires `SUMMARY` to say none were found. Fill document-level `TITLE` and `SUMMARY`, then remove directive comments. No unfilled authoring slots remain in the result.

Use the structure and output medium the capability needs. This example does not require findings, Markdown, or Notes in other skills.

## State and ownership

Apply this section only when the target skill tracks progress, modifies an existing artifact, or hands work to another actor. Stateless conversational skills do not need state markers, history, or saved files.

- Define initial state, allowed transitions, transition evidence, and who may update each state. Distinguish unsuccessful work from unavailable prerequisites and from completion.
- Give update targets stable identities. Define which fields are immutable, replaceable, derived, or append-only. Specify history order and duplicate handling for retried writes.
- Identify which operation owns each change and which content it must preserve. Related outputs refer to their authoritative source rather than maintaining competing copies.
- A handoff records the inputs, remaining work, recipient, and readiness condition. If the artifact instructs its recipient, include the execution order and completion conditions it needs.
- Where the capability performs checks, pair each with the result it establishes. Define whether independent work may continue after a local failure and what that means for overall completion.
- If the target operation retries, define its bound and stop outcome. Do not add a retry, repair, or refactor stage to a capability that does not need one.

## Optional evaluation

Only when the user explicitly requests evaluation or a behavior comparison, read [evaluating skills](references/evaluating-skills.md). Do not load or run it as a creation, revision, or artifact-check step.
