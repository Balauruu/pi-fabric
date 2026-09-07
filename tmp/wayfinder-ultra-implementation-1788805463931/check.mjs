import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadSkillsFromDir, formatSkillsForPrompt } from '/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/skills.js';
const root='/home/balauru/.pi-profiles/fabric';
const target=join(root,'skills/wayfinder-ultra');
const run=join(root,'tmp/wayfinder-ultra-implementation-1788805463931');
const {skills, diagnostics}=loadSkillsFromDir({dir:target,source:'path'});
assert.deepEqual(diagnostics,[]);
assert.equal(skills.length,1);
assert.equal(skills[0].name,'wayfinder-ultra');
assert.equal(skills[0].filePath,join(target,'SKILL.md'));
assert.equal(skills[0].disableModelInvocation,true);
assert.equal(formatSkillsForPrompt(skills),'');
assert.equal(readFileSync(join(root,'skills/engineering/wayfinder/SKILL.md'),'utf8'),readFileSync(join(run,'original-SKILL.md'),'utf8'));
const main=readFileSync(join(target,'SKILL.md'),'utf8');
const contracts=readFileSync(join(target,'references/tickets.md'),'utf8');
const types=['investigation','experiment','decision','design','implementation','verification','release','enabler'];
for(const type of types){
 assert.ok(main.includes('wayfinder:'+type),type+' label');
 const heading='## '+type[0].toUpperCase()+type.slice(1);
 const section=contracts.split(heading+'\n')[1]?.split('\n## ')[0];
 assert.ok(section,heading);
 for(const field of ['**Inputs:**','**Resolution:**','**Completion:**']) assert.ok(section.includes(field),type+' '+field);
}
for(const file of readdirSync(join(target,'references'))) assert.ok(main.includes('(references/'+file+')'),'direct pointer '+file);
console.log(JSON.stringify({passed:true,loader:'installed Pi loadSkillsFromDir',discovered:skills[0].name,manualOnly:true,diagnostics:diagnostics.length,originalUnchanged:true,typeContracts:types.length,supportFiles:readdirSync(join(target,'references')).length,limits:'Explicit-path loader and document assertions, not live TUI command or tracker enforcement.'},null,2));
