# PR2 managed owner evidence

## Verdict and scope

**Implemented with passing scoped PR2 gates.** This is the production managed execution substrate, not completed scored research or full A01-A30 acceptance. Wider A11/A29 remain partial as detailed below.

Historical precommit review observation: the review repair first verified the exact top-level worktree `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor` and branch `arbor/refactor-pr0-pr1`. It began with the existing uncommitted PR2 diff, not a clean tree, and preserved Main-owned files. Review edits are exclusively `src/managed/OwnerExecution.ts`, `tests/managed/owner.test.ts`, `tests/integration/pr2-production-host.test.ts` and this evidence file; test artifacts remain under `.runtime`. That repair made no commit or push and used no Fabric API/private imports or blacklisted Pi profile. The finalization checkpoint below supersedes its precommit repository-plan status.

## Production path

`src/extension.ts` registers managed `arbor` metadata and the Pi setup/doctor/inspection command. The passive diagnostic parent owns `arbor.owner` through public `context.use`; it never waits for child activation. The operational child provides `arbor.start`, `arbor.inspect` and `arbor.cancel` only after activation commits.

`src/managed/definitions.ts` captures `context.call` with these exact definition-time requirements:

```text
agents.self, agents.members, agents.status, agents.create, agents.ask,
agents.spawn, agents.wait, agents.stop, agents.remove, schema.status
```

`OwnerExecution.ts` validates native intrinsic root/session/host/identity and trusted ownership, canonical material cwd/Git OID, exact available model and immutable policy/bounds before binding. It creates one project/session-resident actor per admitted run with passive mailbox delivery, no automatic trigger turn and only an `agents.self` commitment. Structured silent asks propose bounded tasks; owner validation alone dispatches native workers and immediately owns their waits. Later asks receive fresh completion facts without Main inference. Limits are 1-2 waves, 1-2 workers per wave and 128 retained bindings per generation. This is deterministic dispatch, not a custom reasoning driver.

Workers deliberately use `extensions:false`, `recursive:false` and native read/grep/find/ls only. They cannot resolve Fabric or Arbor tools. An earlier extension-enabled worker test reached the ownership guard; that was insufficient under A23 and was repaired, not accepted as absence. The current real child attempts an unavailable Fabric call and receives Pi's tool-not-found result. Coordinator attempts to spawn or call Arbor are denied by its closed commitment.

`BindingStore.ts` lazily creates `execution-bindings.sqlite3` only at start. It retains native IDs and pre-dispatch names alongside owner, generation, material/cwd/OID/policy/model and revisions. It is native linkage, not PR3's future transactional research store or a second participant registry. Fabric owns participant truth. Reload never blindly adopts or redispatches a retained binding.

## Review repairs and acceptance ledger

| Repair | Regression and observed result |
|---|---|
| Reject cancellation that arrives during asynchronous validation or queued admission | `start` now rechecks the invocation signal inside serialized admission, before binding persistence or run-owned effects. A held `schema.status` test aborts and releases validation, then proves rejection with the original reason, no in-memory/durable binding, no SQLite file and no `agents.create` or other run-owned calls. |
| Subscribe before starting the cycle | Each admitted invocation installs its abort listener before `#cycle` can persist or dispatch, including duplicate starts; `finally` removes it. A regression observes the listener at the first cycle save, then aborts a held create and proves cancellation, no ask/spawn and removal of the returned actor. |
| Completion marker must not mask process failure | Both print-mode host invocations share `successfulHostExit`: retain stdout/stderr and `.exit.json`, then require code `0`, signal `null`, killed `false` and no rejected-exec error before checking the marker. Real child-process probes print the marker before exit `23`, self-SIGTERM or timeout; all are rejected with preserved failure codes/signals. A zero-exit control passes. |

Both owner regressions failed against the pre-repair implementation: missing expected abort rejection and listener count `0` instead of `1`. They pass after repair. The stricter real-host rerun found **no actual print-mode shutdown failure**: all eight print processes across seven scenarios exited `0`, with no signal, kill or exec error. The separate doctor/setup RPC session is deliberately terminated by its test and is not claimed as a natural print-mode exit.

## Acceptance trace

