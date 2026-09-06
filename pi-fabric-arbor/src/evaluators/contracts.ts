import { array, closed, digest, enumeration, id, integer, nullable, str, validate, type Schema } from "../research/contracts.js";

export interface MaterialRef { root: string; oid: string; files: string[] }
export interface Snapshot extends MaterialRef { id: string; directory: string; contents: Record<string, string>; executable: Record<string, boolean> }
export interface Task { id: string; prompt: string; expected: string }
export interface EvaluationDefinition {
  version: 1; kind: "command" | "agent-suite" | "provider";
  baseline: MaterialRef; candidate: MaterialRef;
  tasks: Task[]; repeats: number; retries: number; deadlineMs: number;
  analysis: "paired-descriptive"; order: "task-baseline-candidate";
  subject: { model: string; tools: string[]; promptFiles: string[] };
  judge: { model: string; instructions: string } | null;
  command: { argv: string[]; checks: string[][]; unit: string } | null;
  providerAction: string | null;
}
export function definitionSchema(): Schema {
  const material = closed({ root: str(4096), oid: { ...str(64), pattern: "^(?:[a-f0-9]{40}|[a-f0-9]{64})$" }, files: array(str(4096), 128, 1) });
  return closed({ version: { ...integer(1, 1), enum: [1] }, kind: enumeration("command", "agent-suite", "provider"), baseline: material, candidate: material,
    tasks: array(closed({ id, prompt: str(8192), expected: str(8192) }), 64, 1), repeats: integer(9, 1), retries: integer(2), deadlineMs: integer(3600000, 10),
    analysis: enumeration("paired-descriptive"), order: enumeration("task-baseline-candidate"),
    subject: closed({ model: { ...str(), pattern: "^[^/]+/.+$" }, tools: array(enumeration("read", "grep", "find", "ls"), 4), promptFiles: array(str(4096), 16, 1) }),
    judge: nullable(closed({ model: { ...str(), pattern: "^[^/]+/.+$" }, instructions: str(8192) })),
    command: nullable(closed({ argv: array(str(8192), 32, 1), checks: array(array(str(8192), 32, 1), 16), unit: str(64) })), providerAction: nullable(str()) });
}
export function validateDefinition(value: unknown): EvaluationDefinition {
  validate(definitionSchema(), value); const d = value as EvaluationDefinition;
  if (new Set(d.tasks.map(t => t.id)).size !== d.tasks.length) throw new Error("Duplicate paired task IDs");
  if (d.kind === "command" ? !d.command || d.judge !== null || d.providerAction !== null : d.command !== null) throw new Error("Contradictory evaluator configuration");
  if ((d.kind === "provider") !== (d.providerAction !== null) || (d.kind !== "agent-suite" && d.judge)) throw new Error("Invalid provider/judge selection");
  if (d.kind === "agent-suite" && [...d.subject.promptFiles].some(p => !d.baseline.files.includes(p) || !d.candidate.files.includes(p))) throw new Error("Subject bootstrap missing from exact snapshot files");
  if (d.kind === "command" && (d.tasks.length !== 1 || d.repeats % 2 !== 1)) throw new Error("Command evaluator requires one task and odd median trials");
  return structuredClone(d);
}
export type NativeStatus = "completed" | "failed" | "stopped" | "timed_out";
export interface NativeEvidence {
  id: string; cwd: string; status: NativeStatus; text: string; error: string | null;
  exitCode: number | null; deadline: boolean; checks: boolean[];
  usage: { input: number; output: number; cost: number; cacheRead?: number; cacheWrite?: number } | null; elapsedMs?: number | null;
  checkResults?: NativeEvidence[]; artifacts?: Array<{ path: string; digest: string }>;
}
export interface Invocation {
  id: string; condition: "baseline" | "candidate"; taskId: string; repeat: number;
  purpose: "baseline" | "candidate" | "feedback" | "retry" | "recheck" | "judge";
  parentId: string | null; snapshotId: string; requestId: string;
  role: "subject" | "judge" | "command" | "provider"; model: string | null; tools: string[]; bootstrapId: string;
  nativeId: string | null; state: "reserved" | "launching" | "attached" | "native-complete" | "ingested";
  native: NativeEvidence | null; valid: boolean; score: string | null; reason: string | null;
}
export interface PairSummary { taskId: string; baseline: string; candidate: string; delta: string; failures: number }
export interface EvaluationRecord {
  id: string; runId: string; purpose: "candidate" | "feedback" | "recheck"; epoch: string; specId: string; generation: string; ownerBinding: string;
  definition: EvaluationDefinition; definitionId: string; snapshots: { baseline: Snapshot; candidate: Snapshot };
  catalogId: string; providerBinding: string | null;
  bindings: Array<{ generation: string; componentId: string; catalogId: string; providerBinding: string | null }>;
  state: "running" | "INTERRUPTED" | "completed" | "blocked";
  invocations: Invocation[]; analysis: { method: "paired-descriptive"; interpretation: string; tasks: PairSummary[]; wins: number; ties: number; losses: number; failures: number; range: string[] } | null;
  quality: { required: string[]; passed: boolean; limitedValidation: boolean };
  validity: "pending" | "valid" | "invalid"; incumbentDecision: "not-evaluated-PR5"; error: string | null;
}
export const evaluationSummary = (e: EvaluationRecord) => ({ id: e.id, purpose: e.purpose, state: e.state, definitionId: e.definitionId, baselineSnapshot: e.snapshots.baseline.id, candidateSnapshot: e.snapshots.candidate.id,
  invocationCount: e.invocations.length, invocations: e.invocations.map(i => ({ id: i.id, taskId: i.taskId, condition: i.condition, purpose: i.purpose, role: i.role, model: i.model, tools: i.tools, bootstrapId: i.bootstrapId, parentId: i.parentId, snapshotId: i.snapshotId, nativeId: i.nativeId, nativeStatus: i.native?.status ?? null, exitCode: i.native?.exitCode ?? null, error: i.native?.error ?? i.reason, deadline: i.native?.deadline ?? null, usage: i.native?.usage ? JSON.stringify(i.native.usage) : null, elapsedMs: i.native?.elapsedMs ?? null, valid: i.valid, score: i.score })), validity: e.validity, quality: e.quality, bindingGenerations: e.bindings.map(b => b.generation), analysis: JSON.stringify(e.analysis), incumbentDecision: e.incumbentDecision, error: e.error });
