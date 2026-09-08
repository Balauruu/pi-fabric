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
if (!run.startsWith("/home/balauru/.pi-profiles/fabric/") || run.split("/").includes("..")) throw new Error("Use a new task directory inside the Fabric profile");
const plan = JSON.parse(π.plan);
const ids = plan.assignments.map(a => a.id);
if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-z0-9-]+$/.test(id))) throw new Error("Unique safe assignment IDs required");
if (!plan.slots.length || new Set(plan.slots).size !== plan.slots.length) throw new Error("Unique nonempty output slots required");
for (const a of plan.assignments) if (!a.slots.length || a.slots.some(s => !plan.slots.includes(s))) throw new Error("Assignment must own known slots");
const L = plan.limits;
for (const k of ["mainRetrievalCalls", "workerRetrievalCalls", "maxLaunches"]) if (!Number.isSafeInteger(L[k]) || L[k] < 0) throw new Error(`Invalid ${k}`);
if (!Number.isSafeInteger(L.concurrency) || L.concurrency < 1 || !(L.workWindowMs > 0)) throw new Error("Invalid work limits");
for (const k of ["exactAgents", "exactStreams"]) if (L[k] !== null && (!Number.isSafeInteger(L[k]) || L[k] < 0)) throw new Error(`Invalid ${k}`);
if (L.exactStreams !== null && L.exactStreams !== ids.length) throw new Error("Do not change fixed stream assignments");
const profile = await pi.bash({command: "printenv PI_CODING_AGENT_DIR", settle: true});
const profileOK = profile.ok && profile.output.trim() === "/home/balauru/.pi-profiles/fabric";
const modelOK = (await tools.models()).some(m => m.key === "openai-codex/gpt-5.6-terra");
const allowed = ["web_search", "fetch_content", "get_search_content", "source_check"];
const contracts = [];
const missing = [];
for (const name of plan.requiredActions) {
  if (!allowed.includes(name)) throw new Error(`Unprescribed retrieval action: ${name}`);
  const ref = `extensions.${name}`;
  const found = await tools.list({provider: "extensions", query: name, limit: 8});
  if (!found.some(a => a.ref === ref)) { missing.push(ref); continue; }
  contracts.push(await tools.describe({ref}));
}
await saveJSON(`${run}/ledger.json`, {
  plan, skill: π.skill, profileOK, modelOK, missing,
  deadline: Date.now() + L.workWindowMs, directCalls: [], launches: [], outcomes: []
});
return {run, profileOK, modelOK, missing, contracts: contracts.map(a => ({ref: a.ref, inputSchema: a.inputSchema}))};
}
