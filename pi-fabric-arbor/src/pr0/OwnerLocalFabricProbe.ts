import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export const ARBOR_PR0_REQUIRED_AGENT_REFS = Object.freeze([
  "agents.self",
  "agents.members",
  "agents.status",
  "agents.create",
  "agents.ask",
  "agents.spawn",
  "agents.wait",
  "agents.stop",
  "agents.remove",
] as const);

export type ArborPr0AgentRef = (typeof ARBOR_PR0_REQUIRED_AGENT_REFS)[number];
export type ArborPr0Call = (ref: ArborPr0AgentRef | "pr0-evaluator.evaluate", args?: Record<string, unknown>) => Promise<unknown>;

export interface ArborPr0TraceEvent {
  event: string;
  at: number;
  owner: string;
  generation?: number;
  data?: Record<string, unknown>;
}

export interface ArborPr0RoleBundle {
  coordinator: string;
  executor: string;
  reference: string;
}

export interface ArborPr0ProbeOptions {
  call: ArborPr0Call;
  owner: string;
  componentId: string;
  journalPath: string;
  model: string;
  roles: ArborPr0RoleBundle;
  trace(event: ArborPr0TraceEvent): void;
}

export interface ArborPr0RunArgs {
  runId: string;
  materialId: string;
  workerCwd: string;
  workerOid: string;
  baselineCwd: string;
  baselineOid: string;
  candidateCwd: string;
  candidateOid: string;
}

interface ProposalTask {
  id: string;
  instruction: string;
}

interface Proposal {
  version: 1;
  kind: "worker-wave" | "agent-suite";
  runId: string;
  materialId: string;
  revision: number;
  estimatedAttempts: number;
  selfApproved: false;
  tasks: ProposalTask[];
}

interface ActorInfo {
  id: string;
  scope: "session" | "project";
  name: string;
  status: "idle" | "queued" | "running" | "stopped";
  runner: string;
  residency: "session" | "durable";
  requirements: Array<{ ref: string; optional?: boolean }>;
}

interface AgentHandle {
  id: string;
  name: string;
  status: string;
  runner: string;
  transport: string;
  cwd: string;
  residency?: "session" | "durable";
}

interface AgentResult extends AgentHandle {
  status: "completed" | "failed" | "stopped" | "timed_out";
  value?: unknown;
  error?: string;
}

interface WorkerValue {
  version: 1;
  taskId: string;
  role: "executor" | "subject";
  snapshotOid: string;
  output: string;
  sentinel: string;
}

interface OwnerAssignment {
  taskId: string;
  role: WorkerValue["role"];
  cwd: string;
  snapshotOid: string;
  expected: string;
  delayMs: number;
  negativeAttempt?: "mutation" | "dispatch";
}

interface OwnedRun {
  handle: AgentHandle;
  wait: Promise<AgentResult>;
}

interface SuiteResult {
  evaluationId: string;
  condition: "baseline" | "candidate";
  taskId: string;
  snapshotOid: string;
  status: AgentResult["status"];
  output?: string;
  expected: string;
  valid: boolean;
  grade: 0 | 1;
  nativeId: string;
  nativeCwd: string;
  attempt: number;
}

export interface StopTarget {
  id: string;
  kind: "agent" | "actor";
}

interface ParticipantInfo {
  format: 1;
  id: string;
  kind: "root" | "agent" | "actor";
  rootId: string;
  ownerHostId: string;
  ownerIdentityId: string;
  name: string;
  status: string;
  runner: string;
  transport: string;
  capabilities: string[];
  local: boolean;
  stale: boolean;
  cwd?: string;
  sessionId?: string;
}

interface DurableParticipantProvenance {
  actors: Array<{ nativeId: string; role: "coordinator"; materialId: string }>;
  workers: Array<{
    nativeId: string;
    taskId: string;
    role: WorkerValue["role"];
    snapshot: { cwd: string; oid: string };
    evaluationId?: string;
  }>;
}

interface DurableRunBinding {
  version: 1;
  runId: string;
  materialId: string;
  owner: Pick<ParticipantInfo, "id" | "rootId" | "ownerHostId" | "ownerIdentityId">;
  component: { id: string; generation: number };
  snapshots: Pick<ArborPr0RunArgs, "workerCwd" | "workerOid" | "baselineCwd" | "baselineOid" | "candidateCwd" | "candidateOid">;
  gradePolicy: { id: "exact-good-v1"; expected: "GOOD" };
  participantProvenance: DurableParticipantProvenance;
  interrupted?: {
    operationId: string;
    evaluationId: string;
    nativeId: string;
    assignment: OwnerAssignment;
    result: AgentResult;
    ingested?: SuiteResult;
  };
}

interface DurableJournal {
  version: 1;
  runs: Record<string, DurableRunBinding>;
}

export interface InterruptedResumeToken {
  status: "INTERRUPTED";
  operationId: string;
  runId: string;
  materialId: string;
  nativeId: string;
  evaluationId: string;
  snapshotOid: string;
  gradePolicyId: "exact-good-v1";
}

const WORKER_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["version", "taskId", "role", "snapshotOid", "output", "sentinel"],
  properties: {
    version: { const: 1 },
    taskId: { type: "string", minLength: 1, maxLength: 128 },
    role: { enum: ["executor", "subject"] },
    snapshotOid: { type: "string", pattern: "^[0-9a-f]{40,64}$" },
    output: { type: "string", maxLength: 4096 },
    sentinel: { const: "ARBOR_PR0_EXECUTOR_SENTINEL" },
  },
});

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("expected an object");
  return value as Record<string, unknown>;
};

const string = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
};

const integer = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
  return value as number;
};

const actorInfo = (value: unknown): ActorInfo => {
  const item = record(value);
  const scope = string(item.scope, "actor.scope");
  const status = string(item.status, "actor.status");
  const residency = string(item.residency, "actor.residency");
  if (scope !== "session" && scope !== "project") throw new Error(`unsupported actor scope: ${scope}`);
  if (!["idle", "queued", "running", "stopped"].includes(status)) throw new Error(`unsupported actor status: ${status}`);
  if (residency !== "session" && residency !== "durable") throw new Error(`unsupported actor residency: ${residency}`);
  if (!Array.isArray(item.requirements)) throw new Error("actor.requirements must be an array");
  return {
    id: string(item.id, "actor.id"),
    scope,
    name: string(item.name, "actor.name"),
    status: status as ActorInfo["status"],
    runner: string(item.runner, "actor.runner"),
    residency,
    requirements: item.requirements as Array<{ ref: string; optional?: boolean }>,
  };
};

const agentHandle = (value: unknown): AgentHandle => {
  const item = record(value);
  const residency = item.residency;
  if (residency !== undefined && residency !== "session" && residency !== "durable") throw new Error("unsupported agent residency");
  return {
    id: string(item.id, "agent.id"),
    name: string(item.name, "agent.name"),
    status: string(item.status, "agent.status"),
    runner: string(item.runner, "agent.runner"),
    transport: string(item.transport, "agent.transport"),
    cwd: string(item.cwd, "agent.cwd"),
    ...(residency ? { residency } : {}),
  };
};

