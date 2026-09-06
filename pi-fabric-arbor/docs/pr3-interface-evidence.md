# PR3 transactional interface evidence

## Verdict and identity

**Scoped PR3 implementation and final adversarial verification PASS, authorized for milestone publication.** This is not completed scored research or broad A01-A30 acceptance. PR4-PR13 remain unimplemented dependency-scoped work; no PR4 production implementation is included.

Before the original PR3 implementation, verified the exact worktree `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, branch `arbor/refactor-pr0-pr1`, clean HEAD `2510e4ef3cd3d0a93e9507fbf927e9941f25239e`. All source/tests/docs/manifest changes are in that worktree. App-local locked dependencies are physical installations there, not links to the original checkout. The lockfile, original fingerprint implementation/oracle and its retained source tests are unchanged. Runtime/user artifacts are retained, not migrated or deleted.

## Final adversarial verification and publication checkpoint

Reverified the exact worktree and `arbor/refactor-pr0-pr1` branch, preserved the authored PR3 diff, and independently traced all four repairs through store/service/managed dispatch and the real native RPC journey. The original claimed results reproduced: **140/140 source tests, both no-emit checks, 19/19 native tests** (`.runtime/pr3-final-review-{check,host}.log` and `.exit`).

One additional stale-approval defect was found and repaired within PR3: after approving a direction, requesting another review and rejecting it left the old `reviewed` admission flag true. The new store regressions failed **0/2** (`pr3-final-renewed-red.log` / `.exit`), and actual owning-Pi RPC approval then rejection failed **0/1**, observing `true !== false` (`pr3-final-renewed-native-red.log` / `.exit`). All paths are under `.runtime/`; red evidence is retained. `ResearchStore` now clears prior admission transactionally when a new review is requested and records the actual approval/rejection on response. Historical receipt replay does not restore admission. Pending expansion, rejected dispatch after reopen, both guarded modes, and real RPC rejection/old-receipt replay pass (**3/3** targeted, `pr3-final-renewed-green.log` / `.exit`).

Final executed acceptance:

- `npm run check`: **exit 0, 142/142** (5 package/install + 92 retained-source + 20 PR2 + 25 PR3), both no-emit typechecks. `.runtime/pr3-final-publish-check.log` / `.exit`.
- `npm run test:pr3:e2e`: **exit 0, 20/20**, including actual persistent actor -> worker wait -> actor request_review -> settlement -> RPC approval and rejection, renewed-review rejection, policy denials, forged evidence/export collision, stale controls, command routing and source-write blockers. `.runtime/pr3-final-publish-host.log` / `.exit`.
- **22 clean host exits, 16 print + 6 RPC**, in the exact 21 directories listed in `.runtime/pr3-final-publish-host-dirs.txt`. No exit assertion was weakened. `.runtime/pr3-final-publish-mechanical.json` records each exit.
- `npm run manifest:pr3`, `npm pack --dry-run --ignore-scripts --json` and the local AST/manifest/exit audit: **exit 0**, **38 packaged assets, 11 active source modules / 58 imports, 16 exact public refs, 10 exact owner requirements**. `.runtime/pr3-final-publish-{manifest,audit}.log`, `pr3-final-publish-audit.exit`, `pr3-final-publish-pack.json`; audit script `pr3-final-publish-audit.mjs`.
- Lock metadata, useful retained test selection, `src/git` and `tests/git/fingerprint.test.ts` are unchanged. No Fabric API/runtime, original checkout, credentials, dataset or benchmark dependency changes are included.

PR2 native was inspected, not rerun: this final repair changes only research-store review admission, never the PR2 execution/exit path. The earlier PR3 diagnostic route/fixture changes already had the reviewed **8/8** PR2 native gate; that remains historical, not newly executed evidence. All 20 PR2 source cases were rerun. No full research/evaluator/candidate/apply acceptance or Schema enforce compatibility is inferred. PR4 is the next authorized dependency after this scoped milestone.

## Earlier independent-review repair checkpoint (historical)

Reverified `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, branch `arbor/refactor-pr0-pr1`, with the existing uncommitted PR3 diff preserved. No commit, Fabric runtime/API change, blacklisted-profile access, benchmark skill, fingerprint/oracle modification or host-exit weakening was made. Source changes remain in this worktree. Public Arbor artifact output schemas and the generated manifest were synchronized with explicit provenance; the 16 refs and 10 exact owner requirements did not change.

