# THROWAWAY: issue #7 dashboard design

Status: user selected O1 (tabbed run dashboard) in the live discussion.
O1 prioritizes a quick progress scan, with detailed investigation on separate
pages. This is the design rationale, not an additional claimed user statement.
The common widget, lifecycle, navigation and status sections accompany O1.
No production edits, UI execution or native QA are claimed. Fictional data throughout.
Question: which information hierarchy makes autonomous research understandable
at 80x24 and 40x20 terminal sizes, without turning chat into a progress log?

Read the prototype with one command from the repository root:

```sh
cat pi-fabric-arbor/src/presentation/dashboard.prototype.md
```

This adapts the prototype skill's UI branch to the issue's expressly permitted
textual prototype and the user's no-browser/design-then-wait requirement.
A, B, C are structurally different views of the same fixture, not live commands.
No persistence, dependencies, runtime connections, or mutation controls exist.

## Acceptance ledger

- A1: Three hierarchies compared at normal and narrow widths. User selected O1.
- A2: Compact widget, expanded recent experiments, dashboard pages, explicit run
  switcher, keyboard navigation and completion are specified below.
- A3: Empty, running, blocked, stopping and safely finished states are shown.
  Pausing, paused, finalizing and no-improvement outcomes preserve #9 too.
- A4: Dashboard blocker summary and explanatory chat have distinct jobs.
- A5: Review/apply are end-only. Evidence acceptance never bypasses settlement,
  permission or source-conflict checks. Selection cannot silently retarget.
- A6: `/arbor status` diagnoses availability. Dashboard explains research.
- A7: Approval precedes final design delivery and issue closure. Prototype goes
  to a throwaway branch outside main, with exact commit and verification pointer.

## Source basis and scope

Canonical issue: https://github.com/Balauruu/pi-fabric/issues/7 (no discussion at inspection).
Map and charter: https://github.com/Balauruu/pi-fabric/issues/6
Authoritative lifecycle: https://github.com/Balauruu/pi-fabric/issues/9#issuecomment-5589408068
Issue #7 is assigned to Balauruu and has no native blockers at inspection.

Pinned inspiration, inspected via GitHub API, never installed or executed:
https://github.com/monotykamary/pi-autoresearch-harness/tree/72f5b456853e815956223efddc69ce326fc320b6

- `extensions/pi-autoresearch/src/ui/widget.ts`: compact metric summary, expandable
  recent table, visible expansion/fullscreen hints and width-aware rendering.
- `extensions/pi-autoresearch/src/dashboard/table.ts`: baseline/best comparison,
  measured experiment outcomes and bounded rows. Borrow density, not selection policy.
- `extensions/pi-autoresearch/src/command.ts`: bare command prints CLI usage.
  Do not copy that inconsistency. Arbor's bare command opens the dashboard.

Current local path traced, not accepted future behavior:
- `src/extension.ts:40-78`: bare command routes to dashboard. No completion
  registration here. Diagnostic subcommands still exist, status is not present.
- `src/presentation/PiPresentation.ts:73-148`: selection is session-local by
  store directory. Dashboard opens a run picker, show sets a three-line widget
  then opens evidence selection. Evidence is exposed through read-only editors.
  There is no live paged dashboard or compact/expanded interaction here.
- Existing native Fabric topology/log links should be reused, not reimplemented.

Production command removal, settings/intake, lifecycle and recovery mechanisms
belong to the other map tickets. This ticket chooses their presentation only.
Keyboard bindings below are local interaction proposals, not verified Pi API or
available global shortcuts. No new web route or writable browser is proposed.

## Shared fixture and widget

Run `parser` is selected. Latency minimizes from 120 to 108 ms: research-measured
improvement 10%. Experiment 7 is running, 6 are complete, 7/20 research attempts
are committed including the active reservation. Final evaluation has separate
reserved capacity inside the approved limits. Costs, if shown, are observational.

Normal compact widget (80 columns):
```text
Arbor parser | Running: experiment 7 | best 108 ms (-10%)
Attempts 7/20 committed | Needs you: none | Expand | Dashboard
```

Narrow compact widget (40 columns):
```text
Arbor parser | Running: experiment 7
Best 108 ms (-10%) | attempts 7/20
Needs you: none | Expand | Dashboard
```

Expansion adds three recent experiments, never the whole dashboard:
```text
Recent experiments
7  running       awaiting measurement
6  improved      108 ms
5  no improvement 115 ms
Collapse | Dashboard
```

Unknown measurements say `not measured`, never 0% improvement. A secondary metric
is detail, not a replacement for the primary objective. The compact widget keeps
run identity, activity, measured best, limit usage and blocker/decision visible.
Closing/collapsing any view never pauses work. No routine progress enters chat.

## O1: Tabbed run dashboard (selected)

Metric and current activity lead. Dedicated pages keep dense evidence separate.
Prior-art compact/expanded progression is the strongest influence here.

