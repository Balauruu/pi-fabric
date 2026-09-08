import { appendFileSync } from "node:fs";
import { createServer } from "node:http";
/** Deterministic inference only. Product OwnerExecution launches/owns native Pi. */
export async function subjectModel(trace: string, hang = false) {
  const server = createServer(async (request, response) => {
    try {
      let input = ""; for await (const part of request) { input += String(part); if (input.length > 1048576) throw new Error("Bounded fake input exceeded"); }
      const body = JSON.parse(input), text = body.messages.filter((m: any) => m.role === "user").map((m: any) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("\n");
      const judge = text.includes("Arbor bounded evaluation judge");
      const answer = judge ? (text.includes("Subject answer: GOOD") ? "PASS" : "FAIL") : text.includes("CANDIDATE_SNAPSHOT_GOOD") ? "GOOD" : "BAD";
      appendFileSync(trace, JSON.stringify({ event: "subject.observed", data: { text, model: body.model, tools: (body.tools ?? []).map((t: any) => t.function.name), answer, judge }, at: Date.now() }) + "\n");
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      if (hang) { response.write(": intentionally pending local inference\n\n"); return; }
      response.write(`data: ${JSON.stringify({ id: "local-subject", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta: { role: "assistant", content: answer }, finish_reason: null }] })}\n\n`);
      response.end(`data: ${JSON.stringify({ id: "local-subject", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } })}\n\ndata: [DONE]\n\n`);
    } catch (error) { response.writeHead(500); response.end(String(error)); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing fake address");
  return { baseUrl: `http://127.0.0.1:${address.port}/v1`, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