const agentResult = (value: unknown): AgentResult => {
  const item = record(value);
  const handle = agentHandle(value);
  const status = string(item.status, "result.status");
  if (!( ["completed", "failed", "stopped", "timed_out"] as const).includes(status as AgentResult["status"])) throw new Error(`unsupported agent status: ${status}`);
  return { ...handle, status: status as AgentResult["status"], ...(item.value !== undefined ? { value: item.value } : {}), ...(typeof item.error === "string" ? { error: item.error } : {}) };
};

const workerValue = (value: unknown): WorkerValue => {
  const item = record(value);
  if (!exactKeys(item, ["version", "taskId", "role", "snapshotOid", "output", "sentinel"])) throw new Error("worker result is not closed");
  if (item.version !== 1 || (item.role !== "executor" && item.role !== "subject") || item.sentinel !== "ARBOR_PR0_EXECUTOR_SENTINEL") throw new Error("worker result sentinel/version/role mismatch");
  return {
    version: 1,
    taskId: string(item.taskId, "worker.taskId"),
    role: item.role,
    snapshotOid: string(item.snapshotOid, "worker.snapshotOid"),
    output: typeof item.output === "string" ? item.output : "",
    sentinel: "ARBOR_PR0_EXECUTOR_SENTINEL",
  };
};

const proposal = (value: unknown, expected: { runId: string; materialId: string; revision: number; budget: number; kind: Proposal["kind"] }): Proposal => {
  const item = record(value);
  if (!exactKeys(item, ["version", "kind", "runId", "materialId", "revision", "estimatedAttempts", "selfApproved", "tasks"])) throw new Error("proposal is not closed");
  if (item.version !== 1 || item.kind !== expected.kind) throw new Error("proposal version/kind mismatch");
  if (item.runId !== expected.runId || item.materialId !== expected.materialId || item.revision !== expected.revision) throw new Error("proposal has stale run/material/revision binding");
  if (item.selfApproved !== false) throw new Error("actor self-approval is forbidden");
  const estimatedAttempts = integer(item.estimatedAttempts, "proposal.estimatedAttempts");
  if (estimatedAttempts < 1 || estimatedAttempts > expected.budget) throw new Error("proposal exceeds the owner budget");
  if (!Array.isArray(item.tasks) || item.tasks.length !== estimatedAttempts) throw new Error("proposal task count does not match its reservation");
  const tasks = item.tasks.map((candidate): ProposalTask => {
    const task = record(candidate);
    if (!exactKeys(task, ["id", "instruction"])) throw new Error("proposal task contains owner-controlled policy fields");
    return { id: string(task.id, "proposal.task.id"), instruction: string(task.instruction, "proposal.task.instruction") };
  });
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) throw new Error("proposal task IDs must be unique");
  return { version: 1, kind: expected.kind, runId: expected.runId, materialId: expected.materialId, revision: expected.revision, estimatedAttempts, selfApproved: false, tasks };
};

const participantInfo = (value: unknown): ParticipantInfo => {
  const item = record(value);
  const kind = string(item.kind, "participant.kind");
  if (item.format !== 1 || !["root", "agent", "actor"].includes(kind)) throw new Error("unsupported participant identity");
  if (!Array.isArray(item.capabilities) || !item.capabilities.every((entry) => typeof entry === "string")) throw new Error("participant capabilities must be strings");
  if (typeof item.local !== "boolean" || typeof item.stale !== "boolean") throw new Error("participant locality must be explicit");
  return {
    format: 1,
    id: string(item.id, "participant.id"),
    kind: kind as ParticipantInfo["kind"],
    rootId: string(item.rootId, "participant.rootId"),
    ownerHostId: string(item.ownerHostId, "participant.ownerHostId"),
    ownerIdentityId: string(item.ownerIdentityId, "participant.ownerIdentityId"),
    name: string(item.name, "participant.name"),
    status: string(item.status, "participant.status"),
    runner: string(item.runner, "participant.runner"),
    transport: string(item.transport, "participant.transport"),
    capabilities: [...item.capabilities] as string[],
    local: item.local,
    stale: item.stale,
    ...(typeof item.cwd === "string" ? { cwd: item.cwd } : {}),
    ...(typeof item.sessionId === "string" ? { sessionId: item.sessionId } : {}),
  };
};

export const parseOwnerLocalStopResponse = (value: unknown, target: StopTarget): { terminal: true; routed: "local"; status: string } => {
  const item = record(value);
  if (item.routed === "mesh" || "acknowledged" in item || "messageId" in item || (item.id === undefined && item.queued === true)) {
    throw new Error("mesh-shaped stop response is not owner-local terminal proof");
  }
  if (("routed" in item && item.routed !== "local") || ("local" in item && item.local !== true)) {
    throw new Error("explicit stop routing/locality is not owner-local proof");
  }
  if (item.id !== target.id) throw new Error(`stop response target mismatch for ${target.id}`);
  const status = string(item.status, "stop.status");
  if (target.kind === "actor") {
    if (status !== "stopped" || (item.scope !== "project" && item.scope !== "session")) throw new Error("actor stop response is not a stopped actor result");
  } else if (!["completed", "failed", "stopped", "timed_out"].includes(status) || typeof item.cwd !== "string") {
    throw new Error("agent stop response is not a terminal agent result");
  }
  return { terminal: true, routed: "local", status };
};

export class OwnerLocalFabricProbe {
  readonly #call: ArborPr0Call;
  readonly #owner: string;
  readonly #model: string;
  readonly #roles: ArborPr0RoleBundle;
  readonly #traceSink: (event: ArborPr0TraceEvent) => void;
  readonly #componentId: string;
  readonly #journalPath: string;
  readonly #owned = new Map<string, OwnedRun>();
  readonly #creates = new Set<Promise<ActorInfo>>();
  readonly #launches = new Set<Promise<unknown>>();
  readonly #asks = new Set<Promise<unknown>>();
  readonly #operations = new Set<Promise<unknown>>();
  readonly #stops = new Map<string, Promise<boolean>>();
  #self?: ParticipantInfo;
  #journal?: DurableJournal;
  #journalLoading?: Promise<DurableJournal>;
  #journalWrites: Promise<void> = Promise.resolve();
  #actor: ActorInfo | undefined;
  #generation?: number;
  #paused = false;
  #draining = false;
  #disposed?: Promise<{ settled: boolean; ambiguous: boolean }>;
  #storageClosed = false;
  #revision = 0;
  #launchStarted: (() => void) | undefined;
  #startBoundary: "create" | "ask" | "spawn" = "spawn";
  static readonly MAX_ACTOR_PROVENANCE = 8;
  static readonly MAX_WORKER_PROVENANCE = 64;

  constructor(options: ArborPr0ProbeOptions) {
    this.#call = options.call;
    this.#owner = options.owner;
    this.#componentId = options.componentId;
    this.#journalPath = options.journalPath;
    this.#model = options.model;
    this.#roles = options.roles;
    this.#traceSink = options.trace;
    this.#event("activation.context-captured", { refs: [...ARBOR_PR0_REQUIRED_AGENT_REFS] });
  }

