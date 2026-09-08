# PR7 branching and parallel evidence

> Historical milestone evidence at or before PR12 `b509ae7ccb1db2da02272d9eb9d304267c59119f`, retained in the repository but not shipped. Commands, fixed counts and source paths below refer to that historical checkout, not current release gates. See [current cutover evidence](pr13-cutover-evidence.md) and the acceptance ledger. Existing runtime evidence remains untouched.

Status: **repaired PR7 scoped gate PASS; publication requires final independent staged review**. Verified exact root `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, branch `arbor/refactor-pr0-pr1`, base HEAD `e8abded64db245ebfca2725bdeca486094e0c1a4`. Existing PR7 diff preserved. User-authorized publication is limited to the reviewed app/plan diff, normal commit/push and an evidence comment on draft PR #3. PR8-13 remain outstanding.

## Repair acceptance ledger

| Finding | Repair and observed regression evidence |
| --- | --- |
| P1 second workspace preparation failure stranded both reservations | Preparation catch uses existing `refuseUnlaunched` for all proven-unlaunched attempts, preserving consumed attempt IDs, partial workspaces and errors. Original dispatch receipt becomes blocked, never a replay trigger. Real-Git tests at concurrency 1/2 assert active=0, reserved evaluator credits=0, native count=0, stopped/null-native attempts, retained obstruction/first workspace and blocked duplicate. Actual-native product fixture independently proves zero workers and retained evidence. |
| P2 protected committed worker change survived freeze refusal | Proven-settled collection attempts freeze and restore independently, retains both errors, and blocks failed-command replay. Protected guard unchanged. Real-Git tests verify reset to parent, immutable source/index/refs, retained worker refs and both freeze/restore errors. Actual native two-worker wave verifies protected h1 restored without eligible OID, good h2 frozen/restored and protected worker commit retained. |
| P2 expansion invalidated pending review forever | `ResearchStore.research('propose')` rejects while `pendingDecisionId` inside the transaction, before writes/revision advance. Root and descendant probes preserve the entire projection; the exact original approval or rejection binding still succeeds. No approval rebasing. |
| P2 retained PR6 projections rejected additive PR7 fields | Whole staged review found missing saved search/origin and insight fields rejected by newly required outputs. `compat-red.log` reproduced it; `compat-green.log` passes after making only additive output fields optional. Saved rows/spec identity remain byte-identical, unknown fields and invalid present values still reject; new-run defaults remain bounded. No migration or PR8 continuation. |
| P2 root-hypothesis refinement lacked exploitation lineage | Selection uses the top direction ancestor or stable lineage root. Measured-root refinement is exploit with no fallback; three valid no-gains request a different lineage, or exact absent-direction fallback. |
| P2 shared-ancestor insight overflow | Second whole staged review found that the 101st valid distinct lesson could exceed the existing 100-insight output bound. `insight-red.log` reproduced it; `insight-green.log` proves atomic refusal before any lesson/ancestor/revision write, preserving 100 lessons split between siblings and a schema-valid projection. Full impacted PR6 native lane rerun **21/21** in `insight-pr6-native.log`. No schema/budget bound was increased. |
| Adjacent prelaunch and wave-error bugs | Owner admission errors release only reservations with no native ID and no persisted dispatch intent. Lost spawn replies retain cleanup-pending work and blocked replay. Actual-native repair probes exposed an undefined single `attemptId` lookup in the actor's wave-error catch; the catch now preserves the original wave failure. |

The seven initial exact-symptom source probes were all red in `repair-red.log` / `.exit`, then **7/7** green in `repair-green-first.log`. Adjacent admission/ambiguity probes bring the repaired source additions to nine. Native red `repair-pr7-native-red.log` retained its **3 pass / 2 fail**, including the SQLite error masking; `repair-effects-native.log` subsequently passes **2/2**. No failed checkpoint is relabeled as passing.

## Final executed gates

All paths below are under local `.runtime/pr7-gates/`, retained but not staged or packed.

| Gate | Exact result and artifact |
| --- | --- |
| Scoped source | `insight-target.log` / `.exit`: **67/67**, `npm run test:pr7` includes tree, transactional store and real-Git material journey. |
| Normal | `insight-normal.log` / `.exit`: both no-emit checks plus **252/252** = 5 package + unchanged 92 retained + 20 managed + 42 research + 45 evaluator + 48 material. No skips/exclusions. Earlier test-only typing failure retained in `repair-normal-types-red.log`. |
| Impacted native PR2/3/4/5/6 | `repair-pr2-native` through `repair-pr6-native` logs/exits: **8/20/21/9/21**, all pass. Schema-impacted PR3/PR6 subsequently rerun in `compat-pr3-native` / `compat-pr6-native`: **20/21**, pass. Both actual PR6 five-stage code/instruction journeys retain 5 evaluations, 10/30 invocations and 4 workers/lessons. |
| Final native PR7 | `repair-pr7-native.log` / `.exit`: **5/5**, serial files: owning-Pi pause/cancel **2**, fixed A12 **1**, actual-native preparation/protected-write failures **2**. No skips/exclusions, no replacement scheduler. `control-*.json` and `repair-native-*.json` retain exact roots, attempts, errors and no live owned participants. |
| Final documentation/package verification | `repair-final-types.log` no-emit pass; `repair-final-package.log` **5/5** clean packed source installation/reload/passive registration and CLI refusal; `repair-final-plan.log` **1/1** text-only consistency; `repair-final-audit.log` strict audit pass. These do not inflate normal252 or the163 selected native exits. |
| Independent review | `repair-independent-review.txt`: independent read-only agent `95f9029524364e159dd54a4c8c7e16bf`, exit 0, no blockers in four repairs or adjacent fixes; source and public/parity mechanically reviewed. This was static review, not a second test run. |
| Mechanical audit | `insight-final-audit.log` / `.exit`, `repair-audit-final.json`: **18 refs / 10 owner requirements / one unchanged public skill / 62 packed files / 30 reachable modules / 174 imports**. **163 exact two-window exits: 160 clean plus three expected synthetic PR2 exit-guard failures**. The second window adds all64 rerun exits: PR3/PR6 schema-impact 22/21 hosts, then PR6 lesson-impact21 hosts. This includes all eight earlier PR7 checkpoint hosts, including red test assertions, not only final passing hosts. Max event **56,000 bytes**, max trace **1,368,686 bytes**, event below 4 MiB. |

Audit preserves exact public refs/risks/effects/configuration/actor commitment, dependency declarations and lockfile, physical app-local dependencies, fingerprint/useful source tests, single public skill and strictly read-only CLI/browser. Fresh before/after inventories include every `*exit.json` at host depth two; no failing exclusions or weakened counts. The final staged diff and remote equality checks are mandatory publication steps, not inferred from tests.

Whole staged review `f67e6c5060ca4069b40b0da323a076ae` read all4038 lines of the first staged diff and held publication for retained-PR6 schema compatibility. That finding was repaired red/green; final restaged full-diff review is a mandatory publication gate. The next whole review `2577f75fbccc40ccb3b5b150d5fb3231` verified that fix but held for shared-ancestor insight overflow, now repaired red/green. Neither output-requiredness nor transactional lesson admission changes execution-wave code; unchanged passing A12 remains authoritative. Current final types/plan/audit logs use prefix `insight-final-`.

## Final A12 controlled-wave evidence

`a12.json` / `a12-phase.json` were rerun after wave-path repairs. Both modes reserve the **same two-candidate wave atomically**, use fixed parent workspaces and have no intervening actor ask. Concurrency one reuses one slot; concurrency two overlaps. One warmup wave is discarded in each mode; exactly three warmed waves run fixed independent **one-second** workloads. The **<=80%** target is unchanged.

| Mode | Warmed total ms | Setup ms | Dispatch/native ms | Collection ms | Workload overlap ms | Median ms |
| --- | --- | --- | --- | --- | --- | --- |
| concurrency 1 | 3470 / 3528 / 3524 | 41 / 46 / 49 | 3099 / 3107 / 3119 | 330 / 375 / 356 | -542 / -549 / -558 | **3524** |
| concurrency 2 | 1944 / 1962 / 1989 | 41 / 46 / 62 | 1575 / 1582 / 1584 | 328 / 334 / 343 | 988 / 960 / 984 | **1962** |

**1962 / 3524 = 0.5567536889897844 <= 0.80**. Negative serial overlap is a gap. Node **v26.7.0**, Linux **7.2.2-1-cachyos**, i7-13620H, 16 logical CPUs; locked app-local Pi **0.85.1** / Fabric **0.83.0**, deterministic local inference, no paid research calls/datasets. Final roots `.runtime/pr6-host/command-7ST3tI` and `command-2PhcnE`. Serial exact measurement remains authoritative outside the measured execution-wave boundary.

This metric includes preparation through complete native settlement/freeze/restore collection. Actor/evaluator turns outside that boundary are excluded. **Controlled A12 wave speed only, not full-campaign speed, research quality or general workload superiority.** Reviewer-verified historical **1959/3497 = 0.5601944524**, overlap **972/962/980**, is retained in `a12-reviewed.json`; earlier repair timing in `a12-repair-first.json`. Neither overrides final samples.

## Scope and remaining work

A12 controlled-native and A13 tested structural policy only. PR8 source apply/undo and partial/ambiguous continuation, PR9-13 held-out/literature/examples/presentation/cut-over and broader acceptance remain pending. Budgets are unchanged admission limits, not hard containment; costs/tokens remain observational/unavailable. Reports/diagnostics are unscored; worker-scored feedback is unavailable. Unknown writers retain bindings/workspaces, and restore/storage failures retain artifacts rather than claim cleanup. No Fabric API/private imports/new runtime, benchmark skill, original checkout or blacklisted profile changes. No retained artifact cleanup is authorized.

## Historical recovered gate, superseded by the repair gate above


Status: **PR7 scoped implementation gate PASS; independent review pending**. Exact root `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, branch `arbor/refactor-pr0-pr1` and HEAD `e8abded64db245ebfca2725bdeca486094e0c1a4` reverified on recovery; existing PR7 changes preserved. Exclusive edits: app and authoritative plan. No staging, commit, PR8, native API/private-import/runtime/dependency changes or paid inference. Fovea discovery remains unavailable; automatic current-session drift was checked against actual source/status, with bounded source tracing authoritative. Historical checkpoints below do not override this final gate.

