# THROWAWAY — issue #8 launch/settings prototype

## Question and verdict

Can a conversational goal draft, inherited settings, editable launch summary and immutable run snapshot form a coherent flow without manual JSON editing or mandatory file-scope review? This is a **logic/state model prototype**, not a visual Pi design or production implementation. It demonstrates the proposed transitions with a deterministic latency fixture. It does not establish that arbitrary goal inference is reliable or that humans find the flow intuitive. User approval is still required.

Issue: https://github.com/Balauruu/pi-fabric/issues/8
Charter: https://github.com/Balauruu/pi-fabric/issues/6#issuecomment-5588782475
Primary-source branch: `prototype/issue-8-intake`. Do not merge the prototype into production.

## Run

From this worktree's `pi-fabric-arbor` package directory:

```sh
npm run prototype:intake
```

Node >=24, matching the package runtime. No dependency installation needed. Enter one command per line. `q` quits. The terminal clears and redraws on each action. Use a wide terminal of roughly 180 columns by 40 rows for the fixture's state and frozen summary. Non-TTY input prints frames for inspection. No files, databases, paid models, permissions or actual research jobs are touched. Settings Save only updates memory. `scenario` intentionally resets the whole fixture. `new` preserves saved runs/settings but discards the closed launch's edits. The latest saved run is expanded, earlier runs retain a compact summary. Replay emits every complete saved snapshot.

`model.ts` exposes pure `initial`, `effective`, `summary`, `blockers`, and `step`. `terminal.ts` is the disposable shell. No production imports, registrations, or tests were added.

## Proposed decisions (not yet user-approved)

- **D1 — Block consequential unknowns.** Unclear measurable goal, missing/unavailable operational model, missing/incompatible evaluator, invalid limits and known goal/limit incompatibility prevent confirmation. Ask one focused question at a time, with a recommendation. Unknown answers remain unresolved instead of inventing an evaluator.
- **D2 — Infer only supported context.** A clear latency fixture supplies the existing evaluator, metric, correctness constraint and working scope. Reuse an already selected active Pi model, or an explicit model setting. Never silently choose a paid fallback. Actual evaluator subject/judge identities must come from frozen definitions. No file-scope approval checkpoint. Isolation, protected evaluation inputs and separate source-apply approval remain required.
- **D3 — Show bounded defaults, do not promise spending containment.** Mirror current defaults: 5 attempts, 20 evaluator calls, 120000 active ms, 16777216 artifact bytes. The broad fixture asks to narrow or explicitly raise attempts/time. It never expands limits automatically. Fixture thresholds (10 attempts, 10 minutes, 2 minimum calls) are illustrative, not production feasibility estimates. Real reservations must include checks, retries, held-out/final evaluations and judges. Cost remains observational.
- **D4 — Settings and launch edits have different lifetimes.** Project settings are the default editing scope, profile is explicit. Reset removes that layer's field to reveal inherited values, it does not copy a default. Precedence: built-in, preset, profile, project, new-run edit. Settings edits stage until Save, cancellation discards them. Existing run snapshots never change. Launch edits do not become settings.
- **D5 — Confirm an exact summary, then admit separately.** Review is not launch. Editing invalidates review. Configuration/evaluator/model availability drift forces a fresh review and confirmation. Settings Save refuses a concurrent change to its target layer. A repeated confirm cannot submit a second request. A simulated submission is not native start, permission approval or completion.

## Acceptance ledger and reproduction

All walkthroughs were executed through the same `step` dispatcher used by the terminal. The `--replay` mode is a direct behavioral probe, not a test suite. Example:

```sh
npm run --silent prototype:intake -- --replay 'scenario ready' review drift confirm review confirm
```

