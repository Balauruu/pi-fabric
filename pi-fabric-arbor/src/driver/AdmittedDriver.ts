import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ArborError } from "../domain/errors.js";
import type { AgentDispatchIntentV1, DescendantUnitIdentityV1 } from "../domain/types.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { assertCertifiedPiFabricVersionV1, type CertifiedPiFabricVersionV1 } from "../certification/pi-fabric-support.js";

export interface CertifiedPublicAgentsInvokerV1 {
  readonly certificationId: string;
  readonly piFabricVersion: CertifiedPiFabricVersionV1;
  call(ref: "agents.spawn" | "agents.wait" | "agents.status" | "agents.stop" | "agents.cleanup", args: Readonly<Record<string, unknown>>, options: { signal?: AbortSignal; correlationId: string }): Promise<unknown>;
  lookupByDispatchKey(dispatchKey: string): Promise<{ complete: boolean; records: FabricChildRecordV1[] }>;
  resolveDescendantUnit(childId: string, containmentId: string): Promise<DescendantUnitIdentityV1>;
}

export interface FabricChildRecordV1 {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "stopped" | "timed_out";
  dispatchKey: string;
  workflowCorrelationId: string;
  requestDigest: string;
  startedAt: string;
  resultDigest?: string;
}

export interface ResolvedAgentDispatchV1 {
  version: 1;
  dispatchKey: string;
  cwd: string;
  task: string;
  name: string;
  tools: string[];
  schema: Readonly<Record<string, unknown>>;
  timeoutMs: number;
  transport: "process";
  extensions: false;
  recursive: false;
  worktree: false;
}

export interface AgentWorkspaceHandshakeV1 {
  version: 1;
  dispatchKey: string;
  attemptId: string;
  requestDigest: string;
  containmentId: string;
  writtenAt: string;
}

export interface StartedAttachmentV1 {
  version: 1;
  attemptId: string;
  dispatchKey: string;
  childId: string;
  workflowCorrelationId: string;
  requestDigest: string;
  containmentId: string;
  observedStartTime: string;
  fence: number;
  childHandleDigest: string;
  processUnit: DescendantUnitIdentityV1;
}

export interface AdmittedDriverCallbacksV1 {
  attachStarted(attachment: StartedAttachmentV1): Promise<void>;
  submitTerminal(observation: { version: 1; attemptId: string; dispatchKey: string; childId: string; terminalStatus: "completed" | "failed" | "cancelled"; resultDigest: string; handshakeDigest: string }): Promise<void>;
}

export interface DispatchAdmissionV1 {
  version: 1;
  upstreamCertificationId: string;
  compatibilityCertificationId: string;
  containmentCertificationId: string;
  packageVersion: string;
  schemaDigest: string;
  schemaMode: "off" | "audit" | "enforce";
  fabricWorkflowCorrelationId: string;
  currentFence: number;
}

export type ChildObservationClassification = "COMPLETED" | "ACTIVE" | "ABSENT" | "UNCERTAIN";

export interface DispatchRecoveryObservationV1 {
  version: 1;
  classification: ChildObservationClassification;
  dispatchKey: string;
  record?: FabricChildRecordV1;
  handshake?: AgentWorkspaceHandshakeV1;
  reasons: string[];
  replayPermitted: boolean;
  action: "attach-and-commit" | "attach-and-observe" | "fail-absent-new-attempt-required" | "mark-indeterminate";
}

function assertSha(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) throw new ArborError("EVIDENCE_INVALID", `${label} is not SHA-256`);
}

function validateAdmission(dispatch: AgentDispatchIntentV1, admission: DispatchAdmissionV1, invoker: CertifiedPublicAgentsInvokerV1): void {
  assertCertifiedPiFabricVersionV1(invoker.piFabricVersion);
  if (admission.schemaMode === "enforce") throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Fabric Schema enforce mode rejects external Arbor agents");
  if (!admission.upstreamCertificationId || !admission.compatibilityCertificationId || invoker.certificationId !== admission.compatibilityCertificationId) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Driver certification binding mismatch");
  if (!admission.containmentCertificationId) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Containment certificate binding is absent");
  if (dispatch.fence !== admission.currentFence) throw new ArborError("STALE_FENCE", "Dispatch fence does not equal the admitted driver fence");
  if (Date.parse(dispatch.expiresAt) <= Date.now()) throw new ArborError("LEASE_EXPIRED", "Dispatch specification has expired");
  assertSha(dispatch.requestSchemaDigest, "Request schema digest");
  assertSha(dispatch.resultSchemaDigest, "Result schema digest");
}

