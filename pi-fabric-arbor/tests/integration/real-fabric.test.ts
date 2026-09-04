import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { rejectSchemaEnforceForExternalAgents } from "../../src/compatibility/certification.js";
import { assertHostIntegrationObservationsPassedV1 } from "../../src/certification/host-integration-runtime.js";
import { ArborError } from "../../src/domain/errors.js";
import type { ArborCommandV1, EffectObservationV1 } from "../../src/domain/types.js";
import { createFixtureContract, FixtureDriver } from "../../src/fixtures/driver.js";
import { createArborProvider } from "../../src/public/provider.js";
import { digestCanonical, sha256 } from "../../src/util/canonical.js";
import { makeFixtureApplication } from "../helpers.js";

type CommandWithoutMetadata = ArborCommandV1 extends infer Command ? Command extends { metadata: unknown } ? Omit<Command, "metadata"> : never : never;

async function prepareRecoveredRetry(fixture: Awaited<ReturnType<typeof makeFixtureApplication>>, runId: string): Promise<void> {
  let revision = 0; let fence = 0; let serial = 0; const driverId = "driver_fabric_recovery"; const contract = createFixtureContract();
  const execute = async (command: CommandWithoutMetadata) => {
    serial += 1; const receipt = await fixture.application.execute({ ...command, metadata: { runId, expectedRevision: revision, idempotencyKey: `fabric_recovery_${serial.toString().padStart(4, "0")}` } } as ArborCommandV1, { driverId, fence, now: fixture.clock.now() }); revision = receipt.revision; return receipt;
  };
  await execute({ version: 1, kind: "start", contract }); await execute({ version: 1, kind: "claimDriver", driverId, leaseMs: 1000 }); fence = 1;
  await execute({ version: 1, kind: "advance" }); await execute({ version: 1, kind: "evaluate", role: "developmentBaseline", oid: contract.repository.initialOid }); await execute({ version: 1, kind: "advance" }); await execute({ version: 1, kind: "evaluate", role: "heldOutBaseline", oid: contract.repository.initialOid }); await execute({ version: 1, kind: "advance" });
  const hypothesisId = "hypothesis_recovery"; await execute({ version: 1, kind: "proposeHypothesis", hypothesis: { version: 1, hypothesisId, rationale: "Recover before any bounded retry.", plan: ["Observe absence, then create a fresh dispatch identity."] } }); await execute({ version: 1, kind: "advance" }); await execute({ version: 1, kind: "selectHypothesis", hypothesisId });
  const reserved = await execute({ version: 1, kind: "reserveAgentDispatch", hypothesisId }); const reserveDirective = reserved.directive; if (reserveDirective?.kind !== "materializeWorkspace") throw new Error("expected workspace materialization directive"); const attemptId = reserveDirective.attemptId;
  const materialized = await execute({ version: 1, kind: "materializeWorkspace", attemptId }); const materializeDirective = materialized.directive; if (materializeDirective?.kind !== "dispatchAgent") throw new Error("expected agent dispatch directive"); const dispatch = materializeDirective.dispatch;
  fixture.clock.advance(1000); await execute({ version: 1, kind: "claimDriver", driverId, leaseMs: 10_000 }); fence = 2;
  await execute({ version: 1, kind: "interruptEffect", effectId: dispatch.effectId, reason: "injected Fabric integration interruption" }); const interrupted = (await fixture.store.load(runId))!.effects.find((entry) => entry.effectId === dispatch.effectId)!;
  const observation: EffectObservationV1 = { version: 1, observationId: "observation_fabric_absent", effectId: interrupted.effectId, classification: "ABSENT", targetFence: interrupted.identity.fence, observedFence: fence, expectedRevision: revision, identityDigest: digestCanonical(interrupted.identity), observedAt: fixture.clock.now(), observerDigest: sha256("real Fabric integration observer"), reasons: ["The old child identity is absent; blind replay remains forbidden."] };
  await execute({ version: 1, kind: "reconcileEffect", observation }); await execute({ version: 1, kind: "signal", signal: "retry", entityId: attemptId }); await execute({ version: 1, kind: "reserveAgentDispatch", hypothesisId, retryOfAttemptId: attemptId });
}

class Events {
  readonly handlers = new Map<string, Array<(payload: unknown, context?: unknown) => unknown>>();
  on(name: string, handler: (payload: unknown, context?: unknown) => unknown): () => void { const list = this.handlers.get(name) ?? []; list.push(handler); this.handlers.set(name, list); return () => { const index = list.indexOf(handler); if (index >= 0) list.splice(index, 1); }; }
  emit(name: string, payload: unknown): void { for (const handler of this.handlers.get(name) ?? []) handler(payload); }
  async dispatch(name: string, payload: unknown, context: unknown): Promise<void> { for (const handler of this.handlers.get(name) ?? []) await handler(payload, context); }
}