  setGeneration(generation: number): void { this.#generation = generation; this.#event("activation.provider-staged", { generation }); }
  activationReturned(): void { this.#event("activation.returned"); }
  storageClosed(): boolean { return this.#storageClosed; }
  isDraining(): boolean { return this.#draining; }

  async authorizeAndEnterDrain(runId: string, reason: string): Promise<void> {
    await this.#requireRun(runId);
    if (this.#draining) throw new Error("Arbor PR0 owner generation is already draining");
    if (this.#storageClosed) throw new Error("Arbor PR0 owner storage is closed");
    this.#draining = true;
    this.#event("drain.barrier-entered", { runId, reason, creates: this.#creates.size, asks: this.#asks.size, launches: this.#launches.size, owned: this.#owned.size });
  }

  async loadRoles(): Promise<{ coordinator: string; executor: string; reference: string }> {
    const [coordinator, executor, reference] = await Promise.all([readFile(this.#roles.coordinator, "utf8"), readFile(this.#roles.executor, "utf8"), readFile(this.#roles.reference, "utf8")]);
    if (!coordinator.includes("ARBOR_PR0_COORDINATOR_SENTINEL")) throw new Error("coordinator role sentinel missing");
    if (!executor.includes("ARBOR_PR0_EXECUTOR_SENTINEL")) throw new Error("executor role sentinel missing");
    if (!reference.includes("ARBOR_PR0_REFERENCE_SENTINEL")) throw new Error("required reference sentinel missing");
    this.#event("roles.loaded", { coordinator: this.#roles.coordinator, executor: this.#roles.executor, reference: this.#roles.reference });
    return { coordinator, executor, reference };
  }

  async runComplete(args: ArborPr0RunArgs): Promise<Record<string, unknown>> {
    this.#admit();
    const binding = await this.#bindRun(args, "new");
    await this.#verifyRunSnapshots(args, "run-start");
    const roles = await this.loadRoles();
    const actor = await this.#ensureActor(roles.coordinator, roles.reference, args.runId);
    const rejected = await this.#exerciseProposalRejections(args, actor.id);
    await this.#askProposal(actor.id, "worker-wave", args, { phase: "actor-mutation", budget: 1, revision: this.#revision }, 1);
    await this.#askProposal(actor.id, "worker-wave", args, { phase: "actor-dispatch", budget: 1, revision: this.#revision }, 1);
    const first = await this.#askProposal(actor.id, "worker-wave", args, { phase: "choose-wave", budget: 2, revision: this.#revision }, 2);
    const wave = await this.#launchAssignments(this.#assign(first, args), roles.executor, roles.reference, 1, args.runId);
    await this.#verifyRunSnapshots(args, "worker-collection");
    this.#revision += 1;
    this.#event("collection.committed", { revision: this.#revision, nativeIds: wave.map((entry) => entry.nativeId), candidateOid: args.candidateOid });

    const suiteProposal = await this.#askProposal(actor.id, "agent-suite", args, { phase: "choose-agent-suite", budget: 4, revision: this.#revision, observations: wave }, 4);
    const suiteAssignments = this.#assign(suiteProposal, args);
    const suite = (await this.#launchAssignments(suiteAssignments, roles.executor, roles.reference, 1, args.runId)).sort((left, right) => left.evaluationId.localeCompare(right.evaluationId));
    if (new Set(suite.map((entry) => entry.evaluationId)).size !== suiteAssignments.length || suite.some((entry) => !entry.valid)) throw new Error("agent suite did not settle every exact task once");
    await this.#verifyRunSnapshots(args, "evaluation-collection");
    this.#revision += 1;
    const baseline = suite.filter((entry) => entry.condition === "baseline").reduce((sum, entry) => sum + entry.grade, 0);
    const candidate = suite.filter((entry) => entry.condition === "candidate").reduce((sum, entry) => sum + entry.grade, 0);
    const adoption = candidate > baseline ? "eligible-not-adopted" : "ineligible";
    this.#event("evaluation.graded", { baseline, candidate, adoption, revision: this.#revision, baselineOid: args.baselineOid, candidateOid: args.candidateOid });

    const final = await this.#askProposal(actor.id, "worker-wave", args, { phase: "fresh-observations", budget: 1, revision: this.#revision, observations: { baseline, candidate, adoption, fresh: true } }, 1);
    this.#event("actor.fresh-proposal-settled", { proposalKind: final.kind, revision: final.revision });
    const workerNativeIds = [...wave, ...suite].map((entry) => entry.nativeId);
    const cleanup = await this.#settleCompletedRun(args.runId, actor, workerNativeIds);
    return {
      runId: args.runId,
      actor: { id: actor.id, scope: actor.scope, runner: actor.runner, residency: actor.residency, requirements: actor.requirements },
      owner: binding.owner,
      generation: this.#generation ?? 0,
      identities: { componentOwner: binding.owner, actorId: actor.id, workerNativeIds },
      cleanup,
      material: { materialId: args.materialId, baselineOid: args.baselineOid, candidateOid: args.candidateOid },
      rejected,
      wave,
      suite,
      grades: { baseline, candidate },
      adoption,
      freshProposal: { kind: final.kind, materialId: final.materialId, revision: final.revision },
      outbox: "mailbox-passive",
    };
  }

  async runBuiltInEvaluation(args: ArborPr0RunArgs): Promise<Record<string, unknown>> {
    this.#admit();
    await this.#bindRun(args, "new");
    const roles = await this.loadRoles();
    const assignment: OwnerAssignment = { taskId: `builtin:${args.runId}`, role: "subject", cwd: args.candidateCwd, snapshotOid: args.candidateOid, expected: "GOOD", delayMs: args.runId.startsWith("catalog-run-") && args.runId !== "catalog-run-after" ? 3000 : 900 };
    const [result] = await this.#launchAssignments([assignment], roles.executor, roles.reference, 1, args.runId);
    if (!result) throw new Error("built-in evaluation did not return its native result");
    this.#event("evaluation.builtin", { runId: args.runId, materialId: args.materialId, nativeId: result.nativeId, snapshotOid: result.snapshotOid, output: result.output });
    return { adapter: "built-in-agent", valid: result.valid, output: result.output, nativeId: result.nativeId, snapshotOid: result.snapshotOid, revision: this.#revision };
  }

  async interruptAfterNative(args: ArborPr0RunArgs): Promise<InterruptedResumeToken> {
    this.#admit();
    const binding = await this.#bindRun(args, "new");
    const roles = await this.loadRoles();
    const assignment: OwnerAssignment = { taskId: "candidate:interrupted", role: "subject", cwd: args.candidateCwd, snapshotOid: args.candidateOid, expected: binding.gradePolicy.expected, delayMs: 20 };
    const result = await this.#trackLaunch(() => this.#launchNative(assignment, roles.executor, roles.reference, 1, args.runId));
    const operationId = `${args.runId}:ingest:${assignment.taskId}`;
    binding.interrupted = { operationId, evaluationId: assignment.taskId, nativeId: result.id, assignment, result };
    await this.#persistJournal();
    const token: InterruptedResumeToken = { status: "INTERRUPTED", operationId, runId: args.runId, materialId: args.materialId, nativeId: result.id, evaluationId: assignment.taskId, snapshotOid: assignment.snapshotOid, gradePolicyId: binding.gradePolicy.id };
    this.#event("evaluation.ingestion-interrupted", { ...token, journalPath: this.#journalPath });
    return token;
  }

  async resumeInterrupted(args: ArborPr0RunArgs, token: Omit<InterruptedResumeToken, "status">): Promise<Record<string, unknown>> {
    this.#admit();
    const binding = await this.#bindRun(args, "explicit-resume");
    const interrupted = binding.interrupted;
    if (!interrupted) throw new Error(`run ${args.runId} has no durable interrupted ingestion`);
    if (token.operationId !== interrupted.operationId || token.runId !== binding.runId || token.materialId !== binding.materialId || token.nativeId !== interrupted.nativeId || token.evaluationId !== interrupted.evaluationId || token.snapshotOid !== interrupted.assignment.snapshotOid || token.gradePolicyId !== binding.gradePolicy.id) {
      throw new Error("resume token does not match the durable run/material/policy/OID/native binding");
    }
    if (interrupted.ingested) {
      this.#event("evaluation.terminal-duplicate", { operationId: interrupted.operationId, nativeId: interrupted.nativeId, idempotent: true });
      return { status: "RESUMED", duplicate: true, dispatches: 0, result: interrupted.ingested };
    }
    let observed: AgentResult;
    try {
      observed = agentResult(await this.#call("agents.status", { id: interrupted.nativeId }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#event("evaluation.resume-blocked", { operationId: interrupted.operationId, nativeId: interrupted.nativeId, reason });
      return { status: "BLOCKED", reason: `native handle ${interrupted.nativeId} is unobservable: ${reason}`, dispatches: 0 };
    }
    if (observed.id !== interrupted.result.id || observed.status !== interrupted.result.status || observed.cwd !== interrupted.result.cwd) throw new Error("observed native terminal does not match the durable recorded result");
    this.#event("evaluation.native-reobserved", { operationId: interrupted.operationId, nativeId: observed.id, status: observed.status, cwd: observed.cwd });
    await this.#verifySnapshot(interrupted.assignment, "explicit-resume-ingestion");
    const ingested = this.#ingest(interrupted.assignment, interrupted.result, 1);
    interrupted.ingested = ingested;
    await this.#persistJournal();
    this.#event("evaluation.ingestion-resumed", { operationId: interrupted.operationId, evaluationId: interrupted.evaluationId, nativeId: interrupted.nativeId, duplicateDispatch: false, reconstructedOwner: true });
    return { status: "RESUMED", duplicate: false, dispatches: 0, result: ingested };
  }

  async reconcileRunBinding(args: ArborPr0RunArgs): Promise<Record<string, unknown>> {
    const binding = await this.#bindRun(args, "explicit-resume");
    return { reconciled: true, runId: binding.runId, owner: binding.owner, generation: binding.component.generation };
  }

  async recoverInterrupted(args: ArborPr0RunArgs): Promise<Record<string, unknown>> {
    this.#admit();
    try {
      const binding = await this.#requireRun(args.runId, args);
      const interrupted = binding.interrupted;
      if (!interrupted) throw new Error(`run ${args.runId} has no durable interrupted ingestion`);
      return this.resumeInterrupted(args, {
        operationId: interrupted.operationId,
        runId: binding.runId,
        materialId: binding.materialId,
        nativeId: interrupted.nativeId,
        evaluationId: interrupted.evaluationId,
        snapshotOid: interrupted.assignment.snapshotOid,
        gradePolicyId: binding.gradePolicy.id,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#event("evaluation.owner-loss-blocked", { runId: args.runId, reason, dispatches: 0 });
      return { status: "BLOCKED", reason, dispatches: 0 };
    }
  }

  async runTerminalCases(args: ArborPr0RunArgs): Promise<Record<string, unknown>> {
    this.#admit();
    await this.#bindRun(args, "new");
    const roles = await this.loadRoles();
    const assignments: OwnerAssignment[] = [
      { taskId: "terminal:failed", role: "executor", cwd: args.workerCwd, snapshotOid: args.workerOid, expected: "GOOD", delayMs: 20 },
      { taskId: "terminal:timed-out", role: "executor", cwd: args.workerCwd, snapshotOid: args.workerOid, expected: "GOOD", delayMs: 5000 },
    ];
    const results = await this.#launchAssignments(assignments, roles.executor, roles.reference, 1, args.runId);
    const statuses = Object.fromEntries(results.map((entry) => [entry.taskId, entry.status]));
    if (statuses["terminal:failed"] !== "failed" || statuses["terminal:timed-out"] !== "timed_out") throw new Error(`unexpected real terminal statuses: ${JSON.stringify(statuses)}`);
    this.#event("workers.terminal-cases", { statuses, nativeIds: results.map((entry) => entry.nativeId), allInvalid: results.every((entry) => !entry.valid) });
    return { statuses, results };
  }

  async runOptionalEvaluation(args: Record<string, unknown>): Promise<unknown> {
    this.#admit();
    this.#event("evaluation.optional.call");
    return this.#call("pr0-evaluator.evaluate", args);
  }

  async startLong(args: ArborPr0RunArgs, startBoundary: "create" | "ask" | "spawn" = "spawn"): Promise<{ operationId: string }> {
    this.#admit();
    await this.#bindRun(args, "new");
    this.#startBoundary = startBoundary;
    const operationId = `${args.runId}:long`;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    this.#launchStarted = markStarted;
    const operation = this.#runLong(args).finally(() => {
      this.#operations.delete(operation);
      this.#launchStarted = undefined;
      this.#event("operation.settled", { operationId });
    });
    this.#operations.add(operation);
    operation.catch(() => undefined);
    this.#event("operation.started", { operationId });
    await Promise.race([started, operation.then(() => { throw new Error("long operation settled before launch was tracked"); })]);
    return { operationId };
  }

  async settle(): Promise<{ outcomes: string[] }> { return { outcomes: (await Promise.allSettled([...this.#operations])).map((entry) => entry.status) }; }

  async pause(args: { runId: string }): Promise<{ settled: boolean; ambiguous: boolean }> {
    await this.#requireRun(args.runId);
    this.#admit();
    this.#paused = true;
    this.#event("pause.requested", { runId: args.runId });
    const boundary = [...this.#operations, ...this.#launches, ...this.#asks, ...[...this.#owned.values()].map((entry) => entry.wait)];
    const settlements = await Promise.allSettled(boundary);
    const ambiguous = settlements.some((entry) => entry.status === "rejected");
    const outcome = { settled: !ambiguous, ambiguous };
    this.#event("pause.settled", { ...outcome, actorId: this.#actor?.id ?? "" });
    return outcome;
  }

  async resume(args: ArborPr0RunArgs): Promise<Record<string, unknown>> {
    await this.#requireRun(args.runId, args);
    if (this.#draining) throw new Error("Arbor PR0 owner generation is draining");
    if (this.#storageClosed) throw new Error("Arbor PR0 owner storage is closed");
    if (!this.#paused) throw new Error("Arbor PR0 owner generation is not paused");
    this.#paused = false;
    try {
      await this.#verifyRunSnapshots(args, "resume");
      const roles = await this.loadRoles();
      const actor = await this.#ensureActor(roles.coordinator, roles.reference, args.runId);
      const grounded = await this.#askProposal(actor.id, "worker-wave", args, { phase: "fresh-observations", budget: 1, revision: this.#revision, observations: { resumed: true, materialId: args.materialId } }, 1);
      this.#event("resume.regrounded", { actorId: actor.id, runId: args.runId, materialId: args.materialId, revision: this.#revision });
      return { resumed: true, actorId: actor.id, runId: args.runId, materialId: args.materialId, revision: this.#revision, proposal: { runId: grounded.runId, materialId: grounded.materialId, revision: grounded.revision } };
    } catch (error) { this.#paused = true; throw error; }
  }

  async cancel(args: { runId: string }): Promise<{ settled: boolean; ambiguous: boolean }> {
    await this.authorizeAndEnterDrain(args.runId, "cancel");
    return this.completeAuthorizedCancel(args.runId);
  }

  async completeAuthorizedCancel(runId: string): Promise<{ settled: boolean; ambiguous: boolean }> {
    if (!this.#draining) throw new Error("cancel completion requires an authorized drain barrier");
    this.#event("cancellation.requested", { runId, creates: this.#creates.size, asks: this.#asks.size, launches: this.#launches.size, owned: this.#owned.size });
    const outcome = await this.#stopOwned("cancel");
    this.#event("cancellation.settled", outcome);
    return outcome;
  }

  async retainedRead(delayMs: number): Promise<{ storageOpenDuringCall: boolean; generation: number }> {
    if (this.#storageClosed) throw new Error("retained call observed closed storage at start");
    this.#event("retained.started");
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    if (this.#storageClosed) throw new Error("retained call observed closed storage before settlement");
    this.#event("retained.settled", { storageOpen: true });
    return { storageOpenDuringCall: true, generation: this.#generation ?? 0 };
  }

  dispose(reason: string): Promise<{ settled: boolean; ambiguous: boolean }> {
    this.#disposed ??= (async () => {
      this.#draining = true;
      this.#event("disposal.requested", { reason, creates: this.#creates.size, asks: this.#asks.size, launches: this.#launches.size, owned: this.#owned.size });
      const result = await this.#stopOwned(reason);
      this.#event("disposal.owned-settled", result);
      return result;
    })();
    return this.#disposed;
  }

  async closeStorage(): Promise<void> {
    if (this.#storageClosed) return;
    const outcome = await this.dispose("provider-close");
    if (outcome.ambiguous) { this.#event("storage.retained-ambiguous", { owned: this.#owned.size, launches: this.#launches.size, operations: this.#operations.size }); return; }
    this.#storageClosed = true;
    this.#event("storage.closed");
  }

  inspect(): Record<string, unknown> {
    return { owner: this.#self ? this.#ownerBinding(this.#self) : undefined, generation: this.#generation ?? 0, paused: this.#paused, draining: this.#draining, storageClosed: this.#storageClosed, actorId: this.#actor?.id ?? "", actorScope: this.#actor?.scope ?? "", creates: this.#creates.size, launches: this.#launches.size, owned: this.#owned.size, operations: this.#operations.size, runIds: Object.keys(this.#journal?.runs ?? {}) };
  }

  async #exerciseProposalRejections(args: ArborPr0RunArgs, actorId: string): Promise<string[]> {
    const variants = ["schema-invalid", "stale", "self-approved", "over-budget", "expected-override", "cwd-override", "oid-override"] as const;
    const rejected: string[] = [];
    for (const variant of variants) {
      try { await this.#askProposal(actorId, "worker-wave", args, { phase: "validation", validationCase: variant, budget: 1, revision: this.#revision }, 1); }
      catch (error) { rejected.push(variant); this.#event("proposal.rejected", { variant, reason: error instanceof Error ? error.message : String(error) }); }
    }
    return rejected;
  }

  async #ensureActor(coordinator: string, reference: string, runId: string): Promise<ActorInfo> {
    if (this.#actor && this.#actor.status !== "stopped") return this.#actor;
    const request = {
      name: `arbor-pr0-${runId}-g${this.#generation ?? 0}`,
      instructions: `${coordinator}\n\nRequired reference:\n${reference}`,
      scope: "project",
      runner: "pi",
      delivery: "mailbox",
      responseMode: "directive",
      triggerTurn: false,
      tools: ["fabric_exec"],
      extensions: true,
      requires: [],
      model: this.#model,
      transport: "process",
      residency: "session",
    };
    let dispatch!: () => void;
    const gate = new Promise<void>((resolve) => { dispatch = resolve; });
    const pending = (async () => { await gate; return actorInfo(await this.#call("agents.create", request)); })();
    this.#creates.add(pending);
    this.#event("agents.create.tracked", { creates: this.#creates.size });
    if (this.#startBoundary === "create") this.#launchStarted?.();
    this.#event("agents.create.called", { requestKeys: Object.keys(request), actorRequires: request.requires, scope: request.scope });
    dispatch();
    let actor: ActorInfo;
    try { actor = await pending; } finally { this.#creates.delete(pending); }
    if (actor.scope !== "project" || actor.runner !== "pi" || actor.residency !== "session" || actor.requirements.length !== 0) throw new Error("proposal actor binding/capabilities mismatch");
    this.#actor = actor;
    await this.#recordActorProvenance(runId, actor.id);
    this.#event("agents.create.settled", { actorId: actor.id, scope: actor.scope, runner: actor.runner, residency: actor.residency });
    if (this.#draining) {
      this.#event("agents.create.late-draining", { actorId: actor.id });
      await this.#stopTarget({ id: actor.id, kind: "actor" }, "late-create");
      throw new Error("actor creation settled while owner generation was draining");
    }
    return actor;
  }

  async #askProposal(actorId: string, kind: Proposal["kind"], args: { runId: string; materialId: string }, data: Record<string, unknown>, budget: number): Promise<Proposal> {
    this.#admit();
    const request = { id: actorId, message: `Return one ${kind} proposal for the supplied bounded observations.`, data: { ...data, runId: args.runId, materialId: args.materialId, kind } };
    this.#event("agents.ask.called", { actorId, phase: data.phase as string, requestKeys: Object.keys(request) });
    let dispatch!: () => void;
    const gate = new Promise<void>((resolve) => { dispatch = resolve; });
    const pending = (async () => { await gate; return this.#call("agents.ask", request); })();
    this.#asks.add(pending);
    this.#event("agents.ask.tracked", { actorId, phase: data.phase as string, asks: this.#asks.size });
    if (this.#startBoundary === "ask") this.#launchStarted?.();
    dispatch();
    try {
      const raw = record(await pending);
      const actorRunId = string(raw.runId, "actor-message.runId");
      this.#event("agents.ask.settled", { actorId, phase: data.phase as string, actorRunId });
      if (raw.actorId !== actorId || raw.direction !== "out" || raw.action !== "silent") throw new Error("unexpected actor message identity/direction/action");
      return proposal(raw.data, { runId: args.runId, materialId: args.materialId, revision: integer(data.revision, "observation.revision"), budget, kind });
    } finally { this.#asks.delete(pending); }
  }

  #assign(value: Proposal, args: ArborPr0RunArgs): OwnerAssignment[] {
    const table: Record<string, OwnerAssignment> = {
      "wave:one": { taskId: "wave:one", role: "executor", cwd: args.workerCwd, snapshotOid: args.workerOid, expected: "GOOD", delayMs: 3000, negativeAttempt: "mutation" },
      "wave:two": { taskId: "wave:two", role: "executor", cwd: args.workerCwd, snapshotOid: args.workerOid, expected: "GOOD", delayMs: 3000, negativeAttempt: "dispatch" },
      "baseline:t1": { taskId: "baseline:t1", role: "subject", cwd: args.baselineCwd, snapshotOid: args.baselineOid, expected: "GOOD", delayMs: 20 },
      "baseline:t2": { taskId: "baseline:t2", role: "subject", cwd: args.baselineCwd, snapshotOid: args.baselineOid, expected: "GOOD", delayMs: 20 },
      "candidate:t1": { taskId: "candidate:t1", role: "subject", cwd: args.candidateCwd, snapshotOid: args.candidateOid, expected: "GOOD", delayMs: 20 },
      "candidate:t2": { taskId: "candidate:t2", role: "subject", cwd: args.candidateCwd, snapshotOid: args.candidateOid, expected: "GOOD", delayMs: 20 },
      "long:one": { taskId: "long:one", role: "executor", cwd: args.workerCwd, snapshotOid: args.workerOid, expected: "GOOD", delayMs: 1800 },
    };
    return value.tasks.map((task) => {
      const assignment = table[task.id];
      if (!assignment) throw new Error(`actor proposed task outside owner policy: ${task.id}`);
      return assignment;
    });
  }

  async #launchAssignments(assignments: OwnerAssignment[], executor: string, reference: string, attempt: number, runId: string): Promise<SuiteResult[]> {
    this.#admit();
    const launches = assignments.map((assignment) => this.#trackLaunch(() => this.#launchOne(assignment, executor, reference, attempt, runId)));
    const outcomes = await Promise.allSettled(launches);
    const unexpected = outcomes.find((entry) => entry.status === "rejected");
    if (unexpected?.status === "rejected") throw unexpected.reason;
    return outcomes.flatMap((entry) => entry.status === "fulfilled" ? [entry.value] : []);
  }

  #trackLaunch<T>(factory: () => Promise<T>): Promise<T> {
    let begin!: () => void;
    const gate = new Promise<void>((resolve) => { begin = resolve; });
    const launch = (async () => { await gate; return factory(); })();
    this.#launches.add(launch);
    this.#event("agents.spawn.tracked", { launches: this.#launches.size });
    if (this.#startBoundary === "spawn") this.#launchStarted?.();
    begin();
    void launch.finally(() => { this.#launches.delete(launch); }).catch(() => undefined);
    return launch;
  }

  async #launchNative(assignment: OwnerAssignment, executor: string, reference: string, attempt: number, runId: string): Promise<AgentResult> {
    await this.#verifySnapshot(assignment, "before-launch");
    const request = {
      name: `arbor-pr0-${assignment.role}-${assignment.taskId}-${attempt}`,
      task: `${executor}\n\n${reference}\n\nAssignment (owner-authoritative):\n${JSON.stringify({ taskId: assignment.taskId, role: assignment.role, snapshotOid: assignment.snapshotOid, delayMs: assignment.delayMs, negativeAttempt: assignment.negativeAttempt })}`,
      runner: "pi",
      transport: "process",
      model: this.#model,
      thinking: "off",
      tools: ["fabric_exec"],
      extensions: true,
      recursive: false,
      cwd: assignment.cwd,
      residency: "session",
      schema: WORKER_SCHEMA,
    };
    this.#event("agents.spawn.called", { taskId: assignment.taskId, role: assignment.role, attempt, requestKeys: Object.keys(request), cwd: assignment.cwd, snapshotOid: assignment.snapshotOid });
    const handle = agentHandle(await this.#call("agents.spawn", request));
    this.#event("agents.spawn.settled", { taskId: assignment.taskId, nativeId: handle.id, requestName: request.name, cwd: handle.cwd, status: handle.status });
    if (handle.cwd !== assignment.cwd || handle.runner !== "pi" || handle.transport !== "process") throw new Error("native agent handle identity/cwd mismatch");
    const wait = this.#call("agents.wait", { id: handle.id }).then(agentResult);
    this.#owned.set(handle.id, { handle, wait });
    this.#event("agents.wait.owned", { taskId: assignment.taskId, nativeId: handle.id, attempt });
    await this.#recordWorkerProvenance(runId, assignment, handle.id);
    if (this.#draining) {
      this.#event("agents.spawn.late-draining", { taskId: assignment.taskId, nativeId: handle.id });
      await this.#stopTarget({ id: handle.id, kind: "agent" }, "late-launch");
    }
    const result = await wait.finally(() => this.#owned.delete(handle.id));
    if (result.id !== handle.id || result.cwd !== assignment.cwd) throw new Error("wait result native identity/cwd mismatch");
    this.#event("agents.wait.settled", { taskId: assignment.taskId, nativeId: result.id, status: result.status, attempt, cwd: result.cwd });
    await this.#verifySnapshot(assignment, "before-ingestion");
    return result;
  }

  async #launchOne(assignment: OwnerAssignment, executor: string, reference: string, attempt: number, runId: string): Promise<SuiteResult> {
    const result = await this.#launchNative(assignment, executor, reference, attempt, runId);
    if (assignment.role === "subject") this.#event("evaluation.native-recorded", { evaluationId: assignment.taskId, nativeId: result.id, status: result.status, snapshotOid: assignment.snapshotOid });
    return this.#ingest(assignment, result, attempt);
  }

  #ingest(assignment: OwnerAssignment, result: AgentResult, attempt: number): SuiteResult {
    let value: WorkerValue | undefined;
    if (result.status === "completed") value = workerValue(result.value);
    if (value && (value.taskId !== assignment.taskId || value.role !== assignment.role || value.snapshotOid !== assignment.snapshotOid)) throw new Error("worker result task/role/OID mismatch");
    const condition = assignment.taskId.startsWith("baseline") ? "baseline" : "candidate";
    return {
      evaluationId: assignment.taskId,
      condition,
      taskId: assignment.taskId,
      snapshotOid: assignment.snapshotOid,
      status: result.status,
      ...(value ? { output: value.output } : {}),
      expected: assignment.expected,
      valid: Boolean(value),
      grade: value?.output === assignment.expected ? 1 : 0,
      nativeId: result.id,
      nativeCwd: result.cwd,
      attempt,
    };
  }

  async #runLong(args: ArborPr0RunArgs): Promise<void> {
    const roles = await this.loadRoles();
    const actor = await this.#ensureActor(roles.coordinator, roles.reference, args.runId);
    const selected = await this.#askProposal(actor.id, "worker-wave", args, { phase: "long-wave", budget: 1, revision: this.#revision }, 1);
    await this.#launchAssignments(this.#assign(selected, args), roles.executor, roles.reference, 1, args.runId);
  }

  async #stopTarget(target: StopTarget, reason: string): Promise<boolean> {
    const existing = this.#stops.get(target.id);
    if (existing) return existing;
    const pending = (async () => {
      this.#event("agents.stop.called", { id: target.id, targetKind: target.kind, reason });
      try {
        const parsed = parseOwnerLocalStopResponse(await this.#call("agents.stop", { id: target.id }), target);
        if (target.kind === "actor" && this.#actor?.id === target.id) this.#actor.status = "stopped";
        this.#event("agents.stop.settled", { id: target.id, targetKind: target.kind, routed: parsed.routed, status: parsed.status });
        return true;
      } catch (error) {
        this.#event("agents.stop.ambiguous", { id: target.id, targetKind: target.kind, error: error instanceof Error ? error.message : String(error) });
        return false;
      }
    })();
    this.#stops.set(target.id, pending);
    return pending;
  }

  async #stopOwned(reason: string): Promise<{ settled: boolean; ambiguous: boolean }> {
    const settlements: PromiseSettledResult<unknown>[] = [];
    const observedStops = new Set<Promise<boolean>>();
    const stopResults: boolean[] = [];
    let stablePasses = 0;
    while (stablePasses < 2) {
      const before = `${this.#creates.size}:${this.#launches.size}:${this.#asks.size}:${this.#owned.size}:${this.#operations.size}:${this.#stops.size}`;
      const targets: StopTarget[] = [...this.#owned.keys()].map((id) => ({ id, kind: "agent" as const }));
      if (this.#actor) targets.push({ id: this.#actor.id, kind: "actor" });
      for (const target of targets) void this.#stopTarget(target, reason);

      const active = [...this.#creates, ...this.#launches, ...this.#asks, ...[...this.#owned.values()].map((entry) => entry.wait), ...this.#operations];
      if (active.length > 0) settlements.push(...await Promise.allSettled(active));

      for (const pending of this.#stops.values()) {
        if (observedStops.has(pending)) continue;
        observedStops.add(pending);
        stopResults.push(await pending);
      }
      const after = `${this.#creates.size}:${this.#launches.size}:${this.#asks.size}:${this.#owned.size}:${this.#operations.size}:${this.#stops.size}`;
      stablePasses = before === after && active.length === 0 ? stablePasses + 1 : 0;
    }
    const rejectedUnexpectedly = settlements.some((entry) => entry.status === "rejected" && !/stopp|cancel|drain|actor creation settled/iu.test(String(entry.reason)));
    const ambiguous = stopResults.some((entry) => !entry) || rejectedUnexpectedly;
    this.#event("cleanup.stop-drain", { reason, stopPromises: observedStops.size, stopResults, creates: this.#creates.size, launches: this.#launches.size, asks: this.#asks.size, owned: this.#owned.size, operations: this.#operations.size });
    return { settled: !ambiguous, ambiguous };
  }

  async #settleCompletedRun(runId: string, actor: ActorInfo, nativeIds: string[]): Promise<Record<string, unknown>> {
    const stopConfirmed = await this.#stopTarget({ id: actor.id, kind: "actor" }, "run-complete");
    for (const id of nativeIds) {
      const status = agentResult(await this.#call("agents.status", { id }));
      if (status.id !== id || !["completed", "failed", "stopped", "timed_out"].includes(status.status)) throw new Error(`run-owned participant ${id} is not terminal`);
      this.#event("agents.status.terminal", { runId, id, status: status.status, cwd: status.cwd });
    }
    const selfBinding = this.#ownerBinding(await this.#ownerIdentity());
    const beforeRemovalRaw = await this.#call("agents.members", { scope: "lineage", kinds: ["agent", "actor"], includeStale: false });
    if (!Array.isArray(beforeRemovalRaw)) throw new Error("agents.members did not return an array");
    const expectedIds = new Set([actor.id, ...nativeIds]);
    const correlated = beforeRemovalRaw.map(participantInfo).filter((entry) => expectedIds.has(entry.id));
    if (correlated.length !== expectedIds.size || correlated.some((entry) => entry.rootId !== selfBinding.rootId || entry.ownerHostId !== selfBinding.ownerHostId || entry.ownerIdentityId !== selfBinding.ownerIdentityId)) throw new Error("public participant identities did not correlate with the native run handles and owner");
    this.#event("participants.correlated", { runId, participants: correlated.map((entry) => ({ id: entry.id, kind: entry.kind, status: entry.status, rootId: entry.rootId, ownerHostId: entry.ownerHostId, ownerIdentityId: entry.ownerIdentityId })) });
    let removed = false;
    if (stopConfirmed) {
      const removal = record(await this.#call("agents.remove", { id: actor.id }));
      removed = removal.removed === true;
      if (!removed) throw new Error(`run actor ${actor.id} was not removed`);
      this.#event("agents.remove.settled", { runId, actorId: actor.id, removed });
      if (this.#actor?.id === actor.id) this.#actor = undefined;
    }
    const rawMembers = await this.#call("agents.members", { scope: "lineage", kinds: ["agent", "actor"], includeStale: false });
    if (!Array.isArray(rawMembers)) throw new Error("agents.members did not return an array");
    const members = rawMembers.map(participantInfo);
    const runOwned = members.filter((entry) => expectedIds.has(entry.id));
    const live = runOwned.filter((entry) => !["completed", "failed", "stopped", "timed_out"].includes(entry.status));
    const self = participantInfo(await this.#call("agents.self", {}));
    if (self.kind !== "root" || !self.local || self.stale) throw new Error("owning Pi root is not live during terminal cleanup proof");
    if (!stopConfirmed || !removed || live.length > 0) throw new Error(`terminal cleanup left ${live.length} live run-owned participants`);
    this.#event("run.terminal-cleanup", { runId, actorId: actor.id, nativeIds, membersObserved: runOwned.map((entry) => ({ id: entry.id, kind: entry.kind, status: entry.status, rootId: entry.rootId, ownerHostId: entry.ownerHostId })), liveRunOwned: live.length, rootId: self.rootId, ownerHostId: self.ownerHostId, hostLive: true });
    return { stopConfirmed, removed, liveRunOwned: live.length, hostLive: true };
  }

  async #loadJournal(): Promise<DurableJournal> {
    if (this.#journal) return this.#journal;
    this.#journalLoading ??= (async () => {
      try {
        const parsed = JSON.parse(await readFile(this.#journalPath, "utf8")) as DurableJournal;
        if (parsed.version !== 1 || typeof parsed.runs !== "object" || parsed.runs === null || Array.isArray(parsed.runs)) throw new Error("unsupported PR0 journal shape");
        this.#event("journal.loaded", { journalPath: this.#journalPath, runIds: Object.keys(parsed.runs) });
        return parsed;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        return { version: 1, runs: {} };
      }
    })();
    this.#journal = await this.#journalLoading;
    return this.#journal;
  }

  async #persistJournal(): Promise<void> {
    const journal = await this.#loadJournal();
    const payload = `${JSON.stringify(journal, null, 2)}\n`;
    const temporary = `${this.#journalPath}.g${this.#generation ?? 0}.${process.pid}.tmp`;
    this.#journalWrites = this.#journalWrites.then(async () => {
      await mkdir(dirname(this.#journalPath), { recursive: true });
      await writeFile(temporary, payload, { encoding: "utf8", mode: 0o600 });
      await rename(temporary, this.#journalPath);
    });
    await this.#journalWrites;
    this.#event("journal.persisted", { journalPath: this.#journalPath, runIds: Object.keys(journal.runs) });
  }

  #ownerBinding(self: ParticipantInfo): DurableRunBinding["owner"] {
    return { id: self.id, rootId: self.rootId, ownerHostId: self.ownerHostId, ownerIdentityId: self.ownerIdentityId };
  }

  async #ownerIdentity(): Promise<ParticipantInfo> {
    if (this.#self) return this.#self;
    const self = participantInfo(await this.#call("agents.self", {}));
    if (self.kind !== "root" || !self.local || self.stale || self.id !== self.rootId) throw new Error("Arbor owner must be the live local intrinsic root participant");
    this.#self = self;
    this.#event("owner.native-bound", { ...this.#ownerBinding(self), sessionId: self.sessionId ?? "", cwd: self.cwd ?? "" });
    return self;
  }

  #assertRunBinding(binding: DurableRunBinding, args: ArborPr0RunArgs): void {
    if (binding.runId !== args.runId || binding.materialId !== args.materialId) throw new Error("run material binding changed");
    for (const key of ["workerCwd", "workerOid", "baselineCwd", "baselineOid", "candidateCwd", "candidateOid"] as const) {
      if (binding.snapshots[key] !== args[key]) throw new Error(`run immutable ${key} binding changed`);
    }
    if (binding.gradePolicy.id !== "exact-good-v1" || binding.gradePolicy.expected !== "GOOD") throw new Error("run grade policy binding changed");
  }

  async #bindRun(args: ArborPr0RunArgs, mode: "new" | "explicit-resume"): Promise<DurableRunBinding> {
    const [journal, self] = await Promise.all([this.#loadJournal(), this.#ownerIdentity()]);
    const owner = this.#ownerBinding(self);
    const existing = journal.runs[args.runId];
    if (existing) {
      this.#assertRunBinding(existing, args);
      if (JSON.stringify(existing.owner) !== JSON.stringify(owner)) throw new Error(`run ${args.runId} belongs to a different native owning Pi root/host identity`);
      if (existing.component.id !== this.#componentId) throw new Error("run component identity changed");
      if (existing.component.generation !== (this.#generation ?? 0)) {
        if (mode !== "explicit-resume") throw new Error("run generation changed without explicit reconciliation");
        const priorGeneration = existing.component.generation;
        existing.component = { id: this.#componentId, generation: this.#generation ?? 0 };
        await this.#persistJournal();
        this.#event("owner.generation-reconciled", { runId: args.runId, priorGeneration, generation: existing.component.generation, rootId: owner.rootId, ownerHostId: owner.ownerHostId });
      }
      return existing;
    }
    if (mode === "explicit-resume") throw new Error(`run ${args.runId} has no durable owner binding to resume`);
    const binding: DurableRunBinding = {
      version: 1,
      runId: args.runId,
      materialId: args.materialId,
      owner,
      component: { id: this.#componentId, generation: this.#generation ?? 0 },
      snapshots: { workerCwd: args.workerCwd, workerOid: args.workerOid, baselineCwd: args.baselineCwd, baselineOid: args.baselineOid, candidateCwd: args.candidateCwd, candidateOid: args.candidateOid },
      gradePolicy: { id: "exact-good-v1", expected: "GOOD" },
      participantProvenance: { actors: [], workers: [] },
    };
    journal.runs[args.runId] = binding;
    await this.#persistJournal();
    this.#event("owner.run-bound", { runId: args.runId, materialId: args.materialId, owner, component: binding.component, snapshots: binding.snapshots, gradePolicy: binding.gradePolicy });
    return binding;
  }

  async #recordActorProvenance(runId: string, nativeId: string): Promise<void> {
    const journal = await this.#loadJournal();
    const binding = journal.runs[runId];
    if (!binding) throw new Error(`cannot record actor ${nativeId} without durable run ${runId}`);
    binding.participantProvenance ??= { actors: [], workers: [] };
    if (binding.participantProvenance.actors.some((entry) => entry.nativeId === nativeId)) return;
    if (binding.participantProvenance.actors.length >= OwnerLocalFabricProbe.MAX_ACTOR_PROVENANCE) throw new Error("actor provenance bound exceeded");
    binding.participantProvenance.actors.push({ nativeId, role: "coordinator", materialId: binding.materialId });
    await this.#persistJournal();
    this.#event("journal.actor-linked", { runId, nativeId, rootId: binding.owner.rootId, ownerHostId: binding.owner.ownerHostId, ownerIdentityId: binding.owner.ownerIdentityId });
  }

  async #recordWorkerProvenance(runId: string, assignment: OwnerAssignment, nativeId: string): Promise<void> {
    const journal = await this.#loadJournal();
    const binding = journal.runs[runId];
    if (!binding) throw new Error(`cannot record worker ${nativeId} without durable run ${runId}`);
    binding.participantProvenance ??= { actors: [], workers: [] };
    if (binding.participantProvenance.workers.some((entry) => entry.nativeId === nativeId)) return;
    if (binding.participantProvenance.workers.length >= OwnerLocalFabricProbe.MAX_WORKER_PROVENANCE) throw new Error("worker provenance bound exceeded");
    binding.participantProvenance.workers.push({
      nativeId,
      taskId: assignment.taskId,
      role: assignment.role,
      snapshot: { cwd: assignment.cwd, oid: assignment.snapshotOid },
      ...(assignment.role === "subject" ? { evaluationId: assignment.taskId } : {}),
    });
    await this.#persistJournal();
    this.#event("journal.worker-linked", { runId, nativeId, taskId: assignment.taskId, role: assignment.role, snapshotOid: assignment.snapshotOid, evaluationId: assignment.role === "subject" ? assignment.taskId : "" });
  }

  async #requireRun(runId: string, args?: ArborPr0RunArgs): Promise<DurableRunBinding> {
    const [journal, self] = await Promise.all([this.#loadJournal(), this.#ownerIdentity()]);
    const binding = journal.runs[runId];
    if (!binding) throw new Error(`run ${runId} is not durably bound to this owning Pi root`);
    if (args) this.#assertRunBinding(binding, args);
    if (JSON.stringify(binding.owner) !== JSON.stringify(this.#ownerBinding(self))) throw new Error(`run ${runId} belongs to a different native owning Pi root/host identity`);
    if (binding.component.id !== this.#componentId || binding.component.generation !== (this.#generation ?? 0)) throw new Error("run generation requires explicit reconciliation");
    return binding;
  }

  async #verifyRunSnapshots(args: ArborPr0RunArgs, boundary: string): Promise<void> {
    await Promise.all([
      this.#verifySnapshot({ taskId: "baseline", role: "subject", cwd: args.baselineCwd, snapshotOid: args.baselineOid, expected: "", delayMs: 0 }, boundary),
      this.#verifySnapshot({ taskId: "candidate", role: "subject", cwd: args.candidateCwd, snapshotOid: args.candidateOid, expected: "", delayMs: 0 }, boundary),
      this.#verifySnapshot({ taskId: "worker", role: "executor", cwd: args.workerCwd, snapshotOid: args.workerOid, expected: "", delayMs: 0 }, boundary),
    ]);
  }

  async #verifySnapshot(assignment: OwnerAssignment, boundary: string): Promise<void> {
    const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd: assignment.cwd, encoding: "utf8" });
    const actualOid = stdout.trim();
    if (actualOid !== assignment.snapshotOid) throw new Error(`owner snapshot OID mismatch for ${assignment.taskId} at ${boundary}`);
    this.#event("snapshot.verified", { taskId: assignment.taskId, boundary, cwd: assignment.cwd, expectedOid: assignment.snapshotOid, actualOid });
  }

  #admit(): void {
    if (this.#paused) throw new Error("Arbor PR0 owner generation is paused");
    if (this.#draining) throw new Error("Arbor PR0 owner generation is draining");
    if (this.#storageClosed) throw new Error("Arbor PR0 owner storage is closed");
  }

  #event(event: string, data?: Record<string, unknown>): void {
    this.#traceSink({ event, at: Date.now(), owner: this.#owner, ...(this.#generation !== undefined ? { generation: this.#generation } : {}), ...(data ? { data } : {}) });
  }
}
