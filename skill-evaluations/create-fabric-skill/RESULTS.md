# Create Fabric Skill: acceptance evidence

## Scope

The approved deliverable is an explicit-only Pi skill and one mechanism-selection reference. The creator interviews first, selects for quality and task fit, and returns a proposed design. A prompt alias was explicitly rejected. No change to another skill or profile configuration is part of this task.

## Acceptance ledger

| Criterion | Result | Evidence |
|---|---|---|
| Native explicit invocation; no model catalog entry | Pass | `check-loading.mjs` executes installed Pi `loadSkillsFromDir`, profile-default `loadSkills`, `formatSkillsForPrompt`, and native `AgentSession._expandSkillCommand`; one matching skill, no target diagnostics, complete body and arguments preserved |
| No prompt alias | Pass | Probe asserts `prompts/create-fabric-skill.md` absent and short command remains unexpanded |
| Full skill and supporting reference are readable | Pass | Standalone validator passes; loader resolves the one local reference; all three architecture-scenario traces contain exact skill and reference reads |
| Preference frontier before architecture | Pass after one correction | `candidate-interview-r2.json` asks numbered questions with recommendations and explicitly asks lifecycle instead of assuming finite execution from weekly cadence |
| Settled answers require brief confirmation | Pass | `candidate-confirmation-boundary.json` returns the requirements brief and asks for confirmation; it does not start architecture or implementation |
| Quality-led finite mechanism design | Pass | `candidate-confirmed.json` proposes independent roles/model perspectives plus a primary-source verifier, preserves disagreements, rejects unneeded recursion and persistence, and labels availability unprobed |
| Durable coordination retains requirements under missing prerequisites | Pass | `candidate-durable.json` proposes durable actors, mesh CAS, ownership, recovery and cleanup; Schema enforce blocks the branch without silently disabling it or falling back to session-bound work |
| Legacy source is adapted rather than obeyed | Pass | `candidate-source-conversion.json` preserves exact coverage, uses child-sized plain agents, rejects fixed-depth recursion and whole-tree retries, reserves verification capacity, and rejects source-requested installation |
| Proposal-only stop | Pass | All three complete architecture proposals have the eight required sections and explicit no-install/no-task-execution completion statement |
| Candidate probes did not perform effects | Pass | All six candidate trace summaries contain only `read`, `grep`, `find`, or `ls`; no write, shell, delegation, or actor call appears |
| Finished package contains only approved files | Pass | `final-checks.json` and loader probe enumerate `SKILL.md` plus `references/mechanism-selection.md` |

## RED observation and correction

The initial no-candidate baseline (`baseline-interview.json`, run `a5493dced51d4c938dd4e43967ae0c0e`) immediately authored `skills/architecture-review/SKILL.md` rather than conducting the intended interview. Its trace shows it loaded the general authoring skill despite the probe's no-guidance instruction and used nested delegation to write the file. This is an observed discipline failure, not a clean no-skill control or a quantitative comparison.

The generated file was attributable to that child, untracked, and archived as `baseline-artifact.md`. A byte comparison and untracked-file check preceded removal of only the identical baseline-created file and empty directory from skill discovery. The unrelated concurrent agent-benchmarking and fabric-research changes were left untouched.

Candidate probes used `extensions:false` and native read/grep/find/ls tools. This tighter environment prevents interpreting the baseline/candidate contrast as a controlled quality benchmark. Actual tool traces, not the allowlist alone, establish the observed no-effect behavior.

The first candidate interview inferred finite reviews from weekly cadence while still asking a retention question. One sentence was added to keep cadence, execution lifecycle, and retention distinct. The interview rerun passes; previously passing architecture probes were not rerun after this interview-only clarification. The confirmation-boundary scenario is an additional holdout.

## Limits and stop reason

These are single-run behavioral smoke scenarios, not statistical proof of optimal mechanisms or comprehensive testing of generated skills. Static checks exercise installed Pi loading and slash expansion without launching an interactive TUI. They do not claim that an already-running session has reloaded resources. Model-triggered positive/typo invocation is intentionally not tested as a success condition because this skill is explicit-only.

No generated workflow, migration, durable host lifecycle, Schema transaction, or paid model panel was executed. Those checks belong in each future proposed skill's validation plan. Existing primary documentation was used for contracts; live prerequisites remain conditional in proposals.

Stop reason: approved package is written, static/loading checks pass, five distinct behavior scenarios pass, and the observed interview inference was corrected. Final source hashes and commands are recorded in `final-checks.json`.