function readHandshake(workspace: string): AgentWorkspaceHandshakeV1 | undefined {
  const path = join(workspace, ".arbor", "handshake.v1.json");
  if (!existsSync(path)) return undefined;
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65_536) throw new ArborError("EVIDENCE_INVALID", "Agent handshake is not a bounded regular file");
  let value: unknown;
  try { value = JSON.parse(readFileSync(path, "utf8")); } catch { throw new ArborError("EVIDENCE_INVALID", "Agent handshake is not strict JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ArborError("EVIDENCE_INVALID", "Agent handshake is malformed");
  const keys = Object.keys(value).sort();
  const expectedKeys = ["attemptId", "containmentId", "dispatchKey", "requestDigest", "version", "writtenAt"].sort();
  if (canonicalJson(keys) !== canonicalJson(expectedKeys)) throw new ArborError("EVIDENCE_INVALID", "Agent handshake is not a closed record");
  const handshake = value as AgentWorkspaceHandshakeV1;
  if (handshake.version !== 1 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(handshake.writtenAt)) throw new ArborError("EVIDENCE_INVALID", "Agent handshake version or timestamp is invalid");
  return handshake;
}

function validateHandshake(handshake: AgentWorkspaceHandshakeV1, dispatch: AgentDispatchIntentV1, requestDigest: string): void {
  const checks: Array<[string, string, string]> = [
    [handshake.dispatchKey, dispatch.dispatchKey, "dispatch key"], [handshake.attemptId, dispatch.attemptId, "attempt"],
    [handshake.requestDigest, requestDigest, "request digest"], [handshake.containmentId, dispatch.containmentId, "containment"],
  ];
  for (const [actual, expected, label] of checks) if (actual !== expected) throw new ArborError("EVIDENCE_INVALID", `Agent handshake ${label} mismatch`);
}

function childFromUnknown(value: unknown, dispatchKey: string, workflowCorrelationId: string, requestDigest: string): FabricChildRecordV1 {
  if (!value || typeof value !== "object") throw new ArborError("EVIDENCE_INVALID", "Fabric agents.spawn returned no child handle");
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.status !== "string") throw new ArborError("EVIDENCE_INVALID", "Fabric child handle is malformed");
  if (!["queued", "running", "completed", "failed", "stopped", "timed_out"].includes(record.status)) throw new ArborError("EVIDENCE_INVALID", "Fabric child status is unsupported");
  return {
    id: record.id,
    status: record.status as FabricChildRecordV1["status"],
    dispatchKey,
    workflowCorrelationId,
    requestDigest,
    startedAt: typeof record.startedAt === "string" ? record.startedAt : new Date().toISOString(),
    ...(typeof record.resultDigest === "string" ? { resultDigest: record.resultDigest } : {}),
  };
}

/** Explicit driver helper. It never starts by itself and has no autonomous loop. */
export class AdmittedDriverDispatcher {
  constructor(
    readonly invoker: CertifiedPublicAgentsInvokerV1,
    readonly callbacks: AdmittedDriverCallbacksV1,
    readonly resolvePackageSpec: (dispatch: AgentDispatchIntentV1) => Promise<ResolvedAgentDispatchV1>,
  ) {}

  async dispatch(dispatch: AgentDispatchIntentV1, admission: DispatchAdmissionV1, signal?: AbortSignal): Promise<StartedAttachmentV1> {
    validateAdmission(dispatch, admission, this.invoker);
    const resolved = await this.resolvePackageSpec(dispatch);
    if (resolved.dispatchKey !== dispatch.dispatchKey || resolved.transport !== "process" || resolved.extensions !== false || resolved.recursive !== false || resolved.worktree !== false) throw new ArborError("EVIDENCE_INVALID", "Resolved dispatch changed an immutable package-issued field");
    if (resolved.tools.length > 64 || resolved.task.length > 16_384 || resolved.timeoutMs < 1 || resolved.timeoutMs > 3_600_000) throw new ArborError("VALIDATION_FAILED", "Resolved dispatch exceeds a bound");
    const requestDigest = digestCanonical({ dispatch, resolved: { ...resolved, cwd: "<opaque-package-workspace>" }, admission });
    const raw = await this.invoker.call("agents.spawn", {
      name: resolved.name,
      task: resolved.task,
      cwd: resolved.cwd,
      tools: resolved.tools,
      schema: resolved.schema,
      timeoutMs: resolved.timeoutMs,
      transport: resolved.transport,
      extensions: false,
      recursive: false,
      worktree: false,
    }, { ...(signal ? { signal } : {}), correlationId: admission.fabricWorkflowCorrelationId });
    const child = childFromUnknown(raw, dispatch.dispatchKey, admission.fabricWorkflowCorrelationId, requestDigest);
    const processUnit = await this.invoker.resolveDescendantUnit(child.id, dispatch.containmentId);
    if (!processUnit.descendantOwned || processUnit.containmentId !== dispatch.containmentId) throw new ArborError("EVIDENCE_INVALID", "Fabric child has no verified descendant-owning process unit");
    const attachment: StartedAttachmentV1 = {
      version: 1, attemptId: dispatch.attemptId, dispatchKey: dispatch.dispatchKey, childId: child.id,
      workflowCorrelationId: admission.fabricWorkflowCorrelationId, requestDigest, containmentId: dispatch.containmentId,
      observedStartTime: child.startedAt, fence: admission.currentFence, childHandleDigest: sha256(child.id), processUnit,
    };
    // The first operation after a successful spawn is durable STARTED attachment.
    await this.callbacks.attachStarted(attachment);
    return attachment;
  }

