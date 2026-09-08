import assert from 'node:assert/strict';
import test from 'node:test';
import {appendFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {host} from '../fixtures/pr6-host.js';
import {workerModel} from '../fixtures/pr2-worker-model.js';
import {localStop,TERMINAL} from '../../src/managed/contracts.js';

// Keep the original held tool_result middleware unchanged. Only the isolated
// test bootstrap substitutes a fixed Git-bound substrate request for Main.
const program=`const spec=__SUBSTRATE_SPEC__;
 const descriptor=await tools.describe({ref:'arbor_lifetime.lease'});
 const active=tools.call({ref:'arbor.substrateStart',args:spec});
 await tools.call({ref:'pr2fixture.ready',args:{}});
 let reloadDone=false;const reload=components.reload({id:'arbor'}).then(result=>{reloadDone=true;return result;});
 let guard;for(let i=0;i<200;i++){guard=await components.status({id:'arbor.drain'});if(guard.state==='unloading')break;}
 if(guard?.state!=='unloading')throw new Error('Scoped guard never entered retirement');
 if(reloadDone)throw new Error('Reload returned before held native reply');
 await tools.call({ref:'pr2fixture.release',args:{}});
 const [binding]=await Promise.all([active,reload]);
 const retained=await tools.call({ref:'arbor.substrateInspect',args:{runId:spec.runId}});
 const members=await agents.members({scope:'local',kinds:['actor','agent']});
 return JSON.stringify({binding,retained,members,descriptor,guard,reloadDone});`;

for(const installed of [false,true])for(const hold of ['agents.create','agents.ask','agents.spawn','agents.wait','agents.stop'])test(`PR12 lifetime ${installed?'installed':'source'} application reload awaits held ${hold}`,{timeout:180000},async t=>{
 const h=await host('command',{installed,hold,program,inference:workerModel,prepare:async root=>{
  const cwd=join(root,'source'),oid=execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim();
  const spec={runId:'lifetime-run',materialId:'fixed-lifetime-material',cwd,oid,policyId:'inspect-only-v1',objective:'Inspect fixed material without edits or scores',model:'arbor-pr2-fake/deterministic',maxWaves:1,concurrency:1};
  const path=join(root,'profile/extensions/main.ts'),source=await readFile(path,'utf8');
  await writeFile(path,source.replace('export default function fake(pi: ExtensionAPI) {',`export default function fake(pi: ExtensionAPI) {\n process.env.ARBOR_PR2_PROGRAM=process.env.ARBOR_PR2_PROGRAM!.replace('__SUBSTRATE_SPEC__',${JSON.stringify(JSON.stringify(spec))});`));
 }});t.after(()=>h.store.close());const {binding,retained,members,descriptor,guard,reloadDone}=h.value;
 assert.deepEqual(binding,retained);assert.notEqual(binding.state,'cleanup_pending');assert.ok(['interrupted','cancelled','completed'].includes(binding.state));assert.equal(reloadDone,true);assert.equal(guard.state,'unloading');assert.deepEqual(guard.requirements,['arbor_lifetime.lease']);
 assert.equal(descriptor.risk,'agent');assert.equal(descriptor.effect.kind,'scoped');assert.equal(descriptor.inputSchema.additionalProperties,false);assert.deepEqual(descriptor.outputSchema,{type:'null'});
 assert.equal(h.events.filter(e=>e.event==='barrier.held').length,1);assert.equal(h.events.filter(e=>e.event==='barrier.released').length,1);
 const results=h.events.filter(e=>e.event==='native.result'),created=results.filter(e=>e.data.ref==='agents.create');assert.equal(created.length,1);assert.deepEqual(binding.actors,[created[0]!.data.result.id]);
 const targets=[...binding.actors.map((id:string)=>({id,kind:'actor' as const})),...binding.workers.map((w:any)=>({id:w.id,kind:'agent' as const,cwd:w.cwd}))];
 for(const target of targets){
  assert.ok(binding.dispatches.some((d:any)=>d.nativeId===target.id),'Returned handle must be saved before cleanup');
  const stop=results.find(e=>e.data.ref==='agents.stop'&&e.data.result.id===target.id);
  if(stop)localStop(stop.data.result,target);
  else {
   // In the held-stop case, the worker already completed before the actor's
   // stop began. Require that exact prior wait and its persisted terminal state,
   // rather than inventing an unnecessary stop of a settled worker.
   assert.equal(hold,'agents.stop');assert.equal(target.kind,'agent');
   const held=h.events.find(e=>e.event==='barrier.held')!;
   assert.ok(binding.workers.some((w:any)=>w.id===target.id&&TERMINAL.includes(w.status)));
   assert.ok(results.some(e=>e.data.ref==='agents.wait'&&e.data.result.id===target.id&&TERMINAL.includes(e.data.result.status)&&e.at<=held.at),'Missing exact terminal wait before held stop');
  }
  if(target.kind==='agent'){const spawn=results.find(e=>e.data.ref==='agents.spawn'&&e.data.result.id===target.id);assert.ok(spawn);assert.ok(results.some(e=>e.data.ref==='agents.wait'&&e.data.result.id===target.id&&TERMINAL.includes(e.data.result.status)),'Worker terminal wait is required');}
 }
 assert.ok(members.every((m:any)=>TERMINAL.includes(m.status)),'No live run-owned participant may survive');
 if(hold==='agents.create')assert.equal(h.events.filter(e=>e.event==='actor.observed').length,0);
 if(hold==='agents.ask')assert.equal(binding.workers.length,0);
 const gates=resolve('.runtime/pr12-gates');await mkdir(gates,{recursive:true});await appendFile(join(gates,'lifetime-reload.jsonl'),JSON.stringify({root:h.root,installed,hold,state:binding.state,actors:binding.actors,workers:binding.workers.map((w:any)=>w.id),live:0,actualComponentReload:true,heldSettlement:true})+'\n');
});
