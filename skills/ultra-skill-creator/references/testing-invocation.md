# Testing Skill Invocation

Use this reference when writing or tuning a model-invoked description.

## Compose the candidate

Write one concise identity clause stating what the skill handles, followed by one trigger clause per distinct branch. Use concrete user intent and domain terms. Keep implementation steps in the body so invocation causes the agent to read the skill instead of treating metadata as a shortcut.

Keep a skill user-invoked only when autonomous or cross-skill discovery is unnecessary; set `disable-model-invocation: true` in that case.

## Build the case matrix

Create realistic prompts in four groups:

1. One positive case for every major branch.
2. Casual, abbreviated, typo-bearing, and implicit positive cases that do not name the skill.
3. Difficult near-misses sharing keywords but needing an adjacent capability.
4. Competing-skill cases that clarify which skill should win.

Avoid trivial positives and irrelevant negatives. Use substantive prompts for which loading the full skill could change execution.

## Measure actual invocation in Pi

Run each case in a fresh session with only the candidate skill visible when isolating description quality. A reproducible starting command is:

```sh
pi --no-skills --skill <skill-directory> \
  --no-extensions --no-context-files --no-prompt-templates \
  --tools read --no-session --mode json -p "<test prompt>"
```

Record a positive only when the trace shows the agent reading or activating the exact target `SKILL.md`. The agent saying it would use the skill is not evidence. For negative cases, confirm that read is absent.

After isolated cases pass, repeat representative prompts with the normal skill catalog enabled to expose competition. If the provider, model, or tracing mode is unavailable, mark the test blocked instead of substituting a different mechanism and claiming Pi invocation passed.

## Estimate variance before optimizing

A single smoke run can catch obvious mistakes. For description optimization, repeat each case at least three times; use five or more for close wording decisions. Report trigger counts, false positives, and false negatives rather than a score without sample size.

Keep balanced positive and near-miss cases. For repeated tuning, separate training cases from held-out cases and select the description on held-out behavior, not on how well it memorizes the examples.

## Change only observed failures

For a false negative, add or sharpen the missing intent branch. For a false positive, clarify the capability boundary without listing every negative example. If both move together, try a structurally different description rather than appending synonyms.

Stop when required positives invoke reliably, difficult near-misses remain clean, held-out behavior does not regress, or another edit produces no meaningful gain.
