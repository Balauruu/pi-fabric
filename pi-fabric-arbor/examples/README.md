# Runnable Arbor example packs

These are source-installed packs, not fixture drivers. `examples/manifest.json` is the public inventory; `presetSchema()`, `packManifestSchema()`, `readPackManifest()` and `SCAFFOLD_SCHEMA` are public package exports. The actual owner/coordinator/evaluator executes every pack. Local deterministic test inference is confined to native provider outputs and is not shipped as a runtime.

| Pack | Mutable material | Independent measurement | Validation limits |
| --- | --- | --- | --- |
| `code` | `unique.cjs` | `bench.cjs` checks first-seen deduplication order and counts input reads | Three trials, median, 1% relative gain, ties never win. Deterministic work proxy, not wall-clock speed or a significance test. |
| `agent` | `prompt.md` | Fixed signed-integer tasks, native subject runs and exact independent label grading | One repeat per paired task. Descriptive task summaries, failure-inclusive quality veto, observational native usage/latency. Optional disjoint held-out split. |
| `recipe` | `recipe.json` | Fixed local synthetic `samples.json` and `evaluate.cjs` accuracy | Non-Git selected files, recipe/data/evaluator separation. Development-only, no transfer claim. |

## Prepare in the owning Pi

Install Arbor and Fabric, trust your project, enable native agents, run `/arbor setup`, `/reload`, then `/arbor doctor` as described in [installation](../docs/consumer-installation.md). Node 24+ and Git on PATH are required; command examples use Node built-ins only. Choose exact available coordinator/executor model identities and a separately declared subject identity. The subject runs through native Pi/Fabric, not the coordinator. Command packs retain the subject field for the shared definition contract but launch no subject inference.

Use an **absolute new destination whose parent exists and is canonical** and your actual Node executable/model identities. This is an owning-Pi command, never a shell/CLI command:

```text
/arbor scaffold {"pack":"code","destination":"/absolute/new/code-pack","environment":{"node":"/absolute/bin/node","coordinatorModel":"provider/model","executorModel":"provider/model","subjectModel":"provider/model"},"heldOut":false}
```

Select `agent` or `recipe` for the other packs. Only `agent` supports `heldOut:true`. Preparation requires ordinary Fabric **write** permission, captures the intrinsic Pi owner, writes only a new directory, and launches no inference, subprocess, install, download or service. Existing files/directories/symlinks conflict, never merge or overwrite. A failed write retains its partial directory for inspection; select a new destination rather than overriding it.

The result contains `status:"unvalidated"`, a digest and a closed `start` request. Read `preparation.json`, `preset.json`, `evaluation.json` and `start.json`. Pass the exact `start.json` object as the argument to `/arbor start` in the **same owning Pi project**, using a fresh run ID if needed. The normal command composes `arbor.start` with execute-risk `arbor.runResearch`; do not substitute direct services or a helper CLI. Programmatic owner use may call those exact public actions in that order using the returned run binding, under normal permissions. `/arbor show RUN` reports the baseline, native validity, candidate measurements and measured keep. No automatic source apply occurs. Source material bytes remain unchanged; kept material is in Arbor's separate owned repository.

Generated scaffolds remain labeled **unvalidated preparation**. Actual run records, not that label or a successful command launch, prove baseline native completion, validity and required checks. A measured keep is distinct from native completion, research quality or generalization. Failed/invalid baselines block candidate research. Never report optional upstream templates as validated from preparation alone.

## Configuration and research choices

Precedence: built-in < selected preset < profile `arbor.defaults.json` < project `arbor.config.json` < explicit start overrides. Generated start fields are explicit local paths, environment role choices, capture selections and protected inputs, not blanket overrides of objective/search defaults. `limitDefaults` supplies400 evaluator calls and600000ms active admission below profile/project/explicit limits, never overriding configured budgets. Adjust limits and objectives deliberately; inspect saved per-field origins. Explicit/project `preset:null` disables inheritance without reading shadowed presets. Frozen definitions own subject model/task IDs/repeats/graders; mismatched explicit aggregation or repeats reject. Presets allow up to29 source references, reserving three provenance entries within the32-entry resolved bound. Preset content digests/source references are saved in the resolved spec, and resume never rereads changed preset files.

Research presets select **optional** grounding with no configured source catalog by default. This records unavailable literature without blocking local work. To use sources, configure a finite public search/fetch pair before registration and set `grounding.catalog`, `query`, `mode` and model in normal profile/project/explicit configuration. Select `mode:"off"` to disable or `"required"` to block without capabilities. See [grounding contracts](../README.md#pr10-grounding-lessons-and-trajectories). Sources inform hypotheses, never grades. No source/data acquisition is automatic during scaffolding.

The agent pack's `heldOut:true` writes a selected policy with two disjoint positive/negative tasks (zero classification is development-only), five adaptive uses and non-regression criterion. Set `evaluator.heldOut:null` to disable; held-out data stays out of ordinary ideation. This is capped adaptive reuse, not an untouched final generalization claim. Other packs have no bundled held-out split and reject that selection rather than inventing one. No unsupported seed is declared, and the agent preset does not inherit three whole-suite repeats.

## Optional upstream command template adapter

`pack:"upstream-command"` is Arbor's small maintained **local preparation-input adapter**, not an upstream runtime. It accepts files you have already prepared in a declared environment through the benchmark's documented public preparation interface. It never clones/copies the upstream coordinator/tree, downloads data, invokes upstream internals or installs dependencies. Pin the upstream source revision and supply the exact local prepared file list; preparation retains each copied byte digest and executable flag, command/check argv, source URL/revision and environment. The revision is user-declared provenance, not verified remote authenticity.

Use the same scaffold request with `heldOut:false` and an additional `prepared` object:

```json
{"root":"/absolute/already-prepared-inputs","files":["benchmark.cjs"],"argv":["/absolute/bin/node","benchmark.cjs"],"checks":[["/absolute/bin/node","benchmark.cjs","--check"]],"unit":"ms","sourceUrl":"https://github.com/RUC-NLPIR/Arbor","revision":"2f4e65410a5c21c9e55835a9a0d77ead21a64ffa"}
```

This is a contract example, **not a bundled or executed upstream benchmark**. Supply an actual prepared entrypoint that prints exactly one `ARBOR_METRIC DECIMAL UNIT` line and exits zero only on valid execution. Up to32 explicitly selected bounded regular files are copied to a separate new material directory; symlinks/escapes/duplicates reject. Review the resulting mutable/protected scope before starting: the generic adapter initially selects the supplied files as mutable and adds no hidden data. Set `material.evaluationInputs` and narrow `mutablePaths` in the start request for your benchmark. Generated evaluation JSON is capped at64KiB (including argv/checks); oversized definitions reject before destination creation. Required checks, metric direction/unit and environment must reflect your actual benchmark. No-check runs are limited-validation.

Heavy datasets, external services, Python/GPU runtimes and network model endpoints are optional external dependencies: provision them yourself only when authorized, record identities and explicit commands, and use a project virtualenv or declared environment, never system Python `pip`. No paid experiment or upstream dataset is required for the three bundled packs. Only actual baseline evidence can validate your adapted benchmark.

CLI/browser remain read-only in every mode. They cannot scaffold, prepare, init, create or generate exports. Existing preparation/export artifacts can be read without mutation. The older [PR4 exact-pair fixture](pr4-agent-improvement/README.md) is retained as a separate loading oracle, not substituted for these autonomous packs.
