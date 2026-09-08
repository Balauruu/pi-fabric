import fs from 'node:fs';
import assert from 'node:assert/strict';
const p=process.argv[2]; const o=JSON.parse(fs.readFileSync(p,'utf8'));
for(const k of ['status','conclusion','citations','limitations','coverage','gaps','paths','verification','reportValidation','stopReason','userDecision']) assert.ok(Object.hasOwn(o,k),'missing '+k);
assert.ok(['complete','partial','blocked'].includes(o.status));
assert.equal(typeof o.conclusion,'string'); assert.ok(o.conclusion.trim().length>20);
assert.ok(/not|cannot|insufficient|unjustified|no\b/i.test(o.conclusion),'must reject an unsupported preference');
assert.ok(o.citations.length>=2,'retain both evidence origins');
assert.equal(o.coverage.length,5); assert.equal(new Set(o.coverage.map(c=>c.questionId)).size,5);
for(const c of o.coverage){assert.ok(['supported','qualified','unknown','blocked'].includes(c.disposition));assert.ok(c.reason.length>0);}
assert.ok(o.coverage.some(c=>['qualified','unknown','blocked'].includes(c.disposition)),'unknowns must not flatten to accepted');
assert.ok(o.limitations.length>0); assert.equal(o.reportValidation,'passed');
assert.ok(o.stopReason.length>0);
for(const key of ['report','research','state']) assert.ok(fs.existsSync(o.paths[key]),'saved '+key+' path must exist');
console.log(JSON.stringify({outcomeContract:'PASS',conclusion:o.conclusion,coverage:o.coverage.map(c=>({id:c.questionId,disposition:c.disposition})),reportValidation:o.reportValidation}));
