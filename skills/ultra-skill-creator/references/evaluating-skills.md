# Evaluating Skills

Use only after an explicit user request to evaluate a skill's behavior or compare versions. Creating, revising, or reviewing a skill does not activate this procedure. Editing this reference is not permission to execute an evaluation. Description and invocation testing are outside this procedure.

## 1. Define the evaluation question

Identify the target skill, behavior being assessed, supplied inputs, expected result, and any comparison requested. Use the user's examples and criteria. Ask only for a missing choice that would change the evaluation. Do not require a comparison when the user requests a standalone assessment.

Choose evidence appropriate to the question:

| Subject | Evidence |
| --- | --- |
| Structured output | Produced artifact compared with independently stated required values and shape |
| Decision or procedure | Trace showing the actual choice, actions, order, and result |
| Persistent update | Before/after artifact showing changed and preserved fields |
| Subjective quality | Examples and an anchored human rubric, not invented numerical precision |

## 2. Select cases and conditions

Use realistic inputs that distinguish correct from incorrect behavior. Include relevant boundaries such as missing values, empty or repeated output units, ambiguous routing, and unavailable prerequisites. Select from the skill's actual contract rather than requiring every category.

| Requested assessment | Conditions |
| --- | --- |
| Does this skill satisfy its contract? | The supplied skill with the selected cases |
| Did this revision change behavior? | Previous and candidate versions with the same cases |
| Does adding the skill help? | With and without the skill on the same cases |

For comparisons, hold the prompt, inputs, model, tools, and environment constant where possible. Record unavoidable differences. Use fresh contexts for independent runs. Set case count and repetitions according to the user's budget and the question. A single run is a smoke observation, not a reliability estimate.

## 3. Run and inspect

Execute only the selected conditions using the available test mechanism. Keep generated artifacts outside the skill package and ignore `.directory` metadata. Record the exact version assessed and retain the output or trace needed to support each verdict.

Inspect results rather than relying on the tested agent's self-report. For subjective comparisons, use blinded labels when feasible and request concrete reasons for the preference. Report unavailable execution as blocked, not simulated evidence.

## 4. Report the findings

Use this result shape, repeating one row per criterion and condition:

| Case / condition | Expected behavior | Observed behavior and evidence | Verdict |
| --- | --- | --- | --- |
| Actual case and version | Independent criterion | Artifact or trace location and relevant observation | pass, fail, or blocked |

State the cases and repetitions actually run. Report costs, timing, or usage only when measured. Identify both improvements and regressions when comparing versions. Do not generalize beyond the exercised cases.

End with findings and limitations. Evaluation does not edit the target, tune wording, launch more trials, or start a repair loop unless the user separately requests that work.