| Finding | Repair and executed regression |
|---|---|
| P1 fresh native review becomes stale during settlement | `ResearchStore.settle` advances a pending decision's binding only when it is still fresh and native settlement is successful/quiescent. It never rebases intervening control/result changes. `review` still checks exact revision/material/epoch. Actual persistent actor -> owned worker wait -> actor `request_review` -> settlement -> RPC approval **and rejection** pass, with native user receipts, duplicate replay and stale pre-settlement rejection. The useful deferred RPC review remains unchanged. |
| P1 direction root bypass | Dispatch checks the approved, eligible parent direction in the saved `direction` and `collaborative` modes before reserving capacity. Root hypotheses cannot bypass that check. Store tests cover rejected expansion and admitted children after actual review; both real native modes reject root dispatch with zero reservations/spawns. This is admission enforcement, not complete PR8 interaction-mode continuation. |
| P2 export/evidence identity collision and forged evidence | Export artifact IDs are derived in a separate namespace, not taken from caller command IDs. Artifact insertion rejects conflicting identities transactionally. All evidence consumers, including actor expectedEvidence, require native kind plus settled attempt/material/epoch/generation/native-result provenance. Store collision, tampered-provenance and insert-rollback tests pass. The real six-operation host now exports with an existing evidence ID as command ID, preserves the evidence byte-for-byte, and rejects the resulting export as evidence. |
| P2 terminal-before-attach regression | Late attach to a terminal attempt is rejected without a revision, capacity, artifact or digest change. Completed/failed/stopped/timed_out cases and reopened storage pass; terminal replay remains idempotent. |

### Red-to-green and retained results

- Minimal red command: `node --import tsx --test --test-name-pattern="repair:" tests/research/store.test.ts`. **Exit 1, 0/5**, with the exact stale-review, approval-bypass, artifact-overwrite and accepted-late-attach symptoms: `.runtime/pr3-repair-red.log` / `.exit`.
- Real native red command: `node --import tsx --test --test-name-pattern="repair: native actor.*Approve|repair: real native direction" tests/integration/pr3-research-host.test.ts`. **Exit 1, 0/2**: genuine RPC review returned `Stale pending review revision`; direction mode ran the root attempt. `.runtime/pr3-repair-native-red.log` / `.exit`. Both hosts exited naturally; red evidence was not erased.
- Intermediate `.runtime/pr3-repair-targeted.log` and `pr3-repair-native-targeted.log` preserve the initial closed-output-schema failure after adding provenance. The synchronized schema/manifest reruns pass: `pr3-repair-schema-targeted.log` (**2/2**) and `pr3-repair-review-targeted.log` (**2/2**). This was repaired in app contracts, not by opening schemas or suppressing failures.
- **Final `npm run check`: exit 0, 140/140**, both no-emit typechecks; `.runtime/pr3-repair-check.log` / `.exit`.
- **Final `npm run test:pr3:e2e`: exit 0, 19/19**; `.runtime/pr3-repair-host.log` / `.exit`. Exact 20 trace directories are listed in `.runtime/pr3-repair-host-dirs.txt`, including both native-review RPC outcomes. Every original host-exit assertion remains intact.
- **`npm run manifest:pr3`: exit 0**; `.runtime/pr3-repair-manifest.log` / `.exit`. Source parity and actual effective host schema comparisons pass.
- **Pack/mechanical audit: exit 0**, 38 source/document assets, 11 active modules / 58 imports, 16 exact refs, 10 owner requirements, **21 clean exits (16 print, 5 RPC)**. `.runtime/pr3-repair-pack.json`, `pr3-repair-mechanical.json`, `pr3-repair-audit.log` / `.exit`; local audit script `pr3-repair-audit.mjs`. Its initial npm JSON-envelope parser error is retained in `pr3-repair-audit-initial-failure.log`; the parser now handles the observed keyed object without changing any assertion.
- `git diff --check` and `git diff --exit-code -- package-lock.json src/git tests/git/fingerprint.test.ts`: exit 0. Useful source/fingerprint tests remain unchanged and execute in normal check.

