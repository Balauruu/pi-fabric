import { appendFileSync, readFileSync } from "node:fs";
import { createAssistantMessageEventStream, type AssistantMessage, type Context, type Model, type SimpleStreamOptions } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  FABRIC_COMPONENT_DISCOVER_EVENT,
  FABRIC_COMPONENT_REGISTER_EVENT,
  type FabricActionDescriptor,
  type FabricComponentDefinition,
  type FabricComponentDiscovery,
  type FabricProvider,
} from "pi-fabric/protocol";
// These relative source imports are replaced with file URLs when the isolated fixture is materialized.
import { createArborRuntimeComponent } from "../../src/component/definitions.js";
import { ARBOR_PR0_REQUIRED_AGENT_REFS, OwnerLocalFabricProbe } from "../../src/pr0/OwnerLocalFabricProbe.js";

const TRACE = process.env.ARBOR_PR0_TRACE;
const MODEL = "arbor-pr0-fake/deterministic";
const COMPONENT_ID = "arbor-pr0";
let activeScenario = "";
let forgeNextStop = false;
let forgedStopTarget = "";
let meshNextStop = false;
let heldResult: { ref: string; release: () => void } | undefined;
let heldReady: Promise<void> = Promise.resolve();
let markHeldReady: (() => void) | undefined;
let interruptedResumeToken: Record<string, unknown> | undefined;
let catalogFollowupIssued = false;
let reloadFollowupIssued = false;
let interruptedFollowupIssued = false;

function trace(event: string, data: Record<string, unknown> = {}): void {
  if (!TRACE) return;
  appendFileSync(TRACE, `${JSON.stringify({ event, at: Date.now(), pid: process.pid, sessionId: process.env.PI_SESSION_ID ?? "", parentRun: process.env.PI_FABRIC_PARENT_RUN ?? "", actorId: process.env.PI_FABRIC_ACTOR_ID ?? "", ownerHostId: process.env.PI_FABRIC_OWNER_HOST_ID ?? "", data })}\n`);
}

function textOf(message: Context["messages"][number] | undefined): string {
  if (!message) return "";
  if (message.role === "user") return typeof message.content === "string" ? message.content : message.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
  if (message.role === "toolResult") return message.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
  return message.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
}

function output(model: Model<any>): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "pending",
    timestamp: Date.now(),
  };
}

function streamText(model: Model<any>, value: string) {
  const stream = createAssistantMessageEventStream();
  const message = output(model);
  queueMicrotask(() => {
    stream.push({ type: "start", partial: message });
    message.content.push({ type: "text", text: value });
    stream.push({ type: "text_start", contentIndex: 0, partial: message });
    stream.push({ type: "text_delta", contentIndex: 0, delta: value, partial: message });
    stream.push({ type: "text_end", contentIndex: 0, content: value, partial: message });
    message.stopReason = "stop";
    stream.push({ type: "done", reason: "stop", message });
    stream.end();
  });
  return stream;
}

function streamTool(model: Model<any>, name: string, args: Record<string, unknown>) {
  const stream = createAssistantMessageEventStream();
  const message = output(model);
  queueMicrotask(() => {
    const toolCall = { type: "toolCall" as const, id: `pr0-${process.pid}-${Date.now()}`, name, arguments: args };
    stream.push({ type: "start", partial: message });
    message.content.push(toolCall);
    stream.push({ type: "toolcall_start", contentIndex: 0, partial: message });
    stream.push({ type: "toolcall_end", contentIndex: 0, toolCall, partial: message });
    message.stopReason = "toolUse";
    stream.push({ type: "done", reason: "toolUse", message });
    stream.end();
  });
  return stream;
}

function parseEnvelope(text: string): Record<string, any> {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("actor envelope missing");
  return JSON.parse(text.slice(start)) as Record<string, any>;
}

function latestUserText(context: Context): string {
  const message = [...context.messages].reverse().find((candidate) => candidate.role === "user");
  return textOf(message);
}

function latestToolResult(context: Context): string | undefined {
  const message = context.messages.at(-1);
  return message?.role === "toolResult" ? textOf(message) : undefined;
}