Normal (80 columns):
```text
ARBOR  parser v18                             [Switch run]
[Overview]  Experiments  Evidence  Activity
Running: experiment 7                       [Run actions]
Best 108 ms (-10% vs start 120 ms) | minimize latency
Attempts 7/20 committed | 1 active | final capacity reserved
Needs you: none

Recent   Outcome          Measurement
7        running          awaiting measurement
6        improved         108 ms
5        no improvement   115 ms

Tab focus | arrows navigate | Enter open | Esc back
```

Narrow (40 columns):
```text
ARBOR parser v18          [Switch run]
Page: Overview                 [Change]
Running: experiment 7
Best 108 ms (-10% vs 120 ms)
Attempts 7/20 committed | 1 active
Final capacity reserved
Needs you: none
7 running       not measured
6 improved      108 ms
5 no improvement 115 ms
[Run actions]
Tab focus | Enter open | Esc back
```

Pages: Overview (activity, limits, blocker), Experiments (outcomes and measured
comparisons), Evidence (measurement provenance, checks, limitations), Activity
(bounded event history and links to native Fabric logs/topology). Final review
is an additional page only after Finished. During research, Evidence is read-only
measurement inspection, not an early source-apply review.

Tradeoff: quickest progress scan, but detailed investigation crosses pages.

## O2: Run inbox and detail pane

Multiple runs lead. Selection and attention across runs dominate the layout.

Normal (80 columns):
```text
ARBOR RUNS                | parser v18 / Overview
> parser    Running      | Experiment 7 running
  report    Blocked (!)  | Best 108 ms (-10% vs 120 ms)
  index     Finished     | Attempts 7/20 | 1 active
                         | Needs you: none
                         | [Experiments] [Evidence] [Activity]
                         | [Run actions]
Up/down browse | Enter select | Tab pane | Esc back
```

Narrow (40 columns):
```text
ARBOR RUNS
> parser     Running      selected
  report     Blocked      needs you
  index      Finished     +4% measured
Enter selects and opens run details

After Enter:
parser v18 / Overview        [All runs]
Experiment 7 running
Best 108 ms (-10% vs 120 ms)
Attempts 7/20 | 1 active
Needs you: none
[Pages] [Run actions]
```

The narrow design uses separate list/detail screens, not two cramped panes.
Detail pages match O1. Browsing a row does not select it. Enter changes the shared
selection. A blocked run is labelled, never automatically promoted to selected.

Tradeoff: clearest multi-run awareness, less room per experiment at normal width.

## O3: Activity-first dashboard

A chronological record leads, with a persistent factual summary and drill-down.
This is a dashboard event stream, not explanatory chat or a raw debug console.

Normal (80 columns):
```text
ARBOR parser v18 [Switch run]     Running | best 108 ms (-10%)
Attempts 7/20 | 1 active                         Needs you: none
View: [Activity] [Experiments] [Evidence]        [Run actions]

12:04  Experiment 7 started; measurement pending
12:03  Experiment 6 improved latency to 108 ms       [Evidence]
12:01  Experiment 5 did not improve                 [Evidence]
11:58  Research started; source unchanged

Up/down event | Enter details | Tab focus | Esc back
```

Narrow (40 columns):
```text
ARBOR parser v18          [Switch run]
Running | best 108 ms (-10%)
Attempts 7/20 | 1 active
Needs you: none
View: Activity                [Change]
12:04 Experiment 7 started
      measurement pending
12:03 Experiment 6 improved
      latency 108 ms [Evidence]
[Run actions]
```

Live events do not steal focus or scroll position. Show `3 new events` while
reading older entries, with an explicit return-to-latest control. Overview facts
stay in the header, not a separate page. Other pages and final review match O1.

Tradeoff: strongest explanation of recent progress, noisier than O1 for a quick scan.

## Common state walkthrough (40-column panels)

Replace the activity/blocker portion of any variant with these fixtures.
These are separate screens, not one tall terminal rendering.

Empty:
```text
ARBOR | No runs
Start research on this project.
[Start research] [Settings] [Status]
```
Start opens the existing planned intake journey, not an immediate mutation.

Blocked:
```text
parser | Blocked
Settlement unknown: experiment 7
Best 108 ms (-10%) | attempts 7/20
Needs you: inspect recovery
[Recovery details] [Activity]
```
Dashboard keeps the blocker, affected work and recovery entry. No Apply, final
review, or blind Retry. Example chat, emitted once for the blocker event:
“parser cannot continue because experiment 7's settlement is unknown. Your source
is unchanged. Open Recovery details to inspect the recorded operation. Do not
restart uncertain work.” A notification dismissal changes no blocker state.
Recovery details expose only supported actions and expandable technical evidence.

Stopping (explicit stop acknowledged, not completed):
```text
parser | Stopping
Interrupt requested: experiment 7
Waiting for confirmed settlement
Best 108 ms (-10%) | attempts 7/20
No new experiments or final checks
[Activity]
```
If settlement becomes unknown, switch to Blocked, never Finished. Intermediate
work cannot become a result merely because Stop was requested.

