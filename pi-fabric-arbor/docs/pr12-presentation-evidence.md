# PR12 presentation gate

Status: **Final local PR12 regression and both audits PASS.** The approved A02/A22/A26 and F2–F5 fixes work within current declared Fabric mechanics. Independent read-only reviews **PASS** for both the scoped lifetime revision and final reconciliation, with no required fixes. These are source/retained-evidence reviews, not additional test runs or a fresh full-application design audit. The spec supervisor accepts required PR12 evidence within these scoped limits and authorizes milestone publication followed by dependency-ready PR13. Exact publication identity is recorded in the acceptance ledger after push verification; no runtime/user-artifact cleanup is authorized.

## Final current gate

Main executed the complete current gate after the last production repair. All listed test groups completed naturally with zero failures, cancellations, skips or todos. Evidence is retained under `.runtime/pr12-gates/`; each final log has an exit file. The final audits verify current installed module/asset identity, package/public registrations and preserved prior assertions.

| Gate | Result | Log prefix |
| --- | --- | --- |
| Normal `npm run check`, both typechecks | **391/391**, groups 5/92/36/120/45/93 | `final-normal-approved` |
| `npm run test:pr12` | **41/41** | `final-targeted-approved` |
| Full source/clean-installed native/browser PR12 | **35/35** | `final-native-pr12` |
| PR2 native, refreshed after final shared-store repair | **8/8** | `current-final-native-pr2` |
| PR3 native | **20/20** | `current-native-pr3` |
| PR4 native | **21/21** | `reconciled-native-pr4` |
| PR5 native | **9/9** | `current-final-native-pr5` |
| PR6 native, including both five-stage journeys | **21/21** | `current-final-native-pr6` |
| PR7 unchanged native/A12 | **5/5** | `final-native-pr7` |
| PR8 native, including nine owner-loss blocks | **42/42** | `final-native-pr8-reconciled` |
| PR9 / PR10 / PR11 native | **13/13**, **4/4**, **9/9** | `final-native-pr9`, `final-native-pr10`, `final-native-pr11` |
| `npm run audit:pr12:lifetime` | **PASS** | `final-lifetime-audit` |
| `npm run audit:pr12` | **PASS** | `final-milestone-audit`; summary `audit.json` |

The prior-native total is **152**. Targeted tests overlap the normal gate and are not additional unique coverage. A12 ran without concurrent test workloads: unchanged three warmed waves per mode, real native overlap and **2029/3570 ms = 56.83%**, below the unchanged 80% limit.

### Independent final reconciliation review

Reviewer `74ba3ed7fc6f43018abc14b064c96e43` returned **PASS, no required fixes**. It independently checked all final exits/counts, current fixture and lifetime-module hashes, the clean-installed owner-module identities, all three exact-replay traces and all nine foreign-owner crash observations. It also reviewed the no-restamp production repair and preserved assertion multisets. Full retained verdict: `.runtime/pr12-design/final-reconciliation-review.md`. This is read-only reconciliation review, not another test execution or fresh full-application design audit; timing isolation was not independently reconstructed. Final documentation-only status updates follow that verdict.

### Reconciled characterizations and retained invariants

- **Byte-preserving reopen:** broader PR3 reconciliation found an actual metadata write on already-v2 owner reopen. Writer preparation now stamps schema metadata only for a fresh database. A targeted regression and actual foreign-root native probe preserve complete database bytes/inventory as well as logical facts. No read-triggered migration or sidecar exclusion was introduced.
- **PR2/PR3:** retirement now retains the exact returned native handle and proves terminal cleanup instead of expecting the former lost-create failure. Wrong-root refusal can occur earlier at resume-intent ownership admission. Original owner attribution, no dispatch and immutable facts remain mandatory.
- **PR4:** older fixture start/resume compositions now use ordinary public execute admission. Replacement-time fresh namespace reads wait until replacement completes; known-handle ambiguity and unchanged evaluator assertions remain. Genuine unknown/deadline cases still pass.
- **PR5:** the recovered baseline is the exact settled native result for the frozen original OIDs. Exact control replay returns the same receipt; only the original baseline and candidate evaluations exist, with four subject calls and no unnecessary rerun.
- **PR6/PR8:** separate bounded episodes and post-review user resumes use distinct generated intent IDs. Intentional replay instead resends the exact original closed request. All three pending-review modes prove the identical prior receipt and unchanged database SHA-256, inventory, complete projection, budgets and every observed native-effect counter. All nine SIGKILL cases remain owner-loss refusal proofs, not recovered ownership or successful resume claims.
- **Audit preservation:** obsolete byte-equality requirements were replaced with TypeScript-AST multiset checks retaining all executable prior assertions/test registrations: PR6 78, PR8 reload 136 and PR10 grounding 28 assertions. Only the two explicitly identified crash-denial text oracles are replaced; all other original crash assertions remain. Additional mechanical and native evidence checks require fresh IDs, closed replay, byte/inventory/budget preservation and zero additional native effects. Unchanged PR7 workloads/oracles, PR8 controls/recovery and PR9–PR11 unaffected fixtures remain byte checked. The only old-script change allowed is the additive delayed-PR10 regression path.

The final audit verifies **21 ordinary refs plus one acquisition-only scoped capability**, ten native requirements, one public skill, three internal roles, 43 reachable public-entry modules and 93 packed files. The scoped lifetime audit separately verifies 41 owner-entry modules and all current source/installed reload roots. The original whole-Pi held ask/spawn and application held-spawn assertions remain intact within the 35-case gate.

**Limits:** deterministic local native inference, not paid/scientific benchmark validation. Whole-Pi coverage holds ask/spawn; application coverage holds create/ask/spawn/wait/stop plus background research spawn. No owner-only or universal dependency/provider-replacement guarantee, new Fabric API/private import, context mutation, package upgrade, runtime cleanup or PR13 deletion is claimed. Reload the configured `arbor` application; catalog maintenance stays quiescent. Earlier red probes below are historical evidence, not outstanding failures of this final gate.

## Approved scoped lifetime: prior scoped production checkpoint

