---
name: fabric-arbor
description: Run bounded Arbor research on code, agent instructions, workflows or recipes. Use for research setup and evaluation choices, starting or resuming experiments, inspecting evidence and uncertainty, reviewing candidates, reusing lessons, or explicit export and source apply/undo.
---

# Fabric Arbor

Help the user configure and interpret bounded research. The managed owner executes operations and the persistent coordinator chooses hypotheses. This public guide does not make Main the research driver.

## Inputs and authority

Use the current trusted Pi project and material unless the user selects another root. Resolve existing profile/project/preset configuration before asking questions. Only missing consequential choices need intake: objective, mutable scope, evaluator/checks, exact models and limits. The saved specification owns units, direction, practical gain, repeats, split policy and budgets. Resume uses that saved specification, not changed defaults.

Commands select current runs, candidates and pending choices in Pi. Use `--run RUN` to disambiguate an explicit run from a steering instruction, lesson query or export format. Unknown explicit runs block without selecting another run. Do not ask the user to copy material/revision/native/protocol IDs. When using provider actions programmatically, read the effective schema first and preserve exact returned bindings. Read [actions](references/actions.md) before an operation.

Only the owning Pi may start, control, review, generate exports or apply/undo source changes. Start/resume may return current saved facts while the managed owner continues accepted research. This is not a completion or durable queue receipt. Use the normal pause/steer/cancel commands during active research and inspect saved settlement before reporting completion. CLI and browser read existing facts only, without attachment. An action submission or queued acknowledgment is not completion. Report the actual receipt and observed settlement. Schema/permission denial is a blocker, never permission to call services or edit storage directly.

## Choose the route

| User intent | Procedure |
| --- | --- |
| Install, unavailable capability or update | Use `/arbor doctor`. If authorized, `/arbor setup`, then `/reload`. Recheck doctor. Distinguish installed, configured, enabled, available and tested. Do not change host policy to hide a blocker. |
| Start research | Use `/arbor start` for intake. Verify current material, objective, development evaluator, optional held-out checks, model roles, preset and limits on the launch confirmation. Explicit selected untracked files are required for non-Git material. One start runs baseline and bounded candidate search. |
| Prepare an example | Follow the packaged [examples guide](../../examples/README.md). Owning-Pi scaffold creates a new unvalidated directory. Preparation is not a successful baseline. No automatic dataset, service or paid model acquisition. |
| Inspect or compare | `/arbor show` reaches a candidate diff/evidence/native log reference in one selection. Read [evidence interpretation](references/evidence-interpretation.md) before interpreting results. `/arbor browser` starts a session-owned read-only view. Fabric's `/fabric` topology and `/fabric log` own native execution inspection. |
| Pause, steer, cancel or resume | Use `/arbor pause`, `/arbor steer`, `/arbor cancel` or `/arbor resume`. Pause stops new dispatch at admitted boundaries. Cancel is complete only when owned work settles. `cleanup_pending` or `interrupted` retains uncertainty and artifacts. Unknown handles never justify redispatch. |
| Review, keep or discard | `/arbor review` selects the pending choice and requires the actual owning-Pi response. Timeout/dismissal never approves. `/arbor keep` and `/arbor discard` select candidates. Keep updates the owned incumbent only, under exact evidence/check/current-incumbent rules. Approval is not a grade or a Fabric permission. |
| Continue partial work | Select `/arbor continue-partial` or `/arbor restart-parent`, with an explicit same-hypothesis summary. These are distinct, newly charged invocations. Never replay uncertain work or silently change the hypothesis. |
| Reuse experience | `/arbor lessons` retrieves same-project v2 findings with source/evidence and applicability. Negative findings remain visible. Recalled claims are hypotheses to retest, not current grades. |
| Save or apply | `/arbor export` generates JSON. `/arbor export report` or `/arbor export trajectory` generates Markdown. Retrieve existing exports from browser/CLI without regeneration. `/arbor apply` is separate explicit source approval. `/arbor undo-apply` requires exact unchanged postimages. Newer edits or mixed outcomes block, preserving the patch. |

## Completion and interpretation

An invalid baseline blocks scored search. Failed checks, native failure, ties and inconclusive evidence cannot become measured wins. Show captured baseline and current owned incumbent separately. Development-only evidence is not transfer; repeated held-out use is adaptive reuse. Descriptive summaries are not statistical superiority. Time/artifact limits are admission bounds; unknown token/cost totals are observational, not hard caps. Trusted worktrees are not containment.

Do not sequence propose/dispatch/collect/evaluate as a replacement coordinator. If research stops, state its recorded reason and the next permitted owning-Pi action. Do not invent progress or invoke a fallback runtime.

Use this concise response shape, with one evidence line per relevant outcome:

```text
State: <run/revision, observed state and stop reason>
Evidence: <exact candidate/measurement/decision, checks and uncertainty>
Next: <permitted action, or no action required>
```

When a requested result is unavailable, name the missing evidence and do not call the task complete.

## Internal assets

The owner explicitly loads and snapshots [coordinator](roles/coordinator.md), [executor](roles/executor.md), and optional [literature](roles/literature.md) procedures. They are not separately registered skills. [Research strategy](references/research-strategy.md) and [evidence interpretation](references/evidence-interpretation.md) load at governed phases. Candidate skills cannot replace these operational roles. Resume retains the recorded bundle; `/arbor revise-roles` explicitly changes it at quiescence without rewriting prior attribution.

[Role maintenance](../../docs/role-maintenance.md) records all eleven upstream dispositions. Do not copy upstream coordination, fallback storage or benchmark-skill runtimes.