export function summarySchema(): Schema { return closed({ id, purpose: enumeration("candidate", "feedback", "recheck"), state: enumeration("running", "INTERRUPTED", "completed", "blocked"), definitionId: str(64), baselineSnapshot: str(), candidateSnapshot: str(), invocationCount: integer(10000), invocations: array(closed({ id, taskId: id, condition: enumeration("baseline", "candidate"), purpose: enumeration("baseline", "candidate", "feedback", "retry", "recheck", "judge"), role: enumeration("subject", "judge", "command", "provider"), model: nullable(str()), tools: array(str(), 4), bootstrapId: str(64), parentId: nullable(id), snapshotId: str(), nativeId: nullable(str()), nativeStatus: nullable(enumeration("completed", "failed", "stopped", "timed_out")), exitCode: nullable(integer(255)), error: nullable(str(4096)), deadline: nullable({ type: "boolean" }), usage: nullable(str(1024)), elapsedMs: nullable(integer(Number.MAX_SAFE_INTEGER)), valid: { type: "boolean" }, score: nullable(str(80)) }), 10000), validity: enumeration("pending", "valid", "invalid"), quality: closed({ required: array(str(), 32), passed: { type: "boolean" }, limitedValidation: { type: "boolean" } }), bindingGenerations: array(str(), 128), analysis: str(32768), incumbentDecision: enumeration("not-evaluated-PR5"), error: nullable(str(4096)) }); }
export function nativeSuccess(n: NativeEvidence, requiredChecks?: number): boolean { return (requiredChecks === undefined || (n.checks.length === requiredChecks && (n.checkResults?.length ?? 0) === requiredChecks)) && n.status === "completed" && n.error === null && !n.deadline && (n.exitCode === null || n.exitCode === 0) && n.checks.every(Boolean); }
export const invocationId = (evaluation: string, condition: string, task: string, repeat: number, purpose: string, parent: string | null) => `inv-${digest({ evaluation, condition, task, repeat, purpose, parent }).slice(0, 40)}`;
