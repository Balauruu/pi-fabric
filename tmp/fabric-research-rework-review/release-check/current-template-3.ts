export {};
async function template(){
async function saveJSON(path: string, value: unknown): Promise<void> {
  const text = JSON.stringify(value);
  if (typeof text !== "string") throw new Error("Packet must be JSON serializable");
  const units = Array.from(text);
  if (units.length <= 8000) { await pi.write({path, text}); return; }
  const parts = Math.ceil(units.length / 8000);
  for (let i = 0; i < parts; i++) {
    await pi.write({path: `${path}.part-${i}`, text: units.slice(i * 8000, (i + 1) * 8000).join("")});
  }
  await pi.write({path, text: JSON.stringify({researchPacket: 1, parts})});
}
async function loadJSON(path: string): Promise<any> {
  const index = JSON.parse(await pi.read(path));
  if (index?.researchPacket !== 1) return index;
  if (!Number.isSafeInteger(index.parts) || index.parts < 1) throw new Error("Invalid packet index");
  const fragments = [];
  for (let i = 0; i < index.parts; i++) fragments.push(await pi.read(`${path}.part-${i}`));
  return JSON.parse(fragments.join(""));
}
const run = π.run;
const s = await loadJSON(`${run}/ledger.json`);
const q = JSON.parse(π.request);
const names = {search: "web_search", fetch: "fetch_content", passage: "get_search_content"};
const name = names[q.kind];
if (!name) throw new Error("Unknown retrieval kind");
if (!s.profileOK || s.missing.includes(`extensions.${name}`)) return {status: "blocked", reason: "Profile/capability preflight"};
if (Date.now() >= s.deadline || s.directCalls.length >= s.plan.limits.mainRetrievalCalls) return {status: "blocked", reason: "Remaining Main retrieval budget exhausted"};
const path = `${run}/direct-${s.directCalls.length + 1}.json`;
s.directCalls.push({path, request: q, status: "attempted"});
await saveJSON(`${run}/ledger.json`, s);
try {
  const r = q.kind === "search"
    ? await extensions.web_search({...(q.queries ? {queries: q.queries} : {query: q.query}), numResults: 5, workflow: "none"})
    : q.kind === "fetch"
      ? await extensions.fetch_content({url: q.url})
      : await extensions.get_search_content({responseId: q.responseId, url: q.url, findText: q.findText, findMode: "exact"});
  const d = (r.details && typeof r.details === "object" ? r.details : {}) as Record<string, unknown>;
  const retrieved = !r.isError && !d.error && (q.kind === "search"
    ? typeof d.successfulQueries === "number" && d.successfulQueries > 0
    : q.kind === "fetch" ? d.successful === 1 : typeof d.matchCount === "number" && d.matchCount > 0);
  await saveJSON(path, {request: q, retrieved, result: {isError: r.isError, details: d, text: r.text}});
  s.directCalls[s.directCalls.length - 1].status = retrieved ? "retrieved" : "gap";
  await saveJSON(`${run}/ledger.json`, s);
  const handle = d.responseId ?? d.searchId;
  return {path, retrieved, responseId: typeof handle === "string" && handle.length <= 256 ? handle : null, error: String(d.error ?? "").slice(0,600), excerpt: r.text.slice(0,6000), clipped: r.text.length > 6000, next: "Main checks relevance, exact support and omitted context; full details remain in receipt"};
} catch (error) {
  const failure = {path, retrieved: false, error: String(error)};
  await saveJSON(path, failure);
  s.directCalls[s.directCalls.length - 1].status = "error";
  await saveJSON(`${run}/ledger.json`, s);
  return {...failure, error: failure.error.slice(0,600)};
}
}
