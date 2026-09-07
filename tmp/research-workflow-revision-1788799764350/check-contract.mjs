import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2];
const names=['SKILL.md','references/runtime.md','references/stream-contracts.md','references/synthesis-and-reporting.md','references/last30days.md'];
const texts=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(root,n),'utf8')]));
const skill=texts['SKILL.md']; const all=Object.values(texts).join('\n');
const checks={
 manual: /^name: fabric-research$/m.test(skill)&&/^disable-model-invocation: true$/m.test(skill),
 codeHeld: /one type-checked TypeScript `fabric_exec` program/.test(skill),
 phases: ['Discover/plan','Research','Verify','Repair/reverify','Synthesize','Validate report'].every(s=>skill.includes('**'+s+':**')),
 compactBoundary: /Main checks the outcome contract/.test(skill)&&/not routinely read back/.test(skill),
 independentValidation: /independent of the report author/.test(texts['references/synthesis-and-reporting.md']),
 noOldOwnership: !/Main reads every stream|Main alone edits RESEARCH|Default repair is a direct Main|Main reads the substantive|Main reads those notes|Main or a delegated worker may run/.test(all),
 evidenceGates: ['## Quantitative comparability gate','## Contradiction dispositions','## Match the method to the claim'].every(s=>all.includes(s))&&all.includes('A trial\'s existence, design or sample size alone is not an efficacy result'),
 noSilentFallback: /do not.*fall back to substantive research in Main/.test(all),
 noWriteDelegated: /keep substantive work delegated/.test(skill),
 recovery: /indeterminate reservation/.test(all)&&/sole writer of `state.json`/.test(all),
 links: names.every(n=>[...texts[n].matchAll(/\]\(([^)]+)\)/g)].every(m=>{const p=m[1].split('#')[0];return !p||/^https?:/.test(p)||fs.existsSync(path.isAbsolute(p)?p:path.resolve(path.dirname(path.join(root,n)),p));})),
};
console.log(JSON.stringify(checks));
process.exit(Object.values(checks).every(Boolean)?0:1);