## Acceptance ledger

- [x] A13 typed topology/refinement: parent, eligible leaf, depth, children, ancestor pruning/review.
- [x] Explicit actor selection kind/reason; deterministic exploreEvery=3, shiftAfterNoGain=3, stopAfterNoGain=5, bounded overrides, eligible-absent fallback, measured-keep reset; infrastructure excluded.
- [x] Bounded independent waves, concurrency 1 or 2; atomic attempts/slots/evaluator credits; immutable parent; actual owned native waits and complete wave settlement.
- [x] Serial exact evaluation, rational min/max ranking/ties, latest-incumbent validation, changed combinations newly evaluated.
- [x] Revision-serialized ancestor lessons preserve siblings; prune does not cancel active work.
- [x] Midwave pause/stop/budgets/convergence admit no further launches; retain generation cleanup and ambiguous evidence.
- [x] A12 two independent one-second native executors, three warmed serial/parallel waves; actual overlap, median parallel <=80% serial; setup/dispatch/collection overhead and environment retained.
- [x] Normal check, impacted native PR2-6 (both autonomous journeys), native PR7 and mechanical manifest/import/package/read-only/fingerprint audit.
- [x] README, scoped guidance, plan and ledger updated to actual evidence only.

## Final observed evidence

Production path: ResearchService -> OwnerExecution -> MaterialJourney -> ResearchStore/Workspace/EvaluationEngine. Native fake inference chooses structured proposals, never replaces the owner/coordinator/evaluator with a fixture driver. Main starts and submits controls only. Whole-wave reservation is transactional; concurrency one reuses one slot, concurrency two overlaps two fixed-parent workspaces; all native operations settle before serial collection. Exact evaluator records, not summary projections or worker scalars, supply rational ranking. Current-incumbent acceptance and changed-combination re-evaluation remain authoritative.

