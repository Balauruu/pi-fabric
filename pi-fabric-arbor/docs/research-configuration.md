# Research configuration

Use [owning-Pi installation and commands](consumer-installation.md), the [closed public manifest](pr3-action-manifest.json) and [runnable packs](../examples/README.md) with this current configuration guide.

## Material configuration

Select exact file/directory prefixes, not globs, for `material.mutablePaths`, protected `material.evaluationInputs` and explicit `material.selectedUntracked`. Writable executor tools require explicit configuration. Subject/judge models and fixed tasks belong to the evaluator definition, separately from operational roles.

```text
/arbor start {"runId":"owned-material","overrides":{"execution":"material","material":{"mutablePaths":["prompt.md"],"evaluationInputs":["checks"],"selectedUntracked":[]},"roleTools":{"executor":["read","write","edit","bash"]},"evaluator":{"kind":"agent-suite","definition":"/absolute/evaluation.json"}}}
```

For material/research capture definitions, use the canonical source root and `oid: "capture"` in both material refs. Start replaces those placeholders with the full captured tree and saves the resolved definition. Material mode admits explicit owner-selected candidates; research delegates selection to the persistent proposal actor.

Git capture uses current indexed working bytes without changing source index/refs. Explicitly select wanted untracked files; ignored selections refuse. A staged deletion left on disk is untracked unless selected. Non-Git material gets an external owned repository without initializing source Git. Modes, symlinks, binary bytes, stash/custom refs and sibling worktrees are preserved. Unsupported merge/submodule/sparse/special-file cases refuse. Capture is limited to 4096 files / 16 MiB with UTF-8 filenames.

Only settled native writers may freeze/restore. Evaluation uses distinct immutable snapshots and protected inputs. Keep requires valid exact attempt-linked evidence against the current incumbent, strictly positive BigInt gain and the saved threshold. Relative gain uses incumbent magnitude; zero denominators need absolute policy. Ties and inconclusive noise cannot win. Changed integration material is reevaluated before exact Git CAS/database reconciliation.

Research never automatically writes source. Apply/undo requires ordinary write policy and a separate source dialog. Exports describe captured baseline to incumbent, excluding preexisting user dirt. Unknown native handles/writers retain artifacts. Trusted worktrees are not containment.

## Research controls and budgets

Select `execution: "research"` with the material/evaluator choices above. Bare `/arbor start` gives confirmed intake; explicit JSON preserves configured defaults. Roles inherit the actual active Pi model unless configured. Native child models must work without extension-only providers.

Start composes ordinary agent-risk `arbor.start` and execute-risk `arbor.runResearch`. Resume records a bound agent-risk control intent and separately admits its single-consumption execute claim. Direct start only freezes configuration. Separate user resumes need distinct IDs; quiescent exact closed-request replay returns its prior receipt without another execution claim.

Use `/arbor pause`, `/arbor steer INSTRUCTION`, `/arbor cancel`, `/arbor review` and `/arbor resume`, optionally with `--run RUN`, in the owning Pi. Auto progresses without research dialogs; Direction gates expansion; Review gates promotion; Collaborative uses reviewed direction and explicit continuation. Dismissal/timeout never approves. `continue-partial` and `restart-parent` are newly charged invocations; resume separately for continued research. Unknown handles never cause redispatch.

The actor chooses policy. The owner validates bindings/budgets and handles dispatch/waits, freeze/evaluation, decisions and lessons. Main does not choose the next hypothesis. Worker reports/diagnostics are not scores; worker-scored feedback is not exposed.

`search.concurrency` is 1 or 2, while measurement concurrency remains 1. `search.maxActorTurns` bounds each episode, not total progress. Defaults include `maxDepth:3`, `maxChildren:3`, `exploreEvery:3`, `stopAfterNoGain:5`, `shiftAfterNoGain:3`, `stopAfterFailures:2`. Valid no-gain and failed checks differ; measured keeps reset no-gain. Reserve whole-wave attempts/evaluator credits atomically against one incumbent; do not borrow sibling credits.

