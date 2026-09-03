# Build Plan

Task status markers are `[]` idle, `[wip]` in progress, `[x]` complete, and `[f]` failed.

Completion means every phase and global validation item has a resolved status, implementation checks have run, lifecycle metadata is appended, and the plan validates.

1. **Locate the plan** - Resolve the target `.html` file from `USER_PROMPT`. If no path is supplied, inspect `PLAN_OUTPUT_DIRECTORY`, infer the most likely candidate, and confirm before mutating code or the plan.
2. **Read implementation context** - Read the full existing plan and each back reference to depth 1.
3. **Pass the readiness gate** - Run `node "$VALIDATOR" "$PLAN_FILE"`. Stop before implementation if placeholders, unresolved visual slots, duplicate hooks, or structural errors remain. For a legacy plan, add only unambiguous missing phase/task/check hooks; do not rebuild it from the template.
4. **Execute phases in order** - Use `data-planf3-phase`, `data-planf3-task`, and `data-planf3-check` to locate state. For each phase:
   - Set the phase and current task `<code class="status">` to `[wip]` before work starts.
   - Implement each concrete checklist action and mark its status `[x]` when verified.
   - Run the phase's Testing Strategy checks and repair failures until they pass.
   - Mark an irrecoverable item `[f]` and record its blocker next to the item.
   - Mark the task and phase `[x]` only when all descendants pass; use `[f]` when any descendant remains failed.
   - Move to the next phase only after every current-phase marker is resolved as `[x]` or `[f]`.
5. **Run global validation** - Execute every `data-planf3-validation` command or manual check and update its marker. Repair failures where possible.
6. **Append lifecycle metadata** - Append the current ISO timestamp to `modified` and current agent/session values when available. Append commit SHAs only when commits actually exist; never create a commit merely to populate metadata.
7. **Validate the final plan** - Run `node "$VALIDATOR" --complete "$PLAN_FILE"` and resolve every structural or unfinished-status failure.
8. **Report** - Summarize work and checks per phase, list every final marker, and call out all `[f]` blockers.