`src/managed/OwnerLifetime.ts` supplies the discoverable acquisition-only `arbor_lifetime.lease`; the passive parent registers a non-operational sibling `arbor.drain`. Its declared dependency makes it activate after the operational owner. On application-parent retirement or whole-Pi reverse-activation shutdown, the scoped inverse settles `ResearchService.dispose()` while the owner's original native context remains live. Only afterward does owner unload/abort occur; supporting storage stays with eventual `arbor.close()`.

**F2:** admission requires both this generation's acquired, unreleased lease and active guard status. A new owner cannot borrow an old guard's status. Release/abort is monotone, including failed cleanup. All public mutation routes, including substrate diagnostics, are gated; internal exact-owned cleanup does not traverse that gate. Tests cover waiting/loading/failed/quarantined/unloading/disposed guards, landed acquisition diversion, replacement, stale calls, and post-await identity admission.

**F3:** cleanup ownership is registered before writer setup and either provision. First-provision failure closes unpublished support; second-provision failure retains support until the staged `arbor` provider closes. Tests preserve real pending-review reads and both stores during an injected application-owner settlement failure. Sync/async lease failures remain cached and explicit; the lifetime provider never closes supporting storage. These fault/diversion tests exercise application seams, not a universal host replacement theorem.

**F4:** the generated manifest accounts for **21 ordinary refs plus one discoverable scoped capability**. Its intended caller is the owning-Pi managed drain, not an access-control promise. Empty closed input/null output, agent risk, scoped/ordered effect, no commands and no actor commitment are explicit. The owner keeps10 native requirements; actor commitment remains only `agents.self`. `audit:pr12:lifetime` checks declarations, packaged reachability, exported-only Fabric imports, clean-install module/manifest identity and native evidence.

| Check | Final observed result | Evidence under `.runtime/pr12-design/` |
| --- | --- | --- |
| Full PR12 source/clean-installed native/browser suite | **35/35** | `approved-pr12-native.log` |
| Unchanged whole-Pi held ask/spawn assertions | **4/4**, included above | `approved-lifetime-audit.json`, wholePi roots |
| Unchanged application research held-spawn regression | **2/2**, included above | audit application roots |
| Application substrate held create/ask/spawn/wait/stop | **10/10**, included above; exact saved handles and terminal local outcomes | audit lifetime roots |
| PR2 real native gate, strengthened create oracle | **8/8** | `approved-pr2-native.log` |
| Managed/lifetime tests | **36/36** | `approved-lifetime-unit.log` |
| Final targeted storage/presentation/retained-failure tests | **40/40** | `approved-targeted.log` |
| Normal check, both typechecks | **389/389**, before the final added failure test | `approved-normal.log` |
| Final affected research source lane, including added failure test | **119/119** | `approved-research-final.log` |
| Scoped manifest/package/native evidence audit | **PASS** | `approved-lifetime-audit.log` / `.json` |

The supervisor authorized replacing PR2's former lost-create characterization after retaining its unchanged red log (`approved-old-create-oracle.log`). It now requires the exact returned actor handle, terminal local stop, no actor activation and zero surviving members. Existing malformed/mesh/unknown stop and cleanup-pending tests remain. The new held-stop case verifies that any worker not stopped had already produced an exact terminal wait before the actor's held stop and that terminal state was persisted; it does not require stopping an already completed worker.

**F5 limits:** whole-Pi coverage holds ask/spawn; application coverage holds all five native refs plus background research spawn. The internal-owner probe returned `Unknown Fabric component: arbor.owner`, so it proves no owner-only retirement behavior. Dependency-driven/provider replacement remains unproven. Reload the configured `arbor` application; evaluator/source catalog changes retain explicit quiescent maintenance. No paid inference, dependency upgrade, new native transport/participant registry, context rewrite, publication or PR13 deletion.

Commands: `npm run check`, `npm run test:pr2`, `npm run test:pr2:e2e`, `npm run test:pr12`, `npm run test:pr12:e2e`, `npm run test:pr3`, `npm run audit:pr12:lifetime`. At this earlier scoped checkpoint, the full milestone `audit:pr12` was not yet reconciled. Its final current result is recorded above.

All checkpoints below are historical. Their blockers and aggregate counts do not override the final current gate above; they retain the evidence that motivated the approved architecture revision.

## Current implementation checkpoint: fail-closed cold readers

`ResearchStore.#read` now sets connection-local `PRAGMA locking_mode=EXCLUSIVE` on a new read-only connection before its first database access. The existing header check remains an early refusal, not an atomicity guarantee. A raced WAL admission fails closed without creating sidecars. The writer's locking mode and owner-only journal setup are unchanged, and every cold connection closes in `finally`. Admission errors survive a missing/already-rolled-back transaction; `SQLITE_IOERR_LOCK` is reported as read-only projection unavailability with its original SQLite error retained as `cause`.

The original strict journal-switch assertion is unchanged: it still executes the interleaving and compares every filename and SHA-256, with no WAL/SHM exclusions. Two added regressions verify disposal/owner-locking separation and original-error preservation when BEGIN fails. No instrumentation shim, immutable/unlocked snapshot, read-triggered journal conversion, hidden keepalive, broker, dependency change or Fabric-internal modification is part of the implementation.

| Acceptance check | Observed result | Retained evidence under `.runtime/pr12-design/` |
| --- | --- | --- |
| Production red baseline, without the design shim | 0/1; WAL and SHM created | `implementation-storage-before.log` |
| Production storage including strict race, live writer/reader, pinned WAL, committed WAL and crash recovery | **8/8** | `implementation-storage.log` |
| Same eight assertions against physically clean-installed ResearchStore/spec bytes | **8/8**; source/installed bytes match | `implementation-installed-storage.log`, `verify-installed-storage.mjs` |
| Both typechecks and normal `npm run check` | **373/373**, groups 5/92/20/118/45/93 | `implementation-check.log` |
| Actual source and clean-installed Pi/CLI/browser journeys | **2/2** | `implementation-native.log`; successful roots `command-Nzc5z1`, `command-eB2yWp` under `.runtime/pr6-host/` |
| Unchanged held-spawn reload on declared Fabric | **0/2**, active1 rather than0 | `implementation-native.log`; failed roots `command-XrOkMO`, `command-xBc6AX` |
| Exploratory latest published Fabric, in an isolated app copy | **0/1**, same active1 failure | `published-host-probe.log`, `probe-published-host.mjs` |
| Existing strict milestone audit | Still red at its retained historical normal checkpoint; this is not a new normal-check failure | `implementation-audit.log` |