Pausing / Paused / Finalizing:
```text
parser | Pausing
No new work; 1 experiment settling
```
```text
parser | Paused
Work settled; research can resume
[Resume] [Steer] [Stop research]
```
```text
parser | Finalizing
Independent final evaluation running
Reserved capacity within run limits
[Activity] [Stop research]
```
None offers final review or Apply. Natural/budget completion lets admitted work
settle and uses reserved final capacity when configured. Explicit Stop starts no
new evaluation work. No view presents observed spending as a hard spending cap.

Safely finished with an improvement:
```text
parser | Finished: stopped
All work settled | source unchanged
Research: 120 -> 108 ms (-10%)
Final evaluation unavailable
[Review changes] [Keep for later]
```
Completion chat announces the outcome and review entry, not a repeated log.
Review opens the exact result diff, research evidence versus the starting point,
independent final comparison when available, and limitations/check failures.
If final evidence conflicts or is missing, show those facts and require explicit
acceptance. The actual evaluation outcome stays unchanged.

```text
Final review: parser / result c6
Research: 10% lower latency
Final evaluation unavailable
[ ] Accept unavailable final evidence
[Apply to source: needs acceptance]
[Keep for later]
```
After acceptance, Apply opens separate exact-run/result source approval through
ordinary owning-Pi policy. No automatic apply. Source conflicts preserve newer
edits. Only a confirmed source receipt says Applied and offers guarded Undo.
Queued or submitted apply says Pending, not Applied. Finished runs never Resume.

Safely finished without improvement:
```text
parser | Finished: limit reached
All work settled | source unchanged
No research-measured improvement
[Review outcome] [New research]
```
No Apply appears. Review outcome still exposes evidence and limitations. New
research requires a fresh launch with fresh limits, not resumption of this run.

## Selection, navigation and completion

Shared run switcher rows show identity, activity/state, best measured improvement
and blocker. Mark the selected run explicitly. Long goals wrap in detail rather
than displacing the identity. Unavailable/disappeared selection requires a fresh
selection, never fallback to another run.

Run actions expose Pause, Steer and Stop while Running. Stop is a distinct
explicit control, not a synonym for Pause. Opening an action captures run and
result/revision. Switching runs or invalidating the target cancels the pending
action and asks for fresh review. Inspecting a different run never retargets it.

All variants: Tab/Shift+Tab move between named controls. Arrows move within the
focused list/tab group. Enter activates that control. Esc returns one level,
then closes the dashboard without affecting research. Use a visible page picker
at narrow width instead of truncating tabs. Scroll within long lists/details.
Focused rows stay stable under live updates. Do not consume editing keys in text
inputs. Destructive/source actions have no single-letter immediate shortcut.
Expansion remains reachable through named controls. Global bindings require a
later native-Pi conflict check, not blind copying of prior-art Ctrl+X bindings.

Proposed completion examples, editor interactions only:
- `/arbor ` lists `start`, `settings`, `status`, plus appropriate run controls
  and inspection entries. Bare `/arbor` opens the dashboard.
- `/arbor st` filters to `start`, `status`, `stop` with descriptions.
- Tab accepts a suggestion, not an action. Enter submits only the completed
  command. Enter on bare `/arbor` does not launch research.
- Run-targeted commands expose exact run labels/IDs during target selection.
  No selected run means choose explicitly. A stale target is refused.
- `review` and `apply` suggestions appear only for Finished, with Apply absent
  without measured improvement. Typed ineligible actions explain the boundary.
- No availability/assets/doctor/setup or supervision-mode suggestions. Exact
  command inventory and removals remain coordinated with #10/#12, not shipped here.

## Status is not the dashboard

`/arbor status` is read-only readiness/diagnostics, available with no runs:
```text
Arbor status / this project
Extension: loaded
Fabric owner: unavailable
Research start: unavailable
Reason: required capability unavailable
[Guided remediation] [Technical details]
Selected run: parser [Open dashboard]
```
Report observed/configured/available distinctly and show unknown when unverified.
Status explains installation, owning-Pi capability/policy readiness and guided
next steps, not experiment tables or a second research dashboard. Missing
capabilities never silently enable agents, permissions or a paid model. The
selected-run link is context, not authority to mutate. Dashboard remains readable
when research cannot start, showing saved facts with stale/unavailable freshness.

## Approval and delivery boundary

The user selected O1: "I choose O1". O2 and O3 remain archived alternatives.
Selection validates the hierarchy, not native rendering or behavior.
Human walkthrough questions retained for implementation QA:
Can you identify the selected run, best measured improvement and blocker without
opening details? Is Stopping unmistakably unfinished? Is final review clearly
separate from evidence inspection? Is the narrow layout sufficient?

After approval: capture the textual prototype on a throwaway branch, record the
chosen hierarchy and why in #7, verify the delivered artifact and exact remote
commit, and link verification in a concise issue comment. Add the named context
pointer to #6. Close #7 exactly once only with explicit user closure approval.
Do not use automatic closing keywords before that approval. The map explicitly
excludes production implementation during charting. Native integration and full
repository implementation gates apply when that later work is authorized, not
as invented QA for a static design.
