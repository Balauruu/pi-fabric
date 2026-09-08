export {};
async function template(){
const run = π.run;
const s = JSON.parse(await pi.read(`${run}/ledger.json`));
const q = JSON.parse(π.request);
const names = {search: "web_search", fetch: "fetch_content", passage: "get_search_content"};
const name = names[q.kind];
if (!name) throw new Error("Unknown retrieval kind");
if (!s.profileOK || s.missing.includes(`extensions.${name}`)) return {status: "blocked", reason: "Profile/capability preflight"};
if (Date.now() >= s.deadline || s.directCalls.length >= s.plan.limits.mainRetrievalCalls) return {status: "blocked", reason: "Remaining Main retrieval budget exhausted"};
const path = `${run}/direct-${s.directCalls.length + 1}.json`;
s.directCalls.push({path, request: q, status: "attempted"});
await pi.write({path: `${run}/ledger.json`, text: JSON.stringify(s)});
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
  await pi.write({path, text: JSON.stringify({request: q, retrieved, result: {isError: r.isError, details: d, text: r.text}})});
  s.directCalls[s.directCalls.length - 1].status = retrieved ? "retrieved" : "gap";
  await pi.write({path: `${run}/ledger.json`, text: JSON.stringify(s)});
  return {path, retrieved, responseId: d.responseId ?? d.searchId ?? null, details: d, excerpt: r.text.slice(0,6000), clipped: r.text.length > 6000, next: "Main checks relevance, exact support and omitted context"};
} catch (error) {
  const failure = {path, retrieved: false, error: String(error)};
  await pi.write({path, text: JSON.stringify(failure)});
  s.directCalls[s.directCalls.length - 1].status = "error";
  await pi.write({path: `${run}/ledger.json`, text: JSON.stringify(s)});
  return failure;
}
}
