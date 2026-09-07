export {};
async function template(){
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
await pi.write({path: `${run}/review.json`, text: JSON.stringify(review)});
await pi.write({path: `${run}/synthesis-input.json`, text: JSON.stringify(result)});
return result;
}