function actorProposal(context: Context): Record<string, unknown> {
  const envelope = parseEnvelope(latestUserText(context));
  const data = envelope.payload?.data as Record<string, any>;
  const phase = String(data.phase ?? "");
  const makeTask = (id: string) => ({ id, instruction: `Execute ${id}; do not approve or mutate Arbor.` });
  let tasks: Array<Record<string, unknown>>;
  if (phase === "choose-wave") tasks = [makeTask("wave:one"), makeTask("wave:two")];
  else if (phase === "choose-agent-suite") tasks = [makeTask("baseline:t1"), makeTask("baseline:t2"), makeTask("candidate:t1"), makeTask("candidate:t2")];
  else if (phase === "long-wave") tasks = [makeTask("long:one")];
  else tasks = [makeTask("fresh:one")];
  const proposal: Record<string, unknown> = { version: 1, kind: data.kind, runId: data.runId, materialId: data.materialId, revision: data.revision, estimatedAttempts: tasks.length, selfApproved: false, tasks };
  const firstTask = tasks[0]!;
  switch (data.validationCase) {
    case "schema-invalid": delete proposal.tasks; break;
    case "stale": proposal.revision = Number(data.revision) - 1; break;
    case "self-approved": proposal.selfApproved = true; break;
    case "over-budget": proposal.estimatedAttempts = Number(data.budget) + 1; break;
    case "expected-override": firstTask.expected = "FORGED"; break;
    case "cwd-override": firstTask.cwd = "/tmp"; break;
    case "oid-override": firstTask.snapshotOid = "0".repeat(40); break;
  }
  return proposal;
}

function assignment(context: Context): Record<string, any> {
  const text = latestUserText(context);
  const marker = "Assignment (owner-authoritative):\n";
  const start = text.lastIndexOf(marker);
  if (start < 0) throw new Error("worker assignment missing");
  return JSON.parse(text.slice(start + marker.length)) as Record<string, any>;
}

function forbiddenProgram(kind: "mutation" | "dispatch", actor: boolean): string {
  if (actor && kind === "dispatch") return 'return agents.spawn({task:"forbidden replacement coordinator",tools:[]});';
  return `return tools.call({ref:"arbor.decide",args:{runId:${JSON.stringify(process.env.ARBOR_PR0_RUN_ID)},selfApproved:true}});`;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("fake provider aborted")); }, { once: true });
  });
}

function resetHeldBarrier(): void {
  heldResult = undefined;
  heldReady = new Promise<void>((resolve) => { markHeldReady = resolve; });
}

function heldRefForScenario(scenario: string): string | undefined {
  if (scenario === "CREATECANCEL" || scenario === "CREATERELOAD") return "agents.create";
  if (scenario === "ASKCANCEL") return "agents.ask";
  if (["CANCEL", "FORGED", "MESH", "RELOAD"].includes(scenario)) return "agents.spawn";
  return undefined;
}

async function holdRealResult(ref: string): Promise<void> {
  if (heldResult || heldRefForScenario(activeScenario) !== ref) return;
  await new Promise<void>((resolve) => {
    heldResult = { ref, release: resolve };
    trace(`fixture.${ref.slice("agents.".length)}-result-held`, { scenario: activeScenario });
    markHeldReady?.();
  });
  trace(`fixture.${ref.slice("agents.".length)}-result-released`, { scenario: activeScenario });
  heldResult = undefined;
}

function releaseHeldResult(): void { heldResult?.release(); }