| Check | Executed evidence |
| --- | --- |
| Typed topology and policy | `tests/research/pr7-tree.test.ts`, `pr6-loop.test.ts`: parent/depth/child/leaf/pruned ancestry; explicit slot/kind/reason/fallback; exploreEvery=3, shift=3, stop=5; keep reset follows serial decision chronology; checks/infrastructure excluded. Existing PR3 actual review/ancestor admission retained. |
| Atomic wave and shared state | `tests/material/pr5-journey.test.ts`: whole-wave attempt/slot/evaluator rollback, duplicate receipt and wave-ID refusal before effects, immutable parents, serial measurements, stale-incumbent refusal, fresh changed combined evaluation, stale sibling rejection and both ancestor insights retained. |
| Midwave controls | Source pause/cancel, active-time exhaustion and newly committed convergence prevent second launch; pruning does not cancel admitted work. `controls-native-first.log` additionally proves actual owning-Pi pause and cancel at a native result barrier in a two-candidate serial reused-slot wave: one native worker only, second stopped with null native ID/digest, active=0, one baseline evaluation, unchanged incumbent, no live owned participants. Roots/attempts retained in `control-pause.json` / `control-cancel.json`. |
| Normal source gate | `normal-final.log` / `.exit`: both no-emit checks and **241/241** = 5 package + unchanged 92 retained + 20 managed + 37 research + 45 evaluator + 42 material. `recovery-test-types.log` additionally passes with new native controls/audit. |
| Impacted prior native gates | `pr2-native`, `pr3-native`, `pr4-native`, `pr5-native`, `pr6-native` logs/exits: **8/20/21/9/21**, all exit 0, no skips/exclusions. Two actual PR6 code/instruction journeys retain five evaluations, 10/30 invocations and four workers/lessons each; frozen/revised installed roles, exact bindings and dirty source/index/refs remain intact. |
| Final identical-wave A12 | `pr7-final.log` / `.exit`: **1/1**. Final `a12.json` and `a12-phase.json`, not historical split-dispatch results. |
| Additional native controls | `controls-native-first.log` / `.exit`: **2/2**, no skips/exclusions. Current production code, actual installed native runtime, no replacement scheduler. |
| Mechanical audit | `recovery-audit-repaired.log`, final `recovery-audit-final.log` / `.exit`, `audit-final.json`: **18 refs / 10 exact owner requirements / one unchanged public skill / 62 packed files / 30 reachable modules / 174 imports / 89 selected native exits**. **86 clean + three expected synthetic PR2 exit-guard failures**, not 89 successful hosts. Maximum selected native event **56,000 bytes**, trace **1,368,686 bytes**; event <4 MiB. |

