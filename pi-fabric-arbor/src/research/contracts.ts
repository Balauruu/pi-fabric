import { createHash } from "node:crypto";
import type { FabricActionDescriptor, FabricRisk } from "pi-fabric/protocol";
import { definitionSchema, summarySchema } from "../evaluators/contracts.js";

import { materialSchema } from "../material/contracts.js";

// This deliberately small JSON-Schema vocabulary is shared by registration,
// config resolution, actor validation and commands. No permissive second parser.
export type Schema = { type?: "object" | "array" | "string" | "integer" | "boolean" | "null"; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: false; items?: Schema; maxItems?: number; minItems?: number; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; pattern?: string; enum?: readonly unknown[]; oneOf?: Schema[] };
export const str = (maxLength = 256): Schema => ({ type: "string", minLength: 1, maxLength });
export const id: Schema = { ...str(96), pattern: "^[A-Za-z0-9][A-Za-z0-9_.-]*$" };
export const integer = (maximum = 1000000, minimum = 0): Schema => ({ type: "integer", minimum, maximum });
export const enumeration = (...values: string[]): Schema => ({ type: "string", enum: values });
export const array = (items: Schema, maxItems = 32, minItems = 0): Schema => ({ type: "array", items, maxItems, minItems });
export const closed = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => ({ type: "object", additionalProperties: false, properties, required });
export const nullable = (schema: Schema): Schema => ({ oneOf: [schema, { type: "null" }] });
export function validate(schema: Schema, value: unknown, path = "$"): void {
  if (schema.oneOf) {
    let matches = 0;
    for (const option of schema.oneOf) { try { validate(option, value, path); matches++; } catch { /* each alternative must fully validate */ } }
    if (matches !== 1) throw new Error(`${path}: expected exactly one closed schema alternative`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path}: unsupported value`);
  if (schema.type === "null") { if (value !== null) throw new Error(`${path}: expected null`); }
  else if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected object`);
    const item = value as Record<string, unknown>;
    for (const key of Object.keys(item)) if (!Object.hasOwn(schema.properties!, key)) throw new Error(`${path}.${key}: unknown field in closed contract`);
    for (const key of schema.required ?? []) if (!Object.hasOwn(item, key)) throw new Error(`${path}.${key}: required`);
    for (const [key, field] of Object.entries(item)) validate(schema.properties![key]!, field, `${path}.${key}`);
  } else if (schema.type === "array") {
    if (!Array.isArray(value) || value.length > schema.maxItems! || value.length < (schema.minItems ?? 0)) throw new Error(`${path}: bounded array required`);
    value.forEach((item, index) => validate(schema.items!, item, `${path}[${index}]`));
  } else if (schema.type === "string") {
    if (typeof value !== "string" || ((schema.minLength ?? 0) > 0 && !value.trim()) || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? 8192) || (schema.pattern && !new RegExp(schema.pattern, "u").test(value))) throw new Error(`${path}: bounded string required`);
  } else if (schema.type === "integer") {
    if (!Number.isSafeInteger(value) || (value as number) < schema.minimum! || (value as number) > schema.maximum!) throw new Error(`${path}: bounded integer required`);
  } else if (schema.type === "boolean" && typeof value !== "boolean") throw new Error(`${path}: boolean required`);
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const digest = (value: unknown): string => createHash("sha256").update(canonical(value)).digest("hex");
const decimal: Schema = { ...str(80), pattern: "^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?$" };
const model = nullable({ ...str(), pattern: "^[^/]+/.+$" });
const partial = (properties: Record<string, Schema>) => closed(properties, []);
export const CONFIG_SCHEMA = partial({
  material: partial({ root: str(4096), kind: enumeration("code", "instructions", "skill", "workflow", "configuration", "recipe", "data", "other"), mutablePaths: array(str(4096)), evaluationInputs: array(str(4096)), selectedUntracked: array(str(4096)) }),
  objective: partial({ description: str(4096), direction: enumeration("maximize", "minimize"), unit: str(64), minimumGain: decimal, gainKind: enumeration("absolute", "relative"), qualityVetoes: array(str()) }),
  evaluator: partial({ kind: enumeration("command", "agent-suite", "provider"), identity: str(), definition: str(4096), heldOut: nullable(str()), repeats: integer(100, 1), aggregation: enumeration("median", "mean", "paired-descriptive") }),
  roles: partial({ coordinator: model, executor: model, subject: model }),
  roleTools: partial({ coordinator: array(enumeration("fabric_exec"), 1, 1), executor: array(enumeration("read", "grep", "find", "ls", "write", "edit", "bash"), 7) }),
  search: partial({ maxDepth: integer(10, 1), maxChildren: integer(10, 1), concurrency: integer(2, 1), maxActorTurns: integer(128, 1), stopAfterNoGain: integer(100, 1), shiftAfterNoGain: integer(100, 1), stopAfterFailures: integer(100, 1), target: nullable(decimal), mode: enumeration("auto", "direction", "review", "collaborative") }),
  limits: partial({ attempts: integer(100, 1), evaluatorCalls: integer(10000, 1), activeMs: integer(86400000, 1000), artifactBytes: integer(1073741824, 1024), tokenCeiling: nullable(integer()), costCeiling: nullable(decimal) }),
  sourceRefs: array(str(4096)), preset: nullable(str()), execution: enumeration("inspect", "deferred", "evaluate", "material", "research"),
});
export const START_SCHEMA = closed({ runId: id, overrides: CONFIG_SCHEMA }, ["runId"]);
export const QUERY_SCHEMA = closed({ runId: id });
export const BINDING = { runId: id, materialId: id, epoch: id, revision: integer(), commandId: id };
export const nodePayload = closed({ nodeId: id, type: enumeration("direction", "hypothesis"), parentId: nullable(id), title: str(512), rationale: str(4096), sourceRefs: array(str(4096)) });
export const dispatchPayload = closed({ nodeId: id, attemptId: id });
export const collectPayload = closed({ attemptId: id });
export const evaluatePayload = closed({ attemptId: id, evaluationId: id, purpose: enumeration("candidate", "feedback", "recheck"), resume: { type: "boolean" } }, ["attemptId", "evaluationId"]);
export const distillPayload = closed({ lessonId: id, nodeId: id, insight: str(4096), limitations: str(4096), evidenceIds: array(id, 32, 1) });
export const decidePayload = closed({ decisionId: id, nodeId: nullable(id), decision: enumeration("continue", "stop", "prune", "discard", "keep", "request_review"), evidenceIds: array(id) });
export const PAYLOADS = { propose: nodePayload, dispatch: dispatchPayload, collect: collectPayload, evaluate: evaluatePayload, distill: distillPayload, decide: decidePayload };
export type ResearchAction = keyof typeof PAYLOADS;
export const ACTION_SCHEMAS = Object.fromEntries(Object.entries(PAYLOADS).map(([name, payload]) => [name, closed({ ...BINDING, payload })])) as Record<ResearchAction, Schema>;
export const ACTOR_PROPOSAL_SCHEMA: Schema = { oneOf: Object.entries(PAYLOADS).map(([kind, payload]) => closed({ ...BINDING, version: { type: "integer", enum: [2], minimum: 2, maximum: 2 }, kind: enumeration(kind), expectedEvidence: array(id), estimatedBudget: closed({ attempts: integer(2), evaluatorCalls: integer(10000) }), rationale: str(4096), payload })) };
export interface BoundCommand { runId: string; materialId: string; epoch: string; revision: number; commandId: string }
export interface Proposal extends BoundCommand { version: 2; kind: ResearchAction; expectedEvidence: string[]; estimatedBudget: { attempts: number; evaluatorCalls: number }; rationale: string; payload: Record<string, any> }
export const CONTROL_SCHEMA = closed({ ...BINDING, action: enumeration("pause", "resume", "cancel", "steer"), instruction: str(4096) }, [...Object.keys(BINDING), "action"]);
export const REVIEW_SCHEMA = closed({ ...BINDING, decisionId: id });
export const EXPORT_SCHEMA = closed({ ...BINDING, format: enumeration("json") });
export const APPLY_SCHEMA = closed({ ...BINDING, decisionId: id });
const bool: Schema = { type: "boolean" };
const nativeOwnerSchema = closed({ id: str(), rootId: str(), ownerHostId: str(), ownerIdentityId: str(), sessionId: str() });
const userReceiptSchema = closed({ response: enumeration("Approve research choice", "Reject research choice"), owner: nativeOwnerSchema, materialId: id, epoch: id, revision: integer(), commandId: id });
const attemptSchema = closed({ id, nodeId: id, task: str(4096), state: enumeration("reserved", "running", "completed", "failed", "stopped", "timed_out"), nativeId: nullable(str()), nativeDigest: nullable(str(64)), evidenceId: nullable(id), model, materialId: id, epoch: id, generation: str() });
const controlValueSchema = closed({ state: str(), specId: str(64) });
export const RECEIPT_SCHEMA = closed({ commandId: id, runId: id, revision: integer(), status: enumeration("applied", "queued", "blocked"), action: str(), reason: nullable(str(4096)), value: { oneOf: [ { type: "null" }, closed({ nodeId: id }), closed({ decisionId: id }), closed({ lessonId: id }), attemptSchema, controlValueSchema, userReceiptSchema, closed({ path: str(4096), digest: str(64) }) ] } });
function complete(schema: Schema): Schema {
  if (schema.type !== "object") return structuredClone(schema);
  return closed(Object.fromEntries(Object.entries(schema.properties!).map(([key, child]) => [key, complete(child)])));
}
function originFields(schema: Schema, prefix = ""): Record<string, Schema> {
  return Object.fromEntries(Object.entries(schema.properties!).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value.type === "object" ? Object.entries(originFields(value, path)) : [[path, str()]];
  }));
}
const roleSchema = closed({ model, origin: str(), instructionsId: nullable(str(64)), tools: array(str()), requires: array(str()), resultContract: str() });
export const RESOLVED_SPEC_SCHEMA = closed({ roleBundle: closed({ id: str(96), directory: str(4096), bytes: integer(65536, 1) }), version: { type: "integer", enum: [2], minimum: 2, maximum: 2 }, config: complete(CONFIG_SCHEMA), evaluation: nullable(definitionSchema()), origins: closed(originFields(CONFIG_SCHEMA)), identity: str(64), source: closed({ root: str(4096), oid: nullable(str(64)), materialId: id, capture: enumeration("source-reference-not-candidate-snapshot", "owned-snapshot") }), roles: closed({ coordinator: roleSchema, executor: roleSchema, subject: roleSchema }), enforcement: closed({ attempts: enumeration("transactional"), evaluatorCalls: enumeration("transactional"), activeTime: enumeration("dispatch-admission"), tokens: enumeration("observational"), cost: enumeration("observational"), artifacts: enumeration("export-admission", "owned-artifact-admission") }) });
RESOLVED_SPEC_SCHEMA.required = RESOLVED_SPEC_SCHEMA.required!.filter(k => k !== "roleBundle");
export const ROLE_REVISION_SCHEMA = closed({ revision: integer(), commandId: id, bundle: closed({ id: str(96), directory: str(4096), bytes: integer(65536, 1) }), coordinatorId: str(64), executorId: str(64) });
export const WORKER_RESULT_SCHEMA = closed({ sentinel: enumeration("ARBOR_WORKER_RESULT_V1"), attemptId: id, observations: str(4096), paths: array(str(4096)), limitations: str(4096) });
export const RUN_SCHEMA = closed({ generationHistory: array(str(), 128), roleRevisions: array(ROLE_REVISION_SCHEMA, 16), material: materialSchema(), id, spec: RESOLVED_SPEC_SCHEMA, requestHash: str(64), owner: nativeOwnerSchema, componentId: str(), generation: str(), epoch: id, revision: integer(), state: enumeration("ready", "running", "paused", "awaiting_review", "completed", "cancelled", "interrupted", "cleanup_pending", "failed"), attemptsUsed: integer(100), active: integer(2), createdAt: integer(Number.MAX_SAFE_INTEGER), activeMs: integer(Number.MAX_SAFE_INTEGER), activeSince: nullable(integer(Number.MAX_SAFE_INTEGER)), steering: array(str(4096), 16), pendingDecisionId: nullable(id), execution: str(1024), error: nullable(str(4096)) });
RUN_SCHEMA.required = RUN_SCHEMA.required!.filter(k => !["material", "roleRevisions", "generationHistory"].includes(k));
const artifactSchema: Schema = { oneOf: [closed({ id, kind: enumeration("native-evidence"), attemptId: id, generation: str(), nativeId: str(), materialId: id, epoch: id, status: enumeration("completed", "failed", "stopped", "timed_out"), digest: str(64), summary: { type: "string", maxLength: 1024 }, validation: enumeration("unscored-native-observation") }), closed({ id, commandId: id, path: str(4096), digest: str(64), kind: enumeration("unscored-json-export") })] };
const decisionProperties = { ...decidePayload.properties!, status: str(), materialId: id, epoch: id, revision: integer(), userReceipt: userReceiptSchema };
export const PROJECTION_SCHEMA = closed({ run: RUN_SCHEMA, validation: str(), nodes: array(closed({ ...nodePayload.properties!, depth: integer(10), pruned: bool, reviewed: bool }), 10000), attempts: array(attemptSchema, 100), evaluations: array(summarySchema(), 1000), decisions: array(closed(decisionProperties, Object.keys(decisionProperties).filter(k => k !== "userReceipt")), 10000), controls: array(closed({ ...BINDING, action: str(), instruction: nullable(str(4096)), status: enumeration("applied", "queued"), value: controlValueSchema }), 10000), events: array({ oneOf: [closed({ revision: integer(), type: enumeration("started"), specId: str(64), scored: bool }), closed({ revision: integer(), type: str(), commandId: id, status: enumeration("applied", "queued", "blocked"), reason: nullable(str(4096)) })] }, 64), artifact_refs: array(artifactSchema, 10000), lessons: array(closed({ ...distillPayload.properties!, validation: enumeration("unscored-observation") }), 10000) });
const effect = (kind: "none" | "transactional" | "emission", resource: string) => ({ kind, resources: [resource], ordering: kind === "none" ? "commutative" as const : "ordered" as const });
const action = (name: string, inputSchema: Schema, risk: FabricRisk, kind: "none" | "transactional" | "emission", description: string): FabricActionDescriptor => ({ name, inputSchema, outputSchema: ["start", "inspect", "runResearch"].includes(name) ? nullable(PROJECTION_SCHEMA) : RECEIPT_SCHEMA, risk, effect: effect(kind, name === "apply" || name === "undoApply" ? "arbor:source" : "arbor:research"), description });
export const RESEARCH_ACTIONS: FabricActionDescriptor[] = [
  action("runResearch", closed({ ...BINDING, resume: { type: "boolean" } }, Object.keys(BINDING)), "execute", "emission", "Owning Pi execute-policy gate for autonomous research: baseline, persistent proposal actor, bounded candidate operations and exact command/subject evaluation. Agent effects additionally use declared policy-checked managed agents refs."),
  action("reviseRoles", closed(BINDING), "write", "transactional", "Owning Pi explicit quiescent package-role revision. Preserves saved measurement spec and all prior native attribution."),
  action("start", START_SCHEMA, "agent", "emission", "Owning Pi: freeze a run; inspect read-only observations, evaluate committed pairs, or capture dirty material in an owned repository. Material workers require explicit dispatch. Research selection freezes only; the Pi start command composes the execute-policy runResearch gate. Never applies to source."),
  action("inspect", QUERY_SCHEMA, "read", "none", "Read a consistent saved research projection. No attachment, writes or export generation."),
  action("control", CONTROL_SCHEMA, "agent", "emission", "Owning Pi: revision-bound pause/resume/cancel/steer receipt; acceptance is distinct from native settlement. No approval/apply subcommands."),
  action("export", EXPORT_SCHEMA, "write", "emission", "Owning Pi: generate a JSON projection and, for owned material, captured-baseline to incumbent patch idempotently. Never writes source material."),
  ...Object.entries(ACTION_SCHEMAS).map(([name, schema]) => action(name, schema, name === "dispatch" ? "agent" : name === "evaluate" ? "execute" : "write", name === "dispatch" || name === "evaluate" || name === "decide" ? "emission" : "transactional", `Owner-only ${name}: exact bindings, reservations and evidence. Actor proposals are not authorization.${name === "evaluate" ? " Executes only frozen exact-material definitions with accounted native invocations; caller scores forbidden." : ""}`)),
  action("review", REVIEW_SCHEMA, "write", "transactional", "Owning Pi UI only: request actual user response to exact pending decision after host permission. No supplied approval or receipt accepted. Exact evaluation review cannot bypass measured keep rules or authorize source apply."),
  action("apply", APPLY_SCHEMA, "write", "emission", "Owning Pi only; unavailable until source-preimage/workspace implementation. Never treats review as Fabric permission."),
  action("undoApply", APPLY_SCHEMA, "write", "emission", "Owning Pi only; unavailable until source-preimage reconciliation implementation. No inverse is guessed."),
];
export const COMMAND_ACTIONS = Object.freeze({ start: "start", show: "inspect", pause: "control", resume: "control", cancel: "control", steer: "control", keep: "decide", discard: "decide", review: "review", export: "export", apply: "apply", "undo-apply": "undoApply", "revise-roles": "reviseRoles" } as const);
export const ACTION_MANIFEST = RESEARCH_ACTIONS.map(descriptor => ({ ref: `arbor.${descriptor.name}`, caller: descriptor.name === "inspect" ? "reader" : descriptor.name === "review" ? "owning-Pi-user-dialog" : "owning-Pi", commands: [...Object.entries(COMMAND_ACTIONS).filter(([, action]) => action === descriptor.name).map(([command]) => `/arbor ${command}`), ...(descriptor.name === 'runResearch' ? ['/arbor start (autonomous execute gate)', '/arbor resume (autonomous execute gate)'] : []), ...(descriptor.name === "evaluate" ? ["/arbor start (command evaluator execute gate)", "/arbor resume (command evaluator execute gate)"] : [])], actorCommitment: false, ...descriptor }));
