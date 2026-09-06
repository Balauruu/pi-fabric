import { appendFileSync } from "node:fs";
import { createAssistantMessageEventStream, type AssistantMessage, type Context, type Model, type SimpleStreamOptions } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { FABRIC_PROVIDER_REGISTER_EVENT, FABRIC_PROVIDER_DISCOVER_EVENT, type FabricProvider, type FabricProviderDiscovery, readFabricToolResultProxyDetailsV1 } from "pi-fabric/protocol";

const trace = (event: string, data: unknown) => appendFileSync(process.env.ARBOR_PR2_TRACE!, JSON.stringify({ event, data, pid: process.pid, at: Date.now() }) + "\n");
function textOf(message: Context["messages"][number] | undefined): string {
  if (!message) return "";
  return typeof message.content === "string" ? message.content : message.content.filter(p => p.type === "text").map(p => p.text).join("\n");
}
function stream(model: Model<any>, content: AssistantMessage["content"], options?: SimpleStreamOptions) {
  const events = createAssistantMessageEventStream();
  queueMicrotask(() => {
    const message: AssistantMessage = { role: "assistant", api: model.api, model: model.id, provider: model.provider, content,
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, timestamp: Date.now(), stopReason: "pending" };
    events.push({ type: "start", partial: message });
    if (options?.signal?.aborted) { message.stopReason = "aborted"; events.push({ type: "error", reason: "aborted", error: message }); }
    else {
      const tool = content[0];
      if (tool?.type === "toolCall") { events.push({ type: "toolcall_start", contentIndex: 0, partial: message }); events.push({ type: "toolcall_end", contentIndex: 0, toolCall: tool, partial: message }); message.stopReason = "toolUse"; }
      else { events.push({ type: "text_start", contentIndex: 0, partial: message }); events.push({ type: "text_delta", contentIndex: 0, delta: tool?.type === "text" ? tool.text : "", partial: message }); events.push({ type: "text_end", contentIndex: 0, content: tool?.type === "text" ? tool.text : "", partial: message }); message.stopReason = "stop"; }
      events.push({ type: "done", reason: message.stopReason, message });
    }
    events.end();
  });
  return events;
}
export default function fake(pi: ExtensionAPI) {
  pi.registerProvider("arbor-pr2-fake", { baseUrl: "https://invalid.local", apiKey: "local-fake", api: "arbor-pr2-local", models: [{ id: "deterministic", name: "Local deterministic PR2 fixture", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 2048 }],
    streamSimple(model, context, options) {
      const user = textOf([...context.messages].reverse().find(m => m.role === "user"));
      if (context.systemPrompt?.includes("proposal-only coordinator")) {
        const envelope = JSON.parse(user.slice(user.indexOf("{"))); const data = envelope.payload.data;
        if (context.messages.at(-1)?.role !== "toolResult") return stream(model, [{ type: "toolCall", id: `actor-denial-${data.revision}`, name: "fabric_exec", arguments: { code: 'const errors=[]; try { await agents.spawn({task:"forbidden dispatch",tools:[]}); errors.push("UNEXPECTED_SUCCESS"); } catch(e) { errors.push(String(e)); } try { await tools.call({ref:"arbor.review",args:{runId:"research",materialId:"material",epoch:"epoch-1",revision:0,commandId:"actor-approve",decisionId:"review"}}); errors.push("UNEXPECTED_SUCCESS"); } catch(e) { errors.push(String(e)); } return errors;' } }], options);
        trace("actor.restrictions", textOf(context.messages.at(-1)));
        trace("actor.observed", { data, tools: context.tools?.map(t => t.name) ?? [] });
        if (data.version === 2) {
          const bootstrap = context.systemPrompt ?? "";
          trace("actor.bootstrap", { coordinator: bootstrap.includes("ARBOR_COORDINATOR_V1"), sentinel: bootstrap.includes("ARBOR_OPERATIONAL_BOOTSTRAP_V1"), strategy: user.includes("ARBOR_RESEARCH_STRATEGY_V1"), evidence: user.includes("ARBOR_EVIDENCE_INTERPRETATION_V1"), model: `${model.provider}/${model.id}` });
          if (!bootstrap.includes("ARBOR_COORDINATOR_V1") || !user.includes("ARBOR_RESEARCH_STRATEGY_V1")) throw new Error("Required operational bootstrap not actually received by actor");
        }
        if (data.research) {
          const p:any={version:2,runId:data.runId,materialId:data.materialId,epoch:data.epoch,revision:data.revision,commandId:data.commandId,expectedEvidence:[],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'Choose from the owner current incumbent and independently measured facts; fixture inference only'};
          const latest=data.attempts.at(-1), fact=data.recentFacts.at(-1), evidence=data.evidence.find((e:any)=>e.id===fact?.evaluationId), decided=data.decisions.find((d:any)=>d.nodeId===latest?.nodeId && ['keep','discard'].includes(d.decision));
          const n=data.attempts.length+1, pending=data.nodes.find((n:any)=>n.type==='hypothesis'&&!data.attempts.some((a:any)=>a.nodeId===n.nodeId));
          if(data.objective.description.includes('PR6_REQUEST_REVIEW') && data.nodes.length && !data.decisions.length){p.kind='decide';p.payload={decisionId:'native-review',nodeId:'direction',decision:'request_review',evidenceIds:[]};}
          else if(!data.nodes.length){p.kind='propose';p.payload={nodeId:'direction',type:'direction',parentId:null,title:'Improve exact subject behavior',rationale:'Compare independently graded behavior, preserve earlier correct behavior',sourceRefs:[]};}
          else if(pending){p.kind='dispatch';p.payload={nodeId:pending.nodeId,attemptId:pending.nodeId};p.estimatedBudget.attempts=1;}
          else if(latest && latest.state!=='completed' && !decided){p.kind='decide';p.payload={decisionId:'decision-'+latest.id,nodeId:latest.nodeId,decision:'discard',evidenceIds:[latest.evidenceId]};p.expectedEvidence=[latest.evidenceId];}
          else if(latest && latest.state!=='completed' && !data.ancestors.some((l:any)=>l.nodeId===latest.nodeId)){p.kind='distill';p.payload={lessonId:'lesson-'+latest.id,nodeId:latest.nodeId,insight:'Native worker failed the result contract; no score is available',limitations:'Infrastructure failure does not reject the scientific direction',evidenceIds:[latest.evidenceId]};p.expectedEvidence=[latest.evidenceId];}
          else if(latest && latest.state==='completed'&&!evidence){p.kind='evaluate';p.payload={attemptId:latest.id,evaluationId:'eval-'+latest.id};p.estimatedBudget.evaluatorCalls=data.budgets.evaluationCapacity;}
          else if(latest && latest.state==='completed'&&!decided){const analysis=JSON.parse(evidence.analysis);const gain=evidence.validity==='valid'&&analysis.wins>analysis.losses&&analysis.wins>0;p.kind='decide';p.payload={decisionId:'decision-'+latest.id,nodeId:latest.nodeId,decision:gain?'keep':'discard',evidenceIds:[evidence.id]};p.expectedEvidence=[evidence.id];}
          else if(latest && latest.state==='completed'&&!data.ancestors.some((l:any)=>l.nodeId===latest.nodeId)){p.kind='distill';p.payload={lessonId:'lesson-'+latest.id,nodeId:latest.nodeId,insight:fact.outcome==='kept'?'This exact material passed independent checks and improved the incumbent':fact.outcome==='failed-check'?'The changed behavior failed required checks; apparent scalar improvement is not a keep':'This valid comparison did not improve the current incumbent',limitations:'Local deterministic tasks only; no causal or transfer claim. Recheck on new material.',evidenceIds:[evidence.id]};p.expectedEvidence=[evidence.id];}
          else if(n<=4){p.kind='propose';p.payload={nodeId:'h'+n,type:'hypothesis',parentId:'direction',title:'Test bounded alternative '+n,rationale:'PR6_LEVEL='+n+'; edit only the assigned subject path and test the exact frozen material',sourceRefs:[]};}
          else {p.kind='decide';p.payload={decisionId:'research-done',nodeId:null,decision:'stop',evidenceIds:[]};}
          trace('research.proposal',{kind:p.kind,payload:p.payload,revision:p.revision,incumbent:data.currentIncumbent});
          return stream(model,[{type:'text',text:JSON.stringify({action:'silent',data:p})}],options);
        }
        if (data.version === 2) {
          const node = data.nodes[0], attempt = data.attempts[0];
          const proposal: Record<string, any> = { version: 2, runId: data.runId, materialId: data.materialId, epoch: data.epoch, revision: data.revision, commandId: data.commandId, expectedEvidence: [], estimatedBudget: { attempts: 0, evaluatorCalls: 0 }, rationale: "Local deterministic observation, never a score" };
          if (!node) { proposal.kind = "propose"; proposal.payload = { nodeId: "native-hypothesis", type: "hypothesis", parentId: null, title: "Inspect fixed instructions", rationale: "Inspect material.txt without edits", sourceRefs: [] }; }
          else if (!attempt) { proposal.kind = "dispatch"; proposal.estimatedBudget.attempts = 1; proposal.payload = { nodeId: node.nodeId, attemptId: "native-attempt" }; }
          else { proposal.kind = "decide"; proposal.payload = { decisionId: "native-stop", nodeId: null, decision: "stop", evidenceIds: data.evidence.map((e: any) => e.id) }; proposal.expectedEvidence = proposal.payload.evidenceIds; }
          if (attempt && process.env.ARBOR_PR3_CHOICE === "request-review") { proposal.payload = { ...proposal.payload, decisionId: "native-review", nodeId: node.nodeId, decision: "request_review" }; }
          if (process.env.ARBOR_PR3_INVALID === "self-approval") proposal.approved = true;
          if (process.env.ARBOR_PR3_INVALID === "stale") proposal.revision++;
          return stream(model, [{ type: "text", text: JSON.stringify({ action: "silent", data: proposal }) }], options);
        }
        return stream(model, [{ type: "text", text: JSON.stringify({ action: "silent", data: { version: 1, kind: data.remainingWaves ? "wave" : "stop", runId: data.runId, materialId: data.materialId, policyId: data.policyId, revision: data.revision, tasks: data.remainingWaves ? ["Inspect the fixed material"] : [] } }) }], options);
      }
      if (user.includes("Arbor bounded executor")) {
        if (context.messages.at(-1)?.role !== "toolResult") return stream(model, [{ type: "toolCall", id: "worker-denial", name: "fabric_exec", arguments: { code: 'try { await tools.call({ref:"arbor.cancel",args:{runId:"native-run"}}); return "UNEXPECTED_SUCCESS"; } catch(e) { return String(e); }' } }], options);
        trace("worker.restrictions", textOf(context.messages.at(-1)));
        trace("worker.observed", { user, tools: context.tools?.map(t => t.name) ?? [] });
        return stream(model, [{ type: "text", text: "Inspected fixed material; no score or shared mutation." }], options);
      }
      trace("main.inference", { lastRole: context.messages.at(-1)?.role });
      if (context.messages.at(-1)?.role === "toolResult") {
        trace("main.result", textOf(context.messages.at(-1)));
        return stream(model, [{ type: "text", text: "ARBOR_PR2_HOST_COMPLETE" }], options);
      }
      return stream(model, [{ type: "toolCall", id: "pr2-root-call", name: "fabric_exec", arguments: { code: user.includes("ARBOR_COMMAND_PROGRAM=") ? JSON.parse(user.slice(user.indexOf("ARBOR_COMMAND_PROGRAM=") + "ARBOR_COMMAND_PROGRAM=".length)) : process.env.ARBOR_PR2_PROGRAM!, timeoutMs: 120000 } }], options);
    },
  });
  // Test-only middleware observes real public results. It does not dispatch work.
  let held = false, release!: () => void, markReady!: () => void;
  const ready = new Promise<void>(r => { markReady = r; });
  pi.on("tool_result", async event => {
    const proxy = readFabricToolResultProxyDetailsV1(event.details);
    if (!proxy) return;
    if (proxy.ref.startsWith("agents.") || proxy.ref.startsWith("arbor.")) trace("native.result", { ref: proxy.ref, result: proxy.result });
    if (!held && proxy.ref === process.env.ARBOR_PR2_HOLD) {
      held = true; trace("barrier.held", { ref: proxy.ref });
      await new Promise<void>(r => { release = r; markReady(); }); trace("barrier.released", { ref: proxy.ref });
    }
  });
  const fixture: FabricProvider = { name: "pr2fixture", description: "Local test barriers only", async list() { return ["ready", "release"].map(name => ({ name, description: name, inputSchema: { type: "object", properties: {}, additionalProperties: false }, risk: "read" as const })); }, async describe(name) { return (await this.list({}, {} as any)).find(d => d.name === name); }, async invoke(name) { if (name === "ready") await ready; else if (name === "release") { await new Promise<void>(r => setImmediate(r)); release(); } return { ok: true }; } };
  pi.events.emit(FABRIC_PROVIDER_REGISTER_EVENT, { version: 1, provider: fixture, overwrite: true });
  pi.events.on(FABRIC_PROVIDER_DISCOVER_EVENT, data => (data as FabricProviderDiscovery).register(fixture, { overwrite: true }));
}