PR2 native was **not rerun**: the production repairs are in the PR3 store/closed artifact contract; the shared fake-provider addition is inside `data.version === 2` and does not change PR2 inference, lifecycle or exits. The normal check reran all 20 PR2 source tests. The prior reviewed 8/8 native result remains historical evidence, not a newly executed result.

Existing runtime artifacts are retained without migration or invented provenance. In particular, pre-repair evidence lacking the newly required provenance is not silently upgraded into valid native evidence. PR4+ research, evaluation, candidate snapshots, measured keep/apply, full mode continuation/native resume and full acceptance remain outstanding. The required native gate still proves and names the installed Schema enforce incompatibility, not compatibility. Main's review and commit decision remain pending.

## Acceptance ledger

| Plan ID | Status at PR3 | Executed evidence / boundary |
|---|---|---|
| PR3 / A22 specification | PASS, PR3 portion | `tests/research/store.test.ts`, `service.test.ts`, real `native`/`controls` hosts: domain-neutral closed config, built-in/profile/project/explicit precedence, per-field origins, canonical source reference, distinct role model/tool/requirement identities, saved spec immune to changed defaults. This is not a candidate snapshot or PR6 role bundle. |
| PR3 / A10 store | PASS, PR3 transactions; A10 broader PARTIAL | Fresh `runs,nodes,attempts,evaluations,decisions,operations,controls,events,artifact_refs,lessons` schema; transaction rollback/reopen, generation/revision rejection and duplicate native terminal ingestion. No legacy reader. Later Git/evaluator/apply crash gaps remain unimplemented. |
| PR3 / A12 / A21 reservations | PASS, reservation portion; broader IDs PARTIAL | Two real processes race SQLite reservations; real `duplicate-dispatch` and `capacity` hosts race requests while ask/spawn is held. One attempt/native launch, no overbooking, one terminal capacity release. Evaluator calls are not falsely charged or scored; full workspaces/evaluator accounting remain PR4+. |
| PR3 / A22 public surface | PASS, PR3 interface portion; full A22 PARTIAL | Four facade, six owner operations, separate review/apply/undo and three explicit PR2 diagnostics. `docs/pr3-action-manifest.json` lists all 16 refs, exact input/output schemas where provided, actor schema, callers, risks, effects, commands and requirements. Tests compare source manifest and real effective schemas. Evaluator/keep/apply/undo return explicit unavailable receipts, not simulated success. One-skill packaging remains preserved; full role/skill delivery is later. |
| PR3 / A02 / A26 / A27 owner path | PASS, bounded native observation scope | Actual `agents.create`/`ask` proposal, post-ask spawn, immediately owned wait, terminal ingestion and later fresh ask, then live-host cleanup. Actor commits only `agents.self` and actually attempts the registered `arbor.review` route and forbidden spawn. Worker has no extension/Fabric tool. Only initial/final Main inference. No callbacks, actor outbox continuation or forwarding provider. |
| PR3 / A28 review and policy | PASS for real research-choice receipt; broader A28 PARTIAL | Real native actor request_review -> mandatory settlement -> RPC approval and rejection now pass, alongside the retained deferred review test. Separate Fabric Allow-once prompts remain. Receipts bind native owner/session, material reference, settled epoch/revision and exact response. Duplicates reuse them; supplied booleans, pre-settlement replies and intervening-control staleness fail. Concurrent stale dialog and retirement are also service regressions. Real deny/ask blocks before mutation. Source apply remains unavailable; Schema enforce limitation is explicitly below. |
| PR3 / A17 read-only | Preserved PASS for existing boundaries; full A17 PARTIAL | CLI mutations rejected in attached/offline modes; no attachment or browser write route. Real owner-generated JSON export is read through the CLI with byte-identical research DB/source. Full live research presentation/replay parity remains PR12, not inferred from static assets. |
| PR3 / A11 / A29 lifecycle | Preserved bounded gates; broader IDs PARTIAL | All 20 PR2 source tests pass in the repair check. The previously reviewed 8 PR2 host passes are retained, not rerun in this repair; the repair does not change that execution/exit path. PR3 pause/cancel wins held asks; service tests preserve storage through retired dialogs, disposal and close. Unreturned-create ambiguity and full stopped-actor/partial-material reconciliation remain the documented PR2/PR8 limitations. |
| PR3 / A01 / A30 gates | PASS normal and native lanes; broader A30 PARTIAL | Final `npm run check`: 142 tests (5 package/install + 92 retained-source + 20 PR2 + 25 PR3), both no-emit checks. PR3 native: 20/20 tests and 22 clean exit records. PR2 native: historical 8/8, not rerun. Pack audit: 38 assets, no emitted/test/runtime/certification payload. Full research dashboard reuse remains PR12. |

