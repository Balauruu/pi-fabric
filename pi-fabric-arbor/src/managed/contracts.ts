import type { FabricActionDescriptor } from "pi-fabric/protocol";

export const ARBOR_OWNER_REFS = Object.freeze([
  "agents.self", "agents.members", "agents.status", "agents.create", "agents.ask",
  "agents.spawn", "agents.wait", "agents.stop", "agents.remove", "schema.status",
] as const);
export type OwnerRef = typeof ARBOR_OWNER_REFS[number];
export type OwnerCall = (ref: OwnerRef, args?: Record<string, unknown>) => Promise<unknown>;
export const TERMINAL = ["completed", "failed", "stopped", "timed_out"] as const;
export type Terminal = typeof TERMINAL[number];
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object");
  return value as Record<string, unknown>;
}
export function closed(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const item = object(value);
  if (Object.keys(item).some(key => !keys.includes(key))) throw new Error("Unknown field in closed Arbor contract");
  return item;
}
export function text(value: unknown, label: string, max = 256): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Invalid ${label}`);
  return value;
}
export interface ExecutionSpec {
  runId: string; materialId: string; cwd: string; oid: string; policyId: string;
  objective: string; model: string; maxWaves: number; concurrency: number;
}
export function executionSpec(value: unknown, activeModel?: string): ExecutionSpec {
  const s = closed(value, ["runId", "materialId", "cwd", "oid", "policyId", "objective", "model", "maxWaves", "concurrency"]);
  const oid = text(s.oid, "oid", 64);
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(oid)) throw new Error("Expected exact Git OID");
  const maxWaves = s.maxWaves ?? 1, concurrency = s.concurrency ?? 1;
  if (![1, 2].includes(maxWaves as number) || ![1, 2].includes(concurrency as number)) throw new Error("PR2 execution bounds are 1 or 2 waves/workers");
  return { runId: text(s.runId, "runId"), materialId: text(s.materialId, "materialId"), cwd: text(s.cwd, "cwd", 4096), oid,
    policyId: text(s.policyId, "policyId"), objective: text(s.objective, "objective", 4096), model: text(s.model ?? activeModel, "explicit or active Pi model"), maxWaves: maxWaves as number, concurrency: concurrency as number };
}
export interface NativeOwner { id: string; rootId: string; ownerHostId: string; ownerIdentityId: string; sessionId: string }
export function nativeOwner(value: unknown): NativeOwner {
  const p = object(value);
  if (p.kind !== "root" || p.id !== p.rootId || p.local !== true || p.stale !== false) throw new Error("Arbor requires the live local intrinsic Pi root");
  return { id: text(p.id, "root id"), rootId: text(p.rootId, "rootId"), ownerHostId: text(p.ownerHostId, "ownerHostId"),
    ownerIdentityId: text(p.ownerIdentityId, "ownerIdentityId"), sessionId: text(p.sessionId, "native sessionId") };
}
export interface Proposal { kind: "wave" | "stop"; tasks: string[] }
export function proposal(value: unknown, spec: ExecutionSpec, revision: number, remaining: number): Proposal {
  const p = closed(value, ["version", "kind", "runId", "materialId", "policyId", "revision", "tasks"]);
  if (p.version !== 1 || p.runId !== spec.runId || p.materialId !== spec.materialId || p.policyId !== spec.policyId || p.revision !== revision) throw new Error("Stale or mismatched proposal binding");
  if (p.kind !== "wave" && p.kind !== "stop") throw new Error("Invalid proposal kind");
  if (!Array.isArray(p.tasks) || p.tasks.length > spec.concurrency || (p.kind === "wave" ? !remaining || !p.tasks.length : p.tasks.length !== 0)) throw new Error("Proposal exceeds remaining wave/capacity budget");
  return { kind: p.kind, tasks: p.tasks.map(task => text(task, "task", 4096)) };
}
export interface Target { id: string; kind: "actor" | "agent"; cwd?: string }
export function localStop(value: unknown, target: Target): void {
  const r = object(value);
  if (["acknowledged", "messageId"].some(key => key in r) || ("queued" in r && !(target.kind === "actor" && Number.isSafeInteger(r.queued) && (r.queued as number) >= 0)) || ("routed" in r && r.routed !== "local") || ("local" in r && r.local !== true)) throw new Error("Ambiguous non-local stop response");
  if (r.id !== target.id) throw new Error("Stop target mismatch");
  if (target.kind === "actor") {
    if (r.status !== "stopped" || !["project", "session"].includes(String(r.scope))) throw new Error("Actor stop is not terminal");
  } else if (!TERMINAL.includes(r.status as Terminal) || r.cwd !== target.cwd) throw new Error("Worker stop lacks exact local terminal evidence");
}
const str = (maxLength = 256) => ({ type: "string", minLength: 1, maxLength });
export const EXECUTION_SCHEMA = { type: "object", additionalProperties: false,
  required: ["runId", "materialId", "cwd", "oid", "policyId", "objective"],
  properties: { runId: str(), materialId: str(), cwd: str(4096), oid: { ...str(64), pattern: "^(?:[a-f0-9]{40}|[a-f0-9]{64})$" }, policyId: str(), objective: str(4096), model: str(), maxWaves: { type: "integer", enum: [1, 2] }, concurrency: { type: "integer", enum: [1, 2] } } };
export const RUN_QUERY = { type: "object", additionalProperties: false, required: ["runId"], properties: { runId: str() } };
export const ARBOR_ACTIONS: FabricActionDescriptor[] = [
  { name: "start", description: "Owner-only bounded execution binding (PR2 substrate, not scored research). Actor proposes; owner launches and waits. Repeated identical requests are idempotent.", inputSchema: EXECUTION_SCHEMA, risk: "agent", effect: { kind: "emission", resources: ["arbor:execution"], ordering: "ordered" } },
  { name: "inspect", description: "Read a retained execution binding and settlement facts; never starts work or exports.", inputSchema: RUN_QUERY, risk: "read", effect: { kind: "none", ordering: "commutative" } },
  { name: "cancel", description: "Owning Pi only: stop owned native work and await real settlement; ambiguity retains evidence.", inputSchema: RUN_QUERY, risk: "agent", effect: { kind: "emission", resources: ["arbor:execution"], ordering: "ordered" } },
];
