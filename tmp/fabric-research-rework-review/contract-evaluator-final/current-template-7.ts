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
const review = JSON.parse(π.review);
const rows = review.rows;
if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error("Duplicate evidence IDs");
if (review.coverage.length !== s.plan.slots.length || new Set(review.coverage.map(c => c.slot)).size !== s.plan.slots.length || review.coverage.some(c => !s.plan.slots.includes(c.slot))) throw new Error("Account for every required slot exactly once");
for (const c of review.coverage) {
  if (!["supported", "gap", "blocked"].includes(c.status) || !c.reason) throw new Error("Coverage needs a disposition and reason");
  for (const id of c.rowIds) if (!rows.some(r => r.id === id && r.slot === c.slot)) throw new Error("Coverage references missing/wrong-slot evidence");
  if (c.status === "supported" && !c.rowIds.length) throw new Error("Supported slot needs evidence");
}
for (const r of rows) {
  const check = review.checks.find(c => c.rowId === r.id);
  if (!check?.supported || !check.witness || !check.reason || !r.support.length || !["retain", "qualify"].includes(r.disposition)) throw new Error(`Unverified final evidence: ${r.id}`);
}
if (!review.stopReason) throw new Error("Actual stop reason required");
const incomplete = s.plan.assignments.filter(a => !s.outcomes.some(o => o.assignment === a.id));
const confirmed = s.launches.filter(x => x.id).length;
const indeterminate = s.launches.filter(x => !x.id).length;
const exactCountMet = s.plan.limits.exactAgents === null || (confirmed === s.plan.limits.exactAgents && indeterminate === 0);
const supported = review.coverage.filter(c => c.status === "supported").length;
const result = {
  status: supported === 0 ? "failed" : supported === s.plan.slots.length && !incomplete.length && exactCountMet ? "success" : "partial",
  execution: {requested: s.plan.assignments.map(a => a.id), reservedAttempts: s.launches.length,
    confirmedLaunches: confirmed, indeterminate, exactCountMet,
    completed: s.outcomes.filter(o => o.status === "completed").map(o => o.assignment),
    incomplete: incomplete.map(a => a.id), outcomes: s.outcomes},
  coverage: review.coverage,
  evidence: rows.map(r => ({...r, citations: r.support.map(p => p.url)})),
  stopReason: review.stopReason, highestImpactGap: review.highestImpactGap
};
await saveJSON(`${run}/review.json`, review);
await saveJSON(`${run}/synthesis-input.json`, result);
return {...result, evidence: result.evidence.slice(0,20).map(r => ({id: r.id, slot: r.slot, finding: r.finding.slice(0,600), status: r.status, citations: r.citations})), evidenceCount: rows.length, packet: `${run}/synthesis-input.json`};
}
