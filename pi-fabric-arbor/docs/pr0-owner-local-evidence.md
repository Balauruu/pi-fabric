# PR0 owner-local integration evidence

Status: **PASS for the revised PR0 falsification gate**. PR1 subsequently passed in [`pr1-source-install-evidence.md`](pr1-source-install-evidence.md); PR2 is now the next unimplemented dependency.

## Executed host lane

On 2026-09-06, `npm run test:pr0:e2e` source-loaded the managed fixture and deterministic provider into isolated offline Pi roots on Node 26.7.0, Pi 0.85.1, and Fabric 0.83.0. It passed **11 tests, 0 failed, 0 skipped** in **113818.555725 ms**. The lane comprises `tests/integration/pr0-owner-local-e2e.test.ts` and `tests/integration/pr0-owner-local-stop-response.test.ts`.

Observed through public host operations:

1. The component captures post-activation `FabricComponentContext.call` and declares exactly `agents.self`, `members`, `status`, `create`, `ask`, `spawn`, `wait`, `stop`, and `remove`. Calls begin only after activation returns.
2. Public `agents.self` supplies the immutable native root/owner-host/owner-identity binding. The journal also binds component instance/generation, material ID, worker/baseline/candidate cwd and Git OID, and `exact-good-v1` grading policy.
3. Bounded `participantProvenance` journal entries contain the actual actor ID returned by `agents.create` and worker IDs returned by `agents.spawn`, not request names or process labels. Worker links retain task/role, exact cwd/OID snapshot, and subject evaluation ID. They store provenance only, with no participant status or scheduling authority; Fabric remains authoritative.
4. Actor creation, asks, launches, waits, and every stop promise are tracked. Deterministic barriers hold real `agents.create`, `agents.ask`, and late `agents.spawn` results. Cancellation authorizes the native owning run binding before any drain mutation, then enters drain, releases the held result, and settles cancellation. A rejected second-root cancel has the exact owner-identity error, emits no drain/cancellation state event, and leaves operational state unchanged.
5. The stop parser accepts documented local actor/agent terminal shapes with omitted locality fields and explicit `routed: "local"`/`local: true`. It rejects acknowledged delivery, target mismatches, and every tested explicit remote, unknown, false, string, or null routing/locality discriminator for actors and agents. Acknowledged delivery never becomes terminal evidence.
6. Normal completion settles the final ask and every worker wait, validates terminal status, locally stops/removes the idle actor, and uses public members while the Pi root remains live to prove zero live run-owned participants.
7. Durable ingestion interruption persists the native result before ingestion, returns `INTERRUPTED`, reconstructs the same owner after reload, re-observes public status, and resumes with zero redispatch. Duplicate terminal resume is idempotent; changed material, cwd, or OID is rejected.
8. Owner-loss proof starts real native work through `OwnerLocalFabricProbe.interruptAfterNative`, records its returned handle, and lets the disposable original Pi host exit. A second Pi root calls `OwnerLocalFabricProbe.recoverInterrupted` through the public `arbor.ownerLossRecovery` operation. Authorization blocks at the immutable owner root/host/identity before handle lookup; separate public `agents.status` reports the recorded handle unknown and non-stale `agents.members` omits it. There is zero actor/worker redispatch, and the journal bytes and retained evidence are unchanged.
9. The fake provider produces real failed and configured-timeout waits; neither is valid evaluation evidence. Owner-fixed task policy and Git OID checks bind snapshot loading before launch and ingestion.
10. Child Arbor refs are intentionally absent and cannot resolve. Separately, the actor's actual `agents.spawn` call is denied by the observed `Fabric agent depth limit reached (1)` restriction, not classified as unknown/not-found.
11. Coordinator, executor, and reference files load from a frozen role worktree. Each missing mandatory bootstrap/phase file blocks before spawn. Instruction and result sentinels are observed at the real actor/worker boundary.
12. Two built-in evaluator runs overlap through real spawn/wait. Explicit catalog maintenance settles them, rebinds the definition-time optional requirement, and reactivates built-in and optional paths. Pause, reload replacement, retained storage lifetime, passive outbox behavior, and no extra Main inference remain covered.

The harness uses `--no-skills`, isolated `HOME`/Pi directories, offline mode, disposable Git worktrees, and no profile benchmarking environment, paid inference, dataset download, installed-Fabric edit, private Fabric import, generic forwarding, lifecycle callback, broker, daemon, replacement SDK runtime, CLI mutation, or remote stop transport.

## Verification checkpoint

From `pi-fabric-arbor/`:

- `node --experimental-strip-types --test tests/integration/pr0-owner-local-stop-response.test.ts` - PASS, 3/3 tests. Before the fix, the same command was red: 2 passed, 1 failed because the actor shape with `routed: "remote"` was accepted.
- `npm run test:pr0:e2e` - PASS, 11/11 tests, 0 failed/skipped, 113818.555725 ms.
- `npx tsc -p tsconfig.build.json --noEmit` - PASS.
- `npx tsc -p tsconfig.test.json --noEmit` - PASS.
- `git diff --check` - PASS.
- `npm run test:pr0:plan` - PASS, 1/1 text-only consistency test, 62.385564 ms; not behavioral evidence.

## Dependency-ordered remaining work

PR0 has no remaining mandatory item under the revised plan. The following are deliberately not folded back into PR0:

1. **PR1 delivered:** clean source-only package/install, reload, CLI, and asset proof with emitted directories absent from the Arbor package/fixture.
2. **PR2-PR3 next:** production managed owner adapter, then production state and public interface.
3. **PR4:** production evaluator adapters and the complete optional-provider missing/mismatched descriptor and invalid-result matrix. PR0 required catalog binding/change and two-run blast-radius proof, which this lane executes; it did not require the whole PR4 matrix.
4. **PR6 onward:** actual production research slices and later dependent behavior. Full partial/in-progress worker-material continuation belongs to PR8.

No A01-A30 item is accepted as a whole. Same-host public-handle invalidation is not exposed by this harness and remains unverified; only genuine loss of the disposable owner host and second-root safety are claimed. Host-surviving durable residency remains optional and unadvertised. PR1-PR13 production implementation has not begun.
