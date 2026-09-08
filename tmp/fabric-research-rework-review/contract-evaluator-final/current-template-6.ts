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
const rowSchema = JSON.parse(await pi.read(`${s.skill}/references/evidence.schema.json`)).properties.rows.items;
const object = (x: any) => x !== null && typeof x === "object" && !Array.isArray(x);
const allowedRefs = s.plan.requiredActions.map(n => `extensions.${n}`);
const candidates = [];
const flags = [];
for (const o of s.outcomes) {
  try {
    const a = s.plan.assignments.find(a => a.id === o.assignment);
    if (!a) throw new Error("Unknown assignment in outcome index");
    const r = await loadJSON(o.path);
    if (!object(r)) throw new Error("Invalid native envelope");
    let v = r.value;
    if (v === undefined && typeof r.text === "string") {
      try { v = JSON.parse(r.text); flags.push({assignment: o.assignment, gap: "Unvalidated partial text: Main must inspect support and applicable fields"}); }
      catch { /* Non-JSON partial prose remains in the packet for Main. */ }
    }
    if (r.status !== "completed") flags.push({assignment: o.assignment, gap: r.error ?? r.status});
    if (!object(v) || !Array.isArray(v.rows) || !Array.isArray(v.calls) || !Array.isArray(v.discovered) || !Array.isArray(v.gaps)) throw new Error("No structured rows; inspect partial prose in packet");
    const known = v.assignment === o.assignment;
    const discovered = allowedRefs.every(ref => v.discovered.includes(ref));
    const receipts = v.calls.filter(c => object(c) && allowedRefs.includes(c.ref) && object(c.args) && typeof c.retrieved === "boolean" && typeof c.detail === "string");
    const retrievalReported = known && discovered && receipts.some(c => c.retrieved === true);
    if (!known || !discovered || receipts.length !== v.calls.length) flags.push({assignment: o.assignment, gap: "Identity, discovery or receipt-contract mismatch"});
    if (v.calls.length > s.plan.limits.workerRetrievalCalls) flags.push({assignment: o.assignment, gap: "Worker exceeded retrieval allocation"});
    const ids = new Set<string>();
    for (const row of v.rows) {
      try {
        if (!object(row) || typeof row.id !== "string" || !row.id || ids.has(row.id) || !a.slots.includes(row.slot) || typeof row.finding !== "string" || typeof row.confidence !== "string" || !rowSchema.properties.status.enum.includes(row.status) || !rowSchema.properties.disposition.enum.includes(row.disposition) || !Array.isArray(row.support)) throw new Error("Malformed/duplicate row or wrong output slot");
        ids.add(row.id);
        const supportOK = row.support.every(p => object(p) && typeof p.url === "string" && /^https?:[/][/]/.test(p.url) && typeof p.passage === "string" && p.passage.trim().length > 0);
        candidates.push({key: `${o.assignment}/${row.id}`, assignment: o.assignment, row,
          eligibleForReview: retrievalReported && receipts.length === v.calls.length && supportOK && row.support.length > 0,
          receiptPath: o.path, checked: false});
        if (!supportOK) flags.push({assignment: o.assignment, gap: `Invalid support in ${row.id}; inspect packet`});
      } catch (error) { flags.push({assignment: o.assignment, gap: String(error), path: o.path}); }
    }
    for (const gap of v.gaps) flags.push({assignment: o.assignment, gap: typeof gap === "string" ? gap : "Malformed gap; inspect packet"});
  } catch (error) { flags.push({assignment: o.assignment, gap: String(error), path: o.path}); }
}
await saveJSON(`${run}/candidates.json`, candidates);
await saveJSON(`${run}/validation-flags.json`, flags);
return {candidatePath: `${run}/candidates.json`, candidateCount: candidates.length,
  index: candidates.slice(0,20).map(c => ({key: c.key, slot: c.row.slot, finding: c.row.finding.slice(0,600), eligibleForReview: c.eligibleForReview, receiptPath: c.receiptPath})),
  flags: flags.slice(0,20), flagCount: flags.length, flagPath: `${run}/validation-flags.json`,
  pending: s.plan.assignments.filter(a => !s.outcomes.some(o => o.assignment === a.id)).map(a => a.id)};
}
