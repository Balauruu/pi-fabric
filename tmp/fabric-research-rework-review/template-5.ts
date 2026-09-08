export {};
async function template(){
const run = π.run;
const s = JSON.parse(await pi.read(`${run}/ledger.json`));
const candidates = [];
const flags = [];
for (const o of s.outcomes) {
  let r;
  try { r = JSON.parse(await pi.read(o.path)); }
  catch (error) { flags.push({assignment: o.assignment, gap: String(error), path: o.path}); continue; }
  let v = r.value;
  if (v === undefined && typeof r.text === "string") {
    try { v = JSON.parse(r.text); flags.push({assignment: o.assignment, gap: "Parsed unvalidated partial text; Main must inspect support and applicable fields"}); }
    catch { /* Non-JSON partial prose stays in the stored result for Main. */ }
  }
  if (r.status !== "completed") flags.push({assignment: o.assignment, gap: r.error ?? r.status});
  if (!v || !Array.isArray(v.rows) || !Array.isArray(v.calls) || !Array.isArray(v.discovered) || !Array.isArray(v.gaps)) {
    flags.push({assignment: o.assignment, gap: "No structured return; inspect stored partial text manually", path: o.path});
    continue;
  }
  const a = s.plan.assignments.find(a => a.id === o.assignment);
  const retrievalReported = v.calls.some(c => c.retrieved && v.discovered.includes(c.ref));
  if (v.assignment !== o.assignment) flags.push({assignment: o.assignment, gap: "Assignment identity mismatch"});
  if (v.calls.length > s.plan.limits.workerRetrievalCalls) flags.push({assignment: o.assignment, gap: "Worker exceeded retrieval allocation; do not hide overrun"});
  for (const row of v.rows) candidates.push({
    key: `${o.assignment}/${row.id}`, assignment: o.assignment, row,
    eligibleForReview: v.assignment === o.assignment && a.slots.includes(row.slot) && retrievalReported && row.support.length > 0,
    receiptPath: o.path, checked: false
  });
  for (const gap of v.gaps) flags.push({assignment: o.assignment, gap});
}
await pi.write({path: `${run}/candidates.json`, text: JSON.stringify(candidates)});
return {candidatePath: `${run}/candidates.json`, index: candidates.map(c => ({key: c.key, slot: c.row.slot, finding: c.row.finding, eligibleForReview: c.eligibleForReview, receiptPath: c.receiptPath})), flags, pending: s.plan.assignments.filter(a => !s.outcomes.some(o => o.assignment === a.id)).map(a => a.id)};
}
