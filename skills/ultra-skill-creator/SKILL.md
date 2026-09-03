---
name: ultra-skill-creator
description: Creates, revises, and evaluates Pi Agent Skills. Use when a user wants to capture a reusable agent workflow, author or repair a SKILL.md from observed failures, compare skill versions or baselines, test skill invocation, or improve a skill description, including requests that do not name the skill format explicitly.
compatibility: Designed for Pi. Python 3 is required only for the bundled validator.
---

# Ultra Skill Creator

Create the smallest skill that observably improves agent behavior. The target is **predictability of process**, not identical outputs or more prose.

## Route before acting

Read the indicated reference completely before taking that branch:

- **Create or revise a skill:** [designing skills](references/designing-skills.md)
- **Establish a baseline, grade behavior, or compare versions:** [evaluating skills](references/evaluating-skills.md)
- **Design or test a description:** [testing invocation](references/testing-invocation.md)
- **Check a finished skill:** run the [standalone validator](scripts/validate_skill.py)

Every supporting file is linked here directly. Load only the branches the task needs.

## RED-GREEN-REFACTOR

### 1. Frame the intended capability

First decide whether a skill is the right artifact. Prefer a project instruction for a project-only convention, a script for fully deterministic mechanics, and no new artifact for a one-off request.

Extract what the conversation already establishes, then ask only unresolved questions. Treat unanswered fields as unknown, not permission to invent domain policy. Capture:

- capability and intended users;
- positive triggers and difficult near-misses;
- expected outputs or decisions;
- inputs, dependencies, constraints, and examples;
- observed failures or risks;
- evidence that would demonstrate improvement.

If any unknown could materially change those fields, return one grouped interview and stop before research or drafting. Resume after the answers. Produce a provisional draft only when the user explicitly requests one, and label its assumptions.

**Complete when:** the capability boundary, invocation boundary, output contract, constraints, and evaluation mode are explicit enough that two authors would build the same skill.

### 2. Research before authoring

Inspect the current target runtime, relevant primary documentation, similar local skills, user-provided examples, and every file in an existing skill. Verify optional commands, packages, browser features, and platform assumptions before depending on them. Treat current Pi behavior as authoritative over source material written for another harness.

**Complete when:** each runtime assumption is verified, every existing file has a disposition, and reusable mechanics have been distinguished from prose guidance.

### 3. RED: observe the default

When behavior is measurable, run representative prompts in fresh contexts before drafting:

- new skill: no-skill baseline;
- revision: unchanged skill baseline;
- wording change: no-guidance control plus candidate wording;
- invocation change: current description against positive and near-miss prompts.

For subjective work, record examples and a human rubric instead of inventing numerical assertions. If the baseline shows no material gap, stop rather than adding no-op guidance.

**Complete when:** the failure, omission, variance, or invocation error is captured as evidence, including the agent's actual rationale when discipline breaks.

### 4. GREEN: write the minimum correction

Use the design reference to choose frontmatter, information hierarchy, instruction form, and resource boundaries. Address observed failures, not imagined future needs. Keep one authoritative owner for each rule. Add a deterministic script only when an operation is repeated or fragile enough that prose would recreate it inconsistently.

**Complete when:** every added line or file has a demonstrated job, all branch-specific detail sits behind a direct pointer, and the smallest draft covers the intended capability.

### 5. Validate end to end

From this skill directory, run:

```sh
python -B scripts/validate_skill.py <target-skill-directory>
```

Then use the evaluation and invocation references to verify:

1. Pi discovers the skill with no target-specific diagnostics.
2. Pi can load the full `SKILL.md` and follow every relative pointer.
3. Positive, casual, implicit, and typo-bearing prompts invoke it.
4. Difficult near-misses do not invoke it.
5. Each major behavior branch succeeds in a fresh context.
6. Included scripts pass their focused happy path.

Keep generated evaluation output outside the final skill directory.

**Complete when:** static checks, Pi loading, invocation cases, and branch scenarios have recorded results; blocked checks are named rather than claimed.

### 6. REFACTOR only from evidence

Classify each failure before changing wording. Make one causal correction, rerun the failing case and its controls, then prune duplication, sediment, sprawl, and no-op prose. Preserve held-out cases while tuning descriptions or behavior.

Stop when the tests pass, the user is satisfied, no baseline gap remains, or another iteration produces no meaningful improvement.

**Complete when:** no observed failure remains unaddressed, no passing control regressed, and the stop reason is explicit.
