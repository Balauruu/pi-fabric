export {};
async function template(){
const found = await tools.list({provider: "extensions", query: "fetch_content", limit: 8});
if (!found.some(a => a.ref === "extensions.fetch_content")) return {status: "blocked", gap: "fetch_content unavailable; discover an existing nonbrowser alternative"};
await tools.describe({ref: "extensions.fetch_content"});
const r = await extensions.fetch_content({url: π.url});
const d = (r.details && typeof r.details === "object" ? r.details : {}) as Record<string, unknown>;
return {retrieved: !r.isError && !d.error && d.successful === 1,
  responseId: typeof d.responseId === "string" && d.responseId.length <= 256 ? d.responseId : null,
  error: String(d.error ?? (r.isError ? "Captured tool error" : "")).slice(0,600),
  excerpt: r.text.slice(0,6000), clipped: r.text.length > 6000,
  next: "Check passage support before answering; cite the original payload URL and preserve qualifications"};
}
