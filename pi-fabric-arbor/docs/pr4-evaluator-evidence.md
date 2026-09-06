# PR4 evaluator implementation evidence

## Verdict and identity

**Independent verification PASS for the supplied committed-material PR4 scope. All five supplied fixes verified; two adjacent bugs (exact filenames and null preset precedence) reproduced and repaired. PR5-PR13 and full optimization acceptance remain outstanding.**

Verified before edits and again by the final audit: root `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, app `pi-fabric-arbor`, branch `arbor/refactor-pr0-pr1`, HEAD `f879e99e8f6e71229023905c281441a04176489e`. The entire authoritative plan, scoped guidance, ledger and preceding PR3 evidence were read before implementation. Public Pi/Fabric lifecycle, component, provider and agent contracts were inspected. Fovea was unavailable at initial discovery; bounded source tracing was used. Later graph updates were navigation evidence only.

This gate evaluates an explicitly supplied pair of committed material references. It does not implement PR5 dirty capture, candidate generation, current-incumbent adoption, source apply or PR6 autonomous research. PR8 broader partial-material continuation is not accepted here.

## Executed gates

Commands run from `pi-fabric-arbor/`:

| Command | Observed result |
|---|---|
| `npm run manifest:pr3` | 16 public refs; saved exact action/definition/provider schemas and metadata |
| `npm run check` | Both no-emit checks; **186/186** tests: 5 package/install + 92 retained-source + 20 PR2 + 25 PR3 + 44 PR4 |
| `npm run test:pr2:e2e` | **8/8**, including existing subprocess exit guard and actual second-root denial |
| `npm run test:pr3:e2e` | **20/20**, preserving actual review, admission, owner, policy and exit assertions |
| `npm run test:pr4:e2e` | **21/21**, with **21/21 natural clean native Pi exits** |
| `node --import tsx .runtime/pr4-independent-final-audit.ts` | Manifest/public exports/pack/import/dependency/exit audit passes |

The final audit records 16 public refs, 10 required owner refs, 51 packed files and an active closure of 22 source modules / 115 static imports from the package, extension and CLI entrypoints. Runtime dependencies resolve physically inside this worktree's app-local installation. The clean native cases independently install the packed product into fresh directories with physical local dependencies. Exactly one public skill remains registered. No emitted fallback, original-checkout module link, private Fabric import, profile benchmarking dependency or Fabric modification was added.

`package-lock.json`, the original fingerprint test/implementation, and the exact `test:source:retained` command are unchanged. No useful deferred review assertion was removed or weakened. PR2/PR3 native gates were rerun after the final review repair, including the shared owner and persistence changes.

## Independent-review repair evidence

All five reported bugs reproduced and were repaired in the existing product path:

| Finding | Repair and decisive checks |
|---|---|
| Judge faults swallowed as grades | Only deterministic parsing is caught as invalid grading. Judge dispatch/material/persistence faults propagate to interruption; tentative grades and ingestion state roll back on persistence failure. Engine and store require every invocation ingested before completion. Real native judge completion survives a material-read fault, component reload and explicit resume: both saved native IDs are re-observed, four total subject/judge launches, no redispatch. Separate store-seam tests inject judge native-complete and ingestion persistence faults. |
| Mutable expected request bindings | `trust.ts` deep-clones/freezes private expected facts, passes detached requests, snapshots replies and checks mutation across descriptor, spawn, wait, status and artifact-IO awaits. Native waits/stops remain owned before rejecting replies; persisted binding rejection blocks poisoned resume. Source matrices cover model/task/nested tools, IDs/snapshot/spec/output, descriptor-delay mutation, late artifact-IO request/reply poisoning and status mutation. Actual native and external-provider gates exercise the product validation path. |
| Subdirectory Git collision | Material extraction uses the exact checked `ls-tree` blob OID, not repo-root `OID:path` lookup. A committed repository with root/subdirectory `coordinator.md` collisions proves both exact byte selections. Literal path selection is used. |
| Executable bit lost | Snapshot identity includes committed executable flags. Owned files use `0700` for executable and `0600` otherwise; verification rejects either direction of executable drift. A clean installed product directly runs committed `./evaluate.sh` through execute-risk `arbor.evaluate`, with baseline/candidate scores 1/2 and exit zero. |
| Derived delta exceeds input bound | Derived BigInts remain internal until output serialization. Direct opposite-sign 27-digit, nine-decimal-place oracles produce 28-digit deltas/ranges for both maximize and minimize, with exact win/loss/tie/failure counts. |

Initial source red: **21 existing passes / 16 new failures**, retained in `.runtime/pr4-review-red-source.{log,exit}`. Final targeted source: **42/42**, including five further cross-await/completion invariants, in `.runtime/pr4-review-targeted-source-final.{log,exit}`. Judge/provider/script actual-host reds are retained in `.runtime/pr4-review-red-native.{log,exit}`.

The initial four native poisoning hooks patched a separately loaded module prototype and emitted no poison events. Their failures are **not valid poisoning evidence**. The corrected hook wraps the public managed component `context.call` while executing the complete product activation, owner, evaluator and store against actual native Pi/Fabric. Its four-case vulnerable-comparison mutation control fails **4/4** in `.runtime/pr4-review-red-native-mutation-control.{log,exit}`; repaired source was restored in `finally`. The final gate requires real poison events, exactly one native spawn, owned wait/stop, terminal membership and clean exit. Wait-stage cases additionally require real inference. Spawn rejection may stop Pi before inference; an overstrong new inference-count assertion was corrected without relaxing binding/score/launch/cleanup assertions.

Worker review full gates (before the additional filename repair): `.runtime/pr4-review-gate-{normal,pr2-native,pr3-native,pr4-native}.{log,exit}`. All exit codes are zero. `.runtime/pr4-review-native-hosts.jsonl` records the exact 21 PR4 gate hosts; `.runtime/pr4-review-audit.{ts,json,log,exit}` verifies each exit as `{code:0, signal:null, killed:false, error:null}`, plus public contracts, package/source closure and unchanged retained lane/fingerprint/lock. No latest-directory heuristic is used for this audit. These worker gates followed the five supplied repairs; follow-up changes and reruns are recorded below.

Pre-repair snapshots did not record executable flags. Existing stored artifacts are untouched; they are not silently upgraded to the new material identity or accepted as mode-verified evidence. Start a fresh measurement if that old identity blocks reconciliation. This remains committed-material evaluation, not PR5 dirty/mode capture or migration.

## Follow-up independent verification

The exact worktree and branch were verified before review. The PR4 plan/architecture, full exclusive source changes, regressions and actual-host fixture/control paths were independently inspected. Fovea's callable surface was unavailable; bounded source tracing was authoritative. The five supplied fixes are supported by the new executed product-path gates, including actual native judge reconciliation and request poisoning, not just worker log summaries.

An adjacent exact-material bug was reproduced: a committed `__proto__` filename vanished through the plain-object setter, so copying and verification skipped it. `material.ts` now uses prototype-free content/mode maps, checks complete selected-file coverage on persisted snapshots, and refuses inherited prompt entries. One new source regression covers `__proto__`, `constructor`, `toString`, byte loading, JSON persistence, incomplete-map rejection and tamper detection. The red probe is `.runtime/pr4-independent-red-material.{log,exit}` (one failure); the complete repaired evaluator source lane is `.runtime/pr4-independent-targeted.{log,exit}` (**43/43**). This filename edge case is source/Git evidence, not an additional native scenario.

Whole staged-diff review found a second adjacent bug: nullish coalescing loaded a lower-precedence preset despite explicit `preset: null`. The source regression fails with an unwanted ENOENT in `.runtime/pr4-independent-red-preset.{log,exit}`. Selection now follows property presence, so explicit/project null disables inheritance. The final source lane is `.runtime/pr4-independent-targeted-final.{log,exit}` (**44/44**). The existing clean-installed native subject/judge scenario now also proves explicit null suppresses a missing profile preset, retaining every previous assertion.

Because preset selection is shared start configuration, normal and PR2/PR3/PR4 native gates were rerun after the final source/test change: `.runtime/pr4-independent-final-gate-{normal,pr2-native,pr3-native,pr4-native}.{log,exit}` report **186/8/20/21**, all exits zero, no failures/cancellations/skips. `.runtime/pr4-independent-final-native-hosts.jsonl` binds the exact 21 new PR4 hosts. `.runtime/pr4-independent-final-audit.{ts,json,log,exit}` rechecks every `{code:0, signal:null, killed:false, error:null}` receipt, public exports/manifest, package/import closure and unchanged retained selection/fingerprint/lock. Regenerating the action manifest produced an identical SHA-256. The audit is a package/source/exit audit, not a dependency vulnerability audit.

The active closure remains **22 modules / 115 static imports**, **16 public refs / 10 required owner refs**, **51 packed files**, and one public skill. Declared dependencies resolve physically in this worktree or the fresh offline installed fixtures. Two pre-existing loose test-fixture `.ts` files appear as extraneous in app-local `npm ls`; they are not dependency packages, active imports or packed product files and were not changed. No dependency upgrade or runtime change was made. Old incomplete snapshots are not migrated or silently accepted.

Only documentation changed after these gates. Publication is authorized only for this scoped checkpoint after explicit-path staging and whole cached-diff review; no full A03/A04 optimization or broader recovery acceptance is implied.

## Acceptance ledger

| IDs | Status and exact PR4 scope |
|---|---|
| A03/A04 | **PARTIAL overall.** Installed prompt-pair improvement and command-pair execution pass. They are fixed-input evaluator journeys, not code optimization or autonomous candidate generation. |
| A05/A06 | **PARTIAL overall.** Native failure/error/nonzero exit/deadline, failed/incomplete correctness checks and ambiguous/wrong-unit metrics cannot score. Direction, pairing, repeats and failure-inclusive descriptive interpretation have direct oracles. Current-incumbent/minimum-gain/tie acceptance remains PR5. |
| A09/A10/A11/A20/A29 | **PR4 evaluation reconciliation PASS; broader items PARTIAL.** Real pause/cancel/interruption, durable native-before-ingest completion, actual owner reconstruction, immutable-bound explicit resume and no duplicate launch pass. Unknown native IDs block without journal changes. Live/ambiguous effects lacking terminal evidence remain blocked; partial executor material/leases/workspace recovery is later scope. |
| A16 | **PR4 contract/catalog scope PASS; broader packs/scaffolding PARTIAL.** Closed presets and precedence, finite optional definition-time refs, committed identity plus effective schema/risk/effect validation, missing/mismatch/invalid-result rejection and explicit maintenance with two-run blast radius pass. |
| A20 | **PASS for the PR4 exact-material suite scope.** Installed native subjects explicitly load baseline/candidate bytes, independently grade fixed tasks, retain failures and reconstruct interrupted terminal evaluation. No profile-local skill or fixture execution/grading driver substitutes for the product. |
| A21 | **PR4 invocation accounting PASS; full item PARTIAL.** Atomic capacity, immutable purpose/IDs, baseline/candidate, linked retries, rechecks, exploratory scored feedback and judges are charged. Available usage/cache/elapsed evidence is retained once per invocation. Token/cost ceilings remain observational; held-out accounting is later scope. |
| A17/A22/A25/A26/A30 | **Existing accepted scopes preserved; PR4 additions pass.** CLI/browser remain read-only; action manifest and package contracts match; operational actors/executors retain independent tools/instructions while a subject explicitly loads the colliding `skills/fabric-arbor/roles/coordinator.md` snapshot path. Broader operational role assembly, views and product journeys are not accepted. |
| A07/A08/A12-A15/A18/A19/A23/A24/A27/A28 | No new blanket acceptance. Original fingerprint/review/owned-wait guarantees remain covered by unchanged retained and PR2/PR3 gates. Dirty capture, held-out, literature, broader recovery, views and other later milestones remain outstanding. |

## Product execution and authority

The traced path is `src/extension.ts` -> `src/managed/definitions.ts` -> captured managed public context -> `ResearchService` / `EvaluationEngine` -> `OwnerExecution` -> native public actions or directly owned command processes -> `ResearchStore`.

- `src/evaluators/contracts.ts` closes/fixes material refs, tasks/order, grading, repeat/retry policy, independent subject/judge configuration and supported descriptive analysis. Unknown or contradictory selected methods/vetoes block before dispatch.
- `material.ts` copies bounded regular committed UTF-8 bytes into owned evaluation directories, records content identities and verifies them before/after execution. It leaves dirty source/index bytes untouched and does not claim PR5 capture/workspace semantics.
- `measurement.ts` strictly parses one decimal/unit metric, owns direct command termination and computes paired descriptive task summaries. Repeats are within-task samples; failures remain in paired diagnostics. The observed delta range is **not a confidence interval**. No inference method is advertised or silently approximated.
- `EvaluationEngine.ts` reserves and journals every invocation, freezes its purpose/request/role/model/tools/bootstrap identity, preserves native completion before ingestion and derives artifacts from authoritative records. Native execution, validity, quality, analysis and `incumbentDecision: not-evaluated-PR5` are separate.
- `OwnerExecution.ts` uses the existing native Pi/Fabric adapter with explicit model, tools, instructions and snapshot cwd. It validates returned ID/cwd/model/runner/transport, owns waits and stop handles even across attachment-persistence failure, and reconstructs its saved native identity before re-observation. No callback/subscription/second participant runtime was introduced.
- `ResearchStore.ts` atomically accounts capacity, persists invocation/native records and compact progress events, and retains generation-binding history. Explicit resume validates owner/root/host/session, component, cwd/OID, epoch, spec/definition/catalog and request/snapshot bindings before proceeding. Unknown handles are not guessed or redispatched. A lost deadline receipt makes recovered execution invalid rather than fabricating timely success.
- Command evaluation uses execute-risk `arbor.evaluate`. Agent-risk start/control cannot run or resume a command effect directly. `/arbor start` and `/arbor resume` compose the public policy-aware actions. Direct command start only freezes configuration until execute admission.
- Provider evaluation calls only a configured exact optional ref captured by the committed view. It validates the committed descriptor hash and effective schemas/risk/effect, request/snapshot/native provenance, checks, measurements and retained artifact references. Provider replies cannot decide research policy.

## Native and fault evidence

`tests/integration/pr4-evaluator-host.test.ts` runs actual source or installed Pi/Fabric/Arbor. Its local fake providers/models produce deterministic inference and controlled faults; product code performs native dispatch, snapshot loading, independent grading, persistence and interpretation.

The original 14 scenarios cover installed prompt/optional judge execution; durable completion before failed ingestion; installed commands with a missing optional provider; primary command success plus failed correctness checks; the real external-provider rejection matrix; shared-owner retirement affecting two runs with built-in reactivation and blocked unknown external completion; pause/resume and idempotent feedback; execute-policy denial; a genuinely pending native inference stopped by an Arbor deadline below the Fabric timeout floor; late-spawn cancellation; unknown native handle denial; operational/subject same-path isolation; exact effective schemas/requirements/policy; and same-owner component reconstruction without duplicate launch.

Seven additional review scenarios exercise a real judge ingestion fault with reload/resume, four actual native request-poisoning boundaries, the actual external-provider request-poisoning matrix and an installed direct executable script. All 21 scenarios retain the original natural-exit guard.

The unknown-ID case deliberately corrupts a persisted ID after a real native completion, then exercises the real public status lookup. It does **not** claim an installed public API can delete same-host historical handles. Actual owner-root loss and second-root denial remain covered by PR2/PR3. Attachment-persistence failure, exact arithmetic/pairing, missing-check and additional descriptor/result matrices are explicitly labeled source/lifecycle-seam tests, not extra native proofs.

## Optional maintenance and limitations

`arbor.evaluators.json` is read from the owning Pi profile before definition registration; at most eight exact optional refs are declared. Existing catalog/view objects cannot widen when caller objects or files change. Presets are frozen data beneath profile/project/explicit configuration, never executable plugins.

Before changing the configured catalog, inspect affected runs and quiesce owned work, then explicitly reload Pi/re-register the derived definition. Merely reloading a component does not reread the file. Provider replacement can retire the shared owner and interrupt built-ins too. Built-ins reactivate after the boundary; saved evaluations require explicit immutable-bound reconciliation. A changed catalog/definition requires a new measurement/run. There is no run-triggered reload, generic evaluator transport or promise of uninterrupted isolation.

These are trusted configuration/owned-process tests, not containment. Commands may access their normal environment and only directly owned processes are stopped. Statistical scope is descriptive only. No paid model, live search, dataset download, benchmark-skill edit/copy or dependency upgrade was required. The example is packaged material/tasks/preset data, with **no mutating preparation CLI**. Schema-enforce compatibility, automatic research, incumbent adoption, full partial-material recovery and source apply remain unavailable.

## Historical implementation phase results and repairs

The following logs/counts predate the independent-review repairs. Current gates and exact 21-host evidence are above.

- Final logs/exit codes: `.runtime/pr4-gate-{normal,pr2-native,pr3-native,pr4-native}.{log,exit}`.
- Audit: `.runtime/pr4-audit.{ts,json,log,exit}`. Its JSON records the exact 14 final native `host-exit.json` paths. Each has `code: 0`, `signal: null`, `killed: false`, `error: null`; host completion markers alone are not accepted.
- Per-host traces, output, SQLite records, snapshots and derived evaluations remain under `.runtime/pr4-host/native-*/`.
- Red gates are retained at `.runtime/pr4-red-{normal,pr4-native}.{log,exit}`; earlier targeted source/native phase files are also retained. Initial native tests exposed unregistered fake subject models and retirement during ingestion. Fixture registration was fixed and interrupted completion/reconstruction now has explicit product coverage. Later source checks found callback narrowing; additional inspection closed incomplete-check, post-spawn persistence, attribution and replay-purpose gaps.
- The final normal red was an availability contract mismatch: research remains observation-only, so that existing field was preserved and exact-material evaluation advertised separately. The final native red was an unreachable test serialization return, repaired without changing grading assertions. A new role test initially conflated deliberate PR3 research pause with completed native execution; the corrected test asserts both fields and the persisted stop decision semantics. No production failure was hidden by deleting an assertion or reclassifying an unsupported mode as a pass.
