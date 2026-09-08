export {};
async function template(){
async function saveJSON(path: string, value: unknown): Promise<void> {
  const text = JSON.stringify(value);
  if (typeof text !== "string") throw new Error("Packet must be JSON serializable");
  const units = Array.from(text);
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
const s = JSON.parse(await pi.read(`${run}/ledger.json`));
const evidenceSchema = JSON.parse(await pi.read(`${s.skill}/references/evidence.schema.json`));
if (!s.profileOK || s.missing.length || !(await tools.models()).some(m => m.key === "openai-codex/gpt-5.6-terra")) return {status: "blocked", reason: "Required profile, tools or exact worker model unavailable"};
await tools.describe({ref: "agents.run"});
const cap = Math.min(s.plan.limits.maxLaunches, s.plan.limits.exactAgents ?? Infinity);
const pending = s.plan.assignments.filter(a => !s.launches.some(x => x.assignment === a.id));
const room = Math.max(0, cap - s.launches.length);
const batch = Date.now() < s.deadline ? pending.slice(0, Math.min(room, s.plan.limits.concurrency)) : [];
if (!batch.length) return {status: "no_dispatch", pending: pending.map(a => a.id), reason: "No pending work or remaining allowance"};
for (const a of batch) s.launches.push({assignment: a.id, status: "reserved", id: null});
await pi.write({path: `${run}/ledger.json`, text: JSON.stringify(s)});
type Outcome = {assignment: string; path: string; id: string | null; status: string; error: string | null; usage?: unknown; hasValue?: boolean};
const outcomes = await parallel<Outcome>(batch.map(a => async (): Promise<Outcome> => {
  const path = `${run}/worker-${a.id}.json`;
  let r;
  try {
    r = await agents.run({
      name: a.id, runner: "pi", model: "openai-codex/gpt-5.6-terra", thinking: "high",
      extensions: true, recursive: false, tools: s.plan.requiredActions,
      schema: evidenceSchema,
      task: JSON.stringify({policy: π.policy, question: s.plan.question, scope: s.plan.scope, context: s.plan.context,
        standard: s.plan.standard, stop: s.plan.stop, assignment: a,
        requiredActions: s.plan.requiredActions.map(n => `extensions.${n}`),
        retrievalAllowance: s.plan.limits.workerRetrievalCalls, evidenceSchema})
    });
    await saveJSON(path, r);
    return {assignment: a.id, path, id: r.id, status: r.status, error: r.error ?? null,
      usage: r.usage, hasValue: r.value !== undefined};
  } catch (error) {
    const outcome = {assignment: a.id, path, id: r?.id ?? null, status: r?.status ?? "indeterminate", error: String(error), usage: r?.usage};
    try { await pi.write({path, text: JSON.stringify(outcome)}); }
    catch { /* The returned index still preserves this failure and successful siblings. */ }
    return outcome;
  }
}), {concurrency: batch.length});
s.outcomes.push(...outcomes);
for (const o of outcomes) Object.assign(s.launches.find(x => x.assignment === o.assignment), {id: o.id, status: o.status});
await pi.write({path: `${run}/ledger.json`, text: JSON.stringify(s)});
return {outcomes, notDispatched: pending.slice(batch.length).map(a => a.id), next: "Validate partial evidence before further dispatch"};
}
