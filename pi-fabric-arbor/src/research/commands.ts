import { randomUUID } from "node:crypto";
import { COMMAND_ACTIONS, START_SCHEMA, id, validate } from "./contracts.js";
export interface CommandRequest { ref: string; args: Record<string, unknown>; resolveBinding: boolean }
/** Produces a bounded request for Pi's ordinary model/Fabric path, not a callable
 * owner pointer or arbitrary provider forwarding tool. No command is completion.
 */
export function researchCommand(operation: string, raw: string): CommandRequest {
  if (!Object.hasOwn(COMMAND_ACTIONS, operation)) throw new Error("Unknown Arbor command. Use setup, doctor, start, show, pause, resume, cancel, steer, keep, discard, review, export, apply, undo-apply.");
  const action = COMMAND_ACTIONS[operation as keyof typeof COMMAND_ACTIONS];
  if (operation === "start") {
    const args = raw.trim() ? JSON.parse(raw) as Record<string, unknown> : { runId: `run-${randomUUID()}` };
    validate(START_SCHEMA, args); return { ref: "arbor.start", args, resolveBinding: false };
  }
  const [runId, ...rest] = raw.trim().split(/\s+/u); validate(id, runId);
  const detail = rest.join(" ");
  if (["review", "apply", "undo-apply", "keep", "discard", "steer"].includes(operation) && !detail) throw new Error(`${operation} requires a decision/node ID or steering instruction after the run ID`);
  if (!["review", "apply", "undo-apply", "keep", "discard", "steer"].includes(operation) && detail) throw new Error(`${operation} accepts only a run ID`);
  const args: Record<string, unknown> = { runId };
  if (action !== "inspect") args.commandId = `command-${randomUUID()}`;
  if (action === "control") { args.action = operation; if (operation === "steer") args.instruction = detail; }
  if (action === "decide") { validate(id, detail); args.payload = { decisionId: `decision-${randomUUID()}`, nodeId: detail, decision: operation === "keep" ? "keep" : "discard", evidenceIds: [] }; }
  if (["review", "apply", "undoApply"].includes(action)) { validate(id, detail); args.decisionId = detail; }
  if (action === "export") args.format = "json";
  return { ref: `arbor.${action}`, args, resolveBinding: action !== "inspect" };
}
export function commandProgram(request: CommandRequest): string {
  // Every ref below comes from the closed command map; all argument bytes are JSON.
  const input = JSON.stringify(request.args);
  if (request.ref === "arbor.start") return `const p=await tools.call({ref:"arbor.start",args:${input}}); if(p?.run.spec.config.execution === "evaluate" && p.run.spec.evaluation.kind === "command" && p.evaluations.length === 0){const r=p.run;await tools.call({ref:"arbor.evaluate",args:{runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:"initial-command-evaluation",payload:{attemptId:"exact-material",evaluationId:"evaluation-initial"}}});return await tools.call({ref:"arbor.inspect",args:{runId:r.id}});}return p;`;
  if (!request.resolveBinding) return `return await tools.call({ref:${JSON.stringify(request.ref)},args:${input}});`;
  return `const projection = await tools.call({ref:"arbor.inspect",args:{runId:${JSON.stringify(request.args.runId)}}}); if (!projection) throw new Error("Unknown research run"); const r = projection.run; ${request.ref === "arbor.control" && request.args.action === "resume" ? `if(r.spec.config.execution === "evaluate" && r.spec.evaluation.kind === "command"){const saved=projection.evaluations.find(e=>e.state!=="completed");return await tools.call({ref:"arbor.evaluate",args:{runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:${JSON.stringify(request.args.commandId)},payload:{attemptId:"exact-material",evaluationId:saved?.id??"evaluation-initial",...(saved?{resume:true}:{})}}});}` : ""} return await tools.call({ref:${JSON.stringify(request.ref)},args:{...${input},materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision}});`;
}