Commands, from `pi-fabric-arbor/`:

```sh
node --import tsx --test tests/research/pr12-storage.test.ts
node .runtime/pr12-design/verify-installed-storage.mjs .runtime/pr6-host/command-eB2yWp/node_modules/pi-fabric-arbor
npm run check
PLAYWRIGHT_BROWSERS_PATH="$PWD/.runtime/pr12-browsers" node --import tsx --test --test-concurrency=1 --test-name-pattern='actual owning Pi intake research presentation exports and controls|actual reload retains held agents[.]spawn' tests/integration/pr12-presentation-host.test.ts
node .runtime/pr12-design/probe-published-host.mjs
npm run audit:pr12
```

Observed environment: Linux, Node v26.7.0, SQLite 3.53.4. The app's declared Fabric remains 0.83.0. Registry/profile 0.89.0 was explored without changing the app peer range, lockfile or installed packages; it is not declared compatible or adopted. Its real held-spawn probe fails at `.runtime/pr12-design/host-latest-bN2j68/.runtime/pr6-host/command-pnowVv`. Read-only inspection also finds the same captured invocation signal and abort-before-disposal ordering in that published runtime.

Current test-observed worker IDs are `f2f8cad92bf34a04a12b080c9db683bb` (declared source), `b947a6ffb0d44532b40a364c35f2ad70` (declared installed), and `a6cc4b735fe14b518e9e5dbf9a1159e4` (published-host exploration). All three traces show actor stop but no returned worker stop/wait receipt. The hosts exit naturally; their RPC assertions fail. These are historical bridge observations, not ownership handles adopted by Arbor or claims of currently live workers. `implementation-evidence.json` retains native IDs, roots, exits and exact runtime/check counts.

**Pre-revision prerequisite (superseded for the tested scoped reload paths):** supported cancellation-safe delivery/authoritative reconciliation of already-accepted native launches, followed by exact-owned stop/wait before retirement releases capabilities/storage. No compliant app-only fix or working published host update is established. Implementing that upstream behavior requires a separately authorized Fabric workstream; current instructions prohibit Fabric-internal changes. A09/A11/A27/A29 and PR12/PR13 therefore remain blocked. Prior full milestone/native evidence and the strict audit still require complete reconciliation before publication.

## Historical blocker evidence before the cold-reader repair

The sections below preserve earlier commands, failures and reasoning. Their A17 red status, external-lock prerequisite and aggregate test counts are superseded by the current implementation checkpoint above; their held-spawn ownership diagnosis remains relevant.

## Exact native ownership diagnosis and external prerequisites

The latest failed source/installed traces were inspected directly by Main, without opening research SQLite files or modifying any installed runtime. Extracted facts are retained in `.runtime/pr12-gates/blocker-native-identities.json`; the bounded extraction script is `extract-blocker-native.mjs` in the same directory.

| Fixture root under `.runtime/pr6-host/` | Native worker observed by the test bridge | Native actor stopped during retirement | Native root/host/owner identity |
| --- | --- | --- | --- |
| `command-GfdaJ9` (source) | `315c41391c774a55a34e26ed0ba52834` | `40fc4e30b9504cd1b0cc041dc4a3ecd7` | `session:01a07ea3-15f0-7244-9bb3-24d4753b7e27` |
| `command-EyOkJ6` (clean-installed) | `9ef3ff81f9a9429b83b9a7df5e2d7cb4` | `f7848aa520964b7790f8a8d93513721b` | `session:01a07ea3-478d-75ea-89ff-8065cb52ce70` |

Both traces show `agents.spawn` returning `status: running` to the test bridge, held result delivery, native actor stop/status confirmation, the exact worker still `running` in public members, then barrier release. Neither trace contains a returned `agents.wait` or `agents.stop` result for that worker. These are historical observations while each disposable owning host was alive, not claims that either worker is currently live. Bridge-observed IDs are not handles delivered to the production owner and must not be retroactively adopted.

Main traced the physically app-installed Fabric runtime read-only. `node_modules/pi-fabric/dist/fabric-runtime-state.js:1853-1862` fixes the invocation signal when `context.call` starts; `:2034-2039` aborts it during unload. The teardown exemption affects new calls, not the already-started spawn. Arbor's `OwnerExecution.ts:555-565` can attach a target and start its owned wait only after that call resolves. `#track`, fixed-point `#drain`, `service.dispose`, deferred disposal and provider `close` already retain and await their owned promises/storage; retaining them cannot turn an already-rejected promise into a delivered native handle. Acquiring a scoped capability is not an alternative for emission-shaped spawn, and no public cancellation override/raw-result settlement was established. No private import or runtime modification was made.

**Genuine block:** PR12 A11/A29 (also the associated A09/A27 lifecycle boundary) requires authoritative launch ownership/settlement across this reload. Smallest external prerequisite: a supported and verified host behavior on the existing public call path that delivers or authoritatively reconciles the accepted spawn handle before cleanup settles. This is a required behavior, not a proposal to add/change Fabric's API. On availability, rerun the exact source/installed held-spawn command below before accepting anything.

**Separate A17 block:** strict journal-switch read admission still produces WAL/SHM sidecars. The tested Node SQLite path does not atomically bind the read-only header check to establishment of its SQLite read transaction. Smallest external guarantee needed by this candidate implementation is exclusion of external journal-mode switches/database replacement across that interval; owner DELETE configuration alone does not provide it. No such guarantee is configured or assumed, and no assertion exclusion, unlocked/immutable snapshot, hidden keepalive, or read-triggered conversion is accepted. An alternative no-write admission implementation would require its own passing strict probe.

