import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { host } from '../fixtures/pr6-host.js';
import { parallelModel,parallelProposal } from '../fixtures/pr7-model.js';
import { gitText } from '../../src/material/Workspace.js';
import { reservedEvaluationCalls } from '../../src/research/policy.js';

for(const failure of ['preparation','protected'] as const)test(`PR7 repair actual native product ${failure} failure retains evidence and releases only proven capacity`,{timeout:120000},async t=>{
 const providerSource=(await readFile('tests/fixtures/pr2-fake-provider.ts','utf8')).replace('export default function fake','const __name=(fn:any)=>fn;\n'+parallelProposal.toString()+'\nexport default function fake').replace('        if (data.research) {',`        if(data.research && data.objective.description==='PR7'){const p=parallelProposal(data);trace('research.proposal',p);return stream(model,[{type:'text',text:JSON.stringify({action:'silent',data:p})}],options);}\n        if (data.research) {`);
 const h=await host('command',{providerSource,inference:trace=>parallelModel(trace,failure==='protected'?'h1':undefined),prepare:async root=>{if(failure==='preparation'){const dir=join(root,'state/runs/research/workspace/candidates/h2');await mkdir(dir,{recursive:true});await writeFile(join(dir,'retained'),'obstruction');}},overrides:{objective:{description:'PR7',unit:'points'},search:{concurrency:2,maxChildren:10,maxActorTurns:100},limits:{attempts:8,evaluatorCalls:100,activeMs:600000,artifactBytes:67108864}}});t.after(()=>h.store.close());
 const p=h.value.p,m=p.run.material;assert.equal(p.run.active,0);assert.equal(p.attempts.length,2);assert.deepEqual(h.value.live,[]);assert.equal(m.incumbent,m.capture.baseline);assert.equal(p.evaluations.length,1);
 const error=p.run.error??h.value.error;assert.match(error,failure==='preparation'?/already exists|not empty/:/Protected evaluation input/);
 const workers=h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.spawn');assert.equal(workers.length,failure==='preparation'?0:2);
 if(failure==='preparation'){
  assert.equal(reservedEvaluationCalls(p.attempts,h.store.evaluations('research')),0);
  for(const a of p.attempts){assert.equal(a.state,'stopped');assert.equal(a.nativeId,null);assert.equal(a.nativeDigest,null);assert.equal(a.slotReserved,false);}
  assert.equal(await readFile(join(h.root,'state/runs/research/workspace/candidates/h2/retained'),'utf8'),'obstruction');assert.equal(m.candidates.length,1);
 }else{
  for(const a of p.attempts)assert.ok(a.nativeId&&a.nativeDigest);
  for(const c of m.candidates)assert.equal(gitText(c.directory,['rev-parse','HEAD']).trim(),c.parent);
  assert.equal(m.candidates.find((c:any)=>c.id==='h1').oid,null);assert.ok(m.candidates.find((c:any)=>c.id==='h2').oid);
  const refs=gitText(m.capture.repository,['for-each-ref','--format=%(objectname)','refs/arbor/workers/h1']).trim().split('\n');assert.ok(refs.some(oid=>gitText(m.capture.repository,['show',oid+':check'])==='PROTECTED WORKER CHANGE'));
 }
 const full=h.store.projection('research')!;assert.ok((full.events as any[]).some(e=>e.type==='material-dispatch-failed'&&e.status==='blocked'));
 await mkdir('.runtime/pr7-gates',{recursive:true});await writeFile(`.runtime/pr7-gates/repair-native-${failure}.json`,JSON.stringify({root:h.root,error,attempts:p.attempts,nativeWorkers:workers.length,live:h.value.live},null,2));
});
