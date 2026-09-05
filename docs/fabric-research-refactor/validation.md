# Validation and evidence

## Current architecture

Two runtime Markdown files: `skills/fabric-research/SKILL.md` and its optional `references/last30days.md`. No canonical JS program, manifest, report/provenance schema, runtime heading parser, temporal subsystem or telemetry aggregator remains. Public Pi loading preserves explicit/user-only invocation. The core retains source quality and task-shaped native work; the optional reference owns only last30days integration differences.

## Focused results

| Check | Observed evidence |
|---|---|
| Before tests | All 13 unchanged program tests passed (`before-tests.txt`); they validated policies, not their value. |
| Current contract | 4/4 pass: public native loading/unique registration, relative pointers, real Fabric compilation plus direct mock execution, removal checks (`after-contract-tests.txt`). |
| Native last30days defaults/options | 2 unittest cases pass, including both quick/deep subcases, days/as-of and no-browser-cookies. Defaults stay delegated to the engine, not supplied by research. |
| Native last30days export | 9/9 existing engine tests pass, including mixed successful, clean-empty and failed source outcomes. No dependency changes or pytest cache writes. |
| Simple native research | Fresh identical HTTP 410 task, same model/thinking/tools. Both outputs accurately distinguish likely from guaranteed permanence with RFC 9110 §15.5.11. Both use zero research children; after has no ledger/clock/receipt call. |
| Independent native workers | Five original-source questions dispatched before any returned; five native run lifetimes overlap. All five verified answers survive a real invalid-cwd sibling dispatch refusal. This measures run overlap, not simultaneous inference inside a provider. |
| As-ready checks | Native `parallel` with deferred fixture records `check-ready-evidence` before `unrelated-work-finished`. No agent/network was used in this scheduling-specific probe. |
| Metadata, failures and evidence quality | Fresh offline synthesis retains both supplied primary passages without retrieval timestamps, preserves successful evidence after worker delta's failure, deduplicates two syndicated reports, does not average unlike workloads, and withholds an unsupported 99.99% reliability claim. |
| Inaccessible sources | Offline decisive-source failure yields a stated gap, not a recommendation. A live JSON/RFC worker recovered failed readable extraction through native raw fetch, without browser recovery. |
| Browser avoidance | Complete native logs cover 52 visible agent tool calls with no browser tool invocation. A separate real `web_search` call uses `workflow: "none"`, no provider override and succeeds. last30days command contains documented opt-outs, explicit HN-only sources and scoped output/config paths; supplementation uses direct HN API retrieval. |
| Live last30days | Installed engine exits 0, `source_status.hackernews=ok`, six real results. Requested `--days 7 --as-of 2026-09-05 --quick` preserved. Actual JSON and HN comments read, useful claims kept distinct from measured performance and representativeness. |
| Preservation | All 62 pre-existing historical evidence hashes match. Original current-source tests and user-modified skill are in `before.tar.gz`; user diff also saved separately. last30days dependency working tree remains clean. No provider/global config edits were made. |

Executable assertions over this run are in `summarize-smokes.mjs`; `smoke-summary.json` records their output. That script summarizes recorded evidence, not current-model behavior, and is not a research runner. Fresh scenarios are in `skill-evaluations/fabric-research-refactor/scenarios.md`.

## Before/after overhead and speed

One native smoke pair, not a statistical benchmark:

| Observation | Before | After |
|---|---:|---:|
| Native run elapsed | 70.659 s | 42.619 s |
| Agent tool calls (outer `fabric_exec`) | 5 | 4 |
| Skill-owned material actually read | 34,565 bytes | 4,778 bytes |
| Native uncached input tokens | 36,653 | 25,527 |
| Native cache-read tokens | 81,664 | 41,472 |
| Native output tokens | 885 | 376 |
| Reported model cost | $0.492444 | $0.315542 |

Causal trace: before loaded SKILL plus execution and synthesis references, produced clock/route/requirements, then spent a separate call emitting ledger/receipt. After loaded only SKILL, discovered retrieval and used the same fetch/passage check. The supported answer stayed the same. This demonstrates removed administrative work, not merely fewer lines or structural-test success. Model/cache/provider latency and concurrent host load remain uncontrolled; these observed deltas are not generalized speed or cost guarantees. Provider search cost is not inferred from model usage.

The unchanged five-task deterministic probe independently showed: requested concurrency 5 clamped to 4; 1,526 manifest bytes; 1,894 schema bytes; 1,881 assignment bytes per worker before task-specific elaboration; discovery/policy reread and 16 progress/control operations. All five useful reports remained in the raw result, but all five were excluded from candidate evidence solely for missing retrieval time and the program returned `failed`. The refactor removes that admission path entirely. `before-mechanics.json` labels these as mocks, not native model timing or savings.

## Limits and unrun variants

- The standalone `ultra-skill-creator` validator reports two errors because it forbids links outside a skill directory. The relative sibling links to the installed last30days manual/export are valid in Pi and checked by the native loader/current-source test. They are intentionally retained instead of copying that manual or hiding the dependency. This validator mismatch is not reported as a pass.
- The skill is guidance, not a security boundary. Visible native tool traces and the inspected Python supplement show browser-free operations; this is not a syscall audit or a claim about internal remote-provider infrastructure. Other nonbrowser last30days source chains were not exhaustively exercised.
- Native worker failure coverage includes a dispatch refusal; mid-run process crashes and cancellation are not separately injected. Successful source extraction recovery and the offline failed-worker packet supplement that case. No automatic whole-run retry is introduced.
- last30days quick/HN was exercised live; defaults and deep options were tested at the native parser, not as additional live collection runs. Missing-environment and concurrent-engine variants remain scenario criteria, not recorded passes. Mixed source failures were covered by native export tests, not forced into the live HN run.
- No broad literature-review quality benchmark or repeated randomized speed campaign was run. The actual five-question probe and offline packet check decisive correctness and source judgment only for their cases.
- last30days still has a large existing manual. Its live worker took 350.617 s and 29 tool calls, including manual/source inspection and comment supplementation. No before/after speed claim is made for that branch, and its dependency was not rewritten.
- Parallel lifetimes and a deferred native scheduling probe show the available mechanisms, not a mandate to use five agents or this probe's control flow on future tasks.

Unrelated files changed in other concurrent sessions were left alone. The refactor's runtime files, tests and audit artifacts are the only owned changes.