No PR12 commit/publication or PR13 work is authorized by these diagnostic observations. Exact failed commands and exit results follow; current branch/HEAD remain `arbor/refactor-pr0-pr1` / `823f5490e86179391505710ff66e7bd580e8aa92`, with mixed PR12 and delayed PR10 repairs unstaged/uncommitted and retained artifacts untouched.

## Supervisor probe reconciliation after delayed PR10 repairs

Main reran the current source and clean-installed probes without editing assertions:

```sh
node --import tsx --test --test-name-pattern='resume cannot bypass changed agent|actual reload retains held agents[.]spawn' tests/integration/pr12-presentation-host.test.ts
node --import tsx --test --test-name-pattern='journal switch' tests/research/pr12-storage.test.ts
```

First command: **4/6 pass**, exit1. All four source/installed agent deny/ask cases pass with zero native create/spawn effects, including direct unadmitted execute-resume rejection. The two failures are held-spawn reload settlement, active1 instead of0. The current test at line119 belongs to that reload case, not agent-policy denial. Second command: **0/1**, exit1, sidecar inventory still changes. Logs: `.runtime/pr12-gates/supervisor-policy-reload.{log,exit}` and `supervisor-storage.{log,exit}`.

This corrects the delayed supervisor description without accepting PR12: ordinary policy admission is repaired; authoritative native result delivery on retirement and strict SQLite read admission remain unresolved. PR11 prerequisites are satisfied, but these runtime-boundary failures still gate PR12 and PR13. No new API, guessed native identity, relaxed assertion, read-side conversion or publication was introduced.

## Independent Main blocker reproduction

Main independently executed both strict probes after the repair worker settled, without changing their assertions:

- `node --import tsx --test --test-name-pattern='actual reload retains held agents[.]spawn' tests/integration/pr12-presentation-host.test.ts`: exit1, both source and clean-installed cases fail with active reservation `1 !== 0`. Logs: `.runtime/pr12-gates/main-held-spawn.log` and `.exit`.
- `node --import tsx --test --test-name-pattern='journal switch' tests/research/pr12-storage.test.ts`: exit1, reader creates `research.sqlite3-wal` and `research.sqlite3-shm` after an external mode switch; database hash remains equal. Logs: `.runtime/pr12-gates/main-journal-switch.log` and `.exit`.

The primary execution blocker concerns PR12 and A09/A11/A27/A29: the existing public call rejects on retirement before delivering the accepted worker handle, so Arbor cannot correlate and await exact-owned cleanup. Native IDs cannot be guessed from labels or adopted through another owner. The two-action ordinary policy repair does not fix lost result delivery. Required external prerequisite is verified supported behavior on the existing public path preserving authoritative spawn ownership through reload; no Fabric API modification is proposed or authorized. The strict storage-inventory case remains a separate A17 failure under concurrent external journal-mode changes.

Current branch is `arbor/refactor-pr0-pr1`, HEAD/tracking `823f5490e86179391505710ff66e7bd580e8aa92`. PR2-PR11 milestone commits are published. PR12 changes remain uncommitted and unstaged because failing behavior cannot be presented as a verified milestone. PR13 stays dependency-gated. Next concrete task is rerunning the exact held-spawn probe once that external execution prerequisite is available, followed by the strict storage probe and the full PR12 source/installed gate. User artifacts and ignored native evidence are preserved.

## Current repair checkpoint

Exact worktree, branch and full HEAD below were reverified unchanged. Pre-existing changes and ignored evidence were preserved. Main alone edited. No sibling bridge, private Fabric API, custom runtime, policy clone, external research dataset, original-checkout installation change or blacklisted Pi root was used.

| Check | Implemented and executed evidence | Status |
| --- | --- | --- |
| O1 | Agent-risk start/control-resume do not execute command/provider evaluation. Command programs compose ordinary execute-risk evaluation. Source/clean-installed provider execute deny/ask and agent deny/ask after reload reject effects, including direct unadmitted execute resume. | Narrow policy repair passes. R3 is a separate lifetime blocker. |
| O2 | Bounded attributable background refusal survives paused/old-generation failure without rewriting terminal facts or inventing a queue receipt. Service disposal tracks its public promises. | Service regressions pass. A retained wrapper is not native settlement: see R3. |
| O3 | Discard the superseded held ask before proposal admission, then obtain fresh observations in the existing bounded actor loop. | Actual source/installed held-ask steering passes. |
| O4 | Complete owner-filtered active count precedes the bounded 128-row picker. Explicit IDs still resolve beyond it. | Two live runs separated by 128 records regression passes. |
| W1 | Candidate owner-only verified DELETE setup uses SQLite locks, FULL synchronous mode and quiescent WAL checkpoint. Fresh activation stays passive. Reads never convert/repair. Committed WAL-only frames, pinned reader, live writer, verified hot-journal spill/crash/recovery and original cold test pass. | NOT accepted. Deterministic external journal switch creates WAL and SHM. |
| W2 | EventSource loss explicitly marks the projection disconnected/stale. | Production browser regression passes. |
| W3 | Single-flight listener startup, retained late-handle close and request-generation fences cover source, intake, run/candidate pickers, topology/editor callbacks and URL notification. Repeated close also retires an in-progress directory replacement. | Seven focused cases pass, plus final actual source/installed UI journeys. |
| W4 | Selecting B immediately clears A's binding caption, including failed B retrieval. | Production browser regression passes. |

### R1: implemented two-action owner admission

Public component/provider contracts and installed implementation were read and traced. Captured component calls retain provider addressability but do not independently apply ordinary native-risk approvals. No descriptor claims otherwise.

The historical `repair-agent-policy-red.log` recorded one native effect instead of zero after reload changed agent approval to deny, at `.runtime/pr6-host/command-98L8gt`. The initial no-route conclusion was challenged by feasibility review `dd02e40bf99044659737976f0c0c68d9` and superseded for **policy admission**, not reload lifetime.