| Check | Observed evidence | Scope/status |
|---|---|---|
| A02 managed owner, exact refs, post-activation calls | Real production component status and schemas; passive activation seam; actor/worker ordering | PASS for PR2 bounded substrate, not full research |
| A26 native binding and owner-held collection | Actual `agents.self` matches persisted IDs; second native root denied with byte-identical journal; asks observe 0/1/2 completions and Main has only initial/final turns | PASS for PR2 native owner binding |
| A11 late calls/cancel/cleanup | Real held create/ask/spawn cancellation; seam adds held wait, failed/stopped/timed-out outcomes and strict stop-discriminator matrix | PARTIAL broader item: explicit resume/stopped-actor replacement and full dependency-replacement recovery remain later work |
| A29 retained resources | Real reload retains inspectable binding; seam proves storage valid after disposal and until idempotent provider close; injected storage fault remains explicit and closes resources | PARTIAL broader item: retained-view access is seam evidence, not a claimed complete real-host lease/resource fault matrix |
| Missing/disabled capability diagnostics | Real disabled-agent policy plus repeated RPC setup/doctor without inference; missing-required-ref parent/child/doctor lifecycle seam | PASS scoped diagnostics; truly absent built-in descriptors not reproduced in real host |
| No duplicate actor/research from registration/reload | Empty native members before start; duplicate start identical; reload blocks retained start and creates no new actor | PASS scoped registration/idempotence |
| A01 and read-only/package portions of A17/A22/A30 | Clean packed install, source reload, one skill, all assets, read-only CLI/Web and retained source lane | Preserved; later product journeys/views are not accepted |

## Important observed limits

- During real component retirement while `agents.create` has produced a native actor but its public result is still held in middleware, the captured call rejects as unloading before the owner receives the ID. An idle actor remains visible to the test's native observer. Arbor records `cleanup_pending` and the exact pre-dispatch name, retains the binding and never guesses a handle, claims cleanup, restarts work or deletes evidence. The disposable host eventually exits. This is **not** a claim of successful live-host cleanup for an unreturned handle; explicit reconciliation is still required.
- `agents.enabled:false` in Fabric 0.83.0 leaves descriptors and the managed child active. It disables execution, not definition discovery. A test-only attempt to replace the built-in catalog did not remove those descriptors and was discarded. Missing-ref behavior is therefore honestly labeled lifecycle-seam evidence; doctor separately reports configured policy and observed commitment.
- Native local actor stop/status includes numeric `queued` mailbox length. That field is not a routed queue acknowledgement. Only exact stopped actor ID/scope with valid local discriminators passes, followed by status and removal proof. Boolean queue/ack/message responses, mesh/remote/unknown/contradictory locality, wrong IDs and nonterminal results stay ambiguous. No remote stop is sent when native member ownership/locality is unproved.
- Workers do not load extensions. A Main-only extension model is not automatically available to them; use a built-in or declared `models.json` provider. Failed native execution is not evaluation validity, a score or an incumbent decision.
- No scored evaluation, optional evaluator matrix, private candidate material, role-bundle assembly, paid model experiment, dataset download, review/apply/export, partial resume, remote-stop support or production research claim is included. PR3+ owns those dependency-ordered features.

## Executed commands and retained evidence

Environment: Node 26.7.0, npm 12.0.2, Pi 0.85.1, Fabric 0.83.0. Tests use app-local `node_modules`, disposable project/profile/HOME paths and stripped inherited `PI_*`/`ARBOR_*` identity/configuration. Inference uses a local extension for Main/coordinator plus a loopback OpenAI-compatible model for extension-free workers. Neither fixture replaces native agent execution or the production owner driver.

Review-repair runs:

- `node --import tsx --test --test-name-pattern="abort during held|abort listener precedes" tests/managed/owner.test.ts`: expected RED before production repair, 0/2 passing. Log: `.runtime/pr2-review-red.log`.
- `npm run test:pr2`: PASS, 20/20 managed tests, including both new regressions. Log: `.runtime/pr2-review-targeted.log`.
- `node --import tsx --test --test-name-pattern="host exit guard" tests/integration/pr2-production-host.test.ts`: PASS, 1/1 test covering four actual subprocess outcomes. Log: `.runtime/pr2-review-exit-guard.log`.
- `npm run check`: PASS, exit 0. Both no-emit checks; 5/5 package/install, 92/92 retained source, 20/20 managed tests. Log/status: `.runtime/pr2-review-check.log`, `.runtime/pr2-review-check.exit`.
- `npm run test:pr2:e2e`: PASS, exit 0, 8/8 tests (seven real-host scenarios plus the exit-guard regression). Log/status: `.runtime/pr2-review-host-gate.log`, `.runtime/pr2-review-host-gate.exit`.

Earlier implementation-only packaging evidence, not rerun during this repair:

