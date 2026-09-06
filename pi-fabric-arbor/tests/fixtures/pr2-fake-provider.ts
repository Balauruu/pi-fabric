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
        if (context.messages.at(-1)?.role !== "toolResult") return stream(model, [{ type: "toolCall", id: `actor-denial-${data.revision}`, name: "fabric_exec", arguments: { code: 'const errors=[]; try { await agents.spawn({task:"forbidden dispatch",tools:[]}); errors.push("UNEXPECTED_SUCCESS"); } catch(e) { errors.push(String(e)); } try { await tools.call({ref:"arbor.cancel",args:{runId:"native-run"}}); errors.push("UNEXPECTED_SUCCESS"); } catch(e) { errors.push(String(e)); } return errors;' } }], options);
        trace("actor.restrictions", textOf(context.messages.at(-1)));
        trace("actor.observed", { data, tools: context.tools?.map(t => t.name) ?? [] });
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
      return stream(model, [{ type: "toolCall", id: "pr2-root-call", name: "fabric_exec", arguments: { code: process.env.ARBOR_PR2_PROGRAM!, timeoutMs: 120000 } }], options);
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
