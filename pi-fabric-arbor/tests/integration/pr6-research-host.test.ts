import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir,mkdtemp,writeFile,readFile,appendFile,realpath } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { researchModel } from '../fixtures/pr6-model.js';
import { commandProgram,researchCommand } from '../../src/research/commands.js';
import { ResearchStore } from '../../src/research/ResearchStore.js';
import { BindingStore } from '../../src/managed/BindingStore.js';
const exec=promisify(execFile),APP=process.cwd(),subject='skills/fabric-arbor/roles/executor.md';
// Shared real-host harness, not an operation-sequencing fixture driver.
import { host } from '../fixtures/pr6-host.js';
for(const response of ['Approve research choice','Reject research choice'] as const)test(`PR6 reviewer native research pause then RPC ${response}`,{timeout:180000},async t=>{
 const begin=commandProgram(researchCommand('start',JSON.stringify({runId:'research'})));
 const program=`const p=await(async()=>{${begin}})();const r=p.run;const args={runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:'user-review',decisionId:'native-review'};let receipt,error,stale,forged;try{receipt=await tools.call({ref:'arbor.review',args})}catch(e){error=String(e)}try{await tools.call({ref:'arbor.review',args:{...args,commandId:'stale',revision:args.revision-1}})}catch(e){stale=String(e)}try{await tools.call({ref:'arbor.review',args:{...args,commandId:'forged',approved:true}})}catch(e){forged=String(e)}return JSON.stringify({settled:{state:p.run.state,revision:p.run.revision,decision:p.decisions.at(-1)},receipt,error,stale,forged,p:compactProjection(await tools.call({ref:'arbor.inspect',args:{runId:'research'}}))});`;
 const h=await host('command',{rpc:response,program,overrides:{objective:{description:'PR6_REQUEST_REVIEW',unit:'points'}}});t.after(()=>h.store.close());
 assert.equal(h.value.error,undefined,h.root);assert.equal(h.value.settled.state,'awaiting_review');assert.equal(h.value.receipt.status,'applied');assert.equal(h.value.p.decisions.at(-1).userReceipt.response,response);assert.match(h.value.stale,/Stale/);assert.ok(h.value.forged);
 assert.ok(h.events.some(e=>e.event==='research.proposal'&&e.data.payload.decision==='request_review'));assert.equal(h.value.p.run.active,0);
});
test('PR6 reviewer native local output admits no second command or actor',{timeout:180000},async t=>{
 const h=await host('command',{output:"console.log('x'.repeat(60000));",overrides:{limits:{artifactBytes:100000}}});t.after(()=>h.store.close());
 const e=h.store.evaluations('research')[0]!;assert.equal(e.invocations.length,1,h.root);assert.ok(e.invocations[0]!.native!.text.length>60000);assert.equal(h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.create').length,0);assert.equal(h.value.p.attempts.length,0);
});
test('PR6 reviewer native exhausted active budget after baseline admits no actor',{timeout:180000},async t=>{
 const h=await host('command',{output:'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,600);',overrides:{limits:{activeMs:1000}}});t.after(()=>h.store.close());
 assert.equal(h.value.p.run.execution,'research-stop:active-time-budget',h.root);assert.equal(h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.create').length,0);assert.equal(h.value.p.attempts.length,0);
});
test('PR6 reviewer native failed attempt reload resume discards original evidence and continues without duplicate',{timeout:240000},async t=>{
 const begin=commandProgram(researchCommand('start',JSON.stringify({runId:'research'}))),resume=commandProgram(researchCommand('resume','research'));
 const program=`const before=await(async()=>{${begin}})();const evidence=before.artifact_refs;await components.reload({id:'arbor'});let p;for(let n=0;n<3;n++)p=await(async()=>{${resume}})();return JSON.stringify({before:{attempt:before.attempts[0],evidence},p:compactProjection(p),evidenceUnchanged:JSON.stringify(p.artifact_refs.slice(0,evidence.length))===JSON.stringify(evidence)});`;
 const h=await host('command',{program,overrides:{objective:{description:'PR6_FAIL_WORKERS',unit:'points'},search:{maxChildren:4,maxActorTurns:3,stopAfterFailures:4},limits:{attempts:2}}});t.after(()=>h.store.close());
 const {before,p}=h.value;assert.equal(before.attempt.state,'failed',h.root);assert.deepEqual(p.attempts[0],before.attempt);assert.equal(h.value.evidenceUnchanged,true);assert.notEqual(p.run.generation,before.attempt.generation);
 assert.equal(p.run.execution,'research-stop:attempt-budget',h.root);assert.equal(p.attempts.length,2);assert.equal(p.lessons.length,2);assert.equal(p.decisions.filter((d:any)=>d.decision==='discard').length,2);assert.equal(h.events.filter(e=>e.event==='research.worker'&&!e.data.didTool).length,2);
});
for(const kind of ['command','agent-suite'] as const)test(`PR6 autonomous ${kind} baseline gain valid-no-gain failed-check further-gain`,{timeout:420000},async t=>{
 const h=await host(kind,{installed:kind==='agent-suite'});t.after(()=>h.store.close());const p=h.value.p;assert.equal(h.value.error,undefined,h.root);assert.equal(p.run.execution,'research-stop:attempt-budget',h.root+': '+p.run.error);assert.deepEqual(h.value.live,[]);assert.equal(p.attempts.length,4);assert.equal(p.evaluations.length,5);assert.equal(p.lessons.length,4);assert.equal(p.run.active,0);
 const records=h.store.evaluations('research');assert.deepEqual(records.map(e=>e.validity),['valid','valid','valid','invalid','valid']);assert.equal(records[0]!.snapshots.candidate.oid,p.run.material.capture.baseline);
 const outcomes=p.decisions.filter((d:any)=>['keep','discard'].includes(d.decision));assert.deepEqual(outcomes.map((d:any)=>d.status),['measured-keep','applied','applied','measured-keep']);assert.equal(p.run.material.incumbent,records[4]!.snapshots.candidate.oid);
 assert.equal(records[2]!.snapshots.baseline.oid,records[1]!.snapshots.candidate.oid);assert.equal(records[3]!.snapshots.baseline.oid,records[1]!.snapshots.candidate.oid);assert.equal(records[4]!.snapshots.baseline.oid,records[1]!.snapshots.candidate.oid);
 assert.ok(records.every(e=>e.invocations.every(i=>i.nativeId&&i.native&&i.state==='ingested')));assert.equal(new Set(records.flatMap(e=>e.invocations.map(i=>i.id))).size,kind==='command'?10:30);
 assert.equal(h.events.filter(e=>e.event==='main.inference').length,2);const creates=h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.create');assert.equal(creates.length,1);assert.ok(h.events.filter(e=>e.event==='actor.restrictions').every(e=>!e.data.includes('UNEXPECTED_SUCCESS')));
 const workers=h.events.filter(e=>e.event==='research.worker');assert.equal(workers.filter(e=>!e.data.didTool).length,4);assert.ok(workers.every(e=>e.data.bootstrap&&e.data.sentinel&&e.data.tools.includes('bash')&&!e.data.tools.includes('fabric_exec')));
 const subjects=h.events.filter(e=>e.event==='research.subject');if(kind==='agent-suite'){assert.equal(subjects.length,30);assert.ok(subjects.every(e=>!e.data.bootstrap&&!e.data.sentinel&&e.data.tools.length===0));assert.equal(records[3]!.quality.passed,false);}
 const bs=new BindingStore(join(h.root,'state/execution-bindings.sqlite3'));for(const a of p.attempts){const b=bs.get(`material-research-${a.id}`)!;assert.equal(b.roleInvocations![0]!.resultContract,'arbor.worker-result.v1');assert.equal(b.roleInvocations![0]!.nativeId,a.nativeId);}bs.close();
 await writeFile(join(h.root,'journey-summary.json'),JSON.stringify({kind,stop:p.run.execution,attempts:4,evaluations:5,invocations:records.flatMap(e=>e.invocations).length,incumbent:p.run.material.incumbent,decisions:outcomes,lessons:p.lessons},null,2));
});
for(const explicit of [false,true])test(`PR6 installed ${explicit?'explicit role revision':'frozen role'} and real reload resume preserve measurement and prior attribution`,{timeout:420000},async t=>{
 const begin=commandProgram(researchCommand('start',JSON.stringify({runId:'research'}))),resume=commandProgram(researchCommand('resume','research'));
 const program=`const get=()=>tools.call({ref:'arbor.inspect',args:{runId:'research'}});const before=await(async()=>{${begin}})();const original=before.run.spec;await pi.bash({command:'printf "\\nPR6_EXPLICIT_REVISION\\n" >> '+installedPackageRoot+'/skills/fabric-arbor/roles/executor.md'});const r=(await get()).run;const revised=${explicit ? "await tools.call({ref:'arbor.reviseRoles',args:{runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:'revise-roles'}})" : "{status:'not-requested'}"};await components.reload({id:'arbor'});const p=await(async()=>{${resume}})();return JSON.stringify({before:{attempts:before.attempts.map(a=>a.id)},revised,originalId:original.identity,specUnchanged:JSON.stringify(p.run.spec)===JSON.stringify(original),p:compactProjection(p)});`;
 const h=await host('agent-suite',{installed:true,overrides:{search:{maxChildren:4,maxActorTurns:11}},program});t.after(()=>h.store.close());const {before,p}=h.value;
 assert.equal(before.attempts.length,2,h.root);assert.equal(h.value.revised.status,explicit?'applied':'not-requested');assert.equal(h.value.specUnchanged,true);assert.equal(p.attempts.length,4,h.root+': '+p.run.error);assert.equal(p.run.execution,'research-stop:attempt-budget');assert.equal(p.run.roleRevisions?.length??0,explicit?1:0);
 const bs=new BindingStore(join(h.root,'state/execution-bindings.sqlite3'));const old=bs.get('material-research-h1')!,next=bs.get('material-research-h3')!;bs.close();assert.equal(old.roleInvocations![0]!.bundleId,p.run.spec.roleBundle.id);assert.equal(next.roleInvocations![0]!.bundleId,explicit?p.run.roleRevisions[0].bundle.id:p.run.spec.roleBundle.id);assert.equal(next.roleInvocations![0]!.roleBindingId===old.roleInvocations![0]!.roleBindingId,!explicit);
 assert.ok(p.evaluations.every((e:any)=>e.specId===h.value.originalId));assert.ok(h.events.filter(e=>e.event==='research.worker').every(e=>e.data.revision===(explicit&&['h3','h4'].includes(e.data.attempt))));assert.equal(h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.create').length,2);assert.equal(h.events.filter(e=>e.event==='main.inference').length,2);
});
for(const [name,overrides,attempts,evaluations] of [
 ['no-gain',{search:{maxChildren:4,maxActorTurns:64,stopAfterNoGain:1}},2,3],
 ['target',{search:{maxChildren:4,maxActorTurns:64,target:'2'}},1,2],
 // PR9 charges the two required baseline checks as well as the two measurements.
 ['evaluator-budget',{limits:{attempts:4,evaluatorCalls:4,activeMs:600000}},0,1],
 ['artifact-budget',{limits:{attempts:4,evaluatorCalls:100,activeMs:600000,artifactBytes:16384}},0,0],
 ['active-time-budget',{limits:{attempts:4,evaluatorCalls:100,activeMs:1000}},0,1],
 ['repeated-infrastructure-failure',{objective:{description:'PR6_FAIL_WORKERS',unit:'points'},search:{maxChildren:4,maxActorTurns:64,stopAfterFailures:2}},2,1],
] as const)test(`PR6 actual owner stops at ${name}`,{timeout:180000},async t=>{const h=await host('command',{overrides});t.after(()=>h.store.close());assert.equal(h.value.p.run.execution,'research-stop:'+name,h.root);assert.equal(h.value.p.attempts.length,attempts);assert.equal(h.value.p.evaluations.length,evaluations);assert.deepEqual(h.value.live,[]);});
test('PR6 missing saved phase refuses research before baseline or actor',{timeout:90000},async t=>{
 const program=`const p=await tools.call({ref:'arbor.start',args:{runId:'research'}});const r=p.run;await pi.bash({command:'rm -- '+r.spec.roleBundle.directory+'/references/evidence-interpretation.md'});let error;try{await tools.call({ref:'arbor.runResearch',args:{runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:'missing-phase'}})}catch(e){error=String(e)}return JSON.stringify({error,p:await tools.call({ref:'arbor.inspect',args:{runId:'research'}})});`;
 const h=await host('command',{program});t.after(()=>h.store.close());assert.match(h.value.error,/Operational role unavailable/);assert.equal(h.value.p.evaluations.length,0);assert.equal(h.value.p.attempts.length,0);
});
for(const kind of ['command','agent-suite'] as const)for(const deny of ['deny','ask'] as const)test(`PR6 ${kind} ${deny} execute policy blocks real autonomous effects`,{timeout:90000},async t=>{const h=await host(kind,{deny});t.after(()=>h.store.close());assert.match(h.value.error,/denied|approval|requires|permission/i,h.root);assert.equal(h.value.p.evaluations.length,0);assert.equal(h.value.p.attempts.length,0);assert.deepEqual(h.value.live,[]);});
test('PR6 invalid actual command baseline blocks actor and all candidate workers',{timeout:90000},async t=>{const h=await host('command',{invalid:true});t.after(()=>h.store.close());assert.equal(h.value.p.run.execution,'research-stop:invalid-baseline');assert.equal(h.value.p.evaluations[0].validity,'invalid');assert.equal(h.value.p.attempts.length,0);assert.equal(h.events.filter(e=>e.event==='native.result'&&e.data.ref==='agents.create').length,0);});
