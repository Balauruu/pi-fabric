import './check.mjs';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root='/home/balauru/.pi-profiles/fabric';
const target=join(root,'skills/wayfinder-ultra');
const fixture=join(root,'tmp/wayfinder-ultra-implementation-1788805463931/fixture');
const mapRoot=join(fixture,'docs/wayfinder/smoke');
const read=p=>readFileSync(p,'utf8');
const ticket=read(join(mapRoot,'tickets/T0001.md'));
const next=read(join(mapRoot,'tickets/T0002.md'));
const map=read(join(mapRoot,'map.md'));
const resolution=read(join(mapRoot,'resolutions/T0001/R0001.md'));
assert.match(ticket,/^Lifecycle: closed$/m);
assert.match(ticket,/^Closure disposition: completed$/m);
assert.match(ticket,/^Outcome: answered$/m);
assert.match(ticket,/^Executor: unclaimed$/m);
assert.match(ticket,/^Claim: released by local-smoke /m);
assert.match(next,/^Lifecycle: open$/m);
assert.match(next,/^Outcome: pending$/m);
assert.match(next,/^Current resolution: none$/m);
assert.match(next,/applicability: current/);
assert.match(map,/^Status: open$/m);
assert.ok(Buffer.byteLength(map)<4000);
assert.equal(read(join(fixture,'config.txt')),'report_max_rows=25000\n');
const hash=createHash('sha256').update(read(join(fixture,'config.txt'))).digest('hex');
assert.ok(resolution.includes(hash));
assert.match(resolution,/not a runtime observation/);
assert.match(resolution,/25000/);
assert.equal(readdirSync(join(mapRoot,'resolutions/T0001')).length,1);
assert.ok(!existsSync(join(mapRoot,'resolutions/T0002')));
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const artifacts=walk(mapRoot).filter(p=>p.endsWith('.md'));
for(const path of artifacts){
 for(const match of read(path).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
   const link=resolve(dirname(path),match[1].split('#')[0]);
   assert.ok(link.startsWith(fixture+'/'),path+' link escapes fixture');
   assert.ok(existsSync(link),path+' broken link '+match[1]);
 }
}
assert.match(read(join(target,'references/templates.md')),/^Created: <immutable UTC timestamp/m);
assert.match(read(join(target,'references/state.md')),/Created: unknown/);
assert.match(read(join(target,'references/state.md')),/never invent a historical date/);
assert.match(read(join(target,'SKILL.md')),/persisted-priority\/creation-time\/stable-ID/);
console.log(JSON.stringify({passed:true,actualLocalSmoke:{resolution:'T0001 completed/answered',claimReleased:true,downstream:'T0002 open/pending; evidence applicable',map:'open',sourceUnchanged:true,linksChecked:artifacts.length,oneResolutionOnly:true},orderingMetadata:true,limits:'One real local happy path; other type/safety branches tested as fresh hypothetical reasoning, not live service integrations.'},null,2));
