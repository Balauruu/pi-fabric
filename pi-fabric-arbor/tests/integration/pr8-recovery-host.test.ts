import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { host } from '../fixtures/pr6-host.js';
import { pr8Provider } from '../fixtures/pr8-proposal.js';
import { commandProgram,researchCommand } from '../../src/research/commands.js';
const start=commandProgram(researchCommand('start',JSON.stringify({runId:'research'}))),resume=commandProgram(researchCommand('resume','research'));
for(const f of [
 {name:'reservation',file:'material/MaterialJourney.ts',anchor:'const preparedAt=Date.now();',condition:'true'},
 {name:'attachment',file:'managed/OwnerExecution.ts',anchor:'if (attemptId) this.research!.native(spec.runId, attemptId, this.generation, { id, cwd: spec.cwd });',condition:'true'},
 {name:'freeze',file:'material/MaterialJourney.ts',anchor:'try{const frozen=await workspace.freeze(m.capture,candidate);',condition:'true',inside:true},
 {name:'evaluation',file:'evaluators/EvaluationEngine.ts',anchor:'e.state = "completed"; this.store.saveEvaluation(e);',condition:'e.attemptId!==null',after:true},
 {name:'ref',file:'material/MaterialJourney.ts',anchor:'return this.store.completeIntegration(run.id, generation,',condition:'true'},
])test(`PR8 actual native same-owner ${f.name} recovery retains exact facts and never redispatches the original worker`,{timeout:180000},async t=>{
 const program=`let error;try{await(async()=>{${start}})()}catch(e){error=String(e)}const before=await tools.call({ref:'arbor.inspect',args:{runId:'research'}});${f.name==='ref'?"await components.reload({id:'arbor'});":''}let p,resumeError;try{p=await(async()=>{${resume}})()}catch(e){resumeError=String(e)}p=p??await tools.call({ref:'arbor.inspect',args:{runId:'research'}});return JSON.stringify({error,resumeError,before:compactProjection(before),p:compactProjection(p),sameSpec:JSON.stringify(before.run.spec)===JSON.stringify(p.run.spec),live:(await agents.members({scope:'local',kinds:['actor','agent']})).filter(m=>!['completed','failed','stopped','timed_out'].includes(m.status))});`;
 const h=await host('command',{sourceCopy:true,program,providerSource:await pr8Provider(),overrides:{objective:{description:'PR8 recovery',unit:'points'},limits:{attempts:1,evaluatorCalls:20,activeMs:600000}},prepare:async root=>{
  const path=join(root,'app/src',f.file),source=await readFile(path,'utf8');assert.equal(source.split(f.anchor).length,2,f.name);
  const fault=`if(!pr8Fired&&(${f.condition})){pr8Fired=true;throw new Error('PR8 ${f.name} interruption');}`;
  const replacement=f.inside?'try{'+fault+f.anchor.slice(4):f.after?f.anchor+fault:fault+f.anchor;
  await writeFile(path,'let pr8Fired=false;\n'+source.replace(f.anchor,replacement));
 }});t.after(()=>h.store.close());assert.equal(h.value.resumeError,undefined,h.root);assert.equal(h.value.p.run.state,'paused',h.root);assert.equal(h.value.p.run.active,0);assert.ok(h.value.sameSpec);assert.equal(h.value.p.run.attemptsUsed,1);assert.deepEqual(h.value.live,[]);
 const workers=h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.spawn');assert.equal(workers.length,f.name==='reservation'?0:1);assert.equal(h.value.before.run.material.capture.baseline,h.value.p.run.material.capture.baseline);assert.equal(h.value.before.run.epoch,h.value.p.run.epoch);
 if(f.name==='ref')assert.notEqual(h.value.before.run.generation,h.value.p.run.generation);
 if(['freeze','evaluation','ref'].includes(f.name)){assert.equal(h.value.p.decisions.find((d:any)=>d.decisionId==='pr8-keep')?.status,'measured-keep');assert.equal(h.value.p.evaluations.length,2);assert.equal(h.value.p.attempts[0].nativeId,h.value.before.attempts[0].nativeId);}
 await mkdir('.runtime/pr8-gates',{recursive:true});await writeFile(`.runtime/pr8-gates/recovered-${f.name}.json`,JSON.stringify({root:h.root,value:h.value,workers:workers.length},null,2));
});
