# Evaluating Skills

Use this reference to establish a baseline, grade behavior, compare versions, or decide whether another iteration is justified.

## Define evidence before running

Call every predeclared success statement a **criterion**. Use one term throughout artifacts and reports.

Choose evidence by outcome type:

| Outcome | Evidence |
| --- | --- |
| Deterministic artifact | Programmatic inspection against an independent expected value |
| Required process or discipline | Transcript evidence showing decisions, order, and rationales |
| Invocation | Exact read or activation of the intended `SKILL.md` |
| Subjective quality | Anchored human rubric, preferably on blinded paired outputs |

A criterion should be discriminating: a wrong output must not pass it by coincidence. Grade objective criteria pass/fail with specific evidence. Do not convert taste into fake precision.

## Establish the right baseline

Use the same prompt, inputs, model, tools, and environment in fresh contexts:

- creating: compare the draft with no skill;
- improving: snapshot and compare the original skill;
- changing one instruction: include a no-guidance control;
- changing invocation: compare the current description.

When subagents are available, launch paired conditions together. Otherwise run fresh Pi sessions sequentially. Do not let the authoring conversation leak the intended answer into the baseline.

## Build representative cases

Cover every major branch plus boundaries. Include:

- realistic positive tasks;
- missing-information tasks;
- difficult near-misses;
- variation and edge cases;
- pressure scenarios only when the skill enforces a rule agents are tempted to skip.

For a discipline skill, combine credible pressures such as urgency, sunk cost, authority, or fatigue. Capture rationalizations verbatim. For an output-shaping skill, test the output structure directly instead of manufacturing pressure.

## Micro-test wording

Use micro-tests when a specific sentence or contract may be causing behavior:

1. Keep the full realistic context around the candidate wording.
2. Include a no-guidance control that exhibits the failure.
3. Run at least five fresh samples per close variant.
4. Score the target behavior, then manually inspect every flagged match.
5. Treat convergence as evidence; divergent interpretations are variance, not success.

Micro-tests choose wording. Full scenarios remain the final behavior gate.

## Grade and analyze

Inspect produced artifacts, not just the assistant's claims. For each run record:

- case and condition;
- criterion, pass/fail, and evidence;
- errors or workarounds;
- captured duration, tokens, or tool calls only when the harness actually reports them.

Across repeated runs, report the distribution or mean and spread. Identify criteria that always pass both conditions, always fail both, regress with the skill, or vary enough to be unreliable. Do not invent timing, token counts, sample sizes, confidence, or statistical significance.

After aggregate grading, inspect transcripts for causation: which instruction was followed, missed, negotiated away, or replaced by improvised work?

## Use blind comparison when quality is subjective

Randomize labels A/B and give an independent reviewer the prompt, rubric, and outputs without skill identities. Require specific strengths, weaknesses, and evidence. Unblind only after the verdict, then compare transcripts to explain why the winner won. A blind preference complements objective criteria; it does not replace them.

## Iterate without overfitting

Change the smallest instruction, pointer, script, or completion criterion that explains an observed failure. Rerun the failing case, controls, and held-out cases. Preserve a separate test set when optimizing repeatedly.

Stop when:

- required criteria pass and near-misses remain clean;
- the user accepts subjective results;
- the baseline already performs as well;
- new wording merely moves failures around;
- repeated runs show no meaningful improvement.

Report the stop reason and any blocked validation. Passing unrun tests is not a valid result.