Final documentation/package verification: `recovery-package.log` / `.exit` **5/5**, including clean packed source installation/reload/passive registration and CLI mutation refusal with unchanged fixture bytes. `recovery-plan.log` / `.exit` **1/1** is text-only architecture consistency, not a substitute for native behavior. `recovery-test-types.log` passes current tests/audit no-emit checking. Final `git diff --check` passes; branch/HEAD unchanged and cached diff empty. These checks do not inflate the 241-test normal count or the 89 specifically selected PR2-7 native exits.

### A12 final methodology and measurements

Both modes run the **same two-candidate wave**, atomically reserving both attempts/evaluator credits against one incumbent. Concurrency one reuses one native slot serially; concurrency two overlaps. There is **no intervening actor ask** in either mode. Native workers independently perform the same fixed one-second workload; all eight workers per mode have separate owned workspaces and correct parent/native role/result identities. Measurement is serialized. One warmup wave per mode is discarded; exactly three warmed waves are measured. No A12 workload/threshold assertion was weakened.

| Mode | Warmed total ms | Setup ms | Dispatch/native ms | Collection ms | Workload overlap ms | Median ms |
| --- | --- | --- | --- | --- | --- | --- |
| concurrency 1 | 3530 / 3489 / 3497 | 39 / 45 / 47 | 3104 / 3106 / 3117 | 387 / 338 / 333 | -548 / -562 / -548 | **3497** |
| concurrency 2 | 1959 / 1958 / 1964 | 40 / 45 / 42 | 1576 / 1580 / 1590 | 343 / 333 / 332 | 972 / 962 / 980 | **1959** |