function mainCode(scenario: string): string {
  const common = JSON.stringify({
    runId: process.env.ARBOR_PR0_RUN_ID,
    materialId: "material-pr0",
    workerCwd: process.env.ARBOR_PR0_WORKER_CWD,
    workerOid: process.env.ARBOR_PR0_WORKER_OID,
    baselineCwd: process.env.ARBOR_PR0_BASELINE_CWD,
    baselineOid: process.env.ARBOR_PR0_BASELINE_OID,
    candidateCwd: process.env.ARBOR_PR0_CANDIDATE_CWD,
    candidateOid: process.env.ARBOR_PR0_CANDIDATE_OID,
  });
  if (scenario === "FULL") return `const status=await components.status({id:${JSON.stringify(COMPONENT_ID)}});const result=await tools.call({ref:"arbor.run",args:${common}});const inspect=await tools.call({ref:"arbor.inspect",args:{}});return {status,result,inspect};`;
  if (scenario === "INTERRUPT") return `const interrupted=await tools.call({ref:"arbor.interruptIngestion",args:${common}});const reloaded=await components.reload({id:${JSON.stringify(COMPONENT_ID)}});return {interrupted,reloaded};`;
  if (scenario === "OWNERLOSS") return `return tools.call({ref:"arbor.interruptIngestion",args:${common}});`;
  if (scenario === "OWNERLOSSAFTER") return `return tools.call({ref:"arbor.ownerLossRecovery",args:${common}});`;
  if (scenario === "INTERRUPTAFTER") {
    const token = JSON.stringify(interruptedResumeToken);
    const alternateCwd = JSON.stringify(process.env.ARBOR_PR0_ALTERNATE_CWD);
    const alternateOid = JSON.stringify(process.env.ARBOR_PR0_ALTERNATE_OID);
    return `const base=${common};const token=${token};const rejected=[];for(const changed of [{...base,materialId:"different-material"},{...base,candidateCwd:${alternateCwd}},{...base,candidateOid:${alternateOid}}]){try{await tools.call({ref:"arbor.resumeInterrupted",args:{...token,...changed}});rejected.push(false)}catch(error){rejected.push(true)}}const resumed=await tools.call({ref:"arbor.resumeInterrupted",args:{...base,...token}});const duplicate=await tools.call({ref:"arbor.resumeInterrupted",args:{...base,...token}});return {rejected,resumed,duplicate};`;
  }
  if (["CANCEL", "FORGED", "MESH", "CREATECANCEL", "ASKCANCEL"].includes(scenario)) return `const started=await tools.call({ref:"arbor.startLong",args:${common}});const cancelled=await tools.call({ref:"arbor.cancel",args:{runId:${JSON.stringify(process.env.ARBOR_PR0_RUN_ID)}}});const settled=await tools.call({ref:"arbor.settle",args:{}});return {started,cancelled,settled};`;
  if (scenario === "PAUSE") return `const started=await tools.call({ref:"arbor.startLong",args:${common}});const before=await tools.call({ref:"arbor.inspect",args:{}});const paused=await tools.call({ref:"arbor.pause",args:{runId:${JSON.stringify(process.env.ARBOR_PR0_RUN_ID)}}});let blocked;try{await tools.call({ref:"arbor.builtinEvaluation",args:${common}});blocked=false}catch(error){blocked=true}const resumed=await tools.call({ref:"arbor.resume",args:${common}});const after=await tools.call({ref:"arbor.inspect",args:{}});return {started,before,paused,blocked,resumed,after};`;
  if (scenario === "RELOAD" || scenario === "CREATERELOAD") return `const started=await tools.call({ref:"arbor.startLong",args:${common}});const reloaded=await components.reload({id:${JSON.stringify(COMPONENT_ID)}});return {started,reloaded};`;
  if (scenario === "RELOADAFTER") return `const status=await components.status({id:${JSON.stringify(COMPONENT_ID)}});const reconciled=await tools.call({ref:"arbor.reconcileBinding",args:${common}});const replacementStarted=await tools.call({ref:"arbor.startLong",args:${common}});const replacementCancelled=await tools.call({ref:"arbor.cancel",args:{runId:${JSON.stringify(process.env.ARBOR_PR0_RUN_ID)}}});const inspect=await tools.call({ref:"arbor.inspect",args:{}});return {status,reconciled,replacementStarted,replacementCancelled,inspect};`;
  if (scenario === "RETAIN") return `const retained=tools.call({ref:"arbor.retained",args:{delayMs:500}});const reloaded=components.reload({id:${JSON.stringify(COMPONENT_ID)}});return {retained:await retained,reloaded:await reloaded,status:await components.status({id:${JSON.stringify(COMPONENT_ID)}})};`;
  if (scenario === "PASSIVE") return `let mutation;try{await tools.call({ref:"arbor.cancel",args:{runId:${JSON.stringify(process.env.ARBOR_PR0_RUN_ID)}}});mutation={rejected:false}}catch(error){mutation={rejected:true,error:String(error)}}return {status:await components.status({id:${JSON.stringify(COMPONENT_ID)}}),inspect:await tools.call({ref:"arbor.inspect",args:{}}),mutation};`;
  if (scenario === "OPTIONAL") return `const status=await components.status({id:${JSON.stringify(COMPONENT_ID)}});const builtin=await tools.call({ref:"arbor.builtinEvaluation",args:${common}});let optional;try{optional=await tools.call({ref:"arbor.optionalEvaluation",args:{snapshotId:"candidate"}})}catch(error){optional={blocked:true,error:String(error)}}return {status,builtin,optional};`;
  if (scenario === "TERMINALS") return `return tools.call({ref:"arbor.terminalCases",args:${common}});`;
  if (scenario === "CATALOG") return `const base=${common};const first=tools.call({ref:"arbor.builtinEvaluation",args:{...base,runId:"catalog-run-a"}});const second=tools.call({ref:"arbor.builtinEvaluation",args:{...base,runId:"catalog-run-b"}});const rebound=tools.call({ref:"arbor.catalogRebind",args:{}});const runs=await Promise.allSettled([first,second]);return {runs,rebound:await rebound};`;
  if (scenario === "CATALOGAFTER") return `const status=await components.status({id:${JSON.stringify(COMPONENT_ID)}});const optional=await tools.call({ref:"arbor.optionalEvaluation",args:{snapshotId:"candidate"}});const builtin=await tools.call({ref:"arbor.builtinEvaluation",args:{...${common},runId:"catalog-run-after"}});return {status,optional,builtin};`;
  if (scenario === "MISSING") return `return tools.call({ref:"arbor.missingRoles",args:${common}});`;
  if (scenario === "OIDMISMATCH") return `try{await tools.call({ref:"arbor.run",args:{...${common},candidateOid:"0000000000000000000000000000000000000000"}});return {blocked:false}}catch(error){return {blocked:true,error:String(error)}}`;
  throw new Error(`unknown PR0 scenario ${scenario}`);
}

