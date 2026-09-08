# THROWAWAY — issue #8, native Pi interaction rework

The v1 debug console at `ff95905` was **rejected by the user**. Its transition checks did not establish a usable interface. This version replaces it, it does not polish that console. Issue #8 stays open pending human review.

## Question

How should each responsibility appear at the moment it matters: goal clarification, launch confirmation, settings, incompatible limits, missing choices, cancellation and drift? The prototype now uses separate native Pi dialogs with relevant information, not a shared state dump. This is an interaction/state workflow study using the logic branch of the prototype skill, adapted to the host's native TUI. No browser route or three browser layout variants are appropriate to this Pi-only request.

## Run

From the Arbor package on branch `prototype/issue-8-intake`:

```sh
npm run prototype:intake
```

This opens an ephemeral, offline Pi session and the scenario chooser automatically. Pi must already be installed and configured. It uses the current profile's provider configuration, not an invented model catalogue. It does not install anything or save Arbor settings. `--offline` prevents startup catalogue refresh. No research or model inference calls are made by the prototype.

For an existing interactive Pi launched with this extension, use:

```text
/arbor-intake-prototype start
/arbor-intake-prototype settings
/arbor-intake-prototype saved
/arbor-intake-prototype scenarios
```

The `start` command is a **ready-request example**, not an arbitrary goal parser. The scenario chooser is a prototype harness, not a proposed Arbor product screen. All scenarios use an explicitly authored duplicate-removal example. Provider/model names alone come from the live Pi context. Closing the process discards demo settings and saved snapshots. The model-unavailable scenario removes the active model from a temporary context only, it never changes Pi's own model or providers.

## Prior art inspected

All prior-art reads were pinned to `72f5b456853e815956223efddc69ce326fc320b6`, not installed or executed.

