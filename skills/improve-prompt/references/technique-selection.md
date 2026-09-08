# Conditional Technique Selection

Choose techniques only when they address an observable need in the source prompt. Preserve explicit user requirements. When several techniques apply, combine only those serving distinct needs. If none applies, retain the source or make only clarity edits under the entry skill's rewrite rules.

## Selection table

| Observable need | Recommended change | Boundary |
| --- | --- | --- |
| Task or deliverable is vague | State the action, expected result, and relevant acceptance criteria. | Do not invent deadlines, metrics, or extra deliverables. |
| Format, labels, or edge cases are difficult to describe | Preserve representative examples; suggest adding an example if necessary. | Do not fabricate domain facts. Examples can bias answers; more is not automatically better. |
| Multiple requirements depend on one another | Express dependencies or divide the task into meaningful stages. | Avoid prescribing a detailed procedure when a clear goal is sufficient. |
| Multi-step reasoning needs an auditable answer | Request the result plus relevant calculations, evidence, or a concise justification. | Do not routinely demand exhaustive internal reasoning. Explicit reasoning instructions are model- and task-dependent. |
| Many documents or a long conversation supply context | Separate task instructions from source material; identify relevant sections, source labels, and handling of contradictions. | Do not assume a universal best context position or silently discard potentially decisive evidence. |
| Answer depends on factual evidence | Specify the permitted evidence, citation expectations, and treatment of missing or conflicting information. | Do not assume browsing is available or invent sources. |
| Output will be parsed by software | Define fields, types, required values, and missing-value behavior. | A schema constrains form, not factual correctness. Recommend external validation only when relevant to the intended workflow. |
| Task involves code changes | Preserve scope and interfaces; specify intended behavior and appropriate verification. | Do not invent repository conventions, commands, dependencies, or passing-test claims. |
| Task involves tools or consequential actions | Distinguish the goal, permissions, prerequisites, observable completion, and escalation conditions. | Prompt wording does not enforce permissions. Do not grant additional authority. |
| Task is creative or subjective | Clarify audience, purpose, tone, and meaningful preferences while preserving creative freedom. | Avoid converting taste into arbitrary numeric criteria. |
| User names a model or environment | Adapt to its established capabilities and constraints. | Do not transfer another model's prompting advice as a universal rule. |
| Prompt is already clear and sufficient | Retain it or make minimal edits. | Longer is not inherently better. |

## Examples and context

When examples are useful:

- Prefer user-supplied examples that represent the intended inputs and outputs.
- Keep example facts separate from instructions and actual task data.
- Include a boundary case only when it clarifies an important distinction.
- Preserve meaningful example order; do not claim a new ordering improves performance without testing.
- If examples conflict with written requirements, use the entry skill's clarification decision to establish which is authoritative or expose the unresolved conflict.

When context is extensive:

- Keep instructions, reference material, and the required output distinguishable.
- Replace ambiguous references with explicit source names or labels.
- Make any proposed omission or compression of source material visible.
- Treat context layout as a candidate design choice, not a guaranteed optimization.

## When rewriting is insufficient

Identify the actual limitation before adding more instructions:

| Limitation | Response |
| --- | --- |
| Required facts or inputs are absent | Expose the missing input rather than inventing it. |
| The task requires unavailable tools | Preserve the dependency and flag it; do not imply availability. |
| The user needs reliable enforcement | Distinguish prompt instructions from external permissions and validation. |
| Several plausible rewrites have uncertain advantages | Choose the simplest faithful baseline. Describe alternatives only if requested. |
| The user requires demonstrated improvement | Explain that testing is needed. Do not claim the rewrite is validated. |

If testing advice is requested, propose a task-specific comparison, holding the model, inputs, tools, and grading criteria fixed. Compare accepted outputs, relevant failures, and costs. Keep this advice outside the improved prompt unless evaluation is itself the task. Proposing a comparison does not authorize running it.

## Final selection check

For each added technique, identify internally:

1. The ambiguity or failure risk it addresses.
2. The user requirement it serves.
3. The extra complexity or limitation it introduces.

Remove techniques that lack a clear answer to the first two questions.