- `npm pack --dry-run --ignore-scripts --json` plus inventory checks: 31 files; all five managed source modules and this evidence included; no emitted/test/runtime/certification payload. npm 12's keyed JSON envelope was handled explicitly. No `dist/` or `.test-dist/` exists.
- Packaged skill validator: PASS, valid frontmatter and seven reachable files. The clean install verifies one skill and its resources. Availability text was corrected; model-trigger optimization/near-miss benchmarking was not run or claimed.
- Historical implementation `git diff --check`: PASS. At that point package-lock was unchanged; finalization synchronizes its peer metadata below. The v1 fingerprint oracle, PR0 implementation/fixtures and unrelated retained sources remain unchanged.

Final review host traces (`trace.jsonl`, `host-output.txt`, `host-output.txt.exit.json`; second-root also `second-host-output.txt` and its `.exit.json`) are under:

```text
.runtime/pr2-host/complete-nwL1F6/
.runtime/pr2-host/cancel-create-TcuFzY/
.runtime/pr2-host/cancel-ask-v5Hl3r/
.runtime/pr2-host/cancel-spawn-hRBUKd/
.runtime/pr2-host/reload-create-2Ngwuc/
.runtime/pr2-host/disabled-XXafnj/
.runtime/pr2-host/second-root-SRvZ5k/
```

Every listed exit record is exactly `{ "code": 0, "signal": null, "killed": false, "error": null }`. The historical marker-only gate is superseded by this exit-verified run.

Earlier failing fixture traces remain diagnostic only, not passing evidence. Normal `check` includes the source/install and managed lanes; the real-host lane is a separate explicit command. The prior 11-test PR0 lane was not rerun because its source/fixtures were untouched and PR2 tests the actual production extension instead.

## Reviewed milestone finalization

The finalizer reverified the exact worktree/branch and reviewed the complete scoped source, tests and documentation diff. The ledger now records **117 normal checks (5 package/install + 92 retained-source + 20 managed)** and **8 PR2 E2E tests**. The authoritative plan records PR2 bounded substrate PASS, PR3 next and PR3-PR13 outstanding. Broader A11/A29 remain PARTIAL; no dependent implementation or gate removal is included.

- `npm install --package-lock-only --ignore-scripts`: PASS. The sole lock change adds root peer `@earendil-works/pi-coding-agent: "*"`, matching the source manifest. A deep comparison against the prior lock confirms every dependency entry, version, resolution and integrity is unchanged. Log/status: `.runtime/pr2-finalize-lock.log` / `.exit`.
- `npm ci --dry-run --ignore-scripts`: PASS, lock validation without reinstalling or editing app-local installed packages. Log/status: `.runtime/pr2-finalize-ci.log` / `.exit`.
- `npm run test:source:package`: PASS, 5/5, rerun because the manifest/lock and packaged documentation changed. The clean packed install again exercises actual source loading/reload, single-skill/assets and read-only/passive behavior. Log/status: `.runtime/pr2-finalize-package.log` / `.exit`.
- `node --import tsx .runtime/pr2-finalize-probe.mjs`: PASS. Exact public registration, three action descriptors, ten requirements, scripts and dependency manifest are checked; every prior script is preserved except the additive managed lane. AST import inspection of all seven changed production modules finds only Node, relative modules, exported `pi-fabric/protocol` and the public Pi package, with no private imports or forbidden dependencies. `npm pack --dry-run --ignore-scripts --json` still contains 31 files and no tests/runtime/emitted/certification payload. All eight retained print-host exit records are independently checked as clean. Evidence: `.runtime/pr2-finalize-mechanical.json`, `.log`, `.exit` and the local probe source.

The previously passing full check, 20-test managed lane and 8-test production-host lane were not rerun unchanged: finalization changes only lock metadata and documentation. Their bounded review logs and clean host-exit records above remain the behavioral evidence. Final explicit staging, complete bounded cached-diff review, whitespace checks and publication receipts are retained separately under `.runtime/pr2-finalize-*`; runtime artifacts are not package or commit payloads.

## Navigation and protocol sources

The complete authoritative plan, app guidance, ledger and PR0/PR1 evidence were read. Installed public Pi extension/package/model/custom-provider docs and Fabric component/provider/calculus/configuration/agents references informed the implementation. Only exported `pi-fabric/protocol` imports are used; no Fabric modifications/private runtime imports or legacy admission/composition are in the active path.

The implementation/review worker recorded unavailable Fovea discovery and used targeted source tracing; that worker-local observation remains accurate. Main subsequently focused `OwnerExecution` and the managed definitions, making the navigation graph available in the parent. An automatic review change-impact notice also identified managed dependencies. Direct source reads and executed tests remain authoritative.