A03-A08 and the complete A09-A25 research/product journeys are not accepted by these structural/unscored observations. PR4 is the next dependency after the final verified PR3 checkpoint. Native resume is explicitly blocked until PR8; the tested frozen resume is deferred configuration resume, not stopped-actor reconstruction.

## Implementation path and authoritative schemas

`src/extension.ts` registers passive component metadata and owning-Pi commands. Research commands submit exact allowlisted programs using public Pi `sendUserMessage`, then the normal model/Fabric invocation path validates schemas, permissions and caller identity. There is no public direct checked-invoke Pi command API, so the command never calls the owner service itself. Submission is not a receipt or completion. Inactive owners produce actionable doctor output without inference.

`src/managed/definitions.ts` stages `arbor` only after activation and captures the exact public `context.call` seam. Requirements remain:

```text
agents.self, agents.members, agents.status, agents.create, agents.ask,
agents.spawn, agents.wait, agents.stop, agents.remove, schema.status
```

`OwnerExecution.ts` retains the PR2 lifecycle/settlement path and adds a finite PR3 proposal cycle. The actor chooses proposals; the owner validates and commits them. Dispatch atomically reserves an observation attempt before spawning an extension-free read-only worker. It owns waits before persistence/another async boundary, records native settlement once, and preserves ambiguous reservations instead of retrying. The native linkage DB is not a research authority or participant registry.

`src/research/contracts.ts` is the shared bounded closed schema source for config, actor proposals, action inputs, resolved spec, projections and receipts. Registered output schemas are validated by the service and compared with real effective host descriptors. `spec.ts` resolves configuration without converting exact decimal strings through numbers. Operational tools and `requires` are distinct from subject configuration. `ResearchStore.ts` owns SQLite facts, atomic reservations, receipts and compact events. `ResearchService.ts` owns the facade, native-session checks, review dialogs and derived JSON exports. State destinations are canonicalized through existing parents; contained dot-prefix/symlink destinations fail before storage creation.

The original PR2 API names now have explicit diagnostic names: `substrateStart`, `substrateInspect`, `substrateCancel`. Their old arguments are isolated from research runs; no v1 interface or reader is retained. The PR2 tests change route names/catalog expectations only, preserving lifecycle assertions. The fake model now also supplies v2 proposals and attempts the real PR3 review ref. It never dispatches or collects in place of the production owner.

Regenerate the machine manifest with `npm run manifest:pr3`. This is a repository-local documentation command, not a build or emitted runtime requirement. The manifest generator and parity tests are under `tests/research/`; no test code is packaged.

## Explicit unavailable functionality and policy limits

- These attempts inspect source references; they do not freeze candidate workspaces, execute evaluators, grade tasks or update a measured incumbent. Evaluate/keep/apply/undo return concrete blocked receipts. No paid inference, benchmark helper or dataset is used.
- JSON exports are derived unscored projections. Full reports/trajectories are later work. CLI/browser cannot generate them.
- Attempt/active capacity is transactional. Active time is a dispatch-admission budget, not a claim of hard interruption of arbitrary work. Token/cost ceilings are observational. Evaluator accounting, short-deadline adapters, role bundles and full partial/native resume are later dependencies.
- Fabric permissions and Arbor research-choice review are separate. A real research approval never grants Fabric permission or validates an unevaluated candidate.
- **Schema enforce remains unavailable.** The first real enforce probe failed before guest execution with `Fabric provider component manifest mismatch. Missing: extensions. Unexpected: none.` Explicitly disabling capture did not fix it, and was reverted. No Fabric code/API was changed. The final gate retains that exact startup failure, asserts zero Arbor calls/storage, and separately proves `/arbor start` reports the inactive/enforce blocker without any model turn. This is **not** a passing exact-reference Schema guard probe, nor advertised enforce compatibility. The supported native integration gate uses Schema off with normal allow/deny/ask policy. Audit-mode execution was not separately tested.

## Commands, results and retained artifacts

