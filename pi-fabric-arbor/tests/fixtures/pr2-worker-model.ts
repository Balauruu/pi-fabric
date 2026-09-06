import { appendFileSync } from "node:fs";
import { createServer } from "node:http";

/** Local deterministic inference transport only. Native Pi owns tool execution.
 * Workers load models.json, not extensions, so no Arbor/Fabric provider exists.
 */
export async function workerModel(tracePath: string) {
  const trace = (event: string, data: unknown) => appendFileSync(tracePath, JSON.stringify({ event, data, pid: process.pid, at: Date.now() }) + "\n");
  const server = createServer(async (request, response) => {
    try {
      let input = ""; for await (const part of request) { input += String(part); if (input.length > 1024 * 1024) throw new Error("Fixture request too large"); }
      const body = JSON.parse(input), last = body.messages.at(-1);
      const done = last.role === "tool";
      if (done) {
        trace("worker.restrictions", last.content);
        trace("worker.observed", { user: body.messages.find((m: any) => m.role === "user")?.content, tools: (body.tools ?? []).map((t: any) => t.function.name) });
      }
      const delta = done ? { content: "Inspected fixed material; no score or shared mutation." }
        : { tool_calls: [{ index: 0, id: "worker-denial", type: "function", function: { name: "fabric_exec", arguments: JSON.stringify({ code: 'return await tools.call({ref:"arbor.cancel",args:{runId:"native-run"}});' }) } }] };
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write(`data: ${JSON.stringify({ id: "local-worker", object: "chat.completion.chunk", created: 1, model: "deterministic", choices: [{ index: 0, delta: { role: "assistant", ...delta }, finish_reason: null }] })}\n\n`);
      response.end(`data: ${JSON.stringify({ id: "local-worker", object: "chat.completion.chunk", created: 1, model: "deterministic", choices: [{ index: 0, delta: {}, finish_reason: done ? "stop" : "tool_calls" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\ndata: [DONE]\n\n`);
    } catch (error) { response.writeHead(500); response.end(String(error)); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing fixture listen address");
  return { baseUrl: `http://127.0.0.1:${address.port}/v1`, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