`limits.attempts`, `limits.evaluatorCalls`, `limits.activeMs` and `limits.artifactBytes` are checked before effects, including after baseline and awaited descriptors. Evaluator usage includes checks, retries, rechecks, held-out/final and judges. Active time excludes pauses. Artifacts include owned files, retained evidence and derived exports. Writers may overshoot between admission boundaries; token/cost usage is observational, not monetary/descendant containment.

Operational bundles are frozen outside candidates. Resume uses saved roles/spec, not changed defaults. At quiescent pause, `/arbor revise-roles` records a new attributable package-resolved binding without rewriting past evidence. Missing roles or unresolved cleanup block.

## Grounding configuration and schemas

Grounding is optional for research and defaults off:

```json
{"grounding":{"mode":"required","catalog":"public","query":"parser cache","maxSources":3,"model":null}}
```

`mode` is `off`, `optional` or `required`; `maxSources` is 1–4. Null model inherits the active Pi model. Before definition registration, configure at most four pairs in the active profile's `arbor.sources.json`. Replace both template placeholders with exact 64-lowercase-hex hashes from `tools.catalog`, after inspecting public descriptors with `tools.describe`:

```json
[{"id":"public","search":{"ref":"public.search","descriptorHash":"<exact search descriptorHash>"},"fetch":{"ref":"public.fetch","descriptorHash":"<exact fetch descriptorHash>"}}]
```

The exact closed schemas are exported in [GroundingContracts.ts](../src/research/GroundingContracts.ts). Additional properties are rejected:

| Operation | Input | Output |
| --- | --- | --- |
| Search | `query`: nonempty string up to 512; `limit`: integer 1–4 | `results`: up to four entries with `url` (1–4096), `title` (1–512), `snippet` (0–2048) |
| Fetch | `url`: nonempty string up to 4096; `maxChars`: integer 1–16384 | `url` (1–4096), `title` (1–512), `text` (1–16384) |

Providers require read/network risk and none/commutative effects. Calls use the captured owner seam and finite declared requirements. No arbitrary transport, credentials or fallback networking is added. Missing capability blocks required grounding before baseline; optional grounding records unavailability without disabling unrelated research.

The owner reserves a bounded batch, retains fetched text/provenance and uses one native literature child with immutable roles, exact model, `read` only and a closed result. Verbatim passages must match visited artifacts. Snippets/free-form refs are not inspected facts. Grounded hypotheses use exact source/run/revision/digest refs; claims are hypotheses, not grades or novelty endorsements.

Completed grounding is immutable and reused without dispatch. Interrupted batches retain artifacts without automatic retry. Catalog changes need quiescent full Pi `/reload` and a new run; component reload alone never rereads files or widens saved bindings.

## Evaluator definitions and presets

`execution: "evaluate"` selects a frozen committed pair, rather than dirty capture. The [deterministic agent example](../examples/pr4-agent-improvement/README.md) supplies fixed material/tasks. Definition/provider schemas are in the [manifest](pr3-action-manifest.json). Roots/OIDs, selected files/modes, subject prompts/model/tools, tasks/checks, repeats/retries, deadlines and analysis are identity-bound.

Commands emit exactly one `ARBOR_METRIC DECIMAL UNIT` line. Failed exit/check, timeout, ambiguous output or invalid evidence cannot score. Agent-suite summaries are paired descriptive evidence, not statistical superiority. Known completions can be re-observed idempotently; unknown identities block. Judges do not choose research policy.

Presets are closed data, not operational bootstrap plugins. Precedence is built-ins, preset, profile, project, explicit overrides. Explicit/project `preset:null` disables inheritance without reading the old file. See [pack preparation](../examples/README.md).

Optional evaluators use at most eight `{ref,descriptorHash}` entries in profile `arbor.evaluators.json`, read before registration. Inspect descriptors against exported provider schemas and obtain exact catalog hashes. Missing optional selections do not disable built-ins. Settle affected runs before catalog maintenance/full Pi `/reload`; never silently rebind saved measurements. Mutation, review and source approval remain separate owning-Pi operations.