All paths below are relative to the app. The following commands and trace list are **historical pre-review-repair implementation evidence**. Current repair commands/results are in the repair checkpoint above; the original 130/15 counts did not cover the four independently reproduced defects.

- `npm run check`: PASS, exit 0, both typechecks and **130/130** tests. `.runtime/pr3-check-reviewed.log`, `.runtime/pr3-check-reviewed.exit`.
- `npm run test:pr2:e2e`: PASS, exit 0, **8/8** tests. `.runtime/pr3-pr2-host-reviewed.log`, `.runtime/pr3-pr2-host-reviewed.exit`.
- `npm run test:pr3:e2e`: PASS, exit 0, **15/15** tests. `.runtime/pr3-host-reviewed.log`, `.runtime/pr3-host-reviewed.exit`.
- `npm run manifest:pr3`: PASS. `.runtime/pr3-manifest-final.log` records an earlier equivalent generation; the final normal check regenerated the same current manifest before testing.
- `npm pack --dry-run --ignore-scripts --json` and app-local AST/manifest/exit audit: PASS, **38 assets**, **11 production modules / 58 imports**, **16 exact refs**, **17 clean PR3 native host exit records**. `.runtime/pr3-pack-inventory.json`, `.runtime/pr3-mechanical-evidence.json`, local diagnostic script `.runtime/pr3-mechanical-audit.mjs`.
- `git diff --check`; unchanged lockfile, `src/git` and fingerprint test check: PASS. No Fabric/private imports, owner `tools.call`, subscription/tell continuation, legacy admission or benchmark dependency in the audited active modules. Physical dependency paths resolve within this exact worktree.

Pre-repair PR3 trace directories (retained historical evidence; each has `trace.jsonl` plus print output/exit or RPC output/exit):

```text
.runtime/pr3-host/native-qn0QL3/
.runtime/pr3-host/self-approval-PjBl04/
.runtime/pr3-host/stale-6n0USW/
.runtime/pr3-host/controls-xzrW6N/
.runtime/pr3-host/duplicate-dispatch-BuI2TX/
.runtime/pr3-host/policy-deny-OCDMr7/
.runtime/pr3-host/policy-ask-AMcgmJ/
.runtime/pr3-host/schema-enforce-unavailable-5THoo4/
.runtime/pr3-host/schema-command-tDn5Qp/
.runtime/pr3-host/review-LDI0if/
.runtime/pr3-host/command-nXJiXn/
.runtime/pr3-host/boundary-pause-uuqSKH/
.runtime/pr3-host/boundary-cancel-KGpUPL/
.runtime/pr3-host/operations-7zZTZb/
.runtime/pr3-host/second-root-GeSVqU/
.runtime/pr3-host/capacity-p8WHtI/
```

The 17 records include 14 natural print-host exits and 3 natural RPC exits, all code 0/no signal. Print exits additionally assert no kill/exec error. The second-root directory includes both hosts. The separate PR2 suite retains its original explicit successful-exit guards; its disabled-doctor RPC teardown remains deliberately terminated, not advertised as a natural exit.

Earlier failures remain diagnostic evidence, not erased or relabeled passes: the direct enforce probe and capture experiment (`pr3-host-gate.log`, `pr3-schema-probe.log`); initial manifest-through-bounded-output truncation (`pr3-unit.log`, repaired by direct local generation); a missing schema delimiter (repaired before host invocation); and the old clean-install predicate (`pr3-check.log`). The package predicate now requires the concrete inactive-start warning and still asserts no inference/actor/run/research storage. Final logs above supersede only the repaired gate outcomes.

## Navigation and public protocol evidence

The entire authoritative plan, scoped guidance, acceptance ledger and latest PR2 evidence were read. Installed app-local Pi extension/package/model/custom-provider/TUI docs, relevant RPC/context/skills/environment crossrefs and command/dialog examples were read in bounded chunks. Fabric component/provider/calculus/configuration/agents/Schema/interface and relevant architecture/residency/agent-reference docs informed exact requests. Only exported `pi-fabric/protocol` imports are used.

Direct Fovea discovery initially returned no available tools in this execution context; targeted source tracing was used. Later automatic Fovea graph/change-impact notices identified shared contracts and managed dependents. Those are navigation evidence, not a substitute for source reads and executed checks. Read/search/edit-shape failures were corrected locally and did not block the workflow or erase artifacts.