function fakeStream(model: Model<any>, context: Context, options?: SimpleStreamOptions) {
  const actorId = process.env.PI_FABRIC_ACTOR_ID;
  const parentRun = process.env.PI_FABRIC_PARENT_RUN;
  if (actorId) {
    const envelope = parseEnvelope(latestUserText(context));
    const phase = String(envelope.payload?.data?.phase ?? "");
    const toolResult = latestToolResult(context);
    if ((phase === "actor-mutation" || phase === "actor-dispatch") && toolResult === undefined) {
      const kind = phase === "actor-mutation" ? "mutation" : "dispatch";
      trace("model.actor.forbidden-attempt", { actorId, kind, toolNames: (context.tools ?? []).map((tool) => tool.name) });
      return streamTool(model, "fabric_exec", { code: forbiddenProgram(kind, true), resultFormat: "json" });
    }
    if (toolResult !== undefined && (phase === "actor-mutation" || phase === "actor-dispatch")) trace("model.actor.forbidden-rejected", { actorId, phase, toolResult });
    const proposal = actorProposal(context);
    trace("model.actor.activation", { actorId, systemSentinel: context.systemPrompt?.includes("ARBOR_PR0_COORDINATOR_SENTINEL") === true, toolNames: (context.tools ?? []).map((tool) => tool.name), proposal });
    return streamText(model, JSON.stringify({ action: "silent", data: proposal }));
  }
  if (parentRun) {
    const value = assignment(context);
    const toolResult = latestToolResult(context);
    if (value.negativeAttempt && toolResult === undefined) {
      trace("model.worker.forbidden-attempt", { runId: parentRun, taskId: value.taskId, kind: value.negativeAttempt, toolNames: (context.tools ?? []).map((tool) => tool.name) });
      return streamTool(model, "fabric_exec", { code: forbiddenProgram(value.negativeAttempt, false), resultFormat: "json" });
    }
    if (value.negativeAttempt && toolResult !== undefined) trace("model.worker.forbidden-rejected", { runId: parentRun, taskId: value.taskId, kind: value.negativeAttempt, toolResult });
    trace("model.worker.started", { runId: parentRun, taskId: value.taskId, role: value.role, cwd: process.cwd(), toolNames: (context.tools ?? []).map((tool) => tool.name), schemaSentinel: context.systemPrompt?.includes("ARBOR_PR0_EXECUTOR_SENTINEL") === true });
    const stream = createAssistantMessageEventStream();
    void (async () => {
      try {
        if (value.taskId === "terminal:failed") throw new Error("ARBOR_PR0_DETERMINISTIC_PROVIDER_FAILURE");
        await wait(Number(value.delayMs), options?.signal);
        const answer = readFileSync(`${process.cwd()}/subject.txt`, "utf8").trim();
        const result = {
          version: 1,
          taskId: value.taskId,
          role: value.role,
          snapshotOid: value.snapshotOid,
          output: answer,
          sentinel: "ARBOR_PR0_EXECUTOR_SENTINEL",
        };
        const message = output(model);
        const text = JSON.stringify(result);
        stream.push({ type: "start", partial: message });
        message.content.push({ type: "text", text });
        stream.push({ type: "text_start", contentIndex: 0, partial: message });
        stream.push({ type: "text_delta", contentIndex: 0, delta: text, partial: message });
        stream.push({ type: "text_end", contentIndex: 0, content: text, partial: message });
        message.stopReason = "stop";
        trace("model.worker.finished", { runId: parentRun, taskId: value.taskId, role: value.role, cwd: process.cwd(), snapshotOid: value.snapshotOid });
        stream.push({ type: "done", reason: "stop", message });
        stream.end();
      } catch (error) {
        const message = output(model);
        message.stopReason = options?.signal?.aborted ? "aborted" : "error";
        message.errorMessage = error instanceof Error ? error.message : String(error);
        trace("model.worker.aborted", { runId: parentRun, taskId: value.taskId, reason: message.errorMessage });
        stream.push({ type: "error", reason: message.stopReason, error: message });
        stream.end();
      }
    })();
    return stream;
  }
  const last = context.messages.at(-1);
  if (last?.role === "toolResult") {
    if (activeScenario === "CATALOG" && !catalogFollowupIssued) {
      catalogFollowupIssued = true;
      trace("model.main.catalog-followup");
      return streamTool(model, "fabric_exec", { code: mainCode("CATALOGAFTER"), resultFormat: "json", timeoutMs: 120_000 });
    }
    if ((activeScenario === "RELOAD" || activeScenario === "CREATERELOAD") && !reloadFollowupIssued) {
      reloadFollowupIssued = true;
      trace("model.main.reload-followup");
      activeScenario = "RELOADAFTER";
      return streamTool(model, "fabric_exec", { code: mainCode("RELOADAFTER"), resultFormat: "json", timeoutMs: 120_000 });
    }
    if (activeScenario === "INTERRUPT" && !interruptedFollowupIssued) {
      interruptedFollowupIssued = true;
      trace("model.main.interrupted-followup");
      activeScenario = "INTERRUPTAFTER";
      return streamTool(model, "fabric_exec", { code: mainCode("INTERRUPTAFTER"), resultFormat: "json", timeoutMs: 120_000 });
    }
    trace("model.main.final", { toolName: last.toolName });
    return streamText(model, "ARBOR_PR0_MAIN_COMPLETE");
  }
  const prompt = textOf(last);
  const scenario = prompt.match(/ARBOR_PR0_SCENARIO:([A-Z]+)/u)?.[1] ?? "FULL";
  activeScenario = scenario;
  forgeNextStop = scenario === "FORGED";
  forgedStopTarget = "";
  meshNextStop = scenario === "MESH";
  catalogFollowupIssued = false;
  reloadFollowupIssued = false;
  interruptedFollowupIssued = false;
  if (heldRefForScenario(scenario)) resetHeldBarrier();
  trace("model.main.dispatch", { scenario, toolNames: (context.tools ?? []).map((tool) => tool.name) });
  return streamTool(model, "fabric_exec", { code: mainCode(scenario), resultFormat: "json", timeoutMs: 120_000 });
}

