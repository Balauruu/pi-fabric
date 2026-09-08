import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { cpus,platform,release } from 'node:os';
import test from 'node:test';
import { host } from '../fixtures/pr6-host.js';
import { parallelModel,parallelProposal } from '../fixtures/pr7-model.js';
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]!;
test('PR7 A12 three warmed two-candidate waves, real native overlap and <=80% serial median',{timeout:780000},async t=>{
 const providerSource=(await readFile('tests/fixtures/pr2-fake-provider.ts','utf8')).replace('export default function fake','const __name=(fn:any)=>fn;\n'+parallelProposal.toString()+'\nexport default function fake').replace('        if (data.research) {',`        if(data.research && data.objective.description==='PR7'){const p=parallelProposal(data);trace('research.proposal',p);return stream(model,[{type:'text',text:JSON.stringify({action:'silent',data:p})}],options);}\n        if (data.research) {`);
 const results:any[]=[];await mkdir('.runtime/pr7-gates',{recursive:true});
 for(const concurrency of [1,2]){
  await writeFile('.runtime/pr7-gates/a12-phase.json',JSON.stringify({phase:'running',concurrency,results},null,2));
  const h=await host('command',{inference:parallelModel,providerSource,overrides:{objective:{description:'PR7',unit:'points'},search:{maxChildren:10,maxActorTurns:100,concurrency,stopAfterNoGain:100},limits:{attempts:8,evaluatorCalls:100,activeMs:600000,artifactBytes:67108864}}});t.after(()=>h.store.close());
  const p=h.value.p;assert.equal(h.value.error,undefined,h.root);assert.equal(p.run.execution,'research-stop:attempt-budget',h.root+': '+p.run.error);assert.equal(p.attempts.length,8);assert.equal(p.evaluations.length,9);assert.equal(p.lessons.length,8);assert.equal(p.run.active,0);assert.deepEqual(h.value.live,[]);
  assert.equal(h.events.filter(e=>e.event==='main.inference').length,2);assert.ok(h.events.filter(e=>e.event==='actor.restrictions').every(e=>!e.data.includes('UNEXPECTED_SUCCESS')));
  const workers=h.events.filter(e=>e.event==='pr7.worker'&&e.data.didTool).map(e=>e.data);assert.equal(workers.length,8);assert.ok(workers.every(w=>w.bootstrap&&w.sentinel&&w.interval.end-w.interval.start>=1000));assert.equal(new Set(workers.map(w=>w.cwd)).size,8);
  const records=h.store.evaluations('research');assert.ok(records.every(e=>e.state==='completed'&&e.invocations.every(i=>i.state==='ingested'&&i.nativeId&&i.native)));assert.equal(records.flatMap(e=>e.invocations).length,18);
  const ancestor=p.nodes.find((n:any)=>n.nodeId==='direction');assert.equal(ancestor.insightIds.length,8);assert.equal(new Set(ancestor.insightIds).size,8);
  const waves=p.run.waves,groups=[];
  for(let pair=0;pair<4;pair++){
   const ws=waves.slice(pair,pair+1),a=workers.find(w=>w.attempt==='h'+(pair*2+1))!,b=workers.find(w=>w.attempt==='h'+(pair*2+2))!;
   assert.equal(a.oid,b.oid,'Both independent candidates use fixed parent incumbent');
   const overlap=Math.min(a.interval.end,b.interval.end)-Math.max(a.interval.start,b.interval.start);if(concurrency===2)assert.ok(overlap>0,JSON.stringify({root:h.root,a,b}));else assert.ok(overlap<=0);
   groups.push({total:ws.reduce((n:number,w:any)=>n+w.collectedAt-w.startedAt,0),setup:ws.reduce((n:number,w:any)=>n+w.preparedAt-w.startedAt,0),dispatchAndNative:ws.reduce((n:number,w:any)=>n+w.settledAt-w.preparedAt,0),collection:ws.reduce((n:number,w:any)=>n+w.collectedAt-w.settledAt,0),overlap});
  }
  results.push({concurrency,root:h.root,warmup:groups[0],warmed:groups.slice(1),median:median(groups.slice(1).map(g=>g.total)),waves,incumbent:p.run.material.incumbent});
  await writeFile('.runtime/pr7-gates/a12-phase.json',JSON.stringify({phase:'lane-complete',concurrency,results},null,2));
 }
 const evidence={environment:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,paidInference:false,measurementConcurrency:1},results,ratio:results[1].median/results[0].median};
 await writeFile('.runtime/pr7-gates/a12.json',JSON.stringify(evidence,null,2));assert.ok(evidence.ratio<=0.8,JSON.stringify(evidence));
});
