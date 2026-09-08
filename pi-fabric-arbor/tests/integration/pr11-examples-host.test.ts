import assert from 'node:assert/strict';
import {appendFile,mkdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';
import {host} from '../fixtures/pr6-host.js';
import {exampleModel} from '../fixtures/pr11-model.js';
import {commandProgram,researchCommand} from '../../src/research/commands.js';
const start=commandProgram(researchCommand('start','{"runId":"research"}')).replace('{"runId":"research"}','prepared.start');
const setup=(pack:string,heldOut=false)=>`const cwd=(await pi.bash({command:'pwd'})).output.trim();const args={pack:${JSON.stringify(pack)},destination:cwd.slice(0,cwd.lastIndexOf('/'))+'/pack',environment:{node:${JSON.stringify(process.execPath)},coordinatorModel:'arbor-pr2-fake/deterministic',executorModel:'arbor-pr2-fake/deterministic',subjectModel:'arbor-pr2-fake/subject'},heldOut:${heldOut}};`;
for(const installed of [false,true])for(const pack of ['code','agent','recipe'] as const)test(`PR11 ${installed?'installed':'source'} ${pack} owner scaffold actual baseline candidate measured keep`,{timeout:240000},async t=>{
 const program=setup(pack,pack==='agent')+`const prepared=await tools.call({ref:'arbor.scaffold',args});let conflict;try{await tools.call({ref:'arbor.scaffold',args})}catch(e){conflict=String(e)}prepared.start.runId='research';prepared.start.overrides.limits={attempts:${pack==='code'?2:1}};const p=await(async()=>{${start}})();return JSON.stringify({prepared:{status:prepared.status,destination:prepared.destination,preparationId:prepared.preparationId},conflict,p:compactProjection(p),live:(await agents.members({scope:'local',kinds:['actor','agent']})).filter(m=>!['completed','failed','stopped','timed_out'].includes(m.status))});`;
 const h=await host(pack==='agent'?'agent-suite':'command',{installed,program,inference:exampleModel,prepare:async root=>{await writeFile(join(root,'source/arbor.config.json'),'{}');}});t.after(()=>h.store.close());
 const p=h.value.p,records=h.store.evaluations('research');assert.equal(h.value.prepared.status,'unvalidated');assert.match(h.value.conflict,/exist|conflict/i);assert.deepEqual(h.value.live,[]);assert.equal(p.run.execution,'research-stop:attempt-budget',h.root+': '+p.run.error);
 assert.equal(p.attempts.length,pack==='code'?2:1,h.root);assert.ok(p.decisions.some((d:any)=>d.status==='measured-keep'),h.root);assert.ok(records.every(e=>e.validity==='valid'&&e.invocations.every(i=>i.nativeId&&i.native&&i.state==='ingested')));
 const development=records.filter(e=>(e.split??'development')==='development');assert.equal(development.length,pack==='code'?3:2);if(pack==='code'){assert.equal(development[2]!.analysis!.wins,0);assert.equal(development[2]!.analysis!.ties,1);assert.equal(p.decisions.filter((d:any)=>d.status==='measured-keep').length,1);assert.equal(p.run.spec.config.objective.minimumGain,'0.01');}assert.ok(development[1]!.analysis!.wins>0);assert.equal(development[0]!.snapshots.candidate.oid,p.run.material.capture.baseline);assert.notEqual(p.run.material.incumbent,p.run.material.capture.baseline);
 assert.equal(p.run.spec.evaluation.repeats,pack==='code'?3:1);assert.equal(p.run.spec.origins['objective.minimumGain'],`preset:arbor-${pack}`);assert.equal(p.run.spec.roles.subject.origin,'frozen-evaluation-definition');assert.equal(p.run.spec.config.grounding.mode,'optional');
 assert.equal(p.run.spec.source.oid,null);await assert.rejects(lstat(join(h.value.prepared.destination,'material/.git')));assert.equal(p.run.spec.config.material.selectedUntracked.length,pack==='agent'?1:pack==='code'?2:3);
 const manifest=JSON.parse(await readFile('examples/manifest.json','utf8')).packs.find((x:any)=>x.id===pack);for(const file of manifest.files)assert.deepEqual(await readFile(join(h.value.prepared.destination,'material',file)),await readFile(join('examples',pack,file)));
 assert.ok(h.events.some(e=>e.event==='research.proposal'&&e.data.kind==='dispatch'));assert.ok(h.events.filter(e=>e.event==='pr11.worker').every(e=>e.data.bootstrap&&!e.data.tools.includes('fabric_exec')));
 if(pack==='agent'){assert.equal(p.validation.label,'held-out-validated');assert.ok(h.events.filter(e=>e.event==='pr11.subject').every(e=>!e.data.bootstrap&&e.data.tools.length===0));assert.ok(records.some(e=>e.split==='held-out'));}
 const evidence={installed,pack,root:h.root,preparation:h.value.prepared,baseline:development[0]!.snapshots.candidate.oid,incumbent:p.run.material.incumbent,analysis:development[1]!.analysis,measurementInvocations:records.flatMap(e=>e.invocations).length,accountedCalls:records.flatMap(e=>e.invocations).reduce((n,i)=>n+1+(i.commandChecks?.length??0),0)};await mkdir('.runtime/pr11-gates',{recursive:true});await appendFile('.runtime/pr11-gates/native-examples.jsonl',JSON.stringify(evidence)+'\n');
});
test('PR11 installed serialized definition overflow rejects before owner filesystem effects',{timeout:90000},async t=>{
 const program=setup('upstream-command')+`args.prepared={root:cwd,files:['program.cjs'],argv:Array.from({length:9},()=> 'x'.repeat(8000)),checks:[],unit:'ms',revision:'a'.repeat(40),sourceUrl:'https://example.invalid'};let error;try{await tools.call({ref:'arbor.scaffold',args})}catch(e){error=String(e)}return JSON.stringify({error});`;
 const h=await host('command',{installed:true,program});t.after(()=>h.store.close());assert.match(h.value.error,/Evaluation definition exceeds bound/,h.root);await assert.rejects(lstat(join(h.root,'pack')));
 await appendFile('.runtime/pr11-gates/native-overflow.jsonl',JSON.stringify({root:h.root,error:h.value.error})+'\n');
});
for(const policy of ['deny','ask'] as const)test(`PR11 native ${policy} write permission prevents preparation`,{timeout:90000},async t=>{
 const program=setup('code')+`let error;try{await tools.call({ref:'arbor.scaffold',args})}catch(e){error=String(e)}return JSON.stringify({error});`;
 const h=await host('command',{writePolicy:policy,program});t.after(()=>h.store.close());assert.match(h.value.error,/denied|approval|permission|requires/i);await assert.rejects(lstat(join(h.root,'pack')));
});