- **P1 — Prepare before running.** [autoresearch-create](https://github.com/monotykamary/pi-autoresearch-harness/blob/72f5b456853e815956223efddc69ce326fc320b6/skills/autoresearch-create/SKILL.md) separates asking/inference of goal, command, metric and constraints from the experiment loop. Here, clarification and measurement selection precede launch, they do not appear as permanent launch fields.
- **P2 — Compact by default.** [widget.ts](https://github.com/monotykamary/pi-autoresearch-harness/blob/72f5b456853e815956223efddc69ce326fc320b6/extensions/pi-autoresearch/src/ui/widget.ts) shows a compact summary, with expanded detail on demand. Here, launch contains goal, measurement name, bounded experiments/time and inherited model. Evaluation details and adjustments are optional actions.
- **P3 — Focused keyboard interaction.** [fullscreen.ts](https://github.com/monotykamary/pi-autoresearch-harness/blob/72f5b456853e815956223efddc69ce326fc320b6/extensions/pi-autoresearch/src/ui/fullscreen.ts) uses a bounded native view with explicit keyboard navigation and close. This prototype uses Pi's built-in select/input/editor/confirm controls, rather than a custom state-dump terminal.

Do not copy the prior art's forever-loop, mutable evaluation during research, compulsory file review, runtime or cleanup policy. Arbor retains bounded execution, measurement integrity, owning-Pi permissions and separate source apply. The prior-art bare-command documentation/implementation discrepancy is not copied.

## Separate proposed solutions

These proposals replace v1's UX claims. They are not yet user-approved.

- **D6 — Conversation before confirmation.** An unclear request gets a focused question and context-specific recommendation, followed by the consequential trade-off question. A ready request skips that conversation entirely. Launch shows a short summary, Start, Edit goal, Adjust limits, optional Evaluation details and Cancel. Free-text goal edits ask whether the measurement still applies instead of silently carrying it forward.
- **D7 — Settings owns model selection and inheritance.** The default is Same as Pi. An override is selected from Pi providers, then that provider's available models. `ctx.modelRegistry.getAvailable()` supplies availability and `ctx.scopedModels` narrows it when the session has a scope. No artificial paid/local model categories, provider registration, credential reads or `pi.setModel()` calls. Project settings are the default editing scope. Profile defaults are an explicit switch. Labels say set here, from profile defaults or default. Reset removes the override, not the inherited value. Save and Cancel operate on staged changes.
- **D8 — Exceptions and history have their own views.** Incompatible limits get a choice between a shorter evaluation and run-only adjustment. Missing evaluation gets a measurement conversation. Missing model routes to settings or back to Pi's model/login controls. Changed launch settings show the actual differences and require a new confirmation. Conflicting settings saves refuse overwrite. Saved runs display only their frozen configuration, separate from future defaults.

No artifact byte limit, raw layers, staged-object dump, catalogue object or unrelated next-question text appears in launch. Artifact admission is still a production concern, removing it from this presentation does not remove production enforcement.

### Ready request, as observed in native Pi

```text
Arbor · Ready to start
Prototype only — no research is executed

Speed up duplicate removal without changing results

Measure: Existing duplicate-removal benchmark
Up to 5 experiments · 2 min active time
Model: Same as Pi — openai-codex/gpt-6-astra

Research is isolated. Applying results to source is a separate decision.

> Start research
  Edit goal
  Adjust limits for this run
  Evaluation details
  Cancel request
```

The model above was observed in the probe's actual Pi session, not hardcoded. Another session displays its own model.

## Acceptance ledger

Direct dialog-handler walkthroughs used a simulated UI adapter with the owning-Pi model identity, followed by real Pi PTY rendering checks. No test suite is added to the throwaway branch. These are behavior and rendering checks, **not user acceptance**.

| Check | Interaction and observed result |
| --- | --- |
| V1 ready request | First dialog was launch, no clarification. Start saved one simulated run with the inherited model. |
| V2 unclear request | Goal question → trade-off question → launch. No goal question inside launch. |
| V3 incompatible limits | Dedicated blocker → run-only active-time adjustment → fresh launch. Project defaults unchanged. |
| V4 missing evaluation | Measurement recommendation → explicit evaluation choice → launch. No JSON/path editing. |
| V5 missing model | Dedicated blocker → settings → actual-provider-shaped picker → launch. No automatic replacement. Rechecked after provider-first grouping. |
| V6 inheritance/reset | Profile model override → project Same as Pi override → reset project model. Profile model became effective again. Rechecked after provider-first grouping. |
| V7 launch cancellation | Cancel returned without a saved run or execution. |
| V8 settings cancellation | Staged experiment limit was discarded, saved defaults stayed at 5. |
| V9 configuration drift | Changed experiments 5 → 6 after showing the summary. Difference view appeared, then a new summary and explicit Start were required. |
| V10 existing run | Saved run stayed at 5 experiments after editing future defaults to 9. |
| V11 unsupported clarification | Different goal remained in conversation, no manufactured evaluator or launch. |
| V12 unavailable provider | Guided return to Pi, no replacement or saved run. |
| V13 goal edit | Free-text revision + explicit measurement retention appeared in the new summary and saved snapshot. |
| V14 settings conflict | Concurrent saved default 6 survived an attempted Save of staged 9. Reopen showed latest values. |

Native PTY evidence: Pi v0.85.1, 120 columns × 38 rows, ephemeral session, offline, no model calls. Observed launch, simulated confirmation, saved configuration, project settings, provider selector and provider-specific model list. The real selector showed Same as Pi, google and openai-codex, then actual openai-codex models. Initial full-catalogue rendering was too long and was replaced by provider-first selection. An initial PTY probe waited for a notification that had already rendered and timed out, corrected by navigating directly from saved-run settings. The corrected native probe completed all six stages. A separate native startup probe verified that the scenario chooser opens automatically with `--arbor-intake-demo`. Native probes loaded only the prototype extension with the configured Pi provider catalogue, avoiding production Arbor startup. This is actual host rendering evidence, not a screenshot or full production QA.

Standalone strict TypeScript checking of both prototype modules passed against the installed Pi types. `git diff --check` passed. Native production Arbor tests were not run because production code is unchanged.

## Source boundaries

The original affected path is still `PiPresentation.intake` → `resolveSpec` → `ResearchService` confirmed-spec check, with `researchCommand`/`commandProgram` carrying the ordinary owning-Pi policy boundary. None is modified. This prototype adds only its explicitly named temporary command/flag. It neither replaces `/arbor` nor registers a research tool.

`model.ts` contains portable settings resolution, limit compatibility, snapshots and difference detection. `terminal.ts` contains separate workflow functions using native Pi dialogs. No prototype logic is promoted to production during this charting task.

## Still unresolved

- **R4 — Human review:** The interface has been reworked, not approved. Try the independent flows. Decide whether D6–D8 correctly separate the responsibilities before closing #8.
- **R5 — Real inference and evaluation:** Conversation recommendations, benchmark availability and runtime estimates are authored fixtures. The prototype does not discover files, create a benchmark, infer arbitrary goals or prove evaluation compatibility. Native selection of an available model does not prove it works in Arbor child execution.
- **R6 — Production integration:** Trust-aware project/profile persistence, native admission, exact full-spec/source identities and race guards, preset semantics, separate role/subject/judge bindings, advanced settings and small-terminal/model-search refinement remain production design/implementation work. No production fix or resolution of the parent QA defect is claimed.
