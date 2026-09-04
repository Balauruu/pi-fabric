import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import type { ArborCommandV1, DescendantUnitIdentityV1, EffectObservationV1 } from "../../src/domain/types.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { EffectRecoveryCoordinator } from "../../src/recovery/EffectRecoveryCoordinator.js";
import { digestCanonical, sha256 } from "../../src/util/canonical.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

type CommandWithoutMetadata = ArborCommandV1 extends infer Command ? Command extends { metadata: unknown } ? Omit<Command, "metadata"> : never : never;

async function prepareChildCrash(runId: string) {
  const fixture = await makeFixtureApplication(); let revision = 0; let fence = 0; let serial = 0;
  const context = () => ({ driverId: "driver_primary", fence, now: fixture.clock.now() });
  const execute = async (command: CommandWithoutMetadata) => {
    serial += 1;
    const receipt = await fixture.application.execute({ ...command, metadata: { runId, expectedRevision: revision, idempotencyKey: `phase4_${runId}_${serial.toString().padStart(4, "0")}`.slice(0, 128) } } as ArborCommandV1, context());
    revision = receipt.revision; return receipt;
  };
  const contract = createFixtureContract();
  await execute({ version: 1, kind: "start", contract });
  await execute({ version: 1, kind: "claimDriver", driverId: "driver_primary", leaseMs: 1000 });
  fence = 1;
  await execute({ version: 1, kind: "advance" });
  await execute({ version: 1, kind: "evaluate", role: "developmentBaseline", oid: contract.repository.initialOid });
  await execute({ version: 1, kind: "advance" });
  await execute({ version: 1, kind: "evaluate", role: "heldOutBaseline", oid: contract.repository.initialOid });
  await execute({ version: 1, kind: "advance" });
  await execute({ version: 1, kind: "proposeHypothesis", hypothesis: { version: 1, hypothesisId: `hypothesis_${runId.slice(4)}`, rationale: "Recover a deterministic child boundary.", plan: ["Observe before any retry."] } });
  const selected = await execute({ version: 1, kind: "advance" });
  await execute({ version: 1, kind: "selectHypothesis", hypothesisId: (selected.directive as { hypothesisId: string }).hypothesisId });
  const reserved = await execute({ version: 1, kind: "reserveAgentDispatch", hypothesisId: (selected.directive as { hypothesisId: string }).hypothesisId });
  const materialized = await execute({ version: 1, kind: "materializeWorkspace", attemptId: (reserved.directive as { attemptId: string }).attemptId });
  const dispatch = (materialized.directive as { dispatch: { attemptId: string; effectId: string; dispatchKey: string } }).dispatch;
  return { fixture, get revision() { return revision; }, set revision(value: number) { revision = value; }, execute, dispatch, oldContext: context() };
}

async function acquireRecoveryFence(setup: Awaited<ReturnType<typeof prepareChildCrash>>, runId: string): Promise<{ driverId: string; fence: number; now: string }> {
  setup.fixture.clock.advance(1000);
  const receipt = await setup.fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: `phase4_claim_recovery_${runId}`.slice(0, 128) }, driverId: "driver_recovery", leaseMs: 10_000 }, setup.oldContext);
  setup.revision = receipt.revision;
  return { driverId: "driver_recovery", fence: 2, now: setup.fixture.clock.now() };
}

async function interrupt(setup: Awaited<ReturnType<typeof prepareChildCrash>>, runId: string, context: { driverId: string; fence: number; now: string }) {
  const receipt = await setup.fixture.application.execute({ version: 1, kind: "interruptEffect", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: `phase4_interrupt_${runId}`.slice(0, 128) }, effectId: setup.dispatch.effectId, reason: "deterministic injected crash" }, context);
  setup.revision = receipt.revision;
  return (await setup.fixture.store.load(runId))!.effects.find((entry) => entry.effectId === setup.dispatch.effectId)!;
}

function observation(effect: Awaited<ReturnType<typeof interrupt>>, revision: number, fence: number, classification: EffectObservationV1["classification"], extra: Partial<EffectObservationV1> = {}): EffectObservationV1 {
  const outcomeDigest = sha256(`${effect.effectId}:${classification}:outcome`);
  return {
    version: 1, observationId: `observation_${classification.toLowerCase()}`, effectId: effect.effectId, classification,
    targetFence: effect.identity.fence, observedFence: fence, expectedRevision: revision, identityDigest: digestCanonical(effect.identity),
    observedAt: "2026-01-01T00:00:01.000Z", observerDigest: sha256(`${effect.effectId}:${classification}:observer`),
    ...(classification === "COMPLETED" ? { outcomeDigest } : {}), reasons: [`classified ${classification.toLowerCase()} without replay`], ...extra,
  };
}

