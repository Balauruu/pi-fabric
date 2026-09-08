import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {host} from '../fixtures/pr6-host.js';
import {researchModel} from '../fixtures/pr6-model.js';
import {evaluationCalls} from '../../src/evaluators/contracts.js';
import {commandProgram,researchCommand} from '../../src/research/commands.js';

export async function validationFixture(root:string,loser:boolean,extra:Record<string,unknown>={}){
 const d=JSON.parse(await readFile(join(root,'definition.json'),'utf8'));
 const heldOut={...d,tasks:[{id:'held-task',prompt:'HELD_OUT_DETAIL_SENTINEL TASK_2',expected:loser?'BAD':'GOOD'}]};
 const protocol={version:1,policy:'selected',maxUses:2,criterion:'non-regression',heldOut,final:null,...extra};
 await writeFile(join(root,'validation.json'),JSON.stringify(protocol));
 const path=join(root,'source/arbor.config.json'),config=JSON.parse(await readFile(path,'utf8'));config.evaluator.heldOut=join(root,'validation.json');await writeFile(path,JSON.stringify(config));
}
test('PR9 native selected long held-out duration exceeds host agent default without global short timeout',{timeout:240000},async t=>{
 const h=await host('agent-suite',{inference:trace=>researchModel(trace,{heldDelayMs:31000}),overrides:{limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:async root=>{await validationFixture(root,false);const path=join(root,'validation.json'),v=JSON.parse(await readFile(path,'utf8'));v.heldOut.deadlineMs=180000;await writeFile(path,JSON.stringify(v));}});t.after(()=>h.store.close());
 assert.equal(h.value.error,undefined,h.root);assert.equal(h.value.p.validation.label,'held-out-validated');const e=h.store.evaluations('research').find(e=>e.split==='held-out'&&e.attemptId)!;assert.equal(e.definition.deadlineMs,180000);assert.ok(e.invocations.some(i=>(i.native?.elapsedMs??0)>=30000));assert.ok(e.invocations.every(i=>!i.native?.deadline&&i.valid));await evidence('long-deadline',h);
});
test('PR9 native short held-out deadline uses exact public owned stop and vetoes metric evidence',{timeout:240000},async t=>{
 const h=await host('agent-suite',{overrides:{limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:async root=>{await validationFixture(root,false);const path=join(root,'validation.json'),v=JSON.parse(await readFile(path,'utf8'));v.heldOut.deadlineMs=10;await writeFile(path,JSON.stringify(v));}});t.after(()=>h.store.close());
 assert.equal(h.value.error,undefined,h.root);assert.equal(h.value.p.validation.label,'development-only');assert.deepEqual(h.value.live,[]);const held=h.store.evaluations('research').filter(e=>e.split==='held-out');assert.ok(held.length>0&&held.every(e=>e.validity==='invalid'));assert.ok(held.every(e=>e.invocations.every(i=>i.native?.deadline&&!i.valid&&i.score===null)));assert.ok(h.events.some(e=>e.event==='native.result'&&e.data.ref==='agents.stop'));await evidence('short-deadline',h);
});
test('PR9 native held-out judges and retries are separately charged; invalid native grade cannot be overridden by retry', {timeout:240000},async t=>{
 const h=await host('agent-suite',{inference:trace=>researchModel(trace,{judgeMalformedAt:4}),overrides:{limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:async root=>{await validationFixture(root,false);const path=join(root,'validation.json'),v=JSON.parse(await readFile(path,'utf8'));v.heldOut.judge={model:'arbor-pr2-fake/subject',instructions:'Independently verify expected answer. Return PASS or FAIL.'};v.heldOut.retries=1;await writeFile(path,JSON.stringify(v));}});t.after(()=>h.store.close());
 assert.equal(h.value.error,undefined,h.root);assert.equal(h.value.p.validation.label,'development-only');const e=h.store.evaluations('research').find(e=>e.split==='held-out'&&e.attemptId)!;assert.equal(e.validity,'invalid');assert.equal(e.invocations.length,6);assert.equal(e.invocations.filter(i=>i.role==='judge').length,3);assert.equal(e.invocations.filter(i=>i.purpose==='retry').length,1);assert.ok(e.invocations.every(i=>i.native&&i.nativeId&&i.state==='ingested'));assert.equal(h.value.p.evaluations.reduce((n:number,e:any)=>n+e.invocationCount,0),22);await evidence('judges-retry',h);
});
const start=commandProgram(researchCommand('start',JSON.stringify({runId:'research'})));
const resume=commandProgram(researchCommand('resume','research'));
const get="const get=()=>tools.call({ref:'arbor.inspect',args:{runId:'research'}});";
test('PR9 clean-installed stale held-out snapshot blocks public final selection before untouched use',{timeout:240000},async t=>{
 const validate=commandProgram(researchCommand('validate','research h1'));
 const tamper="const fs=require('fs');const dir='../state/runs/research/evaluations';const e=fs.readdirSync(dir).filter(p=>p.endsWith('.json')).map(p=>JSON.parse(fs.readFileSync(dir+'/'+p,'utf8'))).find(e=>e.split==='held-out'&&e.attemptId);fs.writeFileSync(e.snapshots.candidate.directory+'/'+e.definition.subject.promptFiles[0],'TAMPERED_HELD_SNAPSHOT');";
 const program=get+`const act=async(name,payload)=>{const p=await get();return tools.call({ref:'arbor.'+name,args:{runId:'research',materialId:p.run.spec.source.materialId,epoch:p.run.epoch,revision:p.run.revision,commandId:name+'-'+p.run.revision,payload}})};await(async()=>{${start}})();await act('propose',{nodeId:'h1',type:'hypothesis',parentId:null,title:'Improve once',rationale:'PR6_LEVEL=1',sourceRefs:[]});await act('dispatch',{nodeId:'h1',attemptId:'h1'});await act('evaluate',{attemptId:'h1',evaluationId:'eval-h1'});const before=await get();await pi.bash({command:${JSON.stringify('node -e '+"'"+tamper.replaceAll("'","'\\''")+"'")}});let error;try{await(async()=>{${validate}})()}catch(e){error=String(e)}return JSON.stringify({error,before:compactProjection(before),p:compactProjection(await get())});`;
 const h=await host('agent-suite',{installed:true,program,overrides:{execution:'material',limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:async root=>{await validationFixture(root,false);const path=join(root,'validation.json'),v=JSON.parse(await readFile(path,'utf8'));v.final={...v.heldOut,tasks:[{id:'final-task',prompt:'FINAL_DETAIL_SENTINEL TASK_2',expected:'GOOD'}]};await writeFile(path,JSON.stringify(v));}});t.after(()=>h.store.close());
 assert.match(h.value.error,/changed|mismatch|modified/i,h.root);assert.equal(h.value.p.validation.finalUses,0);assert.equal(h.value.before.evaluations.length,h.value.p.evaluations.length);assert.ok(h.store.evaluations('research').every(e=>e.split!=='final'));await evidence('stale-final-admission',h);
});
test('PR9 real owning-Pi review approves choice but held-out loser cannot keep or apply',{timeout:240000},async t=>{
 const review=commandProgram(researchCommand('review','research choice'));
 const program=get+`const bind=(p,id)=>({runId:'research',materialId:p.run.spec.source.materialId,epoch:p.run.epoch,revision:p.run.revision,commandId:id});const act=async(name,payload,id)=>tools.call({ref:'arbor.'+name,args:{...bind(await get(),id),payload}});await(async()=>{${start}})();await act('propose',{nodeId:'h1',type:'hypothesis',parentId:null,title:'Improve once',rationale:'PR6_LEVEL=1',sourceRefs:[]},'node');await act('dispatch',{nodeId:'h1',attemptId:'h1'},'dispatch');await act('evaluate',{attemptId:'h1',evaluationId:'eval-h1'},'evaluate');await act('decide',{nodeId:'h1',decisionId:'choice',decision:'request_review',evidenceIds:['eval-h1']},'choice-request');const reviewed=await(async()=>{${review}})();const kept=await act('decide',{nodeId:'h1',decisionId:'keep',decision:'keep',evidenceIds:['eval-h1']},'keep-command');let applyError;try{await tools.call({ref:'arbor.apply',args:{...bind(await get(),'apply'),decisionId:'choice'}})}catch(e){applyError=String(e)}return JSON.stringify({reviewed,kept,applyError,p:compactProjection(await get())});`;
 const h=await host('agent-suite',{program,rpcResponses:['Approve research choice'],overrides:{execution:'material',search:{mode:'review'},limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:root=>validationFixture(root,true)});t.after(()=>h.store.close());assert.equal(h.value.reviewed.status,'applied');assert.equal(h.value.kept.status,'blocked');assert.match(h.value.kept.reason,/held-out/);assert.match(h.value.applyError,/measured-keep/);assert.equal(h.value.p.validation.label,'development-only');const dialogs=JSON.parse(await readFile(join(h.root,'rpc-ui.json'),'utf8'));assert.equal(dialogs.length,1);assert.equal(dialogs[0].response,'Approve research choice');await evidence('review-veto',h);
});

async function evidence(name:string,h:Awaited<ReturnType<typeof host>>){await mkdir('.runtime/pr9-gates',{recursive:true});await appendFile('.runtime/pr9-gates/native-cases.jsonl',JSON.stringify({name,root:h.root,validation:h.value.p?.validation,records:h.store.evaluations('research').map(e=>({id:e.id,split:e.split,state:e.state,calls:evaluationCalls(e)}))})+'\n');}
for(const loser of [false,true])test(`PR9 native final-only explicit public command ${loser?'veto':'keep'} uses untouched exact pair once`,{timeout:240000},async t=>{
 const validate=commandProgram(researchCommand('validate','research h1')),again=commandProgram(researchCommand('validate','research h1')),keep=commandProgram(researchCommand('keep','research h1'));
 const program=get+`await(async()=>{${start}})();const before=await get();const validated=await(async()=>{${validate}})();const repeated=await(async()=>{${again}})();const kept=await(async()=>{${keep}})();return JSON.stringify({before:compactProjection(before),validated,repeated,kept,p:compactProjection(await get())});`;
 const h=await host('agent-suite',{installed:!loser,program,overrides:{limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:root=>validationFixture(root,loser,{policy:'final',maxUses:1})});t.after(()=>h.store.close());
 assert.equal(h.value.before.evaluations.length,2);assert.equal(h.value.before.validation.finalUses,0);assert.equal(h.value.validated.status,'applied');assert.equal(h.value.repeated.status,'applied');
 assert.equal(h.value.kept.status,loser?'blocked':'applied');assert.equal(h.value.p.validation.label,loser?'development-only':'final-validated');assert.equal(h.value.p.validation.finalUses,1);assert.equal(h.store.evaluations('research').length,3);
 const final=h.store.evaluations('research').find(e=>e.split==='final')!;assert.equal(final.invocations.length,2);assert.ok(final.invocations.every(i=>i.native&&i.state==='ingested'));await evidence('final-'+loser,h);
});
for(const failed of [false,true])test(`PR9 native command held-out ${failed?'required-check veto':'validated keep'} accounts checks`,{timeout:240000},async t=>{
 const h=await host('command',{overrides:{limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:async root=>{
  await validationFixture(root,false);const path=join(root,'validation.json'),v=JSON.parse(await readFile(path,'utf8'));
  if(failed)v.heldOut.command.checks=[[process.execPath,'-e',"if(require('./program.cjs').level>0)process.exit(3)"]];await writeFile(path,JSON.stringify(v));
 }});t.after(()=>h.store.close());assert.equal(h.value.error,undefined,h.root);assert.equal(h.value.p.validation.label,failed?'development-only':'held-out-validated');
 const records=h.store.evaluations('research');assert.equal(records.length,4);assert.ok(records.every(e=>e.invocations.every(i=>i.commandChecks?.length===1&&i.commandChecks[0]!.nativeId===i.native!.checkResults![0]!.id)));
 assert.equal(h.value.p.evaluations.reduce((n:number,e:any)=>n+e.invocationCount,0),16);if(failed)assert.equal(records.at(-1)!.validity,'invalid');await evidence('command-'+failed,h);
});
for(const unknown of [false,true])test(`PR9 native held-out ${unknown?'unknown handle blocks':'completion before ingestion recovers'} after same-owner reload without duplicate launch`,{timeout:240000},async t=>{
 const program=get+`let error;try{await(async()=>{${start}})()}catch(e){error=String(e)}const before=await get();await components.reload({id:'arbor'});let resumeError;try{await(async()=>{${resume}})()}catch(e){resumeError=String(e)}return JSON.stringify({error,resumeError,before:compactProjection(before),p:compactProjection(await get()),live:(await agents.members({scope:'local',kinds:['actor','agent']})).filter(m=>!['completed','failed','stopped','timed_out'].includes(m.status))});`;
 const h=await host('agent-suite',{sourceCopy:true,program,overrides:{limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:async root=>{
  await validationFixture(root,false);const path=join(root,'app/src',unknown?'managed/OwnerExecution.ts':'evaluators/EvaluationEngine.ts'),source=await readFile(path,'utf8');
  const anchor=unknown?'invocation.nativeId = id; invocation.state = "attached"; this.research!.saveEvaluation(record);':'    // Aborted ingestion returns INTERRUPTED.';
  assert.equal(source.split(anchor).length,2);const condition=unknown?"record.split==='held-out'&&record.attemptId":"e.split==='held-out'&&e.attemptId";
  await writeFile(path,'let pr9Fault=false;\n'+source.replace(anchor,`if(!pr9Fault&&(${condition})){pr9Fault=true;throw new Error('PR9 completion gap');}\n`+anchor));
 }});t.after(()=>h.store.close());assert.equal(h.value.before.run.state,'interrupted',h.root);assert.equal(h.value.p.run.active,0);assert.deepEqual(h.value.live,[]);assert.deepEqual(h.value.before.run.spec,h.value.p.run.spec);assert.equal(h.value.before.run.epoch,h.value.p.run.epoch);
 const before=h.value.before.evaluations.find((e:any)=>e.split==='held-out'&&e.attemptId),after=h.store.evaluation('research',before.id)!;
 if(unknown){assert.match(h.value.resumeError,/Unknown native handle|unknown/i);assert.equal(after.state,'INTERRUPTED');assert.equal(after.invocations[0]!.nativeId,null);assert.equal(h.value.p.validation.label,'development-only');}
 else{assert.equal(h.value.resumeError,undefined,h.root);assert.equal(after.state,'completed');assert.equal(h.value.p.validation.label,'held-out-validated');assert.equal(after.invocations.length,2);assert.equal(after.bindings.length,2);}
 const subjects=h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.spawn'&&e.data.result.model?.endsWith('/subject'));assert.equal(subjects.length,unknown?15:16);await evidence('recovery-'+unknown,h);
});
for(const loser of [false,true])test(`PR9 actual ${loser?'source dev-winner held-out-loser VETO':'clean installed held-out validated'} autonomous journey`,{timeout:240000},async t=>{
 const h=await host('agent-suite',{installed:!loser,overrides:{limits:{attempts:1,evaluatorCalls:100,activeMs:600000}},prepare:root=>validationFixture(root,loser)});t.after(()=>h.store.close());
 assert.equal(h.value.error,undefined,h.root);const p=h.value.p;assert.equal(p.attempts.length,1,h.root);assert.equal(p.run.active,0);assert.deepEqual(h.value.live,[]);
 const records=h.store.evaluations('research');assert.equal(records.length,4);assert.equal(records.filter(e=>(e as any).split==='held-out').length,2);
 assert.equal(p.decisions.filter((d:any)=>d.status==='measured-keep').length,loser?0:1,h.root);assert.equal(p.validation.label,loser?'development-only':'held-out-validated');assert.equal(p.validation.heldOutUses,1);
 assert.ok(records.every(e=>e.invocations.every(i=>i.nativeId&&i.native&&i.state==='ingested')));assert.equal(new Set(records.flatMap(e=>e.invocations.map(i=>i.id))).size,records.flatMap(e=>e.invocations).length);
 await mkdir('.runtime/pr9-gates',{recursive:true});await appendFile('.runtime/pr9-gates/native-evidence.jsonl',JSON.stringify({root:h.root,loser,installed:!loser,records:records.map(e=>({id:e.id,split:(e as any).split,invocations:e.invocations.length})),validation:p.validation})+'\n');
});
