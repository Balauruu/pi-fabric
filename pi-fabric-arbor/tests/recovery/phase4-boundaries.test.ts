import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import type { EffectObservationV1 } from "../../src/domain/types.js";
import { FixtureDriver, createFixtureContract } from "../../src/fixtures/driver.js";
import { renderReportFiles } from "../../src/reports/FileReportPublisher.js";
import { digestCanonical, sha256 } from "../../src/util/canonical.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

function completedObservation(effect: { effectId: string; identity: { fence: number } & object }, revision: number, outcomeDigest: string, extra: Partial<EffectObservationV1> = {}): EffectObservationV1 {
  return {
    version: 1, observationId: `observation_${effect.effectId.slice(7)}`, effectId: effect.effectId, classification: "COMPLETED",
    targetFence: effect.identity.fence, observedFence: 1, expectedRevision: revision, identityDigest: digestCanonical(effect.identity),
    observedAt: "2026-01-01T00:00:00.000Z", observerDigest: sha256(`observer:${effect.effectId}`), outcomeDigest,
    reasons: ["completed external work was observed after the injected crash"], ...extra,
  };
}

test("evaluator completion before commit recovers exactly one certificate", async () => {
  const fixture = await makeFixtureApplication(); const runId = "run_eval_recovery"; const contract = createFixtureContract();
  try {
    await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "eval_recovery_start" }, contract }, { fence: 0, now: fixture.clock.now() });
    await fixture.application.execute({ version: 1, kind: "claimDriver", metadata: { runId, expectedRevision: 1, idempotencyKey: "eval_recovery_claim" }, driverId: "driver_primary", leaseMs: 10_000 }, { fence: 0, now: fixture.clock.now() });
    const planned = await fixture.application.execute({ version: 1, kind: "advance", metadata: { runId, expectedRevision: 2, idempotencyKey: "eval_recovery_plan_" } }, { driverId: "driver_primary", fence: 1, now: fixture.clock.now() });
    let revision = planned.revision; let run = (await fixture.store.load(runId))!; const effect = run.effects[0]!;
    const certificate = await fixture.evaluator.evaluate({ version: 1, evaluationId: effect.identity.evaluationId!, effectId: effect.effectId, certificateId: effect.identity.certificateId!, runId, epochDigest: run.epochDigest, contractDigest: run.contractDigest, role: "developmentBaseline", oid: contract.repository.initialOid, contract });
    const interrupted = await fixture.application.execute({ version: 1, kind: "interruptEffect", metadata: { runId, expectedRevision: revision, idempotencyKey: "eval_recovery_interrupt" }, effectId: effect.effectId, reason: "crash after evaluator exit" }, { driverId: "driver_primary", fence: 1, now: fixture.clock.now() }); revision = interrupted.revision;
    const observation = completedObservation(effect, revision, certificate.outputDigest, { certificate });
    const reconciled = await fixture.application.execute({ version: 1, kind: "reconcileEffect", metadata: { runId, expectedRevision: revision, idempotencyKey: "eval_recovery_observe" }, observation }, { driverId: "driver_primary", fence: 1, now: fixture.clock.now() }); revision = reconciled.revision;
    run = (await fixture.store.load(runId))!;
    assert.equal(run.certificates.length, 1); assert.equal(run.developmentBaselineCertificateId, certificate.certificateId); assert.equal(fixture.evaluator.calls.length, 1);
    await assert.rejects(fixture.application.execute({ version: 1, kind: "reconcileEffect", metadata: { runId, expectedRevision: revision, idempotencyKey: "eval_recovery_duplicate" }, observation: { ...observation, observationId: "observation_eval_duplicate", expectedRevision: revision } }, { driverId: "driver_primary", fence: 1, now: fixture.clock.now() }), errorCode("DUPLICATE_ENTITY"));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("report rename and cleanup deletion recover without duplicate generation or deletion", async () => {
  const fixture = await makeFixtureApplication(); const runId = "run_report_cleanup";
  try {
    const completed = await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run(runId); let revision = completed.run.revision;
    const context = { driverId: "driver_fixture", fence: 1, now: fixture.clock.now() };
    const planned = await fixture.application.execute({ version: 1, kind: "planReport", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_report_replan" } }, context); revision = planned.revision;
    let run = (await fixture.store.load(runId))!; const report = run.reports.at(-1)!; const reportEffect = run.effects.find((entry) => entry.identity.generationId === report.generationId)!;
    const publication = await fixture.reportPublisher.publish(report.generationId, renderReportFiles(run), report.expectedManifestDigest);
    assert.equal(publication.classification, "complete");
    const interruptedReport = await fixture.application.execute({ version: 1, kind: "interruptEffect", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_report_interrupt" }, effectId: reportEffect.effectId, reason: "crash after atomic rename" }, context); revision = interruptedReport.revision;
    const reportObservation = completedObservation(reportEffect, revision, report.expectedManifestDigest!);
    const observedReport = await fixture.application.execute({ version: 1, kind: "reconcileEffect", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_report_recover" }, observation: reportObservation }, context); revision = observedReport.revision;
    run = (await fixture.store.load(runId))!; assert.equal(run.reports.filter((entry) => entry.generationId === report.generationId).length, 1); assert.equal(run.reports.at(-1)?.state, "PUBLISHED");

    const cleanupPlan = await fixture.application.execute({ version: 1, kind: "planCleanup", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_cleanup_plan" }, resourceId: "resource_recovered", resourceKind: "workspace" }, context); revision = cleanupPlan.revision;
    run = (await fixture.store.load(runId))!; const cleanup = run.cleanup.at(-1)!; const cleanupEffect = run.effects.find((entry) => entry.identity.cleanupId === cleanup.cleanupId)!; const cleanupIntentReport = run.reports.at(-1)!;
    const cleanupReportWrite = await fixture.application.execute({ version: 1, kind: "publishReport", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_cleanup_report_write" }, generationId: cleanupIntentReport.generationId }, context); revision = cleanupReportWrite.revision;
    const cleanupReportObserve = await fixture.application.execute({ version: 1, kind: "observeReport", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_cleanup_report_observe" }, generationId: cleanupIntentReport.generationId }, context); revision = cleanupReportObserve.revision;
    await fixture.cleanup.execute({ version: 1, cleanupId: cleanup.cleanupId, resourceId: cleanup.resourceId, resourceKind: cleanup.resourceKind, runId, effectId: cleanupEffect.effectId });
    const interruptedCleanup = await fixture.application.execute({ version: 1, kind: "interruptEffect", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_cleanup_interrupt" }, effectId: cleanupEffect.effectId, reason: "crash after deletion" }, context); revision = interruptedCleanup.revision;
    const cleanupObservation = completedObservation(cleanupEffect, revision, sha256(`deleted:${cleanup.resourceId}`));
    await fixture.application.execute({ version: 1, kind: "reconcileEffect", metadata: { runId, expectedRevision: revision, idempotencyKey: "phase4_cleanup_recover" }, observation: cleanupObservation }, context);
    run = (await fixture.store.load(runId))!; assert.equal(run.cleanup.at(-1)?.state, "COMPLETED"); assert.equal(fixture.cleanup.calls.length, 1); assert.equal(run.state, "REPORT_PENDING");
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