for (const classification of ["COMPLETED", "ACTIVE", "ABSENT", "UNCERTAIN"] as const) {
  test(`application durably reconciles ${classification} child without blind replay`, async () => {
    const runId = `run_${classification.toLowerCase()}`; const setup = await prepareChildCrash(runId);
    try {
      const context = await acquireRecoveryFence(setup, runId); const effect = await interrupt(setup, runId, context);
      const value = observation(effect, setup.revision, context.fence, classification, classification === "COMPLETED" ? { terminalStatus: "completed", changedPaths: ["src/solution.ts"], rawResultDigest: sha256("recovered child result") } : {});
      const command = { version: 1 as const, kind: "reconcileEffect" as const, metadata: { runId, expectedRevision: setup.revision, idempotencyKey: `phase4_reconcile_${classification.toLowerCase()}` }, observation: value };
      const receipt = await setup.fixture.application.execute(command, context); setup.revision = receipt.revision;
      const run = (await setup.fixture.store.load(runId))!; const recovered = run.effects.find((entry) => entry.effectId === effect.effectId)!;
      assert.equal(setup.fixture.agent.calls.length, 0, "reconciliation cannot replay the child");
      if (classification === "COMPLETED") {
        assert.equal(recovered.state, "COMMITTED"); assert.equal(run.attempts[0]?.state, "COLLECTING"); assert.equal(run.workerClaims.length, 1);
        const duplicate = await setup.fixture.application.execute(command, context); assert.equal(duplicate.duplicate, true);
        await assert.rejects(setup.fixture.application.execute({ ...command, metadata: { ...command.metadata, expectedRevision: setup.revision, idempotencyKey: "phase4_second_outcome" } }, context), errorCode("DUPLICATE_ENTITY"));
      } else if (classification === "ACTIVE") {
        assert.equal(recovered.state, "OBSERVING"); assert.equal(run.attempts[0]?.state, "RECONCILING");
        const resumed = await setup.fixture.application.execute({ version: 1, kind: "resumeEffect", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: "phase4_resume_active" }, effectId: effect.effectId }, context); setup.revision = resumed.revision;
        assert.equal((await setup.fixture.store.load(runId))?.attempts[0]?.state, "RUNNING");
      } else if (classification === "ABSENT") {
        assert.equal(recovered.state, "FAILED_ABSENT"); assert.equal(run.attempts[0]?.state, "RETRYABLE");
        const old = run.attempts[0]!; const signalled = await setup.fixture.application.execute({ version: 1, kind: "signal", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: "phase4_retry_signal" }, signal: "retry", entityId: old.attemptId }, context); setup.revision = signalled.revision;
        const retried = await setup.fixture.application.execute({ version: 1, kind: "reserveAgentDispatch", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: "phase4_retry_reserve" }, hypothesisId: old.hypothesisId, retryOfAttemptId: old.attemptId }, context); setup.revision = retried.revision;
        const after = (await setup.fixture.store.load(runId))!; const fresh = after.attempts[1]!;
        assert.equal(after.attempts[0]?.state, "RETRIED");
        assert.notEqual(fresh.attemptId, old.attemptId); assert.notEqual(fresh.dispatchKey, old.dispatchKey); assert.notEqual(fresh.effectId, old.effectId); assert.notEqual(fresh.budgetReservationId, old.budgetReservationId);
      } else {
        assert.equal(recovered.state, "INDETERMINATE"); assert.equal(run.state, "REPORT_PENDING"); assert.equal(run.outcome, "INDETERMINATE"); assert.equal(run.reports.at(-1)?.state, "PLANNED");
      }
    } finally { await rm(setup.fixture.root, { recursive: true, force: true }); }
  });
}

test("stale callbacks after a new fence are rejected and fingerprint mismatch quarantines", async () => {
  const runId = "run_stale_recovery"; const setup = await prepareChildCrash(runId);
  try {
    const context = await acquireRecoveryFence(setup, runId); const effect = await interrupt(setup, runId, context);
    const value = observation(effect, setup.revision, context.fence, "ACTIVE");
    await assert.rejects(setup.fixture.application.execute({ version: 1, kind: "reconcileEffect", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: "phase4_stale_callback" }, observation: { ...value, observedFence: 1 } }, setup.oldContext), errorCode("STALE_FENCE"));
    const mismatch = observation(effect, setup.revision, context.fence, "COMPLETED", { terminalStatus: "completed", changedPaths: ["src/solution.ts"], fingerprint: { version: 1, certificateId: "fingerprint_mismatch", beforeDigest: sha256("before"), afterDigest: sha256("after"), equal: false, effectId: effect.effectId, fence: effect.identity.fence, containmentId: effect.identity.containmentId!, reportGenerationId: "report_pending" } });
    await setup.fixture.application.execute({ version: 1, kind: "reconcileEffect", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: "phase4_fingerprint_bad" }, observation: mismatch }, context);
    assert.equal((await setup.fixture.store.load(runId))?.state, "REPORT_PENDING");
  } finally { await rm(setup.fixture.root, { recursive: true, force: true }); }
});

