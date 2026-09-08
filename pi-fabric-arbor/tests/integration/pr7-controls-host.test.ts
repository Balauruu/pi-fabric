import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import test from 'node:test';
import { host } from '../fixtures/pr6-host.js';
import { parallelModel,parallelProposal } from '../fixtures/pr7-model.js';
import { commandProgram,researchCommand } from '../../src/research/commands.js';

for (const action of ['pause','cancel'] as const) test(`PR7 native ${action} during serial reused-slot wave admits no second worker`,{timeout:120000},async t=>{
 const providerSource=(await readFile('tests/fixtures/pr2-fake-provider.ts','utf8')).replace('export default function fake','const __name=(fn:any)=>fn;\n'+parallelProposal.toString()+'\nexport default function fake').replace('        if (data.research) {',`        if(data.research && data.objective.description==='PR7'){const p=parallelProposal(data);trace('research.proposal',p);return stream(model,[{type:'text',text:JSON.stringify({action:'silent',data:p})}],options);}\n        if (data.research) {`);
 // Main only starts and submits an owning-Pi control at an observed native
 // result barrier. Actual actor proposals, dispatch/waits and grading stay in product.
 const program=`const active=(async()=>{${commandProgram(researchCommand('start',JSON.stringify({runId:'research'})))}})();
 await Promise.race([tools.call({ref:'pr2fixture.ready',args:{}}),active.then(()=>{throw new Error('Native barrier missing')})]);
 const before=await tools.call({ref:'arbor.inspect',args:{runId:'research'}}),r=before.run;
 const control=tools.call({ref:'arbor.control',args:{runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:'midwave-${action}',action:'${action}'}});
 await tools.call({ref:'pr2fixture.release',args:{}});await control;await active;
 return JSON.stringify({p:compactProjection(await tools.call({ref:'arbor.inspect',args:{runId:'research'}})),live:(await agents.members({scope:'local',kinds:['actor','agent']})).filter(m=>!['completed','failed','stopped','timed_out'].includes(m.status))});`;
 const h=await host('command',{program,inference:parallelModel,providerSource,hold:'agents.spawn',overrides:{objective:{description:'PR7',unit:'points'},search:{concurrency:1,maxChildren:10,maxActorTurns:100},limits:{attempts:8,evaluatorCalls:100,activeMs:600000,artifactBytes:67108864}}});t.after(()=>h.store.close());
 const p=h.value.p;assert.equal(p.run.state,action==='pause'?'paused':'cancelled',h.root+': '+p.run.error);assert.equal(p.attempts.length,2);assert.equal(p.run.active,0);assert.deepEqual(h.value.live,[]);
 const first=p.attempts.find((a:any)=>a.id==='h1'),second=p.attempts.find((a:any)=>a.id==='h2');assert.ok(first.nativeId&&first.nativeDigest);assert.equal(second.nativeId,null);assert.equal(second.nativeDigest,null);assert.equal(second.state,'stopped');assert.equal(second.slotReserved,false);
 assert.equal(h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.spawn').length,1);assert.equal(h.events.filter(e=>e.event==='main.inference').length,2);
 assert.equal(p.evaluations.length,1);assert.equal(p.run.material.incumbent,p.run.material.capture.baseline);assert.equal(p.run.waves.length,1);assert.equal(p.attempts[0].parentIncumbent,p.attempts[1].parentIncumbent);
 await mkdir('.runtime/pr7-gates',{recursive:true});await writeFile(`.runtime/pr7-gates/control-${action}.json`,JSON.stringify({root:h.root,state:p.run.state,attempts:p.attempts,live:h.value.live},null,2));
});
