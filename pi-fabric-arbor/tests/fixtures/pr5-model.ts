import { appendFileSync } from "node:fs";
import { createServer } from "node:http";
/** Local deterministic inference. Worker edits execute in native Pi, never in this server. */
export async function materialModel(trace: string) {
  const server = createServer(async (request, response) => {
    try {
      let input = ""; for await (const part of request) { input += String(part); if (input.length > 2 * 1048576) throw new Error("Bounded fake input exceeded"); }
      const body = JSON.parse(input), text = body.messages.filter((m: any) => m.role === "user").map((m: any) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("\n");
      const worker = text.includes("Arbor bounded material worker"), didTool = body.messages.some((m: any) => m.role === "tool"), good = !text.includes("WRITE BAD");
      const command = `printf '${good ? "CANDIDATE_SNAPSHOT_GOOD" : "BASELINE_SNAPSHOT_BAD"}' > prompt; git add prompt; git -c user.name=worker -c user.email=worker@example.invalid commit --allow-empty -m 'native worker'; printf '\\nworker staged' >> prompt; git add prompt`;
      const delta = worker && !didTool ? { role: "assistant", tool_calls: [{ index: 0, id: "material-write", type: "function", function: { name: "bash", arguments: JSON.stringify({ command }) } }] } : { role: "assistant", content: worker ? "Writers settled; candidate material retained. No supplied score." : (text.includes("CANDIDATE_SNAPSHOT_GOOD") || text.includes("BASELINE_ALWAYS_GOOD")) ? "GOOD" : "BAD" };
      appendFileSync(trace, JSON.stringify({ event: worker ? "material.worker" : "material.subject", data: { text, model: body.model, tools: (body.tools ?? []).map((t: any) => t.function.name), didTool }, at: Date.now() }) + "\n");
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write(`data: ${JSON.stringify({ id: "local-material", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`);
      response.end(`data: ${JSON.stringify({ id: "local-material", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta: {}, finish_reason: worker && !didTool ? "tool_calls" : "stop" }], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } })}\n\ndata: [DONE]\n\n`);
    } catch (e) { response.writeHead(500); response.end(String(e)); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing model address");
  return { baseUrl: `http://127.0.0.1:${address.port}/v1`, close: () => new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())) };
}