const action = (name: string, description: string, properties: Record<string, unknown> = {}): FabricActionDescriptor => ({
  name,
  description,
  inputSchema: { type: "object", additionalProperties: false, properties },
  outputSchema: {},
  risk: name === "inspect" || name === "retained" ? "read" : "execute",
  effect: name === "inspect" || name === "retained" ? { kind: "none", resources: ["arbor-pr0:fixture"], ordering: "commutative" } : { kind: "transactional", resources: ["arbor-pr0:fixture"], ordering: "ordered" },
});

const completeInput = {
  runId: { type: "string", minLength: 1, maxLength: 128 },
  materialId: { type: "string", minLength: 1, maxLength: 128 },
  workerCwd: { type: "string", minLength: 1 },
  baselineCwd: { type: "string", minLength: 1 },
  candidateCwd: { type: "string", minLength: 1 },
  workerOid: { type: "string", pattern: "^[0-9a-f]{40,64}$" },
  baselineOid: { type: "string", pattern: "^[0-9a-f]{40,64}$" },
  candidateOid: { type: "string", pattern: "^[0-9a-f]{40,64}$" },
};
const ownerControlInput = { runId: { type: "string", minLength: 1, maxLength: 128 } };
const interruptedResumeInput = {
  ...completeInput,
  operationId: { type: "string", minLength: 1, maxLength: 256 },
  nativeId: { type: "string", minLength: 1, maxLength: 256 },
  evaluationId: { type: "string", minLength: 1, maxLength: 128 },
  snapshotOid: { type: "string", pattern: "^[0-9a-f]{40,64}$" },
  gradePolicyId: { const: "exact-good-v1" },
};
const descriptors = [
  action("run", "Run the owner-local proposal, worker, and agent-suite proof.", completeInput),
  action("interruptIngestion", "Persist native completion and return INTERRUPTED before ingestion.", completeInput),
  action("resumeInterrupted", "Explicitly resume a durable native-result ingestion without dispatch.", interruptedResumeInput),
  action("ownerLossRecovery", "Attempt owner-local recovery after the original disposable Pi host exits.", completeInput),
  action("startLong", "Start one owner-held long operation.", completeInput),
  action("pause", "Pause new dispatch and naturally finish the admitted boundary.", ownerControlInput),
  action("resume", "Resume only after re-grounding the current run/material/revision.", completeInput),
  action("reconcileBinding", "Explicitly reconcile the same native owner onto a replacement component generation.", completeInput),
  action("cancel", "Stop and settle owned work.", ownerControlInput),
  action("settle", "Await owned operation settlement."),
  action("retained", "Retain an old-generation read.", { delayMs: { type: "integer", minimum: 1, maximum: 5000 } }),
  action("inspect", "Read this owner generation."),
  action("builtinEvaluation", "Run the independent built-in deterministic evaluator.", completeInput),
  action("terminalCases", "Observe real failed and configured-timeout agents.wait terminals.", completeInput),
  action("optionalEvaluation", "Run the bound optional evaluator.", { snapshotId: { type: "string", minLength: 1, maxLength: 128 } }),
  action("catalogRebind", "Schedule explicit definition-time optional catalog rebinding."),
  action("missingRoles", "Prove a mandatory phase reference blocks before spawn.", completeInput),
];

