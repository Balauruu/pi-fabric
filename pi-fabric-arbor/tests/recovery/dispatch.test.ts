import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AdmittedDriverDispatcher, classifyDispatchCrashGap, type AgentWorkspaceHandshakeV1, type CertifiedPublicAgentsInvokerV1, type FabricChildRecordV1, type StartedAttachmentV1 } from "../../src/driver/AdmittedDriver.js";
import type { AgentDispatchIntentV1 } from "../../src/domain/types.js";

const dispatch: AgentDispatchIntentV1 = { version: 1, effectId: "effect_dispatch", dispatchKey: "dispatch_key", runId: "run_dispatch", hypothesisId: "hypothesis_dispatch", attemptId: "attempt_dispatch", fence: 7, workspaceId: "workspace_dispatch", containmentId: "containment_linux", cwdToken: `cwd_${"a".repeat(64)}`, agentProfileId: "agent_worker", requestSchemaDigest: "b".repeat(64), resultSchemaDigest: "c".repeat(64), toolPolicyId: "policy_worker", budgetReservationId: "budget_dispatch", expiresAt: "2999-01-01T00:00:00.000Z" };
const admission = { version: 1 as const, upstreamCertificationId: "upstream_cert", compatibilityCertificationId: "compatibility_cert", containmentCertificationId: "containment_cert", packageVersion: "0.1.0", schemaDigest: "d".repeat(64), schemaMode: "off" as const, fabricWorkflowCorrelationId: "workflow_correlation", currentFence: 7 };

class Invoker implements CertifiedPublicAgentsInvokerV1 {
  readonly certificationId = "compatibility_cert"; readonly piFabricVersion = "0.76.2" as const; calls: string[] = []; records: FabricChildRecordV1[] = []; complete = true;
  async call(ref: "agents.spawn" | "agents.wait" | "agents.status" | "agents.stop" | "agents.cleanup"): Promise<unknown> { this.calls.push(ref); return ref === "agents.spawn" ? { id: "child_one", status: "running", startedAt: "2026-09-01T00:00:00.000Z" } : { id: "child_one", status: "completed", resultDigest: "e".repeat(64) }; }
  async lookupByDispatchKey(): Promise<{ complete: boolean; records: FabricChildRecordV1[] }> { return { complete: this.complete, records: this.records }; }
  async resolveDescendantUnit() { return { version: 1 as const, kind: "processGroup" as const, identityDigest: "9".repeat(64), startIdentity: "child_one:2026-09-01T00:00:00.000Z", containmentId: dispatch.containmentId, descendantOwned: true as const }; }
}

function writeHandshake(workspace: string, attachment: StartedAttachmentV1): AgentWorkspaceHandshakeV1 {
  const handshake = { version: 1 as const, dispatchKey: dispatch.dispatchKey, attemptId: dispatch.attemptId, requestDigest: attachment.requestDigest, containmentId: dispatch.containmentId, writtenAt: "2026-09-01T00:00:00.000Z" };
  mkdirSync(join(workspace, ".arbor")); writeFileSync(join(workspace, ".arbor", "handshake.v1.json"), JSON.stringify(handshake)); return handshake;
}

test("explicit admitted driver uses supplied public invoker, attaches STARTED immediately, validates handshake, then submits terminal observation", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-dispatch-"));
  try {
    const invoker = new Invoker(); const events: string[] = []; let attachment!: StartedAttachmentV1;
    const driver = new AdmittedDriverDispatcher(invoker, { async attachStarted(value) { events.push("STARTED"); attachment = value; }, async submitTerminal(value) { events.push(`TERMINAL:${value.terminalStatus}`); } }, async () => ({ version: 1, dispatchKey: dispatch.dispatchKey, cwd: root, task: "bounded task", name: "arbor-worker", tools: ["read"], schema: { type: "object", additionalProperties: false }, timeoutMs: 1000, transport: "process", extensions: false, recursive: false, worktree: false }));
    assert.deepEqual(invoker.calls, []);
    await driver.dispatch(dispatch, admission); assert.deepEqual(invoker.calls, ["agents.spawn"]); assert.deepEqual(events, ["STARTED"]);
    writeHandshake(root, attachment); await driver.waitAndSubmit(dispatch, attachment, root);
    assert.deepEqual(invoker.calls, ["agents.spawn", "agents.wait"]); assert.deepEqual(events, ["STARTED", "TERMINAL:completed"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("dispatch crash gap classifies COMPLETED, ACTIVE, ABSENT, and UNCERTAIN without blind replay", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-dispatch-recovery-"));
  try {
    const invoker = new Invoker(); const requestDigest = "f".repeat(64); const workflowCorrelationId = "workflow_correlation";
    const attachment = { version: 1 as const, attemptId: dispatch.attemptId, dispatchKey: dispatch.dispatchKey, childId: "child_one", workflowCorrelationId, requestDigest, containmentId: dispatch.containmentId, observedStartTime: "2026-09-01T00:00:00.000Z", fence: 7, childHandleDigest: "0".repeat(64), processUnit: await invoker.resolveDescendantUnit() };
    writeHandshake(root, attachment);
    const record = (status: FabricChildRecordV1["status"]): FabricChildRecordV1 => ({ id: "child_one", status, dispatchKey: dispatch.dispatchKey, workflowCorrelationId, requestDigest, startedAt: "2026-09-01T00:00:00.000Z", ...(status === "completed" ? { resultDigest: "1".repeat(64) } : {}) });
    invoker.records = [record("completed")];
    const complete = await classifyDispatchCrashGap({ dispatch, requestDigest, workflowCorrelationId, workspace: root, invoker, containedUnitActive: false, now: "2026-09-01T00:00:10.000Z", graceEndsAt: "2026-09-01T00:00:05.000Z" });
    assert.equal(complete.classification, "COMPLETED"); assert.equal(complete.replayPermitted, false);
    invoker.records = [record("running")];
    assert.equal((await classifyDispatchCrashGap({ dispatch, requestDigest, workflowCorrelationId, workspace: root, invoker, containedUnitActive: true, now: "2026-09-01T00:00:10.000Z", graceEndsAt: "2026-09-01T00:00:05.000Z" })).classification, "ACTIVE");
    rmSync(join(root, ".arbor"), { recursive: true }); invoker.records = [];
    const absent = await classifyDispatchCrashGap({ dispatch, requestDigest, workflowCorrelationId, workspace: root, invoker, containedUnitActive: false, now: "2026-09-01T00:00:10.000Z", graceEndsAt: "2026-09-01T00:00:05.000Z" });
    assert.equal(absent.classification, "ABSENT"); assert.equal(absent.action, "fail-absent-new-attempt-required"); assert.equal(absent.replayPermitted, false);
    invoker.complete = false;
    assert.equal((await classifyDispatchCrashGap({ dispatch, requestDigest, workflowCorrelationId, workspace: root, invoker, containedUnitActive: "unknown", now: "2026-09-01T00:00:00.000Z", graceEndsAt: "2026-09-01T00:00:05.000Z" })).classification, "UNCERTAIN");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