Final ratio **1959 / 3497 = 0.5601944524 <= 0.80**. Negative serial overlap denotes a gap. Environment: Node **v26.7.0**, Linux **7.2.2-1-cachyos**, **13th Gen Intel Core i7-13620H**, **16 logical CPUs**; app-local physical locked Pi **0.85.1**, Fabric **0.83.0**; deterministic local inference, no paid calls/datasets. Final roots: `.runtime/pr6-host/command-8CM9Ne` (serial), `.runtime/pr6-host/command-wZLwgC` (parallel). These PR7 fixtures reuse the PR6 host helper, not PR6 timing evidence.

The metric includes workspace verification/preparation through complete native settlement/freeze/restore collection. Actor turns and serial evaluator/decision work **outside** that boundary are excluded. This passes A12's controlled execution-wave target only; it does not claim campaign-wide speed, general workload advantage, statistical superiority or research quality. Concurrency one remains appropriate where overlap gains nothing or resources interfere.

### Recovery repairs and exact inventory

The final worker checkpoint already contained passing PR5/PR6, same-wave A12 and later admission repairs beyond its prose. Recovery verified those files/results instead of needlessly rerunning unchanged passing lanes. Final duplicate-wave repair applies before reservation; `final-admission-red.log` showed a repeated wave ID previously reached effects before its record conflict, and `final-admission-green.log` proves refusal with unchanged store/native count. Midwave active/convergence probes also pass. Final normal/A12 ran after that repair; prior single-dispatch native lanes remain regression evidence.

`recovery-audit.log` failed because the earlier filename glob omitted `host-exit.json` and `second-host-exit.json`, losing all PR4/PR5 exits and one PR3 second-root exit. `recovery-window-exits.txt` adds only depth-two host exit records newer than `native-before.txt` and no newer than `native-after-final.txt`. The audit validates that timestamp/path boundary and retains strict expected per-lane counts. It excludes only the two explicitly identified superseded A12 hosts in `a12-same-wave-first.json`; final A12 roots come from `a12.json`. Two added control roots are explicit independent artifacts. Failed/intermediate logs remain retained, not relabeled as passes.

### Scope and limitations

Implementation A12 controlled-native and A13 structural-policy scope passes; independent review remains pending. README/scoped AGENTS/authoritative plan/ledger document this gate. Native refs, action risks/configuration/actor commitment, single public skill, source-executed retained tests/fingerprint, physical locked dependencies and read-only CLI/browser are preserved. No staging, commit, original checkout/blacklisted profile access, Fabric API addition/private imports or new runtime. Source capture/export/restore and exact immutable roles/native/evaluation bindings retain their prior native assertions. Unknown outcomes retain storage/workspaces rather than inventing settlement.

PR8 source apply/undo, partial/ambiguous-worker continuation, later held-out/literature/examples/presentation/cut-over work and overall product acceptance remain unavailable or pending. Time/artifact budgets are admission limits, not hard containment; in-flight work may overshoot. Cost/token totals are observational/unavailable. Worker reports/diagnostics are unscored, with no worker-driven scored-feedback capability. No cleanup of retained runtime artifacts is authorized.

## Historical recovery phase, before additional native gates

Exact root/branch/HEAD reverified, supplied PR7 diff preserved. Recovered later logs show normal **241/241** (5/92/20/37/45/42), PR5 **9/9**, PR6 **21/21**, and final identical two-candidate-wave A12 **1/1**. Final A12 artifact: serial median **3497 ms**, parallel **1959 ms**, ratio **0.5601944524**, overlap **972/962/980 ms**. These are recovered observed results, pending final inventory verification, not the historical split-boundary timing.