export default function extension(pi: ExtensionAPI): void {
  pi.registerProvider("arbor-pr0-fake", {
    name: "Arbor PR0 deterministic local fake",
    baseUrl: "http://127.0.0.1/unused",
    apiKey: "local-no-network",
    api: "openai-completions",
    streamSimple: fakeStream,
    models: [{ id: "deterministic", name: "Arbor PR0 deterministic", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 32_000, maxTokens: 4_096 }],
  });

  // Child Pi processes inherit this source extension only to obtain the local
  // fake model. They must not publish an Arbor component or evaluator proxy.
  if (process.env.PI_FABRIC_ACTOR_ID || process.env.PI_FABRIC_PARENT_RUN) return;

  if (process.env.ARBOR_PR0_OPTIONAL_EVALUATOR !== "absent") {
    const evaluator: FabricProvider = {
      name: "pr0-evaluator",
      description: "Optional deterministic PR0 evaluator fixture.",
      async list() { return [action("evaluate", "Evaluate one exact fixture snapshot.", { snapshotId: { type: "string", minLength: 1, maxLength: 128 } })]; },
      async describe(name) { return name === "evaluate" ? action("evaluate", "Evaluate one exact fixture snapshot.", { snapshotId: { type: "string", minLength: 1, maxLength: 128 } }) : undefined; },
      async invoke(name, args) { if (name !== "evaluate") throw new Error(`unknown evaluator action ${name}`); trace("evaluation.optional.invoked", args); return { provider: "pr0-evaluator", valid: true, snapshotId: args.snapshotId }; },
    };
    const evaluatorComponent: FabricComponentDefinition = {
      name: "pr0-evaluator-component",
      description: "Managed optional PR0 evaluator binding.",
      requires: [],
      provides: [{ provider: "pr0-evaluator" }],
      guarantee: "managed",
      activate(context) { context.provide(evaluator); },
    };
    pi.events.emit(FABRIC_COMPONENT_REGISTER_EVENT, { version: 1, component: evaluatorComponent, overwrite: true });
    pi.events.on(FABRIC_COMPONENT_DISCOVER_EVENT, (data) => (data as FabricComponentDiscovery).register(evaluatorComponent, { overwrite: true }));
  }

  let runtime: OwnerLocalFabricProbe | undefined;
  let rebindCatalog = (): void => { throw new Error("catalog rebinding is not initialized"); };
  const component = createArborRuntimeComponent((context) => {
    const owner = `unresolved-native-owner:${context.id}`;
    const ownerCall = async (ref: Parameters<typeof context.call>[0], args?: Record<string, unknown>): Promise<unknown> => {
      const result = await context.call(ref, args);
      if (ref === "agents.spawn" && activeScenario === "FORGED") forgedStopTarget = (result as { id?: string }).id ?? "";
      await holdRealResult(ref);
      if (ref === "agents.stop" && forgeNextStop && args?.id === forgedStopTarget) {
        forgeNextStop = false;
        trace("fixture.stop-result-forged", { requestedId: args?.id, nativeId: (result as { id?: string }).id ?? "", forged: false });
        return false;
      }
      if (ref === "agents.stop" && meshNextStop) {
        meshNextStop = false;
        trace("fixture.stop-result-mesh", { requestedId: args?.id });
        return { routed: "mesh", queued: true, acknowledged: true, messageId: "forged-mesh-ack" };
      }
      return result;
    };
    const generationRuntime = new OwnerLocalFabricProbe({
      call: ownerCall,
      owner,
      componentId: COMPONENT_ID,
      journalPath: process.env.ARBOR_PR0_JOURNAL!,
      model: MODEL,
      roles: { coordinator: process.env.ARBOR_PR0_COORDINATOR!, executor: process.env.ARBOR_PR0_EXECUTOR!, reference: process.env.ARBOR_PR0_REFERENCE! },
      trace: (entry) => trace(entry.event, { ...entry.data, owner: entry.owner, generation: entry.generation }),
    });
    runtime = generationRuntime;
    const abortListener = () => { void generationRuntime.dispose("component-abort"); releaseHeldResult(); };
    context.signal.addEventListener("abort", abortListener, { once: true });
    let firstInvocation = true;
    return {
      name: "arbor",
      description: "Source-loaded owner-local Arbor PR0 falsification provider.",
      async list() { return descriptors; },
      async describe(name) { return descriptors.find((entry) => entry.name === name); },
      async invoke(name, args) {
        if (firstInvocation) { firstInvocation = false; generationRuntime.activationReturned(); }
        trace("provider.invoked", { name, owner, generation: generationRuntime.inspect().generation });
        if (name === "run") return generationRuntime.runComplete(args as never);
        if (name === "interruptIngestion") { const token = await generationRuntime.interruptAfterNative(args as never); const { status: _status, ...resumeToken } = token; interruptedResumeToken = resumeToken; return token; }
        if (name === "resumeInterrupted") {
          try { return await generationRuntime.resumeInterrupted(args as never, args as never); }
          catch (error) { trace("evaluation.resume-rejected", { error: error instanceof Error ? error.message : String(error), materialId: args.materialId, candidateCwd: args.candidateCwd, candidateOid: args.candidateOid }); throw error; }
        }
        if (name === "ownerLossRecovery") {
          const recovery = await generationRuntime.recoverInterrupted(args as never);
          const journal = JSON.parse(readFileSync(process.env.ARBOR_PR0_JOURNAL!, "utf8")) as Record<string, any>;
          const nativeId = String(journal.runs?.[String(args.runId)]?.interrupted?.nativeId ?? "");
          if (!nativeId) throw new Error("owner-loss fixture journal has no recorded native participant ID");
          let publicStatus: Record<string, unknown>;
          try { publicStatus = { observable: true, value: await ownerCall("agents.status", { id: nativeId }) }; }
          catch (error) { publicStatus = { observable: false, error: error instanceof Error ? error.message : String(error) }; }
          const membersRaw = await ownerCall("agents.members", { scope: "lineage", kinds: ["agent", "actor"], includeStale: false });
          if (!Array.isArray(membersRaw)) throw new Error("owner-loss public members result is not an array");
          const memberPresent = membersRaw.some((entry) => typeof entry === "object" && entry !== null && (entry as { id?: unknown }).id === nativeId);
          trace("owner-loss.public-status", { nativeId, publicStatus, memberPresent });
          return { recovery, nativeId, publicStatus, memberPresent };
        }
        if (name === "startLong") {
          const boundary = activeScenario === "CREATECANCEL" || activeScenario === "CREATERELOAD" ? "create" : activeScenario === "ASKCANCEL" ? "ask" : "spawn";
          const started = await generationRuntime.startLong(args as never, boundary);
          if (heldRefForScenario(activeScenario)) await heldReady;
          return started;
        }
        if (name === "pause") return generationRuntime.pause(args as never);
        if (name === "resume") return generationRuntime.resume(args as never);
        if (name === "reconcileBinding") return generationRuntime.reconcileRunBinding(args as never);
        if (name === "cancel") {
          const before = generationRuntime.inspect();
          try {
            await generationRuntime.authorizeAndEnterDrain(String(args.runId), "fixture-cancel");
            releaseHeldResult();
            return await generationRuntime.completeAuthorizedCancel(String(args.runId));
          } catch (error) {
            const after = generationRuntime.inspect();
            trace("cancellation.rejected", { runId: args.runId, error: error instanceof Error ? error.message : String(error), before, after });
            throw error;
          }
        }
        if (name === "settle") return generationRuntime.settle();
        if (name === "retained") return generationRuntime.retainedRead(Number(args.delayMs));
        if (name === "inspect") return generationRuntime.inspect();
        if (name === "builtinEvaluation") return generationRuntime.runBuiltInEvaluation(args as never);
        if (name === "terminalCases") return generationRuntime.runTerminalCases(args as never);
        if (name === "optionalEvaluation") return generationRuntime.runOptionalEvaluation(args);
        if (name === "catalogRebind") { await wait(1800); const maintenance = await generationRuntime.dispose("catalog-maintenance"); rebindCatalog(); return { scheduled: true, maintenance }; }
        if (name === "missingRoles") {
          const before = generationRuntime.inspect();
          const rolePaths = { coordinator: process.env.ARBOR_PR0_COORDINATOR!, executor: process.env.ARBOR_PR0_EXECUTOR!, reference: process.env.ARBOR_PR0_REFERENCE! };
          const blocked: Array<Record<string, unknown>> = [];
          for (const kind of ["coordinator", "executor", "reference"] as const) {
            const missingRoles = { ...rolePaths, [kind]: `${rolePaths[kind]}.missing` };
            const missing = new OwnerLocalFabricProbe({ call: ownerCall, owner: `${owner}:missing-${kind}`, componentId: COMPONENT_ID, journalPath: `${process.env.ARBOR_PR0_JOURNAL}.missing-${kind}`, model: MODEL, roles: missingRoles, trace: (entry) => trace(entry.event, { ...entry.data, owner: entry.owner }) });
            try { await missing.runBuiltInEvaluation({ ...args, runId: `${String(args.runId)}-missing-${kind}` } as never); blocked.push({ kind, blocked: false }); }
            catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              trace("phase.role-file-blocked", { phase: "built-in-evaluation", kind, error: message });
              blocked.push({ kind, blocked: true, error: message });
            }
          }
          return { blocked, before, after: generationRuntime.inspect() };
        }
        throw new Error(`unknown Arbor PR0 action ${name}`);
      },
      async close() {
        trace("provider.close.started", { owner });
        context.signal.removeEventListener("abort", abortListener);
        await generationRuntime.closeStorage();
        trace("provider.close.settled", { owner });
      },
    };
  }, {
    requires: process.env.ARBOR_PR0_OPTIONAL_EVALUATOR === "catalog" ? [...ARBOR_PR0_REQUIRED_AGENT_REFS] : [...ARBOR_PR0_REQUIRED_AGENT_REFS, { ref: "pr0-evaluator.evaluate", optional: true }],
    onProvided(lease) { runtime?.setGeneration(lease.generation); },
  });

  rebindCatalog = () => {
    const replacementRequires = Object.freeze([...ARBOR_PR0_REQUIRED_AGENT_REFS, { ref: "pr0-evaluator.evaluate", optional: true }]);
    const replacement: FabricComponentDefinition = Object.freeze({ ...component, requires: replacementRequires });
    trace("catalog.definition-replaced", { beforeRequires: ARBOR_PR0_REQUIRED_AGENT_REFS.length, afterRequires: replacementRequires.length });
    pi.events.emit(FABRIC_COMPONENT_REGISTER_EVENT, { version: 1, component: replacement, overwrite: true });
  };

  pi.events.emit(FABRIC_COMPONENT_REGISTER_EVENT, { version: 1, component, overwrite: true });
  pi.events.on(FABRIC_COMPONENT_DISCOVER_EVENT, (data) => (data as FabricComponentDiscovery).register(component, { overwrite: true }));
}