  async waitAndSubmit(dispatch: AgentDispatchIntentV1, attachment: StartedAttachmentV1, workspace: string, signal?: AbortSignal): Promise<void> {
    const raw = await this.invoker.call("agents.wait", { id: attachment.childId }, { ...(signal ? { signal } : {}), correlationId: attachment.workflowCorrelationId });
    const child = childFromUnknown(raw, dispatch.dispatchKey, attachment.workflowCorrelationId, attachment.requestDigest);
    if (child.id !== attachment.childId || child.requestDigest !== attachment.requestDigest) throw new ArborError("EVIDENCE_INVALID", "Terminal child correlation mismatch");
    const handshake = readHandshake(workspace);
    if (!handshake) throw new ArborError("EVIDENCE_INVALID", "Terminal child has no first-write workspace handshake");
    validateHandshake(handshake, dispatch, attachment.requestDigest);
    const terminalStatus = child.status === "completed" ? "completed" : child.status === "stopped" || child.status === "timed_out" ? "cancelled" : "failed";
    await this.callbacks.submitTerminal({ version: 1, attemptId: dispatch.attemptId, dispatchKey: dispatch.dispatchKey, childId: child.id, terminalStatus, resultDigest: child.resultDigest ?? digestCanonical(raw), handshakeDigest: digestCanonical(handshake) });
  }
}

export async function classifyDispatchCrashGap(input: {
  dispatch: AgentDispatchIntentV1;
  requestDigest: string;
  workflowCorrelationId: string;
  workspace: string;
  invoker: CertifiedPublicAgentsInvokerV1;
  containedUnitActive: boolean | "unknown";
  now: string;
  graceEndsAt: string;
}): Promise<DispatchRecoveryObservationV1> {
  let lookup: { complete: boolean; records: FabricChildRecordV1[] };
  try { lookup = await input.invoker.lookupByDispatchKey(input.dispatch.dispatchKey); }
  catch { return { version: 1, classification: "UNCERTAIN", dispatchKey: input.dispatch.dispatchKey, reasons: ["certified host correlation lookup failed"], replayPermitted: false, action: "mark-indeterminate" }; }
  const matching = lookup.records.filter((record) => record.dispatchKey === input.dispatch.dispatchKey && record.workflowCorrelationId === input.workflowCorrelationId && record.requestDigest === input.requestDigest);
  const handshake = readHandshake(input.workspace);
  if (matching.length > 1 || lookup.records.length !== matching.length) return { version: 1, classification: "UNCERTAIN", dispatchKey: input.dispatch.dispatchKey, reasons: ["correlation lookup is contradictory or non-unique"], replayPermitted: false, action: "mark-indeterminate" };
  const record = matching[0];
  if (record && handshake) {
    try { validateHandshake(handshake, input.dispatch, input.requestDigest); }
    catch { return { version: 1, classification: "UNCERTAIN", dispatchKey: input.dispatch.dispatchKey, reasons: ["workspace handshake contradicts host correlation"], replayPermitted: false, action: "mark-indeterminate" }; }
  }
  const terminal = record && ["completed", "failed", "stopped", "timed_out"].includes(record.status);
  if (terminal && input.containedUnitActive === false && handshake) return { version: 1, classification: "COMPLETED", dispatchKey: input.dispatch.dispatchKey, record, handshake, reasons: ["matching terminal record and handshake; no active contained unit"], replayPermitted: false, action: "attach-and-commit" };
  if (record && ["queued", "running"].includes(record.status) && input.containedUnitActive === true) return { version: 1, classification: "ACTIVE", dispatchKey: input.dispatch.dispatchKey, record, ...(handshake ? { handshake } : {}), reasons: ["matching active child and contained unit"], replayPermitted: false, action: "attach-and-observe" };
  if (lookup.complete && matching.length === 0 && !handshake && input.containedUnitActive === false && Date.parse(input.now) >= Date.parse(input.graceEndsAt)) return { version: 1, classification: "ABSENT", dispatchKey: input.dispatch.dispatchKey, reasons: ["complete lookup proves no child, process, or handshake after grace interval"], replayPermitted: false, action: "fail-absent-new-attempt-required" };
  return { version: 1, classification: "UNCERTAIN", dispatchKey: input.dispatch.dispatchKey, ...(record ? { record } : {}), ...(handshake ? { handshake } : {}), reasons: ["observation is incomplete, stale, active-state contradictory, or inside grace interval"], replayPermitted: false, action: "mark-indeterminate" };
}