Ordinary agent-risk `arbor.control resume` now records a genuine domain intent without reconciliation, Git, evaluation or native work. Its receipt explicitly says execution has not started. Ordinary execute-risk `arbor.runResearch` claims exact command/revision/material/epoch/owner/component/server-owned-generation bindings once, before any effect or background return. Direct, missing, stale, conflicting and consumed claims fail closed. Initial execution consumes only a fresh current-generation revision-zero start. No permission token or Fabric API was introduced. This admits one bounded operation, not continuous policy revocation or fresh per-native-call approvals.

The final native gate proves source/installed deny/ask at both ordinary boundaries. Its two failures are R3, not the former policy bypass.

### R2: strict journal-admission race

Executed probe from `pi-fabric-arbor/`:

```sh
node --import tsx --test --test-name-pattern='journal switch' tests/research/pr12-storage.test.ts
```

`targeted-strict-checkpoint.log` proves DELETE can become WAL between header inspection and SQLite admission. The database hash remains identical after the external switch, but the reader creates both `research.sqlite3-wal` and `research.sqlite3-shm`. The assertion now compares every filename and SHA-256, with **no sidecar exclusion**. No immutable read, unlocked snapshot, read-triggered conversion or hidden keepalive was introduced.

`ResearchStore.ts:69-80` still cannot make header inspection and reader admission atomic. No qualifying bounded mechanism is established in the existing public Node SQLite/filesystem surface. Minimal external prerequisite: enforced exclusion of journal-mode changes and database replacement from before header inspection through admission and establishment of the protecting read transaction. Owner DELETE configuration or a prior quiescence observation is insufficient. This is a required guarantee, not an implemented fix or a locking-broker/migration proposal.

### R3: public-call abort loses held spawn settlement

Executed strict probe from `pi-fabric-arbor/`:

```sh
node --import tsx --test --test-name-pattern='actual reload retains held agents[.]spawn' tests/integration/pr12-presentation-host.test.ts
```

`native-checkpoint.log` fails source and clean-installed cases with **active 1 instead of 0**. Exact latest roots are `.runtime/pr6-host/command-UVNn17` and `command-OerueV`. Both hosts exit naturally with code0, but their RPC assertions fail. Earlier diagnosis roots `command-G09aIj` and `command-KnkpJK` retain native spawn, held reply, actor retirement, still-running worker and release without worker stop/wait. The saved attempt has no authoritative native handle/digest and retains `cleanup_pending` with one reservation. Do not call this settled.

Installed Fabric evidence, under `/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric/`:

- R3a: `dist/fabric-runtime-state.js:1873-1882` copies the component signal when the call starts. The teardown exemption applies only to later calls. `:2028-2059` aborts before disposal.
- R3b: `dist/chunks/chunk-7X72JCGN.js:1201-1204,1255-1261` abort-races invocation and result middleware. `chunk-7TB7NXSL.js:10-35` cannot deliver a late value after rejection wins.
- R3c: Arbor `OwnerExecution.ts:216-220,539-554,594-610` therefore tracks a rejected wrapper, marks launch ambiguous and never attaches the returned handle. Draining only stops known owned targets.

Independent challenge `d108c2283e4a4be4a4dc9bd93add1651` confirms no compliant app-only route is established. Public `call(ref,args)` exposes neither raw settlement nor cancellation selection. Retaining its promise or committed view does not retain native result delivery. Defer/effect cannot recover the lost handle, and scoped acquisition does not apply to native spawn. Do not adopt guessed identities by name, cwd or membership.

Minimal external prerequisite: upstream-supported, verified behavior on the existing public path that preserves authoritative handle ownership and actual native settlement across reload, allowing exact-owned cleanup to be awaited. This specifies required behavior, not a new Fabric API proposal. The strict `active === 0` probe remains unchanged. The earlier narrow owner review does not establish this stronger lifetime property.

### Executed gates and review

All logs below are in `.runtime/pr12-gates/` and completed naturally.

- G7: `normal-strict-checkpoint.log/.exit`: exit1. Source/test typechecks pass. Groups **5/92/20/103** have **5/92/20/102** passes and only R2 fails. The chain stops there. Required complete normal count is **358** (5/92/20/103/45/93), not an observed green total.
- G8: `native-checkpoint.log/.exit`: **21/23**, exit1, only source/installed held-spawn reload fails. Passes include both nine-journey hosts, ask/spawn-held ordinary pause/steer/cancel controls, genuine review of a separate pending owned run while the other remains held, held-ask steering/reload, provider execute deny/ask, agent deny/ask after reload with direct-call refusal, execute/write denial and pending review. No queued control acknowledgment substitutes for a receipt or settlement.
- G9: `targeted-strict-checkpoint.log/.exit`: **36/37**, exit1, only R2 fails. `repair-request-final.log`: **7/7** W3 cases. The general-picker and directory-replacement probes were reproduced red before repair. Full normal/targeted reruns include their green assertions.
- G10: Historical `native-pr{6,7,8,9,10,11}-current` lanes exited0 with **21/5/42/13/4/9**. Post-repair `native-pr*-repair-final` files are absent and are still required by the audit. Historical A12 remains serial3543ms, parallel1996ms, ratio0.5633643804685295, three warmed samples. No current acceptance is inferred from these old lanes.
- G12: `repair-admission-unit.log` **4/4**, `material-owner-final.log` **93/93**, `evaluator-ui-final.log` **45/45**. These bounded checks are retained separately, not presented as a completed normal chain.
- G11: Owner review `02f627dcf5894609a9bd5a95ba2d24dd` narrowly approved admission, then the expanded actual held-spawn probe and challenge above disproved the broader lifetime claim. Read review `bd5f56f48e6140feba9974fb12c83348` identified R2 and weak fixtures. Follow-ups `0fd0e90a346c40f9894fc347c869f12b` and `5211f6a876eb48f88a8d039d633d6c71` found late UI branches, subsequently reproduced and fenced. None grants full PR12 acceptance.

### Matching artifact checkpoint, not acceptance

`checkpoint-artifacts.json` records `accepted:false`, actual gate failures, **21 actions**, **10 native requirements**, **42 reachable public-source modules**, **92 packed files**, **52 byte-matching installed runtime/asset files**, one public skill, three internal roles and eleven upstream dispositions. Fingerprint remains `67b8a1698745a922913187344be038b699ec2a62e6d49ebe0b7c3b1d05e504b7` and its source is unchanged. This verifier opens no database and does not bypass the acceptance audit.