| Check | Commands (one per line or quoted replay args) | Observed result |
| --- | --- | --- |
| A1 unclear conversation | `scenario unclear`, `review`, `answer other`, `review`, `answer latency`, `review`, `confirm` | Unknown answer remained blocked. Focused recommendation repeated. Supported clarification enabled review and one simulated submission. |
| A2 ready request / editable summary | `scenario ready`, `confirm`, `set attempts 7`, `review`, `confirm`, `confirm` | No missing-choice prompts. Confirmation without review refused. Run-only value 7 frozen, settings unchanged, duplicate confirm did not add a run. |
| A3 incompatible limits | `scenario limits`, `review`, `narrow`, `set evaluatorCalls 1`, `review`, `set evaluatorCalls 20`, `review`, `confirm` | Broad goal and insufficient evaluator calls blocked separately. Narrowing left defaults bounded. |
| A4 missing choices | `scenario missing`, `review`, `set model paid/explicit`, `review`, `install-evaluator`, `review`, `confirm` | Model and evaluator blocked in sequence. Paid fixture model required explicit selection. Evaluator availability action is a fixture toggle, not an install. |
| A5 inheritance/reset/freeze | `scenario ready`, `settings profile`, `set attempts 9`, `save`, `settings`, `set attempts 3`, `save`, `settings`, `reset attempts`, `save`, `review`, `confirm`, `settings profile`, `set attempts 12`, `save` | Project 3 overrode profile 9. Reset restored profile 9 and its origin. Saving profile 12 left saved run at 9. |
| A6 cancellation | `scenario ready`, `set attempts 8`, `cancel`, `confirm`, `settings`, `set attempts 2`, `cancel` | No run created, no settings retained. Intake cancellation cannot cancel already submitted work. |
| A7 configuration drift | `scenario ready`, `review`, `drift`, `confirm`, `review`, `confirm`, `drift evaluator` | Stale confirm refused. Fresh confirm froze attempts 6. Later evaluator revision 2 left saved revision 1. |
| A8 settings drift | `scenario ready`, `settings`, `set attempts 8`, `drift`, `save`, `cancel` | Concurrent project value 6 survived. Save refused overwrite. |
| A9 capability/model drift | `scenario ready`, `review`, `drift model`, `confirm`, `review`, `set model local/approved`, `review`, `drift unavailable`, `confirm`, `review` | Stale confirmations refused, missing capability remained blocked without fallback. |
| A10 future run isolation | `scenario ready`, `set attempts 7`, `review`, `confirm`, `settings profile`, `set attempts 12`, `save`, `new`, `review`, `confirm` | Two frozen runs retained attempts 7 and 12 respectively. |
| A11 incompatible-goal alternatives | `scenario limits`, `narrow`, `review`, `scenario limits`, `set attempts 10`, `set activeMs 600000`, `review`, `confirm` | Narrowing and explicit increases both enabled review. Increasing attempts alone did not. Stale narrowing message found and corrected. |
| A12 invalid values | `scenario ready`, `settings`, `set attempts 0`, `save`, `cancel`, `set activeMs Infinity`, `review` | Invalid settings Save and unbounded launch value refused. |

Additional validation: standalone strict TypeScript check passed using the existing project's TypeScript and Node declarations. Initial invocation omitted explicit Node types and failed, corrected with `--types node`. Line-input shell probe reached submission, showed current attempts 6 beside frozen attempts 5 after drift, and exited on `q`. This is terminal output evidence, not live Pi UI/usability evidence. No native acceptance suites were run because production source was not changed. Those remain mandatory for eventual production implementation.

## Affected source traced at base 67bdd2d

Paths below are repository-relative identifiers for review on GitHub.

- **F1:** `pi-fabric-arbor/src/presentation/PiPresentation.ts:47-76` currently prompts for evaluator JSON paths and material paths, then renders a JSON confirmation. Raw start bypasses intake and passes to the JSON command parser.
- **F2:** `pi-fabric-arbor/src/research/commands.ts:10-13` parses start JSON. `commandProgram` composes start and separate research admission. This prototype does not change that boundary or resolve the parent ticket's reported QA failure.
- **F3:** `pi-fabric-arbor/src/research/spec.ts:36-66` supplies bounded defaults, field origins and built-in/preset/profile/project/explicit layering. Lines 77-85 resolve active model inheritance. Evaluation identities and role subjects are resolved from evaluation definitions later in the same function.
- **F4:** `pi-fabric-arbor/src/research/ResearchService.ts:246-247` already rejects changed `expectedSpecId` before capture. `pi-fabric-arbor/docs/research-configuration.md` documents saved spec/role resume, observational costs and separate owning-Pi policy.

## Still needed for resolution and production

- **R1 — Human decision:** Drive the prototype and approve or revise D1–D5, especially whether the recommendations and explicit incompatibility prompt feel right. Issue #8 remains open until approval. Record accepted decisions in the planning issue/parent map, not production code during charting.
- **R2 — Implementation-ready detail:** Real context/evaluator discovery and multi-turn clarification are mocked. The fixture uses one operational model for both coordinator/executor and one command evaluator. Separate operational role choices, evaluator subject/judge selection, preset-null semantics, trust-aware settings persistence, catalog-binding identity and exact Pi UI controls still need native design/integration. The prototype does not validate arbitrary evaluator or model compatibility.
- **R3 — Production acceptance:** Integrate the accepted flow with native owning-Pi admission, existing schema bounds, frozen spec/source identities and read-only browser consistency. Preserve explicit research execution, source isolation and permission policy. Run impacted native lanes and project-required acceptance before calling it production-ready. No automatic source apply, new modes or writable browser were introduced.