test("verified descendant-owning cancellation is confirmed before the run becomes CANCELLED", async () => {
  const runId = "run_cancel_confirmed"; const setup = await prepareChildCrash(runId);
  try {
    const unit: DescendantUnitIdentityV1 = { version: 1, kind: "cgroup", identityDigest: sha256("owned cgroup"), startIdentity: "cgroup:arbor:42", containmentId: "containment_fixture", descendantOwned: true };
    const attached = await setup.fixture.application.execute({ version: 1, kind: "attachAgentChild", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: "phase4_attach_confirm" }, attemptId: setup.dispatch.attemptId, childHandle: `child_${"b".repeat(32)}`, dispatchKey: setup.dispatch.dispatchKey, workflowCorrelationDigest: sha256("workflow confirmed"), requestDigest: sha256("request confirmed"), processUnit: unit }, setup.oldContext); setup.revision = attached.revision;
    const requested = await setup.fixture.application.execute({ version: 1, kind: "cancel", metadata: { runId, expectedRevision: setup.revision, idempotencyKey: "phase4_cancel_confirm" }, reason: "stop verified descendants" }, setup.oldContext); setup.revision = requested.revision;
    let cancelledUnit: DescendantUnitIdentityV1 | undefined; let calls = 0;
    const controller = { async cancel(value: DescendantUnitIdentityV1) { calls += 1; cancelledUnit = value; return { version: 1 as const, classification: "COMPLETED" as const, observerDigest: sha256("descendants stopped") }; }, async observe() { return { version: 1 as const, classification: "COMPLETED" as const, observerDigest: sha256("descendants absent") }; } };
    const coordinator = new EffectRecoveryCoordinator(setup.fixture.application, setup.fixture.store, [], controller, setup.fixture.clock, setup.fixture.ids);
    setup.revision = await coordinator.cancelDescendants({ version: 1, runId, effectId: setup.dispatch.effectId, expectedRevision: setup.revision, idempotencyKey: "phase4_cancel_observed", context: setup.oldContext });
    const run = (await setup.fixture.store.load(runId))!; assert.equal(calls, 1); assert.deepEqual(cancelledUnit, unit); assert.equal(run.state, "REPORT_PENDING"); assert.equal(run.outcome, "CANCELLED"); assert.equal(run.reports.at(-1)?.state, "PLANNED"); assert.equal(run.attempts[0]?.state, "CANCELLED");
  } finally { await rm(setup.fixture.root, { recursive: true, force: true }); }
});

test("partial terminal work is retained and cancellation uncertainty becomes INDETERMINATE", async () => {
  const partialRun = "run_partial"; const partial = await prepareChildCrash(partialRun);
  try {
    const context = await acquireRecoveryFence(partial, partialRun); const effect = await interrupt(partial, partialRun, context);
    const value = observation(effect, partial.revision, context.fence, "COMPLETED", { terminalStatus: "failed", partial: true, changedPaths: ["src/solution.ts"], rawResultDigest: sha256("partial evidence") });
    await partial.fixture.application.execute({ version: 1, kind: "reconcileEffect", metadata: { runId: partialRun, expectedRevision: partial.revision, idempotencyKey: "phase4_partial_result" }, observation: value }, context);
    assert.equal((await partial.fixture.store.load(partialRun))?.attempts[0]?.state, "PARTIAL");
  } finally { await rm(partial.fixture.root, { recursive: true, force: true }); }

  const cancelRun = "run_cancel_uncertain"; const cancelled = await prepareChildCrash(cancelRun);
  try {
    const unit: DescendantUnitIdentityV1 = { version: 1, kind: "processGroup", identityDigest: sha256("descendant unit"), startIdentity: "pgid:42:start:100", containmentId: "containment_fixture", descendantOwned: true };
    const attached = await cancelled.fixture.application.execute({ version: 1, kind: "attachAgentChild", metadata: { runId: cancelRun, expectedRevision: cancelled.revision, idempotencyKey: "phase4_attach_cancel" }, attemptId: cancelled.dispatch.attemptId, childHandle: `child_${"a".repeat(32)}`, dispatchKey: cancelled.dispatch.dispatchKey, workflowCorrelationDigest: sha256("workflow"), requestDigest: sha256("request"), processUnit: unit }, cancelled.oldContext); cancelled.revision = attached.revision;
    const requested = await cancelled.fixture.application.execute({ version: 1, kind: "cancel", metadata: { runId: cancelRun, expectedRevision: cancelled.revision, idempotencyKey: "phase4_cancel_request" }, reason: "cancel all descendants" }, cancelled.oldContext); cancelled.revision = requested.revision;
    const effect = (await cancelled.fixture.store.load(cancelRun))!.effects.find((entry) => entry.effectId === cancelled.dispatch.effectId)!; assert.equal(effect.state, "CANCEL_REQUESTED");
    await cancelled.fixture.application.execute({ version: 1, kind: "observeEffectCancellation", metadata: { runId: cancelRun, expectedRevision: cancelled.revision, idempotencyKey: "phase4_cancel_uncertain" }, effectId: effect.effectId, outcome: "uncertain", observerDigest: sha256("cannot prove descendant death") }, cancelled.oldContext);
    const run = (await cancelled.fixture.store.load(cancelRun))!; assert.equal(run.state, "REPORT_PENDING"); assert.equal(run.outcome, "INDETERMINATE"); assert.equal(run.reports.at(-1)?.state, "PLANNED");
  } finally { await rm(cancelled.fixture.root, { recursive: true, force: true }); }
});