Matching successful roots: source `command-tw6tdC`, installed `command-H0grig`, pending review `command-yV9QBd`, all under `.runtime/pr6-host/`. Seventeen PNGs have recorded hashes. Main inspected both final browser trees at revision149 and pending review at revision26. Trees visibly contain all four candidates, failed-check lessons, uncertainty and existing exports. Pending review explicitly says the browser cannot answer. These are browser-phase images, not a claim that later native controls are pictured.

The strict acceptance audit remains red on the current normal exit and also requires green native/impacted-prior lanes. `git diff --check` passes, staging is empty, and the exact baseline is unchanged. No runtime cleanup or retained-artifact deletion was performed. Do not continue to acceptance/publication until R2 and R3 have real conforming proof.

## Baseline and authority

Main exclusively edits application and plan in `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, branch `arbor/refactor-pr0-pr1`. Initial worktree clean at full `823f5490e86179391505710ff66e7bd580e8aa92`. Binding authority: deep-refactoring plan PR12/A17/A22/A30 and nine journeys, scoped AGENTS, acceptance ledger and latest PR11 evidence. Prior gates are historical until rerun below. Runtime evidence remains under ignored `.runtime/`, with no cleanup authorized.

## Previous checkpoint acceptance ledger (superseded by repair checkpoint above)

| Check | Implementation and proof | Current status |
| --- | --- | --- |
| P1 / A17 | `ResearchStore` owns transactional facts. `SourceView` feeds owning Pi, CLI and production browser with current revision, tree/incumbent/evaluations/decisions/uncertainty/failures/stop reason and native references. Candidate diff uses recorded parent-to-selected OIDs. Baseline export is distinct. | Live source/installed proof passes. Cold-read blocker remains. |
| P2 / A17 | GET-only listener has no service/owner callback. Read/replay/SSE/diff/artifact requests and rejected mutation/disguised-GET attempts preserve research/control/material/index/refs/export bytes and logical projection. | Live source/installed proof passes. Cold-read blocker remains. |
| P3 / A22 | Configuration-only intake retains normal profile/preset precedence and configured writer tools. Current-run ambiguity is explicit and project-scoped. Candidate UI pins revision. Actual Pi RPC choices use public commands and ordinary Fabric permission, not fake UI receipts. | Live proof passes. Complete-inventory ambiguity and provider-policy blockers remain. |
| P4 / A30 | Public `/fabric dashboard` dispatch and `/fabric log` editor navigation reuse native facilities. Generic provider activity distinguishes submission/receipt/failure. No participant registry, writable operational cache or transcript mirror. | Source/API review, native command/ID evidence |
| P5 / A22 | One rewritten public skill, three internal roles, conditional references, eleven upstream dispositions and exact21-action manifest/10 owner requirements. | Packaging/skill audit pending |
| P6 / A17 | Owner-only JSON/report/trajectory exports include cumulative admission and exact revision. Source-journal retrieval verifies canonical-object identity, text exports their saved text identity. Retrieval never generates. | Focused source regressions and native apply/retrieve/undo pass |
| P7 / A30 | Actual owning-Pi source/clean-installed nine journeys plus real Playwright production-listener DOM/screenshots, pending review and live SSE. | Seven native tests pass, including late replies and active controls. Current installed asset parity needs refresh after repairs. |
| P8 | Normal/targeted/current-package audit and impacted prior native lanes, retained92 and unchanged PR6/7 A12/8/9/10/11 assertions. | Normal336/targeted15 passed before the added failing cold test. Current audit refuses those obsolete totals. Impacted native reruns remain in progress. |
| P9 | Independent repair review, full explicitly staged diff review, ordinary commit/push/remote equality and draft PR3 comment. | Independent reviews require repairs. No staging or publication. |

## Previous recovery checkpoint: historical findings and proof

### Observed gates and exact source boundary

- G1: `.runtime/pr12-gates/normal-current.log` and `.exit` completed naturally with groups **5/92/20/85/45/89 = 336**, all other counters zero. `targeted-current.log` completed **15/15**. Both predate the subsequently added cold-read test. Do not reuse them as current acceptance.
- G2: `native-current.log` completed **7/7**, zero failed/cancelled/skipped/todo. It proves source and clean-installed nine journeys, ordinary source/installed controls during held owner research, execute/write denials and actual pending review. Live browser probes include late candidate/replay/refresh-error guards, current SSE refresh, recorded-parent diffs, GET-only requests and unchanged research/control/material/ref/export inventory.
- G3: `cold-read.log` fails `PR12 cold offline projection and CLI reads preserve database bytes and inventory`. After writer close, `readOnly:true` creates `research.sqlite3-wal`. Database bytes and logical facts remain equal, but the strict inventory assertion fails. The regression remains intact. No new WAL exclusion, immutable read, unlocked read or hidden keepalive workaround was added.
- G4: Current test typecheck passes in `typecheck-checkpoint.log`. `audit-current.log` fails intentionally against obsolete normal counts: expected **337** (5/92/20/86/45/89), observed336. Targeted current expectation is **16**. Those are required counts, not observed passes. Further repairs/tests must update expectations truthfully.
- G5: Current native PR6 **21/21** and PR7 **5/5** pass. A12 has three warmed samples, real overlap, serial3543ms versus parallel1996ms, ratio0.5633643804685295. The serial shell continues PR8/PR9/PR10/PR11 into `native-pr{8,9,10,11}-current.log` and matching `.exit` files. They were pending at this checkpoint. The retained serial shell was PID1413530, running PR8 with40 completed case lines and no failure marker at the last inspection. Verify current process identity and `.exit` files before starting another suite. Do not duplicate or terminate the retained runner blindly. Older `*-final` logs are retained but do not substitute for current exits.
- G6: Retained92 and fingerprint source remain unchanged. `tests/git/fingerprint.test.ts` SHA-256 is `67b8a1698745a922913187344be038b699ec2a62e6d49ebe0b7c3b1d05e504b7`. Existing assertions and the declared dev-only Playwright lock delta are preserved. No legacy deletion or runtime cleanup occurred.

### Successful roots and artifact-only audit

`.runtime/pr12-gates/checkpoint-artifacts.jsonl` appends an explicit `accepted:false` record with all **17 screenshot SHA-256 digests**, matching native/browser rows and clean exits. It reads existing files only, opens no SQLite connection and generates no research/export artifact. The matching roots under `.runtime/pr6-host/` are:

| Proof | Successful root | Main inspected image | SHA-256 |
| --- | --- | --- | --- |
| B1 source | `command-qgo4jE` | `pr12-final-tree.png` | `338199a245b1ca89de5037cf05d5835b031a084d20f93cd5bc8bf9b7cc8694d3` |
| B2 clean-installed | `command-qb3ZyA` | `pr12-final-tree.png` | `2a2e0aa216f27b1840de2a04a776da396f09afbeb4cdf4b1549835a476c02bfd` |
| B3 pending review | `command-qWrNQv` | `pr12-pending.png` | `ec7a8948cae6c23e5c55d8f2457ce8d5c6aeb4d7c7ecaac0cd90520920f1ff51` |

Each root has `{code:0,signal:null,killed:false,error:null}` and no RPC failure. Main inspected these exact successful-root images. They are local ignored proof, not published assets. The installed root predates later edits to `src/presentation/PiPresentation.ts`, `src/cli/read-only.ts` and `skills/fabric-arbor/SKILL.md`. The artifact audit records these three mismatches explicitly. A fresh successful installed proof is mandatory after repairs.

### Additional repairs already in source

- D1: Removed the attempted managed sibling control bridge and every registration/import/reference. Installed Fabric component `context.call` does not apply ordinary risk approvals, so that approach is not accepted. No new component or owner refs remain.
- D2: Owning-Pi start/resume now requests `background:true` through ordinary execute-risk `arbor.runResearch`. The existing ResearchService retains/tracks bounded work and its generation-owned controller, while controls use ordinary Pi/Fabric tools. The result is saved projection facts, not a durable queued receipt. Blocking programmatic calls remain unchanged. Actual source/installed normal active controls pass. Background refusal/retirement/ask boundaries below are not yet accepted.
- D3: Confirmed `expectedSpecId` rejects changed configuration/evaluator/model identity before capture. Explicit `--run` selection disambiguates commands and reaches runs beyond the picker. Configured/active storage mismatch requires reload. Missing explicit browser runs no longer select another run.
- D4: Export preflight rejects pending review/integration and abort before writes, counts owned bytes plus the new reference, and rechecks revision before its synchronous write/registration. Source-operation artifacts snapshot immutable command receipts. Recovery undo selects the original completed apply and excludes already-undone operations.
- D5: Regenerated the full public action/command manifest, added whole-manifest equality audit, retained one public skill/three internal roles/eleven upstream dispositions, and updated command-lifetime documentation. `/arbor lessons --run RUN QUERY` now matches the parser.

### Final independent review: not accepted

Owner reviewer `19b1bc8dd9c54b2ca6e3b46ed1a90357` completed a full read-only review and explicitly rejected acceptance. Read/browser reviewer `e2fe532f9baf4dfeab0f5c2a9db86958` returned a full rejection and concrete findings, but its agent transport status was `failed`, not a clean completed gate. Neither reviewer ran tests or edited files. Their source-derived reproductions are not executed evidence except cold-read failure reproduced by Main.

| Finding | Location and remaining obligation |
| --- | --- |
| O1 / owner R1, P1 | `ResearchService.ts` start/control-resume and `EvaluationEngine.ts` provider route: a pre-existing non-command provider can execute through an agent-risk start/resume and captured component calls, bypassing ordinary execute approval. Give provider evaluation equivalent execute admission and add provider execute-denial proof. Do not claim a blanket policy pass from command-evaluator denial alone. |
| O2 / owner R2, P1 | `ResearchService.ts` background catch only records current-generation ready/running failures. Saved-role or reconciliation failure while paused/old-generation can disappear. Surface a bounded attributable refusal without overwriting terminal state or inventing a durable receipt. Add failed-resume and held-background retirement tests. |
| O3 / owner R3, P2 | `OwnerExecution.ts` outstanding `agents.ask` response becomes stale after steering advances revision and currently interrupts research. Reject the superseded proposal, then obtain fresh observations within the existing bounded loop. The passing active-control probe holds spawn, not ask. Add an actual held-ask steering probe. |
| O4 / owner R4, P2 | `ResearchStore.runs()` truncates to128 before Pi tests owned live-run uniqueness. Two live runs with one outside that window can produce a silent default. Determine uniqueness over the complete owner-filtered inventory before applying a bounded picker. |
| W1 / read F1, P1 | `ResearchStore.ts:47-63`: cold read-only WAL opening creates a file and blocks A17. Reviewer suggests owner-side verified rollback journaling with explicit quiescent handling of existing WAL stores. That is an unimplemented, unproven direction, not permission for migration, read-triggered conversion, unlocked snapshots or assertion exclusions. Check background reader/writer contention if adopted. |
| W2 / read F2, P2 | `web/read-only/app.js` handles custom unavailable events but not EventSource transport error. Owner stop/reload can leave old normal status visible without disconnected warning. Add transport-loss display and behavioral proof. |
| W3 / read F3, P2 | `PiPresentation.ts` listener startup is not single-flight or fenced against close. Concurrent starts or close-during-start can retain an untracked listener. Track in-flight startup and close invalidated late results. |
| W4 / read F4, P3 | Candidate B failure can retain candidate A's binding caption at the same revision. Clear/replace the binding when candidate selection begins, and test the failure state. |

### Resume order

1. A1: Reverify exact root/branch/HEAD, preserve all working changes and ignored evidence, and inspect these current source paths before editing. Repair O1–O4/W1–W4 and obtain clean independent re-review. Do not restart PR12 from the older three-test checkpoint.
2. A2: Keep the cold assertion strict. Run focused regressions and direct native lifetime/ask/policy probes. Then run truthful normal/targeted counts, source and fresh clean-installed PR12/browser gates and impacted prior lanes. Inspect matching successful-root screenshots and run the complete package/audit gate with no source/asset mismatches.
3. A3: Only after independent acceptance, update this ledger and the plan, explicitly stage intended PR12 paths, review the entire cached diff in bounded chunks, then perform ordinary commit/push/remote equality and comment on existing draft PR3. Nothing is staged or published at this checkpoint. No PR13 work or artifact cleanup is authorized.

## Earlier observed local gates (historical)

- `normal-fourth.log`: both no-emit checks, groups5/92/20/79/45/88 = **329 passed**, zero failed/cancelled/skipped/todo. The retained92 lane and fingerprint source are unchanged.
- `target-review.log`: **15 passed**, including six presentation tests and nine service tests. `test:pr12` now selects all eight PR12-named regressions across those files.
- `native-reload.log`: **3 passed**. Source and clean offline-installed packages each perform actual no-ID intake -> baseline -> four candidates (gain, tie, failed check, further gain) -> Pi candidate diff/log selection -> source apply -> three exports -> production browser/CLI shared revision/read noninterference -> SSE owner steering -> exact undo -> lessons/pause -> actual Pi reload/listener closure -> unchanged-spec resume -> cancel. A third real owner run retains pending review through browser reads before its actual Pi approval dialog.
- `.runtime/pr12-gates/native.jsonl` records successful roots and journeys. `browser.jsonl` records production URLs' retained root, revision, screenshots and request/noninterference assertions. Earlier incomplete roots remain retained and are not final evidence. The audit must select matching successful native roots, never merely the last screenshot.

The test client uses Pi's documented RPC JSONL protocol. `pr1-reload` is the retained test-only command calling actual `context.reload()`, not an app reload implementation. Fake inference is limited to native providers, with real owner/coordinator/worker/evaluator processes, Git, SQLite and CLI. Playwright is a declared dev dependency and uses ignored local Chromium storage. There is no paid inference, download of datasets, system-Python install or alternate profile.

## Nine permitted journeys

| Journey | Executed surface |
| --- | --- |
| J1 current material | Owning-Pi intake over dirty indexed/working/untracked material. Host asserts original index/refs/bytes at completion. |
| J2 objective/evaluation | Actual RPC input/select/confirm shows resolved material/evaluator/checks/model roles/limits. Same configuration resolver as owner start. |
| J3 baseline | Native selected evaluator before candidate dispatch, exact snapshot and native IDs in shared browser/CLI evidence. |
| J4 useful research | Persistent native coordinator drives four hypotheses and independently graded outcomes through the existing owner. |
| J5 inspect | Pi one-selection diff/native log reference plus browser tree/table/diff/log/replay and shared current revision. |
| J6 keep/discard | Native measured keeps and invalid/tie discards remain distinct. Source apply/undo requires separate actual Pi dialogs. |
| J7 control/resume | Public no-ID steering/pause/resume/cancel with distinct receipts. Actual source reload closes browser then same-owner resume retains saved spec. Active-work/recovery uncertainty remains covered by impacted PR7/8 gates. |
| J8 reuse lessons | Public `/arbor lessons` retrieves exact source-linked hypotheses. PR10 grounding/experience gates remain required. |
| J9 normal update | Source and clean-installed actual Pi reload/doctor/resume, with no build or certification ceremony. Existing PR1 install gate proves edited-source sentinel reload and one public skill. |

## Independent findings and repairs

Read-only reviewer `32d60fba39f6405790c49a90e3c010a2` identified seven source defects. It ran no tests and did not grant acceptance.

| Finding | Repair and regression |
| --- | --- |
| F1 historical candidate selection became latest attempt | Keep/discard list only latest eligible attempt per hypothesis and pin selected revision before mutation. Source regression rejects changed selection after UI. |
| F2 creation-order default could target wrong run/project | Unique live owned run default, explicit ambiguous selector, state-directory-scoped session selection. New starts select their requested run. Source regression covers two runs/projects. |
| F3 candidate diff included incumbent history | Parent-to-candidate diff, separately labeled captured baseline. Native probe compares every frozen candidate against independent Git parent diff. |
| F4 source-operation retrieval digest mismatch | Verify canonical journal object versus saved object digest and exact serialized bytes. Source regression plus actual apply/browser/CLI retrieval/undo. |
| F5 repeated exports bypassed cumulative artifact admission | Count already owned artifacts before admitting new bytes. Source regression rejects new output while preserving inventory. |
| F6 awaited final export write could orphan a concurrent stale output | Recheck duplicates/revision after material/accounting awaits. Bounded final write/receipt is synchronous. Concurrent-control regression refuses before output. Process/storage failure still retains files, never claims committed success. |
| F7 obsolete availability/doctor claims | Report current bounded research/evaluation/presentation capability while distinguishing configured/available/tested. Native doctor and package registration assertions. |

Main also reproduced the native writable-role/deferred-preview failure, fixed browser root run-query rejection, preserved scaffold-before-run, corrected profile-default precedence and added in-flight candidate/replay guards. Native/browser tests exposed only fixture deficiencies after those repairs: a bounded multi-command output buffer and exact diff trailing-newline assertion. Those are not product fixes or passing evidence before repair.

## Limits and non-claims

Live-owner probes preserve research/control/material/export bytes. This is not a cold-store no-write conclusion: the added cold regression observes a new SQLite WAL sidecar and remains failing. SQLite `-shm` reader coordination is excluded from byte snapshots, not from logical research-state equality. Replay lists recorded events, not reconstructed historical files. Browser native summaries are saved references, not live ownership or full transcript copies. Exact revision mismatches require refresh. Unknown native handles, costs and cleanup remain unknown.

Role guidance is artifact-reviewed and links are audited, not a model-quality benchmark. Held-out labels retain development/selected/final distinctions. Trusted worktrees are not containment. Source recovery after crash keeps the original-intent provenance rules. No automatic runtime cleanup or PR13 deletion is authorized by this milestone.

## Publication

No commit, push, remote equality or PR comment has been claimed for PR12. PR #3 must remain draft.