test("host integration certifier rejects every false sentinel observation", () => {
  const observations = { providerActivated: true, providerDiscovered: true, componentShutdown: true, schemaEnforceRejected: true, nestedSchemaRejected: true, arborCancellation: false, boundedFanOut: true, childCorrelation: true, cleanupCompleted: true };
  assert.throws(() => assertHostIntegrationObservationsPassedV1(observations), /arborCancellation/u);
});

test("real Pi Fabric executes the Arbor dynamic provider while the runtime proves recovery, bounded fan-out, cancellation, cleanup, and validated output", { timeout: 30_000 }, async () => {
  const fixture = await makeFixtureApplication(); const hostRoot = join(fixture.root, "fabric-host"); const originalHome = process.env.HOME; const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
  let shutdown: (() => Promise<void>) | undefined;
  try {
    await new FixtureDriver(fixture.application, fixture.store, fixture.clock).run("run_fabric_complete"); await prepareRecoveredRetry(fixture, "run_fabric_recovery");
    const cleanup = await fixture.cleanup.execute({ version: 1, cleanupId: "cleanup_fabric_integration", resourceId: "resource_fabric_scratch", resourceKind: "scratch", runId: "run_fabric_complete", effectId: "effect_fabric_cleanup" }); assert.equal(cleanup.outcome, "completed");
    process.env.HOME = hostRoot; process.env.PI_CODING_AGENT_DIR = join(hostRoot, ".pi", "agent"); await mkdir(join(hostRoot, ".pi"), { recursive: true });
    await writeFile(join(hostRoot, ".pi", "fabric.json"), `${JSON.stringify({ configVersion: 1, fullCodeMode: false, approvals: { read: "allow", write: "allow", execute: "allow", network: "allow", agent: "allow" }, components: [{ id: "arbor-real-integration", component: "arbor-real-integration", config: { version: 1 } }] })}\n`);
    const fabricRoot = resolve(process.env.PI_FABRIC_CERT_PACKAGE_ROOT ?? "node_modules/pi-fabric");
    const [{ default: piFabric }, protocol] = await Promise.all([import(pathToFileURL(join(fabricRoot, "dist/index.js")).href), import(pathToFileURL(join(fabricRoot, "dist/protocol.js")).href)]); const hostEvents = new Events(); const protocolEvents = new Events(); const tools = new Map<string, { execute(id: string, params: Record<string, unknown>, signal: AbortSignal | undefined, update: undefined, context: unknown): Promise<{ content: Array<{ type: string; text?: string }>; details?: unknown; isError?: boolean }> }>();
    const pi = { events: { on: protocolEvents.on.bind(protocolEvents), emit: protocolEvents.emit.bind(protocolEvents) }, on: hostEvents.on.bind(hostEvents), registerTool(tool: { name: string }) { tools.set(tool.name, tool as never); }, registerCommand() {}, registerMessageRenderer() {}, getAllTools() { return [...tools.values()]; }, getActiveTools() { return [...tools.keys()]; }, getThinkingLevel() { return "medium"; } };
    await piFabric(pi as never);
    protocolEvents.emit(protocol.FABRIC_COMPONENT_REGISTER_EVENT, { version: 1, overwrite: true, component: { name: "arbor-real-integration", description: "Real Fabric integration lane for the package provider.", requires: [], provides: [{ provider: "arbor" }], guarantee: "managed", async activate(context: { provide(provider: unknown): void }) { context.provide(createArborProvider(fixture.application)); } } });
    const noOp = () => undefined; const context = { ui: new Proxy({}, { get: () => noOp }), mode: "print", hasUI: false, cwd: hostRoot, sessionManager: { getSessionId: () => "session_fabric_integration", getBranch: () => [], getEntries: () => [], getSessionFile: () => undefined }, modelRegistry: {}, model: undefined, scopedModels: [], isIdle: () => true, isProjectTrusted: () => true, signal: undefined, abort: noOp, hasPendingMessages: () => false, shutdown: noOp, getContextUsage: () => undefined, compact: noOp, getSystemPrompt: () => "" };
    await hostEvents.dispatch("session_start", {}, context);
    shutdown = () => hostEvents.dispatch("session_shutdown", { reason: "quit" }, context);
    const fabricExec = tools.get("fabric_exec"); assert.ok(fabricExec, "the real pi-fabric package did not register fabric_exec");
    const contract = JSON.stringify(createFixtureContract());
    const code = `
      let revision = 0; let serial = 0;
      const command = async (ref, value, label) => { serial += 1; const result = await tools.call({ ref, args: { ...value, metadata: { runId: "run_fabric_cancel", expectedRevision: revision, idempotencyKey: ("fabric_dynamic_" + label + "_" + serial).padEnd(16, "_") } } }); revision = result.revision; return result; };
      await command("arbor.start", { version: 1, contract: ${contract} }, "start"); await command("arbor.claimDriver", { version: 1, driverId: "driver_dynamic", leaseMs: 300000 }, "claim"); const cancellation = await command("arbor.cancel", { version: 1, reason: "integration cancellation" }, "cancel");
      if (cancellation.directive?.kind !== "publishReport") throw new Error("cancellation did not expose its mandatory report debt");
      await command("arbor.publishReport", { version: 1, generationId: cancellation.directive.generationId }, "publish_cancel_report");
      await command("arbor.observeReport", { version: 1, generationId: cancellation.directive.generationId }, "observe_cancel_report");
      const cancelled = await tools.call({ ref: "arbor.inspect", args: { version: 1, runId: "run_fabric_cancel", view: "overview", limit: 20 } });
      const complete = await tools.call({ ref: "arbor.inspect", args: { version: 1, runId: "run_fabric_complete", view: "report", limit: 20 } });
      const recovered = await tools.call({ ref: "arbor.inspect", args: { version: 1, runId: "run_fabric_recovery", view: "attempts", limit: 20 } });
      let structuredInputRejected = false; try { await tools.call({ ref: "arbor.inspect", args: { version: 1, runId: "run_fabric_complete", view: "attempts", limit: 1001 } }); } catch { structuredInputRejected = true; }
      return { cancelled: cancelled.data.summary.state, reportState: complete.data.obligationStatus, attempts: recovered.data.attempts.length, structuredInputRejected };
    `;
    let schemaEnforceRejected = false;
    try { rejectSchemaEnforceForExternalAgents("enforce"); } catch (error) { schemaEnforceRejected = error instanceof ArborError && error.code === "COMPATIBILITY_CERTIFICATION_REQUIRED"; }
    assert.equal(schemaEnforceRejected, true, "Schema enforce did not reject external agents");
    const result = await fabricExec.execute("tool_real_fabric_integration", { code, resultFormat: "json" }, undefined, undefined, context); assert.notEqual(result.isError, true, result.content[0]?.text ?? "fabric_exec failed without text");
    const output = JSON.parse(result.content.find((entry) => entry.type === "text")?.text ?? "{}") as { cancelled: string; reportState: string; attempts: number; structuredInputRejected: boolean };
    assert.deepEqual(output, { cancelled: "CANCELLED", reportState: "published", attempts: 2, structuredInputRejected: true });
    const details = result.details as { audits: Array<{ ref: string; success: boolean }>; trace: { outcome: string; operations: Array<{ ref?: string; outcome: string }> } }; assert.equal(details.trace.outcome, "succeeded"); assert.ok(details.audits.filter((entry) => entry.ref.startsWith("arbor.") && entry.success).length >= 6); assert.ok(details.trace.operations.some((entry) => entry.ref === "arbor.inspect" && entry.outcome === "failed"), "schema-invalid nested call was not rejected");
    const recovery = (await fixture.store.load("run_fabric_recovery"))!; assert.deepEqual(recovery.attempts.map((entry) => entry.state), ["RETRIED", "PREPARING"]); assert.equal(recovery.attempts[1]!.retryOfAttemptId, recovery.attempts[0]!.attemptId); assert.notEqual(recovery.attempts[1]!.dispatchKey, recovery.attempts[0]!.dispatchKey); assert.ok((await fixture.store.readEvents("run_fabric_recovery", 0, 100)).events.some((entry) => entry.type === "RECOVERY_REQUIRED")); assert.ok(recovery.attempts.filter((entry) => ["PREPARING", "READY", "DISPATCHING", "RUNNING", "COLLECTING", "FINALIZING", "RECONCILING"].includes(entry.state)).length <= recovery.contract.budgets.maxConcurrentAttempts);
    const completed = (await fixture.store.load("run_fabric_complete"))!; assert.equal(completed.agentChildren.length, 1); const child = completed.agentChildren[0]!; const childAttempt = completed.attempts.find((entry) => entry.attemptId === child.attemptId); const childEffect = completed.effects.find((entry) => entry.effectId === child.effectId); assert.ok(childAttempt); assert.ok(childEffect); assert.equal(child.dispatchKey, childAttempt.dispatchKey); assert.equal(child.effectId, childAttempt.effectId); assert.equal(child.fence, childEffect.identity.fence); assert.equal(child.requestDigest, completed.dispatchIntents.find((entry) => entry.attemptId === child.attemptId)?.requestSchemaDigest); assert.match(child.workflowCorrelationDigest, /^[0-9a-f]{64}$/u);
    assert.deepEqual(fixture.cleanup.calls, [{ version: 1, cleanupId: "cleanup_fabric_integration", resourceId: "resource_fabric_scratch", resourceKind: "scratch", runId: "run_fabric_complete", effectId: "effect_fabric_cleanup" }]);
    await shutdown(); shutdown = undefined;
    process.stdout.write(`ARBOR_HOST_INTEGRATION_RESULT_V1 ${JSON.stringify({ providerActivated: true, providerDiscovered: true, componentShutdown: true, schemaEnforceRejected, nestedSchemaRejected: output.structuredInputRejected, arborCancellation: output.cancelled === "CANCELLED", boundedFanOut: true, childCorrelation: true, cleanupCompleted: cleanup.outcome === "completed" })}\n`);
  } finally {
    await shutdown?.().catch(() => undefined);
    process.env.HOME = originalHome;
    if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR; else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
    await rm(fixture.root, { recursive: true, force: true });
  }
});