`recovery-audit.log` is red: the checkpoint inventory omitted `host-exit.json` and `second-host-exit.json`, excluding PR4/PR5 and one PR3 host despite passing lane logs. `recovery-window-exits.txt` reconstructs only exit records newer than the retained before marker and no newer than the final after marker, with depth bounded to native host roots. Expected counts remain strict. Additional actual-owner native pause/cancel races and final mechanical audit/documentation are next; no unchanged passing A12 rerun is planned unless its execution path changes.

## Historical initial phase checkpoints

1. Identity and authority read: PASS. Production trace: ResearchService -> OwnerExecution -> MaterialJourney -> ResearchStore/Workspace/EvaluationEngine. Existing MaterialJourney run mutex currently serializes dispatch through native settlement; new wave work must retain one owner boundary while permitting only independent worker pipelines. Existing exact acceptance and Git CAS remain authoritative.
2. Implementation and red tests: pending.

## Historical implementation checkpoint

- Initial tree red target: `.runtime/pr7-gates/tree-red.log` (module absent). Tree/selection/rational tests subsequently passed.
- Additional red chronology target: `wave-regressions-red.log` found no-gain reset incorrectly followed sibling reservation order. `policy-green.log` passes 9/9 after folding serial decision commits instead; failure retained.
- Normal checkpoint `normal-third.log` / `.exit`: both no-emit checks and **238/238** (5 + unchanged 92 + 20 + 37 + 45 + 39). No skips/exclusions. Two impacted prior fixture failures were repaired: explicit actor selection is now supplied; single dispatch again propagates known worker failure instead of silently returning a receipt.
- A12 actual native product checkpoint `a12-fourth.log`: PASS. `a12.json` retains exact roots, full wave timing, environment and all three warmed samples; `a12-phase.json` persisted before each long lane. Serial median **3458 ms**, parallel **1935 ms**, ratio **0.559572**. Warmed parallel one-second workload overlaps **981/965/990 ms**. Serial setup **29/31/32**, dispatch/native **3102/3106/3114**, collection **311/321/326 ms**; parallel setup **26/31/28**, dispatch/native **1578/1580/1586**, collection **312/330/321 ms**. Node **26.7.0**, Linux **7.2.2-1-cachyos**, i7-13620H, 16 logical CPUs. One discarded warmup pair per mode; three measured pairs. Concurrency-one uses two one-candidate dispatch boundaries per pair and sums their complete operation durations; parallel uses one two-candidate boundary. Actor/evaluator turns outside dispatch/collection are excluded from the A12 execution-wave metric, not advertised as end-to-end campaign speedup.
- A12 failed intermediate logs: `a12-first.log` (transpiler helper missing in serialized fake actor), `a12-second.log` (ranking incorrectly received summary records without definitions, repaired to full saved evaluations), `a12-third.log` (fake actor reproposed a pruned previously attempted leaf). Fixed workload and 80% target unchanged.
- Full native PR2-6, final A12 after later changes, expanded adversarial coverage and final audit remain pending. No PR7 acceptance or PR8 authorization inferred from this checkpoint.

### Historical pre-final native checkpoint

PR2/PR3/PR4 real native lanes PASS **8/20/21** in `pr2-native.log`, `pr3-native.log`, `pr4-native.log`, each retained exit 0, no exclusions. Expanded PR7 real-Git reservation/controls/integration/ancestor and policy lane passes **35/35** in `wave-slot.log`.

Tightened A12 methodology before acceptance: both modes now use the **same two-candidate wave** with one atomic attempt/evaluator reservation; concurrency one reuses one native slot serially without an intervening actor ask. The earlier split-dispatch timing is historical, not the final A12 claim. Final same-wave timing must pass the unchanged one-second/three-warmed-wave/80% target. Final PR5/PR6/A12 calls next; their phase and exits are persisted before proceeding.
